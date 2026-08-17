import { describe, it, expect } from '@jest/globals';
import { escapeCsvField } from './test-results-csv';

describe('escapeCsvField', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1:A2)'])(
    'prefixes a leading quote for formula-trigger char: %s',
    input => {
      expect(escapeCsvField(input)).toBe(`'${input}`);
    },
  );

  it('neutralizes a HYPERLINK payload and still quotes the embedded comma/quotes', () => {
    const input = '=HYPERLINK("https://evil.example","Click")';
    expect(escapeCsvField(input)).toBe(
      `"'=HYPERLINK(""https://evil.example"",""Click"")"`,
    );
  });

  it('does not alter a field with no special characters', () => {
    expect(escapeCsvField('Capital of India')).toBe('Capital of India');
  });

  it('still quotes fields containing a comma', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  it('still escapes embedded quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });
});
