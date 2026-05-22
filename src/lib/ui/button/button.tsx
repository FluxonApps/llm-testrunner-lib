import { h, FunctionalComponent, VNode } from '@stencil/core';

export interface ButtonProps {
  'variant'?: 'primary' | 'secondary' | 'outline' | 'destructive';
  'size'?: 'sm' | 'md' | 'lg';
  'disabled'?: boolean;
  'loading'?: boolean;
  'onClick'?: (event: MouseEvent) => void;
  'type'?: 'button' | 'submit' | 'reset';
  'class'?: string;
  /** A leading icon — accepts a string (legacy emoji/character) or a JSX
   * node (preferred — see `lib/ui/icons` for the SVG icon set). */
  'icon'?: string | VNode;
  'aria-label'?: string;
}

export const Button: FunctionalComponent<ButtonProps> = (props, children) => {
  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    'class': className = '',
    icon,
    'aria-label': ariaLabel,
  } = props;

  const baseClass = 'ui-button';
  const variantClass = `ui-button--${variant}`;
  const sizeClass = `ui-button--${size}`;
  const loadingClass = loading ? 'ui-button--loading' : '';
  const disabledClass = disabled ? 'ui-button--disabled' : '';

  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    loadingClass,
    disabledClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      class={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      aria-label={ariaLabel}
    >
      {icon && <span class="icon">{icon}</span>}
      {children}
    </button>
  );
};
