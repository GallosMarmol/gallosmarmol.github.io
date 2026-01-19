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
    { id: 'audio', nombre: 'Audio', icono: 'fas fa-volume-up' },
    { id: 'otro', nombre: 'Otro', icono: 'fas fa-file' }
];

const formatosComunes = ['jpg', 'png', 'gif', 'webp', 'svg', 'mp4', 'avi', 'mov', 'webm', 'mkv', 'pdf', 'docx', 'xlsx', 'pptx', 'mp3', 'wav', 'ogg'];

// Variable para recurso actual en vista previa
let recursoActual = null;

// Variables para administrador
let editingResourceId = null;

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
const dashboardBtn = document.getElementById('dashboardBtn');
const addResourceBtn = document.getElementById('addResourceBtn');

// Dashboard
const dashboardSection = document.getElementById('dashboardSection');
const totalRecursosDashboard = document.getElementById('totalRecursosDashboard');
const totalDescargasDashboard = document.getElementById('totalDescargasDashboard');
const totalUsuariosDashboard = document.getElementById('totalUsuariosDashboard');
const totalCategoriasDashboard = document.getElementById('totalCategoriasDashboard');
const typeStats = document.getElementById('typeStats');
const recentResources = document.getElementById('recentResources');
const categoryStats = document.getElementById('categoryStats');

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
const totalDescargas = document.getElementById('totalDescargas');

// Botones administrativos
const addResourceMainBtn = document.getElementById('addResourceMainBtn');
const showAddResourceBtn = document.getElementById('showAddResourceBtn');
const floatingAddBtn = document.getElementById('floatingAddBtn');
const exportBtn = document.getElementById('exportBtn');

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
const previewTamano = document.getElementById('previewTamano');
const previewDescargas = document.getElementById('previewDescargas');
const previewEstado = document.getElementById('previewEstado');
const editResourceBtn = document.getElementById('editResourceBtn');

const passwordModal = document.getElementById('passwordModal');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Modal de recurso
const resourceModal = document.getElementById('resourceModal');
const closeResourceModalBtn = document.getElementById('closeResourceModalBtn');
const cancelResourceBtn = document.getElementById('cancelResourceBtn');
const saveResourceBtn = document.getElementById('saveResourceBtn');
const resourceForm = document.getElementById('resourceForm');
const resourceModalTitle = document.getElementById('resourceModalTitle');

// Modal de confirmación
const confirmModal = document.getElementById('confirmModal');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const confirmActionBtn = document.getElementById('confirmActionBtn');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');

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

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Marketing Digital...');
    
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
    
    if (refreshBtn) {
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
    }
    
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
    
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', reiniciarFiltros);
    }
    
    // Vista previa modal
    if (closePreviewModalBtn) {
        closePreviewModalBtn.addEventListener('click', closePreviewModal);
    }
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', closePreviewModal);
    }
    if (downloadPreviewBtn) {
        downloadPreviewBtn.addEventListener('click', descargarRecurso);
    }
    
    // Cerrar modal al hacer clic fuera
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closePreviewModal();
        });
    }
    
    // Modal contraseña
    if (closePasswordModalBtn) {
        closePasswordModalBtn.addEventListener('click', closePasswordModal);
    }
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', closePasswordModal);
    }
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', createPassword);
    }
    
    // Cerrar modales al hacer clic fuera
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) closePasswordModal();
        });
    }
    
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
    if (verTodosBtn) {
        verTodosBtn.addEventListener('click', () => cambiarVista('grid'));
    }
    
    if (verListaBtn) {
        verListaBtn.addEventListener('click', () => cambiarVista('lista'));
    }
    
    // Eventos para nuevos botones
    if (toggleNewPasswordBtn) {
        toggleNewPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, newPasswordInput, toggleNewPasswordBtn));
    }
    
    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, confirmPasswordInput, toggleConfirmPasswordBtn));
    }
    
    // Eventos de administrador
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', toggleDashboard);
    }
    
    if (addResourceBtn) {
        addResourceBtn.addEventListener('click', () => openResourceModal());
    }
    
    if (addResourceMainBtn) {
        addResourceMainBtn.addEventListener('click', () => openResourceModal());
    }
    
    if (showAddResourceBtn) {
        showAddResourceBtn.addEventListener('click', () => openResourceModal());
    }
    
    if (floatingAddBtn) {
        floatingAddBtn.addEventListener('click', () => openResourceModal());
    }
    
    if (closeResourceModalBtn) {
        closeResourceModalBtn.addEventListener('click', closeResourceModal);
    }
    
    if (cancelResourceBtn) {
        cancelResourceBtn.addEventListener('click', closeResourceModal);
    }
    
    if (saveResourceBtn) {
        saveResourceBtn.addEventListener('click', saveResource);
    }
    
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', closeConfirmModal);
    }
    
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', () => {
            // La acción se configura en openConfirmModal
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // Cerrar modal de recurso al hacer clic fuera
    if (resourceModal) {
        resourceModal.addEventListener('click', (e) => {
            if (e.target === resourceModal) closeResourceModal();
        });
    }
    
    // Cerrar modal de confirmación al hacer clic fuera
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) closeConfirmModal();
        });
    }
    
    // Permitir enter en formulario de recurso
    if (resourceForm) {
        resourceForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                saveResource();
            }
        });
    }
    
    // Botón de editar en vista previa
    if (editResourceBtn) {
        editResourceBtn.addEventListener('click', () => {
            if (recursoActual) {
                closePreviewModal();
                setTimeout(() => openResourceModal(recursoActual.id), 300);
            }
        });
    }
    
    console.log('✅ Sistema de Marketing inicializado correctamente');
});

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
    
    if (isDarkMode) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        localStorage.setItem('marketing_theme', 'dark');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        localStorage.setItem('marketing_theme', 'light');
    }
}

function togglePasswordVisibility(input, button) {
    if (!input || !button) return;
    
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
                    .select('id, nombre, apellido, correo, sistemas_acceso, activo')
                    .eq('correo', sessionData.email)
                    .single();
                    
                if (userData && !error) {
                    // Extraer el rol del sistema marketing
                    let rolMarketing = 'colaborador';
                    if (userData.sistemas_acceso && userData.sistemas_acceso.sistemaMarketing) {
                        rolMarketing = userData.sistemas_acceso.sistemaMarketing.rol || 'colaborador';
                    }
                    
                    // Usar el rol de la sesión si existe, de lo contrario extraer del JSON
                    const rol = sessionData.rol || rolMarketing;
                    
                    currentUser = {
                        ...userData,
                        rol: rol
                    };
                    
                    console.log('🔄 Sesión restaurada:', {
                        usuario: currentUser.nombre,
                        rol: currentUser.rol,
                        desdeSesion: !!sessionData.rol
                    });
                    
                    showApp();
                    cargarDatosIniciales();
                }
            } else {
                console.log('⏰ Sesión expirada');
                localStorage.removeItem('marketing_user_session');
            }
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
    }
}

