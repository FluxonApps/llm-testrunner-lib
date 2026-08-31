# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.3.0

### 🚀 What's new

- Chat history view for test case conversations
- Question card for reviewing individual test cases
- Export-suite validation
- Primary expected-outcome field gating helper

### 🔧 Changed

- Test-runner UI redesigned with new evaluation banner, toolbar, and shared UI primitives (replacing the old header/summary chrome)
- LLM-judge criteria disclosure renamed to reflect what it holds
- Bump the dev-dependencies group with 13 updates (jest/puppeteer pinned for Stencil compatibility)

## 2.2.2

### 🔧 Changed

- Bump @google/genai from 1.43.0 to 2.17.1
- Bump zod from 4.3.6 to 4.4.3
- Bump @stencil/react-output-target from 1.6.1 to 1.6.2

### 🐛 Fixed

- ROUGE-1 evaluator: restored recall-only scoring on js-rouge 3.2 (beta:Infinity pin)

## 2.2.1

### 🔒 Security

- Fixed CSV formula injection vulnerability in exported test results

## 2.2.0

### 🔒 Security

- Upgraded brace-expansion and ip-address dependencies to address known vulnerabilities
- Resolved additional dependency vulnerabilities and migrated lint tooling to flat config

## 2.1.0

### 🔧 Changed

- Test-runner UI redesigned
- Header component layout updated
- Test case row and chat history components refactored

### 🐛 Fixed

- Sticky header issues
- CSS flicker on test re-run
- Protobufjs vulnerability

### 🔒 Security

- Fix npm publish using OpenID Connect
- Bump uuid from 10.0.0 to 14.0.0
- Bump ws from 8.19.0 to 8.20.1

## 2.0.0

### 🚀 What's new

- New summary dashboard
- LLM-as-judge evaluation approach
- Richer test status states (evaluating, partial)

### 🔧 Changed

- Test-runner UI redesigned

## 1.x.x

### 🚀 What's new

- Headless assertions for Jest (`toExactMatch`, `toSemanticMatch`, `toRouge1Match`, `toRougeLMatch`, `toBleuMatch`)
- Built-in evaluators: exact, semantic, ROUGE-1, ROUGE-L, BLEU
- Test suite import / export and CSV results export
- Optional save flow
- Initial test-runner UI
