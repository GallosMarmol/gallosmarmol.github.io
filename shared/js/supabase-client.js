// ============================================================
// GALLOS MÁRMOL — Cliente de Supabase
// APIs: Auth, Leads, Vendedores, Origenes, Productos, Dashboard
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ============================================================
// CONFIGURACIÓN - ¡REEMPLAZA CON TUS DATOS!
// ============================================================
const SUPABASE_URL = 'https://qfwhwolehgjomjanvydu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2h3b2xlaGdqb21qYW52eWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTk2NTUsImV4cCI6MjEwMzk3NTY1NX0.zErWxdb561yQlmWwGXhrwCjYurUdZbaXQC7lpXZ5jz0';

// ============================================================
// CLIENTE
// ============================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Convierte URLs de Google Drive a formato lh3.googleusercontent.com
 */
export function convertirUrlGoogleDrive(url) {
  if (!url) return null;
  if (url.includes('lh3.googleusercontent.com')) return url;
  if (url.includes('drive.google.com')) {
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /uc\?id=([a-zA-Z0-9_-]+)/,
      /open\?id=([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
  }
  return url;
}

/**
 * Convierte un array de URLs de Google Drive
 */
export function convertirArrayUrls(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
  return arr.map(url => convertirUrlGoogleDrive(url)).filter(Boolean);
}

// ============================================================
// AUTH API - Autenticación y usuarios
// ============================================================
export const AuthAPI = {
  /**
   * Iniciar sesión
   */
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      // Obtener datos completos del usuario (con persona)
      const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select(`
        id,
        activo,
        ultimo_acceso,
        rol:roles!rol_id(id, codigo, nombre),
        persona:persona_id(
          id,
          nombre,
          apellido,
          email,
          telefono
        )
      `)
      .eq('auth_id', data.user.id)      // o .eq('auth_id', user.id) en getCurrentUser
      .single();

      if (userError) {
        // Si no existe en public.usuarios, usar metadatos de auth
        return {
          user: data.user,                 // o "user: user," en getCurrentUser
          profile: {
            id: null,
            rol: data.user.user_metadata?.rol || 'cliente',
            rol_nombre: 'Cliente',
            activo: true,
            nombre: data.user.user_metadata?.nombre || 'Usuario',
            apellido: data.user.user_metadata?.apellido || '',
            email: data.user.email,        // o user.email
            telefono: data.user.user_metadata?.telefono || ''
          }
        };
      }

      // Actualizar último acceso
      await supabase
        .from('usuarios')
        .update({ ultimo_acceso: new Date().toISOString() })
        .eq('auth_id', data.user.id);

        return {
          user: data.user,                 // o "user: user," en getCurrentUser
          profile: {
            id: userData.id,
            rol: userData.rol?.codigo,
            rol_nombre: userData.rol?.nombre,
            activo: userData.activo,
            nombre: userData.persona?.nombre || 'Usuario',
            apellido: userData.persona?.apellido || '',
            email: userData.persona?.email || data.user.email,    // o user.email
            telefono: userData.persona?.telefono || ''
          }
        };

    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          activo,
          ultimo_acceso,
          rol:roles!rol_id(id, codigo, nombre),
          persona:persona_id(
            id,
            nombre,
            apellido,
            email,
            telefono
          )
        `)
        .eq('auth_id', data.user.id)      
        .single();

      if (userError) {
        return {
          user: data.user,                 // o "user: user," en getCurrentUser
          profile: {
            id: null,
            rol: data.user.user_metadata?.rol || 'cliente',
            rol_nombre: 'Cliente',
            activo: true,
            nombre: data.user.user_metadata?.nombre || 'Usuario',
            apellido: data.user.user_metadata?.apellido || '',
            email: data.user.email,        // o user.email
            telefono: data.user.user_metadata?.telefono || ''
          }
        };
      }

        return {
          user: data.user,                 // o "user: user," en getCurrentUser
          profile: {
            id: userData.id,
            rol: userData.rol?.codigo,
            rol_nombre: userData.rol?.nombre,
            activo: userData.activo,
            nombre: userData.persona?.nombre || 'Usuario',
            apellido: userData.persona?.apellido || '',
            email: userData.persona?.email || data.user.email,    // o user.email
            telefono: userData.persona?.telefono || ''
          }
        };

    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  async isAuthenticated() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return !!user;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtener el rol del usuario actual
   */
  async getUserRol() {
    const userData = await this.getCurrentUser();
    return userData?.profile?.rol || null;
  },

  /**
   * Redirigir según el rol
   */
  getDashboardUrl(rol) {
    const dashboards = {
      admin: '../admin/dashboard.html',
      ventas: 'dashboard.html',
      almacen: '../almacen/dashboard.html',
      gerencia: 'dashboard.html',
      ti: '../admin/dashboard.html',
      cliente: '../../familia/index.html'
    };
    return dashboards[rol] || 'dashboard.html';
  }
};

// ============================================================
// LEADS API - CRUD de leads con productos
// ============================================================
export const LeadsAPI = {
  /**
   * Listar leads con filtros y paginación server-side
   */
  async listar(opciones = {}) {
    try {
    const {
      pagina = 1,
      porPagina = 25,
      ordenarPor = 'creado_en',
      orden = 'desc',
      buscar = null,
      estado = null,
      origen_id = null,
      vendedor_id = null,
      fecha_desde = null,
      fecha_hasta = null,
      contar = false,
      proximo_contacto_hoy = false,
      sinAsignar = false,           
      sinContactar3d = false        
    } = opciones;

      let query = supabase
        .from('vw_leads_con_productos')
        .select('*', { count: contar ? 'exact' : null });

      // Filtros
      if (estado) query = query.eq('estado', estado);
      if (origen_id) query = query.eq('origen_id', origen_id);
      if (vendedor_id) query = query.eq('vendedor_id', vendedor_id);
      if (fecha_desde) query = query.gte('fecha', fecha_desde);
      if (fecha_hasta) query = query.lte('fecha', fecha_hasta);

      // Filtro "Seguimiento hoy": leads con proximo_contacto = hoy
      if (proximo_contacto_hoy) {
        const hoy = new Date().toISOString().slice(0, 10);
        query = query.eq('proximo_contacto', hoy);
      }

      // Filtro "Sin asignar": leads sin vendedor
      if (sinAsignar) {
        query = query.is('vendedor_id', null);
      }

      // Filtro "Sin contactar > 3 días": leads nuevos con más de 3 días
      if (sinContactar3d) {
        const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        query = query.in('estado', ['Nuevo', 'Contactado']).lt('fecha', hace3dias);
      }      

      // Búsqueda
      if (buscar) {
        query = query.or(
          `nombre.ilike.%${buscar}%,` +
          `empresa.ilike.%${buscar}%,` +
          `email.ilike.%${buscar}%,` +
          `telefono.ilike.%${buscar}%,` +
          `mensaje.ilike.%${buscar}%`
        );
      }

      // Ordenamiento
      query = query.order(ordenarPor, { ascending: orden === 'asc' });

      // Paginación server-side
      const desde = (pagina - 1) * porPagina;
      const hasta = desde + porPagina - 1;
      query = query.range(desde, hasta);

      if (proximo_contacto_hoy) {
        const hoy = new Date().toISOString().slice(0, 10);
        query = query.eq('proximo_contacto', hoy);
      }      

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        datos: data || [],
        total: count || 0,
        pagina,
        porPagina
      };

    } catch (error) {
      console.error('Error listando leads:', error);
      throw error;
    }
  },

  /**
   * Obtener un lead por ID
   */
  async obtener(id) {
    // 1. Cargar el lead
    const { data: lead, error } = await supabase
      .from('vw_leads_con_productos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!lead) return null;

    // 2. Cargar los productos del lead con sus medidas (JOIN a productos + unidades)
    const { data: productos, error: errProd } = await supabase
      .from('leads_productos')
      .select(`
        producto_id,
        producto_nombre,
        producto_sku,
        cantidad,
        unidad_venta_id,
        unidad_simbolo,
        producto:productos!producto_id(
          id,
          sku,
          nombre,
          largo,
          ancho,
          espesor,
          unidad_largo_id,
          unidad_ancho_id,
          unidad_espesor_id,
          unidad_largo:unidades_medida!unidad_largo_id(id, simbolo, nombre),
          unidad_ancho:unidades_medida!unidad_ancho_id(id, simbolo, nombre),
          unidad_espesor:unidades_medida!unidad_espesor_id(id, simbolo, nombre)
        )
      `)
      .eq('lead_id', id);

    if (errProd) throw errProd;

    // 3. Normalizar: aplanar el objeto `producto` para que `largo`, `ancho`, etc. sean accesibles directamente
    const productosNormalizados = (productos || []).map(lp => {
      const p = lp.producto || {};
      return {
        producto_id: lp.producto_id,
        nombre: p.nombre || lp.producto_nombre || 'Producto',
        sku: p.sku || lp.producto_sku || null,
        cantidad: lp.cantidad,
        unidad: lp.unidad_simbolo || 'und',
        largo: p.largo ?? null,
        ancho: p.ancho ?? null,
        espesor: p.espesor ?? null,
        unidad_largo_simbolo: p.unidad_largo?.simbolo || 'cm',
        unidad_ancho_simbolo: p.unidad_ancho?.simbolo || 'cm',
        unidad_espesor_simbolo: p.unidad_espesor?.simbolo || 'cm'
      };
    });

    return { ...lead, productos: productosNormalizados };
  },

  /**
   * Crear un nuevo lead con productos
   */
  async crear(lead, productos = []) {
    try {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([{
          nombre: lead.nombre,
          empresa: lead.empresa || null,
          telefono: lead.telefono || null,
          email: lead.email || null,
          fecha: lead.fecha || new Date().toISOString().slice(0, 10),
          vendedor_id: lead.vendedor_id || null,
          origen_id: lead.origen_id || null,
          estado: lead.estado || 'Nuevo',
          mensaje: lead.mensaje || null
        }])
        .select()
        .single();

      if (leadError) throw leadError;

      if (productos.length > 0) {
        const productosData = productos.map(p => ({
          lead_id: leadData.id,
          producto_id: p.producto_id,
          producto_nombre: p.producto_nombre,
          producto_sku: p.producto_sku,
          cantidad: p.cantidad || 1,
          unidad_venta_id: p.unidad_venta_id || null,
          unidad_simbolo: p.unidad_simbolo || null
        }));

        const { error: productosError } = await supabase
          .from('leads_productos')
          .insert(productosData);

        if (productosError) throw productosError;
      }

      return leadData;
    } catch (error) {
      console.error('Error creando lead:', error);
      throw error;
    }
  },

  /**
   * Actualizar un lead
   */
async actualizar(id, datos, productos = null) {
  try {
    const payload = {
      nombre: datos.nombre,
      empresa: datos.empresa || null,
      telefono: datos.telefono || null,
      email: datos.email || null,
      fecha: datos.fecha,
      vendedor_id: datos.vendedor_id || null,
      origen_id: datos.origen_id || null,
      estado: datos.estado,
      mensaje: datos.mensaje || null,
      proximo_contacto: datos.proximo_contacto || null,   
      actualizado_en: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // Si se pasan productos, actualizarlos
    if (productos !== null) {
      await supabase.from('leads_productos').delete().eq('lead_id', id);
      if (productos.length > 0) {
        const productosData = productos.map(p => ({
          lead_id: id,
          producto_id: p.producto_id,
          producto_nombre: p.producto_nombre,
          producto_sku: p.producto_sku,
          cantidad: p.cantidad || 1,
          unidad_venta_id: p.unidad_venta_id || null,
          unidad_simbolo: p.unidad_simbolo || null
        }));
        const { error: productosError } = await supabase
          .from('leads_productos')
          .insert(productosData);
        if (productosError) throw productosError;
      }
    }

    return data;
  } catch (error) {
    console.error('Error actualizando lead:', error);
    throw error;
  }
},

  /**
   * Cambiar solo el estado de un lead (para dropdown rápido)
   */
  async cambiarEstado(id, nuevoEstado) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({
          estado: nuevoEstado,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Si data es null, el UPDATE se ejecutó pero RLS oculta la fila.
      // Puedes devolver un objeto simulado o el id para que leads.js no falle.
      if (!data) {
        console.warn(`[leads] Lead ${id} actualizado pero RLS oculta la fila de vuelta.`);
        return { id, estado: nuevoEstado }; // Devolvemos algo para que el front no rompa
      }

      return data;
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  },

  /**
   * Reasignar vendedor (para dropdown rápido)
   */
  async reasignarVendedor(id, vendedorId) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({
          vendedor_id: vendedorId,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reasignando vendedor:', error);
      throw error;
    }
  },

  /**
   * Eliminar un lead
   */
  async eliminar(id) {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando lead:', error);
      throw error;
    }
  },

  /**
   * Eliminar múltiples leads (acciones en lote)
   */
  async eliminarVarios(ids) {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando leads:', error);
      throw error;
    }
  },

  /**
   * Contar leads por filtros (útil para el dashboard)
   */
  async contar(filtros = {}) {
    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      if (filtros.estado) query = query.eq('estado', filtros.estado);
      if (filtros.vendedor_id) query = query.eq('vendedor_id', filtros.vendedor_id);
      if (filtros.origen_id) query = query.eq('origen_id', filtros.origen_id);

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error contando leads:', error);
      return 0;
    }
  }
};

// ============================================================
// VENDEDORES API
// ============================================================
export const VendedoresAPI = {
  /**
   * Listar vendedores activos
   */
  async listar() {
    try {
      const { data, error } = await supabase
        .from('vw_vendedores')
        .select('*')
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listando vendedores:', error);
      return [];
    }
  },

  /**
   * Obtener un vendedor por ID
   */
  async obtener(id) {
    try {
      const { data, error } = await supabase
        .from('vw_vendedores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo vendedor:', error);
      throw error;
    }
  }
};

// ============================================================
// ORIGENES API
// ============================================================
export const OrigenesAPI = {
  /**
   * Listar orígenes activos
   */
  async listar() {
    try {
      const { data, error } = await supabase
        .from('vw_origenes_activos')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listando orígenes:', error);
      return [];
    }
  }
};

// ============================================================
// PRODUCTOS API
// ============================================================
export const ProductosAPI = {
  /**
   * Listar productos con familia y unidad (para cache)
   */
  async listar(limite = 200) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          id,
          sku,
          nombre,
          precio,
          activo,
          imagen_url,
          imagen_alt,
          familia_id,
          unidad_venta_id,
          familia:familias!familia_id(id, nombre, slug),
          unidad:unidades_medida!unidad_venta_id(id, codigo, nombre, simbolo, tipo)
        `)
        .eq('activo', true)
        .order('nombre')
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listando productos:', error);
      return [];
    }
  },

  /**
   * Buscar productos por nombre o SKU
   */
  async buscar(termino, filtros = {}, limite = 20) {
    try {
      let query = supabase
        .from('productos')
        .select(`
          id,
          sku,
          nombre,
          precio,
          activo,
          imagen_url,
          imagen_alt,
          familia_id,
          unidad_venta_id,
          familia:familias!familia_id(id, nombre, slug),
          unidad:unidades_medida!unidad_venta_id(id, codigo, nombre, simbolo, tipo)
        `)
        .eq('activo', true);

      if (termino) {
        query = query.or(`nombre.ilike.%${termino}%,sku.ilike.%${termino}%`);
      }

      if (filtros.familia_id) {
        query = query.eq('familia_id', filtros.familia_id);
      }

      const { data, error } = await query.limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error buscando productos:', error);
      return [];
    }
  },

  /**
   * Obtener un producto por ID
   */
  async obtener(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          id,
          sku,
          nombre,
          precio,
          activo,
          imagen_url,
          imagen_alt,
          familia_id,
          unidad_venta_id,
          familia:familias!familia_id(id, nombre, slug),
          unidad:unidades_medida!unidad_venta_id(id, codigo, nombre, simbolo, tipo)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  },

  /**
   * Obtener familias para filtros
   */
  async getFamilias() {
    try {
      const { data, error } = await supabase
        .from('familias')
        .select('id, nombre, slug')
        .eq('activo', true)
        .order('orden');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo familias:', error);
      return [];
    }
  }
};