function extraerRolMarketing(sistemasAcceso) {
    try {
        if (!sistemasAcceso) return 'colaborador';
        
        // Verificar si es un string y convertirlo a objeto
        let sistemas = sistemasAcceso;
        if (typeof sistemasAcceso === 'string') {
            sistemas = JSON.parse(sistemasAcceso);
        }
        
        if (sistemas && sistemas.sistemaMarketing) {
            return sistemas.sistemaMarketing.rol || 'colaborador';
        }
        
        return 'colaborador';
    } catch (error) {
        console.error('Error extrayendo rol del sistema marketing:', error);
        return 'colaborador';
    }
}

// También modificar la función verifyEmail para extraer el rol
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
            .select('id, nombre, apellido, correo, sistemas_acceso, activo, contrasena_hash')
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
        
        // Extraer el rol del sistema marketing
        const rolMarketing = extraerRolMarketing(userData.sistemas_acceso);
        console.log('🎭 Rol detectado en verifyEmail:', rolMarketing);
        
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
            .select('id, nombre, apellido, correo, sistemas_acceso, activo, contrasena_hash')
            .eq('correo', currentEmail)
            .single();
        
        if (userError || !userData) {
            showLoginMessage('Error al verificar las credenciales.', 'error');
            showLoginLoading(false);
            return;
        }
        
        console.log('👤 Datos del usuario obtenidos:', userData);
        console.log('📋 Sistemas acceso:', userData.sistemas_acceso);
        
        const inputHash = await hashPassword(password);
        
        if (inputHash === userData.contrasena_hash) {
            // Obtener el rol del sistema marketing
            let rolMarketing = 'colaborador';
            if (userData.sistemas_acceso && userData.sistemas_acceso.sistemaMarketing) {
                rolMarketing = userData.sistemas_acceso.sistemaMarketing.rol || 'colaborador';
            }
            
            console.log('🎭 Rol en sistema marketing:', rolMarketing);
            
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
                timestamp: new Date().toISOString(),
                rol: rolMarketing // Guardar el rol específico del sistema
            }));
            
            // Crear objeto de usuario con el rol correcto
            currentUser = {
                ...userData,
                rol: rolMarketing // Sobrescribir el rol con el del sistema marketing
            };
            
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
        
        showLoginMessage('Contraseña creada exitosamente. Ahora puedes iniciar sesión.', 'success');
        
        emailStep.classList.add('hidden');
        passwordStep.classList.remove('hidden');
        passwordInput.focus();
        
    } catch (error) {
        console.error('Error creando contraseña:', error);
        showLoginMessage('Error al crear la contraseña. Intenta nuevamente.', 'error');
        showLoginLoading(false);
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
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
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
        console.log('📋 Datos del usuario actual:', currentUser);
        console.log('👤 Rol del usuario (actual):', currentUser.rol);
        
        const initials = `${currentUser.nombre?.charAt() || ''}`;
        if (userAvatar) userAvatar.textContent = initials.toUpperCase() || 'U';
        
        if (userName) userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
        if (userRole) {
            // Usar el rol que ya está en currentUser (ya extraído del JSON)
            const esAdministrador = currentUser.rol === 'administrador';
            userRole.textContent = esAdministrador ? 'Administrador' : 'Colaborador';
            userRole.style.backgroundColor = esAdministrador ? 'var(--primary-color)' : 'var(--secondary-color)';
            
            console.log('🎭 Rol mostrado en interfaz:', userRole.textContent);
        }
        
        // Verificar si es administrador basado en el rol
        const esAdministrador = currentUser.rol === 'administrador';
        
        console.log('🔧 Es administrador?', esAdministrador);
        
        // Mostrar/ocultar botones según rol
        if (refreshBtn) refreshBtn.style.display = esAdministrador ? 'flex' : 'none';
        if (addResourceBtn) addResourceBtn.style.display = esAdministrador ? 'flex' : 'none';
        if (addResourceMainBtn) addResourceMainBtn.style.display = esAdministrador ? 'inline-flex' : 'none';
        if (floatingAddBtn) floatingAddBtn.style.display = esAdministrador ? 'flex' : 'none';
        if (showAddResourceBtn) showAddResourceBtn.style.display = esAdministrador ? 'inline-flex' : 'none';
        if (dashboardBtn) dashboardBtn.style.display = esAdministrador ? 'flex' : 'none';
        if (exportBtn) exportBtn.style.display = esAdministrador ? 'inline-flex' : 'none';
        if (dashboardSection) dashboardSection.style.display = 'none';
        
        console.log('✅ Estado de botones administrativos:', {
            refreshBtn: refreshBtn?.style.display,
            addResourceBtn: addResourceBtn?.style.display,
            dashboardBtn: dashboardBtn?.style.display,
            addResourceMainBtn: addResourceMainBtn?.style.display
        });
    }
}

function showLoginMessage(message, type) {
    if (!loginMessage) return;
    
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove('hidden');
    
    setTimeout(() => {
        loginMessage.classList.add('hidden');
    }, 5000);
}

function clearLoginMessage() {
    if (loginMessage) {
        loginMessage.classList.add('hidden');
    }
}

function showLoginLoading(show) {
    if (!loginLoading) return;
    
    if (show) {
        loginLoading.classList.remove('hidden');
    } else {
        loginLoading.classList.add('hidden');
    }
}

