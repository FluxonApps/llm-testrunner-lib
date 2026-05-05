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
  const fieldResults = result?.fieldResults || [];
  const hasFieldResults = fieldResults.length > 0;

  return (
    <div class="evaluation-summary">
      {result ? (
        <div class="evaluation-summary__result">
          {hasFieldResults ? (
            <div class="evaluation-summary__field-results">
              {fieldResults.map(fieldResult => (
                <div class="evaluation-summary__field-result">
                  <div class="evaluation-summary__field-header">
                    <span class="evaluation-summary__field-label">
                      {fieldResult.label}
                    </span>
                    <span class="evaluation-summary__field-approach">
                      Strategy: {fieldResult.evaluationParameters.approach}
                    </span>
                  </div>
                  <div class="evaluation-summary__field-details">
                    <span
                      class={`evaluation-summary__field-status evaluation-summary__field-status--${fieldResult.passed ? 'passed' : 'failed'}`}
                    >
                      {fieldResult.passed ? 'PASSED' : 'FAILED'}
                    </span>
                    {fieldResult.error && (
                      <span class="evaluation-summary__error-message">
                        {fieldResult.error}
                      </span>
                    )}
                    {fieldResult.warning && (
                      <span
                        class="evaluation-summary__warning-message"
                        role="status"
                      >
                        {fieldResult.warning}
                      </span>
                    )}
                    <span>
                      Score: {fieldResult.evaluationApproachResult.score.toFixed(2)}
                    </span>
                    <span>
                      Matches:{' '}
                      {fieldResult.keywordMatches.filter(match => match.found).length}/
                      {fieldResult.keywordMatches.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div class="evaluation-summary__placeholder">
          {isRunning ? 'Evaluating...' : ''}
        </div>
      )}
    </div>
  );
};
