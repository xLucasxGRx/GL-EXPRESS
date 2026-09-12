const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

function startServer(port) {
  const baseDir = path.resolve(__dirname, '..');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(baseDir, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const PORT = 8093;
  const server = await startServer(PORT);
  console.log(`Servidor local iniciado en http://localhost:${PORT}`);

  // 1. Probar HTTP directos de favicon e iconos PWA
  const endpoints = [
    '/favicon.ico',
    '/assets/favicon.ico',
    '/assets/favicon-16x16.png',
    '/assets/favicon-32x32.png',
    '/assets/favicon-48x48.png',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/icon-maskable-192.png',
    '/assets/icon-maskable-512.png',
    '/assets/apple-touch-icon.png',
    '/manifest.json'
  ];

  for (const ep of endpoints) {
    const res = await fetch(`http://localhost:${PORT}${ep}`);
    assert.strictEqual(res.status, 200, `El endpoint ${ep} debe responder HTTP 200`);
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 100, `El archivo ${ep} debe tener contenido no vacío (${buffer.byteLength} bytes)`);
    console.log(`✔ Endpoint ${ep} verificado (${buffer.byteLength} bytes).`);
  }

  // 2. Probar en Edge headless para verificar tags de favicon y manifest
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=430,932',
    `http://localhost:${PORT}/index.html`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9223/json/version');
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      break;
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('No se pudo conectar a Edge CDP');
    edgeProcess.kill();
    server.close();
    process.exit(1);
  }

  const listRes = await fetch('http://127.0.0.1:9223/json/list');
  const pages = await listRes.json();
  const page = pages.find(p => p.url.includes(String(PORT)) || p.type === 'page') || pages[0];

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const curId = msgId++;
      const handler = (msg) => {
        const parsed = JSON.parse(msg.data);
        if (parsed.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(parsed.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.navigate', { url: `http://localhost:${PORT}/index.html` });
  await new Promise(r => setTimeout(r, 1500));

  const headEval = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const faviconLinks = Array.from(document.querySelectorAll('link[rel*="icon"]')).map(l => ({
          rel: l.rel,
          href: l.href,
          sizes: l.sizes ? l.sizes.value : null,
          type: l.type
        }));
        const manifestLink = document.querySelector('link[rel="manifest"]')?.href;

        return {
          faviconLinks,
          manifestLink,
          title: document.title
        };
      })()
    `,
    returnByValue: true
  });

  const val = headEval.result.value;
  console.log('Metadatos de Favicon y PWA inspeccionados:', val);

  assert.ok(val.faviconLinks.length >= 4, 'Deben existir múltiples links de favicon');
  assert.ok(val.manifestLink.includes('manifest.json'), 'Debe existir link a manifest.json');
  assert.ok(val.title.includes('GL EXPRESS'), 'El título debe ser GL EXPRESS');

  edgeProcess.kill();
  server.close();
  console.log('\n🎉 VERIFICACIÓN DE FAVICON E ICONOS PWA COMPLETADA CON ÉXITO');
}

run().catch(err => {
  console.error('Error en verify-favicon:', err);
  process.exit(1);
});
