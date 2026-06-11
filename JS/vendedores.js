// ==================== VENDEDORES - GESTIÓN ====================

async function cargarVistaVendedores() {
    mostrarLoading('Cargando vendedores...');
    
    try {
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            mostrarAlerta('Acceso denegado', 'Solo administradores pueden acceder', 'error');
            ocultarLoading();
            return;
        }
        
        const { data: vendedores, error } = await window.supabaseClient
            .from('vendedores')
            .select('*')
            .order('orden')
            .order('nombre');
        
        if (error) throw error;
        
        const { data: config } = await window.supabaseClient
            .from('configuracion_asignacion_leads')
            .select('*');
        
        const configMap = new Map();
        config?.forEach(c => configMap.set(c.clave, c.valor));
        
        ocultarLoading();
        
        let html = `
            <div class="mb-6">
                <div class="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
                            <i class="fas fa-user-tie"></i> Vendedores - Asignación de Leads
                        </h1>
                        <p class="text-gray-500 text-sm mt-1">
                            Gestión de vendedores y distribución equitativa de leads
                        </p>
                    </div>
                    <button onclick="abrirModalNuevoVendedor()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nuevo Vendedor
                    </button>
                </div>
            </div>
            
            <!-- Configuración global -->
            <div class="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
                <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <i class="fas fa-cog text-primary"></i> Configuración de Asignación
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Tipo de distribución</label>
                        <select id="config_tipo_distribucion" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                            <option value="ROUND_ROBIN" ${configMap.get('tipo_distribucion') === 'ROUND_ROBIN' ? 'selected' : ''}>Round Robin (Equitativo)</option>
                            <option value="ALEATORIO" ${configMap.get('tipo_distribucion') === 'ALEATORIO' ? 'selected' : ''}>Aleatorio</option>
                            <option value="MANUAL" ${configMap.get('tipo_distribucion') === 'MANUAL' ? 'selected' : ''}>Manual</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Asignación automática</label>
                        <select id="config_habilitar_asignacion" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                            <option value="true" ${configMap.get('habilitar_asignacion_automatica') === 'true' ? 'selected' : ''}>Habilitada</option>
                            <option value="false" ${configMap.get('habilitar_asignacion_automatica') === 'false' ? 'selected' : ''}>Deshabilitada</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Notificar vendedor</label>
                        <select id="config_notificar_vendedor" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                            <option value="true" ${configMap.get('notificar_vendedor') === 'true' ? 'selected' : ''}>Sí</option>
                            <option value="false" ${configMap.get('notificar_vendedor') === 'false' ? 'selected' : ''}>No</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button onclick="guardarConfiguracionAsignacion()" class="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                            <i class="fas fa-save"></i> Guardar configuración
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Tabla de vendedores -->
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads Hoy</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Máx/Día</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última asignación</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${vendedores?.map(v => {
                                const porcentaje = (v.leads_asignados_hoy / v.max_leads_diarios) * 100;
                                let barraColor = 'bg-green-500';
                                if (porcentaje >= 90) barraColor = 'bg-red-500';
                                else if (porcentaje >= 70) barraColor = 'bg-orange-500';
                                else if (porcentaje >= 50) barraColor = 'bg-yellow-500';
                                
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-3">
                                            <div class="font-medium text-primary">${v.nombre}</div>
                                            ${v.empleado_id ? '<span class="text-xs text-gray-400">Vinculado a empleado</span>' : ''}
                                         </div>
                                        <td class="px-4 py-3">
                                            <div class="text-sm">${v.email || 'N/A'}</div>
                                            <div class="text-xs text-gray-400">${v.telefono || 'N/A'}</div>
                                         </div>
                                        <td class="px-4 py-3">
                                            <div class="flex items-center gap-2">
                                                <span class="text-sm font-bold ${v.leads_asignados_hoy >= v.max_leads_diarios ? 'text-red-600' : 'text-gray-800'}">${v.leads_asignados_hoy}</span>
                                                <span class="text-xs text-gray-400">/ ${v.max_leads_diarios}</span>
                                            </div>
                                            <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div class="${barraColor} h-1.5 rounded-full" style="width: ${Math.min(porcentaje, 100)}%"></div>
                                            </div>
                                         </div>
                                        <td class="px-4 py-3 text-sm">${v.max_leads_diarios}</td>
                                        <td class="px-4 py-3">
                                            <span class="px-2 py-1 rounded-full text-xs ${v.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${v.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                         </div>
                                        <td class="px-4 py-3 text-sm">${v.ultima_asignacion ? new Date(v.ultima_asignacion).toLocaleString() : 'Nunca'}</td>
                                        <td class="px-4 py-3 text-sm">${v.orden || 0}</td>
                                        <td class="px-4 py-3 text-sm whitespace-nowrap">
                                            <button onclick="editarVendedor('${v.id}')" class="text-primary hover:text-primary-dark p-1" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="toggleEstadoVendedor('${v.id}', ${v.activo})" class="${v.activo ? 'text-orange-600' : 'text-green-600'} hover:opacity-75 p-1">
                                                <i class="fas ${v.activo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                            </button>
                                            <button onclick="reiniciarContadorVendedor('${v.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Reiniciar contador">
                                                <i class="fas fa-sync-alt"></i>
                                            </button>
                                            <button onclick="eliminarVendedor('${v.id}')" class="text-red-600 hover:text-red-800 p-1" title="Eliminar">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                         </div>
                                     </div>
                                `;
                            }).join('')}
                            ${(!vendedores || vendedores.length === 0) ? `
                                <tr><td colspan="8" class="text-center py-8 text-gray-500">No hay vendedores registrados</td></tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Botón para reiniciar contadores -->
            <div class="mt-4 flex justify-end">
                <button onclick="reiniciarContadoresTodosVendedores()" class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    <i class="fas fa-clock"></i> Reiniciar contadores diarios
                </button>
            </div>
        `;
        
        document.getElementById('dynamicContent').innerHTML = html;
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarError('Error al cargar vendedores: ' + error.message);
    }
}

