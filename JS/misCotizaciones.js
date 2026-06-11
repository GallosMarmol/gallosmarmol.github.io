// ==================== MIS COTIZACIONES - PARA VENDEDORES ====================

// Variables globales
let vistaMisCotizacionesActual = 'tabla'; // 'tabla' o 'cards'
let paginaActualMisCotizaciones = 1;
const ITEMS_POR_PAGINA_MIS_COTIZACIONES = 10;
let totalMisCotizacionesCount = 0;
let totalPaginasMisCotizaciones = 1;
let vendedorActualData = null;

// ==================== OBTENER VENDEDOR ACTUAL ====================
async function obtenerVendedorActual() {
    try {
        // Buscar si el usuario actual está registrado como vendedor
        const { data: vendedor, error } = await window.supabaseClient
            .from('vendedores')
            .select('*, empleado:empleado_id (id, nombre_completo, puesto, correo, celular)')
            .eq('empleado_id', usuarioActual.empleado_id)
            .maybeSingle();
        
        if (error) throw error;
        
        return vendedor;
    } catch (error) {
        console.error('Error obteniendo vendedor actual:', error);
        return null;
    }
}

// ==================== VERIFICAR ACCESO ====================
async function verificarAccesoVendedor() {
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    
    // Administrador puede ver todo (pero usaremos otra vista para él)
    if (permisos.rol === 'ADMINISTRADOR') {
        return { acceso: true, esAdmin: true };
    }
    
    // OPERADOR_EMPRESA no tiene acceso
    if (permisos.rol === 'OPERADOR_EMPRESA') {
        return { acceso: false, esAdmin: false, motivo: 'No tienes permisos para ver esta sección' };
    }
    
    // EMPLEADO: verificar si está registrado como vendedor
    if (permisos.rol === 'EMPLEADO') {
        const vendedor = await obtenerVendedorActual();
        if (!vendedor) {
            return { acceso: false, esAdmin: false, motivo: 'No estás registrado como vendedor. Contacta al administrador.' };
        }
        return { acceso: true, esAdmin: false, vendedorData: vendedor };
    }
    
    return { acceso: false, esAdmin: false, motivo: 'Acceso denegado' };
}

// ==================== MOSTRAR MENSAJE SIN ACCESO ====================
function mostrarSinAccesoVendedor(motivo) {
    const html = `
        <div class="bg-white rounded-xl shadow-sm p-12 text-center">
            <div class="flex flex-col items-center justify-center">
                <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <i class="fas fa-ban text-4xl text-red-500"></i>
                </div>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
                <p class="text-gray-500 max-w-md">${motivo || 'No tienes permisos para acceder a esta sección.'}</p>
                <button onclick="window.cargarVista('dashboard')" class="btn-primary mt-6">
                    <i class="fas fa-arrow-left mr-2"></i>Volver al Dashboard
                </button>
            </div>
        </div>
    `;
    document.getElementById('dynamicContent').innerHTML = html;
}

