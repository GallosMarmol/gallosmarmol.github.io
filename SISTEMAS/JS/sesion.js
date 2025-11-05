// Configuración centralizada de sesión
class SessionManager {
    constructor() {
        this.SESSION_KEY = 'gm_user_session';
        this.TOKEN_KEY = 'gm_auth_token';
        this.SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas
    }

    // Crear sesión al autenticar
    createSession(userData, systems) {
        const sessionData = {
            user: userData,
            systems: systems,
            timestamp: new Date().toISOString(),
            lastActivity: Date.now(),
            expiresAt: Date.now() + this.SESSION_DURATION
        };
        
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
        this.setAuthToken(userData.id);
        
        console.log('✅ Sesión creada para:', userData.email);
        return sessionData;
    }

    // Obtener sesión actual
    getCurrentSession() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);
            const now = Date.now();
            
            // Verificar si la sesión expiró
            if (now > session.expiresAt) {
                this.clearSession();
                return null;
            }

            // Actualizar última actividad
            session.lastActivity = now;
            this.saveSession(session);
            
            return session;
        } catch (error) {
            this.clearSession();
            return null;
        }
    }

    // Verificar si el usuario tiene acceso a un sistema específico
    hasSystemAccess(systemKey, requiredRole = null) {
        const session = this.getCurrentSession();
        if (!session) return false;

        const userSystem = session.systems.find(sys => sys.key === systemKey);
        if (!userSystem) return false;

        if (requiredRole && userSystem.rol !== requiredRole) {
            return false;
        }

        return true;
    }

    // Obtener datos del usuario actual
    getCurrentUser() {
        const session = this.getCurrentSession();
        return session ? session.user : null;
    }

    // Cerrar sesión
    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        console.log('🔐 Sesión cerrada');
    }

    // Token de autenticación (para APIs)
    setAuthToken(userId) {
        const token = btoa(`${userId}_${Date.now()}_${Math.random()}`);
        localStorage.setItem(this.TOKEN_KEY, token);
        return token;
    }

    getAuthToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    // Verificar token en otras páginas
    verifyToken() {
        const token = this.getAuthToken();
        const session = this.getCurrentSession();
        
        if (!token || !session) return false;
        
        // Aquí puedes agregar validación adicional del token
        return true;
    }
}

// Instancia global
const AppSession = new SessionManager();