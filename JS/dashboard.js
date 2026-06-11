// ==================== VISTA DASHBOARD ====================
async function cargarDashboard() {
    mostrarLoading('Cargando dashboard...');

    try {
        console.log('%c📊 CARGANDO DASHBOARD', 'background: #28a745; color: white; font-size: 14px;');

        // ========== KPIs PRINCIPALES ==========
        const [
            { count: totalActivos },
            { count: totalEmpleados },
            { count: totalAsignacionesActivas },
            { count: totalMantenimientosPendientes },
            { count: totalSoftwareInstalado },
            { count: totalLicenciasVigentes },
            { count: totalActivosDisponibles },
            { count: totalActivosAsignados },
            { count: totalActivosMantenimiento },
            { count: totalActivosReparacion },
            { count: totalActivosBaja },
            { count: totalMantenimientosExitosos },
            { count: totalMantenimientosTotales }
        ] = await Promise.all([
            window.supabaseClient.from('activos').select('*', { count: 'exact', head: true }),
            window.supabaseClient.from('empleados').select('*', { count: 'exact', head: true }).eq('activo', true),
            window.supabaseClient.from('asignaciones').select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVA'),
            window.supabaseClient.from('mantenimientos').select('*', { count: 'exact', head: true }).eq('resultado', 'PENDIENTE'),
            window.supabaseClient.from('software_instalado').select('*', { count: 'exact', head: true }).eq('estado', 'INSTALADO'),
            window.supabaseClient.from('licencias').select('*', { count: 'exact', head: true }).eq('activo', true),
            window.supabaseClient.from('activos').select('*', { count: 'exact', head: true }).eq('estado', 'DISPONIBLE'),
            window.supabaseClient.from('activos').select('*', { count: 'exact', head: true }).eq('estado', 'ASIGNADO'),
            window.supabaseClient.from('activos').select('*', { count: 'exact', head: true }).eq('estado', 'MANTENIMIENTO'),
            window.supabaseClient.from('activos').select('*', { count: 'exact', head: true }).eq('estado', 'REPARACIÓN'),
            window.supabaseClient.from('activos').select('*', { count: 'exact', head: true }).eq('estado', 'BAJA'),
            window.supabaseClient.from('mantenimientos').select('*', { count: 'exact', head: true }).eq('resultado', 'EXITOSO'),
            window.supabaseClient.from('mantenimientos').select('*', { count: 'exact', head: true })
        ]);

        const eficienciaMantenimiento = totalMantenimientosTotales > 0
            ? Math.round((totalMantenimientosExitosos / totalMantenimientosTotales) * 100)
            : 0;

        // ========== GRÁFICOS ==========
        const estados = [
            { label: 'Disponible', count: totalActivosDisponibles || 0, color: '#10b981' },
            { label: 'Asignado', count: totalActivosAsignados || 0, color: '#3b82f6' },
            { label: 'Mantenimiento', count: totalActivosMantenimiento || 0, color: '#8b5cf6' },
            { label: 'Reparación', count: totalActivosReparacion || 0, color: '#f59e0b' },
            { label: 'Baja', count: totalActivosBaja || 0, color: '#ef4444' }
        ].filter(e => e.count > 0);

        // Activos por Tipo (Top 5)
        const { data: activosPorTipoData } = await window.supabaseClient
            .from('activos')
            .select('tipos_activo (nombre)');

        const tipoMap = new Map();
        activosPorTipoData?.forEach(a => {
            const nombre = a.tipos_activo?.nombre || 'Sin tipo';
            tipoMap.set(nombre, (tipoMap.get(nombre) || 0) + 1);
        });
        const activosPorTipo = Array.from(tipoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Activos por Marca (Top 5)
        const { data: activosPorMarcaData } = await window.supabaseClient
            .from('info_general')
            .select('marcas (nombre)');

        const marcaMap = new Map();
        activosPorMarcaData?.forEach(i => {
            const nombre = i.marcas?.nombre || 'Sin marca';
            marcaMap.set(nombre, (marcaMap.get(nombre) || 0) + 1);
        });
        const activosPorMarca = Array.from(marcaMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Software más instalado (Top 5)
        const { data: softwareData } = await window.supabaseClient
            .from('software_instalado')
            .select('software:software_id (nombre)')
            .eq('estado', 'INSTALADO');

        const softwareMap = new Map();
        softwareData?.forEach(s => {
            const nombre = s.software?.nombre || 'Software desconocido';
            softwareMap.set(nombre, (softwareMap.get(nombre) || 0) + 1);
        });
        const softwareMasInstalado = Array.from(softwareMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Asignaciones por Mes
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const hoy = new Date();
        const asignacionesPorMes = new Array(12).fill(0);

        const { data: asignacionesData } = await window.supabaseClient
            .from('asignaciones')
            .select('fecha_asignacion');

        asignacionesData?.forEach(a => {
            if (a.fecha_asignacion) {
                const fecha = new Date(a.fecha_asignacion);
                const mesIndex = fecha.getMonth();
                asignacionesPorMes[mesIndex]++;
            }
        });

        const ultimos6Meses = [];
        const ultimos6Datos = [];
        for (let i = 5; i >= 0; i--) {
            const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            ultimos6Meses.push(meses[fecha.getMonth()]);
            ultimos6Datos.push(asignacionesPorMes[fecha.getMonth()]);
        }

        // Alertas
        const hoyStr = new Date().toISOString().split('T')[0];
        const dentro30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data: licenciasPorVencer } = await window.supabaseClient
            .from('licencias')
            .select(`id, codigo_licencia, fecha_vencimiento, software:software_id (nombre)`)
            .gte('fecha_vencimiento', hoyStr)
            .lte('fecha_vencimiento', dentro30)
            .order('fecha_vencimiento')
            .limit(5);

        const { data: mantenimientosProximos } = await window.supabaseClient
            .from('mantenimientos')
            .select(`id, tipo, descripcion, fecha_programada, activo:activos (nombre, codigo_activo)`)
            .gte('fecha_programada', hoyStr)
            .order('fecha_programada')
            .limit(5);

        const { data: garantiasPorVencer } = await window.supabaseClient
            .from('info_general')
            .select(`fecha_garantia, activo:activo_id (nombre, codigo_activo)`)
            .gte('fecha_garantia', hoyStr)
            .lte('fecha_garantia', dentro30)
            .order('fecha_garantia')
            .limit(5);

        ocultarLoading();

        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary">Dashboard</h1>
                        <p class="text-gray-500 text-sm mt-1">Panel de control y monitoreo en tiempo real</p>
                    </div>
                    <div class="text-sm text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                        <i class="fas fa-sync-alt mr-1"></i> Actualizado: ${new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>

            <!-- KPIs PRINCIPALES -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Activos</p>
                            <p class="text-2xl font-bold text-primary">${totalActivos || 0}</p>
                            <div class="flex items-center gap-2 mt-1 text-xs">
                                <span class="text-green-600">✓ ${totalActivosDisponibles || 0} disp.</span>
                                <span class="text-blue-600">👤 ${totalActivosAsignados || 0} asig.</span>
                            </div>
                        </div>
                        <div class="bg-primary/10 p-3 rounded-xl">
                            <i class="fas fa-desktop text-2xl text-primary"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Empleados</p>
                            <p class="text-2xl font-bold text-green-600">${totalEmpleados || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Activos en el sistema</p>
                        </div>
                        <div class="bg-green-50 p-3 rounded-xl">
                            <i class="fas fa-users text-2xl text-green-600"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Asignaciones Activas</p>
                            <p class="text-2xl font-bold text-blue-600">${totalAsignacionesActivas || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Ocupación: ${totalActivos > 0 ? Math.round((totalAsignacionesActivas / totalActivos) * 100) : 0}%</p>
                        </div>
                        <div class="bg-blue-50 p-3 rounded-xl">
                            <i class="fas fa-clipboard-list text-2xl text-blue-600"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Mantenimientos Pendientes</p>
                            <p class="text-2xl font-bold text-orange-600">${totalMantenimientosPendientes || 0}</p>
                            <p class="text-xs text-gray-400 mt-1">Eficiencia: ${eficienciaMantenimiento}%</p>
                        </div>
                        <div class="bg-orange-50 p-3 rounded-xl">
                            <i class="fas fa-tools text-2xl text-orange-600"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KPIS SECUNDARIOS -->
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                <div class="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
                    <div class="text-xl font-bold text-purple-600">${totalSoftwareInstalado || 0}</div>
                    <div class="text-xs text-gray-500">Software Instalado</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
                    <div class="text-xl font-bold text-indigo-600">${totalLicenciasVigentes || 0}</div>
                    <div class="text-xs text-gray-500">Licencias Vigentes</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
                    <div class="text-xl font-bold text-yellow-600">${totalActivosMantenimiento || 0}</div>
                    <div class="text-xs text-gray-500">En Mantenimiento</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
                    <div class="text-xl font-bold text-red-600">${totalActivosReparacion || 0}</div>
                    <div class="text-xs text-gray-500">En Reparación</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
                    <div class="text-xl font-bold text-gray-600">${totalActivosBaja || 0}</div>
                    <div class="text-xs text-gray-500">Dados de Baja</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
                    <div class="text-xl font-bold text-teal-600">${totalMantenimientosExitosos || 0}</div>
                    <div class="text-xs text-gray-500">Mant. Exitosos</div>
                </div>
            </div>

            <!-- GRÁFICOS PRINCIPALES -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-chart-pie text-primary mr-2"></i>Activos por Estado</h3>
                        <button onclick="window.cargarVista('activos')" class="text-xs text-primary hover:underline">Ver todos →</button>
                    </div>
                    <canvas id="chartEstado" height="200"></canvas>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-tags text-primary mr-2"></i>Activos por Tipo (Top 5)</h3>
                    </div>
                    <canvas id="chartTipo" height="200"></canvas>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-trademark text-primary mr-2"></i>Activos por Marca (Top 5)</h3>
                    </div>
                    <canvas id="chartMarca" height="200"></canvas>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-code text-primary mr-2"></i>Software más Instalado (Top 5)</h3>
                    </div>
                    <canvas id="chartSoftware" height="200"></canvas>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-4 lg:col-span-2">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-chart-line text-primary mr-2"></i>Asignaciones por Mes (últimos 6 meses)</h3>
                        <button onclick="window.cargarVista('asignaciones')" class="text-xs text-primary hover:underline">Ver historial →</button>
                    </div>
                    <canvas id="chartAsignaciones" height="200"></canvas>
                </div>
            </div>

            <!-- ALERTAS Y ACCIONES RÁPIDAS -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="bg-gradient-to-r from-yellow-50 to-white px-5 py-3 border-b border-gray-100">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>Licencias por vencer (próximos 30 días)</h3>
                    </div>
                    <div class="p-4"><div id="licencias-por-vencer" class="space-y-2">${generarListaLicenciasDashboard(licenciasPorVencer)}</div></div>
                </div>

                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-50 to-white px-5 py-3 border-b border-gray-100">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-calendar-alt text-blue-500 mr-2"></i>Próximos mantenimientos</h3>
                    </div>
                    <div class="p-4"><div id="mantenimientos-proximos" class="space-y-2">${generarListaMantenimientosDashboard(mantenimientosProximos)}</div></div>
                </div>

                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="bg-gradient-to-r from-green-50 to-white px-5 py-3 border-b border-gray-100">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-shield-alt text-green-500 mr-2"></i>Garantías por vencer (próximos 30 días)</h3>
                    </div>
                    <div class="p-4"><div id="garantias-por-vencer" class="space-y-2">${generarListaGarantiasDashboard(garantiasPorVencer)}</div></div>
                </div>

                <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div class="bg-gradient-to-r from-primary/10 to-white px-5 py-3 border-b border-gray-100">
                        <h3 class="font-semibold text-gray-700"><i class="fas fa-bolt text-primary mr-2"></i>Acciones rápidas</h3>
                    </div>
                    <div class="p-4">
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="window.abrirModalNuevoActivo()" class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><i class="fas fa-plus-circle text-primary"></i><span class="text-sm">Nuevo Activo</span></button>
                            <button onclick="window.abrirModalNuevoEmpleado()" class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><i class="fas fa-user-plus text-primary"></i><span class="text-sm">Nuevo Empleado</span></button>
                            <button onclick="window.abrirModalNuevaAsignacion()" class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><i class="fas fa-clipboard-list text-primary"></i><span class="text-sm">Nueva Asignación</span></button>
                            <button onclick="window.abrirModalNuevoMantenimiento()" class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><i class="fas fa-tools text-primary"></i><span class="text-sm">Registrar Mantenimiento</span></button>
                            <button onclick="window.cargarVista('reportes')" class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors col-span-2"><i class="fas fa-chart-bar text-primary"></i><span class="text-sm">Ver Reportes Detallados</span></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('dynamicContent').innerHTML = html;

        // Inicializar gráficos
        function initChart(chartId, config) {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const existingChart = Chart.getChart(chartId);
                if (existingChart) existingChart.destroy();
                return new Chart(canvas, config);
            }
            return null;
        }

        if (estados.length > 0) {
            initChart('chartEstado', {
                type: 'doughnut',
                data: {
                    labels: estados.map(e => e.label),
                    datasets: [{
                        data: estados.map(e => e.count),
                        backgroundColor: estados.map(e => e.color),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

        if (activosPorTipo && activosPorTipo.length > 0) {
            initChart('chartTipo', {
                type: 'bar',
                data: {
                    labels: activosPorTipo.map(t => t[0]),
                    datasets: [{
                        label: 'Cantidad',
                        data: activosPorTipo.map(t => t[1]),
                        backgroundColor: '#39080a',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { title: { display: true, text: 'Tipo de Activo', font: { size: 11 } } }
                    }
                }
            });
        }

        if (activosPorMarca && activosPorMarca.length > 0) {
            initChart('chartMarca', {
                type: 'bar',
                data: {
                    labels: activosPorMarca.map(m => m[0]),
                    datasets: [{
                        label: 'Cantidad',
                        data: activosPorMarca.map(m => m[1]),
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

        if (softwareMasInstalado && softwareMasInstalado.length > 0) {
            initChart('chartSoftware', {
                type: 'pie',
                data: {
                    labels: softwareMasInstalado.map(s => s[0]),
                    datasets: [{
                        data: softwareMasInstalado.map(s => s[1]),
                        backgroundColor: ['#39080a', '#4a0a0d', '#d4d4ae', '#c4c49a', '#2a0607']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                    }
                }
            });
        }

        if (ultimos6Meses && ultimos6Meses.length > 0) {
            initChart('chartAsignaciones', {
                type: 'line',
                data: {
                    labels: ultimos6Meses,
                    datasets: [{
                        label: 'Asignaciones',
                        data: ultimos6Datos,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#fff',
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
        }

        console.log('✅ Dashboard cargado correctamente');

    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando dashboard:', error);
        mostrarError('Error al cargar el dashboard: ' + error.message);
    }
}

function generarListaLicenciasDashboard(licencias) {
    if (!licencias || licencias.length === 0) return '<p class="text-gray-500 text-sm text-center py-2">No hay licencias próximas a vencer</p>';

    const hoy = new Date();
    let html = '<div class="space-y-2">';
    licencias.forEach(l => {
        const fechaVencimiento = new Date(l.fecha_vencimiento);
        const dias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        const warningClass = dias < 7 ? 'text-red-600 font-bold' : 'text-yellow-600';

        html += `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">${l.software?.nombre || 'Software'}</p>
                    <p class="text-xs text-gray-400">${l.codigo_licencia || 'Sin código'}</p>
                </div>
                <div class="text-right">
                    <span class="text-sm ${warningClass}">${dias} días</span>
                    <p class="text-xs text-gray-400">${new Date(l.fecha_vencimiento).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function generarListaMantenimientosDashboard(mantenimientos) {
    if (!mantenimientos || mantenimientos.length === 0) return '<p class="text-gray-500 text-sm text-center py-2">No hay mantenimientos programados</p>';

    let html = '<div class="space-y-2">';
    mantenimientos.forEach(m => {
        html += `
            <div class="flex justify-between items-start p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">${m.activo?.nombre || 'Activo'}</p>
                    <p class="text-xs text-gray-500 truncate">${m.descripcion?.substring(0, 50) || m.tipo || 'Sin descripción'}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs font-medium text-orange-600">${m.tipo || 'Mantenimiento'}</span>
                    <p class="text-xs text-gray-400">${m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString() : 'Sin fecha'}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function generarListaGarantiasDashboard(garantias) {
    if (!garantias || garantias.length === 0) return '<p class="text-gray-500 text-sm text-center py-2">No hay garantías próximas a vencer</p>';

    const hoy = new Date();
    let html = '<div class="space-y-2">';
    garantias.forEach(g => {
        const fechaVencimiento = new Date(g.fecha_garantia);
        const dias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        const warningClass = dias < 7 ? 'text-red-600 font-bold' : 'text-yellow-600';

        html += `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm truncate">${g.activo?.nombre || 'Activo'}</p>
                    <p class="text-xs text-gray-400">${g.activo?.codigo_activo || 'Sin código'}</p>
                </div>
                <div class="text-right">
                    <span class="text-sm ${warningClass}">${dias} días</span>
                    <p class="text-xs text-gray-400">${new Date(g.fecha_garantia).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}