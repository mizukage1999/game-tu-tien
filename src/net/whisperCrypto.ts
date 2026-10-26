export interface WhisperKey {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
}
export interface WhisperEnvelope {
  id: string;
  from: string;
  to: string;
  key: WhisperKey;
  iv: string;
  data: string;
}
const encode = new TextEncoder(),
  decode = new TextDecoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
export function parseWhisperKey(raw: unknown): WhisperKey | undefined {
  if (!raw || typeof raw !== 'object') return;
  const p = raw as WhisperKey;
  if (
    p.kty !== 'EC' ||
    p.crv !== 'P-256' ||
    typeof p.x !== 'string' ||
    typeof p.y !== 'string' ||
    !/^[\w-]{43}$/.test(p.x) ||
    !/^[\w-]{43}$/.test(p.y)
  )
    return;
  return { kty: 'EC', crv: 'P-256', x: p.x, y: p.y };
}
/** Session keys stay in this tab. Only encrypted text travels over the social relay. */
export class WhisperCrypto {
  private pair = crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveBits',
  ]);
  async publicKey(): Promise<WhisperKey> {
    return parseWhisperKey(await crypto.subtle.exportKey('jwk', (await this.pair).publicKey))!;
  }
  private async derive(peer: WhisperKey, from: string, to: string) {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      { ...peer, ext: true },
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );
    const shared = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: publicKey },
      (await this.pair).privateKey,
      256,
    );
    const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: encode.encode([from, to].sort().join('|')),
        info: encode.encode('cuu-huyen/whisper/v1'),
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }
  async seal(peer: WhisperKey, text: string, from: string, to: string): Promise<WhisperEnvelope> {
    const id = crypto.randomUUID(),
      iv = crypto.getRandomValues(new Uint8Array(12)),
      key = await this.derive(peer, from, to);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: encode.encode(JSON.stringify([from, to, id])) },
      key,
      encode.encode(text),
    );
    return {
      id,
      from,
      to,
      key: await this.publicKey(),
      iv: b64(iv),
      data: b64(new Uint8Array(cipher)),
    };
  }
  async open(message: WhisperEnvelope): Promise<string> {
    const key = await this.derive(message.key, message.from, message.to);
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: unb64(message.iv),
        additionalData: encode.encode(JSON.stringify([message.from, message.to, message.id])),
      },
      key,
      unb64(message.data),
    );
    return decode.decode(plain);
  }
}
