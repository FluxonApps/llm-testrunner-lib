import { DEMO_MODES } from './demo-modes.js';

function wireGemini(runner) {
  const llm = new window.GeminiAdapter(window.env.API_KEY);
  runner.addEventListener('llmRequest', async (event) => {
    try {
      const response = await llm.invoke(event.detail.prompt);
      event.detail.resolve({ text: response });
    } catch (err) {
      event.detail.reject(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  });
}

/**
 * Strips ```json ... ``` (or plain ```) fences a model often wraps JSON in.
 * Used in the demo because Gemini responses sometimes include them despite
 * the prompt's "no markdown" rule.
 */
function stripJsonFence(raw) {
  const trimmed = String(raw).trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

/**
 * Wires the `<llm-test-runner llmJudge>` prop to Gemini. The library passes
 * a `{messages: [{role, content}, …]}` payload — we flatten to a single
 * prompt (Gemini's `invoke` takes one string), parse the JSON response, and
 * return the `JudgeResponse` shape the library expects.
 */
function wireGeminiJudge(runner) {
  const llm = new window.GeminiAdapter(window.env.API_KEY);
  runner.llmJudge = async ({ messages }) => {
    const prompt = messages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join('\n\n');
    const raw = await llm.invoke(prompt);
    return JSON.parse(stripJsonFence(raw));
  };
}

function mountMode(host, modeKey) {
  const config = DEMO_MODES[modeKey];
  host.replaceChildren();
  const runner = document.createElement('llm-test-runner');
  runner.delayMs = 1000;
  runner.initialTestCases = config.initialTestCases;
  if (config.defaultExpectedOutcomeSchema) {
    runner.defaultExpectedOutcomeSchema = config.defaultExpectedOutcomeSchema;
  }
  if (config.resolveExpectedOutcome) {
    runner.resolveExpectedOutcome = config.resolveExpectedOutcome;
  }
  host.appendChild(runner);
  wireGemini(runner);
  wireGeminiJudge(runner);
}

function initVanillaDemo() {
  const host = document.getElementById('runner-host');
  const modeSelect = document.getElementById('demo-example-mode');

  function showMode(modeKey) {
    mountMode(host, modeKey);
  }

  modeSelect.addEventListener('change', () => {
    showMode(modeSelect.value);
  });

  void (async () => {
    await customElements.whenDefined('llm-test-runner');
    modeSelect.value = 'simpleTest';
    showMode('simpleTest');
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVanillaDemo);
} else {
  initVanillaDemo();
}
