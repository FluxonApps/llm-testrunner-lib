import type { TestCase } from './test-case';

export type {
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
  TestCase,
  TestCaseInput,
} from './test-case';

export interface LLMRequestPayload {
  prompt: string;
  chatHistory?: string;
  resolve: (result: string) => void;
  reject: (err: Error | unknown) => void;
}

export interface SavePayload {
  timestamp: string;
  testCases: TestCase[];
}
