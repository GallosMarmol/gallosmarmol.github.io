// ventas/assets/js/catalogo.js
// Gestión del catálogo público por línea (marketing)

import { renderVentasShell } from './ventas-shell.js';
import { CatalogoMarketingAPI } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const LINEAS = [
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'saldos', label: 'Saldos de exportación' }
];

const state = {
  lineaActual: 'catalogo',
  datos: [],
  disponibles: [],
  contadores: { catalogo: 0, outlet: 0, saldos: 0 },
  buscar: '',
  cargando: false,
  mostrarDisponibles: false
};

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
      <button class="v-btn v-btn-gold" id="btn-disponibles" type="button">
        + Añadir productos a la línea
      </button>
      <span class="v-count" id="count">—</span>
    </div>

    <div class="v-panel">
      <div class="v-table-wrapper">
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
      <div class="v-empty v-hidden" id="empty">
        <div class="v-empty-icon">◇</div>
        <div class="v-empty-title">Sin productos en esta línea</div>
        <div class="v-empty-text">Usa "+ Añadir productos" para agregar.</div>
      </div>
    </div>
  `;

  await cargarContadores();
  await cargarLinea();
  enlazarEventos();
})();

// ============================================================
// CONTADORES Y TABS
// ============================================================
async function cargarContadores() {
  try {
    state.contadores = await CatalogoMarketingAPI.contadores();
  } catch (e) {
    console.warn('[catalogo] contadores:', e);
  }
  renderTabs();
}

function renderTabs() {
  const el = $('#lineas-tabs');
  if (!el) return;
  el.innerHTML = LINEAS.map(l => `
    <button class="v-quick-chip ${state.lineaActual === l.key ? 'active' : ''}" data-linea="${l.key}" type="button">
      ${esc(l.label)}
      <span class="v-quick-count">${state.contadores[l.key] || 0}</span>
    </button>
  `).join('');

  $$('[data-linea]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.lineaActual = btn.dataset.linea;
      state.buscar = '';
      const input = $('#buscar');
      if (input) input.value = '';
      renderTabs();
      cargarLinea();
    });
  });
}

// ============================================================
// CARGA DE LA LÍNEA
// ============================================================
async function cargarLinea() {
  if (state.cargando) return;
  state.cargando = true;
  const tbody = $('#tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>`;

  try {
    state.datos = await CatalogoMarketingAPI.listarPorLinea(state.lineaActual, state.buscar || null);
    renderTabla();
  } catch (e) {
    console.error('[catalogo] error:', e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--danger);">Error: ${esc(e?.message || '')}</td></tr>`;
  } finally {
    state.cargando = false;
  }
}

