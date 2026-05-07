#!/usr/bin/env -S npx tsx
/**
 * evaluate.ts — run evaluation strategies from the command line
 *
 * Single mode:
 *   npx tsx scripts/evaluate.ts --exact    --expected "hello world" --actual "hello world greeting"
 *   npx tsx scripts/evaluate.ts --rouge1   --expected "machine learning" --actual "deep learning and ML" --threshold 0.5
 *   npx tsx scripts/evaluate.ts --rougeL   --expected "natural language" --actual "NLP processing"
 *   npx tsx scripts/evaluate.ts --bleu     --expected "the cat sat" --actual "the cat sat on the mat"
 *   npx tsx scripts/evaluate.ts --semantic --expected "happy" --actual "joyful and content"
 *
 * Suite mode:
 *   npx tsx scripts/evaluate.ts --file path/to/evals.json
 */

import { readFileSync } from 'fs';
import { performEvaluation } from '../src/lib/evaluation/evaluators/exact/exact';
import { performRouge1Evaluation } from '../src/lib/evaluation/evaluators/rouge1-evaluator';
import { performRougeLEvaluation } from '../src/lib/evaluation/evaluators/rougeL-evaluator';
import { performBleuEvaluation } from '../src/lib/evaluation/evaluators/bleu/bleu-evaluator';
import { performSemanticEvaluation } from '../src/lib/evaluation/evaluators/semantic/index';
import { EvaluationApproach } from '../src/lib/evaluation/constants';
import {
  parseEvalSuite,
  runEvalSuite,
} from '../src/lib/evaluation/eval-suite-runner';
import type { EvaluationRequest } from '../src/lib/evaluation/types';

// ── single-mode config ──────────────────────────────────────────────────────

const APPROACHES: Record<string, EvaluationApproach> = {
  '--exact': EvaluationApproach.EXACT,
  '--rouge1': EvaluationApproach.ROUGE_1,
  '--rougeL': EvaluationApproach.ROUGE_L,
  '--bleu': EvaluationApproach.BLEU,
  '--semantic': EvaluationApproach.SEMANTIC,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EVALUATORS: Record<EvaluationApproach, (req: EvaluationRequest) => any> =
  {
    [EvaluationApproach.EXACT]: performEvaluation,
    [EvaluationApproach.ROUGE_1]: performRouge1Evaluation,
    [EvaluationApproach.ROUGE_L]: performRougeLEvaluation,
    [EvaluationApproach.BLEU]: performBleuEvaluation,
    [EvaluationApproach.SEMANTIC]: performSemanticEvaluation,
  };

// ── usage ───────────────────────────────────────────────────────────────────

function usage() {
  console.error(`Usage:
  npx tsx scripts/evaluate.ts <strategy> --expected <string> --actual <string> [--threshold <number>]
  npx tsx scripts/evaluate.ts --file <evals.json>

Strategies (pick one, single mode):
  --exact      Literal keyword matching
  --rouge1     ROUGE-1 unigram overlap (default threshold: 0.7)
  --rougeL     ROUGE-L longest common subsequence (default threshold: 0.7)
  --bleu       BLEU n-gram precision (default threshold: 0.7)
  --semantic   Transformer embedding cosine similarity (default threshold: 0.7)

Suite mode:
  --file       Path to an evals.json file (runs all evals in the suite)

Options:
  --expected   Expected outcome text (keywords separated by commas or newlines)
  --actual     Actual LLM response text
  --threshold  Pass/fail threshold, 0-1 (optional, overrides default)

Examples:
  npx tsx scripts/evaluate.ts --exact --expected "hello world" --actual "hello world greeting"
  npx tsx scripts/evaluate.ts --rouge1 --expected "ML" --actual "deep learning and ML" --threshold 0.5
  npx tsx scripts/evaluate.ts --file tests/evals.json`);
}

// ── arg parsing ─────────────────────────────────────────────────────────────

interface SingleArgs {
  mode: 'single';
  approach: EvaluationApproach;
  expected: string;
  actual: string;
  threshold?: number;
}

interface SuiteArgs {
  mode: 'suite';
  filePath: string;
}

type Args = SingleArgs | SuiteArgs;

function parseArgs(argv: string[]): Args {
  let expected: string | undefined;
  let actual: string | undefined;
  let threshold: number | undefined;
  let approach: EvaluationApproach | undefined;
  let filePath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    if (arg === '--file') {
      filePath = argv[++i];
      continue;
    }

    if (arg in APPROACHES) {
      if (approach) {
        console.error(
          `ERROR: only one strategy allowed (got both --${approach} and ${arg})`,
        );
        process.exit(1);
      }
      approach = APPROACHES[arg];
      continue;
    }

    if (arg === '--expected') {
      expected = argv[++i];
      continue;
    }
    if (arg === '--actual') {
      actual = argv[++i];
      continue;
    }
    if (arg === '--threshold') {
      threshold = parseFloat(argv[++i]);
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        console.error('ERROR: --threshold must be a number between 0 and 1');
        process.exit(1);
      }
      continue;
    }

    console.error(`ERROR: unknown argument: ${arg}`);
    usage();
    process.exit(1);
  }

  if (filePath) {
    return { mode: 'suite', filePath };
  }

  if (!approach) {
    console.error(
      'ERROR: a strategy or --file is required (--exact, --rouge1, --rougeL, --bleu, --semantic, --file)',
    );
    usage();
    process.exit(1);
  }
  if (!expected) {
    console.error('ERROR: --expected is required');
    process.exit(1);
  }
  if (!actual) {
    console.error('ERROR: --actual is required');
    process.exit(1);
  }

  return { mode: 'single', approach, expected, actual, threshold };
}

// ── suite runner ────────────────────────────────────────────────────────────

async function runSuiteMode(filePath: string) {
  const json = readFileSync(filePath, 'utf8');
  const suite = parseEvalSuite(json);
  const result = await runEvalSuite(suite);

  const suiteLabel = result.suite ? ` (${result.suite})` : '';
  console.log(`Eval suite${suiteLabel}: ${result.total} eval(s)\n`);

  for (const r of result.results) {
    const icon = r.passed ? '\u2713' : '\u2717';
    const label = r.passed ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${label}  eval ${r.id}`);
    for (const f of r.fields) {
      const fieldIcon = f.passed ? '+' : '-';
      console.log(
        `       ${fieldIcon} ${f.label}: ${f.approach} score=${f.score.toFixed(3)}`,
      );
      for (const kw of f.keywordScores) {
        const kwIcon = kw.passed ? '+' : '-';
        console.log(
          `         ${kwIcon} "${kw.keyword}" ${kw.score.toFixed(3)}`,
        );
      }
    }
  }

  const passPercent = (result.passRate * 100).toFixed(0);
  console.log(
    `\n${result.passed}/${result.total} passed (${passPercent}%)`,
  );
  process.exit(result.failed > 0 ? 1 : 0);
}

// ── single runner ───────────────────────────────────────────────────────────

async function runSingleMode(args: SingleArgs) {
  const request: EvaluationRequest = {
    testCaseId: 'cli',
    question: '',
    expectedOutcome: args.expected,
    actualResponse: args.actual,
    evaluationParameters: {
      approach: args.approach,
      ...(args.threshold !== undefined && { threshold: args.threshold }),
    },
  };

  if (args.approach === EvaluationApproach.SEMANTIC) {
    console.error('Loading semantic model (first run may download ~30MB)...');
  }

  const evaluate = EVALUATORS[args.approach];
  const result = await evaluate(request);

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.mode === 'suite') {
    await runSuiteMode(args.filePath);
  } else {
    await runSingleMode(args);
  }
}

main();
