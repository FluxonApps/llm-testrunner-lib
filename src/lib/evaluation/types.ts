import {
  EvaluationParameters,
  EvaluationApproachResult,
} from '../../types/evaluation';

export interface EvaluationRequest {
  testCaseId: string;
  question: string;
  expectedOutcome: string;
  actualResponse: string;
  evaluationParameters: EvaluationParameters;
}

export interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  timestamp?: string;
  evaluationParameters: EvaluationParameters;
  evaluationApproachResult: EvaluationApproachResult;
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  evaluationApproachResult: EvaluationApproachResult;
}

export type EvaluationCallback = (result: EvaluationResult) => void;

export interface RougeKeywordDetails {
  rouge1: number;
  rougeL: number;
  scoreUsed: string;
  approach: string;
}

export interface Rouge1OverallDetails {
  keywordsPassed: number;
  totalKeywords: number;
  passRate: string;
  thresholdUsed: number;
  approach: string;
}
