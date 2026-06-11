// ==================== ACTIVOS - VISTA OPTIMIZADA ====================

// ==================== VARIABLES GLOBALES ====================
let vistaActivosActual = 'cards'; // 'tabla' o 'cards' - por defecto cards como consumibles
let paginaActualActivos = 1;
const ITEMS_POR_PAGINA = 20; // 20 activos por página
let totalActivosCount = 0;
let totalPaginasActivos = 1;
let activosCache = [];
let filtrosActivos = {};
let timeoutFiltroActivos = null;

// Cache para datos estáticos (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;

// ==================== FUNCIÓN DE CACHÉ ====================
async function cargarConCache(key, fetchFunction) {
    try {
        const cached = localStorage.getItem(`activos_cache_${key}`);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                console.log(`📦 Usando caché para: ${key}`);
                return data;
            }
        }
        
        console.log(`🔄 Cargando desde servidor: ${key}`);
        const result = await fetchFunction();
        
        if (!result.error && result.data) {
            localStorage.setItem(`activos_cache_${key}`, JSON.stringify({
                data: result.data,
                timestamp: Date.now()
            }));
        }
        
        return result.data;
    } catch (error) {
        console.error(`Error en caché para ${key}:`, error);
        const result = await fetchFunction();
        return result.data;
    }
}

// ==================== CONSTRUIR QUERY ÓPTIMA ====================
async function construirQueryActivos(filtros = {}, pagina = 1) {
    const desde = (pagina - 1) * ITEMS_POR_PAGINA;
    const hasta = desde + ITEMS_POR_PAGINA - 1;
    
    let query = window.supabaseClient
        .from('activos')
        .select(`
            id,
            nombre,
            codigo_activo,
            estado,
            creado_el,
            modificado_el,
            tipo_activo_id,
            empresa_id,
            ubicacion_id,
            tipos_activo!tipo_activo_id (id, nombre),
            info_general (
                id,
                marca_id,
                modelo,
                numero_serie,
                ano_fabricacion,
                condicion_fisica,
                fecha_compra,
                fecha_garantia,
                marcas!marca_id (id, nombre)
            ),
            ubicaciones!ubicacion_id (id, nombre, descripcion, tipo),
            empresas!empresa_id (id, nombre, ruc)
        `, { count: 'exact' })
        .range(desde, hasta)
        .order('creado_el', { ascending: false });
    
    // ============================================
    // FILTROS CON MÚLTIPLES VALORES (usando IN)
    // ============================================
    
    // Tipos de activo
    if (filtros.tipoIds && filtros.tipoIds.length > 0) {
        query = query.in('tipo_activo_id', filtros.tipoIds);
    }
    
    // Marcas
    if (filtros.marcaIds && filtros.marcaIds.length > 0) {
        query = query.in('info_general.marca_id', filtros.marcaIds);
    }
    
    // Estados
    if (filtros.estados && filtros.estados.length > 0) {
        query = query.in('estado', filtros.estados);
    }
    
    // Empresas
    if (filtros.empresaIds && filtros.empresaIds.length > 0) {
        query = query.in('empresa_id', filtros.empresaIds);
    }
    
    // Ubicaciones
    if (filtros.ubicacionIds && filtros.ubicacionIds.length > 0) {
        query = query.in('ubicacion_id', filtros.ubicacionIds);
    }
    
    // Condiciones
    if (filtros.condiciones && filtros.condiciones.length > 0) {
        query = query.in('info_general.condicion_fisica', filtros.condiciones);
    }
    
    // ============================================
    // FILTROS CON VALOR ÚNICO
    // ============================================
    
    if (filtros.ano && filtros.ano !== '') {
        query = query.eq('info_general.ano_fabricacion', parseInt(filtros.ano));
    }
    
    if (filtros.busqueda && filtros.busqueda !== '') {
        query = query.or(`nombre.ilike.%${filtros.busqueda}%,codigo_activo.ilike.%${filtros.busqueda}%`);
    }
    
    if (filtros.compraDesde && filtros.compraDesde !== '') {
        query = query.gte('info_general.fecha_compra', filtros.compraDesde);
    }
    
    if (filtros.compraHasta && filtros.compraHasta !== '') {
        query = query.lte('info_general.fecha_compra', filtros.compraHasta);
    }
    
    return query;
}

// ==================== BATCH LOADING ====================
async function cargarDatosRelacionadosEnLote(activosIds) {
    if (!activosIds || activosIds.length === 0) {
        return {
            asignacionesPorActivo: new Map(),
            softwareCount: new Map(),
            credencialesCount: new Map(),
            accesosCount: new Map(),
            respaldosCount: new Map(),
            especificacionesCount: new Map(),
            configuracionesRed: new Map()
        };
    }
    
    const [
        asignacionesRes,
        softwareRes,
        credencialesRes,
        accesosRes,
        respaldosRes,
        especificacionesRes,
        configuracionRedRes
    ] = await Promise.all([
        window.supabaseClient
            .from('asignaciones')
            .select(`*, empleado:empleado_id (id, nombre_completo, puesto, correo)`)
            .in('activo_id', activosIds)
            .eq('estado', 'ACTIVA'),
        
        window.supabaseClient
            .from('software_instalado')
            .select('activo_id, id')
            .in('activo_id', activosIds)
            .eq('estado', 'INSTALADO'),
        
        window.supabaseClient
            .from('credenciales')
            .select('activo_id, id')
            .in('activo_id', activosIds)
            .eq('activo', true),
        
        window.supabaseClient
            .from('accesos_remotos')
            .select('activo_id, id')
            .in('activo_id', activosIds)
            .eq('activo', true),
        
        window.supabaseClient
            .from('tareas_respaldo')
            .select('activo_id, id')
            .in('activo_id', activosIds)
            .eq('activo', true),
        
        window.supabaseClient
            .from('especificaciones_valores')
            .select('activo_id, id')
            .in('activo_id', activosIds),
        
        window.supabaseClient
            .from('configuracion_red')
            .select('*')
            .in('activo_id', activosIds)
    ]);
    
    // Procesar resultados
    const asignacionesPorActivo = new Map();
    asignacionesRes.data?.forEach(asig => {
        asignacionesPorActivo.set(asig.activo_id, asig);
    });
    
    const softwareCount = new Map();
    softwareRes.data?.forEach(sw => {
        softwareCount.set(sw.activo_id, (softwareCount.get(sw.activo_id) || 0) + 1);
    });
    
    const credencialesCount = new Map();
    credencialesRes.data?.forEach(cred => {
        credencialesCount.set(cred.activo_id, (credencialesCount.get(cred.activo_id) || 0) + 1);
    });
    
    const accesosCount = new Map();
    accesosRes.data?.forEach(acc => {
        accesosCount.set(acc.activo_id, (accesosCount.get(acc.activo_id) || 0) + 1);
    });
    
    const respaldosCount = new Map();
    respaldosRes.data?.forEach(res => {
        respaldosCount.set(res.activo_id, (respaldosCount.get(res.activo_id) || 0) + 1);
    });
    
    const especificacionesCount = new Map();
    especificacionesRes.data?.forEach(esp => {
        especificacionesCount.set(esp.activo_id, (especificacionesCount.get(esp.activo_id) || 0) + 1);
    });
    
    const configuracionesRed = new Map();
    configuracionRedRes.data?.forEach(config => {
        configuracionesRed.set(config.activo_id, config);
    });
    
    return {
        asignacionesPorActivo,
        softwareCount,
        credencialesCount,
        accesosCount,
        respaldosCount,
        especificacionesCount,
        configuracionesRed
    };
}

