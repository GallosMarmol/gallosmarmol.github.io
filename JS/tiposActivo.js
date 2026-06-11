// ==================== VISTA TIPOS DE ACTIVO ====================
async function cargarVistaTiposActivo() {
    mostrarLoading('Cargando tipos de activo...');
    try {
        console.log('%c📋 CARGANDO TIPOS DE ACTIVO', 'background: #20c997; color: white; font-size: 14px;');

        const { data: subcategorias } = await window.supabaseClient
            .from('subcategorias')
            .select(`id, nombre, categoria_id, categorias:categoria_id (id, nombre)`)
            .eq('activo', true)
            .order('nombre');

        const { data: tipos } = await window.supabaseClient
            .from('tipos_activo')
            .select(`*, subcategoria_rel:subcategoria_id (id, nombre, categoria_id)`)
            .order('nombre');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        tipos?.forEach(t => { if (t.creado_por) usuariosIds.add(t.creado_por); if (t.modificado_por) usuariosIds.add(t.modificado_por); });

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

        const { data: activos } = await window.supabaseClient.from('activos').select('tipo_activo_id');
        const activosPorTipo = new Map();
        activos?.forEach(a => activosPorTipo.set(a.tipo_activo_id, (activosPorTipo.get(a.tipo_activo_id) || 0) + 1));

        const subcategoriasAgrupadas = new Map();
        subcategorias?.forEach(sub => {
            const categoriaNombre = sub.categorias?.nombre || 'Sin categoría';
            if (!subcategoriasAgrupadas.has(categoriaNombre)) subcategoriasAgrupadas.set(categoriaNombre, []);
            subcategoriasAgrupadas.get(categoriaNombre).push(sub);
        });

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Tipos de Activo</h2>
                <button onclick="abrirModalTipoActivo()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Tipo</button>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                <div class="flex flex-wrap items-center gap-4">
                    <div class="flex items-center gap-2"><i class="fas fa-filter text-primary"></i><span class="text-sm font-medium text-gray-700">Filtrar por subcategoría:</span></div>
                    <div class="flex-1 min-w-[250px]"><select id="filtroSubcategoriaTipos" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white" onchange="filtrarTiposActivoPorSubcategoria()"><option value="TODAS">📋 Todas las subcategorías</option>${Array.from(subcategoriasAgrupadas.entries()).map(([categoria, subs]) => `<optgroup label="📁 ${categoria}">${subs.map(sub => `<option value="${sub.id}">└ 📌 ${sub.nombre}</option>`).join('')}</optgroup>`).join('')}</select></div>
                    <button onclick="limpiarFiltroTiposActivo()" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-undo-alt"></i> Limpiar filtro</button>
                    <div class="text-sm text-gray-500 ml-auto"><span id="contadorTiposFiltrados">${tipos?.length || 0}</span> de ${tipos?.length || 0} tipos</div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Estado:</span>
                <button onclick="filtrarTiposActivoPorEstado('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-estado-tipo" data-estado="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${tipos?.length || 0}</span></button>
                <button onclick="filtrarTiposActivoPorEstado('activos')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-estado-tipo" data-estado="activos">Activos <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${tipos?.filter(t => t.activo).length || 0}</span></button>
                <button onclick="filtrarTiposActivoPorEstado('inactivos')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-estado-tipo" data-estado="inactivos">Inactivos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${tipos?.filter(t => !t.activo).length || 0}</span></button>
            </div>
            <div class="mb-4"><div class="relative"><i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i><input type="text" id="busquedaTiposActivo" placeholder="Buscar tipo de activo..." class="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-xl focus:outline-none focus:border-primary bg-gray-50 focus:bg-white" onkeyup="filtrarTiposActivoPorBusqueda()"></div></div>
            <div class="cards-grid" id="tipos-activo-grid">
        `;

        if (tipos?.length) {
            tipos.forEach(t => {
                const creadorInfo = usuariosConEmpleados.get(t.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(t.modificado_por);
                const totalActivosTipo = activosPorTipo.get(t.id) || 0;

                html += `
                    <div class="card-item tipo-activo-card" data-subcategoria-id="${t.subcategoria_id || ''}" data-subcategoria-nombre="${t.subcategoria_rel?.nombre || 'Sin subcategoría'}" data-activo="${t.activo ? 'activo' : 'inactivo'}" data-nombre="${t.nombre?.toLowerCase() || ''}">
                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex-1"><div class="flex items-center gap-2 mb-1"><i class="fas ${t.activo ? 'fa-circle-check text-green-500' : 'fa-circle text-gray-400'} text-sm"></i><span class="font-bold text-primary text-lg">${t.nombre}</span></div><div class="flex items-center gap-2 mt-1 flex-wrap"><span class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs"><i class="fas fa-sitemap text-xs"></i> ${t.subcategoria_rel?.nombre || 'Sin subcategoría'}</span><span class="estado-badge ${t.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${t.activo ? 'Activo' : 'Inactivo'}</span></div></div>
                            </div>
                        </div>
                        <div class="p-4 space-y-3">
                            <div class="bg-gray-50 p-2 rounded-lg"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><i class="fas fa-code text-primary"></i><span class="text-sm font-medium text-gray-600">Prefijo de código:</span></div><div><span class="font-mono text-lg font-bold text-primary">${t.codigo_prefijo || 'No definido'}</span></div></div></div>
                            <div class="bg-blue-50 p-3 rounded-lg"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><i class="fas fa-desktop text-blue-600"></i><span class="text-sm font-medium text-gray-700">Activos registrados:</span></div><div><span class="text-2xl font-bold text-blue-600">${totalActivosTipo}</span><span class="text-xs text-gray-500"> equipos</span></div></div></div>
                            <div class="text-xs text-gray-400 pt-2 border-t border-gray-100 space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-3"></i><span>Creado: ${new Date(t.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${t.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-3"></i><span>Modificado: ${new Date(t.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2 justify-end">
                            <button onclick="verDetalleTipoActivo('${t.id}')" class="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white"><i class="fas fa-info-circle text-sm"></i></button>
                            <button onclick="editarTipoActivo('${t.id}')" class="w-8 h-8 rounded-lg text-primary hover:bg-primary hover:text-white"><i class="fas fa-edit text-sm"></i></button>
                            <button onclick="toggleEstadoTipoActivo('${t.id}', ${t.activo})" class="w-8 h-8 rounded-lg ${t.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white"><i class="fas ${t.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm"></i></button>
                            <button onclick="verActivosPorTipo('${t.id}')" class="w-8 h-8 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white relative"><i class="fas fa-desktop text-sm"></i>${totalActivosTipo > 0 ? `<span class="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">${totalActivosTipo}</span>` : ''}</button>
                            <button onclick="eliminarTipoActivo('${t.id}')" class="w-8 h-8 rounded-lg text-red-600 hover:bg-red-600 hover:text-white"><i class="fas fa-trash text-sm"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-tags text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay tipos de activo registrados</p><button onclick="abrirModalTipoActivo()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nuevo Tipo</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-estado-tipo[data-estado="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar tipos de activo');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD TIPOS DE ACTIVO ====================
window.editarTipoActivo = async function(id) {
    mostrarLoading('Cargando tipo de activo...');
    try {
        const { data: tipo, error } = await window.supabaseClient
            .from('tipos_activo')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('tipoActivoModalTitle').innerText = 'Editar Tipo de Activo';

        await cargarSubcategoriasSelectTipo();

        document.getElementById('tipo_subcategoria_id').value = tipo.subcategoria_id || '';
        document.getElementById('tipo_nombre').value = tipo.nombre || '';
        document.getElementById('tipo_prefijo').value = tipo.codigo_prefijo || '';

        ocultarLoading();
        document.getElementById('tipoActivoModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el tipo de activo', 'error');
    }
};

window.eliminarTipoActivo = async function(id) {
    const { count } = await window.supabaseClient
        .from('activos')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_activo_id', id);

    if (count > 0) {
        mostrarAlerta('Error', 'No se puede eliminar: el tipo tiene activos asociados', 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar tipo de activo?',
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
                .from('tipos_activo')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Tipo de activo eliminado', 'success');
            await cargarVistaTiposActivo();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el tipo de activo', 'error');
        }
    }
};

window.guardarTipoActivo = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando tipo de activo...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const data = {
            subcategoria_id: document.getElementById('tipo_subcategoria_id').value,
            nombre: document.getElementById('tipo_nombre').value,
            codigo_prefijo: document.getElementById('tipo_prefijo').value || null,
            activo: true
        };

        if (!data.subcategoria_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar una subcategoría', 'error');
            return;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('tipos_activo')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('tipos_activo')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Tipo de activo guardado correctamente', 'success');
        cerrarModal('tipoActivoModal');
        await cargarVistaTiposActivo();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el tipo de activo: ' + error.message, 'error');
    }
};

window.toggleEstadoTipoActivo = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count } = await window.supabaseClient
            .from('activos')
            .select('*', { count: 'exact', head: true })
            .eq('tipo_activo_id', id);

        if (count > 0) {
            const result = await Swal.fire({
                title: `¿Desactivar tipo de activo?`,
                html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Este tipo de activo tiene <strong>${count} activo(s)</strong> asociado(s).</p><p class="text-sm text-gray-500 mt-2">Si lo desactivas, los activos seguirán existiendo pero no podrás crear nuevos de este tipo.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ffc107',
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) return;
        }
    }

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} tipo de activo?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} este tipo de activo.`,
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
                .from('tipos_activo')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Tipo de activo ${accion}do correctamente`, 'success');
            await cargarVistaTiposActivo();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalTipoActivo = async function() {
    const modal = document.getElementById('tipoActivoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('tipoActivoModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('tipoActivoForm');
    if (form) form.reset();
    const titleElement = document.getElementById('tipoActivoModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Tipo de Activo';

    try {
        await cargarSubcategoriasSelectTipo();
    } catch (error) {
        console.error('❌ Error cargando subcategorías:', error);
    }

    await window.abrirModal('tipoActivoModal');
};

// ==================== FUNCIONES AUXILIARES ====================
async function cargarSubcategoriasSelectTipo() {
    try {
        const { data, error } = await window.supabaseClient
            .from('subcategorias')
            .select('id, nombre, categoria_id, categorias (id, nombre)')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        const select = document.getElementById('tipo_subcategoria_id');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar subcategoría</option>';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay subcategorías activas</option>';
            return;
        }

        const subcategoriasPorCategoria = new Map();
        data.forEach(sub => {
            const categoriaNombre = sub.categorias?.nombre || 'Sin categoría';
            if (!subcategoriasPorCategoria.has(categoriaNombre)) subcategoriasPorCategoria.set(categoriaNombre, []);
            subcategoriasPorCategoria.get(categoriaNombre).push(sub);
        });

        const categoriasOrdenadas = Array.from(subcategoriasPorCategoria.keys()).sort();
        categoriasOrdenadas.forEach(categoria => {
            const subcategoriasList = subcategoriasPorCategoria.get(categoria);
            if (subcategoriasList && subcategoriasList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📁 ${categoria} (${subcategoriasList.length})`;
                subcategoriasList.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nombre;
                    option.dataset.categoriaId = sub.categoria_id;
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error('❌ Error cargando subcategorías:', error);
        const select = document.getElementById('tipo_subcategoria_id');
        if (select) select.innerHTML = '<option value="">Error al cargar subcategorías</option>';
        mostrarAlerta('Error', 'No se pudieron cargar las subcategorías', 'error');
    }
}

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarTiposActivoPorSubcategoria = function() {
    const subcategoriaId = document.getElementById('filtroSubcategoriaTipos')?.value;
    const cards = document.querySelectorAll('#tipos-activo-grid .tipo-activo-card');
    const estadoFiltro = document.querySelector('.filter-estado-tipo.ring-2')?.dataset.estado || 'todos';
    const busqueda = document.getElementById('busquedaTiposActivo')?.value?.toLowerCase() || '';
    let contador = 0;

    cards.forEach(card => {
        let mostrar = true;
        if (subcategoriaId && subcategoriaId !== 'TODAS' && card.dataset.subcategoriaId !== subcategoriaId) mostrar = false;
        if (mostrar && estadoFiltro !== 'todos') {
            const activo = card.dataset.activo === 'activo';
            if (estadoFiltro === 'activos' && !activo) mostrar = false;
            if (estadoFiltro === 'inactivos' && activo) mostrar = false;
        }
        if (mostrar && busqueda && !card.dataset.nombre?.includes(busqueda)) mostrar = false;
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
    const contadorSpan = document.getElementById('contadorTiposFiltrados');
    if (contadorSpan) contadorSpan.textContent = contador;
};

window.filtrarTiposActivoPorEstado = function(estado) {
    const botones = document.querySelectorAll('.filter-estado-tipo');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === estado) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarTiposActivoPorSubcategoria();
};

window.filtrarTiposActivoPorBusqueda = function() {
    window.filtrarTiposActivoPorSubcategoria();
};

window.limpiarFiltroTiposActivo = function() {
    const filtroSubcategoria = document.getElementById('filtroSubcategoriaTipos');
    if (filtroSubcategoria) filtroSubcategoria.value = 'TODAS';
    const busqueda = document.getElementById('busquedaTiposActivo');
    if (busqueda) busqueda.value = '';
    const botones = document.querySelectorAll('.filter-estado-tipo');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === 'todos') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarTiposActivoPorSubcategoria();
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleTipoActivo = async function(id) {
    mostrarLoading('Cargando detalles del tipo de activo...');
    try {
        const { data: tipo, error } = await window.supabaseClient
            .from('tipos_activo')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const { data: subcategoria } = await window.supabaseClient
            .from('subcategorias')
            .select('nombre')
            .eq('id', tipo.subcategoria_id)
            .single();

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(tipo.creado_por);
        const modificadorInfo = tipo.modificado_por ? await obtenerInfoUsuarioConEmpleado(tipo.modificado_por) : null;

        const { data: activos } = await window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo, estado')
            .eq('tipo_activo_id', id)
            .limit(10);

        let activosHtml = activos?.length ? activos.map(a => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${a.nombre}</span><span class="text-xs text-gray-500 ml-2">${a.codigo_activo || ''}</span></div><span class="estado-badge estado-${a.estado || 'DISPONIBLE'} text-xs">${a.estado || 'DISPONIBLE'}</span></div>`).join('') : '<p class="text-gray-500 text-center py-2">No hay activos de este tipo</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles del Tipo: ${tipo.nombre}`,
            width: '600px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3">📋 Información General</h3><p><span class="font-semibold">Nombre:</span> ${tipo.nombre}</p><p><span class="font-semibold">Subcategoría:</span> ${subcategoria?.nombre || 'No especificada'}</p><p><span class="font-semibold">Prefijo:</span> <span class="font-mono bg-gray-100 px-2 py-1 rounded">${tipo.codigo_prefijo || 'No definido'}</span></p><p><span class="font-semibold">Estado:</span> <span class="${tipo.activo ? 'text-green-600' : 'text-red-600'}">${tipo.activo ? 'Activo' : 'Inactivo'}</span></p></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3">📦 Activos de este tipo (${activos?.length || 0})</h3><div class="max-h-40 overflow-y-auto">${activosHtml}</div>${activos?.length > 0 ? `<div class="text-center mt-2"><button onclick="verActivosPorTipo('${tipo.id}')" class="text-xs text-primary hover:underline">Ver todos los activos</button></div>` : ''}</div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3">📜 Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${tipo.creado_el ? new Date(tipo.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${tipo.modificado_el ? new Date(tipo.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

window.verActivosPorTipo = async function(id) {
    mostrarLoading('Cargando activos...');
    try {
        const { data: tipo } = await window.supabaseClient
            .from('tipos_activo')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: activos } = await window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo, estado')
            .eq('tipo_activo_id', id)
            .order('nombre');

        ocultarLoading();

        let activosHtml = activos?.length ? activos.map(a => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${a.nombre}</p><p class="text-xs text-gray-500">Código: ${a.codigo_activo || 'N/A'}</p></div><span class="estado-badge estado-${a.estado || 'DISPONIBLE'} text-xs">${a.estado || 'DISPONIBLE'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay activos de este tipo</p>';

        Swal.fire({
            title: `Activos de tipo: ${tipo?.nombre || 'Tipo'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${activosHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '600px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los activos', 'error');
    }
};