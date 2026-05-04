import { jest, describe, it, expect } from '@jest/globals';
import { newSpecPage } from '@stencil/core/testing';
import { ThresholdInput, type ThresholdInputChangeDetail } from './threshold-input';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

function getInput(page: SpecPage): HTMLInputElement {
  return page.root!.shadowRoot!.querySelector(
    '.threshold-input__input',
  ) as HTMLInputElement;
}

function getMessage(page: SpecPage): HTMLElement | null {
  return page.root!.shadowRoot!.querySelector(
    '.threshold-input__message',
  ) as HTMLElement | null;
}

function hasErrorClass(page: SpecPage): boolean {
  return getInput(page).className.includes('threshold-input__input--invalid');
}

function hasWarningClass(page: SpecPage): boolean {
  return getInput(page).className.includes('threshold-input__input--warning');
}

async function type(page: SpecPage, raw: string): Promise<void> {
  const input = getInput(page);
  input.value = raw;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await page.waitForChanges();
}

function attachChangeSpy(
  page: SpecPage,
): jest.Mock<(e: CustomEvent<ThresholdInputChangeDetail>) => void> {
  const spy = jest.fn<(e: CustomEvent<ThresholdInputChangeDetail>) => void>();
  page.root!.addEventListener('thresholdChange', (e: Event) =>
    spy(e as CustomEvent<ThresholdInputChangeDetail>),
  );
  return spy;
}

describe('ThresholdInput — basic rendering', () => {
  it('renders the parent-provided defaultValue when no value is set', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input default-value="0.7"></threshold-input>',
    });

    expect(getInput(page).getAttribute('value')).toBe('0.7');
    expect(getMessage(page)).toBeNull();
  });

  it('renders empty when neither value nor defaultValue is provided', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });

    expect(getInput(page).getAttribute('value')).toBe('');
    expect(getMessage(page)).toBeNull();
  });

  it('honours a custom per-approach defaultValue', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input default-value="0.4"></threshold-input>',
    });

    expect(getInput(page).getAttribute('value')).toBe('0.4');
  });

  it('renders the initial value', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.85"></threshold-input>',
    });

    expect(getInput(page).getAttribute('value')).toBe('0.85');
    expect(getMessage(page)).toBeNull();
  });

  it('renders with a custom label', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input label="Pass score"></threshold-input>',
    });

    const label = page.root!.shadowRoot!.querySelector(
      '.threshold-input__label',
    );
    expect(label!.textContent).toBe('Pass score');
  });
});

describe('ThresholdInput — typed input', () => {
  it('emits change for a valid in-range value', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '0.75');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe(0.75);
    expect(getMessage(page)).toBeNull();
  });

  it('shows an error and does not emit when the value is greater than 1', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '1.5');

    expect(spy).not.toHaveBeenCalled();
    const msg = getMessage(page);
    expect(msg).not.toBeNull();
    expect(msg!.textContent).toContain('between 0 and 1');
    expect(hasErrorClass(page)).toBe(true);
    expect(getInput(page).getAttribute('aria-invalid')).toBe('true');
  });

  it('shows an error and does not emit when the value is less than 0', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '-0.2');

    expect(spy).not.toHaveBeenCalled();
    expect(getMessage(page)).not.toBeNull();
    expect(hasErrorClass(page)).toBe(true);
  });

  it('emits undefined when the input is cleared', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.7"></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBeUndefined();
    expect(getMessage(page)).toBeNull();
  });

  it('recovers from the error state once the value returns to valid range', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '2');
    expect(getMessage(page)).not.toBeNull();
    expect(spy).not.toHaveBeenCalled();

    await type(page, '0.4');
    expect(getMessage(page)).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe(0.4);
    expect(getInput(page).getAttribute('aria-invalid')).toBe('false');
  });

  it('rounds emitted values to the configured precision (default 4)', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '0.123456789');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe(0.1235);
  });

  it('honours a custom precision prop', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input precision="2"></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '0.789');

    expect(spy.mock.calls[0][0].detail.value).toBe(0.79);
  });

  it('flags non-numeric input as invalid', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, 'abc');

    expect(spy).not.toHaveBeenCalled();
    expect(hasErrorClass(page)).toBe(true);
  });

  it('accepts the boundary values 0 and 1 as valid', async () => {
    // Guards the off-by-one risk: validation is `n < min || n > max`, so
    // both endpoints must remain valid. If someone tightens this to `<=`
    // / `>=`, this test catches it.
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '0');
    expect(hasErrorClass(page)).toBe(false);
    expect(getMessage(page)).toBeNull();
    expect(spy.mock.calls.at(-1)![0].detail.value).toBe(0);

    await type(page, '1');
    expect(hasErrorClass(page)).toBe(false);
    expect(getMessage(page)).toBeNull();
    expect(spy.mock.calls.at(-1)![0].detail.value).toBe(1);
  });

  // The "approach switch picks up a new defaultValue" behavior is handled
  // by the renderer keying the threshold-input on approach (see
  // expected-outcome-renderer.tsx) — a fresh component instance mounts,
  // so there is no in-component watcher to test here.

  it('updates the draft when the parent changes the value prop', async () => {
    // Covers @Watch('value'). The parent (e.g. test-case state) is the
    // source of truth — when it changes externally, the input must reflect
    // the new value.
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.3"></threshold-input>',
    });
    expect(getInput(page).getAttribute('value')).toBe('0.3');

    page.rootInstance!.value = 0.9;
    await page.waitForChanges();

    expect(getInput(page).getAttribute('value')).toBe('0.9');
    expect(hasErrorClass(page)).toBe(false);
  });
});

