// ==================== VISTA ATRIBUTOS DE ESPECIFICACIONES ====================
async function cargarVistaEspecificacionesAtributos() {
    mostrarLoading('Cargando atributos...');
    try {
        console.log('%c📋 CARGANDO ATRIBUTOS DE ESPECIFICACIONES', 'background: #17a2b8; color: white; font-size: 14px;');

        const { data: tiposActivo } = await window.supabaseClient
            .from('tipos_activo')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');

        const { data: atributos } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select(`*, tipo_activo:tipo_activo_id (id, nombre)`)
            .order('tipo_activo_id')
            .order('orden');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        atributos?.forEach(a => { if (a.creado_por) usuariosIds.add(a.creado_por); if (a.modificado_por) usuariosIds.add(a.modificado_por); });

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

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary"><i class="fas fa-puzzle-piece mr-2"></i>Atributos de Especificaciones</h2>
                <button onclick="abrirModalNuevoAtributo()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Atributo</button>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm mb-4">
                <div class="flex flex-wrap items-center gap-4">
                    <div class="flex items-center gap-2"><i class="fas fa-filter text-primary"></i><span class="text-sm font-medium text-gray-700">Filtrar por Tipo de Activo:</span></div>
                    <select id="filtroTipoAtributo" class="form-input w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" onchange="filtrarAtributosPorTipo()"><option value="TODOS">📋 Todos los tipos</option>${tiposActivo?.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}</select>
                    <button onclick="limpiarFiltroAtributos()" class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><i class="fas fa-undo-alt"></i>Limpiar filtro</button>
                    <span class="text-sm text-gray-500 ml-auto" id="contadorAtributos">Total: ${atributos?.length || 0} atributos</span>
                </div>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Estado:</span>
                <button onclick="filtrarAtributosPorEstado('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-estado" data-estado="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${atributos?.length || 0}</span></button>
                <button onclick="filtrarAtributosPorEstado('activos')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-estado" data-estado="activos">Activos <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${atributos?.filter(a => a.activo).length || 0}</span></button>
                <button onclick="filtrarAtributosPorEstado('inactivos')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-estado" data-estado="inactivos">Inactivos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${atributos?.filter(a => !a.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="atributos-grid">
        `;

        if (atributos?.length) {
            atributos.forEach(a => {
                const creadorInfo = usuariosConEmpleados.get(a.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(a.modificado_por);
                const tipoDatoClass = { 'texto': 'bg-blue-100 text-blue-800', 'numero': 'bg-green-100 text-green-800', 'booleano': 'bg-purple-100 text-purple-800', 'fecha': 'bg-yellow-100 text-yellow-800' }[a.tipo_dato] || 'bg-gray-100';
                const tipoDatoIcon = { 'texto': '📝', 'numero': '🔢', 'booleano': '✅', 'fecha': '📅' }[a.tipo_dato] || '📋';

                html += `
                    <div class="card-item atributo-card" data-tipo-id="${a.tipo_activo_id || 'SIN_TIPO'}" data-tipo-nombre="${a.tipo_activo?.nombre || 'Sin tipo'}" data-activo="${a.activo ? 'activo' : 'inactivo'}">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1"><div class="flex items-center gap-2"><span class="font-bold text-primary text-lg">${a.nombre_atributo}</span><span class="estado-badge ${tipoDatoClass} text-xs px-2 py-0.5">${tipoDatoIcon} ${a.tipo_dato}</span></div><p class="text-xs text-gray-500 mt-1"><i class="fas fa-laptop text-primary mr-1"></i>Tipo de Activo: <span class="font-medium tipo-activo-nombre">${a.tipo_activo?.nombre || 'Sin tipo'}</span></p></div>
                            <span class="estado-badge ${a.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${a.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        <div class="space-y-2 text-sm mt-2">
                            <div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500">Unidad</p><p class="font-medium">${a.unidad_medida || 'No especificada'}</p></div><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500">Orden</p><p class="font-medium">${a.orden || 0}</p></div></div>
                            <div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500">Requerido</p><p class="font-medium">${a.requerido ? 'Sí' : 'No'}</p></div>
                            <div class="text-xs text-gray-400 mt-2 pt-2 border-t"><p><i class="fas fa-user-plus"></i> Creado: ${new Date(a.creado_el).toLocaleDateString()} por ${creadorInfo?.nombre || 'Sistema'}</p>${a.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(a.modificado_el).toLocaleDateString()} por ${modificadorInfo?.nombre || 'Sistema'}</p>` : ''}</div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="editarAtributo('${a.id}')" class="text-primary hover:bg-primary hover:text-white p-2 rounded-lg"><i class="fas fa-edit"></i></button>
                            <button onclick="toggleEstadoAtributo('${a.id}', ${a.activo})" class="${a.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white p-2 rounded-lg"><i class="fas ${a.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                            <button onclick="verValoresPorAtributo('${a.id}')" class="text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-lg"><i class="fas fa-eye"></i></button>
                            <button onclick="eliminarAtributo('${a.id}')" class="text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-puzzle-piece text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay atributos registrados</p><button onclick="abrirModalNuevoAtributo()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nuevo Atributo</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-estado[data-estado="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar atributos');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA VALORES DE ESPECIFICACIONES ====================
async function cargarVistaEspecificacionesValores() {
    mostrarLoading('Cargando valores de especificaciones...');
    try {
        console.log('%c📋 CARGANDO VALORES DE ESPECIFICACIONES', 'background: #28a745; color: white; font-size: 14px;');

        const { data: valores } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`*, activo:activo_id (id, nombre, codigo_activo), atributo:atributo_id (id, nombre_atributo, tipo_dato, unidad_medida)`)
            .order('creado_el', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        valores?.forEach(v => { if (v.creado_por) usuariosIds.add(v.creado_por); if (v.modificado_por) usuariosIds.add(v.modificado_por); });

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

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Valores de Especificaciones</h2>
                <button onclick="abrirModalNuevoValor()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Valor</button>
            </div>
            <div class="cards-grid">
        `;

        if (valores?.length) {
            valores.forEach(v => {
                const creadorInfo = usuariosConEmpleados.get(v.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(v.modificado_por);
                let valorMostrado = '';
                if (v.valor_texto) valorMostrado = v.valor_texto;
                else if (v.valor_numero !== null) valorMostrado = v.valor_numero + (v.atributo?.unidad_medida ? ' ' + v.atributo.unidad_medida : '');
                else if (v.valor_booleano !== null) valorMostrado = v.valor_booleano ? 'Sí' : 'No';
                else if (v.valor_fecha) valorMostrado = new Date(v.valor_fecha).toLocaleDateString();

                html += `
                    <div class="card-item">
                        <div class="flex justify-between items-start mb-2"><div><span class="font-bold text-primary text-lg">${v.atributo?.nombre_atributo || 'Atributo'}</span><p class="text-xs text-gray-500">${v.activo?.nombre || 'Activo'} (${v.activo?.codigo_activo || 'Sin código'})</p></div></div>
                        <div class="bg-gray-50 p-2 rounded-lg"><p class="font-medium">Valor:</p><p class="text-lg font-bold text-primary">${valorMostrado}</p></div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t"><p><i class="fas fa-user-plus"></i> Creado: ${new Date(v.creado_el).toLocaleDateString()} por ${creadorInfo?.nombre || 'Sistema'}</p>${v.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(v.modificado_el).toLocaleDateString()} por ${modificadorInfo?.nombre || 'Sistema'}</p>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="editarValor('${v.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="eliminarValor('${v.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<div class="col-span-full text-center p-8 bg-white rounded-lg">No hay valores registrados</div>';
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar valores');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD ATRIBUTOS ====================
window.editarAtributo = async function(id) {
    mostrarLoading('Cargando atributo...');
    try {
        const { data: atributo, error } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('atributoModalTitle').innerHTML = '<i class="fas fa-edit mr-2"></i>Editar Atributo';

        await cargarTiposActivoSelect('atributo_tipo_activo_id');

        document.getElementById('atributo_tipo_activo_id').value = atributo.tipo_activo_id || '';
        document.getElementById('atributo_nombre').value = atributo.nombre_atributo || '';
        document.getElementById('atributo_tipo_dato').value = atributo.tipo_dato || '';
        document.getElementById('atributo_unidad').value = atributo.unidad_medida || '';
        document.getElementById('atributo_orden').value = atributo.orden || 0;
        document.getElementById('atributo_requerido').checked = atributo.requerido || false;
        document.getElementById('atributo_activo').value = atributo.activo ? 'true' : 'false';

        ocultarLoading();
        document.getElementById('atributoModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el atributo', 'error');
    }
};

window.eliminarAtributo = async function(id) {
    const { count } = await window.supabaseClient
        .from('especificaciones_valores')
        .select('*', { count: 'exact', head: true })
        .eq('atributo_id', id);

    if (count > 0) {
        const result = await Swal.fire({
            title: '¿Eliminar atributo?',
            html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Este atributo tiene <strong>${count} valor${count !== 1 ? 'es' : ''}</strong> asociado${count !== 1 ? 's' : ''}.</p><p class="text-sm text-gray-500 mt-2">Si eliminas el atributo, también se perderán todos sus valores.</p></div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            mostrarLoading('Eliminando...');
            try {
                await window.supabaseClient.from('especificaciones_valores').delete().eq('atributo_id', id);
                const { error } = await window.supabaseClient.from('especificaciones_atributos').delete().eq('id', id);
                if (error) throw error;

                ocultarLoading();
                mostrarAlerta('Éxito', 'Atributo y valores eliminados', 'success');
                await cargarVistaEspecificacionesAtributos();
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo eliminar', 'error');
            }
        }
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar atributo?',
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
                .from('especificaciones_atributos')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Atributo eliminado', 'success');
            await cargarVistaEspecificacionesAtributos();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarAtributo = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando atributo...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const tipoActivoId = document.getElementById('atributo_tipo_activo_id').value;

        if (!tipoActivoId) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un tipo de activo', 'error');
            return;
        }

        const data = {
            tipo_activo_id: tipoActivoId,
            nombre_atributo: document.getElementById('atributo_nombre').value.trim(),
            tipo_dato: document.getElementById('atributo_tipo_dato').value,
            unidad_medida: document.getElementById('atributo_unidad')?.value?.trim() || null,
            orden: parseInt(document.getElementById('atributo_orden')?.value) || 0,
            requerido: document.getElementById('atributo_requerido')?.checked || false,
            activo: document.getElementById('atributo_activo')?.value === 'true'
        };

        if (!data.nombre_atributo || !data.tipo_dato) {
            ocultarLoading();
            mostrarAlerta('Error', 'Complete los campos obligatorios', 'error');
            return;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('especificaciones_atributos')
                .update(data)
                .eq('id', editandoId);
            if (error) {
                if (error.message?.includes('unique')) throw new Error('Ya existe un atributo con ese nombre para este tipo de activo');
                throw error;
            }
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('especificaciones_atributos')
                .insert(data);
            if (error) {
                if (error.message?.includes('unique')) throw new Error('Ya existe un atributo con ese nombre para este tipo de activo');
                throw error;
            }
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Atributo guardado correctamente', 'success');
        cerrarModal('atributoModal');
        await cargarVistaEspecificacionesAtributos();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', error.message || 'No se pudo guardar el atributo', 'error');
    }
};

window.toggleEstadoAtributo = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count } = await window.supabaseClient
            .from('especificaciones_valores')
            .select('*', { count: 'exact', head: true })
            .eq('atributo_id', id);

        if (count > 0) {
            const result = await Swal.fire({
                title: `¿Desactivar atributo?`,
                html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Este atributo tiene <strong>${count} valor(es)</strong> registrado(s).</p><p class="text-sm text-gray-500 mt-2">Si lo desactivas, los valores seguirán existiendo pero no podrás usar este atributo para nuevas especificaciones.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`,
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
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} atributo?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} este atributo de especificación.`,
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
                .from('especificaciones_atributos')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Atributo ${accion}do correctamente`, 'success');
            await cargarVistaEspecificacionesAtributos();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== CRUD VALORES ====================
window.editarValor = async function(id) {
    mostrarLoading('Cargando valor...');
    try {
        const { data: valor, error } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`
                *,
                activo:activo_id (id, nombre, codigo_activo, tipo_activo_id),
                atributo:atributo_id (id, nombre_atributo, tipo_dato, unidad_medida)
            `)
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;

        let modal = document.getElementById('valorModal');
        if (!modal) {
            crearModalValor();
            modal = document.getElementById('valorModal');
        }

        document.getElementById('valorModalTitle').innerText = 'Editar Valor';

        document.getElementById('campo_texto').classList.add('hidden');
        document.getElementById('campo_numero').classList.add('hidden');
        document.getElementById('campo_booleano').classList.add('hidden');
        document.getElementById('campo_fecha').classList.add('hidden');

        await cargarActivosSelectConTipo('valor_activo_id');

        document.getElementById('valor_activo_id').value = valor.activo_id || '';

        if (valor.activo?.tipo_activo_id) {
            await cargarAtributosPorTipoActivo(valor.activo.tipo_activo_id, 'valor_atributo_id');
            document.getElementById('valor_atributo_id').value = valor.atributo_id || '';

            const tipoDato = valor.atributo?.tipo_dato;

            if (tipoDato === 'texto') {
                document.getElementById('campo_texto').classList.remove('hidden');
                document.getElementById('valor_texto').value = valor.valor_texto || '';
            } else if (tipoDato === 'numero') {
                document.getElementById('campo_numero').classList.remove('hidden');
                document.getElementById('valor_numero').value = valor.valor_numero || '';
                document.getElementById('valor_numero_unidad').innerText = valor.atributo?.unidad_medida ? `(${valor.atributo.unidad_medida})` : '';
            } else if (tipoDato === 'booleano') {
                document.getElementById('campo_booleano').classList.remove('hidden');
                document.getElementById('valor_booleano').value = valor.valor_booleano ? 'true' : 'false';
            } else if (tipoDato === 'fecha') {
                document.getElementById('campo_fecha').classList.remove('hidden');
                document.getElementById('valor_fecha').value = valor.valor_fecha || '';
            }
        }

        ocultarLoading();
        modal.classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el valor', 'error');
    }
};

window.eliminarValor = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar valor?',
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
                .from('especificaciones_valores')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Valor eliminado', 'success');
            await cargarVistaEspecificacionesValores();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarValor = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando valor...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        const activoSelect = document.getElementById('valor_activo_id');
        const atributoSelect = document.getElementById('valor_atributo_id');
        const atributoOption = atributoSelect.options[atributoSelect.selectedIndex];
        const tipoDato = atributoOption?.dataset.tipo;

        if (!activoSelect.value || !atributoSelect.value) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un activo y un atributo', 'error');
            return;
        }

        const data = {
            activo_id: activoSelect.value,
            atributo_id: atributoSelect.value
        };

        if (tipoDato === 'texto') {
            const valor = document.getElementById('valor_texto').value;
            if (!valor) {
                ocultarLoading();
                mostrarAlerta('Error', 'El valor es requerido', 'error');
                return;
            }
            data.valor_texto = valor;
        } else if (tipoDato === 'numero') {
            const valor = document.getElementById('valor_numero').value;
            if (valor === '') {
                ocultarLoading();
                mostrarAlerta('Error', 'El valor es requerido', 'error');
                return;
            }
            data.valor_numero = parseFloat(valor);
        } else if (tipoDato === 'booleano') {
            data.valor_booleano = document.getElementById('valor_booleano').value === 'true';
        } else if (tipoDato === 'fecha') {
            const valor = document.getElementById('valor_fecha').value;
            if (!valor) {
                ocultarLoading();
                mostrarAlerta('Error', 'El valor es requerido', 'error');
                return;
            }
            data.valor_fecha = valor;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('especificaciones_valores')
                .update(data)
                .eq('id', editandoId);
            if (error) {
                if (error.message?.includes('unique')) throw new Error('Este activo ya tiene un valor para este atributo');
                throw error;
            }
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('especificaciones_valores')
                .insert(data);
            if (error) {
                if (error.message?.includes('unique')) throw new Error('Este activo ya tiene un valor para este atributo');
                throw error;
            }
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Valor guardado correctamente', 'success');
        cerrarModal('valorModal');
        await cargarVistaEspecificacionesValores();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', error.message || 'No se pudo guardar el valor', 'error');
    }
};

// ==================== MODALES ====================
window.abrirModalNuevoAtributo = async function() {
    const modal = document.getElementById('atributoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('atributoModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    editandoId = null;
    const form = document.getElementById('atributoForm');
    if (form) form.reset();
    const titleElement = document.getElementById('atributoModalTitle');
    if (titleElement) titleElement.innerHTML = '<i class="fas fa-puzzle-piece mr-2"></i>Nuevo Atributo';
    const activoSelect = document.getElementById('atributo_activo');
    if (activoSelect) activoSelect.value = 'true';
    const requeridoCheck = document.getElementById('atributo_requerido');
    if (requeridoCheck) requeridoCheck.checked = false;
    const ordenInput = document.getElementById('atributo_orden');
    if (ordenInput) ordenInput.value = '0';

    try {
        await cargarTiposActivoSelect('atributo_tipo_activo_id');
    } catch (error) {
        console.error('❌ Error cargando tipos:', error);
    }

    await window.abrirModal('atributoModal');
};

window.abrirModalNuevoValor = async function(atributoIdPrecargado = null) {
    const modal = document.getElementById('valorModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('valorModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('valorForm');
    if (form) form.reset();
    const titleElement = document.getElementById('valorModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Valor';

    const campos = ['campo_texto', 'campo_numero', 'campo_booleano', 'campo_fecha'];
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) elemento.classList.add('hidden');
    });

    const atributoSelect = document.getElementById('valor_atributo_id');
    if (atributoSelect) {
        atributoSelect.disabled = true;
        atributoSelect.innerHTML = '<option value="">Primero seleccione un activo</option>';
    }

    try {
        await cargarActivosSelectConTipo('valor_activo_id');
    } catch (error) {
        console.error('❌ Error cargando activos:', error);
    }

    const activoSelectElement = document.getElementById('valor_activo_id');
    if (activoSelectElement) {
        activoSelectElement.removeEventListener('change', window.handleActivoChangeForValor);
        window.handleActivoChangeForValor = async function() {
            const selectedOption = this.options[this.selectedIndex];
            const tipoActivoId = selectedOption?.dataset.tipoId;
            if (tipoActivoId) {
                await cargarAtributosPorTipoActivo(tipoActivoId, 'valor_atributo_id');
            } else {
                const atributoSelect = document.getElementById('valor_atributo_id');
                if (atributoSelect) {
                    atributoSelect.disabled = true;
                    atributoSelect.innerHTML = '<option value="">Seleccione un activo válido</option>';
                }
            }
        };
        activoSelectElement.addEventListener('change', window.handleActivoChangeForValor);
    }

    const atributoSelectElement = document.getElementById('valor_atributo_id');
    if (atributoSelectElement) {
        atributoSelectElement.removeEventListener('change', window.handleAtributoChangeForValor);
        window.handleAtributoChangeForValor = function() {
            const selected = this.options[this.selectedIndex];
            const tipo = selected?.dataset.tipo;
            const unidad = selected?.dataset.unidad || '';

            const camposList = ['campo_texto', 'campo_numero', 'campo_booleano', 'campo_fecha'];
            camposList.forEach(campo => {
                const elemento = document.getElementById(campo);
                if (elemento) elemento.classList.add('hidden');
            });

            if (tipo === 'texto') {
                const campo = document.getElementById('campo_texto');
                if (campo) campo.classList.remove('hidden');
            } else if (tipo === 'numero') {
                const campo = document.getElementById('campo_numero');
                if (campo) {
                    campo.classList.remove('hidden');
                    const unidadSpan = document.getElementById('valor_numero_unidad');
                    if (unidadSpan) unidadSpan.innerText = unidad ? `(${unidad})` : '';
                }
            } else if (tipo === 'booleano') {
                const campo = document.getElementById('campo_booleano');
                if (campo) campo.classList.remove('hidden');
            } else if (tipo === 'fecha') {
                const campo = document.getElementById('campo_fecha');
                if (campo) campo.classList.remove('hidden');
            }
        };
        atributoSelectElement.addEventListener('change', window.handleAtributoChangeForValor);
    }

    await window.abrirModal('valorModal');
};

// ==================== FUNCIONES DE DETALLE ====================
window.verValoresPorAtributo = async function(id) {
    mostrarLoading('Cargando valores...');
    try {
        const { data: atributo } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('*')
            .eq('id', id)
            .single();

        const { data: valores } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`*, activo:activo_id (nombre, codigo_activo)`)
            .eq('atributo_id', id)
            .order('creado_el', { ascending: false });

        ocultarLoading();

        let valoresHtml = valores?.length ? valores.map(v => {
            let valorMostrado = '';
            if (v.valor_texto) valorMostrado = v.valor_texto;
            else if (v.valor_numero !== null) valorMostrado = v.valor_numero + (atributo?.unidad_medida ? ' ' + atributo.unidad_medida : '');
            else if (v.valor_booleano !== null) valorMostrado = v.valor_booleano ? 'Sí' : 'No';
            else if (v.valor_fecha) valorMostrado = new Date(v.valor_fecha).toLocaleDateString();
            return `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${v.activo?.nombre || 'Activo'}</p><p class="text-xs text-gray-500">${v.activo?.codigo_activo || 'Sin código'}</p></div><span class="font-bold text-primary">${valorMostrado}</span></div><p class="text-xs text-gray-400 mt-1"><i class="far fa-clock"></i> ${new Date(v.creado_el).toLocaleDateString()}</p></div>`;
        }).join('') : '<p class="text-gray-500 text-center py-4">No hay valores para este atributo</p>';

        Swal.fire({
            title: `Valores de: ${atributo?.nombre_atributo}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${valoresHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '600px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los valores', 'error');
    }
};

// ==================== VER TODAS LAS ESPECIFICACIONES (con botones de acción) ====================
window.verTodasEspecificaciones = async function(activoId) {
    mostrarLoading('Cargando especificaciones...');
    try {
        // Obtener nombre del activo
        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select('nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        const { data: especificaciones } = await window.supabaseClient
            .from('especificaciones_valores')
            .select(`*, atributo:atributo_id (id, nombre_atributo, tipo_dato, unidad_medida)`)
            .eq('activo_id', activoId)
            .order('atributo_id', { ascending: true });

        ocultarLoading();

        let especHtml = '';
        if (especificaciones && especificaciones.length > 0) {
            especHtml = '<div class="space-y-3">';
            especificaciones.forEach(esp => {
                let valorMostrado = '';
                if (esp.valor_texto) valorMostrado = esp.valor_texto;
                else if (esp.valor_numero !== null) valorMostrado = esp.valor_numero + (esp.atributo?.unidad_medida ? ' ' + esp.atributo.unidad_medida : '');
                else if (esp.valor_booleano !== null) valorMostrado = esp.valor_booleano ? 'Sí' : 'No';
                else if (esp.valor_fecha) valorMostrado = new Date(esp.valor_fecha).toLocaleDateString();

                especHtml += `
                    <div class="bg-gray-50 rounded-lg p-3 border border-gray-200" id="esp-modal-${esp.id}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <i class="fas fa-microchip text-primary text-sm"></i>
                                    <span class="font-semibold text-primary">${esp.atributo?.nombre_atributo || 'Atributo'}</span>
                                </div>
                                <div class="text-gray-700">
                                    <span class="text-xs text-gray-500">Valor:</span>
                                    <span class="font-medium ml-1">${valorMostrado}</span>
                                </div>
                                ${esp.atributo?.unidad_medida ? `<div class="text-xs text-gray-400 mt-1">Unidad: ${esp.atributo.unidad_medida}</div>` : ''}
                            </div>
                            <div class="flex gap-2 ml-3">
                                <button onclick="editarEspecificacion('${esp.id}', '${activoId}')" 
                                        class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1">
                                    <i class="fas fa-edit text-xs"></i>
                                    Editar
                                </button>
                                <button onclick="eliminarEspecificacion('${esp.id}', '${activoId}')" 
                                        class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1">
                                    <i class="fas fa-trash-alt text-xs"></i>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            especHtml += '</div>';
            especHtml = `
                <div class="mb-3 text-sm text-gray-500">
                    <i class="fas fa-list"></i> Total: ${especificaciones.length} especificación(es)
                </div>
                ${especHtml}
            `;
        } else {
            especHtml = `
                <div class="text-center py-8">
                    <i class="fas fa-microchip text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No hay especificaciones técnicas registradas</p>
                    <button onclick="cerrarSweetAlertYAgregarEspecificacion('${activoId}')" 
                            class="mt-3 btn-primary text-sm">
                        <i class="fas fa-plus mr-1"></i>Agregar Especificación
                    </button>
                </div>
            `;
        }

        // Agregar botón para agregar nueva especificación
        if (especificaciones && especificaciones.length > 0) {
            especHtml += `
                <div class="mt-4 pt-3 border-t border-gray-200 text-center">
                    <button onclick="cerrarSweetAlertYAgregarEspecificacion('${activoId}')" 
                            class="btn-primary text-sm">
                        <i class="fas fa-plus mr-1"></i>Agregar Nueva Especificación
                    </button>
                </div>
            `;
        }

        Swal.fire({
            title: `<div class="flex items-center justify-between"><span>📋 Especificaciones Técnicas</span><span class="text-xs bg-primary text-white px-2 py-1 rounded-full">${activo?.nombre || 'Activo'}</span></div>`,
            html: `<div class="text-left max-h-[60vh] overflow-y-auto pr-2">${especHtml}</div>`,
            width: '650px',
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true,
            customClass: {
                popup: 'rounded-xl',
                confirmButton: 'rounded-lg px-5 py-2'
            }
        });
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las especificaciones', 'error');
    }
};

// ==================== FUNCIONES AUXILIARES ====================
async function cargarTiposActivoSelect(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        const { data, error } = await window.supabaseClient
            .from('tipos_activo')
            .select(`
                id, 
                nombre, 
                codigo_prefijo,
                subcategoria_id,
                subcategorias:subcategoria_id (
                    id,
                    nombre,
                    categoria_id,
                    categorias:categoria_id (id, nombre)
                )
            `)
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar tipo de activo</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay tipos de activo activos</option>';
            return;
        }

        const tiposPorCategoria = new Map();
        data.forEach(tipo => {
            const categoriaNombre = tipo.subcategorias?.categorias?.nombre || 'Sin categoría';
            const subcategoriaNombre = tipo.subcategorias?.nombre || 'Sin subcategoría';
            const clave = `${categoriaNombre} - ${subcategoriaNombre}`;
            if (!tiposPorCategoria.has(clave)) tiposPorCategoria.set(clave, []);
            tiposPorCategoria.get(clave).push(tipo);
        });

        const categoriasOrdenadas = Array.from(tiposPorCategoria.keys()).sort();
        categoriasOrdenadas.forEach(categoria => {
            const tiposList = tiposPorCategoria.get(categoria);
            if (tiposList && tiposList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📁 ${categoria} (${tiposList.length})`;
                tiposList.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id;
                    let texto = tipo.nombre;
                    if (tipo.codigo_prefijo) texto += ` (${tipo.codigo_prefijo})`;
                    option.textContent = texto;
                    option.dataset.subcategoriaId = tipo.subcategoria_id;
                    option.dataset.subcategoriaNombre = tipo.subcategorias?.nombre || '';
                    option.dataset.categoriaId = tipo.subcategorias?.categoria_id || '';
                    option.dataset.categoriaNombre = tipo.subcategorias?.categorias?.nombre || '';
                    option.dataset.prefijo = tipo.codigo_prefijo || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error(`❌ Error cargando tipos de activo en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar tipos de activo</option>';
        mostrarAlerta('Error', 'No se pudieron cargar los tipos de activo', 'error');
    }
}

async function cargarActivosSelectConTipo(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        const { data, error } = await window.supabaseClient
            .from('activos')
            .select(`
                id, 
                nombre, 
                codigo_activo,
                tipo_activo_id,
                tipos_activo (id, nombre)
            `)
            .order('nombre');

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar activo</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay activos registrados</option>';
            return;
        }

        const activosPorTipo = new Map();
        data.forEach(activo => {
            const tipoNombre = activo.tipos_activo?.nombre || 'Sin tipo';
            if (!activosPorTipo.has(tipoNombre)) activosPorTipo.set(tipoNombre, []);
            activosPorTipo.get(tipoNombre).push(activo);
        });

        const tiposOrdenados = Array.from(activosPorTipo.keys()).sort();
        tiposOrdenados.forEach(tipo => {
            const activosDelTipo = activosPorTipo.get(tipo);
            if (activosDelTipo && activosDelTipo.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📁 ${tipo} (${activosDelTipo.length})`;
                activosDelTipo.forEach(activo => {
                    const option = document.createElement('option');
                    option.value = activo.id;
                    let texto = `${activo.nombre}`;
                    if (activo.codigo_activo) texto += ` (${activo.codigo_activo})`;
                    option.textContent = texto;
                    option.dataset.tipoId = activo.tipo_activo_id || '';
                    option.dataset.tipoNombre = activo.tipos_activo?.nombre || '';
                    option.dataset.codigo = activo.codigo_activo || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error(`❌ Error cargando activos con tipo en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar activos</option>';
        mostrarAlerta('Error', 'No se pudieron cargar los activos', 'error');
    }
}

async function cargarAtributosPorTipoActivo(tipoActivoId, selectId, incluirVacio = true) {
    try {
        if (!tipoActivoId) {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = incluirVacio ? '<option value="">Primero seleccione un activo</option>' : '';
                select.disabled = true;
            }
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('id, nombre_atributo, tipo_dato, unidad_medida, requerido')
            .eq('tipo_activo_id', tipoActivoId)
            .eq('activo', true)
            .order('orden')
            .order('nombre_atributo');

        if (error) throw error;

        const select = document.getElementById(selectId);
        if (!select) return;

        select.disabled = false;
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar atributo</option>' : '';

        if (data && data.length > 0) {
            data.forEach(a => {
                const option = document.createElement('option');
                option.value = a.id;
                const requeridoTexto = a.requerido ? ' *' : '';
                const unidadTexto = a.unidad_medida ? ` (${a.unidad_medida})` : '';
                option.textContent = `${a.nombre_atributo}${unidadTexto}${requeridoTexto} - ${a.tipo_dato}`;
                option.dataset.tipo = a.tipo_dato;
                option.dataset.unidad = a.unidad_medida || '';
                option.dataset.requerido = a.requerido;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No hay atributos para este tipo de activo</option>';
        }
    } catch (error) {
        console.error('Error cargando atributos:', error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar atributos</option>';
            select.disabled = true;
        }
    }
}

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarAtributosPorTipo = function() {
    const filtroTipo = document.getElementById('filtroTipoAtributo')?.value;
    const filtroEstado = document.querySelector('.filter-estado.ring-2')?.dataset.estado || 'todos';
    const cards = document.querySelectorAll('#atributos-grid .atributo-card');
    let contador = 0;

    cards.forEach(card => {
        let mostrar = true;
        if (filtroTipo && filtroTipo !== 'TODOS' && card.dataset.tipoId !== filtroTipo) mostrar = false;
        if (mostrar && filtroEstado !== 'todos') {
            const activo = card.dataset.activo === 'activo';
            if (filtroEstado === 'activos' && !activo) mostrar = false;
            if (filtroEstado === 'inactivos' && activo) mostrar = false;
        }
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
    const contadorSpan = document.getElementById('contadorAtributos');
    if (contadorSpan) contadorSpan.innerHTML = `Mostrando: ${contador} de ${cards.length} atributos`;
};

window.filtrarAtributosPorEstado = function(estado) {
    const botones = document.querySelectorAll('.filter-estado');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === estado) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarAtributosPorTipo();
};

window.limpiarFiltroAtributos = function() {
    const filtroTipo = document.getElementById('filtroTipoAtributo');
    if (filtroTipo) filtroTipo.value = 'TODOS';
    const botones = document.querySelectorAll('.filter-estado');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === 'todos') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    const cards = document.querySelectorAll('#atributos-grid .atributo-card');
    cards.forEach(card => card.style.display = 'block');
    const contadorSpan = document.getElementById('contadorAtributos');
    if (contadorSpan) contadorSpan.innerHTML = `Total: ${cards.length} atributos`;
};

// ==================== MODAL ESPECIFICACIÓN ====================
function crearModalEspecificacion() {
    if (document.getElementById('especificacionModal')) return;

    const modalHtml = `
        <div id="especificacionModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div class="flex-shrink-0 bg-primary text-white p-4 rounded-t-xl flex justify-between items-center">
                    <h2 class="text-xl font-bold" id="especificacionModalTitle"><i class="fas fa-microchip mr-2"></i>Agregar Especificación</h2>
                    <button onclick="cerrarModal('especificacionModal')" class="hover:bg-primary-dark p-2 rounded-lg transition-colors"><i class="fas fa-times"></i></button>
                </div>
                <div class="flex-1 overflow-y-auto p-6">
                    <form id="especificacionForm" onsubmit="guardarEspecificacion(event)">
                        <input type="hidden" id="especificacion_id">
                        <input type="hidden" id="especificacion_activo_id">
                        
                        <div class="mb-4">
                            <label class="form-label font-medium text-gray-700 block mb-1">
                                <i class="fas fa-tag text-primary mr-1"></i> Atributo <span class="text-red-500">*</span>
                            </label>
                            <select class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                    id="especificacion_atributo_id" required>
                                <option value="">Cargando atributos...</option>
                            </select>
                            <p class="text-xs text-gray-400 mt-1">Seleccione el atributo que desea especificar</p>
                        </div>
                        
                        <!-- Campo Texto -->
                        <div id="esp_campo_texto" class="mb-4 hidden">
                            <label class="form-label font-medium text-gray-700 block mb-1">
                                <i class="fas fa-font text-primary mr-1"></i> Valor <span class="text-red-500" id="esp_requerido_texto"></span>
                            </label>
                            <input type="text" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                   id="esp_valor_texto" placeholder="Ingrese el valor">
                        </div>
                        
                        <!-- Campo Número -->
                        <div id="esp_campo_numero" class="mb-4 hidden">
                            <label class="form-label font-medium text-gray-700 block mb-1">
                                <i class="fas fa-calculator text-primary mr-1"></i> Valor <span class="text-red-500" id="esp_requerido_numero"></span>
                                <span id="esp_valor_numero_unidad" class="text-sm text-gray-400"></span>
                            </label>
                            <input type="number" step="any" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                   id="esp_valor_numero" placeholder="0.00">
                        </div>
                        
                        <!-- Campo Booleano -->
                        <div id="esp_campo_booleano" class="mb-4 hidden">
                            <label class="form-label font-medium text-gray-700 block mb-1">
                                <i class="fas fa-check-circle text-primary mr-1"></i> Valor
                            </label>
                            <select class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                    id="esp_valor_booleano">
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                        
                        <!-- Campo Fecha -->
                        <div id="esp_campo_fecha" class="mb-4 hidden">
                            <label class="form-label font-medium text-gray-700 block mb-1">
                                <i class="fas fa-calendar-alt text-primary mr-1"></i> Valor <span class="text-red-500" id="esp_requerido_fecha"></span>
                            </label>
                            <input type="date" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" 
                                   id="esp_valor_fecha">
                        </div>
                        
                        <div class="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                            <i class="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
                            <div>
                                <span class="font-medium">Información:</span> Los campos marcados con <span class="text-red-500">*</span> son obligatorios. 
                                El tipo de campo se determina automáticamente según el atributo seleccionado.
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
                            <button type="button" onclick="cerrarModal('especificacionModal')" 
                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2">
                                <i class="fas fa-save"></i> Guardar Especificación
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function cargarAtributosPorTipoActivoModal(tipoActivoId, selectId) {
    try {
        if (!tipoActivoId) {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Primero seleccione un activo</option>';
                select.disabled = true;
            }
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('especificaciones_atributos')
            .select('id, nombre_atributo, tipo_dato, unidad_medida, requerido')
            .eq('tipo_activo_id', tipoActivoId)
            .eq('activo', true)
            .order('orden')
            .order('nombre_atributo');

        if (error) throw error;

        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar atributo</option>';
        select.disabled = false;

        if (data && data.length > 0) {
            data.forEach(a => {
                const requeridoTexto = a.requerido ? ' *' : '';
                const unidadTexto = a.unidad_medida ? ` (${a.unidad_medida})` : '';
                const option = document.createElement('option');
                option.value = a.id;
                option.textContent = `${a.nombre_atributo}${unidadTexto}${requeridoTexto} - ${a.tipo_dato}`;
                option.dataset.tipo = a.tipo_dato;
                option.dataset.unidad = a.unidad_medida || '';
                option.dataset.requerido = a.requerido;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No hay atributos para este tipo de activo</option>';
        }

        select.removeEventListener('change', handleAtributoChangeEspecificacion);
        select.addEventListener('change', handleAtributoChangeEspecificacion);
    } catch (error) {
        console.error('Error cargando atributos:', error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar atributos</option>';
        }
    }
}

function handleAtributoChangeEspecificacion(event) {
    const select = event.target;
    const selected = select.options[select.selectedIndex];
    const tipo = selected?.dataset.tipo;
    const unidad = selected?.dataset.unidad || '';
    const requerido = selected?.dataset.requerido === 'true';

    const campos = ['esp_campo_texto', 'esp_campo_numero', 'esp_campo_booleano', 'esp_campo_fecha'];
    
    // Ocultar todos los campos
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            elemento.classList.add('hidden');
            // Quitar required de todos los campos
            const input = elemento.querySelector('input, select, textarea');
            if (input) input.removeAttribute('required');
        }
    });

    // Mostrar solo el campo correspondiente
    if (tipo === 'texto') {
        const campo = document.getElementById('esp_campo_texto');
        if (campo) {
            campo.classList.remove('hidden');
            const input = document.getElementById('esp_valor_texto');
            if (input) {
                if (requerido) {
                    input.setAttribute('required', 'required');
                } else {
                    input.removeAttribute('required');
                }
            }
        }
    } else if (tipo === 'numero') {
        const campo = document.getElementById('esp_campo_numero');
        if (campo) {
            campo.classList.remove('hidden');
            const unidadSpan = document.getElementById('esp_valor_numero_unidad');
            if (unidadSpan) unidadSpan.innerText = unidad ? `(${unidad})` : '';
            const input = document.getElementById('esp_valor_numero');
            if (input) {
                if (requerido) {
                    input.setAttribute('required', 'required');
                } else {
                    input.removeAttribute('required');
                }
            }
        }
    } else if (tipo === 'booleano') {
        const campo = document.getElementById('esp_campo_booleano');
        if (campo) {
            campo.classList.remove('hidden');
            const select = document.getElementById('esp_valor_booleano');
            if (select) {
                // Los select no usan required de la misma forma
                if (requerido) {
                    select.setAttribute('required', 'required');
                } else {
                    select.removeAttribute('required');
                }
            }
        }
    } else if (tipo === 'fecha') {
        const campo = document.getElementById('esp_campo_fecha');
        if (campo) {
            campo.classList.remove('hidden');
            const input = document.getElementById('esp_valor_fecha');
            if (input) {
                if (requerido) {
                    input.setAttribute('required', 'required');
                } else {
                    input.removeAttribute('required');
                }
            }
        }
    }
}

// ==================== ABRIR MODAL AGREGAR ESPECIFICACIÓN ====================
window.abrirModalAgregarEspecificacion = async function(activoId) {
    console.log('🎯 Abriendo modal para agregar especificación al activo:', activoId);
    
    try {
        // Verificar que el modal existe, si no, crearlo
        let modal = document.getElementById('especificacionModal');
        if (!modal) {
            console.log('📦 Modal no encontrado, creándolo...');
            if (typeof window.crearModalEspecificacion === 'function') {
                window.crearModalEspecificacion();
                modal = document.getElementById('especificacionModal');
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.error('❌ No se puede crear el modal de especificación');
                mostrarAlerta('Error', 'No se puede abrir el formulario', 'error');
                return;
            }
        }

        // Cerrar modal si está abierto
        if (modal && !modal.classList.contains('hidden')) {
            window.cerrarModal('especificacionModal');
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Obtener el tipo de activo para cargar los atributos correspondientes
        const { data: activo, error: errorActivo } = await window.supabaseClient
            .from('activos')
            .select('tipo_activo_id, nombre, codigo_activo')
            .eq('id', activoId)
            .single();

        if (errorActivo) throw errorActivo;

        if (!activo || !activo.tipo_activo_id) {
            mostrarAlerta('Error', 'El activo no tiene un tipo definido. No se pueden agregar especificaciones.', 'error');
            return;
        }

        // Resetear formulario y configurar modo creación
        editandoId = null;
        
        const form = document.getElementById('especificacionForm');
        if (form) form.reset();
        
        const titleElement = document.getElementById('especificacionModalTitle');
        if (titleElement) titleElement.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>Agregar Especificación';
        
        // Limpiar campo de ID de edición
        const especIdField = document.getElementById('especificacion_id');
        if (especIdField) especIdField.value = '';
        
        // Establecer el ID del activo
        const activoIdField = document.getElementById('especificacion_activo_id');
        if (activoIdField) activoIdField.value = activoId;
        
        // Ocultar todos los campos de valor
        const campos = ['esp_campo_texto', 'esp_campo_numero', 'esp_campo_booleano', 'esp_campo_fecha'];
        campos.forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) elemento.classList.add('hidden');
        });
        
        // Limpiar valores de los campos
        const valorTexto = document.getElementById('esp_valor_texto');
        if (valorTexto) valorTexto.value = '';
        
        const valorNumero = document.getElementById('esp_valor_numero');
        if (valorNumero) valorNumero.value = '';
        
        const valorBooleano = document.getElementById('esp_valor_booleano');
        if (valorBooleano) valorBooleano.value = 'true';
        
        const valorFecha = document.getElementById('esp_valor_fecha');
        if (valorFecha) valorFecha.value = '';
        
        // Cargar atributos según el tipo de activo
        if (typeof window.cargarAtributosPorTipoActivoModal === 'function') {
            await window.cargarAtributosPorTipoActivoModal(activo.tipo_activo_id, 'especificacion_atributo_id');
        } else {
            console.error('❌ Función cargarAtributosPorTipoActivoModal no definida');
            mostrarAlerta('Error', 'No se pudieron cargar los atributos', 'error');
            return;
        }
        
        // Abrir el modal
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.offsetHeight;
            console.log('✅ Modal de especificación abierto correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error al abrir modal de especificación:', error);
        mostrarAlerta('Error', 'No se pudo abrir el formulario: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// ==================== GUARDAR ESPECIFICACIÓN (CREAR O EDITAR) ====================
window.guardarEspecificacion = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando especificación...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        // Obtener valores del formulario
        const activoId = document.getElementById('especificacion_activo_id')?.value;
        const atributoSelect = document.getElementById('especificacion_atributo_id');
        const atributoOption = atributoSelect?.options[atributoSelect.selectedIndex];
        const tipoDato = atributoOption?.dataset.tipo;
        const requerido = atributoOption?.dataset.requerido === 'true';
        const especificacionId = document.getElementById('especificacion_id')?.value;

        // Validaciones
        if (!activoId) {
            ocultarLoading();
            mostrarAlerta('Error', 'ID de activo no válido', 'error');
            return;
        }

        if (!atributoSelect?.value) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un atributo', 'error');
            return;
        }

        // Construir objeto de datos base
        const data = {
            activo_id: activoId,
            atributo_id: atributoSelect.value
        };

        let valorIngresado = false;

        // Agregar el valor según el tipo de dato
        if (tipoDato === 'texto') {
            const valor = document.getElementById('esp_valor_texto')?.value?.trim();
            
            // Validación requerida
            if (requerido && !valor) {
                ocultarLoading();
                mostrarAlerta('Error', 'El valor del atributo es requerido', 'error');
                document.getElementById('esp_valor_texto').focus();
                return;
            }
            
            if (valor) {
                data.valor_texto = valor;
                valorIngresado = true;
            } else {
                data.valor_texto = null;
            }
            data.valor_numero = null;
            data.valor_booleano = null;
            data.valor_fecha = null;
            
        } else if (tipoDato === 'numero') {
            const valor = document.getElementById('esp_valor_numero')?.value;
            
            // Validación requerida
            if (requerido && (valor === '' || valor === undefined)) {
                ocultarLoading();
                mostrarAlerta('Error', 'El valor del atributo es requerido', 'error');
                document.getElementById('esp_valor_numero').focus();
                return;
            }
            
            if (valor !== '' && valor !== undefined) {
                data.valor_numero = parseFloat(valor);
                valorIngresado = true;
            } else {
                data.valor_numero = null;
            }
            data.valor_texto = null;
            data.valor_booleano = null;
            data.valor_fecha = null;
            
        } else if (tipoDato === 'booleano') {
            const valor = document.getElementById('esp_valor_booleano')?.value;
            data.valor_booleano = valor === 'true';
            valorIngresado = true;
            data.valor_texto = null;
            data.valor_numero = null;
            data.valor_fecha = null;
            
        } else if (tipoDato === 'fecha') {
            const valor = document.getElementById('esp_valor_fecha')?.value;
            
            // Validación requerida
            if (requerido && !valor) {
                ocultarLoading();
                mostrarAlerta('Error', 'La fecha es requerida', 'error');
                document.getElementById('esp_valor_fecha').focus();
                return;
            }
            
            if (valor) {
                data.valor_fecha = valor;
                valorIngresado = true;
            } else {
                data.valor_fecha = null;
            }
            data.valor_texto = null;
            data.valor_numero = null;
            data.valor_booleano = null;
            
        } else {
            ocultarLoading();
            mostrarAlerta('Error', 'Tipo de dato no soportado', 'error');
            return;
        }

        // Verificar si se ingresó un valor (para atributos no requeridos, está bien que sea null)
        // No bloqueamos por valorIngresado porque puede ser un atributo opcional

        const isEditing = especificacionId && especificacionId !== '';
        
        if (isEditing) {
            // MODO EDICIÓN: Actualizar especificación existente
            console.log('✏️ Actualizando especificación ID:', especificacionId);
            
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('especificaciones_valores')
                .update(data)
                .eq('id', especificacionId);
            
            if (error) {
                if (error.message?.includes('unique')) {
                    throw new Error('Ya existe un valor para este atributo en este activo');
                }
                throw error;
            }
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Especificación actualizada correctamente', 'success');
            
        } else {
            // MODO CREACIÓN: Insertar nueva especificación
            console.log('➕ Creando nueva especificación para activo:', activoId);
            
            // Solo insertar si hay un valor o si el atributo es opcional
            // Para atributos opcionales sin valor, no insertamos nada
            if (!valorIngresado && !requerido) {
                ocultarLoading();
                mostrarAlerta('Info', 'No se agregó especificación porque el valor está vacío', 'info');
                cerrarModal('especificacionModal');
                return;
            }
            
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            // Verificar si ya existe un valor para este atributo en este activo
            const { data: existing, error: checkError } = await window.supabaseClient
                .from('especificaciones_valores')
                .select('id')
                .eq('activo_id', activoId)
                .eq('atributo_id', data.atributo_id)
                .maybeSingle();
            
            if (checkError) throw checkError;
            
            if (existing) {
                ocultarLoading();
                mostrarAlerta('Error', 'Este activo ya tiene un valor para este atributo. Use la opción de edición.', 'error');
                return;
            }
            
            const { error } = await window.supabaseClient
                .from('especificaciones_valores')
                .insert(data);
            
            if (error) {
                if (error.message?.includes('unique')) {
                    throw new Error('Ya existe un valor para este atributo en este activo');
                }
                throw error;
            }
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Especificación agregada correctamente', 'success');
        }
        
        // Cerrar el modal
        cerrarModal('especificacionModal');
        
        // Resetear el campo de edición
        const idField = document.getElementById('especificacion_id');
        if (idField) idField.value = '';
        editandoId = null;
        
        // Recargar la vista de activos para mostrar los cambios
        if (typeof cargarVistaActivos === 'function') {
            await cargarVistaActivos();
        } else if (typeof window.cargarVistaActivos === 'function') {
            await window.cargarVistaActivos();
        } else {
            if (typeof window.cargarVista === 'function' && window.vistaActual) {
                await window.cargarVista(window.vistaActual);
            }
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error en guardarEspecificacion:', error);
        
        let mensajeError = 'No se pudo guardar la especificación';
        if (error.message?.includes('duplicate') || error.message?.includes('único')) {
            mensajeError = 'Ya existe un valor para este atributo en este activo';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};