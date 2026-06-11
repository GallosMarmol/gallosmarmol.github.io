// ==================== PRODUCTOS - GESTIÓN DE LANDING PAGES ====================

// Variables globales
let productosEditandoId = null;
let vistaProductosActual = 'tabla'; // 'tabla' o 'cards'
let paginaActualProductos = 1;
const ITEMS_POR_PAGINA_PRODUCTOS = 15;
let totalProductosCount = 0;
let totalPaginasProductos = 1;

// ==================== VISTA OUTLET PÚBLICA CON FILTROS AVANZADOS ====================

let timeoutOutletBusqueda = null;
let outletProductosOriginales = [];

async function cargarVistaOutletPublico() {
    if (typeof mostrarLoading === 'function') mostrarLoading('Cargando productos en outlet...');
    
    try {
        // Obtener todos los productos de outlet
        const { data: productos, error } = await window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre)
            `)
            .contains('categorias_especiales', ['OUTLET'])
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        // Guardar productos originales para filtros
        outletProductosOriginales = productos || [];
        
        // ============================================
        // OBTENER VALORES ÚNICOS PARA FILTROS DINÁMICOS
        // ============================================
        
        // Familias únicas
        const familiasUnicas = new Map();
        outletProductosOriginales.forEach(p => {
            if (p.familia_id && p.familia) {
                familiasUnicas.set(p.familia_id, p.familia.nombre);
            }
        });
        
        // Acabados únicos
        const acabadosUnicos = new Map();
        outletProductosOriginales.forEach(p => {
            if (p.acabado_id && p.acabado) {
                acabadosUnicos.set(p.acabado_id, p.acabado.nombre);
            }
        });
        
        // Materiales únicos
        const materialesUnicos = new Map();
        outletProductosOriginales.forEach(p => {
            if (p.material_id && p.material) {
                materialesUnicos.set(p.material_id, p.material.nombre);
            }
        });
        
        // Medidas únicas
        const medidasUnicas = new Set();
        outletProductosOriginales.forEach(p => {
            if (p.medida && p.medida.trim() !== '') {
                medidasUnicas.add(p.medida);
            }
        });
        
        // Generar opciones de filtros
        const familiasOptions = Array.from(familiasUnicas.entries())
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
        
        const acabadosOptions = Array.from(acabadosUnicos.entries())
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
        
        const materialesOptions = Array.from(materialesUnicos.entries())
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
        
        const medidasOptions = Array.from(medidasUnicas)
            .sort()
            .map(m => `<option value="${m}">${m}</option>`)
            .join('');
        
        if (typeof ocultarLoading === 'function') ocultarLoading();
        
        // ============================================
        // GENERAR HTML CON FILTROS AVANZADOS
        // ============================================
        
        let html = `
            <div class="max-w-7xl mx-auto px-4 py-8">
                <!-- Banner de Outlet -->
                <div class="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-8 mb-8 text-white">
                    <div class="flex flex-col md:flex-row justify-between items-center">
                        <div>
                            <h1 class="text-3xl md:text-4xl font-bold mb-2">🔥 OUTLET</h1>
                            <p class="text-red-100">Productos en liquidación con precios especiales</p>
                            <p class="text-sm text-red-200 mt-1">Stock limitado - ¡No dejes pasar la oportunidad!</p>
                        </div>
                        <div class="mt-4 md:mt-0">
                            <span class="text-5xl">🏷️</span>
                        </div>
                    </div>
                </div>
                
                <!-- Búsqueda rápida con debounce -->
                <div class="mb-4">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaOutletRapida" placeholder="Buscar producto (nombre o código)..." 
                            class="pl-9 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white transition-all"
                            onkeyup="filtrarProductosOutlet()">
                    </div>
                    <p class="text-xs text-gray-400 mt-1">La búsqueda se aplica automáticamente mientras escribes</p>
                </div>
                
                <!-- FILTROS AVANZADOS -->
                <div class="bg-white rounded-xl shadow-sm mb-6 border border-gray-200 overflow-hidden">
                    <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosOutletPanel()">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-filter text-primary"></i>
                            <span class="font-semibold text-gray-700">Filtros avanzados</span>
                            <span id="filtrosOutletBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                        </div>
                        <i class="fas fa-chevron-down transition-transform" id="filtrosOutletIcon"></i>
                    </div>
                    <div id="panelFiltrosOutlet" class="p-4 hidden">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Familia</label>
                                <select id="filtroFamiliaOutlet" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                    <option value="">Todas</option>
                                    ${familiasOptions || '<option value="" disabled>No hay datos</option>'}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Acabado</label>
                                <select id="filtroAcabadoOutlet" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                    <option value="">Todos</option>
                                    ${acabadosOptions || '<option value="" disabled>No hay datos</option>'}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Material</label>
                                <select id="filtroMaterialOutlet" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                    <option value="">Todos</option>
                                    ${materialesOptions || '<option value="" disabled>No hay datos</option>'}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Medida</label>
                                <select id="filtroMedidaOutlet" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                    <option value="">Todas</option>
                                    ${medidasOptions || '<option value="" disabled>No hay datos</option>'}
                                </select>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                            <button onclick="aplicarFiltrosOutlet()" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                <i class="fas fa-search"></i> Buscar
                            </button>
                            <button onclick="limpiarFiltrosOutlet()" class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-undo-alt"></i> Limpiar filtros
                            </button>
                        </div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t">
                            <i class="fas fa-info-circle"></i> 
                            Los filtros muestran solo valores existentes en los productos actuales
                        </div>
                    </div>
                </div>
                
                <!-- Contador de resultados -->
                <div class="mb-4">
                    <p class="text-gray-500 text-sm">
                        <i class="fas fa-box mr-2"></i>
                        <span id="contadorOutletProductos">${outletProductosOriginales.length}</span> producto(s) disponible(s)
                    </p>
                </div>
                
                <!-- Grid de productos -->
                <div id="outletProductosGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    ${generarCardsOutletConFiltros(outletProductosOriginales)}
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Configurar panel de filtros (oculto por defecto)
        const panel = document.getElementById('panelFiltrosOutlet');
        if (panel) {
            panel.classList.add('hidden');
            panel.style.display = 'none';
        }
        const icon = document.getElementById('filtrosOutletIcon');
        if (icon) icon.style.transform = 'rotate(0deg)';
        
        // Inicializar eventos de filtros
        inicializarEventosFiltrosOutlet();
        
        console.log('✅ Vista de Outlet con filtros cargada correctamente');
        
    } catch (error) {
        if (typeof ocultarLoading === 'function') ocultarLoading();
        console.error('Error:', error);
        document.getElementById('dynamicContent').innerHTML = `
            <div class="max-w-7xl mx-auto px-4 py-8 text-center">
                <div class="bg-red-50 rounded-lg p-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                    <p class="text-red-600">Error al cargar los productos: ${error.message}</p>
                </div>
            </div>
        `;
    }
}

// ==================== GENERAR CARDS DE OUTLET CON FILTROS ====================
function generarCardsOutletConFiltros(productos) {
    if (!productos || productos.length === 0) {
        return `
            <div class="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                <i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">No hay productos en Outlet que coincidan con los filtros</p>
                <p class="text-gray-400 text-sm mt-2">Pronto tendremos nuevas ofertas</p>
                <button onclick="limpiarFiltrosOutlet()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    <i class="fas fa-undo-alt mr-2"></i>Limpiar filtros
                </button>
            </div>
        `;
    }
    
    function optimizarImagen(url) {
        if (!url) return 'FOTO/foto_01.webp';
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return `https://lh3.googleusercontent.com/d/${match[1]}=w400-h400`;
        return url;
    }
    
    return productos.map(p => `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 group">
            <div class="relative">
                <div class="absolute top-2 left-2 z-10">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-md">
                        🔥 OUTLET
                    </span>
                </div>
                <div class="h-56 overflow-hidden bg-gray-100">
                    <img src="${optimizarImagen(p.imagen_principal)}" 
                         alt="${p.nombre}" 
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                         loading="lazy"
                         onerror="this.src='FOTO/foto_01.webp'">
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-primary text-lg line-clamp-1" title="${p.nombre}">${p.nombre}</h3>
                <p class="text-xs text-gray-400 font-mono mt-0.5">${p.codigo || 'Sin código'}</p>
                
                <div class="mt-3 flex flex-wrap gap-2">
                    ${p.familia?.nombre ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">${p.familia.nombre}</span>` : ''}
                    ${p.acabado?.nombre ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">${p.acabado.nombre}</span>` : ''}
                    ${p.medida ? `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">${p.medida}</span>` : ''}
                </div>
                
                ${p.descripcion_corta ? `
                    <p class="text-sm text-gray-500 mt-2 line-clamp-2">${p.descripcion_corta}</p>
                ` : ''}
                
                <div class="mt-4 pt-2">
                    <a href="/?producto=${p.slug}" 
                       class="w-full block text-center bg-primary text-white py-2.5 rounded-lg hover:bg-primary-dark transition-colors font-medium">
                        Ver Detalle
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== APLICAR FILTROS OUTLET ====================
window.aplicarFiltrosOutlet = function() {
    const busqueda = document.getElementById('busquedaOutletRapida')?.value.toLowerCase() || '';
    const familiaId = document.getElementById('filtroFamiliaOutlet')?.value;
    const acabadoId = document.getElementById('filtroAcabadoOutlet')?.value;
    const materialId = document.getElementById('filtroMaterialOutlet')?.value;
    const medida = document.getElementById('filtroMedidaOutlet')?.value;
    
    let productosFiltrados = [...outletProductosOriginales];
    
    if (familiaId && familiaId !== '') {
        productosFiltrados = productosFiltrados.filter(p => p.familia_id === familiaId);
    }
    
    if (acabadoId && acabadoId !== '') {
        productosFiltrados = productosFiltrados.filter(p => p.acabado_id === acabadoId);
    }
    
    if (materialId && materialId !== '') {
        productosFiltrados = productosFiltrados.filter(p => p.material_id === materialId);
    }
    
    if (medida && medida !== '') {
        productosFiltrados = productosFiltrados.filter(p => p.medida === medida);
    }
    
    if (busqueda && busqueda !== '') {
        productosFiltrados = productosFiltrados.filter(p => 
            p.nombre?.toLowerCase().includes(busqueda) || 
            p.codigo?.toLowerCase().includes(busqueda) ||
            p.slug?.toLowerCase().includes(busqueda)
        );
    }
    
    const contadorSpan = document.getElementById('contadorOutletProductos');
    if (contadorSpan) contadorSpan.textContent = productosFiltrados.length;
    
    const grid = document.getElementById('outletProductosGrid');
    if (grid) {
        grid.innerHTML = generarCardsOutletConFiltros(productosFiltrados);
    }
    
    let activos = 0;
    if (familiaId && familiaId !== '') activos++;
    if (acabadoId && acabadoId !== '') activos++;
    if (materialId && materialId !== '') activos++;
    if (medida && medida !== '') activos++;
    if (busqueda && busqueda !== '') activos++;
    
    const badge = document.getElementById('filtrosOutletBadge');
    if (badge) {
        if (activos > 0) {
            badge.textContent = activos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
};

// ==================== FILTRAR PRODUCTOS OUTLET (CON DEBOUNCE) ====================
window.filtrarProductosOutlet = function() {
    if (timeoutOutletBusqueda) {
        clearTimeout(timeoutOutletBusqueda);
    }
    timeoutOutletBusqueda = setTimeout(() => {
        window.aplicarFiltrosOutlet();
    }, 500);
};

// ==================== LIMPIAR FILTROS OUTLET ====================
window.limpiarFiltrosOutlet = function() {
    const busquedaInput = document.getElementById('busquedaOutletRapida');
    if (busquedaInput) busquedaInput.value = '';
    
    const familiaSelect = document.getElementById('filtroFamiliaOutlet');
    if (familiaSelect) familiaSelect.value = '';
    
    const acabadoSelect = document.getElementById('filtroAcabadoOutlet');
    if (acabadoSelect) acabadoSelect.value = '';
    
    const materialSelect = document.getElementById('filtroMaterialOutlet');
    if (materialSelect) materialSelect.value = '';
    
    const medidaSelect = document.getElementById('filtroMedidaOutlet');
    if (medidaSelect) medidaSelect.value = '';
    
    const badge = document.getElementById('filtrosOutletBadge');
    if (badge) badge.classList.add('hidden');
    
    const grid = document.getElementById('outletProductosGrid');
    if (grid) {
        grid.innerHTML = generarCardsOutletConFiltros(outletProductosOriginales);
    }
    
    const contadorSpan = document.getElementById('contadorOutletProductos');
    if (contadorSpan) contadorSpan.textContent = outletProductosOriginales.length;
};

// ==================== TOGGLE PANEL FILTROS OUTLET ====================
window.toggleFiltrosOutletPanel = function() {
    const panel = document.getElementById('panelFiltrosOutlet');
    const icon = document.getElementById('filtrosOutletIcon');
    
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

// ==================== INICIALIZAR EVENTOS DE FILTROS ====================
function inicializarEventosFiltrosOutlet() {
    const selectores = ['filtroFamiliaOutlet', 'filtroAcabadoOutlet', 'filtroMaterialOutlet', 'filtroMedidaOutlet'];
    
    selectores.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.removeEventListener('change', window.aplicarFiltrosOutlet);
            elemento.addEventListener('change', window.aplicarFiltrosOutlet);
        }
    });
}

// ==================== VISTA SALDOS DE EXPORTACIÓN PÚBLICA CON FILTROS ====================

let timeoutSaldosBusqueda = null;
let saldosProductosOriginales = [];

async function cargarVistaSaldosExportacionPublico() {
    if (typeof mostrarLoading === 'function') mostrarLoading('Cargando saldos de exportación...');
    
    try {
        const { data: productos, error } = await window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre)
            `)
            .contains('categorias_especiales', ['SALDOS_EXPORTACION'])
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        saldosProductosOriginales = productos || [];
        
        // Obtener valores únicos para filtros
        const familiasUnicas = new Map();
        const acabadosUnicos = new Map();
        const materialesUnicos = new Map();
        const medidasUnicas = new Set();
        
        saldosProductosOriginales.forEach(p => {
            if (p.familia_id && p.familia) familiasUnicas.set(p.familia_id, p.familia.nombre);
            if (p.acabado_id && p.acabado) acabadosUnicos.set(p.acabado_id, p.acabado.nombre);
            if (p.material_id && p.material) materialesUnicos.set(p.material_id, p.material.nombre);
            if (p.medida && p.medida.trim() !== '') medidasUnicas.add(p.medida);
        });
        
        const familiasOptions = Array.from(familiasUnicas.entries()).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
        const acabadosOptions = Array.from(acabadosUnicos.entries()).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
        const materialesOptions = Array.from(materialesUnicos.entries()).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
        const medidasOptions = Array.from(medidasUnicas).sort().map(m => `<option value="${m}">${m}</option>`).join('');
        
        if (typeof ocultarLoading === 'function') ocultarLoading();
        
        let html = `
            <div class="max-w-7xl mx-auto px-4 py-8">
                <div class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 mb-8 text-white">
                    <div class="flex flex-col md:flex-row justify-between items-center">
                        <div>
                            <h1 class="text-3xl md:text-4xl font-bold mb-2">📦 SALDOS DE EXPORTACIÓN</h1>
                            <p class="text-blue-100">Excedentes de producción con estándares internacionales</p>
                            <p class="text-sm text-blue-200 mt-1">Calidad de exportación disponible para entrega inmediata</p>
                        </div>
                        <div class="mt-4 md:mt-0"><span class="text-5xl">🚢</span></div>
                    </div>
                </div>
                
                <div class="mb-4">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="busquedaSaldosRapida" placeholder="Buscar producto (nombre o código)..." 
                            class="pl-9 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white transition-all"
                            onkeyup="filtrarProductosSaldos()">
                    </div>
                    <p class="text-xs text-gray-400 mt-1">La búsqueda se aplica automáticamente mientras escribes</p>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm mb-6 border border-gray-200 overflow-hidden">
                    <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosSaldosPanel()">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-filter text-primary"></i>
                            <span class="font-semibold text-gray-700">Filtros avanzados</span>
                            <span id="filtrosSaldosBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                        </div>
                        <i class="fas fa-chevron-down transition-transform" id="filtrosSaldosIcon"></i>
                    </div>
                    <div id="panelFiltrosSaldos" class="p-4 hidden">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Familia</label><select id="filtroFamiliaSaldos" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">Todas</option>${familiasOptions}</select></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Acabado</label><select id="filtroAcabadoSaldos" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">Todos</option>${acabadosOptions}</select></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Material</label><select id="filtroMaterialSaldos" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">Todos</option>${materialesOptions}</select></div>
                            <div><label class="block text-xs font-medium text-gray-500 mb-1">Medida</label><select id="filtroMedidaSaldos" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"><option value="">Todas</option>${medidasOptions}</select></div>
                        </div>
                        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                            <button onclick="aplicarFiltrosSaldos()" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Buscar</button>
                            <button onclick="limpiarFiltrosSaldos()" class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Limpiar filtros</button>
                        </div>
                    </div>
                </div>
                
                <div class="mb-4"><p class="text-gray-500 text-sm"><i class="fas fa-box mr-2"></i><span id="contadorSaldosProductos">${saldosProductosOriginales.length}</span> producto(s) disponible(s)</p></div>
                <div id="saldosProductosGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    ${generarCardsSaldosConFiltros(saldosProductosOriginales)}
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        const panel = document.getElementById('panelFiltrosSaldos');
        if (panel) { panel.classList.add('hidden'); panel.style.display = 'none'; }
        const icon = document.getElementById('filtrosSaldosIcon');
        if (icon) icon.style.transform = 'rotate(0deg)';
        
        inicializarEventosFiltrosSaldos();
        
    } catch (error) {
        if (typeof ocultarLoading === 'function') ocultarLoading();
        console.error('Error:', error);
        document.getElementById('dynamicContent').innerHTML = `<div class="max-w-7xl mx-auto px-4 py-8 text-center"><div class="bg-red-50 rounded-lg p-8"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i><p class="text-red-600">Error al cargar los productos: ${error.message}</p></div></div>`;
    }
}

function generarCardsSaldosConFiltros(productos) {
    if (!productos || productos.length === 0) {
        return `<div class="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200"><i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay productos en Saldos de Exportación que coincidan con los filtros</p><button onclick="limpiarFiltrosSaldos()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">Limpiar filtros</button></div>`;
    }
    
    function optimizarImagen(url) {
        if (!url) return 'FOTO/foto_01.webp';
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return `https://lh3.googleusercontent.com/d/${match[1]}=w400-h400`;
        return url;
    }
    
    return productos.map(p => `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 group">
            <div class="relative">
                <div class="absolute top-2 left-2 z-10"><span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">📦 Exportación</span></div>
                <div class="h-56 overflow-hidden bg-gray-100"><img src="${optimizarImagen(p.imagen_principal)}" alt="${p.nombre}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.src='FOTO/foto_01.webp'"></div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-primary text-lg line-clamp-1">${p.nombre}</h3>
                <p class="text-xs text-gray-400 font-mono mt-0.5">${p.codigo || 'Sin código'}</p>
                <div class="mt-3 flex flex-wrap gap-2">${p.familia?.nombre ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">${p.familia.nombre}</span>` : ''}${p.acabado?.nombre ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">${p.acabado.nombre}</span>` : ''}${p.medida ? `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">${p.medida}</span>` : ''}</div>
                ${p.descripcion_corta ? `<p class="text-sm text-gray-500 mt-2 line-clamp-2">${p.descripcion_corta}</p>` : ''}
                <div class="mt-4 pt-2"><a href="/?producto=${p.slug}" class="w-full block text-center bg-primary text-white py-2.5 rounded-lg hover:bg-primary-dark transition-colors font-medium">Ver Detalle</a></div>
            </div>
        </div>
    `).join('');
}

window.aplicarFiltrosSaldos = function() {
    const busqueda = document.getElementById('busquedaSaldosRapida')?.value.toLowerCase() || '';
    const familiaId = document.getElementById('filtroFamiliaSaldos')?.value;
    const acabadoId = document.getElementById('filtroAcabadoSaldos')?.value;
    const materialId = document.getElementById('filtroMaterialSaldos')?.value;
    const medida = document.getElementById('filtroMedidaSaldos')?.value;
    
    let productosFiltrados = [...saldosProductosOriginales];
    if (familiaId && familiaId !== '') productosFiltrados = productosFiltrados.filter(p => p.familia_id === familiaId);
    if (acabadoId && acabadoId !== '') productosFiltrados = productosFiltrados.filter(p => p.acabado_id === acabadoId);
    if (materialId && materialId !== '') productosFiltrados = productosFiltrados.filter(p => p.material_id === materialId);
    if (medida && medida !== '') productosFiltrados = productosFiltrados.filter(p => p.medida === medida);
    if (busqueda && busqueda !== '') productosFiltrados = productosFiltrados.filter(p => p.nombre?.toLowerCase().includes(busqueda) || p.codigo?.toLowerCase().includes(busqueda) || p.slug?.toLowerCase().includes(busqueda));
    
    const contadorSpan = document.getElementById('contadorSaldosProductos');
    if (contadorSpan) contadorSpan.textContent = productosFiltrados.length;
    const grid = document.getElementById('saldosProductosGrid');
    if (grid) grid.innerHTML = generarCardsSaldosConFiltros(productosFiltrados);
    
    let activos = 0;
    if (familiaId && familiaId !== '') activos++;
    if (acabadoId && acabadoId !== '') activos++;
    if (materialId && materialId !== '') activos++;
    if (medida && medida !== '') activos++;
    if (busqueda && busqueda !== '') activos++;
    const badge = document.getElementById('filtrosSaldosBadge');
    if (badge) { if (activos > 0) { badge.textContent = activos; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); } }
};

