// ventas/assets/js/dashboard-gerencia.js
// Dashboard específico para el rol de gerencia (ejecutivo)

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
function kpiCard(label, valor, nota, notaTipo, tendencia) {
  return `
    <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--v-primary);"></div>
      <div style="font-size:0.8rem;color:var(--v-muted);">${esc(label)}</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:4px;">
        <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);">${esc(valor)}</div>
        ${tendencia != null ? `<div style="font-size:0.75rem;font-weight:600;color:${tendencia > 0 ? 'var(--success)' : tendencia < 0 ? 'var(--danger)' : 'var(--v-muted)'};">${tendencia > 0 ? '↑' : tendencia < 0 ? '↓' : '—'} ${Math.abs(tendencia)}%</div>` : ''}
      </div>
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
// RENDER: EVOLUCIÓN MENSUAL (barras)
// ============================================================
function renderEvolucion(evolucion) {
  if (!evolucion || evolucion.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin datos</div>`;
  }

  const maxLeads = Math.max(...evolucion.map(e => e.leads), 1);

  return `
    <div style="display:grid;grid-template-columns:repeat(${evolucion.length},1fr);gap:12px;align-items:end;height:200px;padding:16px 0;">
      ${evolucion.map(e => {
        const altura = Math.round((e.leads / maxLeads) * 160);
        const alturaConv = Math.round((e.convertidos / maxLeads) * 160);
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="font-size:0.7rem;color:var(--v-muted);font-weight:600;">${e.leads}</div>
            <div style="position:relative;width:100%;max-width:50px;height:${altura}px;background:var(--v-primary-10);border-radius:4px 4px 0 0;overflow:hidden;">
              <div style="position:absolute;bottom:0;left:0;right:0;height:${alturaConv}px;background:var(--v-primary);border-radius:4px 4px 0 0;" title="Convertidos: ${e.convertidos}"></div>
            </div>
            <div style="font-size:0.75rem;color:var(--v-text);font-weight:600;text-transform:capitalize;">${e.mes}</div>
            <div style="font-size:0.7rem;color:var(--v-muted);">${e.tasa}%</div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:60px;font-size:0.75rem;color:var(--v-muted);">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:12px;height:12px;background:var(--v-primary-10);border-radius:2px;"></span>
        Leads totales
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:12px;height:12px;background:var(--v-primary);border-radius:2px;"></span>
        Convertidos
      </div>
    </div>
  `;
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
      `<span style="font-size:0.8rem;font-weight:600;color:${tasa >= 50 ? 'var(--success)' : tasa > 0 ? 'var(--warning)' : 'var(--v-muted)'};">${tasa}%</span>`
    ];
  });

  return tablaSimple(['Vendedor', 'Asignados', 'Convertidos', 'Tasa'], rows);
}

// ============================================================
// RENDER: DISTRIBUCIÓN POR ESTADO
// ============================================================
function renderPorEstado(porEstado) {
  if (!porEstado || porEstado.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin datos</div>`;
  }

  const total = porEstado.reduce((s, e) => s + e.cantidad, 0);

  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${porEstado.map(e => {
        const pct = total > 0 ? Math.round((e.cantidad / total) * 100) : 0;
        return `
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="min-width:100px;font-size:0.85rem;">${badgeEstado(e.estado)}</div>
            <div style="flex:1;background:var(--v-primary-05);height:24px;border-radius:4px;overflow:hidden;position:relative;">
              <div style="width:${pct}%;height:100%;background:var(--v-primary);"></div>
              <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.75rem;font-weight:600;color:var(--v-text);">${e.cantidad} (${pct}%)</span>
            </div>
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
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'dashboard',
    title: 'Dashboard',
    crumb: 'Ventas / Gerencia',
    roles: ['gerencia', 'admin'],
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
        Panel ejecutivo de <strong>Gerencia</strong>
      </p>
    </div>
    <div id="dashboard-body">
      <div class="v-empty"><div class="v-empty-text">Cargando KPIs…</div></div>
    </div>
  `;

  const body = $('#dashboard-body');

  try {
    // Cargar KPIs de gerencia + leads recientes
    const [kpis, leadsRecientes] = await Promise.all([
      DashboardVentasAPI.kpisGerencia(),
      DashboardVentasAPI.leadsRecientes(null, 5)
    ]);

    // Calcular tendencia mes actual vs mes anterior
    let tendenciaLeads = null;
    if (kpis.leadsMesAnterior > 0) {
      tendenciaLeads = Math.round(((kpis.leadsMesActual - kpis.leadsMesAnterior) / kpis.leadsMesAnterior) * 100);
    } else if (kpis.leadsMesActual > 0) {
      tendenciaLeads = 100;
    }

    body.innerHTML = `
      <!-- KPIs ejecutivos -->
      ${kpiGrid([
        kpiCard('Leads totales', kpis.total, 'Histórico completo'),
        kpiCard('Tasa de conversión', kpis.tasa + '%', 'Global'),
        kpiCard('Convertidos', kpis.convertidos, 'Histórico', kpis.convertidos > 0 ? 'up' : null),
        kpiCard('Leads este mes', kpis.leadsMesActual, `${kpis.convertidosMes} convertidos`, null, tendenciaLeads),
        kpiCard('Conversión del mes', kpis.tasaMes + '%', 'Sobre los leads del mes'),
        kpiCard('Descartados', kpis.descartados, 'Histórico', kpis.descartados > 0 ? 'down' : null)
      ])}

      <!-- Evolución mensual -->
      ${panel('Evolución de leads (últimos 6 meses)', renderEvolucion(kpis.evolucion))}

      <!-- Distribución por estado -->
      ${panel('Distribución por estado', renderPorEstado(kpis.porEstado))}

      <!-- Top vendedores -->
      ${panel('Top vendedores', renderTopVendedores(kpis.topVendedores))}

      <!-- Últimos leads -->
      ${panel('Últimos leads del equipo', renderLeadsRecientes(leadsRecientes))}

      <!-- Acciones rápidas -->
      ${panel('Acciones rápidas', acciones([
        { label: 'Ver leads →', href: 'leads.html', tipo: 'v-btn-primary' },
        { label: 'Ver productos', href: 'productos.html' }
      ]))}
    `;
  } catch (e) {
    console.error('[dashboard-gerencia] error:', e);
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Error al cargar KPIs: ${esc(e?.message || 'desconocido')}
        </div>
      </div>
    `;
  }
})();