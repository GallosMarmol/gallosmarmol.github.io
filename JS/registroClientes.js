// ==================== VARIABLES GLOBALES PARA LISTADO ====================
let vistaRegistrosActual = 'tabla'; // 'tabla' o 'cards'
let paginaActualRegistros = 1;
const ITEMS_POR_PAGINA_REGISTROS = 12;
let totalRegistrosCount = 0;
let totalPaginasRegistros = 1;
let registrosCache = [];
let filtrosRegistrosGuardados = {
    fechaDesde: '',
    fechaHasta: '',
    tipoProyecto: '',
    contacto: '',
    asesor: '',
    canalOrigen: '',
    busqueda: '',
    orden: 'creado_el.desc'
};

// ==================== LISTA DE DISTRITOS Y CIUDADES PARA UBICACIÓN ====================
const distritosLima = [
    'Lima Centro', 'San Isidro', 'Miraflores', 'San Borja', 'Surco (Santiago de Surco)',
    'La Molina', 'San Miguel', 'Pueblo Libre', 'Jesús María', 'Lince', 'Magdalena del Mar',
    'San Luis', 'Barranco', 'Chorrillos', 'San Juan de Miraflores', 'Villa El Salvador',
    'Villa María del Triunfo', 'San Juan de Lurigancho', 'Los Olivos', 'Independencia',
    'Comas', 'Carabayllo', 'Puente Piedra', 'Ancón', 'Santa Rosa', 'Rímac', 'Breña',
    'Cercado de Lima', 'La Victoria', 'El Agustino', 'Santa Anita', 'Ate', 'Lurigancho (Chosica)',
    'Cieneguilla', 'Pachacámac', 'Lurín', 'Punta Hermosa', 'Punta Negra', 'San Bartolo',
    'Santa María del Mar', 'Pucusana'
];

const principalesCiudades = [
    'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco', 'Huancayo', 'Iquitos',
    'Tacna', 'Chimbote', 'Juliaca', 'Ica', 'Pucallpa', 'Ayacucho', 'Cajamarca',
    'Puno', 'Tarapoto', 'Moquegua', 'Huaraz', 'Tumbes', 'Puerto Maldonado'
];

// Combinar todas las ubicaciones
const todasUbicaciones = [...distritosLima, ...principalesCiudades].sort();

// ==================== FUNCIONES AUXILIARES ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getUbicacionesOptions() {
    if (!todasUbicaciones || todasUbicaciones.length === 0) return '';
    return todasUbicaciones.map(ubi => `<option value="${escapeHtml(ubi)}">`).join('');
}

// ==================== FUNCIÓN PARA MOSTRAR CAMPO OTRO PAÍS ====================
window.mostrarCampoOtroPais = function() {
    const campoOtro = document.getElementById('campo_otro_pais');
    const ubicacionInput = document.getElementById('reg_ubicacion');
    
    if (!campoOtro || !ubicacionInput) return;
    
    if (campoOtro.classList.contains('hidden')) {
        campoOtro.classList.remove('hidden');
        ubicacionInput.value = 'Otro país';
        setTimeout(() => {
            document.getElementById('reg_otro_pais')?.focus();
        }, 100);
    } else {
        campoOtro.classList.add('hidden');
        if (ubicacionInput.value === 'Otro país' || ubicacionInput.value === 'Otro país (especificar)') {
            ubicacionInput.value = '';
        }
        const otroPaisInput = document.getElementById('reg_otro_pais');
        if (otroPaisInput) otroPaisInput.value = '';
    }
};

