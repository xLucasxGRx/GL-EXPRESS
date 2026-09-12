# Design Spec: DUNES PARFUMS (App Móvil & PWA)

## 1. Visión General
**DUNES PARFUMS** es una aplicación móvil web progresiva (PWA), optimizada para iPhone y compatible con cualquier dispositivo móvil o de escritorio, diseñada para calcular con precisión militar los costos de importación de perfumes desde EE.UU. hacia Perú por courier, determinar el precio de venta sugerido, calcular ganancias netas y márgenes, y almacenar un historial completo de cotizaciones con funcionamiento 100% offline.

---

## 2. Paleta de Colores & Identidad Visual
Diseño inspirado en perfumería de lujo y marcas de alta gama (estilo Dior, Creed, Tom Ford, Arabian Oud):

- **Fondo Principal**: Negro obsidiana profundo (`#090a0f`, `#12131a`) con sutil resplandor dorado de fondo.
- **Títulos y Secciones**: Rojo vino oscuro / carmesí profundo (`#7b1824`, `#9b1c2e`, `#ba1a30`).
- **Detalles y Acentos**: Dorado champaña / oro pulido (`#d4af37`, `#f3d068`).
- **Indicadores de Ganancia Positiva**: Verde esmeralda vivo (`#10b981`, `#059669`).
- **Indicadores de Pérdida o Alerta**: Rojo rubí suave (`#ef4444`).
- **Textos**: Blanco perla (`#f8fafc`) y gris platino atenuado (`#94a3b8`).
- **Tipografía**: `Outfit` y `Cinzel` de Google Fonts con soporte de respaldo en tipografía nativa de Apple (`-apple-system`, `SF Pro Display`).
- **Adaptabilidad iPhone**: Soporte completo para Notch y Dynamic Island (`viewport-fit=cover`, `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).

---

## 3. Arquitectura de Pantalla y Componentes

### 3.1 Cabecera (App Header)
- Logotipo con tipografía refinada: `🌙 DUNES PARFUMS`.
- Subtítulo: *Cotizador Courier USA 🇺🇸 → Perú 🇵🇪*.
- Indicador de estado PWA / Offline.

### 3.2 Formulario: "NUEVA COTIZACIÓN"
Dividido en 3 tarjetas limpias y bien espaciadas:

#### Bloque 1: PRODUCTO Y COMPRA USA
- `Producto` (Texto, placeholder: *"Ej: Dior Sauvage EDT 100ml"*).
- `Cantidad` (Número entero, valor por defecto: `1`, min: `1`).
- `Precio unitario USA ($)` (Decimal, ej: `33.50`).

#### Bloque 2: FLETE O COSTO DE ENVÍO
- `Peso del perfume KG` (Decimal, valor por defecto: `0.60`).
- `Costo envío por KG ($)` (Decimal, valor por defecto: `9.50`).
- `Reempaque ($)` (Decimal, valor por defecto: `1.00`).
- `Tipo de cambio (S/)` (Decimal, valor por defecto: `3.40`).

#### Bloque 3: VENTA Y GASTOS LOCALES
- `Costos extras (S/)` (Decimal, valor por defecto: `15.00`, empaque local/reparto).
- `Precio venta (S/)` (Decimal, ej: `139.00`).

---

## 4. Botones de Acción
- **`CALCULAR`**: Ejecuta / actualiza el cálculo (además del recálculo automático instantáneo).
- **`GUARDAR COTIZACIÓN`**: Almacena la cotización actual en el historial local con feedback visual animado.
- **`NUEVA COTIZACIÓN`**: Hace scroll al formulario y enfoca el campo de producto.
- **`LIMPIAR DATOS`**: Restablece los campos a sus valores predeterminados (manteniendo las tarifas fijas de courier).

---

## 5. Motor de Cálculos (Fórmulas Exactas del Excel)
El motor opera con redondeo a 2 decimales para visualización financiera:

1. **Total Costo USA**:
   $$\text{Total USA} = \text{Precio USA} \times \text{Cantidad}$$
2. **Flete**:
   $$\text{Flete} = \text{Peso KG} \times \text{Costo Envío KG}$$
3. **Total Gasto Envío**:
   $$\text{Total Envío} = \text{Flete} + \text{Reempaque}$$
4. **Precio Total USD**:
   $$\text{Total USD} = \text{Total USA} + \text{Total Envío}$$
5. **Precio Total Soles**:
   $$\text{Total Soles} = \text{Total USD} \times \text{Tipo de Cambio}$$
6. **Costo por Unidad**:
   $$\text{Costo Unidad Soles} = \frac{\text{Total Soles}}{\text{Cantidad}}$$
7. **Ganancia por Unidad**:
   $$\text{Ganancia Unidad} = \text{Precio Venta} - \text{Costo Unidad Soles} - \text{Costos Extras}$$
8. **Ganancia Total**:
   $$\text{Ganancia Total} = \text{Ganancia Unidad} \times \text{Cantidad}$$
9. **Margen (%)**:
   $$\text{Margen} = \begin{cases} \left(\frac{\text{Ganancia Unidad}}{\text{Precio Venta}}\right) \times 100 & \text{si Precio Venta} > 0 \\ 0\% & \text{en otro caso} \end{cases}$$

---

## 6. Visualización de Resultados

### Tarjeta 1: COSTO PUESTO EN PERÚ
- Total USA: `$ XX.XX`
- Flete: `$ XX.XX`
- Reempaque: `$ XX.XX`
- Total USD: `$ XX.XX`
- **Costo Perú (Unitario)**: `S/ XX.XX` *(destacado en dorado)*

### Tarjeta 2: GANANCIA (Color Verde Esmeralda)
- **Ganancia por unidad**: `S/ XX.XX`
- **Ganancia total**: `S/ XX.XX`
- **Margen**: `XX.X%` (badge dinámico verde si es positivo, rojo si es negativo)

---

## 7. Historial: COTIZACIONES GUARDADAS
- Almacenado en `localStorage` con la clave `dunes_cotizaciones_v1`.
- Formato de cada registro:
  - `id`: Timestamp único.
  - `fecha`: Formato `DD/MM/YYYY HH:mm`.
  - `producto`, `cantidad`, `precioUSA`, `peso`, `flete`, `totalEnvio`, `costoPeru`, `precioVenta`, `gananciaUnidad`, `gananciaTotal`, `margen`.
- Presentación en lista de tarjetas táctiles de lujo con:
  - Nombre del Perfume
  - Fecha
  - Costo: `S/XX.XX` | Venta: `S/XX.XX` | Ganancia: `S/XX.XX` (Verde) | Margen `%`
  - Botón **Ver Detalle** (Abre un modal emergente completo estilo iOS con el desglose exacto de cada variable de importación).
  - Botón **Eliminar** (Con confirmación rápida).
  - Botón **Borrar Todo el Historial**.

---

## 8. Soporte PWA e Instalación en iPhone
- `manifest.json`:
  - `name`: "DUNES PARFUMS"
  - `short_name`: "DunesApp"
  - `start_url`: "./index.html"
  - `display`: "standalone"
  - `background_color`: "#090a0f"
  - `theme_color`: "#7b1824"
  - Iconos 192x192 y 512x512
- Metas de Safari iOS:
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="DUNES PARFUMS">`
  - `<link rel="apple-touch-icon" href="icons/icon-192.png">`
- `sw.js` (Service Worker):
  - Estrategia Cache-First para recursos estáticos (`index.html`, `style.css`, `app.js`, fuentes, manifest e iconos).
  - Funcionalidad completa sin conexión a internet.
