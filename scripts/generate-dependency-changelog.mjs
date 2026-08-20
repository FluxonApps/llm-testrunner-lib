#!/usr/bin/env node
// Falls back to one templated bullet per commit if GEMINI_API_KEY is unset
// or the API call fails — a release must never block on an AI call succeeding.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function sh(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function getPrevTag() {
  try {
    return sh(['describe', '--tags', '--abbrev=0', '--match', 'v*']);
  } catch {
    return '';
  }
}

function fallbackBullets(commits) {
  const bullets = commits
    .split('\n')
    .filter((line) => /^Bump /i.test(line.trim()))
    .map((line) => `- ${line.trim().replace(/\s*\(#\d+\)$/, '')}`);
  return bullets.length > 0
    ? `### 🔧 Changed\n\n${bullets.join('\n')}\n`
    : '### 🔧 Changed\n\n- Routine dependency updates\n';
}

function extractBullets(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^(###|- )/.test(l.trim()));
  if (start === -1) return '';
  const kept = lines.slice(start).filter((l) => /^(###|-\s|\s*$)/.test(l) || l.trim() === '');
  const joined = kept.join('\n').trim();
  return /^- /m.test(joined) ? joined : '';
}

async function draftWithGemini({ version, packageName, prevTag, commits, diffstat }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const template = readFileSync(
    path.join(__dirname, 'release-pr-changelog-prompt.md'),
    'utf8',
  );
  const prompt = template
    .replaceAll('{{VERSION}}', version)
    .replaceAll('{{PACKAGE_NAME}}', packageName)
    .replaceAll('{{PREV_TAG}}', prevTag || 'HEAD')
    .replaceAll('{{COMMITS}}', commits)
    .replaceAll('{{DIFFSTAT}}', diffstat);

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const sdk = new GoogleGenAI({ apiKey });
    const response = await sdk.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return extractBullets(response.text);
  } catch (err) {
    process.stderr.write(`generate-dependency-changelog: Gemini call failed, falling back. ${err}\n`);
    return '';
  }
}

async function main() {
  const version = process.env.NEW_VERSION;
  if (!version) {
    process.stderr.write('generate-dependency-changelog: NEW_VERSION env var is required.\n');
    process.exit(1);
  }
  const packageName = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).name;
  const prevTag = getPrevTag();
  const commits = prevTag
    ? sh(['log', '--pretty=format:%s', `${prevTag}..HEAD`])
    : sh(['log', '--pretty=format:%s', '-n', '50']);
  const diffstat = prevTag ? sh(['diff', '--stat', `${prevTag}..HEAD`]) : '';

  if (!commits) {
    process.stdout.write('### 🔧 Changed\n\n- Routine dependency updates\n');
    return;
  }

  const aiBullets = await draftWithGemini({ version, packageName, prevTag, commits, diffstat });
  const output = aiBullets || fallbackBullets(commits);
  process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
}

main();
