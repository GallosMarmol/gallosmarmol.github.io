// ventas/assets/js/usuarios.js
// Gestión de usuarios (solo admin)

import { renderVentasShell } from './ventas-shell.js';
import { UsuariosAPI } from '../../../shared/js/supabase-client.js';
import { GM } from '../../../shared/js/gm.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const state = {
  usuarios: [],
  roles: [],
  cargando: true
};

function fechaCorta(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function badgeActivo(activo) {
  return activo
    ? '<span class="v-badge v-badge-convertido">Activo</span>'
    : '<span class="v-badge v-badge-descartado">Inactivo</span>';
}

function iniciales(nombre, apellido) {
  const n = (nombre || '').trim()[0] || '';
  const a = (apellido || '').trim()[0] || '';
  return (n + a).toUpperCase() || '?';
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  const usuario = await renderVentasShell({
    active: 'usuarios',
    title: 'Usuarios',
    crumb: 'Administración / Usuarios',
    roles: ['admin'],
    permisos: ['usuarios.gestionar']
  });
  if (!usuario) return;

  const content = $('#v-content');
  if (!content) return;

  content.innerHTML = `
    <div class="v-toolbar">
      <div class="v-search">
        <input id="buscar" type="search" placeholder="Buscar por nombre, email o rol…" autocomplete="off">
      </div>
      <span class="v-count" id="count">—</span>
    </div>

    <div class="v-panel">
      <div class="v-table-wrapper">
        <table class="v-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="6" style="padding:40px;text-align:center;color:var(--v-muted);">Cargando…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    const [usuarios, roles] = await Promise.all([
      UsuariosAPI.listar(),
      UsuariosAPI.listarRoles()
    ]);
    state.usuarios = usuarios;
    state.roles = roles;
    state.cargando = false;
    renderTabla();
    enlazarBusqueda();
  } catch (e) {
    console.error('[usuarios] error:', e);
    $('#tbody').innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--danger);">Error al cargar usuarios: ${esc(e?.message || '')}</td></tr>`;
  }
})();

// ============================================================
// TABLA
// ============================================================
function renderTabla() {
  const tbody = $('#tbody');
  const count = $('#count');
  if (!tbody) return;

  if (count) count.textContent = `${state.usuarios.length} usuario${state.usuarios.length === 1 ? '' : 's'}`;

  if (state.usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--v-muted);">Sin usuarios.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.usuarios.map(u => {
    const p = u.persona || {};
    const ini = iniciales(p.nombre, p.apellido);
    return `
      <tr data-id="${esc(u.id)}">
        <td>
          <div class="v-row-avatar-cell">
            <div class="v-avatar-ini">${esc(ini)}</div>
            <div>
              <div class="v-cell-name">${esc(p.nombre || '—')} ${esc(p.apellido || '')}</div>
              <div class="v-cell-email">${esc(p.telefono || '')}</div>
            </div>
          </div>
        </td>
        <td>${esc(p.email || '—')}</td>
        <td>
          <select class="v-select-vendedor" data-accion="rol" data-id="${esc(u.id)}">
            ${state.roles.map(r => `<option value="${esc(r.id)}" ${u.rol?.id === r.id ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}
          </select>
        </td>
        <td>${badgeActivo(u.activo)}</td>
        <td>${fechaCorta(u.ultimo_acceso)}</td>
        <td>
          <div class="v-row-actions">
            <button class="v-icon-btn" data-accion="toggle" data-id="${esc(u.id)}" title="${u.activo ? 'Desactivar' : 'Activar'}">
              ${u.activo ? '⏸' : '▶'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  enlazarAcciones();
}

// ============================================================
// ACCIONES
// ============================================================
function enlazarAcciones() {
  // Cambiar rol
  $$('select[data-accion="rol"]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = sel.dataset.id;
      const nuevoRolId = sel.value;
      sel.disabled = true;
      try {
        await UsuariosAPI.actualizar(id, { rol_id: nuevoRolId, activo: true });
        GM.toast('Rol actualizado', 'success');
        const u = state.usuarios.find(x => String(x.id) === String(id));
        if (u) u.rol = state.roles.find(r => String(r.id) === String(nuevoRolId));
      } catch (e) {
        console.error(e);
        GM.toast('No se pudo cambiar el rol', 'error');
        renderTabla();
      } finally {
        sel.disabled = false;
      }
    });
  });

  // Toggle activo/inactivo
  $$('button[data-accion="toggle"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const u = state.usuarios.find(x => String(x.id) === String(id));
      if (!u) return;
      const nuevoActivo = !u.activo;
      btn.disabled = true;
      try {
        await UsuariosAPI.actualizar(id, { rol_id: u.rol?.id, activo: nuevoActivo });
        u.activo = nuevoActivo;
        renderTabla();
        GM.toast(nuevoActivo ? 'Usuario activado' : 'Usuario desactivado', 'success');
      } catch (e) {
        console.error(e);
        GM.toast('No se pudo cambiar el estado', 'error');
        btn.disabled = false;
      }
    });
  });
}

// ============================================================
// BÚSQUEDA
// ============================================================
function enlazarBusqueda() {
  const input = $('#buscar');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const filtrados = state.usuarios.filter(u => {
      const p = u.persona || {};
      return (
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.apellido || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (u.rol?.nombre || '').toLowerCase().includes(q)
      );
    });
    renderTablaFiltrada(filtrados);
  });
}

function renderTablaFiltrada(lista) {
  const tbody = $('#tbody');
  const count = $('#count');
  if (!tbody) return;
  if (count) count.textContent = `${lista.length} de ${state.usuarios.length}`;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--v-muted);">Sin resultados.</td></tr>`;
    return;
  }

  // Reusar renderTabla pero con lista filtrada (simplificado)
  const original = state.usuarios;
  state.usuarios = lista;
  renderTabla();
  state.usuarios = original;
}