window.filtrarProductosSaldos = function() {
    if (timeoutSaldosBusqueda) clearTimeout(timeoutSaldosBusqueda);
    timeoutSaldosBusqueda = setTimeout(() => window.aplicarFiltrosSaldos(), 500);
};

window.limpiarFiltrosSaldos = function() {
    const inputs = ['busquedaSaldosRapida', 'filtroFamiliaSaldos', 'filtroAcabadoSaldos', 'filtroMaterialSaldos', 'filtroMedidaSaldos'];
    inputs.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const badge = document.getElementById('filtrosSaldosBadge');
    if (badge) badge.classList.add('hidden');
    const grid = document.getElementById('saldosProductosGrid');
    if (grid) grid.innerHTML = generarCardsSaldosConFiltros(saldosProductosOriginales);
    const contadorSpan = document.getElementById('contadorSaldosProductos');
    if (contadorSpan) contadorSpan.textContent = saldosProductosOriginales.length;
};

window.toggleFiltrosSaldosPanel = function() {
    const panel = document.getElementById('panelFiltrosSaldos');
    const icon = document.getElementById('filtrosSaldosIcon');
    if (!panel) return;
    if (panel.classList.contains('hidden')) { panel.classList.remove('hidden'); panel.style.display = ''; if (icon) icon.style.transform = 'rotate(180deg)'; }
    else { panel.classList.add('hidden'); panel.style.display = 'none'; if (icon) icon.style.transform = 'rotate(0deg)'; }
};

function inicializarEventosFiltrosSaldos() {
    const selectores = ['filtroFamiliaSaldos', 'filtroAcabadoSaldos', 'filtroMaterialSaldos', 'filtroMedidaSaldos'];
    selectores.forEach(id => { const elemento = document.getElementById(id); if (elemento) { elemento.removeEventListener('change', window.aplicarFiltrosSaldos); elemento.addEventListener('change', window.aplicarFiltrosSaldos); } });
}

