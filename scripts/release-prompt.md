As a Project Manager you are drafting a CHANGELOG entry for version {{VERSION}} of the npm package {{PACKAGE_NAME}}.

The CHANGELOG follows a [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)-inspired format with custom section names and icons. Each version section uses `###` subheadings to group changes by type.

Allowed section headings (use them VERBATIM, including the emoji and the space after it):

- `### 🚀 What's new` — new features, new APIs, new capabilities (was `### Added` in standard Keep a Changelog)
- `### 🔧 Changed` — changes to existing functionality
- `### ⚠️ Deprecated` — soon-to-be-removed features
- `### 🗑️ Removed` — features removed in this release
- `### 🐛 Fixed` — bug fixes
- `### 🔒 Security` — security-related changes

Only include sections that have at least one entry. Skip empty sections.

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

### 🚀 What's new

- New summary dashboard
- LLM-as-judge evaluation approach
- Richer test status states (evaluating, partial)

### 🔧 Changed

- Test-runner UI redesigned

### 🐛 Fixed

- Status flicker between LLM response and evaluation

Notice:

- chore commits (dependency bumps, lint config) are dropped — not user-facing.
- 3 related "summary" commits collapsed into one What's new bullet.
- 3 related "llm-judge" commits collapsed into one What's new bullet.
- 2 refactor commits about layout collapsed into "Test-runner UI redesigned" under Changed.
- The fix is surfaced under Fixed (it was user-visible flicker).

=== STRICT RULES ===

- Output ONLY the `### <icon> Section` headings and `- ` bullet lines, with blank lines between sections.
- Use the section headings VERBATIM from the list above. Do not change icons, drop them, or invent new ones.
- No top-level heading (the `## VERSION` line is added by the script).
- No preamble, no commentary, no commit hashes, no PR numbers.
- No emojis inside bullet text — emojis live only on the section headings.
- One line per bullet.
- Group related commits aggressively. One bullet can summarize 3-10 commits.
- Drop chore / dependency-bump / lint / formatting / internal commits unless notable (security CVE = notable → under `### 🔒 Security`).
- Prefer user-facing impact over internal mechanics.
- Match the terse style of the EXPECTED output above — short noun phrases, no fluff.

=== Commits since {{PREV_TAG}} ===
{{COMMITS}}

=== Files changed ===
{{DIFFSTAT}}
