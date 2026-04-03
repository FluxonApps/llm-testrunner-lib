import { describe, it, expect } from '@jest/globals';
import { omitChatHistory } from './omit-chat-history';
import type { TestCase } from '../../types/llm-test-runner';

describe('omitChatHistory', () => {
  it('removes chatHistory from a test case object', () => {
    const tc: TestCase = {
      id: '1',
      question: 'q',
      expectedOutcome: [
        { type: 'textarea', label: 'E', value: 'v' },
      ],
      chatHistory: 'ctx',
      isRunning: false,
    };

    const out = omitChatHistory(tc);

    expect(out).not.toHaveProperty('chatHistory');
    expect(out.id).toBe('1');
  });

  it('leaves test cases without chatHistory unchanged', () => {
    const tc: TestCase = {
      id: '1',
      question: 'q',
      expectedOutcome: [{ type: 'textarea', label: 'E', value: 'v' }],
      isRunning: false,
    };

    const out = omitChatHistory(tc);

    expect(out).not.toHaveProperty('chatHistory');
    expect(out).toEqual(tc);
  });
});
