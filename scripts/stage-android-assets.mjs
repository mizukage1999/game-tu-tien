import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist-android');
if (!existsSync(path.join(output, 'index.html')))
  throw Error('Build with vite --mode android first.');
const variants = JSON.parse(readFileSync(path.join(root, 'src/data/optimizedAssets.json'), 'utf8'));
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
let copied = 0,
  bytes = 0,
  omitted = 0;
for (const source of walk(path.join(root, 'public'))) {
  const relative = path.relative(path.join(root, 'public'), source).replaceAll('\\', '/');
  const url = `/${relative}`;
  // Source-only running atlas and lossless originals have verified WebP delivery files.
  if (relative.startsWith('assets/heroes-run-v1/') || (variants[url] && variants[url] !== url)) {
    if (variants[url] && !existsSync(path.join(root, 'public', variants[url])))
      throw Error(`Missing delivery asset: ${variants[url]}`);
    omitted += statSync(source).size;
    continue;
  }
  if (relative.startsWith('.') || /(?:^|\/)(?:admin|\.env)(?:[/.]|$)/.test(relative)) continue;
  const target = path.join(output, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
  copied++;
  bytes += statSync(source).size;
}
// Validate every delivery URL embedded in the game's runtime manifests.
for (const file of walk(path.join(root, 'src/data')).filter((file) => file.endsWith('.json'))) {
  const value = JSON.parse(readFileSync(file, 'utf8'));
  const visit = (node) => {
    if (typeof node === 'string' && node.startsWith('/assets/')) {
      const resolved = variants[node] ?? node;
      if (!existsSync(path.join(output, resolved)))
        throw Error(`Missing packaged asset ${resolved} (${path.basename(file)})`);
    } else if (node && typeof node === 'object') Object.values(node).forEach(visit);
  };
  visit(value);
}
if (existsSync(path.join(output, 'admin'))) throw Error('Admin dashboard must not be packaged.');
const report = {
  files: copied,
  assetMiB: +(bytes / 1048576).toFixed(2),
  omittedSourceMiB: +(omitted / 1048576).toFixed(2),
};
writeFileSync(
  path.join(output, 'android-assets-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log('Android asset staging:', report);
