// ventas/assets/js/productos.js
// Listado y CRUD de productos, adaptado por rol (admin, jefe, marketing, asesor, gerencia)
// Incluye: toggle tabla/cards (persistente en localStorage)

import { renderVentasShell } from './ventas-shell.js';
import { ProductosCRUDAPI, LineasAPI } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

// ============================================================
// CONSTANTES
// ============================================================
const LINEAS_DISPONIBLES = [
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'saldos', label: 'Saldos de exportación' }
];

const PER_PAGE_OPCIONES = [10, 25, 50, 100];
const LS_PER_PAGE = 'gm.productos.perPage';
const LS_VISTA = 'gm.productos.vista';

const VISTAS_VALIDAS = ['tabla', 'cards'];

const state = {
  pagina: 1,
  porPagina: PER_PAGE_OPCIONES.includes(Number(localStorage.getItem(LS_PER_PAGE)))
    ? Number(localStorage.getItem(LS_PER_PAGE))
    : 25,
  total: 0,
  buscar: '',
  familia_id: '',
  material_id: '',
  linea: '',
  activo: 'true',
  datos: [],
  catalogos: { familias: [], materiales: [], acabados: [], bordes: [], calidades: [], unidades: [] },
  cargando: false,
  vista: VISTAS_VALIDAS.includes(localStorage.getItem(LS_VISTA))
    ? localStorage.getItem(LS_VISTA)
    : 'tabla',
  // Rol y permisos
  rolVista: 'asesor',
  puedeCrear: false,
  puedeEditar: false,
  puedeEliminar: false,
  puedeLineas: false,
  // Borrador del formulario
  editandoId: null,
  lineasSeleccionadas: {}
};

if (new URLSearchParams(location.search).has('debug')) {
  window.__debugState = state;
}

let debounceBuscar = null;
let formDirty = false;

// ============================================================
// HELPERS
// ============================================================
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============================================================
// ICONOS SVG
// ============================================================
const ICONS = {
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  package: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  layers: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  whatsapp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  print: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  external: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  chevronLeft: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevronRight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`,
  pencil: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  table: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`
};

// ============================================================
// HELPERS DE DATOS
// ============================================================
function driveImg(url) {
  if (!url) return null;
  if (url.includes('lh3.googleusercontent.com')) return url;
  if (url.includes('drive.google.com')) {
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /uc\?id=([a-zA-Z0-9_-]+)/,
      /open\?id=([a-zA-Z0-9_-]+)/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m && m[1]) return `https://lh3.googleusercontent.com/d/${m[1]}`;
    }
  }
  return url;
}

