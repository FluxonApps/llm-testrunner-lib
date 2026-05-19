import { bleu } from 'bleu-score';
import { EvaluationApproachResult } from '../../../../types/evaluation';
import { EvaluationRequest, EvaluationResult, KeywordMatch } from '../../types';
import { DEFAULT_BLEU_PASS_SCORE, EvaluationApproach } from '../../constants';

/**
 * Normalizes text by converting to lowercase and normalizing whitespace.
 * Also removes punctuation that would interfere with n-gram matching.
 *
 * @param {string} text - The text to normalize
 * @returns {string} The normalized text
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:()]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' '); // Replace multiple whitespace with single space
}

/**
 * Evaluates a single keyword against the candidate text using BLEU score.
 *
 * @param {string} keyword - The expected keyword (reference text)
 * @param {string} candidate - The actual response text (candidate text)
 * @param {number} bleuThreshold - The minimum BLEU score required to pass
 * @returns {KeywordMatch} The evaluation result for this keyword
 */
function evaluateKeyword(
  keyword: string,
  candidate: string,
  bleuThreshold: number,
): KeywordMatch {
  let bleuScore = 0;

  try {
    const normalizedKeyword = normalizeText(keyword);
    const normalizedCandidate = normalizeText(candidate);

    if (normalizedKeyword.length > 0 && normalizedCandidate.length > 0) {
      // BLEU function signature: bleu(reference, candidate, maxN)
      // reference: the expected keyword (ground truth)
      // candidate: the actual response text
      // maxN: maximum n-gram order (typically 4 for standard BLEU)
      // Adjust maxN based on keyword length - it should not exceed the number of words in the keyword
      const keywordTokens = normalizedKeyword.split(/\s+/).length;
      const maxN = Math.min(4, Math.max(1, keywordTokens)); // Use up to 4-grams, but respect keyword length
      const bleuResult = bleu(normalizedKeyword, normalizedCandidate, maxN);
      bleuScore = isNaN(bleuResult) ? 0 : bleuResult;
    } else {
      console.warn(
        `BLEU not computed for keyword "${keyword}": Keyword or Candidate is missing.`,
      );
    }
  } catch (err) {
    console.error(`BLEU computation failed for keyword "${keyword}":`, err);
  }

  const keywordPassed = bleuScore >= bleuThreshold;

  const keywordApproachResult: EvaluationApproachResult = {
    score: bleuScore,
    approachUsed: EvaluationApproach.BLEU,
  };

  return {
    keyword: keyword,
    found: keywordPassed,
    evaluationApproachResult: keywordApproachResult,
  };
}

/**
 * Computes the BLEU score for keywords against the candidate text.
 *
 * BLEU measures the precision of n-grams (typically 1-4 grams) between the candidate
 * and reference text. A score of 1.0 indicates perfect match.
 *
 * @example
 * const match = performBleuEvaluation({
 *   testCaseId: 'test-1',
 *   question: 'What is the capital?',
 *   expectedKeywords: ['Paris'],
 *   actualResponse: 'The capital is Paris.',
 *   evaluationParameters: { approach: 'bleu', threshold: 0.7 }
 * });
 * // Returns evaluation result with BLEU scores for each keyword
 */

export function performBleuEvaluation(
  request: EvaluationRequest,
): EvaluationResult {
  const { testCaseId, actualResponse, expectedOutcome, evaluationParameters } =
    request;

  // Split expectedOutcome by newlines, commas, and periods to create keywords array
  let expectedKeywords = expectedOutcome
    ? expectedOutcome
        .split(/[\n,.]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0)
    : [];

  // If no keywords after filtering (e.g., whitespace-only input), treat the original input as a single keyword
  if (expectedKeywords.length === 0 && expectedOutcome) {
    expectedKeywords = [expectedOutcome];
  }

  const candidate = (actualResponse || '').trim();
  const bleuThreshold =
    evaluationParameters.threshold ?? DEFAULT_BLEU_PASS_SCORE;

  let keywordsPassed = 0;
  const totalKeywords = expectedKeywords.length;

  const keywordMatches: KeywordMatch[] = expectedKeywords.map(keyword => {
    const match = evaluateKeyword(keyword, candidate, bleuThreshold);

    if (match.found) {
      keywordsPassed++;
    }

    return match;
  });

  const overallPassed = keywordsPassed === totalKeywords;

  const overallApproachResult: EvaluationApproachResult = {
    score: totalKeywords > 0 ? keywordsPassed / totalKeywords : 1,
    approachUsed: EvaluationApproach.BLEU,
  };

  return {
    testCaseId: testCaseId,
    passed: overallPassed,
    keywordMatches: keywordMatches,
    timestamp: new Date().toISOString(),
    evaluationParameters: {
      ...evaluationParameters,
      threshold: bleuThreshold,
    },
    evaluationApproachResult: overallApproachResult,
  };
}
