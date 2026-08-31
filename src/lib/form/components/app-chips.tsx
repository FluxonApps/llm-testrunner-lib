import { Component, Prop, State, h, Event, EventEmitter } from '@stencil/core';
import { ChipsConfig } from '../schema';
import { IconButton } from '../../ui/icon-button/index';
import { ArrowRightIcon, PlusIcon, XIcon } from '../../ui/icons/icons';

@Component({
  tag: 'app-chips',
  styleUrls: ['app-chips.css', '../../ui/icon-button/icon-button.css'],
  shadow: true,
})
export class AppChips {
  @Prop() value: string[] = [];
  @Prop() config: ChipsConfig;

  @Event() addChip: EventEmitter<{ value: string }>;

  @Event() removeChip: EventEmitter<{ value: string }>;

  /** The add-chip input is hidden behind a "+" button until the user
   * clicks it — matches the design's persistent trailing add button
   * rather than an always-visible text input. */
  @State() isAdding = false;
  @State() draft = '';

  private emitRemoveChip(value: string) {
    this.removeChip.emit({
      value,
    });
  }

  private hasDuplicateChip(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return this.value.some(chip => chip.trim().toLowerCase() === normalized);
  }

  private openAdding = () => {
    this.isAdding = true;
    this.draft = '';
  };

  private cancelAdding = () => {
    this.isAdding = false;
    this.draft = '';
  };

  private submitDraft = () => {
    const val = this.draft.trim();
    if (!val || this.hasDuplicateChip(val)) {
      this.draft = '';
      return;
    }

    this.addChip.emit({ value: val });
    this.draft = '';
  };

  /** Clicking away from the input saves whatever was typed (and closes the
   * add-chip UI), rather than silently discarding it. */
  private handleInputBlur = () => {
    this.submitDraft();
    this.isAdding = false;
  };

  /** Keeps focus on the input when the Cancel/Confirm buttons are clicked,
   * so their onClick fires before — not after — handleInputBlur would run
   * and save a draft the user meant to cancel. */
  private keepInputFocused = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleDraftInput = (e: Event) => {
    this.draft = (e.target as HTMLInputElement).value;
  };

  private handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.submitDraft();
      return;
    }

    if (e.key === 'Escape') {
      this.cancelAdding();
    }
  };

  render() {
    const c = this.config;

    const allowedAttrs = {
      placeholder: c.placeholder,
      required: c.required,
      disabled: c.disabled,
      readOnly: c.readOnly,
      id: c.name,
      name: c.name,
      autocomplete: c.autocomplete,
    };

    return (
      <div class="app-chips">
        {c.label && (
          <label class="app-chips__label" htmlFor={c.name}>
            {c.label}
          </label>
        )}

        <div class="app-chips__container">
          {this.value.map((chip) => (
            <span class="app-chips__chip" key={chip}>
              {c.type === 'url' ? (
                <a
                  href={chip}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="app-chips__link"
                >
                  {chip}
                </a>
              ) : (
                chip
              )}

              <button
                class="app-chips__remove"
                type="button"
                aria-label={`Remove ${chip}`}
                onClick={() => this.emitRemoveChip(chip)}
              >
                <XIcon />
              </button>
            </span>
          ))}

          {this.isAdding ? (
            <span class="app-chips__adding">
              <input
                class="app-chips__input"
                type={c.type || 'text'}
                {...allowedAttrs}
                value={this.draft}
                autoFocus
                onInput={this.handleDraftInput}
                onKeyDown={this.handleInputKeyDown}
                onBlur={this.handleInputBlur}
              />
              <button
                class="app-chips__cancel"
                type="button"
                aria-label="Cancel"
                onMouseDown={this.keepInputFocused}
                onClick={this.cancelAdding}
              >
                <XIcon />
              </button>
              <button
                class="app-chips__confirm"
                type="button"
                aria-label="Add"
                disabled={!this.draft.trim()}
                onMouseDown={this.keepInputFocused}
                onClick={this.submitDraft}
              >
                <ArrowRightIcon />
              </button>
            </span>
          ) : (
            <IconButton
              variant="outline"
              class="app-chips__add"
              title="Add"
              onClick={this.openAdding}
            >
              <PlusIcon />
            </IconButton>
          )}
        </div>
      </div>
    );
  }
}
