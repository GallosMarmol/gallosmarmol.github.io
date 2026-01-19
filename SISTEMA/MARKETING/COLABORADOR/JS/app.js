// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = 'https://fzdwqkoporxnzvhpmlls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZHdxa29wb3J4bnp2aHBtbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDkxMDYsImV4cCI6MjA3NzM4NTEwNn0.nOS3oByMmopchYhH0Kv1I0lxi02VkqfsC-eGFTZ_ePg';

// Inicializar Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let recursos = [];
let categorias = [];
let usuarios = [];
let currentEmail = '';
let userHasPassword = false;

// Variables para filtros y paginación
let recursosFiltrados = [];
let paginaActual = 1;
const recursosPorPagina = 12;
let busquedaTimeout = null;

// Estado de los filtros
const estadoFiltros = {
    categorias: [],
    tipos: [],
    formatos: [],
    busqueda: ''
};

// Configuración de tipos y formatos
const tiposRecursos = [
    { id: 'imagen', nombre: 'Imagen', icono: 'fas fa-image' },
    { id: 'video', nombre: 'Video', icono: 'fas fa-video' },
    { id: 'documento', nombre: 'Documento', icono: 'fas fa-file-alt' },
    { id: 'audio', nombre: 'Audio', icono: 'fas fa-volume-up' }
];

const formatosComunes = ['jpg', 'png', 'gif', 'mp4', 'avi', 'pdf', 'docx', 'pptx', 'mp3', 'wav'];

// Variable para recurso actual en vista previa
let recursoActual = null;

// ===== ELEMENTOS DEL DOM =====
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const emailStep = document.getElementById('emailStep');
const passwordStep = document.getElementById('passwordStep');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const verifyEmailBtn = document.getElementById('verifyEmailBtn');
const loginBtn = document.getElementById('loginBtn');
const backToEmailBtn = document.getElementById('backToEmailBtn');
const loginMessage = document.getElementById('loginMessage');
const loginLoading = document.getElementById('loginLoading');
const togglePasswordBtn = document.getElementById('togglePassword');
const toggleNewPasswordBtn = document.getElementById('toggleNewPassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');

// Header
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const userRole = document.getElementById('userRole');
const refreshBtn = document.getElementById('refreshBtn');

// Búsqueda
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// Filtros
const filtrosFijos = document.getElementById('filtros-fijos');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
const filtrosOpciones = document.getElementById('filtros-opciones');

// Recursos
const recursosGrid = document.getElementById('recursosGrid');
const recursosLista = document.getElementById('recursosLista');
const listaRecursosBody = document.getElementById('listaRecursosBody');
const verTodosBtn = document.getElementById('verTodosBtn');
const verListaBtn = document.getElementById('verListaBtn');
const productsStats = document.getElementById('products-stats');
const productsCount = document.getElementById('products-count');
const pagination = document.getElementById('pagination');
const totalRecursos = document.getElementById('totalRecursos');

// Modales
const previewModal = document.getElementById('previewModal');
const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const downloadPreviewBtn = document.getElementById('downloadPreviewBtn');
const previewImage = document.getElementById('previewImage');
const previewVideo = document.getElementById('previewVideo');
const previewDocument = document.getElementById('previewDocument');
const previewNombre = document.getElementById('previewNombre');
const previewDescripcion = document.getElementById('previewDescripcion');
const previewCategoria = document.getElementById('previewCategoria');
const previewTipo = document.getElementById('previewTipo');
const previewFormato = document.getElementById('previewFormato');

const passwordModal = document.getElementById('passwordModal');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Mensajes
const systemMessage = document.getElementById('systemMessage');

// ===== VARIABLES PARA FILTROS MÓVIL =====
const filtrosMovilBtn = document.getElementById('filtrosMovilBtn');
const filtrosModal = document.getElementById('filtrosModal');
const filtrosModalContent = document.getElementById('filtrosModalContent');
const closeFiltrosModalBtn = document.getElementById('closeFiltrosModalBtn');
const limpiarFiltrosModalBtn = document.getElementById('limpiarFiltrosModalBtn');
const aplicarFiltrosModalBtn = document.getElementById('aplicarFiltrosModalBtn');
const filterBadge = document.getElementById('filterBadge');

