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

  private onToggle = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    this.emit({ enabled: checked, value: this.chatHistoryValue });
  };

  private onTextInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    this.emit({ enabled: this.chatHistoryEnabled, value });
  };

  render() {
    return (
      <div class="chat-history">
        <div class="chat-history__toggle-row">
          <label class="chat-history__switch">
            <input
              type="checkbox"
              class="chat-history__switch-input"
              checked={this.chatHistoryEnabled}
              onInput={this.onToggle}
            />
            <span class="chat-history__switch-ui" aria-hidden="true">
              <span class="chat-history__switch-thumb" />
            </span>
            <span class="chat-history__switch-text">Chat history</span>
          </label>
        </div>
        {this.chatHistoryEnabled ? (
          <textarea
            class="chat-history__textarea"
            value={this.chatHistoryValue}
            rows={8}
            placeholder={CHAT_HISTORY_PLACEHOLDER}
            aria-label="Chat history"
            onInput={this.onTextInput}
          />
        ) : null}
      </div>
    );
  }
}
