// ventas/assets/js/leads.js
// Listado de leads adaptado al rol. Incluye: search Ctrl+K, drawer, notas,
// filtros rápidos, cards móvil, fecha relativa, undo de estado.
// Incluye: toggle tabla/cards con persistencia en localStorage.

import { renderVentasShell } from './ventas-shell.js';
import { LeadsAPI, VendedoresAPI, OrigenesAPI, NotasAPI, LeadsSearchAPI, LeadsCountAPI } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

// ============================================================
// CONSTANTES
// ============================================================
const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado'];
const PER_PAGE_OPCIONES = [10, 25, 50, 100];
const LS_PER_PAGE = 'gm.leads.perPage';
const LS_VISTA = 'gm.leads.vista';
const VISTAS_VALIDAS = ['tabla', 'cards'];

const state = {
  pagina: 1,
  porPagina: PER_PAGE_OPCIONES.includes(Number(localStorage.getItem(LS_PER_PAGE)))
    ? Number(localStorage.getItem(LS_PER_PAGE))
    : 25,
  total: 0,
  buscar: '',
  estado: '',
  origen_id: '',
  vendedor_id: '',
  filtroRapido: '',
  datos: [],
  vendedores: [],
  origenes: [],
  contadores: {},
  cargando: false,
  rolVista: 'asesor',
  esAdmin: false,
  esJefe: false,
  puedeCrear: false,
  puedeEditar: false,
  puedeAsignar: false,
  puedeEliminar: false,
  puedeNotas: true,
  draft: { estado: '', origen_id: '', vendedor_id: '' },
  leadActual: null,
  notas: [],
  fechaDesde: '',
  fechaHasta: '',
  sinAsignar: false,
  sinContactar3d: false,
  vista: VISTAS_VALIDAS.includes(localStorage.getItem(LS_VISTA))
    ? localStorage.getItem(LS_VISTA)
    : 'tabla'
};

let usuarioActual = null;
let debounceBuscar = null;
let currentLoadId = 0;
let undoActual = null;

// ============================================================
// HELPERS
// ============================================================
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function badgeEstado(estado) {
  const map = {
    Nuevo: 'v-badge-nuevo',
    Contactado: 'v-badge-contactado',
    Calificado: 'v-badge-calificado',
    Convertido: 'v-badge-convertido',
    Descartado: 'v-badge-descartado'
  };
  return `<span class="v-badge ${map[estado] || 'v-badge-descartado'}">${esc(estado || '—')}</span>`;
}

function fechaRelativa(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH < 24) return `hace ${diffH} h`;
    if (diffD === 1) return 'ayer';
    if (diffD < 7) return `hace ${diffD} días`;
    return d.toLocaleDateString('es-PE', {
            timeZone: 'America/Lima',
            day: '2-digit', month: 'short', year: '2-digit'
          });
  } catch { return '—'; }
}

function fechaExacta(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
}

function inicialesLead(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function contarProductos(productos) {
  if (productos == null) return 0;
  if (Array.isArray(productos)) return productos.length;
  if (typeof productos === 'string') {
    try { const p = JSON.parse(productos); return Array.isArray(p) ? p.length : 0; } catch { return 0; }
  }
  if (typeof productos === 'object') return 1;
  return 0;
}

function refDeLead(row) {
  if (row.referencia) return row.referencia;
  if (row.id) return String(row.id).slice(0, 8);
  return '—';
}

function nombreVendedor(v) {
  if (!v) return '';
  return v.nombre_completo || v.nombre || v.email || 'Vendedor';
}

function telefonoLimpio(tel) {
  return String(tel || '').replace(/[^\d+]/g, '');
}

function toast(msg, tipo = 'info') {
  try { GM.toast(msg, tipo); } catch { console.log(`[toast:${tipo}] ${msg}`); }
}

function urlProductoPublico(sku) {
  if (!sku) return null;
  const path = `/familia/producto.html?sku=${encodeURIComponent(sku)}`;
  try { return new URL(path, window.location.origin).toString(); }
  catch { return path; }
}

// ============================================================
// ICONOS SVG
// ============================================================
const ICONS = {
  phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  whatsapp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
  mail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  note: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  package: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  building: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>`,
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  table: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
  grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`
};

function waUrl(telefono) {
  let tel = telefonoLimpio(telefono);
  tel = tel.replace(/^\+/, '');
  if (!tel.startsWith('51') && tel.length === 9) tel = '51' + tel;
  return `https://wa.me/${tel}`;
}

function botonContacto(href, icon, label, extraAttrs = '') {
  return `<a class="v-contact-btn" href="${esc(href)}" title="${esc(label)}" aria-label="${esc(label)}" ${extraAttrs}>${icon}</a>`;
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const rolVista = document.body.dataset.rol;
  if (!rolVista) {
    console.error('[leads] falta data-rol en <body>');
    document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#a63d33;">Error de configuración: data-rol no definido en el HTML.</div>';
    return;
  }

  const esAdmin = rolVista === 'admin';
  const esJefe = rolVista === 'jefe';
  const esGestor = esAdmin || esJefe;

  let usuario;
  try {
    usuario = await renderVentasShell({
      active: 'leads',
      title: rolVista === 'asesor' ? 'Mis leads' : 'Leads',
      crumb: 'CRM / Leads',
      roles: [rolVista, 'admin'],
      permisos: ['leads.ver']
    });
  } catch (e) {
    console.error('[leads] shell:', e);
    document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#a63d33;">Error al cargar la página. Recarga o contacta al administrador.</div>';
    return;
  }
  if (!usuario) return;

  usuarioActual = usuario;
  state.rolVista = rolVista;
  state.esAdmin = esAdmin;
  state.esJefe = esJefe;
  const permisos = Array.isArray(usuario.permisos) ? usuario.permisos : [];
  state.puedeCrear = esGestor || permisos.includes('leads.crear');
  state.puedeEditar = esGestor || permisos.includes('leads.editar');
  state.puedeAsignar = esGestor || permisos.includes('leads.asignar');
  state.puedeEliminar = esGestor || permisos.includes('leads.eliminar');

  await cargarCatalogos();

  montarVista();
  enlazarEventosBase();
  enlazarBusquedaGlobal();
  actualizarToggleVista();
  await Promise.all([cargarLeads(), cargarContadores()]);
  abrirModalSiSePide();
})();

