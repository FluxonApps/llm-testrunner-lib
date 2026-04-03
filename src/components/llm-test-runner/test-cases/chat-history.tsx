import {
  Component,
  Event,
  EventEmitter,
  Prop,
  State,
  h,
} from '@stencil/core';

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
  @Prop() initialEnabled = false;
  @Prop() initialValue = '';

  @State() private enabled: boolean;
  @State() private value: string;

  @Event({ bubbles: true, composed: true })
  chatHistoryChange: EventEmitter<ChatHistoryChangeDetail>;

  componentWillLoad() {
    this.enabled = this.initialEnabled;
    this.value = this.initialValue;
  }

  private emit() {
    this.chatHistoryChange.emit({
      enabled: this.enabled,
      value: this.value,
    });
  }

  private setEnabled = (next: boolean) => {
    this.enabled = next;
    this.emit();
  };

  private setValue = (next: string) => {
    this.value = next;
    this.emit();
  };

  render() {
    return (
      <div class="chat-history">
        <div class="chat-history__toggle-row">
          <label class="chat-history__switch">
            <input
              type="checkbox"
              class="chat-history__switch-input"
              checked={this.enabled}
              onInput={(e) =>
                this.setEnabled((e.target as HTMLInputElement).checked)
              }
            />
            <span class="chat-history__switch-ui" aria-hidden="true">
              <span class="chat-history__switch-thumb" />
            </span>
            <span class="chat-history__switch-text">Chat history</span>
          </label>
        </div>
        {this.enabled ? (
          <textarea
            class="chat-history__textarea"
            value={this.value}
            rows={4}
            placeholder='Paste chat messages as JSON (e.g. [{"role":"user","content":"..."}])...'
            aria-label="Chat history"
            onInput={(e) =>
              this.setValue((e.target as HTMLTextAreaElement).value)
            }
          />
        ) : null}
      </div>
    );
  }
}
