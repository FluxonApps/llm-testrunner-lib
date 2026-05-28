# Releasing

How we cut a release of `llm-testrunner-components`. This document is the single source of truth — keep it short and accurate.

## TL;DR

Releases are local-driven:

1. Run `npm run release:patch` (or `:minor` / `:major`).
2. Script bumps the version, drafts the changelog with AI assistance, lets you review in `$EDITOR`, then commits and tags locally.
3. You push the branch and the tag, then publish to npm.

There is no auto-publish CI workflow. The `publish.yml` workflow remains as a manual `workflow_dispatch` fallback for hot-publish scenarios.

## Flow

```
npm run release:patch
  ├─ preflight (clean tree, on main, in sync with origin/main)
  ├─ lint + test + license-check
  ├─ npm version <bump> --no-git-tag-version
  ├─ assert vX.Y.Z tag doesn't already exist
  ├─ Claude CLI drafts CHANGELOG bullets (skipped if `claude` not installed)
  ├─ $EDITOR opens CHANGELOG.md for review
  ├─ git commit -m "chore(release): X.Y.Z"
  └─ git tag -a vX.Y.Z -m "vX.Y.Z"

# Then, manually:
git push origin main
git push origin vX.Y.Z
npm run build-publish
gh release create vX.Y.Z --notes "..."   # or use the GitHub UI
```

## Commands

| Command | Result |
|---------|--------|
| `npm run release:patch` | 1.4.0 → 1.4.1 |
| `npm run release:minor` | 1.4.0 → 1.5.0 |
| `npm run release:major` | 1.4.0 → 2.0.0 |
| `npm run release -- 2.0.0-rc.1` | explicit version (RC) |
| `npm run release -- minor --dry-run` | preview every command, change nothing |
| `npm run release -- patch --no-test` | skip lint+test+license-check |

> `npm run` swallows positional args unless you pass them after `--`. Use the convenience aliases (`:patch` / `:minor` / `:major`) when you can.

## What the script enforces

Steps run in order. Any failure aborts the release.

1. Working tree is clean.
2. Current branch is `main`.
3. Local `main` matches `origin/main`.
4. `lint`, `test`, `license-check` all pass (skippable via `--no-test`).
5. Bumps version via `npm version <arg> --no-git-tag-version`.
6. Asserts `vX.Y.Z` does not already exist locally or on origin.
7. Calls Claude CLI with `git log` + `git diff --stat` since the previous `v*` tag. Asks for 3–7 high-level bullets. Falls back to an empty `- ` stub if `claude` is not installed.
8. Prepends `## X.Y.Z` plus the bullets to `CHANGELOG.md` and opens `$EDITOR`.
9. After save, verifies the new section actually has content (not just an empty stub).
10. `git commit -m "chore(release): X.Y.Z"`.
11. `git tag -a vX.Y.Z -m "vX.Y.Z"`.
12. Prints the push, `npm run build-publish`, and `gh release create` commands so you can review before handing off.

**Rollback:** if any step between the version bump and the tag fails, the script restores `package.json`, `package-lock.json`, and `CHANGELOG.md` so the next retry starts clean.

**AI requirement:** none. If the `claude` CLI is on your PATH, the script uses it. If not, you get an empty stub to fill in by hand.

## Manual steps after the script

The script stops after the local tag. You drive the rest:

```bash
# 1. Push the branch and the tag
git push origin main <branch_name>
git push origin vX.Y.Z

# 2. Publish to npm (If you chose to do it locally)
npm run build-publish

# 3. Create the GitHub Release (mirrors the CHANGELOG section as the body)
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes "$(awk -v ver=\"X.Y.Z\" '
    $0 == \"## \" ver { found=1; next }
    found && /^## / { exit }
    found { print }
  ' CHANGELOG.md)"
```

The script prints all three command groups at the end, ready to copy-paste with the correct version filled in.

## Conventions

- **Tag format:** `vX.Y.Z` (matches the existing `v1.3.5-internal.0` style).
- **Release commit:** `chore(release): X.Y.Z` (Conventional Commits).
- **Branches:** releases cut only from `main`. Feature branches merge to `main` via PR first.
- **Pre-releases:** suffix with `-rc.N` (e.g. `2.0.0-rc.1`). Publish these under the `next` dist-tag manually: `npm publish --tag next --access=public` — the script does not branch on this yet.
- **Migration notes:** for majors, link to the version PR from the corresponding `## X.0.0` section of `CHANGELOG.md`.

## Why this design

| Concern | How we handle it |
|---------|-----------------|
| Single source of truth for what shipped | Tag commit contains the matching `CHANGELOG.md` entry. |
| Avoid "tag updates changelog" chicken-and-egg | Local script does the bump + changelog before tagging. |
| Branch protection on `main` | No CI ever pushes to `main`. |
| Cost / API key sprawl | AI runs locally using the developer's existing Claude CLI auth. Zero new GitHub secrets. |
| Human review of AI output | Script opens `$EDITOR` after AI drafts. You always see the changelog before it's committed. |
| Wrong version published | Local preflight + `npm version` keep `package.json` and the tag in lockstep. Verify visually before pushing. |

## Troubleshooting

**"Tag v2.0.0 already exists"** — most often happens when a previous `npm version` ran without `--no-git-tag-version`. Delete the stray tag (`git tag -d v2.0.0`, plus `git push --delete origin v2.0.0` if it was pushed) and retry.

**"Working tree is not clean"** — commit or stash everything first. The script will not touch a dirty tree.

**"On branch X, expected main"** — releases cut only from `main`. If you have release-prep work on a branch, merge it via PR first.

**"No changelog entries added under ## X.Y.Z"** — the editor was saved with only the empty `- ` stub. Add bullets and rerun.

**Local main is behind origin/main** — `git pull --ff-only` first, then retry.

**AI drafted weird bullets** — edit them in `$EDITOR` before saving. If `claude` itself is misbehaving, uninstall or unset `PATH` for that run; the script falls back to the empty stub.

## Future improvements (not blockers)

- A `--tag next` dist-tag flag for RCs so `npm publish` doesn't tag them as `latest`.
- A small CI workflow that mirrors the CHANGELOG section into the GitHub Release body automatically (read-only on the repo, no commit-back).
- A `release-please`-style PR-driven model if we move to multi-maintainer release ownership.
