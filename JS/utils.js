// ==================== UTILIDADES ====================
function mostrarLoading(mensaje = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.getElementById('loadingMessage').innerText = mensaje;
    }
}

function ocultarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function mostrarAlerta(titulo, mensaje, tipo = 'success') {
    Swal.fire({
        title: titulo,
        text: mensaje,
        icon: tipo,
        confirmButtonColor: '#39080a',
        timer: 3000,
        timerProgressBar: true
    });
}

function mostrarError(mensaje) {
    const content = document.getElementById('dynamicContent');
    if (content) {
        content.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm p-8 text-center">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                <p class="text-red-500">${mensaje}</p>
            </div>
        `;
    }
}

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad + ' años';
}

async function obtenerInfoUsuarioConEmpleado(usuarioId) {
    if (!usuarioId) return { nombre: 'Sistema', correo: null, nombreCompleto: 'Sistema', id: null };

    try {
        const { data: usuario } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id')
            .eq('id', usuarioId)
            .single();

        if (!usuario) return { nombre: 'Sistema', correo: null, nombreCompleto: 'Sistema', id: usuarioId };

        if (usuario.empleado_id) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('nombre_completo')
                .eq('id', usuario.empleado_id)
                .single();

            if (empleado && empleado.nombre_completo) {
                return {
                    nombre: empleado.nombre_completo,
                    nombreCompleto: empleado.nombre_completo,
                    correo: usuario.correo,
                    usuarioId: usuario.id,
                    empleadoId: usuario.empleado_id
                };
            }
        }

        return {
            nombre: usuario.correo,
            nombreCompleto: usuario.correo,
            correo: usuario.correo,
            usuarioId: usuario.id,
            empleadoId: null
        };

    } catch (error) {
        console.error('Error obteniendo información de usuario:', error);
        return { nombre: 'Sistema', correo: null, nombreCompleto: 'Sistema', id: usuarioId };
    }
}

// ==================== FUNCIONES DE MANEJO DE CONTRASEÑAS ====================
function encriptarPassword(password) {
    if (!password || password.trim() === '') {
        return '';  // Retornar cadena vacía en lugar de null
    }
    try {
        return btoa(unescape(encodeURIComponent(password)));
    } catch (error) {
        console.error('Error encriptando contraseña:', error);
        return password;
    }
}

function desencriptarPassword(encrypted) {
    if (!encrypted) return '';
    try {
        return decodeURIComponent(escape(atob(encrypted)));
    } catch (error) {
        console.error('Error desencriptando contraseña:', error);
        return encrypted;
    }
}

async function hashPassword(password) { return btoa(password); }
async function verifyPassword(password, hash) { return btoa(password) === hash; }

// ==================== FUNCIONES DE GESTIÓN DE INACTIVIDAD ====================
function reiniciarTimerInactividad() {
    if (typeof timeoutInactividad !== 'undefined' && timeoutInactividad) {
        clearTimeout(timeoutInactividad);
    }
    if (usuarioActual && !window.esLandingPage) {
        timeoutInactividad = setTimeout(() => {
            Swal.fire({ title: 'Sesión expirada', text: 'Cerrada por inactividad', icon: 'info', confirmButtonColor: '#39080a' }).then(() => logout());
        }, TIEMPO_INACTIVIDAD);
    }
}

// Inicializar detectores de actividad
if (!window.esLandingPage) {
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(ev => {
        document.addEventListener(ev, reiniciarTimerInactividad);
    });
}

// ==================== FUNCIONES DE MANEJO DE CONTRASEÑAS UI ====================
window.togglePassword = function(button) {
    const container = button.closest('.password-container') || button.parentElement?.closest('.password-container');
    if (!container) return;

    const span = container.querySelector('.password-mask');
    if (!span) return;

    const icon = button.querySelector('i');
    const encryptedPassword = span.dataset.password;

    if (span.classList.contains('showing')) {
        span.textContent = '••••••••';
        span.classList.remove('showing');
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    } else {
        try {
            const decryptedPassword = desencriptarPassword(encryptedPassword);
            span.textContent = decryptedPassword || '••••••••';
            span.classList.add('showing');
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        } catch (error) {
            console.error('Error al desencriptar contraseña:', error);
            span.textContent = 'Error al mostrar';
            mostrarAlerta('Error', 'No se pudo mostrar la contraseña', 'error');
        }
    }
};

window.copiarPassword = async function(encryptedPassword) {
    if (!encryptedPassword) {
        mostrarAlerta('Aviso', 'No hay contraseña para copiar', 'info');
        return;
    }

    try {
        const decryptedPassword = desencriptarPassword(encryptedPassword);
        await navigator.clipboard.writeText(decryptedPassword);
        mostrarAlerta('Éxito', 'Contraseña copiada al portapapeles', 'success');

        const tooltip = document.createElement('div');
        tooltip.textContent = '✓ Copiado';
        tooltip.style.position = 'fixed';
        tooltip.style.bottom = '20px';
        tooltip.style.right = '20px';
        tooltip.style.backgroundColor = '#10b981';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 16px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.fontSize = '14px';
        tooltip.style.zIndex = '9999';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(tooltip);
        setTimeout(() => { tooltip.style.opacity = '1'; }, 10);
        setTimeout(() => { tooltip.remove(); }, 2000);

    } catch (err) {
        console.error('Error al copiar contraseña:', err);
        mostrarAlerta('Error', 'No se pudo copiar la contraseña', 'error');
    }
};

window.togglePasswordField = function(fieldId, button) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const icon = button.querySelector('i');
    if (field.type === 'password') {
        field.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        field.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    field.focus();
};

window.generarContrasena = function(targetFieldId = 'credencial_contrasena') {
    const caracteres = {
        mayusculas: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
        minusculas: 'abcdefghijkmnopqrstuvwxyz',
        numeros: '23456789',
        especiales: '!@#$%^&*'
    };

    let password = '';
    password += caracteres.mayusculas.charAt(Math.floor(Math.random() * caracteres.mayusculas.length));
    password += caracteres.minusculas.charAt(Math.floor(Math.random() * caracteres.minusculas.length));
    password += caracteres.numeros.charAt(Math.floor(Math.random() * caracteres.numeros.length));
    password += caracteres.especiales.charAt(Math.floor(Math.random() * caracteres.especiales.length));

    const todosCaracteres = caracteres.mayusculas + caracteres.minusculas + caracteres.numeros + caracteres.especiales;
    for (let i = password.length; i < 12; i++) {
        password += todosCaracteres.charAt(Math.floor(Math.random() * todosCaracteres.length));
    }

    password = password.split('').sort(() => Math.random() - 0.5).join('');

    const targetField = document.getElementById(targetFieldId);
    if (targetField) {
        targetField.value = password;
        const event = new Event('change', { bubbles: true });
        targetField.dispatchEvent(event);
        mostrarAlerta('Contraseña generada', 'Se ha generado una contraseña segura de 12 caracteres', 'success');
    }
    return password;
};

window.validarFortalezaContrasena = function(password) {
    if (!password) return { score: 0, message: 'Ingrese una contraseña', level: 'danger' };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const palabrasComunes = ['password', '123456', 'admin', 'qwerty', 'letmein'];
    if (!palabrasComunes.some(palabra => password.toLowerCase().includes(palabra))) score += 1;

    let level, message;
    if (score <= 2) {
        level = 'danger';
        message = 'Débil - Utilice más de 8 caracteres, incluyendo mayúsculas, números y símbolos';
    } else if (score <= 4) {
        level = 'warning';
        message = 'Media - Buena, pero puede mejorar agregando más variedad';
    } else {
        level = 'success';
        message = 'Fuerte - Excelente contraseña';
    }

    return { score, level, message };
};

window.aplicarMascaraPassword = function() {
    document.querySelectorAll('.password-mask').forEach(element => {
        if (element.dataset.password && !element.classList.contains('processed')) {
            element.textContent = '••••••••';
            element.classList.add('processed');
        }
    });
};

// ==================== FUNCIONES DE AUDITORÍA ====================
async function registrarCambioEstado(activoId, estadoNuevo, opciones = {}) {
    try {
        if (!usuarioActual || !usuarioActual.id) return false;

        const estadoAnterior = opciones.estadoAnterior || null;

        const historialData = {
            activo_id: activoId,
            estado_anterior: estadoAnterior,
            estado_nuevo: estadoNuevo,
            fecha_cambio: new Date().toISOString(),
            motivo: opciones.motivo || null,
            cambiado_por: usuarioActual.id,
            asignacion_id: opciones.asignacionId || null,
            mantenimiento_id: opciones.mantenimientoId || null
        };

        const { error } = await window.supabaseClient
            .from('historial_estados_activos')
            .insert(historialData);

        if (error) {
            console.error('Error registrando historial:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error en registrarCambioEstado:', error);
        return false;
    }
}

async function registrarCambioUbicacion(activoId, ubicacionNuevaId, opciones = {}) {
    try {
        if (!usuarioActual || !usuarioActual.id) return false;
        if (!ubicacionNuevaId) return true;

        let ubicacionAnteriorId = opciones.ubicacionAnteriorId || null;

        if (ubicacionAnteriorId === undefined) {
            const { data: activo } = await window.supabaseClient
                .from('activos')
                .select('ubicacion_id')
                .eq('id', activoId)
                .single();
            ubicacionAnteriorId = activo?.ubicacion_id || null;
        }

        if (ubicacionAnteriorId === ubicacionNuevaId) return true;

        const historialData = {
            activo_id: activoId,
            ubicacion_anterior_id: ubicacionAnteriorId,
            ubicacion_nueva_id: ubicacionNuevaId,
            fecha_cambio: new Date().toISOString(),
            motivo: opciones.motivo || null,
            cambiado_por: usuarioActual.id
        };

        const { error } = await window.supabaseClient
            .from('historial_ubicaciones_activos')
            .insert(historialData);

        if (error) {
            console.error('Error registrando historial de ubicación:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error en registrarCambioUbicacion:', error);
        return false;
    }
}

// ==================== FUNCIONES PARA CARGAR SELECTS ====================

async function cargarUsuariosSelect(selectId, incluirVacio = true, mostrarNombresEmpleados = true) {
    // Validar que el selectId no sea undefined
    if (!selectId) {
        console.error('❌ cargarUsuariosSelect: selectId es undefined o null');
        return;
    }
    
    try {
        console.log(`📋 Cargando usuarios en select: ${selectId}`);
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`❌ Select ${selectId} no encontrado`);
            return;
        }
        
        // Obtener usuarios activos
        const { data: usuarios, error } = await window.supabaseClient
            .from('usuarios')
            .select('id, correo, empleado_id, activo')
            .eq('activo', true)
            .order('correo', { ascending: true });
        
        if (error) throw error;
        
        // Obtener empleados asociados para mostrar nombres
        let empleadosMap = new Map();
        if (mostrarNombresEmpleados && usuarios?.length) {
            const empleadosIds = usuarios.map(u => u.empleado_id).filter(id => id);
            
            if (empleadosIds.length > 0) {
                const { data: empleados, error: errorEmpleados } = await window.supabaseClient
                    .from('empleados')
                    .select('id, nombre_completo, correo, puesto')
                    .in('id', empleadosIds);
                
                if (!errorEmpleados && empleados) {
                    empleados.forEach(e => empleadosMap.set(e.id, e));
                }
            }
        }
        
        // Limpiar y cargar opciones
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar usuario</option>' : '';
        
        if (!usuarios || usuarios.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay usuarios activos registrados</option>';
            console.log('⚠️ No hay usuarios activos disponibles');
            return;
        }
        
        usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            
            const empleado = empleadosMap.get(usuario.empleado_id);
            
            // Construir texto con información relevante
            let texto = '';
            if (empleado && mostrarNombresEmpleados) {
                texto = `${empleado.nombre_completo}`;
                if (empleado.puesto) {
                    texto += ` (${empleado.puesto})`;
                }
                texto += ` - ${usuario.correo}`;
            } else {
                texto = usuario.correo;
            }
            
            option.textContent = texto;
            
            // Guardar datos adicionales como atributos data
            option.dataset.correo = usuario.correo;
            option.dataset.empleadoId = usuario.empleado_id || '';
            if (empleado) {
                option.dataset.empleadoNombre = empleado.nombre_completo || '';
                option.dataset.empleadoPuesto = empleado.puesto || '';
                option.dataset.empleadoCorreo = empleado.correo || '';
            }
            
            select.appendChild(option);
        });
        
        console.log(`✅ ${usuarios.length} usuarios cargados en ${selectId}`);
        
        // Disparar evento personalizado
        const event = new CustomEvent('usuariosCargados', { detail: { count: usuarios.length } });
        select.dispatchEvent(event);
        
    } catch (error) {
        console.error(`❌ Error cargando usuarios en ${selectId}:`, error);
        
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar usuarios</option>';
        }
        
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta('Error', 'No se pudieron cargar los usuarios', 'error');
        }
    }
}

// Asegurar que la función esté disponible globalmente
window.cargarUsuariosSelect = cargarUsuariosSelect;

async function cargarActivosSelect(selectId, incluirVacio = true) {
    if (!selectId) {
        console.error('❌ cargarActivosSelect: selectId es undefined o null');
        return;
    }
    
    try {
        console.log(`📋 Cargando activos en select: ${selectId}`);
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`❌ Select ${selectId} no encontrado`);
            return;
        }
        
        let query = window.supabaseClient
            .from('activos')
            .select('id, nombre, codigo_activo, estado, tipo_activo_id, tipos_activo (nombre)')
            .order('nombre', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar activo</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay activos registrados</option>';
            select.disabled = true;
            return;
        }
        
        select.disabled = false;
        
        // Agrupar activos por tipo
        const activosPorTipo = new Map();
        data.forEach(activo => {
            const tipoNombre = activo.tipos_activo?.nombre || 'Sin tipo';
            if (!activosPorTipo.has(tipoNombre)) {
                activosPorTipo.set(tipoNombre, []);
            }
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
                    if (activo.codigo_activo) {
                        texto += ` (${activo.codigo_activo})`;
                    }
                    if (activo.estado !== 'DISPONIBLE') {
                        texto += ` [${activo.estado}]`;
                    }
                    option.textContent = texto;
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
        
        console.log(`✅ ${data.length} activos cargados en ${selectId}`);
        
    } catch (error) {
        console.error(`❌ Error cargando activos en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar activos</option>';
            select.disabled = false;
        }
    }
}

