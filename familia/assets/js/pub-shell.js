// /familia/assets/js/pub-shell.js

// Mapa origen → página de destino del logo
const LOGO_HREF = {
  outlet: 'outlet.html',
  catalogo: 'catalogo.html',
  saldos: 'saldos_exportacion.html'
};

// ============================================================
// HELPER: origen actual (URL param → path → default)
// ============================================================
function resolverOrigen(active) {
  const params = new URLSearchParams(location.search);
  const origenParam = params.get('origen');

  // 1. Solo aceptar orígenes conocidos (líneas del catálogo)
  if (origenParam && LOGO_HREF[origenParam]) return origenParam;

  // 2. Por path de la página
  const path = location.pathname;
  if (path.includes('saldos_exportacion')) return 'saldos';
  if (path.includes('outlet')) return 'outlet';
  if (path.includes('catalogo')) return 'catalogo';

  // 3. Fallback por `active`
  const mapeo = {
    'inicio': 'catalogo', 'catalogo': 'catalogo', 'outlet': 'outlet',
    'saldos_exportacion': 'saldos', 'showroom': 'catalogo', 'nosotros': 'catalogo',
    'contacto': 'catalogo', 'cotizacion': 'catalogo', 'comparacion': 'catalogo',
    'producto': 'catalogo', 'favoritos': 'catalogo'
  };
  return mapeo[active] || 'catalogo';
}

function pubHeader(active, opciones = {}) {
  const mapeoOrigenes = {
    'inicio': 'catalogo',
    'catalogo': 'catalogo',
    'outlet': 'outlet',
    'saldos_exportacion': 'saldos',
    'showroom': 'catalogo',
    'nosotros': 'catalogo',
    'contacto': 'catalogo',
    'cotizacion': 'catalogo',
    'comparacion': 'catalogo',
    'producto': 'catalogo',
    'favoritos': 'catalogo'
  };

  const origenParam = resolverOrigen(active);
  const logoHref = LOGO_HREF[origenParam] || 'catalogo.html';
  const esFavoritos = /(^|\/)favoritos(\.html?)?(\/|\?|$)/i.test(location.pathname + location.search);
  const mostrarBotonCotizar = opciones.mostrarBotonCotizar !== false; 
  const mostrarBotonCarrito = opciones.mostrarBotonCarrito !== false; 
  const mostrarBotonFavorito = opciones.mostrarBotonFavorito !== false; 

  const el = document.getElementById('pub-header');
  if (!el) return;

  el.innerHTML = `
  <div class="pub-header-in pub-header-in--minimal">

    ${esFavoritos
      ? `<button type="button"
                class="pub-logo pub-logo--img pub-logo--btn"
                id="pub-logo-favoritos"
                aria-label="Elegir sección"
                aria-haspopup="menu"
                aria-expanded="false"
                aria-controls="pub-logo-menu">
          <img src="../shared/assets/foto_01.png" alt="Gallos Mármol" class="pub-logo-img">
        </button>
        <div class="pub-logo-menu" id="pub-logo-menu" role="menu" aria-label="Ir a una sección" hidden>
          <a href="catalogo.html" role="menuitem" class="pub-logo-menu__item">
            Catálogo
          </a>
          <a href="outlet.html" role="menuitem" class="pub-logo-menu__item">
            Outlet
          </a>
          <a href="saldos_exportacion.html" role="menuitem" class="pub-logo-menu__item">
            Saldos de exportación
          </a>
        </div>`
      : `<a class="pub-logo pub-logo--img" href="${logoHref}" aria-label="Gallos Mármol">
          <img src="../shared/assets/foto_01.png" alt="Gallos Mármol" class="pub-logo-img">
        </a>`
    }

    <div class="pub-cta">
      ${mostrarBotonCarrito ? `
      <a href="cotizacion.html?origen=${origenParam}"
        class="btn btn-ghost btn-sm btn-carrito-header"
        id="btn-carrito-header"
        aria-label="Ver cotización"
        hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <circle cx="9" cy="21" r="1" fill="currentColor"/>
              <circle cx="20" cy="21" r="1" fill="currentColor"/>
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"
                    fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span id="carrito-count-header">0</span>
      </a>
      ` : ''}

      ${mostrarBotonFavorito ? `
      <a href="favoritos.html"
        class="btn btn-ghost btn-sm btn-favoritos-header"
        id="btn-favoritos-header"
        aria-label="Ver favoritos"
        hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M12 21s-7.5-4.35-9.5-9.5C1.12 8.55 3.5 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.5 0 5.88 3.55 4.5 6.5C19.5 16.65 12 21 12 21z"
                    fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
          <span id="favoritos-count">0</span>
      </a>
      ` : ''}

      ${mostrarBotonCotizar ? `
      <a href="cotizacion.html?origen=${origenParam}" class="btn btn-gold btn-sm">
          Pedir cotización
      </a>
      ` : ''}
    </div>
  </div>`;

  // Actualizar contadores DESPUÉS de inyectar el HTML
  if (typeof actualizarContadorCarritoHeader === 'function') {
    actualizarContadorCarritoHeader(origenParam);
  }
  if (typeof actualizarContadorFavoritosHeader === 'function') {
    actualizarContadorFavoritosHeader();
  }

  if (opciones.confirmarSalida !== false) {
    initConfirmSalida(opciones.mensajeSalida);
  }

  // ============================================================
  // Menú del logo en favoritos
  // ============================================================
  if (esFavoritos) {
    const btnLogo = document.getElementById('pub-logo-favoritos');
    const menu    = document.getElementById('pub-logo-menu');

    if (btnLogo && menu) {
      const abrir = () => {
        menu.hidden = false;
        btnLogo.setAttribute('aria-expanded', 'true');
        menu.querySelector('.pub-logo-menu__item')?.focus();
      };

      const cerrar = (devolverFoco = false) => {
        menu.hidden = true;
        btnLogo.setAttribute('aria-expanded', 'false');
        if (devolverFoco) btnLogo.focus();
      };

      btnLogo.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.hidden) abrir();
        else cerrar();
      });

      // Cerrar al clicar fuera
      document.addEventListener('click', (e) => {
        if (menu.hidden) return;
        if (e.target.closest('#pub-logo-menu') || e.target.closest('#pub-logo-favoritos')) return;
        cerrar();
      });

      // Cerrar con Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) {
          e.preventDefault();
          cerrar(true);
        }
      });

      // Navegación por teclado dentro del menú
      menu.addEventListener('keydown', (e) => {
        const items = Array.from(menu.querySelectorAll('.pub-logo-menu__item'));
        const idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          items[0]?.focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          items[items.length - 1]?.focus();
        } else if (e.key === 'Tab') {
          // Al salir del menú con Tab, ciérralo
          setTimeout(() => {
            if (!menu.contains(document.activeElement)) cerrar();
          }, 0);
        }
      });
    }
  }  

}

