# 🌙 DUNES PARFUMS APP

> **Cotizador profesional de importación de perfumes USA 🇺🇸 → Perú 🇵🇪 por Courier**

Aplicación móvil web progresiva (**PWA**) diseñada para dueños de tiendas e importadores de perfumería de alta gama. Permite calcular con precisión matemática los costos de flete, reempaque, impuestos/aduanas, costo puesto en Perú por unidad, ganancias netas y márgenes de venta, con capacidad de almacenamiento local y funcionamiento 100% offline.

---

## ✨ Características Principales

- **Fórmulas Exactas de Courier**: Basado estrictamente en la lógica financiera del archivo `COTIZADORAPP.xlsx`.
- **Cálculo en Tiempo Real**: Actualización instantánea de costos y utilidades al escribir en cualquiera de los campos.
- **Diseño de Lujo Mobile-First**: Estética oscura inspirada en perfumerías premium (Dior, Creed, Tom Ford) con fondo negro obsidiana, rojo vino y detalles dorados.
- **Optimizado para iPhone**: Soporte nativo para Safe Area Insets (Notch / Dynamic Island), toques hápticos y pantalla completa.
- **Historial Local Persistente**: Guarda tus cotizaciones en el propio dispositivo mediante `LocalStorage`.
- **Desglose Completo (Modal)**: Visualiza cada variable matemática de la cotización y recárgala en el formulario para editarla cuando desees.
- **100% Offline & PWA**: Funciona sin conexión a internet una vez instalada en el dispositivo.

---

## 📐 Motor de Cálculos (Fórmulas Financieras)

| Métrica                   | Fórmula                                           |
| :------------------------ | :------------------------------------------------ |
| **Total Costo USA**       | `Precio USA × Cantidad`                           |
| **Flete Aéreo**           | `(Peso KG × Cantidad) × Costo Envío por KG`       |
| **Total Gasto Envío**     | `Flete + Reempaque`                               |
| **Precio Total USD**      | `Total Costo USA + Total Gasto Envío`             |
| **Precio Total Soles**    | `Precio Total USD × Tipo de Cambio`               |
| **Costo por Unidad (S/)** | `Precio Total Soles ÷ Cantidad`                   |
| **Ganancia por Unidad**   | `Precio Venta - Costo por Unidad - Costos Extras` |
| **Ganancia Total**        | `Ganancia por Unidad × Cantidad`                  |
| **Margen (%)**            | `(Ganancia por Unidad ÷ Precio Venta) × 100`      |

---

## 📱 Cómo Instalar en iPhone (PWA)

1. Abre la aplicación en **Safari** desde tu iPhone.
2. Presiona el botón **Compartir** (icono de cuadrado con flecha hacia arriba en la barra inferior de Safari).
3. Desplázate hacia abajo y selecciona **"Agregar a pantalla de inicio"** (_Add to Home Screen_).
4. Presiona **"Agregar"** en la esquina superior derecha.
5. ¡Listo! La app aparecerá en tu pantalla de inicio como una aplicación nativa, a pantalla completa y con funcionamiento offline.

---

## 🚀 Publicación Gratuita en GitHub Pages

Para publicar tu aplicación en la web con una URL pública gratuita:

### Paso 1: Subir el proyecto a GitHub

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "Initial version DUNES PARFUMS"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

_(Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` con tus datos de GitHub)_.

### Paso 2: Activar GitHub Pages en el repositorio

1. En GitHub, ingresa a tu repositorio recién subido.
2. Haz clic en la pestaña **Settings** (Configuración).
3. En el menú lateral izquierdo, haz clic en **Pages**.
4. En la sección **Build and deployment**:
   - **Source**: Selecciona `Deploy from a branch`.
   - **Branch**: Selecciona `main` y la carpeta `/(root)`.
5. Haz clic en **Save**.
6. En 1 o 2 minutos, GitHub generará tu enlace público:
   `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

---

## 📂 Estructura del Proyecto

```
DUNES-APP
│── index.html              # Estructura semántica y meta tags iOS PWA
│── style.css               # Estilos de lujo, modo oscuro y responsive
│── app.js                  # Lógica de interfaz, historial y eventos
│── js/
│   └── calculator.js       # Motor matemático puro con tests unitarios
│── service-worker.js       # Caché offline compatible con GitHub Pages
│── sw.js                   # Proxy de retrocompatibilidad para Service Worker
│── manifest.json           # Manifiesto PWA para instalación móvil
│── assets/                 # Identidad visual e iconos PWA oficiales
│   ├── logocotizador.png   # Logo oficial DUNES PARFUMS (512x512)
│   ├── favicon.ico         # Favicon multi-resolución para navegador
│   ├── favicon-32x32.png   # Favicon estándar para pestañas
│   ├── icon-192.png        # Icono PWA para móvil (192px)
│   ├── icon-512.png        # Icono PWA para móvil (512px)
│   ├── icon-maskable-512.png # Icono seguro para Android
│   └── apple-touch-icon.png# Icono de pantalla de inicio para iOS
│── tests/
│   └── calculator.test.js  # Suite de pruebas unitarias automatizadas
│── .gitignore              # Exclusión de archivos temporales
└── README.md               # Documentación oficial
```

---

## 🧪 Pruebas Unitarias

Para verificar la exactitud de las fórmulas matemáticas:

```bash
node tests/calculator.test.js
```