// ============================================================
// VISTA
// ============================================================
function montarVista() {
  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <div class="v-quick-filters" id="quick-filters"></div>

    <div class="v-toolbar">
      <div class="v-search">
        <input id="buscar" type="search" placeholder="Buscar por nombre, empresa, email o teléfono…" autocomplete="off">
      </div>

      ${(state.rolVista === 'marketing' || state.rolVista === 'jefe' || state.rolVista === 'admin' || state.rolVista === 'gerencia') ? `
        <div class="v-date-range" id="date-range">
          <label class="v-date-label">
            <span>Desde</span>
            <input type="date" id="fecha-desde" class="v-date-input" value="${esc(state.fechaDesde)}">
          </label>
          <label class="v-date-label">
            <span>Hasta</span>
            <input type="date" id="fecha-hasta" class="v-date-input" value="${esc(state.fechaHasta)}">
          </label>
          <button class="v-date-clear" id="date-clear" type="button" title="Limpiar fechas" aria-label="Limpiar fechas">×</button>
        </div>
      ` : ''}

      ${(state.rolVista === 'jefe' || state.rolVista === 'admin' || state.rolVista === 'gerencia') ? `
        <select class="v-select-estado" id="filtro-vendedor-toolbar" aria-label="Filtrar por vendedor" style="min-width:180px;border-radius:999px;">
          <option value="">Todos los vendedores</option>
          ${state.vendedores.map(v => `<option value="${esc(v.id)}" ${String(state.vendedor_id) === String(v.id) ? 'selected' : ''}>${esc(nombreVendedor(v))}</option>`).join('')}
        </select>
      ` : ''}

      <div class="v-view-toggle" role="group" aria-label="Cambiar vista">
        <button type="button" id="vista-tabla" aria-label="Vista en tabla" aria-pressed="true" title="Vista en tabla">
          ${ICONS.table}
        </button>
        <button type="button" id="vista-cards" aria-label="Vista en cards" aria-pressed="false" title="Vista en cards">
          ${ICONS.grid}
        </button>
      </div>

      <button class="v-filter-btn" id="btn-filtros" type="button">
        Filtros <span id="filtros-count"></span>
      </button>
      <span class="v-count" id="count" aria-live="polite">—</span>
      ${state.puedeCrear
        ? `<button class="v-btn v-btn-gold" id="btn-nuevo" type="button">+ Nuevo lead</button>`
        : ''}
    </div>

    <div class="v-chips-activos" id="chips"></div>

    <div class="v-panel">
      <!-- Vista tabla (desktop) -->
      <div class="v-table-wrapper v-table-desktop" id="table-wrapper">
        <table class="v-table">
          <thead>
            <tr>
              <th>Ref.</th>
              <th>Lead</th>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>Origen</th>
              <th>Vendedor</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="9" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Vista cards -->
      <div class="v-leads-cards" id="cards-container" style="display:none;"></div>

      <div class="v-empty v-hidden" id="empty">
        <div class="v-empty-icon">◇</div>
        <div class="v-empty-title">Sin leads</div>
        <div class="v-empty-text" id="empty-text">No hay resultados con los filtros actuales.</div>
      </div>

      <div class="v-pagination" id="pagination"></div>
    </div>

    ${state.puedeCrear
      ? `<button class="v-fab" id="btn-nuevo-fab" type="button" aria-label="Nuevo lead">+</button>`
      : ''}

    <div class="v-sheet-backdrop" id="sheet-backdrop"></div>
    <div class="v-sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="v-sheet-header">
        <h2 class="v-sheet-title" id="sheet-title">Filtros</h2>
        <button class="v-sheet-close" type="button" id="sheet-close" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="v-sheet-body">
        <div class="v-filtro-grupo">
          <h3 class="v-filtro-titulo">Estado</h3>
          <div class="v-filtro-opciones" id="filtro-estado"></div>
        </div>
        <div class="v-filtro-grupo">
          <h3 class="v-filtro-titulo">Origen</h3>
          <div class="v-filtro-opciones" id="filtro-origen"></div>
        </div>
        ${state.puedeAsignar ? `
          <div class="v-filtro-grupo">
            <h3 class="v-filtro-titulo">Vendedor</h3>
            <div class="v-filtro-opciones" id="filtro-vendedor"></div>
          </div>
        ` : ''}
      </div>
      <div class="v-sheet-footer">
        <button class="v-btn v-btn-ghost" type="button" id="sheet-limpiar">Limpiar</button>
        <button class="v-btn v-btn-primary" type="button" id="sheet-aplicar" style="flex:1;">Aplicar</button>
      </div>
    </div>

    <div class="v-drawer-backdrop" id="drawer-backdrop"></div>
    <aside class="v-drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-hidden="true">
      <div class="v-drawer-header">
        <h2 class="v-drawer-title" id="drawer-title">Lead</h2>
        <button class="v-drawer-close" type="button" id="drawer-close" aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="v-drawer-body" id="drawer-body"></div>
    </aside>

    <div class="v-modal-backdrop" id="modal-lead" role="dialog" aria-modal="true" aria-labelledby="modal-lead-title" aria-hidden="true">
      <div class="v-modal">
        <div class="v-modal-header">
          <h2 class="v-modal-title" id="modal-lead-title">Nuevo lead</h2>
          <button class="v-modal-close" type="button" data-close-modal aria-label="Cerrar">${ICONS.close}</button>
        </div>
        <form id="form-lead" class="v-modal-body" novalidate>
          <div class="v-form-grid">
            <div class="v-field">
              <label for="lead-nombre">Nombre <span class="required">*</span></label>
              <input id="lead-nombre" name="nombre" type="text" required minlength="3" autocomplete="off">
            </div>
            <div class="v-field">
              <label for="lead-empresa">Empresa</label>
              <input id="lead-empresa" name="empresa" type="text" autocomplete="off">
            </div>
            <div class="v-field">
              <label for="lead-telefono">Teléfono <span class="required">*</span></label>
              <input id="lead-telefono" name="telefono" type="tel" required autocomplete="off">
            </div>
            <div class="v-field">
              <label for="lead-email">Email</label>
              <input id="lead-email" name="email" type="email" autocomplete="off">
            </div>
            <div class="v-field">
              <label for="lead-origen">Origen</label>
              <select id="lead-origen" name="origen_id"><option value="">Cargando…</option></select>
            </div>
            ${state.puedeAsignar ? `
              <div class="v-field">
                <label for="lead-vendedor">Vendedor</label>
                <select id="lead-vendedor" name="vendedor_id"></select>
              </div>
            ` : ''}
            <div class="v-field full">
              <label for="lead-mensaje">Mensaje</label>
              <textarea id="lead-mensaje" name="mensaje" rows="3"></textarea>
            </div>
          </div>
          <div class="v-field-error" id="form-error"></div>
        </form>
        <div class="v-modal-footer">
          <button class="v-btn v-btn-ghost" type="button" data-close-modal>Cancelar</button>
          <button class="v-btn v-btn-primary" type="submit" form="form-lead" id="btn-guardar-lead">Guardar</button>
        </div>
      </div>
    </div>

    <div class="v-palette-backdrop" id="palette-backdrop">
      <div class="v-palette" role="dialog" aria-modal="true" aria-label="Búsqueda rápida">
        <input class="v-palette-input" id="palette-input" type="search" placeholder="Buscar lead por nombre, empresa, email o teléfono…" autocomplete="off">
        <div class="v-palette-results" id="palette-results"></div>
        <div class="v-palette-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  `;

  renderFiltrosRapidos();
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

function cambiarVista(nueva) {
  if (!VISTAS_VALIDAS.includes(nueva)) return;
  if (state.vista === nueva) return;
  state.vista = nueva;
  try { localStorage.setItem(LS_VISTA, nueva); } catch (e) {}
  actualizarToggleVista();
  renderLista();
}

// ============================================================
// CATÁLOGOS
// ============================================================
async function cargarCatalogos() {
  try {
    const [vendedores, origenes] = await Promise.all([
      VendedoresAPI.listar().catch(() => []),
      OrigenesAPI.listar().catch(() => [])
    ]);
    state.vendedores = Array.isArray(vendedores) ? vendedores : [];
    state.origenes = Array.isArray(origenes) ? origenes : [];
  } catch (e) {
    console.warn('[leads] catálogos:', e);
  }

  pintarSelectoresModal();
  pintarFiltroVendedorToolbar();
  renderFiltrosSheet();
}

function pintarFiltroVendedorToolbar() {
  const sel = $('#filtro-vendedor-toolbar');
  if (!sel) return;
  const seleccionado = sel.value || state.vendedor_id || '';
  sel.innerHTML = `
    <option value="">Todos los vendedores</option>
    ${state.vendedores.map(v => `
      <option value="${esc(v.id)}" ${String(seleccionado) === String(v.id) ? 'selected' : ''}>
        ${esc(nombreVendedor(v))}
      </option>
    `).join('')}
  `;
}

function pintarSelectoresModal() {
  const selOrigen = $('#lead-origen');
  const selVend = $('#lead-vendedor');

  if (selOrigen) {
    selOrigen.innerHTML = `<option value="">— Sin origen —</option>` +
      state.origenes.map(o => `<option value="${esc(o.id)}">${esc(o.nombre || o.descripcion || 'Origen')}</option>`).join('');
  }

  if (selVend) {
    selVend.innerHTML = `<option value="">Sin asignar</option>` +
      state.vendedores.map(v => `<option value="${esc(v.id)}">${esc(nombreVendedor(v))}</option>`).join('');
  }
}

// ============================================================
// CONTADORES
// ============================================================
async function cargarContadores() {
  try {
    if (state.rolVista === 'asesor') {
      const vendedorId = usuarioActual?.perfil?.vendedor_id;
      if (!vendedorId) return;
      state.contadores = await LeadsCountAPI.contadoresAsesor(vendedorId);
      actualizarBadgeSidebar(state.contadores.nuevos || 0);
    } else if (state.rolVista === 'jefe' || state.rolVista === 'admin') {
      state.contadores = await LeadsCountAPI.contadoresEquipo();
      actualizarBadgeSidebar(state.contadores.sinAsignar || 0);
    } else if (state.rolVista === 'gerencia') {
      state.contadores = await LeadsCountAPI.contadoresEquipo();
    }
    renderFiltrosRapidos();
  } catch (e) {
    console.warn('[leads] contadores:', e);
  }
}

function actualizarBadgeSidebar(n) {
  const badge = document.querySelector('.v-nav-badge[data-badge="leads"]');
  if (badge) {
    if (n > 0) {
      badge.textContent = n;
      badge.style.display = 'inline-flex';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
    return;
  }
  const nav = document.querySelector('.v-nav-item[data-key="leads"]');
  if (!nav) return;
  let b = nav.querySelector('.v-nav-badge');
  if (!b) {
    b = document.createElement('span');
    b.className = 'v-nav-badge';
    nav.appendChild(b);
  }
  b.textContent = n > 0 ? n : '';
  b.style.display = n > 0 ? 'inline-flex' : 'none';
}

// ============================================================
// FILTROS RÁPIDOS
// ============================================================
function renderFiltrosRapidos() {
  const el = $('#quick-filters');
  if (!el) return;

  const c = state.contadores || {};
  let chips = [];

  if (state.rolVista === 'asesor') {
    chips = [
      { key: 'nuevos', label: 'Mis leads nuevos', count: c.nuevos, filtro: { estado: 'Nuevo' } },
      { key: 'sinContactar', label: 'Sin contactar', count: c.sinContactar, filtro: { estado: 'Nuevo' } },
      { key: 'seguimientoHoy', label: 'Seguimiento hoy', count: c.seguimientoHoy, filtro: { proximo: 'hoy' } },
      { key: 'cerradosSemana', label: 'Cerrados esta semana', count: c.cerradosSemana, filtro: { estado: 'Convertido' } },
      { key: 'descartados', label: 'Descartados', count: c.descartados, filtro: { estado: 'Descartado' } }
    ];
  } else if (state.rolVista === 'marketing') {
    chips = [
      { key: 'todos', label: 'Todo el tiempo', count: state.total, filtro: { fecha: null } },
      { key: 'ultimos7', label: 'Últimos 7 días', count: null, filtro: { fecha: '7d' } },
      { key: 'ultimos30', label: 'Últimos 30 días', count: null, filtro: { fecha: '30d' } },
      { key: 'nuevos', label: 'Nuevos', count: c.nuevos, filtro: { estado: 'Nuevo' } },
      { key: 'convertidos', label: 'Convertidos', count: c.cerradosSemana, filtro: { estado: 'Convertido' } },
      { key: 'descartados', label: 'Descartados', count: c.descartados, filtro: { estado: 'Descartado' } }
    ];
  } else if (state.rolVista === 'jefe' || state.rolVista === 'admin') {
    chips = [
      { key: 'todos', label: 'Todos los leads', count: state.total, filtro: {} },
      { key: 'sinAsignar', label: 'Sin asignar', count: c.sinAsignar, filtro: { sinAsignar: true } },
      { key: 'nuevos', label: 'Nuevos esta semana', count: c.nuevosEstaSemana, filtro: { fecha: '7d', estado: 'Nuevo' } },
      { key: 'sinContactar3d', label: 'Sin contactar > 3d', count: c.sinContactar3d, filtro: { sinContactar3d: true } },
      { key: 'convertidos', label: 'Convertidos (semana)', count: c.cerradosSemana, filtro: { estado: 'Convertido', fecha: '7d' } }
    ];
  } else if (state.rolVista === 'gerencia') {
    chips = [
      { key: 'todos', label: 'Todo el tiempo', count: state.total, filtro: {} },
      { key: 'ultimos7', label: 'Últimos 7 días', count: null, filtro: { fecha: '7d' } },
      { key: 'ultimos30', label: 'Últimos 30 días', count: null, filtro: { fecha: '30d' } },
      { key: 'ultimos90', label: 'Últimos 90 días', count: null, filtro: { fecha: '90d' } },
      { key: 'convertidos', label: 'Convertidos', count: c.convertidos, filtro: { estado: 'Convertido' } },
      { key: 'descartados', label: 'Descartados', count: c.descartados, filtro: { estado: 'Descartado' } }
    ];
  } else {
    chips = [
      { key: 'nuevos', label: 'Nuevos', count: c.nuevos, filtro: { estado: 'Nuevo' } },
      { key: 'convertidos', label: 'Convertidos', count: c.cerradosSemana, filtro: { estado: 'Convertido' } },
      { key: 'descartados', label: 'Descartados', count: c.descartados, filtro: { estado: 'Descartado' } }
    ];
  }

  el.innerHTML = chips.map(ch => `
    <button class="v-quick-chip ${state.filtroRapido === ch.key ? 'active' : ''}"
            data-quick="${ch.key}" type="button">
      ${esc(ch.label)}
      ${ch.count != null ? `<span class="v-quick-count">${ch.count}</span>` : ''}
    </button>
  `).join('');
}

function aplicarFiltroRapido() {
  const mapAsesor = {
    nuevos: { estado: 'Nuevo', proximo: null },
    sinContactar: { estado: 'Nuevo', proximo: null },
    seguimientoHoy: { estado: '', proximo: 'hoy' },
    cerradosSemana: { estado: 'Convertido', proximo: null },
    descartados: { estado: 'Descartado', proximo: null }
  };
  const mapMarketing = {
    todos: { estado: '', fecha: null },
    ultimos7: { estado: '', fecha: '7d' },
    ultimos30: { estado: '', fecha: '30d' },
    nuevos: { estado: 'Nuevo', fecha: null },
    convertidos: { estado: 'Convertido', fecha: null },
    descartados: { estado: 'Descartado', fecha: null }
  };
  const mapJefe = {
    todos: { estado: '', fecha: null, sinAsignar: false, sinContactar3d: false },
    sinAsignar: { estado: '', fecha: null, sinAsignar: true, sinContactar3d: false },
    nuevos: { estado: 'Nuevo', fecha: '7d', sinAsignar: false, sinContactar3d: false },
    sinContactar3d: { estado: '', fecha: null, sinAsignar: false, sinContactar3d: true },
    convertidos: { estado: 'Convertido', fecha: '7d', sinAsignar: false, sinContactar3d: false }
  };
  const mapGerencia = {
    todos: { estado: '', fecha: null },
    ultimos7: { estado: '', fecha: '7d' },
    ultimos30: { estado: '', fecha: '30d' },
    ultimos90: { estado: '', fecha: '90d' },
    convertidos: { estado: 'Convertido', fecha: null },
    descartados: { estado: 'Descartado', fecha: null }
  };

  const map = state.rolVista === 'asesor' ? mapAsesor
    : state.rolVista === 'marketing' ? mapMarketing
    : (state.rolVista === 'jefe' || state.rolVista === 'admin') ? mapJefe
    : state.rolVista === 'gerencia' ? mapGerencia
    : mapAsesor;

  const f = map[state.filtroRapido] || { estado: '', proximo: null, fecha: null, sinAsignar: false, sinContactar3d: false };
  state.estado = f.estado || '';
  state.proximoContacto = f.proximo || null;
  state.sinAsignar = f.sinAsignar || false;
  state.sinContactar3d = f.sinContactar3d || false;

  if (f.fecha === '7d') {
    state.fechaHasta = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() - 7);
    state.fechaDesde = d.toISOString().slice(0, 10);
  } else if (f.fecha === '30d') {
    state.fechaHasta = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() - 30);
    state.fechaDesde = d.toISOString().slice(0, 10);
  } else if (f.fecha === '90d') {
    state.fechaHasta = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() - 90);
    state.fechaDesde = d.toISOString().slice(0, 10);
  } else if (f.fecha === null) {
    state.fechaDesde = '';
    state.fechaHasta = '';
  }

  const inpDesde = $('#fecha-desde');
  const inpHasta = $('#fecha-hasta');
  if (inpDesde) inpDesde.value = state.fechaDesde;
  if (inpHasta) inpHasta.value = state.fechaHasta;

  state.pagina = 1;
  cargarLeads();
}