// ============================================================
// DASHBOARD API
// ============================================================
export const DashboardAPI = {
  /**
   * Resumen de leads
   */
  async getResumenLeads() {
    try {
      const { data: todosLeads, error } = await supabase
        .from('leads')
        .select('estado');

      if (error) throw error;

      const totalLeads = todosLeads?.length || 0;
      const leadsNuevos = todosLeads?.filter(l => l.estado === 'Nuevo').length || 0;
      const convertidos = todosLeads?.filter(l => l.estado === 'Convertido').length || 0;
      const tasaConversion = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0;

      return {
        totalLeads,
        leadsNuevos,
        convertidos,
        tasaConversion
      };
    } catch (error) {
      console.error('Error obteniendo resumen de leads:', error);
      throw error;
    }
  },

  /**
   * Distribución de leads por estado
   */
  async getLeadsPorEstado() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('estado')
        .not('estado', 'is', null);

      if (error) throw error;

      const estados = ['Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado'];
      return estados.map(estado => ({
        estado,
        cantidad: data.filter(l => l.estado === estado).length
      }));
    } catch (error) {
      console.error('Error obteniendo leads por estado:', error);
      return [];
    }
  },

  /**
   * Leads recientes
   */
  async getLeadsRecientes(limite = 10) {
    try {
      const { data, error } = await supabase
        .from('vw_leads_con_productos')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo leads recientes:', error);
      return [];
    }
  },

  /**
   * Resumen de productos
   */
  async getResumenProductos() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('linea, destacado')
        .eq('activo', true);

      if (error) throw error;

      return {
        totalProductos: data?.length || 0,
        productosDestacados: data?.filter(p => p.destacado === true).length || 0,
        productosCatalogo: data?.filter(p => p.linea === 'catalogo').length || 0,
        productosOutlet: data?.filter(p => p.linea === 'outlet').length || 0,
        productosExcedente: data?.filter(p => p.linea === 'excedente').length || 0
      };
    } catch (error) {
      console.error('Error obteniendo resumen de productos:', error);
      throw error;
    }
  }
};

// ============================================================
// REALTIME API - Suscripciones en tiempo real
// ============================================================

export const RealtimeAPI = {
  /**
   * Suscribirse a cambios en la tabla leads
   * @param {Function} onCambio - Callback que recibe ({ tipo, datos, anterior })
   * @returns {Object} Canal de suscripción con método unsubscribe()
   */
  suscribirLeads(onCambio) {
    const canal = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {

          if (onCambio) {
            onCambio({
              tipo: payload.eventType,       // INSERT, UPDATE, DELETE
              datos: payload.new,             // Datos nuevos
              anterior: payload.old           // Datos anteriores
            });
          }
        }
      )
      .subscribe((status) => {

      });

    return {
      unsubscribe: () => supabase.removeChannel(canal),
      canal
    };
  },

  /**
   * Suscribirse a cambios en leads_productos
   */
  suscribirLeadsProductos(onCambio) {
    const canal = supabase
      .channel('leads-productos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_productos' },
        (payload) => {

          if (onCambio) onCambio(payload);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(canal),
      canal
    };
  },

  /**
   * Suscribirse a cambios en productos
   */
  suscribirProductos(onCambio) {
    const canal = supabase
      .channel('productos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {

          if (onCambio) onCambio(payload);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(canal),
      canal
    };
  },

  /**
   * Cancelar todas las suscripciones activas
   */
  cancelarTodas() {
    supabase.removeAllChannels();
  }
};

// ============================================================
// CACHE API - Caché inteligente en localStorage
// ============================================================

export const CacheAPI = {
  PREFIJO: 'gallos_cache_',

  /**
   * Guardar datos con tiempo de expiración
   */
  guardar(clave, datos, ttlMinutos = 60) {
    try {
      const item = {
        datos,
        timestamp: Date.now(),
        expira: Date.now() + (ttlMinutos * 60 * 1000)
      };
      localStorage.setItem(this.PREFIJO + clave, JSON.stringify(item));
      return true;
    } catch (error) {
      console.warn('Error guardando en caché:', error);
      return false;
    }
  },

  /**
   * Obtener datos si no han expirado
   */
  obtener(clave) {
    try {
      const raw = localStorage.getItem(this.PREFIJO + clave);
      if (!raw) return null;

      const item = JSON.parse(raw);

      if (Date.now() > item.expira) {
        localStorage.removeItem(this.PREFIJO + clave);
        return null;
      }

      return item.datos;
    } catch (error) {
      console.warn('Error leyendo caché:', error);
      return null;
    }
  },

  /**
   * Eliminar un item específico
   */
  eliminar(clave) {
    localStorage.removeItem(this.PREFIJO + clave);
  },

  /**
   * Limpiar todo el caché de la app
   */
  limpiar() {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith(this.PREFIJO)) {
        localStorage.removeItem(k);
      }
    });
  },

  /**
   * Limpiar items expirados
   */
  limpiarExpirados() {
    const keys = Object.keys(localStorage);
    let limpiados = 0;

    keys.forEach(k => {
      if (k.startsWith(this.PREFIJO)) {
        try {
          const item = JSON.parse(localStorage.getItem(k));
          if (Date.now() > item.expira) {
            localStorage.removeItem(k);
            limpiados++;
          }
        } catch (e) {}
      }
    });

    return limpiados;
  }
};

