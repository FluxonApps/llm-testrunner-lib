import { h, FunctionalComponent } from '@stencil/core';
import type { ModelResponsePayload } from '../../../../types/llm-test-runner';
import type { EvaluationResult, FieldEvaluationResult } from '../../../../lib/evaluation/types';

export interface EvaluationResultBannerProps {
  output?: ModelResponsePayload;
  result?: EvaluationResult;
}

const matchCounts = (fieldResult: FieldEvaluationResult) => {
  const total = fieldResult.keywordMatches.length;
  const matched = fieldResult.keywordMatches.filter(match => match.found).length;
  return { matched, total };
};

const StatusBadge: FunctionalComponent<{ passed: boolean }> = ({ passed }) => (
  <span
    class={{
      'evaluation-result-banner__badge': true,
      'evaluation-result-banner__badge--passed': passed,
      'evaluation-result-banner__badge--failed': !passed,
    }}
  >
    {passed ? 'Passed' : 'Failed'}
  </span>
);

const MetricRow: FunctionalComponent<{ label: string; value: string; failed?: boolean }> = ({
  label,
  value,
  failed,
}) => (
  <div class="evaluation-result-banner__metric-row">
    <span class="evaluation-result-banner__metric-label">{label}</span>
    <span
      class={{
        'evaluation-result-banner__metric-value': true,
        'evaluation-result-banner__metric-value--failed': !!failed,
      }}
    >
      {value}
    </span>
  </div>
);

const FieldScoreCard: FunctionalComponent<{
  fieldResult: FieldEvaluationResult;
  key?: number;
}> = ({ fieldResult }) => {
  const { matched, total } = matchCounts(fieldResult);
  const passed = fieldResult.passed && !fieldResult.error;

  return (
    <div class="evaluation-result-banner__score-card">
      <div class="evaluation-result-banner__score-card-header">
        <span class="evaluation-result-banner__score-card-title">{fieldResult.label}</span>
        <StatusBadge passed={passed} />
      </div>
      {fieldResult.error ? (
        <p class="evaluation-result-banner__score-card-error">{fieldResult.error}</p>
      ) : (
        <div class="evaluation-result-banner__metrics">
          <MetricRow label="Strategy" value={fieldResult.evaluationParameters.approach} />
          <MetricRow
            label="Score"
            value={fieldResult.evaluationApproachResult.score.toFixed(2)}
            failed={!passed}
          />
          <MetricRow label="Matches" value={`${matched}/${total}`} failed={!passed} />
        </div>
      )}
      {fieldResult.criterionResults && fieldResult.criterionResults.length > 0 && (
        <div class="evaluation-result-banner__criteria">
          <span class="evaluation-result-banner__criteria-label">Criteria</span>
          <ul class="evaluation-result-banner__criteria-list">
            {fieldResult.criterionResults.map(criterion => (
              <li class="evaluation-result-banner__criteria-item" key={criterion.id}>
                <span class="evaluation-result-banner__criteria-id" title={criterion.reason || criterion.id}>
                  {criterion.id}
                </span>
                <span class="evaluation-result-banner__criteria-score">
                  {criterion.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {fieldResult.warning && (
        <p class="evaluation-result-banner__score-card-warning" role="status">
          {fieldResult.warning}
        </p>
      )}
    </div>
  );
};

export const EvaluationResultBanner: FunctionalComponent<EvaluationResultBannerProps> = ({
  output,
  result,
}) => {
  // The model response and the evaluation result land at different times —
  // `output` arrives first, `result` can lag well behind it (e.g. an
  // llm-judge field awaiting the caller's judge callback). Each column
  // shows real data as soon as it has it, independent of the other.
  const hasOutput = !!output?.text;
  const fieldResults = result?.fieldResults || [];
  // The first field's actual value is the raw response text already shown
  // in Output — only fields after it (typically custom-extractor fields
  // like an invoked tool name) get their own extracted-value chip.
  const extractedFields = fieldResults.slice(1);

  return (
    <div
      class={{
        'evaluation-result-banner': true,
        'evaluation-result-banner--skeleton': !result,
        'evaluation-result-banner--passed': !!result?.passed,
        'evaluation-result-banner--failed': !!result && !result.passed,
      }}
    >
      <div class="evaluation-result-banner__header">
        <span class="evaluation-result-banner__title">Evaluation Result</span>
        {result ? (
          <StatusBadge passed={result.passed} />
        ) : (
          <div class="evaluation-result-banner__skeleton-badge"></div>
        )}
      </div>
      <div class="evaluation-result-banner__body">
        <div class="evaluation-result-banner__output-col">
          {hasOutput ? (
            <div class="evaluation-result-banner__output-header">
              <span class="evaluation-result-banner__output-label">Output</span>
              <copy-button value={output?.text || ''} label="Copy response" />
            </div>
          ) : null}
          {hasOutput ? (
            <div class="evaluation-result-banner__output-box">{output?.text}</div>
          ) : (
            <div class="evaluation-result-banner__skeleton-output">
              <div class="skeleton-line skeleton-line--w-95"></div>
              <div class="skeleton-line skeleton-line--w-100"></div>
              <div class="skeleton-line skeleton-line--w-70"></div>
            </div>
          )}
          {extractedFields.length > 0 && (
            <div class="evaluation-result-banner__extracted-row">
              {extractedFields.map(fieldResult => (
                <div class="evaluation-result-banner__extracted-col" key={fieldResult.index}>
                  <span class="evaluation-result-banner__extracted-label">
                    {fieldResult.label}
                  </span>
                  <span class="evaluation-result-banner__extracted-chip">
                    {fieldResult.actualValue || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div class="evaluation-result-banner__score-col">
          {result ? (
            fieldResults.map(fieldResult => (
              <FieldScoreCard fieldResult={fieldResult} key={fieldResult.index} />
            ))
          ) : (
            [
              <div class="evaluation-result-banner__skeleton-card" key="skeleton-card-1"></div>,
              <div class="evaluation-result-banner__skeleton-card" key="skeleton-card-2"></div>,
            ]
          )}
        </div>
      </div>
    </div>
  );
};
