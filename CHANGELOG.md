# Changelog

## 2.0.0 - 2026-05-26

### Added

- Summary dashboard component with live pass-rate, status chips, and total test count
- `Show summary` toggle in the header
- `llm-judge` evaluation approach with configurable system + user prompts and per-criterion scoring
- `llmJudge` prop on `<llm-test-runner>`
- `evaluating` and `partial` status kinds
- Animated number transitions on the summary (honors `prefers-reduced-motion`)
- Highlight animation for newly added test cases
- Design tokens in `src/styles/tokens.css`
- Unit tests for `computeTestStatus`

### Changed

- Redesigned test-runner header, row, and evaluation summary
- Unified field-result counting via `computeTestStatus()`
- Replaced nested `setTimeout` scroll-and-highlight with `requestAnimationFrame` polling

