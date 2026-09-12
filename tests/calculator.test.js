const assert = require('assert');
const { calculateDunesQuotation } = require('../js/calculator');

console.log('--- Iniciando Tests Matemáticos de DUNES PARFUMS ---');

// Caso 1: Caso de prueba extraído directamente del Excel original (COTIZADOR IMPORTACION DUNES PARFUMS.xlsx)
{
  const inputExcel = {
    cantidad: 1,
    precioUSA: 20.90,
    peso: 0.8,
    envioKg: 10,
    reempaque: 0,
    tc: 3.45,
    extras: 0,
    venta: 175.00
  };

  const res = calculateDunesQuotation(inputExcel);

  console.log('Caso 1 (Excel):', res);

  assert.strictEqual(res.totalUSA, 20.90, 'Total USA debe ser 20.90');
  assert.strictEqual(res.flete, 8.00, 'Flete debe ser 0.8 * 10 = 8.00');
  assert.strictEqual(res.totalEnvio, 8.00, 'Total envío debe ser 8.00');
  assert.strictEqual(res.precioTotalUSD, 28.90, 'Precio total USD debe ser 20.9 + 8 = 28.90');
  assert.strictEqual(res.precioTotalSoles, 99.71, 'Precio total soles debe ser 28.9 * 3.45 = 99.705 (redondeado 99.71)');
  assert.strictEqual(res.costoUnidad, 99.71, 'Costo por unidad debe ser 99.71');
  assert.strictEqual(res.gananciaUnidad, 75.30, 'Ganancia por unidad debe ser 175 - 99.705 - 0 = 75.295 redondeado a 75.30');
  assert.strictEqual(res.gananciaTotal, 75.30, 'Ganancia total debe ser 75.30');
  console.log('✔ Caso 1 (Excel) superado con éxito.');
}

// Caso 2: Caso de prueba del prompt maestro
{
  const inputPrompt = {
    cantidad: 1,
    precioUSA: 33.50,
    peso: 0.60,
    envioKg: 9.50,
    reempaque: 1.00,
    tc: 3.40,
    extras: 15.00,
    venta: 175.00
  };

  const res = calculateDunesQuotation(inputPrompt);

  console.log('Caso 2 (Prompt Maestro):', res);

  // Total USA = 33.50 * 1 = 33.50
  assert.strictEqual(res.totalUSA, 33.50, 'Total USA debe ser 33.50');
  // Flete = 0.60 * 9.50 = 5.70
  assert.strictEqual(res.flete, 5.70, 'Flete debe ser 5.70');
  // Total Gasto Envio = 5.70 + 1.00 = 6.70
  assert.strictEqual(res.totalEnvio, 6.70, 'Total envío debe ser 6.70');
  // Precio Total USD = 33.50 + 6.70 = 40.20
  assert.strictEqual(res.precioTotalUSD, 40.20, 'Precio total USD debe ser 40.20');
  // Precio Total Soles = 40.20 * 3.40 = 136.68
  assert.strictEqual(res.precioTotalSoles, 136.68, 'Precio total soles debe ser 136.68');
  // Costo por unidad = 136.68 / 1 = 136.68
  assert.strictEqual(res.costoUnidad, 136.68, 'Costo unidad debe ser 136.68');
  // Ganancia por unidad = 175 - 136.68 - 15 = 23.32
  assert.strictEqual(res.gananciaUnidad, 23.32, 'Ganancia por unidad debe ser 23.32');
  // Ganancia total = 23.32 * 1 = 23.32
  assert.strictEqual(res.gananciaTotal, 23.32, 'Ganancia total debe ser 23.32');
  // Margen = (23.32 / 175) * 100 = 13.33%
  assert.strictEqual(res.margen, 13.33, 'Margen debe ser 13.33%');
  console.log('✔ Caso 2 (Prompt Maestro) superado con éxito.');
}