window.cargarActivosSelect = cargarActivosSelect;

async function cargarSoftwareSelect(selectId, incluirVacio = true) {
    if (!selectId) {
        console.error('❌ cargarSoftwareSelect: selectId es undefined o null');
        return;
    }
    
    try {
        console.log(`📋 Cargando software en select: ${selectId}`);
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`❌ Select ${selectId} no encontrado`);
            return;
        }
        
        const { data, error } = await window.supabaseClient
            .from('software')
            .select('id, nombre, fabricante')
            .eq('activo', true)
            .order('nombre', { ascending: true });
        
        if (error) throw error;
        
        // Limpiar y cargar opciones
        select.innerHTML = incluirVacio ? '<option value="">Seleccionar software</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay software registrado</option>';
            console.log('⚠️ No hay software registrado');
            return;
        }
        
        // Agrupar software por fabricante para mejor organización
        const softwarePorFabricante = new Map();
        data.forEach(sw => {
            const fabricante = sw.fabricante || 'Sin fabricante';
            if (!softwarePorFabricante.has(fabricante)) {
                softwarePorFabricante.set(fabricante, []);
            }
            softwarePorFabricante.get(fabricante).push(sw);
        });
        
        // Ordenar fabricantes alfabéticamente
        const fabricantesOrdenados = Array.from(softwarePorFabricante.keys()).sort();
        
        // Crear optgroups por fabricante
        fabricantesOrdenados.forEach(fabricante => {
            const softwareList = softwarePorFabricante.get(fabricante);
            if (softwareList && softwareList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `🏢 ${fabricante} (${softwareList.length})`;
                
                softwareList.forEach(sw => {
                    const option = document.createElement('option');
                    option.value = sw.id;
                    let texto = sw.nombre;
                    option.textContent = texto;
                    
                    // Guardar datos adicionales
                    option.dataset.fabricante = sw.fabricante || '';
                    
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
        
        console.log(`✅ ${data.length} software cargados en ${selectId}`);
        
        // Disparar evento personalizado
        const event = new CustomEvent('softwareCargados', { detail: { count: data.length } });
        select.dispatchEvent(event);
        
    } catch (error) {
        console.error(`❌ Error cargando software en ${selectId}:`, error);
        
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar software</option>';
        }
        
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta('Error', 'No se pudieron cargar los software', 'error');
        }
    }
}

window.cargarSoftwareSelect = cargarSoftwareSelect;

async function cargarLicenciasSelect(selectId, incluirVacio = true) {
    if (!selectId) {
        console.error('❌ cargarLicenciasSelect: selectId es undefined o null');
        return;
    }
    
    try {
        console.log(`📋 Cargando licencias en select: ${selectId}`);
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`❌ Select ${selectId} no encontrado`);
            return;
        }
        
        const { data, error } = await window.supabaseClient
            .from('licencias')
            .select(`
                id, 
                codigo_licencia, 
                clave_producto, 
                tipo_licencia,
                software:software_id (id, nombre, fabricante)
            `)
            .eq('activo', true)
            .order('codigo_licencia', { ascending: true });
        
        if (error) throw error;
        
        // Limpiar y cargar opciones
        select.innerHTML = incluirVacio ? '<option value="">Sin licencia</option>' : '';
        
        if (!data || data.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay licencias registradas</option>';
            console.log('⚠️ No hay licencias registradas');
            return;
        }
        
        // Agrupar licencias por software
        const licenciasPorSoftware = new Map();
        data.forEach(lic => {
            const softwareNombre = lic.software?.nombre || 'Software desconocido';
            if (!licenciasPorSoftware.has(softwareNombre)) {
                licenciasPorSoftware.set(softwareNombre, []);
            }
            licenciasPorSoftware.get(softwareNombre).push(lic);
        });
        
        // Ordenar software alfabéticamente
        const softwareOrdenados = Array.from(licenciasPorSoftware.keys()).sort();
        
        // Crear optgroups por software
        softwareOrdenados.forEach(softwareNombre => {
            const licenciasList = licenciasPorSoftware.get(softwareNombre);
            if (licenciasList && licenciasList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `📦 ${softwareNombre} (${licenciasList.length})`;
                
                licenciasList.forEach(lic => {
                    const option = document.createElement('option');
                    option.value = lic.id;
                    
                    let texto = lic.codigo_licencia || 'Sin código';
                    if (lic.clave_producto) {
                        texto += ` - ${lic.clave_producto.substring(0, 15)}${lic.clave_producto.length > 15 ? '...' : ''}`;
                    }
                    if (lic.tipo_licencia) {
                        texto += ` (${lic.tipo_licencia})`;
                    }
                    option.textContent = texto;
                    
                    // Guardar datos adicionales
                    option.dataset.codigo = lic.codigo_licencia || '';
                    option.dataset.clave = lic.clave_producto || '';
                    option.dataset.tipo = lic.tipo_licencia || '';
                    
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
        
        console.log(`✅ ${data.length} licencias cargadas en ${selectId}`);
        
        // Disparar evento personalizado
        const event = new CustomEvent('licenciasCargadas', { detail: { count: data.length } });
        select.dispatchEvent(event);
        
    } catch (error) {
        console.error(`❌ Error cargando licencias en ${selectId}:`, error);
        
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar licencias</option>';
        }
    }
}

window.cargarLicenciasSelect = cargarLicenciasSelect;

// ==================== FUNCIÓN PARA OBTENER ÍCONO SEGÚN TIPO DE UBICACIÓN ====================
function getTipoIcono(tipo) {
    const iconos = {
        'PLANTA': '🏭',
        'EDIFICIO': '🏢',
        'PISO': '📌',
        'OFICINA': '🏢',
        'SEDE': '🏛️'
    };
    return iconos[tipo] || '📍';
}

// Asegurar que esté disponible globalmente
window.getTipoIcono = getTipoIcono;

// ==================== BÚSQUEDA GLOBAL CON DEBOUNCE ====================
let timeoutBusquedaGlobal = null;

window.buscarGlobal = function(e) {
    // Limpiar timeout anterior
    if (timeoutBusquedaGlobal) {
        clearTimeout(timeoutBusquedaGlobal);
    }
    
    // Ejecutar búsqueda después de 300ms de inactividad
    timeoutBusquedaGlobal = setTimeout(() => {
        const termino = e.target.value.toLowerCase().trim();
        console.log('🔍 Buscando global:', termino);
        
        if (!termino) {
            // Si el término está vacío, mostrar todas las tarjetas
            document.querySelectorAll('.card-item, .user-card, .ubicacion-card, .tipo-activo-card, .subcategoria-card, .atributo-card').forEach(card => {
                card.style.display = 'block';
            });
            
            // Eliminar mensaje de vacío si existe
            const mensajeVacio = document.getElementById('busqueda-global-vacio');
            if (mensajeVacio) mensajeVacio.remove();
            return;
        }
        
        // Buscar en diferentes tipos de tarjetas según la vista actual
        const tarjetas = document.querySelectorAll('.card-item, .user-card, .ubicacion-card, .tipo-activo-card, .subcategoria-card, .atributo-card');
        let contador = 0;
        
        tarjetas.forEach(card => {
            const texto = card.innerText.toLowerCase();
            if (texto.includes(termino)) {
                card.style.display = 'block';
                contador++;
            } else {
                card.style.display = 'none';
            }
        });
        
        console.log(`✅ Búsqueda completada: ${contador} resultados encontrados`);
        
        // Mostrar mensaje si no hay resultados
        const grid = document.querySelector('.cards-grid');
        if (grid && contador === 0) {
            let mensajeVacio = document.getElementById('busqueda-global-vacio');
            if (!mensajeVacio) {
                mensajeVacio = document.createElement('div');
                mensajeVacio.id = 'busqueda-global-vacio';
                mensajeVacio.className = 'col-span-full text-center py-12 bg-white rounded-lg mt-4';
                mensajeVacio.innerHTML = `
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-search text-3xl text-gray-400"></i>
                        </div>
                        <p class="text-gray-500 text-lg">No se encontraron resultados para "${termino}"</p>
                        <p class="text-gray-400 text-sm mt-2">Intenta con otros términos de búsqueda</p>
                    </div>
                `;
                grid.appendChild(mensajeVacio);
            }
        } else {
            const mensajeVacio = document.getElementById('busqueda-global-vacio');
            if (mensajeVacio) mensajeVacio.remove();
        }
    }, 300);
};

// ==================== OBTENER NOMBRE DE EMPLEADO POR ID DE USUARIO ====================
async function obtenerNombreEmpleadoPorUsuario(usuarioId) {
    if (!usuarioId) return null;
    
    try {
        const { data: usuario } = await window.supabaseClient
            .from('usuarios')
            .select('empleado_id')
            .eq('id', usuarioId)
            .single();
        
        if (usuario && usuario.empleado_id) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('nombre_completo')
                .eq('id', usuario.empleado_id)
                .single();
            
            return empleado?.nombre_completo || null;
        }
        
        return null;
    } catch (error) {
        console.error('Error obteniendo nombre del empleado:', error);
        return null;
    }
}

window.obtenerNombreEmpleadoPorUsuario = obtenerNombreEmpleadoPorUsuario;

// ==================== LIMPIAR BÚSQUEDA GLOBAL ====================
window.limpiarBusquedaGlobal = function() {
    const inputBusqueda = document.getElementById('globalSearch');
    if (inputBusqueda) {
        inputBusqueda.value = '';
        // Disparar el evento de búsqueda para resetear
        const event = new Event('keyup');
        inputBusqueda.dispatchEvent(event);
    }
    
    // Mostrar todas las tarjetas
    document.querySelectorAll('.card-item, .user-card, .ubicacion-card, .tipo-activo-card, .subcategoria-card, .atributo-card').forEach(card => {
        card.style.display = 'block';
    });
    
    // Eliminar mensaje de vacío
    const mensajeVacio = document.getElementById('busqueda-global-vacio');
    if (mensajeVacio) mensajeVacio.remove();
    
    mostrarAlerta('Éxito', 'Búsqueda limpiada', 'success');
};

// ==================== CARGAR EMPRESAS EN SELECT (VERSIÓN ÚNICA) ====================
async function cargarEmpresasSelect(selectId, incluirVacio = true, soloActivas = true) {
    try {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select ${selectId} no encontrado`);
            return;
        }

        console.log(`🔄 Cargando empresas en ${selectId}...`);

        let query = window.supabaseClient
            .from('empresas')
            .select('id, nombre, ruc')
            .order('nombre');

        if (soloActivas) {
            query = query.eq('activo', true);
        }

        const { data: empresas, error } = await query;

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar empresa</option>' : '';

        if (!empresas || empresas.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay empresas registradas</option>';
            select.disabled = true;
            return;
        }

        empresas.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            let texto = emp.nombre;
            if (emp.ruc) texto += ` (${emp.ruc})`;
            option.textContent = texto;
            select.appendChild(option);
        });

        select.disabled = false;
        console.log(`✅ ${empresas.length} empresas cargadas en ${selectId}`);

    } catch (error) {
        console.error(`❌ Error cargando empresas en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar empresas</option>';
            select.disabled = true;
        }
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta('Error', 'No se pudieron cargar las empresas', 'error');
        }
    }
}