// ============================================================
// CONTADOR DE FAVORITOS EN EL HEADER
// ============================================================
function actualizarContadorFavoritosHeader() {
  const countEl = document.getElementById('favoritos-count');
  const btnEl = document.getElementById('btn-favoritos-header');
  if (!countEl || !btnEl) return;

  try {
    const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
    const count = Array.isArray(favoritos) ? favoritos.length : 0;
    countEl.textContent = count;
    btnEl.hidden = count === 0;
  } catch (e) {
    countEl.textContent = '0';
    btnEl.hidden = true;
  }
}

// Exponer globalmente para que public.js y otras páginas puedan llamarla
window.actualizarContadorFavoritosHeader = actualizarContadorFavoritosHeader;

// ⬇️ ESCUCHAR CAMBIOS EN OTRAS PESTAÑAS/VENTANAS
window.addEventListener('storage', (e) => {
  if (e.key === 'favoritos') {
    actualizarContadorFavoritosHeader();
  }
});

// Ejecutar al cargar
actualizarContadorFavoritosHeader();

function pubFooter() {
  const el = document.getElementById('pub-footer');
  if (!el) return;

  el.innerHTML = `
    <div class="pub-footer-in">
      <div>
        <div class="pub-logo" style="margin-bottom:12px;">Gallos <span>Mármol</span></div>
        <p style="max-width:34ch; font-size:13.5px;">Mármol, granito, cuarzo, travertino y porcelanato para proyectos residenciales, comerciales y de arquitectura, desde 1998.</p>
      </div>
      ${esFavoritos ? `
      <div class="pub-logo-menu" id="pub-logo-menu" role="menu" aria-label="Ir a una sección" hidden>
        <a href="catalogo.html" role="menuitem" class="pub-logo-menu__item">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Catálogo
        </a>
        <a href="outlet.html" role="menuitem" class="pub-logo-menu__item">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          Outlet
        </a>
        <a href="saldos_exportacion.html" role="menuitem" class="pub-logo-menu__item">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Saldos de exportación
        </a>
      </div>
      ` : ''}

      <div>
        <h5>Catálogo</h5>
        <a href="catalogo.html">Catálogo completo</a>
        <a href="outlet.html">Outlet</a>
        <a href="saldos_exportacion.html">Saldos de exportación</a>
      </div>
      <div>
        <h5>Empresa</h5>
        <a href="nosotros.html">Nosotros</a>
        <a href="showroom.html">Showroom</a>
        <a href="contacto.html">Contacto</a>
      </div>
      <div>
        <h5>Sistema</h5>
        <a href="../../ventas/login.html">Portal de Ventas</a>
        <a href="../../almacen/login.html">Portal de Almacén</a>
        <a href="../../admin/login.html">Portal de Administración</a>
      </div>
    </div>
    <div class="bottom">
      <span>© 2026 Gallos Mármol S.A.C. — Todos los derechos reservados.</span>
      <span>Showroom Miraflores · Planta Lurín · Almacén Callao</span>
    </div>`;
}

