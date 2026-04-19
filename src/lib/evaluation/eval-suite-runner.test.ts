import { describe, it, expect } from '@jest/globals';
import {
  parseEvalSuite,
  runEvalCase,
  runEvalSuite,
  EvalCase,
  EvalSuite,
} from './eval-suite-runner';

// ── parseEvalSuite ──────────────────────────────────────────────────────────

describe('parseEvalSuite', () => {
  it('should parse a valid suite JSON', () => {
    const json = JSON.stringify({
      suite: 'test-suite',
      evals: [
        {
          id: 1,
          actual: 'hello world',
          expected: [{ value: 'hello', approach: 'exact' }],
        },
      ],
    });

    const suite = parseEvalSuite(json);

    expect(suite.suite).toBe('test-suite');
    expect(suite.evals).toHaveLength(1);
    expect(suite.evals[0].id).toBe(1);
  });

  it('should throw on invalid JSON string', () => {
    expect(() => parseEvalSuite('not json')).toThrow();
  });

  it('should throw on missing required fields', () => {
    const json = JSON.stringify({ suite: 'bad' });
    expect(() => parseEvalSuite(json)).toThrow();
  });

  it('should throw on empty evals array', () => {
    const json = JSON.stringify({ evals: [] });
    expect(() => parseEvalSuite(json)).toThrow();
  });

  it('should throw on invalid approach value', () => {
    const json = JSON.stringify({
      evals: [
        {
          id: 1,
          actual: 'text',
          expected: [{ value: 'text', approach: 'invalid-approach' }],
        },
      ],
    });
    expect(() => parseEvalSuite(json)).toThrow();
  });

  it('should allow suite name to be omitted', () => {
    const json = JSON.stringify({
      evals: [
        {
          id: 'a',
          actual: 'text',
          expected: [{ value: 'text', approach: 'exact' }],
        },
      ],
    });

    const suite = parseEvalSuite(json);
    expect(suite.suite).toBeUndefined();
  });
});

// ── runEvalCase ─────────────────────────────────────────────────────────────

describe('runEvalCase', () => {
  it('should pass when actual matches expected (exact)', async () => {
    const evalCase: EvalCase = {
      id: 'test-1',
      actual: 'The quick brown fox jumps over the lazy dog',
      expected: [{ value: 'quick brown fox', approach: 'exact' }],
    };

    const result = await runEvalCase(evalCase);

    expect(result.passed).toBe(true);
    expect(result.id).toBe('test-1');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].score).toBe(1);
    expect(result.fields[0].keywordScores).toHaveLength(1);
    expect(result.fields[0].keywordScores[0].keyword).toBe('quick brown fox');
    expect(result.fields[0].keywordScores[0].passed).toBe(true);
  });

  it('should fail when actual does not match expected', async () => {
    const evalCase: EvalCase = {
      id: 'test-2',
      actual: 'completely unrelated text about cooking',
      expected: [{ value: 'quantum physics', approach: 'exact' }],
    };

    const result = await runEvalCase(evalCase);

    expect(result.passed).toBe(false);
    expect(result.fields[0].passed).toBe(false);
    expect(result.fields[0].score).toBe(0);
  });

  it('should require all expected fields to pass', async () => {
    const evalCase: EvalCase = {
      id: 'test-3',
      actual: 'machine learning is fascinating',
      expected: [
        { value: 'machine learning', approach: 'exact' },
        { value: 'deep neural networks', approach: 'exact' },
      ],
    };

    const result = await runEvalCase(evalCase);

    expect(result.passed).toBe(false);
    expect(result.fields[0].passed).toBe(true);
    expect(result.fields[1].passed).toBe(false);
  });

  it('should pass with rouge-1 above threshold', async () => {
    const evalCase: EvalCase = {
      id: 'test-4',
      actual: 'This is a language model system',
      expected: [
        { value: 'language model', approach: 'rouge-1', threshold: 0.5 },
      ],
    };

    const result = await runEvalCase(evalCase);

    expect(result.passed).toBe(true);
    expect(result.fields[0].keywordScores[0].score).toBeGreaterThan(0.5);
  });

  it('should fail with rouge-1 below threshold', async () => {
    const evalCase: EvalCase = {
      id: 'test-5',
      actual: 'cooking recipes for dinner',
      expected: [
        {
          value: 'quantum mechanics equations',
          approach: 'rouge-1',
          threshold: 0.7,
        },
      ],
    };

    const result = await runEvalCase(evalCase);

    expect(result.passed).toBe(false);
  });

  it('should use custom label when provided', async () => {
    const evalCase: EvalCase = {
      id: 'test-6',
      actual: 'hello world',
      expected: [
        { value: 'hello', approach: 'exact', label: 'greeting-check' },
      ],
    };

    const result = await runEvalCase(evalCase);

    expect(result.fields[0].label).toBe('greeting-check');
  });
});

// ── runEvalSuite ────────────────────────────────────────────────────────────

describe('runEvalSuite', () => {
  it('should run all evals and return aggregate results', async () => {
    const suite: EvalSuite = {
      suite: 'aggregate-test',
      evals: [
        {
          id: 1,
          actual: 'hello world',
          expected: [{ value: 'hello', approach: 'exact' }],
        },
        {
          id: 2,
          actual: 'hello world',
          expected: [{ value: 'goodbye', approach: 'exact' }],
        },
      ],
    };

    const result = await runEvalSuite(suite);

    expect(result.total).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.passRate).toBe(0.5);
    expect(result.suite).toBe('aggregate-test');
  });

  it('should compute 100% passRate when all pass', async () => {
    const suite: EvalSuite = {
      evals: [
        {
          id: 1,
          actual: 'hello world',
          expected: [{ value: 'hello', approach: 'exact' }],
        },
        {
          id: 2,
          actual: 'foo bar',
          expected: [{ value: 'foo', approach: 'exact' }],
        },
      ],
    };

    const result = await runEvalSuite(suite);

    expect(result.passRate).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should return suite name in result', async () => {
    const suite: EvalSuite = {
      suite: 'named-suite',
      evals: [
        {
          id: 1,
          actual: 'text',
          expected: [{ value: 'text', approach: 'exact' }],
        },
      ],
    };

    const result = await runEvalSuite(suite);
    expect(result.suite).toBe('named-suite');
  });
});
