// ==================== AUTENTICACIÓN ====================
window.iniciarProcesoLogin = async function() {
    const { value: email } = await Swal.fire({
        title: 'Iniciar sesión',
        input: 'email',
        inputPlaceholder: 'correo@ejemplo.com',
        showCancelButton: true,
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
    });
    if (email) await verificarCorreo(email.toLowerCase().trim());
};

// ==================== RECUPERAR CONTRASEÑA POR DOCUMENTO Y FECHA ====================
window.recuperarContrasena = async function(email) {
    // Paso 1: Solicitar correo electrónico
    const { value: correo } = await Swal.fire({
        title: 'Recuperar contraseña',
        html: `
            <div class="text-left">
                <p class="text-sm text-gray-600 mb-3">Ingresa tu correo electrónico para verificar tu identidad.</p>
                <div>
                    <label class="form-label font-medium text-gray-700">Correo electrónico</label>
                    <input type="email" id="swal-correo" class="form-input w-full" placeholder="correo@empresa.com" value="${email || ''}">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const correoValue = document.getElementById('swal-correo')?.value;
            if (!correoValue) {
                Swal.showValidationMessage('Ingrese su correo electrónico');
                return false;
            }
            return correoValue;
        }
    });

    if (!correo) return;

    mostrarLoading('Verificando usuario...');

    try {
        // Paso 2: Buscar usuario por correo y obtener su empleado
        const { data: usuario, error: errorUsuario } = await window.supabaseClient
            .from('usuarios')
            .select(`
                id,
                correo,
                empleado_id,
                empleados:empleado_id (
                    id,
                    nombre_completo,
                    numero_documento,
                    fecha_nacimiento
                )
            `)
            .eq('correo', correo)
            .single();

        if (errorUsuario || !usuario) {
            ocultarLoading();
            mostrarAlerta('Error', 'No se encontró un usuario con este correo electrónico', 'error');
            return;
        }

        // Verificar que el usuario tenga un empleado asociado
        if (!usuario.empleado_id || !usuario.empleados) {
            ocultarLoading();
            mostrarAlerta('Error', 'Este usuario no tiene un empleado asociado. Contacte al administrador.', 'error');
            return;
        }

        const empleado = usuario.empleados;

        // Verificar que el empleado tenga documento y fecha de nacimiento
        if (!empleado.numero_documento || !empleado.fecha_nacimiento) {
            ocultarLoading();
            mostrarAlerta('Error', 'El empleado no tiene registrados su documento o fecha de nacimiento. Contacte al administrador.', 'error');
            return;
        }

        ocultarLoading();

        // Paso 3: Solicitar número de documento y fecha de nacimiento
        const { value: datosVerificacion } = await Swal.fire({
            title: 'Verificación de identidad',
            html: `
                <div class="text-left space-y-4">
                    <p class="text-sm text-gray-600">Para verificar tu identidad, ingresa los siguientes datos del empleado asociado a esta cuenta:</p>
                    <div>
                        <label class="form-label font-medium text-gray-700">Número de documento</label>
                        <input type="text" id="swal-documento" class="form-input w-full" placeholder="Ej: 12345678" autocomplete="off">
                        <p class="text-xs text-gray-400 mt-1">DNI, RUC, Carnet de Extranjería o Pasaporte</p>
                    </div>
                    <div>
                        <label class="form-label font-medium text-gray-700">Fecha de nacimiento</label>
                        <input type="date" id="swal-fecha" class="form-input w-full">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Verificar identidad',
            cancelButtonText: 'Cancelar',
            width: '500px',
            preConfirm: () => {
                const documento = document.getElementById('swal-documento')?.value?.trim();
                const fecha = document.getElementById('swal-fecha')?.value;
                
                if (!documento) {
                    Swal.showValidationMessage('Ingrese su número de documento');
                    return false;
                }
                if (!fecha) {
                    Swal.showValidationMessage('Seleccione su fecha de nacimiento');
                    return false;
                }
                return { documento, fecha };
            }
        });

        if (!datosVerificacion) return;

        mostrarLoading('Verificando datos...');

        // Paso 4: Verificar que los datos coincidan
        const documentoCorrecto = datosVerificacion.documento === empleado.numero_documento;
        const fechaCorrecta = datosVerificacion.fecha === empleado.fecha_nacimiento;

        if (!documentoCorrecto || !fechaCorrecta) {
            ocultarLoading();
            
            // Mostrar mensaje de error genérico (por seguridad, no especificar qué campo falló)
            await Swal.fire({
                title: 'Verificación fallida',
                html: `<div class="text-center">
                    <i class="fas fa-times-circle text-4xl text-red-500 mb-3"></i>
                    <p>Los datos ingresados no coinciden con nuestros registros.</p>
                    <p class="text-sm text-gray-500 mt-2">Por favor, verifique su información o contacte al administrador.</p>
                </div>`,
                icon: 'error',
                confirmButtonColor: '#39080a',
                confirmButtonText: 'Intentar nuevamente'
            });
            return;
        }

        // Paso 5: Resetear la contraseña
        const ahora = new Date().toISOString();
        
        const { error: updateError } = await window.supabaseClient
            .from('usuarios')
            .update({
                contrasena_hash: null,
                primer_acceso: true,
                intentos_fallidos: 0,
                bloqueado_hasta: null,
                modificado_el: ahora,
                modificado_por: usuario.id
            })
            .eq('id', usuario.id);

        if (updateError) throw updateError;

        ocultarLoading();

        // Paso 6: Mostrar mensaje de éxito
        await Swal.fire({
            title: '¡Contraseña reseteada!',
            html: `<div class="text-center">
                <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
                <p>Tu contraseña ha sido reseteada exitosamente.</p>
                <p class="text-sm text-gray-500 mt-2">En tu próximo inicio de sesión deberás crear una nueva contraseña.</p>
            </div>`,
            icon: 'success',
            confirmButtonColor: '#28a745',
            confirmButtonText: 'Ir al inicio de sesión',
            timer: 5000
        });

        // Limpiar cualquier intento de login fallido
        intentosFallidos = 0;

    } catch (error) {
        ocultarLoading();
        console.error('Error en recuperarContrasena:', error);
        
        Swal.fire({
            title: 'Error',
            html: `<div class="text-center">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                <p>Ocurrió un error al procesar tu solicitud.</p>
                <p class="text-sm text-gray-500 mt-2">Por favor, intenta nuevamente o contacta al administrador.</p>
            </div>`,
            icon: 'error',
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Cerrar'
        });
    }
};

