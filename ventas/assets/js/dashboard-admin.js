// ventas/assets/js/dashboard-admin.js
// Dashboard específico para el rol de administrador (panel de control global)

import { renderVentasShell } from './ventas-shell.js';
import { DashboardVentasAPI } from '../../../shared/js/supabase-client.js';

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

function fechaRelativa(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diffD = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffD === 0) return 'hoy';
    if (diffD === 1) return 'ayer';
    if (diffD < 7) return `hace ${diffD} días`;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

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

// ============================================================
// COMPONENTES
// ============================================================
function kpiCard(label, valor, nota, notaTipo, icono) {
  return `
    <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--v-primary);"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:0.8rem;color:var(--v-muted);">${esc(label)}</div>
        ${icono ? `<div style="color:var(--v-primary);opacity:0.5;">${icono}</div>` : ''}
      </div>
      <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);margin-top:4px;">${esc(valor)}</div>
      ${nota ? `<div style="font-size:0.75rem;margin-top:6px;color:${notaTipo === 'down' ? 'var(--danger)' : notaTipo === 'up' ? 'var(--success)' : 'var(--v-muted)'};">${esc(nota)}</div>` : ''}
    </div>
  `;
}

function kpiGrid(items) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px;">${items.join('')}</div>`;
}

function panel(titulo, contenido, extra) {
  return `
    <div style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0;">${esc(titulo)}</h3>
        ${extra ? `<div>${extra}</div>` : ''}
      </div>
      ${contenido}
    </div>
  `;
}

function acciones(items) {
  return `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
      ${items.map(a => `<a class="v-btn ${a.tipo || 'v-btn-ghost'}" href="${esc(a.href)}">${esc(a.label)}</a>`).join('')}
    </div>
  `;
}

