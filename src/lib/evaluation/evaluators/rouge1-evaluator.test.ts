import { describe, it, expect } from '@jest/globals';
import { EvaluationRequest } from '../types';
import { DEFAULT_ROUGE_PASS_SCORE, EvaluationApproach } from '../constants';
// Using integration tests with actual js-rouge library (no mocks).
// This approach tests the real ROUGE-1 scoring behavior rather than just orchestration logic.
import { performRouge1Evaluation } from './rouge1-evaluator';

const mockRequest: EvaluationRequest = {
  testCaseId: 'test-000',
  question: 'What is your name?',
  actualResponse: 'I am a large language model',
  expectedOutcome: 'model\nlanguage',
  evaluationParameters: {
    approach: EvaluationApproach.ROUGE_1,
    threshold: 0.5,
  },
};

const mockRequestNoThreshold: EvaluationRequest = {
  ...mockRequest,
  evaluationParameters: {
    approach: EvaluationApproach.ROUGE_1,
    threshold: undefined,
  },
};

describe('performRouge1Evaluation', () => {
  describe('Basic functionality', () => {
    it('should pass when response contains exact keyword matches', async () => {
      const request: EvaluationRequest = {
        ...mockRequest,
        actualResponse: 'This is a language model system',
        expectedOutcome: 'language\nmodel',
      };

      const result = await performRouge1Evaluation(request);

      expect(result.passed).toBe(true);
      expect(result.keywordMatches.length).toBe(2);
      expect(result.keywordMatches[0].found).toBe(true);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThan(0.5);
      expect(result.keywordMatches[1].found).toBe(true);
      expect(
        result.keywordMatches[1].evaluationApproachResult.score,
      ).toBeGreaterThan(0.5);
    });

    it('should fail when keywords are not sufficiently present', async () => {
      const request: EvaluationRequest = {
        ...mockRequest,
        actualResponse: 'This is completely unrelated content about cooking',
        expectedOutcome: 'machine learning\nartificial intelligence',
      };

      const result = await performRouge1Evaluation(request);

      expect(result.passed).toBe(false);
      expect(result.keywordMatches[0].found).toBe(false);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeLessThan(0.5);
      expect(result.keywordMatches[1].found).toBe(false);
      expect(
        result.keywordMatches[1].evaluationApproachResult.score,
      ).toBeLessThan(0.5);
    });

    it('should partially pass when only some keywords meet threshold', async () => {
      const request: EvaluationRequest = {
        ...mockRequest,
        actualResponse: 'Machine learning is fascinating',
        expectedOutcome: 'machine learning\ndatabase systems',
      };

      const result = await performRouge1Evaluation(request);

      expect(result.passed).toBe(false);
      expect(result.keywordMatches[0].found).toBe(true);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThanOrEqual(0.5);
      expect(result.keywordMatches[1].found).toBe(false);
      expect(
        result.keywordMatches[1].evaluationApproachResult.score,
      ).toBeLessThan(0.5);
    });
  });

  describe('Threshold handling', () => {
    it('should use default threshold when not provided', async () => {
      const result = await performRouge1Evaluation(mockRequestNoThreshold);

      expect(result.evaluationParameters.threshold).toBe(
        DEFAULT_ROUGE_PASS_SCORE,
      );
    });

    it('should pass all keywords with threshold 0.0', async () => {
      const request: EvaluationRequest = {
        ...mockRequest,
        actualResponse: 'completely unrelated text about cooking',
        expectedOutcome: 'quantum physics\nmathematics',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_1,
          threshold: 0.0,
        },
      };

      const result = await performRouge1Evaluation(request);

      expect(result.passed).toBe(true);
      expect(result.keywordMatches.every(m => m.found)).toBe(true);
      expect(result.evaluationParameters.threshold).toBe(0.0);
    });

    it('should fail when threshold is 1.0 and match is not perfect', async () => {
      const request: EvaluationRequest = {
        ...mockRequest,
        actualResponse: 'This is about learning concepts',
        expectedOutcome: 'machine learning',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_1,
          threshold: 1.0,
        },
      };

      const result = await performRouge1Evaluation(request);

      expect(result.evaluationParameters.threshold).toBe(1.0);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeLessThan(1.0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty actualResponse', async () => {
      const request = { ...mockRequest, actualResponse: '' };

      const result = await performRouge1Evaluation(request);

      expect(result.passed).toBe(false);
      expect(result.keywordMatches[0].evaluationApproachResult.score).toBe(0);
      expect(result.keywordMatches[1].evaluationApproachResult.score).toBe(0);
    });

    it('should handle empty expectedOutcome string', async () => {
      const request = { ...mockRequest, expectedOutcome: '' };

      const result = await performRouge1Evaluation(request);

      expect(result.passed).toBe(true);
      expect(result.keywordMatches.length).toBe(0);
    });
  });
});