// ==================== VISTA PRINCIPAL DE REGISTROS ====================
async function cargarVistaListadoRegistrosClientes() {
    mostrarLoading('Cargando registros de clientes...');
    
    try {
        console.log('%c📋 CARGANDO REGISTROS DE CLIENTES OUTLET', 'background: #28a745; color: white; font-size: 14px;');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // ============================================
        // VERIFICAR PERMISOS - Modificado para incluir EMPLEADOS con permiso
        // ============================================
        let tienePermiso = esAdmin;
        
        // Si es EMPLEADO, verificar si tiene el permiso específico
        if (permisos.rol === 'EMPLEADO' && permisos.empleadoId) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('puede_registrar_clientes_outlet')
                .eq('id', permisos.empleadoId)
                .single();
            tienePermiso = empleado?.puede_registrar_clientes_outlet || false;
            console.log('👤 EMPLEADO - Permiso para ver listado:', tienePermiso);
        }
        
        // OPERADOR_EMPRESA también puede ver
        if (permisos.rol === 'OPERADOR_EMPRESA') {
            tienePermiso = true;
        }
        
        if (!tienePermiso) {
            mostrarAlerta('Acceso denegado', 'No tienes permisos para ver esta sección', 'error');
            ocultarLoading();
            return;
        }
        
        // ============================================
        // LEER FILTROS ACTUALES DEL DOM
        // ============================================
        const filtroFechaDesde = document.getElementById('filtroFechaDesdeReg')?.value;
        const filtroFechaHasta = document.getElementById('filtroFechaHastaReg')?.value;
        const filtroTipoProyecto = document.getElementById('filtroTipoProyecto')?.value;
        const filtroContacto = document.getElementById('filtroContacto')?.value;
        const filtroAsesor = document.getElementById('filtroAsesorReg')?.value;
        const filtroCanalOrigen = document.getElementById('filtroCanalOrigen')?.value;
        const busqueda = document.getElementById('busquedaRegistros')?.value;
        const ordenSelect = document.getElementById('ordenRegistros');
        const orden = ordenSelect?.value || 'creado_el.desc';
        
        // ============================================
        // OBTENER REGISTROS PAGINADOS
        // ============================================
        let query = window.supabaseClient
            .from('registros_clientes_outlet')
            .select(`
                *,
                asesor:asesor_asignado_id(id, nombre),
                registrado_por_usuario:registrado_por(id, correo)
            `, { count: 'exact' });
        
        // Si es EMPLEADO (no admin), mostrar SOLO sus propios registros
        if (!esAdmin && permisos.rol === 'EMPLEADO') {
            query = query.eq('registrado_por', usuarioActual.id);
            console.log('👤 EMPLEADO - Filtrando solo sus propios registros');
        }
        
        // Aplicar filtros
        if (filtroFechaDesde && filtroFechaDesde !== '') {
            query = query.gte('creado_el', `${filtroFechaDesde}T00:00:00`);
        }
        if (filtroFechaHasta && filtroFechaHasta !== '') {
            query = query.lte('creado_el', `${filtroFechaHasta}T23:59:59`);
        }
        if (filtroTipoProyecto && filtroTipoProyecto !== '') {
            query = query.eq('tipo_proyecto', filtroTipoProyecto);
        }
        if (filtroContacto && filtroContacto !== '') {
            query = query.eq('contactado', filtroContacto === 'si');
        }
        if (filtroAsesor && filtroAsesor !== '') {
            query = query.eq('asesor_asignado_id', filtroAsesor);
        }
        if (filtroCanalOrigen && filtroCanalOrigen !== '') {
            query = query.eq('canal_origen', filtroCanalOrigen);
        }
        if (busqueda && busqueda !== '') {
            query = query.or(`cliente_nombre.ilike.%${busqueda}%,cliente_telefono.ilike.%${busqueda}%,cliente_email.ilike.%${busqueda}%`);
        }
        
        // Aplicar ordenamiento
        const [campoOrden, direccion] = orden.split('.');
        query = query.order(campoOrden, { ascending: direccion === 'asc' });
        
        // Aplicar paginación
        const desde = (paginaActualRegistros - 1) * ITEMS_POR_PAGINA_REGISTROS;
        const hasta = desde + ITEMS_POR_PAGINA_REGISTROS - 1;
        query = query.range(desde, hasta);
        
        const { data: registros, count, error } = await query;
        
        if (error) throw error;
        
        totalRegistrosCount = count || 0;
        totalPaginasRegistros = Math.ceil(totalRegistrosCount / ITEMS_POR_PAGINA_REGISTROS);
        registrosCache = registros;
        
        // ============================================
        // OBTENER VALORES ÚNICOS PARA FILTROS
        // ============================================
        let queryUnicos = window.supabaseClient
            .from('registros_clientes_outlet')
            .select('tipo_proyecto, contactado, asesor_asignado_id, canal_origen');
        
        // Aplicar mismo filtro de empleado para valores únicos
        if (!esAdmin && permisos.rol === 'EMPLEADO') {
            queryUnicos = queryUnicos.eq('registrado_por', usuarioActual.id);
        }
        
        const { data: valoresUnicos } = await queryUnicos;
        
        // Tipos de proyecto únicos
        const tiposProyecto = [...new Set(valoresUnicos?.map(r => r.tipo_proyecto).filter(t => t))];
        
        // Asesores únicos
        const asesoresIds = [...new Set(valoresUnicos?.map(r => r.asesor_asignado_id).filter(a => a))];
        let asesoresUnicos = [];
        if (asesoresIds.length > 0) {
            const { data: asesores } = await window.supabaseClient
                .from('vendedores')
                .select('id, nombre')
                .in('id', asesoresIds);
            asesoresUnicos = asesores || [];
        }
        
        // Canales únicos
        const canalesOrigen = [...new Set(valoresUnicos?.map(r => r.canal_origen).filter(c => c))];
        
        // Estadísticas
        const totalRegistros = totalRegistrosCount;
        const contactados = registros?.filter(r => r.contactado).length || 0;
        const noContactados = totalRegistros - contactados;
        const conM2 = registros?.filter(r => r.m2_estimados && r.m2_estimados > 0).length || 0;
        
        ocultarLoading();
        
        // ============================================
        // GENERAR HTML
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-users"></i> Registros de Clientes Outlet
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Gestión de clientes registrados en el outlet físico
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${totalRegistros} registro${totalRegistros !== 1 ? 's' : ''}
                            </span>
                            ${!esAdmin && permisos.rol === 'EMPLEADO' ? '<span class="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs"><i class="fas fa-user"></i> Solo mis registros</span>' : ''}
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarRegistrosExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Excel
                        </button>
                        <button onclick="exportarRegistrosPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaRegistros('tabla')" class="px-3 py-1.5 text-sm ${vistaRegistrosActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaRegistros('cards')" class="px-3 py-1.5 text-sm ${vistaRegistrosActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        <button onclick="window.cargarVista('registroClientesOutlet')" class="btn-primary flex items-center gap-2">
                            <i class="fas fa-plus"></i> Nuevo Registro
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${totalRegistros}</p>
                    <p class="text-xs text-gray-500">Total Registros</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${contactados}</p>
                    <p class="text-xs text-gray-500">Contactados</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-orange-500">
                    <p class="text-2xl font-bold text-orange-600">${noContactados}</p>
                    <p class="text-xs text-gray-500">Pendientes</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-blue-500">
                    <p class="text-2xl font-bold text-blue-600">${conM2}</p>
                    <p class="text-xs text-gray-500">Con M² registrados</p>
                </div>
            </div>
            
            <!-- FILTROS AVANZADOS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosRegistrosPanel()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-sliders-h text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosRegistrosBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosRegistrosIcon"></i>
                </div>
                <div id="panelFiltrosRegistros" class="p-4 hidden">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
                            <input type="date" id="filtroFechaDesdeReg" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
                            <input type="date" id="filtroFechaHastaReg" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Tipo proyecto</label>
                            <select id="filtroTipoProyecto" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${tiposProyecto.map(t => {
                                    const nombre = {
                                        'OBRA_NUEVA': 'Obra nueva',
                                        'REMODELACION': 'Remodelación',
                                        'REPOSICION': 'Reposición',
                                        'MANTENIMIENTO': 'Mantenimiento',
                                        'OTRO': 'Otro'
                                    }[t] || t;
                                    return `<option value="${t}">${nombre}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Contactado</label>
                            <select id="filtroContacto" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                <option value="si">✅ Contactados</option>
                                <option value="no">⏳ Pendientes</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Asesor asignado</label>
                            <select id="filtroAsesorReg" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${asesoresUnicos.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Canal origen</label>
                            <select id="filtroCanalOrigen" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${canalesOrigen.map(c => {
                                    const nombre = {
                                        'GOOGLE': 'Google',
                                        'FACEBOOK': 'Facebook/Instagram',
                                        'RECOMENDACION': 'Recomendación',
                                        'VISITA_LOCAL': 'Visita al local',
                                        'ARQUITECTO': 'Referencia arquitecto',
                                        'OUTLET_FISICO': 'Outlet físico',
                                        'OTRO': 'Otro'
                                    }[c] || c;
                                    return `<option value="${c}">${nombre}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Ordenar por</label>
                            <select id="ordenRegistros" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="creado_el.desc">📅 Más recientes</option>
                                <option value="creado_el.asc">📅 Más antiguos</option>
                                <option value="cliente_nombre.asc">👤 Nombre (A-Z)</option>
                                <option value="cliente_nombre.desc">👤 Nombre (Z-A)</option>
                                <option value="m2_estimados.desc">📏 Mayor M²</option>
                                <option value="m2_estimados.asc">📏 Menor M²</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button onclick="aplicarFiltrosRegistros()" class="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <i class="fas fa-search"></i> Aplicar
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-4 pt-3 border-t">
                        <div class="relative w-64">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="busquedaRegistros" placeholder="Buscar por nombre, teléfono o email..." 
                                class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-full">
                        </div>
                        <button onclick="limpiarFiltrosRegistros()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-undo-alt"></i> Limpiar filtros
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="registrosContainer">
                ${vistaRegistrosActual === 'tabla' 
                    ? generarVistaTablaRegistros(registros)
                    : generarVistaCardsRegistros(registros)
                }
            </div>
        `;
        
        // Agregar paginación
        if (totalPaginasRegistros > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualRegistros - 1) * ITEMS_POR_PAGINA_REGISTROS) + 1} - ${Math.min(paginaActualRegistros * ITEMS_POR_PAGINA_REGISTROS, totalRegistrosCount)} de ${totalRegistrosCount} registros
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaRegistros(${paginaActualRegistros - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualRegistros === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorRegistros()}
                        </div>
                        <button onclick="cambiarPaginaRegistros(${paginaActualRegistros + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualRegistros === totalPaginasRegistros ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Inicializar eventos de filtros
        inicializarEventosFiltrosRegistros();
        actualizarBadgeFiltrosRegistros();
        
        console.log('✅ Vista de registros de clientes cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarError('Error al cargar registros: ' + error.message);
    }
}

function generarVistaTablaRegistros(registros) {
    if (!registros || registros.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-users text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay registros de clientes</p>
                </div>`;
    }
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Familia</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">M²</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asesor</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contactado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ofertas</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${registros.map(r => {
                            const tipoProyectoNombre = {
                                'OBRA_NUEVA': 'Obra nueva',
                                'REMODELACION': 'Remodelación',
                                'REPOSICION': 'Reposición',
                                'MANTENIMIENTO': 'Mantenimiento',
                                'OTRO': 'Otro'
                            }[r.tipo_proyecto] || r.tipo_proyecto || '-';
                            
                            const ubicacionMostrada = r.ubicacion && r.ubicacion.length > 25 
                                ? r.ubicacion.substring(0, 22) + '...' 
                                : r.ubicacion || '-';
                            
                            return `
                                <tr class="hover:bg-gray-50 ${!r.contactado ? 'bg-orange-50' : ''}">
                                    <td class="px-4 py-3 text-sm whitespace-nowrap">${new Date(r.creado_el).toLocaleDateString()}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${r.cliente_nombre}${r.cliente_empresa ? `<div class="text-xs text-gray-400">${r.cliente_empresa}</div>` : ''}</td>
                                    <td class="px-4 py-3 text-sm">${r.cliente_telefono}${r.cliente_email ? `<div class="text-xs text-gray-400">${r.cliente_email}</div>` : ''}</td>
                                    <td class="px-4 py-3 text-sm">${r.familia_interes || '-'}</div>
                                    <td class="px-4 py-3 text-sm" title="${r.ubicacion || ''}">${ubicacionMostrada}</div>
                                    <td class="px-4 py-3 text-sm text-center">${r.m2_estimados || '-'}</div>
                                    <td class="px-4 py-3 text-sm">${tipoProyectoNombre}</div>
                                    <td class="px-4 py-3 text-sm">${r.asesor?.nombre || 'Sin asignar'}</div>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${r.contactado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                            ${r.contactado ? 'Contactado' : 'Pendiente'}
                                        </span>
                                     </div>
                                    <td class="px-4 py-3 text-sm text-center">
                                        ${r.desea_ofertas ? '<i class="fas fa-check-circle text-green-500 text-lg" title="Desea recibir ofertas"></i>' : '<i class="fas fa-times-circle text-gray-300 text-lg" title="No desea recibir ofertas"></i>'}
                                     </div>
                                    <td class="px-4 py-3 text-sm whitespace-nowrap">
                                        <button onclick="verDetalleRegistro('${r.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button onclick="editarRegistroCliente('${r.id}')" class="text-primary hover:text-primary-dark p-1" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${!r.contactado ? `
                                            <button onclick="marcarContactado('${r.id}')" class="text-green-600 hover:text-green-800 p-1" title="Marcar contactado">
                                                <i class="fas fa-phone"></i>
                                            </button>
                                        ` : ''}
                                        <button onclick="eliminarRegistroCliente('${r.id}')" class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
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

// ==================== GENERAR VISTA CARDS ====================
function generarVistaCardsRegistros(registros) {
    if (!registros || registros.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg col-span-full">
                    <i class="fas fa-users text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay registros de clientes</p>
                </div>`;
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${registros.map(r => {
                const tipoProyectoNombre = {
                    'OBRA_NUEVA': '🏗️ Obra nueva',
                    'REMODELACION': '🔨 Remodelación',
                    'REPOSICION': '🔄 Reposición',
                    'MANTENIMIENTO': '🛠️ Mantenimiento',
                    'OTRO': '📌 Otro'
                }[r.tipo_proyecto] || r.tipo_proyecto || '📋 Sin tipo';
                
                return `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 ${!r.contactado ? 'border-l-4 border-l-orange-500' : ''}">
                        <div class="p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h3 class="font-bold text-primary text-base">${r.cliente_nombre}</h3>
                                    <p class="text-xs text-gray-400">${new Date(r.creado_el).toLocaleString()}</p>
                                </div>
                                <span class="px-2 py-1 rounded-full text-xs ${r.contactado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                    ${r.contactado ? 'Contactado' : 'Pendiente'}
                                </span>
                            </div>
                            
                            <div class="space-y-2 mt-3">
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-phone text-primary w-5"></i>
                                    <a href="tel:${r.cliente_telefono}" class="text-blue-600 hover:underline">${r.cliente_telefono}</a>
                                </div>
                                ${r.cliente_email ? `
                                    <div class="flex items-center gap-2 text-sm">
                                        <i class="fas fa-envelope text-primary w-5"></i>
                                        <a href="mailto:${r.cliente_email}" class="text-blue-600 hover:underline truncate">${r.cliente_email}</a>
                                    </div>
                                ` : ''}
                                
                                <!-- UBICACIÓN en cards -->
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-map-marker-alt text-primary w-5"></i>
                                    <span class="truncate" title="${r.ubicacion || ''}">${r.ubicacion || 'N/A'}</span>
                                    ${r.ubicacion && r.ubicacion.includes('Otro país') ? '<span class="text-xs text-blue-500"><i class="fas fa-globe-americas"></i></span>' : ''}
                                </div>
                                
                                <!-- OFERTAS en cards -->
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-envelope-open-text text-primary w-5"></i>
                                    <span>${r.desea_ofertas ? '✅ Desea recibir ofertas' : '❌ No desea ofertas'}</span>
                                </div>
                                
                                ${r.producto_interes ? `
                                    <div class="flex items-center gap-2 text-sm">
                                        <i class="fas fa-cube text-primary w-5"></i>
                                        <span class="truncate">${r.producto_interes}</span>
                                    </div>
                                ` : ''}
                                ${r.m2_estimados ? `
                                    <div class="flex items-center gap-2 text-sm">
                                        <i class="fas fa-ruler-combined text-primary w-5"></i>
                                        <span>${r.m2_estimados} m²</span>
                                    </div>
                                ` : ''}
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-hard-hat text-primary w-5"></i>
                                    <span>${tipoProyectoNombre}</span>
                                </div>
                                ${r.asesor?.nombre ? `
                                    <div class="flex items-center gap-2 text-sm">
                                        <i class="fas fa-user-tie text-primary w-5"></i>
                                        <span>Asesor: ${r.asesor.nombre}</span>
                                    </div>
                                ` : ''}
                                ${r.observaciones ? `
                                    <div class="bg-gray-50 p-2 rounded-lg mt-2">
                                        <p class="text-xs text-gray-600 line-clamp-2">${r.observaciones}</p>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                                <button onclick="verDetalleRegistro('${r.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="editarRegistroCliente('${r.id}')" class="text-primary hover:text-primary-dark p-1" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${!r.contactado ? `
                                    <button onclick="marcarContactado('${r.id}')" class="text-green-600 hover:text-green-800 p-1" title="Marcar contactado">
                                        <i class="fas fa-phone"></i>
                                    </button>
                                ` : ''}
                                <button onclick="eliminarRegistroCliente('${r.id}')" class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== VISTA ADMIN: GESTIONAR PERMISOS DE EMPLEADOS ====================
async function cargarVistaGestionarPermisosRegistro() {
    mostrarLoading('Cargando empleados...');
    
    try {
        // Verificar que sea administrador
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        // Obtener empleados con el campo de permiso
        const { data: empleados, error } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto, correo, puede_registrar_clientes_outlet')
            .order('nombre_completo');
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-user-tag"></i> Permisos - Registro de Clientes Outlet
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Gestiona qué empleados pueden registrar clientes en el outlet físico
                        </p>
                    </div>
                    <button onclick="window.cargarVista('registroClientesOutlet')" class="btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>Ir a Registrar Clientes
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permiso</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${empleados?.map(emp => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${emp.nombre_completo}</td>
                                    <td class="px-4 py-3 text-sm">${emp.puesto || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${emp.correo || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${emp.puede_registrar_clientes_outlet ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}">
                                            ${emp.puede_registrar_clientes_outlet ? '✅ Habilitado' : '❌ Deshabilitado'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="togglePermisoRegistro('${emp.id}', ${emp.puede_registrar_clientes_outlet})" 
                                                class="px-3 py-1 rounded-lg text-sm ${emp.puede_registrar_clientes_outlet ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}">
                                            ${emp.puede_registrar_clientes_outlet ? 'Deshabilitar' : 'Habilitar'}
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${(!empleados || empleados.length === 0) ? `
                                <tr><td colspan="5" class="text-center py-8 text-gray-500">No hay empleados registrados</td></tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="mt-6 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div class="flex items-start gap-3">
                    <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div class="text-sm text-blue-800">
                        <p class="font-semibold">¿Cómo funciona?</p>
                        <ul class="list-disc list-inside mt-1 space-y-1">
                            <li>Los empleados habilitados podrán ver el módulo "Registrar Cliente Outlet" en su menú</li>
                            <li>Al registrar un cliente, quedarán como responsables del seguimiento</li>
                            <li>Los registros quedan asociados al empleado que los creó</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar empleados: ' + error.message);
    }
}

// ==================== PAGINACIÓN ====================
function generarPaginadorRegistros() {
    let html = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualRegistros - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginasRegistros, inicio + maxBotones - 1);
    
    if (fin - inicio + 1 < maxBotones) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
        html += `
            <button onclick="cambiarPaginaRegistros(${i})" 
                    class="px-3 py-1 rounded-lg ${i === paginaActualRegistros ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                ${i}
            </button>
        `;
    }
    return html;
}

window.cambiarPaginaRegistros = async function(pagina) {
    if (pagina < 1 || pagina > totalPaginasRegistros) return;
    if (pagina === paginaActualRegistros) return;
    
    const scrollY = window.scrollY;
    paginaActualRegistros = pagina;
    await cargarVistaListadoRegistrosClientes();
    setTimeout(() => window.scrollTo(0, scrollY), 100);
};

window.toggleVistaRegistros = async function(vista) {
    vistaRegistrosActual = vista;
    await cargarVistaListadoRegistrosClientes();
};

// ==================== FILTROS ====================
function inicializarEventosFiltrosRegistros() {
    const inputs = ['filtroFechaDesdeReg', 'filtroFechaHastaReg', 'filtroTipoProyecto', 
                    'filtroContacto', 'filtroAsesorReg', 'filtroCanalOrigen', 'busquedaRegistros', 'ordenRegistros'];
    
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.removeEventListener('change', aplicarFiltrosRegistros);
            elemento.removeEventListener('input', aplicarFiltrosRegistros);
            elemento.addEventListener('change', aplicarFiltrosRegistros);
            if (id === 'busquedaRegistros') {
                elemento.addEventListener('input', aplicarFiltrosRegistros);
            }
        }
    });
}

window.aplicarFiltrosRegistros = function() {
    paginaActualRegistros = 1;
    cargarVistaListadoRegistrosClientes();
};

window.limpiarFiltrosRegistros = function() {
    const filtrosIds = ['filtroFechaDesdeReg', 'filtroFechaHastaReg', 'filtroTipoProyecto', 
                        'filtroContacto', 'filtroAsesorReg', 'filtroCanalOrigen', 'busquedaRegistros'];
    
    filtrosIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const ordenSelect = document.getElementById('ordenRegistros');
    if (ordenSelect) ordenSelect.value = 'creado_el.desc';
    
    paginaActualRegistros = 1;
    cargarVistaListadoRegistrosClientes();
};

window.toggleFiltrosRegistrosPanel = function() {
    const panel = document.getElementById('panelFiltrosRegistros');
    const icon = document.getElementById('filtrosRegistrosIcon');
    
    if (!panel) return;
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        panel.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
};