function tablaSimple(headers, rows) {
  if (!rows || rows.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin datos</div>`;
  }
  return `
    <div style="overflow-x:auto;">
      <table class="v-table" style="width:100%;">
        <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}

// ============================================================
// ICONOS SVG para los KPIs
// ============================================================
const KPI_ICONS = {
  leads: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  conversion: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  usuarios: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  productos: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  destacado: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

// ============================================================
// RENDER: DISTRIBUCIÓN DE PRODUCTOS POR LÍNEA
// ============================================================
function renderProductosPorLinea(kpis) {
  const lineas = [
    { key: 'catalogo', label: 'Catálogo', valor: kpis.productosCatalogo },
    { key: 'outlet', label: 'Outlet', valor: kpis.productosOutlet },
    { key: 'saldos', label: 'Saldos de exportación', valor: kpis.productosSaldos }
  ];

  const total = lineas.reduce((s, l) => s + l.valor, 0) || 1;

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
      ${lineas.map(l => {
        const pct = Math.round((l.valor / total) * 100);
        return `
          <div style="background:var(--v-primary-05);border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:0.8rem;color:var(--v-muted);margin-bottom:6px;">${esc(l.label)}</div>
            <div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;color:var(--v-primary);">${l.valor}</div>
            <div style="font-size:0.7rem;color:var(--v-muted);margin-top:4px;">${pct}% del total</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================
// RENDER: LEADS RECIENTES
// ============================================================
function renderLeadsRecientes(lista) {
  if (!lista || lista.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin leads recientes</div>`;
  }

  const rows = lista.map(l => [
    `<strong>${esc(l.nombre || '—')}</strong>`,
    esc(l.empresa || '—'),
    esc(l.vendedor?.nombre_completo || 'Sin asignar'),
    badgeEstado(l.estado),
    `<span title="${esc(l.fecha || '')}">${esc(fechaRelativa(l.fecha))}</span>`
  ]);

  return tablaSimple(['Lead', 'Empresa', 'Vendedor', 'Estado', 'Fecha'], rows);
}

// ============================================================
// RENDER: PRODUCTOS DESTACADOS
// ============================================================
function renderProductosDestacados(productos) {
  if (!productos || productos.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin productos destacados</div>`;
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">
      ${productos.map(p => `
        <a href="/ventas/admin/productos.html" style="text-decoration:none;color:inherit;">
          <div style="border:1px solid var(--v-primary-10);border-radius:6px;overflow:hidden;background:#fff;">
            <div style="aspect-ratio:1;background:var(--v-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${p.imagen_url
                ? `<img src="${esc(driveImg(p.imagen_url))}" alt="${esc(p.nombre || '')}" style="width:100%;height:100%;object-fit:contain;" loading="lazy">`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--v-muted)" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
            </div>
            <div style="padding:8px;">
              <div style="font-size:0.75rem;font-weight:600;color:var(--v-text);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(p.nombre || '—')}</div>
              <div style="font-size:0.65rem;color:var(--v-muted);margin-top:2px;">${esc(p.sku || '')}</div>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

// Helper para convertir URLs de Google Drive
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

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'dashboard',
    title: 'Dashboard',
    crumb: 'Ventas / Admin',
    roles: ['admin'],
    permisos: ['dashboard.ver']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  const nombre = esc(usuario.perfil?.nombre || 'usuario');

  // Saludo
  content.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2 style="font-family:var(--font-display);font-size:1.5rem;color:var(--v-primary);margin:0 0 4px;">
        Hola, ${nombre} 
      </h2>
      <p style="color:var(--v-muted);margin:0;">
        Panel de <strong>Administración</strong>
      </p>
    </div>
    <div id="dashboard-body">
      <div class="v-empty"><div class="v-empty-text">Cargando KPIs…</div></div>
    </div>
  `;

  const body = $('#dashboard-body');

  try {
    // Cargar KPIs de admin + leads recientes + productos destacados en paralelo
    const [kpis, leadsRecientes, productosDestacados] = await Promise.all([
      DashboardVentasAPI.kpisAdmin(),
      DashboardVentasAPI.leadsRecientes(null, 5),
      DashboardVentasAPI.productosDestacados ? DashboardVentasAPI.productosDestacados(4) : Promise.resolve([])
    ]);

    body.innerHTML = `
      <!-- KPIs globales -->
      ${kpiGrid([
        kpiCard('Leads totales', kpis.totalLeads, 'Histórico completo', null, KPI_ICONS.leads),
        kpiCard('Tasa de conversión', kpis.tasa + '%', 'Global', kpis.tasa > 0 ? 'up' : null, KPI_ICONS.conversion),
        kpiCard('Usuarios activos', kpis.usuariosActivos, 'En el sistema', null, KPI_ICONS.usuarios),
        kpiCard('Productos activos', kpis.productosActivos, 'En el catálogo', null, KPI_ICONS.productos),
        kpiCard('Productos destacados', kpis.productosDestacados, 'En el catálogo público', kpis.productosDestacados > 0 ? 'up' : null, KPI_ICONS.destacado),
        kpiCard('Convertidos', kpis.convertidos, 'Histórico', kpis.convertidos > 0 ? 'up' : null, KPI_ICONS.leads)
      ])}

      <!-- Productos por línea -->
      ${panel('Distribución de productos por línea', renderProductosPorLinea(kpis))}

      <!-- Productos destacados -->
      ${panel('Productos destacados', renderProductosDestacados(productosDestacados),
        `<a href="productos.html" class="v-btn v-btn-ghost" style="padding:6px 14px;font-size:0.8rem;">Ver todos →</a>`
      )}

      <!-- Últimos leads -->
      ${panel('Últimos leads del equipo', renderLeadsRecientes(leadsRecientes))}

      <!-- Acciones rápidas -->
      ${panel('Acciones rápidas', acciones([
        { label: 'Ver leads →', href: 'leads.html', tipo: 'v-btn-primary' },
        { label: 'Ver productos', href: 'productos.html' },
        { label: 'Ver usuarios', href: 'usuarios.html' }
      ]))}
    `;
  } catch (e) {
    console.error('[dashboard-admin] error:', e);
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Error al cargar KPIs: ${esc(e?.message || 'desconocido')}
        </div>
      </div>
    `;
  }
})();