async function verificarCorreo(email) {
    mostrarLoading('Verificando...');
    try {
        const { data: usuario, error } = await window.supabaseClient
            .from('usuarios')
            .select('*')
            .eq('correo', email)
            .maybeSingle();

        if (error) throw error;
        if (!usuario) {
            ocultarLoading();
            Swal.fire({ title: 'Usuario no encontrado', text: `El correo ${email} no está registrado.`, icon: 'error', confirmButtonColor: '#39080a' });
            return;
        }
        if (!usuario.activo) {
            ocultarLoading();
            Swal.fire({ title: 'Usuario inactivo', text: 'Contacta al administrador', icon: 'error', confirmButtonColor: '#39080a' });
            return;
        }
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            ocultarLoading();
            Swal.fire({ title: 'Cuenta bloqueada', text: `Intenta después de ${new Date(usuario.bloqueado_hasta).toLocaleTimeString()}`, icon: 'error', confirmButtonColor: '#39080a' });
            return;
        }

        let datosEmpleado = null;
        if (usuario.empleado_id) {
            const { data: empleado } = await window.supabaseClient
                .from('empleados')
                .select('nombre_completo, puesto')
                .eq('id', usuario.empleado_id)
                .maybeSingle();
            if (empleado) datosEmpleado = empleado;
        }
        const usuarioCompleto = { ...usuario, empleados: datosEmpleado };
        ocultarLoading();

        if (usuario.primer_acceso || !usuario.contrasena_hash) {
            await mostrarModalCrearContrasena(usuarioCompleto);
        } else {
            await mostrarModalIngresarContrasena(usuarioCompleto);
        }
    } catch (error) {
        ocultarLoading();
        console.error('Error completo:', error);
        Swal.fire({ title: 'Error', text: error.message || 'No se pudo verificar el usuario', icon: 'error', confirmButtonColor: '#39080a' });
    }
}