// ===== FUNCIONES PARA FILTROS MÓVIL =====
function abrirFiltrosModal() {
    cargarFiltrosModal();
    filtrosModal.classList.add('activo');
    filtrosModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function cerrarFiltrosModal() {
    filtrosModal.classList.remove('activo');
    filtrosModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function cargarFiltrosModal() {
    let html = '';
    
    // Filtro por Categoría
    html += `
        <div class="filtro-grupo-modal">
            <h4><i class="fas fa-tags"></i> Categoría</h4>
            <div class="filtro-opciones-modal">
                ${categorias.map(categoria => `
                    <label class="filtro-checkbox-modal">
                        <input type="checkbox" 
                               name="categoria-movil" 
                               value="${categoria.id}"
                               ${estadoFiltros.categorias && estadoFiltros.categorias.includes(categoria.id.toString()) ? 'checked' : ''}
                               onchange="actualizarFiltroDesdeMovil('categorias', '${categoria.id}', this.checked)">
                        <span style="color: ${categoria.color}">
                            <i class="${categoria.icono || 'fas fa-folder'}"></i> ${categoria.nombre}
                        </span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
    
    // Filtro por Tipo
    html += `
        <div class="filtro-grupo-modal">
            <h4><i class="fas fa-file"></i> Tipo de Recurso</h4>
            <div class="filtro-opciones-modal">
                ${tiposRecursos.map(tipo => `
                    <label class="filtro-checkbox-modal">
                        <input type="checkbox" 
                               name="tipo-movil" 
                               value="${tipo.id}"
                               ${estadoFiltros.tipos && estadoFiltros.tipos.includes(tipo.id) ? 'checked' : ''}
                               onchange="actualizarFiltroDesdeMovil('tipos', '${tipo.id}', this.checked)">
                        <span><i class="${tipo.icono}"></i> ${tipo.nombre}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
    
    // Filtro por Formato
    html += `
        <div class="filtro-grupo-modal">
            <h4><i class="fas fa-file-alt"></i> Formato</h4>
            <div class="filtro-opciones-modal">
                ${formatosComunes.map(formato => `
                    <label class="filtro-checkbox-modal">
                        <input type="checkbox" 
                               name="formato-movil" 
                               value="${formato}"
                               ${estadoFiltros.formatos && estadoFiltros.formatos.includes(formato) ? 'checked' : ''}
                               onchange="actualizarFiltroDesdeMovil('formatos', '${formato}', this.checked)">
                        <span>${formato.toUpperCase()}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
    
    filtrosModalContent.innerHTML = html;
}

function actualizarFiltroDesdeMovil(tipo, valor, checked) {
    actualizarFiltroDesdeFijo(tipo, valor, checked);
    actualizarBadgeFiltro();
}

function actualizarBadgeFiltro() {
    let totalFiltros = 0;
    
    if (estadoFiltros.categorias) totalFiltros += estadoFiltros.categorias.length;
    if (estadoFiltros.tipos) totalFiltros += estadoFiltros.tipos.length;
    if (estadoFiltros.formatos) totalFiltros += estadoFiltros.formatos.length;
    if (estadoFiltros.busqueda && estadoFiltros.busqueda.trim() !== '') totalFiltros += 1;
    
    filterBadge.textContent = totalFiltros;
    
    // Mostrar/ocultar badge
    if (totalFiltros > 0) {
        filterBadge.style.display = 'flex';
    } else {
        filterBadge.style.display = 'none';
    }
}

function aplicarFiltrosDesdeModal() {
    aplicarFiltros();
    cerrarFiltrosModal();
}

function limpiarFiltrosDesdeModal() {
    reiniciarFiltros();
    sincronizarFiltrosMoviles();
    cerrarFiltrosModal();
}

// ===== FUNCIONES DE MODALES =====
function closePasswordModal() {
    passwordModal.classList.remove('activo');
    passwordModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function showPasswordModal() {
    passwordModal.classList.add('activo');
    passwordModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
}

function closePreviewModal() {
    console.log('🔒 Cerrando vista previa...');
    
    // 1. Detener cualquier carga en curso
    cancelarCargaImagen();
    
    // 2. Limpiar eventos de los elementos multimedia
    if (previewImage) {
        previewImage.onload = null;
        previewImage.onerror = null;
    }
    
    if (previewVideo) {
        previewVideo.onerror = null;
    }
    
    // 3. Limpiar recursos multimedia
    // Para video: pausar y limpiar src
    if (previewVideo) {
        previewVideo.pause();
        previewVideo.currentTime = 0;
        previewVideo.src = '';
        
        // Limpiar contenido HTML si hay iframe
        if (previewVideo.innerHTML) {
            previewVideo.innerHTML = '';
        }
    }
    
    // 4. Limpiar imagen
    if (previewImage && previewImage.src) {
        previewImage.src = '';
        previewImage.alt = '';
    }
    
    // 5. Limpiar contenido del documento
    if (previewDocument && previewDocument.innerHTML) {
        previewDocument.innerHTML = '';
    }
    
    // 6. Limpiar mensajes informativos y de error
    const container = document.querySelector('.preview-container');
    if (container) {
        // Eliminar todos los mensajes
        const messages = container.querySelectorAll('.drive-message, .info-message, .warning-message, .error-message');
        messages.forEach(msg => {
            if (msg.parentNode === container) {
                msg.remove();
            }
        });
    }
    
    // 7. Limpiar información del modal - SIN TAMAÑO NI DESCARGAS
    if (previewNombre) previewNombre.textContent = '';
    if (previewDescripcion) previewDescripcion.textContent = '';
    if (previewCategoria) previewCategoria.textContent = '';
    if (previewTipo) previewTipo.textContent = '';
    if (previewFormato) previewFormato.textContent = '';
    // ELIMINADO: Limpieza de previewTamano
    // ELIMINADO: Limpieza de previewDescargas
    
    // 8. Restaurar título original del modal
    if (previewModalTitle) {
        previewModalTitle.innerHTML = `
            <i class="fas fa-eye"></i>
            Vista Previa
        `;
    }
    
    // 9. Ocultar todos los elementos multimedia
    if (previewImage) previewImage.classList.add('hidden');
    if (previewVideo) previewVideo.classList.add('hidden');
    if (previewDocument) previewDocument.classList.add('hidden');
    
    // 10. Ocultar el modal
    previewModal.classList.remove('activo');
    previewModal.setAttribute('aria-hidden', 'true');
    
    // 11. Restaurar scroll del body
    document.body.style.overflow = '';
    
    // 12. Limpiar recurso actual después de un breve retraso
    // (para evitar problemas con eventos asíncronos pendientes)
    setTimeout(() => {
        recursoActual = null;
        
        // Opcional: Limpiar cualquier referencia en cache
        if (window.previewImageBlobUrl) {
            URL.revokeObjectURL(window.previewImageBlobUrl);
            delete window.previewImageBlobUrl;
        }
        
        if (window.previewVideoBlobUrl) {
            URL.revokeObjectURL(window.previewVideoBlobUrl);
            delete window.previewVideoBlobUrl;
        }
    }, 100);
    
    console.log('✅ Vista previa cerrada correctamente (sin tamaño ni descargas)');
}

// Función auxiliar para cancelar carga de imagen
function cancelarCargaImagen() {
    // Limpiar src de la imagen para detener la carga
    if (previewImage && previewImage.src) {
        // Si es una blob URL, liberarla
        if (previewImage.src.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage.src);
        }
        previewImage.src = '';
        previewImage.onload = null;
        previewImage.onerror = null;
    }
    
    // Pausar video si está reproduciendo
    if (previewVideo && !previewVideo.paused) {
        previewVideo.pause();
        previewVideo.currentTime = 0;
        previewVideo.onerror = null;
    }
}

// ===== FUNCIONES DE TEMA =====
function initTheme() {
    const savedTheme = localStorage.getItem('marketing_theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Actualizar icono del botón
    if (isDarkMode) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        localStorage.setItem('marketing_theme', 'dark');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        localStorage.setItem('marketing_theme', 'light');
    }
    
    // Nota: Los logos se cambian automáticamente con CSS
    // gracias a las clases .dark-mode en el body
}

function togglePasswordVisibility(input, button) {
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    button.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

// ===== FUNCIONES DE AUTENTICACIÓN =====
async function checkSession() {
    try {
        const userSession = localStorage.getItem('marketing_user_session');
        if (userSession) {
            const sessionData = JSON.parse(userSession);
            const sessionTime = new Date(sessionData.timestamp);
            const now = new Date();
            const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                const { data: userData, error } = await supabaseClient
                    .from('usuario')
                    .select('*')
                    .eq('correo', sessionData.email)
                    .single();
                    
                if (userData && !error) {
                    currentUser = userData;
                    showApp();
                    cargarDatosIniciales();
                }
            } else {
                localStorage.removeItem('marketing_user_session');
            }
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
    }
}

async function verifyEmail() {
    const email = emailInput.value.trim();
    currentEmail = email;
    
    if (!email) {
        showLoginMessage('Por favor ingresa tu correo electrónico.', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showLoginMessage('Por favor ingresa un correo electrónico válido.', 'error');
        return;
    }
    
    showLoginLoading(true);
    
    try {
        const { data: userData, error: userError } = await supabaseClient
            .from('usuario')
            .select('*')
            .eq('correo', email)
            .single();
        
        if (userError || !userData) {
            showLoginMessage('El correo no está registrado en el sistema.', 'error');
            showLoginLoading(false);
            return;
        }
        
        if (!userData.activo) {
            showLoginMessage('Tu cuenta está desactivada. Contacta al administrador.', 'error');
            showLoginLoading(false);
            return;
        }
        
        showLoginLoading(false);
        
        if (!userData.contrasena_hash) {
            userHasPassword = false;
            showPasswordModal();
        } else {
            userHasPassword = true;
            emailStep.classList.add('hidden');
            passwordStep.classList.remove('hidden');
            passwordInput.focus();
            clearLoginMessage();
        }
        
    } catch (error) {
        console.error('Error verificando correo:', error);
        showLoginMessage('Error al verificar el correo. Intenta nuevamente.', 'error');
        showLoginLoading(false);
    }
}

async function loginWithPassword() {
    const password = passwordInput.value;
    
    if (!password) {
        showLoginMessage('Por favor ingresa tu contraseña.', 'error');
        return;
    }
    
    showLoginLoading(true);
    
    try {
        const { data: userData, error: userError } = await supabaseClient
            .from('usuario')
            .select('*')
            .eq('correo', currentEmail)
            .single();
        
        if (userError || !userData) {
            showLoginMessage('Error al verificar las credenciales.', 'error');
            showLoginLoading(false);
            return;
        }
        
        const inputHash = await hashPassword(password);
        
        if (inputHash === userData.contrasena_hash) {
            await supabaseClient
                .from('usuario')
                .update({ 
                    intentos_fallidos: 0,
                    bloqueado_hasta: null,
                    fecha_actualizacion: new Date().toISOString()
                })
                .eq('correo', currentEmail);
            
            localStorage.setItem('marketing_user_session', JSON.stringify({
                email: currentEmail,
                timestamp: new Date().toISOString()
            }));
            
            currentUser = userData;
            showApp();
            cargarDatosIniciales();
            showLoginLoading(false);
            
        } else {
            showLoginMessage('Contraseña incorrecta. Intenta nuevamente.', 'error');
            showLoginLoading(false);
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showLoginMessage('Error al iniciar sesión. Intenta nuevamente.', 'error');
        showLoginLoading(false);
    }
}

async function createPassword() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!newPassword || !confirmPassword) {
        showLoginMessage('Por favor completa todos los campos.', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showLoginMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showLoginMessage('Las contraseñas no coinciden.', 'error');
        return;
    }
    
    showLoginLoading(true);
    
    try {
        const passwordHash = await hashPassword(newPassword);
        
        const { error } = await supabaseClient
            .from('usuario')
            .update({ 
                contrasena_hash: passwordHash,
                intentos_fallidos: 0,
                bloqueado_hasta: null,
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('correo', currentEmail);
        
        if (error) throw error;
        
        showLoginLoading(false);
        closePasswordModal();
        
        showLoginMessage('¡Contraseña creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        
        emailStep.classList.add('hidden');
        passwordStep.classList.remove('hidden');
        passwordInput.focus();
        
    } catch (error) {
        console.error('Error creando contraseña:', error);
        showLoginMessage('Error al crear la contraseña. Intenta nuevamente.', 'error');
        showLoginLoading(false);
    }
}

// Nueva función para verificar fortaleza de contraseña
function checkPasswordStrength(password) {
    if (!password) return 0;
    
    let score = 0;
    
    // Longitud mínima
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Caracteres diversos
    if (/[A-Z]/.test(password)) score += 1; // Mayúsculas
    if (/[a-z]/.test(password)) score += 1; // Minúsculas
    if (/[0-9]/.test(password)) score += 1; // Números
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Símbolos
    
    return Math.min(score, 4); // Máximo 4 niveles
}

// Función para actualizar indicador visual de fortaleza
function updatePasswordStrength() {
    const password = newPasswordInput.value;
    const strength = checkPasswordStrength(password);
    const strengthIndicator = document.getElementById('password-strength-indicator');
    const strengthText = document.getElementById('strength-text');
    
    // Remover clases anteriores
    strengthIndicator.className = 'password-strength';
    
    if (password.length === 0) {
        strengthIndicator.classList.add('hidden');
        return;
    }
    
    strengthIndicator.classList.remove('hidden');
    
    // Asignar clase según fortaleza
    if (strength === 0) {
        strengthIndicator.classList.add('weak');
        strengthText.textContent = 'Muy débil';
    } else if (strength === 1) {
        strengthIndicator.classList.add('weak');
        strengthText.textContent = 'Débil';
    } else if (strength === 2) {
        strengthIndicator.classList.add('medium');
        strengthText.textContent = 'Moderada';
    } else if (strength === 3) {
        strengthIndicator.classList.add('strong');
        strengthText.textContent = 'Fuerte';
    } else {
        strengthIndicator.classList.add('very-strong');
        strengthText.textContent = 'Muy fuerte';
    }
}

// Función para verificar si las contraseñas coinciden
function checkPasswordMatch() {
    const password = newPasswordInput.value;
    const confirm = confirmPasswordInput.value;
    const matchIndicator = document.getElementById('password-match');
    const mismatchIndicator = document.getElementById('password-mismatch');
    const saveBtn = document.getElementById('savePasswordBtn');
    
    if (password.length === 0 || confirm.length === 0) {
        matchIndicator.classList.add('hidden');
        mismatchIndicator.classList.add('hidden');
        saveBtn.disabled = true;
        return;
    }
    
    if (password === confirm && password.length >= 6) {
        matchIndicator.classList.remove('hidden');
        mismatchIndicator.classList.add('hidden');
        saveBtn.disabled = false;
    } else {
        matchIndicator.classList.add('hidden');
        mismatchIndicator.classList.remove('hidden');
        saveBtn.disabled = true;
    }
}

async function logout() {
    localStorage.removeItem('marketing_user_session');
    currentUser = null;
    showLogin();
}

// ===== FUNCIONES DE LA INTERFAZ =====
function showLogin() {
    loginScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
    
    emailInput.value = '';
    passwordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    emailStep.classList.remove('hidden');
    passwordStep.classList.add('hidden');
    closePasswordModal();
    clearLoginMessage();
    currentEmail = '';
}

function showApp() {
    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    updateUserInfo();
}

function updateUserInfo() {
    if (currentUser) {
        const initials = `${currentUser.nombre?.charAt() || ''}`;
        userAvatar.textContent = initials.toUpperCase() || 'U';
        
        userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
        userRole.textContent = currentUser.rol === 'administrador' ? 'Administrador' : 'Colaborador';
        
        // Mostrar/ocultar botones según rol
        if (currentUser.rol === 'administrador') {
            refreshBtn.style.display = 'flex';
        } else {
            refreshBtn.style.display = 'none';
        }
    }
}

function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove('hidden');
    
    setTimeout(() => {
        loginMessage.classList.add('hidden');
    }, 5000);
}

function clearLoginMessage() {
    loginMessage.classList.add('hidden');
}

function showLoginLoading(show) {
    if (show) {
        loginLoading.classList.remove('hidden');
    } else {
        loginLoading.classList.add('hidden');
    }
}

function showSystemMessage(message, type) {
    systemMessage.textContent = message;
    systemMessage.className = `message ${type}`;
    systemMessage.classList.remove('hidden');
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-message';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => systemMessage.classList.add('hidden');
    
    systemMessage.innerHTML = '';
    systemMessage.appendChild(document.createTextNode(message));
    systemMessage.appendChild(closeBtn);
    
    setTimeout(() => {
        systemMessage.classList.add('hidden');
    }, 5000);
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Verificar sesión
    checkSession();
    
    // Inicializar tema
    initTheme();
    
    // Eventos de login
    verifyEmailBtn.addEventListener('click', verifyEmail);
    loginBtn.addEventListener('click', loginWithPassword);
    backToEmailBtn.addEventListener('click', () => {
        passwordStep.classList.add('hidden');
        emailStep.classList.remove('hidden');
        clearLoginMessage();
    });
    
    // Toggle visibilidad de contraseña
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, passwordInput, togglePasswordBtn));
    
    // Header actions
    themeToggle.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', logout);
    refreshBtn.addEventListener('click', async () => {
    try {
        mostrarLoadingGlobal('Actualizando recursos...');
        await cargarRecursosDesdeSupabase();
        ocultarLoadingGlobal();
        mostrarToast('Recursos actualizados correctamente');
    } catch (error) {
        ocultarLoadingGlobal();
        showSystemMessage('Error al actualizar recursos', 'error');
    }
});
    
    // Búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keydown', handleSearchKeydown);
    }
    
    // Filtros
    document.querySelectorAll('.btn-filtro-grupo').forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.stopPropagation();
            const target = this.getAttribute('data-target');
            mostrarOpcionesFiltro(target, this);
        });
    });
    
    document.addEventListener('click', function(e) {
        if (filtrosOpciones && filtrosOpciones.classList.contains('visible')) {
            if (!filtrosFijos.contains(e.target)) {
                cerrarOpcionesFiltro();
            }
        }
    });
    
    btnLimpiarFiltros.addEventListener('click', reiniciarFiltros);
    
    // Vista previa modal
    closePreviewModalBtn.addEventListener('click', closePreviewModal);
    closePreviewBtn.addEventListener('click', closePreviewModal);
    
    // Cerrar modal al hacer clic fuera
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closePreviewModal();
    });

    
    // Modal contraseña
    closePasswordModalBtn.addEventListener('click', closePasswordModal);
    cancelPasswordBtn.addEventListener('click', closePasswordModal);
    savePasswordBtn.addEventListener('click', createPassword);
    
    // Cerrar modales al hacer clic fuera
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) closePasswordModal();
    });
    
    // Enter key para formularios
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyEmail();
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginWithPassword();
    });
    
    // Eventos para filtros móvil
    if (filtrosMovilBtn) {
        filtrosMovilBtn.addEventListener('click', abrirFiltrosModal);
    }

    if (closeFiltrosModalBtn) {
        closeFiltrosModalBtn.addEventListener('click', cerrarFiltrosModal);
    }

    if (aplicarFiltrosModalBtn) {
        aplicarFiltrosModalBtn.addEventListener('click', aplicarFiltrosDesdeModal);
    }

    if (limpiarFiltrosModalBtn) {
        limpiarFiltrosModalBtn.addEventListener('click', limpiarFiltrosDesdeModal);
    }

    // Cerrar modal al hacer clic fuera
    if (filtrosModal) {
        filtrosModal.addEventListener('click', (e) => {
            if (e.target === filtrosModal) cerrarFiltrosModal();
        });
    }

    // Actualizar badge inicialmente
    actualizarBadgeFiltro();

    // Agregar eventos para vistas
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'verTodosBtn') {
            e.preventDefault();
            console.log('Botón Grid clickeado');
            cambiarVista('grid');
        }
        
        if (e.target && e.target.id === 'verListaBtn') {
            e.preventDefault();
            console.log('Botón Lista clickeado');
            cambiarVista('lista');
        }
    });
    
    // Eventos para validación de contraseña en tiempo real
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            updatePasswordStrength();
            checkPasswordMatch();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // Eventos para nuevos botones
    if (toggleNewPasswordBtn) {
        toggleNewPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, newPasswordInput, toggleNewPasswordBtn));
    }
    
    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, confirmPasswordInput, toggleConfirmPasswordBtn));
    }
    
    console.log('Sistema de Marketing inicializado');
});

