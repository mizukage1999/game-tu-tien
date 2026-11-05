import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assetBrowser } from './lib/asset-browser.mjs';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
const canvasModule =
  'data:text/javascript;base64,' +
  Buffer.from(
    transpile(fs.readFileSync(path.join(root, 'src/game/art/canvas.ts'), 'utf8')),
  ).toString('base64');
const builderModule = transpile(
  fs.readFileSync(path.join(root, 'src/game/maps/MapBuilder.ts'), 'utf8'),
).replace("'../art/canvas'", JSON.stringify(canvasModule));
const { MapBuilder } = await import(
  'data:text/javascript;base64,' + Buffer.from(builderModule).toString('base64')
);
const mapsSource = fs.readFileSync(path.join(root, 'src/game/maps/worldMaps.ts'), 'utf8');
const ast = ts.createSourceFile('worldMaps.ts', mapsSource, ts.ScriptTarget.ES2020, true);
const villageFunction = ast.statements
  .find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'vuongGiaThon')
  .getText(ast)
  .replace('export ', '');
const villageHelpers = ast.statements
  .filter(
    (node) =>
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((d) =>
          ['block', 'point'].includes(d.name.getText(ast)),
        )) ||
      (ts.isFunctionDeclaration(node) && ['trees', 'building'].includes(node.name?.text)),
  )
  .map((node) => node.getText(ast))
  .join('\n');
