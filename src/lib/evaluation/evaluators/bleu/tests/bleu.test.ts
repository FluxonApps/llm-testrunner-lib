import { jest, describe, it, expect } from '@jest/globals';
import { performBleuEvaluation } from '../bleu-evaluator';
import { EvaluationRequest } from '../../../types';
import {
  DEFAULT_BLEU_PASS_SCORE,
  EvaluationApproach,
} from '../../../constants';

describe('performBleuEvaluation', () => {
  // Helper function to create a base request with optional overrides
  const createRequest = (
    overrides: Partial<EvaluationRequest> = {},
  ): EvaluationRequest => {
    const defaults: EvaluationRequest = {
      testCaseId: 'test-001',
      question: 'Test question',
      expectedOutcome: 'keyword',
      actualResponse: 'response with keyword',
      evaluationParameters: {
        approach: EvaluationApproach.BLEU,
        threshold: DEFAULT_BLEU_PASS_SCORE,
      },
    };

    return {
      ...defaults,
      ...overrides,
      evaluationParameters: {
        ...defaults.evaluationParameters,
        ...overrides.evaluationParameters,
      },
    };
  };

  describe('basic functionality', () => {
    it('should return a valid EvaluationResult structure', async () => {
      const request = createRequest({
        actualResponse: 'AI stands for artificial intelligence',
        expectedOutcome: 'artificial intelligence',
      });

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        testCaseId: 'test-001',
        passed: expect.any(Boolean),
        keywordMatches: expect.any(Array),
        timestamp: expect.any(String),
        evaluationParameters: expect.any(Object),
        evaluationApproachResult: expect.any(Object),
      });
    });

    it('should use default threshold when not provided', async () => {
      const request = createRequest({
        expectedOutcome: 'test evaluation system works',
        actualResponse: 'test evaluation system works well',
        evaluationParameters: { approach: EvaluationApproach.BLEU },
      });

      const result = performBleuEvaluation(request);

      expect(result.evaluationParameters.threshold).toBe(
        DEFAULT_BLEU_PASS_SCORE,
      );
    });

    it('should use provided threshold when specified', async () => {
      const customThreshold = 0.85;
      const request = createRequest({
        actualResponse: 'response text with multiple words',
        expectedOutcome: 'response text with multiple',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: customThreshold,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result.evaluationParameters.threshold).toBe(customThreshold);
    });
  });

  describe('single keyword evaluation', () => {
    it('should pass when keyword with 4+ words matches exactly', async () => {
      const request = createRequest({
        expectedOutcome: 'the machine learning algorithm works',
        actualResponse: 'the machine learning algorithm works',
      });

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        passed: true,
        keywordMatches: [
          {
            keyword: 'the machine learning algorithm works',
            found: true,
            evaluationApproachResult: {
              score: expect.any(Number),
              approachUsed: EvaluationApproach.BLEU,
            },
          },
        ],
      });
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThanOrEqual(0.7);
    });

    it('should pass when keyword with 4+ words is found with high n-gram overlap', async () => {
      const request = createRequest({
        expectedOutcome: 'the cat sat on',
        actualResponse: 'the cat sat on the mat',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.5,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result.keywordMatches[0]).toMatchObject({
        found: true,
        evaluationApproachResult: {
          score: expect.any(Number),
          approachUsed: EvaluationApproach.BLEU,
        },
      });
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThan(0);
    });

    it('should fail when keyword has low n-gram overlap', async () => {
      const request = createRequest({
        expectedOutcome: 'quantum physics research continues',
        actualResponse: 'This is about machine learning algorithms',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.7,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        passed: false,
        keywordMatches: [
          {
            found: false,
            evaluationApproachResult: {
              score: expect.any(Number),
            },
          },
        ],
      });
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeLessThan(0.7);
    });
  });

  describe('4-gram limitation', () => {
    it('should fail when keyword has fewer than 4 words', async () => {
      const request = createRequest({
        expectedOutcome: 'machine learning',
        actualResponse: 'machine learning is important',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.7,
        },
      });

      const result = performBleuEvaluation(request);

      // BLEU uses 4-gram matching, so keywords with fewer than 4 words will have very low scores
      expect(result.passed).toBe(false);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeLessThan(0.7);
    });

    it('should work correctly with 4-word keywords', async () => {
      const request = createRequest({
        expectedOutcome: 'the cat sat on',
        actualResponse: 'the cat sat on the mat',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.5,
        },
      });

      const result = performBleuEvaluation(request);

      // 4-word keywords can produce proper 4-gram BLEU scores
      expect(result.keywordMatches[0].found).toBe(true);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThan(0);
    });
  });

  describe('multiple keywords evaluation', () => {
    it('should pass when all keywords meet threshold', async () => {
      const request = createRequest({
        expectedOutcome:
          'Machine learning algorithms work. Artificial intelligence systems are. Neural network models perform.',
        actualResponse:
          'Machine learning algorithms work. Artificial intelligence systems are. Neural network models perform.',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.15,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        passed: true,
        evaluationApproachResult: {
          score: 1,
          approachUsed: EvaluationApproach.BLEU,
        },
      });
      expect(result.keywordMatches).toHaveLength(3);
      expect(result.keywordMatches.every(match => match.found)).toBe(true);
    });

    it('should fail when not all keywords meet threshold', async () => {
      const request = createRequest({
        expectedOutcome:
          'machine learning algorithms work\nquantum computing research continues\nartificial intelligence systems',
        actualResponse:
          'Machine learning algorithms work. Artificial intelligence systems are growing.',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.7,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result.passed).toBe(false);
      expect(result.keywordMatches).toHaveLength(3);
      const foundCount = result.keywordMatches.filter(
        match => match.found,
      ).length;
      expect(foundCount).toBeLessThan(3);
      expect(result.evaluationApproachResult.score).toBe(foundCount / 3);
    });

    it('should calculate overall score as ratio of passed keywords', async () => {
      const request = createRequest({
        expectedOutcome:
          'alpha beta gamma delta\nepsilon zeta eta theta\niota kappa lambda mu\nnu xi omicron pi',
        actualResponse:
          'alpha beta gamma delta and epsilon zeta eta theta are here',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.3,
        },
      });

      const result = performBleuEvaluation(request);

      const foundCount = result.keywordMatches.filter(
        match => match.found,
      ).length;
      expect(result).toMatchObject({
        passed: false,
        evaluationApproachResult: {
          score: foundCount / 4,
        },
      });
    });
  });

  describe('threshold handling', () => {
    it('should pass all keywords with threshold 0.0', async () => {
      const request = createRequest({
        actualResponse: 'completely unrelated text about cooking',
        expectedOutcome:
          'quantum physics research continues\nmathematics and statistics are',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.0,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result.passed).toBe(true);
      expect(result.keywordMatches.every(m => m.found)).toBe(true);
      expect(result.evaluationParameters.threshold).toBe(0.0);
    });

    it('should fail when threshold is 1.0 and match is not perfect', async () => {
      const request = createRequest({
        actualResponse: 'This is about machine learning concepts',
        expectedOutcome: 'machine learning algorithms work well',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 1.0,
        },
      });

      const result = performBleuEvaluation(request);

      expect(result.evaluationParameters.threshold).toBe(1.0);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeLessThan(1.0);
      expect(result.keywordMatches[0].found).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty keywords array', async () => {
      const request = createRequest({
        expectedOutcome: '',
        actualResponse: 'Some response',
      });

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        passed: true,
        keywordMatches: [],
        evaluationApproachResult: {
          score: 1,
        },
      });
    });

    it('should handle empty actual response', async () => {
      const request = createRequest({
        expectedOutcome: 'machine learning algorithms work',
        actualResponse: '',
      });

      // Suppress expected warning
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        passed: false,
        keywordMatches: [
          {
            found: false,
            evaluationApproachResult: {
              score: 0,
            },
          },
        ],
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle whitespace-only keyword', async () => {
      const request = createRequest({
        expectedOutcome: '   ',
        actualResponse: 'Some response',
      });

      // Suppress expected warning
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = performBleuEvaluation(request);

      expect(result.keywordMatches[0]).toMatchObject({
        found: false,
        evaluationApproachResult: {
          score: 0,
        },
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle null/undefined actualResponse gracefully', async () => {
      const request = createRequest({
        expectedOutcome: 'machine learning algorithms work',
        actualResponse: null as unknown as string,
      });

      // Suppress expected warning
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = performBleuEvaluation(request);

      expect(result).toMatchObject({
        passed: false,
        keywordMatches: [
          {
            found: false,
          },
        ],
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('BLEU score calculation', () => {
    it('should calculate BLEU score for partial match', async () => {
      const request = createRequest({
        expectedOutcome: 'the cat sat on the mat',
        actualResponse: 'the cat sat on',
        evaluationParameters: {
          approach: EvaluationApproach.BLEU,
          threshold: 0.3,
        },
      });

      const result = performBleuEvaluation(request);

      // Partial match should have lower BLEU score than perfect match
      const score = result.keywordMatches[0].evaluationApproachResult.score;
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('timestamp', () => {
    it('should include a valid ISO timestamp', async () => {
      const request = createRequest({
        expectedOutcome: 'test evaluation system works',
        actualResponse: 'test evaluation system works well',
      });

      const result = performBleuEvaluation(request);

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp!).toISOString()).toBe(result.timestamp);
    });
  });
});
