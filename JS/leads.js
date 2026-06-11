// ==================== LEADS - GESTIÓN DE COTIZACIONES ====================

// Variables globales
let vistaLeadsActual = 'tabla'; // 'tabla' o 'cards'
let paginaActualLeads = 1;
const ITEMS_POR_PAGINA_LEADS = 15;
let totalLeadsCount = 0;
let totalPaginasLeads = 1;
let leadsCache = [];

// ==================== VISTA PRINCIPAL ====================
async function cargarVistaLeads() {
    mostrarLoading('Cargando cotizaciones...');
    
    try {
        console.log('%c📋 CARGANDO LEADS', 'background: #28a745; color: white; font-size: 14px;');
        
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        if (!esAdmin) {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        // ============================================
        // OBTENER LEADS CON PAGINACIÓN
        // ============================================
        const desde = (paginaActualLeads - 1) * ITEMS_POR_PAGINA_LEADS;
        const hasta = desde + ITEMS_POR_PAGINA_LEADS - 1;
        
        const { data: leads, count, error } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('*', { count: 'exact' })
            .order('creado_el', { ascending: false })
            .range(desde, hasta);
        
        if (error) throw error;
        
        totalLeadsCount = count || 0;
        totalPaginasLeads = Math.ceil(totalLeadsCount / ITEMS_POR_PAGINA_LEADS);
        leadsCache = leads;
        
        // ============================================
        // ESTADÍSTICAS
        // ============================================
        const totalLeads = totalLeadsCount;
        const leadsNuevos = leads?.filter(l => l.estado === 'NUEVO').length || 0;
        const leadsContactados = leads?.filter(l => l.estado === 'CONTACTADO').length || 0;
        const leadsCotizados = leads?.filter(l => l.estado === 'COTIZADO').length || 0;
        const leadsGanados = leads?.filter(l => l.estado === 'GANADO').length || 0;
        const leadsPerdidos = leads?.filter(l => l.estado === 'PERDIDO').length || 0;
        
        // ============================================
        // OBTENER LISTA DE PRODUCTOS ÚNICOS PARA FILTRO
        // ============================================
        const { data: productosUnicos } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('producto_nombre')
            .not('producto_nombre', 'is', null);
        
        const productosSet = new Set();
        productosUnicos?.forEach(l => {
            if (l.producto_nombre) productosSet.add(l.producto_nombre);
        });
        const productosLista = Array.from(productosSet).sort();
        
        ocultarLoading();
        
        // ============================================
        // GENERAR HTML
        // ============================================
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-envelope-open-text"></i> Cotizaciones Recibidas
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Gestión de leads y cotizaciones de landing pages
                            <span class="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                ${totalLeads} lead${totalLeads !== 1 ? 's' : ''}
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="toggleVistaLeads('tabla')" class="px-3 py-1.5 text-sm ${vistaLeadsActual === 'tabla' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Tabla">
                                <i class="fas fa-table"></i>
                            </button>
                            <button onclick="toggleVistaLeads('cards')" class="px-3 py-1.5 text-sm ${vistaLeadsActual === 'cards' ? 'bg-primary text-white' : 'bg-white text-gray-600'} transition-colors" title="Vista Cards">
                                <i class="fas fa-th-large"></i>
                            </button>
                        </div>
                        <button onclick="exportarLeadsExcel()" class="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <i class="fas fa-file-excel"></i> Exportar Excel
                        </button>
                        <button onclick="exportarLeadsPDF()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                            <i class="fas fa-file-pdf"></i> Exportar PDF
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-3 text-center border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${totalLeads}</p>
                    <p class="text-xs text-gray-500">Total Leads</p>
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
            </div>
            
            <!-- FILTROS -->
            <div class="bg-white rounded-xl shadow-sm mb-4 border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer" onclick="toggleFiltrosLeadsPanel()">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-filter text-primary"></i>
                        <span class="font-semibold text-gray-700">Filtros avanzados</span>
                        <span id="filtrosLeadsBadge" class="hidden bg-primary text-white text-xs rounded-full px-2 py-0.5">0</span>
                    </div>
                    <i class="fas fa-chevron-down transition-transform" id="filtrosLeadsIcon"></i>
                </div>
                <div id="panelFiltrosLeads" class="p-4 hidden">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                            <select id="filtroEstadoLead" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                <option value="NUEVO">Nuevo</option>
                                <option value="CONTACTADO">Contactado</option>
                                <option value="COTIZADO">Cotizado</option>
                                <option value="GANADO">Ganado</option>
                                <option value="PERDIDO">Perdido</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Producto</label>
                            <select id="filtroProductoLead" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                                <option value="">Todos</option>
                                ${productosLista.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Distrito</label>
                            <input type="text" id="filtroDistritoLead" placeholder="Ej: San Isidro" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha desde</label>
                            <input type="date" id="filtroFechaDesdeLead" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Fecha hasta</label>
                            <input type="date" id="filtroFechaHastaLead" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                        <button onclick="aplicarFiltrosLeads()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                            <i class="fas fa-search"></i> Aplicar filtros
                        </button>
                        <button onclick="limpiarFiltrosLeads()" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i class="fas fa-undo-alt"></i> Limpiar
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Búsqueda rápida -->
            <div class="mb-4">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" id="busquedaLeads" placeholder="Buscar por nombre, teléfono o email..." 
                        class="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white"
                        onkeyup="aplicarFiltrosLeads()">
                </div>
            </div>
            
            <!-- CONTENEDOR DE RESULTADOS -->
            <div id="leadsContainer">
                ${vistaLeadsActual === 'tabla' 
                    ? generarVistaTablaLeads(leads)
                    : generarVistaCardsLeads(leads)
                }
            </div>
        `;
        
        // Agregar paginación
        if (totalPaginasLeads > 1) {
            html += `
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div class="text-sm text-gray-500">
                        Mostrando ${((paginaActualLeads - 1) * ITEMS_POR_PAGINA_LEADS) + 1} - ${Math.min(paginaActualLeads * ITEMS_POR_PAGINA_LEADS, totalLeadsCount)} de ${totalLeadsCount} leads
                    </div>
                    <div class="flex gap-2 items-center">
                        <button onclick="cambiarPaginaLeads(${paginaActualLeads - 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualLeads === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <div class="flex gap-1">
                            ${generarPaginadorLeads()}
                        </div>
                        <button onclick="cambiarPaginaLeads(${paginaActualLeads + 1})" 
                                class="px-3 py-1 rounded-lg ${paginaActualLeads === totalPaginasLeads ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Inicializar eventos de filtros
        inicializarEventosFiltrosLeads();
        
        console.log('✅ Vista de leads cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error cargando leads:', error);
        mostrarError('Error al cargar leads: ' + error.message);
    }
}

// ==================== GENERAR VISTA TABLA LEADS ====================
function generarVistaTablaLeads(leads) {
    if (!leads || leads.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-envelope-open-text text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay cotizaciones registradas</p>
                </div>`;
    }
    
    const estadoColors = {
        'NUEVO': 'bg-orange-100 text-orange-800',
        'CONTACTADO': 'bg-blue-100 text-blue-800',
        'COTIZADO': 'bg-purple-100 text-purple-800',
        'GANADO': 'bg-green-100 text-green-800',
        'PERDIDO': 'bg-red-100 text-red-800'
    };
    
    const estadoTexto = {
        'NUEVO': 'Nuevo',
        'CONTACTADO': 'Contactado',
        'COTIZADO': 'Cotizado',
        'GANADO': 'Ganado',
        'PERDIDO': 'Perdido'
    };
    
    return `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distrito</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">m²</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${leads.map(l => `
                            <tr class="hover:bg-gray-50 ${!l.leido ? 'bg-blue-50' : ''}">
                                <td class="px-4 py-3 text-sm">${new Date(l.creado_el).toLocaleDateString()}</td>
                                <td class="px-4 py-3 text-sm font-medium text-primary">${l.producto_nombre || 'N/A'}</td>
                                <td class="px-4 py-3 text-sm font-medium">${l.nombre || 'N/A'}</td>
                                <td class="px-4 py-3 text-sm">${formatearNumeroTelefono(l.telefono) || 'N/A'}</td>
                                <td class="px-4 py-3 text-sm">${l.distrito || 'N/A'}</td>
                                <td class="px-4 py-3 text-sm text-center">${l.metros_cuadrados || '-'}</td>
                                <td class="px-4 py-3 text-sm">
                                    <select onchange="cambiarEstadoLead('${l.id}', this.value)" 
                                            class="px-2 py-1 rounded-full text-xs font-semibold ${estadoColors[l.estado] || 'bg-gray-100'} border-0 focus:ring-1 focus:ring-primary">
                                        <option value="NUEVO" ${l.estado === 'NUEVO' ? 'selected' : ''}>📋 Nuevo</option>
                                        <option value="CONTACTADO" ${l.estado === 'CONTACTADO' ? 'selected' : ''}>📞 Contactado</option>
                                        <option value="COTIZADO" ${l.estado === 'COTIZADO' ? 'selected' : ''}>💰 Cotizado</option>
                                        <option value="GANADO" ${l.estado === 'GANADO' ? 'selected' : ''}>🏆 Ganado</option>
                                        <option value="PERDIDO" ${l.estado === 'PERDIDO' ? 'selected' : ''}>❌ Perdido</option>
                                    </select>
                                 </div>
                                <td class="px-4 py-3 text-sm whitespace-nowrap">
                                    <button onclick="verDetalleLead('${l.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button onclick="eliminarLead('${l.id}')" class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                 </div>
                             </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== GENERAR VISTA CARDS LEADS ====================
function generarVistaCardsLeads(leads) {
    if (!leads || leads.length === 0) {
        return `<div class="text-center py-12 bg-white rounded-lg col-span-full">
                    <i class="fas fa-envelope-open-text text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay cotizaciones registradas</p>
                </div>`;
    }
    
    const estadoColors = {
        'NUEVO': 'bg-orange-100 text-orange-800',
        'CONTACTADO': 'bg-blue-100 text-blue-800',
        'COTIZADO': 'bg-purple-100 text-purple-800',
        'GANADO': 'bg-green-100 text-green-800',
        'PERDIDO': 'bg-red-100 text-red-800'
    };
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${leads.map(l => `
                <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 ${!l.leido ? 'border-l-4 border-l-primary' : ''}">
                    <div class="p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="font-bold text-primary">${l.producto_nombre || 'Producto no especificado'}</h3>
                                <p class="text-xs text-gray-400">${new Date(l.creado_el).toLocaleString()}</p>
                            </div>
                            <select onchange="cambiarEstadoLead('${l.id}', this.value)" 
                                    class="px-2 py-1 rounded-full text-xs font-semibold ${estadoColors[l.estado] || 'bg-gray-100'} border-0">
                                <option value="NUEVO" ${l.estado === 'NUEVO' ? 'selected' : ''}>📋 Nuevo</option>
                                <option value="CONTACTADO" ${l.estado === 'CONTACTADO' ? 'selected' : ''}>📞 Contactado</option>
                                <option value="COTIZADO" ${l.estado === 'COTIZADO' ? 'selected' : ''}>💰 Cotizado</option>
                                <option value="GANADO" ${l.estado === 'GANADO' ? 'selected' : ''}>🏆 Ganado</option>
                                <option value="PERDIDO" ${l.estado === 'PERDIDO' ? 'selected' : ''}>❌ Perdido</option>
                            </select>
                        </div>
                        <div class="space-y-2 mt-3">
                            <div class="flex items-center gap-2 text-sm">
                                <i class="fas fa-user text-primary w-5"></i>
                                <span class="font-medium">${l.nombre || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-sm">
                                <i class="fas fa-phone text-primary w-5"></i>
                                <a href="tel:${l.telefono}" class="text-blue-600 hover:underline">${l.telefono || 'N/A'}</a>
                            </div>
                            ${l.distrito ? `
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-map-marker-alt text-primary w-5"></i>
                                    <span>${formatearNumeroTelefono(l.telefono) || 'N/A'}</span>
                                </div>
                            ` : ''}
                            ${l.metros_cuadrados ? `
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="fas fa-ruler-combined text-primary w-5"></i>
                                    <span>${l.metros_cuadrados} m²</span>
                                </div>
                            ` : ''}
                            ${l.mensaje ? `
                                <div class="bg-gray-50 p-2 rounded-lg mt-2">
                                    <p class="text-xs text-gray-600 line-clamp-2">${l.mensaje}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                            <button onclick="verDetalleLead('${l.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="eliminarLead('${l.id}')" class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==================== VER DETALLE LEAD ====================
window.verDetalleLead = async function(id) {
    mostrarLoading('Cargando detalles...');
    
    try {
        const { data: lead, error } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Marcar como leído
        if (!lead.leido) {
            await window.supabaseClient
                .from('leads_cotizaciones')
                .update({ leido: true })
                .eq('id', id);
        }
        
        ocultarLoading();
        
        const estadoOptions = {
            'NUEVO': '📋 Nuevo',
            'CONTACTADO': '📞 Contactado',
            'COTIZADO': '💰 Cotizado',
            'GANADO': '🏆 Ganado',
            'PERDIDO': '❌ Perdido'
        };
        
        Swal.fire({
            title: `<span class="text-primary">${lead.nombre}</span>`,
            width: '550px',
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p><strong>📅 Fecha:</strong> ${new Date(lead.creado_el).toLocaleString()}</p>
                        <p><strong>📦 Producto:</strong> <span class="text-primary font-semibold">${lead.producto_nombre || 'No especificado'}</span></p>
                        <p><strong>📊 Estado actual:</strong> <span class="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">${estadoOptions[lead.estado] || lead.estado}</span></p>
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
                        <h4 class="font-semibold text-primary mb-2">📝 Cambiar estado</h4>
                        <select id="cambiarEstadoSelect" class="form-input w-full">
                            <option value="NUEVO" ${lead.estado === 'NUEVO' ? 'selected' : ''}>📋 Nuevo</option>
                            <option value="CONTACTADO" ${lead.estado === 'CONTACTADO' ? 'selected' : ''}>📞 Contactado</option>
                            <option value="COTIZADO" ${lead.estado === 'COTIZADO' ? 'selected' : ''}>💰 Cotizado</option>
                            <option value="GANADO" ${lead.estado === 'GANADO' ? 'selected' : ''}>🏆 Ganado</option>
                            <option value="PERDIDO" ${lead.estado === 'PERDIDO' ? 'selected' : ''}>❌ Perdido</option>
                        </select>
                        <div class="mt-3">
                            <label class="form-label text-sm">Notas (opcional)</label>
                            <textarea id="notasLead" class="form-input w-full text-sm" rows="2" placeholder="Agregar notas sobre este lead...">${lead.notas || ''}</textarea>
                        </div>
                        <button onclick="actualizarLead('${lead.id}')" class="btn-primary w-full mt-3 text-sm py-2">
                            <i class="fas fa-save mr-1"></i> Actualizar estado
                        </button>
                    </div>
                    
                    <div class="border-t pt-2 text-xs text-gray-400">
                        <p><i class="fas fa-globe"></i> Página de origen: ${lead.pagina_origen || 'N/A'}</p>
                        <p><i class="fas fa-id-card"></i> ID: ${lead.id.substring(0, 8)}...</p>
                    </div>
                    
                    <div class="flex gap-2 pt-2">
                        <a href="https://wa.me/${lead.telefono}?text=Hola%20${encodeURIComponent(lead.nombre)}%2C%20recibimos%20tu%20cotizaci%C3%B3n%20de%20${encodeURIComponent(lead.producto_nombre || 'nuestros productos')}%20y%20nos%20pondremos%20en%20contacto%20contigo." 
                           target="_blank" class="flex-1 bg-green-500 text-white text-center py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </a>
                        <button onclick="eliminarLead('${lead.id}')" class="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            didOpen: () => {
                // Actualizar la lista después de cambiar estado
                window.actualizarLead = async function(leadId) {
                    const nuevoEstado = document.getElementById('cambiarEstadoSelect').value;
                    const notas = document.getElementById('notasLead').value;
                    
                    await cambiarEstadoLead(leadId, nuevoEstado, notas);
                    Swal.close();
                    await cargarVistaLeads();
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
window.cambiarEstadoLead = async function(id, nuevoEstado, notas = null) {
    try {
        const updateData = { estado: nuevoEstado };
        if (notas !== null) updateData.notas = notas;
        if (nuevoEstado === 'CONTACTADO') updateData.contactado_el = new Date().toISOString();
        
        const { error } = await window.supabaseClient
            .from('leads_cotizaciones')
            .update(updateData)
            .eq('id', id);
        
        if (error) throw error;
        
        mostrarAlerta('Éxito', `Estado actualizado a ${nuevoEstado}`, 'success');
        await cargarVistaLeads();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
    }
};

// ==================== ELIMINAR LEAD ====================
window.eliminarLead = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar lead?',
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
                .from('leads_cotizaciones')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Lead eliminado correctamente', 'success');
            await cargarVistaLeads();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el lead', 'error');
        }
    }
};

// ==================== FUNCIONES DE FILTROS ====================
function inicializarEventosFiltrosLeads() {
    const inputs = ['filtroEstadoLead', 'filtroProductoLead', 'filtroDistritoLead', 'filtroFechaDesdeLead', 'filtroFechaHastaLead', 'busquedaLeads'];
    
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.removeEventListener('change', aplicarFiltrosLeads);
            elemento.removeEventListener('input', aplicarFiltrosLeads);
            elemento.addEventListener('change', aplicarFiltrosLeads);
            if (id === 'busquedaLeads' || id === 'filtroDistritoLead') {
                elemento.addEventListener('input', aplicarFiltrosLeads);
            }
        }
    });
}

window.aplicarFiltrosLeads = async function() {
    const estado = document.getElementById('filtroEstadoLead')?.value;
    const producto = document.getElementById('filtroProductoLead')?.value;
    const distrito = document.getElementById('filtroDistritoLead')?.value;
    const fechaDesde = document.getElementById('filtroFechaDesdeLead')?.value;
    const fechaHasta = document.getElementById('filtroFechaHastaLead')?.value;
    const busqueda = document.getElementById('busquedaLeads')?.value;
    
    mostrarLoading('Filtrando leads...');
    
    try {
        let query = window.supabaseClient
            .from('leads_cotizaciones')
            .select('*');
        
        if (estado && estado !== '') query = query.eq('estado', estado);
        if (producto && producto !== '') query = query.eq('producto_nombre', producto);
        if (distrito && distrito !== '') query = query.ilike('distrito', `%${distrito}%`);
        if (fechaDesde && fechaDesde !== '') query = query.gte('creado_el', `${fechaDesde}T00:00:00`);
        if (fechaHasta && fechaHasta !== '') query = query.lte('creado_el', `${fechaHasta}T23:59:59`);
        if (busqueda && busqueda !== '') {
            query = query.or(`nombre.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%,email.ilike.%${busqueda}%`);
        }
        
        const { data: leads, error } = await query.order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        totalLeadsCount = leads?.length || 0;
        totalPaginasLeads = Math.ceil(totalLeadsCount / ITEMS_POR_PAGINA_LEADS);
        paginaActualLeads = 1;
        
        const container = document.getElementById('leadsContainer');
        if (container) {
            if (vistaLeadsActual === 'tabla') {
                container.innerHTML = generarVistaTablaLeads(leads?.slice(0, ITEMS_POR_PAGINA_LEADS));
            } else {
                container.innerHTML = generarVistaCardsLeads(leads?.slice(0, ITEMS_POR_PAGINA_LEADS));
            }
        }
        
        // Actualizar badge
        let activos = 0;
        if (estado) activos++;
        if (producto) activos++;
        if (distrito) activos++;
        if (fechaDesde) activos++;
        if (fechaHasta) activos++;
        if (busqueda) activos++;
        const badge = document.getElementById('filtrosLeadsBadge');
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
        mostrarAlerta('Error', 'Error al filtrar leads', 'error');
    }
};

window.limpiarFiltrosLeads = function() {
    document.getElementById('filtroEstadoLead').value = '';
    document.getElementById('filtroProductoLead').value = '';
    document.getElementById('filtroDistritoLead').value = '';
    document.getElementById('filtroFechaDesdeLead').value = '';
    document.getElementById('filtroFechaHastaLead').value = '';
    document.getElementById('busquedaLeads').value = '';
    
    paginaActualLeads = 1;
    cargarVistaLeads();
};

window.toggleFiltrosLeadsPanel = function() {
    const panel = document.getElementById('panelFiltrosLeads');
    const icon = document.getElementById('filtrosLeadsIcon');
    
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
function generarPaginadorLeads() {
    let html = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualLeads - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginasLeads, inicio + maxBotones - 1);
    
    if (fin - inicio + 1 < maxBotones) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
        html += `
            <button onclick="cambiarPaginaLeads(${i})" 
                    class="px-3 py-1 rounded-lg ${i === paginaActualLeads ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                ${i}
            </button>
        `;
    }
    return html;
}

window.cambiarPaginaLeads = async function(pagina) {
    if (pagina < 1 || pagina > totalPaginasLeads) return;
    if (pagina === paginaActualLeads) return;
    
    const scrollY = window.scrollY;
    paginaActualLeads = pagina;
    await cargarVistaLeads();
    setTimeout(() => window.scrollTo(0, scrollY), 100);
};

window.toggleVistaLeads = async function(vista) {
    vistaLeadsActual = vista;
    await cargarVistaLeads();
};

// ==================== EXPORTAR LEADS A EXCEL ====================
window.exportarLeadsExcel = async function() {
    mostrarLoading('Generando archivo Excel...');
    
    try {
        const { data: leads, error } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('*')
            .order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        if (!leads || leads.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay leads para exportar', 'info');
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
            'NOMBRE': l.nombre || 'N/A',
            'TELÉFONO': l.telefono || 'N/A',
            'EMAIL': l.email || 'N/A',
            'DISTRITO': l.distrito || 'N/A',
            'METROS²': l.metros_cuadrados || 'N/A',
            'MENSAJE': l.mensaje || 'N/A',
            'ESTADO': estadoTexto[l.estado] || l.estado,
            'PÁGINA ORIGEN': l.pagina_origen || 'N/A'
        }));
        
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        
        const colWidths = [
            { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 15 },
            { wch: 25 }, { wch: 20 }, { wch: 10 }, { wch: 50 }, { wch: 12 }, { wch: 40 }
        ];
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `leads_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} leads a Excel`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// ==================== EXPORTAR LEADS A PDF ====================
window.exportarLeadsPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        const { data: leads, error } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('*')
            .order('creado_el', { ascending: false });
        
        if (error) throw error;
        
        if (!leads || leads.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay leads para exportar', 'info');
            return;
        }
        
        const total = leads.length;
        const nuevos = leads.filter(l => l.estado === 'NUEVO').length;
        const contactados = leads.filter(l => l.estado === 'CONTACTADO').length;
        const cotizados = leads.filter(l => l.estado === 'COTIZADO').length;
        
        const estadoTexto = {
            'NUEVO': 'Nuevo',
            'CONTACTADO': 'Contactado',
            'COTIZADO': 'Cotizado',
            'GANADO': 'Ganado',
            'PERDIDO': 'Perdido'
        };
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Leads</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #39080a; text-align: center; }
                    .stats { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
                    .stat { background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; flex: 1; border-left: 3px solid #39080a; }
                    .stat .number { font-size: 22px; font-weight: bold; color: #39080a; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                    th { background: #39080a; color: white; padding: 8px; text-align: left; }
                    td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <h1>REPORTE DE LEADS - COTIZACIONES</h1>
                <p style="text-align:center">Generado: ${new Date().toLocaleString('es-ES')}</p>
                <div class="stats">
                    <div class="stat"><div class="number">${total}</div><div class="label">Total Leads</div></div>
                    <div class="stat"><div class="number">${nuevos}</div><div class="label">Nuevos</div></div>
                    <div class="stat"><div class="number">${contactados}</div><div class="label">Contactados</div></div>
                    <div class="stat"><div class="number">${cotizados}</div><div class="label">Cotizados</div></div>
                </div>
                <table>
                    <thead><tr>
                        <th>Fecha</th><th>Producto</th><th>Nombre</th><th>Teléfono</th><th>Distrito</th><th>m²</th><th>Estado</th>
                    </tr></thead>
                    <tbody>
                        ${leads.map(l => `
                            <tr>
                                <td>${new Date(l.creado_el).toLocaleDateString()}</td>
                                <td>${l.producto_nombre || 'N/A'}</td>
                                <td>${l.nombre || 'N/A'}</td>
                                <td>${l.telefono || 'N/A'}</td>
                                <td>${l.distrito || 'N/A'}</td>
                                <td>${l.metros_cuadrados || '-'}</td>
                                <td>${estadoTexto[l.estado] || l.estado}</td>
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
        mostrarAlerta('Éxito', `Se exportaron ${leads.length} leads a PDF`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// ==================== ACTUALIZAR BADGE LEADS NUEVOS ====================
async function actualizarBadgeLeadsNuevos() {
    if (!usuarioActual || !usuarioActual.id) return;
    
    const permisos = await obtenerPermisosUsuario(usuarioActual.id);
    if (permisos.rol !== 'ADMINISTRADOR') return;
    
    try {
        const { count, error } = await window.supabaseClient
            .from('leads_cotizaciones')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'NUEVO');
        
        if (error) throw error;
        
        const badge = document.getElementById('leads-nuevos-badge');
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

// Llamar a esta función periódicamente
setInterval(() => {
    if (usuarioActual) {
        actualizarBadgeLeadsNuevos();
    }
}, 30000);

// Exponer funciones globales
window.cargarVistaLeads = cargarVistaLeads;