function parseGaleria(valor) {
  if (!valor) return [];
  let arr = valor;
  if (typeof valor === 'string') {
    try { arr = JSON.parse(valor); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map(driveImg).filter(Boolean);
}

function urlCatalogoPublico(sku, origen = 'catalogo') {
  if (!sku) return null;
  const path = `/familia/producto.html?sku=${encodeURIComponent(sku)}&origen=${encodeURIComponent(origen)}`;
  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

function soles(n) {
  return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeActivo(activo) {
  return activo
    ? '<span class="v-badge v-badge-convertido">Activo</span>'
    : '<span class="v-badge v-badge-descartado">Inactivo</span>';
}

function chipsLineas(lineas) {
  if (!lineas || lineas.length === 0) return '<span style="color:var(--v-muted);font-size:0.75rem;">—</span>';
  return lineas
    .filter(l => l.activo !== false)
    .filter(l => LINEAS_DISPONIBLES.some(x => x.key === l.linea))
    .map(l => {
      const info = LINEAS_DISPONIBLES.find(x => x.key === l.linea);
      return `<span class="v-cell-products" style="margin-right:4px;">${esc(info?.label || l.linea)}</span>`;
    })
    .join('') || '<span style="color:var(--v-muted);font-size:0.75rem;">—</span>';
}

function opcionesUnidad(unidades, filtroTipo) {
  return unidades
    .filter(u => !filtroTipo || u.tipo === filtroTipo)
    .map(u => `<option value="${esc(u.id)}">${esc(u.simbolo || u.nombre)}</option>`)
    .join('');
}

function formatMedida(valor, unidad) {
  if (valor == null || valor === '') return null;
  const u = String(unidad || 'cm').trim().toLowerCase();
  const esPulgada = ['"', 'in', 'pulg', 'pulgada', 'pulgadas', 'inch', 'inches'].includes(u);
  return esPulgada ? `${valor}"` : `${valor} ${unidad || 'cm'}`;
}

function simboloUnidad(unidadId) {
  if (!unidadId) return 'cm';
  if (!state.catalogos?.unidades) return 'cm';
  const u = state.catalogos.unidades.find(x => String(x.id) === String(unidadId));
  return u?.simbolo || u?.nombre || 'cm';
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const rolVista = document.body.dataset.rol || 'asesor';

  const usuarioActual = await renderVentasShell({
    active: 'productos',
    title: 'Productos',
    crumb: 'Catálogo / Productos',
    roles: [rolVista, 'admin'],
    permisos: ['productos.ver']
  });
  if (!usuarioActual) return;

  state.rolVista = rolVista;
  const permisos = Array.isArray(usuarioActual.permisos) ? usuarioActual.permisos : [];
  state.puedeCrear = permisos.includes('productos.crear');
  state.puedeEditar = permisos.includes('productos.editar');
  state.puedeEliminar = permisos.includes('productos.eliminar');
  state.puedeLineas = permisos.includes('catalogo.gestionar');

  montarVista();
  enlazarEventosBase();
  actualizarToggleVista();
  await Promise.all([cargarCatalogos(), cargarProductos()]);
})();

// ============================================================
// VISTA
// ============================================================
function montarVista() {
  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <div class="v-toolbar">
      <div class="v-search">
        <input id="buscar" type="search" placeholder="Buscar por SKU o nombre…" autocomplete="off">
      </div>
      <select class="v-select-estado" id="filtro-familia">
        <option value="">Todas las familias</option>
      </select>
      <select class="v-select-estado" id="filtro-linea">
        <option value="">Todas las líneas</option>
        ${LINEAS_DISPONIBLES.map(l => `<option value="${l.key}">${esc(l.label)}</option>`).join('')}
      </select>
      <select class="v-select-estado" id="filtro-activo">
        <option value="true">Solo activos</option>
        <option value="false">Solo inactivos</option>
        <option value="">Todos</option>
      </select>

      <div class="v-view-toggle" role="group" aria-label="Cambiar vista">
        <button type="button" id="vista-tabla" aria-label="Vista en tabla" aria-pressed="true" title="Vista en tabla">
          ${ICONS.table}
        </button>
        <button type="button" id="vista-cards" aria-label="Vista en cards" aria-pressed="false" title="Vista en cards">
          ${ICONS.grid}
        </button>
      </div>

      <span class="v-count" id="count">—</span>
      ${state.puedeCrear ? `<button class="v-btn v-btn-gold" id="btn-nuevo" type="button">+ Nuevo producto</button>` : ''}
    </div>

    <div class="v-panel">
      <!-- Vista tabla -->
      <div class="v-table-wrapper" id="table-wrapper">
        <table class="v-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Familia</th>
              <th>Precio</th>
              <th>Líneas</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="8" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Vista cards -->
      <div class="v-productos-cards" id="cards-container" style="display:none;"></div>

      <div class="v-empty v-hidden" id="empty">
        <div class="v-empty-icon">◇</div>
        <div class="v-empty-title">Sin productos</div>
        <div class="v-empty-text">No hay resultados con los filtros actuales.</div>
      </div>
      <div class="v-pagination" id="pagination"></div>
    </div>
  `;

  if (state.puedeCrear || state.puedeEditar) {
    content.insertAdjacentHTML('beforeend', modalHTML());
    enlazarCambiosForm();
  }

  if (!document.getElementById('drawer-producto')) {
    document.body.insertAdjacentHTML('beforeend', drawerHTML());
    enlazarDrawer();
  }
}

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

function cambiarVista(nuevaVista) {
  if (!VISTAS_VALIDAS.includes(nuevaVista)) return;
  if (state.vista === nuevaVista) return;
  state.vista = nuevaVista;
  try { localStorage.setItem(LS_VISTA, nuevaVista); } catch (e) {}
  actualizarToggleVista();
  renderProductos();
}

// ============================================================
// DRAWER DE DETALLE DEL PRODUCTO
// ============================================================
function drawerHTML() {
  return `
    <div class="v-drawer-backdrop" id="drawer-producto-backdrop"></div>
    <aside class="v-drawer v-drawer-producto" id="drawer-producto" role="dialog" aria-modal="true" aria-labelledby="drawer-producto-title" aria-hidden="true">
      <div class="v-drawer-header">
        <h2 class="v-drawer-title" id="drawer-producto-title">Producto</h2>
        <button class="v-drawer-close" type="button" id="drawer-producto-close" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="v-drawer-body" id="drawer-producto-body">
        <div class="v-empty"><div class="v-empty-text">Cargando…</div></div>
      </div>
    </aside>
  `;
}

function enlazarDrawer() {
  const drawer = document.getElementById('drawer-producto');
  const backdrop = document.getElementById('drawer-producto-backdrop');
  if (!drawer || !backdrop) return;

  document.getElementById('drawer-producto-close')?.addEventListener('click', cerrarDrawer);
  backdrop.addEventListener('click', cerrarDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) cerrarDrawer();
  });

  // Delegación para "Editar producto" (robusto a re-renders)
  drawer.addEventListener('click', (e) => {
    const btn = e.target.closest('#drawer-btn-editar');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    cerrarDrawer();
    setTimeout(() => abrirModal(id), 200);
  });
}

async function abrirDrawerProducto(id) {
  const drawer = document.getElementById('drawer-producto');
  const backdrop = document.getElementById('drawer-producto-backdrop');
  if (!drawer || !backdrop) return;

  const body = document.getElementById('drawer-producto-body');
  const title = document.getElementById('drawer-producto-title');
  if (!body) return;

  body.innerHTML = `<div class="v-empty"><div class="v-empty-text">Cargando…</div></div>`;
  if (title) title.textContent = 'Producto';

  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');

  try {
    let prod = state.datos.find(d => String(d.id) === String(id));
    if (!prod) {
      prod = await ProductosCRUDAPI.obtener(id);
    }
    if (!prod) throw new Error('Producto no encontrado');

    if (title) title.textContent = prod.nombre || 'Producto';
    body.innerHTML = renderDetalleProducto(prod);
    enlazarGaleria(body, prod);
    enlazarAccionesDrawer(body, prod);
  } catch (e) {
    console.error('[productos] drawer:', e);
    body.innerHTML = `<div class="v-empty"><div class="v-empty-text" style="color:var(--danger);">No se pudo cargar el producto.</div></div>`;
  }
}

function cerrarDrawer() {
  const drawer = document.getElementById('drawer-producto');
  const backdrop = document.getElementById('drawer-producto-backdrop');
  if (drawer) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  if (backdrop) backdrop.classList.remove('open');
  document.body.classList.remove('drawer-open');
}

function renderDetalleProducto(p) {
  const img = driveImg(p.imagen_url);
  const galeriaFotos = parseGaleria(p.galeria_fotos);
  const galeriaAmbientadas = parseGaleria(p.galeria_ambientadas);
  const galeriaPatrones = parseGaleria(p.galeria_patrones);
  const galeriaRangos = parseGaleria(p.galeria_rangos);

  const precio = Number(p.precio || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 });
  const lineas = (p.lineas || []).filter(l => l.activo !== false);

  const largoTxt   = formatMedida(p.largo,   p.unidad_largo_simbolo   || simboloUnidad(p.unidad_largo_id));
  const anchoTxt   = formatMedida(p.ancho,   p.unidad_ancho_simbolo   || simboloUnidad(p.unidad_ancho_id));
  const espesorTxt = formatMedida(p.espesor, p.unidad_espesor_simbolo || simboloUnidad(p.unidad_espesor_id));

  const dimension = (largoTxt && anchoTxt)
    ? `${largoTxt} × ${anchoTxt}${espesorTxt ? ' × ' + espesorTxt : ''}`
    : null;

  const lineasHtml = lineas.length > 0
    ? lineas.map(l => {
        const info = { catalogo: 'Catálogo', outlet: 'Outlet', saldos: 'Saldos de exportación' }[l.linea] || l.linea;
        const oferta = l.precio_oferta ? `S/ ${Number(l.precio_oferta).toFixed(2)}` : null;

        let stockLinea = 'Consultar';
        let stockColorLinea = 'var(--v-muted)';
        if (l.stock != null) {
          const num = Number(l.stock);
          if (!isNaN(num)) {
            if (num === 0) {
              stockLinea = 'Agotado';
              stockColorLinea = 'var(--danger)';
            } else {
              stockLinea = num.toLocaleString('es-PE');
              stockColorLinea = 'var(--v-text)';
            }
          }
        }

        return `
          <div class="v-producto-linea">
            <div class="v-producto-linea__head">
              <span class="v-producto-linea__nombre">${esc(info)}</span>
              ${oferta ? `<span class="v-producto-linea__oferta">Oferta: ${esc(oferta)}</span>` : ''}
            </div>
            <div class="v-producto-linea__stock" style="color:${stockColorLinea};">
              Stock: <strong>${esc(stockLinea)}</strong>
              ${l.stock_minimo != null ? `<span style="color:var(--v-muted);font-size:0.7rem;"> (mín. ${Number(l.stock_minimo).toLocaleString('es-PE')})</span>` : ''}
            </div>
          </div>
        `;
      }).join('')
    : '';

  return `
    <div class="v-drawer-section" id="drawer-hero-wrap">
      ${img
        ? `<div class="v-producto-hero"><img id="drawer-hero-img" src="${esc(img)}" alt="${esc(p.imagen_alt || p.nombre || 'Producto')}" loading="lazy"></div>`
        : `<div class="v-producto-hero-placeholder">${ICONS.image}<span>Sin imagen</span></div>`}
    </div>

    <div class="v-drawer-section">
      <h3 class="v-drawer-subtitle">${ICONS.package} ${esc(p.nombre || 'Producto')}</h3>
      <div class="v-producto-meta">
        ${p.sku ? `
          <button class="v-producto-sku-badge v-sku-copiable" type="button" data-sku="${esc(p.sku)}" title="Copiar SKU al portapapeles" aria-label="Copiar SKU ${esc(p.sku)} al portapapeles">
            ${esc(p.sku)}
            <span class="v-sku-copy-icon">${ICONS.copy}</span>
          </button>
        ` : '<span class="v-producto-sku-badge">—</span>'}
        ${p.activo ? '<span class="v-badge v-badge-convertido">Activo</span>' : '<span class="v-badge v-badge-descartado">Inactivo</span>'}
        ${p.destacado ? '<span class="v-badge v-badge-calificado">Destacado</span>' : ''}
      </div>
      ${p.descripcion ? `<p class="v-producto-desc">${esc(p.descripcion)}</p>` : ''}
    </div>

    <div class="v-drawer-section">
      <h3 class="v-drawer-subtitle">${ICONS.tag} Precio</h3>
      <div class="v-producto-precio">
        ${p.precio == null || Number(p.precio) === 0
          ? `<span class="v-producto-precio-valor" style="color:var(--v-muted);">Consultar precio</span>`
          : `<span class="v-producto-precio-valor">S/ ${precio}</span>
             <span class="v-producto-precio-moneda">${esc(p.moneda || 'PEN')}</span>`}
      </div>
      ${p.unidad_simbolo ? `<div style="font-size:0.75rem;color:var(--v-muted);margin-top:4px;">Por ${esc(p.unidad_simbolo)}</div>` : ''}
    </div>

    <div class="v-drawer-section">
      <h3 class="v-drawer-subtitle">Características</h3>
      <dl class="v-drawer-dl">
        ${p.familia?.nombre ? `<dt>Familia</dt><dd>${esc(p.familia.nombre)}</dd>` : ''}
        ${p.material?.nombre ? `<dt>Material</dt><dd>${esc(p.material.nombre)}</dd>` : ''}
        ${p.acabado?.nombre ? `<dt>Acabado</dt><dd>${esc(p.acabado.nombre)}</dd>` : ''}
        ${p.borde?.nombre ? `<dt>Borde</dt><dd>${esc(p.borde.nombre)}</dd>` : ''}
        ${p.calidad?.nombre ? `<dt>Calidad</dt><dd>${esc(p.calidad.nombre)}</dd>` : ''}
        ${dimension ? `<dt>Dimensiones</dt><dd>${esc(dimension)}</dd>` : ''}
        ${p.origen ? `<dt>Origen</dt><dd>${esc(p.origen)}</dd>` : ''}
      </dl>
    </div>

    ${lineas.length > 0 ? `
      <div class="v-drawer-section">
        <h3 class="v-drawer-subtitle">${ICONS.layers} Disponible en</h3>
        <div class="v-producto-lineas">
          ${lineasHtml}
        </div>
      </div>
    ` : ''}

    ${galeriaFotos.length > 0 ? renderGaleria('Fotos del producto', galeriaFotos) : ''}
    ${galeriaAmbientadas.length > 0 ? renderGaleria('Fotos ambientadas', galeriaAmbientadas) : ''}
    ${galeriaPatrones.length > 0 ? renderGaleria('Patrones', galeriaPatrones) : ''}
    ${galeriaRangos.length > 0 ? renderGaleria('Rangos', galeriaRangos) : ''}

    <div class="v-drawer-section" style="border-top:1px solid var(--v-primary-15);padding-top:16px;">
      <div class="v-producto-acciones">
        ${p.sku ? `
          <a class="v-btn v-btn-ghost" href="${esc(urlCatalogoPublico(p.sku, 'catalogo'))}" target="_blank" rel="noopener">
            ${ICONS.external} Ver en catálogo público
          </a>
        ` : ''}

        <button class="v-btn v-btn-ghost" type="button" id="drawer-btn-whatsapp" data-sku="${esc(p.sku || '')}" data-nombre="${esc(p.nombre || '')}">
          ${ICONS.whatsapp} Compartir por WhatsApp
        </button>

        <button class="v-btn v-btn-ghost" type="button" id="drawer-btn-imprimir" data-id="${esc(p.id || '')}">
          ${ICONS.print} Imprimir ficha
        </button>

        ${(state.puedeEditar && p.id)
          ? `<button class="v-btn v-btn-primary" type="button" id="drawer-btn-editar" data-id="${esc(p.id)}">
              Editar producto
            </button>`
          : ''}
      </div>
    </div>
  `;
}

function renderGaleria(titulo, urls) {
  return `
    <div class="v-drawer-section">
      <h3 class="v-drawer-subtitle">${ICONS.image} ${esc(titulo)} (${urls.length})</h3>
      <div class="v-producto-galeria">
        ${urls.map((url, i) => `
          <button class="v-producto-galeria-thumb" data-src="${esc(url)}" data-index="${i}" title="Ver imagen">
            <img src="${esc(url)}" alt="${esc(titulo)} ${i + 1}" loading="lazy">
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function enlazarGaleria(root, prod) {
  const todas = [
    ...(prod.imagen_url ? [driveImg(prod.imagen_url)].filter(Boolean) : []),
    ...parseGaleria(prod.galeria_fotos),
    ...parseGaleria(prod.galeria_ambientadas),
    ...parseGaleria(prod.galeria_patrones),
    ...parseGaleria(prod.galeria_rangos)
  ];

  const heroImg = root.querySelector('#drawer-hero-img');
  if (heroImg) {
    heroImg.style.cursor = 'zoom-in';
    heroImg.addEventListener('error', () => {
      const parent = heroImg.parentElement;
      if (parent) {
        parent.outerHTML = `<div class="v-producto-hero-placeholder">${ICONS.image}<span>Sin imagen</span></div>`;
      }
    });
    heroImg.addEventListener('click', () => {
      mostrarLightbox(todas, 0);
    });
  }

  root.querySelectorAll('.v-producto-galeria-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.dataset.src;
      if (!src) return;
      const idx = todas.indexOf(src);
      mostrarLightbox(todas, idx >= 0 ? idx : 0);
    });
  });
}

function enlazarAccionesDrawer(root, prod) {
  const skuBtn = root.querySelector('.v-sku-copiable');
  if (skuBtn) {
    skuBtn.addEventListener('click', async () => {
      const sku = skuBtn.dataset.sku;
      try {
        await navigator.clipboard.writeText(sku);
        const icon = skuBtn.querySelector('.v-sku-copy-icon');
        const originalHTML = icon.innerHTML;
        icon.innerHTML = ICONS.check;
        skuBtn.classList.add('v-sku-copiado');
        setTimeout(() => {
          icon.innerHTML = originalHTML;
          skuBtn.classList.remove('v-sku-copiado');
        }, 1500);
        GM.toast?.(`SKU "${sku}" copiado`, 'success');
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = sku;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); GM.toast?.(`SKU "${sku}" copiado`, 'success'); }
        catch { GM.toast?.('No se pudo copiar', 'error'); }
        ta.remove();
      }
    });
  }

  root.querySelector('#drawer-btn-whatsapp')?.addEventListener('click', () => {
    const url = urlCatalogoPublico(prod.sku, 'catalogo');
    const nombre = prod.nombre || 'Producto';
    const sku = prod.sku || '—';
    const familia = prod.familia?.nombre ? `\nFamilia: ${prod.familia.nombre}` : '';

    const mensaje = [
      `Hola, te comparto este producto de Gallos Mármol:`,
      ``,
      `*${nombre}*`,
      `SKU: ${sku}${familia}`,
      ``,
      `Míralo y cotiza aquí:`,
      url,
      ``
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
  });

  root.querySelector('#drawer-btn-imprimir')?.addEventListener('click', () => {
    imprimirFichaProducto(prod);
  });

  // El listener de #drawer-btn-editar está en enlazarDrawer() (delegación)
}

// ============================================================
// IMPRIMIR FICHA
// ============================================================
function imprimirFichaProducto(p) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    GM.toast?.('Permite las ventanas emergentes para imprimir', 'error');
    return;
  }

  const img = driveImg(p.imagen_url);
  const galeria = [
    ...parseGaleria(p.galeria_fotos),
    ...parseGaleria(p.galeria_ambientadas),
    ...parseGaleria(p.galeria_patrones),
    ...parseGaleria(p.galeria_rangos)
  ].slice(0, 4);

  const largoTxt   = formatMedida(p.largo,   p.unidad_largo_simbolo   || simboloUnidad(p.unidad_largo_id));
  const anchoTxt   = formatMedida(p.ancho,   p.unidad_ancho_simbolo   || simboloUnidad(p.unidad_ancho_id));
  const espesorTxt = formatMedida(p.espesor, p.unidad_espesor_simbolo || simboloUnidad(p.unidad_espesor_id));

  const dimension = (largoTxt && anchoTxt)
    ? `${largoTxt} × ${anchoTxt}${espesorTxt ? ' × ' + espesorTxt : ''}`
    : null;

  const logoUrl = `${window.location.origin}/shared/assets/foto_01.png`;
  const logoHtml = `<img src="${esc(logoUrl)}" alt="Gallos Mármol" style="max-height:48px; max-width:200px; object-fit:contain; display:block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`;

  const html = `
<!DOCTYPE html>
<html lang="es-PE">
<head>
  <meta charset="UTF-8">
  <title>Ficha · ${esc(p.nombre || 'Producto')}</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1210; margin: 0; padding: 0; line-height: 1.5; }
    .ficha { display: flex; flex-direction: column; gap: 16px; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 3px solid #6b0000; gap: 20px; }
    .brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .brand-fallback { display: none; font-size: 20px; font-weight: 700; color: #6b0000; letter-spacing: -0.3px; }
    .meta { text-align: right; font-size: 10px; color: #584038; }
    .fecha { font-weight: 600; color: #6b0000; font-size: 11px; }
    .producto { display: grid; grid-template-columns: 45% 55%; gap: 20px; align-items: start; }
    .imagen-principal { width: 100%; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; background: #faf8f4; border: 1px solid #e8e4d2; display: flex; align-items: center; justify-content: center; }
    .imagen-principal img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
    .sin-imagen { color: #8c8478; font-size: 11px; text-align: center; }
    .info h1 { font-size: 18px; font-weight: 700; color: #6b0000; margin: 0 0 4px; line-height: 1.2; }
    .sku { display: inline-block; background: #f4f1ea; color: #6b0000; font-family: 'Courier New', monospace; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 4px; margin-bottom: 10px; }
    .descripcion { font-size: 11.5px; color: #3d2822; margin: 10px 0; line-height: 1.5; }
    .specs { margin-top: 14px; border-top: 1px solid #e8e4d2; padding-top: 10px; }
    .specs-title { font-size: 10px; font-weight: 700; color: #6b0000; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
    .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 10.5px; }
    .specs-grid .k { color: #584038; }
    .specs-grid .v { color: #1a1210; font-weight: 600; }
    .qr-box { display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 10px 12px; background: #f4f1ea; border: 1px solid #e8e4d2; border-radius: 8px; }
    .qr-box img { width: 90px; height: 90px; display: block; background: #fff; padding: 4px; border-radius: 4px; }
    .qr-box-text { font-size: 10.5px; color: #584038; line-height: 1.4; }
    .qr-box-text strong { color: #6b0000; font-size: 11px; display: block; margin-bottom: 2px; }
    .galeria { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 16px; }
    .galeria-item { aspect-ratio: 1 / 1; border-radius: 6px; overflow: hidden; border: 1px solid #e8e4d2; }
    .galeria-item img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
  </style>
</head>
<body>
  <div class="ficha">
    <div class="header">
      <div class="brand">
        ${logoHtml}
        <div class="brand-fallback">Gallos Mármol</div>
      </div>
      <div class="meta">
        <div class="fecha">${new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div>Ficha técnica del producto</div>
      </div>
    </div>
    <div class="producto">
      <div class="imagen-principal">
        ${img
          ? `<img src="${esc(img)}" alt="${esc(p.nombre || 'Producto')}">`
          : `<div class="sin-imagen">Sin imagen disponible</div>`}
      </div>
      <div class="info">
        <h1>${esc(p.nombre || 'Producto')}</h1>
        ${p.sku ? `<div class="sku">SKU: ${esc(p.sku)}</div>` : ''}
        ${p.descripcion ? `<div class="descripcion">${esc(p.descripcion)}</div>` : ''}
        <div class="specs">
          <div class="specs-title">Características</div>
          <div class="specs-grid">
            ${p.familia?.nombre ? `<span class="k">Familia:</span><span class="v">${esc(p.familia.nombre)}</span>` : ''}
            ${p.material?.nombre ? `<span class="k">Material:</span><span class="v">${esc(p.material.nombre)}</span>` : ''}
            ${p.acabado?.nombre ? `<span class="k">Acabado:</span><span class="v">${esc(p.acabado.nombre)}</span>` : ''}
            ${p.borde?.nombre ? `<span class="k">Borde:</span><span class="v">${esc(p.borde.nombre)}</span>` : ''}
            ${p.calidad?.nombre ? `<span class="k">Calidad:</span><span class="v">${esc(p.calidad.nombre)}</span>` : ''}
            ${dimension ? `<span class="k">Dimensiones:</span><span class="v">${esc(dimension)}</span>` : ''}
            ${p.origen ? `<span class="k">Origen:</span><span class="v">${esc(p.origen)}</span>` : ''}
          </div>
        </div>
        ${p.sku ? `
          <div class="qr-box">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(p.sku)}" alt="QR del SKU ${esc(p.sku)}">
            <div class="qr-box-text">
              <strong>Escanea para ver el producto</strong>
              ${esc(p.sku)}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
    ${galeria.length > 0 ? `
      <div class="galeria">
        ${galeria.map(url => `<div class="galeria-item"><img src="${esc(url)}" alt="Galería"></div>`).join('')}
      </div>
    ` : ''}
  </div>
</body>
</html>
`;

  win.addEventListener('load', () => {
    // 3. Forzar el foco en la ventana nueva (necesario en algunos navegadores)
    win.focus();
    // 4. Pequeño delay para que el navegador procese el renderizado
    setTimeout(() => {
      win.print();
    }, 300); 
  }, { once: true });

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ============================================================
// LIGHTBOX
// ============================================================
function mostrarLightbox(imagenes, indiceInicial = 0) {
  document.getElementById('v-lightbox')?.remove();
  if (!imagenes || imagenes.length === 0) return;

  let idx = Math.max(0, Math.min(indiceInicial, imagenes.length - 1));

  const box = document.createElement('div');
  box.id = 'v-lightbox';
  box.className = 'v-lightbox';
  box.innerHTML = `
    <div class="v-lightbox-top-controls">
      <span class="v-lightbox-counter" id="lb-counter">${idx + 1} / ${imagenes.length}</span>
      <button class="v-lightbox-close" type="button" aria-label="Cerrar">${ICONS.close}</button>
    </div>
    ${imagenes.length > 1 ? `
      <button class="v-lightbox-nav v-lightbox-prev" type="button" aria-label="Anterior">${ICONS.chevronLeft}</button>
      <button class="v-lightbox-nav v-lightbox-next" type="button" aria-label="Siguiente">${ICONS.chevronRight}</button>
    ` : ''}
    <img class="v-lightbox-img" id="lb-img" src="${esc(imagenes[idx])}" alt="Imagen ${idx + 1}">
  `;
  document.body.appendChild(box);
  document.body.classList.add('drawer-open');

  const lbImg = box.querySelector('#lb-img');
  const lbCounter = box.querySelector('#lb-counter');

  const actualizar = () => {
    lbImg.src = imagenes[idx];
    if (lbCounter) lbCounter.textContent = `${idx + 1} / ${imagenes.length}`;
  };

  const irA = (n) => {
    if (n < 0) n = imagenes.length - 1;
    if (n >= imagenes.length) n = 0;
    idx = n;
    actualizar();
  };

  box.querySelector('.v-lightbox-prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    irA(idx - 1);
  });
  box.querySelector('.v-lightbox-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    irA(idx + 1);
  });

  const cerrar = () => {
    box.remove();
    document.body.classList.remove('drawer-open');
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); irA(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); irA(idx + 1); }
  };
  document.addEventListener('keydown', onKey);

  box.addEventListener('click', (e) => {
    if (e.target === box) cerrar();
  });
  box.querySelector('.v-lightbox-close')?.addEventListener('click', cerrar);
}

// ============================================================
// MODAL CREAR/EDITAR
// ============================================================
function modalHTML() {
  return `
    <div class="v-modal-backdrop" id="modal-producto" role="dialog" aria-modal="true" aria-labelledby="modal-producto-title" aria-hidden="true">
      <div class="v-modal" style="max-width:820px;">
        <div class="v-modal-header">
          <h2 class="v-modal-title" id="modal-producto-title">Nuevo producto</h2>
          <button class="v-modal-close" type="button" data-close-modal aria-label="Cerrar">×</button>
        </div>

        <form id="form-producto" novalidate>
          <div class="v-modal-body">
            <div class="v-form-grid">

              <div class="v-field">
                <label for="p-sku">SKU <span class="required">*</span></label>
                <input id="p-sku" name="sku" type="text" required autocomplete="off">
              </div>
              <div class="v-field">
                <label for="p-nombre">Nombre <span class="required">*</span></label>
                <input id="p-nombre" name="nombre" type="text" required autocomplete="off">
              </div>
              <div class="v-field full">
                <label for="p-descripcion">Descripción</label>
                <textarea id="p-descripcion" name="descripcion" rows="2"></textarea>
              </div>
              <div class="v-field">
                <label for="p-modelo">Modelo</label>
                <input id="p-modelo" name="modelo" type="text">
              </div>
              <div class="v-field">
                <label for="p-origen">Origen</label>
                <input id="p-origen" name="origen" type="text" placeholder="Ej: Perú, Italia">
              </div>

              <div class="v-field">
                <label for="p-familia">Familia <span class="required">*</span></label>
                <select id="p-familia" name="familia_id" required></select>
              </div>
              <div class="v-field">
                <label for="p-material">Material</label>
                <select id="p-material" name="material_id"></select>
              </div>
              <div class="v-field">
                <label for="p-acabado">Acabado</label>
                <select id="p-acabado" name="acabado_id"></select>
              </div>
              <div class="v-field">
                <label for="p-borde">Borde</label>
                <select id="p-borde" name="borde_id"></select>
              </div>
              <div class="v-field">
                <label for="p-calidad">Calidad</label>
                <select id="p-calidad" name="calidad_id"></select>
              </div>

              <div class="v-field">
                <label for="p-largo">Largo</label>
                <div style="display:flex; gap:6px;">
                  <input id="p-largo" name="largo" type="number" step="0.01" style="flex:1;">
                  <select id="p-unidad-largo" name="unidad_largo_id" style="flex:1;"></select>
                </div>
              </div>
              <div class="v-field">
                <label for="p-ancho">Ancho</label>
                <div style="display:flex; gap:6px;">
                  <input id="p-ancho" name="ancho" type="number" step="0.01" style="flex:1;">
                  <select id="p-unidad-ancho" name="unidad_ancho_id" style="flex:1;"></select>
                </div>
              </div>
              <div class="v-field">
                <label for="p-espesor">Espesor</label>
                <div style="display:flex; gap:6px;">
                  <input id="p-espesor" name="espesor" type="number" step="0.01" style="flex:1;">
                  <select id="p-unidad-espesor" name="unidad_espesor_id" style="flex:1;"></select>
                </div>
              </div>

              <div class="v-field">
                <label for="p-precio">Precio</label>
                <div style="display:flex; gap:6px;">
                  <input id="p-precio" name="precio" type="number" step="0.01" min="0.01" placeholder="— Consultar —" style="flex:1;">
                  <select id="p-moneda" name="moneda" style="flex:1;">
                    <option value="PEN">PEN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div class="v-field-error" id="err-precio"></div>
              </div>
              <div class="v-field">
                <label for="p-unidad-venta">Unidad de venta</label>
                <select id="p-unidad-venta" name="unidad_venta_id"></select>
              </div>

              <div class="v-field full">
                <label for="p-imagen">URL imagen principal</label>
                <input id="p-imagen" name="imagen_url" type="url" placeholder="https://drive.google.com/…">
              </div>
              <div class="v-field full">
                <label for="p-imagen-alt">Texto alternativo imagen</label>
                <input id="p-imagen-alt" name="imagen_alt" type="text">
              </div>

              <div class="v-field full">
                <label for="p-galeria-fotos">Galería de fotos (una URL por línea)</label>
                <textarea id="p-galeria-fotos" name="galeria_fotos" rows="3" placeholder="https://…&#10;https://…"></textarea>
              </div>
              <div class="v-field full">
                <label for="p-galeria-ambientadas">Galería ambientadas (una URL por línea)</label>
                <textarea id="p-galeria-ambientadas" name="galeria_ambientadas" rows="3"></textarea>
              </div>
              <div class="v-field full">
                <label for="p-galeria-patrones">Galería de patrones (una URL por línea)</label>
                <textarea id="p-galeria-patrones" name="galeria_patrones" rows="3"></textarea>
              </div>
              <div class="v-field full">
                <label for="p-galeria-rangos">Galería de rangos (una URL por línea)</label>
                <textarea id="p-galeria-rangos" name="galeria_rangos" rows="3"></textarea>
              </div>

              <div class="v-field full">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="p-destacado" name="destacado" type="checkbox" style="width:auto;">
                  Destacado en el catálogo
                </label>
              </div>
              <div class="v-field full">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="p-activo" name="activo" type="checkbox" checked style="width:auto;">
                  Activo
                </label>
              </div>
              <div class="v-field full">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="p-es-piedra" name="es_piedra_natural" type="checkbox" checked style="width:auto;">
                  Es piedra natural
                </label>
              </div>
              <div class="v-field full">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="p-mostrar-caract" name="mostrar_caracteristicas" type="checkbox" checked style="width:auto;">
                  Mostrar características
                </label>
              </div>
              <div class="v-field full">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="p-mostrar-var" name="mostrar_variabilidad" type="checkbox" style="width:auto;">
                  Mostrar variabilidad
                </label>
              </div>

              <div class="v-field full" style="border-top:1px solid var(--v-primary-15);padding-top:14px;margin-top:6px;">
                <label style="font-size:0.9rem;color:var(--v-primary);">Líneas en las que aparece (stock por línea)</label>
                <div id="lineas-checkboxes" style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
                  ${LINEAS_DISPONIBLES.map(l => `
                    <div style="border:1px solid var(--v-primary-10);border-radius:6px;padding:10px 12px;">
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <input type="checkbox" data-linea="${l.key}" id="linea-${l.key}" style="width:auto;">
                        <label for="linea-${l.key}" style="margin:0;flex:1;font-weight:600;">${esc(l.label)}</label>
                      </div>
                      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                        <div>
                          <label style="font-size:0.7rem;color:var(--v-muted);display:block;margin-bottom:2px;">Stock</label>
                          <input type="number" step="0.01" placeholder="—" data-linea-stock="${l.key}"
                                style="width:100%;padding:5px 8px;border:1px solid var(--v-primary-15);border-radius:4px;font-size:0.8rem;">
                        </div>
                        <div>
                          <label style="font-size:0.7rem;color:var(--v-muted);display:block;margin-bottom:2px;">Stock mín.</label>
                          <input type="number" step="0.01" placeholder="—" data-linea-stock-min="${l.key}"
                                style="width:100%;padding:5px 8px;border:1px solid var(--v-primary-15);border-radius:4px;font-size:0.8rem;">
                        </div>
                        <div>
                          <label style="font-size:0.7rem;color:var(--v-muted);display:block;margin-bottom:2px;">Precio oferta</label>
                          <input type="number" step="0.01" placeholder="—" data-linea-precio="${l.key}"
                                style="width:100%;padding:5px 8px;border:1px solid var(--v-primary-15);border-radius:4px;font-size:0.8rem;">
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>
            <div class="v-field-error" id="form-error" style="margin-top:8px;"></div>
          </div>

          <div class="v-modal-footer">
            <button class="v-btn v-btn-ghost" type="button" data-close-modal>Cancelar</button>
            <button class="v-btn v-btn-primary" type="submit" id="btn-guardar-producto">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ============================================================
// CATÁLOGOS MAESTROS
// ============================================================
async function cargarCatalogos() {
  try {
    state.catalogos = await ProductosCRUDAPI.cargarCatalogos();
  } catch (e) {
    console.warn('[productos] catálogos:', e);
  }

  const setOpts = (id, items, labelFn, placeholder) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${esc(placeholder || '—')}</option>` +
      items.map(i => `<option value="${esc(i.id)}">${esc(labelFn(i))}</option>`).join('');
  };

  setOpts('p-familia', state.catalogos.familias, f => f.nombre, 'Selecciona familia…');
  setOpts('p-material', state.catalogos.materiales, m => m.nombre, 'Selecciona material…');
  setOpts('p-acabado', state.catalogos.acabados, a => a.nombre, 'Sin acabado');
  setOpts('p-borde', state.catalogos.bordes, b => b.nombre, 'Sin borde');
  setOpts('p-calidad', state.catalogos.calidades, c => c.nombre, 'Sin calidad');
  setOpts('p-unidad-venta', state.catalogos.unidades, u => u.simbolo || u.nombre, 'Sin unidad');

  ['p-unidad-largo', 'p-unidad-ancho', 'p-unidad-espesor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = state.catalogos.unidades
        .map(u => `<option value="${esc(u.id)}">${esc(u.simbolo || u.nombre)}</option>`)
        .join('');
    }
  });

  const filtroFam = document.getElementById('filtro-familia');
  if (filtroFam) {
    filtroFam.innerHTML = `<option value="">Todas las familias</option>` +
      state.catalogos.familias.map(f => `<option value="${esc(f.id)}">${esc(f.nombre)}</option>`).join('');
  }
}

// ============================================================
// CARGA DE PRODUCTOS
// ============================================================
async function cargarProductos() {
  if (state.cargando) return;
  state.cargando = true;

  try {
    const { datos, total } = await ProductosCRUDAPI.listar({
      pagina: state.pagina,
      porPagina: state.porPagina,
      ordenarPor: 'nombre',
      orden: 'asc',
      buscar: state.buscar || null,
      familia_id: state.familia_id || null,
      linea: state.linea || null,
      activo: state.activo === '' ? null : state.activo === 'true',
      contar: true
    });

    state.datos = datos;
    state.total = total;

    const totalPaginas = Math.max(1, Math.ceil(total / state.porPagina));
    if (state.pagina > totalPaginas) {
      state.pagina = totalPaginas;
      state.cargando = false;
      return cargarProductos();
    }

    renderProductos();
    renderPagination();
  } catch (e) {
    console.error('[productos] error:', e);
    const tbody = $('#tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--danger);">Error al cargar. Reintenta.</td></tr>`;
  } finally {
    state.cargando = false;
  }
}

// ============================================================
// RENDER: decide tabla o cards según state.vista
// ============================================================
function renderProductos() {
  const tbody = $('#tbody');
  const cardsContainer = $('#cards-container');
  const tableWrapper = $('#table-wrapper');
  const empty = $('#empty');
  const count = $('#count');
  if (!tbody) return;

  if (count) count.textContent = `${state.total} producto${state.total === 1 ? '' : 's'}`;

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

    tbody.innerHTML = state.datos.map(p => `
      <tr data-id="${esc(p.id)}">
        <td><span class="v-cell-ref">${esc(p.sku || '—')}</span></td>
        <td><span class="v-cell-name" title="${esc(p.nombre || '')}">${esc(p.nombre || '—')}</span></td>
        <td>${esc(p.familia?.nombre || '—')}</td>
        <td>
          ${p.precio == null || Number(p.precio) === 0
            ? `<span style="color:var(--v-muted);font-size:0.8rem;">Consultar</span>`
            : `${soles(p.precio)} <span style="font-size:0.7rem;color:var(--v-muted);">${esc(p.moneda || 'PEN')}</span>`}
        </td>
        <td>${chipsLineas(p.lineas)}</td>
        <td>
          ${p.stock === null || p.stock === undefined
            ? '<span style="color:var(--v-muted);font-size:0.75rem;">Consultar</span>'
            : p.stock === 0
              ? '<span style="color:var(--danger);font-size:0.75rem;">Agotado</span>'
              : Number(p.stock).toLocaleString('es-PE')}
        </td>
        <td>${badgeActivo(p.activo)}</td>
        <td>
          <div class="v-row-actions">
            ${state.puedeEditar
              ? `<button class="v-icon-btn" data-accion="editar" data-id="${esc(p.id)}" title="Editar" aria-label="Editar producto ${esc(p.nombre || '')}">${ICONS.pencil}</button>`
              : ''}
            ${state.puedeEliminar
              ? `<button class="v-icon-btn v-icon-btn-danger" data-accion="eliminar" data-id="${esc(p.id)}" title="Eliminar" aria-label="Eliminar producto ${esc(p.nombre || '')}">${ICONS.trash}</button>`
              : ''}
          </div>
        </td>
      </tr>
    `).join('');

    enlazarAcciones(tbody);
  } else {
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = '';

    cardsContainer.innerHTML = state.datos.map(p => renderCardProducto(p)).join('');
    enlazarCards(cardsContainer);
  }
}

// ============================================================
// CARD DE PRODUCTO
// ============================================================
function renderCardProducto(p) {
  const img = driveImg(p.imagen_url);
  const precio = p.precio == null || Number(p.precio) === 0
    ? `<span style="color:var(--v-muted);">Consultar</span>`
    : soles(p.precio);

  return `
    <article class="v-producto-card" data-id="${esc(p.id)}">
      <div class="v-producto-card__media">
        ${img
          ? `<img src="${esc(img)}" alt="${esc(p.nombre || '')}" loading="lazy">`
          : `<div class="v-producto-card__placeholder">${ICONS.package}</div>`}
      </div>
      <div class="v-producto-card__body">
        <div class="v-producto-card__head">
          <span class="v-producto-card__sku">${esc(p.sku || '—')}</span>
          ${p.destacado ? '<span class="v-badge v-badge-calificado">Destacado</span>' : ''}
        </div>
        <h3 class="v-producto-card__title" title="${esc(p.nombre || '')}">${esc(p.nombre || '—')}</h3>
        <div class="v-producto-card__meta">${esc(p.familia?.nombre || '—')}</div>
        <div class="v-producto-card__price">
          ${precio} <span class="v-producto-card__unit">${esc(p.moneda || 'PEN')}</span>
        </div>
        <div class="v-producto-card__badges">
          ${chipsLineas(p.lineas)}
          ${badgeActivo(p.activo)}
        </div>
        <div class="v-producto-card__actions">
          ${state.puedeEditar
            ? `<button class="v-icon-btn" data-accion="editar" data-id="${esc(p.id)}" title="Editar" aria-label="Editar producto ${esc(p.nombre || '')}">${ICONS.pencil}</button>`
            : ''}
          ${state.puedeEliminar
            ? `<button class="v-icon-btn v-icon-btn-danger" data-accion="eliminar" data-id="${esc(p.id)}" title="Eliminar" aria-label="Eliminar producto ${esc(p.nombre || '')}">${ICONS.trash}</button>`
            : ''}
        </div>
      </div>
    </article>
  `;
}

function enlazarCards(cardsContainer) {
  if (!cardsContainer) return;

  cardsContainer.addEventListener('click', async (e) => {
    const editarBtn = e.target.closest('[data-accion="editar"]');
    if (editarBtn) {
      e.stopPropagation();
      abrirModal(editarBtn.dataset.id);
      return;
    }

    const eliminarBtn = e.target.closest('[data-accion="eliminar"]');
    if (eliminarBtn) {
      e.stopPropagation();
      const id = eliminarBtn.dataset.id;
      const row = state.datos.find(d => String(d.id) === String(id));
      const ok = await confirmarEliminar(row?.nombre || 'este producto');
      if (!ok) return;
      eliminarBtn.disabled = true;
      try {
        await ProductosCRUDAPI.eliminar(id);
        GM.toast('Producto eliminado', 'success');
        await cargarProductos();
      } catch (err) {
        console.error(err);
        GM.toast('No se pudo eliminar', 'error');
        eliminarBtn.disabled = false;
      }
      return;
    }

    const card = e.target.closest('.v-producto-card');
    if (card && !e.target.closest('button, a, input, select')) {
      abrirDrawerProducto(card.dataset.id);
    }
  });
}

// ============================================================
// ACCIONES INLINE (tabla)
// ============================================================
function enlazarAcciones(tbody) {
  if (!tbody) return;

  $$('[data-accion="editar"]', tbody).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModal(btn.dataset.id);
    });
  });

  $$('[data-accion="eliminar"]', tbody).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const row = state.datos.find(d => String(d.id) === String(id));
      const nombre = row?.nombre || 'este producto';

      const ok = await confirmarEliminar(nombre);
      if (!ok) return;

      btn.disabled = true;
      try {
        await ProductosCRUDAPI.eliminar(id);
        GM.toast('Producto eliminado', 'success');
        await cargarProductos();
      } catch (err) {
        console.error(err);
        GM.toast('No se pudo eliminar', 'error');
        btn.disabled = false;
      }
    });
  });

  $$('tr[data-id]', tbody).forEach(tr => {
    tr.classList.add('v-row-clickable');
    tr.addEventListener('click', (e) => {
      if (e.target.closest('button, select, a, input')) return;
      abrirDrawerProducto(tr.dataset.id);
    });
  });
}

