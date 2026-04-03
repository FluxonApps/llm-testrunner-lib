import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { newSpecPage } from '@stencil/core/testing';
import { ChatHistory } from './chat-history';

function getTextareaValue(textarea: HTMLTextAreaElement): string {
  const v = textarea.value;
  if (v !== undefined && v !== null) {
    return v;
  }
  return textarea.getAttribute('value') ?? '';
}

function setCheckboxChecked(input: HTMLInputElement, checked: boolean): void {
  input.checked = checked;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the textarea when disabled', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    expect(page.root.shadowRoot.querySelector('.chat-history__textarea')).toBeNull();
  });

  it('renders the textarea when initialEnabled is true', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history initial-enabled></chat-history>',
    });

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
  });

  it('reflects initialValue in the textarea when enabled', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history initial-enabled initial-value="paste-json-here"></chat-history>',
    });

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    expect(getTextareaValue(textarea)).toBe('paste-json-here');
  });

  it('emits chatHistoryChange when the switch is toggled on', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<{ enabled: boolean; value: string }>).detail),
    );

    const input = page.root.shadowRoot.querySelector(
      '.chat-history__switch-input',
    ) as HTMLInputElement;
    setCheckboxChecked(input, true);
    await page.waitForChanges();

    expect(spy).toHaveBeenCalledWith({ enabled: true, value: '' });
  });

  it('emits chatHistoryChange when the user types in the textarea', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history initial-enabled></chat-history>',
    });

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<{ enabled: boolean; value: string }>).detail),
    );
    spy.mockClear();

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'hello';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    expect(spy).toHaveBeenCalledWith({ enabled: true, value: 'hello' });
  });

  it('hides the textarea after toggling off and emits disabled state', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history initial-enabled initial-value="keep"></chat-history>',
    });

    expect(page.root.shadowRoot.querySelector('.chat-history__textarea')).not.toBeNull();

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<{ enabled: boolean; value: string }>).detail),
    );
    spy.mockClear();

    const toggle = page.root.shadowRoot.querySelector(
      '.chat-history__switch-input',
    ) as HTMLInputElement;
    setCheckboxChecked(toggle, false);
    await page.waitForChanges();

    expect(page.root.shadowRoot.querySelector('.chat-history__textarea')).toBeNull();
    expect(spy).toHaveBeenCalledWith({ enabled: false, value: 'keep' });
  });
});
