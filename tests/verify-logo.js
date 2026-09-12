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
  const PORT = 8099;
  const server = await startServer(PORT);
  console.log(`Servidor local iniciado en http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=430,932',
    `http://localhost:${PORT}/index.html`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9229/json/version');
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

  const listRes = await fetch('http://127.0.0.1:9229/json/list');
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
  await new Promise(r => setTimeout(r, 2000));

  const artifactDir = 'C:\\Users\\Lucas\\.gemini\\antigravity-ide\\brain\\de6a0aec-eaab-4397-b454-68cf4b120458';

  const logoMetrics = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const img = document.querySelector('.brand-logo-img');
        const container = document.querySelector('.brand-logo-container');
        const splashImg = document.querySelector('.splash-logo-img');

        return {
          headerImgSrc: img ? img.src : null,
          headerImgComplete: img ? img.complete : false,
          headerImgNaturalWidth: img ? img.naturalWidth : 0,
          headerImgNaturalHeight: img ? img.naturalHeight : 0,
          containerWidth: container ? container.offsetWidth : 0,
          containerHeight: container ? container.offsetHeight : 0,
          splashImgSrc: splashImg ? splashImg.src : null,
          splashImgComplete: splashImg ? splashImg.complete : false
        };
      })()
    `,
    returnByValue: true
  });

  const res = logoMetrics.result.value;
  console.log('Métricas del Logo inspeccionado:', res);

  assert.ok(res.headerImgSrc.includes('logoGL.jpeg'), 'El header debe apuntar a logoGL.jpeg');
  assert.ok(res.headerImgComplete, 'La imagen del logo debe haberse cargado completamente');
  assert.strictEqual(res.headerImgNaturalWidth, 1254, 'El ancho natural debe coincidir con el logo original');
  assert.strictEqual(res.headerImgNaturalHeight, 1254, 'El alto natural debe coincidir con el logo original');
  assert.ok(res.containerHeight >= 45 && res.containerHeight <= 60, `La altura en móvil (${res.containerHeight}px) debe estar entre 45px y 60px`);
  assert.ok(res.splashImgSrc.includes('logoGL.jpeg'), 'El splash screen debe apuntar a logoGL.jpeg');

  console.log('✔ Logo cargado y validado en tamaño móvil.');

  // Dismiss any toasts before screenshots
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.querySelectorAll('.toast, .toast-notification, [id*="toast"]').forEach(el => el.remove());
      })()
    `
  });
  await new Promise(r => setTimeout(r, 200));

  // Screenshot de la pantalla con header
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'app_mobile_logo.png'), Buffer.from(shot1.data, 'base64'));
  console.log('✔ Screenshot guardado: app_mobile_logo.png');

  // Clip específico del Header
  const headerClip = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const header = document.querySelector('.app-header');
        const rect = header.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      })()
    `,
    returnByValue: true
  });
  const rect = headerClip.result.value;
  const shot2 = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: Math.max(0, rect.x - 10),
      y: Math.max(0, rect.y - 5),
      width: rect.width + 20,
      height: rect.height + 15,
      scale: 1
    }
  });
  fs.writeFileSync(path.join(artifactDir, 'header_logo.png'), Buffer.from(shot2.data, 'base64'));
  console.log('✔ Screenshot guardado: header_logo.png');

  edgeProcess.kill();
  server.close();
  console.log('🎉 VERIFICACIÓN DEL LOGO GL EXPRESS COMPLETADA CON ÉXITO');
}

run().catch(err => {
  console.error('Error en verify-logo:', err);
  process.exit(1);
});
