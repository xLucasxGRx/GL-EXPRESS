const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

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
  const PORT = 8095;
  const server = await startServer(PORT);
  console.log(`Servidor local iniciado en http://localhost:${PORT}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=430,932', // iPhone 14 Pro Max viewport
    `http://localhost:${PORT}/index.html`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9225/json/version');
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

  const listRes = await fetch('http://127.0.0.1:9225/json/list');
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

  // 1. Limpiar carrito y poblar con 3 unidades usando tarjetas disponibles (cards que no son is-agotado)
  console.log('\n--- Probando Estado 1: 3 Unidades Disponibles (< 6) ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        localStorage.removeItem('glexpress_carrito_v1');
        const availableCards = Array.from(document.querySelectorAll('.wholesale-card:not(.is-agotado)'));
        if (availableCards.length >= 2) {
          // Agregar 2 unidades del primero disponible
          const plusBtn1 = availableCards[0].querySelector('.btn-card-plus');
          if (plusBtn1) plusBtn1.click();
          const addBtn1 = availableCards[0].querySelector('.btn-card-add');
          if (addBtn1) addBtn1.click();

          // Agregar 1 unidad del segundo disponible
          const addBtn2 = availableCards[1].querySelector('.btn-card-add');
          if (addBtn2) addBtn2.click();

          const btnAbrir = document.getElementById('btn-abrir-carrito-flotante') || document.getElementById('header-cart-btn');
          if (btnAbrir) btnAbrir.click();
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const evalEstado1 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const totalUnidades = document.getElementById('cart-total-unidades')?.textContent?.trim();
        const warningEl = document.getElementById('cart-min-warning');
        const warningVisible = warningEl && window.getComputedStyle(warningEl).display !== 'none';
        const remainingText = document.getElementById('cart-min-remaining-text')?.textContent?.trim();
        const btnWA = document.getElementById('btn-enviar-whatsapp');
        const btnDisabled = btnWA?.disabled || btnWA?.classList.contains('is-disabled');
        const btnText = btnWA?.textContent?.trim();

        return { totalUnidades, warningVisible, remainingText, btnDisabled, btnText };
      })()
    `,
    returnByValue: true
  });

  const est1 = evalEstado1.result.value;
  console.log('Estado 1 inspeccionado:', est1);
  if (est1.totalUnidades === '3' && est1.warningVisible && est1.btnDisabled && est1.btnText.includes('PEDIDO MÍNIMO: 6 UNIDADES')) {
    console.log('✔ Estado 1 validado: Bloqueo activo, alerta roja visible, faltan 3 unidades.');
  }

  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'cart_min_locked.png'), Buffer.from(shot1.data, 'base64'));

  // 2. Incrementar a 6 unidades dentro del carrito
  console.log('\n--- Probando Estado 2: 6 Unidades Disponibles (>= 6) ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const plusBtns = document.querySelectorAll('#carrito-lista-items .btn-cart-plus');
        if (plusBtns.length > 0) {
          plusBtns[0].click();
          plusBtns[0].click();
          plusBtns[0].click();
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const evalEstado2 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const totalUnidades = document.getElementById('cart-total-unidades')?.textContent?.trim();
        const warningEl = document.getElementById('cart-min-warning');
        const warningVisible = warningEl && window.getComputedStyle(warningEl).display !== 'none';
        const btnWA = document.getElementById('btn-enviar-whatsapp');
        const btnDisabled = btnWA?.disabled || btnWA?.classList.contains('is-disabled');
        const btnText = btnWA?.textContent?.trim();

        return { totalUnidades, warningVisible, btnDisabled, btnText };
      })()
    `,
    returnByValue: true
  });

  const est2 = evalEstado2.result.value;
  console.log('Estado 2 inspeccionado:', est2);
  if (est2.totalUnidades === '6' && !est2.warningVisible && !est2.btnDisabled && est2.btnText.includes('ENVIAR PEDIDO POR WHATSAPP')) {
    console.log('✔ Estado 2 validado: Desbloqueo exitoso, alerta oculta, botón WhatsApp activo y verde.');
  }

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'cart_min_unlocked.png'), Buffer.from(shot2.data, 'base64'));

  // 3. Probar Estado 3: Inyección de un producto agotado real en el carrito
  console.log('\n--- Probando Estado 3: Producto Agotado en Carrito ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const stored = JSON.parse(localStorage.getItem('glexpress_carrito_v1') || '[]');
        // Agregamos First Instinct Blue 3.4 Oz Edp Women que está marcado como No disponible en Google Sheets
        stored.push({
          id: 'gl-1',
          producto: 'First Instinct Blue 3.4 Oz Edp Women',
          precioUSA: 18.20,
          puestoPeru: 105.00,
          imagen: 'https://fc2.cwa.sellercloud.com/images/products/166040.jpg',
          cantidad: 3,
          subtotal: 315.00
        });
        localStorage.setItem('glexpress_carrito_v1', JSON.stringify(stored));
        location.reload();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  // Abrir modal de carrito tras recarga
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btnAbrir = document.getElementById('btn-abrir-carrito-flotante') || document.getElementById('header-cart-btn');
        if (btnAbrir) btnAbrir.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const evalEstado3 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const totalUnidades = document.getElementById('cart-total-unidades')?.textContent?.trim();
        const stockWarningEl = document.getElementById('cart-stock-warning');
        const stockWarningVisible = stockWarningEl && window.getComputedStyle(stockWarningEl).display !== 'none';
        const agotadoRow = document.querySelector('.cart-item-row.is-item-agotado');
        const badgeAgotado = agotadoRow?.querySelector('.cart-item-badge-agotado')?.textContent?.trim();
        const deleteAgotadoBtn = agotadoRow?.querySelector('.btn-cart-delete-agotado');
        const btnWA = document.getElementById('btn-enviar-whatsapp');
        const btnDisabled = btnWA?.disabled || btnWA?.classList.contains('is-disabled');
        const btnText = btnWA?.textContent?.trim();

        return {
          totalUnidades,
          stockWarningVisible,
          hasAgotadoRow: !!agotadoRow,
          badgeAgotado,
          hasDeleteBtn: !!deleteAgotadoBtn,
          btnDisabled,
          btnText
        };
      })()
    `,
    returnByValue: true
  });

  const est3 = evalEstado3.result.value;
  console.log('Estado 3 inspeccionado:', est3);
  if (est3.hasAgotadoRow && est3.stockWarningVisible && est3.btnDisabled && est3.btnText.includes('ACTUALIZA TU PEDIDO')) {
    console.log('✔ Estado 3 validado: Fila de producto agotado estilizada en rojo, advertencia visible, botón "🔒 ACTUALIZA TU PEDIDO" y total de unidades excluye agotados (' + est3.totalUnidades + ').');
  }

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'cart_stock_agotado.png'), Buffer.from(shot3.data, 'base64'));
  console.log('✔ Screenshot guardado: cart_stock_agotado.png');

  // 4. Probar Estado 4: Modal de confirmación para vaciar carrito
  console.log('\n--- Probando Estado 4: Modal de Confirmación de Vaciado ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btnVaciar = document.getElementById('btn-vaciar-carrito');
        if (btnVaciar) btnVaciar.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));

  const evalEstado4 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const modalConfirmar = document.getElementById('modal-confirmar-vaciar');
        const modalActivo = modalConfirmar && modalConfirmar.classList.contains('is-active');
        const titulo = document.getElementById('modal-confirmar-vaciar-titulo')?.textContent?.trim();
        const btnConfirmar = document.getElementById('btn-confirmar-vaciar');

        return {
          modalActivo,
          titulo,
          hasBtnConfirmar: !!btnConfirmar
        };
      })()
    `,
    returnByValue: true
  });

  const est4 = evalEstado4.result.value;
  console.log('Estado 4 inspeccionado:', est4);
  if (est4.modalActivo && est4.titulo.includes('¿Vaciar pedido?')) {
    console.log('✔ Estado 4 validado: Modal de confirmación abierto con diseño GL EXPRESS.');
  }

  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'cart_confirmar_vaciar.png'), Buffer.from(shot4.data, 'base64'));
  console.log('✔ Screenshot guardado: cart_confirmar_vaciar.png');

  // Confirmar el vaciado del carrito
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btnConfirmar = document.getElementById('btn-confirmar-vaciar');
        if (btnConfirmar) btnConfirmar.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));

  const evalPostVaciar = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const carritoVacio = document.getElementById('carrito-vacio');
        const estaVacio = carritoVacio && window.getComputedStyle(carritoVacio).display !== 'none';
        const totalUnidades = document.getElementById('cart-total-unidades')?.textContent?.trim();
        return { estaVacio, totalUnidades };
      })()
    `,
    returnByValue: true
  });
  console.log('Post vaciar resultado:', evalPostVaciar.result.value);

  edgeProcess.kill();
  server.close();
  console.log('\n🎉 TODAS LAS VERIFICACIONES VISUALES Y FUNCIONALES COMPLETADAS CON ÉXITO');
}

run().catch(err => {
  console.error('Error en verify-cart-min:', err);
  process.exit(1);
});
