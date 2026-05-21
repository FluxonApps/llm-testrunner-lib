import { describe, it, expect } from '@jest/globals';
import {
  getAllowedApproachesForFieldType,
  isApproachAllowedForFieldType,
  normalizeEvaluationParametersForField,
} from './field-evaluation-approach';
import { EvaluationApproach } from './constants';

describe('getAllowedApproachesForFieldType', () => {
  it('locks select fields to exact only', () => {
    const allowed = getAllowedApproachesForFieldType('select');
    expect(allowed).toEqual([EvaluationApproach.EXACT]);
  });

  it('allows all six approaches for textarea fields', () => {
    const allowed = getAllowedApproachesForFieldType('textarea');
    expect(allowed).toContain(EvaluationApproach.EXACT);
    expect(allowed).toContain(EvaluationApproach.SEMANTIC);
    expect(allowed).toContain(EvaluationApproach.ROUGE_1);
    expect(allowed).toContain(EvaluationApproach.ROUGE_L);
    expect(allowed).toContain(EvaluationApproach.BLEU);
    expect(allowed).toContain(EvaluationApproach.LLM_JUDGE);
  });

  it('allows llm-judge for text fields', () => {
    expect(getAllowedApproachesForFieldType('text')).toContain(
      EvaluationApproach.LLM_JUDGE,
    );
  });

  it('allows llm-judge for chips-input fields', () => {
    expect(getAllowedApproachesForFieldType('chips-input')).toContain(
      EvaluationApproach.LLM_JUDGE,
    );
  });

  it('does NOT allow llm-judge for select fields', () => {
    expect(getAllowedApproachesForFieldType('select')).not.toContain(
      EvaluationApproach.LLM_JUDGE,
    );
  });
});

describe('isApproachAllowedForFieldType', () => {
  it('returns true for llm-judge on textarea', () => {
    expect(
      isApproachAllowedForFieldType('textarea', EvaluationApproach.LLM_JUDGE),
    ).toBe(true);
  });

  it('returns false for llm-judge on select', () => {
    expect(
      isApproachAllowedForFieldType('select', EvaluationApproach.LLM_JUDGE),
    ).toBe(false);
  });

  it('returns true for exact on select', () => {
    expect(
      isApproachAllowedForFieldType('select', EvaluationApproach.EXACT),
    ).toBe(true);
  });
});

describe('normalizeEvaluationParametersForField', () => {
  it('keeps a valid approach untouched', () => {
    const result = normalizeEvaluationParametersForField('textarea', {
      approach: EvaluationApproach.LLM_JUDGE,
      threshold: 0.7,
    });
    expect(result.approach).toBe(EvaluationApproach.LLM_JUDGE);
    expect(result.threshold).toBe(0.7);
  });

  it('snaps llm-judge back to exact on select fields', () => {
    const result = normalizeEvaluationParametersForField('select', {
      approach: EvaluationApproach.LLM_JUDGE,
    });
    expect(result.approach).toBe(EvaluationApproach.EXACT);
  });

  it('snaps any non-exact approach back to exact on select fields', () => {
    expect(
      normalizeEvaluationParametersForField('select', {
        approach: EvaluationApproach.ROUGE_1,
      }).approach,
    ).toBe(EvaluationApproach.EXACT);

    expect(
      normalizeEvaluationParametersForField('select', {
        approach: EvaluationApproach.SEMANTIC,
      }).approach,
    ).toBe(EvaluationApproach.EXACT);
  });

  it('preserves other params (threshold, criteria) when the approach itself is valid', () => {
    const result = normalizeEvaluationParametersForField('textarea', {
      approach: EvaluationApproach.LLM_JUDGE,
      threshold: 0.85,
      criteria: [{ id: 'correctness', description: 'Factually correct.' }],
    });
    expect(result.threshold).toBe(0.85);
    expect(result.criteria).toEqual([
      { id: 'correctness', description: 'Factually correct.' },
    ]);
  });

  it('falls back to the first allowed approach when params are undefined', () => {
    expect(
      normalizeEvaluationParametersForField('select', undefined).approach,
    ).toBe(EvaluationApproach.EXACT);
  });
});