// ==================== GENERAR VISTA CARDS ACTIVOS ====================
function generarVistaCardsActivos(activos, datosRelacionados, soloLectura = false, esAdmin = false) {
    if (!activos || activos.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg col-span-full">
                    <i class="fas fa-boxes text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay activos registrados</p>
                    ${esAdmin ? `<button onclick="abrirModalNuevoActivo()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nuevo Activo
                    </button>` : ''}
                </div>`;
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="activosGrid">
            ${activos.map(activo => {
                const info = activo.info_general || {};
                const marca = info.marcas?.nombre || '';
                const modelo = info.modelo || '';
                const serie = info.numero_serie || '';
                const tipoNombre = activo.tipos_activo?.nombre || 'Tipo no especificado';
                
                const empresa = activo.empresas?.nombre || activo.empresa?.nombre || 'Sin empresa';
                const ubicacion = activo.ubicaciones?.nombre || activo.ubicacion?.nombre || 'Sin ubicación';
                const asignacion = datosRelacionados.asignacionesPorActivo.get(activo.id);
                
                let tituloActivo = activo.nombre || 'Sin nombre';
                if (marca && modelo && !tituloActivo.includes(marca)) {
                    tituloActivo = `${marca} ${modelo}`;
                } else if (marca && !tituloActivo.includes(marca)) {
                    tituloActivo = marca;
                }
                
                // Garantía
                let garantiaStatus = '', garantiaClass = '';
                if (info.fecha_garantia) {
                    const fechaGarantia = new Date(info.fecha_garantia);
                    const hoy = new Date();
                    const diasRestantes = Math.ceil((fechaGarantia - hoy) / (1000 * 60 * 60 * 24));
                    if (diasRestantes < 0) {
                        garantiaStatus = 'Vencida';
                        garantiaClass = 'text-red-600 bg-red-50';
                    } else if (diasRestantes < 30) {
                        garantiaStatus = `Vence en ${diasRestantes} días`;
                        garantiaClass = 'text-orange-600 bg-orange-50';
                    } else {
                        garantiaStatus = 'Vigente';
                        garantiaClass = 'text-green-600 bg-green-50';
                    }
                }
                
                return `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all">
                        <!-- Cabecera -->
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-bold text-primary text-base truncate" title="${tituloActivo}">
                                        <i class="fas fa-desktop mr-1"></i>${tituloActivo}
                                    </h3>
                                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                                        <span class="text-xs text-gray-500"><i class="fas fa-tag mr-1"></i>${tipoNombre}</span>
                                        <span class="text-xs text-gray-500"><i class="fas fa-code mr-1"></i>${activo.codigo_activo || 'Sin código'}</span>
                                    </div>
                                </div>
                                <span class="estado-badge estado-${activo.estado || 'DISPONIBLE'} text-xs px-2 py-1">
                                    ${activo.estado || 'DISPONIBLE'}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Cuerpo del card -->
                        <div class="p-3 space-y-3">
                            <!-- Información básica en grid compacto -->
                            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs bg-gray-50 p-2 rounded-lg">
                                <div class="flex items-center gap-1 col-span-2"><i class="fas fa-tag text-primary w-3"></i><span class="text-gray-600">Marca/Modelo:</span></div>
                                <div class="col-span-2 truncate"><span class="font-medium">${marca || 'N/A'} ${modelo || ''}</span></div>
                                
                                <div class="flex items-center gap-1"><i class="fas fa-barcode text-primary w-3"></i><span class="text-gray-600">Serie:</span></div>
                                <div class="truncate font-mono text-xs">${serie || 'N/A'}</div>
                                
                                <div class="flex items-center gap-1"><i class="fas fa-building text-primary w-3"></i><span class="text-gray-600">Empresa:</span></div>
                                <div class="truncate">${empresa}</div>
                                
                                <div class="flex items-center gap-1"><i class="fas fa-map-marker-alt text-primary w-3"></i><span class="text-gray-600">Ubicación:</span></div>
                                <div class="truncate">${ubicacion}</div>
                                
                                ${info.ano_fabricacion ? `<div class="flex items-center gap-1"><i class="fas fa-calendar-alt text-primary w-3"></i><span class="text-gray-600">Año:</span></div><div>${info.ano_fabricacion}</div>` : ''}
                                
                                ${garantiaStatus ? `<div class="flex items-center gap-1 ${garantiaClass} rounded px-1 col-span-2"><i class="fas fa-shield-alt"></i><span>Garantía: ${garantiaStatus}</span></div>` : ''}
                            </div>
                            
                            <!-- Empleado asignado con botón de devolver (solo admin) -->
                            <div class="border rounded-lg overflow-hidden">
                                <div class="bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 flex justify-between items-center">
                                    <span><i class="fas fa-user-check text-primary mr-1"></i>EMPLEADO ASIGNADO</span>
                                    ${!soloLectura && !asignacion && esAdmin ? `
                                        <button onclick="abrirAsignacionConActivo('${activo.id}')" 
                                                class="text-xs text-primary hover:underline flex items-center gap-1">
                                            <i class="fas fa-plus-circle"></i> Asignar
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="p-2">
                                    ${asignacion?.empleado ? `
                                        <div class="flex justify-between items-center">
                                            <div>
                                                <p class="text-sm font-medium text-primary">${asignacion.empleado.nombre_completo}</p>
                                                <p class="text-xs text-gray-500">${asignacion.empleado.puesto || ''} ${asignacion.empleado.correo ? `· ${asignacion.empleado.correo}` : ''}</p>
                                                <p class="text-xs text-gray-400">Desde: ${new Date(asignacion.fecha_asignacion).toLocaleDateString()}</p>
                                            </div>
                                            ${!soloLectura && esAdmin ? `
                                                <button onclick="devolverActivo('${asignacion.id}')" 
                                                        class="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors flex items-center gap-1">
                                                    <i class="fas fa-undo-alt"></i> Devolver
                                                </button>
                                            ` : ''}
                                        </div>
                                    ` : `
                                        <p class="text-xs text-gray-400 text-center py-2">
                                            <i class="fas fa-user-slash"></i> Sin empleado asignado
                                        </p>
                                    `}
                                </div>
                            </div>
                            
                            ${!soloLectura && esAdmin ? `
                                <!-- Botones de acciones rápidas (solo ADMIN) -->
                                <div class="grid grid-cols-4 gap-1">
                                    <button onclick="verSoftwarePorActivo('${activo.id}')" class="flex flex-col items-center p-1.5 rounded-lg hover:bg-indigo-50 transition-colors group" title="Ver software instalado">
                                        <i class="fas fa-code text-indigo-500 text-base"></i>
                                        <span class="text-xs font-semibold mt-0.5">${datosRelacionados.softwareCount.get(activo.id) || 0}</span>
                                        <span class="text-[10px] text-gray-400">Software</span>
                                    </button>
                                    <button onclick="verCredencialesPorActivo('${activo.id}')" class="flex flex-col items-center p-1.5 rounded-lg hover:bg-amber-50 transition-colors group" title="Ver credenciales">
                                        <i class="fas fa-key text-amber-500 text-base"></i>
                                        <span class="text-xs font-semibold mt-0.5">${datosRelacionados.credencialesCount.get(activo.id) || 0}</span>
                                        <span class="text-[10px] text-gray-400">Credenciales</span>
                                    </button>
                                    <button onclick="verAccesosPorActivo('${activo.id}')" class="flex flex-col items-center p-1.5 rounded-lg hover:bg-purple-50 transition-colors group" title="Ver accesos remotos">
                                        <i class="fas fa-network-wired text-purple-500 text-base"></i>
                                        <span class="text-xs font-semibold mt-0.5">${datosRelacionados.accesosCount.get(activo.id) || 0}</span>
                                        <span class="text-[10px] text-gray-400">Accesos</span>
                                    </button>
                                    <button onclick="verRespaldosPorActivo('${activo.id}')" class="flex flex-col items-center p-1.5 rounded-lg hover:bg-teal-50 transition-colors group" title="Ver tareas de respaldo">
                                        <i class="fas fa-database text-teal-500 text-base"></i>
                                        <span class="text-xs font-semibold mt-0.5">${datosRelacionados.respaldosCount.get(activo.id) || 0}</span>
                                        <span class="text-[10px] text-gray-400">Respaldos</span>
                                    </button>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-1">
                                    <button onclick="verTodasEspecificaciones('${activo.id}')" class="flex items-center justify-center gap-2 p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group">
                                        <i class="fas fa-microchip text-blue-600 text-sm"></i>
                                        <span class="text-xs font-medium text-blue-700">Especificaciones (${datosRelacionados.especificacionesCount.get(activo.id) || 0})</span>
                                    </button>
                                    <button onclick="abrirModalConfiguracionRed('${activo.id}')" class="flex items-center justify-center gap-2 p-1.5 rounded-lg ${datosRelacionados.configuracionesRed.get(activo.id) ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'} transition-colors group">
                                        <i class="fas fa-network-wired ${datosRelacionados.configuracionesRed.get(activo.id) ? 'text-green-600' : 'text-gray-500'} text-sm"></i>
                                        <span class="text-xs font-medium ${datosRelacionados.configuracionesRed.get(activo.id) ? 'text-green-700' : 'text-gray-600'}">
                                            ${datosRelacionados.configuracionesRed.get(activo.id) ? 'Editar Red' : 'Configurar Red'}
                                        </span>
                                    </button>
                                </div>
                            ` : ''}
                            
                            <div class="border-t border-gray-100"></div>
                            
                            <!-- Acciones principales -->
                            <div class="flex justify-between items-center">
                                <div class="flex gap-1 flex-wrap">
                                    <!-- Botón Ver detalles (visible para todos) -->
                                    <button onclick="verDetalleActivo('${activo.id}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalles completos">
                                        <i class="fas fa-info-circle"></i> <span class="text-xs ml-1">Ver detalles</span>
                                    </button>
                                    
                                    ${!soloLectura && esAdmin ? `
                                        <!-- Botones solo para ADMIN -->
                                        <button onclick="verHistorialUbicaciones('${activo.id}')" class="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Ver historial de ubicaciones">
                                            <i class="fas fa-map-marker-alt"></i>
                                        </button>
                                        <button onclick="verHistorialEstados('${activo.id}')" class="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Ver historial de cambios de estado">
                                            <i class="fas fa-history"></i>
                                        </button>
                                        <button onclick="generarReporteActivo('${activo.id}')" class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Generar reporte PDF">
                                            <i class="fas fa-file-alt"></i>
                                        </button>
                                        <button onclick="generarEtiquetaActivo('${activo.id}')" class="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Generar etiqueta">
                                            <i class="fas fa-tag"></i>
                                        </button>
                                        <button onclick="editarActivo('${activo.id}')" class="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar activo">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="eliminarActivo('${activo.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar activo">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== GENERAR VISTA TABLA ACTIVOS ====================
function generarVistaTablaActivos(activos, datosRelacionados, soloLectura = false, esAdmin = false) {
    if (!activos || activos.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-boxes text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay activos registrados</p>
                    ${esAdmin ? `<button onclick="abrirModalNuevoActivo()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nuevo Activo
                    </button>` : ''}
                </div>`;
    }
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serie</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EMPLEADO ASIGNADO</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            ${!soloLectura && esAdmin ? `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devolver</th>` : ''}
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${activos.map(activo => {
                            const info = activo.info_general || {};
                            const marca = info.marcas?.nombre || 'N/A';
                            const modelo = info.modelo || 'N/A';
                            const serie = info.numero_serie || 'N/A';
                            const tipoNombre = activo.tipos_activo?.nombre || 'N/A';
                            const empresa = activo.empresas?.nombre || activo.empresa?.nombre || 'N/A';
                            const ubicacion = activo.ubicaciones?.nombre || activo.ubicacion?.nombre || 'N/A';
                            
                            // Obtener empleado asignado
                            const asignacion = datosRelacionados.asignacionesPorActivo.get(activo.id);
                            const empleadoAsignado = asignacion?.empleado?.nombre_completo || 'No asignado';
                            const empleadoPuesto = asignacion?.empleado?.puesto || '';
                            const empleadoCorreo = asignacion?.empleado?.correo || '';
                            
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-mono">${activo.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${activo.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${tipoNombre}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="estado-badge estado-${activo.estado || 'DISPONIBLE'}">${activo.estado || 'DISPONIBLE'}</span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">${marca}</td>
                                    <td class="px-4 py-3 text-sm">${modelo}</td>
                                    <td class="px-4 py-3 text-sm font-mono text-xs">${serie}</td>
                                    <td class="px-4 py-3 text-sm">
                                        ${asignacion?.empleado ? `
                                            <div class="flex flex-col">
                                                <span class="font-medium text-primary">${empleadoAsignado}</span>
                                                ${empleadoPuesto ? `<span class="text-xs text-gray-500">${empleadoPuesto}</span>` : ''}
                                                ${empleadoCorreo ? `<span class="text-xs text-gray-400">${empleadoCorreo}</span>` : ''}
                                            </div>
                                        ` : '<span class="text-gray-400 italic">No asignado</span>'}
                                     </td>
                                    <td class="px-4 py-3 text-sm">${empresa}</td>
                                    <td class="px-4 py-3 text-sm">${ubicacion}</td>
                                    <td class="px-4 py-3 text-sm whitespace-nowrap">
                                        <button onclick="verDetalleActivo('${activo.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${!soloLectura && esAdmin ? `
                                            <button onclick="editarActivo('${activo.id}')" class="text-primary hover:text-primary-dark p-1" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="generarReporteActivo('${activo.id}')" class="text-green-600 hover:text-green-800 p-1" title="Reporte">
                                                <i class="fas fa-file-alt"></i>
                                            </button>
                                            <button onclick="generarEtiquetaActivo('${activo.id}')" class="text-purple-600 hover:text-purple-800 p-1" title="Etiqueta">
                                                <i class="fas fa-tag"></i>
                                            </button>
                                            <button onclick="verHistorialUbicaciones('${activo.id}')" class="text-orange-600 hover:text-orange-800 p-1" title="Historial ubicaciones">
                                                <i class="fas fa-map-marker-alt"></i>
                                            </button>
                                            <button onclick="verHistorialEstados('${activo.id}')" class="text-purple-600 hover:text-purple-800 p-1" title="Historial estados">
                                                <i class="fas fa-history"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                    ${!soloLectura && esAdmin ? `
                                        <td class="px-4 py-3 text-sm whitespace-nowrap">
                                            ${asignacion ? `
                                                <button onclick="devolverActivo('${asignacion.id}')" 
                                                        class="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 transition-colors flex items-center gap-1">
                                                    <i class="fas fa-undo-alt"></i> Devolver
                                                </button>
                                            ` : '<span class="text-gray-400 text-xs">-</span>'}
                                         </div>
                                    ` : ''}
                                 </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== OBTENER VALORES ÚNICOS PARA FILTROS DINÁMICOS (SEGÚN ROL) ====================
async function obtenerValoresUnicosFiltrosActivos(permisos) {
    try {
        // Construir query base según el rol
        let query = window.supabaseClient
            .from('activos')
            .select(`
                tipo_activo_id,
                tipos_activo (id, nombre),
                estado,
                empresa_id,
                empresas!empresa_id (id, nombre),
                ubicacion_id,
                ubicaciones!ubicacion_id (id, nombre),
                info_general (
                    marca_id,
                    condicion_fisica,
                    marcas (id, nombre)
                )
            `);
        
        // ============================================
        // APLICAR FILTROS SEGÚN ROL
        // ============================================
        
        // ADMINISTRADOR: ve todos los activos (sin filtros adicionales)
        
        // OPERADOR_EMPRESA: solo activos de sus empresas asignadas
        if (permisos.rol === 'OPERADOR_EMPRESA' && permisos.empresasIds?.length > 0) {
            console.log('🏢 OPERADOR_EMPRESA - Filtrando opciones por empresas:', permisos.empresasIds);
            query = query.in('empresa_id', permisos.empresasIds);
        } 
        // EMPLEADO: solo activos que tiene asignados
        else if (permisos.rol === 'EMPLEADO' && permisos.empleadoId) {
            console.log('👤 EMPLEADO - Filtrando opciones por activos asignados');
            
            // Obtener IDs de activos asignados al empleado
            const { data: asignaciones } = await window.supabaseClient
                .from('asignaciones')
                .select('activo_id')
                .eq('empleado_id', permisos.empleadoId)
                .eq('estado', 'ACTIVA');
            
            const activosIds = asignaciones?.map(a => a.activo_id) || [];
            
            if (activosIds.length > 0) {
                query = query.in('id', activosIds);
            } else {
                // Si no tiene activos asignados, retornar arrays vacíos
                return {
                    tipos: [],
                    marcas: [],
                    estados: [],
                    empresas: [],
                    ubicaciones: [],
                    condiciones: []
                };
            }
        }
        
        const { data: activos, error } = await query;
        
        if (error) throw error;
        
        // Mapas para valores únicos
        const tiposMap = new Map();
        const marcasMap = new Map();
        const estadosSet = new Set();
        const empresasMap = new Map();
        const ubicacionesMap = new Map();
        const condicionesSet = new Set();
        
        activos?.forEach(activo => {
            // Tipos de activo
            if (activo.tipo_activo_id && activo.tipos_activo) {
                tiposMap.set(activo.tipo_activo_id, {
                    id: activo.tipo_activo_id,
                    nombre: activo.tipos_activo.nombre
                });
            }
            
            // Marcas
            const marcaId = activo.info_general?.marca_id;
            const marcaNombre = activo.info_general?.marcas?.nombre;
            if (marcaId && marcaNombre) {
                marcasMap.set(marcaId, {
                    id: marcaId,
                    nombre: marcaNombre
                });
            }
            
            // Estados
            if (activo.estado) {
                estadosSet.add(activo.estado);
            }
            
            // Empresas
            if (activo.empresa_id && activo.empresas) {
                empresasMap.set(activo.empresa_id, {
                    id: activo.empresa_id,
                    nombre: activo.empresas.nombre
                });
            }
            
            // Ubicaciones
            if (activo.ubicacion_id && activo.ubicaciones) {
                ubicacionesMap.set(activo.ubicacion_id, {
                    id: activo.ubicacion_id,
                    nombre: activo.ubicaciones.nombre
                });
            }
            
            // Condiciones físicas
            if (activo.info_general?.condicion_fisica) {
                condicionesSet.add(activo.info_general.condicion_fisica);
            }
        });
        
        // Ordenar alfabéticamente
        const tipos = Array.from(tiposMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const marcas = Array.from(marcasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const estados = Array.from(estadosSet).sort();
        const empresas = Array.from(empresasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const ubicaciones = Array.from(ubicacionesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const condiciones = Array.from(condicionesSet).sort();
        
        // Mapeo de nombres para condiciones
        const condicionNombres = {
            'EXCELENTE': 'Excelente',
            'BUENO': 'Bueno',
            'REGULAR': 'Regular',
            'MALO': 'Malo',
            'POR_REPARAR': 'Por reparar'
        };
        
        console.log(`📊 Valores únicos para filtros (${permisos.rol}):`, {
            tipos: tipos.length,
            marcas: marcas.length,
            estados: estados.length,
            empresas: empresas.length,
            ubicaciones: ubicaciones.length,
            condiciones: condiciones.length
        });
        
        return {
            tipos,
            marcas,
            estados,
            empresas,
            ubicaciones,
            condiciones: condiciones.map(c => ({ id: c, nombre: condicionNombres[c] || c }))
        };
        
    } catch (error) {
        console.error('Error obteniendo valores únicos:', error);
        return {
            tipos: [],
            marcas: [],
            estados: [],
            empresas: [],
            ubicaciones: [],
            condiciones: []
        };
    }
}

// ==================== OBTENER ACTIVOS POR EMPLEADOS ====================
async function obtenerActivosPorEmpleados(empleadoIds) {
    if (!empleadoIds || empleadoIds.length === 0) return null;
    
    const { data: asignaciones } = await window.supabaseClient
        .from('asignaciones')
        .select('activo_id')
        .in('empleado_id', empleadoIds)
        .eq('estado', 'ACTIVA');
    
    return asignaciones?.map(a => a.activo_id) || [];
}

// ==================== OBTENER EMPLEADOS CON ASIGNACIONES (SEGÚN ROL) ====================
async function obtenerEmpleadosConAsignaciones(permisos) {
    try {
        let query = window.supabaseClient
            .from('asignaciones')
            .select(`
                empleado_id,
                empleado:empleado_id (
                    id,
                    nombre_completo,
                    puesto,
                    correo
                )
            `)
            .eq('estado', 'ACTIVA');
        
        // ============================================
        // APLICAR FILTROS SEGÚN ROL
        // ============================================
        
        // ADMINISTRADOR: ve todos los empleados con asignaciones
        // (sin filtros adicionales)
        
        // OPERADOR_EMPRESA: solo empleados de sus empresas asignadas
        if (permisos.rol === 'OPERADOR_EMPRESA' && permisos.empresasIds?.length > 0) {
            console.log('🏢 OPERADOR_EMPRESA - Filtrando empleados por empresas:', permisos.empresasIds);
            
            // Obtener IDs de empleados que pertenecen a las empresas del operador
            const { data: empleadosPorEmpresa } = await window.supabaseClient
                .from('empleados')
                .select('id')
                .in('empresa_id', permisos.empresasIds)
                .eq('activo', true);
            
            const empleadosIds = empleadosPorEmpresa?.map(e => e.id) || [];
            
            if (empleadosIds.length > 0) {
                query = query.in('empleado_id', empleadosIds);
            } else {
                return [];
            }
        }
        // EMPLEADO: solo ve sus propias asignaciones (o ninguna)
        else if (permisos.rol === 'EMPLEADO' && permisos.empleadoId) {
            query = query.eq('empleado_id', permisos.empleadoId);
        }
        
        const { data: asignaciones, error } = await query;
        
        if (error) throw error;
        
        const empleadosMap = new Map();
        
        asignaciones?.forEach(asig => {
            if (asig.empleado_id && asig.empleado) {
                empleadosMap.set(asig.empleado_id, {
                    id: asig.empleado_id,
                    nombre: asig.empleado.nombre_completo,
                    puesto: asig.empleado.puesto,
                    correo: asig.empleado.correo
                });
            }
        });
        
        const empleados = Array.from(empleadosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log(`📊 Empleados con asignaciones (${permisos.rol}):`, empleados.length);
        
        return empleados;
        
    } catch (error) {
        console.error('Error obteniendo empleados con asignaciones:', error);
        return [];
    }
}

// ==================== ACTIVOS - VISTA OPTIMIZADA ====================
async function cargarVistaActivos() {
    mostrarLoading('Cargando activos...');
    
    try {
        console.log('%c📋 CARGANDO ACTIVOS - VERSIÓN OPTIMIZADA', 'background: #007bff; color: white; font-size: 14px;');
        console.log(`📄 Página ${paginaActualActivos} - ${ITEMS_POR_PAGINA} items por página`);
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        
        // Determinar roles
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        const esOperador = permisos.rol === 'OPERADOR_EMPRESA';
        const esEmpleado = permisos.rol === 'EMPLEADO';
        const soloLectura = esOperador || esEmpleado;
        
        console.log(`🔒 Modo solo lectura: ${soloLectura} (Rol: ${permisos.rol})`);
        console.log(`👑 Es administrador: ${esAdmin}`);
        
        // ============================================
        // CARGAR VALORES ÚNICOS PARA FILTROS DINÁMICOS (SEGÚN ROL)
        // ============================================
        const [valoresUnicos, empleadosDisponibles] = await Promise.all([
            obtenerValoresUnicosFiltrosActivos(permisos),
            obtenerEmpleadosConAsignaciones(permisos)
        ]);
        
        console.log('📊 Valores únicos para filtros:', {
            rol: permisos.rol,
            tipos: valoresUnicos.tipos.length,
            marcas: valoresUnicos.marcas.length,
            estados: valoresUnicos.estados.length,
            empresas: valoresUnicos.empresas.length,
            ubicaciones: valoresUnicos.ubicaciones.length,
            condiciones: valoresUnicos.condiciones.length,
            empleados: empleadosDisponibles.length
        });
        
        // ============================================
        // OBTENER FILTROS DEL DOM (MÚLTIPLES VALORES)
        // ============================================
        
        const filtros = {
            tipoIds: obtenerValoresMultiples('filtroTipo'),
            marcaIds: obtenerValoresMultiples('filtroMarca'),
            estados: obtenerValoresMultiples('filtroEstado'),
            empresaIds: obtenerValoresMultiples('filtroEmpresa'),
            ubicacionIds: obtenerValoresMultiples('filtroUbicacion'),
            condiciones: obtenerValoresMultiples('filtroCondicion'),
            empleadoIds: obtenerValoresMultiples('filtroEmpleado'),
            ano: document.getElementById('filtroAno')?.value,
            busqueda: document.getElementById('filtroBusqueda')?.value,
            compraDesde: document.getElementById('filtroCompraDesde')?.value,
            compraHasta: document.getElementById('filtroCompraHasta')?.value
        };
        
        filtrosActivos = filtros;
        
        // Actualizar badge de filtros activos
        actualizarBadgeFiltrosActivos(filtros);
        
        // ============================================
        // CONSTRUIR QUERY CON FILTROS
        // ============================================
        
        let query = window.supabaseClient
            .from('activos')
            .select(`
                id,
                nombre,
                codigo_activo,
                estado,
                creado_el,
                modificado_el,
                tipo_activo_id,
                empresa_id,
                ubicacion_id,
                tipos_activo!tipo_activo_id (id, nombre),
                info_general (
                    id,
                    marca_id,
                    modelo,
                    numero_serie,
                    ano_fabricacion,
                    condicion_fisica,
                    fecha_compra,
                    fecha_garantia,
                    marcas!marca_id (id, nombre)
                ),
                ubicaciones!ubicacion_id (id, nombre, descripcion, tipo),
                empresas!empresa_id (id, nombre, ruc)
            `, { count: 'exact' })
            .range((paginaActualActivos - 1) * ITEMS_POR_PAGINA, paginaActualActivos * ITEMS_POR_PAGINA - 1)
            .order('creado_el', { ascending: false });
        
        // ============================================
        // FILTROS CON MÚLTIPLES VALORES (usando IN)
        // ============================================
        
        // Tipos de activo
        if (filtros.tipoIds && filtros.tipoIds.length > 0) {
            query = query.in('tipo_activo_id', filtros.tipoIds);
        }
        
        // Marcas
        if (filtros.marcaIds && filtros.marcaIds.length > 0) {
            query = query.in('info_general.marca_id', filtros.marcaIds);
        }
        
        // Estados
        if (filtros.estados && filtros.estados.length > 0) {
            query = query.in('estado', filtros.estados);
        }
        
        // Empresas
        if (filtros.empresaIds && filtros.empresaIds.length > 0) {
            query = query.in('empresa_id', filtros.empresaIds);
        }
        
        // Ubicaciones
        if (filtros.ubicacionIds && filtros.ubicacionIds.length > 0) {
            query = query.in('ubicacion_id', filtros.ubicacionIds);
        }
        
        // Condiciones
        if (filtros.condiciones && filtros.condiciones.length > 0) {
            query = query.in('info_general.condicion_fisica', filtros.condiciones);
        }
        
        // ============================================
        // FILTROS CON VALOR ÚNICO
        // ============================================
        
        if (filtros.ano && filtros.ano !== '') {
            query = query.eq('info_general.ano_fabricacion', parseInt(filtros.ano));
        }
        
        if (filtros.busqueda && filtros.busqueda !== '') {
            query = query.or(`nombre.ilike.%${filtros.busqueda}%,codigo_activo.ilike.%${filtros.busqueda}%`);
        }
        
        if (filtros.compraDesde && filtros.compraDesde !== '') {
            query = query.gte('info_general.fecha_compra', filtros.compraDesde);
        }
        
        if (filtros.compraHasta && filtros.compraHasta !== '') {
            query = query.lte('info_general.fecha_compra', filtros.compraHasta);
        }
        
        // ============================================
        // FILTRO POR EMPLEADOS ASIGNADOS (múltiple)
        // ============================================
        if (filtros.empleadoIds && filtros.empleadoIds.length > 0) {
            const { data: asignaciones } = await window.supabaseClient
                .from('asignaciones')
                .select('activo_id')
                .in('empleado_id', filtros.empleadoIds)
                .eq('estado', 'ACTIVA');
            
            const activosIds = asignaciones?.map(a => a.activo_id) || [];
            if (activosIds.length > 0) {
                query = query.in('id', activosIds);
            } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }
        
        // ============================================
        // FILTROS POR ROL
        // ============================================
        
        if (permisos.rol === 'OPERADOR_EMPRESA' && permisos.empresasIds?.length > 0) {
            console.log('🏢 OPERADOR_EMPRESA - Filtrando por empresas:', permisos.empresasIds);
            query = query.in('empresa_id', permisos.empresasIds);
        } else if (permisos.rol === 'EMPLEADO' && permisos.empleadoId) {
            console.log('👤 EMPLEADO - Filtrando por activos asignados');
            const { data: asignacionesEmpleado } = await window.supabaseClient
                .from('asignaciones')
                .select('activo_id')
                .eq('empleado_id', permisos.empleadoId)
                .eq('estado', 'ACTIVA');
            const activosIds = asignacionesEmpleado?.map(a => a.activo_id) || [];
            if (activosIds.length > 0) {
                query = query.in('id', activosIds);
            } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }
        
        const { data: activosRaw, count, error } = await query;
        
        if (error) throw error;
        
        let activos = activosRaw;
        let totalCount = count;
        
        totalActivosCount = totalCount;
        totalPaginasActivos = Math.ceil(totalActivosCount / ITEMS_POR_PAGINA);
        
        console.log(`📊 Total activos: ${totalActivosCount} - Páginas: ${totalPaginasActivos}`);
        
        // ============================================
        // BATCH LOADING - Cargar datos relacionados EN LOTE
        // ============================================
        
        const activosIds = activos?.map(a => a.id) || [];
        const datosRelacionados = await cargarDatosRelacionadosEnLote(activosIds);
        
        ocultarLoading();
        
        // ============================================
        // GENERAR OPCIONES DE FILTROS DINÁMICOS
        // ============================================
        
        const tiposOptions = valoresUnicos.tipos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
        const marcasOptions = valoresUnicos.marcas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
        const estadosOptions = valoresUnicos.estados.map(e => {
            const nombreEstado = {
                'DISPONIBLE': 'Disponible',
                'ASIGNADO': 'Asignado',
                'MANTENIMIENTO': 'Mantenimiento',
                'REPARACIÓN': 'Reparación',
                'BAJA': 'Baja',
                'RESERVADO': 'Reservado',
                'PRÉSTAMO': 'Préstamo'
            }[e] || e;
            return `<option value="${e}">${nombreEstado}</option>`;
        }).join('');
        const empresasOptions = valoresUnicos.empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        const ubicacionesOptions = valoresUnicos.ubicaciones.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
        const condicionesOptions = valoresUnicos.condiciones.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const empleadosOptions = empleadosDisponibles.map(e => `<option value="${e.id}">${e.nombre} ${e.puesto ? `(${e.puesto})` : ''}</option>`).join('');
        
        // ============================================
        // GENERAR HTML
        // ============================================
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-desktop"></i> Listado de Activos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Gestión completa de activos TI
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${totalActivosCount} activo${totalActivosCount !== 1 ? 's' : ''}
                            </span>
                            ${soloLectura ? '<span class="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"><i class="fas fa-eye"></i> Modo solo lectura</span>' : ''}
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        ${!soloLectura && esAdmin ? `
                            <button onclick="window.exportarActivosPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm" title="Exportar a PDF">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                            <button onclick="window.exportarActivosCompletoExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm" title="Exportar a Excel">
                                <i class="fas fa-file-excel"></i> Excel
                            </button>
                        ` : ''}
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaActivos('tabla')" class="px-3 py-1.5 text-sm ${vistaActivosActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Tabla">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaActivos('cards')" class="px-3 py-1.5 text-sm ${vistaActivosActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Cards">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        ${esAdmin ? `
                            <button onclick="abrirModalNuevoActivo()" class="btn-primary flex items-center gap-2">
                                <i class="fas fa-plus"></i> Nuevo Activo
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- FILTROS AVANZADOS CON SELECTORES MÚLTIPLES -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="window.toggleFiltrosActivosPanel()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosActivosBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosActivosIcon"></i>
                </div>
                <div id="panelFiltrosActivos" class="p-4 hidden">
                    <!-- Primera fila de filtros -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <!-- Tipo -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Tipo (múltiple)</label>
                            <select id="filtroTipo" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${tiposOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroTipo')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroTipo')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Marca -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Marca (múltiple)</label>
                            <select id="filtroMarca" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${marcasOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroMarca')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroMarca')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Estado -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Estado (múltiple)</label>
                            <select id="filtroEstado" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${estadosOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroEstado')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroEstado')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Empresa -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Empresa (múltiple)</label>
                            <select id="filtroEmpresa" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${empresasOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroEmpresa')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroEmpresa')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Segunda fila de filtros -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <!-- Ubicación -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Ubicación (múltiple)</label>
                            <select id="filtroUbicacion" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${ubicacionesOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroUbicacion')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroUbicacion')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Condición -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Condición (múltiple)</label>
                            <select id="filtroCondicion" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${condicionesOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroCondicion')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroCondicion')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Empleado Asignado -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">
                                <i class="fas fa-user-tie text-primary mr-1"></i>Empleado Asignado (múltiple)
                            </label>
                            <select id="filtroEmpleado" multiple size="4" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${empleadosOptions}
                            </select>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-400">Ctrl+clic para múltiple</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="seleccionarTodos('filtroEmpleado')" class="text-xs text-primary hover:underline">Seleccionar todos</button>
                                    <button type="button" onclick="deseleccionarTodos('filtroEmpleado')" class="text-xs text-gray-400 hover:underline">Limpiar</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Año fabricación -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Año fabricación</label>
                            <input type="number" id="filtroAno" placeholder="Ej: 2024" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                        </div>
                    </div>
                    
                    <!-- Tercera fila de filtros -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <!-- Búsqueda -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Búsqueda</label>
                            <input type="text" id="filtroBusqueda" placeholder="Nombre o código..." class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                        </div>
                        
                        <!-- Compra desde -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Compra desde</label>
                            <input type="date" id="filtroCompraDesde" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                        </div>
                        
                        <!-- Compra hasta -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Compra hasta</label>
                            <input type="date" id="filtroCompraHasta" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-2 pt-3 border-t">
                        <button onclick="window.aplicarFiltrosActivosOptimizados()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                            <i class="fas fa-search"></i> Aplicar filtros
                        </button>
                        <button onclick="window.limpiarFiltrosActivosOptimizados()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-undo-alt"></i> Limpiar
                        </button>
                    </div>
                    
                    <div class="mt-3 text-xs text-gray-400 border-t pt-2">
                        <i class="fas fa-info-circle"></i> Mantenga presionada la tecla Ctrl (Cmd en Mac) para seleccionar múltiples opciones en los filtros.
                    </div>
                </div>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="activosContainer">
                ${vistaActivosActual === 'tabla' 
                    ? generarVistaTablaActivos(activos, datosRelacionados, soloLectura, esAdmin)
                    : generarVistaCardsActivos(activos, datosRelacionados, soloLectura, esAdmin)
                }
            </div>
        `;
        
        // Agregar paginación solo si hay más de una página
        if (totalPaginasActivos > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualActivos - 1) * ITEMS_POR_PAGINA) + 1} - ${Math.min(paginaActualActivos * ITEMS_POR_PAGINA, totalActivosCount)} de ${totalActivosCount} activos
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaActivos(${paginaActualActivos - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualActivos === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                                ${paginaActualActivos === 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorActivos()}
                        </div>
                        <button onclick="cambiarPaginaActivos(${paginaActualActivos + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualActivos === totalPaginasActivos ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                                ${paginaActualActivos === totalPaginasActivos ? 'disabled' : ''}>
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Inicializar panel de filtros (oculto por defecto)
        setTimeout(() => {
            const panel = document.getElementById('panelFiltrosActivos');
            if (panel) {
                panel.style.display = 'none';
                panel.classList.add('hidden');
            }
            const icon = document.getElementById('filtrosActivosIcon');
            if (icon) icon.style.transform = 'rotate(0deg)';
            
            // Inicializar filtros
            if (typeof window.inicializarFiltrosActivos === 'function') {
                window.inicializarFiltrosActivos();
            }
        }, 100);
        
        console.log('✅ Vista de activos cargada correctamente - Modo solo lectura:', soloLectura);
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando activos:', error);
        mostrarError('Error al cargar activos: ' + (error.message || 'Error desconocido'));
    }
}

// Asegurar que la función esté disponible globalmente
window.cargarVistaActivos = cargarVistaActivos;

// ==================== GENERAR PAGINADOR ====================
function generarPaginadorActivos() {
    let html = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualActivos - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginasActivos, inicio + maxBotones - 1);
    
    if (fin - inicio + 1 < maxBotones) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
        html += `
            <button onclick="cambiarPaginaActivos(${i})" 
                    class="px-3 py-1 rounded-lg ${i === paginaActualActivos ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                ${i}
            </button>
        `;
    }
    
    return html;
}

// ==================== CAMBIAR PÁGINA ====================
window.cambiarPaginaActivos = async function(pagina) {
    if (pagina < 1 || pagina > totalPaginasActivos) return;
    if (pagina === paginaActualActivos) return;
    
    const scrollY = window.scrollY;
    paginaActualActivos = pagina;
    
    await cargarVistaActivos();
    
    setTimeout(() => window.scrollTo(0, scrollY), 100);
};

// ==================== CAMBIAR VISTA ====================
window.toggleVistaActivos = async function(vista) {
    vistaActivosActual = vista;
    await cargarVistaActivos();
};

// ==================== FILTROS OPTIMIZADOS ====================
function inicializarEventosFiltrosActivos() {
    const inputs = ['filtroTipo', 'filtroMarca', 'filtroEstado', 'filtroEmpresa', 'filtroUbicacion', 'filtroCondicion', 'filtroAno'];
    
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', () => aplicarFiltrosActivosOptimizados());
        }
    });
    
    const busquedaInput = document.getElementById('filtroBusqueda');
    if (busquedaInput) {
        busquedaInput.addEventListener('input', () => {
            if (timeoutFiltroActivos) clearTimeout(timeoutFiltroActivos);
            timeoutFiltroActivos = setTimeout(() => aplicarFiltrosActivosOptimizados(), 500);
        });
    }
}

window.aplicarFiltrosActivosOptimizados = function() {
    // Obtener valores múltiples de cada select
    const filtros = {
        tipoIds: obtenerValoresMultiples('filtroTipo'),
        marcaIds: obtenerValoresMultiples('filtroMarca'),
        estados: obtenerValoresMultiples('filtroEstado'),
        empresaIds: obtenerValoresMultiples('filtroEmpresa'),
        ubicacionIds: obtenerValoresMultiples('filtroUbicacion'),
        condiciones: obtenerValoresMultiples('filtroCondicion'),
        ano: document.getElementById('filtroAno')?.value,
        busqueda: document.getElementById('filtroBusqueda')?.value,
        compraDesde: document.getElementById('filtroCompraDesde')?.value,
        compraHasta: document.getElementById('filtroCompraHasta')?.value,
        empleadoIds: obtenerValoresMultiples('filtroEmpleado')
    };
    
    filtrosActivos = filtros;
    paginaActualActivos = 1;
    cargarVistaActivos();
    
    // Actualizar badge de filtros activos
    actualizarBadgeFiltrosActivos(filtros);
};

// Función auxiliar para obtener valores múltiples de un select
function obtenerValoresMultiples(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    
    const valores = [];
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        if (option.selected && option.value !== '') {
            valores.push(option.value);
        }
    }
    return valores;
}

// Función para actualizar el badge de filtros activos
function actualizarBadgeFiltrosActivos(filtros) {
    let totalActivos = 0;
    
    totalActivos += filtros.tipoIds?.length || 0;
    totalActivos += filtros.marcaIds?.length || 0;
    totalActivos += filtros.estados?.length || 0;
    totalActivos += filtros.empresaIds?.length || 0;
    totalActivos += filtros.ubicacionIds?.length || 0;
    totalActivos += filtros.condiciones?.length || 0;
    totalActivos += filtros.empleadoIds?.length || 0;
    if (filtros.ano) totalActivos++;
    if (filtros.busqueda) totalActivos++;
    if (filtros.compraDesde) totalActivos++;
    if (filtros.compraHasta) totalActivos++;
    
    const badge = document.getElementById('filtrosActivosBadge');
    if (badge) {
        if (totalActivos > 0) {
            badge.textContent = totalActivos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

window.limpiarFiltrosActivosOptimizados = function() {
    // Limpiar selects múltiples
    const selectsMultiples = [
        'filtroTipo', 'filtroMarca', 'filtroEstado', 'filtroEmpresa',
        'filtroUbicacion', 'filtroCondicion', 'filtroEmpleado'
    ];
    
    selectsMultiples.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            for (let i = 0; i < select.options.length; i++) {
                select.options[i].selected = false;
            }
        }
    });
    
    // Limpiar campos de valor único
    const camposUnicos = [
        'filtroAno', 'filtroBusqueda', 'filtroCompraDesde', 'filtroCompraHasta'
    ];
    
    camposUnicos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    paginaActualActivos = 1;
    cargarVistaActivos();
    
    // Ocultar badge
    const badge = document.getElementById('filtrosActivosBadge');
    if (badge) badge.classList.add('hidden');
};

// ==================== EXPORTAR ACTIVOS A EXCEL ====================
window.exportarActivosCompletoExcel = async function() {
    console.log('✅ Exportando activos a Excel con empleado incluido');
    mostrarLoading('Generando archivo Excel...');
    
    try {
        // Obtener activos con filtros actuales
        let query = window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (id, nombre),
                info_general (
                    *,
                    marcas (id, nombre)
                ),
                empresas!empresa_id (id, nombre, ruc),
                ubicaciones!ubicacion_id (id, nombre, descripcion, tipo)
            `);
        
        // Aplicar filtros si existen
        if (filtrosActivos.tipoId && filtrosActivos.tipoId !== '') {
            query = query.eq('tipo_activo_id', filtrosActivos.tipoId);
        }
        if (filtrosActivos.estado && filtrosActivos.estado !== '') {
            query = query.eq('estado', filtrosActivos.estado);
        }
        if (filtrosActivos.empresaId && filtrosActivos.empresaId !== '') {
            query = query.eq('empresa_id', filtrosActivos.empresaId);
        }
        if (filtrosActivos.ubicacionId && filtrosActivos.ubicacionId !== '') {
            query = query.eq('ubicacion_id', filtrosActivos.ubicacionId);
        }
        if (filtrosActivos.busqueda && filtrosActivos.busqueda !== '') {
            query = query.or(`nombre.ilike.%${filtrosActivos.busqueda}%,codigo_activo.ilike.%${filtrosActivos.busqueda}%`);
        }
        
        const { data: activos, error } = await query.order('nombre');
        
        if (error) throw error;
        
        if (!activos || activos.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay activos para exportar', 'info');
            return;
        }
        
        // OBTENER EMPLEADOS ASIGNADOS
        const activosIds = activos.map(a => a.id);
        const { data: asignaciones } = await window.supabaseClient
            .from('asignaciones')
            .select(`
                activo_id,
                empleado:empleado_id (
                    id,
                    nombre_completo,
                    puesto,
                    correo
                )
            `)
            .in('activo_id', activosIds)
            .eq('estado', 'ACTIVA');
        
        // Mapa de empleados por activo
        const empleadoPorActivo = new Map();
        asignaciones?.forEach(asig => {
            if (asig.empleado?.nombre_completo) {
                empleadoPorActivo.set(asig.activo_id, asig.empleado.nombre_completo);
            }
        });
        
        // Preparar datos para Excel
        const datos = activos.map(a => {
            const info = a.info_general || {};
            const marca = info.marcas?.nombre || '';
            const modelo = info.modelo || '';
            const serie = info.numero_serie || '';
            const empresa = a.empresas?.nombre || a.empresa?.nombre || '';
            const ubicacion = a.ubicaciones?.nombre || a.ubicacion?.nombre || '';
            const empleadoAsignado = empleadoPorActivo.get(a.id) || '';
            
            return {
                'CÓDIGO': a.codigo_activo || '',
                'NOMBRE': a.nombre || '',
                'TIPO': a.tipos_activo?.nombre || '',
                'ESTADO': a.estado || '',
                'MARCA': marca,
                'MODELO': modelo,
                'SERIE': serie,
                'EMPLEADO ASIGNADO': empleadoAsignado,
                'EMPRESA': empresa,
                'UBICACIÓN': ubicacion,
                'AÑO': info.ano_fabricacion || '',
                'CONDICIÓN': info.condicion_fisica || '',
                'FECHA COMPRA': info.fecha_compra ? new Date(info.fecha_compra).toLocaleDateString() : 'N/A',
                'GARANTÍA': info.fecha_garantia ? new Date(info.fecha_garantia).toLocaleDateString() : 'N/A'
            };
        });
        
        const columnas = [
            'CÓDIGO', 'NOMBRE', 'TIPO', 'ESTADO', 'MARCA', 'MODELO', 'SERIE',
            'EMPLEADO ASIGNADO', 'EMPRESA', 'UBICACIÓN', 'AÑO', 'CONDICIÓN',
            'FECHA COMPRA', 'GARANTÍA'
        ];
        
        // Exportar usando SheetJS
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Activos');
        
        // Ajustar ancho de columnas
        const colWidths = columnas.map(col => ({ wch: Math.max(col.length, 15) }));
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `activos_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} activos a Excel`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// Seleccionar todas las opciones de un select múltiple
function seleccionarTodos(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value !== '') {
            select.options[i].selected = true;
        }
    }
}

// Deseleccionar todas las opciones de un select múltiple
function deseleccionarTodos(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].selected = false;
    }
}

// ==================== EXPORTAR ACTIVOS A PDF ====================
window.exportarActivosPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        // Obtener activos con filtros actuales (sin paginación)
        let query = window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (id, nombre),
                info_general (
                    *,
                    marcas (id, nombre)
                ),
                empresas!empresa_id (id, nombre, ruc),
                ubicaciones!ubicacion_id (id, nombre, descripcion, tipo)
            `);
        
        // Aplicar filtros si existen
        if (filtrosActivos.tipoId && filtrosActivos.tipoId !== '') {
            query = query.eq('tipo_activo_id', filtrosActivos.tipoId);
        }
        if (filtrosActivos.estado && filtrosActivos.estado !== '') {
            query = query.eq('estado', filtrosActivos.estado);
        }
        if (filtrosActivos.empresaId && filtrosActivos.empresaId !== '') {
            query = query.eq('empresa_id', filtrosActivos.empresaId);
        }
        if (filtrosActivos.ubicacionId && filtrosActivos.ubicacionId !== '') {
            query = query.eq('ubicacion_id', filtrosActivos.ubicacionId);
        }
        if (filtrosActivos.busqueda && filtrosActivos.busqueda !== '') {
            query = query.or(`nombre.ilike.%${filtrosActivos.busqueda}%,codigo_activo.ilike.%${filtrosActivos.busqueda}%`);
        }
        
        const { data: activos, error } = await query.order('nombre');
        
        if (error) throw error;
        
        if (!activos || activos.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay activos para exportar', 'info');
            return;
        }
        
        // ============================================
        // OBTENER EMPLEADOS ASIGNADOS
        // ============================================
        const activosIds = activos.map(a => a.id);
        const { data: asignaciones } = await window.supabaseClient
            .from('asignaciones')
            .select(`
                activo_id,
                empleado:empleado_id (
                    id,
                    nombre_completo,
                    puesto,
                    correo
                )
            `)
            .in('activo_id', activosIds)
            .eq('estado', 'ACTIVA');
        
        // Crear mapa de empleados por activo
        const empleadoPorActivo = new Map();
        asignaciones?.forEach(asig => {
            if (asig.empleado?.nombre_completo) {
                empleadoPorActivo.set(asig.activo_id, asig.empleado.nombre_completo);
            }
        });
        
        // Contar estadísticas iniciales
        const totalActivos = activos.length;
        const disponibles = activos.filter(a => a.estado === 'DISPONIBLE').length;
        const asignados = activos.filter(a => a.estado === 'ASIGNADO').length;
        
        ocultarLoading();
        
        // Generar HTML del reporte
        let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Activos</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: white;
                        padding: 20px;
                    }
                    .report-container {
                        max-width: 1400px;
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
                        min-width: 150px;
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
                        font-size: 12px;
                        color: #666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11px;
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
                        font-size: 10px;
                        font-weight: bold;
                    }
                    .estado-DISPONIBLE { background: #d1fae5; color: #065f46; }
                    .estado-ASIGNADO { background: #dbeafe; color: #1e40af; }
                    .estado-MANTENIMIENTO { background: #ede9fe; color: #5b21b6; }
                    .estado-REPARACIÓN { background: #fed7aa; color: #9a3412; }
                    .estado-BAJA { background: #fee2e2; color: #991b1b; }
                    .estado-RESERVADO { background: #cffafe; color: #155e75; }
                    .estado-PRÉSTAMO { background: #ccfbf1; color: #115e59; }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="report-header">
                        <h1>REPORTE DE ACTIVOS</h1>
                        <p>GENERADO EL: ${new Date().toLocaleString('es-ES')}</p>
                        <p>USUARIO: ${usuarioActual?.empleados?.nombre_completo || usuarioActual?.correo || 'Sistema'}</p>
                        <p>TOTAL DE ACTIVOS: ${totalActivos}</p>
                    </div>
                    
                    <!-- Estadísticas -->
                    <div class="stats">
                        <div class="stat-card">
                            <div class="number">${totalActivos}</div>
                            <div class="label">TOTAL DE ACTIVOS</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${disponibles}</div>
                            <div class="label">DISPONIBLES</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${asignados}</div>
                            <div class="label">ASIGNADOS</div>
                        </div>
                    </div>
                    
                    <!-- Tabla de activos -->
                    <table>
                        <thead>
                            <tr>
                                <th>CÓDIGO</th>
                                <th>NOMBRE</th>
                                <th>TIPO</th>
                                <th>ESTADO</th>
                                <th>MARCA</th>
                                <th>MODELO</th>
                                <th>SERIE</th>
                                <th>EMPLEADO ASIGNADO</th>
                                <th>EMPRESA</th>
                                <th>UBICACIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activos.map(a => {
                                const info = a.info_general || {};
                                const marca = info.marcas?.nombre || '';
                                const modelo = info.modelo || '';
                                const serie = info.numero_serie || '';
                                const tipo = a.tipos_activo?.nombre || '';
                                const estado = a.estado || 'DISPONIBLE';
                                
                                // ✅ CORRECCIÓN: Acceder correctamente a empresa y ubicación
                                const empresa = a.empresas?.nombre || a.empresa?.nombre || '';
                                const ubicacion = a.ubicaciones?.nombre || a.ubicacion?.nombre || '';
                                
                                // Obtener empleado asignado
                                const empleadoAsignado = empleadoPorActivo.get(a.id) || '';
                                
                                return `
                                    <tr>
                                        <td>${a.codigo_activo || ''}</td>
                                        <td>${a.nombre || 'N/A'}</td>
                                        <td>${tipo}</td>
                                        <td><span class="badge-estado estado-${estado}">${estado}</span></td>
                                        <td>${marca}</td>
                                        <td>${modelo}</td>
                                        <td>${serie}</td>
                                        <td>${empleadoAsignado}</td>
                                        <td>${empresa}</td>
                                        <td>${ubicacion}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Reporte generado automáticamente por el Sistema</p>
                        <p>Filtros aplicados en el momento de la exportación</p>
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
        mostrarAlerta('Éxito', `Se exportaron ${activos.length} activos a PDF`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a PDF:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// Asegurar que la función cargarVistaActivos esté disponible globalmente
window.cargarVistaActivos = cargarVistaActivos;

// ==================== CARGAR DATOS RELACIONADOS DEL ACTIVO ====================
async function cargarDatosRelacionadosActivo(activo) {
    try {
        // Ejecutar todas las consultas en paralelo para mejor rendimiento
        const [
            { data: software },
            { data: asignacion },
            { data: credenciales },
            { data: accesos },
            { data: respaldos },
            { data: especificaciones },
            { data: configuracionRed }
        ] = await Promise.all([
            // Software instalado activo
            window.supabaseClient
                .from('software_instalado')
                .select('*, software:software_id(*)')
                .eq('activo_id', activo.id)
                .eq('estado', 'INSTALADO'),
            
            // Asignación activa
            window.supabaseClient
                .from('asignaciones')
                .select('*, empleado:empleado_id(*)')
                .eq('activo_id', activo.id)
                .eq('estado', 'ACTIVA')
                .maybeSingle(),
            
            // Credenciales activas
            window.supabaseClient
                .from('credenciales')
                .select('*')
                .eq('activo_id', activo.id)
                .eq('activo', true),
            
            // Accesos remotos activos
            window.supabaseClient
                .from('accesos_remotos')
                .select('*')
                .eq('activo_id', activo.id)
                .eq('activo', true),
            
            // Tareas de respaldo activas
            window.supabaseClient
                .from('tareas_respaldo')
                .select('*')
                .eq('activo_id', activo.id)
                .eq('activo', true),
            
            // Especificaciones técnicas
            window.supabaseClient
                .from('especificaciones_valores')
                .select('*, atributo:atributo_id(*)')
                .eq('activo_id', activo.id),
            
            // Configuración de red
            window.supabaseClient
                .from('configuracion_red')
                .select('*')
                .eq('activo_id', activo.id)
                .maybeSingle()
        ]);
        
        // Retornar todos los datos relacionados
        return { 
            software: software || [], 
            asignacion: asignacion || null, 
            credenciales: credenciales || [], 
            accesos: accesos || [], 
            respaldos: respaldos || [],
            especificaciones: especificaciones || [],
            configuracionRed: configuracionRed || null
        };
        
    } catch (error) {
        console.error(`❌ Error cargando datos relacionados para activo ${activo.id}:`, error);
        
        // Retornar valores por defecto en caso de error
        return { 
            software: [], 
            asignacion: null, 
            credenciales: [], 
            accesos: [], 
            respaldos: [], 
            especificaciones: [],
            configuracionRed: null
        };
    }
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;
    
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && paginaActualActivos < totalPaginasActivos) {
            cargarSiguientePaginaActivos();
        }
    }, { threshold: 0.1 });
    
    observer.observe(sentinel);
}

async function cargarSiguientePaginaActivos() {
    if (cargandoPagina) return;
    cargandoPagina = true;
    
    const siguientePagina = paginaActualActivos + 1;
    if (siguientePagina <= totalPaginasActivos) {
        await cargarVistaActivosOptimizada(siguientePagina);
    }
    
    cargandoPagina = false;
}

// ==================== FUNCIONES DE ACTIVOS (CRUD) ====================
// ==================== EDITAR ACTIVO ====================
window.editarActivo = async function(id) {
    mostrarLoading('Cargando activo...');
    
    try {
        console.log('🔍 Editando activo ID:', id);
        
        // Cerrar modal si está abierto
        const modal = document.getElementById('activoModal');
        if (modal && !modal.classList.contains('hidden')) {
            window.cerrarModal('activoModal');
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Obtener datos del activo
        const { data: activo, error } = await window.supabaseClient
            .from('activos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;

        editandoId = id;
        
        // Actualizar título del modal
        const titleElement = document.getElementById('activoModalTitle');
        if (titleElement) titleElement.innerText = 'Editar Activo';

        // Resetear formulario
        const form = document.getElementById('activoForm');
        if (form) form.reset();

        // Limpiar mensajes de error previos
        const errorSerie = document.getElementById('error-serie');
        if (errorSerie) errorSerie.remove();
        
        const errorCodigo = document.getElementById('error-codigo');
        if (errorCodigo) errorCodigo.remove();

        // Cargar selects principales
        await Promise.all([
            cargarCategoriasSelect(),
            window.cargarMarcasSelect('activo_marca_id'),
            cargarEmpresasSelect('activo_empresa_id')
        ]);

        // Cargar ubicaciones según empresa
        if (activo.empresa_id) {
            await window.cargarUbicacionesPorEmpresa(activo.empresa_id, 'activo_ubicacion_id');
        } else {
            const ubicacionSelect = document.getElementById('activo_ubicacion_id');
            if (ubicacionSelect) {
                ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
                ubicacionSelect.disabled = true;
            }
        }

        // ============================================
        // CARGAR JERARQUÍA DE CATEGORÍAS
        // ============================================
        if (activo.tipo_activo_id) {
            // Obtener tipo de activo
            const { data: tipo } = await window.supabaseClient
                .from('tipos_activo')
                .select('subcategoria_id')
                .eq('id', activo.tipo_activo_id)
                .single();

            if (tipo) {
                // Obtener subcategoría
                const { data: subcategoria } = await window.supabaseClient
                    .from('subcategorias')
                    .select('categoria_id')
                    .eq('id', tipo.subcategoria_id)
                    .single();

                if (subcategoria) {
                    // Establecer categoría
                    const categoriaSelect = document.getElementById('activo_categoria_id');
                    if (categoriaSelect) {
                        categoriaSelect.value = subcategoria.categoria_id;
                        await window.cargarSubcategoriasActivo();
                        
                        // Establecer subcategoría
                        const subcategoriaSelect = document.getElementById('activo_subcategoria_id');
                        if (subcategoriaSelect) {
                            subcategoriaSelect.value = tipo.subcategoria_id;
                            await window.cargarTiposActivo();
                            
                            // Establecer tipo
                            const tipoSelect = document.getElementById('activo_tipo_id');
                            if (tipoSelect) tipoSelect.value = activo.tipo_activo_id;
                        }
                    }
                }
            }
        }

        // ============================================
        // LLENAR CAMPOS BÁSICOS
        // ============================================
        
        const nombreInput = document.getElementById('activo_nombre');
        if (nombreInput) {
            nombreInput.value = activo.nombre || '';
            nombreInput.dataset.editadoManualmente = 'true';
        }
        
        const codigoInput = document.getElementById('activo_codigo');
        if (codigoInput) codigoInput.value = activo.codigo_activo || '';
        
        const estadoSelectEl = document.getElementById('activo_estado');
        if (estadoSelectEl) estadoSelectEl.value = activo.estado || 'DISPONIBLE';
        
        const empresaSelectEl = document.getElementById('activo_empresa_id');
        if (empresaSelectEl) empresaSelectEl.value = activo.empresa_id || '';

        // Dar tiempo para que se carguen las ubicaciones
        setTimeout(() => {
            const ubicacionSelectEl = document.getElementById('activo_ubicacion_id');
            if (ubicacionSelectEl && activo.ubicacion_id) {
                ubicacionSelectEl.value = activo.ubicacion_id;
            }
        }, 500);

        // ============================================
        // CARGAR INFORMACIÓN GENERAL
        // ============================================
        
        const { data: infoGeneral } = await window.supabaseClient
            .from('info_general')
            .select('*')
            .eq('activo_id', id)
            .maybeSingle();

        if (infoGeneral) {
            const marcaSelect = document.getElementById('activo_marca_id');
            if (marcaSelect) marcaSelect.value = infoGeneral.marca_id || '';
            
            const modeloInput = document.getElementById('activo_modelo');
            if (modeloInput) modeloInput.value = infoGeneral.modelo || '';
            
            const serieInput = document.getElementById('activo_serie');
            if (serieInput) serieInput.value = infoGeneral.numero_serie || '';
            
            const anoInput = document.getElementById('activo_ano');
            if (anoInput) anoInput.value = infoGeneral.ano_fabricacion || '';
            
            const condicionSelect = document.getElementById('activo_condicion');
            if (condicionSelect) condicionSelect.value = infoGeneral.condicion_fisica || '';
            
            const fechaCompraInput = document.getElementById('activo_fecha_compra');
            if (fechaCompraInput) fechaCompraInput.value = infoGeneral.fecha_compra || '';
            
            const fechaGarantiaInput = document.getElementById('activo_fecha_garantia');
            if (fechaGarantiaInput) fechaGarantiaInput.value = infoGeneral.fecha_garantia || '';
        }

        // ============================================
        // CONFIGURAR EVENTOS
        // ============================================
        
        const empresaSelectFinal = document.getElementById('activo_empresa_id');
        if (empresaSelectFinal) {
            empresaSelectFinal.removeEventListener('change', window.handleActivoEmpresaChange);
            empresaSelectFinal.addEventListener('change', window.handleActivoEmpresaChange);
        }

        configurarEventListenersNombre();
        inicializarValidacionTiempoReal();

        ocultarLoading();
        
        // Abrir modal
        await window.abrirModal('activoModal', () => {
            setTimeout(() => {
                if (typeof actualizarNombreActivo === 'function') {
                    actualizarNombreActivo();
                }
            }, 100);
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error en editarActivo:', error);
        mostrarAlerta('Error', 'No se pudo cargar el activo: ' + (error.message || 'Error desconocido'), 'error');
    }
};

window.eliminarActivo = async function(id) {
    const { count: asignacionesActivas } = await window.supabaseClient
        .from('asignaciones')
        .select('*', { count: 'exact', head: true })
        .eq('activo_id', id)
        .eq('estado', 'ACTIVA');

    if (asignacionesActivas > 0) {
        Swal.fire({
            title: 'No se puede eliminar',
            html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i><p>El activo tiene <strong>${asignacionesActivas} asignación(es) activa(s)</strong>.</p><p class="text-sm text-gray-500 mt-2">Debe devolver el activo antes de poder eliminarlo.</p></div>`,
            icon: 'error',
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar activo?',
        text: 'Esta acción no se puede deshacer. Se eliminarán todos los datos relacionados (software instalado, mantenimientos, etc.).',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        mostrarLoading('Eliminando activo y datos relacionados...');
        try {
            await window.supabaseClient.from('especificaciones_valores').delete().eq('activo_id', id);
            await window.supabaseClient.from('software_instalado').delete().eq('activo_id', id);
            await window.supabaseClient.from('mantenimientos').delete().eq('activo_id', id);
            await window.supabaseClient.from('asignaciones').delete().eq('activo_id', id);
            await window.supabaseClient.from('credenciales').delete().eq('activo_id', id);
            await window.supabaseClient.from('accesos_remotos').delete().eq('activo_id', id);
            await window.supabaseClient.from('tareas_respaldo').delete().eq('activo_id', id);
            await window.supabaseClient.from('configuracion_red').delete().eq('activo_id', id);
            await window.supabaseClient.from('info_general').delete().eq('activo_id', id);
            await window.supabaseClient.from('historial_estados_activos').delete().eq('activo_id', id);
            await window.supabaseClient.from('historial_ubicaciones_activos').delete().eq('activo_id', id);

            const { error } = await window.supabaseClient
                .from('activos')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Activo eliminado correctamente', 'success');
            if (vistaActual === 'activos') await cargarVistaActivos();
            else await cargarVistaActivos();
        } catch (error) {
            ocultarLoading();
            console.error('Error al eliminar activo:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el activo: ' + error.message, 'error');
        }
    }
};

window.guardarActivo = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando activo...');
    
    // Variable para controlar si estamos en modo edición
    const esEdicion = !!editandoId;

    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const tipoId = document.getElementById('activo_tipo_id')?.value;
        if (!tipoId) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un tipo de activo', 'error');
            document.getElementById('activo_tipo_id')?.focus();
            return;
        }

        const ahora = new Date().toISOString();
        const nuevoEstado = document.getElementById('activo_estado')?.value || 'DISPONIBLE';
        const nuevaUbicacionId = document.getElementById('activo_ubicacion_id')?.value || null;
        const empresaId = document.getElementById('activo_empresa_id')?.value || null;
        
        // Obtener valores para validación
        const nombreActivo = document.getElementById('activo_nombre')?.value?.trim() || '';
        const numeroSerie = document.getElementById('activo_serie')?.value?.trim() || '';
        let codigoActivo = document.getElementById('activo_codigo')?.value?.trim() || '';

        // ============================================
        // VALIDACIÓN PREVIA DE UNICIDAD
        // ============================================
        
        if (!esEdicion && !codigoActivo) {
            // Generar código temporal para validación
            const { data: tipo } = await window.supabaseClient
                .from('tipos_activo')
                .select('codigo_prefijo')
                .eq('id', tipoId)
                .single();
            const prefijo = tipo?.codigo_prefijo || 'ACT';
            codigoActivo = `${prefijo}-${Date.now().toString().slice(-6)}`; // Temporal
        }
        
        // Validar unicidad
        const validacion = await validarUnicidadActivo(
            codigoActivo, 
            numeroSerie, 
            esEdicion ? editandoId : null,
            tipoId
        );
        
        if (!validacion.valido) {
            ocultarLoading();
            
            // Mostrar todos los errores encontrados
            let mensajeHtml = '<div class="text-left">';
            validacion.errores.forEach(error => {
                mensajeHtml += `<p class="mb-2"><i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>${error.mensaje}</p>`;
            });
            mensajeHtml += '</div>';
            
            await Swal.fire({
                title: 'No se puede guardar el activo',
                html: mensajeHtml,
                icon: 'error',
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        
        // ============================================
        // PREPARAR DATOS DEL ACTIVO
        // ============================================
        
        // Obtener prefijo para generar código (solo en creación)
        let prefijo = 'ACT';
        if (!esEdicion) {
            const { data: tipo } = await window.supabaseClient
                .from('tipos_activo')
                .select('codigo_prefijo')
                .eq('id', tipoId)
                .single();
            prefijo = tipo?.codigo_prefijo || 'ACT';
        }

        // Función para generar código único (solo en creación)
        const generarCodigoUnico = async () => {
            // Obtener el último número usado para este prefijo
            const { data: ultimoCodigo } = await window.supabaseClient
                .from('activos')
                .select('codigo_activo')
                .like('codigo_activo', `${prefijo}-%`)
                .order('creado_el', { ascending: false })
                .limit(1);
            
            let nuevoNumero = 1;
            if (ultimoCodigo && ultimoCodigo.length > 0 && ultimoCodigo[0].codigo_activo) {
                const partes = ultimoCodigo[0].codigo_activo.split('-');
                if (partes.length > 1) {
                    nuevoNumero = parseInt(partes[1]) + 1;
                }
            }
            
            return `${prefijo}-${nuevoNumero.toString().padStart(4, '0')}`;
        };

        const activoData = {
            tipo_activo_id: tipoId,
            nombre: nombreActivo,
            estado: nuevoEstado,
            ubicacion_id: nuevaUbicacionId,
            empresa_id: empresaId
        };

        let activoId;

        if (esEdicion) {
            // ============================================
            // MODO EDICIÓN
            // ============================================
            activoData.modificado_el = ahora;
            activoData.modificado_por = usuarioActual.id;
            
            // Si el código no está presente, mantener el existente
            if (codigoActivo) {
                activoData.codigo_activo = codigoActivo;
            }
            
            const { error } = await window.supabaseClient
                .from('activos')
                .update(activoData)
                .eq('id', editandoId);
            
            if (error) throw error;
            activoId = editandoId;
            
        } else {
            // ============================================
            // MODO CREACIÓN
            // ============================================
            
            // Generar código único con reintentos
            let codigoGenerado = null;
            let intentos = 0;
            const maxIntentos = 5;
            
            while (!codigoGenerado && intentos < maxIntentos) {
                const posibleCodigo = await generarCodigoUnico();
                
                // Verificar que el código no exista
                const { data: existe } = await window.supabaseClient
                    .from('activos')
                    .select('id')
                    .eq('codigo_activo', posibleCodigo)
                    .maybeSingle();
                
                if (!existe) {
                    codigoGenerado = posibleCodigo;
                }
                intentos++;
            }
            
            if (!codigoGenerado) {
                throw new Error('No se pudo generar un código único después de varios intentos');
            }
            
            activoData.codigo_activo = codigoGenerado;
            activoData.creado_el = ahora;
            activoData.creado_por = usuarioActual.id;
            
            const { data, error } = await window.supabaseClient
                .from('activos')
                .insert(activoData)
                .select()
                .single();
            
            if (error) {
                // Verificar si es error de duplicado (por si acaso)
                if (error.code === '23505') {
                    throw new Error('El código generado ya existe. Por favor, intente nuevamente.');
                }
                throw error;
            }
            activoId = data.id;
            
            // Registrar cambio de estado inicial
            await registrarCambioEstado(activoId, nuevoEstado, { 
                motivo: 'Creación del activo' 
            });
            
            if (nuevaUbicacionId) {
                await registrarCambioUbicacion(activoId, nuevaUbicacionId, {
                    motivo: 'Ubicación inicial del activo'
                });
            }
        }

        // ============================================
        // GUARDAR INFORMACIÓN GENERAL
        // ============================================
        
        const infoData = {
            activo_id: activoId,
            marca_id: document.getElementById('activo_marca_id')?.value || null,
            modelo: document.getElementById('activo_modelo')?.value || '',
            numero_serie: numeroSerie || null,
            ano_fabricacion: document.getElementById('activo_ano')?.value ? parseInt(document.getElementById('activo_ano').value) : null,
            condicion_fisica: document.getElementById('activo_condicion')?.value || '',
            fecha_compra: document.getElementById('activo_fecha_compra')?.value || null,
            fecha_garantia: document.getElementById('activo_fecha_garantia')?.value || null
        };

        const { data: infoExistente } = await window.supabaseClient
            .from('info_general')
            .select('id')
            .eq('activo_id', activoId)
            .maybeSingle();

        if (infoExistente) {
            infoData.modificado_el = ahora;
            infoData.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('info_general')
                .update(infoData)
                .eq('activo_id', activoId);
            if (error) throw error;
        } else {
            infoData.creado_el = ahora;
            infoData.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('info_general')
                .insert(infoData);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', esEdicion ? 'Activo actualizado correctamente' : 'Activo creado correctamente', 'success');
        cerrarModal('activoModal');
        
        // Resetear variable global
        editandoId = null;
        
        // Recargar vista
        if (typeof cargarVistaActivos === 'function') {
            await cargarVistaActivos();
        } else if (typeof window.cargarVistaActivos === 'function') {
            await window.cargarVistaActivos();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error detallado:', error);
        
        let mensajeError = 'No se pudo guardar el activo';
        if (error.message?.includes('código') || error.message?.includes('duplicate') || error.code === '23505') {
            mensajeError = 'Ya existe un activo con ese código. El sistema ha intentado generar uno nuevo. Por favor, intente nuevamente.';
        } else if (error.message?.includes('foreign key')) {
            mensajeError = 'El tipo de activo, empresa o ubicación seleccionada no es válida';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

// ==================== VALIDACIÓN EN TIEMPO REAL ====================
async function validarCampoEnTiempoReal(campo, valor, activoIdExcluir = null) {
    const resultado = { valido: true, mensaje: '' };
    
    if (campo === 'serie' && valor && valor.trim() !== '') {
        let query = window.supabaseClient
            .from('info_general')
            .select('id, activo_id, activo:activo_id (nombre, codigo_activo)')
            .eq('numero_serie', valor.trim());
        
        if (activoIdExcluir) {
            query = query.neq('activo_id', activoIdExcluir);
        }
        
        const { data: existe } = await query.maybeSingle();
        
        if (existe) {
            resultado.valido = false;
            resultado.mensaje = `El número de serie "${valor}" ya está en uso en el activo "${existe.activo?.nombre}"`;
        }
    }
    
    if (campo === 'codigo' && valor && valor.trim() !== '') {
        let query = window.supabaseClient
            .from('activos')
            .select('id, nombre')
            .eq('codigo_activo', valor.trim());
        
        if (activoIdExcluir) {
            query = query.neq('id', activoIdExcluir);
        }
        
        const { data: existe } = await query.maybeSingle();
        
        if (existe) {
            resultado.valido = false;
            resultado.mensaje = `El código "${valor}" ya está en uso en el activo "${existe.nombre}"`;
        }
    }
    
    return resultado;
}

// Agregar event listeners para validación en tiempo real
function inicializarValidacionTiempoReal() {
    const serieInput = document.getElementById('activo_serie');
    const codigoInput = document.getElementById('activo_codigo');
    
    if (serieInput) {
        let timeoutSerie;
        serieInput.addEventListener('input', async function() {
            clearTimeout(timeoutSerie);
            const valor = this.value;
            const errorSpan = document.getElementById('error-serie') || (() => {
                const span = document.createElement('span');
                span.id = 'error-serie';
                span.className = 'text-xs text-red-500 mt-1 block';
                this.parentNode.appendChild(span);
                return span;
            })();
            
            timeoutSerie = setTimeout(async () => {
                if (valor && valor.trim() !== '') {
                    const validacion = await validarCampoEnTiempoReal('serie', valor, editandoId);
                    if (!validacion.valido) {
                        errorSpan.textContent = validacion.mensaje;
                        this.classList.add('border-red-500');
                    } else {
                        errorSpan.textContent = '';
                        this.classList.remove('border-red-500');
                    }
                } else {
                    errorSpan.textContent = '';
                    this.classList.remove('border-red-500');
                }
            }, 500);
        });
    }
    
    if (codigoInput && !editandoId) {
        let timeoutCodigo;
        codigoInput.addEventListener('input', async function() {
            clearTimeout(timeoutCodigo);
            const valor = this.value;
            const errorSpan = document.getElementById('error-codigo') || (() => {
                const span = document.createElement('span');
                span.id = 'error-codigo';
                span.className = 'text-xs text-red-500 mt-1 block';
                this.parentNode.appendChild(span);
                return span;
            })();
            
            timeoutCodigo = setTimeout(async () => {
                if (valor && valor.trim() !== '') {
                    const validacion = await validarCampoEnTiempoReal('codigo', valor, editandoId);
                    if (!validacion.valido) {
                        errorSpan.textContent = validacion.mensaje;
                        this.classList.add('border-red-500');
                    } else {
                        errorSpan.textContent = '';
                        this.classList.remove('border-red-500');
                    }
                } else {
                    errorSpan.textContent = '';
                    this.classList.remove('border-red-500');
                }
            }, 500);
        });
    }
}

// Función auxiliar para generar código único
async function generarCodigoUnico(prefijo, intento = 0) {
    if (intento > 5) throw new Error('No se pudo generar un código único');
    
    // Obtener el último número usado para este prefijo
    const { data: ultimoCodigo } = await window.supabaseClient
        .from('activos')
        .select('codigo_activo')
        .like('codigo_activo', `${prefijo}-%`)
        .order('codigo_activo', { ascending: false })
        .limit(1);
    
    let nuevoNumero = 1;
    if (ultimoCodigo && ultimoCodigo.length > 0) {
        const ultimoNumero = parseInt(ultimoCodigo[0].codigo_activo.split('-')[1]);
        nuevoNumero = ultimoNumero + 1;
    }
    
    const nuevoCodigo = `${prefijo}-${nuevoNumero.toString().padStart(4, '0')}`;
    
    // Verificar que el código no exista (por si acaso)
    const { data: existe } = await window.supabaseClient
        .from('activos')
        .select('id')
        .eq('codigo_activo', nuevoCodigo)
        .maybeSingle();
    
    if (existe) {
        // Si existe, intentar de nuevo con el siguiente número
        return generarCodigoUnico(prefijo, intento + 1);
    }
    
    return nuevoCodigo;
}

// ==================== VALIDAR UNICIDAD DE CÓDIGO Y SERIE ====================
async function validarUnicidadActivo(codigoActivo, numeroSerie, activoIdExcluir = null, tipoActivoId = null) {
    const errores = [];
    
    // Validar código de activo único
    if (codigoActivo) {
        let query = window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo')
            .eq('codigo_activo', codigoActivo);
        
        if (activoIdExcluir) {
            query = query.neq('id', activoIdExcluir);
        }
        
        const { data: existeCodigo, error } = await query.maybeSingle();
        
        if (existeCodigo) {
            errores.push({
                campo: 'codigo',
                mensaje: `El código ${codigoActivo} ya está en uso por el activo "${existeCodigo.nombre}"`
            });
        }
    }
    
    // Validar número de serie único (si se proporciona)
    if (numeroSerie && numeroSerie.trim() !== '') {
        let query = window.supabaseClient
            .from('info_general')
            .select(`
                id,
                numero_serie,
                activo:activo_id (
                    id,
                    nombre,
                    codigo_activo,
                    tipo_activo_id,
                    tipos_activo (nombre)
                )
            `)
            .eq('numero_serie', numeroSerie);
        
        if (activoIdExcluir) {
            query = query.neq('activo_id', activoIdExcluir);
        }
        
        // Si se proporciona tipoActivoId, verificar que no sea del mismo tipo
        const { data: serieExistente, error } = await query.maybeSingle();
        
        if (serieExistente) {
            const tipoActivoExistente = serieExistente.activo?.tipos_activo?.nombre || 'desconocido';
            errores.push({
                campo: 'serie',
                mensaje: `El número de serie ${numeroSerie} ya está registrado en el activo "${serieExistente.activo?.nombre}" (Tipo: ${tipoActivoExistente})`
            });
        }
    }
    
    return {
        valido: errores.length === 0,
        errores: errores
    };
}

// Funciones auxiliares de activos
window.cargarSubcategoriasActivo = async function() {
    const categoriaId = document.getElementById('activo_categoria_id').value;

    if (!categoriaId) {
        const subcategoriaSelect = document.getElementById('activo_subcategoria_id');
        if (subcategoriaSelect) subcategoriaSelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('subcategorias')
            .select('id, nombre')
            .eq('categoria_id', categoriaId)
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        const subcategoriaSelect = document.getElementById('activo_subcategoria_id');
        if (subcategoriaSelect) {
            subcategoriaSelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';
            data?.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.nombre;
                subcategoriaSelect.appendChild(option);
            });
            subcategoriaSelect.disabled = false;
            
            // Limpiar tipos cuando cambia la subcategoría
            const tipoSelect = document.getElementById('activo_tipo_id');
            if (tipoSelect) {
                tipoSelect.innerHTML = '<option value="">Seleccionar tipo</option>';
                tipoSelect.disabled = true;
            }
        }
    } catch (error) {
        console.error('Error cargando subcategorías:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las subcategorías', 'error');
    }
};

window.cargarTiposActivo = async function() {
    const subcategoriaId = document.getElementById('activo_subcategoria_id').value;

    if (!subcategoriaId) {
        const select = document.getElementById('activo_tipo_id');
        if (select) select.innerHTML = '<option value="">Seleccionar tipo</option>';
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('tipos_activo')
            .select('id, nombre, codigo_prefijo')
            .eq('subcategoria_id', subcategoriaId)
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        const select = document.getElementById('activo_tipo_id');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar tipo</option>';
            data?.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.id;
                let texto = tipo.nombre;
                if (tipo.codigo_prefijo) texto += ` (${tipo.codigo_prefijo})`;
                option.textContent = texto;
                select.appendChild(option);
            });
            select.disabled = false;
        }
    } catch (error) {
        console.error('Error cargando tipos:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los tipos de activo', 'error');
    }
};

function handleTipoChange(event) {
    if (!event || !event.target) return;
    const nombreInput = document.getElementById('activo_nombre');
    if (nombreInput && nombreInput.dataset.editadoManualmente !== 'true') {
        actualizarNombreActivo();
    }
}

function generarNombreActivo() {
    const tipoSelect = document.getElementById('activo_tipo_id');
    let tipoText = '';
    if (tipoSelect && tipoSelect.selectedOptions && tipoSelect.selectedOptions[0]) {
        tipoText = tipoSelect.selectedOptions[0].text.split('(')[0].trim();
    }

    const marcaSelect = document.getElementById('activo_marca_id');
    let marcaText = '';
    if (marcaSelect && marcaSelect.value && marcaSelect.value !== '') {
        const selectedOption = marcaSelect.selectedOptions;
        if (selectedOption && selectedOption[0]) {
            marcaText = selectedOption[0].text;
        }
    }

    const modeloInput = document.getElementById('activo_modelo');
    const modelo = modeloInput ? modeloInput.value.trim() : '';

    const serieInput = document.getElementById('activo_serie');
    const serie = serieInput ? serieInput.value.trim() : '';

    let nombreGenerado = '';

    if (tipoText && tipoText !== 'Seleccionar tipo' && marcaText && marcaText !== 'Seleccionar marca' && modelo) {
        nombreGenerado = `${tipoText} - ${marcaText} ${modelo}`;
    } else if (tipoText && tipoText !== 'Seleccionar tipo' && marcaText && marcaText !== 'Seleccionar marca') {
        nombreGenerado = `${tipoText} - ${marcaText}`;
    } else if (tipoText && tipoText !== 'Seleccionar tipo' && modelo) {
        nombreGenerado = `${tipoText} - ${modelo}`;
    } else if (tipoText && tipoText !== 'Seleccionar tipo') {
        nombreGenerado = tipoText;
    } else if (marcaText && marcaText !== 'Seleccionar marca' && modelo) {
        nombreGenerado = `${marcaText} ${modelo}`;
    } else if (marcaText && marcaText !== 'Seleccionar marca') {
        nombreGenerado = marcaText;
    } else if (modelo) {
        nombreGenerado = modelo;
    } else {
        const codigoInput = document.getElementById('activo_codigo');
        const codigo = codigoInput ? codigoInput.value : '';
        nombreGenerado = codigo ? `Activo ${codigo}` : 'Activo nuevo';
    }

    if (serie && !nombreGenerado.includes(serie)) {
        if (nombreGenerado.length > 50) nombreGenerado = nombreGenerado.substring(0, 50) + '...';
        nombreGenerado += ` - S/N: ${serie}`;
    }

    return nombreGenerado;
}

// ==================== ABRIR MODAL NUEVO ACTIVO ====================
window.abrirModalNuevoActivo = async function() {
    console.log('🎯 Abriendo modal para nuevo activo');

    try {
        const modal = document.getElementById('activoModal');
        if (modal && !modal.classList.contains('hidden')) {
            window.cerrarModal('activoModal');
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        editandoId = null;

        const form = document.getElementById('activoForm');
        if (form) form.reset();

        const titleElement = document.getElementById('activoModalTitle');
        if (titleElement) titleElement.innerText = 'Nuevo Activo';

        // Resetear campos del formulario
        const nombreInput = document.getElementById('activo_nombre');
        if (nombreInput) {
            nombreInput.value = '';
            nombreInput.dataset.editadoManualmente = 'false';
            nombreInput.dataset.ultimoGenerado = '';
        }

        const estadoSelect = document.getElementById('activo_estado');
        if (estadoSelect) estadoSelect.value = 'DISPONIBLE';

        const ubicacionSelect = document.getElementById('activo_ubicacion_id');
        if (ubicacionSelect) {
            ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
            ubicacionSelect.disabled = true;
        }

        const subcategoriaSelect = document.getElementById('activo_subcategoria_id');
        const tipoSelect = document.getElementById('activo_tipo_id');
        if (subcategoriaSelect) subcategoriaSelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';
        if (tipoSelect) tipoSelect.innerHTML = '<option value="">Seleccionar tipo</option>';

        // Limpiar mensajes de error previos
        const errorSerie = document.getElementById('error-serie');
        if (errorSerie) errorSerie.remove();
        
        const errorCodigo = document.getElementById('error-codigo');
        if (errorCodigo) errorCodigo.remove();

        // Cargar selects principales
        try {
            await Promise.all([
                cargarCategoriasSelect(),
                window.cargarMarcasSelect('activo_marca_id'),
                cargarEmpresasSelect('activo_empresa_id')
            ]);
        } catch (error) {
            console.error('❌ Error cargando selects:', error);
        }

        // Configurar evento change de empresa
        const empresaSelect = document.getElementById('activo_empresa_id');
        if (empresaSelect) {
            empresaSelect.removeEventListener('change', window.handleActivoEmpresaChange);
            empresaSelect.addEventListener('change', window.handleActivoEmpresaChange);
        }

        // Configurar event listeners para validación en tiempo real
        configurarEventListenersNombre();
        inicializarValidacionTiempoReal();

        // Abrir modal
        await window.abrirModal('activoModal', () => {
            setTimeout(() => {
                if (typeof actualizarNombreActivo === 'function') {
                    actualizarNombreActivo();
                }
                // Enfocar primer campo
                const primerCampo = document.getElementById('activo_categoria_id');
                if (primerCampo) primerCampo.focus();
            }, 100);
        });

    } catch (error) {
        console.error('❌ Error al abrir modal:', error);
        mostrarAlerta('Error', 'No se pudo abrir el formulario', 'error');
    }
};

window.handleActivoEmpresaChange = async function(event) {
    const empresaId = event.target.value;
    const ubicacionSelect = document.getElementById('activo_ubicacion_id');
    
    if (!ubicacionSelect) return;

    if (!empresaId) {
        ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
        ubicacionSelect.disabled = true;
        return;
    }

    ubicacionSelect.innerHTML = '<option value="">Cargando ubicaciones...</option>';
    ubicacionSelect.disabled = true;

    try {
        await window.cargarUbicacionesPorEmpresa(empresaId, 'activo_ubicacion_id');
    } catch (error) {
        console.error('❌ Error:', error);
        ubicacionSelect.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
    } finally {
        ubicacionSelect.disabled = false;
    }
};

function configurarEventListenersNombre() {
    const camposNombre = [
        { id: 'activo_tipo_id', tipo: 'select' },
        { id: 'activo_marca_id', tipo: 'select' },
        { id: 'activo_modelo', tipo: 'input' },
        { id: 'activo_serie', tipo: 'input' }
    ];

    camposNombre.forEach(campo => {
        const elemento = document.getElementById(campo.id);
        if (!elemento) return;

        elemento.removeEventListener('change', handleCampoChange);
        elemento.removeEventListener('input', handleCampoInput);

        if (campo.tipo === 'select') {
            elemento.addEventListener('change', function(evt) { handleCampoChange(evt); });
        } else {
            elemento.addEventListener('change', function(evt) { handleCampoChange(evt); });
            let timeout;
            elemento.addEventListener('input', function(evt) {
                clearTimeout(timeout);
                timeout = setTimeout(() => { handleCampoInput(evt); }, 400);
            });
        }
    });

    const nombreInput = document.getElementById('activo_nombre');
    if (nombreInput) {
        nombreInput.removeEventListener('focus', marcarEdicionManual);
        nombreInput.removeEventListener('keyup', marcarEdicionManual);
        nombreInput.removeEventListener('click', marcarEdicionManual);
        nombreInput.addEventListener('focus', marcarEdicionManual);
        nombreInput.addEventListener('keyup', marcarEdicionManual);
        nombreInput.addEventListener('click', marcarEdicionManual);
    }
}

function handleCampoChange(event) {
    if (!event || !event.target) return;
    const nombreInput = document.getElementById('activo_nombre');
    if (nombreInput && nombreInput.dataset.editadoManualmente !== 'true') {
        actualizarNombreActivo();
    }
}

function handleCampoInput(event) {
    if (!event || !event.target) return;
    const nombreInput = document.getElementById('activo_nombre');
    if (nombreInput && nombreInput.dataset.editadoManualmente !== 'true') {
        actualizarNombreActivo();
    }
}

function marcarEdicionManual() {
    const nombreInput = document.getElementById('activo_nombre');
    if (nombreInput && nombreInput.dataset.editadoManualmente !== 'true') {
        nombreInput.dataset.editadoManualmente = 'true';
    }
}

// ==================== ELIMINAR ESPECIFICACIÓN ====================
window.eliminarEspecificacion = async function(especificacionId, activoId) {
    // 🔴 PASO 1: Cerrar el modal de SweetAlert si está abierto
    const swalModal = document.querySelector('.swal2-container');
    if (swalModal && swalModal.style.display !== 'none') {
        console.log('🔒 Cerrando modal de SweetAlert...');
        Swal.close();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const result = await Swal.fire({
        title: '¿Eliminar especificación?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        mostrarLoading('Eliminando especificación...');
        
        try {
            const { error } = await window.supabaseClient
                .from('especificaciones_valores')
                .delete()
                .eq('id', especificacionId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Especificación eliminada correctamente', 'success');
            
            // Recargar la vista de activos para actualizar el contador
            if (typeof cargarVistaActivos === 'function') {
                await cargarVistaActivos();
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error al eliminar especificación:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la especificación: ' + error.message, 'error');
        }
    }
};

// ==================== EDITAR ESPECIFICACIÓN ====================
window.editarEspecificacion = async function(especificacionId, activoId) {
    console.log('✏️ Editando especificación ID:', especificacionId);
    
    // 🔴 PASO 1: Cerrar el modal de SweetAlert si está abierto
    const swalModal = document.querySelector('.swal2-container');
    if (swalModal && swalModal.style.display !== 'none') {
        console.log('🔒 Cerrando modal de SweetAlert...');
        Swal.close();
        // Esperar a que se cierre completamente
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    try {
        // Obtener los datos de la especificación
        const { data: especificacion, error } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`*, atributo:atributo_id (id, nombre_atributo, tipo_dato, unidad_medida, requerido)`)
            .eq('id', especificacionId)
            .single();
        
        if (error) throw error;
        
        // Verificar que el modal existe, si no, crearlo
        let modal = document.getElementById('especificacionModal');
        if (!modal) {
            console.log('📦 Modal no encontrado, creándolo...');
            if (typeof window.crearModalEspecificacion === 'function') {
                window.crearModalEspecificacion();
                modal = document.getElementById('especificacionModal');
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.error('❌ No se puede crear el modal de especificación');
                mostrarAlerta('Error', 'No se puede abrir el editor', 'error');
                return;
            }
        }
        
        // Cerrar modal de especificación si está abierto
        if (modal && !modal.classList.contains('hidden')) {
            window.cerrarModal('especificacionModal');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Configurar modo edición
        editandoId = especificacionId;
        
        const titleElement = document.getElementById('especificacionModalTitle');
        if (titleElement) titleElement.innerHTML = '<i class="fas fa-edit mr-2"></i>Editar Especificación';
        
        // Establecer IDs
        const activoIdField = document.getElementById('especificacion_activo_id');
        if (activoIdField) activoIdField.value = activoId;
        
        const especIdField = document.getElementById('especificacion_id');
        if (especIdField) especIdField.value = especificacionId;
        
        // Obtener el tipo de activo para cargar los atributos
        const { data: activo, error: errorActivo } = await window.supabaseClient
            .from('activos')
            .select('tipo_activo_id')
            .eq('id', activoId)
            .single();
        
        if (errorActivo) throw errorActivo;
        
        if (activo && activo.tipo_activo_id) {
            if (typeof window.cargarAtributosPorTipoActivoModal === 'function') {
                await window.cargarAtributosPorTipoActivoModal(activo.tipo_activo_id, 'especificacion_atributo_id');
            }
        }
        
        // Seleccionar el atributo correcto
        const atributoSelect = document.getElementById('especificacion_atributo_id');
        if (atributoSelect) {
            atributoSelect.value = especificacion.atributo_id;
            // Disparar el evento change para mostrar el campo correcto
            const changeEvent = new Event('change');
            atributoSelect.dispatchEvent(changeEvent);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Llenar el valor según el tipo de dato
        const tipoDato = especificacion.atributo?.tipo_dato;
        
        // Ocultar todos los campos primero
        const campos = ['esp_campo_texto', 'esp_campo_numero', 'esp_campo_booleano', 'esp_campo_fecha'];
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.classList.add('hidden');
        });
        
        if (tipoDato === 'texto') {
            const campo = document.getElementById('esp_campo_texto');
            if (campo) campo.classList.remove('hidden');
            const input = document.getElementById('esp_valor_texto');
            if (input) input.value = especificacion.valor_texto || '';
        } else if (tipoDato === 'numero') {
            const campo = document.getElementById('esp_campo_numero');
            if (campo) campo.classList.remove('hidden');
            const input = document.getElementById('esp_valor_numero');
            if (input) input.value = especificacion.valor_numero || '';
            const unidadSpan = document.getElementById('esp_valor_numero_unidad');
            if (unidadSpan && especificacion.atributo?.unidad_medida) {
                unidadSpan.innerText = `(${especificacion.atributo.unidad_medida})`;
            }
        } else if (tipoDato === 'booleano') {
            const campo = document.getElementById('esp_campo_booleano');
            if (campo) campo.classList.remove('hidden');
            const selectBool = document.getElementById('esp_valor_booleano');
            if (selectBool) selectBool.value = especificacion.valor_booleano ? 'true' : 'false';
        } else if (tipoDato === 'fecha') {
            const campo = document.getElementById('esp_campo_fecha');
            if (campo) campo.classList.remove('hidden');
            const input = document.getElementById('esp_valor_fecha');
            if (input) input.value = especificacion.valor_fecha || '';
        }
        
        // Abrir el modal
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.offsetHeight;
            console.log('✅ Modal de edición de especificación abierto correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error al cargar especificación para editar:', error);
        mostrarAlerta('Error', 'No se pudo cargar la especificación para editar: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== VER DETALLE COMPLETO DEL ACTIVO ====================
window.verDetalleActivo = async function(id) {
    mostrarLoading('Cargando detalles del activo...');
    
    try {
        console.log('🔍 Cargando detalles del activo ID:', id);

        // ===== SECCIÓN 1: DATOS BÁSICOS DEL ACTIVO =====
        const { data: activo, error } = await window.supabaseClient
            .from('activos')
            .select(`
                *,
                ubicacion:ubicacion_id (id, nombre, descripcion),
                empresa:empresa_id (id, nombre, ruc)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // ===== SECCIÓN 2: TIPO DE ACTIVO =====
        let tipoNombre = 'No especificado';
        if (activo.tipo_activo_id) {
            const { data: tipo } = await window.supabaseClient
                .from('tipos_activo')
                .select('nombre')
                .eq('id', activo.tipo_activo_id)
                .single();
            if (tipo) tipoNombre = tipo.nombre;
        }

        // ===== SECCIÓN 3: INFORMACIÓN GENERAL =====
        let marcaNombre = 'No especificada', modelo = 'No especificado', serie = 'No especificada';
        let condicion = 'No especificada', anoFabricacion = 'No especificado';
        let fechaCompra = 'No registrada', fechaGarantia = 'No registrada';

        const { data: infoGeneral } = await window.supabaseClient
            .from('info_general')
            .select(`*, marca:marca_id (id, nombre)`)
            .eq('activo_id', id)
            .maybeSingle();

        if (infoGeneral) {
            modelo = infoGeneral.modelo || 'No especificado';
            serie = infoGeneral.numero_serie || 'No especificada';
            anoFabricacion = infoGeneral.ano_fabricacion || 'No especificado';
            fechaCompra = infoGeneral.fecha_compra ? new Date(infoGeneral.fecha_compra).toLocaleDateString('es-ES') : 'No registrada';
            fechaGarantia = infoGeneral.fecha_garantia ? new Date(infoGeneral.fecha_garantia).toLocaleDateString('es-ES') : 'No registrada';
            if (infoGeneral.marca) marcaNombre = infoGeneral.marca.nombre || 'No especificada';
            if (infoGeneral.condicion_fisica) {
                const condicionMap = { 'EXCELENTE': 'Excelente', 'BUENO': 'Bueno', 'REGULAR': 'Regular', 'MALO': 'Malo', 'POR_REPARAR': 'Por reparar' };
                condicion = condicionMap[infoGeneral.condicion_fisica] || infoGeneral.condicion_fisica;
            }
        }

        // ===== SECCIÓN 4: CONFIGURACIÓN DE RED (SIN BOTÓN EDITAR) =====
        let ip = 'No configurada', mac = 'No configurada', hostname = 'No configurado';
        let gateway = 'No configurado', dns = 'No configurado', tipoIp = 'No especificado', mascara = 'No configurada';

        const { data: red } = await window.supabaseClient
            .from('configuracion_red')
            .select('*')
            .eq('activo_id', id)
            .maybeSingle();

        if (red) {
            ip = red.ipv4_direccion || 'No configurada';
            mac = red.mac_direccion || 'No configurada';
            hostname = red.hostname || 'No configurado';
            gateway = red.ipv4_puerta_enlace || 'No configurado';
            tipoIp = red.ipv4_tipo || 'No especificado';
            mascara = red.ipv4_mascara || 'No configurada';
            if (red.dns_primario || red.dns_secundario) dns = `${red.dns_primario || ''} ${red.dns_secundario ? '· ' + red.dns_secundario : ''}`;
        }

        // ===== SECCIÓN 5: ESPECIFICACIONES TÉCNICAS (SIN BOTÓN AGREGAR) =====
        const { data: especificaciones } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`*, atributo:atributo_id (*)`)
            .eq('activo_id', id)
            .order('atributo_id', { ascending: true });

        // ===== SECCIÓN 6: ASIGNACIÓN ACTIVA (SIN BOTÓN DEVOLVER) =====
        const { data: asignacion } = await window.supabaseClient
            .from('asignaciones')
            .select(`*, empleado:empleado_id (*), asignador:asignado_por (id, correo)`)
            .eq('activo_id', id)
            .eq('estado', 'ACTIVA')
            .maybeSingle();

        // ===== SECCIÓN 7: SOFTWARE INSTALADO (SIN BOTÓN AGREGAR) =====
        const { data: softwareInstalado } = await window.supabaseClient
            .from('software_instalado')
            .select(`*, software:software_id (id, nombre, fabricante), instalador:instalado_por (id, correo, empleado_id)`)
            .eq('activo_id', id)
            .eq('estado', 'INSTALADO')
            .order('fecha_instalacion', { ascending: false })
            .limit(5);

        // Obtener nombres de empleados para software
        const empleadosMapSoftware = new Map();
        const usuariosConEmpleadoSoftware = softwareInstalado?.filter(s => s.instalador?.empleado_id).map(s => s.instalador.empleado_id) || [];
        if (usuariosConEmpleadoSoftware.length > 0) {
            const { data: empleados } = await window.supabaseClient
                .from('empleados')
                .select('id, nombre_completo')
                .in('id', usuariosConEmpleadoSoftware);
            empleados?.forEach(e => empleadosMapSoftware.set(e.id, e.nombre_completo));
        }

        // ===== SECCIÓN 8: CREDENCIALES (SIN BOTÓN AGREGAR) =====
        const { data: credenciales } = await window.supabaseClient
            .from('credenciales')
            .select('*')
            .eq('activo_id', id)
            .eq('activo', true)
            .order('es_principal', { ascending: false })
            .limit(5);

        // ===== SECCIÓN 9: ACCESOS REMOTOS (SIN BOTÓN AGREGAR) =====
        const { data: accesos } = await window.supabaseClient
            .from('accesos_remotos')
            .select('*')
            .eq('activo_id', id)
            .eq('activo', true)
            .limit(5);

        // ===== SECCIÓN 10: TAREAS DE RESPALDO (SIN BOTÓN AGREGAR) =====
        const { data: respaldos } = await window.supabaseClient
            .from('tareas_respaldo')
            .select('*')
            .eq('activo_id', id)
            .eq('activo', true)
            .limit(5);

        // ===== SECCIÓN 11: MANTENIMIENTOS RECIENTES (SIN BOTÓN AGREGAR) =====
        const { data: mantenimientos } = await window.supabaseClient
            .from('mantenimientos')
            .select(`*`)
            .eq('activo_id', id)
            .order('fecha_solicitud', { ascending: false })
            .limit(5);

        // ===== SECCIÓN 12: AUDITORÍA =====
        const creadorInfo = await obtenerInfoUsuarioConEmpleado(activo.creado_por);
        const modificadorInfo = activo.modificado_por ? await obtenerInfoUsuarioConEmpleado(activo.modificado_por) : null;

        ocultarLoading();

        // ===== SECCIÓN 13: GENERAR HTML DE ESPECIFICACIONES (SIN BOTÓN AGREGAR) =====
        let especificacionesHtml = '';
        if (especificaciones && especificaciones.length > 0) {
            especificacionesHtml = '<div class="grid grid-cols-2 gap-x-4 gap-y-2">';
            const especificacionesList = especificaciones.map(esp => {
                let valorMostrado = '';
                if (esp.valor_texto) valorMostrado = esp.valor_texto;
                else if (esp.valor_numero !== null) valorMostrado = esp.valor_numero + (esp.atributo?.unidad_medida ? ' ' + esp.atributo.unidad_medida : '');
                else if (esp.valor_booleano !== null) valorMostrado = esp.valor_booleano ? 'Sí' : 'No';
                else if (esp.valor_fecha) valorMostrado = new Date(esp.valor_fecha).toLocaleDateString('es-ES');
                return { nombre: esp.atributo?.nombre_atributo || 'Atributo', valor: valorMostrado };
            });
            const mitad = Math.ceil(especificacionesList.length / 2);
            especificacionesHtml += '<div class="space-y-2">';
            especificacionesList.slice(0, mitad).forEach(esp => {
                especificacionesHtml += `<div class="flex justify-between border-b border-gray-100 pb-1"><span class="font-medium text-gray-600">${esp.nombre}:</span><span class="text-primary font-medium">${esp.valor}</span></div>`;
            });
            especificacionesHtml += '</div><div class="space-y-2">';
            especificacionesList.slice(mitad).forEach(esp => {
                especificacionesHtml += `<div class="flex justify-between border-b border-gray-100 pb-1"><span class="font-medium text-gray-600">${esp.nombre}:</span><span class="text-primary font-medium">${esp.valor}</span></div>`;
            });
            especificacionesHtml += '</div></div>';
        } else {
            especificacionesHtml = '<p class="text-gray-400 italic">No hay especificaciones técnicas registradas para este activo.</p>';
        }

        // ===== SECCIÓN 14: GENERAR HTML DE SOFTWARE (SIN BOTÓN AGREGAR) =====
        let softwareHtml = '';
        if (softwareInstalado && softwareInstalado.length > 0) {
            softwareInstalado.forEach(sw => {
                let nombreInstalador = 'No especificado';
                if (sw.instalador) {
                    if (sw.instalador.empleado_id && empleadosMapSoftware.has(sw.instalador.empleado_id)) {
                        nombreInstalador = empleadosMapSoftware.get(sw.instalador.empleado_id);
                    } else {
                        nombreInstalador = sw.instalador.correo || 'No especificado';
                    }
                }
                softwareHtml += `
                    <div class="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div>
                            <span class="font-medium">${sw.software?.nombre || 'Software'}</span>
                            <span class="text-xs text-gray-500 ml-2">v${sw.version_instalada || 'N/A'}</span>
                            <div class="text-xs text-gray-400">Instalado por: ${nombreInstalador}</div>
                        </div>
                        <span class="text-xs text-gray-400">${sw.fecha_instalacion ? new Date(sw.fecha_instalacion).toLocaleDateString() : 'N/A'}</span>
                    </div>
                `;
            });
            if (softwareInstalado.length >= 5) {
                softwareHtml += `<div class="text-center mt-2"><span class="text-xs text-gray-400">Mostrando los últimos 5 registros</span></div>`;
            }
        } else {
            softwareHtml = '<p class="text-gray-400 italic text-center">No hay software instalado</p>';
        }

        // ===== SECCIÓN 15: GENERAR HTML DE CREDENCIALES (SIN BOTÓN AGREGAR) =====
        let credencialesHtml = '';
        if (credenciales && credenciales.length > 0) {
            credenciales.forEach(c => {
                const icono = c.tipo === 'WINDOWS' ? 'fa-windows' : 'fa-envelope';
                credencialesHtml += `
                    <div class="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div>
                            <i class="fab ${icono} text-primary text-xs mr-1"></i>
                            <span class="text-sm">${c.usuario}</span>
                            ${c.es_principal ? '<span class="text-xs text-yellow-600 ml-1"><i class="fas fa-star"></i></span>' : ''}
                        </div>
                        <span class="text-xs ${c.activo ? 'text-green-600' : 'text-gray-400'}">${c.activo ? 'Activa' : 'Inactiva'}</span>
                    </div>
                `;
            });
            if (credenciales.length >= 5) {
                credencialesHtml += `<div class="text-center mt-2"><span class="text-xs text-gray-400">Mostrando los últimos 5 registros</span></div>`;
            }
        } else {
            credencialesHtml = '<p class="text-gray-400 italic text-center">No hay credenciales</p>';
        }

        // ===== SECCIÓN 16: GENERAR HTML DE ACCESOS REMOTOS (SIN BOTÓN AGREGAR) =====
        let accesosHtml = '';
        if (accesos && accesos.length > 0) {
            accesos.forEach(a => {
                accesosHtml += `
                    <div class="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div>
                            <span class="text-sm">${a.perfil_nombre || 'Sin perfil'}</span>
                            <span class="text-xs text-gray-500 ml-1">ID: ${a.puesto_trabajo || 'N/A'}</span>
                        </div>
                        <span class="text-xs text-gray-400">${a.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                `;
            });
            if (accesos.length >= 5) {
                accesosHtml += `<div class="text-center mt-2"><span class="text-xs text-gray-400">Mostrando los últimos 5 registros</span></div>`;
            }
        } else {
            accesosHtml = '<p class="text-gray-400 italic text-center">No hay accesos remotos</p>';
        }

        // ===== SECCIÓN 17: GENERAR HTML DE TAREAS DE RESPALDO (SIN BOTÓN AGREGAR) =====
        let respaldosHtml = '';
        const tipoRespaldoMap = { 'COMPLETO': 'Completo', 'INCREMENTAL': 'Incremental', 'DIFERENCIAL': 'Diferencial' };
        if (respaldos && respaldos.length > 0) {
            respaldos.forEach(r => {
                respaldosHtml += `
                    <div class="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div>
                            <span class="text-sm">${r.nombre_tarea}</span>
                            <span class="text-xs text-gray-500 ml-1">${tipoRespaldoMap[r.tipo_respaldo] || r.tipo_respaldo}</span>
                        </div>
                        <span class="text-xs ${r.activo ? 'text-green-600' : 'text-gray-400'}">${r.activo ? 'Activa' : 'Inactiva'}</span>
                    </div>
                `;
            });
            if (respaldos.length >= 5) {
                respaldosHtml += `<div class="text-center mt-2"><span class="text-xs text-gray-400">Mostrando los últimos 5 registros</span></div>`;
            }
        } else {
            respaldosHtml = '<p class="text-gray-400 italic text-center">No hay tareas de respaldo</p>';
        }

        // ===== SECCIÓN 18: GENERAR HTML DE MANTENIMIENTOS (SIN BOTÓN AGREGAR) =====
        let mantenimientosHtml = '';
        if (mantenimientos && mantenimientos.length > 0) {
            mantenimientos.forEach(m => {
                const resultadoClass = { 'EXITOSO': 'text-green-600', 'PENDIENTE': 'text-yellow-600', 'NO_REPARADO': 'text-red-600' }[m.resultado] || 'text-gray-600';
                mantenimientosHtml += `
                    <div class="flex justify-between items-center py-1 border-b last:border-b-0">
                        <div>
                            <span class="font-medium text-sm">${m.tipo || 'Mantenimiento'}</span>
                            <span class="text-xs text-gray-500 ml-1">${m.fecha_solicitud ? new Date(m.fecha_solicitud).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <span class="text-xs ${resultadoClass}">${m.resultado || 'PENDIENTE'}</span>
                    </div>
                `;
            });
            if (mantenimientos.length >= 5) {
                mantenimientosHtml += `<div class="text-center mt-2"><span class="text-xs text-gray-400">Mostrando los últimos 5 registros</span></div>`;
            }
        } else {
            mantenimientosHtml = '<p class="text-gray-400 italic text-center">No hay mantenimientos registrados</p>';
        }

        // ===== SECCIÓN 19: ESTADO DE GARANTÍA =====
        let garantiaStatus = '', garantiaClass = '', garantiaTooltip = '';
        if (infoGeneral?.fecha_garantia) {
            const fechaGarantiaObj = new Date(infoGeneral.fecha_garantia);
            const hoy = new Date();
            const diasRestantes = Math.ceil((fechaGarantiaObj - hoy) / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) {
                garantiaStatus = 'Vencida';
                garantiaClass = 'text-red-600 bg-red-50';
                garantiaTooltip = `Vencida el ${new Date(infoGeneral.fecha_garantia).toLocaleDateString()}`;
            } else if (diasRestantes < 30) {
                garantiaStatus = `Vence en ${diasRestantes} días`;
                garantiaClass = 'text-orange-600 bg-orange-50';
                garantiaTooltip = `Vence el ${new Date(infoGeneral.fecha_garantia).toLocaleDateString()}`;
            } else {
                garantiaStatus = 'Vigente';
                garantiaClass = 'text-green-600 bg-green-50';
                garantiaTooltip = `Vigente hasta ${new Date(infoGeneral.fecha_garantia).toLocaleDateString()}`;
            }
        }

        // ===== SECCIÓN 20: GENERAR HTML DEL MODAL (SIN BOTONES DE ACCIÓN) =====
        Swal.fire({
            title: `<span class="text-primary">${activo.nombre || 'Sin nombre'}</span>`,
            width: '1100px',
            html: `
                <div class="text-left space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    <!-- INFORMACIÓN GENERAL -->
                    <div class="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border-l-4 border-primary">
                        <h3 class="font-bold text-primary mb-3 flex items-center gap-2">
                            <i class="fas fa-info-circle"></i> Información General
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div><span class="font-semibold">Código:</span> ${activo.codigo_activo || 'N/A'}</div>
                            <div><span class="font-semibold">Tipo:</span> ${tipoNombre}</div>
                            <div><span class="font-semibold">Estado:</span> 
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold estado-${activo.estado || 'DISPONIBLE'}">
                                    ${activo.estado || 'DISPONIBLE'}
                                </span>
                            </div>
                            <div><span class="font-semibold">Marca:</span> ${marcaNombre}</div>
                            <div><span class="font-semibold">Modelo:</span> ${modelo}</div>
                            <div><span class="font-semibold">Serie:</span> <span class="font-mono text-xs">${serie}</span></div>
                            <div><span class="font-semibold">Año Fabricación:</span> ${anoFabricacion}</div>
                            <div><span class="font-semibold">Condición:</span> ${condicion}</div>
                            ${garantiaStatus ? `
                                <div class="col-span-2 md:col-span-1">
                                    <span class="font-semibold">Garantía:</span>
                                    <span class="ml-1 px-2 py-0.5 rounded-full text-xs ${garantiaClass}" title="${garantiaTooltip}">
                                        ${garantiaStatus}
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- UBICACIÓN Y EMPRESA -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-secondary">
                            <h3 class="font-bold text-secondary mb-2 flex items-center gap-2">
                                <i class="fas fa-map-marker-alt"></i> Ubicación
                            </h3>
                            <p class="font-medium">${activo.ubicacion?.nombre || 'No especificada'}</p>
                            ${activo.ubicacion?.descripcion ? `<p class="text-sm text-gray-600 mt-1">${activo.ubicacion.descripcion}</p>` : ''}
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info">
                            <h3 class="font-bold text-info mb-2 flex items-center gap-2">
                                <i class="fas fa-building"></i> Empresa
                            </h3>
                            <p class="font-medium">${activo.empresa?.nombre || 'No especificada'}</p>
                            ${activo.empresa?.ruc ? `<p class="text-sm text-gray-500">RUC: ${activo.empresa.ruc}</p>` : ''}
                        </div>
                    </div>

                    <!-- CONFIGURACIÓN DE RED (SIN BOTÓN CONFIGURAR) -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning">
                        <h3 class="font-bold text-warning mb-3 flex items-center gap-2">
                            <i class="fas fa-network-wired"></i> Configuración de Red
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div><span class="font-semibold">Hostname:</span> ${hostname}</div>
                            <div><span class="font-semibold">IP:</span> <span class="font-mono">${ip}</span></div>
                            <div><span class="font-semibold">Tipo IP:</span> ${tipoIp}</div>
                            <div><span class="font-semibold">Máscara:</span> ${mascara}</div>
                            <div><span class="font-semibold">Gateway:</span> ${gateway}</div>
                            <div><span class="font-semibold">MAC:</span> <span class="font-mono text-xs">${mac}</span></div>
                            <div class="col-span-2"><span class="font-semibold">DNS:</span> ${dns}</div>
                        </div>
                    </div>

                    <!-- ESPECIFICACIONES TÉCNICAS (SIN BOTÓN AGREGAR) -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
                        <h3 class="font-bold text-purple-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-microchip"></i> Especificaciones Técnicas
                        </h3>
                        <div class="text-sm">${especificacionesHtml}</div>
                        ${especificaciones && especificaciones.length > 0 ? `<div class="text-right mt-2"><span class="text-xs text-gray-400">Total: ${especificaciones.length} especificaciones</span></div>` : ''}
                    </div>

                    <!-- ASIGNACIÓN ACTIVA (SIN BOTÓN DEVOLVER) -->
                    ${asignacion ? `
                        <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                            <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-user-check"></i> Asignación Activa
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div class="col-span-2">
                                    <p class="font-semibold text-blue-900">${asignacion.empleado?.nombre_completo || 'Empleado no especificado'}</p>
                                    <p class="text-sm text-blue-700">
                                        ${asignacion.empleado?.areas?.nombre || 'Sin área'} 
                                        ${asignacion.empleado?.puesto ? `· ${asignacion.empleado.puesto}` : ''}
                                        ${asignacion.empleado?.correo ? `· ${asignacion.empleado.correo}` : ''}
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500">Fecha Asignación</p>
                                    <p class="font-medium">${new Date(asignacion.fecha_asignacion).toLocaleDateString('es-ES')}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500">Días transcurridos</p>
                                    <p class="font-medium">${Math.ceil((new Date() - new Date(asignacion.fecha_asignacion)) / (1000 * 60 * 60 * 24))} días</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- SOFTWARE INSTALADO (SIN BOTÓN AGREGAR) -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                        <h3 class="font-bold text-indigo-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-code"></i> Software Instalado
                        </h3>
                        <div class="max-h-32 overflow-y-auto">
                            ${softwareHtml}
                        </div>
                    </div>

                    <!-- CREDENCIALES Y ACCESOS (SIN BOTONES AGREGAR) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-amber-500">
                            <h3 class="font-bold text-amber-700 mb-3 flex items-center gap-2">
                                <i class="fas fa-key"></i> Credenciales
                            </h3>
                            <div class="max-h-32 overflow-y-auto">
                                ${credencialesHtml}
                            </div>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
                            <h3 class="font-bold text-purple-700 mb-3 flex items-center gap-2">
                                <i class="fas fa-network-wired"></i> Accesos Remotos
                            </h3>
                            <div class="max-h-32 overflow-y-auto">
                                ${accesosHtml}
                            </div>
                        </div>
                    </div>

                    <!-- TAREAS DE RESPALDO (SIN BOTÓN AGREGAR) -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-teal-500">
                        <h3 class="font-bold text-teal-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-database"></i> Tareas de Respaldo
                        </h3>
                        <div class="max-h-32 overflow-y-auto">
                            ${respaldosHtml}
                        </div>
                    </div>

                    <!-- MANTENIMIENTOS RECIENTES (SIN BOTÓN AGREGAR) -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                        <h3 class="font-bold text-orange-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-tools"></i> Mantenimientos Recientes
                        </h3>
                        <div class="max-h-32 overflow-y-auto">
                            ${mantenimientosHtml}
                        </div>
                    </div>

                    <!-- AUDITORÍA -->
                    <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                        <h3 class="font-bold text-gray-600 mb-3 flex items-center gap-2">
                            <i class="fas fa-history"></i> Auditoría
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p><span class="font-semibold">Creado el:</span></p>
                                <p>${activo.creado_el ? new Date(activo.creado_el).toLocaleString('es-ES') : 'N/A'}</p>
                                <p class="mt-1"><span class="font-semibold">Por:</span> 
                                    <span class="text-primary font-medium">${creadorInfo.nombre}</span>
                                </p>
                                ${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}
                            </div>
                            ${modificadorInfo ? `
                                <div>
                                    <p><span class="font-semibold">Modificado el:</span></p>
                                    <p>${activo.modificado_el ? new Date(activo.modificado_el).toLocaleString('es-ES') : 'N/A'}</p>
                                    <p class="mt-1"><span class="font-semibold">Por:</span> 
                                        <span class="text-primary font-medium">${modificadorInfo.nombre}</span>
                                    </p>
                                    ${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <details class="text-xs text-gray-400 border rounded-lg p-2 mt-2">
                            <summary class="cursor-pointer hover:text-primary font-medium">Ver IDs de referencia</summary>
                            <div class="mt-2 space-y-1">
                                <p>ID Activo: ${activo.id}</p>
                                <p>ID Tipo: ${activo.tipo_activo_id || 'N/A'}</p>
                                <p>ID Empresa: ${activo.empresa_id || 'N/A'}</p>
                                <p>ID Ubicación: ${activo.ubicacion_id || 'N/A'}</p>
                                <p>Creado por ID: ${activo.creado_por || 'N/A'}</p>
                                <p>Modificado por ID: ${activo.modificado_por || 'N/A'}</p>
                            </div>
                        </details>
                    </div>
                </div>
            `,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            customClass: {
                popup: 'rounded-xl',
                confirmButton: 'rounded-lg px-5 py-2',
                closeButton: 'rounded-lg'
            }
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error en verDetalleActivo:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles del activo: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== FUNCIONES AUXILIARES PARA CERRAR SWEETALERT ====================

async function cerrarSweetAlert() {
    const swalModal = document.querySelector('.swal2-container');
    if (swalModal && swalModal.style.display !== 'none') {
        Swal.close();
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
    }
    return false;
}

// Editar Activo
window.cerrarSweetAlertYEditarActivo = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.editarActivo === 'function') {
        await window.editarActivo(activoId);
    }
};

// Generar Reporte
window.cerrarSweetAlertYGenerarReporte = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.generarReporteActivo === 'function') {
        await window.generarReporteActivo(activoId);
    }
};

// Generar Etiqueta
window.cerrarSweetAlertYGenerarEtiqueta = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.generarEtiquetaActivo === 'function') {
        await window.generarEtiquetaActivo(activoId);
    }
};

// Ver Historial Ubicaciones
window.cerrarSweetAlertYVerHistorialUbicaciones = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.verHistorialUbicaciones === 'function') {
        await window.verHistorialUbicaciones(activoId);
    }
};

// Ver Historial Estados
window.cerrarSweetAlertYVerHistorialEstados = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.verHistorialEstados === 'function') {
        await window.verHistorialEstados(activoId);
    }
};

// Configurar Red
window.cerrarSweetAlertYConfigurarRed = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.abrirModalConfiguracionRed === 'function') {
        await window.abrirModalConfiguracionRed(activoId);
    }
};

// ==================== CERRAR SWEETALERT Y AGREGAR ESPECIFICACIÓN ====================
window.cerrarSweetAlertYAgregarEspecificacion = async function(activoId) {
    console.log('🔒 Cerrando SweetAlert para agregar especificación...');
    
    // Cerrar el modal de SweetAlert
    const swalModal = document.querySelector('.swal2-container');
    if (swalModal && swalModal.style.display !== 'none') {
        Swal.close();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Abrir modal de agregar especificación
    if (typeof window.abrirModalAgregarEspecificacion === 'function') {
        await window.abrirModalAgregarEspecificacion(activoId);
    } else {
        console.error('❌ Función abrirModalAgregarEspecificacion no definida');
        mostrarAlerta('Error', 'No se puede abrir el formulario', 'error');
    }
};

// Devolver Activo
window.cerrarSweetAlertYDevolverActivo = async function(asignacionId) {
    await cerrarSweetAlert();
    if (typeof window.devolverActivo === 'function') {
        await window.devolverActivo(asignacionId);
    }
};

// Agregar Software
window.cerrarSweetAlertYAgregarSoftware = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.abrirSoftwareInstaladoConActivo === 'function') {
        await window.abrirSoftwareInstaladoConActivo(activoId);
    }
};

// Ver todos los Software
window.cerrarSweetAlertYVerSoftware = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.verSoftwarePorActivo === 'function') {
        await window.verSoftwarePorActivo(activoId);
    }
};

// Agregar Credencial
window.cerrarSweetAlertYAgregarCredencial = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.abrirCredencialConActivo === 'function') {
        await window.abrirCredencialConActivo(activoId);
    }
};

// Ver todas las Credenciales
window.cerrarSweetAlertYVerCredenciales = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.verCredencialesPorActivo === 'function') {
        await window.verCredencialesPorActivo(activoId);
    }
};

// Agregar Acceso Remoto
window.cerrarSweetAlertYAgregarAcceso = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.abrirAccesoRemotoConActivo === 'function') {
        await window.abrirAccesoRemotoConActivo(activoId);
    }
};

// Ver todos los Accesos
window.cerrarSweetAlertYVerAccesos = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.verAccesosPorActivo === 'function') {
        await window.verAccesosPorActivo(activoId);
    }
};

// Conectar Acceso
window.cerrarSweetAlertYConectarAcceso = async function(puesto) {
    await cerrarSweetAlert();
    if (typeof window.conectarAccesoRemoto === 'function') {
        window.conectarAccesoRemoto(puesto);
    }
};

// Agregar Respaldo
window.cerrarSweetAlertYAgregarRespaldo = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.abrirRespaldoConActivo === 'function') {
        await window.abrirRespaldoConActivo(activoId);
    }
};

// Ver todos los Respaldos
window.cerrarSweetAlertYVerRespaldos = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.verRespaldosPorActivo === 'function') {
        await window.verRespaldosPorActivo(activoId);
    }
};