function renderTabla() {
  const tbody = $('#tbody');
  const empty = $('#empty');
  const count = $('#count');
  if (!tbody) return;

  if (count) count.textContent = `${state.datos.length} producto${state.datos.length === 1 ? '' : 's'}`;

  if (state.datos.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('v-hidden');
    return;
  }
  if (empty) empty.classList.add('v-hidden');

  tbody.innerHTML = state.datos.map(row => {
    const p = row.producto || {};
    const img = driveImg(p.imagen_url);
    const precioBase = Number(p.precio || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 });
    const precioOferta = row.precio_oferta != null
      ? Number(row.precio_oferta).toLocaleString('es-PE', { minimumFractionDigits: 2 })
      : '';

    return `
      <tr data-id="${esc(row.producto_id)}">
        <td>
          <div class="v-row-avatar-cell">
            ${img
              ? `<img src="${esc(img)}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:contain;flex-shrink:0;">`
              : `<div style="width:36px;height:36px;border-radius:6px;background:var(--v-primary-10);display:flex;align-items:center;justify-content:center;color:var(--v-muted);font-size:0.8rem;flex-shrink:0;">◇</div>`}
            <div>
              <div class="v-cell-name">${esc(p.nombre || '—')}</div>
              <div class="v-cell-email">${esc(p.familia?.nombre || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="v-cell-ref">${esc(p.sku || '—')}</span></td>
        <td>S/ ${precioBase} <span style="font-size:0.7rem;color:var(--v-muted);">${esc(p.moneda || 'PEN')}</span></td>
        <td>
          <input type="number" step="0.01" class="v-select-estado" style="max-width:110px;"
                 data-accion="oferta" data-id="${esc(row.producto_id)}"
                 value="${esc(precioOferta)}" placeholder="—">
        </td>
        <td>
          <input type="number" class="v-select-estado" style="max-width:80px;"
                 data-accion="orden" data-id="${esc(row.producto_id)}"
                 value="${esc(row.orden ?? '')}" placeholder="—">
        </td>
        <td>
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" data-accion="visible" data-id="${esc(row.producto_id)}" ${row.activo !== false ? 'checked' : ''}>
            <span style="font-size:0.8rem;color:var(--v-muted);">${row.activo !== false ? 'Visible' : 'Oculto'}</span>
          </label>
        </td>
        <td>
          <div class="v-row-actions">
            ${p.sku ? `<a class="v-icon-btn" href="${esc(urlPublica(p.sku, state.lineaActual))}" target="_blank" rel="noopener" title="Ver en el sitio público">↗</a>` : ''}
            <button class="v-icon-btn v-icon-btn-danger" data-accion="quitar" data-id="${esc(row.producto_id)}" title="Quitar de la línea">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  enlazarAcciones();
}

// ============================================================
// ACCIONES INLINE
// ============================================================
function enlazarAcciones() {
  // Precio de oferta
  $$('input[data-accion="oferta"]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const id = inp.dataset.id;
      const valor = inp.value.trim();
      try {
        await CatalogoMarketingAPI.actualizarEnLinea(id, state.lineaActual, {
          precio_oferta: valor === '' ? null : valor
        });
        GM.toast('Precio de oferta guardado', 'success');
      } catch (e) {
        console.error(e);
        GM.toast('No se pudo guardar el precio', 'error');
      }
    });
  });

  // Orden
  $$('input[data-accion="orden"]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const id = inp.dataset.id;
      const valor = inp.value.trim();
      try {
        await CatalogoMarketingAPI.actualizarEnLinea(id, state.lineaActual, {
          orden: valor === '' ? null : Number(valor)
        });
        GM.toast('Orden guardado', 'success');
      } catch (e) {
        console.error(e);
        GM.toast('No se pudo guardar el orden', 'error');
      }
    });
  });

  // Visible / oculto
  $$('input[data-accion="visible"]').forEach(chk => {
    chk.addEventListener('change', async () => {
      const id = chk.dataset.id;
      try {
        await CatalogoMarketingAPI.actualizarEnLinea(id, state.lineaActual, { activo: chk.checked });
        const label = chk.closest('label')?.querySelector('span');
        if (label) label.textContent = chk.checked ? 'Visible' : 'Oculto';
        await cargarContadores();
        GM.toast(chk.checked ? 'Producto visible' : 'Producto oculto', 'success');
      } catch (e) {
        console.error(e);
        chk.checked = !chk.checked;
        GM.toast('No se pudo cambiar la visibilidad', 'error');
      }
    });
  });

  // Quitar de la línea
  $$('button[data-accion="quitar"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const ok = await confirmarQuitar();
      if (!ok) return;
      try {
        await CatalogoMarketingAPI.quitarDeLinea(id, state.lineaActual);
        GM.toast('Producto quitado de la línea', 'success');
        await cargarContadores();
        await cargarLinea();
      } catch (e) {
        console.error(e);
        GM.toast('No se pudo quitar el producto', 'error');
      }
    });
  });
}

// ============================================================
// MODAL: AÑADIR PRODUCTOS A LA LÍNEA
// ============================================================
async function abrirDisponibles() {
  let modal = document.getElementById('modal-disponibles');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'modal-disponibles';
  modal.className = 'v-modal-backdrop open';
  modal.innerHTML = `
    <div class="v-modal" style="max-width:640px;">
      <div class="v-modal-header">
        <h2 class="v-modal-title">Añadir productos a "${LINEAS.find(l => l.key === state.lineaActual)?.label}"</h2>
        <button class="v-modal-close" type="button" aria-label="Cerrar">×</button>
      </div>
      <div class="v-modal-body">
        <div class="v-field" style="margin-bottom:14px;">
          <input id="buscar-disponibles" type="search" class="v-select-estado" placeholder="Buscar por SKU o nombre…" style="width:100%;">
        </div>
        <div id="lista-disponibles" style="max-height:50vh;overflow-y:auto;">
          <div class="v-empty"><div class="v-empty-text">Cargando…</div></div>
        </div>
      </div>
      <div class="v-modal-footer">
        <button class="v-btn v-btn-ghost" type="button" data-cerrar>Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const cerrar = () => {
    modal.remove();
    document.body.classList.remove('modal-open');
  };
  modal.querySelector('.v-modal-close').addEventListener('click', cerrar);
  modal.querySelector('[data-cerrar]').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  const cargar = async (buscar = '') => {
    const cont = document.getElementById('lista-disponibles');
    if (!cont) return;
    cont.innerHTML = `<div class="v-empty"><div class="v-empty-text">Cargando…</div></div>`;
    try {
      const lista = await CatalogoMarketingAPI.listarDisponiblesParaLinea(state.lineaActual, buscar || null, 30);
      if (lista.length === 0) {
        cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">No hay productos disponibles para añadir.</div>`;
        return;
      }
      cont.innerHTML = lista.map(p => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--v-primary-05);">
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.85rem;font-weight:600;">${esc(p.nombre || '—')}</div>
            <div style="font-size:0.7rem;color:var(--v-muted);font-family:monospace;">${esc(p.sku || '')}</div>
          </div>
          <button class="v-btn v-btn-primary" style="padding:5px 12px;font-size:0.75rem;" data-add="${esc(p.id)}">Añadir</button>
        </div>
      `).join('');

      $$('[data-add]').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'Añadiendo…';
          try {
            await CatalogoMarketingAPI.agregarALinea(btn.dataset.add, state.lineaActual);
            GM.toast('Producto añadido', 'success');
            btn.textContent = '✓ Añadido';
            await cargarContadores();
            await cargarLinea();
          } catch (e) {
            console.error(e);
            GM.toast('No se pudo añadir', 'error');
            btn.disabled = false;
            btn.textContent = 'Añadir';
          }
        });
      });
    } catch (e) {
      console.error(e);
      cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger);font-size:0.85rem;">Error al cargar.</div>`;
    }
  };

  await cargar();
  const buscador = document.getElementById('buscar-disponibles');
  if (buscador) {
    let deb;
    buscador.addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(() => cargar(buscador.value.trim()), 300);
    });
  }
}

// ============================================================
// CONFIRMAR QUITAR
// ============================================================
function confirmarQuitar() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'v-modal-backdrop open';
    modal.innerHTML = `
      <div class="v-modal v-confirm-modal" style="max-width:420px;">
        <div class="v-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 class="v-confirm-title">Quitar de la línea</h2>
        <p class="v-confirm-desc">¿Quitar este producto de la línea?</p>
        <p class="v-confirm-warning">Dejará de aparecer en el sitio público.</p>
        <div class="v-confirm-footer">
          <button class="v-btn v-btn-ghost" type="button" data-cancel>Cancelar</button>
          <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Quitar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = (r) => { modal.remove(); resolve(r); };
    modal.querySelector('[data-cancel]').addEventListener('click', () => cerrar(false));
    modal.querySelector('[data-confirm]').addEventListener('click', () => cerrar(true));
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(false); });
  });
}

// ============================================================
// EVENTOS BASE
// ============================================================
function enlazarEventos() {
  const buscar = $('#buscar');
  if (buscar) {
    let deb;
    buscar.addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        state.buscar = buscar.value.trim();
        cargarLinea();
      }, 350);
    });
  }

  $('#btn-disponibles')?.addEventListener('click', abrirDisponibles);
}