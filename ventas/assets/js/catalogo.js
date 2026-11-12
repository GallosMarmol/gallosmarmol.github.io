// ventas/assets/js/catalogo.js
// Gestión del catálogo público por línea (marketing)
// Incluye: vista tabla + vista cards con toggle persistente

import { renderVentasShell } from './ventas-shell.js';
import { CatalogoMarketingAPI } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

// ============================================================
// CONSTANTES
// ============================================================
const LINEAS = [
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'saldos', label: 'Saldos de exportación' }
];

const LS_VISTA = 'gm.catalogo.linea.vista';
const VISTAS_VALIDAS = ['tabla', 'cards'];

const state = {
  lineaActual: 'catalogo',
  datos: [],
  disponibles: [],
  disponiblesPagina: 1,
  disponiblesTotal: 0,
  contadores: { catalogo: null, outlet: null, saldos: null },
  buscar: '',
  cargando: false,
  mostrarDisponibles: false,
  vista: VISTAS_VALIDAS.includes(localStorage.getItem(LS_VISTA))
    ? localStorage.getItem(LS_VISTA)
    : 'tabla'
};

// Load token para cancelar cargas anteriores
let currentLoadId = 0;
let disponiblesLoadId = 0;
let debounceBuscar = null;

// ============================================================
// HELPERS
// ============================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// ============================================================
// ICONOS SVG
// ============================================================
const ICONS = {
  table: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  package: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  external: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

// ============================================================
// HELPERS DE DATOS
// ============================================================
function driveImg(url) {
  if (!url) return null;
  if (url.includes('lh3.googleusercontent.com')) return url;
  if (url.includes('drive.google.com')) {
    const patterns = [/\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/];
    for (const p of patterns) {
      const m = url.match(p);
      if (m && m[1]) return `https://lh3.googleusercontent.com/d/${m[1]}`;
    }
  }
  return url;
}

function urlPublica(sku, linea) {
  if (!sku) return null;
  const path = `/familia/producto.html?sku=${encodeURIComponent(sku)}&origen=${encodeURIComponent(linea)}`;
  try { return new URL(path, window.location.origin).toString(); }
  catch { return path; }
}

function precioFormateado(v) {
  if (v == null || Number(v) === 0) {
    return '<span style="color:var(--v-muted);font-size:0.75rem;">—</span>';
  }
  return 'S/ ' + Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'catalogo',
    title: 'Catálogo público',
    crumb: 'Catálogo / Catálogo público',
    roles: ['marketing', 'admin'],
    permisos: ['catalogo.gestionar']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <!-- Pestañas de líneas -->
    <div class="v-quick-filters" id="lineas-tabs"></div>

    <div class="v-toolbar">
      <div class="v-search">
        <input id="buscar" type="search" placeholder="Buscar por SKU o nombre…" autocomplete="off">
      </div>

      <div class="v-view-toggle" role="group" aria-label="Cambiar vista">
        <button type="button" id="vista-tabla" aria-label="Vista en tabla" aria-pressed="true" title="Vista en tabla">
          ${ICONS.table}
        </button>
        <button type="button" id="vista-cards" aria-label="Vista en cards" aria-pressed="false" title="Vista en cards">
          ${ICONS.grid}
        </button>
      </div>

      <button class="v-btn v-btn-gold" id="btn-disponibles" type="button">
        + Añadir productos a la línea
      </button>
      <span class="v-count" id="count">—</span>
    </div>

    <div class="v-panel">
      <div class="v-table-wrapper" id="table-wrapper">
        <table class="v-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Precio base</th>
              <th>Precio oferta</th>
              <th>Orden</th>
              <th>Visible</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="7" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="v-catalogo-cards" id="cards-container" style="display:none;"></div>

      <div class="v-empty v-hidden" id="empty">
        <div class="v-empty-icon">◇</div>
        <div class="v-empty-title">Sin productos en esta línea</div>
        <div class="v-empty-text">Usa "+ Añadir productos" para agregar.</div>
      </div>
    </div>
  `;

  await cargarContadores();
  actualizarToggleVista();
  await cargarLinea();
  enlazarEventosBase();
  enlazarDelegacion();
})();

// ============================================================
// TOGGLE DE VISTA
// ============================================================
function actualizarToggleVista() {
  const btnTabla = $('#vista-tabla');
  const btnCards = $('#vista-cards');
  if (btnTabla) {
    btnTabla.classList.toggle('active', state.vista === 'tabla');
    btnTabla.setAttribute('aria-pressed', state.vista === 'tabla' ? 'true' : 'false');
  }
  if (btnCards) {
    btnCards.classList.toggle('active', state.vista === 'cards');
    btnCards.setAttribute('aria-pressed', state.vista === 'cards' ? 'true' : 'false');
  }
}

function cambiarVista(nueva) {
  if (!VISTAS_VALIDAS.includes(nueva)) return;
  if (state.vista === nueva) return;
  state.vista = nueva;
  try { localStorage.setItem(LS_VISTA, nueva); } catch (e) {}
  actualizarToggleVista();
  renderLista();
}

// ============================================================
// CONTADORES Y TABS
// ============================================================
async function cargarContadores() {
  try {
    const c = await CatalogoMarketingAPI.contadores();
    state.contadores = {
      catalogo: c?.catalogo ?? 0,
      outlet: c?.outlet ?? 0,
      saldos: c?.saldos ?? 0
    };
  } catch (e) {
    console.warn('[catalogo] contadores:', e);
    state.contadores = { catalogo: null, outlet: null, saldos: null };
  }
  renderTabs();
}

function renderTabs() {
  const el = $('#lineas-tabs');
  if (!el) return;

  el.innerHTML = LINEAS.map(l => {
    const count = state.contadores[l.key];
    const badge = count != null ? `<span class="v-quick-count">${count}</span>` : '';
    const activo = state.lineaActual === l.key;
    return `
      <button class="v-quick-chip ${activo ? 'active' : ''}" data-linea="${l.key}" type="button" ${activo ? 'aria-current="page"' : ''}>
        ${esc(l.label)} ${badge}
      </button>
    `;
  }).join('');
}

// ============================================================
// CARGA DE LA LÍNEA (con token de cancelación)
// ============================================================
async function cargarLinea() {
  const myLoadId = ++currentLoadId;

  const tbody = $('#tbody');
  const cardsContainer = $('#cards-container');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>`;
  if (cardsContainer) cardsContainer.innerHTML = '';

  try {
    const datos = await CatalogoMarketingAPI.listarPorLinea(state.lineaActual, state.buscar || null);
    if (myLoadId !== currentLoadId) return; // ignorar si ya hay otra carga

    state.datos = datos || [];
    renderLista();
  } catch (e) {
    if (myLoadId !== currentLoadId) return;
    console.error('[catalogo] error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--danger);">Error: ${esc(e?.message || '')}</td></tr>`;
  }
}

// ============================================================
// RENDER PRINCIPAL (decide tabla o cards)
// ============================================================
function renderLista() {
  const tbody = $('#tbody');
  const cardsContainer = $('#cards-container');
  const tableWrapper = $('#table-wrapper');
  const empty = $('#empty');
  const count = $('#count');
  if (!tbody) return;

  if (count) count.textContent = `${state.datos.length} producto${state.datos.length === 1 ? '' : 's'}`;

  if (state.datos.length === 0) {
    tbody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';
    if (empty) empty.classList.remove('v-hidden');
    return;
  }
  if (empty) empty.classList.add('v-hidden');

  if (state.vista === 'tabla') {
    if (tableWrapper) tableWrapper.style.display = '';
    if (cardsContainer) cardsContainer.style.display = 'none';
    tbody.innerHTML = state.datos.map(row => renderFilaTabla(row)).join('');
  } else {
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = '';
    cardsContainer.innerHTML = state.datos.map(row => renderCard(row)).join('');
  }
}

// ============================================================
// FILA DE TABLA
// ============================================================
function renderFilaTabla(row) {
  const p = row.producto || {};
  const img = driveImg(p.imagen_url);
  const precioOferta = row.precio_oferta != null ? Number(row.precio_oferta) : null;

  return `
    <tr data-id="${esc(row.producto_id)}">
      <td>
        <div class="v-row-avatar-cell">
          ${img
            ? `<img src="${esc(img)}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:contain;flex-shrink:0;background:#faf8f4;">`
            : `<div style="width:36px;height:36px;border-radius:6px;background:var(--v-primary-10);display:flex;align-items:center;justify-content:center;color:var(--v-muted);flex-shrink:0;">${ICONS.package}</div>`}
          <div style="min-width:0;">
            <div class="v-cell-name" title="${esc(p.nombre || '')}">${esc(p.nombre || '—')}</div>
            <div class="v-cell-email">${esc(p.familia?.nombre || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="v-cell-ref">${esc(p.sku || '—')}</span></td>
      <td>${precioFormateado(p.precio)} <span style="font-size:0.7rem;color:var(--v-muted);">${esc(p.moneda || 'PEN')}</span></td>
      <td>
        <input type="number" step="0.01" class="v-select-estado" style="max-width:110px;"
               data-accion="oferta" data-id="${esc(row.producto_id)}"
               value="${precioOferta ?? ''}" placeholder="—"
               aria-label="Precio de oferta para ${esc(p.nombre || '')}">
      </td>
      <td>
        <input type="number" class="v-select-estado" style="max-width:80px;"
               data-accion="orden" data-id="${esc(row.producto_id)}"
               value="${esc(row.orden ?? '')}" placeholder="—"
               aria-label="Orden para ${esc(p.nombre || '')}">
      </td>
      <td>
        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" data-accion="visible" data-id="${esc(row.producto_id)}" ${row.activo !== false ? 'checked' : ''}>
          <span style="font-size:0.8rem;color:var(--v-muted);">${row.activo !== false ? 'Visible' : 'Oculto'}</span>
        </label>
      </td>
      <td>
        <div class="v-row-actions">
          ${p.sku ? `
            <a class="v-icon-btn" href="${esc(urlPublica(p.sku, state.lineaActual))}"
               target="_blank" rel="noopener"
               title="Ver en el sitio público"
               aria-label="Ver ${esc(p.nombre || '')} en el sitio público">
              ${ICONS.external}
            </a>` : ''}
          <button class="v-icon-btn v-icon-btn-danger" data-accion="quitar" data-id="${esc(row.producto_id)}"
                  title="Quitar de la línea"
                  aria-label="Quitar ${esc(p.nombre || '')} de la línea">
            ${ICONS.trash}
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ============================================================
// CARD
// ============================================================
function renderCard(row) {
  const p = row.producto || {};
  const img = driveImg(p.imagen_url);
  const precioOferta = row.precio_oferta != null ? Number(row.precio_oferta) : null;
  const visible = row.activo !== false;

  return `
    <article class="v-catalogo-card" data-id="${esc(row.producto_id)}">
      <div class="v-catalogo-card__media">
        ${img
          ? `<img src="${esc(img)}" alt="${esc(p.nombre || '')}" loading="lazy">`
          : `<div class="v-catalogo-card__placeholder">${ICONS.package}</div>`}
      </div>
      <div class="v-catalogo-card__body">
        <div class="v-catalogo-card__head">
          <span class="v-catalogo-card__sku">${esc(p.sku || '—')}</span>
          ${visible ? '<span class="v-badge v-badge-convertido">Visible</span>' : '<span class="v-badge v-badge-descartado">Oculto</span>'}
        </div>
        <h3 class="v-catalogo-card__title" title="${esc(p.nombre || '')}">${esc(p.nombre || '—')}</h3>
        <div class="v-catalogo-card__meta">${esc(p.familia?.nombre || '—')}</div>

        <div class="v-catalogo-card__price">
          <span>${precioFormateado(p.precio)} ${esc(p.moneda || 'PEN')}</span>
        </div>

        <div class="v-catalogo-card__fields">
          <label class="v-catalogo-card__field">
            <span>Precio oferta</span>
            <input type="number" step="0.01" data-accion="oferta" data-id="${esc(row.producto_id)}"
                   value="${precioOferta ?? ''}" placeholder="—"
                   aria-label="Precio de oferta para ${esc(p.nombre || '')}">
          </label>
          <label class="v-catalogo-card__field">
            <span>Orden</span>
            <input type="number" data-accion="orden" data-id="${esc(row.producto_id)}"
                   value="${esc(row.orden ?? '')}" placeholder="—"
                   aria-label="Orden para ${esc(p.nombre || '')}">
          </label>
        </div>

        <label class="v-catalogo-card__visible">
          <input type="checkbox" data-accion="visible" data-id="${esc(row.producto_id)}" ${visible ? 'checked' : ''}>
          <span>Visible en ${esc(LINEAS.find(l => l.key === state.lineaActual)?.label || 'la línea')}</span>
        </label>

        <div class="v-catalogo-card__actions">
          ${p.sku ? `
            <a class="v-btn v-btn-ghost" href="${esc(urlPublica(p.sku, state.lineaActual))}"
               target="_blank" rel="noopener"
               title="Ver en el sitio público"
               aria-label="Ver ${esc(p.nombre || '')} en el sitio público">
              ${ICONS.external} Ver
            </a>` : ''}
          <button class="v-btn v-btn-danger" data-accion="quitar" data-id="${esc(row.producto_id)}"
                  title="Quitar de la línea"
                  aria-label="Quitar ${esc(p.nombre || '')} de la línea">
            ${ICONS.trash} Quitar
          </button>
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// DELEGACIÓN DE EVENTOS (una sola vez)
// ============================================================
function enlazarDelegacion() {
  // Tabla
  const tbody = $('#tbody');
  if (tbody) {
    tbody.addEventListener('change', manejarCambio);
    tbody.addEventListener('click', manejarClick);
  }

  // Cards
  const cardsContainer = $('#cards-container');
  if (cardsContainer) {
    cardsContainer.addEventListener('change', manejarCambio);
    cardsContainer.addEventListener('click', manejarClick);
  }

  // Tabs de línea
  const tabs = $('#lineas-tabs');
  if (tabs) {
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-linea]');
      if (!btn) return;
      const nueva = btn.dataset.linea;
      if (nueva === state.lineaActual) return;
      state.lineaActual = nueva;
      state.buscar = '';
      const input = $('#buscar');
      if (input) input.value = '';
      renderTabs();
      cargarLinea();
    });
  }

  // Botón "Añadir disponibles"
  $('#btn-disponibles')?.addEventListener('click', abrirDisponibles);

  // Toggle vista
  $('#vista-tabla')?.addEventListener('click', () => cambiarVista('tabla'));
  $('#vista-cards')?.addEventListener('click', () => cambiarVista('cards'));

  // Buscador con debounce
  const buscar = $('#buscar');
  if (buscar) {
    buscar.addEventListener('input', () => {
      clearTimeout(debounceBuscar);
      debounceBuscar = setTimeout(() => {
        state.buscar = buscar.value.trim();
        cargarLinea();
      }, 350);
    });
  }
}

