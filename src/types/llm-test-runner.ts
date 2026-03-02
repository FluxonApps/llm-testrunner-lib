import { EvaluationParameters } from './evaluation';
import { EvaluationResult } from '../lib/evaluation/types';

export interface TestCase {
  id: string;
  question: string;
  expectedOutcome: string;
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
