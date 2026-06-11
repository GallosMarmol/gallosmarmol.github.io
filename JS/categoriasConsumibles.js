// ==================== CATEGORÍAS DE CONSUMIBLES ====================

let categoriaConsumibleEditandoId = null;

// ==================== VISTA LISTADO DE CATEGORÍAS ====================
async function cargarVistaCategoriasConsumibles() {
    mostrarLoading('Cargando categorías...');
    
    try {
        console.log('%c📁 CARGANDO CATEGORÍAS DE CONSUMIBLES', 'background: #17a2b8; color: white; font-size: 14px;');
        
        const { data: categorias, error } = await window.supabaseClient
            .from('consumible_categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        // Obtener cantidad de tipos por categoría
        const { data: tipos } = await window.supabaseClient
            .from('consumible_tipos')
            .select('categoria_id');
        
        const tiposPorCategoria = new Map();
        tipos?.forEach(t => {
            tiposPorCategoria.set(t.categoria_id, (tiposPorCategoria.get(t.categoria_id) || 0) + 1);
        });
        
        // Obtener cantidad de consumibles por categoría
        const { data: consumibles } = await window.supabaseClient
            .from('consumibles')
            .select('categoria_id');
        
        const consumiblesPorCategoria = new Map();
        consumibles?.forEach(c => {
            consumiblesPorCategoria.set(c.categoria_id, (consumiblesPorCategoria.get(c.categoria_id) || 0) + 1);
        });
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-folder"></i> Categorías de Consumibles
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona las categorías de consumibles</p>
                    </div>
                    <button onclick="abrirModalCategoriaConsumible()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nueva Categoría
                    </button>
                </div>
            </div>
            
            <!-- Estadísticas -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${categorias?.length || 0}</p>
                    <p class="text-xs text-gray-500">Total Categorías</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                    <p class="text-2xl font-bold text-purple-600">${tipos?.length || 0}</p>
                    <p class="text-xs text-gray-500">Tipos Registrados</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${consumibles?.length || 0}</p>
                    <p class="text-xs text-gray-500">Consumibles Registrados</p>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Listado de Categorías
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipos</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumibles</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${categorias?.map(cat => {
                                const totalTipos = tiposPorCategoria.get(cat.id) || 0;
                                const totalConsumibles = consumiblesPorCategoria.get(cat.id) || 0;
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-3 text-sm font-medium text-primary">${cat.nombre}</td>
                                        <td class="px-4 py-3 text-sm max-w-xs truncate">${cat.descripcion || '-'}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs ${totalTipos > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}">
                                                ${totalTipos} tipo${totalTipos !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs ${totalConsumibles > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                                                ${totalConsumibles} consumible${totalConsumibles !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs ${cat.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${cat.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <button onclick="editarCategoriaConsumible('${cat.id}')" class="text-primary hover:text-primary-dark mr-2" title="Editar"><i class="fas fa-edit"></i></button>
                                            <button onclick="toggleEstadoCategoriaConsumible('${cat.id}', ${cat.activo})" class="${cat.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75 mr-2" title="${cat.activo ? 'Desactivar' : 'Activar'}"><i class="fas ${cat.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                                            <button onclick="verTiposPorCategoria('${cat.id}')" class="text-purple-600 hover:text-purple-800 mr-2" title="Ver tipos"><i class="fas fa-tags"></i></button>
                                            <button onclick="eliminarCategoriaConsumible('${cat.id}')" class="text-red-600 hover:text-red-800" title="Eliminar"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${(!categorias || categorias.length === 0) ? `
                                <tr><td colspan="6" class="text-center py-8 text-gray-500">No hay categorías registradas</td></tr>
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
        mostrarError('Error al cargar categorías: ' + error.message);
    }
}

// ==================== CRUD CATEGORÍAS ====================
window.abrirModalCategoriaConsumible = async function() {
    const modal = document.getElementById('categoriaConsumibleModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('categoriaConsumibleModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    categoriaConsumibleEditandoId = null;
    const form = document.getElementById('categoriaConsumibleForm');
    if (form) form.reset();
    
    document.getElementById('categoriaConsumibleModalTitle').innerText = 'Nueva Categoría';
    
    // Usar los nuevos IDs
    const activoSelect = document.getElementById('cat_activo');
    if (activoSelect) activoSelect.value = 'true';
    
    await window.abrirModal('categoriaConsumibleModal');
};

window.guardarCategoriaConsumible = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando categoría...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        // Usar los nuevos IDs únicos
        const nombreInput = document.getElementById('cat_nombre');
        const descripcionInput = document.getElementById('cat_descripcion');
        const activoSelect = document.getElementById('cat_activo');
        
        const nombre = nombreInput?.value?.trim();
        const descripcion = descripcionInput?.value || null;
        const activo = activoSelect?.value === 'true';
        
        if (!nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            if (nombreInput) nombreInput.focus();
            return;
        }
        
        const ahora = getFechaLocalForDB();
        
        const data = {
            nombre: nombre,
            descripcion: descripcion,
            activo: activo
        };
        
        if (categoriaConsumibleEditandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('consumible_categorias')
                .update(data)
                .eq('id', categoriaConsumibleEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría actualizada correctamente', 'success');
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('consumible_categorias')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría creada correctamente', 'success');
        }
        
        cerrarModal('categoriaConsumibleModal');
        await cargarVistaCategoriasConsumibles();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error al guardar categoría:', error);
        
        let mensajeError = 'No se pudo guardar la categoría';
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe una categoría con este nombre';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

window.editarCategoriaConsumible = async function(id) {
    mostrarLoading('Cargando categoría...');
    
    try {
        const { data: categoria, error } = await window.supabaseClient
            .from('consumible_categorias')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        categoriaConsumibleEditandoId = id;
        
        document.getElementById('categoriaConsumibleModalTitle').innerText = 'Editar Categoría';
        
        // Usar los nuevos IDs
        document.getElementById('cat_nombre').value = categoria.nombre || '';
        document.getElementById('cat_descripcion').value = categoria.descripcion || '';
        document.getElementById('cat_activo').value = categoria.activo ? 'true' : 'false';
        
        ocultarLoading();
        await window.abrirModal('categoriaConsumibleModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la categoría', 'error');
    }
};

window.toggleEstadoCategoriaConsumible = async function(id, activoActual) {
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
                .from('consumible_categorias')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Categoría ${accion}da correctamente`, 'success');
            await cargarVistaCategoriasConsumibles();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

window.eliminarCategoriaConsumible = async function(id) {
    // Verificar si hay tipos asociados
    const { count: tiposCount } = await window.supabaseClient
        .from('consumible_tipos')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);
    
    // Verificar si hay consumibles asociados
    const { count: consumiblesCount } = await window.supabaseClient
        .from('consumibles')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);
    
    if (tiposCount > 0 || consumiblesCount > 0) {
        let mensaje = `No se puede eliminar porque tiene:\n`;
        if (tiposCount > 0) mensaje += `- ${tiposCount} tipo(s) asociado(s)\n`;
        if (consumiblesCount > 0) mensaje += `- ${consumiblesCount} consumible(s) asociado(s)\n`;
        mensaje += `\nPrimero elimine o reasigne los elementos asociados.`;
        
        mostrarAlerta('Error', mensaje, 'error');
        return;
    }
    
    const result = await Swal.fire({
        title: '¿Eliminar categoría?',
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
                .from('consumible_categorias')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría eliminada correctamente', 'success');
            await cargarVistaCategoriasConsumibles();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la categoría', 'error');
        }
    }
};

// Ver tipos por categoría
window.verTiposPorCategoria = async function(categoriaId) {
    mostrarLoading('Cargando tipos...');
    
    try {
        const { data: categoria } = await window.supabaseClient
            .from('consumible_categorias')
            .select('nombre')
            .eq('id', categoriaId)
            .single();
        
        const { data: tipos, error } = await window.supabaseClient
            .from('consumible_tipos')
            .select('*')
            .eq('categoria_id', categoriaId)
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        ocultarLoading();
        
        let tiposHtml = '';
        if (tipos && tipos.length > 0) {
            tiposHtml = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr><th class="px-4 py-2 text-left text-xs font-medium">Nombre</th><th class="px-4 py-2 text-left text-xs font-medium">Descripción</th><th class="px-4 py-2 text-left text-xs font-medium">Estado</th></tr>
                    </thead>
                    <tbody>
                        ${tipos.map(t => `
                            <tr><td class="px-4 py-2 text-sm">${t.nombre}</td><td class="px-4 py-2 text-sm">${t.descripcion || '-'}</td><td class="px-4 py-2"><span class="px-2 py-1 rounded-full text-xs ${t.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${t.activo ? 'Activo' : 'Inactivo'}</span></td></tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            tiposHtml = '<p class="text-center text-gray-500 py-4">No hay tipos registrados en esta categoría</p>';
        }
        
        Swal.fire({
            title: `Tipos de Consumible - ${categoria?.nombre || 'Categoría'}`,
            html: `<div class="max-h-96 overflow-y-auto">${tiposHtml}</div>`,
            width: '600px',
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar'
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los tipos', 'error');
    }
};