function actualizarBadgeFiltrosRegistros() {
    let activos = 0;
    const filtrosIds = ['filtroFechaDesdeReg', 'filtroFechaHastaReg', 'filtroTipoProyecto', 
                        'filtroContacto', 'filtroAsesorReg', 'filtroCanalOrigen', 'busquedaRegistros'];
    
    filtrosIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value && el.value !== '') activos++;
    });
    
    const badge = document.getElementById('filtrosRegistrosBadge');
    if (badge) {
        if (activos > 0) {
            badge.textContent = activos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// ==================== EDITAR REGISTRO ====================
window.editarRegistroCliente = async function(id) {
    mostrarLoading('Cargando registro...');
    
    try {
        // Obtener los datos del registro
        const { data: registro, error } = await window.supabaseClient
            .from('registros_clientes_outlet')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Verificar permisos (solo el creador o admin pueden editar)
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        const esCreador = registro.registrado_por === usuarioActual.id;
        
        if (!esAdmin && !esCreador) {
            ocultarLoading();
            mostrarAlerta('Acceso denegado', 'No tienes permiso para editar este registro', 'error');
            return;
        }
        
        // Obtener vendedores para el select
        const { data: vendedores } = await window.supabaseClient
            .from('vendedores')
            .select('id, nombre, telefono')
            .eq('activo', true)
            .eq('atiende_outlet', true)
            .order('nombre');
        
        // Obtener productos para autocomplete
        const { data: productos } = await window.supabaseClient
            .from('productos')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre')
            .limit(50);
        
        ocultarLoading();
        
        // Determinar si la ubicación actual es de otro país para mostrar el campo adicional
        const esOtroPais = registro.ubicacion && registro.ubicacion.startsWith('Otro país:');
        let ubicacionActual = '';
        let otroPaisActual = '';
        
        if (esOtroPais) {
            // Extraer el nombre del país: "Otro país: Estados Unidos" -> "Estados Unidos"
            const match = registro.ubicacion.match(/Otro país:\s*(.+)/);
            if (match) {
                ubicacionActual = 'Otro país';
                otroPaisActual = match[1];
            } else {
                ubicacionActual = registro.ubicacion || '';
            }
        } else {
            ubicacionActual = registro.ubicacion || '';
        }
        
        // Lista de distritos (usar la misma variable global definida al inicio del archivo)
        // Asegúrate de que 'todasUbicaciones' esté definida globalmente
        const ubicacionesList = typeof todasUbicaciones !== 'undefined' ? todasUbicaciones : [];
        
        // Mostrar modal de edición
        const { value: formValues } = await Swal.fire({
            title: 'Editar Registro de Cliente',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <!-- ============================================ -->
                    <!-- SECCIÓN 1: DATOS PERSONALES -->
                    <!-- ============================================ -->
                    <div>
                        <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                            <i class="fas fa-user mr-2"></i>Datos Personales
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre completo <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="edit_nombre" class="form-input w-full" value="${escapeHtml(registro.cliente_nombre || '')}" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Teléfono <span class="text-red-500">*</span>
                                </label>
                                <input type="tel" id="edit_telefono" class="form-input w-full" value="${escapeHtml(registro.cliente_telefono || '')}" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Correo electrónico
                                </label>
                                <input type="email" id="edit_email" class="form-input w-full" value="${escapeHtml(registro.cliente_email || '')}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Empresa
                                </label>
                                <input type="text" id="edit_empresa" class="form-input w-full" value="${escapeHtml(registro.cliente_empresa || '')}">
                            </div>
                            
                            <!-- TIPO DE CLIENTE -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de cliente
                                </label>
                                <select id="edit_tipo_cliente" class="form-input w-full">
                                    <option value="">Seleccionar tipo</option>
                                    <option value="PERSONA_NATURAL" ${registro.tipo_cliente === 'PERSONA_NATURAL' ? 'selected' : ''}>👤 Persona Natural</option>
                                    <option value="ARQUITECTO" ${registro.tipo_cliente === 'ARQUITECTO' ? 'selected' : ''}>🏛️ Arquitecto</option>
                                    <option value="DISENADOR_INTERIORES" ${registro.tipo_cliente === 'DISENADOR_INTERIORES' ? 'selected' : ''}>🎨 Diseñador de Interiores</option>
                                    <option value="CONTRATISTA" ${registro.tipo_cliente === 'CONTRATISTA' ? 'selected' : ''}>🏗️ Contratista / Constructor</option>
                                    <option value="INGENIERO_CIVIL" ${registro.tipo_cliente === 'INGENIERO_CIVIL' ? 'selected' : ''}>📐 Ingeniero Civil</option>
                                    <option value="DECORADOR" ${registro.tipo_cliente === 'DECORADOR' ? 'selected' : ''}>🖼️ Decorador</option>
                                    <option value="DISTRIBUIDOR" ${registro.tipo_cliente === 'DISTRIBUIDOR' ? 'selected' : ''}>📦 Distribuidor / Revendedor</option>
                                    <option value="EMPRESA_CONSTRUCTORA" ${registro.tipo_cliente === 'EMPRESA_CONSTRUCTORA' ? 'selected' : ''}>🏢 Empresa Constructora</option>
                                    <option value="INMOBILIARIA" ${registro.tipo_cliente === 'INMOBILIARIA' ? 'selected' : ''}>🏘️ Inmobiliaria</option>
                                    <option value="OTRO" ${registro.tipo_cliente === 'OTRO' ? 'selected' : ''}>📌 Otro</option>
                                </select>
                            </div>
                            
                            <!-- UBICACIÓN CON BOTÓN DE MUNDO Y CAMPO ADICIONAL -->
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Ubicación / Distrito <span class="text-red-500">*</span>
                                </label>
                                <div class="flex gap-2">
                                    <div class="flex-1 relative">
                                        <input type="text" 
                                               id="edit_ubicacion" 
                                               list="distritos-list-edit" 
                                               class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                               placeholder="Ej: Miraflores, Arequipa, Otro país..." 
                                               value="${escapeHtml(ubicacionActual)}"
                                               required>
                                        <datalist id="distritos-list-edit">
                                            ${ubicacionesList.map(d => `<option value="${escapeHtml(d)}">`).join('')}
                                            <option value="Otro país (especificar)">
                                        </datalist>
                                    </div>
                                    <button type="button" 
                                            onclick="window.mostrarCampoOtroPaisEdit()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" 
                                            title="Especificar otro país">
                                        <i class="fas fa-globe-americas"></i>
                                    </button>
                                </div>
                                
                                <!-- Campo oculto para otro país -->
                                <div id="campo_otro_pais_edit" class="hidden mt-2">
                                    <div class="flex gap-2">
                                        <i class="fas fa-map-marker-alt text-primary mt-2"></i>
                                        <input type="text" 
                                               id="edit_otro_pais" 
                                               class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                               placeholder="Especifique el país (Ej: Estados Unidos, España, Chile, Argentina...)"
                                               value="${escapeHtml(otroPaisActual)}">
                                    </div>
                                    <p class="text-xs text-gray-400 mt-1">
                                        <i class="fas fa-info-circle"></i> Ingrese el nombre del país
                                    </p>
                                </div>
                                
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="fas fa-map-marked-alt"></i> Puede escribir el distrito, ciudad o seleccionar de la lista
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 2: INFORMACIÓN DEL PROYECTO -->
                    <!-- ============================================ -->
                    <div>
                        <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                            <i class="fas fa-hard-hat mr-2"></i>Información del Proyecto
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Producto de interés
                                </label>
                                <input type="text" id="edit_producto" list="productos-list-edit" class="form-input w-full" value="${escapeHtml(registro.producto_interes || '')}">
                                <datalist id="productos-list-edit">
                                    ${productos?.map(p => `<option value="${escapeHtml(p.nombre)}">`).join('')}
                                </datalist>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    M² estimados
                                </label>
                                <input type="number" id="edit_m2" class="form-input w-full" value="${registro.m2_estimados || ''}" min="0">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de proyecto
                                </label>
                                <select id="edit_tipo_proyecto" class="form-input w-full">
                                    <option value="">Seleccionar</option>
                                    <option value="OBRA_NUEVA" ${registro.tipo_proyecto === 'OBRA_NUEVA' ? 'selected' : ''}>🏗️ Obra nueva</option>
                                    <option value="REMODELACION" ${registro.tipo_proyecto === 'REMODELACION' ? 'selected' : ''}>🔨 Remodelación</option>
                                    <option value="REPOSICION" ${registro.tipo_proyecto === 'REPOSICION' ? 'selected' : ''}>🔄 Reposición</option>
                                    <option value="MANTENIMIENTO" ${registro.tipo_proyecto === 'MANTENIMIENTO' ? 'selected' : ''}>🛠️ Mantenimiento</option>
                                    <option value="OTRO" ${registro.tipo_proyecto === 'OTRO' ? 'selected' : ''}>📌 Otro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha estimada de compra
                                </label>
                                <select id="edit_fecha_compra" class="form-input w-full">
                                    <option value="">Seleccionar</option>
                                    <option value="INMEDIATA" ${registro.fecha_estimada_compra === 'INMEDIATA' ? 'selected' : ''}>🚀 Inmediata (menos de 15 días)</option>
                                    <option value="PROXIMO_MES" ${registro.fecha_estimada_compra === 'PROXIMO_MES' ? 'selected' : ''}>📅 Próximo mes (15-30 días)</option>
                                    <option value="1_3_MESES" ${registro.fecha_estimada_compra === '1_3_MESES' ? 'selected' : ''}>📆 1-3 meses</option>
                                    <option value="3_6_MESES" ${registro.fecha_estimada_compra === '3_6_MESES' ? 'selected' : ''}>🗓️ 3-6 meses</option>
                                    <option value="MAS_6_MESES" ${registro.fecha_estimada_compra === 'MAS_6_MESES' ? 'selected' : ''}>📅 Más de 6 meses</option>
                                    <option value="SOLO_COTIZAR" ${registro.fecha_estimada_compra === 'SOLO_COTIZAR' ? 'selected' : ''}>📄 Solo cotizar</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 3: CONTACTO Y PREFERENCIAS -->
                    <!-- ============================================ -->
                    <div>
                        <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                            <i class="fas fa-phone-alt mr-2"></i>Contacto y Preferencias
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Medio de contacto preferido
                                </label>
                                <select id="edit_medio_contacto" class="form-input w-full">
                                    <option value="">Seleccionar</option>
                                    <option value="WHATSAPP" ${registro.medio_contacto_preferido === 'WHATSAPP' ? 'selected' : ''}>📱 WhatsApp</option>
                                    <option value="LLAMADA" ${registro.medio_contacto_preferido === 'LLAMADA' ? 'selected' : ''}>📞 Llamada telefónica</option>
                                    <option value="EMAIL" ${registro.medio_contacto_preferido === 'EMAIL' ? 'selected' : ''}>✉️ Correo electrónico</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Asesor asignado
                                </label>
                                <select id="edit_asesor" class="form-input w-full">
                                    <option value="">Seleccionar asesor</option>
                                    ${vendedores?.map(v => `<option value="${v.id}" ${registro.asesor_asignado_id === v.id ? 'selected' : ''}>${escapeHtml(v.nombre)} ${v.telefono ? `(${v.telefono})` : ''}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    ¿Cómo nos conoció?
                                </label>
                                <select id="edit_canal_origen" class="form-input w-full">
                                    <option value="">Seleccionar</option>
                                    <option value="GOOGLE" ${registro.canal_origen === 'GOOGLE' ? 'selected' : ''}>🔍 Google / Búsqueda web</option>
                                    <option value="FACEBOOK" ${registro.canal_origen === 'FACEBOOK' ? 'selected' : ''}>📘 Facebook / Instagram</option>
                                    <option value="RECOMENDACION" ${registro.canal_origen === 'RECOMENDACION' ? 'selected' : ''}>⭐ Recomendación</option>
                                    <option value="VISITA_LOCAL" ${registro.canal_origen === 'VISITA_LOCAL' ? 'selected' : ''}>🏢 Visita al local</option>
                                    <option value="ARQUITECTO" ${registro.canal_origen === 'ARQUITECTO' ? 'selected' : ''}>🏛️ Referencia de arquitecto/constructor</option>
                                    <option value="OUTLET_FISICO" ${registro.canal_origen === 'OUTLET_FISICO' ? 'selected' : ''}>🏪 Outlet físico</option>
                                    <option value="FERIA" ${registro.canal_origen === 'FERIA' ? 'selected' : ''}>🎪 Feria / Exposición</option>
                                    <option value="OTRO" ${registro.canal_origen === 'OTRO' ? 'selected' : ''}>📌 Otro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Estado de contacto
                                </label>
                                <select id="edit_contactado" class="form-input w-full">
                                    <option value="false" ${!registro.contactado ? 'selected' : ''}>⏳ Pendiente</option>
                                    <option value="true" ${registro.contactado ? 'selected' : ''}>✅ Contactado</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- DESEA RECIBIR OFERTAS -->
                        <div class="mt-3">
                            <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <input type="checkbox" id="edit_desea_ofertas" class="w-5 h-5 text-primary rounded focus:ring-primary" ${registro.desea_ofertas ? 'checked' : ''}>
                                <div>
                                    <span class="font-medium text-gray-700">📧 Desea recibir ofertas y promociones</span>
                                    <p class="text-xs text-gray-400">Enviar información sobre novedades, ofertas y promociones de Gallos Mármol</p>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 4: NOTAS -->
                    <!-- ============================================ -->
                    <div>
                        <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                            <i class="fas fa-comment-dots mr-2"></i>Notas
                        </h3>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Observaciones
                            </label>
                            <textarea id="edit_observaciones" rows="3" class="form-input w-full" placeholder="Comentarios adicionales, necesidades específicas, etc.">${escapeHtml(registro.observaciones || '')}</textarea>
                        </div>
                        ${registro.notas_seguimiento ? `
                        <div class="mt-3">
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Notas de seguimiento
                            </label>
                            <textarea id="edit_notas_seguimiento" rows="2" class="form-input w-full bg-gray-50" placeholder="Notas del seguimiento realizado...">${escapeHtml(registro.notas_seguimiento || '')}</textarea>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `,
            width: '800px',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                // ============================================
                // INICIALIZAR EVENTOS DEL CAMPO UBICACIÓN EN EDICIÓN
                // ============================================
                
                // Si era otro país, mostrar el campo adicional
                if (esOtroPais) {
                    const campoOtro = document.getElementById('campo_otro_pais_edit');
                    if (campoOtro) campoOtro.classList.remove('hidden');
                }
                
                // Función para mostrar/ocultar campo de otro país (para edición)
                window.mostrarCampoOtroPaisEdit = function() {
                    const campoOtro = document.getElementById('campo_otro_pais_edit');
                    const ubicacionInput = document.getElementById('edit_ubicacion');
                    
                    if (!campoOtro || !ubicacionInput) return;
                    
                    if (campoOtro.classList.contains('hidden')) {
                        campoOtro.classList.remove('hidden');
                        ubicacionInput.value = 'Otro país';
                        setTimeout(() => {
                            document.getElementById('edit_otro_pais')?.focus();
                        }, 100);
                    } else {
                        campoOtro.classList.add('hidden');
                        if (ubicacionInput.value === 'Otro país' || ubicacionInput.value === 'Otro país (especificar)') {
                            ubicacionInput.value = '';
                        }
                        const otroPaisInput = document.getElementById('edit_otro_pais');
                        if (otroPaisInput) otroPaisInput.value = '';
                    }
                };
                
                // Evento en tiempo real para el input de ubicación
                const ubicacionInputEdit = document.getElementById('edit_ubicacion');
                if (ubicacionInputEdit) {
                    ubicacionInputEdit.addEventListener('input', function() {
                        const campoOtro = document.getElementById('campo_otro_pais_edit');
                        const otroPaisInput = document.getElementById('edit_otro_pais');
                        
                        if (this.value === 'Otro país (especificar)' || this.value === 'Otro país') {
                            if (campoOtro && campoOtro.classList.contains('hidden')) {
                                campoOtro.classList.remove('hidden');
                                if (otroPaisInput) {
                                    setTimeout(() => otroPaisInput.focus(), 100);
                                }
                            }
                        } else if (campoOtro && !campoOtro.classList.contains('hidden')) {
                            campoOtro.classList.add('hidden');
                            if (otroPaisInput) otroPaisInput.value = '';
                        }
                    });
                }
                
                // Capitalizar primera letra del país
                const otroPaisInputEdit = document.getElementById('edit_otro_pais');
                if (otroPaisInputEdit) {
                    otroPaisInputEdit.addEventListener('blur', function() {
                        if (this.value) {
                            this.value = this.value.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                        }
                    });
                }
            },
            preConfirm: () => {
                const nombre = document.getElementById('edit_nombre')?.value;
                const telefono = document.getElementById('edit_telefono')?.value;
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }
                if (!telefono) {
                    Swal.showValidationMessage('El teléfono es obligatorio');
                    return false;
                }
                
                // Procesar ubicación igual que en el registro
                let ubicacion = document.getElementById('edit_ubicacion')?.value?.trim();
                const otroPais = document.getElementById('edit_otro_pais')?.value?.trim();
                
                if (ubicacion === 'Otro país (especificar)' || ubicacion === 'Otro país') {
                    if (otroPais && otroPais !== '') {
                        ubicacion = `Otro país: ${otroPais}`;
                    } else {
                        ubicacion = 'Otro país (no especificado)';
                    }
                }
                
                if (!ubicacion || ubicacion === '') {
                    ubicacion = null;
                }
                
                return {
                    nombre: nombre,
                    telefono: telefono,
                    email: document.getElementById('edit_email')?.value || null,
                    empresa: document.getElementById('edit_empresa')?.value || null,
                    tipo_cliente: document.getElementById('edit_tipo_cliente')?.value || null,
                    ubicacion: ubicacion,
                    producto: document.getElementById('edit_producto')?.value || null,
                    m2: parseInt(document.getElementById('edit_m2')?.value) || null,
                    tipo_proyecto: document.getElementById('edit_tipo_proyecto')?.value || null,
                    fecha_compra: document.getElementById('edit_fecha_compra')?.value || null,
                    medio_contacto: document.getElementById('edit_medio_contacto')?.value || null,
                    asesor_id: document.getElementById('edit_asesor')?.value || null,
                    canal_origen: document.getElementById('edit_canal_origen')?.value || null,
                    contactado: document.getElementById('edit_contactado')?.value === 'true',
                    desea_ofertas: document.getElementById('edit_desea_ofertas')?.checked || false,
                    observaciones: document.getElementById('edit_observaciones')?.value || null,
                    notas_seguimiento: document.getElementById('edit_notas_seguimiento')?.value || null
                };
            }
        });
        
        if (formValues) {
            mostrarLoading('Guardando cambios...');
            
            try {
                const ahora = getFechaLocalPeru();
                
                const updateData = {
                    cliente_nombre: formValues.nombre,
                    cliente_telefono: formValues.telefono,
                    cliente_email: formValues.email,
                    cliente_empresa: formValues.empresa,
                    tipo_cliente: formValues.tipo_cliente,
                    ubicacion: formValues.ubicacion,
                    producto_interes: formValues.producto,
                    m2_estimados: formValues.m2,
                    tipo_proyecto: formValues.tipo_proyecto,
                    fecha_estimada_compra: formValues.fecha_compra,
                    medio_contacto_preferido: formValues.medio_contacto,
                    asesor_asignado_id: formValues.asesor_id,
                    canal_origen: formValues.canal_origen,
                    contactado: formValues.contactado,
                    desea_ofertas: formValues.desea_ofertas,
                    observaciones: formValues.observaciones,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                };
                
                // Si se marcó como contactado y no tenía fecha, agregarla
                if (formValues.contactado && !registro.contactado) {
                    updateData.fecha_contactado = ahora;
                }
                
                // Agregar notas de seguimiento si existen
                if (formValues.notas_seguimiento) {
                    updateData.notas_seguimiento = formValues.notas_seguimiento;
                }
                
                const { error } = await window.supabaseClient
                    .from('registros_clientes_outlet')
                    .update(updateData)
                    .eq('id', id);
                
                if (error) throw error;
                
                ocultarLoading();
                mostrarAlerta('Éxito', 'Registro actualizado correctamente', 'success');
                
                // Recargar la vista
                await cargarVistaListadoRegistrosClientes();
                
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo actualizar el registro: ' + (error.message || 'Error desconocido'), 'error');
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el registro para editar', 'error');
    }
};

// ==================== ELIMINAR REGISTRO ====================
window.eliminarRegistroCliente = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar registro?',
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
                .from('registros_clientes_outlet')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Registro eliminado correctamente', 'success');
            await cargarVistaListadoRegistrosClientes();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el registro', 'error');
        }
    }
};

// ==================== OBTENER REGISTROS CON FILTROS ====================
async function obtenerRegistrosConFiltros() {
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    const esAdmin = permisos.rol === 'ADMINISTRADOR';
    
    const filtros = {
        fechaDesde: document.getElementById('filtroFechaDesdeReg')?.value,
        fechaHasta: document.getElementById('filtroFechaHastaReg')?.value,
        tipoProyecto: document.getElementById('filtroTipoProyecto')?.value,
        contactado: document.getElementById('filtroContacto')?.value,
        asesorId: document.getElementById('filtroAsesorReg')?.value,
        canalOrigen: document.getElementById('filtroCanalOrigen')?.value,
        busqueda: document.getElementById('busquedaRegistros')?.value,
        orden: document.getElementById('ordenRegistros')?.value || 'creado_el.desc'
    };
    
    let query = window.supabaseClient
        .from('registros_clientes_outlet')
        .select(`
            *,
            asesor:asesor_asignado_id(id, nombre),
            registrado_por_usuario:registrado_por(id, correo)
        `);
    
    if (!esAdmin) {
        query = query.eq('registrado_por', usuarioActual.id);
    }
    
    if (filtros.fechaDesde) query = query.gte('creado_el', `${filtros.fechaDesde}T00:00:00`);
    if (filtros.fechaHasta) query = query.lte('creado_el', `${filtros.fechaHasta}T23:59:59`);
    if (filtros.tipoProyecto) query = query.eq('tipo_proyecto', filtros.tipoProyecto);
    if (filtros.contactado === 'si') query = query.eq('contactado', true);
    if (filtros.contactado === 'no') query = query.eq('contactado', false);
    if (filtros.asesorId) query = query.eq('asesor_asignado_id', filtros.asesorId);
    if (filtros.canalOrigen) query = query.eq('canal_origen', filtros.canalOrigen);
    if (filtros.busqueda) {
        query = query.or(`cliente_nombre.ilike.%${filtros.busqueda}%,cliente_telefono.ilike.%${filtros.busqueda}%,cliente_email.ilike.%${filtros.busqueda}%`);
    }
    
    const [campoOrden, direccion] = filtros.orden.split('.');
    query = query.order(campoOrden, { ascending: direccion === 'asc' });
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// ==================== EXPORTAR A EXCEL ====================
window.exportarRegistrosExcel = async function() {
    mostrarLoading('Generando archivo Excel...');
    
    try {
        const registros = await obtenerRegistrosConFiltros();
        
        if (!registros || registros.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay registros para exportar con los filtros seleccionados', 'info');
            return;
        }
        
        // Mapeo de valores para mejor legibilidad
        const tipoClienteMap = {
            'PERSONA_NATURAL': 'Persona Natural',
            'ARQUITECTO': 'Arquitecto',
            'DISENADOR_INTERIORES': 'Diseñador de Interiores',
            'CONTRATISTA': 'Contratista',
            'INGENIERO_CIVIL': 'Ingeniero Civil',
            'DECORADOR': 'Decorador',
            'DISTRIBUIDOR': 'Distribuidor',
            'EMPRESA_CONSTRUCTORA': 'Empresa Constructora',
            'INMOBILIARIA': 'Inmobiliaria',
            'OTRO': 'Otro'
        };
        
        const tipoProyectoMap = {
            'OBRA_NUEVA': 'Obra nueva',
            'REMODELACION': 'Remodelación',
            'REPOSICION': 'Reposición',
            'MANTENIMIENTO': 'Mantenimiento',
            'OTRO': 'Otro'
        };
        
        const medioContactoMap = {
            'WHATSAPP': 'WhatsApp',
            'LLAMADA': 'Llamada telefónica',
            'EMAIL': 'Correo electrónico'
        };
        
        const canalOrigenMap = {
            'GOOGLE': 'Google',
            'FACEBOOK': 'Facebook/Instagram',
            'RECOMENDACION': 'Recomendación',
            'VISITA_LOCAL': 'Visita al local',
            'ARQUITECTO': 'Referencia arquitecto',
            'OUTLET_FISICO': 'Outlet físico',
            'FERIA': 'Feria/Exposición',
            'OTRO': 'Otro'
        };
        
        const fechaCompraMap = {
            'INMEDIATA': 'Inmediata (<15 días)',
            'PROXIMO_MES': 'Próximo mes (15-30 días)',
            '1_3_MESES': '1-3 meses',
            '3_6_MESES': '3-6 meses',
            'MAS_6_MESES': 'Más de 6 meses',
            'SOLO_COTIZAR': 'Solo cotizar'
        };
        
        const datos = registros.map(r => ({
            'FECHA REGISTRO': new Date(r.creado_el).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            'NOMBRE COMPLETO': r.cliente_nombre || '',
            'TELÉFONO': r.cliente_telefono || '',
            'EMAIL': r.cliente_email || '',
            'EMPRESA': r.cliente_empresa || '',
            'TIPO CLIENTE': tipoClienteMap[r.tipo_cliente] || r.tipo_cliente || '',
            'UBICACIÓN': r.ubicacion || '',
            'FAMILIA PRODUCTO': r.familia_interes || '',
            'M² ESTIMADOS': r.m2_estimados || 0,
            'TIPO PROYECTO': tipoProyectoMap[r.tipo_proyecto] || r.tipo_proyecto || '',
            'FECHA ESTIMADA COMPRA': fechaCompraMap[r.fecha_estimada_compra] || r.fecha_estimada_compra || '',
            'MEDIO CONTACTO': medioContactoMap[r.medio_contacto_preferido] || r.medio_contacto_preferido || '',
            'CANAL ORIGEN': canalOrigenMap[r.canal_origen] || r.canal_origen || '',
            'ASESOR ASIGNADO': r.asesor?.nombre || '',
            '¿CONTACTADO?': r.contactado ? 'Sí' : 'No',
            'FECHA CONTACTO': r.fecha_contactado ? new Date(r.fecha_contactado).toLocaleString('es-ES') : '',
            '¿DESEA OFERTAS?': r.desea_ofertas ? 'Sí' : 'No',
            'OBSERVACIONES': r.observaciones || '',
            'NOTAS SEGUIMIENTO': r.notas_seguimiento || '',
            'REGISTRADO POR': r.registrado_por_usuario?.correo || '',
            'ÚLTIMA MODIFICACIÓN': r.modificado_el ? new Date(r.modificado_el).toLocaleString('es-ES') : ''
        }));
        
        // Definir columnas en orden lógico para análisis
        const columnas = [
            'FECHA REGISTRO',
            'NOMBRE COMPLETO',
            'TELÉFONO',
            'EMAIL',
            'EMPRESA',
            'TIPO CLIENTE',
            'UBICACIÓN',
            'FAMILIA PRODUCTO',
            'M² ESTIMADOS',
            'TIPO PROYECTO',
            'FECHA ESTIMADA COMPRA',
            'MEDIO CONTACTO',
            'CANAL ORIGEN',
            'ASESOR ASIGNADO',
            '¿CONTACTADO?',
            'FECHA CONTACTO',
            '¿DESEA OFERTAS?',
            'OBSERVACIONES',
            'NOTAS SEGUIMIENTO',
            'REGISTRADO POR',
            'ÚLTIMA MODIFICACIÓN'
        ];
        
        // Crear hoja de Excel
        const ws = XLSX.utils.json_to_sheet(datos, { header: columnas });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registros Clientes Outlet');
        
        // Ajustar ancho de columnas
        const colWidths = columnas.map(col => ({ 
            wch: Math.min(Math.max(col.length, 15), 50) 
        }));
        ws['!cols'] = colWidths;
        
        // Dar formato a la cabecera (negrilla)
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!ws[address]) continue;
            ws[address].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "39080A" } },
                alignment: { horizontal: "center" }
            };
        }
        
        // Exportar archivo
        XLSX.writeFile(wb, `registros_clientes_outlet_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} registros a Excel`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// ==================== EXPORTAR A PDF ====================
window.exportarRegistrosPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        const registros = await obtenerRegistrosConFiltros();
        
        if (!registros || registros.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay registros para exportar', 'info');
            return;
        }
        
        // Calcular estadísticas para el reporte
        const total = registros.length;
        const contactados = registros.filter(r => r.contactado).length;
        const pendientes = total - contactados;
        const deseanOfertas = registros.filter(r => r.desea_ofertas).length;
        const noDeseanOfertas = total - deseanOfertas;
        
        // Contar por tipo de cliente
        const tipoClienteCount = {};
        registros.forEach(r => {
            const tipo = r.tipo_cliente || 'No especificado';
            tipoClienteCount[tipo] = (tipoClienteCount[tipo] || 0) + 1;
        });
        
        // Contar por familia de producto
        const familiaCount = {};
        registros.forEach(r => {
            if (r.familia_interes) {
                familiaCount[r.familia_interes] = (familiaCount[r.familia_interes] || 0) + 1;
            }
        });
        
        // Top 5 familias más solicitadas
        const topFamilias = Object.entries(familiaCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        // Contar por canal de origen
        const canalCount = {};
        registros.forEach(r => {
            const canal = r.canal_origen || 'No especificado';
            canalCount[canal] = (canalCount[canal] || 0) + 1;
        });
        
        // Mapeo de valores para el PDF
        const tipoClienteMapPDF = {
            'PERSONA_NATURAL': 'Persona Natural',
            'ARQUITECTO': 'Arquitecto',
            'DISENADOR_INTERIORES': 'Diseñador de Interiores',
            'CONTRATISTA': 'Contratista',
            'INGENIERO_CIVIL': 'Ingeniero Civil',
            'DECORADOR': 'Decorador',
            'DISTRIBUIDOR': 'Distribuidor',
            'EMPRESA_CONSTRUCTORA': 'Empresa Constructora',
            'INMOBILIARIA': 'Inmobiliaria',
            'OTRO': 'Otro'
        };
        
        const tipoProyectoMapPDF = {
            'OBRA_NUEVA': 'Obra nueva',
            'REMODELACION': 'Remodelación',
            'REPOSICION': 'Reposición',
            'MANTENIMIENTO': 'Mantenimiento',
            'OTRO': 'Otro'
        };
        
        const canalOrigenMapPDF = {
            'GOOGLE': 'Google',
            'FACEBOOK': 'Facebook/Instagram',
            'RECOMENDACION': 'Recomendación',
            'VISITA_LOCAL': 'Visita al local',
            'ARQUITECTO': 'Referencia arquitecto',
            'OUTLET_FISICO': 'Outlet físico',
            'FERIA': 'Feria/Exposición',
            'OTRO': 'Otro'
        };
        
        // Obtener filtros aplicados para el reporte
        const filtros = obtenerFiltrosTexto();
        
        // Generar HTML del reporte
        let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Clientes Outlet</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: white;
                        padding: 20px;
                    }
                    .report-container {
                        max-width: 1280px;
                        margin: 0 auto;
                        background: white;
                    }
                    .report-header {
                        text-align: center;
                        margin-bottom: 25px;
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
                        font-size: 11px;
                    }
                    .filtros {
                        background: #f0f0f0;
                        padding: 10px 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                        font-size: 11px;
                    }
                    .stats-container {
                        display: flex;
                        gap: 12px;
                        margin: 20px 0;
                        flex-wrap: wrap;
                    }
                    .stat-card {
                        flex: 1;
                        min-width: 120px;
                        background: #f8f9fa;
                        border-radius: 10px;
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
                    .section-title {
                        font-size: 16px;
                        font-weight: bold;
                        color: #39080a;
                        margin: 20px 0 12px 0;
                        padding-bottom: 5px;
                        border-bottom: 2px solid #d4d4ae;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .stat-item {
                        background: #f8f9fa;
                        padding: 10px;
                        border-radius: 8px;
                        font-size: 12px;
                    }
                    .stat-item .label {
                        font-weight: bold;
                        color: #555;
                    }
                    .stat-item .value {
                        font-size: 18px;
                        font-weight: bold;
                        color: #39080a;
                        margin-top: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                        margin-top: 15px;
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
                    .badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 9px;
                        font-weight: bold;
                    }
                    .badge-contactado { background: #d1fae5; color: #065f46; }
                    .badge-pendiente { background: #fed7aa; color: #9a3412; }
                    .badge-ofertas-si { background: #d1fae5; color: #065f46; }
                    .badge-ofertas-no { background: #fee2e2; color: #991b1b; }
                    .footer {
                        text-align: center;
                        font-size: 9px;
                        color: #999;
                        margin-top: 25px;
                        padding-top: 15px;
                        border-top: 1px solid #ddd;
                    }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="report-header">
                        <h1>📋 REPORTE DE CLIENTES OUTLET</h1>
                        <p>Gallos Mármol - Sistema de Gestión de Clientes</p>
                        <p>Generado: ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <p>Usuario: ${usuarioActual?.empleados?.nombre_completo || usuarioActual?.correo || 'Sistema'}</p>
                    </div>
                    
                    <div class="filtros">
                        <strong>📊 Filtros aplicados:</strong> ${filtros}
                    </div>
                    
                    <!-- KPIs PRINCIPALES -->
                    <div class="stats-container">
                        <div class="stat-card"><div class="number">${total}</div><div class="label">Total Registros</div></div>
                        <div class="stat-card"><div class="number">${contactados}</div><div class="label">Contactados</div></div>
                        <div class="stat-card"><div class="number">${pendientes}</div><div class="label">Pendientes</div></div>
                        <div class="stat-card"><div class="number">${deseanOfertas}</div><div class="label">Desean Ofertas</div></div>
                    </div>
                    
                    <!-- ESTADÍSTICAS DETALLADAS -->
                    <div class="section-title">📊 Análisis por Tipo de Cliente</div>
                    <div class="stats-grid">
                        ${Object.entries(tipoClienteCount).map(([tipo, count]) => `
                            <div class="stat-item">
                                <div class="label">${tipoClienteMapPDF[tipo] || tipo}</div>
                                <div class="value">${count} (${Math.round(count/total*100)}%)</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="section-title">🏷️ Top 5 Familias de Producto más Solicitadas</div>
                    <div class="stats-grid">
                        ${topFamilias.map(([familia, count]) => `
                            <div class="stat-item">
                                <div class="label">${familia}</div>
                                <div class="value">${count} cliente${count !== 1 ? 's' : ''}</div>
                            </div>
                        `).join('')}
                        ${topFamilias.length === 0 ? '<div class="stat-item"><div class="label">No hay datos</div><div class="value">-</div></div>' : ''}
                    </div>
                    
                    <div class="section-title">🌐 Canales de Origen</div>
                    <div class="stats-grid">
                        ${Object.entries(canalCount).map(([canal, count]) => `
                            <div class="stat-item">
                                <div class="label">${canalOrigenMapPDF[canal] || canal}</div>
                                <div class="value">${count} (${Math.round(count/total*100)}%)</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- TABLA DE REGISTROS -->
                    <div class="section-title">📋 Detalle de Registros</div>
                    <div class="overflow-x-auto">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Teléfono</th>
                                    <th>Tipo</th>
                                    <th>Ubicación</th>
                                    <th>Familia</th>
                                    <th>M²</th>
                                    <th>Tipo Proyecto</th>
                                    <th>Asesor</th>
                                    <th>Ofertas</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${registros.map(r => `
                                    <tr>
                                        <td style="white-space: nowrap;">${new Date(r.creado_el).toLocaleDateString()}</td>
                                        <td><strong>${r.cliente_nombre || '-'}</strong>${r.cliente_empresa ? `<br><small>${r.cliente_empresa}</small>` : ''}</td>
                                        <td>${r.cliente_telefono || '-'}</td>
                                        <td>${tipoClienteMapPDF[r.tipo_cliente] || r.tipo_cliente || '-'}</td>
                                        <td>${r.ubicacion || '-'}</td>
                                        <td>${r.familia_interes || '-'}</td>
                                        <td style="text-align: center;">${r.m2_estimados || '-'}</td>
                                        <td>${tipoProyectoMapPDF[r.tipo_proyecto] || r.tipo_proyecto || '-'}</td>
                                        <td>${r.asesor?.nombre || '-'}</td>
                                        <td style="text-align: center;">
                                            <span class="badge ${r.desea_ofertas ? 'badge-ofertas-si' : 'badge-ofertas-no'}">
                                                ${r.desea_ofertas ? 'Sí' : 'No'}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge ${r.contactado ? 'badge-contactado' : 'badge-pendiente'}">
                                                ${r.contactado ? 'Contactado' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- PIE DE PÁGINA -->
                    <div class="footer">
                        <p>Reporte generado automáticamente por el Sistema de Gestión de Activos TI - Gallos Mármol</p>
                        <p>Total de registros: ${total} | Contactados: ${contactados} | Pendientes: ${pendientes} | Desean ofertas: ${deseanOfertas}</p>
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
        mostrarAlerta('Éxito', `Se exportaron ${registros.length} registros a PDF`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// ==================== OBTENER TEXTO DE FILTROS APLICADOS ====================
function obtenerFiltrosTexto() {
    const filtros = [];
    
    const fechaDesde = document.getElementById('filtroFechaDesdeReg')?.value;
    const fechaHasta = document.getElementById('filtroFechaHastaReg')?.value;
    const tipoProyecto = document.getElementById('filtroTipoProyecto')?.value;
    const contactado = document.getElementById('filtroContacto')?.value;
    const asesor = document.getElementById('filtroAsesorReg')?.value;
    const busqueda = document.getElementById('busquedaRegistros')?.value;
    
    if (fechaDesde) filtros.push(`📅 Desde: ${fechaDesde}`);
    if (fechaHasta) filtros.push(`📅 Hasta: ${fechaHasta}`);
    
    if (tipoProyecto) {
        const tipoMap = {
            'OBRA_NUEVA': 'Obra nueva',
            'REMODELACION': 'Remodelación',
            'REPOSICION': 'Reposición',
            'MANTENIMIENTO': 'Mantenimiento',
            'OTRO': 'Otro'
        };
        filtros.push(`🏗️ Tipo: ${tipoMap[tipoProyecto] || tipoProyecto}`);
    }
    
    if (contactado === 'si') filtros.push('✅ Contactados');
    if (contactado === 'no') filtros.push('⏳ Pendientes');
    
    if (asesor) filtros.push(`👨‍💼 Asesor: ID ${asesor}`);
    if (busqueda) filtros.push(`🔍 Búsqueda: "${busqueda}"`);
    
    return filtros.length > 0 ? filtros.join(' | ') : 'Ninguno (todos los registros)';
}

// ==================== TOGGLE PERMISO DE EMPLEADO ====================
window.togglePermisoRegistro = async function(empleadoId, estadoActual) {
    const nuevoEstado = !estadoActual;
    const accion = nuevoEstado ? 'habilitar' : 'deshabilitar';
    
    const result = await Swal.fire({
        title: `¿${accion === 'habilitar' ? 'Habilitar' : 'Deshabilitar'} permiso?`,
        text: `El empleado ${accion === 'habilitar' ? 'podrá' : 'ya no podrá'} registrar clientes en el outlet.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado ? '#28a745' : '#dc3545',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        
        try {
            const { error } = await window.supabaseClient
                .from('empleados')
                .update({ puede_registrar_clientes_outlet: nuevoEstado })
                .eq('id', empleadoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Permiso ${accion}do correctamente`, 'success');
            await cargarVistaGestionarPermisosRegistro();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el permiso', 'error');
        }
    }
};

async function cargarVistaRegistroClientesOutlet() {
    mostrarLoading('Cargando módulo...');
    
    try {
        // Verificar permisos
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        let puedeRegistrar = false;
        
        if (permisos.rol === 'ADMINISTRADOR') {
            puedeRegistrar = true;
        } else if (permisos.rol === 'EMPLEADO' && permisos.empleadoId) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('puede_registrar_clientes_outlet')
                .eq('id', permisos.empleadoId)
                .single();
            puedeRegistrar = empleado?.puede_registrar_clientes_outlet || false;
        } else if (permisos.rol === 'OPERADOR_EMPRESA') {
            puedeRegistrar = true;
        }
        
        if (!puedeRegistrar) {
            mostrarAlerta('Acceso denegado', 'No tienes permisos para registrar clientes', 'error');
            ocultarLoading();
            return;
        }
        
        // Obtener vendedores
        const { data: vendedores } = await window.supabaseClient
            .from('vendedores')
            .select('id, nombre, telefono')
            .eq('activo', true)
            .eq('atiende_outlet', true)
            .order('nombre');
        
        // Obtener familias de productos
        const { data: familias, error: errorFamilias } = await window.supabaseClient
            .from('producto_familias')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (errorFamilias) {
            console.error('Error cargando familias:', errorFamilias);
        }
        
        // Generar opciones de familias
        const familiasOptions = familias?.map(f => 
            `<option value="${escapeHtml(f.nombre)}">${escapeHtml(f.nombre)}${f.descripcion ? ` - ${escapeHtml(f.descripcion.substring(0, 40))}` : ''}</option>`
        ).join('') || '<option value="" disabled>No hay familias registradas</option>';
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-user-plus"></i> Registrar Cliente Outlet
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Registro manual de clientes que visitan el outlet físico
                        </p>
                    </div>
                    <button onclick="window.cargarVista('listadoRegistrosClientes')" class="btn-secondary flex items-center gap-2">
                        <i class="fas fa-list-alt"></i> Ver Listado
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
                <form id="registroClienteForm" onsubmit="guardarRegistroCliente(event)">
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 1: DATOS PERSONALES -->
                    <!-- ============================================ -->
                    <div class="mb-6">
                        <h3 class="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                            <i class="fas fa-user text-primary mr-2"></i> Datos Personales
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- NOMBRE COMPLETO -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre completo <span class="text-red-500">*</span>
                                </label>
                                <input type="text" 
                                       id="reg_nombre" 
                                       class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                       placeholder="Ej: Juan Pérez"
                                       oninput="validarCampoNombre(this)">
                                <div id="error-nombre" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <!-- TELÉFONO CON VALIDACIÓN -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Teléfono <span class="text-red-500">*</span>
                                    <span class="text-gray-400 font-normal ml-1">(incluye código país)</span>
                                </label>
                                <div class="flex gap-2">
                                    <select id="prefijo-pais" class="w-32 p-2 border border-gray-300 rounded-lg text-sm bg-white" onchange="actualizarPlaceholderTelefono()">
                                        <option value="51" selected>🇵🇪 Perú (+51)</option>
                                        <option value="1">🇺🇸 EE.UU (+1)</option>
                                        <option value="34">🇪🇸 España (+34)</option>
                                        <option value="52">🇲🇽 México (+52)</option>
                                        <option value="54">🇦🇷 Argentina (+54)</option>
                                        <option value="56">🇨🇱 Chile (+56)</option>
                                        <option value="57">🇨🇴 Colombia (+57)</option>
                                        <option value="58">🇻🇪 Venezuela (+58)</option>
                                        <option value="33">🇫🇷 Francia (+33)</option>
                                        <option value="49">🇩🇪 Alemania (+49)</option>
                                        <option value="44">🇬🇧 Reino Unido (+44)</option>
                                        <option value="55">🇧🇷 Brasil (+55)</option>
                                    </select>
                                    <input type="tel" 
                                           id="reg_telefono" 
                                           class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                           placeholder="Ej: 987654321"
                                           oninput="validarCampoTelefono(this)">
                                </div>
                                <div id="error-telefono" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="fas fa-info-circle"></i> Ingresa solo números. Si es fuera de Perú, selecciona el código de país.
                                </p>
                            </div>
                            
                            <!-- CORREO ELECTRÓNICO -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Correo electrónico
                                </label>
                                <input type="email" 
                                       id="reg_email" 
                                       class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                       placeholder="cliente@ejemplo.com"
                                       oninput="validarCampoEmail(this)">
                                <div id="error-email" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <!-- EMPRESA -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Empresa
                                </label>
                                <input type="text" 
                                       id="reg_empresa" 
                                       class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                       placeholder="Nombre de la empresa"
                                       oninput="validarCampoEmpresa(this)">
                                <div id="error-empresa" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <!-- TIPO DE CLIENTE -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de cliente <span class="text-red-500">*</span>
                                </label>
                                <select id="reg_tipo_cliente" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" onchange="validarCampoTipoCliente(this)">
                                    <option value="">Seleccionar tipo</option>
                                    <option value="PERSONA_NATURAL">👤 Persona Natural</option>
                                    <option value="ARQUITECTO">🏛️ Arquitecto</option>
                                    <option value="DISENADOR_INTERIORES">🎨 Diseñador de Interiores</option>
                                    <option value="CONTRATISTA">🏗️ Contratista</option>
                                    <option value="INGENIERO_CIVIL">📐 Ingeniero Civil</option>
                                    <option value="DECORADOR">🖼️ Decorador</option>
                                    <option value="DISTRIBUIDOR">📦 Distribuidor</option>
                                    <option value="EMPRESA_CONSTRUCTORA">🏢 Emp. Constructora</option>
                                    <option value="INMOBILIARIA">🏘️ Inmobiliaria</option>
                                    <option value="OTRO">📌 Otro</option>
                                </select>
                                <div id="error-tipo-cliente" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <!-- UBICACIÓN CON BOTÓN DE MUNDO -->
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Ubicación / Distrito <span class="text-red-500">*</span>
                                </label>
                                <div class="flex gap-2">
                                    <div class="flex-1 relative">
                                        <input type="text" 
                                               id="reg_ubicacion" 
                                               list="distritos-list" 
                                               class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                               placeholder="Ej: Miraflores, Arequipa, Otro país..." 
                                               oninput="validarCampoUbicacion(this)">
                                        <datalist id="distritos-list">
                                            ${getUbicacionesOptions()}
                                            <option value="Otro país (especificar)">
                                        </datalist>
                                    </div>
                                    <button type="button" 
                                            onclick="window.mostrarCampoOtroPais()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" 
                                            title="Especificar otro país">
                                        <i class="fas fa-globe-americas"></i>
                                    </button>
                                </div>
                                <div id="error-ubicacion" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                                <div id="campo_otro_pais" class="hidden mt-2">
                                    <div class="flex gap-2">
                                        <i class="fas fa-map-marker-alt text-primary mt-2"></i>
                                        <input type="text" 
                                               id="reg_otro_pais" 
                                               class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                               placeholder="Especifique el país (Ej: Estados Unidos, España, Chile...)"
                                               oninput="validarCampoOtroPais(this)">
                                    </div>
                                    <div id="error-otro-pais" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                                    <p class="text-xs text-gray-400 mt-1">
                                        <i class="fas fa-info-circle"></i> Ingrese el nombre del país
                                    </p>
                                </div>
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="fas fa-map-marked-alt"></i> Puede escribir el distrito, ciudad o seleccionar de la lista
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 2: INFORMACIÓN DEL PROYECTO -->
                    <!-- ============================================ -->
                    <div class="mb-6">
                        <h3 class="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                            <i class="fas fa-hard-hat text-primary mr-2"></i> Información del Proyecto
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- FAMILIA DE PRODUCTO -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Familia de producto
                                </label>
                                <select id="reg_familia" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                                    <option value="">Seleccionar familia</option>
                                    ${familiasOptions}
                                </select>
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="fas fa-layer-group"></i> Ej: Mármoles, Granitos, Travertinos, Cuarzos, Porcelanatos
                                </p>
                            </div>
                            
                            <!-- M² ESTIMADOS -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    M² estimados
                                </label>
                                <input type="number" 
                                       id="reg_m2" 
                                       class="w-full p-2 border border-gray-300 rounded-lg" 
                                       placeholder="Ej: 50" 
                                       min="0"
                                       step="1"
                                       oninput="validarCampoM2(this)">
                                <div id="error-m2" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <!-- TIPO DE PROYECTO -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de proyecto
                                </label>
                                <select id="reg_tipo_proyecto" class="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Seleccionar</option>
                                    <option value="OBRA_NUEVA">🏗️ Obra nueva</option>
                                    <option value="REMODELACION">🔨 Remodelación</option>
                                    <option value="REPOSICION">🔄 Reposición</option>
                                    <option value="MANTENIMIENTO">🛠️ Mantenimiento</option>
                                    <option value="OTRO">📌 Otro</option>
                                </select>
                            </div>
                            
                            <!-- FECHA ESTIMADA DE COMPRA -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha estimada de compra
                                </label>
                                <select id="reg_fecha_compra" class="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Seleccionar</option>
                                    <option value="INMEDIATA">🚀 Inmediata (menos de 15 días)</option>
                                    <option value="PROXIMO_MES">📅 Próximo mes (15-30 días)</option>
                                    <option value="1_3_MESES">📆 1-3 meses</option>
                                    <option value="3_6_MESES">🗓️ 3-6 meses</option>
                                    <option value="MAS_6_MESES">📅 Más de 6 meses</option>
                                    <option value="SOLO_COTIZAR">📄 Solo cotizar</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 3: CONTACTO Y PREFERENCIAS -->
                    <!-- ============================================ -->
                    <div class="mb-6">
                        <h3 class="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                            <i class="fas fa-phone-alt text-primary mr-2"></i> Contacto y Preferencias
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- MEDIO DE CONTACTO PREFERIDO -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Medio de contacto preferido
                                </label>
                                <select id="reg_medio_contacto" class="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Seleccionar</option>
                                    <option value="WHATSAPP">📱 WhatsApp</option>
                                    <option value="LLAMADA">📞 Llamada telefónica</option>
                                    <option value="EMAIL">✉️ Correo electrónico</option>
                                </select>
                            </div>
                            
                            <!-- ASESOR ASIGNADO -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Asesor asignado
                                </label>
                                <select id="reg_asesor" class="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Seleccionar asesor</option>
                                    ${vendedores?.map(v => `<option value="${v.id}">${escapeHtml(v.nombre)} ${v.telefono ? `(${v.telefono})` : ''}</option>`).join('')}
                                </select>
                            </div>
                            
                            <!-- CÓMO NOS CONOCIÓ -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    ¿Cómo nos conoció?
                                </label>
                                <select id="reg_canal_origen" class="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Seleccionar</option>
                                    <option value="GOOGLE">🔍 Google</option>
                                    <option value="FACEBOOK">📘 Facebook/Instagram</option>
                                    <option value="RECOMENDACION">⭐ Recomendación</option>
                                    <option value="VISITA_LOCAL">🏢 Visita al local</option>
                                    <option value="ARQUITECTO">🏛️ Referencia arquitecto</option>
                                    <option value="OUTLET_FISICO">🏪 Outlet físico</option>
                                    <option value="FERIA">🎪 Feria/Exposición</option>
                                    <option value="OTRO">📌 Otro</option>
                                </select>
                            </div>
                            
                            <!-- DESEA RECIBIR OFERTAS -->
                            <div class="flex items-end">
                                <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" id="reg_desea_ofertas" class="w-5 h-5 text-primary rounded focus:ring-primary">
                                    <div>
                                        <span class="font-medium text-gray-700">📧 Desea recibir ofertas y promociones</span>
                                        <p class="text-xs text-gray-400">Enviar información sobre novedades, ofertas y promociones</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- SECCIÓN 4: NOTAS -->
                    <!-- ============================================ -->
                    <div class="mb-6">
                        <h3 class="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                            <i class="fas fa-comment-dots text-primary mr-2"></i> Notas
                        </h3>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Observaciones
                            </label>
                            <textarea id="reg_observaciones" rows="3" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Comentarios adicionales, necesidades específicas, etc."></textarea>
                        </div>
                    </div>
                    
                    <!-- Botones -->
                    <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
                        <button type="button" onclick="limpiarFormularioRegistro()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                            <i class="fas fa-eraser mr-1"></i> Limpiar
                        </button>
                        <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                            <i class="fas fa-save mr-1"></i> Registrar Cliente
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // ============================================
        // INICIALIZAR VALIDACIONES Y EVENTOS
        // ============================================
        
        // Función para mostrar/ocultar campo de otro país
        window.mostrarCampoOtroPais = function() {
            const campoOtro = document.getElementById('campo_otro_pais');
            const ubicacionInput = document.getElementById('reg_ubicacion');
            
            if (!campoOtro || !ubicacionInput) return;
            
            if (campoOtro.classList.contains('hidden')) {
                campoOtro.classList.remove('hidden');
                ubicacionInput.value = 'Otro país';
                setTimeout(() => {
                    document.getElementById('reg_otro_pais')?.focus();
                }, 100);
            } else {
                campoOtro.classList.add('hidden');
                if (ubicacionInput.value === 'Otro país' || ubicacionInput.value === 'Otro país (especificar)') {
                    ubicacionInput.value = '';
                }
                const otroPaisInput = document.getElementById('reg_otro_pais');
                if (otroPaisInput) otroPaisInput.value = '';
            }
        };
        
        // Evento en tiempo real para el input de ubicación
        const ubicacionInput = document.getElementById('reg_ubicacion');
        if (ubicacionInput) {
            ubicacionInput.addEventListener('input', function() {
                const campoOtro = document.getElementById('campo_otro_pais');
                const otroPaisInput = document.getElementById('reg_otro_pais');
                
                if (this.value === 'Otro país (especificar)' || this.value === 'Otro país') {
                    if (campoOtro && campoOtro.classList.contains('hidden')) {
                        campoOtro.classList.remove('hidden');
                        if (otroPaisInput) {
                            setTimeout(() => otroPaisInput.focus(), 100);
                        }
                    }
                } else if (campoOtro && !campoOtro.classList.contains('hidden')) {
                    campoOtro.classList.add('hidden');
                    if (otroPaisInput) otroPaisInput.value = '';
                }
                
                // Validar ubicación
                if (typeof validarCampoUbicacion === 'function') {
                    validarCampoUbicacion(this);
                }
            });
        }
        
        // Capitalizar primera letra del país
        const otroPaisInput = document.getElementById('reg_otro_pais');
        if (otroPaisInput) {
            otroPaisInput.addEventListener('blur', function() {
                if (this.value) {
                    this.value = this.value.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                }
                if (typeof validarCampoOtroPais === 'function') {
                    validarCampoOtroPais(this);
                }
            });
        }
        
        // Evento para el botón de limpiar
        const resetBtn = document.querySelector('button[type="button"][onclick="limpiarFormularioRegistro()"]');
        if (resetBtn) {
            // Remover el onclick inline y agregar event listener
            resetBtn.removeAttribute('onclick');
            resetBtn.addEventListener('click', limpiarFormularioRegistro);
        }
        
        // Inicializar validaciones
        if (typeof inicializarValidacionesRegistro === 'function') {
            inicializarValidacionesRegistro();
        }
        
        // Actualizar placeholder del teléfono
        if (typeof actualizarPlaceholderTelefono === 'function') {
            actualizarPlaceholderTelefono();
        }
        
        console.log('✅ Vista de registro de clientes outlet cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar el módulo: ' + error.message);
    }
}

// ============================================
// FUNCIONES DE VALIDACIÓN PARA REGISTRO DE CLIENTES
// ============================================

// Validar campo nombre
function validarCampoNombre(input) {
    const valor = input.value.trim();
    const errorDiv = document.getElementById('error-nombre');
    if (!errorDiv) return true;
    
    if (valor.length === 0) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre es obligatorio';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length < 3) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre debe tener al menos 3 caracteres';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length > 100) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre no puede exceder 100 caracteres';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (/\d/.test(valor)) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre no debe contener números';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    input.classList.add('success');
    return true;
}

// Validar campo email
function validarCampoEmail(input) {
    const valor = input.value.trim();
    const errorDiv = document.getElementById('error-email');
    if (!errorDiv) return true;
    
    if (valor.length === 0) {
        errorDiv.classList.add('hidden');
        input.classList.remove('error', 'success');
        return true; // Email es opcional
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(valor)) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ingresa un correo electrónico válido (ej: usuario@dominio.com)';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length > 100) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El correo no puede exceder 100 caracteres';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    input.classList.add('success');
    return true;
}

// Validar campo teléfono
function validarCampoTelefono(input) {
    const valor = input.value.trim();
    const prefijoSelect = document.getElementById('prefijo-pais');
    const prefijo = prefijoSelect ? prefijoSelect.value : '51';
    const errorDiv = document.getElementById('error-telefono');
    if (!errorDiv) return true;
    
    if (valor.length === 0) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El teléfono es obligatorio';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    const soloNumeros = valor.replace(/\D/g, '');
    let esValido = false;
    let mensajeError = '';
    
    switch(prefijo) {
        case '51': // Perú
            if (soloNumeros.length === 9) esValido = true;
            else mensajeError = 'El número debe tener 9 dígitos (ej: 987654321)';
            break;
        case '1': // EE.UU
            if (soloNumeros.length === 10) esValido = true;
            else mensajeError = 'El número debe tener 10 dígitos (ej: 2125551234)';
            break;
        case '34': // España
            if (soloNumeros.length === 9) esValido = true;
            else mensajeError = 'El número debe tener 9 dígitos (ej: 612345678)';
            break;
        case '52': // México
            if (soloNumeros.length === 10) esValido = true;
            else mensajeError = 'El número debe tener 10 dígitos (ej: 5512345678)';
            break;
        case '54': // Argentina
            if (soloNumeros.length >= 10 && soloNumeros.length <= 13) esValido = true;
            else mensajeError = 'El número debe tener entre 10 y 13 dígitos';
            break;
        case '56': // Chile
            if (soloNumeros.length === 9) esValido = true;
            else mensajeError = 'El número debe tener 9 dígitos (ej: 912345678)';
            break;
        case '57': // Colombia
            if (soloNumeros.length === 10) esValido = true;
            else mensajeError = 'El número debe tener 10 dígitos';
            break;
        case '58': // Venezuela
            if (soloNumeros.length === 10) esValido = true;
            else mensajeError = 'El número debe tener 10 dígitos';
            break;
        default:
            if (soloNumeros.length >= 7 && soloNumeros.length <= 15) esValido = true;
            else mensajeError = 'El número debe tener entre 7 y 15 dígitos';
    }
    
    if (!esValido) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensajeError}`;
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    // Actualizar el input con solo números
    if (valor !== soloNumeros) {
        input.value = soloNumeros;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    input.classList.add('success');
    return true;
}

// Validar campo empresa
function validarCampoEmpresa(input) {
    const valor = input.value.trim();
    const errorDiv = document.getElementById('error-empresa');
    if (!errorDiv) return true;
    
    if (valor.length === 0) {
        errorDiv.classList.add('hidden');
        input.classList.remove('error', 'success');
        return true; // Empresa es opcional
    }
    
    if (valor.length < 2) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre de la empresa es demasiado corto';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length > 150) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre de la empresa no puede exceder 150 caracteres';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    if (valor.length > 0) {
        input.classList.add('success');
    } else {
        input.classList.remove('success');
    }
    return true;
}

// Validar campo tipo de cliente
function validarCampoTipoCliente(select) {
    const valor = select.value;
    const errorDiv = document.getElementById('error-tipo-cliente');
    if (!errorDiv) return true;
    
    if (!valor) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El tipo de cliente es obligatorio';
        errorDiv.classList.remove('hidden');
        select.classList.add('error');
        select.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    select.classList.remove('error');
    select.classList.add('success');
    return true;
}

// Validar campo ubicación
function validarCampoUbicacion(input) {
    const valor = input.value.trim();
    const errorDiv = document.getElementById('error-ubicacion');
    if (!errorDiv) return true;
    
    if (valor.length === 0) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> La ubicación es obligatoria';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length < 2) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> La ubicación es demasiado corta';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length > 100) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> La ubicación no puede exceder 100 caracteres';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    input.classList.add('success');
    return true;
}

// Validar campo otro país
function validarCampoOtroPais(input) {
    const valor = input.value.trim();
    const errorDiv = document.getElementById('error-otro-pais');
    if (!errorDiv) return true;
    
    if (valor.length === 0) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Especifique el nombre del país';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor.length < 2) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre del país es demasiado corto';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    input.classList.add('success');
    return true;
}

// Validar campo M²
function validarCampoM2(input) {
    const valor = input.value;
    const errorDiv = document.getElementById('error-m2');
    if (!errorDiv) return true;
    
    if (valor && (parseInt(valor) < 0 || isNaN(parseInt(valor)))) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ingrese un valor válido (mayor o igual a 0)';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    if (valor && parseInt(valor) > 10000) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El valor parece demasiado alto (máximo 10,000 m²)';
        errorDiv.classList.remove('hidden');
        input.classList.add('error');
        input.classList.remove('success');
        return false;
    }
    
    errorDiv.classList.add('hidden');
    input.classList.remove('error');
    if (valor) {
        input.classList.add('success');
    } else {
        input.classList.remove('success');
    }
    return true;
}

// Actualizar placeholder del teléfono según el país seleccionado
function actualizarPlaceholderTelefono() {
    const prefijoSelect = document.getElementById('prefijo-pais');
    const telefonoInput = document.getElementById('reg_telefono');
    if (!prefijoSelect || !telefonoInput) return;
    
    const placeholders = {
        '51': 'Ej: 987654321 (9 dígitos)',
        '1': 'Ej: 2125551234 (10 dígitos)',
        '34': 'Ej: 612345678 (9 dígitos)',
        '52': 'Ej: 5512345678 (10 dígitos)',
        '54': 'Ej: 911234567 (10-13 dígitos)',
        '56': 'Ej: 912345678 (9 dígitos)',
        '57': 'Ej: 3012345678 (10 dígitos)',
        '58': 'Ej: 4121234567 (10 dígitos)'
    };
    telefonoInput.placeholder = placeholders[prefijoSelect.value] || 'Ej: 123456789';
}

// Obtener teléfono completo con código de país
function obtenerTelefonoCompleto() {
    const prefijoSelect = document.getElementById('prefijo-pais');
    const telefonoInput = document.getElementById('reg_telefono');
    if (!prefijoSelect || !telefonoInput) return '';
    
    const prefijo = prefijoSelect.value;
    const numero = telefonoInput.value.trim().replace(/\D/g, '');
    if (!numero) return '';
    
    return `${prefijo}${numero}`;
}

// Validar todos los campos del formulario
function validarTodosLosCamposRegistro() {
    const nombreInput = document.getElementById('reg_nombre');
    const telefonoInput = document.getElementById('reg_telefono');
    const tipoClienteSelect = document.getElementById('reg_tipo_cliente');
    const ubicacionInput = document.getElementById('reg_ubicacion');
    const otroPaisInput = document.getElementById('reg_otro_pais');
    const ubicacionValue = ubicacionInput?.value;
    const mostrarOtroPais = ubicacionValue === 'Otro país (especificar)' || ubicacionValue === 'Otro país';
    
    let nombreValido = validarCampoNombre(nombreInput);
    let telefonoValido = validarCampoTelefono(telefonoInput);
    let tipoClienteValido = validarCampoTipoCliente(tipoClienteSelect);
    let ubicacionValido = validarCampoUbicacion(ubicacionInput);
    let otroPaisValido = true;
    
    if (mostrarOtroPais && otroPaisInput) {
        otroPaisValido = validarCampoOtroPais(otroPaisInput);
    }
    
    // Validar email solo si tiene valor
    const emailInput = document.getElementById('reg_email');
    let emailValido = true;
    if (emailInput && emailInput.value.trim() !== '') {
        emailValido = validarCampoEmail(emailInput);
    }
    
    return nombreValido && telefonoValido && emailValido && tipoClienteValido && ubicacionValido && otroPaisValido;
}

// Inicializar validaciones
function inicializarValidacionesRegistro() {
    // Agregar event listeners a los campos
    const campos = [
        { id: 'reg_nombre', event: 'input', handler: validarCampoNombre },
        { id: 'reg_telefono', event: 'input', handler: validarCampoTelefono },
        { id: 'reg_email', event: 'input', handler: validarCampoEmail },
        { id: 'reg_empresa', event: 'input', handler: validarCampoEmpresa },
        { id: 'reg_tipo_cliente', event: 'change', handler: validarCampoTipoCliente },
        { id: 'reg_ubicacion', event: 'input', handler: validarCampoUbicacion },
        { id: 'reg_m2', event: 'input', handler: validarCampoM2 }
    ];
    
    campos.forEach(campo => {
        const elemento = document.getElementById(campo.id);
        if (elemento) {
            elemento.removeEventListener(campo.event, campo.handler);
            elemento.addEventListener(campo.event, campo.handler);
        }
    });
    
    // Validar también el campo de otro país cuando se muestra
    const otroPaisInput = document.getElementById('reg_otro_pais');
    if (otroPaisInput) {
        otroPaisInput.addEventListener('input', function() {
            validarCampoOtroPais(this);
        });
    }
}

// Inicializar eventos de ubicación
function inicializarEventosUbicacion() {
    window.mostrarCampoOtroPais = function() {
        const campoOtro = document.getElementById('campo_otro_pais');
        const ubicacionInput = document.getElementById('reg_ubicacion');
        
        if (!campoOtro || !ubicacionInput) return;
        
        if (campoOtro.classList.contains('hidden')) {
            campoOtro.classList.remove('hidden');
            ubicacionInput.value = 'Otro país';
            setTimeout(() => {
                document.getElementById('reg_otro_pais')?.focus();
            }, 100);
        } else {
            campoOtro.classList.add('hidden');
            if (ubicacionInput.value === 'Otro país' || ubicacionInput.value === 'Otro país (especificar)') {
                ubicacionInput.value = '';
            }
            const otroPaisInput = document.getElementById('reg_otro_pais');
            if (otroPaisInput) otroPaisInput.value = '';
        }
    };
    
    const ubicacionInput = document.getElementById('reg_ubicacion');
    if (ubicacionInput) {
        ubicacionInput.addEventListener('input', function() {
            const campoOtro = document.getElementById('campo_otro_pais');
            const otroPaisInput = document.getElementById('reg_otro_pais');
            
            if (this.value === 'Otro país (especificar)' || this.value === 'Otro país') {
                if (campoOtro && campoOtro.classList.contains('hidden')) {
                    campoOtro.classList.remove('hidden');
                    if (otroPaisInput) {
                        setTimeout(() => otroPaisInput.focus(), 100);
                    }
                }
            } else if (campoOtro && !campoOtro.classList.contains('hidden')) {
                campoOtro.classList.add('hidden');
                if (otroPaisInput) otroPaisInput.value = '';
            }
            
            // Validar ubicación
            validarCampoUbicacion(this);
        });
    }
    
    const otroPaisInput = document.getElementById('reg_otro_pais');
    if (otroPaisInput) {
        otroPaisInput.addEventListener('blur', function() {
            if (this.value) {
                this.value = this.value.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            }
        });
    }
    
    // Evento para cambio de prefijo de país
    const prefijoSelect = document.getElementById('prefijo-pais');
    if (prefijoSelect) {
        prefijoSelect.addEventListener('change', function() {
            actualizarPlaceholderTelefono();
            const telefonoInput = document.getElementById('reg_telefono');
            if (telefonoInput && telefonoInput.value) {
                validarCampoTelefono(telefonoInput);
            }
        });
    }
}

// Limpiar formulario
function limpiarFormularioRegistro() {
    const form = document.getElementById('registroClienteForm');
    if (form) form.reset();
    
    // Limpiar clases de validación
    document.querySelectorAll('.error, .success').forEach(el => {
        el.classList.remove('error', 'success');
    });
    
    // Ocultar mensajes de error
    document.querySelectorAll('.mensaje-error').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Ocultar campo de otro país
    const campoOtro = document.getElementById('campo_otro_pais');
    if (campoOtro) campoOtro.classList.add('hidden');
    
    const otroPais = document.getElementById('reg_otro_pais');
    if (otroPais) otroPais.value = '';
    
    // Resetear placeholder del teléfono
    actualizarPlaceholderTelefono();
    
    mostrarAlerta('Éxito', 'Formulario limpiado correctamente', 'success');
}

window.guardarRegistroCliente = async function(e) {
    e.preventDefault();
    
    // Validar todos los campos antes de guardar
    if (!validarTodosLosCamposRegistro()) {
        // Aplicar efecto de shake al formulario
        const form = document.getElementById('registroClienteForm');
        form.classList.add('shake-error');
        setTimeout(() => {
            form.classList.remove('shake-error');
        }, 500);
        
        // Enfocar el primer campo con error
        const primerError = document.querySelector('.error');
        if (primerError) {
            primerError.focus();
            primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        mostrarAlerta('Error', 'Por favor, complete correctamente todos los campos obligatorios', 'error');
        return;
    }
    
    mostrarLoading('Guardando registro...');
    
    try {
        const nombre = document.getElementById('reg_nombre')?.value;
        const telefono = obtenerTelefonoCompleto();
        
        // Procesar ubicación
        let ubicacion = document.getElementById('reg_ubicacion')?.value?.trim();
        const otroPais = document.getElementById('reg_otro_pais')?.value?.trim();
        
        if (ubicacion === 'Otro país (especificar)' || ubicacion === 'Otro país') {
            if (otroPais && otroPais !== '') {
                ubicacion = `Otro país: ${otroPais}`;
            } else {
                ubicacion = 'Otro país (no especificado)';
            }
        }
        
        if (!ubicacion || ubicacion === '') {
            ubicacion = null;
        }
        
        const fechaLocal = getFechaLocalPeru();
        
        const data = {
            cliente_nombre: nombre,
            cliente_telefono: telefono,
            cliente_email: document.getElementById('reg_email')?.value || null,
            cliente_empresa: document.getElementById('reg_empresa')?.value || null,
            tipo_cliente: document.getElementById('reg_tipo_cliente')?.value || null,
            ubicacion: ubicacion,
            familia_interes: document.getElementById('reg_familia')?.value || null,
            m2_estimados: parseInt(document.getElementById('reg_m2')?.value) || null,
            tipo_proyecto: document.getElementById('reg_tipo_proyecto')?.value || null,
            fecha_estimada_compra: document.getElementById('reg_fecha_compra')?.value || null,
            medio_contacto_preferido: document.getElementById('reg_medio_contacto')?.value || null,
            canal_origen: document.getElementById('reg_canal_origen')?.value || 'OUTLET_FISICO',
            asesor_asignado_id: document.getElementById('reg_asesor')?.value || null,
            observaciones: document.getElementById('reg_observaciones')?.value || null,
            desea_ofertas: document.getElementById('reg_desea_ofertas')?.checked || false,
            registrado_por: usuarioActual.id,
            creado_el: fechaLocal
        };
        
        const { error } = await window.supabaseClient
            .from('registros_clientes_outlet')
            .insert(data);
        
        if (error) throw error;
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Cliente registrado correctamente', 'success');
        
        // Limpiar formulario
        limpiarFormularioRegistro();
        
        // Recargar vista (opcional)
        // await cargarVistaRegistroClientesOutlet();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        
        let mensajeError = 'No se pudo registrar el cliente';
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe un registro con estos datos';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

// ==================== MARCAR COMO CONTACTADO ====================
window.marcarContactado = async function(id) {
    const result = await Swal.fire({
        title: 'Marcar como contactado',
        html: `
            <div class="text-left">
                <label class="form-label">Notas del contacto</label>
                <textarea id="notas_contacto" class="form-input w-full" rows="3" placeholder="¿Qué se acordó? ¿Cuál fue el resultado?"></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: '✅ Confirmar contacto',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return document.getElementById('notas_contacto')?.value || null;
        }
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        
        try {
            const { error } = await window.supabaseClient
                .from('registros_clientes_outlet')
                .update({
                    contactado: true,
                    fecha_contactado: new Date().toISOString(),
                    notas_seguimiento: result.value
                })
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Cliente marcado como contactado', 'success');
            await cargarVistaRegistroClientesOutlet();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar', 'error');
        }
    }
};

// ==================== VER DETALLE REGISTRO ====================
window.verDetalleRegistro = async function(id) {
    mostrarLoading('Cargando detalles...');
    
    try {
        const { data: registro, error } = await window.supabaseClient
            .from('registros_clientes_outlet')
            .select(`
                *,
                asesor:asesor_asignado_id(id, nombre, telefono),
                registrado_por_usuario:registrado_por(id, correo)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Obtener información del registrador
        let registradorNombre = 'Sistema';
        if (registro.registrado_por_usuario) {
            if (registro.registrado_por_usuario.correo) {
                registradorNombre = registro.registrado_por_usuario.correo;
            }
            // Intentar obtener nombre del empleado
            const { data: empleadoRegistrador } = await window.supabaseClient
                .from('empleados')
                .select('nombre_completo')
                .eq('id', registro.registrado_por)
                .maybeSingle();
            if (empleadoRegistrador?.nombre_completo) {
                registradorNombre = empleadoRegistrador.nombre_completo;
            }
        }
        
        ocultarLoading();
        
        // Mapeo de tipos de cliente a texto legible
        const tipoClienteMap = {
            'PERSONA_NATURAL': '👤 Persona Natural',
            'ARQUITECTO': '🏛️ Arquitecto',
            'DISENADOR_INTERIORES': '🎨 Diseñador de Interiores',
            'CONTRATISTA': '🏗️ Contratista / Constructor',
            'INGENIERO_CIVIL': '📐 Ingeniero Civil',
            'DECORADOR': '🖼️ Decorador',
            'DISTRIBUIDOR': '📦 Distribuidor / Revendedor',
            'EMPRESA_CONSTRUCTORA': '🏢 Empresa Constructora',
            'INMOBILIARIA': '🏘️ Inmobiliaria',
            'OTRO': '📌 Otro'
        };
        
        // Mapeo de tipos de proyecto
        const tipoProyectoMap = {
            'OBRA_NUEVA': '🏗️ Obra nueva',
            'REMODELACION': '🔨 Remodelación',
            'REPOSICION': '🔄 Reposición',
            'MANTENIMIENTO': '🛠️ Mantenimiento',
            'OTRO': '📌 Otro'
        };
        
        // Mapeo de medios de contacto
        const medioContactoMap = {
            'WHATSAPP': '📱 WhatsApp',
            'LLAMADA': '📞 Llamada telefónica',
            'EMAIL': '✉️ Correo electrónico'
        };
        
        // Mapeo de canales de origen
        const canalOrigenMap = {
            'GOOGLE': '🔍 Google / Búsqueda web',
            'FACEBOOK': '📘 Facebook / Instagram',
            'RECOMENDACION': '⭐ Recomendación',
            'VISITA_LOCAL': '🏢 Visita al local',
            'ARQUITECTO': '🏛️ Referencia de arquitecto/constructor',
            'OUTLET_FISICO': '🏪 Outlet físico',
            'FERIA': '🎪 Feria / Exposición',
            'OTRO': '📌 Otro'
        };
        
        // Mapeo de fechas estimadas de compra
        const fechaCompraMap = {
            'INMEDIATA': '🚀 Inmediata (menos de 15 días)',
            'PROXIMO_MES': '📅 Próximo mes (15-30 días)',
            '1_3_MESES': '📆 1-3 meses',
            '3_6_MESES': '🗓️ 3-6 meses',
            'MAS_6_MESES': '📅 Más de 6 meses',
            'SOLO_COTIZAR': '📄 Solo cotizar'
        };
        
        // Detectar si la ubicación es otro país para mostrar ícono
        const esOtroPais = registro.ubicacion && registro.ubicacion.startsWith('Otro país:');
        const ubicacionMostrada = esOtroPais ? registro.ubicacion : (registro.ubicacion || 'No especificada');
        
        Swal.fire({
            title: `<span class="text-primary">${escapeHtml(registro.cliente_nombre)}</span>`,
            width: '650px',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <!-- ============================================ -->
                    <!-- INFORMACIÓN DEL CLIENTE -->
                    <!-- ============================================ -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary">
                        <h3 class="font-semibold text-primary mb-3 flex items-center gap-2">
                            <i class="fas fa-user-circle"></i> Datos del Cliente
                        </h3>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="col-span-2">
                                <span class="font-medium">Nombre:</span> 
                                <span class="text-primary font-semibold">${escapeHtml(registro.cliente_nombre)}</span>
                            </div>
                            <div>
                                <span class="font-medium">📞 Teléfono:</span> 
                                <a href="tel:${registro.cliente_telefono}" class="text-blue-600 hover:underline">${registro.cliente_telefono}</a>
                            </div>
                            <div>
                                <span class="font-medium">✉️ Email:</span> 
                                ${registro.cliente_email ? `<a href="mailto:${registro.cliente_email}" class="text-blue-600 hover:underline">${registro.cliente_email}</a>` : '<span class="text-gray-400">No registrado</span>'}
                            </div>
                            <div class="col-span-2">
                                <span class="font-medium">🏢 Empresa:</span> 
                                ${registro.cliente_empresa ? escapeHtml(registro.cliente_empresa) : '<span class="text-gray-400">No especificada</span>'}
                            </div>
                            <div class="col-span-2">
                                <span class="font-medium">👤 Tipo de cliente:</span> 
                                <span class="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">${tipoClienteMap[registro.tipo_cliente] || registro.tipo_cliente || 'No especificado'}</span>
                            </div>
                            <div class="col-span-2">
                                <span class="font-medium">📍 Ubicación:</span> 
                                ${ubicacionMostrada}
                                ${esOtroPais ? '<span class="ml-1 text-xs text-blue-500"><i class="fas fa-globe-americas"></i> Internacional</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- INFORMACIÓN DEL PROYECTO -->
                    <!-- ============================================ -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                        <h3 class="font-semibold text-green-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-hard-hat"></i> Información del Proyecto
                        </h3>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="col-span-2">
                                <span class="font-medium">🏷️ Familia de producto:</span> 
                                ${registro.familia_interes ? `<span class="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">${escapeHtml(registro.familia_interes)}</span>` : '<span class="text-gray-400">No especificada</span>'}
                            </div>
                            <div>
                                <span class="font-medium">📏 M² estimados:</span> 
                                ${registro.m2_estimados ? `<span class="font-bold text-primary">${registro.m2_estimados} m²</span>` : '<span class="text-gray-400">No especificado</span>'}
                            </div>
                            <div>
                                <span class="font-medium">🏗️ Tipo de proyecto:</span> 
                                ${tipoProyectoMap[registro.tipo_proyecto] || registro.tipo_proyecto || 'No especificado'}
                            </div>
                            <div class="col-span-2">
                                <span class="font-medium">📅 Fecha estimada de compra:</span> 
                                ${fechaCompraMap[registro.fecha_estimada_compra] || registro.fecha_estimada_compra || 'No especificada'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- CONTACTO Y PREFERENCIAS -->
                    <!-- ============================================ -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                        <h3 class="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-phone-alt"></i> Contacto y Preferencias
                        </h3>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span class="font-medium">📞 Medio contacto:</span> 
                                ${medioContactoMap[registro.medio_contacto_preferido] || registro.medio_contacto_preferido || 'No especificado'}
                            </div>
                            <div>
                                <span class="font-medium">👨‍💼 Asesor asignado:</span> 
                                ${registro.asesor?.nombre ? `<span class="font-medium text-primary">${escapeHtml(registro.asesor.nombre)}</span>` : '<span class="text-gray-400">Sin asignar</span>'}
                                ${registro.asesor?.telefono ? `<div class="text-xs text-gray-500">📞 ${registro.asesor.telefono}</div>` : ''}
                            </div>
                            <div class="col-span-2">
                                <span class="font-medium">🌐 ¿Cómo nos conoció?:</span> 
                                ${canalOrigenMap[registro.canal_origen] || registro.canal_origen || 'No especificado'}
                            </div>
                            <div class="col-span-2">
                                <span class="font-medium">📧 Desea recibir ofertas:</span> 
                                ${registro.desea_ofertas 
                                    ? '<span class="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><i class="fas fa-check-circle"></i> Sí, desea recibir promociones</span>' 
                                    : '<span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"><i class="fas fa-times-circle"></i> No desea recibir promociones</span>'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- ESTADO Y SEGUIMIENTO -->
                    <!-- ============================================ -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <h3 class="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-clipboard-list"></i> Estado y Seguimiento
                        </h3>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span class="font-medium">✅ Estado de contacto:</span> 
                                ${registro.contactado 
                                    ? '<span class="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><i class="fas fa-check-circle"></i> Contactado</span>' 
                                    : '<span class="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700"><i class="fas fa-clock"></i> Pendiente</span>'}
                            </div>
                            <div>
                                <span class="font-medium">📅 Fecha registro:</span> 
                                ${new Date(registro.creado_el).toLocaleString()}
                            </div>
                            ${registro.fecha_contactado ? `
                            <div class="col-span-2">
                                <span class="font-medium">📞 Fecha contacto:</span> 
                                ${new Date(registro.fecha_contactado).toLocaleString()}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- NOTAS Y OBSERVACIONES -->
                    <!-- ============================================ -->
                    ${registro.observaciones ? `
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
                        <h3 class="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                            <i class="fas fa-comment-dots"></i> Observaciones
                        </h3>
                        <p class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(registro.observaciones)}</p>
                    </div>
                    ` : ''}
                    
                    ${registro.notas_seguimiento ? `
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-teal-500">
                        <h3 class="font-semibold text-teal-700 mb-2 flex items-center gap-2">
                            <i class="fas fa-clipboard"></i> Notas de seguimiento
                        </h3>
                        <p class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(registro.notas_seguimiento)}</p>
                    </div>
                    ` : ''}
                    
                    <!-- ============================================ -->
                    <!-- AUDITORÍA -->
                    <!-- ============================================ -->
                    <div class="bg-gray-100 p-3 rounded-lg">
                        <h3 class="font-semibold text-gray-600 mb-2 text-xs flex items-center gap-2">
                            <i class="fas fa-history"></i> Información de auditoría
                        </h3>
                        <div class="grid grid-cols-2 gap-1 text-xs text-gray-500">
                            <div><span class="font-medium">Registrado por:</span> ${registradorNombre}</div>
                            ${registro.modificado_el ? `<div><span class="font-medium">Última modificación:</span> ${new Date(registro.modificado_el).toLocaleString()}</div>` : ''}
                            ${registro.modificado_por ? `<div><span class="font-medium">Modificado por ID:</span> ${registro.modificado_por}</div>` : ''}
                            <div><span class="font-medium">ID Registro:</span> <span class="font-mono text-xs">${registro.id.substring(0, 8)}...</span></div>
                        </div>
                    </div>
                    
                    <!-- ============================================ -->
                    <!-- ACCIONES RÁPIDAS -->
                    <!-- ============================================ -->
                    <div class="flex gap-2 pt-2 border-t border-gray-200">
                        <a href="tel:${registro.cliente_telefono}" 
                           class="flex-1 text-center bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                            <i class="fas fa-phone"></i> Llamar
                        </a>
                        ${registro.cliente_email ? `
                        <a href="mailto:${registro.cliente_email}" 
                           class="flex-1 text-center bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                            <i class="fas fa-envelope"></i> Email
                        </a>
                        ` : ''}
                        <a href="https://wa.me/${registro.cliente_telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(registro.cliente_nombre)}%2C%20te%20contactamos%20de%20Gallos%20M%C3%A1rmol%20para%20brindarte%20informaci%C3%B3n%20sobre%20${encodeURIComponent(registro.familia_interes || 'nuestros productos')}" 
                           target="_blank" 
                           class="flex-1 text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </a>
                    </div>
                    
                    ${!registro.contactado ? `
                    <div class="mt-2">
                        <button onclick="marcarContactado('${registro.id}')" 
                                class="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center justify-center gap-2">
                            <i class="fas fa-phone-alt"></i> Marcar como contactado
                        </button>
                    </div>
                    ` : ''}
                </div>
            `,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            customClass: {
                popup: 'rounded-xl',
                confirmButton: 'rounded-lg px-5 py-2'
            }
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== ELIMINAR REGISTRO ====================
window.eliminarRegistro = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar registro?',
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
                .from('registros_clientes_outlet')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Registro eliminado', 'success');
            await cargarVistaRegistroClientesOutlet();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

// ==================== FUNCIÓN PARA OBTENER FECHA LOCAL DE PERÚ ====================
function getFechaLocalPeru() {
    const ahora = new Date();
    // Restar 5 horas para Perú (UTC-5)
    const horaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return horaPeru.toISOString();
}

// Exponer funciones globalmente
window.validarCampoNombre = validarCampoNombre;
window.validarCampoEmail = validarCampoEmail;
window.validarCampoTelefono = validarCampoTelefono;
window.validarCampoEmpresa = validarCampoEmpresa;
window.validarCampoTipoCliente = validarCampoTipoCliente;
window.validarCampoUbicacion = validarCampoUbicacion;
window.validarCampoOtroPais = validarCampoOtroPais;
window.validarCampoM2 = validarCampoM2;
window.actualizarPlaceholderTelefono = actualizarPlaceholderTelefono;
window.obtenerTelefonoCompleto = obtenerTelefonoCompleto;
window.validarTodosLosCamposRegistro = validarTodosLosCamposRegistro;
window.limpiarFormularioRegistro = limpiarFormularioRegistro;