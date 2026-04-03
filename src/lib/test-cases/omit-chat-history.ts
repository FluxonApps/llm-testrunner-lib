import type { TestCase } from '../../types/llm-test-runner';

export function omitChatHistory(testCase: TestCase): TestCase {
  const { chatHistory: _omit, ...rest } = testCase;
  return rest;
}
