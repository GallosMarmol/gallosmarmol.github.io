// /familia/assets/js/pub-shell.js

function pubHeader(active) {
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

  const origenParam = mapeoOrigenes[active] || 'catalogo';
  const el = document.getElementById('pub-header');
  if (!el) return;

  el.innerHTML = `
  <div class="pub-header-in pub-header-in--minimal">
      <a class="pub-logo pub-logo--img" href="#" aria-label="Gallos Mármol">
          <img src="../shared/assets/foto_01.png" alt="Gallos Mármol" class="pub-logo-img">
      </a>
      <div class="pub-cta">
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

          <a href="cotizacion.html?origen=${origenParam}" class="btn btn-gold btn-sm">
              Pedir cotización
          </a>
      </div>
  </div>`;

  // Actualizar contadores DESPUÉS de inyectar el HTML
  if (typeof actualizarContadorCarritoHeader === 'function') {
    actualizarContadorCarritoHeader(origenParam);
  }
  if (typeof actualizarContadorFavoritosHeader === 'function') {
    actualizarContadorFavoritosHeader();
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