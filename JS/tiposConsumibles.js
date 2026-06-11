// ==================== TIPOS DE CONSUMIBLES ====================

let tipoConsumibleEditandoId = null;

// ==================== VISTA LISTADO DE TIPOS ====================
async function cargarVistaTiposConsumibles() {
    mostrarLoading('Cargando tipos de consumibles...');
    
    try {
        console.log('%c🏷️ CARGANDO TIPOS DE CONSUMIBLES', 'background: #fd7e14; color: white; font-size: 14px;');
        
        const { data: tipos, error } = await window.supabaseClient
            .from('consumible_tipos')
            .select(`
                *,
                categoria:consumible_categorias(id, nombre)
            `)
            .order('categoria_id')
            .order('nombre');
        
        if (error) throw error;
        
        // Obtener cantidad de consumibles por tipo
        const { data: consumibles } = await window.supabaseClient
            .from('consumibles')
            .select('tipo_id');
        
        const consumiblesPorTipo = new Map();
        consumibles?.forEach(c => {
            consumiblesPorTipo.set(c.tipo_id, (consumiblesPorTipo.get(c.tipo_id) || 0) + 1);
        });
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-tags"></i> Tipos de Consumible
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestiona los tipos de consumibles por categoría</p>
                    </div>
                    <button onclick="abrirModalTipoConsumible()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nuevo Tipo
                    </button>
                </div>
            </div>
            
            <!-- Estadísticas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <p class="text-2xl font-bold text-primary">${tipos?.length || 0}</p>
                    <p class="text-xs text-gray-500">Total Tipos</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <p class="text-2xl font-bold text-green-600">${consumibles?.length || 0}</p>
                    <p class="text-xs text-gray-500">Consumibles Registrados</p>
                </div>
            </div>
            
            <!-- Filtro por categoría -->
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por categoría:</span>
                <button onclick="filtrarTiposPorCategoria('todas')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-categoria-btn" data-categoria="todas">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${tipos?.length || 0}</span></button>
                ${[...new Set(tipos?.map(t => t.categoria_id))].map(catId => {
                    const cat = tipos?.find(t => t.categoria_id === catId)?.categoria;
                    const count = tipos?.filter(t => t.categoria_id === catId).length || 0;
                    return `<button onclick="filtrarTiposPorCategoria('${catId}')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-categoria-btn" data-categoria="${catId}">${cat?.nombre || 'Sin categoría'} <span class="ml-1 bg-blue-200 px-2 py-0.5 rounded-full text-xs">${count}</span></button>`;
                }).join('')}
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-700">
                        <i class="fas fa-list text-primary mr-2"></i> Listado de Tipos
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="tablaTipos">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumibles</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tipos?.map(t => {
                                const totalConsumibles = consumiblesPorTipo.get(t.id) || 0;
                                return `
                                    <tr data-categoria-id="${t.categoria_id}" class="tipo-row">
                                        <td class="px-4 py-3 text-sm font-medium text-primary">${t.nombre}</td>
                                        <td class="px-4 py-3 text-sm">${t.categoria?.nombre || 'N/A'}</td>
                                        <td class="px-4 py-3 text-sm max-w-xs truncate">${t.descripcion || '-'}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs ${totalConsumibles > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                                                ${totalConsumibles}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">${t.orden || 0}</td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs ${t.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${t.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <button onclick="editarTipoConsumible('${t.id}')" class="text-primary hover:text-primary-dark mr-2" title="Editar"><i class="fas fa-edit"></i></button>
                                            <button onclick="toggleEstadoTipoConsumible('${t.id}', ${t.activo})" class="${t.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75 mr-2" title="${t.activo ? 'Desactivar' : 'Activar'}"><i class="fas ${t.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                                            <button onclick="eliminarTipoConsumible('${t.id}')" class="text-red-600 hover:text-red-800" title="Eliminar"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${(!tipos || tipos.length === 0) ? '<tr><td colspan="7" class="text-center py-8 text-gray-500">No hay tipos registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Función de filtro
        window.filtrarTiposPorCategoria = function(categoriaId) {
            const botones = document.querySelectorAll('.filter-categoria-btn');
            botones.forEach(btn => {
                btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
                if (btn.dataset.categoria === categoriaId) {
                    btn.classList.add('ring-2', 'ring-primary', 'font-bold');
                }
            });
            
            const filas = document.querySelectorAll('#tablaTipos .tipo-row');
            filas.forEach(fila => {
                if (categoriaId === 'todas' || fila.dataset.categoriaId === categoriaId) {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        };
        
        // Resaltar filtro activo por defecto
        document.querySelector('.filter-categoria-btn[data-categoria="todas"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar tipos: ' + error.message);
    }
}

// ==================== CRUD TIPOS ====================
window.abrirModalTipoConsumible = async function() {
    const modal = document.getElementById('tipoConsumibleModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('tipoConsumibleModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    tipoConsumibleEditandoId = null;
    const form = document.getElementById('tipoConsumibleForm');
    if (form) form.reset();
    
    document.getElementById('tipoConsumibleModalTitle').innerText = 'Nuevo Tipo de Consumible';
    
    // Usar los nuevos IDs únicos
    const activoSelect = document.getElementById('tipo_consumible_activo');
    if (activoSelect) activoSelect.value = 'true';
    
    const ordenInput = document.getElementById('tipo_consumible_orden');
    if (ordenInput) ordenInput.value = '0';
    
    // Cargar categorías
    await cargarCategoriasParaTipo();
    
    await window.abrirModal('tipoConsumibleModal');
};

async function cargarCategoriasParaTipo() {
    try {
        const { data: categorias, error } = await window.supabaseClient
            .from('consumible_categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        // Usar el nuevo ID único del select
        const select = document.getElementById('tipo_consumible_categoria_id');
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

window.guardarTipoConsumible = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando tipo...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión', 'error');
            return;
        }
        
        // Usar los nuevos IDs únicos
        const nombreInput = document.getElementById('tipo_consumible_nombre');
        const categoriaSelect = document.getElementById('tipo_consumible_categoria_id');
        const descripcionInput = document.getElementById('tipo_consumible_descripcion');
        const ordenInput = document.getElementById('tipo_consumible_orden');
        const activoSelect = document.getElementById('tipo_consumible_activo');
        
        const nombre = nombreInput?.value?.trim();
        const categoria_id = categoriaSelect?.value;
        const descripcion = descripcionInput?.value || null;
        const orden = parseInt(ordenInput?.value) || 0;
        const activo = activoSelect?.value === 'true';
        
        console.log('📝 Valores obtenidos:', { nombre, categoria_id, descripcion, orden, activo });
        
        if (!nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            if (nombreInput) nombreInput.focus();
            return;
        }
        
        if (!categoria_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una categoría', 'error');
            if (categoriaSelect) categoriaSelect.focus();
            return;
        }
        
        const data = {
            nombre: nombre,
            categoria_id: categoria_id,
            descripcion: descripcion,
            orden: orden,
            activo: activo
        };
        
        if (tipoConsumibleEditandoId) {
            const { error } = await window.supabaseClient
                .from('consumible_tipos')
                .update(data)
                .eq('id', tipoConsumibleEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Tipo actualizado correctamente', 'success');
        } else {
            const { error } = await window.supabaseClient
                .from('consumible_tipos')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Tipo creado correctamente', 'success');
        }
        
        cerrarModal('tipoConsumibleModal');
        await cargarVistaTiposConsumibles();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error al guardar tipo:', error);
        
        let mensajeError = 'No se pudo guardar el tipo';
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe un tipo con este nombre en esta categoría';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

window.editarTipoConsumible = async function(id) {
    mostrarLoading('Cargando tipo...');
    
    try {
        const { data: tipo, error } = await window.supabaseClient
            .from('consumible_tipos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        tipoConsumibleEditandoId = id;
        
        document.getElementById('tipoConsumibleModalTitle').innerText = 'Editar Tipo';
        
        // Usar los nuevos IDs únicos
        document.getElementById('tipo_consumible_nombre').value = tipo.nombre || '';
        document.getElementById('tipo_consumible_descripcion').value = tipo.descripcion || '';
        document.getElementById('tipo_consumible_orden').value = tipo.orden || 0;
        document.getElementById('tipo_consumible_activo').value = tipo.activo ? 'true' : 'false';
        
        await cargarCategoriasParaTipo();
        document.getElementById('tipo_consumible_categoria_id').value = tipo.categoria_id || '';
        
        ocultarLoading();
        await window.abrirModal('tipoConsumibleModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el tipo', 'error');
    }
};

window.toggleEstadoTipoConsumible = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} tipo?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} este tipo.`,
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
                .from('consumible_tipos')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Tipo ${accion}do correctamente`, 'success');
            await cargarVistaTiposConsumibles();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

window.eliminarTipoConsumible = async function(id) {
    // Verificar si hay consumibles asociados
    const { count } = await window.supabaseClient
        .from('consumibles')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_id', id);
    
    if (count > 0) {
        mostrarAlerta('Error', `No se puede eliminar porque tiene ${count} consumible(s) asociado(s)`, 'error');
        return;
    }
    
    const result = await Swal.fire({
        title: '¿Eliminar tipo?',
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
                .from('consumible_tipos')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Tipo eliminado correctamente', 'success');
            await cargarVistaTiposConsumibles();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el tipo', 'error');
        }
    }
};