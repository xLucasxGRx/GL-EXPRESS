# DUNES PARFUMS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la aplicación web y PWA instalable en iPhone **DUNES PARFUMS** para cotización de importación de perfumes USA → Perú con cálculos exactos del archivo Excel, diseño visual de lujo, soporte offline y persistencia local.

**Architecture:** Aplicación Vanilla JavaScript modular, CSS moderno con variables de diseño de perfumería de lujo y soporte para iPhone notch/safe-areas, Service Worker para soporte offline completo, manifest.json para instalación PWA, y persistencia en LocalStorage.

**Tech Stack:** HTML5 semántico, CSS3 moderno (Variables CSS, Flexbox, Grid, Glassmorphism), Vanilla JavaScript ES6+, Web App Manifest, Service Worker API, Node.js para tests unitarios del motor de cálculo.

## Global Constraints
- Fórmulas matemáticas 100% idénticas al archivo Excel `COTIZADOR IMPORTACION DUNES PARFUMS.xlsx`.
- Paleta visual: Fondo negro obsidiana, títulos y bloques en rojo vino oscuro (`#7b1824`), detalles en dorado (`#d4af37`), ganancias en verde esmeralda (`#10b981`).
- Interfaz móvil optimizada para iPhone (táctil, `apple-mobile-web-app-capable`, `viewport-fit=cover`).
- 0 dependencias externas de pago; funcionamiento 100% offline con LocalStorage.

---

### Task 1: Motor Matemático y Tests Unitarios (TDD)
**Files:**
- Create: `tests/calculator.test.js`
- Create: `js/calculator.js` (o módulo exportable en `app.js`)

**Interfaces:**
- Produces:
  ```javascript
  function calculateDunesQuotation({
    cantidad,
    precioUSA,
    peso,
    envioKg,
    reempaque,
    tc,
    extras,
    venta
  }) -> {
    totalUSA,
    flete,
    totalEnvio,
    precioTotalUSD,
    precioTotalSoles,
    costoUnidad,
    gananciaUnidad,
    gananciaTotal,
    margen
  }
  ```

- [ ] **Step 1: Escribir test unitario con los datos del Excel**
  Crear `tests/calculator.test.js` comparando los resultados contra el ejemplo del Excel:
  - Cantidad = 1, Precio USA = 20.90, Peso = 0.8, Envio = 10, Reempaque = 0, TC = 3.45, Extras = 0, Venta = 175.
  - Total USA = 20.90, Flete = 8.00, Total USD = 28.90, Total Soles = 99.705, Costo Unidad = 99.705, Ganancia = 75.295.
  - Caso 2 (del prompt): Cantidad = 1, Precio USA = 33.50, Peso = 0.6, Envio = 9.50, Reempaque = 1.00, TC = 3.40, Extras = 15.00, Venta = 139.00.
  - Flete = 5.70, Total Envío = 6.70, Total USD = 40.20, Total Soles = 136.68, Costo Unidad = 136.68, Ganancia Unidad = -12.68.
- [ ] **Step 2: Ejecutar test con Node y verificar que falla antes de implementar**
- [ ] **Step 3: Implementar función de cálculo en `app.js` / módulo**
- [ ] **Step 4: Ejecutar test con Node y verificar que pasa al 100%**

---

### Task 2: Estructura HTML Semántica y PWA Meta Tags
**Files:**
- Modify: `index.html`

- [ ] **Step 1: Configurar cabecera, metas de viewport y PWA para iPhone**
  - Meta `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.
  - Enlaces a Google Fonts (`Outfit` y `Cinzel`), `style.css` y `manifest.json`.
- [ ] **Step 2: Estructurar secciones de formulario con los 3 bloques**
  - Bloque 1: Producto y Compra USA (`producto`, `cantidad`, `precioUSA`).
  - Bloque 2: Flete o Costo de Envío (`peso`, `envioKg`, `reempaque`, `tc`).
  - Bloque 3: Venta y Gastos Locales (`extras`, `venta`).
- [ ] **Step 3: Estructurar tarjetas de resultados**
  - Tarjeta 1: `COSTO PUESTO EN PERÚ` (Total USA, Flete, Reempaque, Total USD, Costo Perú).
  - Tarjeta 2: `GANANCIA` (Ganancia por unidad, Ganancia total, Margen %).
- [ ] **Step 4: Estructurar barra de botones de acción**
  - Botones `CALCULAR`, `GUARDAR COTIZACIÓN`, `NUEVA COTIZACIÓN`, `LIMPIAR DATOS`.
- [ ] **Step 5: Estructurar sección de Cotizaciones Guardadas y Modal de Detalle**
  - Contenedor de lista de tarjetas de historial `#historial-lista`.
  - Modal `#modal-detalle` con backdrop y tarjeta de desglose completo.
  - Toast contenedor `#toast-container` para avisos flotantes.

