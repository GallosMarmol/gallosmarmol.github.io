// ==================== VISTA CATEGORÍAS ====================
async function cargarVistaCategorias() {
    mostrarLoading('Cargando categorías...');
    try {
        console.log('%c📋 CARGANDO CATEGORÍAS', 'background: #007bff; color: white; font-size: 14px;');

        const { data: categorias, error } = await window.supabaseClient
            .from('categorias')
            .select('*')
            .order('nombre');

        if (error) throw error;

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        categorias?.forEach(c => { if (c.creado_por) usuariosIds.add(c.creado_por); if (c.modificado_por) usuariosIds.add(c.modificado_por); });

        if (usuariosIds.size > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', Array.from(usuariosIds));

            if (usuarios?.length) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empleados } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empleadosMap = new Map(empleados?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const empleado = empleadosMap.get(u.empleado_id);
                        usuariosConEmpleados.set(u.id, { nombre: empleado?.nombre_completo || u.correo, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        const { data: subcategorias } = await window.supabaseClient.from('subcategorias').select('categoria_id');
        const subcategoriasPorCategoria = new Map();
        subcategorias?.forEach(s => subcategoriasPorCategoria.set(s.categoria_id, (subcategoriasPorCategoria.get(s.categoria_id) || 0) + 1));

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Categorías</h2>
                <button onclick="abrirModalCategoria()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Categoría</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarCategorias('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${categorias?.length || 0}</span></button>
                <button onclick="filtrarCategorias('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${categorias?.filter(c => c.activo).length || 0}</span></button>
                <button onclick="filtrarCategorias('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${categorias?.filter(c => !c.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="categorias-grid">
        `;

        if (categorias?.length) {
            categorias.forEach(c => {
                const creadorInfo = usuariosConEmpleados.get(c.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(c.modificado_por);
                const totalSubcategorias = subcategoriasPorCategoria.get(c.id) || 0;

                html += `
                    <div class="card-item" data-activo="${c.activo ? 'activa' : 'inactiva'}">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <span class="font-bold text-primary text-lg">${c.nombre}</span>
                                <span class="estado-badge ${c.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ml-2">${c.activo ? 'Activa' : 'Inactiva'}</span>
                            </div>
                        </div>
                        ${c.descripcion ? `<p class="text-sm text-gray-600 mb-2">${c.descripcion}</p>` : ''}
                        <div class="bg-gray-50 p-2 rounded-lg mb-2">
                            <p class="flex items-center gap-2"><i class="fas fa-sitemap text-primary w-4"></i><span class="font-medium">Subcategorías:</span> <span class="font-bold">${totalSubcategorias}</span></p>
                        </div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t">
                            <p><i class="fas fa-user-plus"></i> Creado: ${new Date(c.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></p>
                            ${c.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(c.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></p>` : ''}
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleCategoria('${c.id}')" class="text-blue-600 hover:opacity-75" title="Ver detalles"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarCategoria('${c.id}')" class="text-primary hover:opacity-75" title="Editar"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoCategoria('${c.id}', ${c.activo})" class="${c.activo ? 'text-orange-600 hover:opacity-75' : 'text-green-600 hover:opacity-75'}" title="${c.activo ? 'Desactivar' : 'Activar'}"><i class="fas ${c.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="verSubcategoriasPorCategoria('${c.id}')" class="text-purple-600 hover:opacity-75" title="Ver subcategorías"><i class="fas fa-sitemap text-lg"></i>${totalSubcategorias > 0 ? `<span class="ml-1 text-xs font-bold">${totalSubcategorias}</span>` : ''}</button>
                            <button onclick="eliminarCategoria('${c.id}')" class="text-red-600 hover:opacity-75" title="Eliminar"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-folder text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay categorías registradas</p><button onclick="abrirModalCategoria()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Categoría</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar categorías');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA SUBCATEGORÍAS ====================
async function cargarVistaSubcategorias() {
    mostrarLoading('Cargando subcategorías...');
    try {
        console.log('%c📋 CARGANDO SUBCATEGORÍAS', 'background: #17a2b8; color: white; font-size: 14px;');

        const { data: categorias } = await window.supabaseClient.from('categorias').select('id, nombre').eq('activo', true).order('nombre');
        const { data: subcategorias } = await window.supabaseClient.from('subcategorias').select(`*, categoria_rel:categoria_id (id, nombre)`).order('nombre');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        subcategorias?.forEach(s => { if (s.creado_por) usuariosIds.add(s.creado_por); if (s.modificado_por) usuariosIds.add(s.modificado_por); });

        if (usuariosIds.size > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', Array.from(usuariosIds));

            if (usuarios?.length) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empleados } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empleadosMap = new Map(empleados?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const empleado = empleadosMap.get(u.empleado_id);
                        usuariosConEmpleados.set(u.id, { nombre: empleado?.nombre_completo || u.correo, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        const { data: tipos } = await window.supabaseClient.from('tipos_activo').select('subcategoria_id');
        const tiposPorSubcategoria = new Map();
        tipos?.forEach(t => tiposPorSubcategoria.set(t.subcategoria_id, (tiposPorSubcategoria.get(t.subcategoria_id) || 0) + 1));

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Subcategorías</h2>
                <button onclick="abrirModalSubcategoria()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Subcategoría</button>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                <div class="flex flex-wrap items-center gap-4">
                    <div class="flex items-center gap-2"><i class="fas fa-filter text-primary"></i><span class="text-sm font-medium text-gray-700">Filtrar por categoría:</span></div>
                    <div class="flex-1 min-w-[200px]"><select id="filtroCategoriaSubcategorias" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white" onchange="filtrarSubcategoriasPorCategoria()"><option value="TODAS">📋 Todas las categorías</option>${categorias?.map(c => `<option value="${c.id}">📁 ${c.nombre}</option>`).join('') || ''}</select></div>
                    <button onclick="limpiarFiltroSubcategorias()" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"><i class="fas fa-undo-alt"></i> Limpiar filtro</button>
                    <div class="text-sm text-gray-500 ml-auto"><span id="contadorSubcategoriasFiltradas">${subcategorias?.length || 0}</span> de ${subcategorias?.length || 0} subcategorías</div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Estado:</span>
                <button onclick="filtrarSubcategoriasPorEstado('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-estado-subcategoria" data-estado="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${subcategorias?.length || 0}</span></button>
                <button onclick="filtrarSubcategoriasPorEstado('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-estado-subcategoria" data-estado="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${subcategorias?.filter(s => s.activo).length || 0}</span></button>
                <button onclick="filtrarSubcategoriasPorEstado('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-estado-subcategoria" data-estado="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${subcategorias?.filter(s => !s.activo).length || 0}</span></button>
            </div>
            <div class="mb-4"><div class="relative"><i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i><input type="text" id="busquedaSubcategorias" placeholder="Buscar subcategoría..." class="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white" onkeyup="filtrarSubcategoriasPorBusqueda()"></div></div>
            <div class="cards-grid" id="subcategorias-grid">
        `;

        if (subcategorias?.length) {
            subcategorias.forEach(s => {
                const creadorInfo = usuariosConEmpleados.get(s.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(s.modificado_por);
                const totalTipos = tiposPorSubcategoria.get(s.id) || 0;

                html += `
                    <div class="card-item subcategoria-card" data-categoria-id="${s.categoria_id || ''}" data-categoria-nombre="${s.categoria_rel?.nombre || 'Sin categoría'}" data-activo="${s.activo ? 'activa' : 'inactiva'}" data-nombre="${s.nombre?.toLowerCase() || ''}">
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1"><i class="fas ${s.activo ? 'fa-circle-check text-green-500' : 'fa-circle text-gray-400'} text-sm"></i><span class="font-bold text-primary text-lg">${s.nombre}</span></div>
                                    <div class="flex items-center gap-2 mt-1"><span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"><i class="fas fa-folder text-xs"></i> ${s.categoria_rel?.nombre || 'Sin categoría'}</span><span class="estado-badge ${s.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${s.activo ? 'Activa' : 'Inactiva'}</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="p-4 space-y-3">
                            ${s.descripcion ? `<p class="text-sm text-gray-600 flex items-start gap-2"><i class="fas fa-align-left text-primary mt-0.5"></i><span>${s.descripcion}</span></p>` : `<p class="text-sm text-gray-400 italic flex items-center gap-2"><i class="fas fa-align-left text-gray-400"></i><span>Sin descripción</span></p>`}
                            <div class="bg-gray-50 p-3 rounded-lg"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><i class="fas fa-tags text-primary"></i><span class="text-sm font-medium text-gray-600">Tipos de activo:</span></div><div class="flex items-center gap-2"><span class="text-xl font-bold text-primary">${totalTipos}</span><span class="text-xs text-gray-500">tipos</span></div></div></div>
                            <div class="text-xs text-gray-400 pt-2 border-t border-gray-100 space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-3"></i><span>Creado: ${new Date(s.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${s.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-3"></i><span>Modificado: ${new Date(s.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2 justify-end">
                            <button onclick="verDetalleSubcategoria('${s.id}')" class="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white"><i class="fas fa-info-circle text-sm"></i></button>
                            <button onclick="editarSubcategoria('${s.id}')" class="w-8 h-8 rounded-lg text-primary hover:bg-primary hover:text-white"><i class="fas fa-edit text-sm"></i></button>
                            <button onclick="toggleEstadoSubcategoria('${s.id}', ${s.activo})" class="w-8 h-8 rounded-lg ${s.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white"><i class="fas ${s.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm"></i></button>
                            <button onclick="verTiposPorSubcategoria('${s.id}')" class="w-8 h-8 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white relative"><i class="fas fa-tags text-sm"></i>${totalTipos > 0 ? `<span class="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">${totalTipos}</span>` : ''}</button>
                            <button onclick="eliminarSubcategoria('${s.id}')" class="w-8 h-8 rounded-lg text-red-600 hover:bg-red-600 hover:text-white"><i class="fas fa-trash text-sm"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-sitemap text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay subcategorías registradas</p><button onclick="abrirModalSubcategoria()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Subcategoría</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-estado-subcategoria[data-estado="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar subcategorías');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD CATEGORÍAS ====================
window.editarCategoria = async function(id) {
    mostrarLoading('Cargando categoría...');
    try {
        const { data: categoria, error } = await window.supabaseClient
            .from('categorias')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('categoriaModalTitle').innerText = 'Editar Categoría';
        document.getElementById('cat_activo_nombre').value = categoria.nombre || '';
        document.getElementById('categoria_descripcion').value = categoria.descripcion || '';

        ocultarLoading();
        document.getElementById('categoriaModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la categoría: ' + error.message, 'error');
    }
};

window.eliminarCategoria = async function(id) {
    const { count } = await window.supabaseClient
        .from('subcategorias')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);

    if (count > 0) {
        mostrarAlerta('Error', 'No se puede eliminar: la categoría tiene subcategorías asociadas', 'error');
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
                .from('categorias')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Categoría eliminada', 'success');
            await cargarVistaCategorias();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la categoría', 'error');
        }
    }
};

window.guardarCategoria = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando categoría...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const data = {
            nombre: document.getElementById('cat_activo_nombre').value,
            descripcion: document.getElementById('categoria_descripcion').value || null,
            activo: true
        };

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('categorias')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('categorias')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Categoría guardada correctamente', 'success');
        cerrarModal('categoriaModal');
        await cargarVistaCategorias();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la categoría: ' + error.message, 'error');
    }
};

window.toggleEstadoCategoria = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} categoría?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta categoría y todas sus subcategorías asociadas.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado ? '#28a745' : '#ffc107',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        try {
            if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
            const ahora = new Date().toISOString();

            const { error } = await window.supabaseClient
                .from('categorias')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Categoría ${accion}da correctamente`, 'success');
            await cargarVistaCategorias();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== CRUD SUBCATEGORÍAS ====================
window.editarSubcategoria = async function(id) {
    mostrarLoading('Cargando subcategoría...');
    try {
        const { data: subcategoria, error } = await window.supabaseClient
            .from('subcategorias')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('subcategoriaModalTitle').innerText = 'Editar Subcategoría';

        const { data: categorias } = await window.supabaseClient
            .from('categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

        const select = document.getElementById('subcategoria_categoria_id');
        select.innerHTML = '<option value="">Seleccionar categoría</option>';
        categorias?.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });

        document.getElementById('subcategoria_categoria_id').value = subcategoria.categoria_id || '';
        document.getElementById('subcategoria_nombre').value = subcategoria.nombre || '';
        document.getElementById('subcategoria_descripcion').value = subcategoria.descripcion || '';

        ocultarLoading();
        document.getElementById('subcategoriaModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la subcategoría', 'error');
    }
};

window.eliminarSubcategoria = async function(id) {
    const { count } = await window.supabaseClient
        .from('tipos_activo')
        .select('*', { count: 'exact', head: true })
        .eq('subcategoria_id', id);

    if (count > 0) {
        mostrarAlerta('Error', 'No se puede eliminar: la subcategoría tiene tipos de activo asociados', 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar subcategoría?',
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
                .from('subcategorias')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Subcategoría eliminada', 'success');
            await cargarVistaSubcategorias();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la subcategoría', 'error');
        }
    }
};

window.guardarSubcategoria = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando subcategoría...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const data = {
            categoria_id: document.getElementById('subcategoria_categoria_id').value,
            nombre: document.getElementById('subcategoria_nombre').value,
            descripcion: document.getElementById('subcategoria_descripcion').value || null,
            activo: true
        };

        if (!data.categoria_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una categoría', 'error');
            return;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('subcategorias')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('subcategorias')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Subcategoría guardada correctamente', 'success');
        cerrarModal('subcategoriaModal');
        await cargarVistaSubcategorias();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la subcategoría: ' + error.message, 'error');
    }
};

window.toggleEstadoSubcategoria = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} subcategoría?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta subcategoría y todos sus tipos de activo asociados.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado ? '#28a745' : '#ffc107',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        try {
            if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
            const ahora = new Date().toISOString();

            const { error } = await window.supabaseClient
                .from('subcategorias')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Subcategoría ${accion}da correctamente`, 'success');
            await cargarVistaSubcategorias();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalCategoria = async function() {
    const modal = document.getElementById('categoriaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('categoriaModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('categoriaForm');
    if (form) form.reset();
    const titleElement = document.getElementById('categoriaModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Categoría';
    await window.abrirModal('categoriaModal');
};

window.abrirModalSubcategoria = async function() {
    const modal = document.getElementById('subcategoriaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('subcategoriaModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('subcategoriaForm');
    if (form) form.reset();
    const titleElement = document.getElementById('subcategoriaModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Subcategoría';

    try {
        const { data: categorias } = await window.supabaseClient
            .from('categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

        const select = document.getElementById('subcategoria_categoria_id');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar categoría</option>';
            categorias?.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        }
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
    }

    await window.abrirModal('subcategoriaModal');
};

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarSubcategoriasPorCategoria = function() {
    const categoriaId = document.getElementById('filtroCategoriaSubcategorias')?.value;
    const cards = document.querySelectorAll('#subcategorias-grid .subcategoria-card');
    const estadoFiltro = document.querySelector('.filter-estado-subcategoria.ring-2')?.dataset.estado || 'todos';
    const busqueda = document.getElementById('busquedaSubcategorias')?.value?.toLowerCase() || '';
    let contador = 0;

    cards.forEach(card => {
        let mostrar = true;
        if (categoriaId && categoriaId !== 'TODAS' && card.dataset.categoriaId !== categoriaId) mostrar = false;
        if (mostrar && estadoFiltro !== 'todos') {
            const activo = card.dataset.activo === 'activa';
            if (estadoFiltro === 'activas' && !activo) mostrar = false;
            if (estadoFiltro === 'inactivas' && activo) mostrar = false;
        }
        if (mostrar && busqueda && !card.dataset.nombre?.includes(busqueda)) mostrar = false;
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
    const contadorSpan = document.getElementById('contadorSubcategoriasFiltradas');
    if (contadorSpan) contadorSpan.textContent = contador;
};

window.filtrarSubcategoriasPorEstado = function(estado) {
    const botones = document.querySelectorAll('.filter-estado-subcategoria');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === estado) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarSubcategoriasPorCategoria();
};

window.filtrarSubcategoriasPorBusqueda = function() {
    window.filtrarSubcategoriasPorCategoria();
};

window.limpiarFiltroSubcategorias = function() {
    const filtroCategoria = document.getElementById('filtroCategoriaSubcategorias');
    if (filtroCategoria) filtroCategoria.value = 'TODAS';
    const busqueda = document.getElementById('busquedaSubcategorias');
    if (busqueda) busqueda.value = '';
    const botones = document.querySelectorAll('.filter-estado-subcategoria');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === 'todos') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarSubcategoriasPorCategoria();
};

window.filtrarCategorias = function(filtro) {
    const cards = document.querySelectorAll('#categorias-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === filtro || (filtro === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        if (filtro === 'activas') mostrar = card.dataset.activo === 'activa';
        else if (filtro === 'inactivas') mostrar = card.dataset.activo === 'inactiva';
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleCategoria = async function(id) {
    mostrarLoading('Cargando detalles de la categoría...');
    try {
        const { data: categoria, error } = await window.supabaseClient
            .from('categorias')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(categoria.creado_por);
        const modificadorInfo = categoria.modificado_por ? await obtenerInfoUsuarioConEmpleado(categoria.modificado_por) : null;

        const { data: subcategorias } = await window.supabaseClient
            .from('subcategorias')
            .select('id, nombre, descripcion, activo, creado_el, modificado_el')
            .eq('categoria_id', id)
            .order('nombre');

        const tiposPorSubcategoria = new Map();
        if (subcategorias && subcategorias.length > 0) {
            const subcategoriasIds = subcategorias.map(s => s.id);
            const { data: tipos } = await window.supabaseClient
                .from('tipos_activo')
                .select('subcategoria_id')
                .in('subcategoria_id', subcategoriasIds);
            tipos?.forEach(t => tiposPorSubcategoria.set(t.subcategoria_id, (tiposPorSubcategoria.get(t.subcategoria_id) || 0) + 1));
        }

        let totalActivos = 0;
        if (subcategorias && subcategorias.length > 0) {
            const subcategoriasIds = subcategorias.map(s => s.id);
            const { data: tiposIds } = await window.supabaseClient
                .from('tipos_activo')
                .select('id')
                .in('subcategoria_id', subcategoriasIds);
            if (tiposIds && tiposIds.length > 0) {
                const tiposActivosIds = tiposIds.map(t => t.id);
                const { count } = await window.supabaseClient
                    .from('activos')
                    .select('*', { count: 'exact', head: true })
                    .in('tipo_activo_id', tiposActivosIds);
                totalActivos = count || 0;
            }
        }

        ocultarLoading();

        let subcategoriasHtml = '';
        if (subcategorias && subcategorias.length > 0) {
            subcategoriasHtml = `<div class="space-y-2 max-h-60 overflow-y-auto pr-2">${subcategorias.map(s => {
                const totalTipos = tiposPorSubcategoria.get(s.id) || 0;
                return `<div class="border rounded-lg p-3 hover:bg-gray-50 transition-colors ${!s.activo ? 'opacity-60' : ''}"><div class="flex justify-between items-start"><div class="flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="font-medium text-primary">${s.nombre}</span><span class="estado-badge ${s.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${s.activo ? 'Activa' : 'Inactiva'}</span>${totalTipos > 0 ? `<span class="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><i class="fas fa-tags text-xs"></i> ${totalTipos} tipo${totalTipos !== 1 ? 's' : ''}</span>` : ''}</div>${s.descripcion ? `<p class="text-xs text-gray-500 mt-1">${s.descripcion}</p>` : ''}<div class="text-xs text-gray-400 mt-1 flex items-center gap-2"><span title="Creado: ${new Date(s.creado_el).toLocaleString()}"><i class="fas fa-calendar-alt"></i> ${new Date(s.creado_el).toLocaleDateString()}</span>${s.modificado_el ? `<span title="Modificado: ${new Date(s.modificado_el).toLocaleString()}"><i class="fas fa-edit"></i> ${new Date(s.modificado_el).toLocaleDateString()}</span>` : ''}</div></div><div class="flex gap-1"><button onclick="editarSubcategoria('${s.id}')" class="text-primary hover:bg-primary hover:text-white p-1 rounded transition-colors" title="Editar subcategoría"><i class="fas fa-edit text-sm"></i></button><button onclick="verTiposPorSubcategoria('${s.id}')" class="text-purple-600 hover:bg-purple-600 hover:text-white p-1 rounded transition-colors" title="Ver tipos de activo (${totalTipos})"><i class="fas fa-tags text-sm"></i></button></div></div></div>`;
            }).join('')}</div>`;
        } else {
            subcategoriasHtml = `<div class="text-center py-8 bg-gray-50 rounded-lg"><i class="fas fa-folder-open text-4xl text-gray-300 mb-2"></i><p class="text-gray-500">No hay subcategorías en esta categoría</p><button onclick="abrirModalSubcategoria()" class="mt-2 text-xs text-primary hover:underline"><i class="fas fa-plus mr-1"></i>Agregar subcategoría</button></div>`;
        }

        Swal.fire({
            title: `<span class="text-primary">${categoria.nombre}</span>`,
            width: '750px',
            html: `<div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div class="bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3 flex items-center gap-2"><i class="fas fa-info-circle"></i> Información General</h3><div class="grid grid-cols-2 gap-3"><div class="col-span-2"><span class="font-semibold">Nombre:</span> <span class="text-lg font-medium">${categoria.nombre}</span></div><div class="col-span-2"><span class="font-semibold">Descripción:</span> <span class="text-gray-600">${categoria.descripcion || 'Sin descripción'}</span></div><div><span class="font-semibold">Estado:</span> <span class="estado-badge ${categoria.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${categoria.activo ? 'Activa' : 'Inactiva'}</span></div><div><span class="font-semibold">Total Activos:</span> <span class="text-primary font-bold text-lg">${totalActivos}</span><span class="text-xs text-gray-500"> activos en esta categoría</span></div></div></div>
                <div class="grid grid-cols-3 gap-3"><div class="bg-blue-50 p-3 rounded-lg text-center"><div class="text-2xl font-bold text-blue-600">${subcategorias?.length || 0}</div><div class="text-xs text-gray-600">Subcategorías</div></div><div class="bg-purple-50 p-3 rounded-lg text-center"><div class="text-2xl font-bold text-purple-600">${Array.from(tiposPorSubcategoria.values()).reduce((a, b) => a + b, 0)}</div><div class="text-xs text-gray-600">Tipos de Activo</div></div><div class="bg-green-50 p-3 rounded-lg text-center"><div class="text-2xl font-bold text-green-600">${totalActivos}</div><div class="text-xs text-gray-600">Activos Totales</div></div></div>
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><div class="flex justify-between items-center mb-3"><h3 class="font-bold text-success flex items-center gap-2"><i class="fas fa-sitemap"></i> Subcategorías <span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">${subcategorias?.length || 0}</span></h3><button onclick="abrirModalSubcategoria()" class="text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary-dark transition-colors"><i class="fas fa-plus mr-1"></i>Agregar</button></div>${subcategoriasHtml}</div>
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400"><h3 class="font-bold text-gray-600 mb-3 flex items-center gap-2"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div class="bg-white p-3 rounded-lg"><p class="text-xs text-gray-500 mb-1"><i class="fas fa-calendar-plus"></i> Creado el</p><p class="text-sm font-medium">${categoria.creado_el ? new Date(categoria.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div class="bg-white p-3 rounded-lg"><p class="text-xs text-gray-500 mb-1"><i class="fas fa-calendar-edit"></i> Modificado el</p><p class="text-sm font-medium">${categoria.modificado_el ? new Date(categoria.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : `<div class="bg-gray-100 p-3 rounded-lg text-center text-gray-400"><i class="fas fa-info-circle"></i> Sin modificaciones</div>`}</div><details class="mt-3 text-xs text-gray-400 border-t pt-2"><summary class="cursor-pointer hover:text-primary font-medium"><i class="fas fa-code-branch mr-1"></i> Ver IDs de referencia</summary><div class="mt-2 space-y-1 pl-2"><p>ID Categoría: <span class="font-mono">${categoria.id}</span></p><p>Creado por ID: ${categoria.creado_por || 'N/A'}</p><p>Modificado por ID: ${categoria.modificado_por || 'N/A'}</p>${subcategorias && subcategorias.length > 0 ? `<p class="mt-2 font-semibold">IDs de Subcategorías:</p>${subcategorias.map(s => `<p class="pl-2">- ${s.nombre}: ${s.id}</p>`).join('')}` : ''}</div></details></div>
                <div class="flex justify-end gap-2 pt-2 border-t"><button onclick="editarCategoria('${categoria.id}')" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"><i class="fas fa-edit"></i> Editar Categoría</button><button onclick="window.cargarVista('subcategorias')" class="px-4 py-2 text-sm bg-secondary text-primary rounded-lg hover:bg-secondary-dark transition-colors flex items-center gap-2"><i class="fas fa-list"></i> Ver Todas</button></div>
            </div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true
        });
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error en verDetalleCategoria:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles de la categoría: ' + (error.message || 'Error desconocido'), 'error');
    }
};

window.verDetalleSubcategoria = async function(id) {
    mostrarLoading('Cargando detalles de la subcategoría...');
    try {
        const { data: subcategoria, error } = await window.supabaseClient
            .from('subcategorias')
            .select(`*, categoria_rel:categoria_id (id, nombre)`)
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(subcategoria.creado_por);
        const modificadorInfo = subcategoria.modificado_por ? await obtenerInfoUsuarioConEmpleado(subcategoria.modificado_por) : null;

        const { data: tipos } = await window.supabaseClient
            .from('tipos_activo')
            .select('id, nombre, codigo_prefijo, activo')
            .eq('subcategoria_id', id)
            .order('nombre');

        let tiposHtml = tipos?.length ? tipos.map(t => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${t.nombre}</span><span class="text-xs text-gray-500 ml-2">${t.codigo_prefijo || ''}</span></div><span class="estado-badge ${t.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${t.activo ? 'Activo' : 'Inactivo'}</span></div>`).join('') : '<p class="text-gray-500 text-center py-2">No hay tipos de activo en esta subcategoría</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles de Subcategoría: ${subcategoria.nombre}`,
            width: '600px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3">📋 Información General</h3><p><span class="font-semibold">Nombre:</span> ${subcategoria.nombre}</p><p><span class="font-semibold">Categoría:</span> ${subcategoria.categoria_rel?.nombre || 'No especificada'}</p><p><span class="font-semibold">Descripción:</span> ${subcategoria.descripcion || 'Sin descripción'}</p><p><span class="font-semibold">Estado:</span> <span class="${subcategoria.activo ? 'text-green-600' : 'text-red-600'}">${subcategoria.activo ? 'Activa' : 'Inactiva'}</span></p></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3">🏷️ Tipos de Activo (${tipos?.length || 0})</h3><div class="max-h-40 overflow-y-auto">${tiposHtml}</div>${tipos?.length > 0 ? `<div class="text-center mt-2"><button onclick="verTiposPorSubcategoria('${subcategoria.id}')" class="text-xs text-primary hover:underline">Ver todos los tipos</button></div>` : ''}</div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3">📜 Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${subcategoria.creado_el ? new Date(subcategoria.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${subcategoria.modificado_el ? new Date(subcategoria.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles', 'error');
    }
};

window.verSubcategoriasPorCategoria = async function(id) {
    mostrarLoading('Cargando subcategorías...');
    try {
        const { data: categoria } = await window.supabaseClient
            .from('categorias')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: subcategorias } = await window.supabaseClient
            .from('subcategorias')
            .select('id, nombre, descripcion, activo')
            .eq('categoria_id', id)
            .order('nombre');

        ocultarLoading();

        let subcategoriasHtml = subcategorias?.length ? subcategorias.map(s => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${s.nombre}</p>${s.descripcion ? `<p class="text-xs text-gray-500">${s.descripcion}</p>` : ''}</div><span class="estado-badge ${s.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${s.activo ? 'Activa' : 'Inactiva'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay subcategorías en esta categoría</p>';

        Swal.fire({
            title: `Subcategorías de: ${categoria?.nombre || 'Categoría'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${subcategoriasHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '600px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las subcategorías', 'error');
    }
};

window.verTiposPorSubcategoria = async function(id) {
    mostrarLoading('Cargando tipos de activo...');
    try {
        const { data: subcategoria } = await window.supabaseClient
            .from('subcategorias')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: tipos } = await window.supabaseClient
            .from('tipos_activo')
            .select('id, nombre, codigo_prefijo, activo')
            .eq('subcategoria_id', id)
            .order('nombre');

        ocultarLoading();

        let tiposHtml = tipos?.length ? tipos.map(t => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${t.nombre}</p><p class="text-xs text-gray-500">Prefijo: ${t.codigo_prefijo || 'N/A'}</p></div><span class="estado-badge ${t.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${t.activo ? 'Activo' : 'Inactivo'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay tipos de activo en esta subcategoría</p>';

        Swal.fire({
            title: `Tipos de activo en: ${subcategoria?.nombre || 'Subcategoría'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${tiposHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '600px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los tipos de activo', 'error');
    }
};