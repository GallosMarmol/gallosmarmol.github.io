// ==================== CONTROLADOR DE VISTAS ====================
window.cargarVista = async function(vista) {    
    vistaActual = vista;
    const titulos = {
        dashboard: 'Dashboard', misActivos: 'Mis Activos Asignados', activos: 'Activos', categorias: 'Categorías',
        subcategorias: 'Subcategorías', tiposActivos: 'Tipos de Activo', empleados: 'Empleados', areas: 'Áreas',
        empresas: 'Empresas', marcas: 'Marcas', ubicaciones: 'Ubicaciones', software: 'Software',
        software_instalado: 'Software Instalado', licencias: 'Licencias', mantenimientos: 'Mantenimientos',
        asignaciones: 'Asignaciones', usuarios: 'Usuarios', reportes: 'Reportes', accesosRemotos: 'Accesos Remotos',
        tareasRespaldo: 'Tareas de Respaldo', credenciales: 'Credenciales',
        especificacionesAtributos: 'Atributos de Especificaciones', especificacionesValores: 'Valores de Especificaciones'
    };
    document.getElementById('pageTitle').innerText = titulos[vista] || 'Sistema';
    document.getElementById('pageSubtitle').innerText = `Gestión de ${titulos[vista] || ''}`;
    document.getElementById('breadcrumb').innerHTML = `<i class="fas fa-home text-primary"></i> / ${document.getElementById('pageTitle').innerText}`;

    switch(vista) {
        case 'dashboard': await cargarDashboard(); break;
        case 'misActivos': await cargarVistaMisActivos(); break;
        case 'activos': await cargarVistaActivos(); break;
        case 'categorias': await cargarVistaCategorias(); break;
        case 'subcategorias': await cargarVistaSubcategorias(); break;
        case 'tiposActivos': await cargarVistaTiposActivo(); break;
        case 'empleados': await cargarVistaEmpleados(); break;
        case 'areas': await cargarVistaAreas(); break;
        case 'empresas': await cargarVistaEmpresas(); break;
        case 'marcas': await cargarVistaMarcas(); break;
        case 'ubicaciones': await cargarVistaUbicaciones(); break;
        case 'software': await cargarVistaSoftware(); break;
        case 'software_instalado': await cargarVistaSoftwareInstalado(); break;
        case 'licencias': await cargarVistaLicencias(); break;
        case 'mantenimientos': await cargarVistaMantenimientos(); break;
        case 'asignaciones': await cargarVistaAsignaciones(); break;
        case 'usuarios': await cargarVistaUsuarios(); break;
        case 'reportes': await cargarReportes(); break;
        case 'accesosRemotos': await cargarVistaAccesosRemotos(); break;
        case 'tareasRespaldo': await cargarVistaTareasRespaldo(); break;
        case 'credenciales': await cargarVistaCredenciales(); break;
        case 'especificacionesAtributos': await cargarVistaEspecificacionesAtributos(); break;
        case 'especificacionesValores': await cargarVistaEspecificacionesValores(); break;
        case 'asignacionUsuariosEmpresas': await cargarVistaAsignacionUsuariosEmpresas();break;
        case 'tickets': 
            await cargarVistaTickets();
            break;
        case 'categoriasTicket':
            await cargarVistaCategoriasTicket();
            break;        
        break;
        case 'consumibles':
            await cargarVistaConsumibles();
            break;
        case 'movimientosConsumibles':
            await cargarVistaMovimientosConsumibles();
            break;
        case 'solicitudes':
            await cargarVistaSolicitudes(false);
            break;
        case 'solicitudesPendientes':
            await cargarVistaSolicitudesPendientes();
            break;
        case 'solicitudesTodas':
            await cargarVistaSolicitudesTodas();
            break;
        case 'conocimiento':
            await cargarVistaConocimiento();
            break;
        case 'conocimientoArticulos':
            await cargarVistaConocimientoArticulos();
            break;
        case 'conocimientoCategorias':
            await cargarVistaConocimientoCategorias();
            break;
        case 'unidadesMedida':
            await cargarVistaUnidadesMedida();
            break;    
        case 'categoriasConsumibles':
            await cargarVistaCategoriasConsumibles();
            break;
        case 'tiposConsumibles':
            await cargarVistaTiposConsumibles();
            break; 
        case 'configurarResponsablesSolicitudes':
            await cargarVistaConfigurarResponsablesSolicitudes();
            break;      
        case 'solicitudesAsignadas':
            await cargarVistaSolicitudesAsignadas();
            break; 
        case 'productos':
            await cargarVistaProductos();
            break; 
        case 'leads':
            await cargarVistaLeads();
            break;      
        case 'vendedores':
            await cargarVistaVendedores();
            break;                             
        case 'metricasSolicitudes':
            await cargarVistaMetricasSolicitudes();
            break;     
        case 'misCotizaciones':
            await cargarVistaMisCotizaciones();
            break;  
        case 'outlet':
            await cargarVistaOutletPublico();
            break;
        case 'saldosExportacion':
            await cargarVistaSaldosExportacionPublico();
            break;     
        case 'registroClientesOutlet':
            await cargarVistaRegistroClientesOutlet();
            break;
        case 'gestionarPermisosRegistro':
            await cargarVistaGestionarPermisosRegistro();
            break;            
        case 'listadoRegistrosClientes':
            await cargarVistaListadoRegistrosClientes();
            break;            
        default: await cargarDashboard();
    }
};

