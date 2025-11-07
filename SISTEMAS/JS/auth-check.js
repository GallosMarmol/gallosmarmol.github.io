// auth-check.js - Sistema Centralizado de Autenticación con Caché Optimizado
class AuthChecker {
    static CONFIG = {
        SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
        REDIRECT_URL: '/index.html', // Portal principal
        SESSION_KEYS: [
            'sb-auth-token',
            'sesion_pin_gm', 
            'gm_user_session'
        ],
        // ✅ CONFIGURACIÓN DE CACHÉ OPTIMIZADA
        CACHE_CONFIG: {
            ENABLED: true,
            CACHE_DURATION: 10 * 60 * 1000, // 10 minutos de caché
            CACHE_KEY: 'auth_check_cache',
            CACHE_TIMESTAMP_KEY: 'auth_check_timestamp',
            CACHE_DATA_KEY: 'auth_check_data'
        }
    };

    static inicializar() {
        console.log('🛡️  Inicializando AuthChecker OPTIMIZADO - Caché activado');
        
        // 1. Prevenir creación de userSession
        this.prevenirCreacionUserSession();
        
        // 2. Limpiar sesión redundante si existe
        this.limpiarSesionRedundante();
        
        // 3. Configurar sistema completo de verificación optimizado
        this.configurarSistemaCompleto();
        
        console.log('✅ AuthChecker optimizado inicializado correctamente');
    }
    
