// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = 'https://fzdwqkoporxnzvhpmlls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZHdxa29wb3J4bnp2aHBtbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDkxMDYsImV4cCI6MjA3NzM4NTEwNn0.nOS3oByMmopchYhH0Kv1I0lxi02VkqfsC-eGFTZ_ePg';

// Inicializar Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== VARIABLES GLOBALES =====
let currentUser = null;
let repuestos = [];
let categorias = [];
let tipos = [];
let ubicaciones = [];
let estados = [];
let marcas = [];
let usuarios = [];
let editingRepuestoId = null;
let currentEmail = '';
let userHasPassword = false;

let filtrosActivosCount = 0;

// Variables para etiquetas
let repuestoParaEtiqueta = null;
let formatoEtiqueta = {
    tamano: '7.5x5',
    orientacion: 'horizontal',
    unidades: 'cm'
};

// Variables para filtros y paginación
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 12;
let busquedaTimeout = null;

// Estado de los filtros
const estadoFiltros = {
    categorias: [],
    tipos: [],
    estados: [],
    ubicaciones: [],
    marcas: [],
    usuarios: [],     
    busqueda: ''
};

// Variables para acciones de confirmación
let pendingAction = null;
let pendingActionData = null;

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

// Menú móvil
const filtrosModal = document.getElementById('filtrosModal');
const filtrosMovilBtn = document.getElementById('filtrosMovilBtn');
const closeFiltrosModalBtn = document.getElementById('closeFiltrosModalBtn');
const aplicarFiltrosModalBtn = document.getElementById('aplicarFiltrosModalBtn');
const limpiarFiltrosModalBtn = document.getElementById('limpiarFiltrosModalBtn');
const filtrosModalContent = document.getElementById('filtrosModalContent');
const filterBadge = document.getElementById('filterBadge');

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

// Repuestos
const repuestosGrid = document.getElementById('repuestosGrid');
const addRepuestoBtn = document.getElementById('addRepuestoBtn');
const productsStats = document.getElementById('products-stats');
const productsCount = document.getElementById('products-count');
const pagination = document.getElementById('pagination');

// Modales
const repuestoModal = document.getElementById('repuestoModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveRepuestoBtn = document.getElementById('saveRepuestoBtn');
const modalTitleText = document.getElementById('modalTitleText');
const repuestoForm = document.getElementById('repuestoForm');

// Modal etiqueta
const etiquetaModal = document.getElementById('etiquetaModal');
const closeEtiquetaModalBtn = document.getElementById('closeEtiquetaModalBtn');
const cancelEtiquetaBtn = document.getElementById('cancelEtiquetaBtn');
const generarEtiquetaBtn = document.getElementById('generarEtiquetaBtn');

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
    if (toggleNewPasswordBtn) {
        toggleNewPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, newPasswordInput, toggleNewPasswordBtn));
    }
    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', togglePasswordVisibility.bind(null, confirmPasswordInput, toggleConfirmPasswordBtn));
    }
    
    // Header actions
    themeToggle.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', logout);
    
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
    
    // Modal etiqueta
    closeEtiquetaModalBtn.addEventListener('click', closeEtiquetaModal);
    cancelEtiquetaBtn.addEventListener('click', closeEtiquetaModal);
    generarEtiquetaBtn.addEventListener('click', generarEtiquetaPDF);

    // Cerrar modal al hacer clic fuera
    etiquetaModal.addEventListener('click', (e) => {
        if (e.target === etiquetaModal) closeEtiquetaModal();
    });

    // Esc para cerrar modal etiqueta
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (etiquetaModal.classList.contains('activo')) closeEtiquetaModal();
        }
    });

    // Modal repuesto
    addRepuestoBtn.addEventListener('click', () => openRepuestoModal());
    closeModalBtn.addEventListener('click', closeRepuestoModal);
    cancelModalBtn.addEventListener('click', closeRepuestoModal);
    saveRepuestoBtn.addEventListener('click', saveRepuesto);
    
    // Modal contraseña
    closePasswordModalBtn.addEventListener('click', closePasswordModal);
    cancelPasswordBtn.addEventListener('click', closePasswordModal);
    savePasswordBtn.addEventListener('click', createPassword);
    
    // Modal confirmación
    confirmCancelBtn.addEventListener('click', closeConfirmationModal);
    
    // Cerrar modales al hacer clic fuera
    repuestoModal.addEventListener('click', (e) => {
        if (e.target === repuestoModal) closeRepuestoModal();
    });
    
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) closePasswordModal();
    });
    
    confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal) closeConfirmationModal();
    });
    
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
            if (repuestoModal.classList.contains('activo')) closeRepuestoModal();
            if (passwordModal.classList.contains('activo')) closePasswordModal();
            if (confirmationModal.classList.contains('activo')) closeConfirmationModal();
        }
    });
    
    // Eventos para filtros móvil
    if (filtrosMovilBtn) {
        filtrosMovilBtn.addEventListener('click', abrirModalFiltros);
    }
    
    if (closeFiltrosModalBtn) {
        closeFiltrosModalBtn.addEventListener('click', cerrarModalFiltros);
    }
    
    if (aplicarFiltrosModalBtn) {
        aplicarFiltrosModalBtn.addEventListener('click', aplicarFiltrosDesdeModal);
    }
    
    if (limpiarFiltrosModalBtn) {
        limpiarFiltrosModalBtn.addEventListener('click', limpiarFiltrosDesdeModal);
    }
    
    // Cerrar modal al hacer clic fuera
    filtrosModal.addEventListener('click', (e) => {
        if (e.target === filtrosModal) cerrarModalFiltros();
    });
    
    // Esc para cerrar modal filtros
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (filtrosModal.classList.contains('activo')) cerrarModalFiltros();
        }
    });
    
    // Verificar si estamos en móvil y mostrar botón flotante
    verificarDispositivo();
    window.addEventListener('resize', verificarDispositivo);

    // Agregar estilos para filtros activos
    agregarEstilosFiltrosActivos();
    
    // Inicializar contador
    actualizarContadorFiltrosActivos();

    console.log('Sistema inicializado');
});

// ===== FUNCIONES DE TEMA =====
function initTheme() {
    // Verificar tema guardado
    const savedTheme = localStorage.getItem('repuestos_theme') || 'light';
    const savedLogoTheme = localStorage.getItem('repuestos_logo_theme') || 'light';
    
    // Obtener referencias a los logos
    const loginLogoLight = document.getElementById('loginLogoLight');
    const loginLogoDark = document.getElementById('loginLogoDark');
    const headerLogoLight = document.getElementById('headerLogoLight');
    const headerLogoDark = document.getElementById('headerLogoDark');
    
    if (savedTheme === 'dark') {
        // Aplicar modo oscuro
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        
        // Mostrar logos oscuros
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.add('hidden');
            loginLogoDark.classList.remove('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.add('hidden');
            headerLogoDark.classList.remove('hidden');
        }
        
    } else {
        // Asegurar modo claro
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        
        // Mostrar logos claros
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
    // Cambiar clase del body
    document.body.classList.toggle('dark-mode');
    
    // Obtener referencias a los logos
    const loginLogoLight = document.getElementById('loginLogoLight');
    const loginLogoDark = document.getElementById('loginLogoDark');
    const headerLogoLight = document.getElementById('headerLogoLight');
    const headerLogoDark = document.getElementById('headerLogoDark');
    
    // Determinar si estamos en modo oscuro
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Actualizar icono del botón de tema
    if (isDarkMode) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        
        // Actualizar logos
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.add('hidden');
            loginLogoDark.classList.remove('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.add('hidden');
            headerLogoDark.classList.remove('hidden');
        }
        
        // Guardar preferencia
        localStorage.setItem('repuestos_theme', 'dark');
        localStorage.setItem('repuestos_logo_theme', 'dark');
        
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        
        // Actualizar logos
        if (loginLogoLight && loginLogoDark) {
            loginLogoLight.classList.remove('hidden');
            loginLogoDark.classList.add('hidden');
        }
        
        if (headerLogoLight && headerLogoDark) {
            headerLogoLight.classList.remove('hidden');
            headerLogoDark.classList.add('hidden');
        }
        
        // Guardar preferencia
        localStorage.setItem('repuestos_theme', 'light');
        localStorage.setItem('repuestos_logo_theme', 'light');
    }
}

