import type { EvaluationParameters } from '../../types/evaluation';
import {
  getDefaultPassScoreForApproach,
  DEFAULT_ROUGE_PASS_SCORE,
} from './constants';

/**
 * Returns evaluationParameters with the threshold removed if it falls
 * outside `[0, 1]`. The engine then takes the existing per-approach
 * default fallback path. When a substitution happens, a user-readable
 * warning string is returned alongside so the caller can attach it to
 * the field's evaluation result (rendered as a non-fatal notice).
 *
 * NaN / Infinity / undefined are treated as no-ops (no warning) — they're
 * either pathological (rejected by schema upstream) or already mean "no
 * override."
 */
export function clampThreshold(params: EvaluationParameters): {
  params: EvaluationParameters;
  warning: string | null;
} {
  const supplied = params.threshold;
  if (
    supplied === undefined ||
    Number.isNaN(supplied) ||
    !Number.isFinite(supplied) ||
    (supplied >= 0 && supplied <= 1)
  ) {
    return { params, warning: null };
  }
  const used =
    getDefaultPassScoreForApproach(params.approach) ??
    DEFAULT_ROUGE_PASS_SCORE;
  const { threshold: _drop, ...rest } = params;
  return {
    params: { ...rest, approach: params.approach },
    warning: `Used default threshold ${used} — the configured value ${supplied} is outside [0, 1].`,
  };
}
