import { z } from 'zod';
import type { EvaluationResult } from '../lib/evaluation/types';
import { expectedOutcomeArraySchema } from './expected-outcome';
import { modelResponsePayloadSchema } from './model-response';

export const testCaseChatHistorySchema = z.object({
  enabled: z.boolean(),
  value: z.string(),
});

export const testCaseInputSchema = z.object({
  id: z.string(),
  question: z.string(),
  expectedOutcome: expectedOutcomeArraySchema,
  chatHistory: testCaseChatHistorySchema.optional(),
});

export const testCaseInputArraySchema = z.array(testCaseInputSchema);

export const testCaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  expectedOutcome: expectedOutcomeArraySchema,
  output: modelResponsePayloadSchema.optional(),
  chatHistory: testCaseChatHistorySchema,
  isRunning: z.boolean().optional(),
  error: z.string().optional(),
  evaluationResult: z.custom<EvaluationResult>().optional(),
  responseTime: z.number().optional(),
});

export type TestCaseChatHistory = z.infer<typeof testCaseChatHistorySchema>;
export type TestCaseInput = z.input<typeof testCaseInputSchema>;
export type TestCase = z.input<typeof testCaseSchema>;

export function validateTestCaseInput(
  data: unknown,
): asserts data is TestCaseInput {
  const parsed = testCaseInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid test case input: ${parsed.error.issues[0].message}`);
  }
}

export function validateTestCaseInputArray(
  data: unknown,
): asserts data is TestCaseInput[] {
  const parsed = testCaseInputArraySchema.safeParse(data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message =
      firstIssue.code === 'invalid_type'
        ? 'Invalid JSON structure. Expected a JSON array.'
        : firstIssue.message;
    throw new Error(message);
  }
}
