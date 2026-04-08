import { describe, it, expect, jest } from '@jest/globals';

import type { TestCase } from '../../types/llm-test-runner';
import type { ExpectedOutcomeResolver } from './dynamic-expected-outcome-resolver';
import {
  MISSING_RESOLVER_MESSAGE,
  resolveDynamicExpectedOutcomes,
} from './dynamic-expected-outcome-resolver';

function baseCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: 't1',
    question: 'Q?',
    expectedOutcome: [
      {
        type: 'textarea',
        label: 'A',
        value: '',
        outcomeMode: 'static',
      },
    ],
    chatHistory: { enabled: false, value: '' },
    ...overrides,
  };
}

describe('resolveDynamicExpectedOutcomes', () => {
  it('returns the same instance when there is no dynamic textarea', async () => {
    const tc = baseCase();
    const out = await resolveDynamicExpectedOutcomes(tc);
    expect(out).toBe(tc);
  });

  it('throws when dynamic fields exist but resolver is omitted', async () => {
    const tc = baseCase({
      expectedOutcome: [
        {
          type: 'textarea',
          label: 'Dyn',
          value: '',
          outcomeMode: 'dynamic',
          resolutionQuery: 'q1',
        },
      ],
    });
    await expect(resolveDynamicExpectedOutcomes(tc)).rejects.toThrow(
      MISSING_RESOLVER_MESSAGE,
    );
  });

  it('calls resolver and writes resolved value on the dynamic textarea', async () => {
    const tc = baseCase({
      expectedOutcome: [
        {
          type: 'textarea',
          label: 'Dyn',
          value: '',
          outcomeMode: 'dynamic',
          resolutionQuery: 'SELECT 1',
        },
      ],
    });
    const resolver = jest.fn() as jest.MockedFunction<ExpectedOutcomeResolver>;
    resolver.mockResolvedValue('from-db');
    const out = await resolveDynamicExpectedOutcomes(tc, resolver);

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith('SELECT 1', {
      testCase: tc,
      fieldIndex: 0,
    });
    expect(out.expectedOutcome?.[0]).toMatchObject({
      type: 'textarea',
      outcomeMode: 'dynamic',
      value: 'from-db',
    });
    expect(out).not.toBe(tc);
  });

  it('resolves several dynamic textareas by index when another field sits between them', async () => {
    const tc = baseCase({
      expectedOutcome: [
        {
          type: 'textarea',
          label: 'D0',
          value: '',
          outcomeMode: 'dynamic',
          resolutionQuery: 'a',
        },
        {
          type: 'chips-input',
          label: 'C',
          value: ['x'],
        },
        {
          type: 'textarea',
          label: 'D2',
          value: '',
          outcomeMode: 'dynamic',
          resolutionQuery: 'b',
        },
      ],
    });
    const resolver = jest.fn() as jest.MockedFunction<ExpectedOutcomeResolver>;
    resolver.mockImplementation(async (q, ctx) => `${q}:${ctx.fieldIndex}`);

    const out = await resolveDynamicExpectedOutcomes(tc, resolver);

    expect(resolver).toHaveBeenCalledTimes(2);
    expect(resolver).toHaveBeenCalledWith('a', { testCase: tc, fieldIndex: 0 });
    expect(resolver).toHaveBeenCalledWith('b', { testCase: tc, fieldIndex: 2 });
    expect(out.expectedOutcome?.[0]).toMatchObject({ value: 'a:0' });
    expect(out.expectedOutcome?.[1]).toMatchObject({ type: 'chips-input' });
    expect(out.expectedOutcome?.[2]).toMatchObject({ value: 'b:2' });
  });

  it('does not invoke resolver for static textarea or non-textarea fields', async () => {
    const tc = baseCase({
      expectedOutcome: [
        {
          type: 'textarea',
          label: 'Static',
          value: 'keep',
          outcomeMode: 'static',
        },
        {
          type: 'select',
          label: 'S',
          options: ['a'],
          value: 'a',
        },
      ],
    });
    const resolver = jest.fn() as jest.MockedFunction<ExpectedOutcomeResolver>;
    const out = await resolveDynamicExpectedOutcomes(tc, resolver);
    expect(resolver).not.toHaveBeenCalled();
    expect(out).toBe(tc);
  });
});