// ============================================================
// NETWORK API - Estado de conexión
// ============================================================

export const NetworkAPI = {
  /**
   * Suscribirse a cambios de conexión
   */
  suscribir(onCambio) {
    window.addEventListener('online', () => onCambio(true));
    window.addEventListener('offline', () => onCambio(false));
  },

  /**
   * Verificar si hay conexión
   */
  estaOnline() {
    return navigator.onLine;
  }
};

// ============================================================
// NOTIFICACIONES API - Toasts mejoradas
// ============================================================

export const NotificacionesAPI = {
  cola: [],
  activa: null,
  contenedor: null,

  /**
   * Inicializar contenedor de toasts
   */
  init() {
    if (this.contenedor) return;

    const el = document.createElement('div');
    el.id = 'notificaciones-container';
    el.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    this.contenedor = el;
  },

  /**
   * Mostrar notificación
   */
  mostrar(mensaje, tipo = 'info', duracion = 3500) {
    this.init();

    const colores = {
      success: { bg: '#4d7c53', icono: '✅' },
      error:   { bg: '#a63d33', icono: '❌' },
      warning: { bg: '#b8863b', icono: '⚠️' },
      info:    { bg: '#3d6b7d', icono: 'ℹ️' }
    };

    const config = colores[tipo] || colores.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${config.bg};
      color: #fff;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-size: 13.5px;
      font-family: 'Work Sans', sans-serif;
      pointer-events: auto;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 100%;
      word-break: break-word;
    `;

    toast.innerHTML = `
      <span style="font-size:16px; flex-shrink:0;">${config.icono}</span>
      <span style="flex:1;">${mensaje}</span>
      <button style="
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.7);
        cursor: pointer;
        font-size: 18px;
        padding: 0 4px;
        flex-shrink:0;
      " onclick="this.parentElement.remove()">✕</button>
    `;

    this.contenedor.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Auto-eliminar
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duracion);

    return toast;
  },

  success(mensaje, duracion) { return this.mostrar(mensaje, 'success', duracion); },
  error(mensaje, duracion) { return this.mostrar(mensaje, 'error', duracion); },
  warning(mensaje, duracion) { return this.mostrar(mensaje, 'warning', duracion); },
  info(mensaje, duracion) { return this.mostrar(mensaje, 'info', duracion); }
};

// ============================================================
// CATALOGO API - Para el portal público (familia/)
// ============================================================

export const CatalogoAPI = {
  // ---------- FAMILIAS ----------
  
  async getFamilias() {
    const { data, error } = await supabase
      .from('familias')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });
    
    if (error) throw error;
    
    // Convertir URLs de Google Drive
    return (data || []).map(f => ({
      ...f,
      imagen_url: f.imagen_url ? convertirUrlGoogleDrive(f.imagen_url) : null
    }));
  },

  // ---------- PRODUCTOS ----------
  
// En supabase-client.js, reemplaza getProductos:
  async getProductos(filtros = {}) {
    let query = supabase
      .from('vw_productos_lineas')
      .select('*');   // la vista ya trae todo aplanado, sin JOINs

    if (filtros.familia)   query = query.eq('familia_id', filtros.familia);
    if (filtros.linea)     query = query.eq('linea', filtros.linea);
    if (filtros.destacado) query = query.eq('destacado', true);
    if (filtros.excluir)   query = query.neq('sku', filtros.excluir);
    if (filtros.limit)     query = query.limit(filtros.limit);

    if (filtros.buscar) {
      query = query.or(
        `nombre.ilike.%${filtros.buscar}%,` +
        `sku.ilike.%${filtros.buscar}%,` +
        `descripcion.ilike.%${filtros.buscar}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(p => ({
      ...p,

      // ============================================================
      // CAMPOS DE PRECIO (nuevo modelo: precio base + precio oferta)
      // ============================================================
      // p.precio_base      → precio original del producto (ej. 100)
      // p.precio_oferta    → precio de oferta de la línea (ej. 70, 50, 45)
      // p.precio           → precio final (COALESCE oferta/base) ← el que se muestra
      // p.precio_anterior  → precio base tachado (solo si hay oferta)
      precio:          p.precio ?? null,
      precio_base:     p.precio_base ?? null,
      precio_oferta:   p.precio_oferta ?? null,
      precio_anterior: p.precio_anterior ?? null,

      // ============================================================
      // FAMILIA
      // ============================================================
      familia_nombre: p.familia_nombre,
      familia_imagen_url: p.familia_imagen_url
        ? convertirUrlGoogleDrive(p.familia_imagen_url)
        : null,

      // ============================================================
      // MATERIAL, ACABADO, BORDE, CALIDAD
      // ============================================================
      material_nombre: p.material_nombre,
      acabado_nombre:  p.acabado_nombre,
      borde_nombre:    p.borde_nombre,
      calidad_nombre:  p.calidad_nombre,
      calidad_nivel:   p.calidad_nivel,

      // ============================================================
      // UNIDADES
      // ============================================================
      unidad_venta_id: p.unidad_venta_id || null, 
      unidad_simbolo:  p.unidad_simbolo,
      unidad_nombre:   p.unidad_nombre,
      unidad_largo_simbolo:   p.unidad_largo_simbolo,    
      unidad_ancho_simbolo:   p.unidad_ancho_simbolo,   
      unidad_espesor_simbolo: p.unidad_espesor_simbolo,
      unidad_largo_nombre:    p.unidad_largo_nombre,     
      unidad_ancho_nombre:    p.unidad_ancho_nombre,     
      unidad_espesor_nombre:  p.unidad_espesor_nombre,   
      unidad_largo_factor_cm:   p.unidad_largo_factor_cm,
      unidad_ancho_factor_cm:   p.unidad_ancho_factor_cm,
      unidad_espesor_factor_cm: p.unidad_espesor_factor_cm,

      // ============================================================
      // DIMENSIONES
      // ============================================================
      dimension_formateada: p.dimension_formateada,
      dimension_completa:   p.dimension_completa,

      // ============================================================
      // LÍNEA / MOTIVO
      // ============================================================
      motivo: p.linea_motivo || null,

      // ============================================================
      // IMÁGENES
      // ============================================================
      imagen_url: p.imagen_url ? convertirUrlGoogleDrive(p.imagen_url) : null,
      imagen_alt: p.imagen_alt ? convertirUrlGoogleDrive(p.imagen_alt) : null,

      // ============================================================
      // GALERÍAS
      // ============================================================
      galeria_fotos:       parsearGaleriaPublica(p.galeria_fotos),
      galeria_ambientadas: parsearGaleriaPublica(p.galeria_ambientadas),
      galeria_patrones:    parsearGaleriaPublica(p.galeria_patrones),
      galeria_rangos:      parsearGaleriaPublica(p.galeria_rangos)
    }));
  },

  async getProductoBySku(sku) {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        familia:familias!familia_id(id, nombre, slug, icono, imagen_url),
        material:materiales!material_id(id, nombre, origen),
        acabado:acabados!acabado_id(id, nombre),
        borde:bordes!borde_id(id, nombre),
        calidad:calidades!calidad_id(id, nombre, nivel),
        unidad:unidades_medida!unidad_venta_id(id, simbolo, nombre),
        unidad_largo:unidades_medida!unidad_largo_id(simbolo),
        unidad_ancho:unidades_medida!unidad_ancho_id(simbolo),
        unidad_espesor:unidades_medida!unidad_espesor_id(simbolo)
      `)
      .eq('sku', sku)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    const p = data;
    
    const dimension_formateada = p.largo && p.ancho 
      ? `${p.largo} × ${p.ancho} ${p.unidad_largo?.simbolo || 'cm'}` 
      : null;
    
    const dimension_completa = p.largo && p.ancho && p.espesor
      ? `${p.largo} × ${p.ancho} × ${p.espesor} ${p.unidad_largo?.simbolo || 'cm'}`
      : dimension_formateada;
    
    return {
      ...p,
      familia_nombre: p.familia?.nombre,
      familia_imagen_url: p.familia?.imagen_url ? convertirUrlGoogleDrive(p.familia.imagen_url) : null,
      material_nombre: p.material?.nombre,
      material_origen: p.material?.origen,
      acabado_nombre: p.acabado?.nombre,
      borde_nombre: p.borde?.nombre,
      calidad_nombre: p.calidad?.nombre,
      calidad_nivel: p.calidad?.nivel,
      unidad_simbolo: p.unidad?.simbolo,
      unidad_nombre: p.unidad?.nombre,
      unidad_venta_id: p.unidad_venta_id,
      unidad_espesor_simbolo: p.unidad_espesor?.simbolo || 'cm',
      dimension_formateada,
      dimension_completa,
      imagen_url: p.imagen_url ? convertirUrlGoogleDrive(p.imagen_url) : null,
      imagen_alt: p.imagen_alt ? convertirUrlGoogleDrive(p.imagen_alt) : null,
      galeria_fotos: parsearGaleriaPublica(p.galeria_fotos),
      galeria_ambientadas: parsearGaleriaPublica(p.galeria_ambientadas),
      galeria_patrones: parsearGaleriaPublica(p.galeria_patrones),
      galeria_rangos: parsearGaleriaPublica(p.galeria_rangos)
    };
  },

  async getRelacionados(sku, familiaId, limite = 4) {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        familia:familias!familia_id(id, nombre, slug, icono)
      `)
      .eq('activo', true)
      .eq('familia_id', familiaId)
      .neq('sku', sku)
      .limit(limite);
    
    if (error) throw error;
    
    return (data || []).map(p => ({
      ...p,
      familia_nombre: p.familia?.nombre,
      imagen_url: p.imagen_url ? convertirUrlGoogleDrive(p.imagen_url) : null
    }));
  },

  async buscarProductos(termino) {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        familia:familias!familia_id(id, nombre)
      `)
      .eq('activo', true)
      .or(`nombre.ilike.%${termino}%,sku.ilike.%${termino}%,descripcion.ilike.%${termino}%`);
    
    if (error) throw error;
    
    return (data || []).map(p => ({
      ...p,
      familia_nombre: p.familia?.nombre,
      imagen_url: p.imagen_url ? convertirUrlGoogleDrive(p.imagen_url) : null
    }));
  },

  // ---------- LEADS (formulario de cotización pública) ----------
  
  async crearLead(datos) {
      try {
          // ============================================================
          // 0. VALIDACIONES BÁSICAS (solo nombre y teléfono)
          // ============================================================
          if (!datos.nombre || datos.nombre.trim().length < 2) {
              throw new Error('El nombre es obligatorio (mínimo 2 caracteres)');
          }
          if (!datos.telefono || datos.telefono.replace(/\D/g, '').length < 9) {
              throw new Error('El teléfono es obligatorio (mínimo 9 dígitos)');
          }

          // ============================================================
          // 1. PERSONA: NO SE CREA AQUÍ
          // ============================================================
          // El lead se guarda SIN persona_id. La persona se crea solo
          // cuando el lead convierte (el asesor lo hace manualmente o
          // con un trigger al cambiar el estado a "Convertido").
          // Esto evita contaminar `personas` con leads "crudos" que
          // pueden tener datos incorrectos o nunca convertirse.

          // ============================================================
          // 2. BUSCAR ORIGEN POR CÓDIGO
          // ============================================================
          const codigoOrigen = (datos.origen || 'catalogo').toLowerCase().trim();
          let origenId = null;
          let origenObj = null;

          const { data: origen, error: errOrigen } = await supabase
              .from('origenes')
              .select('id, codigo, nombre')
              .eq('codigo', codigoOrigen)
              .eq('activo', true)
              .maybeSingle();

          if (errOrigen && errOrigen.code !== 'PGRST116') {
              console.warn('⚠️ Error buscando origen:', errOrigen.message);
          }

          if (origen) {
              origenId = origen.id;
              origenObj = origen;
          } else {
              // Fallback: usar 'catalogo' si el código no existe
              console.warn(`⚠️ Código de origen "${codigoOrigen}" no existe. Usando 'catalogo' por defecto.`);

              const { data: origenDefault } = await supabase
                  .from('origenes')
                  .select('id, codigo, nombre')
                  .eq('codigo', 'catalogo')
                  .maybeSingle();

              if (origenDefault) {
                  origenId = origenDefault.id;
                  origenObj = origenDefault;
              }
          }

          // ============================================================
          // 3. ASIGNAR VENDEDOR AUTOMÁTICAMENTE (RPC)
          // ============================================================
          let vendedorAsignado = null;

          try {
              const { data: vendedorId, error: errVendedor } = await supabase
                  .rpc('asignar_vendedor_automatico');

              if (errVendedor) {
                  console.warn('[crearLead] error RPC vendedor:', errVendedor.message);
              } else if (vendedorId) {
                  vendedorAsignado = vendedorId;
              }
          } catch (e) {
              console.warn('[crearLead] error asignando vendedor:', e?.message || e);
          }

          // ============================================================
          // 4. GENERAR ID DEL LEAD (para no necesitar SELECT después)
          // ============================================================
          const leadId = (crypto && crypto.randomUUID)
              ? crypto.randomUUID()
              : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = (Math.random() * 16) | 0;
                  const v = c === 'x' ? r : (r & 0x3) | 0x8;
                  return v.toString(16);
                });

          // ============================================================
          // 5. CREAR EL LEAD (sin persona_id, sin empresa, sin email)
          // ============================================================
          const nombreCompletoLead = `${datos.nombre.trim()} ${(datos.apellido || '').trim()}`.trim();

          const { error: errLead } = await supabase
          .from('leads')
          .insert([{
              id: leadId,
              nombre: nombreCompletoLead,
              empresa: null,
              telefono: datos.telefono.trim(),
              email: null,
              origen_id: origenId,
              estado: 'Nuevo',
              mensaje: datos.mensaje ? datos.mensaje.trim() : null,
              fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }),   
              visitor_id: datos.visitor_id || null,
              vendedor_id: vendedorAsignado,
              ip_origen: datos.ip_origen || null   
          }]);

          if (errLead) throw errLead;

          // ============================================================
          // 6. GUARDAR PRODUCTOS EN leads_productos
          // ============================================================
          if (datos.productos && Array.isArray(datos.productos) && datos.productos.length > 0) {
              const productosData = datos.productos.map(p => ({
                  lead_id: leadId,
                  producto_id: p.producto_id || null,
                  producto_nombre: p.producto_nombre || 'Producto sin nombre',
                  producto_sku: p.producto_sku || null,
                  cantidad: parseFloat(p.cantidad) || 1,
                  unidad_venta_id: p.unidad_venta_id || null,
                  unidad_simbolo: p.unidad_simbolo || 'und'
              }));
              const { error: errProductos } = await supabase
                  .from('leads_productos')
                  .insert(productosData);

              if (errProductos) {
                  console.error('⚠️ Error guardando productos:', errProductos.message);
                  // No lanzamos error porque el lead ya se creó correctamente
              }
          }

          // ============================================================
          // 7. OBTENER NOMBRE DEL VENDEDOR ASIGNADO
          // ============================================================
          let nombreVendedor = null;

          if (vendedorAsignado) {
              try {
                  const { data: v, error: errV } = await supabase
                      .from('vw_vendedores')
                      .select('nombre_completo')
                      .eq('id', vendedorAsignado)
                      .maybeSingle();

                  if (errV) {
                      console.warn('[crearLead] error buscando vendedor:', errV.message);
                  } else if (v) {
                      nombreVendedor = v.nombre_completo;
                  }
              } catch (e) {
                  console.warn('[crearLead] error buscando vendedor:', e?.message || e);
              }
          }

          // ============================================================
          // 8. OBTENER LA REFERENCIA GENERADA POR EL TRIGGER (via RPC)
          // ============================================================
          let referencia = null;

          try {
              const { data: refRpc, error: errRpc } = await supabase
                  .rpc('obtener_referencia_lead', { p_lead_id: leadId });

              if (errRpc) {
                  console.warn('[crearLead] error RPC referencia:', errRpc.message);
              } else if (refRpc) {
                  referencia = refRpc;
              }
          } catch (e) {
              console.warn('[crearLead] error obteniendo referencia:', e?.message || e);
          }

          // Fallback solo si la RPC falla (no debería)
          if (!referencia) {
              const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const random = Math.random().toString(36).substring(2, 6).toUpperCase();
              referencia = `COT-${fecha}-${random}`;
              console.warn('[crearLead] usando referencia fallback:', referencia);
          }

          // ============================================================
          // 9. RETORNAR EL LEAD COMPLETO
          // ============================================================
          return {
              id: leadId,
              referencia: referencia,
              nombre: nombreCompletoLead,
              telefono: datos.telefono.trim(),
              origen_codigo: codigoOrigen,
              origen_nombre: origenObj?.nombre || 'Catálogo web',
              productos_count: datos.productos?.length || 0,
              vendedor_id: vendedorAsignado,
              vendedor_nombre: nombreVendedor,
              creado_en: new Date().toISOString()
          };

      } catch (error) {
          console.error('❌ Error en crearLead:', error);
          throw error;
      }
  }

};

// Helper para parsear galerías
function parsearGaleriaPublica(valor) {
  if (!valor) return [];
  let arr = valor;
  if (typeof valor === 'string') {
    try {
      arr = JSON.parse(valor);
    } catch (e) {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map(url => convertirUrlGoogleDrive(url)).filter(Boolean);
}

// ============================================================
// LINEAS CONFIG API
// ============================================================
export const LineasConfigAPI = {
  /**
   * Obtener la configuración de una línea
   * @param {String} linea - 'catalogo' | 'outlet' | 'saldos'
   */
  async get(linea) {
    const { data, error } = await supabase
      .from('lineas_config')
      .select('*')
      .eq('linea', linea)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Obtener todas las configuraciones activas
   */
  async getAll() {
    const { data, error } = await supabase
      .from('lineas_config')
      .select('*')
      .eq('activo', true);

    if (error) throw error;
    return data || [];
  },

  /**
   * Actualizar la configuración de una línea (para admin)
   */
  async set(linea, cambios) {
    const { error } = await supabase
      .from('lineas_config')
      .update({
        ...cambios,
        actualizado_en: new Date().toISOString()
      })
      .eq('linea', linea);

    if (error) throw error;
    return true;
  }
};

// ============================================================
// PRODUCTOS CRUD API (para el panel de ventas)
// ============================================================
export const ProductosCRUDAPI = {
  /**
   * Listar productos con filtros y paginación server-side
   */
  async listar(opciones = {}) {
    try {
      const {
        pagina = 1,
        porPagina = 25,
        ordenarPor = 'nombre',
        orden = 'asc',
        buscar = null,
        familia_id = null,
        material_id = null,
        linea = null,
        activo = null,
        destacado = null,
        contar = true
      } = opciones;

      let query = supabase
        .from('productos')
        .select(`
          *,
          familia:familias!familia_id(id, nombre, slug),
          material:materiales!material_id(id, nombre),
          acabado:acabados!acabado_id(id, nombre),
          borde:bordes!borde_id(id, nombre),
          calidad:calidades!calidad_id(id, nombre, nivel),
          unidad:unidades_medida!unidad_venta_id(id, codigo, nombre, simbolo, tipo)
        `, { count: contar ? 'exact' : null });

      if (buscar) {
        query = query.or(`nombre.ilike.%${buscar}%,sku.ilike.%${buscar}%`);
      }
      if (familia_id) query = query.eq('familia_id', familia_id);
      if (material_id) query = query.eq('material_id', material_id);
      if (activo !== null) query = query.eq('activo', activo);
      if (destacado !== null) query = query.eq('destacado', destacado);

      // Filtro por línea: productos que están en esa línea
      if (linea) {
        const { data: lineasIds } = await supabase
          .from('productos_lineas')
          .select('producto_id')
          .eq('linea', linea)
          .eq('activo', true);
        const ids = (lineasIds || []).map(l => l.producto_id);
        if (ids.length === 0) {
          return { datos: [], total: 0, pagina, porPagina };
        }
        query = query.in('id', ids);
      }

      query = query.order(ordenarPor, { ascending: orden === 'asc' });

      const desde = (pagina - 1) * porPagina;
      const hasta = desde + porPagina - 1;
      query = query.range(desde, hasta);

      const { data, error, count } = await query;
      if (error) throw error;

      // Cargar líneas de todos los productos devueltos
      const ids = (data || []).map(p => p.id);
      let lineasPorProducto = {};
      if (ids.length > 0) {
        const { data: lineas } = await supabase
          .from('productos_lineas')
          .select('*')
          .in('producto_id', ids);
        (lineas || []).forEach(l => {
          if (!lineasPorProducto[l.producto_id]) lineasPorProducto[l.producto_id] = [];
          lineasPorProducto[l.producto_id].push(l);
        });
      }

      const datos = (data || []).map(p => ({
        ...p,
        lineas: lineasPorProducto[p.id] || []
      }));

      return { datos, total: count || 0, pagina, porPagina };
    } catch (error) {
      console.error('Error listando productos:', error);
      throw error;
    }
  },

  /**
   * Obtener un producto por ID con sus líneas
   */
  async obtener(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          familia:familias!familia_id(id, nombre, slug),
          material:materiales!material_id(id, nombre),
          acabado:acabados!acabado_id(id, nombre),
          borde:bordes!borde_id(id, nombre),
          calidad:calidades!calidad_id(id, nombre, nivel),
          unidad:unidades_medida!unidad_venta_id(id, codigo, nombre, simbolo, tipo)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const { data: lineas } = await supabase
        .from('productos_lineas')
        .select('*')
        .eq('producto_id', id);

      return { ...data, lineas: lineas || [] };
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      throw error;
    }
  },

  /**
   * Crear un producto con sus líneas
   */
  async crear(datos, lineas = []) {
    try {
      // Normalizar arrays de galería
      const payload = {
        sku: datos.sku?.trim(),
        nombre: datos.nombre?.trim(),
        descripcion: datos.descripcion?.trim() || null,
        modelo: datos.modelo?.trim() || null,
        familia_id: datos.familia_id || null,
        material_id: datos.material_id || null,
        acabado_id: datos.acabado_id || null,
        borde_id: datos.borde_id || null,
        calidad_id: datos.calidad_id || null,
        largo: datos.largo ? Number(datos.largo) : null,
        unidad_largo_id: datos.unidad_largo_id || null,
        ancho: datos.ancho ? Number(datos.ancho) : null,
        unidad_ancho_id: datos.unidad_ancho_id || null,
        espesor: datos.espesor ? Number(datos.espesor) : null,
        unidad_espesor_id: datos.unidad_espesor_id || null,
        precio: datos.precio != null && Number(datos.precio) > 0 ? Number(datos.precio) : null,
        moneda: datos.moneda || 'PEN',
        unidad_venta_id: datos.unidad_venta_id || null,
        destacado: !!datos.destacado,
        motivo: datos.motivo?.trim() || null,
        proveedor_id: datos.proveedor_id || null,
        imagen_url: datos.imagen_url?.trim() || null,
        imagen_alt: datos.imagen_alt?.trim() || null,
        activo: datos.activo !== false,
        es_piedra_natural: datos.es_piedra_natural !== false,
        mostrar_caracteristicas: datos.mostrar_caracteristicas !== false,
        mostrar_variabilidad: !!datos.mostrar_variabilidad,
        galeria_fotos: Array.isArray(datos.galeria_fotos) ? datos.galeria_fotos : [],
        galeria_ambientadas: Array.isArray(datos.galeria_ambientadas) ? datos.galeria_ambientadas : [],
        galeria_patrones: Array.isArray(datos.galeria_patrones) ? datos.galeria_patrones : [],
        galeria_rangos: Array.isArray(datos.galeria_rangos) ? datos.galeria_rangos : [],
        especificaciones_tecnicas: datos.especificaciones_tecnicas || null,
        origen: datos.origen?.trim() || null
      };

      const { data: prod, error } = await supabase
        .from('productos')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Insertar líneas
      if (lineas.length > 0) {
        await LineasAPI.actualizar(prod.id, lineas);
      }

      return prod;
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  },

  /**
   * Actualizar un producto y sus líneas
   */
  async actualizar(id, datos, lineas = null) {
    try {
      const payload = {
        sku: datos.sku?.trim(),
        nombre: datos.nombre?.trim(),
        descripcion: datos.descripcion?.trim() || null,
        modelo: datos.modelo?.trim() || null,
        familia_id: datos.familia_id || null,
        material_id: datos.material_id || null,
        acabado_id: datos.acabado_id || null,
        borde_id: datos.borde_id || null,
        calidad_id: datos.calidad_id || null,
        largo: datos.largo ? Number(datos.largo) : null,
        unidad_largo_id: datos.unidad_largo_id || null,
        ancho: datos.ancho ? Number(datos.ancho) : null,
        unidad_ancho_id: datos.unidad_ancho_id || null,
        espesor: datos.espesor ? Number(datos.espesor) : null,
        unidad_espesor_id: datos.unidad_espesor_id || null,
        precio: datos.precio != null && Number(datos.precio) > 0 ? Number(datos.precio) : null,
        moneda: datos.moneda || 'PEN',
        unidad_venta_id: datos.unidad_venta_id || null,
        destacado: !!datos.destacado,
        motivo: datos.motivo?.trim() || null,
        proveedor_id: datos.proveedor_id || null,
        imagen_url: datos.imagen_url?.trim() || null,
        imagen_alt: datos.imagen_alt?.trim() || null,
        activo: datos.activo !== false,
        es_piedra_natural: datos.es_piedra_natural !== false,
        mostrar_caracteristicas: datos.mostrar_caracteristicas !== false,
        mostrar_variabilidad: !!datos.mostrar_variabilidad,
        galeria_fotos: Array.isArray(datos.galeria_fotos) ? datos.galeria_fotos : [],
        galeria_ambientadas: Array.isArray(datos.galeria_ambientadas) ? datos.galeria_ambientadas : [],
        galeria_patrones: Array.isArray(datos.galeria_patrones) ? datos.galeria_patrones : [],
        galeria_rangos: Array.isArray(datos.galeria_rangos) ? datos.galeria_rangos : [],
        especificaciones_tecnicas: datos.especificaciones_tecnicas || null,
        origen: datos.origen?.trim() || null,
        actualizado_en: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Actualizar líneas si se pasaron
      if (lineas !== null) {
        await LineasAPI.actualizar(id, lineas);
      }

      return data;
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  },

  /**
   * Eliminar un producto (y sus líneas en cascada)
   */
  async eliminar(id) {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  },

  /**
   * Cargar todos los catálogos maestros (familias, materiales, etc.)
   */
  async cargarCatalogos() {
    try {
      const [familias, materiales, acabados, bordes, calidades, unidades] = await Promise.all([
        supabase.from('familias').select('id, nombre, slug').eq('activo', true).order('orden', { nullsFirst: false }).order('nombre'),
        supabase.from('materiales').select('id, nombre, origen').eq('activo', true).order('nombre'),
        supabase.from('acabados').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('bordes').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('calidades').select('id, nombre, nivel').eq('activo', true).order('nombre'),
        supabase.from('unidades_medida').select('id, codigo, nombre, simbolo, tipo').order('nombre')
      ]);

      return {
        familias: familias.data || [],
        materiales: materiales.data || [],
        acabados: acabados.data || [],
        bordes: bordes.data || [],
        calidades: calidades.data || [],
        unidades: unidades.data || []
      };
    } catch (error) {
      console.error('Error cargando catálogos:', error);
      throw error;
    }
  }
};

// ============================================================
// LINEAS API - Gestionar líneas de un producto
// ============================================================
export const LineasAPI = {
  /**
   * Obtener todas las líneas de un producto
   */
  async porProducto(productoId) {
    const { data, error } = await supabase
      .from('productos_lineas')
      .select('*')
      .eq('producto_id', productoId);
    if (error) throw error;
    return data || [];
  },

  async actualizar(productoId, lineas) {
      const { error: delError } = await supabase
          .from('productos_lineas')
          .delete()
          .eq('producto_id', productoId);
      if (delError) throw delError;

      if (!lineas || lineas.length === 0) return [];

      const { data, error } = await supabase
          .from('productos_lineas')
          .insert(lineas.map(l => ({
              producto_id: productoId,
              linea: l.linea,
              activo: l.activo !== false,
              precio_oferta: l.precio_oferta != null ? Number(l.precio_oferta) : null,
              stock: l.stock != null ? Number(l.stock) : null,             // ← NUEVO
              stock_minimo: l.stock_minimo != null ? Number(l.stock_minimo) : null,  // ← NUEVO
              motivo: l.motivo || null
          })))
          .select();
      if (error) throw error;
      return data;
  }

};

// ============================================================
// DASHBOARD VENTAS API - KPIs por rol
// ============================================================
export const DashboardVentasAPI = {
  /**
   * KPIs del asesor: solo sus leads
   */
  async kpisAsesor(vendedorId) {
    if (!vendedorId) {
      return { total: 0, nuevos: 0, contactados: 0, convertidos: 0, tasa: 0 };
    }

    const { data, error } = await supabase
      .from('leads')
      .select('estado, proximo_contacto')
      .eq('vendedor_id', vendedorId);

    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const nuevos = rows.filter(l => l.estado === 'Nuevo').length;
    const contactados = rows.filter(l => l.estado === 'Contactado').length;
    const convertidos = rows.filter(l => l.estado === 'Convertido').length;
    const tasa = total > 0 ? Math.round((convertidos / total) * 100) : 0;
    const hoy = new Date().toISOString().slice(0, 10);
    const seguimientoHoy = rows.filter(l => l.proximo_contacto === hoy).length;

    return { total, nuevos, contactados, convertidos, tasa, seguimientoHoy };
  },

  /**
   * Productos destacados (para el dashboard del admin).
   */
  async productosDestacados(limite = 4) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, sku, nombre, precio, imagen_url')
      .eq('activo', true)
      .eq('destacado', true)
      .order('nombre')
      .limit(limite);
    if (error) throw error;
    return data || [];
  },

  /**
   * KPIs del jefe: todos los leads
   */
  async kpisJefe() {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, estado, vendedor_id, fecha,
        vendedor:vw_vendedores!vendedor_id(id, nombre_completo)
      `);

    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const sinAsignar = rows.filter(l => !l.vendedor_id).length;
    const nuevos = rows.filter(l => l.estado === 'Nuevo').length;
    const convertidos = rows.filter(l => l.estado === 'Convertido').length;
    const tasa = total > 0 ? Math.round((convertidos / total) * 100) : 0;

    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const nuevosEstaSemana = rows.filter(l => l.estado === 'Nuevo' && l.fecha >= hace7dias).length;
    const convertidosSemana = rows.filter(l => l.estado === 'Convertido' && l.fecha >= hace7dias).length;
    const sinContactar3d = rows.filter(l =>
      (!l.estado || l.estado === 'Nuevo' || l.estado === 'Contactado') &&
      l.fecha && l.fecha < hace3dias
    ).length;

    // Top vendedores (por convertidos)
    const porVendedor = {};
    rows.forEach(l => {
      if (!l.vendedor_id) return;
      const nombre = l.vendedor?.nombre_completo || 'Sin nombre';
      if (!porVendedor[l.vendedor_id]) {
        porVendedor[l.vendedor_id] = { nombre, asignados: 0, convertidos: 0 };
      }
      porVendedor[l.vendedor_id].asignados++;
      if (l.estado === 'Convertido') porVendedor[l.vendedor_id].convertidos++;
    });
    const topVendedores = Object.values(porVendedor)
      .sort((a, b) => b.convertidos - a.convertidos || b.asignados - a.asignados)
      .slice(0, 5);

    return {
      total,
      sinAsignar,
      nuevos,
      convertidos,
      tasa,
      nuevosEstaSemana,
      convertidosSemana,
      sinContactar3d,
      topVendedores
    };
  },

  /**
   * KPIs del admin: leads + usuarios + productos
   */
  async kpisAdmin() {
  // Consultas en paralelo
  const [leadsRes, usuariosRes, productosRes, lineasRes] = await Promise.all([
    supabase.from('leads').select('estado'),
    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('productos').select('id, destacado', { count: 'exact' }).eq('activo', true),
    supabase.from('productos_lineas').select('linea').eq('activo', true)
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (usuariosRes.error) throw usuariosRes.error;
  if (productosRes.error) throw productosRes.error;
  if (lineasRes.error) throw lineasRes.error;

  const leads = leadsRes.data || [];
  const totalLeads = leads.length;
  const convertidos = leads.filter(l => l.estado === 'Convertido').length;
  const tasa = totalLeads > 0 ? Math.round((convertidos / totalLeads) * 100) : 0;

  const productos = productosRes.data || [];
  const totalProductos = productos.length;
  const destacados = productos.filter(p => p.destacado === true).length;

  const porLinea = { catalogo: 0, outlet: 0, saldos: 0 };
  (lineasRes.data || []).forEach(l => {
    if (porLinea[l.linea] !== undefined) porLinea[l.linea]++;
  });

  return {
    totalLeads,
    convertidos,
    tasa,
    usuariosActivos: usuariosRes.count || 0,
    productosActivos: totalProductos,
    productosDestacados: destacados,
    productosCatalogo: porLinea.catalogo,
    productosOutlet: porLinea.outlet,
    productosSaldos: porLinea.saldos
  };
},

  /**
   * KPIs de marketing: leads por origen + productos por línea
   */
  async kpisMarketing() {
    const [leadsRes, lineasRes, productosRes] = await Promise.all([
      supabase.from('leads').select('origen_id, origen:origenes!origen_id(id, nombre, codigo)'),
      supabase.from('productos_lineas').select('linea').eq('activo', true),
      supabase.from('productos').select('id, destacado', { count: 'exact' }).eq('activo', true)
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (lineasRes.error) throw lineasRes.error;
    if (productosRes.error) throw productosRes.error;

    // Agrupar leads por origen
    const porOrigen = {};
    (leadsRes.data || []).forEach(l => {
      const nombre = l.origen?.nombre || 'Sin origen';
      porOrigen[nombre] = (porOrigen[nombre] || 0) + 1;
    });
    const leadsPorOrigen = Object.entries(porOrigen)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    // Contar productos por línea
    const porLinea = { catalogo: 0, outlet: 0, saldos: 0 };
    (lineasRes.data || []).forEach(l => {
      if (porLinea[l.linea] !== undefined) porLinea[l.linea]++;
    });

    const productos = productosRes.data || [];
    const destacados = productos.filter(p => p.destacado === true).length;

    return {
      leadsPorOrigen,
      productosCatalogo: porLinea.catalogo,
      productosOutlet: porLinea.outlet,
      productosSaldos: porLinea.saldos,
      productosDestacados: destacados
    };
  },

  /**
   * KPIs de gerencia: leads totales + tasa + top vendedores + por estado
   */
  async kpisGerencia() {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, estado, fecha, vendedor_id,
        vendedor:vw_vendedores!vendedor_id(id, nombre_completo)
      `);

    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const convertidos = rows.filter(l => l.estado === 'Convertido').length;
    const descartados = rows.filter(l => l.estado === 'Descartado').length;
    const tasa = total > 0 ? Math.round((convertidos / total) * 100) : 0;

    // Rango de fechas
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().slice(0, 10);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().slice(0, 10);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().slice(0, 10);

    const leadsMesActual = rows.filter(l => l.fecha >= inicioMes);
    const leadsMesAnterior = rows.filter(l => l.fecha >= inicioMesAnterior && l.fecha <= finMesAnterior);

    const convertidosMes = leadsMesActual.filter(l => l.estado === 'Convertido').length;
    const tasaMes = leadsMesActual.length > 0 ? Math.round((convertidosMes / leadsMesActual.length) * 100) : 0;

    // Evolución mensual (últimos 6 meses)
    const evolucion = [];
    for (let i = 5; i >= 0; i--) {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1).toISOString().slice(0, 10);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0).toISOString().slice(0, 10);
      const leadsMes = rows.filter(l => l.fecha >= inicio && l.fecha <= fin);
      const convMes = leadsMes.filter(l => l.estado === 'Convertido').length;
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesLabel = fecha.toLocaleDateString('es-PE', { month: 'short' });
      evolucion.push({
        mes: mesLabel,
        leads: leadsMes.length,
        convertidos: convMes,
        tasa: leadsMes.length > 0 ? Math.round((convMes / leadsMes.length) * 100) : 0
      });
    }

    // Top vendedores (por convertidos)
    const porVendedor = {};
    rows.forEach(l => {
      if (!l.vendedor_id) return;
      const nombre = l.vendedor?.nombre_completo || 'Sin nombre';
      if (!porVendedor[l.vendedor_id]) {
        porVendedor[l.vendedor_id] = { nombre, asignados: 0, convertidos: 0 };
      }
      porVendedor[l.vendedor_id].asignados++;
      if (l.estado === 'Convertido') porVendedor[l.vendedor_id].convertidos++;
    });
    const topVendedores = Object.values(porVendedor)
      .sort((a, b) => b.convertidos - a.convertidos || b.asignados - a.asignados)
      .slice(0, 5);

    // Leads por estado
    const estados = ['Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado'];
    const porEstado = estados.map(e => ({
      estado: e,
      cantidad: rows.filter(l => l.estado === e).length
    }));

    return {
      total,
      convertidos,
      descartados,
      tasa,
      leadsMesActual: leadsMesActual.length,
      leadsMesAnterior: leadsMesAnterior.length,
      convertidosMes,
      tasaMes,
      evolucion,
      topVendedores,
      porEstado
    };
  }
,

  /**
   * Leads recientes (últimos N)
   * @param {string|null} vendedorId - Si es null, devuelve todos
   * @param {number} limite
   */
  async leadsRecientes(vendedorId = null, limite = 5) {
    let query = supabase
      .from('leads')
      .select(`
        id, nombre, empresa, estado, fecha, vendedor_id,
        vendedor:vw_vendedores!vendedor_id(nombre_completo)
      `)
      .order('fecha', { ascending: false })
      .limit(limite);

    if (vendedorId) query = query.eq('vendedor_id', vendedorId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async leadsSinAsignar(limite = 5) {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, nombre, empresa, telefono, estado, fecha,
        origen:origenes!origen_id(nombre)
      `)
      .is('vendedor_id', null)
      .order('fecha', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  },

/**
 * Leads con seguimiento pendiente hoy para un vendedor.
 */
  async leadsSeguimientoHoy(vendedorId) {
    if (!vendedorId) return [];
    const hoy = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('leads')
      .select('id, nombre, empresa, telefono, estado, proximo_contacto')
      .eq('vendedor_id', vendedorId)
      .eq('proximo_contacto', hoy)
      .order('estado');
    if (error) throw error;
    return data || [];
  }  
};

// ============================================================
// NOTAS API - Notas por lead
// ============================================================
export const NotasAPI = {
  async listar(leadId) {
    const { data, error } = await supabase
      .from('leads_notas')
      .select(`
        id, contenido, creado_en,
        autor:usuarios!autor_id(
          id,
          persona:persona_id(nombre, apellido)
        )
      `)
      .eq('lead_id', leadId)
      .order('creado_en', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async crear(leadId, contenido, autorId) {
    const { data, error } = await supabase
      .from('leads_notas')
      .insert([{
        lead_id: leadId,
        contenido: contenido.trim(),
        autor_id: autorId
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async eliminar(id) {
    const { error } = await supabase
      .from('leads_notas')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ============================================================
// LEADS SEARCH API - Búsqueda rápida para Ctrl+K
// ============================================================
export const LeadsSearchAPI = {
  /**
   * Búsqueda global por nombre, empresa, email, teléfono.
   * Si vendedorId, filtra a los leads de ese vendedor.
   */
  async buscar(termino, vendedorId = null, limite = 10) {
    if (!termino || termino.trim().length < 2) return [];
    const q = termino.trim();
    let query = supabase
      .from('leads')
      .select('id, nombre, empresa, email, telefono, estado, fecha')
      .or(`nombre.ilike.%${q}%,empresa.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`)
      .order('fecha', { ascending: false })
      .limit(limite);

    if (vendedorId) query = query.eq('vendedor_id', vendedorId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};

// ============================================================
// LEADS COUNT API - Contadores para filtros rápidos y sidebar
// ============================================================
export const LeadsCountAPI = {
  /**
   * Devuelve los contadores para los filtros rápidos del asesor
   */
  async contadoresAsesor(vendedorId) {
    if (!vendedorId) return { nuevos: 0, sinContactar: 0, seguimientoHoy: 0, cerradosSemana: 0, descartados: 0 };

    const hoy = new Date().toISOString().slice(0, 10);
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('leads')
      .select('estado, proximo_contacto, fecha')
      .eq('vendedor_id', vendedorId);

    if (error) throw error;

    const rows = data || [];
    return {
      nuevos: rows.filter(l => l.estado === 'Nuevo').length,
      sinContactar: rows.filter(l => l.estado === 'Nuevo' || l.estado === 'Contactado').length,
      seguimientoHoy: rows.filter(l => l.proximo_contacto === hoy).length,
      cerradosSemana: rows.filter(l => l.estado === 'Convertido' && l.fecha >= hace7dias).length,
      descartados: rows.filter(l => l.estado === 'Descartado').length
    };
  },

  /**
   * Contadores para jefe/admin/gerencia (todos los leads)
   */
  async contadoresEquipo() {
    const hoy = new Date().toISOString().slice(0, 10);
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('leads')
      .select('estado, vendedor_id, fecha, proximo_contacto');

    if (error) throw error;

    const rows = data || [];
    return {
      total: rows.length,
      nuevos: rows.filter(l => l.estado === 'Nuevo').length,
      sinAsignar: rows.filter(l => !l.vendedor_id).length,
      nuevosEstaSemana: rows.filter(l => l.estado === 'Nuevo' && l.fecha >= hace7dias).length,
      sinContactar3d: rows.filter(l =>
        (!l.estado || l.estado === 'Nuevo') && l.fecha && l.fecha < hace3dias
      ).length,
      cerradosSemana: rows.filter(l => l.estado === 'Convertido' && l.fecha >= hace7dias).length,
      seguimientoHoy: rows.filter(l => l.proximo_contacto === hoy).length,
      descartados: rows.filter(l => l.estado === 'Descartado').length
    };
  }  

};

// ============================================================
// USUARIOS API (solo admin)
// ============================================================
export const UsuariosAPI = {
  /**
   * Listar todos los usuarios con su persona y rol.
   */
  async listar() {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id, activo, ultimo_acceso, creado_en,
        rol:roles!rol_id(id, codigo, nombre),
        persona:persona_id(id, nombre, apellido, email, telefono)
      `)
      .order('creado_en', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Actualizar un usuario (rol, activo, datos de persona).
   */
  async actualizar(id, datos) {
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        rol_id: datos.rol_id || null,
        activo: datos.activo !== false
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Listar todos los roles disponibles.
   */
  async listarRoles() {
    const { data, error } = await supabase
      .from('roles')
      .select('id, codigo, nombre, descripcion')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }
};

// ============================================================
// CATALOGO MARKETING API
// Gestión de qué productos aparecen en cada línea pública.
// ============================================================
export const CatalogoMarketingAPI = {
  /**
   * Lista los productos de una línea (catalogo/outlet/saldos) con su info.
   * @param {string} linea - 'catalogo' | 'outlet' | 'saldos'
   * @param {string} buscar - Búsqueda por SKU o nombre
   */
  async listarPorLinea(linea, buscar = null) {
    // 1. Si hay búsqueda, primero buscar productos por SKU/nombre
    let productoIdsFiltrados = null;
    
    if (buscar) {
      const { data: productos, error: prodError } = await supabase
        .from('productos')
        .select('id')
        .or(`sku.ilike.%${buscar}%,nombre.ilike.%${buscar}%`);
      
      if (prodError) throw prodError;
      
      productoIdsFiltrados = (productos || []).map(p => p.id);
      
      // Si no hay productos que coincidan, devolver vacío
      if (productoIdsFiltrados.length === 0) return [];
    }

    // 2. Query principal de productos_lineas
    let query = supabase
      .from('productos_lineas')
      .select(`
        producto_id,
        linea,
        activo,
        precio_oferta,
        orden,
        motivo,
        producto:productos!producto_id(
          id, sku, nombre, precio, moneda, imagen_url, activo, destacado,
          familia:familias!familia_id(nombre)
        )
      `)
      .eq('linea', linea)
      .order('orden', { ascending: true, nullsFirst: false });

    // 3. Si hay IDs filtrados, aplicar el filtro
    if (productoIdsFiltrados !== null) {
      query = query.in('producto_id', productoIdsFiltrados);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Lista los productos que NO están en una línea (para poder añadirlos).
   */
  async listarDisponiblesParaLinea(linea, buscar = null, limite = 20) {
    // Primero, obtener los IDs que ya están en la línea
    const { data: existentes } = await supabase
      .from('productos_lineas')
      .select('producto_id')
      .eq('linea', linea);

    const idsExistentes = (existentes || []).map(e => e.producto_id);

    let query = supabase
      .from('productos')
      .select('id, sku, nombre, precio, moneda, imagen_url, activo')
      .eq('activo', true)
      .order('nombre')
      .limit(limite);

    if (idsExistentes.length > 0) {
      query = query.not('id', 'in', `(${idsExistentes.join(',')})`);
    }

    if (buscar) {
      query = query.or(`sku.ilike.%${buscar}%,nombre.ilike.%${buscar}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Añadir un producto a una línea.
   */
  async agregarALinea(productoId, linea, precioOferta = null) {
    const { data, error } = await supabase
      .from('productos_lineas')
      .insert([{
        producto_id: productoId,
        linea,
        activo: true,
        precio_oferta: precioOferta ? Number(precioOferta) : null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Actualizar un producto de una línea (activo, precio oferta, orden).
   */
  async actualizarEnLinea(productoId, linea, cambios) {
    const payload = {};
    if (cambios.activo !== undefined) payload.activo = cambios.activo;
    if (cambios.precio_oferta !== undefined) {
      payload.precio_oferta = cambios.precio_oferta ? Number(cambios.precio_oferta) : null;
    }
    if (cambios.orden !== undefined) payload.orden = cambios.orden;

    const { data, error } = await supabase
      .from('productos_lineas')
      .update(payload)
      .eq('producto_id', productoId)
      .eq('linea', linea)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Quitar un producto de una línea.
   */
  async quitarDeLinea(productoId, linea) {
    const { error } = await supabase
      .from('productos_lineas')
      .delete()
      .eq('producto_id', productoId)
      .eq('linea', linea);
    if (error) throw error;
    return true;
  },

  /**
   * Contadores por línea (para las pestañas).
   */
  async contadores() {
    const { data, error } = await supabase
      .from('productos_lineas')
      .select('linea, activo');
    if (error) throw error;

    const res = { catalogo: 0, outlet: 0, saldos: 0 };
    (data || []).forEach(l => {
      if (res[l.linea] !== undefined && l.activo !== false) res[l.linea]++;
    });
    return res;
  }
};

// ============================================================
// REPORTES API (admin/jefe/gerencia)
// ============================================================
export const ReportesAPI = {
  /**
   * Datos para el reporte: leads por mes, por estado, top vendedores.
   * @param {string} desde - Fecha ISO (YYYY-MM-DD) o null
   * @param {string} hasta - Fecha ISO (YYYY-MM-DD) o null
   */
  async obtenerDatos(desde = null, hasta = null) {
    let query = supabase
      .from('leads')
      .select(`
        id, estado, fecha, vendedor_id,
        vendedor:vw_vendedores!vendedor_id(id, nombre_completo)
      `);

    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];

    // 1. Evolución mensual (últimos 6 meses dentro del rango)
    const ahora = new Date();
    const evolucion = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const inicioMes = fecha.toISOString().slice(0, 10);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0).toISOString().slice(0, 10);

      const leadsMes = rows.filter(l => l.fecha >= inicioMes && l.fecha <= finMes);
      const convMes = leadsMes.filter(l => l.estado === 'Convertido').length;
      const mesLabel = fecha.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });

      evolucion.push({
        mes: mesLabel,
        leads: leadsMes.length,
        convertidos: convMes
      });
    }

    // 2. Distribución por estado
    const estados = ['Nuevo', 'Contactado', 'Calificado', 'Convertido', 'Descartado'];
    const porEstado = estados.map(e => ({
      estado: e,
      cantidad: rows.filter(l => l.estado === e).length
    }));

    // 3. Top vendedores
    const porVendedor = {};
    rows.forEach(l => {
      if (!l.vendedor_id) return;
      const nombre = l.vendedor?.nombre_completo || 'Sin nombre';
      if (!porVendedor[l.vendedor_id]) {
        porVendedor[l.vendedor_id] = { nombre, asignados: 0, convertidos: 0 };
      }
      porVendedor[l.vendedor_id].asignados++;
      if (l.estado === 'Convertido') porVendedor[l.vendedor_id].convertidos++;
    });
    const topVendedores = Object.values(porVendedor)
      .sort((a, b) => b.convertidos - a.convertidos)
      .slice(0, 5);

    // 4. Totales
    const total = rows.length;
    const convertidos = rows.filter(l => l.estado === 'Convertido').length;
    const tasa = total > 0 ? Math.round((convertidos / total) * 100) : 0;

    return {
      total,
      convertidos,
      tasa,
      evolucion,
      porEstado,
      topVendedores,
      rows // para exportar
    };
  }
};


// ============================================================
// VISITAS API - Analítica de páginas públicas
// ============================================================
export const VisitasAPI = {
  /**
   * Visitas por día en un rango.
   * @param {string} desde - 'YYYY-MM-DD'
   * @param {string} hasta - 'YYYY-MM-DD'
   * @param {string} linea - 'saldos' | 'outlet' | 'catalogo' | null
   */
  async porDia(desde, hasta, linea = null) {
    let query = supabase
      .from('visitas_publicas')
      .select('creado_en, visitor_id')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59');

    if (linea) query = query.eq('linea', linea);

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por día
    const porDia = {};
    (data || []).forEach(v => {
      const dia = v.creado_en.slice(0, 10);
      if (!porDia[dia]) porDia[dia] = { dia, visitas: 0, visitantes: new Set() };
      porDia[dia].visitas++;
      if (v.visitor_id) porDia[dia].visitantes.add(v.visitor_id);
    });

    return Object.values(porDia)
      .map(d => ({ dia: d.dia, visitas: d.visitas, visitantes: d.visitantes.size }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
  },

  /**
   * Resumen general: total, únicos, nuevos, por dispositivo.
   */
  async resumen(desde, hasta, linea = null) {
    let query = supabase
      .from('visitas_publicas')
      .select('visitor_id, primera_visita, dispositivo, linea')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59');

    if (linea) query = query.eq('linea', linea);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const visitantes = new Set(rows.map(v => v.visitor_id).filter(Boolean));
    const nuevos = rows.filter(v => v.primera_visita === true).length;
    const recurrentes = rows.length - nuevos;

    const porDispositivo = { movil: 0, tablet: 0, desktop: 0, otro: 0 };
    rows.forEach(v => {
      if (porDispositivo[v.dispositivo] !== undefined) porDispositivo[v.dispositivo]++;
      else porDispositivo.otro++;
    });

    return {
      visitasTotales: rows.length,
      visitantesUnicos: visitantes.size,
      nuevos,
      recurrentes,
      porDispositivo
    };
  },

  /**
   * Top de páginas más visitadas.
   */
  async topPaginas(desde, hasta, limite = 10) {
    const { data, error } = await supabase
      .from('visitas_publicas')
      .select('pagina')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59');
    if (error) throw error;

    const conteo = {};
    (data || []).forEach(v => {
      const p = v.pagina.split('?')[0]; // sin query
      conteo[p] = (conteo[p] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([pagina, visitas]) => ({ pagina, visitas }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, limite);
  },

  /**
   * Top de productos más vistos.
   */
  async topProductos(desde, hasta, limite = 10) {
    const { data, error } = await supabase
      .from('visitas_publicas')
      .select('producto_sku, pagina')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('producto_sku', 'is', null);
    if (error) throw error;

    const conteo = {};
    (data || []).forEach(v => {
      if (!v.producto_sku) return;
      conteo[v.producto_sku] = (conteo[v.producto_sku] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([sku, visitas]) => ({ sku, visitas }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, limite);
  },

  async topOrigenes(desde, hasta, limite = 10) {
    const { data, error } = await supabase
      .from('visitas_publicas')
      .select('utm_source')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('utm_source', 'is', null);
    if (error) throw error;

    const conteo = {};
    (data || []).forEach(v => {
      if (!v.utm_source) return;
      conteo[v.utm_source] = (conteo[v.utm_source] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([origen, visitas]) => ({ origen, visitas }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, limite);
  },

  /**
   * Top de referrers (de dónde viene la gente).
   */
  async topReferrers(desde, hasta, limite = 10) {
    const { data, error } = await supabase
      .from('visitas_publicas')
      .select('referrer')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59');
    if (error) throw error;

    const conteo = {};
    (data || []).forEach(v => {
      const r = v.referrer || 'Directo';
      conteo[r] = (conteo[r] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([referrer, visitas]) => ({ referrer, visitas }))
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, limite);
  },

  /**
   * Visitas recientes (para tabla).
   */
  async recientes(desde, hasta, limite = 20) {
    const { data, error } = await supabase
      .from('visitas_publicas')
      .select('*')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .order('creado_en', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  },

  /**
   * KPIs de comportamiento: páginas por visitante, rebote, duración media.
   */
  async comportamiento(desde, hasta, linea = null) {  
    let query = supabase
      .from('visitas_publicas')
      .select('visitor_id, creado_en, pagina')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('visitor_id', 'is', null);

    if (linea) query = query.eq('linea', linea);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];

    // Agrupar por visitor_id
    const porVisitante = {};
    rows.forEach(v => {
      if (!v.visitor_id) return;
      if (!porVisitante[v.visitor_id]) {
        porVisitante[v.visitor_id] = {
          visitas: 0,
          primera: v.creado_en,
          ultima: v.creado_en
        };
      }
      porVisitante[v.visitor_id].visitas++;
      if (v.creado_en < porVisitante[v.visitor_id].primera) {
        porVisitante[v.visitor_id].primera = v.creado_en;
      }
      if (v.creado_en > porVisitante[v.visitor_id].ultima) {
        porVisitante[v.visitor_id].ultima = v.creado_en;
      }
    });

    const visitantes = Object.values(porVisitante);
    const totalVisitantes = visitantes.length;

    if (totalVisitantes === 0) {
      return {
        paginasPorVisitante: 0,
        tasaRebote: 0,
        duracionMediaSeg: 0,
        totalVisitantes: 0,
        totalVisitas: 0,
        rebotadores: 0
      };
    }

    // 1. Páginas por visitante
    const totalVisitas = visitantes.reduce((s, v) => s + v.visitas, 0);
    const paginasPorVisitante = totalVisitas / totalVisitantes;

    // 2. Tasa de rebote: visitantes con 1 sola visita
    const rebotadores = visitantes.filter(v => v.visitas === 1).length;
    const tasaRebote = Math.round((rebotadores / totalVisitantes) * 100);

    // 3. Duración media de sesión
    // Para cada visitante, calcular la diferencia entre su primera y última visita.
    // Si solo hay 1 visita, la duración es 0 (no se cuenta).
    const duraciones = visitantes
      .filter(v => v.visitas > 1)
      .map(v => {
        const t1 = new Date(v.primera).getTime();
        const t2 = new Date(v.ultima).getTime();
        return (t2 - t1) / 1000; // segundos
      });

    const duracionMediaSeg = duraciones.length > 0
      ? duraciones.reduce((s, d) => s + d, 0) / duraciones.length
      : 0;

    // 4. Visitas por día (promedio)
    const dias = Math.max(1, Math.ceil(
      (new Date(hasta + 'T23:59:59') - new Date(desde + 'T00:00:00')) / 86400000
    ));
    const visitasPorDia = totalVisitas / dias;

    return {
      paginasPorVisitante: Math.round(paginasPorVisitante * 10) / 10,
      tasaRebote,
      duracionMediaSeg: Math.round(duracionMediaSeg),
      totalVisitantes,
      totalVisitas,
      rebotadores,
      visitasPorDia: Math.round(visitasPorDia * 10) / 10   
    };
  },

  /**
   * Tasa de conversión: visitantes únicos que terminaron creando un lead.
   * @param {string} desde - 'YYYY-MM-DD'
   * @param {string} hasta - 'YYYY-MM-DD'
   * @param {string} linea - 'saldos' | 'outlet' | 'catalogo' | null
   */
  async tasaConversion(desde, hasta, linea = null) {
    // 1. Visitantes únicos en el rango
    let queryVisitas = supabase
      .from('visitas_publicas')
      .select('visitor_id')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('visitor_id', 'is', null);

    if (linea) queryVisitas = queryVisitas.eq('linea', linea);

    const { data: visitas, error: errVisitas } = await queryVisitas;
    if (errVisitas) throw errVisitas;

    const visitantes = new Set((visitas || []).map(v => v.visitor_id));

    // 2. Leads con visitor_id en el rango
    const { data: leads, error: errLeads } = await supabase
      .from('leads')
      .select('visitor_id')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('visitor_id', 'is', null);

    if (errLeads) throw errLeads;

    const leadsUnicos = new Set((leads || []).map(l => l.visitor_id));

    // 3. Convertidos = visitantes que también son leads
    const convertidos = [...visitantes].filter(v => leadsUnicos.has(v)).length;

    const totalVisitantes = visitantes.size;
    const totalLeads = leadsUnicos.size;

    return {
      totalVisitantes,
      totalLeads,
      convertidos,
      tasaConversion: totalVisitantes > 0
        ? Math.round((convertidos / totalVisitantes) * 1000) / 10   // 1 decimal
        : 0
    };
  },

  /**
   * Conversión detallada: por línea, por origen y por día.
   */
  async conversionDetallada(desde, hasta, linea = null) {
    // 1. Visitas (con visitor_id)
    let qVisitas = supabase
      .from('visitas_publicas')
      .select('visitor_id, linea, referrer, creado_en')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('visitor_id', 'is', null);

    if (linea) qVisitas = qVisitas.eq('linea', linea);

    const { data: visitas, error: errV } = await qVisitas;
    if (errV) throw errV;

    // 2. Leads (con visitor_id)
    const { data: leads, error: errL } = await supabase
      .from('leads')
      .select('visitor_id')
      .gte('creado_en', desde + 'T00:00:00')
      .lte('creado_en', hasta + 'T23:59:59')
      .not('visitor_id', 'is', null);

    if (errL) throw errL;

    const visitantesPorId = new Set((visitas || []).map(v => v.visitor_id));
    const leadsPorId = new Set((leads || []).map(l => l.visitor_id));

    // ============================================================
    // A. Conversión por línea
    // ============================================================
    const lineasMap = {
      catalogo: { visitantes: new Set(), convertidos: new Set() },
      outlet:   { visitantes: new Set(), convertidos: new Set() },
      saldos:   { visitantes: new Set(), convertidos: new Set() }
    };

    (visitas || []).forEach(v => {
      if (!v.linea || !lineasMap[v.linea]) return;
      lineasMap[v.linea].visitantes.add(v.visitor_id);
      if (leadsPorId.has(v.visitor_id)) {
        lineasMap[v.linea].convertidos.add(v.visitor_id);
      }
    });

    const porLinea = Object.entries(lineasMap).map(([lineaKey, data]) => ({
      linea: lineaKey,
      visitantes: data.visitantes.size,
      convertidos: data.convertidos.size,
      tasa: data.visitantes.size > 0
        ? Math.round((data.convertidos.size / data.visitantes.size) * 1000) / 10
        : 0
    }));

    // ============================================================
    // B. Conversión por origen (referrer)
    // ============================================================
    const origenMap = {};
    (visitas || []).forEach(v => {
      const origen = v.referrer || 'Directo';
      if (!origenMap[origen]) {
        origenMap[origen] = { visitantes: new Set(), convertidos: new Set() };
      }
      origenMap[origen].visitantes.add(v.visitor_id);
      if (leadsPorId.has(v.visitor_id)) {
        origenMap[origen].convertidos.add(v.visitor_id);
      }
    });

    const porOrigen = Object.entries(origenMap).map(([origen, data]) => ({
      origen,
      visitantes: data.visitantes.size,
      convertidos: data.convertidos.size,
      tasa: data.visitantes.size > 0
        ? Math.round((data.convertidos.size / data.visitantes.size) * 1000) / 10
        : 0
    })).sort((a, b) => b.tasa - a.tasa || b.visitantes - a.visitantes);

    // ============================================================
    // C. Conversión por día
    // ============================================================
    const diaMap = {};

    (visitas || []).forEach(v => {
      const dia = v.creado_en.slice(0, 10);
      if (!diaMap[dia]) {
        diaMap[dia] = { visitantes: new Set(), convertidos: new Set() };
      }
      diaMap[dia].visitantes.add(v.visitor_id);
      if (leadsPorId.has(v.visitor_id)) {
        diaMap[dia].convertidos.add(v.visitor_id);
      }
    });

    const porDia = Object.entries(diaMap).map(([dia, data]) => ({
      dia,
      visitantes: data.visitantes.size,
      convertidos: data.convertidos.size,
      tasa: data.visitantes.size > 0
        ? Math.round((data.convertidos.size / data.visitantes.size) * 1000) / 10
        : 0
    })).sort((a, b) => a.dia.localeCompare(b.dia));

    return { porLinea, porOrigen, porDia };
  }  
  
};

export const TrackingConfigAPI = {
  async obtener() {
    const { data, error } = await supabase
      .from('tracking_config')
      .select('activo, actualizado_en')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async actualizar(activo) {
    const { data, error } = await supabase
      .from('tracking_config')
      .update({ activo, actualizado_en: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};