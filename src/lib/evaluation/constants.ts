export enum EvaluationApproach {
  EXACT = 'exact',
  SEMANTIC = 'semantic',
  ROUGE_1 = 'rouge-1',
  ROUGE_L = 'rouge-L',
  BLEU = 'bleu',
}

// Array of all evaluation approach values for UI components
export const EvaluationApproachValues = Object.values(EvaluationApproach);

export const DEFAULT_ROUGE_PASS_SCORE = 0.7;
export const DEFAULT_SEMANTIC_PASS_SCORE = 0.7;
export const DEFAULT_BLEU_PASS_SCORE = 0.7;
