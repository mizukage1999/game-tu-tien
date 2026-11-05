import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assetSourceHash } from './asset-source-hash.mjs';

test('Windows and Linux text checkouts produce the same source hash', () => {
  for (const file of ['MapBuilder.ts', 'HeroArt.tsx', 'layout.json', 'hud.css', 'build.mjs']) {
    const lf = Buffer.from('const value = "tiên";\nexport { value };\n');
    const crlf = Buffer.from(lf.toString().replace(/\n/g, '\r\n'));
    assert.equal(assetSourceHash(file, lf), assetSourceHash(file, crlf));
    assert.notEqual(assetSourceHash(file, lf), assetSourceHash(file, Buffer.from('const value = 2;\n')));
  }
});

test('image hashes retain every byte, including embedded CRLF bytes', () => {
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const changed = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0a]);
  assert.equal(assetSourceHash('sprite.png', image), createHash('sha256').update(image).digest('hex'));
  assert.notEqual(assetSourceHash('sprite.png', image), assetSourceHash('sprite.png', changed));
});