// ============================================================
// CARGA DE LEADS (con token de cancelación)
// ============================================================
async function cargarLeads() {
  const myLoadId = ++currentLoadId;

  const tbody = $('#tbody');
  const cardsContainer = $('#cards-container');
  if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>`;
  if (cardsContainer) cardsContainer.innerHTML = '';

  try {
    const vendedorForzado = state.rolVista === 'asesor' && usuarioActual?.perfil?.vendedor_id
      ? usuarioActual.perfil.vendedor_id
      : null;

    const { datos, total } = await LeadsAPI.listar({
      pagina: state.pagina,
      porPagina: state.porPagina,
      ordenarPor: 'creado_en',
      orden: 'desc',
      buscar: state.buscar || null,
      estado: state.estado || null,
      origen_id: state.origen_id || null,
      vendedor_id: vendedorForzado || state.vendedor_id || null,
      proximo_contacto_hoy: state.proximoContacto === 'hoy',
      fecha_desde: state.fechaDesde || null,
      fecha_hasta: state.fechaHasta || null,
      sinAsignar: state.sinAsignar || false,
      sinContactar3d: state.sinContactar3d || false,
      contar: true
    });

    if (myLoadId !== currentLoadId) return;

    state.datos = Array.isArray(datos) ? datos : [];
    state.total = Number(total) || 0;

    const totalPaginas = Math.max(1, Math.ceil(state.total / state.porPagina));
    if (state.pagina > totalPaginas) {
      state.pagina = totalPaginas;
      return cargarLeads();
    }

    renderLista();
    renderPagination();
    renderChips();
    actualizarContadorFiltros();
    renderFiltrosRapidos();
  } catch (e) {
    if (myLoadId !== currentLoadId) return;
    console.error('[leads] Error cargando:', e);
    toast('No se pudieron cargar los leads', 'error');
    const tbody = $('#tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--danger);">Error al cargar. Reintenta.</td></tr>`;
  }
}