// ==================== CARGAR VISTA PRODUCTOS ====================
async function cargarVistaProductos() {
    mostrarLoading('Cargando productos...');
    
    try {
        console.log('%c📦 CARGANDO PRODUCTOS', 'background: #17a2b8; color: white; font-size: 14px;');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        if (!esAdmin) {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        // ============================================
        // OBTENER TODOS LOS PRODUCTOS (para valores únicos)
        // ============================================
        const { data: todosProductos, error: errorTodos } = await window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                borde:borde_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre)
            `)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (errorTodos) throw errorTodos;
        
        // ============================================
        // OBTENER VALORES ÚNICOS PARA FILTROS
        // ============================================
        
        // Familias únicas
        const familiasUnicas = new Map();
        todosProductos?.forEach(p => {
            if (p.familia_id && p.familia) {
                familiasUnicas.set(p.familia_id, p.familia.nombre);
            }
        });
        
        // Acabados únicos
        const acabadosUnicos = new Map();
        todosProductos?.forEach(p => {
            if (p.acabado_id && p.acabado) {
                acabadosUnicos.set(p.acabado_id, p.acabado.nombre);
            }
        });
        
        // Materiales únicos
        const materialesUnicos = new Map();
        todosProductos?.forEach(p => {
            if (p.material_id && p.material) {
                materialesUnicos.set(p.material_id, p.material.nombre);
            }
        });
        
        // Generar opciones de filtros
        const familiasOptions = Array.from(familiasUnicas.entries())
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
        
        const acabadosOptions = Array.from(acabadosUnicos.entries())
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
        
        const materialesOptions = Array.from(materialesUnicos.entries())
            .map(([id, nombre]) => `<option value="${id}">${nombre}</option>`)
            .join('');
        
        // ============================================
        // APLICAR FILTROS PARA LA PAGINACIÓN
        // ============================================
        
        // Obtener valores de filtros (si existen en el DOM)
        const filtroBusqueda = document.getElementById('filtroBusquedaProducto')?.value;
        const filtroFamilia = document.getElementById('filtroFamiliaProducto')?.value;
        const filtroAcabado = document.getElementById('filtroAcabadoProducto')?.value;
        const filtroMaterial = document.getElementById('filtroMaterialProducto')?.value;
        const filtroEstado = document.getElementById('filtroEstadoProducto')?.value;
        
        // Construir query para paginación
        let query = window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                borde:borde_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre)
            `, { count: 'exact' });
        
        // Aplicar filtros solo si tienen valor
        if (filtroBusqueda && filtroBusqueda !== '') {
            query = query.or(`nombre.ilike.%${filtroBusqueda}%,slug.ilike.%${filtroBusqueda}%,codigo.ilike.%${filtroBusqueda}%`);
        }
        
        if (filtroFamilia && filtroFamilia !== '') {
            query = query.eq('familia_id', filtroFamilia);
        }
        
        if (filtroAcabado && filtroAcabado !== '') {
            query = query.eq('acabado_id', filtroAcabado);
        }
        
        if (filtroMaterial && filtroMaterial !== '') {
            query = query.eq('material_id', filtroMaterial);
        }
        
        if (filtroEstado && filtroEstado !== '') {
            query = query.eq('activo', filtroEstado === 'true');
        }
        
        // Aplicar ordenamiento
        const ordenValue = document.getElementById('ordenTickets')?.value || 'orden.asc';
        const [campoOrden, direccionOrden] = ordenValue.split('.');
        query = query.order(campoOrden, { ascending: direccionOrden === 'asc' });
        query = query.order('nombre', { ascending: true });
        
        // Aplicar paginación
        const desde = (paginaActualProductos - 1) * ITEMS_POR_PAGINA_PRODUCTOS;
        const hasta = desde + ITEMS_POR_PAGINA_PRODUCTOS - 1;
        query = query.range(desde, hasta);
        
        const { data: productos, count, error } = await query;
        
        if (error) throw error;
        
        totalProductosCount = count || 0;
        totalPaginasProductos = Math.ceil(totalProductosCount / ITEMS_POR_PAGINA_PRODUCTOS);
        
        console.log('📊 Productos encontrados:', totalProductosCount);
        console.log('📊 Valores únicos - Familias:', familiasUnicas.size, 'Acabados:', acabadosUnicos.size, 'Materiales:', materialesUnicos.size);
        
        ocultarLoading();
        
        // ============================================
        // GENERAR HTML
        // ============================================
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-cube"></i> Productos Landing Pages
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Gestión de productos para landing pages dinámicas
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${totalProductosCount} producto${totalProductosCount !== 1 ? 's' : ''}
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaProductos('tabla')" class="px-3 py-1.5 text-sm ${vistaProductosActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Tabla">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaProductos('cards')" class="px-3 py-1.5 text-sm ${vistaProductosActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Cards">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        <button onclick="abrirModalNuevoProducto()" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>Nuevo Producto
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- FILTROS AVANZADOS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosProductosPanel()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosProductosBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosProductosIcon"></i>
                </div>
                <div id="panelFiltrosProductos" class="p-4 hidden">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                            <input type="text" id="filtroBusquedaProducto" placeholder="Nombre, código o slug..." class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Familia</label>
                            <select id="filtroFamiliaProducto" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todas</option>
                                ${familiasOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Acabado</label>
                            <select id="filtroAcabadoProducto" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${acabadosOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Material</label>
                            <select id="filtroMaterialProducto" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${materialesOptions || '<option value="" disabled>No hay datos</option>'}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                            <select id="filtroEstadoProducto" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                <option value="true">Activos</option>
                                <option value="false">Inactivos</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                        <button onclick="aplicarFiltrosProductos()" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                        <button onclick="limpiarFiltrosProductos()" class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-undo-alt"></i> Limpiar
                        </button>
                    </div>
                    <div class="text-xs text-gray-400 mt-2 pt-2 border-t">
                        <i class="fas fa-info-circle"></i> 
                        Los filtros muestran solo valores existentes en los productos actuales
                    </div>
                </div>
            </div>
            
            <!-- Búsqueda rápida con debounce -->
            <div class="mb-4">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" id="busquedaProductosRapida" placeholder="Buscar producto (nombre o código)..." 
                        class="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white">
                </div>
                <p class="text-xs text-gray-400 mt-1">La búsqueda se aplica automáticamente mientras escribes</p>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="productosContainer">
                ${vistaProductosActual === 'tabla' 
                    ? generarVistaTablaProductos(productos)
                    : generarVistaCardsProductos(productos)
                }
            </div>
        `;
        
        // Agregar paginación
        if (totalPaginasProductos > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualProductos - 1) * ITEMS_POR_PAGINA_PRODUCTOS) + 1} - ${Math.min(paginaActualProductos * ITEMS_POR_PAGINA_PRODUCTOS, totalProductosCount)} de ${totalProductosCount} productos
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaProductos(${paginaActualProductos - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualProductos === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorProductos()}
                        </div>
                        <button onclick="cambiarPaginaProductos(${paginaActualProductos + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualProductos === totalPaginasProductos ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // ============================================
        // INICIALIZAR EVENTOS
        // ============================================
        
        // Búsqueda rápida con debounce (automática)
        const busquedaRapida = document.getElementById('busquedaProductosRapida');
        if (busquedaRapida) {
            let timeoutBusqueda;
            busquedaRapida.addEventListener('input', function() {
                const busqueda = this.value;
                const filtroBusqueda = document.getElementById('filtroBusquedaProducto');
                if (filtroBusqueda) filtroBusqueda.value = busqueda;
                
                clearTimeout(timeoutBusqueda);
                timeoutBusqueda = setTimeout(() => {
                    aplicarFiltrosProductos();
                }, 500);
            });
        }
        
        // Configurar panel de filtros
        const panel = document.getElementById('panelFiltrosProductos');
        if (panel) {
            panel.classList.add('hidden');
            panel.style.display = 'none';
        }
        const icon = document.getElementById('filtrosProductosIcon');
        if (icon) icon.style.transform = 'rotate(0deg)';
        
        // Actualizar badge
        actualizarBadgeFiltrosProductos();
        
        console.log('✅ Vista de productos cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando productos:', error);
        mostrarError('Error al cargar productos: ' + error.message);
    }
}

// Función para actualizar badge de filtros activos
function actualizarBadgeFiltrosProductos() {
    let activos = 0;
    
    const filtroBusqueda = document.getElementById('filtroBusquedaProducto')?.value;
    const filtroFamilia = document.getElementById('filtroFamiliaProducto')?.value;
    const filtroAcabado = document.getElementById('filtroAcabadoProducto')?.value;
    const filtroMaterial = document.getElementById('filtroMaterialProducto')?.value;
    const filtroEstado = document.getElementById('filtroEstadoProducto')?.value;
    
    if (filtroBusqueda && filtroBusqueda !== '') activos++;
    if (filtroFamilia && filtroFamilia !== '') activos++;
    if (filtroAcabado && filtroAcabado !== '') activos++;
    if (filtroMaterial && filtroMaterial !== '') activos++;
    if (filtroEstado && filtroEstado !== '') activos++;
    
    const badge = document.getElementById('filtrosProductosBadge');
    if (badge) {
        if (activos > 0) {
            badge.textContent = activos;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// ==================== GENERAR VISTA TABLA ====================
function generarVistaTablaProductos(productos) {
    if (!productos || productos.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-cube text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay productos registrados</p>
                    <button onclick="abrirModalNuevoProducto()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Crear Producto
                    </button>
                </div>`;
    }
    
    // Función para optimizar URL de Google Drive para miniaturas
    function optimizarUrlThumbnail(url) {
        if (!url) return null;
        
        if (url.includes('lh3.googleusercontent.com')) return url;
        
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return `https://lh3.googleusercontent.com/d/${match[1]}=w80-h80`;
        }
        
        return url;
    }
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Foto</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Código</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto / Slug</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Familia</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medida</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Espesor</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Visitas</th>
                            <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${productos.map(p => {
                            const thumbnailUrl = optimizarUrlThumbnail(p.imagen_principal);
                            const tieneImagen = thumbnailUrl && p.imagen_principal;
                            
                            return `
                                <tr class="hover:bg-gray-50">
                                    <!-- Foto Principal -->
                                    <td class="px-3 py-3">
                                        ${tieneImagen ? `
                                            <img src="${thumbnailUrl}" 
                                                 alt="${p.nombre}" 
                                                 class="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                                 onerror="this.src='FOTO/foto_01.webp'">
                                        ` : `
                                            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                                <i class="fas fa-image text-gray-400 text-lg"></i>
                                            </div>
                                        `}
                                     </div>
                                    
                                    <!-- Código -->
                                    <td class="px-3 py-3 text-sm font-mono text-gray-500">${p.codigo || '-'}</td>
                                    
                                    <!-- Producto / Slug -->
                                    <td class="px-3 py-3">
                                        <div class="font-medium text-primary">${p.nombre || 'N/A'}</div>
                                        <div class="text-xs text-gray-400 font-mono">/${p.slug || 'N/A'}</div>
                                     </div>
                                    
                                    <!-- Familia -->
                                    <td class="px-3 py-3 text-sm">
                                        ${p.familia?.nombre ? `
                                            <span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                                ${p.familia.nombre}
                                            </span>
                                        ` : '-'}
                                     </div>
                                    
                                    <!-- Medida -->
                                    <td class="px-3 py-3 text-sm">${p.medida || '-'}</div>
                                    
                                    <!-- Espesor -->
                                    <td class="px-3 py-3 text-sm">${p.espesor || '-'}</div>
                                    
                                    <!-- Estado -->
                                    <td class="px-3 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${p.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                     </div>
                                    
                                    <!-- Visitas -->
                                    <td class="px-3 py-3 text-sm text-center">
                                        <div class="flex items-center gap-1">
                                            <i class="fas fa-eye text-gray-400 text-xs"></i>
                                            <span class="font-medium">${p.visitas || 0}</span>
                                        </div>
                                     </div>
                                    
                                    <!-- Acciones -->
                                    <td class="px-3 py-3 text-sm whitespace-nowrap">
                                        <div class="flex gap-1">
                                            <a href="/?producto=${p.slug}" target="_blank" 
                                               class="p-1.5 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors" 
                                               title="Ver landing page">
                                                <i class="fas fa-eye text-sm"></i>
                                            </a>
                                            <button onclick="generarPDFProducto('${p.id}')" 
                                                    class="p-1.5 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg transition-colors" 
                                                    title="Generar ficha técnica PDF">
                                                <i class="fas fa-file-pdf text-sm"></i>
                                            </button>                                            
                                            <button onclick="editarProducto('${p.id}')" 
                                                    class="p-1.5 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors" 
                                                    title="Editar producto">
                                                <i class="fas fa-edit text-sm"></i>
                                            </button>
                                            <button onclick="toggleEstadoProducto('${p.id}', ${p.activo})" 
                                                    class="p-1.5 ${p.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white rounded-lg transition-colors" 
                                                    title="${p.activo ? 'Desactivar producto' : 'Activar producto'}">
                                                <i class="fas ${p.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm"></i>
                                            </button>
                                            <button onclick="eliminarProducto('${p.id}')" 
                                                    class="p-1.5 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors" 
                                                    title="Eliminar producto">
                                                <i class="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
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

function generarVistaCardsProductos(productos) {
    if (!productos || productos.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg col-span-full">
                    <i class="fas fa-cube text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay productos registrados</p>
                    <button onclick="abrirModalNuevoProducto()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Crear Producto
                    </button>
                </div>`;
    }
    
    // Función para optimizar URL de Google Drive
    function optimizarUrlImagen(url) {
        if (!url) return 'FOTO/foto_01.webp';
        
        if (url.includes('lh3.googleusercontent.com')) return url;
        
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9_-]+)/,
            /id=([a-zA-Z0-9_-]+)/,
            /\/d\/([a-zA-Z0-9_-]+)/,
            /uc\?.*id=([a-zA-Z0-9_-]+)/
        ];
        
        let fileId = null;
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                fileId = match[1];
                break;
            }
        }
        
        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}=w400-h400`;
        }
        
        return url;
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${productos.map(p => {
                const imagenUrl = optimizarUrlImagen(p.imagen_principal);
                const tieneImagen = p.imagen_principal && p.imagen_principal.trim() !== '';
                
                return `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 group">
                        <!-- Imagen del producto -->
                        <div class="relative h-56 overflow-hidden bg-gray-100">
                            <img src="${imagenUrl}" 
                                 alt="${p.nombre}" 
                                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                 loading="lazy"
                                 onerror="this.src='FOTO/foto_01.webp'">
                            ${!tieneImagen ? '<div class="absolute inset-0 flex items-center justify-center text-gray-400"><i class="fas fa-image text-4xl"></i></div>' : ''}
                            
                            <!-- Badge de estado -->
                            <div class="absolute top-2 right-2">
                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${p.activo ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} shadow-md">
                                    ${p.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            
                            <!-- Badge de código (opcional) -->
                            ${p.codigo ? `
                                <div class="absolute bottom-2 left-2">
                                    <span class="px-2 py-1 rounded-full text-xs font-mono bg-black/60 text-white backdrop-blur-sm">
                                        <i class="fas fa-barcode mr-1"></i>${p.codigo}
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Información del producto -->
                        <div class="p-4">
                            <h3 class="font-bold text-primary text-lg line-clamp-1" title="${p.nombre}">${p.nombre || 'N/A'}</h3>
                            <p class="text-xs text-gray-400 font-mono mt-0.5">/${p.slug || 'N/A'}</p>
                            
                            <!-- Especificaciones técnicas en grid -->
                            <div class="grid grid-cols-2 gap-2 mt-3">
                                ${p.familia?.nombre ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-layer-group text-primary text-xs w-4"></i>
                                        <span class="text-xs text-gray-600 truncate" title="${p.familia.nombre}">${p.familia.nombre}</span>
                                    </div>
                                ` : ''}
                                ${p.acabado?.nombre ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-palette text-primary text-xs w-4"></i>
                                        <span class="text-xs text-gray-600 truncate" title="${p.acabado.nombre}">${p.acabado.nombre}</span>
                                    </div>
                                ` : ''}
                                ${p.material?.nombre ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-cube text-primary text-xs w-4"></i>
                                        <span class="text-xs text-gray-600 truncate" title="${p.material.nombre}">${p.material.nombre}</span>
                                    </div>
                                ` : ''}
                                ${p.calidad?.nombre ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-star text-primary text-xs w-4"></i>
                                        <span class="text-xs text-gray-600 truncate" title="${p.calidad.nombre}">${p.calidad.nombre}</span>
                                    </div>
                                ` : ''}
                                ${p.medida ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-ruler-combined text-primary text-xs w-4"></i>
                                        <span class="text-xs text-gray-600">${p.medida}</span>
                                    </div>
                                ` : ''}
                                ${p.espesor ? `
                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-arrows-alt-h text-primary text-xs w-4"></i>
                                        <span class="text-xs text-gray-600">${p.espesor}</span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <!-- Detalles adicionales -->
                            <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                <div class="flex items-center gap-2 text-xs text-gray-500">
                                    <i class="fas fa-eye"></i>
                                    <span>${p.visitas || 0} visitas</span>
                                </div>
                                <div class="flex items-center gap-2 text-xs text-gray-500">
                                    <i class="fas fa-arrow-down"></i>
                                    <span>Orden: ${p.orden || 0}</span>
                                </div>
                            </div>
                            
                            <!-- Descripción corta (opcional) -->
                            ${p.descripcion_corta ? `
                                <p class="text-xs text-gray-500 mt-2 line-clamp-2">${p.descripcion_corta}</p>
                            ` : ''}
                        </div>
                        
                        <!-- Acciones -->
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2 bg-gray-50">
                            <a href="/?producto=${p.slug}" target="_blank" 
                               class="w-8 h-8 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                               title="Ver landing page">
                                <i class="fas fa-eye"></i>
                            </a>
                            <button onclick="generarPDFProducto('${p.id}')" 
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
                                    title="Generar ficha técnica PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>                            
                            <button onclick="editarProducto('${p.id}')" 
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                                    title="Editar producto">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="toggleEstadoProducto('${p.id}', ${p.activo})" 
                                    class="w-8 h-8 rounded-lg flex items-center justify-center ${p.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white transition-colors"
                                    title="${p.activo ? 'Desactivar producto' : 'Activar producto'}">
                                <i class="fas ${p.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                            <button onclick="eliminarProducto('${p.id}')" 
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                                    title="Eliminar producto">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ==================== ABRIR MODAL NUEVO PRODUCTO ====================
window.abrirModalNuevoProducto = async function() {
    // Verificar si el modal existe, si no, crearlo
    let modal = document.getElementById('productoModal');
    if (!modal) {
        console.log('📦 Modal no encontrado, creándolo...');
        crearModalProducto();
        modal = document.getElementById('productoModal');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Cerrar modal si está visible
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('productoModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Resetear variable de edición
    productosEditandoId = null;
    
    // Resetear formulario
    const form = document.getElementById('productoForm');
    if (form) form.reset();
    
    // Actualizar título
    const titleElement = document.getElementById('productoModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Producto';
    
    // ============================================
    // VALORES POR DEFECTO
    // ============================================
    
    const activoSelect = document.getElementById('producto_activo');
    if (activoSelect) activoSelect.value = 'true';
    
    const ordenInput = document.getElementById('producto_orden');
    if (ordenInput) ordenInput.value = '0';
    
    // Limpiar checkboxes de categorías especiales
    const outletCheck = document.getElementById('categoria_outlet');
    const saldosCheck = document.getElementById('categoria_saldos');
    if (outletCheck) outletCheck.checked = false;
    if (saldosCheck) saldosCheck.checked = false;
    
    if (typeof inicializarCategoriasEspeciales === 'function') {
        inicializarCategoriasEspeciales();
    }
    
    // Limpiar campos de texto
    const codigoInput = document.getElementById('producto_codigo');
    if (codigoInput) {
        codigoInput.value = '';
        codigoInput.required = true;
    }
    
    const nombreInput = document.getElementById('producto_nombre');
    if (nombreInput) nombreInput.value = '';
    
    const slugInput = document.getElementById('producto_slug');
    if (slugInput) slugInput.value = '';
    
    const descripcionCorta = document.getElementById('producto_descripcion_corta');
    if (descripcionCorta) descripcionCorta.value = '';
    
    // Limpiar SEO
    const tituloSeo = document.getElementById('producto_titulo_seo');
    if (tituloSeo) tituloSeo.value = '';
    
    const descripcionSeo = document.getElementById('producto_descripcion_seo');
    if (descripcionSeo) descripcionSeo.value = '';
    
    const palabrasClave = document.getElementById('producto_palabras_clave');
    if (palabrasClave) palabrasClave.value = '';
    
    // Limpiar selects de especificaciones
    const familiaSelect = document.getElementById('producto_familia_id');
    if (familiaSelect) familiaSelect.value = '';
    
    const acabadoSelect = document.getElementById('producto_acabado_id');
    if (acabadoSelect) acabadoSelect.value = '';
    
    const bordeSelect = document.getElementById('producto_borde_id');
    if (bordeSelect) bordeSelect.value = '';
    
    const materialSelect = document.getElementById('producto_material_id');
    if (materialSelect) materialSelect.value = '';
    
    const calidadSelect = document.getElementById('producto_calidad_id');
    if (calidadSelect) calidadSelect.value = '';
    
    // Limpiar campos de texto libre
    const modeloInput = document.getElementById('producto_modelo');
    if (modeloInput) modeloInput.value = '';
    
    const medidaInput = document.getElementById('producto_medida');
    if (medidaInput) medidaInput.value = '';
    
    const espesorInput = document.getElementById('producto_espesor');
    if (espesorInput) espesorInput.value = '';
    
    // Limpiar imágenes
    const imagenPrincipal = document.getElementById('producto_imagen_principal');
    if (imagenPrincipal) imagenPrincipal.value = '';
    
    const galeriaTextarea = document.getElementById('producto_galeria');
    if (galeriaTextarea) galeriaTextarea.value = '';
    
    const rangosTextarea = document.getElementById('producto_rangos');
    if (rangosTextarea) rangosTextarea.value = '';
    
    const fichaTecnica = document.getElementById('producto_ficha_tecnica');
    if (fichaTecnica) fichaTecnica.value = '';
    
    // Limpiar vista previa de imagen
    const previewImagen = document.getElementById('preview_imagen_principal');
    if (previewImagen) {
        previewImagen.innerHTML = '<div class="text-gray-400 text-sm italic">La vista previa aparecerá aquí</div>';
    }
    
    // Limpiar vista previa de galería
    const previewGaleria = document.getElementById('preview_galeria');
    if (previewGaleria) previewGaleria.innerHTML = '';
    
    // Limpiar vista previa de rangos
    const previewRangos = document.getElementById('preview_rangos');
    if (previewRangos) previewRangos.innerHTML = '';
    
    // ============================================
    // CARGAR SELECTS DE CATÁLOGOS (los que NO dependen del modal visible)
    // ============================================
    
    try {
        if (typeof cargarFamiliasSelect === 'function') {
            await cargarFamiliasSelect('producto_familia_id', true);
        } else if (typeof window.cargarFamiliasSelect === 'function') {
            await window.cargarFamiliasSelect('producto_familia_id', true);
        }
        
        if (typeof cargarAcabadosSelect === 'function') {
            await cargarAcabadosSelect('producto_acabado_id', true);
        } else if (typeof window.cargarAcabadosSelect === 'function') {
            await window.cargarAcabadosSelect('producto_acabado_id', true);
        }
        
        if (typeof cargarBordesSelect === 'function') {
            await cargarBordesSelect('producto_borde_id', true);
        } else if (typeof window.cargarBordesSelect === 'function') {
            await window.cargarBordesSelect('producto_borde_id', true);
        }
        
        if (typeof cargarMaterialesSelect === 'function') {
            await cargarMaterialesSelect('producto_material_id', true);
        } else if (typeof window.cargarMaterialesSelect === 'function') {
            await window.cargarMaterialesSelect('producto_material_id', true);
        }
        
        if (typeof cargarCalidadesSelect === 'function') {
            await cargarCalidadesSelect('producto_calidad_id', true);
        } else if (typeof window.cargarCalidadesSelect === 'function') {
            await window.cargarCalidadesSelect('producto_calidad_id', true);
        }
        
        if (typeof cargarAplicacionesCheckbox === 'function') {
            await cargarAplicacionesCheckbox('aplicaciones_container', []);
        } else if (typeof window.cargarAplicacionesCheckbox === 'function') {
            await window.cargarAplicacionesCheckbox('aplicaciones_container', []);
        }
        
        console.log('✅ Catálogos cargados correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando catálogos:', error);
        mostrarAlerta('Error', 'No se pudieron cargar algunos catálogos', 'warning');
    }
    
    // ============================================
    // CONFIGURAR EVENTOS
    // ============================================
    
    // Configurar evento de generación de slug
    const nombreInputEvent = document.getElementById('producto_nombre');
    if (nombreInputEvent && typeof generarSlugProducto === 'function') {
        const nuevoNombreInput = nombreInputEvent.cloneNode(true);
        nombreInputEvent.parentNode.replaceChild(nuevoNombreInput, nombreInputEvent);
        nuevoNombreInput.addEventListener('change', generarSlugProducto);
    }
    
    // Configurar evento de previsualización de imagen principal
    const imagenInput = document.getElementById('producto_imagen_principal');
    if (imagenInput && typeof previsualizarImagen === 'function') {
        const nuevaImagenInput = imagenInput.cloneNode(true);
        imagenInput.parentNode.replaceChild(nuevaImagenInput, imagenInput);
        
        nuevaImagenInput.addEventListener('change', function() {
            previsualizarImagen('producto_imagen_principal', 'preview_imagen_principal');
        });
        
        nuevaImagenInput.addEventListener('input', function() {
            previsualizarImagen('producto_imagen_principal', 'preview_imagen_principal');
        });
    }
    
    // Configurar evento de previsualización de galería
    const galeriaTextareaEvent = document.getElementById('producto_galeria');
    if (galeriaTextareaEvent && typeof mostrarPreviewGaleria === 'function') {
        const nuevaGaleriaTextarea = galeriaTextareaEvent.cloneNode(true);
        galeriaTextareaEvent.parentNode.replaceChild(nuevaGaleriaTextarea, galeriaTextareaEvent);
        
        nuevaGaleriaTextarea.addEventListener('input', function() {
            const urls = this.value.split(',').map(u => u.trim()).filter(u => u);
            if (typeof mostrarPreviewGaleria === 'function') {
                mostrarPreviewGaleria(urls);
            }
        });
    }
    
    // Configurar evento de previsualización de rangos
    const rangosTextareaEvent = document.getElementById('producto_rangos');
    if (rangosTextareaEvent && typeof mostrarPreviewRangos === 'function') {
        const nuevaRangosTextarea = rangosTextareaEvent.cloneNode(true);
        rangosTextareaEvent.parentNode.replaceChild(nuevaRangosTextarea, rangosTextareaEvent);
        
        nuevaRangosTextarea.addEventListener('input', function() {
            const urls = this.value.split(',').map(u => u.trim()).filter(u => u);
            if (typeof mostrarPreviewRangos === 'function') {
                mostrarPreviewRangos(urls);
            }
        });
    }
    
    // ============================================
    // ABRIR MODAL
    // ============================================
    
    await window.abrirModal('productoModal');
    
    // ============================================
    // CARGAR UNIDADES DE MEDIDA DESPUÉS DE ABRIR EL MODAL
    // ============================================
    setTimeout(async () => {
        console.log('🔄 Cargando unidades de medida después de abrir modal...');
        
        // Intentar cargar las unidades de medida
        if (typeof window.cargarUnidadesMedidaSelect === 'function') {
            await window.cargarUnidadesMedidaSelect();
        } else if (typeof cargarUnidadesMedidaSelect === 'function') {
            await cargarUnidadesMedidaSelect();
        } else {
            // Función de respaldo directa
            try {
                const select = document.getElementById('producto_unidad_medida_id');
                if (select) {
                    const { data: unidades, error } = await window.supabaseClient
                        .from('unidad_medida')
                        .select('id, nombre, abreviatura')
                        .eq('activo', true)
                        .order('nombre');
                    
                    if (!error && unidades) {
                        select.innerHTML = '<option value="">Seleccionar unidad de medida</option>';
                        unidades.forEach(u => {
                            const option = document.createElement('option');
                            option.value = u.id;
                            let texto = u.nombre;
                            if (u.abreviatura) texto += ` (${u.abreviatura})`;
                            option.textContent = texto;
                            select.appendChild(option);
                        });
                        console.log(`✅ ${unidades.length} unidades cargadas con respaldo directo`);
                    }
                }
            } catch (err) {
                console.error('Error en respaldo:', err);
            }
        }
    }, 200);
    
    console.log('✅ Modal de nuevo producto abierto correctamente');
};
                
function crearModalProducto() {
    // Verificar si el modal ya existe para no duplicarlo
    if (document.getElementById('productoModal')) return;
    
    const modalHtml = `
        <div id="productoModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div class="flex-shrink-0 bg-primary text-white p-4 rounded-t-xl flex justify-between items-center">
                    <h2 class="text-xl font-bold" id="productoModalTitle">Nuevo Producto</h2>
                    <button onclick="cerrarModal('productoModal')" class="hover:bg-primary-dark p-2 rounded-lg transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="flex-1 overflow-y-auto p-6">
                    <form id="productoForm" onsubmit="guardarProducto(event)">
                        <input type="hidden" id="producto_id">
                        
                        <!-- ============================================ -->
                        <!-- INFORMACIÓN BÁSICA -->
                        <!-- ============================================ -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="col-span-2">
                                <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                                    <i class="fas fa-info-circle mr-2"></i>Información Básica
                                </h3>
                            </div>
                            
                            <!-- Código interno - OBLIGATORIO -->
                            <div>
                                <label class="form-label">Código interno <span class="required">*</span></label>
                                <input type="text" id="producto_codigo" class="form-input w-full" required
                                       placeholder="Ej: GRAN-001, MARM-002">
                                <p class="text-xs text-gray-400 mt-1">Código único interno para identificación rápida (obligatorio)</p>
                            </div>
                            
                            <!-- Nombre -->
                            <div>
                                <label class="form-label">Nombre <span class="required">*</span></label>
                                <input type="text" id="producto_nombre" class="form-input w-full" required
                                    onchange="generarSlugProducto()">
                            </div>
                            
                            <!-- Slug (URL) -->
                            <div>
                                <label class="form-label">Slug (URL)</label>
                                <div class="flex gap-2">
                                    <input type="text" id="producto_slug" class="form-input flex-1 bg-gray-50" 
                                        placeholder="se-genera-automaticamente">
                                    <button type="button" onclick="generarSlugProducto()" 
                                        class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                                <p class="text-xs text-gray-400 mt-1">URL amigable: /producto/[slug]</p>
                            </div>
                            
                            <!-- Orden -->
                            <div>
                                <label class="form-label">Orden</label>
                                <input type="number" id="producto_orden" class="form-input w-full" value="0">
                                <p class="text-xs text-gray-400 mt-1">Define el orden de aparición en listados</p>
                            </div>
                            
                            <!-- Estado - OBLIGATORIO -->
                            <div>
                                <label class="form-label">Estado <span class="required">*</span></label>
                                <select id="producto_activo" class="form-input w-full" required>
                                    <option value="true">Activo</option>
                                    <option value="false">Inactivo</option>
                                </select>
                            </div>
                            
                            <!-- Descripción Corta -->
                            <div class="col-span-2">
                                <label class="form-label">Descripción Corta</label>
                                <input type="text" id="producto_descripcion_corta" class="form-input w-full" 
                                    placeholder="Texto que aparece en el hero de la landing page">
                                <p class="text-xs text-gray-400 mt-1">Breve descripción que aparecerá en la sección principal</p>
                            </div>
                        </div>
                        
                        <!-- ============================================ -->
                        <!-- SEO -->
                        <!-- ============================================ -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="col-span-2">
                                <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                                    <i class="fab fa-searchengin mr-2"></i>SEO
                                </h3>
                            </div>
                            <div class="col-span-2">
                                <label class="form-label">Título SEO</label>
                                <input type="text" id="producto_titulo_seo" class="form-input w-full"
                                    placeholder="Título para buscadores (meta title)">
                            </div>
                            <div class="col-span-2">
                                <label class="form-label">Descripción SEO</label>
                                <textarea id="producto_descripcion_seo" class="form-input w-full" rows="2"
                                    placeholder="Meta description para SEO (máximo 160 caracteres)"></textarea>
                            </div>
                            <div class="col-span-2">
                                <label class="form-label">Palabras clave</label>
                                <input type="text" id="producto_palabras_clave" class="form-input w-full"
                                    placeholder="mármol, baldosas, piedra natural">
                                <p class="text-xs text-gray-400 mt-1">Separadas por comas</p>
                            </div>
                        </div>
                        
                        <!-- ============================================ -->
                        <!-- ESPECIFICACIONES TÉCNICAS -->
                        <!-- ============================================ -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="col-span-2">
                                <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                                    <i class="fas fa-microchip mr-2"></i>Especificaciones Técnicas
                                </h3>
                            </div>
                            
                            <!-- Familia - OBLIGATORIO -->
                            <div>
                                <label class="form-label">Familia <span class="required">*</span></label>
                                <div class="flex gap-2">
                                    <select id="producto_familia_id" class="form-input flex-1" required>
                                        <option value="">Seleccionar familia</option>
                                    </select>
                                    <button type="button" onclick="abrirModalAgregarFamilia()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Agregar nueva familia">
                                        <i class="fas fa-plus-circle text-primary"></i>
                                    </button>
                                </div>
                                <p class="text-xs text-gray-400 mt-1">Categoría principal del producto</p>
                            </div>
                            
                            <!-- Acabado -->
                            <div>
                                <label class="form-label">Acabado</label>
                                <div class="flex gap-2">
                                    <select id="producto_acabado_id" class="form-input flex-1">
                                        <option value="">Seleccionar acabado</option>
                                    </select>
                                    <button type="button" onclick="abrirModalAgregarAcabado()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Agregar nuevo acabado">
                                        <i class="fas fa-plus-circle text-primary"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Borde -->
                            <div>
                                <label class="form-label">Borde</label>
                                <div class="flex gap-2">
                                    <select id="producto_borde_id" class="form-input flex-1">
                                        <option value="">Seleccionar borde</option>
                                    </select>
                                    <button type="button" onclick="abrirModalAgregarBorde()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Agregar nuevo borde">
                                        <i class="fas fa-plus-circle text-primary"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Material -->
                            <div>
                                <label class="form-label">Material</label>
                                <div class="flex gap-2">
                                    <select id="producto_material_id" class="form-input flex-1">
                                        <option value="">Seleccionar material</option>
                                    </select>
                                    <button type="button" onclick="abrirModalAgregarMaterial()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Agregar nuevo material">
                                        <i class="fas fa-plus-circle text-primary"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Calidad -->
                            <div>
                                <label class="form-label">Calidad</label>
                                <div class="flex gap-2">
                                    <select id="producto_calidad_id" class="form-input flex-1">
                                        <option value="">Seleccionar calidad</option>
                                    </select>
                                    <button type="button" onclick="abrirModalAgregarCalidad()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Agregar nueva calidad">
                                        <i class="fas fa-plus-circle text-primary"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Unidad de Medida - OBLIGATORIO -->
                            <div>
                                <label class="form-label">Unidad de Medida <span class="required">*</span></label>
                                <select id="producto_unidad_medida_id" class="form-input w-full" required>
                                    <option value="">Seleccionar unidad de medida</option>
                                </select>
                                <p class="text-xs text-gray-400 mt-1">Unidad en la que se comercializa el producto (m², unidad, etc.)</p>
                            </div>
                            
                            <!-- Modelo -->
                            <div>
                                <label class="form-label">Modelo</label>
                                <input type="text" id="producto_modelo" class="form-input w-full" 
                                    placeholder="Ej: Negro Absoluto, White Diamond">
                            </div>
                            
                            <!-- Medida -->
                            <div>
                                <label class="form-label">Medida</label>
                                <input type="text" id="producto_medida" class="form-input w-full" 
                                    placeholder="Ej: 30 x 30 cm, 60 x 60 cm">
                            </div>
                            
                            <!-- Espesor -->
                            <div>
                                <label class="form-label">Espesor</label>
                                <input type="text" id="producto_espesor" class="form-input w-full" 
                                    placeholder="Ej: 1 cm, 2 cm">
                            </div>
                        </div>
                        
                        <!-- ============================================ -->
                        <!-- CATEGORÍAS ESPECIALES (OUTLET Y SALDOS) -->
                        <!-- ============================================ -->
                        <div class="grid grid-cols-1 gap-4 mb-4">
                            <div class="col-span-2">
                                <div class="flex justify-between items-center">
                                    <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                                        <i class="fas fa-tags mr-2"></i>Vitrinas Especiales
                                    </h3>
                                </div>
                                <p class="text-xs text-gray-400 mb-3">Selecciona las vitrinas donde aparecerá este producto</p>
                                
                                <div class="flex flex-wrap gap-6">
                                    <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                                        <input type="checkbox" id="categoria_outlet" value="OUTLET" class="categoria-especial-checkbox w-4 h-4 text-primary rounded focus:ring-primary">
                                        <div>
                                            <span class="font-medium text-gray-700">🏷️ Outlet</span>
                                            <p class="text-xs text-gray-400">Productos en liquidación / oferta</p>
                                        </div>
                                    </label>
                                    
                                    <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                                        <input type="checkbox" id="categoria_saldos" value="SALDOS_EXPORTACION" class="categoria-especial-checkbox w-4 h-4 text-primary rounded focus:ring-primary">
                                        <div>
                                            <span class="font-medium text-gray-700">📦 Saldos de Exportación</span>
                                            <p class="text-xs text-gray-400">Excedentes con estándares internacionales</p>
                                        </div>
                                    </label>
                                </div>
                                
                                <!-- Preview de etiquetas seleccionadas -->
                                <div id="categorias_especiales_preview" class="mt-3 flex flex-wrap gap-2">
                                    <span class="text-xs text-gray-400">No hay categorías especiales seleccionadas</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ============================================ -->
                        <!-- APLICACIONES -->
                        <!-- ============================================ -->
                        <div class="grid grid-cols-1 gap-4 mb-4">
                            <div class="col-span-2">
                                <div class="flex justify-between items-center">
                                    <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                                        <i class="fas fa-tags mr-2"></i>Aplicaciones
                                    </h3>
                                    <button type="button" onclick="abrirModalAgregarAplicacion()" 
                                            class="text-xs text-primary hover:underline flex items-center gap-1">
                                        <i class="fas fa-plus-circle"></i> Agregar nueva aplicación
                                    </button>
                                </div>
                                <div id="aplicaciones_container" class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div class="text-center text-gray-400 py-4">Cargando aplicaciones...</div>
                                </div>
                                <p class="text-xs text-gray-400 mt-2">
                                    <i class="fas fa-info-circle"></i> Seleccione una o múltiples aplicaciones donde se puede usar este producto
                                </p>
                            </div>
                        </div>
                        
                        <!-- ============================================ -->
                        <!-- IMÁGENES Y DOCUMENTOS -->
                        <!-- ============================================ -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="col-span-2">
                                <h3 class="font-semibold text-primary border-b pb-1 mb-3">
                                    <i class="fas fa-image mr-2"></i>Imágenes y Documentos
                                </h3>
                            </div>
                            
                            <!-- Imagen Principal -->
                            <div>
                                <label class="form-label">Imagen Principal (URL)</label>
                                <input type="url" id="producto_imagen_principal" class="form-input w-full" 
                                    placeholder="https://..."
                                    onchange="previsualizarImagen('producto_imagen_principal', 'preview_imagen_principal')">
                                <p class="text-xs text-gray-400 mt-1">URL de la imagen principal del producto (soporta Google Drive)</p>
                            </div>
                            
                            <!-- Vista previa de imagen principal -->
                            <div>
                                <label class="form-label">Vista previa</label>
                                <div id="preview_imagen_principal" class="mt-1">
                                    <div class="text-gray-400 text-sm italic">La vista previa aparecerá aquí</div>
                                </div>
                            </div>
                            
                            <!-- Galería de imágenes -->
                            <div class="col-span-2">
                                <label class="form-label">Galería de imágenes (URLs separadas por coma)</label>
                                <textarea id="producto_galeria" class="form-input w-full" rows="2" 
                                    placeholder="https://imagen1.jpg, https://imagen2.jpg, https://imagen3.jpg"></textarea>
                                <div id="preview_galeria" class="flex flex-wrap gap-2 mt-2"></div>
                                <p class="text-xs text-gray-400 mt-1">URLs de imágenes para la galería, separadas por comas (soporta Google Drive)</p>
                            </div>
                            
                            <!-- Rangos -->
                            <div class="col-span-2">
                                <label class="form-label">Rangos y Variaciones (URLs separadas por coma)</label>
                                <textarea id="producto_rangos" class="form-input w-full" rows="2" 
                                    placeholder="https://imagen1.jpg, https://imagen2.jpg, https://imagen3.jpg"></textarea>
                                <div id="preview_rangos" class="flex flex-wrap gap-2 mt-2"></div>
                                <p class="text-xs text-gray-400 mt-1">URLs de imágenes de rangos/variaciones, separadas por comas (soporta Google Drive)</p>
                            </div>
                            
                            <!-- Ficha Técnica -->
                            <div class="col-span-2">
                                <label class="form-label">Ficha Técnica (URL)</label>
                                <div class="flex gap-2">
                                    <input type="url" id="producto_ficha_tecnica" class="form-input flex-1" 
                                        placeholder="https://ejemplo.com/ficha-tecnica.pdf">
                                    <button type="button" onclick="previsualizarFichaTecnica()" 
                                            class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Vista previa">
                                        <i class="fas fa-external-link-alt"></i>
                                    </button>
                                </div>
                                <p class="text-xs text-gray-400 mt-1">Enlace a la ficha técnica (PDF, Google Drive, etc.)</p>
                            </div>
                            
                            <!-- Información sobre Google Drive -->
                            <div class="col-span-2 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                                <i class="fas fa-info-circle mr-2"></i>
                                <strong>Soporte para Google Drive:</strong> Puedes usar enlaces de Google Drive. 
                                El sistema los convertirá automáticamente para mostrar imágenes correctamente.
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                            <button type="button" onclick="cerrarModal('productoModal')" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar Producto</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
                
async function generarSlugProducto() {
    const nombre = document.getElementById('producto_nombre')?.value;
    if (!nombre) return;
    
    const codigo = document.getElementById('producto_codigo')?.value || '';
    
    function limpiarTexto(texto) {
        if (!texto) return '';
        return texto.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim();
    }
    
    // Construir slug: código-nombre (si hay código)
    let slug = '';
    if (codigo && codigo.trim() !== '') {
        slug = `${limpiarTexto(codigo)}-${limpiarTexto(nombre)}`;
    } else {
        slug = limpiarTexto(nombre);
    }
    
    // Verificar si el slug ya existe
    const { data: existente } = await window.supabaseClient
        .from('productos')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
    
    if (existente && existente.id !== productosEditandoId) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }
    
    const slugInput = document.getElementById('producto_slug');
    if (slugInput) slugInput.value = slug;
    
    console.log('🔗 Slug generado:', slug);
}
                
window.guardarProducto = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando producto...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const ahora = new Date().toISOString();
        
        // ============================================
        // OBTENER VALORES DE LOS SELECTS
        // ============================================
        
        const familiaSelect = document.getElementById('producto_familia_id');
        const acabadoSelect = document.getElementById('producto_acabado_id');
        const bordeSelect = document.getElementById('producto_borde_id');
        const materialSelect = document.getElementById('producto_material_id');
        const calidadSelect = document.getElementById('producto_calidad_id');
        const unidadMedidaSelect = document.getElementById('producto_unidad_medida_id');
        
        const familiaId = familiaSelect && familiaSelect.value !== '' ? familiaSelect.value : null;
        const acabadoId = acabadoSelect && acabadoSelect.value !== '' ? acabadoSelect.value : null;
        const bordeId = bordeSelect && bordeSelect.value !== '' ? bordeSelect.value : null;
        const materialId = materialSelect && materialSelect.value !== '' ? materialSelect.value : null;
        const calidadId = calidadSelect && calidadSelect.value !== '' ? calidadSelect.value : null;
        const unidadMedidaId = unidadMedidaSelect && unidadMedidaSelect.value !== '' ? unidadMedidaSelect.value : null;
        
        // ============================================
        // OBTENER CATEGORÍAS ESPECIALES (OUTLET Y SALDOS)
        // ============================================
        
        const categoriasEspeciales = [];
        if (document.getElementById('categoria_outlet')?.checked) {
            categoriasEspeciales.push('OUTLET');
        }
        if (document.getElementById('categoria_saldos')?.checked) {
            categoriasEspeciales.push('SALDOS_EXPORTACION');
        }
        
        // ============================================
        // OBTENER APLICACIONES SELECCIONADAS
        // ============================================
        
        let aplicacionesSeleccionadas = [];
        if (typeof obtenerAplicacionesSeleccionadas === 'function') {
            aplicacionesSeleccionadas = obtenerAplicacionesSeleccionadas();
        } else {
            const checkboxes = document.querySelectorAll('.aplicacion-checkbox:checked');
            aplicacionesSeleccionadas = Array.from(checkboxes).map(cb => cb.value);
        }
        
        // ============================================
        // PROCESAR GALERÍA Y RANGOS
        // ============================================
        
        const galeriaTexto = document.getElementById('producto_galeria')?.value || '';
        const galeria = galeriaTexto.split(',').map(u => u.trim()).filter(u => u);
        
        const rangosTexto = document.getElementById('producto_rangos')?.value || '';
        const rangos = rangosTexto.split(',').map(u => u.trim()).filter(u => u);
        
        // ============================================
        // VALIDACIONES DE CAMPOS OBLIGATORIOS
        // ============================================
        
        const codigo = document.getElementById('producto_codigo')?.value?.trim() || '';
        if (!codigo) {
            ocultarLoading();
            mostrarAlerta('Error', 'El código interno es obligatorio', 'error');
            document.getElementById('producto_codigo')?.focus();
            return;
        }
        
        const nombre = document.getElementById('producto_nombre')?.value?.trim() || '';
        if (!nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            document.getElementById('producto_nombre')?.focus();
            return;
        }
        
        if (!familiaId) {
            ocultarLoading();
            mostrarAlerta('Error', 'La familia es obligatoria', 'error');
            document.getElementById('producto_familia_id')?.focus();
            return;
        }
        
        if (!unidadMedidaId) {
            ocultarLoading();
            mostrarAlerta('Error', 'La unidad de medida es obligatoria', 'error');
            document.getElementById('producto_unidad_medida_id')?.focus();
            return;
        }
        
        // ============================================
        // VALIDAR CÓDIGO ÚNICO
        // ============================================
        
        let queryCodigo = window.supabaseClient
            .from('productos')
            .select('id')
            .eq('codigo', codigo);
        
        if (productosEditandoId) {
            queryCodigo = queryCodigo.neq('id', productosEditandoId);
        }
        
        const { data: codigoExistente } = await queryCodigo.maybeSingle();
        
        if (codigoExistente) {
            ocultarLoading();
            mostrarAlerta('Error', 'Ya existe un producto con este código. Por favor, use uno diferente.', 'error');
            document.getElementById('producto_codigo')?.focus();
            return;
        }
        
        // ============================================
        // PREPARAR DATOS DEL PRODUCTO
        // ============================================
        
        // Generar slug si está vacío
        let slug = document.getElementById('producto_slug')?.value?.trim() || '';
        if (!slug) {
            slug = nombre.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/--+/g, '-')
                .trim();
        }
        
        // Verificar que el slug sea único
        let querySlug = window.supabaseClient
            .from('productos')
            .select('id')
            .eq('slug', slug);
        
        if (productosEditandoId) {
            querySlug = querySlug.neq('id', productosEditandoId);
        }
        
        const { data: slugExistente } = await querySlug.maybeSingle();
        
        if (slugExistente) {
            slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }
        
        const data = {
            codigo: codigo,
            nombre: nombre,
            slug: slug,
            activo: document.getElementById('producto_activo')?.value === 'true',
            orden: parseInt(document.getElementById('producto_orden')?.value) || 0,
            descripcion_corta: document.getElementById('producto_descripcion_corta')?.value || null,
            titulo_seo: document.getElementById('producto_titulo_seo')?.value || null,
            descripcion_seo: document.getElementById('producto_descripcion_seo')?.value || null,
            palabras_clave: document.getElementById('producto_palabras_clave')?.value || null,
            familia_id: familiaId,
            acabado_id: acabadoId,
            borde_id: bordeId,
            material_id: materialId,
            calidad_id: calidadId,
            unidad_medida_id: unidadMedidaId,
            categorias_especiales: categoriasEspeciales,
            modelo: document.getElementById('producto_modelo')?.value?.trim() || null,
            medida: document.getElementById('producto_medida')?.value || null,
            espesor: document.getElementById('producto_espesor')?.value || null,
            imagen_principal: document.getElementById('producto_imagen_principal')?.value || null,
            galeria: galeria,
            rangos: rangos,
            ficha_tecnica_url: document.getElementById('producto_ficha_tecnica')?.value || null
        };
        
        let productoId;
        
        if (productosEditandoId) {
            // ============================================
            // MODO EDICIÓN
            // ============================================
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('productos')
                .update(data)
                .eq('id', productosEditandoId);
            
            if (error) throw error;
            productoId = productosEditandoId;
            
            // Actualizar aplicaciones
            const { error: deleteError } = await window.supabaseClient
                .from('producto_aplicaciones_rel')
                .delete()
                .eq('producto_id', productoId);
            
            if (deleteError) throw deleteError;
            
            if (aplicacionesSeleccionadas.length > 0) {
                const relaciones = aplicacionesSeleccionadas.map(appId => ({
                    producto_id: productoId,
                    aplicacion_id: appId
                }));
                
                const { error: insertError } = await window.supabaseClient
                    .from('producto_aplicaciones_rel')
                    .insert(relaciones);
                
                if (insertError) throw insertError;
            }
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Producto actualizado correctamente', 'success');
            
        } else {
            // ============================================
            // MODO CREACIÓN
            // ============================================
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            const { data: nuevo, error } = await window.supabaseClient
                .from('productos')
                .insert(data)
                .select()
                .single();
            
            if (error) throw error;
            productoId = nuevo.id;
            
            // Guardar aplicaciones
            if (aplicacionesSeleccionadas.length > 0) {
                const relaciones = aplicacionesSeleccionadas.map(appId => ({
                    producto_id: productoId,
                    aplicacion_id: appId
                }));
                
                const { error: insertError } = await window.supabaseClient
                    .from('producto_aplicaciones_rel')
                    .insert(relaciones);
                
                if (insertError) throw insertError;
            }
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Producto creado correctamente', 'success');
        }
        
        cerrarModal('productoModal');
        productosEditandoId = null;
        await cargarVistaProductos();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error al guardar producto:', error);
        
        let mensajeError = 'No se pudo guardar el producto';
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe un producto con este código o slug. Por favor, cambie el código.';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};
                
