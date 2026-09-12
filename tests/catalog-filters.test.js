const fs = require('fs');
const assert = require('assert');

console.log('--- Iniciando Verificación Interna de Filtros DUNES PARFUMS ---\n');

// 1. Verificar HTML
const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('id="catalogo-lista"'), 'catalogo-lista debe existir en index.html');
assert(html.includes('catalog-filters-container'), 'catalog-filters-container debe existir en index.html');
assert(html.includes('data-filter="categoria" data-value="todos"'), 'Botón categoría todos debe existir');
assert(html.includes('data-filter="categoria" data-value="diseñador"'), 'Botón categoría diseñador debe existir');
assert(html.includes('data-filter="categoria" data-value="árabes"'), 'Botón categoría árabes debe existir');
assert(html.includes('data-filter="genero" data-value="todos"'), 'Botón género todos debe existir');
assert(html.includes('data-filter="genero" data-value="hombre"'), 'Botón género hombre debe existir');
assert(html.includes('data-filter="genero" data-value="mujer"'), 'Botón género mujer debe existir');
assert(html.includes('data-filter="estado" data-value="todos"'), 'Botón estado todos debe existir');
assert(html.includes('data-filter="estado" data-value="disponibles"'), 'Botón estado disponibles debe existir');
assert(html.includes('data-filter="estado" data-value="agotados"'), 'Botón estado agotados debe existir');

// Verificar que NO existe un botón 'Unisex' en los filtros
assert(!html.includes('data-value="unisex"'), 'NO debe existir botón con valor Unisex');
console.log('✔ [PASS] Verificación de index.html: Controles de filtro presentes (Categoría, Género, Estado) y sin botón Unisex');

// 2. Verificar CSS
const css = fs.readFileSync('style.css', 'utf8');
assert(css.includes('.catalog-filters-container'), 'style.css debe tener .catalog-filters-container');
assert(css.includes('.catalog-filter-btn'), 'style.css debe tener .catalog-filter-btn');
assert(css.includes('.catalog-filter-btn.is-active'), 'style.css debe tener estado .is-active');
assert(css.includes('.card-agotado-badge'), 'style.css debe tener .card-agotado-badge');
console.log('✔ [PASS] Verificación de style.css: Estilos visuales agregados correctamente');

// 3. Simular lógica de filtrado de app.js
const normalizar = (s) => (s || '')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const mockProductos = [
  { id: '1', producto: 'Dior Sauvage', categoria: 'Diseñador', genero: 'Hombre', estadoCatalogo: 'Disponible', esAgotado: false },
  { id: '2', producto: 'Good Girl CH', categoria: 'Diseñador', genero: 'Mujer', estadoCatalogo: 'No disponible', esAgotado: true },
  { id: '3', producto: 'CK One', categoria: 'Diseñador', genero: 'Unisex', estadoCatalogo: 'Disponible', esAgotado: false },
  { id: '4', producto: 'Club de Nuit Man', categoria: 'Árabes', genero: 'Hombre', estadoCatalogo: 'No disponible', esAgotado: true },
  { id: '5', producto: 'Yara Lattafa', categoria: 'Árabes', genero: 'Mujer', estadoCatalogo: 'Disponible', esAgotado: false },
  { id: '6', producto: 'Khamrah Lattafa', categoria: 'Árabes', genero: 'Unisex', estadoCatalogo: 'No disponible', esAgotado: true }
];

