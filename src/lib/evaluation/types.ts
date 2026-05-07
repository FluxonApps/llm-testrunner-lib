import {
  EvaluationParameters,
  EvaluationApproachResult,
} from '../../types/evaluation';
import type { ExpectedOutcomeFieldType, LlmJudge } from '../../types/llm-test-runner';

export interface EvaluationRequest {
  testCaseId: string;
  question: string;
  expectedOutcome: string;
  actualResponse: string;
  evaluationParameters: EvaluationParameters;
  llmJudge?: LlmJudge;
  chatHistory?: string;
  additionalContext?: string;
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
  llmJudge?: LlmJudge;
  chatHistory?: string;
  additionalContext?: string;
}

export interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  fieldResults?: FieldEvaluationResult[];
  timestamp?: string;
  evaluationParameters?: EvaluationParameters;
  evaluationApproachResult?: EvaluationApproachResult;
  criterionResults?: CriterionResult[];
  /**
   * Populated by evaluators (currently llm-judge) when evaluation fails for a
   * recoverable reason — e.g. judge call threw, response failed schema
   * validation, criterion coverage check failed. The engine maps this onto
   * the corresponding `FieldEvaluationResult.error` so the existing
   * evaluation-row UI can render it.
   */
  error?: string;
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
  warning?: string;
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

export interface CriterionResult {
  id: string;
  description: string;
  weight: number;
  score: number;
  reason?: string;
}