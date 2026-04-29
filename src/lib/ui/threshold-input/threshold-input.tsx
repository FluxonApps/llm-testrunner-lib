import {
  Component,
  Event,
  EventEmitter,
  Method,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';

export interface ThresholdInputChangeDetail {
  /**
   * `undefined` when the input is cleared. 
   * Only emitted for in-range numeric values (or for a deliberate clear); 
   * out-of-range or non-numeric input is surfaced as an inline error and does NOT emit.
   */
  value: number | undefined;
}

export interface ThresholdInputProps {
  value?: number;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  precision?: number;
  inputId?: string;
}

type MessageLevel = 'error' | 'warning';

@Component({
  tag: 'threshold-input',
  styleUrl: 'threshold-input.css',
  shadow: true,
})
export class ThresholdInput implements ThresholdInputProps {
  @Prop() value?: number;
  @Prop() label?: string = 'Threshold';
  @Prop() placeholder?: string = '0.7';
  @Prop() min?: number = 0;
  @Prop() max?: number = 1;
  @Prop() precision?: number = 4;
  @Prop() inputId?: string;

  /**
   * What the user has typed. Kept separate from `value` so that an invalid
   * draft (e.g. "1.5") stays visible with an error message rather than being
   * snapped back to the last valid number.
   */
  @State() draft: string = '';
  @State() message: string | null = null;
  @State() messageLevel: MessageLevel | null = null;

  @Event() thresholdChange: EventEmitter<ThresholdInputChangeDetail>;

  componentWillLoad() {
    this.syncDraftFromValue(this.value);
    this.runValidation(this.draft);
  }

  @Watch('value')
  onValueChange(next: number | undefined) {
    const parsed = this.parseDraft(this.draft);
    if (parsed !== next) {
      this.syncDraftFromValue(next);
      this.runValidation(this.draft);
    }
  }

  private syncDraftFromValue(value: number | undefined): void {
    this.draft = value === undefined || Number.isNaN(value) ? '' : String(value);
  }

  private parseDraft(raw: string): number | undefined {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }

  private roundToPrecision(n: number): number {
    const factor = Math.pow(10, this.precision ?? 4);
    return Math.round(n * factor) / factor;
  }

  private runValidation(raw: string): boolean {
    if (raw.trim() === '') {
      this.message = null;
      this.messageLevel = null;
      return true;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      this.message = 'Must be a number';
      this.messageLevel = 'error';
      return false;
    }
    const min = this.min ?? 0;
    const max = this.max ?? 1;
    if (n < min || n > max) {
      this.message = `Must be between ${min} and ${max}`;
      this.messageLevel = 'error';
      return false;
    }
    this.message = null;
    this.messageLevel = null;
    return true;
  }

  private handleInput = (e: Event): void => {
    const raw = (e.target as HTMLInputElement).value;
    this.draft = raw;
    const valid = this.runValidation(raw);
    if (valid) {
      const value =
        raw.trim() === '' ? undefined : this.roundToPrecision(Number(raw));
      this.thresholdChange.emit({ value });
    }
  };

  @Method()
  async resolveInvalid(): Promise<boolean> {
    if (this.messageLevel !== 'error') {
      return false;
    }
    this.draft = '';
    this.message = 'Invalid threshold cleared — using default';
    this.messageLevel = 'warning';
    this.thresholdChange.emit({ value: undefined });
    return true;
  }

  render() {
    const id = this.inputId || 'threshold-input';
    const messageId = `${id}-message`;
    const isInvalid = this.messageLevel === 'error';
    const isWarning = this.messageLevel === 'warning';

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
              'threshold-input__input--warning': isWarning,
            }}
            type="number"
            inputMode="decimal"
            step="any"
            min={this.min}
            max={this.max}
            placeholder={this.placeholder}
            value={this.draft}
            aria-invalid={isInvalid ? 'true' : 'false'}
            aria-describedby={this.message ? messageId : undefined}
            onInput={this.handleInput}
          />
          {this.message && (
            <span
              id={messageId}
              class={{
                'threshold-input__message': true,
                'threshold-input__message--error': isInvalid,
                'threshold-input__message--warning': isWarning,
              }}
              role={isInvalid ? 'alert' : 'status'}
            >
              {this.message}
            </span>
          )}
        </div>
      </div>
    );
  }
}