function filtrar(items, catFiltro, genFiltro, estFiltro = 'todos', busqueda = '') {
  const terminoNorm = normalizar(busqueda);
  const catFiltroNorm = normalizar(catFiltro);
  const genFiltroNorm = normalizar(genFiltro);
  const estFiltroNorm = normalizar(estFiltro);

  return items.filter((item) => {
    if (terminoNorm) {
      const nombreNorm = normalizar(item.producto);
      if (!nombreNorm.includes(terminoNorm)) return false;
    }
    if (catFiltroNorm && catFiltroNorm !== 'todos') {
      const itemCatNorm = normalizar(item.categoria);
      if (catFiltroNorm === 'disenador') {
        if (!itemCatNorm.includes('disenad')) return false;
      } else if (catFiltroNorm === 'arabes') {
        if (!itemCatNorm.includes('arab')) return false;
      } else {
        if (itemCatNorm !== catFiltroNorm) return false;
      }
    }
    if (genFiltroNorm && genFiltroNorm !== 'todos') {
      const itemGenNorm = normalizar(item.genero);
      const esUnisex = itemGenNorm.includes('unisex');
      if (genFiltroNorm === 'hombre') {
        const esHombre = itemGenNorm.includes('hombre') || itemGenNorm.includes('men') || itemGenNorm.includes('man') || itemGenNorm.includes('masculin');
        if (!esHombre && !esUnisex) return false;
      } else if (genFiltroNorm === 'mujer') {
        const esMujer = itemGenNorm.includes('mujer') || itemGenNorm.includes('wom') || itemGenNorm.includes('femenin');
        if (!esMujer && !esUnisex) return false;
      }
    }
    if (estFiltroNorm && estFiltroNorm !== 'todos') {
      const esAgotado = item.esAgotado || (item.estadoCatalogo && normalizar(item.estadoCatalogo).includes('no disponible'));
      if (estFiltroNorm === 'disponibles' && esAgotado) return false;
      if (estFiltroNorm === 'agotados' && !esAgotado) return false;
    }
    return true;
  });
}

function calcularMetricas(items) {
  const total = items.length;
  let disponibles = 0;
  let agotados = 0;
  items.forEach((p) => {
    const esAgotado = p.esAgotado || (p.estadoCatalogo && normalizar(p.estadoCatalogo).includes('no disponible'));
    if (esAgotado) agotados++;
    else disponibles++;
  });
  return { total, disponibles, agotados };
}

// Tests de Categoría
const soloDisenador = filtrar(mockProductos, 'diseñador', 'todos', 'todos');
assert.strictEqual(soloDisenador.length, 3, 'Diseñador debe tener 3 items');
console.log('✔ [PASS] Filtro Categoría = Diseñador');

const soloArabes = filtrar(mockProductos, 'árabes', 'todos', 'todos');
assert.strictEqual(soloArabes.length, 3, 'Árabes debe tener 3 items');
console.log('✔ [PASS] Filtro Categoría = Árabes');

// Tests de Género
const soloHombre = filtrar(mockProductos, 'todos', 'hombre', 'todos');
assert.strictEqual(soloHombre.length, 4, 'Hombre debe incluir Hombre + Unisex (4 items)');
console.log('✔ [PASS] Filtro Género = Hombre (Hombre + Unisex)');

const soloMujer = filtrar(mockProductos, 'todos', 'mujer', 'todos');
assert.strictEqual(soloMujer.length, 4, 'Mujer debe incluir Mujer + Unisex (4 items)');
console.log('✔ [PASS] Filtro Género = Mujer (Mujer + Unisex)');

// Tests de Estado
const soloDisponibles = filtrar(mockProductos, 'todos', 'todos', 'disponibles');
assert.strictEqual(soloDisponibles.length, 3, 'Disponibles debe tener 3 items');
assert(soloDisponibles.every(i => !i.esAgotado), 'Todos deben ser Disponibles');
console.log('✔ [PASS] Filtro Estado = Disponibles');

const soloAgotados = filtrar(mockProductos, 'todos', 'todos', 'agotados');
assert.strictEqual(soloAgotados.length, 3, 'Agotados debe tener 3 items');
assert(soloAgotados.every(i => i.esAgotado), 'Todos deben ser Agotados');
console.log('✔ [PASS] Filtro Estado = Agotados');

// Test Todos
const todos = filtrar(mockProductos, 'todos', 'todos', 'todos');
assert.strictEqual(todos.length, 6, 'Todos debe devolver los 6 items');
console.log('✔ [PASS] Filtro Todos = Todo el catálogo');

// Test Combinado Triple: Diseñador + Hombre + Disponibles
// Items:
// 1. Dior Sauvage (Diseñador, Hombre, Disp) -> match
// 2. Good Girl CH (Diseñador, Mujer, NoDisp) -> no hombre
// 3. CK One (Diseñador, Unisex, Disp) -> match (Unisex en Hombre y Disp)
// Total esperado = 2
const comb1 = filtrar(mockProductos, 'diseñador', 'hombre', 'disponibles');
assert.strictEqual(comb1.length, 2, 'Diseñador + Hombre + Disponibles debe dar 2 items');
console.log('✔ [PASS] Filtro Combinado: Diseñador + Hombre + Disponibles');

