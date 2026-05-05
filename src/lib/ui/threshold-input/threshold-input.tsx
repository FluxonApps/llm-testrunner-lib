import {
  Component,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';

export interface ThresholdInputChangeDetail {
  value: number | undefined;
}

/** Maximum number of decimal places the user can type into the input. */
const MAX_DECIMALS = 4;

export interface ThresholdInputProps {
  value?: number;
  defaultValue?: number;
  label?: string;
  min?: number;
  max?: number;
  inputId?: string;
}

@Component({
  tag: 'threshold-input',
  styleUrl: 'threshold-input.css',
  shadow: true,
})
export class ThresholdInput implements ThresholdInputProps {
  @Prop() value?: number;
  @Prop() defaultValue?: number;
  @Prop() label?: string = 'Threshold';
  @Prop() min?: number = 0;
  @Prop() max?: number = 1;
  @Prop() inputId?: string;

  /**
   * What the user has typed. Kept separate from `value` so that an invalid
   * draft (e.g. "1.5") stays visible with an error message.
   */
  @State() draft: string = '';
  @State() errorMessage: string | null = null;

  @Event() thresholdChange: EventEmitter<ThresholdInputChangeDetail>;

  componentWillLoad() {
    this.syncDraftFromValue(this.value);
    this.errorMessage = this.computeError(this.draft);
  }

  @Watch('value')
  onValueChange(next: number | undefined) {
    const parsed = this.parseDraft(this.draft);
    if (parsed === next) return;

    this.syncDraftFromValue(next);
    this.errorMessage = this.computeError(this.draft);
  }
 
  @Watch('defaultValue')
  onDefaultValueChange() {
    if (this.value !== undefined && !Number.isNaN(this.value)) return;
    this.syncDraftFromValue(this.value);
    this.errorMessage = this.computeError(this.draft);
  }

  private syncDraftFromValue(value: number | undefined): void {
    if (value === undefined || Number.isNaN(value)) {
      this.draft =
        this.defaultValue === undefined
          ? ''
          : this.capDecimals(String(this.defaultValue));
      return;
    }
    const raw = String(value);
    const capped = this.capDecimals(raw);
    this.draft = capped;
    if (capped !== raw) {
      this.thresholdChange.emit({ value: Number(capped) });
    }
  }

  private parseDraft(raw: string): number | undefined {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }

  /**
   * Strips characters that <input type="number"> allows but make no
   * sense for a 0–1 threshold: scientific-notation `e`/`E` and the `+`
   * exponent sign. A threshold can't usefully be expressed as `1e3`,
   * so we drop those characters before any other processing.
   */
  private stripExponential(raw: string): string {
    return raw.replace(/[eE+]/g, '');
  }

  private capDecimals(raw: string): string {
    const dot = raw.indexOf('.');
    if (dot === -1) return raw;
    return raw.slice(0, dot + 1 + MAX_DECIMALS);
  }

  /** Pure: returns the inline error string for `raw`, or null if none. */
  private computeError(raw: string): string | null {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (Number.isNaN(n)) return 'Must be a number';
    const min = this.min ?? 0;
    const max = this.max ?? 1;
    if (n < min || n > max) return `Must be between ${min} and ${max}`;
    return null;
  }

  private handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    const raw = this.capDecimals(this.stripExponential(target.value));
    if (target.value !== raw) {
      target.value = raw;
    }
    this.draft = raw;
    this.errorMessage = this.computeError(raw);

    if (raw.trim() === '') {
      this.thresholdChange.emit({ value: undefined });
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    this.thresholdChange.emit({ value: n });
  };

  render() {
    const id = this.inputId || 'threshold-input';
    const messageId = `${id}-message`;
    const isInvalid = this.errorMessage !== null;

    return (
      <div class="threshold-input">
        {this.label && (
          <label class="threshold-input__label" htmlFor={id}>
            {this.label}
          </label>
        )}
        <div class="threshold-input__field">
          <input
            id={id}
            class={{
              'threshold-input__input': true,
              'threshold-input__input--invalid': isInvalid,
            }}
            type="number"
            inputMode="decimal"
            step="any"
            min={this.min}
            max={this.max}
            value={this.draft}
            aria-invalid={isInvalid ? 'true' : 'false'}
            aria-describedby={this.errorMessage ? messageId : undefined}
            onInput={this.handleInput}
          />
          {this.errorMessage && (
            <span
              id={messageId}
              class="threshold-input__message threshold-input__message--error"
              role="alert"
            >
              {this.errorMessage}
            </span>
          )}
        </div>
      </div>
    );
  }
}
