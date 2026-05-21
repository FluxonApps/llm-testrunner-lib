import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { performLlmJudgeEvaluation } from '../llm-judge-evaluator';
import {
  EvaluationApproach,
  DEFAULT_LLM_JUDGE_PASS_SCORE,
} from '../../../constants';
import type { EvaluationRequest } from '../../../types';
import type {
  JudgeMessage,
  JudgeResponse,
  LlmJudge,
} from '../../../../../types/llm-test-runner';

// Typed mock so `mockResolvedValue` / `mockRejectedValue` don't need `as any`.
const mockJudge = jest.fn<LlmJudge>();

function buildRequest(
  overrides: Partial<EvaluationRequest> = {},
): EvaluationRequest {
  return {
    testCaseId: 'tc-1',
    question: 'What is the capital of France?',
    expectedOutcome: 'Paris',
    actualResponse: 'The capital is Paris.',
    evaluationParameters: {
      approach: EvaluationApproach.LLM_JUDGE,
      criteria: [
        { id: 'correctness', description: 'Factually correct.', weight: 1 },
      ],
    },
    llmJudge: mockJudge,
    ...overrides,
  };
}

function judgeUserContent(): string {
  // The 2nd message is always the user message; we use this to assert what
  // was sent to the judge in flow-through tests.
  const args = mockJudge.mock.calls[0][0] as { messages: JudgeMessage[] };
  return args.messages[1].content;
}

