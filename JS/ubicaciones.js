// ==================== VISTA UBICACIONES ====================
async function cargarVistaUbicaciones() {
    mostrarLoading('Cargando ubicaciones...');

    try {
        console.log('%c📋 CARGANDO UBICACIONES', 'background: #28a745; color: white; font-size: 14px;');

        const { data: empresas, error: errorEmpresas } = await window.supabaseClient
            .from('empresas')
            .select('id, nombre, ruc')
            .eq('activo', true)
            .order('nombre');

        if (errorEmpresas) throw errorEmpresas;

        let query = window.supabaseClient
            .from('ubicaciones')
            .select(`
                *,
                empresa:empresa_id (id, nombre, ruc),
                padre:ubicacion_padre_id (id, nombre, tipo),
                creador:creado_por (id, correo),
                modificador:modificado_por (id, correo)
            `)
            .order('tipo')
            .order('nombre');

        const { data: ubicaciones, error } = await query;
        if (error) throw error;

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        ubicaciones?.forEach(u => {
            if (u.creado_por) usuariosIds.add(u.creado_por);
            if (u.modificado_por) usuariosIds.add(u.modificado_por);
        });

        if (usuariosIds.size > 0) {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .in('id', Array.from(usuariosIds));

            if (usuarios && usuarios.length > 0) {
                const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
                if (empleadosIds.length > 0) {
                    const { data: empleados } = await window.supabaseClient
                        .from('empleados')
                        .select('id, nombre_completo')
                        .in('id', empleadosIds);
                    const empleadosMap = new Map(empleados?.map(e => [e.id, e]));
                    usuarios.forEach(u => {
                        const empleado = empleadosMap.get(u.empleado_id);
                        const nombre = empleado?.nombre_completo || u.correo;
                        usuariosConEmpleados.set(u.id, { nombre, correo: u.correo });
                    });
                } else {
                    usuarios.forEach(u => usuariosConEmpleados.set(u.id, { nombre: u.correo, correo: u.correo }));
                }
            }
        }

        ocultarLoading();

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">
                    <i class="fas fa-map-marker-alt mr-2"></i>Ubicaciones
                </h2>
                <button onclick="abrirModalNuevaUbicacion()" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i>Nueva Ubicación
                </button>
            </div>

            <!-- FILTRO POR EMPRESA -->
            <div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                <div class="flex flex-wrap items-center gap-4">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-building text-primary"></i>
                        <span class="text-sm font-medium text-gray-700">Filtrar por empresa:</span>
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <select id="filtroEmpresaUbicaciones" 
                                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 focus:bg-white"
                                onchange="filtrarUbicacionesPorEmpresa()">
                            <option value="TODAS">📋 Todas las empresas</option>
                            ${empresas?.map(e => `<option value="${e.id}">🏢 ${e.nombre} ${e.ruc ? `(${e.ruc})` : ''}</option>`).join('') || ''}
                        </select>
                    </div>
                    <button onclick="limpiarFiltroEmpresaUbicaciones()" 
                            class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1">
                        <i class="fas fa-undo-alt"></i> Limpiar filtro
                    </button>
                    <div class="text-sm text-gray-500 ml-auto">
                        <span id="contadorUbicacionesFiltradas">${ubicaciones?.length || 0}</span> 
                        <span>de ${ubicaciones?.length || 0} ubicaciones</span>
                    </div>
                </div>
            </div>

            <!-- FILTROS RÁPIDOS POR TIPO -->
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por tipo:</span>
                <button onclick="filtrarUbicacionesPorTipo('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-tipo-btn" data-tipo="todos">Todos</button>
                <button onclick="filtrarUbicacionesPorTipo('PLANTA')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-tipo-btn" data-tipo="PLANTA">Plantas</button>
                <button onclick="filtrarUbicacionesPorTipo('EDIFICIO')" class="px-3 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 filter-tipo-btn" data-tipo="EDIFICIO">Edificios</button>
                <button onclick="filtrarUbicacionesPorTipo('PISO')" class="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 filter-tipo-btn" data-tipo="PISO">Pisos</button>
                <button onclick="filtrarUbicacionesPorTipo('OFICINA')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-tipo-btn" data-tipo="OFICINA">Oficinas</button>
                <button onclick="filtrarUbicacionesPorTipo('GARITA')" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 filter-tipo-btn" data-tipo="GARITA">Garitas</button>
                <button onclick="filtrarUbicacionesPorTipo('CANTERA')" class="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 filter-tipo-btn" data-tipo="CANTERA">Canteras</button>
                <button onclick="filtrarUbicacionesPorTipo('CAMPO')" class="px-3 py-1 text-sm bg-lime-100 text-lime-800 rounded-full hover:bg-lime-200 filter-tipo-btn" data-tipo="CAMPO">Campos</button>
                <button onclick="filtrarUbicacionesPorTipo('ALMACEN')" class="px-3 py-1 text-sm bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 filter-tipo-btn" data-tipo="ALMACEN">Almacenes</button>
                <button onclick="filtrarUbicacionesPorTipo('FUNDO')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-tipo-btn" data-tipo="FUNDO">Fundos</button>            
                <button onclick="filtrarUbicacionesPorTipo('OTRO')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-tipo-btn" data-tipo="OTRO">Otros</button>                
                </div>

            <!-- FILTROS POR ESTADO -->
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Estado:</span>
                <button onclick="filtrarUbicacionesPorEstado('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-estado-btn" data-estado="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs" id="filter-total-ubicaciones">${ubicaciones?.length || 0}</span></button>
                <button onclick="filtrarUbicacionesPorEstado('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-estado-btn" data-estado="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs" id="filter-activas-ubicaciones">${ubicaciones?.filter(u => u.activo).length || 0}</span></button>
                <button onclick="filtrarUbicacionesPorEstado('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-estado-btn" data-estado="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs" id="filter-inactivas-ubicaciones">${ubicaciones?.filter(u => !u.activo).length || 0}</span></button>
            </div>

            <!-- Búsqueda rápida -->
            <div class="mb-4">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" id="busquedaUbicaciones" placeholder="Buscar ubicación por nombre..." 
                        class="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50 focus:bg-white"
                        onkeyup="filtrarUbicacionesPorBusqueda()">
                </div>
            </div>

            <div class="cards-grid" id="ubicaciones-grid">
        `;

        if (ubicaciones?.length) {
            const tipoIconos = {
                'SEDE': '🏛️',
                'FUNDO': '🌾',  
                'PLANTA': '🏭',
                'EDIFICIO': '🏢',
                'PISO': '📌',
                'OFICINA': '🏢',
                'GARITA': '🚪',
                'CANTERA': '⛏️',
                'CAMPO': '🌾',
                'ALMACEN': '📦',
                'BODEGA': '📦',
                'OTRO': '📍'
            };

            ubicaciones.forEach(u => {
                const icono = tipoIconos[u.tipo] || '📍';
                const creadorInfo = usuariosConEmpleados.get(u.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(u.modificado_por);
                const creadorNombre = creadorInfo?.nombre || 'Sistema';
                const modificadorNombre = modificadorInfo?.nombre || 'Sistema';

                let rutaJerarquica = '';
                if (u.padre) {
                    rutaJerarquica = `<span class="text-xs text-gray-400 ml-1">(${u.padre.tipo}: ${u.padre.nombre})</span>`;
                }

                html += `
                    <div class="card-item ubicacion-card" 
                        data-id="${u.id}"
                        data-tipo="${u.tipo || ''}" 
                        data-activo="${u.activo}"
                        data-padre="${u.ubicacion_padre_id || ''}"
                        data-empresa="${u.empresa_id || ''}"
                        data-empresa-nombre="${u.empresa?.nombre || 'Sin empresa'}"
                        data-nombre="${u.nombre?.toLowerCase() || ''}">

                        <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="font-bold text-primary text-lg">
                                            ${icono} ${u.nombre}
                                        </span>
                                        ${rutaJerarquica}
                                    </div>
                                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                                        ${u.empresa ? `
                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                <i class="fas fa-building text-xs"></i>
                                                ${u.empresa.nombre}
                                                ${u.empresa.ruc ? `(${u.empresa.ruc})` : ''}
                                            </span>
                                        ` : `
                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                                                <i class="fas fa-building text-xs"></i>
                                                Sin empresa
                                            </span>
                                        `}
                                        <span class="text-xs px-2 py-0.5 rounded-full bg-primary bg-opacity-10 text-secondary font-medium">
                                            ${u.tipo || 'SIN TIPO'}
                                        </span>
                                        <span class="estado-badge ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${u.activo ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${u.descripcion ? `
                            <div class="px-4 pt-3">
                                <p class="text-sm text-gray-600">${u.descripcion}</p>
                            </div>
                        ` : ''}

                        <div class="px-4 pt-2">
                            <div class="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                <i class="fas fa-sitemap text-primary mr-1"></i>
                                <span class="font-medium">Jerarquía:</span>
                                <span class="ml-1">
                                    ${u.padre ? `${u.padre.tipo}: ${u.padre.nombre} → ` : ''}${u.tipo}: ${u.nombre}
                                </span>
                            </div>
                        </div>

                        <div class="px-4 pt-2 pb-2">
                            <div class="text-xs text-gray-400 border-t pt-2">
                                <p><i class="fas fa-user-plus"></i> Creado: ${new Date(u.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorNombre}</span></p>
                                ${u.modificado_el ? `<p><i class="fas fa-user-edit"></i> Modificado: ${new Date(u.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorNombre}</span></p>` : ''}
                            </div>
                        </div>

                        <div class="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2 justify-end">
                            <button onclick="verDetalleUbicacion('${u.id}')" class="text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition-colors" title="Ver detalles"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarUbicacion('${u.id}')" class="text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition-colors" title="Editar"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoUbicacion('${u.id}', ${u.activo})" class="${u.activo ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'} hover:text-white p-2 rounded-lg transition-colors" title="${u.activo ? 'Desactivar' : 'Activar'}"><i class="fas ${u.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="verHijosUbicacion('${u.id}')" class="text-purple-600 hover:bg-purple-600 hover:text-white p-2 rounded-lg transition-colors" title="Ver ubicaciones hijas"><i class="fas fa-sitemap text-lg"></i></button>
                            <button onclick="eliminarUbicacion('${u.id}')" class="text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors" title="Eliminar"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="col-span-full text-center py-12 bg-white rounded-lg">
                    <i class="fas fa-map-marker-alt text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">No hay ubicaciones registradas</p>
                    <p class="text-gray-400 text-sm mt-2">Comienza agregando una nueva ubicación</p>
                    <button onclick="abrirModalNuevaUbicacion()" class="btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Nueva Ubicación
                    </button>
                </div>
            `;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;

        document.querySelector('.filter-tipo-btn[data-tipo="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
        document.querySelector('.filter-estado-btn[data-estado="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error cargando ubicaciones:', error);
        mostrarError('Error al cargar ubicaciones: ' + error.message);
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD UBICACIONES ====================
window.editarUbicacion = async function(id) {
    mostrarLoading('Cargando ubicación...');
    try {
        const { data: ubicacion, error } = await window.supabaseClient
            .from('ubicaciones')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const modal = document.getElementById('ubicacionModal');
        if (!modal) {
            ocultarLoading();
            mostrarAlerta('Error', 'Error al abrir el formulario', 'error');
            return;
        }

        if (!modal.classList.contains('hidden')) {
            window.cerrarModal('ubicacionModal');
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        editandoId = id;
        const titleElement = document.getElementById('ubicacionModalTitle');
        if (titleElement) titleElement.innerText = 'Editar Ubicación';

        const empresaSelect = document.getElementById('ubicacion_empresa_id');
        if (empresaSelect) {
            await cargarEmpresasSelect('ubicacion_empresa_id');
            empresaSelect.value = ubicacion.empresa_id || '';
        }

        await cargarUbicacionesPadreSelectEdicion(ubicacion);

        const nombreInput = document.getElementById('ubicacion_nombre');
        if (nombreInput) {
            // Mostrar el nombre tal como está en la base de datos (ya debería estar en mayúsculas)
            nombreInput.value = ubicacion.nombre || '';
            nombreInput.dataset.editadoManualmente = 'true';
        }

        const tipoSelect = document.getElementById('ubicacion_tipo');
        if (tipoSelect) tipoSelect.value = ubicacion.tipo || '';

        const descripcionTextarea = document.getElementById('ubicacion_descripcion');
        if (descripcionTextarea) descripcionTextarea.value = ubicacion.descripcion || '';

        const padreSelect = document.getElementById('ubicacion_padre_id');
        if (padreSelect && ubicacion.ubicacion_padre_id) padreSelect.value = ubicacion.ubicacion_padre_id;

        const activoSelect = document.getElementById('ubicacion_activo');
        if (activoSelect) activoSelect.value = ubicacion.activo ? 'true' : 'false';

        configurarAutocompletadoNombre();

        ocultarLoading();

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.offsetHeight;
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la ubicación: ' + error.message, 'error');
    }
};

window.eliminarUbicacion = async function(id) {
    const { count: activos } = await window.supabaseClient
        .from('activos')
        .select('*', { count: 'exact', head: true })
        .eq('ubicacion_id', id);

    const { count: empleados } = await window.supabaseClient
        .from('empleados')
        .select('*', { count: 'exact', head: true })
        .eq('ubicacion_id', id);

    const { count: hijos } = await window.supabaseClient
        .from('ubicaciones')
        .select('*', { count: 'exact', head: true })
        .eq('ubicacion_padre_id', id);

    if (activos > 0 || empleados > 0 || hijos > 0) {
        let mensaje = 'No se puede eliminar porque tiene:\n';
        if (activos > 0) mensaje += `- ${activos} activo(s) asociado(s)\n`;
        if (empleados > 0) mensaje += `- ${empleados} empleado(s) asociado(s)\n`;
        if (hijos > 0) mensaje += `- ${hijos} ubicación(es) hija(s)\n`;
        mostrarAlerta('Error', mensaje, 'error');
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar ubicación?',
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
                .from('ubicaciones')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Ubicación eliminada', 'success');
            await cargarVistaUbicaciones();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la ubicación', 'error');
        }
    }
};

window.guardarUbicacion = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando ubicación...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        
        // Obtener el nombre y convertirlo a mayúsculas
        let nombreUbicacion = document.getElementById('ubicacion_nombre').value;
        nombreUbicacion = nombreUbicacion ? nombreUbicacion.toUpperCase().trim() : '';
        
        const data = {
            nombre: nombreUbicacion,
            tipo: document.getElementById('ubicacion_tipo').value,
            descripcion: document.getElementById('ubicacion_descripcion').value || null,
            empresa_id: document.getElementById('ubicacion_empresa_id').value || null,
            ubicacion_padre_id: document.getElementById('ubicacion_padre_id').value || null,
            activo: document.getElementById('ubicacion_activo').value === 'true'
        };

        if (!data.tipo) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un tipo de ubicación', 'error');
            return;
        }
        
        if (!nombreUbicacion) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre de la ubicación es obligatorio', 'error');
            return;
        }

        if (editandoId && data.ubicacion_padre_id === editandoId) {
            ocultarLoading();
            mostrarAlerta('Error', 'Una ubicación no puede ser padre de sí misma', 'error');
            return;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('ubicaciones')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('ubicaciones')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Ubicación guardada correctamente', 'success');
        cerrarModal('ubicacionModal');
        await cargarVistaUbicaciones();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la ubicación: ' + error.message, 'error');
    }
};

window.toggleEstadoUbicacion = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count: activos } = await window.supabaseClient
            .from('activos')
            .select('*', { count: 'exact', head: true })
            .eq('ubicacion_id', id);

        const { count: empleados } = await window.supabaseClient
            .from('empleados')
            .select('*', { count: 'exact', head: true })
            .eq('ubicacion_id', id);

        const { count: hijos } = await window.supabaseClient
            .from('ubicaciones')
            .select('*', { count: 'exact', head: true })
            .eq('ubicacion_padre_id', id);

        if (activos > 0 || empleados > 0 || hijos > 0) {
            let mensaje = `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Esta ubicación tiene:</p><ul class="text-left mt-2">`;
            if (activos > 0) mensaje += `<li>• ${activos} activo(s) asociado(s)</li>`;
            if (empleados > 0) mensaje += `<li>• ${empleados} empleado(s) asociado(s)</li>`;
            if (hijos > 0) mensaje += `<li>• ${hijos} ubicación(es) hija(s)</li>`;
            mensaje += `</ul><p class="text-sm text-gray-500 mt-2">Si la desactivas, los registros seguirán existiendo pero no podrás usar esta ubicación para nuevos registros.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`;

            const result = await Swal.fire({
                title: `¿Desactivar ubicación?`,
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
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} ubicación?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta ubicación.`,
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
                .from('ubicaciones')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Ubicación ${accion}da correctamente`, 'success');
            await cargarVistaUbicaciones();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalNuevaUbicacion = async function() {
    try {
        const modal = document.getElementById('ubicacionModal');
        if (modal && !modal.classList.contains('hidden')) {
            window.cerrarModal('ubicacionModal');
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        editandoId = null;
        const form = document.getElementById('ubicacionForm');
        if (form) form.reset();
        const titleElement = document.getElementById('ubicacionModalTitle');
        if (titleElement) titleElement.innerText = 'Nueva Ubicación';

        const activoSelect = document.getElementById('ubicacion_activo');
        if (activoSelect) activoSelect.value = 'true';

        const nombreInput = document.getElementById('ubicacion_nombre');
        if (nombreInput) {
            nombreInput.value = '';
            nombreInput.dataset.editadoManualmente = 'false';
        }

        const padreSelect = document.getElementById('ubicacion_padre_id');
        if (padreSelect) padreSelect.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';

        await cargarEmpresasSelect('ubicacion_empresa_id');
        await cargarUbicacionesPadreSelect();
        configurarAutocompletadoNombre();

        await window.abrirModal('ubicacionModal');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo abrir el formulario', 'error');
    }
};

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarUbicacionesPorEmpresa = function() {
    const empresaId = document.getElementById('filtroEmpresaUbicaciones')?.value;
    const tipoFiltro = document.querySelector('.filter-tipo-btn.ring-2')?.dataset.tipo || 'todos';
    const estadoFiltro = document.querySelector('.filter-estado-btn.ring-2')?.dataset.estado || 'todos';
    const busqueda = document.getElementById('busquedaUbicaciones')?.value?.toLowerCase() || '';

    const cards = document.querySelectorAll('#ubicaciones-grid .ubicacion-card');
    let contador = 0;

    cards.forEach(card => {
        let mostrar = true;

        if (empresaId && empresaId !== 'TODAS') {
            const cardEmpresaId = card.dataset.empresa;
            if (cardEmpresaId !== empresaId) mostrar = false;
        }

        if (mostrar && tipoFiltro !== 'todos') {
            const cardTipo = card.dataset.tipo;
            if (cardTipo !== tipoFiltro) mostrar = false;
        }

        if (mostrar && estadoFiltro !== 'todos') {
            const activo = card.dataset.activo === 'true';
            if (estadoFiltro === 'activas' && !activo) mostrar = false;
            if (estadoFiltro === 'inactivas' && activo) mostrar = false;
        }

        if (mostrar && busqueda) {
            const nombre = card.dataset.nombre || '';
            if (!nombre.includes(busqueda)) mostrar = false;
        }

        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });

    const contadorSpan = document.getElementById('contadorUbicacionesFiltradas');
    const total = cards.length;
    if (contadorSpan) {
        contadorSpan.textContent = contador;
        const totalSpan = contadorSpan.parentElement;
        if (totalSpan) totalSpan.innerHTML = `${contador} de ${total} ubicaciones`;
    }

    mostrarMensajeSinResultadosUbicaciones(contador);
};

window.filtrarUbicacionesPorTipo = function(tipo) {
    const botones = document.querySelectorAll('.filter-tipo-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.tipo === tipo) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarUbicacionesPorEmpresa();
};

window.filtrarUbicacionesPorEstado = function(estado) {
    const botones = document.querySelectorAll('.filter-estado-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === estado) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    window.filtrarUbicacionesPorEmpresa();
};

window.filtrarUbicacionesPorBusqueda = function() {
    window.filtrarUbicacionesPorEmpresa();
};

window.limpiarFiltroEmpresaUbicaciones = function() {
    const filtroEmpresa = document.getElementById('filtroEmpresaUbicaciones');
    if (filtroEmpresa) filtroEmpresa.value = 'TODAS';

    const busqueda = document.getElementById('busquedaUbicaciones');
    if (busqueda) busqueda.value = '';

    const botonesTipo = document.querySelectorAll('.filter-tipo-btn');
    botonesTipo.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.tipo === 'todos') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });

    const botonesEstado = document.querySelectorAll('.filter-estado-btn');
    botonesEstado.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.estado === 'todos') btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });

    const cards = document.querySelectorAll('#ubicaciones-grid .ubicacion-card');
    cards.forEach(card => card.style.display = 'block');

    const contadorSpan = document.getElementById('contadorUbicacionesFiltradas');
    const total = cards.length;
    if (contadorSpan) {
        contadorSpan.textContent = total;
        const totalSpan = contadorSpan.parentElement;
        if (totalSpan) totalSpan.innerHTML = `${total} de ${total} ubicaciones`;
    }

    const mensajeVacio = document.getElementById('filtro-ubicaciones-vacio');
    if (mensajeVacio) mensajeVacio.remove();
};