// ==================== VISTA MIS ACTIVOS ====================
async function cargarVistaMisActivos() {
    mostrarLoading('Cargando mis activos asignados...');
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);

        if (!permisos.empleadoId) {
            mostrarError('No tienes un empleado asociado. Contacta al administrador.');
            ocultarLoading();
            return;
        }

        const { data: asignaciones } = await window.supabaseClient
            .from('asignaciones')
            .select('id, fecha_asignacion, estado, activo_id, empleado_id')
            .eq('empleado_id', permisos.empleadoId)
            .eq('estado', 'ACTIVA');

        if (!asignaciones || asignaciones.length === 0) {
            mostrarVistaSinActivos();
            ocultarLoading();
            return;
        }

        const activosIds = asignaciones.map(a => a.activo_id);
        const { data: activos } = await window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (id, nombre),
                info_general (
                    id,
                    marca_id,
                    modelo,
                    numero_serie,
                    ano_fabricacion,
                    condicion_fisica,
                    fecha_compra,
                    fecha_garantia,
                    marcas:marca_id (id, nombre)
                ),
                ubicacion:ubicacion_id (id, nombre, descripcion),
                empresa:empresa_id (id, nombre, ruc)
            `)
            .in('id', activosIds)
            .order('nombre');

        const activosProcesados = (activos || []).map(activo => {
            let infoGeneral = null;
            if (activo.info_general) {
                if (Array.isArray(activo.info_general) && activo.info_general.length > 0) {
                    infoGeneral = activo.info_general[0];
                    if (infoGeneral.marcas && Array.isArray(infoGeneral.marcas)) {
                        infoGeneral.marcas = infoGeneral.marcas[0];
                    }
                } else if (!Array.isArray(activo.info_general)) {
                    infoGeneral = activo.info_general;
                }
            }
            return { ...activo, info_general: infoGeneral, asignacion_activa: asignaciones.find(a => a.activo_id === activo.id) };
        });

        mostrarVistaConActivos(activosProcesados);
        ocultarLoading();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando mis activos:', error);
        mostrarError('Error al cargar tus activos: ' + error.message);
    }
}

function mostrarVistaSinActivos() {
    const html = `
        <div class="mb-6"><h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2"><i class="fas fa-laptop"></i> Mis Activos Asignados</h1><p class="text-gray-500 text-sm mt-1">Activos que tienes asignados actualmente</p></div>
        <div class="bg-white rounded-xl shadow-sm p-12 text-center"><div class="flex flex-col items-center justify-center"><div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4"><i class="fas fa-laptop text-4xl text-gray-400"></i></div><h3 class="text-lg font-semibold text-gray-700 mb-2">No tienes activos asignados</h3><p class="text-gray-500 max-w-md">Actualmente no tienes ningún activo asignado. Contacta al administrador para que te asigne los equipos necesarios.</p><div class="mt-6 p-4 bg-blue-50 rounded-lg max-w-md"><p class="text-sm text-blue-800"><i class="fas fa-info-circle mr-2"></i>Si crees que esto es un error, comunícate con el área de sistemas.</p></div></div></div>
    `;
    document.getElementById('dynamicContent').innerHTML = html;
}

function mostrarVistaConActivos(activos) {
    let html = `
        <div class="mb-6"><h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2"><i class="fas fa-laptop"></i> Mis Activos Asignados</h1><p class="text-gray-500 text-sm mt-1">Activos que tienes asignados actualmente <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">${activos.length} activo${activos.length !== 1 ? 's' : ''}</span></p></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="mis-activos-grid">
    `;

    for (const activo of activos) {
        const tipoNombre = activo.tipos_activo?.nombre || 'Tipo no especificado';
        const info = activo.info_general || {};
        const marca = info.marcas?.nombre || '';
        const modelo = info.modelo || '';
        const serie = info.numero_serie || '';
        const fechaAsignacion = activo.asignacion_activa?.fecha_asignacion;
        const ubicacion = activo.ubicacion || {};
        const empresa = activo.empresa || {};

        let tituloActivo = activo.nombre || 'Activo';
        if (marca && modelo && !tituloActivo.includes(marca)) tituloActivo = `${marca} ${modelo}`;
        else if (marca && !tituloActivo.includes(marca)) tituloActivo = marca;

        let garantiaStatus = '', garantiaClass = '';
        if (info.fecha_garantia) {
            const fechaGarantia = new Date(info.fecha_garantia);
            const hoy = new Date();
            const diasRestantes = Math.ceil((fechaGarantia - hoy) / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) { garantiaStatus = 'Vencida'; garantiaClass = 'text-red-600 bg-red-50'; }
            else if (diasRestantes < 30) { garantiaStatus = `Vence en ${diasRestantes} días`; garantiaClass = 'text-orange-600 bg-orange-50'; }
            else { garantiaStatus = 'Vigente'; garantiaClass = 'text-green-600 bg-green-50'; }
        }

        html += `
            <div class="card-item hover:shadow-lg transition-all duration-300 group">
                <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white"><div class="flex justify-between items-start gap-2"><div class="flex-1"><h3 class="font-bold text-primary text-lg flex items-center gap-2"><i class="fas fa-desktop"></i> ${tituloActivo}</h3><p class="text-xs text-gray-500 mt-1"><i class="fas fa-tag mr-1"></i>${tipoNombre}</p></div><span class="estado-badge estado-${activo.estado || 'DISPONIBLE'} text-xs px-3 py-1">${activo.estado || 'DISPONIBLE'}</span></div></div>
                <div class="p-4 space-y-3"><div class="grid grid-cols-2 gap-3 text-sm">${marca ? `<div class="flex items-center gap-2 col-span-2 bg-gray-50 p-2 rounded-lg"><i class="fas fa-tag text-primary w-4"></i><span class="text-gray-700">${marca} ${modelo}</span></div>` : ''}${serie ? `<div class="flex items-center gap-2"><i class="fas fa-barcode text-primary w-4"></i><span class="text-gray-600 text-xs font-mono">Serie: ${serie}</span></div>` : ''}${info.ano_fabricacion ? `<div class="flex items-center gap-2"><i class="fas fa-calendar-alt text-primary w-4"></i><span class="text-gray-600">Año: ${info.ano_fabricacion}</span></div>` : ''}</div>
                <div class="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500"><div class="flex items-center gap-2 mb-2"><i class="fas fa-calendar-check text-blue-600"></i><span class="font-semibold text-blue-800">Información de Asignación</span></div><div class="space-y-1"><p class="text-sm text-blue-700 flex items-center gap-2"><i class="fas fa-user-check"></i><span>Asignado a ti</span></p>${fechaAsignacion ? `<p class="text-sm text-blue-700 flex items-center gap-2"><i class="far fa-calendar-alt"></i><span>Desde: ${new Date(fechaAsignacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p><p class="text-xs text-blue-600 mt-1"><i class="fas fa-clock"></i> Tiempo asignado: ${calcularTiempoAsignacion(fechaAsignacion)}</p>` : ''}</div></div>
                <div class="grid grid-cols-2 gap-2">${ubicacion.nombre ? `<div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500 mb-1"><i class="fas fa-map-marker-alt text-primary"></i> Ubicación</p><p class="text-sm font-medium text-gray-700">${ubicacion.nombre}</p>${ubicacion.descripcion ? `<p class="text-xs text-gray-400">${ubicacion.descripcion}</p>` : ''}</div>` : ''}${empresa.nombre ? `<div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500 mb-1"><i class="fas fa-building text-primary"></i> Empresa</p><p class="text-sm font-medium text-gray-700">${empresa.nombre}</p>${empresa.ruc ? `<p class="text-xs text-gray-400">RUC: ${empresa.ruc}</p>` : ''}</div>` : ''}</div>
                ${garantiaStatus ? `<div class="flex items-center gap-2 p-2 rounded-lg ${garantiaClass}"><i class="fas fa-shield-alt"></i><span class="text-sm">Garantía: ${garantiaStatus}</span>${info.fecha_garantia ? `<span class="text-xs ml-auto">${new Date(info.fecha_garantia).toLocaleDateString()}</span>` : ''}</div>` : ''}
                ${info.condicion_fisica ? `<div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"><i class="fas fa-clipboard-check text-primary"></i><span class="text-sm">Condición: ${info.condicion_fisica}</span></div>` : ''}
                </div>
                <div class="px-4 pb-4 pt-2 border-t border-gray-100"><div class="flex justify-end gap-2"><button onclick="verDetalleActivo('${activo.id}')" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"><i class="fas fa-info-circle"></i> Ver detalles</button></div><p class="text-xs text-gray-400 text-center mt-3"><i class="fas fa-laptop"></i> Para soporte técnico, contacta al área de sistemas</p></div>
            </div>
        `;
    }
    html += '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function calcularTiempoAsignacion(fechaAsignacion) {
    if (!fechaAsignacion) return 'No registrada';
    const fechaInicio = new Date(fechaAsignacion);
    const hoy = new Date();
    const diffDays = Math.ceil(Math.abs(hoy - fechaInicio) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return '1 día';
    if (diffDays < 30) return `${diffDays} días`;
    if (diffDays < 365) { const meses = Math.floor(diffDays / 30); const dias = diffDays % 30; return `${meses} mes${meses !== 1 ? 'es' : ''}${dias > 0 ? ` y ${dias} día${dias !== 1 ? 's' : ''}` : ''}`; }
    const años = Math.floor(diffDays / 365); const meses = Math.floor((diffDays % 365) / 30); return `${años} año${años !== 1 ? 's' : ''}${meses > 0 ? ` y ${meses} mes${meses !== 1 ? 'es' : ''}` : ''}`;
}

async function actualizarSidebarSegunPermisos() {
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    let contenidoMenu = '';
    
    if (permisos.rol === 'ADMINISTRADOR') {
        contenidoMenu = generarSidebarPorRol('ADMINISTRADOR');
    } 
    else if (permisos.rol === 'OPERADOR_EMPRESA') {
        // Verificar si el operador tiene permiso
        let puedeRegistrar = false;
        if (permisos.empleadoId) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('puede_registrar_clientes_outlet')
                .eq('id', permisos.empleadoId)
                .single();
            puedeRegistrar = empleado?.puede_registrar_clientes_outlet || false;
        }
        contenidoMenu = generarSidebarPorRol('OPERADOR_EMPRESA', puedeRegistrar);
    }
    else if (permisos.rol === 'EMPLEADO') {
        // Verificar si el empleado tiene permiso
        let puedeRegistrar = false;
        if (permisos.empleadoId) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('puede_registrar_clientes_outlet')
                .eq('id', permisos.empleadoId)
                .single();
            puedeRegistrar = empleado?.puede_registrar_clientes_outlet || false;
        }
        contenidoMenu = generarSidebarPorRol('EMPLEADO', puedeRegistrar);
    }
    
    document.getElementById('sidebarNav').innerHTML = contenidoMenu;
}

function generarSidebarParaEmpleado(puedeRegistrarClientes) {
    let menu = `
        <!-- Mis Activos Asignados -->
        <a href="#" onclick="window.cargarVista('misActivos')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-laptop w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Mis Activos Asignados</span>
        </a>
        
        <!-- Tickets -->
        <a href="#" onclick="window.cargarVista('tickets')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-ticket-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Tickets</span>
        </a>
        
        <!-- Mis Solicitudes -->
        <a href="#" onclick="window.cargarVista('solicitudes')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-clipboard-list w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Mis Solicitudes</span>
        </a>
        
        <!-- Mis Cotizaciones (solo para vendedores) -->
        <a href="#" onclick="window.cargarVista('misCotizaciones')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-clipboard-list w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Mis Cotizaciones</span>
            <span id="mis-cotizaciones-badge" class="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 hidden">0</span>
        </a>

        ${puedeRegistrarClientes ? `
        <!-- Listado de Clientes Outlet -->
        <a href="#" onclick="window.cargarVista('listadoRegistrosClientes')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-list-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Listado de Clientes Outlet</span>
        </a>
        ` : ''}

        <!-- Registrar Cliente Outlet -->
        ${puedeRegistrarClientes ? `
        <a href="#" onclick="window.cargarVista('registroClientesOutlet')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-user-plus w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Registrar Cliente Outlet</span>
        </a>
        ` : ''}
        
        <!-- Base de Conocimiento -->
        <a href="#" onclick="window.cargarVista('conocimiento')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <i class="fas fa-database w-4 text-secondary group-hover:scale-110 transition-transform"></i>
            </div>
            <span class="font-medium">Base de Conocimiento</span>
        </a>
    `;
    
    return menu;
}

// ==================== VISTA MARCAS ====================
async function cargarVistaMarcas() {
    mostrarLoading('Cargando marcas...');
    try {
        console.log('%c📋 CARGANDO MARCAS', 'background: #6f42c1; color: white; font-size: 14px;');

        const { data: marcas } = await window.supabaseClient.from('marcas').select('*').order('nombre');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        marcas?.forEach(m => { if (m.creado_por) usuariosIds.add(m.creado_por); if (m.modificado_por) usuariosIds.add(m.modificado_por); });

        if (usuariosIds.size > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', Array.from(usuariosIds));

            if (usuarios?.length) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empleados } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empleadosMap = new Map(empleados?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const empleado = empleadosMap.get(u.empleado_id);
                        usuariosConEmpleados.set(u.id, { nombre: empleado?.nombre_completo || u.correo, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        const { data: infoGeneral } = await window.supabaseClient.from('info_general').select('marca_id');
        const activosPorMarca = new Map();
        infoGeneral?.forEach(i => activosPorMarca.set(i.marca_id, (activosPorMarca.get(i.marca_id) || 0) + 1));

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Marcas</h2>
                <button onclick="abrirModalNuevaMarca()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Marca</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarMarcas('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${marcas?.length || 0}</span></button>
                <button onclick="filtrarMarcas('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${marcas?.filter(m => m.activo).length || 0}</span></button>
                <button onclick="filtrarMarcas('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${marcas?.filter(m => !m.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="marcas-grid">
        `;

        if (marcas?.length) {
            marcas.forEach(m => {
                const creadorInfo = usuariosConEmpleados.get(m.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(m.modificado_por);
                const totalActivos = activosPorMarca.get(m.id) || 0;

                html += `
                    <div class="card-item" data-activo="${m.activo ? 'activa' : 'inactiva'}">
                        <div class="flex justify-between items-start mb-2"><div><span class="font-bold text-primary text-lg">${m.nombre}</span><span class="estado-badge ${m.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ml-2">${m.activo ? 'Activa' : 'Inactiva'}</span></div></div>
                        ${m.descripcion ? `<p class="text-sm text-gray-600 mb-2">${m.descripcion}</p>` : ''}
                        <div class="bg-blue-50 p-2 rounded-lg mb-2"><div class="flex items-center justify-between"><span class="text-sm font-medium text-gray-700">Activos registrados:</span><span class="text-xl font-bold text-blue-600">${totalActivos}</span></div></div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t"><p><i class="fas fa-user-plus"></i> Creado: ${new Date(m.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></p>${m.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(m.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></p>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleMarca('${m.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarMarca('${m.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoMarca('${m.id}', ${m.activo})" class="${m.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${m.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="verActivosPorMarca('${m.id}')" class="text-purple-600 hover:opacity-75"><i class="fas fa-desktop text-lg"></i>${totalActivos > 0 ? `<span class="ml-1 text-xs font-bold">${totalActivos}</span>` : ''}</button>
                            <button onclick="eliminarMarca('${m.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-trademark text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay marcas registradas</p><button onclick="abrirModalNuevaMarca()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Marca</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar marcas');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD MARCAS ====================
window.editarMarca = async function(id) {
    mostrarLoading('Cargando marca...');
    try {
        const { data: marca, error } = await window.supabaseClient
            .from('marcas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('marcaModalTitle').innerText = 'Editar Marca';
        document.getElementById('marca_nombre').value = marca.nombre || '';
        document.getElementById('marca_descripcion').value = marca.descripcion || '';
        document.getElementById('marca_activo').value = marca.activo ? 'true' : 'false';

        ocultarLoading();
        document.getElementById('marcaModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la marca', 'error');
    }
};

window.eliminarMarca = async function(id) {
    const { data: infoGeneral } = await window.supabaseClient
        .from('info_general')
        .select('id')
        .eq('marca_id', id)
        .limit(1);

    if (infoGeneral && infoGeneral.length > 0) {
        mostrarAlerta('Error', 'No se puede eliminar porque tiene activos asociados', 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar marca?',
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
                .from('marcas')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Marca eliminada', 'success');
            await cargarVistaMarcas();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la marca', 'error');
        }
    }
};

window.guardarMarca = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando marca...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const data = {
            nombre: document.getElementById('marca_nombre').value,
            descripcion: document.getElementById('marca_descripcion').value || null,
            activo: document.getElementById('marca_activo').value === 'true'
        };

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('marcas')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('marcas')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Marca guardada correctamente', 'success');
        cerrarModal('marcaModal');
        await cargarVistaMarcas();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la marca: ' + error.message, 'error');
    }
};

window.toggleEstadoMarca = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count } = await window.supabaseClient
            .from('info_general')
            .select('*', { count: 'exact', head: true })
            .eq('marca_id', id);

        if (count > 0) {
            const result = await Swal.fire({
                title: `¿Desactivar marca?`,
                html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Esta marca tiene <strong>${count} activo(s)</strong> asociado(s).</p><p class="text-sm text-gray-500 mt-2">Si la desactivas, los activos seguirán existiendo pero no podrás asignar esta marca a nuevos activos.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ffc107',
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) return;
        }
    }

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} marca?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta marca.`,
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
                .from('marcas')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Marca ${accion}da correctamente`, 'success');
            await cargarVistaMarcas();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalNuevaMarca = async function() {
    const modal = document.getElementById('marcaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('marcaModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('marcaForm');
    if (form) form.reset();
    const titleElement = document.getElementById('marcaModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Marca';
    const activoSelect = document.getElementById('marca_activo');
    if (activoSelect) activoSelect.value = 'true';
    await window.abrirModal('marcaModal');
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleMarca = async function(id) {
    mostrarLoading('Cargando detalles de la marca...');
    try {
        const { data: marca, error } = await window.supabaseClient
            .from('marcas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(marca.creado_por);
        const modificadorInfo = marca.modificado_por ? await obtenerInfoUsuarioConEmpleado(marca.modificado_por) : null;

        const { data: activos } = await window.supabaseClient
            .from('info_general')
            .select(`activo_id, activo:activo_id (nombre, codigo_activo, estado)`)
            .eq('marca_id', id)
            .limit(5);

        let activosHtml = activos?.length ? activos.map(a => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${a.activo?.nombre || 'N/A'}</span><span class="text-xs text-gray-500 ml-1">${a.activo?.codigo_activo || ''}</span></div><span class="estado-badge estado-${a.activo?.estado || 'DISPONIBLE'} text-xs">${a.activo?.estado || 'DISPONIBLE'}</span></div>`).join('') : '<p class="text-gray-400 italic">No hay activos de esta marca</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles de Marca`,
            width: '600px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-2">${marca.nombre}</h3><p><span class="font-semibold">Descripción:</span> ${marca.descripcion || 'Sin descripción'}</p><p><span class="font-semibold">Estado:</span> <span class="${marca.activo ? 'text-green-600' : 'text-red-600'}">${marca.activo ? 'Activa' : 'Inactiva'}</span></p></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-2">Activos de esta marca</h3><div class="max-h-40 overflow-y-auto">${activosHtml}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500"><h3 class="font-bold text-purple-700 mb-2">Auditoría</h3><p><span class="font-semibold">Creado:</span> ${new Date(marca.creado_el).toLocaleString()} por ${creadorInfo.nombre}</p>${modificadorInfo ? `<p><span class="font-semibold">Modificado:</span> ${new Date(marca.modificado_el).toLocaleString()} por ${modificadorInfo.nombre}</p>` : ''}</div></div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles', 'error');
    }
};