// ==================== CRUD VENDEDORES ====================
async function abrirModalNuevoVendedor() {
    const modal = document.getElementById('vendedorModal');
    if (modal && !modal.classList.contains('hidden')) {
        window.cerrarModal('vendedorModal');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (!modal) {
        crearModalVendedor();
    }
    
    vendedorEditandoId = null;
    
    const form = document.getElementById('vendedorForm');
    if (form) form.reset();
    
    document.getElementById('vendedorModalTitle').innerText = 'Nuevo Vendedor';
    document.getElementById('vendedor_activo').value = 'true';
    document.getElementById('vendedor_max_leads').value = '10';
    document.getElementById('vendedor_orden').value = '0';
    
    // Cargar empleados para asociar
    await cargarEmpleadosParaVendedor();
    
    await window.abrirModal('vendedorModal');
}

function crearModalVendedor() {
    const modalHtml = `
        <div id="vendedorModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl w-full max-w-md">
                <div class="bg-primary text-white p-4 rounded-t-xl flex justify-between items-center">
                    <h2 class="text-xl font-bold" id="vendedorModalTitle">Nuevo Vendedor</h2>
                    <button onclick="cerrarModal('vendedorModal')" class="hover:bg-primary-dark p-2 rounded-lg"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-6">
                    <form id="vendedorForm" onsubmit="guardarVendedor(event)">
                        <input type="hidden" id="vendedor_id">
                        <div class="mb-4">
                            <label class="form-label">Nombre *</label>
                            <input type="text" id="vendedor_nombre" class="form-input w-full" required>
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Email</label>
                            <input type="email" id="vendedor_email" class="form-input w-full">
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Teléfono</label>
                            <input type="tel" id="vendedor_telefono" class="form-input w-full">
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Empleado asociado</label>
                            <select id="vendedor_empleado_id" class="form-input w-full">
                                <option value="">Ninguno</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="form-label">Máx. leads/día</label>
                                <input type="number" id="vendedor_max_leads" class="form-input w-full" min="1" max="100">
                            </div>
                            <div>
                                <label class="form-label">Orden</label>
                                <input type="number" id="vendedor_orden" class="form-input w-full" min="0">
                            </div>
                        </div>
                        <div class="mb-4">
                            <label class="form-label">Estado</label>
                            <select id="vendedor_activo" class="form-input w-full">
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" onclick="cerrarModal('vendedorModal')" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function cargarEmpleadosParaVendedor() {
    try {
        const { data: empleados, error } = await window.supabaseClient
            .from('empleados')
            .select('id, nombre_completo, correo, puesto')
            .eq('activo', true)
            .order('nombre_completo');
        
        if (error) throw error;
        
        const select = document.getElementById('vendedor_empleado_id');
        if (select) {
            select.innerHTML = '<option value="">Ninguno</option>';
            empleados?.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.nombre_completo} ${emp.puesto ? `(${emp.puesto})` : ''}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando empleados:', error);
    }
}

window.guardarVendedor = async function(e) {
    e.preventDefault();
    mostrarLoading('Guardando vendedor...');
    
    try {
        const vendedorId = document.getElementById('vendedor_id').value;
        
        const data = {
            nombre: document.getElementById('vendedor_nombre').value,
            email: document.getElementById('vendedor_email').value || null,
            telefono: document.getElementById('vendedor_telefono').value || null,
            empleado_id: document.getElementById('vendedor_empleado_id').value || null,
            max_leads_diarios: parseInt(document.getElementById('vendedor_max_leads').value) || 10,
            orden: parseInt(document.getElementById('vendedor_orden').value) || 0,
            activo: document.getElementById('vendedor_activo').value === 'true'
        };
        
        if (!data.nombre) {
            ocultarLoading();
            mostrarAlerta('Error', 'El nombre es obligatorio', 'error');
            return;
        }
        
        if (vendedorId) {
            await window.supabaseClient
                .from('vendedores')
                .update(data)
                .eq('id', vendedorId);
            mostrarAlerta('Éxito', 'Vendedor actualizado', 'success');
        } else {
            await window.supabaseClient
                .from('vendedores')
                .insert(data);
            mostrarAlerta('Éxito', 'Vendedor creado', 'success');
        }
        
        cerrarModal('vendedorModal');
        await cargarVistaVendedores();
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar el vendedor', 'error');
    }
};

window.editarVendedor = async function(id) {
    mostrarLoading('Cargando vendedor...');
    
    try {
        const { data: vendedor, error } = await window.supabaseClient
            .from('vendedores')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        vendedorEditandoId = id;
        
        await cargarEmpleadosParaVendedor();
        
        document.getElementById('vendedor_id').value = vendedor.id;
        document.getElementById('vendedor_nombre').value = vendedor.nombre || '';
        document.getElementById('vendedor_email').value = vendedor.email || '';
        document.getElementById('vendedor_telefono').value = vendedor.telefono || '';
        document.getElementById('vendedor_empleado_id').value = vendedor.empleado_id || '';
        document.getElementById('vendedor_max_leads').value = vendedor.max_leads_diarios || 10;
        document.getElementById('vendedor_orden').value = vendedor.orden || 0;
        document.getElementById('vendedor_activo').value = vendedor.activo ? 'true' : 'false';
        document.getElementById('vendedorModalTitle').innerText = 'Editar Vendedor';
        
        ocultarLoading();
        await window.abrirModal('vendedorModal');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo cargar el vendedor', 'error');
    }
};

window.toggleEstadoVendedor = async function(id, activoActual) {
    const nuevoEstado = !activoActual;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const result = await Swal.fire({
        title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} vendedor?`,
        text: `El vendedor ${accion === 'desactivar' ? 'no recibirá' : 'volverá a recibir'} nuevos leads.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado ? '#28a745' : '#ffc107',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Actualizando...');
        
        try {
            await window.supabaseClient
                .from('vendedores')
                .update({ activo: nuevoEstado })
                .eq('id', id);
            
            ocultarLoading();
            mostrarAlerta('Éxito', `Vendedor ${accion}do`, 'success');
            await cargarVistaVendedores();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo actualizar', 'error');
        }
    }
};

window.reiniciarContadorVendedor = async function(id) {
    const result = await Swal.fire({
        title: '¿Reiniciar contador?',
        text: 'Esto pondrá a 0 los leads asignados hoy a este vendedor.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Sí, reiniciar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Reiniciando...');
        
        try {
            await window.supabaseClient
                .from('vendedores')
                .update({ leads_asignados_hoy: 0 })
                .eq('id', id);
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Contador reiniciado', 'success');
            await cargarVistaVendedores();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo reiniciar', 'error');
        }
    }
};

window.reiniciarContadoresTodosVendedores = async function() {
    const result = await Swal.fire({
        title: '¿Reiniciar todos los contadores?',
        text: 'Esto pondrá a 0 los leads asignados hoy a TODOS los vendedores.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Sí, reiniciar todos',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Reiniciando contadores...');
        
        try {
            await window.supabaseClient.rpc('resetear_contadores_leads_vendedores');
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Todos los contadores han sido reiniciados', 'success');
            await cargarVistaVendedores();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudieron reiniciar los contadores', 'error');
        }
    }
};

window.eliminarVendedor = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar vendedor?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        mostrarLoading('Eliminando...');
        
        try {
            await window.supabaseClient
                .from('vendedores')
                .delete()
                .eq('id', id);
            
            ocultarLoading();
            mostrarAlerta('Éxito', 'Vendedor eliminado', 'success');
            await cargarVistaVendedores();
            
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            mostrarAlerta('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.guardarConfiguracionAsignacion = async function() {
    mostrarLoading('Guardando configuración...');
    
    try {
        const configs = [
            { clave: 'tipo_distribucion', valor: document.getElementById('config_tipo_distribucion').value },
            { clave: 'habilitar_asignacion_automatica', valor: document.getElementById('config_habilitar_asignacion').value },
            { clave: 'notificar_vendedor', valor: document.getElementById('config_notificar_vendedor').value }
        ];
        
        for (const config of configs) {
            await window.supabaseClient
                .from('configuracion_asignacion_leads')
                .upsert({ clave: config.clave, valor: config.valor, modificado_el: new Date().toISOString() });
        }
        
        ocultarLoading();
        mostrarAlerta('Éxito', 'Configuración guardada', 'success');
        
    } catch (error) {
        ocultarLoading();
        console.error('Error:', error);
        mostrarAlerta('Error', 'No se pudo guardar la configuración', 'error');
    }
};

// Exponer funciones
window.cargarVistaVendedores = cargarVistaVendedores;