// ==================== CONSUMIBLES - INVENTARIO ====================

// ==================== VISTA CONSUMIBLES (CON FILTROS AVANZADOS Y VISTA DUAL) ====================
let vistaConsumiblesActual = 'tabla'; // 'tabla' o 'cards'

// Variable global para guardar los consumibles originales
let consumiblesOriginales = [];

// Tu función original (se mantiene como está)
async function cargarVistaConsumibles() {
    mostrarLoading('Cargando inventario de consumibles...');
    
    try {
        console.log('%c📦 CARGANDO CONSUMIBLES - FILTROS DINÁMICOS', 'background: #20c997; color: white; font-size: 14px;');
        
        // Obtener consumibles con todas sus relaciones
        const { data: consumibles, error } = await window.supabaseClient
            .from('consumibles')
            .select(`
                *,
                categoria:consumible_categorias(id, nombre),
                tipo:consumible_tipos(id, nombre),
                marca:marca_id(id, nombre),
                proveedor:proveedor_id(id, nombre),
                empresa:empresa_id(id, nombre, ruc),
                ubicacion:ubicacion_id(id, nombre, tipo, descripcion),
                unidad:unidad_medida_id(id, nombre, nombre_plural, abreviatura, codigo)
            `)
            .order('nombre');
        
        if (error) throw error;
        
        // Guardar consumibles originales para restaurar filtros
        consumiblesOriginales = consumibles;
        
        // Calcular estadísticas
        const totalItems = consumibles?.length || 0;
        const stockBajo = consumibles?.filter(c => c.stock_actual <= c.stock_minimo && c.stock_actual > 0).length || 0;
        const stockAgotado = consumibles?.filter(c => c.stock_actual === 0).length || 0;
        const stockNormal = totalItems - stockBajo - stockAgotado;
        
        // ============================================
        // OBTENER VALORES ÚNICOS PARA FILTROS DINÁMICOS
        // ============================================
        const valoresUnicos = obtenerValoresUnicosFiltros(consumibles);
        
        // Generar opciones de filtros dinámicamente
        const categoriasOptions = valoresUnicos.categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        const tiposOptions = valoresUnicos.tipos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
        const marcasOptions = valoresUnicos.marcas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
        const ubicacionesOptions = valoresUnicos.ubicaciones.map(u => `<option value="${u.id}">${u.nombre}${u.tipo ? ` (${u.tipo})` : ''}</option>`).join('');
        const empresasOptions = valoresUnicos.empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        const proveedoresOptions = valoresUnicos.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        const nombresOptions = valoresUnicos.nombres.map(n => `<option value="${n.nombre}">${n.nombre}</option>`).join('');
        
        ocultarLoading();
        
        // Función para obtener nombre de unidad (para la vista)
        const getUnidadNombre = (unidad, cantidad) => {
            if (!unidad || !unidad.nombre) return 'unidad';
            if (Math.abs(cantidad) === 1) return unidad.nombre;
            if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') return unidad.nombre_plural;
            return `${unidad.nombre}s`;
        };
        
        // Generar HTML de la vista
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-boxes"></i> Inventario de Consumibles
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestión de insumos y consumibles de TI</p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <!-- Botón Exportar PDF -->
                        <button onclick="exportarConsumiblesPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm" title="Exportar a PDF">
                            <i class="fas fa-file-pdf"></i> PDF
                        </button>
                        <!-- Botón Exportar Excel -->
                        <button onclick="exportarConsumiblesExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm" title="Exportar a Excel">
                            <i class="fas fa-file-excel"></i> Excel
                        </button>
                        <!-- Vista Tabla/Cards -->
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaConsumibles('tabla')" class="px-3 py-1.5 text-sm ${vistaConsumiblesActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Tabla">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaConsumibles('cards')" class="px-3 py-1.5 text-sm ${vistaConsumiblesActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Cards">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        <!-- Botón Nuevo Consumible -->
                        <button onclick="abrirModalNuevoConsumible()" class="btn-primary flex items-center gap-2">
                            <i class="fas fa-plus"></i> Nuevo Consumible
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Total Ítems</p>
                            <p class="text-2xl font-bold text-primary" id="totalItemsCount">${totalItems}</p>
                            <p class="text-xs text-gray-400 mt-1">Productos registrados</p>
                        </div>
                        <div class="bg-primary/10 p-2 rounded-lg"><i class="fas fa-boxes text-primary"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Stock Normal</p>
                            <p class="text-2xl font-bold text-green-600" id="stockNormalCount">${stockNormal}</p>
                            <p class="text-xs text-gray-400 mt-1">Productos OK</p>
                        </div>
                        <div class="bg-green-50 p-2 rounded-lg"><i class="fas fa-check-circle text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Stock Bajo</p>
                            <p class="text-2xl font-bold text-orange-600" id="stockBajoCount">${stockBajo}</p>
                            <p class="text-xs text-gray-400 mt-1">Por debajo del mínimo</p>
                        </div>
                        <div class="bg-orange-100 p-2 rounded-lg"><i class="fas fa-exclamation-triangle text-orange-600"></i></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Stock Agotado</p>
                            <p class="text-2xl font-bold text-red-600" id="stockAgotadoCount">${stockAgotado}</p>
                            <p class="text-xs text-gray-400 mt-1">Productos sin stock</p>
                        </div>
                        <div class="bg-red-100 p-2 rounded-lg"><i class="fas fa-times-circle text-red-600"></i></div>
                    </div>
                </div>
            </div>
            
            <!-- FILTROS AVANZADOS CON OPCIONES DINÁMICAS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosConsumibles()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosActivosBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosConsumiblesIcon"></i>
                </div>
                <div id="panelFiltrosConsumibles" class="p-4 hidden">
                    <!-- Primera fila de filtros -->
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-3">
                        <!-- Categoría -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                            <select id="filtroCategoria" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${categoriasOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        
                        <!-- Tipo -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                            <select id="filtroTipo" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${tiposOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        
                        <!-- Marca -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Marca</label>
                            <select id="filtroMarca" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${marcasOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        
                        <!-- Ubicación -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Ubicación</label>
                            <select id="filtroUbicacion" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${ubicacionesOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        
                        <!-- Empresa -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
                            <select id="filtroEmpresa" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${empresasOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        
                        <!-- Proveedor -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Proveedor</label>
                            <select id="filtroProveedor" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${proveedoresOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        
                        <!-- Nombre del Consumible -->
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                            <select id="filtroNombre" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${nombresOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                    </div>
                    
                    <!-- Segunda fila de filtros -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                            <select id="filtroStock" class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                <option value="normal">✅ Stock Normal</option>
                                <option value="bajo">⚠️ Stock Bajo</option>
                                <option value="agotado">❌ Agotado</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Búsqueda</label>
                            <input type="text" id="filtroBusqueda" placeholder="Nombre, código..." class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div class="flex items-end gap-2 col-span-2">
                            <button onclick="aplicarFiltrosConsumibles()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <i class="fas fa-search"></i> Buscar
                            </button>
                            <button onclick="limpiarFiltrosConsumibles()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-undo-alt"></i> Limpiar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Mensaje informativo -->
                    <div class="text-xs text-gray-400 mt-3 pt-2 border-t">
                        <i class="fas fa-info-circle"></i> Los filtros muestran solo valores que existen actualmente en el inventario
                    </div>
                </div>
            </div>
            
            <!-- Contenedor de resultados -->
            <div id="consumiblesContainer"></div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Cargar los datos según la vista actual
        await cargarDatosConsumibles(consumibles);
        
        // Inicializar eventos de filtros
        inicializarEventosFiltros();
        
        console.log('✅ Vista de consumibles cargada correctamente con filtros dinámicos');
        console.log('📊 Estadísticas de filtros:', {
            total: totalItems,
            stockNormal,
            stockBajo,
            stockAgotado,
            valoresUnicos: {
                categorias: valoresUnicos.categorias.length,
                tipos: valoresUnicos.tipos.length,
                marcas: valoresUnicos.marcas.length,
                ubicaciones: valoresUnicos.ubicaciones.length,
                empresas: valoresUnicos.empresas.length,
                proveedores: valoresUnicos.proveedores.length,
                nombres: valoresUnicos.nombres.length
            }
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando consumibles:', error);
        mostrarError('Error al cargar consumibles: ' + (error.message || 'Error desconocido'));
    }
}

window.cargarVistaConsumibles = cargarVistaConsumibles;

// ==================== OBTENER CONSUMIBLES FILTRADOS ====================
async function obtenerConsumiblesFiltrados() {
    try {
        // Obtener los valores actuales de los filtros
        const categoria = document.getElementById('filtroCategoria')?.value;
        const tipo = document.getElementById('filtroTipo')?.value;
        const marca = document.getElementById('filtroMarca')?.value;
        const ubicacion = document.getElementById('filtroUbicacion')?.value;
        const empresa = document.getElementById('filtroEmpresa')?.value;
        const proveedor = document.getElementById('filtroProveedor')?.value;
        const stock = document.getElementById('filtroStock')?.value;
        const nombreFiltro = document.getElementById('filtroNombre')?.value;
        const busqueda = document.getElementById('filtroBusqueda')?.value?.toLowerCase();
        
        // Obtener todos los consumibles con sus relaciones
        let query = window.supabaseClient
            .from('consumibles')
            .select(`
                *,
                categoria:consumible_categorias(id, nombre),
                tipo:consumible_tipos(id, nombre),
                marca:marca_id(id, nombre),
                proveedor:proveedor_id(id, nombre),
                empresa:empresa_id(id, nombre, ruc),
                ubicacion:ubicacion_id(id, nombre, tipo, descripcion),
                unidad:unidad_medida_id(id, nombre, nombre_plural, abreviatura, codigo)
            `);
        
        const { data: todosConsumibles, error } = await query;
        
        if (error) throw error;
        
        // Aplicar filtros en JavaScript (para respetar los mismos filtros que la vista)
        let consumiblesFiltrados = todosConsumibles;
        
        if (categoria) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.categoria_id === categoria);
        }
        
        if (tipo) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.tipo_id === tipo);
        }
        
        if (marca) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.marca_id === marca);
        }
        
        if (ubicacion) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.ubicacion_id === ubicacion);
        }
        
        if (empresa) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.empresa_id === empresa);
        }
        
        if (proveedor) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.proveedor_id === proveedor);
        }
        
        if (nombreFiltro) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => c.nombre === nombreFiltro);
        }
        
        if (busqueda) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => 
                c.nombre?.toLowerCase().includes(busqueda) || 
                c.codigo?.toLowerCase().includes(busqueda)
            );
        }
        
        if (stock) {
            consumiblesFiltrados = consumiblesFiltrados.filter(c => {
                if (stock === 'normal') return c.stock_actual > 5;
                if (stock === 'bajo') return c.stock_actual <= 5 && c.stock_actual > 0;
                if (stock === 'agotado') return c.stock_actual === 0;
                return true;
            });
        }
        
        return consumiblesFiltrados;
        
    } catch (error) {
        console.error('Error obteniendo consumibles filtrados:', error);
        return [];
    }
}

