// ==================== FUNCIONES DE EXPORTACIÓN A EXCEL ====================

// Función para exportar cualquier tabla a Excel
function exportarTablaAExcel(tablaId, nombreArchivo = 'reporte') {
    const tabla = document.getElementById(tablaId);
    if (!tabla) {
        console.error('Tabla no encontrada:', tablaId);
        mostrarAlerta('Error', 'No se encontró la tabla para exportar', 'error');
        return;
    }
    
    try {
        // Obtener datos de la tabla
        const data = [];
        
        // Obtener cabeceras
        const headers = [];
        tabla.querySelectorAll('thead th').forEach(th => {
            headers.push(th.innerText.trim());
        });
        data.push(headers);
        
        // Obtener filas de datos
        tabla.querySelectorAll('tbody tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('td').forEach(td => {
                row.push(td.innerText.trim());
            });
            if (row.length > 0) {
                data.push(row);
            }
        });
        
        // Crear hoja de trabajo
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Ajustar ancho de columnas
        const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
        ws['!cols'] = colWidths;
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        
        // Exportar
        XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        mostrarAlerta('Éxito', 'Reporte exportado correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar el reporte', 'error');
    }
}

// Función para exportar datos personalizados a Excel
function exportarDatosAExcel(datos, columnas, nombreArchivo = 'reporte') {
    try {
        // Crear cabeceras
        const data = [columnas];
        
        // Agregar filas de datos
        datos.forEach(item => {
            const row = [];
            columnas.forEach(col => {
                let valor = '';
                // Soporte para anidación (ej: 'empresa.nombre')
                if (col.includes('.')) {
                    const partes = col.split('.');
                    let temp = item;
                    for (const parte of partes) {
                        temp = temp?.[parte];
                    }
                    valor = temp !== undefined && temp !== null ? temp : '';
                } else {
                    valor = item[col] !== undefined && item[col] !== null ? item[col] : '';
                }
                row.push(valor);
            });
            data.push(row);
        });
        
        // Crear hoja de trabajo
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Ajustar ancho de columnas
        const colWidths = columnas.map(() => ({ wch: 20 }));
        ws['!cols'] = colWidths;
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        
        // Exportar
        XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        mostrarAlerta('Éxito', 'Reporte exportado correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar el reporte', 'error');
    }
}

