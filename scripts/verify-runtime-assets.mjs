import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assetSourceHash } from './lib/asset-source-hash.mjs';

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

const icons = JSON.parse(fs.readFileSync(path.join(root, 'src/data/uiIconAssets.json'), 'utf8'));
const iconReport = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/ui-icon-encoding.json'), 'utf8'),
);
const iconLayout = fs.readFileSync(path.join(root, 'src/data/uiIconLayout.json'));
const layout = JSON.parse(iconLayout.toString());
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (assetSourceHash('uiIconLayout.json', iconLayout) !== iconReport.layoutSha256)
  throw Error('UI icon layout changed. Run npm run assets:icons.');
for (const source of iconReport.sources)
  if (digest(fs.readFileSync(path.join(root, 'public', source.source))) !== source.sha256)
    throw Error(`UI icon source changed: ${source.source}. Run npm run assets:icons.`);
const expectedIcons = new Set([
  ...layout.inventory.map((_, index) => `item:${index}`),
  ...layout.skills.map((id) => `skill:${id}`),
  ...Array.from({ length: layout.crests }, (_, index) => `crest:${index}`),
]);
if (
  Object.keys(icons).length !== expectedIcons.size ||
  iconReport.files.length !== expectedIcons.size
)
  throw Error('UI icon manifest is incomplete. Run npm run assets:icons.');
for (const file of iconReport.files) {
  const bytes = fs.readFileSync(path.join(root, 'public', file.output));
  if (
    !expectedIcons.delete(file.key) ||
    icons[file.key] !== file.output ||
    file.maxAlphaDifference !== 0 ||
    bytes.length !== file.encodedBytes ||
    !file.output.includes(digest(bytes).slice(0, 12)) ||
    bytes.subarray(0, 4).toString() !== 'RIFF' ||
    bytes.subarray(8, 12).toString() !== 'WEBP'
  )
    throw Error(`Invalid UI icon: ${file.key}. Run npm run assets:icons.`);
}
console.log(`Verified ${iconReport.files.length} precut UI icons and their source hashes.`);

const menuIcons=JSON.parse(fs.readFileSync(path.join(root,'src/data/menuIconAssets.json'),'utf8'));
const menuReport=JSON.parse(fs.readFileSync(path.join(root,'docs/menu-icon-encoding.json'),'utf8'));
for(const source of menuReport.layoutSources)
  if(assetSourceHash(source.source,fs.readFileSync(path.join(root,source.source)))!==source.sha256)
    throw Error(`Menu icon layout changed: ${source.source}. Run npm run assets:menu.`);
for(const source of menuReport.sources)
  if(digest(fs.readFileSync(path.join(root,'public',source.source)))!==source.sha256)
    throw Error(`Menu icon source changed: ${source.source}. Run npm run assets:menu.`);
for(const file of menuReport.files){
  const bytes=fs.readFileSync(path.join(root,'public',file.output));
  if(menuIcons[file.id]!==file.output||file.bytes!==bytes.length||file.maxAlphaDifference!==0||!file.output.includes(digest(bytes).slice(0,12))||bytes.subarray(8,12).toString()!=='WEBP')
    throw Error(`Invalid menu icon: ${file.id}. Run npm run assets:menu.`);
}
if(Object.keys(menuIcons).length!==menuReport.files.length)throw Error('Menu icon report is incomplete.');
console.log(`Verified ${menuReport.files.length} menu skill icons and their source hashes.`);

const startupFile=fs.readFileSync(path.join(root,'src/data/startupAssets.json'));
const startup=JSON.parse(startupFile.toString());
const startupReport=JSON.parse(fs.readFileSync(path.join(root,'docs/startup-asset-encoding.json'),'utf8'));
if(assetSourceHash('startupAssets.json',startupFile)!==startupReport.manifestSha256)
  throw Error('Startup atlas metadata changed. Run npm run assets:startup.');
for(const source of startupReport.sources)
  if(assetSourceHash(source.source,fs.readFileSync(path.join(root,source.source)))!==source.sha256)
    throw Error(`Startup source changed: ${source.source}. Run npm run assets:startup.`);
for(const file of startupReport.files){
  const bytes=fs.readFileSync(path.join(root,'public',file.url));
  if(startup.urls[file.key]!==file.url||file.bytes!==bytes.length||file.maxAlphaDifference!==0||!file.url.includes(digest(bytes).slice(0,12))||bytes.subarray(8,12).toString()!=='WEBP')
    throw Error(`Invalid startup asset: ${file.key}. Run npm run assets:startup.`);
}
const atlas=startupReport.files.find(file=>file.key==='village');
for(const [key,[x,y,width,height]] of Object.entries(startup.frames))
  if(x<0||y<0||width<=0||height<=0||x+width>atlas.width||y+height>atlas.height)
    throw Error(`Startup frame exceeds atlas: ${key}.`);
if(Object.keys(startup.urls).length!==startupReport.files.length)
  throw Error('Startup asset report is incomplete.');
console.log(`Verified ${startupReport.files.length} prepared startup assets, geometry and source hashes.`);