function showSystemMessage(message, type) {
    if (!systemMessage) return;
    
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

// ===== FUNCIONES PARA CARGAR DATOS =====
async function cargarDatosIniciales() {
    try {
        mostrarLoadingGlobal('Cargando sistema...');
        
        // Cargar categorías desde Supabase
        await cargarCategorias();
        
        // Cargar recursos desde Supabase
        await cargarRecursosDesdeSupabase();
        
        // Cargar usuarios si es administrador
        if (currentUser?.rol === 'administrador') {
            await cargarUsuarios();
        }
        
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
        
        // Mostrar skeleton loading
        mostrarSkeletonLoading();
        
        // Consultar recursos activos desde Supabase
        const { data: recursosData, error } = await supabaseClient
            .from('recursos_multimedia')
            .select(`
                *,
                categorias_recursos (*)
            `)
            .order('fecha_creacion', { ascending: false });
        
        if (error) {
            throw new Error(`Error Supabase: ${error.message}`);
        }
        
        console.log('Recursos cargados desde Supabase:', recursosData);
        
        // Procesar los datos
        recursos = recursosData.map(recurso => {
            // Asegurar que las etiquetas sean un array
            let etiquetasArray = [];
            if (recurso.etiquetas) {
                if (Array.isArray(recurso.etiquetas)) {
                    etiquetasArray = recurso.etiquetas;
                } else if (typeof recurso.etiquetas === 'string') {
                    etiquetasArray = recurso.etiquetas.split(',').map(tag => tag.trim());
                }
            }
            
            return {
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
                miniatura: recurso.miniatura || recurso.url,
                tamano: recurso.tamano || 'N/A',
                descargas: recurso.descargas || 0,
                etiquetas: etiquetasArray,
                activo: recurso.activo,
                fecha_creacion: recurso.fecha_creacion,
                fecha_actualizacion: recurso.fecha_actualizacion
            };
        });
        
        recursosFiltrados = [...recursos.filter(r => r.activo)];
        
        console.log(`Recursos procesados: ${recursos.length}`);
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
        // Ocultar skeleton y mostrar datos
        setTimeout(() => {
            ocultarSkeletonLoading();
            renderizarRecursos();
            if (currentUser?.rol === 'administrador') {
                actualizarDashboard();
            }
            mostrarToast(`${recursos.length} recursos cargados`);
        }, 300);
        
    } catch (error) {
        console.error('Error cargando recursos desde Supabase:', error);
        ocultarSkeletonLoading();
        
        let mensajeError = 'Error al cargar los recursos multimedia desde la base de datos.';
        
        if (error.message.includes('Failed to fetch')) {
            mensajeError = 'Error de conexión con la base de datos. Verifica tu conexión a internet.';
        } else if (error.message.includes('permission denied')) {
            mensajeError = 'No tienes permisos para acceder a los recursos. Contacta al administrador.';
        }
        
        showSystemMessage(mensajeError, 'error');
        
        // Mostrar estado de error
        if (recursosGrid) {
            recursosGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-database" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--text-light); margin-bottom: 10px;">Error de conexión</h3>
                    <p style="color: var(--gray-dark); margin-bottom: 15px;">${mensajeError}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="cargarRecursosDesdeSupabase()">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    }
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

async function cargarUsuarios() {
    try {
        const { data, error } = await supabaseClient
            .from('usuario')
            .select('*')
            .eq('activo', true);
        
        if (error) {
            console.error('Error cargando usuarios:', error);
            usuarios = [];
        } else {
            usuarios = data || [];
            console.log(`Usuarios cargados: ${usuarios.length}`);
        }
    } catch (error) {
        console.error('Error crítico cargando usuarios:', error);
        usuarios = [];
    }
}

// ===== FUNCIONES PARA RECURSOS =====
function renderizarRecursos() {
    console.log('🔍 === INICIANDO RENDERIZAR RECURSOS ===');
    
    // Verificar elementos críticos
    if (!recursosGrid) {
        console.error('❌ ERROR CRÍTICO: recursosGrid no existe en el DOM');
        return;
    }
    
    // Calcular recursos para la página actual
    const inicio = (paginaActual - 1) * recursosPorPagina;
    const fin = paginaActual * recursosPorPagina;
    const recursosPaginados = recursosFiltrados.slice(inicio, fin);
    
    // Limpiar ambos contenedores
    recursosGrid.innerHTML = '';
    
    if (listaRecursosBody) {
        listaRecursosBody.innerHTML = '';
    }
    
    // Verificar si hay recursos
    if (recursosFiltrados.length === 0) {
        console.log('📭 No hay recursos para mostrar');
        recursosGrid.innerHTML = `
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
        if (recursosLista && !recursosLista.classList.contains('hidden')) {
            recursosLista.innerHTML = `
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
                // Añadir animación de fade-in
                tarjeta.style.opacity = '0';
                tarjeta.style.transform = 'translateY(20px)';
                tarjeta.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                fragmentGrid.appendChild(tarjeta);
                tarjetasCreadas++;
                
                // Animar después de añadir
                setTimeout(() => {
                    tarjeta.style.opacity = '1';
                    tarjeta.style.transform = 'translateY(0)';
                }, index * 50);
            }
        } catch (error) {
            console.error(`❌ Error procesando recurso ${index}:`, error);
        }
    });
    
    console.log(`✅ Tarjetas creadas: ${tarjetasCreadas}`);
    
    // Añadir fragmento al grid
    recursosGrid.appendChild(fragmentGrid);
    
    // Actualizar vista de lista con los mismos recursos paginados
    actualizarVistaLista(recursosPaginados);
    
    // Actualizar contadores
    actualizarContadorRecursos();
    renderizarPaginacion();
    
    console.log('🏁 === RENDERIZACIÓN COMPLETADA ===');
    console.log('📊 Tarjetas en grid:', recursosGrid.children.length);
}

function crearTarjetaRecurso(recurso) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'recurso-card';
    tarjeta.setAttribute('data-id', recurso.id);
    tarjeta.setAttribute('aria-label', recurso.nombre);
    
    const tipoClase = recurso.tipo || 'otro';
    const tipoNombre = tipoClase.charAt(0).toUpperCase() + tipoClase.slice(1);
    
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
    
    // Badge de estado si no está activo
    const estadoBadge = !recurso.activo ? `
        <div class="recurso-badge estado" style="background: linear-gradient(135deg, var(--error-color), var(--error-dark)); top: 50px;">
            <i class="fas fa-ban"></i> Inactivo
        </div>
    ` : '';
    
    // Acciones de administrador
    const adminActions = currentUser?.rol === 'administrador' ? `
        <div class="admin-actions">
            <button class="admin-action-btn edit" onclick="event.stopPropagation(); openResourceModal('${recurso.id}')" 
                    aria-label="Editar ${recurso.nombre}" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="admin-action-btn toggle" onclick="event.stopPropagation(); openConfirmModal('toggle', '${recurso.id}', '${recurso.nombre.replace(/'/g, "\\'")}')" 
                    aria-label="${recurso.activo ? 'Desactivar' : 'Activar'} ${recurso.nombre}" 
                    title="${recurso.activo ? 'Desactivar' : 'Activar'}">
                <i class="fas fa-power-off"></i>
            </button>
            <button class="admin-action-btn delete" onclick="event.stopPropagation(); openConfirmModal('delete', '${recurso.id}', '${recurso.nombre.replace(/'/g, "\\'")}')" 
                    aria-label="Eliminar ${recurso.nombre}" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    ` : '';
    
    tarjeta.innerHTML = `
        ${estadoBadge}
        <div class="recurso-badge ${tipoClase}" aria-label="${tipoNombre}">
            <i class="${tiposRecursos.find(t => t.id === tipoClase)?.icono || 'fas fa-file'}"></i> ${tipoNombre}
        </div>
        
        ${adminActions}
        
        <div class="recurso-image-container">
            <img src="${recurso.miniatura}" 
                 alt="${recurso.nombre}" 
                 class="recurso-image"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300x200/868e96/FFFFFF?text=Imagen+no+disponible'">
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
                <div class="recurso-detail-item">
                    <span class="recurso-detail-label">Tamaño</span>
                    <span class="recurso-detail-value">${recurso.tamano || 'N/A'}</span>
                </div>
                <div class="recurso-detail-item">
                    <span class="recurso-detail-label">Descargas</span>
                    <span class="recurso-detail-value">${recurso.descargas || 0}</span>
                </div>
            </div>
            
            <div class="recurso-actions">
                <button class="recurso-btn preview" onclick="abrirVistaPrevia('${recurso.id}')" 
                        aria-label="Vista previa de ${recurso.nombre}">
                    <i class="fas fa-eye"></i> Vista Previa
                </button>
                <button class="recurso-btn download" onclick="descargarRecursoDesdeCard('${recurso.id}')" 
                        aria-label="Descargar ${recurso.nombre}"
                        ${!recurso.activo ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    <i class="fas fa-download"></i> Descargar
                </button>
            </div>
        </div>
    `;
    
    // Si el recurso no está activo, agregar clase para opacidad
    if (!recurso.activo) {
        tarjeta.style.opacity = '0.7';
        tarjeta.style.filter = 'grayscale(0.3)';
    }
    
    return tarjeta;
}

