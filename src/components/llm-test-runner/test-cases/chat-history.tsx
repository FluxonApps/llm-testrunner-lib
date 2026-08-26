import { Component, Event, EventEmitter, Prop, State, h } from '@stencil/core';
import { Button } from '../../../lib/ui/button/index';
import { IconButton } from '../../../lib/ui/icon-button/index';
import { FileClockIcon, XIcon } from '../../../lib/ui/icons/icons';

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
  styleUrls: [
    'chat-history.css',
    '../../../lib/ui/button/button.css',
    '../../../lib/ui/icon-button/icon-button.css',
  ],
  shadow: true,
})
export class ChatHistory {
  @Prop({ reflect: true }) chatHistoryEnabled = false;
  @Prop() chatHistoryValue = '';

  @Event({ bubbles: true, composed: true })
  chatHistoryChange: EventEmitter<ChatHistoryChangeDetail>;

  /** Local draft — edits only take effect once the user clicks Save. */
  @State() isOpen = false;
  @State() draft = '';

  private openModal = () => {
    this.draft = this.chatHistoryValue;
    this.isOpen = true;
  };

  private closeModal = () => {
    this.isOpen = false;
  };

  private handleSave = () => {
    const value = this.draft;
    this.chatHistoryChange.emit({ enabled: value.trim().length > 0, value });
    this.isOpen = false;
  };

  private handleDraftInput = (e: Event) => {
    this.draft = (e.target as HTMLTextAreaElement).value;
  };

  private handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) this.closeModal();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.closeModal();
  };

  render() {
    return (
      <div class="chat-history">
        <button
          type="button"
          class={{
            'chat-history__trigger': true,
            'chat-history__trigger--active': this.chatHistoryEnabled,
          }}
          title="Chat history"
          aria-label="Chat history"
          aria-haspopup="dialog"
          aria-expanded={this.isOpen ? 'true' : 'false'}
          onClick={this.openModal}
        >
          <FileClockIcon class="chat-history__icon" />
        </button>

        {this.isOpen && (
          <div
            class="chat-history-modal__backdrop"
            onClick={this.handleBackdropClick}
            onKeyDown={this.handleKeyDown}
          >
            <div
              class="chat-history-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-history-modal-title"
            >
              <div class="chat-history-modal__header">
                <h2 id="chat-history-modal-title" class="chat-history-modal__title">
                  Add chat history
                </h2>
                <IconButton variant="outline" onClick={this.closeModal} title="Close">
                  <XIcon />
                </IconButton>
              </div>

              <p class="chat-history-modal__subtitle">
                Add chat history to improve accuracy of the response.
              </p>

              <div class="chat-history-modal__field">
                <label class="chat-history-modal__label" htmlFor="chat-history-modal-textarea">
                  Console
                </label>
                <textarea
                  id="chat-history-modal-textarea"
                  class="chat-history-modal__textarea"
                  rows={10}
                  placeholder={CHAT_HISTORY_PLACEHOLDER}
                  aria-label="Chat history JSON"
                  value={this.draft}
                  autoFocus
                  onInput={this.handleDraftInput}
                />
              </div>

              <div class="chat-history-modal__footer">
                <Button variant="outline" size="md" onClick={this.closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={this.handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