async function mostrarModalIngresarContrasena(usuario) {
    let intentos = 0;
    while (intentos < MAX_INTENTOS) {
        const { value: password } = await Swal.fire({
            title: `Bienvenido ${usuario.empleados?.nombre_completo || ''}`,
            html: `<div class="text-left">
                <input type="password" id="swal-password" class="swal2-input" placeholder="Contraseña">
                <div class="text-right mt-2">
                    <a href="#" onclick="event.preventDefault(); window.recuperarContrasena('${usuario.correo}')" 
                    class="text-sm text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                    </a>
                </div>
            </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#39080a',
            confirmButtonText: 'Ingresar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const pass = document.getElementById('swal-password')?.value;
                if (!pass) return 'Ingresa tu contraseña';
                return pass;
            }
        });

        if (!password) return;

        const valida = await verifyPassword(password, usuario.contrasena_hash);
        if (valida) {
            intentosFallidos = 0;
            await window.supabaseClient
                .from('usuarios')
                .update({ ultimo_acceso: new Date().toISOString(), intentos_fallidos: 0, bloqueado_hasta: null })
                .eq('id', usuario.id);
            await iniciarSesion(usuario);
            return;
        } else {
            intentos++;
            intentosFallidos = intentos;
            await window.supabaseClient
                .from('usuarios')
                .update({ intentos_fallidos: intentos })
                .eq('id', usuario.id);

            if (intentos >= MAX_INTENTOS) {
                const bloqueo = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                await window.supabaseClient
                    .from('usuarios')
                    .update({ bloqueado_hasta: bloqueo })
                    .eq('id', usuario.id);
                Swal.fire({ title: 'Cuenta bloqueada', text: 'Demasiados intentos fallidos. Bloqueado por 30 minutos.', icon: 'error', confirmButtonColor: '#39080a' });
                return;
            } else {
                Swal.fire({ title: 'Error', text: `Contraseña incorrecta. Intento ${intentos} de ${MAX_INTENTOS}`, icon: 'error', confirmButtonColor: '#39080a' });
            }
        }
    }
}

async function mostrarModalCrearContrasena(usuario) {
    const { value: password } = await Swal.fire({
        title: 'Primer Acceso',
        html: `<div class="text-left"><p class="mb-4">¡Bienvenido ${usuario.empleados?.nombre_completo || ''}!</p><input type="password" id="swal-pass1" class="swal2-input mb-3" placeholder="Nueva contraseña"><input type="password" id="swal-pass2" class="swal2-input" placeholder="Confirmar contraseña"><p class="text-xs text-gray-400 mt-2">Mínimo 6 caracteres</p></div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Crear',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const p1 = document.getElementById('swal-pass1')?.value;
            const p2 = document.getElementById('swal-pass2')?.value;
            if (!p1 || !p2) return 'Completa todos los campos';
            if (p1.length < 6) return 'Mínimo 6 caracteres';
            if (p1 !== p2) return 'Las contraseñas no coinciden';
            return p1;
        }
    });

    if (password) {
        mostrarLoading('Guardando contraseña...');
        try {
            const hash = await hashPassword(password);
            await window.supabaseClient
                .from('usuarios')
                .update({ contrasena_hash: hash, primer_acceso: false, ultimo_acceso: new Date().toISOString() })
                .eq('id', usuario.id);
            ocultarLoading();
            await iniciarSesion(usuario);
        } catch (error) {
            ocultarLoading();
            console.error('Error:', error);
            Swal.fire({ title: 'Error', text: 'No se pudo guardar la contraseña', icon: 'error', confirmButtonColor: '#39080a' });
        }
    }
}

