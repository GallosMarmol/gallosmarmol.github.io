// ventas/assets/js/configuracion.js
// Configuración del sistema (solo admin).

import { renderVentasShell } from './ventas-shell.js';
import { TrackingConfigAPI, supabase } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

const $ = (sel) => document.querySelector(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'configuracion',
    title: 'Configuración',
    crumb: 'Administración / Configuración',
    roles: ['admin'],
    permisos: ['usuarios.gestionar']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <div style="max-width:760px;">

      <!-- Sección: Tracking de visitas -->
      <div class="v-panel" style="padding:24px;margin-bottom:20px;">
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="width:44px;height:44px;border-radius:8px;background:var(--v-primary-10);color:var(--v-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0;">
            <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 4px;">
              Tracking de visitas
            </h3>
            <p style="color:var(--v-muted);font-size:0.85rem;margin:0 0 16px;">
              Cuando está activo, se registran las visitas anónimas a las páginas públicas
              (catálogo, outlet, saldos, producto). Cuando está pausado, no se guarda nada.
            </p>

            <!-- Estado actual -->
            <div id="tracking-state" style="margin-bottom:16px;">
              <div class="v-empty" style="padding:20px;">
                <div class="v-empty-text">Cargando estado…</div>
              </div>
            </div>

            <!-- Toggle -->
            <label id="tracking-toggle-wrapper" style="display:none;align-items:center;gap:12px;cursor:pointer;user-select:none;">
              <span style="position:relative;display:inline-block;width:52px;height:28px;">
                <input type="checkbox" id="tracking-toggle" style="opacity:0;width:0;height:0;position:absolute;">
                <span id="tracking-slider" style="position:absolute;inset:0;background:#ccc;border-radius:28px;transition:background 0.2s ease;">
                  <span id="tracking-knob" style="position:absolute;top:3px;left:3px;width:22px;height:22px;background:#fff;border-radius:50%;transition:transform 0.2s ease;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span>
                </span>
              </span>
              <span id="tracking-label" style="font-size:0.9rem;font-weight:600;color:var(--v-text);">—</span>
            </label>

            <!-- Última actualización -->
            <div id="tracking-updated" style="margin-top:14px;font-size:0.75rem;color:var(--v-muted);"></div>
          </div>
        </div>
      </div>

    <!-- Sección: Estado de las líneas -->
    <div class="v-panel" style="padding:24px;margin-bottom:20px;">
      <div style="display:flex;align-items:flex-start;gap:16px;">
        <div style="width:44px;height:44px;border-radius:8px;background:var(--v-primary-10);color:var(--v-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 4px;">
            Estado de las líneas
          </h3>
          <p style="color:var(--v-muted);font-size:0.85rem;margin:0 0 16px;">
            Controla si cada línea del catálogo público está visible, en mantenimiento, próximamente o finalizada.
          </p>

          ${renderLineaConfig('catalogo', 'Catálogo')}
          ${renderLineaConfig('outlet', 'Outlet')}
          ${renderLineaConfig('saldos', 'Saldos de exportación')}
        </div>
      </div>
    </div>

      <!-- Sección: Líneas del catálogo -->
      <div class="v-panel" style="padding:24px;margin-bottom:20px;opacity:0.6;">
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="width:44px;height:44px;border-radius:8px;background:var(--v-primary-10);color:var(--v-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0;">
            <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 4px;">
              Configuración de líneas
            </h3>
            <p style="color:var(--v-muted);font-size:0.85rem;margin:0;">
              Catálogo, outlet y saldos de exportación. <span style="font-style:italic;">Próximamente.</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Sección: Notificaciones -->
      <div class="v-panel" style="padding:24px;margin-bottom:20px;opacity:0.6;">
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="width:44px;height:44px;border-radius:8px;background:var(--v-primary-10);color:var(--v-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0;">
            <h3 style="font-family:var(--font-display);font-size:1.1rem;color:var(--v-primary);margin:0 0 4px;">
              Notificaciones
            </h3>
            <p style="color:var(--v-muted);font-size:0.85rem;margin:0;">
              Configuración de emails y notificaciones push. <span style="font-style:italic;">Próximamente.</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  `;

  // ============================================================
  // CARGAR CONFIGURACIÓN DEL TRACKING
  // ============================================================
  await cargarTracking();
  await cargarYEnlazarEstadosLineas();
})();

// ============================================================
// TRACKING
// ============================================================
async function cargarTracking() {
  const stateEl = $('#tracking-state');
  const toggleWrapper = $('#tracking-toggle-wrapper');
  const toggle = $('#tracking-toggle');
  const label = $('#tracking-label');
  const updatedEl = $('#tracking-updated');
  const slider = $('#tracking-slider');
  const knob = $('#tracking-knob');

  if (!stateEl || !toggleWrapper) return;

  try {
    const config = await TrackingConfigAPI.obtener();

    if (!config) {
      stateEl.innerHTML = `
        <div style="padding:16px;background:rgba(166,61,51,0.08);border:1px solid rgba(166,61,51,0.25);border-radius:6px;color:var(--danger);font-size:0.85rem;">
          No se encontró la configuración. Ejecuta el SQL de <code>tracking_config</code> en Supabase.
        </div>
      `;
      return;
    }

    const activo = config.activo === true;

    // Ocultar "Cargando…" y mostrar el toggle
    stateEl.style.display = 'none';
    toggleWrapper.style.display = 'flex';

    toggle.checked = activo;
    actualizarLabel(label, activo);
    actualizarSlider(slider, knob, activo);

    if (config.actualizado_en) {
      const fecha = new Date(config.actualizado_en);
      updatedEl.textContent = `Última actualización: ${fecha.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })}`;
    }

    // Listener del toggle
    toggle.addEventListener('change', async () => {
      const nuevo = toggle.checked;
      toggle.disabled = true;

      try {
        await TrackingConfigAPI.actualizar(nuevo);
        actualizarLabel(label, nuevo);
        actualizarSlider(slider, knob, nuevo);
        GM.toast(nuevo ? 'Tracking activado' : 'Tracking pausado', 'success');

        // Actualizar el timestamp
        const ahora = new Date();
        updatedEl.textContent = `Última actualización: ${ahora.toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          day: '2-digit', month: 'short', year: '2-digit',
          hour: '2-digit', minute: '2-digit'
        })}`;
      } catch (e) {
        console.error('[configuracion] error:', e);
        toggle.checked = !nuevo; // revertir
        GM.toast('No se pudo cambiar el estado', 'error');
      } finally {
        toggle.disabled = false;
      }
    });

  } catch (e) {
    console.error('[configuracion] error:', e);
    stateEl.innerHTML = `
      <div style="padding:16px;background:rgba(166,61,51,0.08);border:1px solid rgba(166,61,51,0.25);border-radius:6px;color:var(--danger);font-size:0.85rem;">
        Error al cargar la configuración: ${esc(e?.message || 'desconocido')}
      </div>
    `;
  }
}

function actualizarLabel(el, activo) {
  if (!el) return;
  el.textContent = activo ? 'Tracking activo' : 'Tracking pausado';
  el.style.color = activo ? 'var(--success)' : 'var(--v-muted)';
}

function actualizarSlider(slider, knob, activo) {
  if (!slider || !knob) return;
  slider.style.background = activo ? 'var(--v-primary)' : '#ccc';
  knob.style.transform = activo ? 'translateX(24px)' : 'translateX(0)';
}

// ============================================================
// HELPER: Renderizar bloque de configuración de una línea
// ============================================================
function renderLineaConfig(lineaKey, lineaLabel) {
    return `
        <div class="cfg-linea" data-linea="${lineaKey}" style="border:1px solid var(--v-primary-10);border-radius:8px;padding:14px 16px;margin-bottom:12px;background:var(--v-primary-05);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:600;color:var(--v-primary);font-size:0.9rem;">${esc(lineaLabel)}</span>
                    <span class="cfg-estado-badge" data-badge="${lineaKey}" style="font-size:0.7rem;padding:2px 8px;border-radius:999px;background:var(--v-primary);color:var(--v-secondary);font-weight:600;">—</span>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="font-size:0.7rem;color:var(--v-muted);display:block;margin-bottom:3px;font-weight:600;">Estado</label>
                    <select class="cfg-select-estado" data-linea="${lineaKey}" style="width:100%;padding:7px 10px;border:1px solid var(--v-primary-15);border-radius:4px;font-size:0.8rem;font-family:inherit;background:#fff;">
                        <option value="activo">✅ Activo</option>
                        <option value="proximamente">⏰ Próximamente</option>
                        <option value="finalizado">🔒 Finalizado</option>
                        <option value="mantenimiento">🛠️ Mantenimiento</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.7rem;color:var(--v-muted);display:block;margin-bottom:3px;font-weight:600;">Mensaje (opcional)</label>
                    <input type="text" class="cfg-input-mensaje" data-linea="${lineaKey}" placeholder="Ej. Volvemos el lunes 15" style="width:100%;padding:7px 10px;border:1px solid var(--v-primary-15);border-radius:4px;font-size:0.8rem;font-family:inherit;">
                </div>
            </div>

            <div style="display:flex;gap:8px;">
                <button type="button" class="v-btn v-btn-primary cfg-btn-guardar" data-linea="${lineaKey}" style="padding:6px 14px;font-size:0.8rem;">
                    Guardar
                </button>
                <div class="cfg-feedback" data-linea="${lineaKey}" style="font-size:0.75rem;display:flex;align-items:center;"></div>
            </div>
        </div>
    `;
}

// ============================================================
// CARGAR Y GUARDAR ESTADO DE LAS LÍNEAS
// ============================================================
async function cargarYEnlazarEstadosLineas() {
    // 1. Cargar estado de cada línea
    const { data: lineasConfig, error } = await supabase
        .from('lineas_config')
        .select('linea, estado, mensaje_custom, fecha_inicio, fecha_fin')
        .in('linea', ['catalogo', 'outlet', 'saldos']);

    if (error) {
        console.warn('[configuracion] error cargando estados:', error);
        return;
    }

    const porLinea = {};
    (lineasConfig || []).forEach(l => { porLinea[l.linea] = l; });

    // 2. Rellenar cada bloque
    document.querySelectorAll('.cfg-linea').forEach(bloque => {
        const linea = bloque.dataset.linea;
        const config = porLinea[linea];
        if (!config) return;

        const sel = bloque.querySelector('.cfg-select-estado');
        const inp = bloque.querySelector('.cfg-input-mensaje');
        const badge = bloque.querySelector('.cfg-estado-badge');

        if (sel) sel.value = config.estado || 'activo';
        if (inp) inp.value = config.mensaje_custom || '';
        if (badge) {
            badge.textContent = config.estado || 'activo';
            badge.style.background = badgeColor(config.estado);
        }
    });

    // 3. Enlazar los botones "Guardar"
    document.querySelectorAll('.cfg-btn-guardar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const linea = btn.dataset.linea;
            const bloque = btn.closest('.cfg-linea');
            const sel = bloque.querySelector('.cfg-select-estado');
            const inp = bloque.querySelector('.cfg-input-mensaje');
            const badge = bloque.querySelector('.cfg-estado-badge');
            const feedback = bloque.querySelector('.cfg-feedback');

            const nuevoEstado = sel.value;
            const nuevoMensaje = inp.value.trim() || null;

            btn.disabled = true;
            btn.textContent = 'Guardando…';
            if (feedback) {
                feedback.textContent = '';
                feedback.style.color = '';
            }

            try {
                const { error: errUpdate } = await supabase
                    .from('lineas_config')
                    .update({
                        estado: nuevoEstado,
                        mensaje_custom: nuevoMensaje,
                        actualizado_en: new Date().toISOString()
                    })
                    .eq('linea', linea);

                if (errUpdate) throw errUpdate;

                if (badge) {
                    badge.textContent = nuevoEstado;
                    badge.style.background = badgeColor(nuevoEstado);
                }
                if (feedback) {
                    feedback.textContent = '✅ Guardado';
                    feedback.style.color = 'var(--success)';
                    setTimeout(() => { feedback.textContent = ''; }, 2500);
                }
                GM.toast?.(`${linea} actualizado`, 'success');

            } catch (e) {
                console.error('[configuracion] error guardando:', e);
                if (feedback) {
                    feedback.textContent = '❌ Error: ' + (e?.message || 'desconocido');
                    feedback.style.color = 'var(--danger)';
                }
                GM.toast?.('No se pudo guardar', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar';
            }
        });
    });
}

function badgeColor(estado) {
    const colores = {
        activo: '#4d7c53',
        proximamente: '#b8863b',
        finalizado: '#a63d33',
        mantenimiento: '#6b0000'
    };
    return colores[estado] || '#6b0000';
}