function togglePasswordVisibility(input, button) {
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    button.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

// ===== FUNCIONES DE AUTENTICACIÓN =====
async function checkSession() {
    try {
        const userSession = localStorage.getItem('repuestos_user_session');
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
                localStorage.removeItem('repuestos_user_session');
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
            
            localStorage.setItem('repuestos_user_session', JSON.stringify({
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
    localStorage.removeItem('repuestos_user_session');
    currentUser = null;
    showLogin();
}

// ===== FUNCIONES PARA FILTROS MÓVIL =====

function verificarDispositivo() {
    const esMovil = window.innerWidth <= 768;
    
    if (filtrosMovilBtn) {
        if (esMovil) {
            filtrosMovilBtn.classList.remove('hidden');
        } else {
            filtrosMovilBtn.classList.add('hidden');
        }
    }
}

function abrirModalFiltros() {
    cargarFiltrosEnModal();
    actualizarContadorFiltrosActivos();
    
    filtrosModal.classList.add('activo');
    filtrosModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const firstInput = filtrosModal.querySelector('input, button');
        if (firstInput) firstInput.focus();
    }, 100);
}

function cerrarModalFiltros() {
    filtrosModal.classList.remove('activo');
    filtrosModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function cargarFiltrosEnModal() {
    if (!filtrosModalContent) return;
    
    let html = `
        <div class="filtros-container-modal">
            <!-- Grupo: Categorías -->
            <div class="filtro-grupo-modal">
                <h4><i class="fas fa-tags"></i> Categoría</h4>
                <div class="filtro-opciones-modal">
                    ${categorias.map(categoria => `
                        <label class="filtro-checkbox-modal">
                            <input type="checkbox" 
                                   name="categoria-movil" 
                                   value="${categoria.id}"
                                   ${estadoFiltros.categorias && estadoFiltros.categorias.includes(categoria.id.toString()) ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeModal('categorias', '${categoria.id}', this.checked)">
                            <span>${categoria.nombre}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- Grupo: Tipos -->
            <div class="filtro-grupo-modal">
                <h4><i class="fas fa-cog"></i> Tipo</h4>
                <div class="filtro-opciones-modal">
                    ${tipos.map(tipo => `
                        <label class="filtro-checkbox-modal">
                            <input type="checkbox" 
                                   name="tipo-movil" 
                                   value="${tipo.id}"
                                   ${estadoFiltros.tipos && estadoFiltros.tipos.includes(tipo.id.toString()) ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeModal('tipos', '${tipo.id}', this.checked)">
                            <span>${tipo.nombre}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- Grupo: Estados -->
            <div class="filtro-grupo-modal">
                <h4><i class="fas fa-info-circle"></i> Estado</h4>
                <div class="filtro-opciones-modal">
                    ${estados.map(estado => `
                        <label class="filtro-checkbox-modal">
                            <input type="checkbox" 
                                   name="estado-movil" 
                                   value="${estado.id}"
                                   ${estadoFiltros.estados && estadoFiltros.estados.includes(estado.id.toString()) ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeModal('estados', '${estado.id}', this.checked)">
                            <span>${estado.nombre}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- Grupo: Ubicaciones -->
            <div class="filtro-grupo-modal">
                <h4><i class="fas fa-map-marker-alt"></i> Ubicación</h4>
                <div class="filtro-opciones-modal">
                    ${ubicaciones.map(ubicacion => `
                        <label class="filtro-checkbox-modal">
                            <input type="checkbox" 
                                   name="ubicacion-movil" 
                                   value="${ubicacion.id_ubicacion}"
                                   ${estadoFiltros.ubicaciones && estadoFiltros.ubicaciones.includes(ubicacion.id_ubicacion.toString()) ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeModal('ubicaciones', '${ubicacion.id_ubicacion}', this.checked)">
                            <span>${ubicacion.nombre} - PISO ${ubicacion.piso}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- Grupo: Marcas -->
            <div class="filtro-grupo-modal">
                <h4><i class="fas fa-trademark"></i> Marca</h4>
                <div class="filtro-opciones-modal">
                    ${marcas.map(marca => `
                        <label class="filtro-checkbox-modal">
                            <input type="checkbox" 
                                   name="marca-movil" 
                                   value="${marca.id}"
                                   ${estadoFiltros.marcas && estadoFiltros.marcas.includes(marca.id.toString()) ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeModal('marcas', '${marca.id}', this.checked)">
                            <span>${marca.nombre}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <!-- Grupo: Usuarios -->
            <div class="filtro-grupo-modal">
                <h4><i class="fas fa-user"></i> Usuario</h4>
                <div class="filtro-opciones-modal">
                    ${usuarios.map(usuario => `
                        <label class="filtro-checkbox-modal">
                            <input type="checkbox" 
                                   name="usuario-movil" 
                                   value="${usuario.id}"
                                   ${estadoFiltros.usuarios && estadoFiltros.usuarios.includes(usuario.id.toString()) ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeModal('usuarios', '${usuario.id}', this.checked)">
                            <span>${usuario.nombre} ${usuario.apellido}</span>
                        </label>
                    `).join('')}
                    <label class="filtro-checkbox-modal">
                        <input type="checkbox" 
                               name="usuario-movil" 
                               value="sin_asignar"
                               ${estadoFiltros.usuarios && estadoFiltros.usuarios.includes('sin_asignar') ? 'checked' : ''}
                               onchange="actualizarFiltroDesdeModal('usuarios', 'sin_asignar', this.checked)">
                        <span><i>SIN ASIGNAR</i></span>
                    </label>
                </div>
            </div>
        </div>
        
        <!-- Estado actual de filtros -->
        <div class="filtros-estado-actual" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <h4><i class="fas fa-info-circle"></i> Filtros Activos</h4>
            <div id="filtrosActivosList" class="filtros-activos-list"></div>
        </div>
    `;
    
    filtrosModalContent.innerHTML = html;
    actualizarListaFiltrosActivos();
}

function actualizarFiltroDesdeModal(tipo, valor, checked) {
    // Usar la misma función que los filtros de escritorio
    actualizarFiltroDesdeFijo(tipo, valor, checked);
    actualizarContadorFiltrosActivos();
    actualizarListaFiltrosActivos();
}

function actualizarContadorFiltrosActivos() {
    filtrosActivosCount = 0;
    
    // Contar filtros activos
    Object.keys(estadoFiltros).forEach(key => {
        if (Array.isArray(estadoFiltros[key])) {
            filtrosActivosCount += estadoFiltros[key].length;
        } else if (estadoFiltros[key] && estadoFiltros[key].trim() !== '') {
            filtrosActivosCount++;
        }
    });
    
    // Actualizar badge
    if (filterBadge) {
        filterBadge.textContent = filtrosActivosCount;
        
        if (filtrosActivosCount > 0) {
            filterBadge.style.display = 'flex';
        } else {
            filterBadge.style.display = 'none';
        }
    }
}

function actualizarListaFiltrosActivos() {
    const filtrosActivosList = document.getElementById('filtrosActivosList');
    if (!filtrosActivosList) return;
    
    let html = '';
    
    // Categorías activas
    if (estadoFiltros.categorias && estadoFiltros.categorias.length > 0) {
        estadoFiltros.categorias.forEach(catId => {
            const categoria = categorias.find(c => String(c.id) === catId);
            if (categoria) {
                html += `<span class="filtro-activo-chip">Categoría: ${categoria.nombre}</span>`;
            }
        });
    }
    
    // Tipos activos
    if (estadoFiltros.tipos && estadoFiltros.tipos.length > 0) {
        estadoFiltros.tipos.forEach(tipoId => {
            const tipo = tipos.find(t => String(t.id) === tipoId);
            if (tipo) {
                html += `<span class="filtro-activo-chip">Tipo: ${tipo.nombre}</span>`;
            }
        });
    }
    
    // Estados activos
    if (estadoFiltros.estados && estadoFiltros.estados.length > 0) {
        estadoFiltros.estados.forEach(estadoId => {
            const estado = estados.find(e => String(e.id) === estadoId);
            if (estado) {
                html += `<span class="filtro-activo-chip">Estado: ${estado.nombre}</span>`;
            }
        });
    }
    
    // Agregar más para otros filtros...
    
    if (html === '') {
        html = '<p style="color: var(--text-light); font-style: italic;">No hay filtros activos</p>';
    }
    
    filtrosActivosList.innerHTML = html;
}

function aplicarFiltrosDesdeModal() {
    aplicarFiltros();
    cerrarModalFiltros();
    mostrarToast('Filtros aplicados');
}

function limpiarFiltrosDesdeModal() {
    reiniciarFiltros();
    cerrarModalFiltros();
    mostrarToast('Filtros limpiados');
}

// ===== AGREGAR ESTILOS INLINE PARA LOS CHIPS =====
// Agregar esto a una función que se ejecute al cargar
function agregarEstilosFiltrosActivos() {
    const style = document.createElement('style');
    style.textContent = `
        .filtro-activo-chip {
            display: inline-block;
            background: var(--primary-ultra-light);
            color: var(--primary-color);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            margin: 3px;
            border: 1px solid var(--primary-color);
        }
        
        .filtros-activos-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 10px;
        }
    `;
    document.head.appendChild(style);
}

// ===== FUNCIONES PARA MODAL DE ETIQUETA =====
function abrirModalEtiqueta(repuestoId) {
    repuestoParaEtiqueta = repuestos.find(r => r.id === repuestoId);
    
    if (!repuestoParaEtiqueta) {
        showSystemMessage('Repuesto no encontrado.', 'error');
        return;
    }
    
    // Actualizar vista previa
    actualizarVistaPreviaEtiqueta(repuestoParaEtiqueta);
    
    etiquetaModal.classList.add('activo');
    etiquetaModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Enfocar botón de generar
    setTimeout(() => {
        generarEtiquetaBtn.focus();
    }, 300);
}

function closeEtiquetaModal() {
    etiquetaModal.classList.remove('activo');
    etiquetaModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    repuestoParaEtiqueta = null;
}

function actualizarVistaPreviaEtiqueta(repuesto) {
    const previewContainer = document.querySelector('.preview-etiqueta');
    if (!previewContainer) return;
    
    const categoriaNombre = repuesto.categoria_repuesto ? repuesto.categoria_repuesto.nombre : 'Sin categoría';
    const tipoNombre = repuesto.tipo_repuesto ? repuesto.tipo_repuesto.nombre : 'Sin tipo';
    const ubicacionNombre = repuesto.ubicacion ? repuesto.ubicacion.nombre : 'Sin ubicación';
    const codigo = repuesto.numero_parte || 'Sin código';
    
    // Actualizar contenido de vista previa
    const previewContent = `
        <div class="preview-content">
            <div class="preview-header">
                <span class="preview-codigo">${codigo}</span>
            </div>
            <h4 class="preview-nombre">${repuesto.nombre.substring(0, 30)}${repuesto.nombre.length > 30 ? '...' : ''}</h4>
            <div class="preview-details">
                <p><strong>Categoría:</strong> ${categoriaNombre.substring(0, 15)}${categoriaNombre.length > 15 ? '...' : ''}</p>
                <p><strong>Tipo:</strong> ${tipoNombre.substring(0, 15)}${tipoNombre.length > 15 ? '...' : ''}</p>
                <p><strong>Ubicación:</strong> ${ubicacionNombre.substring(0, 15)}${ubicacionNombre.length > 15 ? '...' : ''}</p>
            </div>
            <div class="preview-qr-placeholder">
                <i class="fas fa-qrcode"></i>
            </div>
        </div>
    `;
    
    previewContainer.innerHTML = previewContent;
}

async function generarEtiquetaPDF() {
    if (!repuestoParaEtiqueta) {
        showSystemMessage('No hay repuesto seleccionado.', 'error');
        return;
    }
    
    // Mostrar loading
    generarEtiquetaBtn.disabled = true;
    generarEtiquetaBtn.innerHTML = '<div class="loading"></div> Generando...';
    
    try {
        // Crear nuevo documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [75, 50]
        });
        
        const repuesto = repuestoParaEtiqueta;
        
        // ===== OBTENER DATOS =====
        const codigo = repuesto.numero_parte || `ID${repuesto.id.toString().padStart(4, '0')}`;
        const estado = repuesto.estado ? repuesto.estado.nombre : 'Sin estado';
        const marca = repuesto.marca ? repuesto.marca.nombre : '';
        const usuarioAsignado = repuesto.usuario_asignado ? 
            `${repuesto.usuario_asignado.nombre} ${repuesto.usuario_asignado.apellido}` : '';
        
        // Usuario creador: prioridad 1) datos del repuesto, 2) usuario actual, 3) "Sistema"
        let usuarioCreador = 'Sistema';
        if (repuesto.usuario_creador) {
            usuarioCreador = `${repuesto.usuario_creador.nombre} ${repuesto.usuario_creador.apellido}`;
        } else if (currentUser) {
            usuarioCreador = `${currentUser.nombre} ${currentUser.apellido}`;
        }
        
        // Acortar si es muy largo
        if (usuarioCreador.length > 30) {
            usuarioCreador = usuarioCreador.substring(0, 27) + '...';
        }
        
        const fecha = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const hora = new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // ===== DISEÑO MEJORADO =====
        const margin = 4;
        const width = 75 - (margin * 2);
        const height = 50 - (margin * 2);
        
        // 1. MARCO PRINCIPAL
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(margin, margin, width, height);
        
        // 2. SECCIÓN SUPERIOR - NOMBRE
        const topSectionHeight = 17;
        const nombreY = margin + 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        const nombreMaxWidth = width - 10;
        const nombreLines = doc.splitTextToSize(repuesto.nombre, nombreMaxWidth);
        const maxNombreLines = Math.min(nombreLines.length, 2);
        const nombreTotalHeight = maxNombreLines * 4;
        const startY = nombreY - (nombreTotalHeight / 2) + 2;
        
        for (let i = 0; i < maxNombreLines; i++) {
            const line = i === 1 && nombreLines.length > 2 ? 
                nombreLines[i].substring(0, 25) + '...' : 
                nombreLines[i];
            doc.text(line, margin + width / 2, startY + (i * 4), { align: 'center' });
        }
        
        const codigoY = startY + (maxNombreLines * 4) + 1;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`ID: ${repuesto.id}`, margin + width / 2, codigoY, { align: 'center' });
        
        // 3. SECCIÓN MEDIA - INFORMACIÓN
        const middleSectionY = margin + topSectionHeight + 2;
        const labelX = margin + 5;
        const valueX = margin + 25;
        const valueWidth = width - 30;
        
        let currentY = middleSectionY;
        
        // FILA 1: ESTADO
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('ESTADO:', labelX, currentY);
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(estado, valueX, currentY + 0.5);
        
        currentY += 7;
        
        // FILA 2: MARCA
        if (marca && marca.trim() !== '') {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text('MARCA:', labelX, currentY);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(marca, valueX, currentY);
            
            currentY += 5;
        } else {
            currentY += 4;
        }
        
        // FILA 3: USUARIO ASIGNADO
        if (usuarioAsignado && usuarioAsignado.trim() !== '') {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text('ASIGNADO A:', labelX, currentY);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            
            const usuarioMaxWidth = valueWidth - 5;
            const usuarioLines = doc.splitTextToSize(usuarioAsignado, usuarioMaxWidth);
            
            for (let i = 0; i < Math.min(usuarioLines.length, 2); i++) {
                doc.text(usuarioLines[i], valueX, currentY + (i * 3.5));
            }
            
            currentY += (Math.min(usuarioLines.length, 2) * 2.5);
        } else {
            currentY += 2;
        }
        
        // 4. PIE DE PÁGINA - 2 LÍNEAS
        const footerY = currentY + 1;
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 90, 90);
        
        const fechaX = margin + 5;
        const fechaTextY = footerY + 1;
        const creadoPorTextY = fechaTextY + 2.5;
        
        // Línea 1: Fecha de creación
        doc.text(`Fecha de Creación: ${fecha} ${hora}`, fechaX, fechaTextY);
        
        // Línea 2: Creado por
        doc.text(`Creado por: ${usuarioCreador}`, fechaX, creadoPorTextY);
        
        // ===== GUARDAR ARCHIVO =====
        const nombreArchivo = `Etiqueta_${codigo}_${fecha.replace(/\//g, '-')}.pdf`;
        doc.save(nombreArchivo);
        
        // Mostrar mensaje de éxito
        mostrarToast('Etiqueta PDF generada exitosamente');
        closeEtiquetaModal();
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        showSystemMessage('Error al generar la etiqueta PDF: ' + error.message, 'error');
    } finally {
        // Restaurar botón
        generarEtiquetaBtn.disabled = false;
        generarEtiquetaBtn.innerHTML = '<i class="fas fa-print"></i> Generar Etiqueta PDF';
    }
}

function generarEtiquetasMasivo(repuestosIds) {
    if (!repuestosIds || repuestosIds.length === 0) {
        showSystemMessage('No hay repuestos seleccionados.', 'warning');
        return;
    }
    
    // Crear PDF con múltiples etiquetas
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    let x = 10;
    let y = 10;
    const etiquetaWidth = 75;
    const etiquetaHeight = 50;
    const margin = 5;
    
    repuestosIds.forEach((repuestoId, index) => {
        const repuesto = repuestos.find(r => r.id === repuestoId);
        if (!repuesto) return;
        
        // Si no cabe en la fila, pasar a siguiente fila
        if (x + etiquetaWidth > 200) {
            x = 10;
            y += etiquetaHeight + 5;
        }
        
        // Si no cabe en la página, nueva página
        if (y + etiquetaHeight > 140) {
            doc.addPage();
            x = 10;
            y = 10;
        }
        
        // Dibujar etiqueta
        doc.setDrawColor(40, 167, 69);
        doc.roundedRect(x, y, etiquetaWidth, etiquetaHeight, 2, 2);
        
        // Contenido de la etiqueta
        doc.setFontSize(10);
        doc.text(repuesto.nombre.substring(0, 25), x + 5, y + 15);
        doc.setFontSize(8);
        doc.text(`Código: ${repuesto.numero_parte || 'Sin código'}`, x + 5, y + 25);
        
        x += etiquetaWidth + 5;
    });
    
    doc.save(`etiquetas_masivo_${new Date().getTime()}.pdf`);
    mostrarToast(`${repuestosIds.length} etiquetas generadas`);
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
        userAvatar.textContent = initials.toUpperCase() || 'A';
        
        userName.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
        
        let role = 'Usuario';
        if (currentUser.sistemas_acceso?.sistemaRepuesto?.rol === 'administrador') {
            role = 'Administrador';
        } else if (currentUser.sistemas_acceso?.sistemaRepuesto?.rol === 'supervisor') {
            role = 'Supervisor';
        }
        userRole.textContent = role;
    }
}

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

// ===== FUNCIONES DE BÚSQUEDA =====
function handleSearchInput() {
    clearTimeout(busquedaTimeout);
    
    busquedaTimeout = setTimeout(() => {
        const consulta = this.value.trim().toLowerCase();
        
        if (consulta.length > 0) {
            estadoFiltros.busqueda = consulta;
            
            // Mostrar sugerencias si hay menos de 3 caracteres
            if (consulta.length < 3) {
                buscarSugerencias(consulta);
            } else {
                buscarRepuestos(consulta);
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

function buscarSugerencias(consulta) {
    if (!searchResults || consulta.length < 2) return;
    
    const sugerencias = [];
    
    // Sugerir categorías
    const categoriasSugeridas = categorias
        .filter(c => c.nombre.toLowerCase().includes(consulta))
        .slice(0, 3);
    
    categoriasSugeridas.forEach(categoria => {
        sugerencias.push({
            tipo: 'categoria',
            nombre: `Categoría: ${categoria.nombre}`,
            accion: () => {
                estadoFiltros.categorias = [categoria.id.toString()];
                aplicarFiltros();
                searchInput.value = '';
            }
        });
    });
    
    // Mostrar sugerencias
    if (sugerencias.length > 0) {
        let html = '<div class="sugerencias-header">Sugerencias:</div>';
        sugerencias.forEach(sug => {
            html += `
                <div class="search-result-item sugerencia" 
                     onclick="${sug.accion.toString().replace(/"/g, '&quot;')}"
                     onkeydown="if(event.key === 'Enter') { ${sug.accion.toString().replace(/"/g, '&quot;')} }"
                     role="button" 
                     tabindex="0">
                    <i class="fas fa-lightbulb" style="color: var(--warning-color);"></i>
                    <span>${sug.nombre}</span>
                </div>
            `;
        });
        
        searchResults.innerHTML = html;
        searchResults.classList.add('active');
    }
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

function buscarRepuestos(consulta) {
    if (!searchResults) return;
    
    if (consulta.length < 2) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        return;
    }
    
    const resultados = repuestos.filter(repuesto => {
        const enCodigo = repuesto.id?.toLowerCase().includes(consulta);
        const enNombre = repuesto.nombre?.toLowerCase().includes(consulta);
        const enModelo = repuesto.modelo?.toLowerCase().includes(consulta);
        
        return enCodigo || enNombre || enModelo;
    }).slice(0, 20);
    
    if (resultados.length > 0) {
        let htmlResultados = '';
        
        resultados.forEach(repuesto => {
            htmlResultados += `
                <div class="search-result-item" data-id="${repuesto.id}" 
                     onclick="verDetallesDesdeBusqueda('${repuesto.id}')" 
                     onkeydown="if(event.key === 'Enter') verDetallesDesdeBusqueda('${repuesto.id}')"
                     role="button" 
                     tabindex="0"
                     aria-label="${repuesto.nombre}">
                    <div style="width: 50px; height: 50px; border-radius: 8px; background: var(--gray-light); display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-cog" style="color: var(--primary-color); font-size: 1.5rem;"></i>
                    </div>
                    <div class="search-result-info">
                        <h4>${repuesto.nombre}</h4>
                        <p>${repuesto.categoria_repuesto?.nombre || 'Sin categoría'}</p>
                        <small><strong>${repuesto.estado?.nombre || 'Sin estado'}</strong></small>
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
                <p>No se encontraron repuestos para "${consulta}"</p>
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
    editRepuesto(id);
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
            
        case 'tipo':
            titulo = 'Tipo';
            icono = 'fas fa-cog';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${tipos.map(tipoItem => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="tipo-fijo" value="${tipoItem.id}" 
                                       ${estadoFiltros.tipos && estadoFiltros.tipos.includes(tipoItem.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('tipos', '${tipoItem.id}', this.checked)"
                                       aria-label="Filtrar por tipo ${tipoItem.nombre}">
                                <span>${tipoItem.nombre}</span>
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
                                <input type="checkbox" name="ubicacion-fijo" value="${ubicacion.id_ubicacion}" 
                                       ${estadoFiltros.ubicaciones && estadoFiltros.ubicaciones.includes(ubicacion.id_ubicacion.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('ubicaciones', '${ubicacion.id_ubicacion}', this.checked)"
                                       aria-label="Filtrar por ubicación ${ubicacion.nombre}">
                                <span>${ubicacion.nombre}  - PISO ${ubicacion.piso} (${ubicacion.descripcion}) </span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'marca':
            titulo = 'Marca';
            icono = 'fas fa-trademark';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${marcas.map(marca => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="marca-fijo" value="${marca.id}" 
                                       ${estadoFiltros.marcas && estadoFiltros.marcas.includes(marca.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('marcas', '${marca.id}', this.checked)"
                                       aria-label="Filtrar por marca ${marca.nombre}">
                                <span>${marca.nombre}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;

        case 'usuario':  
            titulo = 'Usuario Asignado';
            icono = 'fas fa-user';
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${usuarios.map(usuario => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="usuario-fijo" value="${usuario.id}" 
                                       ${estadoFiltros.usuarios && estadoFiltros.usuarios.includes(usuario.id.toString()) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('usuarios', '${usuario.id}', this.checked)"
                                       aria-label="Filtrar por usuario ${usuario.nombre} ${usuario.apellido}">
                                <span>${usuario.nombre} ${usuario.apellido}</span>
                            </label>
                        `).join('')}
                        <!-- Opción para repuestos sin usuario asignado -->
                        <label class="filtro-checkbox">
                            <input type="checkbox" name="usuario-fijo" value="sin_asignar" 
                                   ${estadoFiltros.usuarios && estadoFiltros.usuarios.includes('sin_asignar') ? 'checked' : ''}
                                   onchange="actualizarFiltroDesdeFijo('usuarios', 'sin_asignar', this.checked)"
                                   aria-label="Filtrar repuestos sin usuario asignado">
                            <span><i>SIN ASIGNAR</i></span>
                        </label>
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
    estadoFiltros.tipos = [];
    estadoFiltros.estados = [];
    estadoFiltros.ubicaciones = [];
    estadoFiltros.marcas = [];
    estadoFiltros.usuarios = []; 
    estadoFiltros.busqueda = '';
    
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.remove('active');
    
    productosFiltrados = [...repuestos];
    paginaActual = 1;
    
    actualizarContadorProductos();
    renderizarRepuestos();
    
    // ACTUALIZAR CONTADOR DE FILTROS ACTIVOS
    actualizarContadorFiltrosActivos();

    mostrarToast('Filtros restablecidos');
    cerrarOpcionesFiltro();

    // Si el modal de filtros está abierto, actualizarlo
    if (filtrosModal.classList.contains('activo')) {
        cargarFiltrosEnModal();
    }    
}

function aplicarFiltros() {
    productosFiltrados = repuestos.filter(repuesto => {
        // Filtro por categoría
        if (estadoFiltros.categorias && estadoFiltros.categorias.length > 0 && 
            !estadoFiltros.categorias.includes(repuesto.categoria_repuesto_id?.toString())) {
            return false;
        }
        
        // Filtro por tipo
        if (estadoFiltros.tipos && estadoFiltros.tipos.length > 0 && 
            !estadoFiltros.tipos.includes(repuesto.tipo_repuesto_id?.toString())) {
            return false;
        }
        
        // Filtro por estado
        if (estadoFiltros.estados && estadoFiltros.estados.length > 0 && 
            !estadoFiltros.estados.includes(repuesto.estado_id?.toString())) {
            return false;
        }
        
        // Filtro por ubicación
        if (estadoFiltros.ubicaciones && estadoFiltros.ubicaciones.length > 0 && 
            !estadoFiltros.ubicaciones.includes(repuesto.ubicacion_id?.toString())) {
            return false;
        }
        
        // Filtro por marca
        if (estadoFiltros.marcas && estadoFiltros.marcas.length > 0 && 
            !estadoFiltros.marcas.includes(repuesto.marca_id?.toString())) {
            return false;
        }
        
        // Filtro por usuario
        if (estadoFiltros.usuarios && estadoFiltros.usuarios.length > 0) {
            const usuarioId = repuesto.usuario_id?.toString();
            
            // Caso especial: "sin_asignar"
            if (estadoFiltros.usuarios.includes('sin_asignar')) {
                // Si buscamos "sin asignar" y el repuesto tiene usuario, no incluirlo
                if (usuarioId) return false;
            } else {
                // Si no estamos buscando "sin asignar" y el repuesto no tiene usuario, no incluirlo
                if (!usuarioId) return false;
                
                // Verificar si el usuario está en los seleccionados
                if (!estadoFiltros.usuarios.includes(usuarioId)) {
                    return false;
                }
            }
        }
        
        // Filtro por búsqueda
        if (estadoFiltros.busqueda) {
            const busquedaMin = estadoFiltros.busqueda.toLowerCase();
            const enCodigo = repuesto.id?.toLowerCase().includes(busquedaMin);
            const enNombre = repuesto.nombre?.toLowerCase().includes(busquedaMin);
            const enModelo = repuesto.modelo?.toLowerCase().includes(busquedaMin);
            
            if (!enCodigo && !enNombre && !enModelo) {
                return false;
            }
        }
        
        return true;
    });
    
    paginaActual = 1;
    actualizarContadorProductos();
    renderizarRepuestos();

    // ACTUALIZAR CONTADOR DE FILTROS ACTIVOS
    actualizarContadorFiltrosActivos();
    
    mostrarToast(`${productosFiltrados.length} repuestos encontrados`);
}

// ===== FUNCIONES PARA CARGAR DATOS =====
async function cargarDatosIniciales() {
    try {
        console.log('Cargando datos iniciales...');
        
        // Mostrar loading global
        mostrarLoadingGlobal('Cargando sistema...');
        
        // Cargar datos en paralelo pero con control
        const promises = [
            cargarCategorias(),
            cargarTipos(),
            cargarUbicaciones(),
            cargarEstados(),
            cargarMarcas(),
            cargarUsuarios()
        ];
        
        // Ejecutar promesas con timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout al cargar datos')), 10000);
        });
        
        await Promise.race([
            Promise.all(promises),
            timeoutPromise
        ]);
        
        // Actualizar loading message
        const loadingOverlay = document.getElementById('globalLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.querySelector('.loading-text').textContent = 'Cargando inventario...';
        }
        
        // Cargar repuestos
        await cargarRepuestos();
        
        // Ocultar loading global
        setTimeout(() => {
            ocultarLoadingGlobal();
            mostrarToast('Sistema cargado correctamente');
        }, 500);
        
    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        
        // Ocultar loading
        ocultarLoadingGlobal();
        
        // Mostrar error amigable
        showSystemMessage(`Error al cargar los datos: ${error.message}`, 'error');
        
        // Mostrar opciones de recuperación
        setTimeout(() => {
            if (confirm('Error al cargar los datos. ¿Deseas recargar la página?')) {
                location.reload();
            }
        }, 1000);
    }
}

async function cargarCategorias() {
    try {
        const { data, error } = await supabaseClient
            .from('categoria_repuesto')
            .select('id, nombre')
            .order('nombre');
        
        if (error) throw error;
        categorias = data || [];
        console.log(`Categorías cargadas: ${categorias.length}`);
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categorias = [];
        throw error;
    }
}

async function cargarTipos() {
    try {
        const { data, error } = await supabaseClient
            .from('tipo_repuesto')
            .select('id, nombre, categoria_repuesto_id')
            .order('nombre');
        
        if (error) throw error;
        tipos = data || [];
        console.log(`Tipos cargados: ${tipos.length}`);
        
    } catch (error) {
        console.error('Error cargando tipos:', error);
        tipos = [];
        throw error;
    }
}

async function cargarUbicaciones() {
    try {
        const { data, error } = await supabaseClient
            .from('ubicacion')
            .select('id_ubicacion, nombre, piso, descripcion')
            .order('nombre');
        
        if (error) throw error;
        ubicaciones = data || [];
        console.log(`Ubicaciones cargadas: ${ubicaciones.length}`);
        
    } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        ubicaciones = [];
        throw error;
    }
}

async function cargarEstados() {
    try {
        const { data, error } = await supabaseClient
            .from('estado')
            .select('id, nombre')
            .order('nombre');
        
        if (error) throw error;
        estados = data || [];
        console.log(`Estados cargados: ${estados.length}`);
        
    } catch (error) {
        console.error('Error cargando estados:', error);
        estados = [];
        throw error;
    }
}

async function cargarMarcas() {
    try {
        const { data, error } = await supabaseClient
            .from('marcas')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        marcas = data || [];
        console.log(`Marcas cargadas: ${marcas.length}`);
        
    } catch (error) {
        console.error('Error cargando marcas:', error);
        marcas = [];
        throw error;
    }
}

async function cargarUsuarios() {
    try {
        const { data, error } = await supabaseClient
            .from('usuario')
            .select('id, nombre, apellido, correo')
            .eq('activo', true)
            .order('nombre');
        
        if (error) throw error;
        usuarios = data || [];
        console.log(`Usuarios cargados: ${usuarios.length}`);
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usuarios = [];
        throw error;
    }
}

async function cargarRepuestos() {
    try {
        console.log('Iniciando carga optimizada de repuestos...');
        
        // Mostrar skeleton loading
        mostrarSkeletonLoading();
        
        // PRIMERO: Cargar los repuestos básicos
        const { data: repuestosData, error: repuestosError } = await supabaseClient
            .from('repuesto')
            .select('*')
            .order('creado_en', { ascending: false });
        
        if (repuestosError) {
            console.error('Error en consulta básica de repuestos:', repuestosError);
            throw repuestosError;
        }
        
        console.log(`Repuestos básicos cargados: ${repuestosData?.length || 0}`);
        
        if (!repuestosData || repuestosData.length === 0) {
            repuestos = [];
            productosFiltrados = [];
            
            setTimeout(() => {
                ocultarSkeletonLoading();
                renderizarRepuestos();
                mostrarToast('No hay repuestos registrados');
            }, 300);
            
            return;
        }
        
        // SEGUNDO: Cargar todas las relaciones en paralelo
        const repuestosConRelaciones = await Promise.all(
            repuestosData.map(async (repuesto) => {
                const relaciones = {};
                
                try {
                    // Cargar categoría
                    if (repuesto.categoria_repuesto_id) {
                        const { data: categoria } = await supabaseClient
                            .from('categoria_repuesto')
                            .select('*')
                            .eq('id', repuesto.categoria_repuesto_id)
                            .single();
                        relaciones.categoria_repuesto = categoria;
                    }
                    
                    // Cargar tipo
                    if (repuesto.tipo_repuesto_id) {
                        const { data: tipo } = await supabaseClient
                            .from('tipo_repuesto')
                            .select('*')
                            .eq('id', repuesto.tipo_repuesto_id)
                            .single();
                        relaciones.tipo_repuesto = tipo;
                    }
                    
                    // Cargar ubicación
                    if (repuesto.ubicacion_id) {
                        const { data: ubicacion } = await supabaseClient
                            .from('ubicacion')
                            .select('*')
                            .eq('id_ubicacion', repuesto.ubicacion_id)
                            .single();
                        relaciones.ubicacion = ubicacion;
                    }
                    
                    // Cargar estado
                    if (repuesto.estado_id) {
                        const { data: estado } = await supabaseClient
                            .from('estado')
                            .select('*')
                            .eq('id', repuesto.estado_id)
                            .single();
                        relaciones.estado = estado;
                    }
                    
                    // Cargar marca
                    if (repuesto.marca_id) {
                        const { data: marca } = await supabaseClient
                            .from('marcas')
                            .select('*')
                            .eq('id', repuesto.marca_id)
                            .single();
                        relaciones.marca = marca;
                    }
                    
                    // Cargar usuario asignado
                    if (repuesto.usuario_id) {
                        const { data: usuario } = await supabaseClient
                            .from('usuario')
                            .select('id, nombre, apellido')
                            .eq('id', repuesto.usuario_id)
                            .single();
                        relaciones.usuario_asignado = usuario;
                    }
                    
                    // Cargar usuario creador
                    if (repuesto.creado_por) {
                        const { data: creador } = await supabaseClient
                            .from('usuario')
                            .select('id, nombre, apellido')
                            .eq('id', repuesto.creado_por)
                            .single();
                        relaciones.usuario_creador = creador;
                    }
                    
                } catch (error) {
                    console.warn(`Error cargando relaciones para repuesto ${repuesto.id}:`, error);
                }
                
                return {
                    ...repuesto,
                    ...relaciones
                };
            })
        );
        
        repuestos = repuestosConRelaciones;
        productosFiltrados = [...repuestos];
        
        console.log(`Repuestos procesados con relaciones: ${repuestos.length}`);
        
        // Ocultar skeleton y mostrar datos
        setTimeout(() => {
            ocultarSkeletonLoading();
            renderizarRepuestos();
            mostrarToast(`${repuestos.length} repuestos cargados`);
        }, 300);
        
    } catch (error) {
        console.error('Error cargando repuestos:', error);
        
        // Ocultar skeleton en caso de error
        ocultarSkeletonLoading();
        
        // Mostrar error específico según el tipo
        let mensajeError = 'Error al cargar el inventario';
        
        if (error.code === 'PGRST201') {
            mensajeError = 'Error de configuración en la base de datos. Contacta al administrador.';
        } else if (error.message) {
            mensajeError = `Error: ${error.message}`;
        }
        
        showSystemMessage(mensajeError, 'error');
        
        // Mostrar estado de error
        repuestosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--warning-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">Error al cargar el inventario</h3>
                <p style="color: var(--gray-dark); margin-bottom: 15px;">${mensajeError}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="cargarRepuestos()">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                    <button class="btn btn-secondary" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Recargar página
                    </button>
                </div>
            </div>
        `;
    }
}

// ===== FUNCIONES PARA SKELETON LOADING =====

function mostrarSkeletonLoading() {
    const skeletonHTML = `
        <div class="skeleton-container">
            ${Array(6).fill().map((_, i) => `
                <div class="skeleton-card" aria-label="Cargando repuesto ${i + 1}">
                    <div class="skeleton-badge skeleton"></div>
                    <div class="skeleton-image skeleton"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-text skeleton" style="width: 70%;"></div>
                        <div class="skeleton-text skeleton" style="width: 90%; margin-bottom: 20px;"></div>
                        <div class="skeleton-grid">
                            ${Array(6).fill().map(() => `
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
    
    repuestosGrid.innerHTML = skeletonHTML;
    
    // También mostrar loading en el contador
    if (productsStats) {
        productsStats.innerHTML = `<span class="skeleton" style="width: 200px; height: 20px; display: inline-block;"></span>`;
    }
}

function ocultarSkeletonLoading() {
    // El contenido se reemplazará en renderizarRepuestos()
}

function mostrarLoadingGlobal(mensaje = 'Cargando...') {
    // Crear overlay si no existe
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

// Función para mostrar loading en secciones específicas
function mostrarSectionLoading(contenedor, mensaje = 'Cargando...') {
    contenedor.innerHTML = `
        <div class="section-loading">
            <div class="loading-spinner"></div>
            <div class="loading-text">${mensaje}</div>
        </div>
    `;
}

// ===== FUNCIONES PARA REPUESTOS =====
function renderizarRepuestos() {
    if (!repuestosGrid) return;
    
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const indiceFin = indiceInicio + productosPorPagina;
    const productosPaginados = productosFiltrados.slice(indiceInicio, indiceFin);
    
    // Si no hay productos, mostrar mensaje
    if (productosPaginados.length === 0) {
        repuestosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; animation: fadeIn 0.5s ease;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">No se encontraron repuestos</h3>
                <p style="color: var(--gray-dark);">Intenta con otros filtros o términos de búsqueda</p>
                <button class="btn btn-primary" onclick="reiniciarFiltros()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Ver todos los repuestos
                </button>
            </div>
        `;
        actualizarContadorProductos();
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    // Crear fragmento para mejor performance
    const fragment = document.createDocumentFragment();
    
    productosPaginados.forEach(repuesto => {
        const tarjetaRepuesto = crearTarjetaRepuesto(repuesto);
        fragment.appendChild(tarjetaRepuesto);
    });
    
    // Limpiar y agregar con animación
    repuestosGrid.innerHTML = '';
    repuestosGrid.appendChild(fragment);
    
    // Renderizar paginación
    renderizarPaginacion();
    
    // Actualizar contador
    actualizarContadorProductos();
    
    // Agregar animación de entrada
    setTimeout(() => {
        document.querySelectorAll('.repuesto-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('fade-in');
        });
    }, 10);
}

// Agregar esta animación al CSS
const animacionCSS = `
    .repuesto-card {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .repuesto-card.fade-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

// Agregar el estilo al documento
const styleElement = document.createElement('style');
styleElement.textContent = animacionCSS;
document.head.appendChild(styleElement);

// Agregar esta nueva función para actualizar solo el contador
function actualizarContadorProductos() {
    const indiceInicio = (paginaActual - 1) * productosPorPagina + 1;
    const indiceFin = Math.min(paginaActual * productosPorPagina, productosFiltrados.length);
    
    if (productosFiltrados.length > 0) {
        productsStats.textContent = `Mostrando ${indiceInicio}-${indiceFin} de ${productosFiltrados.length} repuestos`;
    } else {
        productsStats.textContent = 'No hay repuestos que coincidan';
    }
    
    productsCount.textContent = productosFiltrados.length;
}

function crearTarjetaRepuesto(repuesto) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'repuesto-card';
    tarjeta.setAttribute('data-id', repuesto.id);
    tarjeta.setAttribute('aria-label', `${repuesto.nombre} - ${repuesto.numero_parte || 'Sin código'}`);
    
    let etiquetaClase = '';
    let etiquetaTexto = '';
    
    if (!repuesto.activo) {
        etiquetaClase = 'agotado';
        etiquetaTexto = 'INACTIVO';
    } else if (repuesto.estado) {
        const estadoNombre = repuesto.estado.nombre.toLowerCase();
        if (estadoNombre.includes('disponible') || estadoNombre.includes('stock')) {
            etiquetaClase = 'disponible';
            etiquetaTexto = 'DISPONIBLE';
        } else if (estadoNombre.includes('mantenimiento') || estadoNombre.includes('reparación')) {
            etiquetaClase = 'mantenimiento';
            etiquetaTexto = 'MANTENIMIENTO';
        } else if (estadoNombre.includes('usado') || estadoNombre.includes('instalado')) {
            etiquetaClase = 'nuevo';
            etiquetaTexto = 'EN USO';
        } else {
            etiquetaClase = 'nuevo';
            etiquetaTexto = repuesto.estado.nombre.toUpperCase();
        }
    }
    
    const categoriaNombre = repuesto.categoria_repuesto ? repuesto.categoria_repuesto.nombre : 'SIN CATEGORÍA';
    const tipoNombre = repuesto.tipo_repuesto ? repuesto.tipo_repuesto.nombre : 'SIN TIPO';
    const marcaNombre = repuesto.marca ? repuesto.marca.nombre : 'SIN MARCA';
    const estadoNombre = repuesto.estado ? repuesto.estado.nombre : 'SIN ESTADO';
    const ubicacionNombre = repuesto.ubicacion ? `${repuesto.ubicacion.nombre} - PISO ${repuesto.ubicacion.piso} (${repuesto.ubicacion.descripcion})` : 'SIN UBICACIÓN';
    const usuarioAsignado = repuesto.usuario_asignado ? 
        `${repuesto.usuario_asignado.nombre} ${repuesto.usuario_asignado.apellido}` : 
        'SIN ASIGNAR';
    
    tarjeta.innerHTML = `
        <!-- BOTONES CIRCULARES EN ESQUINA SUPERIOR DERECHA -->
        <div class="botones-superiores-derecha">
            <!-- Botón de etiqueta (primero) -->
            <button class="boton-circular etiqueta-btn" onclick="abrirModalEtiqueta('${repuesto.id}')" 
                    aria-label="Generar etiqueta ">
                <i class="fas fa-tag"></i>
            </button>
            
            <!-- Botón de editar (segundo) -->
            <button class="boton-circular editar-btn" onclick="editRepuesto('${repuesto.id}')" 
                    aria-label="Editar repuesto">
                <i class="fas fa-edit"></i>
            </button>
            
            <!-- Botón de eliminar (tercero) -->
            <button class="boton-circular eliminar-btn" onclick="showConfirmationModal('delete', '${repuesto.id}', '${repuesto.nombre}')" 
                    aria-label="Eliminar repuesto">
                <i class="fas fa-trash"></i>
            </button>
        </div>

        ${etiquetaTexto ? `<div class="repuesto-badge ${etiquetaClase}" aria-label="${etiquetaTexto}">${etiquetaTexto}</div>` : ''}
        
        <div class="repuesto-image-container">
            <div style="width: 100%; height: 200px; background: var(--gray-light); display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-cog" style="font-size: 4rem; color: var(--primary-color); opacity: 0.5;"></i>
            </div>
        </div>
        
        <div class="repuesto-info">
            <h3 class="repuesto-title">${repuesto.nombre}</h3>
            
            <div class="repuesto-details-grid">
                <div class="repuesto-detail-item">
                    <span class="repuesto-detail-label">Categoría</span>
                    <span class="repuesto-detail-value">${categoriaNombre}</span>
                </div>
                <div class="repuesto-detail-item">
                    <span class="repuesto-detail-label">Tipo</span>
                    <span class="repuesto-detail-value">${tipoNombre}</span>
                </div>
                <div class="repuesto-detail-item">
                    <span class="repuesto-detail-label">Estado</span>
                    <span class="repuesto-detail-value">${estadoNombre}</span>
                </div>
                <div class="repuesto-detail-item">
                    <span class="repuesto-detail-label">Ubicación</span>
                    <span class="repuesto-detail-value">${ubicacionNombre}</span>
                </div>
                <div class="repuesto-detail-item">
                    <span class="repuesto-detail-label">Marca</span>
                    <span class="repuesto-detail-value">${marcaNombre}</span>
                </div>
                <div class="repuesto-detail-item">
                    <span class="repuesto-detail-label">Usuario</span>
                    <span class="repuesto-detail-value">${usuarioAsignado}</span>
                </div>
            </div>
        </div>
    `;
    
    return tarjeta;
}

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
    renderizarRepuestos();
    
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== FUNCIONES DEL MODAL REPUESTO =====
function openRepuestoModal(repuestoId = null) {
    editingRepuestoId = repuestoId;
    
    // Cargar opciones en selects
    cargarOpcionesFormulario();

    // Conectar eventos después de cargar opciones
    conectarEventosFormulario(); 
    
    // Conectar eventos para nombre automático
    conectarEventosNombreAutomatico();            

    if (repuestoId) {
        modalTitleText.textContent = 'Editar repuesto';
        const repuesto = repuestos.find(r => r.id === repuestoId);
        
        if (repuesto) {
            // **IMPORTANTE: Mostrar el nombre EXACTO de la base de datos**
            document.getElementById('repuestoNombre').value = repuesto.nombre;
            
            document.getElementById('repuestoNumeroParte').value = repuesto.numero_parte || '';
            document.getElementById('repuestoCategoria').value = repuesto.categoria_repuesto_id || '';
            document.getElementById('repuestoMarca').value = repuesto.marca_id || '';
            document.getElementById('repuestoEstado').value = repuesto.estado_id || '';
            document.getElementById('repuestoUbicacion').value = repuesto.ubicacion_id || '';
            document.getElementById('repuestoUsuarioId').value = repuesto.usuario_id || '';
            document.getElementById('repuestoModelo').value = repuesto.modelo || '';
            document.getElementById('repuestoNumeroSerie').value = repuesto.numero_serie || '';
            document.getElementById('repuestoObservaciones').value = repuesto.observaciones || '';
            document.getElementById('repuestoActivo').value = repuesto.activo.toString();
            document.getElementById('repuestoId').value = repuestoId;
            
            // Manejar tipo según categoría
            if (repuesto.categoria_repuesto_id) {
                handleCategoriaChange();
                setTimeout(() => {
                    document.getElementById('repuestoTipo').value = repuesto.tipo_repuesto_id || '';
                    
                    // **IMPORTANTE: Verificar si el nombre generado coincide**
                    setTimeout(() => {
                        const nombreGenerado = generarNombreAutomatico();
                        const nombreBD = repuesto.nombre;
                        
                        if (nombreGenerado !== nombreBD) {
                            console.warn(`Diferencia de nombres al editar: 
                                BD: "${nombreBD}"
                                Generado: "${nombreGenerado}"
                            `);
                            // Opcional: mostrar advertencia al usuario
                        }
                    }, 300);
                }, 100);
            }
        }
    } else {
        modalTitleText.textContent = 'Agregar repuesto';
        repuestoForm.reset();
        document.getElementById('repuestoId').value = '';
        document.getElementById('repuestoActivo').value = 'true';
        document.getElementById('repuestoMarca').value = '';
        document.getElementById('repuestoUsuarioId').value = '';
        document.getElementById('repuestoNombre').value = 'Completa los campos para generar el nombre';
        document.getElementById('repuestoObservaciones').value = 'NO HAY OBSERVACIÓN';
    }
    
    repuestoModal.classList.add('activo');
    repuestoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

// Función para conectar eventos
function conectarEventosNombreAutomatico() {
    console.log('Conectando eventos para nombre automático...');
    
    const campos = [
        'repuestoCategoria',
        'repuestoTipo', 
        'repuestoMarca',
        'repuestoEstado',
        'repuestoUsuarioId',
        'repuestoNumeroParte',
        'repuestoModelo'
    ];
    
    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.removeEventListener('change', generarNombreAutomatico);
            campo.removeEventListener('input', generarNombreAutomatico);
            
            if (campoId === 'repuestoNumeroParte' || campoId === 'repuestoModelo') {
                campo.addEventListener('input', generarNombreAutomatico);
            } else {
                campo.addEventListener('change', generarNombreAutomatico);
            }
            
            console.log(`Evento conectado para: ${campoId}`);
        }
    });
    
    setTimeout(generarNombreAutomatico, 100);
}

// Función para conectar eventos
function conectarEventosFormulario() {
    console.log('Conectando eventos del formulario...');
    
    // Limpiar eventos previos
    const categoriaSelect = document.getElementById('repuestoCategoria');
    const tipoSelect = document.getElementById('repuestoTipo');
    const marcaSelect = document.getElementById('repuestoMarca');
    const modeloInput = document.getElementById('repuestoModelo');
    const numeroParteInput = document.getElementById('repuestoNumeroParte');
    
    // Clonar y reemplazar para limpiar eventos duplicados
    [categoriaSelect, tipoSelect, marcaSelect].forEach(select => {
        if (select) {
            const nuevoSelect = select.cloneNode(true);
            select.parentNode.replaceChild(nuevoSelect, select);
        }
    });
    
    // Reconectar eventos
    document.getElementById('repuestoCategoria')?.addEventListener('change', function() {
        handleCategoriaChange();
        generarNombreAutomatico();
    });
    
    document.getElementById('repuestoTipo')?.addEventListener('change', generarNombreAutomatico);
    document.getElementById('repuestoMarca')?.addEventListener('change', generarNombreAutomatico);
    document.getElementById('repuestoModelo')?.addEventListener('input', generarNombreAutomatico);
    document.getElementById('repuestoNumeroParte')?.addEventListener('input', generarNombreAutomatico);
    
    console.log('Eventos del formulario conectados correctamente');
} 

function closeRepuestoModal() {
    repuestoModal.classList.remove('activo');
    repuestoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    repuestoForm.reset();
    editingRepuestoId = null;
}

function cargarOpcionesFormulario() {
    // Categorías
    const categoriaSelect = document.getElementById('repuestoCategoria');
    categoriaSelect.innerHTML = '<option value="">Selecciona una categoría</option>';
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        categoriaSelect.appendChild(option);
    });
    
    // Tipos (inicialmente deshabilitado)
    const tipoSelect = document.getElementById('repuestoTipo');
    tipoSelect.innerHTML = '<option value="">Primero selecciona una categoría</option>';
    tipoSelect.disabled = true;
    
    // Marcas
    const marcaSelect = document.getElementById('repuestoMarca');
    marcaSelect.innerHTML = '<option value="">Selecciona una marca (opcional)</option>';
    marcas.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca.id;
        option.textContent = marca.nombre;
        marcaSelect.appendChild(option);
    });
    
    // Estados
    const estadoSelect = document.getElementById('repuestoEstado');
    estadoSelect.innerHTML = '<option value="">Selecciona un estado</option>';
    estados.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado.id;
        option.textContent = estado.nombre;
        estadoSelect.appendChild(option);
    });
    
    // Ubicaciones
    const ubicacionSelect = document.getElementById('repuestoUbicacion');
    ubicacionSelect.innerHTML = '<option value="">Selecciona una ubicación</option>';
    ubicaciones.forEach(ubicacion => {
        const option = document.createElement('option');
        option.value = ubicacion.id_ubicacion;
        option.textContent = `${ubicacion.nombre} ${ubicacion.piso ? ` - PISO ${ubicacion.piso} (${ubicacion.descripcion})` : ''}`;
        ubicacionSelect.appendChild(option);
    });
    
    // Usuarios
    const usuarioSelect = document.getElementById('repuestoUsuarioId');
    usuarioSelect.innerHTML = '<option value="">Sin asignar</option>';
    usuarios.forEach(usuario => {
        const option = document.createElement('option');
        option.value = usuario.id;
        option.textContent = `${usuario.nombre} ${usuario.apellido}`;
        usuarioSelect.appendChild(option);
    });
}

function handleCategoriaChange() {
    const categoriaSeleccionada = document.getElementById('repuestoCategoria').value;
    const tipoSelect = document.getElementById('repuestoTipo');
    
    if (categoriaSeleccionada) {
        tipoSelect.disabled = false;
        tipoSelect.innerHTML = '<option value="">Selecciona un tipo</option>';
        
        const tiposFiltrados = tipos.filter(tipo => 
            String(tipo.categoria_repuesto_id) === String(categoriaSeleccionada)
        );
        
        tiposFiltrados.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            tipoSelect.appendChild(option);
        });
        
        if (tiposFiltrados.length === 0) {
            tipoSelect.disabled = true;
            tipoSelect.innerHTML = '<option value="">No hay tipos para esta categoría</option>';
        }
    } else {
        tipoSelect.disabled = true;
        tipoSelect.innerHTML = '<option value="">Primero selecciona una categoría</option>';
    }
}

function generarNombreAutomatico() {
    console.log('=== GENERANDO NOMBRE AUTOMÁTICO ===');
    
    // Obtener valores
    const tipoId = document.getElementById('repuestoTipo')?.value;
    const marcaId = document.getElementById('repuestoMarca')?.value;
    const modelo = document.getElementById('repuestoModelo')?.value.trim();
    const numeroParte = document.getElementById('repuestoNumeroParte')?.value.trim();
    
    console.log('Datos obtenidos:', { tipoId, marcaId, modelo, numeroParte });
    
    // Buscar objetos correspondientes
    const tipo = tipos.find(t => String(t.id) === String(tipoId));
    const marca = marcas.find(m => String(m.id) === String(marcaId));
    
    console.log('Objetos encontrados:', { tipo, marca });
    
    // Validaciones básicas
    if (!tipoId && !marcaId && !modelo && !numeroParte) {
        const nombrePlaceholder = 'Completa los campos para generar el nombre';
        document.getElementById('repuestoNombre').value = nombrePlaceholder;
        console.log('Nombre generado (placeholder):', nombrePlaceholder);
        return '';
    }
    
    // Array para construir el nombre en orden específico
    let partesNombre = [];
    
    // 1. TIPO DE REPUESTO (si existe)
    if (tipo && tipo.nombre) {
        const tipoNombre = tipo.nombre.trim();
        partesNombre.push(tipoNombre);
        console.log('Agregado tipo:', tipoNombre);
    }
    
    // 2. MARCA (si existe)
    if (marca && marca.nombre) {
        const marcaNombre = marca.nombre.trim();
        partesNombre.push(marcaNombre);
        console.log('Agregado marca:', marcaNombre);
    }
    
    // 3. MODELO (si existe)
    if (modelo) {
        const modeloFormateado = modelo.toUpperCase();
        partesNombre.push(modeloFormateado);
        console.log('Agregado modelo:', modeloFormateado);
    }
    
    // 4. NÚMERO DE PARTE (si existe y no está vacío)
    if (numeroParte && numeroParte !== '') {
        const numeroParteFormateado = numeroParte.startsWith('#') 
            ? numeroParte 
            : `#${numeroParte}`;
        partesNombre.push(numeroParteFormateado);
        console.log('Agregado número parte:', numeroParteFormateado);
    }
    
    // Si no hay datos suficientes
    if (partesNombre.length === 0) {
        const nombrePlaceholder = 'Selecciona tipo, marca, modelo o número de parte';
        document.getElementById('repuestoNombre').value = nombrePlaceholder;
        console.log('Nombre generado (placeholder):', nombrePlaceholder);
        return '';
    }
    
    // Unir todas las partes con espacios
    const nombreGenerado = partesNombre.join(' ');
    
    // Actualizar el campo de nombre
    document.getElementById('repuestoNombre').value = nombreGenerado;
    
    console.log('Nombre generado:', nombreGenerado);
    console.log('=== FIN GENERACIÓN NOMBRE ===');
    
    return nombreGenerado;
}

function generarNombreAutomatico() {
    console.log('=== GENERANDO NOMBRE AUTOMÁTICO ===');
    
    // Obtener valores
    const categoriaId = document.getElementById('repuestoCategoria')?.value;
    const tipoId = document.getElementById('repuestoTipo')?.value;
    const marcaId = document.getElementById('repuestoMarca')?.value;
    const modelo = document.getElementById('repuestoModelo')?.value?.trim();
    const numeroParte = document.getElementById('repuestoNumeroParte')?.value?.trim();
    
    // Buscar objetos correspondientes
    const categoria = categorias.find(c => String(c.id) === String(categoriaId));
    const tipo = tipos.find(t => String(t.id) === String(tipoId));
    const marca = marcas.find(m => String(m.id) === String(marcaId));
    
    // Array para construir el nombre
    let partesNombre = [];
        
    // 1. TIPO (si existe)
    if (tipo && tipo.nombre) {
        partesNombre.push(tipo.nombre.trim());
    }
    
    // 2. MARCA (si existe)
    if (marca && marca.nombre) {
        partesNombre.push(marca.nombre.trim());
    }
    
    // 3. MODELO (si existe)
    if (modelo) {
        partesNombre.push(modelo.toUpperCase());
    }
    
    // 4. NÚMERO DE PARTE (si existe)
    if (numeroParte) {
        const numParte = numeroParte.startsWith('#') ? numeroParte : `#${numeroParte}`;
        partesNombre.push(numParte);
    }
    
    // Si no hay datos
    if (partesNombre.length === 0) {
        document.getElementById('repuestoNombre').value = 'Completa los campos para generar el nombre';
        return '';
    }
    
    const nombreGenerado = partesNombre.join(' ');
    document.getElementById('repuestoNombre').value = nombreGenerado;
    
    return nombreGenerado;
}

// (OPCIONAL) Agregar botón para ejecutar esta función
function agregarBotonNormalizacion() {
    const sectionHeader = document.querySelector('.section-header div:last-child');
    if (sectionHeader && !document.getElementById('normalizarNombresBtn')) {
        const boton = document.createElement('button');
        boton.id = 'normalizarNombresBtn';
        boton.className = 'btn btn-secondary';
        boton.innerHTML = '<i class="fas fa-sync-alt"></i> Normalizar Nombres';
        boton.onclick = normalizarNombresRepuestos;
        boton.style.marginLeft = '10px';
        sectionHeader.appendChild(boton);
    }
}

function crearNombreConsistente(tipoId, marcaId, modelo, numeroParte) {
    const tipo = tipos.find(t => String(t.id) === String(tipoId));
    const marca = marcas.find(m => String(m.id) === String(marcaId));
    
    let partesNombre = [];
    
    // 1. TIPO (si existe)
    if (tipo && tipo.nombre) {
        partesNombre.push(tipo.nombre.trim());
    }
    
    // 2. Marca (si existe)
    if (marca && marca.nombre) {
        partesNombre.push(marca.nombre.trim());
    }
    
    // 3. Modelo (si existe)
    if (modelo && modelo.trim()) {
        partesNombre.push(modelo.trim().toUpperCase());
    }
    
    // 4. Número de parte (si existe y no está vacío)
    if (numeroParte && numeroParte.trim() !== '') {
        const numParte = numeroParte.trim();
        partesNombre.push(numParte.startsWith('#') ? numParte : `#${numParte}`);
    }
    
    return partesNombre.length > 0 ? partesNombre.join(' ') : '';
}

async function saveRepuesto() {
    if (!repuestoForm.checkValidity()) {
        repuestoForm.reportValidity();
        return;
    }
    
    // Obtener valores directamente de los elementos
    const tipoId = document.getElementById('repuestoTipo').value;
    const marcaId = document.getElementById('repuestoMarca').value || null;
    const modelo = document.getElementById('repuestoModelo').value.trim();
    const numeroParte = document.getElementById('repuestoNumeroParte').value.trim();
    const categoriaId = document.getElementById('repuestoCategoria').value;
    const estadoId = document.getElementById('repuestoEstado').value;
    const ubicacionId = document.getElementById('repuestoUbicacion').value;
    const usuarioId = document.getElementById('repuestoUsuarioId').value || null;
    
    // Obtener observaciones y manejar valor por defecto
    let observaciones = document.getElementById('repuestoObservaciones').value.trim();
    
    // Si el campo está vacío o tiene solo espacios, usar valor por defecto
    if (!observaciones || observaciones === '' || observaciones === 'NO HAY OBSERVACIÓN') {
        observaciones = 'NO HAY OBSERVACIÓN';
    }

    // **MODIFICADO: Quitar validación de número de parte obligatorio**
    if (!categoriaId || !tipoId || !estadoId || !ubicacionId) {
        showSystemMessage('Por favor completa los campos requeridos: Categoría, Tipo, Estado y Ubicación.', 'warning');
        return;
    }
    
    // **USAR LA FUNCIÓN crearNombreConsistente SOLO con tipo, marca, modelo, numeroParte**
    const nombreGenerado = crearNombreConsistente(tipoId, marcaId, modelo, numeroParte);
    
    if (!nombreGenerado) {
        showSystemMessage('Por favor completa al menos el tipo del repuesto.', 'warning');
        return;
    }
    
    const repuestoData = {
        nombre: nombreGenerado, // Usar el nombre generado consistentemente
        numero_parte: numeroParte || null, 
        categoria_repuesto_id: parseInt(categoriaId),
        tipo_repuesto_id: parseInt(tipoId),
        marca_id: marcaId,
        estado_id: parseInt(estadoId),
        ubicacion_id: parseInt(ubicacionId),
        usuario_id: usuarioId,
        modelo: modelo || null,
        numero_serie: document.getElementById('repuestoNumeroSerie').value.trim() || null,
        observaciones: observaciones,
        activo: document.getElementById('repuestoActivo').value === 'true',
        actualizado_en: new Date().toISOString()
    };
    
    if (currentUser) {
        if (editingRepuestoId) {
            repuestoData.actualizado_por = currentUser.id;
        } else {
            repuestoData.creado_por = currentUser.id;
            repuestoData.creado_en = new Date().toISOString();
        }
    }
    
    saveRepuestoBtn.disabled = true;
    saveRepuestoBtn.innerHTML = '<div class="loading"></div> Guardando...';
    
    try {
        if (editingRepuestoId) {
            const { error } = await supabaseClient
                .from('repuesto')
                .update(repuestoData)
                .eq('id', editingRepuestoId);
            
            if (error) throw error;
            
            showSystemMessage('Repuesto actualizado exitosamente.', 'success');
        } else {
            const { error } = await supabaseClient
                .from('repuesto')
                .insert(repuestoData);
            
            if (error) throw error;
            
            showSystemMessage('Repuesto agregado exitosamente.', 'success');
        }
        
        closeRepuestoModal();
        await cargarRepuestos();
        
    } catch (error) {
        console.error('Error guardando repuesto:', error);
        showSystemMessage('Error al guardar el repuesto: ' + error.message, 'error');
    } finally {
        saveRepuestoBtn.disabled = false;
        saveRepuestoBtn.innerHTML = 'Guardar repuesto';
    }
}

function editRepuesto(id) {
    const repuesto = repuestos.find(r => r.id === id);
    
    if (!repuesto) {
        showSystemMessage('Repuesto no encontrado.', 'error');
        return;
    }
    
    openRepuestoModal(id);
}

async function deleteRepuesto(id) {
    try {
        const { error } = await supabaseClient
            .from('repuesto')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showSystemMessage('Repuesto eliminado exitosamente.', 'success');
        await cargarRepuestos();
        
    } catch (error) {
        console.error('Error eliminando repuesto:', error);
        showSystemMessage('Error al eliminar el repuesto. Intenta nuevamente.', 'error');
    }
}

// ===== MODAL DE CONFIRMACIÓN =====
function showConfirmationModal(action, id, nombre = '') {
    pendingAction = action;
    pendingActionData = { id, nombre };
    
    if (action === 'delete') {
        confirmationTitle.textContent = '¿Eliminar repuesto?';
        confirmationMessage.textContent = `¿Estás seguro de que deseas eliminar el repuesto "${nombre}"? Esta acción no se puede deshacer.`;
        confirmActionBtn.textContent = 'Eliminar';
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
        await deleteRepuesto(pendingActionData.id);
    }
    
    closeConfirmationModal();
}

// ===== FUNCIONES AUXILIARES =====
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

// Exponer funciones globales para eventos HTML
window.handleCategoriaChange = handleCategoriaChange;
window.generarNombreAutomatico = generarNombreAutomatico;
window.actualizarFiltroDesdeFijo = actualizarFiltroDesdeFijo;
window.aplicarFiltrosDesdeFijo = aplicarFiltrosDesdeFijo;
window.cerrarOpcionesFiltro = cerrarOpcionesFiltro;
window.reiniciarFiltros = reiniciarFiltros;
window.cambiarPagina = cambiarPagina;
window.editRepuesto = editRepuesto;
window.showConfirmationModal = showConfirmationModal;
window.actualizarFiltroDesdeModal = actualizarFiltroDesdeModal;
window.abrirModalFiltros = abrirModalFiltros;
window.cerrarModalFiltros = cerrarModalFiltros;