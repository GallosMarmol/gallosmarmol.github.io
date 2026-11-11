// ventas/assets/js/dashboard-asesor.js
// Dashboard específico para el rol de asesor comercial

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
// RENDER: LISTA DE LEADS
// ============================================================
function renderLeads(lista) {
  if (!lista || lista.length === 0) {
    return `
      <div style="padding:30px;text-align:center;color:var(--v-muted);">
        <div style="font-size:2rem;opacity:0.4;margin-bottom:8px;">◇</div>
        <div style="font-size:0.9rem;">No tienes leads todavía.</div>
        <a href="leads.html" class="v-btn v-btn-primary" style="margin-top:12px;display:inline-flex;">Ver todos mis leads</a>
      </div>
    `;
  }

  const rows = lista.map(l => [
    `<strong>${esc(l.nombre || '—')}</strong>`,
    esc(l.empresa || '—'),
    esc(l.origen_nombre || '—'),
    badgeEstado(l.estado),
    `<span title="${esc(l.fecha || '')}">${esc(fechaRelativa(l.fecha))}</span>`
  ]);

  return tablaSimple(['Lead', 'Empresa', 'Origen', 'Estado', 'Fecha'], rows);
}

// ============================================================
// RENDER: SEGUIMIENTOS DE HOY
// ============================================================
function renderSeguimientoHoy(lista) {
  if (!lista || lista.length === 0) {
    return `
      <div style="padding:24px;text-align:center;color:var(--v-muted);font-size:0.85rem;">
        ✓ Sin seguimientos para hoy. ¡Buen trabajo!
      </div>
    `;
  }

  const rows = lista.map(l => [
    `<strong>${esc(l.nombre || '—')}</strong>`,
    esc(l.empresa || '—'),
    esc(l.telefono || '—'),
    badgeEstado(l.estado),
    `<a href="leads.html?buscar=${encodeURIComponent(l.nombre || '')}" class="v-btn v-btn-ghost" style="padding:4px 10px;font-size:0.75rem;">Contactar</a>`
  ]);

  return tablaSimple(['Lead', 'Empresa', 'Teléfono', 'Estado', ''], rows);
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'dashboard',
    title: 'Dashboard',
    crumb: 'Ventas / Asesor',
    roles: ['asesor', 'admin'],
    permisos: ['dashboard.ver']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  const vendedorId = usuario.perfil?.vendedor_id;
  const nombre = esc(usuario.perfil?.nombre || 'usuario');

  // Saludo
  content.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2 style="font-family:var(--font-display);font-size:1.5rem;color:var(--v-primary);margin:0 0 4px;">
        Hola, ${nombre}
      </h2>
      <p style="color:var(--v-muted);margin:0;">
        Tu panel de <strong>Asesor Comercial</strong>
      </p>
    </div>
    <div id="dashboard-body">
      <div class="v-empty"><div class="v-empty-text">Cargando KPIs…</div></div>
    </div>
  `;

  const body = $('#dashboard-body');

  if (!vendedorId) {
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Tu usuario no tiene un vendedor asociado. Contacta al administrador.
        </div>
      </div>
    `;
    return;
  }

  try {
    // Cargar KPIs + leads recientes + seguimientos de hoy en paralelo
    const [kpis, leadsRecientes, seguimientoHoy] = await Promise.all([
      DashboardVentasAPI.kpisAsesor(vendedorId),
      DashboardVentasAPI.leadsRecientes(vendedorId, 5),
      DashboardVentasAPI.leadsSeguimientoHoy ? DashboardVentasAPI.leadsSeguimientoHoy(vendedorId) : Promise.resolve([])
    ]);

    body.innerHTML = `
      <!-- KPIs personales -->
      ${kpiGrid([
        kpiCard('Mis leads', kpis.total, 'Total asignados'),
        kpiCard('Nuevos', kpis.nuevos, 'Para contactar', kpis.nuevos > 0 ? 'down' : null),
        kpiCard('Contactados', kpis.contactados, 'En seguimiento'),
        kpiCard('Convertidos', kpis.convertidos, 'Cerrados con éxito', kpis.convertidos > 0 ? 'up' : null),
        kpiCard('Tasa de conversión', kpis.tasa + '%', 'Sobre el total'),
        kpiCard('Seguimientos hoy', kpis.seguimientoHoy ?? 0, 'Requieren atención', (kpis.seguimientoHoy ?? 0) > 0 ? 'down' : 'up')
      ])}

      <!-- Seguimientos de hoy (prioridad) -->
      ${panel(
        'Seguimientos para hoy',
        renderSeguimientoHoy(seguimientoHoy),
        seguimientoHoy.length > 0 ? `<span style="font-size:0.75rem;color:var(--danger);font-weight:600;">${seguimientoHoy.length} pendientes</span>` : ''
      )}

      <!-- Últimos leads -->
      ${panel('Mis últimos leads', renderLeads(leadsRecientes))}

      <!-- Acciones rápidas -->
      ${panel('Acciones rápidas', acciones([
        { label: 'Ver todos mis leads →', href: 'leads.html', tipo: 'v-btn-primary' },
        { label: '+ Nuevo lead', href: 'leads.html?nuevo=1' },
        { label: 'Ver productos', href: 'productos.html' }
      ]))}
    `;
  } catch (e) {
    console.error('[dashboard-asesor] error:', e);
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Error al cargar KPIs: ${esc(e?.message || 'desconocido')}
        </div>
      </div>
    `;
  }
})();