// ==================== VISTA PRINCIPAL ====================
async function cargarVistaMisCotizaciones() {
    mostrarLoading('Cargando mis cotizaciones...');
    
    try {
        // Verificar acceso
        const acceso = await verificarAccesoVendedor();
        
        if (!acceso.acceso) {
            ocultarLoading();
            mostrarSinAccesoVendedor(acceso.motivo);
            return;
        }
        
        // Si es administrador, redirigir a vista de todas las cotizaciones
        if (acceso.esAdmin) {
            ocultarLoading();
            await cargarVistaLeads(); // Vista de admin para ver todos los leads
            return;
        }
        
        // Guardar datos del vendedor actual
        vendedorActualData = acceso.vendedorData;
        
        console.log('👤 Vendedor actual:', vendedorActualData?.nombre);
        
        // ============================================
        // LEER FILTROS
        // ============================================
        const filtroEstado = document.getElementById('filtroEstadoLeadVendedor')?.value;
        const filtroFechaDesde = document.getElementById('filtroFechaDesdeVendedor')?.value;
        const filtroFechaHasta = document.getElementById('filtroFechaHastaVendedor')?.value;
        const busqueda = document.getElementById('busquedaCotizacionesVendedor')?.value;
        
        // ============================================
        // CONSTRUIR CONSULTA
        // ============================================
        let query = window.supabaseClient
            .from('leads_cotizaciones')
            .select('*', { count: 'exact' })
            .eq('vendedor_asignado_id', vendedorActualData.id)
            .order('creado_el', { ascending: false });
        
        // Aplicar filtros
        if (filtroEstado && filtroEstado !== '') {
            query = query.eq('estado', filtroEstado);
        }
        if (filtroFechaDesde && filtroFechaDesde !== '') {
            query = query.gte('creado_el', `${filtroFechaDesde}T00:00:00`);
        }
        if (filtroFechaHasta && filtroFechaHasta !== '') {
            query = query.lte('creado_el', `${filtroFechaHasta}T23:59:59`);
        }
        if (busqueda && busqueda !== '') {
            query = query.or(`nombre.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%,email.ilike.%${busqueda}%,producto_nombre.ilike.%${busqueda}%`);
        }
        
        // Paginación
        const desde = (paginaActualMisCotizaciones - 1) * ITEMS_POR_PAGINA_MIS_COTIZACIONES;
        const hasta = desde + ITEMS_POR_PAGINA_MIS_COTIZACIONES - 1;
        query = query.range(desde, hasta);
        
        const { data: leads, count, error } = await query;
        
        if (error) throw error;
        
        totalMisCotizacionesCount = count || 0;
        totalPaginasMisCotizaciones = Math.ceil(totalMisCotizacionesCount / ITEMS_POR_PAGINA_MIS_COTIZACIONES);
        
        // ============================================
        // ESTADÍSTICAS DEL VENDEDOR
        // ============================================
        const { data: stats } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('estado, creado_el')
            .eq('vendedor_asignado_id', vendedorActualData.id);
        
        const totalLeads = stats?.length || 0;
        const leadsNuevos = stats?.filter(l => l.estado === 'NUEVO').length || 0;
        const leadsContactados = stats?.filter(l => l.estado === 'CONTACTADO').length || 0;
        const leadsCotizados = stats?.filter(l => l.estado === 'COTIZADO').length || 0;
        const leadsGanados = stats?.filter(l => l.estado === 'GANADO').length || 0;
        const leadsPerdidos = stats?.filter(l => l.estado === 'PERDIDO').length || 0;
        
        // Leads de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const leadsHoy = stats?.filter(l => l.creado_el?.startsWith(hoy)).length || 0;
        
        // Capacidad restante
        const capacidadRestante = (vendedorActualData.max_leads_diarios || 10) - (vendedorActualData.leads_asignados_hoy || 0);
        const porcentajeCapacidad = ((vendedorActualData.leads_asignados_hoy || 0) / (vendedorActualData.max_leads_diarios || 10)) * 100;
        
        ocultarLoading();
        
        // ============================================
        // GENERAR HTML
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-clipboard-list"></i> Mis Cotizaciones
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Leads y cotizaciones asignadas a ti
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${totalLeads} lead${totalLeads !== 1 ? 's' : ''}
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaMisCotizaciones('tabla')" class="px-3 py-1.5 text-sm ${vistaMisCotizacionesActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors">
                                <i class="fas fa-table"></i> Tabla
                            </button>
                            <button onclick="toggleVistaMisCotizaciones('cards')" class="px-3 py-1.5 text-sm ${vistaMisCotizacionesActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors">
                                <i class="fas fa-th-large"></i> Tarjetas
                            </button>
                        </div>
                        <button onclick="exportarMisCotizacionesExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Perfil del vendedor -->
            <div class="bg-gradient-to-r from-primary to-primary-dark rounded-xl shadow-sm p-4 mb-6 text-white">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <i class="fas fa-user-tie text-xl"></i>
                        </div>
                        <div>
                            <h2 class="font-bold text-lg">${vendedorActualData.nombre || 'Vendedor'}</h2>
                            <p class="text-sm text-white/80">${vendedorActualData.email || 'Sin email'} • ${vendedorActualData.telefono || 'Sin teléfono'}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm">Capacidad hoy</div>
                        <div class="flex items-center gap-2">
                            <span class="text-2xl font-bold">${vendedorActualData.leads_asignados_hoy || 0}</span>
                            <span class="text-sm">/ ${vendedorActualData.max_leads_diarios || 10}</span>
                            <div class="w-24 bg-white/30 rounded-full h-2 ml-2">
                                <div class="bg-secondary h-2 rounded-full" style="width: ${Math.min(porcentajeCapacidad, 100)}%"></div>
                            </div>
                        </div>
                        <p class="text-xs text-white/70 mt-1">${capacidadRestante > 0 ? `Puedes recibir ${capacidadRestante} lead${capacidadRestante !== 1 ? 's' : ''} más hoy` : 'Límite diario alcanzado'}</p>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${totalLeads}</p>
                    <p class="text-xs text-gray-500">Total</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-orange-500">
                    <p class="text-2xl font-bold text-orange-600">${leadsNuevos}</p>
                    <p class="text-xs text-gray-500">Nuevos</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-blue-500">
                    <p class="text-2xl font-bold text-blue-600">${leadsContactados}</p>
                    <p class="text-xs text-gray-500">Contactados</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-purple-500">
                    <p class="text-2xl font-bold text-purple-600">${leadsCotizados}</p>
                    <p class="text-xs text-gray-500">Cotizados</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${leadsGanados}</p>
                    <p class="text-xs text-gray-500">Ganados</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-red-500">
                    <p class="text-2xl font-bold text-red-600">${leadsPerdidos}</p>
                    <p class="text-xs text-gray-500">Perdidos</p>
                </div>
            </div>
            
            <!-- FILTROS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosMisCotizaciones()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosMisCotizacionesBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosMisCotizacionesIcon"></i>
                </div>
                <div id="panelFiltrosMisCotizaciones" class="p-4 hidden">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                            <select id="filtroEstadoLeadVendedor" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                <option value="NUEVO">📋 Nuevo</option>
                                <option value="CONTACTADO">📞 Contactado</option>
                                <option value="COTIZADO">💰 Cotizado</option>
                                <option value="GANADO">🏆 Ganado</option>
                                <option value="PERDIDO">❌ Perdido</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
                            <input type="date" id="filtroFechaDesdeVendedor" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
                            <input type="date" id="filtroFechaHastaVendedor" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div class="flex items-end">
                            <button onclick="aplicarFiltrosMisCotizaciones()" class="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <i class="fas fa-search"></i> Aplicar
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4 pt-3 border-t">
                        <div class="relative w-64">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="busquedaCotizacionesVendedor" placeholder="Buscar por nombre, teléfono, producto..." 
                                class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-full">
                        </div>
                        <button onclick="limpiarFiltrosMisCotizaciones()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-undo-alt"></i> Limpiar
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="misCotizacionesContainer">
                ${vistaMisCotizacionesActual === 'tabla' 
                    ? generarTablaMisCotizaciones(leads)
                    : generarCardsMisCotizaciones(leads)
                }
            </div>
        `;
        
        // Agregar paginación
        if (totalPaginasMisCotizaciones > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualMisCotizaciones - 1) * ITEMS_POR_PAGINA_MIS_COTIZACIONES) + 1} - ${Math.min(paginaActualMisCotizaciones * ITEMS_POR_PAGINA_MIS_COTIZACIONES, totalMisCotizacionesCount)} de ${totalMisCotizacionesCount} cotizaciones
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaMisCotizaciones(${paginaActualMisCotizaciones - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualMisCotizaciones === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorMisCotizaciones()}
                        </div>
                        <button onclick="cambiarPaginaMisCotizaciones(${paginaActualMisCotizaciones + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualMisCotizaciones === totalPaginasMisCotizaciones ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Inicializar eventos de filtros
        inicializarEventosFiltrosMisCotizaciones();
        
        // Actualizar badge de notificaciones
        await actualizarBadgeNuevosLeads();
        
        console.log('✅ Vista de Mis Cotizaciones cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando mis cotizaciones:', error);
        mostrarError('Error al cargar mis cotizaciones: ' + error.message);
    }
}

// ==================== GENERAR TABLA ====================
function generarTablaMisCotizaciones(leads) {
    if (!leads || leads.length === 0) {
        return `
            <div class="text-center py-12 bg-white rounded-lg">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No tienes cotizaciones asignadas</p>
                <p class="text-sm text-gray-400 mt-1">Las cotizaciones aparecerán aquí cuando te sean asignadas</p>
            </div>
        `;
    }
    
    const estadoColors = {
        'NUEVO': 'bg-orange-100 text-orange-800',
        'CONTACTADO': 'bg-blue-100 text-blue-800',
        'COTIZADO': 'bg-purple-100 text-purple-800',
        'GANADO': 'bg-green-100 text-green-800',
        'PERDIDO': 'bg-red-100 text-red-800'
    };
    
    const estadoIconos = {
        'NUEVO': '📋',
        'CONTACTADO': '📞',
        'COTIZADO': '💰',
        'GANADO': '🏆',
        'PERDIDO': '❌'
    };
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">m²</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${leads.map(lead => `
                            <tr class="hover:bg-gray-50 ${lead.estado === 'NUEVO' ? 'bg-orange-50' : ''}">
                                <td class="px-4 py-3 text-sm whitespace-nowrap">${new Date(lead.creado_el).toLocaleDateString()} ${new Date(lead.creado_el).toLocaleTimeString().slice(0,5)}</td>
                                <td class="px-4 py-3 text-sm font-medium text-primary">${lead.producto_nombre || 'N/A'}</td>
                                <td class="px-4 py-3 text-sm font-medium">${lead.nombre || 'N/A'}</td>
                                <td class="px-4 py-3 text-sm">
                                    <div><i class="fas fa-phone text-xs text-gray-400 mr-1"></i> ${lead.telefono || 'N/A'}</div>
                                    ${lead.email ? `<div><i class="fas fa-envelope text-xs text-gray-400 mr-1"></i> ${lead.email}</div>` : ''}
                                </td>
                                <td class="px-4 py-3 text-sm text-center">${lead.metros_cuadrados || '-'}</td>
                                <td class="px-4 py-3 text-sm">
                                    <select onchange="cambiarEstadoLeadVendedor('${lead.id}', this.value)" 
                                            class="px-2 py-1 rounded-full text-xs font-semibold ${estadoColors[lead.estado]} border-0 focus:ring-1 focus:ring-primary">
                                        <option value="NUEVO" ${lead.estado === 'NUEVO' ? 'selected' : ''}>${estadoIconos.NUEVO} Nuevo</option>
                                        <option value="CONTACTADO" ${lead.estado === 'CONTACTADO' ? 'selected' : ''}>${estadoIconos.CONTACTADO} Contactado</option>
                                        <option value="COTIZADO" ${lead.estado === 'COTIZADO' ? 'selected' : ''}>${estadoIconos.COTIZADO} Cotizado</option>
                                        <option value="GANADO" ${lead.estado === 'GANADO' ? 'selected' : ''}>${estadoIconos.GANADO} Ganado</option>
                                        <option value="PERDIDO" ${lead.estado === 'PERDIDO' ? 'selected' : ''}>${estadoIconos.PERDIDO} Perdido</option>
                                    </select>
                                 </div>
                                <td class="px-4 py-3 text-sm whitespace-nowrap">
                                    <button onclick="verDetalleLeadVendedor('${lead.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <a href="https://wa.me/${lead.telefono?.replace(/\\D/g, '')}?text=Hola%20${encodeURIComponent(lead.nombre || '')}%2C%20recibimos%20tu%20cotizaci%C3%B3n%20de%20${encodeURIComponent(lead.producto_nombre || 'nuestros productos')}" 
                                       target="_blank" class="text-green-600 hover:text-green-800 p-1" title="WhatsApp">
                                        <i class="fab fa-whatsapp"></i>
                                    </a>
                                 </div>
                             </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== GENERAR CARDS ====================
function generarCardsMisCotizaciones(leads) {
    if (!leads || leads.length === 0) {
        return `
            <div class="text-center py-12 bg-white rounded-lg col-span-full">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No tienes cotizaciones asignadas</p>
                <p class="text-sm text-gray-400 mt-1">Las cotizaciones aparecerán aquí cuando te sean asignadas</p>
            </div>
        `;
    }
    
    const estadoColors = {
        'NUEVO': 'bg-orange-100 text-orange-800',
        'CONTACTADO': 'bg-blue-100 text-blue-800',
        'COTIZADO': 'bg-purple-100 text-purple-800',
        'GANADO': 'bg-green-100 text-green-800',
        'PERDIDO': 'bg-red-100 text-red-800'
    };
    
    const estadoIconos = {
        'NUEVO': '📋',
        'CONTACTADO': '📞',
        'COTIZADO': '💰',
        'GANADO': '🏆',
        'PERDIDO': '❌'
    };
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${leads.map(lead => `
                <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 ${lead.estado === 'NUEVO' ? 'border-l-4 border-l-orange-500' : ''}">
                                    <div class="p-4">
                                        <div class="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 class="font-bold text-primary">${lead.producto_nombre || 'Producto no especificado'}</h3>
                                                <p class="text-xs text-gray-400">${new Date(lead.creado_el).toLocaleString()}</p>
                                            </div>
                                            <select onchange="cambiarEstadoLeadVendedor('${lead.id}', this.value)" 
                                                    class="px-2 py-1 rounded-full text-xs font-semibold ${estadoColors[lead.estado]} border-0">
                                                <option value="NUEVO" ${lead.estado === 'NUEVO' ? 'selected' : ''}>${estadoIconos.NUEVO} Nuevo</option>
                                                <option value="CONTACTADO" ${lead.estado === 'CONTACTADO' ? 'selected' : ''}>${estadoIconos.CONTACTADO} Contactado</option>
                                                <option value="COTIZADO" ${lead.estado === 'COTIZADO' ? 'selected' : ''}>${estadoIconos.COTIZADO} Cotizado</option>
                                                <option value="GANADO" ${lead.estado === 'GANADO' ? 'selected' : ''}>${estadoIconos.GANADO} Ganado</option>
                                                <option value="PERDIDO" ${lead.estado === 'PERDIDO' ? 'selected' : ''}>${estadoIconos.PERDIDO} Perdido</option>
                                            </select>
                                        </div>
                                        <div class="space-y-2 mt-3">
                                            <div class="flex items-center gap-2 text-sm">
                                                <i class="fas fa-user text-primary w-5"></i>
                                                <span class="font-medium">${lead.nombre || 'N/A'}</span>
                                            </div>
                                            <div class="flex items-center gap-2 text-sm">
                                                <i class="fas fa-phone text-primary w-5"></i>
                                                <a href="tel:${lead.telefono}" class="text-blue-600 hover:underline">${lead.telefono || 'N/A'}</a>
                                            </div>
                                            ${lead.email ? `
                                                <div class="flex items-center gap-2 text-sm">
                                                    <i class="fas fa-envelope text-primary w-5"></i>
                                                    <a href="mailto:${lead.email}" class="text-blue-600 hover:underline">${lead.email}</a>
                                                </div>
                                            ` : ''}
                                            ${lead.distrito ? `
                                                <div class="flex items-center gap-2 text-sm">
                                                    <i class="fas fa-map-marker-alt text-primary w-5"></i>
                                                    <span>${lead.distrito}</span>
                                                </div>
                                            ` : ''}
                                            ${lead.metros_cuadrados ? `
                                                <div class="flex items-center gap-2 text-sm">
                                                    <i class="fas fa-ruler-combined text-primary w-5"></i>
                                                    <span>${lead.metros_cuadrados} m²</span>
                                                </div>
                                            ` : ''}
                                            ${lead.mensaje ? `
                                                <div class="bg-gray-50 p-2 rounded-lg mt-2">
                                                    <p class="text-xs text-gray-600 line-clamp-2">${lead.mensaje}</p>
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                                            <button onclick="verDetalleLeadVendedor('${lead.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <a href="https://wa.me/${lead.telefono?.replace(/\\D/g, '')}?text=Hola%20${encodeURIComponent(lead.nombre || '')}%2C%20recibimos%20tu%20cotizaci%C3%B3n%20de%20${encodeURIComponent(lead.producto_nombre || 'nuestros productos')}" 
                                               target="_blank" class="text-green-600 hover:text-green-800 p-1" title="WhatsApp">
                                                <i class="fab fa-whatsapp"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // ==================== VER DETALLE LEAD ====================
                window.verDetalleLeadVendedor = async function(id) {
                    mostrarLoading('Cargando detalles...');
                    
                    try {
                        const { data: lead, error } = await window.supabaseClient
                            .from('leads_cotizaciones')
                            .select('*')
                            .eq('id', id)
                            .single();
                        
                        if (error) throw error;
                        
                        ocultarLoading();
                        
                        const estadoOptions = {
                            'NUEVO': { label: '📋 Nuevo', color: 'orange' },
                            'CONTACTADO': { label: '📞 Contactado', color: 'blue' },
                            'COTIZADO': { label: '💰 Cotizado', color: 'purple' },
                            'GANADO': { label: '🏆 Ganado', color: 'green' },
                            'PERDIDO': { label: '❌ Perdido', color: 'red' }
                        };
                        
                        Swal.fire({
                            title: `<span class="text-primary">${lead.nombre}</span>`,
                            width: '550px',
                            html: `
                                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                    <div class="bg-gray-50 p-3 rounded-lg">
                                        <p><strong>📅 Fecha:</strong> ${new Date(lead.creado_el).toLocaleString()}</p>
                                        <p><strong>📦 Producto:</strong> <span class="text-primary font-semibold">${lead.producto_nombre || 'No especificado'}</span></p>
                                        <p><strong>📊 Estado actual:</strong> <span class="px-2 py-0.5 rounded-full text-xs bg-${estadoOptions[lead.estado]?.color}-100 text-${estadoOptions[lead.estado]?.color}-800">${estadoOptions[lead.estado]?.label || lead.estado}</span></p>
                                    </div>
                                    
                                    <div class="border-t pt-2">
                                        <h4 class="font-semibold text-primary mb-2">📋 Datos de contacto</h4>
                                        <div class="grid grid-cols-2 gap-2 text-sm">
                                            <div><span class="font-medium">Teléfono:</span></div>
                                            <div><a href="tel:${lead.telefono}" class="text-blue-600 hover:underline">${lead.telefono || 'N/A'}</a></div>
                                            ${lead.email ? `<div><span class="font-medium">Email:</span></div><div><a href="mailto:${lead.email}" class="text-blue-600 hover:underline">${lead.email}</a></div>` : ''}
                                            ${lead.distrito ? `<div><span class="font-medium">Distrito:</span></div><div>${lead.distrito}</div>` : ''}
                                            ${lead.metros_cuadrados ? `<div><span class="font-medium">Metros²:</span></div><div>${lead.metros_cuadrados} m²</div>` : ''}
                                        </div>
                                    </div>
                                    
                                    ${lead.mensaje ? `
                                        <div class="border-t pt-2">
                                            <h4 class="font-semibold text-primary mb-2">💬 Mensaje</h4>
                                            <div class="bg-gray-50 p-3 rounded-lg text-sm">
                                                ${lead.mensaje}
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    <div class="border-t pt-2">
                                        <h4 class="font-semibold text-primary mb-2">📝 Actualizar estado</h4>
                                        <select id="cambiarEstadoSelectVendedor" class="form-input w-full">
                                            <option value="NUEVO" ${lead.estado === 'NUEVO' ? 'selected' : ''}>📋 Nuevo</option>
                                            <option value="CONTACTADO" ${lead.estado === 'CONTACTADO' ? 'selected' : ''}>📞 Contactado</option>
                                            <option value="COTIZADO" ${lead.estado === 'COTIZADO' ? 'selected' : ''}>💰 Cotizado</option>
                                            <option value="GANADO" ${lead.estado === 'GANADO' ? 'selected' : ''}>🏆 Ganado</option>
                                            <option value="PERDIDO" ${lead.estado === 'PERDIDO' ? 'selected' : ''}>❌ Perdido</option>
                                        </select>
                                        <div class="mt-3">
                                            <label class="form-label text-sm">Notas (opcional)</label>
                                            <textarea id="notasLeadVendedor" class="form-input w-full text-sm" rows="2" placeholder="Agregar notas sobre este lead...">${lead.notas || ''}</textarea>
                                        </div>
                                        <button onclick="actualizarEstadoLeadVendedor('${lead.id}')" class="btn-primary w-full mt-3 text-sm py-2">
                                            <i class="fas fa-save mr-1"></i> Actualizar estado
                                        </button>
                                    </div>
                                    
                                    <div class="flex gap-2 pt-2">
                                        <a href="https://wa.me/${lead.telefono?.replace(/\\D/g, '')}?text=Hola%20${encodeURIComponent(lead.nombre || '')}%2C%20recibimos%20tu%20cotizaci%C3%B3n%20de%20${encodeURIComponent(lead.producto_nombre || 'nuestros productos')}" 
                                           target="_blank" class="flex-1 bg-green-500 text-white text-center py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                                            <i class="fab fa-whatsapp"></i> WhatsApp
                                        </a>
                                        <a href="tel:${lead.telefono}" class="flex-1 bg-blue-500 text-white text-center py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                                            <i class="fas fa-phone"></i> Llamar
                                        </a>
                                    </div>
                                </div>
                            `,
                            confirmButtonColor: '#39080a',
                            confirmButtonText: 'Cerrar',
                            showCloseButton: true,
                            didOpen: () => {
                                window.actualizarEstadoLeadVendedor = async function(leadId) {
                                    const nuevoEstado = document.getElementById('cambiarEstadoSelectVendedor').value;
                                    const notas = document.getElementById('notasLeadVendedor').value;
                                    
                                    await cambiarEstadoLeadVendedor(leadId, nuevoEstado, notas);
                                    Swal.close();
                                    await cargarVistaMisCotizaciones();
                                };
                            }
                        });
                        
                    } catch (error) {
                        ocultarLoading();
                        console.error('Error:', error);
                        mostrarAlerta('Error', 'No se pudieron cargar los detalles', 'error');
                    }
                };
                
                // ==================== CAMBIAR ESTADO LEAD ====================
                window.cambiarEstadoLeadVendedor = async function(id, nuevoEstado, notas = null) {
                    try {
                        const updateData = { estado: nuevoEstado };
                        if (notas !== null) updateData.notas = notas;
                        
                        if (nuevoEstado === 'CONTACTADO' && !notas) {
                            const { value: comentario } = await Swal.fire({
                                title: 'Registrar contacto',
                                input: 'textarea',
                                inputPlaceholder: '¿Cómo fue el contacto? ¿Qué acordaron?',
                                inputLabel: 'Registra una nota sobre este contacto',
                                showCancelButton: true,
                                confirmButtonColor: '#3b82f6',
                                confirmButtonText: 'Guardar'
                            });
                            if (comentario) updateData.notas = comentario;
                        }
                        
                        const { error } = await window.supabaseClient
                            .from('leads_cotizaciones')
                            .update(updateData)
                            .eq('id', id);
                        
                        if (error) throw error;
                        
                        mostrarAlerta('Éxito', `Estado actualizado a ${nuevoEstado}`, 'success');
                        await cargarVistaMisCotizaciones();
                        
                        // Actualizar badge de nuevos leads
                        await actualizarBadgeNuevosLeads();
                        
                    } catch (error) {
                        console.error('Error:', error);
                        mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
                    }
                };
                
                // ==================== FUNCIONES DE FILTROS ====================
                function inicializarEventosFiltrosMisCotizaciones() {
                    const inputs = ['filtroEstadoLeadVendedor', 'filtroFechaDesdeVendedor', 'filtroFechaHastaVendedor', 'busquedaCotizacionesVendedor'];
                    
                    inputs.forEach(id => {
                        const elemento = document.getElementById(id);
                        if (elemento) {
                            elemento.removeEventListener('change', aplicarFiltrosMisCotizaciones);
                            elemento.removeEventListener('input', aplicarFiltrosMisCotizaciones);
                            elemento.addEventListener('change', aplicarFiltrosMisCotizaciones);
                            if (id === 'busquedaCotizacionesVendedor') {
                                elemento.addEventListener('input', aplicarFiltrosMisCotizaciones);
                            }
                        }
                    });
                }
                
                window.aplicarFiltrosMisCotizaciones = function() {
                    paginaActualMisCotizaciones = 1;
                    cargarVistaMisCotizaciones();
                };
                
                window.limpiarFiltrosMisCotizaciones = function() {
                    document.getElementById('filtroEstadoLeadVendedor').value = '';
                    document.getElementById('filtroFechaDesdeVendedor').value = '';
                    document.getElementById('filtroFechaHastaVendedor').value = '';
                    document.getElementById('busquedaCotizacionesVendedor').value = '';
                    
                    paginaActualMisCotizaciones = 1;
                    cargarVistaMisCotizaciones();
                };
                
                window.toggleFiltrosMisCotizaciones = function() {
                    const panel = document.getElementById('panelFiltrosMisCotizaciones');
                    const icon = document.getElementById('filtrosMisCotizacionesIcon');
                    
                    if (!panel) return;
                    
                    if (panel.classList.contains('hidden')) {
                        panel.classList.remove('hidden');
                        if (icon) icon.style.transform = 'rotate(180deg)';
                    } else {
                        panel.classList.add('hidden');
                        if (icon) icon.style.transform = 'rotate(0deg)';
                    }
                };
                
                // ==================== PAGINACIÓN ====================
                function generarPaginadorMisCotizaciones() {
                    let html = '';
                    const maxBotones = 5;
                    let inicio = Math.max(1, paginaActualMisCotizaciones - Math.floor(maxBotones / 2));
                    let fin = Math.min(totalPaginasMisCotizaciones, inicio + maxBotones - 1);
                    
                    if (fin - inicio + 1 < maxBotones) {
                        inicio = Math.max(1, fin - maxBotones + 1);
                    }
                    
                    for (let i = inicio; i <= fin; i++) {
                        html += `
                            <button onclick="cambiarPaginaMisCotizaciones(${i})" 
                                    class="px-3 py-1 rounded-lg ${i === paginaActualMisCotizaciones ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                                ${i}
                            </button>
                        `;
                    }
                    return html;
                }
                
                window.cambiarPaginaMisCotizaciones = async function(pagina) {
                    if (pagina < 1 || pagina > totalPaginasMisCotizaciones) return;
                    if (pagina === paginaActualMisCotizaciones) return;
                    
                    const scrollY = window.scrollY;
                    paginaActualMisCotizaciones = pagina;
                    await cargarVistaMisCotizaciones();
                    setTimeout(() => window.scrollTo(0, scrollY), 100);
                };
                
                window.toggleVistaMisCotizaciones = async function(vista) {
                    vistaMisCotizacionesActual = vista;
                    await cargarVistaMisCotizaciones();
                };
                
                // ==================== EXPORTAR A EXCEL ====================
                window.exportarMisCotizacionesExcel = async function() {
                    mostrarLoading('Generando archivo Excel...');
                    
                    try {
                        const { data: leads, error } = await window.supabaseClient
                            .from('leads_cotizaciones')
                            .select('*')
                            .eq('vendedor_asignado_id', vendedorActualData.id)
                            .order('creado_el', { ascending: false });
                        
                        if (error) throw error;
                        
                        if (!leads || leads.length === 0) {
                            ocultarLoading();
                            mostrarAlerta('Info', 'No hay cotizaciones para exportar', 'info');
                            return;
                        }
                        
                        const estadoTexto = {
                            'NUEVO': 'Nuevo',
                            'CONTACTADO': 'Contactado',
                            'COTIZADO': 'Cotizado',
                            'GANADO': 'Ganado',
                            'PERDIDO': 'Perdido'
                        };
                        
                        const datos = leads.map(l => ({
                            'FECHA': new Date(l.creado_el).toLocaleString(),
                            'PRODUCTO': l.producto_nombre || 'N/A',
                            'CLIENTE': l.nombre || 'N/A',
                            'TELÉFONO': l.telefono || 'N/A',
                            'EMAIL': l.email || 'N/A',
                            'DISTRITO': l.distrito || 'N/A',
                            'METROS²': l.metros_cuadrados || 'N/A',
                            'MENSAJE': l.mensaje || 'N/A',
                            'ESTADO': estadoTexto[l.estado] || l.estado,
                            'FECHA ASIGNACIÓN': l.fecha_asignacion ? new Date(l.fecha_asignacion).toLocaleString() : 'N/A'
                        }));
                        
                        const ws = XLSX.utils.json_to_sheet(datos);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Mis Cotizaciones');
                        
                        const colWidths = [
                            { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 15 },
                            { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 50 }, { wch: 12 }, { wch: 20 }
                        ];
                        ws['!cols'] = colWidths;
                        
                        XLSX.writeFile(wb, `mis_cotizaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
                        
                        ocultarLoading();
                        mostrarAlerta('Éxito', `Se exportaron ${datos.length} cotizaciones a Excel`, 'success');
                        
                    } catch (error) {
                        ocultarLoading();
                        console.error('Error:', error);
                        mostrarAlerta('Error', 'No se pudo exportar a Excel', 'error');
                    }
                };
                
                // ==================== ACTUALIZAR BADGE NUEVOS LEADS ====================
                async function actualizarBadgeNuevosLeads() {
                    if (!vendedorActualData?.id) return;
                    
                    try {
                        const { count, error } = await window.supabaseClient
                            .from('leads_cotizaciones')
                            .select('*', { count: 'exact', head: true })
                            .eq('vendedor_asignado_id', vendedorActualData.id)
                            .eq('estado', 'NUEVO');
                        
                        if (error) throw error;
                        
                        const badge = document.getElementById('mis-cotizaciones-badge');
                        if (badge) {
                            if (count > 0) {
                                badge.textContent = count > 99 ? '99+' : count;
                                badge.classList.remove('hidden');
                            } else {
                                badge.classList.add('hidden');
                            }
                        }
                    } catch (error) {
                        console.error('Error actualizando badge:', error);
                    }
                }
                
                // Exponer función global
                window.cargarVistaMisCotizaciones = cargarVistaMisCotizaciones;
                window.actualizarBadgeNuevosLeads = actualizarBadgeNuevosLeads;