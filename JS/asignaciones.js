// ==================== VISTA ASIGNACIONES ====================
async function cargarVistaAsignaciones() {
    mostrarLoading('Cargando asignaciones...');
    try {
        console.log('%c📋 CARGANDO ASIGNACIONES', 'background: #007bff; color: white; font-size: 14px;');

        const { data: asignaciones } = await window.supabaseClient
            .from('asignaciones')
            .select(`*, activo:activos (id, nombre, codigo_activo, estado, ubicacion:ubicacion_id (id, nombre, descripcion), empresa:empresa_id (id, nombre, ruc)), empleado:empleados (id, nombre_completo, correo, celular, areas (nombre)), asignador:asignado_por (id, correo), recibidor:recibido_por (id, correo)`)
            .order('fecha_asignacion', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        asignaciones?.forEach(a => { if (a.creado_por) usuariosIds.add(a.creado_por); if (a.modificado_por) usuariosIds.add(a.modificado_por); if (a.asignado_por) usuariosIds.add(a.asignado_por); if (a.recibido_por) usuariosIds.add(a.recibido_por); });

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
                <h2 class="text-2xl font-bold text-primary">Asignaciones</h2>
                <button onclick="window.abrirModalNuevaAsignacion()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Asignación</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarAsignaciones('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${asignaciones?.length || 0}</span></button>
                <button onclick="filtrarAsignaciones('ACTIVA')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="ACTIVA">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${asignaciones?.filter(a => a.estado === 'ACTIVA').length || 0}</span></button>
                <button onclick="filtrarAsignaciones('DEVUELTA')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-btn" data-filter="DEVUELTA">Devueltas <span class="ml-1 bg-blue-200 px-2 py-0.5 rounded-full text-xs">${asignaciones?.filter(a => a.estado === 'DEVUELTA').length || 0}</span></button>
                <button onclick="filtrarAsignaciones('CANCELADA')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="CANCELADA">Canceladas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${asignaciones?.filter(a => a.estado === 'CANCELADA').length || 0}</span></button>
            </div>
            <div class="cards-grid" id="asignaciones-grid">
        `;

        if (asignaciones?.length) {
            asignaciones.forEach(a => {
                const creadorInfo = usuariosConEmpleados.get(a.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(a.modificado_por);
                const asignadorInfo = usuariosConEmpleados.get(a.asignado_por);
                const recibidorInfo = usuariosConEmpleados.get(a.recibido_por);
                const activo = a.activo || {};
                const ubicacion = activo.ubicacion || {};
                const empresa = activo.empresa || {};
                const estadoClass = { 'ACTIVA': 'bg-green-100 text-green-800', 'DEVUELTA': 'bg-blue-100 text-blue-800', 'CANCELADA': 'bg-gray-100 text-gray-800' }[a.estado] || 'bg-gray-100';
                const fechaAsignacion = a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString('es-ES') : 'No registrada';
                const fechaDevolucion = a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString('es-ES') : null;
                let diasTranscurridos = null;
                if (a.estado === 'ACTIVA' && a.fecha_asignacion) diasTranscurridos = Math.ceil((new Date() - new Date(a.fecha_asignacion)) / (1000 * 60 * 60 * 24));

                html += `
                    <div class="card-item" data-estado="${a.estado || 'ACTIVA'}">
                        <div class="flex justify-between items-start mb-3">
                            <div><span class="font-bold text-primary text-lg">${activo.nombre || 'Activo no especificado'}</span><p class="text-xs text-gray-500">Código: ${activo.codigo_activo || 'N/A'}</p></div>
                            <div class="flex flex-col gap-1 items-end"><span class="estado-badge ${estadoClass}">${a.estado || 'ACTIVA'}</span>${diasTranscurridos ? `<span class="text-xs text-gray-500">${diasTranscurridos} días</span>` : ''}</div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="bg-gray-50 p-2 rounded-lg"><p class="flex items-center gap-2"><i class="fas fa-user-tie text-primary w-4"></i><span class="font-medium">${a.empleado?.nombre_completo || 'Empleado no especificado'}</span></p><p class="text-xs text-gray-500 ml-6">${a.empleado?.areas?.nombre || 'Sin área'} ${a.empleado?.correo ? `· ${a.empleado.correo}` : ''}${a.empleado?.celular ? `· 📞 ${a.empleado.celular}` : ''}</p></div>
                            <div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500"><i class="fas fa-map-marker-alt text-primary mr-1"></i> Ubicación</p><p class="font-medium text-sm">${ubicacion.nombre || 'No especificada'}</p></div><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500"><i class="fas fa-building text-primary mr-1"></i> Empresa</p><p class="font-medium text-sm">${empresa.nombre || 'No especificada'}</p></div></div>
                            <div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500"><i class="far fa-calendar-alt text-primary mr-1"></i> Asignación</p><p class="font-medium text-sm">${fechaAsignacion}</p></div><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500"><i class="fas fa-undo-alt text-primary mr-1"></i> Devolución</p><p class="font-medium text-sm">${a.fecha_devolucion ? new Date(a.fecha_devolucion).toLocaleDateString('es-ES') : 'Pendiente'}</p></div></div>
                            <div class="bg-gray-50 p-2 rounded-lg flex items-center gap-2"><i class="fas fa-user-check text-primary"></i><div><p class="text-xs text-gray-500">Asignado por</p><p class="text-sm font-medium">${asignadorInfo?.nombre || 'No especificado'}</p></div></div>
                            ${a.estado === 'DEVUELTA' && a.recibido_por ? `<div class="bg-gray-50 p-2 rounded-lg flex items-center gap-2 mt-1"><i class="fas fa-user-check text-green-600"></i><div><p class="text-xs text-gray-500">Recibido por</p><p class="text-sm font-medium">${recibidorInfo?.nombre || 'No especificado'}</p></div></div>` : ''}
                            ${a.observaciones ? `<div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500 mb-1"><i class="fas fa-comment text-primary mr-1"></i> Observaciones</p><p class="text-sm text-gray-700">${a.observaciones}</p></div>` : ''}
                            <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(a.creado_el).toLocaleDateString('es-ES')} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${a.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(a.modificado_el).toLocaleDateString('es-ES')} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleAsignacion('${a.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarAsignacion('${a.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            ${a.estado === 'ACTIVA' ? `<button onclick="devolverActivo('${a.id}')" class="text-green-600 hover:opacity-75"><i class="fas fa-undo-alt text-lg"></i></button>` : ''}
                            <button onclick="eliminarAsignacion('${a.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-clipboard-list text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay asignaciones registradas</p><button onclick="window.abrirModalNuevaAsignacion()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Asignación</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar asignaciones');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD ASIGNACIONES ====================
window.editarAsignacion = async function(id) {
    mostrarLoading('Cargando asignación...');
    try {
        const { data: asignacion, error } = await window.supabaseClient
            .from('asignaciones')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('asignacionModalTitle').innerText = 'Editar Asignación';

        await Promise.all([
            cargarActivosSelect('asig_activo_id'),
            cargarEmpleadosSelect(),
            cargarUsuariosSelect('asig_asignado_por')
        ]);

        document.getElementById('asig_activo_id').value = asignacion.activo_id || '';
        document.getElementById('asig_empleado_id').value = asignacion.empleado_id || '';
        document.getElementById('asig_fecha_asignacion').value = asignacion.fecha_asignacion || '';
        document.getElementById('asig_fecha_devolucion').value = asignacion.fecha_devolucion || '';
        document.getElementById('asig_asignado_por').value = asignacion.asignado_por || '';
        document.getElementById('asig_estado').value = asignacion.estado || 'ACTIVA';
        document.getElementById('asig_observaciones').value = asignacion.observaciones || '';

        ocultarLoading();
        document.getElementById('asignacionModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la asignación', 'error');
    }
};

window.eliminarAsignacion = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar asignación?',
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
            const { data: asignacion } = await window.supabaseClient
                .from('asignaciones')
                .select('activo_id')
                .eq('id', id)
                .single();

            await window.supabaseClient.from('asignaciones').delete().eq('id', id);

            if (asignacion) {
                await window.supabaseClient
                    .from('activos')
                    .update({ estado: 'DISPONIBLE' })
                    .eq('id', asignacion.activo_id);
            }

            ocultarLoading();
            mostrarAlerta('Éxito', 'Asignación eliminada', 'success');
            await cargarVistaAsignaciones();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarAsignacion = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando asignación...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        const data = {
            activo_id: document.getElementById('asig_activo_id').value,
            empleado_id: document.getElementById('asig_empleado_id').value,
            fecha_asignacion: document.getElementById('asig_fecha_asignacion').value,
            fecha_devolucion: document.getElementById('asig_fecha_devolucion').value || null,
            asignado_por: document.getElementById('asig_asignado_por').value || null,
            estado: document.getElementById('asig_estado').value,
            observaciones: document.getElementById('asig_observaciones').value || null
        };

        if (!data.activo_id || !data.empleado_id || !data.fecha_asignacion) {
            ocultarLoading();
            mostrarAlerta('Error', 'Complete los campos obligatorios', 'error');
            return;
        }

        let asignacionId;

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;

            const { error } = await window.supabaseClient
                .from('asignaciones')
                .update(data)
                .eq('id', editandoId);

            if (error) throw error;
            asignacionId = editandoId;

            if (data.estado === 'DEVUELTA' || data.estado === 'CANCELADA') {
                await window.supabaseClient
                    .from('activos')
                    .update({
                        estado: 'DISPONIBLE',
                        modificado_el: ahora,
                        modificado_por: usuarioActual.id
                    })
                    .eq('id', data.activo_id);
            }
        } else {
            const { data: activoActual } = await window.supabaseClient
                .from('activos')
                .select('estado')
                .eq('id', data.activo_id)
                .single();

            if (activoActual && activoActual.estado === 'ASIGNADO') {
                ocultarLoading();
                mostrarAlerta('Error', 'El activo ya está asignado a otro empleado', 'error');
                return;
            }

            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;

            const { data: nuevaAsignacion, error } = await window.supabaseClient
                .from('asignaciones')
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            asignacionId = nuevaAsignacion.id;

            await window.supabaseClient
                .from('activos')
                .update({
                    estado: 'ASIGNADO',
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', data.activo_id);

            await registrarCambioEstado(data.activo_id, 'ASIGNADO', {
                motivo: 'Nueva asignación a empleado',
                asignacionId: nuevaAsignacion.id
            });
        }

        ocultarLoading();
        mostrarAlerta('Éxito', editandoId ? 'Asignación actualizada' : 'Asignación creada', 'success');
        cerrarModal('asignacionModal');

        if (vistaActual === 'asignaciones') {
            await cargarVistaAsignaciones();
        } else {
            await cargarVistaActivos();
        }
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la asignación: ' + error.message, 'error');
    }
};

// ==================== FUNCIÓN DEVOLVER ACTIVO ====================
window.devolverActivo = async function(id) {
    try {
        console.log('🔍 Procesando devolución de activo para asignación:', id);

        const { data: asignacionInfo, error: errorAsig } = await window.supabaseClient
            .from('asignaciones')
            .select(`
                *,
                activo:activos (id, nombre, codigo_activo),
                empleado:empleados (id, nombre_completo, correo)
            `)
            .eq('id', id)
            .single();

        if (errorAsig) throw errorAsig;

        if (!asignacionInfo) {
            mostrarAlerta('Error', 'No se encontró la asignación', 'error');
            return;
        }

        if (asignacionInfo.estado !== 'ACTIVA') {
            mostrarAlerta('Error', 'Esta asignación ya no está activa', 'error');
            return;
        }

        const { data: usuarios } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .eq('activo', true)
            .order('correo');

        const usuariosOptions = [];
        for (const u of usuarios || []) {
            let nombre = u.correo;
            if (u.empleado_id) {
                const { data: emp } = await window.supabaseClient
                    .from('empleados')
                    .select('nombre_completo')
                    .eq('id', u.empleado_id)
                    .single();
                if (emp) nombre = `${emp.nombre_completo} (${u.correo})`;
            }
            usuariosOptions.push(`<option value="${u.id}">${nombre}</option>`);
        }

        const { value: formValues } = await Swal.fire({
            title: 'Devolver Activo',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-blue-50 p-3 rounded-lg text-sm">
                        <p class="font-semibold text-blue-800">${asignacionInfo.activo?.nombre || 'Activo'}</p>
                        <p class="text-xs text-gray-600">Código: ${asignacionInfo.activo?.codigo_activo || 'N/A'}</p>
                        <p class="text-xs text-gray-600 mt-1"><i class="fas fa-user-tie mr-1"></i>Asignado a: ${asignacionInfo.empleado?.nombre_completo || 'N/A'}</p>
                        <p class="text-xs text-gray-600"><i class="far fa-calendar-alt mr-1"></i>Desde: ${new Date(asignacionInfo.fecha_asignacion).toLocaleDateString('es-ES')}</p>
                        <p class="text-xs text-gray-600"><i class="fas fa-clock mr-1"></i>Días asignado: ${Math.ceil((new Date() - new Date(asignacionInfo.fecha_asignacion)) / (1000 * 60 * 60 * 24))} días</p>
                    </div>
                    <div><label class="form-label font-medium text-gray-700">Fecha de devolución <span class="text-red-500">*</span></label><input type="date" id="swal_fecha" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" value="${new Date().toISOString().split('T')[0]}" required></div>
                    <div><label class="form-label font-medium text-gray-700">Recibido por <span class="text-red-500">*</span></label><select id="swal_recibido_por" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" required><option value="">Seleccionar usuario</option>${usuariosOptions.join('')}</select><p class="text-xs text-gray-400 mt-1">Usuario que recibe la devolución</p></div>
                    <div><label class="form-label font-medium text-gray-700">Observaciones</label><textarea id="swal_observaciones" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg" rows="2" placeholder="Estado del activo al devolver, novedades, etc."></textarea></div>
                    <div><label class="form-label font-medium text-gray-700">Motivo del cambio de estado</label><select id="swal_motivo" class="form-input w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="Devolución normal">Devolución normal</option><option value="Fin de préstamo">Fin de préstamo</option><option value="Devolución por mantenimiento">Devolución por mantenimiento</option><option value="Devolución anticipada">Devolución anticipada</option><option value="Cambio de equipo">Cambio de equipo</option><option value="Baja del empleado">Baja del empleado</option><option value="Otro">Otro</option></select></div>
                    <div class="p-3 bg-yellow-50 rounded-lg text-sm"><i class="fas fa-info-circle text-yellow-600 mr-1"></i><span class="text-yellow-700">Al devolver el activo, su estado cambiará a "DISPONIBLE" automáticamente.</span></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: '✅ Confirmar devolución',
            cancelButtonText: '❌ Cancelar',
            width: '600px',
            preConfirm: () => {
                const fecha = document.getElementById('swal_fecha').value;
                const recibidoPor = document.getElementById('swal_recibido_por').value;
                if (!fecha) { Swal.showValidationMessage('La fecha es requerida'); return false; }
                if (!recibidoPor) { Swal.showValidationMessage('Debe seleccionar quién recibe la devolución'); return false; }
                return {
                    fecha,
                    recibidoPor,
                    observaciones: document.getElementById('swal_observaciones').value,
                    motivo: document.getElementById('swal_motivo').value
                };
            },
            didOpen: () => {
                if (usuarioActual && usuarioActual.id) {
                    const select = document.getElementById('swal_recibido_por');
                    if (select) {
                        for (let i = 0; i < select.options.length; i++) {
                            if (select.options[i].value === usuarioActual.id) {
                                select.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }
            }
        });

        if (formValues) {
            mostrarLoading('Procesando devolución...');
            try {
                if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
                const ahora = new Date().toISOString();

                const { error: errorAsignacion } = await window.supabaseClient
                    .from('asignaciones')
                    .update({
                        estado: 'DEVUELTA',
                        fecha_devolucion: formValues.fecha,
                        observaciones: formValues.observaciones || 'Devolución procesada',
                        recibido_por: formValues.recibidoPor,
                        modificado_el: ahora,
                        modificado_por: usuarioActual.id
                    })
                    .eq('id', id);

                if (errorAsignacion) throw errorAsignacion;

                if (asignacionInfo.activo_id) {
                    const { error: errorActivo } = await window.supabaseClient
                        .from('activos')
                        .update({
                            estado: 'DISPONIBLE',
                            modificado_el: ahora,
                            modificado_por: usuarioActual.id
                        })
                        .eq('id', asignacionInfo.activo_id);

                    if (errorActivo) throw errorActivo;

                    await registrarCambioEstado(asignacionInfo.activo_id, 'DISPONIBLE', {
                        motivo: formValues.motivo || 'Devolución de asignación',
                        estadoAnterior: 'ASIGNADO',
                        asignacionId: id,
                        observaciones: formValues.observaciones
                    });
                }

                const { data: recibidor } = await window.supabaseClient
                    .from('usuarios')
                    .select('correo, empleado_id')
                    .eq('id', formValues.recibidoPor)
                    .single();

                let recibidorNombre = recibidor?.correo;
                if (recibidor?.empleado_id) {
                    const { data: empRecibidor } = await window.supabaseClient
                        .from('empleados')
                        .select('nombre_completo')
                        .eq('id', recibidor.empleado_id)
                        .single();
                    if (empRecibidor) recibidorNombre = empRecibidor.nombre_completo;
                }

                ocultarLoading();

                await Swal.fire({
                    title: '✅ Devolución exitosa',
                    html: `<div class="text-left space-y-2"><p><i class="fas fa-check-circle text-green-500 mr-2"></i>Activo devuelto correctamente</p><p><span class="font-medium">Activo:</span> ${asignacionInfo.activo?.nombre || 'N/A'}</p><p><span class="font-medium">Empleado:</span> ${asignacionInfo.empleado?.nombre_completo || 'N/A'}</p><p><span class="font-medium">Recibido por:</span> ${recibidorNombre}</p><p><span class="font-medium">Fecha:</span> ${new Date(formValues.fecha).toLocaleDateString('es-ES')}</p>${formValues.observaciones ? `<p><span class="font-medium">Observaciones:</span> ${formValues.observaciones}</p>` : ''}</div>`,
                    icon: 'success',
                    confirmButtonColor: '#39080a',
                    timer: 3000
                });

                if (vistaActual === 'asignaciones') {
                    await cargarVistaAsignaciones();
                } else {
                    await cargarVistaActivos();
                }
            } catch (error) {
                ocultarLoading();
                console.error('❌ Error en devolución:', error);
                mostrarAlerta('Error', 'No se pudo procesar la devolución: ' + error.message, 'error');
            }
        }
    } catch (error) {
        console.error('❌ Error al preparar devolución:', error);
        mostrarAlerta('Error', 'No se pudo preparar el formulario de devolución', 'error');
    }
};

// ==================== MODALES ====================
window.abrirModalNuevaAsignacion = async function() {
    const modal = document.getElementById('asignacionModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('asignacionModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    editandoId = null;
    const form = document.getElementById('asignacionForm');
    if (form) form.reset();

    const titleElement = document.getElementById('asignacionModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Asignación';

    const fechaInput = document.getElementById('asig_fecha_asignacion');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    const estadoSelect = document.getElementById('asig_estado');
    if (estadoSelect) estadoSelect.value = 'ACTIVA';

    try {
        await Promise.all([
            cargarActivosDisponiblesSelect('asig_activo_id'),
            cargarEmpleadosSelect('asig_empleado_id'),
            cargarUsuariosSelect('asig_asignado_por')
        ]);
    } catch (error) {
        console.error('❌ Error cargando selects:', error);
    }

    if (usuarioActual && usuarioActual.id) {
        const asignadoPorSelect = document.getElementById('asig_asignado_por');
        if (asignadoPorSelect) {
            setTimeout(() => {
                for (let i = 0; i < asignadoPorSelect.options.length; i++) {
                    if (asignadoPorSelect.options[i].value === usuarioActual.id) {
                        asignadoPorSelect.selectedIndex = i;
                        break;
                    }
                }
            }, 100);
        }
    }

    await window.abrirModal('asignacionModal');
};

window.abrirAsignacionConActivo = async function(activoId) {
    console.log('🎯 Abriendo asignación para activo:', activoId);

    const { data: asignacionActiva } = await window.supabaseClient
        .from('asignaciones')
        .select('id, estado')
        .eq('activo_id', activoId)
        .eq('estado', 'ACTIVA')
        .maybeSingle();

    if (asignacionActiva) {
        const result = await Swal.fire({
            title: 'Activo ya asignado',
            html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Este activo ya tiene una asignación activa.</p><p class="text-sm text-gray-500 mt-2">¿Deseas ver la asignación actual o forzar una nueva?</p></div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver asignación',
            cancelButtonText: 'Forzar nueva',
            showDenyButton: true,
            denyButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            await verDetalleAsignacion(asignacionActiva.id);
            return;
        } else if (result.isDenied) {
            return;
        }
    }

    await window.abrirModalNuevaAsignacion();

    setTimeout(() => {
        const select = document.getElementById('asig_activo_id');
        if (select) {
            let opcionExiste = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === activoId) {
                    opcionExiste = true;
                    break;
                }
            }
            if (opcionExiste) {
                select.value = activoId;
                select.dispatchEvent(new Event('change'));
            } else {
                console.warn('⚠️ El activo no está disponible para asignación');
                mostrarAlerta('Aviso', 'Este activo no está disponible para asignación', 'info');
            }
        }
    }, 500);
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleAsignacion = async function(id) {
    mostrarLoading('Cargando detalles de la asignación...');
    try {
        const { data: asignacion, error } = await window.supabaseClient
            .from('asignaciones')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select(`id, nombre, codigo_activo, ubicacion:ubicacion_id (id, nombre, descripcion)`)
            .eq('id', asignacion.activo_id)
            .single();

        const { data: empleado } = await window.supabaseClient
            .from('empleados')
            .select(`nombre_completo, correo, celular, puesto, areas (nombre)`)
            .eq('id', asignacion.empleado_id)
            .single();

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(asignacion.creado_por);
        const modificadorInfo = asignacion.modificado_por ? await obtenerInfoUsuarioConEmpleado(asignacion.modificado_por) : null;
        const asignadorInfo = asignacion.asignado_por ? await obtenerInfoUsuarioConEmpleado(asignacion.asignado_por) : null;
        const recibidorInfo = asignacion.recibido_por ? await obtenerInfoUsuarioConEmpleado(asignacion.recibido_por) : null;

        ocultarLoading();

        const estadoClass = { 'ACTIVA': 'bg-green-100 text-green-800', 'DEVUELTA': 'bg-blue-100 text-blue-800', 'CANCELADA': 'bg-gray-100 text-gray-800' }[asignacion.estado] || 'bg-gray-100';

        Swal.fire({
            title: 'Detalles de la Asignación',
            width: '700px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-desktop"></i> Activo Asignado</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Nombre:</span> ${activo?.nombre || 'N/A'}</p><p><span class="font-semibold">Código:</span> ${activo?.codigo_activo || 'N/A'}</p><p class="col-span-2"><span class="font-semibold">Ubicación:</span> ${activo?.ubicacion?.nombre || 'No especificada'}${activo?.ubicacion?.descripcion ? `<span class="text-xs text-gray-500 ml-1">(${activo.ubicacion.descripcion})</span>` : ''}</p></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-user-tie"></i> Empleado Asignado</h3>${empleado ? `<div class="space-y-2"><p class="font-semibold text-primary">${empleado.nombre_completo}</p><p><span class="font-semibold">Puesto:</span> ${empleado.puesto || 'N/A'}</p><p><span class="font-semibold">Área:</span> ${empleado.areas?.nombre || 'N/A'}</p><p><span class="font-semibold">Correo:</span> ${empleado.correo || 'N/A'}</p><p><span class="font-semibold">Celular:</span> ${empleado.celular || 'N/A'}</p></div>` : '<p class="text-gray-500">No hay empleado asociado</p>'}</div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning"><h3 class="font-bold text-warning mb-3"><i class="fas fa-clipboard-list"></i> Detalles de la Asignación</h3><div class="grid grid-cols-2 gap-3"><p><span class="font-semibold">Estado:</span> <span class="estado-badge ${estadoClass}">${asignacion.estado || 'ACTIVA'}</span></p><p><span class="font-semibold">Asignado por:</span> ${asignadorInfo?.nombre || 'N/A'}</p>${asignacion.estado === 'DEVUELTA' && recibidorInfo ? `<p><span class="font-semibold">Recibido por:</span> ${recibidorInfo.nombre}</p>` : ''}<p><span class="font-semibold">Fecha Asignación:</span> ${asignacion.fecha_asignacion ? new Date(asignacion.fecha_asignacion).toLocaleDateString() : 'No registrada'}</p><p><span class="font-semibold">Fecha Devolución:</span> ${asignacion.fecha_devolucion ? new Date(asignacion.fecha_devolucion).toLocaleDateString() : 'Pendiente'}</p>${asignacion.observaciones ? `<p class="col-span-2"><span class="font-semibold">Observaciones:</span> ${asignacion.observaciones}</p>` : ''}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${asignacion.creado_el ? new Date(asignacion.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${asignacion.modificado_el ? new Date(asignacion.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarAsignaciones = function(estado) {
    const cards = document.querySelectorAll('#asignaciones-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === estado || (estado === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        if (estado === 'todos') { card.style.display = 'block'; contador++; }
        else if (card.dataset.estado === estado) { card.style.display = 'block'; contador++; }
        else card.style.display = 'none';
    });
};