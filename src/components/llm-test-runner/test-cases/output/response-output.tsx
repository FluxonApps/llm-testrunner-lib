import { h, FunctionalComponent } from '@stencil/core';

export interface ResponseOutputProps {
  output?: string;
  isRunning: boolean;
}

export const ResponseOutput: FunctionalComponent<ResponseOutputProps> = ({
  output,
  isRunning,
}) => {
  return (
    <div class="response-output">
      {output ? (
        <div class="response-output__content">{output}</div>
      ) : (
        <div class="response-output__placeholder">{isRunning ? 'Running...' : ''}</div>
      )}
    </div>
  );
};