// ===== INICIALIZACIÓN DE VISTAS =====
function inicializarVistas() {
    const vistaGuardada = localStorage.getItem('marketing_vista') || 'grid';
    cambiarVista(vistaGuardada);
}

// ===== FUNCIONES PARA CARGAR DATOS =====
async function cargarDatosIniciales() {
    try {
        mostrarLoadingGlobal('Cargando sistema...');
        
        // Cargar categorías desde Supabase
        await cargarCategorias();
        
        // Cargar recursos desde Supabase
        await cargarRecursosDesdeSupabase();
        
        // Inicializar vistas
        inicializarVistas();
        
        // Ocultar loading
        setTimeout(() => {
            ocultarLoadingGlobal();
            mostrarToast('Sistema cargado correctamente');
        }, 500);
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        ocultarLoadingGlobal();
        showSystemMessage(`Error al cargar los datos: ${error.message}`, 'error');
    }
}

async function cargarRecursosDesdeSupabase() {
    try {
        console.log('Cargando recursos desde Supabase...');
        
        mostrarSkeletonLoading();
        
        const { data: recursosData, error } = await supabaseClient
            .from('recursos_multimedia')
            .select(`
                id,
                nombre,
                descripcion,
                categoria_id,
                tipo,
                formato,
                url,
                etiquetas,
                activo,
                fecha_creacion,
                fecha_actualizacion,
                categorias_recursos: categoria_id (
                    id,
                    nombre,
                    color,
                    icono,
                    descripcion
                )
            `)
            .eq('activo', true)
            .order('fecha_creacion', { ascending: false });
        
        if (error) throw error;
        
        recursos = recursosData.map(recurso => ({
            id: recurso.id,
            nombre: recurso.nombre,
            descripcion: recurso.descripcion || '',
            categoria_id: recurso.categoria_id,
            categoria: recurso.categorias_recursos || {
                id: recurso.categoria_id,
                nombre: 'Sin categoría',
                color: '#868e96',
                icono: 'fas fa-folder'
            },
            tipo: recurso.tipo || 'otro',
            formato: recurso.formato || '',
            url: recurso.url,
            etiquetas: procesarEtiquetas(recurso.etiquetas),
            activo: recurso.activo,
            fecha_creacion: recurso.fecha_creacion,
            fecha_actualizacion: recurso.fecha_actualizacion
        }));
        
        recursosFiltrados = [...recursos];
        actualizarEstadisticas();
        ocultarSkeletonLoading();
        renderizarRecursos();
        
    } catch (error) {
        console.error('Error cargando recursos:', error);
        ocultarSkeletonLoading();
        showSystemMessage('Error al cargar recursos', 'error');
    }
}

// Función auxiliar para procesar etiquetas
function procesarEtiquetas(etiquetas) {
    if (!etiquetas) return [];
    if (Array.isArray(etiquetas)) return etiquetas;
    if (typeof etiquetas === 'string') {
        return etiquetas.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    return [];
}

async function cargarCategorias() {
    try {
        const { data, error } = await supabaseClient
            .from('categorias_recursos')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        if (error) {
            console.error('Error cargando categorías:', error);
            // Usar categorías por defecto si hay error
            categorias = [
                { id: 1, nombre: 'Redes Sociales', descripcion: 'Imágenes optimizadas para redes sociales', icono: 'fas fa-hashtag', color: '#6b0000' },
                { id: 2, nombre: 'Publicidad', descripcion: 'Material para campañas publicitarias', icono: 'fas fa-ad', color: '#584038' },
                { id: 3, nombre: 'Presentaciones', descripcion: 'Diapositivas y presentaciones corporativas', icono: 'fas fa-chart-line', color: '#339af0' },
                { id: 4, nombre: 'Branding', descripcion: 'Identidad visual y marca', icono: 'fas fa-palette', color: '#40c057' }
            ];
        } else {
            categorias = data || [];
            console.log(`Categorías cargadas desde Supabase: ${categorias.length}`);
        }
        
    } catch (error) {
        console.error('Error crítico cargando categorías:', error);
        categorias = [
            { id: 1, nombre: 'Redes Sociales', descripcion: 'Imágenes optimizadas para redes sociales', icono: 'fas fa-hashtag', color: '#6b0000' },
            { id: 2, nombre: 'Publicidad', descripcion: 'Material para campañas publicitarias', icono: 'fas fa-ad', color: '#584038' },
            { id: 3, nombre: 'Presentaciones', descripcion: 'Diapositivas y presentaciones corporativas', icono: 'fas fa-chart-line', color: '#339af0' },
            { id: 4, nombre: 'Branding', descripcion: 'Identidad visual y marca', icono: 'fas fa-palette', color: '#40c057' }
        ];
    }
}

async function cargarRecursosDesdeJSON() {
    try {
        console.log('Cargando recursos desde JSON...');
        
        // Mostrar skeleton loading
        mostrarSkeletonLoading();
        
        // Cargar el archivo JSON
        const response = await fetch('JSON/recursosMultimedia.json');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validar estructura del JSON
        if (!data.recursos || !Array.isArray(data.recursos)) {
            throw new Error('Formato de JSON inválido');
        }
        
        recursos = data.recursos;
        
        console.log('Recursos cargados:', recursos);
        
        // Combinar recursos con categorías de Supabase
        recursos = recursos.map(recurso => {
            const categoria = categorias.find(c => c.id === recurso.categoria_id);
            return {
                ...recurso,
                categoria: categoria || { 
                    id: recurso.categoria_id || 0, 
                    nombre: 'Sin categoría', 
                    color: '#868e96',
                    icono: 'fas fa-folder'
                }
            };
        });
        
        recursosFiltrados = [...recursos];
        
        console.log(`Recursos procesados: ${recursos.length}`);
        console.log('Primer recurso:', recursos[0]);
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
        // Ocultar skeleton y mostrar datos
        setTimeout(() => {
            ocultarSkeletonLoading();
            renderizarRecursos();
            mostrarToast(`${recursos.length} recursos cargados`);
        }, 300);
        
    } catch (error) {
        console.error('Error cargando recursos:', error);
        ocultarSkeletonLoading();
        
        let mensajeError = 'Error al cargar los recursos multimedia';
        if (error.message.includes('Failed to fetch')) {
            mensajeError = 'No se pudo cargar el archivo de recursos. Verifica que el archivo JSON exista.';
        }
        
        showSystemMessage(mensajeError, 'error');
        
        // Mostrar estado de error
        recursosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">Error al cargar recursos</h3>
                <p style="color: var(--gray-dark); margin-bottom: 15px;">${mensajeError}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="cargarRecursosDesdeJSON()">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            </div>
        `;
    }
}

function renderizarRecursos() {
    console.log('🔍 === INICIANDO RENDERIZAR RECURSOS ===');
    
    // Verificar elementos críticos
    const gridElement = document.getElementById('recursosGrid');
    const listElement = document.getElementById('recursosLista');
    
    if (!gridElement) {
        console.error('❌ ERROR CRÍTICO: recursosGrid no existe en el DOM');
        return;
    }
    
    // Calcular recursos para la página actual
    const inicio = (paginaActual - 1) * recursosPorPagina;
    const fin = paginaActual * recursosPorPagina;
    const recursosPaginados = recursosFiltrados.slice(inicio, fin);
    
    // Limpiar ambos contenedores
    gridElement.innerHTML = '';
    
    if (listElement && listaRecursosBody) {
        listaRecursosBody.innerHTML = '';
    }
    
    // Verificar si hay recursos
    if (recursosFiltrados.length === 0) {
        console.log('📭 No hay recursos para mostrar');
        gridElement.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">No se encontraron recursos</h3>
                <p style="color: var(--gray-dark);">Intenta con otros filtros o términos de búsqueda</p>
                <button class="btn btn-primary" onclick="reiniciarFiltros()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Ver todos los recursos
                </button>
            </div>
        `;
        
        // Ocultar lista si está visible
        if (listElement && !listElement.classList.contains('hidden')) {
            listElement.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Recurso</th>
                            <th>Categoría</th>
                            <th>Tipo</th>
                            <th>Tamaño</th>
                            <th>Descargas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                No se encontraron recursos
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
        }
        
        actualizarContadorRecursos();
        renderizarPaginacion();
        return;
    }
    
    console.log('🎨 Creando tarjetas para', recursosPaginados.length, 'recursos en página', paginaActual);
    
    // Crear fragmentos para mejor performance
    const fragmentGrid = document.createDocumentFragment();
    let tarjetasCreadas = 0;
    
    // Crear tarjetas para grid view
    recursosPaginados.forEach((recurso, index) => {
        try {
            const tarjeta = crearTarjetaRecurso(recurso);
            if (tarjeta) {
                // Configurar eventos para imágenes después de que la tarjeta esté en el DOM
                setTimeout(() => {
                    const imgElement = tarjeta.querySelector('.recurso-image');
                    if (imgElement) {
                        configurarCargaImagenCard(imgElement);
                        
                        // Pre-cargar imagen para mejor UX
                        if (recurso.tipo === 'imagen') {
                            preloadImage(imgElement.src);
                        }
                    }
                }, 0);
                
                // Añadir animación de fade-in
                tarjeta.style.opacity = '0';
                tarjeta.style.transform = 'translateY(20px)';
                tarjeta.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                tarjeta.style.animationDelay = `${index * 50}ms`;
                
                // Agregar atributos de accesibilidad
                tarjeta.setAttribute('role', 'listitem');
                tarjeta.setAttribute('tabindex', '0');
                tarjeta.setAttribute('aria-posinset', index + 1);
                tarjeta.setAttribute('aria-setsize', recursosPaginados.length);
                
                fragmentGrid.appendChild(tarjeta);
                tarjetasCreadas++;
                
                // Animar después de añadir (con retraso escalonado)
                setTimeout(() => {
                    if (tarjeta.parentNode) { // Verificar que aún está en el DOM
                        tarjeta.style.opacity = '1';
                        tarjeta.style.transform = 'translateY(0)';
                        tarjeta.classList.add('fade-in');
                    }
                }, index * 50);
            }
        } catch (error) {
            console.error(`❌ Error procesando recurso ${index}:`, error);
            
            // Crear tarjeta de error como fallback
            const tarjetaError = document.createElement('article');
            tarjetaError.className = 'recurso-card error-card';
            tarjetaError.innerHTML = `
                <div class="recurso-badge error" aria-label="Error">
                    <i class="fas fa-exclamation-triangle"></i> Error
                </div>
                <div class="recurso-image-container">
                    <img src="https://via.placeholder.com/300x200/868e96/FFFFFF?text=Error" 
                         alt="Error al cargar recurso" 
                         class="recurso-image">
                </div>
                <div class="recurso-info">
                    <h3 class="recurso-title">Error al cargar recurso</h3>
                    <p class="recurso-descripcion">No se pudo cargar la información de este recurso.</p>
                    <div class="recurso-actions">
                        <button class="recurso-btn preview" disabled aria-label="Vista previa no disponible">
                            <i class="fas fa-eye-slash"></i> No disponible
                        </button>
                    </div>
                </div>
            `;
            
            tarjetaError.style.opacity = '0';
            tarjetaError.style.transform = 'translateY(20px)';
            tarjetaError.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            fragmentGrid.appendChild(tarjetaError);
            tarjetasCreadas++;
            
            setTimeout(() => {
                if (tarjetaError.parentNode) {
                    tarjetaError.style.opacity = '1';
                    tarjetaError.style.transform = 'translateY(0)';
                }
            }, index * 50);
        }
    });
    
    console.log(`✅ Tarjetas creadas: ${tarjetasCreadas}`);
    
    // Añadir fragmento al grid
    gridElement.appendChild(fragmentGrid);
    
    // Configurar eventos de teclado para accesibilidad
    configurarAccesibilidadTarjetas();
    
    // Actualizar vista de lista con los mismos recursos paginados
    actualizarVistaLista(recursosPaginados);
    
    // Actualizar contadores
    actualizarContadorRecursos();
    renderizarPaginacion();
    
    // Verificar y marcar imágenes cargadas después de un tiempo
    setTimeout(() => {
        verificarImagenesCargadas();
    }, 1000);
    
    console.log('🏁 === RENDERIZACIÓN COMPLETADA ===');
    console.log('📊 Tarjetas en grid:', gridElement.children.length);
}

// Función para configurar la carga de imágenes en tarjetas
function configurarCargaImagenCard(imgElement) {
    const container = imgElement.parentNode;
    const loadingElement = container.querySelector('.image-loading');
    
    // Ocultar loading si la imagen ya está cargada
    if (imgElement.complete && imgElement.naturalHeight !== 0) {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        imgElement.classList.add('loaded');
        return;
    }
    
    // Mostrar loading
    if (loadingElement) {
        loadingElement.style.display = 'flex';
        container.classList.add('loading');
    }
    
    // Configurar eventos de carga
    imgElement.onload = function() {
        console.log(`✅ Imagen cargada: ${this.src.substring(0, 50)}...`);
        
        // Ocultar loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
            container.classList.remove('loading');
        }
        
        // Agregar clase loaded para animación
        this.classList.add('loaded');
        
        // Remover icono de Drive si existe
        const driveIcon = container.querySelector('.drive-icon-overlay');
        if (driveIcon) {
            driveIcon.style.opacity = '0';
            setTimeout(() => driveIcon.remove(), 300);
        }
    };
    
    imgElement.onerror = function() {
        console.warn(`❌ Error cargando imagen: ${this.src.substring(0, 50)}...`);
        
        // Ocultar loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
            container.classList.remove('loading');
        }
        
        // Llamar a la función de manejo de errores
        manejarErrorImagenCard(this);
    };
    
    // Timeout de seguridad para imágenes que no cargan
    setTimeout(() => {
        if (!imgElement.complete && loadingElement && loadingElement.style.display !== 'none') {
            console.log(`⏱️ Timeout de carga para: ${imgElement.src.substring(0, 50)}...`);
            loadingElement.style.display = 'none';
            container.classList.remove('loading');
            
            if (imgElement.naturalHeight === 0) {
                manejarErrorImagenCard(imgElement);
            }
        }
    }, 10000); // 10 segundos timeout
}

