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

  it('throws when criteria is empty', () => {
    expect(() =>
      buildJudgeMessages({ ...baseInput, criteria: [] }),
    ).toThrow();
  });

  it('does not re-interpolate placeholder-like text inside input values', () => {
    // Single-pass regex substitution must NOT re-scan replacement values:
    // a literal `${question}` inside the assistant response stays intact
    // and does not get expanded again.
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
