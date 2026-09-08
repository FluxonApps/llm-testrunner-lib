import { z } from 'zod';
import type { EvaluationResult } from '../lib/evaluation/types';
import { expectedOutcomeArraySchema } from './expected-outcome';
import { modelResponsePayloadSchema } from './model-response';

export const testCaseChatHistorySchema = z.object({
  enabled: z.boolean(),
  value: z.string(),
});

export const testCaseInputSchema = z.object({
  // Optional here (unlike testCaseSchema below): initialTestCases/import accept
  // the minimal { question, expectedOutcome } shape documented in the README,
  // with id filled in by createTestCaseFromInput. A fully-formed runtime
  // TestCase always has one -- see testCaseSchema.
  id: z.string().optional(),
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
    // path.length === 0 means the issue is about `data` itself (e.g. it's an
    // object, not an array) -- that's the only case "expected a JSON array" is
    // actually correct. A non-empty path means the issue is about a field
    // inside one element (e.g. `expectedOutcome` on item 0), which the generic
    // top-level message would misreport as an array-shape problem.
    const message =
      firstIssue.code === 'invalid_type' && firstIssue.path.length === 0
        ? 'Invalid JSON structure. Expected a JSON array.'
        : `Invalid test case at index ${String(firstIssue.path[0] ?? '?')}: ${firstIssue.message} (${firstIssue.path.slice(1).map(String).join('.') || 'root'})`;
    throw new Error(message);
  }
}
