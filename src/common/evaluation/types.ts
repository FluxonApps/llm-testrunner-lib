import {
  EvaluationParameters,
  EvaluationApproachResult,
} from '../types/evaluation';

export interface EvaluationRequest {
  testCaseId: string;
  question: string;
  expectedOutcome: string;
  actualResponse: string;
  evaluationParameters: EvaluationParameters;
}

export interface MatchResult {
  testCaseId: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  timestamp?: string;
  evaluationParameters?: EvaluationParameters;
  evaluationApproachResult?: EvaluationApproachResult;
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  evaluationApproachResult: EvaluationApproachResult;
}