// ============================================================
// RENDER PRINCIPAL: decide tabla o cards
// ============================================================
function renderLista() {
  const tbody = $('#tbody');
  const cardsContainer = $('#cards-container');
  const tableWrapper = $('#table-wrapper');
  const empty = $('#empty');
  const emptyText = $('#empty-text');
  const count = $('#count');
  if (!tbody) return;

  if (count) count.textContent = `${state.total} lead${state.total === 1 ? '' : 's'}`;

  if (state.datos.length === 0) {
    tbody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = '';
    if (emptyText) emptyText.textContent = 'No hay resultados con los filtros actuales.';
    if (empty) empty.classList.remove('v-hidden');
    return;
  }
  if (empty) empty.classList.add('v-hidden');

  if (state.vista === 'tabla') {
    if (tableWrapper) tableWrapper.style.display = '';
    if (cardsContainer) cardsContainer.style.display = 'none';

    tbody.innerHTML = state.datos.map(row => renderFilaTabla(row)).join('');
    enlazarAcciones(tbody);
    enlazarClickFila();
  } else {
    if (tableWrapper) tableWrapper.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = '';

    cardsContainer.innerHTML = state.datos.map(row => renderCardLead(row)).join('');
    enlazarAcciones(cardsContainer);
    enlazarCards(cardsContainer);
  }
}