// Agregar Mantenimiento
window.cerrarSweetAlertYAgregarMantenimiento = async function(activoId) {
    await cerrarSweetAlert();
    if (typeof window.abrirModalNuevoMantenimiento === 'function') {
        await window.abrirModalNuevoMantenimiento();
        // Precargar el activo si es posible
        setTimeout(() => {
            const select = document.getElementById('mant_activo_id');
            if (select) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === activoId) {
                        select.value = activoId;
                        break;
                    }
                }
            }
        }, 500);
    }
};

// Funciones de activos relacionadas
window.verSoftwarePorActivo = async function(activoId) {
    mostrarLoading('Cargando software del activo...');
    try {
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        // Obtener software instalado con información completa
        const { data: instalaciones } = await window.supabaseClient
            .from('software_instalado')
            .select(`
                *,
                software:software_id (id, nombre, fabricante),
                instalador:instalado_por (id, correo, empleado_id)
            `)
            .eq('activo_id', activoId)
            .order('fecha_instalacion', { ascending: false });

        // Obtener nombres de empleados para cada instalador
        const empleadosMap = new Map();
        const usuariosConEmpleado = instalaciones?.filter(i => i.instalador?.empleado_id).map(i => i.instalador.empleado_id) || [];
        
        if (usuariosConEmpleado.length > 0) {
            const { data: empleados } = await window.supabaseClient
                .from('empleados')
                .select('id, nombre_completo')
                .in('id', usuariosConEmpleado);
            
            empleados?.forEach(e => empleadosMap.set(e.id, e.nombre_completo));
        }

        ocultarLoading();

        let softwareHtml = '';
        
        if (instalaciones && instalaciones.length > 0) {
            instalaciones.forEach(inst => {
                const estadoClass = {
                    'INSTALADO': 'bg-green-100 text-green-800',
                    'PENDIENTE': 'bg-yellow-100 text-yellow-800',
                    'DESINSTALADO': 'bg-gray-100 text-gray-800'
                }[inst.estado] || 'bg-gray-100';
                
                // Obtener nombre del instalador
                let nombreInstalador = 'No especificado';
                if (inst.instalador) {
                    if (inst.instalador.empleado_id && empleadosMap.has(inst.instalador.empleado_id)) {
                        nombreInstalador = empleadosMap.get(inst.instalador.empleado_id);
                    } else {
                        nombreInstalador = inst.instalador.correo || 'No especificado';
                    }
                }
                
                softwareHtml += `
                    <div class="border-b pb-3 mb-3 last:border-b-0 hover:bg-gray-50 transition-colors p-2 rounded" data-instalacion-id="${inst.id}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-semibold text-primary">${inst.software?.nombre || 'Software desconocido'}</p>
                                <p class="text-xs text-gray-500">${inst.software?.fabricante || ''}</p>
                            </div>
                            <span class="estado-badge ${estadoClass}">${inst.estado || 'INSTALADO'}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div><span class="font-medium">Versión:</span> ${inst.version_instalada || 'No especificada'}</div>
                            <div><span class="font-medium">Arquitectura:</span> ${inst.arquitectura_instalada || 'No especificada'}</div>
                            <div><span class="font-medium">Instalado:</span> ${inst.fecha_instalacion ? new Date(inst.fecha_instalacion).toLocaleDateString() : 'No registrada'}</div>
                            <div><span class="font-medium">Por:</span> <span class="text-primary">${nombreInstalador}</span></div>
                        </div>
                        ${inst.ruta_instalacion ? `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-folder"></i> ${inst.ruta_instalacion}</div>` : ''}
                        ${inst.configuracion_especial ? `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-cog"></i> ${inst.configuracion_especial}</div>` : ''}
                        ${inst.estado === 'DESINSTALADO' && inst.motivo_desinstalacion ? `
                            <div class="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                <p><span class="font-medium">Desinstalado:</span> ${inst.fecha_desinstalacion ? new Date(inst.fecha_desinstalacion).toLocaleDateString() : 'N/A'}</p>
                                <p><span class="font-medium">Motivo:</span> ${inst.motivo_desinstalacion}</p>
                            </div>
                        ` : ''}
                        <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                            <button onclick="editarSoftwareInstaladoDesdeModal('${inst.id}', '${activoId}')" 
                                    class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                <i class="fas fa-edit text-xs"></i> Editar
                            </button>
                            <button onclick="eliminarSoftwareInstaladoDesdeModal('${inst.id}', '${activoId}')" 
                                    class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                <i class="fas fa-trash text-xs"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            softwareHtml = '<p class="text-center text-gray-500 py-4">No hay software instalado en este activo</p>';
        }

        // Mostrar el modal con los botones de editar y eliminar
        Swal.fire({
            title: `Software en ${activo?.nombre || 'Activo'}`,
            width: '750px',
            html: `
                <div class="text-left">
                    <div class="bg-gray-50 p-3 rounded-lg mb-4">
                        <p><strong>Código:</strong> ${activo?.codigo_activo || 'N/A'}</p>
                    </div>
                    <h3 class="font-bold text-primary mb-3">📦 Software Instalado (${instalaciones?.length || 0})</h3>
                    <div class="max-h-96 overflow-y-auto pr-2" id="lista-software-container">
                        ${softwareHtml}
                    </div>
                    <div class="mt-4 text-right">
                        <button onclick="abrirSoftwareInstaladoConActivo('${activoId}')" 
                                class="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                            <i class="fas fa-plus mr-2"></i>Agregar software
                        </button>
                    </div>
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
        mostrarAlerta('Error', 'No se pudo cargar el software del activo', 'error');
    }
};

window.verCredencialesPorActivo = async function(activoId) {
    mostrarLoading('Cargando credenciales...');
    try {
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        const { data: credenciales } = await window.supabaseClient
            .from('credenciales')
            .select(`
                *,
                creador:creado_por (id, correo, empleado_id)
            `)
            .eq('activo_id', activoId)
            .order('tipo', { ascending: true })
            .order('es_principal', { ascending: false }); // Las principales primero

        // Obtener nombres de empleados para cada creador
        const empleadosMap = new Map();
        const usuariosConEmpleado = credenciales?.filter(c => c.creador?.empleado_id).map(c => c.creador.empleado_id) || [];
        
        if (usuariosConEmpleado.length > 0) {
            const { data: empleados } = await window.supabaseClient
                .from('empleados')
                .select('id, nombre_completo')
                .in('id', usuariosConEmpleado);
            
            empleados?.forEach(e => empleadosMap.set(e.id, e.nombre_completo));
        }

        ocultarLoading();

        const credencialesActivas = credenciales?.filter(c => c.activo === true) || [];
        const credencialesInactivas = credenciales?.filter(c => c.activo === false) || [];

        let credencialesHtml = '';
        
        if (credenciales && credenciales.length > 0) {
            // Mostrar credenciales activas primero
            if (credencialesActivas.length > 0) {
                credencialesHtml += `<div class="mb-4"><h4 class="font-semibold text-green-700 mb-2 flex items-center gap-2"><i class="fas fa-check-circle text-green-500"></i> Credenciales Activas (${credencialesActivas.length})</h4>`;
                
                credencialesActivas.forEach(c => {
                    const icono = c.tipo === 'WINDOWS' ? 'fa-windows' : (c.tipo === 'CORREO' ? 'fa-envelope' : 'fa-key');
                    const colorClass = c.tipo === 'WINDOWS' ? 'text-blue-600' : (c.tipo === 'CORREO' ? 'text-green-600' : 'text-purple-600');
                    const tipoTexto = c.tipo === 'WINDOWS' ? 'Cuenta Windows' : (c.tipo === 'CORREO' ? 'Cuenta de Correo' : 'Otra Credencial');
                    const expirada = c.fecha_expiracion && new Date(c.fecha_expiracion) < new Date();
                    
                    // Obtener nombre del creador
                    let nombreCreador = 'Sistema';
                    if (c.creador) {
                        if (c.creador.empleado_id && empleadosMap.has(c.creador.empleado_id)) {
                            nombreCreador = empleadosMap.get(c.creador.empleado_id);
                        } else {
                            nombreCreador = c.creador.correo || 'Sistema';
                        }
                    }
                    
                    credencialesHtml += `
                        <div class="border rounded-lg p-3 mb-3 hover:bg-gray-50 transition-colors ${c.es_principal ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}" data-credencial-id="${c.id}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <i class="fab ${icono} ${colorClass} text-lg"></i>
                                        <span class="font-semibold text-primary">${tipoTexto}</span>
                                        ${c.es_principal ? '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><i class="fas fa-star text-xs"></i> Principal</span>' : ''}
                                        ${expirada ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">Expirada</span>' : ''}
                                    </div>
                                    <p class="text-sm mt-1"><span class="font-medium">Usuario:</span> ${c.dominio ? `${c.dominio}\\` : ''}${c.usuario}</p>
                                    ${c.correo ? `<p class="text-sm"><span class="font-medium">Correo:</span> ${c.correo}</p>` : ''}
                                    ${c.descripcion ? `<p class="text-xs text-gray-500 mt-1">📝 ${c.descripcion}</p>` : ''}
                                </div>
                                <div class="flex flex-col items-end gap-1">
                                    <span class="estado-badge ${c.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">
                                        ${c.activo ? 'Activa' : 'Inactiva'}
                                    </span>
                                    ${c.es_administrador ? '<span class="text-xs text-amber-600"><i class="fas fa-shield-alt"></i> Admin</span>' : ''}
                                </div>
                            </div>
                            <div class="mt-2 space-y-1 text-sm">
                                <div class="password-container flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <i class="fas fa-lock text-primary w-4"></i>
                                    <span class="font-medium">Contraseña:</span>
                                    ${c.contrasena ? `
                                        <span class="font-mono password-mask flex-1 text-xs" data-password="${c.contrasena}">••••••••</span>
                                        <button onclick="event.stopPropagation(); togglePassword(this)" class="text-primary hover:opacity-75" title="Mostrar/ocultar">
                                            <i class="fas fa-eye text-xs"></i>
                                        </button>
                                        <button onclick="event.stopPropagation(); copiarPassword('${c.contrasena}')" class="text-primary hover:opacity-75" title="Copiar contraseña">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                    ` : `
                                        <span class="text-gray-400 italic flex-1">No configurada</span>
                                    `}
                                </div>
                                ${c.fecha_expiracion ? `
                                    <p class="text-xs text-gray-500">
                                        <i class="far fa-calendar-alt"></i> Expira: ${new Date(c.fecha_expiracion).toLocaleDateString()}
                                        ${expirada ? '<span class="text-red-600 ml-1">(Expirada)</span>' : ''}
                                    </p>
                                ` : ''}
                                <p class="text-xs text-gray-400">
                                    <i class="fas fa-user-plus"></i> Creado: ${new Date(c.creado_el).toLocaleDateString()} por ${nombreCreador}
                                </p>
                            </div>
                            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                <button onclick="editarCredencialDesdeModal('${c.id}', '${activoId}')" 
                                        class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i> Editar
                                </button>
                                <button onclick="eliminarCredencialDesdeModal('${c.id}', '${activoId}')" 
                                        class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash text-xs"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                credencialesHtml += `</div>`;
            }
            
            // Mostrar credenciales inactivas
            if (credencialesInactivas.length > 0) {
                credencialesHtml += `<div class="mt-4"><h4 class="font-semibold text-gray-500 mb-2 flex items-center gap-2"><i class="fas fa-ban text-gray-400"></i> Credenciales Inactivas (${credencialesInactivas.length})</h4>`;
                
                credencialesInactivas.forEach(c => {
                    const icono = c.tipo === 'WINDOWS' ? 'fa-windows' : (c.tipo === 'CORREO' ? 'fa-envelope' : 'fa-key');
                    const colorClass = c.tipo === 'WINDOWS' ? 'text-blue-400' : (c.tipo === 'CORREO' ? 'text-green-400' : 'text-purple-400');
                    const tipoTexto = c.tipo === 'WINDOWS' ? 'Cuenta Windows' : (c.tipo === 'CORREO' ? 'Cuenta de Correo' : 'Otra Credencial');
                    
                    credencialesHtml += `
                        <div class="border rounded-lg p-3 mb-3 bg-gray-50 opacity-70" data-credencial-id="${c.id}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <i class="fab ${icono} ${colorClass} text-lg"></i>
                                        <span class="font-semibold text-gray-500">${tipoTexto}</span>
                                        ${c.es_principal ? '<span class="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">Principal</span>' : ''}
                                    </div>
                                    <p class="text-sm mt-1"><span class="font-medium">Usuario:</span> ${c.dominio ? `${c.dominio}\\` : ''}${c.usuario}</p>
                                    ${c.correo ? `<p class="text-sm"><span class="font-medium">Correo:</span> ${c.correo}</p>` : ''}
                                </div>
                                <span class="estado-badge bg-gray-200 text-gray-600 text-xs">Inactiva</span>
                            </div>
                            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200">
                                <button onclick="editarCredencialDesdeModal('${c.id}', '${activoId}')" 
                                        class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i> Editar
                                </button>
                                <button onclick="eliminarCredencialDesdeModal('${c.id}', '${activoId}')" 
                                        class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash text-xs"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                credencialesHtml += `</div>`;
            }
        } else {
            credencialesHtml = `
                <div class="text-center py-8">
                    <i class="fas fa-key text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay credenciales configuradas para este activo</p>
                    <button onclick="abrirCredencialConActivo('${activoId}')" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nueva Credencial
                    </button>
                </div>
            `;
        }

        Swal.fire({
            title: `Credenciales - ${activo?.nombre || 'Activo'}`,
            width: '750px',
            html: `
                <div class="text-left">
                    <div class="bg-gray-50 p-3 rounded-lg mb-4">
                        <p><strong>Código:</strong> ${activo?.codigo_activo || 'N/A'}</p>
                    </div>
                    <div class="max-h-96 overflow-y-auto pr-2" id="lista-credenciales-container">
                        ${credencialesHtml}
                    </div>
                    <div class="mt-4 text-right">
                        <button onclick="abrirCredencialConActivo('${activoId}')" 
                                class="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                            <i class="fas fa-plus mr-2"></i>Agregar credencial
                        </button>
                    </div>
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
        mostrarAlerta('Error', 'No se pudieron cargar las credenciales', 'error');
    }
};

// ==================== EDITAR CREDENCIAL DESDE MODAL ====================
window.editarCredencialDesdeModal = async function(credencialId, activoId) {
    console.log('✏️ Editando credencial ID:', credencialId);
    
    // Cerrar el modal actual de SweetAlert
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Llamar a la función de edición existente
    if (typeof window.editarCredencial === 'function') {
        await window.editarCredencial(credencialId);
    } else {
        console.error('❌ La función editarCredencial no está definida');
        mostrarAlerta('Error', 'No se puede editar la credencial', 'error');
    }
};

// ==================== ELIMINAR CREDENCIAL DESDE MODAL ====================
window.eliminarCredencialDesdeModal = async function(credencialId, activoId) {
    console.log('🗑️ Eliminando credencial ID:', credencialId);
    
    // Confirmar eliminación
    const result = await Swal.fire({
        title: '¿Eliminar esta credencial?',
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
                .from('credenciales')
                .delete()
                .eq('id', credencialId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Credencial eliminada correctamente', 'success');
            
            // Recargar el modal con la lista actualizada
            if (typeof window.verCredencialesPorActivo === 'function') {
                await window.verCredencialesPorActivo(activoId);
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la credencial: ' + error.message, 'error');
        }
    }
};

window.verAccesosPorActivo = async function(activoId) {
    mostrarLoading('Cargando accesos remotos...');
    try {
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        const { data: accesos } = await window.supabaseClient
            .from('accesos_remotos')
            .select('*')
            .eq('activo_id', activoId)
            .order('creado_el', { ascending: false });

        ocultarLoading();

        const accesosActivos = accesos?.filter(a => a.activo === true) || [];
        const accesosInactivos = accesos?.filter(a => a.activo === false) || [];

        let accesosHtml = '';
        
        if (accesos && accesos.length > 0) {
            // Mostrar accesos activos primero
            if (accesosActivos.length > 0) {
                accesosHtml += `<div class="mb-4"><h4 class="font-semibold text-green-700 mb-2 flex items-center gap-2"><i class="fas fa-check-circle text-green-500"></i> Accesos Activos (${accesosActivos.length})</h4>`;
                accesosActivos.forEach(a => {
                    accesosHtml += `
                        <div class="border-b pb-3 mb-3 last:border-b-0 hover:bg-gray-50 transition-colors p-2 rounded" data-acceso-id="${a.id}">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-semibold text-primary">
                                        <i class="fas fa-network-wired mr-2"></i>
                                        Acceso Remoto
                                    </p>
                                    <p class="text-xs text-gray-500">ID: ${a.puesto_trabajo || 'No especificado'}</p>
                                </div>
                                <span class="estado-badge ${a.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${a.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div class="mt-2 space-y-1 text-sm">
                                <p><span class="font-medium">Perfil:</span> ${a.perfil_nombre || 'No especificado'}</p>
                                <div class="flex items-center gap-2">
                                    <span class="font-medium">Contraseña:</span>
                                    ${a.perfil_contrasena ? `
                                        <span class="font-mono password-mask bg-gray-100 px-2 py-1 rounded text-xs" data-password="${a.perfil_contrasena}">••••••••</span>
                                        <button onclick="event.stopPropagation(); togglePassword(this)" class="text-primary hover:opacity-75" title="Mostrar/ocultar">
                                            <i class="fas fa-eye text-xs"></i>
                                        </button>
                                        <button onclick="event.stopPropagation(); copiarPassword('${a.perfil_contrasena}')" class="text-primary hover:opacity-75" title="Copiar contraseña">
                                            <i class="fas fa-copy text-xs"></i>
                                        </button>
                                    ` : `
                                        <span class="text-gray-400 italic">No configurada</span>
                                    `}
                                </div>
                                ${a.observaciones ? `<p class="text-xs text-gray-500 mt-1">📝 ${a.observaciones}</p>` : ''}
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="far fa-calendar-alt"></i> Creado: ${new Date(a.creado_el).toLocaleDateString()}
                                </p>
                            </div>
                            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                <button onclick="conectarAccesoRemoto('${a.puesto_trabajo}')" 
                                        class="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors flex items-center gap-1">
                                    <i class="fas fa-plug text-xs"></i> Conectar
                                </button>
                                <button onclick="editarAccesoRemotoDesdeModal('${a.id}', '${activoId}')" 
                                        class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i> Editar
                                </button>
                                <button onclick="eliminarAccesoRemotoDesdeModal('${a.id}', '${activoId}')" 
                                        class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash text-xs"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                accesosHtml += `</div>`;
            }
            
            // Mostrar accesos inactivos
            if (accesosInactivos.length > 0) {
                accesosHtml += `<div class="mt-4"><h4 class="font-semibold text-gray-500 mb-2 flex items-center gap-2"><i class="fas fa-ban text-gray-400"></i> Accesos Inactivos (${accesosInactivos.length})</h4>`;
                accesosInactivos.forEach(a => {
                    accesosHtml += `
                        <div class="border-b pb-3 mb-3 last:border-b-0 hover:bg-gray-50 transition-colors p-2 rounded opacity-70" data-acceso-id="${a.id}">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-semibold text-gray-500">
                                        <i class="fas fa-network-wired mr-2"></i>
                                        Acceso Remoto
                                    </p>
                                    <p class="text-xs text-gray-400">ID: ${a.puesto_trabajo || 'No especificado'}</p>
                                </div>
                                <span class="estado-badge bg-gray-100 text-gray-600">Inactivo</span>
                            </div>
                            <div class="mt-2 space-y-1 text-sm">
                                <p><span class="font-medium">Perfil:</span> ${a.perfil_nombre || 'No especificado'}</p>
                                ${a.observaciones ? `<p class="text-xs text-gray-500 mt-1">📝 ${a.observaciones}</p>` : ''}
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="far fa-calendar-alt"></i> Creado: ${new Date(a.creado_el).toLocaleDateString()}
                                </p>
                            </div>
                            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                <button onclick="editarAccesoRemotoDesdeModal('${a.id}', '${activoId}')" 
                                        class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i> Editar
                                </button>
                                <button onclick="eliminarAccesoRemotoDesdeModal('${a.id}', '${activoId}')" 
                                        class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash text-xs"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                accesosHtml += `</div>`;
            }
        } else {
            accesosHtml = `
                <div class="text-center py-8">
                    <i class="fas fa-network-wired text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay accesos remotos configurados para este activo</p>
                    <button onclick="abrirAccesoRemotoConActivo('${activoId}')" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nuevo Acceso
                    </button>
                </div>
            `;
        }

        Swal.fire({
            title: `Accesos Remotos - ${activo?.nombre || 'Activo'}`,
            width: '700px',
            html: `
                <div class="text-left">
                    <div class="bg-gray-50 p-3 rounded-lg mb-4">
                        <p><strong>Código:</strong> ${activo?.codigo_activo || 'N/A'}</p>
                    </div>
                    <div class="max-h-96 overflow-y-auto pr-2" id="lista-accesos-container">
                        ${accesosHtml}
                    </div>
                    <div class="mt-4 text-right">
                        <button onclick="abrirAccesoRemotoConActivo('${activoId}')" 
                                class="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                            <i class="fas fa-plus mr-2"></i>Agregar acceso remoto
                        </button>
                    </div>
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
        mostrarAlerta('Error', 'No se pudieron cargar los accesos remotos', 'error');
    }
};

// ==================== EDITAR ACCESO REMOTO DESDE MODAL ====================
window.editarAccesoRemotoDesdeModal = async function(accesoId, activoId) {
    console.log('✏️ Editando acceso remoto ID:', accesoId);
    
    // Cerrar el modal actual de SweetAlert
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Llamar a la función de edición existente
    if (typeof window.editarAccesoRemoto === 'function') {
        await window.editarAccesoRemoto(accesoId);
    } else {
        console.error('❌ La función editarAccesoRemoto no está definida');
        mostrarAlerta('Error', 'No se puede editar el acceso remoto', 'error');
    }
};

// ==================== ELIMINAR ACCESO REMOTO DESDE MODAL ====================
window.eliminarAccesoRemotoDesdeModal = async function(accesoId, activoId) {
    console.log('🗑️ Eliminando acceso remoto ID:', accesoId);
    
    // Confirmar eliminación
    const result = await Swal.fire({
        title: '¿Eliminar este acceso remoto?',
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
                .from('accesos_remotos')
                .delete()
                .eq('id', accesoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Acceso remoto eliminado correctamente', 'success');
            
            // Recargar el modal con la lista actualizada
            await window.verAccesosPorActivo(activoId);
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el acceso remoto: ' + error.message, 'error');
        }
    }
};

window.verRespaldosPorActivo = async function(activoId) {
    mostrarLoading('Cargando tareas de respaldo...');
    try {
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        const { data: respaldos } = await window.supabaseClient
            .from('tareas_respaldo')
            .select('*')
            .eq('activo_id', activoId)
            .order('creado_el', { ascending: false });

        ocultarLoading();

        const respaldosActivos = respaldos?.filter(r => r.activo === true) || [];
        const respaldosInactivos = respaldos?.filter(r => r.activo === false) || [];

        const tipoRespaldoMap = {
            'COMPLETO': 'Completo',
            'INCREMENTAL': 'Incremental',
            'DIFERENCIAL': 'Diferencial',
            'VACIO': 'Vacío'
        };
        
        const tipoHorarioMap = {
            'MANUAL': 'Manual',
            'UNA_VEZ': 'Una vez',
            'DIARIO': 'Diario',
            'SEMANAL': 'Semanal',
            'MENSUAL': 'Mensual',
            'ANUAL': 'Anual',
            'TEMPORALIZADOR': 'Temporalizador',
            'INICIO': 'Al inicio'
        };

        let respaldosHtml = '';
        
        if (respaldos && respaldos.length > 0) {
            // Mostrar respaldos activos primero
            if (respaldosActivos.length > 0) {
                respaldosHtml += `<div class="mb-4"><h4 class="font-semibold text-green-700 mb-2 flex items-center gap-2"><i class="fas fa-check-circle text-green-500"></i> Tareas Activas (${respaldosActivos.length})</h4>`;
                
                respaldosActivos.forEach(r => {
                    let diasTexto = '';
                    if (r.dias_semana && r.dias_semana.length > 0) {
                        const diasMap = {
                            'LUNES': 'Lun',
                            'MARTES': 'Mar',
                            'MIERCOLES': 'Mié',
                            'JUEVES': 'Jue',
                            'VIERNES': 'Vie',
                            'SABADO': 'Sáb',
                            'DOMINGO': 'Dom'
                        };
                        diasTexto = r.dias_semana.map(d => diasMap[d] || d).join(', ');
                    }
                    
                    respaldosHtml += `
                        <div class="border rounded-lg p-3 mb-3 hover:bg-gray-50 transition-colors" data-respaldo-id="${r.id}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <i class="fas fa-database text-primary text-lg"></i>
                                        <span class="font-semibold text-primary">${r.nombre_tarea}</span>
                                        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                            ${tipoRespaldoMap[r.tipo_respaldo] || r.tipo_respaldo}
                                        </span>
                                    </div>
                                    <p class="text-xs text-gray-500 mt-1">Cobian Reflector</p>
                                </div>
                                <span class="estado-badge ${r.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${r.activo ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                            <div class="mt-2 space-y-1 text-sm">
                                <p><span class="font-medium">Origen:</span> <span class="text-xs font-mono">${r.origen}</span></p>
                                <p><span class="font-medium">Destino:</span> <span class="text-xs font-mono">${r.destino}</span></p>
                                <div class="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                        <span class="font-medium">Horario:</span>
                                        <span class="text-xs">${tipoHorarioMap[r.tipo_horario] || r.tipo_horario}</span>
                                    </div>
                                    ${r.hora_ejecucion ? `
                                        <div>
                                            <span class="font-medium">Hora:</span>
                                            <span class="text-xs">${r.hora_ejecucion.substring(0,5)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                                ${diasTexto ? `<p><span class="font-medium">Días:</span> <span class="text-xs">${diasTexto}</span></p>` : ''}
                                <p><span class="font-medium">Copias a conservar:</span> <span class="text-xs font-bold">${r.copias_conservar || 7}</span></p>
                                ${r.descripcion ? `<p class="text-xs text-gray-500 mt-1">📝 ${r.descripcion}</p>` : ''}
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="far fa-calendar-alt"></i> Creado: ${new Date(r.creado_el).toLocaleDateString()}
                                </p>
                            </div>
                            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                <button onclick="editarTareaRespaldoDesdeModal('${r.id}', '${activoId}')" 
                                        class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i> Editar
                                </button>
                                <button onclick="eliminarTareaRespaldoDesdeModal('${r.id}', '${activoId}')" 
                                        class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash text-xs"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                respaldosHtml += `</div>`;
            }
            
            // Mostrar respaldos inactivos
            if (respaldosInactivos.length > 0) {
                respaldosHtml += `<div class="mt-4"><h4 class="font-semibold text-gray-500 mb-2 flex items-center gap-2"><i class="fas fa-ban text-gray-400"></i> Tareas Inactivas (${respaldosInactivos.length})</h4>`;
                
                respaldosInactivos.forEach(r => {
                    let diasTexto = '';
                    if (r.dias_semana && r.dias_semana.length > 0) {
                        const diasMap = {
                            'LUNES': 'Lun',
                            'MARTES': 'Mar',
                            'MIERCOLES': 'Mié',
                            'JUEVES': 'Jue',
                            'VIERNES': 'Vie',
                            'SABADO': 'Sáb',
                            'DOMINGO': 'Dom'
                        };
                        diasTexto = r.dias_semana.map(d => diasMap[d] || d).join(', ');
                    }
                    
                    respaldosHtml += `
                        <div class="border rounded-lg p-3 mb-3 bg-gray-50 opacity-70" data-respaldo-id="${r.id}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <i class="fas fa-database text-gray-400 text-lg"></i>
                                        <span class="font-semibold text-gray-500">${r.nombre_tarea}</span>
                                        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                            ${tipoRespaldoMap[r.tipo_respaldo] || r.tipo_respaldo}
                                        </span>
                                    </div>
                                </div>
                                <span class="estado-badge bg-gray-200 text-gray-600">Inactiva</span>
                            </div>
                            <div class="mt-2 space-y-1 text-sm">
                                <p><span class="font-medium">Origen:</span> <span class="text-xs font-mono">${r.origen}</span></p>
                                <p><span class="font-medium">Destino:</span> <span class="text-xs font-mono">${r.destino}</span></p>
                                <p><span class="font-medium">Horario:</span> <span class="text-xs">${tipoHorarioMap[r.tipo_horario] || r.tipo_horario}</span></p>
                                ${r.hora_ejecucion ? `<p><span class="font-medium">Hora:</span> <span class="text-xs">${r.hora_ejecucion.substring(0,5)}</span></p>` : ''}
                                ${diasTexto ? `<p><span class="font-medium">Días:</span> <span class="text-xs">${diasTexto}</span></p>` : ''}
                            </div>
                            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200">
                                <button onclick="editarTareaRespaldoDesdeModal('${r.id}', '${activoId}')" 
                                        class="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i> Editar
                                </button>
                                <button onclick="eliminarTareaRespaldoDesdeModal('${r.id}', '${activoId}')" 
                                        class="text-xs text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash text-xs"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                respaldosHtml += `</div>`;
            }
        } else {
            respaldosHtml = `
                <div class="text-center py-8">
                    <i class="fas fa-database text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay tareas de respaldo configuradas para este activo</p>
                    <button onclick="abrirRespaldoConActivo('${activoId}')" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nueva Tarea
                    </button>
                </div>
            `;
        }

        Swal.fire({
            title: `Tareas de Respaldo - ${activo?.nombre || 'Activo'}`,
            width: '750px',
            html: `
                <div class="text-left">
                    <div class="bg-gray-50 p-3 rounded-lg mb-4">
                        <p><strong>Código:</strong> ${activo?.codigo_activo || 'N/A'}</p>
                    </div>
                    <div class="max-h-96 overflow-y-auto pr-2" id="lista-respaldos-container">
                        ${respaldosHtml}
                    </div>
                    <div class="mt-4 text-right">
                        <button onclick="abrirRespaldoConActivo('${activoId}')" 
                                class="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                            <i class="fas fa-plus mr-2"></i>Agregar tarea de respaldo
                        </button>
                    </div>
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
        mostrarAlerta('Error', 'No se pudieron cargar las tareas de respaldo', 'error');
    }
};

// ==================== EDITAR TAREA RESPALDO DESDE MODAL ====================
window.editarTareaRespaldoDesdeModal = async function(tareaId, activoId) {
    console.log('✏️ Editando tarea de respaldo ID:', tareaId);
    
    // Cerrar el modal actual de SweetAlert
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Llamar a la función de edición existente
    if (typeof window.editarTareaRespaldo === 'function') {
        await window.editarTareaRespaldo(tareaId);
    } else {
        console.error('❌ La función editarTareaRespaldo no está definida');
        mostrarAlerta('Error', 'No se puede editar la tarea de respaldo', 'error');
    }
};

// ==================== ELIMINAR TAREA RESPALDO DESDE MODAL ====================
window.eliminarTareaRespaldoDesdeModal = async function(tareaId, activoId) {
    console.log('🗑️ Eliminando tarea de respaldo ID:', tareaId);
    
    // Confirmar eliminación
    const result = await Swal.fire({
        title: '¿Eliminar esta tarea de respaldo?',
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
                .from('tareas_respaldo')
                .delete()
                .eq('id', tareaId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Tarea de respaldo eliminada correctamente', 'success');
            
            // Recargar el modal con la lista actualizada
            if (typeof window.verRespaldosPorActivo === 'function') {
                await window.verRespaldosPorActivo(activoId);
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la tarea de respaldo: ' + error.message, 'error');
        }
    }
};

window.verHistorialUbicaciones = async function(activoId) {
    mostrarLoading('Cargando historial de ubicaciones...');
    try {
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        const { data: historial, error } = await window.supabaseClient
            .from('historial_ubicaciones_activos')
            .select(`*, ubicacion_anterior:ubicacion_anterior_id (id, nombre, descripcion, tipo), ubicacion_nueva:ubicacion_nueva_id (id, nombre, descripcion, tipo), cambiado_por (id, correo, empleado_id)`)
            .eq('activo_id', activoId)
            .order('fecha_cambio', { ascending: false });

        if (error) throw error;

        const usuariosConEmpleados = new Map();
        const usuariosIds = historial?.map(h => h.cambiado_por?.id).filter(id => id) || [];

        if (usuariosIds.length > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', usuariosIds);

            if (usuarios && usuarios.length > 0) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empleados } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empleadosMap = new Map(empleados?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const empleado = empleadosMap.get(u.empleado_id);
                        const nombre = empleado?.nombre_completo || u.correo;
                        usuariosConEmpleados.set(u.id, { nombre, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        const { data: ubicacionActual } = await window.supabaseClient
            .from('activos')
            .select('ubicacion:ubicacion_id (id, nombre, descripcion, tipo)')
            .eq('id', activoId)
            .single();

        ocultarLoading();

        const totalCambios = historial?.length || 0;
        const ubicacionesUnicas = new Set();
        historial?.forEach(h => {
            if (h.ubicacion_nueva_id) ubicacionesUnicas.add(h.ubicacion_nueva_id);
            if (h.ubicacion_anterior_id) ubicacionesUnicas.add(h.ubicacion_anterior_id);
        });

        let historialHtml = '';
        if (historial && historial.length > 0) {
            historial.forEach((h, index) => {
                const fecha = new Date(h.fecha_cambio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const usuarioInfo = usuariosConEmpleados.get(h.cambiado_por?.id);
                const nombreUsuario = usuarioInfo?.nombre || h.cambiado_por?.correo || 'Sistema';

                const ubicacionAnterior = h.ubicacion_anterior;
                const ubicacionNueva = h.ubicacion_nueva;

                const ubicacionAnteriorNombre = ubicacionAnterior?.nombre || 'Sin ubicación';
                const ubicacionAnteriorTipo = ubicacionAnterior?.tipo ? `(${ubicacionAnterior.tipo})` : '';
                const ubicacionAnteriorDesc = ubicacionAnterior?.descripcion ? ` - ${ubicacionAnterior.descripcion}` : '';

                const ubicacionNuevaNombre = ubicacionNueva?.nombre || 'No especificada';
                const ubicacionNuevaTipo = ubicacionNueva?.tipo ? `(${ubicacionNueva.tipo})` : '';
                const ubicacionNuevaDesc = ubicacionNueva?.descripcion ? ` - ${ubicacionNueva.descripcion}` : '';

                const esInicial = !h.ubicacion_anterior_id;

                const getTipoIcono = (tipo) => {
                    const iconos = { 'PLANTA': '🏭', 'EDIFICIO': '🏢', 'PISO': '📌', 'OFICINA': '🏢', 'SEDE': '🏛️' };
                    return iconos[tipo] || '📍';
                };

                const iconoAnterior = getTipoIcono(ubicacionAnterior?.tipo);
                const iconoNueva = getTipoIcono(ubicacionNueva?.tipo);

                historialHtml += `
                    <div class="border-l-4 ${esInicial ? 'border-green-500' : 'border-orange-300'} pl-4 py-3 mb-3 bg-gray-50 rounded-r-lg relative group hover:bg-gray-100 transition-colors">
                        <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="eliminarRegistroUbicacion('${h.id}', '${activoId}')" class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors" title="Eliminar este registro"><i class="fas fa-trash-alt text-sm"></i></button>
                        </div>
                        <div class="pr-8">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full"><i class="far fa-clock mr-1"></i>${fecha}</span>
                                ${esInicial ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><i class="fas fa-plus-circle"></i> Ubicación inicial</span>` : ''}
                                ${h.motivo ? `<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><i class="fas fa-quote-right"></i> ${h.motivo}</span>` : ''}
                            </div>
                            <div class="flex items-center gap-3 flex-wrap">
                                ${!esInicial ? `<div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm"><i class="fas fa-map-marker-alt text-gray-400"></i><div><span class="text-xs text-gray-500">Anterior</span><p class="font-medium text-gray-700">${iconoAnterior} ${ubicacionAnteriorNombre}<span class="text-xs text-gray-400">${ubicacionAnteriorTipo}</span></p>${ubicacionAnteriorDesc ? `<p class="text-xs text-gray-400">${ubicacionAnteriorDesc}</p>` : ''}</div></div><i class="fas fa-arrow-right text-gray-400 text-sm"></i>` : ''}
                                <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm ${esInicial ? 'border-l-4 border-green-500' : ''}"><i class="fas fa-map-marker-alt text-primary"></i><div><span class="text-xs text-gray-500">${esInicial ? 'Ubicación asignada' : 'Nueva'}</span><p class="font-medium text-primary">${iconoNueva} ${ubicacionNuevaNombre}<span class="text-xs text-gray-400">${ubicacionNuevaTipo}</span></p>${ubicacionNuevaDesc ? `<p class="text-xs text-gray-400">${ubicacionNuevaDesc}</p>` : ''}</div></div>
                            </div>
                            <div class="mt-2 text-xs text-gray-400 flex items-center gap-3"><span><i class="fas fa-user mr-1"></i>${nombreUsuario}</span>${h.cambiado_por?.correo ? `<span class="text-gray-300">|</span><span><i class="fas fa-envelope mr-1"></i>${h.cambiado_por.correo}</span>` : ''}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            historialHtml = `<div class="text-center py-8"><i class="fas fa-map-marker-alt text-5xl text-gray-300 mb-3"></i><p class="text-gray-500">No hay registros de cambios de ubicación para este activo</p><p class="text-sm text-gray-400 mt-2">Cuando se mueva el activo de ubicación, se registrará automáticamente aquí</p></div>`;
        }

        const ubicacionActualNombre = ubicacionActual?.ubicacion?.nombre || 'No especificada';
        const ubicacionActualTipo = ubicacionActual?.ubicacion?.tipo || '';
        const ubicacionActualDesc = ubicacionActual?.ubicacion?.descripcion || '';
        const iconoActual = ubicacionActual?.ubicacion?.tipo ? getTipoIcono(ubicacionActual.ubicacion.tipo) : '📍';

        Swal.fire({
            title: `<span class="text-primary">Historial de Ubicaciones</span>`,
            html: `<div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div class="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border-l-4 border-primary"><div class="flex justify-between items-start"><div><p class="font-bold text-primary text-lg">${activo?.nombre || 'Activo'}</p><p class="text-sm text-gray-500">Código: ${activo?.codigo_activo || 'N/A'}</p></div><div class="text-right"><span class="text-xs text-gray-400">Total de cambios: ${totalCambios}</span></div></div></div>
                <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-500"><h3 class="font-bold text-green-700 mb-2 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Ubicación Actual</h3><div class="flex items-center gap-2"><span class="text-2xl">${iconoActual}</span><div><p class="font-medium text-green-800">${ubicacionActualNombre}</p>${ubicacionActualTipo ? `<p class="text-xs text-gray-500">Tipo: ${ubicacionActualTipo}</p>` : ''}${ubicacionActualDesc ? `<p class="text-xs text-gray-500">${ubicacionActualDesc}</p>` : ''}</div></div></div>
                <div class="grid grid-cols-2 gap-3"><div class="bg-blue-50 p-3 rounded-lg text-center"><div class="text-2xl font-bold text-blue-600">${totalCambios}</div><div class="text-xs text-gray-600">Cambios registrados</div></div><div class="bg-purple-50 p-3 rounded-lg text-center"><div class="text-2xl font-bold text-purple-600">${ubicacionesUnicas.size}</div><div class="text-xs text-gray-600">Ubicaciones distintas</div></div></div>
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-orange-700 flex items-center gap-2"><i class="fas fa-history"></i> Historial de Cambios${totalCambios > 0 ? `<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">${totalCambios}</span>` : ''}</h3><span class="text-xs text-gray-400">Pasa el mouse sobre un registro para eliminarlo</span></div><div class="max-h-96 overflow-y-auto space-y-2">${historialHtml}</div></div>
                <div class="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2"><i class="fas fa-info-circle mt-0.5"></i><div><span class="font-medium">Nota:</span> Cada vez que se cambia la ubicación de un activo, se registra automáticamente en este historial. Los registros pueden ser eliminados por usuarios con permisos de administrador.</div></div>
            </div>`,
            width: '800px',
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true
        });
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando historial de ubicaciones:', error);
        mostrarAlerta('Error', 'No se pudo cargar el historial de ubicaciones: ' + error.message, 'error');
    }
};

window.eliminarRegistroUbicacion = async function(registroId, activoId) {
    try {
        const result = await Swal.fire({
            title: '¿Eliminar este registro?',
            text: 'Esta acción no se puede deshacer. El registro será eliminado permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            mostrarLoading('Eliminando registro...');
            const { error } = await window.supabaseClient
                .from('historial_ubicaciones_activos')
                .delete()
                .eq('id', registroId);
            if (error) throw error;
            ocultarLoading();
            mostrarAlerta('Éxito', 'Registro eliminado correctamente', 'success');
            await window.verHistorialUbicaciones(activoId);
        }
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error eliminando registro:', error);
        mostrarAlerta('Error', 'No se pudo eliminar el registro: ' + error.message, 'error');
    }
};

window.verHistorialEstados = async function(activoId) {
    mostrarLoading('Cargando historial de estados...');
    try {
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo, estado')
            .eq('id', activoId)
            .single();

        const { data: historial, error } = await window.supabaseClient
            .from('historial_estados_activos')
            .select(`*, cambiado_por (id, correo, empleado_id), asignacion:asignacion_id (*), mantenimiento:mantenimiento_id (*)`)
            .eq('activo_id', activoId)
            .order('fecha_cambio', { ascending: false });

        if (error) throw error;

        const usuariosConEmpleados = new Map();
        const usuariosIds = historial?.map(h => h.cambiado_por?.id).filter(id => id) || [];

        if (usuariosIds.length > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', usuariosIds);

            if (usuarios && usuarios.length > 0) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empleados } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empleadosMap = new Map(empleados?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const empleado = empleadosMap.get(u.empleado_id);
                        const nombre = empleado?.nombre_completo || u.correo;
                        usuariosConEmpleados.set(u.id, { nombre, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        ocultarLoading();

        const contadorEstados = new Map();
        historial?.forEach(h => contadorEstados.set(h.estado_nuevo, (contadorEstados.get(h.estado_nuevo) || 0) + 1));
        const totalCambios = historial?.length || 0;

        const estadoColors = {
            'DISPONIBLE': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', icon: 'fa-check-circle' },
            'ASIGNADO': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', icon: 'fa-user-check' },
            'REPARACIÓN': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500', icon: 'fa-tools' },
            'MANTENIMIENTO': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500', icon: 'fa-wrench' },
            'PRÉSTAMO': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-500', icon: 'fa-handshake' },
            'RESERVADO': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-500', icon: 'fa-clock' },
            'BAJA': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', icon: 'fa-trash-alt' }
        };

        let historialHtml = '';
        if (historial && historial.length > 0) {
            historial.forEach((h, index) => {
                const fecha = new Date(h.fecha_cambio).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const usuarioInfo = usuariosConEmpleados.get(h.cambiado_por?.id);
                const nombreUsuario = usuarioInfo?.nombre || h.cambiado_por?.correo || 'Sistema';

                const estadoAnterior = h.estado_anterior;
                const estadoNuevo = h.estado_nuevo;
                const colorAnterior = estadoColors[estadoAnterior] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400', icon: 'fa-circle' };
                const colorNuevo = estadoColors[estadoNuevo] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400', icon: 'fa-circle' };
                const esCreacion = !h.estado_anterior;

                let referenciaHtml = '';
                if (h.asignacion) {
                    const empleadoNombre = h.asignacion.empleado?.nombre_completo || 'N/A';
                    referenciaHtml = `<div class="mt-2 p-2 bg-blue-50 rounded-lg text-xs"><i class="fas fa-clipboard-list text-blue-500 mr-1"></i><span class="font-medium">Asignación:</span><span class="text-blue-700">${empleadoNombre}</span><span class="text-gray-400 ml-1">(${new Date(h.asignacion.fecha_asignacion).toLocaleDateString()})</span></div>`;
                } else if (h.mantenimiento) {
                    referenciaHtml = `<div class="mt-2 p-2 bg-purple-50 rounded-lg text-xs"><i class="fas fa-tools text-purple-500 mr-1"></i><span class="font-medium">Mantenimiento:</span><span class="text-purple-700">${h.mantenimiento.tipo || 'Mantenimiento'}</span>${h.mantenimiento.descripcion ? `<span class="text-gray-500 ml-1">- ${h.mantenimiento.descripcion.substring(0, 60)}${h.mantenimiento.descripcion.length > 60 ? '...' : ''}</span>` : ''}<span class="text-gray-400 ml-1">(${new Date(h.mantenimiento.fecha_solicitud).toLocaleDateString()})</span></div>`;
                }

                historialHtml += `
                    <div class="border-l-4 ${esCreacion ? 'border-green-500' : colorNuevo.border} pl-4 py-3 mb-3 bg-gray-50 rounded-r-lg relative group hover:bg-gray-100 transition-colors">
                        <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="eliminarRegistroEstado('${h.id}', '${activoId}')" class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors" title="Eliminar este registro"><i class="fas fa-trash-alt text-sm"></i></button>
                        </div>
                        <div class="pr-8">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full"><i class="far fa-clock mr-1"></i>${fecha}</span>
                                ${esCreacion ? `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><i class="fas fa-plus-circle"></i> Creación del activo</span>` : ''}
                                ${h.motivo ? `<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full"><i class="fas fa-quote-right"></i> ${h.motivo}</span>` : ''}
                            </div>
                            <div class="flex items-center gap-3 flex-wrap">
                                ${!esCreacion ? `<div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm"><i class="fas ${colorAnterior.icon} ${colorAnterior.text}"></i><div><span class="text-xs text-gray-500">Estado anterior</span><p class="font-medium ${colorAnterior.text}">${estadoAnterior || 'Sin estado'}</p></div></div><i class="fas fa-arrow-right text-gray-400 text-sm"></i>` : ''}
                                <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm ${esCreacion ? 'border-l-4 border-green-500' : ''}"><i class="fas ${colorNuevo.icon} text-primary"></i><div><span class="text-xs text-gray-500">${esCreacion ? 'Estado inicial' : 'Nuevo estado'}</span><p class="font-medium text-primary">${estadoNuevo}</p></div></div>
                            </div>
                            <div class="mt-2 text-xs text-gray-400 flex items-center gap-3"><span><i class="fas fa-user mr-1"></i>${nombreUsuario}</span>${h.cambiado_por?.correo ? `<span class="text-gray-300">|</span><span><i class="fas fa-envelope mr-1"></i>${h.cambiado_por.correo}</span>` : ''}</div>
                            ${referenciaHtml}
                        </div>
                    </div>
                `;
            });
        } else {
            historialHtml = `<div class="text-center py-8"><i class="fas fa-history text-5xl text-gray-300 mb-3"></i><p class="text-gray-500">No hay registros de cambios de estado para este activo</p><p class="text-sm text-gray-400 mt-2">Cuando se cambie el estado del activo, se registrará automáticamente aquí</p></div>`;
        }

        let barrasEstadosHtml = '';
        const estadosOrdenados = ['DISPONIBLE', 'ASIGNADO', 'MANTENIMIENTO', 'REPARACIÓN', 'PRÉSTAMO', 'RESERVADO', 'BAJA'];
        estadosOrdenados.forEach(estado => {
            const count = contadorEstados.get(estado) || 0;
            const porcentaje = totalCambios > 0 ? Math.round((count / totalCambios) * 100) : 0;
            const color = estadoColors[estado] || { bg: 'bg-gray-100', text: 'text-gray-800' };
            if (count > 0 || porcentaje > 0) {
                barrasEstadosHtml += `<div class="mb-2"><div class="flex justify-between text-xs mb-1"><span class="font-medium ${color.text}">${estado}</span><span class="text-gray-500">${count} cambio${count !== 1 ? 's' : ''} (${porcentaje}%)</span></div><div class="w-full bg-gray-200 rounded-full h-2"><div class="${color.bg} h-2 rounded-full" style="width: ${porcentaje}%"></div></div></div>`;
            }
        });

        const estadoActual = activo.estado || 'DISPONIBLE';
        const colorActual = estadoColors[estadoActual] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'fa-circle' };

        Swal.fire({
            title: `<span class="text-primary">Historial de Estados</span>`,
            html: `<div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div class="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border-l-4 border-primary"><div class="flex justify-between items-start"><div><p class="font-bold text-primary text-lg">${activo?.nombre || 'Activo'}</p><p class="text-sm text-gray-500">Código: ${activo?.codigo_activo || 'N/A'}</p></div><div class="text-right"><span class="text-xs text-gray-400">Total de cambios: ${totalCambios}</span></div></div></div>
                <div class="bg-${colorActual.bg.replace('bg-', '')} p-4 rounded-lg border-l-4 border-${colorActual.border.replace('border-', '')}"><h3 class="font-bold ${colorActual.text} mb-2 flex items-center gap-2"><i class="fas ${colorActual.icon}"></i> Estado Actual</h3><div class="flex items-center gap-2"><span class="text-2xl">${estadoActual === 'DISPONIBLE' ? '✅' : estadoActual === 'ASIGNADO' ? '👤' : estadoActual === 'MANTENIMIENTO' ? '🔧' : estadoActual === 'REPARACIÓN' ? '🛠️' : estadoActual === 'BAJA' ? '❌' : '📌'}</span><div><p class="font-medium text-lg ${colorActual.text}">${estadoActual}</p><p class="text-xs text-gray-500">Último estado registrado</p></div></div></div>
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500"><h3 class="font-bold text-blue-700 mb-3 flex items-center gap-2"><i class="fas fa-chart-bar"></i> Distribución de Cambios</h3>${barrasEstadosHtml || '<p class="text-gray-500 text-sm">No hay datos suficientes para mostrar estadísticas</p>'}</div>
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-orange-700 flex items-center gap-2"><i class="fas fa-history"></i> Historial de Cambios${totalCambios > 0 ? `<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">${totalCambios}</span>` : ''}</h3><span class="text-xs text-gray-400">Pasa el mouse sobre un registro para eliminarlo</span></div><div class="max-h-96 overflow-y-auto space-y-2">${historialHtml}</div></div>
                <div class="bg-gray-50 p-3 rounded-lg"><h4 class="text-xs font-semibold text-gray-500 mb-2">Leyenda de estados</h4><div class="grid grid-cols-2 sm:grid-cols-4 gap-2"><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-green-500"></span> Disponible</div><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-blue-500"></span> Asignado</div><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-purple-500"></span> Mantenimiento</div><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-yellow-500"></span> Reparación</div><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-indigo-500"></span> Préstamo</div><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-cyan-500"></span> Reservado</div><div class="flex items-center gap-1 text-xs"><span class="w-3 h-3 rounded-full bg-red-500"></span> Baja</div></div></div>
                <div class="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2"><i class="fas fa-info-circle mt-0.5"></i><div><span class="font-medium">Nota:</span> Cada vez que se cambia el estado de un activo (asignación, devolución, mantenimiento, etc.), se registra automáticamente en este historial. Los registros pueden ser eliminados por usuarios con permisos de administrador.</div></div>
            </div>`,
            width: '850px',
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true
        });
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando historial de estados:', error);
        mostrarAlerta('Error', 'No se pudo cargar el historial de estados: ' + error.message, 'error');
    }
};

window.eliminarRegistroEstado = async function(registroId, activoId) {
    try {
        const result = await Swal.fire({
            title: '¿Eliminar este registro?',
            text: 'Esta acción no se puede deshacer. El registro será eliminado permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            mostrarLoading('Eliminando registro...');
            const { error } = await window.supabaseClient
                .from('historial_estados_activos')
                .delete()
                .eq('id', registroId);
            if (error) throw error;
            ocultarLoading();
            mostrarAlerta('Éxito', 'Registro eliminado correctamente', 'success');
            await window.verHistorialEstados(activoId);
        }
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error eliminando registro:', error);
        mostrarAlerta('Error', 'No se pudo eliminar el registro: ' + error.message, 'error');
    }
};

// ==================== EDITAR SOFTWARE INSTALADO DESDE MODAL ====================
window.editarSoftwareInstaladoDesdeModal = async function(instalacionId, activoId) {
    console.log('✏️ Editando software instalado ID:', instalacionId);
    
    // Cerrar el modal actual de SweetAlert
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Llamar a la función de edición existente
    if (typeof window.editarSoftwareInstalado === 'function') {
        await window.editarSoftwareInstalado(instalacionId);
    } else {
        console.error('❌ La función editarSoftwareInstalado no está definida');
        mostrarAlerta('Error', 'No se puede editar el software instalado', 'error');
    }
};

// ==================== ELIMINAR SOFTWARE INSTALADO DESDE MODAL ====================
window.eliminarSoftwareInstaladoDesdeModal = async function(instalacionId, activoId) {
    const result = await Swal.fire({
        title: '¿Eliminar este software instalado?',
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
                .from('software_instalado')
                .delete()
                .eq('id', instalacionId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Software eliminado correctamente', 'success');
            
            // Actualizar el contador en el card
            if (vistaActual === 'activos') {
                await actualizarContadorSoftwareEnCard(activoId);
            }
            
            // Recargar el modal con la lista actualizada
            if (typeof window.verSoftwarePorActivo === 'function') {
                await window.verSoftwarePorActivo(activoId);
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el software: ' + error.message, 'error');
        }
    }
};

// ==================== FUNCIONES DE ACTIVOS (FILTROS) ====================
window.toggleFiltrosActivos = function() {
    const panel = document.getElementById('filtrosPanel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.style.animation = 'fadeInDown 0.2s ease-out';
        const primerCampo = panel.querySelector('input, select');
        if (primerCampo) setTimeout(() => primerCampo.focus(), 200);
    } else {
        panel.classList.add('hidden');
    }
};

window.cerrarFiltros = function() {
    const panel = document.getElementById('filtrosPanel');
    if (panel) panel.classList.add('hidden');
};

window.aplicarFiltrosActivos = function() {
    const cards = document.querySelectorAll('#activos-grid .card-item');
    const contadorSpan = document.getElementById('contadorActivos');

    const busqueda = document.getElementById('filtroBusqueda')?.value?.toLowerCase() || '';
    const tipoId = document.getElementById('filtroTipo')?.value;
    const marcaId = document.getElementById('filtroMarca')?.value;
    const estado = document.getElementById('filtroEstado')?.value;
    const empleadoId = document.getElementById('filtroEmpleado')?.value;
    const condicion = document.getElementById('filtroCondicion')?.value;
    const empresaId = document.getElementById('filtroEmpresa')?.value;
    const ubicacionId = document.getElementById('filtroUbicacion')?.value;
    const ano = document.getElementById('filtroAno')?.value;
    const compraDesde = document.getElementById('filtroCompraDesde')?.value;
    const compraHasta = document.getElementById('filtroCompraHasta')?.value;
    const garantia = document.getElementById('filtroGarantia')?.value;
    const orden = document.getElementById('ordenActivos')?.value;

    let contador = 0;
    const hoy = new Date();

    let cardsArray = Array.from(cards);
    if (orden && cardsArray.length > 0) {
        const [campo, direccion] = orden.split('.');
        const esAscendente = direccion === 'asc';
        cardsArray.sort((a, b) => {
            let valorA, valorB;
            switch(campo) {
                case 'nombre':
                    const nombreA = a.querySelector('h3')?.textContent?.toLowerCase() || '';
                    const nombreB = b.querySelector('h3')?.textContent?.toLowerCase() || '';
                    valorA = nombreA;
                    valorB = nombreB;
                    break;
                case 'estado':
                    valorA = a.dataset.estado || '';
                    valorB = b.dataset.estado || '';
                    break;
                case 'modificado_el': 
                    valorA = a.dataset.fechaModificacion || a.dataset.fechaCreacion || '';
                    valorB = b.dataset.fechaModificacion || b.dataset.fechaCreacion || '';
                    break;
                default:
                    valorA = a.dataset.fechaCreacion || '';
                    valorB = b.dataset.fechaCreacion || '';
            }
            if (campo === 'modificado_el') {
                const dateA = valorA ? new Date(valorA).getTime() : 0;
                const dateB = valorB ? new Date(valorB).getTime() : 0;
                return esAscendente ? dateA - dateB : dateB - dateA;
            }
            
            if (esAscendente) return valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
            else return valorA > valorB ? -1 : valorA < valorB ? 1 : 0;
        });
        const grid = document.getElementById('activos-grid');
        cardsArray.forEach(card => grid.appendChild(card));
    }

    cardsArray.forEach(card => {
        const cardTipoId = card.dataset.tipoId;
        const cardMarcaId = card.dataset.marcaId;
        const cardEstado = card.dataset.estado;
        const cardCondicion = card.dataset.condicion;
        const cardEmpresaId = card.dataset.empresaId;
        const cardUbicacionId = card.dataset.ubicacionId;
        const cardAno = card.dataset.ano;
        const cardCompra = card.dataset.fechaCompra;
        const cardGarantia = card.dataset.fechaGarantia;
        const cardTexto = card.dataset.busqueda || '';
        const cardEmpleadoId = card.dataset.empleadoId;

        let mostrar = true;

        if (busqueda && !cardTexto.includes(busqueda)) mostrar = false;
        if (mostrar && tipoId && tipoId !== '' && cardTipoId !== tipoId) mostrar = false;
        if (mostrar && marcaId && marcaId !== '' && cardMarcaId !== marcaId) mostrar = false;
        if (mostrar && estado && estado !== '' && cardEstado !== estado) mostrar = false;
        if (mostrar && empleadoId && empleadoId !== '' && cardEmpleadoId !== empleadoId) mostrar = false;
        if (mostrar && condicion && condicion !== '' && cardCondicion !== condicion) mostrar = false;
        if (mostrar && empresaId && empresaId !== '' && cardEmpresaId !== empresaId) mostrar = false;
        if (mostrar && ubicacionId && ubicacionId !== '' && cardUbicacionId !== ubicacionId) mostrar = false;
        if (mostrar && ano && ano !== '' && cardAno !== ano) mostrar = false;

        if (mostrar && cardCompra) {
            const fechaCompraDate = new Date(cardCompra);
            if (compraDesde && compraDesde !== '' && fechaCompraDate < new Date(compraDesde)) mostrar = false;
            if (compraHasta && compraHasta !== '' && fechaCompraDate > new Date(compraHasta)) mostrar = false;
        }

        if (mostrar && garantia && garantia !== '') {
            if (garantia === 'vigente') {
                if (!cardGarantia || new Date(cardGarantia) < hoy) mostrar = false;
            } else if (garantia === 'vencida') {
                if (!cardGarantia || new Date(cardGarantia) >= hoy) mostrar = false;
            } else if (garantia === 'sin') {
                if (cardGarantia) mostrar = false;
            }
        }

        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });

    if (contadorSpan) contadorSpan.textContent = `Mostrando ${contador} de ${cards.length} activos`;
    actualizarContadorFiltros();
    mostrarMensajeSinResultadosActivos(contador);
};

function actualizarContadorFiltros() {
    let contador = 0;
    const camposTexto = ['filtroBusqueda', 'filtroAno', 'filtroCompraDesde', 'filtroCompraHasta'];
    const camposSelect = ['filtroTipo', 'filtroMarca', 'filtroEstado', 'filtroEmpleado', 'filtroCondicion', 'filtroEmpresa', 'filtroUbicacion', 'filtroGarantia'];

    camposTexto.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento && elemento.value && elemento.value.trim() !== '') contador++;
    });
    camposSelect.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento && elemento.value && elemento.value !== '') contador++;
    });

    const badge = document.getElementById('filtrosBadge');
    if (badge) {
        if (contador > 0) {
            badge.textContent = contador;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

window.limpiarFiltrosActivos = function(event) {
    if (event) event.stopPropagation();
    const campos = ['filtroBusqueda', 'filtroTipo', 'filtroMarca', 'filtroEstado', 'filtroEmpleado', 'filtroCondicion', 'filtroEmpresa', 'filtroUbicacion', 'filtroAno', 'filtroCompraDesde', 'filtroCompraHasta', 'filtroGarantia'];
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (elemento.tagName === 'SELECT') elemento.value = '';
            else if (elemento.tagName === 'INPUT') elemento.value = '';
        }
    });
    const ordenSelect = document.getElementById('ordenActivos');
    if (ordenSelect) ordenSelect.value = 'creado_el.desc';
    window.aplicarFiltrosActivos();
    const panel = document.getElementById('filtrosPanel');
    if (panel) panel.classList.add('hidden');
    actualizarContadorFiltros();
};

function mostrarMensajeSinResultadosActivos(contador) {
    const grid = document.getElementById('activos-grid');
    let mensajeVacio = document.getElementById('filtro-activos-vacio');
    if (contador === 0) {
        if (!mensajeVacio) {
            mensajeVacio = document.createElement('div');
            mensajeVacio.id = 'filtro-activos-vacio';
            mensajeVacio.className = 'col-span-full text-center py-12 bg-white rounded-lg mt-4';
            mensajeVacio.innerHTML = `<div class="flex flex-col items-center justify-center"><div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4"><i class="fas fa-filter text-3xl text-gray-400"></i></div><p class="text-gray-500 text-lg">No hay activos que coincidan con los filtros</p><p class="text-gray-400 text-sm mt-2">Intenta con otros criterios de búsqueda</p><button onclick="limpiarFiltrosActivos(event)" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"><i class="fas fa-undo-alt mr-2"></i>Limpiar filtros</button></div>`;
            grid.appendChild(mensajeVacio);
        }
    } else if (mensajeVacio) {
        mensajeVacio.remove();
    }
}

function inicializarFiltrosActivos() {
    const filtroTipo = document.getElementById('filtroTipo');
    const filtroMarca = document.getElementById('filtroMarca');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroEmpleado = document.getElementById('filtroEmpleado');
    const filtroCondicion = document.getElementById('filtroCondicion');
    const filtroEmpresa = document.getElementById('filtroEmpresa');
    const filtroUbicacion = document.getElementById('filtroUbicacion');
    const filtroGarantia = document.getElementById('filtroGarantia');

    const filtros = [filtroTipo, filtroMarca, filtroEstado, filtroEmpleado, filtroCondicion, filtroEmpresa, filtroUbicacion, filtroGarantia];
    filtros.forEach(filtro => {
        if (filtro) filtro.addEventListener('change', () => { window.aplicarFiltrosActivos(); actualizarContadorFiltros(); });
    });

    const busquedaInput = document.getElementById('filtroBusqueda');
    if (busquedaInput) {
        let timeout;
        busquedaInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => { window.aplicarFiltrosActivos(); actualizarContadorFiltros(); }, 300);
        });
    }

    const anoInput = document.getElementById('filtroAno');
    if (anoInput) anoInput.addEventListener('input', () => { window.aplicarFiltrosActivos(); actualizarContadorFiltros(); });

    const compraDesde = document.getElementById('filtroCompraDesde');
    const compraHasta = document.getElementById('filtroCompraHasta');
    if (compraDesde) compraDesde.addEventListener('change', () => window.aplicarFiltrosActivos());
    if (compraHasta) compraHasta.addEventListener('change', () => window.aplicarFiltrosActivos());

    const ordenSelect = document.getElementById('ordenActivos');
    if (ordenSelect) ordenSelect.addEventListener('change', () => window.aplicarFiltrosActivos());
}

// ==================== FUNCIONES DE ACTIVOS (SELECTS) ====================
async function cargarActivosSelect(selectId, incluirVacio = true) {
    if (!selectId) {
        console.error('❌ cargarActivosSelect: selectId es undefined o null');
        return;
    }

    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        let query = window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo, estado, tipo_activo_id, tipos_activo (nombre)')
            .order('nombre', { ascending: true });

        if (usuarioActual && usuarioActual.permisos && usuarioActual.permisos.rol === 'OPERADOR_EMPRESA') {
            const empresaId = usuarioActual.permisos.empresaId;
            if (empresaId) query = query.eq('empresa_id', empresaId);
        }

        const { data, error } = await query;
        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar activo</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay activos registrados</option>';
            return;
        }

        const activosPorTipo = new Map();
        data.forEach(activo => {
            const tipoNombre = activo.tipos_activo?.nombre || 'Sin tipo';
            if (!activosPorTipo.has(tipoNombre)) activosPorTipo.set(tipoNombre, []);
            activosPorTipo.get(tipoNombre).push(activo);
        });

        const tiposOrdenados = Array.from(activosPorTipo.keys()).sort();
        tiposOrdenados.forEach(tipo => {
            const activosDelTipo = activosPorTipo.get(tipo);
            if (activosDelTipo && activosDelTipo.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📁 ${tipo} (${activosDelTipo.length})`;
                activosDelTipo.forEach(activo => {
                    const option = document.createElement('option');
                    option.value = activo.id;
                    let texto = `${activo.nombre}`;
                    if (activo.codigo_activo) texto += ` (${activo.codigo_activo})`;
                    if (activo.estado !== 'DISPONIBLE') texto += ` [${activo.estado}]`;
                    option.textContent = texto;
                    option.dataset.codigo = activo.codigo_activo || '';
                    option.dataset.tipo = activo.tipos_activo?.nombre || '';
                    option.dataset.estado = activo.estado || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });

        const event = new CustomEvent('activosCargados', { detail: { count: data.length } });
        select.dispatchEvent(event);
    } catch (error) {
        console.error(`❌ Error cargando activos en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar activos</option>';
    }
}

async function cargarActivosDisponiblesSelect(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        let query = window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo, estado, tipo_activo_id, tipos_activo (nombre)')
            .eq('estado', 'DISPONIBLE')
            .order('nombre', { ascending: true });

        if (usuarioActual && usuarioActual.permisos && usuarioActual.permisos.rol === 'OPERADOR_EMPRESA') {
            const empresaId = usuarioActual.permisos.empresaId;
            if (empresaId) query = query.eq('empresa_id', empresaId);
        }

        const { data, error } = await query;
        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar activo</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay activos disponibles</option>';
            return;
        }

        const activosPorTipo = new Map();
        data.forEach(activo => {
            const tipoNombre = activo.tipos_activo?.nombre || 'Sin tipo';
            if (!activosPorTipo.has(tipoNombre)) activosPorTipo.set(tipoNombre, []);
            activosPorTipo.get(tipoNombre).push(activo);
        });

        const tiposOrdenados = Array.from(activosPorTipo.keys()).sort();
        tiposOrdenados.forEach(tipo => {
            const activosDelTipo = activosPorTipo.get(tipo);
            if (activosDelTipo && activosDelTipo.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📁 ${tipo} (${activosDelTipo.length})`;
                activosDelTipo.forEach(activo => {
                    const option = document.createElement('option');
                    option.value = activo.id;
                    let texto = `${activo.nombre}`;
                    if (activo.codigo_activo) texto += ` (${activo.codigo_activo})`;
                    option.textContent = texto;
                    option.dataset.codigo = activo.codigo_activo || '';
                    option.dataset.tipo = activo.tipos_activo?.nombre || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error(`❌ Error cargando activos disponibles en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar activos</option>';
    }
}

async function cargarCategoriasSelect() {
    try {
        const { data, error } = await window.supabaseClient
            .from('categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        const select = document.getElementById('activo_categoria_id');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        data?.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
        });
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las categorías', 'error');
    }
}

async function cargarEmpresasSelect(selectId, incluirVacio = true, soloActivas = true) {
    if (!selectId) return;
    try {
        let query = window.supabaseClient.from('empresas').select('id, nombre, ruc').order('nombre');
        if (soloActivas) query = query.eq('activo', true);
        const { data, error } = await query;
        if (error) throw error;

        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar empresa</option>' : '';
        data?.forEach(emp => {
            const texto = emp.ruc ? `${emp.nombre} (${emp.ruc})` : emp.nombre;
            select.innerHTML += `<option value="${emp.id}">${texto}</option>`;
        });
    } catch (error) {
        console.error(`❌ Error cargando empresas en ${selectId}:`, error);
        mostrarAlerta('Error', 'No se pudieron cargar las empresas', 'error');
    }
}

// ==================== FUNCIÓN PARA ABRIR SOFTWARE INSTALADO CON ACTIVO ====================
window.abrirSoftwareInstaladoConActivo = async function(activoId) {
    console.log('🎯 Abriendo instalación de software para activo:', activoId);
    
    // Cerrar el modal de SweetAlert si está abierto
    const swalModal = document.querySelector('.swal2-container');
    if (swalModal) {
        console.log('Cerrando modal de SweetAlert...');
        Swal.close();
        // Pequeña pausa para asegurar que el modal se cierre
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Verificar que la función existe
    if (typeof window.abrirModalNuevoSoftwareInstalado !== 'function') {
        console.error('❌ abrirModalNuevoSoftwareInstalado no está definida');
        mostrarAlerta('Error', 'No se puede abrir el formulario de instalación', 'error');
        return;
    }
    
    // Abrir modal de nueva instalación
    await window.abrirModalNuevoSoftwareInstalado();
    
    // Precargar el activo en el select después de que el modal se abra
    setTimeout(async () => {
        const select = document.getElementById('si_activo_id');
        if (select) {
            let intentos = 0;
            const esperarSelect = setInterval(() => {
                if (select.options.length > 1 || intentos > 20) {
                    clearInterval(esperarSelect);
                    
                    // Verificar si el activo está disponible en el select
                    let opcionExiste = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === activoId) {
                            opcionExiste = true;
                            break;
                        }
                    }
                    
                    if (opcionExiste) {
                        select.value = activoId;
                        select.dispatchEvent(new Event('change'));
                        console.log('✅ Activo precargado en el formulario de software instalado');
                    } else {
                        console.warn('⚠️ El activo no está disponible en el select');
                        mostrarAlerta('Aviso', 'Este activo no está disponible para instalar software', 'info');
                    }
                }
                intentos++;
            }, 100);
        }
    }, 500);
};

window.abrirAccesoRemotoConActivo = async function(activoId) {
    console.log('🎯 Abriendo acceso remoto para activo:', activoId);
    
    // Cerrar el modal de SweetAlert si está abierto
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verificar que la función existe
    if (typeof window.abrirModalNuevoAccesoRemoto !== 'function') {
        console.error('❌ abrirModalNuevoAccesoRemoto no está definida');
        mostrarAlerta('Error', 'No se puede abrir el formulario de acceso remoto', 'error');
        return;
    }
    
    // Abrir modal de nuevo acceso remoto
    await window.abrirModalNuevoAccesoRemoto();
    
    // Precargar el activo en el select después de que el modal se abra
    setTimeout(async () => {
        const select = document.getElementById('acceso_activo_id');
        if (select) {
            let intentos = 0;
            const esperarSelect = setInterval(() => {
                if (select.options.length > 1 || intentos > 20) {
                    clearInterval(esperarSelect);
                    
                    let opcionExiste = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === activoId) {
                            opcionExiste = true;
                            break;
                        }
                    }
                    
                    if (opcionExiste) {
                        select.value = activoId;
                        select.dispatchEvent(new Event('change'));
                        console.log('✅ Activo precargado en el formulario de acceso remoto');
                    } else {
                        console.warn('⚠️ El activo no está disponible en el select');
                        mostrarAlerta('Aviso', 'Este activo no está disponible para configurar acceso remoto', 'info');
                    }
                }
                intentos++;
            }, 100);
        }
    }, 500);
};

window.abrirCredencialConActivo = async function(activoId) {
    console.log('🎯 Abriendo credencial para activo:', activoId);
    
    // Cerrar el modal de SweetAlert si está abierto
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verificar que la función existe
    if (typeof window.abrirModalNuevaCredencial !== 'function') {
        console.error('❌ abrirModalNuevaCredencial no está definida');
        mostrarAlerta('Error', 'No se puede abrir el formulario de credencial', 'error');
        return;
    }
    
    // Abrir modal de nueva credencial
    await window.abrirModalNuevaCredencial();
    
    // Precargar el activo en el select después de que el modal se abra
    setTimeout(async () => {
        const select = document.getElementById('credencial_activo_id');
        if (select) {
            let intentos = 0;
            const esperarSelect = setInterval(() => {
                if (select.options.length > 1 || intentos > 20) {
                    clearInterval(esperarSelect);
                    
                    let opcionExiste = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === activoId) {
                            opcionExiste = true;
                            break;
                        }
                    }
                    
                    if (opcionExiste) {
                        select.value = activoId;
                        select.dispatchEvent(new Event('change'));
                        console.log('✅ Activo precargado en el formulario de credencial');
                    } else {
                        console.warn('⚠️ El activo no está disponible en el select');
                        mostrarAlerta('Aviso', 'Este activo no está disponible para agregar credencial', 'info');
                    }
                }
                intentos++;
            }, 100);
        }
    }, 500);
};

window.abrirRespaldoConActivo = async function(activoId) {
    console.log('🎯 Abriendo tarea de respaldo para activo:', activoId);
    
    // Cerrar el modal de SweetAlert si está abierto
    Swal.close();
    
    // Pequeña pausa para asegurar que el modal se cierre
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verificar que la función existe
    if (typeof window.abrirModalNuevaTareaRespaldo !== 'function') {
        console.error('❌ abrirModalNuevaTareaRespaldo no está definida');
        mostrarAlerta('Error', 'No se puede abrir el formulario de tarea de respaldo', 'error');
        return;
    }
    
    // Abrir modal de nueva tarea de respaldo
    await window.abrirModalNuevaTareaRespaldo();
    
    // Precargar el activo en el select después de que el modal se abra
    setTimeout(async () => {
        const select = document.getElementById('tarea_activo_id');
        if (select) {
            let intentos = 0;
            const esperarSelect = setInterval(() => {
                if (select.options.length > 1 || intentos > 20) {
                    clearInterval(esperarSelect);
                    
                    let opcionExiste = false;
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === activoId) {
                            opcionExiste = true;
                            break;
                        }
                    }
                    
                    if (opcionExiste) {
                        select.value = activoId;
                        select.dispatchEvent(new Event('change'));
                        console.log('✅ Activo precargado en el formulario de tarea de respaldo');
                    } else {
                        console.warn('⚠️ El activo no está disponible en el select');
                        mostrarAlerta('Aviso', 'Este activo no está disponible para programar respaldo', 'info');
                    }
                }
                intentos++;
            }, 100);
        }
    }, 500);
};

// ==================== FUNCIÓN PARA RESETEAR NOMBRE AUTOMÁTICO DEL ACTIVO ====================
window.resetearNombreAutomatico = function() {
    const nombreInput = document.getElementById('activo_nombre');
    if (!nombreInput) {
        console.warn('⚠️ No se encontró el campo de nombre del activo');
        return;
    }
    
    // Resetear la bandera de edición manual
    nombreInput.dataset.editadoManualmente = 'false';
    nombreInput.dataset.ultimoGenerado = '';
    
    // Regenerar el nombre
    if (typeof actualizarNombreActivo === 'function') {
        actualizarNombreActivo();
        mostrarAlerta('Éxito', 'Nombre regenerado automáticamente', 'success');
    } else {
        console.error('❌ La función actualizarNombreActivo no está definida');
        mostrarAlerta('Error', 'No se pudo regenerar el nombre automáticamente', 'error');
    }
};

// ==================== FUNCIÓN PARA ACTUALIZAR NOMBRE DEL ACTIVO ====================
function actualizarNombreActivo() {
    const nombreInput = document.getElementById('activo_nombre');
    if (!nombreInput) return;
    
    const nombreGenerado = generarNombreActivo();
    
    // Verificar si debemos actualizar
    const debeActualizar = !nombreInput.value || 
                        nombreInput.value === 'Laptop' || 
                        nombreInput.value === 'Desktop' ||
                        nombreInput.value === 'Activo nuevo' ||
                        nombreInput.dataset.editadoManualmente !== 'true';
    
    if (debeActualizar) {
        nombreInput.value = nombreGenerado;
        nombreInput.dataset.ultimoGenerado = nombreGenerado;
        console.log(`✅ Nombre actualizado a: "${nombreGenerado}"`);
    } else {
        console.log('⏭️ No se actualiza - el usuario editó manualmente');
    }
}

// Asegurar que esté disponible globalmente
window.actualizarNombreActivo = actualizarNombreActivo;

// ==================== OBTENER VALORES ÚNICOS PARA FILTROS DINÁMICOS ====================
function obtenerValoresUnicosParaFiltros(activos, campo) {
    const valoresMap = new Map();
    
    activos.forEach(activo => {
        let valor, id;
        
        switch(campo) {
            case 'tipo':
                if (activo.tipos_activo) {
                    valor = activo.tipos_activo.nombre;
                    id = activo.tipo_activo_id;
                }
                break;
                
            case 'marca':
                if (activo.info_general?.marcas) {
                    valor = activo.info_general.marcas.nombre;
                    id = activo.info_general.marca_id;
                }
                break;
                
            case 'estado':
                if (activo.estado) {
                    valor = activo.estado;
                    id = activo.estado;
                }
                break;
                
            case 'ubicacion':
                if (activo.ubicacion) {
                    valor = activo.ubicacion.nombre;
                    id = activo.ubicacion_id;
                }
                break;
                
            case 'condicion':
                if (activo.info_general?.condicion_fisica) {
                    valor = activo.info_general.condicion_fisica;
                    id = activo.info_general.condicion_fisica;
                }
                break;
        }
        
        if (valor && !valoresMap.has(id)) {
            valoresMap.set(id, valor);
        }
    });
    
    // Ordenar alfabéticamente
    const valores = Array.from(valoresMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, nombre]) => ({ id, nombre }));
    
    return valores;
}