function mostrarMensajeSinResultadosUbicaciones(contador) {
    const grid = document.getElementById('ubicaciones-grid');
    let mensajeVacio = document.getElementById('filtro-ubicaciones-vacio');

    if (contador === 0) {
        if (!mensajeVacio) {
            mensajeVacio = document.createElement('div');
            mensajeVacio.id = 'filtro-ubicaciones-vacio';
            mensajeVacio.className = 'col-span-full text-center py-12 bg-white rounded-lg mt-4';
            mensajeVacio.innerHTML = `
                <div class="flex flex-col items-center justify-center">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-filter text-3xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 text-lg">No hay ubicaciones que coincidan con los filtros</p>
                    <p class="text-gray-400 text-sm mt-2">Intenta con otros criterios de búsqueda</p>
                    <button onclick="limpiarFiltroEmpresaUbicaciones()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                        <i class="fas fa-undo-alt mr-2"></i>Limpiar filtros
                    </button>
                </div>
            `;
            grid.appendChild(mensajeVacio);
        }
    } else if (mensajeVacio) {
        mensajeVacio.remove();
    }
}

// ==================== FUNCIONES AUXILIARES ====================
async function cargarUbicacionesPadreSelect(empresaId = null) {
    try {
        const select = document.getElementById('ubicacion_padre_id');
        if (!select) return;

        const tipoSelect = document.getElementById('ubicacion_tipo');
        const tipoSeleccionado = tipoSelect ? tipoSelect.value : null;

        // Determinar tipos permitidos según el tipo seleccionado
        let tiposPermitidos = [];
        switch(tipoSeleccionado) {
            case 'SEDE':
                tiposPermitidos = [];
                break;
            case 'FUNDO':
                tiposPermitidos = ['SEDE'];
                break;
            case 'PLANTA':
                tiposPermitidos = ['SEDE', 'FUNDO'];
                break;
            case 'EDIFICIO':
                tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                break;
            case 'PISO':
                tiposPermitidos = ['EDIFICIO'];
                break;
            case 'OFICINA':
                tiposPermitidos = ['PISO', 'EDIFICIO', 'FUNDO', 'PLANTA', 'SEDE'];
                break;
            case 'GARITA':
                tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                break;
            case 'CANTERA':
                tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                break;
            case 'CAMPO':
                tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                break;
            case 'ALMACEN':
                tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA', 'EDIFICIO'];
                break;
            default:
                tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                break;
        }

        if (tiposPermitidos.length === 0) {
            select.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';
            select.disabled = true;
            return;
        }

        let query = window.supabaseClient
            .from('ubicaciones')
            .select(`id, nombre, tipo, descripcion, empresa_id, empresa:empresa_id (id, nombre, ruc)`)
            .eq('activo', true)
            .in('tipo', tiposPermitidos)
            .order('tipo')
            .order('nombre');

        if (empresaId && empresaId !== '') {
            query = query.eq('empresa_id', empresaId);
        }

        const { data, error } = await query;
        if (error) throw error;

        select.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay ubicaciones disponibles como padre</option>';
            select.disabled = true;
            return;
        }

        const tipoIconos = {
            'SEDE': '🏛️', 'FUNDO': '🌾', 'PLANTA': '🏭', 'EDIFICIO': '🏢',
            'PISO': '📌', 'OFICINA': '🏢', 'GARITA': '🚪', 'CANTERA': '⛏️',
            'CAMPO': '🌾', 'ALMACEN': '📦'
        };

        const ordenTipos = ['SEDE', 'FUNDO', 'PLANTA', 'EDIFICIO', 'PISO', 'OFICINA', 'GARITA', 'CANTERA', 'CAMPO', 'ALMACEN'];
        
        const ubicacionesPorTipo = new Map();
        data.forEach(u => {
            if (!ubicacionesPorTipo.has(u.tipo)) ubicacionesPorTipo.set(u.tipo, []);
            ubicacionesPorTipo.get(u.tipo).push(u);
        });

        ordenTipos.forEach(tipo => {
            const ubicacionesList = ubicacionesPorTipo.get(tipo);
            if (ubicacionesList && ubicacionesList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${tipoIconos[tipo] || '📍'} ${tipo} (${ubicacionesList.length})`;
                ubicacionesList.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.id;
                    let texto = u.nombre;
                    if (u.descripcion) texto += ` - ${u.descripcion.substring(0, 40)}${u.descripcion.length > 40 ? '...' : ''}`;
                    if (u.empresa && u.empresa.nombre) texto += ` [${u.empresa.nombre}]`;
                    option.textContent = texto;
                    option.dataset.empresaId = u.empresa_id || '';
                    option.dataset.tipo = u.tipo;
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
        
        select.disabled = false;
        console.log(`✅ Padres cargados para tipo ${tipoSeleccionado}: ${data.length} ubicaciones`);
        
    } catch (error) {
        console.error('❌ Error cargando ubicaciones padre:', error);
        const select = document.getElementById('ubicacion_padre_id');
        if (select) {
            select.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
            select.disabled = true;
        }
    }
}

async function cargarUbicacionesPadreSelectEdicion(ubicacionActual) {
    try {
        const select = document.getElementById('ubicacion_padre_id');
        if (!select) return;

        const tipoActual = ubicacionActual.tipo;
        const empresaId = ubicacionActual.empresa_id;

        let query = window.supabaseClient
            .from('ubicaciones')
            .select(`id, nombre, tipo, descripcion, empresa_id, empresa:empresa_id (id, nombre, ruc)`)
            .eq('activo', true)
            .neq('id', ubicacionActual.id);

        if (empresaId) query = query.eq('empresa_id', empresaId);

        const { data, error } = await query;
        if (error) throw error;

        select.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay ubicaciones disponibles</option>';
            select.disabled = true;
            return;
        }

        let ubicacionesFiltradas = data;
        switch(tipoActual) {
            case 'PLANTA': ubicacionesFiltradas = []; break;
            case 'EDIFICIO': ubicacionesFiltradas = data.filter(u => u.tipo === 'PLANTA' || u.tipo === 'SEDE'); break;
            case 'PISO': ubicacionesFiltradas = data.filter(u => u.tipo === 'EDIFICIO'); break;
            case 'OFICINA': ubicacionesFiltradas = data.filter(u => u.tipo === 'PISO'); break;
            case 'SEDE': ubicacionesFiltradas = data.filter(u => u.tipo === 'SEDE'); break;
            default: ubicacionesFiltradas = data.filter(u => u.tipo !== tipoActual);
        }

        if (ubicacionesFiltradas.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay ubicaciones disponibles como padre</option>';
            select.disabled = true;
            return;
        }

        const tipoIconos = { 'SEDE': '🏛️', 'PLANTA': '🏭', 'EDIFICIO': '🏢', 'PISO': '📌', 'OFICINA': '🏢' };
        const ubicacionesPorTipo = new Map();
        ubicacionesFiltradas.forEach(u => {
            if (!ubicacionesPorTipo.has(u.tipo)) ubicacionesPorTipo.set(u.tipo, []);
            ubicacionesPorTipo.get(u.tipo).push(u);
        });

        const tiposOrdenados = ['SEDE', 'PLANTA', 'EDIFICIO', 'PISO', 'OFICINA'];
        tiposOrdenados.forEach(tipo => {
            const ubicacionesList = ubicacionesPorTipo.get(tipo);
            if (ubicacionesList && ubicacionesList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${tipoIconos[tipo] || '📍'} ${tipo} (${ubicacionesList.length})`;
                ubicacionesList.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.id;
                    let texto = u.nombre;
                    if (u.descripcion) texto += ` - ${u.descripcion.substring(0, 40)}${u.descripcion.length > 40 ? '...' : ''}`;
                    if (u.empresa && u.empresa.nombre) texto += ` [${u.empresa.nombre}]`;
                    else if (u.empresa_id) texto += ` [Empresa ID: ${u.empresa_id.substring(0, 8)}...]`;
                    option.textContent = texto;
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
        select.disabled = false;
    } catch (error) {
        console.error('Error cargando ubicaciones padre para edición:', error);
        const select = document.getElementById('ubicacion_padre_id');
        if (select) {
            select.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
            select.disabled = true;
        }
    }
}

// ==================== CONFIGURAR AUTOCOMPLETADO DE NOMBRES ====================
function configurarAutocompletadoNombre() {
    const tipoSelect = document.getElementById('ubicacion_tipo');
    const padreSelect = document.getElementById('ubicacion_padre_id');
    const nombreInput = document.getElementById('ubicacion_nombre');

    if (!tipoSelect || !padreSelect || !nombreInput) return;

    // Convertir valor inicial a mayúsculas si existe
    if (nombreInput.value) {
        nombreInput.value = nombreInput.value.toUpperCase();
    }

    nombreInput.addEventListener('input', function(e) {
        if (this.value) {
            const cursorPos = this.selectionStart;
            const oldValue = this.value;
            const newValue = oldValue.toUpperCase();
            if (oldValue !== newValue) {
                this.value = newValue;
                this.setSelectionRange(cursorPos, cursorPos);
            }
        }
    });

    if (!nombreInput.dataset.hasOwnProperty('editadoManualmente')) {
        nombreInput.dataset.editadoManualmente = 'false';
    }

    nombreInput.addEventListener('input', function() {
        if (this.value && this.value.trim() !== '') this.dataset.editadoManualmente = 'true';
    });

    nombreInput.addEventListener('focus', function() {
        if (this.value && this.value.trim() !== '') this.dataset.editadoManualmente = 'true';
    });

    nombreInput.addEventListener('paste', function() {
        setTimeout(() => { this.dataset.editadoManualmente = 'true'; }, 100);
    });

async function actualizarPadresSegunTipo() {
    const tipo = tipoSelect.value;
    const empresaId = document.getElementById('ubicacion_empresa_id')?.value;
    const valorActualPadre = padreSelect.value;
    
    if (tipo === 'PLANTA') {
        await cargarUbicacionesPadrePorTipo('PLANTA', empresaId, ['SEDE', 'FUNDO']);
    } else if (tipo === 'EDIFICIO') {
        await cargarUbicacionesPadrePorTipo('EDIFICIO', empresaId, ['SEDE', 'FUNDO', 'PLANTA']);
    } else if (tipo === 'GARITA') {
        await cargarUbicacionesPadrePorTipo('GARITA', empresaId, ['SEDE', 'FUNDO', 'PLANTA']);
    } else if (tipo === 'PISO') {
        await cargarUbicacionesPadrePorTipo('PISO', empresaId, ['EDIFICIO']);
    } else if (tipo === 'OFICINA') {
        await cargarUbicacionesPadrePorTipo('OFICINA', empresaId, ['PISO', 'EDIFICIO', 'FUNDO', 'PLANTA', 'SEDE']);
    } else if (tipo === 'CANTERA') {
        await cargarUbicacionesPadrePorTipo('CANTERA', empresaId, ['SEDE', 'FUNDO', 'PLANTA']);
    } else if (tipo === 'CAMPO') {
        // CORREGIDO: incluye FUNDO
        await cargarUbicacionesPadrePorTipo('CAMPO', empresaId, ['SEDE', 'FUNDO', 'PLANTA']);
    } else if (tipo === 'ALMACEN') {
        await cargarUbicacionesPadrePorTipo('ALMACEN', empresaId, ['SEDE', 'FUNDO', 'PLANTA', 'EDIFICIO']);
    } else if (tipo === 'FUNDO') {
        await cargarUbicacionesPadrePorTipo('FUNDO', empresaId, ['SEDE']);
    } else {
        await cargarUbicacionesPadreSelect(empresaId);
    }
    
    if (valorActualPadre) {
        const optionExists = Array.from(padreSelect.options).some(opt => opt.value === valorActualPadre);
        if (optionExists) padreSelect.value = valorActualPadre;
    }
}

    function generarNombreAutomatico() {
        const tipo = tipoSelect.value;
        const padreId = padreSelect.value;
        
        if (!tipo) return '';

        const ubicacionesExistentes = document.querySelectorAll('#ubicaciones-grid .ubicacion-card');

        switch(tipo) {
            case 'PLANTA':
                const plantasExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'PLANTA').length;
                return `Planta ${plantasExistentes + 1}`;
                
            case 'EDIFICIO':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                    // Extraer nombre de la planta si existe
                    const nombrePlanta = padreTexto.match(/Planta (\d+)/) ? padreTexto : '';
                    const edificiosEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    const letra = String.fromCharCode(65 + edificiosEnPadre);
                    return nombrePlanta ? `${nombrePlanta} - Edificio ${letra}` : `Edificio ${letra}`;
                }
                return 'Edificio Nuevo';
                
            case 'GARITA':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                    const garitasEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    return `${padreTexto} - Garita ${garitasEnPadre + 1}`;
                }
                return `Garita ${Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'GARITA').length + 1}`;
                
            case 'CANTERA':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                    const canterasEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    return `${padreTexto} - Cantera ${canterasEnPadre + 1}`;
                }
                const nombresCanteras = ['Principal', 'Norte', 'Sur', 'Este', 'Oeste', 'San Juan', 'Cerro Verde'];
                const canterasExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'CANTERA').length;
                return `Cantera ${nombresCanteras[canterasExistentes] || (canterasExistentes + 1)}`;
                
            case 'CAMPO':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                    const camposEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    return `${padreTexto} - Campo ${camposEnPadre + 1}`;
                }
                const nombresCampos = ['Arándano', 'Plátano', 'Palta', 'Mango', 'Cítricos', 'Uva'];
                const camposExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'CAMPO').length;
                return `Campo de ${nombresCampos[camposExistentes] || (camposExistentes + 1)}`;
                
            case 'PISO':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                    const pisosEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    return `${padreTexto} - Piso ${pisosEnPadre + 1}`;
                }
                return 'Piso Nuevo';
                
            case 'OFICINA':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent : '';
                    const matchPiso = padreTexto.match(/Piso (\d+)/);
                    const numeroPiso = matchPiso ? matchPiso[1] : '1';
                    const oficinasEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    const numeroOficina = `${numeroPiso}${(oficinasEnPadre + 1).toString().padStart(2, '0')}`;
                    return `Oficina ${numeroOficina}`;
                }
                return 'Oficina Nueva';
                
            case 'ALMACEN':
                if (padreId) {
                    const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                    const padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                    const almacenesEnPadre = Array.from(ubicacionesExistentes)
                        .filter(card => card.dataset.padre === padreId).length;
                    return `${padreTexto} - Almacén ${almacenesEnPadre + 1}`;
                }
                const nombresAlmacenes = ['General', 'Materia Prima', 'Producto Terminado', 'Insumos', 'Herramientas'];
                const almacenesExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'ALMACEN').length;
                return `Almacén ${nombresAlmacenes[almacenesExistentes] || (almacenesExistentes + 1)}`;
                
            case 'SEDE':
                const sedesExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'SEDE').length;
                const nombresSedes = ['Principal', 'Norte', 'Sur', 'Este', 'Oeste', 'Central', 'Administrativa'];
                return `Sede ${nombresSedes[sedesExistentes] || (sedesExistentes + 1)}`;
                
            default:
                const otrosExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'OTRO').length;
                return `Ubicación ${otrosExistentes + 1}`;
        }
    }

    function actualizarNombreAutomatico() {
        if (nombreInput.dataset.editadoManualmente === 'true') return;
        const tipo = tipoSelect.value;
        if (!tipo) return;
        const nombreGenerado = generarNombreAutomatico();
        if (nombreGenerado) nombreInput.value = nombreGenerado;
    }

    tipoSelect.addEventListener('change', async function() {
        nombreInput.dataset.editadoManualmente = 'false';
        padreSelect.value = '';
        await actualizarPadresSegunTipo();
        actualizarNombreAutomatico();
    });

    padreSelect.addEventListener('change', function() {
        nombreInput.dataset.editadoManualmente = 'false';
        actualizarNombreAutomatico();
    });

    const empresaSelect = document.getElementById('ubicacion_empresa_id');
    if (empresaSelect) {
        empresaSelect.addEventListener('change', async function() {
            nombreInput.dataset.editadoManualmente = 'false';
            padreSelect.value = '';
            await actualizarPadresSegunTipo();
            actualizarNombreAutomatico();
        });
    }

    setTimeout(async () => {
        await actualizarPadresSegunTipo();
        if (!editandoId) actualizarNombreAutomatico();
    }, 300);
}

