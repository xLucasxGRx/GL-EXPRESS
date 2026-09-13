const assert = require('assert');

// 1. Parser CSV RFC 4180
function parsearCSV(csvText) {
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

function normalizarClaveColumna(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Convierte filas de la pestaña MAYORISTA (Columnas A-L) a catálogo de GL EXPRESS
 * A: Producto
 * B: Precio USA ($)
 * C: Cantidad (Oculto)
 * D: Categoria
 * E: Genero
 * F: Peso KG (Oculto)
 * G: Flete x KG (Oculto)
 * H: Reempaque (Oculto)
 * I: Precio Dolar (T.C) (Oculto)
 * J: Costo Perú -> mapeado a puestoPeru
 * K: imagen
 * L: Estado catálogo
 */
function convertirFilasAMayorista(rows) {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => normalizarClaveColumna(h));
  const encontrarIndice = (posibles) => headers.findIndex(h => posibles.includes(h));

  const idxMap = {
    producto: encontrarIndice(['producto', 'perfume', 'nombre']),
    precioUSA: encontrarIndice(['preciousa', 'precio_usa', 'preciounitariousa']),
    cantidad: encontrarIndice(['cantidad', 'cant', 'unidades']),
    categoria: encontrarIndice(['categoria', 'cat', 'category']),
    genero: encontrarIndice(['genero', 'gender', 'sexo']),
    pesoKg: encontrarIndice(['pesokg', 'peso', 'peso_kg']),
    fleteKg: encontrarIndice(['fletexkg', 'fletekg', 'flete_x_kg']),
    reempaque: encontrarIndice(['reempaque']),
    precioDolarTC: encontrarIndice(['preciodolartc', 'preciodolar', 'tc']),
    costoPeru: encontrarIndice(['costoperu', 'costoperus', 'costo_peru', 'costopuestoperu', 'puestoperu']),
    imagen: encontrarIndice(['imagen', 'img', 'foto', 'image', 'urlimagen', 'imagenurl']),
    estadoCatalogo: encontrarIndice(['estadocatalogo', 'estado_catalogo', 'estado', 'status', 'disponibilidad'])
  };

  // Posiciones por defecto en caso de coincidencia por orden A-L
  if (idxMap.producto === -1 && headers.length > 0) idxMap.producto = 0;
  if (idxMap.precioUSA === -1 && headers.length > 1) idxMap.precioUSA = 1;
  if (idxMap.cantidad === -1 && headers.length > 2) idxMap.cantidad = 2;
  if (idxMap.categoria === -1 && headers.length > 3) idxMap.categoria = 3;
  if (idxMap.genero === -1 && headers.length > 4) idxMap.genero = 4;
  if (idxMap.pesoKg === -1 && headers.length > 5) idxMap.pesoKg = 5;
  if (idxMap.fleteKg === -1 && headers.length > 6) idxMap.fleteKg = 6;
  if (idxMap.reempaque === -1 && headers.length > 7) idxMap.reempaque = 7;
  if (idxMap.precioDolarTC === -1 && headers.length > 8) idxMap.precioDolarTC = 8;
  if (idxMap.costoPeru === -1 && headers.length > 9) idxMap.costoPeru = 9;
  if (idxMap.imagen === -1 && headers.length > 10) idxMap.imagen = 10;
  if (idxMap.estadoCatalogo === -1 && headers.length > 11) idxMap.estadoCatalogo = 11;

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

    let esAgotado = false;
    let estadoCatalogo = 'Disponible';
    if (idxMap.estadoCatalogo !== -1) {
      const rawEstado = (row[idxMap.estadoCatalogo] || '').toString().trim();
      const estadoNorm = normalizarClaveColumna(rawEstado);
      if (estadoNorm.includes('no') || estadoNorm.includes('agotad')) {
        esAgotado = true;
        estadoCatalogo = 'No disponible';
      } else if (estadoNorm.includes('disponib')) {
        esAgotado = false;
        estadoCatalogo = 'Disponible';
      } else if (rawEstado) {
        estadoCatalogo = rawEstado;
      }
    }

    productos.push({
      id: `gl-${i}`,
      producto: nombre,
      precioUSA: idxMap.precioUSA !== -1 ? limpiarNumero(row[idxMap.precioUSA], 0) : 0,
      // La columna J (Costo Perú) se asigna estrictamente a puestoPeru para su visualización mayorista:
      puestoPeru: idxMap.costoPeru !== -1 ? limpiarNumero(row[idxMap.costoPeru], 0) : 0,
      categoria: (idxMap.categoria !== -1 && row[idxMap.categoria]) ? (row[idxMap.categoria] || '').toString().trim() : '',
      genero: (idxMap.genero !== -1 && row[idxMap.genero]) ? (row[idxMap.genero] || '').toString().trim() : '',
      imagen: (idxMap.imagen !== -1 && row[idxMap.imagen]) ? (row[idxMap.imagen] || '').toString().trim() : '',
      estadoCatalogo: estadoCatalogo,
      esAgotado: esAgotado
    });
  }

  return productos;
}