    static prevenirCreacionUserSession() {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key === 'userSession') {
                console.warn('🚫 BLOQUEADO: Intento de crear userSession redundante');
                console.trace('Origen del intento:');
                
                // Log informativo del intento
                try {
                    const attemptedData = JSON.parse(value);
                    console.log('📝 Datos del intento:', {
                        user: attemptedData.userName,
                        role: attemptedData.userRole,
                        system: attemptedData.userSystem
                    });
                } catch (e) {
                    console.log('📝 Valor crudo:', value);
                }
                
                // NO permitir la creación
                return;
            }
            return originalSetItem.apply(this, arguments);
        };
        
        console.log('🛡️  Prevención de userSession activada');
    }
    
    static configurarSistemaCompleto() {
        const verificarYProteger = () => {
            const esPaginaPrincipal = this.esPaginaPrincipal();
            
            if (!esPaginaPrincipal) {
                console.log('🔐 Verificando acceso a página protegida...');
                if (!this.verificarSesionOptimizada()) {
                    console.log('🚫 Acceso denegado - Redirigiendo...');
                    this.redirigirInmediatamente();
                    return false;
                }
                console.log('✅ Acceso permitido');
            }
            return true;
        };

        // ✅ SISTEMA COMPLETO DE DETECCIÓN OPTIMIZADO

        // 1. Verificación en carga inicial
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', verificarYProteger);
        } else {
            setTimeout(verificarYProteger, 10);
        }

        // 2. Detectar cuando se usa el botón "Atrás" del navegador
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                console.log('🔙 Página cargada desde cache (botón atrás) - Verificando...');
            }
            setTimeout(verificarYProteger, 50);
        });

        // 3. Detectar cuando la pestaña gana foco
        window.addEventListener('focus', function() {
            console.log('👀 Pestaña enfocada - Verificando sesión...');
            setTimeout(verificarYProteger, 100);
        });

        // 4. Detectar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                console.log('📄 Página visible - Verificando sesión...');
                setTimeout(verificarYProteger, 150);
            }
        });

        // 5. Verificación periódica OPTIMIZADA (cada 2 minutos en lugar de 20 segundos)
        setInterval(verificarYProteger, 120000);

        // 6. Detectar antes de que la página se descargue (opcional)
        window.addEventListener('beforeunload', function() {
            console.log('📤 Página se está descargando...');
        });

        console.log('🎯 Sistema de verificación OPTIMIZADO configurado con 6 capas de protección');
    }
    
    static esPaginaPrincipal() {
        return window.location.pathname === '/index.html' || 
               window.location.pathname === '/' ||
               window.location.pathname.includes('index.html');
    }
    
    // ✅ MÉTODO PRINCIPAL OPTIMIZADO CON CACHÉ
    static verificarSesionOptimizada() {
        try {
            console.log('🔍 Verificación OPTIMIZADA de sesión...');
            
            // 1. PRIMERO VERIFICAR CACHÉ LOCAL
            if (this.CONFIG.CACHE_CONFIG.ENABLED) {
                const cacheResult = this.verificarCache();
                if (cacheResult.fromCache) {
                    console.log('⚡ Usando verificación en caché');
                    return cacheResult.valid;
                }
            }
            
            // 2. SOLO SI EL CACHÉ EXPIRÓ, HACER VERIFICACIÓN COMPLETA
            console.log('📡 Haciendo verificación completa...');
            const resultadoCompleto = this.verificarSesionCompleta();
            
            // 3. GUARDAR EN CACHÉ SI ES VÁLIDA
            if (this.CONFIG.CACHE_CONFIG.ENABLED && resultadoCompleto.valida) {
                this.guardarEnCache(resultadoCompleto);
            }
            
            return resultadoCompleto.valida;
            
        } catch (error) {
            console.error('❌ Error en verificación optimizada:', error);
            return false;
        }
    }

    // ✅ MÉTODO PARA VERIFICAR CACHÉ
    static verificarCache() {
        try {
            const cachedResult = localStorage.getItem(this.CONFIG.CACHE_CONFIG.CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(this.CONFIG.CACHE_CONFIG.CACHE_TIMESTAMP_KEY);
            
            if (!cachedResult || !cachedTimestamp) {
                return { fromCache: false, valid: false };
            }
            
            const now = Date.now();
            const cacheAge = now - parseInt(cachedTimestamp);
            
            // Verificar si el caché es reciente (menos de 10 minutos)
            if (cacheAge < this.CONFIG.CACHE_CONFIG.CACHE_DURATION) {
                const isValid = cachedResult === 'true';
                console.log(`⚡ Caché válido (edad: ${Math.round(cacheAge/1000)}s)`);
                return { fromCache: true, valid: isValid };
            } else {
                console.log(`🕒 Caché expirado (edad: ${Math.round(cacheAge/60000)}min)`);
                this.limpiarCache();
                return { fromCache: false, valid: false };
            }
            
        } catch (error) {
            console.error('❌ Error verificando caché:', error);
            this.limpiarCache();
            return { fromCache: false, valid: false };
        }
    }

    // ✅ MÉTODO PARA GUARDAR EN CACHÉ
    static guardarEnCache(resultado) {
        try {
            localStorage.setItem(this.CONFIG.CACHE_CONFIG.CACHE_KEY, 'true');
            localStorage.setItem(this.CONFIG.CACHE_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
            
            // Guardar datos adicionales para uso rápido
            if (resultado.datosUsuario) {
                localStorage.setItem(this.CONFIG.CACHE_CONFIG.CACHE_DATA_KEY, JSON.stringify({
                    usuario: resultado.datosUsuario.nombre,
                    email: resultado.datosUsuario.email,
                    sistema: resultado.sistemaPrincipal,
                    timestamp: new Date().toISOString()
                }));
            }
            
            console.log('💾 Verificación guardada en caché');
        } catch (error) {
            console.error('❌ Error guardando en caché:', error);
        }
    }

    // ✅ MÉTODO PARA LIMPIAR CACHÉ
    static limpiarCache() {
        try {
            localStorage.removeItem(this.CONFIG.CACHE_CONFIG.CACHE_KEY);
            localStorage.removeItem(this.CONFIG.CACHE_CONFIG.CACHE_TIMESTAMP_KEY);
            localStorage.removeItem(this.CONFIG.CACHE_CONFIG.CACHE_DATA_KEY);
            console.log('🧹 Caché limpiado');
        } catch (error) {
            console.error('❌ Error limpiando caché:', error);
        }
    }

    // ✅ MÉTODO DE VERIFICACIÓN COMPLETA (original mejorado)
    static verificarSesionCompleta() {
        try {
            console.log('🔍 Verificación COMPLETA de sesión...');
            
            // VERIFICACIÓN POR ETAPAS
            
            // Etapa 1: Existencia de sesión PIN
            const sesionPIN = localStorage.getItem('sesion_pin_gm');
            if (!sesionPIN) {
                console.warn('❌ ETAPA 1 FALLIDA: No hay sesión PIN');
                this.limpiarSesionesPorSeguridad();
                return { valida: false, etapa: 1 };
            }
            console.log('✅ ETAPA 1: Sesión PIN encontrada');

            // Etapa 2: Integridad de datos JSON
            let sesionData;
            try {
                sesionData = JSON.parse(sesionPIN);
            } catch (error) {
                console.error('❌ ETAPA 2 FALLIDA: Sesión PIN corrupta');
                this.limpiarSesionesPorSeguridad();
                return { valida: false, etapa: 2 };
            }
            console.log('✅ ETAPA 2: Datos JSON válidos');

            // Etapa 3: Verificar expiración
            const ahora = Date.now();
            if (ahora - sesionData.ultimaActividad > this.CONFIG.SESSION_DURATION) {
                console.warn('❌ ETAPA 3 FALLIDA: Sesión expirada');
                console.log(`   ⏰ Última actividad: ${new Date(sesionData.ultimaActividad).toLocaleString()}`);
                this.limpiarTodasLasSesiones();
                return { valida: false, etapa: 3 };
            }
            console.log('✅ ETAPA 3: Sesión vigente');

            // Etapa 4: Verificar acceso al sistema de suministro
            const sistemaSuministro = sesionData.sistemas?.find(s => s.key === 'sistemaSuministro');
            if (!sistemaSuministro) {
                console.warn('❌ ETAPA 4 FALLIDA: No se encontró sistema de suministro');
                return { valida: false, etapa: 4 };
            }
            
            if (!sistemaSuministro.activo) {
                console.warn('❌ ETAPA 4 FALLIDA: Sistema de suministro inactivo');
                return { valida: false, etapa: 4 };
            }
            console.log('✅ ETAPA 4: Acceso al sistema verificado');

            // Etapa 5: Verificar estructura de usuario
            if (!sesionData.usuario || !sesionData.usuario.email) {
                console.warn('❌ ETAPA 5 FALLIDA: Estructura de usuario inválida');
                return { valida: false, etapa: 5 };
            }
            console.log('✅ ETAPA 5: Usuario válido');

            // ACTUALIZAR ACTIVIDAD SI TODO ESTÁ BIEN
            sesionData.ultimaActividad = ahora;
            localStorage.setItem('sesion_pin_gm', JSON.stringify(sesionData));
            
            console.log(`🎉 VERIFICACIÓN EXITOSA: ${sesionData.usuario.nombre} | ${sistemaSuministro.rol}`);
            
            return {
                valida: true,
                datosUsuario: sesionData.usuario,
                sistemaPrincipal: sistemaSuministro,
                etapa: 'completa'
            };

        } catch (error) {
            console.error('💥 ERROR CRÍTICO en verificación:', error);
            this.limpiarSesionesPorSeguridad();
            return { valida: false, etapa: 'error', error: error.message };
        }
    }
    
    static limpiarSesionRedundante() {
        if (localStorage.getItem('userSession')) {
            console.log('🧹 Eliminando userSession existente');
            localStorage.removeItem('userSession');
        }
    }
    
    static limpiarSesionesPorSeguridad() {
        console.log('🛡️  Limpieza de seguridad iniciada...');
        this.limpiarTodasLasSesiones();
    }
    
    static limpiarTodasLasSesiones() {
        console.log('🧹 LIMPIANDO TODAS LAS SESIONES Y CACHÉ...');
        
        const todasLasSesiones = [
            'sb-auth-token',
            'sesion_pin_gm', 
            'gm_user_session',
            'userSession',
            'supabase.auth.token',
            'supabase.auth.token.1',
            'supabase.auth.token.2',
            // ✅ INCLUIR CLAVES DE CACHÉ
            this.CONFIG.CACHE_CONFIG.CACHE_KEY,
            this.CONFIG.CACHE_CONFIG.CACHE_TIMESTAMP_KEY,
            this.CONFIG.CACHE_CONFIG.CACHE_DATA_KEY
        ];
        
        let eliminadas = 0;
        
        todasLasSesiones.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`   ✅ Eliminado: ${key}`);
                eliminadas++;
            }
        });
        
        // Limpiar sessionStorage también
        sessionStorage.clear();
        console.log(`   ✅ sessionStorage limpiado`);
        
        console.log(`📊 Total de sesiones eliminadas: ${eliminadas}`);
    }
    
    static redirigirInmediatamente() {
        console.log('📍 Redirigiendo AL PORTAL inmediatamente...');
        // Usar replace() para evitar que quede en el historial del navegador
        window.location.replace(this.CONFIG.REDIRECT_URL);
    }
    
    static cerrarSesionGlobal() {
        console.log('🚪 CERRANDO SESIÓN GLOBAL...');
        
        // 1. Mostrar sesiones actuales (debug)
        this.mostrarEstadoSesiones();
        
        // 2. Limpiar todo incluyendo caché
        this.limpiarTodasLasSesiones();
        
        // 3. Redirigir inmediatamente
        this.redirigirInmediatamente();
        
        console.log('✅ Sesión cerrada completamente');
    }
    
    static mostrarEstadoSesiones() {
        console.log('📋 ESTADO ACTUAL DE SESIONES:');
        
        const sesionesVerificar = [
            'sesion_pin_gm',
            'gm_user_session', 
            'userSession',
            'sb-auth-token',
            // ✅ INCLUIR ESTADO DEL CACHÉ
            this.CONFIG.CACHE_CONFIG.CACHE_KEY
        ];
        
        sesionesVerificar.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                console.log(`   📍 ${key}: PRESENTE`);
                try {
                    if (key === this.CONFIG.CACHE_CONFIG.CACHE_KEY) {
                        const timestamp = localStorage.getItem(this.CONFIG.CACHE_CONFIG.CACHE_TIMESTAMP_KEY);
                        if (timestamp) {
                            const age = Date.now() - parseInt(timestamp);
                            console.log(`     ⏰ Caché edad: ${Math.round(age/1000)}s`);
                        }
                    } else {
                        const data = JSON.parse(item);
                        if (data.usuario) {
                            console.log(`     👤 Usuario: ${data.usuario.nombre}`);
                        }
                        if (data.ultimaActividad) {
                            console.log(`     ⏰ Actividad: ${new Date(data.ultimaActividad).toLocaleString()}`);
                        }
                    }
                } catch (e) {
                    console.log(`     📄 Contenido: ${item.substring(0, 50)}...`);
                }
            } else {
                console.log(`   ❌ ${key}: AUSENTE`);
            }
        });
    }
    
    static obtenerDatosUsuario() {
        try {
            // ✅ PRIMERO INTENTAR OBTENER DEL CACHÉ RÁPIDO
            const cachedData = localStorage.getItem(this.CONFIG.CACHE_CONFIG.CACHE_DATA_KEY);
            if (cachedData) {
                try {
                    const data = JSON.parse(cachedData);
                    console.log('⚡ Obteniendo datos usuario desde caché');
                    return {
                        userName: data.usuario,
                        userEmail: data.email,
                        userSystem: data.sistema,
                        fromCache: true
                    };
                } catch (e) {
                    // Si falla, continuar con método normal
                }
            }
            
            const sesionPIN = localStorage.getItem('sesion_pin_gm');
            
            if (!sesionPIN) {
                return null;
            }
            
            const pinData = JSON.parse(sesionPIN);
            const sistemaSuministro = pinData.sistemas?.find(s => s.key === 'sistemaSuministro');
            
            if (!sistemaSuministro) {
                return null;
            }
            
            // Retornar datos COMPLETOS del usuario
            return {
                // Datos básicos
                userName: pinData.usuario?.nombre || 'Usuario',
                userEmail: pinData.usuario?.email,
                userRole: sistemaSuministro.rol || 'colaborador',
                userSystem: 'sistemaSuministro',
                userId: pinData.usuario?.id,
                
                // Datos extendidos
                userFullName: `${sistemaSuministro.datosUsuario?.nombre || ''} ${sistemaSuministro.datosUsuario?.apellido || ''}`.trim(),
                userApellido: sistemaSuministro.datosUsuario?.apellido,
                userNombre: sistemaSuministro.datosUsuario?.nombre,
                
                // Información del sistema
                sistemaActivo: sistemaSuministro.activo,
                sistemaNombre: sistemaSuministro.name,
                
                // Metadata
                ultimaActividad: pinData.ultimaActividad,
                timestamp: new Date().toISOString(),
                
                // Accesos a otros sistemas
                sistemasAcceso: sistemaSuministro.datosUsuario?.sistemas_acceso,
                
                fromCache: false
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo datos usuario:', error);
            return null;
        }
    }
    
    static actualizarActividad() {
        try {
            const sesionPIN = localStorage.getItem('sesion_pin_gm');
            if (sesionPIN) {
                const sesionData = JSON.parse(sesionPIN);
                sesionData.ultimaActividad = Date.now();
                localStorage.setItem('sesion_pin_gm', JSON.stringify(sesionData));
                
                // ✅ ACTUALIZAR CACHÉ TAMBIÉN
                this.limpiarCache();
            }
        } catch (error) {
            console.error('❌ Error actualizando actividad:', error);
        }
    }
    
    static tieneAcceso(sistema = 'sistemaSuministro') {
        try {
            const sesionPIN = localStorage.getItem('sesion_pin_gm');
            if (!sesionPIN) return false;
            
            const pinData = JSON.parse(sesionPIN);
            const sistemaBuscado = pinData.sistemas?.find(s => s.key === sistema);
            
            return sistemaBuscado?.activo === true;
            
        } catch (error) {
            console.error('❌ Error verificando acceso:', error);
            return false;
        }
    }
    
    static obtenerTiempoRestante() {
        try {
            const sesionPIN = localStorage.getItem('sesion_pin_gm');
            if (!sesionPIN) return 0;
            
            const sesionData = JSON.parse(sesionPIN);
            const ahora = Date.now();
            const tiempoTranscurrido = ahora - sesionData.ultimaActividad;
            const tiempoRestante = this.CONFIG.SESSION_DURATION - tiempoTranscurrido;
            
            return Math.max(0, tiempoRestante);
            
        } catch (error) {
            console.error('❌ Error calculando tiempo restante:', error);
            return 0;
        }
    }
    
    // ✅ NUEVO: MÉTODO PARA VERIFICACIÓN FRESCA (sin caché)
    static verificarSesionFresca() {
        console.log('🔄 Forzando verificación FRESCA (sin caché)...');
        this.limpiarCache();
        const resultado = this.verificarSesionCompleta();
        return resultado.valida;
    }
    
    // ✅ NUEVO: MÉTODO PARA OBTENER ESTADO DEL CACHÉ
    static obtenerEstadoCache() {
        try {
            const cachedResult = localStorage.getItem(this.CONFIG.CACHE_CONFIG.CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(this.CONFIG.CACHE_CONFIG.CACHE_TIMESTAMP_KEY);
            
            if (!cachedResult || !cachedTimestamp) {
                return { activo: false, edad: null };
            }
            
            const now = Date.now();
            const cacheAge = now - parseInt(cachedTimestamp);
            const activo = cacheAge < this.CONFIG.CACHE_CONFIG.CACHE_DURATION;
            
            return {
                activo: activo,
                edad: cacheAge,
                edadSegundos: Math.round(cacheAge / 1000),
                edadMinutos: Math.round(cacheAge / 60000),
                valor: cachedResult
            };
        } catch (error) {
            return { activo: false, edad: null, error: error.message };
        }
    }
}

// ✅ INICIALIZACIÓN INMEDIATA Y AUTOMÁTICA OPTIMIZADA
(function() {
    // Inicializar inmediatamente cuando se carga el script
    AuthChecker.inicializar();
    
    // Exponer globalmente
    window.AuthChecker = AuthChecker;
    
    console.log('🔧 AuthChecker OPTIMIZADO cargado - Caché activado');
    console.log('   Comandos disponibles:');
    console.log('   - AuthChecker.verificarSesionOptimizada()');
    console.log('   - AuthChecker.verificarSesionFresca()');
    console.log('   - AuthChecker.obtenerEstadoCache()');
    console.log('   - AuthChecker.obtenerDatosUsuario()');
    console.log('   - AuthChecker.cerrarSesionGlobal()');
    console.log('   - AuthChecker.mostrarEstadoSesiones()');
    console.log('   - AuthChecker.tieneAcceso()');
})();