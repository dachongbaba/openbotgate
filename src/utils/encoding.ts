import * as iconv from 'iconv-lite';
import { config } from '../config/config';

/**
 * Shell output decoding for globally distributed apps (GitHub, npm).
 * Uses SHELL_OUTPUT_ENCODING (config) or LANG/LC_* (Unix). On Windows, chcp is not used
 * (pwsh vs cmd give different results); set SHELL_OUTPUT_ENCODING=gbk in .env when needed.
 */

/** Locale encoding part (e.g. zh_CN.UTF-8 → utf8) → iconv encoding name. */
function getEncodingFromLocale(): string | null {
  const raw = process.env.LANG || process.env.LC_ALL || process.env.LC_CTYPE;
  if (!raw) return null;
  const part = raw.split('.').pop()?.toLowerCase().replace(/-/g, '');
  if (!part) return null;
  const map: Record<string, string> = {
    utf8: 'utf8',
    utf8mb4: 'utf8',
    ascii: 'utf8',
    c: 'utf8',
    posix: 'utf8',
    gbk: 'gbk',
    gb2312: 'gb2312',
    gb18030: 'gb18030',
    big5: 'big5',
    shiftjis: 'shift_jis',
    eucjp: 'euc-jp',
    euckr: 'euc-kr',
    iso88591: 'latin1',
    latin1: 'latin1',
    cp936: 'gbk',
    cp932: 'shift_jis',
    cp949: 'euc-kr',
    cp950: 'big5',
    cp1250: 'cp1250',
    cp1251: 'cp1251',
    cp1252: 'cp1252',
    cp1253: 'cp1253',
    cp1254: 'cp1254',
    cp1255: 'cp1255',
    cp1256: 'cp1256',
    cp1257: 'cp1257',
    cp1258: 'cp1258',
    koi8r: 'koi8-r',
    koi8u: 'koi8-u',
  };
  return map[part] ?? (part.startsWith('iso8859') ? `iso-8859-${part.slice(7)}` : null) ?? null;
}

/**
 * On Windows we do not run chcp: from pwsh "cmd /c chcp" returns 65001 (inherited),
 * while actual shell output may be 936 (GBK). Use SHELL_OUTPUT_ENCODING in .env instead.
 */
/** Resolved encoding: config override (SHELL_OUTPUT_ENCODING) > LANG/LC_* > utf8. */
function getShellEncoding(): string {
  const over = config.execution.shellOutputEncoding?.toLowerCase();
  if (over && iconv.encodingExists(over)) return over;
  const fromLocale = getEncodingFromLocale();
  if (fromLocale) return fromLocale;
  return 'utf8';
}

/** Decode shell stdout/stderr using SHELL_OUTPUT_ENCODING or LANG/LC_*. */
export function decodeShellChunk(buffer: Buffer): string {
  const enc = getShellEncoding();
  if (enc === 'utf8') return buffer.toString('utf8');
  if (!iconv.encodingExists(enc)) return buffer.toString('utf8');
  try {
    return iconv.decode(buffer, enc);
  } catch {
    return buffer.toString('utf8');
  }
}
