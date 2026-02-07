import { spawn } from 'child_process';
import * as iconv from 'iconv-lite';

/**
 * Shell output decoding for globally distributed apps (GitHub, npm).
 * Uses system encoding from LANG/LC_* on Unix/macOS and console code page on Windows.
 * Never modifies system encoding; defaults to UTF-8 when unknown (CI, Docker, modern OS).
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

/** Windows console code page → iconv encoding (read-only; does not run chcp to change). */
const WINDOWS_CP_TO_ENCODING: Record<number, string> = {
  437: 'cp437',
  850: 'cp850',
  852: 'cp852',
  866: 'cp866',
  874: 'cp874',
  932: 'shift_jis',
  936: 'gbk',
  949: 'euc-kr',
  950: 'big5',
  1250: 'cp1250',
  1251: 'cp1251',
  1252: 'cp1252',
  1253: 'cp1253',
  1254: 'cp1254',
  1255: 'cp1255',
  1256: 'cp1256',
  1257: 'cp1257',
  1258: 'cp1258',
  65001: 'utf8',
};

let winConsoleEncoding: string | null = null;
let winConsoleEncodingPromise: Promise<void> | null = null;

/** On Windows when LANG is unset, read console code page once (chcp) and cache. Does not change system encoding. */
export function ensureShellEncoding(): Promise<void> {
  if (winConsoleEncoding !== null || winConsoleEncodingPromise !== null) {
    return winConsoleEncodingPromise ?? Promise.resolve();
  }
  winConsoleEncodingPromise = new Promise((resolve) => {
    const child = spawn('chcp', [], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout?.on('data', (b: Buffer) => { out += b.toString('ascii'); });
    child.on('close', () => {
      const m = out.match(/(\d+)/);
      const cp = m ? parseInt(m[1], 10) : 65001;
      winConsoleEncoding = WINDOWS_CP_TO_ENCODING[cp] ?? 'utf8';
      resolve();
    });
    child.on('error', () => {
      winConsoleEncoding = 'utf8';
      resolve();
    });
  });
  return winConsoleEncodingPromise;
}

function getShellEncoding(): string {
  const fromLocale = getEncodingFromLocale();
  if (fromLocale) return fromLocale;
  if (process.platform === 'win32' && winConsoleEncoding) return winConsoleEncoding;
  return 'utf8';
}

/** Decode shell stdout/stderr using system encoding. Safe for global use; falls back to UTF-8 on unknown or decode error. */
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
