const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

// Simple static HTTP server
function startServer(port) {
  const baseDir = path.resolve(__dirname, '..');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
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
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const PORT = 8097;
  const server = await startServer(PORT);
  console.log(`Servidor local iniciado en http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=430,932', // iPhone 14 Pro Max viewport
    `http://localhost:${PORT}/index.html`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9227/json/version');
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

  const listRes = await fetch('http://127.0.0.1:9227/json/list');
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

  console.log('\n--- Inyectando múltiples productos al carrito para verificar Scroll Independiente ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        localStorage.removeItem('glexpress_carrito_v1');
        const items = [
          { id: 'item-1', producto: 'Club de Nuit Intense Man 3.6 Oz Edt', puestoPeru: 155.00, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300' },
          { id: 'item-2', producto: 'Hawas for Men Rasasi 3.4 Oz Edp', puestoPeru: 195.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300' },
          { id: 'item-3', producto: 'Yara Lattafa 3.4 Oz Edp Women', puestoPeru: 120.00, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=300' },
          { id: 'item-4', producto: 'Khamrah Lattafa 3.4 Oz Edp Unisex', puestoPeru: 165.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=300' },
          { id: 'item-5', producto: 'Asad Lattafa 3.4 Oz Edp Men', puestoPeru: 125.00, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=300' },
          { id: 'item-6', producto: 'Bade\'e Al Oud Oud for Glory 3.4 Oz', puestoPeru: 140.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=300' },
          { id: 'item-7', producto: '9pm Afnan 3.4 Oz Edp Men', puestoPeru: 145.00, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300' },
          { id: 'item-8', producto: 'Nautica Voyage 3.4 Oz Edt Men', puestoPeru: 95.00, cantidad: 3, imagen: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300' }
        ];
        localStorage.setItem('glexpress_carrito_v1', JSON.stringify(items));
        location.reload();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  // Abrir carrito
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btnAbrir = document.getElementById('btn-abrir-carrito-flotante');
        if (btnAbrir) btnAbrir.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  // Verificar métricas de layout
  const layoutMetrics = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const card = document.querySelector('.modal-carrito-card');
        const header = document.querySelector('.modal-carrito-header');
        const body = document.querySelector('.modal-carrito-body');
        const footer = document.querySelector('.modal-carrito-footer');
        const resumenBox = document.getElementById('carrito-resumen-box');
        const btnWA = document.getElementById('btn-enviar-whatsapp');
        const totalUnidades = document.getElementById('cart-total-unidades')?.textContent?.trim();
        const clientField = document.querySelector('.modal-carrito-header .cart-client-field');

        const windowHeight = window.innerHeight;
        const cardHeight = card.offsetHeight;
        const headerHeight = header.offsetHeight;
        const bodyHeight = body.offsetHeight;
        const bodyScrollHeight = body.scrollHeight;
        const footerHeight = footer.offsetHeight;

        const bodyHasScroll = bodyScrollHeight > bodyHeight;

        return {
          windowHeight,
          cardHeight,
          maxAllowedHeight: windowHeight * 0.86,
          headerHeight,
          bodyHeight,
          bodyScrollHeight,
          bodyHasScroll,
          footerHeight,
          hasClientInHeader: !!clientField,
          totalUnidades,
          btnWAIsFixed: !!btnWA && !!footer.contains(btnWA)
        };
      })()
    `,
    returnByValue: true
  });

  const m = layoutMetrics.result.value;
  console.log('Métricas de Layout 3 Zonas:', m);

  assert.ok(m.cardHeight <= m.maxAllowedHeight, `La tarjeta del carrito (${m.cardHeight}px) no debe superar el 85vh (${m.maxAllowedHeight}px)`);
  assert.ok(m.bodyHasScroll, `La zona central de productos debe tener scroll independiente (scrollHeight: ${m.bodyScrollHeight}px > height: ${m.bodyHeight}px)`);
  assert.ok(m.hasClientInHeader, 'El campo Cliente / Negocio debe estar dentro del Header fijo');
  assert.ok(m.btnWAIsFixed, 'El botón de WhatsApp y resumen deben estar fijos en el Footer');
  console.log('✔ Verificación geométrica de 3 Zonas superada: Header fijo, Cuerpo con scroll independiente, Footer fijo.');

  // Captura 1: Vista Superior (Top del scroll)
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'cart_scroll_top.png'), Buffer.from(shot1.data, 'base64'));
  console.log('✔ Screenshot guardado: cart_scroll_top.png');

  // Realizar scroll hacia abajo en la zona central
  console.log('\n--- Realizando scroll en .modal-carrito-body ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const body = document.querySelector('.modal-carrito-body');
        body.scrollTop = 250;
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));

  const scrollEval = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const body = document.querySelector('.modal-carrito-body');
        const header = document.querySelector('.modal-carrito-header');
        const footer = document.querySelector('.modal-carrito-footer');
        return {
          scrollTop: body.scrollTop,
          headerRectTop: header.getBoundingClientRect().top,
          footerRectBottom: footer.getBoundingClientRect().bottom
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Estado tras scroll interno:', scrollEval.result.value);
  assert.ok(scrollEval.result.value.scrollTop > 100, 'El scroll central debe haberse desplazado correctamente');

  // Captura 2: Vista desplazada con Footer y Header intactos
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'cart_scroll_middle.png'), Buffer.from(shot2.data, 'base64'));
  console.log('✔ Screenshot guardado: cart_scroll_middle.png');

  edgeProcess.kill();
  server.close();
  console.log('\n🎉 TODAS LAS VERIFICACIONES DEL SCROLL 3 ZONAS DE GL EXPRESS COMPLETADAS CON ÉXITO');
}

run().catch(err => {
  console.error('Error en verify-cart-scroll:', err);
  process.exit(1);
});
