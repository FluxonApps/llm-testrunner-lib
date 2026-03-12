import { EvaluationRequest, EvaluationResult, KeywordMatch } from '../../types';
import { EvaluationApproach } from '../../constants';

export async function performEvaluation(
  request: EvaluationRequest,
): Promise<EvaluationResult> {
  const { testCaseId, expectedOutcome, actualResponse } = request;

  // Split expectedOutcome by newlines to create keywords array
  const expectedKeywords = expectedOutcome
    ? expectedOutcome
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0)
    : [];

    console.log({actualResponse, expectedOutcome});

  const keywordMatches = evaluateKeywords(expectedKeywords, actualResponse);

  // Test passes only if ALL expected keywords are found
  const totalItems = keywordMatches.length;
  const foundItems = keywordMatches.filter(m => m.found).length;
  const passed = foundItems === totalItems;

  return {
    testCaseId,
    passed,
    keywordMatches,
    timestamp: new Date().toISOString(),
    evaluationParameters: request.evaluationParameters,
    evaluationApproachResult: {
      score: totalItems > 0 ? foundItems / totalItems : 1,
      approachUsed: EvaluationApproach.EXACT,
    },
  };
}

function evaluateKeywords(
  expectedKeywords: string[],
  actualResponse: string,
): KeywordMatch[] {
  // Case-insensitive keyword matching
  const response = actualResponse.toLowerCase();

  return expectedKeywords.map(keyword => {
    const keywordToMatch = keyword.toLowerCase();
    const found = response.includes(keywordToMatch);

    return {
      keyword,
      found,
      evaluationApproachResult: {
        score: found ? 1.0 : 0.0,
        approachUsed: EvaluationApproach.EXACT,
      },
    };
  });
}
