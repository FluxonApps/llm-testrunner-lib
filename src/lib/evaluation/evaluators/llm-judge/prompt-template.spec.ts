import { describe, it, expect } from '@jest/globals';
import {
  buildJudgeMessages,
  type JudgePromptInput,
} from './prompt-template';
import type { Criterion } from '../../../../schemas/expected-outcome';

const baseCriteria: Criterion[] = [
  { id: 'correctness', description: 'Factually correct.', weight: 2 },
  { id: 'concision', description: 'Concise and on point.' },
];

const baseInput: JudgePromptInput = {
  question: 'What is the capital of France?',
  expectedOutcome: 'Paris',
  assistantResponse: 'The capital is Paris.',
  criteria: baseCriteria,
};

describe('buildJudgeMessages', () => {
  it('returns [system, user] messages with the correct roles in order', () => {
    const messages = buildJudgeMessages(baseInput);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('renders a non-empty system message containing the impartial-evaluator instructions', () => {
    const messages = buildJudgeMessages(baseInput);
    expect(messages[0].content).toContain('You are an impartial evaluator');
    expect(messages[0].content).toContain('Required JSON shape');
  });

  it('renders the default user message with every input value in its slot', () => {
    const userContent = buildJudgeMessages(baseInput)[1].content;
    expect(userContent).toContain('USER_PROMPT:\nWhat is the capital of France?');
    expect(userContent).toContain('EXPECTED_OUTCOME:\nParis');
    expect(userContent).toContain('ASSISTANT_RESPONSE:\nThe capital is Paris.');
  });

  it('renders criteria as pretty-printed JSON that round-trips and includes weights', () => {
    const userContent = buildJudgeMessages(baseInput)[1].content;
    const expectedJson = JSON.stringify(baseCriteria, null, 2);
    expect(userContent).toContain(`CRITERIA:\n${expectedJson}`);
    expect(userContent).toContain('"weight": 2');
  });

  it('omits the chat history label when chatHistory is undefined', () => {
    const userContent = buildJudgeMessages(baseInput)[1].content;
    expect(userContent).not.toContain('CHAT_HISTORY:');
  });

  it('renders a labeled chat history block when chatHistory is provided', () => {
    const userContent = buildJudgeMessages({
      ...baseInput,
      chatHistory: 'user: hi\nassistant: hello',
    })[1].content;
    expect(userContent).toContain(
      'CHAT_HISTORY:\nuser: hi\nassistant: hello',
    );
  });

  it('omits the additional context label when additionalContext is undefined', () => {
    const userContent = buildJudgeMessages(baseInput)[1].content;
    expect(userContent).not.toContain('ADDITIONAL_CONTEXT:');
  });

  it('renders a labeled additional context block when additionalContext is provided', () => {
    const userContent = buildJudgeMessages({
      ...baseInput,
      additionalContext: 'Page snippet: Paris is the capital of France.',
    })[1].content;
    expect(userContent).toContain(
      'ADDITIONAL_CONTEXT:\nPage snippet: Paris is the capital of France.',
    );
  });

  it('honors a userTemplate override; system stays default', () => {
    // Capture the default system content from a no-override call so we can
    // assert stability without needing the system constant exported.
    const defaultSystem = buildJudgeMessages(baseInput)[0].content;

    const customUser = 'Q: ${question}\nA: ${assistant_response}';
    const messages = buildJudgeMessages({
      ...baseInput,
      userTemplate: customUser,
    });

    expect(messages[0].content).toBe(defaultSystem);
    expect(messages[1].content).toBe(
      'Q: What is the capital of France?\nA: The capital is Paris.',
    );
  });

  it('throws when criteria is empty', () => {
    expect(() =>
      buildJudgeMessages({ ...baseInput, criteria: [] }),
    ).toThrow();
  });

  it('user-template path does not re-interpolate placeholder-like text inside replacement values', () => {
    const messages = buildJudgeMessages({
      ...baseInput,
      assistantResponse: 'I would say ${question} is the question.',
      userTemplate: 'Q: ${question}\nA: ${assistant_response}',
    });
    // Single-pass regex substitution must NOT re-scan replacement values:
    // the literal `${question}` inside the assistant response stays intact.
    expect(messages[1].content).toBe(
      'Q: What is the capital of France?\nA: I would say ${question} is the question.',
    );
  });

  it('default path embeds placeholder-like text from inputs as literal', () => {
    // JS template literals are not recursive, so `${question}` embedded in an
    // input value can never become a re-interpolated placeholder.
    const userContent = buildJudgeMessages({
      ...baseInput,
      assistantResponse: 'I would say ${question} is the question.',
    })[1].content;
    expect(userContent).toContain(
      'ASSISTANT_RESPONSE:\nI would say ${question} is the question.',
    );
    expect(userContent).toContain('USER_PROMPT:\nWhat is the capital of France?');
  });
});
