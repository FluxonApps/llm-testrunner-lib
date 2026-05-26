import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { newSpecPage } from '@stencil/core/testing';
import { ChatHistory, type ChatHistoryChangeDetail } from './chat-history';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

type ChatHistoryHost = HTMLElement & {
  chatHistoryEnabled: boolean;
  chatHistoryValue: string;
};

function attachControlledParent(page: SpecPage): void {
  page.root.addEventListener('chatHistoryChange', (e: Event) => {
    const { enabled, value } = (e as CustomEvent<ChatHistoryChangeDetail>)
      .detail;
    const host = page.root as ChatHistoryHost;
    host.chatHistoryEnabled = enabled;
    host.chatHistoryValue = value;
  });
}

/**
 * Native <details> doesn't fire `toggle` from a programmatic `.open = ...`
 * change in jsdom; we trigger it explicitly so the component's onToggle
 * handler observes the new state, just as it would in a real browser.
 */
async function openChatHistoryAsUser(page: SpecPage): Promise<void> {
  attachControlledParent(page);
  const details = page.root.shadowRoot!.querySelector(
    'details',
  ) as HTMLDetailsElement;
  details.open = true;
  details.dispatchEvent(new Event('toggle', { bubbles: true }));
  await page.waitForChanges();
}

function getTextareaValue(textarea: HTMLTextAreaElement): string {
  const v = textarea.value;
  if (v !== undefined && v !== null) {
    return v;
  }
  return textarea.getAttribute('value') ?? '';
}

// Stencil's spec DOM doesn't reflect the `open` property on <details> the
// way real browsers do. Read the attribute (set by the JSX `open={...}`
// binding) instead.
function isDetailsOpen(details: HTMLDetailsElement): boolean {
  if (typeof details.open === 'boolean') return details.open;
  return details.hasAttribute('open');
}

describe('ChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders open with textarea value from props when enabled', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history chat-history-enabled chat-history-value="[imported]"></chat-history>',
    });

    await page.waitForChanges();

    const details = page.root.shadowRoot.querySelector(
      'details',
    ) as HTMLDetailsElement;
    expect(isDetailsOpen(details)).toBe(true);

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(getTextareaValue(textarea)).toBe('[imported]');
  });

  it('renders collapsed (open=false) by default', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    const details = page.root.shadowRoot.querySelector(
      'details',
    ) as HTMLDetailsElement;
    expect(isDetailsOpen(details)).toBe(false);
  });

  it('shows the summary label and chat icon at all times', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    const summary = page.root.shadowRoot.querySelector(
      '.chat-history__summary',
    );
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Chat history');
    expect(
      page.root.shadowRoot.querySelector('.chat-history__icon'),
    ).not.toBeNull();
  });

  it('opens to reveal the textarea after the user expands the disclosure', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    await openChatHistoryAsUser(page);

    expect(
      page.root.shadowRoot.querySelector('.chat-history__textarea'),
    ).not.toBeNull();
  });

  it('emits chatHistoryChange with enabled=true when the user expands', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    const details = page.root.shadowRoot.querySelector(
      'details',
    ) as HTMLDetailsElement;
    details.open = true;
    details.dispatchEvent(new Event('toggle', { bubbles: true }));
    await page.waitForChanges();

    expect(spy).toHaveBeenCalledWith({ enabled: true, value: '' });
  });

  it('emits chatHistoryChange when the user types in the textarea', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    await openChatHistoryAsUser(page);

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

  it('preserves typed value across collapse/expand toggles', async () => {
    const page = await newSpecPage({
      components: [ChatHistory],
      html: '<chat-history></chat-history>',
    });

    await openChatHistoryAsUser(page);

    const textarea = page.root.shadowRoot.querySelector(
      '.chat-history__textarea',
    ) as HTMLTextAreaElement;
    textarea.value = 'keep me';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await page.waitForChanges();

    const spy = jest.fn();
    page.root.addEventListener('chatHistoryChange', (e: Event) =>
      spy((e as CustomEvent<ChatHistoryChangeDetail>).detail),
    );

    // User collapses — emit enabled=false but value is preserved.
    const details = page.root.shadowRoot.querySelector(
      'details',
    ) as HTMLDetailsElement;
    details.open = false;
    details.dispatchEvent(new Event('toggle', { bubbles: true }));
    await page.waitForChanges();

    expect(spy).toHaveBeenCalledWith({ enabled: false, value: 'keep me' });
  });
});