// ==================== CARGAR UBICACIONES PADRE POR TIPO ====================
async function cargarUbicacionesPadrePorTipo(tipoHijo, empresaId, tiposPermitidos = []) {
    try {
        const select = document.getElementById('ubicacion_padre_id');
        if (!select) return;

        console.log(`🔍 Cargando padres para tipo hijo: ${tipoHijo}, empresa: ${empresaId}`);

        // Si no se especifican tipos permitidos, determinar según el tipo hijo
        if (tiposPermitidos.length === 0) {
            switch(tipoHijo) {
                case 'SEDE':
                    tiposPermitidos = [];
                    break;
                case 'FUNDO':
                    tiposPermitidos = ['SEDE'];
                    break;
                case 'PLANTA':
                    tiposPermitidos = ['SEDE', 'FUNDO'];
                    break;
                case 'EDIFICIO':
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                    break;
                case 'PISO':
                    tiposPermitidos = ['EDIFICIO'];
                    break;
                case 'OFICINA':
                    tiposPermitidos = ['PISO', 'EDIFICIO', 'FUNDO', 'PLANTA', 'SEDE'];
                    break;
                case 'GARITA':
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                    break;
                case 'CANTERA':
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                    break;
                case 'CAMPO':
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];  // ← CORREGIDO: incluye FUNDO
                    break;
                case 'ALMACEN':
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA', 'EDIFICIO'];
                    break;
                case 'OTRO':
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA', 'EDIFICIO', 'PISO', 'OFICINA', 'GARITA', 'CANTERA', 'CAMPO', 'ALMACEN'];
                    break;
                default:
                    tiposPermitidos = ['SEDE', 'FUNDO', 'PLANTA'];
                    break;
            }
        }

        console.log(`📋 Tipos permitidos para ${tipoHijo}:`, tiposPermitidos);

        if (tiposPermitidos.length === 0) {
            select.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';
            select.disabled = true;
            return;
        }

        let query = window.supabaseClient
            .from('ubicaciones')
            .select(`
                id, 
                nombre, 
                tipo, 
                descripcion, 
                empresa_id,
                activo
            `)
            .eq('activo', true)
            .in('tipo', tiposPermitidos);
        
        if (empresaId && empresaId !== '') {
            query = query.eq('empresa_id', empresaId);
        }
        
        const { data, error } = await query.order('tipo').order('nombre');
        
        if (error) throw error;

        console.log(`📊 Ubicaciones encontradas:`, data);

        select.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay ubicaciones disponibles como padre</option>';
            select.disabled = true;
            return;
        }

        const tipoIconos = {
            'SEDE': '🏛️',
            'FUNDO': '🌾',
            'PLANTA': '🏭',
            'EDIFICIO': '🏢',
            'PISO': '📌',
            'OFICINA': '🏢',
            'GARITA': '🚪',
            'CANTERA': '⛏️',
            'CAMPO': '🌾',
            'ALMACEN': '📦',
            'OTRO': '📍'
        };

        const ordenTipos = ['SEDE', 'FUNDO', 'PLANTA', 'EDIFICIO', 'PISO', 'OFICINA', 'GARITA', 'CANTERA', 'CAMPO', 'ALMACEN', 'OTRO'];
        
        const ubicacionesPorTipo = new Map();
        data.forEach(u => {
            if (!ubicacionesPorTipo.has(u.tipo)) {
                ubicacionesPorTipo.set(u.tipo, []);
            }
            ubicacionesPorTipo.get(u.tipo).push(u);
        });

        ordenTipos.forEach(tipo => {
            const ubicacionesList = ubicacionesPorTipo.get(tipo);
            if (ubicacionesList && ubicacionesList.length > 0) {
                const optgroup = document.createElement('optgroup');
                const icono = tipoIconos[tipo] || '📍';
                optgroup.label = `${icono} ${tipo} (${ubicacionesList.length})`;
                
                ubicacionesList.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.id;
                    let texto = u.nombre;
                    if (u.descripcion) {
                        texto += ` - ${u.descripcion.substring(0, 40)}${u.descripcion.length > 40 ? '...' : ''}`;
                    }
                    option.textContent = texto;
                    option.dataset.empresaId = u.empresa_id || '';
                    option.dataset.tipo = u.tipo;
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });

        select.disabled = false;
        console.log(`✅ Ubicaciones padre cargadas para tipo ${tipoHijo}: ${data.length} ubicaciones encontradas`);
        
    } catch (error) {
        console.error('❌ Error cargando ubicaciones padre por tipo:', error);
        const select = document.getElementById('ubicacion_padre_id');
        if (select) {
            select.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
            select.disabled = true;
        }
    }
}

