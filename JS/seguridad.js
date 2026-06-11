// ==================== VISTA ACCESOS REMOTOS ====================
async function cargarVistaAccesosRemotos() {
    mostrarLoading('Cargando accesos remotos...');
    try {
        console.log('%c📋 CARGANDO ACCESOS REMOTOS', 'background: #6f42c1; color: white; font-size: 14px;');

        const { data: accesos } = await window.supabaseClient
            .from('accesos_remotos')
            .select(`*, activo_rel:activo_id (id, nombre, codigo_activo)`)
            .order('creado_el', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        accesos?.forEach(a => { if (a.creado_por) usuariosIds.add(a.creado_por); if (a.modificado_por) usuariosIds.add(a.modificado_por); });

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
                <h2 class="text-2xl font-bold text-primary">Accesos Remotos</h2>
                <button onclick="abrirModalNuevoAccesoRemoto()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Acceso</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarAccesosRemotos('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${accesos?.length || 0}</span></button>
                <button onclick="filtrarAccesosRemotos('activos')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activos">Activos <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${accesos?.filter(a => a.activo).length || 0}</span></button>
                <button onclick="filtrarAccesosRemotos('inactivos')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivos">Inactivos <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${accesos?.filter(a => !a.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="accesos-remotos-grid">
        `;

        if (accesos?.length) {
            accesos.forEach(a => {
                const creadorInfo = usuariosConEmpleados.get(a.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(a.modificado_por);

                html += `
                    <div class="card-item" data-activo="${a.activo ? 'activo' : 'inactivo'}">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2"><i class="fas fa-network-wired text-primary text-xl"></i><span class="font-bold text-primary text-lg truncate">Acceso Remoto</span></div>
                                <p class="text-xs text-gray-500 truncate"><i class="fas fa-desktop mr-1"></i>${a.activo_rel?.nombre || 'Activo no especificado'} ${a.activo_rel?.codigo_activo ? `(${a.activo_rel.codigo_activo})` : ''}</p>
                            </div>
                            <span class="estado-badge ${a.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${a.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="bg-gray-50 p-2 rounded-lg"><p class="flex items-center gap-2"><i class="fas fa-id-card text-primary w-4"></i><span class="font-medium">ID/Puesto:</span><span class="font-mono font-bold">${a.puesto_trabajo || 'No especificado'}</span></p></div>
                            <p class="flex items-center gap-2"><i class="fas fa-user-tag text-primary w-4"></i><span class="font-medium">Perfil:</span> ${a.perfil_nombre || 'No especificado'}</p>
                            <div class="password-container flex items-center gap-2 bg-gray-50 p-2 rounded-lg"><i class="fas fa-lock text-primary w-4"></i><span class="font-medium">Contraseña:</span>${a.perfil_contrasena ? `<span class="font-mono password-mask flex-1" data-password="${a.perfil_contrasena}">••••••••</span><button onclick="event.stopPropagation(); togglePassword(this)" class="text-primary hover:opacity-75"><i class="fas fa-eye"></i></button><button onclick="event.stopPropagation(); copiarPassword('${a.perfil_contrasena}')" class="text-primary hover:opacity-75"><i class="fas fa-copy"></i></button>` : `<span class="text-gray-400 italic flex-1">No configurada</span>`}</div>
                            ${a.observaciones ? `<p class="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded"><i class="fas fa-comment text-primary mr-1"></i>${a.observaciones}</p>` : ''}
                            <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(a.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${a.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(a.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleAccesoRemoto('${a.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarAccesoRemoto('${a.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoAccesoRemoto('${a.id}', ${a.activo})" class="${a.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${a.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="conectarAccesoRemoto('${a.puesto_trabajo}')" class="text-purple-600 hover:opacity-75"><i class="fas fa-plug text-lg"></i></button>
                            <button onclick="eliminarAccesoRemoto('${a.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-network-wired text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay accesos remotos registrados</p><button onclick="abrirModalNuevoAccesoRemoto()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nuevo Acceso</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar accesos remotos');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA CREDENCIALES ====================
async function cargarVistaCredenciales() {
    mostrarLoading('Cargando credenciales...');
    try {
        console.log('%c📋 CARGANDO CREDENCIALES', 'background: #ffc107; color: black; font-size: 14px;');

        const { data: credenciales } = await window.supabaseClient
            .from('credenciales')
            .select(`*, activo_rel:activo_id (id, nombre, codigo_activo)`)
            .order('creado_el', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        credenciales?.forEach(c => { if (c.creado_por) usuariosIds.add(c.creado_por); if (c.modificado_por) usuariosIds.add(c.modificado_por); });

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
                <h2 class="text-2xl font-bold text-primary">Credenciales</h2>
                <button onclick="abrirModalNuevaCredencial()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Credencial</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarCredenciales('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${credenciales?.length || 0}</span></button>
                <button onclick="filtrarCredenciales('WINDOWS')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-btn" data-filter="WINDOWS">Windows <span class="ml-1 bg-blue-200 px-2 py-0.5 rounded-full text-xs">${credenciales?.filter(c => c.tipo === 'WINDOWS').length || 0}</span></button>
                <button onclick="filtrarCredenciales('CORREO')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="CORREO">Correo <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${credenciales?.filter(c => c.tipo === 'CORREO').length || 0}</span></button>
                <button onclick="filtrarCredenciales('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${credenciales?.filter(c => c.activo).length || 0}</span></button>
                <button onclick="filtrarCredenciales('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${credenciales?.filter(c => !c.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="credenciales-grid">
        `;

        if (credenciales?.length) {
            credenciales.forEach(c => {
                const creadorInfo = usuariosConEmpleados.get(c.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(c.modificado_por);
                const icono = c.tipo === 'WINDOWS' ? 'fa-windows' : 'fa-envelope';
                const colorClass = c.tipo === 'WINDOWS' ? 'text-blue-600' : 'text-green-600';
                const expirada = c.fecha_expiracion && new Date(c.fecha_expiracion) < new Date();

                html += `
                    <div class="card-item" data-tipo="${c.tipo}" data-activo="${c.activo}">
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <i class="fab ${icono} ${colorClass} text-xl"></i>
                                    <span class="font-bold text-primary text-lg truncate">${c.tipo === 'WINDOWS' ? 'Cuenta Windows' : 'Cuenta de Correo'}</span>
                                    ${c.es_principal ? '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><i class="fas fa-star text-xs"></i> Principal</span>' : ''}
                                </div>
                                <p class="text-xs text-gray-500 truncate"><i class="fas fa-desktop mr-1"></i>${c.activo_rel?.nombre || 'Activo no especificado'} ${c.activo_rel?.codigo_activo ? `(${c.activo_rel.codigo_activo})` : ''}</p>
                            </div>
                            <div class="flex flex-col gap-1 items-end flex-shrink-0">
                                <span class="estado-badge ${c.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${c.activo ? 'Activa' : 'Inactiva'}</span>
                                ${expirada ? '<span class="estado-badge bg-red-100 text-red-800 text-xs">Expirada</span>' : ''}
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="bg-gray-50 p-2 rounded-lg">
                                <div class="flex items-center gap-2 mb-1">
                                    <i class="fas fa-user text-primary w-4"></i>
                                    <span class="font-medium">Usuario:</span>
                                    <span class="font-mono text-sm">${c.dominio ? `${c.dominio}\\` : ''}${c.usuario}</span>
                                </div>
                                ${c.correo ? `<div class="flex items-center gap-2"><i class="fas fa-envelope text-primary w-4"></i><span class="font-medium">Correo:</span><span class="text-sm">${c.correo}</span></div>` : ''}
                            </div>
                            <div class="password-container flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                <i class="fas fa-lock text-primary w-4"></i>
                                <span class="font-medium">Contraseña:</span>
                                ${c.contrasena ? `<span class="font-mono password-mask flex-1" data-password="${c.contrasena}">••••••••</span><button onclick="event.stopPropagation(); togglePassword(this)" class="text-primary hover:opacity-75"><i class="fas fa-eye"></i></button><button onclick="event.stopPropagation(); copiarPassword('${c.contrasena}')" class="text-primary hover:opacity-75"><i class="fas fa-copy"></i></button>` : `<span class="text-gray-400 italic flex-1">No configurada</span>`}
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                ${c.es_administrador ? `<div class="flex items-center gap-1"><i class="fas fa-shield-alt text-primary"></i><span>Administrador</span></div>` : ''}
                                ${c.ultimo_cambio ? `<div class="flex items-center gap-1"><i class="fas fa-clock text-primary"></i><span>Cambio: ${new Date(c.ultimo_cambio).toLocaleDateString()}</span></div>` : ''}
                                ${c.fecha_expiracion ? `<div class="flex items-center gap-1 col-span-2"><i class="far fa-calendar-alt text-primary"></i><span>Expira: ${new Date(c.fecha_expiracion).toLocaleDateString()}</span>${expirada ? '<span class="text-red-600 ml-1">(Expirada)</span>' : ''}</div>` : ''}
                            </div>
                            ${c.descripcion ? `<p class="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded"><i class="fas fa-comment text-primary mr-1"></i>${c.descripcion}</p>` : ''}
                            <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1">
                                <div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(c.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>
                                ${c.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(c.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}
                            </div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleCredencial('${c.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarCredencial('${c.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoCredencial('${c.id}', ${c.activo})" class="${c.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${c.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="eliminarCredencial('${c.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-key text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay credenciales registradas</p><button onclick="abrirModalNuevaCredencial()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Credencial</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar credenciales');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA TAREAS DE RESPALDO ====================
async function cargarVistaTareasRespaldo() {
    mostrarLoading('Cargando tareas de respaldo...');
    try {
        console.log('%c📋 CARGANDO TAREAS DE RESPALDO', 'background: #20c997; color: white; font-size: 14px;');

        const { data: tareas } = await window.supabaseClient
            .from('tareas_respaldo')
            .select(`*, activo_rel:activo_id (id, nombre, codigo_activo)`)
            .order('creado_el', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        tareas?.forEach(t => { if (t.creado_por) usuariosIds.add(t.creado_por); if (t.modificado_por) usuariosIds.add(t.modificado_por); });

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

        const tipoRespaldoMap = { 'COMPLETO': 'Completo', 'INCREMENTAL': 'Incremental', 'DIFERENCIAL': 'Diferencial', 'VACIO': 'Vacío' };
        const tipoHorarioMap = { 'MANUAL': 'Manual', 'UNA_VEZ': 'Una vez', 'DIARIO': 'Diario', 'SEMANAL': 'Semanal', 'MENSUAL': 'Mensual', 'ANUAL': 'Anual', 'TEMPORALIZADOR': 'Temporalizador', 'INICIO': 'Al inicio' };

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Tareas de Respaldo</h2>
                <button onclick="abrirModalNuevaTareaRespaldo()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Tarea</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarTareasRespaldo('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${tareas?.length || 0}</span></button>
                <button onclick="filtrarTareasRespaldo('activas')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${tareas?.filter(t => t.activo).length || 0}</span></button>
                <button onclick="filtrarTareasRespaldo('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${tareas?.filter(t => !t.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="tareas-respaldo-grid">
        `;

        if (tareas?.length) {
            tareas.forEach(t => {
                const creadorInfo = usuariosConEmpleados.get(t.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(t.modificado_por);
                let diasTexto = '';
                if (t.dias_semana && t.dias_semana.length > 0) {
                    const diasMap = { 'LUNES': 'Lun', 'MARTES': 'Mar', 'MIERCOLES': 'Mié', 'JUEVES': 'Jue', 'VIERNES': 'Vie', 'SABADO': 'Sáb', 'DOMINGO': 'Dom' };
                    diasTexto = t.dias_semana.map(d => diasMap[d] || d).join(', ');
                }

                html += `
                    <div class="card-item" data-activo="${t.activo ? 'activa' : 'inactiva'}">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1 min-w-0"><span class="font-bold text-primary text-lg truncate"><i class="fas fa-database mr-2"></i>${t.nombre_tarea}</span></div>
                            <span class="estado-badge ${t.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ml-2">${t.activo ? 'Activa' : 'Inactiva'}</span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <p class="flex items-center gap-2"><i class="fas fa-desktop text-primary w-4"></i><span class="font-medium">${t.activo_rel?.nombre || 'Activo no especificado'}</span><span class="text-xs text-gray-500">(${t.activo_rel?.codigo_activo || 'Sin código'})</span></p>
                            <p class="flex items-center gap-2"><i class="fas fa-tag text-primary w-4"></i><span class="font-medium">Tipo:</span><span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">${tipoRespaldoMap[t.tipo_respaldo] || t.tipo_respaldo}</span></p>
                            <div class="bg-gray-50 p-2 rounded-lg"><p class="flex items-center gap-2 text-xs mb-1"><i class="fas fa-folder-open text-primary w-4"></i><span class="font-medium">Origen:</span><span class="truncate" title="${t.origen}">${t.origen}</span></p><p class="flex items-center gap-2 text-xs"><i class="fas fa-folder text-primary w-4"></i><span class="font-medium">Destino:</span><span class="truncate" title="${t.destino}">${t.destino}</span></p></div>
                            <div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500"><i class="far fa-clock text-primary mr-1"></i> Horario</p><p class="font-medium text-sm">${tipoHorarioMap[t.tipo_horario] || t.tipo_horario}</p></div>${t.hora_ejecucion ? `<div class="bg-gray-50 p-2 rounded-lg"><p class="text-xs text-gray-500"><i class="fas fa-hourglass-half text-primary mr-1"></i> Hora</p><p class="font-medium text-sm">${t.hora_ejecucion.substring(0,5)}</p></div>` : ''}</div>
                            ${diasTexto ? `<p class="flex items-center gap-2"><i class="fas fa-calendar-week text-primary w-4"></i><span class="font-medium">Días:</span> ${diasTexto}</p>` : ''}
                            <p class="flex items-center gap-2"><i class="fas fa-copy text-primary w-4"></i><span class="font-medium">Copias a conservar:</span><span class="font-bold">${t.copias_conservar || 7}</span></p>
                            <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(t.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${t.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(t.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleTareaRespaldo('${t.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarTareaRespaldo('${t.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoTareaRespaldo('${t.id}', ${t.activo})" class="${t.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${t.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="eliminarTareaRespaldo('${t.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-database text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay tareas de respaldo registradas</p><button onclick="abrirModalNuevaTareaRespaldo()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Tarea</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar tareas de respaldo');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD ACCESOS REMOTOS ====================
window.editarAccesoRemoto = async function(id) {
    console.log('🔍 Editando acceso remoto ID:', id);
    mostrarLoading('Cargando acceso remoto...');
    
    try {
        const { data: acceso, error } = await window.supabaseClient
            .from('accesos_remotos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;

        editandoId = id;
        document.getElementById('accesoRemotoModalTitle').innerText = 'Editar Acceso Remoto';

        await cargarActivosSelect('acceso_activo_id');

        document.getElementById('acceso_activo_id').value = acceso.activo_id || '';
        document.getElementById('acceso_puesto').value = acceso.puesto_trabajo || '';
        
        // Establecer el valor del select según el perfil guardado
        const perfilSelect = document.getElementById('acceso_perfil_nombre');
        if (perfilSelect) {
            perfilSelect.value = acceso.perfil_nombre || '';
        }

        if (acceso.perfil_contrasena) {
            const contrasena = desencriptarPassword(acceso.perfil_contrasena);
            document.getElementById('acceso_contrasena').value = contrasena;
        } else {
            document.getElementById('acceso_contrasena').value = '';
        }

        document.getElementById('acceso_observaciones').value = acceso.observaciones || '';
        document.getElementById('acceso_activo').value = acceso.activo ? 'true' : 'false';

        ocultarLoading();
        
        // Abrir el modal
        const modal = document.getElementById('accesoRemotoModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.offsetHeight;
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el acceso remoto: ' + error.message, 'error');
    }
};

window.eliminarAccesoRemoto = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar acceso remoto?',
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
            // Obtener el activo_id antes de eliminar
            const { data: acceso } = await window.supabaseClient
                .from('accesos_remotos')
                .select('activo_id')
                .eq('id', id)
                .single();
            
            const activoId = acceso?.activo_id;
            
            const { error } = await window.supabaseClient
                .from('accesos_remotos')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Acceso remoto eliminado', 'success');
            
            // Si hay un activoId y la función existe, refrescar el modal de accesos
            if (activoId && typeof window.verAccesosPorActivo === 'function') {
                await window.verAccesosPorActivo(activoId);
            } else {
                await cargarVistaAccesosRemotos();
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

// ==================== GUARDAR ACCESO REMOTO ====================
window.guardarAccesoRemoto = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando acceso remoto...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const contrasena = document.getElementById('acceso_contrasena')?.value || '';
        const contrasenaEncriptada = contrasena ? encriptarPassword(contrasena) : '';
        
        const data = {
            activo_id: document.getElementById('acceso_activo_id').value,
            puesto_trabajo: document.getElementById('acceso_puesto').value,
            perfil_nombre: document.getElementById('acceso_perfil_nombre').value,
            perfil_contrasena: contrasenaEncriptada,
            observaciones: document.getElementById('acceso_observaciones')?.value || null,
            activo: document.getElementById('acceso_activo').value === 'true'
        };

        // Validaciones
        if (!data.activo_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un activo', 'error');
            document.getElementById('acceso_activo_id').focus();
            return;
        }
        
        if (!data.puesto_trabajo) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe ingresar el ID/Puesto de trabajo', 'error');
            document.getElementById('acceso_puesto').focus();
            return;
        }
        
        if (!data.perfil_nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un perfil', 'error');
            document.getElementById('acceso_perfil_nombre').focus();
            return;
        }

        let isEdit = false;
        let activoId = data.activo_id;
        
        if (editandoId) {
            // MODO EDICIÓN
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('accesos_remotos')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
            isEdit = true;
        } else {
            // MODO CREACIÓN
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('accesos_remotos')
                .insert(data);
            if (error) throw error;
        }
        
        ocultarLoading();
        mostrarAlerta('Éxito', isEdit ? 'Acceso remoto actualizado correctamente' : 'Acceso remoto creado correctamente', 'success');
        
        cerrarModal('accesoRemotoModal');
        editandoId = null;
        
        // ============================================
        // ACTUALIZAR CONTADOR EN EL CARD
        // ============================================
        if (vistaActual === 'activos') {
            setTimeout(async () => {
                if (typeof window.actualizarContadorAccesosEnCard === 'function') {
                    await window.actualizarContadorAccesosEnCard(activoId);
                }
            }, 500);
        }
        
        // Recargar modal de ver accesos remotos si está abierto
        const swalModal = document.querySelector('.swal2-container');
        const isSwalOpen = swalModal && swalModal.style.display !== 'none';
        
        if (isSwalOpen && swalModal.innerText.includes('Accesos')) {
            setTimeout(async () => {
                if (typeof window.verAccesosPorActivo === 'function') {
                    await window.verAccesosPorActivo(activoId);
                }
            }, 600);
        }
        
        // Recargar vista si es necesario
        if (vistaActual === 'accesosRemotos') {
            await cargarVistaAccesosRemotos();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error al guardar acceso remoto:', error);
        
        let mensajeError = 'No se pudo guardar el acceso remoto';
        if (error.code === '23502') {
            mensajeError = 'El campo de contraseña es obligatorio. Por favor, ingrese una contraseña.';
        } else if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe un acceso remoto con este ID/Puesto para este activo';
        } else if (error.message?.includes('foreign key')) {
            mensajeError = 'El activo seleccionado no es válido';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

window.toggleEstadoAccesoRemoto = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} acceso remoto?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} este acceso remoto.`,
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
                .from('accesos_remotos')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Acceso remoto ${accion}do correctamente`, 'success');
            await cargarVistaAccesosRemotos();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== CRUD CREDENCIALES ====================
window.editarCredencial = async function(id) {
    console.log('🔍 Editando credencial ID:', id);
    mostrarLoading('Cargando credencial...');
    
    try {
        const { data: credencial, error } = await window.supabaseClient
            .from('credenciales')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;

        editandoId = id;
        document.getElementById('credencialModalTitle').innerText = 'Editar Credencial';

        await cargarActivosSelect('credencial_activo_id');

        document.getElementById('credencial_activo_id').value = credencial.activo_id || '';
        document.getElementById('credencial_tipo').value = credencial.tipo || '';
        document.getElementById('credencial_usuario').value = credencial.usuario || '';
        document.getElementById('credencial_dominio').value = credencial.dominio || '';
        document.getElementById('credencial_correo').value = credencial.correo || '';

        if (credencial.contrasena) {
            const contrasena = desencriptarPassword(credencial.contrasena);
            document.getElementById('credencial_contrasena').value = contrasena;
        } else {
            document.getElementById('credencial_contrasena').value = '';
        }

        document.getElementById('credencial_descripcion').value = credencial.descripcion || '';
        document.getElementById('credencial_es_admin').checked = credencial.es_administrador || false;
        document.getElementById('credencial_es_principal').checked = credencial.es_principal || false;
        document.getElementById('credencial_fecha_expiracion').value = credencial.fecha_expiracion || '';
        document.getElementById('credencial_activo').value = credencial.activo ? 'true' : 'false';

        const tipo = credencial.tipo;
        const campoDominio = document.getElementById('campo_dominio');
        const campoCorreo = document.getElementById('campo_correo');
        const campoAdmin = document.getElementById('campo_admin');

        if (campoDominio) campoDominio.classList.remove('hidden');
        if (campoCorreo) campoCorreo.classList.add('hidden');
        if (campoAdmin) campoAdmin.classList.add('hidden');

        if (tipo === 'WINDOWS' && campoAdmin) {
            campoAdmin.classList.remove('hidden');
        } else if (tipo === 'CORREO' && campoDominio && campoCorreo) {
            campoDominio.classList.add('hidden');
            campoCorreo.classList.remove('hidden');
        }

        ocultarLoading();
        
        // Abrir el modal
        const modal = document.getElementById('credencialModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.offsetHeight;
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la credencial: ' + error.message, 'error');
    }
};

window.eliminarCredencial = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar credencial?',
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
                .from('credenciales')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Credencial eliminada', 'success');
            await cargarVistaCredenciales();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarCredencial = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando credencial...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        const contrasena = document.getElementById('credencial_contrasena')?.value || '';
        
        // Encriptar contraseña si existe
        const contrasenaEncriptada = contrasena ? encriptarPassword(contrasena) : '';
        
        const activoId = document.getElementById('credencial_activo_id').value;
        const esPrincipal = document.getElementById('credencial_es_principal')?.checked || false;

        // Si esta credencial se marca como principal, actualizar las demás credenciales del mismo activo
        if (esPrincipal) {
            await window.supabaseClient
                .from('credenciales')
                .update({ es_principal: false })
                .eq('activo_id', activoId)
                .eq('es_principal', true);
            
            if (editandoId) {
                await window.supabaseClient
                    .from('credenciales')
                    .update({ es_principal: false })
                    .eq('activo_id', activoId)
                    .eq('es_principal', true)
                    .neq('id', editandoId);
            }
        }

        const data = {
            activo_id: activoId,
            tipo: document.getElementById('credencial_tipo').value,
            usuario: document.getElementById('credencial_usuario').value,
            dominio: document.getElementById('credencial_dominio')?.value || null,
            correo: document.getElementById('credencial_correo')?.value || null,
            contrasena: contrasenaEncriptada,
            descripcion: document.getElementById('credencial_descripcion')?.value || null,
            es_administrador: document.getElementById('credencial_es_admin')?.checked || false,
            es_principal: esPrincipal,
            fecha_expiracion: document.getElementById('credencial_fecha_expiracion')?.value || null,
            ultimo_cambio: contrasena ? ahora : null,
            activo: document.getElementById('credencial_activo')?.value === 'true'
        };

        if (!data.activo_id || !data.tipo || !data.usuario) {
            ocultarLoading();
            mostrarAlerta('Error', 'Complete los campos obligatorios', 'error');
            return;
        }

        let isEdit = false;
        
        if (editandoId) {
            // MODO EDICIÓN
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('credenciales')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
            isEdit = true;
        } else {
            // MODO CREACIÓN
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('credenciales')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', isEdit ? 'Credencial actualizada correctamente' : 'Credencial guardada correctamente', 'success');
        
        cerrarModal('credencialModal');
        const activoIdTemp = activoId;
        editandoId = null;
        
        // ============================================
        // ACTUALIZAR CONTADOR EN EL CARD
        // ============================================
        if (vistaActual === 'activos') {
            setTimeout(async () => {
                if (typeof window.actualizarContadorCredencialesEnCard === 'function') {
                    await window.actualizarContadorCredencialesEnCard(activoIdTemp);
                }
            }, 500);
        }
        
        // Recargar modal de ver credenciales si está abierto
        const swalModal = document.querySelector('.swal2-container');
        const isSwalOpen = swalModal && swalModal.style.display !== 'none';
        
        if (isSwalOpen && swalModal.innerText.includes('Credenciales')) {
            setTimeout(async () => {
                if (typeof window.verCredencialesPorActivo === 'function') {
                    await window.verCredencialesPorActivo(activoIdTemp);
                }
            }, 600);
        }
        
        // Recargar vista si es necesario
        if (vistaActual === 'credenciales') {
            await cargarVistaCredenciales();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error al guardar credencial:', error);
        
        if (error.code === '23502') {
            mostrarAlerta('Error', 'El campo de contraseña es obligatorio. Por favor, ingrese una contraseña o contacte al administrador.', 'error');
        } else {
            mostrarAlerta('Error', 'No se pudo guardar la credencial: ' + (error.message || 'Error desconocido'), 'error');
        }
    }
};

window.toggleEstadoCredencial = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} credencial?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta credencial.`,
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
                .from('credenciales')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Credencial ${accion}da correctamente`, 'success');
            await cargarVistaCredenciales();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== CRUD TAREAS DE RESPALDO ====================
window.editarTareaRespaldo = async function(id) {
    console.log('🔍 Editando tarea de respaldo ID:', id);
    mostrarLoading('Cargando tarea de respaldo...');
    
    try {
        const { data: tarea, error } = await window.supabaseClient
            .from('tareas_respaldo')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;

        editandoId = id;
        document.getElementById('tareaRespaldoModalTitle').innerText = 'Editar Tarea de Respaldo';

        await cargarActivosSelect('tarea_activo_id');

        document.getElementById('tarea_activo_id').value = tarea.activo_id || '';
        document.getElementById('tarea_nombre').value = tarea.nombre_tarea || '';
        document.getElementById('tarea_tipo').value = tarea.tipo_respaldo || '';
        document.getElementById('tarea_origen').value = tarea.origen || '';
        document.getElementById('tarea_destino').value = tarea.destino || '';
        document.getElementById('tarea_horario').value = tarea.tipo_horario || '';

        if (typeof window.toggleDiasSemana === 'function') {
            window.toggleDiasSemana();
        }

        document.getElementById('tarea_hora').value = tarea.hora_ejecucion ? tarea.hora_ejecucion.substring(0, 5) : '';
        document.getElementById('tarea_copias').value = tarea.copias_conservar || 7;
        document.getElementById('tarea_activo').value = tarea.activo ? 'true' : 'false';

        if (tarea.tipo_horario === 'SEMANAL' && tarea.dias_semana && Array.isArray(tarea.dias_semana)) {
            if (typeof window.setDiasSeleccionados === 'function') {
                window.setDiasSeleccionados(tarea.dias_semana);
            }
        }

        ocultarLoading();
        
        // Abrir el modal
        const modal = document.getElementById('tareaRespaldoModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.offsetHeight;
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la tarea de respaldo: ' + error.message, 'error');
    }
};

window.eliminarTareaRespaldo = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar tarea de respaldo?',
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
                .from('tareas_respaldo')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Tarea eliminada', 'success');
            await cargarVistaTareasRespaldo();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

// ==================== GUARDAR TAREA DE RESPALDO ====================
window.guardarTareaRespaldo = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando tarea de respaldo...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        // Obtener días seleccionados para horario semanal
        let diasSemana = null;
        const tipoHorario = document.getElementById('tarea_horario')?.value;
        if (tipoHorario === 'SEMANAL') {
            diasSemana = window.getDiasSeleccionados ? window.getDiasSeleccionados() : [];
        }

        const data = {
            activo_id: document.getElementById('tarea_activo_id').value,
            nombre_tarea: document.getElementById('tarea_nombre').value,
            tipo_respaldo: document.getElementById('tarea_tipo').value,
            origen: document.getElementById('tarea_origen').value,
            destino: document.getElementById('tarea_destino').value,
            tipo_horario: tipoHorario,
            dias_semana: diasSemana && diasSemana.length > 0 ? diasSemana : null,
            hora_ejecucion: document.getElementById('tarea_hora')?.value || null,
            copias_conservar: parseInt(document.getElementById('tarea_copias')?.value) || 7,
            activo: document.getElementById('tarea_activo')?.value === 'true'
        };

        // Validaciones
        if (!data.activo_id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un activo', 'error');
            document.getElementById('tarea_activo_id').focus();
            return;
        }
        
        if (!data.nombre_tarea) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe ingresar un nombre para la tarea', 'error');
            document.getElementById('tarea_nombre').focus();
            return;
        }
        
        if (!data.tipo_respaldo) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un tipo de respaldo', 'error');
            document.getElementById('tarea_tipo').focus();
            return;
        }
        
        if (!data.origen) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe especificar la ruta de origen', 'error');
            document.getElementById('tarea_origen').focus();
            return;
        }
        
        if (!data.destino) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe especificar la ruta de destino', 'error');
            document.getElementById('tarea_destino').focus();
            return;
        }
        
        if (!data.tipo_horario) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe seleccionar un tipo de horario', 'error');
            document.getElementById('tarea_horario').focus();
            return;
        }

        let isEdit = false;
        let activoId = data.activo_id;
        
        if (editandoId) {
            // MODO EDICIÓN
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('tareas_respaldo')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
            isEdit = true;
        } else {
            // MODO CREACIÓN
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('tareas_respaldo')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', isEdit ? 'Tarea de respaldo actualizada correctamente' : 'Tarea de respaldo guardada correctamente', 'success');
        
        cerrarModal('tareaRespaldoModal');
        editandoId = null;
        
        // ============================================
        // ACTUALIZAR CONTADOR EN EL CARD
        // ============================================
        if (vistaActual === 'activos') {
            setTimeout(async () => {
                if (typeof window.actualizarContadorRespaldosEnCard === 'function') {
                    await window.actualizarContadorRespaldosEnCard(activoId);
                }
            }, 500);
        }
        
        // Recargar modal de ver respaldos si está abierto
        const swalModal = document.querySelector('.swal2-container');
        const isSwalOpen = swalModal && swalModal.style.display !== 'none';
        
        if (isSwalOpen && swalModal.innerText.includes('Respaldo')) {
            setTimeout(async () => {
                if (typeof window.verRespaldosPorActivo === 'function') {
                    await window.verRespaldosPorActivo(activoId);
                }
            }, 600);
        }
        
        // Recargar vista si es necesario
        if (vistaActual === 'tareasRespaldo') {
            await cargarVistaTareasRespaldo();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error al guardar tarea de respaldo:', error);
        
        let mensajeError = 'No se pudo guardar la tarea de respaldo';
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe una tarea con este nombre para este activo';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

window.toggleEstadoTareaRespaldo = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} tarea de respaldo?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta tarea de respaldo.`,
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
                .from('tareas_respaldo')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Tarea de respaldo ${accion}da correctamente`, 'success');
            await cargarVistaTareasRespaldo();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalNuevoAccesoRemoto = async function() {
    const modal = document.getElementById('accesoRemotoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('accesoRemotoModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('accesoRemotoForm');
    if (form) form.reset();
    const titleElement = document.getElementById('accesoRemotoModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Acceso Remoto';
    const activoSelect = document.getElementById('acceso_activo');
    if (activoSelect) activoSelect.value = 'true';
    const contrasenaInput = document.getElementById('acceso_contrasena');
    if (contrasenaInput) contrasenaInput.value = '';
    
    // Resetear el select de perfil a su valor por defecto
    const perfilSelect = document.getElementById('acceso_perfil_nombre');
    if (perfilSelect) perfilSelect.value = '';

    try {
        await cargarActivosSelect('acceso_activo_id');
    } catch (error) {
        console.error('❌ Error cargando activos:', error);
    }

    await window.abrirModal('accesoRemotoModal');
};

window.abrirModalNuevaCredencial = async function() {
    const modal = document.getElementById('credencialModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('credencialModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('credencialForm');
    if (form) form.reset();
    const titleElement = document.getElementById('credencialModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Credencial';
    const activoSelect = document.getElementById('credencial_activo');
    if (activoSelect) activoSelect.value = 'true';
    const esAdminCheck = document.getElementById('credencial_es_admin');
    if (esAdminCheck) esAdminCheck.checked = false;
    const esPrincipalCheck = document.getElementById('credencial_es_principal');
    if (esPrincipalCheck) esPrincipalCheck.checked = false;

    const campoCorreo = document.getElementById('campo_correo');
    const campoAdmin = document.getElementById('campo_admin');
    if (campoCorreo) campoCorreo.classList.add('hidden');
    if (campoAdmin) campoAdmin.classList.add('hidden');

    try {
        await cargarActivosSelect('credencial_activo_id');
    } catch (error) {
        console.error('❌ Error cargando activos:', error);
    }

    await window.abrirModal('credencialModal');
};

window.abrirModalNuevaTareaRespaldo = async function() {
    console.log('🎯 Abriendo modal de nueva tarea de respaldo');
    
    // Cerrar modal si está abierto
    const modal = document.getElementById('tareaRespaldoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('tareaRespaldoModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    editandoId = null;
    
    // Resetear formulario
    const form = document.getElementById('tareaRespaldoForm');
    if (form) form.reset();
    
    // Actualizar título
    const titleElement = document.getElementById('tareaRespaldoModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Tarea de Respaldo';
    
    // Valores por defecto
    const activoSelect = document.getElementById('tarea_activo');
    if (activoSelect) activoSelect.value = 'true';
    
    const copiasInput = document.getElementById('tarea_copias');
    if (copiasInput) copiasInput.value = '7';
    
    // Ocultar selector de días
    const diasContainer = document.getElementById('dias-semana-container');
    if (diasContainer) diasContainer.classList.add('hidden');
    
    // Desmarcar todos los días
    document.querySelectorAll('.dia-semana').forEach(cb => cb.checked = false);
    
    try {
        await cargarActivosSelect('tarea_activo_id');
    } catch (error) {
        console.error('❌ Error cargando activos:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los activos', 'error');
    }
    
    // Abrir el modal
    await window.abrirModal('tareaRespaldoModal');
};

// ==================== FUNCIONES AUXILIARES ====================
window.conectarAccesoRemoto = function(puesto) {
    if (!puesto || puesto.trim() === '') {
        mostrarAlerta('Error', 'No hay ID de puesto configurado para este acceso remoto', 'error');
        return;
    }

    Swal.fire({
        title: 'Conectar Acceso Remoto',
        html: `
            <div class="text-left space-y-3">
                <p class="text-gray-600">ID/Puesto: <strong class="text-primary font-mono">${puesto}</strong></p>
                <div class="grid grid-cols-2 gap-3 mt-3">
                    <button id="btnAnyDesk" class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"><i class="fab fa-anydesk"></i> AnyDesk</button>
                </div>
                <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm"><i class="fas fa-info-circle text-primary mr-1"></i><span class="text-gray-600">Selecciona el software para iniciar la conexión. Si no está instalado, copia el ID manualmente.</span></div>
                <div class="mt-2"><button id="btnCopiarId" class="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"><i class="fas fa-copy"></i> Copiar ID al portapapeles</button></div>
            </div>
        `,
        icon: 'info',
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Cerrar',
        showConfirmButton: true,
        showCancelButton: false,
        didOpen: () => {
            const btnAnyDesk = document.getElementById('btnAnyDesk');
            if (btnAnyDesk) {
                btnAnyDesk.onclick = () => {
                    window.open(`anydesk:${puesto}`, '_blank');
                    Swal.fire({ title: 'Conectando con AnyDesk', text: `Se está abriendo AnyDesk para conectar con el ID: ${puesto}`, icon: 'info', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
                };
            }

            const btnCopiarId = document.getElementById('btnCopiarId');
            if (btnCopiarId) {
                btnCopiarId.onclick = async () => {
                    await navigator.clipboard.writeText(puesto);
                    Swal.fire({ title: 'ID Copiado', text: `El ID ${puesto} ha sido copiado al portapapeles`, icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                };
            }
        }
    });
};

function getDiasSeleccionados() {
    const checkboxes = document.querySelectorAll('.dia-semana:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function setDiasSeleccionados(dias) {
    if (!dias || !Array.isArray(dias)) return;
    const checkboxes = document.querySelectorAll('.dia-semana');
    checkboxes.forEach(cb => {
        cb.checked = dias.includes(cb.value);
    });
}

window.toggleDiasSemana = function() {
    const horarioSelect = document.getElementById('tarea_horario');
    const container = document.getElementById('dias-semana-container');

    if (!horarioSelect || !container) return;

    const horario = horarioSelect.value;
    if (horario === 'SEMANAL') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        const checkboxes = document.querySelectorAll('.dia-semana');
        checkboxes.forEach(cb => { cb.checked = false; });
    }
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleAccesoRemoto = async function(id) {
    mostrarLoading('Cargando detalles del acceso remoto...');
    try {
        const { data: acceso, error } = await window.supabaseClient
            .from('accesos_remotos')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        let activo = null;
        if (acceso.activo_id) {
            const { data: act } = await window.supabaseClient
                .from('activos')
                .select('nombre, codigo_activo')
                .eq('id', acceso.activo_id)
                .single();
            activo = act;
        }

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(acceso.creado_por);
        const modificadorInfo = acceso.modificado_por ? await obtenerInfoUsuarioConEmpleado(acceso.modificado_por) : null;

        ocultarLoading();
        Swal.fire({
            title: 'Detalles del Acceso Remoto',
            width: '600px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-network-wired"></i> Acceso Remoto</h3><p><span class="font-semibold">Software:</span> AnyDesk / TeamViewer</p></div>${activo ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-desktop"></i> Activo Asociado</h3><p><span class="font-semibold">Nombre:</span> ${activo.nombre}</p><p><span class="font-semibold">Código:</span> ${activo.codigo_activo || 'N/A'}</p></div>` : ''}<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning"><h3 class="font-bold text-warning mb-3"><i class="fas fa-id-card"></i> Datos de Acceso</h3><p><span class="font-semibold">ID/Puesto:</span> ${acceso.puesto_trabajo}</p><p><span class="font-semibold">Perfil:</span> ${acceso.perfil_nombre}</p><div class="password-container flex items-center gap-2 mt-2"><span class="font-semibold">Contraseña:</span>${acceso.perfil_contrasena ? `<span class="font-mono password-mask" data-password="${acceso.perfil_contrasena}">••••••••</span><button onclick="togglePassword(this)" class="text-primary"><i class="fas fa-eye"></i></button><button onclick="copiarPassword('${acceso.perfil_contrasena}')" class="text-primary"><i class="fas fa-copy"></i></button>` : `<span class="text-gray-400 italic">No configurada</span>`}</div>${acceso.observaciones ? `<p class="mt-2"><span class="font-semibold">Observaciones:</span> ${acceso.observaciones}</p>` : ''}</div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${acceso.creado_el ? new Date(acceso.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${creadorInfo.nombre}</span></p></div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${acceso.modificado_el ? new Date(acceso.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary">${modificadorInfo.nombre}</span></p></div>` : ''}</div></div></div>`,
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

window.verDetalleCredencial = async function(id) {
    mostrarLoading('Cargando detalles de la credencial...');
    try {
        const { data: credencial, error } = await window.supabaseClient
            .from('credenciales')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        let activo = null;
        if (credencial.activo_id) {
            const { data: act } = await window.supabaseClient
                .from('activos')
                .select('nombre, codigo_activo')
                .eq('id', credencial.activo_id)
                .single();
            activo = act;
        }

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(credencial.creado_por);
        const modificadorInfo = credencial.modificado_por ? await obtenerInfoUsuarioConEmpleado(credencial.modificado_por) : null;

        const expirada = credencial.fecha_expiracion && new Date(credencial.fecha_expiracion) < new Date();
        const icono = credencial.tipo === 'WINDOWS' ? 'fa-windows' : 'fa-envelope';
        const colorClass = credencial.tipo === 'WINDOWS' ? 'text-blue-600' : 'text-green-600';

        ocultarLoading();
        Swal.fire({
            title: `Detalles de Credencial`,
            width: '600px',
            html: `<div class="text-left space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary">
                    <h3 class="font-bold text-primary mb-3 flex items-center gap-2">
                        <i class="fas ${icono} ${colorClass}"></i> 
                        ${credencial.tipo === 'WINDOWS' ? 'Cuenta Windows' : 'Cuenta de Correo'}
                        ${credencial.es_principal ? '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ml-2"><i class="fas fa-star text-xs"></i> Principal</span>' : ''}
                    </h3>
                    <div class="space-y-2">
                        <p><span class="font-semibold">Usuario:</span> ${credencial.dominio ? `${credencial.dominio}\\` : ''}${credencial.usuario}</p>
                        ${credencial.correo ? `<p><span class="font-semibold">Correo:</span> ${credencial.correo}</p>` : ''}
                        ${credencial.es_administrador ? `<p><span class="font-semibold">Tipo:</span> Administrador</p>` : ''}
                        <div class="password-container flex items-center gap-2 mt-2">
                            <span class="font-semibold">Contraseña:</span>
                            ${credencial.contrasena ? `<span class="font-mono password-mask" data-password="${credencial.contrasena}">••••••••</span><button onclick="togglePassword(this)" class="text-primary"><i class="fas fa-eye"></i></button>` : `<span class="text-gray-400 italic">No configurada</span>`}
                        </div>
                        <p><span class="font-semibold">Estado:</span> <span class="${credencial.activo ? 'text-green-600' : 'text-red-600'} font-semibold">${credencial.activo ? 'Activa' : 'Inactiva'}</span></p>
                    </div>
                </div>
                ${activo ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-desktop"></i> Activo Asociado</h3><p><span class="font-semibold">Nombre:</span> ${activo.nombre}</p><p><span class="font-semibold">Código:</span> ${activo.codigo_activo || 'N/A'}</p></div>` : ''}
                ${credencial.fecha_expiracion ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning"><h3 class="font-bold text-warning mb-2">Fecha de Expiración</h3><p class="${expirada ? 'text-red-600 font-bold' : ''}">${new Date(credencial.fecha_expiracion).toLocaleDateString()}${expirada ? ' (Expirada)' : ''}</p></div>` : ''}
                ${credencial.descripcion ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400"><h3 class="font-bold text-gray-600 mb-2">Descripción</h3><p>${credencial.descripcion}</p></div>` : ''}
                <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500"><h3 class="font-bold text-purple-700 mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${credencial.creado_el ? new Date(credencial.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p></div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${credencial.modificado_el ? new Date(credencial.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p></div>` : ''}</div></div>
            </div>`,
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

window.verDetalleTareaRespaldo = async function(id) {
    mostrarLoading('Cargando detalles de la tarea de respaldo...');
    try {
        const { data: tarea, error } = await window.supabaseClient
            .from('tareas_respaldo')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        let activo = null;
        if (tarea.activo_id) {
            const { data: act } = await window.supabaseClient
                .from('activos')
                .select('nombre, codigo_activo')
                .eq('id', tarea.activo_id)
                .single();
            activo = act;
        }

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(tarea.creado_por);
        const modificadorInfo = tarea.modificado_por ? await obtenerInfoUsuarioConEmpleado(tarea.modificado_por) : null;

        const tipoRespaldoMap = { 'COMPLETO': 'Completo', 'INCREMENTAL': 'Incremental', 'DIFERENCIAL': 'Diferencial', 'VACIO': 'Vacío' };
        const tipoHorarioMap = { 'MANUAL': 'Manual', 'UNA_VEZ': 'Una vez', 'DIARIO': 'Diario', 'SEMANAL': 'Semanal', 'MENSUAL': 'Mensual', 'ANUAL': 'Anual', 'TEMPORALIZADOR': 'Temporalizador', 'INICIO': 'Al inicio' };
        let diasTexto = '';
        if (tarea.dias_semana && tarea.dias_semana.length > 0) {
            const diasMap = { 'LUNES': 'Lunes', 'MARTES': 'Martes', 'MIERCOLES': 'Miércoles', 'JUEVES': 'Jueves', 'VIERNES': 'Viernes', 'SABADO': 'Sábado', 'DOMINGO': 'Domingo' };
            diasTexto = tarea.dias_semana.map(d => diasMap[d] || d).join(', ');
        }

        ocultarLoading();
        Swal.fire({
            title: `Detalles de Tarea: ${tarea.nombre_tarea}`,
            width: '700px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-database"></i> Información General</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Nombre:</span> ${tarea.nombre_tarea}</p><p><span class="font-semibold">Software:</span> Cobian Reflector (sistema)</p><p><span class="font-semibold">Estado:</span> <span class="${tarea.activo ? 'text-green-600' : 'text-red-600'} font-semibold">${tarea.activo ? 'Activa' : 'Inactiva'}</span></p></div></div>${activo ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-desktop"></i> Activo Asociado</h3><p><span class="font-semibold">Nombre:</span> ${activo.nombre}</p><p><span class="font-semibold">Código:</span> ${activo.codigo_activo || 'N/A'}</p></div>` : ''}<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning"><h3 class="font-bold text-warning mb-3"><i class="fas fa-clipboard-list"></i> Detalles del Respaldo</h3><div class="space-y-2"><p><span class="font-semibold">Tipo:</span> ${tipoRespaldoMap[tarea.tipo_respaldo] || tarea.tipo_respaldo}</p><p><span class="font-semibold">Origen:</span> ${tarea.origen}</p><p><span class="font-semibold">Destino:</span> ${tarea.destino}</p><p><span class="font-semibold">Horario:</span> ${tipoHorarioMap[tarea.tipo_horario] || tarea.tipo_horario}</p>${tarea.hora_ejecucion ? `<p><span class="font-semibold">Hora:</span> ${tarea.hora_ejecucion.substring(0,5)}</p>` : ''}${diasTexto ? `<p><span class="font-semibold">Días:</span> ${diasTexto}</p>` : ''}<p><span class="font-semibold">Copias a conservar:</span> ${tarea.copias_conservar || 7}</p></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${tarea.creado_el ? new Date(tarea.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${tarea.modificado_el ? new Date(tarea.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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
window.filtrarAccesosRemotos = function(filtro) {
    const cards = document.querySelectorAll('#accesos-remotos-grid .card-item');
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

window.filtrarTareasRespaldo = function(filtro) {
    const cards = document.querySelectorAll('#tareas-respaldo-grid .card-item');
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

window.filtrarCredenciales = function(filtro) {
    const cards = document.querySelectorAll('#credenciales-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === filtro || (filtro === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        if (filtro === 'WINDOWS' || filtro === 'CORREO') mostrar = card.dataset.tipo === filtro;
        else if (filtro === 'activas') mostrar = card.dataset.activo === 'true';
        else if (filtro === 'inactivas') mostrar = card.dataset.activo === 'false';
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

// ==================== VISTA ADMINISTRACIÓN USUARIOS-EMPRESAS ====================
async function cargarVistaAsignacionUsuariosEmpresas() {
    mostrarLoading('Cargando asignaciones...');
    
    try {
        console.log('%c📋 CARGANDO ASIGNACIONES USUARIOS-EMPRESAS', 'background: #6f42c1; color: white; font-size: 14px;');
        
        // Verificar que el usuario sea ADMINISTRADOR
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        // ============================================
        // PASO 1: OBTENER TODOS LOS ROLES
        // ============================================
        const { data: roles, error: errorRoles } = await window.supabaseClient
            .from('roles')
            .select('id, nombre');
        
        if (errorRoles) {
            console.error('Error obteniendo roles:', errorRoles);
        }
        
        console.log('📌 Roles disponibles:', roles);
        
        // Encontrar el ID del rol OPERADOR_EMPRESA
        const rolOperador = roles?.find(r => r.nombre === 'OPERADOR_EMPRESA');
        
        if (!rolOperador) {
            console.error('❌ No se encontró el rol OPERADOR_EMPRESA');
            ocultarLoading();
            document.getElementById('dynamicContent').innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-orange-500 mb-4"></i>
                    <h2 class="text-xl font-bold text-gray-800 mb-2">Error: Rol no encontrado</h2>
                    <p class="text-gray-500">No se encontró el rol "OPERADOR_EMPRESA" en la base de datos.</p>
                    <p class="text-gray-400 text-sm mt-2">Contacte al administrador del sistema.</p>
                </div>
            `;
            return;
        }
        
        console.log('✅ Rol OPERADOR_EMPRESA ID:', rolOperador.id);
        
        // ============================================
        // PASO 2: OBTENER USUARIOS CON ROL OPERADOR_EMPRESA
        // ============================================
        const { data: operadores, error: errorOperadores } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id, activo')
            .eq('rol_id', rolOperador.id)
            .order('correo');
        
        if (errorOperadores) {
            console.error('Error obteniendo operadores:', errorOperadores);
            throw errorOperadores;
        }
        
        console.log('📌 Operadores encontrados:', operadores?.length || 0);
        
        // ============================================
        // PASO 3: OBTENER INFORMACIÓN DE EMPLEADOS
        // ============================================
        const empleadosIds = operadores?.filter(op => op.empleado_id).map(op => op.empleado_id) || [];
        let empleadosMap = new Map();
        
        if (empleadosIds.length > 0) {
            const { data: empleados, error: errorEmpleados } = await window.supabaseClient
                .from('empleados')
                .select('id, nombre_completo, puesto')
                .in('id', empleadosIds);
            
            if (!errorEmpleados && empleados) {
                empleados.forEach(emp => {
                    empleadosMap.set(emp.id, emp);
                });
            }
        }
        
        // Combinar datos de operadores con empleados
        const operadoresConEmpleados = operadores?.map(op => ({
            ...op,
            empleado: empleadosMap.get(op.empleado_id) || null
        })) || [];
        
        // Filtrar solo activos
        const operadoresActivos = operadoresConEmpleados.filter(op => op.activo === true);
        
        console.log('✅ Operadores activos:', operadoresActivos.length);
        
        // ============================================
        // PASO 4: OBTENER EMPRESAS
        // ============================================
        const { data: empresas, error: errorEmpresas } = await window.supabaseClient
            .from('empresas')
            .select('id, nombre, ruc')
            .eq('activo', true)
            .order('nombre');
        
        if (errorEmpresas) throw errorEmpresas;
        
        console.log('📌 Empresas encontradas:', empresas?.length || 0);
        
        // ============================================
        // PASO 5: OBTENER ASIGNACIONES EXISTENTES
        // ============================================
        const { data: asignaciones, error: errorAsig } = await window.supabaseClient
            .from('usuarios_empresas')
            .select('*');
        
        if (errorAsig) throw errorAsig;
        
        console.log('📌 Asignaciones encontradas:', asignaciones?.length || 0);
        
        // Contar asignaciones por operador
        const asignacionesPorOperador = new Map();
        asignaciones?.forEach(asig => {
            const count = asignacionesPorOperador.get(asig.usuario_id) || 0;
            asignacionesPorOperador.set(asig.usuario_id, count + 1);
        });
        
        // Empresas con asignación
        const empresasConAsignacion = new Set();
        asignaciones?.forEach(asig => {
            empresasConAsignacion.add(asig.empresa_id);
        });
        
        ocultarLoading();
        
        // ============================================
        // ESTADÍSTICAS
        // ============================================
        const totalOperadores = operadoresActivos.length;
        const totalEmpresas = empresas?.length || 0;
        const totalAsignaciones = asignaciones?.length || 0;
        const operadoresSinAsignacion = operadoresActivos.filter(op => {
            const count = asignacionesPorOperador.get(op.id) || 0;
            return count === 0;
        }).length;
        const empresasSinAsignacion = empresas?.filter(emp => !empresasConAsignacion.has(emp.id)).length || 0;
        
        // Si no hay operadores, mostrar mensaje
        if (totalOperadores === 0) {
            document.getElementById('dynamicContent').innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                    <i class="fas fa-users-slash text-5xl text-gray-400 mb-4"></i>
                    <h2 class="text-xl font-bold text-gray-800 mb-2">No hay operadores registrados</h2>
                    <p class="text-gray-500 mb-4">No se encontraron usuarios con el rol OPERADOR_EMPRESA.</p>
                    <div class="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                        <p class="font-semibold text-gray-700 mb-2">📋 Para solucionar:</p>
                        <ol class="list-decimal list-inside space-y-1 text-sm text-gray-600">
                            <li>Vaya a <strong>"Seguridad y Accesos" → "Usuarios del Sistema"</strong></li>
                            <li>Edite un usuario existente o cree uno nuevo</li>
                            <li>Asigne el rol <strong>"OPERADOR_EMPRESA"</strong></li>
                            <li>Vuelva a esta sección</li>
                        </ol>
                    </div>
                    <button onclick="window.cargarVista('usuarios')" class="btn-primary mt-6">
                        <i class="fas fa-users mr-2"></i>Ir a Usuarios
                    </button>
                </div>
            `;
            return;
        }
        
        // ============================================
        // GENERAR HTML
        // ============================================
        let html = `
            <div class="mb-6">
                <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                    <i class="fas fa-building-user"></i> Asignación de Empresas a Operadores
                </h1>
                <p class="text-gray-500 text-sm mt-1">Gestiona qué empresas puede ver cada operador del sistema</p>
            </div>
            
            <!-- Estadísticas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-primary">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Operadores</p>
                            <p class="text-2xl font-bold text-primary">${totalOperadores}</p>
                            <p class="text-xs text-gray-400 mt-1">Registrados</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <i class="fas fa-users text-primary text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Empresas</p>
                            <p class="text-2xl font-bold text-green-600">${totalEmpresas}</p>
                            <p class="text-xs text-gray-400 mt-1">Activas</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <i class="fas fa-building text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Asignaciones</p>
                            <p class="text-2xl font-bold text-purple-600">${totalAsignaciones}</p>
                            <p class="text-xs text-gray-400 mt-1">Totales</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <i class="fas fa-link text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Sin Asignar</p>
                            <p class="text-2xl font-bold text-orange-600">${operadoresSinAsignacion}</p>
                            <p class="text-xs text-gray-400 mt-1">Operadores</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <i class="fas fa-user-slash text-orange-600 text-xl"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-xs uppercase tracking-wider">Sin Asignar</p>
                            <p class="text-2xl font-bold text-blue-600">${empresasSinAsignacion}</p>
                            <p class="text-xs text-gray-400 mt-1">Empresas</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <i class="fas fa-building-slash text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Panel de Operadores -->
                <div class="lg:col-span-1">
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div class="bg-gradient-to-r from-primary to-primary-dark px-4 py-3">
                            <h2 class="text-white font-semibold flex items-center gap-2">
                                <i class="fas fa-users"></i> Operadores
                                <span class="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">${totalOperadores}</span>
                            </h2>
                        </div>
                        <div class="p-3">
                            <div class="relative mb-3">
                                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input type="text" id="buscarOperador" placeholder="Buscar operador..." 
                                    class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                                    onkeyup="filtrarOperadoresAsignacion()">
                            </div>
                            <div class="space-y-2 max-h-[60vh] overflow-y-auto" id="listaOperadores">
                                ${operadoresActivos.map(op => {
                                    const asignacionesCount = asignacionesPorOperador.get(op.id) || 0;
                                    const tieneAsignacion = asignacionesCount > 0;
                                    const nombreMostrar = op.empleado?.nombre_completo || op.correo.split('@')[0];
                                    return `
                                    <div class="operador-card p-3 rounded-lg cursor-pointer transition-all border-2 border-gray-200 hover:border-primary hover:bg-primary/5" 
                                         data-id="${op.id}"
                                         data-nombre="${op.empleado?.nombre_completo || op.correo}"
                                         data-correo="${op.correo}"
                                         onclick="seleccionarOperadorAsignacion('${op.id}')">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-full ${tieneAsignacion ? 'bg-primary/20' : 'bg-gray-100'} flex items-center justify-center">
                                                <i class="fas fa-user-tie ${tieneAsignacion ? 'text-primary' : 'text-gray-400'}"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="font-medium text-gray-800 truncate">${nombreMostrar}</p>
                                                <p class="text-xs text-gray-500 truncate">${op.correo}</p>
                                                ${op.empleado?.puesto ? `<p class="text-xs text-gray-400 truncate">${op.empleado.puesto}</p>` : ''}
                                            </div>
                                            <div class="text-right">
                                                <span class="text-xs font-bold ${tieneAsignacion ? 'text-primary' : 'text-gray-400'}">
                                                    ${asignacionesCount} empresa${asignacionesCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                `}).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Panel de Empresas -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div class="bg-gradient-to-r from-secondary to-secondary-dark px-4 py-3 flex justify-between items-center">
                            <h2 class="text-primary font-semibold flex items-center gap-2">
                                <i class="fas fa-building"></i> Empresas Disponibles
                                <span class="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full" id="empresasSeleccionadasCount">0</span>
                            </h2>
                            <div class="flex gap-2">
                                <button onclick="seleccionarTodasEmpresas()" class="text-xs bg-white/30 text-primary px-2 py-1 rounded hover:bg-white/50">
                                    <i class="fas fa-check-double"></i> Todas
                                </button>
                                <button onclick="deseleccionarTodasEmpresas()" class="text-xs bg-white/30 text-primary px-2 py-1 rounded hover:bg-white/50">
                                    <i class="fas fa-times"></i> Ninguna
                                </button>
                            </div>
                        </div>
                        
                        <div class="p-4" id="panelEmpresas">
                            <div class="text-center text-gray-400 py-12" id="seleccionarOperadorMsg">
                                <i class="fas fa-arrow-left text-3xl mb-3 opacity-50"></i>
                                <p class="text-lg">Seleccione un operador</p>
                                <p class="text-sm">Para ver y asignar sus empresas</p>
                            </div>
                            
                            <div id="listaEmpresas" class="hidden">
                                <div class="mb-3">
                                    <div class="relative">
                                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                                        <input type="text" id="buscarEmpresa" placeholder="Buscar empresa..." 
                                            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                                            onkeyup="filtrarEmpresasAsignacion()">
                                    </div>
                                </div>
                                <div class="space-y-2 max-h-[55vh] overflow-y-auto" id="listaEmpresasGrid">
                                    ${empresas?.map(emp => `
                                        <div class="empresa-card p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors" 
                                             data-id="${emp.id}"
                                             data-nombre="${emp.nombre}">
                                            <label class="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" class="empresa-checkbox w-4 h-4 text-primary rounded focus:ring-primary" 
                                                       data-empresa-id="${emp.id}"
                                                       data-empresa-nombre="${emp.nombre}"
                                                       onchange="toggleEmpresaAsignacion(this)">
                                                <div class="flex-1">
                                                    <p class="font-medium text-gray-800">${emp.nombre}</p>
                                                    ${emp.ruc ? `<p class="text-xs text-gray-500">RUC: ${emp.ruc}</p>` : ''}
                                                </div>
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-3">
                                    <button onclick="cancelarAsignacionEmpresas()" class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                        <i class="fas fa-times"></i> Cancelar
                                    </button>
                                    <button onclick="guardarAsignacionEmpresas()" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                                        <i class="fas fa-save"></i> Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <div class="flex items-start gap-3">
                    <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div class="text-sm text-blue-800">
                        <p class="font-semibold">Información:</p>
                        <ul class="list-disc list-inside mt-1 space-y-1">
                            <li>Los operadores solo podrán ver los activos de las empresas que se les asignen aquí</li>
                            <li>Un operador puede tener acceso a una o múltiples empresas</li>
                            <li>Los cambios se aplican inmediatamente después de guardar</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
        // Variables globales para la vista
        window.operadorSeleccionadoId = null;
        
        // Registrar funciones auxiliares
        window.seleccionarOperadorAsignacion = seleccionarOperadorAsignacion;
        window.toggleEmpresaAsignacion = toggleEmpresaAsignacion;
        window.seleccionarTodasEmpresas = seleccionarTodasEmpresas;
        window.deseleccionarTodasEmpresas = deseleccionarTodasEmpresas;
        window.guardarAsignacionEmpresas = guardarAsignacionEmpresas;
        window.cancelarAsignacionEmpresas = cancelarAsignacionEmpresas;
        window.filtrarOperadoresAsignacion = filtrarOperadoresAsignacion;
        window.filtrarEmpresasAsignacion = filtrarEmpresasAsignacion;
        
        console.log('✅ Vista de asignación cargada correctamente');
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarError('Error al cargar asignaciones: ' + error.message);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

let operadorSeleccionadoIdGlobal = null;

async function seleccionarOperadorAsignacion(operadorId) {
    console.log('📌 Seleccionando operador:', operadorId);
    
    // Remover selección anterior
    document.querySelectorAll('.operador-card').forEach(card => {
        card.classList.remove('border-primary', 'bg-primary/5');
        card.classList.add('border-gray-200');
    });
    
    // Resaltar selección actual
    const cardSeleccionado = document.querySelector(`.operador-card[data-id="${operadorId}"]`);
    if (cardSeleccionado) {
        cardSeleccionado.classList.remove('border-gray-200');
        cardSeleccionado.classList.add('border-primary', 'bg-primary/5');
    }
    
    operadorSeleccionadoIdGlobal = operadorId;
    
    // Mostrar panel de empresas
    document.getElementById('seleccionarOperadorMsg').classList.add('hidden');
    document.getElementById('listaEmpresas').classList.remove('hidden');
    
    // Cargar asignaciones actuales
    mostrarLoading('Cargando asignaciones...');
    
    try {
        const { data: asignaciones, error } = await window.supabaseClient
            .from('usuarios_empresas')
            .select('empresa_id')
            .eq('usuario_id', operadorId);
        
        if (error) throw error;
        
        // Limpiar selecciones
        document.querySelectorAll('.empresa-checkbox').forEach(cb => cb.checked = false);
        
        // Marcar asignaciones
        asignaciones?.forEach(asig => {
            const cb = document.querySelector(`.empresa-checkbox[data-empresa-id="${asig.empresa_id}"]`);
            if (cb) cb.checked = true;
        });
        
        actualizarContadorEmpresasSeleccionadas();
        ocultarLoading();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las asignaciones', 'error');
    }
}

function toggleEmpresaAsignacion(checkbox) {
    actualizarContadorEmpresasSeleccionadas();
}

function seleccionarTodasEmpresas() {
    document.querySelectorAll('.empresa-checkbox').forEach(cb => cb.checked = true);
    actualizarContadorEmpresasSeleccionadas();
}

function deseleccionarTodasEmpresas() {
    document.querySelectorAll('.empresa-checkbox').forEach(cb => cb.checked = false);
    actualizarContadorEmpresasSeleccionadas();
}

function actualizarContadorEmpresasSeleccionadas() {
    const seleccionadas = document.querySelectorAll('.empresa-checkbox:checked').length;
    const contador = document.getElementById('empresasSeleccionadasCount');
    if (contador) contador.textContent = seleccionadas;
}

async function guardarAsignacionEmpresas() {
    if (!operadorSeleccionadoIdGlobal) {
        mostrarAlerta('Error', 'Seleccione un operador primero', 'error');
        return;
    }
    
    const empresasSeleccionadas = Array.from(document.querySelectorAll('.empresa-checkbox:checked'))
        .map(cb => cb.dataset.empresaId);
    
    const result = await Swal.fire({
        title: 'Confirmar cambios',
        text: `¿Asignar ${empresasSeleccionadas.length} empresa(s) a este operador?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    mostrarLoading('Guardando...');
    
    try {
        // Eliminar asignaciones existentes
        await window.supabaseClient
            .from('usuarios_empresas')
            .delete()
            .eq('usuario_id', operadorSeleccionadoIdGlobal);
        
        // Insertar nuevas
        if (empresasSeleccionadas.length > 0) {
            const ahora = new Date().toISOString();
            const inserts = empresasSeleccionadas.map(empresaId => ({
                usuario_id: operadorSeleccionadoIdGlobal,
                empresa_id: empresaId,
                creado_el: ahora,
                creado_por: usuarioActual.id
            }));
            
            const { error } = await window.supabaseClient
                .from('usuarios_empresas')
                .insert(inserts);
            
            if (error) throw error;
        }
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Asignaciones guardadas correctamente', 'success');
        
        // Recargar vista
        await cargarVistaAsignacionUsuariosEmpresas();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron guardar los cambios', 'error');
    }
}

function cancelarAsignacionEmpresas() {
    if (operadorSeleccionadoIdGlobal) {
        seleccionarOperadorAsignacion(operadorSeleccionadoIdGlobal);
    }
}

function filtrarOperadoresAsignacion() {
    const termino = document.getElementById('buscarOperador')?.value.toLowerCase() || '';
    document.querySelectorAll('.operador-card').forEach(card => {
        const nombre = (card.dataset.nombre || '').toLowerCase();
        const correo = (card.dataset.correo || '').toLowerCase();
        if (nombre.includes(termino) || correo.includes(termino) || termino === '') {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filtrarEmpresasAsignacion() {
    const termino = document.getElementById('buscarEmpresa')?.value.toLowerCase() || '';
    document.querySelectorAll('.empresa-card').forEach(card => {
        const nombre = (card.dataset.nombre || '').toLowerCase();
        if (nombre.includes(termino) || termino === '') {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

window.eliminarCredencialDesdeModal = async function(credencialId, activoId) {
    const result = await Swal.fire({
        title: '¿Eliminar esta credencial?',
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
                .from('credenciales')
                .delete()
                .eq('id', credencialId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Credencial eliminada correctamente', 'success');
            
            // Actualizar contador en el card
            if (vistaActual === 'activos') {
                setTimeout(async () => {
                    await actualizarContadorCredencialesEnCard(activoId);
                }, 300);
            }
            
            // Recargar modal de ver credenciales si estaba abierto
            const swalModal = document.querySelector('.swal2-container');
            if (swalModal && swalModal.style.display !== 'none') {
                if (typeof window.verCredencialesPorActivo === 'function') {
                    setTimeout(async () => {
                        await window.verCredencialesPorActivo(activoId);
                    }, 400);
                } else {
                    await cargarVistaCredenciales();
                }
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la credencial: ' + error.message, 'error');
        }
    }
};

window.eliminarAccesoRemotoDesdeModal = async function(accesoId, activoId) {
    const result = await Swal.fire({
        title: '¿Eliminar este acceso remoto?',
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
                .from('accesos_remotos')
                .delete()
                .eq('id', accesoId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Acceso remoto eliminado correctamente', 'success');
            
            // Actualizar contador en el card
            if (vistaActual === 'activos') {
                setTimeout(async () => {
                    await actualizarContadorAccesosEnCard(activoId);
                }, 300);
            }
            
            // Recargar modal de ver accesos si estaba abierto
            const swalModal = document.querySelector('.swal2-container');
            if (swalModal && swalModal.style.display !== 'none') {
                if (typeof window.verAccesosPorActivo === 'function') {
                    setTimeout(async () => {
                        await window.verAccesosPorActivo(activoId);
                    }, 400);
                } else {
                    await cargarVistaAccesosRemotos();
                }
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el acceso remoto: ' + error.message, 'error');
        }
    }
};

window.eliminarTareaRespaldoDesdeModal = async function(tareaId, activoId) {
    const result = await Swal.fire({
        title: '¿Eliminar esta tarea de respaldo?',
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
                .from('tareas_respaldo')
                .delete()
                .eq('id', tareaId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Tarea de respaldo eliminada correctamente', 'success');
            
            // Actualizar contador en el card
            if (vistaActual === 'activos') {
                setTimeout(async () => {
                    await actualizarContadorRespaldosEnCard(activoId);
                }, 300);
            }
            
            // Recargar modal de ver respaldos si estaba abierto
            const swalModal = document.querySelector('.swal2-container');
            if (swalModal && swalModal.style.display !== 'none') {
                if (typeof window.verRespaldosPorActivo === 'function') {
                    setTimeout(async () => {
                        await window.verRespaldosPorActivo(activoId);
                    }, 400);
                } else {
                    await cargarVistaTareasRespaldo();
                }
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar la tarea de respaldo: ' + error.message, 'error');
        }
    }
};