// ==================== ACTUALIZAR CONTADOR DE CREDENCIALES EN CARD ====================
async function actualizarContadorCredencialesEnCard(activoId) {
    try {
        console.log(`🔄 Actualizando contador de credenciales para activo: ${activoId}`);
        
        const { data: credenciales, error, count } = await window.supabaseClient
            .from('credenciales')
            .select('id', { count: 'exact', head: true })
            .eq('activo_id', activoId)
            .eq('activo', true);
        
        if (error) throw error;
        
        const totalCredenciales = count || 0;
        
        const card = document.querySelector(`.card-item[data-id="${activoId}"]`);
        if (!card) return;
        
        // Buscar la sección que contiene "Software" y "Credenciales" juntos
        const secciones = card.querySelectorAll('.flex.items-center.justify-between');
        let seccionMixta = null;
        
        for (const sec of secciones) {
            const texto = sec.innerText;
            if (texto.includes('Software') && texto.includes('Credenciales')) {
                seccionMixta = sec;
                break;
            }
        }
        
        if (!seccionMixta) {
            console.warn('Sección mixta Software/Credenciales no encontrada');
            return;
        }
        
        // Dentro de esta sección, buscar el badge de credenciales
        // El badge de credenciales está en la parte derecha de la sección
        const badges = seccionMixta.querySelectorAll('.text-xs.font-bold.px-1\\.5.py-0\\.5.rounded-full');
        
        // El primer badge es de software, el segundo es de credenciales
        let badgeCredenciales = null;
        if (badges.length >= 2) {
            badgeCredenciales = badges[1]; // El segundo badge es el de credenciales
        } else {
            // Buscar por color
            badgeCredenciales = seccionMixta.querySelector('.bg-amber-100.text-amber-700');
        }
        
        if (totalCredenciales > 0) {
            if (badgeCredenciales) {
                badgeCredenciales.textContent = totalCredenciales;
                console.log(`✅ Badge credenciales actualizado: ${totalCredenciales}`);
            } else {
                // Crear badge y agregarlo junto al texto "Credenciales"
                const contenedorCredenciales = seccionMixta.querySelector('.flex.items-center.gap-2:last-child');
                if (contenedorCredenciales) {
                    const nuevoBadge = document.createElement('span');
                    nuevoBadge.className = 'text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full';
                    nuevoBadge.textContent = totalCredenciales;
                    contenedorCredenciales.appendChild(nuevoBadge);
                }
            }
        } else {
            if (badgeCredenciales) badgeCredenciales.remove();
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==================== ACTUALIZAR CONTADOR DE ACCESOS REMOTOS EN CARD ====================
async function actualizarContadorAccesosEnCard(activoId) {
    try {
        console.log(`🔄 Actualizando contador de accesos remotos para activo: ${activoId}`);
        
        const { data: accesos, error, count } = await window.supabaseClient
            .from('accesos_remotos')
            .select('id', { count: 'exact', head: true })
            .eq('activo_id', activoId)
            .eq('activo', true);
        
        if (error) throw error;
        
        const totalAccesos = count || 0;
        console.log(`📊 Total accesos remotos encontrados: ${totalAccesos}`);
        
        const card = document.querySelector(`.card-item[data-id="${activoId}"]`);
        if (!card) return;
        
        // Buscar la sección de accesos por texto exacto "Accesos"
        let accesosSection = null;
        const allSpans = card.querySelectorAll('.text-xs.font-medium.text-gray-600');
        for (const span of allSpans) {
            if (span.innerText.trim() === 'Accesos') {
                accesosSection = span.closest('.flex.items-center.justify-between');
                break;
            }
        }
        
        if (!accesosSection) {
            const allDivs = card.querySelectorAll('.flex.items-center.justify-between');
            for (const div of allDivs) {
                if (div.innerText.includes('Accesos') && !div.innerText.includes('Software') && !div.innerText.includes('Credenciales')) {
                    accesosSection = div;
                    break;
                }
            }
        }
        
        if (!accesosSection) return;
        
        const buttonsContainer = accesosSection.querySelector('.flex.items-center.gap-2') || 
                                  accesosSection.querySelector('.flex.items-center.gap-1');
        
        if (!buttonsContainer) return;
        
        let badge = buttonsContainer.querySelector('.bg-purple-100.text-purple-700');
        
        if (totalAccesos > 0) {
            if (badge) {
                badge.textContent = totalAccesos;
                console.log(`✅ Badge de accesos actualizado: ${totalAccesos}`);
            } else {
                badge = document.createElement('span');
                badge.className = 'text-xs font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full ml-1';
                badge.textContent = totalAccesos;
                buttonsContainer.parentNode.insertBefore(badge, buttonsContainer.nextSibling);
                console.log(`✅ Badge de accesos creado: ${totalAccesos}`);
            }
        } else {
            if (badge) {
                badge.remove();
                console.log(`✅ Badge de accesos eliminado (0)`);
            }
        }
        
        const swalModal = document.querySelector('.swal2-container');
        if (swalModal && swalModal.style.display !== 'none' && swalModal.innerText.includes('Accesos')) {
            if (typeof window.verAccesosPorActivo === 'function') {
                await window.verAccesosPorActivo(activoId);
            }
        }
        
    } catch (error) {
        console.error('❌ Error actualizando contador de accesos remotos:', error);
    }
}

// ==================== ACTUALIZAR CONTADOR DE RESPALDOS EN CARD ====================
async function actualizarContadorRespaldosEnCard(activoId) {
    try {
        console.log(`🔄 Actualizando contador de respaldos para activo: ${activoId}`);
        
        const { data: respaldos, error, count } = await window.supabaseClient
            .from('tareas_respaldo')
            .select('id', { count: 'exact', head: true })
            .eq('activo_id', activoId)
            .eq('activo', true);
        
        if (error) throw error;
        
        const totalRespaldos = count || 0;
        console.log(`📊 Total tareas de respaldo encontradas: ${totalRespaldos}`);
        
        const card = document.querySelector(`.card-item[data-id="${activoId}"]`);
        if (!card) return;
        
        // Buscar la sección de respaldos por texto exacto "Respaldos"
        let respaldosSection = null;
        const allSpans = card.querySelectorAll('.text-xs.font-medium.text-gray-600');
        for (const span of allSpans) {
            if (span.innerText.trim() === 'Respaldos') {
                respaldosSection = span.closest('.flex.items-center.justify-between');
                break;
            }
        }
        
        if (!respaldosSection) {
            const allDivs = card.querySelectorAll('.flex.items-center.justify-between');
            for (const div of allDivs) {
                if (div.innerText.includes('Respaldos') && !div.innerText.includes('Software') && !div.innerText.includes('Credenciales') && !div.innerText.includes('Accesos')) {
                    respaldosSection = div;
                    break;
                }
            }
        }
        
        if (!respaldosSection) return;
        
        const buttonsContainer = respaldosSection.querySelector('.flex.items-center.gap-2') || 
                                  respaldosSection.querySelector('.flex.items-center.gap-1');
        
        if (!buttonsContainer) return;
        
        let badge = buttonsContainer.querySelector('.bg-teal-100.text-teal-700');
        
        if (totalRespaldos > 0) {
            if (badge) {
                badge.textContent = totalRespaldos;
                console.log(`✅ Badge de respaldos actualizado: ${totalRespaldos}`);
            } else {
                badge = document.createElement('span');
                badge.className = 'text-xs font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full ml-1';
                badge.textContent = totalRespaldos;
                buttonsContainer.parentNode.insertBefore(badge, buttonsContainer.nextSibling);
                console.log(`✅ Badge de respaldos creado: ${totalRespaldos}`);
            }
        } else {
            if (badge) {
                badge.remove();
                console.log(`✅ Badge de respaldos eliminado (0)`);
            }
        }
        
        const swalModal = document.querySelector('.swal2-container');
        if (swalModal && swalModal.style.display !== 'none' && swalModal.innerText.includes('Respaldo')) {
            if (typeof window.verRespaldosPorActivo === 'function') {
                await window.verRespaldosPorActivo(activoId);
            }
        }
        
    } catch (error) {
        console.error('❌ Error actualizando contador de respaldos:', error);
    }
}

// ==================== ACTUALIZAR CONTADOR DE SOFTWARE EN CARD ====================
async function actualizarContadorSoftwareEnCard(activoId) {
    try {
        console.log(`🔄 Actualizando contador de software para activo: ${activoId}`);
        
        // Obtener el nuevo conteo de software
        const { data: softwareList, error, count } = await window.supabaseClient
            .from('software_instalado')
            .select('id', { count: 'exact', head: true })
            .eq('activo_id', activoId)
            .eq('estado', 'INSTALADO');
        
        if (error) throw error;
        
        const totalSoftware = count || 0;
        console.log(`📊 Total software encontrado: ${totalSoftware}`);
        
        // Buscar el card del activo por data-id
        const card = document.querySelector(`.card-item[data-id="${activoId}"]`);
        if (!card) {
            console.warn(`⚠️ Card no encontrado para activo: ${activoId}`);
            return;
        }
        
        // Buscar la sección de software dentro del card
        // Método 1: Buscar por el texto "Software"
        let softwareSection = null;
        
        // Buscar todos los divs con clase flex que contengan "Software"
        const allFlexDivs = card.querySelectorAll('.flex.items-center.justify-between');
        for (const div of allFlexDivs) {
            if (div.innerText.includes('Software')) {
                softwareSection = div;
                break;
            }
        }
        
        if (!softwareSection) {
            console.warn(`⚠️ Sección de software no encontrada en el card`);
            return;
        }
        
        // Encontrar el contenedor de los botones (donde va el badge)
        const buttonsContainer = softwareSection.querySelector('.flex.items-center.gap-2') || 
                                  softwareSection.querySelector('.flex.items-center.gap-1');
        
        if (!buttonsContainer) {
            console.warn(`⚠️ Contenedor de botones no encontrado`);
            return;
        }
        
        // Buscar el badge existente
        let badge = buttonsContainer.querySelector('.bg-indigo-100.text-indigo-700');
        
        if (totalSoftware > 0) {
            if (badge) {
                // Actualizar badge existente
                badge.textContent = totalSoftware;
                console.log(`✅ Badge actualizado: ${totalSoftware}`);
            } else {
                // Crear nuevo badge
                badge = document.createElement('span');
                badge.className = 'text-xs font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full ml-1';
                badge.textContent = totalSoftware;
                buttonsContainer.appendChild(badge);
                console.log(`✅ Badge creado: ${totalSoftware}`);
            }
        } else {
            // Si no hay software, eliminar badge si existe
            if (badge) {
                badge.remove();
                console.log(`✅ Badge eliminado (0 software)`);
            }
        }
        
        // También actualizar el contador en el modal de ver software si está abierto
        const swalModal = document.querySelector('.swal2-container');
        if (swalModal && swalModal.style.display !== 'none') {
            // El modal de ver software está abierto, recargarlo
            if (typeof window.verSoftwarePorActivo === 'function') {
                await window.verSoftwarePorActivo(activoId);
            }
        }
        
    } catch (error) {
        console.error('❌ Error actualizando contador de software:', error);
    }
}

// ==================== TOGGLE FILTROS ACTIVOS (VERSIÓN CORREGIDA) ====================
// ==================== TOGGLE PANEL DE FILTROS ====================
window.toggleFiltrosActivosPanel = function() {
    console.log('🔄 toggleFiltrosActivosPanel ejecutado');
    
    const panel = document.getElementById('panelFiltrosActivos');
    const icon = document.getElementById('filtrosActivosIcon');
    
    if (!panel) {
        console.error('❌ Panel de filtros no encontrado');
        return;
    }
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        panel.style.display = '';
        if (icon) {
            icon.style.transform = 'rotate(180deg)';
        }
        console.log('✅ Panel expandido');
    } else {
        panel.classList.add('hidden');
        panel.style.display = 'none';
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }
        console.log('✅ Panel contraído');
    }
};

// También definir en el scope global sin window
var toggleFiltrosActivosPanel = window.toggleFiltrosActivosPanel;

// Forzar inicialización correcta del panel
function inicializarPanelFiltros() {
    const panel = document.getElementById('panelFiltrosActivos');
    const icon = document.getElementById('filtrosActivosIcon');
    
    if (panel) {
        // Asegurar que el panel comience oculto
        panel.classList.add('hidden');
        panel.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

// Exportar función de inicialización
window.inicializarPanelFiltros = inicializarPanelFiltros;

// ==================== INICIALIZAR FILTROS DE ACTIVOS ====================
function inicializarFiltrosActivos() {
    console.log('✅ inicializarFiltrosActivos ejecutado');
    
    // Configurar eventos para selects múltiples si es necesario
    const selectsMultiples = ['filtroTipo', 'filtroMarca', 'filtroEstado', 
                              'filtroEmpresa', 'filtroUbicacion', 'filtroCondicion', 
                              'filtroEmpleado'];
    
    selectsMultiples.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            // Eliminar evento anterior si existe
            select.removeEventListener('change', function() {});
            // Agregar nuevo evento (opcional)
            select.addEventListener('change', function() {
                console.log(`📊 Filtro ${id} cambiado:`, obtenerValoresMultiples(id));
            });
        }
    });
    
    // Configurar panel de filtros
    const toggleBtn = document.querySelector('[onclick*="toggleFiltrosActivosPanel"]');
    if (toggleBtn && !toggleBtn.hasAttribute('data-initialized')) {
        toggleBtn.setAttribute('data-initialized', 'true');
        console.log('✅ Botón de filtros inicializado');
    }
}

// Exponer globalmente
window.inicializarFiltrosActivos = inicializarFiltrosActivos;


// Exponer funciones globalmente
window.actualizarContadorSoftwareEnCard = actualizarContadorSoftwareEnCard;
window.actualizarContadorCredencialesEnCard = actualizarContadorCredencialesEnCard;
window.actualizarContadorAccesosEnCard = actualizarContadorAccesosEnCard;
window.actualizarContadorRespaldosEnCard = actualizarContadorRespaldosEnCard