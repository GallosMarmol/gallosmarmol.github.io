// ventas/assets/js/dashboard-jefe.js
// Dashboard específico para el rol de jefe de ventas

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
function kpiCard(label, valor, nota, notaTipo, alerta) {
  const colorBorde = alerta ? 'var(--danger)' : 'var(--v-primary)';
  return `
    <div class="kpi-card" style="background:#fff;border:1px solid ${alerta ? 'rgba(166,61,51,0.25)' : 'var(--v-primary-15)'};border-radius:8px;padding:18px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${colorBorde};"></div>
      <div style="font-size:0.8rem;color:var(--v-muted);">${esc(label)}</div>
      <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:${alerta ? 'var(--danger)' : 'var(--v-primary)'};margin-top:4px;">${esc(valor)}</div>
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
// RENDER: LEADS SIN ASIGNAR (URGENTE)
// ============================================================
function renderLeadsSinAsignar(lista) {
  if (!lista || lista.length === 0) {
    return `
      <div style="padding:24px;text-align:center;color:var(--v-success);font-size:0.85rem;font-weight:600;">
        ✓ Todos los leads tienen vendedor asignado. ¡Buen trabajo!
      </div>
    `;
  }

    const rows = lista.map(l => [
    `<strong>${esc(l.nombre || '—')}</strong>`,
    esc(l.empresa || '—'),
    esc(l.telefono || '—'),
    esc(l.origen?.nombre || '—'),   // ← JOIN: origen.nombre
    `<span title="${esc(l.fecha || '')}">${esc(fechaRelativa(l.fecha))}</span>`
    ]);

  return tablaSimple(['Lead', 'Empresa', 'Teléfono', 'Origen', 'Fecha'], rows);
}

// ============================================================
// RENDER: TOP VENDEDORES
// ============================================================
function renderTopVendedores(vendedores) {
  if (!vendedores || vendedores.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin datos de vendedores</div>`;
  }

  const maxConvertidos = Math.max(...vendedores.map(v => v.convertidos), 1);

  const rows = vendedores.map((v, i) => {
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const barWidth = Math.round((v.convertidos / maxConvertidos) * 100);
    const tasa = v.asignados > 0 ? Math.round((v.convertidos / v.asignados) * 100) : 0;
    return [
      `<strong>${medalla} ${esc(v.nombre)}</strong>`,
      `<span style="font-weight:600;">${v.asignados}</span>`,
      `<div style="display:flex;align-items:center;gap:8px;">
         <div style="flex:1;background:var(--v-primary-05);height:8px;border-radius:4px;overflow:hidden;">
           <div style="width:${barWidth}%;height:100%;background:var(--v-primary);border-radius:4px;"></div>
         </div>
         <span style="font-weight:600;min-width:30px;">${v.convertidos}</span>
       </div>`,
      `<span style="font-size:0.8rem;color:${tasa >= 50 ? 'var(--success)' : tasa > 0 ? 'var(--warning)' : 'var(--v-muted)'};">${tasa}%</span>`
    ];
  });

  return tablaSimple(['Vendedor', 'Asignados', 'Convertidos', 'Tasa'], rows);
}

// ============================================================
// RENDER: ÚLTIMOS LEADS
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
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'dashboard',
    title: 'Dashboard',
    crumb: 'Ventas / Jefe',
    roles: ['jefe', 'admin'],
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
        Panel de <strong>Jefe de Ventas</strong>
      </p>
    </div>
    <div id="dashboard-body">
      <div class="v-empty"><div class="v-empty-text">Cargando KPIs…</div></div>
    </div>
  `;

  const body = $('#dashboard-body');

  try {
    // Cargar KPIs + leads sin asignar + leads recientes en paralelo
    const [kpis, leadsSinAsignar, leadsRecientes] = await Promise.all([
      DashboardVentasAPI.kpisJefe(),
      DashboardVentasAPI.leadsSinAsignar ? DashboardVentasAPI.leadsSinAsignar(5) : Promise.resolve([]),
      DashboardVentasAPI.leadsRecientes(null, 5)
    ]);

    body.innerHTML = `
      <!-- KPIs del equipo -->
      ${kpiGrid([
        kpiCard('Leads totales', kpis.total, 'En el equipo'),
        kpiCard('Sin asignar', kpis.sinAsignar, kpis.sinAsignar > 0 ? 'Requieren asignación' : 'Todo asignado', kpis.sinAsignar > 0 ? 'down' : 'up', kpis.sinAsignar > 0),
        kpiCard('Nuevos esta semana', kpis.nuevosEstaSemana, 'Últimos 7 días', kpis.nuevosEstaSemana > 0 ? 'down' : null),
        kpiCard('Convertidos', kpis.convertidos, 'Total histórico', kpis.convertidos > 0 ? 'up' : null),
        kpiCard('Tasa de conversión', kpis.tasa + '%', 'Del equipo'),
        kpiCard('Sin contactar > 3 días', kpis.sinContactar3d, kpis.sinContactar3d > 0 ? 'Leads olvidados' : 'Todo al día', kpis.sinContactar3d > 0 ? 'down' : 'up', kpis.sinContactar3d > 0)
      ])}

      <!-- Leads sin asignar (URGENTE) -->
      ${panel(
        'Leads sin asignar',
        renderLeadsSinAsignar(leadsSinAsignar),
        leadsSinAsignar.length > 0
          ? `<a href="leads.html" class="v-btn v-btn-primary" style="padding:6px 14px;font-size:0.8rem;">Asignar ahora →</a>`
          : ''
      )}

      <!-- Top vendedores -->
      ${panel('Top vendedores', renderTopVendedores(kpis.topVendedores))}

      <!-- Últimos leads del equipo -->
      ${panel('Últimos leads del equipo', renderLeadsRecientes(leadsRecientes))}

      <!-- Acciones rápidas -->
      ${panel('Acciones rápidas', acciones([
        { label: 'Ver todos los leads →', href: 'leads.html', tipo: 'v-btn-primary' },
        { label: 'Ver productos', href: 'productos.html' }
      ]))}
    `;
  } catch (e) {
    console.error('[dashboard-jefe] error:', e);
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Error al cargar KPIs: ${esc(e?.message || 'desconocido')}
        </div>
      </div>
    `;
  }
})();