// ============================================================
// MODAL DE CONFIRMACIÓN (eliminar)
// ============================================================
function confirmarEliminar(nombre) {
  return new Promise((resolve) => {
    document.getElementById('modal-confirm-producto')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-confirm-producto';
    modal.className = 'v-modal-backdrop open';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-producto-title');
    modal.setAttribute('aria-describedby', 'confirm-producto-desc');

    modal.innerHTML = `
      <div class="v-modal v-confirm-modal" style="max-width:440px;">
        <div class="v-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 class="v-confirm-title" id="confirm-producto-title">Eliminar producto</h2>
        <p class="v-confirm-desc" id="confirm-producto-desc">
          ¿Estás seguro que quieres eliminar <strong>"${esc(nombre)}"</strong>?
        </p>
        <p class="v-confirm-warning">Esta acción no se puede deshacer.</p>
        <div class="v-confirm-footer">
          <button class="v-btn v-btn-ghost" type="button" data-cancel>Cancelar</button>
          <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Eliminar producto</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    const btnCancel = modal.querySelector('[data-cancel]');
    const btnConfirm = modal.querySelector('[data-confirm]');
    const focusReturn = document.activeElement;

    const cerrar = (resultado) => {
      document.removeEventListener('keydown', onKey);
      modal.remove();
      document.body.classList.remove('modal-open');
      if (focusReturn && typeof focusReturn.focus === 'function') {
        try { focusReturn.focus(); } catch (e) {}
      }
      resolve(resultado);
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

    btnCancel.addEventListener('click', () => cerrar(false));
    btnConfirm.addEventListener('click', () => cerrar(true));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrar(false);
    });

    setTimeout(() => btnCancel.focus(), 50);
  });
}

// ============================================================
// MODAL DE CONFIRMACIÓN (descartar cambios)
// ============================================================
function marcarFormDirty() { formDirty = true; }
function resetFormDirty() { formDirty = false; }
function hayCambiosSinGuardar() { return formDirty === true; }

function enlazarCambiosForm() {
  const form = document.getElementById('form-producto');
  if (!form) return;
  const onDirty = () => marcarFormDirty();
  form.addEventListener('input', onDirty);
  form.addEventListener('change', onDirty);
}

function confirmarDescartarCambios() {
  if (!hayCambiosSinGuardar()) return Promise.resolve(true);

  return new Promise((resolve) => {
    document.getElementById('modal-confirm-descartar')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-confirm-descartar';
    modal.className = 'v-modal-backdrop open';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-descartar-title');
    modal.setAttribute('aria-describedby', 'confirm-descartar-desc');

    modal.innerHTML = `
      <div class="v-modal v-confirm-modal" style="max-width:440px;">
        <div class="v-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 class="v-confirm-title" id="confirm-descartar-title">Cambios sin guardar</h2>
        <p class="v-confirm-desc" id="confirm-descartar-desc">
          Tienes cambios que aún no se han guardado.<br>
          Si cierras ahora, <strong>se perderán</strong>.
        </p>
        <p class="v-confirm-warning">Esta acción no se puede deshacer.</p>
        <div class="v-confirm-footer">
          <button class="v-btn v-btn-ghost" type="button" data-cancel>Seguir editando</button>
          <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Descartar cambios</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    const btnCancel = modal.querySelector('[data-cancel]');
    const btnConfirm = modal.querySelector('[data-confirm]');
    const focusReturn = document.activeElement;

    const cerrar = (resultado) => {
      document.removeEventListener('keydown', onKey);
      modal.remove();
      document.body.classList.remove('modal-open');
      if (focusReturn && typeof focusReturn.focus === 'function') {
        try { focusReturn.focus(); } catch (e) {}
      }
      resolve(resultado);
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

    btnCancel.addEventListener('click', () => cerrar(false));
    btnConfirm.addEventListener('click', () => cerrar(true));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrar(false);
    });

    setTimeout(() => btnCancel.focus(), 50);
  });
}