/**
 * Gestor del Carrito Mayorista
 */
class CarritoMayorista {
  constructor() {
    this.items = [];
  }

  agregar(producto, cantidad = 1) {
    if (!producto || producto.esAgotado) return false;
    const cant = Math.max(1, parseInt(cantidad, 10) || 1);
    const itemExistente = this.items.find(i => i.id === producto.id);

    if (itemExistente) {
      itemExistente.cantidad += cant;
      itemExistente.subtotal = Math.round((itemExistente.cantidad * itemExistente.puestoPeru + Number.EPSILON) * 100) / 100;
    } else {
      this.items.push({
        id: producto.id,
        producto: producto.producto,
        precioUSA: producto.precioUSA,
        puestoPeru: producto.puestoPeru,
        cantidad: cant,
        subtotal: Math.round((cant * producto.puestoPeru + Number.EPSILON) * 100) / 100
      });
    }
    return true;
  }

  modificarCantidad(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
      this.eliminar(id);
    } else {
      item.subtotal = Math.round((item.cantidad * item.puestoPeru + Number.EPSILON) * 100) / 100;
    }
  }

  eliminar(id) {
    this.items = this.items.filter(i => i.id !== id);
  }

  vaciar() {
    this.items = [];
  }

  obtenerTotales(catalogoActual = null) {
    let totalUnidadesDisponibles = 0;
    let totalPedidoDisponible = 0;
    let totalUnidadesBruto = 0;
    let totalPedidoBruto = 0;
    let hayAgotados = false;
    let cantidadAgotados = 0;

    for (const item of this.items) {
      totalUnidadesBruto += item.cantidad;
      totalPedidoBruto += item.subtotal;

      let estaAgotado = false;
      if (catalogoActual && catalogoActual.length > 0) {
        const prod = catalogoActual.find(p => p.id === item.id || normalizarClaveColumna(p.producto) === normalizarClaveColumna(item.producto));
        if (!prod || prod.esAgotado) {
          estaAgotado = true;
        }
      }

      if (!estaAgotado) {
        totalUnidadesDisponibles += item.cantidad;
        totalPedidoDisponible += item.subtotal;
      } else {
        hayAgotados = true;
        cantidadAgotados++;
      }
    }

    return {
      totalUnidades: totalUnidadesDisponibles,
      totalPedido: Math.round((totalPedidoDisponible + Number.EPSILON) * 100) / 100,
      totalUnidadesBruto,
      totalPedidoBruto: Math.round((totalPedidoBruto + Number.EPSILON) * 100) / 100,
      hayAgotados,
      cantidadAgotados
    };
  }

  validarDisponibilidad(catalogoActual = []) {
    const agotados = [];
    for (const item of this.items) {
      const prod = catalogoActual.find(p => p.id === item.id || normalizarClaveColumna(p.producto) === normalizarClaveColumna(item.producto));
      if (!prod || prod.esAgotado) {
        agotados.push(item);
      }
    }
    return {
      esValido: agotados.length === 0,
      agotados
    };
  }

  obtenerEstadoBoton(catalogoActual = []) {
    const { totalUnidades, hayAgotados } = this.obtenerTotales(catalogoActual);
    if (hayAgotados) {
      return {
        habilitado: false,
        texto: '🔒 ACTUALIZA TU PEDIDO',
        alerta: '⚠️ Algunos productos de tu pedido ya no están disponibles. Elimina los productos agotados para continuar.'
      };
    }
    if (totalUnidades < 6) {
      const faltan = 6 - totalUnidades;
      return {
        habilitado: false,
        texto: '🔒 PEDIDO MÍNIMO: 6 UNIDADES',
        alerta: `⚠️ Pedido mínimo mayorista: 6 unidades. Te faltan ${faltan} unidades para confirmar.`
      };
    }
    return {
      habilitado: true,
      texto: '📲 ENVIAR PEDIDO POR WHATSAPP',
      alerta: null
    };
  }

  generarMensajeWhatsApp(nombreCliente = '') {
    const { totalUnidades, totalPedido } = this.obtenerTotales();
    if (this.items.length === 0) return '';

    let msg = 'PEDIDO MAYORISTA GL EXPRESS\n\n';
    msg += `Cliente: ${nombreCliente ? nombreCliente.trim() : ''}\n\n`;

    this.items.forEach(item => {
      msg += `${item.cantidad} x ${item.producto}\n`;
      msg += `Precio: S/${item.puestoPeru.toFixed(2)}\n`;
      msg += `Subtotal: S/${item.subtotal.toFixed(2)}\n\n`;
    });

    msg += `TOTAL UNIDADES: ${totalUnidades}\n`;
    msg += `TOTAL PEDIDO: S/${totalPedido.toFixed(2)}`;

    return msg;
  }

  validarPedidoMinimo() {
    const { totalUnidades } = this.obtenerTotales();
    const MIN_UNIDADES = 6;
    const faltan = Math.max(0, MIN_UNIDADES - totalUnidades);
    const cumple = totalUnidades >= MIN_UNIDADES;
    return {
      cumple,
      totalUnidades,
      minimoRequerido: MIN_UNIDADES,
      faltan,
      mensajeAdvertencia: cumple ? null : `⚠️ Pedido mínimo mayorista: ${MIN_UNIDADES} unidades. Te faltan ${faltan} unidad${faltan === 1 ? '' : 'es'} para confirmar.`
    };
  }

  generarUrlWhatsApp(nombreCliente = '', numeroTelefono = '51910487554', catalogoActual = []) {
    if (catalogoActual && catalogoActual.length > 0) {
      const valDisp = this.validarDisponibilidad(catalogoActual);
      if (!valDisp.esValido) {
        throw new Error('No se puede enviar pedido: contiene productos agotados');
      }
    }
    const validacion = this.validarPedidoMinimo();
    if (!validacion.cumple) {
      throw new Error(`Pedido no cumple el mínimo mayorista de 6 unidades (tiene ${validacion.totalUnidades})`);
    }
    const mensaje = this.generarMensajeWhatsApp(nombreCliente);
    return `https://api.whatsapp.com/send?phone=${numeroTelefono}&text=${encodeURIComponent(mensaje)}`;
  }
}