// ============================================================
// FILA DE TABLA
// ============================================================
function renderFilaTabla(row) {
  const ref = esc(refDeLead(row));
  const nombre = esc(row.nombre || '—');
  const empresa = esc(row.empresa || '');
  const telefono = esc(row.telefono || '');
  const email = esc(row.email || '');
  const origen = esc(row.origen_nombre || '—');
  const idRow = esc(row.id);
  const ini = inicialesLead(row.nombre);
  const fecha = fechaRelativa(row.creado_en || row.fecha);
  const fechaFull = fechaExacta(row.creado_en || row.fecha);
  const estadoCls = `v-row-estado-${(row.estado || '').toLowerCase().replace(/\s+/g, '-')}`;

  return `
    <tr data-id="${idRow}" class="v-row-clickable ${estadoCls}">
      <td><span class="v-cell-ref">${ref}</span></td>
      <td>
        <div class="v-row-avatar-cell">
          <div class="v-avatar-ini">${esc(ini)}</div>
          <div style="min-width:0;">
            <div class="v-cell-name" title="${esc(row.nombre || '')}">${nombre}</div>
            <div class="v-cell-email">${email !== '' ? email : '—'}</div>
          </div>
        </div>
      </td>
      <td>${empresa ? `<div class="v-cell-company">${empresa}</div>` : '—'}</td>
      <td>
        <div class="v-cell-contacto">
          ${telefono ? botonContacto(`tel:${telefonoLimpio(telefono)}`, ICONS.phone, 'Llamar') : ''}
          ${telefono ? botonContacto(waUrl(telefono), ICONS.whatsapp, 'WhatsApp', 'target="_blank" rel="noopener"') : ''}
          ${email ? botonContacto(`mailto:${email}`, ICONS.mail, 'Email') : ''}
        </div>
      </td>
      <td>${origen}</td>
      <td>${state.puedeAsignar
        ? `<select class="v-select-vendedor" data-accion="vendedor" data-id="${idRow}" aria-label="Vendedor">
             <option value="">Sin asignar</option>
             ${state.vendedores.map(v => `<option value="${esc(v.id)}" ${String(row.vendedor_id) === String(v.id) ? 'selected' : ''}>${esc(nombreVendedor(v))}</option>`).join('')}
           </select>`
        : `<span style="color:var(--v-muted);font-size:0.8rem;">${esc(row.vendedor_nombre_completo || 'Sin asignar')}</span>`}
      </td>
      <td>
        ${state.puedeEditar
          ? `<select class="v-select-estado" data-accion="estado" data-id="${idRow}" aria-label="Estado">
              ${ESTADOS.map(e => `<option value="${e}" ${row.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>`
          : badgeEstado(row.estado)}
        ${row.proximo_contacto
          ? `<div class="v-proximo-hint" title="Próximo contacto">${ICONS.calendar} ${esc(row.proximo_contacto)}</div>`
          : ''}
      </td>
      <td>
        <span class="v-fecha-rel" title="${esc(fechaFull)}">${esc(fecha)}</span>
      </td>
      <td>
        <div class="v-row-actions">
          ${state.puedeEliminar
            ? `<button class="v-icon-btn v-icon-btn-danger" data-accion="eliminar" data-id="${idRow}" title="Eliminar lead" aria-label="Eliminar lead ${esc(row.nombre || '')}">
                ${ICONS.trash || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`}
              </button>`
            : ''}
        </div>
      </td>
    </tr>
  `;
}

// ============================================================
// CARD
// ============================================================
function renderCardLead(row) {
  const idRow = esc(row.id);
  const ini = inicialesLead(row.nombre);
  const telefono = row.telefono || '';
  const email = row.email || '';
  const estadoCls = `v-row-estado-${(row.estado || '').toLowerCase().replace(/\s+/g, '-')}`;

  return `
    <div class="v-lead-card ${estadoCls}" data-id="${idRow}">
      <div class="v-lead-card__head">
        <div class="v-avatar-ini">${esc(ini)}</div>
        <div class="v-lead-card__title-wrap">
          <div class="v-lead-card__name" title="${esc(row.nombre || '')}">${esc(row.nombre || '—')}</div>
          <div class="v-lead-card__company">${esc(row.empresa || '—')}</div>
        </div>
        ${badgeEstado(row.estado)}
      </div>

      <div class="v-lead-card__meta">
        <span>${esc(fechaRelativa(row.creado_en || row.fecha))}</span>
        ${row.origen_nombre ? `<span>· ${esc(row.origen_nombre)}</span>` : ''}
        ${row.vendedor_nombre_completo ? `<span>· ${esc(row.vendedor_nombre_completo)}</span>` : ''}
      </div>

      ${state.puedeEditar ? `
        <div class="v-lead-card__field">
          <label>Estado</label>
          <select class="v-select-estado" data-accion="estado" data-id="${idRow}" aria-label="Estado del lead ${esc(row.nombre || '')}">
            ${ESTADOS.map(e => `<option value="${e}" ${row.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      ${state.puedeAsignar ? `
        <div class="v-lead-card__field">
          <label>Vendedor</label>
          <select class="v-select-vendedor" data-accion="vendedor" data-id="${idRow}" aria-label="Vendedor del lead ${esc(row.nombre || '')}">
            <option value="">Sin asignar</option>
            ${state.vendedores.map(v => `<option value="${esc(v.id)}" ${String(row.vendedor_id) === String(v.id) ? 'selected' : ''}>${esc(nombreVendedor(v))}</option>`).join('')}
          </select>
        </div>
      ` : ''}

      <div class="v-lead-card__actions">
        ${telefono ? `<a class="v-card-btn" href="tel:${telefonoLimpio(telefono)}" aria-label="Llamar a ${esc(row.nombre || '')}">${ICONS.phone}</a>` : ''}
        ${telefono ? `<a class="v-card-btn" href="${waUrl(telefono)}" target="_blank" rel="noopener" aria-label="WhatsApp a ${esc(row.nombre || '')}">${ICONS.whatsapp}</a>` : ''}
        ${email ? `<a class="v-card-btn" href="mailto:${email}" aria-label="Email a ${esc(row.nombre || '')}">${ICONS.mail}</a>` : ''}
        <button class="v-card-btn v-card-ver" data-open="${idRow}">Ver →</button>
        ${state.puedeEliminar
          ? `<button class="v-card-btn v-icon-btn-danger" data-accion="eliminar" data-id="${idRow}" aria-label="Eliminar lead ${esc(row.nombre || '')}">
               ${ICONS.trash || '×'}
             </button>`
          : ''}
      </div>
    </div>
  `;
}

// ============================================================
// ACCIONES (delegación)
// ============================================================
function enlazarAcciones(root) {
  if (!root) return;

  root.addEventListener('change', async (e) => {
    const sel = e.target.closest('select[data-accion]');
    if (!sel) return;

    const accion = sel.dataset.accion;
    const id = sel.dataset.id;

    if (accion === 'estado') {
      const nuevo = sel.value;
      const row = state.datos.find(d => String(d.id) === String(id));
      const anterior = row?.estado;

      sel.disabled = true;
      try {
        await LeadsAPI.cambiarEstado(id, nuevo);
        if (row) row.estado = nuevo;
        toast(`Lead movido a ${nuevo}`, 'success');
        actualizarEstadoVisual(id, nuevo);
        mostrarUndo(id, anterior, nuevo);
      } catch (err) {
        console.error('[leads] cambiarEstado:', err);
        sel.value = anterior || '';
        toast('No se pudo cambiar el estado', 'error');
      } finally {
        sel.disabled = false;
      }
      return;
    }

    if (accion === 'vendedor') {
      const nuevoVendedorId = sel.value || null;
      sel.disabled = true;
      try {
        await LeadsAPI.reasignarVendedor(id, nuevoVendedorId);
        toast(nuevoVendedorId ? 'Vendedor asignado' : 'Lead sin asignar', 'success');
      } catch (err) {
        console.error(err);
        toast('No se pudo asignar', 'error');
      } finally {
        sel.disabled = false;
      }
    }
  });

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-accion="eliminar"]');
    if (!btn) return;
    e.stopPropagation();

    const id = btn.dataset.id;
    const row = state.datos.find(d => String(d.id) === String(id));
    const nombre = row?.nombre || 'este lead';

    const ok = await confirmarEliminar(nombre);
    if (!ok) return;

    btn.disabled = true;
    try {
      await LeadsAPI.eliminar(id);
      toast(`Lead "${nombre}" eliminado`, 'success');
      state.datos = state.datos.filter(d => String(d.id) !== String(id));
      state.total = Math.max(0, state.total - 1);
      renderLista();
      renderPagination();
      renderChips();
      await cargarContadores();
    } catch (err) {
      console.error('[leads] eliminar:', err);
      toast('No se pudo eliminar el lead', 'error');
      btn.disabled = false;
    }
  });
}

function actualizarEstadoVisual(id, nuevoEstado) {
  const tr = document.querySelector(`#tbody tr[data-id="${CSS.escape(id)}"]`);
  if (tr) {
    tr.className = tr.className.replace(/v-row-estado-\S+/g, '').trim()
      + ` v-row-estado-${nuevoEstado.toLowerCase().replace(/\s+/g, '-')}`;
  }
  const card = document.querySelector(`.v-lead-card[data-id="${CSS.escape(id)}"]`);
  if (card) {
    card.className = card.className.replace(/v-row-estado-\S+/g, '').trim()
      + ` v-row-estado-${nuevoEstado.toLowerCase().replace(/\s+/g, '-')}`;
  }
}

function enlazarClickFila() {
  $$('#tbody tr.v-row-clickable').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('select, a, button, input')) return;
      abrirDrawer(tr.dataset.id);
    });
  });
}

function enlazarCards(cardsContainer) {
  if (!cardsContainer) return;
  cardsContainer.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      abrirDrawer(openBtn.dataset.open);
      return;
    }
    const card = e.target.closest('.v-lead-card');
    if (card && !e.target.closest('button, a, select, input')) {
      abrirDrawer(card.dataset.id);
    }
  });
}

// ============================================================
// UNDO
// ============================================================
function mostrarUndo(leadId, estadoAnterior, estadoNuevo) {
  if (undoActual) {
    clearTimeout(undoActual.timer);
    undoActual.el?.remove();
  }

  const el = document.createElement('div');
  el.className = 'v-undo-toast';
  el.innerHTML = `
    <span>Movido a ${esc(estadoNuevo)}</span>
    <button type="button">Deshacer</button>
  `;
  document.body.appendChild(el);

  const cerrar = () => {
    if (undoActual?.timer) clearTimeout(undoActual.timer);
    el.remove();
    undoActual = null;
  };

  el.querySelector('button').addEventListener('click', async () => {
    try {
      await LeadsAPI.cambiarEstado(leadId, estadoAnterior);
      toast(`Restaurado a ${estadoAnterior}`, 'success');
      await cargarLeads();
    } catch (e) {
      toast('No se pudo deshacer', 'error');
    }
    cerrar();
  });

  undoActual = { timer: setTimeout(cerrar, 5000), el };
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
    <div class="v-pagination-size">
      <label for="per-page">Por página:</label>
      <select id="per-page">
        ${PER_PAGE_OPCIONES.map(n => `<option value="${n}" ${n === state.porPagina ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </div>
    <div class="v-pagination-info">
      ${state.total === 0 ? 'Sin resultados'
        : `Mostrando ${(p - 1) * state.porPagina + 1}–${Math.min(p * state.porPagina, state.total)} de ${state.total}`}
    </div>
    <div class="v-pagination-buttons">
      <button class="v-page-btn" data-page="prev" ${p <= 1 ? 'disabled' : ''}>‹</button>
      <span class="v-page-info">Página ${p} / ${totalPaginas}</span>
      <button class="v-page-btn" data-page="next" ${p >= totalPaginas ? 'disabled' : ''}>›</button>
    </div>
  `;

  $('#per-page', el)?.addEventListener('change', (ev) => {
    const nuevo = Number(ev.target.value);
    if (!PER_PAGE_OPCIONES.includes(nuevo)) return;
    state.porPagina = nuevo;
    state.pagina = 1;
    try { localStorage.setItem(LS_PER_PAGE, String(nuevo)); } catch {}
    cargarLeads();
  });

  $$('[data-page]', el).forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.page === 'prev' && p > 1) { state.pagina--; cargarLeads(); }
      if (btn.dataset.page === 'next' && p < totalPaginas) { state.pagina++; cargarLeads(); }
    });
  });
}

