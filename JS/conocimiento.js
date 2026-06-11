// ==================== BASE DE CONOCIMIENTO ====================

async function cargarVistaConocimiento() {
    mostrarLoading('Cargando base de conocimiento...');
    
    try {
        // Obtener categorías
        const { data: categorias } = await window.supabaseClient
            .from('conocimiento_categorias')
            .select('*')
            .eq('activo', true)
            .order('orden');
        
        // Obtener artículos destacados (más vistos)
        const { data: articulosDestacados } = await window.supabaseClient
            .from('conocimiento_articulos')
            .select('*, categoria:conocimiento_categorias(id, nombre)')
            .eq('estado', 'PUBLICADO')
            .eq('activo', true)
            .order('visitas', { ascending: false })
            .limit(5);
        
        // Obtener artículos recientes
        const { data: articulosRecientes } = await window.supabaseClient
            .from('conocimiento_articulos')
            .select('*, categoria:conocimiento_categorias(id, nombre)')
            .eq('estado', 'PUBLICADO')
            .eq('activo', true)
            .order('publicado_el', { ascending: false })
            .limit(5);
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-database"></i> Base de Conocimiento
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Encuentra respuestas, guías y soluciones</p>
                    </div>
                </div>
            </div>
            
            <!-- Buscador -->
            <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div class="relative">
                    <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="buscarArticulo" placeholder="Buscar artículos por título, contenido o etiquetas..." 
                        class="w-full pl-12 pr-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:border-primary"
                        onkeyup="buscarArticulos()">
                </div>
                <div class="flex flex-wrap gap-2 mt-3">
                    <span class="text-sm text-gray-500">Sugerencias:</span>
                    <button onclick="buscarPorEtiqueta('impresora')" class="text-xs bg-gray-100 px-2 py-1 rounded-full hover:bg-primary hover:text-white">impresora</button>
                    <button onclick="buscarPorEtiqueta('correo')" class="text-xs bg-gray-100 px-2 py-1 rounded-full hover:bg-primary hover:text-white">correo</button>
                    <button onclick="buscarPorEtiqueta('vpn')" class="text-xs bg-gray-100 px-2 py-1 rounded-full hover:bg-primary hover:text-white">vpn</button>
                    <button onclick="buscarPorEtiqueta('contraseña')" class="text-xs bg-gray-100 px-2 py-1 rounded-full hover:bg-primary hover:text-white">contraseña</button>
                </div>
            </div>
            
            <!-- Categorías -->
            <h2 class="text-xl font-semibold text-gray-800 mb-4">📁 Categorías</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                ${categorias?.map(cat => `
                    <div onclick="buscarPorCategoria('${cat.id}')" class="bg-white rounded-xl shadow-sm p-4 text-center cursor-pointer hover:shadow-md transition-all border border-gray-100">
                        <i class="${cat.icono || 'fas fa-folder'} text-2xl text-primary mb-2"></i>
                        <p class="font-medium text-gray-700">${cat.nombre}</p>
                    </div>
                `).join('')}
            </div>
            
            <!-- Artículos Destacados -->
            <h2 class="text-xl font-semibold text-gray-800 mb-4">⭐ Artículos Destacados</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                ${articulosDestacados?.map(art => `
                    <div onclick="verArticulo('${art.id}')" class="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all border border-gray-100">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h3 class="font-semibold text-primary mb-1">${art.titulo}</h3>
                                <p class="text-xs text-gray-400">${art.categoria?.nombre} • ${art.visitas} visitas</p>
                            </div>
                            <i class="fas fa-arrow-right text-gray-300"></i>
                        </div>
                    </div>
                `).join('')}
                ${(!articulosDestacados || articulosDestacados.length === 0) ? '<p class="text-gray-400">No hay artículos destacados</p>' : ''}
            </div>
            
            <!-- Artículos Recientes -->
            <h2 class="text-xl font-semibold text-gray-800 mb-4">🆕 Artículos Recientes</h2>
            <div class="space-y-3">
                ${articulosRecientes?.map(art => `
                    <div onclick="verArticulo('${art.id}')" class="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all border border-gray-100">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="font-semibold text-primary">${art.titulo}</h3>
                                <p class="text-xs text-gray-400 mt-1">${art.categoria?.nombre} • Publicado: ${new Date(art.publicado_el).toLocaleDateString()}</p>
                            </div>
                            <i class="fas fa-chevron-right text-gray-300"></i>
                        </div>
                    </div>
                `).join('')}
                ${(!articulosRecientes || articulosRecientes.length === 0) ? '<p class="text-gray-400">No hay artículos recientes</p>' : ''}
            </div>
            
            <div id="resultadosBusqueda" class="mt-6 hidden"></div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Función de búsqueda
        window.buscarArticulos = async function() {
            const termino = document.getElementById('buscarArticulo')?.value.trim();
            const resultadosDiv = document.getElementById('resultadosBusqueda');
            
            if (!termino || termino.length < 2) {
                resultadosDiv.classList.add('hidden');
                return;
            }
            
            mostrarLoading('Buscando...');
            
            try {
                const { data: articulos } = await window.supabaseClient
                    .from('conocimiento_articulos')
                    .select('*, categoria:conocimiento_categorias(id, nombre)')
                    .eq('estado', 'PUBLICADO')
                    .eq('activo', true)
                    .or(`titulo.ilike.%${termino}%,contenido.ilike.%${termino}%`);
                
                ocultarLoading();
                
                resultadosDiv.classList.remove('hidden');
                resultadosDiv.innerHTML = `
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">🔍 Resultados para: "${termino}" (${articulos?.length || 0})</h2>
                    <div class="space-y-3">
                        ${articulos?.map(art => `
                            <div onclick="verArticulo('${art.id}')" class="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all border border-gray-100">
                                <h3 class="font-semibold text-primary">${art.titulo}</h3>
                                <p class="text-sm text-gray-500 mt-1">${art.categoria?.nombre} • ${art.visitas} visitas</p>
                            </div>
                        `).join('')}
                        ${(!articulos || articulos.length === 0) ? '<p class="text-gray-400">No se encontraron artículos</p>' : ''}
                    </div>
                `;
                
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
            }
        };
        
        window.buscarPorEtiqueta = function(etiqueta) {
            document.getElementById('buscarArticulo').value = etiqueta;
            buscarArticulos();
        };
        
        window.buscarPorCategoria = async function(categoriaId) {
            mostrarLoading('Cargando artículos...');
            
            try {
                const { data: articulos } = await window.supabaseClient
                    .from('conocimiento_articulos')
                    .select('*, categoria:conocimiento_categorias(id, nombre)')
                    .eq('estado', 'PUBLICADO')
                    .eq('activo', true)
                    .eq('categoria_id', categoriaId);
                
                const categoria = categorias?.find(c => c.id === categoriaId);
                
                ocultarLoading();
                
                const resultadosDiv = document.getElementById('resultadosBusqueda');
                resultadosDiv.classList.remove('hidden');
                resultadosDiv.innerHTML = `
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">📁 ${categoria?.nombre} (${articulos?.length || 0})</h2>
                    <div class="space-y-3">
                        ${articulos?.map(art => `
                            <div onclick="verArticulo('${art.id}')" class="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all border border-gray-100">
                                <h3 class="font-semibold text-primary">${art.titulo}</h3>
                                <p class="text-sm text-gray-500 mt-1">${art.visitas} visitas</p>
                            </div>
                        `).join('')}
                        ${(!articulos || articulos.length === 0) ? '<p class="text-gray-400">No hay artículos en esta categoría</p>' : ''}
                    </div>
                `;
                
                // Scroll a resultados
                resultadosDiv.scrollIntoView({ behavior: 'smooth' });
                
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
            }
        };
        
        window.verArticulo = async function(articuloId) {
            mostrarLoading('Cargando artículo...');
            
            try {
                // Incrementar visitas
                await window.supabaseClient.rpc('incrementar_visitas_articulo', {
                    p_articulo_id: articuloId
                });
                
                const { data: articulo } = await window.supabaseClient
                    .from('conocimiento_articulos')
                    .select('*, categoria:conocimiento_categorias(id, nombre), autor:autor_id(correo)')
                    .eq('id', articuloId)
                    .single();
                
                ocultarLoading();
                
                Swal.fire({
                    title: `<span class="text-primary">${articulo.titulo}</span>`,
                    width: '800px',
                    html: `
                        <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div class="flex justify-between items-center text-sm text-gray-400">
                                <div><i class="fas fa-folder"></i> ${articulo.categoria?.nombre}</div>
                                <div><i class="fas fa-eye"></i> ${articulo.visitas} visitas</div>
                            </div>
                            <div class="prose max-w-none">
                                ${articulo.contenido}
                            </div>
                            <div class="flex flex-wrap gap-2 pt-2">
                                ${articulo.etiquetas?.map(et => `
                                    <span onclick="buscarPorEtiqueta('${et}')" class="text-xs bg-gray-100 px-2 py-1 rounded-full cursor-pointer hover:bg-primary hover:text-white">#${et}</span>
                                `).join('')}
                            </div>
                            <div class="border-t pt-3 text-xs text-gray-400">
                                <i class="fas fa-user"></i> Autor: ${articulo.autor?.correo || 'Sistema'} • 
                                Última actualización: ${new Date(articulo.modificado_el || articulo.publicado_el).toLocaleDateString()}
                            </div>
                            <div class="flex items-center justify-center gap-4 pt-2">
                                <button onclick="votarArticulo('${articulo.id}', true)" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                                    <i class="fas fa-thumbs-up"></i> Útil
                                </button>
                                <button onclick="votarArticulo('${articulo.id}', false)" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                                    <i class="fas fa-thumbs-down"></i> No útil
                                </button>
                            </div>
                        </div>
                    `,
                    confirmButtonColor: '#39080a',
                    confirmButtonText: 'Cerrar'
                });
                
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo cargar el artículo', 'error');
            }
        };
        
        window.votarArticulo = async function(articuloId, util) {
            try {
                const { error } = await window.supabaseClient
                    .from('conocimiento_votos')
                    .upsert({
                        articulo_id: articuloId,
                        usuario_id: usuarioActual.id,
                        util: util,
                        creado_el: getFechaLocalForDB()
                    }, { onConflict: 'articulo_id,usuario_id' });
                
                if (error) throw error;
                
                // Actualizar contadores en el artículo
                if (util) {
                    await window.supabaseClient.rpc('incrementar_votos_utiles', { p_articulo_id: articuloId });
                } else {
                    await window.supabaseClient.rpc('incrementar_votos_no_utiles', { p_articulo_id: articuloId });
                }
                
                mostrarAlerta('Gracias', 'Tu opinión ha sido registrada', 'success');
                
            } catch (error) {
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo registrar tu voto', 'error');
            }
        };
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar base de conocimiento: ' + error.message);
    }
}

