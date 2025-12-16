// ===== VARIABLES GLOBALES =====
let productos = [];
let asesores = [];
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 8;
let productosParaAsesor = [];
let productosFavoritos = [];
let busquedaTimeout = null;
let tipoClienteSeleccionado = null;
let asesorSeleccionado = null;
let currentSlideIndex = 0;
let productoParaCompartir = null;
let imageObserver;

// URLs de los archivos JSON
const PRODUCTOS_JSON_URL = 'JSON/producto.json';
const ASESORES_JSON_URL = 'JSON/asesor.json';

// Estado de los filtros
const estadoFiltros = {
    familias: [],
    materiales: [],
    acabados: [],
    medidas: [],
    calidades: [],
    bordes: [],
    rangoPrecio: { min: 0, max: 10000 },
    busqueda: ''
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        mostrarLoading();
        
        await Promise.all([
            cargarProductos(),
            cargarAsesoresDesdeJSON()
        ]);
        
        inicializarAplicacion();
        
        console.log('Aplicación inicializada correctamente');
        ocultarLoading();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('Error al cargar los datos. Por favor, recarga la página.');
        ocultarLoading();
    }
});

// ===== FUNCIONES DE CARGA DE DATOS =====
async function cargarProductos() {
    try {
        const response = await fetch(PRODUCTOS_JSON_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            productos = data.map(producto => ({
                id: producto.codigo,
                codigo: producto.codigo,
                nombre: producto.nombre,
                familia: producto.familia,
                material: producto.material,
                acabado: producto.acabado,
                medida: producto.medida,
                borde: producto.borde,
                calidad: producto.calidad,
                unidad: producto.unidad,
                precio: producto.precio || 0,
                precioOriginal: producto.precioOriginal || producto.precio || 0,
                descuento: producto.descuento || 0,
                imagenes: producto.imagenes || [],
                etiqueta: producto.etiqueta || '',
                destacado: producto.destacado === 'SI',
                descripcion: `${producto.familia} ${producto.material} ${producto.acabado} - ${producto.medida}`,
                enFavoritos: false,
                agregadoParaAsesor: false
            }));
        } else {
            throw new Error('Formato de JSON inválido');
        }
        
        console.log(`${productos.length} productos cargados correctamente`);
        return productos;
    } catch (error) {
        console.error('Error cargando productos:', error);
        productos = obtenerProductosEjemplo();
        mostrarToast('Usando datos de ejemplo. Verifique la conexión con el servidor.');
        return productos;
    }
}

async function cargarAsesoresDesdeJSON() {
    try {
        const response = await fetch(ASESORES_JSON_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            asesores = data.map(asesor => ({
                id: asesor.codigo,
                codigo: asesor.codigo,
                nombre: asesor.nombre,
                especialidad: asesor.especialidad,
                foto: asesor.foto,
                celular: asesor.celular
            }));
        } else {
            throw new Error('Formato de JSON de asesores inválido');
        }
        
        console.log(`${asesores.length} asesores cargados correctamente`);
        return asesores;
    } catch (error) {
        console.error('Error cargando asesores:', error);
        asesores = obtenerAsesoresEjemplo();
        mostrarToast('Usando asesores de ejemplo.');
        return asesores;
    }
}

function obtenerProductosEjemplo() {
    return [
        {
            id: "BTMR1TRX08241",
            codigo: "BTMR1TRX08241",
            nombre: "BALDOSAS TEMPORA RECTO TRANQUERA X",
            familia: "BALDOSAS",
            material: "TRANQUERA X",
            acabado: "TEMPORA",
            medida: "24'' x 8'' x 1 cm",
            borde: "RECTO",
            calidad: "PRIMERA",
            unidad: "m²",
            precio: 85.50,
            precioOriginal: 120.00,
            descuento: 29,
            imagenes: [
                "FOTO/PRODUCTO/BTMR1TRX08241/foto_01.png",
                "FOTO/PRODUCTO/BTMR1TRX08241/foto_02.png"
            ],
            etiqueta: "OFERTA",
            destacado: true,
            descripcion: "Baldosas de alta calidad para acabados elegantes",
            enFavoritos: false,
            agregadoParaAsesor: false
        }
    ];
}

function obtenerAsesoresEjemplo() {
    return [
        {
            id: 1,
            codigo: 1,
            nombre: "Carlos Rodríguez",
            especialidad: "Asesor Comercial",
            foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
            celular: "+51987654321"
        }
    ];
}

function inicializarAplicacion() {
    try {
        cargarDatosLocalStorage();
        inicializarTema();
        inicializarFiltrosFijos();
        inicializarBusqueda();
        inicializarModales();
        inicializarMenuMovil();
        inicializarFiltrosMovil();
        inicializarBotonVolverArriba();
        configurarNavegacionTeclado();
        configurarScrollBusquedaMovil();
        
        extraerValoresFiltros();
        aplicarFiltros();
        
        verificarParametroURL();
        actualizarContadorFavoritos();
        actualizarContadorAsesor();
        actualizarContadorFiltros();
        
    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('Error al cargar. Recarga la página.');
    }
}

function extraerValoresFiltros() {           
    const precios = productos.filter(p => p.precio > 0).map(p => p.precio);
    if (precios.length > 0) {
        estadoFiltros.rangoPrecio.min = Math.floor(Math.min(...precios));
        estadoFiltros.rangoPrecio.max = Math.ceil(Math.max(...precios));
    }
}

function mostrarLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('activo');
        loadingOverlay.setAttribute('aria-hidden', 'false');
    }
}

function ocultarLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('activo');
        loadingOverlay.setAttribute('aria-hidden', 'true');
    }
}

// ===== FUNCIONES DE ALMACENAMIENTO =====
function cargarDatosLocalStorage() {
    try {
        const favoritosGuardados = localStorage.getItem('favoritosGallosMarmol');
        if (favoritosGuardados) {
            productosFavoritos = JSON.parse(favoritosGuardados);
            productos.forEach(producto => {
                producto.enFavoritos = productosFavoritos.includes(producto.id);
            });
        }
        
        const productosAsesorGuardados = localStorage.getItem('productosAsesorGallosMarmol');
        if (productosAsesorGuardados) {
            productosParaAsesor = JSON.parse(productosAsesorGuardados);
            productos.forEach(producto => {
                producto.agregadoParaAsesor = productosParaAsesor.some(item => item.id === producto.id);
            });
        }
        
        const temaGuardado = localStorage.getItem('temaGallosMarmol');
        if (temaGuardado === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
            document.getElementById('theme-toggle').setAttribute('aria-pressed', 'true');
        }
        
        const tipoClienteGuardado = localStorage.getItem('tipoClienteGallosMarmol');
        if (tipoClienteGuardado) {
            tipoClienteSeleccionado = tipoClienteGuardado;
        }
    } catch (error) {
        console.error('Error al cargar datos de localStorage:', error);
        productosFavoritos = [];
        productosParaAsesor = [];
    }
}

function guardarFavoritos() {
    try {
        localStorage.setItem('favoritosGallosMarmol', JSON.stringify(productosFavoritos));
    } catch (error) {
        console.error('Error al guardar favoritos:', error);
        mostrarError('No se pudieron guardar los favoritos');
    }
}

function guardarProductosAsesor() {
    try {
        localStorage.setItem('productosAsesorGallosMarmol', JSON.stringify(productosParaAsesor));
    } catch (error) {
        console.error('Error al guardar productos para asesor:', error);
        mostrarError('No se pudieron guardar los productos para consulta');
    }
}

function guardarTipoCliente(tipo) {
    try {
        localStorage.setItem('tipoClienteGallosMarmol', tipo);
    } catch (error) {
        console.error('Error al guardar tipo de cliente:', error);
    }
}

// ===== TEMA OSCURO/CLARO =====
function inicializarTema() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTema);
    }
}

function toggleTema() {
    const themeToggle = document.getElementById('theme-toggle');
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.setAttribute('aria-pressed', 'true');
        localStorage.setItem('temaGallosMarmol', 'dark');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.setAttribute('aria-pressed', 'false');
        localStorage.setItem('temaGallosMarmol', 'light');
    }
}

// ===== BOTÓN VOLVER ARRIBA =====
function inicializarBotonVolverArriba() {
    const btnVolverArriba = document.getElementById('btn-volver-arriba');
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            btnVolverArriba.classList.add('visible');
        } else {
            btnVolverArriba.classList.remove('visible');
        }
    });
    
    btnVolverArriba.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        document.getElementById('main-content').focus();
    });
}

// ===== FILTROS FIJOS =====
function inicializarFiltrosFijos() {
    document.querySelectorAll('.btn-filtro-grupo').forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.stopPropagation();
            const target = this.getAttribute('data-target');
            mostrarOpcionesFiltro(target, this);
        });
        
        boton.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const target = this.getAttribute('data-target');
                mostrarOpcionesFiltro(target, this);
            }
        });
    });
    
    document.getElementById('btn-limpiar-filtros').addEventListener('click', reiniciarFiltros);
    
    document.addEventListener('click', function(e) {
        const opcionesContainer = document.getElementById('filtros-opciones');
        const barraFiltros = document.getElementById('barra-filtros');
        
        if (opcionesContainer && opcionesContainer.classList.contains('visible')) {
            if (!barraFiltros.contains(e.target)) {
                cerrarOpcionesFiltro();
            }
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarOpcionesFiltro();
        }
    });
}

function mostrarOpcionesFiltro(tipo, boton) {
    document.querySelectorAll('.btn-filtro-grupo').forEach(b => {
        b.classList.remove('activo');
        b.setAttribute('aria-expanded', 'false');
    });
    
    boton.classList.add('activo');
    boton.setAttribute('aria-expanded', 'true');
    
    cargarOpcionesFiltro(tipo);
    
    const opcionesContainer = document.getElementById('filtros-opciones');
    opcionesContainer.classList.add('visible');
    opcionesContainer.setAttribute('aria-hidden', 'false');
    
    setTimeout(() => {
        const firstInput = opcionesContainer.querySelector('input, button');
        if (firstInput) firstInput.focus();
    }, 100);
}