async function iniciarSesion(usuario) {
    try {
        console.log('✅ Iniciando sesión para usuario:', usuario.id);
        usuarioActual = usuario;
        const permisos = await obtenerPermisosUsuario(usuario.id);
        usuarioActual.permisos = permisos;
        localStorage.setItem('usuario_actual', JSON.stringify({
            id: usuario.id,
            correo: usuario.correo,
            empleado_id: usuario.empleado_id,
            nombre: usuario.empleados?.nombre_completo,
            puesto: usuario.empleados?.puesto,
            rol: permisos.rol,
            empresa_id: permisos.empresaId
        }));

        document.getElementById('userName').textContent = usuario.empleados?.nombre_completo || usuario.correo;
        document.getElementById('userEmail').textContent = usuario.correo;
        document.getElementById('userPuesto').textContent = usuario.empleados?.puesto || 'Usuario';
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');

        const sidebarNav = document.getElementById('sidebarNav');
        if (sidebarNav) {
            let sidebarHtml = '';
            
            // Para empleados, verificar permiso específico
            if (permisos.rol === 'EMPLEADO') {
                let puedeRegistrar = false;
                if (permisos.empleadoId) {
                    const { data: empleado } = await window.supabaseClient
                        .from('empleados')
                        .select('puede_registrar_clientes_outlet')
                        .eq('id', permisos.empleadoId)
                        .single();
                    puedeRegistrar = empleado?.puede_registrar_clientes_outlet || false;
                }
                sidebarHtml = generarSidebarPorRol('EMPLEADO', puedeRegistrar);
            } else {
                sidebarHtml = generarSidebarPorRol(permisos.rol);
            }
            
            sidebarNav.innerHTML = sidebarHtml;
        }

        reiniciarTimerInactividad();

        if (permisos.rol === 'ADMINISTRADOR') await cargarVista('dashboard');
        else if (permisos.rol === 'OPERADOR_EMPRESA') await cargarVista('activos');
        else if (permisos.rol === 'EMPLEADO') await cargarVista('misActivos');

        await cargarDatosIniciales();
        await actualizarCampanaNotificaciones();

        setInterval(async () => {
            if (usuarioActual) {
                await actualizarCampanaNotificaciones();
            }
        }, 30000);        

    } catch (error) {
        console.error('❌ Error en inicio de sesión:', error);
        mostrarAlerta('Error', 'Error al iniciar sesión', 'error');
    }
}

