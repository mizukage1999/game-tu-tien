import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assetBrowser} from './lib/asset-browser.mjs';
import {assetSourceHash} from './lib/asset-source-hash.mjs';
const root=process.cwd(), hash=b=>createHash('sha256').update(b).digest('hex');
const ids=JSON.parse(fs.readFileSync('src/data/startupAssets.json','utf8')).heroIds;
const groups=['idle-hurt','attack','fast','strong','ultimate','death','power-extra'];
const sources=ids.flatMap(id=>groups.map(group=>'art/hero-actions-v1/'+id+'-'+group+'.png'));
const browser=await assetBrowser(root),manifest={},files=[];
try{
  await browser.evaluate("window.actionPreview=document.createElement('canvas');actionPreview.width=2400;actionPreview.height=1440;window.actionPreviewContext=actionPreview.getContext('2d');actionPreviewContext.fillStyle='#243a48';actionPreviewContext.fillRect(0,0,2400,1440);true");
  for(const [index,id]of ids.entries()){
    const compile=async function(id,index){
      const {prepareHeroActions}=await import('/src/game/art/prepareHeroActions.ts');
      const groups=['idle-hurt','attack','fast','strong','ultimate','death','power-extra'],images={};
      for(const group of groups){const im=new Image();im.src='/art/hero-actions-v1/'+id+'-'+group+'.png';await im.decode();images[group]=im;}
      const result=prepareHeroActions(images,id),pages=[];
      for(const canvas of result.canvases){
      const original=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
      const url=canvas.toDataURL('image/webp',.95),check=new Image();check.src=url;await check.decode();
      const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(check,0,0);
      const decoded=ctx.getImageData(0,0,c.width,c.height).data;
      let maxAlphaDifference=0;for(let i=3;i<original.length;i+=4)maxAlphaDifference=Math.max(maxAlphaDifference,Math.abs(original[i]-decoded[i]));
      if(maxAlphaDifference)throw Error('Alpha changed '+id);
      pages.push({data:url.split(',')[1],width:canvas.width,height:canvas.height,maxAlphaDifference});
      }
      const p=window.actionPreviewContext;p.fillStyle='#ffe1a5';p.font='15px sans-serif';
      for(const [col,group]of groups.slice(0,6).entries()){
        p.fillText(id+' / '+group,col*400+5,index*180+18);
        for(const [j,phase]of [0,3,5,7].entries()){
          const action=group==='idle-hurt'?(phase<4?'idle':'hurt'):group==='death'?'downed':group==='attack'?'attack':'skill_'+group;
          const f=result.frames[action+'_left_'+(group==='idle-hurt'?phase%4:phase)];
          p.drawImage(result.canvases[f.page],f.x,f.y,f.w,f.h,col*400+j*100+f.ox*.625,index*180+30+f.oy*.625,f.w*.625,f.h*.625);
          p.fillText('p'+phase,col*400+j*100+10,index*180+155);
        }
      }
      return{pages,frames:result.frames,audit:result.audit};
    };
    const encoded=await browser.evaluate('('+compile.toString()+')('+JSON.stringify(id)+','+index+')');
    const pages=[];
    for(const [index,page]of encoded.pages.entries()){
      const bytes=Buffer.from(page.data,'base64'),url='/assets/optimized/hero-actions-v1-'+id+'-p'+index+'.'+hash(bytes).slice(0,12)+'.webp';
      fs.writeFileSync(path.join(root,'public',url),bytes);
      pages.push({url,width:page.width,height:page.height,bytes:bytes.length,sha256:hash(bytes),maxAlphaDifference:page.maxAlphaDifference});
    }
    manifest[id]={pages:pages.map(({url,width,height})=>({url,width,height})),frames:encoded.frames};
    const bytes=pages.reduce((n,p)=>n+p.bytes,0);
    files.push({hero:id,pages,frames:Object.keys(encoded.frames).length,bytes,audit:encoded.audit});
    console.log(JSON.stringify({hero:id,pages:pages.length,bytes,frames:Object.keys(encoded.frames).length}));
  }
  const preview=await browser.evaluate("actionPreview.toDataURL('image/png').split(',')[1]");
  fs.writeFileSync('.preview/hero-action-contact.png',Buffer.from(preview,'base64'));
  fs.writeFileSync('src/data/heroActionAssets.json',JSON.stringify(manifest,null,2)+'\n');
  const dependencies=['src/game/art/prepareHeroActions.ts','src/game/art/runPoseBounds.ts','src/game/art/authoredRowEdges.ts','src/game/art/heroDirections.ts','scripts/build-hero-actions.mjs'];
  fs.writeFileSync('docs/hero-action-encoding.json',JSON.stringify({
    quality:.95,sourceFrames:3584,virtualCell:160,foot:150,
    sources:[...sources,...dependencies].map(source=>({source,sha256:assetSourceHash(source,fs.readFileSync(source))})),
    manifestSha256:assetSourceHash('heroActionAssets.json',fs.readFileSync('src/data/heroActionAssets.json')),files,
  },null,2)+'\n');
}finally{await browser.close()}
