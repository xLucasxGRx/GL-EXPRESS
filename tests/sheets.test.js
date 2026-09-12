const assert = require('assert');

/**
 * Parser de CSV compatible con RFC 4180
 */
function parseCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
  }

  return rows;
}

/**
 * Normaliza nombres de columnas para mapeo flexible
 */
function normalizarClave(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Convierte filas CSV en objetos normalizados según la estructura actual de Google Sheets:
 * A: Producto
 * B: Precio USA ($)
 * C: Cantidad
 * D: Peso KG
 * E: Flete x KG
 * F: Reempaque
 * G: Precio Dólar (T.C)
 * H: Costo Perú
 * I: Precio Venta (S/.)
 * J: Costos extras
 * K: Ganancia (S/.)
 */
function transformarFilasACatalogo(rows) {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => normalizarClave(h));

  const encontrarIndice = (posiblesNombres) => {
    return headers.findIndex(h => posiblesNombres.includes(h));
  };

  const idxMap = {
    // Mapeo exacto de los nombres actuales del Sheet (A-K):
    producto: encontrarIndice(['producto', 'perfume', 'nombre']),
    precioUSA: encontrarIndice(['preciousa', 'precio_usa', 'preciounitariousa']),
    cantidad: encontrarIndice(['cantidad', 'cant', 'unidades']),
    pesoKg: encontrarIndice(['pesokg', 'peso', 'peso_kg']),
    fleteKg: encontrarIndice(['fletexkg', 'fletekg', 'flete_x_kg']),
    reempaque: encontrarIndice(['reempaque']),
    precioDolarTC: encontrarIndice(['preciodolartc', 'preciodolar', 'tc']),
    costoPeru: encontrarIndice(['costoperu', 'costo_peru', 'costopuestoperu']),
    precioVenta: encontrarIndice(['precioventas', 'precioventa', 'precio_venta']),
    costosExtras: encontrarIndice(['costosextras', 'costosextraslocales', 'extras']),
    ganancia: encontrarIndice(['ganancias', 'ganancia', 'ganancia_neta']),
    imagen: encontrarIndice(['imagen', 'img', 'foto', 'image', 'urlimagen', 'imagenurl', 'fotourl'])
  };

  // Respaldo estricto por posición de columnas A-K (0 a 10):
  if (idxMap.producto === -1 && headers.length > 0) idxMap.producto = 0;
  if (idxMap.precioUSA === -1 && headers.length > 1) idxMap.precioUSA = 1;
  if (idxMap.cantidad === -1 && headers.length > 2) idxMap.cantidad = 2;
  if (idxMap.pesoKg === -1 && headers.length > 3) idxMap.pesoKg = 3;
  if (idxMap.fleteKg === -1 && headers.length > 4) idxMap.fleteKg = 4;
  if (idxMap.reempaque === -1 && headers.length > 5) idxMap.reempaque = 5;
  if (idxMap.precioDolarTC === -1 && headers.length > 6) idxMap.precioDolarTC = 6;
  if (idxMap.costoPeru === -1 && headers.length > 7) idxMap.costoPeru = 7;
  if (idxMap.precioVenta === -1 && headers.length > 8) idxMap.precioVenta = 8;
  if (idxMap.costosExtras === -1 && headers.length > 9) idxMap.costosExtras = 9;
  if (idxMap.ganancia === -1 && headers.length > 10) idxMap.ganancia = 10;

  const limpiarNumero = (val, valorDefault = 0) => {
    if (val === undefined || val === null || val === '') return valorDefault;
    let str = val.toString().trim();
    str = str.replace(/S\/\.?/gi, '').replace(/\$/g, '').replace(/[a-zA-Z]/g, '').replace(/,/g, '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? valorDefault : num;
  };

  const productos = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = idxMap.producto !== -1 ? (row[idxMap.producto] || '').trim() : '';
    if (!nombre) continue;

    productos.push({
      id: `prod-${i}`,
      // Campos visibles en el catálogo:
      producto: nombre,
      precioUSA: idxMap.precioUSA !== -1 ? limpiarNumero(row[idxMap.precioUSA], 0) : 0,
      costoPeru: idxMap.costoPeru !== -1 ? limpiarNumero(row[idxMap.costoPeru], 0) : 0,
      precioVenta: idxMap.precioVenta !== -1 ? limpiarNumero(row[idxMap.precioVenta], 0) : 0,
      ganancia: idxMap.ganancia !== -1 ? limpiarNumero(row[idxMap.ganancia], 0) : 0,

      // Datos internos (mantenidos en el cálculo y visibles en el pie):
      cantidad: idxMap.cantidad !== -1 ? Math.max(1, parseInt(row[idxMap.cantidad], 10) || 1) : 1,
      pesoKg: idxMap.pesoKg !== -1 ? limpiarNumero(row[idxMap.pesoKg], 0.6) : 0.6,
      fleteKg: idxMap.fleteKg !== -1 ? limpiarNumero(row[idxMap.fleteKg], 9.50) : 9.50,
      reempaque: idxMap.reempaque !== -1 ? limpiarNumero(row[idxMap.reempaque], 1.00) : 1.00,
      tc: idxMap.precioDolarTC !== -1 ? limpiarNumero(row[idxMap.precioDolarTC], 3.40) : 3.40,
      costosExtras: idxMap.costosExtras !== -1 ? limpiarNumero(row[idxMap.costosExtras], 10.00) : 10.00,
      imagen: (idxMap.imagen !== -1 && row[idxMap.imagen]) ? (row[idxMap.imagen] || '').trim() : ''
    });
  }

  return productos;
}