async function manejarCambio(e) {
  const input = e.target.closest('[data-accion]');
  if (!input) return;

  const accion = input.dataset.accion;
  const id = input.dataset.id;

  if (accion === 'oferta') {
    const raw = input.value.trim();
    const n = Number(raw);
    if (raw !== '' && (!Number.isFinite(n) || n < 0)) {
      GM.toast('Precio inválido', 'error');
      input.value = '';
      return;
    }
    try {
      await CatalogoMarketingAPI.actualizarEnLinea(id, state.lineaActual, {
        precio_oferta: raw === '' ? null : n
      });
      // Actualizar en memoria
      const row = state.datos.find(r => String(r.producto_id) === String(id));
      if (row) row.precio_oferta = raw === '' ? null : n;
      GM.toast('Precio de oferta guardado', 'success');
    } catch (err) {
      console.error(err);
      GM.toast('No se pudo guardar el precio', 'error');
    }
    return;
  }

  if (accion === 'orden') {
    const raw = input.value.trim();
    const n = raw === '' ? null : Number(raw);
    if (n !== null && !Number.isFinite(n)) {
      GM.toast('Orden inválido', 'error');
      input.value = '';
      return;
    }
    try {
      await CatalogoMarketingAPI.actualizarEnLinea(id, state.lineaActual, { orden: n });
      const row = state.datos.find(r => String(r.producto_id) === String(id));
      if (row) row.orden = n;
      GM.toast('Orden guardado', 'success');
    } catch (err) {
      console.error(err);
      GM.toast('No se pudo guardar el orden', 'error');
    }
    return;
  }

  if (accion === 'visible') {
    const checked = input.checked;
    try {
      await CatalogoMarketingAPI.actualizarEnLinea(id, state.lineaActual, { activo: checked });
      const row = state.datos.find(r => String(r.producto_id) === String(id));
      if (row) row.activo = checked;
      // Actualizar label en tabla
      const label = input.closest('label')?.querySelector('span');
      if (label) label.textContent = checked ? 'Visible' : 'Oculto';
      await cargarContadores();
      GM.toast(checked ? 'Producto visible' : 'Producto oculto', 'success');
    } catch (err) {
      console.error(err);
      input.checked = !checked;
      GM.toast('No se pudo cambiar la visibilidad', 'error');
    }
  }
}