// ==================== VISTA REPORTES ====================
async function cargarReportes() {
    mostrarLoading('Cargando reportes...');

    try {
        console.log('%c📊 CARGANDO REPORTES DETALLADOS', 'background: #17a2b8; color: white; font-size: 14px;');

        // ========== DATOS COMPLETOS ==========
        const { data: activosCompletos } = await window.supabaseClient
            .from('activos')
            .select(`*, tipos_activo (nombre), empresa:empresa_id (nombre, ruc), ubicacion:ubicacion_id (nombre, descripcion)`)
            .order('creado_el', { ascending: false });

        const { data: asignacionesCompletas } = await window.supabaseClient
            .from('asignaciones')
            .select(`*, activo:activos (nombre, codigo_activo), empleado:empleados (nombre_completo, puesto, correo)`)
            .order('fecha_asignacion', { ascending: false });

        const { data: mantenimientosCompletos } = await window.supabaseClient
            .from('mantenimientos')
            .select(`*, activo:activos (nombre, codigo_activo)`)
            .order('fecha_solicitud', { ascending: false });

        const { data: softwareCompleto } = await window.supabaseClient
            .from('software_instalado')
            .select(`*, software:software_id (nombre, fabricante), activo:activos (nombre, codigo_activo)`)
            .eq('estado', 'INSTALADO')
            .order('fecha_instalacion', { ascending: false });

        const { data: licenciasCompletas } = await window.supabaseClient
            .from('licencias')
            .select(`*, software:software_id (nombre)`)
            .order('fecha_vencimiento', { ascending: true });

        const { data: empleadosCompletos } = await window.supabaseClient
            .from('empleados')
            .select(`*, areas (nombre), empresa:empresa_id (nombre)`)
            .order('nombre_completo', { ascending: true });

        // ========== ESTADÍSTICAS ==========
        const hoy = new Date();
        const activosPorEstado = new Map();
        activosCompletos?.forEach(a => {
            const estado = a.estado || 'DISPONIBLE';
            activosPorEstado.set(estado, (activosPorEstado.get(estado) || 0) + 1);
        });

        const { data: infoGeneralCompleta } = await window.supabaseClient
            .from('info_general')
            .select(`*, marca:marca_id (nombre)`);
        
        const activosPorMarcaCompleto = new Map();
        infoGeneralCompleta?.forEach(i => {
            const marca = i.marca?.nombre || 'Sin marca';
            activosPorMarcaCompleto.set(marca, (activosPorMarcaCompleto.get(marca) || 0) + 1);
        });

        const softwareInstaladoCompleto = new Map();
        softwareCompleto?.forEach(s => {
            const nombre = s.software?.nombre || 'Software desconocido';
            softwareInstaladoCompleto.set(nombre, (softwareInstaladoCompleto.get(nombre) || 0) + 1);
        });

        const licenciasActivas = licenciasCompletas?.filter(l => l.activo).length || 0;
        const licenciasInactivas = licenciasCompletas?.filter(l => !l.activo).length || 0;

        const mantenimientosPorResultado = new Map();
        mantenimientosCompletos?.forEach(m => {
            const resultado = m.resultado || 'PENDIENTE';
            mantenimientosPorResultado.set(resultado, (mantenimientosPorResultado.get(resultado) || 0) + 1);
        });

        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const asignacionesPorMesCompleto = new Array(12).fill(0);
        asignacionesCompletas?.forEach(a => {
            if (a.fecha_asignacion) {
                const fecha = new Date(a.fecha_asignacion);
                asignacionesPorMesCompleto[fecha.getMonth()]++;
            }
        });

        const empleadosPorAreaCompleto = new Map();
        empleadosCompletos?.forEach(e => {
            const area = e.areas?.nombre || 'Sin área';
            empleadosPorAreaCompleto.set(area, (empleadosPorAreaCompleto.get(area) || 0) + 1);
        });

        ocultarLoading();

        // ============================================
        // GENERAR HTML CORREGIDO
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-chart-bar"></i> Reportes y Estadísticas
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Análisis detallado de datos históricos y tendencias</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarReportesExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"><i class="fas fa-file-excel"></i> Exportar Excel</button>
                        <button onclick="exportarReportesPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"><i class="fas fa-print"></i> Imprimir</button>
                        <button onclick="limpiarFiltrosReportes()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"><i class="fas fa-undo-alt"></i> Limpiar filtros</button>
                    </div>
                </div>
            </div>

            <!-- FILTROS -->
            <div class="bg-white rounded-xl shadow-sm mb-6 border border-gray-200 overflow-hidden">
                <div class="bg-primary text-white px-4 py-3 flex justify-between items-center cursor-pointer md:cursor-default" onclick="toggleFiltrosReportes()">
                    <div class="flex items-center gap-2"><i class="fas fa-filter"></i><span class="font-semibold">Filtros de reportes</span></div>
                    <i class="fas fa-chevron-down md:hidden transition-transform" id="filtrosReportesIcon"></i>
                </div>
                <div id="panelFiltrosReportes" class="p-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="lg:col-span-1">
                            <label class="block text-xs font-medium text-gray-700 mb-1">
                                <i class="fas fa-chart-simple text-primary mr-1"></i> Tipo de reporte
                            </label>
                            <select id="reporteTipo" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white" onchange="cambiarTipoReporte()">
                                <option value="todos">Todos</option>
                                <option value="activos">Activos</option>
                                <option value="asignaciones">Asignaciones</option>
                                <option value="mantenimientos">Mantenimientos</option>
                                <option value="software">Software Instalado</option>
                                <option value="licencias">Licencias</option>
                                <option value="empleados">Empleados</option>
                                <option value="ips">Direcciones IP</option>
                                <option value="especificaciones">Especificaciones Técnicas</option>
                                <option value="activosPorUbicacion">Activos por Ubicación</option>
                                <option value="activosPorEmpresa">Activos por Empresa</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button onclick="aplicarFiltrosReportes()" class="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                                <i class="fas fa-search"></i> Aplicar filtros
                            </button>
                        </div>
                        <div class="flex items-end justify-end">
                            <button onclick="limpiarFiltrosReportes()" class="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                                <i class="fas fa-undo-alt"></i> Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KPIs AVANZADOS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Activos</p>
                            <p class="text-2xl font-bold text-primary" id="contador-activos-total">${activosCompletos?.length || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Registrados en sistema</p>
                        </div>
                        <div class="bg-primary/10 p-2 rounded-lg"><i class="fas fa-desktop text-primary"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Empleados</p>
                            <p class="text-2xl font-bold text-green-600">${empleadosCompletos?.length || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Activos en el sistema</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg"><i class="fas fa-users text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Asignaciones Totales</p>
                            <p class="text-2xl font-bold text-blue-600">${asignacionesCompletas?.length || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Histórico completo</p>
                        </div>
                        <div class="bg-blue-50 p-2 rounded-lg"><i class="fas fa-clipboard-list text-blue-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Mantenimientos</p>
                            <p class="text-2xl font-bold text-orange-600">${mantenimientosCompletos?.length || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Registrados en sistema</p>
                        </div>
                        <div class="bg-orange-50 p-2 rounded-lg"><i class="fas fa-tools text-orange-600"></i></div>
                    </div>
                </div>
            </div>

            <!-- GRÁFICOS -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-chart-pie text-primary"></i> Activos por Estado (Todos)</h3>
                    <canvas id="reporteChartEstado" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-trademark text-primary"></i> Activos por Marca (Todos)</h3>
                    <canvas id="reporteChartMarca" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-code text-primary"></i> Software Instalado (Todos)</h3>
                    <canvas id="reporteChartSoftware" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-chart-line text-primary"></i> Asignaciones por Mes</h3>
                    <canvas id="reporteChartAsignaciones" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-tools text-primary"></i> Mantenimientos por Resultado</h3>
                    <canvas id="reporteChartMantenimientos" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-users text-primary"></i> Empleados por Área</h3>
                    <canvas id="reporteChartEmpleados" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 lg:col-span-2">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2"><i class="fas fa-chart-bar text-primary"></i> Distribución de Licencias</h3>
                    <canvas id="reporteChartLicencias" height="200"></canvas>
                </div>
            </div>

            <!-- TABLA DE ACTIVOS -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="seccion-activos">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700"><i class="fas fa-desktop text-primary mr-2"></i>Listado Completo de Activos <span class="text-sm text-gray-400 ml-1">(<span id="contador-activos">${activosCompletos?.length || 0}</span> registros)</span></h3>
                    <button onclick="window.cargarVista('activos')" class="text-xs text-primary hover:underline">Ver gestión →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tabla-activos-body">
                            ${activosCompletos?.slice(0, 50).map(a => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm font-mono">${a.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.tipos_activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge estado-${a.estado || 'DISPONIBLE'}">${a.estado || 'DISPONIBLE'}</span></td>
                                    <td class="px-4 py-2 text-sm">${a.empresa?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.ubicacion?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.creado_el ? new Date(a.creado_el).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${activosCompletos?.length > 50 ? `<div class="text-center py-3 text-sm text-gray-500 border-t">Mostrando 50 de ${activosCompletos.length} activos. Use los filtros para ver más resultados.</div>` : ''}
                </div>
            </div>

            <!-- TABLA DE ASIGNACIONES -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="seccion-asignaciones">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700"><i class="fas fa-clipboard-list text-primary mr-2"></i>Historial de Asignaciones <span class="text-sm text-gray-400 ml-1">(<span id="contador-asignaciones">${asignacionesCompletas?.length || 0}</span> registros)</span></h3>
                    <button onclick="window.cargarVista('asignaciones')" class="text-xs text-primary hover:underline">Ver gestión →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Asignación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Devolución</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tabla-asignaciones-body">
                            ${asignacionesCompletas?.slice(0, 50).map(a => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm">${a.activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.empleado?.nombre_completo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString() : 'Pendiente'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge ${a.estado === 'ACTIVA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${a.estado || 'ACTIVA'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TABLA DE MANTENIMIENTOS -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="seccion-mantenimientos">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700"><i class="fas fa-tools text-primary mr-2"></i>Historial de Mantenimientos <span class="text-sm text-gray-400 ml-1">(<span id="contador-mantenimientos">${mantenimientosCompletos?.length || 0}</span> registros)</span></h3>
                    <button onclick="window.cargarVista('mantenimientos')" class="text-xs text-primary hover:underline">Ver gestión →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Solicitud</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tabla-mantenimientos-body">
                            ${mantenimientosCompletos?.slice(0, 50).map(m => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm">${m.activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${m.tipo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${m.fecha_solicitud ? new Date(m.fecha_solicitud).toLocaleDateString() : 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge ${m.resultado === 'EXITOSO' ? 'bg-green-100 text-green-800' : m.resultado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">${m.resultado || 'PENDIENTE'}</span></td>
                                    <td class="px-4 py-2 text-sm">${m.tecnico_asignado || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TABLA DE SOFTWARE INSTALADO -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="seccion-software">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700"><i class="fas fa-code text-primary mr-2"></i>Software Instalado <span class="text-sm text-gray-400 ml-1">(<span id="contador-software">${softwareCompleto?.length || 0}</span> registros)</span></h3>
                    <button onclick="window.cargarVista('software_instalado')" class="text-xs text-primary hover:underline">Ver gestión →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Software</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fabricante</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versión</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Instalación</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tabla-software-body">
                            ${softwareCompleto?.slice(0, 50).map(s => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm">${s.software?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.software?.fabricante || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.version_instalada || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.fecha_instalacion ? new Date(s.fecha_instalacion).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TABLA DE LICENCIAS -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="seccion-licencias">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700"><i class="fas fa-key text-primary mr-2"></i>Licencias <span class="text-sm text-gray-400 ml-1">(<span id="contador-licencias">${licenciasCompletas?.length || 0}</span> registros)</span></h3>
                    <button onclick="window.cargarVista('licencias')" class="text-xs text-primary hover:underline">Ver gestión →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Software</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Restantes</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tabla-licencias-body">
                            ${licenciasCompletas?.slice(0, 50).map(l => {
                                const vencimiento = l.fecha_vencimiento ? new Date(l.fecha_vencimiento) : null;
                                let diasRestantes = '', warningClass = '';
                                if (vencimiento) {
                                    const diffDays = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
                                    diasRestantes = `${diffDays} días`;
                                    warningClass = diffDays < 0 ? 'text-red-600' : diffDays < 30 ? 'text-yellow-600' : 'text-green-600';
                                } else {
                                    diasRestantes = 'No vence';
                                }
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-2 text-sm">${l.software?.nombre || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm font-mono">${l.codigo_licencia || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : 'No vence'}</td>
                                        <td class="px-4 py-2 text-sm ${warningClass}">${diasRestantes}</td>
                                        <td class="px-4 py-2 text-sm"><span class="estado-badge ${l.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${l.activo ? 'Activa' : 'Inactiva'}</span></table>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TABLA DE EMPLEADOS -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="seccion-empleados">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700"><i class="fas fa-users text-primary mr-2"></i>Listado de Empleados <span class="text-sm text-gray-400 ml-1">(<span id="contador-empleados">${empleadosCompletos?.length || 0}</span> registros)</span></h3>
                    <button onclick="window.cargarVista('empleados')" class="text-xs text-primary hover:underline">Ver gestión →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Celular</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="tabla-empleados-body">
                            ${empleadosCompletos?.slice(0, 50).map(e => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm">${e.nombre_completo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${e.areas?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${e.puesto || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${e.empresa?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${e.correo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${e.celular || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${e.activo ? 'Activo' : 'Inactivo'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- PIE DE PÁGINA (AL FINAL, DESPUÉS DE TODAS LAS TABLAS) -->
            <div class="text-center text-xs text-gray-400 py-4 border-t">
                Reporte generado el ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Activos TI - Gallos Mármol
            </div>
        `;

        document.getElementById('dynamicContent').innerHTML = html;

        // ========== INICIALIZAR GRÁFICOS ==========
        function initReportChart(chartId, config) {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const existingChart = Chart.getChart(chartId);
                if (existingChart) existingChart.destroy();
                return new Chart(canvas, config);
            }
            return null;
        }

        if (activosPorEstado.size > 0) {
            initReportChart('reporteChartEstado', {
                type: 'doughnut',
                data: {
                    labels: Array.from(activosPorEstado.keys()),
                    datasets: [{
                        data: Array.from(activosPorEstado.values()),
                        backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
                }
            });
        }

        if (activosPorMarcaCompleto.size > 0) {
            initReportChart('reporteChartMarca', {
                type: 'bar',
                data: {
                    labels: Array.from(activosPorMarcaCompleto.keys()).slice(0, 10),
                    datasets: [{
                        label: 'Cantidad',
                        data: Array.from(activosPorMarcaCompleto.values()).slice(0, 10),
                        backgroundColor: '#d4d4ae',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        if (softwareInstaladoCompleto.size > 0) {
            initReportChart('reporteChartSoftware', {
                type: 'bar',
                data: {
                    labels: Array.from(softwareInstaladoCompleto.keys()).slice(0, 10),
                    datasets: [{
                        label: 'Instalaciones',
                        data: Array.from(softwareInstaladoCompleto.values()).slice(0, 10),
                        backgroundColor: '#6f42c1',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } }
                }
            });
        }

        initReportChart('reporteChartAsignaciones', {
            type: 'line',
            data: {
                labels: mesesNombres,
                datasets: [{
                    label: 'Asignaciones',
                    data: asignacionesPorMesCompleto,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        if (mantenimientosPorResultado.size > 0) {
            initReportChart('reporteChartMantenimientos', {
                type: 'pie',
                data: {
                    labels: Array.from(mantenimientosPorResultado.keys()),
                    datasets: [{
                        data: Array.from(mantenimientosPorResultado.values()),
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        if (empleadosPorAreaCompleto.size > 0) {
            initReportChart('reporteChartEmpleados', {
                type: 'bar',
                data: {
                    labels: Array.from(empleadosPorAreaCompleto.keys()).slice(0, 8),
                    datasets: [{
                        label: 'Empleados',
                        data: Array.from(empleadosPorAreaCompleto.values()).slice(0, 8),
                        backgroundColor: '#10b981',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        initReportChart('reporteChartLicencias', {
            type: 'doughnut',
            data: {
                labels: ['Activas', 'Inactivas'],
                datasets: [{
                    data: [licenciasActivas, licenciasInactivas],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        console.log('✅ Reportes cargados correctamente');

    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando reportes:', error);
        mostrarError('Error al cargar reportes: ' + error.message);
    }
}

// ==================== FUNCIÓN PARA CAMBIAR TIPO DE REPORTE ====================
async function cambiarTipoReporte() {
    const tipo = document.getElementById('reporteTipo')?.value;
    
    switch(tipo) {
        case 'ips':
            await cargarReporteIPs();
            break;
        case 'especificaciones':
            await cargarReporteEspecificaciones();
            break;
        case 'activos':
            await cargarReportesActivosFiltrados();
            break;
        case 'asignaciones':
            await cargarReportesAsignacionesFiltrados();
            break;
        case 'mantenimientos':
            await cargarReportesMantenimientosFiltrados();
            break;
        case 'software':
            await cargarReportesSoftwareFiltrados();
            break;
        case 'licencias':
            await cargarReportesLicenciasFiltrados();
            break;
        case 'empleados':
            await cargarReportesEmpleadosFiltrados();
            break;
        case 'activosPorUbicacion':
            await cargarReporteActivosPorUbicacion();
            break;
        case 'activosPorEmpresa':
            await cargarReporteActivosPorEmpresa();
            break;            
        default:
            await cargarReportes();
            break;
    }
}

// ==================== REPORTE DE ACTIVOS ====================
async function cargarReportesActivosFiltrados() {
    mostrarLoading('Cargando reporte de activos...');
    
    try {
        const fechaDesde = document.getElementById('reporteFechaDesde')?.value;
        const fechaHasta = document.getElementById('reporteFechaHasta')?.value;
        
        let query = window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (nombre),
                empresa:empresa_id (nombre, ruc),
                ubicacion:ubicacion_id (nombre, descripcion)
            `)
            .order('creado_el', { ascending: false });
        
        if (fechaDesde) query = query.gte('creado_el', `${fechaDesde}T00:00:00`);
        if (fechaHasta) query = query.lte('creado_el', `${fechaHasta}T23:59:59`);
        
        const { data: activos, error } = await query;
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-desktop"></i> Reporte de Activos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Listado completo de activos del sistema</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarActivosExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <p class="text-gray-500 text-xs uppercase tracking-wider">Total Activos</p>
                    <p class="text-2xl font-bold text-primary">${activos?.length || 0}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <p class="text-gray-500 text-xs uppercase tracking-wider">Disponibles</p>
                    <p class="text-2xl font-bold text-green-600">${activos?.filter(a => a.estado === 'DISPONIBLE').length || 0}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                    <p class="text-gray-500 text-xs uppercase tracking-wider">Asignados</p>
                    <p class="text-2xl font-bold text-blue-600">${activos?.filter(a => a.estado === 'ASIGNADO').length || 0}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                    <p class="text-gray-500 text-xs uppercase tracking-wider">Mantenimiento</p>
                    <p class="text-2xl font-bold text-orange-600">${activos?.filter(a => a.estado === 'MANTENIMIENTO' || a.estado === 'REPARACIÓN').length || 0}</p>
                </div>
            </div>
            
            <!-- Tabla de activos -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Listado de Activos
                        <span class="text-sm text-gray-400 ml-1">(${activos?.length || 0} registros)</span>
                    </h3>
                    <div class="relative mt-2">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaActivos" placeholder="Buscar activo..." 
                            class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary"
                            onkeyup="filtrarTablaActivos()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaActivos">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${activos?.map(a => `
                                <tr data-nombre="${a.nombre?.toLowerCase() || ''}" data-codigo="${a.codigo_activo?.toLowerCase() || ''}">
                                    <td class="px-4 py-2 text-sm font-mono">${a.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${a.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.tipos_activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge estado-${a.estado || 'DISPONIBLE'}">${a.estado || 'DISPONIBLE'}</span></td>
                                    <td class="px-4 py-2 text-sm">${a.empresa?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.ubicacion?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.creado_el ? new Date(a.creado_el).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Registrar función de búsqueda
        window.filtrarTablaActivos = function() {
            const busqueda = document.getElementById('busquedaActivos')?.value.toLowerCase() || '';
            const filas = document.querySelectorAll('#tablaActivos tbody tr');
            filas.forEach(fila => {
                const nombre = fila.dataset.nombre || '';
                const codigo = fila.dataset.codigo || '';
                if (nombre.includes(busqueda) || codigo.includes(busqueda) || busqueda === '') {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        };
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar el reporte de activos: ' + error.message);
    }
}

// ==================== REPORTE DE ASIGNACIONES ====================
async function cargarReportesAsignacionesFiltrados() {
    mostrarLoading('Cargando reporte de asignaciones...');
    
    try {
        const fechaDesde = document.getElementById('reporteFechaDesde')?.value;
        const fechaHasta = document.getElementById('reporteFechaHasta')?.value;
        
        let query = window.supabaseClient
            .from('asignaciones')
            .select(`
                *,
                activo:activos (nombre, codigo_activo),
                empleado:empleados (nombre_completo, puesto, correo)
            `)
            .order('fecha_asignacion', { ascending: false });
        
        if (fechaDesde) query = query.gte('fecha_asignacion', fechaDesde);
        if (fechaHasta) query = query.lte('fecha_asignacion', fechaHasta);
        
        const { data: asignaciones, error } = await query;
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-clipboard-list"></i> Reporte de Asignaciones
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Historial de asignaciones de activos a empleados</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarAsignacionesExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Historial de Asignaciones
                        <span class="text-sm text-gray-400 ml-1">(${asignaciones?.length || 0} registros)</span>
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Asignación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Devolución</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${asignaciones?.map(a => `
                                <tr>
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${a.activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${a.activo?.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.empleado?.nombre_completo || 'N/A'} <span class="text-xs text-gray-400">${a.empleado?.puesto || ''}</span></td>
                                    <td class="px-4 py-2 text-sm">${a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString() : 'Pendiente'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge ${a.estado === 'ACTIVA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${a.estado || 'ACTIVA'}</span></td>
                                </td>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar el reporte de asignaciones: ' + error.message);
    }
}

// ==================== REPORTE DE SOFTWARE INSTALADO ====================
async function cargarReportesSoftwareFiltrados() {
    mostrarLoading('Cargando reporte de software instalado...');
    
    try {
        const { data: software, error } = await window.supabaseClient
            .from('software_instalado')
            .select(`
                *,
                software:software_id (nombre, fabricante),
                activo:activos (nombre, codigo_activo)
            `)
            .eq('estado', 'INSTALADO')
            .order('fecha_instalacion', { ascending: false });
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-code"></i> Reporte de Software Instalado
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Software instalado en los activos del sistema</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarSoftwareExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <p class="text-gray-500 text-xs">Total Instalaciones</p>
                    <p class="text-2xl font-bold text-primary">${software?.length || 0}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                    <p class="text-gray-500 text-xs">Software Distintos</p>
                    <p class="text-2xl font-bold text-purple-600">${new Set(software?.map(s => s.software_id)).size || 0}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                    <p class="text-gray-500 text-xs">Activos con Software</p>
                    <p class="text-2xl font-bold text-blue-600">${new Set(software?.map(s => s.activo_id)).size || 0}</p>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Software Instalado
                        <span class="text-sm text-gray-400 ml-1">(${software?.length || 0} registros)</span>
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Software</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fabricante</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versión</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Instalación</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${software?.map(s => `
                                <tr>
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${s.software?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.software?.fabricante || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.version_instalada || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${s.activo?.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${s.fecha_instalacion ? new Date(s.fecha_instalacion).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar el reporte de software: ' + error.message);
    }
}

// ==================== REPORTE DE LICENCIAS ====================
async function cargarReportesLicenciasFiltrados() {
    mostrarLoading('Cargando reporte de licencias...');
    
    try {
        const { data: licencias, error } = await window.supabaseClient
            .from('licencias')
            .select(`*, software:software_id (nombre, fabricante)`)
            .order('fecha_vencimiento', { ascending: true });
        
        if (error) throw error;
        
        const hoy = new Date();
        const vigentes = licencias?.filter(l => !l.fecha_vencimiento || new Date(l.fecha_vencimiento) > hoy).length || 0;
        const vencidas = licencias?.filter(l => l.fecha_vencimiento && new Date(l.fecha_vencimiento) < hoy).length || 0;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-key"></i> Reporte de Licencias
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestión de licencias de software</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarLicenciasExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <p class="text-gray-500 text-xs">Total Licencias</p>
                    <p class="text-2xl font-bold text-primary">${licencias?.length || 0}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <p class="text-gray-500 text-xs">Vigentes</p>
                    <p class="text-2xl font-bold text-green-600">${vigentes}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                    <p class="text-gray-500 text-xs">Vencidas</p>
                    <p class="text-2xl font-bold text-red-600">${vencidas}</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                    <p class="text-gray-500 text-xs">Software distintos</p>
                    <p class="text-2xl font-bold text-purple-600">${new Set(licencias?.map(l => l.software_id)).size || 0}</p>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Listado de Licencias
                        <span class="text-sm text-gray-400 ml-1">(${licencias?.length || 0} registros)</span>
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Software</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Compra</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${licencias?.map(l => {
                                const isVencida = l.fecha_vencimiento && new Date(l.fecha_vencimiento) < hoy;
                                return `
                                    <tr>
                                        <td class="px-4 py-2 text-sm font-medium text-primary">${l.software?.nombre || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm font-mono text-gray-500">${l.codigo_licencia || 'N/A'}</td>                                        <td class="px-4 py-2 text-sm">${l.tipo_licencia || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${l.fecha_compra ? new Date(l.fecha_compra).toLocaleDateString() : 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm ${isVencida ? 'text-red-600 font-bold' : ''}">${l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : 'No vence'}</td>
                                        <td class="px-4 py-2 text-sm"><span class="estado-badge ${l.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${l.activo ? 'Activa' : 'Inactiva'}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar el reporte de licencias: ' + error.message);
    }
}

// ==================== REPORTE DE EMPLEADOS ====================
async function cargarReportesEmpleadosFiltrados() {
    mostrarLoading('Cargando reporte de empleados...');
    
    try {
        console.log('👥 Cargando reporte de empleados');
        
        // Obtener todos los empleados
        const { data: empleados, error } = await window.supabaseClient
            .from('empleados')
            .select(`
                *,
                areas (id, nombre),
                empresa:empresa_id (id, nombre, ruc)
            `)
            .order('nombre_completo', { ascending: true });
        
        if (error) throw error;
        
        console.log('Empleados encontrados:', empleados?.length || 0);
        
        // Calcular estadísticas
        const totalEmpleados = empleados?.length || 0;
        const activos = empleados?.filter(e => e.activo === true).length || 0;
        const inactivos = empleados?.filter(e => e.activo === false).length || 0;
        const areasDistintas = new Set(empleados?.map(e => e.area_id)).size || 0;
        const empresasDistintas = new Set(empleados?.map(e => e.empresa_id)).size || 0;
        
        ocultarLoading();
        
        // Generar HTML completo
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-users"></i> Reporte de Empleados
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Listado completo de empleados del sistema</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarEmpleadosExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Empleados</p>
                            <p class="text-2xl font-bold text-primary">${totalEmpleados}</p>
                            <p class="text-xs text-gray-400 mt-1">Registrados en sistema</p>
                        </div>
                        <div class="bg-primary/10 p-2 rounded-lg"><i class="fas fa-users text-primary"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Activos</p>
                            <p class="text-2xl font-bold text-green-600">${activos}</p>
                            <p class="text-xs text-gray-400 mt-1">En servicio</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg"><i class="fas fa-user-check text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Inactivos</p>
                            <p class="text-2xl font-bold text-red-600">${inactivos}</p>
                            <p class="text-xs text-gray-400 mt-1">Dados de baja</p>
                        </div>
                        <div class="bg-red-50 p-2 rounded-lg"><i class="fas fa-user-slash text-red-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Áreas/Empresas</p>
                            <p class="text-2xl font-bold text-purple-600">${areasDistintas} / ${empresasDistintas}</p>
                            <p class="text-xs text-gray-400 mt-1">Áreas distintas / Empresas</p>
                        </div>
                        <div class="bg-purple-50 p-2 rounded-lg"><i class="fas fa-building text-purple-600"></i></div>
                    </div>
                </div>
            </div>
            
            <!-- Tabla de empleados -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Listado de Empleados
                        <span class="text-sm text-gray-400 ml-1">(${totalEmpleados} registros)</span>
                    </h3>
                    <div class="relative mt-2">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaEmpleados" placeholder="Buscar por nombre, correo o celular..." 
                            class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary"
                            onkeyup="filtrarTablaEmpleados()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaEmpleados">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Celular</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${empleados?.length > 0 ? empleados.map(e => {
                                // Formatear documento
                                let documento = '';
                                if (e.tipo_documento && e.numero_documento) {
                                    const tipoDoc = {
                                        'DNI': 'DNI',
                                        'CARNET_EXTANJERIA': 'Carnet Ext.',
                                        'RUC': 'RUC',
                                        'PASAPORTE': 'Pasaporte'
                                    }[e.tipo_documento] || e.tipo_documento;
                                    documento = `${tipoDoc}: ${e.numero_documento}`;
                                } else if (e.numero_documento) {
                                    documento = e.numero_documento;
                                } else {
                                    documento = 'NO REGISTRADO';
                                }
                                
                                return `
                                    <tr class="hover:bg-gray-50" data-nombre="${e.nombre_completo?.toLowerCase() || ''}" data-correo="${e.correo?.toLowerCase() || ''}" data-celular="${e.celular || ''}">
                                        <td class="px-4 py-2 text-sm font-medium text-primary">${e.nombre_completo || 'N/A'}</td>
                                        <td class="px-4 py-2 text-sm">${e.areas?.nombre || 'SIN ÁREA'}</td>
                                        <td class="px-4 py-2 text-sm">${e.puesto || 'SIN PUESTO'}</td>
                                        <td class="px-4 py-2 text-sm">${e.empresa?.nombre || 'SIN EMPRESA'}</td>
                                        <td class="px-4 py-2 text-sm">${e.correo || 'NO REGISTRADO'}</td>
                                        <td class="px-4 py-2 text-sm">${e.celular || 'NO REGISTRADO'}</td>
                                        <td class="px-4 py-2 text-sm font-mono text-gray-500">${documento}</td>
                                        <td class="px-4 py-2 text-sm">
                                            <span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${e.activo ? 'ACTIVO' : 'INACTIVO'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('') : `
                                <tr>
                                    <td colspan="8" class="text-center py-8 text-gray-500">
                                        <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                                        <p>No hay empleados registrados</p>
                                        <p class="text-xs mt-1">Los empleados aparecerán aquí cuando se registren</p>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Pie de página -->
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Activos TI - Gallos Mármol
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Registrar función de búsqueda
        window.filtrarTablaEmpleados = function() {
            const busqueda = document.getElementById('busquedaEmpleados')?.value.toLowerCase() || '';
            const filas = document.querySelectorAll('#tablaEmpleados tbody tr');
            
            filas.forEach(fila => {
                const nombre = fila.dataset.nombre || '';
                const correo = fila.dataset.correo || '';
                const celular = fila.dataset.celular || '';
                
                if (nombre.includes(busqueda) || correo.includes(busqueda) || celular.includes(busqueda) || busqueda === '') {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        };
        
        console.log('✅ Reporte de empleados cargado correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando reporte de empleados:', error);
        mostrarError('Error al cargar el reporte de empleados: ' + error.message);
        
        // Mostrar mensaje de error en la interfaz
        document.getElementById('dynamicContent').innerHTML = `
            <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-3"></i>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Error al cargar el reporte</h2>
                <p class="text-gray-500 mb-4">${error.message || 'Error desconocido'}</p>
                <button onclick="volverAReportesGenerales()" class="btn-primary">
                    <i class="fas fa-arrow-left mr-2"></i>Volver a Reportes
                </button>
            </div>
        `;
    }
}

            // ==================== FUNCIONES DE FILTROS PARA REPORTES ====================
            async function aplicarFiltrosReportes() {
                const fechaDesde = document.getElementById('reporteFechaDesde')?.value;
                const fechaHasta = document.getElementById('reporteFechaHasta')?.value;
                const tipoReporte = document.getElementById('reporteTipo')?.value;

                console.log('🔍 Aplicando filtros:', { fechaDesde, fechaHasta, tipoReporte });

                mostrarLoading('Aplicando filtros...');

                try {
                    if (tipoReporte === 'todos' || tipoReporte === 'activos') {
                        await cargarReportesActivosFiltrados(fechaDesde, fechaHasta);
                    } else if (tipoReporte === 'activos') {
                        ocultarSeccionesReportes(['asignaciones', 'mantenimientos', 'software', 'licencias', 'empleados']);
                        await cargarReportesActivosFiltrados(fechaDesde, fechaHasta);
                    }

                    if (tipoReporte === 'todos' || tipoReporte === 'asignaciones') {
                        await cargarReportesAsignacionesFiltrados(fechaDesde, fechaHasta);
                    } else if (tipoReporte === 'asignaciones') {
                        ocultarSeccionesReportes(['activos', 'mantenimientos', 'software', 'licencias', 'empleados']);
                        await cargarReportesAsignacionesFiltrados(fechaDesde, fechaHasta);
                    }

                    if (tipoReporte === 'todos' || tipoReporte === 'mantenimientos') {
                        await cargarReportesMantenimientosFiltrados(fechaDesde, fechaHasta);
                    } else if (tipoReporte === 'mantenimientos') {
                        ocultarSeccionesReportes(['activos', 'asignaciones', 'software', 'licencias', 'empleados']);
                        await cargarReportesMantenimientosFiltrados(fechaDesde, fechaHasta);
                    }

                    if (tipoReporte === 'todos' || tipoReporte === 'software') {
                        await cargarReportesSoftwareFiltrados();
                    } else if (tipoReporte === 'software') {
                        ocultarSeccionesReportes(['activos', 'asignaciones', 'mantenimientos', 'licencias', 'empleados']);
                        await cargarReportesSoftwareFiltrados();
                    }

                    if (tipoReporte === 'todos' || tipoReporte === 'licencias') {
                        await cargarReportesLicenciasFiltrados(fechaDesde, fechaHasta);
                    } else if (tipoReporte === 'licencias') {
                        ocultarSeccionesReportes(['activos', 'asignaciones', 'mantenimientos', 'software', 'empleados']);
                        await cargarReportesLicenciasFiltrados(fechaDesde, fechaHasta);
                    }

                    if (tipoReporte === 'todos' || tipoReporte === 'empleados') {
                        await cargarReportesEmpleadosFiltrados();
                    } else if (tipoReporte === 'empleados') {
                        ocultarSeccionesReportes(['activos', 'asignaciones', 'mantenimientos', 'software', 'licencias']);
                        await cargarReportesEmpleadosFiltrados();
                    }

                    ocultarLoading();
                    mostrarAlerta('Éxito', 'Filtros aplicados correctamente', 'success');

                } catch (error) {
                    ocultarLoading();
                    console.error('❌ Error aplicando filtros:', error);
                    mostrarAlerta('Error', 'Error al aplicar los filtros', 'error');
                }
            }

            function ocultarSeccionesReportes(seccionesAMostrar) {
                const secciones = ['activos', 'asignaciones', 'mantenimientos', 'software', 'licencias', 'empleados'];

                secciones.forEach(seccion => {
                    const elemento = document.getElementById(`seccion-${seccion}`);
                    if (elemento) {
                        elemento.style.display = seccionesAMostrar.includes(seccion) ? 'block' : 'none';
                    }
                });
            }

            function mostrarTodasSeccionesReportes() {
                const secciones = ['activos', 'asignaciones', 'mantenimientos', 'software', 'licencias', 'empleados'];
                secciones.forEach(seccion => {
                    const elemento = document.getElementById(`seccion-${seccion}`);
                    if (elemento) elemento.style.display = 'block';
                });
            }

// ==================== REPORTE DE MANTENIMIENTOS ====================
async function cargarReportesMantenimientosFiltrados() {
    mostrarLoading('Cargando reporte de mantenimientos...');
    
    try {
        console.log('📋 Cargando reporte de mantenimientos');
        
        const fechaDesde = document.getElementById('reporteFechaDesde')?.value;
        const fechaHasta = document.getElementById('reporteFechaHasta')?.value;
        
        let query = window.supabaseClient
            .from('mantenimientos')
            .select(`*, activo:activos (id, nombre, codigo_activo, estado)`)
            .order('fecha_solicitud', { ascending: false });
        
        if (fechaDesde) query = query.gte('fecha_solicitud', fechaDesde);
        if (fechaHasta) query = query.lte('fecha_solicitud', fechaHasta);
        
        const { data: mantenimientos, error } = await query;
        
        if (error) throw error;
        
        console.log('Mantenimientos encontrados:', mantenimientos?.length || 0);
        
        // Calcular estadísticas
        const totalMantenimientos = mantenimientos?.length || 0;
        const exitosos = mantenimientos?.filter(m => m.resultado === 'EXITOSO').length || 0;
        const pendientes = mantenimientos?.filter(m => m.resultado === 'PENDIENTE').length || 0;
        const noReparados = mantenimientos?.filter(m => m.resultado === 'NO_REPARADO').length || 0;
        
        ocultarLoading();
        
        // Generar HTML completo
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-tools"></i> Reporte de Mantenimientos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Historial completo de mantenimientos de activos</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarMantenimientosExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Mantenimientos</p>
                            <p class="text-2xl font-bold text-primary">${totalMantenimientos}</p>
                            <p class="text-xs text-gray-400 mt-1">Registrados en sistema</p>
                        </div>
                        <div class="bg-primary/10 p-2 rounded-lg"><i class="fas fa-clipboard-list text-primary"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Exitosos</p>
                            <p class="text-2xl font-bold text-green-600">${exitosos}</p>
                            <p class="text-xs text-gray-400 mt-1">Mantenimientos correctos</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg"><i class="fas fa-check-circle text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Pendientes</p>
                            <p class="text-2xl font-bold text-yellow-600">${pendientes}</p>
                            <p class="text-xs text-gray-400 mt-1">En espera</p>
                        </div>
                        <div class="bg-yellow-50 p-2 rounded-lg"><i class="fas fa-clock text-yellow-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">No Reparados</p>
                            <p class="text-2xl font-bold text-red-600">${noReparados}</p>
                            <p class="text-xs text-gray-400 mt-1">Requieren atención</p>
                        </div>
                        <div class="bg-red-50 p-2 rounded-lg"><i class="fas fa-exclamation-triangle text-red-600"></i></div>
                    </div>
                </div>
            </div>
            
            <!-- Tabla de mantenimientos -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Historial de Mantenimientos
                        <span class="text-sm text-gray-400 ml-1">(${totalMantenimientos} registros)</span>
                    </h3>
                    <div class="relative mt-2">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaMantenimientos" placeholder="Buscar por activo, técnico o descripción..." 
                            class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary"
                            onkeyup="filtrarTablaMantenimientos()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaMantenimientos">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Solicitud</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Programada</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${mantenimientos?.length > 0 ? mantenimientos.map(m => `
                                <tr data-activo="${m.activo?.nombre?.toLowerCase() || ''}" data-tecnico="${m.tecnico_asignado?.toLowerCase() || ''}">
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${m.activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${m.activo?.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <span class="px-2 py-0.5 rounded-full text-xs ${m.tipo === 'PREVENTIVO' ? 'bg-green-100 text-green-700' : m.tipo === 'CORRECTIVO' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">
                                            ${m.tipo || 'N/A'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm max-w-xs truncate" title="${m.descripcion || ''}">${m.descripcion?.substring(0, 50) || 'N/A'}${m.descripcion?.length > 50 ? '...' : ''}</td>
                                    <td class="px-4 py-2 text-sm">${m.fecha_solicitud ? new Date(m.fecha_solicitud).toLocaleDateString() : 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <span class="estado-badge ${m.resultado === 'EXITOSO' ? 'bg-green-100 text-green-800' : m.resultado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                                            ${m.resultado === 'EXITOSO' ? 'Exitoso' : m.resultado === 'PENDIENTE' ? 'Pendiente' : 'No Reparado'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm">${m.tecnico_asignado || 'N/A'}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="8" class="text-center py-8 text-gray-500">
                                        <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                                        <p>No hay mantenimientos registrados</p>
                                        <p class="text-xs mt-1">Los mantenimientos aparecerán aquí cuando se registren</p>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Pie de página -->
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Activos TI - Gallos Mármol
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Registrar función de búsqueda
        window.filtrarTablaMantenimientos = function() {
            const busqueda = document.getElementById('busquedaMantenimientos')?.value.toLowerCase() || '';
            const filas = document.querySelectorAll('#tablaMantenimientos tbody tr');
            
            filas.forEach(fila => {
                const activo = fila.dataset.activo || '';
                const tecnico = fila.dataset.tecnico || '';
                
                if (activo.includes(busqueda) || tecnico.includes(busqueda) || busqueda === '') {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        };
        
        console.log('✅ Reporte de mantenimientos cargado correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando reporte de mantenimientos:', error);
        mostrarError('Error al cargar el reporte de mantenimientos: ' + error.message);
        
        // Mostrar mensaje de error en la interfaz
        document.getElementById('dynamicContent').innerHTML = `
            <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-3"></i>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Error al cargar el reporte</h2>
                <p class="text-gray-500 mb-4">${error.message || 'Error desconocido'}</p>
                <button onclick="volverAReportesGenerales()" class="btn-primary">
                    <i class="fas fa-arrow-left mr-2"></i>Volver a Reportes
                </button>
            </div>
        `;
    }
}

            function toggleFiltrosReportes() {
                const panel = document.getElementById('panelFiltrosReportes');
                const icon = document.getElementById('filtrosReportesIcon');

                if (panel) {
                    panel.classList.toggle('hidden');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-up');
                    }
                }
            }

            function limpiarFiltrosReportes() {
                console.log('🧹 Limpiando filtros de reportes');

                const fechaDesde = document.getElementById('reporteFechaDesde');
                const fechaHasta = document.getElementById('reporteFechaHasta');
                const tipoReporte = document.getElementById('reporteTipo');

                if (fechaDesde) fechaDesde.value = '';
                if (fechaHasta) fechaHasta.value = '';
                if (tipoReporte) tipoReporte.value = 'todos';

                mostrarTodasSeccionesReportes();
                cargarReportes();
            }

// ==================== EXPORTAR REPORTES A EXCEL ====================
async function exportarReportesExcel() {
    const tipoReporte = document.getElementById('reporteTipo')?.value || 'todos';
    
    mostrarLoading('Generando archivo Excel...');
    
    try {
        switch(tipoReporte) {
            case 'activos':
                await exportarActivosExcel();
                break;
            case 'asignaciones':
                await exportarAsignacionesExcel();
                break;
            case 'mantenimientos':
                await exportarMantenimientosExcel();
                break;
            case 'software':
                await exportarSoftwareExcel();
                break;
            case 'licencias':
                await exportarLicenciasExcel();
                break;
            case 'empleados':
                await exportarEmpleadosExcel();
                break;
            case 'ips':
                await exportarIPsExcel();
                break;
            case 'especificaciones':
                await exportarEspecificacionesExcel();
                break;
            case 'activosPorUbicacion':
                await exportarActivosPorUbicacionExcel();
                break;
            case 'activosPorEmpresa':
                await exportarActivosPorEmpresaExcel();
                break;
            default:
                await exportarReporteGeneralExcel();
                break;
        }
        
        ocultarLoading();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo generar el archivo Excel: ' + error.message, 'error');
    }
}

// ==================== EXPORTACIÓN POR TIPO DE REPORTE ====================

async function exportarActivosExcel() {
    const { data: activos, error } = await window.supabaseClient
        .from('activos')
        .select(`
            codigo_activo,
            nombre,
            tipos_activo (nombre),
            estado,
            empresa:empresa_id (nombre),
            ubicacion:ubicacion_id (nombre)
        `)
        .order('nombre');
    
    if (error) throw error;
    
    const datos = activos?.map(a => ({
        'Código': a.codigo_activo || 'N/A',
        'Nombre': a.nombre || 'N/A',
        'Tipo': a.tipos_activo?.nombre || 'N/A',
        'Estado': a.estado || 'DISPONIBLE',
        'Empresa': a.empresa?.nombre || 'N/A',
        'Ubicación': a.ubicacion?.nombre || 'N/A'
    })) || [];
    
    exportarDatosAExcel(datos, ['Código', 'Nombre', 'Tipo', 'Estado', 'Empresa', 'Ubicación'], 'activos');
}

async function exportarAsignacionesExcel() {
    const { data: asignaciones, error } = await window.supabaseClient
        .from('asignaciones')
        .select(`
            fecha_asignacion,
            fecha_devolucion,
            estado,
            activo:activos (nombre, codigo_activo),
            empleado:empleados (nombre_completo, puesto)
        `)
        .order('fecha_asignacion', { ascending: false });
    
    if (error) throw error;
    
    const datos = asignaciones?.map(a => ({
        'Activo': a.activo?.nombre || 'N/A',
        'Código': a.activo?.codigo_activo || 'N/A',
        'Empleado': a.empleado?.nombre_completo || 'N/A',
        'Puesto': a.empleado?.puesto || 'N/A',
        'Fecha Asignación': a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : 'N/A',
        'Fecha Devolución': a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString() : 'Pendiente',
        'Estado': a.estado || 'ACTIVA'
    })) || [];
    
    exportarDatosAExcel(datos, ['Activo', 'Código', 'Empleado', 'Puesto', 'Fecha Asignación', 'Fecha Devolución', 'Estado'], 'asignaciones');
}

async function exportarMantenimientosExcel() {
    const { data: mantenimientos, error } = await window.supabaseClient
        .from('mantenimientos')
        .select(`
            tipo,
            descripcion,
            fecha_solicitud,
            fecha_programada,
            resultado,
            tecnico_asignado,
            activo:activos (nombre, codigo_activo)
        `)
        .order('fecha_solicitud', { ascending: false });
    
    if (error) throw error;
    
    const datos = mantenimientos?.map(m => ({
        'Activo': m.activo?.nombre || 'N/A',
        'Código': m.activo?.codigo_activo || 'N/A',
        'Tipo': m.tipo || 'N/A',
        'Descripción': m.descripcion || 'N/A',
        'Fecha Solicitud': m.fecha_solicitud ? new Date(m.fecha_solicitud).toLocaleDateString() : 'N/A',
        'Fecha Programada': m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : 'N/A',
        'Resultado': m.resultado || 'PENDIENTE',
        'Técnico': m.tecnico_asignado || 'N/A'
    })) || [];
    
    exportarDatosAExcel(datos, ['Activo', 'Código', 'Tipo', 'Descripción', 'Fecha Solicitud', 'Fecha Programada', 'Resultado', 'Técnico'], 'mantenimientos');
}

async function exportarSoftwareExcel() {
    const { data: software, error } = await window.supabaseClient
        .from('software_instalado')
        .select(`
            version_instalada,
            fecha_instalacion,
            software:software_id (nombre, fabricante),
            activo:activos (nombre, codigo_activo)
        `)
        .eq('estado', 'INSTALADO')
        .order('fecha_instalacion', { ascending: false });
    
    if (error) throw error;
    
    const datos = software?.map(s => ({
        'Software': s.software?.nombre || 'N/A',
        'Fabricante': s.software?.fabricante || 'N/A',
        'Versión': s.version_instalada || 'N/A',
        'Activo': s.activo?.nombre || 'N/A',
        'Código Activo': s.activo?.codigo_activo || 'N/A',
        'Fecha Instalación': s.fecha_instalacion ? new Date(s.fecha_instalacion).toLocaleDateString() : 'N/A'
    })) || [];
    
    exportarDatosAExcel(datos, ['Software', 'Fabricante', 'Versión', 'Activo', 'Código Activo', 'Fecha Instalación'], 'software_instalado');
}

async function exportarLicenciasExcel() {
    const { data: licencias, error } = await window.supabaseClient
        .from('licencias')
        .select(`
            codigo_licencia,
            clave_producto,
            tipo_licencia,
            modalidad,
            fecha_compra,
            fecha_vencimiento,
            proveedor,
            activo,
            software:software_id (nombre, fabricante)
        `)
        .order('fecha_vencimiento', { ascending: true });
    
    if (error) throw error;
    
    const hoy = new Date();
    const datos = licencias?.map(l => ({
        'Software': l.software?.nombre || 'N/A',
        'Fabricante': l.software?.fabricante || 'N/A',
        'Código Licencia': l.codigo_licencia || 'N/A',
        'Clave Producto': l.clave_producto || 'N/A',
        'Tipo': l.tipo_licencia || 'N/A',
        'Modalidad': l.modalidad || 'N/A',
        'Proveedor': l.proveedor || 'N/A',
        'Fecha Compra': l.fecha_compra ? new Date(l.fecha_compra).toLocaleDateString() : 'N/A',
        'Fecha Vencimiento': l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : 'No vence',
        'Estado': l.activo ? 'Activa' : 'Inactiva'
    })) || [];
    
    exportarDatosAExcel(datos, ['Software', 'Fabricante', 'Código Licencia', 'Clave Producto', 'Tipo', 'Modalidad', 'Proveedor', 'Fecha Compra', 'Fecha Vencimiento', 'Estado'], 'licencias');
}

async function exportarEmpleadosExcel() {
    const { data: empleados, error } = await window.supabaseClient
        .from('empleados')
        .select(`
            nombre_completo,
            tipo_documento,
            numero_documento,
            correo,
            celular,
            puesto,
            activo,
            areas (nombre),
            empresa:empresa_id (nombre)
        `)
        .order('nombre_completo');
    
    if (error) throw error;
    
    const datos = empleados?.map(e => ({
        'Nombre': e.nombre_completo || 'N/A',
        'Documento': e.tipo_documento ? `${e.tipo_documento}: ${e.numero_documento || ''}` : (e.numero_documento || 'N/A'),
        'Área': e.areas?.nombre || 'N/A',
        'Puesto': e.puesto || 'N/A',
        'Empresa': e.empresa?.nombre || 'N/A',
        'Correo': e.correo || 'N/A',
        'Celular': e.celular || 'N/A',
        'Estado': e.activo ? 'Activo' : 'Inactivo'
    })) || [];
    
    exportarDatosAExcel(datos, ['Nombre', 'Documento', 'Área', 'Puesto', 'Empresa', 'Correo', 'Celular', 'Estado'], 'empleados');
}

async function exportarIPsExcel() {
    const { data: configuraciones, error } = await window.supabaseClient
        .from('configuracion_red')
        .select(`
            hostname,
            ipv4_direccion,
            ipv4_tipo,
            mac_direccion,
            activo:activo_id (nombre, codigo_activo, estado)
        `)
        .not('ipv4_direccion', 'is', null)
        .neq('ipv4_direccion', '');
    
    if (error) throw error;
    
    const datos = configuraciones?.filter(c => c.ipv4_direccion && c.ipv4_direccion !== '').map(c => ({
        'Dirección IP': c.ipv4_direccion || 'No configurada',
        'Tipo IP': c.ipv4_tipo || 'No especificado',
        'Hostname': c.hostname || 'No configurado',
        'MAC Address': c.mac_direccion || 'No configurada',
        'Activo': c.activo?.nombre || 'N/A',
        'Código Activo': c.activo?.codigo_activo || 'N/A',
        'Estado Activo': c.activo?.estado || 'N/A'
    })) || [];
    
    exportarDatosAExcel(datos, ['Dirección IP', 'Tipo IP', 'Hostname', 'MAC Address', 'Activo', 'Código Activo', 'Estado Activo'], 'ips');
}

async function exportarEspecificacionesExcel() {
    const tipoActivoId = document.getElementById('selectTipoActivo')?.value;
    const atributoId = document.getElementById('selectAtributo')?.value;
    
    if (!tipoActivoId || !atributoId) {
        mostrarAlerta('Info', 'Primero seleccione un tipo de activo y atributo', 'info');
        return;
    }
    
    const { data: valores, error } = await window.supabaseClient
        .from('especificaciones_valores')
        .select(`
            valor_texto,
            valor_numero,
            valor_booleano,
            valor_fecha,
            activo:activo_id (nombre, codigo_activo, estado)
        `)
        .eq('atributo_id', atributoId);
    
    if (error) throw error;
    
    const { data: atributo } = await window.supabaseClient
        .from('especificaciones_atributos')
        .select('nombre_atributo, unidad_medida')
        .eq('id', atributoId)
        .single();
    
    const nombreAtributo = atributo?.nombre_atributo || 'Valor';
    const unidad = atributo?.unidad_medida ? ` (${atributo.unidad_medida})` : '';
    
    const datos = valores?.map(v => {
        let valor = '';
        if (v.valor_texto) valor = v.valor_texto;
        else if (v.valor_numero !== null) valor = v.valor_numero + unidad;
        else if (v.valor_booleano !== null) valor = v.valor_booleano ? 'Sí' : 'No';
        else if (v.valor_fecha) valor = new Date(v.valor_fecha).toLocaleDateString();
        
        return {
            'Activo': v.activo?.nombre || 'N/A',
            'Código': v.activo?.codigo_activo || 'N/A',
            'Estado': v.activo?.estado || 'N/A',
            [nombreAtributo]: valor
        };
    }) || [];
    
    const columnas = ['Activo', 'Código', 'Estado', nombreAtributo];
    exportarDatosAExcel(datos, columnas, `especificaciones_${nombreAtributo.replace(/\s/g, '_')}`);
}

async function exportarActivosPorUbicacionExcel() {
    const { data: activos, error } = await window.supabaseClient
        .from('activos')
        .select(`
            codigo_activo,
            nombre,
            tipos_activo (nombre),
            estado,
            empresa:empresa_id (nombre),
            ubicacion:ubicacion_id (nombre, tipo)
        `)
        .order('nombre');
    
    if (error) throw error;
    
    const datos = activos?.map(a => ({
        'Código': a.codigo_activo || 'N/A',
        'Nombre': a.nombre || 'N/A',
        'Tipo': a.tipos_activo?.nombre || 'N/A',
        'Estado': a.estado || 'DISPONIBLE',
        'Empresa': a.empresa?.nombre || 'N/A',
        'Ubicación': a.ubicacion?.nombre || 'N/A',
        'Tipo Ubicación': a.ubicacion?.tipo || 'N/A'
    })) || [];
    
    exportarDatosAExcel(datos, ['Código', 'Nombre', 'Tipo', 'Estado', 'Empresa', 'Ubicación', 'Tipo Ubicación'], 'activos_por_ubicacion');
}

async function exportarActivosPorEmpresaExcel() {
    const { data: empresas, error } = await window.supabaseClient
        .from('empresas')
        .select('id, nombre, ruc')
        .eq('activo', true);
    
    if (error) throw error;
    
    const { data: activos } = await window.supabaseClient
        .from('activos')
        .select('empresa_id, count');
    
    const datos = empresas?.map(e => {
        const totalActivos = activos?.filter(a => a.empresa_id === e.id).length || 0;
        return {
            'Empresa': e.nombre || 'N/A',
            'RUC': e.ruc || 'N/A',
            'Total Activos': totalActivos
        };
    }) || [];
    
    exportarDatosAExcel(datos, ['Empresa', 'RUC', 'Total Activos'], 'activos_por_empresa');
}

async function exportarReporteGeneralExcel() {
    // Exportar todas las tablas principales en un solo archivo con múltiples hojas
    try {
        const wb = XLSX.utils.book_new();
        
        // 1. Activos
        const { data: activos } = await window.supabaseClient
            .from('activos')
            .select(`codigo_activo, nombre, tipos_activo (nombre), estado, empresa:empresa_id (nombre), ubicacion:ubicacion_id (nombre)`);
        
        const activosData = activos?.map(a => ({
            'Código': a.codigo_activo || 'N/A',
            'Nombre': a.nombre || 'N/A',
            'Tipo': a.tipos_activo?.nombre || 'N/A',
            'Estado': a.estado || 'DISPONIBLE',
            'Empresa': a.empresa?.nombre || 'N/A',
            'Ubicación': a.ubicacion?.nombre || 'N/A'
        })) || [];
        
        const wsActivos = XLSX.utils.json_to_sheet(activosData);
        XLSX.utils.book_append_sheet(wb, wsActivos, 'Activos');
        
        // 2. Asignaciones
        const { data: asignaciones } = await window.supabaseClient
            .from('asignaciones')
            .select(`fecha_asignacion, fecha_devolucion, estado, activo:activos (nombre), empleado:empleados (nombre_completo)`);
        
        const asignacionesData = asignaciones?.map(a => ({
            'Activo': a.activo?.nombre || 'N/A',
            'Empleado': a.empleado?.nombre_completo || 'N/A',
            'Fecha Asignación': a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : 'N/A',
            'Fecha Devolución': a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString() : 'Pendiente',
            'Estado': a.estado || 'ACTIVA'
        })) || [];
        
        const wsAsignaciones = XLSX.utils.json_to_sheet(asignacionesData);
        XLSX.utils.book_append_sheet(wb, wsAsignaciones, 'Asignaciones');
        
        // 3. Empleados
        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select(`nombre_completo, puesto, correo, celular, activo, areas (nombre), empresa:empresa_id (nombre)`);
        
        const empleadosData = empleados?.map(e => ({
            'Nombre': e.nombre_completo || 'N/A',
            'Área': e.areas?.nombre || 'N/A',
            'Puesto': e.puesto || 'N/A',
            'Empresa': e.empresa?.nombre || 'N/A',
            'Correo': e.correo || 'N/A',
            'Celular': e.celular || 'N/A',
            'Estado': e.activo ? 'Activo' : 'Inactivo'
        })) || [];
        
        const wsEmpleados = XLSX.utils.json_to_sheet(empleadosData);
        XLSX.utils.book_append_sheet(wb, wsEmpleados, 'Empleados');
        
        // Exportar
        XLSX.writeFile(wb, `reporte_general_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        mostrarAlerta('Éxito', 'Reporte general exportado correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando reporte general:', error);
        throw error;
    }
}

            function exportarReportesPDF() {
                mostrarLoading('Generando PDF...');

                const contenido = document.getElementById('dynamicContent');
                if (contenido) {
                    html2canvas(contenido, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false
                    }).then(canvas => {
                        const imgData = canvas.toDataURL('image/png');
                        const { jsPDF } = window.jspdf;
                        const pdf = new jsPDF({
                            orientation: 'portrait',
                            unit: 'mm',
                            format: 'a4'
                        });

                        const imgWidth = 210;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;
                        let heightLeft = imgHeight;
                        let position = 0;

                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pdf.internal.pageSize.getHeight();

                        while (heightLeft > 0) {
                            position = heightLeft - imgHeight;
                            pdf.addPage();
                            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                            heightLeft -= pdf.internal.pageSize.getHeight();
                        }

                        pdf.save(`reportes_${new Date().toISOString().split('T')[0]}.pdf`);
                        ocultarLoading();
                        mostrarAlerta('Éxito', 'PDF generado correctamente', 'success');
                    }).catch(error => {
                        ocultarLoading();
                        console.error('Error generando PDF:', error);
                        mostrarAlerta('Error', 'No se pudo generar el PDF', 'error');
                    });
                } else {
                    ocultarLoading();
                    mostrarAlerta('Error', 'No se pudo generar el PDF', 'error');
                }
            }                

// ==================== REPORTE DE ACTIVOS POR UBICACIÓN ====================
async function cargarReporteActivosPorUbicacion() {
    mostrarLoading('Cargando activos por ubicación...');
    
    try {
        console.log('📍 Cargando reporte de activos por ubicación');
        
        // ============================================
        // 1. OBTENER TODAS LAS UBICACIONES CON JERARQUÍA
        // ============================================
        const { data: ubicaciones, error: errorUbicaciones } = await window.supabaseClient
            .from('ubicaciones')
            .select(`
                *,
                empresa:empresa_id (id, nombre),
                padre:ubicacion_padre_id (id, nombre, tipo)
            `)
            .eq('activo', true)
            .order('tipo')
            .order('nombre');
        
        if (errorUbicaciones) throw errorUbicaciones;
        
        // ============================================
        // 2. OBTENER ACTIVOS POR UBICACIÓN
        // ============================================
        const { data: activos, error: errorActivos } = await window.supabaseClient
            .from('activos')
            .select(`
                id,
                nombre,
                codigo_activo,
                estado,
                tipo_activo_id,
                ubicacion_id,
                tipos_activo (nombre),
                empresa:empresa_id (nombre)
            `);
        
        if (errorActivos) throw errorActivos;
        
        // ============================================
        // 3. CREAR MAPA DE ACTIVOS POR UBICACIÓN
        // ============================================
        const activosPorUbicacion = new Map();
        activos?.forEach(activo => {
            if (activo.ubicacion_id) {
                if (!activosPorUbicacion.has(activo.ubicacion_id)) {
                    activosPorUbicacion.set(activo.ubicacion_id, []);
                }
                activosPorUbicacion.get(activo.ubicacion_id).push(activo);
            }
        });
        
        // ============================================
        // 4. CONSTRUIR ÁRBOL DE UBICACIONES
        // ============================================
        const ubicacionesMap = new Map();
        ubicaciones?.forEach(ubi => {
            ubicacionesMap.set(ubi.id, {
                ...ubi,
                hijos: [],
                activos: activosPorUbicacion.get(ubi.id) || []
            });
        });
        
        // Construir jerarquía
        const ubicacionesRaiz = [];
        ubicacionesMap.forEach(ubi => {
            if (ubi.ubicacion_padre_id && ubicacionesMap.has(ubi.ubicacion_padre_id)) {
                ubicacionesMap.get(ubi.ubicacion_padre_id).hijos.push(ubi);
            } else {
                ubicacionesRaiz.push(ubi);
            }
        });
        
        // Calcular total de activos por ubicación (incluyendo hijas)
        function calcularTotalActivos(ubicacion) {
            let total = ubicacion.activos.length;
            ubicacion.hijos.forEach(hijo => {
                total += calcularTotalActivos(hijo);
            });
            ubicacion.totalActivos = total;
            return total;
        }
        
        ubicacionesRaiz.forEach(ubi => calcularTotalActivos(ubi));
        
        // ============================================
        // 5. GENERAR HTML DEL ÁRBOL
        // ============================================
        function generarArbolUbicaciones(ubicacionesLista, nivel = 0) {
            let html = '';
            const marginLeft = nivel * 24;
            
            ubicacionesLista.forEach(ubi => {
                const tipoIcono = {
                    'PLANTA': '🏭',
                    'EDIFICIO': '🏢',
                    'PISO': '📌',
                    'OFICINA': '🏢',
                    'SEDE': '🏛️',
                    'GARITA': '🚪',
                    'CANTERA': '⛏️',
                    'CAMPO': '🌾',
                    'ALMACEN': '📦'
                }[ubi.tipo] || '📍';
                
                html += `
                    <div class="ubicacion-node" style="margin-left: ${marginLeft}px;">
                        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg mb-2 hover:bg-gray-100 transition-colors">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">${tipoIcono}</span>
                                <span class="font-semibold text-primary">${ubi.nombre}</span>
                                <span class="text-xs text-gray-500">(${ubi.tipo || 'SIN TIPO'})</span>
                                ${ubi.empresa ? `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">${ubi.empresa.nombre}</span>` : ''}
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-sm font-bold text-primary">${ubi.totalActivos} activo${ubi.totalActivos !== 1 ? 's' : ''}</span>
                                <button onclick="toggleUbicacionDetalle('${ubi.id}')" class="text-xs text-primary hover:underline flex items-center gap-1">
                                    <i class="fas fa-chevron-down" id="icon-${ubi.id}"></i>
                                    <span id="text-${ubi.id}">Ver detalles</span>
                                </button>
                            </div>
                        </div>
                        <div id="detalle-${ubi.id}" class="hidden ml-6 mb-3">
                            <!-- Activos de esta ubicación -->
                            ${ubi.activos.length > 0 ? `
                                <div class="bg-white rounded-lg border border-gray-200 mb-2">
                                    <div class="bg-gray-100 px-3 py-2 rounded-t-lg font-semibold text-sm">
                                        <i class="fas fa-desktop text-primary mr-1"></i> Activos en esta ubicación (${ubi.activos.length})
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="min-w-full text-sm">
                                            <thead class="bg-gray-50">
                                                <tr>
                                                    <th class="px-3 py-2 text-left">Código</th>
                                                    <th class="px-3 py-2 text-left">Nombre</th>
                                                    <th class="px-3 py-2 text-left">Tipo</th>
                                                    <th class="px-3 py-2 text-left">Estado</th>
                                                    <th class="px-3 py-2 text-left">Empresa</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-gray-200">
                                                ${ubi.activos.map(a => `
                                                    <tr class="hover:bg-gray-50">
                                                        <td class="px-3 py-1 font-mono text-xs">${a.codigo_activo || 'N/A'}</td>
                                                        <td class="px-3 py-1 font-medium text-primary">${a.nombre || 'N/A'}</td>
                                                        <td class="px-3 py-1">${a.tipos_activo?.nombre || 'N/A'}</td>
                                                        <td class="px-3 py-1"><span class="estado-badge estado-${a.estado} text-xs">${a.estado || 'DISPONIBLE'}</span></td>
                                                        <td class="px-3 py-1">${a.empresa?.nombre || 'N/A'}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Sububicaciones -->
                            ${ubi.hijos.length > 0 ? generarArbolUbicaciones(ubi.hijos, nivel + 1) : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        }
        
        // Calcular estadísticas
        const totalUbicaciones = ubicaciones?.length || 0;
        const totalActivosUbicados = activos?.filter(a => a.ubicacion_id).length || 0;
        const totalActivosSinUbicacion = activos?.filter(a => !a.ubicacion_id).length || 0;
        const tiposUbicacion = new Set(ubicaciones?.map(u => u.tipo)).size || 0;
        
        ocultarLoading();
        
        // Generar HTML completo
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-map-marker-alt"></i> Activos por Ubicación
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Distribución jerárquica de activos por ubicación</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarActivosPorUbicacionExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="expandirTodasUbicaciones()" class="px-4 py-2 text-sm bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors flex items-center gap-2">
                            <i class="fas fa-expand-alt"></i> Expandir todo
                        </button>
                        <button onclick="contraerTodasUbicaciones()" class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                            <i class="fas fa-compress-alt"></i> Contraer todo
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Ubicaciones</p>
                            <p class="text-2xl font-bold text-primary">${totalUbicaciones}</p>
                            <p class="text-xs text-gray-400 mt-1">Registradas</p>
                        </div>
                        <div class="bg-primary/10 p-2 rounded-lg"><i class="fas fa-map-marker-alt text-primary"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Activos Ubicados</p>
                            <p class="text-2xl font-bold text-green-600">${totalActivosUbicados}</p>
                            <p class="text-xs text-gray-400 mt-1">Con ubicación asignada</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg"><i class="fas fa-check-circle text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Activos sin Ubicación</p>
                            <p class="text-2xl font-bold text-orange-600">${totalActivosSinUbicacion}</p>
                            <p class="text-xs text-gray-400 mt-1">Por asignar</p>
                        </div>
                        <div class="bg-orange-50 p-2 rounded-lg"><i class="fas fa-exclamation-triangle text-orange-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Tipos de Ubicación</p>
                            <p class="text-2xl font-bold text-purple-600">${tiposUbicacion}</p>
                            <p class="text-xs text-gray-400 mt-1">Diferentes</p>
                        </div>
                        <div class="bg-purple-50 p-2 rounded-lg"><i class="fas fa-building text-purple-600"></i></div>
                    </div>
                </div>
            </div>
            
            <!-- Activos sin ubicación -->
            ${totalActivosSinUbicacion > 0 ? `
                <div class="bg-yellow-50 rounded-lg p-4 mb-6 border-l-4 border-yellow-500">
                    <div class="flex items-start gap-3">
                        <i class="fas fa-info-circle text-yellow-500 mt-0.5"></i>
                        <div>
                            <p class="font-semibold text-yellow-800">⚠️ Activos sin ubicación asignada</p>
                            <p class="text-sm text-yellow-700">Hay ${totalActivosSinUbicacion} activo(s) que no tienen una ubicación asignada.</p>
                            <button onclick="window.cargarVista('activos')" class="text-xs text-yellow-700 hover:underline mt-1">Ir a gestionar activos →</button>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Árbol de ubicaciones -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-sitemap text-primary mr-2"></i> Jerarquía de Ubicaciones
                    </h3>
                </div>
                <div class="p-4">
                    ${ubicacionesRaiz.length > 0 ? generarArbolUbicaciones(ubicacionesRaiz) : `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-map-marker-alt text-3xl mb-2 opacity-50"></i>
                            <p>No hay ubicaciones registradas</p>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Activos TI - Gallos Mármol
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // ============================================
        // FUNCIONES DE CONTROL DE ÁRBOL
        // ============================================
        window.toggleUbicacionDetalle = function(ubicacionId) {
            const detalle = document.getElementById(`detalle-${ubicacionId}`);
            const icon = document.getElementById(`icon-${ubicacionId}`);
            const texto = document.getElementById(`text-${ubicacionId}`);
            
            if (detalle.classList.contains('hidden')) {
                detalle.classList.remove('hidden');
                if (icon) icon.classList.remove('fa-chevron-down');
                if (icon) icon.classList.add('fa-chevron-up');
                if (texto) texto.textContent = 'Ocultar detalles';
            } else {
                detalle.classList.add('hidden');
                if (icon) icon.classList.remove('fa-chevron-up');
                if (icon) icon.classList.add('fa-chevron-down');
                if (texto) texto.textContent = 'Ver detalles';
            }
        };
        
        window.expandirTodasUbicaciones = function() {
            document.querySelectorAll('[id^="detalle-"]').forEach(el => {
                el.classList.remove('hidden');
            });
            document.querySelectorAll('[id^="icon-"]').forEach(icon => {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            });
            document.querySelectorAll('[id^="text-"]').forEach(texto => {
                texto.textContent = 'Ocultar detalles';
            });
        };
        
        window.contraerTodasUbicaciones = function() {
            document.querySelectorAll('[id^="detalle-"]').forEach(el => {
                el.classList.add('hidden');
            });
            document.querySelectorAll('[id^="icon-"]').forEach(icon => {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            });
            document.querySelectorAll('[id^="text-"]').forEach(texto => {
                texto.textContent = 'Ver detalles';
            });
        };
        
        console.log('✅ Reporte de activos por ubicación cargado correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarError('Error al cargar el reporte: ' + error.message);
    }
}

// ==================== REPORTE DE ACTIVOS POR EMPRESA ====================
async function cargarReporteActivosPorEmpresa() {
    mostrarLoading('Cargando activos por empresa...');
    
    try {
        console.log('🏢 Cargando reporte de activos por empresa');
        
        // ============================================
        // 1. OBTENER TODAS LAS EMPRESAS
        // ============================================
        const { data: empresas, error: errorEmpresas } = await window.supabaseClient
            .from('empresas')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        if (errorEmpresas) throw errorEmpresas;
        
        // ============================================
        // 2. OBTENER ACTIVOS POR EMPRESA
        // ============================================
        const { data: activos, error: errorActivos } = await window.supabaseClient
            .from('activos')
            .select(`
                *,
                tipos_activo (nombre),
                ubicacion:ubicacion_id (nombre),
                info_general (
                    marca_id,
                    modelo,
                    numero_serie,
                    ano_fabricacion,
                    condicion_fisica,
                    marcas (nombre)
                )
            `)
            .order('nombre');
        
        if (errorActivos) throw errorActivos;
        
        // ============================================
        // 3. AGRUPAR ACTIVOS POR EMPRESA
        // ============================================
        const activosPorEmpresa = new Map();
        empresas?.forEach(emp => {
            activosPorEmpresa.set(emp.id, {
                empresa: emp,
                activos: [],
                total: 0
            });
        });
        
        // También contar activos sin empresa
        let activosSinEmpresa = [];
        
        activos?.forEach(activo => {
            if (activo.empresa_id && activosPorEmpresa.has(activo.empresa_id)) {
                activosPorEmpresa.get(activo.empresa_id).activos.push(activo);
                activosPorEmpresa.get(activo.empresa_id).total++;
            } else if (!activo.empresa_id) {
                activosSinEmpresa.push(activo);
            }
        });
        
        // ============================================
        // 4. CALCULAR ESTADÍSTICAS
        // ============================================
        const totalEmpresas = empresas?.length || 0;
        const totalActivos = activos?.length || 0;
        const empresasConActivos = Array.from(activosPorEmpresa.values()).filter(e => e.total > 0).length;
        const empresasSinActivos = totalEmpresas - empresasConActivos;
        
        // Activos por estado por empresa
        const estadoMap = new Map();
        
        // ============================================
        // 5. GENERAR HTML
        // ============================================
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-building"></i> Activos por Empresa
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Distribución de activos por empresa y análisis detallado</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarActivosPorEmpresaExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Empresas</p>
                            <p class="text-2xl font-bold text-primary">${totalEmpresas}</p>
                            <p class="text-xs text-gray-400 mt-1">Activas</p>
                        </div>
                        <div class="bg-primary/10 p-2 rounded-lg"><i class="fas fa-building text-primary"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Activos</p>
                            <p class="text-2xl font-bold text-green-600">${totalActivos}</p>
                            <p class="text-xs text-gray-400 mt-1">Registrados</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg"><i class="fas fa-desktop text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Empresas con Activos</p>
                            <p class="text-2xl font-bold text-blue-600">${empresasConActivos}</p>
                            <p class="text-xs text-gray-400 mt-1">Tienen equipos</p>
                        </div>
                        <div class="bg-blue-50 p-2 rounded-lg"><i class="fas fa-check-circle text-blue-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Empresas sin Activos</p>
                            <p class="text-2xl font-bold text-orange-600">${empresasSinActivos}</p>
                            <p class="text-xs text-gray-400 mt-1">Sin equipos</p>
                        </div>
                        <div class="bg-orange-50 p-2 rounded-lg"><i class="fas fa-building-slash text-orange-600"></i></div>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico de distribución -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-chart-pie text-primary"></i> Distribución de Activos por Empresa
                    </h3>
                    <canvas id="chartActivosPorEmpresa" height="200"></canvas>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-chart-bar text-primary"></i> Top Empresas (por cantidad de activos)
                    </h3>
                    <canvas id="chartTopEmpresas" height="200"></canvas>
                </div>
            </div>
            
            <!-- Activos sin empresa -->
            ${activosSinEmpresa.length > 0 ? `
                <div class="bg-yellow-50 rounded-lg p-4 mb-6 border-l-4 border-yellow-500">
                    <div class="flex items-start gap-3">
                        <i class="fas fa-info-circle text-yellow-500 mt-0.5"></i>
                        <div>
                            <p class="font-semibold text-yellow-800">⚠️ Activos sin empresa asignada</p>
                            <p class="text-sm text-yellow-700">Hay ${activosSinEmpresa.length} activo(s) que no tienen una empresa asignada.</p>
                            <button onclick="window.cargarVista('activos')" class="text-xs text-yellow-700 hover:underline mt-1">Ir a gestionar activos →</button>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Tabla de empresas -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Detalle por Empresa
                    </h3>
                    <div class="relative mt-2">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaEmpresas" placeholder="Buscar empresa..." 
                            class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary"
                            onkeyup="filtrarTablaEmpresas()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaEmpresas">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUC</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Activos</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distribución</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${Array.from(activosPorEmpresa.values()).map(item => {
                                const porcentaje = totalActivos > 0 ? Math.round((item.total / totalActivos) * 100) : 0;
                                return `
                                    <tr class="hover:bg-gray-50 empresa-row" data-nombre="${item.empresa.nombre?.toLowerCase() || ''}">
                                        <td class="px-4 py-3 text-sm font-medium text-primary">${item.empresa.nombre || 'N/A'}</td>
                                        <td class="px-4 py-3 text-sm font-mono text-gray-500">${item.empresa.ruc || 'No registrado'}</td>
                                        <td class="px-4 py-3 text-sm font-bold">${item.total} activo${item.total !== 1 ? 's' : ''} <span class="text-xs text-gray-400">(${porcentaje}%)</span></td>
                                        <td class="px-4 py-3">
                                            <div class="w-32 bg-gray-200 rounded-full h-2">
                                                <div class="bg-primary h-2 rounded-full" style="width: ${porcentaje}%"></div>
                                            </div>
                                        </td>
                                        <td class="px-4 py-3">
                                            <button onclick="verDetalleEmpresaActivos('${item.empresa.id}', '${item.empresa.nombre}')" 
                                                    class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors">
                                                <i class="fas fa-eye"></i> Ver activos
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Pie de página -->
            <div class="text-center text-xs text-gray-400 py-4 border-t mt-6">
                Reporte generado el ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Activos TI - Gallos Mármol
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // ============================================
        // 6. INICIALIZAR GRÁFICOS
        // ============================================
        
        // Datos para gráficos
        const empresasConActivosData = Array.from(activosPorEmpresa.values())
            .filter(e => e.total > 0)
            .sort((a, b) => b.total - a.total);
        
        // Gráfico de torta
        if (empresasConActivosData.length > 0) {
            new Chart(document.getElementById('chartActivosPorEmpresa'), {
                type: 'doughnut',
                data: {
                    labels: empresasConActivosData.map(e => e.empresa.nombre),
                    datasets: [{
                        data: empresasConActivosData.map(e => e.total),
                        backgroundColor: ['#39080a', '#4a0a0d', '#d4d4ae', '#c4c49a', '#2a0607', '#6b7280', '#10b981', '#3b82f6', '#f59e0b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
                }
            });
        }
        
        // Gráfico de barras (top 10)
        const topEmpresas = empresasConActivosData.slice(0, 10);
        if (topEmpresas.length > 0) {
            new Chart(document.getElementById('chartTopEmpresas'), {
                type: 'bar',
                data: {
                    labels: topEmpresas.map(e => e.empresa.nombre),
                    datasets: [{
                        label: 'Cantidad de Activos',
                        data: topEmpresas.map(e => e.total),
                        backgroundColor: '#39080a',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
        
        // ============================================
        // 7. FUNCIONES AUXILIARES
        // ============================================
        
        window.filtrarTablaEmpresas = function() {
            const busqueda = document.getElementById('busquedaEmpresas')?.value.toLowerCase() || '';
            const filas = document.querySelectorAll('#tablaEmpresas tbody tr.empresa-row');
            
            filas.forEach(fila => {
                const nombre = fila.dataset.nombre || '';
                if (nombre.includes(busqueda) || busqueda === '') {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        };
        
        window.verDetalleEmpresaActivos = function(empresaId, empresaNombre) {
            // Filtrar activos de esta empresa y mostrar en modal
            const empresaData = activosPorEmpresa.get(empresaId);
            if (!empresaData || empresaData.total === 0) {
                mostrarAlerta('Información', `No hay activos registrados para ${empresaNombre}`, 'info');
                return;
            }
            
            let activosHtml = `
                <div class="text-left max-h-96 overflow-y-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium">Código</th>
                                <th class="px-3 py-2 text-left text-xs font-medium">Nombre</th>
                                <th class="px-3 py-2 text-left text-xs font-medium">Tipo</th>
                                <th class="px-3 py-2 text-left text-xs font-medium">Estado</th>
                                <th class="px-3 py-2 text-left text-xs font-medium">Ubicación</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${empresaData.activos.map(a => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-3 py-2 text-xs font-mono">${a.codigo_activo || 'N/A'}</td>
                                    <td class="px-3 py-2 text-sm font-medium text-primary">${a.nombre || 'N/A'}</td>
                                    <td class="px-3 py-2 text-xs">${a.tipos_activo?.nombre || 'N/A'}</td>
                                    <td class="px-3 py-2"><span class="estado-badge estado-${a.estado} text-xs">${a.estado || 'DISPONIBLE'}</span></td>
                                    <td class="px-3 py-2 text-xs">${a.ubicacion?.nombre || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            Swal.fire({
                title: `<span class="text-primary">Activos de ${empresaNombre}</span>`,
                html: activosHtml,
                width: '900px',
                confirmButtonColor: '#39080a',
                confirmButtonText: 'Cerrar'
            });
        };
        
        console.log('✅ Reporte de activos por empresa cargado correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarError('Error al cargar el reporte: ' + error.message);
    }
}

// ==================== REPORTE DE DIRECCIONES IP ====================
async function cargarReporteIPs() {
    mostrarLoading('Cargando reporte de direcciones IP...');
    
    try {
        console.log('%c🌐 CARGANDO REPORTE DE IPS', 'background: #00bcd4; color: white; font-size: 14px;');
        
        // ============================================
        // OBTENER TODAS LAS CONFIGURACIONES DE RED (CORREGIDO)
        // ============================================
        // Primero, obtener todas las configuraciones
        const { data: todasConfiguraciones, error: errorRed } = await window.supabaseClient
            .from('configuracion_red')
            .select(`
                *,
                activo:activo_id (
                    id,
                    nombre,
                    codigo_activo,
                    estado,
                    tipo_activo_id,
                    tipos_activo (id, nombre),
                    empresa:empresa_id (id, nombre),
                    ubicacion:ubicacion_id (id, nombre)
                )
            `);
        
        if (errorRed) throw errorRed;
        
        // Filtrar en JavaScript en lugar de SQL para evitar errores de tipo
        const configuracionesRed = todasConfiguraciones?.filter(config => 
            config.ipv4_direccion && 
            config.ipv4_direccion !== '' && 
            config.ipv4_direccion !== 'No configurada' &&
            config.ipv4_direccion !== 'null'
        ) || [];
        
        // ============================================
        // OBTENER TODOS LOS IDs DE ACTIVOS QUE TIENEN CONFIGURACIÓN DE RED VÁLIDA
        // ============================================
        const activosConRedIds = configuracionesRed.map(c => c.activo_id).filter(id => id);
        
        // ============================================
        // OBTENER ACTIVOS SIN CONFIGURACIÓN DE RED
        // ============================================
        let activosSinRed = [];
        
        // Obtener todos los activos
        const { data: todosActivos, error: errorTodos } = await window.supabaseClient
            .from('activos')
            .select(`
                id,
                nombre,
                codigo_activo,
                estado,
                tipos_activo (id, nombre),
                empresa:empresa_id (id, nombre)
            `)
            .order('nombre');
        
        if (errorTodos) throw errorTodos;
        
        // Filtrar activos que NO tienen configuración de red
        if (activosConRedIds.length > 0) {
            activosSinRed = todosActivos?.filter(activo => !activosConRedIds.includes(activo.id)) || [];
        } else {
            activosSinRed = todosActivos || [];
        }
        
        // ============================================
        // ANALIZAR IPS (IPv4)
        // ============================================
        const ipsData = [];
        const redesMap = new Map();
        
        configuracionesRed.forEach(config => {
            const ip = config.ipv4_direccion;
            if (ip && ip !== '' && ip !== 'No configurada' && ip !== 'null') {
                // Validar formato de IP
                const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                if (!ipRegex.test(ip)) {
                    console.warn(`IP inválida ignorada: ${ip}`);
                    return;
                }
                
                // Extraer la red (primeros 3 octetos)
                const partes = ip.split('.');
                let red = '';
                let tipo = 'Privada';
                
                if (partes.length === 4) {
                    red = `${partes[0]}.${partes[1]}.${partes[2]}.0`;
                    
                    // Clasificar tipo de IP
                    if (ip.startsWith('10.')) tipo = 'Privada (Clase A)';
                    else if (ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
                             ip.startsWith('172.20.') || ip.startsWith('172.21.') || ip.startsWith('172.22.') || ip.startsWith('172.23.') ||
                             ip.startsWith('172.24.') || ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
                             ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) {
                        tipo = 'Privada (Clase B)';
                    }
                    else if (ip.startsWith('192.168.')) tipo = 'Privada (Clase C)';
                    else if (ip.startsWith('127.')) tipo = 'Loopback';
                    else tipo = 'Pública';
                    
                    // Agrupar por red
                    if (!redesMap.has(red)) {
                        redesMap.set(red, { red, ips: [], count: 0 });
                    }
                    redesMap.get(red).ips.push(ip);
                    redesMap.get(red).count++;
                }
                
                ipsData.push({
                    ip: ip,
                    tipo_ip: config.ipv4_tipo || 'No especificado',
                    tipo: tipo,
                    red: red,
                    hostname: config.hostname || 'No configurado',
                    mac: config.mac_direccion || 'No configurada',
                    activo_nombre: config.activo?.nombre || 'N/A',
                    activo_codigo: config.activo?.codigo_activo || 'N/A',
                    activo_estado: config.activo?.estado || 'N/A',
                    empresa: config.activo?.empresa?.nombre || 'N/A',
                    ubicacion: config.activo?.ubicacion?.nombre || 'N/A',
                    tipo_activo: config.activo?.tipos_activo?.nombre || 'N/A'
                });
            }
        });
        
        // Estadísticas de IPs
        const totalIPs = ipsData.length;
        const ipsPorTipo = new Map();
        const ipsPorRed = Array.from(redesMap.values()).sort((a, b) => b.count - a.count);
        const ipsPorEmpresa = new Map();
        const ipsPorEstado = new Map();
        
        ipsData.forEach(ip => {
            // Por tipo de IP (DHCP/Estática)
            const tipoIp = ip.tipo_ip || 'No especificado';
            ipsPorTipo.set(tipoIp, (ipsPorTipo.get(tipoIp) || 0) + 1);
            
            // Por empresa
            ipsPorEmpresa.set(ip.empresa, (ipsPorEmpresa.get(ip.empresa) || 0) + 1);
            
            // Por estado del activo
            ipsPorEstado.set(ip.activo_estado, (ipsPorEstado.get(ip.activo_estado) || 0) + 1);
        });
        
        // Detectar IPs duplicadas
        const ipsDuplicadas = [];
        const ipCountMap = new Map();
        ipsData.forEach(ip => {
            ipCountMap.set(ip.ip, (ipCountMap.get(ip.ip) || 0) + 1);
        });
        ipCountMap.forEach((count, ip) => {
            if (count > 1) {
                ipsDuplicadas.push({ ip, count });
            }
        });
        
        ocultarLoading();
        
        // ============================================
        // GENERAR HTML DEL REPORTE DE IPS
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-network-wired"></i> Reporte de Direcciones IP
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Análisis de direcciones IP utilizadas en los activos de la red</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarIPsExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="exportarReporteIPsPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-pdf"></i> Exportar PDF
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs de IPs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total IPs Asignadas</p>
                            <p class="text-2xl font-bold text-primary">${totalIPs}</p>
                            <p class="text-xs text-gray-400 mt-1">Configuraciones de red</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <i class="fas fa-network-wired text-primary text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Activos sin IP</p>
                            <p class="text-2xl font-bold text-orange-600">${activosSinRed?.length || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Sin configuración de red</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <i class="fas fa-desktop text-orange-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Redes Diferentes</p>
                            <p class="text-2xl font-bold text-purple-600">${ipsPorRed.length}</p>
                            <p class="text-xs text-gray-400 mt-1">Segmentos de red</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <i class="fas fa-globe text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">IPs Duplicadas</p>
                            <p class="text-2xl font-bold text-red-600">${ipsDuplicadas.length}</p>
                            <p class="text-xs text-gray-400 mt-1">Conflictos detectados</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Gráficos -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-chart-pie text-primary"></i> IPs por Tipo (DHCP/Estática)
                    </h3>
                    <canvas id="chartIPTipo" height="200"></canvas>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-building text-primary"></i> IPs por Empresa
                    </h3>
                    <canvas id="chartIPEmpresa" height="200"></canvas>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-chart-bar text-primary"></i> Top 5 Redes más utilizadas
                    </h3>
                    <canvas id="chartIPRed" height="200"></canvas>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-chart-donut text-primary"></i> IPs por Clasificación
                    </h3>
                    <canvas id="chartIPClasificacion" height="200"></canvas>
                </div>
            </div>
            
            <!-- IPs Duplicadas (Alerta) -->
            ${ipsDuplicadas.length > 0 ? `
                <div class="mb-6 bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                    <div class="flex items-start gap-3">
                        <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
                        <div>
                            <h3 class="font-bold text-red-800">⚠️ Conflictos de IP Detectados</h3>
                            <p class="text-sm text-red-700">Las siguientes direcciones IP están asignadas a más de un activo:</p>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${ipsDuplicadas.map(dup => `
                                    <span class="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-mono">
                                        ${dup.ip} (${dup.count} activos)
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Tabla de IPs Asignadas -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Listado de Direcciones IP Asignadas
                        <span class="text-sm text-gray-400 ml-1">(${totalIPs} registros)</span>
                    </h3>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaIPs" placeholder="Buscar IP, activo, hostname..." 
                            class="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-primary"
                            onkeyup="filtrarTablaIPs()">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaIPs">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección IP</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hostname</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MAC Address</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${ipsData.map(ip => `
                                <tr class="hover:bg-gray-50 ip-row" data-ip="${ip.ip}" data-activo="${ip.activo_nombre}" data-hostname="${ip.hostname}">
                                    <td class="px-4 py-2 text-sm font-mono font-bold">
                                        <span class="px-2 py-1 rounded-full text-xs ${ip.tipo === 'Privada (Clase C)' ? 'bg-green-100 text-green-700' : ip.tipo === 'Privada (Clase B)' ? 'bg-blue-100 text-blue-700' : ip.tipo === 'Privada (Clase A)' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}">
                                            ${ip.ip}
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm">
                                        <span class="px-2 py-0.5 rounded-full text-xs ${ip.tipo_ip === 'ESTATICA' ? 'bg-blue-100 text-blue-700' : ip.tipo_ip === 'DHCP' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                                            ${ip.tipo_ip}
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm font-mono">${ip.hostname}</td>
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${ip.activo_nombre}</td>
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${ip.activo_codigo}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <span class="estado-badge estado-${ip.activo_estado}">${ip.activo_estado}</span>
                                    </td>
                                    <td class="px-4 py-2 text-sm">${ip.empresa}</td>
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${ip.mac}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Activos sin Configuración de Red -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-exclamation-circle text-orange-500 mr-2"></i> Activos sin Configuración de Red
                        <span class="text-sm text-gray-400 ml-1">(${activosSinRed?.length || 0} registros)</span>
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${activosSinRed?.map(activo => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${activo.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${activo.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${activo.tipos_activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge estado-${activo.estado}">${activo.estado || 'DISPONIBLE'}</span></td>
                                    <td class="px-4 py-2 text-sm">${activo.empresa?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <button onclick="abrirModalConfiguracionRed('${activo.id}')" class="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark">
                                            <i class="fas fa-plus-circle"></i> Configurar IP
                                        </button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" class="text-center py-4 text-gray-500">Todos los activos tienen configuración de red</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Pie de página -->
            <div class="text-center text-xs text-gray-400 py-4 border-t">
                Reporte generado el ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Activos TI - Gallos Mármol
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // ============================================
        // INICIALIZAR GRÁFICOS (SOLO SI HAY DATOS)
        // ============================================
        
        // Gráfico: IPs por Tipo (DHCP/Estática)
        const chartIPTipo = document.getElementById('chartIPTipo');
        if (chartIPTipo && ipsPorTipo.size > 0) {
            new Chart(chartIPTipo, {
                type: 'doughnut',
                data: {
                    labels: Array.from(ipsPorTipo.keys()),
                    datasets: [{
                        data: Array.from(ipsPorTipo.values()),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
            });
        } else if (chartIPTipo) {
            chartIPTipo.parentElement.innerHTML = '<p class="text-center text-gray-400 py-4">No hay datos de IPs para mostrar</p>';
        }
        
        // Gráfico: IPs por Empresa (Top 8)
        const chartIPEmpresa = document.getElementById('chartIPEmpresa');
        const empresasTop = Array.from(ipsPorEmpresa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
        if (chartIPEmpresa && empresasTop.length > 0) {
            new Chart(chartIPEmpresa, {
                type: 'bar',
                data: {
                    labels: empresasTop.map(e => e[0]),
                    datasets: [{
                        label: 'Cantidad de IPs',
                        data: empresasTop.map(e => e[1]),
                        backgroundColor: '#6366f1',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        } else if (chartIPEmpresa) {
            chartIPEmpresa.parentElement.innerHTML = '<p class="text-center text-gray-400 py-4">No hay datos de IPs por empresa</p>';
        }
        
        // Gráfico: Top Redes
        const chartIPRed = document.getElementById('chartIPRed');
        const topRedes = ipsPorRed.slice(0, 5);
        if (chartIPRed && topRedes.length > 0) {
            new Chart(chartIPRed, {
                type: 'bar',
                data: {
                    labels: topRedes.map(r => r.red),
                    datasets: [{
                        label: 'IPs por red',
                        data: topRedes.map(r => r.count),
                        backgroundColor: '#14b8a6',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        } else if (chartIPRed) {
            chartIPRed.parentElement.innerHTML = '<p class="text-center text-gray-400 py-4">No hay datos de redes para mostrar</p>';
        }
        
        // Gráfico: Clasificación de IPs
        const chartIPClasificacion = document.getElementById('chartIPClasificacion');
        const clasificacionMap = new Map();
        ipsData.forEach(ip => {
            clasificacionMap.set(ip.tipo, (clasificacionMap.get(ip.tipo) || 0) + 1);
        });
        
        if (chartIPClasificacion && clasificacionMap.size > 0) {
            new Chart(chartIPClasificacion, {
                type: 'pie',
                data: {
                    labels: Array.from(clasificacionMap.keys()),
                    datasets: [{
                        data: Array.from(clasificacionMap.values()),
                        backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
            });
        } else if (chartIPClasificacion) {
            chartIPClasificacion.parentElement.innerHTML = '<p class="text-center text-gray-400 py-4">No hay datos de clasificación para mostrar</p>';
        }
        
        // Registrar función de búsqueda global
        window.filtrarTablaIPs = function() {
            const busqueda = document.getElementById('busquedaIPs')?.value.toLowerCase() || '';
            const filas = document.querySelectorAll('#tablaIPs tbody tr');
            
            filas.forEach(fila => {
                const ip = fila.dataset.ip?.toLowerCase() || '';
                const activo = fila.dataset.activo?.toLowerCase() || '';
                const hostname = fila.dataset.hostname?.toLowerCase() || '';
                
                if (ip.includes(busqueda) || activo.includes(busqueda) || hostname.includes(busqueda) || busqueda === '') {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        };
        
        console.log('✅ Reporte de IPs cargado correctamente');
        console.log(`📊 Estadísticas: ${totalIPs} IPs, ${activosSinRed?.length || 0} activos sin IP, ${ipsPorRed.length} redes`);
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando reporte de IPs:', error);
        mostrarError('Error al cargar el reporte de IPs: ' + (error.message || 'Error desconocido'));
    }
}

// ============================================
// FUNCIÓN PARA VOLVER A REPORTES GENERALES
// ============================================
async function volverAReportesGenerales() {
    await cargarReportes();
    // Restablecer el selector a "todos"
    const tipoSelect = document.getElementById('reporteTipo');
    if (tipoSelect) tipoSelect.value = 'todos';
}

// ============================================
// FUNCIONES DE EXPORTACIÓN (placeholder)
// ============================================
function exportarReporteIPsExcel() {
    mostrarLoading('Generando archivo Excel...');
    setTimeout(() => {
        ocultarLoading();
        mostrarAlerta('Info', 'La exportación a Excel estará disponible próximamente', 'info');
    }, 1000);
}

function exportarReporteIPsPDF() {
    mostrarLoading('Generando PDF...');
    setTimeout(() => {
        ocultarLoading();
        mostrarAlerta('Info', 'La exportación a PDF estará disponible próximamente', 'info');
    }, 1000);
}

function filtrarTablaIPs() {
    const busqueda = document.getElementById('busquedaIPs')?.value.toLowerCase() || '';
    const filas = document.querySelectorAll('#tablaIPs tbody tr');
    let contador = 0;
    
    filas.forEach(fila => {
        const ip = fila.dataset.ip?.toLowerCase() || '';
        const activo = fila.dataset.activo?.toLowerCase() || '';
        const hostname = fila.dataset.hostname?.toLowerCase() || '';
        
        if (ip.includes(busqueda) || activo.includes(busqueda) || hostname.includes(busqueda) || busqueda === '') {
            fila.style.display = '';
            contador++;
        } else {
            fila.style.display = 'none';
        }
    });
}

// ==================== REPORTE DE ESPECIFICACIONES TÉCNICAS ====================
async function cargarReporteEspecificaciones() {
    console.log('🔧 INICIANDO cargarReporteEspecificaciones');
    mostrarLoading('Cargando reporte de especificaciones...');
    
    try {
        console.log('1. Obteniendo tipos de activo...');
        
        // ============================================
        // 1. OBTENER TIPOS DE ACTIVO CON SUS ATRIBUTOS
        // ============================================
        
        const { data: tiposActivo, error: errorTipos } = await window.supabaseClient
            .from('tipos_activo')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        if (errorTipos) {
            console.error('Error obteniendo tipos:', errorTipos);
            throw errorTipos;
        }
        
        console.log('Tipos de activo obtenidos:', tiposActivo?.length || 0);
        
        // ============================================
        // 2. GENERAR HTML INICIAL
        // ============================================
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-microchip"></i> Reporte de Especificaciones Técnicas
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Análisis de atributos y valores por tipo de activo</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="exportarReporteEspecificacionesExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="window.print()" class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button onclick="volverAReportesGenerales()" class="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Filtros principales -->
            <div class="bg-white rounded-xl shadow-sm mb-6 p-4 border border-gray-200">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            <i class="fas fa-laptop text-primary mr-1"></i> Tipo de Activo
                        </label>
                        <select id="selectTipoActivo" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white" onchange="cargarAtributosPorTipo()">
                            <option value="">Seleccione un tipo de activo</option>
                            ${tiposActivo?.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('') || '<option value="">No hay tipos de activo</option>'}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            <i class="fas fa-tag text-primary mr-1"></i> Atributo
                        </label>
                        <select id="selectAtributo" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white" onchange="cargarValoresPorAtributo()" disabled>
                            <option value="">Primero seleccione un tipo de activo</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            <i class="fas fa-chart-bar text-primary mr-1"></i> Valor
                        </label>
                        <select id="selectValor" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white" onchange="filtrarActivosPorValor()" disabled>
                            <option value="">Seleccione un atributo</option>
                        </select>
                    </div>
                </div>
                
                <!-- Filtros adicionales -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            <i class="fas fa-building text-primary mr-1"></i> Empresa
                        </label>
                        <select id="selectEmpresa" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white">
                            <option value="">Todas</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            <i class="fas fa-power-off text-primary mr-1"></i> Estado
                        </label>
                        <select id="selectEstado" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white">
                            <option value="">Todos</option>
                            <option value="DISPONIBLE">DISPONIBLE</option>
                            <option value="ASIGNADO">ASIGNADO</option>
                            <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                            <option value="REPARACIÓN">REPARACIÓN</option>
                            <option value="BAJA">BAJA</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button onclick="aplicarFiltrosEspecificaciones()" class="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
                            <i class="fas fa-search"></i> Aplicar filtros
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Contenedor de resultados -->
            <div id="resultadosEspecificaciones">
                <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <i class="fas fa-microchip text-5xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">Seleccione un tipo de activo y atributo para ver el reporte</p>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        console.log('2. HTML cargado correctamente');
        
        // ============================================
        // 3. CARGAR EMPRESAS PARA EL FILTRO
        // ============================================
        console.log('3. Cargando empresas...');
        
        const { data: empresas, error: errorEmpresas } = await window.supabaseClient
            .from('empresas')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        if (errorEmpresas) {
            console.error('Error cargando empresas:', errorEmpresas);
        } else {
            console.log('Empresas cargadas:', empresas?.length || 0);
            const selectEmpresa = document.getElementById('selectEmpresa');
            if (selectEmpresa && empresas) {
                empresas.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = emp.nombre;
                    selectEmpresa.appendChild(option);
                });
            }
        }
        
        // ============================================
        // 4. REGISTRAR FUNCIONES GLOBALES
        // ============================================
        console.log('4. Registrando funciones globales...');
        
        window.cargarAtributosPorTipo = cargarAtributosPorTipo;
        window.cargarValoresPorAtributo = cargarValoresPorAtributo;
        window.filtrarActivosPorValor = filtrarActivosPorValor;
        window.aplicarFiltrosEspecificaciones = aplicarFiltrosEspecificaciones;
        window.filtrarActivosPorValorEspecifico = filtrarActivosPorValorEspecifico;
        window.exportarReporteEspecificacionesExcel = exportarReporteEspecificacionesExcel;
        
        ocultarLoading();
        console.log('✅ Reporte de especificaciones cargado correctamente');
        
        // Mostrar mensaje de éxito
        mostrarAlerta('Éxito', 'Reporte de especificaciones cargado correctamente', 'success', 2000);
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error FATAL en cargarReporteEspecificaciones:', error);
        mostrarError('Error al cargar reporte: ' + (error.message || 'Error desconocido'));
        
        // Mostrar error en la interfaz
        document.getElementById('dynamicContent').innerHTML = `
            <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-3"></i>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Error al cargar el reporte</h2>
                <p class="text-gray-500 mb-4">${error.message || 'Error desconocido'}</p>
                <button onclick="volverAReportesGenerales()" class="btn-primary">
                    <i class="fas fa-arrow-left mr-2"></i>Volver a Reportes
                </button>
            </div>
        `;
    }
}

// ============================================
// FUNCIONES AUXILIARES (con logs para debug)
// ============================================

async function cargarAtributosPorTipo() {
    console.log('🔄 cargarAtributosPorTipo - INICIO');
    
    const tipoActivoId = document.getElementById('selectTipoActivo')?.value;
    const selectAtributo = document.getElementById('selectAtributo');
    const selectValor = document.getElementById('selectValor');
    
    console.log('Tipo activo seleccionado:', tipoActivoId);
    
    if (!tipoActivoId) {
        console.log('No hay tipo seleccionado, limpiando selects');
        selectAtributo.innerHTML = '<option value="">Primero seleccione un tipo de activo</option>';
        selectAtributo.disabled = true;
        selectValor.innerHTML = '<option value="">Seleccione un atributo</option>';
        selectValor.disabled = true;
        return;
    }
    
    mostrarLoading('Cargando atributos...');
    
    try {
        // Obtener atributos del tipo de activo
        const { data: atributos, error } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('id, nombre_atributo, tipo_dato, unidad_medida')
            .eq('tipo_activo_id', tipoActivoId)
            .eq('activo', true)
            .order('orden')
            .order('nombre_atributo');
        
        if (error) throw error;
        
        console.log('Atributos encontrados:', atributos?.length || 0);
        
        selectAtributo.innerHTML = '<option value="">Seleccione un atributo</option>';
        
        if (atributos && atributos.length > 0) {
            atributos.forEach(attr => {
                const option = document.createElement('option');
                option.value = attr.id;
                option.textContent = `${attr.nombre_atributo} ${attr.unidad_medida ? `(${attr.unidad_medida})` : ''}`;
                option.dataset.tipo = attr.tipo_dato;
                selectAtributo.appendChild(option);
            });
            selectAtributo.disabled = false;
            console.log('Atributos cargados en el select');
        } else {
            selectAtributo.innerHTML = '<option value="">No hay atributos para este tipo</option>';
            selectAtributo.disabled = true;
            console.log('No hay atributos para este tipo de activo');
        }
        
        selectValor.innerHTML = '<option value="">Seleccione un atributo primero</option>';
        selectValor.disabled = true;
        
        ocultarLoading();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en cargarAtributosPorTipo:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los atributos: ' + error.message, 'error');
    }
}

async function cargarValoresPorAtributo() {
    console.log('🔄 cargarValoresPorAtributo - INICIO');
    
    const atributoId = document.getElementById('selectAtributo')?.value;
    const tipoActivoId = document.getElementById('selectTipoActivo')?.value;
    const selectValor = document.getElementById('selectValor');
    
    console.log('Atributo ID:', atributoId);
    console.log('Tipo activo ID:', tipoActivoId);
    
    if (!atributoId || !tipoActivoId) {
        console.log('Faltan parámetros');
        selectValor.innerHTML = '<option value="">Seleccione un atributo</option>';
        selectValor.disabled = true;
        return;
    }
    
    mostrarLoading('Cargando valores...');
    
    try {
        // Obtener valores únicos del atributo
        const { data: valores, error } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`
                valor_texto,
                valor_numero,
                valor_booleano,
                valor_fecha
            `)
            .eq('atributo_id', atributoId);
        
        if (error) throw error;
        
        console.log('Valores obtenidos:', valores?.length || 0);
        
        // Extraer valores únicos según el tipo de dato
        const valoresUnicos = new Map();
        
        valores?.forEach(v => {
            let valor = null;
            if (v.valor_texto && v.valor_texto.trim() !== '') valor = v.valor_texto;
            else if (v.valor_numero !== null && v.valor_numero !== undefined) valor = v.valor_numero.toString();
            else if (v.valor_booleano !== null) valor = v.valor_booleano ? 'Sí' : 'No';
            else if (v.valor_fecha) valor = new Date(v.valor_fecha).toLocaleDateString();
            
            if (valor && !valoresUnicos.has(valor)) {
                valoresUnicos.set(valor, { valor, count: 0 });
            }
            if (valor && valoresUnicos.has(valor)) {
                valoresUnicos.get(valor).count++;
            }
        });
        
        const valoresArray = Array.from(valoresUnicos.values()).sort((a, b) => b.count - a.count);
        console.log('Valores únicos:', valoresArray.length);
        
        selectValor.innerHTML = '<option value="">Todos los valores</option>';
        
        if (valoresArray.length > 0) {
            valoresArray.forEach(v => {
                const option = document.createElement('option');
                option.value = v.valor;
                option.textContent = `${v.valor} (${v.count} activos)`;
                selectValor.appendChild(option);
            });
            selectValor.disabled = false;
            console.log('Valores cargados en el select');
        } else {
            selectValor.innerHTML = '<option value="">No hay valores registrados</option>';
            selectValor.disabled = true;
            console.log('No hay valores para este atributo');
        }
        
        ocultarLoading();
        
        // Mostrar distribución de valores en gráfico
        await mostrarDistribucionValores(atributoId, tipoActivoId);
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en cargarValoresPorAtributo:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los valores: ' + error.message, 'error');
    }
}

async function mostrarDistribucionValores(atributoId, tipoActivoId) {
    console.log('🔄 mostrarDistribucionValores - INICIO');
    mostrarLoading('Generando gráfico...');
    
    try {
        // Obtener distribución de valores
        const { data: valores, error } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`
                valor_texto,
                valor_numero,
                valor_booleano,
                valor_fecha,
                activo:activo_id (tipo_activo_id)
            `)
            .eq('atributo_id', atributoId)
            .eq('activo.tipo_activo_id', tipoActivoId);
        
        if (error) throw error;
        
        console.log('Valores para distribución:', valores?.length || 0);
        
        // Contar valores
        const distribucion = new Map();
        
        valores?.forEach(v => {
            let valor = null;
            if (v.valor_texto && v.valor_texto.trim() !== '') valor = v.valor_texto;
            else if (v.valor_numero !== null && v.valor_numero !== undefined) valor = v.valor_numero.toString();
            else if (v.valor_booleano !== null) valor = v.valor_booleano ? 'Sí' : 'No';
            else if (v.valor_fecha) valor = new Date(v.valor_fecha).toLocaleDateString();
            
            if (valor) {
                distribucion.set(valor, (distribucion.get(valor) || 0) + 1);
            }
        });
        
        // Ordenar por cantidad descendente
        const distribucionArray = Array.from(distribucion.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        // Obtener nombre del atributo
        const { data: atributo } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('nombre_atributo, unidad_medida')
            .eq('id', atributoId)
            .single();
        
        const totalActivos = valores?.length || 0;
        
        ocultarLoading();
        
        // Generar HTML de distribución
        let distribucionHtml = `
            <div class="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                <div class="bg-gradient-to-r from-purple-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-chart-bar text-primary mr-2"></i>
                        Distribución de ${atributo?.nombre_atributo || 'Valores'}
                        ${atributo?.unidad_medida ? `(${atributo.unidad_medida})` : ''}
                    </h3>
                    <p class="text-xs text-gray-400 mt-1">Total de activos con este atributo: ${totalActivos}</p>
                </div>
                <div class="p-4">
                    <canvas id="chartDistribucion" height="200"></canvas>
                </div>
                ${distribucionArray.length > 0 ? `
                <div class="overflow-x-auto px-4 pb-4">
                    <table class="min-w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Porcentaje</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barra</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${distribucionArray.map(([valor, count]) => {
                                const porcentaje = totalActivos > 0 ? Math.round((count / totalActivos) * 100) : 0;
                                return `
                                    <tr class="hover:bg-gray-50 cursor-pointer" onclick="filtrarActivosPorValorEspecifico('${valor.replace(/'/g, "\\'")}')">
                                        <td class="px-4 py-2 text-sm font-medium text-primary">${valor}</td>
                                        <td class="px-4 py-2 text-sm">${count}</td>
                                        <td class="px-4 py-2 text-sm">${porcentaje}%</td>
                                        <td class="px-4 py-2">
                                            <div class="w-full bg-gray-200 rounded-full h-2">
                                                <div class="bg-primary h-2 rounded-full" style="width: ${porcentaje}%"></div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ` : '<div class="p-4 text-center text-gray-400">No hay datos para mostrar</div>'}
            </div>
        `;
        
        const resultadosDiv = document.getElementById('resultadosEspecificaciones');
        if (resultadosDiv) {
            resultadosDiv.innerHTML = distribucionHtml + '<div id="listaActivosEspecificaciones"></div>';
        }
        
        // Inicializar gráfico
        if (distribucionArray.length > 0 && document.getElementById('chartDistribucion')) {
            new Chart(document.getElementById('chartDistribucion'), {
                type: 'bar',
                data: {
                    labels: distribucionArray.map(d => d[0]),
                    datasets: [{
                        label: 'Cantidad de activos',
                        data: distribucionArray.map(d => d[1]),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
            console.log('Gráfico inicializado');
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en mostrarDistribucionValores:', error);
        const resultadosDiv = document.getElementById('resultadosEspecificaciones');
        if (resultadosDiv) {
            resultadosDiv.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p class="text-red-500">Error al cargar la distribución: ${error.message}</p>
                </div>
            `;
        }
    }
}

async function filtrarActivosPorValor() {
    const valorSeleccionado = document.getElementById('selectValor')?.value;
    if (!valorSeleccionado) {
        document.getElementById('listaActivosEspecificaciones').innerHTML = '';
        return;
    }
    await filtrarActivosPorValorEspecifico(valorSeleccionado);
}

async function filtrarActivosPorValorEspecifico(valor) {
    console.log('🔄 filtrarActivosPorValorEspecifico - Valor:', valor);
    
    const atributoId = document.getElementById('selectAtributo')?.value;
    const tipoActivoId = document.getElementById('selectTipoActivo')?.value;
    const empresaId = document.getElementById('selectEmpresa')?.value;
    const estado = document.getElementById('selectEstado')?.value;
    
    if (!atributoId || !tipoActivoId) {
        console.log('Faltan parámetros');
        return;
    }
    
    mostrarLoading('Cargando activos...');
    
    try {
        // Obtener activos con el valor seleccionado
        let query = window.supabaseClient
            .from('especificaciones_valores')
            .select(`
                activo:activo_id (
                    id,
                    nombre,
                    codigo_activo,
                    estado,
                    empresa:empresa_id (id, nombre),
                    tipos_activo (id, nombre)
                )
            `)
            .eq('atributo_id', atributoId);
        
        // Filtrar por valor - usando texto o número
        query = query.or(`valor_texto.eq.${valor},valor_numero.eq.${valor}`);
        
        const { data: resultados, error } = await query;
        
        if (error) throw error;
        
        console.log('Resultados obtenidos:', resultados?.length || 0);
        
        // Aplicar filtros adicionales
        let activos = resultados?.map(r => r.activo).filter(a => a && a.tipo_activo_id === tipoActivoId) || [];
        
        if (empresaId) {
            activos = activos.filter(a => a.empresa?.id === empresaId);
        }
        if (estado) {
            activos = activos.filter(a => a.estado === estado);
        }
        
        // Obtener nombre del atributo
        const { data: atributo } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('nombre_atributo')
            .eq('id', atributoId)
            .single();
        
        ocultarLoading();
        
        // Generar tabla de activos
        let activosHtml = `
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i>
                        Activos con ${atributo?.nombre_atributo || 'valor'} = "${valor}"
                        <span class="text-sm text-gray-400 ml-1">(${activos.length} registros)</span>
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${activos.map(activo => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2 text-sm font-mono text-gray-500">${activo.codigo_activo || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm font-medium text-primary">${activo.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">${activo.tipos_activo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm"><span class="estado-badge estado-${activo.estado}">${activo.estado || 'DISPONIBLE'}</span></td>
                                    <td class="px-4 py-2 text-sm">${activo.empresa?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <button onclick="verDetalleActivo('${activo.id}')" class="text-blue-600 hover:text-blue-800">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${activos.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay activos con este valor</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        const listaDiv = document.getElementById('listaActivosEspecificaciones');
        if (listaDiv) {
            listaDiv.innerHTML = activosHtml;
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error en filtrarActivosPorValorEspecifico:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los activos: ' + error.message, 'error');
    }
}

async function aplicarFiltrosEspecificaciones() {
    const valorSeleccionado = document.getElementById('selectValor')?.value;
    if (valorSeleccionado && valorSeleccionado !== '') {
        await filtrarActivosPorValorEspecifico(valorSeleccionado);
    }
}

function exportarReporteEspecificacionesExcel() {
    mostrarLoading('Generando archivo Excel...');
    setTimeout(() => {
        ocultarLoading();
        mostrarAlerta('Info', 'La exportación a Excel estará disponible próximamente', 'info');
    }, 1000);
}

// Registrar función global
window.filtrarActivosPorValorEspecifico = filtrarActivosPorValorEspecifico;
window.cargarReportesMantenimientosFiltrados = cargarReportesMantenimientosFiltrados;







