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
  const PORT = 8094;
  const server = await startServer(PORT);
  console.log(`Servidor local iniciado en http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=430,932',
    `http://localhost:${PORT}/index.html`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9224/json/version');
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

  const listRes = await fetch('http://127.0.0.1:9224/json/list');
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
  await new Promise(r => setTimeout(r, 2500));

  const artifactDir = 'C:\\Users\\Lucas\\.gemini\\antigravity-ide\\brain\\de6a0aec-eaab-4397-b454-68cf4b120458';

  // Descartar toasts
  await send('Runtime.evaluate', {
    expression: `(() => { document.querySelectorAll('.toast, .toast-notification, [id*="toast"]').forEach(el => el.remove()); })()`
  });
  await new Promise(r => setTimeout(r, 200));

  // Inspeccionar tarjetas disponibles y agotadas
  const cardsMetrics = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const availableCard = document.querySelector('.wholesale-card:not(.is-agotado)');
        const agotadoCard = document.querySelector('.wholesale-card.is-agotado');

        const agotadoBanner = agotadoCard?.querySelector('.card-agotado-banner');
        const agotadoBtn = agotadoCard?.querySelector('.btn-card-agotado');
        const agotadoStepper = agotadoCard?.querySelector('.wholesale-stepper');
        const agotadoTitle = agotadoCard?.querySelector('.wholesale-title')?.textContent?.trim();

        const availableBtn = availableCard?.querySelector('.btn-card-add');
        const availableTitle = availableCard?.querySelector('.wholesale-title')?.textContent?.trim();

        return {
          hasAgotadoCard: !!agotadoCard,
          agotadoHeight: agotadoCard?.offsetHeight,
          availableHeight: availableCard?.offsetHeight,
          hasAgotadoBanner: !!agotadoBanner,
          bannerText: agotadoBanner?.textContent?.trim(),
          hasAgotadoBtn: !!agotadoBtn,
          btnAgotadoText: agotadoBtn?.textContent?.trim(),
          btnAgotadoDisabled: agotadoBtn?.disabled,
          stepperDisabled: agotadoStepper?.classList.contains('is-disabled'),
          agotadoTitle,
          availableTitle,
          titleHasNoParenthesis: !agotadoTitle.includes('(AGOTADO)')
        };
      })()
    `,
    returnByValue: true
  });

  const m = cardsMetrics.result.value;
  console.log('Métricas de Tarjetas Disponibles vs Agotadas:', m);

  assert.ok(m.hasAgotadoCard, 'Debe existir al menos un producto agotado en el catálogo');
  assert.ok(m.hasAgotadoBanner, 'La tarjeta agotada debe tener el banner .card-agotado-banner');
  assert.ok(m.bannerText.includes('AGOTADO'), 'El texto del banner debe decir AGOTADO');
  assert.ok(m.hasAgotadoBtn, 'El botón inferior debe ser .btn-card-agotado');
  assert.ok(m.btnAgotadoText.includes('AGOTADO'), 'El botón inferior debe decir AGOTADO');
  assert.strictEqual(m.btnAgotadoDisabled, true, 'El botón de producto agotado debe estar deshabilitado');
  assert.strictEqual(m.stepperDisabled, true, 'El selector de cantidad debe estar deshabilitado');
  assert.strictEqual(m.titleHasNoParenthesis, true, 'El título no debe contener el texto (AGOTADO)');
  assert.strictEqual(m.agotadoHeight, m.availableHeight, `La altura de la tarjeta agotada (${m.agotadoHeight}px) debe ser idéntica a la tarjeta disponible (${m.availableHeight}px)`);

  console.log('✔ Todas las validaciones visuales de la tarjeta AGOTADA superadas al 100%.');

  // Capturar screenshot del grid mostrando las tarjetas
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'catalog_grid_agotado.png'), Buffer.from(shot.data, 'base64'));
  console.log('✔ Screenshot guardado: catalog_grid_agotado.png');

  edgeProcess.kill();
  server.close();
  console.log('🎉 VERIFICACIÓN DE PRODUCTOS AGOTADOS COMPLETADA CON ÉXITO');
}

run().catch(err => {
  console.error('Error en verify-card-agotado:', err);
  process.exit(1);
});
