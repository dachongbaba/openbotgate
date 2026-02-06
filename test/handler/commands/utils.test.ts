import { splitString } from '../../../src/handler/commands/utils';

describe('splitString', () => {
  it('returns single chunk for short string', () => {
    const result = splitString('hello', 100);

    expect(result).toEqual(['hello']);
  });

  it('splits at newline boundary', () => {
    // lastIndexOf('\n', 10) finds newline at position 5
    // So it splits into separate lines
    const result = splitString('line1\nline2\nline3', 10);

    expect(result).toEqual(['line1', 'line2', 'line3']);
  });

  it('splits at maxLength when no newline found', () => {
    // No newline, so splits at maxLength (5)
    // substring(0, 5) = 'abcde'
    // remaining = 'abcdefghij'.substring(6) = 'ghij' (skips char at splitIndex)
    const result = splitString('abcdefghij', 5);

    expect(result).toEqual(['abcde', 'ghij']);
  });

  it('returns empty array for empty string', () => {
    // while condition (remaining.length > 0) fails immediately
    const result = splitString('', 100);

    expect(result).toEqual([]);
  });

  it('handles string exactly at maxLength', () => {
    const result = splitString('12345', 5);

    expect(result).toEqual(['12345']);
  });

  it('splits long text without newlines', () => {
    const result = splitString('abcdefghijklmno', 5);

    expect(result).toEqual(['abcde', 'ghijk', 'mno']);
  });
});
