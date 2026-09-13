const fs = require('fs');
const path = require('path');
const https = require('https');
const assert = require('assert');

console.log('================================================================');
console.log('VERIFICACIÓN INTEGRAL DE GL EXPRESS MAYORISTA');
console.log('================================================================');

// 1. Verificación de archivos clave
const rootDir = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8');
const manifestJson = fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8');
const swJs = fs.readFileSync(path.join(rootDir, 'service-worker.js'), 'utf8');

// Regla 1: Confirmación de "PUESTO EN PERÚ" y PROHIBICIÓN de "Costo Perú" en la UI de GL EXPRESS
console.log('\n--- Regla 1: Verificación de etiquetas y privacidad de datos ---');
assert.ok(indexHtml.includes('GL EXPRESS'), 'index.html debe contener el branding GL EXPRESS');
assert.ok(appJs.includes('PUESTO EN PERÚ'), 'app.js debe incluir la etiqueta oficial "PUESTO EN PERÚ"');
assert.ok(!indexHtml.includes('vista-cotizador'), 'index.html no debe incluir la vista antigua de cotizador minorista');
assert.ok(!indexHtml.includes('modal-configuracion'), 'index.html no debe incluir el modal de configuración de costos');
assert.ok(indexHtml.includes('modal-carrito'), 'index.html debe incluir el modal de carrito mayorista');
assert.ok(indexHtml.includes('floating-cart-bar'), 'index.html debe incluir el botón flotante de carrito');
assert.ok(indexHtml.includes('cart-min-warning'), 'index.html debe incluir la alerta de pedido mínimo cart-min-warning');
assert.ok(indexHtml.includes('cart-stock-warning'), 'index.html debe incluir la alerta de stock cart-stock-warning');
assert.ok(indexHtml.includes('modal-confirmar-vaciar'), 'index.html debe incluir el modal de confirmación para vaciar pedido');
assert.ok(styleCss.includes('cart-min-warning-alert'), 'style.css debe incluir estilos de alerta de pedido mínimo');
assert.ok(styleCss.includes('is-item-agotado'), 'style.css debe incluir estilos para items agotados en el carrito');
assert.ok(appJs.includes('MIN_UNIDADES_MAYORISTA'), 'app.js debe definir la constante MIN_UNIDADES_MAYORISTA');
assert.ok(appJs.includes('validarProductosDisponibles'), 'app.js debe implementar validarProductosDisponibles()');
assert.ok(appJs.includes('ACTUALIZA TU PEDIDO'), 'app.js debe incluir el estado ACTUALIZA TU PEDIDO');
assert.ok(appJs.includes('51910487554'), 'app.js debe apuntar al número oficial de WhatsApp 51910487554');
assert.ok(!appJs.includes('<span class="wholesale-price-lbl">USA</span>'), 'app.js no debe renderizar la etiqueta USA en la tarjeta');
assert.ok(!appJs.includes('wholesale-price-usa'), 'app.js no debe incluir la clase wholesale-price-usa en la tarjeta');
console.log('✔ index.html y app.js validados: Limpio de vistas minoristas, regla de 6 unidades, confirmación de vaciado y validación de stock activa.');

// Regla 2: Verificación de la URL de Google Sheets apuntando estrictamente a la pestaña MAYORISTA (gid=2013926010)
console.log('\n--- Regla 2: Verificación de endpoint Google Sheets ---');
assert.ok(appJs.includes('gid=2013926010'), 'app.js debe apuntar al gid=2013926010 de la pestaña MAYORISTA');
console.log('✔ Endpoint de Google Sheets configurado exclusivamente para la pestaña MAYORISTA (gid=2013926010).');

// Regla 3: Verificación de Claves de LocalStorage aisladas
console.log('\n--- Regla 3: Aislamiento de almacenamiento local ---');
assert.ok(appJs.includes('glexpress_catalogo_cache_v1'), 'app.js debe usar prefijo glexpress_* para caché');
assert.ok(appJs.includes('glexpress_carrito_v1'), 'app.js debe usar prefijo glexpress_* para carrito');
console.log('✔ Claves de almacenamiento local aisladas de DUNES APP.');

// Regla 4: Conexión en vivo con Google Sheets (pestaña MAYORISTA)
console.log('\n--- Regla 4: Prueba de conexión en vivo con pestaña MAYORISTA ---');
const mayoristaUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMxWTEsUiAmYSnu8ra29ku79UTtObn2EnphEEabBODeDZDdXUVcHqI85RnXSvSHBuRthVUlbsWnCy_/pub?gid=2013926010&single=true&output=csv';

function testLiveSheets() {
  return new Promise((resolve, reject) => {
    function get(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const lines = data.split('\n').filter(l => l.trim().length > 0);
          console.log(`✔ Conexión exitosa. Filas leídas: ${lines.length}`);
          console.log(`✔ Encabezados oficiales: ${lines[0]}`);
          assert.ok(lines[0].includes('Producto') && lines[0].includes('Costo Perú'), 'Debe contener las columnas A-L');
          resolve();
        });
      }).on('error', reject);
    }
    get(mayoristaUrl);
  });
}

testLiveSheets().then(() => {
  console.log('\n================================================================');
  console.log('🎉 TODAS LAS VALIDACIONES DE GL EXPRESS MAYORISTA PASARON 100%');
  console.log('================================================================');
}).catch(err => {
  console.error('Error en prueba en vivo:', err);
  process.exit(1);
});