// Función para pre-cargar imágenes
function preloadImage(url) {
    if (!url || url.includes('placeholder')) return;
    
    const img = new Image();
    img.src = url;
    
    img.onload = function() {
        console.log(`📥 Imagen pre-cargada: ${url.substring(0, 50)}...`);
    };
    
    img.onerror = function() {
        console.warn(`❌ Error pre-cargando: ${url.substring(0, 50)}...`);
    };
}

// Función para verificar imágenes cargadas
function verificarImagenesCargadas() {
    const imagenes = document.querySelectorAll('.recurso-image:not(.loaded)');
    console.log(`🔍 Verificando ${imagenes.length} imágenes pendientes...`);
    
    imagenes.forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
            img.classList.add('loaded');
            const container = img.parentNode;
            const loadingElement = container.querySelector('.image-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
                container.classList.remove('loading');
            }
        }
    });
}

// Función para configurar accesibilidad de tarjetas
function configurarAccesibilidadTarjetas() {
    const tarjetas = document.querySelectorAll('.recurso-card');
    
    tarjetas.forEach((tarjeta, index) => {
        // Evento de teclado para Enter/Space
        tarjeta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const previewBtn = tarjeta.querySelector('.recurso-btn.preview');
                if (previewBtn) {
                    previewBtn.click();
                }
            }
        });
        
        // Mejorar navegación por teclado
        tarjeta.addEventListener('focus', () => {
            tarjeta.style.outline = '3px solid var(--primary-color)';
            tarjeta.style.outlineOffset = '2px';
        });
        
        tarjeta.addEventListener('blur', () => {
            tarjeta.style.outline = 'none';
        });
    });
}

function actualizarVistaLista(recursosPaginados) {
    const listaRecursosBody = document.getElementById('listaRecursosBody');
    const listView = document.getElementById('recursosLista');
    
    if (!listaRecursosBody || !listView) {
        console.warn('⚠️ Elementos de vista de lista no encontrados');
        return;
    }
    
    // Verificar si la vista de lista está visible
    if (listView.classList.contains('hidden')) {
        console.log('Vista de lista oculta, no actualizando');
        return;
    }
    
    // Mostrar estado de carga temporal
    listaRecursosBody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align: center; padding: 20px;">
                <div class="loading" style="margin: 0 auto;"></div>
                <p style="color: var(--text-light); margin-top: 10px;">Cargando recursos...</p>
            </td>
        </tr>
    `;
    
    // Usar requestAnimationFrame para mejor rendimiento
    requestAnimationFrame(() => {
        let html = '';
        
        if (recursosPaginados.length === 0) {
            html = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 60px 20px;">
                        <div style="max-width: 300px; margin: 0 auto;">
                            <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 20px; opacity: 0.5;"></i>
                            <h3 style="color: var(--text-light); margin-bottom: 10px; font-weight: 500;">No se encontraron recursos</h3>
                            <p style="color: var(--text-light); margin-bottom: 20px; font-size: 0.95rem;">
                                Intenta con otros filtros o términos de búsqueda
                            </p>
                            <button class="btn btn-primary" onclick="reiniciarFiltros()" style="margin-top: 10px;">
                                <i class="fas fa-redo"></i> Ver todos los recursos
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            console.log('📋 Renderizando vista lista con', recursosPaginados.length, 'recursos');
            
            // Usar DocumentFragment para mejor rendimiento
            const tableRows = recursosPaginados.map((recurso, index) => {
                return crearFilaListaRecurso(recurso, index);
            });
            
            html = tableRows.join('');
        }
        
        // Actualizar el DOM una sola vez
        listaRecursosBody.innerHTML = html;
        
        console.log(`✅ Vista de lista actualizada: ${recursosPaginados.length} recursos (3 columnas)`);
        
        // Configurar eventos después de renderizar
        if (recursosPaginados.length > 0) {
            setTimeout(configurarEventosLista, 50);
        }
    });
}

// Función auxiliar para crear una fila de recurso
function crearFilaListaRecurso(recurso, index) {
    // Determinar URL de miniatura optimizada
    let miniaturaURL = obtenerMiniaturaOptimizada(recurso.url, recurso.tipo);
    const isGoogleDrive = recurso.url.includes('drive.google.com');
    
    // Información del formato y tipo
    const formato = recurso.formato ? recurso.formato.toUpperCase() : 'N/A';
    const tipo = recurso.tipo ? recurso.tipo.charAt(0).toUpperCase() + recurso.tipo.slice(1) : 'Otro';
    const tipoColor = obtenerColorPorTipo(recurso.tipo);
    const tipoIcono = getTipoIcono(recurso.tipo);
    
    // Crear badges HTML
    const badgesHTML = crearBadgesHTML(recurso, tipoColor, formato, isGoogleDrive);
    
    // Escapar comillas simples para onclick
    const nombreEscapado = recurso.nombre.replace(/'/g, "\\'");
    const idEscapado = recurso.id.replace(/'/g, "\\'");
    
    return `
        <tr data-id="${recurso.id}" 
            data-index="${index}" 
            role="row" 
            aria-rowindex="${index + 1}" 
            class="recurso-lista-item ${index % 2 === 0 ? 'fila-par' : 'fila-impar'}"
            aria-label="${recurso.nombre} - ${recurso.categoria?.nombre || 'Sin categoría'}">
            <td role="cell" class="recurso-info-cell" style="vertical-align: middle;">
                <div class="recurso-item-lista" role="button" tabindex="0" 
                     onclick="abrirVistaPrevia('${idEscapado}')"
                     onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirVistaPrevia('${idEscapado}'); }"
                     aria-label="Abrir vista previa de ${nombreEscapado}">
                    <div class="recurso-miniatura-container">
                        <img src="${miniaturaURL}" 
                             alt="Miniatura de ${recurso.nombre}" 
                             class="recurso-miniatura-lista lazy"
                             loading="lazy"
                             data-src="${miniaturaURL}"
                             data-original-url="${recurso.url}"
                             width="60" height="60">
                        <div class="mini-loading" aria-hidden="true">
                            <div class="loading-spinner-mini"></div>
                        </div>
                        ${isGoogleDrive ? '<div class="mini-drive-badge"><i class="fab fa-google-drive"></i></div>' : ''}
                    </div>
                    <div class="recurso-info-lista">
                        <div class="recurso-header-lista">
                            <h4 class="recurso-titulo-lista" title="${recurso.nombre}">
                                ${recurso.nombre}
                            </h4>
                            <span class="recurso-fecha-lista" aria-label="Fecha de creación">
                                <i class="far fa-calendar"></i> 
                                ${formatearFecha(recurso.fecha_creacion)}
                            </span>
                        </div>
                        <p class="recurso-descripcion-lista" title="${recurso.descripcion || 'Sin descripción'}">
                            ${recurso.descripcion?.substring(0, 100) || 'Sin descripción'}${recurso.descripcion?.length > 100 ? '...' : ''}
                        </p>
                        <div class="recurso-badges-container">
                            ${badgesHTML}
                        </div>
                    </div>
                </div>
            </td>
            <td role="cell" class="recurso-tipo-cell" style="vertical-align: middle;">
                <div class="tipo-info-container">
                    <div class="tipo-icono-grande" style="color: ${tipoColor}">
                        <i class="${tipoIcono}"></i>
                    </div>
                    <div class="tipo-texto">
                        <span class="tipo-nombre" style="color: ${tipoColor}">${tipo}</span>
                        <span class="tipo-formato">${formato}</span>
                    </div>
                </div>
            </td>
            <td role="cell" class="recurso-acciones-cell" style="vertical-align: middle;">
                <div class="acciones-lista">
                    <button class="btn-icon btn-icon-primary" 
                            onclick="event.stopPropagation(); abrirVistaPrevia('${idEscapado}')" 
                            aria-label="Vista previa de ${nombreEscapado}"
                            title="Vista previa"
                            data-tooltip="Vista previa">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-icon-success" 
                            onclick="event.stopPropagation(); descargarRecursoDesdeCard('${idEscapado}')" 
                            aria-label="Descargar ${nombreEscapado}"
                            title="Descargar"
                            data-tooltip="Descargar">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon btn-icon-info" 
                            onclick="event.stopPropagation(); mostrarInfoRapida('${idEscapado}')" 
                            aria-label="Información de ${nombreEscapado}"
                            title="Más información"
                            data-tooltip="Información">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Función auxiliar para obtener miniatura optimizada