// Asegurar que esté disponible globalmente
window.cargarEmpresasSelect = cargarEmpresasSelect;

// ==================== CARGAR UBICACIONES POR EMPRESA (VERSIÓN ÚNICA) ====================
async function cargarUbicacionesPorEmpresa(empresaId, selectId, incluirVacio = true, soloActivas = true) {
    try {
        console.log(`📍 Cargando ubicaciones para empresa ${empresaId} en select ${selectId}`);
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select ${selectId} no encontrado`);
            return;
        }

        if (!empresaId) {
            select.innerHTML = incluirVacio ? '<option value="">Primero seleccione una empresa</option>' : '';
            select.disabled = true;
            return;
        }

        select.innerHTML = '<option value="">Cargando ubicaciones...</option>';
        select.disabled = true;

        let query = window.supabaseClient
            .from('ubicaciones')
            .select('id, nombre, descripcion, tipo')
            .eq('empresa_id', empresaId);

        if (soloActivas) {
            query = query.eq('activo', true);
        }

        const { data, error } = await query.order('tipo', { ascending: true }).order('nombre', { ascending: true });

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar ubicación</option>' : '';

        if (!data || data.length === 0) {
            select.innerHTML = '<option value="">No hay ubicaciones para esta empresa</option>';
            select.disabled = true;
            return;
        }

        // Iconos por tipo
        const tipoIconos = {
            'SEDE': '🏛️', 'FUNDO': '🌾', 'PLANTA': '🏭', 'EDIFICIO': '🏢',
            'PISO': '📌', 'OFICINA': '🏢', 'GARITA': '🚪', 'CANTERA': '⛏️',
            'CAMPO': '🌾', 'ALMACEN': '📦', 'OTRO': '📍'
        };

        data.forEach(ubi => {
            const option = document.createElement('option');
            option.value = ubi.id;
            const icono = tipoIconos[ubi.tipo] || '📍';
            let texto = `${icono} ${ubi.nombre}`;
            if (ubi.tipo) texto += ` (${ubi.tipo})`;
            if (ubi.descripcion) texto += ` - ${ubi.descripcion}`;
            option.textContent = texto;
            select.appendChild(option);
        });

        select.disabled = false;
        console.log(`✅ ${data.length} ubicaciones cargadas en ${selectId}`);

    } catch (error) {
        console.error(`❌ Error cargando ubicaciones en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
            select.disabled = false;
        }
    }
}

