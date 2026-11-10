// ventas/assets/js/dashboard.js
// Dashboard parametrizado por rol

import { renderVentasShell } from './ventas-shell.js';
import { DashboardVentasAPI } from '../../../shared/js/supabase-client.js';

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

function soles(n) { return Number(n || 0).toLocaleString('es-PE'); }

function fechaCorta(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
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
function kpiCard(label, valor, nota, notaTipo) {
  return `
    <div class="kpi" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--v-primary);"></div>
      <div style="font-size:0.8rem;color:var(--v-muted);">${esc(label)}</div>
      <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);margin-top:4px;">${esc(valor)}</div>
      ${nota ? `<div style="font-size:0.75rem;margin-top:6px;color:${notaTipo === 'down' ? 'var(--danger)' : notaTipo === 'up' ? 'var(--success)' : 'var(--v-muted)'};">${esc(nota)}</div>` : ''}
    </div>
  `;
}

function kpiGrid(items) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px;">${items.join('')}</div>`;
}

function panel(titulo, contenido) {
  return `
    <div style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:20px;margin-bottom:20px;">
      <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 14px;">${esc(titulo)}</h3>
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

function leadsRecientesTabla(leads, mostrarVendedor = true) {
  const headers = mostrarVendedor
    ? ['Nombre', 'Empresa', 'Vendedor', 'Estado', 'Fecha']
    : ['Nombre', 'Empresa', 'Estado', 'Fecha'];

  const rows = leads.map(l => {
    const base = [
      `<strong>${esc(l.nombre || '—')}</strong>`,
      esc(l.empresa || '—')
    ];
    if (mostrarVendedor) {
      base.push(esc(l.vendedor?.nombre_completo || 'Sin asignar'));
    }
    base.push(badgeEstado(l.estado), fechaCorta(l.fecha));
    return base;
  });

  return tablaSimple(headers, rows);
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const rolVista = document.body.dataset.rol || 'asesor';

  const usuario = await renderVentasShell({
    active: 'dashboard',
    title: 'Dashboard',
    crumb: `Ventas / ${capitalizar(rolVista)}`,
    roles: [rolVista, 'admin'],
    permisos: ['dashboard.ver']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2 style="font-family:var(--font-display);font-size:1.5rem;color:var(--v-primary);margin:0 0 4px;">
        Hola, ${esc(usuario.perfil?.nombre || 'usuario')}
      </h2>
      <p style="color:var(--v-muted);margin:0;">
        ${esc(usuario.perfil?.rol_nombre || capitalizar(rolVista))}
      </p>
    </div>
    <div id="dashboard-body">
      <div class="v-empty"><div class="v-empty-text">Cargando KPIs…</div></div>
    </div>
  `;

  const body = $('#dashboard-body');
  const vendedorId = usuario.perfil?.vendedor_id || null;

  try {
    if (rolVista === 'asesor') await renderAsesor(body, usuario, vendedorId);
    else if (rolVista === 'jefe') await renderJefe(body, usuario);
    else if (rolVista === 'admin') await renderAdmin(body, usuario);
    else if (rolVista === 'marketing') await renderMarketing(body, usuario);
    else if (rolVista === 'gerencia') await renderGerencia(body, usuario);
    else body.innerHTML = `<div class="v-empty">Rol no reconocido.</div>`;
  } catch (e) {
    console.error('[dashboard] error:', e);
    body.innerHTML = `<div class="v-empty"><div class="v-empty-text" style="color:var(--danger);">Error al cargar KPIs: ${esc(e?.message || 'desconocido')}</div></div>`;
  }
})();

function capitalizar(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
}

// ============================================================
// RENDER POR ROL
// ============================================================
async function renderAsesor(body, usuario, vendedorId) {
  const [kpis, recientes] = await Promise.all([
    DashboardVentasAPI.kpisAsesor(vendedorId),
    DashboardVentasAPI.leadsRecientes(vendedorId, 5)
  ]);

  body.innerHTML = `
    ${kpiGrid([
      kpiCard('Mis leads', kpis.total),
      kpiCard('Nuevos', kpis.nuevos),
      kpiCard('Contactados', kpis.contactados),
      kpiCard('Convertidos', kpis.convertidos),
      kpiCard('Tasa de conversión', kpis.tasa + '%')
    ])}
    ${panel('Últimos leads', leadsRecientesTabla(recientes, false))}
    ${panel('Acciones rápidas', acciones([
      { label: 'Ver mis leads →', href: 'leads.html', tipo: 'v-btn-primary' }
    ]))}
  `;
}