function cargarOpcionesFiltro(tipo) {
    const container = document.getElementById('filtros-opciones');
    if (!container) return;
    
    let html = '';
    let titulo = '';
    let icono = '';
    
    switch(tipo) {
        case 'familia':
            titulo = 'Familia';
            icono = 'fas fa-layer-group';
            const familiasUnicas = [...new Set(productos.map(p => p.familia))];
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${familiasUnicas.map(familia => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="familia-fijo" value="${familia}" 
                                       ${estadoFiltros.familias && estadoFiltros.familias.includes(familia) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('familias', '${familia}', this.checked)"
                                       aria-label="Filtrar por familia ${familia}">
                                <span>${familia}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'material':
            titulo = 'Material';
            icono = 'fas fa-mountain';
            const materialesUnicos = [...new Set(productos.map(p => p.material))];
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${materialesUnicos.map(material => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="material-fijo" value="${material}" 
                                       ${estadoFiltros.materiales && estadoFiltros.materiales.includes(material) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('materiales', '${material}', this.checked)"
                                       aria-label="Filtrar por material ${material}">
                                <span>${material}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'acabado':
            titulo = 'Acabado';
            icono = 'fas fa-paint-roller';
            const acabadosUnicos = [...new Set(productos.map(p => p.acabado))];
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${acabadosUnicos.map(acabado => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="acabado-fijo" value="${acabado}" 
                                       ${estadoFiltros.acabados && estadoFiltros.acabados.includes(acabado) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('acabados', '${acabado}', this.checked)"
                                       aria-label="Filtrar por acabado ${acabado}">
                                <span>${acabado}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'medida':
            titulo = 'Medida';
            icono = 'fas fa-ruler-combined';
            const medidasUnicas = [...new Set(productos.map(p => p.medida))];
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div class="filtro-opciones">
                        ${medidasUnicas.map(medida => `
                            <label class="filtro-checkbox">
                                <input type="checkbox" name="medida-fijo" value="${medida}" 
                                       ${estadoFiltros.medidas && estadoFiltros.medidas.includes(medida) ? 'checked' : ''}
                                       onchange="actualizarFiltroDesdeFijo('medidas', '${medida}', this.checked)"
                                       aria-label="Filtrar por medida ${medida}">
                                <span>${medida}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        case 'precio':
            titulo = 'Rango de Precio';
            icono = 'fas fa-tags';
            const minPrecio = estadoFiltros.rangoPrecio.min;
            const maxPrecio = estadoFiltros.rangoPrecio.max;
            html = `
                <div class="filtro-opcion">
                    <h4><i class="${icono}"></i> ${titulo}</h4>
                    <div style="padding: 15px;">
                        <div style="margin-bottom: 15px;">
                            <label for="precio-min" style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Mínimo: S/. <span id="precio-min-value">${minPrecio}</span></label>
                            <input type="range" id="precio-min" min="0" max="${maxPrecio}" value="${minPrecio}" 
                                   style="width: 100%;" 
                                   oninput="actualizarRangoPrecio('min', this.value)">
                        </div>
                        <div>
                            <label for="precio-max" style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Máximo: S/. <span id="precio-max-value">${maxPrecio}</span></label>
                            <input type="range" id="precio-max" min="0" max="${maxPrecio * 1.5}" value="${maxPrecio}" 
                                   style="width: 100%;"
                                   oninput="actualizarRangoPrecio('max', this.value)">
                        </div>
                        <div style="margin-top: 20px; padding: 10px; background: var(--gray-light); border-radius: var(--radius-sm); text-align: center;">
                            <strong>Rango seleccionado:</strong><br>
                            S/. ${minPrecio} - S/. ${maxPrecio}
                        </div>
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
    
    container.innerHTML = html;
}

function actualizarFiltroDesdeFijo(tipo, valor, checked) {
    if (!estadoFiltros[tipo]) estadoFiltros[tipo] = [];
    const arrayFiltro = estadoFiltros[tipo];
    
    if (checked) {
        if (!arrayFiltro.includes(valor)) arrayFiltro.push(valor);
    } else {
        const indice = arrayFiltro.indexOf(valor);
        if (indice !== -1) arrayFiltro.splice(indice, 1);
    }
}

function actualizarRangoPrecio(tipo, valor) {
    estadoFiltros.rangoPrecio[tipo] = parseFloat(valor);
    document.getElementById(`precio-${tipo}-value`).textContent = parseInt(valor);
}

function aplicarFiltrosDesdeFijo() {
    aplicarFiltros();
    cerrarOpcionesFiltro();
}

function cerrarOpcionesFiltro() {
    const container = document.getElementById('filtros-opciones');
    if (container) {
        container.classList.remove('visible');
        container.setAttribute('aria-hidden', 'true');
    }
    
    document.querySelectorAll('.btn-filtro-grupo').forEach(b => {
        b.classList.remove('activo');
        b.setAttribute('aria-expanded', 'false');
    });
    
    const activeBtn = document.querySelector('.btn-filtro-grupo.activo');
    if (activeBtn) activeBtn.focus();
}

// ===== BÚSQUEDA =====
function inicializarBusqueda() {
    const inputBusqueda = document.getElementById('search-input');
    const resultadosBusqueda = document.getElementById('search-results');
    
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            clearTimeout(busquedaTimeout);
            
            busquedaTimeout = setTimeout(() => {
                const consulta = this.value.trim().toLowerCase();
                
                if (consulta.length > 0) {
                    estadoFiltros.busqueda = consulta;
                    buscarProductos(consulta);
                } else {
                    estadoFiltros.busqueda = '';
                    if (resultadosBusqueda) {
                        resultadosBusqueda.classList.remove('active');
                        resultadosBusqueda.innerHTML = '';
                    }
                }
            }, 300);
        });
        
        inputBusqueda.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const consulta = this.value.trim().toLowerCase();
                if (consulta.length > 0) {
                    estadoFiltros.busqueda = consulta;
                    aplicarFiltros();
                    if (resultadosBusqueda) resultadosBusqueda.classList.remove('active');
                }
            } else if (e.key === 'Escape') {
                this.value = '';
                estadoFiltros.busqueda = '';
                if (resultadosBusqueda) resultadosBusqueda.classList.remove('active');
                aplicarFiltros();
            } else if (e.key === 'ArrowDown' && resultadosBusqueda.classList.contains('active')) {
                e.preventDefault();
                const firstResult = resultadosBusqueda.querySelector('.search-result-item');
                if (firstResult) firstResult.focus();
            }
        });
        
        document.addEventListener('click', function(e) {
            if (inputBusqueda && !inputBusqueda.contains(e.target) && 
                resultadosBusqueda && !resultadosBusqueda.contains(e.target)) {
                resultadosBusqueda.classList.remove('active');
            }
        });
        
        if (resultadosBusqueda) {
            resultadosBusqueda.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            resultadosBusqueda.addEventListener('keydown', function(e) {
                const items = this.querySelectorAll('.search-result-item');
                const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % items.length;
                    if (items[nextIndex]) items[nextIndex].focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (currentIndex - 1 + items.length) % items.length;
                    if (items[prevIndex]) items[prevIndex].focus();
                } else if (e.key === 'Escape') {
                    inputBusqueda.focus();
                    this.classList.remove('active');
                }
            });
        }
    }
}

function buscarProductos(consulta) {
    const resultadosBusqueda = document.getElementById('search-results');
    if (!resultadosBusqueda) return;
    
    if (consulta.length < 2) {
        resultadosBusqueda.classList.remove('active');
        resultadosBusqueda.innerHTML = '';
        return;
    }
    
    const resultados = productos.filter(producto => {
        const enCodigo = producto.codigo.toLowerCase().includes(consulta);
        const enNombre = producto.nombre.toLowerCase().includes(consulta);
        const enMaterial = producto.material.toLowerCase().includes(consulta);
        const enFamilia = producto.familia.toLowerCase().includes(consulta);
        
        return enCodigo || enNombre || enMaterial || enFamilia;
    }).slice(0, 20);
    
    if (resultados.length > 0) {
        let htmlResultados = '';
        
        resultados.forEach(producto => {
            const precioTexto = producto.precio > 0 ? `S/. ${producto.precio.toFixed(2)}` : 'Consultar precio';
            
            htmlResultados += `
                <div class="search-result-item" data-id="${producto.id}" 
                     onclick="verDetallesProducto('${producto.id}')" 
                     onkeydown="if(event.key === 'Enter') verDetallesProducto('${producto.id}')"
                     role="button" 
                     tabindex="0"
                     aria-label="${producto.nombre}. ${producto.familia}. ${producto.material}. ${precioTexto}">
                    <img src="${producto.imagenes[0]}" alt="${producto.nombre}" 
                         onerror="this.src='https://via.placeholder.com/50x50/f5f5f5/333?text=Mármol'">
                    <div class="search-result-info">
                        <h4>${producto.nombre}</h4>
                        <span class="search-result-code">${producto.codigo}</span>
                        <small><strong>${precioTexto}</strong></small>
                    </div>
                </div>
            `;
        });
        
        resultadosBusqueda.innerHTML = htmlResultados;
        resultadosBusqueda.classList.add('active');
    } else {
        resultadosBusqueda.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No se encontraron materiales para "${consulta}"</p>
            </div>
        `;
        resultadosBusqueda.classList.add('active');
    }
}

// ===== FILTROS =====
function aplicarFiltros() {
    mostrarSkeletonLoading();
    
    setTimeout(() => {
        productosFiltrados = productos.filter(producto => {
            if (estadoFiltros.familias && estadoFiltros.familias.length > 0 && !estadoFiltros.familias.includes(producto.familia)) return false;
            if (estadoFiltros.materiales && estadoFiltros.materiales.length > 0 && !estadoFiltros.materiales.includes(producto.material)) return false;
            if (estadoFiltros.acabados && estadoFiltros.acabados.length > 0 && !estadoFiltros.acabados.includes(producto.acabado)) return false;
            if (estadoFiltros.medidas && estadoFiltros.medidas.length > 0 && !estadoFiltros.medidas.includes(producto.medida)) return false;
            if (estadoFiltros.calidades && estadoFiltros.calidades.length > 0 && !estadoFiltros.calidades.includes(producto.calidad)) return false;
            if (estadoFiltros.bordes && estadoFiltros.bordes.length > 0 && !estadoFiltros.bordes.includes(producto.borde)) return false;
            
            if (producto.precio > 0) {
                if (producto.precio < estadoFiltros.rangoPrecio.min || producto.precio > estadoFiltros.rangoPrecio.max) return false;
            }
            
            if (estadoFiltros.busqueda) {
                const busquedaMin = estadoFiltros.busqueda.toLowerCase();
                const enCodigo = producto.codigo.toLowerCase().includes(busquedaMin);
                const enNombre = producto.nombre.toLowerCase().includes(busquedaMin);
                const enMaterial = producto.material.toLowerCase().includes(busquedaMin);
                const enFamilia = producto.familia.toLowerCase().includes(busquedaMin);
                const enAcabado = producto.acabado.toLowerCase().includes(busquedaMin);
                
                if (!enCodigo && !enNombre && !enMaterial && !enFamilia && !enAcabado) return false;
            }
            
            return true;
        });
        
        paginaActual = 1;
        actualizarEstadisticasProductos();
        renderizarProductos();
        actualizarContadorFiltros();
        
        if (window.innerWidth < 768) cerrarFiltrosMovil();
    }, 300);
}

function reiniciarFiltros() {
    estadoFiltros.familias = [];
    estadoFiltros.materiales = [];
    estadoFiltros.acabados = [];
    estadoFiltros.medidas = [];
    estadoFiltros.calidades = [];
    estadoFiltros.bordes = [];
    estadoFiltros.busqueda = '';
    
    const inputBusqueda = document.getElementById('search-input');
    if (inputBusqueda) inputBusqueda.value = '';
    
    const resultadosBusqueda = document.getElementById('search-results');
    if (resultadosBusqueda) resultadosBusqueda.classList.remove('active');
    
    const precios = productos.filter(p => p.precio > 0).map(p => p.precio);
    if (precios.length > 0) {
        estadoFiltros.rangoPrecio.min = Math.floor(Math.min(...precios));
        estadoFiltros.rangoPrecio.max = Math.ceil(Math.max(...precios));
    }
    
    productosFiltrados = [...productos];
    paginaActual = 1;
    
    actualizarEstadisticasProductos();
    renderizarProductos();
    actualizarContadorFiltros();
    mostrarToast('Filtros restablecidos');
    
    cerrarOpcionesFiltro();
    
    if (window.innerWidth < 768) {
        const seccionBusqueda = document.getElementById('search-section');
        if (seccionBusqueda) seccionBusqueda.classList.remove('active');
    }
}

// ===== PRODUCTOS =====
function mostrarSkeletonLoading() {
    const gridProductos = document.getElementById('products-grid');
    if (!gridProductos) return;
    
    let skeletonHTML = '';
    for (let i = 0; i < 8; i++) {
        skeletonHTML += `
            <div class="skeleton-card skeleton">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                </div>
            </div>
        `;
    }
    
    gridProductos.innerHTML = skeletonHTML;
}

function renderizarProductos() {
    const gridProductos = document.getElementById('products-grid');
    const paginacion = document.getElementById('pagination');
    
    if (!gridProductos) return;
    
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const indiceFin = indiceInicio + productosPorPagina;
    const productosPaginados = productosFiltrados.slice(indiceInicio, indiceFin);
    
    gridProductos.innerHTML = '';
    
    if (productosPaginados.length === 0) {
        gridProductos.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">No se encontraron materiales</h3>
                <p style="color: var(--gray-dark);">Intenta con otros filtros o términos de búsqueda</p>
                <button class="btn btn-primary" onclick="reiniciarFiltros()" style="margin-top: 20px;" aria-label="Ver todos los materiales">
                    <i class="fas fa-redo"></i> Ver todos los materiales
                </button>
            </div>
        `;
        if (paginacion) paginacion.innerHTML = '';
        return;
    }
    
    productosPaginados.forEach(producto => {
        const tarjetaProducto = crearTarjetaProducto(producto);
        gridProductos.appendChild(tarjetaProducto);
    });
    
    renderizarPaginacion();
    actualizarEstadisticasProductos();
}

function crearTarjetaProducto(producto) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'product-card';
    tarjeta.setAttribute('data-id', producto.id);
    tarjeta.setAttribute('aria-label', `${producto.nombre}. ${producto.descripcion.substring(0, 100)}...`);
    
    const textoEtiqueta = producto.etiqueta === 'NUEVO' ? 'Nuevo' : 
                        producto.etiqueta === 'OFERTA' ? 'Oferta' :
                        producto.etiqueta === 'DISPONIBLE' ? 'Disponible' :
                        producto.etiqueta === 'AGOTADO' ? 'Agotado' : null;
    const claseEtiqueta = producto.etiqueta ? producto.etiqueta.toLowerCase() : '';
    const enFavoritos = producto.enFavoritos;
    const agregadoParaAsesor = producto.agregadoParaAsesor;
    const tienePrecio = producto.precio > 0;
    const precioFormateado = tienePrecio ? `S/. ${producto.precio.toFixed(2)}` : 'Consultar precio';
    const precioUnitario = tienePrecio ? ` x ${producto.unidad}` : '';
    const descuento = producto.descuento > 0 ? producto.descuento : 0;
    
    const placeholderSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='250' viewBox='0 0 280 250'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3C/svg%3E";
    const imagenPrincipal = producto.imagenes && producto.imagenes.length > 0 
        ? producto.imagenes[0]
        : 'https://via.placeholder.com/280x250/f5f5f5/333?text=Mármol';
    
    tarjeta.innerHTML = `
        ${textoEtiqueta ? `<div class="product-badge ${claseEtiqueta}" aria-label="${textoEtiqueta}">${textoEtiqueta}</div>` : ''}
        
        <div class="product-image-container">
            <img src="${placeholderSVG}" 
                data-src="${imagenPrincipal}"
                alt="${producto.nombre} - ${producto.familia}" 
                class="product-image"
                width="280"
                height="250"
                loading="lazy"
                onload="this.classList.add('loaded'); if(this.getAttribute('data-src')) this.src = this.getAttribute('data-src');"
                onerror="this.classList.add('error'); this.src='${placeholderSVG}'">
            <button class="product-wishlist ${producto.enFavoritos ? 'activo' : ''}" 
                    aria-label="${producto.enFavoritos ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
                    aria-pressed="${producto.enFavoritos}"
                    onclick="alternarFavorito('${producto.id}')">
                <i class="${producto.enFavoritos ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
        
        <div class="product-info">
            <span class="product-code">${producto.codigo}</span>
            <h3 class="product-title">${producto.nombre}</h3>
            
            <div class="product-price-container">
                ${tienePrecio ? `
                    <div class="product-price">${precioFormateado}</div>
                    <div class="product-price-unit">${precioUnitario}</div>
                    ${descuento > 0 ? `<span class="price-badge">-${descuento}% OFF</span>` : ''}
                ` : `
                    <div class="product-price-consult">Consultar precio</div>
                `}
            </div>
            
            <div class="product-details-grid">
                <div class="product-detail-item">
                    <span class="product-detail-label">Familia</span>
                    <span class="product-detail-value">${producto.familia}</span>
                </div>
                <div class="product-detail-item">
                    <span class="product-detail-label">Material</span>
                    <span class="product-detail-value">${producto.material}</span>
                </div>
                <div class="product-detail-item">
                    <span class="product-detail-label">Acabado</span>
                    <span class="product-detail-value">${producto.acabado}</span>
                </div>
                <div class="product-detail-item">
                    <span class="product-detail-label">Medida</span>
                    <span class="product-detail-value">${producto.medida}</span>
                </div>
            </div>
            
            <div class="product-details-grid">
                <div class="product-detail-item">
                    <span class="product-detail-label">Borde</span>
                    <span class="product-detail-value">${producto.borde}</span>
                </div>
                <div class="product-detail-item">
                    <span class="product-detail-label">Calidad</span>
                    <span class="product-detail-value">${producto.calidad}</span>
                </div>
            </div>
            
            <div class="product-actions">
                <button class="product-btn asesor" ${agregadoParaAsesor ? 'disabled' : ''} onclick="agregarParaAsesor('${producto.id}')" aria-label="${agregadoParaAsesor ? 'Material ya agregado para consultar' : 'Agregar ' + producto.nombre + ' para consultar con asesor'}">
                    <i class="fas fa-plus-circle"></i> ${agregadoParaAsesor ? 'Agregado' : 'Cotizar'}
                </button>
                <button class="product-btn view" onclick="verDetallesProducto('${producto.id}')" aria-label="Ver detalles de ${producto.nombre}">
                    <i class="fas fa-eye"></i> Detalles
                </button>
                <button class="product-btn share" onclick="compartirProducto('${producto.id}')" aria-label="Compartir ${producto.nombre}">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `;
    
    return tarjeta;
}

function renderizarPaginacion() {
    const paginacion = document.getElementById('pagination');
    if (!paginacion) return;
    
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    
    if (totalPaginas <= 1) {
        paginacion.innerHTML = '';
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
    
    paginacion.innerHTML = htmlPaginacion;
    
    paginacion.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('keydown', function(e) {
            const buttons = Array.from(paginacion.querySelectorAll('.page-btn:not(.disabled)'));
            const currentIndex = buttons.indexOf(this);
            
            if (e.key === 'ArrowRight' && currentIndex < buttons.length - 1) {
                e.preventDefault();
                buttons[currentIndex + 1].focus();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                buttons[currentIndex - 1].focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                buttons[0].focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                buttons[buttons.length - 1].focus();
            }
        });
    });
}

function cambiarPagina(pagina) {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaActual) return;
    
    paginaActual = pagina;
    renderizarProductos();
    
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setTimeout(() => {
        const firstProduct = document.querySelector('.product-card');
        if (firstProduct) firstProduct.focus();
    }, 300);
}

function actualizarEstadisticasProductos() {
    const contadorProductos = document.getElementById('products-count');
    const estadisticasProductos = document.getElementById('products-stats');
    
    if (contadorProductos) {
        contadorProductos.textContent = productosFiltrados.length;
    }
    
    if (estadisticasProductos) {
        const indiceInicio = (paginaActual - 1) * productosPorPagina + 1;
        const indiceFin = Math.min(paginaActual * productosPorPagina, productosFiltrados.length);
        
        if (productosFiltrados.length > 0) {
            estadisticasProductos.textContent = `Mostrando ${indiceInicio}-${indiceFin} de ${productosFiltrados.length} materiales`;
        } else {
            estadisticasProductos.textContent = 'No hay materiales que coincidan';
        }
    }
}

// ===== VERIFICAR PARÁMETROS URL =====
function verificarParametroURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productoId = urlParams.get('producto');
        
        if (productoId) {
            console.log('Producto compartido detectado en URL:', productoId);
            
            if (productos.length > 0) {
                mostrarProductoCompartido(productoId);
            } else {
                setTimeout(() => {
                    mostrarProductoCompartido(productoId);
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error al leer parámetros de URL:', error);
    }
}

function mostrarProductoCompartido(productoId) {
    const producto = productos.find(p => p.id === productoId || p.codigo === productoId);
    
    if (producto) {
        console.log('Producto encontrado:', producto.nombre);
        mostrarToast(`Producto compartido: ${producto.nombre}`);
        aplicarFiltroParaProductoCompartido(producto);
        
        setTimeout(() => {
            const productsSection = document.getElementById('products');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            setTimeout(() => {
                verDetallesProducto(producto.id);
            }, 1000);
        }, 500);
        
    } else {
        console.warn('Producto no encontrado con ID:', productoId);
        mostrarToast('Producto no encontrado. Mostrando todos los materiales.');
    }
}

function aplicarFiltroParaProductoCompartido(producto) {
    reiniciarFiltros();
    estadoFiltros.familias = [producto.familia];
    estadoFiltros.materiales = [producto.material];
    estadoFiltros.busqueda = producto.codigo;
    
    aplicarFiltros();
    
    const inputBusqueda = document.getElementById('search-input');
    if (inputBusqueda) {
        inputBusqueda.value = producto.codigo;
    }
}

// ===== MODALES =====
function inicializarModales() {
    const whatsappFloat = document.getElementById('whatsapp-float');
    if (whatsappFloat) {
        whatsappFloat.addEventListener('click', abrirModalProductosSeleccionados);
    }
    
    document.getElementById('header-favoritos').addEventListener('click', abrirModalFavoritos);
    document.getElementById('close-favoritos-modal').addEventListener('click', cerrarModalFavoritos);
    document.getElementById('agregar-favoritos-consulta').addEventListener('click', agregarFavoritosAConsulta);
    document.getElementById('limpiar-favoritos').addEventListener('click', limpiarFavoritos);
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                const modalId = modal.id;
                switch(modalId) {
                    case 'productos-seleccionados-modal':
                        cerrarProductosSeleccionadosModal();
                        break;
                    case 'asesor-seleccion-modal':
                        cerrarAsesorSeleccionModal();
                        break;
                    case 'favoritos-modal':
                        cerrarModalFavoritos();
                        break;
                    case 'detalle-producto-modal':
                        cerrarDetalleProductoModal();
                        break;
                    case 'compartir-modal':
                        cerrarCompartirModal();
                        break;
                    case 'filtros-overlay':
                        cerrarFiltrosMovil();
                        break;
                }
            }
        });
    });
    
    document.getElementById('btn-continuar-asesor').addEventListener('click', continuarConAsesor);
    document.getElementById('contactar-asesor').addEventListener('click', contactarAsesorSeleccionado);
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                const modalId = this.id;
                switch(modalId) {
                    case 'productos-seleccionados-modal':
                        cerrarProductosSeleccionadosModal();
                        break;
                    case 'asesor-seleccion-modal':
                        cerrarAsesorSeleccionModal();
                        break;
                    case 'favoritos-modal':
                        cerrarModalFavoritos();
                        break;
                    case 'detalle-producto-modal':
                        cerrarDetalleProductoModal();
                        break;
                    case 'compartir-modal':
                        cerrarCompartirModal();
                        break;
                    case 'filtros-overlay':
                        cerrarFiltrosMovil();
                        break;
                }
            }
        });
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('productos-seleccionados-modal').classList.contains('activo')) {
                cerrarProductosSeleccionadosModal();
            } else if (document.getElementById('asesor-seleccion-modal').classList.contains('activo')) {
                cerrarAsesorSeleccionModal();
            } else if (document.getElementById('favoritos-modal').classList.contains('activo')) {
                cerrarModalFavoritos();
            } else if (document.getElementById('detalle-producto-modal').classList.contains('activo')) {
                cerrarDetalleProductoModal();
            } else if (document.getElementById('compartir-modal').classList.contains('activo')) {
                cerrarCompartirModal();
            } else if (document.getElementById('filtros-overlay').classList.contains('activo')) {
                cerrarFiltrosMovil();
            }
        }
    });
    
    document.querySelectorAll('.cliente-opcion').forEach(opcion => {
        opcion.addEventListener('click', function() {
            const tipo = this.querySelector('input').value;
            seleccionarTipoCliente(tipo);
        });
    });
}

