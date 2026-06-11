// ==================== VISTA EMPLEADOS ====================
async function cargarVistaEmpleados() {
    mostrarLoading('Cargando empleados...');
    try {
        console.log('%c📋 CARGANDO EMPLEADOS', 'background: #28a745; color: white; font-size: 14px;');

        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select(`*, areas (nombre), empresa:empresa_id (id, nombre, ruc)`)
            .order('nombre_completo');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        empleados?.forEach(e => { if (e.creado_por) usuariosIds.add(e.creado_por); if (e.modificado_por) usuariosIds.add(e.modificado_por); });

        if (usuariosIds.size > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', Array.from(usuariosIds));

            if (usuarios?.length) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empData } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empMap = new Map(empData?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const emp = empMap.get(u.empleado_id);
                        usuariosConEmpleados.set(u.id, { nombre: emp?.nombre_completo || u.correo, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Empleados</h2>
                <button onclick="window.abrirModalNuevoEmpleado()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Empleado</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarEmpleados('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${empleados?.length || 0}</span></button>
                <button onclick="filtrarEmpleados('activos')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activos">Activos <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${empleados?.filter(e => e.activo).length || 0}</span></button>
                <button onclick="filtrarEmpleados('inactivos')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivos">Inactivos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${empleados?.filter(e => !e.activo).length || 0}</span></button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Tipo Documento:</span>
                <button onclick="filtrarEmpleadosPorTipoDocumento('TODOS')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-documento-btn" data-documento="TODOS">Todos</button>
                <button onclick="filtrarEmpleadosPorTipoDocumento('DNI')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-documento-btn" data-documento="DNI">DNI</button>
                <button onclick="filtrarEmpleadosPorTipoDocumento('RUC')" class="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 filter-documento-btn" data-documento="RUC">RUC</button>
                <button onclick="filtrarEmpleadosPorTipoDocumento('CARNET_EXTANJERIA')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-documento-btn" data-documento="CARNET_EXTANJERIA">Carnet Ext.</button>
                <button onclick="filtrarEmpleadosPorTipoDocumento('PASAPORTE')" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 filter-documento-btn" data-documento="PASAPORTE">Pasaporte</button>
            </div>
            <div class="cards-grid" id="empleados-grid">
        `;

        if (empleados?.length) {
            empleados.forEach(e => {
                const creadorInfo = usuariosConEmpleados.get(e.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(e.modificado_por);
                const edad = e.fecha_nacimiento ? calcularEdad(e.fecha_nacimiento) : 'N/A';
                const documentIcon = { 'DNI': 'fa-id-card', 'CARNET_EXTANJERIA': 'fa-passport', 'RUC': 'fa-building', 'PASAPORTE': 'fa-globe', 'OTRO': 'fa-file' }[e.tipo_documento] || 'fa-id-card';
                const tipoDocNombre = { 'DNI': 'DNI', 'CARNET_EXTANJERIA': 'Carnet Ext.', 'RUC': 'RUC', 'PASAPORTE': 'Pasaporte', 'OTRO': 'Documento' }[e.tipo_documento] || 'Documento';

                html += `
                    <div class="card-item" data-activo="${e.activo ? 'activo' : 'inactivo'}" data-tipo-documento="${e.tipo_documento || 'SIN_DOCUMENTO'}">
                        <div class="flex justify-between items-start mb-3">
                            <div><span class="font-bold text-primary text-lg">${e.nombre_completo}</span><p class="text-xs text-gray-500">${e.puesto || 'Sin puesto'}</p></div>
                            <span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${e.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        <div class="bg-blue-50 p-2 rounded-lg mb-2 border border-blue-100"><div class="flex items-center gap-2 text-sm"><i class="fas ${documentIcon} text-primary"></i><span class="font-medium">${tipoDocNombre}:</span><span class="font-mono font-bold bg-white px-2 py-0.5 rounded">${e.numero_documento || 'No registrado'}</span></div></div>
                        <div class="grid grid-cols-2 gap-2 text-sm mb-3"><div class="flex items-center gap-1"><i class="fas fa-envelope text-primary text-xs"></i><span class="truncate">${e.correo || 'Sin correo'}</span></div><div class="flex items-center gap-1"><i class="fas fa-phone text-primary text-xs"></i><span>${e.celular || 'Sin celular'} ${e.anexo ? '· Anexo ' + e.anexo : ''}</span></div><div class="flex items-center gap-1"><i class="fas fa-calendar text-primary text-xs"></i><span>Nac: ${e.fecha_nacimiento || 'No registrado'} (${edad})</span></div><div class="flex items-center gap-1"><i class="fas fa-building text-primary text-xs"></i><span>${e.areas?.nombre || 'Sin área'}</span></div></div>
                        <div class="space-y-1 text-sm bg-gray-50 p-2 rounded-lg mb-2"><p class="flex items-center gap-2"><i class="fas fa-map-marker-alt w-4 text-primary"></i> <span>${e.ubicacion_trabajo || 'Sin ubicación'}</span></p>${e.empresa ? `<p class="flex items-center gap-2"><i class="fas fa-building w-4 text-primary"></i> <span>Empresa: ${e.empresa.nombre} ${e.empresa.ruc ? `(${e.empresa.ruc})` : ''}</span></p>` : ''}</div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(e.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${e.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(e.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleEmpleado('${e.id}')" class="text-blue-600 hover:opacity-75" title="Ver detalles"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarEmpleado('${e.id}')" class="text-primary hover:opacity-75" title="Editar"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoEmpleado('${e.id}', ${e.activo})" class="${e.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75" title="${e.activo ? 'Desactivar' : 'Activar'}"><i class="fas ${e.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="eliminarEmpleado('${e.id}')" class="text-red-600 hover:opacity-75" title="Eliminar"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-users text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay empleados registrados</p><button onclick="window.abrirModalNuevoEmpleado()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nuevo Empleado</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
        document.querySelector('.filter-documento-btn[data-documento="TODOS"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar empleados');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD EMPLEADOS ====================
window.editarEmpleado = async function(id) {
    mostrarLoading('Cargando empleado...');
    try {
        const { data: empleado, error } = await window.supabaseClient
            .from('empleados')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;

        let modal = document.getElementById('empleadoModal');
        if (!modal) {
            mostrarAlerta('Error', 'Error al abrir el formulario', 'error');
            return;
        }

        const titleElement = document.getElementById('empleadoModalTitle');
        if (titleElement) titleElement.innerText = 'Editar Empleado';

        const areaSelect = document.getElementById('empleado_area_id');
        if (areaSelect) await cargarAreasSelect('empleado_area_id');

        const empresaSelect = document.getElementById('empleado_empresa_id');
        if (empresaSelect) await cargarEmpresasSelect('empleado_empresa_id');

        if (empleado.empresa_id) {
            await cargarUbicacionesPorEmpresa(empleado.empresa_id, 'empleado_ubicacion_id');
        } else {
            const ubicacionSelect = document.getElementById('empleado_ubicacion_id');
            if (ubicacionSelect) {
                ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
                ubicacionSelect.disabled = true;
            }
        }

        const nombreInput = document.getElementById('empleado_nombre');
        if (nombreInput) nombreInput.value = empleado.nombre_completo || '';

        const tipoDocumentoSelect = document.getElementById('empleado_tipo_documento');
        if (tipoDocumentoSelect) tipoDocumentoSelect.value = empleado.tipo_documento || '';

        const numeroDocumentoInput = document.getElementById('empleado_numero_documento');
        if (numeroDocumentoInput) numeroDocumentoInput.value = empleado.numero_documento || '';

        const correoInput = document.getElementById('empleado_correo');
        if (correoInput) correoInput.value = empleado.correo || '';

        const celularInput = document.getElementById('empleado_celular');
        if (celularInput) celularInput.value = empleado.celular || '';

        const anexoInput = document.getElementById('empleado_anexo');
        if (anexoInput) anexoInput.value = empleado.anexo || '';

        const fechaNacimientoInput = document.getElementById('empleado_fecha_nacimiento');
        if (fechaNacimientoInput) fechaNacimientoInput.value = empleado.fecha_nacimiento || '';

        const areaSelectElement = document.getElementById('empleado_area_id');
        if (areaSelectElement) areaSelectElement.value = empleado.area_id || '';

        const empresaSelectElement = document.getElementById('empleado_empresa_id');
        if (empresaSelectElement) empresaSelectElement.value = empleado.empresa_id || '';

        const puestoInput = document.getElementById('empleado_puesto');
        if (puestoInput) puestoInput.value = empleado.puesto || '';

        const activoSelect = document.getElementById('empleado_activo');
        if (activoSelect) activoSelect.value = empleado.activo ? 'true' : 'false';

        setTimeout(() => {
            const ubicacionSelect = document.getElementById('empleado_ubicacion_id');
            if (ubicacionSelect && empleado.ubicacion_id) ubicacionSelect.value = empleado.ubicacion_id;
        }, 500);

        if (empresaSelectElement) {
            empresaSelectElement.removeEventListener('change', window.handleEmpleadoEmpresaChange);
            empresaSelectElement.addEventListener('change', window.handleEmpleadoEmpresaChange);
        }

        ocultarLoading();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el empleado: ' + error.message, 'error');
    }
};

window.eliminarEmpleado = async function(id) {
    const { count } = await window.supabaseClient
        .from('asignaciones')
        .select('*', { count: 'exact', head: true })
        .eq('empleado_id', id)
        .eq('estado', 'ACTIVA');

    if (count > 0) {
        mostrarAlerta('Error', 'No se puede eliminar: el empleado tiene asignaciones activas', 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar empleado?',
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
                .from('empleados')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Empleado eliminado', 'success');
            await cargarVistaEmpleados();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el empleado', 'error');
        }
    }
};

window.guardarEmpleado = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando empleado...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const tipoDocumento = document.getElementById('empleado_tipo_documento')?.value;
        const numeroDocumento = document.getElementById('empleado_numero_documento')?.value?.trim();

        if (tipoDocumento && tipoDocumento !== '') {
            if (!numeroDocumento) {
                ocultarLoading();
                mostrarAlerta('Error', 'Si selecciona un tipo de documento, debe ingresar el número', 'error');
                document.getElementById('empleado_numero_documento').focus();
                return;
            }

            if (!validarFormatoDocumento(tipoDocumento, numeroDocumento)) {
                ocultarLoading();
                return;
            }

            const documentoExistente = await verificarDocumentoExistente(numeroDocumento, editandoId);
            if (documentoExistente) {
                ocultarLoading();
                mostrarAlerta('Error', `El documento ${numeroDocumento} ya está registrado para otro empleado`, 'error');
                document.getElementById('empleado_numero_documento').focus();
                return;
            }
        }

        const empleadoData = {
            nombre_completo: document.getElementById('empleado_nombre').value,
            tipo_documento: tipoDocumento || null,
            numero_documento: numeroDocumento || null,
            correo: document.getElementById('empleado_correo').value || null,
            celular: document.getElementById('empleado_celular').value || null,
            anexo: document.getElementById('empleado_anexo').value || null,
            fecha_nacimiento: document.getElementById('empleado_fecha_nacimiento').value || null,
            area_id: document.getElementById('empleado_area_id').value || null,
            empresa_id: document.getElementById('empleado_empresa_id').value || null,
            ubicacion_id: document.getElementById('empleado_ubicacion_id').value || null,
            puesto: document.getElementById('empleado_puesto').value || null,
            activo: document.getElementById('empleado_activo').value === 'true'
        };

        if (!empleadoData.nombre_completo) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre completo es obligatorio', 'error');
            return;
        }

        if (editandoId) {
            empleadoData.modificado_el = ahora;
            empleadoData.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('empleados')
                .update(empleadoData)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            empleadoData.creado_el = ahora;
            empleadoData.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('empleados')
                .insert(empleadoData);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Empleado guardado correctamente', 'success');
        cerrarModal('empleadoModal');
        await cargarVistaEmpleados();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el empleado: ' + error.message, 'error');
    }
};

window.toggleEstadoEmpleado = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count } = await window.supabaseClient
            .from('asignaciones')
            .select('*', { count: 'exact', head: true })
            .eq('empleado_id', id)
            .eq('estado', 'ACTIVA');

        if (count > 0) {
            Swal.fire({
                title: 'No se puede desactivar',
                html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i><p>El empleado tiene <strong>${count} asignación(es) activa(s)</strong>.</p><p class="text-sm text-gray-500 mt-2">Debe devolver todos los activos asignados antes de desactivar al empleado.</p></div>`,
                icon: 'error',
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Entendido'
            });
            return;
        }
    }

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} empleado?`,
        text: `Esta acción ${accion === 'desactivar' ? 'ocultará el empleado' : 'hará visible el empleado nuevamente'} en el sistema.`,
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
                .from('empleados')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Empleado ${accion}do correctamente`, 'success');
            await cargarVistaEmpleados();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== VISTA ÁREAS ====================
async function cargarVistaAreas() {
    mostrarLoading('Cargando áreas...');
    try {
        console.log('%c📋 CARGANDO ÁREAS', 'background: #fd7e14; color: white; font-size: 14px;');

        const { data: areas } = await window.supabaseClient.from('areas').select('*').order('nombre');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        areas?.forEach(a => { if (a.creado_por) usuariosIds.add(a.creado_por); if (a.modificado_por) usuariosIds.add(a.modificado_por); });

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

        const { data: empleados } = await window.supabaseClient.from('empleados').select('area_id').eq('activo', true);
        const empleadosPorArea = new Map();
        empleados?.forEach(e => empleadosPorArea.set(e.area_id, (empleadosPorArea.get(e.area_id) || 0) + 1));

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Áreas</h2>
                <button onclick="abrirModalArea()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Área</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarAreas('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${areas?.length || 0}</span></button>
                <button onclick="filtrarAreas('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${areas?.filter(a => a.activo).length || 0}</span></button>
                <button onclick="filtrarAreas('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${areas?.filter(a => !a.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="areas-grid">
        `;

        if (areas?.length) {
            areas.forEach(a => {
                const creadorInfo = usuariosConEmpleados.get(a.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(a.modificado_por);
                const totalEmpleados = empleadosPorArea.get(a.id) || 0;

                html += `
                    <div class="card-item" data-activo="${a.activo ? 'activa' : 'inactiva'}">
                        <div class="flex justify-between items-start mb-2"><div><span class="font-bold text-primary text-lg">${a.nombre}</span><span class="estado-badge ${a.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ml-2">${a.activo ? 'Activa' : 'Inactiva'}</span></div></div>
                        ${a.descripcion ? `<p class="text-sm text-gray-600 mb-2">${a.descripcion}</p>` : ''}
                        <div class="bg-gray-50 p-2 rounded-lg"><p class="flex items-center gap-2"><i class="fas fa-users text-primary w-4"></i><span class="font-medium">Empleados:</span> <span class="font-bold">${totalEmpleados}</span> ${totalEmpleados === 1 ? 'persona' : 'personas'}</p></div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(a.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${a.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(a.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleArea('${a.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarArea('${a.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoArea('${a.id}', ${a.activo})" class="${a.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${a.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="verEmpleadosPorArea('${a.id}')" class="text-purple-600 hover:opacity-75"><i class="fas fa-users text-lg"></i>${totalEmpleados > 0 ? `<span class="ml-1 text-xs font-bold">${totalEmpleados}</span>` : ''}</button>
                            <button onclick="eliminarArea('${a.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-building text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay áreas registradas</p><button onclick="abrirModalArea()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Área</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar áreas');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA EMPRESAS ====================
async function cargarVistaEmpresas() {
    mostrarLoading('Cargando empresas...');
    try {
        console.log('%c📋 CARGANDO EMPRESAS', 'background: #007bff; color: white; font-size: 14px;');

        const { data: empresas } = await window.supabaseClient.from('empresas').select('*').order('nombre');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        empresas?.forEach(e => { if (e.creado_por) usuariosIds.add(e.creado_por); if (e.modificado_por) usuariosIds.add(e.modificado_por); });

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

        const { data: empleados } = await window.supabaseClient.from('empleados').select('empresa_id').eq('activo', true);
        const { data: ubicaciones } = await window.supabaseClient.from('ubicaciones').select('empresa_id').eq('activo', true);
        const empleadosPorEmpresa = new Map();
        empleados?.forEach(e => empleadosPorEmpresa.set(e.empresa_id, (empleadosPorEmpresa.get(e.empresa_id) || 0) + 1));
        const ubicacionesPorEmpresa = new Map();
        ubicaciones?.forEach(u => ubicacionesPorEmpresa.set(u.empresa_id, (ubicacionesPorEmpresa.get(u.empresa_id) || 0) + 1));

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Empresas</h2>
                <button onclick="abrirModalNuevaEmpresa()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Empresa</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarEmpresas('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${empresas?.length || 0}</span></button>
                <button onclick="filtrarEmpresas('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${empresas?.filter(e => e.activo).length || 0}</span></button>
                <button onclick="filtrarEmpresas('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${empresas?.filter(e => !e.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="empresas-grid">
        `;

        if (empresas?.length) {
            empresas.forEach(e => {
                const creadorInfo = usuariosConEmpleados.get(e.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(e.modificado_por);
                const totalEmpleados = empleadosPorEmpresa.get(e.id) || 0;
                const totalUbicaciones = ubicacionesPorEmpresa.get(e.id) || 0;

                html += `
                    <div class="card-item" data-activo="${e.activo ? 'activa' : 'inactiva'}">
                        <div class="flex justify-between items-start mb-2"><div><span class="font-bold text-primary text-lg">${e.nombre}</span><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ml-2">${e.activo ? 'Activa' : 'Inactiva'}</span></div></div>
                        <p class="text-sm text-gray-600 mb-1"><i class="fas fa-id-card text-primary mr-1"></i> RUC: ${e.ruc || 'No especificado'}</p>
                        ${e.descripcion ? `<p class="text-sm text-gray-600 mb-2">${e.descripcion}</p>` : ''}
                        <div class="grid grid-cols-2 gap-2 mb-3"><div class="bg-blue-50 p-2 rounded-lg text-center"><span class="text-xl font-bold text-blue-600">${totalEmpleados}</span><p class="text-xs text-gray-600">Empleados</p></div><div class="bg-purple-50 p-2 rounded-lg text-center"><span class="text-xl font-bold text-purple-600">${totalUbicaciones}</span><p class="text-xs text-gray-600">Ubicaciones</p></div></div>
                        <div class="text-xs text-gray-400 mt-2 pt-2 border-t"><p><i class="fas fa-user-plus"></i> Creado: ${new Date(e.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></p>${e.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(e.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></p>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleEmpresa('${e.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarEmpresa('${e.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoEmpresa('${e.id}', ${e.activo})" class="${e.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${e.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="verEmpleadosPorEmpresa('${e.id}')" class="text-purple-600 hover:opacity-75"><i class="fas fa-users text-lg"></i>${totalEmpleados > 0 ? `<span class="ml-1 text-xs font-bold">${totalEmpleados}</span>` : ''}</button>
                            <button onclick="verUbicacionesPorEmpresa('${e.id}')" class="text-indigo-600 hover:opacity-75"><i class="fas fa-map-marker-alt text-lg"></i>${totalUbicaciones > 0 ? `<span class="ml-1 text-xs font-bold">${totalUbicaciones}</span>` : ''}</button>
                            <button onclick="eliminarEmpresa('${e.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-building text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay empresas registradas</p><button onclick="abrirModalNuevaEmpresa()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Empresa</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar empresas');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD ÁREAS ====================
window.editarArea = async function(id) {
    mostrarLoading('Cargando área...');
    try {
        const { data: area, error } = await window.supabaseClient
            .from('areas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('areaModalTitle').innerText = 'Editar Área';
        document.getElementById('area_nombre').value = area.nombre || '';
        document.getElementById('area_descripcion').value = area.descripcion || '';

        ocultarLoading();
        document.getElementById('areaModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el área', 'error');
    }
};

window.eliminarArea = async function(id) {
    const { count } = await window.supabaseClient
        .from('empleados')
        .select('*', { count: 'exact', head: true })
        .eq('area_id', id);

    if (count > 0) {
        mostrarAlerta('Error', 'No se puede eliminar: el área tiene empleados asociados', 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar área?',
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
                .from('areas')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Área eliminada', 'success');
            await cargarVistaAreas();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el área', 'error');
        }
    }
};

window.guardarArea = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando área...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const data = {
            nombre: document.getElementById('area_nombre').value,
            descripcion: document.getElementById('area_descripcion').value || null,
            activo: true
        };

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('areas')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('areas')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Área guardada correctamente', 'success');
        cerrarModal('areaModal');
        await cargarVistaAreas();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el área: ' + error.message, 'error');
    }
};

window.toggleEstadoArea = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count } = await window.supabaseClient
            .from('empleados')
            .select('*', { count: 'exact', head: true })
            .eq('area_id', id);

        if (count > 0) {
            const result = await Swal.fire({
                title: `¿Desactivar área?`,
                html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Esta área tiene <strong>${count} empleado(s)</strong> asociado(s).</p><p class="text-sm text-gray-500 mt-2">Si la desactivas, los empleados seguirán existiendo pero no podrás asignar nuevos a esta área.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`,
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
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} área?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta área.`,
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
                .from('areas')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Área ${accion}da correctamente`, 'success');
            await cargarVistaAreas();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== CRUD EMPRESAS ====================
window.editarEmpresa = async function(id) {
    mostrarLoading('Cargando empresa...');
    try {
        const { data: empresa, error } = await window.supabaseClient
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('empresaModalTitle').innerText = 'Editar Empresa';
        document.getElementById('empresa_nombre').value = empresa.nombre || '';
        document.getElementById('empresa_ruc').value = empresa.ruc || '';
        document.getElementById('empresa_descripcion').value = empresa.descripcion || '';
        document.getElementById('empresa_activo').value = empresa.activo ? 'true' : 'false';

        ocultarLoading();
        document.getElementById('empresaModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la empresa', 'error');
    }
};

window.eliminarEmpresa = async function(id) {
    const { count: empleados } = await window.supabaseClient
        .from('empleados')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', id);

    const { count: ubicaciones } = await window.supabaseClient
        .from('ubicaciones')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', id);

    if (empleados > 0 || ubicaciones > 0) {
        let mensaje = 'No se puede eliminar porque tiene:\n';
        if (empleados > 0) mensaje += `- ${empleados} empleado(s) asociado(s)\n`;
        if (ubicaciones > 0) mensaje += `- ${ubicaciones} ubicacione(s) asociada(s)\n`;
        mostrarAlerta('Error', mensaje, 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar empresa?',
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
                .from('empresas')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Empresa eliminada', 'success');
            await cargarVistaEmpresas();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la empresa', 'error');
        }
    }
};

window.guardarEmpresa = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando empresa...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const data = {
            nombre: document.getElementById('empresa_nombre').value,
            ruc: document.getElementById('empresa_ruc').value || null,
            descripcion: document.getElementById('empresa_descripcion').value || null,
            activo: document.getElementById('empresa_activo').value === 'true'
        };

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('empresas')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('empresas')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Empresa guardada correctamente', 'success');
        cerrarModal('empresaModal');
        await cargarVistaEmpresas();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la empresa: ' + error.message, 'error');
    }
};

window.toggleEstadoEmpresa = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count: empleados } = await window.supabaseClient
            .from('empleados')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id);

        const { count: ubicaciones } = await window.supabaseClient
            .from('ubicaciones')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id);

        if (empleados > 0 || ubicaciones > 0) {
            let mensaje = `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Esta empresa tiene:</p><ul class="text-left mt-2">`;
            if (empleados > 0) mensaje += `<li>• ${empleados} empleado(s) asociado(s)</li>`;
            if (ubicaciones > 0) mensaje += `<li>• ${ubicaciones} ubicación(es) asociada(s)</li>`;
            mensaje += `</ul><p class="text-sm text-gray-500 mt-2">Si la desactivas, los registros seguirán existiendo pero no podrás crear nuevos asociados.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`;

            const result = await Swal.fire({
                title: `¿Desactivar empresa?`,
                html: mensaje,
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
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} empresa?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta empresa.`,
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
                .from('empresas')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Empresa ${accion}da correctamente`, 'success');
            await cargarVistaEmpresas();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalNuevoEmpleado = async function() {
    const modal = document.getElementById('empleadoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('empleadoModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    editandoId = null;
    const form = document.getElementById('empleadoForm');
    if (form) form.reset();
    const titleElement = document.getElementById('empleadoModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Empleado';

    const activoSelect = document.getElementById('empleado_activo');
    if (activoSelect) activoSelect.value = 'true';

    const ubicacionSelect = document.getElementById('empleado_ubicacion_id');
    if (ubicacionSelect) {
        ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
        ubicacionSelect.disabled = true;
    }

    await Promise.all([
        cargarAreasSelect('empleado_area_id'),
        cargarEmpresasSelect('empleado_empresa_id')
    ]);

    const empresaSelect = document.getElementById('empleado_empresa_id');
    if (empresaSelect) {
        empresaSelect.removeEventListener('change', window.handleEmpleadoEmpresaChange);
        empresaSelect.addEventListener('change', window.handleEmpleadoEmpresaChange);
    }

    await window.abrirModal('empleadoModal');
};

window.abrirModalArea = async function() {
    const modal = document.getElementById('areaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('areaModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('areaForm');
    if (form) form.reset();
    const titleElement = document.getElementById('areaModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Área';

    const activoSelect = document.getElementById('area_activo');
    if (activoSelect) activoSelect.value = 'true';

    await window.abrirModal('areaModal');
};

window.abrirModalNuevaEmpresa = async function() {
    const modal = document.getElementById('empresaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('empresaModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('empresaForm');
    if (form) form.reset();
    const titleElement = document.getElementById('empresaModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Empresa';

    const activoSelect = document.getElementById('empresa_activo');
    if (activoSelect) activoSelect.value = 'true';

    await window.abrirModal('empresaModal');
};

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarEmpleados = function(filtro) {
    const cards = document.querySelectorAll('#empleados-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === filtro || (filtro === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        if (filtro === 'activos') mostrar = card.dataset.activo === 'activo';
        else if (filtro === 'inactivos') mostrar = card.dataset.activo === 'inactivo';
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

window.filtrarEmpleadosPorTipoDocumento = function(tipoDocumento) {
    const cards = document.querySelectorAll('#empleados-grid .card-item');
    const botones = document.querySelectorAll('.filter-documento-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.documento === tipoDocumento || (tipoDocumento === 'TODOS' && btn.dataset.documento === 'TODOS')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    const filtroEstado = document.querySelector('.filter-btn.ring-2')?.dataset.filter || 'todos';
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        if (tipoDocumento !== 'TODOS' && card.dataset.tipoDocumento !== tipoDocumento) mostrar = false;
        if (mostrar && filtroEstado !== 'todos') {
            const activo = card.dataset.activo === 'activo';
            if (filtroEstado === 'activos' && !activo) mostrar = false;
            if (filtroEstado === 'inactivos' && activo) mostrar = false;
        }
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

window.filtrarAreas = function(filtro) {
    const cards = document.querySelectorAll('#areas-grid .card-item');
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

window.filtrarEmpresas = function(filtro) {
    const cards = document.querySelectorAll('#empresas-grid .card-item');
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

window.limpiarFiltrosEmpleados = function() {
    const botonesEstado = document.querySelectorAll('.filter-btn');
    botonesEstado.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === 'todos') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    const botonesDocumento = document.querySelectorAll('.filter-documento-btn');
    botonesDocumento.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.documento === 'TODOS') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    const cards = document.querySelectorAll('#empleados-grid .card-item');
    cards.forEach(card => card.style.display = 'block');
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleEmpleado = async function(id) {
    mostrarLoading('Cargando detalles del empleado...');
    try {
        const { data: empleado, error } = await window.supabaseClient
            .from('empleados')
            .select(`*, areas (id, nombre), empresa:empresa_id (id, nombre, ruc)`)
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(empleado.creado_por);
        const modificadorInfo = empleado.modificado_por ? await obtenerInfoUsuarioConEmpleado(empleado.modificado_por) : null;
        const edad = empleado.fecha_nacimiento ? calcularEdad(empleado.fecha_nacimiento) : 'No registrada';
        const tipoDocumentoMap = { 'DNI': 'Documento Nacional de Identidad', 'CARNET_EXTANJERIA': 'Carnet de Extranjería', 'RUC': 'Registro Único de Contribuyentes', 'PASAPORTE': 'Pasaporte', 'OTRO': 'Otro' };

        ocultarLoading();
        Swal.fire({
            title: 'Detalles del Empleado',
            width: '800px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-user-circle"></i> Información Personal</h3><div class="grid grid-cols-2 gap-3 text-sm"><div class="col-span-2"><span class="font-semibold">Nombre:</span> <span class="text-lg text-primary">${empleado.nombre_completo}</span></div><div class="col-span-2 bg-blue-50 p-2 rounded-lg"><p><span class="font-semibold">Tipo de Documento:</span> ${tipoDocumentoMap[empleado.tipo_documento] || 'No especificado'}</p><p><span class="font-semibold">Número de Documento:</span> <span class="font-mono font-bold">${empleado.numero_documento || 'No registrado'}</span></p></div><div><span class="font-semibold">Edad:</span> ${edad}</div><div><span class="font-semibold">Fecha Nacimiento:</span> ${empleado.fecha_nacimiento ? new Date(empleado.fecha_nacimiento).toLocaleDateString() : 'No registrada'}</div><div><span class="font-semibold">Correo:</span> ${empleado.correo || 'No registrado'}</div><div><span class="font-semibold">Celular:</span> ${empleado.celular || 'No registrado'} ${empleado.anexo ? '· Anexo: ' + empleado.anexo : ''}</div></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-briefcase"></i> Información Laboral</h3><div class="grid grid-cols-2 gap-3 text-sm"><div><span class="font-semibold">Área:</span> ${empleado.areas?.nombre || 'No especificada'}</div><div><span class="font-semibold">Puesto:</span> ${empleado.puesto || 'No especificado'}</div><div><span class="font-semibold">Empresa:</span> ${empleado.empresa?.nombre || 'No especificada'}</div><div><span class="font-semibold">Ubicación:</span> ${empleado.ubicacion_trabajo || 'No especificada'}</div><div><span class="font-semibold">Estado:</span> <span class="${empleado.activo ? 'text-green-600' : 'text-red-600'}">${empleado.activo ? 'Activo' : 'Inactivo'}</span></div></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${empleado.creado_el ? new Date(empleado.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${empleado.modificado_el ? new Date(empleado.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

window.verDetalleArea = async function(id) {
    mostrarLoading('Cargando detalles del área...');
    try {
        const { data: area, error } = await window.supabaseClient
            .from('areas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(area.creado_por);
        const modificadorInfo = area.modificado_por ? await obtenerInfoUsuarioConEmpleado(area.modificado_por) : null;

        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto, activo')
            .eq('area_id', id)
            .order('nombre_completo')
            .limit(10);

        let empleadosHtml = empleados?.length ? empleados.map(e => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${e.nombre_completo}</span><span class="text-xs text-gray-500 ml-2">${e.puesto || 'Sin puesto'}</span></div><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${e.activo ? 'Activo' : 'Inactivo'}</span></div>`).join('') : '<p class="text-gray-500 text-center py-2">No hay empleados en esta área</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles del Área: ${area.nombre}`,
            width: '600px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-building"></i> Información General</h3><div class="space-y-2"><p><span class="font-semibold">Nombre:</span> ${area.nombre}</p><p><span class="font-semibold">Descripción:</span> ${area.descripcion || 'Sin descripción'}</p><p><span class="font-semibold">Estado:</span> <span class="${area.activo ? 'text-green-600' : 'text-red-600'}">${area.activo ? 'Activa' : 'Inactiva'}</span></p></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-users"></i> Empleados del Área (${empleados?.length || 0})</h3><div class="max-h-40 overflow-y-auto">${empleadosHtml}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${area.creado_el ? new Date(area.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${area.modificado_el ? new Date(area.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

window.verDetalleEmpresa = async function(id) {
    mostrarLoading('Cargando detalles de la empresa...');
    try {
        const { data: empresa, error } = await window.supabaseClient
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(empresa.creado_por);
        const modificadorInfo = empresa.modificado_por ? await obtenerInfoUsuarioConEmpleado(empresa.modificado_por) : null;

        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto, activo')
            .eq('empresa_id', id)
            .order('nombre_completo')
            .limit(5);

        const { data: ubicaciones } = await window.supabaseClient
            .from('ubicaciones')
            .select('id, nombre, descripcion, activo')
            .eq('empresa_id', id)
            .order('nombre')
            .limit(5);

        let empleadosHtml = empleados?.length ? empleados.map(e => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><span class="font-medium">${e.nombre_completo}</span><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${e.activo ? 'Activo' : 'Inactivo'}</span></div>`).join('') : '<p class="text-gray-400 italic">No hay empleados</p>';
        let ubicacionesHtml = ubicaciones?.length ? ubicaciones.map(u => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${u.nombre}</span>${u.descripcion ? `<span class="text-xs text-gray-500 ml-1">(${u.descripcion})</span>` : ''}</div><span class="estado-badge ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${u.activo ? 'Activa' : 'Inactiva'}</span></div>`).join('') : '<p class="text-gray-400 italic">No hay ubicaciones</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles de Empresa`,
            width: '700px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-2">${empresa.nombre}</h3><p><span class="font-semibold">RUC:</span> ${empresa.ruc || 'No especificado'}</p><p><span class="font-semibold">Descripción:</span> ${empresa.descripcion || 'Sin descripción'}</p><p><span class="font-semibold">Estado:</span> <span class="${empresa.activo ? 'text-green-600' : 'text-red-600'}">${empresa.activo ? 'Activa' : 'Inactiva'}</span></p></div><div class="grid grid-cols-2 gap-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-2">Empleados</h3><div class="max-h-40 overflow-y-auto">${empleadosHtml}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-2">Ubicaciones</h3><div class="max-h-40 overflow-y-auto">${ubicacionesHtml}</div></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500"><h3 class="font-bold text-purple-700 mb-2">Auditoría</h3><p><span class="font-semibold">Creado:</span> ${new Date(empresa.creado_el).toLocaleString()} por ${creadorInfo.nombre}</p>${modificadorInfo ? `<p><span class="font-semibold">Modificado:</span> ${new Date(empresa.modificado_el).toLocaleString()} por ${modificadorInfo.nombre}</p>` : ''}</div></div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles', 'error');
    }
};

window.verEmpleadosPorArea = async function(id) {
    mostrarLoading('Cargando empleados...');
    try {
        const { data: area } = await window.supabaseClient
            .from('areas')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto, activo')
            .eq('area_id', id)
            .order('nombre_completo');

        ocultarLoading();

        let empleadosHtml = empleados?.length ? empleados.map(e => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${e.nombre_completo}</p><p class="text-xs text-gray-500">${e.puesto || 'Sin puesto'}</p></div><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${e.activo ? 'Activo' : 'Inactivo'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay empleados en esta área</p>';

        Swal.fire({
            title: `Empleados del Área: ${area?.nombre || 'Área'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${empleadosHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '500px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los empleados', 'error');
    }
};

window.verEmpleadosPorEmpresa = async function(id) {
    mostrarLoading('Cargando empleados...');
    try {
        const { data: empresa } = await window.supabaseClient
            .from('empresas')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto, activo')
            .eq('empresa_id', id)
            .order('nombre_completo');

        ocultarLoading();

        let empleadosHtml = empleados?.length ? empleados.map(e => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${e.nombre_completo}</p><p class="text-xs text-gray-500">${e.puesto || 'Sin puesto'}</p></div><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${e.activo ? 'Activo' : 'Inactivo'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay empleados en esta empresa</p>';

        Swal.fire({
            title: `Empleados de ${empresa?.nombre || 'Empresa'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${empleadosHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '500px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los empleados', 'error');
    }
};

window.verUbicacionesPorEmpresa = async function(id) {
    mostrarLoading('Cargando ubicaciones...');
    try {
        const { data: empresa } = await window.supabaseClient
            .from('empresas')
            .select('nombre')
            .eq('id', id)
            .single();

        const { data: ubicaciones } = await window.supabaseClient
            .from('ubicaciones')
            .select('id, nombre, descripcion, activo')
            .eq('empresa_id', id)
            .order('nombre');

        ocultarLoading();

        let ubicacionesHtml = ubicaciones?.length ? ubicaciones.map(u => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${u.nombre}</p><p class="text-xs text-gray-500">${u.descripcion || 'Sin descripción'}</p></div><span class="estado-badge ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${u.activo ? 'Activa' : 'Inactiva'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay ubicaciones en esta empresa</p>';

        Swal.fire({
            title: `Ubicaciones de ${empresa?.nombre || 'Empresa'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${ubicacionesHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '500px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las ubicaciones', 'error');
    }
};

// ==================== FUNCIONES AUXILIARES ====================
async function cargarAreasSelect(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        const { data, error } = await window.supabaseClient
            .from('areas')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar área</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay áreas activas registradas</option>';
            return;
        }

        data.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            let texto = area.nombre;
            if (area.descripcion) texto += ` - ${area.descripcion.substring(0, 40)}${area.descripcion.length > 40 ? '...' : ''}`;
            option.textContent = texto;
            option.dataset.nombre = area.nombre;
            option.dataset.descripcion = area.descripcion || '';
            select.appendChild(option);
        });
    } catch (error) {
        console.error(`❌ Error cargando áreas en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar áreas</option>';
        mostrarAlerta('Error', 'No se pudieron cargar las áreas', 'error');
    }
}

async function cargarEmpleadosSelect(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        let query = window.supabaseClient
            .from('empleados')
            .select(`id, nombre_completo, correo, celular, puesto, activo, areas (id, nombre), empresa:empresa_id (id, nombre, ruc)`)
            .eq('activo', true)
            .order('nombre_completo');

        if (usuarioActual && usuarioActual.permisos && usuarioActual.permisos.rol === 'OPERADOR_EMPRESA') {
            const empresaId = usuarioActual.permisos.empresaId;
            if (empresaId) query = query.eq('empresa_id', empresaId);
        }

        const { data, error } = await query;
        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar empleado</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay empleados activos registrados</option>';
            return;
        }

        const empleadosPorArea = new Map();
        data.forEach(empleado => {
            const areaNombre = empleado.areas?.nombre || 'Sin área';
            if (!empleadosPorArea.has(areaNombre)) empleadosPorArea.set(areaNombre, []);
            empleadosPorArea.get(areaNombre).push(empleado);
        });

        const areasOrdenadas = Array.from(empleadosPorArea.keys()).sort();
        areasOrdenadas.forEach(area => {
            const empleadosDelArea = empleadosPorArea.get(area);
            if (empleadosDelArea && empleadosDelArea.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `🏢 ${area} (${empleadosDelArea.length})`;
                empleadosDelArea.forEach(empleado => {
                    const option = document.createElement('option');
                    option.value = empleado.id;
                    let texto = empleado.nombre_completo;
                    if (empleado.puesto) texto += ` - ${empleado.puesto}`;
                    if (empleado.correo) texto += ` (${empleado.correo})`;
                    option.textContent = texto;
                    option.dataset.nombre = empleado.nombre_completo;
                    option.dataset.correo = empleado.correo || '';
                    option.dataset.celular = empleado.celular || '';
                    option.dataset.puesto = empleado.puesto || '';
                    option.dataset.area = empleado.areas?.nombre || '';
                    option.dataset.empresa = empleado.empresa?.nombre || '';
                    option.dataset.empresaId = empleado.empresa_id || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error(`❌ Error cargando empleados en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar empleados</option>';
        mostrarAlerta('Error', 'No se pudieron cargar los empleados', 'error');
    }
}

window.handleEmpleadoEmpresaChange = async function(event) {
    const empresaId = event.target.value;
    const ubicacionSelect = document.getElementById('empleado_ubicacion_id');
    
    if (!ubicacionSelect) return;

    if (!empresaId) {
        ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
        ubicacionSelect.disabled = true;
        return;
    }

    ubicacionSelect.innerHTML = '<option value="">Cargando ubicaciones...</option>';
    ubicacionSelect.disabled = true;

    try {
        await window.cargarUbicacionesPorEmpresa(empresaId, 'empleado_ubicacion_id');
    } catch (error) {
        console.error('❌ Error:', error);
        ubicacionSelect.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
    } finally {
        ubicacionSelect.disabled = false;
    }
};

// ==================== FUNCIONES DE VALIDACIÓN ====================
function validarFormatoDocumento(tipoDocumento, numeroDocumento) {
    if (!numeroDocumento) return true;

    switch (tipoDocumento) {
        case 'DNI':
            if (!/^\d{8}$/.test(numeroDocumento)) {
                mostrarAlerta('Error', 'El DNI debe tener 8 dígitos numéricos', 'error');
                return false;
            }
            break;
        case 'RUC':
            if (!/^\d{11}$/.test(numeroDocumento)) {
                mostrarAlerta('Error', 'El RUC debe tener 11 dígitos numéricos', 'error');
                return false;
            }
            break;
        case 'CARNET_EXTANJERIA':
            if (!/^[A-Z0-9]{8,12}$/i.test(numeroDocumento)) {
                mostrarAlerta('Error', 'El Carnet de Extranjería debe tener entre 8 y 12 caracteres alfanuméricos', 'error');
                return false;
            }
            break;
        case 'PASAPORTE':
            if (numeroDocumento.length < 6 || numeroDocumento.length > 12) {
                mostrarAlerta('Error', 'El Pasaporte debe tener entre 6 y 12 caracteres', 'error');
                return false;
            }
            break;
    }
    return true;
}

async function verificarDocumentoExistente(numeroDocumento, empleadoIdExcluir = null) {
    if (!numeroDocumento) return false;

    try {
        let query = window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo')
            .eq('numero_documento', numeroDocumento);

        if (empleadoIdExcluir) {
            query = query.neq('id', empleadoIdExcluir);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        return !!data;
    } catch (error) {
        console.error('Error verificando documento:', error);
        return false;
    }
}