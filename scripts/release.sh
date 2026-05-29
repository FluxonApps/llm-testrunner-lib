#!/usr/bin/env bash
# release.sh — version bump + changelog + commit + tag (local only).
#
# Usage:
#   scripts/release.sh <major|minor|patch|prerelease|X.Y.Z[-rc.N]> [--dry-run] [--no-test]
#
# Examples:
#   scripts/release.sh patch
#   scripts/release.sh minor --dry-run
#   scripts/release.sh 2.1.0-rc.1
#   scripts/release.sh major --no-test       # only if CI already ran the suite
#
# What it does:
#   1. Asserts clean tree, on `main`, in sync with origin/main.
#   2. Asserts the resulting tag does not already exist (local + remote).
#   3. Runs lint + test + license-check (skippable with --no-test).
#   4. Bumps version via `npm version <arg> --no-git-tag-version`.
#   5. AI-drafts changelog bullets (if `claude` CLI available); falls back to empty stub.
#   6. Opens $EDITOR on CHANGELOG.md for review.
#   7. Validates bullets were added.
#   8. Commits `chore(release): X.Y.Z` on `main`.
#   9. Tags `vX.Y.Z` on the commit.
#  10. Prints the push + publish + GitHub Release commands.
#
# Any failure between step 4 and step 9 rolls back package.json,
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
EXPECTED_BRANCH="main"   # releases must cut from this branch

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

# Must be on the expected release branch.
CUR_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CUR_BRANCH" != "$EXPECTED_BRANCH" ]; then
  die "On '$CUR_BRANCH', expected '$EXPECTED_BRANCH'. Releases must cut from $EXPECTED_BRANCH.
       Run:
         git checkout $EXPECTED_BRANCH
         git pull --ff-only
         npm run release:<bump>"
fi
ok "On branch $EXPECTED_BRANCH"

# Must be in sync with origin/main — no local drift, no remote drift.
info "Fetching origin..."
run git fetch origin --quiet
if [ "$DRY_RUN" -eq 0 ]; then
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "origin/$EXPECTED_BRANCH")
  if [ "$LOCAL" != "$REMOTE" ]; then
    die "Local $EXPECTED_BRANCH not in sync with origin/$EXPECTED_BRANCH. Pull or push first."
  fi
fi
ok "In sync with origin/$EXPECTED_BRANCH"

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
#
# The prompt template lives at scripts/release-prompt.md so it can be edited
# without touching this script. Placeholders: {{VERSION}}, {{PACKAGE_NAME}},
# {{PREV_TAG}}, {{COMMITS}}, {{DIFFSTAT}}.
PROMPT_TEMPLATE_FILE="$(dirname "$0")/release-prompt.md"

get_ai_bullets() {
  command -v claude >/dev/null 2>&1 || return 1
  [ -f "$PROMPT_TEMPLATE_FILE" ] || { warn "Prompt template not found at $PROMPT_TEMPLATE_FILE"; return 1; }

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

  # Load template and substitute placeholders. Bash ${var//A/B} handles
  # multiline replacement values (commits, diffstat) safely.
  prompt=$(cat "$PROMPT_TEMPLATE_FILE")
  prompt="${prompt//\{\{VERSION\}\}/$NEW_VERSION}"
  prompt="${prompt//\{\{PACKAGE_NAME\}\}/$pkg_name}"
  prompt="${prompt//\{\{PREV_TAG\}\}/${prev_tag:-HEAD}}"
  prompt="${prompt//\{\{COMMITS\}\}/$commits}"
  prompt="${prompt//\{\{DIFFSTAT\}\}/$diffstat}"

  output=$(claude --print "$prompt" 2>/dev/null) || return 1
  bullets=$(printf '%s\n' "$output" | awk '/^(###|- )/{found=1} found' || true)
  printf '%s\n' "$bullets" | grep -qE '^- .' || return 1

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
      echo "### 🚀 What's new"
      echo ""
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
  CONTENT=$(printf '%s\n' "$NEW_SECTION" \
    | sed '/^[[:space:]]*$/d' \
    | sed '/^###/d' \
    | sed '/^-[[:space:]]*$/d' \
    || true)
  if [ -z "$CONTENT" ]; then
    die "No changelog entries added under ## $NEW_VERSION. Aborting."
  fi
  ok "Changelog entries detected"
fi

# ---------- commit + tag ----------
info "Committing release"
run git add package.json package-lock.json CHANGELOG.md
run git commit -m "chore(release): $NEW_VERSION"

info "Tagging $TAG"
run git tag -a "$TAG" -m "$TAG"

ROLLBACK_NEEDED=0
ok "Release $NEW_VERSION ready locally."

# ---------- next steps ----------
cat <<EOF

${BOLD}Next steps (run manually when ready):${RESET}

  ${BLUE}# 1. Push the release commit + tag${RESET}
  git push origin $EXPECTED_BRANCH
  git push origin $TAG

  ${BLUE}# 2. Publish to npm${RESET}
  npm run build-publish

  ${BLUE}# 3. Create GitHub Release (mirrors CHANGELOG section as the body)${RESET}
  gh release create $TAG \\
    --title "$TAG" \\
    --notes "\$(awk -v ver=\"$NEW_VERSION\" '
      \$0 == \"## \" ver { found=1; next }
      found && /^## / { exit }
      found { print }
    ' CHANGELOG.md)"

EOF
