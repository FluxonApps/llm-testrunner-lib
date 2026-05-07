import { z } from 'zod';
import type { Criterion } from '../../../../schemas/expected-outcome';
import {
  EvaluationApproach,
  DEFAULT_LLM_JUDGE_PASS_SCORE,
} from '../../constants';
import type {
  CriterionResult,
  EvaluationRequest,
  EvaluationResult,
} from '../../types';
import { buildJudgeMessages } from './prompt-template';

const DEFAULT_CORRECTNESS_CRITERION: Criterion = {
  id: 'correctness',
  description:
    'Determine whether the actual output is factually correct based on the expected output.',
  weight: 1,
};

const judgeResponseSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.string().min(1),
        score: z.number().min(0).max(1),
        reason: z.string().optional(),
      }),
    )
    .min(1),
});

function validateCoverage(
  inputCriteria: Criterion[],
  judgeCriteriaIds: Set<string>,
) {
  const missing = inputCriteria
    .map(c => c.id)
    .filter(id => !judgeCriteriaIds.has(id));

  if (missing.length > 0) {
    return `Judge response is missing scores for criteria: ${missing.join(', ')}`;
  }
  return null;
}

const resolveCriteria = (criteria: Criterion[] | undefined): Criterion[] => {
  if (!criteria || criteria.length === 0) {
    return [DEFAULT_CORRECTNESS_CRITERION];
  }
  return criteria;
};

const weightOf = (criterion: Criterion): number => {
  return criterion.weight ?? 1;
};

const computeWeightedAverage = (
  criterionResults: CriterionResult[],
): number => {
  const totalWeightedScore = criterionResults.reduce((sum, result) => {
    return sum + result.score * result.weight;
  }, 0);
  const totalWeight = criterionResults.reduce((sum, result) => {
    return sum + result.weight;
  }, 0);
  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
};

/**
 * Builds an `EvaluationResult` representing a failed llm-judge evaluation.
 * Used for every recoverable failure path (missing callback, judge throws,
 * schema mismatch, coverage failure) so the caller can surface a consistent
 * error in the evaluation-row UI via {@link EvaluationResult.error}.
 */
function buildErrorResult(
  request: EvaluationRequest,
  errorMessage: string,
): EvaluationResult {
  const threshold =
    request.evaluationParameters.threshold ?? DEFAULT_LLM_JUDGE_PASS_SCORE;
  return {
    testCaseId: request.testCaseId,
    passed: false,
    keywordMatches: [],
    timestamp: new Date().toISOString(),
    evaluationParameters: { ...request.evaluationParameters, threshold },
    evaluationApproachResult: {
      score: 0,
      approachUsed: EvaluationApproach.LLM_JUDGE,
    },
    error: errorMessage,
  };
}

export async function performLlmJudgeEvaluation(
  request: EvaluationRequest,
): Promise<EvaluationResult> {
  if (!request.llmJudge) {
    return buildErrorResult(
      request,
      'llmJudge callback is required for llm-judge evaluation.',
    );
  }
  const criteria = resolveCriteria(request.evaluationParameters.criteria);
  const {
    testCaseId,
    question,
    expectedOutcome,
    actualResponse: assistantResponse,
    evaluationParameters,
    llmJudge,
    chatHistory,
    additionalContext,
  } = request;
  const messages = buildJudgeMessages({
    question,
    expectedOutcome,
    assistantResponse,
    chatHistory,
    additionalContext,
    criteria,
  });

  let judgeResponse;
  try {
    judgeResponse = await llmJudge({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildErrorResult(request, `Judge call failed: ${message}`);
  }

  const parsed = judgeResponseSchema.safeParse(judgeResponse);
  if (!parsed.success) {
    return buildErrorResult(
      request,
      `Judge response schema validation failed: ${parsed.error.message}`,
    );
  }

  const judgeIds = new Set(parsed.data.criteria.map(c => c.id));
  const coverageError = validateCoverage(criteria, judgeIds);
  if (coverageError) {
    return buildErrorResult(request, coverageError);
  }

  const criterionResults: CriterionResult[] = criteria.map(criterion => {
    const judgeResult = parsed.data.criteria.find(
      jc => jc.id === criterion.id,
    )!;
    return {
      id: criterion.id,
      description: criterion.description,
      weight: weightOf(criterion),
      score: judgeResult.score,
      reason: judgeResult.reason,
    };
  });

  const finalScore = computeWeightedAverage(criterionResults);
  const threshold =
    evaluationParameters.threshold ?? DEFAULT_LLM_JUDGE_PASS_SCORE;

  return {
    testCaseId,
    passed: finalScore >= threshold,
    keywordMatches: [],
    criterionResults,
    timestamp: new Date().toISOString(),
    evaluationParameters: { ...evaluationParameters, threshold },
    evaluationApproachResult: {
      score: finalScore,
      approachUsed: EvaluationApproach.LLM_JUDGE,
    },
  };
}
