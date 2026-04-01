import { describe, it, expect } from '@jest/globals';

import { expectedOutcomeFieldSchema } from './expected-outcome';

describe('expected outcome schemas', () => {
  it('defaults outcomeMode to static when omitted (textarea only)', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: 'answer',
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.outcomeMode).toBe('static');
    expect(data.resolutionQuery).toBeUndefined();
  });

  it('allows dynamic textarea with resolutionQuery before run fills value', () => {
    const data = expectedOutcomeFieldSchema.parse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: '',
      outcomeMode: 'dynamic',
      resolutionQuery:
        'SELECT name FROM students WHERE student_id = 1',
    });

    expect(data.type).toBe('textarea');
    if (data.type !== 'textarea') return;
    expect(data.outcomeMode).toBe('dynamic');
    expect(data.resolutionQuery).toBe(
      'SELECT name FROM students WHERE student_id = 1',
    );
  });

  it('rejects dynamic textarea with empty resolutionQuery', () => {
    const parsed = expectedOutcomeFieldSchema.safeParse({
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value: '',
      outcomeMode: 'dynamic',
      resolutionQuery: '   ',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error.issues[0].path).toEqual(['resolutionQuery']);
  });
});
