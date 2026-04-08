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

function setPressed(buttons, activeId) {
  for (const btn of buttons) {
    btn.setAttribute('aria-pressed', btn.id === activeId ? 'true' : 'false');
  }
}

function initVanillaDemo() {
  const host = document.getElementById('runner-host');
  const btnDefault = document.getElementById('mode-default');
  const btnSchema = document.getElementById('mode-schema');
  const btnDynamic = document.getElementById('mode-dynamic');
  const buttons = [btnDefault, btnSchema, btnDynamic];

  function showMode(modeKey) {
    mountMode(host, modeKey);
  }

  btnDefault.addEventListener('click', () => {
    setPressed(buttons, 'mode-default');
    showMode('simpleTest');
  });
  btnSchema.addEventListener('click', () => {
    setPressed(buttons, 'mode-schema');
    showMode('multipleExpectedOutcomes');
  });
  btnDynamic.addEventListener('click', () => {
    setPressed(buttons, 'mode-dynamic');
    showMode('dynamicExpectedOutcome');
  });

  void (async () => {
    await customElements.whenDefined('llm-test-runner');
    showMode('simpleTest');
    setPressed(buttons, 'mode-default');
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVanillaDemo);
} else {
  initVanillaDemo();
}
