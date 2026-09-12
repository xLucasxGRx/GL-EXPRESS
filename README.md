# 💎 GL EXPRESS — Catálogo Mayorista

> **Plataforma exclusiva de catálogo y pedidos para clientes mayoristas de perfumería de alta gama.**

Aplicación móvil web progresiva (**PWA**) diseñada exclusivamente para revendedores y clientes mayoristas. Conectada en tiempo real a la pestaña **`MAYORISTA`** de Google Sheets, permite explorar la disponibilidad de perfumes, consultar precios en USA ($) y precios finales puestos en Perú (S/), armar pedidos con selector de unidades y enviarlos directamente por WhatsApp sin intermediarios ni registros obligatorios.

---

## ✨ Características Principales

- **Conexión Exclusiva Pestaña `MAYORISTA`**: Lectura directa de la hoja de Google Sheets vía `gid=2013926010` sin interferir con la versión minorista DUNES APP.
- **Privacidad Total de Datos**: Oculta de cara al cliente los datos administrativos (cantidad de inventario en sheet, peso, flete, reempaque, tipo de cambio y ganancias).
- **Precios Claros para Mayoristas**:
  - **USA ($)**: Inversión en Estados Unidos.
  - **PUESTO EN PERÚ (S/)**: Costo de compra mayorista puesto en destino (proveniente de la columna J).
- **Selector de Unidades por Tarjeta**: Controles interactivos `[-] 1 [+]` para definir la cantidad exacta de perfumes a ordenar.
- **Carrito Generador de Pedidos**: Botón flotante interactivo que totaliza unidades y monto en soles.
- **Envío Directo a WhatsApp**: Formatea y codifica el pedido con el estándar:
  ```text
  PEDIDO MAYORISTA GL EXPRESS

  Cliente: [Nombre]

  1 x 9 Am Dive 3.4 Oz
  Precio: S/90.00
  Subtotal: S/90.00

  3 x Perfume X
  Precio: S/80.00
  Subtotal: S/240.00

  TOTAL UNIDADES: 4
  TOTAL PEDIDO: S/330.00
  ```
- **Buscador & Filtros Avanzados**: Búsqueda en tiempo real, filtros por categoría (*Diseñador* / *Árabes*), género (*Hombre* / *Mujer*) y estado (*Disponibles* / *Agotados* con indicador visual `(AGOTADO)`).
- **Diseño Luxury Mobile-First**: Estética oscura obsidiana con acentos dorados champagne, tipografías Cinzel & Outfit, safe areas para iPhone y funcionamiento 100% offline.

---

## 📂 Estructura del Proyecto

```text
GL-EXPRESS
│── index.html              # Estructura semántica PWA, catálogo mayorista y modal de carrito
│── style.css               # Estilos de ultralujo, tarjetas mayoristas y botón flotante
│── app.js                  # Lógica del catálogo, conexión a pestaña MAYORISTA, carrito y WhatsApp
│── service-worker.js       # Caché offline PWA bajo identificador glexpress-mayorista-v3.0
│── manifest.json           # Manifiesto PWA para instalación móvil como GL EXPRESS MAYORISTA
│── assets/                 # Favicons e iconos de la aplicación
│── tests/
│   ├── mayorista-cart.test.js      # Pruebas de extracción de datos, carrito y WhatsApp
│   ├── validate-mayorista-app.js   # Verificación integral de reglas de negocio y conexión
│   └── catalog-filters.test.js     # Pruebas unitarias de filtros y buscador
└── README.md               # Documentación oficial del proyecto
```

---

## 🧪 Pruebas Automatizadas

Para validar las reglas de negocio, extracción de la pestaña MAYORISTA y formato de WhatsApp:

```bash
node tests/mayorista-cart.test.js
node tests/validate-mayorista-app.js
```