// Exportar globalmente
window.cargarUbicacionesPorEmpresa = cargarUbicacionesPorEmpresa;

// ==================== CARGAR MARCAS (VERSIÓN ÚNICA GLOBAL) ====================
async function cargarMarcasSelect(selectId = 'activo_marca_id', incluirVacio = true) {
    try {
        console.log(`🔄 Cargando marcas en select: ${selectId}`);
        
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select ${selectId} no encontrado`);
            return;
        }

        const { data: marcas, error } = await window.supabaseClient
            .from('marcas')
            .select('id, nombre, descripcion')
            .eq('activo', true)
            .order('nombre');

        if (error) throw error;

        select.innerHTML = incluirVacio ? '<option value="">Seleccionar marca</option>' : '';

        if (!marcas || marcas.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay marcas registradas</option>';
            select.disabled = true;
            return;
        }

        marcas.forEach(marca => {
            const option = document.createElement('option');
            option.value = marca.id;
            option.textContent = marca.nombre;
            if (marca.descripcion) option.title = marca.descripcion;
            select.appendChild(option);
        });

        select.disabled = false;
        console.log(`✅ ${marcas.length} marcas cargadas en ${selectId}`);

    } catch (error) {
        console.error(`❌ Error cargando marcas en ${selectId}:`, error);
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Error al cargar marcas</option>';
            select.disabled = true;
        }
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta('Error', 'No se pudieron cargar las marcas', 'error');
        }
    }
}

// ==================== CONVERSIÓN DE ENLACES DE GOOGLE DRIVE ====================

/**
 * Convierte un enlace de Google Drive a URL de imagen directa
 * @param {string} url - Enlace original de Google Drive
 * @returns {string} - URL para incrustar la imagen
 */
function convertirGoogleDriveImagen(url) {
    if (!url) return url;
    
    // Si ya es una URL de imagen directa de Google Drive
    if (url.includes('googleusercontent.com')) return url;
    if (url.includes('uc?export=view')) return url;
    
    // Extraer FILE_ID del enlace
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,      // /file/d/FILE_ID/
        /id=([a-zA-Z0-9_-]+)/,               // ?id=FILE_ID
        /\/d\/([a-zA-Z0-9_-]+)/              // /d/FILE_ID/
    ];
    
    let fileId = null;
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            fileId = match[1];
            break;
        }
    }
    
    if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    return url;
}

/**
 * Convierte un enlace de Google Drive a URL de vista previa (para PDFs)
 * @param {string} url - Enlace original de Google Drive
 * @returns {string} - URL para vista previa del PDF
 */
function convertirGoogleDrivePreview(url) {
    if (!url) return url;
    
    // Si ya es una URL de preview
    if (url.includes('/preview')) return url;
    
    // Extraer FILE_ID
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    let fileId = null;
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            fileId = match[1];
            break;
        }
    }
    
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    return url;
}

/**
 * Detecta si una URL es de Google Drive
 * @param {string} url - URL a verificar
 * @returns {boolean}
 */
function esGoogleDriveUrl(url) {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('googleusercontent.com');
}

/**
 * Obtiene la URL optimizada para mostrar según el tipo de contenido
 * @param {string} url - URL original
 * @param {string} tipo - 'imagen' o 'pdf'
 * @returns {string}
 */
// ==================== OPTIMIZAR URL DE GOOGLE DRIVE ====================
function optimizarUrlGoogleDrive(url, tipo = 'imagen') {
    if (!url || typeof url !== 'string') return url;
    
    // Si ya es una URL optimizada
    if (url.includes('lh3.googleusercontent.com')) return url;
    
    // Extraer ID de Google Drive
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        if (tipo === 'imagen') {
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        } else if (tipo === 'pdf') {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
    }
    
    return url;
}

// Exponer funciones globalmente
window.convertirGoogleDriveImagen = convertirGoogleDriveImagen;
window.convertirGoogleDrivePreview = convertirGoogleDrivePreview;
window.esGoogleDriveUrl = esGoogleDriveUrl;
window.optimizarUrlGoogleDrive = optimizarUrlGoogleDrive;

// Exportar globalmente
window.cargarMarcasSelect = cargarMarcasSelect;