// ============================================================
// CHIPS
// ============================================================
function renderChips() {
  const el = $('#chips');
  if (!el) return;

  const chips = [];
  if (state.buscar) chips.push({ key: 'buscar', label: `"${state.buscar}"` });
  if (state.estado) chips.push({ key: 'estado', label: `Estado: ${state.estado}` });
  if (state.origen_id) {
    const o = state.origenes.find(x => String(x.id) === String(state.origen_id));
    chips.push({ key: 'origen_id', label: `Origen: ${o?.nombre || state.origen_id}` });
  }
  if (state.vendedor_id) {
    const v = state.vendedores.find(x => String(x.id) === String(state.vendedor_id));
    chips.push({ key: 'vendedor_id', label: `Vendedor: ${nombreVendedor(v)}` });
  }
  if (state.fechaDesde || state.fechaHasta) {
    const desde = state.fechaDesde || '…';
    const hasta = state.fechaHasta || '…';
    chips.push({ key: 'fechas', label: `Del ${desde} al ${hasta}` });
  }

  if (chips.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = chips.map(c => `
    <button class="v-chip-activo" type="button" data-chip="${c.key}" title="Quitar filtro">
      ${esc(c.label)} <span aria-hidden="true">×</span>
    </button>
  `).join('') + `<button class="v-chip-activo v-chip-activo--clear" type="button" data-chip="__all">Limpiar todo</button>`;

  $$('[data-chip]', el).forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.chip;
      if (k === '__all') {
        state.buscar = '';
        state.estado = '';
        state.origen_id = '';
        state.vendedor_id = '';
        state.filtroRapido = '';
        state.proximoContacto = null;
        state.fechaDesde = '';
        state.fechaHasta = '';
        const input = $('#buscar'); if (input) input.value = '';
        const inpDesde = $('#fecha-desde'); if (inpDesde) inpDesde.value = '';
        const inpHasta = $('#fecha-hasta'); if (inpHasta) inpHasta.value = '';
      } else if (k === 'fechas') {
        state.fechaDesde = '';
        state.fechaHasta = '';
        const inpDesde = $('#fecha-desde'); if (inpDesde) inpDesde.value = '';
        const inpHasta = $('#fecha-hasta'); if (inpHasta) inpHasta.value = '';
      } else {
        state[k] = '';
        if (k === 'buscar') { const input = $('#buscar'); if (input) input.value = ''; }
      }
      state.pagina = 1;
      cargarLeads();
    });
  });
}

function actualizarContadorFiltros() {
  const el = $('#filtros-count');
  if (!el) return;
  const n = [state.estado, state.origen_id, state.vendedor_id].filter(Boolean).length;
  el.textContent = n > 0 ? `(${n})` : '';
}

// ============================================================
// SHEET FILTROS
// ============================================================
function renderFiltrosSheet() {
  state.draft = { estado: state.estado, origen_id: state.origen_id, vendedor_id: state.vendedor_id };
  pintarOpcionesFiltro('estado', 'filtro-estado', ESTADOS.map(e => ({ id: e, label: e })));
  pintarOpcionesFiltro('origen_id', 'filtro-origen', state.origenes.map(o => ({ id: o.id, label: o.nombre || o.descripcion || 'Origen' })));
  const contVend = document.getElementById('filtro-vendedor');
  if (contVend) {
    pintarOpcionesFiltro('vendedor_id', 'filtro-vendedor', state.vendedores.map(v => ({ id: v.id, label: nombreVendedor(v) })));
  }
}

function pintarOpcionesFiltro(clave, contenedorId, opciones) {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;
  if (!opciones.length) { cont.innerHTML = `<div class="v-filtro-vacio">Sin opciones</div>`; return; }

  cont.innerHTML = opciones.map(op => {
    const activo = String(state.draft[clave]) === String(op.id);
    return `<button type="button" class="v-filtro-chip ${activo ? 'active' : ''}" data-clave="${clave}" data-valor="${esc(op.id)}">${esc(op.label)}</button>`;
  }).join('');

  $$('.v-filtro-chip', cont).forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.clave;
      const v = btn.dataset.valor;
      state.draft[k] = String(state.draft[k]) === String(v) ? '' : v;
      pintarOpcionesFiltro(k, contenedorId, opciones);
    });
  });
}

// ============================================================
// DRAWER
// ============================================================
async function abrirDrawer(id) {
  const drawer = $('#drawer');
  const backdrop = $('#drawer-backdrop');
  if (!drawer || !backdrop) return;

  // Siempre cargar desde la API para tener productos con medidas
  let leadCompleto = null;
  try {
    leadCompleto = await LeadsAPI.obtener(id);
  } catch (e) {
    console.warn('[leads] obtener:', e);
  }

  // Fallback: usar el lead de la lista (sin productos)
  state.leadActual = leadCompleto || state.datos.find(d => String(d.id) === String(id)) || null;
  if (!state.leadActual) { toast('No se pudo cargar el lead', 'error'); return; }

  renderDrawer();
  drawer.classList.add('open');
  backdrop.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');

  await cargarNotas();
}

function cerrarDrawer() {
  const drawer = $('#drawer');
  const backdrop = $('#drawer-backdrop');
  if (drawer) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  if (backdrop) backdrop.classList.remove('open');
  document.body.classList.remove('drawer-open');
  state.leadActual = null;
  state.notas = [];
}

