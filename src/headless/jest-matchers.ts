import { evaluateBleu } from './evaluate-bleu';
import { evaluateExact } from './evaluate-exact';
import { evaluateLlmJudge } from './evaluate-llm-judge';
import { evaluateRouge1 } from './evaluate-rouge1';
import { evaluateRougeL } from './evaluate-rougeL';
import { evaluateSemantic } from './evaluate-semantic';
import type { Criterion, LlmJudge } from '../types/llm-test-runner';

export interface InstallLlmMatchersOptions {
  llmJudge?: LlmJudge;
}

export interface LlmJudgeMatchOptions {
  criteria?: Criterion[];
  threshold?: number;
  llmJudge?: LlmJudge;
}

function formatSnippet(actual: string): string {
  return `${actual.slice(0, 300)}${actual.length > 300 ? '…' : ''}`;
}

export function installLlmMatchers(
  expectObj: typeof import('@jest/globals').expect,
  options?: InstallLlmMatchersOptions,
): void {
  const defaultLlmJudge = options?.llmJudge;

  expectObj.extend({
    async toExactMatch(received: unknown, expected: string) {
      const actual = String(await Promise.resolve(received));
      const result = await evaluateExact(actual, expected);
      return {
        pass: result.passed,
        message: () =>
          `toExactMatch failed.\nExpected: ${expected}\nReceived (snippet): ${formatSnippet(actual)}`,
      };
    },
    async toSemanticMatch(
      received: unknown,
      expected: string,
      threshold?: number,
    ) {
      const actual = String(await Promise.resolve(received));
      const result = await evaluateSemantic(actual, expected, threshold);
      return {
        pass: result.passed,
        message: () =>
          `toSemanticMatch failed.\nExpected: ${expected}\nReceived (snippet): ${formatSnippet(actual)}`,
      };
    },
    async toBleuMatch(
      received: unknown,
      expected: string,
      threshold?: number,
    ) {
      const actual = String(await Promise.resolve(received));
      const result = await evaluateBleu(actual, expected, threshold);
      return {
        pass: result.passed,
        message: () =>
          `toBleuMatch failed.\nExpected: ${expected}\nReceived (snippet): ${formatSnippet(actual)}`,
      };
    },
    async toRouge1Match(
      received: unknown,
      expected: string,
      threshold?: number,
    ) {
      const actual = String(await Promise.resolve(received));
      const result = await evaluateRouge1(actual, expected, threshold);
      return {
        pass: result.passed,
        message: () =>
          `toRouge1Match failed.\nExpected: ${expected}\nReceived (snippet): ${formatSnippet(actual)}`,
      };
    },
    async toRougeLMatch(
      received: unknown,
      expected: string,
      threshold?: number,
    ) {
      const actual = String(await Promise.resolve(received));
      const result = await evaluateRougeL(actual, expected, threshold);
      return {
        pass: result.passed,
        message: () =>
          `toRougeLMatch failed.\nExpected: ${expected}\nReceived (snippet): ${formatSnippet(actual)}`,
      };
    },
    async toLlmJudgeMatch(
      received: unknown,
      question: string,
      expected: string,
      matchOptions?: LlmJudgeMatchOptions,
    ) {
      const actual = String(await Promise.resolve(received));
      const llmJudge = matchOptions?.llmJudge ?? defaultLlmJudge;

      if (!llmJudge) {
        return {
          pass: false,
          message: () =>
            'toLlmJudgeMatch failed.\nNo llmJudge callback provided. Pass one via installLlmMatchers(expect, { llmJudge }) or as options.llmJudge on the matcher call.',
        };
      }

      const result = await evaluateLlmJudge({
        actualResponse: actual,
        question,
        expectedOutcome: expected,
        llmJudge,
        criteria: matchOptions?.criteria,
        threshold: matchOptions?.threshold,
      });

      return {
        pass: result.passed,
        message: () => {
          const criteriaSummary = (result.criterionResults ?? [])
            .map(
              c =>
                `  - ${c.id}: ${c.score.toFixed(2)}${c.reason ? ` — ${c.reason}` : ''}`,
            )
            .join('\n');
          return [
            'toLlmJudgeMatch failed.',
            `Question: ${question}`,
            `Expected: ${expected}`,
            `Received (snippet): ${formatSnippet(actual)}`,
            result.error ? `Error: ${result.error}` : undefined,
            criteriaSummary ? `Criteria:\n${criteriaSummary}` : undefined,
          ]
            .filter(Boolean)
            .join('\n');
        },
      };
    },
  });
}

declare module 'expect' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toExactMatch(expected: string): Promise<R>;
    toSemanticMatch(expected: string, threshold?: number): Promise<R>;
    toBleuMatch(expected: string, threshold?: number): Promise<R>;
    toRouge1Match(expected: string, threshold?: number): Promise<R>;
    toRougeLMatch(expected: string, threshold?: number): Promise<R>;
    toLlmJudgeMatch(
      question: string,
      expected: string,
      options?: LlmJudgeMatchOptions,
    ): Promise<R>;
  }
}
