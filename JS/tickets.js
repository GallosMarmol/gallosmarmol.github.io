// ==================== SISTEMA DE GESTIÓN DE TICKETS ====================

// Variables globales
let ticketEditandoId = null;
let categoriasTicket = [];
let comentarioEditandoId = null;
let vistaTicketsActual = 'cards'; // 'tabla' o 'cards'
let paginaActualTickets = 1;
const ITEMS_POR_PAGINA_TICKETS = 12;
let totalTicketsCount = 0;
let totalPaginasTickets = 1;

let filtrosTicketsGuardados = {
    fechaDesde: '',
    fechaHasta: '',
    prioridad: '',
    categoria: '',
    creadoPor: '',
    asignado: '',
    activo: '',
    busqueda: '',
    orden: 'creado_el.desc'
};

// Función para guardar filtros actuales
function guardarFiltrosTickets() {
    filtrosTicketsGuardados = {
        fechaDesde: document.getElementById('filtroFechaDesde')?.value || '',
        fechaHasta: document.getElementById('filtroFechaHasta')?.value || '',
        prioridad: document.getElementById('filtroPrioridad')?.value || '',
        categoria: document.getElementById('filtroCategoria')?.value || '',
        creadoPor: document.getElementById('filtroCreadoPor')?.value || '',
        asignado: document.getElementById('filtroAsignado')?.value || '',
        activo: document.getElementById('filtroActivo')?.value || '',
        busqueda: document.getElementById('busquedaTickets')?.value || '',
        orden: document.getElementById('ordenTickets')?.value || 'creado_el.desc'
    };
    console.log('💾 Filtros guardados:', filtrosTicketsGuardados);
    
    // También guardar en localStorage para persistencia
    localStorage.setItem('filtrosTickets', JSON.stringify(filtrosTicketsGuardados));
}

// Función para cargar filtros guardados
function cargarFiltrosGuardados() {
    const guardados = localStorage.getItem('filtrosTickets');
    if (guardados) {
        try {
            const filtros = JSON.parse(guardados);
            if (document.getElementById('filtroFechaDesde')) document.getElementById('filtroFechaDesde').value = filtros.fechaDesde || '';
            if (document.getElementById('filtroFechaHasta')) document.getElementById('filtroFechaHasta').value = filtros.fechaHasta || '';
            if (document.getElementById('filtroPrioridad')) document.getElementById('filtroPrioridad').value = filtros.prioridad || '';
            if (document.getElementById('filtroCategoria')) document.getElementById('filtroCategoria').value = filtros.categoria || '';
            if (document.getElementById('filtroCreadoPor')) document.getElementById('filtroCreadoPor').value = filtros.creadoPor || '';
            if (document.getElementById('filtroAsignado')) document.getElementById('filtroAsignado').value = filtros.asignado || '';
            if (document.getElementById('filtroActivo')) document.getElementById('filtroActivo').value = filtros.activo || '';
            if (document.getElementById('busquedaTickets')) document.getElementById('busquedaTickets').value = filtros.busqueda || '';
            if (document.getElementById('ordenTickets')) document.getElementById('ordenTickets').value = filtros.orden || 'creado_el.desc';
            filtrosTicketsGuardados = filtros;
            console.log('🔄 Filtros cargados desde localStorage:', filtros);
        } catch(e) { console.error('Error cargando filtros:', e); }
    }
}

// Exponer funciones globalmente
window.guardarFiltrosTickets = guardarFiltrosTickets;
window.cargarFiltrosGuardados = cargarFiltrosGuardados;
window.obtenerFiltrosGuardados = () => filtrosTicketsGuardados;

