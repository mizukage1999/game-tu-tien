// Derive delivery assets; original artwork and atlas coordinates remain intact.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public'),
  output = path.join(publicRoot, 'assets/optimized');
fs.mkdirSync(output, { recursive: true });
const directories = ['maps', 'monsters', 'heroes-v8', 'heroes-v7', 'skills', 'skills-schools-v1'];
const sources = directories.flatMap((directory) =>
  fs
    .readdirSync(path.join(publicRoot, 'assets', directory))
    .filter((name) => name.endsWith('.png'))
    .map((name) => `/assets/${directory}/${name}`),
);
sources.push(
  ...['skills-ice.png', 'beast-snow.png', 'weapon-red.png'].map(
    (name) => `/assets/sprites/${name}`,
  ),
);
sources.push(
  ...['bag-items-v1', 'skill-icons-alpha-v2', 'realm-crests-v1'].map(
    (name) => `/assets/ui/cultivation/${name}.png`,
  ),
);
sources.push(
  '/assets/ui/login-v5.png',
  ...['linh-thach', 'linh-khi', 'hoi-xuan-dan', 'nhan-bac', 'kiem-pho'].map(
    (name) => `/assets/ui/item-${name}.png`,
  ),
);
const files = sources.filter(
  (url) =>
    fs.existsSync(path.join(publicRoot, url)) &&
    fs.statSync(path.join(publicRoot, url)).size > 50_000,
);
const server = http.createServer((request, response) => {
  if (request.url === '/') {
    response
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end('<!doctype html><title>Local asset encoder</title>');
    return;
  }
  const file = path.resolve(
    publicRoot,
    '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname),
  );
  if (
    !file.startsWith(publicRoot + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader(
    'Content-Type',
    file.endsWith('.png')
      ? 'image/png'
      : file.endsWith('.webp')
        ? 'image/webp'
        : 'application/octet-stream',
  );
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`,
  port = 9376;
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
  throw Error('Set CHROME_PATH to a local Chrome or Chromium executable.');
}
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(root, '.preview/asset-codec-chrome')}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let socket;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let target;
  for (let i = 0; i < 100; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(
        (tab) => tab.type === 'page',
      );
      if (target) break;
    } catch {
      /* Starting Chrome. */
    }
    await delay(100);
  }
  if (!target) throw Error('Chrome did not start.');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const call = pending.get(message.id);
    if (call) {
      pending.delete(message.id);
      message.error ? call.reject(message.error) : call.resolve(message.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const sequence = ++id;
      pending.set(sequence, { resolve, reject });
      socket.send(JSON.stringify({ id: sequence, method, params }));
    });
  await send('Page.navigate', { url: base });
  await delay(150);
  const manifest = {},
    measurements = [];
  for (const url of files) {
    const result = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async()=>{
      const image=new Image();image.src=${JSON.stringify(base + url)};await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      const original=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const data=canvas.toDataURL('image/webp',0.92);if(!data.startsWith('data:image/webp;'))throw Error('WebP encoding is unavailable.');
      const encoded=new Image();encoded.src=data;await encoded.decode();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(encoded,0,0);
      const decoded=ctx.getImageData(0,0,canvas.width,canvas.height).data;let alphaDifference=0;
      for(let i=3;i<original.length;i+=4)alphaDifference=Math.max(alphaDifference,Math.abs(original[i]-decoded[i]));
      return{data:data.split(',')[1],width:canvas.width,height:canvas.height,alphaDifference};
    })()`,
    });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    const encoded = result.result.value;
    if (encoded.alphaDifference !== 0) throw Error(`Transparency changed: ${url}`);
    const bytes = Buffer.from(encoded.data, 'base64'),
      originalBytes = fs.statSync(path.join(publicRoot, url)).size;
    if (bytes.length >= originalBytes) continue;
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    const name = `${url.slice('/assets/'.length, -4).replaceAll('/', '-')}.${hash}.webp`;
    fs.writeFileSync(path.join(output, name), bytes);
    manifest[url] = `/assets/optimized/${name}`;
    measurements.push({
      source: url,
      output: manifest[url],
      originalBytes,
      sourceSha256: createHash('sha256')
        .update(fs.readFileSync(path.join(publicRoot, url)))
        .digest('hex'),
      encodedBytes: bytes.length,
      width: encoded.width,
      height: encoded.height,
      maxAlphaDifference: encoded.alphaDifference,
    });
    process.stdout.write(
      `${url}: ${Math.round(originalBytes / 1024)} -> ${Math.round(bytes.length / 1024)} KB\n`,
    );
  }
  fs.writeFileSync(
    path.join(root, 'src/data/optimizedAssets.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(root, 'docs/runtime-asset-encoding.json'),
    JSON.stringify(
      {
        encoder: 'Chromium Canvas WebP',
        quality: 0.92,
        dimensionsPreserved: true,
        alphaVerified: true,
        files: measurements,
      },
      null,
      2,
    ) + '\n',
  );
  process.stdout.write(
    JSON.stringify({
      files: measurements.length,
      originalBytes: measurements.reduce((n, file) => n + file.originalBytes, 0),
      encodedBytes: measurements.reduce((n, file) => n + file.encodedBytes, 0),
    }) + '\n',
  );
  await send('Browser.close').catch(() => {});
} finally {
  socket?.close();
  chrome.kill();
  server.close();
}