// ==================== FUNCIONES ADICIONALES PARA CONOCIMIENTO ====================

// Gestionar artículos (solo admin)
window.cargarVistaConocimientoArticulos = async function() {
    mostrarLoading('Cargando artículos...');
    
    try {
        const { data: articulos, error } = await window.supabaseClient
            .from('conocimiento_articulos')
            .select('*, categoria:conocimiento_categorias(id, nombre), autor:autor_id(correo)')
            .order('modificado_el', { ascending: false });
        
        if (error) throw error;
        
        // Cargar categorías para el filtro
        const { data: categorias } = await window.supabaseClient
            .from('conocimiento_categorias')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-edit"></i> Gestionar Artículos
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Crear, editar y publicar artículos</p>
                    </div>
                    <button onclick="abrirModalNuevoArticulo()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nuevo Artículo
                    </button>
                </div>
            </div>
            
            <!-- Filtros -->
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <select id="filtroCategoriaArticulo" class="px-3 py-1 text-sm border border-gray-200 rounded-lg" onchange="filtrarArticulosAdmin()">
                    <option value="">Todas las categorías</option>
                    ${categorias?.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                </select>
                <select id="filtroEstadoArticulo" class="px-3 py-1 text-sm border border-gray-200 rounded-lg" onchange="filtrarArticulosAdmin()">
                    <option value="">Todos los estados</option>
                    <option value="PUBLICADO">Publicados</option>
                    <option value="BORRADOR">Borradores</option>
                    <option value="ARCHIVADO">Archivados</option>
                </select>
                <input type="text" id="busquedaArticulosAdmin" placeholder="Buscar..." class="px-3 py-1 text-sm border border-gray-200 rounded-lg w-64" onkeyup="filtrarArticulosAdmin()">
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaArticulos">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visitas</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última modificación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            <tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${articulos?.map(a => `
                                <tr data-titulo="${a.titulo?.toLowerCase()}" data-categoria="${a.categoria_id}" data-estado="${a.estado}">
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${a.titulo}</td>
                                    <td class="px-4 py-3 text-sm">${a.categoria?.nombre || 'N/A'}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${a.estado === 'PUBLICADO' ? 'bg-green-100 text-green-800' : a.estado === 'BORRADOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
                                            ${a.estado === 'PUBLICADO' ? 'Publicado' : a.estado === 'BORRADOR' ? 'Borrador' : 'Archivado'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">${a.visitas || 0}</td>
                                    <td class="px-4 py-3 text-sm">${a.modificado_el ? new Date(a.modificado_el).toLocaleDateString() : new Date(a.creado_el).toLocaleDateString()}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="editarArticulo('${a.id}')" class="text-primary hover:text-primary-dark mr-2" title="Editar"><i class="fas fa-edit"></i></button>
                                        <button onclick="toggleEstadoArticulo('${a.id}', '${a.estado}')" class="text-orange-600 hover:text-orange-800 mr-2" title="Cambiar estado"><i class="fas fa-exchange-alt"></i></button>
                                        <button onclick="verArticulo('${a.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Ver"><i class="fas fa-eye"></i></button>
                                        <button onclick="eliminarArticulo('${a.id}')" class="text-red-600 hover:text-red-800" title="Eliminar"><i class="fas fa-trash"></i></button>
                                    </td>
                                 </tr>
                            `).join('')}
                            ${(!articulos || articulos.length === 0) ? '<tr><td colspan="6" class="text-center py-8 text-gray-500">No hay artículos registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        window.filtrarArticulosAdmin = function() {
            const categoria = document.getElementById('filtroCategoriaArticulo')?.value;
            const estado = document.getElementById('filtroEstadoArticulo')?.value;
            const busqueda = document.getElementById('busquedaArticulosAdmin')?.value.toLowerCase() || '';
            const filas = document.querySelectorAll('#tablaArticulos tbody tr');
            
            filas.forEach(fila => {
                const titulo = fila.dataset.titulo || '';
                const catId = fila.dataset.categoria || '';
                const estadoActual = fila.dataset.estado || '';
                
                let mostrar = true;
                if (categoria && catId !== categoria) mostrar = false;
                if (estado && estadoActual !== estado) mostrar = false;
                if (busqueda && !titulo.includes(busqueda)) mostrar = false;
                
                fila.style.display = mostrar ? '' : 'none';
            });
        };
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar artículos: ' + error.message);
    }
};

// Gestionar categorías de conocimiento
window.cargarVistaConocimientoCategorias = async function() {
    mostrarLoading('Cargando categorías...');
    
    try {
        const { data: categorias, error } = await window.supabaseClient
            .from('conocimiento_categorias')
            .select('*')
            .order('orden');
        
        if (error) throw error;
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-tags"></i> Categorías de Conocimiento
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona las categorías de la base de conocimiento</p>
                    </div>
                    <button onclick="abrirModalCategoriaConocimiento()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nueva Categoría
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${categorias?.map(cat => `
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-2">
                                    <i class="${cat.icono || 'fas fa-folder'} text-primary text-xl"></i>
                                    <h3 class="font-bold text-primary">${cat.nombre}</h3>
                                </div>
                                <span class="estado-badge ${cat.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${cat.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                        <div class="p-4">
                            <p class="text-sm text-gray-600">${cat.descripcion || 'Sin descripción'}</p>
                            <div class="mt-3 flex items-center gap-3 text-xs text-gray-400">
                                <span><i class="fas fa-arrow-down"></i> Orden: ${cat.orden || 0}</span>
                                <span><i class="fas fa-code"></i> Icono: ${cat.icono || 'fas fa-folder'}</span>
                            </div>
                        </div>
                        <div class="border-t border-gray-100 p-3 flex justify-end gap-2">
                            <button onclick="editarCategoriaConocimiento('${cat.id}')" class="text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="toggleEstadoCategoriaConocimiento('${cat.id}', ${cat.activo})" class="${cat.activo ? 'text-orange-600' : 'text-green-600'} hover:bg-${cat.activo ? 'orange' : 'green'}-600 hover:text-white p-2 rounded-lg transition-colors">
                                <i class="fas ${cat.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                            </button>
                            <button onclick="eliminarCategoriaConocimiento('${cat.id}')" class="text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${(!categorias || categorias.length === 0) ? '<div class="col-span-full text-center py-12 bg-white rounded-lg"><p>No hay categorías registradas</p></div>' : ''}
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar categorías: ' + error.message);
    }
};

// ==================== CRUD COMPLETO PARA ARTÍCULOS DE CONOCIMIENTO ====================

let articuloEditandoId = null;
let categoriaConocimientoEditandoId = null;

// ==================== ARTÍCULOS ====================

window.abrirModalNuevoArticulo = async function() {
    const modal = document.getElementById('articuloModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('articuloModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    articuloEditandoId = null;
    
    const form = document.getElementById('articuloForm');
    if (form) form.reset();
    
    document.getElementById('articuloModalTitle').innerText = 'Nuevo Artículo';
    document.getElementById('articulo_estado').value = 'BORRADOR';
    
    // Cargar categorías
    await cargarCategoriasConocimientoSelect();
    
    await window.abrirModal('articuloModal');
};

window.editarArticulo = async function(id) {
    mostrarLoading('Cargando artículo...');
    
    try {
        const { data: articulo, error } = await window.supabaseClient
            .from('conocimiento_articulos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        articuloEditandoId = id;
        
        document.getElementById('articuloModalTitle').innerText = 'Editar Artículo';
        document.getElementById('articulo_titulo').value = articulo.titulo || '';
        document.getElementById('articulo_contenido').value = articulo.contenido || '';
        document.getElementById('articulo_etiquetas').value = articulo.etiquetas?.join(', ') || '';
        document.getElementById('articulo_estado').value = articulo.estado || 'BORRADOR';
        
        await cargarCategoriasConocimientoSelect();
        document.getElementById('articulo_categoria_id').value = articulo.categoria_id || '';
        
        ocultarLoading();
        await window.abrirModal('articuloModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el artículo', 'error');
    }
};

window.guardarArticulo = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando artículo...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const ahora = getFechaLocalForDB();
        
        // Procesar etiquetas
        const etiquetasTexto = document.getElementById('articulo_etiquetas').value;
        const etiquetas = etiquetasTexto ? etiquetasTexto.split(',').map(e => e.trim()) : [];
        
        const data = {
            titulo: document.getElementById('articulo_titulo').value,
            contenido: document.getElementById('articulo_contenido').value || null,
            categoria_id: document.getElementById('articulo_categoria_id').value || null,
            etiquetas: etiquetas,
            estado: document.getElementById('articulo_estado').value
        };
        
        if (!data.titulo) {
            ocultarLoading();
            mostrarAlerta('Error', 'El título es obligatorio', 'error');
            return;
        }
        
        if (articuloEditandoId) {
            // Actualizar
            data.modificado_el = ahora;
            
            const { error } = await window.supabaseClient
                .from('conocimiento_articulos')
                .update(data)
                .eq('id', articuloEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Artículo actualizado correctamente', 'success');
        } else {
            // Crear nuevo
            if (data.estado === 'PUBLICADO') {
                data.publicado_el = ahora;
            }
            data.creado_el = ahora;
            data.autor_id = usuarioActual.id;
            data.version = 1;
            
            const { error } = await window.supabaseClient
                .from('conocimiento_articulos')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Artículo creado correctamente', 'success');
        }
        
        cerrarModal('articuloModal');
        articuloEditandoId = null;
        await cargarVistaConocimientoArticulos();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el artículo', 'error');
    }
};

window.toggleEstadoArticulo = async function(id, estadoActual) {
    const nuevoEstado = estadoActual === 'PUBLICADO' ? 'ARCHIVADO' : 'PUBLICADO';
    const accion = nuevoEstado === 'PUBLICADO' ? 'Publicar' : 'Archivar';
    
    const result = await Swal.fire({
        title: `${accion} artículo`,
        text: `¿Desea ${accion.toLowerCase()} este artículo?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado === 'PUBLICADO' ? '#28a745' : '#ffc107',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading(`${accion}ndo...`);
        
        try {
            const ahora = getFechaLocalForDB();
            const updateData = { estado: nuevoEstado };
            
            if (nuevoEstado === 'PUBLICADO') {
                updateData.publicado_el = ahora;
            }
            
            const { error } = await window.supabaseClient
                .from('conocimiento_articulos')
                .update(updateData)
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Artículo ${accion.toLowerCase()} correctamente`, 'success');
            await cargarVistaConocimientoArticulos();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', `No se pudo ${accion.toLowerCase()} el artículo`, 'error');
        }
    }
};

window.eliminarArticulo = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar artículo?',
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
            // Eliminar votos asociados
            await window.supabaseClient
                .from('conocimiento_votos')
                .delete()
                .eq('articulo_id', id);
            
            // Eliminar artículo
            const { error } = await window.supabaseClient
                .from('conocimiento_articulos')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Artículo eliminado correctamente', 'success');
            await cargarVistaConocimientoArticulos();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el artículo', 'error');
        }
    }
};

