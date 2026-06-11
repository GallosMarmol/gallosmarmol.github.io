// ==================== VISTA UNIDADES DE MEDIDA ====================

async function cargarVistaUnidadesMedida() {
    mostrarLoading('Cargando unidades de medida...');
    
    try {
        const { data: unidades, error } = await window.supabaseClient
            .from('unidad_medida')
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
                            <i class="fas fa-ruler"></i> Unidades de Medida
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">Gestión de unidades de medida para consumibles</p>
                    </div>
                    <button onclick="abrirModalNuevaUnidadMedida()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nueva Unidad
                    </button>
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plural</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abreviatura</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${unidades?.map(u => `
                                <tr>
                                    <td class="px-4 py-3 text-sm font-mono">${u.codigo}</td>
                                    <td class="px-4 py-3 text-sm font-medium text-primary">${u.nombre}</td>
                                    <td class="px-4 py-3 text-sm">${u.nombre_plural || '-'}</td>
                                    <td class="px-4 py-3 text-sm">${u.abreviatura || '-'}</td>
                                    <td class="px-4 py-3 text-sm max-w-xs truncate">${u.descripcion || '-'}</td>
                                    <td class="px-4 py-3 text-sm">${u.orden || 0}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${u.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="editarUnidadMedida('${u.id}')" class="text-primary hover:text-primary-dark mr-2" title="Editar"><i class="fas fa-edit"></i></button>
                                        <button onclick="toggleEstadoUnidadMedida('${u.id}', ${u.activo})" class="${u.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75 mr-2" title="${u.activo ? 'Desactivar' : 'Activar'}"><i class="fas ${u.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                                        <button onclick="eliminarUnidadMedida('${u.id}')" class="text-red-600 hover:text-red-800" title="Eliminar"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar unidades de medida: ' + error.message);
    }
}

// Funciones CRUD para unidades de medida
window.abrirModalNuevaUnidadMedida = async function() {
    const modal = document.getElementById('unidadMedidaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('unidadMedidaModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    unidadMedidaEditandoId = null;
    const form = document.getElementById('unidadMedidaForm');
    if (form) form.reset();
    
    document.getElementById('unidadMedidaModalTitle').innerText = 'Nueva Unidad de Medida';
    document.getElementById('unidad_activo').value = 'true';
    document.getElementById('unidad_orden').value = '0';
    
    await window.abrirModal('unidadMedidaModal');
};

window.guardarUnidadMedida = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando unidad de medida...');
    
    try {
        const data = {
            codigo: document.getElementById('unidad_codigo').value.toUpperCase(),
            nombre: document.getElementById('unidad_nombre').value,
            nombre_plural: document.getElementById('unidad_nombre_plural').value || null,
            abreviatura: document.getElementById('unidad_abreviatura').value || null,
            descripcion: document.getElementById('unidad_descripcion').value || null,
            orden: parseInt(document.getElementById('unidad_orden').value) || 0,
            activo: document.getElementById('unidad_activo').value === 'true'
        };
        
        if (!data.codigo || !data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'Código y nombre son obligatorios', 'error');
            return;
        }
        
        if (unidadMedidaEditandoId) {
            const { error } = await window.supabaseClient
                .from('unidad_medida')
                .update(data)
                .eq('id', unidadMedidaEditandoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Unidad actualizada correctamente', 'success');
        } else {
            const { error } = await window.supabaseClient
                .from('unidad_medida')
                .insert(data);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Unidad creada correctamente', 'success');
        }
        
        cerrarModal('unidadMedidaModal');
        await cargarVistaUnidadesMedida();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la unidad', 'error');
    }
};