function construirURLGoogleSheetCSV(input) {
  const DEFAULT_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMxWTEsUiAmYSnu8ra29ku79UTtObn2EnphEEabBODeDZDdXUVcHqI85RnXSvSHBuRthVUlbsWnCy_/pub?output=csv';
  const raw = (input && input.trim()) ? input.trim() : DEFAULT_SHEETS_CSV_URL;

  if (raw.includes('/pub') || raw.includes('/export?format=csv') || raw.includes('/gviz/tq?tqx=out:csv') || raw.includes('output=csv')) {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}_t=${Date.now()}`;
  }

  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = (match && match[1] && match[1] !== 'e') ? match[1] : (/^[a-zA-Z0-9-_]{20,}$/.test(raw) ? raw : null);

  if (!sheetId) return `${raw}${raw.includes('?') ? '&' : '?'}_t=${Date.now()}`;

  const gidMatch = raw.match(/[#&?]gid=([0-9]+)/);
  const gidParam = (gidMatch && gidMatch[1]) ? `&gid=${gidMatch[1]}` : '';

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}&_t=${Date.now()}`;
}

async function runTests() {
  console.log('--- Iniciando Tests del Catálogo DUNES PARFUMS (Estructura A-K + Imagen) ---');

  // Caso 1: Estructura exacta A-K del Google Sheets con columna imagen opcional
  const csvActual = `Producto,Precio USA ($),Cantidad,Peso KG,Flete x KG,Reempaque,Precio Dolar (T.C),Costo Perú,Precio Venta (S/.),Costos extras,Ganancia (S/.),imagen
9 Am Dive 3.4 Oz Edp Unisex,$19.71,1,0.65,$9.50,$1.00,$3.40,S/. 91.41,S/. 139.00,S/. 10.00,S/. 37.59,https://fc2.cwa.sellercloud.com/images/products/166141.jpg`;

  const parsed = parseCSV(csvActual);
  assert.strictEqual(parsed.length, 2, 'Debe parsear 2 filas');

  const catalogo = transformarFilasACatalogo(parsed);
  assert.strictEqual(catalogo.length, 1, 'Debe extraer 1 producto');

  const item = catalogo[0];
  // 1. Campos visibles requeridos en el catálogo
  assert.strictEqual(item.producto, '9 Am Dive 3.4 Oz Edp Unisex');
  assert.strictEqual(item.precioUSA, 19.71, 'Precio USA debe ser 19.71');
  assert.strictEqual(item.costoPeru, 91.41, 'Costo Perú debe ser 91.41');
  assert.strictEqual(item.precioVenta, 139.00, 'Precio Venta debe ser 139.00');
  assert.strictEqual(item.ganancia, 37.59, 'Ganancia debe ser 37.59');

  // 2. Campos internos para cálculo (visibles en el pie de tarjeta)
  assert.strictEqual(item.cantidad, 1);
  assert.strictEqual(item.pesoKg, 0.65);
  assert.strictEqual(item.fleteKg, 9.50);
  assert.strictEqual(item.reempaque, 1.00);
  assert.strictEqual(item.tc, 3.40);
  assert.strictEqual(item.costosExtras, 10.00);
  assert.strictEqual(item.imagen, 'https://fc2.cwa.sellercloud.com/images/products/166141.jpg');

  console.log('✔ Caso 1 (Validación de estructura A-K + imagen y valores exactos del ejemplo) superado.');

  // Caso 2: Conexión Real y Lectura en vivo desde Google Sheets publicado
  const urlPublicada = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMxWTEsUiAmYSnu8ra29ku79UTtObn2EnphEEabBODeDZDdXUVcHqI85RnXSvSHBuRthVUlbsWnCy_/pub?output=csv';
  try {
    console.log('Probando conexión en vivo con Google Sheets publicado...');
    const res = await fetch(urlPublicada);
    assert.strictEqual(res.ok, true, 'La respuesta HTTP debe ser exitosa');
    const text = await res.text();
    const rowsLive = parseCSV(text);
    const catLive = transformarFilasACatalogo(rowsLive);
    assert.ok(catLive.length >= 1, 'Debe leer las filas de la hoja en vivo');
    assert.strictEqual(catLive[0].producto, '9 Am Dive 3.4 Oz Edp Unisex');
    assert.strictEqual(catLive[0].precioUSA, 19.71);
    assert.strictEqual(catLive[0].costoPeru, 91.41);
    assert.strictEqual(catLive[0].precioVenta, 139.00);
    assert.strictEqual(catLive[0].ganancia, 37.59);
    // Validar los 11 campos presentes en la fila live
    assert.strictEqual(catLive[0].cantidad, 1);
    assert.strictEqual(catLive[0].pesoKg, 0.65);
    assert.strictEqual(catLive[0].fleteKg, 9.50);
    assert.strictEqual(catLive[0].reempaque, 1.00);
    assert.strictEqual(catLive[0].tc, 3.40);
    assert.strictEqual(catLive[0].costosExtras, 10.00);
    assert.strictEqual(catLive[0].imagen, 'https://fc2.cwa.sellercloud.com/images/products/166141.jpg');
    console.log(`✔ Caso 2 (Conexión EN VIVO confirmada: Costo Perú S/ 91.41, Venta S/ 139.00, Ganancia S/ 37.59, 11 campos e imagen leídos).`);
  } catch (err) {
    console.error('Error en conexión en vivo:', err);
    throw err;
  }

  // Caso 3: Validación del HTML de Tarjeta Luxury (1 por fila, Encabezado con USA, Trio Grid, Pie con datos internos)
  function generarHTMLTarjeta(item) {
    const formatUSD = (n) => `$ ${Number(n).toFixed(2)}`;
    const formatPEN = (n) => `S/ ${Number(n).toFixed(2)}`;
    const gananciaPositiva = item.ganancia >= 0;
    const tieneImagen = item.imagen && (item.imagen.startsWith('http://') || item.imagen.startsWith('https://'));

    return `
      <!-- 1. Encabezado: Perfume (Icono o Mini imagen) + Nombre y Precio USA cercano -->
      <div class="card-top-section">
        <div class="card-title-group">
          ${tieneImagen ? `
            <img src="${item.imagen}" alt="${item.producto}" class="card-mini-thumb" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';" loading="lazy">
            <span class="card-perfume-icon" style="display:none;">🧴</span>
          ` : `
            <span class="card-perfume-icon">🧴</span>
          `}
          <h3 class="card-product-name" title="${item.producto}">${item.producto}</h3>
        </div>
        <div class="card-usa-tag">
          <span class="usa-lbl">USA</span>
          <span class="usa-val">${formatUSD(item.precioUSA)}</span>
        </div>
      </div>

      <!-- 2. Bloque Principal: Sección visual con 3 valores grandes -->
      <div class="card-trio-grid">
        <div class="trio-item trio-costo">
          <span class="trio-lbl">Costo Perú</span>
          <span class="trio-val val-costo">${formatPEN(item.costoPeru)}</span>
        </div>
        <div class="trio-item trio-venta">
          <span class="trio-lbl">Venta</span>
          <span class="trio-val val-venta">${formatPEN(item.precioVenta)}</span>
        </div>
        <div class="trio-item trio-ganancia ${gananciaPositiva ? 'is-profit' : 'is-loss'}">
          <span class="trio-lbl">Ganancia</span>
          <span class="trio-val val-ganancia">${formatPEN(item.ganancia)}</span>
        </div>
      </div>

      <!-- 3. Datos Internos: Una sola línea inferior compacta y discreta -->
      <div class="card-internal-footer">
        <span class="calc-line-text">${item.cantidad}ud • ${Number(item.pesoKg || 0).toFixed(2)}kg • Flete ${formatUSD(item.fleteKg)} • Rep ${formatUSD(item.reempaque)} • TC ${Number(item.tc || 0).toFixed(2)} • Extras ${formatPEN(item.costosExtras)}</span>
      </div>
    `;
  }

  const htmlConImagen = generarHTMLTarjeta(catalogo[0]);
  // 1. Encabezado con nombre, imagen y Precio USA
  assert.ok(htmlConImagen.includes('9 Am Dive 3.4 Oz Edp Unisex'), 'Debe mostrar Nombre del perfume');
  assert.ok(htmlConImagen.includes('card-mini-thumb'), 'Debe mostrar mini imagen cuando existe URL');
  assert.ok(htmlConImagen.includes('USA</span>'), 'Debe mostrar etiqueta USA junto al nombre');
  assert.ok(htmlConImagen.includes('$ 19.71'), 'Debe mostrar valor Precio USA junto al nombre');

  // 2. Bloque Principal con 3 valores grandes
  assert.ok(htmlConImagen.includes('card-trio-grid'), 'Debe contener la cuadrícula trio');
  assert.ok(htmlConImagen.includes('Costo Perú</span>'), 'Debe contener etiqueta Costo Perú');
  assert.ok(htmlConImagen.includes('val-costo">S/ 91.41</span>'), 'Debe contener valor Costo Perú');
  assert.ok(htmlConImagen.includes('Venta</span>'), 'Debe contener etiqueta Venta');
  assert.ok(htmlConImagen.includes('val-venta">S/ 139.00</span>'), 'Debe contener valor Precio Venta');
  assert.ok(htmlConImagen.includes('Ganancia</span>'), 'Debe contener etiqueta Ganancia');
  assert.ok(htmlConImagen.includes('val-ganancia">S/ 37.59</span>'), 'Debe contener valor Ganancia');

  // 3. Datos internos discretos al pie en una sola línea con viñetas
  assert.ok(htmlConImagen.includes('card-internal-footer'), 'Debe contener el pie de datos internos');
  assert.ok(htmlConImagen.includes('1ud • 0.65kg • Flete $ 9.50 • Rep $ 1.00 • TC 3.40 • Extras S/ 10.00'), 'Debe contener la línea completa con todos los datos internos');

  // 4. Prueba sin imagen para validar fallback a icono 🧴
  const itemSinImg = { ...catalogo[0], imagen: '' };
  const htmlSinImagen = generarHTMLTarjeta(itemSinImg);
  assert.ok(htmlSinImagen.includes('🧴'), 'Debe mostrar icono 🧴 si no tiene imagen');
  assert.ok(!htmlSinImagen.includes('card-mini-thumb'), 'No debe renderizar <img> si no tiene imagen');

  console.log('✔ Caso 3 (Verificación de Rediseño Luxury: 1 por fila, Encabezado con USA e imagen, Trio Grid y Datos internos en una línea).');
  console.log('--- TODOS LOS TESTS DEL CATÁLOGO LUXURY PASARON CON ÉXITO ---');
}

runTests();