// ===== PRODUCTOS SELECCIONADOS =====
function abrirModalProductosSeleccionados() {
    if (productosParaAsesor.length === 0) {
        mostrarToast('Agrega materiales para solicitar cotización');
        return;
    }
    
    const modal = document.getElementById('productos-seleccionados-modal');
    const lista = document.getElementById('productos-seleccionados-list');
    const total = document.getElementById('productos-seleccionados-total');
    const btnContinuar = document.getElementById('btn-continuar-asesor');
    
    if (!modal || !lista) return;
    
    btnContinuar.disabled = false;
    btnContinuar.style.opacity = '1';
    btnContinuar.style.cursor = 'pointer';
    
    modal.classList.add('activo');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    lista.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid var(--gray-light); border-top: 3px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p style="margin-top: 15px; color: var(--text-light);">Cargando materiales...</p>
        </div>
    `;
    
    if (total) total.textContent = productosParaAsesor.length;
    
    setTimeout(() => {
        generarContenidoModal(lista, total, btnContinuar);
        setTimeout(() => {
            if (btnContinuar) btnContinuar.focus();
        }, 50);
    }, 100);
}

function generarContenidoModal(lista, total, btnContinuar) {
    let htmlLista = '';
    let contadorValidos = 0;
    
    productosParaAsesor.forEach((item) => {
        const producto = productos.find(p => p.id === item.id);
        if (producto) {
            contadorValidos++;
            const precioTexto = producto.precio > 0 ? 
                `S/. ${producto.precio.toFixed(2)} x ${producto.unidad}` : 
                'Consultar precio';
            
            htmlLista += `
                <div class="producto-seleccionado-item" data-id="${producto.id}">
                    <img src="${producto.imagenes[0] || 'https://via.placeholder.com/60x60/f5f5f5/333?text=Mármol'}" 
                        alt="${producto.nombre}"
                        width="60"
                        height="60"
                        onerror="this.src='https://via.placeholder.com/60x60/f5f5f5/333?text=Mármol'">
                    <div class="producto-seleccionado-info">
                        <h5>${producto.nombre}</h5>
                        <p>${producto.familia} - ${producto.material}</p>
                        <span class="producto-seleccionado-price">${precioTexto}</span>
                    </div>
                    <button class="producto-seleccionado-remover" 
                            onclick="removerProductoSeleccionado('${producto.id}')" 
                            aria-label="Eliminar ${producto.nombre}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    });
    
    if (contadorValidos === 0) {
        htmlLista = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Error al cargar los productos</p>
                <button class="btn btn-primary" onclick="cerrarProductosSeleccionadosModal()" style="margin-top: 15px;">
                    Cerrar
                </button>
            </div>
        `;
        
        btnContinuar.disabled = true;
        btnContinuar.style.opacity = '0.6';
        btnContinuar.style.cursor = 'not-allowed';
    } else {
        btnContinuar.disabled = false;
        btnContinuar.style.opacity = '1';
        btnContinuar.style.cursor = 'pointer';
    }
    
    lista.style.opacity = '0.7';
    lista.style.transition = 'opacity 0.2s ease';
    
    setTimeout(() => {
        lista.innerHTML = htmlLista;
        
        if (total && contadorValidos > 0) {
            total.textContent = contadorValidos;
        }
        
        setTimeout(() => {
            lista.style.opacity = '1';
        }, 50);
        
    }, 150);
}

function cerrarProductosSeleccionadosModal() {
    const modal = document.getElementById('productos-seleccionados-modal');
    if (modal) {
        modal.classList.remove('activo');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        document.getElementById('whatsapp-float').focus();
    }
}

function removerProductoSeleccionado(idProducto) {
    const indice = productosParaAsesor.findIndex(item => item.id === idProducto);
    
    if (indice !== -1) {
        productosParaAsesor.splice(indice, 1);
        
        const producto = productos.find(p => p.id === idProducto);
        if (producto) {
            producto.agregadoParaAsesor = false;
        }
        
        guardarProductosAsesor();
        actualizarContadorAsesor();
        actualizarInterfazDespuesDeEliminar();
        
        if (productosParaAsesor.length === 0) {
            cerrarProductosSeleccionadosModal();
            mostrarToast('Todos los materiales eliminados');
        } else {
            actualizarModalProductosSeleccionados();
            mostrarToast('Material eliminado de la lista');
        }
    }
}

function actualizarInterfazDespuesDeEliminar() {
    productos.forEach(producto => {
        const tarjeta = document.querySelector(`.product-card[data-id="${producto.id}"]`);
        if (tarjeta) {
            const botonAsesor = tarjeta.querySelector('.product-btn.asesor');
            if (botonAsesor) {
                if (producto.agregadoParaAsesor) {
                    botonAsesor.disabled = false;
                    botonAsesor.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                    botonAsesor.setAttribute('aria-label', `Agregar ${producto.nombre} para consultar con asesor`);
                } else {
                    botonAsesor.disabled = false;
                    botonAsesor.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                    botonAsesor.removeAttribute('aria-label');
                }
            }
        }
    });
    
    actualizarContadorAsesor();
    
    const modalProductos = document.getElementById('productos-seleccionados-modal');
    if (modalProductos && modalProductos.classList.contains('activo')) {
        actualizarModalProductosSeleccionados();
    }
    
    const modalAsesor = document.getElementById('asesor-seleccion-modal');
    if (modalAsesor && modalAsesor.classList.contains('activo')) {
        actualizarVistaPreviaAsesor();
    }
}

function actualizarModalProductosSeleccionados() {
    const modal = document.getElementById('productos-seleccionados-modal');
    const lista = document.getElementById('productos-seleccionados-list');
    const total = document.getElementById('productos-seleccionados-total');
    const btnContinuar = document.getElementById('btn-continuar-asesor');
    
    if (!modal || !lista || !total) return;
    if (!modal.classList.contains('activo')) return;
    
    let htmlLista = '';
    let totalProductos = 0;
    
    if (productosParaAsesor.length === 0) {
        htmlLista = `
            <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: var(--gray-dark); margin-bottom: 15px;"></i>
                <h3 style="color: var(--text-light); margin-bottom: 10px;">No hay materiales seleccionados</h3>
                <p style="color: var(--gray-dark);">Agrega materiales para solicitar cotización</p>
            </div>
        `;
        
        btnContinuar.disabled = true;
        btnContinuar.style.opacity = '0.6';
        btnContinuar.style.cursor = 'not-allowed';
    } else {
        productosParaAsesor.forEach((item) => {
            const producto = productos.find(p => p.id === item.id);
            if (producto) {
                totalProductos++;
                const precioTexto = producto.precio > 0 ? 
                    `S/. ${producto.precio.toFixed(2)} x ${producto.unidad}` : 
                    'Consultar precio';
                
                htmlLista += `
                    <div class="producto-seleccionado-item" data-id="${producto.id}">
                        <img src="${producto.imagenes[0]}" alt="${producto.nombre}"
                            width="60"
                            height="60"
                            onerror="this.src='https://via.placeholder.com/60x60/f5f5f5/333?text=Mármol'">
                        <div class="producto-seleccionado-info">
                            <h5>${producto.nombre}</h5>
                            <p>${producto.familia} - ${producto.material}</p>
                            <span class="producto-seleccionado-price">${precioTexto}</span>
                        </div>
                        <button class="producto-seleccionado-remover" 
                                onclick="removerProductoSeleccionado('${producto.id}')" 
                                aria-label="Eliminar ${producto.nombre} de la lista">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
        });
        
        btnContinuar.disabled = false;
        btnContinuar.style.opacity = '1';
        btnContinuar.style.cursor = 'pointer';
    }
    
    lista.style.opacity = '0.7';
    lista.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        lista.innerHTML = htmlLista;
        total.textContent = totalProductos;
        
        setTimeout(() => {
            lista.style.opacity = '1';
        }, 50);
    }, 150);
    
    actualizarContadorAsesor();
}

