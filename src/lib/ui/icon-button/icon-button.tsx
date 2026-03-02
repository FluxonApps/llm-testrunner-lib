import { h, FunctionalComponent } from '@stencil/core';

export interface IconButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  class?: string;
}

export const IconButton: FunctionalComponent<IconButtonProps> = (props, children) => {
  const {
    variant = 'primary',
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    title,
    class: className = '',
  } = props;

  const baseClass = 'ui-icon-button';
  const variantClass = `ui-icon-button--${variant}`;
  const loadingClass = loading ? 'ui-icon-button--loading' : '';
  const disabledClass = disabled ? 'ui-icon-button--disabled' : '';

  const classes = [
    baseClass,
    variantClass,
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
      title={title}
      aria-busy={loading}
      aria-label={title}
    >
      {children}
    </button>
  );
};