// --- SUITE DE TESTS ---
console.log('--- Iniciando Tests de GL EXPRESS Mayorista ---');

// Test 1: Parser CSV y Extractor de la Pestaña MAYORISTA
const sampleCsv = `Producto,Precio USA ($),Cantidad,Categoria,Genero,Peso KG,Flete x KG,Reempaque,Precio Dolar (T.C),Costo Perú,imagen,Estado catálogo
9 Am Dive 3.4 Oz,19.71,1,Árabes,Unisex,0.65,9.50,1.00,3.40,90.00,https://ejemplo.com/9am.jpg,Disponible
Dior Sauvage EDT 100ml,19.95,1,Diseñador,Hombre,0.60,9.50,1.00,3.40,86.50,,No disponible
Bleu de Chanel 100ml,115.00,1,Diseñador,Hombre,0.60,9.50,1.00,3.40,415.50,,Disponible`;

const rows = parsearCSV(sampleCsv);
assert.strictEqual(rows.length, 4, 'Deben existir 4 filas (encabezado + 3 datos)');

const productos = convertirFilasAMayorista(rows);
assert.strictEqual(productos.length, 3, 'Deben parsearse 3 productos');

const p1 = productos[0];
assert.strictEqual(p1.producto, '9 Am Dive 3.4 Oz');
assert.strictEqual(p1.precioUSA, 19.71);
assert.strictEqual(p1.puestoPeru, 90.00, 'Costo Perú debe mapearse a puestoPeru');
assert.strictEqual(p1.categoria, 'Árabes');
assert.strictEqual(p1.genero, 'Unisex');
assert.strictEqual(p1.imagen, 'https://ejemplo.com/9am.jpg');
assert.strictEqual(p1.esAgotado, false);