function continuarConAsesor() {
    cerrarProductosSeleccionadosModal();
    setTimeout(() => {
        abrirModalAsesorSeleccion();
    }, 300);
}

// ===== ASESORES =====
function abrirModalAsesorSeleccion() {
    if (productosParaAsesor.length === 0) {
        mostrarToast('Agrega materiales para solicitar cotización');
        return;
    }
    
    const modal = document.getElementById('asesor-seleccion-modal');
    const preview = document.getElementById('productos-consulta-preview');
    
    let htmlPreview = '';
    productosParaAsesor.slice(0, 3).forEach((item, index) => {
        const producto = productos.find(p => p.id === item.id);
        if (producto) {
            htmlPreview += `
                <div class="producto-seleccionado-item">
                    <img src="${producto.imagenes[0]}" alt="${producto.nombre}"
                         width="40"
                         height="40"
                         onerror="this.src='https://via.placeholder.com/40x40/f5f5f5/333?text=Mármol'">
                    <div class="producto-seleccionado-info">
                        <h5 style="font-size: 0.8rem;">${producto.nombre.substring(0, 30)}...</h5>
                    </div>
                </div>
            `;
        }
    });
    
    if (productosParaAsesor.length > 3) {
        htmlPreview += `<div style="text-align: center; padding: 10px; color: var(--text-light); font-size: 0.8rem;">y ${productosParaAsesor.length - 3} más...</div>`;
    }
    
    preview.innerHTML = htmlPreview;
    
    tipoClienteSeleccionado = null;
    asesorSeleccionado = null;
    
    document.getElementById('asesor-contenido').innerHTML = '';
    document.getElementById('asesor-acciones').style.display = 'none';
    
    if (tipoClienteSeleccionado) {
        const radio = document.querySelector(`input[value="${tipoClienteSeleccionado}"]`);
        if (radio) radio.checked = true;
        seleccionarTipoCliente(tipoClienteSeleccionado);
    }
    
    modal.classList.add('activo');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const firstRadio = document.querySelector('input[name="tipo-cliente"]');
        if (firstRadio) firstRadio.focus();
    }, 100);
}

function cerrarAsesorSeleccionModal() {
    const modal = document.getElementById('asesor-seleccion-modal');
    if (modal) {
        modal.classList.remove('activo');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            abrirModalProductosSeleccionados();
        }, 300);
    }
}

function seleccionarTipoCliente(tipo) {
    tipoClienteSeleccionado = tipo;
    guardarTipoCliente(tipo);
    
    const contenido = document.getElementById('asesor-contenido');
    const acciones = document.getElementById('asesor-acciones');
    
    if (tipo === 'nuevo') {
        const asesorAleatorio = obtenerAsesorAleatorio();
        asesorSeleccionado = asesorAleatorio;
        
        contenido.innerHTML = `
            <div class="asesor-card" style="margin-top: 20px; cursor: default;">
                <img src="${asesorAleatorio.foto}" alt="Foto de ${asesorAleatorio.nombre}" class="asesor-avatar"
                    width="60"
                    height="60"
                    onerror="this.src='https://via.placeholder.com/60x60/f5f5f5/333?text=Asesor'">
                <div class="asesor-info">
                    <h4>${asesorAleatorio.nombre}</h4>
                    <p>${asesorAleatorio.especialidad}</p>
                    <p><small><i class="fas fa-random"></i> Asignado aleatoriamente</small></p>
                </div>
            </div>
            <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-light);">
                <i class="fas fa-info-circle"></i> Como cliente nuevo, se te ha asignado un asesor disponible para atender tu consulta.
            </p>
        `;
        
    } else if (tipo === 'existente') {
        let htmlAsesores = `
            <div style="margin-top: 20px;">
                <p style="margin-bottom: 15px; font-size: 0.9rem; color: var(--text-color);">
                    <i class="fas fa-info-circle"></i> Selecciona el asesor con el que deseas contactarte:
                </p>
        `;
        
        asesores.forEach(asesor => {
            htmlAsesores += `
                <div class="asesor-card ${asesorSeleccionado && asesorSeleccionado.id === asesor.id ? 'selected' : ''}" 
                     data-id="${asesor.id}" 
                     onclick="seleccionarAsesor('${asesor.id}')"
                     tabindex="0"
                     onkeydown="if(event.key === 'Enter' || event.key === ' ') seleccionarAsesor('${asesor.id}')">
                    <img src="${asesor.foto}" alt="Foto de ${asesor.nombre}" class="asesor-avatar"
                        width="60"
                        height="60"
                        onerror="this.src='https://via.placeholder.com/60x60/f5f5f5/333?text=Asesor'">
                    <div class="asesor-info">
                        <h4>${asesor.nombre}</h4>
                        <p>${asesor.especialidad}</p>
                    </div>
                    <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${asesorSeleccionado && asesorSeleccionado.id === asesor.id ? 'var(--primary-color)' : 'var(--gray-medium)'}; 
                         background-color: ${asesorSeleccionado && asesorSeleccionado.id === asesor.id ? 'var(--primary-color)' : 'transparent'};">
                        ${asesorSeleccionado && asesorSeleccionado.id === asesor.id ? '<i class="fas fa-check" style="color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; height: 100%;"></i>' : ''}
                    </div>
                </div>
            `;
        });
        
        htmlAsesores += `</div>`;
        contenido.innerHTML = htmlAsesores;
        
        if (!asesorSeleccionado && asesores.length > 0) {
            seleccionarAsesor(asesores[0].id);
        }
    }
    
    acciones.style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('contactar-asesor').focus();
    }, 100);
}

function obtenerAsesorAleatorio() {
    if (asesores.length === 0) return null;
    const indiceAleatorio = Math.floor(Math.random() * asesores.length);
    return asesores[indiceAleatorio];
}

