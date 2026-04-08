import type { TestCase } from './test-case';
import type { ModelResponsePayload } from '../schemas/model-response';

export type {
  EvaluationSource,
  EvaluationSourceExtractor,
  EvaluationSourceExtractors,
  ExpectedOutcomeMode,
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
export type {
  ModelResponsePayload,
} from '../schemas/model-response';
export type {
  TestCaseChatHistory,
  TestCase,
  TestCaseInput,
} from './test-case';

export interface LLMRequestPayload {
  prompt: string;
  resolve: (result: ModelResponsePayload) => void;
  chatHistory?: string;
  reject: (err: Error | unknown) => void;
}

export interface SavePayload {
  timestamp: string;
  testCases: TestCase[];
}