// Caso 3: Cantidades múltiples con nueva fórmula Flete = (Peso × Cantidad) × Costo Envio
{
  const inputMultiples = {
    cantidad: 3,
    precioUSA: 50.00,
    peso: 0.60,
    envioKg: 9.50,
    reempaque: 2.00,
    tc: 3.40,
    extras: 20.00,
    venta: 0
  };

  const res = calculateDunesQuotation(inputMultiples);

  // Total USA = 50 * 3 = 150
  assert.strictEqual(res.totalUSA, 150.00);
  // Flete = (0.60 * 3) * 9.50 = 1.80 * 9.50 = 17.10
  assert.strictEqual(res.flete, 17.10);
  // Total Envio = 17.10 + 2.00 = 19.10
  assert.strictEqual(res.totalEnvio, 19.10);
  // Total USD = 150 + 19.10 = 169.10
  assert.strictEqual(res.precioTotalUSD, 169.10);
  // Total Soles = 169.10 * 3.40 = 574.94
  assert.strictEqual(res.precioTotalSoles, 574.94);
  // Costo Unidad = 574.94 / 3 = 191.65
  assert.strictEqual(res.costoUnidad, 191.65);
  // Margen cuando venta es 0 debe ser 0% sin NaN
  assert.strictEqual(res.margen, 0.00);
  console.log('✔ Caso 3 (Múltiples y Venta 0) superado con éxito.');
}

// Caso 4: Ejemplos específicos de validación de FLETE
{
  // Ejemplo 1: Cantidad 1, Peso 0.6, EnvioKg 9.50 -> 5.70 USD
  const ej1 = calculateDunesQuotation({ cantidad: 1, peso: 0.6, envioKg: 9.50 });
  assert.strictEqual(ej1.flete, 5.70, '(0.6 × 1) × 9.50 debe ser 5.70 USD');

  // Ejemplo 2: Cantidad 2, Peso 0.6, EnvioKg 9.50 -> 11.40 USD
  const ej2 = calculateDunesQuotation({ cantidad: 2, peso: 0.6, envioKg: 9.50 });
  assert.strictEqual(ej2.flete, 11.40, '(0.6 × 2) × 9.50 debe ser 11.40 USD');

  // Ejemplo 3: Cantidad 5, Peso 0.6, EnvioKg 9.50 -> 28.50 USD
  const ej3 = calculateDunesQuotation({ cantidad: 5, peso: 0.6, envioKg: 9.50 });
  assert.strictEqual(ej3.flete, 28.50, '(0.6 × 5) × 9.50 debe ser 28.50 USD');

  console.log('✔ Caso 4 (Validación de Flete: 1, 2 y 5 unidades) superado con éxito.');
}

// Caso 5: Validación Automática solicitada en el prompt (Dior Sauvage 2 unidades)
{
  const inputDior2 = {
    producto: 'Dior Sauvage EDT 100ml',
    cantidad: 2,
    precioUSA: 19.95,
    peso: 0.6,
    envioKg: 9.50,
    reempaque: 1.00,
    tc: 3.40,
    extras: 15.00,
    venta: 139.00
  };

  const res = calculateDunesQuotation(inputDior2);

  console.log('Caso 5 (Validación Dior Sauvage 2 unidades):', res);

  assert.strictEqual(res.totalUSA, 39.90, 'Total USA debe ser 39.90 USD (19.95 × 2)');
  assert.strictEqual(res.flete, 11.40, 'Flete debe ser 11.40 USD ((0.6 × 2) × 9.50)');
  assert.strictEqual(res.reempaque, 1.00, 'Reempaque debe ser 1.00 USD');
  assert.strictEqual(res.totalEnvio, 12.40, 'Total envío debe ser 12.40 USD (11.40 + 1.00)');
  assert.strictEqual(res.precioTotalUSD, 52.30, 'Total USD debe ser 52.30 USD (39.90 + 12.40)');
  assert.strictEqual(res.precioTotalSoles, 177.82, 'Costo Perú debe ser 177.82 S/ (52.30 × 3.40)');
  assert.strictEqual(res.costoUnidad, 88.91, 'Costo unidad debe ser 88.91 S/ (177.82 ÷ 2)');
  assert.strictEqual(res.gananciaUnidad, 35.09, 'Ganancia unidad debe ser 35.09 S/ (139 - 88.91 - 15)');
  assert.strictEqual(res.gananciaTotal, 70.18, 'Ganancia total debe ser 70.18 S/ (35.09 × 2)');

  console.log('✔ Caso 5 (Validación Automática solicitada) superado con éxito.');
}

