import { createHash } from 'node:crypto';

/** Git may check text out as CRLF on Windows and LF on Linux. Asset recipes
 * depend on the text content; encoded images still require an exact byte hash. */
export function assetSourceHash(file, bytes) {
  const source = /\.(?:[cm]?[jt]sx?|json|css)$/i.test(file)
    ? bytes.toString('utf8').replace(/\r\n/g, '\n')
    : bytes;
  return createHash('sha256').update(source).digest('hex');
}
