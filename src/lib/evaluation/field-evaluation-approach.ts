import { EvaluationApproach, EvaluationApproachValues } from './constants';
import type { EvaluationParameters } from '../../types/evaluation';

export type EvaluationFieldType = 'text' | 'textarea' | 'chips-input' | 'select';

const SELECT_ONLY_APPROACHES: EvaluationApproach[] = [EvaluationApproach.EXACT];

export function getAllowedApproachesForFieldType(
  fieldType: EvaluationFieldType,
): EvaluationApproach[] {
  if (fieldType === 'select') {
    return SELECT_ONLY_APPROACHES;
  }
  return EvaluationApproachValues;
}

export function isApproachAllowedForFieldType(
  fieldType: EvaluationFieldType,
  approach: EvaluationApproach,
): boolean {
  return getAllowedApproachesForFieldType(fieldType).includes(approach);
}

export function normalizeEvaluationParametersForField(
  fieldType: EvaluationFieldType,
  evaluationParameters?: EvaluationParameters,
): EvaluationParameters {
  const allowedApproaches = getAllowedApproachesForFieldType(fieldType);
  const fallbackApproach = allowedApproaches[0];
  const rawApproach = evaluationParameters?.approach;
  const approach =
    rawApproach && allowedApproaches.includes(rawApproach)
      ? rawApproach
      : fallbackApproach;

  return {
    ...evaluationParameters,
    approach,
  };
}

