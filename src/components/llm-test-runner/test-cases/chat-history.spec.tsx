import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { newSpecPage } from '@stencil/core/testing';
import { ChatHistory, type ChatHistoryChangeDetail } from './chat-history';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

function attachControlledParent(page: SpecPage): void {
  page.root.addEventListener('chatHistoryChange', (e: Event) => {
    const { enabled, value } = (e as CustomEvent<ChatHistoryChangeDetail>)
      .detail;
    const host = page.root as HTMLChatHistoryElement;
    host.chatHistoryEnabled = enabled;
    host.chatHistoryValue = value;
  });
}

async function enableChatHistoryAsUser(page: SpecPage): Promise<void> {
  attachControlledParent(page);
  const toggle = page.root.shadowRoot!.querySelector(
    '.chat-history__switch-input',
  ) as HTMLInputElement;
  setCheckboxChecked(toggle, true);
  await page.waitForChanges();
}

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

  it('shows toggle on and textarea value from props', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history chat-history-enabled chat-history-value="[imported]"></chat-history>',
    });

    await page.waitForChanges();

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(getTextareaValue(textarea)).toBe('[imported]');
    const toggle = page.root.shadowRoot.querySelector(
      '.chat-history__switch-input',
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('does not render the textarea when disabled', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    expect(page.root.shadowRoot.querySelector('.chat-history__textarea')).toBeNull();
  });

  it('renders the textarea only after the parent sets enabled (user toggle + prop sync)', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    await enableChatHistoryAsUser(page);

    expect(
      page.root.shadowRoot.querySelector('.chat-history__textarea'),
    ).not.toBeNull();
  });

  it('keeps typed value in the textarea while enabled', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    await enableChatHistoryAsUser(page);

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'paste-json-here';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    expect(getTextareaValue(textarea)).toBe('paste-json-here');
  });

  it('emits chatHistoryChange when the switch is toggled on', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
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
      html: '<chat-history></chat-history>',
    });

    await enableChatHistoryAsUser(page);

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
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
      html: '<chat-history></chat-history>',
    });

    await enableChatHistoryAsUser(page);

    const toggle = page.root.shadowRoot.querySelector(
      '.chat-history__switch-input',
    ) as HTMLInputElement;

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'keep';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );
    spy.mockClear();

    setCheckboxChecked(toggle, false);
    await page.waitForChanges();

    expect(page.root.shadowRoot.querySelector('.chat-history__textarea')).toBeNull();
    expect(spy).toHaveBeenCalledWith({ enabled: false, value: 'keep' });
  });
});