// REGLA CRÍTICA: Asegurar que NO existen propiedades privadas como costoPeru, fleteKg, etc. en el objeto de visualización
assert.strictEqual(p1.costoPeru, undefined, 'La propiedad costoPeru NO debe existir directamente en el objeto mayorista');
assert.strictEqual(p1.pesoKg, undefined, 'pesoKg NO debe existir en el objeto mayorista');
assert.strictEqual(p1.fleteKg, undefined, 'fleteKg NO debe existir en el objeto mayorista');
assert.strictEqual(p1.reempaque, undefined, 'reempaque NO debe existir en el objeto mayorista');
assert.strictEqual(p1.tc, undefined, 'tc NO debe existir en el objeto mayorista');

const p2 = productos[1];
assert.strictEqual(p2.esAgotado, true, 'Dior Sauvage debe estar marcado como agotado');
console.log('✔ Test 1: Parser y extracción con protección de datos superado.');

// Test 2: Carrito y Operaciones
const carrito = new CarritoMayorista();
carrito.agregar(p1, 1);
assert.strictEqual(carrito.items.length, 1);
assert.strictEqual(carrito.items[0].cantidad, 1);
assert.strictEqual(carrito.items[0].subtotal, 90.00);

// Agregar más unidades del mismo producto
carrito.agregar(p1, 2);
assert.strictEqual(carrito.items[0].cantidad, 3);
assert.strictEqual(carrito.items[0].subtotal, 270.00);

// Intentar agregar producto agotado debe ser rechazado
const agregadoAgotado = carrito.agregar(p2, 1);
assert.strictEqual(agregadoAgotado, false, 'No se debe permitir agregar productos agotados');
assert.strictEqual(carrito.items.length, 1);

// Agregar otro producto disponible (Bleu de Chanel)
const p3 = productos[2];
carrito.agregar(p3, 1);
assert.strictEqual(carrito.items.length, 2);

const totales = carrito.obtenerTotales();
assert.strictEqual(totales.totalUnidades, 4, 'Total unidades debe ser 3 + 1 = 4');
assert.strictEqual(totales.totalPedido, 685.50, 'Total pedido debe ser 270 + 415.50 = 685.50');
console.log('✔ Test 2: Carrito mayorista y cálculo de totales superado.');

// Test 3: Formato de mensaje WhatsApp según especificación exacta
const carritoWA = new CarritoMayorista();
carritoWA.agregar({ id: '1', producto: '9 AM Dive 3.4 Oz', puestoPeru: 90.00 }, 1);
carritoWA.agregar({ id: '2', producto: 'Perfume X', puestoPeru: 80.00 }, 3);

const mensajeEsperado = `PEDIDO MAYORISTA GL EXPRESS

Cliente: 

1 x 9 AM Dive 3.4 Oz
Precio: S/90.00
Subtotal: S/90.00

3 x Perfume X
Precio: S/80.00
Subtotal: S/240.00

TOTAL UNIDADES: 4
TOTAL PEDIDO: S/330.00`;

const mensajeGenerado = carritoWA.generarMensajeWhatsApp('');
assert.strictEqual(mensajeGenerado.trim(), mensajeEsperado.trim(), 'El mensaje de WhatsApp debe coincidir exactamente');
console.log('✔ Test 3: Formato estricto de mensaje WhatsApp superado.');

// Test 4: Verificación de que la tarjeta de producto NO renderiza "$" ni "USA"
function renderizarTarjetaHtmlMock(item) {
  return `
    <article class="wholesale-card ${item.esAgotado ? 'is-agotado' : ''}" data-id="${item.id}">
      <div class="wholesale-title-wrapper">
        <h3 class="wholesale-title">${item.producto}</h3>
      </div>
      <div class="wholesale-pricing-block">
        <span class="wholesale-price-lbl">PUESTO EN PERÚ</span>
        <span class="wholesale-price-peru">S/ ${Number(item.puestoPeru || 0).toFixed(2)}</span>
      </div>
    </article>
  `;
}