function seleccionarAsesor(id) {
    const asesor = asesores.find(a => a.id == id);
    if (!asesor) return;
    
    asesorSeleccionado = asesor;
    
    document.querySelectorAll('.asesor-card').forEach(card => {
        const check = card.querySelector('div[style*="border-radius: 50%"]');
        if (check) {
            if (card.getAttribute('data-id') == id) {
                card.classList.add('selected');
                check.style.backgroundColor = 'var(--primary-color)';
                check.style.borderColor = 'var(--primary-color)';
                check.innerHTML = '<i class="fas fa-check" style="color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; height: 100%;"></i>';
            } else {
                card.classList.remove('selected');
                check.style.backgroundColor = '';
                check.style.borderColor = 'var(--gray-medium)';
                check.innerHTML = '';
            }
        }
    });
}

function contactarAsesorSeleccionado() {
    if (!asesorSeleccionado) {
        mostrarToast('Por favor, selecciona un asesor');
        return;
    }
    
    const mensaje = generarMensajeWhatsApp();
    const urlWhatsApp = `https://wa.me/${asesorSeleccionado.celular}?text=${encodeURIComponent(mensaje)}`;
    
    productosParaAsesor.forEach(item => {
        const producto = productos.find(p => p.id === item.id);
        if (producto) producto.agregadoParaAsesor = false;
    });
    
    productosParaAsesor = [];
    guardarProductosAsesor();
    actualizarContadorAsesor();
    renderizarProductos();
    
    window.open(urlWhatsApp, '_blank');
    
    cerrarAsesorSeleccionModal();
    mostrarToast('¡Mensaje preparado para WhatsApp!');
}

function generarMensajeWhatsApp() {
    try {
        const nombreAsesor = asesorSeleccionado ? asesorSeleccionado.nombre : "equipo";
        
        let mensaje = `Gallos Mármol Outlet - Solicitud de Cotización\n\n`;
        mensaje += `¡Hola ${nombreAsesor}!\n`;
        mensaje += `Me interesa los siguientes productos:\n\n`;
        
        productosParaAsesor.forEach((item, index) => {
            const producto = productos.find(p => p.id === item.id);
            if (producto) {
                mensaje += `${index + 1}. ${producto.nombre}\n`;
                mensaje += `${producto.codigo} | ${producto.medida}\n`;
                
                if (producto.precio > 0) {
                    mensaje += `S/. ${producto.precio.toFixed(2)} x ${producto.unidad}`;
                    mensaje += `\n`;
                } else {
                    mensaje += ` Consultar Precio\n`;
                }
                mensaje += `\n`;
            }
        });
                                        
        return mensaje;
        
    } catch (error) {
        console.error('Error al generar mensaje WhatsApp:', error);
        return "¡Hola! Solicito cotización de materiales Gallos Mármol. ¡Gracias!";
    }
}

// ===== AGREGAR PRODUCTO PARA ASESOR =====
function agregarParaAsesor(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) {
        mostrarError('Material no encontrado');
        return;
    }
    
    const indiceExistente = productosParaAsesor.findIndex(item => item.id === idProducto);
    if (indiceExistente !== -1) return;
    
    const productoAsesor = {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        familia: producto.familia,
        material: producto.material,
        acabado: producto.acabado,
        medida: producto.medida,
        borde: producto.borde,
        calidad: producto.calidad,
        unidad: producto.unidad,
        precio: producto.precio,
        descuento: producto.descuento
    };
    
    productosParaAsesor.push(productoAsesor);
    producto.agregadoParaAsesor = true;
    
    guardarProductosAsesor();
    actualizarContadorAsesor();
    renderizarProductos();
    mostrarToast('Material agregado para cotización');
}

// ===== FAVORITOS =====
function abrirModalFavoritos() {
    const modal = document.getElementById('favoritos-modal');
    const listaFavoritos = document.getElementById('favoritos-list');
    
    if (!modal || !listaFavoritos) return;
    
    if (productosFavoritos.length === 0) {
        listaFavoritos.innerHTML = `
            <div class="empty-state">
                <i class="far fa-heart"></i>
                <h3>No tienes favoritos aún</h3>
                <p>Agrega materiales a tus favoritos haciendo clic en el corazón</p>
            </div>
        `;
    } else {
        let htmlFavoritos = '';
        
        productosFavoritos.forEach(id => {
            const producto = productos.find(p => p.id === id);
            if (producto) {
                const precioTexto = producto.precio > 0 ? `S/. ${producto.precio.toFixed(2)} x ${producto.unidad}` : 'Consultar precio';
                
                htmlFavoritos += `
                    <div class="favorito-item" data-id="${producto.id}">
                        <img src="${producto.imagenes[0]}" alt="${producto.nombre}"
                             width="80"
                             height="80"
                             onerror="this.src='https://via.placeholder.com/80x80/f5f5f5/333?text=Mármol'">
                        <div class="favorito-info">
                            <h4>${producto.nombre}</h4>
                            <span class="favorito-code">${producto.codigo}</span>
                            <small><strong>${precioTexto}</strong></small>
                        </div>
                        <div class="favorito-actions">
                            <button class="favorito-btn consultar" onclick="agregarParaAsesor('${producto.id}'); cerrarModalFavoritos()" aria-label="Solicitar cotización de ${producto.nombre}">
                                <i class="fas fa-file-invoice-dollar"></i> Cotizar
                            </button>
                            <button class="favorito-btn favorito-remove" onclick="removerDeFavoritos('${producto.id}')" aria-label="Eliminar ${producto.nombre} de favoritos">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        listaFavoritos.innerHTML = htmlFavoritos;
    }
    
    modal.classList.add('activo');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const firstFavorito = document.querySelector('.favorito-btn');
        if (firstFavorito) firstFavorito.focus();
    }, 100);
}

function cerrarModalFavoritos() {
    const modal = document.getElementById('favoritos-modal');
    if (modal) {
        modal.classList.remove('activo');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        document.getElementById('header-favoritos').focus();
    }
}

function agregarFavoritosAConsulta() {
    if (productosFavoritos.length === 0) {
        mostrarToast('No hay materiales en favoritos');
        return;
    }
    
    productosFavoritos.forEach(id => {
        const producto = productos.find(p => p.id === id);
        if (producto && !producto.agregadoParaAsesor) {
            agregarParaAsesor(id);
        }
    });
    
    cerrarModalFavoritos();
    abrirModalProductosSeleccionados();
}

function limpiarFavoritos() {
    productosFavoritos = [];
    
    productos.forEach(producto => {
        producto.enFavoritos = false;
    });
    
    guardarFavoritos();
    actualizarContadorFavoritos();
    cerrarModalFavoritos();
    renderizarProductos();
    mostrarToast('Favoritos limpiados');
}

// ===== INTERACCIÓN DEL USUARIO =====
function alternarFavorito(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) return;
    
    const indice = productosFavoritos.indexOf(idProducto);
    
    if (indice === -1) {
        productosFavoritos.push(idProducto);
        producto.enFavoritos = true;
        mostrarToast('Añadido a favoritos');
    } else {
        productosFavoritos.splice(indice, 1);
        producto.enFavoritos = false;
        mostrarToast('Eliminado de favoritos');
    }
    
    // Actualizar la tarjeta directamente
    actualizarEstadoFavoritoEnTarjeta(idProducto);
    
    guardarFavoritos();
    actualizarContadorFavoritos();
    
    // Si el modal de favoritos está abierto, actualizarlo también
    const modalFavoritos = document.getElementById('favoritos-modal');
    if (modalFavoritos && modalFavoritos.classList.contains('activo')) {
        actualizarModalFavoritos();
    }
}

function removerDeFavoritos(idProducto) {
    const indice = productosFavoritos.indexOf(idProducto);
    
    if (indice !== -1) {
        productosFavoritos.splice(indice, 1);
        
        const producto = productos.find(p => p.id === idProducto);
        if (producto) {
            producto.enFavoritos = false;
        }
        
        // AQUÍ ESTÁ LA SOLUCIÓN: Actualizar la interfaz
        actualizarEstadoFavoritoEnTarjeta(idProducto);
        
        guardarFavoritos();
        actualizarContadorFavoritos();
        actualizarModalFavoritos(); // Recargar el modal
        mostrarToast('Eliminado de favoritos');
    }
}

// ===== NUEVA FUNCIÓN PARA ACTUALIZAR TARJETA =====
function actualizarEstadoFavoritoEnTarjeta(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) return;
    
    // Buscar TODAS las tarjetas del producto (puede haber varias si está filtrado)
    const tarjetasProducto = document.querySelectorAll(`.product-card[data-id="${idProducto}"]`);
    
    tarjetasProducto.forEach(tarjeta => {
        const botonFavoritos = tarjeta.querySelector('.product-wishlist');
        const iconoCorazon = tarjeta.querySelector('.product-wishlist i');
        
        if (botonFavoritos && iconoCorazon) {
            if (producto.enFavoritos) {
                // Está en favoritos
                botonFavoritos.classList.add('activo');
                botonFavoritos.setAttribute('aria-pressed', 'true');
                botonFavoritos.setAttribute('aria-label', 'Quitar de favoritos');
                iconoCorazon.className = 'fas fa-heart';
            } else {
                // No está en favoritos
                botonFavoritos.classList.remove('activo');
                botonFavoritos.setAttribute('aria-pressed', 'false');
                botonFavoritos.setAttribute('aria-label', 'Añadir a favoritos');
                iconoCorazon.className = 'far fa-heart';
            }
        }
    });
}

// ===== FUNCIÓN PARA ACTUALIZAR MODAL DE FAVORITOS =====
function actualizarModalFavoritos() {
    const modal = document.getElementById('favoritos-modal');
    const listaFavoritos = document.getElementById('favoritos-list');
    
    // Solo actualizar si el modal está abierto
    if (!modal || !modal.classList.contains('activo') || !listaFavoritos) return;
    
    if (productosFavoritos.length === 0) {
        listaFavoritos.innerHTML = `
            <div class="empty-state">
                <i class="far fa-heart"></i>
                <h3>No tienes favoritos aún</h3>
                <p>Agrega materiales a tus favoritos haciendo clic en el corazón</p>
            </div>
        `;
    } else {
        let htmlFavoritos = '';
        
        productosFavoritos.forEach(id => {
            const producto = productos.find(p => p.id === id);
            if (producto) {
                const precioTexto = producto.precio > 0 ? 
                    `S/. ${producto.precio.toFixed(2)} x ${producto.unidad}` : 
                    'Consultar precio';
                
                htmlFavoritos += `
                    <div class="favorito-item" data-id="${producto.id}">
                        <img src="${producto.imagenes[0]}" alt="${producto.nombre}"
                             width="80"
                             height="80"
                             onerror="this.src='https://via.placeholder.com/80x80/f5f5f5/333?text=Mármol'">
                        <div class="favorito-info">
                            <h4>${producto.nombre}</h4>
                            <p>${producto.familia} - ${producto.material}</p>
                            <span class="favorito-code">${producto.codigo}</span>
                            <small><strong>${precioTexto}</strong></small>
                        </div>
                        <div class="favorito-actions">
                            <button class="favorito-btn consultar" onclick="agregarParaAsesor('${producto.id}'); cerrarModalFavoritos()" aria-label="Solicitar cotización de ${producto.nombre}">
                                <i class="fas fa-file-invoice-dollar"></i> Cotizar
                            </button>
                            <button class="favorito-btn favorito-remove" onclick="removerDeFavoritos('${producto.id}')" aria-label="Eliminar ${producto.nombre} de favoritos">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        listaFavoritos.innerHTML = htmlFavoritos;
    }
}

// ===== COMPARTIR PRODUCTO =====
function compartirProducto(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) return;
    
    productoParaCompartir = producto;
    
    const urlBase = window.location.origin + window.location.pathname;
    const urlProducto = `${urlBase}?producto=${producto.id}&ref=share`;
    
    const urlInput = document.getElementById('compartir-url-input');
    if (urlInput) urlInput.value = urlProducto;
    
    abrirCompartirModal();
}

function abrirCompartirModal() {
    if (!productoParaCompartir) return;
    
    const modal = document.getElementById('compartir-modal');
    const opciones = document.getElementById('compartir-opciones');
    const urlInput = document.getElementById('compartir-url-input');
    
    if (!modal || !opciones || !urlInput) return;
    
    const urlBase = window.location.origin + window.location.pathname;
    const urlProducto = `${urlBase}?producto=${productoParaCompartir.id}`;
    urlInput.value = urlProducto;
    
    const opcionesCompartir = [
        { nombre: 'WhatsApp', icono: 'fab fa-whatsapp', color: '#25D366' },
        { nombre: 'Facebook', icono: 'fab fa-facebook', color: '#1877F2' },
        { nombre: 'Correo', icono: 'fas fa-envelope', color: '#EA4335' },
        { nombre: 'Copiar', icono: 'fas fa-copy', color: '#6c757d' }
    ];
    
    let htmlOpciones = '';
    opcionesCompartir.forEach(opcion => {
        htmlOpciones += `
            <div class="compartir-opcion" onclick="compartirPor('${opcion.nombre.toLowerCase()}')" 
                 style="border-color: ${opcion.color};" tabindex="0"
                 onkeydown="if(event.key === 'Enter' || event.key === ' ') compartirPor('${opcion.nombre.toLowerCase()}')">
                <i class="${opcion.icono}" style="color: ${opcion.color};"></i>
                <span>${opcion.nombre}</span>
            </div>
        `;
    });
    
    opciones.innerHTML = htmlOpciones;
    
    modal.classList.add('activo');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const primeraOpcion = opciones.querySelector('.compartir-opcion');
        if (primeraOpcion) primeraOpcion.focus();
    }, 100);
}