function renderDrawer() {
  const body = $('#drawer-body');
  const title = $('#drawer-title');
  if (!body || !state.leadActual) return;

  const l = state.leadActual;
  if (title) title.textContent = l.nombre || 'Lead';

  const tel = l.telefono ? telefonoLimpio(l.telefono) : '';
  const email = l.email || '';
  const productos = Array.isArray(l.productos) ? l.productos : [];

  body.innerHTML = `
    <div class="v-drawer-section">
      <div class="v-drawer-contact">
        ${tel ? `<a class="v-btn v-btn-primary" href="tel:${esc(tel)}">${ICONS.phone} Llamar</a>` : ''}
        ${tel ? `<a class="v-btn v-btn-gold" href="${esc(waUrl(tel))}" target="_blank" rel="noopener">${ICONS.whatsapp} WhatsApp</a>` : ''}
        ${email ? `<a class="v-btn v-btn-ghost" href="mailto:${esc(email)}">${ICONS.mail} Email</a>` : ''}
      </div>
    </div>

    <div class="v-drawer-section">
      <h3 class="v-drawer-subtitle">${ICONS.building} Datos</h3>
      <dl class="v-drawer-dl">
        <dt>Empresa</dt><dd>${esc(l.empresa || '—')}</dd>
        <dt>Teléfono</dt><dd>${esc(l.telefono || '—')}</dd>
        <dt>Email</dt><dd>${esc(l.email || '—')}</dd>
        <dt>Origen</dt><dd>${esc(l.origen_nombre || '—')}</dd>
        <dt>Vendedor</dt><dd>${esc(l.vendedor_nombre_completo || 'Sin asignar')}</dd>
        <dt>Fecha</dt><dd>${esc(fechaExacta(l.creado_en || l.fecha))}</dd>
        ${l.proximo_contacto ? `<dt>${ICONS.calendar} Próximo contacto</dt><dd>${esc(l.proximo_contacto)}</dd>` : ''}
        ${l.mensaje ? `<dt>Mensaje</dt><dd>${esc(l.mensaje)}</dd>` : ''}
      </dl>
    </div>

    ${productos.length > 0 ? `
      <div class="v-drawer-section">
        <h3 class="v-drawer-subtitle">${ICONS.package} Productos de interés (${productos.length})</h3>
        <ul class="v-drawer-productos">
          ${productos.map(p => {
            const largoTxt = formatMedida(p.largo, p.unidad_largo_simbolo);
            const anchoTxt = formatMedida(p.ancho, p.unidad_ancho_simbolo);
            const espesorTxt = formatMedida(p.espesor, p.unidad_espesor_simbolo);

            const medidas = [];
            if (largoTxt) medidas.push(`Largo: ${largoTxt}`);
            if (anchoTxt) medidas.push(`Ancho: ${anchoTxt}`);
            if (espesorTxt) medidas.push(`Espesor: ${espesorTxt}`);

            return `
              <li class="v-producto-item">
                <div class="v-producto-info">
                  <div class="v-producto-nombre">${esc(p.nombre || 'Producto')}</div>
                  ${p.sku ? `<a class="v-producto-sku" href="${esc(urlProductoPublico(p.sku))}" target="_blank" rel="noopener">${esc(p.sku)}</a>` : ''}
                  ${medidas.length > 0 ? `<div class="v-producto-medidas">${esc(medidas.join(' · '))}</div>` : ''}
                </div>
                <div class="v-producto-cantidad">
                  ${esc(p.cantidad || 1)} ${esc(p.unidad || 'und')}
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    ` : ''}

    ${state.puedeEditar ? `
      <div class="v-drawer-section">
        <h3 class="v-drawer-subtitle">${ICONS.refresh} Estado</h3>
        <select class="v-select-estado" id="drawer-estado" aria-label="Cambiar estado del lead" style="width:100%;max-width:none;">
          ${ESTADOS.map(e => `<option value="${e}" ${l.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="v-drawer-section">
        <h3 class="v-drawer-subtitle">${ICONS.calendar} Próximo contacto</h3>
        <input class="v-select-estado" type="date" id="drawer-proximo" value="${esc(l.proximo_contacto || '')}" aria-label="Próximo contacto" style="width:100%;max-width:none;">
      </div>
    ` : ''}

    <div class="v-drawer-section">
      <h3 class="v-drawer-subtitle">${ICONS.note} Notas</h3>
      <div id="drawer-notas"></div>
      ${state.puedeNotas ? `
        <form id="drawer-nota-form" class="v-drawer-nota-form">
          <textarea id="drawer-nota-input" placeholder="Escribe una nota…" rows="2" aria-label="Escribe una nota"></textarea>
          <button class="v-btn v-btn-primary" type="submit">Guardar nota</button>
        </form>
      ` : ''}
    </div>
  `;

  $('#drawer-estado')?.addEventListener('change', async (e) => {
    const nuevo = e.target.value;
    const anterior = l.estado;
    try {
      await LeadsAPI.cambiarEstado(l.id, nuevo);
      l.estado = nuevo;
      toast(`Lead movido a ${nuevo}`, 'success');
      mostrarUndo(l.id, anterior, nuevo);
      await cargarLeads();
    } catch {
      e.target.value = anterior;
      toast('No se pudo cambiar el estado', 'error');
    }
  });

  $('#drawer-proximo')?.addEventListener('change', async (e) => {
    const fecha = e.target.value || null;
    try {
      await LeadsAPI.actualizar(l.id, { ...l, proximo_contacto: fecha });
      l.proximo_contacto = fecha;
      toast('Recordatorio guardado', 'success');
    } catch {
      toast('No se pudo guardar', 'error');
    }
  });

  $('#drawer-nota-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = $('#drawer-nota-input').value.trim();
    if (!txt) return;
    try {
      await NotasAPI.crear(l.id, txt, usuarioActual.perfil.id);
      $('#drawer-nota-input').value = '';
      await cargarNotas();
      toast('Nota guardada', 'success');
    } catch {
      toast('No se pudo guardar la nota', 'error');
    }
  });

  renderNotas();
}

function formatMedida(valor, unidad) {
  if (valor == null || valor === '') return null;
  const u = String(unidad || 'cm').trim().toLowerCase();
  const esPulgada = ['"', 'in', 'pulg', 'pulgada', 'pulgadas', 'inch', 'inches'].includes(u);
  return esPulgada ? `${valor} pulg` : `${valor} ${unidad || 'cm'}`;
}

async function cargarNotas() {
  if (!state.leadActual) return;
  try {
    state.notas = await NotasAPI.listar(state.leadActual.id);
  } catch (e) {
    console.warn('[leads] notas:', e);
    state.notas = [];
  }
  renderNotas();
}

function renderNotas() {
  const el = $('#drawer-notas');
  if (!el) return;

  if (!state.notas.length) {
    el.innerHTML = `<div style="padding:16px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin notas todavía.</div>`;
    return;
  }

  el.innerHTML = state.notas.map(n => {
    const autor = n.autor?.persona
      ? `${n.autor.persona.nombre || ''} ${n.autor.persona.apellido || ''}`.trim()
      : 'Usuario';
    const ini = inicialesLead(autor);
    return `
      <div class="v-nota">
        <div class="v-nota-head">
          <div class="v-avatar-ini v-avatar-sm">${esc(ini)}</div>
          <div class="v-nota-meta">
            <strong>${esc(autor)}</strong>
            <span title="${esc(fechaExacta(n.creado_en))}">${esc(fechaRelativa(n.creado_en))}</span>
          </div>
        </div>
        <div class="v-nota-body">${esc(n.contenido)}</div>
      </div>
    `;
  }).join('');
}

// ============================================================
// PALETTE (Ctrl+K)
// ============================================================
function enlazarBusquedaGlobal() {
  const backdrop = $('#palette-backdrop');
  const input = $('#palette-input');
  const results = $('#palette-results');
  if (!backdrop || !input || !results) return;

  let resultados = [];
  let idx = 0;
  let deb = null;

  const abrir = () => {
    backdrop.classList.add('open');
    input.value = '';
    results.innerHTML = '';
    resultados = [];
    idx = 0;
    setTimeout(() => input.focus(), 30);
  };

  const cerrar = () => {
    backdrop.classList.remove('open');
    input.blur();
  };

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      backdrop.classList.contains('open') ? cerrar() : abrir();
    }
    if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      e.preventDefault();
      cerrar();
    }
    if (backdrop.classList.contains('open')) {
      if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, resultados.length - 1); pintar(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); pintar(); }
      if (e.key === 'Enter' && resultados[idx]) { e.preventDefault(); seleccionar(resultados[idx]); }
    }
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) cerrar();
  });

  input.addEventListener('input', () => {
    clearTimeout(deb);
    deb = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 2) { resultados = []; idx = 0; pintar(); return; }
      try {
        const vendedorId = state.rolVista === 'asesor' ? usuarioActual?.perfil?.vendedor_id : null;
        if (state.rolVista === 'asesor' && !vendedorId) {
          resultados = [];
          pintar();
          return;
        }
        resultados = await LeadsSearchAPI.buscar(q, vendedorId, 10);
        idx = 0;
        pintar();
      } catch (e) {
        console.error('[palette] error:', e);
        resultados = [];
        pintar();
      }
    }, 200);
  });

  function pintar() {
    if (!resultados.length) {
      results.innerHTML = input.value.trim().length < 2
        ? `<div class="v-palette-empty">Escribe al menos 2 caracteres…</div>`
        : `<div class="v-palette-empty">Sin resultados.</div>`;
      return;
    }
    results.innerHTML = resultados.map((r, i) => `
      <div class="v-palette-item ${i === idx ? 'active' : ''}" data-i="${i}">
        <div class="v-avatar-ini v-avatar-sm">${esc(inicialesLead(r.nombre))}</div>
        <div style="flex:1;min-width:0;">
          <div class="v-palette-name">${esc(r.nombre || '—')}</div>
          <div class="v-palette-sub">${esc(r.empresa || '')} ${r.telefono ? '· ' + esc(r.telefono) : ''}</div>
        </div>
        ${badgeEstado(r.estado)}
      </div>
    `).join('');

    $$('.v-palette-item', results).forEach(el => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.i);
        seleccionar(resultados[i]);
      });
    });
  }

  function seleccionar(r) {
    cerrar();
    abrirDrawer(r.id);
  }
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
        cargarLeads();
      }, 350);
    });
  }

  $('#btn-filtros')?.addEventListener('click', abrirSheet);
  $('#sheet-close')?.addEventListener('click', cerrarSheet);
  $('#sheet-backdrop')?.addEventListener('click', cerrarSheet);
  $('#sheet-limpiar')?.addEventListener('click', () => {
    state.draft = { estado: '', origen_id: '', vendedor_id: '' };
    renderFiltrosSheet();
  });
  $('#sheet-aplicar')?.addEventListener('click', () => {
    state.estado = state.draft.estado;
    state.origen_id = state.draft.origen_id;
    state.vendedor_id = state.draft.vendedor_id;
    state.pagina = 1;
    cerrarSheet();
    cargarLeads();
  });

  $('#btn-nuevo')?.addEventListener('click', abrirModal);
  $('#btn-nuevo-fab')?.addEventListener('click', abrirModal);
  $$('[data-close-modal]').forEach(b => b.addEventListener('click', cerrarModal));
  $('#modal-lead')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-lead') cerrarModal();
  });

  $('#drawer-close')?.addEventListener('click', cerrarDrawer);
  $('#drawer-backdrop')?.addEventListener('click', cerrarDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#drawer')?.classList.contains('open')) cerrarDrawer();
      if (document.body.classList.contains('modal-open')) cerrarModal();
      if (document.body.classList.contains('sheet-open')) cerrarSheet();
    }
  });

  $('#form-lead')?.addEventListener('submit', onSubmitCrearLead);

  if (state.rolVista === 'marketing' || state.rolVista === 'jefe' || state.rolVista === 'admin' || state.rolVista === 'gerencia') {
    const inpDesde = $('#fecha-desde');
    const inpHasta = $('#fecha-hasta');

    const aplicarFechas = () => {
      state.fechaDesde = inpDesde?.value || '';
      state.fechaHasta = inpHasta?.value || '';
      state.filtroRapido = '';
      state.sinAsignar = false;
      state.sinContactar3d = false;
      state.pagina = 1;
      renderFiltrosRapidos();
      cargarLeads();
    };

    inpDesde?.addEventListener('change', aplicarFechas);
    inpHasta?.addEventListener('change', aplicarFechas);

    $('#date-clear')?.addEventListener('click', () => {
      state.fechaDesde = '';
      state.fechaHasta = '';
      state.filtroRapido = '';
      state.sinAsignar = false;
      state.sinContactar3d = false;
      if (inpDesde) inpDesde.value = '';
      if (inpHasta) inpHasta.value = '';
      state.pagina = 1;
      renderFiltrosRapidos();
      cargarLeads();
    });
  }

  if (state.rolVista === 'jefe' || state.rolVista === 'admin' || state.rolVista === 'gerencia') {
    $('#filtro-vendedor-toolbar')?.addEventListener('change', (e) => {
      state.vendedor_id = e.target.value;
      state.pagina = 1;
      cargarLeads();
    });
  }

  // Toggle vista
  $('#vista-tabla')?.addEventListener('click', () => cambiarVista('tabla'));
  $('#vista-cards')?.addEventListener('click', () => cambiarVista('cards'));

  // Filtros rápidos (delegación)
  $('#quick-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick]');
    if (!btn) return;
    const key = btn.dataset.quick;
    state.filtroRapido = state.filtroRapido === key ? '' : key;
    aplicarFiltroRapido();
    renderFiltrosRapidos();
  });
}

