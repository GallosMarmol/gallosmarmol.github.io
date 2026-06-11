// ==================== EXPORTAR TICKETS A EXCEL/PDF ====================

// Variable global para almacenar los filtros actuales
let filtrosTicketsGlobal = {
    fechaDesde: '',
    fechaHasta: '',
    prioridad: '',
    categoria: '',
    creadoPor: '',
    asignado: '',
    activo: '',
    busqueda: '',
    orden: 'creado_el.desc'
};

function obtenerFiltrosActuales() {
    // Primero intentar obtener de los filtros guardados globalmente
    if (typeof window.obtenerFiltrosGuardados === 'function') {
        const filtrosGuardados = window.obtenerFiltrosGuardados();
        if (filtrosGuardados && Object.values(filtrosGuardados).some(v => v !== '')) {
            console.log('📋 Usando filtros desde variable global:', filtrosGuardados);
            return filtrosGuardados;
        }
    }
    
    // Si no, intentar leer del DOM
    const filtrosDOM = {
        fechaDesde: document.getElementById('filtroFechaDesde')?.value || '',
        fechaHasta: document.getElementById('filtroFechaHasta')?.value || '',
        prioridad: document.getElementById('filtroPrioridad')?.value || '',
        categoria: document.getElementById('filtroCategoria')?.value || '',
        creadoPor: document.getElementById('filtroCreadoPor')?.value || '',
        asignado: document.getElementById('filtroAsignado')?.value || '',
        activo: document.getElementById('filtroActivo')?.value || '',
        busqueda: document.getElementById('busquedaTickets')?.value || '',
        orden: document.getElementById('ordenTickets')?.value || 'creado_el.desc'
    };
    
    console.log('📋 Usando filtros del DOM:', filtrosDOM);
    return filtrosDOM;
}

// ==================== ACTUALIZAR FILTROS GLOBALES ====================
function actualizarFiltrosGlobales() {
    filtrosTicketsGlobal = {
        fechaDesde: document.getElementById('filtroFechaDesde')?.value || '',
        fechaHasta: document.getElementById('filtroFechaHasta')?.value || '',
        prioridad: document.getElementById('filtroPrioridad')?.value || '',
        categoria: document.getElementById('filtroCategoria')?.value || '',
        creadoPor: document.getElementById('filtroCreadoPor')?.value || '',
        asignado: document.getElementById('filtroAsignado')?.value || '',
        activo: document.getElementById('filtroActivo')?.value || '',
        busqueda: document.getElementById('busquedaTickets')?.value || '',
        orden: document.getElementById('ordenTickets')?.value || 'creado_el.desc'
    };
    console.log('🔄 Filtros globales actualizados:', filtrosTicketsGlobal);
}

// Exponer funciones globalmente
window.actualizarFiltrosGlobales = actualizarFiltrosGlobales;
window.obtenerFiltrosActuales = obtenerFiltrosActuales;

