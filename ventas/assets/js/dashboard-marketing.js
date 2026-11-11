// ventas/assets/js/dashboard-marketing.js
// Dashboard específico para el rol de marketing

import { renderVentasShell } from './ventas-shell.js';
import { DashboardVentasAPI } from '../../../shared/js/supabase-client.js';

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

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
    <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;position:relative;overflow:hidden;">
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

// ============================================================
// RENDER: LEADS POR ORIGEN (tabla con barras)
// ============================================================
function renderLeadsPorOrigen(leadsPorOrigen) {
  if (!leadsPorOrigen || leadsPorOrigen.length === 0) {
    return tablaSimple(['Origen', 'Leads'], []);
  }

  const total = leadsPorOrigen.reduce((s, o) => s + o.cantidad, 0);
  const max = Math.max(...leadsPorOrigen.map(o => o.cantidad), 1);

  const rows = leadsPorOrigen.map(o => {
    const pct = total > 0 ? Math.round((o.cantidad / total) * 100) : 0;
    const barWidth = Math.round((o.cantidad / max) * 100);
    return [
      `<strong>${esc(o.nombre)}</strong>`,
      `<div style="display:flex;align-items:center;gap:10px;">
         <div style="flex:1;background:var(--v-primary-05);height:8px;border-radius:4px;overflow:hidden;">
           <div style="width:${barWidth}%;height:100%;background:var(--v-primary);border-radius:4px;"></div>
         </div>
         <span style="font-weight:600;min-width:40px;text-align:right;">${o.cantidad}</span>
       </div>`,
      `<span style="font-size:0.8rem;color:var(--v-muted);">${pct}%</span>`
    ];
  });

  return tablaSimple(['Origen', 'Leads', '%'], rows);
}

// ============================================================
// RENDER: LEADS RECIENTES
// ============================================================
function renderLeadsRecientes(leads) {
  if (!leads || leads.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin leads recientes</div>`;
  }

  const rows = leads.map(l => [
    `<strong>${esc(l.nombre || '—')}</strong>`,
    esc(l.empresa || '—'),
    esc(l.origen_nombre || '—'),
    badgeEstado(l.estado),
    fechaCorta(l.fecha)
  ]);

  return tablaSimple(['Lead', 'Empresa', 'Origen', 'Estado', 'Fecha'], rows);
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'dashboard',
    title: 'Dashboard',
    crumb: 'Ventas / Marketing',
    roles: ['marketing', 'admin'],
    permisos: ['dashboard.ver']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  // Saludo
  content.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2 style="font-family:var(--font-display);font-size:1.5rem;color:var(--v-primary);margin:0 0 4px;">
        Hola, ${esc(usuario.perfil?.nombre || 'usuario')}
      </h2>
      <p style="color:var(--v-muted);margin:0;">
        Panel de <strong>Marketing</strong>
      </p>
    </div>
    <div id="dashboard-body">
      <div class="v-empty"><div class="v-empty-text">Cargando KPIs…</div></div>
    </div>
  `;

  const body = $('#dashboard-body');

  try {
    // Cargar KPIs + leads recientes en paralelo
    const [kpis, leadsRecientes] = await Promise.all([
      DashboardVentasAPI.kpisMarketing(),
      DashboardVentasAPI.leadsRecientes(null, 5)
    ]);

    body.innerHTML = `
      <!-- KPIs de productos -->
      ${kpiGrid([
        kpiCard('Productos en catálogo', kpis.productosCatalogo),
        kpiCard('Productos en outlet', kpis.productosOutlet),
        kpiCard('Productos en saldos', kpis.productosSaldos),
        kpiCard('Productos destacados', kpis.productosDestacados)
      ])}

      <!-- Leads por origen -->
      ${panel('Leads por origen', renderLeadsPorOrigen(kpis.leadsPorOrigen))}

      <!-- Últimos leads -->
      ${panel('Últimos leads', renderLeadsRecientes(leadsRecientes))}

      <!-- Acciones rápidas -->
      ${panel('Acciones rápidas', acciones([
        { label: 'Ver productos →', href: 'productos.html', tipo: 'v-btn-primary' },
        { label: 'Ver leads →', href: 'leads.html' }
      ]))}
    `;
  } catch (e) {
    console.error('[dashboard-marketing] error:', e);
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Error al cargar KPIs: ${esc(e?.message || 'desconocido')}
        </div>
      </div>
    `;
  }
})();