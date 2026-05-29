#!/usr/bin/env bash
# release.sh — prep a release PR locally (Pattern Y: PR-driven release).
#
# Usage:
#   git checkout -b release-<your-version>
#   scripts/release.sh <major|minor|patch|prerelease|X.Y.Z[-rc.N]> [--dry-run] [--no-test]
#
# Examples:
#   scripts/release.sh patch
#   scripts/release.sh minor --dry-run
#   scripts/release.sh 2.1.0-rc.1
#   scripts/release.sh major --no-test       # only if CI already ran the suite
#
# What it does (Pattern Y — release PR flow):
#   1. Asserts clean tree, NOT on `main`, and that origin/main is reachable from HEAD.
#   2. Asserts the resulting tag does not already exist (local + remote).
#   3. Runs lint + test + license-check (skippable with --no-test).
#   4. Bumps version via `npm version <arg> --no-git-tag-version`.
#   5. AI-drafts changelog bullets (if `claude` CLI available); falls back to empty stub.
#   6. Opens $EDITOR on CHANGELOG.md for review.
#   7. Validates bullets were added.
#   8. Commits `chore(release): X.Y.Z` on the current branch (NO tag).
#   9. Prints the push + PR-creation + post-merge tag + publish commands.
#
# The tag is NOT created by this script — it goes on the merge commit AFTER
# the PR is approved and merged into `main`. The release artifact is the
# tag, not the branch; branch name is purely cosmetic.
#
# Any failure between step 4 and step 8 rolls back package.json,
# package-lock.json, and CHANGELOG.md so retries start clean.

set -euo pipefail

# ---------- styling ----------
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; RESET=''
fi

info()  { printf '%s==>%s %s\n' "$BLUE"   "$RESET" "$*"; }
ok()    { printf '%s✓%s   %s\n' "$GREEN"  "$RESET" "$*"; }
warn()  { printf '%s!%s   %s\n' "$YELLOW" "$RESET" "$*" >&2; }
die()   { printf '%s✗%s   %s\n' "$RED"    "$RESET" "$*" >&2; exit 1; }

# ---------- arg parsing ----------
BUMP=""
DRY_RUN=0
SKIP_TEST=0
PROTECTED_BRANCH="main"   # the branch we release INTO (script refuses to run on it)

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-test) SKIP_TEST=1 ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//' | sed '$d'
      exit 0 ;;
    -*) die "Unknown flag: $arg" ;;
    *)  [ -z "$BUMP" ] || die "Multiple bump args: '$BUMP' and '$arg'"
        BUMP="$arg" ;;
  esac
done

[ -n "$BUMP" ] || die "Missing bump arg. See: $0 --help"

# ---------- helpers ----------
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '%s[DRY-RUN]%s %s\n' "$YELLOW" "$RESET" "$*"
  else
    "$@"
  fi
}

ROLLBACK_NEEDED=0
rollback() {
  if [ "$ROLLBACK_NEEDED" -eq 1 ] && [ "$DRY_RUN" -eq 0 ]; then
    warn "Rolling back package.json, package-lock.json, CHANGELOG.md..."
    git checkout -- package.json package-lock.json CHANGELOG.md 2>/dev/null || true
  fi
}
trap rollback EXIT

# ---------- locate repo root ----------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not inside a git repo."
cd "$REPO_ROOT"

# ---------- preflight ----------
info "Preflight checks"

# Clean working tree
if ! git diff --quiet || ! git diff --cached --quiet; then
  die "Working tree is not clean. Commit or stash first."
fi
ok "Working tree clean"

# Refuse to run on the protected branch — releases happen on a dedicated branch
# and merge to $PROTECTED_BRANCH via PR. The merge commit is what gets tagged.
CUR_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CUR_BRANCH" = "$PROTECTED_BRANCH" ]; then
  die "On '$PROTECTED_BRANCH'. Releases must run on a separate branch.
       Run:
         git checkout -b release-<your-version>
         npm run release:<bump>
       The branch name itself is up to you — it's just a workspace for the
       release PR. The tag, not the branch, defines the release."
fi
ok "On branch '$CUR_BRANCH' (not '$PROTECTED_BRANCH')"

# Make sure $PROTECTED_BRANCH is reachable from HEAD — i.e. this branch is
# based on (or ahead of) $PROTECTED_BRANCH. Catches the case where someone
# branched from an old commit and is about to release stale code.
info "Fetching origin..."
run git fetch origin --quiet
if [ "$DRY_RUN" -eq 0 ]; then
  if ! git merge-base --is-ancestor "origin/$PROTECTED_BRANCH" HEAD; then
    die "origin/$PROTECTED_BRANCH is not an ancestor of HEAD.
         Rebase or merge $PROTECTED_BRANCH into '$CUR_BRANCH' first."
  fi
fi
ok "Branch is up-to-date with origin/$PROTECTED_BRANCH"

