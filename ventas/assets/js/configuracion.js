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
      <!-- Sección: Tracking -->
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
              Tracking
            </h3>
            <p style="color:var(--v-muted);font-size:0.85rem;margin:0 0 20px;">
              Controla qué datos anónimos se registran de las páginas públicas. Puedes activar o pausar el tracking de visitas y de eventos por separado.
            </p>

            <!-- Bloque 1: Visitas -->
            <div id="tracking-state-visitas" style="margin-bottom:20px;">
              <div class="v-empty" style="padding:16px;">
                <div class="v-empty-text">Cargando estado…</div>
              </div>
            </div>

            <!-- Bloque 2: Eventos -->
            <div id="tracking-state-eventos">
              <div class="v-empty" style="padding:16px;">
                <div class="v-empty-text">Cargando estado…</div>
              </div>
            </div>

            <!-- Última actualización -->
            <div id="tracking-updated" style="margin-top:16px;font-size:0.75rem;color:var(--v-muted);border-top:1px solid var(--v-primary-10);padding-top:12px;"></div>
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
  const stateVisitas = $('#tracking-state-visitas');
  const stateEventos = $('#tracking-state-eventos');
  const updatedEl = $('#tracking-updated');
  if (!stateVisitas || !stateEventos) return;

  try {
    const config = await TrackingConfigAPI.obtener();

    if (!config) {
      const errHtml = `
        <div style="padding:16px;background:rgba(166,61,51,0.08);border:1px solid rgba(166,61,51,0.25);border-radius:6px;color:var(--danger);font-size:0.85rem;">
          No se encontró la configuración. Ejecuta el SQL de <code>tracking_config</code> en Supabase.
        </div>
      `;
      stateVisitas.innerHTML = errHtml;
      stateEventos.innerHTML = errHtml;
      return;
    }

    const activoVisitas = config.activo === true;
    const activoEventos = config.activo_eventos !== false;

    // Render de cada bloque
    stateVisitas.innerHTML = renderTrackingToggle({
      id: 'visitas',
      titulo: 'Tracking de visitas',
      descripcion: 'Registra pageviews anónimos en <code>visitas_publicas</code> (qué páginas se ven, cuántas veces).',
      activo: activoVisitas
    });
    stateEventos.innerHTML = renderTrackingToggle({
      id: 'eventos',
      titulo: 'Tracking de eventos',
      descripcion: 'Registra dwell time, scroll depth y acciones del usuario en <code>eventos_publicos</code>.',
      activo: activoEventos
    });

    // Actualizar timestamp
    if (config.actualizado_en && updatedEl) {
      updatedEl.textContent = `Última actualización: ${new Date(config.actualizado_en).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })}`;
    }

    // Listeners de cada toggle
    bindToggle('visitas', activoVisitas, 'activo', updatedEl);
    bindToggle('eventos', activoEventos, 'activo_eventos', updatedEl);

  } catch (e) {
    console.error('[configuracion] error:', e);
    stateVisitas.innerHTML = `
      <div style="padding:16px;background:rgba(166,61,51,0.08);border:1px solid rgba(166,61,51,0.25);border-radius:6px;color:var(--danger);font-size:0.85rem;">
        Error al cargar la configuración: ${esc(e?.message || 'desconocido')}
      </div>
    `;
  }
}

// ============================================================
// HELPER: Render de un toggle de tracking
// ============================================================
function renderTrackingToggle({ id, titulo, descripcion, activo }) {
  return `
    <div style="border:1px solid var(--v-primary-10);border-radius:8px;padding:16px;background:var(--v-primary-05);">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:var(--v-primary);font-size:0.9rem;margin-bottom:4px;">
            ${esc(titulo)}
          </div>
          <div style="font-size:0.8rem;color:var(--v-muted);line-height:1.5;">
            ${descripcion}
          </div>
        </div>

        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;flex-shrink:0;">
          <span style="position:relative;display:inline-block;width:52px;height:28px;">
            <input type="checkbox" id="tracking-toggle-${id}" data-field="${id}" style="opacity:0;width:0;height:0;position:absolute;" ${activo ? 'checked' : ''}>
            <span id="tracking-slider-${id}" style="position:absolute;inset:0;background:${activo ? 'var(--v-primary)' : '#ccc'};border-radius:28px;transition:background 0.2s ease;">
              <span id="tracking-knob-${id}" style="position:absolute;top:3px;left:3px;width:22px;height:22px;background:#fff;border-radius:50%;transition:transform 0.2s ease;box-shadow:0 2px 4px rgba(0,0,0,0.2);transform:${activo ? 'translateX(24px)' : 'translateX(0)'};"></span>
            </span>
          </span>
          <span id="tracking-label-${id}" style="font-size:0.85rem;font-weight:600;color:${activo ? 'var(--success)' : 'var(--v-muted)'};min-width:110px;">
            ${activo ? 'Activo' : 'Pausado'}
          </span>
        </label>
      </div>
    </div>
  `;
}

// ============================================================
// HELPER: Bind del toggle
// ============================================================
function bindToggle(id, activoInicial, fieldApi, updatedEl) {
  const toggle = document.getElementById(`tracking-toggle-${id}`);
  const slider = document.getElementById(`tracking-slider-${id}`);
  const knob = document.getElementById(`tracking-knob-${id}`);
  const label = document.getElementById(`tracking-label-${id}`);
  if (!toggle) return;

  toggle.addEventListener('change', async () => {
    const nuevo = toggle.checked;
    toggle.disabled = true;

    try {
      await TrackingConfigAPI.actualizar({ [fieldApi]: nuevo });

      // Actualizar UI
      if (slider) slider.style.background = nuevo ? 'var(--v-primary)' : '#ccc';
      if (knob) knob.style.transform = nuevo ? 'translateX(24px)' : 'translateX(0)';
      if (label) {
        label.textContent = nuevo ? 'Activo' : 'Pausado';
        label.style.color = nuevo ? 'var(--success)' : 'var(--v-muted)';
      }

      GM.toast(
        nuevo ? `${id === 'visitas' ? 'Tracking de visitas' : 'Tracking de eventos'} activado` : `${id === 'visitas' ? 'Tracking de visitas' : 'Tracking de eventos'} pausado`,
        'success'
      );

      // Actualizar timestamp
      if (updatedEl) {
        updatedEl.textContent = `Última actualización: ${new Date().toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          day: '2-digit', month: 'short', year: '2-digit',
          hour: '2-digit', minute: '2-digit'
        })}`;
      }
    } catch (e) {
      console.error('[configuracion] error:', e);
      toggle.checked = !nuevo;
      GM.toast('No se pudo cambiar el estado', 'error');
    } finally {
      toggle.disabled = false;
    }
  });
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

            <div class="cfg-linea__flags" style="margin-top:8px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.8rem;">
                <input type="checkbox" class="cfg-checkbox-mostrar-antes" data-linea="${lineaKey}">
                Mostrar productos antes de la fecha de inicio
              </label>
            </div>       

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="font-size:0.7rem;color:var(--v-muted);display:block;margin-bottom:3px;font-weight:600;">Estado</label>
                    <select class="cfg-select-estado" data-linea="${lineaKey}" style="width:100%;padding:7px 10px;border:1px solid var(--v-primary-15);border-radius:4px;font-size:0.8rem;font-family:inherit;background:#fff;">
                        <option value="activo">Activo</option>
                        <option value="proximamente">Próximamente</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="mantenimiento">Mantenimiento</option>
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