// ==================== CATEGORÍAS DE CONOCIMIENTO ====================

window.abrirModalCategoriaConocimiento = async function() {
    const modal = document.getElementById('categoriaConocimientoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('categoriaConocimientoModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    categoriaConocimientoEditandoId = null;
    
    const form = document.getElementById('categoriaConocimientoForm');
    if (form) form.reset();
    
    document.getElementById('categoriaConocimientoModalTitle').innerText = 'Nueva Categoría';
    document.getElementById('categoria_conocimiento_activo').value = 'true';
    document.getElementById('categoria_conocimiento_orden').value = '0';
    document.getElementById('categoria_conocimiento_icono').value = 'fas fa-folder';
    
    await window.abrirModal('categoriaConocimientoModal');
};

window.editarCategoriaConocimiento = async function(id) {
    mostrarLoading('Cargando categoría...');
    
    try {
        const { data: categoria, error } = await window.supabaseClient
            .from('conocimiento_categorias')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        categoriaConocimientoEditandoId = id;
        
        document.getElementById('categoriaConocimientoModalTitle').innerText = 'Editar Categoría';
        document.getElementById('categoria_conocimiento_nombre').value = categoria.nombre || '';
        document.getElementById('categoria_conocimiento_descripcion').value = categoria.descripcion || '';
        document.getElementById('categoria_conocimiento_icono').value = categoria.icono || 'fas fa-folder';
        document.getElementById('categoria_conocimiento_orden').value = categoria.orden || 0;
        document.getElementById('categoria_conocimiento_activo').value = categoria.activo ? 'true' : 'false';
        
        ocultarLoading();
        await window.abrirModal('categoriaConocimientoModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la categoría', 'error');
    }
};

window.guardarCategoriaConocimiento = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando categoría...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        const ahora = getFechaLocalForDB();
        
        const data = {
            nombre: document.getElementById('categoria_conocimiento_nombre').value,
            descripcion: document.getElementById('categoria_conocimiento_descripcion').value || null,
            icono: document.getElementById('categoria_conocimiento_icono').value,
            orden: parseInt(document.getElementById('categoria_conocimiento_orden').value) || 0,
            activo: document.getElementById('categoria_conocimiento_activo').value === 'true'
        };
        
        if (!data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            return;
        }
        
        if (categoriaConocimientoEditandoId) {
            // Actualizar
            data.modificado_el = ahora;
            
            const { error } = await window.supabaseClient
                .from('conocimiento_categorias')
                .update(data)
                .eq('id', categoriaConocimientoEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría actualizada correctamente', 'success');
        } else {
            // Crear nueva
            data.creado_el = ahora;
            
            const { error } = await window.supabaseClient
                .from('conocimiento_categorias')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría creada correctamente', 'success');
        }
        
        cerrarModal('categoriaConocimientoModal');
        categoriaConocimientoEditandoId = null;
        await cargarVistaConocimientoCategorias();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la categoría', 'error');
    }
};