// ============================================================
// CONTADOR DE CARRITO EN EL HEADER
// ============================================================
function actualizarContadorCarritoHeader(origenForzado) {
  const btn = document.getElementById('btn-carrito-header');
  const countEl = document.getElementById('carrito-count-header');
  if (!btn || !countEl) return;

  try {
    // 1. Determinar el origen (prioridad)
    let origen = origenForzado;

    if (!origen) {
      const params = new URLSearchParams(location.search);
      origen = params.get('origen');
    }

    if (!origen) {
      const path = location.pathname;
      if (path.includes('saldos_exportacion')) origen = 'saldos';
      else if (path.includes('outlet')) origen = 'outlet';
      else origen = 'catalogo';
    }

    // 2. Leer el carrito del origen correcto
    const CARRITO_KEY = `gallos_cotizacion_carrito_${origen}`;
    const carrito = JSON.parse(localStorage.getItem(CARRITO_KEY) || '{"items":[]}');
    const count = Array.isArray(carrito.items) ? carrito.items.length : 0;

    // 3. Actualizar UI
    countEl.textContent = count;
    btn.hidden = count === 0;

  } catch (e) {
    console.error('Error actualizando contador carrito:', e);
    countEl.textContent = '0';
    btn.hidden = true;
  }
}

// Exponer globalmente
window.actualizarContadorCarritoHeader = actualizarContadorCarritoHeader;

// ============================================================
// FAB FILTROS (móvil) + AUTO-HIDE DE LA BARRA (desktop)
// ============================================================

function initFabFiltros() {
  const fab = document.getElementById('saldos-fab-filtros');
  if (!fab) return;

  // Buscar el botón de filtros de la página actual
  const btnFiltros =
    document.getElementById('outlet-btn-filtros') ||
    document.getElementById('catalogo-btn-filtros') ||
    document.getElementById('saldos-btn-filtros') ||
    document.getElementById('favoritos-btn-filtros');
  if (!btnFiltros) return;

  // Click en el FAB → dispara el click del botón original
  fab.addEventListener('click', () => {
    btnFiltros.click();
  });

  // Sincronizar el badge con el estado de filtros activos
  function actualizarBadge() {
    const tieneFiltros = btnFiltros.classList.contains('has-filters');
    const dataCount = btnFiltros.getAttribute('data-count');
    if (tieneFiltros && dataCount) {
      fab.classList.add('has-filters');
      fab.setAttribute('data-count', dataCount);
      fab.setAttribute('aria-label', `Abrir filtros (${dataCount} activos)`);
    } else {
      fab.classList.remove('has-filters');
      fab.removeAttribute('data-count');
      fab.setAttribute('aria-label', 'Abrir filtros');
    }
  }

  // Observar cambios en el botón original (class + data-count)
  const observer = new MutationObserver(actualizarBadge);
  observer.observe(btnFiltros, {
    attributes: true,
    attributeFilter: ['class', 'data-count']
  });
  actualizarBadge();
}

function initAutoHideControls() {
  const controls = document.querySelector('.saldos-controls');
  if (!controls) return;
  if (controls.classList.contains('saldos-controls--favoritos')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let lastScrollY = window.scrollY;
  let ticking = false;
  const UMBRAL_MOSTRAR = 300;
  const DELTA_MINIMO = 8;

  function onScroll() {
    if (window.innerWidth < 768) {
      controls.classList.remove('is-hidden');
      lastScrollY = window.scrollY;
      return;
    }
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    if (currentScrollY < UMBRAL_MOSTRAR) {
      controls.classList.remove('is-hidden');
      lastScrollY = currentScrollY;
      return;
    }
    if (Math.abs(delta) < DELTA_MINIMO) {
      lastScrollY = currentScrollY;
      return;
    }
    if (delta > 0) {
      controls.classList.add('is-hidden');
    } else {
      controls.classList.remove('is-hidden');
    }
    lastScrollY = currentScrollY;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
      controls.classList.remove('is-hidden');
    }
  });
}

