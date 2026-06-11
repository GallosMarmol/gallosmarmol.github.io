// ==================== SOLICITUDES DE COMPRA ====================

// Variables globales
let solicitudEditandoId = null;
let responsableSugeridoGlobal = null;
let responsablesDisponiblesGlobal = [];

// ==================== VARIABLES GLOBALES PARA SOLICITUDES ====================
let vistaSolicitudesActual = 'cards'; // 'tabla' o 'cards'
let paginaActualSolicitudes = 1;
const ITEMS_POR_PAGINA_SOLICITUDES = 12;
let totalSolicitudesCount = 0;
let totalPaginasSolicitudes = 1;
let solicitudesCache = [];

// Variables para filtros globales (exportación)
let filtrosSolicitudesGlobal = {
    estado: '',
    categoria: '',
    urgencia: '',
    fechaDesde: '',
    fechaHasta: '',
    busqueda: ''
};

// ==================== CALCULAR TIEMPO TRANSCURRIDO ====================
function calcularTiempoTranscurrido(fecha) {
    if (!fecha) return 'N/A';
    
    const ahora = new Date();
    const entonces = new Date(fecha);
    const diffMs = ahora - entonces;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) !== 1 ? 's' : ''}`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) !== 1 ? 'es' : ''}`;
    return `Hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) !== 1 ? 's' : ''}`;
}

window.calcularTiempoTranscurrido = calcularTiempoTranscurrido;