function obtenerMiniaturaOptimizada(url, tipo) {
    if (!url) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YxZjNmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM4NjhlOTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj48L3RleHQ+PC9zdmc+';
    
    const isGoogleDrive = url.includes('drive.google.com');
    
    if (isGoogleDrive) {
        const fileId = extraerFileIdDeGoogleDrive(url);
        if (fileId) {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w100`;
        }
    }
    
    // Para imágenes directas, usar URL original
    if (tipo === 'imagen') {
        return url;
    }
    
    // Placeholder según tipo
    const tipoPlaceholder = (tipo || 'otro').substring(0, 1).toUpperCase();
    const color = isGoogleDrive ? '6b0000' : '868e96';
    return `https://via.placeholder.com/60x60/${color}/FFFFFF?text=${tipoPlaceholder}`;
}

// Función auxiliar para crear badges HTML
function crearBadgesHTML(recurso, tipoColor, formato, isGoogleDrive) {
    const badges = [];
    
    // Badge de categoría
    badges.push(`
        <span class="badge badge-categoria" 
              style="--badge-color: ${recurso.categoria?.color || '#868e96'}"
              aria-label="Categoría: ${recurso.categoria?.nombre || 'Sin categoría'}">
            <i class="${recurso.categoria?.icono || 'fas fa-folder'}"></i> 
            <span class="badge-text">${recurso.categoria?.nombre || 'Sin categoría'}</span>
        </span>
    `);
    
    // Badge de tipo/formato
    badges.push(`
        <span class="badge badge-formato" 
              style="--badge-color: ${tipoColor}"
              aria-label="Formato: ${formato}">
            <i class="fas fa-file"></i> 
            <span class="badge-text">${formato}</span>
        </span>
    `);
    
    // Badge de Google Drive si corresponde
    if (isGoogleDrive) {
        badges.push(`
            <span class="badge badge-drive" aria-label="Almacenado en Google Drive">
                <i class="fab fa-google-drive"></i> 
                <span class="badge-text">Drive</span>
            </span>
        `);
    }
    
    // Badges de etiquetas (máximo 2)
    if (recurso.etiquetas && recurso.etiquetas.length > 0) {
        recurso.etiquetas.slice(0, 2).forEach(etiqueta => {
            badges.push(`
                <span class="badge badge-etiqueta" aria-label="Etiqueta: ${etiqueta}">
                    <i class="fas fa-tag"></i> 
                    <span class="badge-text">${etiqueta}</span>
                </span>
            `);
        });
        
        if (recurso.etiquetas.length > 2) {
            badges.push(`
                <span class="badge badge-mas" aria-label="${recurso.etiquetas.length - 2} etiquetas más">
                    +${recurso.etiquetas.length - 2}
                </span>
            `);
        }
    }
    
    return badges.join('');
}

// Función para obtener color por tipo
function obtenerColorPorTipo(tipo) {
    const tipoLower = (tipo || '').toLowerCase();
    switch(tipoLower) {
        case 'imagen': return 'var(--imagen-color)';
        case 'video': return 'var(--video-color)';
        case 'documento': return 'var(--documento-color)';
        case 'audio': return 'var(--audio-color)';
        default: return 'var(--otro-color)';
    }
}

// Función para formatear fecha
function formatearFecha(fechaString) {
    if (!fechaString) return 'N/A';
    
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-PE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'N/A';
    }
}

// Función para configurar eventos de la lista
function configurarEventosLista() {
    // Configurar Intersection Observer para lazy loading
    const lazyImages = document.querySelectorAll('.recurso-miniatura-lista.lazy');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    // Configurar eventos de hover y focus
    const filas = document.querySelectorAll('.recurso-lista-item');
    const tooltips = document.querySelectorAll('[data-tooltip]');
    
    filas.forEach(fila => {
        // Efecto hover suave
        fila.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        });
        
        fila.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
        
        // Focus styles para accesibilidad
        fila.addEventListener('focus', function() {
            this.style.outline = '2px solid var(--primary-color)';
            this.style.outlineOffset = '2px';
        });
        
        fila.addEventListener('blur', function() {
            this.style.outline = '';
        });
    });
    
    // Configurar tooltips
    tooltips.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            this.appendChild(tooltip);
        });
        
        btn.addEventListener('mouseleave', function() {
            const tooltip = this.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    });
    
    // Configurar eventos de error de imágenes
    const imagenesLista = document.querySelectorAll('.recurso-miniatura-lista');
    imagenesLista.forEach(img => {
        img.addEventListener('error', function() {
            const originalURL = this.getAttribute('data-original-url');
            const isGoogleDrive = originalURL && originalURL.includes('drive.google.com');
            const tipo = this.closest('.recurso-lista-item')?.querySelector('.tipo-nombre')?.textContent || 'R';
            const tipoLetra = tipo.substring(0, 1).toUpperCase();
            
            this.src = isGoogleDrive 
                ? 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#6b0000"/>
                        <text x="50%" y="50%" font-family="Arial" font-size="14" 
                              fill="white" text-anchor="middle" dy=".3em">Drive</text>
                    </svg>
                `)
                : `data:image/svg+xml;base64,` + btoa(`
                    <svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#868e96"/>
                        <text x="50%" y="50%" font-family="Arial" font-size="14" 
                              fill="white" text-anchor="middle" dy=".3em">${tipoLetra}</text>
                    </svg>
                `);
            
            // Ocultar loading
            const loading = this.parentNode.querySelector('.mini-loading');
            if (loading) loading.style.display = 'none';
        });
        
        img.addEventListener('load', function() {
            // Ocultar loading
            const loading = this.parentNode.querySelector('.mini-loading');
            if (loading) loading.style.display = 'none';
        });
    });
}

// Función auxiliar para mostrar información rápida (opcional)
function mostrarInfoRapida(recursoId) {
    const recurso = recursos.find(r => r.id === recursoId);
    if (!recurso) return;
    
    const modalHTML = `
        <div class="info-rapida-modal">
            <h3>${recurso.nombre}</h3>
            <div class="info-detallada">
                <p><strong>Descripción:</strong> ${recurso.descripcion || 'No disponible'}</p>
                <p><strong>Categoría:</strong> ${recurso.categoria?.nombre || 'Sin categoría'}</p>
                <p><strong>Tipo:</strong> ${recurso.tipo || 'N/A'}</p>
                <p><strong>Formato:</strong> ${recurso.formato?.toUpperCase() || 'N/A'}</p>
                <p><strong>Fecha creación:</strong> ${formatearFecha(recurso.fecha_creacion)}</p>
                ${recurso.etiquetas && recurso.etiquetas.length > 0 ? 
                    `<p><strong>Etiquetas:</strong> ${recurso.etiquetas.join(', ')}</p>` : ''}
            </div>
        </div>
    `;
    
    // Implementar modal de información rápida
    mostrarToast(`Información de: ${recurso.nombre}`, 'info');
}

// Función auxiliar para obtener icono según tipo
function getTipoIcono(tipo) {
    const tipoLower = (tipo || '').toLowerCase();
    
    const iconos = {
        'imagen': 'fas fa-image',
        'video': 'fas fa-video',
        'documento': 'fas fa-file-alt',
        'audio': 'fas fa-volume-up',
        'pdf': 'fas fa-file-pdf',
        'word': 'fas fa-file-word',
        'excel': 'fas fa-file-excel',
        'powerpoint': 'fas fa-file-powerpoint'
    };
    
    return iconos[tipoLower] || 'fas fa-file';
}

function crearTarjetaRecurso(recurso) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'recurso-card';
    tarjeta.setAttribute('data-id', recurso.id);
    tarjeta.setAttribute('aria-label', recurso.nombre);
    
    const tipoClase = recurso.tipo || 'otro';
    const tipoNombre = tipoClase.charAt(0).toUpperCase() + tipoClase.slice(1);
    
    // Determinar la URL de la imagen usando solo recurso.url
    let imagenURL = recurso.url;
    
    // Si es Google Drive, usar thumbnail para vista previa en tarjetas
    if (imagenURL.includes('drive.google.com')) {
        const fileId = extraerFileIdDeGoogleDrive(imagenURL);
        if (fileId) {
            // Usar thumbnail pequeño para las tarjetas (300px)
            imagenURL = `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
        }
    }
    
    // Crear HTML de etiquetas si existen
    let etiquetasHTML = '';
    if (recurso.etiquetas && recurso.etiquetas.length > 0) {
        etiquetasHTML = `
            <div class="etiquetas-container">
                ${recurso.etiquetas.slice(0, 3).map(etiqueta => `
                    <span class="etiqueta">${etiqueta}</span>
                `).join('')}
                ${recurso.etiquetas.length > 3 ? `<span class="etiqueta">+${recurso.etiquetas.length - 3}</span>` : ''}
            </div>
        `;
    }
    
    // Determinar si es Google Drive para mostrar badge
    const isGoogleDrive = recurso.url.includes('drive.google.com');
    const driveBadgeHTML = isGoogleDrive ? `
        <div class="recurso-badge drive-badge" aria-label="Almacenado en Google Drive">
            <i class="fab fa-google-drive"></i> Drive
        </div>
    ` : '';
    
    // Obtener icono del tipo de recurso
    const tipoIcono = tiposRecursos.find(t => t.id === tipoClase)?.icono || 'fas fa-file';
    
    tarjeta.innerHTML = `
        <div class="recurso-badge ${tipoClase}" aria-label="${tipoNombre}">
            <i class="${tipoIcono}"></i> ${tipoNombre}
        </div>
        
        ${driveBadgeHTML}
        
        <div class="recurso-image-container">
            <img src="${imagenURL}" 
                 alt="${recurso.nombre}" 
                 class="recurso-image"
                 loading="lazy"
                 data-original-url="${recurso.url}"
                 onerror="manejarErrorImagenCard(this)">
            <div class="image-loading" aria-hidden="true">
                <div class="loading-spinner-small"></div>
            </div>
            
            ${isGoogleDrive ? `
                <div class="drive-icon-overlay" style="display: none;">
                    <i class="fab fa-google-drive"></i>
                </div>
            ` : ''}
        </div>
        
        <div class="recurso-info">
            <h3 class="recurso-title">${recurso.nombre}</h3>
            <p class="recurso-descripcion">${recurso.descripcion || 'Sin descripción'}</p>
            
            ${etiquetasHTML}
            
            <div class="recurso-details-grid">
                <div class="recurso-detail-item">
                    <span class="recurso-detail-label">Categoría</span>
                    <span class="recurso-detail-value" style="color: ${recurso.categoria?.color || '#868e96'}">
                        <i class="${recurso.categoria?.icono || 'fas fa-folder'}"></i> ${recurso.categoria?.nombre || 'Sin categoría'}
                    </span>
                </div>
                <div class="recurso-detail-item">
                    <span class="recurso-detail-label">Formato</span>
                    <span class="recurso-detail-value">${recurso.formato?.toUpperCase() || 'N/A'}</span>
                </div>
                <!-- ELIMINADO: Tamaño -->
                <!-- ELIMINADO: Descargas -->
            </div>
            
            <div class="recurso-actions">
                <button class="recurso-btn preview" onclick="abrirVistaPrevia('${recurso.id}')" 
                        aria-label="Vista previa de ${recurso.nombre}"
                        title="Ver vista previa">
                    <i class="fas fa-eye"></i> Vista Previa
                </button>
                <button class="recurso-btn download" onclick="descargarRecursoDesdeCard('${recurso.id}')" 
                        aria-label="Descargar ${recurso.nombre}"
                        title="Descargar recurso">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
            
            ${isGoogleDrive ? `
                <div class="recurso-source-info">
                    <i class="fab fa-google-drive"></i> Almacenado en Google Drive
                </div>
            ` : ''}
        </div>
    `;
    
    // Configurar eventos adicionales después de crear la tarjeta
    setTimeout(() => {
        const imgElement = tarjeta.querySelector('.recurso-image');
        const driveOverlay = tarjeta.querySelector('.drive-icon-overlay');
        
        if (imgElement) {
            // Configurar evento de carga exitosa
            imgElement.addEventListener('load', function() {
                if (driveOverlay) {
                    driveOverlay.style.display = 'none';
                }
            });
            
            // Configurar evento de error
            imgElement.addEventListener('error', function() {
                manejarErrorImagenCard(this);
            });
        }
        
        // Configurar eventos de hover para mejor UX
        tarjeta.addEventListener('mouseenter', function() {
            if (driveOverlay && isGoogleDrive) {
                driveOverlay.style.display = 'flex';
            }
        });
        
        tarjeta.addEventListener('mouseleave', function() {
            if (driveOverlay) {
                driveOverlay.style.display = 'none';
            }
        });
        
        // Accesibilidad: teclado navigation
        tarjeta.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const previewBtn = this.querySelector('.recurso-btn.preview');
                if (previewBtn) {
                    previewBtn.click();
                }
            }
        });
        
    }, 0);
    
    return tarjeta;
}

// Función auxiliar para manejar errores de imagen en tarjetas
function manejarErrorImagenCard(imgElement) {
    const originalURL = imgElement.getAttribute('data-original-url');
    const isGoogleDrive = originalURL.includes('drive.google.com');
    
    // Crear data URI según el tipo
    if (isGoogleDrive) {
        // Data URI para Google Drive
        imgElement.src = 'data:image/svg+xml;base64,' + btoa(`
            <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#6b0000"/>
                <text x="50%" y="50%" font-family="Arial" font-size="16" 
                      fill="white" text-anchor="middle" dy=".3em">
                    Google Drive
                </text>
            </svg>
        `);
        imgElement.alt = imgElement.alt + ' (Google Drive)';
    } else {
        // Data URI para error genérico
        imgElement.src = 'data:image/svg+xml;base64,' + btoa(`
            <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#868e96"/>
                <text x="50%" y="50%" font-family="Arial" font-size="16" 
                      fill="white" text-anchor="middle" dy=".3em">
                    Imagen no disponible
                </text>
            </svg>
        `);
        imgElement.alt = 'Imagen no disponible';
    }
}

