import { h, FunctionalComponent } from '@stencil/core';
import type { ModelResponsePayload } from '../../../../types/llm-test-runner';

export interface ResponseOutputProps {
  output?: ModelResponsePayload;
  isRunning: boolean;
}

export const ResponseOutput: FunctionalComponent<ResponseOutputProps> = ({
  output,
  isRunning,
}) => {
  return (
    <div class="response-output">
      <div class="response-output__toolbar">
        <copy-button value={output?.text || ''} label="Copy response" />
      </div>
      {output?.text ? (
        <div class="response-output__content">{output.text}</div>
      ) : (
        <div class="response-output__placeholder">{isRunning ? 'Running...' : ''}</div>
      )}
    </div>
  );
};

