import {
  Component,
  Event,
  EventEmitter,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import type { Criterion } from '../../../schemas/expected-outcome';

export interface CriteriaInputChangeDetail {
  value: Criterion[] | undefined;
}

const PLACEHOLDER = `[
  {
    "id": "correctness",
    "description": "Determine whether the actual output is factually correct based on the expected output.",
    "weight": 1
  }
]`;

function validateCriteriaArray(
  value: unknown,
): { criteria: Criterion[]; error?: undefined } | { error: string } {
  if (!Array.isArray(value)) {
    return { error: 'Criteria must be a JSON array.' };
  }
  if (value.length === 0) {
    return { error: 'At least one criterion is required.' };
  }
  const seenIds = new Set<string>();
  for (const [i, item] of value.entries()) {
    if (typeof item !== 'object' || item === null) {
      return { error: `Criterion ${i}: must be an object.` };
    }
    const c = item as Record<string, unknown>;
    if (typeof c.id !== 'string' || c.id.trim().length === 0) {
      return { error: `Criterion ${i}: "id" must be a non-empty string.` };
    }
    if (typeof c.description !== 'string' || c.description.trim().length === 0) {
      return {
        error: `Criterion ${i}: "description" must be a non-empty string.`,
      };
    }
    if (c.weight !== undefined) {
      if (
        typeof c.weight !== 'number' ||
        !Number.isFinite(c.weight) ||
        c.weight <= 0
      ) {
        return { error: `Criterion ${i}: "weight" must be a positive number.` };
      }
    }
    if (seenIds.has(c.id)) {
      return { error: `Criterion ${i}: duplicate id "${c.id}".` };
    }
    seenIds.add(c.id);
  }
  return { criteria: value as Criterion[] };
}

@Component({
  tag: 'criteria-input',
  styleUrl: 'criteria-input.css',
  shadow: true,
})
export class CriteriaInput {
  @Prop() criteria?: Criterion[];

  @Event({ bubbles: true, composed: true })
  criteriaChange: EventEmitter<CriteriaInputChangeDetail>;

  @State() text: string = '';
  @State() error?: string;

  componentWillLoad() {
    this.text = this.criteria
      ? JSON.stringify(this.criteria, null, 2)
      : '';
  }

  @Watch('criteria')
  onCriteriaPropChange(newValue: Criterion[] | undefined) {
    if (this.error) {
      return;
    }
    const propStr = JSON.stringify(newValue ?? []);
    let localStr = '[]';
    try {
      localStr = JSON.stringify(JSON.parse(this.text || '[]'));
    } catch {
      this.text = newValue ? JSON.stringify(newValue, null, 2) : '';
      return;
    }
    if (propStr !== localStr) {
      this.text = newValue ? JSON.stringify(newValue, null, 2) : '';
    }
  }

  private onInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    this.text = value;

    if (!value.trim()) {
      this.error = undefined;
      this.criteriaChange.emit({ value: undefined });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (err) {
      this.error = `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`;
      return;
    }

    const validation = validateCriteriaArray(parsed);
    if ('error' in validation) {
      this.error = validation.error;
      return;
    }
    this.error = undefined;
    this.criteriaChange.emit({ value: validation.criteria });
  };

  render() {
    return (
      <div class="criteria-input">
        <label class="criteria-input__label" htmlFor="criteria-input-textarea">
          Criteria (JSON)
        </label>
        <textarea
          id="criteria-input-textarea"
          class={
            'criteria-input__textarea' +
            (this.error ? ' criteria-input__textarea--error' : '')
          }
          rows={8}
          placeholder={PLACEHOLDER}
          aria-label="Criteria JSON"
          aria-invalid={this.error ? 'true' : 'false'}
          aria-describedby={this.error ? 'criteria-input-error' : undefined}
          value={this.text}
          onInput={this.onInput}
        />

        {this.error && (
          <div id="criteria-input-error" class="criteria-input__error" role="alert">
            {this.error}
          </div>
        )}
      </div>
    );
  }
}
