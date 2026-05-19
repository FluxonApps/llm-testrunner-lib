import * as rouge from 'js-rouge';
import { EvaluationApproachResult } from '../../../types/evaluation';
import { EvaluationRequest, EvaluationResult, KeywordMatch } from '../types';
import { DEFAULT_ROUGE_PASS_SCORE, EvaluationApproach } from '../constants';

function evaluateKeyword(
  keyword: string,
  candidate: string,
  rougeThreshold: number,
): KeywordMatch {
  let rougeLScore = 0;

  try {
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword.length > 0 && candidate.length > 0) {
      const referenceTokens = trimmedKeyword.toLowerCase().split(/\s+/);
      const candidateTokens = candidate.toLowerCase().split(/\s+/);

      if (
        referenceTokens.length === 1 &&
        candidateTokens.includes(referenceTokens[0])
      ) {
        rougeLScore = 1;
      } else {
        const lcsResult = rouge.lcs(candidateTokens, referenceTokens);
        const lcsLength =
          typeof lcsResult === 'number' ? lcsResult : (lcsResult?.length ?? 0);

        const recall =
          referenceTokens.length > 0 ? lcsLength / referenceTokens.length : 0;
        const precision =
          candidateTokens.length > 0 ? lcsLength / candidateTokens.length : 0;
        const denominator = precision + recall;

        const f1Score =
          denominator > 0 ? (2 * precision * recall) / denominator : 0;
        rougeLScore = f1Score;
      }
    } else {
      console.warn(
        `ROUGE-L not computed for keyword "${keyword}": Keyword or candidate missing.`,
      );
    }
  } catch (err) {
    console.error(`ROUGE-L computation failed for keyword "${keyword}":`, err);
  }

  const keywordPassed = rougeLScore >= rougeThreshold;

  const keywordApproachResult: EvaluationApproachResult = {
    score: rougeLScore,
    approachUsed: EvaluationApproach.ROUGE_L,
  };

  return {
    keyword,
    found: keywordPassed,
    evaluationApproachResult: keywordApproachResult,
  };
}

export function performRougeLEvaluation(
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
  const rougeThreshold =
    evaluationParameters.threshold ?? DEFAULT_ROUGE_PASS_SCORE;

  let keywordsPassed = 0;
  const totalKeywords = expectedKeywords.length;

  const keywordMatches: KeywordMatch[] = expectedKeywords.map(keyword => {
    const match = evaluateKeyword(keyword, candidate, rougeThreshold);
    if (match.found) keywordsPassed++;
    return match;
  });

  const overallPassed = keywordsPassed === totalKeywords;

  const overallApproachResult: EvaluationApproachResult = {
    score: totalKeywords > 0 ? keywordsPassed / totalKeywords : 1,
    approachUsed: EvaluationApproach.ROUGE_L,
  };

  return {
    testCaseId,
    passed: overallPassed,
    keywordMatches,
    timestamp: new Date().toISOString(),
    evaluationParameters: {
      ...evaluationParameters,
      threshold: rougeThreshold,
    },
    evaluationApproachResult: overallApproachResult,
  };
}