window.logout = async function() {
    const result = await Swal.fire({
        title: '¿Cerrar sesión?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#39080a',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
        localStorage.removeItem('usuario_actual');
        usuarioActual = null;
        if (timeoutInactividad) clearTimeout(timeoutInactividad);
        document.getElementById('loginContainer').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }
};

// ==================== OBTENER PERMISOS DE USUARIO ====================
async function obtenerPermisosUsuario(usuarioId) {
    try {
        console.log('🔍 Obteniendo permisos para usuario:', usuarioId);
        
        // Obtener usuario y su rol
        const { data: usuario, error } = await window.supabaseClient
            .from('usuarios')
            .select(`id, correo, empleado_id, empresa_id, rol:rol_id (id, nombre, nivel)`)
            .eq('id', usuarioId)
            .single();

        if (error) throw error;

        let empresasIds = [];
        let empresaId = usuario.empresa_id || null;
        let empleadoId = usuario.empleado_id || null;
        let empleadoNombre = null;

        // ============================================
        // ADMINISTRADOR: puede ver TODAS las empresas
        // ============================================
        if (usuario.rol?.nombre === 'ADMINISTRADOR') {
            const { data: todasEmpresas, error: empresasError } = await window.supabaseClient
                .from('empresas')
                .select('id')
                .eq('activo', true);
            
            if (empresasError) {
                console.error('❌ Error cargando empresas para ADMINISTRADOR:', empresasError);
                empresasIds = [];
            } else {
                empresasIds = todasEmpresas?.map(e => e.id) || [];
                console.log('👑 ADMINISTRADOR - Empresas disponibles:', empresasIds.length);
            }
            
        // ============================================
        // OPERADOR_EMPRESA: puede ver SOLO las empresas asignadas
        // ============================================
        } else if (usuario.rol?.nombre === 'OPERADOR_EMPRESA') {
            console.log('🏢 OPERADOR_EMPRESA - Consultando empresas asignadas...');
            
            // Opción 1: Obtener empresas desde tabla intermedia usuarios_empresas
            const { data: empresasUsuario, error: empresasError } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('usuario_id', usuarioId);
            
            if (empresasError) {
                console.error('❌ Error consultando usuarios_empresas:', empresasError);
                empresasIds = [];
            } else if (empresasUsuario && empresasUsuario.length > 0) {
                empresasIds = empresasUsuario.map(e => e.empresa_id);
                console.log('✅ OPERADOR_EMPRESA - Empresas asignadas desde tabla intermedia:', empresasIds);
            } 
            // Opción 2: Fallback - usar empresa_id del usuario si existe
            else if (usuario.empresa_id) {
                empresasIds = [usuario.empresa_id];
                console.log('⚠️ OPERADOR_EMPRESA - Usando empresa_id del usuario (fallback):', empresasIds);
            } 
            // Opción 3: Sin empresas asignadas
            else {
                empresasIds = [];
                console.warn('⚠️ OPERADOR_EMPRESA - Sin empresas asignadas');
            }
            
            // Validar que las empresas asignadas existan y estén activas
            if (empresasIds.length > 0) {
                const { data: empresasValidas, error: validError } = await window.supabaseClient
                    .from('empresas')
                    .select('id, nombre')
                    .in('id', empresasIds)
                    .eq('activo', true);
                
                if (validError) {
                    console.error('❌ Error validando empresas:', validError);
                } else if (empresasValidas && empresasValidas.length > 0) {
                    empresasIds = empresasValidas.map(e => e.id);
                    console.log('✅ Empresas validadas:', empresasValidas.map(e => `${e.nombre} (${e.id})`).join(', '));
                } else {
                    console.warn('⚠️ Ninguna de las empresas asignadas está activa');
                    empresasIds = [];
                }
            }
            
        // ============================================
        // EMPLEADO: no tiene filtro por empresa (solo por asignaciones)
        // ============================================
        } else {
            console.log('👤 EMPLEADO - Sin filtro de empresa (solo asignaciones personales)');
            empresasIds = [];
        }

        // ============================================
        // OBTENER INFORMACIÓN DEL EMPLEADO ASOCIADO
        // ============================================
        if (empleadoId) {
            const { data: empleado, error: empError } = await window.supabaseClient
                .from('empleados')
                .select(`id, nombre_completo, puesto, empresa_id`)
                .eq('id', empleadoId)
                .maybeSingle();

            if (empError) {
                console.error('❌ Error obteniendo empleado:', empError);
            } else if (empleado) {
                empleadoNombre = empleado.nombre_completo;
                if (empleado.empresa_id && !empresaId) {
                    empresaId = empleado.empresa_id;
                }
                console.log('👤 Información de empleado:', {
                    nombre: empleadoNombre,
                    puesto: empleado.puesto,
                    empresaId: empleado.empresa_id
                });
            }
        }

        // ============================================
        // PREPARAR RESULTADO FINAL
        // ============================================
        const rolNombre = usuario.rol?.nombre || 'EMPLEADO';
        const rolNivel = usuario.rol?.nivel || 3;
        
        const resultado = { 
            rol: rolNombre, 
            nivel: rolNivel, 
            empresaId: empresaId, 
            empresasIds: empresasIds,  // Array de IDs de empresas que puede ver
            empleadoId: empleadoId, 
            empleadoNombre: empleadoNombre,
            usuarioId: usuario.id,
            usuarioCorreo: usuario.correo
        };
        
        console.log('📊 PERMISOS CALCULADOS:', {
            rol: resultado.rol,
            empresasIds: resultado.empresasIds,
            empresasCount: resultado.empresasIds.length,
            empleadoId: resultado.empleadoId,
            empleadoNombre: resultado.empleadoNombre
        });
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error FATAL en obtenerPermisosUsuario:', error);
        // Retornar permisos mínimos por seguridad
        return { 
            rol: 'EMPLEADO', 
            nivel: 3, 
            empresaId: null, 
            empresasIds: [], 
            empleadoId: null, 
            empleadoNombre: null,
            usuarioId: null,
            usuarioCorreo: null
        };
    }
}

// ==================== ASIGNAR EMPRESAS A OPERADOR ====================
async function asignarEmpresasAOperador(usuarioId, empresasIds) {
    try {
        if (!usuarioActual || !usuarioActual.id) {
            console.error('❌ Usuario no autenticado');
            return { success: false, message: 'Usuario no autenticado' };
        }
        
        // Verificar que el usuario actual sea ADMINISTRADOR
        const permisos = await obtenerPermisosUsuario(usuarioActual.id);
        if (permisos.rol !== 'ADMINISTRADOR') {
            console.error('❌ Solo administradores pueden asignar empresas');
            return { success: false, message: 'No tienes permisos para realizar esta acción' };
        }
        
        console.log(`📋 Asignando empresas al operador ${usuarioId}:`, empresasIds);
        
        const ahora = new Date().toISOString();
        
        // 1. Obtener asignaciones actuales
        const { data: asignacionesActuales, error: getError } = await window.supabaseClient
            .from('usuarios_empresas')
            .select('empresa_id, id')
            .eq('usuario_id', usuarioId);
        
        if (getError) throw getError;
        
        const empresasActuales = asignacionesActuales?.map(a => a.empresa_id) || [];
        console.log('📌 Empresas actuales:', empresasActuales);
        
        // 2. Empresas a eliminar (las que ya no están en la nueva lista)
        const empresasEliminar = empresasActuales.filter(e => !empresasIds.includes(e));
        
        // 3. Empresas a agregar (las nuevas que no estaban antes)
        const empresasAgregar = empresasIds.filter(e => !empresasActuales.includes(e));
        
        console.log('🗑️ Empresas a eliminar:', empresasEliminar);
        console.log('➕ Empresas a agregar:', empresasAgregar);
        
        // 4. Eliminar empresas que ya no corresponden
        if (empresasEliminar.length > 0) {
            const { error: deleteError } = await window.supabaseClient
                .from('usuarios_empresas')
                .delete()
                .eq('usuario_id', usuarioId)
                .in('empresa_id', empresasEliminar);
            
            if (deleteError) throw deleteError;
            console.log(`✅ Eliminadas ${empresasEliminar.length} asignaciones`);
        }
        
        // 5. Agregar nuevas empresas
        if (empresasAgregar.length > 0) {
            const inserts = empresasAgregar.map(empresaId => ({
                usuario_id: usuarioId,
                empresa_id: empresaId,
                creado_el: ahora,
                creado_por: usuarioActual.id
            }));
            
            const { error: insertError } = await window.supabaseClient
                .from('usuarios_empresas')
                .insert(inserts);
            
            if (insertError) throw insertError;
            console.log(`✅ Agregadas ${empresasAgregar.length} nuevas asignaciones`);
        }
        
        console.log(`✅ Empresas asignadas correctamente al operador ${usuarioId}`);
        return { 
            success: true, 
            message: 'Empresas asignadas correctamente',
            eliminadas: empresasEliminar.length,
            agregadas: empresasAgregar.length
        };
        
    } catch (error) {
        console.error('❌ Error asignando empresas:', error);
        return { 
            success: false, 
            message: error.message || 'Error al asignar empresas' 
        };
    }
}

// Exponer la función globalmente
window.asignarEmpresasAOperador = asignarEmpresasAOperador;

// ==================== OBTENER EMPRESAS DISPONIBLES ====================
async function obtenerEmpresasDisponibles() {
    try {
        const { data: empresas, error } = await window.supabaseClient
            .from('empresas')
            .select('id, nombre, ruc')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        
        return { success: true, empresas };
    } catch (error) {
        console.error('❌ Error obteniendo empresas:', error);
        return { success: false, empresas: [] };
    }
}

window.obtenerEmpresasDisponibles = obtenerEmpresasDisponibles;

// ==================== OBTENER EMPRESAS ASIGNADAS A OPERADOR ====================
async function obtenerEmpresasAsignadas(usuarioId) {
    try {
        const { data: asignaciones, error } = await window.supabaseClient
            .from('usuarios_empresas')
            .select(`
                empresa_id,
                empresas:empresa_id (id, nombre, ruc)
            `)
            .eq('usuario_id', usuarioId);
        
        if (error) throw error;
        
        const empresas = asignaciones?.map(a => ({
            id: a.empresa_id,
            nombre: a.empresas?.nombre,
            ruc: a.empresas?.ruc
        })) || [];
        
        return { success: true, empresas };
    } catch (error) {
        console.error('❌ Error obteniendo empresas asignadas:', error);
        return { success: false, empresas: [] };
    }
}

window.obtenerEmpresasAsignadas = obtenerEmpresasAsignadas;