function abrirVistaPrevia(recursoId) {
    console.log(`🔍 Abriendo vista previa para recurso ID: ${recursoId}`);
    
    // Cancelar cualquier carga pendiente previa
    cancelarCargaImagen();
    
    // Buscar el recurso por ID
    const recursoSeleccionado = recursos.find(r => r.id === recursoId);
    
    if (!recursoSeleccionado) {
        console.error('❌ Recurso no encontrado:', recursoId);
        showSystemMessage('Recurso no encontrado.', 'error');
        return;
    }
    
    // Asignar a la variable global para otras funciones
    recursoActual = recursoSeleccionado;
    
    // Guardar valores importantes en variables locales
    const nombreRecurso = recursoActual.nombre;
    const urlRecurso = recursoActual.url;
    const tipoRecurso = recursoActual.tipo?.toLowerCase() || 'otro';
    const isGoogleDrive = urlRecurso.includes('drive.google.com');
    
    console.log('✅ Recurso encontrado:', nombreRecurso);
    console.log('📁 Tipo:', tipoRecurso);
    console.log('🔗 URL:', urlRecurso);
    console.log('☁️ Google Drive:', isGoogleDrive);
    
    // Actualizar información en el modal - SIN TAMAÑO NI DESCARGAS
    previewNombre.textContent = nombreRecurso;
    previewDescripcion.textContent = recursoActual.descripcion || 'Sin descripción';
    previewCategoria.textContent = recursoActual.categoria?.nombre || 'Sin categoría';
    previewTipo.textContent = tipoRecurso.charAt(0).toUpperCase() + tipoRecurso.slice(1);
    previewFormato.textContent = recursoActual.formato?.toUpperCase() || 'N/A';
    
    // Ocultar todos los medios primero
    previewImage.classList.add('hidden');
    previewVideo.classList.add('hidden');
    previewDocument.classList.add('hidden');
    
    // Limpiar mensajes anteriores
    const container = document.querySelector('.preview-container');
    if (container) {
        const existingMessage = container.querySelector('.drive-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }
    
    // Limpiar iframe de video si existe
    if (previewVideo.innerHTML) {
        previewVideo.innerHTML = '';
    }
    
    // Crear SVG placeholders
    const placeholderDrive = crearSVGPlaceholder('Google Drive', '#6b0000', 'white', 800, 600);
    const placeholderImage = crearSVGPlaceholder('Imagen', '#868e96', 'white', 800, 600);
    
    // Mostrar el medio correspondiente
    if (tipoRecurso === 'imagen') {
        console.log('🖼️ Mostrando imagen...');
        
        let imageUrl = urlRecurso;
        let usarThumbnail = false;
        let fileId = null;
        
        if (isGoogleDrive) {
            fileId = extraerFileIdDeGoogleDrive(urlRecurso);
            
            if (fileId) {
                // Usar thumbnail oficial de Google Drive
                imageUrl = `https://lh3.googleusercontent.com/d/${fileId}=s1000?authuser=0`;
                usarThumbnail = true;
                console.log('📸 Usando thumbnail oficial de Google Drive');
                
                // Agregar mensaje informativo
                if (container) {
                    const message = document.createElement('div');
                    message.className = 'drive-message info';
                    message.innerHTML = `
                        <p><i class="fas fa-info-circle"></i> 
                        <strong>Imagen en Google Drive</strong></p>
                        <p class="small">Esta es una vista previa de la imagen.</p>
                        <p class="small" style="margin-top: 5px;">
                            <i class="fas fa-lightbulb"></i> Para descargar, usa el botón "Descargar" en la tarjeta del recurso.
                        </p>
                    `;
                    container.appendChild(message);
                }
            } else {
                console.warn('⚠️ No se pudo extraer ID de Google Drive');
                imageUrl = placeholderDrive;
                
                if (container) {
                    const message = document.createElement('div');
                    message.className = 'drive-message warning';
                    message.innerHTML = `
                        <p><i class="fas fa-exclamation-triangle"></i> 
                        <strong>Enlace no válido</strong></p>
                        <p class="small">No se pudo obtener la miniatura de Google Drive.</p>
                    `;
                    container.appendChild(message);
                }
            }
        } else {
            console.log('🌐 Usando URL directa:', imageUrl);
            
            // Agregar mensaje informativo para recursos no Drive
            if (container) {
                const message = document.createElement('div');
                message.className = 'info-message';
                message.innerHTML = `
                    <p><i class="fas fa-info-circle"></i> 
                    <small>Para descargar este recurso, usa el botón "Descargar" en la tarjeta principal.</small></p>
                `;
                container.appendChild(message);
            }
        }
        
        // Limpiar eventos previos
        previewImage.onload = null;
        previewImage.onerror = null;
        
        // Configurar la imagen
        previewImage.src = imageUrl;
        previewImage.alt = nombreRecurso;
        
        // Configurar eventos de carga con gestión de estado
        let imagenCargada = false;
        let errorTimeout = null;
        
        previewImage.onload = function() {
            console.log('✅ Imagen cargada exitosamente');
            imagenCargada = true;
            
            // Limpiar timeout si existe
            if (errorTimeout) {
                clearTimeout(errorTimeout);
                errorTimeout = null;
            }
        };
        
        previewImage.onerror = function() {
            // Verificar si el modal aún está abierto
            if (!previewModal.classList.contains('activo')) {
                console.log('Modal cerrado, ignorando error de imagen');
                return;
            }
            
            console.error('❌ Error cargando imagen');
            
            if (isGoogleDrive && usarThumbnail && fileId) {
                // Intentar con tamaño más pequeño
                this.src = `https://lh3.googleusercontent.com/d/${fileId}=s400?authuser=0`;
                
                // Configurar nuevo handler de error
                this.onerror = function() {
                    if (!previewModal.classList.contains('activo')) return;
                    
                    this.src = placeholderDrive;
                    this.alt = nombreRecurso + ' (Google Drive)';
                    
                    if (container) {
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'drive-message error';
                        errorMessage.innerHTML = `
                            <p><i class="fas fa-exclamation-circle"></i> 
                            <strong>No se puede previsualizar</strong></p>
                            <p class="small">La imagen no puede cargarse en la vista previa.</p>
                        `;
                        container.appendChild(errorMessage);
                    }
                };
            } else {
                // Para otros enlaces
                this.src = placeholderImage;
                this.alt = 'Imagen no disponible';
            }
        };
        
        // Timeout de seguridad (10 segundos)
        errorTimeout = setTimeout(function() {
            if (!imagenCargada && previewModal.classList.contains('activo')) {
                console.log('⏱️ Timeout de carga de imagen');
                previewImage.onerror(new Event('timeout'));
            }
        }, 10000);
        
        previewImage.classList.remove('hidden');
        
    } else if (tipoRecurso === 'video') {
        console.log('🎥 Mostrando video...');
        
        if (isGoogleDrive) {
            const fileId = extraerFileIdDeGoogleDrive(urlRecurso);
            
            if (fileId) {
                console.log('📹 Usando iframe para video de Google Drive');
                
                previewVideo.innerHTML = `
                    <div style="width: 100%; max-width: 800px; margin: 0 auto;">
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-md); box-shadow: var(--shadow-lg);">
                            <iframe src="https://drive.google.com/file/d/${fileId}/preview" 
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                                    frameborder="0"
                                    allow="autoplay; encrypted-media; fullscreen"
                                    allowfullscreen
                                    title="${nombreRecurso}">
                            </iframe>
                        </div>
                        <div class="drive-message info" style="margin-top: 20px;">
                            <p><i class="fas fa-info-circle"></i> Video en Google Drive</p>
                            <p class="small">Usa los controles del reproductor.</p>
                            <p class="small" style="margin-top: 5px;">
                                <i class="fas fa-lightbulb"></i> Para descargar, usa el botón "Descargar" en la tarjeta del recurso.
                            </p>
                        </div>
                    </div>
                `;
            } else {
                console.warn('⚠️ No se pudo extraer ID de Google Drive para video');
                
                previewVideo.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-video-slash" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 20px;"></i>
                        <p style="color: var(--text-light); margin-bottom: 10px;">No se puede cargar el video</p>
                        <p style="color: var(--text-light); margin-bottom: 20px; font-size: 0.9rem;">
                            Enlace de Google Drive no válido
                        </p>
                    </div>
                `;
            }
        } else {
            console.log('🎬 Usando video HTML5 directo');
            
            // Limpiar eventos previos
            previewVideo.onerror = null;
            
            previewVideo.src = urlRecurso;
            previewVideo.setAttribute('controls', 'true');
            previewVideo.setAttribute('preload', 'metadata');
            previewVideo.setAttribute('title', nombreRecurso);
            
            // Agregar mensaje informativo
            if (container) {
                const message = document.createElement('div');
                message.className = 'info-message';
                message.innerHTML = `
                    <p><i class="fas fa-info-circle"></i> 
                    <small>Para descargar este video, usa el botón "Descargar" en la tarjeta principal.</small></p>
                `;
                container.appendChild(message);
            }
            
            previewVideo.onerror = function() {
                if (!previewModal.classList.contains('activo')) return;
                
                console.error('❌ Error cargando video');
                this.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error-color); margin-bottom: 20px;"></i>
                        <p style="color: var(--text-light); margin-bottom: 10px;">Error al cargar el video</p>
                    </div>
                `;
            };
        }
        
        previewVideo.classList.remove('hidden');
        
    } else {
        // Código para documentos, audio y otros tipos
        const tipoIcono = getDocumentIcon(tipoRecurso);
        const tipoTexto = getDocumentTypeName(tipoRecurso);
        
        previewDocument.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="${tipoIcono}" style="font-size: 5rem; color: var(--primary-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-color); margin-bottom: 10px;">${nombreRecurso}</h3>
                <p style="color: var(--text-light); margin-bottom: 20px;">
                    <strong>${tipoTexto}</strong> - ${recursoActual.formato?.toUpperCase() || 'N/A'}
                </p>
                
                ${isGoogleDrive ? `
                    <div class="drive-message info" style="margin: 20px auto; max-width: 400px;">
                        <p><i class="fas fa-info-circle"></i> Archivo en Google Drive</p>
                        <p class="small">Vista previa del documento.</p>
                        <p class="small" style="margin-top: 5px;">
                            <i class="fas fa-lightbulb"></i> Para descargar, usa el botón "Descargar" en la tarjeta del recurso.
                        </p>
                    </div>
                ` : `
                    <div class="info-message" style="margin: 20px auto; max-width: 400px;">
                        <p><i class="fas fa-info-circle"></i> 
                        <small>Para descargar este documento, usa el botón "Descargar" en la tarjeta principal.</small></p>
                    </div>
                `}
                
                <div class="document-info" style="margin-top: 30px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <p><strong>Información del archivo:</strong></p>
                    <ul style="color: var(--text-light); padding-left: 20px;">
                        <li>Nombre: ${nombreRecurso}</li>
                        <li>Tipo: ${tipoTexto}</li>
                        <li>Formato: ${recursoActual.formato?.toUpperCase() || 'N/A'}</li>
                    </ul>
                </div>
            </div>
        `;
        
        previewDocument.classList.remove('hidden');
    }
    
    // Actualizar título del modal dinámicamente
    previewModalTitle.innerHTML = `
        <i class="fas fa-eye"></i>
        Vista Previa: ${nombreRecurso.substring(0, 30)}${nombreRecurso.length > 30 ? '...' : ''}
    `;
    
    // Abrir el modal
    previewModal.classList.add('activo');
    previewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Vista previa abierta exitosamente');
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
// Función para crear SVG placeholders
function crearSVGPlaceholder(texto, colorFondo, colorTexto, ancho = 800, alto = 600) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
        <rect width="100%" height="100%" fill="${colorFondo}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="32" 
              fill="${colorTexto}" text-anchor="middle" dominant-baseline="middle">
            ${texto}
        </text>
    </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Función para extraer ID de Google Drive
function extraerFileIdDeGoogleDrive(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
        // Para enlaces tipo: https://drive.google.com/uc?export=download&id=XXXX
        const idMatch1 = url.match(/[?&]id=([^&]+)/);
        if (idMatch1 && idMatch1[1]) return idMatch1[1];
        
        // Para enlaces tipo: https://drive.google.com/file/d/XXXX/view
        const idMatch2 = url.match(/\/d\/([^\/\?#]+)/);
        if (idMatch2 && idMatch2[1]) return idMatch2[1];
        
        return null;
    } catch (error) {
        console.warn('Error extrayendo ID de Google Drive:', error);
        return null;
    }
}

// Funciones auxiliares
function getDocumentIcon(tipo) {
    const iconos = {
        'pdf': 'fas fa-file-pdf',
        'word': 'fas fa-file-word',
        'excel': 'fas fa-file-excel',
        'powerpoint': 'fas fa-file-powerpoint',
        'documento': 'fas fa-file-alt',
        'audio': 'fas fa-file-audio'
    };
    
    return iconos[tipo] || 'fas fa-file';
}

function getDocumentTypeName(tipo) {
    const nombres = {
        'pdf': 'Documento PDF',
        'word': 'Documento Word',
        'excel': 'Hoja de cálculo',
        'powerpoint': 'Presentación',
        'documento': 'Documento',
        'audio': 'Archivo de audio'
    };
    
    return nombres[tipo] || 'Archivo';
}

// Función para crear data URIs como placeholders
function crearDataURIPlaceholder(texto, colorFondo, colorTexto) {
    // Crear un canvas para generar la imagen
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Fondo
    ctx.fillStyle = colorFondo;
    ctx.fillRect(0, 0, 800, 600);
    
    // Texto
    ctx.fillStyle = colorTexto;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Dividir texto si es muy largo
    const palabras = texto.split(' ');
    let lineas = [];
    let lineaActual = palabras[0];
    
    for (let i = 1; i < palabras.length; i++) {
        const medida = ctx.measureText(lineaActual + ' ' + palabras[i]);
        if (medida.width < 700) {
            lineaActual += ' ' + palabras[i];
        } else {
            lineas.push(lineaActual);
            lineaActual = palabras[i];
        }
    }
    lineas.push(lineaActual);
    
    // Dibujar líneas de texto
    const lineHeight = 50;
    const startY = 300 - ((lineas.length - 1) * lineHeight) / 2;
    
    lineas.forEach((linea, index) => {
        ctx.fillText(linea, 400, startY + (index * lineHeight));
    });
    
    // Devolver data URI
    return canvas.toDataURL('image/png');
}

// Función para manejar errores de imagen en vista previa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
function manejarErrorImagenPreview(imgElement, nombre, esGoogleDrive, container) {
    if (esGoogleDrive) {
        // Usar data URI para Google Drive
        imgElement.src = crearDataURIPlaceholder('Google Drive', '#6b0000', '#FFFFFF');
        imgElement.alt = nombre + ' (Google Drive)';
        
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'drive-message error';
            errorMessage.innerHTML = `
                <p><i class="fas fa-exclamation-circle"></i> 
                <strong>Error al cargar</strong></p>
                <p class="small">No se puede previsualizar desde Google Drive.</p>
                <button class="btn btn-primary download-fallback-btn" style="margin-top: 10px;">
                    <i class="fas fa-download"></i> Descargar
                </button>
            `;
            container.appendChild(errorMessage);
            
            const downloadBtn = errorMessage.querySelector('.download-fallback-btn');
            if (downloadBtn) {
                downloadBtn.onclick = function(e) {
                    e.stopPropagation();
                    descargarRecurso();
                };
            }
        }
    } else {
        // Usar data URI para error genérico
        imgElement.src = crearDataURIPlaceholder('Imagen no disponible', '#868e96', '#FFFFFF');
        imgElement.alt = 'Imagen no disponible';
    }
}
                                                                                                                        
// Función para obtener URL de descarga directa de Google Drive
function obtenerURLDescargaGoogleDrive(url) {
    const fileId = extraerFileIdDeGoogleDrive(url);
    if (!fileId) return url; // Devolver original si no es Google Drive
    
    // URL de descarga directa para Google Drive
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Opcional: Función para verificar si una URL es accesible
function verificarAccesibilidadURL(url, callback) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        
        // Timeout después de 5 segundos
        setTimeout(() => resolve(false), 5000);
    });
}

async function descargarRecurso() {
    if (!recursoActual) {
        showSystemMessage('No hay recurso seleccionado.', 'error');
        return;
    }
    
    const recurso = recursoActual;
    const url = recurso.url;
    const nombre = recurso.nombre;
    
    console.log(`🔄 INICIANDO descarga: ${nombre}`);
    
    try {
        // ===== PASO 1: ELIMINADO registro en Supabase =====
        // YA NO SE REGISTRAN DESCARGAS EN LA BASE DE DATOS
        console.log('📥 Descarga directa (sin registro en BD)');
        
        // ===== PASO 2: ABRIR RECURSO DIRECTAMENTE =====
        console.log('📂 Abriendo recurso para descarga...');
        
        // Método 1: Intentar con window.open
        const nuevaVentana = window.open(url, '_blank');
        
        // Si se bloqueó (bloqueador de popups), usar método 2
        if (!nuevaVentana || nuevaVentana.closed || typeof nuevaVentana.closed == 'undefined') {
            console.log('⚠️ window.open bloqueado, usando elemento <a>');
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
        }
        
        // ===== PASO 3: FEEDBACK AL USUARIO =====
        mostrarToast(`✅ Descargando: ${nombre}`);
        
        // ===== PASO 4: CERRAR MODAL (con delay) =====
        setTimeout(() => {
            closePreviewModal();
        }, 500);
        
    } catch (error) {
        console.error('❌ ERROR en descarga:', error);
        
        // Último intento
        window.open(url, '_blank');
        mostrarToast(`⚠️ Error, pero recurso abierto: ${nombre}`);
    }
}

// Función mejorada para descargar recursos
async function descargarArchivo(url, nombreArchivo) {
    console.log(`📥 Intentando descargar: ${nombreArchivo}`);
    
    // MÉTODO ÚNICO: Crear elemento <a> y simular clic
    try {
        const link = document.createElement('a');
        
        // Para Google Drive, usar el enlace directo
        link.href = url;
        link.target = '_blank'; // IMPORTANTE: nueva pestaña
        
        // Solo usar 'download' para archivos locales, NO para Google Drive
        if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) {
            link.download = nombreArchivo;
        }
        
        // Añadir al DOM
        document.body.appendChild(link);
        
        // Simular clic
        link.click();
        
        // Limpiar
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
        }, 100);
        
        console.log(`Descarga iniciada para: ${nombreArchivo}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error en método simple:', error);
        
        // Último recurso: abrir en nueva ventana
        window.open(url, '_blank');
        return false;
    }
}

async function descargarRecursoDesdeCard(recursoId) {
    const recurso = recursos.find(r => r.id === recursoId);
    
    if (!recurso) {
        showSystemMessage('Recurso no encontrado.', 'error');
        return;
    }
    
    console.log(`🔄 Descarga desde tarjeta: ${recurso.nombre}`);
    
    // Obtener botón que hizo clic
    const event = window.event || arguments.callee.caller.arguments[0];
    let botonDescarga = null;
    
    if (event && event.target) {
        botonDescarga = event.target.closest('.recurso-btn.download');
    }
    
    // Deshabilitar temporalmente
    if (botonDescarga) {
        const textoOriginal = botonDescarga.innerHTML;
        botonDescarga.disabled = true;
        botonDescarga.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Re-habilitar después
        setTimeout(() => {
            botonDescarga.disabled = false;
            botonDescarga.innerHTML = textoOriginal;
        }, 3000);
    }
    
    try {
        // ===== ELIMINADO: REGISTRO EN SUPABASE =====
        console.log('📥 Descarga directa sin registro');
        
        // ===== ABRIR RECURSO =====
        window.open(recurso.url, '_blank');
        
        // Feedback
        mostrarToast(`Descargando: ${recurso.nombre}`);
        
    } catch (error) {
        console.error('Error en descarga desde tarjeta:', error);
        window.open(recurso.url, '_blank');
        mostrarToast(`⚠️ Recurso abierto: ${recurso.nombre}`);
    }
}

// Función para obtener tipo MIME según extensión
function obtenerTipoMime(extension) {
    if (!extension) return null;
    
    const extensionLower = extension.toLowerCase();
    const tiposMime = {
        // Imágenes
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        
        // Videos
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        
        // Documentos
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        
        // Otros
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json'
    };
    
    return tiposMime[extensionLower] || null;
}

// Función opcional para obtener IP (solo si necesitas)
async function obtenerIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'unknown';
    }
}

