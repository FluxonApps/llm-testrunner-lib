import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';
import { ChipsConfig } from '../schema';

@Component({
  tag: 'app-chips',
  styleUrl: 'app-chips.css',
  shadow: true,
})
export class AppChips {
  @Prop() value: string[] = [];
  @Prop() config: ChipsConfig;

  @Event() addChip: EventEmitter<{ value: string }>;

  @Event() removeChip: EventEmitter<{ value: string }>;

  private emitAddChip(val: string) {
    this.addChip.emit({
      value: val,
    });
  }

  private emitRemoveChip(value: string) {
    this.removeChip.emit({
      value,
    });
  }

  private hasDuplicateChip(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return this.value.some(chip => chip.trim().toLowerCase() === normalized);
  }

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
                onClick={() => this.emitRemoveChip(chip)}
              >
                ×
              </button>
            </span>
          ))}

          <input
            class="app-chips__input"
            type={c.type || 'text'}
            {...allowedAttrs}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                const val = input.value.trim();
                if (!val) return;
                if (this.hasDuplicateChip(val)) {
                  input.value = '';
                  return;
                }

                this.emitAddChip(val);
                input.value = '';
              }
            }}
          />
        </div>
      </div>
    );
  }
}
