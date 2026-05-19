import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';
import { SelectConfig } from '../schema';

@Component({
  tag: 'app-select',
  styleUrl: 'app-select.css',
  shadow: true,
})
export class AppSelect {
  @Prop() value: string;
  @Prop() config: SelectConfig;
  @Event() valueChange: EventEmitter<{ value: string }>;

  render() {
    const c = this.config;
    const allowedAttrs = {
      id: c.name,
      name: c.name,
      disabled: c.disabled,
      required: c.required,
      readOnly: c.readOnly,
      placeholder: c.placeholder,
      autocomplete: c.autocomplete,
    };
    return (
      <div class="app-select">
        {c.label && (
          <label class="app-select__label" htmlFor={c.name}>
            {c.label}
          </label>
        )}

        <div>
          <select
            {...allowedAttrs}
            class="app-select__select"
            onInput={(e: Event) => {
              const raw = (e.target as HTMLSelectElement).value;
              const matched = c.optionList.find(opt => String(opt) === raw);
              this.valueChange.emit({
                value: matched !== undefined ? matched : raw,
              });
            }}
          >
            {c.optionList?.map(option => (
              <option
                value={String(option)}
                key={String(option)}
                selected={this.value === option}
              >
                {String(option)}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
}
