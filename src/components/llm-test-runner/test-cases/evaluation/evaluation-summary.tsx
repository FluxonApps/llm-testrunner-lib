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
  // Skeleton shows while a run is in progress and no result has landed
  // yet. Mimics the eventual layout: status pill + score line + a couple
  // of criterion rows. Reads as "evaluation is being computed" rather
  // than dead-air "Evaluating…" copy.
  const showSkeleton = isRunning && !result;

  if (showSkeleton) {
    return (
      <div
        class="evaluation-summary"
        aria-busy="true"
        aria-label="Evaluating response"
      >
        <div class="evaluation-summary__skeleton">
          <div class="evaluation-summary__skeleton-pill"></div>
          <div class="skeleton-line skeleton-line--w-60"></div>
          <div class="skeleton-line skeleton-line--w-40"></div>
          <div class="evaluation-summary__skeleton-row">
            <div class="skeleton-line skeleton-line--w-50"></div>
            <div class="evaluation-summary__skeleton-score"></div>
          </div>
          <div class="evaluation-summary__skeleton-row">
            <div class="skeleton-line skeleton-line--w-40"></div>
            <div class="evaluation-summary__skeleton-score"></div>
          </div>
        </div>
      </div>
    );
  }

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
                      {fieldResult.passed ? 'Passed' : 'Failed'}
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
                    {fieldResult.criterionResults &&
                      fieldResult.criterionResults.length > 0 && (
                        <div class="evaluation-summary__criterion-results">
                          <span class="evaluation-summary__criterion-results-label">
                            Criteria
                          </span>
                          <ul class="evaluation-summary__criterion-list">
                            {fieldResult.criterionResults.map(criterion => (
                              <li class="evaluation-summary__criterion-item">
                                <span
                                  class="evaluation-summary__criterion-id"
                                  title={criterion.id}
                                >
                                  {criterion.id}
                                </span>
                                <span class="evaluation-summary__criterion-score">
                                  {criterion.score.toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div class="evaluation-summary__placeholder">
          Run the test to see the evaluation result.
        </div>
      )}
    </div>
  );
};