describe('performLlmJudgeEvaluation', () => {
  beforeEach(() => {
    mockJudge.mockReset();
  });

  describe('happy path', () => {
    it('returns passed=true with the judge score when above threshold', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 0.9, reason: 'Correct.' }],
      });

      const result = await performLlmJudgeEvaluation(buildRequest());

      expect(result.passed).toBe(true);
      expect(result.evaluationApproachResult?.score).toBe(0.9);
      expect(result.evaluationApproachResult?.approachUsed).toBe(
        EvaluationApproach.LLM_JUDGE,
      );
      expect(result.error).toBeUndefined();
    });

    it('populates criterionResults with id, description, weight, score, reason', async () => {
      mockJudge.mockResolvedValue({
        criteria: [
          { id: 'correctness', score: 0.8, reason: 'Mostly correct.' },
        ],
      });

      const result = await performLlmJudgeEvaluation(buildRequest());

      expect(result.criterionResults).toEqual([
        {
          id: 'correctness',
          description: 'Factually correct.',
          weight: 1,
          score: 0.8,
          reason: 'Mostly correct.',
        },
      ]);
    });

    it('preserves input criteria order in criterionResults regardless of judge response order', async () => {
      mockJudge.mockResolvedValue({
        criteria: [
          { id: 'b', score: 0.5 },
          { id: 'a', score: 0.9 },
        ],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [
              { id: 'a', description: 'A', weight: 1 },
              { id: 'b', description: 'B', weight: 1 },
            ],
          },
        }),
      );

      expect(result.criterionResults?.map(c => c.id)).toEqual(['a', 'b']);
    });
  });

  describe('default criterion fallback', () => {
    it('uses the default correctness criterion when criteria is undefined', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 0.7 }],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
          },
        }),
      );

      expect(result.criterionResults?.[0].id).toBe('correctness');
      // The default criterion id was sent to the judge in the user prompt.
      expect(judgeUserContent()).toContain('"id": "correctness"');
    });

    it('uses the default correctness criterion when criteria is an empty array', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 0.7 }],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [],
          },
        }),
      );

      expect(result.criterionResults?.[0].id).toBe('correctness');
    });
  });

  describe('weighted average', () => {
    it('computes the weighted average correctly with uniform weights', async () => {
      mockJudge.mockResolvedValue({
        criteria: [
          { id: 'a', score: 0.6 },
          { id: 'b', score: 0.8 },
        ],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [
              { id: 'a', description: 'A', weight: 1 },
              { id: 'b', description: 'B', weight: 1 },
            ],
          },
        }),
      );

      // (0.6×1 + 0.8×1) / 2 = 0.7
      expect(result.evaluationApproachResult?.score).toBeCloseTo(0.7);
    });

    it('weights skewed criteria correctly', async () => {
      mockJudge.mockResolvedValue({
        criteria: [
          { id: 'a', score: 0.3 },
          { id: 'b', score: 0.9 },
        ],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [
              { id: 'a', description: 'A', weight: 1 },
              { id: 'b', description: 'B', weight: 3 },
            ],
          },
        }),
      );

      // (0.3×1 + 0.9×3) / 4 = 3.0 / 4 = 0.75
      expect(result.evaluationApproachResult?.score).toBeCloseTo(0.75);
    });

    it('defaults missing weight to 1', async () => {
      mockJudge.mockResolvedValue({
        criteria: [
          { id: 'a', score: 1.0 },
          { id: 'b', score: 0.0 },
        ],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [
              { id: 'a', description: 'A' },
              { id: 'b', description: 'B' },
            ],
          },
        }),
      );

      // Both default to weight 1 → (1×1 + 0×1) / 2 = 0.5
      expect(result.evaluationApproachResult?.score).toBeCloseTo(0.5);
      expect(result.criterionResults?.map(c => c.weight)).toEqual([1, 1]);
    });
  });

  describe('threshold and pass/fail', () => {
    it('passes when score >= threshold', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 0.7 }],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            threshold: 0.7,
            criteria: [{ id: 'correctness', description: 'X', weight: 1 }],
          },
        }),
      );

      expect(result.passed).toBe(true);
    });

    it('fails when score < threshold', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 0.6 }],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            threshold: 0.7,
            criteria: [{ id: 'correctness', description: 'X', weight: 1 }],
          },
        }),
      );

      expect(result.passed).toBe(false);
    });

    it('defaults to DEFAULT_LLM_JUDGE_PASS_SCORE when threshold is undefined', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 0.7 }],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [{ id: 'correctness', description: 'X', weight: 1 }],
          },
        }),
      );

      expect(result.passed).toBe(true);
      expect(result.evaluationParameters?.threshold).toBe(
        DEFAULT_LLM_JUDGE_PASS_SCORE,
      );
    });
  });

  describe('error paths', () => {
    it('returns an error result when the llmJudge callback is missing', async () => {
      const result = await performLlmJudgeEvaluation(
        buildRequest({ llmJudge: undefined }),
      );

      expect(result.passed).toBe(false);
      expect(result.evaluationApproachResult?.score).toBe(0);
      expect(result.error).toContain('llmJudge callback is required');
    });

    it('returns an error result when the judge throws', async () => {
      mockJudge.mockRejectedValue(new Error('rate limited'));

      const result = await performLlmJudgeEvaluation(buildRequest());

      expect(result.passed).toBe(false);
      expect(result.error).toContain('Judge call failed');
      expect(result.error).toContain('rate limited');
    });

    it('returns an error result when judge returns a structurally invalid response', async () => {
      mockJudge.mockResolvedValue({
        criteria: 'not an array',
      } as unknown as JudgeResponse);

      const result = await performLlmJudgeEvaluation(buildRequest());

      expect(result.passed).toBe(false);
      expect(result.error).toContain('Judge response invalid');
      // The bullet points should reference the offending field path.
      expect(result.error).toContain('criteria');
    });

    it('returns an error result when a score is out of range', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'correctness', score: 1.5 }],
      });

      const result = await performLlmJudgeEvaluation(buildRequest());

      expect(result.passed).toBe(false);
      expect(result.error).toContain('Judge response invalid');
      // The bullet point should pinpoint the score field at index 0.
      expect(result.error).toContain('score');
    });

    it('returns an error result when the judge skips a criterion id', async () => {
      mockJudge.mockResolvedValue({
        criteria: [{ id: 'a', score: 0.9 }],
      });

      const result = await performLlmJudgeEvaluation(
        buildRequest({
          evaluationParameters: {
            approach: EvaluationApproach.LLM_JUDGE,
            criteria: [
              { id: 'a', description: 'A', weight: 1 },
              { id: 'b', description: 'B', weight: 1 },
            ],
          },
        }),
      );

      expect(result.passed).toBe(false);
      expect(result.error).toContain('missing scores for criteria: b');
    });
  });

  describe('lenient on extras', () => {
    it('silently drops extra criterion ids the judge invented', async () => {
      mockJudge.mockResolvedValue({
        criteria: [
          { id: 'correctness', score: 0.9 },
          { id: 'something_invented', score: 0.4 },
        ],
      });

      const result = await performLlmJudgeEvaluation(buildRequest());

      expect(result.passed).toBe(true);
      expect(result.criterionResults).toHaveLength(1);
      expect(result.criterionResults?.[0].id).toBe('correctness');
      // Extras don't pollute the final score.
      expect(result.evaluationApproachResult?.score).toBe(0.9);
    });
  });

});
