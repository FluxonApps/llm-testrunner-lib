import { describe, it, expect } from '@jest/globals';
import { resolveActualValue } from './actual-value-resolver';
import type { ExpectedOutcomeField } from '../../types/llm-test-runner';

type TextField = Extract<ExpectedOutcomeField, { type: 'text' }>;

function textField(overrides: Partial<TextField> = {}): TextField {
  return {
    type: 'text',
    label: 'Expected',
    value: 'hello',
    ...overrides,
  };
}

describe('resolveActualValue', () => {
  it('uses response text by default when evaluationSource is missing', async () => {
    const field = textField();
    const resolved = await resolveActualValue(field, { text: 'Model output' });
    expect(resolved).toEqual({ success: true, value: 'Model output' });
  });

  it('returns failure when text source has missing output text', async () => {
    const field = textField({ evaluationSource: { type: 'text' } });
    const resolved = await resolveActualValue(field, { metadata: {} });
    expect(resolved).toEqual({
      success: false,
      error: 'Model response text is empty.',
    });
  });

  it('uses registered custom extractor output', async () => {
    const field = textField({
      evaluationSource: { type: 'custom', extractorId: 'tool-name' },
    });
    const resolved = await resolveActualValue(
      field,
      { text: 'ignored', metadata: { tool: 'lookup' } },
      {
        'tool-name': payload => String(payload.metadata?.tool || ''),
      },
    );
    expect(resolved).toEqual({ success: true, value: 'lookup' });
  });

  it('returns failure for unknown extractor ids', async () => {
    const field = textField({
      evaluationSource: { type: 'custom', extractorId: 'missing' },
    });
    const resolved = await resolveActualValue(field, { text: 'value' }, {});
    expect(resolved).toEqual({
      success: false,
      error: 'Extractor "missing" is not registered.',
    });
  });
});
