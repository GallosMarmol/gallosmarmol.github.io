// ==================== VISTA MANTENIMIENTOS ====================
async function cargarVistaMantenimientos() {
    mostrarLoading('Cargando mantenimientos...');
    try {
        console.log('%c📋 CARGANDO MANTENIMIENTOS', 'background: #fd7e14; color: white; font-size: 14px;');

        const { data: mantenimientos } = await window.supabaseClient
            .from('mantenimientos')
            .select(`*, activo:activos (nombre, codigo_activo)`)
            .order('fecha_solicitud', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        mantenimientos?.forEach(m => { if (m.creado_por) usuariosIds.add(m.creado_por); if (m.modificado_por) usuariosIds.add(m.modificado_por); });

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
                <h2 class="text-2xl font-bold text-primary">Mantenimientos</h2>
                <button onclick="window.abrirModalNuevoMantenimiento()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Mantenimiento</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarMantenimientos('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${mantenimientos?.length || 0}</span></button>
                <button onclick="filtrarMantenimientos('PENDIENTE')" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 filter-btn" data-filter="PENDIENTE">Pendientes <span class="ml-1 bg-yellow-200 px-2 py-0.5 rounded-full text-xs">${mantenimientos?.filter(m => m.resultado === 'PENDIENTE').length || 0}</span></button>
                <button onclick="filtrarMantenimientos('EXITOSO')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="EXITOSO">Exitosos <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${mantenimientos?.filter(m => m.resultado === 'EXITOSO').length || 0}</span></button>
                <button onclick="filtrarMantenimientos('NO_REPARADO')" class="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200 filter-btn" data-filter="NO_REPARADO">No Reparados <span class="ml-1 bg-red-200 px-2 py-0.5 rounded-full text-xs">${mantenimientos?.filter(m => m.resultado === 'NO_REPARADO').length || 0}</span></button>
            </div>
            <div class="cards-grid" id="mantenimientos-grid">
        `;

        if (mantenimientos?.length) {
            mantenimientos.forEach(m => {
                const creadorInfo = usuariosConEmpleados.get(m.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(m.modificado_por);
                const resultadoClass = { 'EXITOSO': 'bg-green-100 text-green-800', 'PENDIENTE': 'bg-yellow-100 text-yellow-800', 'NO_REPARADO': 'bg-red-100 text-red-800' }[m.resultado] || 'bg-gray-100';

                html += `
                    <div class="card-item" data-resultado="${m.resultado || 'PENDIENTE'}">
                        <div class="flex justify-between items-start mb-2">
                            <span class="font-bold text-primary">${m.activo?.nombre || 'Activo'}</span>
                            <span class="estado-badge ${resultadoClass}">${m.resultado || 'PENDIENTE'}</span>
                        </div>
                        <p class="text-xs text-gray-500 mb-1">${m.tipo || 'Sin tipo'} · ${m.activo?.codigo_activo || ''}</p>
                        <p class="text-sm mb-2">${m.descripcion || ''}</p>
                        <div class="grid grid-cols-2 gap-2 text-xs"><p><i class="far fa-calendar-alt mr-1"></i> Solicitud: ${m.fecha_solicitud || 'N/A'}</p><p><i class="far fa-calendar-check mr-1"></i> Programada: ${m.fecha_programada || 'N/A'}</p></div>
                        <p class="text-xs mt-1"><i class="fas fa-user-cog mr-1"></i> Técnico: ${m.tecnico_asignado || 'Sin asignar'}</p>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t"><p><i class="fas fa-user-plus"></i> Creado: ${new Date(m.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></p>${m.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(m.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></p>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="editarMantenimiento('${m.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="eliminarMantenimiento('${m.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center p-8 text-gray-500 bg-white rounded-lg">No hay mantenimientos registrados</div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar mantenimientos');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD MANTENIMIENTOS ====================
window.editarMantenimiento = async function(id) {
    mostrarLoading('Cargando mantenimiento...');
    try {
        const { data: mantenimiento, error } = await window.supabaseClient
            .from('mantenimientos')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;

        let modal = document.getElementById('mantenimientoModal');
        if (!modal) {
            mostrarAlerta('Error', 'Error al abrir el formulario', 'error');
            return;
        }

        const titleElement = document.getElementById('mantenimientoModalTitle');
        if (titleElement) titleElement.innerHTML = '<i class="fas fa-edit mr-2"></i>Editar Mantenimiento';

        await cargarActivosSelect('mant_activo_id');

        document.getElementById('mant_activo_id').value = mantenimiento.activo_id || '';
        document.getElementById('mant_tipo').value = mantenimiento.tipo || '';
        document.getElementById('mant_fecha_solicitud').value = mantenimiento.fecha_solicitud || '';
        document.getElementById('mant_fecha_programada').value = mantenimiento.fecha_programada || '';
        document.getElementById('mant_descripcion').value = mantenimiento.descripcion || '';
        document.getElementById('mant_diagnostico').value = mantenimiento.diagnostico || '';
        document.getElementById('mant_solucion').value = mantenimiento.solucion_aplicada || '';
        document.getElementById('mant_tecnico').value = mantenimiento.tecnico_asignado || '';
        document.getElementById('mant_resultado').value = mantenimiento.resultado || 'PENDIENTE';

        ocultarLoading();

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.offsetHeight;

        const modalBody = document.getElementById('mantenimientoModalBody');
        if (modalBody) modalBody.scrollTop = 0;
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el mantenimiento', 'error');
    }
};

window.eliminarMantenimiento = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar mantenimiento?',
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
                .from('mantenimientos')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Mantenimiento eliminado', 'success');
            await cargarVistaMantenimientos();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarMantenimiento = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando mantenimiento...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        const activoId = document.getElementById('mant_activo_id').value;
        const tipo = document.getElementById('mant_tipo').value;
        const resultado = document.getElementById('mant_resultado').value;

        if (!activoId || !tipo || !document.getElementById('mant_descripcion').value) {
            ocultarLoading();
            mostrarAlerta('Error', 'Complete los campos obligatorios', 'error');
            return;
        }

        const data = {
            activo_id: activoId,
            tipo: tipo,
            fecha_solicitud: document.getElementById('mant_fecha_solicitud').value || new Date().toISOString().split('T')[0],
            fecha_programada: document.getElementById('mant_fecha_programada').value || null,
            descripcion: document.getElementById('mant_descripcion').value,
            diagnostico: document.getElementById('mant_diagnostico').value || null,
            solucion_aplicada: document.getElementById('mant_solucion').value || null,
            tecnico_asignado: document.getElementById('mant_tecnico').value || null,
            resultado: resultado
        };

        const { data: activo, error: errorActivo } = await window.supabaseClient
            .from('activos')
            .select('estado')
            .eq('id', activoId)
            .single();

        if (errorActivo) throw errorActivo;

        const estadoAnterior = activo?.estado;
        let mantenimientoId;

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;

            const { error } = await window.supabaseClient
                .from('mantenimientos')
                .update(data)
                .eq('id', editandoId);

            if (error) throw error;
            mantenimientoId = editandoId;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;

            const { data: nuevoMantenimiento, error } = await window.supabaseClient
                .from('mantenimientos')
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            mantenimientoId = nuevoMantenimiento.id;
        }

        let nuevoEstado = estadoAnterior;

        if (tipo === 'CORRECTIVO' || tipo === 'PREVENTIVO' || tipo === 'PREDICTIVO') {
            if (resultado === 'PENDIENTE') nuevoEstado = 'MANTENIMIENTO';
        }

        if (resultado === 'EXITOSO') nuevoEstado = 'DISPONIBLE';

        if (resultado === 'NO_REPARADO') {
            const { value: estadoSeleccionado } = await Swal.fire({
                title: 'Estado del activo',
                text: 'El mantenimiento no fue reparado. ¿Qué estado desea asignar?',
                icon: 'question',
                input: 'select',
                inputOptions: {
                    'REPARACIÓN': '🔧 En reparación',
                    'MANTENIMIENTO': '🛠️ En mantenimiento',
                    'DISPONIBLE': '✅ Disponible',
                    'BAJA': '❌ Dar de baja'
                },
                confirmButtonColor: '#39080a'
            });

            if (estadoSeleccionado) nuevoEstado = estadoSeleccionado;
        }

        if (nuevoEstado !== estadoAnterior) {
            await window.supabaseClient
                .from('activos')
                .update({
                    estado: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', activoId);

            await registrarCambioEstado(activoId, nuevoEstado, {
                motivo: `Cambio por mantenimiento ${tipo.toLowerCase()}`,
                estadoAnterior: estadoAnterior,
                mantenimientoId: mantenimientoId
            });
        }

        ocultarLoading();

        await Swal.fire({
            title: '✅ Éxito',
            text: editandoId ? 'Mantenimiento actualizado' : 'Mantenimiento registrado',
            icon: 'success',
            confirmButtonColor: '#39080a',
            timer: 2000
        });

        cerrarModal('mantenimientoModal');

        if (vistaActual === 'mantenimientos') {
            await cargarVistaMantenimientos();
        } else {
            await cargarVistaActivos();
        }
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el mantenimiento: ' + error.message, 'error');
    }
};

// ==================== MODALES ====================
window.abrirModalNuevoMantenimiento = async function() {
    const modal = document.getElementById('mantenimientoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('mantenimientoModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    editandoId = null;
    const form = document.getElementById('mantenimientoForm');
    if (form) form.reset();

    const titleElement = document.getElementById('mantenimientoModalTitle');
    if (titleElement) titleElement.innerHTML = '<i class="fas fa-tools mr-2"></i>Nuevo Mantenimiento';

    const fechaInput = document.getElementById('mant_fecha_solicitud');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    const resultadoSelect = document.getElementById('mant_resultado');
    if (resultadoSelect) resultadoSelect.value = 'PENDIENTE';

    await cargarActivosSelect('mant_activo_id');

    await window.abrirModal('mantenimientoModal', () => {
        const modalBody = document.getElementById('mantenimientoModalBody');
        if (modalBody) modalBody.scrollTop = 0;
    });
};

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarMantenimientos = function(resultado) {
    const cards = document.querySelectorAll('#mantenimientos-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === resultado || (resultado === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        if (resultado === 'todos') { card.style.display = 'block'; contador++; }
        else if (card.dataset.resultado === resultado) { card.style.display = 'block'; contador++; }
        else card.style.display = 'none';
    });
};