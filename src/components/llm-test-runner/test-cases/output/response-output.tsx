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
  // While the model is generating and we don't yet have a response, show
  // a skeleton that mimics the eventual prose layout. Reads as "something
  // is happening here" without the dead-air "Running…" placeholder.
  const showSkeleton = isRunning && !output?.text;

  return (
    <div class="response-output">
      <div class="response-output__toolbar">
        <copy-button value={output?.text || ''} label="Copy response" />
      </div>
      {output?.text ? (
        <div class="response-output__content">{output.text}</div>
      ) : showSkeleton ? (
        <div
          class="response-output__skeleton"
          aria-busy="true"
          aria-label="Generating response"
        >
          <div class="skeleton-line skeleton-line--w-95"></div>
          <div class="skeleton-line skeleton-line--w-100"></div>
          <div class="skeleton-line skeleton-line--w-85"></div>
          <div class="skeleton-line skeleton-line--w-70"></div>
          <div class="skeleton-line skeleton-line--w-90"></div>
        </div>
      ) : (
        <div class="response-output__placeholder">
          Run the test to see the model's response.
        </div>
      )}
    </div>
  );
};