async function renderJefe(body, usuario) {
  const [kpis, recientes] = await Promise.all([
    DashboardVentasAPI.kpisJefe(),
    DashboardVentasAPI.leadsRecientes(null, 5)
  ]);

  body.innerHTML = `
    ${kpiGrid([
      kpiCard('Leads totales', kpis.total),
      kpiCard('Sin asignar', kpis.sinAsignar, kpis.sinAsignar > 0 ? 'Requieren asignación' : null, 'down'),
      kpiCard('Nuevos esta semana', kpis.nuevosEstaSemana),
      kpiCard('Convertidos', kpis.convertidos),
      kpiCard('Tasa del equipo', kpis.tasa + '%')
    ])}
    ${panel('Últimos leads', leadsRecientesTabla(recientes, true))}
    ${panel('Acciones rápidas', acciones([
      { label: 'Ver todos los leads →', href: 'leads.html', tipo: 'v-btn-primary' },
      { label: 'Ver productos →', href: 'productos.html' }
    ]))}
  `;
}

async function renderAdmin(body, usuario) {
  const [kpis, recientes] = await Promise.all([
    DashboardVentasAPI.kpisAdmin(),
    DashboardVentasAPI.leadsRecientes(null, 5)
  ]);

  body.innerHTML = `
    ${kpiGrid([
      kpiCard('Leads totales', kpis.totalLeads),
      kpiCard('Usuarios activos', kpis.usuariosActivos),
      kpiCard('Productos activos', kpis.productosActivos),
      kpiCard('Productos destacados', kpis.productosDestacados),
      kpiCard('Tasa global', kpis.tasa + '%')
    ])}
    ${panel('Últimos leads', leadsRecientesTabla(recientes, true))}
    ${panel('Acciones rápidas', acciones([
      { label: 'Ver leads →', href: 'leads.html', tipo: 'v-btn-primary' },
      { label: 'Ver productos →', href: 'productos.html' }
    ]))}
  `;
}

async function renderMarketing(body, usuario) {
  const [kpis, recientes] = await Promise.all([
    DashboardVentasAPI.kpisMarketing(),
    DashboardVentasAPI.leadsRecientes(null, 5)
  ]);

  const origenRows = kpis.leadsPorOrigen.map(o => [esc(o.nombre), o.cantidad]);

  body.innerHTML = `
    ${kpiGrid([
      kpiCard('Productos en catálogo', kpis.productosCatalogo),
      kpiCard('Productos en outlet', kpis.productosOutlet),
      kpiCard('Productos en saldos', kpis.productosSaldos),
      kpiCard('Productos destacados', kpis.productosDestacados)
    ])}
    ${panel('Leads por origen', tablaSimple(['Origen', 'Cantidad'], origenRows))}
    ${panel('Últimos leads', leadsRecientesTabla(recientes, true))}
    ${panel('Acciones rápidas', acciones([
      { label: 'Ver productos →', href: 'productos.html', tipo: 'v-btn-primary' }
    ]))}
  `;
}

async function renderGerencia(body, usuario) {
  const [kpis, recientes] = await Promise.all([
    DashboardVentasAPI.kpisGerencia(),
    DashboardVentasAPI.leadsRecientes(null, 5)
  ]);

  const topRows = kpis.topVendedores.map(v => [
    esc(v.nombre),
    v.asignados,
    v.convertidos,
    v.asignados > 0 ? Math.round((v.convertidos / v.asignados) * 100) + '%' : '0%'
  ]);
  const estadoRows = kpis.porEstado.map(e => [badgeEstado(e.estado), e.cantidad]);

  body.innerHTML = `
    ${kpiGrid([
      kpiCard('Leads totales', kpis.total),
      kpiCard('Tasa de conversión', kpis.tasa + '%')
    ])}
    ${panel('Top 3 vendedores', tablaSimple(['Vendedor', 'Asignados', 'Convertidos', 'Tasa'], topRows))}
    ${panel('Leads por estado', tablaSimple(['Estado', 'Cantidad'], estadoRows))}
    ${panel('Últimos leads', leadsRecientesTabla(recientes, true))}
  `;
}