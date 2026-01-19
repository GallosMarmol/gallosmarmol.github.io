// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = 'https://fzdwqkoporxnzvhpmlls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZHdxa29wb3J4bnp2aHBtbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDkxMDYsImV4cCI6MjA3NzM4NTEwNn0.nOS3oByMmopchYhH0Kv1I0lxi02VkqfsC-eGFTZ_ePg';

// Inicializar Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let activos = [];
let categorias = [];
let departamentos = [];
let estados = [];
let ubicaciones = [];
let responsables = [];
let proveedores = [];
let editingActivoId = null;
let currentEmail = '';
let userHasPassword = false;

// Variables para dashboard
let estadisticas = {
    total: 0,
    operativos: 0,
    mantenimiento: 0,
    depreciados: 0,
    valorTotal: 0
};

// Variables para filtros y paginación
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 12;
let busquedaTimeout = null;

// Estado de los filtros
const estadoFiltros = {
    categorias: [],
    departamentos: [],
    estados: [],
    ubicaciones: [],
    responsables: [],
    proveedores: [],
    busqueda: ''
};

// Variables para acciones de confirmación
let pendingAction = null;
let pendingActionData = null;

// Variables para dashboard
let categoriaChart = null;
let departamentoChart = null;
let adquisicionChart = null;

// ===== ELEMENTOS DEL DOM =====
// Login (igual que repuestos)
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

// Dashboard
const dashboardSection = document.getElementById('dashboardSection');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const totalActivos = document.getElementById('totalActivos');
const activosOperativos = document.getElementById('activosOperativos');
const activosMantenimiento = document.getElementById('activosMantenimiento');
const activosDepreciados = document.getElementById('activosDepreciados');
const valorTotal = document.getElementById('valorTotal');

// Header
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const userRole = document.getElementById('userRole');

// Búsqueda
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// Filtros
const filtrosFijos = document.getElementById('filtros-fijos');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
const filtrosOpciones = document.getElementById('filtros-opciones');

// Activos
const activosGrid = document.getElementById('activosGrid');
const addActivoBtn = document.getElementById('addActivoBtn');
const exportBtn = document.getElementById('exportBtn');
const activosStats = document.getElementById('activos-stats');
const activosCount = document.getElementById('activos-count');
const pagination = document.getElementById('pagination');

// Modales
const activoModal = document.getElementById('activoModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveActivoBtn = document.getElementById('saveActivoBtn');
const modalTitleText = document.getElementById('modalTitleText');
const activoForm = document.getElementById('activoForm');

// Modal detalles
const detalleModal = document.getElementById('detalleModal');
const closeDetalleModalBtn = document.getElementById('closeDetalleModalBtn');
const imprimirDetalleBtn = document.getElementById('imprimirDetalleBtn');
const editarDesdeDetalleBtn = document.getElementById('editarDesdeDetalleBtn');

// Modal historial
const historialModal = document.getElementById('historialModal');
const closeHistorialModalBtn = document.getElementById('closeHistorialModalBtn');
const cerrarHistorialBtn = document.getElementById('cerrarHistorialBtn');
const agregarMantenimientoBtn = document.getElementById('agregarMantenimientoBtn');

const confirmationModal = document.getElementById('confirmationModal');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const confirmActionBtn = document.getElementById('confirmActionBtn');
const confirmationTitle = document.getElementById('confirmationTitle');
const confirmationMessage = document.getElementById('confirmationMessage');

const passwordModal = document.getElementById('passwordModal');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Mensajes
const systemMessage = document.getElementById('systemMessage');

// Elementos para filtros móvil (se mantienen igual que en repuestos)

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Verificar sesión
    checkSession();
    
    // Inicializar tema
    initTheme();
    
    // Eventos de login (igual que repuestos)
    verifyEmailBtn.addEventListener('click', verifyEmail);
    loginBtn.addEventListener('click', loginWithPassword);
    backToEmailBtn.addEventListener('click', () => {
        passwordStep.classList.add('hidden');
        emailStep.classList.remove('hidden');
        clearLoginMessage();
    });
    
    // Toggle visibilidad de contraseña
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, passwordInput, togglePasswordBtn));
    if (toggleNewPasswordBtn) {
        toggleNewPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, newPasswordInput, toggleNewPasswordBtn));
    }
    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, confirmPasswordInput, toggleConfirmPasswordBtn));
    }
    
    // Header actions
    themeToggle.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', logout);
    
    // Dashboard
    dashboardBtn.addEventListener('click', toggleDashboard);
    refreshStatsBtn.addEventListener('click', actualizarEstadisticas);
    
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
    
    // Modal activo
    addActivoBtn.addEventListener('click', () => openActivoModal());
    exportBtn.addEventListener('click', exportarAExcel);
    closeModalBtn.addEventListener('click', closeActivoModal);
    cancelModalBtn.addEventListener('click', closeActivoModal);
    saveActivoBtn.addEventListener('click', saveActivo);
    
    // Modal detalles
    closeDetalleModalBtn.addEventListener('click', closeDetalleModal);
    imprimirDetalleBtn.addEventListener('click', imprimirDetalles);
    editarDesdeDetalleBtn.addEventListener('click', editarDesdeDetalle);
    
    // Modal historial
    closeHistorialModalBtn.addEventListener('click', closeHistorialModal);
    cerrarHistorialBtn.addEventListener('click', closeHistorialModal);
    agregarMantenimientoBtn.addEventListener('click', agregarMantenimiento);
    
    // Modal contraseña
    closePasswordModalBtn.addEventListener('click', closePasswordModal);
    cancelPasswordBtn.addEventListener('click', closePasswordModal);
    savePasswordBtn.addEventListener('click', createPassword);
    
    // Modal confirmación
    confirmCancelBtn.addEventListener('click', closeConfirmationModal);
    
    // Cerrar modales al hacer clic fuera
    activoModal.addEventListener('click', (e) => {
        if (e.target === activoModal) closeActivoModal();
    });
    
    detalleModal.addEventListener('click', (e) => {
        if (e.target === detalleModal) closeDetalleModal();
    });
    
    historialModal.addEventListener('click', (e) => {
        if (e.target === historialModal) closeHistorialModal();
    });
    
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) closePasswordModal();
    });
    
    confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal) closeConfirmationModal();
    });
    
    // Eventos para cálculo de depreciación
    document.getElementById('activoValor')?.addEventListener('input', calcularDepreciacion);
    document.getElementById('activoFechaAdquisicion')?.addEventListener('change', calcularDepreciacion);
    document.getElementById('activoVidaUtil')?.addEventListener('input', calcularDepreciacion);
    document.getElementById('activoValorResidual')?.addEventListener('input', calcularDepreciacion);
    
    // Enter key para formularios
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyEmail();
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginWithPassword();
    });
    
    newPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createPassword();
    });
    
    confirmPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createPassword();
    });
    
    // Esc para cerrar modales
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (activoModal.classList.contains('activo')) closeActivoModal();
            if (detalleModal.classList.contains('activo')) closeDetalleModal();
            if (historialModal.classList.contains('activo')) closeHistorialModal();
            if (passwordModal.classList.contains('activo')) closePasswordModal();
            if (confirmationModal.classList.contains('activo')) closeConfirmationModal();
        }
    });
    
    // Eventos para filtros móvil (igual que repuestos)
    // ... (código igual que en repuestos.js)
    
    console.log('Sistema de Activos inicializado');
});