// Caso 6: Validación de Sistema Inteligente de Reempaque Dinámico (Base 1.00 USD/ud)
{
  const costoBaseUnidad = 1.00;

  // 1 perfume -> $1.00
  const r1 = calculateDunesQuotation({ cantidad: 1, costoReempaqueUnidad: costoBaseUnidad });
  assert.strictEqual(r1.reempaque, 1.00, 'Reempaque para 1 perfume debe ser 1.00 USD');

  // 2 perfumes -> $2.00
  const r2 = calculateDunesQuotation({ cantidad: 2, costoReempaqueUnidad: costoBaseUnidad });
  assert.strictEqual(r2.reempaque, 2.00, 'Reempaque para 2 perfumes debe ser 2.00 USD');

  // 3 perfumes -> $3.00
  const r3 = calculateDunesQuotation({ cantidad: 3, costoReempaqueUnidad: costoBaseUnidad });
  assert.strictEqual(r3.reempaque, 3.00, 'Reempaque para 3 perfumes debe ser 3.00 USD');

  // 4 perfumes -> $4.00
  const r4 = calculateDunesQuotation({ cantidad: 4, costoReempaqueUnidad: costoBaseUnidad });
  assert.strictEqual(r4.reempaque, 4.00, 'Reempaque para 4 perfumes debe ser 4.00 USD');

  console.log('✔ Caso 6 (Reempaque Dinámico 1, 2, 3, 4 perfumes a $1.00/ud) superado con éxito.');
}

// Caso 7: Validación de Cambio de Tarifa de Courier en Configuración (Base 1.25 USD/ud)
{
  const nuevaTarifaUnidad = 1.25;

  // 1 perfume -> $1.25
  const r1 = calculateDunesQuotation({ cantidad: 1, costoReempaqueUnidad: nuevaTarifaUnidad });
  assert.strictEqual(r1.reempaque, 1.25, 'Reempaque para 1 perfume con tarifa 1.25 debe ser 1.25 USD');

  // 4 perfumes -> $5.00
  const r4 = calculateDunesQuotation({ cantidad: 4, costoReempaqueUnidad: nuevaTarifaUnidad });
  assert.strictEqual(r4.reempaque, 5.00, 'Reempaque para 4 perfumes con tarifa 1.25 debe ser 5.00 USD');

  console.log('✔ Caso 7 (Cambio de tarifa courier a $1.25/ud: 1 ud -> $1.25, 4 uds -> $5.00) superado con éxito.');
}

// Caso 8: Validación de Modificación Manual de Reempaque
// Ejemplo del prompt: App calcula auto $3.00 (3 uds × $1.00), pero usuario edita a $5.00
{
  const inputManual = {
    cantidad: 3,
    precioUSA: 30.00,
    peso: 0.60,
    envioKg: 9.50,
    reempaque: 5.00, // Modificado manualmente por el usuario
    tc: 3.40,
    extras: 15.00,
    venta: 180.00
  };

  const res = calculateDunesQuotation(inputManual);

  assert.strictEqual(res.reempaque, 5.00, 'Reempaque manual de 5.00 debe respetarse exactamente');
  // Flete = (0.6 * 3) * 9.50 = 17.10
  assert.strictEqual(res.flete, 17.10, 'Flete debe ser 17.10');
  // Total Envio = 17.10 + 5.00 = 22.10
  assert.strictEqual(res.totalEnvio, 22.10, 'Total envío debe usar el reempaque manual (17.10 + 5.00 = 22.10)');
  // Total USA = 30 * 3 = 90
  assert.strictEqual(res.totalUSA, 90.00, 'Total USA debe ser 90.00');
  // Total USD = 90 + 22.10 = 112.10
  assert.strictEqual(res.precioTotalUSD, 112.10, 'Total USD debe ser 112.10');

}

