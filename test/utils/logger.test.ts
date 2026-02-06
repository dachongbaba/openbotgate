import { formatDuration, truncateOutput } from '../../src/utils/logger';

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(10)).toBe('10ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(1300)).toBe('1.3s');
    expect(formatDuration(59999)).toBe('60.0s');
  });

  it('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1.0m');
    expect(formatDuration(90000)).toBe('1.5m');
  });

  it('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1.0h');
    expect(formatDuration(5400000)).toBe('1.5h');
  });

  it('formats days', () => {
    expect(formatDuration(86400000)).toBe('1.0d');
    expect(formatDuration(129600000)).toBe('1.5d');
  });
});

describe('truncateOutput', () => {
  it('returns (empty) for empty output', () => {
    expect(truncateOutput('')).toBe('(empty)');
    expect(truncateOutput(null as any)).toBe('(empty)');
  });

  it('returns short output as-is', () => {
    expect(truncateOutput('hello')).toBe('hello');
  });

  it('truncates by line count', () => {
    const input = 'line1\nline2\nline3\nline4\nline5\nline6\nline7';
    const result = truncateOutput(input, 3);

    expect(result).toBe('line1\nline2\nline3\n... (4 more lines)');
  });

  it('truncates by character count', () => {
    const input = 'a'.repeat(600);
    const result = truncateOutput(input, 10, 100);

    expect(result.length).toBe(103); // 100 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });
});
