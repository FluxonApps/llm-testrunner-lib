import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';
import { TextAreaConfig } from '../schema';

@Component({
  tag: 'app-textarea',
  styleUrl: 'app-textarea.css',
  shadow: true,
})
export class AppTextarea {
  @Prop() value: string;
  @Prop() config: TextAreaConfig;

  @Event() valueChange: EventEmitter<{ value: string }>;

  private handleChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;

    this.valueChange.emit({
      value: target.value,
    });
  };

  render() {
    const c = this.config;

    const allowedAttrs = {
      placeholder: c.placeholder,
      required: c.required,
      disabled: c.disabled,
      readOnly: c.readOnly,
      rows: c.rows,
      id: c.name,
      name: c.name,
      autocomplete: c.autocomplete,
    };

    return (
      <div
        class={{
          'textarea-wrapper': true,
          'textarea-wrapper--read-only': !!c.readOnly,
        }}
      >
        {(c.label || c.is_copyable) && (
          <div class="textarea-label-row">
            {c.label ? (
              <label class="textarea-label" htmlFor={c.name}>
                {c.label}
              </label>
            ) : (
              <span class="textarea-label-spacer" />
            )}
            {c.is_copyable && (
              <copy-button
                value={this.value}
                label={`Copy ${c.label || 'value'}`}
              />
            )}
          </div>
        )}

        <textarea
          {...allowedAttrs}
          class="textarea-element"
          value={this.value}
          onInput={this.handleChange}
        ></textarea>

        {c.helpText && <p class="help-text">{c.helpText}</p>}
      </div>
    );
  }
}
