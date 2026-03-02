import { h, FunctionalComponent } from '@stencil/core';
import { EvaluationResult } from '../../../../lib/evaluation/types';

export interface EvaluationSummaryProps {
  result?: EvaluationResult;
  isRunning: boolean;
}

export const EvaluationSummary: FunctionalComponent<EvaluationSummaryProps> = ({
  result,
  isRunning,
}) => {
  return (
    <div class="evaluation-summary">
      {result ? (
        <div class="evaluation-summary__result">
          <div
            class={`evaluation-summary__result-status evaluation-summary__result-status--${result.passed ? 'passed' : 'failed'}`}
          >
            {result.passed ? '✅ PASSED' : '❌ FAILED'}
          </div>
          <div class="evaluation-summary__details">
            Keywords: {result.keywordMatches.filter(m => m.found).length}/
            {result.keywordMatches.length} found
          </div>
        </div>
      ) : (
        <div class="evaluation-summary__placeholder">
          {isRunning ? 'Evaluating...' : ''}
        </div>
      )}
    </div>
  );
};
