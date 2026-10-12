import { EvaluationResult, EvaluationRequest } from '../../types';
import { loadSemanticModel } from './model-loader';
import { evaluateKeywordsSemantically } from './evaluate-keywords';
import { FeatureExtractionPipeline } from '@xenova/transformers';
import { EvaluationParameters } from '../../../../types/evaluation';
import {
  DEFAULT_SEMANTIC_PASS_SCORE,
  EvaluationApproach,
} from '../../constants';

export class SemanticEvaluator {
  // TODO(LLM-39): Refactor SemanticEvaluator into a singleton pattern.
  private static extractor: FeatureExtractionPipeline = null;
  // In-flight model load, shared by every caller that arrives before it
  // settles. Without it, concurrent evaluations (Run All, multiple semantic
  // fields on one test case) each start their own load and download the
  // model again. Cleared on failure so a later call can retry.
  private static loading: Promise<FeatureExtractionPipeline> | null = null;

  async initialize(): Promise<void> {
    if (SemanticEvaluator.extractor) return;
    if (!SemanticEvaluator.loading) {
      SemanticEvaluator.loading = loadSemanticModel().then(
        extractor => {
          SemanticEvaluator.extractor = extractor;
          return extractor;
        },
        error => {
          SemanticEvaluator.loading = null;
          console.error('Failed to load semantic evaluation model:', error);
          throw error;
        },
      );
    }
    await SemanticEvaluator.loading;
  }

  async performEvaluation(
    request: EvaluationRequest,
  ): Promise<EvaluationResult> {
    const threshold =
      request.evaluationParameters?.threshold ?? DEFAULT_SEMANTIC_PASS_SCORE;

    try {
      await this.initialize();

      // Split expectedOutcome by newlines to create keywords array
      const expectedKeywords = request.expectedOutcome
        ? request.expectedOutcome
            .split(/[\n,]+/)
            .map(k => k.trim())
            .filter(k => k.length > 0)
        : [];

      const keywordMatches = await evaluateKeywordsSemantically(
        SemanticEvaluator.extractor,
        request.actualResponse,
        expectedKeywords,
        threshold,
      );

      const totalItems = keywordMatches.length;
      // calculate the overall score by averaging the score of the keyword matches
      const keywordScore = keywordMatches.reduce(
        (acc, curr) => acc + curr.evaluationApproachResult.score,
        0,
      );
      const overallScore = totalItems > 0 ? keywordScore / totalItems : 0; // to avoid division by zero
      const passed = keywordMatches.every(match => match.found);

      const evaluationParameters = {
        approach: EvaluationApproach.SEMANTIC,
        threshold,
      } as EvaluationParameters;

      return {
        testCaseId: request.testCaseId,
        passed,
        keywordMatches,
        evaluationParameters,
        evaluationApproachResult: {
          score: overallScore,
          approachUsed: EvaluationApproach.SEMANTIC,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to perform semantic evaluation:', error);
      return {
        testCaseId: request.testCaseId,
        passed: false,
        keywordMatches: [],
        evaluationParameters: {
          approach: EvaluationApproach.SEMANTIC,
          threshold,
        },
        evaluationApproachResult: {
          score: 0,
          approachUsed: EvaluationApproach.SEMANTIC,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