function cerrarCompartirModal() {
    const modal = document.getElementById('compartir-modal');
    if (modal) {
        modal.classList.remove('activo');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        productoParaCompartir = null;
    }
}

function compartirPor(metodo) {
    if (!productoParaCompartir) return;
    
    const urlBase = window.location.origin + window.location.pathname;
    const urlProducto = `${urlBase}?producto=${productoParaCompartir.id}&ref=share`;
    
    const textoCompartir = 
        `🌟 *GALLOS MÁRMOL - OUTLET 2025* 🌟\n\n` +
        `*${productoParaCompartir.nombre}*\n\n` +
        `📋 *Código:* ${productoParaCompartir.codigo}\n` +
        `🏷️ *Familia:* ${productoParaCompartir.familia}\n` +
        `💎 *Material:* ${productoParaCompartir.material}\n` +
        `✨ *Acabado:* ${productoParaCompartir.acabado}\n` +
        `📏 *Medida:* ${productoParaCompartir.medida}\n` +
        `⚡ *Calidad:* ${productoParaCompartir.calidad}\n` +
        `💰 *Precio:* ${productoParaCompartir.precio > 0 ? 'S/. ' + productoParaCompartir.precio.toFixed(2) + ' x ' + productoParaCompartir.unidad : 'CONSULTAR PRECIO'}\n` +
        `${productoParaCompartir.descuento > 0 ? `🎯 *Descuento:* ${productoParaCompartir.descuento}% OFF\n` : ''}\n` +
        `🔗 *Ver detalles y comprar:*\n${urlProducto}\n\n` +
        `📞 *Contacto:* +51 987 654 321\n` +
        `📍 *Ubicación:* Lima, Perú\n\n` +
        `*¡Oferta especial por tiempo limitado!* 🚀`;
    
    const textoCompartirSimple = 
        `Gallos Mármol - Outlet 2025\n\n` +
        `${productoParaCompartir.nombre}\n` +
        `Código: ${productoParaCompartir.codigo}\n` +
        `Material: ${productoParaCompartir.material}\n` +
        `Precio: ${productoParaCompartir.precio > 0 ? 'S/. ' + productoParaCompartir.precio.toFixed(2) : 'Consultar'}\n\n` +
        `Ver detalles: ${urlProducto}`;
    
    try {
        switch(metodo.toLowerCase()) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartir)}`, '_blank', 'noopener,noreferrer');
                break;
                
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlProducto)}&quote=${encodeURIComponent(productoParaCompartir.nombre + ' - Gallos Mármol Outlet')}`, '_blank', 'noopener,noreferrer');
                break;
                
            case 'correo':
                const subject = `Gallos Mármol - ${productoParaCompartir.nombre}`;
                const body = `${textoCompartirSimple}\n\n---\nGallos Mármol Outlet 2025\nCalidad premium a precios outlet\n`;
                window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
                break;
                
            case 'copiar':
                copiarEnlaceCompartir();
                return;
                
            default:
                console.error('Método de compartir no reconocido:', metodo);
                mostrarError('Método no disponible');
                return;
        }
        
        console.log(`Producto compartido por ${metodo}:`, productoParaCompartir.codigo);
        mostrarToast(`¡Producto compartido por ${metodo}!`);
        
        if (metodo.toLowerCase() !== 'copiar') {
            setTimeout(() => {
                cerrarCompartirModal();
            }, 500);
        }
        
    } catch (error) {
        console.error(`Error al compartir por ${metodo}:`, error);
        mostrarError(`No se pudo compartir por ${metodo}. Intenta nuevamente.`);
    }
}

function copiarEnlaceCompartir() {
    const urlInput = document.getElementById('compartir-url-input');
    if (!urlInput) return;
    
    urlInput.select();
    urlInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(urlInput.value).then(() => {
        mostrarToast('Enlace copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarError('No se pudo copiar el enlace');
    });
}

// ===== DETALLES DE PRODUCTO =====
function verDetallesProducto(idProducto) {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) {
        mostrarError('Material no encontrado');
        return;
    }
    
    const modal = document.getElementById('detalle-producto-modal');
    const titulo = document.getElementById('detalle-producto-titulo');
    const contenido = document.getElementById('detalle-producto-contenido');
    
    if (!modal || !titulo || !contenido) {
        mostrarError('Error al cargar el detalle del material');
        return;
    }
    
    if (modal.classList.contains('activo')) {
        cerrarDetalleProductoModal();
        setTimeout(() => {
            abrirModalConScrollArriba();
        }, 50);
        return;
    }
    
    function abrirModalConScrollArriba() {
        titulo.textContent = producto.nombre;
        
        const tienePrecio = producto.precio > 0;
        const precioFormateado = tienePrecio ? `S/. ${producto.precio.toFixed(2)}` : 'Consultar precio';
        const precioUnitario = tienePrecio ? ` x ${producto.unidad}` : '';
        const descuento = producto.descuento > 0 ? producto.descuento : 0;
        const precioOriginal = producto.precioOriginal > 0 ? producto.precioOriginal : 0;
        
        contenido.innerHTML = `
            <div class="producto-slider" id="producto-slider-${producto.id}">
                <!-- Slider se cargará dinámicamente -->
            </div>
            
            <div class="producto-detalle-info">
                <span class="producto-detalle-code">${producto.codigo}</span>
                <h2 class="producto-detalle-titulo">${producto.nombre}</h2>
                
                ${tienePrecio ? `
                    <div class="detalle-price-container">
                        <div class="detalle-price">${precioFormateado}</div>
                        <div class="detalle-price-unit">${precioUnitario}</div>
                        ${descuento > 0 ? `
                            <div style="margin-top: 10px;">
                                <span class="price-badge">-${descuento}% OFF</span>
                                ${precioOriginal > 0 ? `<span style="font-size: 0.9rem; color: var(--text-light); text-decoration: line-through; margin-left: 10px;">S/. ${precioOriginal.toFixed(2)}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="detalle-price-consult">Consultar precio</div>
                `}
                
                <p class="producto-detalle-descripcion">${producto.descripcion}</p>
                
                <div class="producto-detalle-especificaciones">
                    <div class="especificacion-grid">
                        <div class="especificacion-item">
                            <span class="especificacion-label">Familia</span>
                            <span class="especificacion-valor">${producto.familia}</span>
                        </div>
                        <div class="especificacion-item">
                            <span class="especificacion-label">Material</span>
                            <span class="especificacion-valor">${producto.material}</span>
                        </div>
                        <div class="especificacion-item">
                            <span class="especificacion-label">Acabado</span>
                            <span class="especificacion-valor">${producto.acabado}</span>
                        </div>
                        <div class="especificacion-item">
                            <span class="especificacion-label">Medida</span>
                            <span class="especificacion-valor">${producto.medida}</span>
                        </div>
                        <div class="especificacion-item">
                            <span class="especificacion-label">Borde</span>
                            <span class="especificacion-valor">${producto.borde}</span>
                        </div>
                        <div class="especificacion-item">
                            <span class="especificacion-label">Calidad</span>
                            <span class="especificacion-valor">${producto.calidad}</span>
                        </div>
                        <div class="especificacion-item">
                            <span class="especificacion-label">Unidad</span>
                            <span class="especificacion-valor">${producto.unidad}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detalle-acciones">
                    <button class="btn btn-primary" onclick="agregarParaAsesor('${producto.id}'); cerrarDetalleProductoModal()" ${producto.agregadoParaAsesor ? 'disabled' : ''} aria-label="${producto.agregadoParaAsesor ? 'Material ya agregado' : 'Solicitar cotización de ' + producto.nombre}">
                        <i class="fas fa-file-invoice-dollar"></i> ${producto.agregadoParaAsesor ? 'Ya Agregado' : 'Cotizar Material'}
                    </button>
                    <button class="btn btn-secondary" onclick="compartirProducto('${producto.id}'); cerrarDetalleProductoModal()" aria-label="Compartir ${producto.nombre}">
                        <i class="fas fa-share-alt"></i> Compartir
                    </button>
                    <button class="btn btn-secondary" onclick="cerrarDetalleProductoModal()" aria-label="Cerrar detalles del material">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('activo');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const modalContent = modal.querySelector('.detalle-producto-contenido');
            if (modalContent) modalContent.scrollTop = 0;
            
            if (contenido) contenido.scrollTop = 0;
            
            if (modalContent) modalContent.scrollTo({ top: 0, behavior: 'instant' });
            
            setTimeout(() => {
                inicializarSlider(producto.imagenes, `producto-slider-${producto.id}`);
            }, 50);
        }, 50);
        
        setTimeout(() => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.focus();
            } else {
                const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) firstFocusable.focus();
            }
        }, 100);
    }
    
    abrirModalConScrollArriba();
}

function cerrarDetalleProductoModal() {
    const modal = document.getElementById('detalle-producto-modal');
    if (modal) {
        const modalContent = modal.querySelector('.detalle-producto-contenido');
        if (modalContent) modalContent.scrollTop = 0;
        
        const contenido = document.getElementById('detalle-producto-contenido');
        if (contenido) contenido.scrollTop = 0;
        
        modal.classList.remove('activo');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function inicializarSlider(imagenes, containerId) {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        if (!container || !imagenes || imagenes.length === 0) return;
        
        currentSlideIndex = 0;
        
        // Placeholder SVG optimizado
        const sliderPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3C/svg%3E";
        
        // Crear HTML del slider CORREGIDO
        let html = `
            <div class="slider-container">
                <div class="slider-track" style="transform: translateX(0%);">
                    ${imagenes.map((img, index) => {
                        // Para la primera imagen, cargar directamente
                        if (index === 0) {
                            return `
                                <div class="slider-slide" data-index="${index}" ${index === 0 ? '' : 'aria-hidden="true"'}>
                                    <img src="${img}" 
                                        alt="Imagen ${index + 1} del material" 
                                        loading="eager"
                                        fetchpriority="high"
                                        width="500"
                                        height="400"
                                        class="slider-image loaded"
                                        onerror="this.classList.add('error'); this.src='${sliderPlaceholder}'">
                                </div>
                            `;
                        } else {
                            // Para las demás, usar data-src con lazy loading
                            return `
                                <div class="slider-slide" data-index="${index}" aria-hidden="true">
                                    <img src="${sliderPlaceholder}" 
                                        data-src="${img}" 
                                        alt="Imagen ${index + 1} del material" 
                                        loading="lazy"
                                        fetchpriority="low"
                                        width="500"
                                        height="400"
                                        class="slider-image"
                                        onerror="this.classList.add('error'); this.src='${sliderPlaceholder}'">
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
                
                ${imagenes.length > 1 ? `
                    <button class="slider-btn slider-prev" 
                            onclick="cambiarSlide('${containerId}', -1)" 
                            aria-label="Imagen anterior"
                            style="display: none;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="slider-btn slider-next" 
                            onclick="cambiarSlide('${containerId}', 1)" 
                            aria-label="Imagen siguiente"
                            style="display: none;">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
            
            ${imagenes.length > 1 ? `
                <div class="slider-dots">
                    ${imagenes.map((_, index) => `
                        <button class="slider-dot ${index === 0 ? 'active' : ''}" 
                                onclick="irASlide('${containerId}', ${index})"
                                aria-label="Ir a imagen ${index + 1}"
                                ${index === 0 ? 'aria-current="true"' : ''}></button>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        container.innerHTML = html;
        
        // Cargar imágenes con lazy loading
        cargarImagenesSlider(containerId, imagenes);
        
        // Mostrar controles del slider si hay más de una imagen
        if (imagenes.length > 1) {
            setTimeout(() => {
                const prevBtn = container.querySelector('.slider-prev');
                const nextBtn = container.querySelector('.slider-next');
                if (prevBtn) prevBtn.style.display = 'flex';
                if (nextBtn) nextBtn.style.display = 'flex';
            }, 100);
        }
        
        // Configurar navegación por teclado
        const prevBtn = container.querySelector('.slider-prev');
        const nextBtn = container.querySelector('.slider-next');
        const dots = container.querySelectorAll('.slider-dot');
        
        if (prevBtn) {
            prevBtn.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    cambiarSlide(containerId, -1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    cambiarSlide(containerId, 1);
                }
            });
        }
        
        dots.forEach((dot, index) => {
            dot.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    irASlide(containerId, index);
                }
            });
        });
        
    }, 100);
}

