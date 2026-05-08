import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';

const CHAT_HISTORY_PLACEHOLDER = `[
  {"role": "user", "content": "How do I import a saved suite?"},
  {"role": "model", "content": "Use Import and pick the JSON from Export suite."}
]`;

export type ChatHistoryChangeDetail = {
  enabled: boolean;
  value: string;
};

@Component({
  tag: 'chat-history',
  styleUrl: 'chat-history.css',
  shadow: true,
})
export class ChatHistory {
  @Prop() chatHistoryEnabled = false;
  @Prop() chatHistoryValue = '';

  @Event({ bubbles: true, composed: true })
  chatHistoryChange: EventEmitter<ChatHistoryChangeDetail>;

  private emit(detail: ChatHistoryChangeDetail) {
    this.chatHistoryChange.emit(detail);
  }

  /**
   * Native <details> fires `toggle` whenever its open state changes — both
   * via user click on the summary AND from programmatic / prop-driven sync.
   * We treat "open" as the source of truth for `enabled` and preserve the
   * textarea value across collapses, so the user can quickly hide chat
   * history without losing what they typed.
   */
  private onToggle = (e: Event) => {
    const open = (e.target as HTMLDetailsElement).open;
    if (open !== this.chatHistoryEnabled) {
      this.emit({ enabled: open, value: this.chatHistoryValue });
    }
  };

  private onTextInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    this.emit({ enabled: this.chatHistoryEnabled, value });
  };

  render() {
    return (
      <details
        class="chat-history"
        open={this.chatHistoryEnabled}
        onToggle={this.onToggle}
      >
        <summary class="chat-history__summary">
          <svg
            class="chat-history__icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span class="chat-history__label">Chat history</span>
        </summary>
        <div class="chat-history__content">
          <textarea
            class="chat-history__textarea"
            value={this.chatHistoryValue}
            rows={6}
            placeholder={CHAT_HISTORY_PLACEHOLDER}
            aria-label="Chat history"
            onInput={this.onTextInput}
          />
        </div>
      </details>
    );
  }
}
