import { z } from 'zod';
import { EvaluationApproach, EvaluationApproachValues } from './constants';
import { LLMEvaluationEngine } from './evaluation-engine';
import type { EvaluationRequestV2, EvaluationResult } from './types';

// ── schemas ─────────────────────────────────────────────────────────────────

const evalExpectedFieldSchema = z.object({
  value: z.string().min(1),
  approach: z.enum(EvaluationApproachValues as [string, ...string[]]),
  threshold: z.number().min(0).max(1).optional(),
  label: z.string().optional(),
});

const evalCaseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  actual: z.string(),
  expected: z.array(evalExpectedFieldSchema).min(1),
});

export const evalSuiteSchema = z.object({
  suite: z.string().optional(),
  evals: z.array(evalCaseSchema).min(1),
});

// ── types ───────────────────────────────────────────────────────────────────

export type EvalExpectedField = z.infer<typeof evalExpectedFieldSchema>;
export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalSuite = z.infer<typeof evalSuiteSchema>;

export interface FieldResult {
  label: string;
  value: string;
  approach: string;
  passed: boolean;
  score: number;
  keywordScores: { keyword: string; score: number; passed: boolean }[];
}

export interface EvalCaseResult {
  id: string | number;
  passed: boolean;
  fields: FieldResult[];
  error?: string;
}

export interface EvalSuiteResult {
  suite: string | undefined;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: EvalCaseResult[];
}

// ── parsing ─────────────────────────────────────────────────────────────────

export function parseEvalSuite(json: string): EvalSuite {
  const raw = JSON.parse(json);
  return evalSuiteSchema.parse(raw);
}

// ── single eval case ────────────────────────────────────────────────────────

export async function runEvalCase(evalCase: EvalCase): Promise<EvalCaseResult> {
  const engine = new LLMEvaluationEngine();

  const request: EvaluationRequestV2 = {
    testCaseId: String(evalCase.id),
    question: '',
    actualResponse: evalCase.actual,
    fields: evalCase.expected.map((field, index) => ({
      index,
      label: field.label ?? `field-${index}`,
      type: 'text' as const,
      expectedValue: field.value,
      evaluationParameters: {
        approach: field.approach as EvaluationApproach,
        ...(field.threshold !== undefined && { threshold: field.threshold }),
      },
    })),
  };

  return new Promise<EvalCaseResult>(resolve => {
    engine.evaluateResponse(request, (result: EvaluationResult) => {
      const fields: FieldResult[] = (result.fieldResults ?? []).map(fr => ({
        label: fr.label,
        value: fr.expectedValue,
        approach: fr.evaluationApproachResult.approachUsed,
        passed: fr.passed,
        score: fr.evaluationApproachResult.score,
        keywordScores: fr.keywordMatches.map(km => ({
          keyword: km.keyword,
          score: km.evaluationApproachResult.score,
          passed: km.found,
        })),
      }));

      resolve({
        id: evalCase.id,
        passed: result.passed,
        fields,
      });
    });
  });
}

// ── suite runner ────────────────────────────────────────────────────────────

export async function runEvalSuite(
  suite: EvalSuite,
): Promise<EvalSuiteResult> {
  const results: EvalCaseResult[] = [];

  for (const evalCase of suite.evals) {
    const result = await runEvalCase(evalCase);
    results.push(result);
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  return {
    suite: suite.suite,
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? passed / total : 1,
    results,
  };
}