// ==================== EDITAR PRODUCTO ====================
window.editarProducto = async function(id) {
    mostrarLoading('Cargando producto...');
    
    try {
        // Obtener producto con todas las relaciones
        const { data: producto, error } = await window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                borde:borde_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre),
                aplicaciones_rel:producto_aplicaciones_rel (
                    aplicacion_id,
                    aplicacion:aplicacion_id (id, nombre, icono)
                )
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        console.log('📦 Producto cargado:', producto);
        
        productosEditandoId = id;
        
        // Verificar que el modal existe
        let modal = document.getElementById('productoModal');
        if (!modal) {
            crearModalProducto();
            modal = document.getElementById('productoModal');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        document.getElementById('productoModalTitle').innerText = 'Editar Producto';
        
        // ============================================
        // CARGAR SELECTS DE CATÁLOGOS
        // ============================================
        
        if (typeof cargarFamiliasSelect === 'function') {
            await cargarFamiliasSelect('producto_familia_id', true);
            const familiaSelect = document.getElementById('producto_familia_id');
            if (familiaSelect && producto.familia_id) {
                familiaSelect.value = producto.familia_id;
            }
        }
        
        if (typeof cargarAcabadosSelect === 'function') {
            await cargarAcabadosSelect('producto_acabado_id', true);
            const acabadoSelect = document.getElementById('producto_acabado_id');
            if (acabadoSelect && producto.acabado_id) {
                acabadoSelect.value = producto.acabado_id;
            }
        }
        
        if (typeof cargarBordesSelect === 'function') {
            await cargarBordesSelect('producto_borde_id', true);
            const bordeSelect = document.getElementById('producto_borde_id');
            if (bordeSelect && producto.borde_id) {
                bordeSelect.value = producto.borde_id;
            }
        }
        
        if (typeof cargarMaterialesSelect === 'function') {
            await cargarMaterialesSelect('producto_material_id', true);
            const materialSelect = document.getElementById('producto_material_id');
            if (materialSelect && producto.material_id) {
                materialSelect.value = producto.material_id;
            }
        }
        
        if (typeof cargarCalidadesSelect === 'function') {
            await cargarCalidadesSelect('producto_calidad_id', true);
            const calidadSelect = document.getElementById('producto_calidad_id');
            if (calidadSelect && producto.calidad_id) {
                calidadSelect.value = producto.calidad_id;
            }
        }
        
        // ============================================
        // CARGAR APLICACIONES
        // ============================================
        
        const aplicacionesSeleccionadasIds = (producto.aplicaciones_rel || []).map(rel => rel.aplicacion_id);
        
        if (typeof cargarAplicacionesCheckbox === 'function') {
            await cargarAplicacionesCheckbox('aplicaciones_container', aplicacionesSeleccionadasIds);
        }
        
        // ============================================
        // LLENAR CAMPOS DEL FORMULARIO
        // ============================================
        
        document.getElementById('producto_id').value = producto.id;
        document.getElementById('producto_codigo').value = producto.codigo || '';
        document.getElementById('producto_nombre').value = producto.nombre || '';
        document.getElementById('producto_slug').value = producto.slug || '';
        document.getElementById('producto_activo').value = producto.activo ? 'true' : 'false';
        document.getElementById('producto_orden').value = producto.orden || 0;
        document.getElementById('producto_descripcion_corta').value = producto.descripcion_corta || '';
        document.getElementById('producto_titulo_seo').value = producto.titulo_seo || '';
        document.getElementById('producto_descripcion_seo').value = producto.descripcion_seo || '';
        document.getElementById('producto_palabras_clave').value = producto.palabras_clave || '';
        document.getElementById('producto_modelo').value = producto.modelo || '';
        document.getElementById('producto_medida').value = producto.medida || '';
        document.getElementById('producto_espesor').value = producto.espesor || '';
        document.getElementById('producto_imagen_principal').value = producto.imagen_principal || '';
        document.getElementById('producto_ficha_tecnica').value = producto.ficha_tecnica_url || '';
        
        // Cargar categorías especiales (OUTLET y SALDOS)
        const categorias = producto.categorias_especiales || [];
        document.getElementById('categoria_outlet').checked = categorias.includes('OUTLET');
        document.getElementById('categoria_saldos').checked = categorias.includes('SALDOS_EXPORTACION');
        
        if (typeof inicializarCategoriasEspeciales === 'function') {
            inicializarCategoriasEspeciales();
        }
        
        // Galería
        const galeriaTexto = (producto.galeria || []).join(', ');
        document.getElementById('producto_galeria').value = galeriaTexto;
        
        // Rangos
        const rangosTexto = (producto.rangos || []).join(', ');
        document.getElementById('producto_rangos').value = rangosTexto;
        
        // ============================================
        // MOSTRAR VISTA PREVIA DE IMÁGENES
        // ============================================
        
        if (producto.imagen_principal && producto.imagen_principal.trim() !== '') {
            setTimeout(() => {
                if (typeof previsualizarImagen === 'function') {
                    previsualizarImagen('producto_imagen_principal', 'preview_imagen_principal');
                }
            }, 200);
        }
        
        if (producto.galeria && producto.galeria.length > 0) {
            setTimeout(() => {
                if (typeof mostrarPreviewGaleria === 'function') {
                    mostrarPreviewGaleria(producto.galeria);
                }
            }, 250);
        }
        
        if (producto.rangos && producto.rangos.length > 0) {
            setTimeout(() => {
                if (typeof mostrarPreviewRangos === 'function') {
                    mostrarPreviewRangos(producto.rangos);
                }
            }, 300);
        }
        
        ocultarLoading();
        
        // ============================================
        // ABRIR MODAL
        // ============================================
        await window.abrirModal('productoModal');
        
        // ============================================
        // CARGAR UNIDADES DE MEDIDA DESPUÉS DE ABRIR EL MODAL
        // ============================================
        setTimeout(async () => {
            console.log('🔄 Cargando unidades de medida en edición...');
            
            if (typeof window.cargarUnidadesMedidaSelect === 'function') {
                await window.cargarUnidadesMedidaSelect();
                
                // Restaurar el valor seleccionado después de cargar
                if (producto.unidad_medida_id) {
                    const select = document.getElementById('producto_unidad_medida_id');
                    if (select) {
                        select.value = producto.unidad_medida_id;
                        console.log(`✅ Unidad de medida restaurada: ${producto.unidad_medida_id}`);
                    }
                }
            } else if (typeof cargarUnidadesMedidaSelect === 'function') {
                await cargarUnidadesMedidaSelect();
                
                if (producto.unidad_medida_id) {
                    const select = document.getElementById('producto_unidad_medida_id');
                    if (select) {
                        select.value = producto.unidad_medida_id;
                    }
                }
            } else {
                // Función de respaldo directa
                try {
                    const select = document.getElementById('producto_unidad_medida_id');
                    if (select) {
                        const { data: unidades, error } = await window.supabaseClient
                            .from('unidad_medida')
                            .select('id, nombre, abreviatura')
                            .eq('activo', true)
                            .order('nombre');
                        
                        if (!error && unidades) {
                            select.innerHTML = '<option value="">Seleccionar unidad de medida</option>';
                            unidades.forEach(u => {
                                const option = document.createElement('option');
                                option.value = u.id;
                                let texto = u.nombre;
                                if (u.abreviatura) texto += ` (${u.abreviatura})`;
                                option.textContent = texto;
                                select.appendChild(option);
                            });
                            
                            if (producto.unidad_medida_id) {
                                select.value = producto.unidad_medida_id;
                            }
                            console.log(`✅ ${unidades.length} unidades cargadas con respaldo directo`);
                        }
                    }
                } catch (err) {
                    console.error('Error en respaldo:', err);
                }
            }
        }, 200);
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el producto: ' + error.message, 'error');
    }
};
                
                // ==================== ELIMINAR PRODUCTO ====================
                window.eliminarProducto = async function(id) {
                    const result = await Swal.fire({
                        title: '¿Eliminar producto?',
                        text: 'Esta acción no se puede deshacer. Las landing pages de este producto dejarán de funcionar.',
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
                                .from('productos')
                                .delete()
                                .eq('id', id);
                            
                            if (error) throw error;
                            
                            ocultarLoading();
                            mostrarAlerta('Éxito', 'Producto eliminado correctamente', 'success');
                            await cargarVistaProductos();
                            
                        } catch (error) {
                            ocultarLoading();
                            console.error('Error:', error);
                            mostrarAlerta('Error', 'No se pudo eliminar el producto', 'error');
                        }
                    }
                };
                
                // ==================== ACTIVAR/DESACTIVAR PRODUCTO ====================
                window.toggleEstadoProducto = async function(id, activoActual) {
                    const nuevoEstado = !activoActual;
                    const accion = nuevoEstado ? 'activar' : 'desactivar';
                    
                    const result = await Swal.fire({
                        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} producto?`,
                        text: `El producto ${accion === 'desactivar' ? 'no estará visible' : 'estará visible'} en las landing pages.`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: nuevoEstado ? '#28a745' : '#ffc107',
                        confirmButtonText: `Sí, ${accion}`,
                        cancelButtonText: 'Cancelar'
                    });
                    
                    if (result.isConfirmed) {
                        mostrarLoading('Actualizando...');
                        
                        try {
                            const ahora = new Date().toISOString();
                            
                            const { error } = await window.supabaseClient
                                .from('productos')
                                .update({
                                    activo: nuevoEstado,
                                    modificado_el: ahora,
                                    modificado_por: usuarioActual.id
                                })
                                .eq('id', id);
                            
                            if (error) throw error;
                            
                            ocultarLoading();
                            mostrarAlerta('Éxito', `Producto ${accion}do correctamente`, 'success');
                            await cargarVistaProductos();
                            
                        } catch (error) {
                            ocultarLoading();
                            console.error('Error:', error);
                            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
                        }
                    }
                };
                                
                function generarPaginadorProductos() {
                    let html = '';
                    const maxBotones = 5;
                    let inicio = Math.max(1, paginaActualProductos - Math.floor(maxBotones / 2));
                    let fin = Math.min(totalPaginasProductos, inicio + maxBotones - 1);
                    
                    if (fin - inicio + 1 < maxBotones) {
                        inicio = Math.max(1, fin - maxBotones + 1);
                    }
                    
                    for (let i = inicio; i <= fin; i++) {
                        html += `
                            <button onclick="cambiarPaginaProductos(${i})" 
                                    class="px-3 py-1 rounded-lg ${i === paginaActualProductos ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                                ${i}
                            </button>
                        `;
                    }
                    return html;
                }
                
                window.cambiarPaginaProductos = async function(pagina) {
                    if (pagina < 1 || pagina > totalPaginasProductos) return;
                    if (pagina === paginaActualProductos) return;
                    
                    const scrollY = window.scrollY;
                    paginaActualProductos = pagina;
                    await cargarVistaProductos();
                    setTimeout(() => window.scrollTo(0, scrollY), 100);
                };
                
                window.toggleVistaProductos = async function(vista) {
                    vistaProductosActual = vista;
                    await cargarVistaProductos();
                };
                
// ==================== FILTROS ====================
function inicializarEventosFiltrosProductos() {
    // Filtros que requieren clic en el botón "Buscar"
    const filtrosManuales = ['filtroFamiliaProducto', 'filtroAcabadoProducto', 'filtroMaterialProducto', 'filtroEstadoProducto'];
    
    filtrosManuales.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            // Remover eventos anteriores
            elemento.removeEventListener('change', window.aplicarFiltrosProductos);
            // No agregar evento automático - solo se aplica con el botón
        }
    });
    
    // Búsqueda automática con debounce (solo para el campo de búsqueda)
    const busquedaElement = document.getElementById('filtroBusquedaProducto');
    if (busquedaElement) {
        let timeoutBusqueda;
        busquedaElement.removeEventListener('input', window.handleBusquedaInput);
        window.handleBusquedaInput = function() {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                window.aplicarFiltrosProductos();
            }, 500);
        };
        busquedaElement.addEventListener('input', window.handleBusquedaInput);
    }
}
                
window.aplicarFiltrosProductos = async function() {
    const busqueda = document.getElementById('filtroBusquedaProducto')?.value;
    const familia = document.getElementById('filtroFamiliaProducto')?.value;
    const acabado = document.getElementById('filtroAcabadoProducto')?.value;
    const material = document.getElementById('filtroMaterialProducto')?.value;
    const estado = document.getElementById('filtroEstadoProducto')?.value;
    
    mostrarLoading('Filtrando productos...');
    
    try {
        let query = window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                borde:borde_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre)
            `);
        
        // Aplicar filtros SOLO si tienen valor
        if (busqueda && busqueda !== '') {
            query = query.or(`nombre.ilike.%${busqueda}%,slug.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`);
        }
        
        if (familia && familia !== '') {
            query = query.eq('familia_id', familia);
        }
        
        if (acabado && acabado !== '') {
            query = query.eq('acabado_id', acabado);
        }
        
        if (material && material !== '') {
            query = query.eq('material_id', material);
        }
        
        if (estado && estado !== '') {
            query = query.eq('activo', estado === 'true');
        }
        
        const { data: productos, error } = await query
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        totalProductosCount = productos?.length || 0;
        totalPaginasProductos = Math.ceil(totalProductosCount / ITEMS_POR_PAGINA_PRODUCTOS);
        paginaActualProductos = 1;
        
        const container = document.getElementById('productosContainer');
        if (container) {
            if (vistaProductosActual === 'tabla') {
                container.innerHTML = generarVistaTablaProductos(productos?.slice(0, ITEMS_POR_PAGINA_PRODUCTOS));
            } else {
                container.innerHTML = generarVistaCardsProductos(productos?.slice(0, ITEMS_POR_PAGINA_PRODUCTOS));
            }
        }
        
        // Actualizar badge de filtros activos
        let activos = 0;
        if (busqueda) activos++;
        if (familia) activos++;
        if (acabado) activos++;
        if (material) activos++;
        if (estado) activos++;
        
        const badge = document.getElementById('filtrosProductosBadge');
        if (badge) {
            if (activos > 0) {
                badge.textContent = activos;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        ocultarLoading();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error filtrando:', error);
        mostrarAlerta('Error', 'Error al filtrar productos: ' + (error.message || 'Error desconocido'), 'error');
    }
};
                
window.limpiarFiltrosProductos = function() {
    document.getElementById('filtroBusquedaProducto').value = '';
    document.getElementById('filtroFamiliaProducto').value = '';
    document.getElementById('filtroAcabadoProducto').value = '';
    document.getElementById('filtroMaterialProducto').value = '';
    document.getElementById('filtroEstadoProducto').value = '';
    
    paginaActualProductos = 1;
    cargarVistaProductos();
    
    // Ocultar badge
    const badge = document.getElementById('filtrosProductosBadge');
    if (badge) badge.classList.add('hidden');
};
                
window.toggleFiltrosProductosPanel = function() {
    const panel = document.getElementById('panelFiltrosProductos');
    const icon = document.getElementById('filtrosProductosIcon');
    
    if (!panel) {
        console.warn('Panel de filtros no encontrado');
        return;
    }
    
    // Verificar si el panel está visible
    const estaVisible = !panel.classList.contains('hidden');
    
    if (estaVisible) {
        // Ocultar panel
        panel.classList.add('hidden');
        panel.style.display = 'none';
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        }
        console.log('🔒 Panel de filtros cerrado');
    } else {
        // Mostrar panel
        panel.classList.remove('hidden');
        panel.style.display = '';
        if (icon) {
            icon.style.transform = 'rotate(180deg)';
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
        console.log('🔓 Panel de filtros abierto');
    }
};
                
                // ==================== VISTA PREVIA FICHA TÉCNICA ====================
                window.verFichaTecnicaPrevia = function() {
                    const url = document.getElementById('producto_ficha_tecnica').value;
                    if (!url) {
                        mostrarAlerta('Aviso', 'Primero ingrese una URL de ficha técnica', 'info');
                        return;
                    }
                    
                    // Abrir en nueva pestaña
                    window.open(url, '_blank');
                };

function previsualizarImagen(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input || !preview) {
        console.warn(`No se encontró el input ${inputId} o el preview ${previewId}`);
        return;
    }
    
    let url = input.value.trim();
    
    if (!url) {
        preview.innerHTML = '<div class="text-gray-400 text-sm italic">La vista previa aparecerá aquí</div>';
        return;
    }
    
    // Función para optimizar URL de Google Drive
    function optimizarGoogleDriveUrl(url) {
        if (!url) return 'FOTO/foto_01.webp';
        
        // Si ya es una URL de imagen directa de Google Drive
        if (url.includes('googleusercontent.com')) return url;
        if (url.includes('drive.google.com')) {
            const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                return `https://lh3.googleusercontent.com/d/${match[1]}`;
            }
        }
        return url;
    }
    
    const urlOptimizada = optimizarGoogleDriveUrl(url);
    
    preview.innerHTML = `
        <div class="relative inline-block">
            <img src="${urlOptimizada}" 
                 class="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                 onerror="this.onerror=null; this.src='FOTO/foto_01.webp'; console.error('Error cargando imagen:', '${urlOptimizada}');">
            <button type="button" 
                    onclick="limpiarImagen('${inputId}', '${previewId}')" 
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    title="Eliminar imagen">
                ×
            </button>
            ${urlOptimizada.includes('googleusercontent.com') ? '<span class="absolute -bottom-5 left-0 text-[10px] text-blue-500 whitespace-nowrap">✓ Google Drive</span>' : ''}
        </div>
    `;
}

