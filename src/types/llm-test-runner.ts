import { EvaluationParameters } from './evaluation';
import { EvaluationResult } from '../lib/evaluation/types';
import type { ExpectedOutcomeField } from './expected-outcome';

export type {
  ExpectedOutcomeFieldType,
  ExpectedOutcomeBase,
  ExpectedOutcomeSchema,
  ExpectedOutcomeSchemaField,
  ExpectedOutcomeField,
  TextExpectedOutcomeSchemaField,
  TextareaExpectedOutcomeSchemaField,
  ChipsExpectedOutcomeSchemaField,
  SelectExpectedOutcomeSchemaField,
  TextExpectedOutcomeField,
  TextareaExpectedOutcomeField,
  ChipsExpectedOutcomeField,
  SelectExpectedOutcomeField,
} from './expected-outcome';

export interface TestCase {
  id: string;
  question: string;
  expectedOutcome: ExpectedOutcomeField[];
  evaluationParameters?: EvaluationParameters;
  output?: string;
  isRunning?: boolean;
  error?: string;
  evaluationResult?: EvaluationResult;
  responseTime?: number; // Time taken by the callback to execute in milliseconds
}

export interface LLMRequestPayload {
  prompt: string;
  resolve: (result: string) => void;
  reject: (err: Error | unknown) => void;
}

export interface SavePayload {
  timestamp: string;
  testCases: TestCase[];
}
