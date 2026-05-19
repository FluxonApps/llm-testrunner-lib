import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { newSpecPage } from '@stencil/core/testing';
import { CopyButton } from './copy-button';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

function getButton(page: SpecPage): HTMLButtonElement {
  return page.root!.shadowRoot!.querySelector('.copy-button') as HTMLButtonElement;
}

function getCheckIcon(page: SpecPage): SVGPolylineElement | null {
  return page.root!.shadowRoot!.querySelector(
    '.copy-button polyline',
  ) as SVGPolylineElement | null;
}

function getCopyIcon(page: SpecPage): SVGRectElement | null {
  return page.root!.shadowRoot!.querySelector(
    '.copy-button rect',
  ) as SVGRectElement | null;
}

function isDisabled(button: HTMLButtonElement): boolean {
  return button.hasAttribute('disabled');
}

/**
 * Click + wait for the async click handler's awaited promises AND the
 * subsequent re-render to settle.
 */
async function clickAndSettle(
  page: SpecPage,
  button: HTMLButtonElement,
): Promise<void> {
  button.click();
  await Promise.resolve();
  await Promise.resolve();
  await page.waitForChanges();
}

const writeTextMock = jest.fn<(value: string) => Promise<void>>();

function setClipboardImpl(
  impl: (value: string) => Promise<void> = () => Promise.resolve(),
): void {
  writeTextMock.mockReset();
  writeTextMock.mockImplementation(impl);
}

let originalNavigatorDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  setClipboardImpl();
  originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator');
  Object.defineProperty(global as any, 'navigator', {
    configurable: true,
    writable: true,
    value: { clipboard: { writeText: writeTextMock } },
  });
});

afterEach(() => {
  jest.clearAllTimers();
  if (originalNavigatorDescriptor) {
    Object.defineProperty(global as any, 'navigator', originalNavigatorDescriptor);
  } else {
    delete (global as { navigator?: unknown }).navigator;
  }
});

describe('CopyButton', () => {
  it('renders the copy icon and is enabled when a value is provided', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="hello"></copy-button>',
    });

    const button = getButton(page);
    expect(button).not.toBeNull();
    expect(isDisabled(button)).toBe(false);
    expect(getCopyIcon(page)).not.toBeNull();
    expect(getCheckIcon(page)).toBeNull();
  });

  it('is disabled when the value is empty', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value=""></copy-button>',
    });

    expect(isDisabled(getButton(page))).toBe(true);
  });

  it('is disabled when no value attribute is provided', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button></copy-button>',
    });

    expect(isDisabled(getButton(page))).toBe(true);
  });

  it('writes the value to the clipboard on click', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="payload"></copy-button>',
    });

    await clickAndSettle(page, getButton(page));

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith('payload');
  });

  it('flips to the green tick and disables itself after a successful copy', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="payload"></copy-button>',
    });

    await clickAndSettle(page, getButton(page));

    const button = getButton(page);
    expect(isDisabled(button)).toBe(true);
    expect(button.className).toContain('copy-button--copied');
    expect(getCheckIcon(page)).not.toBeNull();
    expect(getCopyIcon(page)).toBeNull();
    expect(button.getAttribute('title')).toBe('Copied');
  });

  it('resets to the copy icon after the configured timeout', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="payload" reset-ms="20"></copy-button>',
    });

    await clickAndSettle(page, getButton(page));
    expect(getButton(page).className).toContain('copy-button--copied');
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
    await page.waitForChanges();

    const button = getButton(page);
    expect(button.className).not.toContain('copy-button--copied');
    expect(isDisabled(button)).toBe(false);
    expect(getCopyIcon(page)).not.toBeNull();
    expect(getCheckIcon(page)).toBeNull();
  });

  it('does not copy again while in the copied state', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="payload"></copy-button>',
    });

    await clickAndSettle(page, getButton(page));
    await clickAndSettle(page, getButton(page));
    await clickAndSettle(page, getButton(page));

    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  it('does not enter the copied state when the clipboard write fails', async () => {
    setClipboardImpl(() => Promise.reject(new Error('blocked')));

    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="payload"></copy-button>',
    });

    await clickAndSettle(page, getButton(page));

    const button = getButton(page);
    expect(button.className).not.toContain('copy-button--copied');
    expect(isDisabled(button)).toBe(false);
    expect(getCopyIcon(page)).not.toBeNull();
  });

  it('uses the provided label as the idle tooltip', async () => {
    const page = await newSpecPage({
      components: [CopyButton],
      html: '<copy-button value="payload" label="Copy response"></copy-button>',
    });

    const button = getButton(page);
    expect(button.getAttribute('title')).toBe('Copy response');
    expect(button.getAttribute('aria-label')).toBe('Copy response');
  });
});
