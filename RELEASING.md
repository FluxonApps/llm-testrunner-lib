# Releasing

How we cut a release of `llm-testrunner-components`. This document is the single source of truth — keep it short and accurate.

## TL;DR

Releases are **PR-driven**:

1. `git checkout -b release-<your-version>` off `main`. Follow recommended convention for branch naming.
2. Run `npm run release:patch` (or `:minor` / `:major`).
3. Script bumps the version, drafts the changelog with AI assistance, lets you review in `$EDITOR`, then commits **on your release branch** (no tag yet).
4. Push the branch, open a PR to `main`, get it reviewed and merged.
5. After merge, tag the merge commit on `main` and publish to npm.

There is no auto-publish CI workflow. The `publish.yml` workflow remains as a manual `workflow_dispatch` fallback for hot-publish scenarios.

## Flow

```
git checkout -b release-2.1.0
npm run release:minor
  ├─ preflight (clean tree, NOT on main, origin/main ancestor of HEAD)
  ├─ lint + test + license-check
  ├─ npm version <bump> --no-git-tag-version
  ├─ assert vX.Y.Z tag doesn't already exist
  ├─ Claude CLI drafts CHANGELOG bullets (skipped if `claude` not installed)
  ├─ $EDITOR opens CHANGELOG.md for review
  └─ git commit -m "chore(release): X.Y.Z"      # on the release branch

# Then, manually:
git push -u origin release-2.1.0
gh pr create --base main --title "release: v2.1.0" --body "<changelog section>"

# --- review + merge the PR ---

git checkout main && git pull --ff-only
git tag -a v2.1.0 -m "v2.1.0"
git push origin v2.1.0
npm run build-publish
gh release create v2.1.0 --notes "<changelog section>"
```

The script prints all of step 2 onward as a copy-paste block at the end of the run.

## Commands

| Command | Result |
|---------|--------|
| `npm run release:patch` | 2.1.0 → 2.1.1 |
| `npm run release:minor` | 2.1.0 → 2.2.0 |
| `npm run release:major` | 2.1.0 → 3.0.0 |
| `npm run release -- 2.2.0-rc.1` | explicit version (RC) |
| `npm run release -- minor --dry-run` | preview every command, change nothing |
| `npm run release -- patch --no-test` | skip lint+test+license-check |

> `npm run` swallows positional args unless you pass them after `--`. Use the convenience aliases (`:patch` / `:minor` / `:major`) when you can.

## What the script enforces

Steps run in order. Any failure aborts.

1. Working tree is clean.
2. Current branch is **not** `main`. Releases must happen on a separate branch so a reviewer sees the version + changelog in a PR.
3. `origin/main` is an ancestor of `HEAD` (i.e. the release branch is based on current `main`, not stale).
4. `lint`, `test`, `license-check` all pass (skippable via `--no-test`).
5. Bumps version via `npm version <arg> --no-git-tag-version`.
6. Asserts `vX.Y.Z` does not already exist locally or on origin.
7. Calls Claude CLI with `git log` + `git diff --stat` since the previous `v*` tag. Asks for 3–7 high-level bullets. Falls back to an empty `- ` stub if `claude` is not installed.
8. Prepends `## X.Y.Z` plus the bullets to `CHANGELOG.md` and opens `$EDITOR`.
9. After save, verifies the new section actually has content (not just an empty stub).
10. `git commit -m "chore(release): X.Y.Z"` on the current branch. **No tag.**
11. Prints the push, PR-creation, post-merge tag, publish, and `gh release create` commands so you can review before handing off.

**Rollback:** if any step between the version bump and the commit fails, the script restores `package.json`, `package-lock.json`, and `CHANGELOG.md` so the next retry starts clean.

**AI requirement:** none. If the `claude` CLI is on your PATH, the script uses it. If not, you get an empty stub to fill in by hand.

## Manual steps after the script

The script stops after the local commit. You drive the rest:

```bash
# 1. Push the release branch
git push -u origin release-X.Y.Z

# 2. Open a PR to main
gh pr create --base main \
  --title "release: vX.Y.Z" \
  --body "$(awk -v ver='X.Y.Z' '
    $0 == "## " ver { found=1; next }
    found && /^## / { exit }
    found { print }
  ' CHANGELOG.md)"

# --- review + merge the PR ---

# 3. After PR merges, tag the merge commit on main
git checkout main && git pull --ff-only
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z

# 4. Create the GitHub Release (mirrors the CHANGELOG section as the body)
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes "$(awk -v ver='X.Y.Z' '
    $0 == "## " ver { found=1; next }
    found && /^## / { exit }
    found { print }
  ' CHANGELOG.md)"

# 5. Publish to npm
npm run build-publish
```

The script prints all five command blocks at the end, ready to copy-paste with the correct version filled in.

## Conventions

- **Tag format:** `vX.Y.Z` (matches the existing `v1.3.5-internal.0` style). The tag, not the branch, defines the release.
- **Release commit:** `chore(release): X.Y.Z` (Conventional Commits).
- **Branch name:** anything that won't collide. `release-X.Y.Z`, `bump-X.Y.Z`, `chore/release-X.Y.Z` all work. Branch is a workspace, not the release artifact.
- **PR title:** `release: vX.Y.Z` — easy to spot in the PR list.
- **Branches:** release branches cut from `main`. Script refuses to run on `main` itself.
- **Pre-releases:** suffix with `-rc.N` (e.g. `2.0.0-rc.1`). Publish these under the `next` dist-tag manually: `npm publish --tag next --access=public` — the script does not branch on this yet.
- **Migration notes:** for majors, link to the version PR from the corresponding `## X.0.0` section of `CHANGELOG.md`.

## Why this design

| Concern | How we handle it |
|---------|-----------------|
| Single source of truth for what shipped | The tag points at the merge commit, which contains the matching `CHANGELOG.md` entry. |
| Reviewer sees the version bump + changelog before it lands | Release PR shows the diff. CI runs the full pipeline on the PR. |
| Branch protection on `main` | Script never touches `main`. Only the merge (via PR) and the tag push go to it. |
| Cost / API key sprawl | AI runs locally using the developer's existing Claude CLI auth. Zero new GitHub secrets. |
| Human review of AI output | Script opens `$EDITOR` after AI drafts. You always see the changelog before it's committed. |
| Wrong version published | Local preflight + `npm version` keep `package.json` and the tag in lockstep. The PR diff is the second sanity check. |
| Avoid "tag updates changelog" chicken-and-egg | Changelog is committed BEFORE the tag exists. Tag goes on the merge commit AFTER review. |

## Troubleshooting

**"On 'main'. Releases must run on a separate branch."** — `git checkout -b release-<your-version>` first, then rerun.

**"origin/main is not an ancestor of HEAD."** — your release branch is based on something other than current `main`. Run `git fetch origin main && git rebase origin/main` (or `git merge origin/main`) and retry.

**"Tag v2.0.0 already exists"** — most often happens when a previous `npm version` ran without `--no-git-tag-version`. Delete the stray tag (`git tag -d v2.0.0`, plus `git push --delete origin v2.0.0` if it was pushed) and retry.

**"Working tree is not clean"** — commit or stash everything first. The script will not touch a dirty tree.

**"No changelog entries added under ## X.Y.Z"** — the editor was saved with only the empty `- ` stub. Add bullets and rerun.

**AI drafted weird bullets** — edit them in `$EDITOR` before saving. If `claude` itself is misbehaving, uninstall or unset `PATH` for that run; the script falls back to the empty stub.

## Future improvements (not blockers)

- A `--tag next` dist-tag flag for RCs so `npm publish` doesn't tag them as `latest`.
- A small CI workflow that mirrors the CHANGELOG section into the GitHub Release body automatically (read-only on the repo, no commit-back).
- A `release-please`-style fully automated PR-driven model if we move to multi-maintainer release ownership.
