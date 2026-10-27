import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/runtime-asset-encoding.json'), 'utf8'),
);
const variants = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/optimizedAssets.json'), 'utf8'),
);
if (Object.keys(variants).length !== report.files.length)
  throw Error('Delivery manifest and verification report disagree.');
for (const file of report.files) {
  const source = fs.readFileSync(path.join(root, 'public', file.source));
  const output = fs.readFileSync(path.join(root, 'public', file.output));
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const outputHash = createHash('sha256').update(output).digest('hex').slice(0, 12);
  if (sourceHash !== file.sourceSha256)
    throw Error(`Source changed: ${file.source}. Run npm run assets:optimize.`);
  if (
    source.readUInt32BE(16) !== file.width ||
    source.readUInt32BE(20) !== file.height ||
    file.maxAlphaDifference !== 0 ||
    output.length >= source.length ||
    output.length !== file.encodedBytes ||
    !file.output.includes(outputHash) ||
    variants[file.source] !== file.output ||
    output.subarray(0, 4).toString() !== 'RIFF' ||
    output.subarray(8, 12).toString() !== 'WEBP'
  )
    throw Error(`Invalid delivery asset: ${file.output}`);
}
console.log(
  `Verified ${report.files.length} delivery images, source hashes, atlas dimensions and alpha records.`,
);