function cargarPreviewImagenDesdeValor(inputId, previewId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const valor = input.value;
    if (valor && valor.trim() !== '') {
        previsualizarImagen(inputId, previewId);
    } else {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.innerHTML = '<div class="text-gray-400 text-sm italic">La vista previa aparecerá aquí</div>';
        }
    }
}

// ==================== LIMPIAR IMAGEN ====================
function limpiarImagen(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input) {
        input.value = '';
        // Disparar el evento change manualmente
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    }
    
    if (preview) {
        preview.innerHTML = '<div class="text-gray-400 text-sm italic">La vista previa aparecerá aquí</div>';
    }
}

// ==================== VISTA PREVIA DE FICHA TÉCNICA ====================
window.previsualizarFichaTecnica = function() {
    const url = document.getElementById('producto_ficha_tecnica')?.value;
    
    if (!url || url.trim() === '') {
        mostrarAlerta('Aviso', 'Primero ingrese una URL de ficha técnica', 'info');
        return;
    }
    
    // Optimizar URL si es de Google Drive
    let urlOptimizada = url;
    if (typeof window.esGoogleDriveUrl === 'function' && window.esGoogleDriveUrl(url)) {
        urlOptimizada = window.convertirGoogleDrivePreview(url);
    }
    
    // Abrir en nueva pestaña
    window.open(urlOptimizada, '_blank');
};

