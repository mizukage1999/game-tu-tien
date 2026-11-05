import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import ts from 'typescript';

/** Local Canvas asset compiler. Source TS is transformed without starting Vite/Phaser. */
export async function assetBrowser(root) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost').pathname;
    if (url === '/') {
      response
        .writeHead(200, { 'Content-Type': 'text/html' })
        .end('<!doctype html><title>Startup asset compiler</title>');
      return;
    }
    const asset = url.startsWith('/assets/');
    let file = path.resolve(root, asset ? 'public' : '.', '.' + decodeURIComponent(url));
    const allowed = path.join(root, asset ? 'public/assets' : 'src') + path.sep;
    if (!file.startsWith(allowed)) {
      response.writeHead(404).end();
      return;
    }
    if (!asset && !path.extname(file)) file += '.ts';
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    if (!asset && file.endsWith('.ts')) {
      const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
      }).outputText;
      response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(code);
    } else {
      response.setHeader('Content-Type', file.endsWith('.webp') ? 'image/webp' : 'image/png');
      fs.createReadStream(file).pipe(response);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const executable =
    process.env.CHROME_PATH ??
    [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
    ].find((file) => fs.existsSync(file));
  if (!executable) {
    server.close();
    throw Error('Set CHROME_PATH to a local Chrome executable.');
  }
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--remote-debugging-port=9381',
      `--user-data-dir=${path.join(root, '.preview/startup-codec-chrome')}`,
      'about:blank',
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  let socket;
  const stop = () => {
    socket?.close();
    chrome.kill();
    server.close();
  };
  try {
    let target;
    for (let i = 0; i < 100; i++) {
      try {
        target = (await (await fetch('http://127.0.0.1:9381/json')).json()).find(
          (t) => t.type === 'page',
        );
        if (target) break;
      } catch {
        /* Wait for the local compiler. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!target) throw Error('Chrome did not start.');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
    const pending = new Map();
    let sequence = 0;
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
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      base,
      async evaluate(expression) {
        const result = await send('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
          timeout: 120000,
        });
        if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
      },
      async close() {
        await send('Browser.close').catch(() => {});
        stop();
      },
    };
  } catch (error) {
    stop();
    throw error;
  }
}
