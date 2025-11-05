// Este script debe incluirse en TODAS las páginas del sistema
class SessionChecker {
    constructor() {
        this.requiredSystem = this.detectSystemFromPath();
        this.requiredRole = this.detectRoleFromPath();
    }

    // Detectar sistema actual desde la ruta
    detectSystemFromPath() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('/suministro/')) return 'sistemaSuministro';
        if (path.includes('/ticket/')) return 'sistemaTicket';
        if (path.includes('/activo/')) return 'sistemaActivo';
        if (path.includes('/despacho/')) return 'sistemaDespacho';
        if (path.includes('/inventario/')) return 'sistemaInventario';
        
        return null;
    }

    // Detectar rol requerido desde la ruta
    detectRoleFromPath() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('/colaborador/') || path.includes('/colaborador.')) return 'colaborador';
        if (path.includes('/supervisor/') || path.includes('/supervisor.')) return 'supervisor';
        if (path.includes('/administrador/') || path.includes('/admin')) return 'administrador';
        if (path.includes('/gerente/')) return 'gerente';
        if (path.includes('/soporte/')) return 'soporte';
        
        return null;
    }

    // Verificar acceso a la página actual
    checkAccess() {
        const session = AppSession.getCurrentSession();
        
        if (!session) {
            console.log('❌ No hay sesión activa');
            this.redirectToLogin();
            return false;
        }

        if (!this.requiredSystem) {
            console.log('⚠️ No se pudo detectar el sistema desde la ruta');
            return true; // Permitir acceso si no se detecta sistema
        }

        const hasAccess = AppSession.hasSystemAccess(this.requiredSystem, this.requiredRole);
        
        if (!hasAccess) {
            console.log(`❌ Sin acceso a ${this.requiredSystem} con rol ${this.requiredRole}`);
            this.showAccessDenied();
            return false;
        }

        console.log(`✅ Acceso permitido a ${this.requiredSystem} como ${this.requiredRole}`);
        this.injectUserInfo(session.user);
        return true;
    }

    // Redirigir al login principal
    redirectToLogin() {
        // Guardar la página actual para redirigir después del login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Redirigir al portal principal
        window.location.href = '/index.html'; // Ajusta esta ruta según tu estructura
    }

    // Mostrar mensaje de acceso denegado
    showAccessDenied() {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa;">
                <div style="text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 4rem; color: #dc3545; margin-bottom: 1rem;">
                        <i class="fas fa-ban"></i>
                    </div>
                    <h2 style="color: #333; margin-bottom: 1rem;">Acceso Denegado</h2>
                    <p style="color: #666; margin-bottom: 2rem;">
                        No tienes permisos para acceder a esta página.<br>
                        Rol requerido: <strong>${this.requiredRole}</strong>
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="window.history.back()" style="padding: 0.75rem 1.5rem; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-arrow-left"></i> Volver
                        </button>
                        <button onclick="window.location.href='/index.html'" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-home"></i> Ir al Portal
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Inyectar información del usuario en la página
    injectUserInfo(user) {
        // Crear o actualizar header de usuario
        const userHeader = this.createUserHeader(user);
        const existingHeader = document.getElementById('userSessionHeader');
        
        if (existingHeader) {
            existingHeader.replaceWith(userHeader);
        } else {
            // Insertar al inicio del body
            document.body.insertBefore(userHeader, document.body.firstChild);
        }

        // Agregar botón de logout si no existe
        this.addLogoutButton();
    }

    createUserHeader(user) {
        const header = document.createElement('div');
        header.id = 'userSessionHeader';
        header.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; font-size: 1rem;">${user.nombre || user.email}</div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">${user.email} • ${this.requiredRole}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 0.9rem;">
                        <i class="fas fa-shield-alt"></i> ${this.requiredSystem.replace('sistema', '')}
                    </span>
                    <button id="logoutBtn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
        return header;
    }

    addLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                AppSession.clearSession();
                window.location.href = '/index.html';
            });
        }
    }
}

// Inicializar verificador de sesión cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    const sessionChecker = new SessionChecker();
    sessionChecker.checkAccess();
});