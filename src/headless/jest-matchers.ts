import { evaluateExact } from './evaluate-outcome';

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
  });
}

declare module 'expect' {
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toExactMatch(expected: string): Promise<R>;
  }
}
