import { decodeShellChunk } from '../../src/utils/encoding';

describe('encoding', () => {
  describe('decodeShellChunk', () => {
    it('returns utf8 string when default encoding is utf8', () => {
      const buf = Buffer.from('hello', 'utf8');
      expect(decodeShellChunk(buf)).toBe('hello');
    });

    it('decodes buffer with correct length', () => {
      const text = '中文 test';
      const buf = Buffer.from(text, 'utf8');
      expect(decodeShellChunk(buf)).toBe(text);
    });
  });
});