// ==================== EXPORTAR CONSUMIBLES A EXCEL ====================
window.exportarConsumiblesExcel = async function() {
    mostrarLoading('Generando archivo Excel...');
    
    try {
        // Obtener consumibles con los filtros actuales
        const consumibles = await obtenerConsumiblesFiltrados();
        
        if (!consumibles || consumibles.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay consumibles para exportar', 'info');
            return;
        }
        
        // Preparar datos para Excel
        const datos = consumibles.map(c => {
            // Obtener nombre de unidad según cantidad
            const getUnidadNombre = (unidad, cantidad) => {
                if (!unidad || !unidad.nombre) return 'unidad';
                if (Math.abs(cantidad) === 1) return unidad.nombre;
                if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') return unidad.nombre_plural;
                return `${unidad.nombre}s`;
            };
            
            return {
                'CÓDIGO': c.codigo || 'N/A',
                'NOMBRE': c.nombre || 'N/A',
                'CATEGORÍA': c.categoria?.nombre || 'N/A',
                'TIPO': c.tipo?.nombre || 'N/A',
                'MARCA': c.marca?.nombre || 'N/A',
                'MODELO': c.modelo || 'N/A',
                'STOCK ACTUAL': c.stock_actual || 0,
                'STOCK MÍNIMO': c.stock_minimo || 0,
                'STOCK MÁXIMO': c.stock_maximo || 0,
                'UNIDAD': getUnidadNombre(c.unidad, c.stock_actual),
                'UBICACIÓN': c.ubicacion?.nombre || 'N/A',
                'EMPRESA': c.empresa?.nombre || 'N/A',
                'RUC': c.empresa?.ruc || 'N/A',
                'PROVEEDOR': c.proveedor?.nombre || 'N/A',
                'DESCRIPCIÓN': c.descripcion || 'N/A',
                'ESTADO': c.activo ? 'Activo' : 'Inactivo'
            };
        });
        
        // Columnas para Excel
        const columnas = [
            'CÓDIGO', 'NOMBRE', 'CATEGORÍA', 'TIPO', 'MARCA', 'MODELO',
            'STOCK ACTUAL', 'STOCK MÍNIMO', 'STOCK MÁXIMO', 'UNIDAD',
            'UBICACIÓN', 'EMPRESA', 'RUC', 'PROVEEDOR', 'DESCRIPCIÓN', 'ESTADO'
        ];
        
        // Usar función existente de reportes.js
        if (typeof window.exportarDatosAExcel === 'function') {
            window.exportarDatosAExcel(datos, columnas, `consumibles_${new Date().toISOString().split('T')[0]}`);
        } else {
            // Fallback: usar SheetJS directamente
            const ws = XLSX.utils.json_to_sheet(datos);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Consumibles');
            XLSX.writeFile(wb, `consumibles_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} consumibles a Excel`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// ==================== EXPORTAR CONSUMIBLES A PDF ====================
window.exportarConsumiblesPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        // Obtener consumibles con los filtros actuales
        const consumibles = await obtenerConsumiblesFiltrados();
        
        if (!consumibles || consumibles.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay consumibles para exportar', 'info');
            return;
        }
        
        // Función para obtener nombre de unidad
        const getUnidadNombre = (unidad, cantidad) => {
            if (!unidad || !unidad.nombre) return 'unidad';
            if (Math.abs(cantidad) === 1) return unidad.nombre;
            if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') return unidad.nombre_plural;
            return `${unidad.nombre}s`;
        };
        
        // Generar HTML del reporte
        let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Consumibles</title>
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
                    }
                    .stat-card {
                        flex: 1;
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
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 6px;
                        text-align: left;
                    }
                    th {
                        background-color: #39080a;
                        color: white;
                        font-weight: 600;
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
                    .badge-stock {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: bold;
                    }
                    .stock-normal { background: #d1fae5; color: #065f46; }
                    .stock-bajo { background: #fed7aa; color: #9a3412; }
                    .stock-agotado { background: #fee2e2; color: #991b1b; }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="report-header">
                        <h1>REPORTE DE INVENTARIO - CONSUMIBLES</h1>
                        <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
                        <p>Usuario: ${usuarioActual?.empleados?.nombre_completo || usuarioActual?.correo || 'Sistema'}</p>
                    </div>
                    
                    <!-- Estadísticas -->
                    <div class="stats">
                        <div class="stat-card">
                            <div class="number">${consumibles.length}</div>
                            <div class="label">Total Consumibles</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${consumibles.filter(c => c.stock_actual === 0).length}</div>
                            <div class="label">Stock Agotado</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${consumibles.filter(c => c.stock_actual <= c.stock_minimo && c.stock_actual > 0).length}</div>
                            <div class="label">Stock Bajo</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">${consumibles.filter(c => c.stock_actual > c.stock_minimo).length}</div>
                            <div class="label">Stock Normal</div>
                        </div>
                    </div>
                    
                    <!-- Tabla de consumibles -->
                    <table>
                        <thead>
                            <tr>
                                <th>CÓDIGO</th>
                                <th>NOMBRE</th>
                                <th>CATEGORÍA</th>
                                <th>TIPO</th>
                                <th>MARCA</th>
                                <th>MODELO</th>
                                <th>STOCK</th>
                                <th>MÍNIMO</th>
                                <th>UNIDAD</th>
                                <th>UBICACIÓN</th>
                                <th>EMPRESA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${consumibles.map(c => {
                                const getStockClass = () => {
                                    if (c.stock_actual === 0) return 'stock-agotado';
                                    if (c.stock_actual <= c.stock_minimo) return 'stock-bajo';
                                    return 'stock-normal';
                                };
                                const getStockTexto = () => {
                                    if (c.stock_actual === 0) return 'Agotado';
                                    if (c.stock_actual <= c.stock_minimo) return 'Bajo';
                                    return 'Normal';
                                };
                                return `
                                    <tr>
                                        <td>${c.codigo || 'N/A'}</td>
                                        <td>${c.nombre || 'N/A'}</td>
                                        <td>${c.categoria?.nombre || 'N/A'}</td>
                                        <td>${c.tipo?.nombre || 'N/A'}</td>
                                        <td>${c.marca?.nombre || 'N/A'}</td>
                                        <td>${c.modelo || 'N/A'}</td>
                                        <td>
                                            <span class="badge-stock ${getStockClass()}">
                                                ${c.stock_actual}
                                            </span>
                                        </td>
                                        <td>${c.stock_minimo} ${getUnidadNombre(c.unidad, c.stock_minimo)}</td>
                                        <td>${c.unidad?.nombre || 'N/A'}${c.unidad?.abreviatura ? ` (${c.unidad.abreviatura})` : ''}</td>
                                        <td>${c.ubicacion?.nombre || 'N/A'}</td>
                                        <td>${c.empresa?.nombre || 'N/A'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Reporte generado automáticamente por el Sistema de Gestión de Activos TI - Gallos Mármol</p>
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
        mostrarAlerta('Éxito', `Se exportaron ${consumibles.length} consumibles a PDF`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a PDF:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// ==================== OBTENER VALORES ÚNICOS DE CONSUMIBLES ====================
function obtenerValoresUnicosFiltros(consumibles) {
    // Mapas para almacenar valores únicos
    const categoriasMap = new Map();
    const tiposMap = new Map();
    const marcasMap = new Map();
    const ubicacionesMap = new Map();
    const empresasMap = new Map();
    const proveedoresMap = new Map();
    const nombresMap = new Map();  // ← NUEVO: Para nombres de consumibles
    
    consumibles?.forEach(c => {
        // Categorías
        if (c.categoria_id && c.categoria) {
            categoriasMap.set(c.categoria_id, {
                id: c.categoria_id,
                nombre: c.categoria.nombre
            });
        }
        
        // Tipos
        if (c.tipo_id && c.tipo) {
            tiposMap.set(c.tipo_id, {
                id: c.tipo_id,
                nombre: c.tipo.nombre
            });
        }
        
        // Marcas
        if (c.marca_id && c.marca) {
            marcasMap.set(c.marca_id, {
                id: c.marca_id,
                nombre: c.marca.nombre
            });
        }
        
        // Ubicaciones
        if (c.ubicacion_id && c.ubicacion) {
            ubicacionesMap.set(c.ubicacion_id, {
                id: c.ubicacion_id,
                nombre: c.ubicacion.nombre,
                tipo: c.ubicacion.tipo
            });
        }
        
        // Empresas
        if (c.empresa_id && c.empresa) {
            empresasMap.set(c.empresa_id, {
                id: c.empresa_id,
                nombre: c.empresa.nombre
            });
        }
        
        // Proveedores
        if (c.proveedor_id && c.proveedor) {
            proveedoresMap.set(c.proveedor_id, {
                id: c.proveedor_id,
                nombre: c.proveedor.nombre
            });
        }
        
        // ============================================
        // NUEVO: Nombres de consumibles (sin repetir)
        // ============================================
        if (c.nombre && c.nombre.trim() !== '') {
            // Usar el nombre como clave para evitar duplicados
            nombresMap.set(c.nombre, {
                id: c.id,
                nombre: c.nombre
            });
        }
    });
    
    // Convertir mapas a arrays y ordenar alfabéticamente
    return {
        categorias: Array.from(categoriasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        tipos: Array.from(tiposMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        marcas: Array.from(marcasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        ubicaciones: Array.from(ubicacionesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        empresas: Array.from(empresasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        proveedores: Array.from(proveedoresMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
        nombres: Array.from(nombresMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))  // ← NUEVO
    };
}

// ==================== FUNCIÓN PARA CARGAR DATOS SEGÚN VISTA ====================
async function cargarDatosConsumibles(consumibles) {
    const container = document.getElementById('consumiblesContainer');
    if (!container) return;
    
    if (vistaConsumiblesActual === 'tabla') {
        container.innerHTML = generarVistaTablaConsumibles(consumibles);
    } else {
        container.innerHTML = generarVistaCardsConsumibles(consumibles);
    }
    
    // Actualizar contadores
    actualizarContadoresConsumibles(consumibles);
}

// ==================== ACTUALIZAR CONTADORES DE CONSUMIBLES ====================
function actualizarContadoresConsumibles(consumibles = null) {
    // Si no se pasa array, usar los originales
    const datos = consumibles || consumiblesOriginales;
    
    const totalItems = datos?.length || 0;
    const stockBajo = datos?.filter(c => c.stock_actual <= c.stock_minimo && c.stock_actual > 0).length || 0;
    const stockAgotado = datos?.filter(c => c.stock_actual === 0).length || 0;
    const stockNormal = totalItems - stockBajo - stockAgotado;
    
    const totalSpan = document.getElementById('totalItemsCount');
    const normalSpan = document.getElementById('stockNormalCount');
    const bajoSpan = document.getElementById('stockBajoCount');
    const agotadoSpan = document.getElementById('stockAgotadoCount');
    
    if (totalSpan) totalSpan.textContent = totalItems;
    if (normalSpan) normalSpan.textContent = stockNormal;
    if (bajoSpan) bajoSpan.textContent = stockBajo;
    if (agotadoSpan) agotadoSpan.textContent = stockAgotado;
}

// ==================== GENERAR VISTA TABLA ====================
function generarVistaTablaConsumibles(consumibles) {
    const getUnidadNombre = (unidad, cantidad) => {
        if (!unidad || !unidad.nombre) return 'unidad';
        if (Math.abs(cantidad) === 1) return unidad.nombre;
        if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') return unidad.nombre_plural;
        return `${unidad.nombre}s`;
    };
        
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${consumibles.map(c => {
                            const estadoClass = c.stock_actual === 0 ? 'bg-red-100 text-red-800' :
                                               c.stock_actual <= c.stock_minimo ? 'bg-orange-100 text-orange-800' :
                                               'bg-green-100 text-green-800';
                            const estadoTexto = c.stock_actual === 0 ? 'Agotado' :
                                               c.stock_actual <= c.stock_minimo ? 'Stock Bajo' : 'Normal';
                            const unidadStock = getUnidadNombre(c.unidad, c.stock_actual);
                            
                            return `
                                <tr class="hover:bg-gray-50 consumible-row" 
                                    data-id="${c.id}"
                                    data-categoria="${c.categoria_id || ''}"
                                    data-tipo="${c.tipo_id || ''}"
                                    data-marca="${c.marca_id || ''}"
                                    data-ubicacion="${c.ubicacion_id || ''}"
                                    data-empresa="${c.empresa_id || ''}"
                                    data-proveedor="${c.proveedor_id || ''}"
                                    data-stock="${c.stock_actual}"
                                    data-nombre="${c.nombre?.toLowerCase() || ''}"
                                    data-codigo="${c.codigo?.toLowerCase() || ''}">
                                    <td class="px-4 py-3 text-sm font-mono">${c.codigo || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${c.nombre || 'N/A'}${c.modelo ? `<span class="text-xs text-gray-400 ml-1">(${c.modelo})</span>` : ''}</td>
                                    <td class="px-4 py-3 text-sm">${c.categoria?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${c.tipo?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">${c.marca?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm font-bold ${c.stock_actual <= c.stock_minimo ? 'text-red-600' : 'text-gray-800'}">${c.stock_actual}</td>
                                    <td class="px-4 py-3 text-sm">${c.stock_minimo}</td>
                                    <td class="px-4 py-3 text-sm">${unidadStock}${c.unidad?.abreviatura ? ` (${c.unidad.abreviatura})` : ''}</td>
                                    <td class="px-4 py-3 text-sm">${c.empresa?.nombre?.substring(0, 20) || 'N/A'}${c.empresa?.nombre?.length > 20 ? '...' : ''}</td>
                                    <td class="px-4 py-3 text-sm">${c.ubicacion?.nombre ? `${c.ubicacion.nombre}` : 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm"><span class="px-2 py-1 rounded-full text-xs font-semibold ${estadoClass}">${estadoTexto}</span></td>
                                    <td class="px-4 py-3 text-sm whitespace-nowrap">
                                        <button onclick="verDetalleConsumible('${c.id}')" class="text-blue-600 hover:text-blue-800 p-1 rounded" title="Ver"><i class="fas fa-eye"></i></button>
                                        <button onclick="registrarMovimiento('${c.id}')" class="text-green-600 hover:text-green-800 p-1 rounded" title="Movimiento"><i class="fas fa-exchange-alt"></i></button>
                                        <button onclick="solicitarReposicion('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')" class="text-orange-600 hover:text-orange-800 p-1 rounded" title="Reposición"><i class="fas fa-clipboard-list"></i></button>
                                        <button onclick="editarConsumible('${c.id}')" class="text-primary hover:text-primary-dark p-1 rounded" title="Editar"><i class="fas fa-edit"></i></button>
                                        <button onclick="eliminarConsumible('${c.id}')" class="text-red-600 hover:text-red-800 p-1 rounded" title="Eliminar"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                        ${consumibles.length === 0 ? '<tr><td colspan="12" class="text-center py-8 text-gray-500">No hay consumibles registrados</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== GENERAR VISTA CARDS ====================
function generarVistaCardsConsumibles(consumibles) {
    const getUnidadNombre = (unidad, cantidad) => {
        if (!unidad || !unidad.nombre) return 'unidad';
        if (Math.abs(cantidad) === 1) return unidad.nombre;
        if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') return unidad.nombre_plural;
        return `${unidad.nombre}s`;
    };
        
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="consumiblesGrid">
            ${consumibles.map(c => {
                const estadoClass = c.stock_actual === 0 ? 'bg-red-100 text-red-800' :
                                   c.stock_actual <= c.stock_minimo ? 'bg-orange-100 text-orange-800' :
                                   'bg-green-100 text-green-800';
                const estadoTexto = c.stock_actual === 0 ? 'Agotado' :
                                   c.stock_actual <= c.stock_minimo ? 'Stock Bajo' : 'Normal';
                const unidadStock = getUnidadNombre(c.unidad, c.stock_actual);
                
                return `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all consumible-card"
                         data-id="${c.id}"
                         data-categoria="${c.categoria_id || ''}"
                         data-tipo="${c.tipo_id || ''}"
                         data-marca="${c.marca_id || ''}"
                         data-ubicacion="${c.ubicacion_id || ''}"
                         data-empresa="${c.empresa_id || ''}"
                         data-proveedor="${c.proveedor_id || ''}"
                         data-stock="${c.stock_actual}"
                         data-nombre="${c.nombre?.toLowerCase() || ''}"
                         data-codigo="${c.codigo?.toLowerCase() || ''}">
                        
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="font-bold text-primary">${c.nombre || 'N/A'}</h3>
                                    <p class="text-xs text-gray-500 font-mono">${c.codigo || 'Sin código'}</p>
                                </div>
                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${estadoClass}">${estadoTexto}</span>
                            </div>
                        </div>
                        
                        <div class="p-4 space-y-2">
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div><span class="text-gray-500">Categoría:</span> ${c.categoria?.nombre || 'N/A'}</div>
                                <div><span class="text-gray-500">Tipo:</span> ${c.tipo?.nombre || 'N/A'}</div>
                                <div><span class="text-gray-500">Marca:</span> ${c.marca?.nombre || 'N/A'}</div>
                                <div><span class="text-gray-500">Modelo:</span> ${c.modelo || 'N/A'}</div>
                            </div>
                            
                            <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                <div>
                                    <p class="text-xs text-gray-500">Stock Actual</p>
                                    <p class="text-xl font-bold ${c.stock_actual <= c.stock_minimo ? 'text-red-600' : 'text-gray-800'}">${c.stock_actual} ${unidadStock}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-gray-500">Stock Mínimo</p>
                                    <p class="text-lg font-medium text-gray-600">${c.stock_minimo} ${unidadStock}</p>
                                </div>
                            </div>
                            
                            <div class="text-xs text-gray-500 space-y-1">
                                ${c.empresa?.nombre ? `<div><i class="fas fa-building w-4"></i> ${c.empresa.nombre}</div>` : ''}
                                ${c.ubicacion?.nombre ? `<div><i class="fas fa-map-marker-alt w-4"></i>${c.ubicacion.nombre}</div>` : ''}
                                ${c.proveedor?.nombre ? `<div><i class="fas fa-truck w-4"></i> ${c.proveedor.nombre}</div>` : ''}
                            </div>
                        </div>
                        
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2">
                            <button onclick="verDetalleConsumible('${c.id}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Ver"><i class="fas fa-eye"></i></button>
                            <button onclick="registrarMovimiento('${c.id}')" class="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Movimiento"><i class="fas fa-exchange-alt"></i></button>
                            <button onclick="solicitarReposicion('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')" class="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Reposición"><i class="fas fa-clipboard-list"></i></button>
                            <button onclick="editarConsumible('${c.id}')" class="p-1.5 text-primary hover:bg-primary/10 rounded" title="Editar"><i class="fas fa-edit"></i></button>
                            <button onclick="eliminarConsumible('${c.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('')}
            ${consumibles.length === 0 ? '<div class="col-span-full text-center py-12 bg-white rounded-lg"><p class="text-gray-500">No hay consumibles registrados</p></div>' : ''}
        </div>
    `;
}

// ==================== FUNCIONES DE FILTRO ====================
let timeoutFiltro = null;

function inicializarEventosFiltros() {
    const inputs = ['filtroCategoria', 'filtroTipo', 'filtroMarca', 'filtroUbicacion', 'filtroEmpresa', 'filtroProveedor', 'filtroStock', 'filtroBusqueda'];
    
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', () => aplicarFiltrosConsumibles());
            if (id === 'filtroBusqueda') {
                elemento.addEventListener('input', () => {
                    if (timeoutFiltro) clearTimeout(timeoutFiltro);
                    timeoutFiltro = setTimeout(() => aplicarFiltrosConsumibles(), 500);
                });
            }
        }
    });
}

window.aplicarFiltrosConsumibles = async function() {
    const categoria = document.getElementById('filtroCategoria')?.value;
    const tipo = document.getElementById('filtroTipo')?.value;
    const marca = document.getElementById('filtroMarca')?.value;
    const ubicacion = document.getElementById('filtroUbicacion')?.value;
    const empresa = document.getElementById('filtroEmpresa')?.value;
    const proveedor = document.getElementById('filtroProveedor')?.value;
    const stock = document.getElementById('filtroStock')?.value;
    const nombreFiltro = document.getElementById('filtroNombre')?.value;
    const busqueda = document.getElementById('filtroBusqueda')?.value?.toLowerCase();
    
    // Obtener elementos según la vista actual
    const elementos = vistaConsumiblesActual === 'tabla' 
        ? document.querySelectorAll('#consumiblesContainer .consumible-row')
        : document.querySelectorAll('#consumiblesGrid .consumible-card');
    
    let contador = 0;
    let filtrosActivos = 0;
    
    // Variables para recalcular estadísticas de los elementos visibles
    let visibleNormal = 0;
    let visibleBajo = 0;
    let visibleAgotado = 0;
    
    elementos.forEach(el => {
        let mostrar = true;
        
        // Filtro por categoría
        if (categoria && el.dataset.categoria !== categoria) mostrar = false;
        
        // Filtro por tipo
        if (mostrar && tipo && el.dataset.tipo !== tipo) mostrar = false;
        
        // Filtro por marca
        if (mostrar && marca && el.dataset.marca !== marca) mostrar = false;
        
        // Filtro por ubicación
        if (mostrar && ubicacion && el.dataset.ubicacion !== ubicacion) mostrar = false;
        
        // Filtro por empresa
        if (mostrar && empresa && el.dataset.empresa !== empresa) mostrar = false;
        
        // Filtro por proveedor
        if (mostrar && proveedor && el.dataset.proveedor !== proveedor) mostrar = false;
        
        // Filtro por nombre de consumible
        if (mostrar && nombreFiltro && el.dataset.nombre !== nombreFiltro.toLowerCase()) mostrar = false;
        
        // Filtro por stock
        if (mostrar && stock) {
            const stockActual = parseInt(el.dataset.stock);
            if (stock === 'normal' && stockActual > 5) mostrar = true;
            else if (stock === 'bajo' && stockActual <= 5 && stockActual > 0) mostrar = true;
            else if (stock === 'agotado' && stockActual === 0) mostrar = true;
            else if (stock !== 'normal' && stock !== 'bajo' && stock !== 'agotado') mostrar = true;
            else mostrar = false;
        }
        
        // Filtro por búsqueda
        if (mostrar && busqueda) {
            const nombre = el.dataset.nombre || '';
            const codigo = el.dataset.codigo || '';
            if (!nombre.includes(busqueda) && !codigo.includes(busqueda)) mostrar = false;
        }
        
        // Aplicar resultado del filtro
        if (mostrar) {
            el.style.display = '';
            contador++;
            
            // Calcular estadísticas de elementos visibles según stock
            const stockActual = parseInt(el.dataset.stock);
            if (stockActual > 5) {
                visibleNormal++;
            } else if (stockActual > 0) {
                visibleBajo++;
            } else if (stockActual === 0) {
                visibleAgotado++;
            }
        } else {
            el.style.display = 'none';
        }
    });
    
    // Contar filtros activos para el badge
    if (categoria) filtrosActivos++;
    if (tipo) filtrosActivos++;
    if (marca) filtrosActivos++;
    if (ubicacion) filtrosActivos++;
    if (empresa) filtrosActivos++;
    if (proveedor) filtrosActivos++;
    if (stock) filtrosActivos++;
    if (nombreFiltro) filtrosActivos++;
    if (busqueda) filtrosActivos++;
    
    // Actualizar badge de filtros activos
    const badge = document.getElementById('filtrosActivosBadge');
    if (badge) {
        if (filtrosActivos > 0) {
            badge.textContent = filtrosActivos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    // ============================================
    // ACTUALIZAR CONTADORES CON LOS ELEMENTOS VISIBLES
    // ============================================
    const totalSpan = document.getElementById('totalItemsCount');
    const normalSpan = document.getElementById('stockNormalCount');
    const bajoSpan = document.getElementById('stockBajoCount');
    const agotadoSpan = document.getElementById('stockAgotadoCount');
    
    if (totalSpan) totalSpan.textContent = contador;
    if (normalSpan) normalSpan.textContent = visibleNormal;
    if (bajoSpan) bajoSpan.textContent = visibleBajo;
    if (agotadoSpan) agotadoSpan.textContent = visibleAgotado;
    
    // Mostrar mensaje si no hay resultados
    const grid = document.getElementById('consumiblesContainer');
    let mensajeVacio = document.getElementById('filtro-consumibles-vacio');
    
    if (contador === 0) {
        if (!mensajeVacio && grid) {
            mensajeVacio = document.createElement('div');
            mensajeVacio.id = 'filtro-consumibles-vacio';
            mensajeVacio.className = 'col-span-full text-center py-12 bg-white rounded-lg mt-4';
            mensajeVacio.innerHTML = `
                <div class="flex flex-col items-center justify-center">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-filter text-3xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-lg">No hay consumibles que coincidan con los filtros</p>
                    <p class="text-gray-400 text-sm mt-2">Intenta con otros criterios de búsqueda</p>
                    <button onclick="limpiarFiltrosConsumibles()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                        <i class="fas fa-undo-alt mr-2"></i>Limpiar filtros
                    </button>
                </div>
            `;
            grid.appendChild(mensajeVacio);
        }
    } else if (mensajeVacio) {
        mensajeVacio.remove();
    }
};

function actualizarContadoresFiltros(mostrados) {
    const totalSpan = document.getElementById('totalItemsCount');
    if (totalSpan) totalSpan.textContent = mostrados;
    
    // Actualizar contadores de stock
    const cards = document.querySelectorAll(vistaConsumiblesActual === 'tabla' ? '.consumible-row' : '.consumible-card');
    let normal = 0, bajo = 0, agotado = 0;
    
    cards.forEach(card => {
        if (card.style.display !== 'none') {
            const stock = parseInt(card.dataset.stock);
            if (stock > 5) normal++;
            else if (stock > 0) bajo++;
            else if (stock === 0) agotado++;
        }
    });
    
    const normalSpan = document.getElementById('stockNormalCount');
    const bajoSpan = document.getElementById('stockBajoCount');
    const agotadoSpan = document.getElementById('stockAgotadoCount');
    
    if (normalSpan) normalSpan.textContent = normal;
    if (bajoSpan) bajoSpan.textContent = bajo;
    if (agotadoSpan) agotadoSpan.textContent = agotado;
}

window.limpiarFiltrosConsumibles = function() {
    const filtros = [
        'filtroCategoria', 
        'filtroTipo', 
        'filtroMarca', 
        'filtroUbicacion', 
        'filtroEmpresa', 
        'filtroProveedor', 
        'filtroStock', 
        'filtroNombre',
        'filtroBusqueda'
    ];
    
    // Limpiar todos los campos de filtro
    filtros.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Obtener todos los elementos y mostrarlos TODOS
    const elementos = vistaConsumiblesActual === 'tabla' 
        ? document.querySelectorAll('#consumiblesContainer .consumible-row')
        : document.querySelectorAll('#consumiblesGrid .consumible-card');
    
    elementos.forEach(el => {
        el.style.display = '';
    });
    
    // ============================================
    // CORRECCIÓN: RESTAURAR CONTADORES CON DATOS ORIGINALES
    // ============================================
    // Calcular estadísticas con TODOS los consumibles originales
    const totalItems = consumiblesOriginales?.length || 0;
    const stockBajo = consumiblesOriginales?.filter(c => c.stock_actual <= c.stock_minimo && c.stock_actual > 0).length || 0;
    const stockAgotado = consumiblesOriginales?.filter(c => c.stock_actual === 0).length || 0;
    const stockNormal = totalItems - stockBajo - stockAgotado;
    
    // Actualizar los spans de los KPIs
    const totalSpan = document.getElementById('totalItemsCount');
    const normalSpan = document.getElementById('stockNormalCount');
    const bajoSpan = document.getElementById('stockBajoCount');
    const agotadoSpan = document.getElementById('stockAgotadoCount');
    
    if (totalSpan) totalSpan.textContent = totalItems;
    if (normalSpan) normalSpan.textContent = stockNormal;
    if (bajoSpan) bajoSpan.textContent = stockBajo;
    if (agotadoSpan) agotadoSpan.textContent = stockAgotado;
    
    // Ocultar badge de filtros activos
    const badge = document.getElementById('filtrosActivosBadge');
    if (badge) badge.classList.add('hidden');
    
    // Eliminar mensaje de "sin resultados" si existe
    const mensajeVacio = document.getElementById('filtro-consumibles-vacio');
    if (mensajeVacio) mensajeVacio.remove();
};

window.toggleVistaConsumibles = async function(vista) {
    vistaConsumiblesActual = vista;
    await cargarVistaConsumibles();
};

function toggleFiltrosConsumibles() {
    const panel = document.getElementById('panelFiltrosConsumibles');
    const icon = document.getElementById('filtrosConsumiblesIcon');
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        panel.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

// ==================== FUNCIÓN PARA OBTENER NOMBRE DE UNIDAD SEGÚN CANTIDAD ====================
function obtenerNombreUnidad(unidad, cantidad) {
    if (!unidad || !unidad.nombre) {
        return 'unidad';
    }
    
    // Si es 1 o -1, usar singular
    if (Math.abs(cantidad) === 1) {
        return unidad.nombre;
    }
    
    // Si es plural y existe nombre_plural, usarlo
    if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') {
        return unidad.nombre_plural;
    }
    
    // Si no hay plural definido, agregar 's' al singular
    return `${unidad.nombre}s`;
}

// Función para registrar movimiento (entrada/salida)
window.registrarMovimiento = async function(consumibleId) {
    try {
        // Obtener información del consumible (actualizado para usar unidad_medida_id)
        const { data: consumible, error: errorConsumible } = await window.supabaseClient
            .from('consumibles')
            .select(`
                id,
                nombre, 
                stock_actual, 
                stock_minimo,
                unidad_medida_id,
                unidad_medida:unidad_medida_id (id, nombre, nombre_plural, abreviatura, codigo)
            `)
            .eq('id', consumibleId)
            .single();
        
        if (errorConsumible) throw errorConsumible;
        
        // Obtener nombre de la unidad de medida
        const unidadNombre = consumible.unidad_medida?.nombre || 'unidad';
        const unidadPlural = consumible.unidad_medida?.nombre_plural || `${unidadNombre}s`;
        
        const { value: formValues } = await Swal.fire({
            title: 'Registrar Movimiento',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>Consumible:</strong> ${consumible?.nombre}</p>
                        <p><strong>Stock actual:</strong> ${consumible?.stock_actual} ${consumible?.stock_actual === 1 ? unidadNombre : unidadPlural}</p>
                        <p><strong>Stock mínimo:</strong> ${consumible?.stock_minimo} ${consumible?.stock_minimo === 1 ? unidadNombre : unidadPlural}</p>
                    </div>
                    <div>
                        <label class="form-label font-medium">Tipo de movimiento</label>
                        <select id="tipoMovimiento" class="form-input w-full">
                            <option value="ENTRADA">📥 Entrada (compra, devolución)</option>
                            <option value="SALIDA">📤 Salida (uso, entrega)</option>
                            <option value="AJUSTE">⚙️ Ajuste de inventario</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label font-medium">Cantidad</label>
                        <input type="number" id="cantidad" class="form-input w-full" min="1" required>
                    </div>
                    <div>
                        <label class="form-label font-medium">Motivo</label>
                        <select id="motivo" class="form-input w-full">
                            <option value="COMPRA">Compra</option>
                            <option value="USO">Uso interno</option>
                            <option value="ENTREGA">Entrega a empleado</option>
                            <option value="DEVOLUCION">Devolución</option>
                            <option value="MANTENIMIENTO">Mantenimiento</option>
                            <option value="VENCIMIENTO">Vencimiento</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label font-medium">Observación</label>
                        <textarea id="observacion" class="form-input w-full" rows="2" placeholder="Detalle del movimiento..."></textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: 'Registrar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const cantidad = parseInt(document.getElementById('cantidad').value);
                const tipo = document.getElementById('tipoMovimiento').value;
                
                if (!cantidad || cantidad <= 0) {
                    Swal.showValidationMessage('Ingrese una cantidad válida');
                    return false;
                }
                
                // Validar que no se pueda sacar más stock del disponible
                if (tipo !== 'ENTRADA' && cantidad > consumible.stock_actual) {
                    Swal.showValidationMessage(`No hay suficiente stock. Stock actual: ${consumible.stock_actual} ${consumible.stock_actual === 1 ? unidadNombre : unidadPlural}`);
                    return false;
                }
                
                return {
                    tipo: tipo,
                    cantidad: cantidad,
                    motivo: document.getElementById('motivo').value,
                    observacion: document.getElementById('observacion').value || null
                };
            }
        });
        
        if (formValues) {
            mostrarLoading('Registrando movimiento...');
            
            try {
                const fechaLocal = getFechaLocalForDB();
                const incremento = formValues.tipo === 'ENTRADA' ? formValues.cantidad : -formValues.cantidad;
                
                // 1. Registrar el movimiento en la tabla de movimientos
                const { error: movError } = await window.supabaseClient
                    .from('consumible_movimientos')
                    .insert({
                        consumible_id: consumibleId,
                        tipo: formValues.tipo,
                        cantidad: formValues.cantidad,
                        motivo: formValues.motivo,
                        observacion: formValues.observacion,
                        usuario_id: usuarioActual.id,
                        fecha_movimiento: fechaLocal
                    });
                
                if (movError) throw movError;
                
                // 2. Actualizar el stock del consumible
                const nuevoStock = consumible.stock_actual + incremento;
                
                const { error: updateError } = await window.supabaseClient
                    .from('consumibles')
                    .update({ 
                        stock_actual: nuevoStock,
                        modificado_el: fechaLocal
                    })
                    .eq('id', consumibleId);
                
                if (updateError) throw updateError;
                
                ocultarLoading();
                
                // Mensaje de éxito con resumen
                const tipoTexto = formValues.tipo === 'ENTRADA' ? 'entrada' : formValues.tipo === 'SALIDA' ? 'salida' : 'ajuste';
                const signo = formValues.tipo === 'ENTRADA' ? '+' : '-';
                const unidadStock = nuevoStock === 1 ? unidadNombre : unidadPlural;
                
                await Swal.fire({
                    title: '✅ Movimiento registrado',
                    html: `
                        <div class="text-left space-y-2">
                            <p><strong>Consumible:</strong> ${consumible.nombre}</p>
                            <p><strong>Tipo:</strong> ${tipoTexto.toUpperCase()}</p>
                            <p><strong>Cantidad:</strong> ${signo}${formValues.cantidad} ${formValues.cantidad === 1 ? unidadNombre : unidadPlural}</p>
                            <p><strong>Stock anterior:</strong> ${consumible.stock_actual} ${consumible.stock_actual === 1 ? unidadNombre : unidadPlural}</p>
                            <p><strong>Stock actual:</strong> ${nuevoStock} ${unidadStock}</p>
                            ${formValues.observacion ? `<p><strong>Observación:</strong> ${formValues.observacion}</p>` : ''}
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonColor: '#28a745',
                    confirmButtonText: 'Aceptar',
                    timer: 3000
                });
                
                // Recargar la vista de consumibles
                await cargarVistaConsumibles();
                
            } catch (error) {
                ocultarLoading();
                console.error('Error al registrar movimiento:', error);
                
                let mensajeError = 'No se pudo registrar el movimiento';
                if (error.message?.includes('duplicate')) {
                    mensajeError = 'Ya existe un registro con estos datos';
                } else if (error.message) {
                    mensajeError = error.message;
                }
                
                mostrarAlerta('Error', mensajeError, 'error');
            }
        }
        
    } catch (error) {
        console.error('Error al preparar movimiento:', error);
        mostrarAlerta('Error', 'No se pudo preparar el formulario de movimiento: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== SOLICITAR REPOSICIÓN ====================
window.solicitarReposicion = async function(consumibleId, consumibleNombre) {
    console.log('📝 Solicitando reposición para:', consumibleNombre);
    
    try {
        // Verificar si ya existe una solicitud pendiente para este consumible
        const { data: solicitudExistente, error: errorCheck } = await window.supabaseClient
            .from('solicitudes')
            .select('id, estado')
            .eq('consumible_id', consumibleId)
            .eq('estado', 'PENDIENTE')
            .maybeSingle();
        
        if (solicitudExistente) {
            mostrarAlerta('Aviso', `Ya existe una solicitud pendiente para "${consumibleNombre}". Espere a que sea procesada.`, 'info');
            return;
        }
        
        // Obtener datos del consumible
        const { data: consumible, error: errorConsumible } = await window.supabaseClient
            .from('consumibles')
            .select(`
                id,
                nombre,
                stock_actual,
                stock_minimo,
                unidad_medida_id,
                unidad:unidad_medida_id (nombre, nombre_plural)
            `)
            .eq('id', consumibleId)
            .single();
        
        if (errorConsumible) throw errorConsumible;
        
        // Calcular cantidad sugerida (stock_maximo - stock_actual)
        const cantidadSugerida = Math.max(consumible.stock_minimo * 2, 5);
        
        // Obtener unidad de medida
        const unidadNombre = consumible.unidad?.nombre || 'unidad';
        const unidadPlural = consumible.unidad?.nombre_plural || `${unidadNombre}s`;
        
        const { value: formValues } = await Swal.fire({
            title: 'Solicitar Reposición',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>Consumible:</strong> ${consumible.nombre}</p>
                        <p><strong>Stock actual:</strong> ${consumible.stock_actual} ${consumible.stock_actual === 1 ? unidadNombre : unidadPlural}</p>
                        <p><strong>Stock mínimo:</strong> ${consumible.stock_minimo} ${consumible.stock_minimo === 1 ? unidadNombre : unidadPlural}</p>
                    </div>
                    <div>
                        <label class="form-label font-medium">Cantidad a solicitar</label>
                        <input type="number" id="cantidad" class="form-input w-full" min="1" value="${cantidadSugerida}" required>
                    </div>
                    <div>
                        <label class="form-label font-medium">Justificación</label>
                        <textarea id="justificacion" class="form-input w-full" rows="3" placeholder="¿Por qué necesita este pedido?"></textarea>
                    </div>
                    <div>
                        <label class="form-label font-medium">Urgencia</label>
                        <select id="urgencia" class="form-input w-full">
                            <option value="BAJA">🟢 Baja - Puede esperar</option>
                            <option value="MEDIA" selected>🟡 Media - Necesario próximamente</option>
                            <option value="ALTA">🟠 Alta - Necesario pronto</option>
                            <option value="URGENTE">🔴 Urgente - Stock agotado o crítico</option>
                        </select>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'Enviar Solicitud',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const cantidad = parseInt(document.getElementById('cantidad').value);
                if (!cantidad || cantidad <= 0) {
                    Swal.showValidationMessage('Ingrese una cantidad válida');
                    return false;
                }
                return {
                    cantidad: cantidad,
                    justificacion: document.getElementById('justificacion').value || 'Reposición de stock',
                    urgencia: document.getElementById('urgencia').value
                };
            }
        });
        
        if (formValues) {
            mostrarLoading('Enviando solicitud...');
            
            // Generar número de solicitud
            const { data: ultimaSolicitud } = await window.supabaseClient
                .from('solicitudes')
                .select('numero')
                .order('creado_el', { ascending: false })
                .limit(1);
            
            let nuevoNumero = 'SOL-0001';
            if (ultimaSolicitud && ultimaSolicitud.length > 0 && ultimaSolicitud[0].numero) {
                const num = parseInt(ultimaSolicitud[0].numero.split('-')[1]) + 1;
                nuevoNumero = `SOL-${num.toString().padStart(4, '0')}`;
            }
            
            const fechaLocal = getFechaLocalForDB();
            
            const data = {
                numero: nuevoNumero,
                titulo: `Reposición: ${consumible.nombre}`,
                descripcion: formValues.justificacion,
                categoria_id: null, // Se puede agregar una categoría por defecto para reposiciones
                consumible_id: consumibleId,
                cantidad_solicitada: formValues.cantidad,
                urgencia: formValues.urgencia,
                justificacion: formValues.justificacion,
                estado: 'PENDIENTE',
                solicitante_id: usuarioActual.id,
                fecha_requerida: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                creado_el: fechaLocal
            };
            
            const { error } = await window.supabaseClient
                .from('solicitudes')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            
            await Swal.fire({
                title: '✅ Solicitud enviada',
                html: `
                    <div class="text-left space-y-2">
                        <p><strong>N° Solicitud:</strong> ${nuevoNumero}</p>
                        <p><strong>Consumible:</strong> ${consumible.nombre}</p>
                        <p><strong>Cantidad:</strong> ${formValues.cantidad} ${formValues.cantidad === 1 ? unidadNombre : unidadPlural}</p>
                        <p><strong>Urgencia:</strong> ${formValues.urgencia}</p>
                        <p class="text-sm text-gray-500 mt-2">La solicitud ha sido enviada al área de compras para su revisión.</p>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#28a745',
                confirmButtonText: 'Entendido'
            });
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('Error al crear solicitud de reposición:', error);
        mostrarAlerta('Error', 'No se pudo crear la solicitud de reposición', 'error');
    }
};

// ==================== FUNCIONES ADICIONALES PARA CONSUMIBLES ====================

// ==================== ABRIR MODAL NUEVO CONSUMIBLE ====================
window.abrirModalNuevoConsumible = async function() {
    const modal = document.getElementById('consumibleModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('consumibleModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    editandoId = null;
    const form = document.getElementById('consumibleForm');
    if (form) form.reset();
    
    // Título del modal
    const titleElement = document.getElementById('consumibleModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Consumible';
    
    // Verificar cada elemento antes de asignar valor
    const stockActual = document.getElementById('consumible_stock_actual');
    if (stockActual) stockActual.value = '0';
    
    const stockMinimo = document.getElementById('consumible_stock_minimo');
    if (stockMinimo) stockMinimo.value = '5';
    
    const stockMaximo = document.getElementById('consumible_stock_maximo');
    if (stockMaximo) stockMaximo.value = '50';
    
    // NOTA: Cambiar de 'consumible_unidad_medida' (texto) a 'consumible_unidad_medida_id' (select)
    const unidadMedidaSelect = document.getElementById('consumible_unidad_medida_id');
    if (unidadMedidaSelect) unidadMedidaSelect.value = '';
    
    const codigo = document.getElementById('consumible_codigo');
    if (codigo) codigo.value = '';
    
    // Limpiar y deshabilitar selects dependientes
    const tipoSelect = document.getElementById('consumible_tipo_id');
    if (tipoSelect) {
        tipoSelect.innerHTML = '<option value="">Primero seleccione una categoría</option>';
        tipoSelect.disabled = true;
    }
    
    const ubicacionSelect = document.getElementById('consumible_ubicacion_id');
    if (ubicacionSelect) {
        ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
        ubicacionSelect.disabled = true;
    }
    
    // Cargar selects usando funciones GLOBALES de utils.js
    try {
        // 1. Cargar categorías de consumibles (función local)
        await cargarCategoriasConsumibleSelect();
        
        // 2. Cargar marcas (función GLOBAL de utils.js)
        const marcaSelect = document.getElementById('consumible_marca_id');
        if (marcaSelect) await window.cargarMarcasSelect('consumible_marca_id');
        
        // 3. Cargar empresas (función GLOBAL de utils.js)
        const empresaSelect = document.getElementById('consumible_empresa_id');
        if (empresaSelect) await window.cargarEmpresasSelect('consumible_empresa_id');
        
        // 4. Cargar proveedores (función local - si está en consumibles.js)
        const proveedorSelect = document.getElementById('consumible_proveedor_id');
        if (proveedorSelect) await cargarProveedoresSelect();
        
        // 5. Cargar unidades de medida (función local - si está en consumibles.js)
        const unidadSelect = document.getElementById('consumible_unidad_medida_id');
        if (unidadSelect) await cargarUnidadesMedidaSelect();
        
        console.log('✅ Todos los selects cargados correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando selects:', error);
        mostrarAlerta('Error', 'No se pudieron cargar algunos datos', 'error');
    }
    
    await window.abrirModal('consumibleModal');
};

window.editarConsumible = async function(id) {
    mostrarLoading('Cargando consumible...');
    
    try {
        // Obtener datos del consumible
        const { data: consumible, error } = await window.supabaseClient
            .from('consumibles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Guardar el ID para edición
        editandoId = id;
        
        // Cambiar título del modal
        document.getElementById('consumibleModalTitle').innerText = 'Editar Consumible';
        
        // ============================================
        // PASO 1: Limpiar y preparar selects
        // ============================================
        
        // Deshabilitar selects dependientes mientras se cargan
        const tipoSelect = document.getElementById('consumible_tipo_id');
        const ubicacionSelect = document.getElementById('consumible_ubicacion_id');
        
        if (tipoSelect) {
            tipoSelect.innerHTML = '<option value="">Cargando tipos...</option>';
            tipoSelect.disabled = true;
        }
        
        if (ubicacionSelect) {
            ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
            ubicacionSelect.disabled = true;
        }
        
        // ============================================
        // PASO 2: Cargar todos los selects en paralelo
        // ============================================
        
        await Promise.all([
            cargarCategoriasConsumibleSelect(),
            cargarMarcasSelect('consumible_marca_id'),
            cargarEmpresasSelect('consumible_empresa_id'),
            cargarProveedoresSelect(),
            cargarUnidadesMedidaSelect()
        ]);
        
        // ============================================
        // PASO 3: Llenar campos básicos (los que no dependen de otros selects)
        // ============================================
        
        document.getElementById('consumible_codigo').value = consumible.codigo || '';
        document.getElementById('consumible_nombre').value = consumible.nombre || '';
        document.getElementById('consumible_descripcion').value = consumible.descripcion || '';
        document.getElementById('consumible_modelo').value = consumible.modelo || '';
        document.getElementById('consumible_stock_actual').value = consumible.stock_actual || 0;
        document.getElementById('consumible_stock_minimo').value = consumible.stock_minimo || 5;
        document.getElementById('consumible_stock_maximo').value = consumible.stock_maximo || 50;
        
        // ============================================
        // PASO 4: Establecer valores de selects independientes
        // ============================================
        
        // Categoría
        const categoriaSelect = document.getElementById('consumible_categoria_id');
        if (categoriaSelect && consumible.categoria_id) {
            categoriaSelect.value = consumible.categoria_id;
            // Forzar el cambio para cargar tipos
            await cargarTiposPorCategoria();
        }
        
        // Unidad de medida
        const unidadSelect = document.getElementById('consumible_unidad_medida_id');
        if (unidadSelect && consumible.unidad_medida_id) {
            unidadSelect.value = consumible.unidad_medida_id;
        }
        
        // Marca
        const marcaSelect = document.getElementById('consumible_marca_id');
        if (marcaSelect && consumible.marca_id) {
            marcaSelect.value = consumible.marca_id;
        }
        
        // Proveedor
        const proveedorSelect = document.getElementById('consumible_proveedor_id');
        if (proveedorSelect && consumible.proveedor_id) {
            proveedorSelect.value = consumible.proveedor_id;
        }
        
        // ============================================
        // PASO 5: Establecer empresa y luego ubicación (con espera)
        // ============================================
        
        const empresaSelect = document.getElementById('consumible_empresa_id');
        
        if (empresaSelect && consumible.empresa_id) {
            // Establecer la empresa
            empresaSelect.value = consumible.empresa_id;
            
            // IMPORTANTE: Forzar el evento change para cargar ubicaciones
            const changeEvent = new Event('change');
            empresaSelect.dispatchEvent(changeEvent);
            
            // Esperar a que se carguen las ubicaciones (máximo 2 segundos)
            let ubicacionesCargadas = false;
            let intentos = 0;
            const maxIntentos = 20; // 20 * 100ms = 2 segundos
            
            const esperarUbicaciones = setInterval(() => {
                intentos++;
                const ubicacionSelectLocal = document.getElementById('consumible_ubicacion_id');
                
                // Verificar si ya se cargaron las ubicaciones
                if (ubicacionSelectLocal && ubicacionSelectLocal.options.length > 1) {
                    ubicacionesCargadas = true;
                    clearInterval(esperarUbicaciones);
                    
                    // Ahora establecer la ubicación
                    if (consumible.ubicacion_id) {
                        ubicacionSelectLocal.value = consumible.ubicacion_id;
                    }
                    ubicacionSelectLocal.disabled = false;
                } else if (intentos >= maxIntentos) {
                    clearInterval(esperarUbicaciones);
                    console.warn('Timeout esperando ubicaciones');
                    
                    if (ubicacionSelectLocal && consumible.ubicacion_id) {
                        // Intentar establecer el valor directamente
                        for (let i = 0; i < ubicacionSelectLocal.options.length; i++) {
                            if (ubicacionSelectLocal.options[i].value == consumible.ubicacion_id) {
                                ubicacionSelectLocal.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }
            }, 100);
        }
        
        // ============================================
        // PASO 6: Establecer tipo (depende de categoría)
        // ============================================
        
        // Esperar a que se carguen los tipos
        let tiposCargados = false;
        let intentosTipos = 0;
        const maxIntentosTipos = 20;
        
        const esperarTipos = setInterval(() => {
            intentosTipos++;
            const tipoSelectLocal = document.getElementById('consumible_tipo_id');
            
            if (tipoSelectLocal && tipoSelectLocal.options.length > 1 && !tipoSelectLocal.disabled) {
                tiposCargados = true;
                clearInterval(esperarTipos);
                
                if (consumible.tipo_id) {
                    // Verificar si el tipo existe en las opciones
                    let tipoExiste = false;
                    for (let i = 0; i < tipoSelectLocal.options.length; i++) {
                        if (tipoSelectLocal.options[i].value == consumible.tipo_id) {
                            tipoSelectLocal.selectedIndex = i;
                            tipoExiste = true;
                            break;
                        }
                    }
                    
                    if (!tipoExiste) {
                        console.warn(`Tipo ${consumible.tipo_id} no encontrado en las opciones`);
                    }
                }
            } else if (intentosTipos >= maxIntentosTipos) {
                clearInterval(esperarTipos);
                console.warn('Timeout esperando tipos');
            }
        }, 100);
        
        ocultarLoading();
        
        // Abrir el modal
        await window.abrirModal('consumibleModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error al editar consumible:', error);
        mostrarAlerta('Error', 'No se pudo cargar el consumible: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Eliminar consumible
window.eliminarConsumible = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar consumible?',
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
                .from('consumibles')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Consumible eliminado correctamente', 'success');
            await cargarVistaConsumibles();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el consumible', 'error');
        }
    }
};

// Ver detalle consumible
// ==================== VER DETALLE CONSUMIBLE ====================
window.verDetalleConsumible = async function(id) {
    mostrarLoading('Cargando detalles...');
    
    try {
        // Obtener datos del consumible con todas las relaciones
        const { data: consumible, error } = await window.supabaseClient
            .from('consumibles')
            .select(`
                *,
                categoria:consumible_categorias(id, nombre),
                tipo:consumible_tipos(id, nombre),
                marca:marca_id(id, nombre),
                proveedor:proveedor_id(id, nombre),
                empresa:empresa_id(id, nombre, ruc),
                ubicacion:ubicacion_id(id, nombre, tipo, descripcion),
                unidad:unidad_medida_id(id, nombre, nombre_plural, abreviatura, codigo)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Obtener movimientos recientes
        const { data: movimientos } = await window.supabaseClient
            .from('consumible_movimientos')
            .select(`
                *,
                usuario:usuario_id(id, correo)
            `)
            .eq('consumible_id', id)
            .order('fecha_movimiento', { ascending: false })
            .limit(10);
        
        ocultarLoading();
        
        // Función para obtener nombre de unidad según cantidad
        const getUnidadNombre = (unidad, cantidad) => {
            if (!unidad || !unidad.nombre) return 'unidad';
            if (Math.abs(cantidad) === 1) return unidad.nombre;
            if (unidad.nombre_plural && unidad.nombre_plural.trim() !== '') return unidad.nombre_plural;
            return `${unidad.nombre}s`;
        };
        
        // Preparar datos para mostrar
        const unidadStock = getUnidadNombre(consumible.unidad, consumible.stock_actual);
        const unidadMinimo = getUnidadNombre(consumible.unidad, consumible.stock_minimo);
        
        // Generar HTML de movimientos
        let movimientosHtml = '';
        if (movimientos && movimientos.length > 0) {
            movimientosHtml = movimientos.map(m => {
                const signo = m.tipo === 'ENTRADA' ? '+' : '-';
                const color = m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600';
                const unidadMov = getUnidadNombre(consumible.unidad, m.cantidad);
                return `
                    <div class="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="font-bold ${color}">${signo}${m.cantidad} ${unidadMov}</span>
                            <span class="text-gray-600">${m.motivo || 'N/A'}</span>
                        </div>
                        <div class="text-xs text-gray-400">${new Date(m.fecha_movimiento).toLocaleString()}</div>
                    </div>
                `;
            }).join('');
        } else {
            movimientosHtml = '<p class="text-gray-400 text-center py-4">No hay movimientos registrados</p>';
        }
               
        Swal.fire({
            title: `<span class="text-primary">${consumible.nombre}</span>`,
            width: '650px',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <!-- Información general -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div><span class="font-semibold">Código:</span> ${consumible.codigo || 'N/A'}</div>
                            <div><span class="font-semibold">Categoría:</span> ${consumible.categoria?.nombre || 'N/A'}</div>
                            <div><span class="font-semibold">Tipo:</span> ${consumible.tipo?.nombre || 'N/A'}</div>
                            <div><span class="font-semibold">Marca:</span> ${consumible.marca?.nombre || 'N/A'}</div>
                            <div><span class="font-semibold">Modelo:</span> ${consumible.modelo || 'N/A'}</div>
                            <div><span class="font-semibold">Unidad:</span> ${consumible.unidad?.nombre || 'Unidad'} ${consumible.unidad?.abreviatura ? `(${consumible.unidad.abreviatura})` : ''}</div>
                        </div>
                    </div>
                    
                    <!-- Stock -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-blue-50 p-3 rounded-lg text-center">
                            <p class="text-xs text-gray-500">Stock Actual</p>
                            <p class="text-2xl font-bold text-blue-600">${consumible.stock_actual} ${unidadStock}</p>
                        </div>
                        <div class="bg-orange-50 p-3 rounded-lg text-center">
                            <p class="text-xs text-gray-500">Stock Mínimo</p>
                            <p class="text-2xl font-bold text-orange-600">${consumible.stock_minimo} ${unidadMinimo}</p>
                        </div>
                    </div>
                    
                    <!-- Empresa y Ubicación (solo si tienen datos) -->
                    ${(consumible.empresa?.nombre || consumible.ubicacion?.nombre) ? `
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                ${consumible.empresa?.nombre ? `<div><span class="font-semibold">Empresa:</span> ${consumible.empresa.nombre}</div>` : ''}
                                ${consumible.ubicacion?.nombre ? `<div><span class="font-semibold">Ubicación:</span> ${consumible.ubicacion.nombre}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Descripción -->
                    ${consumible.descripcion ? `
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <p class="text-sm text-gray-700">${consumible.descripcion}</p>
                        </div>
                    ` : ''}
                    
                    <!-- Movimientos -->
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <i class="fas fa-history"></i> Últimos movimientos
                        </h4>
                        <div class="bg-gray-50 rounded-lg p-2 max-h-48 overflow-y-auto">
                            ${movimientosHtml}
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
        console.error('Error al cargar detalles:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles: ' + (error.message || 'Error desconocido'), 'error');
    }
};

window.guardarConsumible = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando consumible...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const ahora = getFechaLocalForDB();
        
        const data = {
            nombre: document.getElementById('consumible_nombre').value,
            categoria_id: document.getElementById('consumible_categoria_id').value || null,
            tipo_id: document.getElementById('consumible_tipo_id').value || null,
            descripcion: document.getElementById('consumible_descripcion').value || null,
            marca_id: document.getElementById('consumible_marca_id').value || null,
            modelo: document.getElementById('consumible_modelo').value || null,
            stock_actual: parseInt(document.getElementById('consumible_stock_actual').value) || 0,
            stock_minimo: parseInt(document.getElementById('consumible_stock_minimo').value) || 5,
            stock_maximo: parseInt(document.getElementById('consumible_stock_maximo').value) || 50,
            unidad_medida_id: document.getElementById('consumible_unidad_medida_id').value || null,
            empresa_id: document.getElementById('consumible_empresa_id').value || null,
            ubicacion_id: document.getElementById('consumible_ubicacion_id').value || null,
            proveedor_id: document.getElementById('consumible_proveedor_id').value || null,
            activo: true
        };
        
        if (!data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            return;
        }
        
        if (!data.categoria_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una categoría', 'error');
            return;
        }
        
        if (!data.unidad_medida_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una unidad de medida', 'error');
            return;
        }
        
        if (editandoId) {
            // Actualizar
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('consumibles')
                .update(data)
                .eq('id', editandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Consumible actualizado correctamente', 'success');
        } else {
            // Crear nuevo - generar código automático
            const { data: ultimo } = await window.supabaseClient
                .from('consumibles')
                .select('codigo')
                .order('creado_el', { ascending: false })
                .limit(1);
            
            let nuevoCodigo = 'CNS-0001';
            if (ultimo && ultimo.length > 0 && ultimo[0].codigo) {
                const num = parseInt(ultimo[0].codigo.split('-')[1]) + 1;
                nuevoCodigo = `CNS-${num.toString().padStart(4, '0')}`;
            }
            data.codigo = nuevoCodigo;
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('consumibles')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Consumible creado correctamente', 'success');
        }
        
        cerrarModal('consumibleModal');
        await cargarVistaConsumibles();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el consumible: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Cargar movimientos de consumibles
window.cargarVistaMovimientosConsumibles = async function() {
    mostrarLoading('Cargando movimientos...');
    
    try {
        const { data: movimientos, error } = await window.supabaseClient
            .from('consumible_movimientos')
            .select(`
                *,
                consumible:consumibles(id, nombre, codigo),
                usuario:usuario_id(id, correo)
            `)
            .order('fecha_movimiento', { ascending: false });
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                    <i class="fas fa-history"></i> Movimientos de Consumibles
                </h1>
                <p class="text-gray-500 text-sm mt-1">Historial de entradas, salidas y ajustes</p>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumible</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${movimientos?.map(m => `
                                <tr>
                                    <td class="px-4 py-3 text-sm">${new Date(m.fecha_movimiento).toLocaleString()}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${m.consumible?.nombre || 'N/A'}${m.consumible?.codigo ? ` (${m.consumible.codigo})` : ''}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${m.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${m.tipo === 'ENTRADA' ? '📥 Entrada' : m.tipo === 'SALIDA' ? '📤 Salida' : '⚙️ Ajuste'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}">${m.tipo === 'ENTRADA' ? '+' : '-'}${m.cantidad}</td>
                                    <td class="px-4 py-3 text-sm">${m.motivo || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm max-w-xs truncate">${m.observacion || '-'}</td>
                                    <td class="px-4 py-3 text-sm">${m.usuario?.correo || 'Sistema'}</td>
                                </tr>
                            `).join('')}
                            ${(!movimientos || movimientos.length === 0) ? `
                                <tr><td colspan="7" class="text-center py-8 text-gray-500">No hay movimientos registrados</td></tr>
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
        mostrarError('Error al cargar movimientos: ' + error.message);
    }
};

// ==================== FUNCIONES AUXILIARES ACTUALIZADAS ====================

// Cargar tipos de consumible por categoría
async function cargarTiposPorCategoria() {
    const categoriaId = document.getElementById('consumible_categoria_id')?.value;
    const tipoSelect = document.getElementById('consumible_tipo_id');
    
    if (!tipoSelect) return;
    
    if (!categoriaId) {
        tipoSelect.innerHTML = '<option value="">Primero seleccione una categoría</option>';
        tipoSelect.disabled = true;
        return;
    }
    
    // Mostrar estado de carga
    tipoSelect.innerHTML = '<option value="">Cargando tipos...</option>';
    tipoSelect.disabled = true;
    
    try {
        const { data: tipos, error } = await window.supabaseClient
            .from('consumible_tipos')
            .select('id, nombre, descripcion')
            .eq('categoria_id', categoriaId)
            .eq('activo', true)
            .order('orden')
            .order('nombre');
        
        if (error) throw error;
        
        // Limpiar y cargar opciones
        tipoSelect.innerHTML = '<option value="">Seleccionar tipo</option>';
        
        if (!tipos || tipos.length === 0) {
            tipoSelect.innerHTML = '<option value="">No hay tipos disponibles para esta categoría</option>';
            tipoSelect.disabled = true;
            return;
        }
        
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            let texto = tipo.nombre;
            if (tipo.descripcion) {
                texto += ` (${tipo.descripcion.substring(0, 30)}${tipo.descripcion.length > 30 ? '...' : ''})`;
            }
            option.textContent = texto;
            tipoSelect.appendChild(option);
        });
        
        tipoSelect.disabled = false;
        console.log(`✅ ${tipos.length} tipos cargados para categoría ${categoriaId}`);
        
    } catch (error) {
        console.error('Error cargando tipos:', error);
        tipoSelect.innerHTML = '<option value="">Error al cargar tipos</option>';
        tipoSelect.disabled = true;
    }
}

// Cargar proveedores
async function cargarProveedoresSelect() {
    try {
        const { data: proveedores, error } = await window.supabaseClient
            .from('proveedores')
            .select('id, nombre, ruc')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        const select = document.getElementById('consumible_proveedor_id');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar proveedor</option>';
            proveedores?.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov.id;
                let texto = prov.nombre;
                if (prov.ruc) texto += ` (${prov.ruc})`;
                option.textContent = texto;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

// Cargar categorías de consumibles
async function cargarCategoriasConsumibleSelect() {
    try {
        const { data: categorias, error } = await window.supabaseClient
            .from('consumible_categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        const select = document.getElementById('consumible_categoria_id');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar categoría</option>';
            categorias?.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nombre;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Cargar ubicaciones por empresa (para consumibles)
async function cargarUbicacionesPorEmpresaConsumible() {
    const empresaId = document.getElementById('consumible_empresa_id')?.value;
    const ubicacionSelect = document.getElementById('consumible_ubicacion_id');
    
    if (!ubicacionSelect) return;

    if (!empresaId) {
        ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
        ubicacionSelect.disabled = true;
        return;
    }

    // Mostrar estado de carga
    ubicacionSelect.innerHTML = '<option value="">Cargando ubicaciones...</option>';
    ubicacionSelect.disabled = true;

    try {
        // Usar la función global de utils.js
        if (typeof window.cargarUbicacionesPorEmpresa === 'function') {
            await window.cargarUbicacionesPorEmpresa(empresaId, 'consumible_ubicacion_id', true, true);
        } else {
            // Fallback: cargar directamente
            const { data: ubicaciones, error } = await window.supabaseClient
                .from('ubicaciones')
                .select('id, nombre, descripcion, tipo')
                .eq('empresa_id', empresaId)
                .eq('activo', true)
                .order('nombre');
            
            if (error) throw error;
            
            ubicacionSelect.innerHTML = '<option value="">Seleccionar ubicación</option>';
            
            if (ubicaciones && ubicaciones.length > 0) {
                const tipoIconos = {
                    'PLANTA': '🏭', 'EDIFICIO': '🏢', 'PISO': '📌',
                    'OFICINA': '🏢', 'SEDE': '🏛️', 'ALMACEN': '📦'
                };
                
                ubicaciones.forEach(ubi => {
                    const option = document.createElement('option');
                    option.value = ubi.id;
                    const icono = tipoIconos[ubi.tipo] || '📍';
                    let texto = `${icono} ${ubi.nombre}`;
                    if (ubi.tipo) texto += ` (${ubi.tipo})`;
                    if (ubi.descripcion) texto += ` - ${ubi.descripcion}`;
                    option.textContent = texto;
                    ubicacionSelect.appendChild(option);
                });
            } else {
                ubicacionSelect.innerHTML = '<option value="">No hay ubicaciones para esta empresa</option>';
            }
            ubicacionSelect.disabled = false;
        }
        
        console.log(`✅ Ubicaciones cargadas para empresa ${empresaId}`);
        
    } catch (error) {
        console.error('❌ Error cargando ubicaciones:', error);
        ubicacionSelect.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
        ubicacionSelect.disabled = false;
    } finally {
        ubicacionSelect.disabled = false;
    }
}

// Asegurar que el evento change del selector de empresa llame a esta función
const empresaSelect = document.getElementById('consumible_empresa_id');
if (empresaSelect) {
    empresaSelect.removeEventListener('change', cargarUbicacionesPorEmpresaConsumible);
    empresaSelect.addEventListener('change', cargarUbicacionesPorEmpresaConsumible);
}

