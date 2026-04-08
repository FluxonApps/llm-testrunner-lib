# LLM TestRunner Components

**A ready-made UI for testing your LLM.** Add questions and expected outcomes, run tests one-by-one or in batch, and get pass/fail results using five evaluation strategies—while you keep full control over which LLM you call (OpenAI, Gemini, Claude, or your own).

[![npm](https://img.shields.io/npm/v/llm-testrunner-components.svg)](https://www.npmjs.com/package/llm-testrunner-components) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why use this

- **Test faster** — You get a complete test-runner UI (questions, expected outcomes, run one / run all, pass/fail, response times). No need to build tables, evaluation logic, or import/export from scratch.
- **Stay in control** — The library never calls an LLM. You handle one event: we send you the prompt, you call your API and pass back the response (or an error). Works with any provider or local model.
- **Match how you think** — Each expected-outcome field can use a different evaluation: exact keywords, semantic similarity (meaning), ROUGE (word overlap / sequence), or BLEU (n-gram precision). Choose per field.
- **Fit your stack** — Load test cases from your backend or a JSON file. Optionally persist runs with a Save button that emits the current state so you can store it in Firebase, your API, or anywhere else.

---

## What you get

- **Test case table** — Add, edit, delete test cases. Each test case has a question, configurable expected-outcome fields (single line, paragraph, keyword chips, dropdown), and a per-field evaluation approach (exact, semantic, ROUGE-1, ROUGE-L, BLEU).
- **Run one or run all** — Run a single test or batch with a configurable delay between API calls (rate limiting).
- **Live results** — Pass/fail, keyword match count (e.g. X/Y found), and response time per test.
- **Import / export** — Import a test suite from JSON. Export the current suite as JSON or export run results as CSV.
- **Optional save** — When enabled, a Save button emits the current test cases so your app can persist them (e.g. to your backend).

---

## Installation

```bash
npm install llm-testrunner-components
```

---

## Get started (React)

**Step 1 — Register the custom elements once** (e.g. in your app entry):

```tsx
// e.g. in main.tsx or App.tsx
import { defineCustomElements } from "llm-testrunner-components/loader";

defineCustomElements();
```

**Step 2 — Use the component and connect your LLM.** The runner fires an `llmRequest` event whenever it needs a response. You call your API, then either `resolve({ text, metadata? })` or `reject(error)`.

```tsx
import { useRef } from "react";
import { LlmTestRunner } from "llm-testrunner-components/react";

function App() {
  const runnerRef = useRef<any>(null);

  const handleLlmRequest = async (e) => {
    try {
      const response = await yourLLMApi(e.detail.prompt);
      e.detail.resolve({ text: response });
    } catch (err) {
      e.detail.reject(err);
    }
  };

  const handleSave = async (e) => {
    await yourSaveApi(e.detail);
    await runnerRef.current?.resetSavingState();
  };

  return (
    <LlmTestRunner
      ref={runnerRef}
      onLlmRequest={handleLlmRequest}
      onSave={handleSave}
      delayMs={500}
      useSave={true}
    />
  );
}
```

That’s enough for a working runner. Replace `yourLLMApi` and `yourSaveApi` with your real calls. If you don’t need persistence, omit `useSave`, `onSave`, and `ref` / `resetSavingState`.

---

## Get started (vanilla HTML)

Load the loader and define the custom elements, then listen for `llmRequest` and call `resolve` or `reject`.

```html
<llm-test-runner id="runner" delay-ms="500"></llm-test-runner>

<script type="module">
  import { defineCustomElements } from "https://unpkg.com/llm-testrunner-components@1/loader/index.js";
  defineCustomElements();

  const runner = document.getElementById("runner");
  runner.addEventListener("llmRequest", async (e) => {
    try {
      const response = await yourLLMFetch(e.detail.prompt);
      e.detail.resolve({ text: response });
    } catch (err) {
      e.detail.reject(err);
    }
  });
</script>
```

---

## Connect your LLM

The library **never** sends requests to an LLM. You do. When a test runs, the component emits an `llmRequest` event with:

- `prompt` — the question text for this test case  
- `resolve({ text, metadata? })` — call this with the model’s reply payload  
- `reject(error)` — call this if the request fails  

How you get the response is up to you: REST, SDK, or local inference. Same pattern for OpenAI, Gemini, Claude, or any other provider.

---

## Loading and saving test cases

**Loading** — Pass `initialTestCases` with an array of test cases (e.g. from your backend or a file). You can use the full `TestCase` shape or a minimal one: `question` and `expectedOutcome`. The runner will fill in `id` and run state.

**Saving** — Set `useSave={true}` to show the Save button. When the user clicks it, the component emits a `save` event with `{ timestamp, testCases }`. Persist that in your backend (e.g. Firebase or your API). After the save completes, call `runnerRef.current.resetSavingState()` so the button leaves the loading state. If you don’t call it, a failsafe resets it after 10 seconds.

---

## Evaluation: pick the right approach

Each expected-outcome field can use a different evaluation method. All of them compare the **expected** text for that field to the **actual** LLM response. A test **passes only if every field** passes with its selected method.

| Approach   | What it measures              | Good for                                      | Paraphrasing / synonyms | Speed        |
| --------- | ----------------------------- | --------------------------------------------- | ------------------------ | ------------ |
| **Exact** | Literal keyword in response    | Strict wording, facts, templates              | No                       | Fast         |
| **ROUGE-1** | Word overlap (unigram)       | Slight paraphrasing, same key words           | Moderate                 | Fast         |
| **ROUGE-L** | Longest common subsequence   | Phrasing and word order matter                 | Moderate–high            | Slightly slower |
| **Semantic** | Meaning (embeddings + cosine) | Different words, same meaning                 | Yes                      | First run loads model |
| **BLEU**  | N-gram precision (1–4)         | Translation-like or n-gram overlap             | Moderate                 | Fast         |

- Set **per expected-outcome field** via the dropdown in the UI, or via each field’s `evaluationParameters.approach` when you pass `initialTestCases`.
- **ROUGE, BLEU, and Semantic** use a fixed threshold (0.7).
- **Semantic** uses in-browser embeddings ([Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2)). The first time you use it, the model is downloaded; later runs are faster.

---

## Expected outcome fields

Expected outcomes can be more than a single text block. You can define:

- **text** — Single line  
- **textarea** — Multi-line  
- **chips-input** — List of keywords (each compared in evaluation)  
- **select** — Dropdown (value must be one of the options)  

When you pass `initialTestCases`, use an array of objects with `type`, `label`, and `value` (and for `select`, `options`). For **new** test cases, the runner uses `defaultExpectedOutcomeSchema` if you pass it; otherwise it uses a default single textarea.

---

## API reference

### Props

| Prop | Attribute | Type | Default | Description |
|------|-----------|------|---------|-------------|
| `delayMs` | `delay-ms` | `number` | `500` | Delay (ms) between API calls when running all tests (rate limiting). |
| `useSave` | `use-save` | `boolean` | `false` | Show Save button and emit `save` events. |
| `initialTestCases` | — | `TestCase[]` | `undefined` | Preload test cases. See [types](#types) below. |
| `defaultExpectedOutcomeSchema` | — | `ExpectedOutcomeSchema` | built-in | Schema for new test cases (field types and labels). |
| `evaluationSourceExtractors` | — | `EvaluationSourceExtractors` | `undefined` | Registry of named extractors used by per-field `evaluationSource: { type: 'custom', extractorId }`. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `llmRequest` | `{ prompt, resolve, reject }` | Runner needs an LLM response. Call `resolve({ text, metadata? })` or `reject(error)`. |
| `save` | `{ timestamp, testCases }` | User clicked Save (only when `useSave` is true). Persist then call `resetSavingState()`. |

### Methods

| Method | Description |
|--------|-------------|
| `resetSavingState()` | Call after you finish persisting a save so the Save button leaves loading state. Use a ref in React. |
| `getTestCases()` | Returns the current in-memory test cases from the runner as `Promise<TestCase[]>`. |

### Types

Import from `llm-testrunner-components/react/types`:

```ts
import type {
  TestCase,
  LLMRequestPayload,
  ModelResponsePayload,
  EvaluationSourceExtractors,
  SavePayload,
  ExpectedOutcomeSchema,
  ExpectedOutcomeField,
  EvaluationParameters,
} from "llm-testrunner-components/react/types";
```

---

## Import and export

- **Import** — Use the UI to load a JSON file. It must be an array of test cases. Invalid or empty files show an error.
- **Export test suite** — Downloads a JSON file with the current test cases.
- **Export results** — Downloads a CSV of the latest run (includes evaluation score).

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started (opening issues, pull request workflow, and code of conduct).

---

## License

The project is licensed under the [MIT License](LICENSE).

Third-party licenses are in `node_modules/<package>/`. This project uses [licensee](https://github.com/jslicense/licensee.js) and the [Blue Oak Council](https://blueoakcouncil.org/list) permissive list; only dependencies with a Blue Oak bronze-or-better license (or an exception in [.licensee.json](.licensee.json)) are allowed. Run `npm run license-check` to verify locally.
