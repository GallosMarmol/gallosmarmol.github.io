// ============================================================
// ventas/js/auth-check.js
// Validación de sesión para todas las páginas del portal Ventas
// ============================================================

import { AuthAPI } from '../../shared/js/supabase-client.js';

export async function verificarSesionYRedirigir() {
    try {
        const autenticado = await AuthAPI.isAuthenticated();

        if (!autenticado) {
            // Redirigir al login
            window.location.href = 'login.html';
            return false;
        }

        const userData = await AuthAPI.getCurrentUser();

        if (!userData || !userData.profile) {
            window.location.href = 'login.html';
            return false;
        }

        // Verificar que el usuario tenga rol de ventas o admin
        const rol = userData.profile.rol;
        const rolesPermitidos = ['ventas', 'admin', 'gerencia'];

        if (!rolesPermitidos.includes(rol)) {
            alert('⚠️ No tienes permisos para acceder al portal de Ventas.');
            await AuthAPI.logout();
            window.location.href = 'login.html';
            return false;
        }

        return true;

    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = 'login.html';
        return false;
    }
}