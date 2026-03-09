import { z } from 'zod';
import { EvaluationApproach } from '../lib/evaluation/constants';
import type { EvaluationResult } from '../lib/evaluation/types';
import { expectedOutcomeArraySchema } from './expected-outcome';

export const evaluationParametersSchema = z.object({
  approach: z.enum(EvaluationApproach),
  threshold: z.number().optional(),
});

const baseTestCaseInputSchema = z.object({
  id: z.string(),
  question: z.string(),
  evaluationParameters: evaluationParametersSchema.optional(),
});

export const legacyTestCaseInputSchema = baseTestCaseInputSchema.extend({
  expectedOutcome: z.string(),
});

export const v2TestCaseInputSchema = baseTestCaseInputSchema.extend({
  expectedOutcome: expectedOutcomeArraySchema,
});

export const testCaseInputSchema = z.union([
  legacyTestCaseInputSchema,
  v2TestCaseInputSchema,
]);

export const testCaseInputArraySchema = z.array(testCaseInputSchema).min(1, {
  message: 'The test suite is empty. Please provide at least one test case.',
});

export const testCaseSchema = z.object({
  id: z.string(),
  question: z.string(),
  expectedOutcome: expectedOutcomeArraySchema,
  evaluationParameters: evaluationParametersSchema.optional(),
  output: z.string().optional(),
  isRunning: z.boolean().optional(),
  error: z.string().optional(),
  evaluationResult: z.custom<EvaluationResult>().optional(),
  responseTime: z.number().optional(),
});

export type EvaluationParameters = z.infer<typeof evaluationParametersSchema>;
export type TestCaseInput = z.infer<typeof testCaseInputSchema>;
export type LegacyTestCaseInput = z.infer<typeof legacyTestCaseInputSchema>;
export type V2TestCaseInput = z.infer<typeof v2TestCaseInputSchema>;
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
