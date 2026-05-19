import { jest, describe, it, expect } from '@jest/globals';
import { performRougeLEvaluation } from './rougeL-evaluator';
import { EvaluationRequest } from '../types';
import { DEFAULT_ROUGE_PASS_SCORE, EvaluationApproach } from '../constants';

describe('performRougeLEvaluation', () => {
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
        approach: EvaluationApproach.ROUGE_L,
        threshold: DEFAULT_ROUGE_PASS_SCORE,
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
    it('should return a valid EvaluationResult structure', () => {
      const request = createRequest({
        actualResponse: 'AI stands for artificial intelligence',
        expectedOutcome: 'artificial intelligence',
      });

      const result = performRougeLEvaluation(request);

      expect(result).toMatchObject({
        testCaseId: 'test-001',
        passed: expect.any(Boolean),
        keywordMatches: expect.any(Array),
        timestamp: expect.any(String),
        evaluationParameters: expect.any(Object),
        evaluationApproachResult: expect.any(Object),
      });
    });

    it('should use default threshold when not provided', () => {
      const request = createRequest({
        evaluationParameters: { approach: EvaluationApproach.ROUGE_L },
      });

      const result = performRougeLEvaluation(request);

      expect(result.evaluationParameters.threshold).toBe(
        DEFAULT_ROUGE_PASS_SCORE,
      );
    });

    it('should use provided threshold when specified', () => {
      const customThreshold = 0.85;
      const request = createRequest({
        actualResponse: 'response',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_L,
          threshold: customThreshold,
        },
      });

      const result = performRougeLEvaluation(request);

      expect(result.evaluationParameters.threshold).toBe(customThreshold);
    });
  });

  describe('single keyword evaluation', () => {
    it('should pass when single-word keyword is found in candidate', () => {
      const request = createRequest({
        expectedOutcome: 'machine',
        actualResponse: 'This is about machine learning',
      });

      const result = performRougeLEvaluation(request);

      expect(result).toMatchObject({
        passed: true,
        keywordMatches: [
          {
            keyword: 'machine',
            found: true,
            evaluationApproachResult: {
              score: 1,
              approachUsed: EvaluationApproach.ROUGE_L,
            },
          },
        ],
      });
    });

    it('should fail when single-word keyword is not found in candidate', () => {
      const request = createRequest({
        expectedOutcome: 'quantum',
        actualResponse: 'This is about machine learning',
      });

      const result = performRougeLEvaluation(request);

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
    });

    it('should calculate ROUGE-L score for multi-word keywords', () => {
      const request = createRequest({
        expectedOutcome: 'machine learning',
        actualResponse: 'AI and machine learning are related',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_L,
          threshold: 0.5,
        },
      });

      const result = performRougeLEvaluation(request);

      expect(result).toMatchObject({
        keywordMatches: [
          {
            found: true,
            evaluationApproachResult: {
              score: expect.closeTo(0.5),
              approachUsed: EvaluationApproach.ROUGE_L,
            },
          },
        ],
      });
    });

    it('should handle LCS result as object with length property', () => {
      const request = createRequest({
        expectedOutcome: 'deep learning',
        actualResponse: 'Deep learning is a subset of machine learning',
      });

      const result = performRougeLEvaluation(request);

      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThan(0);
    });
  });

  describe('multiple keywords evaluation', () => {
    it('should pass when all keywords meet threshold', () => {
      const request = createRequest({
        expectedOutcome: 'machine\nlearning\nAI',
        actualResponse:
          'Machine learning and AI are transformative technologies',
      });

      const result = performRougeLEvaluation(request);

      expect(result).toMatchObject({
        passed: true,
        evaluationApproachResult: {
          score: 1,
          approachUsed: EvaluationApproach.ROUGE_L,
        },
      });
      expect(result.keywordMatches).toHaveLength(3);
      expect(result.keywordMatches.every(match => match.found)).toBe(true);
    });

    it('should fail when not all keywords meet threshold', () => {
      const request = createRequest({
        expectedOutcome: 'machine\nquantum\nAI',
        actualResponse: 'Machine learning and AI are transformative',
      });

      const result = performRougeLEvaluation(request);

      expect(result.passed).toBe(false);
      expect(result.keywordMatches).toHaveLength(3);
      expect(result.keywordMatches.filter(match => match.found)).toHaveLength(
        2,
      );
      expect(result.evaluationApproachResult.score).toBeCloseTo(2 / 3);
    });

    it('should calculate overall score as ratio of passed keywords', () => {
      const request = createRequest({
        expectedOutcome: 'alpha\nbeta\ngamma\ndelta',
        actualResponse: 'alpha and beta are here',
      });

      const result = performRougeLEvaluation(request);

      expect(result).toMatchObject({
        passed: false,
        evaluationApproachResult: {
          score: 0.5, // 2 out of 4
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty keywords array', () => {
      const request = createRequest({
        expectedOutcome: '',
        actualResponse: 'Some response',
      });

      const result = performRougeLEvaluation(request);

      expect(result).toMatchObject({
        passed: true,
        keywordMatches: [],
        evaluationApproachResult: {
          score: 1,
        },
      });
    });

    it('should handle empty actual response', () => {
      const request = createRequest({
        expectedOutcome: 'machine',
        actualResponse: '',
      });

      // Suppress expected warning
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = performRougeLEvaluation(request);

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

    it('should handle whitespace-only keyword', () => {
      const request = createRequest({
        expectedOutcome: '   ',
        actualResponse: 'Some response',
      });

      // Suppress expected warning
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = performRougeLEvaluation(request);

      expect(result.keywordMatches[0]).toMatchObject({
        found: false,
        evaluationApproachResult: {
          score: 0,
        },
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle null/undefined actualResponse gracefully', () => {
      const request = createRequest({
        expectedOutcome: 'machine',
        actualResponse: null as unknown as string,
      });

      // Suppress expected warning
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const result = performRougeLEvaluation(request);

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

  describe('case insensitivity', () => {
    it('should perform case-insensitive matching', () => {
      const request = createRequest({
        expectedOutcome: 'MACHINE',
        actualResponse: 'machine learning is important',
      });

      const result = performRougeLEvaluation(request);

      expect(result.keywordMatches[0]).toMatchObject({
        found: true,
        evaluationApproachResult: {
          score: 1,
        },
      });
    });

    it('should match keywords with mixed case', () => {
      const request = createRequest({
        expectedOutcome: 'MaChInE LeArNiNg',
        actualResponse: 'MACHINE LEARNING is a field of AI',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_L,
          threshold: 0.4,
        }, // Lower threshold for real ROUGE-L behavior
      });

      const result = performRougeLEvaluation(request);

      expect(result.keywordMatches[0]).toMatchObject({
        found: true,
      });
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('ROUGE-L score calculation', () => {
    it('should calculate correct F-score from precision and recall', () => {
      const request = createRequest({
        expectedOutcome: 'neural network',
        actualResponse: 'A neural network processes data',
      });

      const result = performRougeLEvaluation(request);

      // With actual ROUGE-L: both words 'neural' and 'network' are found
      // LCS length = 2, reference length = 2, candidate length = 5
      // recall = 2/2 = 1.0, precision = 2/5 = 0.4
      // F-score = 2 * (1.0 * 0.4) / (1.0 + 0.4) ≈ 0.571
      const expectedFScore = (2 * 1.0 * 0.4) / (1.0 + 0.4);
      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeCloseTo(expectedFScore, 2);
    });

    it('should handle partial matches', () => {
      const request = createRequest({
        expectedOutcome: 'artificial intelligence systems',
        actualResponse: 'Artificial intelligence is growing',
        evaluationParameters: {
          approach: EvaluationApproach.ROUGE_L,
          threshold: 0.5,
        },
      });

      const result = performRougeLEvaluation(request);

      // With actual ROUGE-L: 'artificial' and 'intelligence' are found, 'systems' is not
      // LCS length = 2, reference length = 3, candidate length = 4
      // recall = 2/3, precision = 2/4 = 0.5
      const recall = 2 / 3;
      const precision = 2 / 4;
      const expectedFScore = (2 * precision * recall) / (precision + recall);

      expect(
        result.keywordMatches[0].evaluationApproachResult.score,
      ).toBeCloseTo(expectedFScore, 2);
    });
  });

  describe('timestamp', () => {
    it('should include a valid ISO timestamp', () => {
      const request = createRequest({
        expectedOutcome: 'test',
        actualResponse: 'test response',
      });

      const result = performRougeLEvaluation(request);

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp!).toISOString()).toBe(result.timestamp);
    });
  });
});
