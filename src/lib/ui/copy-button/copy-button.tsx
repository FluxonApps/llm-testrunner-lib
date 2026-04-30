import { Component, Prop, State, h } from '@stencil/core';

export interface CopyButtonProps {
  value?: string;
  label?: string;
  resetMs?: number;
}

@Component({
  tag: 'copy-button',
  styleUrl: 'copy-button.css',
  shadow: true,
})
export class CopyButton implements CopyButtonProps {
  /**
   * If empty/undefined, the button is rendered in a disabled state.
   */
  @Prop() value?: string = '';
  @Prop() label?: string = 'Copy';
  @Prop() resetMs?: number = 500;

  @State() copied = false;

  private timeoutId?: number;

  disconnectedCallback() {
    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private handleClick = async (): Promise<void> => {
    if (this.copied || !this.value) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.value);
      } else {
        return;
      }
    } catch {
      return;
    }

    this.copied = true;
    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(() => {
      this.copied = false;
      this.timeoutId = undefined;
    }, this.resetMs);
  };

  render() {
    const hasValue = !!this.value;
    const disabled = !hasValue || this.copied;
    const title = this.copied 
      ? 'Copied'
      : hasValue
        ? this.label
        : '';

    return (
      <button
        type="button"
        class={{
          'copy-button': true,
          'copy-button--copied': this.copied,
        }}
        onClick={this.handleClick}
        disabled={disabled}
        title={title}
        aria-label={title}
        aria-live="polite"
      >
        {this.copied ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : (
          <svg
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
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </button>
    );
  }
}