const htmlTarjeta = renderizarTarjetaHtmlMock(p1);
assert.ok(!htmlTarjeta.includes('$'), 'La tarjeta NO debe contener el símbolo $');
assert.ok(!htmlTarjeta.includes('USA'), 'La tarjeta NO debe contener texto USA');
assert.ok(!htmlTarjeta.includes('Precio USA'), 'La tarjeta NO debe contener Precio USA');
assert.ok(htmlTarjeta.includes('PUESTO EN PERÚ'), 'La tarjeta debe contener PUESTO EN PERÚ');
assert.ok(htmlTarjeta.includes('S/ 90.00'), 'La tarjeta debe contener el precio en Soles');
console.log('✔ Test 4: Ocultamiento total de Precio USA y "$" en tarjeta superado.');

// Test 5: Regla de Negocio Mayorista - Mínimo 6 Unidades antes de enviar WhatsApp
console.log('\n--- Test 5: Regla de negocio - Mínimo 6 unidades mayorista ---');
const cartMin = new CarritoMayorista();

// Caso A: Carrito con menos de 6 unidades (ejemplo del usuario: Perfume A: 2, Perfume B: 1 -> Total 3)
cartMin.agregar({ id: 'pA', producto: 'Perfume A', puestoPeru: 100 }, 2);
cartMin.agregar({ id: 'pB', producto: 'Perfume B', puestoPeru: 120 }, 1);

const valMenor = cartMin.validarPedidoMinimo();
assert.strictEqual(valMenor.totalUnidades, 3, 'Total unidades debe ser 3');
assert.strictEqual(valMenor.cumple, false, 'No debe permitir enviar pedido con 3 unidades');
assert.strictEqual(valMenor.faltan, 3, 'Deben faltar 3 unidades para completar el mínimo');
assert.ok(valMenor.mensajeAdvertencia.includes('Te faltan 3 unidades'), 'Debe indicar que faltan 3 unidades');

// Intentar generar URL WhatsApp con menos de 6 unidades debe arrojar excepción de seguridad
assert.throws(() => {
  cartMin.generarUrlWhatsApp('Negocio Lima', '51910487554');
}, /mínimo mayorista de 6 unidades/, 'Debe bloquear la generación de WhatsApp si unidades < 6');
console.log('✔ Caso A (< 6 unidades): Bloqueado con alerta roja y botón desactivado.');

// Caso B: Agregar 3 unidades más de Perfume A (ejemplo del usuario: Perfume A: 3, Perfume B: 3 -> Total 6)
cartMin.agregar({ id: 'pA', producto: 'Perfume A', puestoPeru: 100 }, 1); // Perfume A pasa a 3
cartMin.agregar({ id: 'pB', producto: 'Perfume B', puestoPeru: 120 }, 2); // Perfume B pasa a 3

const valExacto = cartMin.validarPedidoMinimo();
assert.strictEqual(valExacto.totalUnidades, 6, 'Total unidades debe ser 6');
assert.strictEqual(valExacto.cumple, true, 'Debe permitir enviar pedido con 6 unidades');
assert.strictEqual(valExacto.faltan, 0, 'No deben faltar unidades');
assert.strictEqual(valExacto.mensajeAdvertencia, null, 'No debe haber mensaje de advertencia');

const urlWA = cartMin.generarUrlWhatsApp('Perfumería Mayorista Express', '51910487554');
assert.ok(urlWA.startsWith('https://api.whatsapp.com/send?phone=51910487554'), 'La URL debe dirigir al número oficial 51910487554');
assert.ok(urlWA.includes(encodeURIComponent('TOTAL UNIDADES: 6')), 'El mensaje codificado debe reflejar 6 unidades');
console.log('✔ Caso B (>= 6 unidades): Habilitado en verde y URL generada con número 51910487554.');