window.verActivosPorMarca = async function(id) {
    mostrarLoading('Cargando activos...');
    try {
        const { data: marca } = await window.supabaseClient
            .from('marcas')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: infoGeneral } = await window.supabaseClient
            .from('info_general')
            .select(`activo_id, activo:activo_id (nombre, codigo_activo, estado)`)
            .eq('marca_id', id);

        ocultarLoading();

        let activosHtml = infoGeneral?.length ? infoGeneral.map(i => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${i.activo?.nombre || 'N/A'}</p><p class="text-xs text-gray-500">${i.activo?.codigo_activo || 'Sin código'}</p></div><span class="estado-badge estado-${i.activo?.estado || 'DISPONIBLE'} text-xs">${i.activo?.estado || 'DISPONIBLE'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay activos de esta marca</p>';

        Swal.fire({
            title: `Activos de marca: ${marca?.nombre || 'Marca'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${activosHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '500px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los activos', 'error');
    }
};

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarMarcas = function(filtro) {
    const cards = document.querySelectorAll('#marcas-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === filtro || (filtro === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        if (filtro === 'activas') mostrar = card.dataset.activo === 'activa';
        else if (filtro === 'inactivas') mostrar = card.dataset.activo === 'inactiva';
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

// ==================== VISTA USUARIOS ====================
async function cargarVistaUsuarios() {
    mostrarLoading('Cargando usuarios...');
    
    try {
        console.log('%c📋 CARGANDO USUARIOS', 'background: #6f42c1; color: white; font-size: 14px;');
        
        // Verificar permisos
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // ============================================
        // OBTENER USUARIOS CON SUS RELACIONES (CORREGIDO)
        // ============================================
        
        // 1. Obtener usuarios
        const { data: usuarios, error: errorUsuarios } = await window.supabaseClient
            .from('usuarios')
            .select(`
                id,
                correo,
                empleado_id,
                rol_id,
                activo,
                primer_acceso,
                intentos_fallidos,
                ultimo_acceso,
                creado_el,
                modificado_el
            `)
            .order('correo');
        
        if (errorUsuarios) throw errorUsuarios;
        
        // 2. Obtener roles por separado
        const { data: roles, error: errorRoles } = await window.supabaseClient
            .from('roles')
            .select('id, nombre');
        
        if (errorRoles) throw errorRoles;
        
        const rolesMap = new Map();
        roles?.forEach(r => rolesMap.set(r.id, r.nombre));
        
        // 3. Obtener empleados de los usuarios que tienen empleado_id
        const empleadosIds = usuarios?.filter(u => u.empleado_id).map(u => u.empleado_id) || [];
        let empleadosMap = new Map();
        
        if (empleadosIds.length > 0) {
            const { data: empleados, error: errorEmpleados } = await window.supabaseClient
                .from('empleados')
                .select('id, nombre_completo, puesto, celular, correo')
                .in('id', empleadosIds);
            
            if (!errorEmpleados && empleados) {
                empleados.forEach(emp => empleadosMap.set(emp.id, emp));
            }
        }
        
        // 4. Obtener asignaciones de empresas
        const { data: asignacionesEmpresas, error: errorAsig } = await window.supabaseClient
            .from('usuarios_empresas')
            .select('usuario_id, empresa_id');
        
        if (errorAsig) throw errorAsig;
        
        // Agrupar empresas por usuario
        const empresasPorUsuario = new Map();
        asignacionesEmpresas?.forEach(asig => {
            if (!empresasPorUsuario.has(asig.usuario_id)) {
                empresasPorUsuario.set(asig.usuario_id, []);
            }
            empresasPorUsuario.get(asig.usuario_id).push(asig.empresa_id);
        });
        
        // 5. Obtener nombres de empresas
        const { data: empresas, error: errorEmpresas } = await window.supabaseClient
            .from('empresas')
            .select('id, nombre, ruc')
            .eq('activo', true);
        
        if (errorEmpresas) throw errorEmpresas;
        
        const empresasMap = new Map();
        empresas?.forEach(e => empresasMap.set(e.id, { nombre: e.nombre, ruc: e.ruc }));
        
        ocultarLoading();
        
        // ============================================
        // ESTADÍSTICAS
        // ============================================
        const totalUsuarios = usuarios?.length || 0;
        const totalActivos = usuarios?.filter(u => u.activo).length || 0;
        const totalInactivos = totalUsuarios - totalActivos;
        const totalPendientes = usuarios?.filter(u => u.primer_acceso).length || 0;
        const totalOperadores = usuarios?.filter(u => rolesMap.get(u.rol_id) === 'OPERADOR_EMPRESA').length || 0;
        
        // ============================================
        // GENERAR HTML
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-users-cog"></i> Usuarios del Sistema
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestión de usuarios, roles y empresas asignadas</p>
                    </div>
                    ${esAdmin ? `
                        <button onclick="abrirModalNuevoUsuario()" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>Nuevo Usuario
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <!-- Estadísticas -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${totalUsuarios}</p>
                    <p class="text-xs text-gray-500">Total Usuarios</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${totalActivos}</p>
                    <p class="text-xs text-gray-500">Activos</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-red-500">
                    <p class="text-2xl font-bold text-red-600">${totalInactivos}</p>
                    <p class="text-xs text-gray-500">Inactivos</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-yellow-500">
                    <p class="text-2xl font-bold text-yellow-600">${totalPendientes}</p>
                    <p class="text-xs text-gray-500">Pendientes</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-purple-500">
                    <p class="text-2xl font-bold text-purple-600">${totalOperadores}</p>
                    <p class="text-xs text-gray-500">Operadores</p>
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarUsuarios('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${totalUsuarios}</span></button>
                <button onclick="filtrarUsuarios('activos')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activos">Activos <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${totalActivos}</span></button>
                <button onclick="filtrarUsuarios('inactivos')" class="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200 filter-btn" data-filter="inactivos">Inactivos <span class="ml-1 bg-red-200 px-2 py-0.5 rounded-full text-xs">${totalInactivos}</span></button>
                <button onclick="filtrarUsuarios('pendientes')" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 filter-btn" data-filter="pendientes">Pendientes <span class="ml-1 bg-yellow-200 px-2 py-0.5 rounded-full text-xs">${totalPendientes}</span></button>
                <button onclick="filtrarUsuarios('operadores')" class="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 filter-btn" data-filter="operadores">Operadores <span class="ml-1 bg-purple-200 px-2 py-0.5 rounded-full text-xs">${totalOperadores}</span></button>
            </div>
            
            <!-- Búsqueda -->
            <div class="mb-4">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" id="busquedaUsuarios" placeholder="Buscar usuario por correo o nombre..." 
                        class="w-full md:w-80 pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
                        onkeyup="filtrarUsuariosPorBusqueda()">
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="usuarios-grid">
        `;
        
        if (usuarios?.length) {
            for (const u of usuarios) {
                const empleado = empleadosMap.get(u.empleado_id);
                const rolNombre = rolesMap.get(u.rol_id) || 'Sin rol';
                const esOperador = rolNombre === 'OPERADOR_EMPRESA';
                const empresasIds = empresasPorUsuario.get(u.id) || [];
                const empresasNombres = empresasIds.map(id => empresasMap.get(id)?.nombre).filter(n => n);
                const esActual = usuarioActual?.id === u.id;
                const bloqueado = u.intentos_fallidos >= 3;
                
                html += `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200" 
                         data-usuario-id="${u.id}"
                         data-estado="${u.activo ? 'activo' : 'inactivo'}"
                         data-pendiente="${u.primer_acceso}"
                         data-bloqueado="${bloqueado}"
                         data-rol="${rolNombre}"
                         data-nombre="${empleado?.nombre_completo || ''}"
                         data-correo="${u.correo}">
                        
                        <!-- Cabecera -->
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-3">
                                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <i class="fas fa-user-circle text-2xl text-primary"></i>
                                    </div>
                                    <div>
                                        <p class="font-bold text-primary text-base">${empleado?.nombre_completo || u.correo.split('@')[0]}</p>
                                        <p class="text-xs text-gray-500">${u.correo}</p>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-1 justify-end">
                                    <span class="estado-badge ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">
                                        ${u.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                    ${u.primer_acceso ? '<span class="estado-badge bg-yellow-100 text-yellow-800 text-xs">Pendiente</span>' : ''}
                                    ${bloqueado ? '<span class="estado-badge bg-red-100 text-red-800 text-xs">Bloqueado</span>' : ''}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Cuerpo -->
                        <div class="p-4 space-y-3">
                            <!-- Información del empleado -->
                            <div class="bg-gray-50 p-2 rounded-lg">
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-user-tie text-primary w-4"></i>
                                    <span class="font-medium">Empleado:</span>
                                    <span class="text-gray-700">${empleado?.nombre_completo || 'No asociado'}</span>
                                </div>
                                ${empleado?.puesto ? `
                                    <div class="flex items-center gap-2 text-sm mt-1">
                                        <i class="fas fa-briefcase text-primary w-4"></i>
                                        <span class="font-medium">Puesto:</span>
                                        <span class="text-gray-700">${empleado.puesto}</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <!-- Rol -->
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-tag text-primary w-4"></i>
                                    <span class="font-medium text-sm">Rol:</span>
                                    <span class="text-sm px-2 py-0.5 rounded-full ${rolNombre === 'ADMINISTRADOR' ? 'bg-red-100 text-red-700' : rolNombre === 'OPERADOR_EMPRESA' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                        ${rolNombre}
                                    </span>
                                </div>
                                <div class="flex items-center gap-1 text-xs text-gray-400">
                                    <i class="fas fa-clock"></i>
                                    <span>${u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString() : 'Nunca'}</span>
                                </div>
                            </div>
                            
                            <!-- Empresas asignadas (solo para OPERADORES) -->
                            ${esOperador ? `
                                <div class="border-t border-gray-100 pt-2">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <i class="fas fa-building text-primary w-4"></i>
                                            <span class="font-medium text-sm">Empresas asignadas:</span>
                                            <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">${empresasNombres.length}</span>
                                        </div>
                                        ${esAdmin ? `
                                            <button onclick="window.cargarVista('asignacionUsuariosEmpresas')" 
                                                    class="text-xs text-primary hover:underline flex items-center gap-1">
                                                <i class="fas fa-edit"></i> Gestionar
                                            </button>
                                        ` : ''}
                                    </div>
                                    ${empresasNombres.length > 0 ? `
                                        <div class="flex flex-wrap gap-1">
                                            ${empresasNombres.map(nom => `
                                                <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${nom}</span>
                                            `).join('')}
                                        </div>
                                    ` : `
                                        <p class="text-xs text-gray-400 italic">Sin empresas asignadas</p>
                                    `}
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Acciones -->
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2 bg-gray-50">
                            <button onclick="verDetalleUsuario('${u.id}')" class="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Ver detalles">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            ${esAdmin && !esActual ? `
                                <button onclick="editarUsuario('${u.id}')" class="w-8 h-8 rounded-lg text-primary hover:bg-primary hover:text-white transition-colors" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="resetearPasswordUsuario('${u.id}')" class="w-8 h-8 rounded-lg text-orange-600 hover:bg-orange-600 hover:text-white transition-colors" title="Resetear contraseña">
                                    <i class="fas fa-key"></i>
                                </button>
                                <button onclick="toggleEstadoUsuario('${u.id}', ${u.activo})" class="w-8 h-8 rounded-lg ${u.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white transition-colors" title="${u.activo ? 'Desactivar' : 'Activar'}">
                                    <i class="fas ${u.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                </button>
                                <button onclick="eliminarUsuario('${u.id}')" class="w-8 h-8 rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                            ${esActual ? '<span class="text-xs text-gray-400 italic">(Usuario actual)</span>' : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg">
                        <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500 text-lg">No hay usuarios registrados</p>
                    </div>`;
        }
        
        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Resaltar filtro activo
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
        
        console.log('✅ Vista de usuarios cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarError('Error al cargar usuarios: ' + error.message);
    }
}

// ==================== FUNCIONES DE USUARIOS ====================
window.filtrarUsuarios = function(filtro) {
    const cards = document.querySelectorAll('#usuarios-grid .user-card');
    const botones = document.querySelectorAll('.filter-btn');
    
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === filtro) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        
        if (filtro === 'activos') mostrar = card.dataset.estado === 'activo';
        else if (filtro === 'inactivos') mostrar = card.dataset.estado === 'inactivo';
        else if (filtro === 'pendientes') mostrar = card.dataset.pendiente === 'true';
        else if (filtro === 'bloqueados') mostrar = card.dataset.bloqueado === 'true';
        else if (filtro === 'operadores') mostrar = card.dataset.rol === 'OPERADOR_EMPRESA';
        
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

window.filtrarUsuariosPorBusqueda = function() {
    const termino = document.getElementById('busquedaUsuarios')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('#usuarios-grid .user-card');
    
    cards.forEach(card => {
        const nombre = (card.dataset.nombre || '').toLowerCase();
        const correo = (card.dataset.correo || '').toLowerCase();
        
        if (nombre.includes(termino) || correo.includes(termino) || termino === '') {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
};

// ==================== FUNCIONES PARA GESTIÓN DE USUARIOS ====================

// Ver detalle de usuario
window.verDetalleUsuario = async function(usuarioId) {
    mostrarLoading('Cargando detalles del usuario...');
    
    try {
        const { data: usuario, error } = await window.supabaseClient
            .from('usuarios')
            .select(`
                *,
                roles!usuarios_rol_id_fkey (id, nombre),
                empleados!usuarios_empleado_id_fkey (
                    id, 
                    nombre_completo, 
                    puesto, 
                    celular, 
                    correo
                )
            `)
            .eq('id', usuarioId)
            .single();
        
        if (error) throw error;
        
        // Obtener empresas asignadas (si es OPERADOR)
        let empresasHtml = '';
        if (usuario.roles?.nombre === 'OPERADOR_EMPRESA') {
            const { data: asignaciones } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('empresa_id, empresas!inner(id, nombre, ruc)')
                .eq('usuario_id', usuarioId);
            
            if (asignaciones && asignaciones.length > 0) {
                const empresasHtmlContent = asignaciones.map(a => `
                    <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        ${a.empresas?.nombre || 'Empresa'} ${a.empresas?.ruc ? `(${a.empresas.ruc})` : ''}
                    </span>
                `).join('');
                
                empresasHtml = `
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="font-semibold text-gray-700 mb-2"><i class="fas fa-building text-primary"></i> Empresas Asignadas:</p>
                        <div class="flex flex-wrap gap-2">
                            ${empresasHtmlContent}
                        </div>
                    </div>
                `;
            }
        }
        
        // Obtener información del creador y modificador
        const creadorInfo = await obtenerInfoUsuarioConEmpleado(usuario.creado_por);
        const modificadorInfo = usuario.modificado_por ? await obtenerInfoUsuarioConEmpleado(usuario.modificado_por) : null;
        
        ocultarLoading();
        
        Swal.fire({
            title: `<span class="text-primary">${usuario.empleados?.nombre_completo || usuario.correo}</span>`,
            width: '700px',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <!-- Información de la cuenta -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary">
                        <h3 class="font-bold text-primary mb-3"><i class="fas fa-user-circle"></i> Información de la Cuenta</h3>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div><span class="font-semibold">Correo:</span> ${usuario.correo}</div>
                            <div><span class="font-semibold">Rol:</span> 
                                <span class="px-2 py-0.5 rounded-full text-xs ${usuario.roles?.nombre === 'ADMINISTRADOR' ? 'bg-red-100 text-red-700' : usuario.roles?.nombre === 'OPERADOR_EMPRESA' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                    ${usuario.roles?.nombre || 'Sin rol'}
                                </span>
                            </div>
                            <div><span class="font-semibold">Estado:</span> 
                                <span class="px-2 py-0.5 rounded-full text-xs ${usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div><span class="font-semibold">Primer acceso:</span> ${usuario.primer_acceso ? 'Pendiente' : 'Completado'}</div>
                            <div><span class="font-semibold">Intentos fallidos:</span> ${usuario.intentos_fallidos || 0}/3</div>
                            <div><span class="font-semibold">Último acceso:</span> ${usuario.ultimo_acceso ? new Date(usuario.ultimo_acceso).toLocaleString() : 'Nunca'}</div>
                        </div>
                    </div>
                    
                    <!-- Información del empleado -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                        <h3 class="font-bold text-green-700 mb-3"><i class="fas fa-user-tie"></i> Información del Empleado</h3>
                        ${usuario.empleados ? `
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div class="col-span-2"><span class="font-semibold">Nombre:</span> ${usuario.empleados.nombre_completo}</div>
                                <div><span class="font-semibold">Puesto:</span> ${usuario.empleados.puesto || 'No especificado'}</div>
                                <div><span class="font-semibold">Celular:</span> ${usuario.empleados.celular || 'No especificado'}</div>
                                <div class="col-span-2"><span class="font-semibold">Correo empleado:</span> ${usuario.empleados.correo || 'No especificado'}</div>
                            </div>
                        ` : '<p class="text-gray-500 italic">No hay empleado asociado a este usuario</p>'}
                    </div>
                    
                    ${empresasHtml}
                    
                    <!-- Auditoría -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                        <h3 class="font-bold text-gray-600 mb-3"><i class="fas fa-history"></i> Auditoría</h3>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p><span class="font-semibold">Creado el:</span></p>
                                <p>${usuario.creado_el ? new Date(usuario.creado_el).toLocaleString() : 'N/A'}</p>
                                <p><span class="font-semibold">Por:</span> ${creadorInfo.nombre}</p>
                            </div>
                            ${modificadorInfo ? `
                                <div>
                                    <p><span class="font-semibold">Modificado el:</span></p>
                                    <p>${usuario.modificado_el ? new Date(usuario.modificado_el).toLocaleString() : 'N/A'}</p>
                                    <p><span class="font-semibold">Por:</span> ${modificadorInfo.nombre}</p>
                                </div>
                            ` : ''}
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
        mostrarAlerta('Error', 'No se pudieron cargar los detalles: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Editar usuario
window.editarUsuario = async function(usuarioId) {
    mostrarLoading('Cargando usuario...');
    
    try {
        // Usar la relación específica con !inner o especificar el nombre de la relación
        const { data: usuario, error } = await window.supabaseClient
            .from('usuarios')
            .select(`
                *,
                roles!usuarios_rol_id_fkey (id, nombre),
                empleados:empleado_id (id, nombre_completo, puesto, celular)
            `)
            .eq('id', usuarioId)
            .single();
        
        if (error) throw error;
        
        // Obtener empleados disponibles
        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto')
            .eq('activo', true)
            .order('nombre_completo');
        
        // Obtener roles disponibles
        const { data: roles } = await window.supabaseClient
            .from('roles')
            .select('id, nombre')
            .order('nombre');
        
        ocultarLoading();
        
        // Generar opciones de empleados
        const empleadosOptions = empleados?.map(emp => `
            <option value="${emp.id}" ${usuario.empleado_id === emp.id ? 'selected' : ''}>
                ${emp.nombre_completo} ${emp.puesto ? `- ${emp.puesto}` : ''}
            </option>
        `).join('') || '<option value="">No hay empleados disponibles</option>';
        
        // Generar opciones de roles
        const rolesOptions = roles?.map(rol => `
            <option value="${rol.id}" ${usuario.rol_id === rol.id ? 'selected' : ''}>
                ${rol.nombre}
            </option>
        `).join('') || '';
        
        const { value: formValues } = await Swal.fire({
            title: 'Editar Usuario',
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <label class="form-label font-medium text-gray-700">Correo electrónico</label>
                        <input type="email" id="edit_correo" class="form-input w-full" value="${usuario.correo}" required>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Empleado asociado</label>
                        <select id="edit_empleado_id" class="form-input w-full">
                            <option value="">Ninguno</option>
                            ${empleadosOptions}
                        </select>
                        <p class="text-xs text-gray-400 mt-1">El empleado debe estar registrado previamente</p>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Rol</label>
                        <select id="edit_rol_id" class="form-input w-full" required>
                            ${rolesOptions}
                        </select>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Estado</label>
                        <select id="edit_activo" class="form-input w-full">
                            <option value="true" ${usuario.activo ? 'selected' : ''}>Activo</option>
                            <option value="false" ${!usuario.activo ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            width: '550px',
            preConfirm: () => {
                const correo = document.getElementById('edit_correo').value;
                if (!correo) {
                    Swal.showValidationMessage('El correo es obligatorio');
                    return false;
                }
                return {
                    correo: correo,
                    empleado_id: document.getElementById('edit_empleado_id').value || null,
                    rol_id: document.getElementById('edit_rol_id').value,
                    activo: document.getElementById('edit_activo').value === 'true'
                };
            }
        });
        
        if (formValues) {
            mostrarLoading('Guardando cambios...');
            
            const { error: updateError } = await window.supabaseClient
                .from('usuarios')
                .update({
                    correo: formValues.correo,
                    empleado_id: formValues.empleado_id,
                    rol_id: formValues.rol_id,
                    activo: formValues.activo,
                    modificado_el: new Date().toISOString(),
                    modificado_por: usuarioActual.id
                })
                .eq('id', usuarioId);
            
            if (updateError) throw updateError;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Usuario actualizado correctamente', 'success');
            await cargarVistaUsuarios();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo actualizar el usuario: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Resetear contraseña de usuario
window.resetearPasswordUsuario = async function(usuarioId) {
    const result = await Swal.fire({
        title: 'Resetear contraseña',
        html: `
            <div class="text-left">
                <p>¿Está seguro de resetear la contraseña de este usuario?</p>
                <p class="text-sm text-gray-500 mt-2">El usuario deberá crear una nueva contraseña en su próximo acceso.</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        confirmButtonText: 'Sí, resetear',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Reseteando contraseña...');
        
        try {
            const { error } = await window.supabaseClient
                .from('usuarios')
                .update({
                    contrasena_hash: null,
                    primer_acceso: true,
                    intentos_fallidos: 0,
                    bloqueado_hasta: null,
                    modificado_el: new Date().toISOString(),
                    modificado_por: usuarioActual.id
                })
                .eq('id', usuarioId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Contraseña reseteada correctamente', 'success');
            await cargarVistaUsuarios();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo resetear la contraseña', 'error');
        }
    }
};

// Activar/Desactivar usuario
window.toggleEstadoUsuario = async function(usuarioId, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} usuario?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} este usuario en el sistema.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado ? '#28a745' : '#ffc107',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        
        try {
            const { error } = await window.supabaseClient
                .from('usuarios')
                .update({
                    activo: nuevoEstado,
                    modificado_el: new Date().toISOString(),
                    modificado_por: usuarioActual.id
                })
                .eq('id', usuarioId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Usuario ${accion}do correctamente`, 'success');
            await cargarVistaUsuarios();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// Eliminar usuario
window.eliminarUsuario = async function(usuarioId) {
    // Verificar si el usuario tiene asignaciones
    const { data: asignaciones, error: asigError } = await window.supabaseClient
        .from('usuarios_empresas')
        .select('id', { count: 'exact' })
        .eq('usuario_id', usuarioId);
    
    if (asigError) throw asigError;
    
    let mensajeAdicional = '';
    if (asignaciones && asignaciones.length > 0) {
        mensajeAdicional = `<p class="text-sm text-orange-500 mt-2">⚠️ Este usuario tiene ${asignaciones.length} asignación(es) de empresas. También serán eliminadas.</p>`;
    }
    
    const result = await Swal.fire({
        title: '¿Eliminar usuario?',
        html: `
            <div class="text-left">
                <p>Esta acción no se puede deshacer.</p>
                ${mensajeAdicional}
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Eliminando usuario...');
        
        try {
            // Eliminar asignaciones de empresas primero
            await window.supabaseClient
                .from('usuarios_empresas')
                .delete()
                .eq('usuario_id', usuarioId);
            
            // Eliminar el usuario
            const { error } = await window.supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', usuarioId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Usuario eliminado correctamente', 'success');
            await cargarVistaUsuarios();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el usuario', 'error');
        }
    }
};

// Modal para nuevo usuario
window.abrirModalNuevoUsuario = async function() {
    // Obtener empleados disponibles
    const { data: empleados } = await window.supabaseClient
        .from('empleados')
        .select('id, nombre_completo, puesto')
        .eq('activo', true)
        .order('nombre_completo');
    
    // Obtener roles disponibles
    const { data: roles } = await window.supabaseClient
        .from('roles')
        .select('id, nombre')
        .order('nombre');
    
    const empleadosOptions = empleados?.map(emp => `
        <option value="${emp.id}">${emp.nombre_completo} ${emp.puesto ? `- ${emp.puesto}` : ''}</option>
    `).join('') || '<option value="">No hay empleados disponibles</option>';
    
    const rolesOptions = roles?.map(rol => `
        <option value="${rol.id}">${rol.nombre}</option>
    `).join('') || '';
    
    const { value: formValues } = await Swal.fire({
        title: 'Nuevo Usuario',
        html: `
            <div class="text-left space-y-4">
                <div>
                    <label class="form-label font-medium text-gray-700">Correo electrónico *</label>
                    <input type="email" id="new_correo" class="form-input w-full" placeholder="usuario@empresa.com" required>
                </div>
                <div>
                    <label class="form-label font-medium text-gray-700">Empleado asociado</label>
                    <select id="new_empleado_id" class="form-input w-full">
                        <option value="">Ninguno</option>
                        ${empleadosOptions}
                    </select>
                    <p class="text-xs text-gray-400 mt-1">El empleado debe estar registrado previamente en Recursos Humanos</p>
                </div>
                <div>
                    <label class="form-label font-medium text-gray-700">Rol *</label>
                    <select id="new_rol_id" class="form-input w-full" required>
                        <option value="">Seleccionar rol</option>
                        ${rolesOptions}
                    </select>
                </div>
                <div class="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                    <i class="fas fa-info-circle mr-1"></i>
                    El usuario deberá establecer su contraseña en el primer acceso.
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Crear Usuario',
        cancelButtonText: 'Cancelar',
        width: '550px',
        preConfirm: () => {
            const correo = document.getElementById('new_correo').value;
            const rolId = document.getElementById('new_rol_id').value;
            
            if (!correo) {
                Swal.showValidationMessage('El correo es obligatorio');
                return false;
            }
            if (!rolId) {
                Swal.showValidationMessage('Debe seleccionar un rol');
                return false;
            }
            
            return {
                correo: correo,
                empleado_id: document.getElementById('new_empleado_id').value || null,
                rol_id: rolId
            };
        }
    });
    
    if (formValues) {
        mostrarLoading('Creando usuario...');
        
        try {
            // Verificar si el correo ya existe
            const { data: existente } = await window.supabaseClient
                .from('usuarios')
                .select('id')
                .eq('correo', formValues.correo)
                .maybeSingle();
            
            if (existente) {
                ocultarLoading();
                mostrarAlerta('Error', 'Ya existe un usuario con este correo electrónico', 'error');
                return;
            }
            
            const ahora = new Date().toISOString();
            
            const { error } = await window.supabaseClient
                .from('usuarios')
                .insert({
                    correo: formValues.correo,
                    empleado_id: formValues.empleado_id,
                    rol_id: formValues.rol_id,
                    primer_acceso: true,
                    activo: true,
                    creado_el: ahora,
                    creado_por: usuarioActual.id
                });
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Usuario creado correctamente', 'success');
            await cargarVistaUsuarios();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo crear el usuario: ' + error.message, 'error');
        }
    }
};

// ==================== CONFIGURACIÓN DE RED ====================
window.abrirModalConfiguracionRed = async function(activoId) {
    try {
        let modal = document.getElementById('configRedModal');
        if (!modal) {
            const modalHtml = `
                <div id="configRedModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div class="flex-shrink-0 bg-primary text-white p-4 rounded-t-xl flex justify-between items-center"><h2 class="text-xl font-bold" id="configRedModalTitle"><i class="fas fa-network-wired mr-2"></i>Configuración de Red</h2><button onclick="cerrarModal('configRedModal')" class="hover:bg-primary-dark p-2 rounded-lg transition-colors"><i class="fas fa-times"></i></button></div>
                        <div class="flex-1 overflow-y-auto p-6">
                            <form id="configRedForm" onsubmit="guardarConfiguracionRed(event)">
                                <input type="hidden" id="config_red_id">
                                <input type="hidden" id="config_red_activo_id">
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">Hostname</label><input type="text" id="config_hostname" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="ej: LAPTOP-001"></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">Dirección IP</label><input type="text" id="config_ip" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="192.168.1.100"></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">Tipo de IP</label><select id="config_tipo_ip" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"><option value="">Seleccionar</option><option value="ESTATICA">Estática</option><option value="DHCP">DHCP</option></select></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">Máscara de subred</label><input type="text" id="config_mascara" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="255.255.255.0"></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">Gateway</label><input type="text" id="config_gateway" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="192.168.1.1"></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">DNS Primario</label><input type="text" id="config_dns1" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="8.8.8.8"></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">DNS Secundario</label><input type="text" id="config_dns2" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="8.8.4.4"></div>
                                <div class="mb-4"><label class="form-label font-medium text-gray-700 block mb-1">Dirección MAC</label><input type="text" id="config_mac" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="AA:BB:CC:DD:EE:FF"></div>
                                <div class="flex justify-end gap-3 pt-4 border-t border-gray-200"><button type="button" onclick="cerrarModal('configRedModal')" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"><i class="fas fa-times mr-1"></i>Cancelar</button><button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"><i class="fas fa-save mr-1"></i>Guardar</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('configRedModal');
        }

        if (modal && !modal.classList.contains('hidden')) {
            window.cerrarModal('configRedModal');
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        editandoId = null;
        const form = document.getElementById('configRedForm');
        if (form) form.reset();

        const titleElement = document.getElementById('configRedModalTitle');
        if (titleElement) titleElement.innerHTML = '<i class="fas fa-network-wired mr-2"></i>Configuración de Red';

        const activoIdField = document.getElementById('config_red_activo_id');
        if (activoIdField) activoIdField.value = activoId;

        const idField = document.getElementById('config_red_id');
        if (idField) idField.value = '';

        mostrarLoading('Cargando configuración...');
        const { data: config } = await window.supabaseClient
            .from('configuracion_red')
            .select('*')
            .eq('activo_id', activoId)
            .maybeSingle();
        ocultarLoading();

        if (config) {
            if (idField) idField.value = config.id;
            const hostnameInput = document.getElementById('config_hostname');
            if (hostnameInput) hostnameInput.value = config.hostname || '';
            const ipInput = document.getElementById('config_ip');
            if (ipInput) ipInput.value = config.ipv4_direccion || '';
            const tipoIpSelect = document.getElementById('config_tipo_ip');
            if (tipoIpSelect) tipoIpSelect.value = config.ipv4_tipo || '';
            const mascaraInput = document.getElementById('config_mascara');
            if (mascaraInput) mascaraInput.value = config.ipv4_mascara || '';
            const gatewayInput = document.getElementById('config_gateway');
            if (gatewayInput) gatewayInput.value = config.ipv4_puerta_enlace || '';
            const dns1Input = document.getElementById('config_dns1');
            if (dns1Input) dns1Input.value = config.dns_primario || '';
            const dns2Input = document.getElementById('config_dns2');
            if (dns2Input) dns2Input.value = config.dns_secundario || '';
            const macInput = document.getElementById('config_mac');
            if (macInput) macInput.value = config.mac_direccion || '';
        }

        await window.abrirModal('configRedModal');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error al abrir modal:', error);
        mostrarAlerta('Error', 'No se pudo abrir el formulario: ' + error.message, 'error');
    }
};

window.guardarConfiguracionRed = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando configuración de red...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const activoId = document.getElementById('config_red_activo_id').value;
        if (!activoId) {
            ocultarLoading();
            mostrarAlerta('Error', 'ID de activo no válido', 'error');
            return;
        }

        const ip = document.getElementById('config_ip')?.value?.trim() || null;
        const hostname = document.getElementById('config_hostname')?.value?.trim() || null;
        const editandoId = document.getElementById('config_red_id')?.value;

        if (ip && !validarFormatoIP(ip)) {
            ocultarLoading();
            mostrarAlerta('Error', 'El formato de la dirección IP no es válido', 'error');
            document.getElementById('config_ip').focus();
            return;
        }

        const mac = document.getElementById('config_mac')?.value?.trim() || null;
        if (mac && !validarFormatoMAC(mac)) {
            ocultarLoading();
            mostrarAlerta('Error', 'El formato de la dirección MAC no es válido', 'error');
            document.getElementById('config_mac').focus();
            return;
        }

        if (ip) {
            const ipCheck = await verificarIPDuplicada(ip, editandoId ? activoId : null);
            if (ipCheck.duplicado) {
                ocultarLoading();
                await Swal.fire({
                    title: 'IP Duplicada',
                    html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>La dirección IP <strong>${ip}</strong> ya está asignada a:</p><p class="text-lg font-bold text-primary mt-2">${ipCheck.activo}</p><p class="text-sm text-gray-500">Código: ${ipCheck.codigo}</p><p class="text-sm text-gray-500 mt-2">Por favor, use una dirección IP diferente.</p></div>`,
                    icon: 'warning',
                    confirmButtonColor: '#39080a',
                    confirmButtonText: 'Entendido'
                });
                return;
            }
        }

        if (hostname) {
            const hostnameCheck = await verificarHostnameDuplicado(hostname, editandoId ? activoId : null);
            if (hostnameCheck.duplicado) {
                ocultarLoading();
                await Swal.fire({
                    title: 'Hostname Duplicado',
                    html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>El hostname <strong>${hostname}</strong> ya está asignado a:</p><p class="text-lg font-bold text-primary mt-2">${hostnameCheck.activo}</p><p class="text-sm text-gray-500">Código: ${hostnameCheck.codigo}</p><p class="text-sm text-gray-500 mt-2">Por favor, use un hostname diferente.</p></div>`,
                    icon: 'warning',
                    confirmButtonColor: '#39080a',
                    confirmButtonText: 'Entendido'
                });
                return;
            }
        }

        const data = {
            activo_id: activoId,
            hostname: hostname,
            ipv4_direccion: ip,
            ipv4_tipo: document.getElementById('config_tipo_ip')?.value || null,
            ipv4_mascara: document.getElementById('config_mascara')?.value?.trim() || null,
            ipv4_puerta_enlace: document.getElementById('config_gateway')?.value?.trim() || null,
            dns_primario: document.getElementById('config_dns1')?.value?.trim() || null,
            dns_secundario: document.getElementById('config_dns2')?.value?.trim() || null,
            mac_direccion: mac
        };

        if (editandoId && editandoId !== '') {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('configuracion_red')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('configuracion_red')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Configuración de red guardada correctamente', 'success');
        cerrarModal('configRedModal');
        await cargarVistaActivos();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', error.message || 'No se pudo guardar la configuración de red', 'error');
    }
};

// ==================== FUNCIONES AUXILIARES DE VALIDACIÓN ====================
function validarFormatoIP(ip) {
    if (!ip) return true;
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
}

function validarFormatoMAC(mac) {
    if (!mac) return true;
    const regex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return regex.test(mac);
}

async function verificarIPDuplicada(ip, activoIdExcluir = null) {
    if (!ip) return { duplicado: false };

    try {
        let query = window.supabaseClient
            .from('configuracion_red')
            .select('activo_id, activo:activo_id (nombre, codigo_activo)')
            .eq('ipv4_direccion', ip);

        if (activoIdExcluir) {
            query = query.neq('activo_id', activoIdExcluir);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data) {
            return {
                duplicado: true,
                activo: data.activo?.nombre || 'Otro activo',
                codigo: data.activo?.codigo_activo || 'N/A'
            };
        }

        return { duplicado: false };
    } catch (error) {
        console.error('Error verificando IP duplicada:', error);
        return { duplicado: false };
    }
}

async function verificarHostnameDuplicado(hostname, activoIdExcluir = null) {
    if (!hostname) return { duplicado: false };

    try {
        let query = window.supabaseClient
            .from('configuracion_red')
            .select('activo_id, activo:activo_id (nombre, codigo_activo)')
            .eq('hostname', hostname);

        if (activoIdExcluir) {
            query = query.neq('activo_id', activoIdExcluir);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data) {
            return {
                duplicado: true,
                activo: data.activo?.nombre || 'Otro activo',
                codigo: data.activo?.codigo_activo || 'N/A'
            };
        }

        return { duplicado: false };
    } catch (error) {
        console.error('Error verificando hostname duplicado:', error);
        return { duplicado: false };
    }
}

// ==================== FUNCIONES DE REPORTE Y ETIQUETAS ====================
window.generarReporteActivo = async function(activoId) {
    mostrarLoading('Generando reporte profesional...');
    
    try {
        console.log('📄 Generando reporte completo para activo:', activoId);

        // ========== OBTENER TODOS LOS DATOS DEL ACTIVO ==========
        
        // 1. Datos básicos del activo
        const { data: activo, error: errorActivo } = await window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (id, nombre),
                empresa:empresa_id (id, nombre, ruc, descripcion),
                ubicacion:ubicacion_id (id, nombre, descripcion, tipo)
            `)
            .eq('id', activoId)
            .single();
        
        if (errorActivo) throw errorActivo;

        // 2. Información general
        const { data: infoGeneral } = await window.supabaseClient
            .from('info_general')
            .select(`*, marca:marca_id (id, nombre, descripcion)`)
            .eq('activo_id', activoId)
            .maybeSingle();

        // 3. Configuración de red
        const { data: configRed } = await window.supabaseClient
            .from('configuracion_red')
            .select('*')
            .eq('activo_id', activoId)
            .maybeSingle();

        // 4. Software instalado
        const { data: softwareInstalado } = await window.supabaseClient
            .from('software_instalado')
            .select(`
                *,
                software:software_id (id, nombre, fabricante, descripcion),
                instalador:instalado_por (id, correo, empleado_id)
            `)
            .eq('activo_id', activoId)
            .eq('estado', 'INSTALADO')
            .order('fecha_instalacion', { ascending: false });

        // 5. Credenciales
        const { data: credenciales } = await window.supabaseClient
            .from('credenciales')
            .select('*')
            .eq('activo_id', activoId)
            .eq('activo', true)
            .order('es_principal', { ascending: false });

        // 6. Accesos remotos
        const { data: accesosRemotos } = await window.supabaseClient
            .from('accesos_remotos')
            .select('*')
            .eq('activo_id', activoId)
            .eq('activo', true);

        // 7. Tareas de respaldo
        const { data: tareasRespaldo } = await window.supabaseClient
            .from('tareas_respaldo')
            .select('*')
            .eq('activo_id', activoId)
            .eq('activo', true);

        // 8. Asignación actual
        const { data: asignacionActual } = await window.supabaseClient
            .from('asignaciones')
            .select(`
                *,
                empleado:empleado_id (id, nombre_completo, correo, celular, puesto, areas (nombre)),
                asignador:asignado_por (id, correo, empleado_id)
            `)
            .eq('activo_id', activoId)
            .eq('estado', 'ACTIVA')
            .maybeSingle();

        // 9. Historial de asignaciones
        const { data: historialAsignaciones } = await window.supabaseClient
            .from('asignaciones')
            .select(`
                *,
                empleado:empleado_id (id, nombre_completo),
                asignador:asignado_por (id, correo)
            `)
            .eq('activo_id', activoId)
            .order('fecha_asignacion', { ascending: false })
            .limit(10);

        // 10. Mantenimientos
        const { data: mantenimientos } = await window.supabaseClient
            .from('mantenimientos')
            .select(`*`)
            .eq('activo_id', activoId)
            .order('fecha_solicitud', { ascending: false });

        // 11. Especificaciones técnicas
        const { data: especificaciones } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`
                *,
                atributo:atributo_id (id, nombre_atributo, tipo_dato, unidad_medida)
            `)
            .eq('activo_id', activoId);

        // 12. Historial de estados
        const { data: historialEstados } = await window.supabaseClient
            .from('historial_estados_activos')
            .select(`*, cambiado_por (id, correo, empleado_id)`)
            .eq('activo_id', activoId)
            .order('fecha_cambio', { ascending: false })
            .limit(10);

        // 13. Historial de ubicaciones
        const { data: historialUbicaciones } = await window.supabaseClient
            .from('historial_ubicaciones_activos')
            .select(`*, ubicacion_anterior:ubicacion_anterior_id (nombre), ubicacion_nueva:ubicacion_nueva_id (nombre), cambiado_por (id, correo, empleado_id)`)
            .eq('activo_id', activoId)
            .order('fecha_cambio', { ascending: false })
            .limit(10);

        // 14. Información de auditoría
        const creadorInfo = await obtenerInfoUsuarioConEmpleado(activo.creado_por);
        const modificadorInfo = activo.modificado_por ? await obtenerInfoUsuarioConEmpleado(activo.modificado_por) : null;

        ocultarLoading();

        // ========== FUNCIONES AUXILIARES ==========
        const formatearFecha = (fecha) => {
            if (!fecha) return 'No registrada';
            return new Date(fecha).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const formatearFechaHora = (fecha) => {
            if (!fecha) return 'No registrada';
            return new Date(fecha).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const condicionMap = {
            'EXCELENTE': 'Excelente',
            'BUENO': 'Bueno',
            'REGULAR': 'Regular',
            'MALO': 'Malo',
            'POR_REPARAR': 'Por reparar'
        };

        const estadoMap = {
            'DISPONIBLE': { label: 'Disponible', color: '#10b981', bg: '#d1fae5' },
            'ASIGNADO': { label: 'Asignado', color: '#3b82f6', bg: '#dbeafe' },
            'MANTENIMIENTO': { label: 'Mantenimiento', color: '#8b5cf6', bg: '#ede9fe' },
            'REPARACIÓN': { label: 'Reparación', color: '#f59e0b', bg: '#fed7aa' },
            'BAJA': { label: 'Baja', color: '#ef4444', bg: '#fee2e2' },
            'RESERVADO': { label: 'Reservado', color: '#06b6d4', bg: '#cffafe' },
            'PRÉSTAMO': { label: 'Préstamo', color: '#14b8a6', bg: '#ccfbf1' }
        };

        // ========== GENERAR HTML DEL REPORTE ==========
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Activo - ${activo.nombre || 'Sin nombre'}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', 'Roboto', 'Inter', system-ui, -apple-system, sans-serif;
                        background: #e5e7eb;
                        padding: 20px;
                    }
                    
                    .report-container {
                        max-width: 1100px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        overflow: hidden;
                    }
                    
                    /* Header */
                    .report-header {
                        background: linear-gradient(135deg, #1e3a5f 0%, #2c4a7a 100%);
                        color: white;
                        padding: 32px 40px;
                        position: relative;
                    }
                    
                    .report-header::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #d4d4ae, #c4c49a, #d4d4ae);
                    }
                    
                    .header-title {
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        letter-spacing: -0.5px;
                    }
                    
                    .header-subtitle {
                        font-size: 14px;
                        opacity: 0.8;
                        margin-bottom: 16px;
                    }
                    
                    .header-info {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 16px;
                        margin-top: 16px;
                        padding-top: 16px;
                        border-top: 1px solid rgba(255,255,255,0.2);
                        font-size: 12px;
                    }
                    
                    /* Secciones */
                    .section {
                        margin-bottom: 32px;
                        page-break-inside: avoid;
                    }
                    
                    .section-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: #1e3a5f;
                        border-left: 4px solid #d4d4ae;
                        padding-left: 16px;
                        margin-bottom: 20px;
                        margin-top: 8px;
                    }
                    
                    .section-title i {
                        margin-right: 8px;
                        color: #d4d4ae;
                    }
                    
                    /* Grids */
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 16px;
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .info-item {
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .info-label {
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #64748b;
                        margin-bottom: 4px;
                    }
                    
                    .info-value {
                        font-size: 14px;
                        font-weight: 500;
                        color: #1e293b;
                        word-break: break-word;
                    }
                    
                    .info-value code {
                        background: #f1f5f9;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-family: monospace;
                        font-size: 12px;
                    }
                    
                    /* Tablas */
                    .data-table {
                        width: 100%;
                        border-collapse: collapse;
                        background: #f8fafc;
                        border-radius: 12px;
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .data-table th {
                        background: #e2e8f0;
                        padding: 12px 16px;
                        text-align: left;
                        font-size: 12px;
                        font-weight: 600;
                        color: #1e293b;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .data-table td {
                        padding: 10px 16px;
                        font-size: 13px;
                        color: #334155;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    
                    .data-table tr:last-child td {
                        border-bottom: none;
                    }
                    
                    /* Badges */
                    .badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: 600;
                    }
                    
                    /* Footer */
                    .report-footer {
                        background: #f1f5f9;
                        padding: 20px 40px;
                        text-align: center;
                        font-size: 10px;
                        color: #64748b;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    /* Page break */
                    .page-break {
                        page-break-before: always;
                        margin-top: 20px;
                    }
                    
                    /* Responsive */
                    @media print {
                        body {
                            background: white;
                            padding: 0;
                            margin: 0;
                        }
                        .report-container {
                            box-shadow: none;
                            border-radius: 0;
                        }
                        .page-break {
                            page-break-before: always;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                    
                    /* Status colors */
                    .status-disponible { background: #d1fae5; color: #065f46; }
                    .status-asignado { background: #dbeafe; color: #1e40af; }
                    .status-mantenimiento { background: #ede9fe; color: #5b21b6; }
                    .status-reparacion { background: #fed7aa; color: #9a3412; }
                    .status-baja { background: #fee2e2; color: #991b1b; }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <!-- HEADER -->
                    <div class="report-header">
                        <div class="header-title">REPORTE DE ACTIVO TI</div>
                        <div class="header-subtitle">Sistema de Gestión de Activos - Gallos Mármol</div>
                        <div class="header-info">
                            <div><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-ES')}</div>
                            <div><strong>Generado por:</strong> ${creadorInfo.nombre || 'Sistema'}</div>
                            <div><strong>Código de activo:</strong> ${activo.codigo_activo || 'N/A'}</div>
                            <div><strong>ID interno:</strong> ${activo.id.substring(0, 8)}...</div>
                        </div>
                    </div>
                    
                    <div style="padding: 32px 40px;">
                        <!-- SECCIÓN 1: INFORMACIÓN GENERAL -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>📋</i> INFORMACIÓN GENERAL
                            </h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Nombre del Activo</span>
                                    <span class="info-value">${activo.nombre || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Código</span>
                                    <span class="info-value"><code>${activo.codigo_activo || 'N/A'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Tipo</span>
                                    <span class="info-value">${activo.tipos_activo?.nombre || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Estado</span>
                                    <span class="info-value">
                                        <span class="badge status-${(activo.estado || 'DISPONIBLE').toLowerCase()}">
                                            ${estadoMap[activo.estado]?.label || activo.estado || 'DISPONIBLE'}
                                        </span>
                                    </span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Empresa</span>
                                    <span class="info-value">${activo.empresa?.nombre || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">RUC</span>
                                    <span class="info-value">${activo.empresa?.ruc || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Ubicación</span>
                                    <span class="info-value">${activo.ubicacion?.nombre || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Tipo de Ubicación</span>
                                    <span class="info-value">${activo.ubicacion?.tipo || 'N/A'}</span>
                                </div>
                                ${activo.ubicacion?.descripcion ? `
                                <div class="info-item">
                                    <span class="info-label">Detalle Ubicación</span>
                                    <span class="info-value">${activo.ubicacion.descripcion}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- SECCIÓN 2: CARACTERÍSTICAS TÉCNICAS -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>🔧</i> CARACTERÍSTICAS TÉCNICAS
                            </h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Marca</span>
                                    <span class="info-value">${infoGeneral?.marca?.nombre || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Modelo</span>
                                    <span class="info-value">${infoGeneral?.modelo || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Número de Serie</span>
                                    <span class="info-value"><code>${infoGeneral?.numero_serie || 'N/A'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Año de Fabricación</span>
                                    <span class="info-value">${infoGeneral?.ano_fabricacion || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Condición Física</span>
                                    <span class="info-value">${condicionMap[infoGeneral?.condicion_fisica] || infoGeneral?.condicion_fisica || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Fecha de Compra</span>
                                    <span class="info-value">${formatearFecha(infoGeneral?.fecha_compra)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Garantía hasta</span>
                                    <span class="info-value">${formatearFecha(infoGeneral?.fecha_garantia)}</span>
                                </div>
                                ${infoGeneral?.marca?.descripcion ? `
                                <div class="info-item">
                                    <span class="info-label">Descripción Marca</span>
                                    <span class="info-value">${infoGeneral.marca.descripcion}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- SECCIÓN 3: ESPECIFICACIONES TÉCNICAS (EAV) -->
                        ${especificaciones && especificaciones.length > 0 ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i>⚙️</i> ESPECIFICACIONES TÉCNICAS
                            </h2>
                            <div class="info-grid">
                                ${especificaciones.map(esp => {
                                    let valorMostrado = '';
                                    if (esp.valor_texto) valorMostrado = esp.valor_texto;
                                    else if (esp.valor_numero !== null) valorMostrado = esp.valor_numero + (esp.atributo?.unidad_medida ? ' ' + esp.atributo.unidad_medida : '');
                                    else if (esp.valor_booleano !== null) valorMostrado = esp.valor_booleano ? 'Sí' : 'No';
                                    else if (esp.valor_fecha) valorMostrado = formatearFecha(esp.valor_fecha);
                                    return `
                                        <div class="info-item">
                                            <span class="info-label">${esp.atributo?.nombre_atributo || 'Atributo'}</span>
                                            <span class="info-value">${valorMostrado}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- SECCIÓN 4: CONFIGURACIÓN DE RED -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>🌐</i> CONFIGURACIÓN DE RED
                            </h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Hostname</span>
                                    <span class="info-value"><code>${configRed?.hostname || 'No configurado'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Dirección IP</span>
                                    <span class="info-value"><code>${configRed?.ipv4_direccion || 'No configurada'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Tipo de IP</span>
                                    <span class="info-value">${configRed?.ipv4_tipo || 'No especificado'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Máscara de Red</span>
                                    <span class="info-value"><code>${configRed?.ipv4_mascara || 'No configurada'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Gateway</span>
                                    <span class="info-value"><code>${configRed?.ipv4_puerta_enlace || 'No configurado'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">MAC Address</span>
                                    <span class="info-value"><code>${configRed?.mac_direccion || 'No configurada'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">DNS Primario</span>
                                    <span class="info-value"><code>${configRed?.dns_primario || 'No configurado'}</code></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">DNS Secundario</span>
                                    <span class="info-value"><code>${configRed?.dns_secundario || 'No configurado'}</code></span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- SECCIÓN 5: SOFTWARE INSTALADO -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>💻</i> SOFTWARE INSTALADO
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(${softwareInstalado?.length || 0} registros)</span>
                            </h2>
                            ${softwareInstalado && softwareInstalado.length > 0 ? `
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Software</th>
                                            <th>Fabricante</th>
                                            <th>Versión</th>
                                            <th>Arquitectura</th>
                                            <th>Fecha Instalación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${softwareInstalado.map(sw => `
                                            <tr>
                                                <td>${sw.software?.nombre || 'N/A'}</td>
                                                <td>${sw.software?.fabricante || 'N/A'}</td>
                                                <td>${sw.version_instalada || 'N/A'}</td>
                                                <td>${sw.arquitectura_instalada || 'N/A'}</td>
                                                <td>${formatearFecha(sw.fecha_instalacion)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center;">No hay software instalado registrado</p>'}
                        </div>
                        
                        <!-- SECCIÓN 6: CREDENCIALES -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>🔑</i> CREDENCIALES
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(${credenciales?.length || 0} registros)</span>
                            </h2>
                            ${credenciales && credenciales.length > 0 ? `
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Usuario</th>
                                            <th>Correo</th>
                                            <th>Administrador</th>
                                            <th>Principal</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${credenciales.map(c => `
                                            <tr>
                                                <td>${c.tipo === 'WINDOWS' ? 'Windows' : c.tipo === 'CORREO' ? 'Correo' : 'Otro'}</td>
                                                <td><code>${c.dominio ? `${c.dominio}\\` : ''}${c.usuario}</code></td>
                                                <td>${c.correo || 'N/A'}</td>
                                                <td>${c.es_administrador ? '✓ Sí' : 'No'}</td>
                                                <td>${c.es_principal ? '⭐ Sí' : 'No'}</td>
                                                <td><span class="badge ${c.activo ? 'status-disponible' : ''}" style="${!c.activo ? 'background:#f1f5f9; color:#64748b;' : ''}">${c.activo ? 'Activa' : 'Inactiva'}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center;">No hay credenciales registradas</p>'}
                        </div>
                        
                        <!-- SECCIÓN 7: ACCESOS REMOTOS -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>🌐</i> ACCESOS REMOTOS
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(${accesosRemotos?.length || 0} registros)</span>
                            </h2>
                            ${accesosRemotos && accesosRemotos.length > 0 ? `
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID/Puesto</th>
                                            <th>Perfil</th>
                                            <th>Observaciones</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${accesosRemotos.map(a => `
                                            <tr>
                                                <td><code>${a.puesto_trabajo || 'N/A'}</code></td>
                                                <td>${a.perfil_nombre || 'N/A'}</td>
                                                <td>${a.observaciones || '-'}</td>
                                                <td><span class="badge ${a.activo ? 'status-disponible' : ''}" style="${!a.activo ? 'background:#f1f5f9; color:#64748b;' : ''}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center;">No hay accesos remotos configurados</p>'}
                        </div>
                        
                        <!-- SECCIÓN 8: TAREAS DE RESPALDO -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>💾</i> TAREAS DE RESPALDO
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(${tareasRespaldo?.length || 0} registros)</span>
                            </h2>
                            ${tareasRespaldo && tareasRespaldo.length > 0 ? `
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Tipo</th>
                                            <th>Origen</th>
                                            <th>Destino</th>
                                            <th>Horario</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${tareasRespaldo.map(t => {
                                            const tipoRespaldoMap = { 'COMPLETO': 'Completo', 'INCREMENTAL': 'Incremental', 'DIFERENCIAL': 'Diferencial' };
                                            const tipoHorarioMap = { 'MANUAL': 'Manual', 'UNA_VEZ': 'Una vez', 'DIARIO': 'Diario', 'SEMANAL': 'Semanal', 'MENSUAL': 'Mensual', 'ANUAL': 'Anual' };
                                            return `
                                                <tr>
                                                    <td>${t.nombre_tarea || 'N/A'}</td>
                                                    <td>${tipoRespaldoMap[t.tipo_respaldo] || t.tipo_respaldo}</td>
                                                    <td><code style="font-size: 11px;">${t.origen || 'N/A'}</code></td>
                                                    <td><code style="font-size: 11px;">${t.destino || 'N/A'}</code></td>
                                                    <td>${tipoHorarioMap[t.tipo_horario] || t.tipo_horario}${t.hora_ejecucion ? ` ${t.hora_ejecucion.substring(0,5)}` : ''}</td>
                                                    <td><span class="badge ${t.activo ? 'status-disponible' : ''}" style="${!t.activo ? 'background:#f1f5f9; color:#64748b;' : ''}">${t.activo ? 'Activa' : 'Inactiva'}</span></td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center;">No hay tareas de respaldo configuradas</p>'}
                        </div>
                        
                        <!-- PAGE BREAK - ASIGNACIÓN ACTUAL Y HISTORIAL -->
                        <div class="page-break"></div>
                        
                        <!-- SECCIÓN 9: ASIGNACIÓN ACTUAL -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>👤</i> ASIGNACIÓN ACTUAL
                            </h2>
                            ${asignacionActual ? `
                                <div class="info-grid" style="background: #eff6ff;">
                                    <div class="info-item">
                                        <span class="info-label">Empleado</span>
                                        <span class="info-value"><strong>${asignacionActual.empleado?.nombre_completo || 'N/A'}</strong></span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Puesto</span>
                                        <span class="info-value">${asignacionActual.empleado?.puesto || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Área</span>
                                        <span class="info-value">${asignacionActual.empleado?.areas?.nombre || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Correo</span>
                                        <span class="info-value">${asignacionActual.empleado?.correo || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Celular</span>
                                        <span class="info-value">${asignacionActual.empleado?.celular || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Fecha Asignación</span>
                                        <span class="info-value">${formatearFecha(asignacionActual.fecha_asignacion)}</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Días Asignado</span>
                                        <span class="info-value">${Math.ceil((new Date() - new Date(asignacionActual.fecha_asignacion)) / (1000 * 60 * 60 * 24))} días</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label">Asignado por</span>
                                        <span class="info-value">${asignacionActual.asignador?.correo || 'N/A'}</span>
                                    </div>
                                    ${asignacionActual.observaciones ? `
                                    <div class="info-item">
                                        <span class="info-label">Observaciones</span>
                                        <span class="info-value">${asignacionActual.observaciones}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            ` : '<p style="color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center;">No hay asignación activa</p>'}
                        </div>
                        
                        <!-- SECCIÓN 10: HISTORIAL DE ASIGNACIONES -->
                        ${historialAsignaciones && historialAsignaciones.length > 0 ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i>📜</i> HISTORIAL DE ASIGNACIONES
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(últimos ${Math.min(10, historialAsignaciones.length)} registros)</span>
                            </h2>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Fecha Asignación</th>
                                        <th>Fecha Devolución</th>
                                        <th>Estado</th>
                                        <th>Asignado por</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${historialAsignaciones.map(a => `
                                        <tr>
                                            <td>${a.empleado?.nombre_completo || 'N/A'}</td>
                                            <td>${formatearFecha(a.fecha_asignacion)}</td>
                                            <td>${a.fecha_devolucion ? formatearFecha(a.fecha_devolucion) : 'Pendiente'}</td>
                                            <td><span class="badge ${a.estado === 'ACTIVA' ? 'status-disponible' : ''}" style="${a.estado !== 'ACTIVA' ? 'background:#f1f5f9; color:#64748b;' : ''}">${a.estado}</span></td>
                                            <td>${a.asignador?.correo || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- SECCIÓN 11: MANTENIMIENTOS -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>🔧</i> MANTENIMIENTOS
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(${mantenimientos?.length || 0} registros)</span>
                            </h2>
                            ${mantenimientos && mantenimientos.length > 0 ? `
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Fecha Solicitud</th>
                                            <th>Descripción</th>
                                            <th>Resultado</th>
                                            <th>Técnico</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${mantenimientos.map(m => `
                                            <tr>
                                                <td>${m.tipo || 'N/A'}</td>
                                                <td>${formatearFecha(m.fecha_solicitud)}</td>
                                                <td>${m.descripcion?.substring(0, 60) || 'N/A'}${m.descripcion?.length > 60 ? '...' : ''}</td>
                                                <td><span class="badge ${m.resultado === 'EXITOSO' ? 'status-disponible' : m.resultado === 'PENDIENTE' ? '' : ''}" style="${m.resultado === 'PENDIENTE' ? 'background:#fef3c7; color:#92400e;' : m.resultado === 'NO_REPARADO' ? 'background:#fee2e2; color:#991b1b;' : ''}">${m.resultado || 'PENDIENTE'}</span></td>
                                                <td>${m.tecnico_asignado || 'N/A'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #94a3b8; padding: 16px; background: #f8fafc; border-radius: 12px; text-align: center;">No hay mantenimientos registrados</p>'}
                        </div>
                        
                        <!-- SECCIÓN 12: HISTORIAL DE ESTADOS -->
                        ${historialEstados && historialEstados.length > 0 ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i>📊</i> HISTORIAL DE ESTADOS
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(últimos ${Math.min(10, historialEstados.length)} registros)</span>
                            </h2>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Cambio</th>
                                        <th>Motivo</th>
                                        <th>Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${historialEstados.map(h => `
                                        <tr>
                                            <td>${formatearFechaHora(h.fecha_cambio)}</td>
                                            <td>${h.estado_anterior ? `${h.estado_anterior} → ` : ''}${h.estado_nuevo}</td>
                                            <td>${h.motivo || '-'}</td>
                                            <td>${h.cambiado_por?.correo || 'Sistema'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- SECCIÓN 13: HISTORIAL DE UBICACIONES -->
                        ${historialUbicaciones && historialUbicaciones.length > 0 ? `
                        <div class="section">
                            <h2 class="section-title">
                                <i>📍</i> HISTORIAL DE UBICACIONES
                                <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">(últimos ${Math.min(10, historialUbicaciones.length)} registros)</span>
                            </h2>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Ubicación Anterior</th>
                                        <th>Ubicación Nueva</th>
                                        <th>Motivo</th>
                                        <th>Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${historialUbicaciones.map(h => `
                                        <tr>
                                            <td>${formatearFechaHora(h.fecha_cambio)}</td>
                                            <td>${h.ubicacion_anterior?.nombre || 'Sin ubicación'}</td>
                                            <td>${h.ubicacion_nueva?.nombre || 'No especificada'}</td>
                                            <td>${h.motivo || '-'}</td>
                                            <td>${h.cambiado_por?.correo || 'Sistema'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        ` : ''}
                        
                        <!-- SECCIÓN 14: AUDITORÍA COMPLETA -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>📜</i> AUDITORÍA COMPLETA
                            </h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Creado el</span>
                                    <span class="info-value">${formatearFechaHora(activo.creado_el)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Creado por</span>
                                    <span class="info-value">${creadorInfo.nombre} ${creadorInfo.correo ? `(${creadorInfo.correo})` : ''}</span>
                                </div>
                                ${modificadorInfo ? `
                                <div class="info-item">
                                    <span class="info-label">Modificado el</span>
                                    <span class="info-value">${formatearFechaHora(activo.modificado_el)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Modificado por</span>
                                    <span class="info-value">${modificadorInfo.nombre} ${modificadorInfo.correo ? `(${modificadorInfo.correo})` : ''}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <details style="margin-top: 16px; font-size: 11px; color: #64748b;">
                                <summary style="cursor: pointer; font-weight: 500; padding: 8px; background: #f1f5f9; border-radius: 8px;">📋 Ver IDs de referencia para soporte técnico</summary>
                                <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; font-family: monospace; font-size: 10px;">
                                    <p><strong>ID Activo:</strong> ${activo.id}</p>
                                    <p><strong>ID Tipo:</strong> ${activo.tipo_activo_id || 'N/A'}</p>
                                    <p><strong>ID Empresa:</strong> ${activo.empresa_id || 'N/A'}</p>
                                    <p><strong>ID Ubicación:</strong> ${activo.ubicacion_id || 'N/A'}</p>
                                    <p><strong>Creado por ID:</strong> ${activo.creado_por || 'N/A'}</p>
                                    <p><strong>Modificado por ID:</strong> ${activo.modificado_por || 'N/A'}</p>
                                    ${especificaciones && especificaciones.length > 0 ? `
                                    <p class="mt-2"><strong>IDs de Especificaciones:</strong></p>
                                    ${especificaciones.map(esp => `<p class="pl-2">- ${esp.atributo?.nombre_atributo}: ${esp.id}</p>`).join('')}
                                    ` : ''}
                                </div>
                            </details>
                        </div>
                        
                        <!-- NOTAS Y FIRMAS -->
                        <div class="section">
                            <h2 class="section-title">
                                <i>📝</i> NOTAS Y FIRMAS
                            </h2>
                            <div style="display: flex; justify-content: space-between; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px;">
                                <div style="text-align: center; flex: 1;">
                                    <div style="border-top: 1px solid #cbd5e1; width: 200px; margin: 0 auto 8px auto; padding-top: 8px;"></div>
                                    <p style="font-size: 11px; color: #64748b;">Responsable de TI</p>
                                </div>
                                <div style="text-align: center; flex: 1;">
                                    <div style="border-top: 1px solid #cbd5e1; width: 200px; margin: 0 auto 8px auto; padding-top: 8px;"></div>
                                    <p style="font-size: 11px; color: #64748b;">Usuario/Empleado</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- FOOTER -->
                    <div class="report-footer">
                        <p>Este reporte es generado automáticamente por el Sistema de Gestión de Activos TI - Gallos Mármol</p>
                        <p>Reporte generado el ${new Date().toLocaleString('es-ES')} - Página <span class="pageNumber"></span> de <span class="totalPages"></span></p>
                        <p style="margin-top: 8px;">Para cualquier consulta sobre este reporte, contactar a soporte@gallosmarmol.com.pe</p>
                    </div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="background: #1e3a5f; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; margin: 0 8px;">
                        <i class="fas fa-print"></i> Imprimir / Guardar PDF
                    </button>
                    <button onclick="window.close()" style="background: #64748b; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; margin: 0 8px;">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </body>
            </html>
        `;

        // Abrir el reporte en una nueva ventana para vista previa e impresión
        const ventanaReporte = window.open('', '_blank');
        ventanaReporte.document.write(html);
        ventanaReporte.document.close();
        
        // Agregar numeración de páginas después de que se cargue el contenido
        setTimeout(() => {
            try {
                const paginas = ventanaReporte.document.querySelectorAll('.page-break');
                const totalPaginas = paginas.length + 1;
                
                // Función para actualizar números de página
                const actualizarNumerosPagina = () => {
                    let contador = 1;
                    const elementos = ventanaReporte.document.querySelectorAll('.report-container > div:not(.report-header):not(.report-footer)');
                    
                    // Esto es más complejo, se manejará con CSS en la impresión
                    ventanaReporte.document.querySelectorAll('.pageNumber').forEach(el => {
                        el.textContent = contador;
                    });
                    ventanaReporte.document.querySelectorAll('.totalPages').forEach(el => {
                        el.textContent = totalPaginas;
                    });
                };
                
                actualizarNumerosPagina();
            } catch (e) {
                console.warn('Error al numerar páginas:', e);
            }
        }, 100);
        
        mostrarAlerta('Éxito', 'Reporte generado correctamente. Puede imprimirlo o guardarlo como PDF.', 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error generando reporte:', error);
        mostrarAlerta('Error', 'No se pudo generar el reporte: ' + error.message, 'error');
    }
};

window.generarEtiquetaActivo = async function(activoId) {
    mostrarLoading('Generando etiqueta...');
    try {
        const { data: activo, error } = await window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (id, nombre),
                info_general (
                    id,
                    marca_id,
                    modelo,
                    numero_serie,
                    marcas (id, nombre)
                ),
                empresa:empresa_id (id, nombre, ruc)
            `)
            .eq('id', activoId)
            .single();
        if (error) throw error;

        let nombreUsuario = 'Sistema';
        if (usuarioActual && usuarioActual.id) {
            const { data: usuario } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .eq('id', usuarioActual.id)
                .single();
            if (usuario?.empleado_id) {
                const { data: empleado } = await window.supabaseClient
                    .from('empleados')
                    .select('nombre_completo')
                    .eq('id', usuario.empleado_id)
                    .single();
                nombreUsuario = empleado?.nombre_completo || usuario.correo || 'Usuario';
            } else {
                nombreUsuario = usuario?.correo || 'Usuario';
            }
        }

        const empresa = activo.empresa?.nombre || 'GALLOS MÁRMOL';
        const tipo = activo.tipos_activo?.nombre || 'N/A';
        const marca = activo.info_general?.marcas?.nombre || 'N/A';
        const modelo = activo.info_general?.modelo || 'N/A';
        const serie = activo.info_general?.numero_serie || 'N/A';
        const fechaGeneracion = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // ========== DETECTAR TIPO DE ACTIVO PARA TAMAÑO DE ETIQUETA ==========
        const tipoLower = tipo.toLowerCase();
        let anchoCm, altoCm;
        let formatoCompacto = false; // Para RAM y componentes muy pequeños
        
        // ============================================
        // RAM y componentes ultra pequeños: 2cm × 1cm (formato EXTRA compacto)
        // ============================================
        if (tipoLower.includes('ram') || tipoLower.includes('ssd') || 
            tipoLower.includes('memoria') || tipoLower.includes('cpu') || 
            tipoLower.includes('procesador') || tipoLower.includes('m.2') || 
            tipoLower.includes('nvme') || tipoLower.includes('chip')) {
            anchoCm = 2;
            altoCm = 1;
            formatoCompacto = true;
        }
        
        // ============================================
        // PERIFÉRICOS PEQUEÑOS: 5cm × 3cm
        // ============================================
        else if (tipoLower.includes('mouse') || tipoLower.includes('webcam') ||
                 tipoLower.includes('cámara') || tipoLower.includes('camara') ||
                 tipoLower.includes('auricular') || tipoLower.includes('headset') ||
                 tipoLower.includes('usb') || tipoLower.includes('adaptador')) {
            anchoCm = 5;
            altoCm = 3;
        }
        
        // ============================================
        // COMPONENTES MEDIANOS: 6cm × 3.5cm
        // ============================================
        else if (tipoLower.includes('disco') || tipoLower.includes('hdd') || 
                 tipoLower.includes('fuente') || tipoLower.includes('power') ||
                 tipoLower.includes('motherboard') || tipoLower.includes('placa') ||
                 tipoLower.includes('switch') || tipoLower.includes('router')) {
            anchoCm = 6;
            altoCm = 3.5;
        }
        
        // ============================================
        // EQUIPOS DE ESCRITORIO: 7cm × 4.5cm
        // ============================================
        else if (tipoLower.includes('monitor') || tipoLower.includes('impresora') ||
                 tipoLower.includes('printer') || tipoLower.includes('scanner') || tipoLower.includes('teclado') ||
                 tipoLower.includes('keyboard') || tipoLower.includes('proyector')) {
            anchoCm = 7;
            altoCm = 4.5;
        }
        
        // ============================================
        // COMPUTADORAS (PORTÁTILES Y ESCRITORIO): 7.5cm × 5cm
        // ============================================
        else if (tipoLower.includes('laptop') || tipoLower.includes('notebook') ||
                 tipoLower.includes('desktop') || tipoLower.includes('computadora') ||
                 tipoLower.includes('pc') || tipoLower.includes('torre') ||
                 tipoLower.includes('servidor') || tipoLower.includes('workstation')) {
            anchoCm = 7.5;
            altoCm = 5;
        }
        
        // ============================================
        // POR DEFECTO: 2cm × 1cm (formato compacto) ← CAMBIADO
        // ============================================
        else {
            anchoCm = 2;
            altoCm = 1;
            formatoCompacto = true;  // ← Usar formato compacto por defecto
        }

        console.log(`📏 Etiqueta para "${tipo}": ${anchoCm}cm × ${altoCm}cm | Compacto: ${formatoCompacto}`);

        // ========== DIMENSIONES Y CONVERSIONES ==========
        const dpi = 300;
        const anchoPx = Math.round(anchoCm * dpi / 2.54);
        const altoPx = Math.round(altoCm * dpi / 2.54);
        
        const margenPx = Math.max(4, Math.round(0.1 * dpi / 2.54));
        const anchoPt = anchoCm * 72 / 2.54;
        const altoPt = altoCm * 72 / 2.54;

        const contenedor = document.createElement('div');
        contenedor.style.position = 'absolute';
        contenedor.style.left = '-9999px';
        contenedor.style.top = '-9999px';
        contenedor.style.width = `${anchoPx}px`;
        contenedor.style.height = `${altoPx}px`;
        contenedor.style.background = '#fff';
        contenedor.style.fontFamily = 'Arial, sans-serif';
        contenedor.style.boxSizing = 'border-box';
        contenedor.style.padding = `${margenPx}px`;

        // ============================================
        // FORMATO COMPACTO (RAM, SSD, CPU, y POR DEFECTO) - Solo Header, Código y Footer
        // ============================================
        if (formatoCompacto) {
            // Tamaños de fuente para formato ultra compacto
            const headerSize = 11;
            const codigoSize = 24;
            const footerSize = 9;
            
            contenedor.innerHTML = `
                <style>
                    .etiqueta-container {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        border: 1.5px solid #000;
                        background: #fff;
                        overflow: hidden;
                    }
                    .etiqueta-header {
                        text-align: center;
                        font-size: ${headerSize}px;
                        font-weight: bold;
                        padding: 4px 2px;
                        letter-spacing: 0.5px;
                        background: #fff;
                        color: #000;
                        white-space: nowrap;
                        overflow-x: hidden;
                        text-overflow: ellipsis;
                        flex-shrink: 0;
                    }
                    .etiqueta-body {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 1px 4px;
                    }
                    .etiqueta-codigo {
                        font-family: monospace;
                        font-size: ${codigoSize}px;
                        font-weight: bold;
                        text-align: center;
                        color: #000;
                        word-break: break-all;
                        margin-bottom:1px;
                    }
                    .etiqueta-footer {
                        font-size: ${footerSize}px;
                        padding: 1px 4px;
                        display: flex;
                        justify-content: space-between;
                        font-weight: 600;
                        background: #fff;
                        color: #000;
                        flex-shrink: 0;
                        margin-bottom:3px;
                        border-top: 1.5px solid #000;
                    }
                </style>
                <div class="etiqueta-container">
                    <div class="etiqueta-header" title="${empresa.toUpperCase()}">${empresa.toUpperCase().substring(0, 20)}</div>
                    <div class="etiqueta-body">
                        <div class="etiqueta-codigo">${activo.codigo_activo || 'N/A'}</div>
                    </div>
                    <div class="etiqueta-footer">
                        <span>${nombreUsuario.substring(0, 30)}</span>
                        <span>${fechaGeneracion}</span>
                    </div>
                </div>
            `;
        } 
        
        // ============================================
        // FORMATO NORMAL (Periféricos, Discos, Equipos grandes)
        // ============================================
        else {
            // Calcular tamaños de fuente según el tamaño de la etiqueta
            const factorEscala = Math.min(1, Math.max(0.5, anchoCm / 7.5));
            
            const headerSize = Math.max(14, Math.round(28 * factorEscala));
            const labelSize = Math.max(11, Math.round(24 * factorEscala));
            const valueSize = Math.max(10, Math.round(22 * factorEscala));
            const monospaceSize = Math.max(9, Math.round(21 * factorEscala));
            const footerSize = Math.max(9, Math.round(20 * factorEscala));
            const labelMinWidth = Math.max(55, Math.round(90 * factorEscala));
            
            const paddingBody = Math.max(3, Math.round(6 * factorEscala));
            const gapSize = Math.max(4, Math.round(8 * factorEscala));
            const borderWidth = Math.max(1.5, Math.round(2.5 * factorEscala));
            
            contenedor.innerHTML = `
                <style>
                    .etiqueta-container {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        border: ${borderWidth}px solid #000;
                        background: #fff;
                        overflow: hidden;
                    }
                    .etiqueta-header {
                        text-align: center;
                        font-size: ${headerSize}px;
                        font-weight: bold;
                        padding: ${Math.max(3, Math.round(6 * factorEscala))}px 2px;
                        letter-spacing: ${Math.max(0.5, Math.round(1.5 * factorEscala))}px;
                        background: #fff;
                        color: #000;
                        white-space: nowrap;
                        overflow-x: hidden;
                        text-overflow: ellipsis;
                        flex-shrink: 0;
                    }
                    .etiqueta-body {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-evenly;
                        padding: ${paddingBody}px ${Math.max(5, Math.round(8 * factorEscala))}px;
                    }
                    .etiqueta-row {
                        display: flex;
                        align-items: baseline;
                        gap: ${gapSize}px;
                    }
                    .etiqueta-label {
                        font-weight: bold;
                        color: #000;
                        font-size: ${labelSize}px;
                        min-width: ${labelMinWidth}px;
                        flex-shrink: 0;
                    }
                    .etiqueta-value {
                        color: #000;
                        word-break: break-word;
                        font-weight: 600;
                        font-size: ${valueSize}px;
                        line-height: 1.2;
                    }
                    .etiqueta-value-monospace {
                        font-family: monospace;
                        font-size: ${monospaceSize}px;
                        font-weight: bold;
                        letter-spacing: 0.3px;
                    }
                    .etiqueta-footer {
                        border-top: ${borderWidth}px solid #000;
                        font-size: ${footerSize}px;
                        padding: ${Math.max(3, Math.round(6 * factorEscala))}px ${Math.max(5, Math.round(10 * factorEscala))}px;
                        display: flex;
                        justify-content: space-between;
                        font-weight: 600;
                        background: #fff;
                        color: #000;
                        flex-shrink: 0;
                    }
                </style>
                <div class="etiqueta-container">
                    <div class="etiqueta-header" title="${empresa.toUpperCase()}">${empresa.toUpperCase().substring(0, 30)}</div>
                    <div class="etiqueta-body">
                        <div class="etiqueta-row">
                            <span class="etiqueta-label">CÓDIGO:</span>
                            <span class="etiqueta-value">${activo.codigo_activo || 'N/A'}</span>
                        </div>
                        <div class="etiqueta-row">
                            <span class="etiqueta-label">TIPO:</span>
                            <span class="etiqueta-value">${tipo.substring(0, 30)}</span>
                        </div>
                        <div class="etiqueta-row">
                            <span class="etiqueta-label">MARCA:</span>
                            <span class="etiqueta-value">${marca}</span>
                        </div>
                        <div class="etiqueta-row">
                            <span class="etiqueta-label">MODELO:</span>
                            <span class="etiqueta-value">${modelo.substring(0, 30)}</span>
                        </div>
                        <div class="etiqueta-row">
                            <span class="etiqueta-label">SERIE:</span>
                            <span class="etiqueta-value">${serie.substring(0, 40)}</span>
                        </div>
                    </div>
                    <div class="etiqueta-footer">
                        <span>${nombreUsuario.substring(0, 30)}</span>
                        <span>${fechaGeneracion}</span>
                    </div>
                </div>
            `;
        }

        document.body.appendChild(contenedor);
        await new Promise(r => setTimeout(r, 200));

        const canvas = await html2canvas(contenedor, { 
            scale: 3, 
            backgroundColor: '#ffffff', 
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF({ 
            orientation: 'landscape', 
            unit: 'pt', 
            format: [anchoPt, altoPt] 
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, anchoPt, altoPt);
        document.body.removeChild(contenedor);
        
        ocultarLoading();
        pdf.save(`etiqueta_${activo.codigo_activo || activo.id}.pdf`);
        
        const mensajeTamanio = formatoCompacto ? `${anchoCm}cm × ${altoCm}cm (formato compacto)` : `${anchoCm}cm × ${altoCm}cm`;
        mostrarAlerta('Éxito', `Etiqueta generada (${mensajeTamanio})`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error generando etiqueta:', error);
        mostrarAlerta('Error', error.message || 'No se pudo generar la etiqueta', 'error');
    }
};

// ==================== FUNCIONES DE INICIALIZACIÓN ====================
async function cargarDatosIniciales() {
    console.log('Cargando datos iniciales...');
}

// ==================== INICIALIZACIÓN DEL SISTEMA ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando sistema Gallos Mármol...');
    
    // ============================================
    // VERIFICAR SI ES LANDING PAGE
    // ============================================
    // Esperar un momento para que landing.js tenga tiempo de ejecutarse
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verificar si ya es una landing page (marcado por landing.js)
    if (window.esLandingPage === true) {
        console.log('🚫 Landing page detectada por variable, sistema no iniciado');
        return;
    }
    
    // Verificar si la URL contiene parámetro de producto (?producto=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const productoParam = urlParams.get('producto');
    if (productoParam) {
        console.log('🚫 Parámetro producto detectado, sistema no iniciado');
        return;
    }
    
    // Verificar si la ruta es /producto/[slug]
    if (window.location.pathname.startsWith('/producto/')) {
        console.log('🚫 Ruta /producto/ detectada, sistema no iniciado');
        return;
    }
    
    // Verificar si la ruta contiene #/producto/[slug]
    if (window.location.hash.startsWith('#/producto/')) {
        console.log('🚫 Hash #/producto/ detectado, sistema no iniciado');
        return;
    }
    
    // Si llegamos aquí, cargar el sistema normal
    console.log('✅ No es landing page, iniciando sistema normal');
    
    const saved = localStorage.getItem('usuario_actual');
    if (saved) {
        try {
            const datosSesion = JSON.parse(saved);
            const { data: usuario } = await window.supabaseClient
                .from('usuarios')
                .select('*, empleados(id, nombre_completo, puesto)')
                .eq('id', datosSesion.id)
                .single();
            if (usuario && usuario.activo) {
                usuarioActual = usuario;
                document.getElementById('userName').textContent = usuario.empleados?.nombre_completo || usuario.correo;
                document.getElementById('userEmail').textContent = usuario.correo;
                document.getElementById('userPuesto').textContent = usuario.empleados?.puesto || 'Usuario';
                document.getElementById('loginContainer').classList.add('hidden');
                document.getElementById('appContainer').classList.remove('hidden');
                const permisos = await obtenerPermisosUsuario(usuario.id);
                const sidebarNav = document.getElementById('sidebarNav');
                
                if (sidebarNav) {
                    let sidebarHtml = '';
                    
                    // Para empleados, verificar permiso específico de registro de clientes
                    if (permisos.rol === 'EMPLEADO') {
                        let puedeRegistrar = false;
                        if (permisos.empleadoId) {
                            const { data: empleado } = await window.supabaseClient
                                .from('empleados')
                                .select('puede_registrar_clientes_outlet')
                                .eq('id', permisos.empleadoId)
                                .single();
                            puedeRegistrar = empleado?.puede_registrar_clientes_outlet || false;
                        }
                        sidebarHtml = generarSidebarPorRol('EMPLEADO', puedeRegistrar);
                    } else {
                        sidebarHtml = generarSidebarPorRol(permisos.rol);
                    }
                    
                    sidebarNav.innerHTML = sidebarHtml;
                }
                
                await cargarVista('dashboard');
            } else {
                localStorage.removeItem('usuario_actual');
            }
        } catch (e) {
            console.error('Error al recuperar sesión:', e);
            localStorage.removeItem('usuario_actual');
        }
    }
    
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) menuToggle.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    
    console.log('✅ Sistema inicializado correctamente');

    inicializarFiltrosActivos();

    // Actualizar badge de solicitudes pendientes periódicamente
    setInterval(async () => {
        if (usuarioActual) {
            await actualizarBadgeSolicitudesPendientes();
            
            // Actualizar badge de nuevas cotizaciones para vendedores
            if (typeof window.actualizarBadgeNuevosLeads === 'function') {
                await window.actualizarBadgeNuevosLeads();
            }
        }
    }, 30000); // Cada 30 segundos
});

console.log('✅ Script.js cargado completamente');