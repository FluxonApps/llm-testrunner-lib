import { describe, it, expect } from '@jest/globals';

import {
  expectedOutcomeFieldSchema,
  validateExpectedOutcomeArrayWithExtractors,
} from './expected-outcome';

describe('expected outcome schemas', () => {
  it('defaults outcomeMode to static when omitted (textarea only)', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.outcomeMode).toBe('static');
    expect(data.resolutionQuery).toBeUndefined();
  });

  it('allows dynamic textarea with resolutionQuery before run fills value', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: '',
      outcomeMode: 'dynamic',
      resolutionQuery:
        'SELECT name FROM students WHERE student_id = 1',
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.outcomeMode).toBe('dynamic');
    expect(data.resolutionQuery).toBe(
      'SELECT name FROM students WHERE student_id = 1',
    );
  });

  it('rejects dynamic textarea with empty resolutionQuery', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: '',
      outcomeMode: 'dynamic',
      resolutionQuery: '   ',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].path).toEqual(['resolutionQuery']);
  });

  it('allows custom evaluationSource with a non-empty extractorId', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'text' as const,
      label: 'Tool Name',
      value: 'lookup',
      evaluationSource: {
        type: 'custom' as const,
        extractorId: 'tool-name-extractor',
      },
    });

    expect(data.evaluationSource).toEqual({
      type: 'custom',
      extractorId: 'tool-name-extractor',
    });
  });

  it('accepts evaluationParameters with an optional threshold', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'rouge-1',
        threshold: 0.8,
      },
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.evaluationParameters?.approach).toBe('rouge-1');
    expect(data.evaluationParameters?.threshold).toBe(0.8);
  });

  it('treats threshold as optional on evaluationParameters', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: { approach: 'semantic' },
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.evaluationParameters?.threshold).toBeUndefined();
  });

  it('rejects unknown custom extractorId when extractor-aware validation is used', () => {
    expect(() =>
      validateExpectedOutcomeArrayWithExtractors(
        [
          {
            type: 'text',
            label: 'Tool Name',
            value: '',
            evaluationSource: {
              type: 'custom',
              extractorId: 'missing-extractor',
            },
          },
        ],
        ['known-extractor'],
      ),
    ).toThrow('Extractor "missing-extractor" is not registered.');
  });
});

describe('expected outcome schemas — criteria (LLM Judge)', () => {
  it('accepts evaluationParameters with a valid criteria array', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        threshold: 0.7,
        criteria: [
          { id: 'correctness', description: 'Factually correct.', weight: 2 },
          { id: 'relevancy', description: 'Answers the prompt.' },
        ],
      },
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.evaluationParameters?.criteria).toHaveLength(2);
    expect(data.evaluationParameters?.criteria?.[0]).toEqual({
      id: 'correctness',
      description: 'Factually correct.',
      weight: 2,
    });
    expect(data.evaluationParameters?.criteria?.[1].weight).toBeUndefined();
  });

  it('treats criteria as optional on evaluationParameters', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: { approach: 'llm-judge' },
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.evaluationParameters?.criteria).toBeUndefined();
  });

  it('rejects a criterion with an empty id', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        criteria: [{ id: '   ', description: 'desc' }],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a criterion with an empty description', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        criteria: [{ id: 'correctness', description: '   ' }],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a criterion with weight 0', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        criteria: [{ id: 'correctness', description: 'desc', weight: 0 }],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects a criterion with a negative weight', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        criteria: [{ id: 'correctness', description: 'desc', weight: -0.5 }],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts a criterion with weight omitted (default applied later by evaluator)', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        criteria: [{ id: 'correctness', description: 'desc' }],
      },
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.evaluationParameters?.criteria?.[0].weight).toBeUndefined();
  });

  it('rejects two criteria with the same id', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'llm-judge',
        criteria: [
          { id: 'correctness', description: 'first' },
          { id: 'correctness', description: 'second' },
        ],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts criteria on a non-llm-judge approach (orphan field, not enforced at schema level)', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
      evaluationParameters: {
        approach: 'rouge-1',
        threshold: 0.7,
        criteria: [{ id: 'correctness', description: 'desc' }],
      },
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.evaluationParameters?.criteria).toHaveLength(1);
  });
});
