import { evaluateExact } from './evaluate-exact';
import { evaluateSemantic } from './evaluate-semantic';

export function installLlmMatchers(
  expectObj: typeof import('@jest/globals').expect,
): void {
  expectObj.extend({
    async toExactMatch(received: unknown, expected: string) {
      const actual = String(await Promise.resolve(received));
      const result = await evaluateExact(actual, expected);
      return {
        pass: result.passed,
        message: () =>
          `toExactMatch failed.\nExpected: ${expected}\nReceived (snippet): ${actual.slice(0, 300)}${actual.length > 300 ? '…' : ''}`,
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
          `toSemanticMatch failed.\nExpected: ${expected}\nReceived (snippet): ${actual.slice(0, 300)}${actual.length > 300 ? '…' : ''}`,
      };
    },
  });
}

declare module 'expect' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toExactMatch(expected: string): Promise<R>;
    toSemanticMatch(expected: string, threshold?: number): Promise<R>;
  }
}
