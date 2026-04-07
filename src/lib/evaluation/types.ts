import {
  EvaluationParameters,
  EvaluationApproachResult,
} from '../../types/evaluation';
import type { ExpectedOutcomeFieldType } from '../../types/llm-test-runner';

export interface EvaluationRequest {
  testCaseId: string;
  question: string;
  expectedOutcome: string;
  actualResponse: string;
  evaluationParameters: EvaluationParameters;
}

export interface FieldEvaluationInput {
  index: number;
  label: string;
  type: ExpectedOutcomeFieldType;
  expectedValue: string;
  actualResponse: string;
  evaluationParameters: EvaluationParameters;
}

export interface EvaluationRequestV2 {
  testCaseId: string;
  question: string;
  fields: FieldEvaluationInput[];
}

export interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  fieldResults?: FieldEvaluationResult[];
  timestamp?: string;
  evaluationParameters?: EvaluationParameters;
  evaluationApproachResult?: EvaluationApproachResult;
}

export interface FieldEvaluationResult {
  index: number;
  label: string;
  type: ExpectedOutcomeFieldType;
  expectedValue: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  evaluationParameters: EvaluationParameters;
  evaluationApproachResult: EvaluationApproachResult;
  error?: string;
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
