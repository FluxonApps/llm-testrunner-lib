import { DEMO_MODES } from './demo-modes.js';

function wireGemini(runner) {
  const llm = new window.GeminiAdapter(window.env.API_KEY);
  runner.addEventListener('llmRequest', async (event) => {
    try {
      const response = await llm.invoke(event.detail.prompt);
      event.detail.resolve(response);
    } catch (err) {
      event.detail.reject(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  });
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
