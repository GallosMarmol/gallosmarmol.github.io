// auth-check.js - Sistema Centralizado de Autenticación con Protección Anti-Cache
class AuthChecker {
    static CONFIG = {
        SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas
        REDIRECT_URL: '/index.html', // Portal principal
        SESSION_KEYS: [
            'sb-auth-token',
            'sesion_pin_gm', 
            'gm_user_session'
        ]
    };

    static inicializar() {
        console.log('🛡️  Inicializando AuthChecker - Protección anti-cache activada');
        
        // 1. Prevenir creación de userSession
        this.prevenirCreacionUserSession();
        
        // 2. Limpiar sesión redundante si existe
        this.limpiarSesionRedundante();
        
        // 3. Configurar sistema completo de verificación
        this.configurarSistemaCompleto();
        
        console.log('✅ AuthChecker inicializado correctamente');
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
                if (!this.verificarSesion()) {
                    console.log('🚫 Acceso denegado - Redirigiendo...');
                    this.redirigirInmediatamente();
                    return false;
                }
                console.log('✅ Acceso permitido');
            }
            return true;
        };

        // ✅ SISTEMA COMPLETO DE DETECCIÓN

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

        // 5. Verificación periódica (cada 20 segundos)
        setInterval(verificarYProteger, 20000);

        // 6. Detectar antes de que la página se descargue (opcional)
        window.addEventListener('beforeunload', function() {
            console.log('📤 Página se está descargando...');
        });

        console.log('🎯 Sistema de verificación configurado con 6 capas de protección');
    }
    
    static esPaginaPrincipal() {
        return window.location.pathname === '/index.html' || 
               window.location.pathname === '/' ||
               window.location.pathname.includes('index.html');
    }
    
    static verificarSesion() {
        try {
            console.log('🔍 Verificación completa de sesión...');
            
            // VERIFICACIÓN POR ETAPAS
            
            // Etapa 1: Existencia de sesión PIN
            const sesionPIN = localStorage.getItem('sesion_pin_gm');
            if (!sesionPIN) {
                console.warn('❌ ETAPA 1 FALLIDA: No hay sesión PIN');
                this.limpiarSesionesPorSeguridad();
                return false;
            }
            console.log('✅ ETAPA 1: Sesión PIN encontrada');

            // Etapa 2: Integridad de datos JSON
            let sesionData;
            try {
                sesionData = JSON.parse(sesionPIN);
            } catch (error) {
                console.error('❌ ETAPA 2 FALLIDA: Sesión PIN corrupta');
                this.limpiarSesionesPorSeguridad();
                return false;
            }
            console.log('✅ ETAPA 2: Datos JSON válidos');

            // Etapa 3: Verificar expiración
            const ahora = Date.now();
            if (ahora - sesionData.ultimaActividad > this.CONFIG.SESSION_DURATION) {
                console.warn('❌ ETAPA 3 FALLIDA: Sesión expirada');
                console.log(`   ⏰ Última actividad: ${new Date(sesionData.ultimaActividad).toLocaleString()}`);
                this.limpiarTodasLasSesiones();
                return false;
            }
            console.log('✅ ETAPA 3: Sesión vigente');

            // Etapa 4: Verificar acceso al sistema de suministro
            const sistemaSuministro = sesionData.sistemas?.find(s => s.key === 'sistemaSuministro');
            if (!sistemaSuministro) {
                console.warn('❌ ETAPA 4 FALLIDA: No se encontró sistema de suministro');
                return false;
            }
            
            if (!sistemaSuministro.activo) {
                console.warn('❌ ETAPA 4 FALLIDA: Sistema de suministro inactivo');
                return false;
            }
            console.log('✅ ETAPA 4: Acceso al sistema verificado');

            // Etapa 5: Verificar estructura de usuario
            if (!sesionData.usuario || !sesionData.usuario.email) {
                console.warn('❌ ETAPA 5 FALLIDA: Estructura de usuario inválida');
                return false;
            }
            console.log('✅ ETAPA 5: Usuario válido');

            // ACTUALIZAR ACTIVIDAD SI TODO ESTÁ BIEN
            sesionData.ultimaActividad = ahora;
            localStorage.setItem('sesion_pin_gm', JSON.stringify(sesionData));
            
            console.log(`🎉 VERIFICACIÓN EXITOSA: ${sesionData.usuario.nombre} | ${sistemaSuministro.rol}`);
            return true;

        } catch (error) {
            console.error('💥 ERROR CRÍTICO en verificación:', error);
            this.limpiarSesionesPorSeguridad();
            return false;
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
        console.log('🧹 LIMPIANDO TODAS LAS SESIONES...');
        
        const todasLasSesiones = [
            'sb-auth-token',
            'sesion_pin_gm', 
            'gm_user_session',
            'userSession',
            'supabase.auth.token',
            'supabase.auth.token.1',
            'supabase.auth.token.2'
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
        
        // 2. Limpiar todo
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
            'sb-auth-token'
        ];
        
        sesionesVerificar.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                console.log(`   📍 ${key}: PRESENTE`);
                try {
                    const data = JSON.parse(item);
                    if (data.usuario) {
                        console.log(`     👤 Usuario: ${data.usuario.nombre}`);
                    }
                    if (data.ultimaActividad) {
                        console.log(`     ⏰ Actividad: ${new Date(data.ultimaActividad).toLocaleString()}`);
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
                sistemasAcceso: sistemaSuministro.datosUsuario?.sistemas_acceso
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
}

// ✅ INICIALIZACIÓN INMEDIATA Y AUTOMÁTICA
(function() {
    // Inicializar inmediatamente cuando se carga el script
    AuthChecker.inicializar();
    
    // Exponer globalmente
    window.AuthChecker = AuthChecker;
    
    console.log('🔧 AuthChecker cargado - Listo para proteger la aplicación');
    console.log('   Comandos disponibles:');
    console.log('   - AuthChecker.obtenerDatosUsuario()');
    console.log('   - AuthChecker.cerrarSesionGlobal()');
    console.log('   - AuthChecker.mostrarEstadoSesiones()');
    console.log('   - AuthChecker.tieneAcceso()');

})();
