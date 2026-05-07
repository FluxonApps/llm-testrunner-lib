import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// The semantic evaluator transitively imports `@xenova/transformers`, an ESM
// module Jest cannot parse without extra config. We don't exercise the
// semantic path in this spec, so stub the module — `jest.mock` is hoisted
// above the engine import below by babel-jest.
jest.mock('./evaluators/semantic/index', () => ({
  performSemanticEvaluation: jest.fn(),
}));

import { LLMEvaluationEngine } from './evaluation-engine';
import { EvaluationApproach } from './constants';
import type {
  EvaluationRequestV2,
  EvaluationResult,
  FieldEvaluationInput,
} from './types';
import type {
  JudgeMessage,
  LlmJudge,
} from '../../types/llm-test-runner';

const mockJudge = jest.fn<LlmJudge>();

function buildField(
  overrides: Partial<FieldEvaluationInput> = {},
): FieldEvaluationInput {
  return {
    index: 0,
    label: 'Expected Outcome',
    type: 'textarea',
    expectedValue: 'Paris',
    actualResponse: 'The capital is Paris.',
    evaluationParameters: {
      approach: EvaluationApproach.LLM_JUDGE,
      criteria: [
        { id: 'correctness', description: 'Factually correct.', weight: 1 },
      ],
    },
    ...overrides,
  };
}

function buildRequest(
  overrides: Partial<EvaluationRequestV2> = {},
): EvaluationRequestV2 {
  return {
    testCaseId: 'tc-1',
    question: 'What is the capital of France?',
    fields: [buildField()],
    llmJudge: mockJudge,
    ...overrides,
  };
}

async function runEngine(
  engine: LLMEvaluationEngine,
  request: EvaluationRequestV2,
): Promise<EvaluationResult> {
  return new Promise<EvaluationResult>(resolve => {
    void engine.evaluateResponse(request, resolve);
  });
}

describe('LLMEvaluationEngine — llm-judge dispatch', () => {
  let engine: LLMEvaluationEngine;

  beforeEach(() => {
    engine = new LLMEvaluationEngine();
    mockJudge.mockReset();
  });

  it('routes the LLM_JUDGE approach to the llm-judge evaluator', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.9 }],
    });

    const result = await runEngine(engine, buildRequest());

    expect(
      result.fieldResults?.[0].evaluationApproachResult.approachUsed,
    ).toBe(EvaluationApproach.LLM_JUDGE);
    expect(result.fieldResults?.[0].evaluationApproachResult.score).toBe(0.9);
  });

  it('plumbs the llmJudge callback through V2 → V1 → evaluator', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.9 }],
    });

    await runEngine(engine, buildRequest());

    // The mock callback was invoked, proving the V2 → field-request → evaluator
    // plumbing wired the reference all the way through.
    expect(mockJudge).toHaveBeenCalledTimes(1);
  });

  it('plumbs chatHistory from V2 into the prompt sent to the judge', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.9 }],
    });

    await runEngine(
      engine,
      buildRequest({ chatHistory: 'user: hi\nassistant: hello' }),
    );

    const args = mockJudge.mock.calls[0][0] as { messages: JudgeMessage[] };
    expect(args.messages[1].content).toContain(
      'CHAT_HISTORY:\nuser: hi\nassistant: hello',
    );
  });

  it('plumbs additionalContext from V2 into the prompt sent to the judge', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.9 }],
    });

    await runEngine(
      engine,
      buildRequest({
        additionalContext: 'Wikipedia snippet about France.',
      }),
    );

    const args = mockJudge.mock.calls[0][0] as { messages: JudgeMessage[] };
    expect(args.messages[1].content).toContain(
      'ADDITIONAL_CONTEXT:\nWikipedia snippet about France.',
    );
  });

  it('maps EvaluationResult.error onto FieldEvaluationResult.error', async () => {
    mockJudge.mockRejectedValue(new Error('rate limited'));

    const result = await runEngine(engine, buildRequest());

    expect(result.fieldResults?.[0].error).toContain('rate limited');
    expect(result.fieldResults?.[0].passed).toBe(false);
  });

  it('aggregates passed=false when any field has an error, even if another passes', async () => {
    mockJudge
      .mockResolvedValueOnce({ criteria: [{ id: 'correctness', score: 0.9 }] })
      .mockRejectedValueOnce(new Error('boom'));

    const result = await runEngine(
      engine,
      buildRequest({
        fields: [buildField({ index: 0 }), buildField({ index: 1 })],
      }),
    );

    expect(result.passed).toBe(false);
    expect(result.fieldResults?.[0].passed).toBe(true);
    expect(result.fieldResults?.[0].error).toBeUndefined();
    expect(result.fieldResults?.[1].passed).toBe(false);
    expect(result.fieldResults?.[1].error).toContain('boom');
  });
});
