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

  it('emits AND shows the error when the value is out of range (numeric)', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '1.5');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe(1.5);
    expect(hasErrorClass(page)).toBe(true);
    const msg = getMessage(page);
    expect(msg).not.toBeNull();
    expect(msg!.textContent).toContain('between 0 and 1');
    expect(getInput(page).getAttribute('aria-invalid')).toBe('true');
  });

  it('emits AND shows the error for negative numeric values', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '-0.2');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe(-0.2);
    expect(hasErrorClass(page)).toBe(true);
  });

  it('does NOT emit for non-numeric input — UI-only error', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, 'abc');

    expect(spy).not.toHaveBeenCalled();
    expect(hasErrorClass(page)).toBe(true);
    expect(getMessage(page)!.textContent).toContain('Must be a number');
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
    expect(spy).toHaveBeenCalledTimes(1); // 2 IS emitted (numeric out-of-range)

    await type(page, '0.4');
    expect(getMessage(page)).toBeNull();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls.at(-1)![0].detail.value).toBe(0.4);
    expect(getInput(page).getAttribute('aria-invalid')).toBe('false');
  });

  it('truncates and emits when an over-precise value is mounted (JSON import)', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.123456789"></threshold-input>',
    });
    const spy = attachChangeSpy(page);
    await page.waitForChanges();

    expect(getInput(page).getAttribute('value')).toBe('0.1234');
    page.rootInstance!.value = 0.1234;
    await page.waitForChanges();
    expect(spy).not.toHaveBeenCalled();
  });

  it('strips scientific-notation chars (e / E / +) — they have no meaning for a 0–1 threshold', async () => {
    // <input type="number"> permits these for exponential notation, but
    // a threshold can't usefully be 1e3. Strip at the input boundary so
    // they don't survive in the draft, the DOM, or the persisted value.
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });

    await type(page, '0.5e2');

    expect(getInput(page).getAttribute('value')).toBe('0.52');
  });

  it('caps the input draft at 4 decimal places — extra digits are dropped', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '0.123456789');

    expect(getInput(page).getAttribute('value')).toBe('0.1234');
    expect(spy.mock.calls.at(-1)![0].detail.value).toBe(0.1234);
  });

  it('accepts the boundary values 0 and 1 as valid', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input></threshold-input>',
    });
    const spy = attachChangeSpy(page);

    await type(page, '0');
    expect(hasErrorClass(page)).toBe(false);
    expect(spy.mock.calls.at(-1)![0].detail.value).toBe(0);

    await type(page, '1');
    expect(hasErrorClass(page)).toBe(false);
    expect(spy.mock.calls.at(-1)![0].detail.value).toBe(1);
  });

  it('refreshes the draft when defaultValue changes (approach switch, no remount)', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input default-value="0.7"></threshold-input>',
    });
    expect(getInput(page).getAttribute('value')).toBe('0.7');

    page.rootInstance!.defaultValue = 0.4;
    await page.waitForChanges();

    expect(getInput(page).getAttribute('value')).toBe('0.4');
    expect(hasErrorClass(page)).toBe(false);
  });

  it('does NOT clobber an explicit user value on approach switch', async () => {
    const page = await newSpecPage({
      components: [ThresholdInput],
      html: '<threshold-input value="0.85" default-value="0.7"></threshold-input>',
    });
    expect(getInput(page).getAttribute('value')).toBe('0.85');

    page.rootInstance!.defaultValue = 0.4;
    await page.waitForChanges();

    expect(getInput(page).getAttribute('value')).toBe('0.85');
  });

  it('updates the draft when the parent changes the value prop', async () => {
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