// Ground depends only on terrain and decor; gameplay reservations stay runtime-owned.
const villageMap = new Function(
  'MapBuilder',
  transpile(
    villageHelpers +
      '\nconst finish=(b,meta)=>b.build(meta);\n' +
      villageFunction +
      '\nreturn vuongGiaThon();',
  ),
)(MapBuilder);
const sourceFiles = [
  'public/assets/heroes-v8/children.png',
  'public/assets/heroes-v8/adults.png',
  'public/assets/heroes-v8/casting.png',
  'public/assets/heroes-v7/roster.png',
  'public/assets/maps/village-architecture-v3.png',
  'public/assets/maps/village-nature-v3.png',
  'public/assets/maps/world-people.png',
  'public/assets/ui/cultivation/realm-crests-v1.png',
  'public/assets/maps/travel-people-v2.png',
  'public/assets/maps/courtyard-architecture.png',
  'public/assets/maps/world-materials-v4.png',
  'src/data/heroes.ts',
  'src/data/villageStartupLayout.ts',
  'src/game/art/heroAtlas.ts',
  'src/game/art/prepareHeroSheet.ts',
  'src/game/maps/worldMaps.ts',
  'src/game/maps/MapBuilder.ts',
  'src/game/art/worldGround.ts',
  'src/game/art/villageGround.ts',
  'src/game/art/worldPalette.ts',
  'src/game/art/canvas.ts',
  'src/game/art/tiles.ts',
  'src/game/art/iso.ts',
];
const browser = await assetBrowser(root);
try {
  await browser.evaluate(`(async()=>{
    window.compiled={};window.images={};
    window.encode=async(key,canvas)=>{
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const original=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const data=canvas.toDataURL('image/webp',0.95);if(!data.startsWith('data:image/webp;'))throw Error('WebP unavailable');
      const image=new Image();image.src=data;await image.decode();
      const check=document.createElement('canvas');check.width=canvas.width;check.height=canvas.height;
      const c=check.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
      const decoded=c.getImageData(0,0,check.width,check.height).data;let difference=0;
      for(let i=3;i<decoded.length;i+=4)difference=Math.max(difference,Math.abs(decoded[i]-original[i]));
      if(difference)throw Error('Alpha changed: '+key);
      compiled[key]={data:data.split(',')[1],width:canvas.width,height:canvas.height,maxAlphaDifference:difference};
    };
    window.load=async(url)=>{if(images[url])return images[url];const image=new Image();image.src=url;await image.decode();images[url]=image;return image;};
    const {HEROES}=await import('/src/data/heroes.ts');
    const {prepareHeroSheet}=await import('/src/game/art/prepareHeroSheet.ts');
    const {directionalCell}=await import('/src/game/art/heroAtlas.ts');
    const child=await load('/assets/heroes-v8/children.png'),adult=await load('/assets/heroes-v8/adults.png'),casting=await load('/assets/heroes-v8/casting.png');
    const roster=await load('/assets/heroes-v7/roster.png');
    for(const [row,hero] of HEROES.entries()){
      const sheet=prepareHeroSheet(row,child,child,true);
      await encode('hero-child-'+hero.id,sheet);
      const portrait=document.createElement('canvas');portrait.width=portrait.height=128;
      portrait.getContext('2d').drawImage(sheet,0,0,128,128,0,0,128,128);await encode('portrait-'+hero.id,portrait);
      const [x,y,width]=directionalCell('children',row,0);
      const head=document.createElement('canvas');head.width=width-32;head.height=110;
      head.getContext('2d').drawImage(child,x+16,y+2,width-32,110,0,0,width-32,110);await encode('head-'+hero.id,head);
      const adultHead=document.createElement('canvas');adultHead.width=236;adultHead.height=226;
      adultHead.getContext('2d').drawImage(roster,row%4*384+74,Math.floor(row/4)*512+12,236,226,0,0,236,226);
      await encode('adult-head-'+hero.id,adultHead);
      await encode('hero-adult-'+hero.id,prepareHeroSheet(row,adult,casting,false));
    }
    window.heroIds=HEROES.map(h=>h.id);
    const crests=await load('/assets/ui/cultivation/realm-crests-v1.png');
    const crestSheet=document.createElement('canvas');crestSheet.width=768;crestSheet.height=512;
    const crestContext=crestSheet.getContext('2d');crestContext.imageSmoothingQuality='high';
    crestContext.drawImage(crests,0,0,768,512);await encode('realm-crests',crestSheet);
    const {VILLAGE_STARTUP_SPRITES:sprites,VILLAGE_STARTUP_NPCS:npcs}=await import('/src/data/villageStartupLayout.ts');
    const architecture=await load('/assets/maps/village-architecture-v3.png'),nature=await load('/assets/maps/village-nature-v3.png');
    const entries=[];window.npcBounds={};
    for(const [name,index]of sprites){
      const source=index<6?architecture:nature,size=Math.floor(source.width/3),cell=index%6;
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,cell%3*size,Math.floor(cell/3)*size,size,size,0,0,size,size);
      const data=ctx.getImageData(0,0,size,size).data;let l=size,t=size,r=-1,b=-1;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[(y*size+x)*4+3]>=32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
      l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(size-1,r+2);b=Math.min(size-1,b+2);
      entries.push({key:'village25d-'+name,source:canvas,x:l,y:t,width:r-l+1,height:b-t+1});
    }
    const courtyard=await load('/assets/maps/courtyard-architecture.png');
    entries.push({key:'village-reference-court-notice',source:courtyard,x:Math.round(.025*courtyard.width),y:Math.round(.72*courtyard.height),width:Math.round(.30*courtyard.width),height:Math.round(.265*courtyard.height)});
    const people=await load('/assets/maps/world-people.png');
    for(const [i,id]of npcs.entries()){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=180;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';
      if(id==='a_moc'){
        const travel=await load('/assets/maps/travel-people-v2.png');
        const cell=document.createElement('canvas');cell.width=travel.width/3;cell.height=travel.height/2;
        const c=cell.getContext('2d',{willReadFrequently:true});c.drawImage(travel,2*cell.width,cell.height,cell.width,cell.height,0,0,cell.width,cell.height);
        const pixels=c.getImageData(0,0,cell.width,cell.height).data;let l=cell.width,t=cell.height,r=0,b=0;
        for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(pixels[(y*cell.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
        if(r<=l||b<=t)throw Error('A Moc sprite is empty');
        const w=r-l+1,h=b-t+1,scale=Math.min(160/w,164/h);
        ctx.drawImage(cell,l,t,w,h,(180-w*scale)/2,174-h*scale,w*scale,h*scale);
      }else ctx.drawImage(people,i%3*people.width/3,Math.floor(i/3)*people.height/2,people.width/3,people.height/2,0,0,180,180);
      const data=ctx.getImageData(0,0,180,180).data;let top=180,bottom=-1;
      for(let y=0;y<180;y++)for(let x=0;x<180;x++)if(data[(y*180+x)*4+3]>=48){top=Math.min(top,y);bottom=Math.max(bottom,y);}
      npcBounds[id]={top,bottom};entries.push({key:'npc-village-'+id,source:canvas,x:0,y:0,width:180,height:180});
      await encode('npc-'+id,canvas);
    }
    // Full-resolution crops with duplicated edge texels; no new illustration or downscaling.
    const width=2048;let x=2,y=2,rowHeight=0;
    window.frames={};
    for(const entry of entries){
      if(x+entry.width+2>width){x=2;y+=rowHeight+4;rowHeight=0;}
      frames[entry.key]=[x,y,entry.width,entry.height];x+=entry.width+4;rowHeight=Math.max(rowHeight,entry.height);
    }
    const atlas=document.createElement('canvas');atlas.width=width;atlas.height=y+rowHeight+2;
    const ctx=atlas.getContext('2d');
    for(const entry of entries){const [x,y,w,h]=frames[entry.key];ctx.drawImage(entry.source,entry.x,entry.y,w,h,x,y,w,h);}
    await encode('village',atlas);
    const source=await load('/assets/maps/world-materials-v4.png');
    const materials=document.createElement('canvas');materials.width=1024;materials.height=768;
    const paint=materials.getContext('2d');
    for(let i=0;i<12;i++)paint.drawImage(source,i%4*source.width/4,Math.floor(i/4)*source.height/3,source.width/4,source.height/3,i%4*256,Math.floor(i/4)*256,256,256);
    await encode('materials',materials);
  })()`);
  await browser.evaluate(`(async()=>{
    const {buildWorldGround}=await import('/src/game/art/worldGround.ts');
    const source=await load('/assets/maps/world-materials-v4.png');
    const ground=buildWorldGround(${JSON.stringify(villageMap)},source);window.groundPages=[];
    for(let y=0;y<ground.height;y+=1024)for(let x=0;x<ground.width;x+=1024){
      const width=Math.min(1024,ground.width-x),height=Math.min(1024,ground.height-y);
      const page=document.createElement('canvas');page.width=width+2;page.height=height+2;
      page.getContext('2d').drawImage(ground.canvas,x-1,y-1,width+2,height+2,0,0,width+2,height+2);
      const key='ground-'+x+'-'+y;await encode(key,page);groundPages.push({key,x,y,width,height});
    }
  })()`);
  const keys = await browser.evaluate('Object.keys(compiled)');
  const urls = {},
    files = [];
  fs.mkdirSync(path.join(root, 'public/assets/optimized'), { recursive: true });
  for (const key of keys) {
    const { data, ...metadata } = await browser.evaluate(`compiled[${JSON.stringify(key)}]`);
    const bytes = Buffer.from(data, 'base64'),
      url = `/assets/optimized/startup-${key}.${hash(bytes).slice(0, 12)}.webp`;
    fs.writeFileSync(path.join(root, 'public', url), bytes);
    urls[key] = url;
    files.push({ key, url, ...metadata, bytes: bytes.length });
  }
  const geometry = await browser.evaluate('({frames,npcBounds,heroIds,groundPages})');
  fs.writeFileSync(
    path.join(root, 'src/data/startupAssets.json'),
    JSON.stringify({ urls, ...geometry }, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(root, 'docs/startup-asset-encoding.json'),
    JSON.stringify(
      {
        quality: 0.95,
        sources: sourceFiles.map((source) => ({
          source,
          sha256: hash(fs.readFileSync(path.join(root, source))),
        })),
        files,
        manifestSha256: hash(fs.readFileSync(path.join(root, 'src/data/startupAssets.json'))),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify({
      files: files.length,
      villageBytes: files
        .filter((f) => ['village', 'materials', 'hero-child-wang_lam'].includes(f.key))
        .reduce((n, f) => n + f.bytes, 0),
      alphaPreserved: true,
    }),
  );
} finally {
  await browser.close();
}