window.regenerarNombreUbicacion = function() {
    const nombreInput = document.getElementById('ubicacion_nombre');
    const tipoSelect = document.getElementById('ubicacion_tipo');
    const padreSelect = document.getElementById('ubicacion_padre_id');

    if (!nombreInput || !tipoSelect || !padreSelect) return;

    const tipo = tipoSelect.value;
    if (!tipo) {
        mostrarAlerta('Aviso', 'Primero selecciona un tipo de ubicación', 'info');
        return;
    }

    nombreInput.dataset.editadoManualmente = 'false';

    const ubicacionesExistentes = document.querySelectorAll('#ubicaciones-grid .ubicacion-card');
    let nombreGenerado = '';

    switch(tipo) {
        case 'PLANTA':
            const plantasExistentes = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'PLANTA').length;
            nombreGenerado = `Planta ${plantasExistentes + 1}`;
            break;
        case 'EDIFICIO':
            const padreIdEdif = padreSelect.value;
            if (padreIdEdif) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdEdif}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const edificiosEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdEdif).length;
                const letra = String.fromCharCode(65 + edificiosEnPadre);
                nombreGenerado = padreTexto ? `${padreTexto} - Edificio ${letra}` : `Edificio ${letra}`;
            } else {
                nombreGenerado = 'Edificio Nuevo';
            }
            break;
        case 'GARITA':
            const padreIdGarita = padreSelect.value;
            if (padreIdGarita) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdGarita}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const garitasEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdGarita).length;
                nombreGenerado = `${padreTexto} - Garita ${garitasEnPadre + 1}`;
            } else {
                const garitasTotales = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'GARITA').length;
                nombreGenerado = `Garita ${garitasTotales + 1}`;
            }
            break;
        case 'CANTERA':
            const padreIdCantera = padreSelect.value;
            if (padreIdCantera) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdCantera}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const canterasEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdCantera).length;
                nombreGenerado = `${padreTexto} - Cantera ${canterasEnPadre + 1}`;
            } else {
                const nombresCanteras = ['Principal', 'Norte', 'Sur', 'Este', 'Oeste'];
                const canterasTotales = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'CANTERA').length;
                nombreGenerado = `Cantera ${nombresCanteras[canterasTotales] || (canterasTotales + 1)}`;
            }
            break;
        case 'CAMPO':
            const padreIdCampo = padreSelect.value;
            if (padreIdCampo) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdCampo}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const camposEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdCampo).length;
                nombreGenerado = `${padreTexto} - Campo ${camposEnPadre + 1}`;
            } else {
                const nombresCampos = ['Arándano', 'Plátano', 'Palta', 'Mango', 'Cítricos'];
                const camposTotales = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'CAMPO').length;
                nombreGenerado = `Campo de ${nombresCampos[camposTotales] || (camposTotales + 1)}`;
            }
            break;
        case 'ALMACEN':
            const padreIdAlmacen = padreSelect.value;
            if (padreIdAlmacen) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdAlmacen}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const almacenesEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdAlmacen).length;
                nombreGenerado = `${padreTexto} - Almacén ${almacenesEnPadre + 1}`;
            } else {
                const nombresAlmacenes = ['General', 'Materia Prima', 'Producto Terminado', 'Insumos'];
                const almacenesTotales = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'ALMACEN').length;
                nombreGenerado = `Almacén ${nombresAlmacenes[almacenesTotales] || (almacenesTotales + 1)}`;
            }
            break;
        case 'PISO':
            const padreIdPiso = padreSelect.value;
            if (padreIdPiso) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdPiso}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const pisosEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdPiso).length;
                nombreGenerado = `${padreTexto} - Piso ${pisosEnPadre + 1}`;
            } else {
                nombreGenerado = 'Piso Nuevo';
            }
            break;
        case 'OFICINA':
            const padreIdOficina = padreSelect.value;
            if (padreIdOficina) {
                const padreOption = padreSelect.querySelector(`option[value="${padreIdOficina}"]`);
                let padreTexto = padreOption ? padreOption.textContent : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const matchPiso = padreTexto.match(/Piso (\d+)/i);
                const numeroPiso = matchPiso ? matchPiso[1] : '1';
                const oficinasEnPadre = Array.from(ubicacionesExistentes).filter(card => card.dataset.padre === padreIdOficina).length;
                const numeroOficina = `${numeroPiso}${(oficinasEnPadre + 1).toString().padStart(2, '0')}`;
                nombreGenerado = `Oficina ${numeroOficina}`;
            } else {
                nombreGenerado = 'Oficina Nueva';
            }
            break;
        case 'SEDE':
            const sedesTotales = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'SEDE').length;
            const nombresSedes = ['Principal', 'Norte', 'Sur', 'Este', 'Oeste'];
            nombreGenerado = `Sede ${nombresSedes[sedesTotales] || (sedesTotales + 1)}`;
            break;
        default:
            const otrosTotales = Array.from(ubicacionesExistentes).filter(card => card.dataset.tipo === 'OTRO').length;
            nombreGenerado = `Ubicación ${otrosTotales + 1}`;
    }

    if (nombreGenerado) {
        nombreGenerado = nombreGenerado.toUpperCase();
        nombreInput.value = nombreGenerado;
        Swal.fire({
            title: 'Nombre generado',
            text: `Se generó: ${nombreGenerado}`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleUbicacion = async function(id) {
    mostrarLoading('Cargando detalles de la ubicación...');
    try {
        const { data: ubicacion, error } = await window.supabaseClient
            .from('ubicaciones')
            .select(`*, empresa:empresa_id (id, nombre, ruc)`)
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(ubicacion.creado_por);
        const modificadorInfo = ubicacion.modificado_por ? await obtenerInfoUsuarioConEmpleado(ubicacion.modificado_por) : null;

        const { data: activos } = await window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo, estado')
            .eq('ubicacion_id', id)
            .limit(5);

        const { data: empleados } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, puesto, activo')
            .eq('ubicacion_id', id)
            .limit(5);

        let activosHtml = activos?.length ? activos.map(a => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${a.nombre}</span><span class="text-xs text-gray-500 ml-1">${a.codigo_activo || ''}</span></div><span class="estado-badge estado-${a.estado || 'DISPONIBLE'} text-xs">${a.estado || 'DISPONIBLE'}</span></div>`).join('') : '<p class="text-gray-400 italic">No hay activos en esta ubicación</p>';
        let empleadosHtml = empleados?.length ? empleados.map(e => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${e.nombre_completo}</span><span class="text-xs text-gray-500 ml-1">${e.puesto || ''}</span></div><span class="estado-badge ${e.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${e.activo ? 'Activo' : 'Inactivo'}</span></div>`).join('') : '<p class="text-gray-400 italic">No hay empleados en esta ubicación</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles de Ubicación`,
            width: '700px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-2">${ubicacion.nombre}</h3><p><span class="font-semibold">Descripción:</span> ${ubicacion.descripcion || 'Sin descripción'}</p><p><span class="font-semibold">Empresa:</span> ${ubicacion.empresa?.nombre || 'No especificada'}</p><p><span class="font-semibold">Estado:</span> <span class="${ubicacion.activo ? 'text-green-600' : 'text-red-600'}">${ubicacion.activo ? 'Activa' : 'Inactiva'}</span></p></div><div class="grid grid-cols-2 gap-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-2">Activos</h3><div class="max-h-40 overflow-y-auto">${activosHtml}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-2">Empleados</h3><div class="max-h-40 overflow-y-auto">${empleadosHtml}</div></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500"><h3 class="font-bold text-purple-700 mb-2">Auditoría</h3><p><span class="font-semibold">Creado:</span> ${new Date(ubicacion.creado_el).toLocaleString()} por ${creadorInfo.nombre}</p>${modificadorInfo ? `<p><span class="font-semibold">Modificado:</span> ${new Date(ubicacion.modificado_el).toLocaleString()} por ${modificadorInfo.nombre}</p>` : ''}</div></div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los detalles', 'error');
    }
};

window.verHijosUbicacion = async function(id) {
    mostrarLoading('Cargando ubicaciones hijas...');
    try {
        const { data: ubicacion } = await window.supabaseClient
            .from('ubicaciones')
            .select('nombre, tipo')
            .eq('id', id)
            .single();

        const { data: hijos } = await window.supabaseClient
            .from('ubicaciones')
            .select('id, nombre, tipo, descripcion, activo')
            .eq('ubicacion_padre_id', id)
            .order('tipo')
            .order('nombre');

        ocultarLoading();

        const tipoIconos = { 'PLANTA': '🏭', 'EDIFICIO': '🏢', 'PISO': '📌', 'OFICINA': '🏢' };
        let hijosHtml = hijos?.length ? hijos.map(h => `<div class="border-b pb-2 mb-2 last:border-b-0"><div class="flex justify-between items-center"><div><p class="font-medium">${tipoIconos[h.tipo] || '📍'} ${h.nombre}<span class="text-xs text-gray-500 ml-2">${h.tipo}</span>${h.descripcion ? `<p class="text-xs text-gray-500">${h.descripcion}</p>` : ''}</div><span class="estado-badge ${h.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs">${h.activo ? 'Activa' : 'Inactiva'}</span></div></div>`).join('') : '<p class="text-gray-500 text-center py-4">No hay ubicaciones hijas</p>';

        Swal.fire({
            title: `Ubicaciones hijas de: ${ubicacion?.nombre || 'Ubicación'}`,
            html: `<div class="text-left max-h-96 overflow-y-auto">${hijosHtml}</div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            width: '500px'
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las ubicaciones hijas', 'error');
    }
};

function generarNombreAutomatico() {
    const tipo = tipoSelect.value;
    const padreId = padreSelect.value;
    
    if (!tipo) return '';

    const ubicacionesExistentes = document.querySelectorAll('#ubicaciones-grid .ubicacion-card');
    let nombreGenerado = '';

    switch(tipo) {
        case 'PLANTA':
            const plantasExistentes = Array.from(ubicacionesExistentes)
                .filter(card => card.dataset.tipo === 'PLANTA').length;
            nombreGenerado = `Planta ${plantasExistentes + 1}`;
            break;
            
        case 'EDIFICIO':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                // Limpiar texto del padre (quitar íconos y formato)
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const edificiosEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                const letra = String.fromCharCode(65 + edificiosEnPadre);
                nombreGenerado = padreTexto ? `${padreTexto} - Edificio ${letra}` : `Edificio ${letra}`;
            } else {
                nombreGenerado = `Edificio Nuevo`;
            }
            break;
            
        case 'GARITA':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const garitasEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                nombreGenerado = `${padreTexto} - Garita ${garitasEnPadre + 1}`;
            } else {
                const garitasTotales = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'GARITA').length;
                nombreGenerado = `Garita ${garitasTotales + 1}`;
            }
            break;
            
        case 'CANTERA':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const canterasEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                nombreGenerado = `${padreTexto} - Cantera ${canterasEnPadre + 1}`;
            } else {
                const nombresCanteras = ['Principal', 'Norte', 'Sur', 'Este', 'Oeste', 'San Juan', 'Cerro Verde'];
                const canterasExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'CANTERA').length;
                nombreGenerado = `Cantera ${nombresCanteras[canterasExistentes] || (canterasExistentes + 1)}`;
            }
            break;
            
        case 'CAMPO':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const camposEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                nombreGenerado = `${padreTexto} - Campo ${camposEnPadre + 1}`;
            } else {
                const nombresCampos = ['Arándano', 'Plátano', 'Palta', 'Mango', 'Cítricos', 'Uva'];
                const camposExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'CAMPO').length;
                nombreGenerado = `Campo de ${nombresCampos[camposExistentes] || (camposExistentes + 1)}`;
            }
            break;
            
        case 'PISO':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const pisosEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                nombreGenerado = `${padreTexto} - Piso ${pisosEnPadre + 1}`;
            } else {
                nombreGenerado = `Piso Nuevo`;
            }
            break;
            
        case 'OFICINA':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const matchPiso = padreTexto.match(/Piso (\d+)/i);
                const numeroPiso = matchPiso ? matchPiso[1] : '1';
                const oficinasEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                const numeroOficina = `${numeroPiso}${(oficinasEnPadre + 1).toString().padStart(2, '0')}`;
                nombreGenerado = `Oficina ${numeroOficina}`;
            } else {
                nombreGenerado = `Oficina Nueva`;
            }
            break;
            
        case 'ALMACEN':
            if (padreId) {
                const padreOption = padreSelect.querySelector(`option[value="${padreId}"]`);
                let padreTexto = padreOption ? padreOption.textContent.split(' (')[0] : '';
                padreTexto = padreTexto.replace(/[🏭🏢📌🚪⛏️🌾📦🏛️📍]/g, '').trim();
                const almacenesEnPadre = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.padre === padreId).length;
                nombreGenerado = `${padreTexto} - Almacén ${almacenesEnPadre + 1}`;
            } else {
                const nombresAlmacenes = ['General', 'Materia Prima', 'Producto Terminado', 'Insumos', 'Herramientas'];
                const almacenesExistentes = Array.from(ubicacionesExistentes)
                    .filter(card => card.dataset.tipo === 'ALMACEN').length;
                nombreGenerado = `Almacén ${nombresAlmacenes[almacenesExistentes] || (almacenesExistentes + 1)}`;
            }
            break;
            
        case 'SEDE':
            const sedesExistentes = Array.from(ubicacionesExistentes)
                .filter(card => card.dataset.tipo === 'SEDE').length;
            const nombresSedes = ['Principal', 'Norte', 'Sur', 'Este', 'Oeste', 'Central', 'Administrativa'];
            nombreGenerado = `Sede ${nombresSedes[sedesExistentes] || (sedesExistentes + 1)}`;
            break;

        case 'FUNDO':
            const fundosExistentes = Array.from(ubicacionesExistentes)
                .filter(card => card.dataset.tipo === 'FUNDO').length;
            const nombresFundos = ['Principal', 'San José', 'El Carmen', 'La Esperanza', 'San Pablo', 'Los Ángeles'];
            return `Fundo ${nombresFundos[fundosExistentes] || (fundosExistentes + 1)}`;            
            
        default:
            const otrosExistentes = Array.from(ubicacionesExistentes)
                .filter(card => card.dataset.tipo === 'OTRO').length;
            nombreGenerado = `Ubicación ${otrosExistentes + 1}`;
    }
    
    // Convertir a mayúsculas antes de retornar
    return nombreGenerado.toUpperCase();
}

function actualizarNombreAutomatico() {
    if (nombreInput.dataset.editadoManualmente === 'true') return;
    const tipo = tipoSelect.value;
    if (!tipo) return;
    const nombreGenerado = generarNombreAutomatico();
    if (nombreGenerado) {
        // Convertir a mayúsculas antes de asignar
        nombreInput.value = nombreGenerado.toUpperCase();
        console.log(`✅ Nombre generado automáticamente: "${nombreInput.value}"`);
    }
}