// Función para mostrar preview de galería
function mostrarPreviewGaleria(urls) {
    const container = document.getElementById('preview_galeria');
    if (!container) return;
    
    if (!urls || urls.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = urls.map((url, i) => `
        <div class="relative group">
            <img src="${optimizarUrlGoogleDrive(url, 'imagen')}" 
                 class="w-20 h-20 object-cover rounded-lg border border-gray-200" 
                 onerror="this.src='FOTO/foto_01.webp'">
            <button type="button" 
                    onclick="eliminarImagenGaleria(${i})" 
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                ×
            </button>
        </div>
    `).join('');
}

// Función para eliminar imagen de galería
function eliminarImagenGaleria(index) {
    const textarea = document.getElementById('producto_galeria');
    const urls = textarea.value.split(',').map(u => u.trim()).filter(u => u);
    urls.splice(index, 1);
    textarea.value = urls.join(', ');
    mostrarPreviewGaleria(urls);
}

// ==================== CRUD PARA CATÁLOGOS DE PRODUCTOS ====================

// ============================================
// VARIABLES GLOBALES PARA CATÁLOGOS
// ============================================
let catalogoEditandoId = null;
let catalogoTipoActual = '';

// ============================================
// FUNCIONES PARA CARGAR SELECTS (COMUNES)
// ============================================

async function cargarFamiliasSelect(selectId, incluirVacio = true, valorSeleccionado = null) {
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_familias')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar familia</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay familias registradas</option>';
            return;
        }
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            let texto = item.nombre;
            if (item.descripcion) texto += ` (${item.descripcion.substring(0, 30)})`;
            option.textContent = texto;
            if (valorSeleccionado && valorSeleccionado === item.id) option.selected = true;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando familias:', error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar familias</option>';
    }
}

async function cargarAcabadosSelect(selectId, incluirVacio = true, valorSeleccionado = null) {
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_acabados')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar acabado</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay acabados registrados</option>';
            return;
        }
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            let texto = item.nombre;
            if (item.descripcion) texto += ` (${item.descripcion.substring(0, 30)})`;
            option.textContent = texto;
            if (valorSeleccionado && valorSeleccionado === item.id) option.selected = true;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando acabados:', error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar acabados</option>';
    }
}

async function cargarBordesSelect(selectId, incluirVacio = true, valorSeleccionado = null) {
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_bordes')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar borde</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay bordes registrados</option>';
            return;
        }
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            let texto = item.nombre;
            if (item.descripcion) texto += ` (${item.descripcion.substring(0, 30)})`;
            option.textContent = texto;
            if (valorSeleccionado && valorSeleccionado === item.id) option.selected = true;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando bordes:', error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar bordes</option>';
    }
}

async function cargarMaterialesSelect(selectId, incluirVacio = true, valorSeleccionado = null) {
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_materiales')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar material</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay materiales registrados</option>';
            return;
        }
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            let texto = item.nombre;
            if (item.descripcion) texto += ` (${item.descripcion.substring(0, 30)})`;
            option.textContent = texto;
            if (valorSeleccionado && valorSeleccionado === item.id) option.selected = true;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando materiales:', error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar materiales</option>';
    }
}

async function cargarAplicacionesCheckbox(containerId, aplicacionesSeleccionadas = []) {
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_aplicaciones')
            .select('id, nombre, icono, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">No hay aplicaciones registradas</div>';
            return;
        }
        
        // Crear array de IDs seleccionados para fácil verificación
        const seleccionadosSet = new Set(aplicacionesSeleccionadas);
        
        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                ${data.map(app => `
                    <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <input type="checkbox" 
                               value="${app.id}" 
                               class="aplicacion-checkbox w-4 h-4 text-primary rounded focus:ring-primary"
                               ${seleccionadosSet.has(app.id) ? 'checked' : ''}>
                        <i class="fas ${app.icono || 'fa-tag'} text-primary text-sm w-5"></i>
                        <span class="text-sm text-gray-700">${app.nombre}</span>
                        ${app.descripcion ? `<span class="text-xs text-gray-400 hidden md:inline">(${app.descripcion.substring(0, 20)})</span>` : ''}
                    </label>
                `).join('')}
            </div>
            <div class="text-xs text-gray-400 mt-2 text-center">
                <i class="fas fa-info-circle"></i> Seleccione una o múltiples aplicaciones
            </div>
        `;
        
    } catch (error) {
        console.error('Error cargando aplicaciones:', error);
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '<div class="text-center text-red-500 py-4">Error al cargar aplicaciones</div>';
    }
}

// ==================== CARGAR UNIDADES DE MEDIDA (VERSIÓN MEJORADA) ====================
async function cargarUnidadesMedidaSelect() {
    console.log('🔄 Cargando unidades de medida...');
    
    try {
        // Verificar que Supabase esté disponible
        if (!window.supabaseClient) {
            console.error('❌ Supabase no está disponible');
            return;
        }
        
        // Obtener unidades de medida activas
        const { data: unidades, error } = await window.supabaseClient
            .from('unidad_medida')
            .select('id, codigo, nombre, nombre_plural, abreviatura, orden')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) {
            console.error('❌ Error consultando unidad_medida:', error);
            throw error;
        }
        
        console.log('📊 Unidades de medida obtenidas:', unidades?.length || 0);
        
        const select = document.getElementById('producto_unidad_medida_id');
        if (!select) {
            console.error('❌ Select producto_unidad_medida_id no encontrado en el DOM');
            return;
        }
        
        // Limpiar y cargar opciones
        select.innerHTML = '<option value="">Seleccionar unidad de medida</option>';
        
        if (!unidades || unidades.length === 0) {
            console.warn('⚠️ No hay unidades de medida registradas');
            select.innerHTML += '<option value="" disabled>No hay unidades de medida registradas</option>';
            select.disabled = true;
            return;
        }
        
        // Agrupar unidades por orden
        unidades.forEach(unidad => {
            const option = document.createElement('option');
            option.value = unidad.id;
            
            // Construir texto informativo
            let texto = unidad.nombre;
            if (unidad.abreviatura) {
                texto += ` (${unidad.abreviatura})`;
            }
            if (unidad.codigo) {
                texto += ` [${unidad.codigo}]`;
            }
            option.textContent = texto;
            
            // Guardar metadatos en data attributes
            option.dataset.nombre = unidad.nombre;
            option.dataset.nombrePlural = unidad.nombre_plural || `${unidad.nombre}s`;
            option.dataset.abreviatura = unidad.abreviatura || '';
            option.dataset.codigo = unidad.codigo || '';
            option.dataset.orden = unidad.orden || 0;
            
            select.appendChild(option);
        });
        
        select.disabled = false;
        console.log(`✅ ${unidades.length} unidades de medida cargadas correctamente`);
        
        // Disparar evento personalizado
        const event = new CustomEvent('unidadesCargadas', { detail: { count: unidades.length } });
        select.dispatchEvent(event);
        
    } catch (error) {
        console.error('❌ Error cargando unidades de medida:', error);
        
        const select = document.getElementById('producto_unidad_medida_id');
        if (select) {
            select.innerHTML = '<option value="">Error al cargar unidades de medida</option>';
            select.disabled = false;
        }
        
        // Mostrar alerta al usuario
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta('Error', 'No se pudieron cargar las unidades de medida. Contacte al administrador.', 'error');
        }
    }
}

// Exponer globalmente
window.cargarUnidadesMedidaSelect = cargarUnidadesMedidaSelect;

// Función de prueba para diagnosticar
async function testCargarUnidades() {
    console.log('🔍 INICIANDO PRUEBA DE CARGA');
    
    // 1. Verificar select
    const select = document.getElementById('producto_unidad_medida_id');
    if (!select) {
        console.error('❌ Select NO encontrado');
        return;
    }
    console.log('✅ Select encontrado:', select.id);
    
    // 2. Consultar Supabase
    console.log('📡 Consultando Supabase...');
    const { data, error } = await window.supabaseClient
        .from('unidad_medida')
        .select('id, codigo, nombre, nombre_plural, abreviatura')
        .eq('activo', true)
        .order('orden');
    
    if (error) {
        console.error('❌ Error en consulta:', error);
        return;
    }
    console.log('✅ Datos obtenidos:', data?.length || 0, 'registros');
    
    // 3. Limpiar y llenar select
    select.innerHTML = '<option value="">Seleccionar unidad de medida</option>';
    
    if (!data || data.length === 0) {
        console.warn('⚠️ No hay datos');
        select.innerHTML += '<option value="" disabled>No hay unidades disponibles</option>';
        return;
    }
    
    let contador = 0;
    data.forEach(unidad => {
        const option = document.createElement('option');
        option.value = unidad.id;
        let texto = unidad.nombre;
        if (unidad.abreviatura) texto += ` (${unidad.abreviatura})`;
        option.textContent = texto;
        select.appendChild(option);
        contador++;
    });
    
    console.log(`✅ Se cargaron ${contador} opciones en el select`);
    console.log('Opciones finales:', select.options.length);
}

function obtenerAplicacionesSeleccionadas() {
    const checkboxes = document.querySelectorAll('.aplicacion-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// ==================== CRUD PARA CALIDADES ====================

async function cargarCalidadesSelect(selectId, incluirVacio = true, valorSeleccionado = null) {
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_calidades')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('orden', { ascending: true })
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar calidad</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay calidades registradas</option>';
            return;
        }
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            let texto = item.nombre;
            if (item.descripcion) texto += ` (${item.descripcion.substring(0, 40)})`;
            option.textContent = texto;
            if (valorSeleccionado && valorSeleccionado === item.id) option.selected = true;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando calidades:', error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar calidades</option>';
    }
}

// Modal para agregar nueva calidad
function crearModalCalidad() {
    if (document.getElementById('calidadModal')) return;
    
    const modalHtml = `
        <div id="calidadModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl w-full max-w-md">
                <div class="bg-primary text-white p-4 rounded-t-xl flex justify-between items-center">
                    <h2 class="text-xl font-bold" id="calidadModalTitle">Nueva Calidad</h2>
                    <button onclick="cerrarModal('calidadModal')" class="hover:bg-primary-dark p-2 rounded-lg"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6">
                    <form id="calidadForm" onsubmit="guardarCalidad(event)">
                        <input type="hidden" id="calidad_id">
                        <div class="mb-4">
                            <label class="form-label">Nombre *</label>
                            <input type="text" id="calidad_nombre" class="form-input w-full" required>
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Descripción</label>
                            <textarea id="calidad_descripcion" class="form-input w-full" rows="2"></textarea>
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Orden</label>
                            <input type="number" id="calidad_orden" class="form-input w-full" value="0">
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Estado</label>
                            <select id="calidad_activo" class="form-input w-full">
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                        <div class="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onclick="cerrarModal('calidadModal')" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.abrirModalAgregarCalidad = async function() {
    crearModalCalidad();
    calidadEditandoId = null;
    
    const form = document.getElementById('calidadForm');
    if (form) form.reset();
    
    document.getElementById('calidadModalTitle').innerText = 'Nueva Calidad';
    document.getElementById('calidad_activo').value = 'true';
    document.getElementById('calidad_orden').value = '0';
    
    await window.abrirModal('calidadModal');
};

window.guardarCalidad = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando calidad...');
    
    try {
        const calidadId = document.getElementById('calidad_id').value;
        const data = {
            nombre: document.getElementById('calidad_nombre').value,
            descripcion: document.getElementById('calidad_descripcion').value || null,
            orden: parseInt(document.getElementById('calidad_orden').value) || 0,
            activo: document.getElementById('calidad_activo').value === 'true'
        };
        
        if (!data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            return;
        }
        
        if (calidadId) {
            await window.supabaseClient
                .from('producto_calidades')
                .update(data)
                .eq('id', calidadId);
            mostrarAlerta('Éxito', 'Calidad actualizada', 'success');
        } else {
            await window.supabaseClient
                .from('producto_calidades')
                .insert(data);
            mostrarAlerta('Éxito', 'Calidad creada', 'success');
        }
        
        cerrarModal('calidadModal');
        await recargarSelectCalidades();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la calidad', 'error');
    }
};

async function recargarSelectCalidades() {
    const select = document.getElementById('producto_calidad_id');
    if (select) {
        await cargarCalidadesSelect('producto_calidad_id', true, null);
    }
}

// ============================================
// FUNCIONES PARA ABRIR MODALES DE CATÁLOGOS
// ============================================