// ============================================================
// PAGINACIÓN
// ============================================================
function renderPagination() {
  const el = $('#pagination');
  if (!el) return;

  const totalPaginas = Math.max(1, Math.ceil(state.total / state.porPagina));
  const p = state.pagina;

  el.innerHTML = `
    <div class="v-pagination-info">
      ${state.total === 0 ? 'Sin resultados'
        : `Mostrando ${(p - 1) * state.porPagina + 1}–${Math.min(p * state.porPagina, state.total)} de ${state.total}`}
    </div>
    <div class="v-pagination-controls">
      <button class="v-page-btn" data-page="prev" ${p <= 1 ? 'disabled' : ''}>‹</button>
      <span style="font-size:0.8rem;color:var(--v-muted);padding:0 8px;">Página ${p} / ${totalPaginas}</span>
      <button class="v-page-btn" data-page="next" ${p >= totalPaginas ? 'disabled' : ''}>›</button>
    </div>
  `;

  el.querySelectorAll('[data-page]').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.page === 'prev' && p > 1) { state.pagina--; cargarProductos(); }
      if (b.dataset.page === 'next' && p < totalPaginas) { state.pagina++; cargarProductos(); }
    });
  });
}

// ============================================================
// EVENTOS BASE
// ============================================================
function enlazarEventosBase() {
  const buscar = $('#buscar');
  if (buscar) {
    buscar.addEventListener('input', () => {
      clearTimeout(debounceBuscar);
      debounceBuscar = setTimeout(() => {
        state.buscar = buscar.value.trim();
        state.pagina = 1;
        cargarProductos();
      }, 350);
    });
  }

  $('#filtro-familia')?.addEventListener('change', (e) => {
    state.familia_id = e.target.value;
    state.pagina = 1;
    cargarProductos();
  });
  $('#filtro-linea')?.addEventListener('change', (e) => {
    state.linea = e.target.value;
    state.pagina = 1;
    cargarProductos();
  });
  $('#filtro-activo')?.addEventListener('change', (e) => {
    state.activo = e.target.value;
    state.pagina = 1;
    cargarProductos();
  });

  $('#vista-tabla')?.addEventListener('click', () => cambiarVista('tabla'));
  $('#vista-cards')?.addEventListener('click', () => cambiarVista('cards'));

  $('#btn-nuevo')?.addEventListener('click', () => abrirModal());

  // Cancelar / × → confirmar si hay cambios
  $$('[data-close-modal]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmarDescartarCambios();
    if (ok) cerrarModal();
  }));

  // Click en backdrop
  $('#modal-producto')?.addEventListener('click', async (e) => {
    if (e.target.id !== 'modal-producto') return;
    const ok = await confirmarDescartarCambios();
    if (ok) cerrarModal();
  });

  // Escape
  document.addEventListener('keydown', async (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('modal-producto');
    if (!modal || !modal.classList.contains('open')) return;
    const ok = await confirmarDescartarCambios();
    if (ok) cerrarModal();
  });

  $('#form-producto')?.addEventListener('submit', onSubmit);
}