---

### Task 3: Estilos CSS de Lujo y Optimización Móvil iPhone
**Files:**
- Modify: `style.css`

- [ ] **Step 1: Configurar sistema de diseño CSS (variables, reset y fondo obsidiana)**
  - Variables de color: `--bg-noir`, `--wine-red`, `--gold-accent`, `--emerald-green`.
  - Soporte de Safe Area Insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
- [ ] **Step 2: Diseñar bloques de entrada con inputs estilizados**
  - Labels claros, inputs táctiles grandes con indicador de moneda (`$`, `S/`, `KG`).
- [ ] **Step 3: Diseñar tarjetas de resultados visuales de alto impacto**
  - Tarjeta Costo Perú con borde sutil dorado.
  - Tarjeta Ganancia con resplandor verde esmeralda y números destacados en grande.
- [ ] **Step 4: Diseñar botones de acción y efectos hover/tap**
  - Botón Guardar con degradado rojo vino y detalles dorados.
  - Botones secundarios limpios y responsivos.
- [ ] **Step 5: Diseñar tarjetas de historial, modal emergente de detalle y avisos toast**
  - Tarjetas de historial compactas y elegantes con badges de ganancia y fecha.
  - Modal con animación suave y cierre táctil.

---

### Task 4: Lógica de Interacción, Historial Local y Persistencia
**Files:**
- Modify: `app.js`

- [ ] **Step 1: Conectar inputs a cálculo automático en tiempo real (`input` event)**
  - Actualización instantánea de los valores en pantalla al escribir.
- [ ] **Step 2: Implementar guardado de cotización en LocalStorage (`dunes_cotizaciones_v1`)**
  - Validar nombre de producto o generar nombre por defecto si está vacío.
  - Guardar timestamp, fecha legible, inputs y todos los resultados calculados.
  - Mostrar feedback visual (Toast "Cotización guardada con éxito").
- [ ] **Step 3: Implementar renderizado de tarjetas de historial**
  - Mostrar lista de cotizaciones con producto, costo, venta, ganancia, margen y fecha.
  - Botón "Ver Detalle" que abre el modal con el desglose completo.
  - Botón "Eliminar" con eliminación inmediata y actualización del storage.
- [ ] **Step 4: Implementar botones de acción auxiliares**
  - Botón `NUEVA COTIZACIÓN`: Scroll suave hacia arriba y focus en campo producto.
  - Botón `LIMPIAR DATOS`: Restablecer inputs a sus valores predeterminados.
  - Botón `CALCULAR`: Forzar recálculo y animación de feedback.

---

### Task 5: PWA, Service Worker e Iconos de Instalación
**Files:**
- Create: `manifest.json`
- Create: `sw.js`
- Create: `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png`

- [ ] **Step 1: Crear `manifest.json` con metadatos PWA**
  - Configurar orientación, tema, colores y pantalla completa standalone.
- [ ] **Step 2: Generar iconos de alta resolución de DUNES PARFUMS**
  - Script generador de icono con fondo negro, luna y acentos dorados/rojos.
- [ ] **Step 3: Implementar Service Worker `sw.js`**
  - Cachear recursos locales (`index.html`, `style.css`, `app.js`, `manifest.json`, iconos).
  - Estrategia Cache First con fallback a red.
- [ ] **Step 4: Registrar Service Worker en `app.js` con logs limpios**

---

### Task 6: Verificación Integral, Pruebas y Walkthrough
**Files:**
- Create/Update: `walkthrough.md`

- [ ] **Step 1: Ejecutar tests unitarios matemáticos**
- [ ] **Step 2: Verificar responsive en dimensiones móviles (390x844 iPhone 14/15/16)**
- [ ] **Step 3: Verificar persistencia en LocalStorage y eliminación de registros**
- [ ] **Step 4: Verificar manifest y Service Worker para PWA**
- [ ] **Step 5: Documentar walkthrough final con capturas y resultados**