// ============================================================
// CONFIRMACIÓN AL RETROCEDER (botón Atrás del navegador)
// ============================================================
function initConfirmSalida(mensaje = '¿Seguro que quieres salir de esta página?') {
  // Solo en páginas de listado/producto/cotización, no en home
  const path = location.pathname;
  const APLICA = /(outlet|catalogo|saldos_exportacion|producto|cotizacion|favoritos|comparacion)\.html?/i.test(path);
  if (!APLICA) return;

  // Si ya está inicializado, no duplicar
  if (window.__confirmSalidaInit) return;
  window.__confirmSalidaInit = true;

  // Centinela: entrada extra para detectar el "Atrás"
  history.pushState({ __guard: true, href: location.href }, '', location.href);

  window.addEventListener('popstate', (e) => {
    // Si venimos de nuestra propia redirección (ya confirmada), no volver a preguntar
    if (window.__salidaConfirmada) return;

    const ok = window.confirm(mensaje);
    if (!ok) {
      // Re-apilar el centinela para que un nuevo "Atrás" vuelva a preguntar
      history.pushState({ __guard: true, href: location.href }, '', location.href);
      return;
    }

    // Usuario confirma → marcar y dejar que el navegador retroceda de verdad
    window.__salidaConfirmada = true;
    // Retroceder una entrada más (la que el navegador ya consumió con popstate)
    history.back();
  });
}

// Ejecutar al cargar
function initBarraResponsiva() {
  initFabFiltros();
  initAutoHideControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBarraResponsiva);
} else {
  initBarraResponsiva();
}

// Exponer globalmente por si se necesita
window.initBarraResponsiva = initBarraResponsiva;

// ============================================================
// LLAMADAS AUTOMÁTICAS
// ============================================================

// 1. Al volver a la página desde bfcache (botón "Atrás")
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    const path = location.pathname;
    let origen = 'catalogo';
    if (path.includes('saldos_exportacion')) origen = 'saldos';
    else if (path.includes('outlet')) origen = 'outlet';
    actualizarContadorCarritoHeader(origen);
  }
});

// 2. Escuchar cambios en el localStorage desde otras pestañas
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('gallos_cotizacion_carrito_')) {
    actualizarContadorCarritoHeader();
  }
});

// Actualizar al cargar el header
document.addEventListener('DOMContentLoaded', actualizarContadorCarritoHeader);

window.addEventListener('pageshow', (event) => {
  // Cuando la página se restaura desde bfcache
  if (event.persisted) {
    // Re-leer el origen actual
    const path = location.pathname;
    let origen = 'catalogo';
    if (path.includes('saldos_exportacion')) origen = 'saldos';
    else if (path.includes('outlet')) origen = 'outlet';

    if (typeof actualizarContadorCarritoHeader === 'function') {
      actualizarContadorCarritoHeader(origen);
    }
    if (typeof actualizarContadorFavoritosHeader === 'function') {
      actualizarContadorFavoritosHeader();
    }
  }
});

// Escuchar cambios en otras pestañas
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('gallos_cotizacion_carrito_')) {
    actualizarContadorCarritoHeader();
  }
});

// En pub-shell.js, al final
function initAutoHideControls() {
  const controls = document.querySelector('.saldos-controls');
  if (!controls) return;
  if (controls.classList.contains('saldos-controls--favoritos')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let lastScrollY = window.scrollY;
  let ticking = false;
  const UMBRAL_MOSTRAR = 300;
  const DELTA_MINIMO = 8;

  function onScroll() {
    if (window.innerWidth < 768) {
      controls.classList.remove('is-hidden');
      lastScrollY = window.scrollY;
      return;
    }
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    if (currentScrollY < UMBRAL_MOSTRAR) {
      controls.classList.remove('is-hidden');
      lastScrollY = currentScrollY;
      return;
    }
    if (Math.abs(delta) < DELTA_MINIMO) {
      lastScrollY = currentScrollY;
      return;
    }
    if (delta > 0) {
      controls.classList.add('is-hidden');
    } else {
      controls.classList.remove('is-hidden');
    }
    lastScrollY = currentScrollY;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
      controls.classList.remove('is-hidden');
    }
  });
}

window.initAutoHideControls = initAutoHideControls;