// ===== FUNCIONES AUXILIARES =====
function mostrarSkeletonLoading() {
    const skeletonHTML = `
        <div class="skeleton-container">
            ${Array(6).fill().map((_, i) => `
                <div class="skeleton-card" aria-label="Cargando recurso ${i + 1}">
                    <div class="skeleton-badge skeleton"></div>
                    <div class="skeleton-image skeleton"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-text skeleton" style="width: 70%;"></div>
                        <div class="skeleton-text skeleton" style="width: 90%; margin-bottom: 20px;"></div>
                        <div class="skeleton-grid">
                            ${Array(4).fill().map(() => `
                                <div class="skeleton-grid-item">
                                    <div class="skeleton-label skeleton"></div>
                                    <div class="skeleton-value skeleton"></div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    recursosGrid.innerHTML = skeletonHTML;
}

function ocultarSkeletonLoading() {
    // El contenido se reemplazará en renderizarRecursos()
}

function mostrarLoadingGlobal(mensaje = 'Cargando...') {
    let overlay = document.getElementById('globalLoadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.className = 'fullscreen-loading';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${mensaje}</div>
        `;
        document.body.appendChild(overlay);
    }
}

function ocultarLoadingGlobal() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function actualizarContadorRecursos() {
    const indiceInicio = (paginaActual - 1) * recursosPorPagina + 1;
    const indiceFin = Math.min(paginaActual * recursosPorPagina, recursosFiltrados.length);
    
    if (recursosFiltrados.length > 0) {
        productsStats.textContent = `Mostrando ${indiceInicio}-${indiceFin} de ${recursosFiltrados.length} recursos`;
    } else {
        productsStats.textContent = 'No hay recursos que coincidan';
    }
    
    productsCount.textContent = recursosFiltrados.length;
}

function actualizarEstadisticas() {
    const totalRecursosCount = recursos.length;
    
    if (totalRecursos) {
        totalRecursos.textContent = `${totalRecursosCount} recursos`;
    }

}

// ===== FUNCIÓN PARA OBTENER BADGE DE TIPO =====
function obtenerBadgeTipo(tipo) {
    // Normalizar el tipo (minúsculas, sin espacios)
    const tipoNormalizado = (tipo || 'otro').toLowerCase().trim();
    
    // Mapear tipos posibles
    const tipoConfig = {
        'imagen': { nombre: 'Imagen', icono: 'fas fa-image', clase: 'imagen' },
        'video': { nombre: 'Video', icono: 'fas fa-video', clase: 'video' },
        'documento': { nombre: 'Documento', icono: 'fas fa-file-alt', clase: 'documento' },
        'audio': { nombre: 'Audio', icono: 'fas fa-volume-up', clase: 'audio' },
        'pdf': { nombre: 'PDF', icono: 'fas fa-file-pdf', clase: 'documento' },
        'presentacion': { nombre: 'Presentación', icono: 'fas fa-chart-line', clase: 'documento' }
    };
    
    // Obtener configuración o usar valores por defecto
    const config = tipoConfig[tipoNormalizado] || {
        nombre: tipoNormalizado.charAt(0).toUpperCase() + tipoNormalizado.slice(1),
        icono: 'fas fa-file',
        clase: 'otro'
    };
    
    return `
        <span class="recurso-badge ${config.clase}" 
              style="display: inline-block; padding: 4px 8px; font-size: 0.8rem; border-radius: 4px;">
            <i class="${config.icono}"></i> ${config.nombre}
        </span>
    `;
}

function cambiarVista(tipo) {
    console.log('🔍 Cambiando vista a:', tipo);
    
    // Guardar preferencia
    localStorage.setItem('marketing_vista', tipo);
    
    // Obtener elementos
    const gridView = document.getElementById('recursosGrid');
    const listView = document.getElementById('recursosLista');
    const btnGrid = document.getElementById('verTodosBtn');
    const btnList = document.getElementById('verListaBtn');
    
    if (!gridView || !listView || !btnGrid || !btnList) {
        console.error('❌ Elementos de vista no encontrados');
        return;
    }
    
    console.log('Elementos encontrados:', { gridView, listView, btnGrid, btnList });
    
    // Resetear botones
    btnGrid.classList.remove('active');
    btnList.classList.remove('active');
    
    // Resetear clases de botones
    btnGrid.className = 'btn btn-secondary';
    btnList.className = 'btn btn-secondary';
    
    if (tipo === 'grid') {
        // Mostrar grid, ocultar lista
        gridView.classList.remove('hidden');
        listView.classList.add('hidden');
        
        // Actualizar botón grid
        btnGrid.classList.add('active', 'btn-primary');
        btnGrid.classList.remove('btn-secondary');
        
        console.log('✅ Grid visible, Lista oculta');
        
    } else if (tipo === 'lista') {
        // Mostrar lista, ocultar grid
        gridView.classList.add('hidden');
        listView.classList.remove('hidden');
        
        // Actualizar botón lista
        btnList.classList.add('active', 'btn-primary');
        btnList.classList.remove('btn-secondary');
        
        // Asegurar que la tabla se renderice correctamente
        setTimeout(() => {
            actualizarVistaLista(recursosFiltrados.slice(
                (paginaActual - 1) * recursosPorPagina,
                paginaActual * recursosPorPagina
            ));
        }, 100);
        
        console.log('✅ Lista visible, Grid oculto');
    }
    
    console.log('🎨 Estado final - Grid hidden:', gridView.classList.contains('hidden'));
    console.log('🎨 Estado final - Lista hidden:', listView.classList.contains('hidden'));
}

function sincronizarFiltrosMoviles() {
    // Limpiar contenido existente
    filtrosModalContent.innerHTML = '';
    
    // Recargar filtros
    cargarFiltrosModal();
    
    // Actualizar badge
    actualizarBadgeFiltro();
}

// ===== FUNCIONES DE FILTROS =====
function mostrarOpcionesFiltro(tipo, boton) {
    document.querySelectorAll('.btn-filtro-grupo').forEach(b => {
        b.classList.remove('activo');
        b.setAttribute('aria-expanded', 'false');
    });
    
    boton.classList.add('activo');
    boton.setAttribute('aria-expanded', 'true');
    
    cargarOpcionesFiltroHTML(tipo);
    
    filtrosOpciones.classList.add('visible');
    filtrosOpciones.setAttribute('aria-hidden', 'false');
}

function cargarOpcionesFiltroHTML(tipo) {
    if (!filtrosOpciones) return;
    
    let html = '';
    let titulo = '';
    let icono = '';
    
    switch(tipo) {
        case 'categoria':
            titulo = 'Categoría';
            icono = 'fas fa-tags';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${categorias.map(categoria => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="categoria-fijo" value="${categoria.id}" 
                                       ${estadoFiltros.categorias && estadoFiltros.categorias.includes(categoria.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('categorias', '${categoria.id}', this.checked)"
                                       aria-label="Filtrar por categoría ${categoria.nombre}">
                                <span style="color: ${categoria.color}">
                                    <i class="${categoria.icono || 'fas fa-folder'}"></i> ${categoria.nombre}
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'tipo':
            titulo = 'Tipo de Recurso';
            icono = 'fas fa-file';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${tiposRecursos.map(tipoItem => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="tipo-fijo" value="${tipoItem.id}" 
                                       ${estadoFiltros.tipos && estadoFiltros.tipos.includes(tipoItem.id) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('tipos', '${tipoItem.id}', this.checked)"
                                       aria-label="Filtrar por tipo ${tipoItem.nombre}">
                                <span><i class="${tipoItem.icono}"></i> ${tipoItem.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'formato':
            titulo = 'Formato';
            icono = 'fas fa-file-alt';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${formatosComunes.map(formato => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="formato-fijo" value="${formato}" 
                                       ${estadoFiltros.formatos && estadoFiltros.formatos.includes(formato) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('formatos', '${formato}', this.checked)"
                                       aria-label="Filtrar por formato ${formato.toUpperCase()}">
                                <span>${formato.toUpperCase()}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
    }
    
    html += `
        <div class="filtros-acciones">
            <button class="btn btn-primary" onclick="aplicarFiltros()" aria-label="Aplicar filtros seleccionados">
                <i class="fas fa-check"></i> Aplicar
            </button>
            <button class="btn btn-secondary" onclick="cerrarOpcionesFiltro()" aria-label="Cerrar opciones de filtro">
                <i class="fas fa-times"></i> Cerrar
            </button>
        </div>
    `;
    
    filtrosOpciones.innerHTML = html;
}

function actualizarFiltroDesdeFijo(tipo, valor, checked) {
    if (!estadoFiltros[tipo]) {
        estadoFiltros[tipo] = [];
    }
    
    const arrayFiltro = estadoFiltros[tipo];
    
    if (checked) {
        if (!arrayFiltro.includes(valor.toString())) {
            arrayFiltro.push(valor.toString());
        }
    } else {
        const indice = arrayFiltro.indexOf(valor.toString());
        if (indice !== -1) {
            arrayFiltro.splice(indice, 1);
        }
    }
}

function cerrarOpcionesFiltro() {
    if (filtrosOpciones) {
        filtrosOpciones.classList.remove('visible');
        filtrosOpciones.setAttribute('aria-hidden', 'true');
    }
    
    document.querySelectorAll('.btn-filtro-grupo').forEach(b => {
        b.classList.remove('activo');
        b.setAttribute('aria-expanded', 'false');
    });
}

// En la función reiniciarFiltros(), añade al final:
function reiniciarFiltros() {
    estadoFiltros.categorias = [];
    estadoFiltros.tipos = [];
    estadoFiltros.formatos = [];
    estadoFiltros.busqueda = '';
    
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.remove('active');
    
    recursosFiltrados = [...recursos];
    paginaActual = 1;
    
    actualizarContadorRecursos();
    renderizarRecursos();
    actualizarBadgeFiltro(); // ← Asegúrate de que está esta línea
    
    mostrarToast('Filtros restablecidos');
    cerrarOpcionesFiltro();
}

// En la función aplicarFiltros(), añade al final:
function aplicarFiltros() {
    console.log('🔍 === APLICANDO FILTROS ===');
    console.log('Estado de filtros:', JSON.stringify(estadoFiltros, null, 2));
    
    // Si no hay filtros activos, mostrar todos los recursos
    const hayFiltrosActivos = 
        (estadoFiltros.categorias && estadoFiltros.categorias.length > 0) ||
        (estadoFiltros.tipos && estadoFiltros.tipos.length > 0) ||
        (estadoFiltros.formatos && estadoFiltros.formatos.length > 0) ||
        (estadoFiltros.busqueda && estadoFiltros.busqueda.trim() !== '');
    
    if (!hayFiltrosActivos) {
        console.log('No hay filtros activos, mostrando todos los recursos');
        recursosFiltrados = [...recursos];
    } else {
        recursosFiltrados = recursos.filter(recurso => {
            let pasaFiltros = true;
            
            // Filtro por categoría - CORRECCIÓN IMPORTANTE
            if (estadoFiltros.categorias && estadoFiltros.categorias.length > 0) {
                // Asegurar que comparamos strings con strings
                const categoriaIdStr = recurso.categoria_id?.toString() || '';
                const filtroCategoriasStr = estadoFiltros.categorias.map(c => c.toString());
                
                if (!filtroCategoriasStr.includes(categoriaIdStr)) {
                    pasaFiltros = false;
                }
            }
            
            // Filtro por tipo
            if (pasaFiltros && estadoFiltros.tipos && estadoFiltros.tipos.length > 0) {
                const tipoRecurso = recurso.tipo || '';
                if (!estadoFiltros.tipos.includes(tipoRecurso)) {
                    pasaFiltros = false;
                }
            }
            
            // Filtro por formato - CORRECCIÓN IMPORTANTE
            if (pasaFiltros && estadoFiltros.formatos && estadoFiltros.formatos.length > 0) {
                const formatoRecurso = (recurso.formato || '').toLowerCase();
                const filtroFormatosLower = estadoFiltros.formatos.map(f => f.toLowerCase());
                
                if (!filtroFormatosLower.includes(formatoRecurso)) {
                    pasaFiltros = false;
                }
            }
            
            // Filtro por búsqueda
            if (pasaFiltros && estadoFiltros.busqueda && estadoFiltros.busqueda.trim() !== '') {
                const busquedaMin = estadoFiltros.busqueda.toLowerCase();
                const enNombre = (recurso.nombre || '').toLowerCase().includes(busquedaMin);
                const enDescripcion = (recurso.descripcion || '').toLowerCase().includes(busquedaMin);
                const enEtiquetas = recurso.etiquetas?.some(etiqueta => 
                    etiqueta.toLowerCase().includes(busquedaMin)
                ) || false;
                
                if (!enNombre && !enDescripcion && !enEtiquetas) {
                    pasaFiltros = false;
                }
            }
            
            return pasaFiltros;
        });
    }
    
    console.log(`✅ ${recursosFiltrados.length} recursos encontrados`);
    
    paginaActual = 1;
    actualizarContadorRecursos();
    renderizarRecursos();
    cerrarOpcionesFiltro();
    actualizarBadgeFiltro();
    
    mostrarToast(`${recursosFiltrados.length} recursos encontrados`);
}

// ===== FUNCIONES DE PAGINACIÓN =====
function renderizarPaginacion() {
    if (!pagination) return;
    
    const totalPaginas = Math.ceil(recursosFiltrados.length / recursosPorPagina);
    
    if (totalPaginas <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let htmlPaginacion = '';
    
    htmlPaginacion += `
        <button class="page-btn ${paginaActual === 1 ? 'disabled' : ''}" 
                onclick="cambiarPagina(${paginaActual - 1})"
                ${paginaActual === 1 ? 'disabled aria-disabled="true"' : ''}
                aria-label="Página anterior">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaActual - 1 && i <= paginaActual + 1)) {
            htmlPaginacion += `
                <button class="page-btn ${i === paginaActual ? 'active' : ''}" 
                        onclick="cambiarPagina(${i})"
                        aria-label="Página ${i}"
                        ${i === paginaActual ? 'aria-current="page"' : ''}>
                    ${i}
                </button>
            `;
        } else if (i === paginaActual - 2 || i === paginaActual + 2) {
            htmlPaginacion += `<span class="page-btn disabled">...</span>`;
        }
    }
    
    htmlPaginacion += `
        <button class="page-btn ${paginaActual === totalPaginas ? 'disabled' : ''}" 
                onclick="cambiarPagina(${paginaActual + 1})"
                ${paginaActual === totalPaginas ? 'disabled aria-disabled="true"' : ''}
                aria-label="Página siguiente">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = htmlPaginacion;
}

function cambiarPagina(pagina) {
    const totalPaginas = Math.ceil(recursosFiltrados.length / recursosPorPagina);
    
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaActual) return;
    
    paginaActual = pagina;
    renderizarRecursos();
    
    const recursosSection = document.getElementById('recursos');
    if (recursosSection) {
        recursosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== FUNCIONES DE BÚSQUEDA =====
function handleSearchInput() {
    clearTimeout(busquedaTimeout);
    
    busquedaTimeout = setTimeout(() => {
        const consulta = this.value.trim().toLowerCase();
        estadoFiltros.busqueda = consulta;
        
        if (consulta.length >= 2) {
            aplicarFiltros();
        } else if (consulta.length === 0) {
            aplicarFiltros();
        }
    }, 300);
}

function handleSearchKeydown(e) {
    if (e.key === 'Enter') {
        const consulta = this.value.trim().toLowerCase();
        estadoFiltros.busqueda = consulta;
        aplicarFiltros();
    } else if (e.key === 'Escape') {
        this.value = '';
        estadoFiltros.busqueda = '';
        aplicarFiltros();
    }
}

// ===== FUNCIONES DE UTILIDAD =====
async function hashPassword(password) {
    try {
        // Convertir la contraseña a ArrayBuffer
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        
        // Crear hash SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        // Convertir ArrayBuffer a string hexadecimal
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    } catch (error) {
        console.error('Error generando hash:', error);
        // Fallback simple para desarrollo
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashArray = Array.from(data);
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

function mostrarToast(mensaje) {
    const toastExistente = document.querySelector('.toast');
    if (toastExistente) {
        toastExistente.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// ===== EXPONER FUNCIONES GLOBALES =====
window.actualizarFiltroDesdeFijo = actualizarFiltroDesdeFijo;
window.actualizarFiltroDesdeMovil = actualizarFiltroDesdeMovil;
window.aplicarFiltros = aplicarFiltros;
window.aplicarFiltrosDesdeModal = aplicarFiltrosDesdeModal;
window.cerrarOpcionesFiltro = cerrarOpcionesFiltro;
window.reiniciarFiltros = reiniciarFiltros;
window.cambiarPagina = cambiarPagina;
window.abrirVistaPrevia = abrirVistaPrevia;
window.descargarRecursoDesdeCard = descargarRecursoDesdeCard;
window.cargarRecursosDesdeJSON = cargarRecursosDesdeJSON;
window.cambiarVista = cambiarVista;