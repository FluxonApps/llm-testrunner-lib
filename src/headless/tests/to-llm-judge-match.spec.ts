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

  it('a per-call llmJudge overrides the suite-wide default, not the other way around', async () => {
    const defaultJudge = jest.fn<LlmJudge>().mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.1 }],
    });
    const perCallJudge = jest.fn<LlmJudge>().mockResolvedValue({
      criteria: [{ id: 'correctness', score: 0.95 }],
    });
    installLlmMatchers(expect, { llmJudge: defaultJudge });

    await expect('The capital of Telangana is Hyderabad.').toLlmJudgeMatch(
      'What is the capital of Telangana?',
      'Hyderabad',
      { llmJudge: perCallJudge },
    );

    expect(perCallJudge).toHaveBeenCalledTimes(1);
    expect(defaultJudge).not.toHaveBeenCalled();

    // Reset the suite default so later tests aren't affected.
    installLlmMatchers(expect);
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

    // Reset the suite default so later tests aren't affected.
    installLlmMatchers(expect);
  });

  it('fails with a clear message when no llmJudge is provided', async () => {
    installLlmMatchers(expect);

    await expect(
      expect('anything').toLlmJudgeMatch('question', 'expected'),
    ).rejects.toThrow(/No llmJudge callback provided/);
  });

  it('throws (does not resolve to a passing negation) when the judge call fails', async () => {
    mockJudge.mockRejectedValue(new Error('rate limited'));

    await expect(
      expect('The capital of Telangana is Hyderabad.').not.toLlmJudgeMatch(
        'What is the capital of Telangana?',
        'Hyderabad',
        { llmJudge: mockJudge },
      ),
    ).rejects.toThrow(/rate limited/);
  });

  it('throws when criteria contain duplicate ids instead of silently double-weighting them', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'a', score: 0.9 }],
    });

    await expect(
      expect('anything').toLlmJudgeMatch('question', 'expected', {
        llmJudge: mockJudge,
        criteria: [
          { id: 'a', description: 'First.', weight: 1 },
          { id: 'a', description: 'Duplicate id.', weight: 1 },
        ],
      }),
    ).rejects.toThrow(/unique/);
  });

  it('throws when a criterion has a non-positive weight', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'a', score: 0.9 }],
    });

    await expect(
      expect('anything').toLlmJudgeMatch('question', 'expected', {
        llmJudge: mockJudge,
        criteria: [{ id: 'a', description: 'First.', weight: -1 }],
      }),
    ).rejects.toThrow();
  });

  it('threads custom criteria and threshold through to the underlying evaluation', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'tone', score: 0.6, reason: 'A bit terse.' }],
    });
    const options = {
      llmJudge: mockJudge,
      criteria: [
        { id: 'tone', description: 'Is the tone warm and helpful?', weight: 1 },
      ],
    };

    // Default threshold (0.7) fails a 0.6 score...
    await expect(
      expect('Sure.').toLlmJudgeMatch('Be polite.', 'A warm reply.', options),
    ).rejects.toThrow();

    // ...but a lower custom threshold makes the same score pass, proving
    // both `criteria` and `threshold` actually reach the evaluation.
    await expect('Sure.').toLlmJudgeMatch('Be polite.', 'A warm reply.', {
      ...options,
      threshold: 0.5,
    });
  });

  it('throws when the judge response fails schema validation', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'correctness', score: 1.5 }],
    });

    await expect(
      expect('anything').toLlmJudgeMatch('question', 'expected', {
        llmJudge: mockJudge,
      }),
    ).rejects.toThrow(/Judge response invalid/);
  });

  it('throws when the judge response is missing a score for a requested criterion', async () => {
    mockJudge.mockResolvedValue({
      criteria: [{ id: 'a', score: 0.9 }],
    });

    await expect(
      expect('anything').toLlmJudgeMatch('question', 'expected', {
        llmJudge: mockJudge,
        criteria: [
          { id: 'a', description: 'A', weight: 1 },
          { id: 'b', description: 'B', weight: 1 },
        ],
      }),
    ).rejects.toThrow(/missing scores for criteria: b/);
  });
});
