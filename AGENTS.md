# Agent notes for this repo

Practical, hard-won guidance for AI coding agents (Claude Code, Cursor, etc.)
working in this repo — not a restatement of [README.md](README.md) (what the
library does), [CONTRIBUTING.md](CONTRIBUTING.md) (PR process basics), or
[RELEASING.md](RELEASING.md) (the release flow — read that directly, don't
duplicate it here). This is about *how things actually go wrong here*.

Last verified 2026-09-08 — re-check environment-specific claims below if it's
been a while.

## This is a published library — passing tests here is not enough

`llm-testrunner-components` ships to npm and gets consumed by external apps.
A change that passes this repo's own `npm test` can still be broken for every
consumer, in ways this repo's tests structurally cannot catch:

- **A schema fix and its public TypeScript type must move together.**
  `src/schemas/*.ts` (runtime Zod validation) and the `@Prop()` declarations in
  `src/components/llm-test-runner/llm-test-runner.tsx` are two separate
  sources of truth for the same public API surface. Loosening a Zod schema
  (e.g. making a field optional) does nothing for a TypeScript consumer if the
  `@Prop()` is still typed against the stricter shape (e.g. `TestCase[]`
  instead of `TestCaseInput[]`) — this exact bug shipped and was only caught
  by an external consumer's `tsc`, not by anything in this repo. Jest tests
  run against already-transpiled JS and don't type-check consumer call sites,
  so this class of bug is invisible to `npm test` no matter how much coverage
  you add here.
- **Before considering a public-API change done, verify it against a real
  external consumer**, not just this repo's suite:
  ```bash
  npm run build && npm pack   # produces llm-testrunner-components-X.Y.Z.tgz
  ```
  Install that tarball in a real consuming app (`npm install /path/to/*.tgz`)
  and check both runtime behavior *and* `tsc --noEmit` there. If the consumer
  runs in Docker with its own `node_modules` (as with one known internal
  consumer), a host-side `npm install` doesn't reach the container — copy the
  tarball in and install it inside the container instead:
  ```bash
  docker compose cp llm-testrunner-components-X.Y.Z.tgz <service>:/tmp/pkg.tgz
  docker compose exec <service> npm install /tmp/pkg.tgz
  ```
  Restart/recreate the consumer's dev server after — bundlers cache dependency
  metadata and won't pick up a swapped local package without one.

## Build has three separate stages, each backing a different published entry point

`npm run build` = `stencil build && tsc --project tsconfig.react.json && tsup`.
Each stage owns a different subpath in `package.json`'s `exports` map:
Stencil → `.`/`./loader` (the web components + lazy-loading proxy), the
`tsc` step → `./react` (the generated React wrapper + its types), `tsup` →
`./headless` (the framework-free Jest-matchers module). Running just
`stencil build` (e.g. via the Stencil CLI directly, out of habit) silently
leaves `./react` and `./headless` stale — always use `npm run build` (or
`build:all`, which also runs `build:react` again) when verifying a change
that touches any of the three.

## Known consumer-side gotcha worth knowing about (not fixable here)

A Vite-based consumer app will hard-crash its entire dev server (not just
warn) the first time it imports this package, with an error like
`No loader is configured for ".map" files: .../dist/esm/*.entry.js.map`.
Cause: Stencil's lazy component loader does a dynamic
`` import(`./${bundleId}.entry.js`) ``, and Vite's esbuild-based dependency
scanner statically over-scans the whole directory that pattern could match,
including sibling `.map` sourcemap files it has no loader for. This is a
Vite/esbuild + Stencil interaction, not something to fix in this repo — the
consumer needs `optimizeDeps: { exclude: ['llm-testrunner-components'] }` in
their `vite.config.ts`. Worth mentioning proactively if you're ever helping
someone integrate this package into a Vite app and they hit a dev-server
crash on the very first import.

## PR review workflow

Same setup as `FluxonApps/llm-testrunner` (`.github/workflows/claude-code-review.yml`
+ `claude-code-re-review.yml`):

- **A PR that modifies its own review workflow file can never be reviewed by
  that workflow** — GitHub blocks this by design (a security measure, not a
  bug: `Workflow validation failed: the workflow file must exist and have
  identical content to the version on the default branch`). Normal; it starts
  working once merged.
- **`claude-review` only fires on `pull_request: opened`**, not later pushes —
  deliberate, to avoid the `/code-review` plugin's known "already reviewed,
  skip" no-op bug. Comment `@claude re-review` on a PR to get a scoped
  re-check (fixed/still-present/regression against previously-flagged issues)
  instead of expecting automatic re-review on every push.
- Merging needs an actual human-approving review — a bot comment alone
  doesn't satisfy branch protection.
