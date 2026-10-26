import { describe, it, expect } from 'vitest';
import { WhisperCrypto, parseWhisperKey } from './whisperCrypto';
describe('private whisper encryption', () => {
  it('delivers Vietnamese text to the intended online peer without plaintext in the relay packet', async () => {
    const a = new WhisperCrypto(),
      b = new WhisperCrypto(),
      text = 'Đạo hữu, cùng đi bí cảnh nhé 🌸';
    const encrypted = await a.seal(await b.publicKey(), text, 'a', 'b');
    expect(JSON.stringify(encrypted)).not.toContain(text);
    expect(await b.open(encrypted)).toBe(text);
    const reply = await b.seal(await a.publicKey(), 'Được, ta đến ngay!', 'b', 'a');
    expect(await a.open(reply)).toBe('Được, ta đến ngay!');
  });
  it('rejects a third reader, a changed recipient and a modified message body', async () => {
    const a = new WhisperCrypto(),
      b = new WhisperCrypto(),
      c = new WhisperCrypto();
    const message = await a.seal(await b.publicKey(), 'Tin riêng', 'a', 'b');
    await expect(c.open(message)).rejects.toThrow();
    await expect(b.open({ ...message, to: 'c' })).rejects.toThrow();
    await expect(
      b.open({ ...message, data: (message.data[0] === 'A' ? 'B' : 'A') + message.data.slice(1) }),
    ).rejects.toThrow();
    expect(parseWhisperKey({ kty: 'EC', crv: 'P-256', x: 'bad', y: 'bad' })).toBeUndefined();
  });
});
