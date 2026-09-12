/**
 * ==========================================================================
 * GL EXPRESS — Plataforma Oficial del Catálogo Mayorista
 * Versión Exclusiva Mayorista 3.0
 * 
 * Reglas de Negocio:
 * 1. Lee únicamente la pestaña MAYORISTA (gid=2013926010).
 * 2. Datos visibles: Imagen, Producto, Precio USA ($), PUESTO EN PERÚ (S/).
 * 3. Columna J ("Costo Perú") se muestra estrictamente como "PUESTO EN PERÚ".
 * 4. Oculta al cliente: Cantidad, Peso KG, Flete, Reempaque, TC, Ganancias.
 * 5. Carrito como generador de pedido estructurado para WhatsApp.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Claves de Almacenamiento Local (Aisladas para GL EXPRESS)
  const STORAGE_KEYS = {
    SHEETS_URL: 'glexpress_google_sheets_url_v1',
    CATALOGO_CACHE: 'glexpress_catalogo_cache_v1',
    CATALOGO_LAST_SYNC: 'glexpress_catalogo_last_sync_v1',
    CARRITO: 'glexpress_carrito_v1',
    CLIENTE_NOMBRE: 'glexpress_cliente_nombre_v1'
  };

  // URL del Google Sheets público oficial maestro - Pestaña MAYORISTA (gid=2013926010)
  const DEFAULT_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMxWTEsUiAmYSnu8ra29ku79UTtObn2EnphEEabBODeDZDdXUVcHqI85RnXSvSHBuRthVUlbsWnCy_/pub?gid=2013926010&single=true&output=csv';

  // Catálogo base de respaldo offline para mayoristas
  const CATALOGO_DEFAULT = [
    {
      id: 'gl-1',
      producto: '9 Am Dive 3.4 Oz Edp Unisex',
      precioUSA: 19.71,
      puestoPeru: 90.00,
      categoria: 'Árabes',
      genero: 'Unisex',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-2',
      producto: 'Club de Nuit Intense Man EDT 105ml',
      precioUSA: 28.00,
      puestoPeru: 115.00,
      categoria: 'Árabes',
      genero: 'Hombre',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-3',
      producto: 'Khamrah Lattafa EDP 100ml',
      precioUSA: 25.00,
      puestoPeru: 112.50,
      categoria: 'Árabes',
      genero: 'Unisex',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-4',
      producto: 'Dior Sauvage EDT 100ml',
      precioUSA: 19.95,
      puestoPeru: 86.50,
      categoria: 'Diseñador',
      genero: 'Hombre',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-5',
      producto: 'Bleu de Chanel EDP 100ml',
      precioUSA: 115.00,
      puestoPeru: 415.50,
      categoria: 'Diseñador',
      genero: 'Hombre',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-6',
      producto: 'Versace Eros Flame EDP 100ml',
      precioUSA: 58.00,
      puestoPeru: 220.00,
      categoria: 'Diseñador',
      genero: 'Hombre',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-7',
      producto: 'Afnan 9PM EDP 100ml',
      precioUSA: 26.50,
      puestoPeru: 114.50,
      categoria: 'Árabes',
      genero: 'Hombre',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-8',
      producto: 'Yara Lattafa EDP 100ml',
      precioUSA: 24.00,
      puestoPeru: 108.50,
      categoria: 'Árabes',
      genero: 'Mujer',
      imagen: '',
      estadoCatalogo: 'Disponible',
      esAgotado: false
    },
    {
      id: 'gl-9',
      producto: 'Good Girl Carolina Herrera EDP 80ml',
      precioUSA: 89.00,
      puestoPeru: 325.00,
      categoria: 'Diseñador',
      genero: 'Mujer',
      imagen: '',
      estadoCatalogo: 'No disponible',
      esAgotado: true
    }
  ];

  // Reglas de negocio y configuración mayorista
  const MIN_UNIDADES_MAYORISTA = 6;
  const WHATSAPP_NUMERO = '51962247719';

  // Estado en memoria
  let catalogoProductos = [];
  let carrito = [];
  let localCardQuantities = {}; // { [productId]: number }
  let catalogoCargando = false;
  let catalogoImageObserver = null;
  let filtroCategoriaActivo = 'todos';
  let filtroGeneroActivo = 'todos';
  let filtroEstadoActivo = 'todos';

  // Referencias a elementos del DOM
  const elements = {
    // Catálogo
    busqueda: document.getElementById('catalogo-busqueda'),
    btnLimpiar: document.getElementById('catalogo-btn-limpiar-busqueda'),
    contador: document.getElementById('catalogo-contador'),
    contadorResultados: document.getElementById('catalogo-contador-resultados'),
    lista: document.getElementById('catalogo-lista'),
    empty: document.getElementById('catalogo-empty'),
    emptyTitle: document.getElementById('catalogo-empty-title'),
    emptyDesc: document.getElementById('catalogo-empty-desc'),
    btnSync: document.getElementById('btn-sincronizar-catalogo'),
    syncDot: document.getElementById('catalogo-sync-dot'),
    syncText: document.getElementById('catalogo-sync-text'),

    // Filtros
    btnToggleFiltros: document.getElementById('btn-toggle-filtros'),
    panelFiltros: document.getElementById('catalog-filters-collapsible'),
    toggleFiltrosArrow: document.getElementById('toggle-filtros-arrow'),
    toggleFiltrosDot: document.getElementById('toggle-filtros-dot'),

    // Header y Carrito Flotante
    headerCartBtn: document.getElementById('header-cart-btn'),
    headerCartCount: document.getElementById('header-cart-count'),
    floatingCartBar: document.getElementById('floating-cart-bar'),
    btnAbrirCarritoFlotante: document.getElementById('btn-abrir-carrito-flotante'),
    floatingCartCount: document.getElementById('floating-cart-count'),
    floatingCartTotal: document.getElementById('floating-cart-total'),

    // Modal Carrito
    modalCarrito: document.getElementById('modal-carrito'),
    btnCerrarCarrito: document.getElementById('btn-cerrar-carrito'),
    btnSeguirComprando: document.getElementById('btn-seguir-comprando'),
    btnVaciarCarrito: document.getElementById('btn-vaciar-carrito'),
    btnEnviarWhatsapp: document.getElementById('btn-enviar-whatsapp'),
    carritoItemsLista: document.getElementById('carrito-lista-items'),
    carritoVacio: document.getElementById('carrito-vacio'),
    carritoResumenBox: document.getElementById('carrito-resumen-box'),
    cartTotalUnidades: document.getElementById('cart-total-unidades'),
    cartTotalSoles: document.getElementById('cart-total-soles'),
    cartStockWarning: document.getElementById('cart-stock-warning'),
    cartMinWarning: document.getElementById('cart-min-warning'),
    cartMinRemainingText: document.getElementById('cart-min-remaining-text'),
    inputClienteNombre: document.getElementById('input-cliente-nombre'),

    // Modal Confirmar Vaciar
    modalConfirmarVaciar: document.getElementById('modal-confirmar-vaciar'),
    btnCerrarConfirmarVaciar: document.getElementById('btn-cerrar-confirmar-vaciar'),
    btnCancelarVaciar: document.getElementById('btn-cancelar-vaciar'),
    btnConfirmarVaciar: document.getElementById('btn-confirmar-vaciar'),

    // Toast y Estado PWA
    toastContainer: document.getElementById('toast-container'),
    pwaStatus: document.getElementById('pwa-status')
  };

  // Formateadores
  const formatUSD = (num) => `$ ${Number(num || 0).toFixed(2)}`;
  const formatPEN = (num) => `S/ ${Number(num || 0).toFixed(2)}`;

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'success') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.4, 0, 1, 1) forwards';
      setTimeout(() => toast.remove(), 320);
    }, 2800);
  }

  /**
   * ========================================================================
   * GESTOR DEL CARRITO MAYORISTA & GENERADOR DE PEDIDOS
   * ========================================================================
   */

  function cargarCarrito() {
    try {
      const guardado = localStorage.getItem(STORAGE_KEYS.CARRITO);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed)) {
          carrito = parsed;
        }
      }
    } catch (e) {
      console.warn('Error al leer carrito:', e);
      carrito = [];
    }

    try {
      const clienteGuardado = localStorage.getItem(STORAGE_KEYS.CLIENTE_NOMBRE);
      if (clienteGuardado && elements.inputClienteNombre) {
        elements.inputClienteNombre.value = clienteGuardado;
      }
    } catch (e) {
      // Ignore
    }

    actualizarUIContadoresCarrito();
  }

  function guardarCarrito() {
    try {
      localStorage.setItem(STORAGE_KEYS.CARRITO, JSON.stringify(carrito));
    } catch (e) {
      console.warn('Error al guardar carrito:', e);
    }
    actualizarUIContadoresCarrito();
  }

  function verificarEstadoProductoEnCatalogo(item) {
    if (!catalogoProductos || catalogoProductos.length === 0) {
      return { existe: true, esAgotado: false };
    }

    const itemNombreNorm = normalizarClaveColumna(item.producto);
    const prodCatalogo = catalogoProductos.find(p => normalizarClaveColumna(p.producto) === itemNombreNorm) ||
      catalogoProductos.find(p => p.id === item.id);

    if (!prodCatalogo) {
      return { existe: false, esAgotado: true, motivo: 'eliminado' };
    }

    return {
      existe: true,
      esAgotado: !!prodCatalogo.esAgotado,
      productoCatalogo: prodCatalogo
    };
  }

  function validarProductosDisponibles() {
    const agotados = [];
    for (const item of carrito) {
      const estado = verificarEstadoProductoEnCatalogo(item);
      if (!estado.existe || estado.esAgotado) {
        agotados.push(item);
      }
    }
    return {
      esValido: agotados.length === 0,
      agotados
    };
  }

  function obtenerTotalesCarrito() {
    let totalUnidadesDisponibles = 0;
    let totalPedidoDisponible = 0;
    let totalUnidadesBruto = 0;
    let totalPedidoBruto = 0;
    let hayAgotados = false;
    let cantidadAgotados = 0;

    for (const item of carrito) {
      const estado = verificarEstadoProductoEnCatalogo(item);
      const estaAgotado = !estado.existe || estado.esAgotado;

      totalUnidadesBruto += item.cantidad;
      totalPedidoBruto += item.subtotal;

      // REGLA: Los productos agotados NO deben sumar al total unidades ni al total pedido
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

  function actualizarUIContadoresCarrito() {
    const { totalUnidades, totalPedido, totalUnidadesBruto, hayAgotados } = obtenerTotalesCarrito();

    // Contador en cabecera
    if (elements.headerCartCount) {
      elements.headerCartCount.textContent = totalUnidades;
    }

    // Barra flotante inferior
    if (elements.floatingCartBar) {
      if (totalUnidadesBruto > 0 || carrito.length > 0) {
        elements.floatingCartBar.classList.remove('is-hidden');
      } else {
        elements.floatingCartBar.classList.add('is-hidden');
      }
    }

    if (elements.floatingCartCount) {
      elements.floatingCartCount.textContent = totalUnidades;
    }

    if (elements.floatingCartTotal) {
      elements.floatingCartTotal.textContent = formatPEN(totalPedido);
    }

    // Totales en modal
    if (elements.cartTotalUnidades) {
      elements.cartTotalUnidades.textContent = totalUnidades;
    }

    if (elements.cartTotalSoles) {
      elements.cartTotalSoles.textContent = formatPEN(totalPedido);
    }

    // REGLA 1: Si existe al menos 1 producto agotado -> Bloqueo prioritario
    if (hayAgotados) {
      if (elements.cartStockWarning) {
        elements.cartStockWarning.style.display = 'flex';
      }
      if (elements.cartMinWarning) {
        elements.cartMinWarning.style.display = 'none';
      }
      if (elements.btnEnviarWhatsapp) {
        elements.btnEnviarWhatsapp.disabled = true;
        elements.btnEnviarWhatsapp.classList.add('is-disabled');
        elements.btnEnviarWhatsapp.setAttribute('aria-disabled', 'true');
        elements.btnEnviarWhatsapp.innerHTML = `
          <span class="whatsapp-btn-icon">🔒</span>
          <span>ACTUALIZA TU PEDIDO</span>
        `;
      }
      return;
    }

    // Si no hay productos agotados, ocultar advertencia de stock
    if (elements.cartStockWarning) {
      elements.cartStockWarning.style.display = 'none';
    }

    // REGLA 2: Validación de pedido mínimo mayorista (6 unidades disponibles)
    const faltanUnidades = MIN_UNIDADES_MAYORISTA - totalUnidades;

    if (totalUnidades < MIN_UNIDADES_MAYORISTA) {
      // Estado Bloqueado: menos de 6 unidades
      if (elements.cartMinWarning) {
        elements.cartMinWarning.style.display = carrito.length > 0 ? 'flex' : 'none';
      }
      if (elements.cartMinRemainingText) {
        elements.cartMinRemainingText.textContent = `Te faltan ${faltanUnidades} unidad${faltanUnidades === 1 ? '' : 'es'} para confirmar.`;
      }
      if (elements.btnEnviarWhatsapp) {
        elements.btnEnviarWhatsapp.disabled = true;
        elements.btnEnviarWhatsapp.classList.add('is-disabled');
        elements.btnEnviarWhatsapp.setAttribute('aria-disabled', 'true');
        elements.btnEnviarWhatsapp.innerHTML = `
          <span class="whatsapp-btn-icon">🔒</span>
          <span>PEDIDO MÍNIMO: 6 UNIDADES</span>
        `;
      }
    } else {
      // Estado Habilitado: 6 o más unidades disponibles
      if (elements.cartMinWarning) {
        elements.cartMinWarning.style.display = 'none';
      }
      if (elements.btnEnviarWhatsapp) {
        elements.btnEnviarWhatsapp.disabled = false;
        elements.btnEnviarWhatsapp.classList.remove('is-disabled');
        elements.btnEnviarWhatsapp.removeAttribute('aria-disabled');
        elements.btnEnviarWhatsapp.innerHTML = `
          <span class="whatsapp-btn-icon">📲</span>
          <span>ENVIAR PEDIDO POR WHATSAPP</span>
        `;
      }
    }
  }

  function agregarAlPedido(productoId) {
    const producto = catalogoProductos.find(p => p.id === productoId);
    if (!producto || producto.esAgotado) {
      showToast('Este producto se encuentra agotado', 'info');
      return;
    }

    const cantidadSeleccionada = localCardQuantities[productoId] || 1;
    const itemExistente = carrito.find(i => i.id === productoId);

    if (itemExistente) {
      itemExistente.cantidad += cantidadSeleccionada;
      itemExistente.subtotal = Math.round((itemExistente.cantidad * itemExistente.puestoPeru + Number.EPSILON) * 100) / 100;
    } else {
      carrito.push({
        id: producto.id,
        producto: producto.producto,
        precioUSA: producto.precioUSA,
        puestoPeru: producto.puestoPeru,
        imagen: producto.imagen,
        cantidad: cantidadSeleccionada,
        subtotal: Math.round((cantidadSeleccionada * producto.puestoPeru + Number.EPSILON) * 100) / 100
      });
    }

    // Reiniciar selector de la tarjeta a 1
    localCardQuantities[productoId] = 1;
    const stepperValEl = document.getElementById(`stepper-val-${productoId}`);
    if (stepperValEl) {
      stepperValEl.textContent = '1';
    }

    guardarCarrito();
    showToast(`Agregado: ${cantidadSeleccionada}x ${producto.producto}`);
  }

  function modificarCantidadEnCarrito(productoId, delta) {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
      eliminarItemDelCarrito(productoId);
    } else {
      item.subtotal = Math.round((item.cantidad * item.puestoPeru + Number.EPSILON) * 100) / 100;
      guardarCarrito();
      renderizarModalCarrito();
    }
  }

  function eliminarItemDelCarrito(productoId) {
    carrito = carrito.filter(i => i.id !== productoId);
    guardarCarrito();
    renderizarModalCarrito();
    showToast('Producto retirado del pedido', 'info');
  }

  function solicitarVaciarPedido() {
    if (carrito.length === 0) return;
    abrirModalConfirmarVaciar();
  }

  function abrirModalConfirmarVaciar() {
    if (!elements.modalConfirmarVaciar) return;
    elements.modalConfirmarVaciar.classList.add('is-active');
    elements.modalConfirmarVaciar.setAttribute('aria-hidden', 'false');
  }

  function cerrarModalConfirmarVaciar() {
    if (!elements.modalConfirmarVaciar) return;
    elements.modalConfirmarVaciar.classList.remove('is-active');
    elements.modalConfirmarVaciar.setAttribute('aria-hidden', 'true');
  }

  function vaciarPedido() {
    if (carrito.length === 0) return;
    carrito = [];
    guardarCarrito();
    renderizarModalCarrito();
    cerrarModalConfirmarVaciar();
    showToast('Pedido vaciado', 'info');
  }

  function renderizarModalCarrito() {
    if (!elements.carritoItemsLista) return;

    elements.carritoItemsLista.innerHTML = '';
    const hayItems = carrito.length > 0;

    if (!hayItems) {
      if (elements.carritoVacio) elements.carritoVacio.style.display = 'flex';
      if (elements.carritoResumenBox) elements.carritoResumenBox.style.display = 'none';
      if (elements.cartStockWarning) elements.cartStockWarning.style.display = 'none';
      if (elements.cartMinWarning) elements.cartMinWarning.style.display = 'none';
      if (elements.btnEnviarWhatsapp) elements.btnEnviarWhatsapp.style.display = 'none';
      return;
    }

    if (elements.carritoVacio) elements.carritoVacio.style.display = 'none';
    if (elements.carritoResumenBox) elements.carritoResumenBox.style.display = 'flex';
    if (elements.btnEnviarWhatsapp) elements.btnEnviarWhatsapp.style.display = 'flex';

    carrito.forEach(item => {
      const row = document.createElement('div');
      row.setAttribute('data-id', item.id);

      const estado = verificarEstadoProductoEnCatalogo(item);
      const estaAgotado = !estado.existe || estado.esAgotado;
      const tieneImg = item.imagen && (item.imagen.startsWith('http://') || item.imagen.startsWith('https://'));

      if (estaAgotado) {
        row.className = 'cart-item-row is-item-agotado';
        row.innerHTML = `
          <div class="cart-item-thumb">
            ${tieneImg ? `<img src="${escapeHTML(item.imagen)}" alt="${escapeHTML(item.producto)}" onerror="this.src=''; this.style.display='none';">` : '<span style="font-size: 1.2rem;">🧴</span>'}
          </div>

          <div class="cart-item-info cart-item-info-agotado">
            <span class="cart-item-name cart-item-name-agotado" title="${escapeHTML(item.producto)}">
              <span class="agotado-dot">🔴</span> ${escapeHTML(item.producto)}
            </span>
            <span class="cart-item-badge-agotado">AGOTADO</span>
            <span class="cart-item-notice-agotado">Este producto ya no está disponible</span>
          </div>

          <div class="cart-item-controls cart-item-controls-agotado">
            <button type="button" class="btn-cart-delete-agotado btn-cart-delete" data-id="${item.id}" title="Eliminar producto agotado" aria-label="Eliminar producto">
              🗑️ Eliminar
            </button>
          </div>
        `;
      } else {
        row.className = 'cart-item-row';
        row.innerHTML = `
          <div class="cart-item-thumb">
            ${tieneImg ? `<img src="${escapeHTML(item.imagen)}" alt="${escapeHTML(item.producto)}" onerror="this.src=''; this.style.display='none';">` : '<span style="font-size: 1.2rem;">🧴</span>'}
          </div>

          <div class="cart-item-info">
            <span class="cart-item-name" title="${escapeHTML(item.producto)}">${escapeHTML(item.producto)}</span>
            <span class="cart-item-unit-price">Puesto en Perú: ${formatPEN(item.puestoPeru)}</span>
          </div>

          <div class="cart-item-controls">
            <div class="cart-item-stepper">
              <button type="button" class="btn-cart-minus" data-id="${item.id}" aria-label="Restar 1">-</button>
              <span>${item.cantidad}</span>
              <button type="button" class="btn-cart-plus" data-id="${item.id}" aria-label="Sumar 1">+</button>
            </div>

            <span class="cart-item-subtotal">${formatPEN(item.subtotal)}</span>

            <button type="button" class="cart-item-delete btn-cart-delete" data-id="${item.id}" title="Eliminar del pedido" aria-label="Eliminar producto">🗑️</button>
          </div>
        `;
      }

      elements.carritoItemsLista.appendChild(row);
    });

    // Eventos dentro del modal
    elements.carritoItemsLista.querySelectorAll('.btn-cart-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        modificarCantidadEnCarrito(id, -1);
      });
    });

    elements.carritoItemsLista.querySelectorAll('.btn-cart-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        modificarCantidadEnCarrito(id, 1);
      });
    });

    elements.carritoItemsLista.querySelectorAll('.btn-cart-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        eliminarItemDelCarrito(id);
      });
    });

    actualizarUIContadoresCarrito();
  }

  function abrirModalCarrito() {
    if (!elements.modalCarrito) return;
    renderizarModalCarrito();
    elements.modalCarrito.classList.add('is-active');
    elements.modalCarrito.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function cerrarModalCarrito() {
    if (!elements.modalCarrito) return;
    elements.modalCarrito.classList.remove('is-active');
    elements.modalCarrito.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * Generación y Envío del Pedido a WhatsApp
   * Formato oficial solicitado:
   * 
   * PEDIDO MAYORISTA GL EXPRESS
   * 
   * Cliente: [Nombre]
   * 
   * [cant] x [Producto]
   * Precio: S/[precio]
   * Subtotal: S/[subtotal]
   * 
   * TOTAL UNIDADES: [total]
   * TOTAL PEDIDO: S/[total]
   */
  function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
      showToast('Tu pedido está vacío', 'info');
      return;
    }

    // Regla de negocio y seguridad 1: Validación de disponibilidad de productos
    const validacionStock = validarProductosDisponibles();
    if (!validacionStock.esValido) {
      showToast('⚠️ Algunos productos de tu pedido ya no están disponibles. Elimínalos para continuar.', 'error');
      renderizarModalCarrito();
      return;
    }

    const { totalUnidades, totalPedido } = obtenerTotalesCarrito();

    // Regla de negocio y seguridad 2: Validación de pedido mínimo mayorista (6 unidades disponibles)
    if (totalUnidades < MIN_UNIDADES_MAYORISTA) {
      const faltan = MIN_UNIDADES_MAYORISTA - totalUnidades;
      showToast(`Pedido mínimo mayorista: 6 unidades. Te faltan ${faltan} para confirmar.`, 'error');
      if (elements.cartMinWarning) elements.cartMinWarning.style.display = 'flex';
      return;
    }

    const nombreCliente = elements.inputClienteNombre ? elements.inputClienteNombre.value.trim() : '';

    // Guardar nombre en memoria
    if (elements.inputClienteNombre) {
      try {
        localStorage.setItem(STORAGE_KEYS.CLIENTE_NOMBRE, nombreCliente);
      } catch (e) {}
    }

    let mensaje = 'PEDIDO MAYORISTA GL EXPRESS\n\n';
    mensaje += `Cliente: ${nombreCliente}\n\n`;

    carrito.forEach(item => {
      mensaje += `${item.cantidad} x ${item.producto}\n`;
      mensaje += `Precio: S/${item.puestoPeru.toFixed(2)}\n`;
      mensaje += `Subtotal: S/${item.subtotal.toFixed(2)}\n\n`;
    });

    mensaje += `TOTAL UNIDADES: ${totalUnidades}\n`;
    mensaje += `TOTAL PEDIDO: S/${totalPedido.toFixed(2)}`;

    const urlWhatsApp = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMERO}&text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  }

  /**
   * ========================================================================
   * PARSER CSV Y MAPEO ESPECÍFICO DE LA PESTAÑA MAYORISTA
   * Estructura oficial (Columnas A - L):
   * A: Producto
   * B: Precio USA ($)
   * C: Cantidad (Oculto al cliente)
   * D: Categoría
   * E: Género
   * F: Peso KG (Oculto)
   * G: Flete x KG (Oculto)
   * H: Reempaque (Oculto)
   * I: Precio Dólar (T.C) (Oculto)
   * J: Costo Perú -> Se mapea a puestoPeru ("PUESTO EN PERÚ")
   * K: imagen
   * L: Estado catálogo
   * ========================================================================
   */

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

  function convertirFilasACatalogo(rows) {
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
      // La columna J es "Costo Perú" o "Costo Perú (S/.)", que en GL EXPRESS es el precio PUESTO EN PERÚ:
      costoPeru: encontrarIndice(['costoperu', 'costoperus', 'costo_peru', 'costopuestoperu', 'puestoperu']),
      imagen: encontrarIndice(['imagen', 'img', 'foto', 'image', 'urlimagen', 'imagenurl']),
      estadoCatalogo: encontrarIndice(['estadocatalogo', 'estado_catalogo', 'estado', 'status', 'disponibilidad'])
    };

    // Respaldo estricto por posición A-L (0 a 11)
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

      // Detección de disponibilidad
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
        // DATO MAYORISTA: Mapeado exclusivamente como puestoPeru (S/)
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

  function construirURLGoogleSheetCSV(input) {
    const raw = (input && input.trim()) ? input.trim() : DEFAULT_SHEETS_CSV_URL;
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}_t=${Date.now()}`;
  }

  /**
   * ========================================================================
   * RENDERIZADO DEL CATÁLOGO MAYORISTA & CONTADORES
   * ========================================================================
   */

  function actualizarContadorInventarioGeneral() {
    if (!elements.contador) return;

    let disponiblesCount = 0;
    let agotadosCount = 0;
    const baseProductos = (catalogoProductos && catalogoProductos.length > 0) ? catalogoProductos : CATALOGO_DEFAULT;

    for (let i = 0; i < baseProductos.length; i++) {
      const p = baseProductos[i];
      if (p.esAgotado) {
        agotadosCount++;
      } else {
        disponiblesCount++;
      }
    }

    elements.contador.innerHTML = `
      <span class="catalog-stat-item stat-disp">🟢 <strong>${disponiblesCount}</strong> DISPONIBLES</span>
      <span class="catalog-stat-sep">•</span>
      <span class="catalog-stat-item stat-agot">🔴 <strong>${agotadosCount}</strong> AGOTADOS</span>
    `;
  }

  function renderizarCatalogo(productosParaMostrar, terminoBusqueda = '') {
    if (!elements.lista) return;

    elements.lista.innerHTML = '';
    const total = productosParaMostrar.length;

    actualizarContadorInventarioGeneral();

    if (elements.contadorResultados) {
      elements.contadorResultados.textContent = (total === 1)
        ? '1 perfume encontrado'
        : `${total} perfumes encontrados`;
    }

    if (total === 0) {
      elements.empty.style.display = 'flex';
      if (terminoBusqueda) {
        elements.emptyTitle.textContent = `No se encontraron perfumes para "${terminoBusqueda}"`;
        elements.emptyDesc.textContent = 'Intenta buscando por otra marca o ajusta los filtros seleccionados.';
      } else if (filtroCategoriaActivo !== 'todos' || filtroGeneroActivo !== 'todos' || filtroEstadoActivo !== 'todos') {
        elements.emptyTitle.textContent = 'No hay perfumes con los filtros seleccionados';
        elements.emptyDesc.textContent = 'Prueba seleccionando "Todos" en categoría, género o estado.';
      } else {
        elements.emptyTitle.textContent = 'Catálogo vacío';
        elements.emptyDesc.textContent = 'No hay perfumes disponibles en la pestaña MAYORISTA.';
      }
      return;
    }

    elements.empty.style.display = 'none';

    productosParaMostrar.forEach(item => {
      const card = document.createElement('article');
      card.className = item.esAgotado ? 'wholesale-card is-agotado' : 'wholesale-card';
      card.setAttribute('data-id', item.id);

      const tieneImagen = item.imagen && (item.imagen.startsWith('http://') || item.imagen.startsWith('https://'));
      const cantActual = localCardQuantities[item.id] || 1;

      card.innerHTML = `
        <!-- Imagen Centrada -->
        <div class="wholesale-img-wrapper">
          ${tieneImagen ? `
            <div class="card-thumb-placeholder">
              <span class="card-thumb-shimmer"></span>
              <span class="card-thumb-fallback-icon">🧴</span>
            </div>
            <img data-src="${escapeHTML(item.imagen)}" alt="${escapeHTML(item.producto)}" class="wholesale-img" onerror="this.style.display='none'; if(this.previousElementSibling) this.previousElementSibling.classList.add('is-failed');">
          ` : `
            <span class="card-thumb-fallback-icon" style="opacity: 0.65; font-size: 2.2rem;">🧴</span>
          `}
        </div>

        <!-- Título del Perfume -->
        <div class="wholesale-title-wrapper">
          <h3 class="wholesale-title">
            ${escapeHTML(item.producto)}
            ${item.esAgotado ? '<span class="card-agotado-badge">(AGOTADO)</span>' : ''}
          </h3>
        </div>

        <!-- Bloque de Precio Mayorista (Únicamente PUESTO EN PERÚ) -->
        <div class="wholesale-pricing-block">
          <span class="wholesale-price-lbl">PUESTO EN PERÚ</span>
          <span class="wholesale-price-peru">${formatPEN(item.puestoPeru)}</span>
        </div>

        <!-- Fila de Acciones: Selector de Cantidad [-] 1 [+] y Botón Agregar -->
        <div class="wholesale-actions-row">
          <div class="wholesale-stepper">
            <button type="button" class="stepper-btn btn-card-minus" data-id="${item.id}" aria-label="Disminuir cantidad">-</button>
            <span class="stepper-val" id="stepper-val-${item.id}">${cantActual}</span>
            <button type="button" class="stepper-btn btn-card-plus" data-id="${item.id}" aria-label="Aumentar cantidad">+</button>
          </div>

          <button type="button" class="btn-add-wholesale btn-card-add" data-id="${item.id}" aria-label="Agregar al pedido">
            <span class="btn-add-short">🛒 Agregar</span>
            <span class="btn-add-full">🛒 Agregar al pedido</span>
          </button>
        </div>
      `;

      elements.lista.appendChild(card);
    });

    // Conectar eventos de los selectores [-] 1 [+]
    elements.lista.querySelectorAll('.btn-card-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        let current = localCardQuantities[id] || 1;
        if (current > 1) {
          current--;
          localCardQuantities[id] = current;
          const valEl = document.getElementById(`stepper-val-${id}`);
          if (valEl) valEl.textContent = current;
        }
      });
    });

    elements.lista.querySelectorAll('.btn-card-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        let current = localCardQuantities[id] || 1;
        current++;
        localCardQuantities[id] = current;
        const valEl = document.getElementById(`stepper-val-${id}`);
        if (valEl) valEl.textContent = current;
      });
    });

    // Conectar eventos del botón Agregar al pedido
    elements.lista.querySelectorAll('.btn-card-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        agregarAlPedido(id);
      });
    });

    iniciarLazyLoadingCatalogo();
  }

  function iniciarLazyLoadingCatalogo() {
    if (catalogoImageObserver) {
      catalogoImageObserver.disconnect();
      catalogoImageObserver = null;
    }

    if (!elements.lista) return;

    const lazyImages = elements.lista.querySelectorAll('img.wholesale-img[data-src]');
    if (!lazyImages || lazyImages.length === 0) return;

    if ('IntersectionObserver' in window) {
      catalogoImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            cargarImagenLazy(img);
            observer.unobserve(img);
          }
        });
      }, {
        root: null,
        rootMargin: '120px 0px',
        threshold: 0.01
      });

      lazyImages.forEach(img => catalogoImageObserver.observe(img));
    } else {
      lazyImages.forEach(img => cargarImagenLazy(img));
    }
  }

  function cargarImagenLazy(img) {
    const src = img.getAttribute('data-src');
    if (!src) return;
    img.removeAttribute('data-src');

    const wrapper = img.closest('.wholesale-img-wrapper');
    const placeholder = wrapper ? wrapper.querySelector('.card-thumb-placeholder') : null;

    const preloader = new Image();
    preloader.onload = () => {
      img.src = src;
      img.classList.add('is-loaded');
      if (placeholder) placeholder.classList.add('is-hidden');
    };
    preloader.onerror = () => {
      img.style.display = 'none';
      if (placeholder) placeholder.classList.add('is-failed');
    };
    preloader.src = src;
  }

  /**
   * ========================================================================
   * FILTRADO EN TIEMPO REAL (Buscador, Categoría, Género, Estado)
   * ========================================================================
   */

  function filtrarCatalogo() {
    const termino = elements.busqueda ? elements.busqueda.value.trim() : '';

    if (elements.btnLimpiar) {
      elements.btnLimpiar.style.display = termino ? 'flex' : 'none';
    }

    const normalizar = (s) => (s || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const terminoNorm = normalizar(termino);
    const catFiltroNorm = normalizar(filtroCategoriaActivo);
    const genFiltroNorm = normalizar(filtroGeneroActivo);
    const estFiltroNorm = normalizar(filtroEstadoActivo);

    const filtrados = catalogoProductos.filter(item => {
      // 1. Buscador por nombre
      if (terminoNorm) {
        const nombreNorm = normalizar(item.producto);
        if (!nombreNorm.includes(terminoNorm)) return false;
      }

      // 2. Filtro Categoría
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

      // 3. Filtro Género (Hombre incluye Unisex, Mujer incluye Unisex)
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

      // 4. Filtro Estado
      if (estFiltroNorm && estFiltroNorm !== 'todos') {
        if (estFiltroNorm === 'disponibles' && item.esAgotado) return false;
        if (estFiltroNorm === 'agotados' && !item.esAgotado) return false;
      }

      return true;
    });

    renderizarCatalogo(filtrados, termino);
  }

  function actualizarIndicadorFiltrosActivos() {
    const hayFiltrosActivos = (filtroCategoriaActivo !== 'todos') || (filtroGeneroActivo !== 'todos') || (filtroEstadoActivo !== 'todos');
    if (elements.toggleFiltrosDot) {
      elements.toggleFiltrosDot.style.display = hayFiltrosActivos ? 'inline-block' : 'none';
    }
    if (elements.btnToggleFiltros) {
      elements.btnToggleFiltros.classList.toggle('has-active-filters', hayFiltrosActivos);
    }
  }

  /**
   * ========================================================================
   * CARGA Y SINCRONIZACIÓN CON PESTAÑA MAYORISTA GOOGLE SHEETS
   * ========================================================================
   */

  async function cargarCatalogo(forzarRed = false) {
    if (catalogoCargando) return;
    catalogoCargando = true;

    if (elements.btnSync) elements.btnSync.classList.add('is-spinning');
    if (elements.syncDot) elements.syncDot.className = 'sync-status-dot is-syncing';
    if (elements.syncText) elements.syncText.textContent = 'Consultando pestaña MAYORISTA...';

    // 1. Cargar caché previo si no se fuerza red
    if (!forzarRed) {
      try {
        const cacheGuardada = localStorage.getItem(STORAGE_KEYS.CATALOGO_CACHE);
        if (cacheGuardada) {
          const parsed = JSON.parse(cacheGuardada);
          if (Array.isArray(parsed) && parsed.length > 0) {
            catalogoProductos = parsed;
            renderizarCatalogo(catalogoProductos);
            const ultima = localStorage.getItem(STORAGE_KEYS.CATALOGO_LAST_SYNC) || 'Previa';
            if (elements.syncDot) elements.syncDot.className = 'sync-status-dot';
            if (elements.syncText) elements.syncText.textContent = `Sincronizado (${ultima})`;
          }
        }
      } catch (e) {
        console.warn('Error al leer caché local:', e);
      }
    }

    // 2. URL de conexión a la pestaña MAYORISTA
    const sheetsUrlConfigurada = localStorage.getItem(STORAGE_KEYS.SHEETS_URL);
    const urlCSV = construirURLGoogleSheetCSV(sheetsUrlConfigurada);

    // 3. Petición en vivo
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(urlCSV, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const csvText = await response.text();
      const rows = parsearCSV(csvText);
      const items = convertirFilasACatalogo(rows);

      if (items.length > 0) {
        catalogoProductos = items;
        try {
          localStorage.setItem(STORAGE_KEYS.CATALOGO_CACHE, JSON.stringify(items));
          const horaSync = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
          localStorage.setItem(STORAGE_KEYS.CATALOGO_LAST_SYNC, horaSync);
          if (elements.syncDot) elements.syncDot.className = 'sync-status-dot';
          if (elements.syncText) elements.syncText.textContent = `Sincronizado (${horaSync})`;
        } catch (e) {}

        renderizarCatalogo(catalogoProductos);
        actualizarUIContadoresCarrito();
        if (elements.modalCarrito && elements.modalCarrito.classList.contains('is-active')) {
          renderizarModalCarrito();
        }
        showToast(`Catálogo sincronizado: ${items.length} perfumes cargados`);
      } else {
        // Si la pestaña aún no tiene filas de datos, mantener el respaldo activo
        if (catalogoProductos.length === 0) {
          catalogoProductos = [...CATALOGO_DEFAULT];
          renderizarCatalogo(catalogoProductos);
        }
        if (elements.syncDot) elements.syncDot.className = 'sync-status-dot';
        if (elements.syncText) elements.syncText.textContent = 'Pestaña MAYORISTA conectada (0 filas)';
      }
    } catch (err) {
      console.warn('[GL EXPRESS] Error al conectar con Google Sheets:', err);
      if (catalogoProductos.length === 0) {
        catalogoProductos = [...CATALOGO_DEFAULT];
        renderizarCatalogo(catalogoProductos);
      }
      if (elements.syncDot) elements.syncDot.className = 'sync-status-dot is-offline';
      if (elements.syncText) elements.syncText.textContent = 'Modo local (Sin conexión)';
      if (forzarRed) {
        showToast('Sin conexión con Google Sheets. Mostrando datos locales.', 'info');
      }
    } finally {
      if (elements.btnSync) elements.btnSync.classList.remove('is-spinning');
      catalogoCargando = false;
    }
  }

  /**
   * ========================================================================
   * ASIGNACIÓN DE EVENTOS GENERALES
   * ========================================================================
   */

  // Buscador
  if (elements.busqueda) {
    elements.busqueda.addEventListener('input', filtrarCatalogo);
  }

  if (elements.btnLimpiar) {
    elements.btnLimpiar.addEventListener('click', () => {
      elements.busqueda.value = '';
      filtrarCatalogo();
      elements.busqueda.focus();
    });
  }

  if (elements.btnSync) {
    elements.btnSync.addEventListener('click', () => cargarCatalogo(true));
  }

  // Filtros
  const filterBtns = document.querySelectorAll('.catalog-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.getAttribute('data-filter');
      const valor = btn.getAttribute('data-value');

      if (tipo === 'categoria') {
        filtroCategoriaActivo = valor;
        document.querySelectorAll('.catalog-filter-btn[data-filter="categoria"]').forEach(b => {
          b.classList.toggle('is-active', b === btn);
        });
      } else if (tipo === 'genero') {
        filtroGeneroActivo = valor;
        document.querySelectorAll('.catalog-filter-btn[data-filter="genero"]').forEach(b => {
          b.classList.toggle('is-active', b === btn);
        });
      } else if (tipo === 'estado') {
        filtroEstadoActivo = valor;
        document.querySelectorAll('.catalog-filter-btn[data-filter="estado"]').forEach(b => {
          b.classList.toggle('is-active', b === btn);
        });
      }

      filtrarCatalogo();
      actualizarIndicadorFiltrosActivos();
    });
  });

  if (elements.btnToggleFiltros && elements.panelFiltros) {
    elements.btnToggleFiltros.addEventListener('click', () => {
      const estaColapsado = elements.panelFiltros.classList.contains('is-collapsed');
      if (estaColapsado) {
        elements.panelFiltros.classList.remove('is-collapsed');
        elements.btnToggleFiltros.classList.add('is-open');
        elements.btnToggleFiltros.setAttribute('aria-expanded', 'true');
        if (elements.toggleFiltrosArrow) elements.toggleFiltrosArrow.textContent = '▲';
      } else {
        elements.panelFiltros.classList.add('is-collapsed');
        elements.btnToggleFiltros.classList.remove('is-open');
        elements.btnToggleFiltros.setAttribute('aria-expanded', 'false');
        if (elements.toggleFiltrosArrow) elements.toggleFiltrosArrow.textContent = '▼';
      }
    });
  }

  // Eventos de apertura / cierre del carrito
  if (elements.headerCartBtn) {
    elements.headerCartBtn.addEventListener('click', abrirModalCarrito);
  }

  if (elements.btnAbrirCarritoFlotante) {
    elements.btnAbrirCarritoFlotante.addEventListener('click', abrirModalCarrito);
  }

  if (elements.btnCerrarCarrito) {
    elements.btnCerrarCarrito.addEventListener('click', cerrarModalCarrito);
  }

  if (elements.btnSeguirComprando) {
    elements.btnSeguirComprando.addEventListener('click', cerrarModalCarrito);
  }

  if (elements.btnVaciarCarrito) {
    elements.btnVaciarCarrito.addEventListener('click', solicitarVaciarPedido);
  }

  if (elements.btnCerrarConfirmarVaciar) {
    elements.btnCerrarConfirmarVaciar.addEventListener('click', cerrarModalConfirmarVaciar);
  }

  if (elements.btnCancelarVaciar) {
    elements.btnCancelarVaciar.addEventListener('click', cerrarModalConfirmarVaciar);
  }

  if (elements.btnConfirmarVaciar) {
    elements.btnConfirmarVaciar.addEventListener('click', vaciarPedido);
  }

  if (elements.modalConfirmarVaciar) {
    elements.modalConfirmarVaciar.addEventListener('click', (e) => {
      if (e.target === elements.modalConfirmarVaciar) cerrarModalConfirmarVaciar();
    });
  }

  if (elements.btnEnviarWhatsapp) {
    elements.btnEnviarWhatsapp.addEventListener('click', (e) => {
      if (elements.btnEnviarWhatsapp.disabled || elements.btnEnviarWhatsapp.classList.contains('is-disabled')) {
        e.preventDefault();
        return;
      }
      enviarPedidoWhatsApp();
    });
  }

  if (elements.modalCarrito) {
    elements.modalCarrito.addEventListener('click', (e) => {
      if (e.target === elements.modalCarrito) cerrarModalCarrito();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.modalConfirmarVaciar && elements.modalConfirmarVaciar.classList.contains('is-active')) {
        cerrarModalConfirmarVaciar();
        return;
      }
      if (elements.modalCarrito && elements.modalCarrito.classList.contains('is-active')) {
        cerrarModalCarrito();
      }
    }
  });

  // Guardar nombre del cliente en tiempo real al tipear
  if (elements.inputClienteNombre) {
    elements.inputClienteNombre.addEventListener('input', () => {
      try {
        localStorage.setItem(STORAGE_KEYS.CLIENTE_NOMBRE, elements.inputClienteNombre.value.trim());
      } catch (e) {}
    });
  }

  // Estado Online / Offline
  function actualizarEstadoConexion() {
    if (!elements.pwaStatus) return;
    const isOnline = navigator.onLine;
    const pulse = elements.pwaStatus.querySelector('.status-dot-mini');
    const label = elements.pwaStatus.querySelector('.status-text-mini');

    if (pulse && label) {
      if (isOnline) {
        pulse.style.background = 'var(--emerald-profit)';
        pulse.style.boxShadow = '0 0 6px var(--emerald-profit)';
        label.textContent = 'Online';
      } else {
        pulse.style.background = 'var(--gold-primary)';
        pulse.style.boxShadow = '0 0 6px var(--gold-primary)';
        label.textContent = 'Offline';
      }
    }
  }

  window.addEventListener('online', actualizarEstadoConexion);
  window.addEventListener('offline', actualizarEstadoConexion);
  actualizarEstadoConexion();

  // Registro del Service Worker para funcionamiento PWA Offline
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('[GL EXPRESS] Service Worker registrado con éxito:', reg.scope);
        })
        .catch(err => {
          console.warn('[GL EXPRESS] Error al registrar Service Worker:', err);
        });
    });
  }

  /**
   * ========================================================================
   * ARRANQUE DE LA APLICACIÓN MAYORISTA
   * ========================================================================
   */
  cargarCarrito();
  cargarCatalogo(false);

  console.log('[GL EXPRESS] Plataforma Mayorista Inicializada con éxito.');
});