// ==================== OBTENER TICKETS CON FILTROS ACTUALES ====================
async function obtenerTicketsConFiltrosActuales() {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        const esAdmin = permisos.rol === 'ADMINISTRADOR';
        
        // Obtener filtros actuales
        const filtros = obtenerFiltrosActuales();
        
        console.log('📊 FILTROS PARA EXPORTACIÓN:', {
            fechaDesde: filtros.fechaDesde,
            fechaHasta: filtros.fechaHasta,
            prioridad: filtros.prioridad,
            categoria: filtros.categoria,
            creadoPor: filtros.creadoPor,
            asignado: filtros.asignado,
            activo: filtros.activo,
            busqueda: filtros.busqueda,
            orden: filtros.orden
        });
        
        let query = window.supabaseClient
            .from('tickets')
            .select(`
                *,
                categoria:ticket_categorias!categoria_id (id, nombre, color, icono),
                creador:creado_por (id, correo),
                asignado:asignado_a (id, correo),
                activo:activo_id (id, nombre, codigo_activo)
            `);
        
        // Si no es administrador, solo ver sus tickets
        if (!esAdmin) {
            query = query.eq('creado_por', usuarioActual.id);
        }
        
        // ============================================
        // APLICAR FILTROS - USANDO LOS VALORES OBTENIDOS
        // ============================================
        if (filtros.fechaDesde && filtros.fechaDesde !== '') {
            query = query.gte('creado_el', `${filtros.fechaDesde}T00:00:00`);
        }
        if (filtros.fechaHasta && filtros.fechaHasta !== '') {
            query = query.lte('creado_el', `${filtros.fechaHasta}T23:59:59`);
        }
        if (filtros.prioridad && filtros.prioridad !== '') {
            query = query.eq('prioridad', filtros.prioridad);
        }
        if (filtros.categoria && filtros.categoria !== '') {
            query = query.eq('categoria_id', filtros.categoria);
        }
        if (filtros.creadoPor && filtros.creadoPor !== '') {
            query = query.eq('creado_por', filtros.creadoPor);
        }
        if (filtros.asignado && filtros.asignado !== '') {
            query = query.eq('asignado_a', filtros.asignado);
        }
        if (filtros.activo && filtros.activo !== '') {
            query = query.ilike('activo.nombre', `%${filtros.activo}%`);
        }
        if (filtros.busqueda && filtros.busqueda !== '') {
            query = query.or(`titulo.ilike.%${filtros.busqueda}%,descripcion.ilike.%${filtros.busqueda}%`);
        }
        
        // Aplicar ordenamiento
        const [campoOrden, direccion] = filtros.orden.split('.');
        query = query.order(campoOrden, { ascending: direccion === 'asc' });
        
        const { data: tickets, error } = await query;
        
        if (error) throw error;
        
        console.log(`📊 Exportación: ${tickets?.length || 0} tickets encontrados con los filtros aplicados`);
        
        // ============================================
        // OBTENER NOMBRES DE USUARIOS
        // ============================================
        const usuariosIds = new Set();
        tickets?.forEach(t => {
            if (t.creado_por) usuariosIds.add(t.creado_por);
            if (t.asignado_a) usuariosIds.add(t.asignado_a);
        });
        
        const nombresMap = await obtenerNombresUsuariosEnLote(Array.from(usuariosIds));
        
        function obtenerNombre(userId) {
            if (!userId) return 'Sistema';
            return nombresMap.get(userId) || userId;
        }
        
        // Formatear datos para exportación
        const datosFormateados = tickets?.map(t => ({
            ...t,
            id: t.id,
            numero: t.numero || t.id.substring(0, 8),
            titulo: t.titulo || 'N/A',
            categoria_nombre: t.categoria?.nombre || 'N/A',
            prioridad: t.prioridad || 'MEDIA',
            estado: t.estado || 'ABIERTO',
            creador_nombre: obtenerNombre(t.creado_por),
            asignado_nombre: t.asignado_a ? obtenerNombre(t.asignado_a) : 'No asignado',
            activo_nombre: t.activo?.nombre || 'N/A',
            fecha: new Date(t.creado_el).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            creado_el: t.creado_el
        })) || [];
        
        return datosFormateados;
        
    } catch (error) {
        console.error('Error obteniendo tickets con filtros:', error);
        return [];
    }
}

