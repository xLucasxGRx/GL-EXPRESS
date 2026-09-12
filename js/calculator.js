/**
 * DUNES PARFUMS - Motor de Cálculo de Importación
 * Fórmulas 100% exactas basadas en COTIZADOR IMPORTACION DUNES PARFUMS.xlsx
 */

function roundTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula todos los valores de la cotización
 * @param {Object} params
 * @param {number} params.cantidad
 * @param {number} params.precioUSA
 * @param {number} params.peso
 * @param {number} params.envioKg
 * @param {number} params.reempaque
 * @param {number} params.tc
 * @param {number} params.extras
 * @param {number} params.venta
 * @returns {Object}
 */
function calculateDunesQuotation(params) {
  const cantidad = Math.max(1, parseInt(params.cantidad, 10) || 1);
  const precioUSA = parseFloat(params.precioUSA) || 0;
  const peso = parseFloat(params.peso) || 0;
  const envioKg = parseFloat(params.envioKg) || 0;
  const tc = parseFloat(params.tc) || 0;
  const extras = parseFloat(params.extras) || 0;
  const venta = parseFloat(params.venta) || 0;

  // 1. Total Costo USA = Precio USA * Cantidad
  const totalUSA = precioUSA * cantidad;

  // 2. Flete = (Peso por Unidad KG * Cantidad) * Costo Envío KG
  const flete = (peso * cantidad) * envioKg;

  // 3. Reempaque: valor total directo o cálculo dinámico (Cantidad × (Precio Caja ÷ 4))
  let reempaque = 0;
  if (params.reempaque !== undefined && params.reempaque !== null && params.reempaque !== '') {
    reempaque = parseFloat(params.reempaque) || 0;
  } else if (params.costoCaja !== undefined && params.costoCaja !== null && params.costoCaja !== '') {
    const costoCaja = parseFloat(params.costoCaja) || 0;
    const unidadesCaja = (params.unidadesCaja !== undefined) ? Math.max(1, parseInt(params.unidadesCaja, 10) || 4) : 4;
    const costoPorPerfume = costoCaja / unidadesCaja;
    reempaque = cantidad * costoPorPerfume;
  } else if (params.costoReempaqueUnidad !== undefined) {
    reempaque = cantidad * (parseFloat(params.costoReempaqueUnidad) || 0);
  }

  // 4. Total Gasto Envío = Flete + Reempaque
  const totalEnvio = flete + reempaque;

  // 4. Precio Total USD = Total USA + Total Gasto Envío
  const precioTotalUSD = totalUSA + totalEnvio;

  // 5. Precio Total Soles = Precio Total USD * Tipo de Cambio
  const precioTotalSoles = precioTotalUSD * tc;

  // 6. Costo por Unidad (en Soles) = Precio Total Soles / Cantidad
  const costoUnidad = cantidad > 0 ? (precioTotalSoles / cantidad) : 0;

  // 7. Ganancia por Unidad = Precio Venta - Costo por Unidad - Costos Extras
  const gananciaUnidad = venta > 0 ? (venta - costoUnidad - extras) : (-costoUnidad - extras);

  // 8. Ganancia Total = Ganancia por Unidad * Cantidad
  const gananciaTotal = gananciaUnidad * cantidad;

  // 9. Margen (%) = (Ganancia por Unidad / Precio Venta) * 100
  let margen = 0;
  if (venta > 0) {
    margen = (gananciaUnidad / venta) * 100;
  }

  return {
    totalUSA: roundTwo(totalUSA),
    flete: roundTwo(flete),
    reempaque: roundTwo(reempaque),
    totalEnvio: roundTwo(totalEnvio),
    precioTotalUSD: roundTwo(precioTotalUSD),
    precioTotalSoles: roundTwo(precioTotalSoles),
    costoUnidad: roundTwo(costoUnidad),
    gananciaUnidad: roundTwo(gananciaUnidad),
    gananciaTotal: roundTwo(gananciaTotal),
    margen: roundTwo(margen)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDunesQuotation, roundTwo };
}

if (typeof window !== 'undefined') {
  window.calculateDunesQuotation = calculateDunesQuotation;
  window.roundTwo = roundTwo;
}