// Caso 9: Configuración Real — Costo Caja ÷ Unidades por Caja (Base: Caja $4.00, Capacidad 4)
{
  const costoCaja = 4.00;
  const unidadesCaja = 4;

  // 1 perfume: 1 × (4 ÷ 4) = $1.00
  const r1 = calculateDunesQuotation({ cantidad: 1, costoCaja, unidadesCaja });
  assert.strictEqual(r1.reempaque, 1.00, 'Reempaque 1 perfume debe ser 1.00 USD');

  // 2 perfumes: 2 × (4 ÷ 4) = $2.00
  const r2 = calculateDunesQuotation({ cantidad: 2, costoCaja, unidadesCaja });
  assert.strictEqual(r2.reempaque, 2.00, 'Reempaque 2 perfumes debe ser 2.00 USD');

  // 3 perfumes: 3 × (4 ÷ 4) = $3.00 (Ejemplo del prompt)
  const r3 = calculateDunesQuotation({ cantidad: 3, costoCaja, unidadesCaja });
  assert.strictEqual(r3.reempaque, 3.00, 'Reempaque 3 perfumes debe ser 3.00 USD');

  // 4 perfumes: 4 × (4 ÷ 4) = $4.00
  const r4 = calculateDunesQuotation({ cantidad: 4, costoCaja, unidadesCaja });
  assert.strictEqual(r4.reempaque, 4.00, 'Reempaque 4 perfumes debe ser 4.00 USD');

  console.log('✔ Caso 9 (Cálculo real Caja $4 / 4 unidades: 1, 2, 3, 4 perfumes) superado con éxito.');
}

// Caso 10: Cambio de precio de caja (Caja $5.00, Capacidad 4 -> 5 ÷ 4 = $1.25)
{
  const costoCaja = 5.00;
  const unidadesCaja = 4;

  // 1 perfume: 1 × 1.25 = $1.25
  const r1 = calculateDunesQuotation({ cantidad: 1, costoCaja, unidadesCaja });
  assert.strictEqual(r1.reempaque, 1.25, '1 perfume con caja $5 debe ser 1.25 USD');

  // 4 perfumes: 4 × 1.25 = $5.00
  const r4 = calculateDunesQuotation({ cantidad: 4, costoCaja, unidadesCaja });
  assert.strictEqual(r4.reempaque, 5.00, '4 perfumes con caja $5 debe ser 5.00 USD');

  console.log('✔ Caso 10 (Cambio de precio de caja a $5 / 4 uds: 1 ud -> $1.25, 4 uds -> $5.00) superado con éxito.');
}

// Caso 11: Edición Manual específica del prompt (Sistema calcula $3.00, usuario cambia a $4.00)
{
  const inputManualPrompt = {
    cantidad: 3,
    costoCaja: 4.00,
    unidadesCaja: 4,
    reempaque: 4.00, // Usuario cambia manual a $4.00
    precioUSA: 25.00,
    peso: 0.60,
    envioKg: 9.50,
    tc: 3.40,
    extras: 15.00,
    venta: 160.00
  };

  const res = calculateDunesQuotation(inputManualPrompt);

  assert.strictEqual(res.reempaque, 4.00, 'Reempaque manual de $4.00 debe respetarse');
  // Flete = (0.6 * 3) * 9.50 = 17.10
  assert.strictEqual(res.flete, 17.10, 'Flete debe ser 17.10 USD');
  // Total Envio = 17.10 + 4.00 = 21.10
  assert.strictEqual(res.totalEnvio, 21.10, 'Total envío debe ser 21.10 USD (17.10 + 4.00)');
  // Total USA = 25 * 3 = 75
  assert.strictEqual(res.totalUSA, 75.00, 'Total USA debe ser 75.00 USD');
  // Total USD = 75 + 21.10 = 96.10
  assert.strictEqual(res.precioTotalUSD, 96.10, 'Total USD debe ser 96.10 USD');

  console.log('✔ Caso 11 (Edición manual a $4.00 en cotización específica) superado con éxito.');
}

console.log('--- TODOS LOS TESTS MATEMÁTICOS PASARON SATISFACTORIAMENTE ---');



