// ventas/assets/js/visitas.js
// Analítica de visitas a páginas públicas.

import { renderVentasShell } from './ventas-shell.js';
import { VisitasAPI } from '../../../shared/js/supabase-client.js';

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// ============================================================
// ESTADO
// ============================================================
const state = {
  desde: '',
  hasta: '',
  linea: '',        // '', 'catalogo', 'outlet', 'saldos'
  resumen: null,
  comportamiento: null,
  conversion: null,
  conversionDetalle: null,  
  porDia: [],
  topPaginas: [],
  topProductos: [],
  topReferrers: [],
  recientes: [],
  cargando: false,
  charts: {}
};

// ============================================================
// HELPERS
// ============================================================
function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function fechaHace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formatearFecha(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso); // new Date() interpreta el string UTC correctamente
    return d.toLocaleString('es-PE', {
      timeZone: 'America/Lima', // ← Forzar la zona horaria de Perú
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

function formatearDiaCorto(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function acortarPagina(pagina) {
  if (!pagina) return '—';
  // Quitar query string y extensión
  let p = pagina.split('?')[0];
  // Quitar /familia/
  p = p.replace('/familia/', '');
  // Quitar .html
  p = p.replace('.html', '');
  // Si queda vacío, mostrar "Inicio"
  if (p === '' || p === '/') return 'Inicio';
  return p;
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'visitas',
    title: 'Visitas',
    crumb: 'Analítica / Visitas',
    roles: ['marketing', 'admin', 'gerencia'],
    permisos: ['dashboard.ver']
  });
  if (!usuario) return;

  // Rango por defecto: últimos 7 días
  state.desde = fechaHace(7);
  state.hasta = fechaHoy();

  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <!-- Toolbar con filtros -->
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
      </div>

      <select class="v-select-estado" id="filtro-linea" style="min-width:180px;border-radius:999px;">
        <option value="">Todas las líneas</option>
        <option value="catalogo">Catálogo</option>
        <option value="outlet">Outlet</option>
        <option value="saldos">Saldos de exportación</option>
      </select>

      <button class="v-btn v-btn-ghost" id="btn-7d" type="button">Últimos 7 días</button>
      <button class="v-btn v-btn-ghost" id="btn-30d" type="button">Últimos 30 días</button>
    </div>

    <div id="visitas-body">
      <div class="v-empty"><div class="v-empty-text">Cargando…</div></div>
    </div>
  `;

  // ============================================================
  // LISTENERS
  // ============================================================
  $('#btn-aplicar')?.addEventListener('click', () => {
    state.desde = $('#fecha-desde').value;
    state.hasta = $('#fecha-hasta').value;
    state.linea = $('#filtro-linea').value;
    cargarTodo();
  });

  $('#filtro-linea')?.addEventListener('change', (e) => {
    state.linea = e.target.value;
    cargarTodo();
  });

  $('#btn-7d')?.addEventListener('click', () => {
    state.desde = fechaHace(7);
    state.hasta = fechaHoy();
    $('#fecha-desde').value = state.desde;
    $('#fecha-hasta').value = state.hasta;
    cargarTodo();
  });

  $('#btn-30d')?.addEventListener('click', () => {
    state.desde = fechaHace(30);
    state.hasta = fechaHoy();
    $('#fecha-desde').value = state.desde;
    $('#fecha-hasta').value = state.hasta;
    cargarTodo();
  });

  // ============================================================
  // CARGA INICIAL
  // ============================================================
  await cargarTodo();
})();

// ============================================================
// CARGA DE DATOS
// ============================================================
async function cargarTodo() {
  const body = $('#visitas-body');
  if (!body) return;

  if (state.cargando) return;
  state.cargando = true;

  body.innerHTML = `<div class="v-empty"><div class="v-empty-text">Cargando…</div></div>`;

  try {
    const linea = state.linea || null;

    const [resumen, comportamiento, conversion, conversionDetalle, porDia, topPaginas, topProductos, topReferrers, recientes] = await Promise.all([
      VisitasAPI.resumen(state.desde, state.hasta, linea),
      VisitasAPI.comportamiento(state.desde, state.hasta, linea),
      VisitasAPI.tasaConversion(state.desde, state.hasta, linea),
      VisitasAPI.conversionDetallada(state.desde, state.hasta, linea),
      VisitasAPI.porDia(state.desde, state.hasta, linea),
      VisitasAPI.topPaginas(state.desde, state.hasta, 10),
      VisitasAPI.topProductos(state.desde, state.hasta, 10),
      VisitasAPI.topReferrers(state.desde, state.hasta, 10),
      VisitasAPI.recientes(state.desde, state.hasta, 20)
    ]);

    state.resumen = resumen;
    state.comportamiento = comportamiento;
    state.conversion = conversion;  
    state.conversionDetalle = conversionDetalle;       
    state.porDia = porDia;
    state.topPaginas = topPaginas;
    state.topProductos = topProductos;
    state.topReferrers = topReferrers;
    state.recientes = recientes;

    renderTodo();

  } catch (e) {
    console.error('[visitas] error:', e);
    body.innerHTML = `
      <div class="v-empty">
        <div class="v-empty-text" style="color:var(--danger);">
          Error al cargar visitas: ${esc(e?.message || 'desconocido')}
        </div>
      </div>
    `;
  } finally {
    state.cargando = false;
  }
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function renderTodo() {
  const body = $('#visitas-body');
  if (!body) return;

  Object.keys(state.charts).forEach(key => {
    if (state.charts[key]) {
      state.charts[key].destroy();
      delete state.charts[key];
    }
  });

  const r = state.resumen || {};
  const c = state.comportamiento || {};
  const cv = state.conversion || {};
  const cd = state.conversionDetalle || {};
  const tasaNuevos = r.visitasTotales > 0
    ? Math.round((r.nuevos / r.visitasTotales) * 100)
    : 0;

  body.innerHTML = `
    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;">
      ${kpiCard('Visitas totales', r.visitasTotales ?? 0, 'En el rango seleccionado')}
      ${kpiCard('Visitantes únicos', r.visitantesUnicos ?? 0, 'Dispositivos distintos')}
      ${kpiCard('Nuevos', r.nuevos ?? 0, `${tasaNuevos}% del total`, tasaNuevos > 50 ? 'up' : null)}
      ${kpiCard('Recurrentes', r.recurrentes ?? 0, 'Ya visitaron antes')}
    </div>

    <!-- KPIs de comportamiento -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;">
      ${kpiCard(
        'Páginas por visitante',
        c.paginasPorVisitante ?? 0,
        c.paginasPorVisitante >= 2 ? 'El contenido engancha' : 'Visitan pocas páginas',
        c.paginasPorVisitante >= 2 ? 'up' : 'down'
      )}
      ${kpiCard(
        'Tasa de rebote',
        (c.tasaRebote ?? 0) + '%',
        `${c.rebotadores ?? 0} de ${c.totalVisitantes ?? 0} se van sin navegar`,
        c.tasaRebote > 60 ? 'down' : 'up'
      )}
      ${kpiCard(
        'Duración media',
        formatDuracion(c.duracionMediaSeg ?? 0),
        c.duracionMediaSeg >= 60 ? 'Exploran con calma' : 'Visitas muy cortas',
        c.duracionMediaSeg >= 60 ? 'up' : 'down'
      )}
      ${kpiCard(
        'Rebotadores',
        c.rebotadores ?? 0,
        'Solo vieron 1 página',
        c.rebotadores > 0 ? 'down' : 'up'
      )}
      ${kpiCard(
        'Visitas por día',
        c.visitasPorDia ?? 0,
        'Promedio diario del rango',
        c.visitasPorDia >= 10 ? 'up' : null
      )}
    </div>

    <!-- KPIs de conversión -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px;">
      ${kpiCard(
        'Tasa de conversión',
        (cv.tasaConversion ?? 0) + '%',
        `${cv.convertidos ?? 0} de ${cv.totalVisitantes ?? 0} visitantes → lead`,
        cv.tasaConversion > 0 ? 'up' : null
      )}
      ${kpiCard(
        'Visitantes que convirtieron',
        cv.convertidos ?? 0,
        `${cv.totalLeads ?? 0} leads totales en el rango`
      )}
      ${kpiCard(
        'Visitantes sin convertir',
        (cv.totalVisitantes ?? 0) - (cv.convertidos ?? 0),
        'Oportunidad de mejora'
      )}
    </div>

    <!-- Panel de conversión detallada -->
    <div class="v-panel" style="padding:20px;margin-bottom:20px;">
      <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 16px;">
        Conversión detallada
      </h3>

      <!-- Tabs -->
      <div style="display:flex;gap:4px;border-bottom:1px solid var(--v-primary-15);margin-bottom:16px;">
        <button class="v-tab-conv active" data-tab="linea">Por línea</button>
        <button class="v-tab-conv" data-tab="origen">Por origen</button>
        <button class="v-tab-conv" data-tab="dia">Por día</button>
      </div>

      <!-- Tab: Por línea -->
      <div id="tab-conv-linea" class="v-conv-tab-content" style="display:block;">
        ${renderTablaConversion(cd.porLinea || [], 'linea', 'Línea')}
      </div>

      <!-- Tab: Por origen -->
      <div id="tab-conv-origen" class="v-conv-tab-content" style="display:none;">
        ${renderTablaConversion(cd.porOrigen || [], 'origen', 'Origen')}
      </div>

      <!-- Tab: Por día -->
      <div id="tab-conv-dia" class="v-conv-tab-content" style="display:none;">
        <div style="position:relative;height:260px;width:100%;margin-bottom:16px;">
          <canvas id="chart-conv-dia"></canvas>
        </div>
        ${renderTablaConversion(cd.porDia || [], 'dia', 'Día')}
      </div>
    </div>

    <!-- Dispositivos + gráfico -->
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-bottom:20px;">
      <div class="v-panel" style="padding:20px;">
        <h3 style="font-family:var(--font-display);font-size:1.05rem;color:var(--v-primary);margin:0 0 14px;">
          Dispositivos
        </h3>
        <div style="position:relative;height:200px;width:100%;">
          <canvas id="chart-dispositivo"></canvas>
        </div>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;font-size:0.8rem;">
          ${renderDispositivos(r.porDispositivo || {})}
        </div>
      </div>

      <div class="v-panel" style="padding:20px;">
        <h3 style="font-family:var(--font-display);font-size:1.05rem;color:var(--v-primary);margin:0 0 14px;">
          Evolución diaria
        </h3>
        <div style="position:relative;height:220px;width:100%;">
          <canvas id="chart-evolucion"></canvas>
        </div>
      </div>
    </div>

    <!-- Top páginas + top productos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      ${panelTabla('Top páginas más visitadas', ['Página', 'Visitas'], state.topPaginas.map(t => [
        `<strong>${esc(acortarPagina(t.pagina))}</strong>`,
        `<span style="font-weight:600;">${t.visitas}</span>`
      ]))}

      ${panelTabla('Top productos vistos', ['SKU', 'Visitas'], state.topProductos.map(t => [
        `<span style="font-family:monospace;font-size:0.8rem;">${esc(t.sku)}</span>`,
        `<span style="font-weight:600;">${t.visitas}</span>`
      ]))}
    </div>

    <!-- Top referrers -->
    ${panelTabla('Top orígenes de tráfico', ['Referrer', 'Visitas'], state.topReferrers.map(t => [
      `<strong>${esc(t.referrer || 'Directo')}</strong>`,
      `<span style="font-weight:600;">${t.visitas}</span>`
    ]))}

    <!-- Visitas recientes -->
    ${renderVisitasRecientes(state.recientes)}
  `;

  // ============================================================
  // LISTENERS DE LAS TABS DE CONVERSIÓN
  // ============================================================
  document.querySelectorAll('.v-tab-conv').forEach(btn => {
    btn.addEventListener('click', () => {
      // Desactivar todas
      document.querySelectorAll('.v-tab-conv').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.v-conv-tab-content').forEach(c => c.style.display = 'none');

      // Activar la clickeada
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      const contenido = document.getElementById(`tab-conv-${tab}`);
      if (contenido) contenido.style.display = 'block';
    });
  });  

  renderChartDispositivo(r.porDispositivo || {});
  renderChartEvolucion(state.porDia);
  renderChartConversionDia(cd.porDia || []);
}

// ============================================================
// COMPONENTES
// ============================================================
function kpiCard(label, valor, nota, notaTipo) {
  return `
    <div class="kpi-card" style="background:#fff;border:1px solid var(--v-primary-15);border-radius:8px;padding:18px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--v-primary);"></div>
      <div style="font-size:0.8rem;color:var(--v-muted);">${esc(label)}</div>
      <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:600;color:var(--v-primary);margin-top:4px;">
        ${esc(valor)}
      </div>
      ${nota ? `<div style="font-size:0.75rem;margin-top:6px;color:${notaTipo === 'down' ? 'var(--danger)' : notaTipo === 'up' ? 'var(--success)' : 'var(--v-muted)'};">${esc(nota)}</div>` : ''}
    </div>
  `;
}

function panelTabla(titulo, headers, rows) {
  if (!rows || rows.length === 0) {
    return `
      <div class="v-panel" style="padding:20px;">
        <h3 style="font-family:var(--font-display);font-size:1.05rem;color:var(--v-primary);margin:0 0 14px;">${esc(titulo)}</h3>
        <div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin datos</div>
      </div>
    `;
  }

  return `
    <div class="v-panel" style="padding:20px;">
      <h3 style="font-family:var(--font-display);font-size:1.05rem;color:var(--v-primary);margin:0 0 14px;">${esc(titulo)}</h3>
      <div style="overflow-x:auto;">
        <table class="v-table" style="width:100%;">
          <thead>
            <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDispositivos(d) {
  const items = [
    { key: 'desktop', label: 'Desktop', color: '#6b0000' },
    { key: 'movil', label: 'Móvil', color: '#b08d57' },
    { key: 'tablet', label: 'Tablet', color: '#4d7c53' },
    { key: 'otro', label: 'Otro', color: '#8c8478' }
  ];
  const total = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  return items.map(i => {
    const val = d[i.key] || 0;
    const pct = Math.round((val / total) * 100);
    return `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i.color};"></span>
        <span style="flex:1;">${i.label}</span>
        <strong>${val}</strong>
        <span style="color:var(--v-muted);font-size:0.75rem;min-width:40px;text-align:right;">${pct}%</span>
      </div>
    `;
  }).join('');
}

function renderVisitasRecientes(recientes) {
  if (!recientes || recientes.length === 0) {
    return `
      <div class="v-panel" style="padding:20px;">
        <h3 style="font-family:var(--font-display);font-size:1.05rem;color:var(--v-primary);margin:0 0 14px;">
          Visitas recientes
        </h3>
        <div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin visitas en este rango.</div>
      </div>
    `;
  }

  const rows = recientes.map(v => [
    `<span style="font-size:0.8rem;">${esc(formatearFecha(v.creado_en))}</span>`,
    `<strong>${esc(acortarPagina(v.pagina))}</strong>`,
    v.producto_sku ? `<span style="font-family:monospace;font-size:0.75rem;">${esc(v.producto_sku)}</span>` : '—',
    v.linea ? `<span class="v-badge v-badge-nuevo">${esc(v.linea)}</span>` : '—',
    esc(v.referrer || 'Directo'),
    v.dispositivo ? `<span style="font-size:0.75rem;color:var(--v-muted);">${esc(v.dispositivo)}</span>` : '—'
  ]);

  return panelTabla(
    'Visitas recientes',
    ['Fecha', 'Página', 'SKU', 'Línea', 'Referrer', 'Dispositivo'],
    rows
  );
}

// ============================================================
// GRÁFICOS (Chart.js)
// ============================================================
function renderChartDispositivo(porDispositivo) {
  const ctx = document.getElementById('chart-dispositivo');
  if (!ctx) return;
  if (state.charts.dispositivo) state.charts.dispositivo.destroy();

  const labels = ['Desktop', 'Móvil', 'Tablet', 'Otro'];
  const data = [
    porDispositivo.desktop || 0,
    porDispositivo.movil || 0,
    porDispositivo.tablet || 0,
    porDispositivo.otro || 0
  ];

  state.charts.dispositivo = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#6b0000', '#b08d57', '#4d7c53', '#8c8478'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderChartEvolucion(porDia) {
  const ctx = document.getElementById('chart-evolucion');
  if (!ctx) return;
  if (state.charts.evolucion) state.charts.evolucion.destroy();

  const labels = porDia.map(d => formatearDiaCorto(d.dia));
  const visitas = porDia.map(d => d.visitas);
  const visitantes = porDia.map(d => d.visitantes);

  state.charts.evolucion = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Visitas',
          data: visitas,
          borderColor: '#6b0000',
          backgroundColor: 'rgba(107, 0, 0, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#6b0000'
        },
        {
          label: 'Visitantes únicos',
          data: visitantes,
          borderColor: '#b08d57',
          backgroundColor: 'rgba(176, 141, 87, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#b08d57',
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: 11 }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function formatDuracion(segundos) {
  if (!segundos || segundos < 1) return '0s';
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const min = Math.floor(segundos / 60);
  const seg = Math.round(segundos % 60);
  if (min < 60) return `${min}m ${seg}s`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function renderTablaConversion(rows, campo, label) {
  if (!rows || rows.length === 0) {
    return `<div style="padding:20px;text-align:center;color:var(--v-muted);font-size:0.85rem;">Sin datos</div>`;
  }

  const rowsHtml = rows.map(r => {
    const tasa = r.tasa ?? 0;
    const colorTasa = tasa >= 10 ? 'var(--success)' : tasa > 0 ? 'var(--warning)' : 'var(--v-muted)';
    return `
      <tr>
        <td><strong>${esc(r[campo] || '—')}</strong></td>
        <td style="text-align:right;">${r.visitantes ?? 0}</td>
        <td style="text-align:right;color:var(--success);font-weight:600;">${r.convertidos ?? 0}</td>
        <td style="text-align:right;font-weight:700;color:${colorTasa};">${tasa}%</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="overflow-x:auto;">
      <table class="v-table" style="width:100%;">
        <thead>
          <tr>
            <th>${esc(label)}</th>
            <th style="text-align:right;">Visitantes</th>
            <th style="text-align:right;">Convertidos</th>
            <th style="text-align:right;">Tasa</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

function renderChartConversionDia(porDia) {
  const ctx = document.getElementById('chart-conv-dia');
  if (!ctx) return;
  if (state.charts.convDia) state.charts.convDia.destroy();

  if (!porDia || porDia.length === 0) {
    ctx.parentElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--v-muted);font-size:0.85rem;">
        Sin datos de conversión para el rango seleccionado
      </div>
    `;
    return;
  }

  // Solo pintar los días que tienen visitantes (los días sin datos no aportan)
  const dias = porDia.filter(d => d.visitantes > 0);
  const labels = dias.map(d => formatearDiaCorto(d.dia));
  const tasas = dias.map(d => d.tasa);
  const visitantes = dias.map(d => d.visitantes);
  const convertidos = dias.map(d => d.convertidos);

  // Color dinámico: rojo si tasa < 5%, dorado si 5-10%, verde si > 10%
  const puntoColor = (tasa) => {
    if (tasa >= 10) return '#4d7c53';
    if (tasa >= 5) return '#b08d57';
    return '#a63d33';
  };

  state.charts.convDia = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Tasa de conversión (%)',
          data: tasas,
          borderColor: '#6b0000',
          backgroundColor: 'rgba(107, 0, 0, 0.08)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: dias.map(d => puntoColor(d.tasa)),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: 'Visitantes',
          data: visitantes,
          borderColor: '#b08d57',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [5, 5],
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: 11 },
            padding: 14
          }
        },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const i = items[0].dataIndex;
              const d = dias[i];
              return [
                `Convertidos: ${d.convertidos}`,
                `Visitantes: ${d.visitantes}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Tasa (%)',
            color: '#6b0000',
            font: { size: 11, weight: '600' }
          },
          ticks: {
            color: '#6b0000',
            callback: (v) => v + '%'
          },
          grid: {
            color: 'rgba(107, 0, 0, 0.06)'
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Visitantes',
            color: '#b08d57',
            font: { size: 11, weight: '600' }
          },
          ticks: {
            color: '#b08d57',
            precision: 0
          },
          grid: {
            drawOnChartArea: false
          }
        },
        x: {
          ticks: {
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}