describe('ThresholdInput — validate on mount (JSON import case)', () => {
  it('surfaces an error immediately when an out-of-range value is supplied as a prop', async () => {
    // Simulates an imported test suite that contained `threshold: 1.5`.
    // No user interaction yet — the error should be visible on first paint.
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="1.5"></threshold-input>',
    });

    expect(hasErrorClass(page)).toBe(true);
    const msg = getMessage(page);
    expect(msg).not.toBeNull();
    expect(msg!.textContent).toContain('between 0 and 1');
  });

  it('does not show an error for an in-range mounted value', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.6"></threshold-input>',
    });

    expect(hasErrorClass(page)).toBe(false);
    expect(getMessage(page)).toBeNull();
  });
});

describe('ThresholdInput — resolveInvalid()', () => {
  it('clears the draft, downgrades error → warning, and emits undefined', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input default-value="0.7"></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    // User typing puts the input into the error state.
    await type(page, '1.5');
    expect(hasErrorClass(page)).toBe(true);
    spy.mockClear();

    const resolved = await (page.rootInstance as ThresholdInput).resolveInvalid();
    await page.waitForChanges();

    expect(resolved).toBe(true);
    expect(getInput(page).getAttribute('value')).toBe('0.7');
    expect(hasErrorClass(page)).toBe(false);
    expect(hasWarningClass(page)).toBe(true);
    const msg = getMessage(page);
    expect(msg).not.toBeNull();
    expect(msg!.textContent).toContain('default');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBeUndefined();
  });

  it('reverts to a per-approach defaultValue on resolve', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input default-value="0.4"></threshold-input>',
    });

    await type(page, '1.5');
    await (page.rootInstance as ThresholdInput).resolveInvalid();
    await page.waitForChanges();

    expect(getInput(page).getAttribute('value')).toBe('0.4');
    expect(hasWarningClass(page)).toBe(true);
  });

  it('is a no-op when the input is already valid', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.7"></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    const resolved = await (page.rootInstance as ThresholdInput).resolveInvalid();
    await page.waitForChanges();

    expect(resolved).toBe(false);
    expect(getInput(page).getAttribute('value')).toBe('0.7');
    expect(getMessage(page)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the warning once the user types a valid value again', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });

    await type(page, '1.5');
    await (page.rootInstance as ThresholdInput).resolveInvalid();
    await page.waitForChanges();
    expect(hasWarningClass(page)).toBe(true);

    await type(page, '0.5');
    expect(hasWarningClass(page)).toBe(false);
    expect(hasErrorClass(page)).toBe(false);
    expect(getMessage(page)).toBeNull();
  });

  it('resolves an out-of-range mounted value (JSON import path)', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="2"></threshold-input>',
    });
    const spy = attachChangeSpy(page);
    expect(hasErrorClass(page)).toBe(true);

    const resolved = await (page.rootInstance as ThresholdInput).resolveInvalid();
    await page.waitForChanges();

    expect(resolved).toBe(true);
    expect(hasWarningClass(page)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBeUndefined();
  });

  it('is idempotent — a second resolveInvalid does nothing while in warning state', async () => {
    // Run-All bulk-resolves once, then runSingleTest on each row may try
    // again. The second call must be a cheap no-op.
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '1.5');
    spy.mockClear();

    const first = await (page.rootInstance as ThresholdInput).resolveInvalid();
    const second = await (page.rootInstance as ThresholdInput).resolveInvalid();
    await page.waitForChanges();

    expect(first).toBe(true);
    expect(second).toBe(false);
    // Only the first call emits; the second sees `messageLevel === 'warning'`
    // and returns early.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(hasWarningClass(page)).toBe(true);
  });
});
