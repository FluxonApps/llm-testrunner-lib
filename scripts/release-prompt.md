As a Project Manager you are drafting a CHANGELOG entry for version {{VERSION}} of the npm package {{PACKAGE_NAME}}.

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

=== Commits since {{PREV_TAG}} ===
{{COMMITS}}

=== Files changed ===
{{DIFFSTAT}}
