import { EvaluationApproach } from '../lib/evaluation/constants'; 
import { Criterion } from '../schemas/expected-outcome';

export interface EvaluationParameters {
  approach: EvaluationApproach;
  threshold?: number;
  criteria?: Criterion[];
}

export interface EvaluationApproachResult {
  score: number; // 0-1
  approachUsed: EvaluationApproach;
}