// ==================== EXPORTAR TICKETS A EXCEL ====================
window.exportarTicketsExcel = async function() {
    mostrarLoading('Generando archivo Excel...');
    
    try {
        // Actualizar filtros globales antes de exportar
        actualizarFiltrosGlobales();
        
        const tickets = await obtenerTicketsConFiltrosActuales();
        
        if (!tickets || tickets.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay tickets para exportar con los filtros seleccionados', 'info');
            return;
        }
        
        const datos = tickets.map(t => ({
            'NÚMERO': t.numero,
            'TÍTULO': t.titulo,
            'CATEGORÍA': t.categoria_nombre,
            'PRIORIDAD': t.prioridad,
            'ESTADO': t.estado,
            'CREADO POR': t.creador_nombre,
            'ASIGNADO A': t.asignado_nombre,
            'ACTIVO ASOCIADO': t.activo_nombre,
            'FECHA': t.fecha
        }));
        
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
        
        const colWidths = [
            { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 12 },
            { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }
        ];
        ws['!cols'] = colWidths;
        
        XLSX.writeFile(wb, `tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${datos.length} tickets a Excel con los filtros aplicados`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error exportando a Excel:', error);
        mostrarAlerta('Error', 'No se pudo exportar a Excel: ' + error.message, 'error');
    }
};

// ==================== EXPORTAR TICKETS A PDF ====================
window.exportarTicketsPDF = async function() {
    mostrarLoading('Generando PDF...');
    
    try {
        actualizarFiltrosGlobales();
        const tickets = await obtenerTicketsConFiltrosActuales();
        
        if (!tickets || tickets.length === 0) {
            ocultarLoading();
            mostrarAlerta('Info', 'No hay tickets para exportar con los filtros seleccionados', 'info');
            return;
        }
        
        const total = tickets.length;
        const abiertos = tickets.filter(t => t.estado === 'ABIERTO').length;
        const enProceso = tickets.filter(t => t.estado === 'EN_PROCESO').length;
        const resueltos = tickets.filter(t => t.estado === 'RESUELTO').length;
        const cerrados = tickets.filter(t => t.estado === 'CERRADO').length;
        const urgentes = tickets.filter(t => t.prioridad === 'URGENTE').length;
        
        const filtros = obtenerFiltrosActuales();
        const resumenFiltros = [];
        if (filtros.prioridad) resumenFiltros.push(`Prioridad: ${filtros.prioridad}`);
        if (filtros.categoria) resumenFiltros.push(`Categoría seleccionada`);
        if (filtros.fechaDesde) resumenFiltros.push(`Desde: ${filtros.fechaDesde}`);
        if (filtros.fechaHasta) resumenFiltros.push(`Hasta: ${filtros.fechaHasta}`);
        if (filtros.busqueda) resumenFiltros.push(`Búsqueda: ${filtros.busqueda}`);
        const textoFiltros = resumenFiltros.length > 0 ? resumenFiltros.join(', ') : 'Ninguno (todos los tickets)';
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reporte de Tickets</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #39080a; text-align: center; }
                    .filtros { background: #f0f0f0; padding: 10px; margin: 15px 0; border-radius: 5px; }
                    .stats { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
                    .stat { background: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; flex: 1; min-width: 80px; border-left: 3px solid #39080a; }
                    .stat .number { font-size: 22px; font-weight: bold; color: #39080a; }
                    .stat .label { font-size: 11px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #39080a; color: white; padding: 8px; text-align: left; }
                    td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
                    .urgente { background: #fee2e2; color: #991b1b; }
                    .alta { background: #fed7aa; color: #9a3412; }
                    .media { background: #dbeafe; color: #1e40af; }
                    .baja { background: #e5e7eb; color: #374151; }
                </style>
            </head>
            <body>
                <h1>REPORTE DE TICKETS</h1>
                <p style="text-align:center">Generado: ${new Date().toLocaleString('es-ES')}</p>
                <div class="filtros"><strong>Filtros aplicados:</strong> ${textoFiltros}</div>
                <div class="stats">
                    <div class="stat"><div class="number">${total}</div><div class="label">Total</div></div>
                    <div class="stat"><div class="number">${abiertos}</div><div class="label">Abiertos</div></div>
                    <div class="stat"><div class="number">${enProceso}</div><div class="label">En Proceso</div></div>
                    <div class="stat"><div class="number">${resueltos}</div><div class="label">Resueltos</div></div>
                    <div class="stat"><div class="number">${cerrados}</div><div class="label">Cerrados</div></div>
                    <div class="stat"><div class="number">${urgentes}</div><div class="label">Urgentes</div></div>
                </div>
                <table>
                    <thead><tr>
                        <th>N°</th><th>TÍTULO</th><th>CATEGORÍA</th><th>PRIORIDAD</th><th>ESTADO</th><th>CREADO POR</th><th>ASIGNADO A</th><th>FECHA</th>
                    </tr></thead>
                    <tbody>
                        ${tickets.map(t => `
                            <tr>
                                <td>${t.numero}</td>
                                <td><strong>${t.titulo}</strong></td>
                                <td>${t.categoria_nombre}</td>
                                <td><span class="badge ${t.prioridad === 'URGENTE' ? 'urgente' : t.prioridad === 'ALTA' ? 'alta' : t.prioridad === 'MEDIA' ? 'media' : 'baja'}">${t.prioridad}</span></td>
                                <td>${t.estado}</td>
                                <td>${t.creador_nombre}</td>
                                <td>${t.asignado_nombre}</td>
                                <td>${t.fecha}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">Gallos Mármol</div>
            </body>
            </html>
        `;
        
        const ventana = window.open('', '_blank');
        ventana.document.write(html);
        ventana.document.close();
        
        ocultarLoading();
        mostrarAlerta('Éxito', `Se exportaron ${tickets.length} tickets a PDF`, 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo exportar a PDF: ' + error.message, 'error');
    }
};

// ==================== OBTENER NOMBRES DE USUARIOS EN LOTE ====================
async function obtenerNombresUsuariosEnLote(usuarioIds) {
    if (!usuarioIds || usuarioIds.length === 0) return new Map();
    
    const resultado = new Map();
    const idsUnicos = [...new Set(usuarioIds.filter(id => id && id !== 'null' && id !== ''))];
    
    if (idsUnicos.length === 0) return resultado;
    
    try {
        const { data: usuarios, error } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .in('id', idsUnicos);
        
        if (error) throw error;
        
        const empleadosIds = usuarios?.map(u => u.empleado_id).filter(id => id) || [];
        let empleadosMap = new Map();
        
        if (empleadosIds.length > 0) {
            const { data: empleados } = await window.supabaseClient
                .from('empleados')
                .select('id, nombre_completo')
                .in('id', empleadosIds);
            
            if (empleados) {
                empleados.forEach(e => empleadosMap.set(e.id, e.nombre_completo));
            }
        }
        
        usuarios?.forEach(u => {
            let nombre = u.correo;
            if (u.empleado_id && empleadosMap.has(u.empleado_id)) {
                nombre = empleadosMap.get(u.empleado_id);
            }
            resultado.set(u.id, nombre);
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    return resultado;
}