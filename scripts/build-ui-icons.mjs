// Precut the existing UI artwork so entering the game needs only visible icons.
// Uses the same Canvas resampling as the former runtime crops; alpha is verified.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assetSourceHash } from './lib/asset-source-hash.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const layoutFile = path.join(root, 'src/data/uiIconLayout.json');
const layout = JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = [
  '/assets/ui/cultivation/bag-items-v1.png',
  '/assets/ui/cultivation/skill-icons-alpha-v2.png',
  '/assets/ui/loading-crests-v2.png',
];
const jobs = [
  ...layout.inventory.map((region, index) => ({
    key: `item:${index}`,
    kind: 'item',
    region,
    source: sources[0],
    size: 256,
  })),
  ...layout.skills.map((id, index) => ({
    key: `skill:${id}`,
    kind: 'skill',
    index,
    source: sources[1],
    size: 128,
  })),
  ...Array.from({ length: layout.crests }, (_, index) => ({
    key: `crest:${index}`,
    kind: 'crest',
    index,
    source: sources[2],
    size: 512,
  })),
];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost').pathname;
  if (url === '/') {
    res
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end('<!doctype html><title>Local UI icon encoder</title>');
    return;
  }
  if (!sources.includes(url)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', 'image/png');
  fs.createReadStream(path.join(publicRoot, url)).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const chromePath =
  process.env.CHROME_PATH ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((file) => fs.existsSync(file));
if (!chromePath) {
  server.close();
  throw Error('Set CHROME_PATH to a local Chrome executable.');
}
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--remote-debugging-port=9378',
    `--user-data-dir=${path.join(root, '.preview/ui-icon-codec-chrome')}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let socket;
try {
  let target;
  for (let i = 0; i < 100; i++) {
    try {
      target = (await (await fetch('http://127.0.0.1:9378/json')).json()).find(
        (tab) => tab.type === 'page',
      );
      if (target) break;
    } catch {
      /* Wait for the local encoder. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!target) throw Error('Chrome did not start.');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data),
      call = pending.get(message.id);
    if (call) {
      pending.delete(message.id);
      message.error ? call.reject(message.error) : call.resolve(message.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  await send('Page.navigate', { url: base });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const manifest = {},
    files = [];
  fs.mkdirSync(path.join(publicRoot, 'assets/optimized'), { recursive: true });
  for (const job of jobs) {
    const result = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      timeout: 30000,
      expression: `(async () => {
        const job = ${JSON.stringify(job)}, images = window.__iconSources ??= {};
        let source = images[job.source];
        if (!source) { source = new Image(); source.src = ${JSON.stringify(base)} + job.source; await source.decode(); images[job.source] = source; }
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = job.size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        if (job.kind === 'item') {
          const [x,y,w,h] = job.region, scale = Math.min(238/w,238/h);
          ctx.drawImage(source, x*source.width/1536, y*source.height/1024, w*source.width/1536, h*source.height/1024,
            (256-w*scale)/2, (256-h*scale)/2, w*scale, h*scale);
        } else if (job.kind === 'skill') {
          const w=source.width/5,h=source.height/3;
          ctx.beginPath(); ctx.arc(64,64,63.5,0,Math.PI*2); ctx.clip();
          ctx.drawImage(source,(job.index%5)*w+2,Math.floor(job.index/5)*h+2,w-4,h-4,0,0,128,128);
        } else ctx.drawImage(source,(job.index%3)*512,Math.floor(job.index/3)*512,512,512,0,0,512,512);
        const original = ctx.getImageData(0,0,job.size,job.size).data;
        const data = canvas.toDataURL('image/webp',0.95);
        if (!data.startsWith('data:image/webp;')) throw Error('WebP encoding is unavailable.');
        const decoded = new Image(); decoded.src = data; await decoded.decode();
        // A fresh context avoids applying the icon clip to the alpha comparison twice.
        const check=document.createElement('canvas'); check.width=check.height=job.size;
        const c=check.getContext('2d',{willReadFrequently:true});c.drawImage(decoded,0,0);
        const bytes=c.getImageData(0,0,job.size,job.size).data;let alphaDifference=0;
        for(let i=3;i<bytes.length;i+=4)alphaDifference=Math.max(alphaDifference,Math.abs(original[i]-bytes[i]));
        return {data:data.split(',')[1],alphaDifference};
      })()`,
    });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    const encoded = result.result.value;
    if (encoded.alphaDifference) throw Error(`Icon transparency changed: ${job.key}`);
    const bytes = Buffer.from(encoded.data, 'base64');
    const url = `/assets/optimized/ui-icon-${job.key.replace(':', '-')}.${hash(bytes).slice(0, 12)}.webp`;
    fs.writeFileSync(path.join(publicRoot, url), bytes);
    manifest[job.key] = url;
    files.push({
      key: job.key,
      output: url,
      width: job.size,
      height: job.size,
      encodedBytes: bytes.length,
      maxAlphaDifference: 0,
    });
  }
  fs.writeFileSync(
    path.join(root, 'src/data/uiIconAssets.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(root, 'docs/ui-icon-encoding.json'),
    JSON.stringify(
      {
        encoder: 'Chromium Canvas WebP',
        quality: 0.95,
        layoutSha256: assetSourceHash(layoutFile, fs.readFileSync(layoutFile)),
        sources: sources.map((source) => ({
          source,
          sha256: hash(fs.readFileSync(path.join(publicRoot, source))),
        })),
        files,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Generated ${files.length} icons (${files.reduce((n, f) => n + f.encodedBytes, 0)} bytes). Alpha preserved exactly.`,
  );
  await send('Browser.close').catch(() => {});
} finally {
  socket?.close();
  chrome.kill();
  server.close();
}