async function manejarClick(e) {
  const btn = e.target.closest('[data-accion="quitar"]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.id;
  const ok = await confirmarQuitar();
  if (!ok) return;
  btn.disabled = true;
  try {
    await CatalogoMarketingAPI.quitarDeLinea(id, state.lineaActual);
    GM.toast('Producto quitado de la línea', 'success');
    await cargarContadores();
    await cargarLinea();
  } catch (err) {
    console.error(err);
    GM.toast('No se pudo quitar el producto', 'error');
    btn.disabled = false;
  }
}

// ============================================================
// MODAL: AÑADIR PRODUCTOS A LA LÍNEA
// ============================================================
async function abrirDisponibles() {
  let modal = document.getElementById('modal-disponibles');
  if (modal) modal.remove();

  state.disponiblesPagina = 1;
  state.disponiblesTotal = 0;

  modal = document.createElement('div');
  modal.id = 'modal-disponibles';
  modal.className = 'v-modal-backdrop open';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-disponibles-title');
  modal.innerHTML = `
    <div class="v-modal" style="max-width:640px;">
      <div class="v-modal-header">
        <h2 class="v-modal-title" id="modal-disponibles-title">Añadir productos a "${esc(LINEAS.find(l => l.key === state.lineaActual)?.label || '')}"</h2>
        <button class="v-modal-close" type="button" data-cerrar aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="v-modal-body">
        <div class="v-field" style="margin-bottom:14px;">
          <input id="buscar-disponibles" type="search" class="v-select-estado" placeholder="Buscar por SKU o nombre…" style="width:100%;" aria-label="Buscar productos disponibles">
        </div>
        <div id="lista-disponibles" style="max-height:50vh;overflow-y:auto;">
          <div class="v-empty"><div class="v-empty-text">Cargando…</div></div>
        </div>
        <div id="cargar-mas-disponibles" style="text-align:center;padding:12px;"></div>
      </div>
      <div class="v-modal-footer">
        <button class="v-btn v-btn-ghost" type="button" data-cerrar>Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const focusReturn = document.activeElement;

  const cerrar = () => {
    document.removeEventListener('keydown', onKey);
    modal.remove();
    document.body.classList.remove('modal-open');
    if (focusReturn && typeof focusReturn.focus === 'function') {
      try { focusReturn.focus(); } catch (e) {}
    }
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    if (e.key === 'Tab') {
      const focusables = modal.querySelectorAll('button, input, a, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  modal.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', cerrar));
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  const buscador = document.getElementById('buscar-disponibles');
  if (buscador) {
    let deb;
    buscador.addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        state.disponiblesPagina = 1;
        cargarDisponibles(buscador.value.trim(), true);
      }, 300);
    });
  }

  await cargarDisponibles('', true);
}

async function cargarDisponibles(buscar = '', resetear = false) {
  const cont = document.getElementById('lista-disponibles');
  const masCont = document.getElementById('cargar-mas-disponibles');
  if (!cont) return;

  if (resetear) {
    cont.innerHTML = `<div class="v-empty"><div class="v-empty-text">Cargando…</div></div>`;
    if (masCont) masCont.innerHTML = '';
  }

  const myLoadId = ++disponiblesLoadId;
  const limite = 30 * state.disponiblesPagina;

  try {
    const lista = await CatalogoMarketingAPI.listarDisponiblesParaLinea(
      state.lineaActual, buscar || null, limite
    );
    if (myLoadId !== disponiblesLoadId) return;

    if (!lista || lista.length === 0) {
      if (resetear) {
        cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">No hay productos disponibles para añadir.</div>`;
      }
      if (masCont) masCont.innerHTML = '';
      return;
    }

    // Si el límite es igual al número de productos, hay más
    const hayMas = lista.length >= limite;

    if (resetear) {
      cont.innerHTML = lista.map(p => renderDisponibleItem(p)).join('');
    } else {
      cont.insertAdjacentHTML('beforeend', lista.slice(-30).map(p => renderDisponibleItem(p)).join(''));
    }

    // Actualizar botón "Cargar más"
    if (masCont) {
      if (hayMas) {
        masCont.innerHTML = `
          <button class="v-btn v-btn-ghost" type="button" id="btn-cargar-mas-disp">
            Cargar más
          </button>
        `;
        document.getElementById('btn-cargar-mas-disp')?.addEventListener('click', () => {
          state.disponiblesPagina++;
          cargarDisponibles(buscar, false);
        });
      } else {
        masCont.innerHTML = '';
      }
    }
  } catch (e) {
    if (myLoadId !== disponiblesLoadId) return;
    console.error(e);
    cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger);font-size:0.85rem;">Error al cargar.</div>`;
  }
}