// ===== NUEVA FUNCIÓN PARA CARGAR IMÁGENES DEL SLIDER =====
function cargarImagenesSlider(containerId, imagenes) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Cargar primera imagen ya está cargada directamente
    // Cargar segunda imagen en segundo plano
    if (imagenes.length > 1) {
        setTimeout(() => {
            const secondImg = container.querySelector('.slider-slide[data-index="1"] .slider-image');
            if (secondImg && secondImg.getAttribute('data-src')) {
                cargarImagenLazy(secondImg);
            }
            
            // Precargar tercera imagen si existe
            if (imagenes.length > 2) {
                setTimeout(() => {
                    const thirdImg = container.querySelector('.slider-slide[data-index="2"] .slider-image');
                    if (thirdImg && thirdImg.getAttribute('data-src')) {
                        const img = new Image();
                        img.src = thirdImg.getAttribute('data-src');
                        img.onload = () => {
                            // La imagen está en caché ahora
                        };
                    }
                }, 500);
            }
        }, 300);
    }
    
    // Configurar Intersection Observer para lazy loading
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target.querySelector('.slider-image');
                    if (img && img.getAttribute('data-src')) {
                        cargarImagenLazy(img);
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            root: container.querySelector('.slider-container'),
            rootMargin: '50px',
            threshold: 0.1
        });
        
        // Observar todos los slides excepto el primero
        const slides = container.querySelectorAll('.slider-slide');
        slides.forEach((slide, index) => {
            if (index > 0) {
                observer.observe(slide);
            }
        });
    }
}

// ===== FUNCIÓN PARA CARGAR IMAGEN LAZY =====
function cargarImagenLazy(imgElement) {
    if (!imgElement) return;
    
    const src = imgElement.getAttribute('data-src');
    if (!src) return;
    
    // Crear nueva imagen para precargar
    const img = new Image();
    img.onload = () => {
        // Cuando la imagen se carga, reemplazar el src
        imgElement.src = src;
        imgElement.classList.add('loaded');
        imgElement.removeAttribute('data-src');
    };
    img.onerror = () => {
        imgElement.classList.add('error');
        console.error('Error cargando imagen:', src);
    };
    img.src = src;
}

function cambiarSlide(containerId, direccion) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const track = container.querySelector('.slider-track');
    const slides = container.querySelectorAll('.slider-slide');
    const dots = container.querySelectorAll('.slider-dot');
    
    const nuevoIndice = (currentSlideIndex + direccion + slides.length) % slides.length;
    
    // Cargar la imagen del slide al que vamos antes de cambiar
    const slideDestino = slides[nuevoIndice];
    const imgDestino = slideDestino.querySelector('.slider-image');
    if (imgDestino && imgDestino.getAttribute('data-src')) {
        cargarImagenLazy(imgDestino);
    }
    
    currentSlideIndex = nuevoIndice;
    
    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlideIndex);
        dot.setAttribute('aria-current', index === currentSlideIndex ? 'true' : 'false');
    });
    
    slides.forEach((slide, index) => {
        slide.setAttribute('aria-hidden', index !== currentSlideIndex);
    });
}

function irASlide(containerId, index) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const track = container.querySelector('.slider-track');
    const slides = container.querySelectorAll('.slider-slide');
    const dots = container.querySelectorAll('.slider-dot');
    
    // Cargar la imagen del slide al que vamos antes de cambiar
    const slideDestino = slides[index];
    const imgDestino = slideDestino.querySelector('.slider-image');
    if (imgDestino && imgDestino.getAttribute('data-src')) {
        cargarImagenLazy(imgDestino);
    }
    
    currentSlideIndex = index;
    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlideIndex);
        dot.setAttribute('aria-current', i === currentSlideIndex ? 'true' : 'false');
    });
    
    slides.forEach((slide, i) => {
        slide.setAttribute('aria-hidden', i !== currentSlideIndex);
    });
}

// ===== FILTROS MÓVIL =====
function inicializarFiltrosMovil() {
    const btnFiltrosMovil = document.getElementById('btn-filtros-movil');
    const btnFiltrarMovil = document.getElementById('btn-filtrar-movil');
    
    if (btnFiltrosMovil) {
        btnFiltrosMovil.addEventListener('click', abrirFiltrosMovil);
    }
    
    if (btnFiltrarMovil) {
        btnFiltrarMovil.addEventListener('click', abrirFiltrosMovil);
    }
    
    cargarFiltrosContentMovil();
    
    // Configurar eventos para los botones del modal
    configurarEventosFiltrosMovil();
}

// ===== NUEVA FUNCIÓN PARA CONFIGURAR EVENTOS =====
function configurarEventosFiltrosMovil() {
    // Evento delegado para botones de filtros
    document.addEventListener('click', function(e) {
        // Botón para abrir filtros móvil
        if (e.target.closest('#btn-filtros-movil') || e.target.closest('#btn-filtrar-movil')) {
            abrirFiltrosMovil();
            return;
        }
        
        // Botón para cerrar filtros móvil
        if (e.target.closest('.filtros-header-movil .modal-close')) {
            cerrarFiltrosMovil();
            return;
        }
        
        // Botón "Aplicar Filtros" en móvil
        if (e.target.closest('.filtros-acciones-movil .btn-primary')) {
            aplicarFiltrosMovil();
            return;
        }
        
        // Botón "Limpiar" en móvil
        if (e.target.closest('.filtros-acciones-movil .btn-secondary')) {
            reiniciarFiltrosMovil();
            return;
        }
        
        // Botones de opciones de filtro
        if (e.target.closest('.filter-option-mobile')) {
            const boton = e.target.closest('.filter-option-mobile');
            const tipo = boton.closest('.filter-group-mobile');
            let tipoFiltro = '';
            
            // Determinar qué tipo de filtro es
            if (tipo) {
                const titulo = tipo.querySelector('h4');
                if (titulo) {
                    if (titulo.textContent.includes('Familia')) tipoFiltro = 'familias';
                    else if (titulo.textContent.includes('Material')) tipoFiltro = 'materiales';
                    else if (titulo.textContent.includes('Acabado')) tipoFiltro = 'acabados';
                    else if (titulo.textContent.includes('Medida')) tipoFiltro = 'medidas';
                    else if (titulo.textContent.includes('Calidad')) tipoFiltro = 'calidades';
                    else if (titulo.textContent.includes('Borde')) tipoFiltro = 'bordes';
                }
            }
            
            const valor = boton.textContent.trim();
            if (tipoFiltro && valor) {
                toggleFiltroMovil(tipoFiltro, valor, boton);
            }
            return;
        }
    });
    
    // También configurar eventos de teclado
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('filtros-overlay');
            if (overlay && overlay.classList.contains('activo')) {
                cerrarFiltrosMovil();
            }
        }
    });
}