async function cargarVistaSolicitudes( aplicarFiltros = false ) {
    mostrarLoading('Cargando solicitudes...');
    
    try {
        console.log('%c📋 CARGANDO SOLICITUDES', 'background: #17a2b8; color: white; font-size: 14px;');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // ============================================
        // OBTENER VALORES ÚNICOS PARA FILTROS (SIEMPRE se cargan)
        // ============================================
        const { estados, categorias, urgencias } = await obtenerValoresUnicosSolicitudes();
        
        // ============================================
        // LEER FILTROS ACTUALES DEL DOM (solo si se aplican)
        // ============================================
        let filtroEstado = '';
        let filtroCategoria = '';
        let filtroUrgencia = '';
        let filtroFechaDesde = '';
        let filtroFechaHasta = '';
        let busqueda = '';
        
        if (aplicarFiltros) {
            filtroEstado = document.getElementById('filtroEstado')?.value || '';
            filtroCategoria = document.getElementById('filtroCategoria')?.value || '';
            filtroUrgencia = document.getElementById('filtroUrgencia')?.value || '';
            filtroFechaDesde = document.getElementById('filtroFechaDesdeSolicitud')?.value || '';
            filtroFechaHasta = document.getElementById('filtroFechaHastaSolicitud')?.value || '';
            busqueda = document.getElementById('busquedaSolicitudes')?.value || '';
            
            console.log('📊 Aplicando filtros:', { filtroEstado, filtroCategoria, filtroUrgencia, filtroFechaDesde, filtroFechaHasta, busqueda });
        }
        
        // ============================================
        // CONSTRUIR CONSULTA PRINCIPAL
        // ============================================
        let query = window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `, { count: 'exact' });
        
        // Filtrar por solicitante (si no es admin, solo sus solicitudes)
        if (!esAdmin) {
            query = query.eq('solicitante_id', usuarioActual.id);
        }
        
        // Aplicar filtros SOLO si se solicita
        if (aplicarFiltros) {
            if (filtroEstado && filtroEstado !== '') {
                query = query.eq('estado', filtroEstado);
            }
            if (filtroCategoria && filtroCategoria !== '') {
                query = query.eq('categoria_id', filtroCategoria);
            }
            if (filtroUrgencia && filtroUrgencia !== '') {
                query = query.eq('urgencia', filtroUrgencia);
            }
            if (filtroFechaDesde && filtroFechaDesde !== '') {
                query = query.gte('creado_el', `${filtroFechaDesde}T00:00:00`);
            }
            if (filtroFechaHasta && filtroFechaHasta !== '') {
                query = query.lte('creado_el', `${filtroFechaHasta}T23:59:59`);
            }
            if (busqueda && busqueda !== '') {
                query = query.or(`numero.ilike.%${busqueda}%,titulo.ilike.%${busqueda}%`);
            }
        }
        
        // Ordenar por fecha descendente
        query = query.order('creado_el', { ascending: false });
        
        // Aplicar paginación
        const desde = (paginaActualSolicitudes - 1) * ITEMS_POR_PAGINA_SOLICITUDES;
        const hasta = desde + ITEMS_POR_PAGINA_SOLICITUDES - 1;
        query = query.range(desde, hasta);
        
        const { data: solicitudes, count, error } = await query;
        
        if (error) throw error;
        
        totalSolicitudesCount = count || 0;
        totalPaginasSolicitudes = Math.ceil(totalSolicitudesCount / ITEMS_POR_PAGINA_SOLICITUDES);
        
        // Guardar en caché
        solicitudesCache = solicitudes;
        
        // ============================================
        // ESTADÍSTICAS (con los datos actuales)
        // ============================================
        const pendientes = solicitudes?.filter(s => s.estado === 'PENDIENTE').length || 0;
        const aprobadas = solicitudes?.filter(s => s.estado === 'APROBADO').length || 0;
        const rechazadas = solicitudes?.filter(s => s.estado === 'RECHAZADO').length || 0;
        const entregadas = solicitudes?.filter(s => s.estado === 'ENTREGADO').length || 0;
        
        // ============================================
        // GENERAR OPCIONES DE FILTROS (siempre se generan)
        // ============================================
        const estadoOptions = estados.map(e => {
            const nombre = { 'PENDIENTE': 'Pendiente', 'APROBADO': 'Aprobado', 'RECHAZADO': 'Rechazado', 'ENTREGADO': 'Entregado' }[e] || e;
            return `<option value="${e}">${nombre}</option>`;
        }).join('');
        
        const categoriaOptions = categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        
        const urgenciaOptions = urgencias.map(u => {
            const nombre = { 'BAJA': 'Baja', 'MEDIA': 'Media', 'ALTA': 'Alta', 'URGENTE': 'Urgente' }[u] || u;
            return `<option value="${u}">${nombre}</option>`;
        }).join('');
        
        console.log('📊 Opciones generadas - Estados:', estados.length, 'Categorías:', categorias.length, 'Urgencias:', urgencias.length);
        
        ocultarLoading();
        
        // ============================================
        // GENERAR HTML (igual que antes)
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-clipboard-list"></i> ${esAdmin ? 'Gestión de Solicitudes' : 'Mis Solicitudes'}
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            ${esAdmin ? 'Administración de solicitudes de compra y reposición' : 'Solicitudes de compra que has realizado'}
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${totalSolicitudesCount} solicitud${totalSolicitudesCount !== 1 ? 'es' : ''}
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        ${esAdmin ? `
                            <button onclick="exportarSolicitudesExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                                <i class="fas fa-file-excel"></i> Excel
                            </button>
                            <button onclick="exportarSolicitudesPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                        ` : ''}
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaSolicitudes('tabla')" class="px-3 py-1.5 text-sm ${vistaSolicitudesActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Tabla">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaSolicitudes('cards')" class="px-3 py-1.5 text-sm ${vistaSolicitudesActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Cards">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        <button onclick="abrirModalNuevaSolicitud()" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>Nueva Solicitud
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-orange-500">
                    <p class="text-2xl font-bold text-orange-600">${pendientes}</p>
                    <p class="text-xs text-gray-500">Pendientes</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${aprobadas}</p>
                    <p class="text-xs text-gray-500">Aprobadas</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-red-500">
                    <p class="text-2xl font-bold text-red-600">${rechazadas}</p>
                    <p class="text-xs text-gray-500">Rechazadas</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-blue-500">
                    <p class="text-2xl font-bold text-blue-600">${entregadas}</p>
                    <p class="text-xs text-gray-500">Entregadas</p>
                </div>
            </div>
            
            <!-- FILTROS AVANZADOS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosSolicitudesPanel()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosSolicitudesBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosSolicitudesIcon"></i>
                </div>
                <div id="panelFiltrosSolicitudes" class="p-4 hidden">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                            <select id="filtroEstado" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${estadoOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                            <select id="filtroCategoria" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${categoriaOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Urgencia</label>
                            <select id="filtroUrgencia" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${urgenciaOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
                            <input type="date" id="filtroFechaDesdeSolicitud" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
                            <input type="date" id="filtroFechaHastaSolicitud" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4 pt-3 border-t">
                        <div class="relative w-64">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="busquedaSolicitudes" placeholder="Buscar por número o título..." 
                                class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:border-primary">
                        </div>
                        <div class="flex gap-2">
                            <button onclick="aplicarFiltrosSolicitudes()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <i class="fas fa-search"></i> Aplicar filtros
                            </button>
                            <button onclick="limpiarFiltrosSolicitudes()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-undo-alt"></i> Limpiar
                            </button>
                        </div>
                    </div>
                    <div class="text-xs text-gray-400 mt-2 pt-2 border-t">
                        <i class="fas fa-info-circle"></i> 
                        Los filtros muestran solo valores existentes en tus solicitudes
                    </div>
                </div>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="solicitudesContainer">
                ${vistaSolicitudesActual === 'tabla' 
                    ? generarVistaTablaSolicitudes(solicitudes, esAdmin)
                    : generarVistaCardsSolicitudes(solicitudes, esAdmin)
                }
            </div>
        `;
        
        // Agregar paginación
        if (totalPaginasSolicitudes > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualSolicitudes - 1) * ITEMS_POR_PAGINA_SOLICITUDES) + 1} - ${Math.min(paginaActualSolicitudes * ITEMS_POR_PAGINA_SOLICITUDES, totalSolicitudesCount)} de ${totalSolicitudesCount} solicitudes
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaSolicitudes(${paginaActualSolicitudes - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualSolicitudes === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorSolicitudes()}
                        </div>
                        <button onclick="cambiarPaginaSolicitudes(${paginaActualSolicitudes + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualSolicitudes === totalPaginasSolicitudes ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Actualizar badge de filtros activos
        actualizarBadgeFiltrosSolicitudes();
        
        console.log('✅ Vista de solicitudes cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando solicitudes:', error);
        mostrarError('Error al cargar solicitudes: ' + error.message);
    }
}

// ==================== GENERAR VISTA CARDS SOLICITUDES ====================
function generarVistaCardsSolicitudes(solicitudes, esAdmin) {
    if (!solicitudes || solicitudes.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg col-span-full">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay solicitudes registradas</p>
                    <button onclick="abrirModalNuevaSolicitud()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nueva Solicitud
                    </button>
                </div>`;
    }
    
    const urgenciaColors = {
        'BAJA': 'bg-gray-100 text-gray-600',
        'MEDIA': 'bg-blue-100 text-blue-600',
        'ALTA': 'bg-orange-100 text-orange-600',
        'URGENTE': 'bg-red-100 text-red-600'
    };
    
    const estadoColors = {
        'PENDIENTE': 'bg-orange-100 text-orange-800',
        'APROBADO': 'bg-green-100 text-green-800',
        'RECHAZADO': 'bg-red-100 text-red-800',
        'ENTREGADO': 'bg-purple-100 text-purple-800'
    };
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${solicitudes.map(s => {
                const tiempo = calcularTiempoTranscurrido(s.creado_el);
                return `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start">
                                <div>
                                    <span class="text-xs font-mono text-gray-400">${s.numero || 'N/A'}</span>
                                    <h3 class="font-bold text-primary text-base line-clamp-1 mt-1">${s.titulo || 'Sin título'}</h3>
                                </div>
                                <span class="estado-badge ${estadoColors[s.estado] || 'bg-gray-100'} text-xs">
                                    ${s.estado || 'PENDIENTE'}
                                </span>
                            </div>
                        </div>
                        <div class="p-4 space-y-3">
                            <p class="text-sm text-gray-600 line-clamp-2">${s.descripcion || 'Sin descripción'}</p>
                            <div class="flex flex-wrap gap-2">
                                <span class="px-2 py-0.5 rounded-full text-xs ${urgenciaColors[s.urgencia] || 'bg-gray-100'}">
                                    <i class="fas fa-exclamation-circle"></i> ${s.urgencia || 'MEDIA'}
                                </span>
                                <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                    <i class="fas fa-tag"></i> ${s.categoria?.nombre || 'N/A'}
                                </span>
                                ${s.consumible ? `
                                    <span class="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-600">
                                        <i class="fas fa-box"></i> ${s.consumible.nombre}
                                    </span>
                                ` : ''}
                            </div>
                            <div class="flex items-center justify-between text-xs text-gray-400">
                                <div class="flex items-center gap-1">
                                    <i class="fas fa-boxes"></i>
                                    <span>Cant: ${s.cantidad_solicitada || 1}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <i class="far fa-clock"></i>
                                    <span>${tiempo}</span>
                                </div>
                            </div>
                        </div>
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2 bg-gray-50">
                            <button onclick="verDetalleSolicitud('${s.id}')" class="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            ${s.estado === 'PENDIENTE' ? `
                                <button onclick="editarSolicitud('${s.id}')" class="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button onclick="cancelarSolicitud('${s.id}')" class="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== GENERAR VISTA TABLA SOLICITUDES ====================
function generarVistaTablaSolicitudes(solicitudes, esAdmin) {
    if (!solicitudes || solicitudes.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay solicitudes registradas</p>
                    <button onclick="abrirModalNuevaSolicitud()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nueva Solicitud
                    </button>
                </div>`;
    }
    
    const urgenciaColors = {
        'BAJA': 'bg-gray-100 text-gray-700',
        'MEDIA': 'bg-blue-100 text-blue-700',
        'ALTA': 'bg-orange-100 text-orange-700',
        'URGENTE': 'bg-red-100 text-red-700'
    };
    
    const estadoColors = {
        'PENDIENTE': 'bg-orange-100 text-orange-800',
        'APROBADO': 'bg-green-100 text-green-800',
        'RECHAZADO': 'bg-red-100 text-red-800',
        'ENTREGADO': 'bg-purple-100 text-purple-800'
    };
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgencia</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${solicitudes.map(s => {
                            const tiempo = calcularTiempoTranscurrido(s.creado_el);
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-mono">${s.numero || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary max-w-xs truncate" title="${s.titulo}">${s.titulo || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${s.categoria?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${s.cantidad_solicitada || 1}${s.consumible?.nombre ? ` x ${s.consumible.nombre.substring(0, 20)}` : ''}</td>
                                    <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs ${urgenciaColors[s.urgencia] || 'bg-gray-100'}">${s.urgencia || 'MEDIA'}</span></td>
                                    <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs ${estadoColors[s.estado] || 'bg-gray-100'}">${s.estado || 'PENDIENTE'}</span></td>
                                    <td class="px-4 py-3 text-sm" title="${new Date(s.creado_el).toLocaleString()}">${tiempo}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="verDetalleSolicitud('${s.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${s.estado === 'PENDIENTE' ? `
                                            <button onclick="editarSolicitud('${s.id}')" class="text-primary hover:text-primary-dark p-1" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="cancelarSolicitud('${s.id}')" class="text-red-600 hover:text-red-800 p-1" title="Cancelar">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        ` : ''}
                                     </div>
                                  </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== ABRIR MODAL NUEVA SOLICITUD ====================
window.abrirModalNuevaSolicitud = async function(consumibleId = null, consumibleNombre = null) {
    const modal = document.getElementById('solicitudModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('solicitudModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    solicitudEditandoId = null;
    
    const form = document.getElementById('solicitudForm');
    if (form) form.reset();
    
    document.getElementById('solicitudModalTitle').innerText = 'Nueva Solicitud';
    
    // Ocultar sección de responsable inicialmente
    const responsableContainer = document.getElementById('responsable-container');
    if (responsableContainer) {
        responsableContainer.classList.add('hidden');
    }
    
    // Resetear indicadores
    const indicadorCambio = document.getElementById('responsable-cambiado-indicador');
    if (indicadorCambio) indicadorCambio.classList.add('hidden');
    
    const badgeSugerido = document.getElementById('responsable-sugerido-badge');
    if (badgeSugerido) badgeSugerido.classList.add('hidden');
    
    // Cargar categorías
    await cargarCategoriasParaSelect();
    
    // Cargar consumibles
    await cargarConsumiblesParaSelect();
    
    // Si se proporciona un consumible, precargarlo
    if (consumibleId) {
        setTimeout(() => {
            const selectConsumible = document.getElementById('solicitud_consumible_id');
            if (selectConsumible) {
                for (let i = 0; i < selectConsumible.options.length; i++) {
                    if (selectConsumible.options[i].value === consumibleId) {
                        selectConsumible.selectedIndex = i;
                        break;
                    }
                }
            }
            
            if (consumibleNombre) {
                document.getElementById('solicitud_titulo').value = `Reposición: ${consumibleNombre}`;
            }
        }, 500);
    }
    
    // Configurar evento change de categoría (después de cargar)
    setTimeout(() => {
        const categoriaSelect = document.getElementById('solicitud_categoria_id');
        if (categoriaSelect) {
            categoriaSelect.removeEventListener('change', handleCategoriaChange);
            categoriaSelect.addEventListener('change', handleCategoriaChange);
        }
        
        const btnCambiar = document.getElementById('btn-cambiar-responsable');
        if (btnCambiar) {
            btnCambiar.removeEventListener('click', handleCambiarResponsable);
            btnCambiar.addEventListener('click', handleCambiarResponsable);
        }
    }, 100);
    
    await window.abrirModal('solicitudModal');
};

// Funciones auxiliares
async function cargarCategoriasSolicitud() {
    const { data: categorias } = await window.supabaseClient
        .from('solicitud_categorias')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
    
    const select = document.getElementById('solicitud_categoria_id');
    if (select && categorias) {
        select.innerHTML = '<option value="">Seleccionar categoría</option>' +
            categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    }
}

async function cargarConsumiblesSelect() {
    const { data: consumibles } = await window.supabaseClient
        .from('consumibles')
        .select('id, nombre, codigo, stock_actual')
        .eq('activo', true)
        .order('nombre');
    
    const select = document.getElementById('solicitud_consumible_id');
    if (select && consumibles) {
        select.innerHTML = '<option value="">Ninguno (describir en detalle)</option>' +
            consumibles.map(c => `<option value="${c.id}">${c.nombre} (${c.codigo || 'Sin código'}) - Stock: ${c.stock_actual}</option>`).join('');
    }
}

async function obtenerResponsableSugerido(categoriaId, solicitanteId) {
    // 1. Obtener configuración de la categoría
    const { data: categoria } = await window.supabaseClient
        .from('solicitud_categorias')
        .select('responsable_sugerido_id, regla_sugerencia')
        .eq('id', categoriaId)
        .single();
    
    // 2. Si la regla es por área, buscar responsable según área del solicitante
    if (categoria.regla_sugerencia === 'area') {
        // Obtener área del solicitante
        const { data: usuario } = await window.supabaseClient
            .from('usuarios')
            .select('empleado_id')
            .eq('id', solicitanteId)
            .single();
        
        if (usuario?.empleado_id) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('area_id')
                .eq('id', usuario.empleado_id)
                .single();
            
            if (empleado?.area_id) {
                // Buscar responsable para esa área
                const { data: responsable } = await window.supabaseClient
                    .from('solicitud_categoria_responsables')
                    .select('usuario_id')
                    .eq('categoria_id', categoriaId)
                    .eq('area_id', empleado.area_id)
                    .eq('activo', true)
                    .maybeSingle();
                
                if (responsable) return responsable.usuario_id;
            }
        }
    }
    
    // 3. Fallback: usar responsable sugerido por defecto
    return categoria.responsable_sugerido_id;
}

async function cargarResponsablesDisponibles(categoriaId) {
    // Obtener todos los responsables para esta categoría
    const { data: responsables, error } = await window.supabaseClient
        .from('solicitud_categoria_responsables')
        .select(`
            usuario_id,
            usuarios:usuario_id (id, correo, empleado_id),
            es_principal,
            area_id
        `)
        .eq('categoria_id', categoriaId)
        .eq('activo', true)
        .order('orden');
    
    if (error) throw error;
    
    // Enriquecer con nombres de empleados
    const responsablesConNombre = [];
    for (const r of responsables) {
        let nombre = r.usuarios?.correo || 'Usuario';
        if (r.usuarios?.empleado_id) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('nombre_completo, puesto')
                .eq('id', r.usuarios.empleado_id)
                .single();
            if (empleado) {
                nombre = `${empleado.nombre_completo} (${empleado.puesto || r.usuarios.correo})`;
            }
        }
        responsablesConNombre.push({
            id: r.usuario_id,
            nombre: nombre,
            es_principal: r.es_principal
        });
    }
    
    return responsablesConNombre;
}

// ==================== FUNCIONES ADICIONALES PARA SOLICITUDES ====================

// Ver detalle solicitud
window.verDetalleSolicitud = async function(id) {
    mostrarLoading('Cargando detalles...');
    
    try {
        const { data: solicitud, error } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Obtener aprobaciones
        const { data: aprobaciones } = await window.supabaseClient
            .from('solicitud_aprobaciones')
            .select('*, aprobador:aprobador_id(id, correo)')
            .eq('solicitud_id', id);
        
        // Obtener historial
        const { data: historial } = await window.supabaseClient
            .from('solicitud_historial')
            .select('*')
            .eq('solicitud_id', id)
            .order('fecha_cambio', { ascending: false });
        
        ocultarLoading();
        
        const aprobacionHtml = aprobaciones?.map(a => `
            <div class="flex justify-between items-center py-2 border-b">
                <div>
                    <span class="font-medium">${a.aprobador?.correo || 'Usuario'}</span>
                    <span class="text-xs ${a.estado === 'APROBADO' ? 'text-green-600' : 'text-red-600'} ml-2">${a.estado}</span>
                </div>
                <div class="text-xs text-gray-400">${new Date(a.fecha_aprobacion).toLocaleString()}</div>
                ${a.comentario ? `<div class="col-span-2 text-xs text-gray-500 mt-1">${a.comentario}</div>` : ''}
            </div>
        `).join('') || '<p class="text-gray-400">Sin aprobaciones</p>';
        
        const historialHtml = historial?.map(h => `
            <div class="flex justify-between items-center text-sm py-1 border-b">
                <span>${h.estado_anterior || 'Inicio'} → ${h.estado_nuevo}</span>
                <span class="text-xs text-gray-400">${new Date(h.fecha_cambio).toLocaleString()}</span>
            </div>
        `).join('') || '<p class="text-gray-400">Sin historial</p>';
        
        const urgenciaClass = {
            'BAJA': 'bg-gray-100 text-gray-700',
            'MEDIA': 'bg-blue-100 text-blue-700',
            'ALTA': 'bg-orange-100 text-orange-700',
            'URGENTE': 'bg-red-100 text-red-700'
        }[solicitud.urgencia] || 'bg-gray-100';
        
        const estadoClass = {
            'PENDIENTE': 'bg-orange-100 text-orange-800',
            'APROBADO': 'bg-green-100 text-green-800',
            'RECHAZADO': 'bg-red-100 text-red-800',
            'COMPRADO': 'bg-blue-100 text-blue-800',
            'ENTREGADO': 'bg-purple-100 text-purple-800'
        }[solicitud.estado] || 'bg-gray-100';
        
        Swal.fire({
            title: `<span class="text-primary">${solicitud.titulo}</span>`,
            width: '700px',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div class="flex justify-between items-center">
                        <span class="estado-badge ${estadoClass}">${solicitud.estado}</span>
                        <span class="estado-badge ${urgenciaClass}">${solicitud.urgencia}</span>
                    </div>
                    
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm">${solicitud.descripcion || 'Sin descripción'}</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div><span class="font-semibold">N° Solicitud:</span> ${solicitud.numero || 'N/A'}</div>
                        <div><span class="font-semibold">Categoría:</span> ${solicitud.categoria?.nombre || 'N/A'}</div>
                        <div><span class="font-semibold">Cantidad:</span> ${solicitud.cantidad_solicitada}</div>
                        <div><span class="font-semibold">Consumible:</span> ${solicitud.consumible?.nombre || 'No especificado'}</div>
                        <div><span class="font-semibold">Solicitante:</span> ${solicitud.solicitante?.correo || 'N/A'}</div>
                        <div><span class="font-semibold">Fecha:</span> ${new Date(solicitud.creado_el).toLocaleString()}</div>
                        ${solicitud.fecha_requerida ? `<div class="col-span-2"><span class="font-semibold">Fecha requerida:</span> ${new Date(solicitud.fecha_requerida).toLocaleDateString()}</div>` : ''}
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">📋 Aprobaciones</h4>
                        <div class="bg-gray-50 p-2 rounded-lg max-h-32 overflow-y-auto">
                            ${aprobacionHtml}
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">📜 Historial</h4>
                        <div class="bg-gray-50 p-2 rounded-lg max-h-32 overflow-y-auto">
                            ${historialHtml}
                        </div>
                    </div>
                </div>
            `,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles', 'error');
    }
};

// Editar solicitud
window.editarSolicitud = async function(id) {
    mostrarLoading('Cargando solicitud...');
    
    try {
        const { data: solicitud, error } = await window.supabaseClient
            .from('solicitudes')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        solicitudEditandoId = id;
        
        document.getElementById('solicitudModalTitle').innerText = 'Editar Solicitud';
        document.getElementById('solicitud_titulo').value = solicitud.titulo || '';
        document.getElementById('solicitud_descripcion').value = solicitud.descripcion || '';
        document.getElementById('solicitud_cantidad').value = solicitud.cantidad_solicitada || 1;
        document.getElementById('solicitud_urgencia').value = solicitud.urgencia || 'MEDIA';
        document.getElementById('solicitud_fecha_requerida').value = solicitud.fecha_requerida || '';
        
        await cargarCategoriasSolicitud();
        document.getElementById('solicitud_categoria_id').value = solicitud.categoria_id || '';
        
        await cargarConsumiblesSelect();
        document.getElementById('solicitud_consumible_id').value = solicitud.consumible_id || '';
        
        ocultarLoading();
        await window.abrirModal('solicitudModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la solicitud', 'error');
    }
};

// Cancelar solicitud
window.cancelarSolicitud = async function(id) {
    const result = await Swal.fire({
        title: '¿Cancelar solicitud?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Cancelando...');
        
        try {
            const fechaLocal = getFechaLocalForDB();
            
            // Actualizar estado
            const { error } = await window.supabaseClient
                .from('solicitudes')
                .update({
                    estado: 'RECHAZADO',
                    modificado_el: fechaLocal
                })
                .eq('id', id);
            
            if (error) throw error;
            
            // Registrar historial
            await window.supabaseClient
                .from('solicitud_historial')
                .insert({
                    solicitud_id: id,
                    estado_anterior: 'PENDIENTE',
                    estado_nuevo: 'RECHAZADO',
                    comentario: 'Cancelada por el solicitante',
                    usuario_id: usuarioActual.id,
                    fecha_cambio: fechaLocal
                });
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Solicitud cancelada', 'success');
            await cargarVistaSolicitudes();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo cancelar la solicitud', 'error');
        }
    }
};

// ==================== GUARDAR SOLICITUD (VERSIÓN COMPLETA) ====================
window.guardarSolicitud = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando solicitud...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const categoriaId = document.getElementById('solicitud_categoria_id').value;
        const responsableId = document.getElementById('solicitud_responsable_id').value;
        const titulo = document.getElementById('solicitud_titulo').value.trim();
        const descripcion = document.getElementById('solicitud_descripcion').value.trim();
        
        // ============================================
        // VALIDACIONES
        // ============================================
        
        if (!categoriaId) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una categoría', 'error');
            document.getElementById('solicitud_categoria_id').focus();
            return;
        }
        
        if (!responsableId) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un responsable', 'error');
            document.getElementById('solicitud_responsable_id').focus();
            return;
        }
        
        if (!titulo) {
            ocultarLoading();
            mostrarAlerta('Error', 'El título es obligatorio', 'error');
            document.getElementById('solicitud_titulo').focus();
            return;
        }
        
        if (!descripcion) {
            ocultarLoading();
            mostrarAlerta('Error', 'La descripción es obligatoria', 'error');
            document.getElementById('solicitud_descripcion').focus();
            return;
        }
        
        const fechaLocal = getFechaLocalForDB();
        
        // ============================================
        // OBTENER INFORMACIÓN DE RESPONSABLES
        // ============================================
        
        // Obtener responsable sugerido original (para auditoría)
        let responsableSugeridoId = null;
        let responsableCambiado = false;
        let responsableSugeridoNombre = null;
        let responsableSeleccionadoNombre = null;
        
        // Obtener nombre del responsable seleccionado
        const responsableSelect = document.getElementById('solicitud_responsable_id');
        const selectedOption = responsableSelect.options[responsableSelect.selectedIndex];
        responsableSeleccionadoNombre = selectedOption?.text || 'Usuario';
        
        if (responsableSugeridoGlobal) {
            responsableSugeridoId = responsableSugeridoGlobal;
            responsableCambiado = (responsableId !== responsableSugeridoGlobal);
            
            // Obtener nombre del responsable sugerido
            const sugeridoOption = Array.from(responsableSelect.options).find(opt => opt.value === responsableSugeridoGlobal);
            responsableSugeridoNombre = sugeridoOption?.text || 'Responsable sugerido';
        }
        
        // ============================================
        // PREPARAR DATOS DE LA SOLICITUD
        // ============================================
        
        const data = {
            titulo: titulo,
            descripcion: descripcion,
            categoria_id: categoriaId,
            consumible_id: document.getElementById('solicitud_consumible_id').value || null,
            cantidad_solicitada: parseInt(document.getElementById('solicitud_cantidad').value) || 1,
            urgencia: document.getElementById('solicitud_urgencia').value,
            fecha_requerida: document.getElementById('solicitud_fecha_requerida').value || null,
            estado: 'PENDIENTE',
            solicitante_id: usuarioActual.id,
            responsable_seleccionado_id: responsableId,
            responsable_sugerido_id: responsableSugeridoId,
            responsable_cambiado: responsableCambiado
        };
        
        let solicitudId = null;
        let numeroSolicitud = null;
        
        // ============================================
        // GUARDAR EN BASE DE DATOS
        // ============================================
        
        if (solicitudEditandoId) {
            // MODO EDICIÓN
            data.modificado_el = fechaLocal;
            
            const { error } = await window.supabaseClient
                .from('solicitudes')
                .update(data)
                .eq('id', solicitudEditandoId);
            
            if (error) throw error;
            solicitudId = solicitudEditandoId;
            
            // Obtener número de solicitud existente
            const { data: solicitudExistente } = await window.supabaseClient
                .from('solicitudes')
                .select('numero')
                .eq('id', solicitudEditandoId)
                .single();
            numeroSolicitud = solicitudExistente?.numero;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Solicitud actualizada correctamente', 'success');
            
        } else {
            // MODO CREACIÓN
            // Generar número de solicitud
            const { data: ultimo } = await window.supabaseClient
                .from('solicitudes')
                .select('numero')
                .order('creado_el', { ascending: false })
                .limit(1);
            
            let nuevoNumero = 'SOL-0001';
            if (ultimo && ultimo.length > 0 && ultimo[0].numero) {
                const num = parseInt(ultimo[0].numero.split('-')[1]) + 1;
                nuevoNumero = `SOL-${num.toString().padStart(4, '0')}`;
            }
            data.numero = nuevoNumero;
            numeroSolicitud = nuevoNumero;
            data.creado_el = fechaLocal;
            
            const { data: nuevaSolicitud, error } = await window.supabaseClient
                .from('solicitudes')
                .insert(data)
                .select()
                .single();
            
            if (error) throw error;
            solicitudId = nuevaSolicitud.id;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Solicitud ${nuevoNumero} creada correctamente`, 'success');
        }
        
        // ============================================
        // REGISTRAR EN HISTORIAL
        // ============================================
        
        await registrarHistorialSolicitud({
            solicitud_id: solicitudId,
            accion: solicitudEditandoId ? 'EDICION' : 'CREACION',
            estado_anterior: null,
            estado_nuevo: 'PENDIENTE',
            comentario: `Solicitud ${solicitudEditandoId ? 'editada' : 'creada'} por ${usuarioActual.correo}`,
            usuario_id: usuarioActual.id,
            fecha: fechaLocal,
            metadata: {
                responsable_seleccionado_id: responsableId,
                responsable_sugerido_id: responsableSugeridoId,
                responsable_cambiado: responsableCambiado,
                categoria_id: categoriaId,
                urgencia: data.urgencia
            }
        });
        
        // Si se cambió el responsable, registrar ese cambio específicamente
        if (responsableCambiado && !solicitudEditandoId) {
            await registrarHistorialSolicitud({
                solicitud_id: solicitudId,
                accion: 'CAMBIO_RESPONSABLE',
                estado_anterior: null,
                estado_nuevo: null,
                comentario: `El responsable fue cambiado de "${responsableSugeridoNombre}" a "${responsableSeleccionadoNombre}"`,
                usuario_id: usuarioActual.id,
                fecha: fechaLocal,
                metadata: {
                    responsable_anterior_id: responsableSugeridoId,
                    responsable_nuevo_id: responsableId
                }
            });
        }
        
        // ============================================
        // ENVIAR NOTIFICACIONES
        // ============================================
        
        // 1. Notificar al responsable asignado
        await enviarNotificacionResponsable({
            responsableId: responsableId,
            titulo: titulo,
            numeroSolicitud: numeroSolicitud,
            solicitudId: solicitudId,
            urgencia: data.urgencia,
            categoriaId: categoriaId,
            solicitanteNombre: usuarioActual.empleados?.nombre_completo || usuarioActual.correo
        });
        
        // 2. Notificar al solicitante (confirmación)
        await enviarNotificacionSolicitante({
            solicitanteId: usuarioActual.id,
            titulo: titulo,
            numeroSolicitud: numeroSolicitud,
            responsableNombre: responsableSeleccionadoNombre,
            urgencia: data.urgencia
        });
        
        // 3. Si el responsable es diferente al sugerido, notificar también al administrador (opcional)
        if (responsableCambiado) {
            await notificarCambioResponsableAdministrador({
                solicitudId: solicitudId,
                numeroSolicitud: numeroSolicitud,
                solicitanteNombre: usuarioActual.empleados?.nombre_completo || usuarioActual.correo,
                responsableSugeridoNombre: responsableSugeridoNombre,
                responsableSeleccionadoNombre: responsableSeleccionadoNombre
            });
        }
        
        // ============================================
        // LIMPIAR VARIABLES GLOBALES Y CERRAR
        // ============================================
        
        cerrarModal('solicitudModal');
        solicitudEditandoId = null;
        responsableSugeridoGlobal = null;
        window.responsableCambiado = false;
        
        // Recargar la vista actual
        if (vistaActual === 'solicitudes') {
            await cargarVistaSolicitudes();
        } else if (typeof cargarVistaSolicitudes === 'function') {
            await cargarVistaSolicitudes();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en guardarSolicitud:', error);
        
        let mensajeError = 'No se pudo guardar la solicitud';
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe una solicitud con este número';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

// Cargar vista de solicitudes pendientes (solo admin)
window.cargarVistaSolicitudesPendientes = async function() {
    mostrarLoading('Cargando solicitudes pendientes...');
    
    try {
        const { data: solicitudes, error } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `)
            .eq('estado', 'PENDIENTE')
            .order('urgencia', { ascending: false })
            .order('creado_el', { ascending: true });
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                    <i class="fas fa-clock"></i> Solicitudes Pendientes de Aprobación
                </h1>
                <p class="text-gray-500 text-sm mt-1">Revisa y aprueba o rechaza las solicitudes de los usuarios</p>
            </div>
            
            <div class="grid gap-4">
                ${solicitudes?.map(s => {
                    const urgenciaClass = {
                        'BAJA': 'border-l-gray-400',
                        'MEDIA': 'border-l-blue-400',
                        'ALTA': 'border-l-orange-400',
                        'URGENTE': 'border-l-red-400'
                    }[s.urgencia] || 'border-l-gray-400';
                    
                    return `
                        <div class="bg-white rounded-xl shadow-sm border-l-4 ${urgenciaClass} p-4">
                            <div class="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                    <h3 class="font-bold text-primary">${s.titulo}</h3>
                                    <p class="text-sm text-gray-600 mt-1">${s.descripcion?.substring(0, 100)}${s.descripcion?.length > 100 ? '...' : ''}</p>
                                    <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                                        <span><i class="fas fa-user"></i> ${s.solicitante?.correo || 'N/A'}</span>
                                        <span><i class="fas fa-tag"></i> ${s.categoria?.nombre || 'N/A'}</span>
                                        <span><i class="fas fa-box"></i> ${s.cantidad_solicitada} unidad(es)</span>
                                        ${s.consumible?.nombre ? `<span><i class="fas fa-boxes"></i> ${s.consumible.nombre}</span>` : ''}
                                        <span><i class="fas fa-calendar"></i> ${new Date(s.creado_el).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="aprobarSolicitud('${s.id}')" class="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                                        <i class="fas fa-check"></i> Aprobar
                                    </button>
                                    <button onclick="rechazarSolicitud('${s.id}')" class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                                        <i class="fas fa-times"></i> Rechazar
                                    </button>
                                    <button onclick="verDetalleSolicitud('${s.id}')" class="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm">
                                        <i class="fas fa-eye"></i> Ver
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${(!solicitudes || solicitudes.length === 0) ? '<div class="text-center py-12 bg-white rounded-lg"><i class="fas fa-check-circle text-4xl text-green-500 mb-2"></i><p>No hay solicitudes pendientes</p></div>' : ''}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar solicitudes pendientes: ' + error.message);
    }
};

window.cargarVistaSolicitudesTodas = async function() {
    mostrarLoading('Cargando todas las solicitudes...');
    
    try {
        const { data: solicitudes, error } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `)
            .order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                    <i class="fas fa-list-alt"></i> Todas las Solicitudes
                </h1>
                <p class="text-gray-500 text-sm mt-1">Historial completo de solicitudes</p>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgencia</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </td>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${solicitudes?.map(s => {
                                const urgenciaClass = {
                                    'BAJA': 'bg-gray-100 text-gray-700',
                                    'MEDIA': 'bg-blue-100 text-blue-700',
                                    'ALTA': 'bg-orange-100 text-orange-700',
                                    'URGENTE': 'bg-red-100 text-red-700'
                                }[s.urgencia] || 'bg-gray-100';
                                
                                const estadoClass = {
                                    'PENDIENTE': 'bg-orange-100 text-orange-800',
                                    'APROBADO': 'bg-green-100 text-green-800',
                                    'RECHAZADO': 'bg-red-100 text-red-800',
                                    'COMPRADO': 'bg-blue-100 text-blue-800',
                                    'ENTREGADO': 'bg-purple-100 text-purple-800'
                                }[s.estado] || 'bg-gray-100';
                                
                                return `
                                    <tr>
                                        <td class="px-4 py-3 text-sm font-mono">${s.numero || 'N/A'}</td>
                                        <td class="px-4 py-3 text-sm font-medium text-primary">${s.titulo}</td>
                                        <td class="px-4 py-3 text-sm">${s.solicitante?.correo || 'N/A'}</td>
                                        <td class="px-4 py-3 text-sm">${s.cantidad_solicitada}</td>
                                        <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs ${urgenciaClass}">${s.urgencia}</span></td>
                                        <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs ${estadoClass}">${s.estado}</span></td>
                                        <td class="px-4 py-3 text-sm">${new Date(s.creado_el).toLocaleDateString()}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <button onclick="verDetalleSolicitud('${s.id}')" class="text-blue-600 hover:text-blue-800" title="Ver detalles"><i class="fas fa-eye"></i></button>
                                            ${s.estado === 'PENDIENTE' ? `
                                                <button onclick="aprobarSolicitud('${s.id}')" class="text-green-600 hover:text-green-800 ml-2" title="Aprobar"><i class="fas fa-check"></i></button>
                                                <button onclick="rechazarSolicitud('${s.id}')" class="text-red-600 hover:text-red-800 ml-2" title="Rechazar"><i class="fas fa-times"></i></button>
                                            ` : ''}
                                         </div>
                                     </td>
                                 </tr>
                                `;
                            }).join('')}
                            ${(!solicitudes || solicitudes.length === 0) ? `
                                <tr><td colspan="8" class="text-center py-8 text-gray-500">No hay solicitudes registradas</td></tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar solicitudes: ' + error.message);
    }
};

// ==================== APROBAR SOLICITUD ====================
window.aprobarSolicitud = async function(id) {
    console.log('📝 Aprobando solicitud:', id);
    
    try {
        // Obtener información de la solicitud
        const { data: solicitud, error: getError } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                solicitante:solicitante_id (id, correo)
            `)
            .eq('id', id)
            .single();
        
        if (getError) {
            console.error('Error obteniendo solicitud:', getError);
            mostrarAlerta('Error', 'No se pudo obtener la solicitud', 'error');
            return;
        }
        
        // Mostrar modal de confirmación
        const { value: comentario } = await Swal.fire({
            title: 'Aprobar solicitud',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>Solicitud:</strong> ${solicitud.numero}</p>
                        <p><strong>Título:</strong> ${solicitud.titulo}</p>
                        <p><strong>Solicitante:</strong> ${solicitud.solicitante?.correo || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Comentario (opcional)</label>
                        <textarea id="comentario-aprobacion" class="form-input w-full" rows="2" placeholder="Ej: Aprobado, proceder con la compra..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: '✅ Aprobar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return document.getElementById('comentario-aprobacion')?.value || null;
            }
        });
        
        if (comentario !== undefined) {
            mostrarLoading('Procesando aprobación...');
            
            const fechaLocal = getFechaLocalForDB();
            
            // 1. Actualizar estado de la solicitud
            const { error: updateError } = await window.supabaseClient
                .from('solicitudes')
                .update({
                    estado: 'APROBADO',
                    modificado_el: fechaLocal,
                    comentario_aprobacion: comentario,
                    fecha_aprobacion: fechaLocal
                })
                .eq('id', id);
            
            if (updateError) throw updateError;
            
            // 2. Registrar en tabla de aprobaciones (si existe)
            try {
                await window.supabaseClient
                    .from('solicitud_aprobaciones')
                    .insert({
                        solicitud_id: id,
                        aprobador_id: usuarioActual.id,
                        estado: 'APROBADO',
                        comentario: comentario,
                        fecha_aprobacion: fechaLocal
                    });
            } catch (e) {
                console.log('Tabla solicitud_aprobaciones no existe, omitiendo...');
            }
            
            // 3. Registrar historial
            try {
                await registrarHistorialSolicitud({
                    solicitud_id: id,
                    accion: 'APROBACION',
                    estado_anterior: solicitud.estado,
                    estado_nuevo: 'APROBADO',
                    comentario: comentario,
                    usuario_id: usuarioActual.id,
                    fecha: fechaLocal
                });
            } catch (e) {
                console.log('Error registrando historial:', e);
            }
            
            // 4. Enviar notificación
            try {
                await enviarNotificacionAprobacion({
                    solicitanteId: solicitud.solicitante_id,
                    numeroSolicitud: solicitud.numero,
                    titulo: solicitud.titulo,
                    comentario: comentario,
                    aprobadorNombre: usuarioActual.empleados?.nombre_completo || usuarioActual.correo
                });
            } catch (e) {
                console.log('Error enviando notificación:', e);
            }
            
            ocultarLoading();
            
            await Swal.fire({
                title: '✅ Solicitud aprobada',
                html: `<div class="text-left">
                    <p>La solicitud ${solicitud.numero} ha sido aprobada correctamente.</p>
                    ${comentario ? `<p class="text-sm text-gray-500 mt-2"><strong>Comentario:</strong> ${comentario}</p>` : ''}
                </div>`,
                icon: 'success',
                confirmButtonColor: '#28a745'
            });
            
            // Recargar la vista actual
            if (typeof cargarVistaSolicitudesAsignadas === 'function') {
                await cargarVistaSolicitudesAsignadas();
            } else if (typeof cargarVistaSolicitudes === 'function') {
                await cargarVistaSolicitudes();
            } else {
                window.location.reload();
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en aprobarSolicitud:', error);
        mostrarAlerta('Error', 'No se pudo aprobar la solicitud: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== RECHAZAR SOLICITUD ====================
window.rechazarSolicitud = async function(id) {
    console.log('📝 Rechazando solicitud:', id);
    
    try {
        // Obtener información de la solicitud
        const { data: solicitud, error: getError } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                solicitante:solicitante_id (id, correo)
            `)
            .eq('id', id)
            .single();
        
        if (getError) {
            console.error('Error obteniendo solicitud:', getError);
            mostrarAlerta('Error', 'No se pudo obtener la solicitud', 'error');
            return;
        }
        
        // Mostrar modal para motivo de rechazo
        const { value: motivo } = await Swal.fire({
            title: 'Rechazar solicitud',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>Solicitud:</strong> ${solicitud.numero}</p>
                        <p><strong>Título:</strong> ${solicitud.titulo}</p>
                        <p><strong>Solicitante:</strong> ${solicitud.solicitante?.correo || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Motivo del rechazo <span class="text-red-500">*</span></label>
                        <textarea id="motivo-rechazo" class="form-input w-full" rows="3" placeholder="Indique el motivo por el cual se rechaza esta solicitud..." required></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: '❌ Rechazar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const motivoTexto = document.getElementById('motivo-rechazo')?.value;
                if (!motivoTexto || motivoTexto.trim() === '') {
                    Swal.showValidationMessage('Debe ingresar un motivo de rechazo');
                    return false;
                }
                return motivoTexto;
            }
        });
        
        if (motivo) {
            mostrarLoading('Procesando rechazo...');
            
            const fechaLocal = getFechaLocalForDB();
            
            // 1. Actualizar estado de la solicitud
            const { error: updateError } = await window.supabaseClient
                .from('solicitudes')
                .update({
                    estado: 'RECHAZADO',
                    modificado_el: fechaLocal,
                    comentario_rechazo: motivo,
                    fecha_rechazo: fechaLocal
                })
                .eq('id', id);
            
            if (updateError) throw updateError;
            
            // 2. Registrar en tabla de aprobaciones (si existe)
            try {
                await window.supabaseClient
                    .from('solicitud_aprobaciones')
                    .insert({
                        solicitud_id: id,
                        aprobador_id: usuarioActual.id,
                        estado: 'RECHAZADO',
                        comentario: motivo,
                        fecha_aprobacion: fechaLocal
                    });
            } catch (e) {
                console.log('Tabla solicitud_aprobaciones no existe, omitiendo...');
            }
            
            // 3. Registrar historial
            try {
                await registrarHistorialSolicitud({
                    solicitud_id: id,
                    accion: 'RECHAZO',
                    estado_anterior: solicitud.estado,
                    estado_nuevo: 'RECHAZADO',
                    comentario: motivo,
                    usuario_id: usuarioActual.id,
                    fecha: fechaLocal
                });
            } catch (e) {
                console.log('Error registrando historial:', e);
            }
            
            // 4. Enviar notificación
            try {
                await enviarNotificacionRechazo({
                    solicitanteId: solicitud.solicitante_id,
                    numeroSolicitud: solicitud.numero,
                    titulo: solicitud.titulo,
                    motivo: motivo,
                    rechazadorNombre: usuarioActual.empleados?.nombre_completo || usuarioActual.correo
                });
            } catch (e) {
                console.log('Error enviando notificación:', e);
            }
            
            ocultarLoading();
            
            await Swal.fire({
                title: '❌ Solicitud rechazada',
                html: `<div class="text-left">
                    <p>La solicitud ${solicitud.numero} ha sido rechazada.</p>
                    <p class="text-sm text-red-600 mt-2"><strong>Motivo:</strong> ${motivo}</p>
                </div>`,
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            
            // Recargar la vista actual
            if (typeof cargarVistaSolicitudesAsignadas === 'function') {
                await cargarVistaSolicitudesAsignadas();
            } else if (typeof cargarVistaSolicitudes === 'function') {
                await cargarVistaSolicitudes();
            } else {
                window.location.reload();
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en rechazarSolicitud:', error);
        mostrarAlerta('Error', 'No se pudo rechazar la solicitud: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== MARCAR COMO ENTREGADO ====================
window.marcarComoEntregado = async function(id) {
    console.log('📦 Marcando como entregado:', id);
    
    try {
        const { value: observacion } = await Swal.fire({
            title: 'Marcar como entregado',
            html: `
                <div class="text-left space-y-4">
                    <p>¿Confirmar que esta solicitud ha sido entregada?</p>
                    <div>
                        <label class="form-label font-medium text-gray-700">Observación (opcional)</label>
                        <textarea id="observacion-entrega" class="form-input w-full" rows="2" placeholder="Ej: Entregado el día..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: '✅ Confirmar entrega',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return document.getElementById('observacion-entrega')?.value || null;
            }
        });
        
        if (observacion !== undefined) {
            mostrarLoading('Actualizando...');
            
            const fechaLocal = getFechaLocalForDB();
            
            const { error } = await window.supabaseClient
                .from('solicitudes')
                .update({
                    estado: 'ENTREGADO',
                    modificado_el: fechaLocal,
                    fecha_entrega: fechaLocal,
                    observacion_entrega: observacion
                })
                .eq('id', id);
            
            if (error) throw error;
            
            // Registrar historial
            try {
                await registrarHistorialSolicitud({
                    solicitud_id: id,
                    accion: 'ENTREGA',
                    estado_anterior: 'APROBADO',
                    estado_nuevo: 'ENTREGADO',
                    comentario: observacion,
                    usuario_id: usuarioActual.id,
                    fecha: fechaLocal
                });
            } catch (e) {
                console.log('Error registrando historial:', e);
            }
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Solicitud marcada como entregada', 'success');
            
            // Recargar la vista
            if (typeof cargarVistaSolicitudesAsignadas === 'function') {
                await cargarVistaSolicitudesAsignadas();
            } else if (typeof cargarVistaSolicitudes === 'function') {
                await cargarVistaSolicitudes();
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo actualizar', 'error');
    }
};

// ==================== CONFIGURAR RESPONSABLES DE SOLICITUDES ====================
async function cargarVistaConfigurarResponsablesSolicitudes() {
    mostrarLoading('Cargando configuración de responsables...');
    
    try {
        // Verificar permisos (solo administrador)
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        // Obtener todas las categorías de solicitud
        const { data: categorias, error } = await window.supabaseClient
            .from('solicitud_categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        // Obtener todos los usuarios con rol de aprobador/responsable
        const { data: roles } = await window.supabaseClient
            .from('roles')
            .select('id, nombre')
            .in('nombre', ['ADMINISTRADOR', 'OPERADOR_EMPRESA']);
        
        const rolesIds = roles?.map(r => r.id) || [];
        
        const { data: usuariosPotenciales } = await window.supabaseClient
            .from('usuarios')
            .select(`
                id,
                correo,
                empleado_id,
                empleados:empleado_id (
                    id,
                    nombre_completo,
                    puesto,
                    area_id,
                    areas:area_id (id, nombre)
                )
            `)
            .in('rol_id', rolesIds)
            .eq('activo', true)
            .order('correo');
        
        // Obtener todas las áreas
        const { data: areas } = await window.supabaseClient
            .from('areas')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        // Obtener asignaciones existentes
        const { data: asignacionesExistentes } = await window.supabaseClient
            .from('solicitud_categoria_responsables')
            .select('*');
        
        // Crear mapa de asignaciones por categoría
        const asignacionesPorCategoria = new Map();
        asignacionesExistentes?.forEach(asig => {
            if (!asignacionesPorCategoria.has(asig.categoria_id)) {
                asignacionesPorCategoria.set(asig.categoria_id, []);
            }
            asignacionesPorCategoria.get(asig.categoria_id).push(asig);
        });
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-user-tag"></i> Configurar Responsables de Solicitudes
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Asigna qué usuarios son responsables de aprobar solicitudes por categoría
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Instrucciones -->
            <div class="bg-blue-50 rounded-lg p-4 mb-6 border-l-4 border-blue-500">
                <div class="flex items-start gap-3">
                    <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div class="text-sm text-blue-800">
                        <p class="font-semibold mb-1">¿Cómo funciona la asignación de responsables?</p>
                        <ul class="list-disc list-inside space-y-1">
                            <li>Cada categoría puede tener múltiples responsables</li>
                            <li>El <strong>responsable sugerido</strong> es el que aparece por defecto al crear una solicitud</li>
                            <li>Puedes definir reglas de sugerencia (por área del solicitante, fijo, etc.)</li>
                            <li>Los responsables alternativos estarán disponibles para que el solicitante pueda cambiar manualmente</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Grid de categorías -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                ${categorias.map(cat => `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                        <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                            <h3 class="font-semibold text-primary flex items-center gap-2">
                                <i class="${cat.icono || 'fas fa-tag'}"></i>
                                ${cat.nombre}
                            </h3>
                            <p class="text-xs text-gray-400 mt-1">${cat.descripcion || 'Sin descripción'}</p>
                        </div>
                        <div class="p-4 space-y-4">
                            <!-- Regla de sugerencia -->
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    <i class="fas fa-robot"></i> Regla de sugerencia
                                </label>
                                <select id="regla_${cat.id}" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" onchange="cambiarReglaSugerencia('${cat.id}')">
                                    <option value="fijo" ${cat.regla_sugerencia === 'fijo' ? 'selected' : ''}>📌 Fijo (siempre el mismo responsable)</option>
                                    <option value="area" ${cat.regla_sugerencia === 'area' ? 'selected' : ''}>🏢 Por área del solicitante</option>
                                    <option value="aleatorio" ${cat.regla_sugerencia === 'aleatorio' ? 'selected' : ''}>🎲 Aleatorio (balanceo de carga)</option>
                                </select>
                            </div>
                            
                            <!-- Responsable sugerido (principal) -->
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    <i class="fas fa-star text-yellow-500"></i> Responsable sugerido (principal)
                                </label>
                                <select id="responsable_principal_${cat.id}" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" onchange="guardarResponsablePrincipal('${cat.id}')">
                                    <option value="">Seleccionar responsable</option>
                                    ${usuariosPotenciales?.map(u => {
                                        const nombre = u.empleados?.nombre_completo || u.correo;
                                        const puesto = u.empleados?.puesto ? ` (${u.empleados.puesto})` : '';
                                        const seleccionado = cat.responsable_sugerido_id === u.id ? 'selected' : '';
                                        return `<option value="${u.id}" ${seleccionado}>${nombre}${puesto} - ${u.correo}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            
                            <!-- Responsables alternativos -->
                            <div>
                                <div class="flex justify-between items-center mb-2">
                                    <label class="block text-xs font-medium text-gray-700">
                                        <i class="fas fa-users"></i> Responsables alternativos
                                    </label>
                                    <button onclick="agregarResponsableAlternativo('${cat.id}')" class="text-xs text-primary hover:underline flex items-center gap-1">
                                        <i class="fas fa-plus-circle"></i> Agregar
                                    </button>
                                </div>
                                <div id="alternativos_${cat.id}" class="space-y-2">
                                    ${(() => {
                                        const asignaciones = asignacionesPorCategoria.get(cat.id) || [];
                                        const alternativos = asignaciones.filter(a => !a.es_principal);
                                        
                                        if (alternativos.length === 0) {
                                            return '<p class="text-xs text-gray-400 italic">No hay responsables alternativos</p>';
                                        }
                                        
                                        return alternativos.map(alt => {
                                            const usuario = usuariosPotenciales?.find(u => u.id === alt.usuario_id);
                                            const nombre = usuario?.empleados?.nombre_completo || usuario?.correo || 'Usuario';
                                            return `
                                                <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                                    <div class="flex-1">
                                                        <span class="text-sm font-medium">${nombre}</span>
                                                        ${alt.area_id ? `<span class="text-xs text-gray-400 ml-2">(Área: ${areas?.find(a => a.id === alt.area_id)?.nombre || 'N/A'})</span>` : ''}
                                                    </div>
                                                    <button onclick="eliminarResponsableAlternativo('${alt.id}', '${cat.id}')" class="text-red-500 hover:text-red-700">
                                                        <i class="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            `;
                                        }).join('');
                                    })()}
                                </div>
                            </div>
                            
                            <!-- Estadísticas (opcional) -->
                            <div class="border-t border-gray-100 pt-3 mt-2">
                                <div class="flex justify-between text-xs text-gray-400">
                                    <span>Total solicitudes: ${cat.total_solicitudes || 0}</span>
                                    <span>Pendientes: ${cat.pendientes || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${categorias.length === 0 ? '<div class="col-span-full text-center py-12 text-gray-500">No hay categorías registradas</div>' : ''}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Registrar funciones globales
        window.cambiarReglaSugerencia = cambiarReglaSugerencia;
        window.guardarResponsablePrincipal = guardarResponsablePrincipal;
        window.agregarResponsableAlternativo = agregarResponsableAlternativo;
        window.eliminarResponsableAlternativo = eliminarResponsableAlternativo;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar configuración: ' + error.message);
    }
}

// ==================== FUNCIONES DE GESTIÓN DE RESPONSABLES ====================

// Cambiar regla de sugerencia
async function cambiarReglaSugerencia(categoriaId) {
    const select = document.getElementById(`regla_${categoriaId}`);
    const nuevaRegla = select.value;
    
    mostrarLoading('Guardando configuración...');
    
    try {
        const { error } = await window.supabaseClient
            .from('solicitud_categorias')
            .update({ regla_sugerencia: nuevaRegla })
            .eq('id', categoriaId);
        
        if (error) throw error;
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Regla de sugerencia actualizada', 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo actualizar la regla', 'error');
    }
}

// Guardar responsable principal
async function guardarResponsablePrincipal(categoriaId) {
    const select = document.getElementById(`responsable_principal_${categoriaId}`);
    const usuarioId = select.value;
    
    if (!usuarioId) return;
    
    mostrarLoading('Guardando responsable principal...');
    
    try {
        // Actualizar categoría con el responsable sugerido
        const { error: updateError } = await window.supabaseClient
            .from('solicitud_categorias')
            .update({ responsable_sugerido_id: usuarioId })
            .eq('id', categoriaId);
        
        if (updateError) throw updateError;
        
        // Verificar si ya existe en la tabla de responsables
        const { data: existente } = await window.supabaseClient
            .from('solicitud_categoria_responsables')
            .select('id')
            .eq('categoria_id', categoriaId)
            .eq('usuario_id', usuarioId)
            .maybeSingle();
        
        if (!existente) {
            // Agregar como responsable principal
            const { error: insertError } = await window.supabaseClient
                .from('solicitud_categoria_responsables')
                .insert({
                    categoria_id: categoriaId,
                    usuario_id: usuarioId,
                    es_principal: true,
                    activo: true,
                    creado_el: new Date().toISOString(),
                    creado_por: usuarioActual.id
                });
            
            if (insertError) throw insertError;
        } else {
            // Actualizar a principal
            const { error: updateRespError } = await window.supabaseClient
                .from('solicitud_categoria_responsables')
                .update({ es_principal: true })
                .eq('id', existente.id);
            
            if (updateRespError) throw updateRespError;
        }
        
        // Quitar es_principal de otros responsables de esta categoría
        const { error: clearError } = await window.supabaseClient
            .from('solicitud_categoria_responsables')
            .update({ es_principal: false })
            .eq('categoria_id', categoriaId)
            .neq('usuario_id', usuarioId);
        
        if (clearError) throw clearError;
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Responsable principal actualizado', 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el responsable principal', 'error');
    }
}

// Agregar responsable alternativo
async function agregarResponsableAlternativo(categoriaId) {
    // Obtener usuarios disponibles (que no sean ya responsables de esta categoría)
    const { data: responsablesExistentes } = await window.supabaseClient
        .from('solicitud_categoria_responsables')
        .select('usuario_id')
        .eq('categoria_id', categoriaId);
    
    const idsExistentes = responsablesExistentes?.map(r => r.usuario_id) || [];
    
    // Obtener usuarios potenciales (con rol de aprobador)
    const { data: roles } = await window.supabaseClient
        .from('roles')
        .select('id')
        .in('nombre', ['ADMINISTRADOR', 'OPERADOR_EMPRESA']);
    
    const rolesIds = roles?.map(r => r.id) || [];
    
    const { data: usuariosDisponibles } = await window.supabaseClient
        .from('usuarios')
        .select(`
            id,
            correo,
            empleado_id,
            empleados:empleado_id (
                id,
                nombre_completo,
                puesto
            )
        `)
        .in('rol_id', rolesIds)
        .eq('activo', true)
        .not('id', 'in', `(${idsExistentes.join(',') || '""'})`)
        .order('correo');
    
    const opcionesUsuarios = usuariosDisponibles?.map(u => {
        const nombre = u.empleados?.nombre_completo || u.correo;
        return `<option value="${u.id}">${nombre} - ${u.correo}</option>`;
    }).join('') || '<option value="" disabled>No hay usuarios disponibles</option>';
    
    // Modal para seleccionar usuario y opcionalmente área
    const { value: datos } = await Swal.fire({
        title: 'Agregar responsable alternativo',
        html: `
            <div class="text-left space-y-4">
                <div>
                    <label class="form-label font-medium text-gray-700">Usuario responsable</label>
                    <select id="nuevo_responsable" class="form-input w-full" required>
                        <option value="">Seleccionar usuario</option>
                        ${opcionesUsuarios}
                    </select>
                </div>
                <div>
                    <label class="form-label font-medium text-gray-700">Área (opcional)</label>
                    <select id="area_responsable" class="form-input w-full">
                        <option value="">Todas las áreas</option>
                        ${areas?.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
                    </select>
                    <p class="text-xs text-gray-400 mt-1">Si selecciona un área, este responsable solo será sugerido para solicitantes de esa área</p>
                </div>
                <div>
                    <label class="form-label font-medium text-gray-700">Orden de prioridad</label>
                    <input type="number" id="orden_responsable" class="form-input w-full" value="0" min="0">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const usuarioId = document.getElementById('nuevo_responsable').value;
            if (!usuarioId) {
                Swal.showValidationMessage('Seleccione un usuario');
                return false;
            }
            return {
                usuario_id: usuarioId,
                area_id: document.getElementById('area_responsable').value || null,
                orden: parseInt(document.getElementById('orden_responsable').value) || 0
            };
        }
    });
    
    if (datos) {
        mostrarLoading('Agregando responsable...');
        
        try {
            const { error } = await window.supabaseClient
                .from('solicitud_categoria_responsables')
                .insert({
                    categoria_id: categoriaId,
                    usuario_id: datos.usuario_id,
                    area_id: datos.area_id,
                    orden: datos.orden,
                    es_principal: false,
                    activo: true,
                    creado_el: new Date().toISOString(),
                    creado_por: usuarioActual.id
                });
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Responsable alternativo agregado', 'success');
            
            // Recargar la vista para mostrar el cambio
            await cargarVistaConfigurarResponsablesSolicitudes();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo agregar el responsable', 'error');
        }
    }
}

// Eliminar responsable alternativo
async function eliminarResponsableAlternativo(responsableId, categoriaId) {
    const result = await Swal.fire({
        title: '¿Eliminar responsable?',
        text: 'Este usuario ya no podrá recibir solicitudes de esta categoría',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Eliminando...');
        
        try {
            const { error } = await window.supabaseClient
                .from('solicitud_categoria_responsables')
                .delete()
                .eq('id', responsableId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Responsable eliminado', 'success');
            
            // Recargar la vista
            await cargarVistaConfigurarResponsablesSolicitudes();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el responsable', 'error');
        }
    }
}

// ==================== OBTENER RESPONSABLE SUGERIDO ====================
async function obtenerResponsableSugerido(categoriaId, solicitanteId) {
    try {
        // 1. Obtener configuración de la categoría
        const { data: categoria, error: catError } = await window.supabaseClient
            .from('solicitud_categorias')
            .select('responsable_sugerido_id, regla_sugerencia')
            .eq('id', categoriaId)
            .single();
        
        if (catError) throw catError;
        
        // 2. Si la regla es por área, buscar responsable según área del solicitante
        if (categoria.regla_sugerencia === 'area') {
            // Obtener área del solicitante
            const { data: usuario } = await window.supabaseClient
                .from('usuarios')
                .select('empleado_id')
                .eq('id', solicitanteId)
                .single();
            
            if (usuario?.empleado_id) {
                const { data: empleado } = await window.supabaseClient
                    .from('empleados')
                    .select('area_id')
                    .eq('id', usuario.empleado_id)
                    .single();
                
                if (empleado?.area_id) {
                    // Buscar responsable para esa área
                    const { data: responsable } = await window.supabaseClient
                        .from('solicitud_categoria_responsables')
                        .select('usuario_id')
                        .eq('categoria_id', categoriaId)
                        .eq('area_id', empleado.area_id)
                        .eq('activo', true)
                        .maybeSingle();
                    
                    if (responsable) {
                        return responsable.usuario_id;
                    }
                }
            }
        }
        
        // 3. Si la regla es aleatoria, seleccionar un responsable aleatorio
        if (categoria.regla_sugerencia === 'aleatorio') {
            const { data: responsables } = await window.supabaseClient
                .from('solicitud_categoria_responsables')
                .select('usuario_id')
                .eq('categoria_id', categoriaId)
                .eq('activo', true);
            
            if (responsables && responsables.length > 0) {
                const aleatorio = Math.floor(Math.random() * responsables.length);
                return responsables[aleatorio].usuario_id;
            }
        }
        
        // 4. Fallback: usar responsable sugerido por defecto
        return categoria.responsable_sugerido_id;
        
    } catch (error) {
        console.error('Error obteniendo responsable sugerido:', error);
        return null;
    }
}

// ==================== CARGAR RESPONSABLES DISPONIBLES ====================
async function cargarResponsablesDisponibles(categoriaId) {
    try {
        // Obtener todos los responsables para esta categoría
        const { data: responsables, error } = await window.supabaseClient
            .from('solicitud_categoria_responsables')
            .select(`
                usuario_id,
                usuarios:usuario_id (
                    id,
                    correo,
                    empleado_id,
                    empleados:empleado_id (
                        id,
                        nombre_completo,
                        puesto
                    )
                ),
                es_principal,
                area_id
            `)
            .eq('categoria_id', categoriaId)
            .eq('activo', true)
            .order('orden')
            .order('es_principal', { ascending: false });
        
        if (error) throw error;
        
        if (!responsables || responsables.length === 0) {
            return [];
        }
        
        // Enriquecer con nombres legibles
        const responsablesFormateados = [];
        for (const r of responsables) {
            let nombre = r.usuarios?.correo || 'Usuario';
            let puesto = '';
            let areaId = r.area_id;
            
            if (r.usuarios?.empleado_id && r.usuarios?.empleados) {
                const empleado = r.usuarios.empleados;
                nombre = empleado.nombre_completo || nombre;
                puesto = empleado.puesto || '';
            }
            
            responsablesFormateados.push({
                id: r.usuario_id,
                nombre: nombre,
                puesto: puesto,
                correo: r.usuarios?.correo || '',
                esPrincipal: r.es_principal || false,
                areaId: areaId
            });
        }
        
        return responsablesFormateados;
        
    } catch (error) {
        console.error('Error cargando responsables disponibles:', error);
        return [];
    }
}

// ==================== CARGAR CONSUMIBLES PARA SELECT ====================
async function cargarConsumiblesParaSelect() {
    try {
        const { data: consumibles, error } = await window.supabaseClient
            .from('consumibles')
            .select('id, nombre, codigo, stock_actual')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        const select = document.getElementById('solicitud_consumible_id');
        if (!select) return;
        
        select.innerHTML = '<option value="">Ninguno (describir en detalle)</option>';
        
        consumibles?.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            let texto = `${c.nombre}`;
            if (c.codigo) texto += ` (${c.codigo})`;
            if (c.stock_actual !== undefined) texto += ` - Stock: ${c.stock_actual}`;
            option.textContent = texto;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando consumibles:', error);
    }
}

// ==================== CARGAR CATEGORÍAS PARA SELECT ====================
async function cargarCategoriasParaSelect() {
    try {
        const { data: categorias, error } = await window.supabaseClient
            .from('solicitud_categorias')
            .select('id, nombre, icono, color')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        const select = document.getElementById('solicitud_categoria_id');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        
        categorias?.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            const icono = c.icono || 'fas fa-tag';
            option.textContent = `${c.nombre}`;
            option.dataset.icono = icono;
            option.dataset.color = c.color || '#6c757d';
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

async function handleCategoriaChange(event) {
    const categoriaId = event.target.value;
    const responsableContainer = document.getElementById('responsable-container');
    const responsableSelect = document.getElementById('solicitud_responsable_id');
    const badgeSugerido = document.getElementById('responsable-sugerido-badge');
    const mensajeSugerido = document.getElementById('responsable-sugerido-mensaje');
    const indicadorCambio = document.getElementById('responsable-cambiado-indicador');
    
    if (!categoriaId) {
        responsableContainer.classList.add('hidden');
        return;
    }
    
    mostrarLoading('Cargando responsables...');
    
    try {
        // 1. Cargar responsables disponibles
        const responsables = await cargarResponsablesDisponibles(categoriaId);
        responsablesDisponiblesGlobal = responsables;
        
        if (responsables.length === 0) {
            responsableContainer.classList.add('hidden');
            ocultarLoading();
            Swal.fire({
                title: 'Sin responsables',
                text: 'Esta categoría no tiene responsables asignados. Contacte al administrador.',
                icon: 'warning',
                confirmButtonColor: '#39080a'
            });
            return;
        }
        
        // 2. Cargar select con opciones
        responsableSelect.innerHTML = '<option value="">Seleccionar responsable</option>';
        responsables.forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            let texto = r.nombre;
            if (r.puesto) texto += ` (${r.puesto})`;
            if (r.correo && !r.nombre) texto += ` - ${r.correo}`;
            option.textContent = texto;
            option.dataset.esPrincipal = r.esPrincipal;
            responsableSelect.appendChild(option);
        });
        
        // 3. Obtener responsable sugerido
        const responsableId = await obtenerResponsableSugerido(categoriaId, usuarioActual.id);
        responsableSugeridoGlobal = responsableId;
        
        // 4. Marcar el sugerido en el select
        if (responsableId) {
            for (let i = 0; i < responsableSelect.options.length; i++) {
                if (responsableSelect.options[i].value === responsableId) {
                    responsableSelect.selectedIndex = i;
                    break;
                }
            }
            
            // Mostrar badge y mensaje
            badgeSugerido.classList.remove('hidden');
            badgeSugerido.innerHTML = '⭐ Sugerido';
            badgeSugerido.className = 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700';
            
            // Obtener nombre del responsable sugerido para el mensaje
            const responsableSugerido = responsables.find(r => r.id === responsableId);
            const nombreSugerido = responsableSugerido?.nombre || 'el responsable asignado';
            
            mensajeSugerido.innerHTML = `📌 Según tu perfil, se sugiere enviar esta solicitud a <strong>${nombreSugerido}</strong>. Puedes cambiarlo si lo deseas.`;
            mensajeSugerido.className = 'text-xs text-green-600 mt-1';
        } else {
            badgeSugerido.classList.add('hidden');
            mensajeSugerido.innerHTML = `⚠️ No hay un responsable sugerido para esta categoría. Por favor, selecciona uno de la lista.`;
            mensajeSugerido.className = 'text-xs text-orange-600 mt-1';
        }
        
        // 5. Ocultar indicador de cambio si estaba visible
        indicadorCambio.classList.add('hidden');
        
        // 6. Mostrar contenedor
        responsableContainer.classList.remove('hidden');
        ocultarLoading();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        responsableContainer.classList.add('hidden');
        mostrarAlerta('Error', 'No se pudieron cargar los responsables', 'error');
    }
}

// ==================== MANEJADOR DE CAMBIO DE RESPONSABLE ====================
async function handleCambiarResponsable() {
    const responsableSelect = document.getElementById('solicitud_responsable_id');
    const badgeSugerido = document.getElementById('responsable-sugerido-badge');
    const mensajeSugerido = document.getElementById('responsable-sugerido-mensaje');
    const indicadorCambio = document.getElementById('responsable-cambiado-indicador');
    const currentValue = responsableSelect.value;
    const currentText = responsableSelect.options[responsableSelect.selectedIndex]?.text || '';
    
    // Mostrar modal de confirmación
    const result = await Swal.fire({
        title: 'Cambiar responsable',
        html: `
            <div class="text-left">
                <p>¿Estás seguro de que deseas cambiar el responsable sugerido?</p>
                <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p class="text-sm"><strong>Responsable actual:</strong> ${currentText}</p>
                    ${responsableSugeridoGlobal ? `
                        <p class="text-sm mt-1"><strong>Responsable sugerido originalmente:</strong> ${responsableSelect.querySelector(`option[value="${responsableSugeridoGlobal}"]`)?.text || 'N/A'}</p>
                    ` : ''}
                </div>
                <p class="text-xs text-gray-500 mt-3">La solicitud será enviada a la persona que selecciones.</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        // Marcar que se cambió
        badgeSugerido.classList.add('hidden');
        mensajeSugerido.innerHTML = `✏️ Has cambiado el responsable. La solicitud será enviada a <strong>${currentText}</strong>.`;
        mensajeSugerido.className = 'text-xs text-orange-600 mt-1';
        indicadorCambio.classList.remove('hidden');
        
        // Marcar visualmente el select
        responsableSelect.classList.add('border-orange-400');
        
        // Guardar en una variable que se cambió (para usarlo al guardar)
        window.responsableCambiado = true;
        
        mostrarAlerta('Información', `Responsable cambiado a: ${currentText}`, 'info');
    } else {
        // Restaurar el sugerido
        if (responsableSugeridoGlobal) {
            for (let i = 0; i < responsableSelect.options.length; i++) {
                if (responsableSelect.options[i].value === responsableSugeridoGlobal) {
                    responsableSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
}

// ==================== ENVIAR NOTIFICACIÓN AL RESPONSABLE ====================
async function enviarNotificacionResponsable(responsableId, titulo, numeroSolicitud) {
    try {
        // Obtener información del responsable
        const { data: usuario, error } = await window.supabaseClient
            .from('usuarios')
            .select(`
                id,
                correo,
                empleado_id,
                empleados:empleado_id (
                    id,
                    nombre_completo
                )
            `)
            .eq('id', responsableId)
            .single();
        
        if (error) throw error;
        
        const nombreResponsable = usuario?.empleados?.nombre_completo || usuario?.correo || 'Responsable';
        
        // Crear notificación en la base de datos (para mostrar en el sistema)
        await window.supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: responsableId,
                titulo: 'Nueva solicitud asignada',
                mensaje: `Se te ha asignado la solicitud ${numeroSolicitud}: "${titulo}"`,
                tipo: 'solicitud',
                referencia_id: null, // Se puede guardar el ID de la solicitud
                leida: false,
                creado_el: new Date().toISOString()
            });
        
        // Mostrar notificación en consola (en producción, aquí iría envío de correo)
        console.log(`📧 Notificación enviada a ${nombreResponsable}: Nueva solicitud ${numeroSolicitud} - "${titulo}"`);
        
        // Opcional: Mostrar toast al solicitante
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        
        Toast.fire({
            icon: 'success',
            title: `Solicitud enviada a ${nombreResponsable}`
        });
        
    } catch (error) {
        console.error('Error enviando notificación:', error);
        // No falla el flujo principal si la notificación falla
    }
}

// ==================== OBTENER FECHA LOCAL PARA SUPABASE ====================
function getFechaLocalForDB() {
    const ahora = new Date();
    // Ajustar a la zona horaria de Perú (UTC-5)
    const horaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return horaPeru.toISOString();
}

window.getFechaLocalForDB = getFechaLocalForDB;

// ==================== REGISTRAR HISTORIAL ====================
async function registrarHistorialSolicitud(datos) {
    try {
        const { error } = await window.supabaseClient
            .from('solicitud_historial')
            .insert({
                solicitud_id: datos.solicitud_id,
                accion: datos.accion,
                estado_anterior: datos.estado_anterior || null,
                estado_nuevo: datos.estado_nuevo || null,
                comentario: datos.comentario || null,
                usuario_id: datos.usuario_id,
                fecha_cambio: datos.fecha || getFechaLocalForDB()
            });
        
        if (error) {
            console.log('Historial registrado (simulado):', datos);
        }
        
    } catch (error) {
        console.error('Error registrando historial:', error);
    }
}

// ==================== NOTIFICACIÓN AL RESPONSABLE ====================
async function enviarNotificacionResponsable(datos) {
    try {
        const { responsableId, titulo, numeroSolicitud, solicitudId, urgencia, categoriaId, solicitanteNombre } = datos;
        
        // Obtener información del responsable
        const { data: usuario, error: userError } = await window.supabaseClient
            .from('usuarios')
            .select(`
                id,
                correo,
                empleado_id,
                empleados:empleado_id (
                    id,
                    nombre_completo,
                    puesto
                )
            `)
            .eq('id', responsableId)
            .single();
        
        if (userError) throw userError;
        
        const nombreResponsable = usuario?.empleados?.nombre_completo || usuario?.correo || 'Responsable';
        
        // Determinar ícono según urgencia
        const urgenciaIcono = {
            'BAJA': '📋',
            'MEDIA': '📌',
            'ALTA': '⚠️',
            'URGENTE': '🔴'
        }[urgencia] || '📋';
        
        const urgenciaTexto = {
            'BAJA': 'Baja prioridad',
            'MEDIA': 'Prioridad media',
            'ALTA': 'Alta prioridad',
            'URGENTE': 'URGENTE'
        }[urgencia] || 'Prioridad media';
        
        // Crear notificación en la base de datos
        const { error: notifError } = await window.supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: responsableId,
                titulo: `${urgenciaIcono} Nueva solicitud: ${numeroSolicitud}`,
                mensaje: `${solicitanteNombre} ha solicitado "${titulo}". Prioridad: ${urgenciaTexto}.`,
                tipo: 'solicitud_pendiente',
                referencia_id: solicitudId,
                leida: false,
                creado_el: new Date().toISOString(),
                metadata: {
                    urgencia: urgencia,
                    numero_solicitud: numeroSolicitud,
                    solicitante: solicitanteNombre
                }
            });
        
        if (notifError) throw notifError;
        
        // Mostrar toast de éxito
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true
        });
        
        Toast.fire({
            icon: 'success',
            title: `✅ Solicitud enviada a ${nombreResponsable}`,
            html: `<div class="text-xs mt-1">Será notificado por correo electrónico</div>`
        });
        
        // Opcional: Enviar correo electrónico (integración con servicio de email)
        await enviarCorreoResponsable({
            email: usuario.correo,
            nombre: nombreResponsable,
            numeroSolicitud: numeroSolicitud,
            titulo: titulo,
            solicitante: solicitanteNombre,
            urgencia: urgenciaTexto,
            url: `${window.location.origin}/#/solicitudes/${solicitudId}`
        });
        
        console.log(`📧 Notificación enviada a ${nombreResponsable} (${usuario.correo})`);
        
    } catch (error) {
        console.error('Error enviando notificación al responsable:', error);
        // No falla el flujo principal
    }
}

// ==================== NOTIFICACIÓN AL SOLICITANTE ====================
async function enviarNotificacionSolicitante(datos) {
    try {
        const { solicitanteId, titulo, numeroSolicitud, responsableNombre, urgencia } = datos;
        
        // Obtener información del solicitante
        const { data: usuario, error: userError } = await window.supabaseClient
            .from('usuarios')
            .select(`
                id,
                correo,
                empleados:empleado_id (
                    id,
                    nombre_completo
                )
            `)
            .eq('id', solicitanteId)
            .single();
        
        if (userError) throw userError;
        
        const nombreSolicitante = usuario?.empleados?.nombre_completo || usuario?.correo || 'Usuario';
        
        // Crear notificación en la base de datos
        const { error: notifError } = await window.supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: solicitanteId,
                titulo: `✅ Solicitud ${numeroSolicitud} enviada`,
                mensaje: `Tu solicitud "${titulo}" ha sido enviada a ${responsableNombre} para su revisión.`,
                tipo: 'solicitud_enviada',
                referencia_id: null,
                leida: false,
                creado_el: new Date().toISOString(),
                metadata: {
                    numero_solicitud: numeroSolicitud,
                    responsable: responsableNombre,
                    urgencia: urgencia
                }
            });
        
        if (notifError) throw notifError;
        
        console.log(`📧 Confirmación enviada a ${nombreSolicitante}`);
        
    } catch (error) {
        console.error('Error enviando notificación al solicitante:', error);
    }
}

// ==================== NOTIFICAR CAMBIO DE RESPONSABLE A ADMIN ====================
async function notificarCambioResponsableAdministrador(datos) {
    try {
        const { solicitudId, numeroSolicitud, solicitanteNombre, responsableSugeridoNombre, responsableSeleccionadoNombre } = datos;
        
        // Obtener todos los administradores
        const { data: rolAdmin } = await window.supabaseClient
            .from('roles')
            .select('id')
            .eq('nombre', 'ADMINISTRADOR')
            .single();
        
        if (!rolAdmin) return;
        
        const { data: administradores } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo')
            .eq('rol_id', rolAdmin.id)
            .eq('activo', true);
        
        if (!administradores || administradores.length === 0) return;
        
        // Crear notificaciones para todos los administradores
        for (const admin of administradores) {
            await window.supabaseClient
                .from('notificaciones')
                .insert({
                    usuario_id: admin.id,
                    titulo: `⚠️ Cambio de responsable en solicitud ${numeroSolicitud}`,
                    mensaje: `${solicitanteNombre} cambió el responsable sugerido de "${responsableSugeridoNombre}" a "${responsableSeleccionadoNombre}"`,
                    tipo: 'alerta_administrador',
                    referencia_id: solicitudId,
                    leida: false,
                    creado_el: new Date().toISOString(),
                    metadata: {
                        numero_solicitud: numeroSolicitud,
                        solicitante: solicitanteNombre,
                        responsable_sugerido: responsableSugeridoNombre,
                        responsable_seleccionado: responsableSeleccionadoNombre
                    }
                });
        }
        
        console.log(`📧 Notificados ${administradores.length} administradores sobre cambio de responsable`);
        
    } catch (error) {
        console.error('Error notificando a administradores:', error);
    }
}

// ==================== OBTENER NOTIFICACIONES DEL USUARIO ====================
async function obtenerNotificacionesUsuario(usuarioId, soloNoLeidas = false) {
    try {
        let query = window.supabaseClient
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('creado_el', { ascending: false })
            .limit(50);
        
        if (soloNoLeidas) {
            query = query.eq('leida', false);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return data || [];
        
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        return [];
    }
}

// ==================== MARCAR NOTIFICACIÓN COMO LEÍDA ====================
async function marcarNotificacionLeida(notificacionId) {
    try {
        const { error } = await window.supabaseClient
            .from('notificaciones')
            .update({ 
                leida: true, 
                leida_el: new Date().toISOString() 
            })
            .eq('id', notificacionId);
        
        if (error) throw error;
        
        return true;
        
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
        return false;
    }
}

// ==================== MARCAR TODAS LAS NOTIFICACIONES COMO LEÍDAS ====================
async function marcarTodasNotificacionesLeidas(usuarioId) {
    try {
        const { error } = await window.supabaseClient
            .from('notificaciones')
            .update({ 
                leida: true, 
                leida_el: new Date().toISOString() 
            })
            .eq('usuario_id', usuarioId)
            .eq('leida', false);
        
        if (error) throw error;
        
        return true;
        
    } catch (error) {
        console.error('Error marcando notificaciones como leídas:', error);
        return false;
    }
}

// ==================== ACTUALIZAR CAMPANA DE NOTIFICACIONES ====================
async function actualizarCampanaNotificaciones() {
    if (!usuarioActual || !usuarioActual.id) return;
    
    const notificaciones = await obtenerNotificacionesUsuario(usuarioActual.id, true);
    const cantidadNoLeidas = notificaciones.length;
    
    const campana = document.getElementById('notificaciones-campana');
    const badge = document.getElementById('notificaciones-badge');
    
    if (campana) {
        if (cantidadNoLeidas > 0) {
            campana.classList.add('text-yellow-400');
            if (badge) {
                badge.textContent = cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas;
                badge.classList.remove('hidden');
            }
        } else {
            campana.classList.remove('text-yellow-400');
            if (badge) badge.classList.add('hidden');
        }
    }
}

// ==================== MOSTRAR PANEL DE NOTIFICACIONES ====================
async function mostrarPanelNotificaciones() {
    if (!usuarioActual || !usuarioActual.id) return;
    
    const notificaciones = await obtenerNotificacionesUsuario(usuarioActual.id, false);
    
    let notificacionesHtml = '';
    
    if (notificaciones.length === 0) {
        notificacionesHtml = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-bell-slash text-3xl mb-2"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
    } else {
        notificacionesHtml = notificaciones.map(n => `
            <div class="border-b border-gray-100 last:border-b-0 p-3 hover:bg-gray-50 transition-colors cursor-pointer ${!n.leida ? 'bg-blue-50' : ''}"
                 onclick="marcarNotificacionLeida('${n.id}')">
                <div class="flex gap-3">
                    <div class="flex-shrink-0">
                        ${n.tipo === 'solicitud_pendiente' ? '<i class="fas fa-clipboard-list text-primary"></i>' : 
                          n.tipo === 'solicitud_enviada' ? '<i class="fas fa-check-circle text-green-500"></i>' : 
                          '<i class="fas fa-bell text-gray-400"></i>'}
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-medium ${!n.leida ? 'text-primary' : 'text-gray-700'}">${n.titulo}</p>
                        <p class="text-xs text-gray-500 mt-1">${n.mensaje}</p>
                        <p class="text-xs text-gray-400 mt-1">${formatearFechaRelativa(n.creado_el)}</p>
                    </div>
                    ${!n.leida ? '<div class="w-2 h-2 bg-primary rounded-full mt-2"></div>' : ''}
                </div>
            </div>
        `).join('');
        
        notificacionesHtml += `
            <div class="p-3 border-t border-gray-100 text-center">
                <button onclick="marcarTodasNotificacionesLeidas('${usuarioActual.id}')" class="text-xs text-primary hover:underline">
                    Marcar todas como leídas
                </button>
            </div>
        `;
    }
    
    Swal.fire({
        title: 'Notificaciones',
        html: `<div class="max-h-96 overflow-y-auto">${notificacionesHtml}</div>`,
        width: '450px',
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Cerrar',
        showCloseButton: true,
        didOpen: () => {
            // Actualizar badge después de abrir
            actualizarCampanaNotificaciones();
        }
    });
}

// ==================== FORMATO DE FECHA RELATIVA ====================
function formatearFechaRelativa(fechaISO) {
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) !== 1 ? 's' : ''}`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) !== 1 ? 'es' : ''}`;
    return `Hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) !== 1 ? 's' : ''}`;
}

// ==================== CONTAR SOLICITUDES PENDIENTES DEL RESPONSABLE ====================
async function actualizarBadgeSolicitudesPendientes() {
    if (!usuarioActual || !usuarioActual.id) return;
    
    try {
        const { count, error } = await window.supabaseClient
            .from('solicitudes')
            .select('*', { count: 'exact', head: true })
            .eq('responsable_seleccionado_id', usuarioActual.id)
            .eq('estado', 'PENDIENTE');
        
        if (error) throw error;
        
        const badge = document.getElementById('solicitudes-pendientes-badge');
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

// ==================== VISTA SOLICITUDES ASIGNADAS (PARA CUALQUIER ROL) ====================
async function cargarVistaSolicitudesAsignadas() {
    mostrarLoading('Cargando solicitudes asignadas...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        // Obtener permisos solo para saber el rol (opcional, para UI)
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // Obtener solicitudes donde el usuario es el responsable asignado
        // SIN IMPORTAR SU ROL
        const { data: solicitudes, error } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo, stock_actual),
                solicitante:solicitante_id(id, correo, empleado_id)
            `)
            .eq('responsable_seleccionado_id', usuarioActual.id)
            .order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        // Enriquecer con nombres de solicitantes
        for (const solicitud of solicitudes || []) {
            if (solicitud.solicitante?.empleado_id) {
                const { data: empleado } = await window.supabaseClient
                    .from('empleados')
                    .select('nombre_completo, puesto')
                    .eq('id', solicitud.solicitante.empleado_id)
                    .single();
                if (empleado) {
                    solicitud.solicitante_nombre = empleado.nombre_completo;
                    solicitud.solicitante_puesto = empleado.puesto;
                } else {
                    solicitud.solicitante_nombre = solicitud.solicitante?.correo?.split('@')[0] || 'Usuario';
                }
            } else {
                solicitud.solicitante_nombre = solicitud.solicitante?.correo?.split('@')[0] || 'Usuario';
            }
        }
        
        // Separar por estado
        const pendientes = solicitudes?.filter(s => s.estado === 'PENDIENTE') || [];
        const aprobadas = solicitudes?.filter(s => s.estado === 'APROBADO') || [];
        const rechazadas = solicitudes?.filter(s => s.estado === 'RECHAZADO') || [];
        const entregadas = solicitudes?.filter(s => s.estado === 'ENTREGADO') || [];
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-inbox"></i> Solicitudes Asignadas
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Solicitudes que te han sido asignadas para aprobación o gestión
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${solicitudes?.length || 0} total
                            </span>
                            <span class="ml-2 px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs">
                                ${pendientes.length} pendientes
                            </span>
                        </p>
                    </div>
                    ${esAdmin ? `
                        <div class="flex gap-2">
                            <button onclick="exportarSolicitudesAsignadasExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                                <i class="fas fa-file-excel"></i> Excel
                            </button>
                            <button onclick="exportarSolicitudesAsignadasPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-orange-500">
                    <p class="text-2xl font-bold text-orange-600">${pendientes.length}</p>
                    <p class="text-xs text-gray-500">Pendientes</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${aprobadas.length}</p>
                    <p class="text-xs text-gray-500">Aprobadas</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-red-500">
                    <p class="text-2xl font-bold text-red-600">${rechazadas.length}</p>
                    <p class="text-xs text-gray-500">Rechazadas</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-blue-500">
                    <p class="text-2xl font-bold text-blue-600">${entregadas.length}</p>
                    <p class="text-xs text-gray-500">Entregadas</p>
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100">
                    <div class="flex flex-wrap items-center gap-4">
                        <span class="text-sm font-medium text-gray-700">Filtrar por estado:</span>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="filtrarSolicitudesAsignadas('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-estado-btn" data-estado="todos">
                                Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${solicitudes?.length || 0}</span>
                            </button>
                            <button onclick="filtrarSolicitudesAsignadas('PENDIENTE')" class="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 filter-estado-btn" data-estado="PENDIENTE">
                                Pendientes <span class="ml-1 bg-orange-200 px-2 py-0.5 rounded-full text-xs">${pendientes.length}</span>
                            </button>
                            <button onclick="filtrarSolicitudesAsignadas('APROBADO')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-estado-btn" data-estado="APROBADO">
                                Aprobadas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${aprobadas.length}</span>
                            </button>
                            <button onclick="filtrarSolicitudesAsignadas('RECHAZADO')" class="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200 filter-estado-btn" data-estado="RECHAZADO">
                                Rechazadas <span class="ml-1 bg-red-200 px-2 py-0.5 rounded-full text-xs">${rechazadas.length}</span>
                            </button>
                            <button onclick="filtrarSolicitudesAsignadas('ENTREGADO')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-estado-btn" data-estado="ENTREGADO">
                                Entregadas <span class="ml-1 bg-blue-200 px-2 py-0.5 rounded-full text-xs">${entregadas.length}</span>
                            </button>
                        </div>
                        <div class="flex-1"></div>
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="busquedaSolicitudes" placeholder="Buscar por título o número..." 
                                class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary"
                                onkeyup="filtrarSolicitudesAsignadasPorBusqueda()">
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tarjetas de solicitudes -->
            <div id="solicitudes-asignadas-container">
                ${generarTarjetasSolicitudesAsignadas(pendientes, 'PENDIENTE', 'bg-orange-50', 'border-orange-500', '🟠', esAdmin)}
                ${generarTarjetasSolicitudesAsignadas(aprobadas, 'APROBADO', 'bg-green-50', 'border-green-500', '🟢', esAdmin)}
                ${generarTarjetasSolicitudesAsignadas(rechazadas, 'RECHAZADO', 'bg-red-50', 'border-red-500', '🔴', esAdmin)}
                ${generarTarjetasSolicitudesAsignadas(entregadas, 'ENTREGADO', 'bg-blue-50', 'border-blue-500', '🔵', esAdmin)}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Resaltar filtro activo
        document.querySelector('.filter-estado-btn[data-estado="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
        
        // Actualizar badge de solicitudes pendientes
        await actualizarBadgeSolicitudesPendientes();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar solicitudes asignadas: ' + error.message);
    }
}

// ==================== GENERAR TARJETAS DE SOLICITUDES ASIGNADAS ====================
function generarTarjetasSolicitudesAsignadas(solicitudes, estado, bgColor, borderColor, icono, esAdmin) {
    if (!solicitudes || solicitudes.length === 0) {
        return `
            <div class="mb-6">
                <div class="${bgColor} rounded-t-lg px-4 py-2 border-b ${borderColor}">
                    <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                        <span>${icono}</span> ${estado === 'PENDIENTE' ? 'Pendientes' : 
                                              estado === 'APROBADO' ? 'Aprobadas' : 
                                              estado === 'RECHAZADO' ? 'Rechazadas' : 'Entregadas'}
                        <span class="ml-2 text-xs bg-white/50 px-2 py-0.5 rounded-full">0</span>
                    </h3>
                </div>
                <div class="bg-gray-50 rounded-b-lg p-8 text-center text-gray-400 border border-gray-200">
                    <i class="fas fa-inbox text-3xl mb-2"></i>
                    <p>No hay solicitudes ${estado === 'PENDIENTE' ? 'pendientes' : 
                                         estado === 'APROBADO' ? 'aprobadas' :
                                         estado === 'RECHAZADO' ? 'rechazadas' : 'entregadas'}</p>
                </div>
            </div>
        `;
    }
    
    const urgenciaColors = {
        'BAJA': 'bg-gray-100 text-gray-600',
        'MEDIA': 'bg-blue-100 text-blue-600',
        'ALTA': 'bg-orange-100 text-orange-600',
        'URGENTE': 'bg-red-100 text-red-600'
    };
    
    const urgenciaIconos = {
        'BAJA': '📋',
        'MEDIA': '📌',
        'ALTA': '⚠️',
        'URGENTE': '🔴'
    };
    
    return `
        <div class="mb-6">
            <div class="${bgColor} rounded-t-lg px-4 py-2 border-b ${borderColor}">
                <h3 class="font-semibold text-gray-700 flex items-center gap-2">
                    <span>${icono}</span> ${estado === 'PENDIENTE' ? 'Pendientes' : 
                                          estado === 'APROBADO' ? 'Aprobadas' : 
                                          estado === 'RECHAZADO' ? 'Rechazadas' : 'Entregadas'}
                    <span class="ml-2 text-xs bg-white/50 px-2 py-0.5 rounded-full">${solicitudes.length}</span>
                </h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-b-lg border border-gray-200 border-t-0">
                ${solicitudes.map(s => {
                    const urgenciaClass = urgenciaColors[s.urgencia] || 'bg-gray-100';
                    const urgenciaIcono = urgenciaIconos[s.urgencia] || '📋';
                    // Usar la función calcularTiempoTranscurrido (global o local)
                    const tiempo = typeof calcularTiempoTranscurrido === 'function' 
                        ? calcularTiempoTranscurrido(s.creado_el)
                        : 'N/A';
                    
                    return `
                        <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 solicitud-card" data-estado="${s.estado}">
                            <div class="p-4">
                                <!-- Cabecera -->
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <span class="text-xs font-mono text-gray-400">${s.numero || 'N/A'}</span>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="px-2 py-0.5 rounded-full text-xs ${urgenciaClass}">
                                                ${urgenciaIcono} ${s.urgencia}
                                            </span>
                                            <span class="text-xs text-gray-400">
                                                <i class="far fa-clock"></i> ${tiempo}
                                            </span>
                                        </div>
                                    </div>
                                    ${s.responsable_cambiado ? `
                                        <span class="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full" title="El responsable fue cambiado">
                                            <i class="fas fa-exchange-alt"></i> Cambiado
                                        </span>
                                    ` : ''}
                                </div>
                                
                                <!-- Título -->
                                <h3 class="font-bold text-primary text-base mt-2 line-clamp-2">${s.titulo || 'Sin título'}</h3>
                                
                                <!-- Descripción (resumida) -->
                                <p class="text-sm text-gray-600 mt-2 line-clamp-2">${s.descripcion || 'Sin descripción'}</p>
                                
                                <!-- Información del solicitante -->
                                <div class="mt-3 p-2 bg-gray-50 rounded-lg">
                                    <div class="flex items-center gap-2">
                                        <i class="fas fa-user-circle text-primary"></i>
                                        <div>
                                            <p class="text-sm font-medium">${s.solicitante_nombre || 'Usuario'}</p>
                                            ${s.solicitante_puesto ? `<p class="text-xs text-gray-500">${s.solicitante_puesto}</p>` : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Detalles adicionales -->
                                <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                                    ${s.categoria?.nombre ? `
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-tag text-gray-400"></i>
                                            <span>${s.categoria.nombre}</span>
                                        </div>
                                    ` : ''}
                                    ${s.cantidad_solicitada ? `
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-box text-gray-400"></i>
                                            <span>Cantidad: ${s.cantidad_solicitada}</span>
                                        </div>
                                    ` : ''}
                                    ${s.fecha_requerida ? `
                                        <div class="flex items-center gap-1 col-span-2">
                                            <i class="fas fa-calendar-alt text-gray-400"></i>
                                            <span>Fecha requerida: ${new Date(s.fecha_requerida).toLocaleDateString()}</span>
                                        </div>
                                    ` : ''}
                                </div>
                                
                                <!-- Botones de acción según estado -->
                                <div class="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                                    <button onclick="verDetalleSolicitud('${s.id}')" 
                                            class="flex-1 text-xs bg-gray-100 text-gray-700 py-1.5 rounded hover:bg-gray-200 transition-colors">
                                        <i class="fas fa-eye"></i> Ver detalles
                                    </button>
                                    
                                    ${s.estado === 'PENDIENTE' ? `
                                        <button onclick="aprobarSolicitud('${s.id}')" 
                                                class="flex-1 text-xs bg-green-500 text-white py-1.5 rounded hover:bg-green-600 transition-colors">
                                            <i class="fas fa-check"></i> Aprobar
                                        </button>
                                        <button onclick="rechazarSolicitud('${s.id}')" 
                                                class="flex-1 text-xs bg-red-500 text-white py-1.5 rounded hover:bg-red-600 transition-colors">
                                            <i class="fas fa-times"></i> Rechazar
                                        </button>
                                    ` : ''}
                                    
                                    ${s.estado === 'APROBADO' ? `
                                        <button onclick="marcarComoEntregado('${s.id}')" 
                                                class="flex-1 text-xs bg-blue-500 text-white py-1.5 rounded hover:bg-blue-600 transition-colors">
                                            <i class="fas fa-box"></i> Marcar entregado
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ==================== NOTIFICACIÓN DE APROBACIÓN ====================
async function enviarNotificacionAprobacion(datos) {
    try {
        const { error } = await window.supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: datos.solicitanteId,
                titulo: `✅ Solicitud ${datos.numeroSolicitud} aprobada`,
                mensaje: `Tu solicitud "${datos.titulo}" ha sido aprobada por ${datos.aprobadorNombre}.${datos.comentario ? ` Comentario: ${datos.comentario}` : ''}`,
                tipo: 'solicitud_aprobada',
                leida: false,
                creado_el: getFechaLocalForDB()
            });
        
        if (error) {
            console.log('Notificación simulada:', datos);
        }
        
    } catch (error) {
        console.error('Error en notificación:', error);
    }
}

// ==================== NOTIFICACIÓN DE RECHAZO ====================
async function enviarNotificacionRechazo(datos) {
    try {
        const { error } = await window.supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: datos.solicitanteId,
                titulo: `❌ Solicitud ${datos.numeroSolicitud} rechazada`,
                mensaje: `Tu solicitud "${datos.titulo}" ha sido rechazada por ${datos.rechazadorNombre}. Motivo: ${datos.motivo}`,
                tipo: 'solicitud_rechazada',
                leida: false,
                creado_el: getFechaLocalForDB()
            });
        
        if (error) {
            console.log('Notificación simulada:', datos);
        }
        
    } catch (error) {
        console.error('Error en notificación:', error);
    }
}

// ==================== FILTRAR SOLICITUDES ASIGNADAS ====================
window.filtrarSolicitudesAsignadas = function(estado) {
    const contenedores = document.querySelectorAll('#solicitudes-asignadas-container > div');
    const botones = document.querySelectorAll('.filter-estado-btn');
    
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === estado) {
            btn.classList.add('ring-2', 'ring-primary', 'font-bold');
        }
    });
    
    if (estado === 'todos') {
        contenedores.forEach(container => {
            container.style.display = '';
        });
    } else {
        contenedores.forEach(container => {
            const titulo = container.querySelector('.rounded-t-lg h3')?.innerText || '';
            if (titulo.includes(estado)) {
                container.style.display = '';
            } else {
                container.style.display = 'none';
            }
        });
    }
};

window.filtrarSolicitudesAsignadasPorBusqueda = function() {
    const busqueda = document.getElementById('busquedaSolicitudes')?.value.toLowerCase() || '';
    const tarjetas = document.querySelectorAll('.solicitud-card');
    
    tarjetas.forEach(tarjeta => {
        const texto = tarjeta.innerText.toLowerCase();
        if (texto.includes(busqueda) || busqueda === '') {
            tarjeta.style.display = '';
        } else {
            tarjeta.style.display = 'none';
        }
    });
};

// ==================== EXPORTAR SOLICITUDES ASIGNADAS A EXCEL ====================
window.exportarSolicitudesAsignadasExcel = async function() {
    mostrarLoading('Generando archivo Excel...');
    
    try {
        // Obtener solicitudes donde el usuario es responsable
        const { data: solicitudes, error } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `)
            .eq('responsable_seleccionado_id', usuarioActual.id)
            .order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        if (!solicitudes || solicitudes.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay solicitudes para exportar', 'info');
            return;
        }
        
        // Preparar datos para Excel
        const datos = solicitudes.map(s => {
            // Mapeo de estados a texto legible
            const estadoTexto = {
                'PENDIENTE': 'Pendiente',
                'APROBADO': 'Aprobado',
                'RECHAZADO': 'Rechazado',
                'ENTREGADO': 'Entregado'
            }[s.estado] || s.estado;
            
            // Mapeo de urgencia a texto legible
            const urgenciaTexto = {
                'BAJA': 'Baja',
                'MEDIA': 'Media',
                'ALTA': 'Alta',
                'URGENTE': 'Urgente'
            }[s.urgencia] || s.urgencia;
            
            return {
                'N° SOLICITUD': s.numero || 'N/A',
                'TÍTULO': s.titulo || 'N/A',
                'DESCRIPCIÓN': s.descripcion || 'N/A',
                'CATEGORÍA': s.categoria?.nombre || 'N/A',
                'CONSUMIBLE': s.consumible?.nombre || 'N/A',
                'CANTIDAD': s.cantidad_solicitada || 0,
                'URGENCIA': urgenciaTexto,
                'ESTADO': estadoTexto,
                'SOLICITANTE': s.solicitante?.correo || 'N/A',
                'FECHA CREACIÓN': new Date(s.creado_el).toLocaleString(),
                'FECHA REQUERIDA': s.fecha_requerida ? new Date(s.fecha_requerida).toLocaleDateString() : 'N/A',
                'RESPONSABLE CAMBIADO': s.responsable_cambiado ? 'Sí' : 'No'
            };
        });
        
        // Columnas para Excel
        const columnas = [
            'N° SOLICITUD', 'TÍTULO', 'DESCRIPCIÓN', 'CATEGORÍA', 'CONSUMIBLE',
            'CANTIDAD', 'URGENCIA', 'ESTADO', 'SOLICITANTE', 'FECHA CREACIÓN',
            'FECHA REQUERIDA', 'RESPONSABLE CAMBIADO'
        ];
        
        // Crear hoja de Excel
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes Asignadas');
        
        // Ajustar ancho de columnas
        const colWidths = columnas.map(col => ({ wch: Math.max(col.length, 15) }));
        ws['!cols'] = colWidths;
        
        // Descargar archivo
        XLSX.writeFile(wb, `solicitudes_asignadas_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} solicitudes a Excel`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// ==================== EXPORTAR SOLICITUDES ASIGNADAS A PDF ====================
window.exportarSolicitudesAsignadasPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        // Obtener solicitudes
        const { data: solicitudes, error } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `)
            .eq('responsable_seleccionado_id', usuarioActual.id)
            .order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        if (!solicitudes || solicitudes.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay solicitudes para exportar', 'info');
            return;
        }
        
        // Estadísticas
        const total = solicitudes.length;
        const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
        const aprobadas = solicitudes.filter(s => s.estado === 'APROBADO').length;
        const rechazadas = solicitudes.filter(s => s.estado === 'RECHAZADO').length;
        const entregadas = solicitudes.filter(s => s.estado === 'ENTREGADO').length;
        const urgentes = solicitudes.filter(s => s.urgencia === 'URGENTE' || s.urgencia === 'ALTA').length;
        
        // Generar HTML del reporte
        let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Solicitudes Asignadas</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: white;
                        padding: 20px;
                    }
                    .report-container {
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                    }
                    .report-header {
                        text-align: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 3px solid #39080a;
                    }
                    .report-header h1 {
                        color: #39080a;
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    .report-header p {
                        color: #666;
                        font-size: 12px;
                    }
                    .stats {
                        display: flex;
                        justify-content: space-around;
                        margin-bottom: 20px;
                        gap: 15px;
                        flex-wrap: wrap;
                    }
                    .stat-card {
                        flex: 1;
                        min-width: 120px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        padding: 12px;
                        text-align: center;
                        border-left: 4px solid #39080a;
                    }
                    .stat-card .number {
                        font-size: 28px;
                        font-weight: bold;
                        color: #39080a;
                    }
                    .stat-card .label {
                        font-size: 11px;
                        color: #666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 6px;
                        text-align: left;
                        vertical-align: top;
                    }
                    th {
                        background-color: #39080a;
                        color: white;
                        font-weight: 600;
                        position: sticky;
                        top: 0;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 10px;
                        color: #666;
                        padding-top: 15px;
                        border-top: 1px solid #ddd;
                    }
                    .badge-estado {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 9px;
                        font-weight: bold;
                    }
                    .estado-PENDIENTE { background: #fed7aa; color: #9a3412; }
                    .estado-APROBADO { background: #d1fae5; color: #065f46; }
                    .estado-RECHAZADO { background: #fee2e2; color: #991b1b; }
                    .estado-ENTREGADO { background: #dbeafe; color: #1e40af; }
                    .badge-urgencia { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; }
                    .urgencia-URGENTE { background: #fee2e2; color: #991b1b; }
                    .urgencia-ALTA { background: #fed7aa; color: #9a3412; }
                    .urgencia-MEDIA { background: #dbeafe; color: #1e40af; }
                    .urgencia-BAJA { background: #e5e7eb; color: #374151; }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="report-header">
                        <h1>REPORTE DE SOLICITUDES ASIGNADAS</h1>
                        <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
                        <p>Usuario: ${usuarioActual?.empleados?.nombre_completo || usuarioActual?.correo || 'Sistema'}</p>
                    </div>
                    
                    <!-- Estadísticas -->
                    <div class="stats">
                        <div class="stat-card"><div class="number">${total}</div><div class="label">Total Solicitudes</div></div>
                        <div class="stat-card"><div class="number">${pendientes}</div><div class="label">Pendientes</div></div>
                        <div class="stat-card"><div class="number">${aprobadas}</div><div class="label">Aprobadas</div></div>
                        <div class="stat-card"><div class="number">${rechazadas}</div><div class="label">Rechazadas</div></div>
                        <div class="stat-card"><div class="number">${entregadas}</div><div class="label">Entregadas</div></div>
                        <div class="stat-card"><div class="number">${urgentes}</div><div class="label">Alta/Urgente</div></div>
                    </div>
                    
                    <!-- Tabla de solicitudes -->
                    <table>
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Título</th>
                                <th>Categoría</th>
                                <th>Solicitante</th>
                                <th>Cantidad</th>
                                <th>Urgencia</th>
                                <th>Estado</th>
                                <th>Fecha Creación</th>
                                <th>Fecha Requerida</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${solicitudes.map(s => {
                                const estadoClass = `estado-${s.estado}`;
                                const urgenciaClass = `urgencia-${s.urgencia}`;
                                const estadoTexto = {
                                    'PENDIENTE': 'Pendiente',
                                    'APROBADO': 'Aprobado',
                                    'RECHAZADO': 'Rechazado',
                                    'ENTREGADO': 'Entregado'
                                }[s.estado] || s.estado;
                                
                                const urgenciaTexto = {
                                    'BAJA': 'Baja',
                                    'MEDIA': 'Media',
                                    'ALTA': 'Alta',
                                    'URGENTE': 'Urgente'
                                }[s.urgencia] || s.urgencia;
                                
                                return `
                                    <tr>
                                        <td>${s.numero || 'N/A'}</td>
                                        <td>${s.titulo || 'N/A'}</td>
                                        <td>${s.categoria?.nombre || 'N/A'}</td>
                                        <td>${s.solicitante?.correo?.split('@')[0] || 'N/A'}</td>
                                        <td class="text-center">${s.cantidad_solicitada || 0}</td>
                                        <td><span class="badge-urgencia ${urgenciaClass}">${urgenciaTexto}</span></td>
                                        <td><span class="badge-estado ${estadoClass}">${estadoTexto}</span></td>
                                        <td>${new Date(s.creado_el).toLocaleDateString()}</td>
                                        <td>${s.fecha_requerida ? new Date(s.fecha_requerida).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Reporte generado automáticamente por el Sistema de Gestión de Activos TI - Gallos Mármol</p>
                        <p>Este reporte incluye todas las solicitudes asignadas a ${usuarioActual?.empleados?.nombre_completo || usuarioActual?.correo || 'usted'}</p>
                    </div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="background: #39080a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 0 5px;">
                        <i class="fas fa-print"></i> Imprimir / Guardar PDF
                    </button>
                    <button onclick="window.close()" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 0 5px;">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </body>
            </html>
        `;
        
        // Abrir ventana para impresión/PDF
        const ventana = window.open('', '_blank');
        ventana.document.write(html);
        ventana.document.close();
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${solicitudes.length} solicitudes a PDF`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a PDF:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// ==================== DASHBOARD DE MÉTRICAS DE SOLICITUDES ====================
async function cargarVistaMetricasSolicitudes() {
    mostrarLoading('Cargando métricas...');
    
    try {
        // Verificar permisos (solo administrador)
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        // Obtener métricas
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);
        
        // Solicitudes por estado
        const { data: porEstado } = await window.supabaseClient
            .from('solicitudes')
            .select('estado, count')
            .select('estado', { count: 'exact', head: false });
        
        const { data: solicitudesRecientes } = await window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                solicitante:solicitante_id (correo)
            `)
            .gte('creado_el', fechaInicio.toISOString())
            .order('creado_el', { ascending: false })
            .limit(10);
        
        // Solicitudes por responsable
        const { data: porResponsable } = await window.supabaseClient
            .from('solicitudes')
            .select('responsable_seleccionado_id, count')
            .select('responsable_seleccionado_id', { count: 'exact', head: false });
        
        // Solicitudes por categoría
        const { data: porCategoria } = await window.supabaseClient
            .from('solicitudes')
            .select('categoria_id, count')
            .select('categoria_id', { count: 'exact', head: false });
        
        // Tiempo promedio de respuesta
        const { data: tiemposRespuesta } = await window.supabaseClient
            .from('solicitudes')
            .select('creado_el, fecha_aprobacion, fecha_rechazo')
            .not('fecha_aprobacion', 'is', null);
        
        let tiempoPromedio = 'N/A';
        if (tiemposRespuesta && tiemposRespuesta.length > 0) {
            let totalDias = 0;
            tiemposRespuesta.forEach(t => {
                const fechaCreacion = new Date(t.creado_el);
                const fechaRespuesta = new Date(t.fecha_aprobacion || t.fecha_rechazo);
                const diffDias = Math.ceil((fechaRespuesta - fechaCreacion) / (1000 * 60 * 60 * 24));
                totalDias += diffDias;
            });
            const promedio = totalDias / tiemposRespuesta.length;
            tiempoPromedio = `${promedio.toFixed(1)} días`;
        }
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                    <i class="fas fa-chart-line"></i> Métricas de Solicitudes
                </h1>
                <p class="text-gray-500 text-sm mt-1">Análisis estadístico de solicitudes</p>
            </div>
            
            <!-- KPIs principales -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${porEstado?.length || 0}</p>
                    <p class="text-xs text-gray-500">Total Solicitudes</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                    <p class="text-2xl font-bold text-orange-600">${porEstado?.filter(e => e.estado === 'PENDIENTE').length || 0}</p>
                    <p class="text-xs text-gray-500">Pendientes</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${porEstado?.filter(e => e.estado === 'APROBADO').length || 0}</p>
                    <p class="text-xs text-gray-500">Aprobadas</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                    <p class="text-2xl font-bold text-blue-600">${tiempoPromedio}</p>
                    <p class="text-xs text-gray-500">Tiempo promedio respuesta</p>
                </div>
            </div>
            
            <!-- Gráficos -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3">📊 Solicitudes por Estado</h3>
                    <canvas id="chartEstadoSolicitudes" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3">🏷️ Solicitudes por Categoría</h3>
                    <canvas id="chartCategoriaSolicitudes" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 lg:col-span-2">
                    <h3 class="font-semibold text-gray-700 mb-3">📋 Solicitudes Recientes (últimos 30 días)</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium">N°</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium">Título</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium">Categoría</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium">Solicitante</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium">Estado</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium">Fecha</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${solicitudesRecientes?.map(s => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-2 text-sm">${s.numero || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm font-medium text-primary">${s.titulo || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${s.categoria?.nombre || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${s.solicitante?.correo?.split('@')[0] || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${s.estado || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${new Date(s.creado_el).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Inicializar gráficos
        if (typeof Chart !== 'undefined') {
            // Gráfico de estados
            const estadosCount = {
                'PENDIENTE': porEstado?.filter(e => e.estado === 'PENDIENTE').length || 0,
                'APROBADO': porEstado?.filter(e => e.estado === 'APROBADO').length || 0,
                'RECHAZADO': porEstado?.filter(e => e.estado === 'RECHAZADO').length || 0,
                'ENTREGADO': porEstado?.filter(e => e.estado === 'ENTREGADO').length || 0
            };
            
            new Chart(document.getElementById('chartEstadoSolicitudes'), {
                type: 'doughnut',
                data: {
                    labels: ['Pendientes', 'Aprobadas', 'Rechazadas', 'Entregadas'],
                    datasets: [{
                        data: [estadosCount.PENDIENTE, estadosCount.APROBADO, estadosCount.RECHAZADO, estadosCount.ENTREGADO],
                        backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar métricas: ' + error.message);
    }
}

// ==================== FUNCIONES AUXILIARES PARA SOLICITUDES ====================

// ==================== OBTENER VALORES ÚNICOS PARA FILTROS ====================
async function obtenerValoresUnicosSolicitudes() {
    try {
        console.log('🔍 Obteniendo valores únicos para filtros de solicitudes...');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // Consulta base
        let query = window.supabaseClient
            .from('solicitudes')
            .select(`
                estado,
                categoria_id,
                urgencia,
                solicitud_categorias (id, nombre)
            `);
        
        // Si no es admin, solo sus solicitudes
        if (!esAdmin) {
            query = query.eq('solicitante_id', usuarioActual.id);
        }
        
        const { data: solicitudes, error } = await query;
        
        if (error) {
            console.error('Error obteniendo solicitudes:', error);
            return { estados: [], categorias: [], urgencias: [] };
        }
        
        console.log('📊 Solicitudes encontradas para filtros:', solicitudes?.length || 0);
        
        // ============================================
        // ESTADOS ÚNICOS
        // ============================================
        const estadosSet = new Set();
        solicitudes?.forEach(s => {
            if (s.estado) estadosSet.add(s.estado);
        });
        
        // Orden de estados predefinido
        const ordenEstados = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'ENTREGADO'];
        const estados = [];
        ordenEstados.forEach(estado => {
            if (estadosSet.has(estado)) {
                estados.push(estado);
            }
        });
        
        console.log('📊 Estados únicos:', estados);
        
        // ============================================
        // CATEGORÍAS ÚNICAS
        // ============================================
        const categoriasMap = new Map();
        solicitudes?.forEach(s => {
            if (s.categoria_id && s.solicitud_categorias) {
                categoriasMap.set(s.categoria_id, {
                    id: s.categoria_id,
                    nombre: s.solicitud_categorias.nombre
                });
            }
        });
        
        const categorias = Array.from(categoriasMap.values())
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log('📊 Categorías únicas:', categorias.length);
        
        // ============================================
        // URGENCIAS ÚNICAS
        // ============================================
        const urgenciasSet = new Set();
        solicitudes?.forEach(s => {
            if (s.urgencia) urgenciasSet.add(s.urgencia);
        });
        
        // Orden de urgencias predefinido
        const ordenUrgencias = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA'];
        const urgencias = [];
        ordenUrgencias.forEach(urgencia => {
            if (urgenciasSet.has(urgencia)) {
                urgencias.push(urgencia);
            }
        });
        
        console.log('📊 Urgencias únicas:', urgencias);
        
        return { estados, categorias, urgencias };
        
    } catch (error) {
        console.error('Error en obtenerValoresUnicosSolicitudes:', error);
        return { estados: [], categorias: [], urgencias: [] };
    }
}

// ==================== ACTUALIZAR BADGE DE FILTROS ====================
function actualizarBadgeFiltrosSolicitudes() {
    let activos = 0;
    if (document.getElementById('filtroEstado')?.value) activos++;
    if (document.getElementById('filtroCategoria')?.value) activos++;
    if (document.getElementById('filtroUrgencia')?.value) activos++;
    if (document.getElementById('filtroFechaDesdeSolicitud')?.value) activos++;
    if (document.getElementById('filtroFechaHastaSolicitud')?.value) activos++;
    if (document.getElementById('busquedaSolicitudes')?.value) activos++;
    
    const badge = document.getElementById('filtrosSolicitudesBadge');
    if (badge) {
        if (activos > 0) {
            badge.textContent = activos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// Guardar filtros globales
function guardarFiltrosSolicitudesGlobales() {
    filtrosSolicitudesGlobal = {
        estado: document.getElementById('filtroEstado')?.value || '',
        categoria: document.getElementById('filtroCategoria')?.value || '',
        urgencia: document.getElementById('filtroUrgencia')?.value || '',
        fechaDesde: document.getElementById('filtroFechaDesdeSolicitud')?.value || '',
        fechaHasta: document.getElementById('filtroFechaHastaSolicitud')?.value || '',
        busqueda: document.getElementById('busquedaSolicitudes')?.value || ''
    };
    console.log('💾 Filtros solicitudes guardados:', filtrosSolicitudesGlobal);
}

// Toggle panel de filtros
window.toggleFiltrosSolicitudesPanel = function() {
    const panel = document.getElementById('panelFiltrosSolicitudes');
    const icon = document.getElementById('filtrosSolicitudesIcon');
    
    if (!panel) return;
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.style.display = '';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        panel.classList.add('hidden');
        panel.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

// ==================== PAGINACIÓN Y VISTAS ====================
function generarPaginadorSolicitudes() {
    let html = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualSolicitudes - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginasSolicitudes, inicio + maxBotones - 1);
    
    if (fin - inicio + 1 < maxBotones) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
        html += `
            <button onclick="cambiarPaginaSolicitudes(${i})" 
                    class="px-3 py-1 rounded-lg ${i === paginaActualSolicitudes ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                ${i}
            </button>
        `;
    }
    return html;
}

window.cambiarPaginaSolicitudes = async function(pagina) {
    if (pagina < 1 || pagina > totalPaginasSolicitudes) return;
    if (pagina === paginaActualSolicitudes) return;
    
    const scrollY = window.scrollY;
    paginaActualSolicitudes = pagina;
    
    await cargarVistaSolicitudes();
    setTimeout(() => window.scrollTo(0, scrollY), 100);
};

window.toggleVistaSolicitudes = async function(vista) {
    vistaSolicitudesActual = vista;
    await cargarVistaSolicitudes();
};

// ==================== FUNCIONES DE FILTROS ====================
function inicializarEventosFiltrosSolicitudes() {
    const inputs = ['filtroEstado', 'filtroCategoria', 'filtroUrgencia', 'filtroFechaDesdeSolicitud', 'filtroFechaHastaSolicitud', 'busquedaSolicitudes'];
    
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.removeEventListener('change', aplicarFiltrosSolicitudes);
            elemento.removeEventListener('input', aplicarFiltrosSolicitudes);
            elemento.addEventListener('change', aplicarFiltrosSolicitudes);
            if (id === 'busquedaSolicitudes') {
                elemento.addEventListener('input', aplicarFiltrosSolicitudes);
            }
        }
    });
}

// ==================== APLICAR FILTROS (con parámetro true) ====================
window.aplicarFiltrosSolicitudes = function() {
    console.log('🔍 Aplicando filtros de solicitudes...');
    paginaActualSolicitudes = 1;
    guardarFiltrosSolicitudesGlobales();
    cargarVistaSolicitudes(true); // ← Pasar true para aplicar filtros
};

// ==================== LIMPIAR FILTROS ====================
window.limpiarFiltrosSolicitudes = function() {
    console.log('🧹 Limpiando filtros de solicitudes...');
    
    const filtrosIds = ['filtroEstado', 'filtroCategoria', 'filtroUrgencia', 'filtroFechaDesdeSolicitud', 'filtroFechaHastaSolicitud'];
    
    filtrosIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const busqueda = document.getElementById('busquedaSolicitudes');
    if (busqueda) busqueda.value = '';
    
    paginaActualSolicitudes = 1;
    guardarFiltrosSolicitudesGlobales();
    cargarVistaSolicitudes(false); // ← Pasar false para NO aplicar filtros (mostrar todos)
};

// ==================== EXPORTAR SOLICITUDES A EXCEL ====================
window.exportarSolicitudesExcel = async function() {
    mostrarLoading('Generando archivo Excel...');
    
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden exportar', 'error');
            ocultarLoading();
            return;
        }
        
        // Obtener solicitudes con filtros actuales
        const solicitudes = await obtenerSolicitudesConFiltrosActuales();
        
        if (!solicitudes || solicitudes.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay solicitudes para exportar con los filtros seleccionados', 'info');
            return;
        }
        
        const datos = solicitudes.map(s => ({
            'N° SOLICITUD': s.numero,
            'TÍTULO': s.titulo,
            'DESCRIPCIÓN': s.descripcion,
            'CATEGORÍA': s.categoria_nombre,
            'CONSUMIBLE': s.consumible_nombre,
            'CANTIDAD': s.cantidad_solicitada,
            'URGENCIA': s.urgencia,
            'ESTADO': s.estado,
            'SOLICITANTE': s.solicitante_nombre,
            'FECHA CREACIÓN': s.fecha_creacion,
            'FECHA REQUERIDA': s.fecha_requerida
        }));
        
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');
        
        const colWidths = [
            { wch: 15 }, { wch: 40 }, { wch: 50 }, { wch: 20 },
            { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
            { wch: 25 }, { wch: 20 }, { wch: 15 }
        ];
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `solicitudes_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} solicitudes a Excel con los filtros aplicados`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// ==================== EXPORTAR SOLICITUDES A PDF ====================
window.exportarSolicitudesPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden exportar', 'error');
            ocultarLoading();
            return;
        }
        
        const solicitudes = await obtenerSolicitudesConFiltrosActuales();
        
        if (!solicitudes || solicitudes.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay solicitudes para exportar con los filtros seleccionados', 'info');
            return;
        }
        
        const total = solicitudes.length;
        const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
        const aprobadas = solicitudes.filter(s => s.estado === 'APROBADO').length;
        const rechazadas = solicitudes.filter(s => s.estado === 'RECHAZADO').length;
        const urgentes = solicitudes.filter(s => s.urgencia === 'URGENTE').length;
        
        const resumenFiltros = [];
        if (filtrosSolicitudesGlobal.estado) resumenFiltros.push(`Estado: ${filtrosSolicitudesGlobal.estado}`);
        if (filtrosSolicitudesGlobal.categoria) resumenFiltros.push(`Categoría seleccionada`);
        if (filtrosSolicitudesGlobal.urgencia) resumenFiltros.push(`Urgencia: ${filtrosSolicitudesGlobal.urgencia}`);
        if (filtrosSolicitudesGlobal.fechaDesde) resumenFiltros.push(`Desde: ${filtrosSolicitudesGlobal.fechaDesde}`);
        if (filtrosSolicitudesGlobal.fechaHasta) resumenFiltros.push(`Hasta: ${filtrosSolicitudesGlobal.fechaHasta}`);
        if (filtrosSolicitudesGlobal.busqueda) resumenFiltros.push(`Búsqueda: ${filtrosSolicitudesGlobal.busqueda}`);
        const textoFiltros = resumenFiltros.length > 0 ? resumenFiltros.join(', ') : 'Ninguno (todas las solicitudes)';
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Solicitudes</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #39080a; text-align: center; }
                    .filtros { background: #f0f0f0; padding: 10px; margin: 15px 0; border-radius: 5px; font-size: 12px; }
                    .stats { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
                    .stat { background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; flex: 1; min-width: 80px; border-left: 3px solid #39080a; }
                    .stat .number { font-size: 22px; font-weight: bold; color: #39080a; }
                    .stat .label { font-size: 11px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                    th { background: #39080a; color: white; padding: 8px; text-align: left; }
                    td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; }
                </style>
            </head>
            <body>
                <h1>REPORTE DE SOLICITUDES</h1>
                <p style="text-align:center">Generado: ${new Date().toLocaleString('es-ES')}</p>
                <div class="filtros"><strong>📊 Filtros aplicados:</strong> ${textoFiltros}</div>
                <div class="stats">
                    <div class="stat"><div class="number">${total}</div><div class="label">Total</div></div>
                    <div class="stat"><div class="number">${pendientes}</div><div class="label">Pendientes</div></div>
                    <div class="stat"><div class="number">${aprobadas}</div><div class="label">Aprobadas</div></div>
                    <div class="stat"><div class="number">${rechazadas}</div><div class="label">Rechazadas</div></div>
                    <div class="stat"><div class="number">${urgentes}</div><div class="label">Urgentes</div></div>
                </div>
                <table>
                    <thead><tr>
                        <th>N°</th><th>TÍTULO</th><th>CATEGORÍA</th><th>CONSUMIBLE</th><th>CANT</th><th>URGENCIA</th><th>ESTADO</th><th>SOLICITANTE</th><th>FECHA</th>
                    </tr></thead>
                    <tbody>
                        ${solicitudes.map(s => `
                            <tr>
                                <td>${s.numero}</td>
                                <td><strong>${s.titulo.substring(0, 60)}</strong>${s.titulo.length > 60 ? '...' : ''}</td>
                                <td>${s.categoria_nombre}</td>
                                <td>${s.consumible_nombre || '-'}</td>
                                <td>${s.cantidad_solicitada}</td>
                                <td>${s.urgencia}</td>
                                <td>${s.estado}</td>
                                <td>${s.solicitante_nombre}</td>
                                <td>${s.fecha_creacion}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">Sistema de Gestión de Activos TI - Gallos Mármol</div>
            </body>
            </html>
        `;
        
        const ventana = window.open('', '_blank');
        ventana.document.write(html);
        ventana.document.close();
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${solicitudes.length} solicitudes a PDF con los filtros aplicados`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// ==================== OBTENER SOLICITUDES CON FILTROS ACTUALES ====================
async function obtenerSolicitudesConFiltrosActuales() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('solicitudes')
            .select(`
                *,
                categoria:solicitud_categorias(id, nombre),
                consumible:consumibles(id, nombre, codigo),
                solicitante:solicitante_id(id, correo)
            `);
        
        if (!esAdmin) {
            query = query.eq('solicitante_id', usuarioActual.id);
        }
        
        // Aplicar filtros globales
        if (filtrosSolicitudesGlobal.estado && filtrosSolicitudesGlobal.estado !== '') {
            query = query.eq('estado', filtrosSolicitudesGlobal.estado);
        }
        if (filtrosSolicitudesGlobal.categoria && filtrosSolicitudesGlobal.categoria !== '') {
            query = query.eq('categoria_id', filtrosSolicitudesGlobal.categoria);
        }
        if (filtrosSolicitudesGlobal.urgencia && filtrosSolicitudesGlobal.urgencia !== '') {
            query = query.eq('urgencia', filtrosSolicitudesGlobal.urgencia);
        }
        if (filtrosSolicitudesGlobal.fechaDesde && filtrosSolicitudesGlobal.fechaDesde !== '') {
            query = query.gte('creado_el', `${filtrosSolicitudesGlobal.fechaDesde}T00:00:00`);
        }
        if (filtrosSolicitudesGlobal.fechaHasta && filtrosSolicitudesGlobal.fechaHasta !== '') {
            query = query.lte('creado_el', `${filtrosSolicitudesGlobal.fechaHasta}T23:59:59`);
        }
        if (filtrosSolicitudesGlobal.busqueda && filtrosSolicitudesGlobal.busqueda !== '') {
            query = query.or(`numero.ilike.%${filtrosSolicitudesGlobal.busqueda}%,titulo.ilike.%${filtrosSolicitudesGlobal.busqueda}%`);
        }
        
        query = query.order('creado_el', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Formatear datos
        const datosFormateados = data?.map(s => ({
            ...s,
            numero: s.numero || s.id.substring(0, 8),
            titulo: s.titulo || 'N/A',
            descripcion: s.descripcion || 'N/A',
            categoria_nombre: s.categoria?.nombre || 'N/A',
            consumible_nombre: s.consumible?.nombre || null,
            cantidad_solicitada: s.cantidad_solicitada || 0,
            urgencia: s.urgencia || 'MEDIA',
            estado: s.estado || 'PENDIENTE',
            solicitante_nombre: s.solicitante?.correo?.split('@')[0] || 'Usuario',
            fecha_creacion: new Date(s.creado_el).toLocaleDateString(),
            fecha_requerida: s.fecha_requerida ? new Date(s.fecha_requerida).toLocaleDateString() : 'N/A'
        })) || [];
        
        return datosFormateados;
        
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        return [];
    }
}