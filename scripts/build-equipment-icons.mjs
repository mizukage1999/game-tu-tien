import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assetBrowser } from './lib/asset-browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const rarities = ['white', 'blue', 'green', 'purple', 'orange', 'red', 'pink'];
const sheets = [
  {
    source: '/assets/ui/equipment-tiers-v1.png',
    rows: ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'],
  },
  {
    source: '/assets/ui/school-weapons-tiers-v1.png',
    rows: [
      'ly_mo_uyen',
      'tham_nguyet',
      'so_thien',
      'hong_lien',
      'vu_minh',
      'quan_vo_tran',
      'diep_ly',
    ],
  },
];
const browser = await assetBrowser(root);
try {
  const files = await browser.evaluate(`(async()=>{
    const files=[];
    for(const sheet of ${JSON.stringify(sheets)}){
      const image=new Image();image.src=sheet.source;await image.decode();
      for(const [row,name]of sheet.rows.entries())for(const [col,rarity]of ${JSON.stringify(rarities)}.entries()){
        const x=Math.round(col*image.width/7),y=Math.round(row*image.height/sheet.rows.length);
        const width=Math.round((col+1)*image.width/7)-x,height=Math.round((row+1)*image.height/sheet.rows.length)-y;
        // Crop around the central authored item, excluding tiny fragments of a
        // neighbouring row. Only the crop changes; source alpha is never keyed out.
        const probe=document.createElement('canvas');probe.width=width;probe.height=height;
        const pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(image,x,y,width,height,0,0,width,height);
        const pixels=pc.getImageData(0,0,width,height).data,seen=new Uint8Array(width*height),parts=[];
        for(let start=0;start<seen.length;start++){
          if(seen[start]||pixels[start*4+3]<180)continue;
          const queue=[start];seen[start]=1;let l=width,t=height,r=0,b=0;
          for(let q=0;q<queue.length;q++){
            const at=queue[q],px=at%width,py=Math.floor(at/width);l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,py);b=Math.max(b,py);
            for(const n of [px?at-1:-1,px+1<width?at+1:-1,py?at-width:-1,py+1<height?at+width:-1])
              if(n>=0&&!seen[n]&&pixels[n*4+3]>=180){seen[n]=1;queue.push(n);}
          }
          const cy=(t+b)/2/height;
          if(queue.length>24&&cy>.1&&cy<.94)parts.push({l,t,r,b,n:queue.length});
        }
        parts.sort((a,b)=>b.n-a.n);
        if(!parts.length)throw Error('Missing item silhouette: '+name+rarity);
        const keep=parts.filter(p=>p.n>=parts[0].n*.15);
        const l=Math.max(0,Math.min(...keep.map(p=>p.l))-3),t=Math.max(0,Math.min(...keep.map(p=>p.t))-3);
        const r=Math.min(width,Math.max(...keep.map(p=>p.r))+4),b=Math.min(height,Math.max(...keep.map(p=>p.b))+4);
        const cw=r-l,ch=b-t,k=164/Math.max(cw,ch);
        const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';
        ctx.drawImage(image,x+l,y+t,cw,ch,(192-cw*k)/2,(192-ch*k)/2,cw*k,ch*k);
        const before=ctx.getImageData(0,0,192,192).data;
        const data=canvas.toDataURL('image/webp',.88);if(!data.startsWith('data:image/webp;'))throw Error('WebP unavailable');
        const decoded=new Image();decoded.src=data;await decoded.decode();
        ctx.clearRect(0,0,192,192);ctx.drawImage(decoded,0,0);
        const after=ctx.getImageData(0,0,192,192).data;let maxAlphaDifference=0,transparentPixels=0;
        for(let i=3;i<after.length;i+=4){maxAlphaDifference=Math.max(maxAlphaDifference,Math.abs(after[i]-before[i]));if(!after[i])transparentPixels++;}
        if(maxAlphaDifference||transparentPixels<9968)throw Error('Alpha mismatch: '+name+rarity+' difference='+maxAlphaDifference+' transparent='+transparentPixels);
        files.push({key:sheet.rows.length===6?name+':'+rarity:'weapon:'+rarity+':'+name,source:sheet.source,
          rect:[x+l,y+t,cw,ch],width:192,height:192,maxAlphaDifference,transparentPixels,data:data.split(',')[1]});
      }
    }
    return files;
  })()`);
  const urls = {},
    report = {
      sources: sheets.map((s) => ({
        source: s.source,
        sha256: hash(fs.readFileSync(path.join(root, 'public', s.source))),
      })),
      files: [],
    };
  fs.mkdirSync(path.join(root, 'public/assets/optimized'), { recursive: true });
  for (const { data, ...file } of files) {
    const bytes = Buffer.from(data, 'base64');
    const sha256 = hash(bytes);
    const url = `/assets/optimized/equipment-${file.key.replaceAll(':', '-')}.${sha256.slice(0, 12)}.webp`;
    fs.writeFileSync(path.join(root, 'public', url), bytes);
    urls[file.key] = url;
    report.files.push({ ...file, url, bytes: bytes.length, sha256 });
  }
  fs.writeFileSync(
    path.join(root, 'src/data/equipmentIconAssets.json'),
    JSON.stringify(urls, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(root, 'docs/equipment-icon-encoding.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    `Prepared ${files.length} distinct equipment icons, ${report.files.reduce((n, f) => n + f.bytes, 0)} bytes with preserved alpha.`,
  );
} finally {
  await browser.close();
}