// ===== FUNCIONES DE TEMA (igual que repuestos) =====
function initTheme() {
    const savedTheme = localStorage.getItem('activos_theme') || 'light';
    const savedLogoTheme = localStorage.getItem('activos_logo_theme') || 'light';
    
    const loginLogoLight = document.getElementById('loginLogoLight');
    const loginLogoDark = document.getElementById('loginLogoDark');
    const headerLogoLight = document.getElementById('headerLogoLight');
    const headerLogoDark = document.getElementById('headerLogoDark');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.add('hidden');
            loginLogoDark.classList.remove('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.add('hidden');
            headerLogoDark.classList.remove('hidden');
        }
        
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.remove('hidden');
            loginLogoDark.classList.add('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.remove('hidden');
            headerLogoDark.classList.add('hidden');
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    
    const loginLogoLight = document.getElementById('loginLogoLight');
    const loginLogoDark = document.getElementById('loginLogoDark');
    const headerLogoLight = document.getElementById('headerLogoLight');
    const headerLogoDark = document.getElementById('headerLogoDark');
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    if (isDarkMode) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.add('hidden');
            loginLogoDark.classList.remove('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.add('hidden');
            headerLogoDark.classList.remove('hidden');
        }
        
        localStorage.setItem('activos_theme', 'dark');
        localStorage.setItem('activos_logo_theme', 'dark');
        
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.remove('hidden');
            loginLogoDark.classList.add('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.remove('hidden');
            headerLogoDark.classList.add('hidden');
        }
        
        localStorage.setItem('activos_theme', 'light');
        localStorage.setItem('activos_logo_theme', 'light');
    }
}

