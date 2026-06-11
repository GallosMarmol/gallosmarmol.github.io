// ==================== VISTA SOFTWARE ====================
async function cargarVistaSoftware() {
    mostrarLoading('Cargando software...');
    try {
        console.log('%c📋 CARGANDO SOFTWARE', 'background: #6f42c1; color: white; font-size: 14px;');

        const { data: software } = await window.supabaseClient
            .from('software')
            .select('*')
            .order('nombre');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        software?.forEach(s => { if (s.creado_por) usuariosIds.add(s.creado_por); if (s.modificado_por) usuariosIds.add(s.modificado_por); });

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

        const { data: instalaciones } = await window.supabaseClient
            .from('software_instalado')
            .select('software_id');
        const instalacionesCount = new Map();
        instalaciones?.forEach(i => instalacionesCount.set(i.software_id, (instalacionesCount.get(i.software_id) || 0) + 1));

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-primary">Catálogo de Software</h2>
                <button onclick="window.abrirModalNuevoSoftware()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nuevo Software</button>
            </div>
            <div class="cards-grid">
        `;

        if (software?.length) {
            software.forEach(s => {
                const creadorInfo = usuariosConEmpleados.get(s.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(s.modificado_por);
                const totalInstalaciones = instalacionesCount.get(s.id) || 0;

                html += `
                    <div class="card-item">
                        <div class="flex justify-between items-start mb-2">
                            <div><span class="font-bold text-primary text-lg">${s.nombre}</span><p class="text-xs text-gray-500">${s.fabricante || 'Fabricante no especificado'}</p></div>
                            <span class="estado-badge ${s.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${s.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        ${s.descripcion ? `<p class="text-sm text-gray-600 mb-2">${s.descripcion}</p>` : ''}
                        <div class="flex items-center gap-3 mt-2 text-sm"><div class="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"><i class="fas fa-desktop text-xs"></i><span>${totalInstalaciones} instalación${totalInstalaciones !== 1 ? 'es' : ''}</span></div></div>
                        <div class="text-xs text-gray-400 mt-3 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(s.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${s.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(s.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleSoftware('${s.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarSoftware('${s.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoSoftware('${s.id}', ${s.activo})" class="${s.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${s.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            <button onclick="verSoftwareInstalado('${s.id}')" class="text-purple-600 hover:opacity-75 relative"><i class="fas fa-desktop text-lg"></i>${totalInstalaciones > 0 ? `<span class="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full min-w-[1.2rem] h-[1.2rem] flex items-center justify-center px-1 text-[10px] font-bold">${totalInstalaciones}</span>` : ''}</button>
                            <button onclick="eliminarSoftware('${s.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-code text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay software registrado</p><button onclick="window.abrirModalNuevoSoftware()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nuevo Software</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar software');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA SOFTWARE INSTALADO ====================
async function cargarVistaSoftwareInstalado() {
    mostrarLoading('Cargando software instalado...');
    try {
        console.log('%c📋 CARGANDO SOFTWARE INSTALADO', 'background: #17a2b8; color: white; font-size: 14px;');

        const { data: instalaciones } = await window.supabaseClient
            .from('software_instalado')
            .select(`*, activo:activos (id, nombre, codigo_activo, estado, ubicacion:ubicacion_id (id, nombre, descripcion), empresa:empresa_id (id, nombre, ruc)), software:software (id, nombre, fabricante), instalador:instalado_por (id, correo), desinstalador:desinstalado_por (id, correo)`)
            .order('fecha_instalacion', { ascending: false });

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        instalaciones?.forEach(i => { if (i.creado_por) usuariosIds.add(i.creado_por); if (i.modificado_por) usuariosIds.add(i.modificado_por); if (i.instalado_por) usuariosIds.add(i.instalado_por); if (i.desinstalado_por) usuariosIds.add(i.desinstalado_por); });

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
                <h2 class="text-2xl font-bold text-primary">Software Instalado</h2>
                <button onclick="window.abrirModalNuevoSoftwareInstalado()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Instalación</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarSoftwareInstalado('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${instalaciones?.length || 0}</span></button>
                <button onclick="filtrarSoftwareInstalado('INSTALADO')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="INSTALADO">Instaladas <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${instalaciones?.filter(i => i.estado === 'INSTALADO').length || 0}</span></button>
                <button onclick="filtrarSoftwareInstalado('PENDIENTE')" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 filter-btn" data-filter="PENDIENTE">Pendientes <span class="ml-1 bg-yellow-200 px-2 py-0.5 rounded-full text-xs">${instalaciones?.filter(i => i.estado === 'PENDIENTE').length || 0}</span></button>
                <button onclick="filtrarSoftwareInstalado('DESINSTALADO')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="DESINSTALADO">Desinstaladas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${instalaciones?.filter(i => i.estado === 'DESINSTALADO').length || 0}</span></button>
            </div>
            <div class="cards-grid" id="software-instalado-grid">
        `;

        if (instalaciones?.length) {
            instalaciones.forEach(i => {
                const creadorInfo = usuariosConEmpleados.get(i.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(i.modificado_por);
                const instaladorInfo = usuariosConEmpleados.get(i.instalado_por);
                const desinstaladorInfo = usuariosConEmpleados.get(i.desinstalado_por);
                const activo = i.activo || {};
                const ubicacion = activo.ubicacion || {};
                const empresa = activo.empresa || {};
                const estadoClass = { 'INSTALADO': 'bg-green-100 text-green-800', 'PENDIENTE': 'bg-yellow-100 text-yellow-800', 'DESINSTALADO': 'bg-gray-100 text-gray-800' }[i.estado] || 'bg-gray-100';
                const fechaInstalacion = i.fecha_instalacion ? new Date(i.fecha_instalacion).toLocaleDateString('es-ES') : 'No registrada';
                const fechaDesinstalacion = i.fecha_desinstalacion ? new Date(i.fecha_desinstalacion).toLocaleDateString('es-ES') : null;

                html += `
                    <div class="card-item" data-estado="${i.estado || 'INSTALADO'}">
                        <div class="flex justify-between items-start mb-3">
                            <div><span class="font-bold text-primary text-lg">${i.software?.nombre || 'Software no especificado'}</span><p class="text-xs text-gray-500">${i.software?.fabricante || 'Fabricante no especificado'}</p></div>
                            <span class="estado-badge ${estadoClass}">${i.estado || 'INSTALADO'}</span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="bg-gray-50 p-2 rounded-lg"><p class="flex items-center gap-2"><i class="fas fa-desktop text-primary w-4"></i><span class="font-medium">${activo.nombre || 'Activo no especificado'}</span><span class="text-xs text-gray-500">(${activo.codigo_activo || 'Sin código'})</span></p><p class="text-xs text-gray-500 ml-6"><i class="fas fa-map-marker-alt text-primary mr-1"></i> ${ubicacion.nombre || 'No especificada'}${empresa.nombre !== 'No especificada' ? ` · ${empresa.nombre}` : ''}</p></div>
                            <p class="flex items-center gap-2"><i class="fas fa-code-branch text-primary w-4"></i><span>Versión: <span class="font-medium">${i.version_instalada || 'No especificada'}</span> | ${i.arquitectura_instalada || 'Arquitectura no especificada'}</span></p>
                            <p class="flex items-center gap-2"><i class="fas fa-calendar-alt text-primary w-4"></i><span>Instalado: ${fechaInstalacion}</span>${i.instalado_por ? `<span class="text-xs text-gray-500">por <span class="text-primary">${instaladorInfo?.nombre || 'No especificado'}</span></span>` : ''}</p>
                            ${i.ruta_instalacion ? `<p class="flex items-center gap-2"><i class="fas fa-folder text-primary w-4"></i><span class="text-xs truncate" title="${i.ruta_instalacion}">${i.ruta_instalacion}</span></p>` : ''}
                            ${i.configuracion_especial ? `<p class="flex items-center gap-2"><i class="fas fa-cog text-primary w-4"></i><span class="text-xs">${i.configuracion_especial}</span></p>` : ''}
                            ${i.estado === 'DESINSTALADO' ? `<div class="mt-2 p-2 bg-gray-50 rounded-lg"><p class="flex items-center gap-2 text-orange-600"><i class="fas fa-trash-alt w-4"></i><span class="font-medium">Desinstalado: ${fechaDesinstalacion || 'Fecha no registrada'}</span></p>${i.motivo_desinstalacion ? `<p class="text-xs text-gray-600 mt-1 ml-6"><span class="font-medium">Motivo:</span> ${i.motivo_desinstalacion}</p>` : ''}${i.desinstalado_por ? `<p class="text-xs text-gray-500 ml-6">por <span class="text-primary">${desinstaladorInfo?.nombre || 'No especificado'}</span></p>` : ''}</div>` : ''}
                            <div class="text-xs text-gray-400 mt-3 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(i.creado_el).toLocaleDateString('es-ES')} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${i.modificado_el && i.modificado_el !== i.creado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(i.modificado_el).toLocaleDateString('es-ES')} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleInstalacion('${i.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarSoftwareInstalado('${i.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            ${i.estado === 'INSTALADO' ? `<button onclick="desinstalarSoftware('${i.id}')" class="text-orange-600 hover:opacity-75"><i class="fas fa-trash-alt text-lg"></i></button>` : ''}
                            ${i.estado === 'PENDIENTE' ? `<button onclick="confirmarInstalacion('${i.id}')" class="text-green-600 hover:opacity-75"><i class="fas fa-check-circle text-lg"></i></button>` : ''}
                            <button onclick="eliminarSoftwareInstalado('${i.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-laptop-code text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay software instalado registrado</p><button onclick="window.abrirModalNuevoSoftwareInstalado()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Instalación</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar software instalado');
    } finally {
        ocultarLoading();
    }
}

// ==================== VISTA LICENCIAS ====================
async function cargarVistaLicencias() {
    mostrarLoading('Cargando licencias...');
    try {
        console.log('%c📋 CARGANDO LICENCIAS', 'background: #ffc107; color: black; font-size: 14px;');

        const { data: licencias } = await window.supabaseClient
            .from('licencias')
            .select(`*, software:software_id (id, nombre, fabricante), activo_rel:activo_id (id, nombre, codigo_activo)`)
            .order('fecha_vencimiento');

        const usuariosConEmpleados = new Map();
        const usuariosIds = new Set();
        licencias?.forEach(l => { if (l.creado_por) usuariosIds.add(l.creado_por); if (l.modificado_por) usuariosIds.add(l.modificado_por); });

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
                <h2 class="text-2xl font-bold text-primary">Licencias</h2>
                <button onclick="window.abrirModalNuevoLicencia()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Nueva Licencia</button>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-2 items-center">
                <span class="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
                <button onclick="filtrarLicencias('todos')" class="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200 filter-btn" data-filter="todos">Todas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${licencias?.length || 0}</span></button>
                <button onclick="filtrarLicencias('vigentes')" class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full hover:bg-green-200 filter-btn" data-filter="vigentes">Vigentes <span class="ml-1 bg-green-200 px-2 py-0.5 rounded-full text-xs">${licencias?.filter(l => !l.fecha_vencimiento || new Date(l.fecha_vencimiento) > new Date()).length || 0}</span></button>
                <button onclick="filtrarLicencias('por-vencer')" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 filter-btn" data-filter="por-vencer">Por vencer <span class="ml-1 bg-yellow-200 px-2 py-0.5 rounded-full text-xs">${licencias?.filter(l => l.fecha_vencimiento && new Date(l.fecha_vencimiento) > new Date() && (new Date(l.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24) <= 30).length || 0}</span></button>
                <button onclick="filtrarLicencias('vencidas')" class="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200 filter-btn" data-filter="vencidas">Vencidas <span class="ml-1 bg-red-200 px-2 py-0.5 rounded-full text-xs">${licencias?.filter(l => l.fecha_vencimiento && new Date(l.fecha_vencimiento) < new Date()).length || 0}</span></button>
                <button onclick="filtrarLicencias('activas')" class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 filter-btn" data-filter="activas">Activas <span class="ml-1 bg-blue-200 px-2 py-0.5 rounded-full text-xs">${licencias?.filter(l => l.activo).length || 0}</span></button>
                <button onclick="filtrarLicencias('inactivas')" class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 filter-btn" data-filter="inactivas">Inactivas <span class="ml-1 bg-gray-200 px-2 py-0.5 rounded-full text-xs">${licencias?.filter(l => !l.activo).length || 0}</span></button>
            </div>
            <div class="cards-grid" id="licencias-grid">
        `;

        if (licencias?.length) {
            const hoy = new Date();
            licencias.forEach(l => {
                const creadorInfo = usuariosConEmpleados.get(l.creado_por);
                const modificadorInfo = usuariosConEmpleados.get(l.modificado_por);
                let vigenciaClass = 'bg-green-100 text-green-800', vigenciaTexto = 'Vigente';
                if (l.fecha_vencimiento) {
                    const dias = Math.ceil((new Date(l.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24));
                    if (dias < 0) { vigenciaClass = 'bg-red-100 text-red-800'; vigenciaTexto = 'Vencida'; }
                    else if (dias < 30) { vigenciaClass = 'bg-yellow-100 text-yellow-800'; vigenciaTexto = `Vence en ${dias} días`; }
                }

                html += `
                    <div class="card-item" data-vigencia="${vigenciaTexto === 'Vencida' ? 'vencida' : (vigenciaTexto.includes('Vence') ? 'por-vencer' : 'vigente')}" data-activo="${l.activo ? 'activa' : 'inactiva'}">
                        <div class="flex justify-between items-start mb-2">
                            <div><span class="font-bold text-primary text-lg">${l.software?.nombre || 'Software no especificado'}</span><p class="text-xs text-gray-500">${l.software?.fabricante || ''}</p></div>
                            <div class="flex flex-col gap-1"><span class="estado-badge ${vigenciaClass}">${vigenciaTexto}</span><span class="estado-badge ${l.activo ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">${l.activo ? 'Activa' : 'Inactiva'}</span></div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="bg-gray-50 p-2 rounded-lg"><p class="flex items-center gap-2"><i class="fas fa-key text-primary w-4"></i><span class="font-mono font-bold">${l.codigo_licencia || 'Sin código'}</span></p></div>
                            ${l.clave_producto ? `<p class="flex items-center gap-2"><i class="fas fa-lock text-primary w-4"></i><span class="font-mono text-xs">${l.clave_producto}</span></p>` : ''}
                            <p class="flex items-center gap-2"><i class="fas fa-tag text-primary w-4"></i><span>${l.tipo_licencia || 'Tipo no especificado'} · ${l.modalidad || 'Modalidad no especificada'}</span></p>
                            ${l.activo_rel ? `<p class="flex items-center gap-2"><i class="fas fa-desktop text-primary w-4"></i><span>${l.activo_rel.nombre} (${l.activo_rel.codigo_activo || 'Sin código'})</span></p>` : ''}
                            <div class="grid grid-cols-2 gap-2 text-xs mt-2 bg-gray-50 p-2 rounded-lg"><p><i class="far fa-calendar-alt text-primary mr-1"></i> Compra: ${l.fecha_compra ? new Date(l.fecha_compra).toLocaleDateString() : 'No registrada'}</p><p><i class="fas fa-hourglass-end text-primary mr-1"></i> Vence: ${l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString() : 'No vence'}</p></div>
                            ${l.proveedor ? `<p class="text-xs text-gray-500"><i class="fas fa-truck text-primary mr-1"></i> Proveedor: ${l.proveedor}</p>` : ''}
                            <div class="text-xs text-gray-400 mt-2 pt-2 border-t space-y-1"><div class="flex items-center gap-1"><i class="fas fa-user-plus w-4"></i><span>Creado: ${new Date(l.creado_el).toLocaleDateString()} por <span class="text-primary">${creadorInfo?.nombre || 'Sistema'}</span></span></div>${l.modificado_el ? `<div class="flex items-center gap-1"><i class="fas fa-user-edit w-4"></i><span>Modificado: ${new Date(l.modificado_el).toLocaleDateString()} por <span class="text-primary">${modificadorInfo?.nombre || 'Sistema'}</span></span></div>` : ''}</div>
                        </div>
                        <div class="mt-4 flex gap-2 justify-end border-t pt-3">
                            <button onclick="verDetalleLicencia('${l.id}')" class="text-blue-600 hover:opacity-75"><i class="fas fa-info-circle text-lg"></i></button>
                            <button onclick="editarLicencia('${l.id}')" class="text-primary hover:opacity-75"><i class="fas fa-edit text-lg"></i></button>
                            <button onclick="toggleEstadoLicencia('${l.id}', ${l.activo})" class="${l.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75"><i class="fas ${l.activo ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg"></i></button>
                            ${!l.activo_id ? `<button onclick="asignarLicencia('${l.id}')" class="text-purple-600 hover:opacity-75"><i class="fas fa-link text-lg"></i></button>` : ''}
                            <button onclick="eliminarLicencia('${l.id}')" class="text-red-600 hover:opacity-75"><i class="fas fa-trash text-lg"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<div class="col-span-full text-center py-12 bg-white rounded-lg"><i class="fas fa-key text-5xl text-gray-300 mb-4"></i><p class="text-gray-500 text-lg">No hay licencias registradas</p><button onclick="window.abrirModalNuevoLicencia()" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>Nueva Licencia</button></div>`;
        }

        html += '</div>';
        document.getElementById('dynamicContent').innerHTML = html;
        document.querySelector('.filter-btn[data-filter="todos"]')?.classList.add('ring-2', 'ring-primary', 'font-bold');
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar licencias');
    } finally {
        ocultarLoading();
    }
}

// ==================== CRUD SOFTWARE ====================
window.editarSoftware = async function(id) {
    mostrarLoading('Cargando software...');
    try {
        const { data: software, error } = await window.supabaseClient
            .from('software')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const modal = document.getElementById('softwareModal');
        if (!modal) {
            ocultarLoading();
            mostrarAlerta('Error', 'Error al abrir el formulario', 'error');
            return;
        }

        if (!modal.classList.contains('hidden')) {
            window.cerrarModal('softwareModal');
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        editandoId = id;

        const titleElement = document.getElementById('softwareModalTitle');
        if (titleElement) titleElement.innerText = 'Editar Software';

        const nombreInput = document.getElementById('software_nombre');
        if (nombreInput) nombreInput.value = software.nombre || '';

        const fabricanteInput = document.getElementById('software_fabricante');
        if (fabricanteInput) fabricanteInput.value = software.fabricante || '';

        const descripcionTextarea = document.getElementById('software_descripcion');
        if (descripcionTextarea) descripcionTextarea.value = software.descripcion || '';

        const activoSelect = document.getElementById('software_activo');
        if (activoSelect) activoSelect.value = software.activo ? 'true' : 'false';

        const idField = document.getElementById('software_id');
        if (idField) idField.value = id;

        ocultarLoading();

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.offsetHeight;
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el software: ' + error.message, 'error');
    }
};

window.eliminarSoftware = async function(id) {
    const { count } = await window.supabaseClient
        .from('software_instalado')
        .select('*', { count: 'exact', head: true })
        .eq('software_id', id);

    if (count > 0) {
        const result = await Swal.fire({
            title: '¿Eliminar software?',
            html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Este software tiene <strong>${count} instalacion${count !== 1 ? 'es' : ''}</strong> registrada(s).</p><p class="text-sm text-gray-500 mt-2">Si eliminas el software, también se perderán todas sus instalaciones.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            mostrarLoading('Eliminando software e instalaciones...');
            try {
                await window.supabaseClient
                    .from('software_instalado')
                    .delete()
                    .eq('software_id', id);
                const { error } = await window.supabaseClient
                    .from('software')
                    .delete()
                    .eq('id', id);
                if (error) throw error;

                ocultarLoading();
                mostrarAlerta('Éxito', 'Software y sus instalaciones eliminados', 'success');
                await cargarVistaSoftware();
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo eliminar el software', 'error');
            }
        }
        return;
    }

    const result = await Swal.fire({
        title: '¿Eliminar software?',
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
                .from('software')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Software eliminado', 'success');
            await cargarVistaSoftware();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el software', 'error');
        }
    }
};

window.guardarSoftware = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando software...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        const data = {
            nombre: document.getElementById('software_nombre').value.trim(),
            fabricante: document.getElementById('software_fabricante').value.trim() || null,
            descripcion: document.getElementById('software_descripcion')?.value?.trim() || null,
            activo: document.getElementById('software_activo')?.value === 'true'
        };

        if (!data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre del software es obligatorio', 'error');
            document.getElementById('software_nombre').focus();
            return;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('software')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('software')
                .insert(data);
            if (error) throw error;
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Software guardado correctamente', 'success');

        const modal = document.getElementById('softwareModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        editandoId = null;
        await cargarVistaSoftware();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        let mensajeError = 'No se pudo guardar el software';
        if (error.message?.includes('duplicate')) mensajeError = 'Ya existe un software con ese nombre';
        else if (error.message) mensajeError = error.message;
        mostrarAlerta('Error', mensajeError, 'error');
    }
};

window.toggleEstadoSoftware = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (!nuevoEstado) {
        const { count } = await window.supabaseClient
            .from('software_instalado')
            .select('*', { count: 'exact', head: true })
            .eq('software_id', id);

        if (count > 0) {
            const result = await Swal.fire({
                title: `¿Desactivar software?`,
                html: `<div class="text-center"><i class="fas fa-exclamation-triangle text-4xl text-orange-500 mb-3"></i><p>Este software tiene <strong>${count} instalación(es)</strong> registrada(s).</p><p class="text-sm text-gray-500 mt-2">Si lo desactivas, las instalaciones seguirán existiendo pero no podrás usar este software para nuevas instalaciones.</p><p class="text-sm text-gray-500">¿Deseas continuar?</p></div>`,
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
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} software?`,
        text: `Esta acción ${accion === 'desactivar' ? 'ocultará el software del catálogo' : 'hará visible el software nuevamente'}.`,
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
                .from('software')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Software ${accion}do correctamente`, 'success');
            await cargarVistaSoftware();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== CRUD SOFTWARE INSTALADO ====================
window.editarSoftwareInstalado = async function(id) {
    mostrarLoading('Cargando instalación...');
    try {
        const { data: instalado, error } = await window.supabaseClient
            .from('software_instalado')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        
        // Verificar que el modal existe
        const modal = document.getElementById('softwareInstaladoModal');
        if (!modal) {
            ocultarLoading();
            mostrarAlerta('Error', 'No se encontró el formulario de edición', 'error');
            return;
        }
        
        // Actualizar título
        const titleElement = document.getElementById('softwareInstaladoModalTitle');
        if (titleElement) titleElement.innerText = 'Editar Instalación';

        // Cargar selects
        await Promise.all([
            cargarActivosSelect('si_activo_id'),
            cargarSoftwareSelect('si_software_id'),
            cargarLicenciasSelect('si_licencia_id'),
            cargarUsuariosSelect('si_instalado_por'),
            cargarUsuariosSelect('si_desinstalado_por')
        ]);

        // Llenar campos
        document.getElementById('si_activo_id').value = instalado.activo_id || '';
        document.getElementById('si_software_id').value = instalado.software_id || '';
        document.getElementById('si_version').value = instalado.version_instalada || '';
        document.getElementById('si_arquitectura').value = instalado.arquitectura_instalada || '';
        document.getElementById('si_fecha_instalacion').value = instalado.fecha_instalacion || '';
        document.getElementById('si_instalado_por').value = instalado.instalado_por || '';
        document.getElementById('si_ruta').value = instalado.ruta_instalacion || '';
        document.getElementById('si_licencia_id').value = instalado.licencia_id || '';
        document.getElementById('si_configuracion').value = instalado.configuracion_especial || '';
        document.getElementById('si_estado').value = instalado.estado || 'INSTALADO';

        if (instalado.estado === 'DESINSTALADO') {
            document.getElementById('si_fecha_desinstalacion').value = instalado.fecha_desinstalacion || '';
            document.getElementById('si_desinstalado_por').value = instalado.desinstalado_por || '';
            document.getElementById('si_motivo_desinstalacion').value = instalado.motivo_desinstalacion || '';
            document.getElementById('desinstalacion-fields').classList.remove('hidden');
        } else {
            document.getElementById('desinstalacion-fields').classList.add('hidden');
        }

        ocultarLoading();
        
        // Abrir el modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.offsetHeight;
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la instalación: ' + error.message, 'error');
    }
};

window.eliminarSoftwareInstalado = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar registro?',
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
            const { data: instalacion } = await window.supabaseClient
                .from('software_instalado')
                .select('activo_id')
                .eq('id', id)
                .single();
            
            const activoId = instalacion?.activo_id;
            
            const { error } = await window.supabaseClient
                .from('software_instalado')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Registro eliminado', 'success');
            
            // Si hay un activoId y la función existe, refrescar el modal de software
            if (activoId && typeof window.verSoftwarePorActivo === 'function') {
                await window.verSoftwarePorActivo(activoId);
            } else {
                await cargarVistaSoftwareInstalado();
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.eliminarSoftwareInstaladoDesdeModal = async function(instalacionId, activoId) {
    const result = await Swal.fire({
        title: '¿Eliminar este software instalado?',
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
                .from('software_instalado')
                .delete()
                .eq('id', instalacionId);
            
            if (error) throw error;
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Software eliminado correctamente', 'success');
            
            // Cerrar SweetAlert si está abierto
            const swalModal = document.querySelector('.swal2-container');
            if (swalModal) {
                Swal.close();
            }
            
            // Actualizar contador en el card
            if (vistaActual === 'activos') {
                setTimeout(async () => {
                    await actualizarContadorSoftwareEnCard(activoId);
                }, 300);
            }
            
            // Recargar el modal de ver software si estaba abierto
            if (typeof window.verSoftwarePorActivo === 'function') {
                setTimeout(async () => {
                    await window.verSoftwarePorActivo(activoId);
                }, 400);
            }
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar el software: ' + error.message, 'error');
        }
    }
};

// ==================== GUARDAR SOFTWARE INSTALADO ====================
window.guardarSoftwareInstalado = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando instalación...');
    
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();
        
        const data = {
            activo_id: document.getElementById('si_activo_id').value,
            software_id: document.getElementById('si_software_id').value,
            version_instalada: document.getElementById('si_version').value,
            arquitectura_instalada: document.getElementById('si_arquitectura').value,
            fecha_instalacion: document.getElementById('si_fecha_instalacion').value || new Date().toISOString().split('T')[0],
            instalado_por: document.getElementById('si_instalado_por').value || null,
            ruta_instalacion: document.getElementById('si_ruta').value || null,
            licencia_id: document.getElementById('si_licencia_id').value || null,
            configuracion_especial: document.getElementById('si_configuracion')?.value || null,
            estado: document.getElementById('si_estado').value
        };

        if (!data.activo_id || !data.software_id || !data.version_instalada || !data.arquitectura_instalada) {
            ocultarLoading();
            mostrarAlerta('Error', 'Complete los campos obligatorios', 'error');
            return;
        }

        const activoId = data.activo_id;
        let isEdit = false;
        
        if (editandoId) {
            // Actualizar
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            
            if (data.estado === 'DESINSTALADO') {
                data.fecha_desinstalacion = document.getElementById('si_fecha_desinstalacion')?.value || new Date().toISOString().split('T')[0];
                data.motivo_desinstalacion = document.getElementById('si_motivo_desinstalacion')?.value || null;
                data.desinstalado_por = document.getElementById('si_desinstalado_por')?.value || null;
            }
            
            const { error } = await window.supabaseClient
                .from('software_instalado')
                .update(data)
                .eq('id', editandoId);
            
            if (error) throw error;
            isEdit = true;
            
        } else {
            // Crear nueva
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            
            const { error } = await window.supabaseClient
                .from('software_instalado')
                .insert(data);
            
            if (error) throw error;
        }
        
        ocultarLoading();
        mostrarAlerta('Éxito', isEdit ? 'Instalación actualizada' : 'Software instalado correctamente', 'success');
        
        cerrarModal('softwareInstaladoModal');
        editandoId = null;
        
        // ============================================
        // ACTUALIZAR CONTADOR EN EL CARD
        // ============================================
        if (vistaActual === 'activos') {
            // Esperar un momento para que la base de datos se actualice
            setTimeout(async () => {
                await actualizarContadorSoftwareEnCard(activoId);
            }, 500);
        }
        
        // Recargar modal de ver software si está abierto
        const swalModal = document.querySelector('.swal2-container');
        const isSwalOpen = swalModal && swalModal.style.display !== 'none';
        
        if (isSwalOpen && typeof window.verSoftwarePorActivo === 'function') {
            setTimeout(async () => {
                await window.verSoftwarePorActivo(activoId);
            }, 600);
        }
        
        // Recargar vista completa si es necesario
        if (vistaActual === 'software_instalado') {
            await cargarVistaSoftwareInstalado();
        }
        
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', error.message || 'No se pudo guardar la instalación', 'error');
    }
};

// ==================== CRUD LICENCIAS ====================
window.editarLicencia = async function(id) {
    mostrarLoading('Cargando licencia...');
    try {
        const { data: licencia, error } = await window.supabaseClient
            .from('licencias')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        editandoId = id;
        document.getElementById('licenciaModalTitle').innerText = 'Editar Licencia';

        await Promise.all([
            cargarSoftwareSelect('lic_software_id'),
            cargarActivosSelect('lic_activo_id')
        ]);

        document.getElementById('lic_software_id').value = licencia.software_id || '';
        document.getElementById('lic_activo_id').value = licencia.activo_id || '';
        document.getElementById('lic_codigo').value = licencia.codigo_licencia || '';
        document.getElementById('lic_clave').value = licencia.clave_producto || '';
        document.getElementById('lic_tipo').value = licencia.tipo_licencia || 'COMERCIAL';
        document.getElementById('lic_modalidad').value = licencia.modalidad || 'PERPETUA';
        document.getElementById('lic_fecha_compra').value = licencia.fecha_compra || '';
        document.getElementById('lic_fecha_vencimiento').value = licencia.fecha_vencimiento || '';
        document.getElementById('lic_proveedor').value = licencia.proveedor || '';
        document.getElementById('lic_activo').value = licencia.activo ? 'true' : 'false';

        ocultarLoading();
        document.getElementById('licenciaModal').classList.remove('hidden');
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar la licencia', 'error');
    }
};

window.eliminarLicencia = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar licencia?',
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
                .from('licencias')
                .delete()
                .eq('id', id);
            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Licencia eliminada', 'success');
            await cargarVistaLicencias();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarLicencia = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando licencia...');
    try {
        if (!usuarioActual || !usuarioActual.id) {
            ocultarLoading();
            mostrarAlerta('Error', 'Debe iniciar sesión para guardar', 'error');
            return;
        }

        const ahora = new Date().toISOString();

        const data = {
            software_id: document.getElementById('lic_software_id').value,
            activo_id: document.getElementById('lic_activo_id').value || null,
            codigo_licencia: document.getElementById('lic_codigo').value,
            clave_producto: document.getElementById('lic_clave').value || null,
            tipo_licencia: document.getElementById('lic_tipo').value,
            modalidad: document.getElementById('lic_modalidad').value,
            fecha_compra: document.getElementById('lic_fecha_compra').value || null,
            fecha_vencimiento: document.getElementById('lic_fecha_vencimiento').value || null,
            proveedor: document.getElementById('lic_proveedor').value || null,
            activo: document.getElementById('lic_activo').value === 'true'
        };

        if (!data.software_id || !data.codigo_licencia) {
            ocultarLoading();
            mostrarAlerta('Error', 'El software y el código de licencia son obligatorios', 'error');
            return;
        }

        if (editandoId) {
            data.modificado_el = ahora;
            data.modificado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('licencias')
                .update(data)
                .eq('id', editandoId);
            if (error) throw error;
        } else {
            data.creado_el = ahora;
            data.creado_por = usuarioActual.id;
            const { error } = await window.supabaseClient
                .from('licencias')
                .insert(data);
            if (error) {
                if (error.message?.includes('unique')) throw new Error('Ya existe una licencia con ese código');
                throw error;
            }
        }

        ocultarLoading();
        mostrarAlerta('Éxito', 'Licencia guardada correctamente', 'success');
        cerrarModal('licenciaModal');
        await cargarVistaLicencias();
    } catch (error) {
        ocultarLoading();
        console.error('❌ Error:', error);
        mostrarAlerta('Error', error.message || 'No se pudo guardar la licencia', 'error');
    }
};

window.toggleEstadoLicencia = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} licencia?`,
        text: `Esta acción ${accion === 'desactivar' ? 'inhabilitará' : 'habilitará'} esta licencia.`,
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
                .from('licencias')
                .update({
                    activo: nuevoEstado,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', `Licencia ${accion}da correctamente`, 'success');
            await cargarVistaLicencias();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar el estado', 'error');
        }
    }
};

// ==================== MODALES ====================
window.abrirModalNuevoSoftware = async function() {
    const modal = document.getElementById('softwareModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('softwareModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    editandoId = null;
    const form = document.getElementById('softwareForm');
    if (form) form.reset();
    const titleElement = document.getElementById('softwareModalTitle');
    if (titleElement) titleElement.innerText = 'Nuevo Software';
    const activoField = document.getElementById('software_activo');
    if (activoField) activoField.value = 'true';
    const idField = document.getElementById('software_id');
    if (idField) idField.value = '';
    await window.abrirModal('softwareModal');
};

window.abrirModalNuevoSoftwareInstalado = async function() {
    const modal = document.getElementById('softwareInstaladoModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('softwareInstaladoModal');
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    editandoId = null;
    const form = document.getElementById('softwareInstaladoForm');
    if (form) form.reset();
    const titleElement = document.getElementById('softwareInstaladoModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Instalación';
    const fechaInput = document.getElementById('si_fecha_instalacion');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
    const estadoSelect = document.getElementById('si_estado');
    if (estadoSelect) estadoSelect.value = 'INSTALADO';
    const desinstalacionFields = document.getElementById('desinstalacion-fields');
    if (desinstalacionFields) desinstalacionFields.classList.add('hidden');

    try {
        await Promise.all([
            cargarActivosSelect('si_activo_id'),
            cargarSoftwareSelect('si_software_id'),
            cargarLicenciasSelect('si_licencia_id'),
            cargarUsuariosSelect('si_instalado_por'),
            cargarUsuariosSelect('si_desinstalado_por')
        ]);
    } catch (error) {
        console.error('❌ Error cargando selects:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los datos necesarios', 'error');
    }

    if (usuarioActual && usuarioActual.id) {
        const instaladoPorSelect = document.getElementById('si_instalado_por');
        if (instaladoPorSelect) {
            for (let i = 0; i < instaladoPorSelect.options.length; i++) {
                if (instaladoPorSelect.options[i].value === usuarioActual.id) {
                    instaladoPorSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    await window.abrirModal('softwareInstaladoModal');
};

window.abrirModalNuevoLicencia = async function() {
    const modal = document.getElementById('licenciaModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('licenciaModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    editandoId = null;
    const form = document.getElementById('licenciaForm');
    if (form) form.reset();
    const titleElement = document.getElementById('licenciaModalTitle');
    if (titleElement) titleElement.innerText = 'Nueva Licencia';
    const codigoInput = document.getElementById('lic_codigo');
    if (codigoInput) codigoInput.value = '';
    const activoSelect = document.getElementById('lic_activo');
    if (activoSelect) activoSelect.value = 'true';

    try {
        await Promise.all([
            cargarSoftwareSelect('lic_software_id'),
            cargarActivosSelect('lic_activo_id')
        ]);
    } catch (error) {
        console.error('❌ Error cargando selects:', error);
    }

    const softwareSelect = document.getElementById('lic_software_id');
    if (softwareSelect) {
        softwareSelect.removeEventListener('change', window.handleSoftwareChange);
        window.handleSoftwareChange = async function() {
            if (this.value) {
                const codigo = await generarCodigoLicencia(this.value);
                const codigoInput = document.getElementById('lic_codigo');
                if (codigoInput) codigoInput.value = codigo;
            }
        };
        softwareSelect.addEventListener('change', window.handleSoftwareChange);
    }

    await window.abrirModal('licenciaModal');
};

// ==================== FUNCIONES AUXILIARES ====================
async function cargarSoftwareSelect(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        const { data, error } = await window.supabaseClient
            .from('software')
            .select('id, nombre, fabricante')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar software</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay software registrado</option>';
            return;
        }

        const softwarePorFabricante = new Map();
        data.forEach(sw => {
            const fabricante = sw.fabricante || 'Sin fabricante';
            if (!softwarePorFabricante.has(fabricante)) softwarePorFabricante.set(fabricante, []);
            softwarePorFabricante.get(fabricante).push(sw);
        });

        const fabricantesOrdenados = Array.from(softwarePorFabricante.keys()).sort();
        fabricantesOrdenados.forEach(fabricante => {
            const softwareList = softwarePorFabricante.get(fabricante);
            if (softwareList && softwareList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `🏢 ${fabricante} (${softwareList.length})`;
                softwareList.forEach(sw => {
                    const option = document.createElement('option');
                    option.value = sw.id;
                    option.textContent = sw.nombre;
                    option.dataset.fabricante = sw.fabricante || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error(`❌ Error cargando software en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar software</option>';
        mostrarAlerta('Error', 'No se pudieron cargar los software', 'error');
    }
}

async function cargarLicenciasSelect(selectId, incluirVacio = true) {
    if (!selectId) return;
    try {
        const select = document.getElementById(selectId);
        if (!select) return;

        const { data, error } = await window.supabaseClient
            .from('licencias')
            .select(`id, codigo_licencia, clave_producto, tipo_licencia, software:software_id (id, nombre, fabricante)`)
            .eq('activo', true)
            .order('codigo_licencia');

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Sin licencia</option>' : '';
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay licencias registradas</option>';
            return;
        }

        const licenciasPorSoftware = new Map();
        data.forEach(lic => {
            const softwareNombre = lic.software?.nombre || 'Software desconocido';
            if (!licenciasPorSoftware.has(softwareNombre)) licenciasPorSoftware.set(softwareNombre, []);
            licenciasPorSoftware.get(softwareNombre).push(lic);
        });

        const softwareOrdenados = Array.from(licenciasPorSoftware.keys()).sort();
        softwareOrdenados.forEach(softwareNombre => {
            const licenciasList = licenciasPorSoftware.get(softwareNombre);
            if (licenciasList && licenciasList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📦 ${softwareNombre} (${licenciasList.length})`;
                licenciasList.forEach(lic => {
                    const option = document.createElement('option');
                    option.value = lic.id;
                    let texto = lic.codigo_licencia || 'Sin código';
                    if (lic.clave_producto) texto += ` - ${lic.clave_producto.substring(0, 15)}${lic.clave_producto.length > 15 ? '...' : ''}`;
                    if (lic.tipo_licencia) texto += ` (${lic.tipo_licencia})`;
                    option.textContent = texto;
                    option.dataset.codigo = lic.codigo_licencia || '';
                    option.dataset.clave = lic.clave_producto || '';
                    option.dataset.tipo = lic.tipo_licencia || '';
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
    } catch (error) {
        console.error(`❌ Error cargando licencias en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) select.innerHTML = '<option value="">Error al cargar licencias</option>';
    }
}

async function generarCodigoLicencia(softwareId) {
    try {
        const { data: software } = await window.supabaseClient
            .from('software')
            .select('nombre, fabricante')
            .eq('id', softwareId)
            .single();

        if (!software) throw new Error('Software no encontrado');

        let prefijo = '';
        const nombre = software.nombre.toUpperCase();

        if (nombre.includes('WINDOWS')) prefijo = 'WIN';
        else if (nombre.includes('OFFICE')) prefijo = 'OFC';
        else if (nombre.includes('VISUAL')) prefijo = 'VSC';
        else if (nombre.includes('ADOBE')) prefijo = 'ADO';
        else if (nombre.includes('PHOTOSHOP')) prefijo = 'PS';
        else if (nombre.includes('AUTOCAD')) prefijo = 'CAD';
        else if (nombre.includes('ZOOM')) prefijo = 'ZOM';
        else if (nombre.includes('TEAMS')) prefijo = 'TMS';
        else {
            prefijo = nombre.replace(/[^A-Z]/g, '').substring(0, 3);
            if (prefijo.length < 3) prefijo = nombre.substring(0, 3);
        }

        const año = new Date().getFullYear();

        const { count } = await window.supabaseClient
            .from('licencias')
            .select('*', { count: 'exact', head: true })
            .eq('software_id', softwareId)
            .gte('creado_el', `${año}-01-01`)
            .lt('creado_el', `${año + 1}-01-01`);

        const numero = (count + 1).toString().padStart(3, '0');
        return `${prefijo}-${año}-${numero}`;
    } catch (error) {
        console.error('Error generando código:', error);
        return null;
    }
}

window.regenerarCodigoLicencia = async function() {
    const softwareId = document.getElementById('lic_software_id')?.value;
    if (!softwareId) {
        mostrarAlerta('Aviso', 'Primero seleccione un software', 'info');
        return;
    }

    mostrarLoading('Generando código...');
    try {
        const codigo = await generarCodigoLicencia(softwareId);
        const codigoInput = document.getElementById('lic_codigo');
        if (codigoInput) codigoInput.value = codigo;
        ocultarLoading();
        mostrarAlerta('Código generado', `Código: ${codigo}`, 'success');
    } catch (error) {
        ocultarLoading();
        console.error('Error generando código:', error);
        mostrarAlerta('Error', 'No se pudo generar el código', 'error');
    }
};

async function confirmarInstalacion(id) {
    const { value: formValues } = await Swal.fire({
        title: 'Confirmar Instalación',
        html: `<div class="text-left space-y-4"><div><label class="form-label font-medium text-gray-700">Fecha de instalación</label><input type="date" id="swal_fecha" class="form-input w-full" value="${new Date().toISOString().split('T')[0]}" required></div><div><label class="form-label font-medium text-gray-700">Instalado por</label><select id="swal_instalado_por" class="form-input w-full"><option value="">Seleccionar usuario</option></select></div><div><label class="form-label font-medium text-gray-700">Ruta de instalación</label><input type="text" id="swal_ruta" class="form-input w-full" placeholder="C:\\Program Files\\..."></div><div><label class="form-label font-medium text-gray-700">Configuración especial</label><textarea id="swal_configuracion" class="form-input w-full" rows="2"></textarea></div></div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Confirmar Instalación',
        cancelButtonText: 'Cancelar',
        preConfirm: async () => {
            const fecha = document.getElementById('swal_fecha').value;
            const instaladoPor = document.getElementById('swal_instalado_por').value;
            const ruta = document.getElementById('swal_ruta').value;
            const configuracion = document.getElementById('swal_configuracion').value;
            if (!fecha) { Swal.showValidationMessage('La fecha es requerida'); return false; }
            if (!instaladoPor) { Swal.showValidationMessage('Debe seleccionar quién instaló'); return false; }
            return { fecha, instaladoPor, ruta, configuracion };
        },
        didOpen: async () => {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .eq('activo', true);
            const select = document.getElementById('swal_instalado_por');
            if (select && usuarios) {
                usuarios.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.id;
                    option.textContent = u.correo;
                    select.appendChild(option);
                });
                if (usuarioActual && usuarioActual.id) select.value = usuarioActual.id;
            }
        }
    });

    if (formValues) {
        mostrarLoading('Confirmando instalación...');
        try {
            if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
            const ahora = new Date().toISOString();

            const { error } = await window.supabaseClient
                .from('software_instalado')
                .update({
                    estado: 'INSTALADO',
                    fecha_instalacion: formValues.fecha,
                    instalado_por: formValues.instaladoPor,
                    ruta_instalacion: formValues.ruta || null,
                    configuracion_especial: formValues.configuracion || null,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Instalación confirmada correctamente', 'success');
            await cargarVistaSoftwareInstalado();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo confirmar la instalación', 'error');
        }
    }
}

async function desinstalarSoftware(id) {
    const { value: formValues } = await Swal.fire({
        title: 'Desinstalar Software',
        html: `<div class="text-left space-y-4"><div><label class="form-label font-medium text-gray-700">Fecha de desinstalación</label><input type="date" id="swal_fecha" class="form-input w-full" value="${new Date().toISOString().split('T')[0]}" required></div><div><label class="form-label font-medium text-gray-700">Desinstalado por</label><select id="swal_desinstalado_por" class="form-input w-full"><option value="">Seleccionar usuario</option></select></div><div><label class="form-label font-medium text-gray-700">Motivo de desinstalación</label><textarea id="swal_motivo" class="form-input w-full" rows="3" required></textarea></div></div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        confirmButtonText: 'Desinstalar',
        cancelButtonText: 'Cancelar',
        preConfirm: async () => {
            const fecha = document.getElementById('swal_fecha').value;
            const desinstaladoPor = document.getElementById('swal_desinstalado_por').value;
            const motivo = document.getElementById('swal_motivo').value;
            if (!fecha) { Swal.showValidationMessage('La fecha es requerida'); return false; }
            if (!desinstaladoPor) { Swal.showValidationMessage('Debe seleccionar quién desinstala'); return false; }
            if (!motivo) { Swal.showValidationMessage('El motivo es requerido'); return false; }
            return { fecha, desinstaladoPor, motivo };
        },
        didOpen: async () => {
            const { data: usuarios } = await window.supabaseClient
                .from('usuarios')
                .select('id, correo, empleado_id')
                .eq('activo', true);
            const select = document.getElementById('swal_desinstalado_por');
            if (select && usuarios) {
                usuarios.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.id;
                    option.textContent = u.correo;
                    select.appendChild(option);
                });
                if (usuarioActual && usuarioActual.id) select.value = usuarioActual.id;
            }
        }
    });

    if (formValues) {
        mostrarLoading('Procesando desinstalación...');
        try {
            if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
            const ahora = new Date().toISOString();

            const { error } = await window.supabaseClient
                .from('software_instalado')
                .update({
                    estado: 'DESINSTALADO',
                    fecha_desinstalacion: formValues.fecha,
                    motivo_desinstalacion: formValues.motivo,
                    desinstalado_por: formValues.desinstaladoPor,
                    modificado_el: ahora,
                    modificado_por: usuarioActual.id
                })
                .eq('id', id);

            if (error) throw error;

            ocultarLoading();
            mostrarAlerta('Éxito', 'Software desinstalado correctamente', 'success');
            await cargarVistaSoftwareInstalado();
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo desinstalar', 'error');
        }
    }
}

async function asignarLicencia(id) {
    mostrarLoading('Cargando activos disponibles...');
    try {
        const { data: licencia } = await window.supabaseClient
            .from('licencias')
            .select('*, software:software_id (nombre)')
            .eq('id', id)
            .single();

        const { data: activos } = await window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo')
            .order('nombre');

        ocultarLoading();

        const activosOptions = activos?.map(a => `<option value="${a.id}">${a.nombre} (${a.codigo_activo || 'Sin código'})</option>`).join('') || '';

        const { value: activoId } = await Swal.fire({
            title: `Asignar Licencia`,
            html: `<div class="text-left"><div class="bg-gray-50 p-3 rounded-lg mb-4"><p><strong>Software:</strong> ${licencia?.software?.nombre || 'N/A'}</p><p><strong>Código:</strong> ${licencia?.codigo_licencia || 'N/A'}</p></div><label class="form-label font-medium text-gray-700">Seleccionar activo</label><select id="swal_activo" class="form-input w-full"><option value="">Sin asignar</option>${activosOptions}</select><p class="text-xs text-gray-400 mt-1">La licencia se puede asignar a un solo activo</p></div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Asignar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => document.getElementById('swal_activo').value
        });

        if (activoId !== undefined) {
            mostrarLoading('Asignando licencia...');
            try {
                if (!usuarioActual || !usuarioActual.id) throw new Error('Usuario no autenticado');
                const ahora = new Date().toISOString();

                const { error } = await window.supabaseClient
                    .from('licencias')
                    .update({
                        activo_id: activoId || null,
                        modificado_el: ahora,
                        modificado_por: usuarioActual.id
                    })
                    .eq('id', id);

                if (error) throw error;

                ocultarLoading();
                mostrarAlerta('Éxito', activoId ? 'Licencia asignada correctamente' : 'Licencia desasignada', 'success');
                await cargarVistaLicencias();
            } catch (error) {
                ocultarLoading();
                console.error('Error:', error);
                mostrarAlerta('Error', 'No se pudo asignar la licencia', 'error');
            }
        }
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar los datos', 'error');
    }
}

// ==================== FUNCIONES DE FILTROS ====================
window.filtrarSoftwareInstalado = function(estado) {
    const cards = document.querySelectorAll('#software-instalado-grid .card-item');
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

window.filtrarLicencias = function(filtro) {
    const cards = document.querySelectorAll('#licencias-grid .card-item');
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-primary', 'font-bold');
        if (btn.dataset.filter === filtro || (filtro === 'todos' && btn.dataset.filter === 'todos')) btn.classList.add('ring-2', 'ring-primary', 'font-bold');
    });
    let contador = 0;
    cards.forEach(card => {
        let mostrar = true;
        if (filtro !== 'todos') {
            if (filtro === 'vigentes' || filtro === 'por-vencer' || filtro === 'vencidas') mostrar = card.dataset.vigencia === filtro;
            else if (filtro === 'activas') mostrar = card.dataset.activo === 'activa';
            else if (filtro === 'inactivas') mostrar = card.dataset.activo === 'inactiva';
        }
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });
};

// ==================== FUNCIONES DE DETALLE ====================
window.verDetalleSoftware = async function(id) {
    mostrarLoading('Cargando detalles del software...');
    try {
        const { data: software, error } = await window.supabaseClient
            .from('software')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(software.creado_por);
        const modificadorInfo = software.modificado_por ? await obtenerInfoUsuarioConEmpleado(software.modificado_por) : null;

        const { count: totalInstalaciones } = await window.supabaseClient
            .from('software_instalado')
            .select('*', { count: 'exact', head: true })
            .eq('software_id', id);

        const { data: ultimasInstalaciones } = await window.supabaseClient
            .from('software_instalado')
            .select(`id, version_instalada, fecha_instalacion, estado, activo:activos (nombre, codigo_activo)`)
            .eq('software_id', id)
            .order('fecha_instalacion', { ascending: false })
            .limit(5);

        let instalacionesHtml = ultimasInstalaciones?.length ? ultimasInstalaciones.map(inst => `<div class="flex justify-between items-center py-1 border-b last:border-b-0"><div><span class="font-medium">${inst.activo?.nombre || 'N/A'}</span><span class="text-xs text-gray-500 ml-2">${inst.activo?.codigo_activo || ''}</span><span class="text-xs text-gray-400 ml-2">v${inst.version_instalada || 'N/A'}</span></div><span class="estado-badge ${inst.estado === 'INSTALADO' ? 'bg-green-100 text-green-800' : inst.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'} text-xs">${inst.estado || 'N/A'}</span></div>`).join('') : '<p class="text-gray-500 text-center py-2">No hay instalaciones registradas</p>';

        ocultarLoading();
        Swal.fire({
            title: `Detalles del Software: ${software.nombre}`,
            width: '700px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-code"></i> Información General</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Nombre:</span> ${software.nombre}</p><p><span class="font-semibold">Fabricante:</span> ${software.fabricante || 'No especificado'}</p><p><span class="font-semibold">Estado:</span> <span class="${software.activo ? 'text-green-600' : 'text-red-600'} font-semibold">${software.activo ? 'Activo' : 'Inactivo'}</span></p>${software.descripcion ? `<p class="col-span-2"><span class="font-semibold">Descripción:</span> ${software.descripcion}</p>` : ''}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-chart-bar"></i> Estadísticas</h3><div class="grid grid-cols-2 gap-3"><div class="bg-indigo-50 p-2 rounded-lg text-center"><span class="text-2xl font-bold text-indigo-600">${totalInstalaciones}</span><p class="text-xs text-gray-600">Instalaciones totales</p></div><div class="bg-purple-50 p-2 rounded-lg text-center"><span class="text-2xl font-bold text-purple-600">${ultimasInstalaciones?.length || 0}</span><p class="text-xs text-gray-600">Últimas 5</p></div></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-desktop"></i> Últimas Instalaciones</h3><div class="max-h-40 overflow-y-auto">${instalacionesHtml}</div>${totalInstalaciones > 5 ? `<div class="text-center mt-2"><button onclick="verSoftwareInstalado('${software.id}')" class="text-xs text-primary hover:underline">Ver todas las instalaciones (${totalInstalaciones})</button></div>` : ''}</div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400"><h3 class="font-bold text-gray-600 mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${software.creado_el ? new Date(software.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${software.modificado_el ? new Date(software.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

window.verDetalleLicencia = async function(id) {
    mostrarLoading('Cargando detalles de la licencia...');
    try {
        const { data: licencia, error } = await window.supabaseClient
            .from('licencias')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const { data: software } = await window.supabaseClient
            .from('software')
            .select('nombre, fabricante, descripcion')
            .eq('id', licencia.software_id)
            .single();

        let activo = null;
        if (licencia.activo_id) {
            const { data: act } = await window.supabaseClient
                .from('activos')
                .select('nombre, codigo_activo')
                .eq('id', licencia.activo_id)
                .single();
            activo = act;
        }

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(licencia.creado_por);
        const modificadorInfo = licencia.modificado_por ? await obtenerInfoUsuarioConEmpleado(licencia.modificado_por) : null;

        const hoy = new Date();
        let estadoVigencia = '', estadoClass = '';
        if (licencia.fecha_vencimiento) {
            const vencimiento = new Date(licencia.fecha_vencimiento);
            const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) { estadoVigencia = 'Vencida'; estadoClass = 'bg-red-100 text-red-800'; }
            else if (diasRestantes < 30) { estadoVigencia = `Por vencer (${diasRestantes} días)`; estadoClass = 'bg-yellow-100 text-yellow-800'; }
            else { estadoVigencia = 'Vigente'; estadoClass = 'bg-green-100 text-green-800'; }
        } else { estadoVigencia = 'Vigente (sin vencimiento)'; estadoClass = 'bg-green-100 text-green-800'; }

        ocultarLoading();
        Swal.fire({
            title: 'Detalles de la Licencia',
            width: '700px',
            html: `<div class="text-left space-y-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-code"></i> Software</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Nombre:</span> ${software?.nombre || 'N/A'}</p><p><span class="font-semibold">Fabricante:</span> ${software?.fabricante || 'N/A'}</p>${software?.descripcion ? `<p class="col-span-2"><span class="font-semibold">Descripción:</span> ${software.descripcion}</p>` : ''}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-key"></i> Detalles de la Licencia</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Código:</span> <span class="font-mono">${licencia.codigo_licencia || 'N/A'}</span></p><p><span class="font-semibold">Tipo:</span> ${licencia.tipo_licencia || 'No especificado'}</p><p><span class="font-semibold">Modalidad:</span> ${licencia.modalidad || 'No especificada'}</p><p><span class="font-semibold">Proveedor:</span> ${licencia.proveedor || 'No especificado'}</p><p><span class="font-semibold">Estado:</span> <span class="estado-badge ${licencia.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${licencia.activo ? 'Activa' : 'Inactiva'}</span></p><p><span class="font-semibold">Vigencia:</span> <span class="estado-badge ${estadoClass}">${estadoVigencia}</span></p></div></div>${licencia.clave_producto ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning"><h3 class="font-bold text-warning mb-3"><i class="fas fa-lock"></i> Clave de Producto</h3><p class="font-mono bg-gray-100 p-2 rounded">${licencia.clave_producto}</p></div>` : ''}<div class="grid grid-cols-2 gap-4"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-shopping-cart"></i> Fecha de Compra</h3><p class="text-lg">${licencia.fecha_compra ? new Date(licencia.fecha_compra).toLocaleDateString() : 'No registrada'}</p></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-hourglass-end"></i> Fecha de Vencimiento</h3><p class="text-lg">${licencia.fecha_vencimiento ? new Date(licencia.fecha_vencimiento).toLocaleDateString() : 'No vence'}</p></div></div>${activo ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500"><h3 class="font-bold text-purple-700 mb-3"><i class="fas fa-desktop"></i> Activo Asignado</h3><p><span class="font-semibold">Nombre:</span> ${activo.nombre}</p><p><span class="font-semibold">Código:</span> ${activo.codigo_activo || 'N/A'}</p></div>` : ''}<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400"><h3 class="font-bold text-gray-600 mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${licencia.creado_el ? new Date(licencia.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${licencia.modificado_el ? new Date(licencia.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

window.verDetalleInstalacion = async function(id) {
    mostrarLoading('Cargando detalles de la instalación...');
    try {
        const { data: instalacion, error } = await window.supabaseClient
            .from('software_instalado')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        const { data: activo } = await window.supabaseClient
            .from('activos')
            .select(`id, nombre, codigo_activo, estado, ubicacion:ubicacion_id (id, nombre, descripcion), empresa:empresa_id (id, nombre, ruc)`)
            .eq('id', instalacion.activo_id)
            .single();

        const { data: software } = await window.supabaseClient
            .from('software')
            .select('id, nombre, fabricante, descripcion')
            .eq('id', instalacion.software_id)
            .single();

        const creadorInfo = await obtenerInfoUsuarioConEmpleado(instalacion.creado_por);
        const modificadorInfo = instalacion.modificado_por ? await obtenerInfoUsuarioConEmpleado(instalacion.modificado_por) : null;
        const instaladorInfo = instalacion.instalado_por ? await obtenerInfoUsuarioConEmpleado(instalacion.instalado_por) : null;
        const desinstaladorInfo = instalacion.desinstalado_por ? await obtenerInfoUsuarioConEmpleado(instalacion.desinstalado_por) : null;

        ocultarLoading();

        const estadoClass = { 'INSTALADO': 'bg-green-100 text-green-800', 'PENDIENTE': 'bg-yellow-100 text-yellow-800', 'DESINSTALADO': 'bg-gray-100 text-gray-800' }[instalacion.estado] || 'bg-gray-100';

        Swal.fire({
            title: 'Detalles de la Instalación',
            width: '800px',
            html: `<div class="text-left space-y-4 max-h-[70vh] overflow-y-auto pr-2"><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-primary"><h3 class="font-bold text-primary mb-3"><i class="fas fa-code"></i> Software</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Nombre:</span> ${software?.nombre || 'N/A'}</p><p><span class="font-semibold">Fabricante:</span> ${software?.fabricante || 'N/A'}</p>${software?.descripcion ? `<p class="col-span-2"><span class="font-semibold">Descripción:</span> ${software.descripcion}</p>` : ''}</div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-success"><h3 class="font-bold text-success mb-3"><i class="fas fa-desktop"></i> Activo</h3><div class="grid grid-cols-2 gap-3"><p class="col-span-2"><span class="font-semibold">Nombre:</span> ${activo?.nombre || 'N/A'}</p><p><span class="font-semibold">Código:</span> ${activo?.codigo_activo || 'N/A'}</p><p class="col-span-2"><span class="font-semibold">Ubicación:</span> ${activo?.ubicacion?.nombre || 'No especificada'}${activo?.ubicacion?.descripcion ? `<span class="text-xs text-gray-500 ml-1">(${activo.ubicacion.descripcion})</span>` : ''}</p><p class="col-span-2"><span class="font-semibold">Empresa:</span> ${activo?.empresa?.nombre || 'No especificada'}${activo?.empresa?.ruc ? `<span class="text-xs text-gray-500 ml-1">RUC: ${activo.empresa.ruc}</span>` : ''}</p><p><span class="font-semibold">Estado:</span> <span class="estado-badge estado-${activo?.estado || 'DISPONIBLE'}">${activo?.estado || 'DISPONIBLE'}</span></p></div></div><div class="bg-gray-50 p-4 rounded-lg border-l-4 border-warning"><h3 class="font-bold text-warning mb-3"><i class="fas fa-clipboard-list"></i> Detalles de la Instalación</h3><div class="grid grid-cols-2 gap-3"><p><span class="font-semibold">Estado:</span> <span class="estado-badge ${estadoClass}">${instalacion.estado || 'INSTALADO'}</span></p><p><span class="font-semibold">Versión:</span> ${instalacion.version_instalada || 'N/A'}</p><p><span class="font-semibold">Arquitectura:</span> ${instalacion.arquitectura_instalada || 'N/A'}</p><p><span class="font-semibold">Instalado por:</span> ${instaladorInfo?.nombre || 'No especificado'}</p><p><span class="font-semibold">Fecha Instalación:</span> ${instalacion.fecha_instalacion ? new Date(instalacion.fecha_instalacion).toLocaleDateString() : 'No registrada'}</p>${instalacion.ruta_instalacion ? `<p class="col-span-2"><span class="font-semibold">Ruta:</span> ${instalacion.ruta_instalacion}</p>` : ''}${instalacion.configuracion_especial ? `<p class="col-span-2"><span class="font-semibold">Configuración:</span> ${instalacion.configuracion_especial}</p>` : ''}</div></div>${instalacion.estado === 'DESINSTALADO' ? `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-red-400"><h3 class="font-bold text-red-600 mb-3"><i class="fas fa-trash-alt"></i> Desinstalación</h3><div class="grid grid-cols-2 gap-3"><p><span class="font-semibold">Fecha Desinstalación:</span> ${instalacion.fecha_desinstalacion ? new Date(instalacion.fecha_desinstalacion).toLocaleDateString() : 'No registrada'}</p><p><span class="font-semibold">Desinstalado por:</span> ${desinstaladorInfo?.nombre || 'No especificado'}</p>${instalacion.motivo_desinstalacion ? `<p class="col-span-2"><span class="font-semibold">Motivo:</span> ${instalacion.motivo_desinstalacion}</p>` : ''}</div></div>` : ''}<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-info"><h3 class="font-bold text-info mb-3"><i class="fas fa-history"></i> Auditoría</h3><div class="grid grid-cols-2 gap-4"><div><p class="text-sm"><span class="font-semibold">Creado el:</span></p><p class="text-sm">${instalacion.creado_el ? new Date(instalacion.creado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${creadorInfo.nombre}</span></p>${creadorInfo.correo ? `<p class="text-xs text-gray-400">${creadorInfo.correo}</p>` : ''}</div>${modificadorInfo ? `<div><p class="text-sm"><span class="font-semibold">Modificado el:</span></p><p class="text-sm">${instalacion.modificado_el ? new Date(instalacion.modificado_el).toLocaleString() : 'N/A'}</p><p class="text-sm mt-1"><span class="font-semibold">Por:</span> <span class="text-primary font-medium">${modificadorInfo.nombre}</span></p>${modificadorInfo.correo ? `<p class="text-xs text-gray-400">${modificadorInfo.correo}</p>` : ''}</div>` : ''}</div></div></div>`,
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

window.verSoftwareInstalado = async function(softwareId) {
    mostrarLoading('Cargando software instalado...');
    try {
        const { data: software } = await window.supabaseClient
            .from('software')
            .select('nombre, fabricante')
            .eq('id', softwareId)
            .single();

        const { data: instalaciones } = await window.supabaseClient
            .from('software_instalado')
            .select(`*, activo:activos (id, nombre, codigo_activo, estado), instalador:instalado_por (id, correo)`)
            .eq('software_id', softwareId)
            .order('fecha_instalacion', { ascending: false });

        ocultarLoading();

        const totalInstaladas = instalaciones?.filter(i => i.estado === 'INSTALADO').length || 0;
        const totalPendientes = instalaciones?.filter(i => i.estado === 'PENDIENTE').length || 0;
        const totalDesinstaladas = instalaciones?.filter(i => i.estado === 'DESINSTALADO').length || 0;

        let instalacionesHtml = '';
        if (instalaciones && instalaciones.length > 0) {
            instalaciones.forEach(inst => {
                const estadoClass = { 'INSTALADO': 'bg-green-100 text-green-800', 'PENDIENTE': 'bg-yellow-100 text-yellow-800', 'DESINSTALADO': 'bg-gray-100 text-gray-800' }[inst.estado] || 'bg-gray-100';
                instalacionesHtml += `<div class="border-b pb-3 mb-3 last:border-b-0 hover:bg-gray-50 p-2 rounded transition-colors"><div class="flex justify-between items-start"><div class="flex-1"><p class="font-semibold text-primary">${inst.activo?.nombre || 'Activo desconocido'}</p><p class="text-xs text-gray-500">Código: ${inst.activo?.codigo_activo || 'N/A'}</p></div><span class="estado-badge ${estadoClass} text-xs px-2 py-1">${inst.estado || 'INSTALADO'}</span></div><div class="grid grid-cols-2 gap-2 text-sm mt-2"><div><span class="font-medium">Versión:</span> ${inst.version_instalada || 'No especificada'}</div><div><span class="font-medium">Arquitectura:</span> ${inst.arquitectura_instalada || 'No especificada'}</div><div><span class="font-medium">Instalado:</span> ${inst.fecha_instalacion ? new Date(inst.fecha_instalacion).toLocaleDateString() : 'No registrada'}</div><div><span class="font-medium">Por:</span> ${inst.instalador?.correo || 'No especificado'}</div></div>${inst.ruta_instalacion ? `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-folder"></i> ${inst.ruta_instalacion}</div>` : ''}${inst.estado === 'DESINSTALADO' && inst.motivo_desinstalacion ? `<div class="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded"><p><span class="font-medium">Desinstalado:</span> ${inst.fecha_desinstalacion ? new Date(inst.fecha_desinstalacion).toLocaleDateString() : 'N/A'}</p><p><span class="font-medium">Motivo:</span> ${inst.motivo_desinstalacion}</p></div>` : ''}</div>`;
            });
        } else {
            instalacionesHtml = '<p class="text-center text-gray-500 py-4">No hay instalaciones registradas para este software</p>';
        }

        Swal.fire({
            title: `Instalaciones de ${software?.nombre || 'Software'}`,
            width: '800px',
            html: `<div class="text-left"><div class="grid grid-cols-3 gap-2 mb-4"><div class="bg-green-50 p-2 rounded-lg text-center"><span class="text-2xl font-bold text-green-600">${totalInstaladas}</span><p class="text-xs">Instaladas</p></div><div class="bg-yellow-50 p-2 rounded-lg text-center"><span class="text-2xl font-bold text-yellow-600">${totalPendientes}</span><p class="text-xs">Pendientes</p></div><div class="bg-gray-50 p-2 rounded-lg text-center"><span class="text-2xl font-bold text-gray-600">${totalDesinstaladas}</span><p class="text-xs">Desinstaladas</p></div></div><div class="bg-gray-50 p-3 rounded-lg mb-4"><p><strong>Software:</strong> ${software?.nombre || 'N/A'}</p><p><strong>Fabricante:</strong> ${software?.fabricante || 'No especificado'}</p></div><h3 class="font-bold text-primary mb-2">Instalaciones (${instalaciones?.length || 0})</h3><div class="max-h-96 overflow-y-auto border rounded-lg p-3 bg-white">${instalacionesHtml}</div></div>`,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar',
            showCloseButton: true
        });
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudieron cargar las instalaciones', 'error');
    }
};
