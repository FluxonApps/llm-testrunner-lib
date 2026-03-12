import { z } from 'zod';
import type { EvaluationResult } from '../lib/evaluation/types';
import { expectedOutcomeArraySchema } from './expected-outcome';

const baseTestCaseInputSchema = z.object({
  id: z.string(),
  question: z.string(),
  expectedOutcome: expectedOutcomeArraySchema,
});

export const testCaseInputSchema = baseTestCaseInputSchema;

export const testCaseInputArraySchema = z.array(testCaseInputSchema).min(1, {
  message: 'The test suite is empty. Please provide at least one test case.',
});

export const testCaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  expectedOutcome: expectedOutcomeArraySchema,
  output: z.string().optional(),
  isRunning: z.boolean().optional(),
  error: z.string().optional(),
  evaluationResult: z.custom<EvaluationResult>().optional(),
  responseTime: z.number().optional(),
});

export type TestCaseInput = z.infer<typeof testCaseInputSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;

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