function renderDisponibleItem(p) {
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--v-primary-05);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.85rem;font-weight:600;">${esc(p.nombre || '—')}</div>
        <div style="font-size:0.7rem;color:var(--v-muted);font-family:monospace;">${esc(p.sku || '')}</div>
      </div>
      <button class="v-btn v-btn-primary" style="padding:5px 12px;font-size:0.75rem;" data-add="${esc(p.id)}">Añadir</button>
    </div>
  `;
}

// Delegación para el botón "Añadir" de la lista de disponibles
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-add]');
  if (!btn) return;
  const id = btn.dataset.add;
  if (!id) return;
  btn.disabled = true;
  btn.textContent = 'Añadiendo…';
  try {
    await CatalogoMarketingAPI.agregarALinea(id, state.lineaActual);
    GM.toast('Producto añadido', 'success');
    btn.textContent = '✓ Añadido';
    await cargarContadores();
    await cargarLinea();
  } catch (err) {
    const msg = err?.code === '23505'
      ? 'Este producto ya está en la línea'
      : 'No se pudo añadir';
    GM.toast(msg, 'error');
    btn.disabled = false;
    btn.textContent = 'Añadir';
  }
});

// ============================================================
// MODAL: CONFIRMAR QUITAR
// ============================================================
function confirmarQuitar() {
  return new Promise((resolve) => {
    document.getElementById('modal-confirm-quitar')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-confirm-quitar';
    modal.className = 'v-modal-backdrop open';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-quitar-title');
    modal.innerHTML = `
      <div class="v-modal v-confirm-modal" style="max-width:420px;">
        <div class="v-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 class="v-confirm-title" id="confirm-quitar-title">Quitar de la línea</h2>
        <p class="v-confirm-desc">¿Quitar este producto de la línea?</p>
        <p class="v-confirm-warning">Dejará de aparecer en el sitio público.</p>
        <div class="v-confirm-footer">
          <button class="v-btn v-btn-ghost" type="button" data-cancel>Cancelar</button>
          <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Quitar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    const focusReturn = document.activeElement;

    const cerrar = (r) => {
      document.removeEventListener('keydown', onKey);
      modal.remove();
      document.body.classList.remove('modal-open');
      if (focusReturn && typeof focusReturn.focus === 'function') {
        try { focusReturn.focus(); } catch (e) {}
      }
      resolve(r);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
      if (e.key === 'Tab') {
        const focusables = modal.querySelectorAll('button');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    modal.querySelector('[data-cancel]').addEventListener('click', () => cerrar(false));
    modal.querySelector('[data-confirm]').addEventListener('click', () => cerrar(true));
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(false); });

    setTimeout(() => modal.querySelector('[data-cancel]').focus(), 50);
  });
}

// ============================================================
// EVENTOS BASE (buscador, botones, etc.)
// ============================================================
function enlazarEventosBase() {
  // Los listeners principales están en enlazarDelegacion() para no re-registrar.
  // Este espacio queda para futuros listeners globales.
}