window.toggleEstadoCategoriaConocimiento = async function(id, activoActual) {
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
            const ahora = getFechaLocalForDB();
            
            const { error } = await window.supabaseClient
                .from('conocimiento_categorias')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora
                })
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Categoría ${accion}da correctamente`, 'success');
            await cargarVistaConocimientoCategorias();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

window.eliminarCategoriaConocimiento = async function(id) {
    // Verificar si hay artículos en esta categoría
    const { count } = await window.supabaseClient
        .from('conocimiento_articulos')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);
    
    if (count > 0) {
        const result = await Swal.fire({
            title: '¿Eliminar categoría?',
            html: `<div class="text-center">
                <p>Esta categoría tiene <strong>${count} artículo(s)</strong> asociado(s).</p>
                <p class="text-sm text-gray-500 mt-2">Los artículos quedarán sin categoría.</p>
                <p>¿Deseas continuar?</p>
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
            .from('conocimiento_categorias')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Categoría eliminada correctamente', 'success');
        await cargarVistaConocimientoCategorias();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo eliminar la categoría', 'error');
    }
};

// ==================== FUNCIONES AUXILIARES ====================

async function cargarCategoriasConocimientoSelect() {
    try {
        const { data: categorias, error } = await window.supabaseClient
            .from('conocimiento_categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        const select = document.getElementById('articulo_categoria_id');
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