function cargarFiltrosContentMovil() {
    const container = document.getElementById('filtros-content-movil');
    if (!container) return;
    
    try {
        // Calcular valores de precio
        const preciosProductos = productos.filter(p => p.precio > 0).map(p => p.precio);
        const minPrecio = preciosProductos.length > 0 ? Math.floor(Math.min(...preciosProductos)) : 0;
        const maxPrecio = preciosProductos.length > 0 ? Math.ceil(Math.max(...preciosProductos)) : 10000;
        
        // Asegurarse que los valores actuales estén dentro del rango
        if (estadoFiltros.rangoPrecio.min < minPrecio) estadoFiltros.rangoPrecio.min = minPrecio;
        if (estadoFiltros.rangoPrecio.max > maxPrecio) estadoFiltros.rangoPrecio.max = maxPrecio;
        
        let html = `
            <div class="filter-grid">
                <div class="filter-group-mobile" data-filtro="familias">
                    <h4><i class="fas fa-layer-group"></i> Familia</h4>
                    <div class="filter-options-mobile">
                        ${[...new Set(productos.map(p => p.familia))].map(familia => `
                            <button class="filter-option-mobile ${estadoFiltros.familias && estadoFiltros.familias.includes(familia) ? 'selected' : ''}" 
                                    data-valor="${familia}"
                                    aria-label="${estadoFiltros.familias && estadoFiltros.familias.includes(familia) ? 'Quitar filtro ' : 'Aplicar filtro '}${familia}"
                                    aria-pressed="${estadoFiltros.familias && estadoFiltros.familias.includes(familia)}">
                                ${familia}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="filter-group-mobile" data-filtro="materiales">
                    <h4><i class="fas fa-mountain"></i> Material</h4>
                    <div class="filter-options-mobile">
                        ${[...new Set(productos.map(p => p.material))].map(material => `
                            <button class="filter-option-mobile ${estadoFiltros.materiales && estadoFiltros.materiales.includes(material) ? 'selected' : ''}" 
                                    data-valor="${material}"
                                    aria-label="${estadoFiltros.materiales && estadoFiltros.materiales.includes(material) ? 'Quitar filtro ' : 'Aplicar filtro '}${material}"
                                    aria-pressed="${estadoFiltros.materiales && estadoFiltros.materiales.includes(material)}">
                                ${material}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="filter-group-mobile" data-filtro="acabados">
                    <h4><i class="fas fa-paint-roller"></i> Acabado</h4>
                    <div class="filter-options-mobile">
                        ${[...new Set(productos.map(p => p.acabado))].map(acabado => `
                            <button class="filter-option-mobile ${estadoFiltros.acabados && estadoFiltros.acabados.includes(acabado) ? 'selected' : ''}" 
                                    data-valor="${acabado}"
                                    aria-label="${estadoFiltros.acabados && estadoFiltros.acabados.includes(acabado) ? 'Quitar filtro ' : 'Aplicar filtro '}${acabado}"
                                    aria-pressed="${estadoFiltros.acabados && estadoFiltros.acabados.includes(acabado)}">
                                ${acabado}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="filter-group-mobile" data-filtro="medidas">
                    <h4><i class="fas fa-ruler-combined"></i> Medida</h4>
                    <div class="filter-options-mobile">
                        ${[...new Set(productos.map(p => p.medida))].map(medida => `
                            <button class="filter-option-mobile ${estadoFiltros.medidas && estadoFiltros.medidas.includes(medida) ? 'selected' : ''}" 
                                    data-valor="${medida}"
                                    aria-label="${estadoFiltros.medidas && estadoFiltros.medidas.includes(medida) ? 'Quitar filtro ' : 'Aplicar filtro '}${medida}"
                                    aria-pressed="${estadoFiltros.medidas && estadoFiltros.medidas.includes(medida)}">
                                ${medida}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="filter-group-mobile" data-filtro="calidades">
                    <h4><i class="fas fa-award"></i> Calidad</h4>
                    <div class="filter-options-mobile">
                        ${[...new Set(productos.map(p => p.calidad))].map(calidad => `
                            <button class="filter-option-mobile ${estadoFiltros.calidades && estadoFiltros.calidades.includes(calidad) ? 'selected' : ''}" 
                                    data-valor="${calidad}"
                                    aria-label="${estadoFiltros.calidades && estadoFiltros.calidades.includes(calidad) ? 'Quitar filtro ' : 'Aplicar filtro '}${calidad}"
                                    aria-pressed="${estadoFiltros.calidades && estadoFiltros.calidades.includes(calidad)}">
                                ${calidad}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="filter-group-mobile" data-filtro="bordes">
                    <h4><i class="fas fa-border-style"></i> Borde</h4>
                    <div class="filter-options-mobile">
                        ${[...new Set(productos.map(p => p.borde))].map(borde => `
                            <button class="filter-option-mobile ${estadoFiltros.bordes && estadoFiltros.bordes.includes(borde) ? 'selected' : ''}" 
                                    data-valor="${borde}"
                                    aria-label="${estadoFiltros.bordes && estadoFiltros.bordes.includes(borde) ? 'Quitar filtro ' : 'Aplicar filtro '}${borde}"
                                    aria-pressed="${estadoFiltros.bordes && estadoFiltros.bordes.includes(borde)}">
                                ${borde}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="filter-group-mobile" data-filtro="precio">
                    <h4><i class="fas fa-tags"></i> Rango de Precio</h4>
                    <div style="padding: 15px;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Mínimo: S/. <span id="precio-min-movil-value">${estadoFiltros.rangoPrecio.min}</span></label>
                            <input type="range" id="precio-min-movil" min="${minPrecio}" max="${maxPrecio}" value="${estadoFiltros.rangoPrecio.min}" 
                                   style="width: 100%;" 
                                   aria-label="Precio mínimo">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Máximo: S/. <span id="precio-max-movil-value">${estadoFiltros.rangoPrecio.max}</span></label>
                            <input type="range" id="precio-max-movil" min="${minPrecio}" max="${maxPrecio * 1.5}" value="${estadoFiltros.rangoPrecio.max}" 
                                   style="width: 100%;"
                                   aria-label="Precio máximo">
                        </div>
                        <div style="margin-top: 20px; padding: 10px; background: var(--gray-light); border-radius: var(--radius-sm); text-align: center;">
                            <strong>Rango seleccionado:</strong><br>
                            S/. ${estadoFiltros.rangoPrecio.min} - S/. ${estadoFiltros.rangoPrecio.max}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Configurar eventos para los sliders de precio
        configurarSlidersPrecioMovil();
        
    } catch (error) {
        console.error('Error al cargar filtros móvil:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Error al cargar los filtros</p>
                <button class="btn btn-primary" onclick="cerrarFiltrosMovil()" style="margin-top: 15px;">
                    Cerrar
                </button>
            </div>
        `;
    }
}

function toggleFiltroMovil(tipo, valor, elemento) {
    if (!estadoFiltros[tipo]) estadoFiltros[tipo] = [];
    const arrayFiltro = estadoFiltros[tipo];
    const estaSeleccionado = arrayFiltro.includes(valor);
    
    if (estaSeleccionado) {
        const indice = arrayFiltro.indexOf(valor);
        if (indice !== -1) arrayFiltro.splice(indice, 1);
        elemento.classList.remove('selected');
        elemento.setAttribute('aria-pressed', 'false');
    } else {
        arrayFiltro.push(valor);
        elemento.classList.add('selected');
        elemento.setAttribute('aria-pressed', 'true');
    }
    
    // Actualizar contador inmediatamente
    actualizarContadorFiltros();
}

function actualizarRangoPrecioMovil(tipo, valor) {
    estadoFiltros.rangoPrecio[tipo] = parseFloat(valor);
    const valorElement = document.getElementById(`precio-${tipo}-movil-value`);
    if (valorElement) valorElement.textContent = parseInt(valor);
    actualizarContadorFiltros();
}

function abrirFiltrosMovil() {
    const overlay = document.getElementById('filtros-overlay');
    if (overlay) {
        overlay.classList.add('activo');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Recargar el contenido de filtros
        cargarFiltrosContentMovil();
        
        // Actualizar contador
        actualizarContadorFiltros();
        
        // Enfocar el primer botón de filtro
        setTimeout(() => {
            const firstButton = document.querySelector('.filter-option-mobile');
            if (firstButton) firstButton.focus();
            
            // Configurar eventos para los sliders de precio
            configurarSlidersPrecioMovil();
        }, 100);
    }
}

function cerrarFiltrosMovil() {
    const overlay = document.getElementById('filtros-overlay');
    if (overlay) {
        overlay.classList.remove('activo');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        
        // Enfocar el botón que abrió el modal
        if (window.innerWidth < 768) {
            const btnFiltros = document.getElementById('btn-filtros-movil');
            if (btnFiltros) btnFiltros.focus();
        } else {
            const btnFiltrar = document.getElementById('btn-filtrar-movil');
            if (btnFiltrar) btnFiltrar.focus();
        }
    }
}

function aplicarFiltrosMovil() {
    aplicarFiltros();
    cerrarFiltrosMovil();
    mostrarToast('Filtros aplicados');
}

function reiniciarFiltrosMovil() {
    reiniciarFiltros();
    cargarFiltrosContentMovil();
    mostrarToast('Filtros limpiados');
}

// ===== FUNCIÓN PARA CONFIGURAR SLIDERS DE PRECIO EN MÓVIL =====
function configurarSlidersPrecioMovil() {
    const precioMinInput = document.getElementById('precio-min-movil');
    const precioMaxInput = document.getElementById('precio-max-movil');
    
    if (precioMinInput) {
        precioMinInput.addEventListener('input', function() {
            actualizarRangoPrecioMovil('min', this.value);
        });
    }
    
    if (precioMaxInput) {
        precioMaxInput.addEventListener('input', function() {
            actualizarRangoPrecioMovil('max', this.value);
        });
    }
}

function actualizarContadorFiltros() {
    const contador = document.getElementById('contador-filtros-movil');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    
    if (!contador && !btnLimpiar) return;
    
    let count = 0;
    const tipos = ['familias', 'materiales', 'acabados', 'medidas', 'calidades', 'bordes'];
    
    tipos.forEach(tipo => {
        if (estadoFiltros[tipo] && estadoFiltros[tipo].length > 0) {
            count += estadoFiltros[tipo].length;
        }
    });
    
    const precios = productos.filter(p => p.precio > 0).map(p => p.precio);
    if (precios.length > 0) {
        const minDefault = Math.floor(Math.min(...precios));
        const maxDefault = Math.ceil(Math.max(...precios));
        
        if (estadoFiltros.rangoPrecio.min > minDefault || 
            estadoFiltros.rangoPrecio.max < maxDefault) {
            count++;
        }
    }
    
    if (estadoFiltros.busqueda) count++;
    
    if (contador) contador.textContent = count;
    
    if (btnLimpiar) {
        if (count > 0) {                    
            btnLimpiar.style.background = 'linear-gradient(135deg, #e63946, #d62839)';
            btnLimpiar.style.borderColor = '#e63946';
            btnLimpiar.style.color = 'white';
            btnLimpiar.style.fontWeight = '700';
        } else {
            btnLimpiar.style.background = '';
            btnLimpiar.style.borderColor = '';
            btnLimpiar.style.color = '';
            btnLimpiar.style.fontWeight = '';
        }
    }
}

// ===== MENÚ MÓVIL =====
function inicializarMenuMovil() {
    const searchBtn = document.getElementById('mobile-menu-search');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const searchSection = document.getElementById('search-section');
            if (searchSection) {
                searchSection.classList.add('active');
                setTimeout(() => {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) searchInput.focus();
                }, 100);
            }
        });
    }

    const inicioBtn = document.getElementById('mobile-menu-home');
    if (inicioBtn) {
        inicioBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelectorAll('.mobile-menu-item').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
        });
    }

    const favoritosBtn = document.getElementById('mobile-menu-favoritos');
    if (favoritosBtn) {
        favoritosBtn.addEventListener('click', function(e) {
            e.preventDefault();
            abrirModalFavoritos();
            document.querySelectorAll('.mobile-menu-item').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
        });
    }

    const outletLink = document.querySelector('a[href="#products"]');
    if (outletLink) {
        outletLink.addEventListener('click', function(e) {
            document.querySelectorAll('.mobile-menu-item').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
        });
    }
}

// ===== CONFIGURAR SCROLL DE BÚSQUEDA MÓVIL =====
function configurarScrollBusquedaMovil() {
    let ultimoScroll = 0;
    let timeoutScroll;
    
    window.addEventListener('scroll', function() {
        if (window.innerWidth < 768) {
            const searchSection = document.getElementById('search-section');
            if (searchSection && searchSection.classList.contains('active')) {
                const scrollActual = window.pageYOffset;
                
                clearTimeout(timeoutScroll);
                
                timeoutScroll = setTimeout(() => {
                    if (Math.abs(scrollActual - ultimoScroll) > 30) {
                        searchSection.classList.remove('active');
                        document.body.classList.remove('search-active');
                        document.body.style.overflow = '';
                    }
                    ultimoScroll = scrollActual;
                }, 100);
            }
        }
    });
    
    window.addEventListener('orientationchange', function() {
        const searchSection = document.getElementById('search-section');
        if (searchSection && searchSection.classList.contains('active')) {
            setTimeout(function() {
                if (searchSection) searchSection.classList.remove('active');
            }, 300);
        }
    });
}

// ===== NAVEGACIÓN TECLADO =====
function configurarNavegacionTeclado() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'f':
                    e.preventDefault();
                    document.getElementById('search-input').focus();
                    break;
                case 'h':
                    e.preventDefault();
                    toggleTema();
                    break;
            }
        }
        
        if (e.key === 'Tab') {
            const focused = document.activeElement;
            if (focused && focused.scrollIntoViewIfNeeded) {
                focused.scrollIntoViewIfNeeded({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

// ===== CONTADORES =====
function actualizarContadorFavoritos() {
    const contadorFavoritos = document.getElementById('favoritos-count');
    const contadorFavoritosMovil = document.getElementById('mobile-favoritos-count');
    
    if (contadorFavoritos) contadorFavoritos.textContent = productosFavoritos.length;
    if (contadorFavoritosMovil) contadorFavoritosMovil.textContent = productosFavoritos.length;
}

function actualizarContadorAsesor() {
    const whatsappCount = document.getElementById('whatsapp-count');
    if (whatsappCount) whatsappCount.textContent = productosParaAsesor.length;
}

function actualizarVistaPreviaAsesor() {
    const preview = document.getElementById('productos-consulta-preview');
    const acciones = document.getElementById('asesor-acciones');
    const btnContactar = document.getElementById('contactar-asesor');
    
    if (!preview) return;
    
    let htmlPreview = '';
    
    if (productosParaAsesor.length === 0) {
        htmlPreview = `
            <div style="text-align: center; padding: 20px; color: var(--text-light);">
                <i class="fas fa-exclamation-circle" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                <p>No hay materiales para cotizar</p>
            </div>
        `;
        
        if (acciones) acciones.style.display = 'none';
        if (btnContactar) btnContactar.disabled = true;
    } else {
        productosParaAsesor.slice(0, 3).forEach((item, index) => {
            const producto = productos.find(p => p.id === item.id);
            if (producto) {
                htmlPreview += `
                    <div class="producto-seleccionado-item">
                        <img src="${producto.imagenes[0]}" alt="${producto.nombre}"
                            width="40"
                            height="40"
                            onerror="this.src='https://via.placeholder.com/40x40/f5f5f5/333?text=Mármol'">
                        <div class="producto-seleccionado-info">
                            <h5 style="font-size: 0.8rem;">${producto.nombre.substring(0, 30)}...</h5>
                        </div>
                    </div>
                `;
            }
        });
        
        if (productosParaAsesor.length > 3) {
            htmlPreview += `<div style="text-align: center; padding: 10px; color: var(--text-light); font-size: 0.8rem;">y ${productosParaAsesor.length - 3} más...</div>`;
        }
        
        if (acciones) acciones.style.display = 'flex';
        if (btnContactar) btnContactar.disabled = false;
    }
    
    preview.innerHTML = htmlPreview;
}

// ===== UTILIDADES =====
function mostrarToast(mensaje) {
    const toastExistente = document.querySelector('.toast');
    if (toastExistente) toastExistente.remove();
    
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
        if (toast.parentNode) toast.remove();
    }, 3000);
}

function mostrarError(mensaje) {
    const toastExistente = document.querySelector('.toast');
    if (toastExistente) toastExistente.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

console.log('Código JavaScript completamente cargado');