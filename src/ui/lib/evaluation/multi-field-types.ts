import type { KeywordMatch } from '../../../common/evaluation/types';
import type {
  EvaluationApproachResult,
  EvaluationParameters,
} from '../../../common/types/evaluation';
import type { ExpectedOutcomeFieldType } from '../../types/llm-test-runner';

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

export interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  keywordMatches: KeywordMatch[];
  fieldResults?: FieldEvaluationResult[];
  timestamp?: string;
  evaluationParameters?: EvaluationParameters;
  evaluationApproachResult?: EvaluationApproachResult;
}

export type EvaluationCallback = (result: EvaluationResult) => void;