// Test 6: Sincronización de Disponibilidad en Carrito y Recálculo Excluyendo Agotados
console.log('\n--- Test 6: Validación de disponibilidad y recálculo de totales ---');
const cartDisp = new CarritoMayorista();
const catalogoEnVivo = [
  { id: 'pA', producto: 'Perfume A', puestoPeru: 70.00, esAgotado: false },
  { id: 'pB', producto: 'Perfume B', puestoPeru: 100.00, esAgotado: true } // Agotado en Google Sheets
];

// Cliente tiene: Perfume A disponible x3 = S/210, Perfume B agotado x3 = S/300
cartDisp.agregar({ id: 'pA', producto: 'Perfume A', puestoPeru: 70.00 }, 3);
cartDisp.agregar({ id: 'pB', producto: 'Perfume B', puestoPeru: 100.00 }, 3);

const totalesDisp = cartDisp.obtenerTotales(catalogoEnVivo);
// Regla estricta: Los productos agotados NO deben sumar al total unidades ni al total pedido
assert.strictEqual(totalesDisp.totalUnidades, 3, 'TOTAL UNIDADES debe ser 3 (excluye las 3 unidades agotadas)');
assert.strictEqual(totalesDisp.totalPedido, 210.00, 'TOTAL PEDIDO debe ser S/210.00 (excluye los S/300 agotados)');
assert.strictEqual(totalesDisp.hayAgotados, true, 'Debe registrar que hay productos agotados');
assert.strictEqual(totalesDisp.cantidadAgotados, 1, 'Debe haber 1 item agotado');

const estadoBoton = cartDisp.obtenerEstadoBoton(catalogoEnVivo);
assert.strictEqual(estadoBoton.habilitado, false, 'El botón WhatsApp debe estar deshabilitado');
assert.strictEqual(estadoBoton.texto, '🔒 ACTUALIZA TU PEDIDO', 'Texto del botón debe ser "🔒 ACTUALIZA TU PEDIDO"');
assert.ok(estadoBoton.alerta.includes('Algunos productos de tu pedido ya no están disponibles'), 'Debe mostrar advertencia de stock');

// Intentar enviar WhatsApp con agotados debe arrojar error
assert.throws(() => {
  cartDisp.generarUrlWhatsApp('Cliente Mayorista', '51910487554', catalogoEnVivo);
}, /contiene productos agotados/, 'Debe impedir generar WhatsApp si hay agotados');
console.log('✔ Caso 6A: Totales recalculados (excluye agotados) y botón bloqueado con "🔒 ACTUALIZA TU PEDIDO".');

// Eliminar el producto agotado B y sumar 3 unidades más del disponible A (total 6 unidades disponibles)
cartDisp.eliminar('pB');
cartDisp.agregar({ id: 'pA', producto: 'Perfume A', puestoPeru: 70.00 }, 3);

const totalesLimpios = cartDisp.obtenerTotales(catalogoEnVivo);
assert.strictEqual(totalesLimpios.totalUnidades, 6, 'Total unidades debe ser 6');
assert.strictEqual(totalesLimpios.totalPedido, 420.00, 'Total pedido debe ser 6 * 70 = S/420.00');
assert.strictEqual(totalesLimpios.hayAgotados, false, 'Ya no hay agotados');

const estadoBotonLimpio = cartDisp.obtenerEstadoBoton(catalogoEnVivo);
assert.strictEqual(estadoBotonLimpio.habilitado, true, 'Botón habilitado');
assert.strictEqual(estadoBotonLimpio.texto, '📲 ENVIAR PEDIDO POR WHATSAPP', 'Texto del botón habilitado');
assert.strictEqual(estadoBotonLimpio.alerta, null, 'Sin alerta');

const urlWAOk = cartDisp.generarUrlWhatsApp('Cliente Mayorista', '51910487554', catalogoEnVivo);
assert.ok(urlWAOk.includes('TOTAL%20UNIDADES%3A%206'), 'Mensaje WhatsApp generado correctamente tras remover agotados');
console.log('✔ Caso 6B: Tras eliminar producto agotado, pedido habilitado para WhatsApp con 6 unidades.');

console.log('\n🎉 TODOS LOS TESTS DE GL EXPRESS MAYORISTA PASARON SATISFACTORIAMENTE.');

module.exports = {
  parsearCSV,
  normalizarClaveColumna,
  convertirFilasAMayorista,
  CarritoMayorista
};
