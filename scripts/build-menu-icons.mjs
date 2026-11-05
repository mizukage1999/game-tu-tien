// Precut UI glyphs from authored effect sheets. No runtime canvas readback or PNG encoding.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assetBrowser } from './lib/asset-browser.mjs';
import { assetSourceHash } from './lib/asset-source-hash.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const browser = await assetBrowser(root);
try {
  const jobs = await browser.evaluate(`(async()=>{
    const {HERO_SPELLS}=await import('/src/data/heroSkills.ts');
    const {spellCell,schoolSheet}=await import('/src/data/heroSpellArt.ts');
    const {WANG_SIGNATURE_SKILLS}=await import('/src/data/skillCatalog.ts');
    const {wangIconArt}=await import('/src/data/wangSkills.ts');
    return [
      ...Object.values(HERO_SPELLS).map(art=>({id:art.id,source:schoolSheet(art.hero).directory+'/'+art.hero+'.png',box:spellCell(art.id)})),
      ...WANG_SIGNATURE_SKILLS.map(id=>{const art=wangIconArt(id),cell=art.size/(art.columns??2);return{id,source:art.url,box:[art.index%(art.columns??2)*cell,Math.floor(art.index/(art.columns??2))*cell,cell,cell]}})
    ];
  })()`);
  const manifest = {},
    files = [];
  for (const job of jobs) {
    const result = await browser.evaluate(`(async()=>{
      const job=${JSON.stringify(job)},images=window.__menuImages??={};
      let image=images[job.source];if(!image){image=new Image();image.src=job.source;await image.decode();images[job.source]=image;}
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';
      ctx.beginPath();ctx.arc(64,64,63.5,0,Math.PI*2);ctx.clip();ctx.drawImage(image,...job.box,0,0,128,128);
      const original=ctx.getImageData(0,0,128,128).data,data=canvas.toDataURL('image/webp',.95);
      if(!data.startsWith('data:image/webp;'))throw Error('WebP unavailable');
      const decoded=new Image();decoded.src=data;await decoded.decode();
      const check=document.createElement('canvas');check.width=check.height=128;
      const c=check.getContext('2d',{willReadFrequently:true});c.drawImage(decoded,0,0);
      const bytes=c.getImageData(0,0,128,128).data;let alpha=0;
      for(let i=3;i<bytes.length;i+=4)alpha=Math.max(alpha,Math.abs(bytes[i]-original[i]));
      if(alpha)throw Error('Alpha changed: '+job.id);
      return {data:data.split(',')[1],alpha};
    })()`);
    const bytes = Buffer.from(result.data, 'base64');
    const output = `/assets/optimized/menu-skill-${job.id}.${hash(bytes).slice(0, 12)}.webp`;
    fs.writeFileSync(path.join(root, 'public', output), bytes);
    manifest[job.id] = output;
    files.push({ id: job.id, output, bytes: bytes.length, maxAlphaDifference: result.alpha });
  }
  fs.writeFileSync(
    path.join(root, 'src/data/menuIconAssets.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  const sources = [...new Set(jobs.map((j) => j.source))].map((source) => ({
    source,
    sha256: hash(fs.readFileSync(path.join(root, 'public', source))),
  }));
  const layoutSources = [
    'src/data/heroSkills.ts',
    'src/data/heroSpellArt.ts',
    'src/data/skillCatalog.ts',
    'src/data/wangSkills.ts',
  ].map((source) => ({ source, sha256: assetSourceHash(source, fs.readFileSync(path.join(root, source))) }));
  fs.writeFileSync(
    path.join(root, 'docs/menu-icon-encoding.json'),
    JSON.stringify({ size: 128, quality: 0.95, sources, layoutSources, files }, null, 2) + '\n',
  );
  console.log(
    `Prepared ${files.length} menu glyphs (${files.reduce((n, f) => n + f.bytes, 0)} bytes), alpha preserved.`,
  );
} finally {
  await browser.close();
}
