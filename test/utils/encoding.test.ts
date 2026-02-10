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

    it('falls back to utf8 when iconv.decode throws', () => {
      jest.isolateModules(() => {
        jest.doMock('../../src/config/config', () => ({
          config: {
            execution: { shellOutputEncoding: 'gbk' },
          },
        }));
        jest.doMock('iconv-lite', () => {
          const actual = jest.requireActual<typeof import('iconv-lite')>('iconv-lite');
          return {
            ...actual,
            encodingExists: () => true,
            decode: () => {
              throw new Error('decode error');
            },
          };
        });
        const { decodeShellChunk: decode } = require('../../src/utils/encoding');
        const buf = Buffer.from('fallback', 'utf8');
        expect(decode(buf)).toBe('fallback');
      });
    });
  });
});