function abrirVistaPrevia(recursoId) {
    recursoActual = recursos.find(r => r.id === recursoId);
    
    if (!recursoActual) {
        showSystemMessage('Recurso no encontrado.', 'error');
        return;
    }
    
    // Actualizar información en el modal
    if (previewNombre) previewNombre.textContent = recursoActual.nombre;
    if (previewDescripcion) previewDescripcion.textContent = recursoActual.descripcion || 'Sin descripción';
    if (previewCategoria) previewCategoria.textContent = recursoActual.categoria?.nombre || 'Sin categoría';
    if (previewTipo) previewTipo.textContent = recursoActual.tipo ? recursoActual.tipo.charAt(0).toUpperCase() + recursoActual.tipo.slice(1) : 'Otro';
    if (previewFormato) previewFormato.textContent = recursoActual.formato?.toUpperCase() || 'N/A';
    if (previewTamano) previewTamano.textContent = recursoActual.tamano || 'N/A';
    if (previewDescargas) previewDescargas.textContent = recursoActual.descargas || 0;
    if (previewEstado) previewEstado.textContent = recursoActual.activo ? 'Activo' : 'Inactivo';
    
    // Ocultar todos los medios primero
    if (previewImage) previewImage.classList.add('hidden');
    if (previewVideo) previewVideo.classList.add('hidden');
    if (previewDocument) previewDocument.classList.add('hidden');
    
    // Mostrar el medio correspondiente
    if (recursoActual.tipo === 'imagen') {
        if (previewImage) {
            previewImage.src = recursoActual.miniatura;
            previewImage.alt = recursoActual.nombre;
            previewImage.classList.remove('hidden');
        }
    } else if (recursoActual.tipo === 'video') {
        if (previewVideo) {
            previewVideo.src = recursoActual.miniatura;
            previewVideo.classList.remove('hidden');
        }
    } else {
        if (previewDocument) previewDocument.classList.remove('hidden');
    }
    
    // Configurar botón de editar si el usuario es administrador
    if (editResourceBtn) {
        if (currentUser?.rol === 'administrador') {
            editResourceBtn.style.display = 'inline-flex';
        } else {
            editResourceBtn.style.display = 'none';
        }
    }
    
    // Configurar botón de descarga
    if (downloadPreviewBtn) {
        downloadPreviewBtn.disabled = !recursoActual.activo;
        if (!recursoActual.activo) {
            downloadPreviewBtn.style.opacity = '0.5';
            downloadPreviewBtn.style.cursor = 'not-allowed';
        } else {
            downloadPreviewBtn.style.opacity = '1';
            downloadPreviewBtn.style.cursor = 'pointer';
        }
    }
    
    if (previewModal) {
        previewModal.classList.add('activo');
        previewModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

async function descargarRecurso() {
    if (!recursoActual) {
        showSystemMessage('No hay recurso seleccionado.', 'error');
        return;
    }
    
    try {
        // Mostrar loading
        mostrarLoadingGlobal('Preparando descarga...');
        
        // Registrar la descarga en Supabase
        if (currentUser) {
            await registrarDescarga(recursoActual.id);
        }
        
        // Incrementar contador localmente
        recursoActual.descargas = (recursoActual.descargas || 0) + 1;
        
        // Actualizar en el array de recursos
        const index = recursos.findIndex(r => r.id === recursoActual.id);
        if (index !== -1) {
            recursos[index].descargas = recursoActual.descargas;
        }
        
        // Preparar nombre de archivo
        const nombreArchivo = `${recursoActual.nombre.replace(/[^a-z0-9]/gi, '_')}.${recursoActual.formato || 'bin'}`;
        
        // Intentar descarga con método mejorado
        const descargaExitosa = await descargarArchivo(recursoActual.url, nombreArchivo);
        
        if (descargaExitosa) {
            mostrarToast(`Descargando: ${recursoActual.nombre}`);
            actualizarEstadisticas();
            
            // Actualizar la vista si está visible
            if (recursosGrid && !recursosGrid.classList.contains('hidden')) {
                renderizarRecursos();
            }
            
            // Cerrar modal
            closePreviewModal();
        } else {
            throw new Error('No se pudo iniciar la descarga');
        }
        
    } catch (error) {
        console.error('Error al descargar:', error);
        
        // Último fallback: abrir en nueva pestaña
        if (recursoActual && recursoActual.url) {
            window.open(recursoActual.url, '_blank');
            mostrarToast('Abriendo recurso en nueva pestaña');
        } else {
            showSystemMessage('No se pudo descargar el recurso.', 'error');
        }
        
    } finally {
        ocultarLoadingGlobal();
    }
}

// Función mejorada para descargar recursos
async function descargarArchivo(url, nombreArchivo) {
    try {
        // Método 1: Usar fetch y Blob (para mayor control)
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo;
        
        // Añadir al DOM y hacer clic
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
        return true;
        
    } catch (error) {
        console.log('Fallback a método simple:', error);
        
        // Método 2: Enlace simple con download
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.target = '_blank';
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
            
            return true;
        } catch (simpleError) {
            console.error('Error en método simple:', simpleError);
            return false;
        }
    }
}

async function descargarRecursoDesdeCard(recursoId) {
    recursoActual = recursos.find(r => r.id === recursoId);
    
    if (!recursoActual) {
        showSystemMessage('Recurso no encontrado.', 'error');
        return;
    }
    
    if (!recursoActual.activo) {
        showSystemMessage('Este recurso está desactivado y no se puede descargar.', 'error');
        return;
    }
    
    try {
        // Mostrar loading
        mostrarLoadingGlobal('Preparando descarga...');
        
        // Registrar descarga
        if (currentUser) {
            await registrarDescarga(recursoActual.id);
        }
        
        // Incrementar contador
        recursoActual.descargas = (recursoActual.descargas || 0) + 1;
        
        const index = recursos.findIndex(r => r.id === recursoActual.id);
        if (index !== -1) {
            recursos[index].descargas = recursoActual.descargas;
        }
        
        // Preparar nombre de archivo
        const nombreArchivo = `${recursoActual.nombre.replace(/[^a-z0-9]/gi, '_')}.${recursoActual.formato || 'bin'}`;
        
        // Intentar descarga con método mejorado
        const descargaExitosa = await descargarArchivo(recursoActual.url, nombreArchivo);
        
        if (descargaExitosa) {
            mostrarToast(`Descargando: ${recursoActual.nombre}`);
            actualizarEstadisticas();
            renderizarRecursos();
        } else {
            throw new Error('No se pudo iniciar la descarga');
        }
        
    } catch (error) {
        console.error('Error en descarga:', error);
        
        // Último fallback: abrir en nueva pestaña
        if (recursoActual && recursoActual.url) {
            window.open(recursoActual.url, '_blank');
            mostrarToast('Abriendo recurso en nueva pestaña');
        } else {
            showSystemMessage('No se pudo descargar el recurso.', 'error');
        }
        
    } finally {
        ocultarLoadingGlobal();
    }
}

async function registrarDescarga(recursoId) {
    try {
        // 1. Buscar el recurso actualizado
        const recurso = recursos.find(r => r.id === recursoId);
        if (!recurso) return;
        
        const nuevasDescargas = (recurso.descargas || 0) + 1;
        
        // 2. Actualizar en Supabase (solo si tenemos usuario)
        if (currentUser) {
            const { error: updateError } = await supabaseClient
                .from('recursos_multimedia')
                .update({ 
                    descargas: nuevasDescargas,
                    fecha_actualizacion: new Date().toISOString()
                })
                .eq('id', recursoId);
            
            if (updateError) {
                console.warn('Error actualizando contador en Supabase:', updateError);
            }
        }
        
        // 3. Actualizar localmente siempre
        recurso.descargas = nuevasDescargas;
        
        // 4. Registrar en historial (opcional)
        if (currentUser) {
            try {
                await supabaseClient
                    .from('historial_descargas')
                    .insert({
                        recurso_id: recursoId,
                        usuario_id: currentUser.id,
                        fecha_descarga: new Date().toISOString(),
                        user_agent: navigator.userAgent.substring(0, 200) // Limitar longitud
                    });
            } catch (historialError) {
                console.warn('Error registrando historial:', historialError);
            }
        }
        
    } catch (error) {
        console.error('Error registrando descarga:', error);
        // No interrumpir la descarga por errores de registro
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

// ===== FUNCIONES AUXILIARES =====
function mostrarSkeletonLoading() {
    if (!recursosGrid) return;
    
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
    if (!productsStats) return;
    
    const indiceInicio = (paginaActual - 1) * recursosPorPagina + 1;
    const indiceFin = Math.min(paginaActual * recursosPorPagina, recursosFiltrados.length);
    
    if (recursosFiltrados.length > 0) {
        productsStats.textContent = `Mostrando ${indiceInicio}-${indiceFin} de ${recursosFiltrados.length} recursos`;
    } else {
        productsStats.textContent = 'No hay recursos que coincidan';
    }
    
    if (productsCount) {
        productsCount.textContent = recursosFiltrados.length;
    }
}

function actualizarEstadisticas() {
    const totalRecursosCount = recursos.length;
    const totalDescargasCount = recursos.reduce((sum, recurso) => sum + (recurso.descargas || 0), 0);
    
    if (totalRecursos) {
        totalRecursos.textContent = `${totalRecursosCount} recursos`;
    }
    
    if (totalDescargas) {
        totalDescargas.textContent = `${totalDescargasCount} descargas`;
    }
}

function actualizarVistaLista(recursosPaginados) {
    if (!listaRecursosBody) return;
    
    let html = '';
    
    if (recursosPaginados.length === 0) {
        html = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: var(--gray-dark); margin-bottom: 15px;"></i>
                    <p style="color: var(--text-light);">No se encontraron recursos</p>
                </td>
            </tr>
        `;
    } else {
        recursosPaginados.forEach(recurso => {
            const formato = recurso.formato ? recurso.formato.toUpperCase() : 'N/A';
            const estadoBadge = recurso.activo 
                ? '<span class="status-badge active">Activo</span>' 
                : '<span class="status-badge inactive">Inactivo</span>';
            
            const adminActions = currentUser?.rol === 'administrador' ? `
                <div class="action-buttons">
                    <button class="btn btn-small btn-edit" onclick="openResourceModal('${recurso.id}')" 
                            aria-label="Editar ${recurso.nombre}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-toggle" onclick="openConfirmModal('toggle', '${recurso.id}', '${recurso.nombre.replace(/'/g, "\\'")}')" 
                            aria-label="${recurso.activo ? 'Desactivar' : 'Activar'} ${recurso.nombre}" 
                            title="${recurso.activo ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="btn btn-small btn-delete" onclick="openConfirmModal('delete', '${recurso.id}', '${recurso.nombre.replace(/'/g, "\\'")}')" 
                            aria-label="Eliminar ${recurso.nombre}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : `
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="abrirVistaPrevia('${recurso.id}')" 
                            aria-label="Vista previa de ${recurso.nombre}"
                            title="Vista previa">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-small btn-success" onclick="descargarRecursoDesdeCard('${recurso.id}')" 
                            aria-label="Descargar ${recurso.nombre}"
                            title="Descargar"
                            ${!recurso.activo ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
            
            html += `
                <tr ${!recurso.activo ? 'style="opacity: 0.7;"' : ''}>
                    <td>
                        <div class="recurso-item-lista">
                            <img src="${recurso.miniatura || 'https://via.placeholder.com/60x60/868e96/FFFFFF?text=IMG'}" 
                                 alt="${recurso.nombre}" 
                                 class="recurso-miniatura-lista"
                                 onerror="this.src='https://via.placeholder.com/60x60/868e96/FFFFFF?text=IMG'">
                            <div class="recurso-info-lista">
                                <h4>${recurso.nombre}</h4>
                                <p>${recurso.descripcion?.substring(0, 60) || 'Sin descripción'}${recurso.descripcion?.length > 60 ? '...' : ''}</p>
                                <small style="color: var(--text-light);">
                                    <i class="fas fa-file"></i> ${formato}
                                </small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="color: ${recurso.categoria?.color || '#868e96'}">
                            <i class="${recurso.categoria?.icono || 'fas fa-folder'}"></i> 
                            ${recurso.categoria?.nombre || 'Sin categoría'}
                        </span>
                    </td>
                    <td>${recurso.tipo ? recurso.tipo.charAt(0).toUpperCase() + recurso.tipo.slice(1) : 'Otro'}</td>
                    <td>${formato}</td>
                    <td>${recurso.tamano || 'N/A'}</td>
                    <td>
                        <span style="font-weight: 600; color: var(--primary-color);">
                            ${recurso.descargas || 0}
                        </span>
                    </td>
                    <td>${estadoBadge}</td>
                    <td>${adminActions}</td>
                </tr>
            `;
        });
    }
    
    listaRecursosBody.innerHTML = html;
}

