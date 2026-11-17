// ventas/assets/js/reportes.js
// Reportes con gráficos (admin/jefe/gerencia)

import { renderVentasShell } from './ventas-shell.js';
import { ReportesAPI } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const state = {
  desde: '',
  hasta: '',
  datos: null,
  charts: {}
};

function fechaInput(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const rolVista = document.body.dataset.rol || 'admin';
  const usuario = await renderVentasShell({
    active: 'reportes',
    title: 'Reportes',
    crumb: 'Análisis / Reportes',
    roles: [rolVista, 'admin'],
    permisos: ['reportes.ver']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  // Rango por defecto: últimos 6 meses
  const hoy = new Date();
  const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
  state.desde = fechaInput(hace6Meses.toISOString());
  state.hasta = fechaInput(hoy.toISOString());

  content.innerHTML = `
    <div class="v-toolbar" style="margin-bottom:20px;">
      <div class="v-date-range">
        <label class="v-date-label">
          <span>Desde</span>
          <input type="date" id="fecha-desde" class="v-date-input" value="${esc(state.desde)}">
        </label>
        <label class="v-date-label">
          <span>Hasta</span>
          <input type="date" id="fecha-hasta" class="v-date-input" value="${esc(state.hasta)}">
        </label>
        <button class="v-btn v-btn-primary" id="btn-aplicar" type="button">Aplicar</button>
        <button class="v-btn v-btn-ghost" id="btn-exportar" type="button">Exportar CSV</button>
      </div>
    </div>

    <div id="reportes-body">
      <div class="v-empty"><div class="v-empty-text">Cargando reportes…</div></div>
    </div>
  `;

  $('#btn-aplicar')?.addEventListener('click', () => {
    state.desde = $('#fecha-desde').value;
    state.hasta = $('#fecha-hasta').value;
    cargarReportes();
  });

  $('#btn-exportar')?.addEventListener('click', exportarCSV);

  await cargarReportes();
})();

// ============================================================
// CARGA DE DATOS Y RENDER
// ============================================================
async function cargarReportes() {
  const body = $('#reportes-body');
  if (!body) return;
  body.innerHTML = `<div class="v-empty"><div class="v-empty-text">Cargando reportes…</div></div>`;

  try {
    const datos = await ReportesAPI.obtenerDatos(state.desde || null, state.hasta || null);
    state.datos = datos;
    renderReportes(datos);
  } catch (e) {
    console.error('[reportes] error:', e);
    body.innerHTML = `<div class="v-empty"><div class="v-empty-text" style="color:var(--danger);">Error: ${esc(e?.message || '')}</div></div>`;
  }
}

function renderReportes(d) {
  const body = $('#reportes-body');
  if (!body) return;

  body.innerHTML = `
    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;">
      <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;">
        <div style="font-size:0.8rem;color:var(--v-muted);">Leads totales</div>
        <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);">${d.total}</div>
      </div>
      <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;">
        <div style="font-size:0.8rem;color:var(--v-muted);">Convertidos</div>
        <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);">${d.convertidos}</div>
      </div>
      <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;">
        <div style="font-size:0.8rem;color:var(--v-muted);">Tasa de conversión</div>
        <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);">${d.tasa}%</div>
      </div>
    </div>

    <!-- Gráficos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <div class="v-panel" style="padding:20px;">
        <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 14px;">Evolución mensual</h3>
        <canvas id="chart-evolucion" height="220"></canvas>
      </div>
      <div class="v-panel" style="padding:20px;">
        <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 14px;">Distribución por estado</h3>
        <canvas id="chart-estado" height="220"></canvas>
      </div>
    </div>

    <div class="v-panel" style="padding:20px;">
      <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 14px;">Top vendedores</h3>
      <canvas id="chart-vendedores" height="180"></canvas>
    </div>
  `;

  renderChartEvolucion(d.evolucion);
  renderChartEstado(d.porEstado);
  renderChartVendedores(d.topVendedores);
}

// ============================================================
// GRÁFICOS (Chart.js)
// ============================================================
function renderChartEvolucion(evolucion) {
  const ctx = document.getElementById('chart-evolucion');
  if (!ctx) return;
  if (state.charts.evolucion) state.charts.evolucion.destroy();

  state.charts.evolucion = new Chart(ctx, {
    type: 'line',
    data: {
      labels: evolucion.map(e => e.mes),
      datasets: [
        {
          label: 'Leads',
          data: evolucion.map(e => e.leads),
          borderColor: '#6b0000',
          backgroundColor: 'rgba(107,0,0,0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Convertidos',
          data: evolucion.map(e => e.convertidos),
          borderColor: '#4d7c53',
          backgroundColor: 'rgba(77,124,83,0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderChartEstado(porEstado) {
  const ctx = document.getElementById('chart-estado');
  if (!ctx) return;
  if (state.charts.estado) state.charts.estado.destroy();

  state.charts.estado = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: porEstado.map(e => e.estado),
      datasets: [{
        data: porEstado.map(e => e.cantidad),
        backgroundColor: ['#3d6b7d', '#b8863b', '#5f6f52', '#4d7c53', '#a63d33']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderChartVendedores(vendedores) {
  const ctx = document.getElementById('chart-vendedores');
  if (!ctx) return;
  if (state.charts.vendedores) state.charts.vendedores.destroy();

  state.charts.vendedores = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: vendedores.map(v => v.nombre),
      datasets: [{
        label: 'Convertidos',
        data: vendedores.map(v => v.convertidos),
        backgroundColor: '#6b0000'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ============================================================
// EXPORTAR CSV
// ============================================================
function exportarCSV() {
  if (!state.datos || !state.datos.rows || state.datos.rows.length === 0) {
    GM.toast('No hay datos para exportar', 'error');
    return;
  }

  const rows = state.datos.rows;
  const headers = ['ID', 'Nombre', 'Empresa', 'Teléfono', 'Email', 'Estado', 'Fecha', 'Vendedor'];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      r.id,
      `"${(r.nombre || '').replace(/"/g, '""')}"`,
      `"${(r.empresa || '').replace(/"/g, '""')}"`,
      `"${(r.telefono || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${r.estado || ''}"`,
      `"${r.fecha || ''}"`,
      `"${(r.vendedor?.nombre_completo || 'Sin asignar').replace(/"/g, '""')}"`
    ].join(','))
  ];

  const csv = '\uFEFF' + csvRows.join('\n'); // BOM para Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-leads-${state.desde || 'todo'}-${state.hasta || 'todo'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  GM.toast('CSV exportado', 'success');
}