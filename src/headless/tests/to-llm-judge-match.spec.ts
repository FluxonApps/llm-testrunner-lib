import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { installLlmMatchers } from '..';
import type { LlmJudge } from '..';

describe('toLlmJudgeMatch', () => {
  const mockJudge = jest.fn<LlmJudge>();

  beforeAll(() => {
    installLlmMatchers(expect);
  });

  beforeEach(() => {
    mockJudge.mockReset();
  });

  it('passes when the judge score is at or above the threshold', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.9, reason: 'Correct.' }],
    });

    await expect('The capital of Telangana is Hyderabad.').toLlmJudgeMatch(
      'What is the capital of Telangana?',
      'Hyderabad',
      { llmJudge: mockJudge },
    );
  });

  it('fails when the judge score is below the threshold', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.3, reason: 'Wrong city.' }],
    });

    await expect(
      expect('The capital of Telangana is Warangal.').toLlmJudgeMatch(
        'What is the capital of Telangana?',
        'Hyderabad',
        { llmJudge: mockJudge },
      ),
    ).rejects.toThrow();
  });

  it('uses a default llmJudge configured via installLlmMatchers', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.95 }],
    });
    installLlmMatchers(expect, { llmJudge: mockJudge });

    await expect('The capital of Telangana is Hyderabad.').toLlmJudgeMatch(
      'What is the capital of Telangana?',
      'Hyderabad',
    );
  });

  it('fails with a clear message when no llmJudge is provided', async () => {
    installLlmMatchers(expect);

    await expect(
      expect('anything').toLlmJudgeMatch('question', 'expected'),
    ).rejects.toThrow(/No llmJudge callback provided/);
  });
});