function togglePasswordVisibility(input, button) {
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    button.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

// ===== FUNCIONES DE AUTENTICACIÓN (igual que repuestos) =====
async function checkSession() {
    try {
        const userSession = localStorage.getItem('activos_user_session');
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
                localStorage.removeItem('activos_user_session');
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
            .select('id, nombre, apellido, correo, activo, sistemas_acceso, contrasena_hash, bloqueado_hasta, intentos_fallidos')
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
        
        if (userData.bloqueado_hasta) {
            const bloqueadoHasta = new Date(userData.bloqueado_hasta);
            const ahora = new Date();
            
            if (ahora < bloqueadoHasta) {
                const minutosRestantes = Math.ceil((bloqueadoHasta - ahora) / (1000 * 60));
                showLoginMessage(`Cuenta bloqueada. Intenta nuevamente en ${minutosRestantes} minutos.`, 'error');
                showLoginLoading(false);
                return;
            }
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
        
        if (userData.bloqueado_hasta) {
            const bloqueadoHasta = new Date(userData.bloqueado_hasta);
            const ahora = new Date();
            
            if (ahora < bloqueadoHasta) {
                const minutosRestantes = Math.ceil((bloqueadoHasta - ahora) / (1000 * 60));
                showLoginMessage(`Cuenta bloqueada. Intenta nuevamente en ${minutosRestantes} minutos.`, 'error');
                showLoginLoading(false);
                return;
            }
        }
        
        const inputHash = await hashPassword(password);
        
        if (inputHash === userData.contrasena_hash) {
            await supabaseClient
                .from('usuario')
                .update({ 
                    intentos_fallidos: 0,
                    bloqueado_hasta: null,
                    fecha_ultimo_acceso: new Date().toISOString(),
                    fecha_actualizacion: new Date().toISOString()
                })
                .eq('correo', currentEmail);
            
            localStorage.setItem('activos_user_session', JSON.stringify({
                email: currentEmail,
                timestamp: new Date().toISOString()
            }));
            
            currentUser = userData;
            showApp();
            cargarDatosIniciales();
            showLoginLoading(false);
            
        } else {
            const nuevosIntentos = (userData.intentos_fallidos || 0) + 1;
            let bloqueadoHasta = null;
            
            if (nuevosIntentos >= 3) {
                bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            }
            
            await supabaseClient
                .from('usuario')
                .update({ 
                    intentos_fallidos: nuevosIntentos,
                    bloqueado_hasta: bloqueadoHasta,
                    fecha_actualizacion: new Date().toISOString()
                })
                .eq('correo', currentEmail);
            
            if (bloqueadoHasta) {
                showLoginMessage('Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.', 'error');
            } else {
                const intentosRestantes = 3 - nuevosIntentos;
                showLoginMessage(`Contraseña incorrecta. Te quedan ${intentosRestantes} intentos.`, 'error');
            }
            
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
    
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
        showLoginMessage(passwordError, 'error');
        return;
    }
    
    if (!newPassword || !confirmPassword) {
        showLoginMessage('Por favor completa todos los campos.', 'error');
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
    localStorage.removeItem('activos_user_session');
    currentUser = null;
    showLogin();
}

// ===== FUNCIONES DASHBOARD =====
function toggleDashboard() {
    const isVisible = !dashboardSection.classList.contains('hidden');
    if (isVisible) {
        dashboardSection.classList.add('hidden');
        dashboardBtn.classList.remove('active');
    } else {
        dashboardSection.classList.remove('hidden');
        dashboardBtn.classList.add('active');
        actualizarEstadisticas();
        actualizarGraficos();
    }
}

async function actualizarEstadisticas() {
    if (!activos.length) return;
    
    const total = activos.length;
    const operativos = activos.filter(a => 
        a.estado && a.estado.nombre.toLowerCase().includes('operativo')
    ).length;
    
    const mantenimiento = activos.filter(a => 
        a.estado && a.estado.nombre.toLowerCase().includes('mantenimiento')
    ).length;
    
    const depreciados = activos.filter(a => {
        if (!a.fecha_adquisicion || !a.valor_adquisicion || !a.vida_util) return false;
        
        const fechaAdquisicion = new Date(a.fecha_adquisicion);
        const hoy = new Date();
        const añosTranscurridos = (hoy - fechaAdquisicion) / (1000 * 60 * 60 * 24 * 365);
        
        return añosTranscurridos >= a.vida_util;
    }).length;
    
    const valorTotal = activos.reduce((sum, activo) => {
        return sum + (parseFloat(activo.valor_actual) || parseFloat(activo.valor_adquisicion) || 0);
    }, 0);
    
    estadisticas = {
        total,
        operativos,
        mantenimiento,
        depreciados,
        valorTotal
    };
    
    // Actualizar UI
    totalActivos.textContent = total;
    activosOperativos.textContent = operativos;
    activosMantenimiento.textContent = mantenimiento;
    activosDepreciados.textContent = depreciados;
    valorTotal.textContent = `$${valorTotal.toFixed(2)}`;
    
    // Actualizar gráficos
    actualizarGraficos();
}

function actualizarGraficos() {
    if (!window.Chart) {
        console.warn('Chart.js no está disponible');
        return;
    }
    
    // Destruir gráficos existentes
    if (categoriaChart) categoriaChart.destroy();
    if (departamentoChart) departamentoChart.destroy();
    if (adquisicionChart) adquisicionChart.destroy();
    
    // Gráfico por categoría
    const categoriasData = {};
    activos.forEach(activo => {
        const categoria = activo.categoria?.nombre || 'Sin categoría';
        categoriasData[categoria] = (categoriasData[categoria] || 0) + 1;
    });
    
    const categoriaCtx = document.getElementById('categoriaChart')?.getContext('2d');
    if (categoriaCtx) {
        categoriaChart = new Chart(categoriaCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoriasData),
                datasets: [{
                    data: Object.values(categoriasData),
                    backgroundColor: [
                        '#0066cc', '#00a86b', '#ff9900', '#cc3300',
                        '#9966ff', '#ff6699', '#6699ff', '#33cccc'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color')
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico por departamento
    const departamentosData = {};
    activos.forEach(activo => {
        const departamento = activo.departamento?.nombre || 'Sin departamento';
        departamentosData[departamento] = (departamentosData[departamento] || 0) + 1;
    });
    
    const departamentoCtx = document.getElementById('departamentoChart')?.getContext('2d');
    if (departamentoCtx) {
        departamentoChart = new Chart(departamentoCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(departamentosData),
                datasets: [{
                    label: 'Activos',
                    data: Object.values(departamentosData),
                    backgroundColor: '#0066cc',
                    borderColor: '#004a99',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-light')
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color')
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-light')
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color')
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color')
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico por año de adquisición
    const adquisicionesData = {};
    activos.forEach(activo => {
        if (activo.fecha_adquisicion) {
            const año = new Date(activo.fecha_adquisicion).getFullYear();
            adquisicionesData[año] = (adquisicionesData[año] || 0) + 1;
        }
    });
    
    const adquisicionCtx = document.getElementById('adquisicionChart')?.getContext('2d');
    if (adquisicionCtx) {
        adquisicionChart = new Chart(adquisicionCtx, {
            type: 'line',
            data: {
                labels: Object.keys(adquisicionesData).sort(),
                datasets: [{
                    label: 'Adquisiciones',
                    data: Object.keys(adquisicionesData).sort().map(año => adquisicionesData[año]),
                    borderColor: '#00a86b',
                    backgroundColor: 'rgba(0, 168, 107, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-light')
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color')
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-light')
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border-color')
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-color')
                        }
                    }
                }
            }
        });
    }
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
    dashboardSection.classList.remove('hidden');
}

function updateUserInfo() {
    if (currentUser) {
        const initials = `${currentUser.nombre?.charAt() || ''}`;
        userAvatar.textContent = initials.toUpperCase() || 'A';
        
        userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
        
        let role = 'Usuario';
        if (currentUser.sistemas_acceso?.sistemaActivos?.rol === 'administrador') {
            role = 'Administrador';
        } else if (currentUser.sistemas_acceso?.sistemaActivos?.rol === 'supervisor') {
            role = 'Supervisor';
        }
        userRole.textContent = role;
    }
}

// ===== FUNCIONES PARA CARGAR DATOS =====
async function cargarDatosIniciales() {
    try {
        await Promise.all([
            cargarCategorias(),
            cargarDepartamentos(),
            cargarUbicaciones(),
            cargarEstados(),
            cargarResponsables(),
            cargarProveedores(),
            cargarActivos()
        ]);
        
        renderizarActivos();
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        showSystemMessage('Error al cargar los datos iniciales.', 'error');
    }
}

async function cargarCategorias() {
    try {
        const { data, error } = await supabaseClient
            .from('categoria_activo')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        categorias = data || [];
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categorias = [];
    }
}

async function cargarDepartamentos() {
    try {
        const { data, error } = await supabaseClient
            .from('departamento')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        departamentos = data || [];
        
    } catch (error) {
        console.error('Error cargando departamentos:', error);
        departamentos = [];
    }
}

async function cargarUbicaciones() {
    try {
        const { data, error } = await supabaseClient
            .from('ubicacion')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        ubicaciones = data || [];
        
    } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        ubicaciones = [];
    }
}

async function cargarEstados() {
    try {
        const { data, error } = await supabaseClient
            .from('estado_activo')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        estados = data || [];
        
    } catch (error) {
        console.error('Error cargando estados:', error);
        estados = [];
    }
}

async function cargarResponsables() {
    try {
        const { data, error } = await supabaseClient
            .from('usuario')
            .select('id, nombre, apellido, correo, activo')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        responsables = data || [];
        
    } catch (error) {
        console.error('Error cargando responsables:', error);
        responsables = [];
    }
}

async function cargarProveedores() {
    try {
        const { data, error } = await supabaseClient
            .from('proveedor')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        proveedores = data || [];
        
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        proveedores = [];
    }
}

async function cargarActivos() {
    try {
        console.log('Iniciando carga de activos...');
        
        const { data: activosData, error } = await supabaseClient
            .from('activo')
            .select(`
                *,
                categoria:categoria_activo (*),
                departamento (*),
                estado:estado_activo (*),
                ubicacion (*),
                responsable:usuario!responsable_id (id, nombre, apellido),
                proveedor (*)
            `)
            .order('creado_en', { ascending: false });
        
        if (error) {
            console.error('Error en consulta:', error);
            throw error;
        }
        
        console.log('Activos cargados:', activosData?.length || 0);
        
        if (activosData) {
            // Calcular valor actual para cada activo
            activosData.forEach(activo => {
                if (activo.fecha_adquisicion && activo.valor_adquisicion && activo.vida_util && activo.valor_residual) {
                    activo.valor_actual = calcularValorActual(
                        new Date(activo.fecha_adquisicion),
                        parseFloat(activo.valor_adquisicion),
                        parseInt(activo.vida_util),
                        parseFloat(activo.valor_residual)
                    );
                } else {
                    activo.valor_actual = activo.valor_adquisicion || 0;
                }
            });
            
            activos = activosData;
        } else {
            activos = [];
        }
        
        productosFiltrados = [...activos];
        renderizarActivos();
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('Error detallado cargando activos:', error);
        
        let mensajeError = 'Error al cargar el inventario de activos';
        if (error.message) {
            mensajeError += ': ' + error.message;
        } else if (error.code) {
            mensajeError += ' (Código: ' + error.code + ')';
        }
        
        showSystemMessage(mensajeError, 'error');
        
        activosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">Error al cargar los activos</h3>
                <p style="color: var(--gray-dark);">${mensajeError}</p>
                <button class="btn btn-primary" onclick="cargarActivos()" style="margin-top: 20px;" aria-label="Reintentar carga de datos">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// ===== FUNCIONES PARA ACTIVOS =====
function renderizarActivos() {
    if (!activosGrid) return;
    
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const indiceFin = indiceInicio + productosPorPagina;
    const productosPaginados = productosFiltrados.slice(indiceInicio, indiceFin);
    
    activosGrid.innerHTML = '';
    
    if (productosPaginados.length === 0) {
        activosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">No se encontraron activos</h3>
                <p style="color: var(--gray-dark);">Intenta con otros filtros o términos de búsqueda</p>
                <button class="btn btn-primary" onclick="reiniciarFiltros()" style="margin-top: 20px;" aria-label="Ver todos los activos">
                    <i class="fas fa-redo"></i> Ver todos los activos
                </button>
            </div>
        `;
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    productosPaginados.forEach(activo => {
        const tarjetaActivo = crearTarjetaActivo(activo);
        activosGrid.appendChild(tarjetaActivo);
    });
    
    renderizarPaginacion();
    actualizarContadorActivos();
}

function crearTarjetaActivo(activo) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'activo-card';
    tarjeta.setAttribute('data-id', activo.id);
    
    // Determinar clase de estado
    let estadoClase = 'estado-operativo';
    let estadoTexto = activo.estado?.nombre || 'Sin estado';
    
    if (activo.estado) {
        const estadoNombre = activo.estado.nombre.toLowerCase();
        if (estadoNombre.includes('mantenimiento')) {
            estadoClase = 'estado-mantenimiento';
        } else if (estadoNombre.includes('baja') || estadoNombre.includes('depreciado')) {
            estadoClase = 'estado-depreciado';
        } else if (estadoNombre.includes('inactivo')) {
            estadoClase = 'estado-inactivo';
        }
    }
    
    const valorActual = activo.valor_actual || activo.valor_adquisicion || 0;
    
    tarjeta.innerHTML = `
        <!-- Botones superiores -->
        <div class="botones-superiores-derecha">
            <button class="boton-circular detalle" onclick="verDetallesActivo('${activo.id}')" 
                    aria-label="Ver detalles">
                <i class="fas fa-eye"></i>
            </button>
            <button class="boton-circular editar" onclick="editActivo('${activo.id}')" 
                    aria-label="Editar activo">
                <i class="fas fa-edit"></i>
            </button>
            <button class="boton-circular eliminar" onclick="showConfirmationModal('delete', '${activo.id}', '${activo.nombre}')" 
                    aria-label="Eliminar activo">
                <i class="fas fa-trash"></i>
            </button>
        </div>

        <div class="activo-header">
            <div class="activo-codigo">${activo.codigo || 'SIN CÓDIGO'}</div>
            <div class="activo-estado ${estadoClase}">${estadoTexto.toUpperCase()}</div>
        </div>
        
        <div class="activo-content">
            <h3 class="activo-nombre">${activo.nombre}</h3>
            
            <div class="activo-detalles">
                <div class="activo-detalle">
                    <span class="activo-detalle-label">Categoría:</span>
                    <span class="activo-detalle-value">${activo.categoria?.nombre || 'Sin categoría'}</span>
                </div>
                <div class="activo-detalle">
                    <span class="activo-detalle-label">Departamento:</span>
                    <span class="activo-detalle-value">${activo.departamento?.nombre || 'Sin departamento'}</span>
                </div>
                <div class="activo-detalle">
                    <span class="activo-detalle-label">Responsable:</span>
                    <span class="activo-detalle-value">${activo.responsable ? activo.responsable.nombre + ' ' + activo.responsable.apellido : 'Sin asignar'}</span>
                </div>
                <div class="activo-detalle">
                    <span class="activo-detalle-label">Ubicación:</span>
                    <span class="activo-detalle-value">${activo.ubicacion?.nombre || 'Sin ubicación'}</span>
                </div>
                <div class="activo-detalle">
                    <span class="activo-detalle-label">Fecha Adq.:</span>
                    <span class="activo-detalle-value">${activo.fecha_adquisicion ? new Date(activo.fecha_adquisicion).toLocaleDateString() : 'No especificada'}</span>
                </div>
            </div>
            
            <div class="activo-valor">$${parseFloat(valorActual).toFixed(2)}</div>
        </div>
        
        <div class="activo-footer">
            <button class="btn btn-small btn-secondary" onclick="verHistorial('${activo.id}')" aria-label="Ver historial">
                <i class="fas fa-history"></i> Historial
            </button>
            <button class="btn btn-small btn-primary" onclick="generarReporte('${activo.id}')" aria-label="Generar reporte">
                <i class="fas fa-file-pdf"></i> Reporte
            </button>
        </div>
    `;
    
    return tarjeta;
}

function actualizarContadorActivos() {
    const indiceInicio = (paginaActual - 1) * productosPorPagina + 1;
    const indiceFin = Math.min(paginaActual * productosPorPagina, productosFiltrados.length);
    
    if (productosFiltrados.length > 0) {
        activosStats.textContent = `Mostrando ${indiceInicio}-${indiceFin} de ${productosFiltrados.length} activos`;
        
        // Calcular valor total de activos filtrados
        const valorTotalFiltrado = productosFiltrados.reduce((sum, activo) => {
            return sum + (parseFloat(activo.valor_actual) || parseFloat(activo.valor_adquisicion) || 0);
        }, 0);
        
        valorTotal.textContent = `$${valorTotalFiltrado.toFixed(2)}`;
    } else {
        activosStats.textContent = 'No hay activos que coincidan';
        valorTotal.textContent = '$0.00';
    }
    
    activosCount.textContent = productosFiltrados.length;
}

// ===== FUNCIONES DEL MODAL ACTIVO =====
function openActivoModal(activoId = null) {
    editingActivoId = activoId;
    
    // Cargar opciones en selects
    cargarOpcionesFormulario();
    
    if (activoId) {
        modalTitleText.textContent = 'Editar activo';
        const activo = activos.find(a => a.id === activoId);
        
        if (activo) {
            document.getElementById('activoCodigo').value = activo.codigo || '';
            document.getElementById('activoNombre').value = activo.nombre || '';
            document.getElementById('activoCategoria').value = activo.categoria_id || '';
            document.getElementById('activoMarca').value = activo.marca || '';
            document.getElementById('activoModelo').value = activo.modelo || '';
            document.getElementById('activoSerial').value = activo.numero_serie || '';
            document.getElementById('activoValor').value = activo.valor_adquisicion || '';
            document.getElementById('activoFechaAdquisicion').value = activo.fecha_adquisicion ? activo.fecha_adquisicion.split('T')[0] : '';
            document.getElementById('activoVidaUtil').value = activo.vida_util || 5;
            document.getElementById('activoValorResidual').value = activo.valor_residual || 10;
            document.getElementById('activoDepartamento').value = activo.departamento_id || '';
            document.getElementById('activoResponsable').value = activo.responsable_id || '';
            document.getElementById('activoUbicacion').value = activo.ubicacion_id || '';
            document.getElementById('activoEstado').value = activo.estado_id || '';
            document.getElementById('activoProveedor').value = activo.proveedor_id || '';
            document.getElementById('activoFactura').value = activo.numero_factura || '';
            document.getElementById('activoGarantia').value = activo.garantia_meses || 12;
            document.getElementById('activoObservaciones').value = activo.observaciones || '';
            document.getElementById('activoActivo').value = activo.activo ? 'true' : 'false';
            document.getElementById('activoId').value = activoId;
            
            // Calcular depreciación inicial
            setTimeout(calcularDepreciacion, 100);
        }
    } else {
        modalTitleText.textContent = 'Agregar activo';
        activoForm.reset();
        document.getElementById('activoId').value = '';
        document.getElementById('activoActivo').value = 'true';
        document.getElementById('activoVidaUtil').value = 5;
        document.getElementById('activoValorResidual').value = 10;
        document.getElementById('activoGarantia').value = 12;
        document.getElementById('activoFechaAdquisicion').value = new Date().toISOString().split('T')[0];
        
        // Calcular depreciación con valores por defecto
        setTimeout(calcularDepreciacion, 100);
    }
    
    activoModal.classList.add('activo');
    activoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function cargarOpcionesFormulario() {
    // Categorías
    const categoriaSelect = document.getElementById('activoCategoria');
    categoriaSelect.innerHTML = '<option value="">Selecciona una categoría</option>';
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        categoriaSelect.appendChild(option);
    });
    
    // Departamentos
    const departamentoSelect = document.getElementById('activoDepartamento');
    departamentoSelect.innerHTML = '<option value="">Selecciona departamento</option>';
    departamentos.forEach(departamento => {
        const option = document.createElement('option');
        option.value = departamento.id;
        option.textContent = departamento.nombre;
        departamentoSelect.appendChild(option);
    });
    
    // Estados
    const estadoSelect = document.getElementById('activoEstado');
    estadoSelect.innerHTML = '<option value="">Selecciona estado</option>';
    estados.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado.id;
        option.textContent = estado.nombre;
        estadoSelect.appendChild(option);
    });
    
    // Ubicaciones
    const ubicacionSelect = document.getElementById('activoUbicacion');
    ubicacionSelect.innerHTML = '<option value="">Selecciona ubicación</option>';
    ubicaciones.forEach(ubicacion => {
        const option = document.createElement('option');
        option.value = ubicacion.id;
        option.textContent = `${ubicacion.nombre} ${ubicacion.descripcion ? `(${ubicacion.descripcion})` : ''}`;
        ubicacionSelect.appendChild(option);
    });
    
    // Responsables
    const responsableSelect = document.getElementById('activoResponsable');
    responsableSelect.innerHTML = '<option value="">Selecciona responsable</option>';
    responsables.forEach(responsable => {
        const option = document.createElement('option');
        option.value = responsable.id;
        option.textContent = `${responsable.nombre} ${responsable.apellido}`;
        responsableSelect.appendChild(option);
    });
    
    // Proveedores
    const proveedorSelect = document.getElementById('activoProveedor');
    proveedorSelect.innerHTML = '<option value="">Selecciona proveedor</option>';
    proveedores.forEach(proveedor => {
        const option = document.createElement('option');
        option.value = proveedor.id;
        option.textContent = proveedor.nombre;
        proveedorSelect.appendChild(option);
    });
}

function calcularDepreciacion() {
    const valorAdquisicion = parseFloat(document.getElementById('activoValor').value) || 0;
    const fechaAdquisicion = document.getElementById('activoFechaAdquisicion').value;
    const vidaUtil = parseInt(document.getElementById('activoVidaUtil').value) || 5;
    const valorResidualPorcentaje = parseFloat(document.getElementById('activoValorResidual').value) || 10;
    
    const valorResidual = valorAdquisicion * (valorResidualPorcentaje / 100);
    const valorDepreciable = valorAdquisicion - valorResidual;
    const depreciacionAnual = valorDepreciable / vidaUtil;
    const depreciacionMensual = depreciacionAnual / 12;
    
    let añosTranscurridos = 0;
    let valorActual = valorAdquisicion;
    let añosRestantes = vidaUtil;
    
    if (fechaAdquisicion) {
        const fechaAdq = new Date(fechaAdquisicion);
        const hoy = new Date();
        
        // Calcular meses transcurridos
        const mesesTranscurridos = (hoy.getFullYear() - fechaAdq.getFullYear()) * 12 + 
                                  (hoy.getMonth() - fechaAdq.getMonth());
        
        añosTranscurridos = mesesTranscurridos / 12;
        añosRestantes = Math.max(0, vidaUtil - añosTranscurridos);
        
        // Calcular valor actual
        const mesesDepreciados = Math.min(mesesTranscurridos, vidaUtil * 12);
        const depreciacionTotal = mesesDepreciados * depreciacionMensual;
        valorActual = Math.max(valorResidual, valorAdquisicion - depreciacionTotal);
    }
    
    // Actualizar UI
    document.getElementById('valorActual').textContent = `$${valorActual.toFixed(2)}`;
    document.getElementById('depreciacionAnual').textContent = `$${depreciacionAnual.toFixed(2)}`;
    document.getElementById('depreciacionMensual').textContent = `$${depreciacionMensual.toFixed(2)}`;
    document.getElementById('aniosRestantes').textContent = añosRestantes.toFixed(1);
}

function calcularValorActual(fechaAdquisicion, valorAdquisicion, vidaUtil, valorResidualPorcentaje) {
    const valorResidual = valorAdquisicion * (valorResidualPorcentaje / 100);
    const valorDepreciable = valorAdquisicion - valorResidual;
    const depreciacionAnual = valorDepreciable / vidaUtil;
    const depreciacionMensual = depreciacionAnual / 12;
    
    const hoy = new Date();
    const mesesTranscurridos = (hoy.getFullYear() - fechaAdquisicion.getFullYear()) * 12 + 
                              (hoy.getMonth() - fechaAdquisicion.getMonth());
    
    const mesesDepreciados = Math.min(mesesTranscurridos, vidaUtil * 12);
    const depreciacionTotal = mesesDepreciados * depreciacionMensual;
    return Math.max(valorResidual, valorAdquisicion - depreciacionTotal);
}

async function saveActivo() {
    if (!activoForm.checkValidity()) {
        activoForm.reportValidity();
        return;
    }
    
    const activoData = {
        codigo: document.getElementById('activoCodigo').value.trim(),
        nombre: document.getElementById('activoNombre').value.trim(),
        categoria_id: parseInt(document.getElementById('activoCategoria').value),
        marca: document.getElementById('activoMarca').value.trim() || null,
        modelo: document.getElementById('activoModelo').value.trim() || null,
        numero_serie: document.getElementById('activoSerial').value.trim() || null,
        valor_adquisicion: parseFloat(document.getElementById('activoValor').value),
        fecha_adquisicion: document.getElementById('activoFechaAdquisicion').value || null,
        vida_util: parseInt(document.getElementById('activoVidaUtil').value),
        valor_residual: parseFloat(document.getElementById('activoValorResidual').value),
        departamento_id: document.getElementById('activoDepartamento').value ? parseInt(document.getElementById('activoDepartamento').value) : null,
        responsable_id: document.getElementById('activoResponsable').value ? parseInt(document.getElementById('activoResponsable').value) : null,
        ubicacion_id: document.getElementById('activoUbicacion').value ? parseInt(document.getElementById('activoUbicacion').value) : null,
        estado_id: parseInt(document.getElementById('activoEstado').value),
        proveedor_id: document.getElementById('activoProveedor').value ? parseInt(document.getElementById('activoProveedor').value) : null,
        numero_factura: document.getElementById('activoFactura').value.trim() || null,
        garantia_meses: parseInt(document.getElementById('activoGarantia').value),
        observaciones: document.getElementById('activoObservaciones').value.trim() || null,
        activo: document.getElementById('activoActivo').value === 'true',
        actualizado_en: new Date().toISOString()
    };
    
    // Calcular valor actual
    if (activoData.fecha_adquisicion && activoData.valor_adquisicion && activoData.vida_util && activoData.valor_residual) {
        const valorActual = calcularValorActual(
            new Date(activoData.fecha_adquisicion),
            activoData.valor_adquisicion,
            activoData.vida_util,
            activoData.valor_residual
        );
        activoData.valor_actual = valorActual;
    }
    
    if (currentUser) {
        if (editingActivoId) {
            activoData.actualizado_por = currentUser.id;
        } else {
            activoData.creado_por = currentUser.id;
            activoData.creado_en = new Date().toISOString();
        }
    }
    
    saveActivoBtn.disabled = true;
    saveActivoBtn.innerHTML = '<div class="loading"></div> Guardando...';
    
    try {
        if (editingActivoId) {
            const { error } = await supabaseClient
                .from('activo')
                .update(activoData)
                .eq('id', editingActivoId);
            
            if (error) throw error;
            
            showSystemMessage('Activo actualizado exitosamente.', 'success');
        } else {
            const { error } = await supabaseClient
                .from('activo')
                .insert(activoData);
            
            if (error) throw error;
            
            showSystemMessage('Activo agregado exitosamente.', 'success');
        }
        
        closeActivoModal();
        await cargarActivos();
        
    } catch (error) {
        console.error('Error guardando activo:', error);
        showSystemMessage('Error al guardar el activo: ' + error.message, 'error');
    } finally {
        saveActivoBtn.disabled = false;
        saveActivoBtn.innerHTML = 'Guardar Activo';
    }
}

function closeActivoModal() {
    activoModal.classList.remove('activo');
    activoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activoForm.reset();
    editingActivoId = null;
}

// ===== FUNCIONES DE DETALLES =====
async function verDetallesActivo(id) {
    const activo = activos.find(a => a.id === id);
    
    if (!activo) {
        showSystemMessage('Activo no encontrado.', 'error');
        return;
    }
    
    // Actualizar datos en el modal
    document.getElementById('detalleCodigo').textContent = activo.codigo || 'SIN CÓDIGO';
    document.getElementById('detalleNombre').textContent = activo.nombre;
    document.getElementById('detalleCategoria').textContent = activo.categoria?.nombre || 'Sin categoría';
    document.getElementById('detalleMarcaModelo').textContent = `${activo.marca || ''} ${activo.modelo || ''}`.trim() || 'No especificado';
    document.getElementById('detalleSerial').textContent = activo.numero_serie || 'No especificado';
    document.getElementById('detalleValor').textContent = `$${parseFloat(activo.valor_adquisicion || 0).toFixed(2)}`;
    document.getElementById('detalleValorActual').textContent = `$${parseFloat(activo.valor_actual || activo.valor_adquisicion || 0).toFixed(2)}`;
    document.getElementById('detalleFechaAdquisicion').textContent = activo.fecha_adquisicion ? 
        new Date(activo.fecha_adquisicion).toLocaleDateString() : 'No especificada';
    document.getElementById('detalleVidaUtil').textContent = `${activo.vida_util || 0} años`;
    document.getElementById('detalleDepartamento').textContent = activo.departamento?.nombre || 'Sin departamento';
    document.getElementById('detalleResponsable').textContent = activo.responsable ? 
        `${activo.responsable.nombre} ${activo.responsable.apellido}` : 'Sin asignar';
    document.getElementById('detalleUbicacion').textContent = activo.ubicacion?.nombre || 'Sin ubicación';
    document.getElementById('detalleProveedor').textContent = activo.proveedor?.nombre || 'No especificado';
    document.getElementById('detalleFactura').textContent = activo.numero_factura || 'No especificado';
    document.getElementById('detalleGarantia').textContent = activo.garantia_meses ? 
        `${activo.garantia_meses} meses` : 'Sin garantía';
    document.getElementById('detalleObservaciones').textContent = activo.observaciones || 'Sin observaciones';
    
    // Determinar clase de estado
    let estadoClase = 'estado-operativo';
    if (activo.estado) {
        const estadoNombre = activo.estado.nombre.toLowerCase();
        if (estadoNombre.includes('mantenimiento')) {
            estadoClase = 'estado-mantenimiento';
        } else if (estadoNombre.includes('baja') || estadoNombre.includes('depreciado')) {
            estadoClase = 'estado-depreciado';
        } else if (estadoNombre.includes('inactivo')) {
            estadoClase = 'estado-inactivo';
        }
    }
    
    const estadoElement = document.getElementById('detalleEstado');
    estadoElement.textContent = activo.estado?.nombre.toUpperCase() || 'SIN ESTADO';
    estadoElement.className = 'detalle-estado ' + estadoClase;
    
    // Configurar botón de editar
    editarDesdeDetalleBtn.onclick = () => {
        closeDetalleModal();
        setTimeout(() => editActivo(id), 300);
    };
    
    detalleModal.classList.add('activo');
    detalleModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeDetalleModal() {
    detalleModal.classList.remove('activo');
    detalleModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function imprimirDetalles() {
    window.print();
}

// ===== FUNCIONES DE HISTORIAL =====
async function verHistorial(id) {
    try {
        const { data: historial, error } = await supabaseClient
            .from('historial_activo')
            .select('*, usuario:usuario_id (nombre, apellido)')
            .eq('activo_id', id)
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        
        let html = '<div class="historial-list">';
        
        if (historial && historial.length > 0) {
            historial.forEach(item => {
                const fecha = new Date(item.fecha).toLocaleDateString();
                const usuario = item.usuario ? `${item.usuario.nombre} ${item.usuario.apellido}` : 'Sistema';
                
                html += `
                    <div class="historial-item">
                        <div class="historial-fecha">${fecha}</div>
                        <div class="historial-usuario">${usuario}</div>
                        <div class="historial-tipo ${item.tipo.toLowerCase()}">${item.tipo}</div>
                        <div class="historial-descripcion">${item.descripcion}</div>
                    </div>
                `;
            });
        } else {
            html += '<p class="historial-vacio">No hay registros de historial</p>';
        }
        
        html += '</div>';
        
        document.getElementById('historialContent').innerHTML = html;
        
        // Configurar botón para agregar mantenimiento
        agregarMantenimientoBtn.onclick = () => {
            closeHistorialModal();
            setTimeout(() => agregarMantenimientoActivo(id), 300);
        };
        
        historialModal.classList.add('activo');
        historialModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        showSystemMessage('Error al cargar el historial.', 'error');
    }
}

function closeHistorialModal() {
    historialModal.classList.remove('activo');
    historialModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

async function agregarMantenimientoActivo(activoId) {
    const descripcion = prompt('Ingrese la descripción del mantenimiento:');
    if (!descripcion) return;
    
    try {
        const mantenimientoData = {
            activo_id: activoId,
            tipo: 'MANTENIMIENTO',
            descripcion: descripcion,
            fecha: new Date().toISOString(),
            usuario_id: currentUser.id,
            creado_en: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('historial_activo')
            .insert(mantenimientoData);
        
        if (error) throw error;
        
        showSystemMessage('Mantenimiento registrado exitosamente.', 'success');
        verHistorial(activoId); // Recargar historial
        
    } catch (error) {
        console.error('Error registrando mantenimiento:', error);
        showSystemMessage('Error al registrar el mantenimiento.', 'error');
    }
}

// ===== FUNCIONES DE EXPORTACIÓN =====
function exportarAExcel() {
    if (productosFiltrados.length === 0) {
        showSystemMessage('No hay datos para exportar.', 'warning');
        return;
    }
    
    // Crear contenido CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Encabezados
    const headers = [
        'Código', 'Nombre', 'Categoría', 'Departamento', 'Responsable',
        'Ubicación', 'Estado', 'Valor Adquisición', 'Valor Actual',
        'Fecha Adquisición', 'Vida Útil', 'Marca', 'Modelo', 'N° Serie'
    ];
    csvContent += headers.join(',') + "\n";
    
    // Datos
    productosFiltrados.forEach(activo => {
        const row = [
            `"${activo.codigo || ''}"`,
            `"${activo.nombre || ''}"`,
            `"${activo.categoria?.nombre || ''}"`,
            `"${activo.departamento?.nombre || ''}"`,
            `"${activo.responsable ? activo.responsable.nombre + ' ' + activo.responsable.apellido : ''}"`,
            `"${activo.ubicacion?.nombre || ''}"`,
            `"${activo.estado?.nombre || ''}"`,
            `"${parseFloat(activo.valor_adquisicion || 0).toFixed(2)}"`,
            `"${parseFloat(activo.valor_actual || activo.valor_adquisicion || 0).toFixed(2)}"`,
            `"${activo.fecha_adquisicion ? new Date(activo.fecha_adquisicion).toLocaleDateString() : ''}"`,
            `"${activo.vida_util || ''}"`,
            `"${activo.marca || ''}"`,
            `"${activo.modelo || ''}"`,
            `"${activo.numero_serie || ''}"`
        ];
        csvContent += row.join(',') + "\n";
    });
    
    // Crear enlace de descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    mostrarToast(`Exportados ${productosFiltrados.length} activos a CSV`);
}

async function generarReporte(id) {
    const activo = activos.find(a => a.id === id);
    if (!activo) {
        showSystemMessage('Activo no encontrado.', 'error');
        return;
    }
    
    // Verificar si jsPDF está disponible
    if (!window.jspdf) {
        showSystemMessage('Error: La librería jsPDF no está cargada.', 'error');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(20);
        doc.setTextColor(0, 102, 204);
        doc.text('Reporte de Activo', 20, 20);
        
        // Línea separadora
        doc.setDrawColor(0, 102, 204);
        doc.line(20, 25, 190, 25);
        
        let y = 35;
        
        // Información básica
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Código: ${activo.codigo || 'N/A'}`, 20, y);
        y += 8;
        doc.text(`Nombre: ${activo.nombre || 'N/A'}`, 20, y);
        y += 8;
        doc.text(`Categoría: ${activo.categoria?.nombre || 'N/A'}`, 20, y);
        y += 8;
        doc.text(`Estado: ${activo.estado?.nombre || 'N/A'}`, 20, y);
        y += 15;
        
        // Información financiera
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text('Información Financiera', 20, y);
        y += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Valor de Adquisición: $${parseFloat(activo.valor_adquisicion || 0).toFixed(2)}`, 20, y);
        y += 8;
        doc.text(`Valor Actual: $${parseFloat(activo.valor_actual || activo.valor_adquisicion || 0).toFixed(2)}`, 20, y);
        y += 8;
        doc.text(`Fecha Adquisición: ${activo.fecha_adquisicion ? new Date(activo.fecha_adquisicion).toLocaleDateString() : 'N/A'}`, 20, y);
        y += 15;
        
        // Asignación
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text('Asignación', 20, y);
        y += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Departamento: ${activo.departamento?.nombre || 'N/A'}`, 20, y);
        y += 8;
        doc.text(`Responsable: ${activo.responsable ? activo.responsable.nombre + ' ' + activo.responsable.apellido : 'N/A'}`, 20, y);
        y += 8;
        doc.text(`Ubicación: ${activo.ubicacion?.nombre || 'N/A'}`, 20, y);
        y += 15;
        
        // Pie de página
        const fecha = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${fecha}`, 20, 280);
        doc.text(`Usuario: ${currentUser.nombre} ${currentUser.apellido}`, 150, 280);
        
        // Guardar PDF
        doc.save(`reporte_activo_${activo.codigo || activo.id}.pdf`);
        
        mostrarToast('Reporte PDF generado exitosamente');
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        showSystemMessage('Error al generar el reporte PDF.', 'error');
    }
}

// ===== FUNCIONES DE BÚSQUEDA Y FILTROS (similares a repuestos) =====
function handleSearchInput() {
    clearTimeout(busquedaTimeout);
    
    busquedaTimeout = setTimeout(() => {
        const consulta = this.value.trim().toLowerCase();
        
        if (consulta.length > 0) {
            estadoFiltros.busqueda = consulta;
            
            if (consulta.length < 3) {
                buscarSugerencias(consulta);
            } else {
                buscarActivos(consulta);
                aplicarFiltros();
            }
        } else {
            estadoFiltros.busqueda = '';
            if (searchResults) {
                searchResults.classList.remove('active');
                searchResults.innerHTML = '';
            }
            aplicarFiltros();
        }
    }, 300);
}

function handleSearchKeydown(e) {
    if (e.key === 'Enter') {
        const consulta = this.value.trim().toLowerCase();
        if (consulta.length > 0) {
            estadoFiltros.busqueda = consulta;
            aplicarFiltros();
            if (searchResults) {
                searchResults.classList.remove('active');
            }
        }
    } else if (e.key === 'Escape') {
        this.value = '';
        estadoFiltros.busqueda = '';
        if (searchResults) {
            searchResults.classList.remove('active');
        }
        aplicarFiltros();
    }
}

function buscarActivos(consulta) {
    if (!searchResults) return;
    
    if (consulta.length < 2) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        return;
    }
    
    const resultados = activos.filter(activo => {
        const enCodigo = activo.codigo?.toLowerCase().includes(consulta);
        const enNombre = activo.nombre?.toLowerCase().includes(consulta);
        const enModelo = activo.modelo?.toLowerCase().includes(consulta);
        const enMarca = activo.marca?.toLowerCase().includes(consulta);
        const enSerial = activo.numero_serie?.toLowerCase().includes(consulta);
        
        return enCodigo || enNombre || enModelo || enMarca || enSerial;
    }).slice(0, 20);
    
    if (resultados.length > 0) {
        let htmlResultados = '';
        
        resultados.forEach(activo => {
            htmlResultados += `
                <div class="search-result-item" data-id="${activo.id}" 
                     onclick="verDetallesDesdeBusqueda('${activo.id}')" 
                     onkeydown="if(event.key === 'Enter') verDetallesDesdeBusqueda('${activo.id}')"
                     role="button" 
                     tabindex="0"
                     aria-label="${activo.nombre}">
                    <div style="width: 50px; height: 50px; border-radius: 8px; background: var(--gray-light); display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-laptop" style="color: var(--primary-color); font-size: 1.5rem;"></i>
                    </div>
                    <div class="search-result-info">
                        <h4>${activo.codigo || 'Sin código'}</h4>
                        <p>${activo.nombre}</p>
                        <small><strong>${activo.estado?.nombre || 'Sin estado'}</strong></small>
                    </div>
                </div>
            `;
        });
        
        searchResults.innerHTML = htmlResultados;
        searchResults.classList.add('active');
    } else {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No se encontraron activos para "${consulta}"</p>
            </div>
        `;
        searchResults.classList.add('active');
    }
}

function verDetallesDesdeBusqueda(id) {
    if (searchResults) {
        searchResults.classList.remove('active');
    }
    if (searchInput) {
        searchInput.value = '';
        estadoFiltros.busqueda = '';
    }
    verDetallesActivo(id);
}

// ===== FUNCIONES DE FILTROS (adaptadas de repuestos) =====
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
    
    setTimeout(() => {
        const firstInput = filtrosOpciones.querySelector('input, button');
        if (firstInput) firstInput.focus();
    }, 100);
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
                                <span>${categoria.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'departamento':
            titulo = 'Departamento';
            icono = 'fas fa-building';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${departamentos.map(departamento => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="departamento-fijo" value="${departamento.id}" 
                                       ${estadoFiltros.departamentos && estadoFiltros.departamentos.includes(departamento.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('departamentos', '${departamento.id}', this.checked)"
                                       aria-label="Filtrar por departamento ${departamento.nombre}">
                                <span>${departamento.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'estado':
            titulo = 'Estado';
            icono = 'fas fa-info-circle';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${estados.map(estado => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="estado-fijo" value="${estado.id}" 
                                       ${estadoFiltros.estados && estadoFiltros.estados.includes(estado.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('estados', '${estado.id}', this.checked)"
                                       aria-label="Filtrar por estado ${estado.nombre}">
                                <span>${estado.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'ubicacion':
            titulo = 'Ubicación';
            icono = 'fas fa-map-marker-alt';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${ubicaciones.map(ubicacion => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="ubicacion-fijo" value="${ubicacion.id}" 
                                       ${estadoFiltros.ubicaciones && estadoFiltros.ubicaciones.includes(ubicacion.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('ubicaciones', '${ubicacion.id}', this.checked)"
                                       aria-label="Filtrar por ubicación ${ubicacion.nombre}">
                                <span>${ubicacion.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'responsable':
            titulo = 'Responsable';
            icono = 'fas fa-user';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${responsables.map(responsable => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="responsable-fijo" value="${responsable.id}" 
                                       ${estadoFiltros.responsables && estadoFiltros.responsables.includes(responsable.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('responsables', '${responsable.id}', this.checked)"
                                       aria-label="Filtrar por responsable ${responsable.nombre} ${responsable.apellido}">
                                <span>${responsable.nombre} ${responsable.apellido}</span>
                            </label>
                        `).join('')}
                        <label class="filtro-checkbox">
                            <input type="checkbox" name="responsable-fijo" value="sin_asignar" 
                                   ${estadoFiltros.responsables && estadoFiltros.responsables.includes('sin_asignar') ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeFijo('responsables', 'sin_asignar', this.checked)"
                                   aria-label="Filtrar activos sin responsable asignado">
                            <span><i>SIN ASIGNAR</i></span>
                        </label>
                    </div>
                </div>
            `;
            break;
            
        case 'proveedor':
            titulo = 'Proveedor';
            icono = 'fas fa-truck';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${proveedores.map(proveedor => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="proveedor-fijo" value="${proveedor.id}" 
                                       ${estadoFiltros.proveedores && estadoFiltros.proveedores.includes(proveedor.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('proveedores', '${proveedor.id}', this.checked)"
                                       aria-label="Filtrar por proveedor ${proveedor.nombre}">
                                <span>${proveedor.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
    }
    
    html += `
        <div class="filtros-acciones">
            <button class="btn btn-primary" onclick="aplicarFiltrosDesdeFijo()" aria-label="Aplicar filtros seleccionados">
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

function aplicarFiltrosDesdeFijo() {
    aplicarFiltros();
    cerrarOpcionesFiltro();
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
    
    const activeBtn = document.querySelector('.btn-filtro-grupo.activo');
    if (activeBtn) activeBtn.focus();
}

function reiniciarFiltros() {
    estadoFiltros.categorias = [];
    estadoFiltros.departamentos = [];
    estadoFiltros.estados = [];
    estadoFiltros.ubicaciones = [];
    estadoFiltros.responsables = [];
    estadoFiltros.proveedores = [];
    estadoFiltros.busqueda = '';
    
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.remove('active');
    
    productosFiltrados = [...activos];
    paginaActual = 1;
    
    actualizarContadorActivos();
    renderizarActivos();
    
    mostrarToast('Filtros restablecidos');
    cerrarOpcionesFiltro();
}

function aplicarFiltros() {
    productosFiltrados = activos.filter(activo => {
        // Filtro por categoría
        if (estadoFiltros.categorias && estadoFiltros.categorias.length > 0 && 
            !estadoFiltros.categorias.includes(activo.categoria_id?.toString())) {
            return false;
        }
        
        // Filtro por departamento
        if (estadoFiltros.departamentos && estadoFiltros.departamentos.length > 0 && 
            !estadoFiltros.departamentos.includes(activo.departamento_id?.toString())) {
            return false;
        }
        
        // Filtro por estado
        if (estadoFiltros.estados && estadoFiltros.estados.length > 0 && 
            !estadoFiltros.estados.includes(activo.estado_id?.toString())) {
            return false;
        }
        
        // Filtro por ubicación
        if (estadoFiltros.ubicaciones && estadoFiltros.ubicaciones.length > 0 && 
            !estadoFiltros.ubicaciones.includes(activo.ubicacion_id?.toString())) {
            return false;
        }
        
        // Filtro por responsable
        if (estadoFiltros.responsables && estadoFiltros.responsables.length > 0) {
            const responsableId = activo.responsable_id?.toString();
            
            if (estadoFiltros.responsables.includes('sin_asignar')) {
                if (responsableId) return false;
            } else {
                if (!responsableId) return false;
                if (!estadoFiltros.responsables.includes(responsableId)) {
                    return false;
                }
            }
        }
        
        // Filtro por proveedor
        if (estadoFiltros.proveedores && estadoFiltros.proveedores.length > 0 && 
            !estadoFiltros.proveedores.includes(activo.proveedor_id?.toString())) {
            return false;
        }
        
        // Filtro por búsqueda
        if (estadoFiltros.busqueda) {
            const busquedaMin = estadoFiltros.busqueda.toLowerCase();
            const enCodigo = activo.codigo?.toLowerCase().includes(busquedaMin);
            const enNombre = activo.nombre?.toLowerCase().includes(busquedaMin);
            const enModelo = activo.modelo?.toLowerCase().includes(busquedaMin);
            const enMarca = activo.marca?.toLowerCase().includes(busquedaMin);
            
            if (!enCodigo && !enNombre && !enModelo && !enMarca) {
                return false;
            }
        }
        
        return true;
    });
    
    paginaActual = 1;
    actualizarContadorActivos();
    renderizarActivos();
    
    mostrarToast(`${productosFiltrados.length} activos encontrados`);
}

// ===== PAGINACIÓN (igual que repuestos) =====
function renderizarPaginacion() {
    if (!pagination) return;
    
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    
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
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaActual) return;
    
    paginaActual = pagina;
    renderizarActivos();
    
    const activosSection = document.getElementById('activos');
    if (activosSection) {
        activosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== FUNCIONES DE GESTIÓN =====
function editActivo(id) {
    const activo = activos.find(a => a.id === id);
    
    if (!activo) {
        showSystemMessage('Activo no encontrado.', 'error');
        return;
    }
    
    openActivoModal(id);
}

async function deleteActivo(id) {
    try {
        const { error } = await supabaseClient
            .from('activo')
            .update({ 
                activo: false,
                actualizado_en: new Date().toISOString(),
                actualizado_por: currentUser.id
            })
            .eq('id', id);
        
        if (error) throw error;
        
        showSystemMessage('Activo desactivado exitosamente.', 'success');
        await cargarActivos();
        
    } catch (error) {
        console.error('Error desactivando activo:', error);
        showSystemMessage('Error al desactivar el activo. Intenta nuevamente.', 'error');
    }
}

// ===== MODAL DE CONFIRMACIÓN =====
function showConfirmationModal(action, id, nombre = '') {
    pendingAction = action;
    pendingActionData = { id, nombre };
    
    if (action === 'delete') {
        confirmationTitle.textContent = '¿Desactivar activo?';
        confirmationMessage.textContent = `¿Estás seguro de que deseas desactivar el activo "${nombre}"? Esta acción no elimina el registro, solo lo marca como inactivo.`;
        confirmActionBtn.textContent = 'Desactivar';
        confirmActionBtn.className = 'btn btn-danger';
    }
    
    confirmActionBtn.onclick = executePendingAction;
    confirmationModal.classList.add('activo');
    confirmationModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeConfirmationModal() {
    confirmationModal.classList.remove('activo');
    confirmationModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    pendingAction = null;
    pendingActionData = null;
}

async function executePendingAction() {
    if (pendingAction === 'delete' && pendingActionData) {
        await deleteActivo(pendingActionData.id);
    }
    
    closeConfirmationModal();
}

// ===== FUNCIONES AUXILIARES =====
function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove('hidden');
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-message';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => loginMessage.classList.add('hidden');
    
    loginMessage.innerHTML = '';
    loginMessage.appendChild(document.createTextNode(message));
    loginMessage.appendChild(closeBtn);
    
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

function showPasswordModal() {
    passwordModal.classList.add('activo');
    passwordModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
}

function closePasswordModal() {
    passwordModal.classList.remove('activo');
    passwordModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function validatePassword(password) {
    if (password.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
}

// ===== EXPONER FUNCIONES GLOBALES =====
window.handleCategoriaChange = handleCategoriaChange;
window.actualizarFiltroDesdeFijo = actualizarFiltroDesdeFijo;
window.aplicarFiltrosDesdeFijo = aplicarFiltrosDesdeFijo;
window.cerrarOpcionesFiltro = cerrarOpcionesFiltro;
window.reiniciarFiltros = reiniciarFiltros;
window.cambiarPagina = cambiarPagina;
window.editActivo = editActivo;
window.showConfirmationModal = showConfirmationModal;
window.verDetallesActivo = verDetallesActivo;
window.verHistorial = verHistorial;
window.generarReporte = generarReporte;
window.exportarAExcel = exportarAExcel;