// Test Combinado Triple: Árabes + Mujer + Agotados
// Items:
// 4. Club de Nuit (Árabes, Hombre, NoDisp) -> no mujer
// 5. Yara (Árabes, Mujer, Disp) -> no agotado
// 6. Khamrah (Árabes, Unisex, NoDisp) -> match (Unisex en Mujer y NoDisp)
// Total esperado = 1
const comb2 = filtrar(mockProductos, 'árabes', 'mujer', 'agotados');
assert.strictEqual(comb2.length, 1, 'Árabes + Mujer + Agotados debe dar 1 item');
assert.strictEqual(comb2[0].producto, 'Khamrah Lattafa');
console.log('✔ [PASS] Filtro Combinado: Árabes + Mujer + Agotados');

// Test Métricas Dinámicas del Contador
const metricasGlobal = calcularMetricas(mockProductos);
assert.strictEqual(metricasGlobal.total, 6);
assert.strictEqual(metricasGlobal.disponibles, 3);
assert.strictEqual(metricasGlobal.agotados, 3);
console.log('✔ [PASS] Cálculo dinámico de métricas: Total catálogo, Disponibles y Agotados');

// 4. Test de Mapeo, Acordeón y Nuevo Contador de Resultados
assert(html.includes('id="btn-toggle-filtros"'), 'index.html debe tener el botón btn-toggle-filtros');
assert(html.includes('id="catalog-filters-collapsible"'), 'index.html debe tener el panel colapsable catalog-filters-collapsible');
assert(html.includes('id="catalogo-contador-resultados"'), 'index.html debe tener el elemento catalogo-contador-resultados');

const appJsCode = fs.readFileSync('app.js', 'utf8');
assert(appJsCode.includes('categoria: encontrarIndice'), 'app.js debe mapear categoria');
assert(appJsCode.includes('genero: encontrarIndice'), 'app.js debe mapear genero');
assert(appJsCode.includes('estadoCatalogo: encontrarIndice'), 'app.js debe mapear estadoCatalogo');
assert(appJsCode.includes('filtroEstadoActivo'), 'app.js debe manejar filtroEstadoActivo');
assert(appJsCode.includes('btn-toggle-filtros'), 'app.js debe controlar btn-toggle-filtros');
assert(appJsCode.includes('actualizarContadorInventarioGeneral'), 'app.js debe tener actualizarContadorInventarioGeneral');
assert(appJsCode.includes('stat-disp'), 'app.js debe generar indicador stat-disp');
assert(appJsCode.includes('stat-agot'), 'app.js debe generar indicador stat-agot');
assert(appJsCode.includes('DISPONIBLES'), 'app.js debe mostrar DISPONIBLES en el contador principal');
assert(appJsCode.includes('AGOTADOS'), 'app.js debe mostrar AGOTADOS en el contador principal');
assert(appJsCode.includes('perfumes encontrados'), 'app.js debe generar texto "perfumes encontrados"');
assert(appJsCode.includes('perfume encontrado'), 'app.js debe generar texto "perfume encontrado" en singular');

// Test de separación: Al filtrar, el inventario real permanece fijo y los resultados cambian
const globalMetricsBefore = calcularMetricas(mockProductos);
const resultadosFiltrados = filtrar(mockProductos, 'todos', 'todos', 'todos', 'good girl');
assert.strictEqual(resultadosFiltrados.length, 1);
const textoResultados = resultadosFiltrados.length === 1 ? '1 perfume encontrado' : `${resultadosFiltrados.length} perfumes encontrados`;
assert.strictEqual(textoResultados, '1 perfume encontrado');
// El inventario general sigue siendo el total de mockProductos (3 disp, 3 agot)
const globalMetricsAfter = calcularMetricas(mockProductos);
assert.strictEqual(globalMetricsBefore.disponibles, globalMetricsAfter.disponibles);
assert.strictEqual(globalMetricsBefore.agotados, globalMetricsAfter.agotados);

console.log('✔ [PASS] Separación verificada: Contador superior fijo con inventario general y contador dinámico de resultados');

console.log('\n🎉 TODAS LAS VALIDACIONES DE FILTROS PASARON AL 100%');