// ===== INICIALIZACIÓN DE VISTAS =====
function inicializarVistas() {
    const vistaGuardada = localStorage.getItem('marketing_vista') || 'grid';
    cambiarVista(vistaGuardada);
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

// ===== FUNCIONES PARA FILTROS MÓVIL =====
function abrirFiltrosModal() {
    cargarFiltrosModal();
    if (filtrosModal) {
        filtrosModal.classList.add('activo');
        filtrosModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

function cerrarFiltrosModal() {
    if (filtrosModal) {
        filtrosModal.classList.remove('activo');
        filtrosModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function cargarFiltrosModal() {
    if (!filtrosModalContent) return;
    
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
    if (!filterBadge) return;
    
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

function sincronizarFiltrosMoviles() {
    // Limpiar contenido existente
    if (filtrosModalContent) {
        filtrosModalContent.innerHTML = '';
    }
    
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
    
    if (filtrosOpciones) {
        filtrosOpciones.classList.add('visible');
        filtrosOpciones.setAttribute('aria-hidden', 'false');
    }
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

function reiniciarFiltros() {
    estadoFiltros.categorias = [];
    estadoFiltros.tipos = [];
    estadoFiltros.formatos = [];
    estadoFiltros.busqueda = '';
    
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.remove('active');
    
    recursosFiltrados = [...recursos.filter(r => r.activo)];
    paginaActual = 1;
    
    actualizarContadorRecursos();
    renderizarRecursos();
    actualizarBadgeFiltro();
    
    mostrarToast('Filtros restablecidos');
    cerrarOpcionesFiltro();
}

function aplicarFiltros() {
    console.log('🔍 === APLICANDO FILTROS ===');
    console.log('Estado de filtros:', JSON.stringify(estadoFiltros, null, 2));
    
    // Si no hay filtros activos, mostrar todos los recursos activos
    const hayFiltrosActivos = 
        (estadoFiltros.categorias && estadoFiltros.categorias.length > 0) ||
        (estadoFiltros.tipos && estadoFiltros.tipos.length > 0) ||
        (estadoFiltros.formatos && estadoFiltros.formatos.length > 0) ||
        (estadoFiltros.busqueda && estadoFiltros.busqueda.trim() !== '');
    
    if (!hayFiltrosActivos) {
        console.log('No hay filtros activos, mostrando todos los recursos activos');
        recursosFiltrados = [...recursos.filter(r => r.activo)];
    } else {
        recursosFiltrados = recursos.filter(recurso => {
            // Filtrar solo recursos activos
            if (!recurso.activo) return false;
            
            let pasaFiltros = true;
            
            // Filtro por categoría
            if (estadoFiltros.categorias && estadoFiltros.categorias.length > 0) {
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
            
            // Filtro por formato
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

// ===== FUNCIONALIDADES DE ADMINISTRADOR =====
function toggleDashboard() {
    if (!dashboardSection) return;
    
    dashboardSection.classList.toggle('visible');
    
    const toggleBtn = dashboardSection.querySelector('.btn-secondary');
    if (toggleBtn) {
        if (dashboardSection.classList.contains('visible')) {
            toggleBtn.innerHTML = '<i class="fas fa-times"></i> Ocultar';
            actualizarDashboard();
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Ver Dashboard';
        }
    }
}

function actualizarDashboard() {
    if (!dashboardSection || !dashboardSection.classList.contains('visible')) return;
    
    // Actualizar estadísticas generales
    const totalRecursosCount = recursos.length;
    const totalDescargasCount = recursos.reduce((sum, recurso) => sum + (recurso.descargas || 0), 0);
    const totalUsuariosCount = usuarios.length;
    const totalCategoriasCount = categorias.length;
    
    if (totalRecursosDashboard) totalRecursosDashboard.textContent = totalRecursosCount;
    if (totalDescargasDashboard) totalDescargasDashboard.textContent = totalDescargasCount;
    if (totalUsuariosDashboard) totalUsuariosDashboard.textContent = totalUsuariosCount;
    if (totalCategoriasDashboard) totalCategoriasDashboard.textContent = totalCategoriasCount;
    
    // Actualizar estadísticas por tipo
    actualizarEstadisticasPorTipo();
    
    // Actualizar recursos recientes
    actualizarRecursosRecientes();
    
    // Actualizar distribución por categoría
    actualizarDistribucionCategorias();
}

function actualizarEstadisticasPorTipo() {
    if (!typeStats) return;
    
    const tiposCount = {};
    recursos.forEach(recurso => {
        const tipo = recurso.tipo || 'otro';
        tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    });
    
    let html = '';
    tiposRecursos.forEach(tipo => {
        const count = tiposCount[tipo.id] || 0;
        if (count > 0) {
            html += `
                <div class="type-stat-item ${tipo.id}">
                    <div class="type-stat-info">
                        <i class="${tipo.icono}"></i>
                        <span>${tipo.nombre}</span>
                    </div>
                    <span class="type-stat-count">${count}</span>
                </div>
            `;
        }
    });
    
    typeStats.innerHTML = html || '<p class="no-data">No hay datos disponibles</p>';
}

function actualizarRecursosRecientes() {
    if (!recentResources) return;
    
    // Ordenar recursos por fecha de creación (más recientes primero)
    const recursosRecientes = [...recursos]
        .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
        .slice(0, 5);
    
    let html = '';
    recursosRecientes.forEach(recurso => {
        const tipoIcono = tiposRecursos.find(t => t.id === recurso.tipo)?.icono || 'fas fa-file';
        const tipoClase = recurso.tipo || 'otro';
        const fecha = new Date(recurso.fecha_creacion).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
        });
        
        html += `
            <div class="recent-resource-item">
                <div class="recent-resource-icon ${tipoClase}">
                    <i class="${tipoIcono}"></i>
                </div>
                <div class="recent-resource-info">
                    <div class="recent-resource-name">${recurso.nombre}</div>
                    <div class="recent-resource-date">${fecha}</div>
                </div>
                <span class="recent-resource-count">${recurso.descargas || 0}</span>
            </div>
        `;
    });
    
    recentResources.innerHTML = html || '<p class="no-data">No hay recursos recientes</p>';
}

function actualizarDistribucionCategorias() {
    if (!categoryStats) return;
    
    const categoriasCount = {};
    recursos.forEach(recurso => {
        const categoriaId = recurso.categoria_id || 'sin-categoria';
        categoriasCount[categoriaId] = (categoriasCount[categoriaId] || 0) + 1;
    });
    
    let html = '';
    categorias.forEach(categoria => {
        const count = categoriasCount[categoria.id] || 0;
        if (count > 0) {
            html += `
                <div class="category-stat-item">
                    <div style="display: flex; align-items: center;">
                        <div class="category-stat-color" style="background-color: ${categoria.color || '#868e96'}"></div>
                        <span class="category-stat-name">${categoria.nombre}</span>
                    </div>
                    <span class="category-stat-count">${count}</span>
                </div>
            `;
        }
    });
    
    categoryStats.innerHTML = html || '<p class="no-data">No hay datos disponibles</p>';
}

// ===== MODALES ADMINISTRATIVOS =====
function openResourceModal(editingId = null) {
    if (!resourceModal) return;
    
    editingResourceId = editingId;
    
    // Cargar categorías en el select
    const categorySelect = document.getElementById('resourceCategory');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Selecciona una categoría</option>' +
            categorias.map(cat => 
                `<option value="${cat.id}">${cat.nombre}</option>`
            ).join('');
    }
    
    if (editingId) {
        // Modo edición
        if (resourceModalTitle) {
            resourceModalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Recurso';
        }
        if (saveResourceBtn) {
            saveResourceBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Recurso';
        }
        
        // Buscar el recurso a editar
        const recurso = recursos.find(r => r.id === editingId);
        if (recurso) {
            // Llenar el formulario con los datos del recurso
            document.getElementById('resourceName').value = recurso.nombre || '';
            document.getElementById('resourceDescription').value = recurso.descripcion || '';
            document.getElementById('resourceCategory').value = recurso.categoria_id || '';
            document.getElementById('resourceType').value = recurso.tipo || '';
            document.getElementById('resourceFormat').value = recurso.formato || '';
            document.getElementById('resourceSize').value = parseFloat(recurso.tamano) || 0;
            document.getElementById('resourceUrl').value = recurso.url || '';
            document.getElementById('resourceThumbnail').value = recurso.miniatura || '';
            document.getElementById('resourceTags').value = recurso.etiquetas?.join(', ') || '';
            document.getElementById('resourceStatus').value = recurso.activo ? 'true' : 'false';
            document.getElementById('resourceDownloads').value = recurso.descargas || 0;
        }
    } else {
        // Modo agregar
        if (resourceModalTitle) {
            resourceModalTitle.innerHTML = '<i class="fas fa-plus"></i> Agregar Nuevo Recurso';
        }
        if (saveResourceBtn) {
            saveResourceBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Recurso';
        }
        
        // Limpiar el formulario
        if (resourceForm) resourceForm.reset();
        const statusSelect = document.getElementById('resourceStatus');
        if (statusSelect) statusSelect.value = 'true';
        const downloadsInput = document.getElementById('resourceDownloads');
        if (downloadsInput) downloadsInput.value = 0;
    }
    
    // Mostrar modal
    resourceModal.classList.add('activo');
    resourceModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Enfocar el primer campo
    const nameInput = document.getElementById('resourceName');
    if (nameInput) nameInput.focus();
}

function closeResourceModal() {
    if (!resourceModal) return;
    
    resourceModal.classList.remove('activo');
    resourceModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    editingResourceId = null;
}

async function saveResource() {
    // Validar que el formulario existe
    if (!resourceForm) {
        showSystemMessage('Error: formulario no encontrado', 'error');
        return;
    }
    
    // Validar formulario
    if (!resourceForm.checkValidity()) {
        showSystemMessage('Por favor completa todos los campos requeridos.', 'error');
        return;
    }
    
    // Recopilar datos del formulario
    const resourceData = {
        nombre: document.getElementById('resourceName').value.trim(),
        descripcion: document.getElementById('resourceDescription').value.trim(),
        categoria_id: parseInt(document.getElementById('resourceCategory').value),
        tipo: document.getElementById('resourceType').value,
        formato: document.getElementById('resourceFormat').value,
        tamano: parseFloat(document.getElementById('resourceSize').value),
        url: document.getElementById('resourceUrl').value.trim(),
        miniatura: document.getElementById('resourceThumbnail').value.trim() || null,
        etiquetas: document.getElementById('resourceTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0),
        activo: document.getElementById('resourceStatus').value === 'true',
        descargas: parseInt(document.getElementById('resourceDownloads').value) || 0,
        fecha_actualizacion: new Date().toISOString()
    };
    
    // Validaciones adicionales
    if (resourceData.tamano <= 0) {
        showSystemMessage('El tamaño debe ser mayor que 0', 'error');
        return;
    }
    
    // Si no hay miniatura, usar la URL principal para imágenes
    if (!resourceData.miniatura && resourceData.tipo === 'imagen') {
        resourceData.miniatura = resourceData.url;
    }
    
    try {
        mostrarLoadingGlobal(editingResourceId ? 'Actualizando recurso...' : 'Guardando recurso...');
        
        let result;
        
        if (editingResourceId) {
            // Actualizar recurso existente
            const { data, error } = await supabaseClient
                .from('recursos_multimedia')
                .update(resourceData)
                .eq('id', editingResourceId)
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            
            // Actualizar en el array local
            const index = recursos.findIndex(r => r.id === editingResourceId);
            if (index !== -1) {
                recursos[index] = { 
                    ...recursos[index], 
                    ...resourceData,
                    categoria: categorias.find(c => c.id === resourceData.categoria_id) || {
                        id: resourceData.categoria_id,
                        nombre: 'Sin categoría',
                        color: '#868e96',
                        icono: 'fas fa-folder'
                    }
                };
            }
            
            showSystemMessage('Recurso actualizado correctamente.', 'success');
        } else {
            // Agregar nuevo recurso
            resourceData.fecha_creacion = new Date().toISOString();
            resourceData.fecha_actualizacion = new Date().toISOString();
            
            const { data, error } = await supabaseClient
                .from('recursos_multimedia')
                .insert([resourceData])
                .select()
                .single();
            
            if (error) throw error;
            result = data;
            
            // Agregar al array local
            recursos.unshift({
                ...resourceData,
                id: result.id,
                categoria: categorias.find(c => c.id === resourceData.categoria_id) || {
                    id: resourceData.categoria_id,
                    nombre: 'Sin categoría',
                    color: '#868e96',
                    icono: 'fas fa-folder'
                }
            });
            
            showSystemMessage('Recurso agregado correctamente.', 'success');
        }
        
        // Recargar recursos
        recursosFiltrados = [...recursos.filter(r => r.activo)];
        paginaActual = 1;
        renderizarRecursos();
        
        // Actualizar dashboard si está visible
        if (dashboardSection && dashboardSection.classList.contains('visible')) {
            actualizarDashboard();
        }
        
        actualizarEstadisticas();
        
        // Cerrar modal
        closeResourceModal();
        
    } catch (error) {
        console.error('Error guardando recurso:', error);
        showSystemMessage(`Error al guardar el recurso: ${error.message}`, 'error');
    } finally {
        ocultarLoadingGlobal();
    }
}

async function deleteResource(resourceId) {
    if (!resourceId) return;
    
    try {
        mostrarLoadingGlobal('Eliminando recurso...');
        
        // Marcar como inactivo en Supabase (borrado lógico)
        const { error } = await supabaseClient
            .from('recursos_multimedia')
            .update({ 
                activo: false,
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', resourceId);
        
        if (error) throw error;
        
        // Eliminar del array local
        const index = recursos.findIndex(r => r.id === resourceId);
        if (index !== -1) {
            recursos.splice(index, 1);
        }
        
        // Recargar recursos
        recursosFiltrados = recursosFiltrados.filter(r => r.id !== resourceId);
        renderizarRecursos();
        
        // Actualizar dashboard si está visible
        if (dashboardSection && dashboardSection.classList.contains('visible')) {
            actualizarDashboard();
        }
        
        actualizarEstadisticas();
        
        showSystemMessage('Recurso eliminado correctamente.', 'success');
        
    } catch (error) {
        console.error('Error eliminando recurso:', error);
        showSystemMessage(`Error al eliminar el recurso: ${error.message}`, 'error');
    } finally {
        ocultarLoadingGlobal();
        closeConfirmModal();
    }
}

async function toggleResourceStatus(resourceId) {
    if (!resourceId) return;
    
    try {
        const recurso = recursos.find(r => r.id === resourceId);
        if (!recurso) return;
        
        const nuevoEstado = !recurso.activo;
        
        mostrarLoadingGlobal(nuevoEstado ? 'Activando recurso...' : 'Desactivando recurso...');
        
        // Actualizar en Supabase
        const { error } = await supabaseClient
            .from('recursos_multimedia')
            .update({ 
                activo: nuevoEstado,
                fecha_actualizacion: new Date().toISOString()
            })
            .eq('id', resourceId);
        
        if (error) throw error;
        
        // Actualizar localmente
        recurso.activo = nuevoEstado;
        
        // Actualizar vista
        recursosFiltrados = [...recursos.filter(r => r.activo)];
        renderizarRecursos();
        
        // Actualizar dashboard si está visible
        if (dashboardSection && dashboardSection.classList.contains('visible')) {
            actualizarDashboard();
        }
        
        showSystemMessage(
            nuevoEstado ? 'Recurso activado correctamente.' : 'Recurso desactivado correctamente.',
            'success'
        );
        
    } catch (error) {
        console.error('Error cambiando estado del recurso:', error);
        showSystemMessage(`Error al cambiar el estado: ${error.message}`, 'error');
    } finally {
        ocultarLoadingGlobal();
        closeConfirmModal();
    }
}

function openConfirmModal(action, resourceId, resourceName = '') {
    if (!confirmModal) return;
    
    switch(action) {
        case 'delete':
            if (confirmModalTitle) confirmModalTitle.textContent = '¿Eliminar recurso?';
            if (confirmModalMessage) {
                confirmModalMessage.textContent = `¿Estás seguro de que deseas eliminar el recurso "${resourceName}"? Esta acción no se puede deshacer.`;
            }
            break;
        case 'toggle':
            const recurso = recursos.find(r => r.id === resourceId);
            if (confirmModalTitle) {
                confirmModalTitle.textContent = recurso?.activo ? '¿Desactivar recurso?' : '¿Activar recurso?';
            }
            if (confirmModalMessage) {
                confirmModalMessage.textContent = recurso?.activo 
                    ? `¿Estás seguro de que deseas desactivar el recurso "${resourceName}"? Los usuarios no podrán verlo.`
                    : `¿Estás seguro de que deseas activar el recurso "${resourceName}"? Los usuarios podrán verlo y descargarlo.`;
            }
            break;
    }
    
    // Configurar acción del botón de confirmación
    if (confirmActionBtn) {
        confirmActionBtn.onclick = function() {
            if (action === 'delete') {
                deleteResource(resourceId);
            } else if (action === 'toggle') {
                toggleResourceStatus(resourceId);
            }
        };
    }
    
    // Mostrar modal
    confirmModal.classList.add('activo');
    confirmModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
    if (!confirmModal) return;
    
    confirmModal.classList.remove('activo');
    confirmModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

async function exportData() {
    try {
        mostrarLoadingGlobal('Preparando exportación...');
        
        const exportData = {
            fecha_exportacion: new Date().toISOString(),
            total_recursos: recursos.length,
            total_descargas: recursos.reduce((sum, r) => sum + (r.descargas || 0), 0),
            recursos: recursos.map(r => ({
                nombre: r.nombre,
                descripcion: r.descripcion,
                categoria: r.categoria?.nombre || 'Sin categoría',
                tipo: r.tipo,
                formato: r.formato,
                tamano: r.tamano,
                descargas: r.descargas || 0,
                estado: r.activo ? 'Activo' : 'Inactivo',
                fecha_creacion: r.fecha_creacion,
                fecha_actualizacion: r.fecha_actualizacion,
                etiquetas: r.etiquetas?.join(', ') || ''
            })),
            estadisticas: {
                por_tipo: tiposRecursos.map(tipo => ({
                    tipo: tipo.nombre,
                    cantidad: recursos.filter(r => r.tipo === tipo.id).length
                })),
                por_categoria: categorias.map(cat => ({
                    categoria: cat.nombre,
                    cantidad: recursos.filter(r => r.categoria_id === cat.id).length
                }))
            }
        };
        
        // Convertir a JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = `exportacion_recursos_${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        mostrarToast('Datos exportados correctamente');
        
    } catch (error) {
        console.error('Error exportando datos:', error);
        showSystemMessage('Error al exportar los datos.', 'error');
    } finally {
        ocultarLoadingGlobal();
    }
}

// ===== FUNCIONES PARA MODALES =====
function closePasswordModal() {
    if (!passwordModal) return;
    
    passwordModal.classList.remove('activo');
    passwordModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function showPasswordModal() {
    if (!passwordModal) return;
    
    passwordModal.classList.add('activo');
    passwordModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
}

function closePreviewModal() {
    if (!previewModal) return;
    
    previewModal.classList.remove('activo');
    previewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Limpiar recursos multimedia
    if (previewVideo && previewVideo.src) {
        previewVideo.pause();
        previewVideo.src = '';
    }
    if (previewImage) previewImage.src = '';
    recursoActual = null;
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
window.cargarRecursosDesdeSupabase = cargarRecursosDesdeSupabase;
window.cambiarVista = cambiarVista;
window.toggleDashboard = toggleDashboard;
window.openResourceModal = openResourceModal;
window.openConfirmModal = openConfirmModal;
window.closeResourceModal = closeResourceModal;
window.closeConfirmModal = closeConfirmModal;
window.exportData = exportData;