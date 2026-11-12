// shared/js/auth.js
// Capa de autenticación: sesión, roles y permisos

import { supabase } from './supabase-client.js';

let _cacheUsuario = null;
let _cacheTs = 0;
const CACHE_TTL = 30_000;

function _limpiarCache() {
  _cacheUsuario = null;
  _cacheTs = 0;
}

export const Auth = {

  /**
   * Inicia sesión con email y contraseña
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    _limpiarCache();                       // ← añadir (por si había cache de otro usuario)
    return data.user;
  },

  /**
   * Cierra sesión y redirige al login
   */
  async logout({ redirect = true } = {}) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[auth] signOut:', e?.message || e);
    }
    _limpiarCache();

    if (redirect) {
      // replace() no añade al historial → "atrás" no vuelve a la página protegida
      window.location.replace('/auth/login.html');
    }
  },
  
  /**
   * Obtiene el usuario actual con su perfil y permisos
   * @returns {Object|null} { user, perfil, permisos }
   */
  async getUsuarioActual(force = false) {
      // 1. Cache hit
      if (!force && _cacheUsuario && Date.now() - _cacheTs < CACHE_TTL) {
        return _cacheUsuario;
      }

      // 2. Obtener sesión
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[auth] getSession:', sessionError);
        return null;
      }
      if (!session) {
        _limpiarCache();
        return null;
      }

      // 3. Obtener usuario + rol + persona
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          activo,
          ultimo_acceso,
          persona_id,
          rol:roles!rol_id(id, codigo, nombre),
          persona:persona_id(id, nombre, apellido, email, telefono)
        `)
        .eq('auth_id', session.user.id)
        .maybeSingle();

      if (userError) {
        console.error('[auth] usuarios:', userError);
        return null;
      }
      if (!usuario) {
        console.warn('[auth] No hay registro en "usuarios" para auth_id', session.user.id);
        return null;
      }

      // 4. Verificar que esté activo
      if (usuario.activo === false) {
        console.warn('[auth] Usuario desactivado:', usuario.id);
        await supabase.auth.signOut();
        _limpiarCache();
        return null;
      }

      // 5. Obtener permisos del rol
      const { data: permisosData } = await supabase
        .from('roles_permisos')
        .select('permiso:permisos!permiso_id(codigo)')
        .eq('rol_id', usuario.rol?.id);

      const permisos = (permisosData || [])
        .map(p => p.permiso?.codigo)
        .filter(Boolean);

      let vendedorId = null;
      if (usuario.persona_id) {
        try {
          const { data: vendedorData, error: vendedorError } = await supabase
            .from('vw_vendedores')
            .select('id')
            .eq('persona_id', usuario.persona_id)
            .maybeSingle();

          if (vendedorError) {
            console.warn('[auth] lookup vendedor:', vendedorError.message);
          } else {
            vendedorId = vendedorData?.id || null;
            if (!vendedorId) {
              console.warn('[auth] No hay vendedor para persona_id:', usuario.persona_id);
            }
          }
        } catch (e) {
          console.warn('[auth] error lookup vendedor:', e?.message || e);
        }
    }

      _cacheUsuario = {
        user: session.user,
        perfil: {
          id: usuario.id,
          nombre: usuario.persona?.nombre || 'Usuario',
          apellido: usuario.persona?.apellido || '',
          email: usuario.persona?.email || session.user.email,
          telefono: usuario.persona?.telefono || '',
          rol: usuario.rol?.codigo,
          rol_nombre: usuario.rol?.nombre,
          persona_id: usuario.persona_id,
          vendedor_id: vendedorId         
        },
        permisos
      };
      _cacheTs = Date.now();

      // 7. Sincronizar el rol en el JWT (user_metadata) para la RLS.
      //    Solo si cambió, para no hacer un updateUser en cada request.
      if (usuario.rol?.codigo) {
        const rolEnJwt = session.user.user_metadata?.rol;
        if (rolEnJwt !== usuario.rol.codigo) {
          try {
            await supabase.auth.updateUser({
              data: { rol: usuario.rol.codigo }
            });
            // Nota: el JWT tarda un momento en actualizarse en el cliente.
            // El próximo request ya tendrá el rol nuevo.
          } catch (e) {
            console.warn('[auth] no se pudo sincronizar rol en JWT:', e?.message || e);
          }
        }
      }

      return _cacheUsuario;
    },

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  async tienePermiso(codigo) {
    const usuario = await this.getUsuarioActual();
    if (!usuario) return false;
    if (usuario.perfil.rol === 'admin') return true;
    return usuario.permisos.includes(codigo);
  },

  /**
   * Verifica si el usuario tiene un rol específico
   */
  async tieneRol(codigo) {
    const usuario = await this.getUsuarioActual();
    return usuario?.perfil?.rol === codigo;
  },

  /**
   * Devuelve la URL del dashboard según el rol
   */
  getDashboardUrl(rol) {
    const rutas = {
      admin:     '/ventas/admin/dashboard.html',
      gerencia:  '/ventas/gerencia/dashboard.html',
      jefe:      '/ventas/jefe/dashboard.html',
      asesor:    '/ventas/asesor/dashboard.html',
      marketing: '/ventas/marketing/dashboard.html',
      cliente:   '/familia/index.html'
    };
    return rutas[rol] || '/familia/index.html';
  }
};

// ============================================================
// PROTECCIÓN CONTRA "ATRÁS" DEL NAVEGADOR (bfcache)
// ============================================================
// Cuando el usuario cierra sesión y pulsa "atrás", el navegador
// puede mostrar la página desde caché (bfcache) SIN recargarla.
// Este listener detecta ese caso y redirige al login si no hay sesión.
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', async (e) => {
    // e.persisted === true → la página se restauró desde bfcache
    if (e.persisted) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.replace('/auth/login.html');
      }
    }
  });
}