function abrirSheet() {
  const sheet = $('#sheet'), backdrop = $('#sheet-backdrop');
  if (!sheet || !backdrop) return;
  state.draft = { estado: state.estado, origen_id: state.origen_id, vendedor_id: state.vendedor_id };
  renderFiltrosSheet();
  sheet.classList.add('open');
  backdrop.classList.add('open');
  document.body.classList.add('sheet-open');
}

function cerrarSheet() {
  $('#sheet')?.classList.remove('open');
  $('#sheet-backdrop')?.classList.remove('open');
  document.body.classList.remove('sheet-open');
}

// ============================================================
// MODAL CREAR LEAD
// ============================================================
function abrirModal() {
  const modal = $('#modal-lead');
  if (!modal) return;
  pintarSelectoresModal();
  limpiarFormLead();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(() => $('#lead-nombre')?.focus(), 50);
}

function cerrarModal() {
  const modal = $('#modal-lead');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function limpiarFormLead() {
  const form = $('#form-lead');
  if (form) form.reset();
  const err = $('#form-error');
  if (err) { err.textContent = ''; err.classList.remove('visible'); }
  const btn = $('#btn-guardar-lead');
  if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
}

async function onSubmitCrearLead(ev) {
  ev.preventDefault();
  const form = ev.target;
  const errBox = $('#form-error');
  const btn = $('#btn-guardar-lead');

  if (!form.checkValidity()) { form.reportValidity(); return; }

  const fd = new FormData(form);
  const payload = {
    nombre: (fd.get('nombre') || '').toString().trim(),
    empresa: (fd.get('empresa') || '').toString().trim() || null,
    telefono: (fd.get('telefono') || '').toString().trim(),
    email: (fd.get('email') || '').toString().trim() || null,
    origen_id: (fd.get('origen_id') || '').toString().trim() || null,
    vendedor_id: state.rolVista === 'asesor'
      ? usuarioActual?.perfil?.vendedor_id
      : (fd.get('vendedor_id') || '').toString().trim() || null,
    mensaje: (fd.get('mensaje') || '').toString().trim() || null,
    estado: 'Nuevo'
  };

  if (!payload.nombre || !payload.telefono) {
    if (errBox) { errBox.textContent = 'Nombre y teléfono son obligatorios.'; errBox.classList.add('visible'); }
    return;
  }

  // Validar email si viene
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    if (errBox) { errBox.textContent = 'El formato del email no es válido.'; errBox.classList.add('visible'); }
    return;
  }

  // Validar duplicado por teléfono
  if (payload.telefono) {
    try {
      const existe = state.datos.some(d => telefonoLimpio(d.telefono) === telefonoLimpio(payload.telefono));
      if (existe) {
        if (errBox) { errBox.textContent = 'Ya existe un lead con ese teléfono.'; errBox.classList.add('visible'); }
        return;
      }
    } catch (e) {}
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  if (errBox) errBox.classList.remove('visible');

  try {
    await LeadsAPI.crear(payload);
    toast('Lead creado', 'success');
    cerrarModal();
    state.pagina = 1;
    await cargarLeads();
    await cargarContadores();
  } catch (e) {
    console.error('[leads] crear:', e);
    if (errBox) { errBox.textContent = e?.message || 'No se pudo crear el lead.'; errBox.classList.add('visible'); }
    toast('No se pudo crear', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}

function abrirModalSiSePide() {
  try {
    if (new URLSearchParams(window.location.search).get('nuevo') === '1') abrirModal();
  } catch {}
}

// ============================================================
// MODAL CONFIRMAR ELIMINAR
// ============================================================
function confirmarEliminar(nombre) {
  return new Promise((resolve) => {
    document.getElementById('modal-confirm')?.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-confirm';
    modal.className = 'v-modal-backdrop open';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-title');
    modal.setAttribute('aria-describedby', 'confirm-desc');

    modal.innerHTML = `
      <div class="v-modal v-confirm-modal" style="max-width:440px;">
        <div class="v-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 class="v-confirm-title" id="confirm-title">Eliminar lead</h2>
        <p class="v-confirm-desc" id="confirm-desc">
          ¿Estás seguro que quieres eliminar el lead <strong>"${esc(nombre)}"</strong>?
        </p>
        <p class="v-confirm-warning">Esta acción no se puede deshacer.</p>
        <div class="v-confirm-footer">
          <button class="v-btn v-btn-ghost" type="button" data-cancel>Cancelar</button>
          <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Eliminar lead</button>
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