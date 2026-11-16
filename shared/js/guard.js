// shared/js/guard.js
// Guardián de páginas protegidas

import { Auth } from './auth.js';

/**
 * Protege una página. Debe llamarse al inicio de cada página protegida.
 * 
 * @param {Object} opciones
 * @param {string[]} opciones.roles - Roles permitidos (ej: ['ventas', 'admin'])
 * @param {string[]} opciones.permisos - Permisos requeridos (todos deben cumplirse)
 * @param {string} opciones.redireccion - URL de redirección si no autorizado
 * @returns {Promise<Object|null>} { user, perfil, permisos } o null
 */
export async function protegerPagina(opciones = {}) {
  const {
    roles = [],
    permisos = [],
    redireccion = '/auth/login.html'
  } = opciones;

  const usuario = await Auth.getUsuarioActual();

  // 1. Sin sesión → al login
  if (!usuario) {
    window.location.href = redireccion;
    return null;
  }

  // 2. Rol incorrecto → acceso denegado
  if (roles.length > 0 && !roles.includes(usuario.perfil.rol)) {
    mostrarAccesoDenegado(
      `Tu rol "${usuario.perfil.rol_nombre || usuario.perfil.rol}" no tiene acceso a esta sección.`
    );
    return null;
  }

  // 3. Permisos (admin pasa siempre)
  if (permisos.length > 0 && usuario.perfil.rol !== 'admin') {
    const faltantes = permisos.filter(p => !usuario.permisos.includes(p));
    if (faltantes.length > 0) {
      mostrarAccesoDenegado(`No tienes los permisos necesarios: ${faltantes.join(', ')}`);
      return null;
    }
  }

  return usuario;
}

function mostrarAccesoDenegado(mensaje) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;font-family:system-ui,sans-serif;text-align:center;background:#f5f5f5;">
      <div style="max-width:500px;">
        <div style="font-size:4rem;margin-bottom:1rem;">🚫</div>
        <h1 style="font-size:1.75rem;margin-bottom:1rem;color:#6b0000;">Acceso Denegado</h1>
        <p style="color:#666;margin-bottom:1.5rem;line-height:1.6;">${mensaje}</p>
        <a href="/auth/login.html" style="display:inline-block;background:#6b0000;color:#fff;padding:0.75rem 1.5rem;border-radius:4px;text-decoration:none;font-weight:600;">Volver al login</a>
      </div>
    </div>
  `;
}