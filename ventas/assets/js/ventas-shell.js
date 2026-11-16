// ventas/assets/js/ventas-shell.js
// Shell común del portal Ventas: sidebar + topbar + guard

import { protegerPagina } from '../../../shared/js/guard.js';
import { Auth } from '../../../shared/js/auth.js';

// ============================================================
// CONFIGURACIÓN DEL MENÚ
// ============================================================

// ============================================================
// ICONOS SVG DEL MENÚ
// ============================================================
const MENU_ICONS = {
  dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  leads: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  doc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  box: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  'user-cog': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="19" cy="11" r="2"/><path d="M19 8v-1m0 8v-1m3-3h-1m-4 0h-1m2.24-2.24-.7.7m1.42 3.08-.7-.7m-1.42.7-.7.7m1.42-3.08-.7-.7"/></svg>`,
  'settings': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

function iconoMenu(key) {
  return MENU_ICONS[key] || MENU_ICONS.dashboard;
}

const MENU_POR_ROL = {
  asesor: [
    { label: 'General', items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html', permiso: 'dashboard.ver' }
    ]},
    { label: 'CRM', items: [
      { key: 'leads', label: 'Mis leads', icon: 'leads', href: 'leads.html', permiso: 'leads.ver' }
    ]},
    { label: 'Catálogo', items: [
      { key: 'productos', label: 'Productos', icon: 'box', href: 'productos.html', permiso: 'productos.ver' }
    ]}
  ],
  jefe: [
    { label: 'General', items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html', permiso: 'dashboard.ver' }
    ]},
    { label: 'CRM', items: [
      { key: 'leads', label: 'Todos los leads', icon: 'leads', href: 'leads.html', permiso: 'leads.ver' }
    ]},
    { label: 'Catálogo', items: [
      { key: 'productos', label: 'Productos', icon: 'box', href: 'productos.html', permiso: 'productos.ver' }
    ]},
    { label: 'Análisis', items: [
      { key: 'reportes', label: 'Reportes', icon: 'chart', href: 'reportes.html', permiso: 'reportes.ver' }
    ]}
  ],
  admin: [
    { label: 'General', items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html', permiso: 'dashboard.ver' }
    ]},
    { label: 'CRM', items: [
      { key: 'leads', label: 'Leads', icon: 'leads', href: 'leads.html', permiso: 'leads.ver' }
    ]},
    { label: 'Catálogo', items: [
      { key: 'productos', label: 'Productos', icon: 'box', href: 'productos.html', permiso: 'productos.ver' },
      { key: 'catalogo', label: 'Catálogo público', icon: 'globe', href: 'catalogo.html', permiso: 'catalogo.gestionar' }
    ]},
    { label: 'Análisis', items: [
      { key: 'reportes', label: 'Reportes', icon: 'chart', href: 'reportes.html', permiso: 'reportes.ver' }
    ]},
    { label: 'Administración', items: [
      { key: 'usuarios', label: 'Usuarios', icon: 'user-cog', href: 'usuarios.html', permiso: 'usuarios.gestionar' },
      { key: 'configuracion', label: 'Configuración', icon: 'settings', href: 'configuracion.html', permiso: 'usuarios.gestionar' }
    ]}
  ],
  marketing: [
    { label: 'General', items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html', permiso: 'dashboard.ver' }
    ]},
   { label: 'CRM', items: [
      { key: 'leads', label: 'Leads', icon: 'leads', href: 'leads.html', permiso: 'leads.ver' } 
    ]},
    { label: 'Catálogo', items: [
      { key: 'productos', label: 'Productos', icon: 'box', href: 'productos.html', permiso: 'productos.ver' },
      { key: 'catalogo', label: 'Catálogo público', icon: 'globe', href: 'catalogo.html', permiso: 'catalogo.gestionar' }
    ]},
    { label: 'Analítica', items: [
      { key: 'visitas', label: 'Visitas', icon: 'chart', href: 'visitas.html', permiso: 'dashboard.ver' }  // ← NUEVO
    ]}    
  ],
  gerencia: [
    { label: 'General', items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'dashboard.html', permiso: 'dashboard.ver' }
    ]},
    { label: 'Catálogo', items: [
      { key: 'productos', label: 'Productos', icon: 'box', href: 'productos.html', permiso: 'productos.ver' }
    ]},
    { label: 'Análisis', items: [
      { key: 'reportes', label: 'Reportes', icon: 'chart', href: 'reportes.html', permiso: 'reportes.ver' }
    ]}
  ]
};

// ============================================================
// HELPERS
// ============================================================
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

function inicialesDe(perfil) {
  const n = (perfil?.nombre || '').trim();
  const a = (perfil?.apellido || '').trim();
  const ini = `${n[0] || ''}${a[0] || ''}`.toUpperCase();
  return ini || '?';
}

// ============================================================
// RENDER DEL SHELL
// ============================================================
/**
 * Rellena sidebar, topbar y contenido del portal de Ventas.
 * Requiere que el HTML tenga la estructura .ventas-layout con:
 *   #v-sidebar, #v-crumb, #v-title, #v-topbar-right, #v-content
 *
 * @returns {Promise<Object|null>} usuario autenticado o null si redirigió
 */
export async function renderVentasShell(opciones = {}) {
  const {
    active = 'dashboard',
    title = 'Portal de Ventas',
    crumb = 'Ventas',
    roles = ['admin', 'gerencia', 'jefe', 'asesor', 'marketing'],
    permisos = []
  } = opciones;

  // 1. Guard
  const usuario = await protegerPagina({ roles, permisos });
  if (!usuario) return null;

  // Crear overlay si no existe
  if (!document.querySelector('.v-sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'v-sidebar-overlay';
    overlay.id = 'v-sidebar-overlay';
    overlay.addEventListener('click', cerrarSidebar);
    document.body.appendChild(overlay);
  }

  // 2. Verificar estructura mínima
  const sidebar = document.getElementById('v-sidebar');
  const content = document.getElementById('v-content');
  if (!sidebar || !content) {
    console.error('[ventas-shell] Falta #v-sidebar o #v-content en el HTML.');
    return null;
  }

  // 3. Topbar
  const crumbEl = document.getElementById('v-crumb');
  const titleEl = document.getElementById('v-title');
  if (crumbEl) crumbEl.textContent = crumb;
  if (titleEl) titleEl.textContent = title;

  // 4. Sidebar
  renderSidebar(usuario, active);

  // 5. Topbar-right (acciones globales)
  renderTopbarRight(usuario);

  return usuario;

  // Cerrar sidebar con ESC
  if (!window.__ventasShellEscBound) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sidebar = document.querySelector('.v-sidebar.open');
        if (sidebar) cerrarSidebar();
      }
    });
    window.__ventasShellEscBound = true;
  }

}

// ============================================================
// SIDEBAR
// ============================================================
function renderSidebar(usuario, active) {
  const sidebar = document.getElementById('v-sidebar');
  if (!sidebar) return;

  const esAdmin = usuario.perfil?.rol === 'admin';
  const permisosUsuario = Array.isArray(usuario.permisos) ? usuario.permisos : [];
  const iniciales = inicialesDe(usuario.perfil);
  const rol = usuario.perfil?.rol;
  const menu = MENU_POR_ROL[rol] || MENU_POR_ROL.asesor;


    const gruposHtml = menu.map((grupo) => {

    const itemsVisibles = grupo.items.filter((item) => {
      if (item.permiso === null) return true;
      if (esAdmin) return true;
      return permisosUsuario.includes(item.permiso);
    });

    if (itemsVisibles.length === 0) return '';

    const itemsHtml = itemsVisibles
      .map((item) => {
        const isActive = item.key === active;
        const href = item.soon ? '#' : item.href;
        const badge = item.soon ? '<span class="badge-soon">Pronto</span>' : '';
        const disabledAttr = item.soon ? 'aria-disabled="true" tabindex="-1"' : '';
        return `
          <a class="v-nav-item ${isActive ? 'active' : ''}" href="${esc(href)}" data-key="${esc(item.key || '')}" ${disabledAttr}>
            <span class="icon">${iconoMenu(item.icon)}</span>
            <span class="v-nav-label-text">${esc(item.label)}</span>
            <span class="v-nav-badge" data-badge="${esc(item.key || '')}"></span>
            ${badge}
          </a>`;
      })
      .join('');

    return `
      <div class="v-nav-group">
        <div class="v-nav-label">${esc(grupo.label)}</div>
        ${itemsHtml}
      </div>`;
  }).join('');

  sidebar.innerHTML = `
    <button class="v-sidebar-close" id="v-sidebar-close" type="button" aria-label="Cerrar menú">×</button>
    <div class="v-sidebar-brand">
      <img src="../../shared/assets/foto_01.png" alt="Gallos Mármol" class="v-sidebar-logo">
    </div>
    <nav class="v-sidebar-nav">${gruposHtml}</nav>
    <div class="v-sidebar-user">
      <div class="v-user-avatar">${esc(iniciales)}</div>
      <div class="v-user-info">
        <div class="v-user-name">${esc(usuario.perfil?.nombre || 'Usuario')} ${esc(usuario.perfil?.apellido || '')}</div>
        <div class="v-user-role">${esc(usuario.perfil?.rol_nombre || usuario.perfil?.rol || '')}</div>
      </div>
      <button class="v-user-logout" id="v-logout" type="button" title="Cerrar sesión" aria-label="Cerrar sesión">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  `;

  // Cerrar sidebar
  sidebar.querySelector('#v-sidebar-close')?.addEventListener('click', cerrarSidebar);

  sidebar.querySelector('#v-logout')?.addEventListener('click', () => {
    abrirModalLogout();
  });

}

/**
 * Actualiza un badge del sidebar.
 * @param {string} key - La key del ítem (ej: 'leads')
 * @param {number} count - El número a mostrar (0 lo oculta)
 */
export function actualizarBadgeSidebar(key, count) {
  const badge = document.querySelector(`.v-nav-badge[data-badge="${key}"]`);
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

// ============================================================
// TOPBAR RIGHT
// ============================================================
function renderTopbarRight(usuario) {
  const el = document.getElementById('v-topbar-right');
  if (!el) return;
  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  el.innerHTML = `
    <span class="v-topbar-date" style="font-size:0.8rem;color:var(--v-muted);text-transform:capitalize;">${esc(hoy)}</span>
    <button class="v-burger" id="v-burger" type="button" aria-label="Abrir menú" aria-expanded="false">
      ☰
    </button>
  `;

  // Enlazar el botón hamburguesa
  const burger = el.querySelector('#v-burger');
  if (burger) {
    burger.addEventListener('click', toggleSidebar);
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.v-sidebar');
  const overlay = document.querySelector('.v-sidebar-overlay');
  if (!sidebar) return;

  const isOpen = sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', isOpen);

  const burger = document.querySelector('#v-burger');
  if (burger) burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

  // Bloquear scroll del body cuando el sidebar está abierto en móvil
  document.body.classList.toggle('sidebar-open', isOpen);
}

function cerrarSidebar() {
  const sidebar = document.querySelector('.v-sidebar');
  const overlay = document.querySelector('.v-sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('sidebar-open');
  const burger = document.querySelector('#v-burger');
  if (burger) burger.setAttribute('aria-expanded', 'false');
}

// ============================================================
// MODAL DE CERRAR SESIÓN
// ============================================================
function abrirModalLogout() {
  // Si ya existe, no duplicar
  if (document.getElementById('modal-logout')) {
    document.getElementById('modal-logout').classList.add('open');
    document.body.classList.add('modal-open');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'modal-logout';
  modal.className = 'v-modal-backdrop';
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'logout-title');

  modal.innerHTML = `
    <div class="v-modal v-confirm-modal" style="max-width:420px;">
      <div class="v-confirm-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </div>
      <h2 class="v-confirm-title" id="logout-title">Cerrar sesión</h2>
      <p class="v-confirm-desc">¿Estás seguro que quieres cerrar sesión? Tendrás que volver a ingresar tus credenciales.</p>
      <div class="v-confirm-footer">
        <button class="v-btn v-btn-ghost" type="button" data-cancel>Cancelar</button>
        <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Cerrar sesión</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  const cerrar = () => {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  modal.querySelector('[data-cancel]').addEventListener('click', cerrar);
  modal.querySelector('.v-modal-backdrop');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrar();
  });

  modal.querySelector('[data-confirm]').addEventListener('click', async () => {
    const btn = modal.querySelector('[data-confirm]');
    btn.disabled = true;
    btn.textContent = 'Cerrando…';
    await Auth.logout();
  });

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      cerrar();
      document.removeEventListener('keydown', onEsc);
    }
  }, { once: true });

  // Abrir con animación
  requestAnimationFrame(() => modal.classList.add('open'));
}