function crearModalCatalogo() {
    // Verificar si el modal ya existe
    if (document.getElementById('catalogoModal')) return;
    
    const modalHtml = `
        <div id="catalogoModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl w-full max-w-md">
                <div class="bg-primary text-white p-4 rounded-t-xl flex justify-between items-center">
                    <h2 class="text-xl font-bold" id="catalogoModalTitle">Nuevo Elemento</h2>
                    <button onclick="cerrarModal('catalogoModal')" class="hover:bg-primary-dark p-2 rounded-lg">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6">
                    <form id="catalogoForm" onsubmit="guardarCatalogo(event)">
                        <input type="hidden" id="catalogo_id">
                        <input type="hidden" id="catalogo_tipo">
                        
                        <div class="mb-4">
                            <label class="form-label">Nombre *</label>
                            <input type="text" id="catalogo_nombre" class="form-input w-full" required>
                        </div>
                        
                        <div class="mb-4">
                            <label class="form-label">Descripción</label>
                            <textarea id="catalogo_descripcion" class="form-input w-full" rows="2"></textarea>
                        </div>
                        
                        <div class="mb-4">
                            <label class="form-label">Ícono (solo para aplicaciones)</label>
                            <div class="flex gap-2">
                                <input type="text" id="catalogo_icono" class="form-input flex-1" placeholder="fas fa-tag">
                                <button type="button" onclick="seleccionarIcono()" class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                                    <i class="fas fa-icons"></i>
                                </button>
                            </div>
                            <p class="text-xs text-gray-400 mt-1">Clases de Font Awesome (ej: fas fa-star, fa-building)</p>
                        </div>
                        
                        <div class="mb-4">
                            <label class="form-label">Orden</label>
                            <input type="number" id="catalogo_orden" class="form-input w-full" value="0">
                        </div>
                        
                        <div class="mb-4">
                            <label class="form-label">Estado</label>
                            <select id="catalogo_activo" class="form-input w-full">
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onclick="cerrarModal('catalogoModal')" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.abrirModalAgregarFamilia = async function() {
    crearModalCatalogo();
    catalogoTipoActual = 'familia';
    catalogoEditandoId = null;
    
    const form = document.getElementById('catalogoForm');
    if (form) form.reset();
    
    document.getElementById('catalogoModalTitle').innerText = 'Nueva Familia';
    document.getElementById('catalogo_tipo').value = 'familia';
    document.getElementById('catalogo_activo').value = 'true';
    document.getElementById('catalogo_orden').value = '0';
    
    // Ocultar campo de ícono (no aplica para familias)
    document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'none';
    
    await window.abrirModal('catalogoModal');
};

window.abrirModalAgregarAcabado = async function() {
    crearModalCatalogo();
    catalogoTipoActual = 'acabado';
    catalogoEditandoId = null;
    
    const form = document.getElementById('catalogoForm');
    if (form) form.reset();
    
    document.getElementById('catalogoModalTitle').innerText = 'Nuevo Acabado';
    document.getElementById('catalogo_tipo').value = 'acabado';
    document.getElementById('catalogo_activo').value = 'true';
    document.getElementById('catalogo_orden').value = '0';
    
    // Ocultar campo de ícono (no aplica para acabados)
    document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'none';
    
    await window.abrirModal('catalogoModal');
};

window.abrirModalAgregarBorde = async function() {
    crearModalCatalogo();
    catalogoTipoActual = 'borde';
    catalogoEditandoId = null;
    
    const form = document.getElementById('catalogoForm');
    if (form) form.reset();
    
    document.getElementById('catalogoModalTitle').innerText = 'Nuevo Borde';
    document.getElementById('catalogo_tipo').value = 'borde';
    document.getElementById('catalogo_activo').value = 'true';
    document.getElementById('catalogo_orden').value = '0';
    
    // Ocultar campo de ícono (no aplica para bordes)
    document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'none';
    
    await window.abrirModal('catalogoModal');
};

window.abrirModalAgregarMaterial = async function() {
    crearModalCatalogo();
    catalogoTipoActual = 'material';
    catalogoEditandoId = null;
    
    const form = document.getElementById('catalogoForm');
    if (form) form.reset();
    
    document.getElementById('catalogoModalTitle').innerText = 'Nuevo Material';
    document.getElementById('catalogo_tipo').value = 'material';
    document.getElementById('catalogo_activo').value = 'true';
    document.getElementById('catalogo_orden').value = '0';
    
    // Ocultar campo de ícono (no aplica para materiales)
    document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'none';
    
    await window.abrirModal('catalogoModal');
};

window.abrirModalAgregarAplicacion = async function() {
    crearModalCatalogo();
    catalogoTipoActual = 'aplicacion';
    catalogoEditandoId = null;
    
    const form = document.getElementById('catalogoForm');
    if (form) form.reset();
    
    document.getElementById('catalogoModalTitle').innerText = 'Nueva Aplicación';
    document.getElementById('catalogo_tipo').value = 'aplicacion';
    document.getElementById('catalogo_activo').value = 'true';
    document.getElementById('catalogo_orden').value = '0';
    document.getElementById('catalogo_icono').value = 'fas fa-tag';
    
    // Mostrar campo de ícono (aplica para aplicaciones)
    document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'block';
    
    await window.abrirModal('catalogoModal');
};

// ============================================
// GUARDAR CATÁLOGO
// ============================================
window.guardarCatalogo = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const tipo = document.getElementById('catalogo_tipo').value;
        const nombre = document.getElementById('catalogo_nombre').value.trim();
        const descripcion = document.getElementById('catalogo_descripcion').value || null;
        const orden = parseInt(document.getElementById('catalogo_orden').value) || 0;
        const activo = document.getElementById('catalogo_activo').value === 'true';
        const icono = document.getElementById('catalogo_icono').value || null;
        
        if (!nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            return;
        }
        
        let tabla = '';
        switch(tipo) {
            case 'familia': tabla = 'producto_familias'; break;
            case 'acabado': tabla = 'producto_acabados'; break;
            case 'borde': tabla = 'producto_bordes'; break;
            case 'material': tabla = 'producto_materiales'; break;
            case 'aplicacion': tabla = 'producto_aplicaciones'; break;
            default: throw new Error('Tipo inválido');
        }
        
        const data = { nombre, descripcion, orden, activo };
        if (tipo === 'aplicacion') data.icono = icono;
        
        const ahora = new Date().toISOString();
        
        if (catalogoEditandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from(tabla)
                .update(data)
                .eq('id', catalogoEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `${getNombreTipo(tipo)} actualizado correctamente`, 'success');
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from(tabla)
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `${getNombreTipo(tipo)} creado correctamente`, 'success');
        }
        
        cerrarModal('catalogoModal');
        
        // Recargar los selects correspondientes
        await recargarSelectsPorTipo(tipo);
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        
        let mensaje = 'No se pudo guardar';
        if (error.message?.includes('duplicate')) {
            mensaje = 'Ya existe un registro con este nombre';
        }
        mostrarAlerta('Error', mensaje, 'error');
    }
};

// ============================================
// EDITAR CATÁLOGO
// ============================================
window.editarCatalogo = async function(id, tipo, nombreActual, descripcionActual, ordenActual, activoActual, iconoActual = null) {
    crearModalCatalogo();
    catalogoTipoActual = tipo;
    catalogoEditandoId = id;
    
    document.getElementById('catalogoModalTitle').innerText = `Editar ${getNombreTipo(tipo)}`;
    document.getElementById('catalogo_tipo').value = tipo;
    document.getElementById('catalogo_nombre').value = nombreActual || '';
    document.getElementById('catalogo_descripcion').value = descripcionActual || '';
    document.getElementById('catalogo_orden').value = ordenActual || 0;
    document.getElementById('catalogo_activo').value = activoActual ? 'true' : 'false';
    
    if (tipo === 'aplicacion') {
        document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'block';
        document.getElementById('catalogo_icono').value = iconoActual || 'fas fa-tag';
    } else {
        document.getElementById('catalogo_icono').closest('.mb-4').style.display = 'none';
    }
    
    await window.abrirModal('catalogoModal');
};

// ============================================
// ELIMINAR CATÁLOGO
// ============================================
window.eliminarCatalogo = async function(id, tipo, nombre) {
    // Verificar si hay productos usando este catálogo
    let tablaProducto = '';
    let campoRelacion = '';
    
    switch(tipo) {
        case 'familia':
            tablaProducto = 'productos';
            campoRelacion = 'familia_id';
            break;
        case 'acabado':
            tablaProducto = 'productos';
            campoRelacion = 'acabado_id';
            break;
        case 'borde':
            tablaProducto = 'productos';
            campoRelacion = 'borde_id';
            break;
        case 'material':
            tablaProducto = 'productos';
            campoRelacion = 'material_id';
            break;
        case 'aplicacion':
            tablaProducto = 'producto_aplicaciones_rel';
            campoRelacion = 'aplicacion_id';
            break;
        default: return;
    }
    
    const { count } = await window.supabaseClient
        .from(tablaProducto)
        .select('*', { count: 'exact', head: true })
        .eq(campoRelacion, id);
    
    if (count > 0) {
        mostrarAlerta('Error', `No se puede eliminar porque ${count} producto(s) lo están usando`, 'error');
        return;
    }
    
    const result = await Swal.fire({
        title: `¿Eliminar ${getNombreTipo(tipo)}?`,
        text: `¿Está seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Eliminando...');
        
        try {
            let tabla = '';
            switch(tipo) {
                case 'familia': tabla = 'producto_familias'; break;
                case 'acabado': tabla = 'producto_acabados'; break;
                case 'borde': tabla = 'producto_bordes'; break;
                case 'material': tabla = 'producto_materiales'; break;
                case 'aplicacion': tabla = 'producto_aplicaciones'; break;
            }
            
            const { error } = await window.supabaseClient
                .from(tabla)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `${getNombreTipo(tipo)} eliminado correctamente`, 'success');
            
            // Recargar los selects correspondientes
            await recargarSelectsPorTipo(tipo);
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getNombreTipo(tipo) {
    const nombres = {
        'familia': 'Familia',
        'acabado': 'Acabado',
        'borde': 'Borde',
        'material': 'Material',
        'aplicacion': 'Aplicación'
    };
    return nombres[tipo] || 'Elemento';
}

async function recargarSelectsPorTipo(tipo) {
    switch(tipo) {
        case 'familia':
            await cargarFamiliasSelect('producto_familia_id', true, null);
            break;
        case 'acabado':
            await cargarAcabadosSelect('producto_acabado_id', true, null);
            break;
        case 'borde':
            await cargarBordesSelect('producto_borde_id', true, null);
            break;
        case 'material':
            await cargarMaterialesSelect('producto_material_id', true, null);
            break;
        case 'aplicacion':
            // Recargar aplicaciones en el contenedor si está abierto
            const productoId = productosEditandoId;
            let aplicacionesActuales = [];
            if (productoId) {
                const { data: relaciones } = await window.supabaseClient
                    .from('producto_aplicaciones_rel')
                    .select('aplicacion_id')
                    .eq('producto_id', productoId);
                aplicacionesActuales = relaciones?.map(r => r.aplicacion_id) || [];
            }
            await cargarAplicacionesCheckbox('aplicaciones_container', aplicacionesActuales);
            break;
    }
}

// ============================================
// VISTAS PARA ADMINISTRAR CATÁLOGOS
// ============================================

async function cargarVistaFamilias() {
    mostrarLoading('Cargando familias...');
    
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_familias')
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
                            <i class="fas fa-layer-group"></i> Familias de Productos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona las familias de productos (Baldosas, Mármoles, etc.)</p>
                    </div>
                    <button onclick="abrirModalAgregarFamilia()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nueva Familia
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${data?.map(item => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${item.nombre}</td>
                                    <td class="px-4 py-3 text-sm max-w-xs truncate">${item.descripcion || '-'}</td>
                                    <td class="px-4 py-3 text-sm">${item.orden || 0}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${item.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                     </div>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="editarCatalogo('${item.id}', 'familia', '${item.nombre}', '${item.descripcion || ''}', ${item.orden || 0}, ${item.activo})" 
                                                class="text-primary hover:text-primary-dark p-1" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="eliminarCatalogo('${item.id}', 'familia', '${item.nombre}')" 
                                                class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                     </div>
                                 </tr>
                            `).join('')}
                            ${(!data || data.length === 0) ? '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay familias registradas</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar familias: ' + error.message);
    }
}

// ============================================
// VISTA PARA ACABADOS
// ============================================
async function cargarVistaAcabados() {
    mostrarLoading('Cargando acabados...');
    
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_acabados')
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
                            <i class="fas fa-palette"></i> Acabados de Productos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona los acabados de productos (Pulido Premium, Apomazado, etc.)</p>
                    </div>
                    <button onclick="abrirModalAgregarAcabado()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nuevo Acabado
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${data?.map(item => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${escapeHtml(item.nombre)}</td>
                                    <td class="px-4 py-3 text-sm max-w-xs truncate">${escapeHtml(item.descripcion || '-')}</td>
                                    <td class="px-4 py-3 text-sm">${item.orden || 0}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${item.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="editarCatalogo('${item.id}', 'acabado', '${escapeHtml(item.nombre)}', '${escapeHtml(item.descripcion || '')}', ${item.orden || 0}, ${item.activo})" 
                                                class="text-primary hover:text-primary-dark p-1" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="eliminarCatalogo('${item.id}', 'acabado', '${escapeHtml(item.nombre)}')" 
                                                class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                 </tr>
                            `).join('')}
                            ${(!data || data.length === 0) ? '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay acabados registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar acabados: ' + error.message);
    }
}

// ============================================
// VISTA PARA BORDES
// ============================================
async function cargarVistaBordes() {
    mostrarLoading('Cargando bordes...');
    
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_bordes')
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
                            <i class="fas fa-border-all"></i> Bordes de Productos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona los tipos de borde (Rectificado, Biselado, Redondeado, etc.)</p>
                    </div>
                    <button onclick="abrirModalAgregarBorde()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nuevo Borde
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${data?.map(item => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${escapeHtml(item.nombre)}</td>
                                    <td class="px-4 py-3 text-sm max-w-xs truncate">${escapeHtml(item.descripcion || '-')}</td>
                                    <td class="px-4 py-3 text-sm">${item.orden || 0}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${item.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="editarCatalogo('${item.id}', 'borde', '${escapeHtml(item.nombre)}', '${escapeHtml(item.descripcion || '')}', ${item.orden || 0}, ${item.activo})" 
                                                class="text-primary hover:text-primary-dark p-1" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="eliminarCatalogo('${item.id}', 'borde', '${escapeHtml(item.nombre)}')" 
                                                class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                 </tr>
                            `).join('')}
                            ${(!data || data.length === 0) ? '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay bordes registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar bordes: ' + error.message);
    }
}

// ============================================
// VISTA PARA MATERIALES
// ============================================
async function cargarVistaMateriales() {
    mostrarLoading('Cargando materiales...');
    
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_materiales')
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
                            <i class="fas fa-cube"></i> Materiales de Productos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona los tipos de material (Mármol Natural, Granito, Travertino, etc.)</p>
                    </div>
                    <button onclick="abrirModalAgregarMaterial()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nuevo Material
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${data?.map(item => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${escapeHtml(item.nombre)}</td>
                                    <td class="px-4 py-3 text-sm max-w-xs truncate">${escapeHtml(item.descripcion || '-')}</td>
                                    <td class="px-4 py-3 text-sm">${item.orden || 0}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${item.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="editarCatalogo('${item.id}', 'material', '${escapeHtml(item.nombre)}', '${escapeHtml(item.descripcion || '')}', ${item.orden || 0}, ${item.activo})" 
                                                class="text-primary hover:text-primary-dark p-1" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="eliminarCatalogo('${item.id}', 'material', '${escapeHtml(item.nombre)}')" 
                                                class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                 </tr>
                            `).join('')}
                            ${(!data || data.length === 0) ? '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay materiales registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar materiales: ' + error.message);
    }
}

// ============================================
// VISTA PARA APLICACIONES
// ============================================
async function cargarVistaAplicaciones() {
    mostrarLoading('Cargando aplicaciones...');
    
    try {
        const { data, error } = await window.supabaseClient
            .from('producto_aplicaciones')
            .select('*')
            .order('orden')
            .order('nombre');
        
        if (error) throw error;
        
        ocultarLoading();
        
        // Iconos predefinidos para ayudar al usuario
        const iconosSugeridos = [
            'fa-house', 'fa-building', 'fa-kitchen-set', 'fa-bath', 'fa-stairs',
            'fa-hotel', 'fa-water', 'fa-umbrella-beach', 'fa-store', 'fa-church'
        ];
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-tags"></i> Aplicaciones de Productos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona las aplicaciones (Pisos, Paredes, Cocinas, Baños, etc.)</p>
                    </div>
                    <button onclick="abrirModalAgregarAplicacion()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nueva Aplicación
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${data?.map(item => `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all">
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-2">
                                    <i class="fas ${item.icono || 'fa-tag'} text-primary text-xl"></i>
                                    <h3 class="font-bold text-primary">${escapeHtml(item.nombre)}</h3>
                                </div>
                                <span class="px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${item.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                        <div class="p-4">
                            <p class="text-sm text-gray-600">${escapeHtml(item.descripcion || 'Sin descripción')}</p>
                            <div class="mt-3 flex items-center justify-between text-sm">
                                <div class="flex items-center gap-2">
                                    <i class="fas fa-arrow-down text-gray-400"></i>
                                    <span>Orden: ${item.orden || 0}</span>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="editarCatalogo('${item.id}', 'aplicacion', '${escapeHtml(item.nombre)}', '${escapeHtml(item.descripcion || '')}', ${item.orden || 0}, ${item.activo}, '${item.icono || 'fas fa-tag'}')" 
                                            class="text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition-colors" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="eliminarCatalogo('${item.id}', 'aplicacion', '${escapeHtml(item.nombre)}')" 
                                            class="text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${(!data || data.length === 0) ? '<div class="col-span-full text-center py-12 bg-white rounded-lg"><p class="text-gray-500">No hay aplicaciones registradas</p></div>' : ''}
            </div>
            
            <div class="mt-6 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div class="flex items-start gap-3">
                    <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div class="text-sm text-blue-800">
                        <p class="font-semibold">Íconos disponibles de Font Awesome:</p>
                        <div class="flex flex-wrap gap-2 mt-2">
                            ${iconosSugeridos.map(icono => `
                                <code class="bg-white px-2 py-1 rounded text-xs">${icono}</code>
                            `).join('')}
                        </div>
                        <p class="text-xs mt-2">Puedes usar cualquier clase de Font Awesome (versión 6)</p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar aplicaciones: ' + error.message);
    }
}

// ============================================
// FUNCIÓN AUXILIAR PARA ESCAPAR HTML
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== SUBIR RANGOS ====================

function mostrarPreviewRangos(urls) {
    const container = document.getElementById('preview_rangos');
    if (!container) return;
    
    if (!urls || urls.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const urlsArray = Array.isArray(urls) ? urls : urls.split(',').map(u => u.trim()).filter(u => u);
    
    container.innerHTML = urlsArray.map((url, i) => `
        <div class="relative group">
            <img src="${optimizarUrlGoogleDrive(url, 'imagen')}" 
                 class="w-20 h-20 object-cover rounded-lg border border-gray-200" 
                 onerror="this.src='FOTO/foto_01.webp'">
            <button type="button" 
                    onclick="eliminarImagenRango(${i})" 
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                ×
            </button>
        </div>
    `).join('');
}

function eliminarImagenRango(index) {
    const rangosTextarea = document.getElementById('producto_rangos');
    const urls = rangosTextarea.value.split(',').map(u => u.trim()).filter(u => u);
    urls.splice(index, 1);
    rangosTextarea.value = urls.join(', ');
    mostrarPreviewRangos(urls);
}

function limpiarPreviewRangos() {
    const container = document.getElementById('preview_rangos');
    if (container) container.innerHTML = '';
}

// Actualizar preview de categorías especiales
function actualizarPreviewCategoriasEspeciales() {
    const container = document.getElementById('categorias_especiales_preview');
    if (!container) return;
    
    const checkboxes = document.querySelectorAll('.categoria-especial-checkbox:checked');
    const seleccionadas = Array.from(checkboxes).map(cb => cb.value);
    
    const nombres = {
        'OUTLET': '🏷️ Outlet',
        'SALDOS_EXPORTACION': '📦 Saldos de Exportación'
    };
    
    if (seleccionadas.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-400">No hay categorías especiales seleccionadas</span>';
        return;
    }
    
    container.innerHTML = seleccionadas.map(valor => `
        <span class="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            ${nombres[valor] || valor}
        </span>
    `).join('');
}

// Inicializar eventos de checkboxes
function inicializarCategoriasEspeciales() {
    const checkboxes = document.querySelectorAll('.categoria-especial-checkbox');
    checkboxes.forEach(cb => {
        cb.removeEventListener('change', actualizarPreviewCategoriasEspeciales);
        cb.addEventListener('change', actualizarPreviewCategoriasEspeciales);
    });
    actualizarPreviewCategoriasEspeciales();
}

// ==================== GENERAR PDF DE PRODUCTO CON DOS QR ====================
async function generarPDFProducto(productoId) {
    mostrarLoading('Generando ficha técnica...');
    
    try {
        // Obtener datos completos del producto
        const { data: producto, error } = await window.supabaseClient
            .from('productos')
            .select(`
                *,
                familia:familia_id (id, nombre),
                acabado:acabado_id (id, nombre),
                borde:borde_id (id, nombre),
                material:material_id (id, nombre),
                calidad:calidad_id (id, nombre),
                unidad_medida:unidad_medida_id (id, nombre, nombre_plural, abreviatura, codigo)
            `)
            .eq('id', productoId)
            .eq('activo', true)
            .single();
        
        if (error) throw error;
        
        // Obtener aplicaciones del producto
        const { data: aplicacionesRel } = await window.supabaseClient
            .from('producto_aplicaciones_rel')
            .select(`
                aplicacion:aplicacion_id (id, nombre, icono)
            `)
            .eq('producto_id', productoId);
        
        const aplicaciones = aplicacionesRel?.map(rel => rel.aplicacion?.nombre).filter(n => n) || [];
        
        // ============================================
        // GENERAR PRIMER QR: Landing page del producto
        // ============================================
        const urlBase = window.location.origin;
        const urlLanding = `${urlBase}/?producto=${producto.slug}`;
        
        // ============================================
        // GENERAR SEGUNDO QR: Código del producto
        // ============================================
        const codigoProducto = producto.codigo || `PROD-${producto.id.substring(0, 8)}`;
        const urlCodigo = codigoProducto; // Texto plano, no es URL
        
        // Crear elementos temporales para generar QR - TAMAÑO 100x100
        const qrContainer = document.createElement('div');
        qrContainer.style.position = 'absolute';
        qrContainer.style.left = '-9999px';
        qrContainer.style.top = '-9999px';
        qrContainer.style.display = 'flex';
        qrContainer.style.flexDirection = 'column';
        qrContainer.style.gap = '15px';
        document.body.appendChild(qrContainer);
        
        // Crear primer QR (Landing page)
        const qrDiv1 = document.createElement('div');
        qrDiv1.style.width = '110px';
        qrDiv1.style.height = '110px';
        qrContainer.appendChild(qrDiv1);
        
        const qrCode1 = new QRCode(qrDiv1, {
            text: urlLanding,
            width: 150,
            height: 150,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Crear segundo QR (Código del producto)
        const qrDiv2 = document.createElement('div');
        qrDiv2.style.width = '110px';
        qrDiv2.style.height = '110px';
        qrContainer.appendChild(qrDiv2);
        
        const qrCode2 = new QRCode(qrDiv2, {
            text: urlCodigo,
            width: 150,
            height: 150,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Esperar a que se generen los QR
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Capturar los QR como imágenes
        const qrCanvas1 = qrDiv1.querySelector('canvas');
        const qrCanvas2 = qrDiv2.querySelector('canvas');
        const qrImageData1 = qrCanvas1 ? qrCanvas1.toDataURL('image/png') : null;
        const qrImageData2 = qrCanvas2 ? qrCanvas2.toDataURL('image/png') : null;
        
        // Limpiar elemento temporal
        document.body.removeChild(qrContainer);
        
        // Función para optimizar URL de imagen
        function optimizarImagenQR(url) {
            if (!url) return '';
            const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                return `https://lh3.googleusercontent.com/d/${match[1]}=w500-h500`;
            }
            return url;
        }
        
        // Generar código de trazabilidad único
        const fechaActual = new Date();
        const codigoTrazabilidad = `PDF-GM-${fechaActual.getFullYear()}${(fechaActual.getMonth()+1).toString().padStart(2,'0')}${fechaActual.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 10000).toString().padStart(4,'0')}`;
        
        const imagenPrincipal = optimizarImagenQR(producto.imagen_principal) || '';
        const fechaGeneracion = fechaActual.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        
        // Determinar si hay aplicaciones
        const tieneAplicaciones = aplicaciones.length > 0;
        
        // Generar HTML del PDF - CON DOS QR EN COLUMNA IZQUIERDA
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Ficha Técnica - ${producto.nombre}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
                        background: #e5e7eb;
                        padding: 15px;
                    }
                    
                    .pdf-container {
                        max-width: 210mm;
                        width: 210mm;
                        min-height: 277mm;
                        margin: 0 auto;
                        background: white;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                        position: relative;
                        display: flex;
                        page-break-after: avoid;
                        break-inside: avoid;
                    }
                    
                    /* Banda lateral corporativa */
                    .sidebar-band {
                        width: 8px;
                        background: linear-gradient(180deg, #39080a 0%, #5a1a1d 50%, #d4d4ae 100%);
                        flex-shrink: 0;
                    }
                    
                    /* Contenido principal */
                    .main-content {
                        flex: 1;
                        padding: 15px 20px;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    /* Header compacto */
                    .pdf-header {
                        text-align: center;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #d4d4ae;
                    }
                    
                    .pdf-header h1 {
                        font-size: 22px;
                        letter-spacing: 2px;
                        color: #39080a;
                        margin-bottom: 3px;
                        font-weight: 700;
                    }
                    
                    .pdf-header .subtitle {
                        font-size: 9px;
                        color: #6b7280;
                        letter-spacing: 1px;
                    }
                    
                    .pdf-header .family-badge {
                        display: inline-block;
                        margin-top: 4px;
                        font-size: 9px;
                        color: #d4d4ae;
                        font-weight: 600;
                    }
                    
                    /* Layout de dos columnas */
                    .two-columns {
                        display: flex;
                        gap: 20px;
                        flex: 1;
                    }
                    
                    /* Columna Izquierda: Imagen + QR (con indicaciones) */
                    .left-column {
                        flex: 0.9;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    /* Columna Derecha: Toda la información */
                    .right-column {
                        flex: 1.1;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    /* Tarjetas compactas */
                    .card {
                        background: #ffffff;
                        border-radius: 10px;
                        padding: 10px 12px;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
                        border: 1px solid #f0f0f0;
                    }
                    
                    .card-title {
                        font-size: 11px;
                        font-weight: 700;
                        color: #39080a;
                        margin-bottom: 8px;
                        padding-bottom: 4px;
                        border-bottom: 1px solid #e5e7eb;
                        letter-spacing: 0.5px;
                    }
                    
                    /* Tarjeta de imagen */
                    .product-image {
                        text-align: center;
                        padding: 5px;
                    }
                    
                    .product-image img {
                        max-width: 100%;
                        max-height: 180px;
                        object-fit: contain;
                        border-radius: 10px;
                    }
                    
                    /* Tarjeta de códigos QR - CON INDICACIONES */
                    .qr-card {
                        text-align: center;
                        background: #fafafa;
                    }
                    
                    .qr-container {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    
                    .qr-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                    }
                    
                    .qr-wrapper {
                        display: inline-block;
                        padding: 6px;
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                    }
                    
                    .qr-wrapper img {
                        width: 100px;
                        height: 100px;
                        display: block;
                    }
                    
                    .qr-info {
                        width: 100%;
                        text-align: center;
                    }
                    
                    .qr-label {
                        font-size: 10px;
                        font-weight: 700;
                        color: #39080a;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                        margin-bottom: 3px;
                    }
                    
                    .qr-description {
                        font-size: 8px;
                        color: #6b7280;
                        line-height: 1.3;
                    }
                    
                    .qr-divider {
                        width: 80%;
                        height: 1px;
                        background: #e5e7eb;
                        margin: 5px auto;
                    }
                    
                    /* Información general compacta */
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 6px;
                    }
                    
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: baseline;
                        padding: 4px 0;
                        border-bottom: 1px dashed #f0f0f0;
                    }
                    
                    .info-label {
                        font-size: 9px;
                        font-weight: 600;
                        color: #6b7280;
                        text-transform: uppercase;
                    }
                    
                    .info-value {
                        font-size: 10px;
                        font-weight: 500;
                        color: #1e293b;
                        text-align: right;
                    }
                    
                    .info-value strong {
                        color: #39080a;
                        font-weight: 700;
                    }
                    
                    /* Datos de comercialización compactos */
                    .comercializacion-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                    }
                    
                    .comercializacion-item {
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .comercializacion-label {
                        font-size: 8px;
                        font-weight: 600;
                        color: #6b7280;
                        text-transform: uppercase;
                        margin-bottom: 2px;
                    }
                    
                    .comercializacion-value {
                        font-size: 10px;
                        font-weight: 500;
                        color: #1e293b;
                    }
                    
                    /* Aplicaciones compactas */
                    .apps-list {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                        margin-top: 3px;
                    }
                    
                    .app-tag {
                        background: #f3f4f6;
                        padding: 3px 8px;
                        border-radius: 16px;
                        font-size: 9px;
                        color: #39080a;
                        font-weight: 500;
                    }
                    
                    /* Descripción compacta */
                    .descripcion-text {
                        font-size: 9px;
                        color: #4b5563;
                        line-height: 1.4;
                        text-align: justify;
                    }
                    
                    /* Footer compacto */
                    .pdf-footer {
                        margin-top: 12px;
                        padding-top: 8px;
                        border-top: 1px solid #e5e7eb;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 7px;
                        color: #9ca3af;
                    }
                    
                    .footer-right {
                        font-family: monospace;
                    }
                    
                    @media print {
                        body {
                            background: white;
                            padding: 0;
                            margin: 0;
                        }
                        .pdf-container {
                            box-shadow: none;
                            margin: 0;
                            width: 100%;
                            min-height: auto;
                        }
                        .no-print {
                            display: none;
                        }
                        .card {
                            box-shadow: none;
                            border: 1px solid #e5e7eb;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="pdf-container">
                    <!-- Banda lateral corporativa -->
                    <div class="sidebar-band"></div>
                    
                    <!-- Contenido principal -->
                    <div class="main-content">
                        <!-- Header compacto -->
                        <div class="pdf-header">
                            <h1>GALLOS MÁRMOL</h1>
                            <div class="subtitle">FICHA TÉCNICA DE PRODUCTO</div>
                            <div class="family-badge">${producto.familia?.nombre?.toUpperCase() || 'MATERIAL SELECCIONADO'}</div>
                        </div>
                        
                        <!-- Layout de dos columnas -->
                        <div class="two-columns">
                            
                            <!-- COLUMNA IZQUIERDA: Imagen + DOS Códigos QR -->
                            <div class="left-column">
                                <!-- Tarjeta de imagen del producto -->
                                <div class="card">
                                    <div class="card-title">PRODUCTO</div>
                                    <div class="product-image">
                                        ${imagenPrincipal ? 
                                            `<img src="${imagenPrincipal}" alt="${producto.nombre}" onerror="this.src='FOTO/foto_01.webp'">` : 
                                            '<div style="background: #f3f4f6; height: 160px; display: flex; align-items: center; justify-content: center; border-radius: 10px;"><p style="color: #9ca3af; font-size: 11px;">Sin imagen disponible</p></div>'
                                        }
                                    </div>
                                </div>
                                
                                <!-- Tarjeta de códigos QR con indicaciones -->
                                <div class="card qr-card">
                                    <div class="card-title">CÓDIGOS QR</div>
                                    <div class="qr-container">
                                        
                                        <!-- PRIMER QR: Landing page del producto -->
                                        <div class="qr-item">
                                            <div class="qr-wrapper">
                                                ${qrImageData1 ? `<img src="${qrImageData1}" alt="QR Landing Page">` : '<div style="width: 100px; height: 100px; background: #f3f4f6;"></div>'}
                                            </div>
                                            <div class="qr-info">
                                                <div class="qr-label">
                                                    <i class="fas fa-globe"></i>VER PRODUCTO
                                                </div>
                                                <div class="qr-description">
                                                    Escanea para ver toda la información<br>
                                                    del producto en nuestra página web
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="qr-divider"></div>
                                        
                                        <!-- SEGUNDO QR: Código del producto -->
                                        <div class="qr-item">
                                            <div class="qr-wrapper">
                                                ${qrImageData2 ? `<img src="${qrImageData2}" alt="QR Código Producto">` : '<div style="width: 100px; height: 100px; background: #f3f4f6;"></div>'}
                                            </div>
                                            <div class="qr-info">
                                                <div class="qr-label">
                                                    <i class="fas fa-barcode"></i>CÓDIGO: ${producto.codigo || 'N/A'}
                                                </div>
                                                <div class="qr-description">
                                                    Escanea para obtener el código<br>
                                                    del producto y facilitar su identificación
                                                </div>
                                            </div>
                                        </div>
                                        
                                    </div>
                                </div>
                            </div>
                            
                            <!-- COLUMNA DERECHA: Toda la información -->
                            <div class="right-column">
                                <!-- Tarjeta de Información General -->
                                <div class="card">
                                    <div class="card-title">INFORMACIÓN GENERAL</div>
                                    <div class="info-grid">
                                        <div class="info-row">
                                            <span class="info-label">Nombre</span>
                                            <span class="info-value"><strong>${producto.nombre || 'N/A'}</strong></span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Código</span>
                                            <span class="info-value">${producto.codigo || 'N/A'}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Familia</span>
                                            <span class="info-value">${producto.familia?.nombre || 'N/A'}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Acabado</span>
                                            <span class="info-value">${producto.acabado?.nombre || 'N/A'}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Material</span>
                                            <span class="info-value">${producto.material?.nombre || 'N/A'}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Modelo</span>
                                            <span class="info-value">${producto.modelo || 'N/A'}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Borde</span>
                                            <span class="info-value">${producto.borde?.nombre || 'N/A'}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-label">Calidad</span>
                                            <span class="info-value">${producto.calidad?.nombre || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Tarjeta de Datos de Comercialización -->
                                <div class="card">
                                    <div class="card-title">COMERCIALIZACIÓN</div>
                                    <div class="comercializacion-grid">
                                        <div class="comercializacion-item">
                                            <div class="comercializacion-label">Medida</div>
                                            <div class="comercializacion-value"><strong>${producto.medida || 'N/A'}</strong></div>
                                        </div>
                                        <div class="comercializacion-item">
                                            <div class="comercializacion-label">Espesor</div>
                                            <div class="comercializacion-value"><strong>${producto.espesor || 'N/A'}</strong></div>
                                        </div>
                                        <div class="comercializacion-item">
                                            <div class="comercializacion-label">Unidad de venta</div>
                                            <div class="comercializacion-value">${producto.unidad_medida?.nombre || 'Unidad'} ${producto.unidad_medida?.abreviatura ? `(${producto.unidad_medida.abreviatura})` : ''}</div>
                                        </div>
                                        <div class="comercializacion-item">
                                            <div class="comercializacion-label">Stock</div>
                                            <div class="comercializacion-value">Consultar</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Tarjeta de Descripción (si existe) -->
                                ${producto.descripcion_corta ? `
                                <div class="card">
                                    <div class="card-title">DESCRIPCIÓN</div>
                                    <div class="descripcion-text">${producto.descripcion_corta}</div>
                                </div>
                                ` : ''}
                                
                                <!-- Tarjeta de Aplicaciones (si existen) -->
                                ${tieneAplicaciones ? `
                                <div class="card">
                                    <div class="card-title">APLICACIONES</div>
                                    <div class="apps-list">
                                        ${aplicaciones.map(app => `<span class="app-tag">${app}</span>`).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Footer compacto -->
                        <div class="pdf-footer">
                            <div class="footer-left">
                                Gallos Mármol | ${fechaGeneracion}
                            </div>
                            <div class="footer-right">
                                Página 1 de 1 | ${codigoTrazabilidad}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 15px;">
                    <button onclick="window.print()" style="background: #39080a; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin: 0 5px; font-size: 12px;">
                        <i class="fas fa-print"></i> Imprimir / Guardar PDF
                    </button>
                    <button onclick="window.close()" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin: 0 5px; font-size: 12px;">
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
        mostrarAlerta('Éxito', 'Ficha técnica generada correctamente', 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error generando PDF:', error);
        mostrarAlerta('Error', 'No se pudo generar la ficha técnica: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Exponer función globalmente
window.generarPDFProducto = generarPDFProducto;

// Exponer funciones globales
window.cargarVistaProductos = cargarVistaProductos;
window.abrirModalNuevoProducto = abrirModalNuevoProducto;

window.cargarVistaOutletPublico = cargarVistaOutletPublico;
window.cargarVistaSaldosExportacionPublico = cargarVistaSaldosExportacionPublico;
window.aplicarFiltrosOutlet = aplicarFiltrosOutlet;
window.limpiarFiltrosOutlet = limpiarFiltrosOutlet;
window.filtrarProductosOutlet = filtrarProductosOutlet;
window.toggleFiltrosOutletPanel = toggleFiltrosOutletPanel;
window.aplicarFiltrosSaldos = aplicarFiltrosSaldos;
window.limpiarFiltrosSaldos = limpiarFiltrosSaldos;
window.filtrarProductosSaldos = filtrarProductosSaldos;
window.toggleFiltrosSaldosPanel = toggleFiltrosSaldosPanel;