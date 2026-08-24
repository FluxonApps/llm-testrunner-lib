You are drafting a CHANGELOG entry for version {{VERSION}} of the npm package {{PACKAGE_NAME}}.

This release consists ENTIRELY of automated Dependabot / security dependency bumps merged into `main` — unlike a normal feature release, dependency bumps are the content here, not noise to drop.

The CHANGELOG follows a [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)-inspired format with custom section names and icons. Each version section uses `###` subheadings to group changes by type.

Allowed section headings (use them VERBATIM, including the emoji and the space after it):

- `### 🔒 Security` — dependency bumps that fix a known CVE / security advisory
- `### 🔧 Changed` — routine dependency version bumps with no known security fix

Only include sections that have at least one entry. Skip empty sections.

=== WORKED EXAMPLE ===

GIVEN commits like:
  Bump zod from 3.22.2 to 3.23.0
  Bump @google/genai from 1.4.0 to 1.5.1
  Bump js-rouge from 1.0.0 to 1.0.1 (fixes GHSA-xxxx-xxxx-xxxx ReDoS)
  Bump actions/checkout from 4 to 7
  Bump actions/setup-node from 4 to 7

EXPECTED output:

### 🔒 Security

- Updated js-rouge to patch a ReDoS vulnerability

### 🔧 Changed

- Updated zod, @google/genai
- Updated CI actions (actions/checkout, actions/setup-node)

Notice:

- The security-relevant bump gets its own bullet under Security, with the vulnerability class named, not the CVE ID.
- Routine bumps are grouped: runtime deps in one bullet, CI/tooling deps in another.
- No version numbers in bullets — that detail lives in package.json / package-lock.json, not the changelog prose.

=== STRICT RULES ===

- Output ONLY the `### <icon> Section` headings and `- ` bullet lines, with blank lines between sections.
- Use the section headings VERBATIM from the list above. Do not invent other sections (no "What's new", no "Fixed") — this release type only ever has Security and/or Changed entries.
- No top-level heading (the `## VERSION` line is added by the workflow).
- No preamble, no commentary, no commit hashes, no PR numbers, no version numbers.
- One line per bullet. Group related/same-purpose bumps into one bullet rather than one bullet per package.
- If nothing in the commit list looks security-relevant, omit the Security section entirely.

=== Commits since {{PREV_TAG}} ===
{{COMMITS}}

=== Files changed ===
{{DIFFSTAT}}