// ============================================================
// MODAL CREAR/EDITAR — ABRIR/CERRAR
// ============================================================
async function abrirModal(id = null) {
  state.editandoId = id;
  const modal = $('#modal-producto');
  if (!modal) return;

  const titulo = $('#modal-producto-title');
  if (titulo) titulo.textContent = id ? 'Editar producto' : 'Nuevo producto';

  limpiarForm();
  resetFormDirty();

  if (id) {
    try {
      const prod = await ProductosCRUDAPI.obtener(id);
      if (!prod) throw new Error('Producto no encontrado');
      rellenarForm(prod);
    } catch (e) {
      console.error(e);
      GM.toast('No se pudo cargar el producto', 'error');
      state.editandoId = null;
      return;
    }
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(() => $('#p-sku')?.focus(), 50);
}

function cerrarModal() {
  const modal = $('#modal-producto');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  resetFormDirty();
}

function limpiarForm() {
  const form = $('#form-producto');
  if (form) form.reset();

  $$('[data-linea]').forEach(c => { c.checked = false; });
  $$('[data-linea-precio]').forEach(inp => { inp.value = ''; });
  $$('[data-linea-stock]').forEach(inp => { inp.value = ''; });
  $$('[data-linea-stock-min]').forEach(inp => { inp.value = ''; });

  const activo = $('#p-activo'); if (activo) activo.checked = true;
  const piedra = $('#p-es-piedra'); if (piedra) piedra.checked = true;
  const mostrarC = $('#p-mostrar-caract'); if (mostrarC) mostrarC.checked = true;

  const err = $('#form-error'); if (err) { err.textContent = ''; err.classList.remove('visible'); }
  const btn = $('#btn-guardar-producto'); if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
}

function rellenarForm(prod) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

  set('p-sku', prod.sku);
  set('p-nombre', prod.nombre);
  set('p-descripcion', prod.descripcion);
  set('p-modelo', prod.modelo);
  set('p-origen', prod.origen);
  set('p-familia', prod.familia_id);
  set('p-material', prod.material_id);
  set('p-acabado', prod.acabado_id);
  set('p-borde', prod.borde_id);
  set('p-calidad', prod.calidad_id);
  set('p-largo', prod.largo);
  set('p-unidad-largo', prod.unidad_largo_id);
  set('p-ancho', prod.ancho);
  set('p-unidad-ancho', prod.unidad_ancho_id);
  set('p-espesor', prod.espesor);
  set('p-unidad-espesor', prod.unidad_espesor_id);
  set('p-precio', prod.precio);
  set('p-moneda', prod.moneda || 'PEN');
  set('p-unidad-venta', prod.unidad_venta_id);
  set('p-imagen', prod.imagen_url);
  set('p-imagen-alt', prod.imagen_alt);

  const toText = (arr) => Array.isArray(arr) ? arr.join('\n') : '';
  set('p-galeria-fotos', toText(prod.galeria_fotos));
  set('p-galeria-ambientadas', toText(prod.galeria_ambientadas));
  set('p-galeria-patrones', toText(prod.galeria_patrones));
  set('p-galeria-rangos', toText(prod.galeria_rangos));

  setCheck('p-destacado', prod.destacado);
  setCheck('p-activo', prod.activo);
  setCheck('p-es-piedra', prod.es_piedra_natural);
  setCheck('p-mostrar-caract', prod.mostrar_caracteristicas);
  setCheck('p-mostrar-var', prod.mostrar_variabilidad);

  (prod.lineas || []).forEach(l => {
    const cb = document.querySelector(`[data-linea="${l.linea}"]`);
    const precio = document.querySelector(`[data-linea-precio="${l.linea}"]`);
    const stock = document.querySelector(`[data-linea-stock="${l.linea}"]`);
    const stockMin = document.querySelector(`[data-linea-stock-min="${l.linea}"]`);

    if (cb) cb.checked = l.activo !== false;
    if (precio) precio.value = l.precio_oferta ?? '';
    if (stock) stock.value = l.stock ?? '';
    if (stockMin) stockMin.value = l.stock_minimo ?? '';
  });
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const errBox = $('#form-error');
  const btn = $('#btn-guardar-producto');

  if (!form.checkValidity()) { form.reportValidity(); return; }

  const fd = new FormData(form);
  const toArr = (str) => String(str || '').split('\n').map(s => s.trim()).filter(Boolean);

  const precioRaw = fd.get('precio');
  const precioNum = (precioRaw !== '' && precioRaw !== null) ? Number(precioRaw) : null;

  if (precioNum !== null && (isNaN(precioNum) || precioNum <= 0)) {
    const errPrecio = document.getElementById('err-precio');
    if (errPrecio) {
      errPrecio.textContent = 'El precio debe ser mayor a 0. Si no tiene precio, déjalo vacío.';
      errPrecio.classList.add('visible');
    }
    document.getElementById('p-precio')?.classList.add('input-error');
    return;
  }

  const errPrecio = document.getElementById('err-precio');
  if (errPrecio) {
    errPrecio.textContent = '';
    errPrecio.classList.remove('visible');
  }
  document.getElementById('p-precio')?.classList.remove('input-error');

  const datos = {
    sku: fd.get('sku'),
    nombre: fd.get('nombre'),
    descripcion: fd.get('descripcion'),
    modelo: fd.get('modelo'),
    origen: fd.get('origen'),
    familia_id: fd.get('familia_id'),
    material_id: fd.get('material_id'),
    acabado_id: fd.get('acabado_id'),
    borde_id: fd.get('borde_id'),
    calidad_id: fd.get('calidad_id'),
    largo: fd.get('largo'),
    unidad_largo_id: fd.get('unidad_largo_id'),
    ancho: fd.get('ancho'),
    unidad_ancho_id: fd.get('unidad_ancho_id'),
    espesor: fd.get('espesor'),
    unidad_espesor_id: fd.get('unidad_espesor_id'),
    precio: precioNum !== null ? precioNum : null,
    moneda: fd.get('moneda'),
    unidad_venta_id: fd.get('unidad_venta_id'),
    imagen_url: fd.get('imagen_url'),
    imagen_alt: fd.get('imagen_alt'),
    galeria_fotos: toArr(fd.get('galeria_fotos')),
    galeria_ambientadas: toArr(fd.get('galeria_ambientadas')),
    galeria_patrones: toArr(fd.get('galeria_patrones')),
    galeria_rangos: toArr(fd.get('galeria_rangos')),
    destacado: fd.get('destacado') === 'on',
    activo: fd.get('activo') === 'on',
    es_piedra_natural: fd.get('es_piedra_natural') === 'on',
    mostrar_caracteristicas: fd.get('mostrar_caracteristicas') === 'on',
    mostrar_variabilidad: fd.get('mostrar_variabilidad') === 'on'
  };

  const lineas = [];
  LINEAS_DISPONIBLES.forEach(l => {
    const cb = document.querySelector(`[data-linea="${l.key}"]`);
    const precio = document.querySelector(`[data-linea-precio="${l.key}"]`);
    const stock = document.querySelector(`[data-linea-stock="${l.key}"]`);
    const stockMin = document.querySelector(`[data-linea-stock-min="${l.key}"]`);

    if (cb?.checked) {
      lineas.push({
        linea: l.key,
        activo: true,
        precio_oferta: precio?.value ? Number(precio.value) : null,
        stock: stock?.value !== '' ? Number(stock.value) : null,
        stock_minimo: stockMin?.value !== '' ? Number(stockMin.value) : null
      });
    }
  });

  if (state.puedeLineas === false) {
    if (state.editandoId) {
      try {
        const actual = await ProductosCRUDAPI.obtener(state.editandoId);
        if (actual?.lineas) {
          lineas.length = 0;
          actual.lineas.forEach(l => lineas.push(l));
        }
      } catch (err) {
        console.warn('[productos] no se pudieron heredar las líneas:', err);
      }
    }
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  if (errBox) errBox.classList.remove('visible');

  try {
    if (state.editandoId) {
      await ProductosCRUDAPI.actualizar(state.editandoId, datos, lineas);
      GM.toast('Producto actualizado', 'success');
    } else {
      await ProductosCRUDAPI.crear(datos, lineas);
      GM.toast('Producto creado', 'success');
    }
    cerrarModal();
    await cargarProductos();
  } catch (err) {
    console.error(err);
    if (errBox) {
      errBox.textContent = err?.message || 'No se pudo guardar el producto';
      errBox.classList.add('visible');
    }
    GM.toast('Error al guardar', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}