# package.json exists
[ -f package.json ] || die "No package.json at repo root."

# CHANGELOG.md exists (create stub if not)
if [ ! -f CHANGELOG.md ]; then
  warn "CHANGELOG.md not found, creating one."
  printf '# Changelog\n\n' > CHANGELOG.md
fi

# ---------- tests ----------
if [ "$SKIP_TEST" -eq 1 ]; then
  warn "Skipping lint/test/license-check (--no-test). Make sure CI already verified."
else
  info "Running lint..."
  run npm run lint
  info "Running tests..."
  run npm run test
  info "Running license-check..."
  run npm run license-check
  ok "All checks passed"
fi

# ---------- version bump ----------
info "Bumping version: $BUMP"
if [ "$DRY_RUN" -eq 1 ]; then
  CUR_VER=$(node -p "require('./package.json').version")
  printf '%s[DRY-RUN]%s npm version %s --no-git-tag-version (current: %s)\n' "$YELLOW" "$RESET" "$BUMP" "$CUR_VER"
  # Compute the resulting version via the `semver` package (available transitively).
  # Falls back to passing the arg through verbatim if it's an explicit version
  # like "2.0.0-rc.1" rather than a bump keyword.
  NEW_VERSION=$(node -e "
    try {
      const semver = require('semver');
      const cur = require('./package.json').version;
      const bumped = semver.inc(cur, process.argv[1]);
      console.log(bumped || process.argv[1]);
    } catch (_) {
      console.log(process.argv[1]);
    }
  " "$BUMP")
else
  npm version "$BUMP" --no-git-tag-version >/dev/null
  ROLLBACK_NEEDED=1
  NEW_VERSION=$(node -p "require('./package.json').version")
fi
ok "New version: $NEW_VERSION"

# Tag must not already exist
TAG="v$NEW_VERSION"
if [ "$DRY_RUN" -eq 0 ]; then
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    die "Tag $TAG already exists locally."
  fi
  if git ls-remote --exit-code --tags origin "$TAG" >/dev/null 2>&1; then
    die "Tag $TAG already exists on origin."
  fi
  ok "Tag $TAG is free"
fi

# ---------- AI-drafted bullets (optional) ----------
# Uses the `claude` CLI if available. Feeds it commit subjects + bodies +
# diff --stat between the previous v* tag and HEAD, asks for 3-7 short
# high-level bullets, and uses them to pre-fill the stub. Falls back to
# an empty "- " stub if `claude` is missing or returns nothing.
get_ai_bullets() {
  command -v claude >/dev/null 2>&1 || return 1

  local prev_tag commits diffstat pkg_name prompt output bullets
  prev_tag=$(git describe --tags --abbrev=0 --match "v*" 2>/dev/null || true)
  pkg_name=$(node -p "require('./package.json').name")

  if [ -n "$prev_tag" ]; then
    commits=$(git log --pretty=format:"%s%n%b%n---" "$prev_tag..HEAD" | head -c 60000)
    diffstat=$(git diff --stat "$prev_tag..HEAD" | head -c 10000)
  else
    commits=$(git log --pretty=format:"%s%n%b%n---" -n 50 | head -c 60000)
    diffstat=""
  fi

  [ -n "$commits" ] || return 1

  prompt=$(cat <<EOF
As a Project Manager you are drafting a CHANGELOG entry for version $NEW_VERSION of the npm package $pkg_name.

Write 3-7 high-level bullet points summarizing the changes below.

=== WORKED EXAMPLE ===

GIVEN commits like:
  feat(summary): add pass-rate dashboard component
  feat(summary): show Show summary checkbox in header
  feat(summary): animated number transitions on chip counts
  feat(llm-judge): wire end-to-end evaluation
  feat(llm-judge): support system + user prompts
  feat(llm-judge): return per-criterion scores
  feat(status): introduce 'evaluating' and 'partial' kinds
  refactor(row): redesign test case row layout
  refactor(header): consolidate import/export/save controls
  fix(row): clear flicker between LLM response and evaluation
  chore: bump ws from 8.19.0 to 8.20.1
  chore: update eslint config

AND diff stat showing changes in:
  src/components/llm-test-runner/summary/*
  src/components/llm-test-runner/header/*
  src/components/llm-test-runner/test-cases/*
  src/lib/evaluation/evaluators/llm-judge/*

EXPECTED output:
- New summary dashboard
- Test-runner UI redesigned
- LLM-as-judge evaluation approach
- Richer test status states

Notice:
- chore commits (dependency bumps, lint config) are dropped — not user-facing.
- 4 related "summary" commits collapsed into one bullet.
- 3 related "llm-judge" commits collapsed into one bullet.
- 2 refactor commits about layout collapsed into "Test-runner UI redesigned".
- The fix is internal mechanics, not surfaced — release note focuses on what users see.

=== STRICT RULES ===

- Output ONLY bullet lines (each starts with "- ").
- No headings, no preamble, no commentary, no commit hashes, no PR numbers, no emojis.
- One line per bullet.
- Group related commits aggressively. One bullet can summarize 3-10 commits.
- Drop chore / dependency-bump / lint / formatting / internal commits unless notable (security CVE = notable).
- Prefer user-facing impact over internal mechanics.
- Match the terse style of the EXPECTED output above — short noun phrases, no fluff.

=== Commits since ${prev_tag:-HEAD} ===
$commits

=== Files changed ===
$diffstat
EOF
)

  output=$(claude --print "$prompt" 2>/dev/null) || return 1
  bullets=$(printf '%s\n' "$output" | grep -E '^- ' || true)
  [ -n "$bullets" ] || return 1

  printf '%s\n' "$bullets"
}

AI_BULLETS=""
if [ "$DRY_RUN" -eq 0 ]; then
  info "Drafting changelog bullets via Claude CLI (optional)..."
  if AI_BULLETS=$(get_ai_bullets); then
    ok "AI drafted $(printf '%s' "$AI_BULLETS" | grep -c '^- ') bullets"
  else
    warn "Claude CLI unavailable or returned nothing — using empty stub."
    AI_BULLETS=""
  fi
fi

# ---------- changelog ----------
info "Prepending stub to CHANGELOG.md"
if [ "$DRY_RUN" -eq 0 ]; then
  # Build the new section in a temp file so multi-line AI bullets insert cleanly.
  NEW_SECTION_FILE=$(mktemp)
  {
    echo "## $NEW_VERSION"
    echo ""
    if [ -n "$AI_BULLETS" ]; then
      printf '%s\n' "$AI_BULLETS"
    else
      echo "- "
    fi
    echo ""
  } > "$NEW_SECTION_FILE"

  awk -v sectionfile="$NEW_SECTION_FILE" '
    /^## / && !inserted {
      while ((getline line < sectionfile) > 0) print line
      close(sectionfile)
      inserted=1
    }
    { print }
    END {
      if (!inserted) {
        while ((getline line < sectionfile) > 0) print line
        close(sectionfile)
      }
    }
  ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  rm -f "$NEW_SECTION_FILE"
fi

info "Opening ${EDITOR:-vi} on CHANGELOG.md — add high-level bullets, save, and exit."
run "${EDITOR:-vi}" CHANGELOG.md

# Verify user actually added content under the new section
if [ "$DRY_RUN" -eq 0 ]; then
  NEW_SECTION=$(awk -v ver="$NEW_VERSION" '
    $0 == "## " ver { found=1; next }
    found && /^## / { exit }
    found { print }
  ' CHANGELOG.md)
  # Strip blanks and the empty stub bullet "- " to see if anything real was added.
  CONTENT=$(printf '%s\n' "$NEW_SECTION" | sed '/^[[:space:]]*$/d' | sed '/^-[[:space:]]*$/d' || true)
  if [ -z "$CONTENT" ]; then
    die "No changelog entries added under ## $NEW_VERSION. Aborting."
  fi
  ok "Changelog entries detected"
fi

# ---------- commit (no tag — tag happens after PR merge) ----------
info "Committing release on '$CUR_BRANCH'"
run git add package.json package-lock.json CHANGELOG.md
run git commit -m "chore(release): $NEW_VERSION"

ROLLBACK_NEEDED=0
ok "Release commit for $NEW_VERSION ready on '$CUR_BRANCH'."

# ---------- next steps ----------
cat <<EOF

${BOLD}Next steps (run manually when ready):${RESET}

  ${BLUE}# 1. Push the release branch${RESET}
  git push -u origin $CUR_BRANCH

  ${BLUE}# 2. Open a PR to $PROTECTED_BRANCH (gh CLI)${RESET}
  gh pr create --base $PROTECTED_BRANCH \\
    --title "release: $TAG" \\
    --body "\$(awk -v ver=\"$NEW_VERSION\" '
      \$0 == \"## \" ver { found=1; next }
      found && /^## / { exit }
      found { print }
    ' CHANGELOG.md)"

  ${YELLOW}# --- review + merge the PR before running the rest ---${RESET}

  ${BLUE}# 3. After PR merges, tag the merge commit on $PROTECTED_BRANCH${RESET}
  git checkout $PROTECTED_BRANCH && git pull --ff-only
  git tag -a $TAG -m "$TAG"
  git push origin $TAG

  ${BLUE}# 4. Create GitHub Release${RESET}
  gh release create $TAG \\
    --title "$TAG" \\
    --notes "\$(awk -v ver=\"$NEW_VERSION\" '
      \$0 == \"## \" ver { found=1; next }
      found && /^## / { exit }
      found { print }
    ' CHANGELOG.md)"

  ${BLUE}# 5. Publish to npm${RESET}
  npm run build-publish

EOF
