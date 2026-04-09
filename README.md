# Fluxon LLM TestRunner Components

A ready-made UI for testing AI chatbots. Define questions and expected outcomes, run tests one by-one or in batch, and get pass/fail results using five evaluation strategies. You keep full control over which LLM you call.

Built by [Fluxon][(https://www.fluxon.com/)](https://www.fluxon.com/]). We developed this to bring rigour and repeatability to how we test the AI we build for clients. Now it's open source.

[npm](https://www.npmjs.com/package/llm-testrunner-components) [License: MIT](https://opensource.org/licenses/MIT)

---

## Why use this

We built this because we needed a consistent way to evaluate LLM quality. Rather than rebuilding test infrastructure every time, we made it reusable.

- **Test faster** — Complete test-runner UI out of the box. Questions, expected outcomes, run one or run all, pass/fail, response times. No need to build evaluation logic or import/export from scratch.
- **Stay in control** — The library never calls an LLM. You handle one event: we send you the prompt. You call your API and pass back the response. Works with OpenAI, Gemini, Claude, or local model.
- **Match how you think** — Each expected-outcome field can use a different evaluation: exact keywords, semantic similarity (meaning), ROUGE (word overlap / sequence), or BLEU (n-gram precision). Choose per field.
- **Fit your stack** — Load test cases from your backend or a JSON file. Optionally persist runs with a Save button that emits the state for you to store wherever you’d like.

---

## What’s included

- **Test case table** — Add, edit, delete. Each test case has a question, configurable expected-outcome fields (single line, paragraph, keyword chips, dropdown), and a per-field evaluation approach (exact, semantic, ROUGE-1, ROUGE-L, BLEU).
- **Run one or run all** — Single test or batch with a configurable delay between API calls for rate limiting.
- **Live results** — Pass/fail, keyword match count (e.g. X/Y found), and response time per test.
- **Import / export** — Import a test suite from JSON. Export the current suite as JSON or export results as CSV.
- **Optional save** — A Save button emits the current test cases so your app can persist them to your backend.

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

**Step 2 — Use the component and connect your LLM.** The runner fires an `llmRequest` event whenever it needs a response. Call your API, then `resolve(responseText)` or `reject(error)`.

```tsx
import { useRef } from "react";
import { LlmTestRunner } from "llm-testrunner-components/react";

function App() {
  const runnerRef = useRef<any>(null);

  const handleLlmRequest = async (e) => {
    try {
      const response = await yourLLMApi(e.detail.prompt);
      e.detail.resolve(response);
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

Replace `yourLLMApi` and `yourSaveApi` with your real calls. If you don’t need persistence, omit `useSave`, `onSave`, and `ref` / `resetSavingState`.

---

## Get started (vanilla HTML)

Load the loader, define the custom elements, then listen for `llmRequest` and call `resolve` or `reject`.

```html
<llm-test-runner id="runner" delay-ms="500"></llm-test-runner>

<script type="module">
  import { defineCustomElements } from "https://unpkg.com/llm-testrunner-components@1/loader/index.js";
  defineCustomElements();

  const runner = document.getElementById("runner");
  runner.addEventListener("llmRequest", async (e) => {
    try {
      const response = await yourLLMFetch(e.detail.prompt);
      e.detail.resolve(response);
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
- `resolve(responseText)` — call this with the model’s reply (string)  
- `reject(error)` — call this if the request fails

How you get the response is up to you: REST, SDK, or local inference. Same pattern for any provider.

---

## Loading and saving test cases

**Loading** — Pass `initialTestCases` with an array of test cases from your backend or a file. You can use the full `TestCase` shape or just `question` and `expectedOutcome`. The runner will fill in `id` and run state.

**Saving** — Set `useSave={true}` to show the Save button. When clicked, the component emits a `save` event with `{ timestamp, testCases }`. Persist that however you’d like, then call `runnerRef.current.resetSavingState()` so the button leaves the loading state. A failsafe resets after 10 seconds if you don’t.

---

## Evaluation methods

Each expected-outcome field can use a different  method. All compare **expected** text against the **actual** LLM response. A test **passes only when every field** passes.


| Method       | Measures                      | Good for                            | Handles paraphrasing / synonyms | Speed                 |
| ------------ | ----------------------------- | ----------------------------------- | ------------------------------- | --------------------- |
| **Exact**    | Literal keyword in response   | Strict wording, facts, templates    | No                              | Fast                  |
| **ROUGE-1**  | Word overlap (unigram)        | Slight paraphrasing, same key words | Moderate                        | Fast                  |
| **ROUGE-L**  | Longest common subsequence    | When phrasing and word order matter | Moderate to high                | Slightly slower       |
| **Semantic** | Meaning (embeddings + cosine) | Different words, same meaning       | Yes                             | First run loads model |
| **BLEU**     | N-gram precision (1–4)        | Translation-like or n-gram overlap  | Moderate                        | Fast                  |


- Set **per expected-outcome field** via the dropdown in the UI, or via each field’s `evaluationParameters.approach` when you pass `initialTestCases`.
- **ROUGE, BLEU, and Semantic** use a fixed threshold (0.7).
- **Semantic** evaluation runs in-browser using [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2). The model downloads on first use; subsequent runs are faster.

---

## Expected outcome fields

Expected outcomes support multiple field types:


| Type          | Description                                    |
| ------------- | ---------------------------------------------- |
| `text`        | Single line                                    |
| `textarea`    | Multi-line                                     |
| `chips-input` | List of keywords (each compared in evaluation) |
| `select`      | Dropdown (value must be one of the options)    |


When you pass `initialTestCases`, use an array of objects with `type`, `label`, and `value` (and for `select`, `options`). For **new** test cases, the runner uses `defaultExpectedOutcomeSchema` if provided. Otherwise it defaults to a single textarea.

---

## API reference

### Props


| Prop                           | Attribute  | Type                    | Default     | Description                                         |
| ------------------------------ | ---------- | ----------------------- | ----------- | --------------------------------------------------- |
| `delayMs`                      | `delay-ms` | `number`                | `500`       | Delay (ms) between API calls when running all tests |
| `useSave`                      | `use-save` | `boolean`               | `false`     | Show Save button and emit `save` events             |
| `initialTestCases`             | —          | `TestCase[]`            | `undefined` | Preload test cases                                  |
| `defaultExpectedOutcomeSchema` | —          | `ExpectedOutcomeSchema` | built-in    | Schema for new test cases                           |


### Events


| Event        | Payload                       | Description                                                                        |
| ------------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| `llmRequest` | `{ prompt, resolve, reject }` | Runner needs an LLM response. Call `resolve(responseText)` or `reject(error)`      |
| `save`       | `{ timestamp, testCases }`    | User clicked Save (when `useSave` is true). Persist then call `resetSavingState()` |


### Methods


| Method               | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `resetSavingState()` | Call after persisting a save so the Save button leaves a loading state |


### Types

Import from `llm-testrunner-components/react/types`:

```ts
import type {
  TestCase,
  LLMRequestPayload,
  SavePayload,
  ExpectedOutcomeSchema,
  ExpectedOutcomeField,
  EvaluationParameters,
} from "llm-testrunner-components/react/types";
```

---

## Import and export

- **Import** — Load a JSON file via the UI. Must be an array of test cases. Invalid or empty files show an error.
- **Export test suite** — Downloads the current test cases as JSON.
- **Export results** — Downloads a CSV of the latest run, including evaluation scores.

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

---

## License

The project is licensed under the [MIT License](LICENSE).

Third-party licenses are in `node_modules/<package>/`. This project uses [licensee](https://github.com/jslicense/licensee.js) and the [Blue Oak Council](https://blueoakcouncil.org/list) permissive list. Only dependencies with a Blue Oak bronze-or-better license (or an exception in [.licensee.json](.licensee.json)) are allowed. Run `npm run license-check` to verify locally.

## About Fluxon

The Fluxon LLM TestRunner is maintained by [Fluxon.](https://www.fluxon.com/) We partner with companies like Google, Stripe and Walmart on the technology work that matters most. Senior builders who think with you, build alongside you, and treat your outcome as their own.
[See our work](https://www.fluxon.com/our-work) | [Get in touch.](https://www.fluxon.com/contact)