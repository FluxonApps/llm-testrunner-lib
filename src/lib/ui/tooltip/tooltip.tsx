import { h, FunctionalComponent } from '@stencil/core';

let nextId = 0;

export interface TooltipProps {
  content: string;
  class?: string;
}

/** Wraps a trigger (usually an icon) with a custom-styled bubble tooltip
 * that appears above it on hover/focus — used in place of the native
 * `title` attribute, which can't be styled or positioned. */
export const Tooltip: FunctionalComponent<TooltipProps> = (props, children) => {
  const { content, class: className } = props;
  const id = `ui-tooltip-${++nextId}`;

  return (
    <span
      class={['ui-tooltip', className].filter(Boolean).join(' ')}
      tabIndex={0}
      aria-describedby={id}
    >
      {children}
      <span class="ui-tooltip__bubble" role="tooltip" id={id}>
        {content}
      </span>
    </span>
  );
};
