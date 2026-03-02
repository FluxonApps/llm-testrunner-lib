import * as rouge from 'js-rouge';
import { EvaluationApproachResult } from '../../../types/evaluation';
import { EvaluationRequest, EvaluationResult, KeywordMatch } from '../types';
import { DEFAULT_ROUGE_PASS_SCORE, EvaluationApproach } from '../constants';

/**
 * Evaluates a single keyword against the candidate text using ROUGE-1.
 *
 * @param {string} keyword - The expected keyword to evaluate
 * @param {string} candidate - The actual response text
 * @param {number} rougeThreshold - The minimum ROUGE-1 score required to pass
 * @returns {KeywordMatch} The evaluation result for this keyword
 */
function evaluateKeyword(
  keyword: string,
  candidate: string,
  rougeThreshold: number,
): KeywordMatch {
  let rouge1Score = 0;

  try {
    if (keyword.trim().length > 0 && candidate.length > 0) {
      const rouge1 = rouge.n(candidate, keyword.trim(), { n: 1 });
      rouge1Score = isNaN(rouge1) ? 0 : rouge1;
    } else {
      console.warn(
        `ROUGE-1 not computed for keyword "${keyword}": Keyword or Candidate is missing.`,
      );
    }
  } catch (err) {
    console.error(`ROUGE-1 computation failed for keyword "${keyword}":`, err);
  }

  const keywordPassed = rouge1Score >= rougeThreshold;

  const keywordApproachResult: EvaluationApproachResult = {
    score: rouge1Score,
    approachUsed: EvaluationApproach.ROUGE_1,
  };

  return {
    keyword: keyword,
    found: keywordPassed,
    evaluationApproachResult: keywordApproachResult,
  };
}

/**
 * Computes the ROUGE-1 score for a single keyword against the candidate text.
 *
 * ROUGE-1 measures the overlap of unigrams (single words) between the candidate
 * and reference text. A score of 1.0 indicates perfect overlap.
 *
 * @example
 * const match = evaluateSingleKeyword(
 *   "The quick brown fox",
 *   "quick fox",
 *   0.5
 * );
 * // Returns: { keyword: "quick fox", found: true, score: 0.67, ... }
 * //general idea , here we are doing it. by word to word comparison
 */

export async function performRouge1Evaluation(
  request: EvaluationRequest,
): Promise<EvaluationResult> {
  const { testCaseId, actualResponse, expectedOutcome, evaluationParameters } =
    request;

  // Split expectedOutcome by newlines to create keywords array
  const expectedKeywords = expectedOutcome
    ? expectedOutcome
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0)
    : [];

  const candidate = (actualResponse || '').trim();
  const rougeThreshold =
    evaluationParameters.threshold ?? DEFAULT_ROUGE_PASS_SCORE;

  let keywordsPassed = 0;
  const totalKeywords = expectedKeywords.length;

  const keywordMatches: KeywordMatch[] = expectedKeywords.map(keyword => {
    const match = evaluateKeyword(keyword, candidate, rougeThreshold);

    if (match.found) {
      keywordsPassed++;
    }

    return match;
  });

  const overallPassed = keywordsPassed === totalKeywords;

  const overallApproachResult: EvaluationApproachResult = {
    score: keywordsPassed / totalKeywords,
    approachUsed: EvaluationApproach.ROUGE_1,
  };

  return {
    testCaseId: testCaseId,
    passed: overallPassed,
    keywordMatches: keywordMatches,
    timestamp: new Date().toISOString(),
    evaluationParameters: {
      ...evaluationParameters,
      threshold: rougeThreshold,
    },
    evaluationApproachResult: overallApproachResult,
  };
}
