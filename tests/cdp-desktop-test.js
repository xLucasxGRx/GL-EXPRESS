const { spawn } = require('child_process');
const fs = require('fs');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    'http://localhost:8085/index.html'
  ]);

  edgeProcess.stderr.on('data', (d) => {});

  // Wait for DevTools port to open
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      break;
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Could not connect to Edge CDP');
    edgeProcess.kill();
    return;
  }

  // Get pages
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await listRes.json();
  console.log('Pages:', pages.map(p => ({ title: p.title, url: p.url, type: p.type })));
  const page = pages.find(p => p.url.includes('8085') || p.type === 'page') || pages[0];
  const pageWs = page?.webSocketDebuggerUrl;
  console.log('Target page URL:', page?.url);

  const ws = new WebSocket(pageWs);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const curId = id++;
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

  await send('Page.navigate', { url: 'http://localhost:8085/index.html' });

  // Wait for page to finish loading and splash
  await new Promise(r => setTimeout(r, 2000));

  // Click on Catálogo tab
  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const catBtn = document.getElementById('tab-btn-catalogo');
        if (catBtn) catBtn.click();
        return !!catBtn;
      })()
    `
  });
  console.log('Clicked catBtn:', evalRes);

  await new Promise(r => setTimeout(r, 800));

  // Test across multiple responsive viewports:
  const viewports = [
    { name: 'Móvil', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Laptop', width: 1024, height: 768 },
    { name: 'Escritorio', width: 1440, height: 900 }
  ];

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 600
    });
    await new Promise(r => setTimeout(r, 400));

    const check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const c = document.querySelector('.catalog-filters-container');
          if (!c) return { exists: false };
          const rect = c.getBoundingClientRect();
          const style = window.getComputedStyle(c);
          const btns = Array.from(c.querySelectorAll('.catalog-filter-btn')).map(b => ({
            text: b.textContent.trim(),
            visible: window.getComputedStyle(b).visibility === 'visible' && b.offsetWidth > 0
          }));
          return {
            exists: true,
            vpWidth: window.innerWidth,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            width: rect.width,
            height: rect.height,
            allBtnsVisible: btns.length === 6 && btns.every(b => b.visible),
            btns
          };
        })()
      `,
      returnByValue: true
    });

    const val = check.result.value;
    console.log(`[RESPONSIVE TEST - ${vp.name} (${vp.width}x${vp.height})]`, {
      display: val.display,
      visibility: val.visibility,
      opacity: val.opacity,
      width: Math.round(val.width),
      height: Math.round(val.height),
      all6BtnsVisible: val.allBtnsVisible
    });

    if (!val.exists || val.display !== 'flex' || val.visibility !== 'visible' || !val.allBtnsVisible) {
      throw new Error(`Fallo en viewport ${vp.name}`);
    }
  }

  // Capture final desktop screenshot
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 300));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('tests/catalog-desktop.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved tests/catalog-desktop.png');

  ws.close();
  edgeProcess.kill();
  console.log('\n✔ TODOS LOS VIEWPORTS (Móvil, Tablet, Laptop, Escritorio) APROBADOS.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
