import { describe, it, expect } from '@jest/globals';
import { clampThreshold } from './threshold-clamp';
import {
  EvaluationApproach,
  DEFAULT_ROUGE_PASS_SCORE,
  DEFAULT_SEMANTIC_PASS_SCORE,
  DEFAULT_BLEU_PASS_SCORE,
} from './constants';

describe('clampThreshold', () => {
  it('passes through when threshold is undefined', () => {
    const params = { approach: EvaluationApproach.ROUGE_1 };
    const result = clampThreshold(params);
    expect(result.params).toEqual(params);
    expect(result.warning).toBeNull();
  });

  it('passes through in-range values untouched', () => {
    const params = { approach: EvaluationApproach.ROUGE_1, threshold: 0.85 };
    const result = clampThreshold(params);
    expect(result.params.threshold).toBe(0.85);
    expect(result.warning).toBeNull();
  });

  it('accepts the boundary values 0 and 1', () => {
    expect(
      clampThreshold({ approach: EvaluationApproach.BLEU, threshold: 0 })
        .warning,
    ).toBeNull();
    expect(
      clampThreshold({ approach: EvaluationApproach.BLEU, threshold: 1 })
        .warning,
    ).toBeNull();
  });

  it('drops the threshold and produces a user-readable warning for > 1', () => {
    const result = clampThreshold({
      approach: EvaluationApproach.ROUGE_1,
      threshold: 1.5,
    });
    expect(result.params.threshold).toBeUndefined();
    expect(result.params.approach).toBe(EvaluationApproach.ROUGE_1);
    expect(result.warning).not.toBeNull();
    expect(result.warning).toContain(String(DEFAULT_ROUGE_PASS_SCORE));
    expect(result.warning).toContain('1.5');
    expect(result.warning).toContain('[0, 1]');
  });

  it('drops the threshold and produces a warning for < 0', () => {
    const result = clampThreshold({
      approach: EvaluationApproach.SEMANTIC,
      threshold: -0.2,
    });
    expect(result.params.threshold).toBeUndefined();
    expect(result.warning).toContain('-0.2');
    expect(result.warning).toContain(String(DEFAULT_SEMANTIC_PASS_SCORE));
  });

  it('drops NaN / Infinity gracefully (no warning emitted)', () => {
    // NaN and Infinity are pathological values that schema validation
    // should reject upstream. Don't generate confusing "supplied: NaN"
    // warnings here.
    expect(
      clampThreshold({
        approach: EvaluationApproach.ROUGE_1,
        threshold: NaN,
      }).warning,
    ).toBeNull();
    expect(
      clampThreshold({
        approach: EvaluationApproach.ROUGE_1,
        threshold: Infinity,
      }).warning,
    ).toBeNull();
  });

  it('embeds the right per-approach default in the warning', () => {
    // The number embedded in the warning string must match the constant
    // the engine actually uses. Reading the constants here (rather than
    // hardcoding 0.7) keeps the test honest if any per-approach default
    // is tuned in the future.
    expect(
      clampThreshold({
        approach: EvaluationApproach.BLEU,
        threshold: 5,
      }).warning,
    ).toContain(String(DEFAULT_BLEU_PASS_SCORE));
    expect(
      clampThreshold({
        approach: EvaluationApproach.SEMANTIC,
        threshold: 5,
      }).warning,
    ).toContain(String(DEFAULT_SEMANTIC_PASS_SCORE));
    expect(
      clampThreshold({
        approach: EvaluationApproach.ROUGE_L,
        threshold: 5,
      }).warning,
    ).toContain(String(DEFAULT_ROUGE_PASS_SCORE));
  });
});
