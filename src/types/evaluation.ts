import { EvaluationApproach } from '../lib/evaluation/constants'; 

export interface EvaluationParameters {
  approach: EvaluationApproach;
  threshold?: number;
}

export interface EvaluationApproachResult {
  score: number; // 0-1
  approachUsed: EvaluationApproach;
}