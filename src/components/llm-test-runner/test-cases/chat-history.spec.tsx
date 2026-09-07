import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { newSpecPage } from '@stencil/core/testing';
import { ChatHistory, type ChatHistoryChangeDetail } from './chat-history';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

function getTrigger(page: SpecPage): HTMLButtonElement {
  return page.root.shadowRoot.querySelector(
    '.chat-history__trigger',
  ) as HTMLButtonElement;
}

function getTextarea(page: SpecPage): HTMLTextAreaElement | null {
  return page.root.shadowRoot.querySelector(
    '.chat-history-modal__textarea',
  ) as HTMLTextAreaElement | null;
}

function getBackdrop(page: SpecPage): HTMLElement | null {
  return page.root.shadowRoot.querySelector(
    '.chat-history-modal__backdrop',
  ) as HTMLElement | null;
}

async function openModal(page: SpecPage): Promise<void> {
  getTrigger(page).click();
  await page.waitForChanges();
}

function getTextareaValue(textarea: HTMLTextAreaElement): string {
  const v = textarea.value;
  if (v !== undefined && v !== null) {
    return v;
  }
  return textarea.getAttribute('value') ?? '';
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickButtonWithText(page: SpecPage, text: string): void {
  const buttons = Array.from(
    page.root.shadowRoot.querySelectorAll('.chat-history-modal__footer button'),
  ) as HTMLButtonElement[];
  const button = buttons.find(b => b.textContent?.trim() === text);
  button?.click();
}

describe('ChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a collapsed icon-only trigger with no modal open by default', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    expect(getTrigger(page)).not.toBeNull();
    expect(getBackdrop(page)).toBeNull();
  });

  it('opens the modal with the current value when the trigger is clicked', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history chat-history-value="[imported]"></chat-history>',
    });

    await openModal(page);

    expect(getBackdrop(page)).not.toBeNull();
    const textarea = getTextarea(page);
    expect(textarea).not.toBeNull();
    expect(getTextareaValue(textarea!)).toBe('[imported]');
  });

  it('does not emit chatHistoryChange while typing — only on Save', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });
    await openModal(page);

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    setTextareaValue(getTextarea(page)!, 'hello');
    await page.waitForChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('emits chatHistoryChange with enabled=true and closes the modal on Save', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });
    await openModal(page);

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    setTextareaValue(getTextarea(page)!, 'hello');
    clickButtonWithText(page, 'Save');
    await page.waitForChanges();

    expect(spy).toHaveBeenCalledWith({ enabled: true, value: 'hello' });
    expect(getBackdrop(page)).toBeNull();
  });

  it('emits enabled=false when saving an empty value', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history chat-history-enabled chat-history-value="keep me"></chat-history>',
    });
    await openModal(page);

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    setTextareaValue(getTextarea(page)!, '   ');
    clickButtonWithText(page, 'Save');
    await page.waitForChanges();

    expect(spy).toHaveBeenCalledWith({ enabled: false, value: '   ' });
  });

  it('discards the draft and does not emit an event on Cancel', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history chat-history-value="saved"></chat-history>',
    });
    await openModal(page);

    setTextareaValue(getTextarea(page)!, 'unsaved edit');

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    clickButtonWithText(page, 'Cancel');
    await page.waitForChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(getBackdrop(page)).toBeNull();

    // Reopening shows the original saved value, not the discarded edit.
    await openModal(page);
    expect(getTextareaValue(getTextarea(page)!)).toBe('saved');
  });

  it('closes without saving when the close (X) button is clicked', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });
    await openModal(page);

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    const closeButton = page.root.shadowRoot.querySelector(
      '.chat-history-modal__header button',
    ) as HTMLButtonElement;
    closeButton.click();
    await page.waitForChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(getBackdrop(page)).toBeNull();
  });

  it('closes without saving when Escape is pressed', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });
    await openModal(page);

    getBackdrop(page)!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await page.waitForChanges();

    expect(getBackdrop(page)).toBeNull();
  });

  it('closes without saving when the backdrop is clicked directly', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });
    await openModal(page);

    const backdrop = getBackdrop(page)!;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await page.waitForChanges();

    expect(getBackdrop(page)).toBeNull();
  });
});