async function cargarVistaTickets() {
    mostrarLoading('Cargando tickets...');
    
    try {
        console.log('%c🎫 CARGANDO TICKETS', 'background: #e83e8c; color: white; font-size: 14px;');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // ============================================
        // LEER FILTROS ACTUALES DEL DOM
        // ============================================
        const filtroFechaDesde = document.getElementById('filtroFechaDesde')?.value;
        const filtroFechaHasta = document.getElementById('filtroFechaHasta')?.value;
        const filtroPrioridad = document.getElementById('filtroPrioridad')?.value;
        const filtroCategoria = document.getElementById('filtroCategoria')?.value;
        const filtroCreadoPor = document.getElementById('filtroCreadoPor')?.value;
        const filtroAsignado = document.getElementById('filtroAsignado')?.value;
        const filtroActivo = document.getElementById('filtroActivo')?.value;
        const busqueda = document.getElementById('busquedaTickets')?.value;
        const ordenSelect = document.getElementById('ordenTickets');
        const orden = ordenSelect?.value || 'creado_el.desc';
        
        // ============================================
        // PASO 1: OBTENER TICKETS PAGINADOS (para mostrar)
        // ============================================
        let query = window.supabaseClient
            .from('tickets')
            .select(`
                *,
                categoria:ticket_categorias!categoria_id (id, nombre, color, icono),
                creador:creado_por (id, correo),
                asignado:asignado_a (id, correo),
                activo:activo_id (id, nombre, codigo_activo)
            `, { count: 'exact' });
        
        // Si no es administrador, solo ver sus tickets
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        // Aplicar filtros a la consulta principal
        if (filtroFechaDesde && filtroFechaDesde !== '') {
            query = query.gte('creado_el', `${filtroFechaDesde}T00:00:00`);
        }
        if (filtroFechaHasta && filtroFechaHasta !== '') {
            query = query.lte('creado_el', `${filtroFechaHasta}T23:59:59`);
        }
        if (filtroPrioridad && filtroPrioridad !== '') {
            query = query.eq('prioridad', filtroPrioridad);
        }
        if (filtroCategoria && filtroCategoria !== '') {
            query = query.eq('categoria_id', filtroCategoria);
        }
        if (filtroCreadoPor && filtroCreadoPor !== '') {
            query = query.eq('creado_por', filtroCreadoPor);
        }
        if (filtroAsignado && filtroAsignado !== '') {
            query = query.eq('asignado_a', filtroAsignado);
        }
        if (filtroActivo && filtroActivo !== '') {
            query = query.eq('activo_id', filtroActivo);
        }
        if (busqueda && busqueda !== '') {
            query = query.or(`titulo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
        }
        
        // Aplicar ordenamiento
        const [campoOrden, direccion] = orden.split('.');
        query = query.order(campoOrden, { ascending: direccion === 'asc' });
        
        // Aplicar paginación
        const desde = (paginaActualTickets - 1) * ITEMS_POR_PAGINA_TICKETS;
        const hasta = desde + ITEMS_POR_PAGINA_TICKETS - 1;
        query = query.range(desde, hasta);
        
        const { data: tickets, count, error } = await query;
        
        if (error) throw error;
        
        totalTicketsCount = count || 0;
        totalPaginasTickets = Math.ceil(totalTicketsCount / ITEMS_POR_PAGINA_TICKETS);
        
        // ============================================
        // PASO 2: OBTENER VALORES ÚNICOS PARA FILTROS (sin paginación)
        // ============================================
        let queryUnicos = window.supabaseClient
            .from('tickets')
            .select(`
                prioridad,
                categoria_id,
                creado_por,
                asignado_a,
                activo_id,
                categoria:ticket_categorias!categoria_id (id, nombre, color, icono)
            `);
        
        if (!esAdmin) {
            queryUnicos = queryUnicos.eq('creado_por', usuarioActual.id);
        }
        
        // Aplicar LOS MISMOS filtros a la consulta de valores únicos (excepto paginación)
        if (filtroFechaDesde && filtroFechaDesde !== '') {
            queryUnicos = queryUnicos.gte('creado_el', `${filtroFechaDesde}T00:00:00`);
        }
        if (filtroFechaHasta && filtroFechaHasta !== '') {
            queryUnicos = queryUnicos.lte('creado_el', `${filtroFechaHasta}T23:59:59`);
        }
        if (filtroPrioridad && filtroPrioridad !== '') {
            queryUnicos = queryUnicos.eq('prioridad', filtroPrioridad);
        }
        if (filtroCategoria && filtroCategoria !== '') {
            queryUnicos = queryUnicos.eq('categoria_id', filtroCategoria);
        }
        if (filtroCreadoPor && filtroCreadoPor !== '') {
            queryUnicos = queryUnicos.eq('creado_por', filtroCreadoPor);
        }
        if (filtroAsignado && filtroAsignado !== '') {
            queryUnicos = queryUnicos.eq('asignado_a', filtroAsignado);
        }
        if (filtroActivo && filtroActivo !== '') {
            queryUnicos = queryUnicos.eq('activo_id', filtroActivo);
        }
        if (busqueda && busqueda !== '') {
            queryUnicos = queryUnicos.or(`titulo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
        }
        
        const { data: ticketsUnicos, error: errorUnicos } = await queryUnicos;
        
        if (errorUnicos) {
            console.warn('Error obteniendo valores únicos:', errorUnicos);
        }
        
        // ============================================
        // PASO 3: CALCULAR VALORES ÚNICOS
        // ============================================
        
        // Prioridades únicas
        const prioridadesUnicas = [...new Set(ticketsUnicos?.map(t => t.prioridad).filter(p => p))];
        const ordenPrioridad = { 'URGENTE': 1, 'ALTA': 2, 'MEDIA': 3, 'BAJA': 4 };
        prioridadesUnicas.sort((a, b) => (ordenPrioridad[a] || 99) - (ordenPrioridad[b] || 99));
        
        // Categorías únicas
        const categoriasMap = new Map();
        ticketsUnicos?.forEach(t => {
            if (t.categoria_id && t.categoria) {
                categoriasMap.set(t.categoria_id, {
                    id: t.categoria_id,
                    nombre: t.categoria.nombre,
                    color: t.categoria.color,
                    icono: t.categoria.icono
                });
            }
        });
        const categoriasUnicas = Array.from(categoriasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // ============================================
        // USUARIOS ÚNICOS - SEPARADOS POR CREADO POR Y ASIGNADO A
        // ============================================
        
        // Usuarios que han CREADO tickets (para filtro "Creado por")
        const creadoresIds = new Set();
        ticketsUnicos?.forEach(t => {
            if (t.creado_por) creadoresIds.add(t.creado_por);
        });
        
        // Usuarios que están ASIGNADOS a tickets (para filtro "Asignado a")
        const asignadosIds = new Set();
        ticketsUnicos?.forEach(t => {
            if (t.asignado_a) asignadosIds.add(t.asignado_a);
        });
        
        // Obtener nombres de todos los usuarios involucrados
        const todosIds = new Set([...creadoresIds, ...asignadosIds]);
        const nombresMap = await obtenerNombresUsuariosEnLote(Array.from(todosIds));
        
        // Opciones para "Creado por" - solo usuarios que aparecen en creado_por
        const creadoresUnicos = Array.from(creadoresIds).map(id => ({
            id: id,
            nombre: nombresMap.get(id) || id
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // Opciones para "Asignado a" - solo usuarios que aparecen en asignado_a
        const asignadosUnicos = Array.from(asignadosIds).map(id => ({
            id: id,
            nombre: nombresMap.get(id) || id
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // ============================================
        // ACTIVOS ÚNICOS PARA FILTRO "ACTIVO ASOCIADO"
        // ============================================
        
        // Obtener IDs de activos únicos que aparecen en los tickets actuales
        const activosIds = new Set();
        ticketsUnicos?.forEach(t => {
            if (t.activo_id) activosIds.add(t.activo_id);
        });
        
        // Obtener información completa de esos activos
        let activosUnicos = [];
        if (activosIds.size > 0) {
            const { data: activos, error: errorActivos } = await window.supabaseClient
                .from('activos')
                .select('id, nombre, codigo_activo, estado')
                .in('id', Array.from(activosIds))
                .order('nombre');
            
            if (!errorActivos && activos) {
                activosUnicos = activos;
            }
        }
        
        // Generar opciones para el select de activos
        const activosOpciones = activosUnicos.length > 0 
            ? activosUnicos.map(a => `<option value="${a.id}">${a.nombre} (${a.codigo_activo || 'Sin código'})</option>`).join('')
            : '<option value="" disabled>No hay activos asociados</option>';
        
        // ============================================
        // PASO 4: OBTENER NOMBRES DE USUARIOS PARA LOS TICKETS MOSTRADOS
        // ============================================
        const usuariosIdsTickets = new Set();
        tickets?.forEach(t => {
            if (t.creado_por) usuariosIdsTickets.add(t.creado_por);
            if (t.asignado_a) usuariosIdsTickets.add(t.asignado_a);
        });
        
        const nombresMapTickets = await obtenerNombresUsuariosEnLote(Array.from(usuariosIdsTickets));
        
        function obtenerNombre(userId) {
            if (!userId) return 'Sistema';
            return nombresMapTickets.get(userId) || userId;
        }
        
        // ============================================
        // PASO 5: ESTADÍSTICAS
        // ============================================
        const totalTickets = totalTicketsCount;
        const ticketsAbiertos = tickets?.filter(t => t.estado === 'ABIERTO').length || 0;
        const ticketsEnProceso = tickets?.filter(t => t.estado === 'EN_PROCESO').length || 0;
        const ticketsResueltos = tickets?.filter(t => t.estado === 'RESUELTO').length || 0;
        const ticketsUrgentes = tickets?.filter(t => t.prioridad === 'URGENTE' && t.estado !== 'CERRADO').length || 0;
        
        // ============================================
        // PASO 6: GENERAR OPCIONES DE FILTROS DINÁMICOS
        // ============================================
        const categoriasOptions = categoriasUnicas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const prioridadesOptions = prioridadesUnicas.map(p => {
            const nombre = { 'BAJA': 'Baja', 'MEDIA': 'Media', 'ALTA': 'Alta', 'URGENTE': 'Urgente' }[p] || p;
            return `<option value="${p}">${nombre}</option>`;
        }).join('');
        const creadoresOptions = creadoresUnicos.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
        const asignadosOptions = asignadosUnicos.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
        
        console.log('📊 Valores únicos para filtros:', {
            prioridades: prioridadesUnicas.length,
            categorias: categoriasUnicas.length,
            creadores: creadoresUnicos.length,
            asignados: asignadosUnicos.length,
            activos: activosUnicos.length,
            totalTickets: ticketsUnicos?.length || 0,
            ticketsMostrados: tickets?.length
        });
        
        ocultarLoading();
        
        // ============================================
        // PASO 7: GENERAR HTML
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-ticket-alt"></i> Gestión de Tickets
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Sistema de reporte y seguimiento de incidencias</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        ${esAdmin ? `
                            <button onclick="exportarTicketsExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                                <i class="fas fa-file-excel"></i> Excel
                            </button>
                            <button onclick="exportarTicketsPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                        ` : ''}
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaTickets('tabla')" class="px-3 py-1.5 text-sm ${vistaTicketsActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Tabla">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaTickets('cards')" class="px-3 py-1.5 text-sm ${vistaTicketsActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Cards">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        <button onclick="abrirModalNuevoTicket()" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>Nuevo Ticket
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${totalTickets}</p>
                    <p class="text-xs text-gray-500">Total Tickets</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-orange-500">
                    <p class="text-2xl font-bold text-orange-600">${ticketsAbiertos}</p>
                    <p class="text-xs text-gray-500">Abiertos</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-blue-500">
                    <p class="text-2xl font-bold text-blue-600">${ticketsEnProceso}</p>
                    <p class="text-xs text-gray-500">En Proceso</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-red-500">
                    <p class="text-2xl font-bold text-red-600">${ticketsUrgentes}</p>
                    <p class="text-xs text-gray-500">Urgentes</p>
                </div>
            </div>
            
            <!-- FILTROS AVANZADOS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="window.toggleFiltrosTicketsPanel()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-sliders-h text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosTicketsBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosTicketsIcon"></i>
                </div>
                <div id="panelFiltrosTickets" class="p-4 hidden">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
                            <input type="date" id="filtroFechaDesde" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
                            <input type="date" id="filtroFechaHasta" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Prioridad</label>
                            <select id="filtroPrioridad" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${prioridadesOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                            <select id="filtroCategoria" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${categoriasOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Creado por</label>
                            <select id="filtroCreadoPor" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${creadoresOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Asignado a</label>
                            <select id="filtroAsignado" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${asignadosOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Activo asociado</label>
                            <select id="filtroActivo" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos los activos</option>
                                ${activosOpciones}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Ordenar por</label>
                            <select id="ordenTickets" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="creado_el.desc">📅 Más recientes</option>
                                <option value="creado_el.asc">📅 Más antiguos</option>
                                <option value="prioridad.desc">⚠️ Prioridad (mayor a menor)</option>
                                <option value="prioridad.asc">⚠️ Prioridad (menor a mayor)</option>
                                <option value="titulo.asc">🔤 Título (A-Z)</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button onclick="aplicarFiltrosTickets()" class="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <i class="fas fa-search"></i> Aplicar filtros
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-end mt-4 pt-3 border-t">
                        <button onclick="limpiarFiltrosTickets()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-undo-alt"></i> Limpiar filtros
                        </button>
                    </div>
                    <div class="text-xs text-gray-400 mt-2 pt-2 border-t">
                        <i class="fas fa-info-circle"></i> 
                        Los filtros muestran solo valores existentes en los tickets actuales
                    </div>
                </div>
            </div>
            
            <!-- Búsqueda rápida -->
            <div class="mb-4">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" id="busquedaTickets" placeholder="Buscar por número, título o descripción..." 
                        class="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
                        onkeyup="aplicarFiltrosTickets()">
                </div>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="ticketsContainer">
                ${vistaTicketsActual === 'tabla' 
                    ? generarVistaTablaTickets(tickets, obtenerNombre, esAdmin)
                    : generarVistaCardsTickets(tickets, obtenerNombre, esAdmin)
                }
            </div>
        `;
        
        // Agregar paginación si hay más de una página
        if (totalPaginasTickets > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualTickets - 1) * ITEMS_POR_PAGINA_TICKETS) + 1} - ${Math.min(paginaActualTickets * ITEMS_POR_PAGINA_TICKETS, totalTicketsCount)} de ${totalTicketsCount} tickets
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaTickets(${paginaActualTickets - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualTickets === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorTickets()}
                        </div>
                        <button onclick="cambiarPaginaTickets(${paginaActualTickets + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualTickets === totalPaginasTickets ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Inicializar panel de filtros (oculto por defecto)
        setTimeout(() => {
            const panel = document.getElementById('panelFiltrosTickets');
            if (panel) {
                panel.classList.add('hidden');
                panel.style.display = 'none';
            }
            const icon = document.getElementById('filtrosTicketsIcon');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }, 50);
        
        // Actualizar badge de filtros activos
        actualizarBadgeFiltrosTickets();
        
        // Actualizar filtros globales para exportación
        if (typeof window.actualizarFiltrosTicketsGlobales === 'function') {
            window.actualizarFiltrosTicketsGlobales();
        }
        
        console.log('✅ Vista de tickets cargada correctamente');
        console.log('📊 Tickets mostrados:', tickets?.length, 'de', totalTicketsCount);
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando tickets:', error);
        mostrarError('Error al cargar tickets: ' + error.message);
    }
}

// Exponer función globalmente
window.cargarVistaTickets = cargarVistaTickets;

// Agregar eventos para guardar filtros automáticamente
const inputsFiltros = [
    'filtroFechaDesde', 'filtroFechaHasta', 'filtroPrioridad', 
    'filtroCategoria', 'filtroCreadoPor', 'filtroAsignado', 
    'filtroActivo', 'busquedaTickets', 'ordenTickets'
];

inputsFiltros.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.removeEventListener('change', guardarFiltrosTickets);
        el.removeEventListener('input', guardarFiltrosTickets);
        el.addEventListener('change', guardarFiltrosTickets);
        if (id === 'busquedaTickets') {
            el.addEventListener('input', guardarFiltrosTickets);
        }
    }
});

//----------------------------------------------------

// ==================== OBTENER CATEGORÍAS ÚNICAS ====================
async function obtenerCategoriasUnicas() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('tickets')
            .select('categoria_id, categoria:ticket_categorias!categoria_id (id, nombre)');
        
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Obtener valores únicos de categorías
        const categoriasMap = new Map();
        data?.forEach(t => {
            if (t.categoria_id && t.categoria) {
                categoriasMap.set(t.categoria_id, {
                    id: t.categoria_id,
                    nombre: t.categoria.nombre
                });
            }
        });
        
        const categorias = Array.from(categoriasMap.values());
        categorias.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log('📊 Categorías únicas encontradas:', categorias.length);
        return categorias;
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        return [];
    }
}

// ==================== OBTENER PRIORIDADES ÚNICAS ====================
async function obtenerPrioridadesUnicas() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('tickets')
            .select('prioridad');
        
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Obtener valores únicos
        const prioridades = [...new Set(data?.map(t => t.prioridad).filter(p => p))];
        // Orden personalizado: URGENTE, ALTA, MEDIA, BAJA
        const orden = { 'URGENTE': 1, 'ALTA': 2, 'MEDIA': 3, 'BAJA': 4 };
        prioridades.sort((a, b) => (orden[a] || 99) - (orden[b] || 99));
        
        console.log('📊 Prioridades únicas encontradas:', prioridades);
        return prioridades;
    } catch (error) {
        console.error('Error obteniendo prioridades:', error);
        return ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
    }
}

async function obtenerUsuariosUnicos() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('tickets')
            .select('creado_por, asignado_a');
        
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Recopilar IDs únicos de usuarios
        const usuariosIds = new Set();
        data?.forEach(t => {
            if (t.creado_por) usuariosIds.add(t.creado_por);
            if (t.asignado_a) usuariosIds.add(t.asignado_a);
        });
        
        if (usuariosIds.size === 0) return [];
        
        // Obtener nombres de usuarios
        const usuariosInfo = await obtenerNombresUsuariosEnLote(Array.from(usuariosIds));
        
        const usuarios = Array.from(usuariosIds).map(id => ({
            id: id,
            nombre: usuariosInfo.get(id) || id
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log('📊 Usuarios únicos encontrados:', usuarios.length);
        return usuarios;
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        return [];
    }
}

// ==================== OBTENER USUARIOS ÚNICOS PARA FILTROS ====================
async function obtenerUsuariosUnicosParaFiltros() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('tickets')
            .select('creado_por, asignado_a');
        
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        const { data: tickets, error } = await query;
        
        if (error) throw error;
        
        const usuariosIds = new Set();
        tickets?.forEach(t => {
            if (t.creado_por) usuariosIds.add(t.creado_por);
            if (t.asignado_a) usuariosIds.add(t.asignado_a);
        });
        
        const nombresMap = await obtenerNombresUsuariosEnLote(Array.from(usuariosIds));
        
        const usuarios = Array.from(usuariosIds).map(id => ({
            id: id,
            nombre: nombresMap.get(id) || id
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        return usuarios;
        
    } catch (error) {
        console.error('Error obteniendo usuarios para filtros:', error);
        return [];
    }
}

// ==================== GENERAR VISTA TABLA TICKETS ====================
function generarVistaTablaTickets(tickets, obtenerNombreUsuario, esAdmin) {
    if (!tickets || tickets.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-ticket-alt text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay tickets registrados</p>
                </div>`;
    }
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado por</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado a</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${tickets.map(ticket => {
                            const numeroTicket = ticket.numero || ticket.id.substring(0, 8);
                            const prioridadClass = {
                                'BAJA': 'bg-gray-100 text-gray-700',
                                'MEDIA': 'bg-blue-100 text-blue-700',
                                'ALTA': 'bg-orange-100 text-orange-700',
                                'URGENTE': 'bg-red-100 text-red-700'
                            }[ticket.prioridad] || 'bg-gray-100';
                            
                            const estadoClass = {
                                'ABIERTO': 'bg-orange-100 text-orange-800',
                                'EN_PROCESO': 'bg-blue-100 text-blue-800',
                                'RESUELTO': 'bg-green-100 text-green-800',
                                'CERRADO': 'bg-gray-100 text-gray-800'
                            }[ticket.estado] || 'bg-gray-100';
                            
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-mono">${numeroTicket}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary line-clamp-1">${ticket.titulo || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${ticket.categoria?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs ${prioridadClass}">${ticket.prioridad || 'MEDIA'}</span></td>
                                    <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs ${estadoClass}">${ticket.estado || 'ABIERTO'}</span></td>
                                    <td class="px-4 py-3 text-sm">${obtenerNombreUsuario(ticket.creado_por)}</td>
                                    <td class="px-4 py-3 text-sm">${ticket.asignado_a ? obtenerNombreUsuario(ticket.asignado_a) : '<span class="text-gray-400">Sin asignar</span>'}</td>
                                    <td class="px-4 py-3 text-sm">${new Date(ticket.creado_el).toLocaleDateString()}</td>
                                    <td class="px-4 py-3 text-sm whitespace-nowrap">
                                        <button onclick="verDetalleTicket('${ticket.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== GENERAR VISTA CARDS TICKETS ====================
function generarVistaCardsTickets(tickets, obtenerNombreUsuario, esAdmin) {
    if (!tickets || tickets.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg col-span-full">
                    <i class="fas fa-ticket-alt text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay tickets registrados</p>
                    <button onclick="abrirModalNuevoTicket()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Crear Ticket
                    </button>
                </div>`;
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="ticketsGrid">
            ${tickets.map(ticket => {
                const numeroTicket = ticket.numero || ticket.id.substring(0, 8);
                const tieneAsignado = !!ticket.asignado_a;
                const categoria = ticket.categoria || { nombre: 'INCIDENCIA', color: '#f59e0b', icono: 'fas fa-exclamation-triangle' };
                
                const estadoClass = {
                    'ABIERTO': 'bg-orange-100 text-orange-800',
                    'EN_PROCESO': 'bg-blue-100 text-blue-800',
                    'RESUELTO': 'bg-green-100 text-green-800',
                    'CERRADO': 'bg-gray-100 text-gray-800'
                }[ticket.estado] || 'bg-gray-100';
                
                const prioridadClass = {
                    'BAJA': 'bg-gray-100 text-gray-700',
                    'MEDIA': 'bg-blue-100 text-blue-700',
                    'ALTA': 'bg-orange-100 text-orange-700',
                    'URGENTE': 'bg-red-100 text-red-700'
                }[ticket.prioridad] || 'bg-gray-100';
                
                return `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <i class="${categoria.icono}" style="color: ${categoria.color}"></i>
                                        <span class="text-xs font-medium" style="color: ${categoria.color}">${categoria.nombre}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-mono text-gray-400">${numeroTicket}</span>
                                        <h3 class="font-bold text-primary text-base line-clamp-1">${ticket.titulo || 'Sin título'}</h3>
                                    </div>
                                    <div class="flex flex-wrap gap-1 mt-2">
                                        <span class="estado-badge ${estadoClass} text-xs">${ticket.estado || 'ABIERTO'}</span>
                                        <span class="estado-badge ${prioridadClass} text-xs">${ticket.prioridad || 'MEDIA'}</span>
                                        ${!tieneAsignado ? '<span class="estado-badge bg-orange-100 text-orange-600 text-xs">Sin asignar</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="p-4 space-y-3">
                            <p class="text-sm text-gray-600 line-clamp-2">${ticket.descripcion || 'Sin descripción'}</p>
                            <div class="flex items-center justify-between text-xs text-gray-400">
                                <div class="flex items-center gap-1">
                                    <i class="fas fa-user"></i>
                                    <span class="truncate max-w-[100px]">${obtenerNombreUsuario(ticket.creado_por)}</span>
                                </div>
                                ${ticket.asignado_a ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-user-check"></i>
                                        <span class="truncate max-w-[100px]">${obtenerNombreUsuario(ticket.asignado_a)}</span>
                                    </div>
                                ` : ''}
                                <div class="flex items-center gap-1">
                                    <i class="far fa-calendar-alt"></i>
                                    <span>${new Date(ticket.creado_el).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2 bg-gray-50">
                            <button onclick="verDetalleTicket('${ticket.id}')" class="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== APLICAR FILTROS TICKETS ====================
window.aplicarFiltrosTickets = function() {
    paginaActualTickets = 1;
    cargarVistaTickets();
    // Actualizar filtros globales
    if (typeof window.actualizarFiltrosTicketsGlobales === 'function') {
        setTimeout(() => window.actualizarFiltrosTicketsGlobales(), 100);
    }
};

// ==================== LIMPIAR FILTROS TICKETS ====================
window.limpiarFiltrosTickets = function() {
    const filtrosIds = [
        'filtroFechaDesde', 'filtroFechaHasta', 'filtroPrioridad', 
        'filtroCategoria', 'filtroCreadoPor', 'filtroAsignado', 'filtroActivo'
    ];
    
    filtrosIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') {
                el.value = '';
            } else {
                el.value = '';
            }
        }
    });
    
    const busqueda = document.getElementById('busquedaTickets');
    if (busqueda) busqueda.value = '';
    
    const ordenSelect = document.getElementById('ordenTickets');
    if (ordenSelect) ordenSelect.value = 'creado_el.desc';
    
    // Guardar filtros limpios
    if (typeof guardarFiltrosTickets === 'function') {
        guardarFiltrosTickets();
    }
    
    paginaActualTickets = 1;
    cargarVistaTickets();
};

// ==================== ACTUALIZAR BADGE FILTROS TICKETS ====================
function actualizarBadgeFiltrosTickets() {
    const filtrosIds = [
        'filtroFechaDesde', 'filtroFechaHasta', 'filtroPrioridad', 
        'filtroCategoria', 'filtroCreadoPor', 'filtroAsignado', 'filtroActivo'
    ];
    let activos = 0;
    
    filtrosIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value && el.value !== '') activos++;
    });
    
    const busqueda = document.getElementById('busquedaTickets');
    if (busqueda && busqueda.value && busqueda.value !== '') activos++;
    
    const badge = document.getElementById('filtrosTicketsBadge');
    if (badge) {
        if (activos > 0) {
            badge.textContent = activos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// ==================== TOGGLE PANEL FILTROS TICKETS ====================
window.toggleFiltrosTicketsPanel = function() {
    const panel = document.getElementById('panelFiltrosTickets');
    const icon = document.getElementById('filtrosTicketsIcon');
    
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

// ==================== CAMBIAR PÁGINA TICKETS ====================
window.cambiarPaginaTickets = async function(pagina) {
    if (pagina < 1 || pagina > totalPaginasTickets) return;
    if (pagina === paginaActualTickets) return;
    
    const scrollY = window.scrollY;
    paginaActualTickets = pagina;
    await cargarVistaTickets();
    setTimeout(() => window.scrollTo(0, scrollY), 100);
};

// ==================== CAMBIAR VISTA TICKETS ====================
window.toggleVistaTickets = async function(vista) {
    vistaTicketsActual = vista;
    await cargarVistaTickets();
};

// ==================== GENERAR PAGINADOR TICKETS ====================
function generarPaginadorTickets() {
    let html = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualTickets - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginasTickets, inicio + maxBotones - 1);
    
    if (fin - inicio + 1 < maxBotones) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
        html += `
            <button onclick="cambiarPaginaTickets(${i})" 
                    class="px-3 py-1 rounded-lg ${i === paginaActualTickets ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                ${i}
            </button>
        `;
    }
    return html;
}

// ==================== APLICAR FILTROS Y ORDEN ====================
window.aplicarFiltrosYOrden = function() {
    paginaActualTickets = 1;
    cargarVistaTickets();
};

// ==================== FILTRAR TICKETS POR BÚSQUEDA ====================
window.filtrarTicketsPorBusqueda = function() {
    const busqueda = document.getElementById('busquedaTickets')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#tickets-grid .ticket-card');
    
    cards.forEach(card => {
        const titulo = card.dataset.titulo || '';
        const descripcion = card.dataset.descripcion || '';
        
        if (titulo.includes(busqueda) || descripcion.includes(busqueda) || busqueda === '') {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
};

// ==================== CARGAR CATEGORÍAS DE TICKETS ====================
async function cargarCategoriasTicket() {
    try {
        const { data, error } = await window.supabaseClient
            .from('ticket_categorias')
            .select('*')
            .eq('activo', true)
            .order('orden')
            .order('nombre');
        
        if (error) throw error;
        
        categoriasTicket = data || [];
        return categoriasTicket;
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categoriasTicket = [];
        return [];
    }
}

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarTickets = function(estado) {
    const cards = document.querySelectorAll('#tickets-grid .ticket-card');
    const botones = document.querySelectorAll('.filter-estado-ticket');
    
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === estado) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    
    let contador = 0;
    cards.forEach(card => {
        if (estado === 'todos') {
            card.style.display = '';
            contador++;
        } else if (card.dataset.estado === estado) {
            card.style.display = '';
            contador++;
        } else {
            card.style.display = 'none';
        }
    });
};

// ==================== MODALES ====================

// ==================== ABRIR MODAL NUEVO TICKET ====================
window.abrirModalNuevoTicket = async function() {
    const modal = document.getElementById('ticketModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('ticketModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    ticketEditandoId = null;
    
    const form = document.getElementById('ticketForm');
    if (form) form.reset();
    
    const titleElement = document.getElementById('ticketModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Ticket';
    
    // ============================================
    // LIMPIAR CAMPOS Y RESETEAR VALORES
    // ============================================
    const tituloInput = document.getElementById('ticket_titulo');
    if (tituloInput) tituloInput.value = '';
    
    const descripcionTextarea = document.getElementById('ticket_descripcion');
    if (descripcionTextarea) descripcionTextarea.value = '';
    
    // Cargar categorías en el select
    await cargarCategoriasEnSelect();
    
    // Cargar activos para asociar al ticket
    await cargarActivosSelectTicket('ticket_activo_id', true);
    
    // Obtener permisos para asignación
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    const esAdmin = permisos.rol === 'ADMINISTRADOR';
    
    // ============================================
    // CONFIGURAR SELECT DE ESTADO (solo admin puede cambiarlo)
    // ============================================
    const estadoSelect = document.getElementById('ticket_estado');
    if (estadoSelect) {
        estadoSelect.value = 'ABIERTO';
        if (!esAdmin) {
            estadoSelect.disabled = true;
        } else {
            estadoSelect.disabled = false;
        }
    }
    
    // ============================================
    // CONFIGURAR SELECT DE ASIGNADO A (solo admin)
    // ============================================
    const asignadoSelect = document.getElementById('ticket_asignado_a');
    if (esAdmin) {
        if (asignadoSelect) {
            const opcionesAsignados = await cargarUsuariosSelectOptions();
            asignadoSelect.innerHTML = '<option value="">Sin asignar</option>' + opcionesAsignados;
            asignadoSelect.disabled = false;
        }
    } else {
        if (asignadoSelect) {
            asignadoSelect.innerHTML = '<option value="">No aplica</option>';
            asignadoSelect.disabled = true;
        }
    }
    
    // ============================================
    // OCULTAR/MOSTRAR CONTENEDORES SEGÚN ROL
    // ============================================
    const estadoContainer = document.getElementById('ticket_estado')?.closest('div');
    const asignadoContainer = document.getElementById('ticket_asignado_container');
    
    if (!esAdmin) {
        if (estadoContainer) estadoContainer.classList.add('hidden');
        if (asignadoContainer) asignadoContainer.classList.add('hidden');
    } else {
        if (estadoContainer) estadoContainer.classList.remove('hidden');
        if (asignadoContainer) asignadoContainer.classList.remove('hidden');
    }
    
    // ============================================
    // AGREGAR INDICADOR VISUAL DE MAYÚSCULAS (opcional)
    // ============================================
    agregarIndicadorMayusculas();
    
    // ============================================
    // ABRIR MODAL
    // ============================================
    await window.abrirModal('ticketModal');
    
    // ============================================
    // INICIALIZAR CONVERSIÓN A MAYÚSCULAS EN TIEMPO REAL
    // ============================================
    setTimeout(() => {
        inicializarMayusculasTicket();
    }, 100);
    
    console.log('✅ Modal de nuevo ticket abierto correctamente');
};

// ==================== AGREGAR INDICADOR VISUAL DE MAYÚSCULAS ====================
function agregarIndicadorMayusculas() {
    // Verificar si ya existe el indicador para no duplicar
    if (document.getElementById('indicador-mayusculas-titulo')) return;
    
    const tituloContainer = document.getElementById('ticket_titulo')?.parentNode;
    const descripcionContainer = document.getElementById('ticket_descripcion')?.parentNode;
    
    if (tituloContainer && !tituloContainer.querySelector('.indicador-mayusculas')) {
        const indicador = document.createElement('p');
        indicador.className = 'text-xs text-gray-400 mt-1 indicador-mayusculas';
        indicador.id = 'indicador-mayusculas-titulo';
        indicador.innerHTML = '<i class="fas fa-info-circle"></i> El texto se guardará en MAYÚSCULAS automáticamente';
        tituloContainer.appendChild(indicador);
    }
    
    if (descripcionContainer && !descripcionContainer.querySelector('.indicador-mayusculas')) {
        const indicador = document.createElement('p');
        indicador.className = 'text-xs text-gray-400 mt-1 indicador-mayusculas';
        indicador.id = 'indicador-mayusculas-descripcion';
        indicador.innerHTML = '<i class="fas fa-info-circle"></i> El texto se guardará en MAYÚSCULAS automáticamente';
        descripcionContainer.appendChild(indicador);
    }
}

// ==================== CARGAR CATEGORÍAS EN SELECT ====================
async function cargarCategoriasEnSelect() {
    const select = document.getElementById('ticket_categoria_id');
    if (!select) return;
    
    const categorias = await cargarCategoriasTicket();
    
    select.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        option.dataset.color = cat.color;
        option.dataset.icono = cat.icono;
        select.appendChild(option);
    });
}

// ==================== CRUD TICKETS ====================

// ==================== GUARDAR TICKET ====================
window.guardarTicket = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando ticket...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // ============================================
        // OBTENER VALORES Y CONVERTIR A MAYÚSCULAS
        // ============================================
        const tituloRaw = document.getElementById('ticket_titulo')?.value?.trim();
        const descripcionRaw = document.getElementById('ticket_descripcion')?.value?.trim();
        
        const titulo = tituloRaw ? tituloRaw.toUpperCase() : '';
        const descripcion = descripcionRaw ? descripcionRaw.toUpperCase() : '';
        
        const categoriaId = document.getElementById('ticket_categoria_id')?.value;
        const prioridad = document.getElementById('ticket_prioridad')?.value;
        const asignadoId = document.getElementById('ticket_asignado_a')?.value || null;
        const activoId = document.getElementById('ticket_activo_id')?.value || null;
        
        // ============================================
        // VALIDACIONES
        // ============================================
        if (!titulo) {
            ocultarLoading();
            mostrarAlerta('Error', 'El título es obligatorio', 'error');
            document.getElementById('ticket_titulo').focus();
            return;
        }
        
        if (!descripcion) {
            ocultarLoading();
            mostrarAlerta('Error', 'La descripción es obligatoria', 'error');
            document.getElementById('ticket_descripcion').focus();
            return;
        }
        
        if (!categoriaId) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una categoría', 'error');
            document.getElementById('ticket_categoria_id').focus();
            return;
        }
        
        if (!prioridad) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una prioridad', 'error');
            document.getElementById('ticket_prioridad').focus();
            return;
        }
        
        // ============================================
        // PREPARAR DATOS
        // ============================================
        const data = {
            titulo: titulo,
            descripcion: descripcion,
            categoria_id: categoriaId,
            prioridad: prioridad,
            estado: document.getElementById('ticket_estado')?.value || 'ABIERTO',
            activo_id: activoId
        };
        
        // Solo administradores pueden asignar tickets al crear
        if (esAdmin && asignadoId) {
            data.asignado_a = asignadoId;
        }
        
        // ============================================
        // GUARDAR
        // ============================================
        if (ticketEditandoId) {
            // ============================================
            // MODO EDICIÓN
            // ============================================
            const { data: ticketAnterior, error: errorAnterior } = await window.supabaseClient
                .from('tickets')
                .select('*')
                .eq('id', ticketEditandoId)
                .single();
            
            if (errorAnterior) throw errorAnterior;
            
            // Solo actualizar campos permitidos
            const updateData = {
                titulo: data.titulo,
                descripcion: data.descripcion,
                categoria_id: data.categoria_id,
                prioridad: data.prioridad,
                activo_id: data.activo_id,
                modificado_el: getFechaLocalForDB(),
                modificado_por_usuario: usuarioActual.id
            };
            
            // Solo admin puede cambiar estado y asignado
            if (esAdmin) {
                updateData.estado = data.estado;
                updateData.asignado_a = data.asignado_a;
            }
            
            const { error } = await window.supabaseClient
                .from('tickets')
                .update(updateData)
                .eq('id', ticketEditandoId);
            
            if (error) throw error;
            
            // ============================================
            // REGISTRAR CAMBIOS EN HISTORIAL
            // ============================================
            if (ticketAnterior.titulo !== updateData.titulo) {
                await registrarHistorialTicket(ticketEditandoId, 'titulo', ticketAnterior.titulo, updateData.titulo);
            }
            if (ticketAnterior.descripcion !== updateData.descripcion) {
                await registrarHistorialTicket(ticketEditandoId, 'descripcion', ticketAnterior.descripcion, updateData.descripcion);
            }
            if (ticketAnterior.categoria_id !== updateData.categoria_id) {
                await registrarHistorialTicket(ticketEditandoId, 'categoria', ticketAnterior.categoria_id, updateData.categoria_id);
            }
            if (ticketAnterior.prioridad !== updateData.prioridad) {
                await registrarHistorialTicket(ticketEditandoId, 'prioridad', ticketAnterior.prioridad, updateData.prioridad);
            }
            if (ticketAnterior.activo_id !== updateData.activo_id) {
                await registrarHistorialTicket(ticketEditandoId, 'activo_id', ticketAnterior.activo_id, updateData.activo_id);
            }
            if (esAdmin && ticketAnterior.estado !== updateData.estado) {
                await registrarHistorialTicket(ticketEditandoId, 'estado', ticketAnterior.estado, updateData.estado);
            }
            if (esAdmin && ticketAnterior.asignado_a !== updateData.asignado_a) {
                await registrarHistorialTicket(ticketEditandoId, 'asignado_a', ticketAnterior.asignado_a, updateData.asignado_a);
            }
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Ticket actualizado correctamente', 'success');
            
        } else {
            // ============================================
            // MODO CREACIÓN
            // ============================================
            // Generar número de ticket
            const numeroTicket = await generarNumeroTicket();
            
            data.numero = numeroTicket;
            data.creado_el = getFechaLocalForDB();
            data.creado_por = usuarioActual.id;
            data.creado_por_usuario = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('tickets')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Ticket ${numeroTicket} creado correctamente`, 'success');
        }
        
        cerrarModal('ticketModal');
        ticketEditandoId = null;
        await cargarVistaTickets();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el ticket: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== EDITAR TICKET ====================
window.editarTicket = async function(id) {
    mostrarLoading('Cargando ticket...');
    
    try {
        const { data: ticket, error } = await window.supabaseClient
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        const esCreador = ticket.creado_por === usuarioActual.id;
        const tieneAsignado = !!ticket.asignado_a;
        
        // Verificar permisos para editar
        const puedeEditar = esAdmin || (esCreador && ticket.estado === 'ABIERTO' && tieneAsignado);
        
        if (!puedeEditar) {
            let mensaje = 'No tiene permiso para editar este ticket';
            if (!tieneAsignado) {
                mensaje = 'No se puede editar este ticket porque no tiene un responsable asignado.';
            }
            mostrarAlerta('Acción no permitida', mensaje, 'warning');
            ocultarLoading();
            return;
        }
        
        ticketEditandoId = id;
        
        const titleElement = document.getElementById('ticketModalTitle');
        if (titleElement) titleElement.innerText = 'Editar Ticket';
        
        // Cargar datos en el formulario
        await cargarCategoriasEnSelect();
        await cargarActivosSelectTicket('ticket_activo_id', true);
        
        document.getElementById('ticket_titulo').value = ticket.titulo || '';
        document.getElementById('ticket_descripcion').value = ticket.descripcion || '';
        document.getElementById('ticket_categoria_id').value = ticket.categoria_id || '';
        document.getElementById('ticket_prioridad').value = ticket.prioridad || 'MEDIA';
        document.getElementById('ticket_activo_id').value = ticket.activo_id || '';
        
        // Estado: solo admin puede cambiarlo
        const estadoSelect = document.getElementById('ticket_estado');
        if (estadoSelect) {
            estadoSelect.value = ticket.estado || 'ABIERTO';
            estadoSelect.disabled = !esAdmin;
        }
        
        // Asignado: solo admin puede modificarlo
        const asignadoSelect = document.getElementById('ticket_asignado_a');
        if (asignadoSelect) {
            if (esAdmin) {
                const opcionesAsignados = await cargarUsuariosSelectOptions();
                asignadoSelect.innerHTML = '<option value="">Sin asignar</option>' + opcionesAsignados;
                asignadoSelect.value = ticket.asignado_a || '';
                asignadoSelect.disabled = false;
            } else {
                asignadoSelect.disabled = true;
            }
        }
        
        ocultarLoading();
        await window.abrirModal('ticketModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el ticket', 'error');
    }
};

// ==================== INICIALIZAR CONVERSIÓN A MAYÚSCULAS EN TIEMPO REAL ====================
function inicializarMayusculasTicket() {
    const tituloInput = document.getElementById('ticket_titulo');
    const descripcionTextarea = document.getElementById('ticket_descripcion');
    
    if (tituloInput) {
        // Remover evento anterior si existe
        const nuevoTitulo = tituloInput.cloneNode(true);
        tituloInput.parentNode.replaceChild(nuevoTitulo, tituloInput);
        
        nuevoTitulo.addEventListener('input', function() {
            const cursorPos = this.selectionStart;
            const oldValue = this.value;
            const newValue = oldValue.toUpperCase();
            if (oldValue !== newValue) {
                this.value = newValue;
                this.setSelectionRange(cursorPos, cursorPos);
            }
        });
    }
    
    if (descripcionTextarea) {
        // Remover evento anterior si existe
        const nuevaDescripcion = descripcionTextarea.cloneNode(true);
        descripcionTextarea.parentNode.replaceChild(nuevaDescripcion, descripcionTextarea);
        
        nuevaDescripcion.addEventListener('input', function() {
            const cursorPos = this.selectionStart;
            const oldValue = this.value;
            const newValue = oldValue.toUpperCase();
            if (oldValue !== newValue) {
                this.value = newValue;
                this.setSelectionRange(cursorPos, cursorPos);
            }
        });
    }
    
    console.log('✅ Conversión a mayúsculas en tiempo real inicializada');
}

// Exponer función globalmente
window.inicializarMayusculasTicket = inicializarMayusculasTicket;

window.eliminarTicket = async function(id) {
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    const esAdmin = permisos.rol === 'ADMINISTRADOR';
    
    if (!esAdmin) {
        mostrarAlerta('Error', 'Solo los administradores pueden eliminar tickets', 'error');
        return;
    }
    
    const result = await Swal.fire({
        title: '¿Eliminar ticket?',
        text: 'Esta acción no se puede deshacer',
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
                .from('tickets')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Ticket eliminado correctamente', 'success');
            await cargarVistaTickets();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el ticket', 'error');
        }
    }
};

// ==================== VER DETALLE TICKET ====================
window.verDetalleTicket = async function(id) {
    mostrarLoading('Cargando detalles...');
    
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // Obtener ticket con todas las relaciones
        const { data: ticket, error } = await window.supabaseClient
            .from('tickets')
            .select(`
                *,
                categoria:ticket_categorias!categoria_id (id, nombre, color, icono, descripcion),
                creador:creado_por (id, correo),
                asignado:asignado_a (id, correo),
                activo:activo_id (id, nombre, codigo_activo)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // ============================================
        // DETERMINAR PERMISOS DEL USUARIO ACTUAL
        // ============================================
        const esCreador = ticket.creado_por === usuarioActual.id;
        const esResponsable = ticket.asignado_a === usuarioActual.id;
        const tieneAsignado = !!ticket.asignado_a;
        const ticketCerrado = ticket.estado === 'CERRADO';
        const ticketAbierto = ticket.estado === 'ABIERTO';
        
        // Permisos para comentar
        const puedeComentar = esAdmin || (!ticketCerrado && (esResponsable || esCreador));
        const puedeComentarInterno = esAdmin;
        
        // Permisos para editar
        const puedeEditar = (esCreador && ticketAbierto && tieneAsignado) || esAdmin;
        
        // Permisos para cambiar estado
        const puedeCambiarEstado = esAdmin && tieneAsignado && !ticketCerrado;
        
        // Permisos para valorar
        const puedeValorar = (ticket.estado === 'RESUELTO' || ticket.estado === 'CERRADO') && !ticket.valoracion && esCreador;
        
        console.log('📊 Permisos ticket:', {
            esAdmin,
            esCreador,
            esResponsable,
            ticketCerrado,
            puedeComentar,
            puedeComentarInterno
        });
        
        // Obtener comentarios
        const comentarios = await obtenerComentariosTicket(id);
        
        // Obtener historial
        const { data: historial } = await window.supabaseClient
            .from('ticket_historial')
            .select('*')
            .eq('ticket_id', id)
            .order('fecha_cambio', { ascending: false })
            .limit(10);
        
        // ============================================
        // OBTENER NOMBRES DE USUARIOS
        // ============================================
        const usuariosIds = new Set();
        if (ticket.creado_por) usuariosIds.add(ticket.creado_por);
        if (ticket.asignado_a) usuariosIds.add(ticket.asignado_a);
        
        historial?.forEach(h => {
            if (h.campo === 'asignado_a' || h.campo === 'creado_por' || h.campo === 'modificado_por_usuario') {
                if (h.valor_anterior && h.valor_anterior !== 'null' && h.valor_anterior !== '') {
                    usuariosIds.add(h.valor_anterior);
                }
                if (h.valor_nuevo && h.valor_nuevo !== 'null' && h.valor_nuevo !== '') {
                    usuariosIds.add(h.valor_nuevo);
                }
            }
        });
        
        const nombresMap = await obtenerNombresUsuariosEnLote(Array.from(usuariosIds));
        
        function formatearValorHistorial(campo, valor) {
            if (!valor || valor === 'null' || valor === '') return 'vacío';
            if (campo === 'asignado_a' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) {
                return nombresMap.get(valor) || valor;
            }
            return valor;
        }
        
        // Generar historial HTML
        let historialHtml = '';
        if (historial && historial.length > 0) {
            historialHtml = `
                <details class="mt-3">
                    <summary class="text-xs text-gray-400 cursor-pointer hover:text-primary">
                        Historial de cambios (${historial.length})
                    </summary>
                    <div class="mt-2 space-y-1 text-xs text-gray-500 max-h-32 overflow-y-auto">
                        ${historial.map(h => `
                            <div class="border-b border-gray-100 pb-1 last:border-b-0">
                                <span class="font-mono text-[10px]">${new Date(h.fecha_cambio).toLocaleString()}</span>
                                <span class="ml-2 font-medium">${h.campo}:</span>
                                <span class="ml-1">"${formatearValorHistorial(h.campo, h.valor_anterior)}" → "${formatearValorHistorial(h.campo, h.valor_nuevo)}"</span>
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
        } else {
            historialHtml = '<p class="text-xs text-gray-400 mt-2">Sin cambios registrados</p>';
        }
        
        // Obtener nombres
        let creadorNombre = 'Sistema';
        if (ticket.creado_por) {
            creadorNombre = nombresMap.get(ticket.creado_por) || ticket.creador?.correo || 'Sistema';
        }

        let asignadoNombre = 'No asignado';
        if (ticket.asignado_a) {
            asignadoNombre = nombresMap.get(ticket.asignado_a) || ticket.asignado?.correo || 'No asignado';
        }
        
        const numeroTicket = ticket.numero || ticket.id.substring(0, 8);
        const categoria = ticket.categoria || { nombre: 'INCIDENCIA', color: '#f59e0b', icono: 'fas fa-exclamation-triangle' };
        
        const estadoClass = {
            'ABIERTO': 'bg-orange-100 text-orange-800',
            'EN_PROCESO': 'bg-blue-100 text-blue-800',
            'RESUELTO': 'bg-green-100 text-green-800',
            'CERRADO': 'bg-gray-100 text-gray-800'
        }[ticket.estado] || 'bg-gray-100';
        
        const prioridadClass = {
            'BAJA': 'bg-gray-100 text-gray-700',
            'MEDIA': 'bg-blue-100 text-blue-700',
            'ALTA': 'bg-orange-100 text-orange-700',
            'URGENTE': 'bg-red-100 text-red-700'
        }[ticket.prioridad] || 'bg-gray-100';
        
        // Generar comentarios HTML
        let comentariosHtml = '';
        if (comentarios.length > 0) {
            comentariosHtml = comentarios.map(c => {
                const esInternoBadge = c.es_interno ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2">Interno</span>' : '';
                const fechaComentario = new Date(c.creado_el).toLocaleString();
                return `
                    <div class="border-b border-gray-100 pb-3 mb-3 last:border-b-0">
                        <div class="flex justify-between items-start mb-1">
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-primary text-sm">${c.usuario?.nombre_completo || 'Usuario'}</span>
                                ${esInternoBadge}
                            </div>
                            <span class="text-xs text-gray-400">${fechaComentario}</span>
                        </div>
                        <p class="text-sm text-gray-600 whitespace-pre-wrap">${c.comentario}</p>
                        ${c.adjunto_url ? `<a href="${c.adjunto_url}" target="_blank" class="text-xs text-blue-500 hover:underline"><i class="fas fa-paperclip"></i> Adjunto</a>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            comentariosHtml = '<p class="text-gray-400 text-center py-4">No hay comentarios aún</p>';
        }
        
        ocultarLoading();
        
        Swal.fire({
            title: `<span class="text-primary">${ticket.titulo}</span>`,
            width: '750px',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <!-- Información básica -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex flex-wrap gap-2 justify-between items-center mb-3">
                            <div class="flex flex-wrap gap-2">
                                <span class="estado-badge ${estadoClass}">${ticket.estado || 'ABIERTO'}</span>
                                <span class="estado-badge ${prioridadClass}">${ticket.prioridad || 'MEDIA'}</span>
                                <span class="text-xs px-2 py-0.5 rounded-full" style="background: ${categoria.color}20; color: ${categoria.color}">
                                    <i class="${categoria.icono} mr-1"></i>${categoria.nombre}
                                </span>
                            </div>
                            ${ticket.valoracion ? `
                                <div class="flex items-center gap-1">
                                    ${Array(5).fill(0).map((_, i) => `
                                        <i class="fas fa-star ${i < ticket.valoracion ? 'text-yellow-400' : 'text-gray-300'} text-sm"></i>
                                    `).join('')}
                                    <span class="text-xs text-gray-500 ml-1">(${ticket.valoracion}/5)</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div><span class="font-semibold">Ticket:</span> ${numeroTicket}</div>
                            <div><span class="font-semibold">Creado por:</span> ${creadorNombre}</div>
                            <div><span class="font-semibold">Fecha:</span> ${new Date(ticket.creado_el).toLocaleString()}</div>
                            <div><span class="font-semibold">Asignado a:</span> 
                                <span class="${!tieneAsignado ? 'text-orange-500' : ''}">${asignadoNombre}</span>
                                ${!tieneAsignado ? '<span class="text-xs text-orange-500 ml-1">(Pendiente de asignación)</span>' : ''}
                            </div>
                            ${ticket.fecha_resolucion ? `<div><span class="font-semibold">Fecha resolución:</span> ${new Date(ticket.fecha_resolucion).toLocaleString()}</div>` : ''}
                            ${ticket.fecha_cierre ? `<div><span class="font-semibold">Fecha cierre:</span> ${new Date(ticket.fecha_cierre).toLocaleString()}</div>` : ''}
                            ${ticket.activo ? `<div class="col-span-2"><span class="font-semibold">Activo asociado:</span> ${ticket.activo.nombre} (${ticket.activo.codigo_activo || 'Sin código'})</div>` : ''}
                        </div>
                        
                        <div class="bg-white p-3 rounded-lg border">
                            <p class="text-sm text-gray-700 whitespace-pre-wrap">${ticket.descripcion || 'Sin descripción'}</p>
                        </div>
                    </div>
                    
                    <!-- Sección de valoración -->
                    ${puedeValorar ? `
                        <div class="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                            <h4 class="font-semibold text-yellow-800 mb-2">📝 Valorar atención</h4>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-sm">Calificación:</span>
                                <div class="flex gap-1" id="valoracionEstrellas">
                                    ${[1,2,3,4,5].map(star => `
                                        <i class="fas fa-star text-gray-300 cursor-pointer hover:text-yellow-400 text-xl transition-colors" data-valor="${star}"></i>
                                    `).join('')}
                                </div>
                            </div>
                            <textarea id="comentarioValoracion" class="form-input w-full text-sm" rows="2" placeholder="Comentario adicional (opcional)"></textarea>
                            <button onclick="enviarValoracion('${ticket.id}')" class="mt-2 bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600">
                                Enviar valoración
                            </button>
                        </div>
                    ` : ''}
                    
                    <!-- Comentarios -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-comments"></i> Comentarios (${comentarios.length})
                            
                            <!-- Botón comentario interno (solo admin) -->
                            ${puedeComentarInterno ? `
                                <button onclick="mostrarFormularioComentario('${ticket.id}', true)" 
                                        class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 ml-2">
                                    + Interno
                                </button>
                            ` : ''}
                            
                            <!-- Botón comentario normal -->
                            ${puedeComentar ? `
                                <button onclick="mostrarFormularioComentario('${ticket.id}', false)" 
                                        class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark ml-auto">
                                    + Comentar
                                </button>
                            ` : `
                                ${ticketCerrado && !esAdmin ? `
                                    <span class="text-xs text-gray-400 ml-auto flex items-center gap-1">
                                        <i class="fas fa-lock"></i> Ticket cerrado - No se pueden agregar comentarios
                                    </span>
                                ` : ''}
                                ${!tieneAsignado && !esAdmin && !ticketCerrado ? `
                                    <span class="text-xs text-gray-400 ml-auto">⚠️ Comentarios disponibles solo después de asignar responsable</span>
                                ` : ''}
                            `}
                        </h4>
                        <div id="comentariosContainer" class="max-h-64 overflow-y-auto">
                            ${comentariosHtml}
                        </div>
                    </div>
                    
                    <!-- Historial -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2"><i class="fas fa-history"></i> Historial</h4>
                        ${historialHtml}
                    </div>
                    
                    <!-- Botones de acción -->
                    <div class="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                        ${puedeEditar ? `
                            <button onclick="editarTicket('${ticket.id}')" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        ` : ''}
                        
                        ${puedeCambiarEstado ? `
                            <button onclick="cambiarEstadoTicket('${ticket.id}', '${ticket.estado}')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                                <i class="fas fa-exchange-alt"></i> Cambiar estado
                            </button>
                        ` : ''}
                        
                        ${esAdmin ? `
                            <button onclick="eliminarTicket('${ticket.id}')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        ` : ''}
                        
                        ${esAdmin && !tieneAsignado && !ticketCerrado ? `
                            <button onclick="asignarResponsableTicket('${ticket.id}')" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2">
                                <i class="fas fa-user-plus"></i> Asignar responsable
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- Mensajes informativos -->
                    ${ticketCerrado && !esAdmin ? `
                        <div class="bg-gray-100 p-3 rounded-lg text-sm text-gray-600 flex items-center gap-2">
                            <i class="fas fa-lock"></i>
                            Este ticket está CERRADO. Solo los administradores pueden comentar.
                        </div>
                    ` : ''}
                    
                    ${ticketCerrado && esAdmin ? `
                        <div class="bg-orange-50 p-3 rounded-lg text-sm text-orange-700 flex items-center gap-2">
                            <i class="fas fa-info-circle"></i>
                            Este ticket está CERRADO. Como administrador, puedes agregar comentarios.
                        </div>
                    ` : ''}
                    
                    ${!tieneAsignado && !esAdmin && !ticketCerrado ? `
                        <div class="bg-orange-50 p-3 rounded-lg text-sm text-orange-700 flex items-center gap-2">
                            <i class="fas fa-info-circle"></i>
                            Este ticket está pendiente de asignación. Una vez asignado, podrás comentar y dar seguimiento.
                        </div>
                    ` : ''}
                </div>
            `,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            didOpen: () => {
                if (puedeValorar) {
                    const estrellas = document.querySelectorAll('#valoracionEstrellas .fa-star');
                    let valorSeleccionado = 0;
                    
                    estrellas.forEach(star => {
                        star.addEventListener('click', function() {
                            valorSeleccionado = parseInt(this.dataset.valor);
                            estrellas.forEach((s, i) => {
                                if (i < valorSeleccionado) {
                                    s.classList.remove('text-gray-300');
                                    s.classList.add('text-yellow-400');
                                } else {
                                    s.classList.remove('text-yellow-400');
                                    s.classList.add('text-gray-300');
                                }
                            });
                        });
                    });
                    
                    window.enviarValoracion = async function(ticketId) {
                        const estrellasSeleccionadas = document.querySelectorAll('#valoracionEstrellas .fa-star.text-yellow-400').length;
                        const comentario = document.getElementById('comentarioValoracion')?.value;
                        
                        if (estrellasSeleccionadas === 0) {
                            mostrarAlerta('Error', 'Seleccione una calificación', 'error');
                            return;
                        }
                        
                        mostrarLoading('Guardando valoración...');
                        
                        try {
                            const fechaLocal = getFechaLocalForDB();
                            
                            const { error } = await window.supabaseClient
                                .from('tickets')
                                .update({
                                    valoracion: estrellasSeleccionadas,
                                    comentario_valoracion: comentario || null,
                                    fecha_valoracion: fechaLocal
                                })
                                .eq('id', ticketId);
                            
                            if (error) throw error;
                            
                            ocultarLoading();
                            mostrarAlerta('Éxito', 'Gracias por tu valoración', 'success');
                            Swal.close();
                            await cargarVistaTickets();
                            
                        } catch (error) {
                            ocultarLoading();
                            console.error('Error:', error);
                            mostrarAlerta('Error', 'No se pudo guardar la valoración', 'error');
                        }
                    };
                }
            }
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== MOSTRAR FORMULARIO DE COMENTARIO ====================
window.mostrarFormularioComentario = async function(ticketId, esInterno = false) {
    console.log(`📝 Mostrando formulario de comentario para ticket ${ticketId} - Interno: ${esInterno} - Usuario: ${usuarioActual.id}`);
    
    mostrarLoading('Verificando permisos...');
    
    try {
        const { data: ticket, error: ticketError } = await window.supabaseClient
            .from('tickets')
            .select('asignado_a, creado_por, estado, titulo, numero')
            .eq('id', ticketId)
            .single();
        
        if (ticketError) {
            ocultarLoading();
            console.error('Error obteniendo ticket:', ticketError);
            mostrarAlerta('Error', 'No se pudo verificar el ticket', 'error');
            return;
        }
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        const esCreador = ticket.creado_por === usuarioActual.id;
        const esResponsable = ticket.asignado_a === usuarioActual.id;
        const tieneAsignado = !!ticket.asignado_a;
        const ticketCerrado = ticket.estado === 'CERRADO';
        
        console.log('Permisos:', { esAdmin, esCreador, esResponsable, tieneAsignado, ticketCerrado });
        
        // ============================================
        // VALIDACIÓN PARA ADMINISTRADORES (SIEMPRE PUEDEN COMENTAR)
        // ============================================
        if (esAdmin) {
            console.log('✅ Administrador - Puede comentar siempre');
            // Continuar con el formulario
        } 
        // Validación para otros roles
        else if (ticketCerrado) {
            ocultarLoading();
            mostrarAlerta('Acción no permitida', 'No se puede comentar porque el ticket está CERRADO. Solo los administradores pueden comentar en tickets cerrados.', 'warning');
            return;
        }
        else if (!tieneAsignado) {
            ocultarLoading();
            mostrarAlerta('Acción no permitida', 'Este ticket no tiene un responsable asignado. Solo administradores pueden comentar hasta que se asigne un responsable.', 'warning');
            return;
        }
        else if (!esResponsable && !esCreador) {
            ocultarLoading();
            mostrarAlerta('Acción no permitida', 'No tiene permiso para comentar en este ticket', 'warning');
            return;
        }
        
        // Comentarios internos solo para admin
        if (esInterno && !esAdmin) {
            ocultarLoading();
            mostrarAlerta('Acción no permitida', 'Solo administradores pueden agregar comentarios internos', 'warning');
            return;
        }
        
        ocultarLoading();
        
        // ============================================
        // CARGAR NOMBRE DEL RESPONSABLE
        // ============================================
        let nombreResponsable = 'Sin asignar';
        if (ticket.asignado_a) {
            nombreResponsable = await obtenerNombreUsuarioPorId(ticket.asignado_a);
        }
        
        const numeroTicket = ticket.numero || ticket.id.substring(0, 8);
        
        // Mensaje informativo según el rol
        let mensajeInformativo = '';
        if (esInterno) {
            mensajeInformativo = 'Los comentarios internos solo son visibles para administradores.';
        } else if (esAdmin) {
            mensajeInformativo = 'Como administrador, tu comentario será visible para todos los usuarios.';
        } else if (esResponsable) {
            mensajeInformativo = 'Tu comentario será visible para el creador y los administradores.';
        } else if (esCreador) {
            mensajeInformativo = 'Tu comentario será visible para el responsable asignado y los administradores.';
        }
        
        const { value: comentario } = await Swal.fire({
            title: esInterno ? 'Agregar comentario interno' : 'Agregar comentario',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg text-sm">
                        <p><strong>Ticket:</strong> ${numeroTicket}</p>
                        <p><strong>Título:</strong> ${ticket.titulo || 'Sin título'}</p>
                        <p><strong>Estado:</strong> ${ticket.estado || 'ABIERTO'}</p>
                        <p><strong>Responsable:</strong> ${nombreResponsable}</p>
                        ${ticketCerrado ? '<p class="text-orange-600 mt-2"><i class="fas fa-lock"></i> Este ticket está CERRADO</p>' : ''}
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Comentario</label>
                        <textarea id="comentario-texto" class="form-input w-full" rows="4" placeholder="Escriba su comentario aquí..." required></textarea>
                        <p class="text-xs text-gray-400 mt-1">
                            <i class="fas fa-info-circle"></i> El texto se guardará en MAYÚSCULAS automáticamente
                        </p>
                    </div>
                    ${mensajeInformativo ? `
                        <div class="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                            <i class="fas fa-info-circle mt-0.5"></i>
                            <span>${mensajeInformativo}</span>
                        </div>
                    ` : ''}
                    ${ticketCerrado && esAdmin ? `
                        <div class="p-3 bg-orange-50 rounded-lg text-xs text-orange-700 flex items-start gap-2">
                            <i class="fas fa-exclamation-triangle mt-0.5"></i>
                            <span>Este ticket está CERRADO. Tu comentario será visible para todos los usuarios.</span>
                        </div>
                    ` : ''}
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Enviar comentario',
            cancelButtonText: 'Cancelar',
            width: '550px',
            preConfirm: () => {
                const texto = document.getElementById('comentario-texto')?.value;
                if (!texto || texto.trim() === '') {
                    Swal.showValidationMessage('El comentario no puede estar vacío');
                    return false;
                }
                return texto.toUpperCase();
            },
            didOpen: () => {
                const textarea = document.getElementById('comentario-texto');
                if (textarea) {
                    textarea.addEventListener('input', function() {
                        const cursorPos = this.selectionStart;
                        const oldValue = this.value;
                        const newValue = oldValue.toUpperCase();
                        if (oldValue !== newValue) {
                            this.value = newValue;
                            this.setSelectionRange(cursorPos, cursorPos);
                        }
                    });
                }
            }
        });
        
        if (comentario) {
            mostrarLoading('Enviando comentario...');
            
            try {
                await agregarComentarioTicket(ticketId, comentario, esInterno);
                
                ocultarLoading();
                mostrarAlerta('Éxito', 'Comentario agregado correctamente', 'success');
                
                // Recargar detalles del ticket
                Swal.close();
                await verDetalleTicket(ticketId);
                
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo agregar el comentario: ' + (error.message || 'Error desconocido'), 'error');
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en mostrarFormularioComentario:', error);
        mostrarAlerta('Error', 'No se pudo procesar la solicitud', 'error');
    }
};

// ==================== CAMBIAR ESTADO TICKET ====================
window.cambiarEstadoTicket = async function(id, estadoActual) {
    console.log('🔄 Cambiando estado del ticket:', id, 'Estado actual:', estadoActual);
    
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    if (permisos.rol !== 'ADMINISTRADOR') {
        mostrarAlerta('Error', 'Solo administradores pueden cambiar el estado', 'error');
        return;
    }
    
    // ============================================
    // VALIDAR QUE EL TICKET TENGA UN ASIGNADO
    // ============================================
    mostrarLoading('Verificando ticket...');
    
    try {
        // Consulta incluyendo la columna 'numero'
        const { data: ticket, error: ticketError } = await window.supabaseClient
            .from('tickets')
            .select('id, asignado_a, estado, titulo, numero')
            .eq('id', id)
            .single();
        
        if (ticketError) {
            ocultarLoading();
            console.error('Error obteniendo ticket:', ticketError);
            mostrarAlerta('Error', 'No se pudo verificar el ticket', 'error');
            return;
        }
        
        // Verificar si el ticket tiene asignado
        if (!ticket.asignado_a) {
            ocultarLoading();
            
            // Mostrar opción para asignar responsable directamente
            await Swal.fire({
                title: 'No se puede cambiar el estado',
                html: `
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
                        <p>El ticket <strong>${ticket.numero || ticket.id.substring(0, 8)}</strong> no tiene un responsable asignado.</p>
                        <p class="text-sm text-gray-500 mt-2">Para cambiar el estado, primero debe asignar un responsable.</p>
                        <div class="mt-4">
                            <button id="btn-asignar-responsable" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                                <i class="fas fa-user-plus"></i> Asignar responsable ahora
                            </button>
                        </div>
                    </div>
                `,
                icon: 'warning',
                confirmButtonColor: '#39080a',
                confirmButtonText: 'Entendido',
                showCancelButton: false,
                didOpen: () => {
                    const btnAsignar = document.getElementById('btn-asignar-responsable');
                    if (btnAsignar) {
                        btnAsignar.onclick = async () => {
                            Swal.close();
                            await editarTicket(id);
                        };
                    }
                }
            });
            return;
        }
        
        ocultarLoading();
        
        // ============================================
        // DEFINIR SECUENCIA DE ESTADOS
        // ============================================
        const estados = ['ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
        const estadoActualIndex = estados.indexOf(estadoActual);
        
        if (estadoActualIndex === -1) {
            mostrarAlerta('Error', 'Estado actual no válido', 'error');
            return;
        }
        
        if (estadoActualIndex === estados.length - 1) {
            mostrarAlerta('Info', 'El ticket ya está en el último estado (CERRADO)', 'info');
            return;
        }
        
        const siguienteEstado = estados[estadoActualIndex + 1];
        
        // ============================================
        // OBTENER NOMBRE DEL RESPONSABLE
        // ============================================
        let responsableNombre = 'Responsable';
        if (ticket.asignado_a) {
            const nombre = await obtenerNombreUsuarioPorId(ticket.asignado_a);
            responsableNombre = nombre || 'Responsable';
        }
        
        // ============================================
        // CONFIRMACIÓN
        // ============================================
        const estadoInfo = {
            'ABIERTO': { descripcion: 'El ticket está abierto y pendiente de atención', color: '#f59e0b' },
            'EN_PROCESO': { descripcion: 'El ticket está siendo atendido', color: '#3b82f6' },
            'RESUELTO': { descripcion: 'El ticket ha sido resuelto', color: '#10b981' },
            'CERRADO': { descripcion: 'El ticket está cerrado', color: '#6b7280' }
        };
        
        const infoActual = estadoInfo[estadoActual] || estadoInfo['ABIERTO'];
        const infoSiguiente = estadoInfo[siguienteEstado] || {};
        
        const { value: comentario } = await Swal.fire({
            title: 'Cambiar estado del ticket',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>Ticket:</strong> ${ticket.numero || ticket.id.substring(0, 8)}</p>
                        <p><strong>Título:</strong> ${ticket.titulo || 'Sin título'}</p>
                        <p><strong>Responsable asignado:</strong> ${responsableNombre}</p>
                    </div>
                    
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex-1 text-center p-3 rounded-lg" style="background: ${infoActual.color}20; border: 1px solid ${infoActual.color}">
                            <p class="text-sm font-semibold" style="color: ${infoActual.color}">${estadoActual}</p>
                            <p class="text-xs text-gray-500 mt-1">${infoActual.descripcion || ''}</p>
                        </div>
                        <i class="fas fa-arrow-right text-gray-400 text-xl"></i>
                        <div class="flex-1 text-center p-3 rounded-lg" style="background: ${infoSiguiente.color || '#10b981'}20; border: 1px solid ${infoSiguiente.color || '#10b981'}">
                            <p class="text-sm font-semibold" style="color: ${infoSiguiente.color || '#10b981'}">${siguienteEstado}</p>
                            <p class="text-xs text-gray-500 mt-1">${infoSiguiente.descripcion || ''}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label class="form-label font-medium text-gray-700">Comentario (opcional)</label>
                        <textarea id="comentario-cambio" class="form-input w-full" rows="2" placeholder="Ej: Se ha iniciado la gestión del ticket..."></textarea>
                    </div>
                    
                    ${siguienteEstado === 'CERRADO' ? `
                        <div class="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            Al cerrar el ticket, se enviará una notificación al solicitante para que pueda valorar la atención.
                        </div>
                    ` : ''}
                    
                    ${siguienteEstado === 'RESUELTO' ? `
                        <div class="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            Al marcar como resuelto, el solicitante podrá verificar la solución y cerrar el ticket.
                        </div>
                    ` : ''}
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: {
                'EN_PROCESO': '#3b82f6',
                'RESUELTO': '#10b981',
                'CERRADO': '#6b7280'
            }[siguienteEstado] || '#39080a',
            confirmButtonText: `✓ Cambiar a ${siguienteEstado}`,
            cancelButtonText: 'Cancelar',
            width: '550px',
            preConfirm: () => {
                return document.getElementById('comentario-cambio')?.value || null;
            }
        });
        
        if (comentario !== undefined) {
            mostrarLoading('Actualizando estado...');
            
            try {
                const fechaLocal = getFechaLocalForDB();
                
                const updateData = {
                    estado: siguienteEstado,
                    modificado_el: fechaLocal,
                    modificado_por_usuario: usuarioActual.id
                };
                
                if (siguienteEstado === 'CERRADO') {
                    updateData.fecha_cierre = fechaLocal;
                }
                
                if (siguienteEstado === 'RESUELTO') {
                    updateData.fecha_resolucion = fechaLocal;
                }
                
                const { error } = await window.supabaseClient
                    .from('tickets')
                    .update(updateData)
                    .eq('id', id);
                
                if (error) throw error;
                
                // Registrar en historial
                await registrarHistorialTicket(id, 'estado', estadoActual, siguienteEstado, comentario);
                
                // Notificar al solicitante
                if (siguienteEstado === 'RESUELTO' || siguienteEstado === 'CERRADO') {
                    await enviarNotificacionCambioEstado(ticket, siguienteEstado, comentario);
                }
                
                ocultarLoading();
                
                let mensajeExito = '';
                switch(siguienteEstado) {
                    case 'EN_PROCESO':
                        mensajeExito = `El ticket ha sido marcado como "EN PROCESO". Se ha notificado al responsable.`;
                        break;
                    case 'RESUELTO':
                        mensajeExito = `¡Ticket resuelto! El solicitante ha sido notificado para que verifique y cierre el ticket.`;
                        break;
                    case 'CERRADO':
                        mensajeExito = `Ticket cerrado correctamente. El solicitante podrá valorar la atención recibida.`;
                        break;
                    default:
                        mensajeExito = `Estado cambiado a "${siguienteEstado}" correctamente.`;
                }
                
                await Swal.fire({
                    title: 'Estado actualizado',
                    html: `<div class="text-left">
                        <p>${mensajeExito}</p>
                        ${comentario ? `<p class="text-sm text-gray-500 mt-2"><strong>Comentario:</strong> ${comentario}</p>` : ''}
                    </div>`,
                    icon: 'success',
                    confirmButtonColor: '#28a745',
                    timer: 3000,
                    timerProgressBar: true
                });
                
                // Recargar la vista
                if (typeof cargarVistaTickets === 'function') {
                    await cargarVistaTickets();
                } else if (typeof window.cargarVista === 'function') {
                    await window.cargarVista('tickets');
                }
                
            } catch (error) {
                ocultarLoading();
                console.error('Error cambiando estado:', error);
                mostrarAlerta('Error', 'No se pudo cambiar el estado: ' + (error.message || 'Error desconocido'), 'error');
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en cambiarEstadoTicket:', error);
        mostrarAlerta('Error', 'No se pudo procesar la solicitud', 'error');
    }
};

// ==================== GENERAR NÚMERO DE TICKET ====================
async function generarNumeroTicket() {
    try {
        // Obtener el año actual
        const año = new Date().getFullYear();
        
        // Buscar el último ticket del año actual
        const { data: ultimoTicket, error } = await window.supabaseClient
            .from('tickets')
            .select('numero')
            .ilike('numero', `TKT-${año}-%`)
            .order('creado_el', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        let nuevoNumero = 1;
        
        if (ultimoTicket && ultimoTicket.length > 0 && ultimoTicket[0].numero) {
            // Extraer el número secuencial del último ticket
            // Formato: TKT-2026-0001
            const partes = ultimoTicket[0].numero.split('-');
            if (partes.length >= 3) {
                const ultimoSecuencial = parseInt(partes[2]);
                if (!isNaN(ultimoSecuencial)) {
                    nuevoNumero = ultimoSecuencial + 1;
                }
            }
        }
        
        // Formatear el número con 4 dígitos
        const numeroFormateado = nuevoNumero.toString().padStart(4, '0');
        const numeroTicket = `TKT-${año}-${numeroFormateado}`;
        
        console.log(`✅ Número de ticket generado: ${numeroTicket}`);
        return numeroTicket;
        
    } catch (error) {
        console.error('Error generando número de ticket:', error);
        // Fallback: usar timestamp
        return `TKT-${Date.now()}`;
    }
}

// Exponer función globalmente
window.generarNumeroTicket = generarNumeroTicket;

// ==================== OBTENER TICKETS FILTRADOS PARA EXPORTACIÓN ====================
async function obtenerTicketsFiltradosExportacion() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // ============================================
        // LEER TODOS LOS FILTROS DEL DOM
        // ============================================
        const filtroFechaDesde = document.getElementById('filtroFechaDesde')?.value;
        const filtroFechaHasta = document.getElementById('filtroFechaHasta')?.value;
        const filtroPrioridad = document.getElementById('filtroPrioridad')?.value;
        const filtroCategoria = document.getElementById('filtroCategoria')?.value;
        const filtroCreadoPor = document.getElementById('filtroCreadoPor')?.value;
        const filtroAsignado = document.getElementById('filtroAsignado')?.value;
        const filtroActivo = document.getElementById('filtroActivo')?.value;
        const busqueda = document.getElementById('busquedaTickets')?.value;
        const orden = document.getElementById('ordenTickets')?.value || 'creado_el.desc';
        
        console.log('📊 Filtros aplicados en exportación:', {
            filtroFechaDesde,
            filtroFechaHasta,
            filtroPrioridad,
            filtroCategoria,
            filtroCreadoPor,
            filtroAsignado,
            filtroActivo,
            busqueda,
            orden
        });
        
        let query = window.supabaseClient
            .from('tickets')
            .select(`
                *,
                categoria:ticket_categorias!categoria_id (id, nombre, color, icono),
                creador:creado_por (id, correo),
                asignado:asignado_a (id, correo),
                activo:activo_id (id, nombre, codigo_activo)
            `);
        
        // Si no es administrador, solo ver sus tickets
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        // ============================================
        // APLICAR FILTROS (Mismos que en cargarVistaTickets)
        // ============================================
        if (filtroFechaDesde && filtroFechaDesde !== '') {
            query = query.gte('creado_el', `${filtroFechaDesde}T00:00:00`);
        }
        if (filtroFechaHasta && filtroFechaHasta !== '') {
            query = query.lte('creado_el', `${filtroFechaHasta}T23:59:59`);
        }
        if (filtroPrioridad && filtroPrioridad !== '') {
            query = query.eq('prioridad', filtroPrioridad);
        }
        if (filtroCategoria && filtroCategoria !== '') {
            query = query.eq('categoria_id', filtroCategoria);
        }
        if (filtroCreadoPor && filtroCreadoPor !== '') {
            query = query.eq('creado_por', filtroCreadoPor);
        }
        if (filtroAsignado && filtroAsignado !== '') {
            query = query.eq('asignado_a', filtroAsignado);
        }
        if (filtroActivo && filtroActivo !== '') {
            // Nota: Esto puede necesitar ajuste según tu estructura de base de datos
            query = query.ilike('activo.activo_id.nombre', `%${filtroActivo}%`);
        }
        if (busqueda && busqueda !== '') {
            query = query.or(`titulo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
        }
        
        // Aplicar ordenamiento (para consistencia)
        const [campoOrden, direccion] = orden.split('.');
        query = query.order(campoOrden, { ascending: direccion === 'asc' });
        
        const { data: tickets, error } = await query;
        
        if (error) throw error;
        
        console.log(`📊 Exportación: ${tickets?.length || 0} tickets encontrados con los filtros aplicados`);
        
        // ============================================
        // OBTENER NOMBRES DE USUARIOS
        // ============================================
        const usuariosIds = new Set();
        tickets?.forEach(t => {
            if (t.creado_por) usuariosIds.add(t.creado_por);
            if (t.asignado_a) usuariosIds.add(t.asignado_a);
        });
        
        const nombresMap = await obtenerNombresUsuariosEnLote(Array.from(usuariosIds));
        
        function obtenerNombre(userId) {
            if (!userId) return 'Sistema';
            return nombresMap.get(userId) || userId;
        }
        
        // Formatear datos para exportación
        const datosFormateados = tickets?.map(t => ({
            numero: t.numero || t.id.substring(0, 8),
            titulo: t.titulo || 'N/A',
            categoria: t.categoria?.nombre || 'N/A',
            prioridad: t.prioridad || 'MEDIA',
            estado: t.estado || 'ABIERTO',
            creado_por: obtenerNombre(t.creado_por),
            asignado_a: t.asignado_a ? obtenerNombre(t.asignado_a) : 'No asignado',
            fecha: new Date(t.creado_el).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        })) || [];
        
        return datosFormateados;
        
    } catch (error) {
        console.error('Error obteniendo tickets filtrados:', error);
        return [];
    }
}

// ==================== NOTIFICAR CAMBIO DE ESTADO AL SOLICITANTE ====================
async function enviarNotificacionCambioEstado(ticket, nuevoEstado, comentario) {
    try {
        // Obtener información del solicitante
        const { data: solicitante, error } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .eq('id', ticket.creado_por)
            .single();
        
        if (error) throw error;
        
        let titulo = '';
        let mensaje = '';
        let tipo = '';
        
        switch(nuevoEstado) {
            case 'RESUELTO':
                titulo = `✅ Ticket ${ticket.numero || 'N/A'} resuelto`;
                mensaje = `El ticket "${ticket.titulo}" ha sido marcado como RESUELTO. Por favor, verifica la solución y cierra el ticket si todo está correcto.`;
                tipo = 'ticket_resuelto';
                break;
            case 'CERRADO':
                titulo = `🔒 Ticket ${ticket.numero || 'N/A'} cerrado`;
                mensaje = `El ticket "${ticket.titulo}" ha sido cerrado. ${comentario ? `Comentario: ${comentario}` : ''}`;
                tipo = 'ticket_cerrado';
                break;
            default:
                return;
        }
        
        // Crear notificación en la base de datos
        await window.supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: ticket.creado_por,
                titulo: titulo,
                mensaje: mensaje,
                tipo: tipo,
                referencia_id: ticket.id,
                leida: false,
                creado_el: getFechaLocalForDB()
            });
        
        console.log(`📧 Notificación de cambio de estado enviada al solicitante: ${nuevoEstado}`);
        
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}

// ==================== VISTA ADMINISTRACIÓN DE CATEGORÍAS ====================
async function cargarVistaCategoriasTicket() {
    mostrarLoading('Cargando categorías...');
    
    try {
        console.log('%c🏷️ CARGANDO CATEGORÍAS DE TICKETS', 'background: #fd7e14; color: white; font-size: 14px;');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        const { data: categorias, error } = await window.supabaseClient
            .from('ticket_categorias')
            .select('*')
            .order('orden')
            .order('nombre');
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-tags"></i> Categorías de Tickets
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestión de categorías para tickets</p>
                    </div>
                    <button onclick="abrirModalCategoriaTicket()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nueva Categoría
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="categorias-ticket-grid">
        `;
        
        if (categorias?.length) {
            for (const cat of categorias) {
                html += `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div class="p-4 border-b border-gray-100" style="background: ${cat.color}10">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-2">
                                    <i class="${cat.icono} text-xl" style="color: ${cat.color}"></i>
                                    <h3 class="font-bold text-gray-800">${cat.nombre}</h3>
                                </div>
                                <span class="estado-badge ${cat.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${cat.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                        <div class="p-4 space-y-3">
                            <p class="text-sm text-gray-600">${cat.descripcion || 'Sin descripción'}</p>
                            <div class="flex items-center gap-3 text-xs text-gray-400">
                                <span><i class="fas fa-palette"></i> Color: ${cat.color}</span>
                                <span><i class="fas fa-code"></i> Icono: ${cat.icono}</span>
                            </div>
                        </div>
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2">
                            <button onclick="editarCategoriaTicket('${cat.id}')" class="text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="toggleEstadoCategoriaTicket('${cat.id}', ${cat.activo})" class="${cat.activo ? 'text-orange-600' : 'text-green-600'} hover:bg-${cat.activo ? 'orange' : 'green'}-600 hover:text-white p-2 rounded-lg transition-colors">
                                <i class="fas ${cat.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                            <button onclick="eliminarCategoriaTicket('${cat.id}')" class="text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        } else {
            html += `
                <div class="col-span-full text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-tags text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">No hay categorías registradas</p>
                    <button onclick="abrirModalCategoriaTicket()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Crear Categoría
                    </button>
                </div>
            `;
        }
        
        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarError('Error al cargar categorías: ' + error.message);
    }
}

// ==================== CRUD CATEGORÍAS DE TICKETS ====================
window.abrirModalCategoriaTicket = async function() {
    const modal = document.getElementById('categoriaTicketModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('categoriaTicketModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    categoriaEditandoId = null;
    
    const form = document.getElementById('categoriaTicketForm');
    if (form) form.reset();
    
    const titleElement = document.getElementById('categoriaTicketModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Categoría';
    
    document.getElementById('categoria_activo').value = 'true';
    
    await window.abrirModal('categoriaTicketModal');
};

window.guardarCategoriaTicket = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando categoría...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const ahora = new Date().toISOString();
        
        const data = {
            nombre: document.getElementById('cat_ticket_nombre').value,
            descripcion: document.getElementById('categoria_descripcion').value || null,
            color: document.getElementById('categoria_color').value,
            icono: document.getElementById('categoria_icono').value,
            orden: parseInt(document.getElementById('categoria_orden').value) || 0,
            activo: document.getElementById('categoria_activo').value === 'true'
        };
        
        if (!data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            return;
        }
        
        if (categoriaEditandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('ticket_categorias')
                .update(data)
                .eq('id', categoriaEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría actualizada correctamente', 'success');
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('ticket_categorias')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría creada correctamente', 'success');
        }
        
        cerrarModal('categoriaTicketModal');
        await cargarVistaCategoriasTicket();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la categoría', 'error');
    }
};

window.editarCategoriaTicket = async function(id) {
    mostrarLoading('Cargando categoría...');
    
    try {
        const { data: categoria, error } = await window.supabaseClient
            .from('ticket_categorias')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        categoriaEditandoId = id;
        
        document.getElementById('categoriaTicketModalTitle').innerText = 'Editar Categoría';
        document.getElementById('cat_ticket_nombre').value = categoria.nombre || '';
        document.getElementById('categoria_descripcion').value = categoria.descripcion || '';
        document.getElementById('categoria_color').value = categoria.color || '#6c757d';
        document.getElementById('categoria_icono').value = categoria.icono || 'fas fa-tag';
        document.getElementById('categoria_orden').value = categoria.orden || 0;
        document.getElementById('categoria_activo').value = categoria.activo ? 'true' : 'false';
        
        ocultarLoading();
        await window.abrirModal('categoriaTicketModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la categoría', 'error');
    }
};

window.toggleEstadoCategoriaTicket = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} categoría?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta categoría.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado ? '#28a745' : '#ffc107',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        
        try {
            if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
            const ahora = new Date().toISOString();
            
            const { error } = await window.supabaseClient
                .from('ticket_categorias')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Categoría ${accion}da correctamente`, 'success');
            await cargarVistaCategoriasTicket();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

window.eliminarCategoriaTicket = async function(id) {
    // Verificar si hay tickets con esta categoría
    const { count } = await window.supabaseClient
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);
    
    if (count > 0) {
        const result = await Swal.fire({
            title: '¿Eliminar categoría?',
            html: `<div class="text-center">
                <i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
                <p>Esta categoría tiene <strong>${count} ticket(s)</strong> asociado(s).</p>
                <p class="text-sm text-gray-500 mt-2">Si la eliminas, los tickets quedarán sin categoría.</p>
                <p class="text-sm text-gray-500">¿Deseas continuar?</p>
            </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
    } else {
        const result = await Swal.fire({
            title: '¿Eliminar categoría?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
    }
    
    mostrarLoading('Eliminando...');
    
    try {
        const { error } = await window.supabaseClient
            .from('ticket_categorias')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Categoría eliminada correctamente', 'success');
        await cargarVistaCategoriasTicket();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo eliminar la categoría', 'error');
    }
};

// ==================== OBTENER ACTIVOS PARA INTEGRACIÓN ====================

// ==================== CARGAR ACTIVOS ASOCIADOS AL USUARIO ====================
async function cargarActivosSelectTicket(selectId, incluirVacio = true) {
    try {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo')
            .order('nombre');
        
        // Si no es administrador, solo mostrar activos asignados a él
        if (!esAdmin && permisos.empleadoId) {
            const { data: asignaciones } = await window.supabaseClient
                .from('asignaciones')
                .select('activo_id')
                .eq('empleado_id', permisos.empleadoId)
                .eq('estado', 'ACTIVA');
            
            const activosIds = asignaciones?.map(a => a.activo_id) || [];
            
            if (activosIds.length > 0) {
                query = query.in('id', activosIds);
            } else {
                select.innerHTML = incluirVacio ? '<option value="">Seleccionar activo</option>' : '';
                select.innerHTML += '<option value="" disabled>No tiene activos asignados</option>';
                return;
            }
        }
        
        const { data: activos, error } = await query;
        
        if (error) throw error;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar activo</option>' : '';
        
        if (!activos || activos.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay activos disponibles</option>';
            return;
        }
        
        activos.forEach(activo => {
            const option = document.createElement('option');
            option.value = activo.id;
            option.textContent = `${activo.nombre} (${activo.codigo_activo || 'Sin código'})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando activos:', error);
    }
}

// ==================== OBTENER COMENTARIOS DE UN TICKET ====================
async function obtenerComentariosTicket(ticketId) {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        let query = window.supabaseClient
            .from('ticket_comentarios')
            .select(`
                *,
                usuario:usuario_id (id, correo, empleado_id)
            `)
            .eq('ticket_id', ticketId)
            .order('creado_el', { ascending: false });  // ← CAMBIADO: ahora descendente
        
        // Si NO es administrador, filtrar comentarios internos
        if (!esAdmin) {
            query = query.eq('es_interno', false);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Obtener nombres de empleados para mostrar
        for (let comentario of data) {
            if (comentario.usuario?.empleado_id) {
                const { data: empleado } = await window.supabaseClient
                    .from('empleados')
                    .select('nombre_completo')
                    .eq('id', comentario.usuario.empleado_id)
                    .single();
                comentario.usuario.nombre_completo = empleado?.nombre_completo || comentario.usuario.correo;
            } else if (comentario.usuario) {
                comentario.usuario.nombre_completo = comentario.usuario.correo;
            }
        }
        
        return data;
    } catch (error) {
        console.error('Error obteniendo comentarios:', error);
        return [];
    }
}

// ==================== ASIGNAR RESPONSABLE A TICKET ====================
window.asignarResponsableTicket = async function(id) {
    console.log('👥 Asignando responsable al ticket:', id);
    
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    if (permisos.rol !== 'ADMINISTRADOR') {
        mostrarAlerta('Error', 'Solo administradores pueden asignar responsables', 'error');
        return;
    }
    
    try {
        // Obtener información del ticket
        const { data: ticket, error } = await window.supabaseClient
            .from('tickets')
            .select('id, titulo, numero, asignado_a')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // ============================================
        // OBTENER SOLO USUARIOS CON ROL ADMINISTRADOR
        // ============================================
        // Primero, obtener el ID del rol ADMINISTRADOR
        const { data: rolAdmin, error: rolError } = await window.supabaseClient
            .from('roles')
            .select('id')
            .eq('nombre', 'ADMINISTRADOR')
            .single();
        
        if (rolError) {
            console.error('Error obteniendo rol administrador:', rolError);
            mostrarAlerta('Error', 'No se pudo cargar la lista de administradores', 'error');
            return;
        }
        
        // Obtener usuarios con rol ADMINISTRADOR
        const { data: usuariosDisponibles, error: usuariosError } = await window.supabaseClient
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
            .eq('rol_id', rolAdmin.id)
            .eq('activo', true)
            .order('correo');
        
        if (usuariosError) throw usuariosError;
        
        if (!usuariosDisponibles || usuariosDisponibles.length === 0) {
            mostrarAlerta('Error', 'No hay administradores disponibles para asignar', 'error');
            return;
        }
        
        // Formatear opciones para el select
        const opcionesUsuarios = usuariosDisponibles?.map(u => {
            const nombre = u.empleados?.nombre_completo || u.correo;
            const puesto = u.empleados?.puesto ? ` (${u.empleados.puesto})` : '';
            return `<option value="${u.id}">${nombre}${puesto}</option>`;
        }).join('');
        
        const numeroTicket = ticket.numero || ticket.id.substring(0, 8);
        
        const { value: usuarioId } = await Swal.fire({
            title: 'Asignar responsable',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>Ticket:</strong> ${numeroTicket}</p>
                        <p><strong>Título:</strong> ${ticket.titulo || 'Sin título'}</p>
                        <p><strong>Responsable actual:</strong> ${ticket.asignado_a ? 'Asignado' : 'Sin asignar'}</p>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Seleccionar responsable</label>
                        <select id="responsable-select" class="form-input w-full">
                            <option value="">Seleccionar responsable</option>
                            ${opcionesUsuarios}
                        </select>
                        <p class="text-xs text-gray-400 mt-1">Solo se muestran usuarios con rol Administrador</p>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Mensaje para el responsable (opcional)</label>
                        <textarea id="mensaje-responsable" class="form-input w-full" rows="2" placeholder="Ej: Por favor revisar este ticket con urgencia..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Asignar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const responsableId = document.getElementById('responsable-select').value;
                if (!responsableId) {
                    Swal.showValidationMessage('Debe seleccionar un administrador');
                    return false;
                }
                return {
                    responsableId: responsableId,
                    mensaje: document.getElementById('mensaje-responsable')?.value || null
                };
            }
        });
        
        if (usuarioId) {
            mostrarLoading('Asignando responsable...');
            
            const fechaLocal = getFechaLocalForDB();
            const valorAnterior = ticket.asignado_a || null;
            
            // Actualizar solo el campo asignado_a
            const { error: updateError } = await window.supabaseClient
                .from('tickets')
                .update({
                    asignado_a: usuarioId.responsableId,
                    modificado_el: fechaLocal,
                    modificado_por_usuario: usuarioActual.id
                })
                .eq('id', id);
            
            if (updateError) throw updateError;
            
            // Registrar en historial
            await registrarHistorialTicket(id, 'asignado_a', valorAnterior, usuarioId.responsableId, usuarioId.mensaje);
            
            // Obtener nombre del responsable seleccionado
            const responsableSeleccionado = usuariosDisponibles?.find(u => u.id === usuarioId.responsableId);
            const nombreResponsable = responsableSeleccionado?.empleados?.nombre_completo || responsableSeleccionado?.correo || 'Administrador';
            
            ocultarLoading();
            
            await Swal.fire({
                title: '✅ Responsable asignado',
                html: `<div class="text-left">
                    <p>El administrador <strong>${nombreResponsable}</strong> ha sido asignado al ticket ${numeroTicket}.</p>
                    ${usuarioId.mensaje ? `<p class="text-sm text-gray-500 mt-2"><strong>Mensaje:</strong> ${usuarioId.mensaje}</p>` : ''}
                    <p class="text-sm text-gray-500 mt-2">El responsable ahora podrá gestionar el ticket y cambiar su estado.</p>
                </div>`,
                icon: 'success',
                confirmButtonColor: '#28a745'
            });
            
            // Recargar la vista
            await cargarVistaTickets();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error asignando responsable:', error);
        mostrarAlerta('Error', 'No se pudo asignar el responsable: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== AGREGAR COMENTARIO A TICKET ====================
async function agregarComentarioTicket(ticketId, comentario, esInterno = false) {
    try {
        const fechaLocal = getFechaLocalForDB();
        
        // Asegurar que el comentario esté en mayúsculas
        const comentarioUpper = comentario ? comentario.toUpperCase() : comentario;
        
        const { data, error } = await window.supabaseClient
            .from('ticket_comentarios')
            .insert({
                ticket_id: ticketId,
                usuario_id: usuarioActual.id,
                comentario: comentarioUpper,
                es_interno: esInterno,
                creado_el: fechaLocal
            })
            .select();
        
        if (error) throw error;
        
        console.log(`✅ Comentario agregado al ticket ${ticketId} - Interno: ${esInterno}`);
        return data;
        
    } catch (error) {
        console.error('Error agregando comentario:', error);
        throw error;
    }
}

// ==================== REGISTRAR HISTORIAL DE TICKETS ====================
async function registrarHistorialTicket(ticketId, campo, valorAnterior, valorNuevo, comentario = null) {
    try {
        // Normalizar valores
        const anterior = (valorAnterior === undefined || valorAnterior === null || valorAnterior === '') ? null : String(valorAnterior);
        const nuevo = (valorNuevo === undefined || valorNuevo === null || valorNuevo === '') ? null : String(valorNuevo);
        
        // Si son iguales y no hay comentario, no registrar
        if (anterior === nuevo && !comentario) {
            console.log(`⏭️ Historial omitido - ${campo}: sin cambios reales`);
            return;
        }
        
        console.log(`📝 Registrando historial - ${campo}: "${anterior || 'vacío'}" → "${nuevo || 'vacío'}"`);
        
        const fechaLocal = getFechaLocalForDB();
        
        const { error } = await window.supabaseClient
            .from('ticket_historial')
            .insert({
                ticket_id: ticketId,
                campo: campo,
                valor_anterior: anterior,
                valor_nuevo: nuevo,
                comentario: comentario,
                usuario_id: usuarioActual.id,
                fecha_cambio: fechaLocal
            });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Error registrando historial:', error);
        // No interrumpir el flujo principal
    }
}

// ==================== OBTENER NOMBRES DE USUARIOS (CACHE) ====================
const cacheNombresUsuarios = new Map();

async function obtenerNombreUsuarioPorId(usuarioId) {
    if (!usuarioId || usuarioId === 'null' || usuarioId === '') return 'Sistema';
    
    // Verificar caché
    if (cacheNombresUsuarios.has(usuarioId)) {
        return cacheNombresUsuarios.get(usuarioId);
    }
    
    try {
        // Buscar el usuario
        const { data: usuario, error } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .eq('id', usuarioId)
            .single();
        
        if (error) throw error;
        
        let nombre = usuario.correo;
        
        // Si tiene empleado asociado, obtener su nombre
        if (usuario?.empleado_id) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('nombre_completo')
                .eq('id', usuario.empleado_id)
                .single();
            
            if (empleado?.nombre_completo) {
                nombre = empleado.nombre_completo;
            }
        }
        
        // Guardar en caché
        cacheNombresUsuarios.set(usuarioId, nombre);
        
        return nombre;
        
    } catch (error) {
        console.error('Error obteniendo nombre de usuario:', error);
        return usuarioId; // Fallback: mostrar el ID
    }
}

// Función para obtener múltiples nombres en lote (más eficiente)
async function obtenerNombresUsuariosEnLote(usuarioIds) {
    // Filtrar IDs únicos y no nulos
    const idsUnicos = [...new Set(usuarioIds.filter(id => id && id !== 'null' && id !== ''))];
    
    if (idsUnicos.length === 0) return new Map();
    
    // Verificar cuáles no están en caché
    const idsNoCache = idsUnicos.filter(id => !cacheNombresUsuarios.has(id));
    
    if (idsNoCache.length > 0) {
        // Obtener usuarios
        const { data: usuarios, error } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .in('id', idsNoCache);
        
        if (!error && usuarios) {
            // Obtener empleados
            const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
            let empleadosMap = new Map();
            
            if (empleadosIds.length > 0) {
                const { data: empleados } = await window.supabaseClient
                    .from('empleados')
                    .select('id, nombre_completo')
                    .in('id', empleadosIds);
                
                if (empleados) {
                    empleados.forEach(e => empleadosMap.set(e.id, e.nombre_completo));
                }
            }
            
            // Construir nombres
            usuarios.forEach(u => {
                let nombre = u.correo;
                if (u.empleado_id && empleadosMap.has(u.empleado_id)) {
                    nombre = empleadosMap.get(u.empleado_id);
                }
                cacheNombresUsuarios.set(u.id, nombre);
            });
        }
    }
    
    // Retornar mapa con los nombres solicitados
    const resultado = new Map();
    idsUnicos.forEach(id => {
        resultado.set(id, cacheNombresUsuarios.get(id) || id);
    });
    
    return resultado;
}

// ==================== FILTROS AVANZADOS Y ORDENAMIENTO ====================
async function aplicarFiltrosYOrden() {
    const filtros = {
        fechaDesde: document.getElementById('filtroFechaDesde')?.value,
        fechaHasta: document.getElementById('filtroFechaHasta')?.value,
        prioridad: document.getElementById('filtroPrioridad')?.value,
        categoriaId: document.getElementById('filtroCategoria')?.value,
        asignadoId: document.getElementById('filtroAsignado')?.value,
        activoBusqueda: document.getElementById('filtroActivo')?.value?.toLowerCase(),
        orden: document.getElementById('ordenTickets')?.value || 'creado_el.desc'
    };
    
    const cards = document.querySelectorAll('#tickets-grid .ticket-card');
    let cardsArray = Array.from(cards);
    
    // Aplicar filtros
    cardsArray.forEach(card => {
        let mostrar = true;
        
        const fechaTicket = new Date(card.dataset.fecha);
        if (filtros.fechaDesde && fechaTicket < new Date(filtros.fechaDesde)) mostrar = false;
        if (filtros.fechaHasta && fechaTicket > new Date(filtros.fechaHasta)) mostrar = false;
        if (filtros.prioridad && card.dataset.prioridad !== filtros.prioridad) mostrar = false;
        if (filtros.categoriaId && card.dataset.categoria !== filtros.categoriaId) mostrar = false;
        if (filtros.asignadoId && card.dataset.asignado !== filtros.asignadoId) mostrar = false;
        if (filtros.activoBusqueda && !card.dataset.activo?.includes(filtros.activoBusqueda)) mostrar = false;
        
        card.style.display = mostrar ? 'block' : 'none';
    });
    
    // Aplicar ordenamiento
    const [campo, direccion] = filtros.orden.split('.');
    const esAscendente = direccion === 'asc';
    
    cardsArray = cardsArray.filter(card => card.style.display !== 'none');
    
    cardsArray.sort((a, b) => {
        let valorA, valorB;
        const prioridadOrden = { 'URGENTE': 4, 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
        const estadoOrden = { 'ABIERTO': 1, 'EN_PROCESO': 2, 'RESUELTO': 3, 'CERRADO': 4 };
        
        switch(campo) {
            case 'creado_el':
                valorA = new Date(a.dataset.fecha);
                valorB = new Date(b.dataset.fecha);
                break;
            case 'prioridad':
                valorA = prioridadOrden[a.dataset.prioridad] || 0;
                valorB = prioridadOrden[b.dataset.prioridad] || 0;
                break;
            case 'estado':
                valorA = estadoOrden[a.dataset.estado] || 0;
                valorB = estadoOrden[b.dataset.estado] || 0;
                break;
            default:
                valorA = a.dataset.titulo || '';
                valorB = b.dataset.titulo || '';
        }
        
        if (esAscendente) return valorA > valorB ? 1 : -1;
        else return valorA < valorB ? 1 : -1;
    });
    
    // Reordenar el DOM
    const grid = document.getElementById('tickets-grid');
    cardsArray.forEach(card => grid.appendChild(card));
    
    // Actualizar contador
    const contador = cardsArray.length;
    const contadorSpan = document.getElementById('contadorTickets');
    if (contadorSpan) contadorSpan.textContent = `${contador} tickets`;
}

window.aplicarFiltrosYOrden = aplicarFiltrosYOrden;

// ==================== CARGAR OPCIONES DE USUARIOS PARA SELECT ====================
async function cargarUsuariosSelectOptions() {
    try {
        // Obtener el ID del rol ADMINISTRADOR
        const { data: rolAdmin } = await window.supabaseClient
            .from('roles')
            .select('id')
            .eq('nombre', 'ADMINISTRADOR')
            .single();
        
        if (!rolAdmin) {
            console.warn('No se encontró el rol ADMINISTRADOR');
            return '';
        }
        
        // Obtener usuarios con rol ADMINISTRADOR
        const { data: usuarios, error } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .eq('rol_id', rolAdmin.id)
            .eq('activo', true)
            .order('correo');
        
        if (error) throw error;
        
        let optionsHtml = '';
        
        for (const usuario of usuarios) {
            let nombre = usuario.correo;
            if (usuario.empleado_id) {
                const { data: empleado } = await window.supabaseClient
                    .from('empleados')
                    .select('nombre_completo')
                    .eq('id', usuario.empleado_id)
                    .single();
                if (empleado) {
                    nombre = `${empleado.nombre_completo} (${usuario.correo})`;
                }
            }
            optionsHtml += `<option value="${usuario.id}">${nombre}</option>`;
        }
        
        return optionsHtml;
        
    } catch (error) {
        console.error('Error cargando usuarios administradores:', error);
        return '';
    }
}

// ==================== OBTENER FECHA LOCAL PARA SUPABASE ====================
function getFechaLocalForDB() {
    const ahora = new Date();
    // Restar 5 horas para Perú (UTC-5)
    // importante: new Date() devuelve UTC, restamos 5 horas para obtener hora Perú
    const horaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return horaPeru.toISOString();
}

// ==================== FUNCIÓN PARA OBTENER FILTROS ACTUALES DESDE LA UI ====================
function obtenerFiltrosTicketsActuales() {
    // Leer valores directamente del DOM
    const filtros = {
        fechaDesde: document.getElementById('filtroFechaDesde')?.value || '',
        fechaHasta: document.getElementById('filtroFechaHasta')?.value || '',
        prioridad: document.getElementById('filtroPrioridad')?.value || '',
        categoria: document.getElementById('filtroCategoria')?.value || '',
        creadoPor: document.getElementById('filtroCreadoPor')?.value || '',
        asignado: document.getElementById('filtroAsignado')?.value || '',
        activo: document.getElementById('filtroActivo')?.value || '',
        busqueda: document.getElementById('busquedaTickets')?.value || '',
        orden: document.getElementById('ordenTickets')?.value || 'creado_el.desc'
    };
    
    console.log('📋 FILTROS OBTENIDOS:', filtros);
    
    // Guardar en variable global para exportación
    if (typeof window.filtrosTicketsGlobal !== 'undefined') {
        window.filtrosTicketsGlobal = filtros;
    } else {
        window.filtrosTicketsGlobal = filtros;
    }
    
    return filtros;
}

// Exponer función globalmente
window.obtenerFiltrosTicketsActuales = obtenerFiltrosTicketsActuales;

// Modificar aplicarFiltrosTickets para actualizar los filtros globales
const aplicarFiltrosTicketsOriginal = window.aplicarFiltrosTickets;

window.aplicarFiltrosTickets = function() {
    // Guardar filtros antes de recargar
    guardarFiltrosTickets();
    paginaActualTickets = 1;
    cargarVistaTickets();
};