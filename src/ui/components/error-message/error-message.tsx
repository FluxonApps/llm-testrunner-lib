import { FunctionalComponent, h } from '@stencil/core';

interface ErrorMessageProps {
  message: string;
  onClear?: () => void;
}

export const ErrorMessage: FunctionalComponent<ErrorMessageProps> = ({
  message,
  onClear,
}) => {
  if (!message) {
    return null;
  }

  return (
    <div class="error-message">
      <span>{message}</span>
      {onClear && (
        <button
          type="button"
          class="error-message__close"
          title="Close"
          onClick={onClear}
        >
          &times;
        </button>
      )}
    </div>
  );
};
