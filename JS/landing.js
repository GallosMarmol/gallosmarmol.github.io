// ==================== LANDING PAGE DINÁMICA ====================

// Variables globales
let productoLanding = null;
let landingCargada = false;
window.esLandingPage = false;

// ==================== VARIABLES PARA COTIZACIÓN ====================
let cotizacionSeleccionados = [];
let cotizacionStorageKey = 'cotizacion_temp_' + new Date().toISOString().split('T')[0];
let asesorPreasignadoId = null;

// ==================== OBTENER SLUG DE LA URL ====================
function obtenerSlugDeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const seccionParam = urlParams.get('seccion');
    if (seccionParam && (seccionParam === 'outlet' || seccionParam === 'saldos-exportacion')) {
        console.log('📌 Sección especial detectada:', seccionParam);
        return { tipo: 'seccion', valor: seccionParam };
    }
    
    const productoParam = urlParams.get('producto');
    if (productoParam && productoParam.trim() !== '') {
        console.log('📌 Slug desde query param:', productoParam);
        return { tipo: 'producto', valor: productoParam };
    }
    
    const path = window.location.pathname;
    let match = path.match(/^\/producto\/([^\/]+)$/);
    if (match) {
        console.log('📌 Slug desde pathname:', match[1]);
        return { tipo: 'producto', valor: match[1] };
    }
    
    const hash = window.location.hash;
    const hashMatch = hash.match(/^#\/producto\/([^\/]+)$/);
    if (hashMatch) {
        console.log('📌 Slug desde hash:', hashMatch[1]);
        return { tipo: 'producto', valor: hashMatch[1] };
    }
    
    return null;
}

// ==================== ESPERAR A QUE SUPABASE ESTÉ LISTO ====================
function esperarSupabase(maxIntentos = 50, intervalo = 100) {
    return new Promise((resolve) => {
        if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
            console.log('✅ Supabase client ya disponible');
            resolve(true);
            return;
        }
        
        let intentos = 0;
        const verificar = setInterval(() => {
            intentos++;
            if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
                clearInterval(verificar);
                console.log('✅ Supabase client listo después de', intentos, 'intentos');
                resolve(true);
            } else if (intentos >= maxIntentos) {
                clearInterval(verificar);
                console.error('❌ Supabase client no disponible después de', maxIntentos, 'intentos');
                resolve(false);
            }
        }, intervalo);
    });
}

// ==================== MOSTRAR PÁGINA NO ENCONTRADA ====================
function mostrarPaginaNoEncontrada() {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Producto no encontrado | Gallos Mármol</title>
        <style>
            body {
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                background: var(--primary);
                color: white;
                font-family: sans-serif;
                text-align: center;
            }
            .error-container h1 {
                font-size: 6rem;
                color: #d4d4ae;
            }
            .btn {
                display: inline-block;
                background: #d4d4ae;
                color: var(--primary);
                padding: 12px 30px;
                border-radius: 30px;
                text-decoration: none;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="error-container">
            <h1>404</h1>
            <h2>Producto no encontrado</h2>
            <p>Lo sentimos, el producto que buscas no existe.</p>
            <a href="/" class="btn">Volver al inicio</a>
        </div>
    </body>
    </html>`;
    document.documentElement.innerHTML = html;
}

// ==================== INCREMENTAR VISITAS ====================
async function incrementarVisitas(productoId) {
    try {
        const { data: producto } = await window.supabaseClient
            .from('productos')
            .select('visitas')
            .eq('id', productoId)
            .single();
        
        if (producto) {
            await window.supabaseClient
                .from('productos')
                .update({ visitas: (producto.visitas || 0) + 1 })
                .eq('id', productoId);
        }
    } catch (error) {
        console.log('Error incrementando visitas:', error);
    }
}

// ==================== REGISTRAR VISITA DETALLADA ====================
async function registrarVisitaDetallada(productoId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: existente } = await window.supabaseClient
            .from('productos_visitas')
            .select('id, visitas')
            .eq('producto_id', productoId)
            .eq('fecha', today)
            .maybeSingle();
        
        if (existente) {
            await window.supabaseClient
                .from('productos_visitas')
                .update({ visitas: existente.visitas + 1 })
                .eq('id', existente.id);
        } else {
            await window.supabaseClient
                .from('productos_visitas')
                .insert({ producto_id: productoId, fecha: today, visitas: 1 });
        }
    } catch (error) {
        console.log('Error registrando visita detallada:', error);
    }
}

// ==================== ACTUALIZAR SEO ====================
function actualizarSEODinamico(producto) {
    document.title = producto.titulo_seo || `${producto.nombre} | Gallos Mármol`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = producto.descripcion_seo || `Descubre la ${producto.nombre} premium de Gallos Mármol.`;
    
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
    }
    ogImage.content = producto.imagen_principal || 'FOTO/foto_01.webp';
    
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
    }
    ogTitle.content = `${producto.nombre} | Gallos Mármol`;
}

// ==================== OPTIMIZAR URL DE GOOGLE DRIVE ====================
function optimizarGoogleDriveUrl(url) {
    if (!url) return 'FOTO/foto_01.webp';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    return url;
}

// ==================== ESCAPAR HTML ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== FUNCIONES DE COTIZACIÓN ====================

function cargarSeleccionCotizacion() {
    const guardado = localStorage.getItem(cotizacionStorageKey);
    if (guardado) {
        try {
            cotizacionSeleccionados = JSON.parse(guardado);
            console.log('📦 Cotización cargada desde localStorage:', cotizacionSeleccionados.length, 'productos');
            
            // Actualizar barra flotante
            actualizarBarraFlotante();
            
            // Actualizar todos los botones después de que el DOM esté listo
            setTimeout(() => {
                actualizarTodosLosBotonesCotizar();
            }, 100);
            
        } catch(e) { 
            console.error('Error cargando cotización:', e);
            cotizacionSeleccionados = [];
        }
    } else {
        cotizacionSeleccionados = [];
    }
}

function guardarSeleccionCotizacion() {
    localStorage.setItem(cotizacionStorageKey, JSON.stringify(cotizacionSeleccionados));
}

// ==================== LIMPIAR COTIZACIÓN ====================
function limpiarCotizacion() {
    mostrarModal(
        '¿Limpiar selección?',
        '<p>Se eliminarán <strong>todos los productos</strong> de tu cotización.</p><p class="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>',
        'question',
        {
            showCancelButton: true,
            confirmButtonText: 'Sí, limpiar',
            cancelButtonText: 'Cancelar'
        }
    ).then(async (result) => {
        if (result.isConfirmed) {
            cotizacionSeleccionados = [];
            localStorage.removeItem(cotizacionStorageKey);
            actualizarBarraFlotante();
            
            document.querySelectorAll('.btn-cotizar').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
            });
            
            await mostrarModal('Selección limpiada', 'Todos los productos han sido removidos de tu cotización.', 'success', { timer: 2000, showConfirmButton: false });
        }
    });
}

function mostrarModalConfirmacion(ejecutarLimpieza) {
    // Asegurar que Swal está listo
    if (typeof Swal === 'undefined' || !Swal.fire) {
        if (confirm('¿Limpiar selección? Se eliminarán todos los productos de tu cotización')) {
            ejecutarLimpieza();
        }
        return;
    }
    
    Swal.fire({
        title: '¿Limpiar selección?',
        html: '<p style="font-size: 1rem;">Se eliminarán <strong>todos los productos</strong> de tu cotización.</p>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: '<i class="fas fa-trash"></i> Sí, limpiar',
        cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
        reverseButtons: true,
        backdrop: true,
        allowOutsideClick: true
    }).then((result) => {
        if (result.isConfirmed) {
            ejecutarLimpieza();
        }
    }).catch((error) => {
        console.error('Error en Swal:', error);
        if (confirm('¿Limpiar selección? Se eliminarán todos los productos de tu cotización')) {
            ejecutarLimpieza();
        }
    });
}

// ============================================
// MODAL DE CONFIRMACIÓN DE PRODUCTO AGREGADO
// ============================================

function mostrarModalConfirmacionAgregado(nombreProducto) {
    console.log('🎉 Mostrando modal de confirmación para:', nombreProducto);
    
    // Eliminar modal anterior si existe
    const modalExistente = document.getElementById('modalConfirmacionAgregado');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Crear modal dinámico
    const modalHtml = `
        <div id="modalConfirmacionAgregado" class="modal-confirmacion-agregado show">
            <div class="modal-confirmacion-contenido">
                <div class="modal-confirmacion-icono">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>¡Producto agregado!</h3>
                <p>"${escapeHtml(nombreProducto)}" ha sido añadido a tu cotización</p>
                <div class="modal-confirmacion-acciones">
                    <button onclick="window.cerrarModalConfirmacion()" class="btn-seguir-comprando">
                        <i class="fas fa-shopping-bag"></i> Seguir agregando
                    </button>
                    <button onclick="window.irACotizacion()" class="btn-ir-cotizacion">
                        <i class="fas fa-file-invoice"></i> Ver cotización
                    </button>
                </div>
                <div class="modal-confirmacion-barra">
                    <i class="fas fa-info-circle"></i>
                    <span>Encuentra tus productos en la <strong>barra de cotización</strong> en la parte inferior</span>
                </div>
            </div>
        </div>
    `;
    
    // Insertar modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
        cerrarModalConfirmacion();
    }, 5000);
    
    // Cerrar al hacer clic fuera del modal
    const modal = document.getElementById('modalConfirmacionAgregado');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalConfirmacion();
            }
        });
    }
}

// ============================================
// CERRAR MODAL DE CONFIRMACIÓN
// ============================================

function cerrarModalConfirmacion() {
    console.log('🔒 Cerrando modal de confirmación');
    const modal = document.getElementById('modalConfirmacionAgregado');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ============================================
// IR A COTIZACIÓN
// ============================================

function irACotizacion() {
    console.log('📤 Ir a cotización');
    cerrarModalConfirmacion();
    if (typeof window.abrirModalCotizacion === 'function') {
        window.abrirModalCotizacion();
    }
}

// ============================================
// SEGUIR AGREGANDO PRODUCTOS
// ============================================

function seguirAgregando() {
    console.log('🛒 Seguir agregando productos');
    cerrarModalConfirmacion();
    // Scroll a la sección de productos
    const productosSection = document.getElementById('productos');
    if (productosSection) {
        productosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function actualizarCantidadCotizacion(productoId, nuevaCantidad) {
    const producto = cotizacionSeleccionados.find(p => p.id === productoId);
    if (producto) {
        producto.cantidad = Math.max(1, parseInt(nuevaCantidad) || 1);
        guardarSeleccionCotizacion();
    }
}

// ==================== ELIMINAR PRODUCTO DE COTIZACIÓN CON CONFIRMACIÓN ====================
function eliminarProductoCotizacion(productoId, productoNombre) {
    // Mostrar modal de confirmación antes de eliminar
    mostrarModal(
        '¿Eliminar producto?',
        `¿Estás seguro de que deseas eliminar "<strong>${productoNombre || 'este producto'}</strong>" de tu cotización?`,
        'question',
        {
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }
    ).then((result) => {
        if (result.isConfirmed) {
            // Eliminar el producto del array
            cotizacionSeleccionados = cotizacionSeleccionados.filter(p => p.id !== productoId);
            
            // Guardar en localStorage
            localStorage.setItem(cotizacionStorageKey, JSON.stringify(cotizacionSeleccionados));
            
            // Actualizar barra flotante
            actualizarBarraFlotante();
            
            // Actualizar el botón del producto en la card principal
            actualizarBotonCard(productoId, true);
            
            // ============================================
            // VERIFICAR SI QUEDAN PRODUCTOS
            // ============================================
            if (cotizacionSeleccionados.length === 0) {
                // Si no quedan productos, cerrar el modal de cotización
                cerrarModalCotizacion();
                
                // Mostrar mensaje informativo
                mostrarModal(
                    'Cotización vacía',
                    'Se han eliminado todos los productos. La cotización se ha cerrado.',
                    'info',
                    { timer: 2000, showConfirmButton: false }
                );
            } else {
                // Si aún hay productos, actualizar el contenido del modal
                actualizarContenidoModalCotizacion();
            }
        }
    });
}

// Exponer función globalmente
window.eliminarProductoCotizacion = eliminarProductoCotizacion;

// ==================== ASIGNACIÓN DE ASESOR ====================

async function verificarClienteExistente(email, telefono) {
    if (!email && !telefono) return null;
    
    let query = window.supabaseClient
        .from('clientes_asesores')
        .select('vendedor_id, vendedores:vendedor_id(*)');
    
    if (email) query = query.eq('email', email);
    if (telefono && !email) query = query.eq('telefono', telefono);
    
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return data;
}

async function asignarAsesorAutomatico(datosCliente) {
    const esOutlet = true;
    const ubicacion = datosCliente.ubicacionProyecto || 'Lima';
    
    let tipoRequerido = ['OUTLET'];
    
    if (ubicacion === 'Lima' || ubicacion === 'Provincia') {
        tipoRequerido.push('NACIONAL');
    } else if (ubicacion === 'Exterior') {
        tipoRequerido.push('EXTERIOR');
    } else {
        tipoRequerido.push('NACIONAL');
    }
    
    let query = window.supabaseClient
        .from('vendedores')
        .select('*')
        .eq('activo', true)
        .eq('atiende_outlet', true)
        .contains('tipo_atencion', tipoRequerido);
    
    const { data: vendedoresDisponibles, error } = await query.order('orden');
    
    if (error || !vendedoresDisponibles || vendedoresDisponibles.length === 0) {
        const { data: fallback } = await window.supabaseClient
            .from('vendedores')
            .select('*')
            .eq('activo', true)
            .limit(1);
        return fallback?.[0] || null;
    }
    
    const { data: conteoAsignaciones } = await window.supabaseClient
        .from('cotizaciones')
        .select('asesor_asignado_id')
        .gte('creado_el', new Date().toISOString().split('T')[0]);
    
    const conteoPorVendedor = new Map();
    conteoAsignaciones?.forEach(c => {
        conteoPorVendedor.set(c.asesor_asignado_id, (conteoPorVendedor.get(c.asesor_asignado_id) || 0) + 1);
    });
    
    vendedoresDisponibles.sort((a, b) => {
        const countA = conteoPorVendedor.get(a.id) || 0;
        const countB = conteoPorVendedor.get(b.id) || 0;
        return countA - countB;
    });
    
    return vendedoresDisponibles[0];
}

async function actualizarContadorAsesor(asesorId) {
    try {
        // 1. Obtener el valor actual
        const { data: vendedor, error: selectError } = await window.supabaseClient
            .from('vendedores')
            .select('leads_asignados')
            .eq('id', asesorId)
            .single();

        if (selectError) {
            console.error('❌ Error obteniendo asesor:', selectError);
            return false;
        }

        // 2. Calcular nuevo valor
        const nuevoContador = (vendedor?.leads_asignados || 0) + 1;

        // 3. Actualizar en la base de datos
        const { error: updateError } = await window.supabaseClient
            .from('vendedores')
            .update({ 
                leads_asignados: nuevoContador,
                ultima_asignacion: new Date().toISOString()
            })
            .eq('id', asesorId);

        if (updateError) {
            console.error('❌ Error actualizando contador:', updateError);
            return false;
        }

        console.log(`✅ Contador actualizado: ${nuevoContador}`);
        
        // 4. 🔄 RECARGAR LA LISTA DE ASESORES (IMPORTANTE)
        await recargarAsesores();
        
        return true;
    } catch (error) {
        console.error('❌ Error en actualizarContadorAsesor:', error);
        return false;
    }
}

async function recargarAsesores() {
    try {
        console.log('🔄 Recargando lista de asesores...');
        const { data: vendedores } = await window.supabaseClient
            .from('vendedores')
            .select('id, nombre, telefono, email, leads_asignados, max_leads_diarios, activo')
            .eq('activo', true)
            .eq('atiende_outlet', true)
            .order('leads_asignados');
        
        asesoresPrecargados = vendedores || [];
        console.log('✅ Asesores recargados:', asesoresPrecargados.length);
        
        // Si hay asesor seleccionado, actualizarlo con los nuevos datos
        if (asesorSeleccionadoActual) {
            const asesorActualizado = asesoresPrecargados.find(a => a.id === asesorSeleccionadoActual.id);
            if (asesorActualizado) {
                asesorSeleccionadoActual = asesorActualizado;
            }
        }
        
        return asesoresPrecargados;
    } catch (error) {
        console.error('❌ Error recargando asesores:', error);
        return asesoresPrecargados || [];
    }
}

// ============================================
// ASIGNAR ASESOR AUTOMÁTICO - ACTUALIZADO
// ============================================

async function asignarAsesorAutomaticoPaso() {
    try {
        const { data: vendedoresActualizados } = await window.supabaseClient
            .from('vendedores')
            .select('id, nombre, telefono, email, leads_asignados')  // ✅ CAMBIADO: leads_asignados_hoy → leads_asignados
            .eq('activo', true)
            .eq('atiende_outlet', true);
        
        if (vendedoresActualizados && vendedoresActualizados.length > 0) {
            // Ordenar por leads_asignados (menor es mejor)
            vendedoresActualizados.sort((a, b) => {
                const leadsA = a.leads_asignados || 0;  // ✅ CAMBIADO: leads_asignados_hoy → leads_asignados
                const leadsB = b.leads_asignados || 0;  // ✅ CAMBIADO: leads_asignados_hoy → leads_asignados
                return leadsA - leadsB;
            });
            const mejorAsesor = vendedoresActualizados[0];
            asesorSeleccionadoActual = mejorAsesor;
            actualizarAsesorSeleccionadoPaso(mejorAsesor, 'auto');
            
            const asesorInfo = document.getElementById('asesor-info-paso');
            if (asesorInfo) {
                asesorInfo.innerHTML = `
                    <div class="asesor-info-result success">
                        <i class="fas fa-user-check"></i> Asesor asignado automáticamente: ${escapeHtml(mejorAsesor.nombre)}
                    </div>
                `;
                asesorInfo.classList.remove('hidden');
            }
        } else {
            mostrarModal('Error', 'No hay asesores disponibles', 'error');
        }
    } catch (error) {
        console.error('Error en asignación automática:', error);
    }
}

// ============================================
// CONFIGURAR ZONA HORARIA DE PERÚ
// ============================================

function obtenerFechaPeru() {
    const ahora = new Date();
    // Restar 5 horas para obtener hora de Perú (UTC-5)
    const fechaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return fechaPeru.toISOString();
}

function obtenerFechaPeruFormateada() {
    const ahora = new Date();
    const fechaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return fechaPeru.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// ============================================
// FECHA EN ZONA HORARIA DE PERÚ (UTC-5)
// ============================================

function obtenerFechaPeru() {
    const ahora = new Date();
    // Restar 5 horas para obtener hora de Perú (UTC-5)
    const fechaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return fechaPeru.toISOString();
}

function obtenerFechaPeruFormateada() {
    const ahora = new Date();
    const fechaPeru = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    return fechaPeru.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Exponer funciones globalmente
window.obtenerFechaPeru = obtenerFechaPeru;
window.obtenerFechaPeruFormateada = obtenerFechaPeruFormateada;

    // ============================================
    // OBTENER UBICACIÓN POR IP
    // ============================================

    async function obtenerUbicacionPorIP() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            
            if (!response.ok) {
                throw new Error('Error en la API de ubicación');
            }
            
            const data = await response.json();
            
            if (data && data.city && data.country_name) {
                // ✅ CONSTRUIR TEXTO DE UBICACIÓN
                let ubicacionTexto = '';
                if (data.city) ubicacionTexto += data.city;
                if (data.region && data.region !== data.city) {
                    ubicacionTexto += ubicacionTexto ? `, ${data.region}` : data.region;
                }
                if (data.country_name) {
                    ubicacionTexto += ubicacionTexto ? `, ${data.country_name}` : data.country_name;
                }
                
                return ubicacionTexto || 'No especificada';
            }
            
            return await obtenerUbicacionFallback();
            
        } catch (error) {
            console.warn('⚠️ Error obteniendo ubicación:', error);
            return await obtenerUbicacionFallback();
        }
    }

    // ============================================
    // FALLBACK PARA OBTENER UBICACIÓN - SOLO TEXTO
    // ============================================

    async function obtenerUbicacionFallback() {
        try {
            const response = await fetch('https://ipinfo.io/json');
            
            if (!response.ok) {
                throw new Error('Error en API de fallback');
            }
            
            const data = await response.json();
            
            if (data && data.city && data.country) {
                let ubicacionTexto = '';
                if (data.city) ubicacionTexto += data.city;
                if (data.region && data.region !== data.city) {
                    ubicacionTexto += ubicacionTexto ? `, ${data.region}` : data.region;
                }
                if (data.country) {
                    const nombrePais = await obtenerNombrePais(data.country);
                    ubicacionTexto += ubicacionTexto ? `, ${nombrePais}` : nombrePais;
                }
                
                return ubicacionTexto || 'No especificada';
            }
            
            return 'No especificada';
            
        } catch (error) {
            console.warn('⚠️ Error obteniendo ubicación fallback:', error);
            return 'No especificada';
        }
    }

    // ============================================
    // OBTENER NOMBRE DE PAÍS POR CÓDIGO
    // ============================================

    async function obtenerNombrePais(codigoPais) {
        // Mapa de códigos de país a nombres
        const paises = {
            'PE': 'Perú',
            'US': 'Estados Unidos',
            'CA': 'Canadá',
            'MX': 'México',
            'AR': 'Argentina',
            'CL': 'Chile',
            'CO': 'Colombia',
            'VE': 'Venezuela',
            'BO': 'Bolivia',
            'EC': 'Ecuador',
            'PY': 'Paraguay',
            'UY': 'Uruguay',
            'BR': 'Brasil',
            'ES': 'España',
            'FR': 'Francia',
            'DE': 'Alemania',
            'IT': 'Italia',
            'GB': 'Reino Unido',
            'JP': 'Japón',
            'CN': 'China',
            'IN': 'India',
            'AU': 'Australia',
            'ZA': 'Sudáfrica'
        };
        
        return paises[codigoPais] || codigoPais;
    }

    // ============================================
    // FUNCIÓN DE ENVÍO DE COTIZACIÓN -
    // ============================================

    window.enviarCotizacion = async function(datosCliente, asesor) {
        console.log('🚀 INICIO de enviarCotizacion con seguridad');
        console.log('📋 Datos cliente:', datosCliente);
        console.log('👤 Asesor:', asesor);
        
        // ==========================================
        // VALIDACIÓN INICIAL
        // ==========================================

        // 1. Verificar asesor
        if (!asesor || !asesor.id) {
            console.error('❌ Error: asesor inválido');
            await mostrarModal('Error', 'No se pudo identificar al asesor', 'error');
            return;
        }

        // 2. Verificar que hay productos seleccionados
        if (!window.cotizacionSeleccionados || window.cotizacionSeleccionados.length === 0) {
            await mostrarModal('Error', 'No hay productos seleccionados para cotizar', 'error');
            return;
        }

        // 3. Obtener IP del cliente
        let ipCliente = '0.0.0.0';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ipCliente = data.ip;
            console.log('📍 IP del cliente:', ipCliente);
        } catch (e) {
            console.warn('⚠️ No se pudo obtener IP, usando valor por defecto');
        }

        // 4. Obtener fecha en zona horaria de Perú
        const fechaPeru = obtenerFechaPeru();
        const fechaPeruFormateada = obtenerFechaPeruFormateada();

        // ==========================================
        // RATE LIMITING - VERIFICACIÓN INICIAL
        // ==========================================

        // 5. Verificar rate limiting
        if (window.rateLimiter && typeof window.rateLimiter.verificarRateLimiting === 'function') {
            const rateCheck = window.rateLimiter.verificarRateLimiting(
                ipCliente,
                datosCliente.email || datosCliente.telefono
            );
            
            if (!rateCheck.permitido) {
                await mostrarModal(
                    'Demasiadas solicitudes',
                    `Has alcanzado el límite de cotizaciones. Por favor espera ${rateCheck.tiempoEspera}.`,
                    'warning'
                );
                return;
            }
        }

        // 6. Verificar bloqueo por brute force
        if (window.rateLimiter && typeof window.rateLimiter.getEstado === 'function') {
            const estadoBruteForce = window.rateLimiter.getEstado(
                ipCliente,
                datosCliente.email || datosCliente.telefono
            );
            
            if (estadoBruteForce.bloqueado) {
                if (typeof window.mostrarBloqueoModal === 'function') {
                    window.mostrarBloqueoModal(estadoBruteForce.tiempoBloqueo, ipCliente);
                }
                await mostrarModal(
                    'Cuenta bloqueada temporalmente',
                    `Demasiados intentos fallidos. Bloqueado por ${estadoBruteForce.tiempoBloqueo} minutos.`,
                    'error'
                );
                return;
            }
        }

        // 7. Verificar duplicados
        if (window.duplicatePreventer && typeof window.duplicatePreventer.verificarDuplicado === 'function') {
            const duplicado = window.duplicatePreventer.verificarDuplicado({
                nombre: datosCliente.nombre,
                email: datosCliente.email || '',
                telefono: datosCliente.telefono,
                productos: window.cotizacionSeleccionados
            });
            
            if (duplicado.esDuplicado) {
                await mostrarModal(
                    'Cotización duplicada',
                    duplicado.mensaje + (duplicado.tiempoEspera ? `. Espera ${duplicado.tiempoEspera} segundos.` : ''),
                    'warning'
                );
                return;
            }
        }

        // ==========================================
        // VALIDACIÓN DE CAMPOS (SOLO 3 CAMPOS VISIBLES)
        // ==========================================

        // 8. Validar nombre (OBLIGATORIO)
        const nombreValidado = validarNombreCompleto(datosCliente.nombre);
        if (!nombreValidado.valido) {
            await mostrarModal(
                'Nombre inválido',
                nombreValidado.errores.join('<br>'),
                'warning'
            );
            return;
        }
        const nombreFinal = nombreValidado.valorSanitizado;

        // 9. Validar teléfono (OBLIGATORIO) - OBTENER PAÍS
        const prefijoSelect = document.getElementById('prefijo-pais');
        const pais = prefijoSelect ? prefijoSelect.value : '51';
        
        const telefonoValidado = validarTelefonoAvanzado(datosCliente.telefono, pais);
        
        // ✅ SI ES SOSPECHOSO, BLOQUEAR
        if (telefonoValidado.esSospechoso) {
            const advertencias = telefonoValidado.advertencias.join('<br>');
            await mostrarModal(
                '⚠️ Teléfono sospechoso',
                `<p>Se detectaron las siguientes irregularidades:</p>
                <p style="color: #d97706; font-size: 0.9rem; margin: 8px 0;">${advertencias}</p>
                <p style="margin-top: 12px; font-size: 0.85rem; color: #dc2626;">
                    ❌ Por seguridad, no se puede continuar con este número.
                </p>
                <p style="font-size: 0.75rem; color: #6b7280; margin-top: 8px;">
                    Por favor, verifica el número e intenta nuevamente.
                </p>`,
                'error',
                { confirmButtonText: 'Entendido' }
            );
            
            if (window.rateLimiter && typeof window.rateLimiter.registrarIntento === 'function') {
                window.rateLimiter.registrarIntento(ipCliente, datosCliente.email || datosCliente.telefono);
            }
            return;
        }
        
        if (!telefonoValidado.valido) {
            await mostrarModal(
                'Teléfono inválido',
                telefonoValidado.errores.join('<br>'),
                'warning'
            );
            return;
        }
        
        const telefonoFinal = telefonoValidado.telefonoLimpio;
        const telefonoFormateado = telefonoValidado.telefonoFormateado;

        // Obtener configuración del país
        const configPais = PAISES_CONFIG[pais];
        const prefijoPais = configPais ? configPais.prefijo : '+51';
        const nombrePais = configPais ? configPais.nombre : 'Perú';
        const telefonoCompleto = `${prefijoPais} ${telefonoFinal}`;

        // 10. Validar observaciones (OPCIONAL)
        let observacionesFinal = null;
        if (datosCliente.observaciones && datosCliente.observaciones.trim() !== '') {
            const obsValidado = validarObservaciones(datosCliente.observaciones);
            if (!obsValidado.valido) {
                await mostrarModal(
                    'Observaciones inválidas',
                    obsValidado.errores.join('<br>'),
                    'warning'
                );
                return;
            }
            observacionesFinal = obsValidado.valorSanitizado;
        }

        // ==========================================
        // REGISTRAR INTENTO (DESPUÉS DE VALIDAR)
        // ==========================================

        // 11. Registrar intento (para brute force) - SOLO DESPUÉS DE VALIDAR
        if (window.rateLimiter && typeof window.rateLimiter.registrarIntento === 'function') {
            const intento = window.rateLimiter.registrarIntento(ipCliente, datosCliente.email || telefonoFinal);
            
            // ✅ Solo mostrar advertencia si quedan pocos intentos (≤ 2)
            if (intento.permitido && intento.intentosRestantes !== undefined) {
                if (intento.intentosRestantes <= 2) {
                    if (typeof window.mostrarAdvertenciaIntentos === 'function') {
                        window.mostrarAdvertenciaIntentos(intento.intentosRestantes);
                    }
                    if (typeof window.actualizarBadgeSeguridad === 'function') {
                        window.actualizarBadgeSeguridad(intento.intentosRestantes);
                    }
                }
            }
            
            if (!intento.permitido) {
                await mostrarModal(
                    'Demasiados intentos',
                    intento.mensaje,
                    'error'
                );
                return;
            }
        }

        // ==========================================
        // VERIFICAR DISPOSITIVO
        // ==========================================

        // 12. Verificar dispositivo (si está disponible)
        if (window.deviceVerifier && typeof window.deviceVerifier.verificarCotizacion === 'function') {
            const verificacionDispositivo = window.deviceVerifier.verificarCotizacion(
                ipCliente,
                navigator.userAgent,
                datosCliente.email || telefonoFinal
            );

            if (!verificacionDispositivo.confiable) {
                const confirmar = await mostrarModal(
                    '⚠️ Verificación de seguridad',
                    `<p>Se detectó un cambio en tu dispositivo (${verificacionDispositivo.cambios.join(', ')}).</p>
                    <p style="font-size: 0.85rem; margin-top: 8px;">Por seguridad, confirma que eres tú.</p>
                    <div style="margin-top: 16px; background: #f9fafb; padding: 16px; border-radius: 12px;">
                        <p style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px;">Ingresa el código de verificación:</p>
                        <input type="text" 
                            id="codigoVerificacion" 
                            placeholder="Ej: 1234" 
                            style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1.2rem; text-align: center; letter-spacing: 8px; max-width: 200px; margin: 0 auto; display: block; font-family: monospace;">
                        <p style="font-size: 0.7rem; color: #6b7280; margin-top: 8px; text-align: center;">Código enviado a ${datosCliente.email || 'tu correo registrado'}</p>
                    </div>`,
                    'warning',
                    {
                        showCancelButton: true,
                        confirmButtonText: 'Verificar',
                        cancelButtonText: 'Cancelar'
                    }
                );

                if (!confirmar.isConfirmed) {
                    if (window.rateLimiter && typeof window.rateLimiter.registrarIntento === 'function') {
                        window.rateLimiter.registrarIntento(ipCliente, datosCliente.email || telefonoFinal);
                    }
                    return;
                }

                const codigoInput = document.getElementById('codigoVerificacion');
                const codigo = codigoInput ? codigoInput.value : '';
                const codigoEsperado = '1234';
                
                if (codigo !== codigoEsperado) {
                    mostrarToast('❌ Código de verificación incorrecto', 'error');
                    if (window.rateLimiter && typeof window.rateLimiter.registrarIntento === 'function') {
                        window.rateLimiter.registrarIntento(ipCliente, datosCliente.email || telefonoFinal);
                    }
                    await mostrarModal(
                        'Código incorrecto',
                        'El código de verificación no coincide. Intenta nuevamente o solicita un nuevo código.',
                        'error'
                    );
                    return;
                }

                window.deviceVerifier.verificarDispositivo(
                    datosCliente.email || telefonoFinal,
                    ipCliente,
                    navigator.userAgent
                );
                mostrarToast('✅ Dispositivo verificado correctamente', 'success');
            }
        }

        // ==========================================
        // OBTENER UBICACIÓN DEL CLIENTE
        // ==========================================

        let ubicacionCliente = null;
        try {
            console.log('📍 Intentando obtener ubicación...');
            const ubicacionData = await window.obtenerUbicacionPorIP();
            
            if (ubicacionData) {
                if (typeof ubicacionData === 'string') {
                    ubicacionCliente = ubicacionData;
                } else if (typeof ubicacionData === 'object' && ubicacionData.ubicacion) {
                    ubicacionCliente = ubicacionData.ubicacion;
                }
                console.log('📍 Ubicación detectada:', ubicacionCliente);
            } else {
                console.log('ℹ️ No se pudo obtener ubicación, se guardará como null');
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo ubicación:', error);
            ubicacionCliente = null;
        }

        // ==========================================
        // MOSTRAR PROGRESO
        // ==========================================

        if (typeof mostrarProgreso === 'function') {
            mostrarProgreso('🔄 Iniciando proceso de cotización...', 5);
        }

        // ==========================================
        // PROCESAR COTIZACIÓN
        // ==========================================

        try {
            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('✅ Validando datos...', 15);
            }

            // Generar número de cotización
            const numero = `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

            // ✅ OBJETO COTIZACIÓN CON TODOS LOS CAMPOS
            const cotizacion = {
                numero: numero,
                cliente_nombre: nombreFinal,
                cliente_email: null,
                cliente_telefono: telefonoFinal,
                telefono_completo: telefonoCompleto,
                codigo_pais: pais,
                cliente_empresa: '',
                tipo_cliente: 'NUEVO',
                asesor_asignado_id: asesor.id,
                observaciones: observacionesFinal || '',
                ubicacion_proyecto: '',
                ubicacion_cliente: ubicacionCliente,
                estado: 'PENDIENTE',
                ip_cliente: ipCliente,
                user_agent: navigator.userAgent,
                creado_el: fechaPeru
            };

            console.log('📦 Datos de cotización a guardar:', {
                numero: cotizacion.numero,
                cliente_nombre: cotizacion.cliente_nombre,
                cliente_telefono: cotizacion.cliente_telefono,
                telefono_completo: cotizacion.telefono_completo,
                codigo_pais: cotizacion.codigo_pais,
                ubicacion_cliente: cotizacion.ubicacion_cliente,
                ip_cliente: cotizacion.ip_cliente,
                user_agent: cotizacion.user_agent,
                creado_el: cotizacion.creado_el
            });

            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('💾 Guardando cotización...', 30);
            }

            // ==========================================
            // GUARDAR EN SUPABASE
            // ==========================================

            const { data: nuevaCotizacion, error: cotizacionError } = await window.supabaseClient
                .from('cotizaciones')
                .insert(cotizacion)
                .select()
                .single();

            if (cotizacionError) {
                console.error('❌ Error guardando cotización:', cotizacionError);
                mostrarToast('❌ Error al guardar la cotización', 'error');
                
                if (window.rateLimiter && typeof window.rateLimiter.registrarIntento === 'function') {
                    window.rateLimiter.registrarIntento(ipCliente, datosCliente.email || telefonoFinal);
                }
                
                throw new Error('Error al guardar la cotización: ' + cotizacionError.message);
            }

            const cotizacionId = nuevaCotizacion.id;
            console.log('✅ Cotización guardada:', numero, 'ID:', cotizacionId);

            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('📦 Guardando productos...', 50);
            }

            // ==========================================
            // GUARDAR DETALLES DE PRODUCTOS
            // ==========================================

            const productosParaGuardar = window.cotizacionSeleccionados.map((producto) => ({
                cotizacion_id: cotizacionId,
                producto_id: producto.id,
                codigo: producto.codigo || '',
                nombre: producto.nombre,
                creado_el: fechaPeru
            }));

            const batchSize = 10;
            let productosGuardados = 0;
            
            for (let i = 0; i < productosParaGuardar.length; i += batchSize) {
                const batch = productosParaGuardar.slice(i, i + batchSize);
                const { error: detalleError } = await window.supabaseClient
                    .from('cotizacion_detalles')
                    .insert(batch);

                if (detalleError) {
                    console.error(`❌ Error guardando detalles (lote ${Math.floor(i/batchSize) + 1}):`, detalleError);
                    mostrarToast(`⚠️ Error guardando algunos productos`, 'warning');
                } else {
                    productosGuardados += batch.length;
                }
            }

            console.log(`✅ ${productosGuardados} de ${productosParaGuardar.length} productos guardados`);

            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('👤 Actualizando asesor...', 65);
            }

            // ==========================================
            // ACTUALIZAR CONTADOR DEL ASESOR
            // ==========================================

            try {
                const { data: vendedorActual } = await window.supabaseClient
                    .from('vendedores')
                    .select('leads_asignados')
                    .eq('id', asesor.id)
                    .single();

                if (vendedorActual) {
                    const nuevoContador = (vendedorActual.leads_asignados || 0) + 1;
                    
                    await window.supabaseClient
                        .from('vendedores')
                        .update({ 
                            leads_asignados: nuevoContador,
                            ultima_asignacion: fechaPeru
                        })
                        .eq('id', asesor.id);
                    
                    console.log(`✅ Contador actualizado: ${nuevoContador}`);
                    asesor.leads_asignados = nuevoContador;
                }
            } catch (err) {
                console.error('Error actualizando contador:', err);
            }

            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('🔗 Guardando relación cliente-asesor...', 75);
            }

            // ==========================================
            // GUARDAR RELACIÓN CLIENTE-ASESOR
            // ==========================================

            if (datosCliente.email && datosCliente.email.trim() !== '') {
                try {
                    const emailSanitizado = sanitizarEmail(datosCliente.email);
                    
                    const { data: existente } = await window.supabaseClient
                        .from('clientes_asesores')
                        .select('id')
                        .eq('email', emailSanitizado)
                        .maybeSingle();

                    if (existente) {
                        await window.supabaseClient
                            .from('clientes_asesores')
                            .update({
                                telefono: telefonoFinal,
                                vendedor_id: asesor.id,
                                ultima_cotizacion: fechaPeru
                            })
                            .eq('id', existente.id);
                    } else {
                        await window.supabaseClient
                            .from('clientes_asesores')
                            .insert({
                                email: emailSanitizado,
                                telefono: telefonoFinal,
                                vendedor_id: asesor.id,
                                ultima_cotizacion: fechaPeru,
                                creado_el: fechaPeru
                            });
                    }
                    console.log('✅ Relación cliente-asesor guardada');
                } catch (err) {
                    console.error('Error guardando relación:', err);
                }
            }

            // ==========================================
            // ✅ MOSTRAR MODAL DE ASESOR ASIGNADO
            // ==========================================
            
            window.clienteActual = {
                nombre: nombreFinal,
                telefono: telefonoFinal,
                telefonoCompleto: telefonoCompleto,
                pais: pais,
                nombrePais: nombrePais
            };
            
            window.asesorActual = asesor;
            
            // Mostrar el modal de asesor asignado
            await window.mostrarModalAsesorAsignado(asesor, {
                nombre: nombreFinal
            });

            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('📝 Preparando mensaje para WhatsApp...', 85);
            }

            // ==========================================
            // PREPARAR MENSAJE DE WHATSAPP
            // ==========================================

            const modalOverlay = document.querySelector('.modal-overlay.active');
            if (modalOverlay) {
                modalOverlay.style.display = 'none';
            }

            let productosLista = '';
            window.cotizacionSeleccionados.forEach((p, i) => {
                const codigo = p.codigo ? ` (${p.codigo})` : '';
                const medidas = [];
                if (p.medida) medidas.push(`Medida: ${p.medida}`);
                if (p.espesor) medidas.push(`Espesor: ${p.espesor}`);
                const medidasStr = medidas.length > 0 ? ` [${medidas.join(', ')}]` : '';
                productosLista += `${i+1}. ${p.nombre}${codigo}${medidasStr}\n`;
            });

            let mensaje = `*NUEVA COTIZACIÓN - OUTLET*\n\n`;
            mensaje += `*N° Cotización:* ${numero}\n`;
            mensaje += `*Fecha:* ${fechaPeruFormateada}\n`;
            mensaje += `*Asesor:* ${asesor.nombre}\n\n`;
            mensaje += `*Cliente:* ${nombreFinal}\n`;
            mensaje += `*Teléfono:* ${telefonoCompleto}\n`;
            mensaje += `*País:* ${nombrePais} (${pais})\n`;
            
            if (ubicacionCliente) {
                mensaje += `*Ubicación:* ${ubicacionCliente}\n`;
            }
            
            if (observacionesFinal) {
                mensaje += `\n*Observaciones:* ${observacionesFinal}\n`;
            }
            
            mensaje += `\n*Productos:*\n${productosLista}`;

            if (typeof mostrarProgreso === 'function') {
                mostrarProgreso('📱 Abriendo WhatsApp...', 92);
            }

            // ==========================================
            // ENVIAR POR WHATSAPP
            // ==========================================

            const telefonoAsesor = asesor?.telefono?.replace(/\D/g, '');
            
            if (telefonoAsesor && telefonoAsesor.length >= 9) {
                let whatsappNumber = telefonoAsesor;
                if (whatsappNumber.length === 9) {
                    whatsappNumber = `51${whatsappNumber}`;
                }
                
                window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, '_blank');
                mostrarToast('✅ Cotización enviada exitosamente a WhatsApp', 'success');
                
                if (typeof mostrarProgreso === 'function') {
                    mostrarProgreso('✅ ¡Completado!', 100);
                }
                
                await mostrarModal(
                    '✅ Cotización enviada',
                    `La cotización ha sido enviada exitosamente a ${asesor.nombre}.<br><br>
                    <strong>N° Cotización:</strong> ${numero}<br>
                    <strong>Cliente:</strong> ${nombreFinal}<br>
                    <strong>Productos:</strong> ${window.cotizacionSeleccionados.length} producto(s)`,
                    'success',
                    { timer: 5000, showConfirmButton: false }
                );
            } else {
                mostrarToast('⚠️ Cotización registrada pero no enviada por WhatsApp', 'warning');
                await mostrarModal(
                    '⚠️ Cotización registrada',
                    `La cotización ha sido registrada exitosamente pero no se pudo enviar por WhatsApp.`,
                    'warning'
                );
            }

            // ==========================================
            // ✅ REGISTRAR ÉXITO - REINICIA EL CONTADOR
            // ==========================================

            if (window.rateLimiter && typeof window.rateLimiter.registrarCotizacionExitosa === 'function') {
                window.rateLimiter.registrarCotizacionExitosa(ipCliente, datosCliente.email || telefonoFinal);
                console.log('✅ Contador de intentos reiniciado por envío exitoso');
            }
            
            if (window.duplicatePreventer && typeof window.duplicatePreventer.registrarEnvio === 'function') {
                window.duplicatePreventer.registrarEnvio({
                    nombre: nombreFinal,
                    email: datosCliente.email || '',
                    telefono: telefonoFinal,
                    productos: window.cotizacionSeleccionados
                });
            }

            if (typeof window.actualizarBadgeSeguridad === 'function') {
                window.actualizarBadgeSeguridad(3); // Resetear badge a "Seguro"
            }

            // ==========================================
            // LIMPIAR TODO
            // ==========================================

            window.cotizacionSeleccionados = [];
            localStorage.removeItem(CONFIG.COTIZACION_STORAGE_KEY);

            actualizarTodosLosBotonesCotizar();
            actualizarBarraFlotante();
            actualizarBadgeHeader();

            window.modoAsignacionActual = 'auto';
            window.asesorPreasignadoId = null;
            window.asesorSeleccionadoActual = null;
            
            window.clienteNombreCache = '';
            window.clienteEmailCache = '';
            window.clienteTelefonoCache = '';
            window.clienteEmpresaCache = '';
            window.ubicacionCache = '';
            window.observacionesCache = '';
            window.paisSeleccionadoCache = '51';

            // Limpiar mensajes de advertencia
            const mensajeAdvertencia = document.getElementById('mensajeAdvertenciaIntentos');
            if (mensajeAdvertencia) {
                mensajeAdvertencia.style.display = 'none';
            }

            // Resetear estilos de campos
            const campos = document.querySelectorAll('.form-group input, .form-group textarea');
            campos.forEach(campo => {
                campo.style.borderColor = '';
                campo.style.backgroundColor = '';
            });

            // Ocultar badge de seguridad
            const badge = document.getElementById('securityBadge');
            if (badge) {
                badge.style.display = 'none';
            }

            console.log('✅ Proceso de cotización completado exitosamente');

            // Ocultar progreso después de completar
            setTimeout(() => {
                const progreso = document.getElementById('progresoEnvio');
                if (progreso) {
                    progreso.style.animation = 'fadeOut 0.5s ease forwards';
                    setTimeout(() => {
                        if (progreso.parentNode) {
                            progreso.remove();
                        }
                    }, 500);
                }
            }, 3000);

            // Recargar asesores después de la asignación
            if (typeof recargarAsesores === 'function') {
                await recargarAsesores();
            }

        } catch (error) {
            // ==========================================
            // MANEJO DE ERRORES
            // ==========================================

            console.error('❌ Error detallado:', error);
            
            // Registrar intento fallido
            if (window.rateLimiter && typeof window.rateLimiter.registrarIntento === 'function') {
                window.rateLimiter.registrarIntento(ipCliente, datosCliente.email || datosCliente.telefono);
            }
            
            mostrarToast('❌ Error al procesar la cotización', 'error');
            
            const modalOverlay = document.querySelector('.modal-overlay.active');
            if (modalOverlay) {
                modalOverlay.style.display = 'none';
            }
            
            const progreso = document.getElementById('progresoEnvio');
            if (progreso) {
                progreso.remove();
            }

            let mensajeError = 'Ocurrió un error al procesar la cotización. Por favor intenta nuevamente.';
            if (error.message) {
                mensajeError = error.message;
            }

            await mostrarModal(
                '❌ Error al procesar cotización',
                `${mensajeError}<br><br>
                <span style="font-size: 0.75rem; color: #6b7280;">
                    Si el problema persiste, contacta a soporte.
                </span>`,
                'error',
                { confirmButtonText: 'Entendido' }
            );
        }
    };

    // ============================================
    // EXPONER FUNCIÓN GLOBALMENTE
    // ============================================

    window.enviarCotizacion = enviarCotizacion;

function generarMensajeWhatsApp(datosCliente, productos, cotizacion, asesor) {
    let productosLista = '';
    productos.forEach((p, i) => {
        productosLista += `${i+1}. ${p.nombre} - ${p.cantidad} unidad(es)\n`;
    });
    
    return `*NUEVA COTIZACIÓN - OUTLET*
    
*N° Cotización:* ${cotizacion.numero}
*Fecha:* ${new Date().toLocaleString()}

*Datos del cliente:*
👤 *Nombre:* ${datosCliente.nombre}
📧 *Email:* ${datosCliente.email}
📞 *Teléfono:* ${datosCliente.telefono}
🏢 *Empresa:* ${datosCliente.empresa || 'No especifica'}
📍 *Ubicación proyecto:* ${datosCliente.ubicacionProyecto || 'No especifica'}
🚚 *Requiere envío:* ${datosCliente.requiereEnvio === 'si' ? 'Sí' : 'No'}

*📦 Productos solicitados:*
${productosLista}

*💬 Observaciones:*
${datosCliente.observaciones || 'Sin observaciones'}

---
🌐 *Sistema de Gestión Gallos Mármol*
Este cliente solicita cotización desde la página de OUTLET. Por favor contactarlo para brindar precios y disponibilidad.`;
}

// ==================== MODAL DE COTIZACIÓN ====================

function cambiarTipoCliente(valor) {
    const campoEmail = document.getElementById('campo-email-cliente');
    const campoDatos = document.getElementById('campo-datos-cliente');
    const asesorInfo = document.getElementById('asesor-info');
    
    if (valor === 'si') {
        if (campoEmail) campoEmail.classList.remove('hidden');
        if (campoDatos) campoDatos.classList.add('hidden');
        if (asesorInfo) asesorInfo.classList.add('hidden');
    } else {
        if (campoEmail) campoEmail.classList.add('hidden');
        if (campoDatos) campoDatos.classList.remove('hidden');
        if (asesorInfo) asesorInfo.classList.add('hidden');
        asesorPreasignadoId = null;
    }
}

async function buscarAsesorPorEmail() {
    const email = document.getElementById('cliente-email')?.value;
    if (!email) {
        Swal.fire({ title: 'Aviso', text: 'Ingresa tu correo electrónico', icon: 'warning' });
        return;
    }
    
    Swal.fire({ title: 'Buscando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        const { data: cliente } = await window.supabaseClient
            .from('clientes_asesores')
            .select('vendedor_id, vendedores:vendedor_id(*)')
            .eq('email', email)
            .maybeSingle();
        
        Swal.close();
        
        if (cliente && cliente.vendedores) {
            asesorPreasignadoId = cliente.vendedores.id;
            const asesorDiv = document.getElementById('asesor-detalle');
            if (asesorDiv) {
                asesorDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; background: white; padding: 12px; border-radius: 10px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user-tie" style="color: var(--primary);"></i>
                        </div>
                        <div>
                            <p style="font-weight: 600;">${cliente.vendedores.nombre}</p>
                            <p style="font-size: 12px; color: #666;">${cliente.vendedores.email || ''} ${cliente.vendedores.telefono || ''}</p>
                            <p style="font-size: 11px; color: #10b981;">✓ Te atenderá el mismo asesor de siempre</p>
                        </div>
                    </div>
                `;
            }
            const asesorInfo = document.getElementById('asesor-info');
            if (asesorInfo) asesorInfo.classList.remove('hidden');
        } else {
            Swal.fire({ title: 'No encontrado', text: 'No tenemos un asesor asociado a este correo. Completa tus datos y te asignaremos uno.', icon: 'info' });
            const campoDatos = document.getElementById('campo-datos-cliente');
            if (campoDatos) campoDatos.classList.remove('hidden');
        }
    } catch (error) {
        Swal.close();
        console.error('Error:', error);
    }
}

function validarFormularioCotizacion() {
    const esClienteExistente = document.querySelector('input[name="esClienteExistente"]:checked')?.value === 'si';
    
    if (esClienteExistente) {
        const email = document.getElementById('cliente-email')?.value;
        if (!email) {
            Swal.showValidationMessage('Ingresa tu correo electrónico');
            return false;
        }
        return {
            tipoCliente: 'si',
            email: email,
            nombre: null,
            telefono: null,
            empresa: null,
            ruc: null,
            ubicacionProyecto: document.getElementById('ubicacion-proyecto')?.value || null,
            requiereEnvio: document.getElementById('requiere-envio')?.value || 'no',
            observaciones: document.getElementById('observaciones')?.value || null
        };
    } else {
        const nombre = document.getElementById('cliente-nombre')?.value;
        const email = document.getElementById('cliente-correo')?.value;
        const telefono = document.getElementById('cliente-telefono')?.value;
        
        if (!nombre) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
        if (!email) { Swal.showValidationMessage('El correo es obligatorio'); return false; }
        if (!telefono) { Swal.showValidationMessage('El teléfono es obligatorio'); return false; }
        
        return {
            tipoCliente: 'no',
            nombre: nombre,
            email: email,
            telefono: telefono,
            empresa: document.getElementById('cliente-empresa')?.value || null,
            ruc: null,
            ubicacionProyecto: document.getElementById('ubicacion-proyecto')?.value || null,
            requiereEnvio: document.getElementById('requiere-envio')?.value || 'no',
            observaciones: document.getElementById('observaciones')?.value || null
        };
    }
}

// ==================== FUNCIONES DE MODALES PERSONALIZADOS ====================
function mostrarModal(titulo, mensaje, tipo = 'info', opciones = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalPersonalizado');
        
        // Si el modal no existe, crearlo dinámicamente
        if (!modal) {
            crearModalPersonalizado();
            return mostrarModal(titulo, mensaje, tipo, opciones);
        }
        
        const icon = document.getElementById('modalIcon');
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');
        const footer = document.getElementById('modalFooter');
        
        // Configurar icono según tipo
        let icono = 'fas fa-info-circle';
        let colorIcono = '#3b82f6';
        
        switch(tipo) {
            case 'success':
                icono = 'fas fa-check-circle';
                colorIcono = '#10b981';
                break;
            case 'error':
                icono = 'fas fa-times-circle';
                colorIcono = '#dc3545';
                break;
            case 'warning':
                icono = 'fas fa-exclamation-triangle';
                colorIcono = '#f59e0b';
                break;
            case 'question':
                icono = 'fas fa-question-circle';
                colorIcono = 'var(--primary)';
                break;
            default:
                icono = 'fas fa-info-circle';
                colorIcono = '#3b82f6';
        }
        
        icon.className = icono;
        icon.style.color = colorIcono;
        titleEl.textContent = titulo;
        bodyEl.innerHTML = mensaje;
        
        // Configurar botones
        const tieneCancelar = opciones.showCancelButton === true;
        const confirmText = opciones.confirmButtonText || 'Aceptar';
        const cancelText = opciones.cancelButtonText || 'Cancelar';
        
        if (tieneCancelar) {
            footer.innerHTML = `
                <button id="modalBtnCancel" class="btn-modal-secondary">${cancelText}</button>
                <button id="modalBtnConfirm" class="btn-modal-primary">${confirmText}</button>
            `;
        } else {
            footer.innerHTML = `<button id="modalBtnConfirm" class="btn-modal-${tipo === 'success' ? 'success' : tipo === 'warning' ? 'warning' : 'primary'}">${confirmText}</button>`;
        }
        
        const nuevoBtnConfirm = document.getElementById('modalBtnConfirm');
        const btnCancel = document.getElementById('modalBtnCancel');
        
        const cerrar = (resultado) => {
            modal.classList.remove('active');
            resolve(resultado);
        };
        
        nuevoBtnConfirm.onclick = () => cerrar({ isConfirmed: true });
        if (btnCancel) btnCancel.onclick = () => cerrar({ isConfirmed: false });
        
        modal.onclick = (e) => {
            if (e.target === modal) cerrar({ isConfirmed: false });
        };
        
        modal.classList.add('active');
        
        if (opciones.timer) {
            setTimeout(() => {
                if (modal.classList.contains('active')) {
                    cerrar({ isConfirmed: true });
                }
            }, opciones.timer);
        }
    });
}

function crearModalPersonalizado() {
    if (document.getElementById('modalPersonalizado')) return;
    
    const modalHtml = `
    <div id="modalPersonalizado" class="modal-overlay">
        <div class="modal-custom">
            <div class="modal-custom-header" id="modalHeader">
                <i id="modalIcon" class="fas fa-info-circle"></i>
                <h3 id="modalTitle">Título</h3>
            </div>
            <div class="modal-custom-body" id="modalBody">
                Mensaje del modal
            </div>
            <div class="modal-custom-footer" id="modalFooter">
                <button id="modalBtnConfirm" class="btn-modal-primary">Aceptar</button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function mostrarLoadingModal(mensaje = 'Procesando...') {
    const modal = document.getElementById('modalPersonalizado');
    if (!modal) crearModalPersonalizado();
    
    const icon = document.getElementById('modalIcon');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    
    icon.className = 'fas fa-spinner fa-spin';
    icon.style.color = 'var(--primary)';
    titleEl.textContent = 'Procesando';
    bodyEl.innerHTML = `<p>${mensaje}</p><p class="text-sm text-gray-400 mt-2">Por favor espera...</p>`;
    footer.innerHTML = '';
    
    modal.classList.add('active');
}

function cerrarLoadingModal() {
    const modal = document.getElementById('modalPersonalizado');
    if (modal) modal.classList.remove('active');
}

// ============================================
// FUNCIONES AUXILIARES PARA EL HERO MEJORADO
// ============================================

// 1. Obtener badges del producto
function obtenerBadgesHero(producto, esPiedraNatural) {
    const badges = [];
    
    // Badge de categorías especiales
    if (producto.categorias_especiales && producto.categorias_especiales.length > 0) {
        if (producto.categorias_especiales.includes('OUTLET')) {
            badges.push({ 
                tipo: 'outlet', 
                texto: '🔥 OUTLET', 
                clase: 'badge-outlet' 
            });
        }
        if (producto.categorias_especiales.includes('SALDOS_EXPORTACION')) {
            badges.push({ 
                tipo: 'saldos', 
                texto: '📦 SALDOS', 
                clase: 'badge-saldos' 
            });
        }
    }
    
    // Badge de calidad
    if (producto.calidad?.nombre) {
        const calidad = producto.calidad.nombre.toLowerCase();
        if (calidad.includes('premium') || calidad.includes('excelente')) {
            badges.push({ 
                tipo: 'premium', 
                texto: '⭐ Premium', 
                clase: 'badge-premium' 
            });
        } else if (calidad.includes('primera')) {
            badges.push({ 
                tipo: 'primera', 
                texto: '🏆 Primera Calidad', 
                clase: 'badge-primera' 
            });
        }
    }
    
    // Badge de piedra natural
    if (esPiedraNatural) {
        badges.push({ 
            tipo: 'natural', 
            texto: '🪨 Piedra Natural', 
            clase: 'badge-natural' 
        });
    }
    
    return badges;
}

// 2. Obtener especificaciones rápidas
function obtenerEspecificacionesRapidas(producto) {
    const specs = [];
    
    if (producto.medida) {
        specs.push({
            icono: 'fa-ruler-combined',
            texto: producto.medida,
            label: 'Medida'
        });
    }
    
    if (producto.espesor) {
        specs.push({
            icono: 'fa-arrows-alt-h',
            texto: producto.espesor,
            label: 'Espesor'
        });
    }
    
    if (producto.familia?.nombre) {
        specs.push({
            icono: 'fa-layer-group',
            texto: producto.familia.nombre,
            label: 'Familia'
        });
    }
    
    if (producto.acabado?.nombre) {
        specs.push({
            icono: 'fa-palette',
            texto: producto.acabado.nombre,
            label: 'Acabado'
        });
    }
    
    // Limitar a 4 items
    return specs.slice(0, 4);
}

// 3. Obtener indicadores de confianza
function obtenerIndicadoresConfianza(producto) {
    const indicadores = [
        { icono: 'fa-check-circle', texto: 'Stock disponible', clase: 'trust-stock' }
    ];
    
    if (producto.ficha_tecnica_url) {
        indicadores.push({ 
            icono: 'fa-file-pdf', 
            texto: 'Ficha técnica', 
            clase: 'trust-ficha' 
        });
    }
    
    if (producto.categorias_especiales && producto.categorias_especiales.length > 0) {
        indicadores.push({ 
            icono: 'fa-tags', 
            texto: 'Precios especiales', 
            clase: 'trust-oferta' 
        });
    }
    
    indicadores.push({ 
        icono: 'fa-truck', 
        texto: 'Envío a todo el país', 
        clase: 'trust-envio' 
    });
    indicadores.push({ 
        icono: 'fa-shield-alt', 
        texto: 'Garantía de calidad', 
        clase: 'trust-garantia' 
    });
    
    return indicadores;
}

// ==================== RENDERIZAR LANDING PAGE PRODUCTO ====================
function renderizarLandingProducto(producto) {
    console.log('🎨 Renderizando landing page para:', producto.nombre);
    
    // ========== CONSTANTES ==========
    const FOTOS_POR_CARGA = 3;
    
    // ========== FUNCIÓN PARA OPTIMIZAR URLs DE GOOGLE DRIVE ==========
    function optimizarGoogleDriveUrl(url) {
        if (!url || url === '') return 'FOTO/foto_04.webp';
        
        try {
            if (url.includes('lh3.googleusercontent.com')) {
                return url;
            }
            
            let fileId = null;
            
            let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                fileId = match[1];
            }
            
            if (!fileId) {
                match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    fileId = match[1];
                }
            }
            
            if (!fileId) {
                match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    fileId = match[1];
                }
            }
            
            if (fileId) {
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
            
            return url;
            
        } catch(e) {
            console.warn('Error al procesar URL:', url, e);
            return 'FOTO/foto_04.webp';
        }
    }
    
    // ========== FLAGS DEL PRODUCTO ==========
    const esPiedraNatural = producto.es_piedra_natural === true;
    const mostrarNotaNatural = producto.mostrar_nota_natural === true;
    const mostrarCaracteristicas = producto.mostrar_caracteristicas === true;
    const mostrarVariaciones = producto.mostrar_variaciones === true;
    
    console.log('🏷️ Flags del producto:', { 
        esPiedraNatural, 
        mostrarNotaNatural, 
        mostrarCaracteristicas,
        mostrarVariaciones 
    });
    
    // ========== OBTENER DATOS CON LAS URLs CORREGIDAS ==========
    const imagenPrincipal = optimizarGoogleDriveUrl(producto.imagen_principal);
    
    const galeriaImagenes = (producto.galeria && producto.galeria.length > 0) 
        ? producto.galeria.map(img => optimizarGoogleDriveUrl(img))
        : [];
    
    const rangosArray = (producto.rangos && producto.rangos.length > 0) 
        ? producto.rangos.map(img => optimizarGoogleDriveUrl(img))
        : [];
    
    const variacionesArray = (producto.variaciones && producto.variaciones.length > 0) 
        ? producto.variaciones.map(img => optimizarGoogleDriveUrl(img))
        : [];
    
    const patronesArray = (producto.patrones_instalacion && producto.patrones_instalacion.length > 0) 
        ? producto.patrones_instalacion.map(img => optimizarGoogleDriveUrl(img))
        : [];
    
    const tieneGaleria = galeriaImagenes.length > 0;
    const tieneRangos = esPiedraNatural && rangosArray.length > 0;
    const tieneVariaciones = mostrarVariaciones && variacionesArray.length > 0;
    const tienePatrones = patronesArray.length > 0;
    const tieneAplicaciones = producto.aplicaciones && producto.aplicaciones.length > 0;
    
    const galeriaInicial = galeriaImagenes.slice(0, FOTOS_POR_CARGA);
    const rangosIniciales = tieneRangos ? rangosArray.slice(0, FOTOS_POR_CARGA) : [];
    const variacionesIniciales = tieneVariaciones ? variacionesArray.slice(0, FOTOS_POR_CARGA) : [];
    const patronesIniciales = tienePatrones ? patronesArray.slice(0, FOTOS_POR_CARGA) : [];
    
    const nombrePartes = producto.nombre.split(' ');
    const primeraPalabra = nombrePartes[0];
    const restoPalabras = nombrePartes.slice(1).join(' ');
    
    // ========== MODALES ==========
    // Modal para galería de inspiración
    const modalGaleriaHtml = `
        <div id="modalGaleria" class="modal-galeria">
            <div class="modal-galeria-content">
                <div class="modal-galeria-header">
                    <h3><i class="fas fa-images"></i> Galería de Inspiración - ${producto.nombre}</h3>
                    <button class="modal-galeria-close">&times;</button>
                </div>
                <div class="modal-galeria-body" id="modalGaleriaBody"></div>
            </div>
        </div>
        
        <div id="zoomModalGaleria" class="image-modal">
            <div class="modal-content">
                <div class="modal-close">✕</div>
                <div class="modal-prev" id="zoomGaleriaPrev">❮</div>
                <div class="modal-next" id="zoomGaleriaNext">❯</div>
                <img id="zoomGaleriaImage" src="" alt="Imagen ampliada">
                <div id="zoomGaleriaCounter" class="modal-counter">1 / 1</div>
            </div>
        </div>
    `;
    
    // Modal para rangos
    const modalRangosHtml = tieneRangos ? `
        <div id="modalRangos" class="modal-galeria">
            <div class="modal-galeria-content">
                <div class="modal-galeria-header">
                    <h3><i class="fas fa-palette"></i> Rangos y Variaciones - ${producto.nombre}</h3>
                    <button class="modal-rangos-close">&times;</button>
                </div>
                <div class="modal-galeria-body" id="modalRangosBody"></div>
            </div>
        </div>
        
        <div id="zoomModalRangos" class="image-modal">
            <div class="modal-content">
                <div class="modal-close">✕</div>
                <div class="modal-prev" id="zoomRangosPrev">❮</div>
                <div class="modal-next" id="zoomRangosNext">❯</div>
                <img id="zoomRangosImage" src="" alt="Imagen ampliada">
                <div id="zoomRangosCounter" class="modal-counter">1 / 1</div>
            </div>
        </div>
    ` : '';
    
    // Modal para variaciones disponibles
    const modalVariacionesHtml = tieneVariaciones ? `
        <div id="modalVariaciones" class="modal-galeria">
            <div class="modal-galeria-content">
                <div class="modal-galeria-header">
                    <h3><i class="fas fa-swatchbook"></i> Variaciones Disponibles - ${producto.nombre}</h3>
                    <button class="modal-variaciones-close">&times;</button>
                </div>
                <div class="modal-galeria-body" id="modalVariacionesBody"></div>
            </div>
        </div>
        
        <div id="zoomModalVariaciones" class="image-modal">
            <div class="modal-content">
                <div class="modal-close">✕</div>
                <div class="modal-prev" id="zoomVariacionesPrev">❮</div>
                <div class="modal-next" id="zoomVariacionesNext">❯</div>
                <img id="zoomVariacionesImage" src="" alt="Imagen ampliada">
                <div id="zoomVariacionesCounter" class="modal-counter">1 / 1</div>
            </div>
        </div>
    ` : '';
    
    // Modal para patrones de instalación
    const modalPatronesHtml = tienePatrones ? `
        <div id="modalPatrones" class="modal-galeria">
            <div class="modal-galeria-content">
                <div class="modal-galeria-header">
                    <h3><i class="fas fa-th"></i> Patrones de Instalación - ${producto.nombre}</h3>
                    <button class="modal-patrones-close">&times;</button>
                </div>
                <div class="modal-galeria-body" id="modalPatronesBody"></div>
            </div>
        </div>
        
        <div id="zoomModalPatrones" class="image-modal">
            <div class="modal-content">
                <div class="modal-close">✕</div>
                <div class="modal-prev" id="zoomPatronesPrev">❮</div>
                <div class="modal-next" id="zoomPatronesNext">❯</div>
                <img id="zoomPatronesImage" src="" alt="Imagen ampliada">
                <div id="zoomPatronesCounter" class="modal-counter">1 / 1</div>
            </div>
        </div>
    ` : '';
    
    // Modal de zoom principal para imagen hero
    const modalZoomPrincipalHtml = `
        <div id="zoomModalPrincipal" class="image-modal">
            <div class="modal-content">
                <div class="modal-close">✕</div>
                <img id="zoomPrincipalImage" src="" alt="Imagen ampliada">
            </div>
        </div>
    `;
    
    // ========== OBTENER DATOS PARA EL HERO ==========

    // Especificaciones rápidas (3 items como máximo)
    const especificacionesRapidas = [
        { icono: 'fa-ruler-combined', texto: producto.medida || 'N/A', label: 'Medida' },
        { icono: 'fa-arrows-alt-h', texto: producto.espesor || 'N/A', label: 'Espesor' },
        { icono: 'fa-layer-group', texto: producto.familia?.nombre || 'N/A', label: 'Familia' }
    ].filter(spec => spec.texto !== 'N/A').slice(0, 3);

    // Descripción extendida
    const descripcionHero = producto.descripcion_corta || 
        'Descubre la belleza y elegancia de este producto, diseñado para transformar tus espacios con estilo y calidad.';
    
    // Verificar si hay contenido después del Hero
    const haySeccionesDespues = tieneGaleria || tieneRangos || tieneVariaciones || tienePatrones || tieneAplicaciones;

    // ========== GENERAR HTML DE ESPECIFICACIONES ==========
    const specsHtml = especificacionesRapidas.map(spec => `
        <div class="spec-item">
            <i class="fas ${spec.icono}"></i>
            <span>${spec.texto}</span>
        </div>
    `).join('');

    // ========== HERO OPTIMIZADO CON INDICADOR DE SCROLL ==========
    const heroHtml = `
        <section class="hero">
            <div class="container hero-content">
                <!-- COLUMNA IZQUIERDA -->
                <div class="hero-text">
                    <h1>${primeraPalabra} <span>${restoPalabras}</span></h1>
                    <p class="hero-description">${descripcionHero}</p>
                    
                    <div class="hero-buttons">
                        <a href="#galeria" class="btn btn-primary">Ver Inspiración</a>
                    </div>
                    
                    ${specsHtml ? `<div class="hero-specs">${specsHtml}</div>` : ''}
                </div>
                
                <!-- COLUMNA DERECHA -->
                <div class="hero-image-wrapper">
                    <div class="hero-image">
                        <img src="${imagenPrincipal}" 
                            alt="${producto.nombre}" 
                            loading="eager" 
                            onerror="this.src='FOTO/foto_04.webp'" 
                            id="heroImage"
                            data-index="0">
                        <button class="zoom-btn-hero" id="heroZoomBtn" data-index="0">
                            <i class="fas fa-search-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- INDICADOR DE SCROLL -->
            ${haySeccionesDespues ? `
                <div class="scroll-indicator" id="scrollIndicator">
                    <span class="scroll-text">Desliza para descubrir</span>
                    <div class="scroll-mouse">
                        <span class="scroll-wheel"></span>
                    </div>
                    <div class="scroll-arrows">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            ` : ''}
        </section>
    `;
        
    // ========== GENERAR HTML DE GALERÍA ==========
    let galeriaHtml = '';
    if (tieneGaleria) {
        galeriaHtml = `
            <section class="gallery-section" id="galeria">
                <div class="container">
                    <div class="section-title">
                        <h2>Inspiración y Diseño</h2>
                        <p>Visualiza cómo se transforma cada ambiente</p>
                    </div>
                    <div class="gallery-grid" id="galleryGrid">
                        ${galeriaInicial.map((img, i) => {
                            return `
                                <div class="galeria-item">
                                    <img src="${img}" alt="${producto.nombre} - Imagen ${i+1}" 
                                         loading="lazy" 
                                         onerror="this.src='FOTO/foto_04.webp'" 
                                         data-galeria-index="${i}">
                                    <button class="zoom-btn-galeria-inicial" data-galeria-index="${i}">
                                        <i class="fas fa-search-plus"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${galeriaImagenes.length > FOTOS_POR_CARGA ? `
                        <div class="ver-mas-container text-center">
                            <button class="btn-ver-mas" id="verTodaGaleriaBtn">
                                <i class="fas fa-images"></i> Ver todas las imágenes de inspiración (${galeriaImagenes.length})
                            </button>
                        </div>
                    ` : ''}
                </div>
            </section>
        `;
    }
    
    // ========== GENERAR HTML DE RANGOS ==========
    let rangosHtml = '';
    if (tieneRangos) {
        rangosHtml = `
            <section class="rangos-section">
                <div class="container">
                    <div class="section-title">
                        <h2>Rangos y Variaciones Naturales</h2>
                        <p>Diferentes vetas y tonalidades que puede presentar el producto</p>
                    </div>
                    <div class="aviso-variabilidad">
                        <div class="aviso-flex">
                            <i class="fas fa-info-circle"></i>
                            <div>
                                <strong>IMPORTANTE: VARIABILIDAD NATURAL</strong>
                                <p>Las imágenes mostradas son EJEMPLOS de la variabilidad natural que PUEDE presentar el producto. Al tratarse de piedra natural, no podemos garantizar que el producto final sea idéntico a las muestras mostradas.</p>
                            </div>
                        </div>
                    </div>
                    <div class="rangos-grid" id="rangosGrid">
                        ${rangosIniciales.map((img, i) => {
                            return `
                                <div class="rango-item">
                                    <img src="${img}" alt="${producto.nombre} - Variación ${i+1}" 
                                         loading="lazy" 
                                         onerror="this.src='FOTO/foto_04.webp'" 
                                         data-rango-index="${i}">
                                    <button class="zoom-btn-rango-inicial" data-rango-index="${i}">
                                        <i class="fas fa-search-plus"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${rangosArray.length > FOTOS_POR_CARGA ? `
                        <div class="ver-mas-container text-center">
                            <button class="btn-ver-mas" id="verTodosRangosBtn">
                                <i class="fas fa-palette"></i> Ver todas las variaciones (${rangosArray.length})
                            </button>
                        </div>
                    ` : ''}
                </div>
            </section>
        `;
    }
    
    // ========== GENERAR HTML DE VARIACIONES DISPONIBLES ==========
    let variacionesHtml = '';
    if (tieneVariaciones) {
        variacionesHtml = `
            <section class="variaciones-section">
                <div class="container">
                    <div class="section-title">
                        <h2>Variaciones Disponibles</h2>
                        <p>Diferentes tonos y acabados que ofrece el producto</p>
                    </div>
                    <div class="variaciones-grid" id="variacionesGrid">
                        ${variacionesIniciales.map((img, i) => {
                            return `
                                <div class="variacion-item">
                                    <img src="${img}" alt="${producto.nombre} - Variación ${i+1}" 
                                         loading="lazy" 
                                         onerror="this.src='FOTO/foto_04.webp'" 
                                         data-variacion-index="${i}">
                                    <button class="zoom-btn-variacion-inicial" data-variacion-index="${i}">
                                        <i class="fas fa-search-plus"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${variacionesArray.length > FOTOS_POR_CARGA ? `
                        <div class="ver-mas-container text-center">
                            <button class="btn-ver-mas" id="verTodasVariacionesBtn">
                                <i class="fas fa-swatchbook"></i> Ver todas las variaciones (${variacionesArray.length})
                            </button>
                        </div>
                    ` : ''}
                </div>
            </section>
        `;
    }
    
    // ========== GENERAR HTML DE PATRONES DE INSTALACIÓN ==========
    let patronesHtml = '';
    if (tienePatrones) {
        patronesHtml = `
            <section class="patrones-section">
                <div class="container">
                    <div class="section-title">
                        <h2>Patrones de Instalación</h2>
                        <p>Inspírate con diferentes formas de instalar el producto</p>
                    </div>
                    <div class="patrones-grid" id="patronesGrid">
                        ${patronesIniciales.map((img, i) => {
                            return `
                                <div class="patron-item">
                                    <img src="${img}" alt="${producto.nombre} - Patrón ${i+1}" 
                                         loading="lazy" 
                                         onerror="this.src='FOTO/foto_04.webp'" 
                                         data-patron-index="${i}">
                                    <button class="zoom-btn-patron-inicial" data-patron-index="${i}">
                                        <i class="fas fa-search-plus"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${patronesArray.length > FOTOS_POR_CARGA ? `
                        <div class="ver-mas-container text-center">
                            <button class="btn-ver-mas" id="verTodosPatronesBtn">
                                <i class="fas fa-th"></i> Ver todos los patrones (${patronesArray.length})
                            </button>
                        </div>
                    ` : ''}
                </div>
            </section>
        `;
    }
    
    // ========== CARACTERÍSTICAS COMERCIALES ==========
    const caracteristicasComercialHtml = mostrarCaracteristicas ? `
        <section class="caracteristicas-section">
            <div class="container">
                <div class="section-title">
                    <h2>Características del Material Comercial</h2>
                    <p>Información importante sobre las particularidades de la piedra natural</p>
                </div>
                <div class="caracteristicas-grid">
                    <div class="caracteristica-card">
                        <i class="fas fa-border-all"></i>
                        <h3>Esquinas Postilladas</h3>
                        <p>Las piezas pueden presentar esquinas postilladas o desportilladuras leves en los bordes, lo cual es normal en materiales pétreos.</p>
                    </div>
                    <div class="caracteristica-card">
                        <i class="fas fa-cut"></i>
                        <h3>Marcas del Disco</h3>
                        <p>Es posible encontrar marcas del disco de corte en la superficie durante el procesamiento del material.</p>
                    </div>
                    <div class="caracteristica-card">
                        <i class="fas fa-water"></i>
                        <h3>Cangrejera Superficial</h3>
                        <p>La cara de las baldosas puede presentar cangrejera (pequeñas imperfecciones superficiales) características del material.</p>
                    </div>
                    <div class="caracteristica-card">
                        <i class="fas fa-palette"></i>
                        <h3>Rango de Color Variado</h3>
                        <p>El rango de color es variado y puede ser más pronunciado entre diferentes lotes de producción.</p>
                    </div>
                </div>
            </div>
        </section>
    ` : '';
    
    // ========== APLICACIONES ==========
    let aplicacionesHtml = '';
    if (tieneAplicaciones) {
        aplicacionesHtml = `
            <section>
                <div class="container">
                    <div class="section-title">
                        <h2>Aplicaciones del Producto</h2>
                        <p>Diseñado para espacios elegantes y modernos</p>
                    </div>
                    <div class="apps-grid">
                        ${producto.aplicaciones.map(app => `
                            <div class="app-card">
                                <i class="fas ${app.icono || 'fa-star'}"></i>
                                <h3>${app.nombre}</h3>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }
    
    // ========== BANNER ADVERTENCIA ==========
    let bannerAdvertencia = '';
    if (producto.es_piedra_natural !== undefined) {
        const textoAviso = esPiedraNatural 
            ? 'Las imágenes son referenciales. La piedra natural presenta variaciones en vetas, tonos y textura. Solicita una muestra física antes de tu pedido.'
            : 'Las imágenes son referenciales. Los colores y acabados pueden variar ligeramente según la configuración de tu pantalla. Te recomendamos solicitar una muestra física.';
        
        bannerAdvertencia = `
            <div class="aviso-sticky">
                <div class="container">
                    <div class="aviso-flex-center">
                        <span><strong>IMPORTANTE:</strong> ${textoAviso}</span>
                        ${esPiedraNatural ? '<a href="#nota-natural">Más información</a>' : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // ========== ANTES DE COMPRAR ==========
    const antesDeComprarHtml = esPiedraNatural ? `
        <section class="antes-comprar-section">
            <div class="container">
                <div class="section-title">
                    <h2>Lo que debes saber antes de comprar</h2>
                    <p>Información clave para tu decisión de compra</p>
                </div>
                <div class="antes-comprar-grid">
                    <div class="info-item"><span>Las imágenes son REFERENCIALES, no contractuales</span></div>
                    <div class="info-item"><span>La piedra natural presenta variabilidad en vetas y tonos</span></div>
                    <div class="info-item"><span>No se puede seleccionar una veta o tonalidad específica</span></div>
                    <div class="info-item"><span>Solicita una muestra física antes de tu pedido</span></div>
                    <div class="info-item"><span>El producto final puede diferir de las muestras mostradas</span></div>
                    <div class="info-item"><span>Las variaciones son características de calidad, no defectos</span></div>
                </div>
            </div>
        </section>
    ` : `
        <section class="antes-comprar-section">
            <div class="container">
                <div class="section-title">
                    <h2>Lo que debes saber antes de comprar</h2>
                    <p>Información clave para tu decisión de compra</p>
                </div>
                <div class="antes-comprar-grid">
                    <div class="info-item"><span>Las imágenes son REFERENCIALES, no contractuales</span></div>
                    <div class="info-item"><span>Los colores pueden variar ligeramente según lote de producción</span></div>
                    <div class="info-item"><span>Solicita una muestra física antes de tu pedido</span></div>
                    <div class="info-item"><span>El producto final puede diferir ligeramente de las imágenes</span></div>
                    <div class="info-item"><span>Las dimensiones pueden tener tolerancias de fabricación</span></div>
                </div>
            </div>
        </section>
    `;
    
    // ========== ESPECIFICACIONES ==========
    const especificacionesConTooltips = [
        { titulo: 'Código', valor: producto.codigo || 'NO ESPECIFICADO', tooltip: 'Código de identificación del producto' },
        { titulo: 'Unidad de Medida', valor: producto.unidad_medida?.nombre || 'NO ESPECIFICADA', tooltip: 'Unidad de medida en la que se comercializa el producto' },
        { titulo: 'Calidad', valor: producto.calidad?.nombre || 'NO ESPECIFICADA', tooltip: 'Calidad del producto' },
        { titulo: 'Modelo', valor: producto.modelo || 'NO ESPECIFICADO', tooltip: 'Modelo del producto' },
        { titulo: 'Familia', valor: producto.familia?.nombre || 'NO ESPECIFICADA', tooltip: 'Familia a la que pertenece el producto' },
        { titulo: 'Acabado', valor: producto.acabado?.nombre || 'NO ESPECIFICADO', tooltip: 'Acabado del producto' },
        { titulo: 'Borde', valor: producto.borde?.nombre || 'NO ESPECIFICADO', tooltip: 'Borde del producto' },
        { titulo: 'Material', valor: producto.material?.nombre || 'NO ESPECIFICADO', tooltip: 'Material del producto' },
        { titulo: 'Medida', valor: producto.medida || 'NO ESPECIFICADA', tooltip: 'Dimensiones del producto' },
        { titulo: 'Espesor', valor: producto.espesor || 'NO ESPECIFICADO', tooltip: 'Grosor del producto' }
    ];
    
    // ========== FICHA TÉCNICA ==========
    const fichaUrl = producto.ficha_tecnica_url ? optimizarGoogleDriveUrl(producto.ficha_tecnica_url) : null;
    const fichaHtml = fichaUrl ? `
        <div class="ficha-section">
            <div class="container text-center">
                <a href="${fichaUrl}" download class="btn-ficha" id="btnDescargarFicha">
                    <i class="fas fa-file-pdf"></i> Descargar Ficha Técnica
                </a>
            </div>
        </div>
    ` : '';
    
    // ========== NOTA INFORMATIVA ==========
    const notaInformativaHtml = mostrarNotaNatural ? `
        <section class="nota-section" id="nota-natural">
            <div class="container">
                <div class="nota-card">
                    <div class="nota-icon"><i class="fas fa-info-circle"></i></div>
                    <div class="nota-content">
                        <h3>Nota sobre la variabilidad natural de la piedra</h3>
                        <p>Debido a su naturaleza, las piedras naturales como mármoles, travertinos, granitos y otras, poseen grados de variación en tono y color, diferencias en la formación de vetas y distintos niveles de porosidad. Por este motivo, los tonos y características de las muestras exhibidas y/o entregadas, son referenciales y pueden variar.</p>
                        <p><strong>Características del material comercial:</strong> Las piezas pueden presentar esquinas postilladas, marcas del disco de corte, cangrejera superficial en la cara de la baldosa, y rango de color variado (más pronunciado entre lotes). Estas son características normales de los materiales pétreos y no constituyen defectos.</p>
                        <p><strong>IMPORTANTE:</strong> Las imágenes de rangos y variaciones mostradas son EJEMPLOS de la variabilidad natural que PUEDE presentar el producto. NO es posible seleccionar una veta o tonalidad específica al momento de la compra.</p>
                        <p>Para mayor certeza, recomendamos solicitar una muestra física antes de realizar su pedido.</p>
                    </div>
                </div>
            </div>
        </section>
    ` : '';
    
    // ========== BOTÓN FLOTANTE SOLO SUBIR ==========
    const botonFlotante = `
        <div class="floating-buttons">
            <button class="floating-btn floating-top" id="floatingTopBtn">
                <i class="fas fa-arrow-up"></i>
                <span class="floating-tooltip">Subir</span>
            </button>
        </div>
    `;
    
    // ========== SEO META TAGS ==========
    const metaTags = `
        <meta name="description" content="${producto.descripcion_corta || 'Piedra natural de alta calidad para arquitectura y diseño.'}">
        <meta property="og:title" content="${producto.nombre} | GALLOS MÁRMOL">
        <meta property="og:description" content="${producto.descripcion_corta || 'Descubre la elegancia de la piedra natural.'}">
        <meta property="og:image" content="${imagenPrincipal}">
        <meta property="og:type" content="product">
        <meta name="twitter:card" content="summary_large_image">
    `;
    
    // ========== SCHEMA MARKUP ==========
    const schemaMarkup = `
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "${producto.nombre.replace(/"/g, '\\"')}",
            "description": "${(producto.descripcion_corta || '').replace(/"/g, '\\"')}",
            "image": "${imagenPrincipal}",
            "sku": "${producto.codigo || ''}",
            "brand": {"@type": "Brand", "name": "GALLOS MÁRMOL"}
        }
        <\/script>
    `;
    
    // ========== PRELOAD ==========
    const preloadHtml = `
        <link rel="preload" as="image" href="${imagenPrincipal}">
    `;
    
    // ========== HTML COMPLETO ==========
    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover">
        <title>${producto.nombre} | GALLOS MÁRMOL</title>
        ${metaTags}
        ${schemaMarkup}
        ${preloadHtml}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            :root {
                --primary: #6b0000;
                --primary-dark: #2a0607;
                --secondary: #d4d4ae;
                --white: #ffffff;
                --gray-100: #f5f5f5;
                --gray-600: #666666;
                --gray-700: #444444;
                --gray-800: #222222;
                --shadow-sm: 0 2px 8px rgba(0,0,0,0.05);
                --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
                --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
                --border-radius: 16px;
                --border-radius-sm: 12px;
            }
            .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px; }
            .text-center { text-align: center; }
            body { font-family: 'Poppins', sans-serif; background: var(--white); overflow-x: hidden; color: var(--gray-800); }
            .section-title { text-align: center; margin-bottom: 32px; }
            .section-title h2 { font-size: 1.5rem; color: var(--primary); margin-bottom: 8px; }
            .section-title p { font-size: 0.85rem; color: var(--gray-600); max-width: 600px; margin: 0 auto; }
            header { position: fixed; top: 0; left: 0; right: 0; background: var(--primary); z-index: 1000; padding: 10px 0; box-shadow: var(--shadow-sm); }
            .navbar {
                display: flex;
                justify-content: center; /* Centra el logo */
                align-items: center;
                padding: 8px 16px;
                position: relative;
            }

            .logo {
                flex: 0 1 auto;
            }

            .logo a {
                display: inline-block;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .logo a:hover {
                transform: scale(1.03);
                opacity: 0.9;
            }

            .logo a:active {
                transform: scale(0.95);
            }

            .logo img {
                width: 200px;
                height: auto;
                display: block;
            }

            .aviso-sticky { background: #fff3cd; border-bottom: 1px solid #ffeeba; padding: 10px 0; position: sticky; top: 110px; z-index: 99; }
            .aviso-flex-center { display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; font-size: 0.75rem; color: #856404; }
            .aviso-flex-center a { color: #856404; text-decoration: underline; }
            
            /* ============================================ */
            /* HERO CON INDICADOR DE SCROLL */
            /* ============================================ */
            
            .hero {
                min-height: 85vh;
                display: flex;
                align-items: center;
                background: linear-gradient(135deg, rgba(57,8,10,0.92), rgba(57,8,10,0.88));
                padding: 100px 0 80px;
                position: relative;
                overflow: hidden;
            }
            
            .hero::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 80px;
                background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.03));
                pointer-events: none;
                z-index: 1;
            }
            
            .hero-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 30px;
                width: 100%;
                position: relative;
                z-index: 2;
            }
            
            .hero-text {
                text-align: center;
                width: 100%;
                order: 2;
            }
            
            .hero h1 {
                font-size: 1.8rem;
                color: var(--white);
                margin-bottom: 10px;
                line-height: 1.2;
            }
            
            .hero h1 span {
                color: var(--secondary);
            }
            
            .hero-description {
                color: rgba(255,255,255,0.9);
                font-size: 0.9rem;
                line-height: 1.6;
                max-width: 500px;
                margin: 0 auto 18px;
                padding: 0 4px;
            }
            
            .hero-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .btn {
                padding: 12px 24px;
                border-radius: 40px;
                font-weight: 600;
                font-size: 0.85rem;
                text-decoration: none;
                display: inline-block;
                text-align: center;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                width: 100%;
                max-width: 280px;
            }
            
            .btn-primary {
                background: var(--secondary);
                color: var(--primary);
            }
            
            .btn-primary:hover {
                background: var(--secondary);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(212, 212, 174, 0.3);
            }
            
            .btn-secondary {
                border: 2px solid var(--secondary);
                color: var(--secondary);
                background: transparent;
            }
            
            .btn-secondary:hover {
                background: var(--secondary);
                color: var(--primary);
                transform: translateY(-2px);
            }
            
            .hero-specs {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-top: 10px;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .spec-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                background: rgba(255,255,255,0.08);
                backdrop-filter: blur(10px);
                padding: 10px 6px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.06);
                text-align: center;
            }
            
            .spec-item i {
                color: var(--secondary);
                font-size: 1rem;
            }
            
            .spec-item span {
                font-size: 0.7rem;
                color: white;
                font-weight: 500;
                line-height: 1.2;
                word-break: break-word;
            }
            
            .hero-image-wrapper {
                order: 1;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .hero-image {
                position: relative;
                width: 100%;
                max-width: 340px;
                aspect-ratio: 4 / 3;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }
            
            .hero-image img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
            }
            
            .hero-image .zoom-btn-hero {
                position: absolute;
                bottom: 12px;
                right: 12px;
                background: rgba(0,0,0,0.7);
                color: white;
                border: none;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                z-index: 10;
                backdrop-filter: blur(5px);
            }
            
            .hero-image .zoom-btn-hero:hover {
                background: var(--primary);
                transform: scale(1.1);
            }
            
            /* ============================================ */
            /* INDICADOR DE SCROLL */
            /* ============================================ */
            
            .scroll-indicator {
                position: absolute;
                bottom: 25px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                z-index: 10;
                animation: bounceIndicator 2.5s ease-in-out infinite;
                padding: 10px 20px;
                border-radius: 30px;
                background: rgba(0,0,0,0.15);
                backdrop-filter: blur(5px);
                transition: all 0.3s ease;
            }
            
            .scroll-indicator:hover {
                background: rgba(0,0,0,0.25);
                transform: translateX(-50%) scale(1.05);
            }
            
            .scroll-text {
                font-size: 0.6rem;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 300;
            }
            
            .scroll-mouse {
                width: 22px;
                height: 34px;
                border: 2px solid rgba(255,255,255,0.25);
                border-radius: 12px;
                position: relative;
                display: flex;
                justify-content: center;
            }
            
            .scroll-wheel {
                position: absolute;
                top: 6px;
                width: 3px;
                height: 8px;
                background: rgba(255,255,255,0.4);
                border-radius: 2px;
                animation: scrollWheel 1.8s ease-in-out infinite;
            }
            
            @keyframes scrollWheel {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(16px); }
            }
            
            .scroll-arrows {
                display: none;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            }
            
            .scroll-arrows span {
                display: block;
                width: 12px;
                height: 12px;
                border-right: 2px solid rgba(255,255,255,0.3);
                border-bottom: 2px solid rgba(255,255,255,0.3);
                transform: rotate(45deg);
                opacity: 0;
                animation: scrollArrow 2s ease-in-out infinite;
            }
            
            .scroll-arrows span:nth-child(1) { animation-delay: 0s; }
            .scroll-arrows span:nth-child(2) { animation-delay: 0.15s; }
            .scroll-arrows span:nth-child(3) { animation-delay: 0.3s; }
            
            @keyframes scrollArrow {
                0% { opacity: 0; transform: rotate(45deg) translate(-5px, -5px); }
                50% { opacity: 1; }
                100% { opacity: 0; transform: rotate(45deg) translate(5px, 5px); }
            }
            
            @keyframes bounceIndicator {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                50% { transform: translateX(-50%) translateY(-6px); }
            }
            
            /* ============================================ */
            /* RESPONSIVE HERO */
            /* ============================================ */
            
            @media (min-width: 768px) {
                .hero {
                    min-height: 85vh;
                    padding: 120px 0 90px;
                }
                
                .hero-content {
                    flex-direction: row;
                    align-items: center;
                    gap: 50px;
                    max-width: 1100px;
                    margin: 0 auto;
                }
                
                .hero-text {
                    flex: 1.1;
                    text-align: left;
                    order: 1;
                }
                
                .hero h1 { font-size: 2.4rem; }
                
                .hero-description {
                    margin-left: 0;
                    margin-right: 0;
                    max-width: 90%;
                    font-size: 0.95rem;
                }
                
                .hero-buttons {
                    flex-direction: row;
                    justify-content: flex-start;
                    gap: 12px;
                }
                
                .btn {
                    width: auto;
                    max-width: none;
                    padding: 12px 28px;
                }
                
                .hero-specs {
                    max-width: 90%;
                    margin-left: 0;
                    margin-right: 0;
                    justify-content: flex-start;
                    gap: 10px;
                }
                
                .spec-item {
                    flex-direction: row;
                    gap: 8px;
                    padding: 8px 14px;
                    min-width: 80px;
                }
                
                .spec-item i { font-size: 0.9rem; }
                .spec-item span { font-size: 0.75rem; }
                
                .hero-image-wrapper {
                    flex: 0.9;
                    order: 2;
                    align-items: flex-end;
                }
                
                .hero-image { max-width: 400px; }
                
                .scroll-arrows { display: flex; }
                .scroll-mouse { display: none; }
                .scroll-text { font-size: 0.7rem; }
            }
            
            @media (min-width: 1024px) {
                .hero {
                    min-height: 80vh;
                }
                .hero h1 { font-size: 3rem; }
                .hero-description { font-size: 1rem; }
                .hero-image { max-width: 460px; }
            }
            
            @media (max-width: 480px) {
                .hero h1 { font-size: 1.4rem; }
                .hero-description { font-size: 0.8rem; }
                .hero-specs { grid-template-columns: repeat(3, 1fr); gap: 6px; }
                .spec-item { padding: 8px 4px; }
                .spec-item i { font-size: 0.8rem; }
                .spec-item span { font-size: 0.6rem; }
                .hero-image { max-width: 280px; }
                .scroll-text { font-size: 0.5rem; }
                .scroll-mouse { width: 18px; height: 28px; }
                .scroll-wheel { width: 2px; height: 6px; }
            }
            
            @media (max-width: 380px) {
                .hero-specs { grid-template-columns: repeat(2, 1fr); }
                .hero h1 { font-size: 1.2rem; }
                .hero-description { font-size: 0.75rem; }
            }
            
            section { padding: 50px 0; }
            .specs-section { background: var(--gray-100); }
            .specs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .spec-card { background: var(--white); padding: 16px; border-radius: var(--border-radius-sm); text-align: center; box-shadow: var(--shadow-sm); position: relative; cursor: help; }
            .spec-card h3 { font-size: 0.7rem; color: var(--gray-600); margin-bottom: 5px; text-transform: uppercase; }
            .spec-card p { font-size: 0.85rem; font-weight: 700; color: var(--primary); }
            .tooltip-text { visibility: hidden; width: 180px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 5px 8px; position: absolute; z-index: 1; bottom: 125%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; font-size: 0.7rem; }
            .tooltip-text::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: #333 transparent transparent transparent; }
            .spec-card:hover .tooltip-text { visibility: visible; opacity: 1; }
            .caracteristicas-section { background: #f8f9fa; }
            .caracteristicas-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .caracteristica-card { background: var(--white); padding: 20px; border-radius: var(--border-radius-sm); text-align: center; }
            .caracteristica-card i { font-size: 1.8rem; color: var(--primary); margin-bottom: 10px; display: block; }
            .caracteristica-card h3 { font-size: 0.9rem; margin-bottom: 8px; color: var(--primary); }
            .caracteristica-card p { font-size: 0.8rem; color: var(--gray-600); }
            
            /* Galería */
            .gallery-section, .rangos-section, .variaciones-section, .patrones-section { background: var(--gray-100); }
            .gallery-grid, .rangos-grid, .variaciones-grid, .patrones-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .galeria-item, .rango-item, .variacion-item, .patron-item { position: relative; overflow: hidden; border-radius: var(--border-radius); box-shadow: var(--shadow-sm); aspect-ratio: 4 / 3; cursor: pointer; }
            .galeria-item img, .rango-item img, .variacion-item img, .patron-item img { width: 100%; height: 100%; object-fit: contain; transition: transform 0.4s ease; display: block; }
            .galeria-item:hover img, .rango-item:hover img, .variacion-item:hover img, .patron-item:hover img { transform: scale(1.03); }
            .zoom-btn-galeria-inicial, .zoom-btn-rango-inicial, .zoom-btn-variacion-inicial, .zoom-btn-patron-inicial, .zoom-btn-hero { 
                position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; z-index: 10; 
            }
            .zoom-btn-galeria-inicial:hover, .zoom-btn-rango-inicial:hover, .zoom-btn-variacion-inicial:hover, .zoom-btn-patron-inicial:hover, .zoom-btn-hero:hover { background: var(--primary); transform: scale(1.05); }
            
            .ver-mas-container { margin-top: 25px; }
            .btn-ver-mas { background: var(--primary); color: var(--white); border: none; padding: 12px 24px; border-radius: 40px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px; }
            .btn-ver-mas:hover { background: var(--primary-dark); transform: translateY(-2px); }
            
            .apps-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .app-card { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--white); padding: 20px 12px; border-radius: var(--border-radius-sm); text-align: center; }
            .app-card i { font-size: 1.8rem; color: var(--secondary); margin-bottom: 8px; }
            .app-card h3 { font-size: 0.8rem; font-weight: 500; }
            
            .aviso-variabilidad { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin-bottom: 25px; border-radius: 8px; }
            .aviso-flex { display: flex; gap: 12px; align-items: flex-start; }
            .aviso-flex i { color: #856404; font-size: 1.1rem; margin-top: 2px; }
            .aviso-flex strong { display: block; margin-bottom: 4px; color: #856404; font-size: 0.8rem; }
            .aviso-flex p { margin: 0; font-size: 0.75rem; color: #856404; }
            
            .antes-comprar-section { background: #e8f4f8; }
            .antes-comprar-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
            .info-item { display: flex; gap: 10px; align-items: center; background: var(--white); padding: 12px 15px; border-radius: 10px; font-size: 0.8rem; }
            .info-item i { color: #28a745; font-size: 1.1rem; flex-shrink: 0; }
            
            .trust-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .trust-card { background: var(--gray-100); padding: 20px; border-radius: var(--border-radius-sm); text-align: center; }
            .trust-card i { font-size: 1.8rem; color: var(--primary); margin-bottom: 10px; }
            .trust-card h3 { font-size: 0.9rem; margin-bottom: 6px; color: var(--primary); }
            .trust-card p { font-size: 0.8rem; color: var(--gray-600); }
            
            .ficha-section { background: var(--gray-100); padding: 30px 0; text-align: center; }
            .btn-ficha { background: var(--primary); color: var(--white); padding: 12px 28px; border-radius: 40px; text-decoration: none; display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 0.85rem; transition: all 0.3s ease; }
            .btn-ficha:hover { background: var(--primary-dark); transform: translateY(-2px); }
            
            .nota-section { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 40px 0; }
            .nota-card { background: var(--white); border-radius: 20px; padding: 20px; display: flex; gap: 15px; box-shadow: var(--shadow-sm); border-left: 5px solid var(--primary); }
            .nota-icon { flex-shrink: 0; width: 40px; height: 40px; background: rgba(57,8,10,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .nota-icon i { font-size: 1.2rem; color: var(--primary); }
            .nota-content h3 { font-size: 0.95rem; font-weight: 600; color: var(--primary); margin-bottom: 6px; }
            .nota-content p { font-size: 0.8rem; color: var(--gray-700); line-height: 1.5; margin-bottom: 8px; }
            
            footer { background: var(--primary-dark); color: var(--white); padding: 35px 20px 25px; }
            .footer-grid { display: grid; grid-template-columns: 1fr; gap: 25px; text-align: center; }
            .footer-logo img { width: 120px; margin-bottom: 10px; pointer-events: none; }
            .footer-logo p { font-size: 0.75rem; opacity: 0.7; }
            .footer-social h4, .footer-links h4 { font-size: 0.85rem; margin-bottom: 12px; color: var(--secondary); }
            .footer-social a, .footer-links a { display: flex; align-items: center; justify-content: center; gap: 10px; color: rgba(255,255,255,0.7); text-decoration: none; margin-bottom: 8px; transition: all 0.3s ease; font-size: 0.75rem; }
            .footer-social a:hover, .footer-links a:hover { color: var(--secondary); transform: translateX(5px); }
            .footer-bottom { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.6rem; opacity: 0.6; }
            
            /* Modales */
            .modal-galeria { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.95); z-index: 20000; overflow-y: auto; }
            .modal-galeria.active { display: block; }
            .modal-galeria-content { position: relative; background: var(--white); max-width: 1200px; margin: 40px auto; border-radius: 20px; overflow: hidden; animation: modalFadeIn 0.3s ease; }
            @keyframes modalFadeIn { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
            .modal-galeria-header { background: var(--primary); color: var(--white); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
            .modal-galeria-header h3 { font-size: 1rem; margin: 0; }
            .modal-galeria-header h3 i { margin-right: 8px; }
            .modal-galeria-close, .modal-rangos-close, .modal-variaciones-close, .modal-patrones-close { background: none; border: none; color: var(--white); font-size: 28px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
            .modal-galeria-close:hover, .modal-rangos-close:hover, .modal-variaciones-close:hover, .modal-patrones-close:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
            .modal-galeria-body { padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; max-height: calc(100vh - 80px); overflow-y: auto; }
            .modal-img-item { position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 12px; cursor: pointer; transition: transform 0.3s ease; }
            .modal-img-item:hover { transform: scale(1.02); }
            .modal-img-item img { width: 100%; height: 100%; object-fit: cover; }
            .modal-img-item .zoom-badge { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
            
            /* Modal de zoom */
            .image-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.95); z-index: 30000; justify-content: center; align-items: center; cursor: pointer; }
            .image-modal.active { display: flex !important; }
            .modal-content { position: relative; max-width: 95%; max-height: 95%; display: flex; justify-content: center; align-items: center; }
            .modal-content img { max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 8px; }
            .modal-close { position: absolute; top: -45px; right: -5px; width: 38px; height: 38px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: var(--primary); cursor: pointer; z-index: 30001; }
            .modal-prev, .modal-next { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; cursor: pointer; z-index: 30001; backdrop-filter: blur(5px); }
            .modal-prev { left: 10px; }
            .modal-next { right: 10px; }
            .modal-counter { position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 5px 12px; border-radius: 30px; font-size: 0.7rem; z-index: 30001; }
            
            /* Botón flotante */
            .floating-buttons { position: fixed; bottom: 20px; right: 15px; display: flex; flex-direction: column; gap: 12px; z-index: 1000; }
            .floating-btn { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; border: none; box-shadow: var(--shadow-lg); position: relative; }
            .floating-top { background: var(--primary); color: white; }
            .floating-btn:hover { transform: scale(1.1); }
            .floating-tooltip { position: absolute; right: 60px; background: rgba(0,0,0,0.8); color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; white-space: nowrap; opacity: 0; visibility: hidden; transition: all 0.3s ease; pointer-events: none; }
            .floating-btn:hover .floating-tooltip { opacity: 1; visibility: visible; right: 65px; }
            
            /* MEDIA QUERIES */
            @media (min-width: 480px) {
                .gallery-grid, .rangos-grid, .variaciones-grid, .patrones-grid { grid-template-columns: repeat(2, 1fr); }
                .specs-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; }
                .apps-grid { grid-template-columns: repeat(3, 1fr); }
                .antes-comprar-grid { grid-template-columns: repeat(2, 1fr); }
                .trust-grid { grid-template-columns: repeat(3, 1fr); }
                .caracteristicas-grid { grid-template-columns: repeat(2, 1fr); }
                .hero-image img { max-height: 320px; }
            }
            
            @media (min-width: 768px) {
                .container { padding: 0 24px; }
                .hero-content { 
                    flex-direction: row; 
                    align-items: center; 
                    justify-content: space-between;
                    gap: 40px; 
                }
                .hero-text { 
                    text-align: left; 
                    flex: 1; 
                    order: 1; 
                }
                .hero h1 { font-size: 2rem; }
                .hero p { margin-left: 0; margin-right: 0; }
                .hero-buttons { 
                    flex-direction: row; 
                    gap: 15px; 
                    justify-content: flex-start;
                }
                .hero-image { 
                    flex: 1; 
                    order: 2; 
                    justify-content: flex-end;
                }
                .hero-image img { 
                    max-height: 380px; 
                    max-width: 100%;
                }
                .specs-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .apps-grid { grid-template-columns: repeat(4, 1fr); }
                .gallery-grid, .rangos-grid, .variaciones-grid, .patrones-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .caracteristicas-grid { grid-template-columns: repeat(4, 1fr); }
                .footer-grid { grid-template-columns: repeat(3, 1fr); text-align: left; }
                .footer-social a, .footer-links a { justify-content: flex-start; }
                .section-title h2 { font-size: 1.8rem; }
                .modal-galeria-body { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
            }
            
            @media (min-width: 1024px) {
                .hero h1 { font-size: 2.5rem; }
                .hero-image img { max-height: 450px; }
                .section-title h2 { font-size: 2rem; }
                section { padding: 70px 0; }
            }
            
            @media (max-width: 380px) {
                .hero h1 { font-size: 1.3rem; }
                .section-title h2 { font-size: 1.3rem; }
                .floating-btn { width: 45px; height: 45px; }
                .btn { padding: 10px 16px; font-size: 0.8rem; }
                .hero-image img { max-height: 220px;}
            }
            
            img { -webkit-user-select: none; user-select: none; -webkit-user-drag: none; }
        </style>
    </head>
    <body>
        <!-- Modales de zoom -->
        ${modalZoomPrincipalHtml}
        ${modalGaleriaHtml}
        ${modalRangosHtml}
        ${modalVariacionesHtml}
        ${modalPatronesHtml}
        
        <header>
            <div class="container navbar">
                <div class="logo">
                    <a href="https://gallosmarmol.github.io/?seccion=outlet" title="Ir a Outlet">
                        <img src="FOTO/foto_01.webp" alt="Gallos Mármol">
                    </a>
                </div>
            </div>
        </header>
        
        ${bannerAdvertencia}
        
        ${heroHtml}
        
        ${tieneGaleria ? galeriaHtml : ''}
        ${tieneRangos ? rangosHtml : ''}
        ${tieneVariaciones ? variacionesHtml : ''}
        ${tienePatrones ? patronesHtml : ''}
        ${tieneAplicaciones ? aplicacionesHtml : ''}
        ${fichaHtml}

        <section class="specs-section">
            <div class="container">
                <div class="section-title"><h2>Especificaciones del Producto</h2><p>Información técnica y detalles premium</p></div>
                <div class="specs-grid">
                    ${especificacionesConTooltips.map(esp => `
                        <div class="spec-card">
                            <h3>${esp.titulo}</h3>
                            <p>${esp.valor}</p>
                            <span class="tooltip-text">${esp.tooltip}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
        
        ${caracteristicasComercialHtml}
        ${antesDeComprarHtml}
        
        <section>
            <div class="container">
                <div class="section-title"><h2>Confianza y Garantía</h2><p>Calidad, experiencia y compromiso</p></div>
                <div class="trust-grid">
                    <div class="trust-card"><i class="fas fa-award"></i><h3>Calidad Premium</h3><p>Productos seleccionados con altos estándares</p></div>
                    <div class="trust-card"><i class="fas fa-shield-halved"></i><h3>Garantía</h3><p>Materiales resistentes y duraderos</p></div>
                    <div class="trust-card"><i class="fas fa-headset"></i><h3>Asesoría</h3><p>Atención especializada para tu proyecto</p></div>
                </div>
            </div>
        </section>
                
        ${notaInformativaHtml}
        ${botonFlotante}
        
        <footer>
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"><p>Desde 1870, transformamos espacios con mármol de alta calidad, combinando belleza, exclusividad y excelencia en cada proyecto.</p></div>
                    <div class="footer-social"><h4>Redes Sociales</h4>
                    <a href="https://www.facebook.com/gallosmarmol/"><i class="fab fa-facebook-f"></i> Facebook</a>
                    <a href="https://www.instagram.com/gallosmarmol/"><i class="fab fa-instagram"></i> Instagram</a>
                    <a href="https://www.tiktok.com/@gallos.marmol.ofic"><i class="fab fa-tiktok"></i> TikTok</a></div>
                    <div class="footer-links"><h4>Contacto</h4><a href="https://gallosmarmol.com.pe"><i class="fas fa-globe"></i> gallosmarmol.com.pe</a><a href="mailto:info@gallosmarmol.com.pe"><i class="fas fa-envelope"></i> info@gallosmarmol.com.pe</a></div>
                </div>
                <div class="footer-bottom">© 2026 Gallos Mármol — Todos los derechos reservados.</div>
            </div>
        </footer>
        
        <script>
            (function() {
                // ========== DATOS ==========
                const galeriaCompleta = ${JSON.stringify(galeriaImagenes)};
                const rangosCompleto = ${JSON.stringify(rangosArray)};
                const variacionesCompleto = ${JSON.stringify(variacionesArray)};
                const patronesCompleto = ${JSON.stringify(patronesArray)};
                const imagenPrincipal = "${imagenPrincipal}";
                const esPiedraNatural = ${esPiedraNatural};
                const mostrarVariaciones = ${mostrarVariaciones};
                
                // ========== ZOOM PRINCIPAL - HERO ==========
                const modalPrincipal = document.getElementById('zoomModalPrincipal');
                const imgPrincipal = document.getElementById('zoomPrincipalImage');
                const closePrincipal = document.querySelector('#zoomModalPrincipal .modal-close');
                
                function abrirZoomPrincipal() {
                    imgPrincipal.src = imagenPrincipal;
                    modalPrincipal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function cerrarZoomPrincipal() {
                    modalPrincipal.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                if (closePrincipal) closePrincipal.addEventListener('click', cerrarZoomPrincipal);
                if (modalPrincipal) modalPrincipal.addEventListener('click', (e) => { if (e.target === modalPrincipal) cerrarZoomPrincipal(); });
                
                const heroZoomBtn = document.getElementById('heroZoomBtn');
                const heroImage = document.getElementById('heroImage');
                if (heroZoomBtn) heroZoomBtn.addEventListener('click', abrirZoomPrincipal);
                if (heroImage) heroImage.addEventListener('click', abrirZoomPrincipal);
                
                // ========== ZOOM PARA GALERÍA ==========
                let indiceGaleriaActual = 0;
                const modalZoomGaleria = document.getElementById('zoomModalGaleria');
                const imgZoomGaleria = document.getElementById('zoomGaleriaImage');
                const counterZoomGaleria = document.getElementById('zoomGaleriaCounter');
                const prevZoomGaleria = document.getElementById('zoomGaleriaPrev');
                const nextZoomGaleria = document.getElementById('zoomGaleriaNext');
                const closeZoomGaleria = document.querySelector('#zoomModalGaleria .modal-close');
                
                function abrirZoomGaleria(indice) {
                    if (!galeriaCompleta.length) return;
                    indiceGaleriaActual = indice;
                    imgZoomGaleria.src = galeriaCompleta[indiceGaleriaActual];
                    counterZoomGaleria.innerText = (indiceGaleriaActual + 1) + ' / ' + galeriaCompleta.length;
                    modalZoomGaleria.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function cerrarZoomGaleria() {
                    modalZoomGaleria.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                function siguienteGaleria() {
                    if (indiceGaleriaActual < galeriaCompleta.length - 1) {
                        indiceGaleriaActual++;
                        imgZoomGaleria.src = galeriaCompleta[indiceGaleriaActual];
                        counterZoomGaleria.innerText = (indiceGaleriaActual + 1) + ' / ' + galeriaCompleta.length;
                    }
                }
                
                function anteriorGaleria() {
                    if (indiceGaleriaActual > 0) {
                        indiceGaleriaActual--;
                        imgZoomGaleria.src = galeriaCompleta[indiceGaleriaActual];
                        counterZoomGaleria.innerText = (indiceGaleriaActual + 1) + ' / ' + galeriaCompleta.length;
                    }
                }
                
                if (closeZoomGaleria) closeZoomGaleria.addEventListener('click', cerrarZoomGaleria);
                if (prevZoomGaleria) prevZoomGaleria.addEventListener('click', anteriorGaleria);
                if (nextZoomGaleria) nextZoomGaleria.addEventListener('click', siguienteGaleria);
                if (modalZoomGaleria) modalZoomGaleria.addEventListener('click', (e) => { if (e.target === modalZoomGaleria) cerrarZoomGaleria(); });
                
                // ========== ZOOM PARA RANGOS ==========
                let indiceRangosActual = 0;
                const modalZoomRangos = document.getElementById('zoomModalRangos');
                const imgZoomRangos = document.getElementById('zoomRangosImage');
                const counterZoomRangos = document.getElementById('zoomRangosCounter');
                const prevZoomRangos = document.getElementById('zoomRangosPrev');
                const nextZoomRangos = document.getElementById('zoomRangosNext');
                const closeZoomRangos = document.querySelector('#zoomModalRangos .modal-close');
                
                function abrirZoomRangos(indice) {
                    if (!rangosCompleto.length) return;
                    indiceRangosActual = indice;
                    imgZoomRangos.src = rangosCompleto[indiceRangosActual];
                    counterZoomRangos.innerText = (indiceRangosActual + 1) + ' / ' + rangosCompleto.length;
                    modalZoomRangos.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function cerrarZoomRangos() {
                    if (modalZoomRangos) modalZoomRangos.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                function siguienteRangos() {
                    if (indiceRangosActual < rangosCompleto.length - 1) {
                        indiceRangosActual++;
                        imgZoomRangos.src = rangosCompleto[indiceRangosActual];
                        counterZoomRangos.innerText = (indiceRangosActual + 1) + ' / ' + rangosCompleto.length;
                    }
                }
                
                function anteriorRangos() {
                    if (indiceRangosActual > 0) {
                        indiceRangosActual--;
                        imgZoomRangos.src = rangosCompleto[indiceRangosActual];
                        counterZoomRangos.innerText = (indiceRangosActual + 1) + ' / ' + rangosCompleto.length;
                    }
                }
                
                if (closeZoomRangos) closeZoomRangos.addEventListener('click', cerrarZoomRangos);
                if (prevZoomRangos) prevZoomRangos.addEventListener('click', anteriorRangos);
                if (nextZoomRangos) nextZoomRangos.addEventListener('click', siguienteRangos);
                if (modalZoomRangos) modalZoomRangos.addEventListener('click', (e) => { if (e.target === modalZoomRangos) cerrarZoomRangos(); });
                
                // ========== ZOOM PARA VARIACIONES ==========
                let indiceVariacionesActual = 0;
                const modalZoomVariaciones = document.getElementById('zoomModalVariaciones');
                const imgZoomVariaciones = document.getElementById('zoomVariacionesImage');
                const counterZoomVariaciones = document.getElementById('zoomVariacionesCounter');
                const prevZoomVariaciones = document.getElementById('zoomVariacionesPrev');
                const nextZoomVariaciones = document.getElementById('zoomVariacionesNext');
                const closeZoomVariaciones = document.querySelector('#zoomModalVariaciones .modal-close');
                
                function abrirZoomVariaciones(indice) {
                    if (!variacionesCompleto.length) return;
                    indiceVariacionesActual = indice;
                    imgZoomVariaciones.src = variacionesCompleto[indiceVariacionesActual];
                    counterZoomVariaciones.innerText = (indiceVariacionesActual + 1) + ' / ' + variacionesCompleto.length;
                    modalZoomVariaciones.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function cerrarZoomVariaciones() {
                    if (modalZoomVariaciones) modalZoomVariaciones.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                function siguienteVariaciones() {
                    if (indiceVariacionesActual < variacionesCompleto.length - 1) {
                        indiceVariacionesActual++;
                        imgZoomVariaciones.src = variacionesCompleto[indiceVariacionesActual];
                        counterZoomVariaciones.innerText = (indiceVariacionesActual + 1) + ' / ' + variacionesCompleto.length;
                    }
                }
                
                function anteriorVariaciones() {
                    if (indiceVariacionesActual > 0) {
                        indiceVariacionesActual--;
                        imgZoomVariaciones.src = variacionesCompleto[indiceVariacionesActual];
                        counterZoomVariaciones.innerText = (indiceVariacionesActual + 1) + ' / ' + variacionesCompleto.length;
                    }
                }
                
                if (closeZoomVariaciones) closeZoomVariaciones.addEventListener('click', cerrarZoomVariaciones);
                if (prevZoomVariaciones) prevZoomVariaciones.addEventListener('click', anteriorVariaciones);
                if (nextZoomVariaciones) nextZoomVariaciones.addEventListener('click', siguienteVariaciones);
                if (modalZoomVariaciones) modalZoomVariaciones.addEventListener('click', (e) => { if (e.target === modalZoomVariaciones) cerrarZoomVariaciones(); });
                
                // ========== ZOOM PARA PATRONES ==========
                let indicePatronesActual = 0;
                const modalZoomPatrones = document.getElementById('zoomModalPatrones');
                const imgZoomPatrones = document.getElementById('zoomPatronesImage');
                const counterZoomPatrones = document.getElementById('zoomPatronesCounter');
                const prevZoomPatrones = document.getElementById('zoomPatronesPrev');
                const nextZoomPatrones = document.getElementById('zoomPatronesNext');
                const closeZoomPatrones = document.querySelector('#zoomModalPatrones .modal-close');
                
                function abrirZoomPatrones(indice) {
                    if (!patronesCompleto.length) return;
                    indicePatronesActual = indice;
                    imgZoomPatrones.src = patronesCompleto[indicePatronesActual];
                    counterZoomPatrones.innerText = (indicePatronesActual + 1) + ' / ' + patronesCompleto.length;
                    modalZoomPatrones.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function cerrarZoomPatrones() {
                    if (modalZoomPatrones) modalZoomPatrones.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                function siguientePatrones() {
                    if (indicePatronesActual < patronesCompleto.length - 1) {
                        indicePatronesActual++;
                        imgZoomPatrones.src = patronesCompleto[indicePatronesActual];
                        counterZoomPatrones.innerText = (indicePatronesActual + 1) + ' / ' + patronesCompleto.length;
                    }
                }
                
                function anteriorPatrones() {
                    if (indicePatronesActual > 0) {
                        indicePatronesActual--;
                        imgZoomPatrones.src = patronesCompleto[indicePatronesActual];
                        counterZoomPatrones.innerText = (indicePatronesActual + 1) + ' / ' + patronesCompleto.length;
                    }
                }
                
                if (closeZoomPatrones) closeZoomPatrones.addEventListener('click', cerrarZoomPatrones);
                if (prevZoomPatrones) prevZoomPatrones.addEventListener('click', anteriorPatrones);
                if (nextZoomPatrones) nextZoomPatrones.addEventListener('click', siguientePatrones);
                if (modalZoomPatrones) modalZoomPatrones.addEventListener('click', (e) => { if (e.target === modalZoomPatrones) cerrarZoomPatrones(); });
                
                // ========== ASIGNAR EVENTOS DE ZOOM ==========
                // Galería
                document.querySelectorAll('.zoom-btn-galeria-inicial').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.galeriaIndex);
                        if (!isNaN(idx)) abrirZoomGaleria(idx);
                    });
                });
                document.querySelectorAll('.galeria-item img').forEach(img => {
                    img.addEventListener('click', () => {
                        const idx = parseInt(img.dataset.galeriaIndex);
                        if (!isNaN(idx)) abrirZoomGaleria(idx);
                    });
                });
                
                // Rangos
                if (esPiedraNatural) {
                    document.querySelectorAll('.zoom-btn-rango-inicial').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const idx = parseInt(btn.dataset.rangoIndex);
                            if (!isNaN(idx)) abrirZoomRangos(idx);
                        });
                    });
                    document.querySelectorAll('.rango-item img').forEach(img => {
                        img.addEventListener('click', () => {
                            const idx = parseInt(img.dataset.rangoIndex);
                            if (!isNaN(idx)) abrirZoomRangos(idx);
                        });
                    });
                }
                
                // Variaciones
                if (mostrarVariaciones) {
                    document.querySelectorAll('.zoom-btn-variacion-inicial').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const idx = parseInt(btn.dataset.variacionIndex);
                            if (!isNaN(idx)) abrirZoomVariaciones(idx);
                        });
                    });
                    document.querySelectorAll('.variacion-item img').forEach(img => {
                        img.addEventListener('click', () => {
                            const idx = parseInt(img.dataset.variacionIndex);
                            if (!isNaN(idx)) abrirZoomVariaciones(idx);
                        });
                    });
                }
                
                // Patrones
                document.querySelectorAll('.zoom-btn-patron-inicial').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.patronIndex);
                        if (!isNaN(idx)) abrirZoomPatrones(idx);
                    });
                });
                document.querySelectorAll('.patron-item img').forEach(img => {
                    img.addEventListener('click', () => {
                        const idx = parseInt(img.dataset.patronIndex);
                        if (!isNaN(idx)) abrirZoomPatrones(idx);
                    });
                });
                
                // ========== FUNCIONES PARA ABRIR MODALES COMPLETOS ==========
                function abrirModalGaleriaCompleta() {
                    const modal = document.getElementById('modalGaleria');
                    const body = document.getElementById('modalGaleriaBody');
                    if (!modal || !body) return;
                    
                    body.innerHTML = '';
                    galeriaCompleta.forEach((img, idx) => {
                        const div = document.createElement('div');
                        div.className = 'modal-img-item';
                        div.innerHTML = \`
                            <img src="\${img}" alt="Imagen \${idx+1}" loading="lazy" onerror="this.src='FOTO/foto_04.webp'">
                            <div class="zoom-badge"><i class="fas fa-search-plus"></i></div>
                        \`;
                        div.addEventListener('click', () => abrirZoomGaleria(idx));
                        body.appendChild(div);
                    });
                    
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function abrirModalRangosCompleta() {
                    const modal = document.getElementById('modalRangos');
                    const body = document.getElementById('modalRangosBody');
                    if (!modal || !body) return;
                    
                    body.innerHTML = '';
                    rangosCompleto.forEach((img, idx) => {
                        const div = document.createElement('div');
                        div.className = 'modal-img-item';
                        div.innerHTML = \`
                            <img src="\${img}" alt="Variación \${idx+1}" loading="lazy" onerror="this.src='FOTO/foto_04.webp'">
                            <div class="zoom-badge"><i class="fas fa-search-plus"></i></div>
                        \`;
                        div.addEventListener('click', () => abrirZoomRangos(idx));
                        body.appendChild(div);
                    });
                    
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function abrirModalVariacionesCompleta() {
                    const modal = document.getElementById('modalVariaciones');
                    const body = document.getElementById('modalVariacionesBody');
                    if (!modal || !body) return;
                    
                    body.innerHTML = '';
                    variacionesCompleto.forEach((img, idx) => {
                        const div = document.createElement('div');
                        div.className = 'modal-img-item';
                        div.innerHTML = \`
                            <img src="\${img}" alt="Variación \${idx+1}" loading="lazy" onerror="this.src='FOTO/foto_04.webp'">
                            <div class="zoom-badge"><i class="fas fa-search-plus"></i></div>
                        \`;
                        div.addEventListener('click', () => abrirZoomVariaciones(idx));
                        body.appendChild(div);
                    });
                    
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function abrirModalPatronesCompleta() {
                    const modal = document.getElementById('modalPatrones');
                    const body = document.getElementById('modalPatronesBody');
                    if (!modal || !body) return;
                    
                    body.innerHTML = '';
                    patronesCompleto.forEach((img, idx) => {
                        const div = document.createElement('div');
                        div.className = 'modal-img-item';
                        div.innerHTML = \`
                            <img src="\${img}" alt="Patrón \${idx+1}" loading="lazy" onerror="this.src='FOTO/foto_04.webp'">
                            <div class="zoom-badge"><i class="fas fa-search-plus"></i></div>
                        \`;
                        div.addEventListener('click', () => abrirZoomPatrones(idx));
                        body.appendChild(div);
                    });
                    
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
                
                function cerrarModalGaleria(modalId) {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                }
                
                // ========== BOTONES VER TODAS ==========
                const verTodaGaleriaBtn = document.getElementById('verTodaGaleriaBtn');
                const verTodosRangosBtn = document.getElementById('verTodosRangosBtn');
                const verTodasVariacionesBtn = document.getElementById('verTodasVariacionesBtn');
                const verTodosPatronesBtn = document.getElementById('verTodosPatronesBtn');
                
                if (verTodaGaleriaBtn) verTodaGaleriaBtn.addEventListener('click', abrirModalGaleriaCompleta);
                if (verTodosRangosBtn && esPiedraNatural) verTodosRangosBtn.addEventListener('click', abrirModalRangosCompleta);
                if (verTodasVariacionesBtn && mostrarVariaciones) verTodasVariacionesBtn.addEventListener('click', abrirModalVariacionesCompleta);
                if (verTodosPatronesBtn) verTodosPatronesBtn.addEventListener('click', abrirModalPatronesCompleta);
                
                // ========== CERRAR MODALES ==========
                const modalGaleriaClose = document.querySelector('.modal-galeria-close');
                const modalRangosClose = document.querySelector('.modal-rangos-close');
                const modalVariacionesClose = document.querySelector('.modal-variaciones-close');
                const modalPatronesClose = document.querySelector('.modal-patrones-close');
                
                if (modalGaleriaClose) modalGaleriaClose.addEventListener('click', () => cerrarModalGaleria('modalGaleria'));
                if (modalRangosClose && esPiedraNatural) modalRangosClose.addEventListener('click', () => cerrarModalGaleria('modalRangos'));
                if (modalVariacionesClose && mostrarVariaciones) modalVariacionesClose.addEventListener('click', () => cerrarModalGaleria('modalVariaciones'));
                if (modalPatronesClose) modalPatronesClose.addEventListener('click', () => cerrarModalGaleria('modalPatrones'));
                
                const modalGaleriaElem = document.getElementById('modalGaleria');
                const modalRangosElem = document.getElementById('modalRangos');
                const modalVariacionesElem = document.getElementById('modalVariaciones');
                const modalPatronesElem = document.getElementById('modalPatrones');
                
                if (modalGaleriaElem) modalGaleriaElem.addEventListener('click', (e) => {
                    if (e.target === modalGaleriaElem) cerrarModalGaleria('modalGaleria');
                });
                if (modalRangosElem && esPiedraNatural) modalRangosElem.addEventListener('click', (e) => {
                    if (e.target === modalRangosElem) cerrarModalGaleria('modalRangos');
                });
                if (modalVariacionesElem && mostrarVariaciones) modalVariacionesElem.addEventListener('click', (e) => {
                    if (e.target === modalVariacionesElem) cerrarModalGaleria('modalVariaciones');
                });
                if (modalPatronesElem) modalPatronesElem.addEventListener('click', (e) => {
                    if (e.target === modalPatronesElem) cerrarModalGaleria('modalPatrones');
                });
                
                // ========== SCROLL INDICATOR ==========
                function initScrollIndicator() {
                    const scrollIndicator = document.getElementById('scrollIndicator');
                    if (!scrollIndicator) return;
                    
                    scrollIndicator.addEventListener('click', function(e) {
                        e.preventDefault();
                        const nextSection = document.querySelector('#galeria') || 
                                           document.querySelector('.gallery-section') || 
                                           document.querySelector('.rangos-section') ||
                                           document.querySelector('.variaciones-section') ||
                                           document.querySelector('.patrones-section') ||
                                           document.querySelector('section:not(.hero)');
                        
                        if (nextSection) {
                            const offset = 80;
                            const targetPosition = nextSection.getBoundingClientRect().top + window.scrollY - offset;
                            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
                        }
                    });
                    
                    let timeoutId;
                    window.addEventListener('scroll', function() {
                        if (window.scrollY > 50) {
                            scrollIndicator.style.opacity = '0';
                            scrollIndicator.style.transition = 'opacity 0.5s ease';
                            clearTimeout(timeoutId);
                        } else {
                            scrollIndicator.style.opacity = '1';
                        }
                    });
                    
                    window.addEventListener('scroll', function() {
                        if (window.scrollY < 20) {
                            clearTimeout(timeoutId);
                            timeoutId = setTimeout(() => {
                                scrollIndicator.style.opacity = '1';
                            }, 500);
                        }
                    });
                }
                
                // ========== BOTÓN SUBIR ==========
                const topBtn = document.getElementById('floatingTopBtn');
                if (topBtn) {
                    topBtn.addEventListener('click', () => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                }
                
                // ========== PREVENIR DESCARGA DE IMÁGENES ==========
                document.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'U')) e.preventDefault();
                    if (e.key === 'F12') e.preventDefault();
                });
                
                // ========== INICIALIZAR ==========
                initScrollIndicator();
                
                console.log('✅ Landing page cargada con todas las secciones');
                console.log('📋 Secciones activas:', {
                    galeria: ${tieneGaleria},
                    rangos: ${tieneRangos},
                    variaciones: ${tieneVariaciones},
                    patrones: ${tienePatrones},
                    aplicaciones: ${tieneAplicaciones},
                    caracteristicas: ${mostrarCaracteristicas},
                    notaNatural: ${mostrarNotaNatural}
                });
            })();
        </script>
    </body>
    </html>`;
    
    document.open();
    document.write(html);
    document.close();
    console.log('✅ Landing page renderizada correctamente');
}

function renderizarPaginaOutlet(productos) {
    console.log('🚀 Renderizando página Outlet con todas las funcionalidades y seguridad integrada');

    // ============================================
    // CONFIGURACIÓN Y CONSTANTES
    // ============================================
    const CONFIG = {
        COTIZACION_STORAGE_KEY: 'cotizacion_outlet_seleccionados',
        DEFAULT_IMAGE: 'FOTO/foto_04.webp',
        QR_FPS: 10,
        QR_BOX_SIZE: 250,
        FILTROS_DEBOUNCE_DELAY: 400,
        IMAGE_LAZY_LOAD_THRESHOLD: 0.1
    };
    window.CONFIG = CONFIG;
    
    // ============================================
    // CONFIGURACIÓN DE PAÍSES
    // ============================================

    const PAISES_CONFIG = {
        // ============================================
        // AMÉRICA
        // ============================================
        
        '51': {
            nombre: 'Perú',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+51',
            codigosValidos: ['9'],
            patronesSpam: ['999999999', '111111111', '123456789', '987654321'],
            descripcion: '9 dígitos (celular)'
        },
        '1': {
            nombre: 'USA/Canadá',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+1',
            codigosValidos: ['2', '3', '4', '5', '6', '7', '8', '9'],
            patronesSpam: ['1111111111', '2222222222', '3333333333', '4444444444', '5555555555', '6666666666', '7777777777', '8888888888', '9999999999', '1234567890', '9876543210'],
            descripcion: '10 dígitos'
        },
        '52': {
            nombre: 'México',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+52',
            codigosValidos: ['55', '56', '33', '81', '81', '81'],
            patronesSpam: ['5512345678', '5534567890'],
            descripcion: '10 dígitos'
        },
        '54': {
            nombre: 'Argentina',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+54',
            codigosValidos: ['9', '11', '15'],
            patronesSpam: ['9111111111', '9999999999'],
            descripcion: '10 dígitos'
        },
        '56': {
            nombre: 'Chile',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+56',
            codigosValidos: ['9'],
            patronesSpam: ['999999999', '111111111'],
            descripcion: '9 dígitos (celular)'
        },
        '57': {
            nombre: 'Colombia',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+57',
            codigosValidos: ['3', '5', '6', '7', '8'],
            patronesSpam: ['3123456789', '9999999999'],
            descripcion: '10 dígitos'
        },
        '58': {
            nombre: 'Venezuela',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+58',
            codigosValidos: ['4', '2'],
            patronesSpam: ['4123456789', '9999999999'],
            descripcion: '10 dígitos'
        },
        '591': {
            nombre: 'Bolivia',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+591',
            codigosValidos: ['6', '7'],
            patronesSpam: ['71234567', '99999999'],
            descripcion: '8 dígitos (celular)'
        },
        '593': {
            nombre: 'Ecuador',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+593',
            codigosValidos: ['9'],
            patronesSpam: ['999999999', '111111111'],
            descripcion: '9 dígitos (celular)'
        },
        '595': {
            nombre: 'Paraguay',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+595',
            codigosValidos: ['9', '5'],
            patronesSpam: ['999999999', '555555555'],
            descripcion: '9 dígitos (celular)'
        },
        '598': {
            nombre: 'Uruguay',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+598',
            codigosValidos: ['9'],
            patronesSpam: ['99999999', '11111111'],
            descripcion: '8 dígitos (celular)'
        },
        '55': {
            nombre: 'Brasil',
            longitudMin: 11,
            longitudMax: 11,
            prefijo: '+55',
            codigosValidos: ['9', '1', '2', '3', '4', '5', '6', '7', '8'],
            patronesSpam: ['11999999999', '11911111111'],
            descripcion: '11 dígitos (con código de área)'
        },
        '502': {
            nombre: 'Guatemala',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+502',
            codigosValidos: ['3', '4', '5'],
            patronesSpam: ['31234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '503': {
            nombre: 'El Salvador',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+503',
            codigosValidos: ['6', '7'],
            patronesSpam: ['61234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '504': {
            nombre: 'Honduras',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+504',
            codigosValidos: ['3', '9'],
            patronesSpam: ['31234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '505': {
            nombre: 'Nicaragua',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+505',
            codigosValidos: ['8', '9'],
            patronesSpam: ['81234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '506': {
            nombre: 'Costa Rica',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+506',
            codigosValidos: ['6', '7', '8', '9'],
            patronesSpam: ['61234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '507': {
            nombre: 'Panamá',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+507',
            codigosValidos: ['6'],
            patronesSpam: ['61234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '53': {
            nombre: 'Cuba',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+53',
            codigosValidos: ['5'],
            patronesSpam: ['51234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '1787': {
            nombre: 'Puerto Rico',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+1',
            codigosValidos: ['787', '939'],
            patronesSpam: ['7879999999', '9391111111'],
            descripcion: '10 dígitos (con prefijo 787/939)',
            prefijoEspecial: '+1'
        },
        '809': {
            nombre: 'República Dominicana',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+1',
            codigosValidos: ['809', '829', '849'],
            patronesSpam: ['8099999999', '8291111111'],
            descripcion: '10 dígitos (con prefijo 809/829/849)',
            prefijoEspecial: '+1'
        },
        '1809': {
            nombre: 'República Dominicana',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+1',
            codigosValidos: ['1809', '1829', '1849'],
            patronesSpam: ['18099999999', '18291111111'],
            descripcion: '10 dígitos',
            prefijoEspecial: '+1'
        },

        // ============================================
        // EUROPA
        // ============================================
        
        '34': {
            nombre: 'España',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+34',
            codigosValidos: ['6', '7'],
            patronesSpam: ['612345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '351': {
            nombre: 'Portugal',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+351',
            codigosValidos: ['9'],
            patronesSpam: ['912345678', '999999999'],
            descripcion: '9 dígitos'
        },
        '33': {
            nombre: 'Francia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+33',
            codigosValidos: ['6', '7'],
            patronesSpam: ['612345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '49': {
            nombre: 'Alemania',
            longitudMin: 10,
            longitudMax: 11,
            prefijo: '+49',
            codigosValidos: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            patronesSpam: ['15123456789', '99999999999'],
            descripcion: '10-11 dígitos'
        },
        '39': {
            nombre: 'Italia',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+39',
            codigosValidos: ['3'],
            patronesSpam: ['3123456789', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '44': {
            nombre: 'Reino Unido',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+44',
            codigosValidos: ['7'],
            patronesSpam: ['7123456789', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '31': {
            nombre: 'Países Bajos',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+31',
            codigosValidos: ['6'],
            patronesSpam: ['612345678', '999999999'],
            descripcion: '9 dígitos'
        },
        '32': {
            nombre: 'Bélgica',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+32',
            codigosValidos: ['4', '7'],
            patronesSpam: ['471234567', '999999999'],
            descripcion: '9 dígitos'
        },
        '41': {
            nombre: 'Suiza',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+41',
            codigosValidos: ['7'],
            patronesSpam: ['712345678', '999999999'],
            descripcion: '9 dígitos'
        },
        '43': {
            nombre: 'Austria',
            longitudMin: 10,
            longitudMax: 11,
            prefijo: '+43',
            codigosValidos: ['6', '1', '2', '3', '4', '5', '7', '8', '9'],
            patronesSpam: ['664123456', '9999999999'],
            descripcion: '10-11 dígitos'
        },
        '45': {
            nombre: 'Dinamarca',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+45',
            codigosValidos: ['2', '3', '4', '5', '6', '7', '8', '9'],
            patronesSpam: ['12345678', '99999999'],
            descripcion: '8 dígitos'
        },
        '46': {
            nombre: 'Suecia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+46',
            codigosValidos: ['7'],
            patronesSpam: ['701234567', '999999999'],
            descripcion: '9 dígitos'
        },
        '47': {
            nombre: 'Noruega',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+47',
            codigosValidos: ['4', '9'],
            patronesSpam: ['41234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '358': {
            nombre: 'Finlandia',
            longitudMin: 9,
            longitudMax: 10,
            prefijo: '+358',
            codigosValidos: ['4', '5'],
            patronesSpam: ['401234567', '9999999999'],
            descripcion: '9-10 dígitos'
        },
        '30': {
            nombre: 'Grecia',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+30',
            codigosValidos: ['6', '2', '3', '4', '5', '7', '8', '9'],
            patronesSpam: ['6912345678', '9999999999'],
            descripcion: '10 dígitos'
        },
        '90': {
            nombre: 'Turquía',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+90',
            codigosValidos: ['5'],
            patronesSpam: ['5312345678', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '7': {
            nombre: 'Rusia',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+7',
            codigosValidos: ['9'],
            patronesSpam: ['9123456789', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '48': {
            nombre: 'Polonia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+48',
            codigosValidos: ['5', '6', '7', '8'],
            patronesSpam: ['501234567', '999999999'],
            descripcion: '9 dígitos'
        },
        '420': {
            nombre: 'República Checa',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+420',
            codigosValidos: ['6', '7', '2', '3', '4', '5', '8', '9'],
            patronesSpam: ['601123456', '999999999'],
            descripcion: '9 dígitos'
        },
        '36': {
            nombre: 'Hungría',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+36',
            codigosValidos: ['2', '3', '4', '5', '7'],
            patronesSpam: ['201234567', '999999999'],
            descripcion: '9 dígitos'
        },

        // ============================================
        // ASIA
        // ============================================
        
        '81': {
            nombre: 'Japón',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+81',
            codigosValidos: ['9', '8', '7', '6', '5', '4', '3', '2', '1'],
            patronesSpam: ['9012345678', '9999999999'],
            descripcion: '10 dígitos'
        },
        '82': {
            nombre: 'Corea del Sur',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+82',
            codigosValidos: ['9', '1', '2'],
            patronesSpam: ['1012345678', '9999999999'],
            descripcion: '10 dígitos'
        },
        '86': {
            nombre: 'China',
            longitudMin: 11,
            longitudMax: 11,
            prefijo: '+86',
            codigosValidos: ['1'],
            patronesSpam: ['13912345678', '99999999999'],
            descripcion: '11 dígitos (celular)'
        },
        '91': {
            nombre: 'India',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+91',
            codigosValidos: ['6', '7', '8', '9'],
            patronesSpam: ['9876543210', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '60': {
            nombre: 'Malasia',
            longitudMin: 9,
            longitudMax: 10,
            prefijo: '+60',
            codigosValidos: ['1'],
            patronesSpam: ['1912345678', '9999999999'],
            descripcion: '9-10 dígitos'
        },
        '62': {
            nombre: 'Indonesia',
            longitudMin: 10,
            longitudMax: 12,
            prefijo: '+62',
            codigosValidos: ['8', '9', '2', '3', '4', '5', '6', '7'],
            patronesSpam: ['8123456789', '999999999999'],
            descripcion: '10-12 dígitos'
        },
        '63': {
            nombre: 'Filipinas',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+63',
            codigosValidos: ['9'],
            patronesSpam: ['9123456789', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '65': {
            nombre: 'Singapur',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+65',
            codigosValidos: ['8', '9'],
            patronesSpam: ['81234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '66': {
            nombre: 'Tailandia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+66',
            codigosValidos: ['6', '8', '9'],
            patronesSpam: ['812345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '84': {
            nombre: 'Vietnam',
            longitudMin: 9,
            longitudMax: 10,
            prefijo: '+84',
            codigosValidos: ['3', '5', '7', '8', '9'],
            patronesSpam: ['912345678', '9999999999'],
            descripcion: '9-10 dígitos'
        },
        '971': {
            nombre: 'Emiratos Árabes Unidos',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+971',
            codigosValidos: ['5'],
            patronesSpam: ['501234567', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '966': {
            nombre: 'Arabia Saudita',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+966',
            codigosValidos: ['5'],
            patronesSpam: ['512345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '972': {
            nombre: 'Israel',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+972',
            codigosValidos: ['5'],
            patronesSpam: ['501234567', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '964': {
            nombre: 'Irak',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+964',
            codigosValidos: ['7'],
            patronesSpam: ['7012345678', '9999999999'],
            descripcion: '10 dígitos'
        },
        '98': {
            nombre: 'Irán',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+98',
            codigosValidos: ['9'],
            patronesSpam: ['9123456789', '9999999999'],
            descripcion: '10 dígitos'
        },

        // ============================================
        // OCEANÍA
        // ============================================
        
        '61': {
            nombre: 'Australia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+61',
            codigosValidos: ['4'],
            patronesSpam: ['412345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '64': {
            nombre: 'Nueva Zelanda',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+64',
            codigosValidos: ['2'],
            patronesSpam: ['211234567', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '675': {
            nombre: 'Papúa Nueva Guinea',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+675',
            codigosValidos: ['7', '8'],
            patronesSpam: ['71234567', '99999999'],
            descripcion: '8 dígitos'
        },
        '687': {
            nombre: 'Nueva Caledonia',
            longitudMin: 6,
            longitudMax: 6,
            prefijo: '+687',
            codigosValidos: ['5', '7', '8', '9'],
            patronesSpam: ['512345', '999999'],
            descripcion: '6 dígitos'
        },

        // ============================================
        // ÁFRICA
        // ============================================
        
        '27': {
            nombre: 'Sudáfrica',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+27',
            codigosValidos: ['6', '7', '8'],
            patronesSpam: ['821234567', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '212': {
            nombre: 'Marruecos',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+212',
            codigosValidos: ['6', '7'],
            patronesSpam: ['612345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '234': {
            nombre: 'Nigeria',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+234',
            codigosValidos: ['7', '8', '9'],
            patronesSpam: ['8012345678', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '254': {
            nombre: 'Kenia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+254',
            codigosValidos: ['7'],
            patronesSpam: ['712345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '233': {
            nombre: 'Ghana',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+233',
            codigosValidos: ['2', '5'],
            patronesSpam: ['201234567', '999999999'],
            descripcion: '9 dígitos'
        },
        '256': {
            nombre: 'Uganda',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+256',
            codigosValidos: ['7'],
            patronesSpam: ['712345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '258': {
            nombre: 'Mozambique',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+258',
            codigosValidos: ['8'],
            patronesSpam: ['812345678', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '20': {
            nombre: 'Egipto',
            longitudMin: 10,
            longitudMax: 10,
            prefijo: '+20',
            codigosValidos: ['1'],
            patronesSpam: ['1012345678', '9999999999'],
            descripcion: '10 dígitos (celular)'
        },
        '216': {
            nombre: 'Túnez',
            longitudMin: 8,
            longitudMax: 8,
            prefijo: '+216',
            codigosValidos: ['2', '5', '9'],
            patronesSpam: ['20123456', '99999999'],
            descripcion: '8 dígitos'
        },
        '213': {
            nombre: 'Argelia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+213',
            codigosValidos: ['5', '6', '7'],
            patronesSpam: ['551234567', '999999999'],
            descripcion: '9 dígitos (celular)'
        },
        '218': {
            nombre: 'Libia',
            longitudMin: 9,
            longitudMax: 9,
            prefijo: '+218',
            codigosValidos: ['9'],
            patronesSpam: ['912345678', '999999999'],
            descripcion: '9 dígitos'
        }
    };

    window.PAISES_CONFIG = PAISES_CONFIG;

    // ============================================
    // CONFIGURACIÓN DE VALIDACIÓN - GLOBAL
    // ============================================

    const VALIDACION_CONFIG = {
        // Límites de rate limiting
        RATE_LIMIT: {
            MAX_INTENTOS_POR_IP: 5,
            MAX_COTIZACIONES_POR_DIA: 10,
            TIEMPO_ESPERA_SEGUNDOS: 60,
            VENTANA_INTENTOS: 15 * 60 * 1000
        },
        BRUTE_FORCE: {
            MAX_INTENTOS_FALLIDOS: 3,
            TIEMPO_BLOQUEO_MINUTOS: 30,
            INTENTOS_CAPTCHA: 3
        }
    };

    // Exponer globalmente
    window.VALIDACION_CONFIG = VALIDACION_CONFIG;

    // ============================================
    // VALIDACIÓN DE DATOS DE ENTRADA
    // ============================================
    const productosValidos = (productos && Array.isArray(productos)) ? productos : [];
    window.outletProductosCache = productosValidos;
    
    // ============================================
    // INICIALIZACIÓN DE VARIABLES GLOBALES
    // ============================================
    let asesoresPrecargados = null;
    let html5QrCode = null;
    let escaneoActivo = false;
    let iniciandoEscaneo = false;
    let observerImagenes = null;
    let pasoActualCotizacion = 1;
    let asesorSeleccionadoActual = null;
    let modoAsignacionActual = 'auto';
    
    window.clienteNombreCache = '';
    window.clienteEmailCache = '';
    window.clienteTelefonoCache = '';
    window.clienteEmpresaCache = '';
    window.ubicacionCache = '';
    window.observacionesCache = '';
    window.paisSeleccionadoCache = '51';
    window.cotizacionSospechosa = false;
    
    const guardado = localStorage.getItem(CONFIG.COTIZACION_STORAGE_KEY);
    if (guardado) {
        try {
            window.cotizacionSeleccionados = JSON.parse(guardado);
        } catch(e) {
            window.cotizacionSeleccionados = [];
        }
    } else {
        window.cotizacionSeleccionados = [];
    }

    // ============================================
    // CLASE RATE LIMITER
    // ============================================
    class RateLimiter {
        constructor() {
            this.intentos = new Map();
            this.cotizaciones = new Map();
            this.callbacks = {
                onAdvertencia: null,
                onBloqueo: null,
                onDesbloqueo: null,
                onLimiteDiario: null
            };

        // ✅ Usar window.VALIDACION_CONFIG o el valor por defecto
        this.config = window.VALIDACION_CONFIG || {
            RATE_LIMIT: {
                MAX_INTENTOS_POR_IP: 5,
                MAX_COTIZACIONES_POR_DIA: 10,
                TIEMPO_ESPERA_SEGUNDOS: 60,
                VENTANA_INTENTOS: 15 * 60 * 1000
            },
            BRUTE_FORCE: {
                MAX_INTENTOS_FALLIDOS: 3,
                TIEMPO_BLOQUEO_MINUTOS: 30,
                INTENTOS_CAPTCHA: 3
            }
        };           

        }

        setCallbacks(callbacks) {
            this.callbacks = { ...this.callbacks, ...callbacks };
        }

        _getClaveIP(ip) { return `ip_${ip}`; }
        _getClaveUsuario(identificador) { return `user_${identificador}`; }

        _limpiarIntentosAntiguos(clave) {
            const datos = this.intentos.get(clave);
            if (!datos) return;
            const ahora = Date.now();
            const ventana = 15 * 60 * 1000;
            datos.timestamps = datos.timestamps.filter(t => (ahora - t) < ventana);
            if (datos.timestamps.length === 0) this.intentos.delete(clave);
        }

        _estaBloqueado(ip) {
            const clave = this._getClaveIP(ip);
            const datos = this.intentos.get(clave);
            if (!datos || !datos.bloqueado) return false;
            const ahora = Date.now();
            if (ahora > datos.bloqueoHasta) {
                datos.bloqueado = false;
                datos.bloqueoHasta = null;
                datos.intentos = 0;
                datos.timestamps = [];
                return false;
            }
            return true;
        }

        registrarIntento(ip, identificador = null) {
            const ahora = Date.now();
            const claveIP = this._getClaveIP(ip);
            
            if (this._estaBloqueado(ip)) {
                const datos = this.intentos.get(claveIP);
                const tiempoRestante = Math.ceil((datos.bloqueoHasta - ahora) / 60000);
                if (this.callbacks.onBloqueo) {
                    this.callbacks.onBloqueo(`⛔ Bloqueado por ${tiempoRestante} min.`, { tiempoRestante, ip });
                }
                return { permitido: false, bloqueado: true, tiempoRestante, mensaje: `Bloqueado por ${tiempoRestante} min.` };
            }

            let datosIP = this.intentos.get(claveIP);
            if (!datosIP) {
                datosIP = { intentos: 0, timestamps: [], bloqueado: false, bloqueoHasta: null };
            }

            this._limpiarIntentosAntiguos(claveIP);
            datosIP.intentos++;
            datosIP.timestamps.push(ahora);
            
            const maxIntentos = 3;
            const intentosRestantes = maxIntentos - datosIP.intentos;

            if (intentosRestantes <= 2 && intentosRestantes > 0 && this.callbacks.onAdvertencia) {
                this.callbacks.onAdvertencia(`⚠️ Intentos restantes: ${intentosRestantes}`, { intentosRestantes, ip });
            }

            if (datosIP.intentos >= maxIntentos) {
                datosIP.bloqueado = true;
                const minutosBloqueo = 30;
                datosIP.bloqueoHasta = ahora + (minutosBloqueo * 60 * 1000);
                this.intentos.set(claveIP, datosIP);
                if (this.callbacks.onBloqueo) {
                    this.callbacks.onBloqueo(`⛔ Bloqueado por ${minutosBloqueo} min.`, { minutosBloqueo, ip });
                }
                return { permitido: false, bloqueado: true, tiempoRestante: minutosBloqueo, mensaje: `Bloqueado por ${minutosBloqueo} min.` };
            }

            this.intentos.set(claveIP, datosIP);

            if (identificador) {
                const claveUser = this._getClaveUsuario(identificador);
                let datosUser = this.intentos.get(claveUser);
                if (!datosUser) {
                    datosUser = { intentos: 0, timestamps: [], bloqueado: false, bloqueoHasta: null };
                }
                datosUser.intentos++;
                datosUser.timestamps.push(ahora);
                this.intentos.set(claveUser, datosUser);
            }

            return { permitido: true, intentosRestantes, mensaje: `Intentos restantes: ${intentosRestantes}` };
        }

        getEstado(ip, identificador = null) {
            const resultado = { ip, identificador, bloqueado: false, intentosRestantes: 0, cotizacionesHoy: 0, puedeEnviar: false };
            const claveIP = this._getClaveIP(ip);
            const datosIP = this.intentos.get(claveIP);
            
            if (datosIP && datosIP.bloqueado) {
                const ahora = Date.now();
                if (ahora < datosIP.bloqueoHasta) {
                    resultado.bloqueado = true;
                    resultado.tiempoBloqueo = Math.ceil((datosIP.bloqueoHasta - ahora) / 60000);
                    return resultado;
                }
            }

            const maxIntentos = 3;
            const intentosActuales = datosIP ? datosIP.intentos : 0;
            resultado.intentosRestantes = Math.max(0, maxIntentos - intentosActuales);

            const hoy = new Date().toDateString();
            const datosCotizaciones = this.cotizaciones.get(claveIP);
            if (datosCotizaciones) {
                resultado.cotizacionesHoy = datosCotizaciones.diarias.get(hoy) || 0;
            }

            resultado.puedeEnviar = !resultado.bloqueado && resultado.intentosRestantes > 0;
            return resultado;
        }

        verificarRateLimiting(ip, identificador) {
            const ahora = Date.now();
            const claveIP = this._getClaveIP(ip);
            let datosIP = this.cotizaciones.get(claveIP);
            if (!datosIP) {
                datosIP = { cantidad: 0, ultima: null, diarias: new Map() };
            }

            const hoy = new Date().toDateString();
            if (!datosIP.diarias.has(hoy)) {
                datosIP.diarias.clear();
                datosIP.diarias.set(hoy, 0);
            }

            const cotizacionesHoyIP = datosIP.diarias.get(hoy) || 0;
            const maxPorDia = 10;

            if (cotizacionesHoyIP >= maxPorDia) {
                if (this.callbacks.onLimiteDiario) {
                    this.callbacks.onLimiteDiario(`⛔ Límite diario de ${maxPorDia} cotizaciones alcanzado.`, { maximo: maxPorDia, ip });
                }
                return { permitido: false, motivo: 'Límite diario de cotizaciones alcanzado', tiempoEspera: '24 horas' };
            }

            if (datosIP.ultima) {
                const tiempoDesdeUltimo = (ahora - datosIP.ultima) / 1000;
                const tiempoMinimo = 60;
                if (tiempoDesdeUltimo < tiempoMinimo) {
                    const esperar = Math.ceil(tiempoMinimo - tiempoDesdeUltimo);
                    if (this.callbacks.onAdvertencia) {
                        this.callbacks.onAdvertencia(`⏳ Espera ${esperar} segundos.`, { tiempoEspera: esperar, ip });
                    }
                    return { permitido: false, motivo: 'Espera antes de enviar otra cotización', tiempoEspera: `${esperar} segundos` };
                }
            }

            return { permitido: true };
        }

        registrarCotizacionExitosa(ip, identificador) {
            const ahora = Date.now();
            const hoy = new Date().toDateString();
            const claveIP = this._getClaveIP(ip);
            
            // 1️⃣ REINICIAR CONTADOR DE INTENTOS (✅ RESETEA A CERO)
            if (this.intentos.has(claveIP)) {
                const datos = this.intentos.get(claveIP);
                
                // Si estaba bloqueado, notificar desbloqueo
                if (datos.bloqueado && this.callbacks.onDesbloqueo) {
                    this.callbacks.onDesbloqueo('✅ Cuenta desbloqueada. Envío exitoso.', { ip });
                }
                
                // ✅ REINICIAR CONTADOR A CERO
                datos.intentos = 0;
                datos.timestamps = [];
                datos.bloqueado = false;
                datos.bloqueoHasta = null;
                this.intentos.set(claveIP, datos);
                console.log(`✅ Contador de intentos reiniciado para IP: ${ip}`);
            }
            
            // 2️⃣ REGISTRAR COTIZACIÓN EXITOSA
            let datosIP = this.cotizaciones.get(claveIP);
            if (!datosIP) {
                datosIP = {
                    cantidad: 0,
                    ultima: null,
                    diarias: new Map()
                };
            }
            
            datosIP.cantidad++;
            datosIP.ultima = ahora;
            const diaIP = datosIP.diarias.get(hoy) || 0;
            const nuevaCantidad = diaIP + 1;
            datosIP.diarias.set(hoy, nuevaCantidad);
            this.cotizaciones.set(claveIP, datosIP);

            // 3️⃣ VERIFICAR LÍMITE DIARIO
            const maxDiario = VALIDACION_CONFIG.RATE_LIMIT.MAX_COTIZACIONES_POR_DIA;
            if (nuevaCantidad >= maxDiario && this.callbacks.onLimiteDiario) {
                this.callbacks.onLimiteDiario(
                    `⛔ Has alcanzado el límite diario de ${maxDiario} cotizaciones.`,
                    { maximo: maxDiario, ip }
                );
            }

            // 4️⃣ REINICIAR POR USUARIO
            if (identificador) {
                const claveUser = this._getClaveUsuario(identificador);
                if (this.intentos.has(claveUser)) {
                    const datos = this.intentos.get(claveUser);
                    datos.intentos = 0;
                    datos.timestamps = [];
                    datos.bloqueado = false;
                    datos.bloqueoHasta = null;
                    this.intentos.set(claveUser, datos);
                    console.log(`✅ Contador de intentos reiniciado para usuario: ${identificador}`);
                }
            }
        }
    }

    // ============================================
    // CLASE CAPTCHA MANAGER
    // ============================================
    class CaptchaManager {
        constructor() {
            this.captchas = new Map();
            this.intentosCaptcha = new Map();
        }

        generarCaptcha(sessionId) {
            const operaciones = [
                { simbolo: '+', fn: (a, b) => a + b },
                { simbolo: '-', fn: (a, b) => a - b },
                { simbolo: '×', fn: (a, b) => a * b }
            ];
            const op = operaciones[Math.floor(Math.random() * operaciones.length)];
            let a, b, resultado;
            if (op.simbolo === '×') {
                a = Math.floor(Math.random() * 9) + 1;
                b = Math.floor(Math.random() * 9) + 1;
            } else {
                a = Math.floor(Math.random() * 20) + 1;
                b = Math.floor(Math.random() * 20) + 1;
                if (op.simbolo === '-' && a < b) [a, b] = [b, a];
            }
            resultado = op.fn(a, b);
            const pregunta = `¿Cuánto es ${a} ${op.simbolo} ${b}?`;
            this.captchas.set(sessionId, { pregunta, respuesta: resultado, generado: Date.now() });
            this.intentosCaptcha.set(sessionId, 0);
            return pregunta;
        }

        verificarCaptcha(sessionId, respuesta) {
            const captcha = this.captchas.get(sessionId);
            if (!captcha) return { valido: false, mensaje: 'Captcha expirado o inválido' };
            if (Date.now() - captcha.generado > 5 * 60 * 1000) {
                this.captchas.delete(sessionId);
                return { valido: false, mensaje: 'Captcha expirado, genera uno nuevo' };
            }
            let intentos = this.intentosCaptcha.get(sessionId) || 0;
            intentos++;
            this.intentosCaptcha.set(sessionId, intentos);
            if (intentos > 5) {
                this.captchas.delete(sessionId);
                return { valido: false, mensaje: 'Demasiados intentos de captcha' };
            }
            const respuestaNumero = parseInt(respuesta);
            if (isNaN(respuestaNumero) || respuestaNumero !== captcha.respuesta) {
                return { valido: false, mensaje: `Respuesta incorrecta. Intento ${intentos} de 5`, intentosRestantes: 5 - intentos };
            }
            this.captchas.delete(sessionId);
            this.intentosCaptcha.delete(sessionId);
            return { valido: true, mensaje: 'Captcha verificado correctamente' };
        }

        limpiarCaptchas() {
            const ahora = Date.now();
            for (const [key, value] of this.captchas.entries()) {
                if (ahora - value.generado > 5 * 60 * 1000) {
                    this.captchas.delete(key);
                    this.intentosCaptcha.delete(key);
                }
            }
        }
    }

    // ============================================
    // CLASE DEVICE VERIFIER
    // ============================================
    class DeviceVerifier {
        constructor() {
            this.dispositivos = new Map();
        }

        generarHuella() {
            const componentes = [
                navigator.userAgent, navigator.language, navigator.platform,
                screen.width, screen.height, screen.colorDepth,
                navigator.hardwareConcurrency || 0, navigator.deviceMemory || 0,
                new Date().getTimezoneOffset()
            ];
            return btoa(componentes.join('|')).substring(0, 64);
        }

        verificarDispositivo(usuario, ip, userAgent) {
            const huella = this.generarHuella();
            const clave = usuario || ip;
            const dispositivoExistente = this.dispositivos.get(clave);
            
            if (!dispositivoExistente) {
                this.dispositivos.set(clave, { huella, ip, userAgent, ultimoUso: Date.now(), confiable: true });
                return { confiable: true, mensaje: 'Dispositivo registrado', esNuevo: true };
            }

            const cambioDispositivo = dispositivoExistente.huella !== huella;
            const cambioIP = dispositivoExistente.ip !== ip;
            const cambioUserAgent = dispositivoExistente.userAgent !== userAgent;
            const cambios = [];
            if (cambioDispositivo) cambios.push('dispositivo');
            if (cambioIP) cambios.push('IP');
            if (cambioUserAgent) cambios.push('navegador');

            if (cambios.length > 0) {
                this.dispositivos.set(clave, { huella, ip, userAgent, ultimoUso: Date.now(), confiable: false, cambiosDetectados: cambios });
                return { confiable: false, mensaje: `Cambio detectado en: ${cambios.join(', ')}`, cambios, requiereVerificacion: true };
            }

            dispositivoExistente.ultimoUso = Date.now();
            this.dispositivos.set(clave, dispositivoExistente);
            return { confiable: true, mensaje: 'Dispositivo verificado', esNuevo: false };
        }

        verificarCotizacion(ip, userAgent, email, telefono) {
            const identificador = email || telefono;
            if (!identificador) return { confiable: true, mensaje: 'Sin identificador para verificar' };
            return this.verificarDispositivo(identificador, ip, userAgent);
        }
    }

    // ============================================
    // CLASE DUPLICATE PREVENTER
    // ============================================
    class DuplicatePreventer {
        constructor() {
            this.enviados = new Map();
        }

        generarHash(datos) {
            const str = JSON.stringify({
                nombre: datos.nombre || '',
                email: datos.email || '',
                telefono: datos.telefono || '',
                productos: datos.productos ? datos.productos.map(p => p.id).sort().join(',') : ''
            });
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return `hash_${Math.abs(hash)}`;
        }

        verificarDuplicado(datos) {
            const hash = this.generarHash(datos);
            const existe = this.enviados.get(hash);
            
            if (existe) {
                const tiempoTranscurrido = (Date.now() - existe) / 1000;
                if (tiempoTranscurrido < 60) {
                    return { esDuplicado: true, tiempoEspera: Math.ceil(60 - tiempoTranscurrido), mensaje: `Cotización similar enviada hace ${Math.floor(tiempoTranscurrido)} segundos` };
                } else {
                    this.enviados.delete(hash);
                }
            }

            if (datos.email) {
                const claveEmail = `email_${datos.email}`;
                const ultimoEmail = this.enviados.get(claveEmail);
                if (ultimoEmail && (Date.now() - ultimoEmail) < 5 * 60 * 1000) {
                    return { esDuplicado: true, mensaje: 'Ya has enviado una cotización recientemente con este email' };
                }
            }

            if (datos.telefono) {
                const claveTelefono = `telefono_${datos.telefono}`;
                const ultimoTelefono = this.enviados.get(claveTelefono);
                if (ultimoTelefono && (Date.now() - ultimoTelefono) < 5 * 60 * 1000) {
                    return { esDuplicado: true, mensaje: 'Ya has enviado una cotización recientemente con este teléfono' };
                }
            }

            return { esDuplicado: false };
        }

        registrarEnvio(datos) {
            const hash = this.generarHash(datos);
            const ahora = Date.now();
            this.enviados.set(hash, ahora);
            if (datos.email) this.enviados.set(`email_${datos.email}`, ahora);
            if (datos.telefono) this.enviados.set(`telefono_${datos.telefono}`, ahora);
            for (const [key, value] of this.enviados.entries()) {
                if (ahora - value > 24 * 60 * 60 * 1000) this.enviados.delete(key);
            }
        }
    }

    // ============================================
    // INICIALIZAR SEGURIDAD
    // ============================================
    window.rateLimiter = new RateLimiter();
    const rateLimiter = window.rateLimiter;

    rateLimiter.setCallbacks({
        onAdvertencia: function(mensaje, datos) {
            if (datos.intentosRestantes <= 2 && typeof window.mostrarAdvertenciaIntentos === 'function') {
                window.mostrarAdvertenciaIntentos(datos.intentosRestantes);
            }
        },
        onBloqueo: function(mensaje, datos) {
            if (typeof window.mostrarBloqueoModal === 'function') {
                window.mostrarBloqueoModal(datos.minutosBloqueo || 30, datos.ip);
            }
        },
        onDesbloqueo: function(mensaje, datos) {
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ Cuenta desbloqueada.', 'success');
            }
        },
        onLimiteDiario: function(mensaje, datos) {
            if (typeof window.mostrarLimiteDiario === 'function') {
                window.mostrarLimiteDiario(datos.usadas || 10, datos.maximo || 10);
            }
        }
    });

    window.captchaManager = new CaptchaManager();
    const captchaManager = window.captchaManager;

    setInterval(() => {
        if (window.captchaManager && typeof window.captchaManager.limpiarCaptchas === 'function') {
            window.captchaManager.limpiarCaptchas();
        }
    }, 60 * 1000);

    window.deviceVerifier = new DeviceVerifier();
    const deviceVerifier = window.deviceVerifier;

    window.duplicatePreventer = new DuplicatePreventer();
    const duplicatePreventer = window.duplicatePreventer;

    // ============================================
    // FUNCIONES DE UTILIDAD Y SANITIZACIÓN
    // ============================================
    function sanitizarTexto(texto, permitirEspacios = true) {
        if (!texto) return '';
        let sanitizado = String(texto);
        sanitizado = sanitizado.replace(/[\x00-\x1F\x7F]/g, '');
        const mapaHTML = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
            "'": '&#x27;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;', '\\': '&#92;'
        };
        sanitizado = sanitizado.replace(/[&<>"'`=/\\]/g, function(c) { return mapaHTML[c] || c; });
        sanitizado = sanitizado.replace(/\bon\w+\s*=/gi, '');
        sanitizado = sanitizado.replace(/<script.*?>.*?<\/script>/gis, '');
        sanitizado = sanitizado.replace(/javascript:/gi, '');
        sanitizado = sanitizado.replace(/data:/gi, '');
        if (permitirEspacios) {
            sanitizado = sanitizado.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s0-9,.-]/g, '');
        } else {
            sanitizado = sanitizado.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9]/g, '');
        }
        return sanitizado;
    }

    function sanitizarEmail(email) {
        if (!email) return '';
        let sanitizado = String(email).replace(/[^a-zA-Z0-9@._%+-]/g, '');
        sanitizado = sanitizado.replace(/<script.*?>.*?<\/script>/gis, '');
        sanitizado = sanitizado.replace(/javascript:/gi, '');
        return sanitizado.toLowerCase().trim();
    }

    function sanitizarTelefono(telefono) {
        if (!telefono) return '';
        return String(telefono).replace(/[^0-9+]/g, '').trim();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const mapa = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
            "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
        };
        return String(text).replace(/[&<>"'`=\/]/g, function(c) { return mapa[c] || c; });
    }
    window.escapeHtml = escapeHtml;

    function optimizarGoogleDriveUrl(url, size = 'w400-h400') {
        if (!url || url === '') return CONFIG.DEFAULT_IMAGE;
        if (url.includes('lh3.googleusercontent.com')) return url;
        const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return `https://lh3.googleusercontent.com/d/${match[1]}=${size}`;
            }
        }
        return url;
    }
    window.optimizarGoogleDriveUrl = optimizarGoogleDriveUrl;

    // ============================================
    // FUNCIONES DE NOTIFICACIÓN VISUAL
    // ============================================
    function mostrarToast(mensaje, tipo = 'success') {
        const toastExistente = document.querySelector('.toast-notificacion');
        if (toastExistente) toastExistente.remove();
        const toast = document.createElement('div');
        toast.className = `toast-notificacion ${tipo === 'error' ? 'error' : tipo === 'warning' ? 'warning' : 'success'}`;
        const icono = tipo === 'error' ? 'fa-times-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';
        toast.innerHTML = `<i class="fas ${icono}"></i> ${mensaje}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    window.mostrarToast = mostrarToast;

    function mostrarBloqueoModal(minutos, ip) {
        const mensaje = `
            <div style="text-align:center;padding:8px 0;">
                <i class="fas fa-lock" style="font-size:48px;color:#dc2626;margin-bottom:16px;display:block;"></i>
                <p style="font-size:1.1rem;font-weight:600;color:#1f2937;">Cuenta bloqueada temporalmente</p>
                <p style="color:#6b7280;margin:8px 0;">Has realizado demasiados intentos fallidos.</p>
                <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:12px;margin:12px 0;">
                    <span style="font-size:1.5rem;font-weight:700;color:#dc2626;" id="contadorBloqueo">${minutos}:00</span>
                    <span style="font-size:0.9rem;color:#6b7280;"> minutos restantes</span>
                </div>
                <p style="font-size:0.75rem;color:#6b7280;margin-top:12px;">⏰ El bloqueo se levantará automáticamente.</p>
            </div>
        `;
        mostrarModal('⛔ Acceso bloqueado', mensaje, 'error', { showCancelButton: false, confirmButtonText: 'Entendido', timer: 5000 });
        
        let tiempoRestante = minutos * 60;
        const contadorElement = document.getElementById('contadorBloqueo');
        const intervalo = setInterval(() => {
            tiempoRestante--;
            if (contadorElement) {
                const minutosRest = Math.floor(tiempoRestante / 60);
                const segundosRest = tiempoRestante % 60;
                contadorElement.textContent = `${minutosRest}:${segundosRest.toString().padStart(2, '0')}`;
            }
            if (tiempoRestante <= 0) {
                clearInterval(intervalo);
                mostrarToast('✅ Cuenta desbloqueada.', 'success');
            }
        }, 1000);
    }
    window.mostrarBloqueoModal = mostrarBloqueoModal;

    function mostrarAdvertenciaIntentos(intentosRestantes) {
        let mensaje = '', tipo = 'warning';
        if (intentosRestantes === 1) { mensaje = '⚠️ ÚLTIMO INTENTO. Verifica tus datos.'; tipo = 'error'; }
        else if (intentosRestantes === 2) { mensaje = `⚠️ Te quedan ${intentosRestantes} intentos.`; tipo = 'warning'; }
        else { mensaje = `ℹ️ Intentos restantes: ${intentosRestantes}`; tipo = 'info'; }
        mostrarToast(mensaje, tipo);
    }
    window.mostrarAdvertenciaIntentos = mostrarAdvertenciaIntentos;

    function mostrarLimiteDiario(usadas, maximo) {
        mostrarToast(`📊 Has usado ${usadas} de ${maximo} cotizaciones permitidas hoy.`, 'warning');
    }
    window.mostrarLimiteDiario = mostrarLimiteDiario;

    function mostrarTiempoEspera(segundos) {
        mostrarToast(`⏳ Espera ${segundos} segundos.`, 'warning');
    }
    window.mostrarTiempoEspera = mostrarTiempoEspera;

    function actualizarBadgeSeguridad(intentosRestantes) {
        let badge = document.getElementById('securityBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'securityBadge';
            badge.style.cssText = 'position:fixed;top:80px;right:16px;background:white;padding:8px 14px;border-radius:40px;box-shadow:0 2px 10px rgba(0,0,0,0.1);font-size:0.7rem;font-weight:600;z-index:999;display:flex;align-items:center;gap:8px;border:1px solid #e5e7eb;transition:all 0.3s ease;';
            document.body.appendChild(badge);
        }
        let icono = '🟢', color = '#10b981', texto = 'Seguro';
        if (intentosRestantes === 0) { icono = '🔴'; color = '#dc2626'; texto = 'Sin intentos'; }
        else if (intentosRestantes === 1) { icono = '🟡'; color = '#f59e0b'; texto = 'Último intento'; }
        else if (intentosRestantes <= 2) { icono = '🟡'; color = '#f59e0b'; texto = `${intentosRestantes} intentos`; }
        else { icono = '🟢'; color = '#10b981'; texto = `${intentosRestantes} intentos`; }
        badge.innerHTML = `<span>${icono}</span><span style="color:${color};">${texto}</span>`;
        badge.style.borderColor = color;
        badge.style.display = 'flex';
        badge.style.animation = intentosRestantes < 3 ? 'badgePulse 1s ease infinite' : 'none';
    }
    window.actualizarBadgeSeguridad = actualizarBadgeSeguridad;

    function mostrarProgreso(mensaje, porcentaje) {
        let progreso = document.getElementById('progresoEnvio');
        if (!progreso) {
            progreso = document.createElement('div');
            progreso.id = 'progresoEnvio';
            progreso.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:white;padding:16px 24px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;min-width:280px;max-width:90%;text-align:center;border:1px solid #e5e7eb;';
            document.body.appendChild(progreso);
        }
        progreso.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="flex:1;">
                    <div style="font-size:0.85rem;font-weight:600;color:#1f2937;margin-bottom:4px;">${mensaje}</div>
                    <div style="width:100%;height:6px;background:#e5e7eb;border-radius:10px;overflow:hidden;">
                        <div style="width:${porcentaje}%;height:100%;background:linear-gradient(90deg,#6b0000,#8a1a1a);transition:width 0.5s ease;"></div>
                    </div>
                </div>
                <div style="font-size:0.8rem;font-weight:700;color:#6b0000;min-width:40px;">${porcentaje}%</div>
            </div>
        `;
        if (porcentaje === 100) {
            setTimeout(() => {
                progreso.style.animation = 'fadeOut 0.5s ease forwards';
                setTimeout(() => { if (progreso.parentNode) progreso.remove(); }, 500);
            }, 2000);
        }
    }
    window.mostrarProgreso = mostrarProgreso;

    // ============================================
    // FUNCIONES DE MODALES PERSONALIZADOS
    // ============================================
    function mostrarModal(titulo, mensaje, tipo = 'info', opciones = {}) {
        return new Promise((resolve) => {
            let modal = document.getElementById('modalPersonalizado');
            if (!modal) {
                const modalHtml = `
                <div id="modalPersonalizado" class="modal-overlay" style="display:none;">
                    <div class="modal-custom">
                        <div class="modal-custom-header" id="modalHeader">
                            <i id="modalIcon" class="fas fa-info-circle"></i>
                            <h3 id="modalTitle">Título</h3>
                        </div>
                        <div class="modal-custom-body" id="modalBody">Mensaje</div>
                        <div class="modal-custom-footer" id="modalFooter">
                            <button id="modalBtnConfirm" class="btn-modal-primary">Aceptar</button>
                        </div>
                    </div>
                </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                modal = document.getElementById('modalPersonalizado');
            }
            const icon = document.getElementById('modalIcon');
            const titleEl = document.getElementById('modalTitle');
            const bodyEl = document.getElementById('modalBody');
            const footer = document.getElementById('modalFooter');
            let icono = 'fas fa-info-circle', colorIcono = '#3b82f6';
            switch(tipo) {
                case 'success': icono = 'fas fa-check-circle'; colorIcono = '#10b981'; break;
                case 'error': icono = 'fas fa-times-circle'; colorIcono = '#dc3545'; break;
                case 'warning': icono = 'fas fa-exclamation-triangle'; colorIcono = '#f59e0b'; break;
                case 'question': icono = 'fas fa-question-circle'; colorIcono = 'var(--primary)'; break;
                default: icono = 'fas fa-info-circle'; colorIcono = '#3b82f6';
            }
            icon.className = icono;
            icon.style.color = colorIcono;
            titleEl.textContent = titulo;
            bodyEl.innerHTML = mensaje;
            const tieneCancelar = opciones.showCancelButton === true;
            const confirmText = opciones.confirmButtonText || 'Aceptar';
            const cancelText = opciones.cancelButtonText || 'Cancelar';
            if (tieneCancelar) {
                footer.innerHTML = `<button id="modalBtnCancel" class="btn-modal-secondary">${cancelText}</button><button id="modalBtnConfirm" class="btn-modal-primary">${confirmText}</button>`;
            } else {
                footer.innerHTML = `<button id="modalBtnConfirm" class="btn-modal-${tipo === 'success' ? 'success' : tipo === 'warning' ? 'warning' : 'primary'}">${confirmText}</button>`;
            }
            const nuevoBtnConfirm = document.getElementById('modalBtnConfirm');
            const btnCancel = document.getElementById('modalBtnCancel');
            const cerrar = (resultado) => {
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = '';
                resolve(resultado);
            };
            nuevoBtnConfirm.onclick = () => cerrar({ isConfirmed: true });
            if (btnCancel) btnCancel.onclick = () => cerrar({ isConfirmed: false });
            modal.onclick = (e) => { if (e.target === modal) cerrar({ isConfirmed: false }); };
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            if (opciones.timer) {
                setTimeout(() => { if (modal.classList.contains('active')) cerrar({ isConfirmed: true }); }, opciones.timer);
            }
        });
    }
    window.mostrarModal = mostrarModal;

    // ============================================
    // FUNCIONES DE VALIDACIÓN
    // ============================================
    function validarNombreCompleto(nombre) {
        const errores = [];
        if (!nombre || nombre.trim().length === 0) {
            errores.push('El nombre es obligatorio');
            return { valido: false, errores };
        }
        const sanitizado = sanitizarTexto(nombre);
        if (sanitizado.length < 3) errores.push('El nombre debe tener al menos 3 caracteres');
        if (sanitizado.length > 100) errores.push('El nombre no puede exceder los 100 caracteres');
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-'.]+$/.test(sanitizado)) {
            errores.push('El nombre solo puede contener letras, espacios, guiones y apóstrofes');
        }
        if (sanitizado.includes('  ')) errores.push('El nombre no debe contener espacios múltiples');
        return { valido: errores.length === 0, errores, valorSanitizado: sanitizado };
    }
    window.validarNombreCompleto = validarNombreCompleto;

    function validarEmail(email) {
        const errores = [];
        if (!email || email.trim().length === 0) {
            return { valido: false, errores: ['El email es obligatorio'] };
        }
        const sanitizado = sanitizarEmail(email);
        if (sanitizado.length > 255) errores.push('El email no puede exceder los 255 caracteres');
        const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regexEmail.test(sanitizado)) errores.push('Formato de email inválido');
        const dominiosSospechosos = ['tempmail.com', 'temp-mail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com', 'throwaway.com', 'fakeemail.com', 'disposable.com', 'trashmail.com'];
        const dominio = sanitizado.split('@')[1];
        if (dominio && dominiosSospechosos.some(d => dominio.includes(d))) errores.push('Dominio de email temporal no permitido');
        if (/[<>{}[\]()]/g.test(sanitizado)) errores.push('El email contiene caracteres no permitidos');
        return { valido: errores.length === 0, errores, valorSanitizado: sanitizado };
    }
    window.validarEmail = validarEmail;

    function validarEmpresa(empresa) {
        const errores = [];
        if (!empresa || empresa.trim().length === 0) {
            return { valido: true, errores, valorSanitizado: '' };
        }
        const sanitizado = sanitizarTexto(empresa);
        if (sanitizado.length < 2) errores.push('El nombre de la empresa debe tener al menos 2 caracteres');
        if (sanitizado.length > 100) errores.push('El nombre de la empresa no puede exceder los 100 caracteres');
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s0-9&.'-]+$/.test(sanitizado)) {
            errores.push('La empresa contiene caracteres no permitidos');
        }
        return { valido: errores.length === 0, errores, valorSanitizado: sanitizado };
    }
    window.validarEmpresa = validarEmpresa;

    function validarObservaciones(observaciones) {
        const errores = [];
        
        // Si está vacío, es válido (campo opcional)
        if (!observaciones || observaciones.trim().length === 0) {
            return { valido: true, errores, valorSanitizado: '' };
        }
        
        const sanitizado = sanitizarTexto(observaciones);
        
        if (sanitizado.length < 3) {
            errores.push('Las observaciones deben tener al menos 3 caracteres');
        }
        
        if (sanitizado.length > 500) {
            errores.push('Las observaciones no pueden exceder los 500 caracteres');
        }
        
        // Verificar caracteres peligrosos
        if (/<script.*?>.*?<\/script>/gis.test(sanitizado)) {
            errores.push('Las observaciones contienen código no permitido');
        }
        
        if (/on\w+\s*=/gi.test(sanitizado)) {
            errores.push('Las observaciones contienen eventos no permitidos');
        }
        
        return {
            valido: errores.length === 0,
            errores,
            valorSanitizado: sanitizado
        };
    }


    window.validarObservaciones = validarObservaciones;

    // ============================================
    // VALIDACIÓN DE OBSERVACIONES EN TIEMPO REAL
    // ============================================

    window.validarCampoObservaciones = function(valor) {
        const input = document.getElementById('observaciones-modal');
        const errorElement = document.getElementById('error-observaciones');
        
        if (!input || !errorElement) return false;
        
        const resultado = validarObservaciones(valor);
        
        // Limpiar estilos previos
        input.style.borderColor = '';
        input.style.backgroundColor = '';
        errorElement.className = 'mensaje-error hidden';
        errorElement.textContent = '';
        
        if (resultado.valido) {
            // ✅ VÁLIDO
            input.style.borderColor = '#10b981';
            input.style.backgroundColor = '#f0fdf4';
            window.observacionesCache = resultado.valorSanitizado;
            return true;
        } else {
            // ❌ INVÁLIDO
            errorElement.className = 'mensaje-error';
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${resultado.errores[0]}`;
            errorElement.style.color = '#dc2626';
            input.style.borderColor = '#dc2626';
            input.style.backgroundColor = '#fef2f2';
            window.observacionesCache = '';
            return false;
        }
    };

    function validarMensajeContacto(mensaje) {
        const errores = [];
        if (!mensaje || mensaje.trim().length === 0) {
            errores.push('Por favor, describe tu consulta');
            return { valido: false, errores };
        }
        const sanitizado = sanitizarTexto(mensaje);
        if (sanitizado.length < 5) errores.push('El mensaje debe tener al menos 5 caracteres');
        if (sanitizado.length > 500) errores.push('El mensaje no puede exceder los 500 caracteres');
        return { valido: errores.length === 0, errores, valorSanitizado: sanitizado };
    }
    window.validarMensajeContacto = validarMensajeContacto;

    function validarTelefonoAvanzado(telefono, pais = '51') {
        const resultado = {
            valido: false,
            errores: [],
            advertencias: [],
            telefonoLimpio: '',
            telefonoFormateado: '',
            pais: pais,
            esSospechoso: false
        };

        let telefonoLimpio = sanitizarTelefono(telefono);
        
        if (!telefonoLimpio || telefonoLimpio.length === 0) {
            resultado.errores.push('El número de teléfono es obligatorio');
            return resultado;
        }

        // Detectar prefijo internacional
        let tienePrefijo = false;
        let prefijoEncontrado = '';
        
        if (telefonoLimpio.startsWith('+')) {
            const match = telefonoLimpio.match(/^\+(\d+)/);
            if (match) {
                prefijoEncontrado = match[1];
                if (PAISES_CONFIG[prefijoEncontrado]) {
                    tienePrefijo = true;
                    resultado.pais = prefijoEncontrado;
                    telefonoLimpio = telefonoLimpio.replace(`+${prefijoEncontrado}`, '');
                }
            }
        }

        // Verificar que solo tenga números
        if (!/^[0-9]+$/.test(telefonoLimpio)) {
            resultado.errores.push('El teléfono solo puede contener números');
            return resultado;
        }

        // Configuración del país
        const config = PAISES_CONFIG[resultado.pais];
        if (!config) {
            resultado.errores.push('Código de país no válido');
            return resultado;
        }

        // Validar longitud
        const { longitudMin, longitudMax } = config;
        
        if (telefonoLimpio.length < longitudMin) {
            resultado.errores.push(`El número debe tener al menos ${longitudMin} dígitos`);
            return resultado;
        }
        
        if (telefonoLimpio.length > longitudMax) {
            resultado.errores.push(`El número debe tener máximo ${longitudMax} dígitos`);
            return resultado;
        }

        // ==========================================
        // ✅ VALIDACIÓN DE CÓDIGOS VÁLIDOS - OBLIGATORIA (BLOQUEA)
        // ==========================================
        
        if (config.codigosValidos && config.codigosValidos.length > 0) {
            let codigoValido = false;
            
            for (const codigo of config.codigosValidos) {
                if (telefonoLimpio.startsWith(codigo)) {
                    codigoValido = true;
                    break;
                }
            }
            
            if (!codigoValido) {
                const codigosStr = config.codigosValidos.join(', ');
                resultado.errores.push(
                    `El número debe comenzar con: ${codigosStr}`
                );
                return resultado; // ❌ BLOQUEA EL AVANCE
            }
        }

        // ==========================================
        // ✅ VALIDACIÓN DE PATRONES SPAM - OBLIGATORIA (BLOQUEA)
        // ==========================================
        
        const patronesSpamGlobales = [
            '999999999', '111111111', '123456789', '987654321',
            '000000000', '222222222', '333333333', '444444444',
            '555555555', '666666666', '777777777', '888888888'
        ];
        
        const spamPatterns = config.patronesSpam || [];
        const todosPatronesSpam = [...patronesSpamGlobales, ...spamPatterns];
        
        for (const patron of todosPatronesSpam) {
            if (telefonoLimpio === patron) {
                resultado.errores.push(
                    `Número no válido (patrón sospechoso)`
                );
                return resultado; // ❌ BLOQUEA EL AVANCE
            }
        }

        // ==========================================
        // VALIDACIONES DE SEGURIDAD (SOLO ADVERTENCIAS - NO BLOQUEAN)
        // ==========================================

        if (/(\d)\1{4,}/.test(telefonoLimpio)) {
            resultado.advertencias.push('El número contiene muchos dígitos repetidos');
            resultado.esSospechoso = true;
        }

        const secuencias = ['123456789', '987654321', '0123456789', '12345678', '87654321'];
        for (const secuencia of secuencias) {
            if (telefonoLimpio.includes(secuencia)) {
                resultado.advertencias.push('El número contiene una secuencia sospechosa');
                resultado.esSospechoso = true;
                break;
            }
        }

        if (/(\d{2})\1{3,}/.test(telefonoLimpio)) {
            resultado.advertencias.push('El número contiene un patrón repetitivo sospechoso');
            resultado.esSospechoso = true;
        }

        if (resultado.pais === '51' && !telefonoLimpio.startsWith('9')) {
            resultado.advertencias.push('En Perú, los celulares comienzan con 9');
            resultado.esSospechoso = true;
        }

        const prefijo = PAISES_CONFIG[resultado.pais]?.prefijo || `+${resultado.pais}`;
        resultado.telefonoFormateado = `${prefijo}${telefonoLimpio}`;
        resultado.telefonoLimpio = telefonoLimpio;

        if (resultado.errores.length === 0) {
            resultado.valido = true;
        }

        return resultado;
    }

    window.validarTelefonoAvanzado = validarTelefonoAvanzado;

    // ============================================
    // FUNCIONES DE CONTACTO - GLOBALES
    // ============================================
    window.validarCampoContacto = function(campo) {
        if (campo === 'nombre') {
            const input = document.getElementById('contacto-nombre');
            const error = document.getElementById('contacto-error-nombre');
            const valor = input?.value || '';
            const resultado = validarNombreCompleto(valor);
            
            if (resultado.valido) {
                error.className = 'mensaje-error hidden';
                input.style.borderColor = '#10b981';
                input.style.backgroundColor = '#f0fdf4';
                return true;
            } else {
                error.className = 'mensaje-error';
                error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${resultado.errores[0]}`;
                input.style.borderColor = '#dc2626';
                input.style.backgroundColor = '#fef2f2';
                return false;
            }
        }
        
        if (campo === 'telefono') {
            const input = document.getElementById('contacto-telefono');
            const error = document.getElementById('contacto-error-telefono');
            const prefijoSelect = document.getElementById('contacto-prefijo-pais');
            const pais = prefijoSelect?.value || '51';
            const valor = input?.value || '';
            
            // ✅ USA validarTelefonoAvanzado() - BLOQUEA si hay errores
            const resultado = validarTelefonoAvanzado(valor, pais);
            
            if (resultado.valido) {
                error.className = 'mensaje-error hidden';
                input.style.borderColor = '#10b981';
                input.style.backgroundColor = '#f0fdf4';
                return true;
            } else {
                error.className = 'mensaje-error';
                error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${resultado.errores[0]}`;
                input.style.borderColor = '#dc2626';
                input.style.backgroundColor = '#fef2f2';
                return false;
            }
        }
        
        if (campo === 'mensaje') {
            const input = document.getElementById('contacto-mensaje');
            const error = document.getElementById('contacto-error-mensaje');
            const valor = input?.value || '';
            const resultado = validarMensajeContacto(valor);
            
            if (resultado.valido) {
                error.className = 'mensaje-error hidden';
                input.style.borderColor = '#10b981';
                input.style.backgroundColor = '#f0fdf4';
                return true;
            } else {
                error.className = 'mensaje-error';
                error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${resultado.errores[0]}`;
                input.style.borderColor = '#dc2626';
                input.style.backgroundColor = '#fef2f2';
                return false;
            }
        }
        
        return false;
    };

    window.cerrarModalContactoRapido = function() {
        const modal = document.getElementById('modalContactoRapido');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { if (modal.parentNode) modal.remove(); }, 300);
        }
    };

    window.mostrarModalContactoRapido = function(origen) {
        return new Promise((resolve) => {
            console.log('📱 Abriendo modal de contacto rápido');
            
            // ==========================================
            // PAÍSES DISPONIBLES
            // ==========================================
            const paises = [
                { codigo: '51', nombre: 'Perú', bandera: '🇵🇪' },
                { codigo: '1', nombre: 'USA/Canadá', bandera: '🇺🇸' },
                { codigo: '52', nombre: 'México', bandera: '🇲🇽' },
                { codigo: '54', nombre: 'Argentina', bandera: '🇦🇷' },
                { codigo: '56', nombre: 'Chile', bandera: '🇨🇱' },
                { codigo: '57', nombre: 'Colombia', bandera: '🇨🇴' },
                { codigo: '58', nombre: 'Venezuela', bandera: '🇻🇪' },
                { codigo: '591', nombre: 'Bolivia', bandera: '🇧🇴' },
                { codigo: '593', nombre: 'Ecuador', bandera: '🇪🇨' },
                { codigo: '595', nombre: 'Paraguay', bandera: '🇵🇾' },
                { codigo: '598', nombre: 'Uruguay', bandera: '🇺🇾' },
                { codigo: '55', nombre: 'Brasil', bandera: '🇧🇷' },
                { codigo: '34', nombre: 'España', bandera: '🇪🇸' },
                { codigo: '44', nombre: 'Reino Unido', bandera: '🇬🇧' },
                { codigo: '33', nombre: 'Francia', bandera: '🇫🇷' },
                { codigo: '49', nombre: 'Alemania', bandera: '🇩🇪' },
                { codigo: '39', nombre: 'Italia', bandera: '🇮🇹' },
                { codigo: '81', nombre: 'Japón', bandera: '🇯🇵' },
                { codigo: '61', nombre: 'Australia', bandera: '🇦🇺' },
                { codigo: '27', nombre: 'Sudáfrica', bandera: '🇿🇦' }
            ];
            
            // ==========================================
            // GENERAR OPCIONES DE PAÍSES
            // ==========================================
            const opcionesPaises = paises.map(p => `
                <option value="${p.codigo}" ${p.codigo === '51' ? 'selected' : ''}>
                    ${p.bandera} +${p.codigo} (${p.nombre})
                </option>
            `).join('');
            
            // ==========================================
            // HTML DEL MODAL
            // ==========================================
            const modalHtml = `
                <div id="modalContactoRapido" class="modal-contacto-rapido show">
                    <div class="modal-contacto-rapido-contenido">
                        
                        <!-- HEADER COMPACTO -->
                        <div class="modal-contacto-rapido-header">
                            <i class="fas fa-address-card"></i>
                            <div class="header-text">
                                <h3>Datos de contacto</h3>
                                <p>Completa tus datos para que un asesor te atienda</p>
                            </div>
                        </div>
                        
                        <!-- BODY -->
                        <div class="modal-contacto-rapido-body">
                            
                            <!-- Nombre -->
                            <div class="form-group">
                                <label>Nombre completo <span class="required">*</span></label>
                                <input type="text" id="contacto-nombre" 
                                    placeholder="Ej: Juan Pérez" 
                                    autocomplete="name"
                                    oninput="window.validarCampoContacto('nombre')"
                                    onblur="window.validarCampoContacto('nombre')">
                                <div id="contacto-error-nombre" class="mensaje-error hidden">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <span></span>
                                </div>
                            </div>
                            
                            <!-- Teléfono -->
                            <div class="form-group">
                                <label>Teléfono <span class="required">*</span></label>
                                <div class="telefono-wrapper">
                                    <select id="contacto-prefijo-pais" 
                                        onchange="window.actualizarAyudaTelefonoContacto(this.value)">
                                        ${opcionesPaises}
                                    </select>
                                    <input type="tel" id="contacto-telefono" 
                                        placeholder="987654321" 
                                        autocomplete="tel"
                                        oninput="window.validarCampoContacto('telefono')"
                                        onblur="window.validarCampoContacto('telefono')">
                                </div>
                                <div id="contacto-error-telefono" class="mensaje-error hidden">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <span></span>
                                </div>
                                <div id="contacto-telefono-ayuda" class="telefono-ayuda">
                                    <span class="ayuda-formato">
                                        <i class="fas fa-info-circle"></i>
                                        Formato Perú: 9 dígitos (celular)
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Mensaje -->
                            <div class="form-group">
                                <label>¿Qué necesitas? <span class="required">*</span></label>
                                <textarea id="contacto-mensaje" 
                                    placeholder="Ej: Busco mármol blanco para encimera de cocina..." 
                                    rows="2"
                                    oninput="window.validarCampoContacto('mensaje')"
                                    onblur="window.validarCampoContacto('mensaje')"></textarea>
                                <div id="contacto-error-mensaje" class="mensaje-error hidden">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <span></span>
                                </div>
                            </div>
                            
                            <!-- Email oculto -->
                            <input type="hidden" id="contacto-email" value="">
                            
                        </div>
                        
                        <!-- FOOTER -->
                        <div class="modal-contacto-rapido-footer">
                            <button class="btn-cancelar" onclick="window.cerrarModalContactoRapido()">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button class="btn-enviar" id="btnEnviarContacto" disabled>
                                <i class="fas fa-paper-plane"></i> Enviar
                            </button>
                        </div>
                        
                    </div>
                </div>
            `;
            
            // ==========================================
            // ELIMINAR MODAL ANTERIOR
            // ==========================================
            const modalExistente = document.getElementById('modalContactoRapido');
            if (modalExistente) modalExistente.remove();
            
            // ==========================================
            // INSERTAR MODAL
            // ==========================================
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // ==========================================
            // FOCUS EN EL PRIMER CAMPO
            // ==========================================
            setTimeout(() => {
                document.getElementById('contacto-nombre')?.focus();
            }, 200);
            
            // ==========================================
            // VALIDAR TODOS LOS CAMPOS
            // ==========================================
            function validarTodosCamposContacto() {
                const nombreValido = window.validarCampoContacto('nombre');
                const telefonoValido = window.validarCampoContacto('telefono');
                const mensajeValido = window.validarCampoContacto('mensaje');
                
                const btnEnviar = document.getElementById('btnEnviarContacto');
                if (btnEnviar) {
                    const todosValidos = nombreValido && telefonoValido && mensajeValido;
                    btnEnviar.disabled = !todosValidos;
                    btnEnviar.style.opacity = todosValidos ? '1' : '0.5';
                    btnEnviar.style.cursor = todosValidos ? 'pointer' : 'not-allowed';
                }
                
                return nombreValido && telefonoValido && mensajeValido;
            }
            
            // ==========================================
            // EVENTOS DE VALIDACIÓN EN TIEMPO REAL
            // ==========================================
            const inputs = ['contacto-nombre', 'contacto-telefono', 'contacto-mensaje'];
            inputs.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('input', function() {
                        const campo = id.replace('contacto-', '');
                        window.validarCampoContacto(campo);
                        validarTodosCamposContacto();
                    });
                    element.addEventListener('blur', function() {
                        const campo = id.replace('contacto-', '');
                        window.validarCampoContacto(campo);
                        validarTodosCamposContacto();
                    });
                }
            });
            
            // ==========================================
            // ACTUALIZAR AYUDA DE TELÉFONO
            // ==========================================
            window.actualizarAyudaTelefonoContacto = function(pais) {
                const config = window.PAISES_CONFIG ? window.PAISES_CONFIG[pais] : null;
                const ayuda = document.getElementById('contacto-telefono-ayuda');
                
                if (ayuda && config) {
                    ayuda.innerHTML = `
                        <span class="ayuda-formato">
                            <i class="fas fa-info-circle"></i>
                            Formato ${config.nombre}: ${config.descripcion}
                            ${config.codigosValidos ? `<br><small style="color: #6b7280;">📌 Debe comenzar con: ${config.codigosValidos.join(', ')}</small>` : ''}
                        </span>
                    `;
                }
                
                // Re-validar teléfono
                const telefonoInput = document.getElementById('contacto-telefono');
                if (telefonoInput && telefonoInput.value) {
                    window.validarCampoContacto('telefono');
                    validarTodosCamposContacto();
                }
            };
            
            // ==========================================
            // BOTÓN ENVIAR
            // ==========================================
            document.getElementById('btnEnviarContacto')?.addEventListener('click', function() {
                const nombre = document.getElementById('contacto-nombre')?.value.trim() || '';
                const telefono = document.getElementById('contacto-telefono')?.value.trim() || '';
                const mensaje = document.getElementById('contacto-mensaje')?.value.trim() || '';
                const pais = document.getElementById('contacto-prefijo-pais')?.value || '51';
                
                // Validar nombre
                const nombreValidado = validarNombreCompleto(nombre);
                if (!nombreValidado.valido) {
                    window.mostrarErrorContacto('nombre', nombreValidado.errores[0]);
                    return;
                }
                
                // Validar teléfono
                const telefonoValidado = validarTelefonoAvanzado(telefono, pais);
                if (!telefonoValidado.valido) {
                    window.mostrarErrorContacto('telefono', telefonoValidado.errores[0]);
                    return;
                }
                
                // Validar mensaje
                const mensajeValidado = validarMensajeContacto(mensaje);
                if (!mensajeValidado.valido) {
                    window.mostrarErrorContacto('mensaje', mensajeValidado.errores[0]);
                    return;
                }
                
                // ==========================================
                // TODOS LOS CAMPOS SON VÁLIDOS
                // ==========================================
                
                // Cerrar modal
                const modal = document.getElementById('modalContactoRapido');
                if (modal) {
                    modal.classList.remove('show');
                    setTimeout(() => {
                        if (modal.parentNode) modal.remove();
                    }, 300);
                }
                
                // ✅ RESOLVER CON PAÍS INCLUIDO
                resolve({
                    nombre: nombreValidado.valorSanitizado,
                    telefono: telefonoValidado.telefonoLimpio,
                    telefonoFormateado: telefonoValidado.telefonoFormateado,
                    pais: pais,  // ✅ CÓDIGO DEL PAÍS
                    mensaje: mensajeValidado.valorSanitizado,
                    email: '' // Email oculto
                });
            });
            
            // ==========================================
            // CERRAR AL HACER CLIC FUERA
            // ==========================================
            document.getElementById('modalContactoRapido')?.addEventListener('click', function(e) {
                if (e.target === this) {
                    window.cerrarModalContactoRapido();
                    resolve(null);
                }
            });
            
            // ==========================================
            // TECLA ESCAPE
            // ==========================================
            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('modalContactoRapido');
                    if (modal && modal.classList.contains('show')) {
                        window.cerrarModalContactoRapido();
                        resolve(null);
                        document.removeEventListener('keydown', handler);
                    }
                }
            });
            
            // ==========================================
            // INICIALIZAR VALIDACIÓN
            // ==========================================
            setTimeout(validarTodosCamposContacto, 100);
        });
    };

    // ============================================
    // FUNCIÓN PARA MOSTRAR ERROR EN CAMPO
    // ============================================

    window.mostrarErrorContacto = function(campo, mensaje) {
        const errorMap = {
            'nombre': 'contacto-error-nombre',
            'telefono': 'contacto-error-telefono',
            'mensaje': 'contacto-error-mensaje'
        };
        const inputMap = {
            'nombre': 'contacto-nombre',
            'telefono': 'contacto-telefono',
            'mensaje': 'contacto-mensaje'
        };
        
        const error = document.getElementById(errorMap[campo]);
        const input = document.getElementById(inputMap[campo]);
        
        if (error && input) {
            error.className = 'mensaje-error';
            error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`;
            input.style.borderColor = '#dc2626';
            input.style.backgroundColor = '#fef2f2';
            input.focus();
        }
    };

    // ============================================
    // FUNCIONES DE AYUDA Y CONTACTO
    // ============================================
    window.registrarContactoOutlet = async function(datos) {
        console.log('📝 Registrando contacto:', datos);
        
        try {
            // Validar datos mínimos
            if (!datos.nombre || !datos.telefono) {
                console.error('❌ Nombre y teléfono son obligatorios');
                return { success: false, error: 'Nombre y teléfono son obligatorios' };
            }
            
            // Sanitizar datos
            const nombreSanitizado = sanitizarTexto(datos.nombre);
            const telefonoSanitizado = sanitizarTelefono(datos.telefono);
            const mensajeSanitizado = datos.mensaje ? sanitizarTexto(datos.mensaje) : null;
            const emailSanitizado = datos.email ? sanitizarEmail(datos.email) : null;
            const origenSanitizado = datos.origen ? sanitizarTexto(datos.origen) : 'outlet';
            
            // Obtener pais
            const pais = datos.pais || '51';
            const configPais = PAISES_CONFIG[pais];
            const prefijo = configPais ? configPais.prefijo : '+51';
            const telefonoCompleto = `${prefijo} ${telefonoSanitizado}`;
            
            // Obtener IP del cliente
            let ipCliente = '0.0.0.0';
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                ipCliente = data.ip;
            } catch (e) {
                console.warn('⚠️ No se pudo obtener IP');
            }
            
            // Obtener mejor asesor disponible
            let asesorId = null;
            let asesorNombre = 'No asignado';
            let asesorTelefono = '';
            
            if (asesoresPrecargados && asesoresPrecargados.length > 0) {
                const mejorAsesor = obtenerMejorAsesor(asesoresPrecargados);
                if (mejorAsesor) {
                    asesorId = mejorAsesor.id;
                    asesorNombre = mejorAsesor.nombre || 'Asesor';
                    asesorTelefono = mejorAsesor.telefono || '';
                    console.log('👤 Asesor asignado:', asesorNombre);
                }
            }
            
            // ✅ PROCESAR UBICACIÓN - Asegurar que sea texto
            let ubicacionTexto = null;
            if (datos.ubicacion) {
                if (typeof datos.ubicacion === 'string') {
                    ubicacionTexto = datos.ubicacion;
                } else if (typeof datos.ubicacion === 'object') {
                    // Extraer texto del objeto
                    ubicacionTexto = datos.ubicacion.ubicacion || 
                                    datos.ubicacion.completo || 
                                    datos.ubicacion.texto ||
                                    JSON.stringify(datos.ubicacion);
                }
            }
            
            const contacto = {
                nombre: nombreSanitizado,
                telefono: telefonoSanitizado,
                telefono_completo: telefonoCompleto,
                codigo_pais: pais,
                email: emailSanitizado,
                mensaje: mensajeSanitizado,
                origen: origenSanitizado,
                ubicacion: ubicacionTexto,  // ✅ TEXTO DE UBICACIÓN
                tipo_consulta: datos.tipoConsulta || 'información',
                asesor_asignado_id: asesorId,
                estado: 'PENDIENTE',
                ip_cliente: ipCliente,
                user_agent: navigator.userAgent,
                creado_el: new Date().toISOString()
            };
            
            console.log('📦 Guardando contacto:', {
                nombre: contacto.nombre,
                telefono: contacto.telefono,
                ubicacion: contacto.ubicacion
            });
            
            // Guardar en Supabase
            const { data, error } = await window.supabaseClient
                .from('contactos_outlet')
                .insert(contacto)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Error guardando contacto:', error);
                return { success: false, error: error.message };
            }
            
            console.log('✅ Contacto registrado:', data);
            
            // Actualizar contador del asesor
            if (asesorId) {
                try {
                    const { data: vendedor } = await window.supabaseClient
                        .from('vendedores')
                        .select('leads_asignados')
                        .eq('id', asesorId)
                        .single();
                    
                    if (vendedor) {
                        await window.supabaseClient
                            .from('vendedores')
                            .update({
                                leads_asignados: (vendedor.leads_asignados || 0) + 1,
                                ultima_asignacion: new Date().toISOString()
                            })
                            .eq('id', asesorId);
                    }
                } catch (err) {
                    console.error('Error actualizando contador:', err);
                }
            }
            
            return { 
                success: true, 
                data,
                asesor: {
                    id: asesorId,
                    nombre: asesorNombre,
                    telefono: asesorTelefono
                }
            };
            
        } catch (error) {
            console.error('❌ Error en registrarContactoOutlet:', error);
            return { success: false, error: error.message };
        }
    };

    // Exponer función globalmente
    window.registrarContactoOutlet = registrarContactoOutlet;

    window.mostrarModalAsesorAsignado = function(asesor, contacto) {
        return new Promise((resolve) => {
            const nombreAsesor = asesor?.nombre || 'uno de nuestros asesores';
            const telefonoAsesor = asesor?.telefono || '';
            const nombreCliente = contacto?.nombre || 'Cliente';
            
            const modalHtml = `
                <div id="modalAsesorAsignado" class="modal-asesor-asignado show">
                    <div class="modal-asesor-asignado-contenido">
                        <!-- Icono animado -->
                        <div class="modal-asesor-asignado-icono">
                            <i class="fas fa-user-check"></i>
                        </div>
                        
                        <!-- Título -->
                        <h3>¡Asesor asignado!</h3>
                        
                        <!-- Mensaje personalizado -->
                        <p class="mensaje-bienvenida">
                            <strong>${escapeHtml(nombreCliente)}</strong>, te hemos asignado a <strong>${escapeHtml(nombreAsesor)}</strong>
                        </p>
                        
                        <!-- Tarjeta del asesor -->
                        <div class="asesor-info-card">
                            <div class="asesor-avatar">
                                ${nombreAsesor.charAt(0).toUpperCase()}
                            </div>
                            <div class="asesor-datos">
                                <div class="asesor-nombre">${escapeHtml(nombreAsesor)}</div>
                                ${telefonoAsesor ? `<div class="asesor-telefono"><i class="fas fa-phone"></i> ${escapeHtml(telefonoAsesor)}</div>` : ''}
                                <div class="asesor-estado">
                                    <span class="estado-dot"></span>
                                    Disponible ahora
                                </div>
                            </div>
                        </div>
                        
                        <!-- Mensaje de acción -->
                        <div class="modal-acciones-info">
                            <div class="info-item">
                                <span>Te contactaremos por WhatsApp</span>
                            </div>
                            <div class="info-item">
                                <span>El asesor te atenderá en breve</span>
                            </div>
                        </div>
                        
                        <!-- Botones -->
                        <div class="modal-asesor-botones">
                            <button class="btn-cerrar-asesor" onclick="window.cerrarModalAsesorAsignado()">
                                <i class="fas fa-check"></i> Entendido
                            </button>
                            <button class="btn-whatsapp-asesor" onclick="window.abrirWhatsAppAsesorDirecto()">
                                <i class="fab fa-whatsapp"></i> Enviar mensaje ahora
                            </button>
                        </div>
                        
                        <!-- Barra de progreso -->
                        <div class="modal-progreso">
                            <span>Abriendo WhatsApp...</span>
                            <div class="progreso-barra">
                                <div class="progreso-llenado" style="width: 0%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Eliminar modal anterior
            const modalExistente = document.getElementById('modalAsesorAsignado');
            if (modalExistente) modalExistente.remove();
            
            // Insertar modal
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Animación de progreso
            let progreso = 0;
            const intervalo = setInterval(() => {
                progreso += 2;
                const barra = document.querySelector('.progreso-llenado');
                const texto = document.querySelector('.modal-progreso span');
                
                if (barra) {
                    barra.style.width = `${Math.min(progreso, 100)}%`;
                }
                
                if (texto && progreso < 100) {
                    texto.textContent = `Abriendo WhatsApp... ${Math.min(progreso, 100)}%`;
                } else if (texto && progreso >= 100) {
                    texto.textContent = '¡Listo! El asesor te espera';
                }
                
                if (progreso >= 100) {
                    clearInterval(intervalo);
                }
            }, 100);
            
            // Resolver cuando se cierre
            const modal = document.getElementById('modalAsesorAsignado');
            const observer = new MutationObserver(() => {
                if (!modal || !modal.classList.contains('show')) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
            
            // Fallback: resolver después de 30 segundos
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 30000);
        });
    };


    // ============================================
    // ABRIR WHATSAPP DIRECTAMENTE CON EL ASESOR
    // ============================================

    window.abrirWhatsAppAsesorDirecto = function() {
        // Obtener el número del asesor desde el modal o desde la variable global
        const telefonoAsesor = window.asesorActual?.telefono?.replace(/\D/g, '') || '51987654321';
        let whatsappNumber = telefonoAsesor;
        if (whatsappNumber.length === 9) {
            whatsappNumber = `51${whatsappNumber}`;
        }
        
        const mensaje = encodeURIComponent(
            `Hola, soy ${window.clienteActual?.nombre || 'un cliente'}. Me acaban de asignar como asesor en el Outlet.`
        );
        
        window.open(`https://wa.me/${whatsappNumber}?text=${mensaje}`, '_blank');
    };

    window.cerrarModalAsesorAsignado = function() {
        const modal = document.getElementById('modalAsesorAsignado');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) modal.remove();
            }, 400);
        }
    };

    window.abrirWhatsAppAsesor = async function() {
        console.log('📱 Abriendo WhatsApp con asesor');
        
        // ✅ 1. Mostrar indicador de carga
        mostrarToast('⏳ Registrando tu consulta...', 'info');
        
        // ✅ 2. Obtener datos del contacto
        const datosContacto = await window.mostrarModalContactoRapido('WhatsApp');
        
        if (!datosContacto) {
            console.log('❌ Usuario canceló el registro');
            return;
        }
        
        // ✅ 3. Guardar datos del cliente para uso posterior
        window.clienteActual = {
            nombre: datosContacto.nombre,
            telefono: datosContacto.telefono
        };
        
        // ✅ 4. Obtener ubicación
        let ubicacionTexto = 'No especificada';
        try {
            const ubicacionData = await obtenerUbicacionPorIP();
            if (typeof ubicacionData === 'string') {
                ubicacionTexto = ubicacionData;
            } else if (typeof ubicacionData === 'object') {
                ubicacionTexto = ubicacionData.ubicacion || ubicacionData.completo || 'No especificada';
            }
            console.log('📍 Ubicación detectada:', ubicacionTexto);
        } catch (error) {
            console.warn('⚠️ No se pudo obtener ubicación:', error);
        }
        
        // ✅ 5. Detectar origen
        const origen = window.detectarOrigenContacto() || 'Web - Outlet Online';
        
        // ✅ 6. Registrar contacto en Supabase
        const resultado = await window.registrarContactoOutlet({
            nombre: datosContacto.nombre,
            telefono: datosContacto.telefono,
            email: datosContacto.email || null,
            mensaje: datosContacto.mensaje,
            tipoConsulta: 'información',
            origen: origen,
            ubicacion: ubicacionTexto,
            pais: datosContacto.pais
        });
        
        if (!resultado.success) {
            console.error('❌ Error registrando contacto:', resultado.error);
            mostrarToast('❌ Error al registrar tu consulta. Intenta nuevamente.', 'error');
            return;
        }
        
        // ✅ 7. Guardar asesor actual
        window.asesorActual = resultado.asesor;
        
        // ✅ 8. MOSTRAR MODAL DE ASESOR ASIGNADO INMEDIATAMENTE
        // El modal se muestra antes de abrir WhatsApp
        await window.mostrarModalAsesorAsignado(resultado.asesor, {
            nombre: datosContacto.nombre
        });
        
        // ✅ 9. Construir mensaje de WhatsApp (se envía en segundo plano)
        const mensajeWhatsApp = construirMensajeWhatsAppEstructura({
            nombre: datosContacto.nombre,
            telefono: datosContacto.telefono,
            telefonoFormateado: datosContacto.telefonoFormateado,
            email: datosContacto.email || null,
            mensaje: datosContacto.mensaje,
            origen: origen,
            ubicacion: ubicacionTexto,
            pais: datosContacto.pais,
            asesor: resultado.asesor?.nombre || 'Asesor asignado',
            fecha: new Date().toLocaleString('es-PE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
        });
        
        // ✅ 10. Abrir WhatsApp DESPUÉS de mostrar el modal
        // Pequeño delay para que el usuario vea el modal primero
        setTimeout(() => {
            const telefonoAsesor = resultado.asesor?.telefono?.replace(/\D/g, '') || '51987654321';
            let whatsappNumber = telefonoAsesor;
            if (whatsappNumber.length === 9) {
                whatsappNumber = `51${whatsappNumber}`;
            }
            
            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank');
            window.cerrarModalSinResultados?.();
        }, 500);
    };    

    // ============================================
    // CONSTRUIR MENSAJE DE WHATSAPP - ESTRUCTURA DEFINIDA
    // ============================================

    function construirMensajeWhatsAppEstructura(datos) {
        const {
            nombre,
            telefono,
            telefonoFormateado,
            email,
            mensaje,
            origen,
            ubicacion,
            pais,
            asesor,
            fecha,
            tipo = 'contacto' // 'contacto' o 'cotizacion'
        } = datos;
        
        // Obtener información del país
        const configPais = PAISES_CONFIG[pais];
        const nombrePais = configPais ? configPais.nombre : 'Desconocido';
        const prefijoPais = configPais ? configPais.prefijo : '+51';
        
        const telefonoMostrar = telefonoFormateado || `${prefijoPais} ${telefono}`;
        
        // Título según el tipo
        const titulo = tipo === 'cotizacion' 
            ? '*NUEVA COTIZACIÓN - OUTLET GALLOS MÁRMOL*'
            : '*NUEVO CONTACTO - OUTLET GALLOS MÁRMOL*';
        
        let mensajeCompleto = `${titulo}\n\n`;
        mensajeCompleto += `*Cliente:* ${nombre}\n`;
        mensajeCompleto += `*Teléfono:* ${telefonoMostrar}\n`;
        mensajeCompleto += `*País:* ${nombrePais} (${pais})\n`;
        
        if (email && email.trim() !== '') {
            mensajeCompleto += `*Email:* ${email}\n`;
        }
        
        mensajeCompleto += `*Origen:* ${origen || 'Web - Outlet Online'}\n`;
        
        // ✅ Agregar ubicación solo si existe y no es "No especificada"
        let ubicacionTexto = 'No especificada';
        if (ubicacion) {
            if (typeof ubicacion === 'string') {
                ubicacionTexto = ubicacion;
            } else if (typeof ubicacion === 'object' && ubicacion.ubicacion) {
                ubicacionTexto = ubicacion.ubicacion;
            } else if (typeof ubicacion === 'object' && ubicacion.completo) {
                ubicacionTexto = ubicacion.completo;
            }
        }
        
        if (ubicacionTexto && ubicacionTexto !== 'No especificada') {
            mensajeCompleto += `*Ubicación:* ${ubicacionTexto}\n`;
        }
        
        mensajeCompleto += `\n*Consulta:*\n${mensaje}\n\n`;
        mensajeCompleto += `*Fecha:* ${fecha}\n\n`;
        mensajeCompleto += `---\n`;
        mensajeCompleto += `Este ${tipo === 'cotizacion' ? 'cotización' : 'contacto'} fue asignado automáticamente a través del sistema.`;
        
        return mensajeCompleto;
    }

    async function obtenerUbicacionParaCotizacion() {
        try {
            const ubicacionData = await obtenerUbicacionPorIP();
            if (typeof ubicacionData === 'string') {
                return ubicacionData;
            } else if (typeof ubicacionData === 'object') {
                return ubicacionData.ubicacion || ubicacionData.completo || 'No especificada';
            }
            return 'No especificada';
        } catch (error) {
            console.warn('⚠️ No se pudo obtener ubicación:', error);
            return 'No especificada';
        }
    }

    // ============================================
    // DETECTAR ORIGEN DEL CONTACTO
    // ============================================

    window.detectarOrigenContacto = function() {
        const urlParams = new URLSearchParams(window.location.search);
        const seccion = urlParams.get('seccion');
        const origen = urlParams.get('origen');
        
        // 1. Verificar origen desde URL
        if (origen) {
            const origenes = {
                'facebook': 'Redes Sociales - Facebook',
                'instagram': 'Redes Sociales - Instagram',
                'email': 'Email Marketing',
                'whatsapp': 'WhatsApp',
                'google': 'Google Ads',
                'catalogo': 'Catálogo Online',
                'tienda': 'Tienda Física - Outlet'
            };
            return origenes[origen] || `Web - ${origen}`;
        }
        
        // 2. Verificar sección actual
        if (seccion === 'outlet') {
            return 'Web - Outlet';
        }
        
        // 3. Verificar si es móvil
        if (window.innerWidth <= 768) {
            return 'Móvil - Outlet';
        }
        
        // 4. Verificar si está en el catálogo
        if (window.location.pathname.includes('/catalogo')) {
            return 'Catálogo Online';
        }
        
        // 5. Origen por defecto
        return 'Web - Outlet';
    };

    // ============================================
    // FUNCIONES DE PRECARGA Y OBTENCIÓN
    // ============================================
    async function precargarAsesoresOutlet() {
        if (asesoresPrecargados && asesoresPrecargados.length > 0) {
            return asesoresPrecargados;
        }
        
        try {
            console.log('🔄 Precargando asesores...');
            const { data: vendedores } = await window.supabaseClient
                .from('vendedores')
                .select('id, nombre, telefono, email, leads_asignados, max_leads_diarios, activo')
                .eq('activo', true)
                .eq('atiende_outlet', true)
                .order('leads_asignados');
            
            asesoresPrecargados = vendedores || [];
            console.log('✅ Asesores precargados:', asesoresPrecargados.length);
            
            // ✅ RESETEAR ÍNDICE DE ROTACIÓN
            ultimoAsesorIndex = -1;
            
            return asesoresPrecargados;
        } catch (error) {
            console.error('Error precargando asesores:', error);
            asesoresPrecargados = [];
            return [];
        }
    }

    window.precargarAsesoresOutlet = precargarAsesoresOutlet;

    // ✅ Variable para controlar la rotación
    let ultimoAsesorIndex = -1;

    function obtenerMejorAsesor(vendedores) {
        if (!vendedores || vendedores.length === 0) return null;
        
        // Si solo hay un asesor, devolverlo
        if (vendedores.length === 1) return vendedores[0];
        
        // 1. Encontrar el mínimo de leads asignados
        const minLeads = Math.min(...vendedores.map(v => v.leads_asignados || 0));
        
        // 2. Filtrar asesores con el mínimo de leads
        const asesoresDisponibles = vendedores.filter(v => (v.leads_asignados || 0) === minLeads);
        
        // 3. Si hay múltiples con el mismo mínimo, rotar entre ellos
        if (asesoresDisponibles.length > 1) {
            // Incrementar índice y rotar
            ultimoAsesorIndex = (ultimoAsesorIndex + 1) % asesoresDisponibles.length;
            console.log(`🔄 Rotando entre ${asesoresDisponibles.length} asesores (índice: ${ultimoAsesorIndex})`);
            return asesoresDisponibles[ultimoAsesorIndex];
        }
        
        // 4. Si solo uno tiene el mínimo, devolverlo
        return asesoresDisponibles[0];
    }

    // Exponer la función
    window.obtenerMejorAsesor = obtenerMejorAsesor;    

    function obtenerPlaceholderTelefono(pais) {
        const placeholders = {
            '51': '987654321', '1': '2125551234', '52': '5512345678',
            '54': '1123456789', '56': '912345678', '57': '3123456789',
            '58': '4123456789', '591': '71234567', '593': '912345678',
            '595': '912345678', '598': '91234567', '55': '11912345678',
            '34': '612345678', '44': '7123456789', '33': '612345678',
            '49': '15123456789', '39': '3123456789', '81': '9012345678',
            '61': '412345678', '27': '821234567'
        };
        return placeholders[pais] || '123456789';
    }
    window.obtenerPlaceholderTelefono = obtenerPlaceholderTelefono;

    function generarOpcionesPaises(paisSeleccionado) {
        const paises = Object.keys(PAISES_CONFIG).map(codigo => ({
            codigo: codigo,
            nombre: PAISES_CONFIG[codigo].nombre,
            bandera: obtenerBandera(codigo)
        }));
        
        return paises.map(p => `
            <option value="${p.codigo}" ${p.codigo === paisSeleccionado ? 'selected' : ''}>
                ${p.bandera} +${p.codigo} (${p.nombre})
            </option>
        `).join('');
    }

    function obtenerBandera(codigo) {
        const banderas = {
            '51': '🇵🇪', '1': '🇺🇸', '52': '🇲🇽', '54': '🇦🇷', '56': '🇨🇱',
            '57': '🇨🇴', '58': '🇻🇪', '591': '🇧🇴', '593': '🇪🇨', '595': '🇵🇾',
            '598': '🇺🇾', '55': '🇧🇷', '34': '🇪🇸', '351': '🇵🇹', '33': '🇫🇷',
            '49': '🇩🇪', '39': '🇮🇹', '44': '🇬🇧', '31': '🇳🇱', '32': '🇧🇪',
            '41': '🇨🇭', '43': '🇦🇹', '45': '🇩🇰', '46': '🇸🇪', '47': '🇳🇴',
            '358': '🇫🇮', '30': '🇬🇷', '90': '🇹🇷', '7': '🇷🇺', '48': '🇵🇱',
            '420': '🇨🇿', '36': '🇭🇺', '81': '🇯🇵', '82': '🇰🇷', '86': '🇨🇳',
            '91': '🇮🇳', '60': '🇲🇾', '62': '🇮🇩', '63': '🇵🇭', '65': '🇸🇬',
            '66': '🇹🇭', '84': '🇻🇳', '971': '🇦🇪', '966': '🇸🇦', '972': '🇮🇱',
            '964': '🇮🇶', '98': '🇮🇷', '61': '🇦🇺', '64': '🇳🇿', '27': '🇿🇦',
            '212': '🇲🇦', '234': '🇳🇬', '254': '🇰🇪', '233': '🇬🇭', '256': '🇺🇬',
            '258': '🇲🇿', '20': '🇪🇬', '216': '🇹🇳', '213': '🇩🇿', '218': '🇱🇾',
            '502': '🇬🇹', '503': '🇸🇻', '504': '🇭🇳', '505': '🇳🇮', '506': '🇨🇷',
            '507': '🇵🇦', '53': '🇨🇺', '1787': '🇵🇷', '809': '🇩🇴', '1809': '🇩🇴',
            '675': '🇵🇬', '687': '🇳🇨'
        };
        return banderas[codigo] || '🌍';
    }

    window.generarOpcionesPaises = generarOpcionesPaises;

    // ============================================
    // FUNCIONES DE CARGA DE IMÁGENES
    // ============================================
    function cargarImagenConLazy(imgElement, url) {
        if (!imgElement) return;
        imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E';
        imgElement.style.background = '#f0f0f0';
        const imagen = new Image();
        imagen.onload = () => { imgElement.src = url; imgElement.style.background = 'transparent'; };
        imagen.onerror = () => { imgElement.src = CONFIG.DEFAULT_IMAGE; imgElement.style.background = 'transparent'; };
        imagen.src = url;
    }

    function inicializarLazyLoading() {
        if ('IntersectionObserver' in window) {
            observerImagenes = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const dataSrc = img.getAttribute('data-src');
                        if (dataSrc) {
                            cargarImagenConLazy(img, dataSrc);
                            observerImagenes.unobserve(img);
                        }
                    }
                });
            }, { rootMargin: '50px', threshold: CONFIG.IMAGE_LAZY_LOAD_THRESHOLD });
            document.querySelectorAll('img[data-src]').forEach(img => observerImagenes.observe(img));
        } else {
            document.querySelectorAll('img[data-src]').forEach(img => cargarImagenConLazy(img, img.getAttribute('data-src')));
        }
    }
    window.inicializarLazyLoading = inicializarLazyLoading;

    // ============================================
    // FUNCIONES DE BÚSQUEDA
    // ============================================
    function configurarBusquedaOutlet() {
        const searchInput = document.getElementById('searchOutlet');
        if (!searchInput) return;
        let timeoutBusqueda = null;
        window.limpiarCampoBusqueda = function() {
            searchInput.value = '';
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
            if (typeof window.aplicarFiltrosOutlet === 'function') window.aplicarFiltrosOutlet();
            searchInput.focus();
        };
        searchInput.addEventListener('input', function(e) {
            if (timeoutBusqueda) clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                if (typeof window.aplicarFiltrosOutlet === 'function') window.aplicarFiltrosOutlet();
                timeoutBusqueda = null;
            }, 300);
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { e.preventDefault(); window.limpiarCampoBusqueda(); }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (timeoutBusqueda) { clearTimeout(timeoutBusqueda); timeoutBusqueda = null; }
                if (typeof window.aplicarFiltrosOutlet === 'function') window.aplicarFiltrosOutlet();
            }
        });
        const btnLimpiar = document.getElementById('btnLimpiarBusqueda');
        if (btnLimpiar) {
            const nuevoBtn = btnLimpiar.cloneNode(true);
            btnLimpiar.parentNode.replaceChild(nuevoBtn, btnLimpiar);
            nuevoBtn.addEventListener('click', function(e) { e.preventDefault(); window.limpiarCampoBusqueda(); });
        }
        const btnLimpiarExt = document.getElementById('btnLimpiarBusquedaExterno');
        if (btnLimpiarExt) {
            const nuevoBtn = btnLimpiarExt.cloneNode(true);
            btnLimpiarExt.parentNode.replaceChild(nuevoBtn, btnLimpiarExt);
            nuevoBtn.addEventListener('click', function(e) { e.preventDefault(); window.limpiarCampoBusqueda(); });
        }
    }
    window.configurarBusquedaOutlet = configurarBusquedaOutlet;

    // ============================================
    // FUNCIONES DE CONFIGURACIÓN DE TELÉFONO
    // ============================================
    window.configurarInputTelefono = function() {
        const telefonoInput = document.getElementById('cliente-telefono-modal');
        const prefijoSelect = document.getElementById('prefijo-pais');
        if (!telefonoInput) return;
        let ayudaDiv = document.getElementById('telefono-ayuda');
        if (!ayudaDiv) {
            ayudaDiv = document.createElement('div');
            ayudaDiv.id = 'telefono-ayuda';
            ayudaDiv.className = 'telefono-ayuda';
            telefonoInput.parentNode.appendChild(ayudaDiv);
        }
        let advertenciaDiv = document.getElementById('telefono-advertencia');
        if (!advertenciaDiv) {
            advertenciaDiv = document.createElement('div');
            advertenciaDiv.id = 'telefono-advertencia';
            advertenciaDiv.className = 'telefono-advertencia';
            telefonoInput.parentNode.appendChild(advertenciaDiv);
        }
        telefonoInput.addEventListener('input', function(e) {
            const valor = this.value;
            const pais = prefijoSelect?.value || '51';
            const config = PAISES_CONFIG[pais];
            if (config) {
                ayudaDiv.innerHTML = `<span class="ayuda-formato"><i class="fas fa-info-circle"></i> Formato ${config.nombre}: ${config.descripcion}</span>`;
                ayudaDiv.style.display = 'block';
            }
            const resultado = validarTelefonoAvanzado(valor, pais);
            const errorDiv = document.getElementById('error-telefono');
            if (resultado.valido) {
                this.style.borderColor = '#10b981';
                this.style.backgroundColor = '#f0fdf4';
                this.className = 'tel-valid';
                if (errorDiv) { errorDiv.className = 'mensaje-error hidden'; errorDiv.textContent = ''; }
                window.clienteTelefonoCache = resultado.telefonoLimpio;
                ayudaDiv.innerHTML = `<span class="ayuda-formato valido"><i class="fas fa-check-circle"></i> ${resultado.telefonoFormateado}</span>`;
                if (resultado.advertencias.length > 0) {
                    advertenciaDiv.style.display = 'block';
                    advertenciaDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${resultado.advertencias.join('<br>')}`;
                    this.style.borderColor = '#f59e0b';
                    this.style.backgroundColor = '#fffbeb';
                    this.className = 'tel-warning';
                } else {
                    advertenciaDiv.style.display = 'none';
                }
            } else {
                this.style.borderColor = '#dc2626';
                this.style.backgroundColor = '#fef2f2';
                this.className = 'tel-invalid';
                if (errorDiv) {
                    errorDiv.className = 'mensaje-error';
                    errorDiv.textContent = resultado.errores[0] || 'Teléfono inválido';
                    errorDiv.style.color = '#dc2626';
                }
                window.clienteTelefonoCache = '';
                advertenciaDiv.style.display = 'none';
            }
        });
    };

    window.actualizarPlaceholderTelefono = function() {
        const prefijoSelect = document.getElementById('prefijo-pais');
        const telefonoInput = document.getElementById('cliente-telefono-modal');
        if (!prefijoSelect || !telefonoInput) return;
        telefonoInput.placeholder = window.obtenerPlaceholderTelefono(prefijoSelect.value);
    };

    window.guardarPaisSeleccionado = function(pais) {
        window.paisSeleccionadoCache = pais;
        const config = PAISES_CONFIG[pais];
        const ayudaDiv = document.getElementById('telefono-ayuda');
        if (ayudaDiv && config) {
            ayudaDiv.innerHTML = `<span class="ayuda-formato"><i class="fas fa-info-circle"></i> Formato ${config.nombre}: ${config.descripcion}</span>`;
            ayudaDiv.style.display = 'block';
        }
        const telefonoInput = document.getElementById('cliente-telefono-modal');
        if (telefonoInput) telefonoInput.placeholder = window.obtenerPlaceholderTelefono(pais);
        const telefonoActual = telefonoInput?.value || '';
        if (telefonoActual.length > 0) window.validarCampoTelefono?.(telefonoActual);
    };

    // ============================================
    // FUNCIONES DE QR
    // ============================================
    window.iniciarEscaneoQR = async function() {
        if (iniciandoEscaneo || escaneoActivo) return;
        iniciandoEscaneo = true;
        const modalQR = document.getElementById('modalQR');
        const readerElement = document.getElementById('qr-reader');
        if (!modalQR || !readerElement) {
            iniciandoEscaneo = false;
            mostrarModal('Error', 'No se pudo abrir el escáner', 'error');
            return;
        }
        readerElement.innerHTML = '';
        modalQR.style.display = 'flex';
        modalQR.classList.add('active');
        document.body.style.overflow = 'hidden';
        try {
            html5QrCode = new Html5Qrcode("qr-reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    window.cerrarModalQR();
                    const searchInput = document.getElementById('searchOutlet');
                    if (searchInput) {
                        searchInput.value = decodedText;
                        const event = new Event('input', { bubbles: true });
                        searchInput.dispatchEvent(event);
                        setTimeout(() => { if (typeof window.aplicarFiltrosOutlet === 'function') window.aplicarFiltrosOutlet(); }, 100);
                    }
                    mostrarModal('Código encontrado', `Se encontró: ${decodedText}`, 'success', { timer: 2000, showConfirmButton: false });
                },
                (errorMessage) => {}
            );
            escaneoActivo = true;
            iniciandoEscaneo = false;
        } catch (err) {
            modalQR.style.display = 'none';
            modalQR.classList.remove('active');
            document.body.style.overflow = '';
            let mensajeError = 'No se pudo acceder a la cámara.';
            if (err.message?.includes('NotAllowedError')) mensajeError = 'Permiso denegado para acceder a la cámara.';
            else if (err.message?.includes('NotFoundError')) mensajeError = 'No se encontró una cámara.';
            mostrarModal('Error de cámara', mensajeError, 'error');
            html5QrCode = null;
            escaneoActivo = false;
            iniciandoEscaneo = false;
            readerElement.innerHTML = '';
        }
    };

    window.cerrarModalQR = function() {
        if (html5QrCode && escaneoActivo) {
            try {
                html5QrCode.stop().then(() => {
                    escaneoActivo = false;
                    html5QrCode = null;
                    const readerElement = document.getElementById('qr-reader');
                    if (readerElement) readerElement.innerHTML = '';
                }).catch(() => { escaneoActivo = false; html5QrCode = null; });
            } catch(e) { escaneoActivo = false; html5QrCode = null; }
        }
        iniciandoEscaneo = false;
        const modalQR = document.getElementById('modalQR');
        if (modalQR) {
            modalQR.style.display = 'none';
            modalQR.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    function configurarEventosQR() {
        const btnCerrarQR = document.getElementById('btnCerrarQR');
        const btnCancelarQR = document.getElementById('btnCancelarQR');
        if (btnCerrarQR) {
            const nuevoBtn = btnCerrarQR.cloneNode(true);
            btnCerrarQR.parentNode.replaceChild(nuevoBtn, btnCerrarQR);
            nuevoBtn.addEventListener('click', window.cerrarModalQR);
        }
        if (btnCancelarQR) {
            const nuevoBtn = btnCancelarQR.cloneNode(true);
            btnCancelarQR.parentNode.replaceChild(nuevoBtn, btnCancelarQR);
            nuevoBtn.addEventListener('click', window.cerrarModalQR);
        }
    }
    window.configurarEventosQR = configurarEventosQR;

    // ============================================
    // FUNCIONES DE FILTROS Y CARDS
    // ============================================
    function actualizarChipsFiltrosActivos() {
        const container = document.getElementById('filtrosActivosChips');
        if (!container) return;
        const filtros = [];
        const familiaSelect = document.getElementById('filtroFamilia');
        const acabadoSelect = document.getElementById('filtroAcabado');
        const materialSelect = document.getElementById('filtroMaterial');
        const searchInput = document.getElementById('searchOutlet');
        if (familiaSelect && familiaSelect.value && familiaSelect.value !== '') {
            const text = familiaSelect.options[familiaSelect.selectedIndex]?.text || familiaSelect.value;
            filtros.push({ key: 'familia', value: familiaSelect.value, label: text, type: 'familia' });
        }
        if (acabadoSelect && acabadoSelect.value && acabadoSelect.value !== '') {
            const text = acabadoSelect.options[acabadoSelect.selectedIndex]?.text || acabadoSelect.value;
            filtros.push({ key: 'acabado', value: acabadoSelect.value, label: text, type: 'acabado' });
        }
        if (materialSelect && materialSelect.value && materialSelect.value !== '') {
            const text = materialSelect.options[materialSelect.selectedIndex]?.text || materialSelect.value;
            filtros.push({ key: 'material', value: materialSelect.value, label: text, type: 'material' });
        }
        if (searchInput && searchInput.value && searchInput.value.trim() !== '') {
            filtros.push({ key: 'busqueda', value: searchInput.value, label: `"${searchInput.value}"`, type: 'busqueda' });
        }
        if (filtros.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = filtros.map(f => `
            <span class="chip-filtro">${f.label}<button onclick="window.eliminarFiltro('${f.type}')" class="chip-eliminar"><i class="fas fa-times"></i></button></span>
        `).join('');
    }
    window.actualizarChipsFiltrosActivos = actualizarChipsFiltrosActivos;

    function actualizarBadgesFiltros(activos) {
        const badge = document.getElementById('filtrosBadge');
        if (badge) {
            if (activos > 0) {
                badge.textContent = activos;
                badge.style.display = 'inline-block';
                setTimeout(() => { badge.style.animation = 'badgePulse 0.4s ease'; }, 10);
            } else { badge.style.display = 'none'; }
        }
        const badgeMobile = document.getElementById('filtrosBadgeMobile');
        if (badgeMobile) {
            if (activos > 0) {
                badgeMobile.textContent = activos;
                badgeMobile.style.display = 'flex';
            } else { badgeMobile.style.display = 'none'; }
        }
    }
    window.actualizarBadgesFiltros = actualizarBadgesFiltros;

    window.generarCardsOutlet = function(productosLista) {
        if (!productosLista || productosLista.length === 0) {
            setTimeout(() => {
                if (typeof window.mostrarModalSinResultados === 'function') {
                    window.mostrarModalSinResultados();
                }
            }, 1500);
            return `
                <div class="no-results">
                    <i class="fas fa-box-open"></i>
                    <p>No hay productos que coincidan con los filtros</p>
                    <button onclick="window.limpiarFiltrosOutlet()" class="btn-primary" style="margin-top:16px;padding:12px 24px;background:#6b0000;color:white;border:none;border-radius:40px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-undo"></i> Limpiar filtros
                    </button>
                    <div style="margin-top:20px;padding:16px;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
                        <p style="font-size:0.85rem;color:#1e40af;margin:0;">
                            <i class="fas fa-info-circle" style="margin-right:8px;"></i>
                            ¿No encuentras lo que buscas? 
                            <a href="#" onclick="window.abrirWhatsAppAsesor(); return false;" style="color:#2563eb;font-weight:600;text-decoration:underline;cursor:pointer;">Contáctanos</a>
                            y te ayudaremos a encontrar el producto ideal.
                        </p>
                    </div>
                </div>
            `;
        }
        const seleccionados = window.cotizacionSeleccionados || [];
        return productosLista.map(p => {
            const estaSeleccionado = seleccionados.some(item => item && item.id === p.id);
            const imagenUrl = optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE, 'w300-h300');
            const nombreEscapado = escapeHtml(p.nombre || 'Producto');
            const codigoEscapado = escapeHtml(p.codigo || '');
            const imagenEscapada = escapeHtml(p.imagen_principal || '');
            const slugEscapado = escapeHtml(p.slug || p.id);
            const medidaEscapada = escapeHtml(p.medida || '');
            const espesorEscapado = escapeHtml(p.espesor || '');
            const productId = p.id;
            const btnTexto = estaSeleccionado ? 'Agregado ✓' : 'Cotizar';
            const btnIcono = estaSeleccionado ? 'fa-check-circle' : 'fa-plus-circle';
            const btnClase = estaSeleccionado ? 'btn-cotizar-bottom seleccionado' : 'btn-cotizar-bottom';
            return `
                <div class="producto-card" data-id="${productId}">
                    <div class="card-image" onclick="window.irDetalleProducto('${slugEscapado}')">
                        <img data-src="${imagenUrl}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3C/svg%3E" alt="${nombreEscapado}" loading="lazy" class="lazy-image">
                        ${p.es_outlet ? '<span class="badge-outlet">OUTLET</span>' : ''}
                    </div>
                    <div class="card-info">
                        <h3 onclick="window.irDetalleProducto('${slugEscapado}')" style="cursor:pointer;">${nombreEscapado}</h3>
                        <p class="codigo">${codigoEscapado || 'Sin código'}</p>
                        <div class="specs-badges">
                            ${p.medida ? `<span class="spec-badge"><i class="fas fa-ruler-combined"></i> ${escapeHtml(p.medida)}</span>` : ''}
                            ${p.espesor ? `<span class="spec-badge"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(p.espesor)}</span>` : ''}
                            ${p.material_nombre ? `<span class="spec-badge"><i class="fas fa-cube"></i> ${escapeHtml(p.material_nombre)}</span>` : ''}
                        </div>
                        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
                            <button onclick="window.toggleSeleccionCotizacionWrapper('${productId}', '${nombreEscapado.replace(/'/g, "\\'")}', '${codigoEscapado.replace(/'/g, "\\'")}', '${imagenEscapada.replace(/'/g, "\\'")}', '${slugEscapado.replace(/'/g, "\\'")}', '${medidaEscapada.replace(/'/g, "\\'")}', '${espesorEscapado.replace(/'/g, "\\'")}')" class="${btnClase}" data-id="${productId}">
                                <i class="fas ${btnIcono}"></i> ${btnTexto}
                            </button>
                            <a href="/?producto=${slugEscapado}" class="btn-detalle-enhanced" onclick="event.stopPropagation();">
                                <span>Ver Detalle</span> <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    window.generarCardsOutlet = window.generarCardsOutlet;

    window.irDetalleProducto = function(slug) {
        if (slug) window.location.href = `/?producto=${slug}`;
    };

    window.toggleSeleccionCotizacionWrapper = function(id, nombre, codigo, imagen, slug, medida, espesor) {
        window.toggleSeleccionCotizacion({
            id, nombre, codigo, imagen_principal: imagen, slug, medida, espesor
        });
    };

    window.aplicarFiltrosOutlet = function() {
        const busqueda = document.getElementById('searchOutlet')?.value.toLowerCase().trim() || '';
        const familiaId = document.getElementById('filtroFamilia')?.value;
        const acabadoId = document.getElementById('filtroAcabado')?.value;
        const materialId = document.getElementById('filtroMaterial')?.value;
        let productosData = window.outletProductosCache.map(p => ({ ...p, imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE), slug: p.slug || p.id }));
        let filtrados = [...productosData];
        if (familiaId && familiaId !== '') filtrados = filtrados.filter(p => p.familia_id === familiaId);
        if (acabadoId && acabadoId !== '') filtrados = filtrados.filter(p => p.acabado_id === acabadoId);
        if (materialId && materialId !== '') filtrados = filtrados.filter(p => p.material_id === materialId);
        if (busqueda) filtrados = filtrados.filter(p => (p.nombre || '').toLowerCase().includes(busqueda) || (p.codigo || '').toLowerCase().includes(busqueda) || (p.slug || '').toLowerCase().includes(busqueda));
        const grid = document.getElementById('productosGrid');
        const contador = document.getElementById('contadorProductos');
        if (grid) { grid.innerHTML = window.generarCardsOutlet(filtrados); inicializarLazyLoading(); }
        if (contador) contador.textContent = filtrados.length;
        let activos = 0;
        if (familiaId && familiaId !== '') activos++;
        if (acabadoId && acabadoId !== '') activos++;
        if (materialId && materialId !== '') activos++;
        if (busqueda) activos++;
        actualizarChipsFiltrosActivos();
        actualizarBadgesFiltros(activos);
        const badge = document.getElementById('filtrosBadge');
        if (badge) {
            if (activos > 0) { badge.textContent = activos; badge.style.display = 'inline-block'; }
            else { badge.style.display = 'none'; }
        }
        const badgeMobile = document.getElementById('filtrosBadgeMobile');
        if (badgeMobile) {
            if (activos > 0) { badgeMobile.textContent = activos; badgeMobile.style.display = 'flex'; }
            else { badgeMobile.style.display = 'none'; }
        }
        if (window.innerWidth <= 768) {
            const modal = document.getElementById('filtrosModal');
            if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; }
        }
    };
    window.aplicarFiltrosOutlet = window.aplicarFiltrosOutlet;

    window.limpiarFiltrosOutlet = function() {
        const searchInput = document.getElementById('searchOutlet');
        const familiaSelect = document.getElementById('filtroFamilia');
        const acabadoSelect = document.getElementById('filtroAcabado');
        const materialSelect = document.getElementById('filtroMaterial');
        if (searchInput) searchInput.value = '';
        if (familiaSelect) familiaSelect.value = '';
        if (acabadoSelect) acabadoSelect.value = '';
        if (materialSelect) materialSelect.value = '';
        const btnClear = document.getElementById('btnLimpiarBusqueda');
        if (btnClear) btnClear.style.display = 'none';
        const productosData = window.outletProductosCache.map(p => ({ ...p, imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE), slug: p.slug || p.id }));
        const grid = document.getElementById('productosGrid');
        const contador = document.getElementById('contadorProductos');
        if (grid) { grid.innerHTML = window.generarCardsOutlet(productosData); inicializarLazyLoading(); }
        if (contador) contador.textContent = productosData.length;
        const badge = document.getElementById('filtrosBadge');
        if (badge) badge.style.display = 'none';
        const badgeMobile = document.getElementById('filtrosBadgeMobile');
        if (badgeMobile) badgeMobile.style.display = 'none';
        actualizarChipsFiltrosActivos();
        actualizarBadgesFiltros(0);
        if (window.innerWidth <= 768) {
            const modal = document.getElementById('filtrosModal');
            if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; }
        }
    };
    window.limpiarFiltrosOutlet = window.limpiarFiltrosOutlet;

    window.eliminarFiltro = function(tipo) {
        if (tipo === 'busqueda') {
            const searchInput = document.getElementById('searchOutlet');
            if (searchInput) searchInput.value = '';
            const btnClear = document.getElementById('btnLimpiarBusqueda');
            if (btnClear) btnClear.style.display = 'none';
        } else {
            const select = document.getElementById(`filtro${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
            if (select) select.value = '';
        }
        window.aplicarFiltrosOutlet();
    };

    // ============================================
    // FUNCIONES DE MODALES DE FILTROS
    // ============================================
    window.openFiltrosModal = function() {
        if (window.innerWidth > 768) return;
        const modal = document.getElementById('filtrosModal');
        const overlay = document.getElementById('filtrosModalOverlay');
        if (overlay) { overlay.style.display = 'block'; void overlay.offsetWidth; overlay.classList.add('show'); }
        if (modal) { modal.classList.add('show'); modal.style.right = '0'; }
        document.body.style.overflow = 'hidden';
    };

    window.closeFiltrosModal = function() {
        const modal = document.getElementById('filtrosModal');
        const overlay = document.getElementById('filtrosModalOverlay');
        if (modal) { modal.classList.remove('show'); modal.style.right = '-100%'; }
        if (overlay) { overlay.classList.remove('show'); overlay.style.display = 'none'; }
        document.body.style.overflow = '';
    };

    window.syncModalSelects = function() {
        const familiaDesktop = document.getElementById('filtroFamilia');
        const acabadoDesktop = document.getElementById('filtroAcabado');
        const materialDesktop = document.getElementById('filtroMaterial');
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        if (familiaDesktop && familiaModal) familiaModal.value = familiaDesktop.value;
        if (acabadoDesktop && acabadoModal) acabadoModal.value = acabadoDesktop.value;
        if (materialDesktop && materialModal) materialModal.value = materialDesktop.value;
    };

    window.aplicarFiltrosDesdeModal = function() {
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        const familiaDesktop = document.getElementById('filtroFamilia');
        const acabadoDesktop = document.getElementById('filtroAcabado');
        const materialDesktop = document.getElementById('filtroMaterial');
        if (familiaDesktop && familiaModal) familiaDesktop.value = familiaModal.value;
        if (acabadoDesktop && acabadoModal) acabadoDesktop.value = acabadoModal.value;
        if (materialDesktop && materialModal) materialDesktop.value = materialModal.value;
        if (typeof window.aplicarFiltrosOutlet === 'function') window.aplicarFiltrosOutlet();
        window.closeFiltrosModal();
    };

    window.limpiarFiltrosDesdeModal = function() {
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        if (familiaModal) familiaModal.value = '';
        if (acabadoModal) acabadoModal.value = '';
        if (materialModal) materialModal.value = '';
        if (typeof window.limpiarFiltrosOutlet === 'function') window.limpiarFiltrosOutlet();
        window.closeFiltrosModal();
    };

    // ============================================
    // FUNCIONES DE AYUDA - MODALES Y BANNERS
    // ============================================
    window.mostrarModalSinResultados = function() {
        if (sessionStorage.getItem('modalSinResultadosMostrado')) return;
        sessionStorage.setItem('modalSinResultadosMostrado', 'true');
        const modalHtml = `
            <div id="modalSinResultados" class="modal-sin-resultados show">
                <div class="modal-sin-resultados-contenido">
                    <div class="modal-sin-resultados-icono"><i class="fas fa-search"></i></div>
                    <h3>¿No encuentras lo que buscas?</h3>
                    <p>En Gallos Mármol tenemos una amplia variedad de productos que tal vez no están en el Outlet actual.</p>
                    <div class="modal-sin-resultados-opciones">
                        <div class="opcion-contacto" onclick="window.abrirWhatsAppAsesor()">
                            <div class="opcion-icono"><i class="fab fa-whatsapp"></i></div>
                            <div class="opcion-texto"><strong>Chatea con un asesor</strong><span>Te ayudaremos a encontrar lo que necesitas</span></div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="opcion-contacto" onclick="window.abrirEmailContacto()">
                            <div class="opcion-icono"><i class="fas fa-envelope"></i></div>
                            <div class="opcion-texto"><strong>Envíanos un correo</strong><span>Te responderemos en menos de 24 horas</span></div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="opcion-contacto" onclick="window.verCatalogoCompleto()">
                            <div class="opcion-icono"><i class="fas fa-th-large"></i></div>
                            <div class="opcion-texto"><strong>Ver catálogo completo</strong><span>Explora todos nuestros productos disponibles</span></div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                    <button class="btn-cerrar-modal" onclick="window.cerrarModalSinResultados()"><i class="fas fa-times"></i> Cerrar</button>
                </div>
            </div>
        `;
        const modalExistente = document.getElementById('modalSinResultados');
        if (modalExistente) modalExistente.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.cerrarModalSinResultados = function() {
        const modal = document.getElementById('modalSinResultados');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { if (modal.parentNode) modal.remove(); }, 300);
        }
    };

    window.abrirEmailContacto = async function() {
        const datosContacto = await window.mostrarModalContactoRapido('Email');
        if (!datosContacto) return;
        await window.registrarContactoOutlet({
            nombre: datosContacto.nombre,
            telefono: datosContacto.telefono,
            mensaje: datosContacto.mensaje,
            tipoConsulta: 'informacion'
        });
        const email = 'info@gallosmarmol.com.pe';
        const asunto = encodeURIComponent(`Consulta Outlet - ${datosContacto.nombre}`);
        const cuerpo = encodeURIComponent(`Nombre: ${datosContacto.nombre}\nTeléfono: ${datosContacto.telefono}\nEmail: ${datosContacto.email || 'No especificado'}\n\nMensaje:\n${datosContacto.mensaje}`);
        window.location.href = `mailto:${email}?subject=${asunto}&body=${cuerpo}`;
        window.cerrarModalSinResultados?.();
        mostrarToast('✅ Mensaje enviado. Te responderemos en breve.', 'success');
    };

    window.verCatalogoCompleto = function() {
        window.location.href = '/catalogo';
        window.cerrarModalSinResultados?.();
    };

    function mostrarSeccionSugerencias() {
        const sugerencias = [
            { icono: 'fa-bullhorn', titulo: '¿Buscas algo específico?', descripcion: 'Cuéntanos qué necesitas y te ayudaremos.', accion: 'Preguntar ahora', onClick: 'window.abrirWhatsAppAsesor()' },
            { icono: 'fa-phone', titulo: 'Asesoría personalizada', descripcion: 'Habla con un experto en mármol.', accion: 'Llamar ahora', onClick: 'window.abrirWhatsAppAsesor()' },
            { icono: 'fa-envelope', titulo: 'Recibe novedades', descripcion: 'Suscríbete para enterarte cuando lleguen nuevos productos.', accion: 'Suscribirme', onClick: 'window.abrirEmailContacto()' }
        ];
        return `
            <div class="sugerencias-section">
                <h3>¿Necesitas ayuda para encontrar lo que buscas?</h3>
                <div class="sugerencias-grid">
                    ${sugerencias.map(s => `
                        <div class="sugerencia-card" onclick="${s.onClick}">
                            <div class="sugerencia-icono"><i class="fas ${s.icono}"></i></div>
                            <h4>${s.titulo}</h4>
                            <p>${s.descripcion}</p>
                            <span class="sugerencia-accion">${s.accion} →</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function inicializarSeccionSugerencias() {
        const container = document.getElementById('sugerenciasContainer');
        if (!container) return;
        const cantidadProductos = window.outletProductosCache?.length || 0;
        if (cantidadProductos < 10) {
            container.innerHTML = mostrarSeccionSugerencias();
        }
    }

    function mostrarBannerPocosProductos(cantidad) {
        if (cantidad >= 5) return;
        const banner = document.getElementById('bannerProximamente');
        if (banner) banner.classList.add('show');
    }

    function inicializarHelpBar() {
        const helpBar = document.getElementById('helpBar');
        if (!helpBar) return;
        setTimeout(() => { helpBar.classList.add('show'); }, 5000);
    }

    function inicializarAyudaOutlet() {
        inicializarSeccionSugerencias();
        inicializarHelpBar();
        const cantidadProductos = window.outletProductosCache?.length || 0;
        mostrarBannerPocosProductos(cantidadProductos);
    }

    // ============================================
    // FUNCIONES DE COTIZACIÓN
    // ============================================
    window.toggleSeleccionCotizacion = function(producto) {
        if (!producto || !producto.id) { console.error('Producto inválido:', producto); return; }
        const existe = window.cotizacionSeleccionados.find(p => p.id === producto.id);
        const productoCompleto = window.outletProductosCache.find(p => p.id === producto.id);
        if (existe) {
            window.cotizacionSeleccionados = window.cotizacionSeleccionados.filter(p => p.id !== existe.id);
            localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(window.cotizacionSeleccionados));
            window.actualizarTodosLosBotonesCotizar();
            window.actualizarBarraFlotante();
            window.actualizarBadgeHeader();
            mostrarToast(`${producto.nombre} removido de cotización`, 'error');
        } else {
            const nuevoProducto = {
                id: producto.id, nombre: producto.nombre || 'Producto', codigo: producto.codigo || '',
                imagen: producto.imagen_principal || '', slug: producto.slug || producto.id,
                medida: productoCompleto?.medida || producto.medida || null,
                espesor: productoCompleto?.espesor || producto.espesor || null
            };
            window.cotizacionSeleccionados.push(nuevoProducto);
            localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(window.cotizacionSeleccionados));
            window.actualizarTodosLosBotonesCotizar();
            window.actualizarBarraFlotante();
            window.actualizarBadgeHeader();
            window.mostrarModalConfirmacionAgregado(producto.nombre);
        }
    };

    function mostrarModalConfirmacionAgregado(nombreProducto) {
        console.log('🎉 Mostrando modal de confirmación para:', nombreProducto);
        
        // Eliminar modal anterior si existe
        const modalExistente = document.getElementById('modalConfirmacionAgregado');
        if (modalExistente) {
            modalExistente.remove();
        }
        
        // Crear modal dinámico
        const modalHtml = `
            <div id="modalConfirmacionAgregado" class="modal-confirmacion-agregado show">
                <div class="modal-confirmacion-contenido">
                    <div class="modal-confirmacion-icono">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>¡Producto agregado!</h3>
                    <p>"${escapeHtml(nombreProducto)}" ha sido añadido a tu cotización</p>
                    <div class="modal-confirmacion-acciones">
                        <button onclick="window.cerrarModalConfirmacion()" class="btn-seguir-comprando">
                            <i class="fas fa-shopping-bag"></i> Seguir agregando
                        </button>
                        <button onclick="window.irACotizacion()" class="btn-ir-cotizacion">
                            <i class="fas fa-file-invoice"></i> Ver cotización
                        </button>
                    </div>
                    <div class="modal-confirmacion-barra">
                        <i class="fas fa-info-circle"></i>
                        <span>Encuentra tus productos en la <strong>barra de cotización</strong> en la parte inferior</span>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            cerrarModalConfirmacion();
        }, 5000);
        
        // Cerrar al hacer clic fuera del modal
        const modal = document.getElementById('modalConfirmacionAgregado');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    cerrarModalConfirmacion();
                }
            });
        }
    }

    window.cerrarModalConfirmacion = function() {
        const modal = document.getElementById('modalConfirmacionAgregado');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => { if (modal.parentNode) modal.remove(); }, 300);
        }
    };

    window.irACotizacion = function() {
        window.cerrarModalConfirmacion();
        window.abrirModalCotizacion();
    };

    // ============================================
    // FUNCIONES DE BARRA DE COTIZACIÓN
    // ============================================
    function actualizarTodosLosBotonesCotizar() {
        if (!window.cotizacionSeleccionados) {
            const guardado = localStorage.getItem(CONFIG.COTIZACION_STORAGE_KEY);
            if (guardado) {
                try { window.cotizacionSeleccionados = JSON.parse(guardado); }
                catch(e) { window.cotizacionSeleccionados = []; }
            } else { window.cotizacionSeleccionados = []; }
        }
        document.querySelectorAll('.btn-cotizar-bottom').forEach(btn => {
            const productoId = btn.getAttribute('data-id');
            if (!productoId) return;
            const estaSeleccionado = window.cotizacionSeleccionados.some(item => item && item.id === productoId);
            if (estaSeleccionado) {
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado ✓';
                btn.classList.add('seleccionado');
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.classList.remove('seleccionado');
            }
        });
        window.actualizarBarraFlotante();
        window.actualizarBadgeHeader();
    }
    window.actualizarTodosLosBotonesCotizar = actualizarTodosLosBotonesCotizar;

    function actualizarBadgeHeader() {
        const badge = document.getElementById('headerCotizacionBadge');
        const contador = document.getElementById('headerContador');
        const total = window.cotizacionSeleccionados?.length || 0;
        if (badge && contador) {
            if (total > 0) { badge.style.display = 'flex'; contador.textContent = total; }
            else { badge.style.display = 'none'; }
        }
    }
    window.actualizarBadgeHeader = actualizarBadgeHeader;

    function generarPreviewProductos() {
        if (!window.cotizacionSeleccionados || window.cotizacionSeleccionados.length === 0) {
            return '<div class="preview-item" style="justify-content:center;color:#999;">No hay productos seleccionados</div>';
        }
        return window.cotizacionSeleccionados.map(p => `
            <div class="preview-item" data-producto-id="${p.id}">
                <div class="preview-info">
                    <div class="preview-nombre">${escapeHtml(p.nombre || 'Producto')}</div>
                    <div class="preview-detalles">
                        ${p.codigo ? `<span>${escapeHtml(p.codigo)}</span>` : ''}
                        ${p.medida ? `<span><i class="fas fa-ruler-combined"></i> ${escapeHtml(p.medida)}</span>` : ''}
                        ${p.espesor ? `<span><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(p.espesor)}</span>` : ''}
                    </div>
                </div>
                <button class="preview-eliminar" onclick="window.eliminarProductoCotizacion('${p.id}', '${escapeHtml(p.nombre)}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
    }
    window.generarPreviewProductos = generarPreviewProductos;

    function actualizarBarraFlotante() {
        let barra = document.getElementById('barra-cotizacion');
        const total = window.cotizacionSeleccionados?.length || 0;
        if (!barra && total > 0) {
            barra = document.createElement('div');
            barra.id = 'barra-cotizacion';
            barra.className = 'barra-cotizacion mini';
            barra.style.animation = 'slideUp 0.5s ease';
            const isMobile = window.innerWidth <= 768;
            barra.innerHTML = `
                <div class="barra-cotizacion-mini">
                    <div class="barra-info-mini">
                        <div class="barra-icono"><i class="fas fa-shopping-cart"></i><span class="badge-cantidad" id="badge-cantidad">${total}</span></div>
                    </div>
                    <div class="barra-acciones-mini">
                        <button class="btn-cotizar-principal" id="btn-cotizar-principal"><i class="fab fa-whatsapp"></i> Cotizar ahora</button>
                        <button class="btn-expandir" id="btn-expandir-barra"><i class="fas fa-chevron-up"></i></button>
                    </div>
                </div>
                <div class="barra-cotizacion-expanded" style="display:none;">
                    <div class="barra-productos-preview" id="preview-productos">${generarPreviewProductos()}</div>
                    <div class="barra-acciones-expanded">
                        <button class="btn-limpiar" id="btn-limpiar-barra"><i class="fas fa-trash-alt"></i> Limpiar todo</button>
                        <button class="btn-ver-cotizacion" id="btn-ver-cotizacion-expanded"><i class="fas fa-file-invoice"></i> Ver cotización</button>
                    </div>
                </div>
            `;
            document.body.appendChild(barra);
            configurarEventosBarra(barra);
            const alturaBarra = barra.offsetHeight;
            document.body.style.paddingBottom = `${alturaBarra + 10}px`;
        } else if (barra && total === 0) {
            barra.style.animation = 'slideDown 0.3s ease forwards';
            setTimeout(() => { barra.remove(); document.body.style.paddingBottom = ''; }, 300);
        } else if (barra && total > 0) {
            const badge = document.getElementById('badge-cantidad');
            if (badge) {
                badge.textContent = total;
                badge.classList.remove('animado');
                void badge.offsetWidth;
                badge.classList.add('animado');
            }
            const contadorMini = document.getElementById('contador-cotizacion-mini');
            if (contadorMini) contadorMini.textContent = total;
            const expandedSection = barra.querySelector('.barra-cotizacion-expanded');
            if (expandedSection && expandedSection.style.display !== 'none') {
                const previewContainer = document.getElementById('preview-productos');
                if (previewContainer) previewContainer.innerHTML = generarPreviewProductos();
            }
            barra.style.animation = 'none';
            setTimeout(() => { barra.style.animation = 'barraUpdate 0.4s ease'; }, 10);
        }
        window.actualizarBadgeHeader();
    }
    window.actualizarBarraFlotante = actualizarBarraFlotante;

    function configurarEventosBarra(barra) {
        const btnCotizarPrincipal = document.getElementById('btn-cotizar-principal');
        const btnExpandir = document.getElementById('btn-expandir-barra');
        const expandedSection = barra.querySelector('.barra-cotizacion-expanded');
        const miniSection = barra.querySelector('.barra-cotizacion-mini');
        if (btnCotizarPrincipal) btnCotizarPrincipal.onclick = () => window.abrirModalCotizacion();
        if (btnExpandir) {
            btnExpandir.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (expandedSection.style.display === 'none' || expandedSection.style.display === '') {
                    expandedSection.style.display = 'flex';
                    miniSection.style.display = 'none';
                    barra.classList.add('expanded');
                    barra.classList.remove('mini');
                    btnExpandir.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    const previewContainer = document.getElementById('preview-productos');
                    if (previewContainer) previewContainer.innerHTML = generarPreviewProductos();
                    const nuevaAltura = barra.offsetHeight;
                    document.body.style.paddingBottom = `${nuevaAltura + 10}px`;
                } else {
                    expandedSection.style.display = 'none';
                    miniSection.style.display = 'flex';
                    barra.classList.remove('expanded');
                    barra.classList.add('mini');
                    btnExpandir.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    const nuevaAltura = barra.offsetHeight;
                    document.body.style.paddingBottom = `${nuevaAltura + 10}px`;
                }
            };
        }
        const btnLimpiar = document.getElementById('btn-limpiar-barra');
        const btnVerCotizacion = document.getElementById('btn-ver-cotizacion-expanded');
        if (btnLimpiar) btnLimpiar.onclick = () => window.limpiarCotizacion();
        if (btnVerCotizacion) btnVerCotizacion.onclick = () => window.abrirModalCotizacion();
    }

    window.limpiarCotizacion = function() {
        mostrarModal('¿Limpiar selección?', '<p>Se eliminarán <strong>todos los productos</strong> de tu cotización.</p><p class="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>', 'question', {
            showCancelButton: true, confirmButtonText: 'Sí, limpiar', cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                window.cotizacionSeleccionados = [];
                localStorage.removeItem(CONFIG.COTIZACION_STORAGE_KEY);
                window.actualizarTodosLosBotonesCotizar();
                window.actualizarBarraFlotante();
                window.actualizarBadgeHeader();
                mostrarToast('Todos los productos han sido removidos', 'error');
            }
        });
    };

    window.eliminarProductoCotizacion = function(productoId, productoNombre) {
        mostrarModal('¿Eliminar producto?', `¿Estás seguro de que deseas eliminar "<strong>${productoNombre || 'este producto'}</strong>" de tu cotización?`, 'question', {
            showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                window.cotizacionSeleccionados = window.cotizacionSeleccionados.filter(p => p.id !== productoId);
                localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(window.cotizacionSeleccionados));
                window.actualizarTodosLosBotonesCotizar();
                window.actualizarBarraFlotante();
                window.actualizarBadgeHeader();
                if (window.cotizacionSeleccionados.length === 0) {
                    window.cerrarModalCotizacion();
                    mostrarModal('Cotización vacía', 'Se han eliminado todos los productos.', 'info', { timer: 2000 });
                } else {
                    window.abrirModalCotizacion();
                }
            }
        });
    };

    // ============================================
    // FUNCIONES DEL MODAL DE COTIZACIÓN
    // ============================================
    window.abrirModalCotizacion = async function() {
        if (!window.cotizacionSeleccionados || window.cotizacionSeleccionados.length === 0) {
            mostrarModal('Sin productos', 'No hay productos seleccionados para cotizar', 'warning');
            return;
        }
        const modal = document.getElementById('modalCotizacion');
        const body = document.getElementById('modalCotizacionBody');
        if (!modal || !body) {
            mostrarModal('Error', 'No se pudo abrir la cotización', 'error');
            return;
        }
        pasoActualCotizacion = 1;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        body.innerHTML = `<div class="animate-pulse"><div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div><div class="space-y-3"><div class="h-20 bg-gray-200 rounded"></div><div class="h-10 bg-gray-200 rounded"></div><div class="h-10 bg-gray-200 rounded"></div><div class="h-24 bg-gray-200 rounded"></div></div></div>`;
        setTimeout(async () => {
            try {
                let vendedores = asesoresPrecargados;
                if (!vendedores) vendedores = await precargarAsesoresOutlet();
                await renderizarPasoCotizacion(1, vendedores);
            } catch (error) {
                body.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-triangle text-3xl mb-2"></i><p>Error al cargar el formulario</p><button onclick="window.abrirModalCotizacion()" class="mt-3 bg-primary text-white px-4 py-2 rounded-lg">Reintentar</button></div>`;
            }
        }, 50);
    };

    window.cerrarModalCotizacion = function() {
        const modal = document.getElementById('modalCotizacion');
        if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    };

    window.agregarMasProductos = function() {
        window.cerrarModalCotizacion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const productosSection = document.getElementById('productos');
        if (productosSection) productosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ============================================
    // RENDERIZADO DE PASOS DE COTIZACIÓN
    // ============================================
    async function renderizarPasoProductos() {
        const productosHtml = window.cotizacionSeleccionados.map(p => {
            const productoOriginal = window.outletProductosCache.find(prod => prod.id === p.id);
            const medida = productoOriginal?.medida || p.medida || 'No especifica';
            const espesor = productoOriginal?.espesor || p.espesor || 'No especifica';
            return `
                <div class="producto-item">
                    <div class="producto-info">
                        <div class="producto-nombre">${escapeHtml(p.nombre) || 'Producto'}</div>
                        <div class="producto-codigo">${escapeHtml(p.codigo) || 'N/A'}</div>
                        <div class="producto-especificaciones">
                            ${medida !== 'No especifica' ? `<span class="producto-especificacion"><i class="fas fa-ruler-combined"></i> ${escapeHtml(medida)}</span>` : ''}
                            ${espesor !== 'No especifica' ? `<span class="producto-especificacion"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(espesor)}</span>` : ''}
                        </div>
                    </div>
                    <button class="btn-eliminar-producto" onclick="window.eliminarProductoCotizacion('${p.id}', '${escapeHtml(p.nombre)}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }).join('');
        return `
            <div class="paso-productos">
                <h4>Productos seleccionados</h4>
                <p class="paso-subtitulo">${window.cotizacionSeleccionados.length} producto(s) en tu cotización</p>
                <div class="productos-lista">${productosHtml || '<p class="text-center text-gray-400 py-4">No hay productos seleccionados</p>'}</div>
                <button class="btn-agregar-mas" onclick="window.agregarMasProductos()"><i class="fas fa-plus-circle"></i> Agregar más productos</button>
            </div>
        `;
    }

    async function renderizarPasoAsesor(vendedores) {
        if (!vendedores || vendedores.length === 0) {
            return `<div class="paso-asesor"><div class="alert-error"><i class="fas fa-exclamation-circle"></i><p>No hay asesores disponibles.</p><p class="text-sm">Contacta al administrador.</p></div></div>`;
        }
        const mejorAsesor = obtenerMejorAsesor(vendedores);
        if (!asesorSeleccionadoActual) { asesorSeleccionadoActual = mejorAsesor; modoAsignacionActual = 'auto'; }
        return `
            <div class="paso-asesor">
                <h4>¿Cómo quieres ser atendido?</h4>
                <p class="paso-subtitulo">Elige la opción que prefieras</p>
                <div class="opciones-asesor">
                    <div class="opcion-asesor ${modoAsignacionActual === 'auto' ? 'activa' : ''}" onclick="window.setModoAsesor('auto')">
                        <div class="opcion-header">
                            <div class="opcion-texto"><strong>Asignación Automática</strong><span>Te asignaremos el mejor asesor disponible</span></div>
                            ${modoAsignacionActual === 'auto' ? '<span class="check"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                        ${modoAsignacionActual === 'auto' && asesorSeleccionadoActual ? `
                            <div class="asesor-asignado">
                                <div class="asesor-avatar">${asesorSeleccionadoActual.nombre?.charAt(0) || 'A'}</div>
                                <div class="asesor-info">
                                    <div class="asesor-nombre">${escapeHtml(asesorSeleccionadoActual.nombre)} <span class="badge-auto">Asignado automáticamente</span></div>
                                    <div class="asesor-detalles">${asesorSeleccionadoActual.telefono ? `<span><i class="fas fa-phone"></i> ${escapeHtml(asesorSeleccionadoActual.telefono)}</span>` : ''}</div>
                                </div>
                                <button class="btn-cambiar-asesor-mini" onclick="event.stopPropagation(); window.cambiarAsesorModal()"><i class="fas fa-sync-alt"></i> Cambiar</button>
                            </div>
                        ` : ''}
                        ${modoAsignacionActual !== 'auto' ? `<button class="btn-usar-auto" onclick="window.usarAsignacionAuto()">Usar asignación automática</button>` : ''}
                    </div>
                    <div class="opcion-asesor ${modoAsignacionActual === 'manual' ? 'activa' : ''}" onclick="window.setModoAsesor('manual')">
                        <div class="opcion-header">
                            <div class="opcion-icono"><i class="fas fa-user"></i></div>
                            <div class="opcion-texto"><strong>Selección Manual</strong><span>Elige quién te gustaría que te atienda</span></div>
                            ${modoAsignacionActual === 'manual' ? '<span class="check"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                        ${modoAsignacionActual === 'manual' ? `
                            <div class="asesores-lista">
                                ${vendedores.map(v => `
                                    <div class="asesor-item ${asesorSeleccionadoActual?.id === v.id ? 'selected' : ''}" onclick="event.stopPropagation(); window.seleccionarAsesorManual('${v.id}')">
                                        <div class="asesor-avatar-small">${v.nombre?.charAt(0) || 'A'}</div>
                                        <div class="asesor-info">
                                            <div class="asesor-nombre">${escapeHtml(v.nombre)}</div>
                                            <div class="asesor-detalles">${v.telefono ? `<span><i class="fas fa-phone"></i> ${escapeHtml(v.telefono)}</span>` : ''}</div>
                                        </div>
                                        ${asesorSeleccionadoActual?.id === v.id ? '<span class="seleccionado-badge"><i class="fas fa-check"></i> Seleccionado</span>' : '<button class="btn-seleccionar">Seleccionar</button>'}
                                    </div>
                                `).join('')}
                            </div>
                        ` : `<button class="btn-usar-manual" onclick="window.usarSeleccionManual()">Elegir manualmente</button>`}
                    </div>
                </div>
                <div class="email-future"><i class="fas fa-info-circle"></i><div><strong>¿Tienes un asesor habitual?</strong><span>Próximamente podrás buscarlo por email.</span></div></div>
                <input type="hidden" id="asesor-seleccionado-id" value="${asesorSeleccionadoActual?.id || ''}">
            </div>
        `;
    }

    async function renderizarPasoDatos() {
        const paisGuardado = window.paisSeleccionadoCache || '51';
        const configPais = PAISES_CONFIG[paisGuardado];
        const nombrePais = configPais ? configPais.nombre : 'Perú';
        
        return `
            <div class="paso-datos">
                <h4>Datos de contacto</h4>
                <p class="paso-subtitulo">Completa tus datos para recibir la cotización</p>
                
                <!-- ========================================== -->
                <!-- CAMPO 1: NOMBRE (OBLIGATORIO) - VISIBLE -->
                <!-- ========================================== -->
                <div class="form-group">
                    <label>Nombre completo <span class="required">*</span></label>
                    <input type="text" id="cliente-nombre-modal" 
                        placeholder="Ej: Juan Pérez" 
                        value="${window.clienteNombreCache || ''}"
                        oninput="window.validarCampoNombre(this.value)"
                        onblur="window.validarCampoNombre(this.value)"
                        autocomplete="name">
                    <div id="error-nombre" class="mensaje-error hidden">
                        <i class="fas fa-exclamation-circle"></i>
                        <span></span>
                    </div>
                </div>
                
                <!-- ========================================== -->
                <!-- CAMPO 2: TELÉFONO (OBLIGATORIO) - VISIBLE -->
                <!-- ========================================== -->
                <div class="form-group">
                    <label>Teléfono <span class="required">*</span></label>
                    <div class="telefono-wrapper" style="display:flex;gap:8px;flex-wrap:wrap;">
                        <select id="prefijo-pais" 
                            onchange="window.guardarPaisSeleccionado(this.value); window.actualizarPlaceholderTelefono(); window.configurarInputTelefono();" 
                            style="min-width:100px;flex-shrink:0;padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:0.9rem;background:white;">
                            ${generarOpcionesPaises(paisGuardado)}
                        </select>
                        <input type="tel" id="cliente-telefono-modal" 
                            placeholder="${obtenerPlaceholderTelefono(paisGuardado)}" 
                            value="${window.clienteTelefonoCache || ''}"
                            oninput="window.validarCampoTelefono(this.value)"
                            onblur="window.validarCampoTelefono(this.value)"
                            autocomplete="tel"
                            style="flex:1;padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:0.9rem;">
                    </div>
                    <div id="error-telefono" class="mensaje-error hidden">
                        <i class="fas fa-exclamation-circle"></i>
                        <span></span>
                    </div>
                    <div id="telefono-ayuda" class="telefono-ayuda">
                        <span class="ayuda-formato">
                            <i class="fas fa-info-circle"></i>
                            Formato ${nombrePais}: ${configPais ? configPais.descripcion : '9 dígitos (celular)'}
                        </span>
                    </div>
                    <div id="telefono-advertencia" class="telefono-advertencia" style="display:none;"></div>
                </div>
                
                <!-- ========================================== -->
                <!-- CAMPO 3: OBSERVACIONES (OPCIONAL) - VISIBLE -->
                <!-- ========================================== -->
                <div class="form-group">
                    <label>Observaciones <span class="optional">(opcional)</span></label>
                    <textarea id="observaciones-modal" 
                        placeholder="Ej: Necesito el producto para fin de mes, requiere instalación, etc..." 
                        rows="3"
                        oninput="window.validarCampoObservaciones(this.value)"
                        onblur="window.validarCampoObservaciones(this.value)">${window.observacionesCache || ''}</textarea>
                    <div id="error-observaciones" class="mensaje-error hidden">
                        <i class="fas fa-exclamation-circle"></i>
                        <span></span>
                    </div>
                    <div class="campo-ayuda">
                        <i class="fas fa-info-circle"></i>
                        <span>Cuéntanos cualquier detalle adicional que consideres importante</span>
                    </div>
                </div>
                
                <!-- ========================================== -->
                <!-- CAMPOS OCULTOS (Email, Empresa, Ubicación) -->
                <!-- ========================================== -->
                <input type="hidden" id="cliente-correo-hidden" value="${window.clienteEmailCache || ''}">
                <input type="hidden" id="cliente-empresa-hidden" value="${window.clienteEmpresaCache || ''}">
                <input type="hidden" id="ubicacion-hidden" value="${window.ubicacionCache || ''}">
                
                <!-- Mensaje de error general -->
                <div id="mensaje-error-paso3" class="mensaje-error-paso3 hidden">
                    <i class="fas fa-exclamation-circle"></i>
                    <span id="texto-error-paso3">Por favor, completa todos los campos obligatorios.</span>
                </div>
                
                <!-- Nota informativa -->
                <div style="margin-top:16px;padding:12px;background:#f0f9ff;border-radius:12px;border-left:4px solid #3b82f6;font-size:0.75rem;color:#1e40af;">
                    <i class="fas fa-info-circle" style="margin-right:8px;"></i>
                    <span>Los campos marcados con <span class="required">*</span> son obligatorios.</span>
                </div>
            </div>
        `;
    }

    async function renderizarPasoEnviar(vendedores) {
        try {
            const nombre = window.clienteNombreCache || '';
            const telefonoLimpio = window.clienteTelefonoCache || '';
            const pais = window.paisSeleccionadoCache || '51';
            const config = PAISES_CONFIG[pais];
            const telefonoFormateado = config && telefonoLimpio ? `${config.prefijo} ${telefonoLimpio}` : telefonoLimpio;
            const email = window.clienteEmailCache || 'No especificado';
            const empresa = window.clienteEmpresaCache || 'No especifica';
            const ubicacion = window.ubicacionCache || 'No especifica';
            const observaciones = window.observacionesCache || 'Ninguna';
            let asesorNombre = 'No asignado', asesorTelefono = '';
            if (asesorSeleccionadoActual) {
                asesorNombre = asesorSeleccionadoActual.nombre || 'Asesor';
                asesorTelefono = asesorSeleccionadoActual.telefono || '';
            }
            const sessionId = Date.now().toString();
            let preguntaCaptcha = '¿Cuánto es 5 + 3?';
            if (window.captchaManager && typeof window.captchaManager.generarCaptcha === 'function') {
                try { preguntaCaptcha = window.captchaManager.generarCaptcha(sessionId); }
                catch (error) { console.warn('⚠️ Error generando captcha:', error); }
            }
            let requiereCaptcha = false;
            if (window.rateLimiter && typeof window.rateLimiter.getEstado === 'function') {
                try {
                    const estado = window.rateLimiter.getEstado('0.0.0.0', email || telefonoLimpio);
                    requiereCaptcha = estado.intentosRestantes <= 1;
                    if (typeof window.actualizarBadgeSeguridad === 'function') window.actualizarBadgeSeguridad(estado.intentosRestantes);
                } catch (error) { console.warn('⚠️ Error al verificar rateLimiter:', error); }
            }
            const nombrePais = config ? config.nombre : 'Perú';
            const prefijoMostrar = config ? config.prefijo : '+51';
            return `
                <div class="paso-enviar">
                    <div class="resumen-envio">
                        <div class="resumen-icono"><i class="fas fa-check-circle"></i></div>
                        <h4>¡Todo listo!</h4>
                        <p class="paso-subtitulo">Revisa tus datos antes de enviar</p>
                        <div class="resumen-datos">
                            <div class="resumen-item"><span class="resumen-label">Cliente</span><span class="resumen-valor">${escapeHtml(nombre) || 'No especificado'}</span></div>
                            <div class="resumen-item"><span class="resumen-label">Teléfono</span><span class="resumen-valor">${telefonoLimpio ? `${escapeHtml(prefijoMostrar)} ${escapeHtml(telefonoLimpio)} <span class="text-sm text-gray-400">(${escapeHtml(nombrePais)})</span>` : 'No especificado'}</span></div>
                            <div class="resumen-item"><span class="resumen-label">Email</span><span class="resumen-valor">${escapeHtml(email) || 'No especificado'}</span></div>
                            <div class="resumen-item"><span class="resumen-label">Empresa</span><span class="resumen-valor">${escapeHtml(empresa) || 'No especifica'}</span></div>
                            <div class="resumen-item"><span class="resumen-label">Asesor</span><span class="resumen-valor">${escapeHtml(asesorNombre)}${asesorTelefono ? ` <span class="text-sm text-gray-400">(${escapeHtml(asesorTelefono)})</span>` : ''}</span></div>
                            <div class="resumen-item"><span class="resumen-label">Productos</span><span class="resumen-valor">${window.cotizacionSeleccionados?.length || 0} producto(s)</span></div>
                            <div class="resumen-item"><span class="resumen-label">Modo de asignación</span><span class="resumen-valor">${modoAsignacionActual === 'auto' ? 'Automática' : 'Manual'}</span></div>
                        </div>
                        <div class="captcha-container" style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <i class="fas fa-shield-alt" style="color:#6b0000;"></i>
                                <span style="font-size:0.8rem;font-weight:600;color:#374151;">Verificación de seguridad</span>
                            </div>
                            <p style="font-size:0.9rem;font-weight:600;color:#1f2937;margin-bottom:8px;" id="captchaPregunta">${preguntaCaptcha}</p>
                            <input type="number" id="captchaRespuesta" placeholder="Escribe tu respuesta" style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:8px;font-size:1rem;text-align:center;max-width:200px;margin:0 auto;display:block;" autocomplete="off">
                            <div id="captchaFeedback" style="margin-top:8px;font-size:0.75rem;min-height:20px;text-align:center;"></div>
                            <input type="hidden" id="captchaSessionId" value="${sessionId}">
                            <p style="font-size:0.65rem;color:#6b7280;margin-top:8px;text-align:center;"><i class="fas fa-info-circle"></i> ${requiereCaptcha ? '⚠️ Captcha requerido por intentos fallidos previos.' : 'Completa el captcha para verificar que eres humano.'}</p>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Error en renderizarPasoEnviar:', error);
            return `<div class="paso-enviar"><div class="resumen-envio"><div class="resumen-icono"><i class="fas fa-exclamation-triangle" style="color:#dc2626;"></i></div><h4 style="color:#dc2626;">Error al cargar el paso</h4><p class="paso-subtitulo">${error.message}</p><button onclick="window.irPasoCotizacion(3)" class="btn-paso-anterior" style="margin-top:16px;"><i class="fas fa-arrow-left"></i> Volver</button></div></div>`;
        }
    }

    async function renderizarPasoCotizacion(paso, vendedores) {
        const body = document.getElementById('modalCotizacionBody');
        if (!body) { console.error('❌ modalCotizacionBody no encontrado'); return; }
        const nombresPasos = ['Productos', 'Asesor', 'Datos', 'Enviar'];
        const stepperHtml = `
            <div class="stepper-container">
                <div class="stepper">${nombresPasos.map((nombre, index) => {
                    const numPaso = index + 1;
                    let estado = '';
                    if (numPaso < paso) estado = 'completado';
                    else if (numPaso === paso) estado = 'activo';
                    else estado = 'pendiente';
                    return `<div class="stepper-step ${estado}" data-paso="${numPaso}"><div class="stepper-circle">${numPaso < paso ? '<i class="fas fa-check"></i>' : numPaso}</div><div class="stepper-label">${nombre}</div></div>`;
                }).join('')}</div>
                <div class="stepper-line"></div>
            </div>
        `;
        let contenidoHtml = '';
        try {
            switch(paso) {
                case 1: contenidoHtml = await renderizarPasoProductos(); break;
                case 2: contenidoHtml = await renderizarPasoAsesor(vendedores); break;
                case 3: contenidoHtml = await renderizarPasoDatos(); break;
                case 4: contenidoHtml = await renderizarPasoEnviar(vendedores); break;
                default: contenidoHtml = '<div class="text-center text-red-500">Paso no encontrado</div>';
            }
        } catch (error) {
            contenidoHtml = `<div class="text-center text-red-500 py-8"><i class="fas fa-exclamation-triangle text-3xl mb-2"></i><p>Error al cargar el paso: ${error.message}</p><button onclick="window.irPasoCotizacion(${paso})" class="mt-3 bg-primary text-white px-4 py-2 rounded-lg">Reintentar</button></div>`;
        }
        const fullHtml = `${stepperHtml}<div class="paso-contenido">${contenidoHtml}</div><div class="paso-acciones">${paso > 1 ? `<button class="btn-paso-anterior" onclick="window.irPasoCotizacion(${paso - 1})"><i class="fas fa-arrow-left"></i> Anterior</button>` : ''}${paso < 4 ? `<button class="btn-paso-siguiente" onclick="window.irPasoCotizacion(${paso + 1})">Siguiente <i class="fas fa-arrow-right"></i></button>` : ''}${paso === 4 ? `<button class="btn-paso-enviar" id="btnEnviarCotizacionFinal"><i class="fab fa-whatsapp"></i> Enviar Cotización</button>` : ''}</div>`;
        body.innerHTML = fullHtml;
        if (paso === 4) {
            const btnEnviar = document.getElementById('btnEnviarCotizacionFinal');
            if (btnEnviar) {
                const nuevoBtn = btnEnviar.cloneNode(true);
                btnEnviar.parentNode.replaceChild(nuevoBtn, btnEnviar);
                nuevoBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    const sessionId = document.getElementById('captchaSessionId')?.value;
                    const respuesta = document.getElementById('captchaRespuesta')?.value;
                    const feedback = document.getElementById('captchaFeedback');
                    if (!sessionId || !respuesta) {
                        if (feedback) feedback.innerHTML = `<span style="color:#dc2626;">Por favor, completa el captcha.</span>`;
                        mostrarToast('⚠️ Por favor, completa el captcha', 'warning');
                        const captchaInput = document.getElementById('captchaRespuesta');
                        if (captchaInput) { captchaInput.style.borderColor = '#dc2626'; captchaInput.style.backgroundColor = '#fef2f2'; captchaInput.focus(); }
                        return;
                    }
                    if (window.captchaManager && typeof window.captchaManager.verificarCaptcha === 'function') {
                        const resultadoCaptcha = window.captchaManager.verificarCaptcha(sessionId, respuesta);
                        if (!resultadoCaptcha.valido) {
                            if (feedback) feedback.innerHTML = `<span style="color:#dc2626;">❌ ${resultadoCaptcha.mensaje}</span>`;
                            const captchaInput = document.getElementById('captchaRespuesta');
                            if (captchaInput) { captchaInput.style.borderColor = '#dc2626'; captchaInput.style.backgroundColor = '#fef2f2'; captchaInput.value = ''; captchaInput.focus(); }
                            mostrarToast(`❌ ${resultadoCaptcha.mensaje}`, 'error');
                            return;
                        }
                    }
                    if (feedback) feedback.innerHTML = `<span style="color:#10b981;">✅ Captcha verificado correctamente</span>`;
                    const captchaInput = document.getElementById('captchaRespuesta');
                    if (captchaInput) { captchaInput.style.borderColor = '#10b981'; captchaInput.style.backgroundColor = '#f0fdf4'; }
                    const datosCliente = { nombre: window.clienteNombreCache || '', email: window.clienteEmailCache || null, telefono: window.clienteTelefonoCache || '', empresa: window.clienteEmpresaCache || null, ubicacionProyecto: window.ubicacionCache || null, observaciones: window.observacionesCache || null };
                    window.cerrarModalCotizacion();
                    await window.enviarCotizacion(datosCliente, asesorSeleccionadoActual);
                });
            }
        }
    }

    // ============================================
    // FUNCIONES DE NAVEGACIÓN Y CONTROL DE ASESOR
    // ============================================
    window.setModoAsesor = function(modo) {
        modoAsignacionActual = modo;
        if (modo === 'auto') {
            const vendedores = asesoresPrecargados;
            if (vendedores && vendedores.length > 0) asesorSeleccionadoActual = obtenerMejorAsesor(vendedores);
        }
        renderizarPasoCotizacion(2, asesoresPrecargados);
    };

    window.usarAsignacionAuto = function() { window.setModoAsesor('auto'); };
    window.usarSeleccionManual = function() { window.setModoAsesor('manual'); };

    window.seleccionarAsesorManual = function(asesorId) {
        const vendedores = asesoresPrecargados;
        if (!vendedores) return;
        const asesor = vendedores.find(v => v.id === asesorId);
        if (asesor) {
            asesorSeleccionadoActual = asesor;
            modoAsignacionActual = 'manual';
            const inputId = document.getElementById('asesor-seleccionado-id');
            if (inputId) inputId.value = asesor.id;
            renderizarPasoCotizacion(2, asesoresPrecargados);
        }
    };

    window.cambiarAsesorModal = function() {
        modoAsignacionActual = 'manual';
        renderizarPasoCotizacion(2, asesoresPrecargados);
    };

    window.irPasoCotizacion = function(paso) {
        console.log(`🔄 NAVEGANDO: Paso ${paso} (actual: ${pasoActualCotizacion})`);
        
        if (paso < 1 || paso > 4) {
            console.warn('⚠️ Paso inválido:', paso);
            return;
        }
        
        // ==========================================
        // VALIDACIÓN PASO 3 → PASO 4 - BLOQUEA AVANCE
        // ==========================================
        if (paso === 4 && pasoActualCotizacion === 3) {
            console.log('🔍 Validando Paso 3 antes de ir al Paso 4...');
            
            // ✅ FORZAR GUARDADO DE DATOS DESDE LOS INPUTS
            const nombreInput = document.getElementById('cliente-nombre-modal');
            const telefonoInput = document.getElementById('cliente-telefono-modal');
            const prefijoSelect = document.getElementById('prefijo-pais');
            const observacionesInput = document.getElementById('observaciones-modal');
            
            if (nombreInput) {
                window.clienteNombreCache = nombreInput.value.trim();
            }
            
            if (telefonoInput) {
                window.clienteTelefonoCache = telefonoInput.value.trim();
            }
            
            if (prefijoSelect) {
                window.paisSeleccionadoCache = prefijoSelect.value;
            }
            
            if (observacionesInput) {
                window.observacionesCache = observacionesInput.value.trim();
            }
            
            // ✅ VALIDAR CON validarPaso3Completo()
            const esValido = window.validarPaso3Completo();
            
            if (!esValido) {
                console.log('❌ Validación fallida - No se puede avanzar');
                return;
            }
            
            console.log('✅ Validación exitosa. Avanzando al Paso 4...');
            pasoActualCotizacion = 4;
            renderizarPasoCotizacion(4, asesoresPrecargados);
            return;
        }
        
        // ==========================================
        // VALIDACIÓN PASO 2 → PASO 3
        // ==========================================
        if (paso === 3 && pasoActualCotizacion === 2) {
            if (!asesorSeleccionadoActual) {
                mostrarModal('Asesor requerido', 'Debes tener un asesor asignado para continuar.', 'warning');
                return;
            }
        }
        
        pasoActualCotizacion = paso;
        renderizarPasoCotizacion(paso, asesoresPrecargados);
    };

    // ============================================
    // VALIDACIONES EN TIEMPO REAL - PASO 3
    // ============================================
    window.validarCampoNombre = function(valor) {
        const nombreInput = document.getElementById('cliente-nombre-modal');
        const errorElement = document.getElementById('error-nombre');
        if (!nombreInput || !errorElement) return false;
        const nombre = valor.trim();
        let esValido = true, mensajeError = '';
        nombreInput.style.borderColor = '';
        nombreInput.style.backgroundColor = '';
        if (nombre.length === 0) { esValido = false; mensajeError = 'El nombre es obligatorio'; }
        else if (nombre.length < 3) { esValido = false; mensajeError = 'El nombre debe tener al menos 3 caracteres'; }
        else if (/\d/.test(nombre)) { esValido = false; mensajeError = 'El nombre no debe contener números'; }
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-'.]+$/.test(nombre)) { esValido = false; mensajeError = 'Solo letras, espacios, guiones y apóstrofes'; }
        else { window.clienteNombreCache = nombre; }
        if (esValido) {
            errorElement.className = 'mensaje-error hidden';
            errorElement.textContent = '';
            nombreInput.style.borderColor = '#10b981';
            nombreInput.style.backgroundColor = '#f0fdf4';
            return true;
        } else {
            errorElement.className = 'mensaje-error';
            errorElement.textContent = mensajeError;
            errorElement.style.color = '#dc2626';
            nombreInput.style.borderColor = '#dc2626';
            nombreInput.style.backgroundColor = '#fef2f2';
            return false;
        }
    };

    window.validarCampoTelefono = function(valor) {
        const telefonoInput = document.getElementById('cliente-telefono-modal');
        const prefijoSelect = document.getElementById('prefijo-pais');
        const errorElement = document.getElementById('error-telefono');
        
        if (!telefonoInput || !errorElement) return false;
        
        const pais = prefijoSelect?.value || '51';
        
        // ✅ USA validarTelefonoAvanzado() - BLOQUEA si hay errores
        const resultado = validarTelefonoAvanzado(valor, pais);
        
        telefonoInput.style.borderColor = '';
        telefonoInput.style.backgroundColor = '';
        
        if (resultado.valido) {
            errorElement.className = 'mensaje-error hidden';
            errorElement.textContent = '';
            telefonoInput.style.borderColor = '#10b981';
            telefonoInput.style.backgroundColor = '#f0fdf4';
            window.clienteTelefonoCache = resultado.telefonoLimpio;
            return true;
        } else {
            errorElement.className = 'mensaje-error';
            errorElement.textContent = resultado.errores[0] || 'Teléfono inválido';
            errorElement.style.color = '#dc2626';
            telefonoInput.style.borderColor = '#dc2626';
            telefonoInput.style.backgroundColor = '#fef2f2';
            window.clienteTelefonoCache = '';
            return false;
        }
    };

    window.validarPaso3Completo = function() {
        console.log('🔍 Validando Paso 3 completo...');
        
        const nombreInput = document.getElementById('cliente-nombre-modal');
        const telefonoInput = document.getElementById('cliente-telefono-modal');
        const prefijoSelect = document.getElementById('prefijo-pais');
        const observacionesInput = document.getElementById('observaciones-modal');
        const errorMsg = document.getElementById('mensaje-error-paso3');
        const textoError = document.getElementById('texto-error-paso3');
        
        if (!nombreInput || !telefonoInput) {
            console.error('❌ Elementos del paso 3 no encontrados');
            return false;
        }
        
        const nombre = nombreInput.value.trim();
        const telefono = telefonoInput.value;
        const pais = prefijoSelect?.value || '51';
        const observaciones = observacionesInput?.value?.trim() || '';
        
        console.log('📝 Validando:', { nombre, telefono, pais, observaciones });
        
        // Ocultar error general
        if (errorMsg) errorMsg.classList.add('hidden');
        
        // ✅ 1. Validar Nombre (OBLIGATORIO)
        const nombreValido = window.validarCampoNombre(nombre);
        if (!nombreValido) {
            console.log('❌ Nombre inválido');
            if (nombreInput) {
                nombreInput.focus();
                nombreInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('⚠️ Por favor, verifica el nombre completo.', 'warning');
            }
            return false;
        }
        
        // ✅ 2. Validar Teléfono (OBLIGATORIO)
        const telefonoValido = window.validarCampoTelefono(telefono);
        if (!telefonoValido) {
            console.log('❌ Teléfono inválido');
            if (telefonoInput) {
                telefonoInput.focus();
                telefonoInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('⚠️ Por favor, verifica el número de teléfono.', 'warning');
            }
            return false;
        }
        
        // ✅ 3. Validar Observaciones (OPCIONAL)
        if (observaciones && observaciones.length > 0) {
            const observacionesValido = window.validarCampoObservaciones(observaciones);
            if (!observacionesValido) {
                console.log('❌ Observaciones inválidas');
                if (observacionesInput) {
                    observacionesInput.focus();
                    observacionesInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                if (typeof window.mostrarToast === 'function') {
                    window.mostrarToast('⚠️ Por favor, verifica las observaciones.', 'warning');
                }
                return false;
            }
        }
        
        console.log('✅ Paso 3 validado correctamente');
        console.log('📦 Datos guardados:', {
            nombre: window.clienteNombreCache,
            telefono: window.clienteTelefonoCache,
            pais: window.paisSeleccionadoCache,
            observaciones: window.observacionesCache
        });
        
        return true;
    };

    // ============================================
    // COUNTDOWN
    // ============================================
    function initCountdown() {
        const fechaInicio = new Date(2026, 5, 24);
        const fechaFin = new Date(2026, 6, 18);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        let targetDate, mensaje = "";
        if (hoy < fechaInicio) { targetDate = fechaInicio; mensaje = "OFERTA PRÓXIMAMENTE"; }
        else if (hoy >= fechaInicio && hoy <= fechaFin) { targetDate = fechaFin; mensaje = "⏰ OFERTA POR TIEMPO LIMITADO"; }
        else { targetDate = null; mensaje = "OFERTA FINALIZADA"; }
        const titleEl = document.getElementById('countdownTitle');
        if (titleEl) titleEl.textContent = mensaje;
        if (!targetDate) return;
        function update() {
            const now = new Date();
            const diff = targetDate - now;
            if (diff <= 0) return;
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            const daysEl = document.getElementById('countdown-days');
            const hoursEl = document.getElementById('countdown-hours');
            const minutesEl = document.getElementById('countdown-minutes');
            const secondsEl = document.getElementById('countdown-seconds');
            if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
            if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
            if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
            if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
        }
        update();
        setInterval(update, 1000);
    }
    window.initCountdown = initCountdown;

    window.scrollToTop = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };

    function cargarSeleccionCotizacion() {
        const guardado = localStorage.getItem(CONFIG.COTIZACION_STORAGE_KEY);
        if (guardado) {
            try {
                window.cotizacionSeleccionados = JSON.parse(guardado);
                return window.cotizacionSeleccionados;
            } catch(e) {
                window.cotizacionSeleccionados = [];
                return [];
            }
        } else {
            window.cotizacionSeleccionados = [];
            return [];
        }
    }
    window.cargarSeleccionCotizacion = cargarSeleccionCotizacion;

    // ============================================
    // OBTENER VALORES ÚNICOS PARA FILTROS
    // ============================================
    const familiasUnicas = new Map();
    const acabadosUnicos = new Map();
    const materialesUnicos = new Map();
    productosValidos.forEach(p => {
        if (p.familia?.nombre) familiasUnicas.set(p.familia_id, p.familia.nombre);
        else if (p.familia_nombre) familiasUnicas.set(p.familia_nombre, p.familia_nombre);
        if (p.acabado?.nombre) acabadosUnicos.set(p.acabado_id, p.acabado.nombre);
        else if (p.acabado_nombre) acabadosUnicos.set(p.acabado_nombre, p.acabado_nombre);
        if (p.material?.nombre) materialesUnicos.set(p.material_id, p.material.nombre);
        else if (p.material_nombre) materialesUnicos.set(p.material_nombre, p.material_nombre);
    });
    const familiasOptions = Array.from(familiasUnicas.entries()).filter(([id]) => id && id !== '').map(([id, nombre]) => `<option value="${id}">${escapeHtml(nombre)}</option>`).join('');
    const acabadosOptions = Array.from(acabadosUnicos.entries()).filter(([id]) => id && id !== '').map(([id, nombre]) => `<option value="${id}">${escapeHtml(nombre)}</option>`).join('');
    const materialesOptions = Array.from(materialesUnicos.entries()).filter(([id]) => id && id !== '').map(([id, nombre]) => `<option value="${id}">${escapeHtml(nombre)}</option>`).join('');

    // ============================================
    // GENERAR HTML COMPLETO
    // ============================================
    const productosDataParaHTML = window.outletProductosCache.map(p => ({
        ...p, imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE), slug: p.slug || p.id
    }));
    const heroBackgroundImage = '../FOTO/foto_03.webp';

    // ============================================
    // HTML COMPLETO
    // ============================================
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover">
    <title>OUTLET | GALLOS MÁRMOL</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <style>
        /* ============================================ */
        /* RESET Y VARIABLES */
        /* ============================================ */
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--primary:#6b0000;--primary-dark:#4a0000;--primary-light:#8a1a1a;--primary-rgb:107,0,0;--secondary:#d4d4ae;--white:#fff;--gray-50:#fafafa;--gray-100:#f5f5f5;--gray-200:#eee;--gray-300:#e0e0e0;--gray-400:#cbd5e1;--gray-500:#94a3b8;--gray-600:#666;--gray-700:#444;--gray-800:#222;--red-500:#ef4444;--red-600:#dc2626;--orange-400:#fb923c;--green-500:#10b981;--green-600:#059669}
        html{scroll-behavior:smooth;scroll-padding-top:70px}
        ::selection{background:#6b0000;color:white}::-moz-selection{background:#6b0000;color:white}
        body{font-family:'Poppins',sans-serif;background:var(--gray-50);color:var(--gray-800);line-height:1.5;overflow-x:hidden;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;padding-bottom:0}
        img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;pointer-events:auto}
        .container{width:100%;max-width:1280px;margin:0 auto;padding:0 16px}
        h1,h2,h3{font-weight:700}
        
        /* HEADER */
        header{position:fixed;top:0;left:0;right:0;background:var(--primary);z-index:1000;padding:8px 0;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
        .navbar{display:flex;justify-content:center;align-items:center;padding:8px 16px;position:relative}
        .logo{display:flex;justify-content:center;align-items:center;flex:1}
        .logo a{display:inline-block;text-decoration:none;transition:all 0.3s ease;cursor:pointer}
        .logo a:hover{transform:scale(1.02);opacity:0.9}
        .logo a:active{transform:scale(0.98)}
        .logo img{width:200px;height:auto;display:block}
        .header-cotizacion-badge{position:absolute;right:16px;top:50%;transform:translateY(-50%);background:var(--secondary);color:var(--primary);border-radius:40px;padding:4px 12px;font-size:0.7rem;font-weight:700;display:none;align-items:center;gap:6px;cursor:pointer;transition:all 0.3s ease;white-space:nowrap}
        .header-cotizacion-badge:hover{transform:translateY(-50%) scale(1.05)}
        .header-cotizacion-badge i{font-size:0.8rem}
        
        /* HERO */
        .hero-outlet{min-height:70vh;display:flex;align-items:center;background:linear-gradient(135deg,rgba(0,0,0,0.75),rgba(0,0,0,0.5)),url('${heroBackgroundImage}');background-size:cover;background-position:center;padding:80px 0 40px}
        .hero-content{max-width:100%;text-align:center}
        .hero-title{font-size:2rem;font-weight:800;color:white;margin-bottom:8px}
        .hero-title span{color:var(--secondary)}
        .hero-description{font-size:0.85rem;color:rgba(255,255,255,0.85);margin-bottom:20px;line-height:1.5}
        .badge-urgencia{display:inline-block;background:var(--red-600);color:white;padding:4px 14px;border-radius:40px;font-size:0.7rem;font-weight:700;margin-bottom:12px;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}
        .countdown-container{background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);border-radius:16px;padding:12px 16px;margin-bottom:20px;display:inline-block;width:100%;max-width:380px}
        .countdown-title{font-size:0.7rem;color:rgba(255,255,255,0.8);margin-bottom:8px;font-weight:600}
        .countdown{display:flex;gap:10px;justify-content:center}
        .countdown-item{text-align:center;background:rgba(0,0,0,0.5);border-radius:12px;padding:6px 10px;min-width:50px}
        .countdown-number{font-size:1.2rem;font-weight:800;color:white;font-family:monospace}
        .countdown-label{font-size:0.5rem;color:rgba(255,255,255,0.6);text-transform:uppercase}
        .btn-primary-custom{background:var(--secondary);color:var(--primary);padding:16px 32px;border-radius:50px;font-weight:700;font-size:1rem;text-decoration:none;display:inline-flex;align-items:center;gap:10px;width:100%;justify-content:center;border:none;cursor:pointer}
        .btn-primary-custom:hover{transform:translateY(-2px)}
        .hero-beneficios{display:flex;gap:16px;justify-content:center;margin-top:16px;flex-wrap:wrap}
        .hero-beneficio{display:flex;align-items:center;gap:6px;color:rgba(255,255,255,0.7);font-size:0.7rem}
        .hero-beneficio i{color:var(--secondary);font-size:0.9rem}
        
        /* SEARCH */
        .search-filters-section{background:white;border-radius:20px;margin:-20px 0 20px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
        .search-wrapper{margin-bottom:12px}
        .search-box-enhanced{display:flex;flex-direction:column;gap:10px}
        .search-input-wrapper{position:relative;flex:1}
        .search-input-wrapper i.fa-search{position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:0.9rem;color:var(--gray-400)}
        .search-input-wrapper input{width:100%;padding:14px 16px 14px 44px;border:2px solid var(--gray-200);border-radius:50px;font-size:0.9rem;background:var(--gray-50);transition:all 0.3s ease;min-height:52px}
        .search-input-wrapper input:focus{outline:none;border-color:var(--primary);background:white}
        .btn-clear-search{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--gray-400);cursor:pointer;padding:8px;display:none;font-size:1rem;min-width:44px;min-height:44px;z-index:2}
        .btn-clear-search:hover{color:var(--primary)}
        .btn-clear-search:active{transform:translateY(-50%) scale(0.9)}
        .btn-escaneo-qr{background:var(--primary);color:white;border:none;border-radius:50px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:600;font-size:0.9rem;min-height:52px;width:100%}
        .btn-escaneo-qr:hover{background:var(--primary-dark)}
        .btn-escaneo-qr i{font-size:1.1rem}
        .search-hint{font-size:0.65rem;color:var(--gray-400);margin-top:6px;display:flex;align-items:center;gap:6px}
        
        /* FILTROS */
        .filtros-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px;scrollbar-width:none;-ms-overflow-style:none}
        .filtros-chips::-webkit-scrollbar{display:none}
        .chip-filtro{background:var(--gray-100);padding:6px 12px;border-radius:40px;font-size:0.7rem;display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;border:1px solid var(--gray-200)}
        .chip-eliminar{background:none;border:none;color:var(--gray-500);cursor:pointer;padding:2px;font-size:0.6rem}
        .chip-eliminar:hover{color:var(--red-500)}
        .filters-desktop-container{display:none;margin-top:12px}
        .filtros-grid-enhanced{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
        .filtro-group{flex:1;min-width:120px}
        .filtro-group label{display:block;font-size:0.65rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;margin-bottom:4px}
        .filtro-group select{width:100%;padding:12px 14px;border:1px solid var(--gray-200);border-radius:16px;font-size:0.85rem;background:var(--gray-50);min-height:48px}
        .filtros-actions{display:flex;gap:10px}
        .btn-filter,.btn-clear{padding:12px 20px;border-radius:40px;font-weight:600;font-size:0.8rem;border:none;min-height:48px;min-width:80px;cursor:pointer}
        .btn-filter{background:var(--primary);color:white}
        .btn-clear{background:var(--gray-100);color:var(--gray-700)}
        .filtros-fab{position:fixed;bottom:100px;right:16px;background:var(--primary);color:white;width:56px;height:56px;border-radius:50%;display:none;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.25);cursor:pointer;z-index:90;border:none;font-size:1.2rem}
        .filtros-fab:hover{transform:scale(1.05)}
        .scroll-top-btn{position:fixed;bottom:100px;right:16px;width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.25);z-index:80;font-size:1.2rem}
        .scroll-top-btn.show{display:flex}
        .scroll-top-btn:hover{transform:scale(1.05)}
    
        /* ============================================ */
        /* MODAL DE CONFIRMACIÓN - PRODUCTO AGREGADO */
        /* ============================================ */

        .modal-confirmacion-agregado {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .modal-confirmacion-agregado.show {
            opacity: 1;
            visibility: visible;
        }

        .modal-confirmacion-contenido {
            background: white;
            border-radius: 24px;
            padding: 32px 28px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            transform: scale(0.9) translateY(20px);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-confirmacion-agregado.show .modal-confirmacion-contenido {
            transform: scale(1) translateY(0);
        }

        /* ============================================ */
        /* ICONO */
        /* ============================================ */

        .modal-confirmacion-icono {
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            animation: iconoCheck 0.6s ease;
        }

        @keyframes iconoCheck {
            0% {
                transform: scale(0) rotate(-30deg);
            }
            60% {
                transform: scale(1.2) rotate(5deg);
            }
            100% {
                transform: scale(1) rotate(0);
            }
        }

        .modal-confirmacion-icono i {
            font-size: 2.5rem;
            color: white;
        }

        /* ============================================ */
        /* TEXTO */
        /* ============================================ */

        .modal-confirmacion-contenido h3 {
            font-size: 1.3rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
        }

        .modal-confirmacion-contenido p {
            font-size: 0.9rem;
            color: #6b7280;
            margin-bottom: 20px;
            line-height: 1.5;
        }

        /* ============================================ */
        /* BOTONES */
        /* ============================================ */

        .modal-confirmacion-acciones {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
        }

        .modal-confirmacion-acciones button {
            flex: 1;
            padding: 12px 16px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-seguir-comprando {
            background: #f1f5f9;
            color: #4b5563;
        }

        .btn-seguir-comprando:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }

        .btn-ir-cotizacion {
            background: #6b0000;
            color: white;
        }

        .btn-ir-cotizacion:hover {
            background: #4a0000;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(107, 0, 0, 0.3);
        }

        .modal-confirmacion-acciones button:active {
            transform: scale(0.95);
        }

        /* ============================================ */
        /* ESTILOS PARA EL PASO 3 - DATOS */
        /* ============================================ */

        .paso-datos {
            padding: 4px 0;
        }

        .paso-datos h4 {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 4px;
        }

        .paso-subtitulo {
            font-size: 0.85rem;
            color: #6b7280;
            margin-bottom: 20px;
        }

        /* Grupo de formulario */
        .form-group {
            margin-bottom: 18px;
        }

        .form-group label {
            display: block;
            font-size: 0.75rem;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-group label .required {
            color: #dc2626;
            font-weight: 700;
        }

        .form-group label .optional {
            color: #9ca3af;
            font-weight: 400;
            text-transform: none;
            font-size: 0.65rem;
        }

        /* Inputs y textarea */
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px 14px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 0.9rem;
            background: #fafafa;
            transition: all 0.3s ease;
            font-family: inherit;
            color: #1f2937;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #6b0000;
            background: white;
            box-shadow: 0 0 0 4px rgba(107, 0, 0, 0.08);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }

        /* Wrapper de teléfono */
        .telefono-wrapper {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .telefono-wrapper select {
            min-width: 110px;
            flex-shrink: 0;
            padding: 12px 14px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 0.9rem;
            background: #fafafa;
            cursor: pointer;
            transition: all 0.3s ease;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
        }

        .telefono-wrapper select:focus {
            outline: none;
            border-color: #6b0000;
            background: white;
            box-shadow: 0 0 0 4px rgba(107, 0, 0, 0.08);
        }

        .telefono-wrapper input {
            flex: 1;
            min-width: 150px;
        }

        /* Mensajes de error */
        .mensaje-error {
            font-size: 0.7rem;
            color: #dc2626;
            margin-top: 4px;
            display: none;
            align-items: center;
            gap: 4px;
        }

        .mensaje-error i {
            font-size: 0.7rem;
        }

        .mensaje-error:not(.hidden) {
            display: flex !important;
        }

        /* Ayuda de teléfono */
        .telefono-ayuda {
            font-size: 0.7rem;
            color: #6b7280;
            margin-top: 4px;
            display: block;
        }

        .ayuda-formato {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .ayuda-formato i {
            font-size: 0.7rem;
        }

        /* Advertencia de teléfono */
        .telefono-advertencia {
            font-size: 0.65rem;
            color: #92400e;
            background: #fffbeb;
            padding: 6px 10px;
            border-radius: 8px;
            margin-top: 4px;
            border: 1px solid #fcd34d;
            display: none;
        }

        .telefono-advertencia i {
            margin-right: 4px;
            color: #d97706;
        }

        /* Ayuda de observaciones */
        .campo-ayuda {
            font-size: 0.7rem;
            color: #6b7280;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .campo-ayuda i {
            color: #3b82f6;
        }

        /* Mensaje de error general */
        .mensaje-error-paso3 {
            padding: 12px 16px;
            background: #fef2f2;
            border: 1px solid #fca5a5;
            border-radius: 12px;
            color: #991b1b;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 16px;
            animation: slideDown 0.3s ease;
        }

        .mensaje-error-paso3.hidden {
            display: none !important;
        }

        .mensaje-error-paso3 i {
            font-size: 1.1rem;
            color: #dc2626;
        }

        /* Estados de validación */
        input.valid, textarea.valid {
            border-color: #10b981 !important;
            background-color: #f0fdf4 !important;
        }

        input.invalid, textarea.invalid {
            border-color: #dc2626 !important;
            background-color: #fef2f2 !important;
        }

        /* ============================================ */
        /* BARRA INFERIOR */
        /* ============================================ */

        .modal-confirmacion-barra {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.8rem;
            color: #78350f;
            border: 1px solid #fcd34d;
        }

        .modal-confirmacion-barra i {
            font-size: 1.2rem;
            color: #d97706;
            flex-shrink: 0;
        }

        .modal-confirmacion-barra strong {
            color: #78350f;
        }

        /* ============================================ */
        /* RESPONSIVE */
        /* ============================================ */

        @media (max-width: 480px) {
            .modal-confirmacion-contenido {
                padding: 24px 20px;
                margin: 16px;
                border-radius: 20px;
            }
            
            .modal-confirmacion-icono {
                width: 60px;
                height: 60px;
            }
            
            .modal-confirmacion-icono i {
                font-size: 2rem;
            }
            
            .modal-confirmacion-acciones {
                flex-direction: column;
                gap: 10px;
            }
            
            .modal-confirmacion-acciones button {
                width: 100%;
                min-height: 44px;
            }
            
            .modal-confirmacion-contenido h3 {
                font-size: 1.1rem;
            }
            
            .modal-confirmacion-barra {
                font-size: 0.7rem;
                padding: 10px 12px;
                flex-direction: column;
                text-align: center;
            }
        }

        @media (min-width: 481px) and (max-width: 768px) {
            .modal-confirmacion-contenido {
                max-width: 380px;
                padding: 28px 24px;
            }
        }

        @media (min-width: 769px) {
            .modal-confirmacion-contenido {
                max-width: 440px;
                padding: 36px 32px;
            }
        }        

        /* PRODUCTOS */
        #productos{scroll-margin-top:50px}
        @media(max-width:768px){#productos{scroll-margin-top:30px}section[id]{scroll-margin-top:60px}}
        section[id]{scroll-margin-top:70px}
        .results-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
        .contador-enhanced{font-size:0.8rem;color:var(--gray-600);background:var(--gray-100);padding:6px 14px;border-radius:40px}
        .contador-enhanced span{font-weight:700;color:var(--primary)}
        .productos-grid-enhanced{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .producto-card{background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid var(--gray-200);transition:all 0.3s ease;cursor:pointer;will-change:transform;contain:layout style paint}
        .producto-card:active{transform:scale(0.97)}
        .card-image{position:relative;height:160px;overflow:hidden;background:var(--gray-100);cursor:pointer}
        .card-image img{width:100%;height:100%;object-fit:contain;transition:transform 0.4s ease}
        .producto-card:hover .card-image img{transform:scale(1.05)}
        .badge-outlet{position:absolute;top:8px;left:8px;background:linear-gradient(135deg,var(--red-600),var(--orange-400));color:white;padding:3px 10px;border-radius:20px;font-size:0.6rem;font-weight:700;z-index:2}
        .card-info{padding:10px 12px}
        .card-info h3{font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:2px;line-height:1.2;cursor:pointer}
        .card-info h3:hover{text-decoration:underline}
        .card-info .codigo{font-size:0.55rem;color:var(--gray-500);font-family:monospace;margin-bottom:4px}
        .specs-badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
        .spec-badge{background:var(--gray-100);padding:2px 8px;border-radius:20px;font-size:0.55rem;color:var(--gray-600);display:inline-flex;align-items:center;gap:3px}
        .btn-detalle-enhanced{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--primary);color:white;padding:10px 12px;border-radius:40px;text-decoration:none;font-size:0.7rem;font-weight:600;width:100%;min-height:44px}
        .btn-detalle-enhanced:active{transform:scale(0.97)}
        .no-results{text-align:center;padding:40px 20px;background:white;border-radius:20px;grid-column:1/-1}
        .no-results i{font-size:3rem;color:var(--gray-300);margin-bottom:12px}
        .no-results p{color:var(--gray-500)}
        
        /* BOTÓN COTIZAR */
        .btn-cotizar-bottom{width:100%;padding:12px 16px;border-radius:40px;border:2px solid var(--primary);background:transparent;color:var(--primary);font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;position:relative;overflow:hidden}
        .btn-cotizar-bottom:hover{background:var(--primary);color:white;transform:translateY(-2px);box-shadow:0 4px 12px rgba(57,8,10,0.25)}
        .btn-cotizar-bottom:active{transform:scale(0.95)}
        .btn-cotizar-bottom.seleccionado{background:var(--green-500);border-color:var(--green-500);color:white}
        .btn-cotizar-bottom.seleccionado:hover{background:var(--green-600);border-color:var(--green-600);transform:translateY(-2px);box-shadow:0 4px 12px rgba(16,185,129,0.35)}
        @keyframes btnAgregadoPulse{0%{transform:scale(1)}30%{transform:scale(1.08)}60%{transform:scale(0.95)}100%{transform:scale(1)}}
        .btn-cotizar-bottom.seleccionado{animation:btnAgregadoPulse 0.5s ease}
        .btn-cotizar-bottom i{transition:transform 0.3s ease}
        .btn-cotizar-bottom.seleccionado i{transform:scale(1.2)}
        
        /* FILTROS MODAL */
        .filtros-modal{position:fixed;top:0;right:-100%;width:85%;max-width:320px;height:100%;background:white;z-index:10001;transition:right 0.3s ease;box-shadow:-5px 0 25px rgba(0,0,0,0.2);display:flex;flex-direction:column}
        .filtros-modal.show{right:0}
        .filtros-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:none}
        .filtros-modal-overlay.show{display:block}
        @media(min-width:769px){.filtros-modal{display:none!important}.filtros-modal-overlay{display:none!important}}
        @media(max-width:768px){.filtros-modal{display:flex!important;right:-100%}.filtros-modal.show{right:0}.filtros-modal-overlay{display:none}.filtros-modal-overlay.show{display:block}}
        .filtros-modal-header{padding:16px 20px;background:var(--primary);color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
        .filtros-modal-header h3{font-size:1.1rem;margin:0;display:flex;align-items:center;gap:8px}
        .close-modal-btn{background:rgba(255,255,255,0.2);border:none;color:white;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;font-size:1.2rem}
        .close-modal-btn:hover{background:rgba(255,255,255,0.3)}
        .close-modal-btn:active{transform:scale(0.95)}
        .filtros-modal-body{flex:1;padding:20px;overflow-y:auto;padding-bottom:80px}
        .filtro-group{margin-bottom:20px}
        .filtro-group label{display:block;font-size:0.75rem;font-weight:600;color:#6b7280;margin-bottom:8px;text-transform:uppercase}
        .filtro-group select{width:100%;padding:14px 16px;border:1px solid #e5e7eb;border-radius:16px;font-size:0.9rem;background:#f9fafb;cursor:pointer;transition:all 0.2s ease}
        .filtro-group select:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(57,8,10,0.1)}
        .filtros-modal-footer{position:sticky;bottom:0;left:0;right:0;padding:16px 20px;background:white;border-top:1px solid #e5e7eb;display:flex;gap:12px;flex-shrink:0;box-shadow:0 -2px 10px rgba(0,0,0,0.05);z-index:2}
        .filtros-modal-footer button{flex:1;padding:14px;border-radius:40px;font-weight:600;cursor:pointer;border:none;transition:all 0.2s ease;font-size:0.9rem}
        .filtros-modal-footer button:active{transform:scale(0.98)}
        .filtros-modal-footer .btn-filter{background:var(--primary);color:white}
        .filtros-modal-footer .btn-clear{background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb}
        
        /* BARRA DE COTIZACIÓN */
        .barra-cotizacion{position:fixed;bottom:0;left:0;right:0;background:var(--primary);color:white;padding:12px 16px;z-index:1000;box-shadow:0 -4px 20px rgba(0,0,0,0.3);backdrop-filter:blur(10px);transition:all 0.3s ease;min-height:70px}
        .barra-cotizacion.mini{padding:12px 16px}
        .barra-cotizacion.expanded{padding:16px}
        .barra-cotizacion-mini{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .barra-info-mini{display:flex;align-items:center;gap:10px;flex:1}
        .barra-icono{position:relative}
        .barra-icono i{font-size:1.4rem;color:var(--secondary)}
        .badge-cantidad{position:absolute;top:-10px;right:-14px;background:#d4d4ae;color:var(--primary);border-radius:50%;width:22px;height:22px;font-size:0.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease}
        .badge-cantidad.animado{animation:badgePulse 0.4s ease}
        @keyframes badgePulse{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}
        .barra-texto-mini{font-size:0.8rem;font-weight:500}
        .barra-texto-mini span{font-weight:800;color:var(--secondary)}
        .barra-acciones-mini{display:flex;gap:8px;align-items:center}
        .btn-cotizar-principal{background:#25D366;border:none;padding:10px 18px;border-radius:40px;color:white;font-weight:700;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.3s ease;min-height:48px}
        .btn-cotizar-principal:active{transform:scale(0.95)}
        .btn-cotizar-principal i{font-size:1rem}
        .btn-expandir{background:rgba(255,255,255,0.12);border:none;width:40px;height:40px;border-radius:50%;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;min-height:40px}
        .btn-expandir:active{transform:scale(0.95)}
        .barra-cotizacion-expanded{display:flex;flex-direction:column;gap:12px;margin-top:8px;max-height:200px;overflow-y:auto}
        .barra-productos-preview{max-height:120px;overflow-y:auto}
        .preview-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);gap:8px}
        .preview-info{flex:1;min-width:0}
        .preview-nombre{font-size:0.7rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .preview-detalles{display:flex;gap:10px;margin-top:2px;flex-wrap:wrap}
        .preview-detalles span{font-size:0.55rem;opacity:0.7;display:flex;align-items:center;gap:3px}
        .preview-eliminar{background:rgba(255,255,255,0.1);border:none;color:#ff6b6b;cursor:pointer;padding:4px 8px;border-radius:20px;font-size:0.7rem;min-height:32px}
        .preview-eliminar:active{transform:scale(0.95)}
        .barra-acciones-expanded{display:flex;gap:10px}
        .btn-limpiar{background:rgba(255,255,255,0.15);border:none;padding:10px 16px;border-radius:40px;color:white;cursor:pointer;font-size:0.7rem;font-weight:500;flex:1;min-height:44px}
        .btn-ver-cotizacion{background:#d4d4ae;border:none;padding:10px 16px;border-radius:40px;color:var(--primary);cursor:pointer;font-size:0.7rem;font-weight:700;flex:1;min-height:44px}
        
        /* TOAST */
        .toast-notificacion{position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);padding:14px 24px;border-radius:40px;font-weight:600;font-size:0.85rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.15);opacity:0;visibility:hidden;transition:all 0.3s ease;max-width:90%;text-align:center;display:flex;align-items:center;gap:10px}
        .toast-notificacion.show{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}
        .toast-notificacion.success{background:linear-gradient(135deg,#10b981,#059669);color:white}
        .toast-notificacion.error{background:linear-gradient(135deg,#ef4444,#dc2626);color:white}
        .toast-notificacion.warning{background:linear-gradient(135deg,#f59e0b,#d97706);color:white}
        .toast-notificacion.info{background:linear-gradient(135deg,#3b82f6,#2563eb);color:white}
        .toast-notificacion i{font-size:1.1rem}
        
        /* CAPTCHA */
        .captcha-container{animation:fadeIn 0.5s ease}
        .captcha-container input[type="number"]{font-size:1.2rem;font-weight:700;letter-spacing:2px;transition:all 0.3s ease}
        .captcha-container input[type="number"]:focus{border-color:#6b0000;outline:none;box-shadow:0 0 0 3px rgba(107,0,0,0.1)}
        .captcha-container input[type="number"].error{border-color:#dc2626;background-color:#fef2f2;animation:shake 0.4s ease}
        .captcha-container input[type="number"].success{border-color:#10b981;background-color:#f0fdf4}
        .captcha-container input[type="number"]::-webkit-inner-spin-button,.captcha-container input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        .captcha-container input[type="number"]{-moz-appearance:textfield}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        
        /* ANIMACIONES BARRA */
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideDown{from{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}
        @keyframes barraUpdate{0%{transform:scale(1)}50%{transform:scale(1.01)}100%{transform:scale(1)}}
        .barra-cotizacion{animation:slideUp 0.5s ease}
        .barra-cotizacion .badge-cantidad.animado{animation:badgePulse 0.4s ease}
        
        /* MODAL COTIZACIÓN */
        .modal-cotizacion{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10001;justify-content:center;align-items:center;padding:0}
        .modal-cotizacion.active{display:flex}
        .modal-cotizacion-contenido{background:white;border-radius:0;width:100%;height:100%;max-height:100vh;overflow:hidden;display:flex;flex-direction:column}
        .modal-cotizacion-header{background:var(--primary);color:white;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
        .modal-cotizacion-header h3{font-size:1rem;margin:0;display:flex;align-items:center;gap:8px}
        .modal-cotizacion-close{background:rgba(255,255,255,0.2);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
        .modal-cotizacion-close:active{transform:scale(0.95)}
        .modal-cotizacion-body{flex:1;overflow-y:auto;padding:16px}
        
        /* STEPPER */
        .stepper-container{position:relative;margin-bottom:20px;padding:0 8px}
        .stepper{display:flex;justify-content:space-between;position:relative;z-index:2}
        .stepper-step{display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;cursor:pointer}
        .stepper-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;transition:all 0.3s ease;border:2px solid var(--gray-300);background:white;color:var(--gray-500)}
        .stepper-step.activo .stepper-circle{background:var(--primary);color:white;border-color:var(--primary)}
        .stepper-step.completado .stepper-circle{background:var(--green-500);color:white;border-color:var(--green-500)}
        .stepper-step.completado .stepper-circle i{font-size:0.7rem}
        .stepper-label{font-size:0.55rem;color:var(--gray-500);text-align:center;font-weight:600}
        .stepper-step.activo .stepper-label{color:var(--primary)}
        .stepper-step.completado .stepper-label{color:var(--green-500)}
        .stepper-line{position:absolute;top:16px;left:16px;right:16px;height:2px;background:var(--gray-300);z-index:1}
        .paso-contenido{margin-bottom:16px}
        .paso-subtitulo{font-size:0.8rem;color:var(--gray-500);margin-bottom:12px}
        .paso-acciones{display:flex;gap:10px;padding:12px 0;border-top:1px solid var(--gray-200);position:sticky;bottom:0;background:white;flex-wrap:wrap}
        .paso-acciones button{flex:1;padding:12px 16px;border-radius:40px;font-weight:600;font-size:0.85rem;border:none;cursor:pointer;min-height:48px}
        .btn-paso-anterior{background:var(--gray-100);color:var(--gray-700)}
        .btn-paso-siguiente{background:var(--primary);color:white}
        .btn-paso-enviar{background:#25D366;color:white;flex:2}
        .btn-paso-anterior:active,.btn-paso-siguiente:active,.btn-paso-enviar:active{transform:scale(0.97)}
        
        /* PRODUCTOS EN PASO 1 */
        .productos-lista{border:1px solid var(--gray-200);border-radius:12px;padding:8px;max-height:200px;overflow-y:auto;background:var(--gray-50);margin-bottom:12px}
        .producto-item{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid var(--gray-200);gap:8px}
        .producto-item:last-child{border-bottom:none}
        .producto-info{flex:1;min-width:0}
        .producto-nombre{font-size:0.8rem;font-weight:600;color:var(--gray-800)}
        .producto-codigo{font-size:0.6rem;color:var(--gray-400);font-family:monospace}
        .producto-especificaciones{display:flex;gap:6px;margin-top:2px;flex-wrap:wrap}
        .producto-especificacion{font-size:0.55rem;background:var(--gray-200);padding:1px 8px;border-radius:20px;display:flex;align-items:center;gap:3px;color:var(--gray-600)}
        .btn-eliminar-producto{background:none;border:none;color:var(--primary);cursor:pointer;padding:8px;min-height:36px;min-width:36px}
        .btn-eliminar-producto:active{transform:scale(0.95)}
        .btn-agregar-mas{background:none;border:1px dashed var(--primary);color:var(--primary);padding:10px;border-radius:40px;cursor:pointer;width:100%;font-size:0.8rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px}
        
        /* OPCIONES ASESOR */
        .opciones-asesor{display:flex;flex-direction:column;gap:16px;margin:16px 0}
        .opcion-asesor{background:var(--gray-50);border:2px solid var(--gray-200);border-radius:16px;padding:16px;cursor:pointer;transition:all 0.3s ease}
        .opcion-asesor:hover{border-color:var(--primary);transform:translateY(-2px)}
        .opcion-asesor.activa{border-color:var(--primary);background:white;box-shadow:0 4px 16px rgba(57,8,10,0.12)}
        .opcion-header{display:flex;align-items:flex-start;gap:14px}
        .opcion-icono{width:40px;height:40px;background:rgba(57,8,10,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .opcion-icono i{font-size:1.2rem;color:var(--primary)}
        .opcion-texto{flex:1}
        .opcion-texto strong{display:block;font-size:0.95rem;color:var(--gray-800)}
        .opcion-texto span{font-size:0.75rem;color:var(--gray-500)}
        .opcion-header .check{color:var(--green-500);font-size:1.3rem;margin-left:auto;flex-shrink:0}
        .asesor-asignado{display:flex;align-items:center;gap:14px;margin-top:14px;padding:14px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;border:1px solid #bbf7d0}
        .asesor-avatar{width:50px;height:50px;background:var(--primary);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;flex-shrink:0}
        .asesor-info{flex:1;min-width:0}
        .asesor-nombre{font-weight:700;font-size:0.9rem;color:var(--gray-800);display:flex;flex-wrap:wrap;align-items:center;gap:8px}
        .badge-auto{font-size:0.55rem;background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:20px;font-weight:500}
        .asesor-detalles{display:flex;flex-wrap:wrap;gap:12px;font-size:0.7rem;color:var(--gray-500);margin-top:4px}
        .asesor-detalles i{margin-right:3px;width:14px}
        .btn-cambiar-asesor-mini{background:white;border:1px solid var(--gray-200);padding:6px 14px;border-radius:40px;font-size:0.7rem;font-weight:600;color:var(--gray-700);cursor:pointer;transition:all 0.3s ease;display:flex;align-items:center;gap:6px;flex-shrink:0}
        .btn-cambiar-asesor-mini:hover{background:var(--primary);color:white;border-color:var(--primary)}
        .btn-usar-auto,.btn-usar-manual{margin-top:12px;padding:10px 16px;border-radius:40px;border:2px dashed var(--primary);background:transparent;color:var(--primary);font-weight:600;font-size:0.8rem;cursor:pointer;width:100%;transition:all 0.3s ease;display:flex;align-items:center;justify-content:center;gap:8px}
        .btn-usar-auto:hover,.btn-usar-manual:hover{background:var(--primary);color:white;border-style:solid}
        .asesores-lista{margin-top:12px;display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto;padding-right:4px}
        .asesores-lista::-webkit-scrollbar{width:4px}
        .asesores-lista::-webkit-scrollbar-thumb{background:var(--gray-300);border-radius:10px}
        .asesor-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:1px solid var(--gray-200);cursor:pointer;transition:all 0.3s ease;background:white}
        .asesor-item:hover{border-color:var(--primary);background:var(--gray-50);transform:translateX(4px)}
        .asesor-item.selected{border-color:var(--green-500);background:#f0fdf4}
        .asesor-avatar-small{position:relative;width:42px;height:42px;background:var(--primary);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;flex-shrink:0}
        .btn-seleccionar{margin-left:auto;padding:4px 14px;border-radius:40px;border:none;background:var(--primary);color:white;font-size:0.7rem;font-weight:600;cursor:pointer;transition:all 0.3s ease;flex-shrink:0}
        .btn-seleccionar:hover{background:var(--primary-dark);transform:scale(1.05)}
        .seleccionado-badge{margin-left:auto;color:var(--green-500);font-size:0.7rem;font-weight:600;display:flex;align-items:center;gap:4px;flex-shrink:0}
        .email-future{display:flex;gap:14px;padding:14px 16px;background:#fffbeb;border-radius:12px;border:1px solid #fcd34d;margin-top:16px}
        .email-future i{color:#d97706;font-size:1.2rem;flex-shrink:0;margin-top:2px}
        .email-future strong{display:block;font-size:0.8rem;color:#78350f}
        .email-future span{font-size:0.7rem;color:#92400e}
        .alert-error{background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:16px;text-align:center;color:#991b1b}
        .alert-error i{font-size:2rem;display:block;margin-bottom:8px}
        .alert-error .text-sm{font-size:0.75rem;opacity:0.8}
        
        /* DATOS PASO 3 */
        .form-group{margin-bottom:14px}
        .form-group label{display:block;font-size:0.7rem;font-weight:600;color:var(--gray-600);margin-bottom:4px;text-transform:uppercase}
        .form-group label .required{color:var(--red-500)}
        .form-group input,.form-group select,.form-group textarea{width:100%;padding:12px 14px;border:1px solid var(--gray-200);border-radius:12px;font-size:0.85rem;background:white;min-height:48px}
        .form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(57,8,10,0.1)}
        .form-group textarea{min-height:80px;resize:vertical}
        .telefono-wrapper{display:flex;gap:8px;flex-wrap:wrap}
        .telefono-wrapper select{width:auto;min-width:100px;flex-shrink:0}
        .telefono-wrapper input{flex:1}
        .mensaje-error{font-size:0.65rem;margin-top:4px;display:flex;align-items:center;gap:4px}
        .mensaje-error.hidden{display:none}
        
        /* TELÉFONO VALIDACIÓN */
        .telefono-ayuda{font-size:0.7rem;margin-top:6px;min-height:20px;display:block}
        .ayuda-formato{color:var(--gray-500);display:flex;align-items:center;gap:6px}
        .ayuda-formato.valido{color:#10b981;font-weight:500}
        .ayuda-formato.valido i{color:#10b981}
        .telefono-advertencia{font-size:0.65rem;color:#d97706;background:#fffbeb;padding:8px 12px;border-radius:8px;margin-top:6px;border:1px solid #fcd34d;display:none;animation:fadeInWarning 0.3s ease}
        .telefono-advertencia i{margin-right:6px;color:#d97706}
        @keyframes fadeInWarning{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        input.tel-valid{border-color:#10b981!important;background-color:#f0fdf4!important}
        input.tel-invalid{border-color:#dc2626!important;background-color:#fef2f2!important;animation:shakeInput 0.3s ease}
        input.tel-warning{border-color:#f59e0b!important;background-color:#fffbeb!important}
        @keyframes shakeInput{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        
        /* RESUMEN PASO 4 */
        .resumen-envio{text-align:center;padding:12px 0}
        .resumen-icono i{font-size:3rem;color:var(--green-500);margin-bottom:8px}
        .resumen-envio h4{font-size:1.2rem;color:var(--gray-800);margin-bottom:4px}
        .resumen-datos{background:var(--gray-50);border-radius:16px;padding:12px;margin-top:12px;text-align:left}
        .resumen-item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-200);font-size:0.8rem}
        .resumen-item:last-child{border-bottom:none}
        .resumen-label{color:var(--gray-500)}
        .resumen-valor{font-weight:600;color:var(--gray-800)}
        
        /* MODAL QR */
        .modal-qr{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:10000;flex-direction:column;align-items:center;justify-content:center;padding:16px}
        .modal-qr.active{display:flex}
        .modal-qr-contenido{background:white;border-radius:20px;width:100%;max-width:450px;max-height:90vh;overflow:hidden;animation:modalFadeIn 0.3s ease}
        .modal-qr-header{background:var(--primary);color:white;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}
        .modal-qr-header h3{font-size:1rem;margin:0;display:flex;align-items:center;gap:8px}
        .modal-qr-close{background:rgba(255,255,255,0.2);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease}
        .modal-qr-close:hover{background:rgba(255,255,255,0.3);transform:scale(1.05)}
        .modal-qr-close:active{transform:scale(0.95)}
        .modal-qr-body{padding:20px}
        #qr-reader{width:100%;max-width:400px;margin:0 auto;border-radius:12px;overflow:hidden;background:#f0f0f0;min-height:200px}
        #qr-reader video{width:100%;border-radius:12px}
        #qr-reader canvas{display:none!important}
        .qr-instrucciones{display:flex;align-items:center;gap:8px;justify-content:center;margin-top:12px;font-size:0.75rem;color:var(--gray-500)}
        .qr-instrucciones i{color:var(--primary)}
        .btn-cancelar-qr{margin-top:16px;width:100%;padding:12px;border-radius:40px;border:1px solid #e5e7eb;background:white;cursor:pointer;font-weight:600;transition:all 0.2s ease}
        .btn-cancelar-qr:hover{background:#f3f4f6}
        .btn-cancelar-qr:active{transform:scale(0.98)}
        @keyframes modalFadeIn{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        
        /* MODAL PERSONALIZADO */
        .modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:20000;justify-content:center;align-items:center;padding:20px}
        .modal-overlay.active{display:flex}
        .modal-custom{background:white;border-radius:20px;width:100%;max-width:400px;overflow:hidden;animation:modalFadeIn 0.3s ease}
        @keyframes modalFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .modal-custom-header{padding:16px 20px;text-align:center;border-bottom:1px solid var(--gray-200)}
        .modal-custom-header i{font-size:2.5rem;margin-bottom:8px;display:inline-block}
        .modal-custom-header h3{font-size:1.1rem;font-weight:700}
        .modal-custom-body{padding:20px;text-align:center;color:var(--gray-600);font-size:0.9rem;line-height:1.5}
        .modal-custom-footer{padding:12px 20px;display:flex;gap:10px;justify-content:center;border-top:1px solid var(--gray-200);background:var(--gray-50);flex-wrap:wrap}
        .modal-custom-footer button{padding:10px 24px;border-radius:40px;font-weight:600;font-size:0.85rem;cursor:pointer;border:none;min-height:44px;min-width:80px}
        .modal-custom-footer button:active{transform:scale(0.97)}
        .btn-modal-primary{background:var(--primary);color:white}
        .btn-modal-success{background:#10b981;color:white}
        .btn-modal-danger{background:#dc3545;color:white}
        .btn-modal-warning{background:#f59e0b;color:white}
        .btn-modal-secondary{background:var(--gray-200);color:var(--gray-700)}
        
        /* FOOTER */
        footer{background:var(--primary);color:white;padding:30px 16px 20px;margin-top:30px}
        .footer-grid{display:grid;grid-template-columns:1fr;gap:24px;max-width:1200px;margin:0 auto;text-align:center}
        .footer-logo img{width:130px;margin-bottom:10px}
        .footer-logo p{font-size:0.7rem;opacity:0.7;line-height:1.5}
        .footer-social h4,.footer-links h4{font-size:0.85rem;margin-bottom:12px;color:var(--secondary)}
        .footer-social a,.footer-links a{display:flex;align-items:center;justify-content:center;gap:10px;color:rgba(255,255,255,0.7);text-decoration:none;margin-bottom:8px;transition:0.3s;font-size:0.75rem}
        .footer-social a:hover,.footer-links a:hover{color:var(--secondary);transform:translateX(3px)}
        .footer-bottom{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.6rem;opacity:0.6}
        
        /* SECURITY BADGE */
        #securityBadge{animation:slideInRight 0.3s ease}
        @keyframes slideInRight{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes badgePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        #contadorBloqueo{font-family:monospace;font-size:2rem}
        #barraBloqueo{transition:width 1s linear}
        .btn-paso-enviar:disabled{opacity:0.5;cursor:not-allowed;transform:none!important}
        .btn-paso-enviar:disabled:hover{transform:none!important;box-shadow:none!important}
        
/* ============================================ */
/* WHATSAPP FLOTANTE CON TEXTO FUERA */
/* ============================================ */

.whatsapp-float-wrapper {
    position: fixed;
    bottom: 180px;
    right: 16px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInRight 0.5s ease;
}

/* ============================================ */
/* ETIQUETA DE TEXTO (FUERA DEL BOTÓN) */
/* ============================================ */

.whatsapp-label {
    background: white;
    color: #1f2937;
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    white-space: nowrap;
    position: relative;
    order: 0; /* El texto va primero (izquierda) */
    transition: all 0.3s ease;
}

/* Triángulo que apunta al botón */
.whatsapp-label::after {
    content: '';
    position: absolute;
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
    border-left: 8px solid white;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
}

/* ============================================ */
/* BOTÓN WHATSAPP (SIN TEXTO) */
/* ============================================ */

.whatsapp-float {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #25D366;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
    transition: all 0.3s ease;
    position: relative;
    animation: whatsappPulse 2s infinite;
    flex-shrink: 0;
    order: 1; /* El botón va después del texto (derecha) */
}

.whatsapp-float:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(37, 211, 102, 0.6);
}

.whatsapp-float:active {
    transform: scale(0.95);
}

.whatsapp-float i {
    font-size: 2rem;
    color: white;
}

.whatsapp-float .whatsapp-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ff6b6b;
    color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    font-size: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: badgePulse 1.5s infinite;
}

/* ============================================ */
/* ANIMACIONES */
/* ============================================ */

@keyframes slideInRight {
    from {
        transform: translateX(100px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes whatsappPulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 6px 30px rgba(37, 211, 102, 0.6);
    }
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

/* ============================================ */
/* RESPONSIVE */
/* ============================================ */

/* Tablet */
@media (max-width: 768px) {
    .whatsapp-float-wrapper {
        bottom: 160px;
        right: 12px;
        gap: 10px;
    }
    
    .whatsapp-label {
        font-size: 0.7rem;
        padding: 8px 14px;
    }
    
    .whatsapp-float {
        width: 56px;
        height: 56px;
    }
    
    .whatsapp-float i {
        font-size: 1.6rem;
    }
}

/* Móvil */
@media (max-width: 480px) {
    .whatsapp-float-wrapper {
        bottom: 170px;
        right: 15px;
        gap: 8px;
    }
    
    .whatsapp-label {
        font-size: 0.6rem;
        padding: 6px 12px;
    }
    
    .whatsapp-label::after {
        right: -6px;
        border-left-width: 6px;
        border-top-width: 6px;
        border-bottom-width: 6px;
    }
    
    .whatsapp-float {
        width: 48px;
        height: 48px;
    }
    
    .whatsapp-float i {
        font-size: 1.4rem;
    }
    
    .whatsapp-float .whatsapp-badge {
        width: 18px;
        height: 18px;
        font-size: 0.5rem;
        top: -3px;
        right: -3px;
    }
}

/* Móvil muy pequeño - ocultar texto */
@media (max-width: 380px) {
    .whatsapp-label {
        display: none;
    }
    
    .whatsapp-float-wrapper {
        right: 10px;
    }
}

        /* BARRA DE AYUDA */
        .help-bar{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#1e293b,#0f172a);padding:12px 16px;z-index:99;display:none;}
        .help-bar.show{display:block;animation:slideUp 0.5s ease}
        .help-bar-btn{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:white;padding:12px 16px;border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all 0.3s ease;font-size:0.9rem}
        .help-bar-btn:hover{background:rgba(255,255,255,0.1);border-color:#25D366}
        .help-bar-btn i.fa-headset{font-size:1.3rem;color:#25D366}
        .help-bar-btn strong{color:#25D366}
        .help-bar-btn i.fa-chevron-right{margin-left:auto;color:#64748b}
        
        /* MODAL NO ENCUENTRAS LO QUE BUSCAS */
        .modal-sin-resultados{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);z-index:10002;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;visibility:hidden;transition:all 0.3s ease}
        .modal-sin-resultados.show{opacity:1;visibility:visible}
        .modal-sin-resultados-contenido{background:white;border-radius:24px;padding:32px 28px;max-width:480px;width:100%;text-align:center;transform:scale(0.9) translateY(20px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 20px 60px rgba(0,0,0,0.3)}
        .modal-sin-resultados.show .modal-sin-resultados-contenido{transform:scale(1) translateY(0)}
        .modal-sin-resultados-icono{width:72px;height:72px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
        .modal-sin-resultados-icono i{font-size:2.5rem;color:white}
        .modal-sin-resultados-contenido h3{font-size:1.3rem;font-weight:700;color:#1f2937;margin-bottom:8px}
        .modal-sin-resultados-contenido > p{font-size:0.9rem;color:#6b7280;margin-bottom:20px;line-height:1.5}
        .modal-sin-resultados-opciones{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}
        .opcion-contacto{display:flex;align-items:center;gap:14px;padding:14px 16px;background:#f8fafc;border-radius:16px;cursor:pointer;transition:all 0.3s ease;border:1px solid #e2e8f0;text-align:left}
        .opcion-contacto:hover{background:#f1f5f9;border-color:#3b82f6;transform:translateX(4px)}
        .opcion-contacto:active{transform:scale(0.98)}
        .opcion-icono{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.2rem}
        .opcion-contacto:nth-child(1) .opcion-icono{background:#dcfce7;color:#16a34a}
        .opcion-contacto:nth-child(2) .opcion-icono{background:#dbeafe;color:#2563eb}
        .opcion-contacto:nth-child(3) .opcion-icono{background:#fef3c7;color:#d97706}
        .opcion-texto{flex:1}
        .opcion-texto strong{display:block;font-size:0.85rem;color:#1f2937}
        .opcion-texto span{font-size:0.75rem;color:#6b7280}
        .opcion-contacto .fa-chevron-right{color:#94a3b8;font-size:0.8rem}
        .btn-cerrar-modal{background:#f1f5f9;border:none;color:#64748b;padding:10px 20px;border-radius:40px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.3s ease;width:100%}
        .btn-cerrar-modal:hover{background:#e2e8f0}
        .btn-cerrar-modal i{margin-right:6px}
        
        /* SECCIÓN DE SUGERENCIAS */
        .sugerencias-section{margin:30px 0;padding:24px;background:white;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.05)}
        .sugerencias-section h3{font-size:1.1rem;font-weight:700;color:#1f2937;text-align:center;margin-bottom:20px}
        .sugerencias-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
        .sugerencia-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px;text-align:center;cursor:pointer;transition:all 0.3s ease}
        .sugerencia-card:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,0.08);border-color:#3b82f6}
        .sugerencia-icono{width:48px;height:48px;background:#dbeafe;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
        .sugerencia-icono i{font-size:1.3rem;color:#2563eb}
        .sugerencia-card h4{font-size:0.85rem;font-weight:600;color:#1f2937;margin-bottom:6px}
        .sugerencia-card p{font-size:0.75rem;color:#6b7280;margin-bottom:12px;line-height:1.4}
        .sugerencia-accion{font-size:0.75rem;font-weight:600;color:#2563eb;display:inline-block;transition:all 0.3s ease}
        .sugerencia-card:hover .sugerencia-accion{transform:translateX(4px)}
        
        /* BANNER PRODUCTOS PRÓXIMAMENTE */
        .banner-proximamente{background:linear-gradient(135deg,#1e293b,#0f172a);padding:12px 16px;margin:0 0 20px 0;border-bottom:2px solid #f59e0b;display:none}
        .banner-proximamente.show{display:block;animation:slideDown 0.5s ease}
        .banner-proximamente-contenido{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .banner-icono{width:40px;height:40px;background:rgba(245,158,11,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .banner-icono i{font-size:1.2rem;color:#f59e0b}
        .banner-texto{flex:1;color:#e2e8f0;font-size:0.85rem}
        .banner-texto strong{color:#f59e0b;margin-right:6px}
        .banner-texto a{color:#60a5fa;font-weight:600;text-decoration:underline;cursor:pointer}
        .banner-texto a:hover{color:#93bbfc}
        .banner-cerrar{background:rgba(255,255,255,0.05);border:none;color:#94a3b8;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease}
        .banner-cerrar:hover{background:rgba(255,255,255,0.1);color:white}

        /* ============================================ */
        /* MODAL DE CONTACTO RÁPIDO - VERSIÓN MEJORADA */
        /* ============================================ */

        /* ============================================ */
        /* OVERLAY */
        /* ============================================ */

        .modal-contacto-rapido {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 10003;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .modal-contacto-rapido.show {
            opacity: 1;
            visibility: visible;
        }

        /* ============================================ */
        /* CONTENEDOR */
        /* ============================================ */

        .modal-contacto-rapido-contenido {
            background: white;
            border-radius: 20px;
            padding: 0;
            max-width: 460px;
            width: 100%;
            max-height: 88vh;
            overflow: hidden;
            transform: scale(0.9) translateY(20px);
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
        }

        .modal-contacto-rapido.show .modal-contacto-rapido-contenido {
            transform: scale(1) translateY(0);
        }

        /* ============================================ */
        /* HEADER COMPACTO */
        /* ============================================ */

        .modal-contacto-rapido-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 24px;
            background: linear-gradient(135deg, #fafafa, #f1f5f9);
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
        }

        .modal-contacto-rapido-header i {
            font-size: 1.5rem;
            color: #6b0000;
            background: rgba(107, 0, 0, 0.08);
            width: 42px;
            height: 42px;
            border-radius: 50%;
            line-height: 42px;
            text-align: center;
            flex-shrink: 0;
        }

        .modal-contacto-rapido-header .header-text {
            flex: 1;
            min-width: 0;
        }

        .modal-contacto-rapido-header .header-text h3 {
            font-size: 1rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
            line-height: 1.2;
        }

        .modal-contacto-rapido-header .header-text p {
            font-size: 0.7rem;
            color: #6b7280;
            margin: 0;
            line-height: 1.3;
        }

        /* ============================================ */
        /* BODY CON ESPACIADO REDUCIDO */
        /* ============================================ */

        .modal-contacto-rapido-body {
            padding: 16px 24px 10px 24px;
            overflow-y: auto;
            flex: 1;
        }

        .modal-contacto-rapido-body .form-group {
            margin-bottom: 12px;
        }

        .modal-contacto-rapido-body .form-group label {
            display: block;
            font-size: 0.7rem;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 3px;
        }

        .modal-contacto-rapido-body .form-group label .required {
            color: #dc2626;
        }

        .modal-contacto-rapido-body .form-group label .optional {
            color: #9ca3af;
            font-weight: 400;
        }

        .modal-contacto-rapido-body .form-group input,
        .modal-contacto-rapido-body .form-group textarea {
            width: 100%;
            padding: 9px 14px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            font-family: inherit;
            background: #fafafa;
            color: #1f2937;
        }

        .modal-contacto-rapido-body .form-group input:focus,
        .modal-contacto-rapido-body .form-group textarea:focus {
            outline: none;
            border-color: #6b0000;
            background: white;
            box-shadow: 0 0 0 3px rgba(107, 0, 0, 0.06);
        }

        .modal-contacto-rapido-body .form-group textarea {
            resize: vertical;
            min-height: 56px;
        }

        /* ============================================ */
        /* SELECT DE PAÍS */
        /* ============================================ */

        .modal-contacto-rapido-body .telefono-wrapper {
            display: flex;
            gap: 8px;
            flex-wrap: nowrap;
        }

        .modal-contacto-rapido-body .telefono-wrapper select {
            min-width: 100px;
            flex-shrink: 0;
            padding: 9px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 0.85rem;
            background: #fafafa;
            cursor: pointer;
            transition: all 0.3s ease;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
            padding-right: 32px;
        }

        .modal-contacto-rapido-body .telefono-wrapper select:focus {
            outline: none;
            border-color: #6b0000;
            background: white;
            box-shadow: 0 0 0 3px rgba(107, 0, 0, 0.06);
        }

        .modal-contacto-rapido-body .telefono-wrapper input {
            flex: 1;
            min-width: 0;
        }

        /* ============================================ */
        /* MENSAJES DE ERROR */
        /* ============================================ */

        .modal-contacto-rapido-body .mensaje-error {
            font-size: 0.65rem;
            color: #dc2626;
            margin-top: 3px;
            display: none;
            align-items: center;
            gap: 4px;
        }

        .modal-contacto-rapido-body .mensaje-error i {
            font-size: 0.65rem;
        }

        .modal-contacto-rapido-body .mensaje-error:not(.hidden) {
            display: flex !important;
        }

        /* ============================================ */
        /* AYUDA DE TELÉFONO */
        /* ============================================ */

        .modal-contacto-rapido-body .telefono-ayuda {
            font-size: 0.65rem;
            color: #6b7280;
            margin-top: 3px;
            display: block;
        }

        .modal-contacto-rapido-body .telefono-ayuda .ayuda-formato {
            display: flex;
            align-items: flex-start;
            gap: 4px;
        }

        /* ============================================ */
        /* TEXTO DE SEGURIDAD */
        /* ============================================ */

        .modal-contacto-rapido-body .texto-seguridad {
            font-size: 0.65rem;
            color: #6b7280;
            margin-top: 8px;
            padding: 8px 12px;
            background: #f0fdf4;
            border-radius: 8px;
            border: 1px solid #bbf7d0;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .modal-contacto-rapido-body .texto-seguridad i {
            color: #10b981;
        }

        /* ============================================ */
        /* FOOTER COMPACTO */
        /* ============================================ */

        .modal-contacto-rapido-footer {
            padding: 10px 24px 18px 24px;
            display: flex;
            gap: 10px;
            border-top: 1px solid #e2e8f0;
            background: #fafafa;
            flex-shrink: 0;
            border-radius: 0 0 20px 20px;
        }

        .modal-contacto-rapido-footer button {
            flex: 1;
            padding: 10px 16px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-cancelar {
            background: #f1f5f9;
            color: #4b5563;
        }

        .btn-cancelar:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }

        .btn-enviar {
            background: #6b0000;
            color: white;
            box-shadow: 0 4px 12px rgba(107, 0, 0, 0.2);
        }

        .btn-enviar:hover:not(:disabled) {
            background: #4a0000;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(107, 0, 0, 0.3);
        }

        .btn-enviar:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
            box-shadow: none !important;
        }

        /* ============================================ */
        /* RESPONSIVE - MÓVIL */
        /* ============================================ */

        @media (max-width: 768px) {
            .modal-contacto-rapido {
                padding: 12px;
                align-items: flex-end;
            }
            
            .modal-contacto-rapido-contenido {
                max-width: 100%;
                max-height: 92vh;
                border-radius: 16px 16px 0 0;
                transform: scale(1) translateY(30px);
            }
            
            .modal-contacto-rapido.show .modal-contacto-rapido-contenido {
                transform: scale(1) translateY(0);
            }
            
            .modal-contacto-rapido-header {
                padding: 14px 18px;
                gap: 10px;
            }
            
            .modal-contacto-rapido-header i {
                width: 38px;
                height: 38px;
                line-height: 38px;
                font-size: 1.3rem;
            }
            
            .modal-contacto-rapido-header .header-text h3 {
                font-size: 0.95rem;
            }
            
            .modal-contacto-rapido-header .header-text p {
                font-size: 0.65rem;
            }
            
            .modal-contacto-rapido-body {
                padding: 14px 18px 8px 18px;
            }
            
            .modal-contacto-rapido-body .form-group {
                margin-bottom: 10px;
            }
            
            .modal-contacto-rapido-body .form-group input,
            .modal-contacto-rapido-body .form-group textarea {
                padding: 8px 12px;
                font-size: 0.85rem;
            }
            
            .modal-contacto-rapido-body .form-group textarea {
                min-height: 50px;
            }
            
            .modal-contacto-rapido-body .telefono-wrapper {
                flex-wrap: wrap;
            }
            
            .modal-contacto-rapido-body .telefono-wrapper select {
                min-width: 100%;
            }
            
            .modal-contacto-rapido-body .telefono-wrapper input {
                min-width: 100%;
            }
            
            .modal-contacto-rapido-footer {
                padding: 8px 18px 14px 18px;
                gap: 8px;
            }
            
            .modal-contacto-rapido-footer button {
                padding: 10px 14px;
                font-size: 0.8rem;
                min-height: 42px;
            }
        }

        @media (max-width: 480px) {
            .modal-contacto-rapido-contenido {
                max-height: 94vh;
            }
            
            .modal-contacto-rapido-header {
                padding: 12px 16px;
                gap: 10px;
            }
            
            .modal-contacto-rapido-header i {
                width: 34px;
                height: 34px;
                line-height: 34px;
                font-size: 1.1rem;
            }
            
            .modal-contacto-rapido-header .header-text h3 {
                font-size: 0.9rem;
            }
            
            .modal-contacto-rapido-body {
                padding: 12px 16px 6px 16px;
            }
            
            .modal-contacto-rapido-body .form-group {
                margin-bottom: 8px;
            }
            
            .modal-contacto-rapido-body .form-group input,
            .modal-contacto-rapido-body .form-group textarea {
                padding: 8px 12px;
                font-size: 0.8rem;
                border-radius: 8px;
            }
            
            .modal-contacto-rapido-body .form-group textarea {
                min-height: 44px;
            }
            
            .modal-contacto-rapido-body .texto-seguridad {
                font-size: 0.6rem;
                padding: 6px 10px;
            }
            
            .modal-contacto-rapido-footer {
                padding: 6px 16px 12px 16px;
                flex-direction: column;
                gap: 6px;
            }
            
            .modal-contacto-rapido-footer button {
                padding: 10px 14px;
                font-size: 0.8rem;
                min-height: 40px;
                width: 100%;
            }
        }

        .btn-cancelar{background:#f3f4f6;color:#4b5563}
        .btn-cancelar:hover{background:#e5e7eb}
        .btn-enviar{background:#6b0000;color:white}
        .btn-enviar:hover{background:#4a0000;transform:translateY(-2px);box-shadow:0 4px 12px rgba(107,0,0,0.3)}
        .btn-enviar:disabled{opacity:0.5;cursor:not-allowed;transform:none!important}
        
        /* MODAL ASESOR ASIGNADO */

        .modal-asesor-asignado {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 10004;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s ease;
        }

        .modal-asesor-asignado.show {
            opacity: 1;
            visibility: visible;
        }

        .modal-asesor-asignado-contenido {
            background: white;
            border-radius: 24px;
            padding: 36px 32px 32px 32px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            transform: scale(0.9) translateY(30px);
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        }

        .modal-asesor-asignado.show .modal-asesor-asignado-contenido {
            transform: scale(1) translateY(0);
        }

        /* ============================================ */
        /* ICONO ANIMADO */
        /* ============================================ */

        .modal-asesor-asignado-icono {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            animation: iconoAsignado 0.8s ease;
            box-shadow: 0 8px 30px rgba(16, 185, 129, 0.3);
        }

        @keyframes iconoAsignado {
            0% {
                transform: scale(0) rotate(-30deg);
                opacity: 0;
            }
            60% {
                transform: scale(1.15) rotate(5deg);
                opacity: 1;
            }
            100% {
                transform: scale(1) rotate(0);
            }
        }

        .modal-asesor-asignado-icono i {
            font-size: 2.8rem;
            color: white;
        }

        /* ============================================ */
        /* TEXTO */
        /* ============================================ */

        .modal-asesor-asignado-contenido h3 {
            font-size: 1.4rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 4px;
        }

        .mensaje-bienvenida {
            font-size: 0.95rem;
            color: #4b5563;
            margin-bottom: 20px;
        }

        .mensaje-bienvenida strong {
            color: #1f2937;
        }

        /* ============================================ */
        /* TARJETA DEL ASESOR */
        /* ============================================ */

        .asesor-info-card {
            display: flex;
            align-items: center;
            gap: 16px;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 16px;
            padding: 16px 20px;
            border: 1px solid #e2e8f0;
            margin-bottom: 20px;
            text-align: left;
        }

        .asesor-avatar {
            width: 52px;
            height: 52px;
            background: #6b0000;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            font-weight: 700;
            flex-shrink: 0;
        }

        .asesor-datos {
            flex: 1;
        }

        .asesor-nombre {
            font-weight: 700;
            font-size: 1rem;
            color: #1f2937;
        }

        .asesor-telefono {
            font-size: 0.8rem;
            color: #6b7280;
        }

        .asesor-telefono i {
            margin-right: 4px;
        }

        .asesor-estado {
            font-size: 0.7rem;
            color: #10b981;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;
        }

        .estado-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            display: inline-block;
            animation: dotPulse 2s infinite;
        }

        @keyframes dotPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.8); }
        }

        /* ============================================ */
        /* INFORMACIÓN DE ACCIÓN */
        /* ============================================ */

        .modal-acciones-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
        }

        .info-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.8rem;
            color: #4b5563;
            padding: 8px 12px;
            background: #f8fafc;
            border-radius: 10px;
        }

        .info-item i {
            font-size: 1rem;
            width: 20px;
            text-align: center;
        }

        /* ============================================ */
        /* BOTONES */
        /* ============================================ */

        .modal-asesor-botones {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
        }

        .modal-asesor-botones button {
            flex: 1;
            padding: 12px 16px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-cerrar-asesor {
            background: #f1f5f9;
            color: #4b5563;
        }

        .btn-cerrar-asesor:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }

        .btn-whatsapp-asesor {
            background: #25D366;
            color: white;
            box-shadow: 0 4px 14px rgba(37, 211, 102, 0.3);
        }

        .btn-whatsapp-asesor:hover {
            background: #1da851;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
        }

        /* ============================================ */
        /* BARRA DE PROGRESO */
        /* ============================================ */

        .modal-progreso {
            margin-top: 8px;
        }

        .modal-progreso span {
            font-size: 0.7rem;
            color: #6b7280;
            display: block;
            margin-bottom: 4px;
        }

        .progreso-barra {
            width: 100%;
            height: 4px;
            background: #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
        }

        .progreso-llenado {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 10px;
            transition: width 0.3s ease;
            width: 0%;
        }

        /* ============================================ */
        /* RESPONSIVE */
        /* ============================================ */

        @media (max-width: 480px) {
            .modal-asesor-asignado-contenido {
                padding: 24px 20px 20px 20px;
                margin: 16px;
                border-radius: 20px;
            }
            
            .modal-asesor-asignado-icono {
                width: 64px;
                height: 64px;
            }
            
            .modal-asesor-asignado-icono i {
                font-size: 2rem;
            }
            
            .modal-asesor-asignado-contenido h3 {
                font-size: 1.2rem;
            }
            
            .mensaje-bienvenida {
                font-size: 0.85rem;
            }
            
            .asesor-info-card {
                padding: 14px 16px;
                flex-wrap: wrap;
                justify-content: center;
                text-align: center;
            }
            
            .asesor-avatar {
                width: 44px;
                height: 44px;
                font-size: 1.1rem;
            }
            
            .modal-asesor-botones {
                flex-direction: column;
            }
            
            .modal-asesor-botones button {
                width: 100%;
                min-height: 44px;
            }
            
            .info-item {
                font-size: 0.75rem;
                padding: 6px 10px;
            }
        }
        .btn-continuar{background:#6b0000;color:white;border:none;padding:12px 24px;border-radius:40px;font-weight:600;font-size:0.9rem;cursor:pointer;transition:all 0.3s ease;width:100%;margin-top:8px}
        .btn-continuar:hover{background:#4a0000}
        
        /* RESPONSIVE */
        @media(min-width:480px){.productos-grid-enhanced{grid-template-columns:repeat(2,1fr);gap:16px}.card-image{height:180px}.hero-title{font-size:2.2rem}.countdown-item{min-width:60px;padding:8px 12px}.countdown-number{font-size:1.4rem}}
        @media(min-width:768px){.container{padding:0 24px}.logo img{width:200px}.hero-outlet{min-height:60vh;padding:100px 0 60px;text-align:left}.hero-content{max-width:600px;text-align:left}.hero-title{font-size:3rem}.hero-description{font-size:1rem}.countdown-container{display:inline-block;width:auto}.btn-primary-custom{width:auto;padding:16px 36px}.hero-beneficios{justify-content:flex-start}.search-filters-section{padding:20px 24px;margin:-30px 0 30px}.search-box-enhanced{flex-direction:row;align-items:center}.search-input-wrapper input{min-height:56px;font-size:1rem}.btn-escaneo-qr{width:auto;padding:14px 24px;min-height:56px}.filters-desktop-container{display:block}.filtros-fab{display:none!important}.filtros-chips{display:none}.productos-grid-enhanced{grid-template-columns:repeat(3,1fr);gap:20px}.card-image{height:200px}.card-info h3{font-size:0.9rem}.btn-detalle-enhanced{font-size:0.8rem;min-height:48px}.barra-cotizacion{min-height:auto;padding:12px 24px}.btn-expandir{display:none}.barra-cotizacion.expanded .btn-expandir{display:flex}.modal-cotizacion-contenido{border-radius:24px;width:95%;height:auto;max-height:90vh;max-width:750px}.modal-cotizacion-header{padding:16px 24px}.modal-cotizacion-body{padding:24px}.stepper-circle{width:36px;height:36px;font-size:0.9rem}.stepper-label{font-size:0.65rem}.footer-grid{grid-template-columns:repeat(3,1fr);text-align:left}.footer-social a,.footer-links a{justify-content:flex-start}.btn-paso-enviar{flex:1}.paso-acciones{flex-wrap:nowrap}.telefono-wrapper{flex-wrap:nowrap}}
        @media(min-width:1024px){.hero-title{font-size:3.5rem}.hero-outlet{min-height:70vh}.productos-grid-enhanced{grid-template-columns:repeat(4,1fr);gap:24px}.card-image{height:220px}}
        @media(max-width:480px){.btn-cotizar-bottom{font-size:0.75rem;padding:10px 12px;min-height:44px}.whatsapp-float{width:56px;height:56px;font-size:1.5rem}.help-bar{padding:10px 12px}.help-bar-btn{font-size:0.8rem;padding:10px 14px}.modal-sin-resultados-contenido{padding:24px 20px;margin:16px}.opcion-contacto{padding:12px 14px}.sugerencias-grid{grid-template-columns:1fr}.modal-contacto-rapido-contenido{padding:24px 20px;margin:16px}.modal-contacto-rapido-footer{flex-direction:column}.modal-contacto-rapido-footer button{width:100%}}
        
        /* UTILIDADES */
        .hidden{display:none!important}.text-center{text-align:center}.text-sm{font-size:0.8rem}.text-xs{font-size:0.65rem}.text-gray-400{color:var(--gray-400)}.text-gray-500{color:var(--gray-500)}.text-gray-600{color:var(--gray-600)}.text-red-500{color:var(--red-500)}.mt-1{margin-top:4px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mb-1{margin-bottom:4px}.mb-2{margin-bottom:8px}.mb-3{margin-bottom:12px}.gap-1{gap:4px}.gap-2{gap:8px}.gap-3{gap:12px}.flex{display:flex}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-between{justify-content:space-between}.flex-wrap{flex-wrap:wrap}.w-full{width:100%}.animate-pulse{animation:pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite}
        
        /* SCROLLBAR */
        .productos-lista::-webkit-scrollbar,.barra-productos-preview::-webkit-scrollbar,.modal-cotizacion-body::-webkit-scrollbar{width:4px}
        .productos-lista::-webkit-scrollbar-track,.barra-productos-preview::-webkit-scrollbar-track,.modal-cotizacion-body::-webkit-scrollbar-track{background:var(--gray-100);border-radius:10px}
        .productos-lista::-webkit-scrollbar-thumb,.barra-productos-preview::-webkit-scrollbar-thumb,.modal-cotizacion-body::-webkit-scrollbar-thumb{background:var(--primary);border-radius:10px}
    </style>
</head>
<body>
    <!-- HEADER -->
    <header>
        <div class="navbar">
            <div class="logo">
                <a href="https://gallosmarmol.github.io/?seccion=outlet" title="Ir a Outlet">
                    <img src="FOTO/foto_01.webp" alt="Gallos Mármol">
                </a>
            </div>
            <div class="header-cotizacion-badge" id="headerCotizacionBadge" style="display:none;" onclick="window.abrirModalCotizacion()">
                <i class="fas fa-shopping-cart"></i>
                <span id="headerContador">0</span> productos
            </div>
        </div>
    </header>
    
    <!-- FILTROS MODAL -->
    <div class="filtros-modal-overlay" id="filtrosModalOverlay" onclick="window.closeFiltrosModal()"></div>
    <div class="filtros-modal" id="filtrosModal">
        <div class="filtros-modal-header">
            <h3><i class="fas fa-filter"></i> Filtros</h3>
            <button class="close-modal-btn" onclick="window.closeFiltrosModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="filtros-modal-body">
            <div class="filtro-group"><label>Familia</label><select id="filtroFamiliaModal"><option value="">Todas</option>${familiasOptions}</select></div>
            <div class="filtro-group"><label>Acabado</label><select id="filtroAcabadoModal"><option value="">Todos</option>${acabadosOptions}</select></div>
            <div class="filtro-group"><label>Material</label><select id="filtroMaterialModal"><option value="">Todos</option>${materialesOptions}</select></div>
        </div>
        <div class="filtros-modal-footer">
            <button class="btn-filter" onclick="window.aplicarFiltrosDesdeModal()">Aplicar</button>
            <button class="btn-clear" onclick="window.limpiarFiltrosDesdeModal()">Limpiar</button>
        </div>
    </div>
    
    <!-- BOTONES FLOTANTES -->
    <button class="filtros-fab" id="filtrosFab" onclick="window.openFiltrosModal()">
        <i class="fas fa-sliders-h"></i>
        <span class="badge-filtros" id="filtrosBadgeMobile" style="display:none;">0</span>
    </button>
    <button class="scroll-top-btn" id="scrollTopBtn" onclick="window.scrollToTop()"><i class="fas fa-arrow-up"></i></button>
    <div class="whatsapp-float-wrapper" id="whatsappFloatWrapper">
        <span class="whatsapp-label">Chatea con un asesor</span>
        <button class="whatsapp-float" id="whatsappFloatBtn" onclick="window.abrirWhatsAppAsesor()">
            <i class="fab fa-whatsapp"></i>
        </button>
    </div>
    
    <!-- BARRA DE AYUDA -->
    <div class="help-bar" id="helpBar">
        <button class="help-bar-btn" onclick="window.abrirWhatsAppAsesor()">
            <i class="fas fa-headset"></i>
            <span>¿Necesitas ayuda? <strong>Chatea con un asesor</strong></span>
            <i class="fas fa-chevron-right"></i>
        </button>
    </div>
    
    <!-- BANNER PRODUCTOS PRÓXIMAMENTE -->
    <div class="banner-proximamente" id="bannerProximamente">
        <div class="banner-proximamente-contenido">
            <div class="banner-icono"><i class="fas fa-clock"></i></div>
            <div class="banner-texto">
                <strong>¡Más productos en camino!</strong>
                <span>Estamos actualizando el Outlet. <a href="#" onclick="window.abrirWhatsAppAsesor(); return false;">Suscríbete</a> para recibir notificaciones.</span>
            </div>
            <button class="banner-cerrar" onclick="this.parentElement.parentElement.classList.remove('show')"><i class="fas fa-times"></i></button>
        </div>
    </div>
    
    <!-- MODALES -->
    <div id="modalPersonalizado" class="modal-overlay" style="display:none;">
        <div class="modal-custom">
            <div class="modal-custom-header" id="modalHeader"><i id="modalIcon" class="fas fa-info-circle"></i><h3 id="modalTitle">Título</h3></div>
            <div class="modal-custom-body" id="modalBody">Mensaje</div>
            <div class="modal-custom-footer" id="modalFooter"><button id="modalBtnConfirm" class="btn-modal-primary">Aceptar</button></div>
        </div>
    </div>
    
    <div id="modalCotizacion" class="modal-cotizacion">
        <div class="modal-cotizacion-contenido">
            <div class="modal-cotizacion-header">
                <h3>Nueva Cotización</h3>
                <button class="modal-cotizacion-close" onclick="window.cerrarModalCotizacion()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-cotizacion-body" id="modalCotizacionBody"></div>
            <div class="modal-cotizacion-footer" id="modalCotizacionFooter" style="display:none;"></div>
        </div>
    </div>
    
    <div id="modalQR" class="modal-qr" style="display:none;">
        <div class="modal-qr-contenido">
            <div class="modal-qr-header">
                <h3><i class="fas fa-qrcode"></i> Escanear Código QR</h3>
                <button id="btnCerrarQR" class="modal-qr-close" type="button"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-qr-body">
                <div id="qr-reader" style="width:100%;max-width:400px;margin:0 auto;"></div>
                <div class="qr-instrucciones"><i class="fas fa-info-circle"></i><span>Apunte la cámara al código QR del producto</span></div>
                <button id="btnCancelarQR" class="btn-cancelar-qr" type="button"><i class="fas fa-times"></i> Cancelar</button>
            </div>
        </div>
    </div>
    
    <!-- HERO -->
    <section class="hero-outlet">
        <div class="container">
            <div class="hero-content">
                <div class="badge-urgencia">Oferta por tiempo limitado</div>
                <h1 class="hero-title">Outlet</h1>
                <p class="hero-description">Aprovecha nuestra selección exclusiva de productos con precios especiales.</p>
                <div class="countdown-container">
                    <div class="countdown-title" id="countdownTitle">OFERTA POR TIEMPO LIMITADO</div>
                    <div class="countdown">
                        <div class="countdown-item"><div class="countdown-number" id="countdown-days">00</div><div class="countdown-label">Días</div></div>
                        <div class="countdown-item"><div class="countdown-number" id="countdown-hours">00</div><div class="countdown-label">Horas</div></div>
                        <div class="countdown-item"><div class="countdown-number" id="countdown-minutes">00</div><div class="countdown-label">Minutos</div></div>
                        <div class="countdown-item"><div class="countdown-number" id="countdown-seconds">00</div><div class="countdown-label">Segundos</div></div>
                    </div>
                </div>
                <a href="#productos" class="btn-primary-custom"><i class="fas fa-shopping-bag"></i> Ver Productos</a>
                <div class="hero-beneficios">
                    <span class="hero-beneficio"><i class="fas fa-check-circle"></i> Stock limitado</span>
                    <span class="hero-beneficio"><i class="fas fa-tags"></i> Mejor precio</span>
                </div>
            </div>
        </div>
    </section>
    
    <!-- SEARCH Y FILTROS -->
    <div class="container">
        <div class="search-filters-section">
            <div class="search-wrapper">
                <div class="search-box-enhanced">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchOutlet" placeholder="Buscar producto..." autocomplete="off" inputmode="search">
                        <button id="btnLimpiarBusqueda" class="btn-clear-search" type="button" style="display:none;"><i class="fas fa-times-circle"></i></button>
                    </div>
                    <button id="btnLimpiarBusquedaExterno" class="btn-clear-externo" type="button" style="display:none;"><i class="fas fa-eraser"></i><span class="btn-text">Limpiar</span></button>
                    <button id="btnEscanearQR" class="btn-escaneo-qr"><i class="fas fa-qrcode"></i><span>Escanear QR</span></button>
                </div>
                <div class="search-hint"><i class="fas fa-info-circle"></i><span>Busca por nombre, código o escanea QR</span></div>
            </div>
            <div id="filtrosActivosChips" class="filtros-chips" style="display:none;"></div>
            <div class="filters-desktop-container">
                <div class="filtros-grid-enhanced">
                    <div class="filtro-group"><label>Familia</label><select id="filtroFamilia"><option value="">Todas</option>${familiasOptions}</select></div>
                    <div class="filtro-group"><label>Acabado</label><select id="filtroAcabado"><option value="">Todos</option>${acabadosOptions}</select></div>
                    <div class="filtro-group"><label>Material</label><select id="filtroMaterial"><option value="">Todos</option>${materialesOptions}</select></div>
                    <div class="filtros-actions">
                        <button onclick="window.aplicarFiltrosOutlet()" class="btn-filter">Aplicar</button>
                        <button onclick="window.limpiarFiltrosOutlet()" class="btn-clear">Limpiar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- PRODUCTOS -->
    <section id="productos" class="container">
        <div class="results-header">
            <div class="contador-enhanced"><i class="fas fa-box-open"></i><span id="contadorProductos">${productosDataParaHTML.length}</span> producto(s)</div>
        </div>
        <div id="productosGrid" class="productos-grid-enhanced">${window.generarCardsOutlet(productosDataParaHTML)}</div>
        <div id="sugerenciasContainer"></div>
    </section>
    
    <!-- FOOTER -->
    <footer>
        <div class="footer-grid">
            <div class="footer-logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"><p>Desde 1870, transformamos espacios con mármol de alta calidad.</p></div>
            <div class="footer-social"><h4>Redes Sociales</h4><a href="https://www.facebook.com/gallosmarmol/"><i class="fab fa-facebook-f"></i> Facebook</a><a href="https://www.instagram.com/gallosmarmol/"><i class="fab fa-instagram"></i> Instagram</a><a href="https://www.tiktok.com/@gallos.marmol.ofic"><i class="fab fa-tiktok"></i> TikTok</a></div>
            <div class="footer-links"><h4>Contacto</h4><a href="https://gallosmarmol.com.pe"><i class="fas fa-globe"></i> gallosmarmol.com.pe</a><a href="mailto:info@gallosmarmol.com.pe"><i class="fas fa-envelope"></i> info@gallosmarmol.com.pe</a></div>
        </div>
        <div class="footer-bottom">© 2026 Gallos Mármol — Todos los derechos reservados.</div>
    </footer>
    
    <script>
        // ============================================
        // INICIALIZACIÓN
        // ============================================
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Inicializando página Outlet...');
            
            if (typeof window.cargarSeleccionCotizacion === 'function') {
                window.cargarSeleccionCotizacion();
            }
            
            if (typeof window.configurarBusquedaOutlet === 'function') {
                window.configurarBusquedaOutlet();
            }
            
            if (typeof window.configurarEventosQR === 'function') {
                window.configurarEventosQR();
            }
            
            const familiaSelect = document.getElementById('filtroFamilia');
            const acabadoSelect = document.getElementById('filtroAcabado');
            const materialSelect = document.getElementById('filtroMaterial');
            
            const aplicarFiltros = () => {
                if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                    setTimeout(() => {
                        if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                            window.actualizarTodosLosBotonesCotizar();
                        }
                    }, 50);
                }
            };
            
            if (familiaSelect) familiaSelect.addEventListener('change', aplicarFiltros);
            if (acabadoSelect) acabadoSelect.addEventListener('change', aplicarFiltros);
            if (materialSelect) materialSelect.addEventListener('change', aplicarFiltros);
            
            if (typeof window.inicializarLazyLoading === 'function') {
                window.inicializarLazyLoading();
            }
            
            if (typeof window.initCountdown === 'function') {
                window.initCountdown();
            }
            
            const scrollBtn = document.getElementById('scrollTopBtn');
            if (scrollBtn) {
                window.addEventListener('scroll', function() {
                    if (window.scrollY > 300) {
                        scrollBtn.classList.add('show');
                    } else {
                        scrollBtn.classList.remove('show');
                    }
                });
            }
            
            setTimeout(() => {
                if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                    window.actualizarTodosLosBotonesCotizar();
                }
                if (window.cotizacionSeleccionados && window.cotizacionSeleccionados.length > 0) {
                    if (typeof window.actualizarBarraFlotante === 'function') {
                        window.actualizarBarraFlotante();
                    }
                    if (typeof window.actualizarBadgeHeader === 'function') {
                        window.actualizarBadgeHeader();
                    }
                }
            }, 150);
            
            // Inicializar sistema de ayuda
            if (typeof inicializarAyudaOutlet === 'function') {
                inicializarAyudaOutlet();
            }
            
            if (typeof window.precargarAsesoresOutlet === 'function') {
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => { window.precargarAsesoresOutlet(); });
                } else {
                    setTimeout(() => window.precargarAsesoresOutlet(), 2000);
                }
            }
            
            console.log('✅ Outlet inicializado correctamente');
        });
    </script>
</body>
</html>`;

    // ============================================
    // RENDERIZAR HTML
    // ============================================
    document.documentElement.innerHTML = html;
    
    // ============================================
    // POST-RENDERIZADO
    // ============================================
    setTimeout(() => {
        console.log('🔄 Ejecutando configuración post-renderizado...');
        
        window.cargarSeleccionCotizacion();
        
        if (typeof window.configurarEventosQR === 'function') {
            window.configurarEventosQR();
        }
        
        if (typeof window.configurarBusquedaOutlet === 'function') {
            window.configurarBusquedaOutlet();
        }
        
        const btnEscanear = document.getElementById('btnEscanearQR');
        if (btnEscanear) {
            const nuevoBtn = btnEscanear.cloneNode(true);
            btnEscanear.parentNode.replaceChild(nuevoBtn, btnEscanear);
            nuevoBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.iniciarEscaneoQR === 'function') {
                    window.iniciarEscaneoQR();
                }
            });
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modalQR = document.getElementById('modalQR');
                if (modalQR && modalQR.style.display === 'flex') {
                    if (typeof window.cerrarModalQR === 'function') {
                        window.cerrarModalQR();
                    }
                }
                const modalCotizacion = document.getElementById('modalCotizacion');
                if (modalCotizacion && modalCotizacion.classList.contains('active')) {
                    if (typeof window.cerrarModalCotizacion === 'function') {
                        window.cerrarModalCotizacion();
                    }
                }
            }
        });
        
        if (window.cotizacionSeleccionados && window.cotizacionSeleccionados.length > 0) {
            if (typeof window.actualizarBarraFlotante === 'function') {
                window.actualizarBarraFlotante();
            }
            if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                window.actualizarTodosLosBotonesCotizar();
            }
            if (typeof window.actualizarBadgeHeader === 'function') {
                window.actualizarBadgeHeader();
            }
        }
        
        if (typeof window.inicializarLazyLoading === 'function') {
            window.inicializarLazyLoading();
        }
        
        if (typeof window.initCountdown === 'function') {
            window.initCountdown();
        }
        
        const scrollBtn = document.getElementById('scrollTopBtn');
        if (scrollBtn) {
            window.addEventListener('scroll', function() {
                if (window.scrollY > 300) {
                    scrollBtn.classList.add('show');
                } else {
                    scrollBtn.classList.remove('show');
                }
            });
        }
        
        const familiaSelect = document.getElementById('filtroFamilia');
        const acabadoSelect = document.getElementById('filtroAcabado');
        const materialSelect = document.getElementById('filtroMaterial');
        
        const aplicarFiltros = () => {
            if (typeof window.aplicarFiltrosOutlet === 'function') {
                window.aplicarFiltrosOutlet();
                setTimeout(() => {
                    if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                        window.actualizarTodosLosBotonesCotizar();
                    }
                }, 50);
            }
        };
        
        if (familiaSelect) familiaSelect.addEventListener('change', aplicarFiltros);
        if (acabadoSelect) acabadoSelect.addEventListener('change', aplicarFiltros);
        if (materialSelect) materialSelect.addEventListener('change', aplicarFiltros);
        
        const filtrosFab = document.getElementById('filtrosFab');
        if (filtrosFab) {
            filtrosFab.addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof window.openFiltrosModal === 'function') {
                    window.openFiltrosModal();
                }
            });
        }
        
        if (typeof inicializarAyudaOutlet === 'function') {
            inicializarAyudaOutlet();
        }
        
        if (typeof window.precargarAsesoresOutlet === 'function') {
            if (window.requestIdleCallback) {
                requestIdleCallback(() => { window.precargarAsesoresOutlet(); });
            } else {
                setTimeout(() => window.precargarAsesoresOutlet(), 2000);
            }
        }
        
        console.log('✅ Post-renderizado completado');
    }, 200);
}

// ==================== RENDERIZAR SALDOS DE EXPORTACIÓN ====================
function renderizarPaginaSaldosExportacion(productos) {
    console.log('🎨 Renderizando página de Saldos de Exportación');
    
    window.saldosProductosCache = productos || [];
    
    function optimizarImg(url) {
        if (!url) return 'FOTO/foto_01.webp';
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return `https://lh3.googleusercontent.com/d/${match[1]}=w400-h400`;
        return url;
    }
    
    const familiasUnicas = new Map();
    const acabadosUnicos = new Map();
    const materialesUnicos = new Map();
    
    window.saldosProductosCache.forEach(p => {
        if (p.familia?.nombre) familiasUnicas.set(p.familia_id, p.familia.nombre);
        else if (p.familia_nombre) familiasUnicas.set(p.familia_nombre, p.familia_nombre);
        if (p.acabado?.nombre) acabadosUnicos.set(p.acabado_id, p.acabado.nombre);
        else if (p.acabado_nombre) acabadosUnicos.set(p.acabado_nombre, p.acabado_nombre);
        if (p.material?.nombre) materialesUnicos.set(p.material_id, p.material.nombre);
        else if (p.material_nombre) materialesUnicos.set(p.material_nombre, p.material_nombre);
    });
    
    const familiasOptions = Array.from(familiasUnicas.entries()).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
    const acabadosOptions = Array.from(acabadosUnicos.entries()).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
    const materialesOptions = Array.from(materialesUnicos.entries()).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
    
    window.generarCardsSaldos = function(productosLista) {
        if (!productosLista || productosLista.length === 0) {
            return '<div class="no-results"><i class="fas fa-box-open"></i><p>No hay productos que coincidan con los filtros</p><button onclick="limpiarFiltrosSaldos()" class="btn-primary" style="margin-top: 16px;">Limpiar filtros</button></div>';
        }
        return productosLista.map(p => {
            const estaSeleccionado = cotizacionSeleccionados.some(item => item.id === p.id);
            return `
                <div class="producto-card">
                    <div class="card-image"><img src="${optimizarGoogleDriveUrl(p.imagen_principal || 'FOTO/foto_01.webp')}" alt="${escapeHtml(p.nombre)}" onerror="this.src='FOTO/foto_01.webp'"><div class="badge-saldos">📦 Exportación</div></div>
                    <div class="card-info"><h3>${escapeHtml(p.nombre) || 'Producto'}</h3><p class="codigo">${escapeHtml(p.codigo) || 'Sin código'}</p><div class="specs-badges">${p.medida ? `<span class="spec-badge"><i class="fas fa-ruler-combined"></i> ${p.medida}</span>` : ''}${p.espesor ? `<span class="spec-badge"><i class="fas fa-arrows-alt-h"></i> ${p.espesor}</span>` : ''}</div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;"><a href="/?producto=${p.slug}" class="btn-detalle-enhanced" style="flex:1;"><span>Ver Detalle</span><i class="fas fa-arrow-right"></i></a>
                    <button onclick="toggleSeleccionCotizacion({id:'${p.id}', nombre:'${escapeHtml(p.nombre)}', codigo:'${p.codigo || ''}', imagen_principal:'${p.imagen_principal || ''}', slug:'${p.slug}'})" class="btn-cotizar" data-id="${p.id}" style="background: ${estaSeleccionado ? '#10b981' : 'var(--primary)'}; color: white; border: none; padding: 8px 12px; border-radius: 40px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px;"><i class="fas ${estaSeleccionado ? 'fa-check-circle' : 'fa-plus-circle'}"></i>${estaSeleccionado ? 'Agregado' : 'Cotizar'}</button></div></div>
                </div>
            `;
        }).join('');
    };
    
    window.aplicarFiltrosSaldos = function() {
        const busqueda = document.getElementById('searchSaldos')?.value.toLowerCase().trim() || '';
        const familiaId = document.getElementById('filtroFamiliaSaldos')?.value;
        const acabadoId = document.getElementById('filtroAcabadoSaldos')?.value;
        const materialId = document.getElementById('filtroMaterialSaldos')?.value;
        let productosData = window.saldosProductosCache.map(p => ({ ...p, imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || 'FOTO/foto_01.webp'), slug: p.slug || p.id }));
        let filtrados = [...productosData];
        if (familiaId && familiaId !== '') filtrados = filtrados.filter(p => p.familia_id === familiaId);
        if (acabadoId && acabadoId !== '') filtrados = filtrados.filter(p => p.acabado_id === acabadoId);
        if (materialId && materialId !== '') filtrados = filtrados.filter(p => p.material_id === materialId);
        if (busqueda) filtrados = filtrados.filter(p => (p.nombre || '').toLowerCase().includes(busqueda) || (p.codigo || '').toLowerCase().includes(busqueda) || (p.slug || '').toLowerCase().includes(busqueda));
        const grid = document.getElementById('productosGridSaldos'); const contador = document.getElementById('contadorProductosSaldos');
        if (grid) grid.innerHTML = window.generarCardsSaldos(filtrados);
        if (contador) contador.textContent = filtrados.length;
        let activos = 0;
        if (familiaId && familiaId !== '') activos++;
        if (acabadoId && acabadoId !== '') activos++;
        if (materialId && materialId !== '') activos++;
        if (busqueda) activos++;
        const badge = document.getElementById('filtrosBadgeSaldos');
        if (badge) { if (activos > 0) { badge.textContent = activos; badge.style.display = 'inline-block'; } else { badge.style.display = 'none'; } }
        if (window.innerWidth <= 768) { const modal = document.getElementById('filtrosModalSaldos'); if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; } }
    };
    
    window.limpiarFiltrosSaldos = function() {
        const searchInput = document.getElementById('searchSaldos'), familiaSelect = document.getElementById('filtroFamiliaSaldos'), acabadoSelect = document.getElementById('filtroAcabadoSaldos'), materialSelect = document.getElementById('filtroMaterialSaldos');
        if (searchInput) searchInput.value = '';
        if (familiaSelect) familiaSelect.value = '';
        if (acabadoSelect) acabadoSelect.value = '';
        if (materialSelect) materialSelect.value = '';
        const productosData = window.saldosProductosCache.map(p => ({ ...p, imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || 'FOTO/foto_01.webp'), slug: p.slug || p.id }));
        const grid = document.getElementById('productosGridSaldos'); const contador = document.getElementById('contadorProductosSaldos');
        if (grid) grid.innerHTML = window.generarCardsSaldos(productosData);
        if (contador) contador.textContent = productosData.length;
        const badge = document.getElementById('filtrosBadgeSaldos');
        if (badge) badge.style.display = 'none';
        if (window.innerWidth <= 768) { const modal = document.getElementById('filtrosModalSaldos'); if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; } }
    };
    
    window.openFiltrosModalSaldos = function() { const modal = document.getElementById('filtrosModalSaldos'); if (modal) { modal.classList.add('show'); document.body.style.overflow = 'hidden'; } };
    window.closeFiltrosModalSaldos = function() { const modal = document.getElementById('filtrosModalSaldos'); if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; } };
    window.scrollToTopSaldos = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    
    function initCountdown() {
        const fechaInicio = new Date(2026, 4, 1), fechaFin = new Date(2026, 4, 29), hoy = new Date();
        hoy.setHours(0,0,0,0); fechaInicio.setHours(0,0,0,0); fechaFin.setHours(0,0,0,0);
        let targetDate, mensaje = "";
        if (hoy < fechaInicio) { targetDate = fechaInicio; mensaje = "OFERTA PRÓXIMAMENTE"; }
        else if (hoy >= fechaInicio && hoy <= fechaFin) { targetDate = fechaFin; mensaje = "OFERTA POR TIEMPO LIMITADO"; }
        else { targetDate = null; mensaje = "OFERTA FINALIZADA"; }
        const titleEl = document.getElementById('countdownTitleSaldos');
        if (titleEl) titleEl.textContent = mensaje;
        if (!targetDate) {
            document.getElementById('countdown-days-saldos').textContent = '00';
            document.getElementById('countdown-hours-saldos').textContent = '00';
            document.getElementById('countdown-minutes-saldos').textContent = '00';
            document.getElementById('countdown-seconds-saldos').textContent = '00';
            return;
        }
        function update() {
            const now = new Date(), diff = targetDate - now;
            if (diff <= 0) {
                document.getElementById('countdown-days-saldos').textContent = '00';
                document.getElementById('countdown-hours-saldos').textContent = '00';
                document.getElementById('countdown-minutes-saldos').textContent = '00';
                document.getElementById('countdown-seconds-saldos').textContent = '00';
                return;
            }
            const days = Math.floor(diff / 86400000), hours = Math.floor((diff % 86400000) / 3600000), minutes = Math.floor((diff % 3600000) / 60000), seconds = Math.floor((diff % 60000) / 1000);
            document.getElementById('countdown-days-saldos').textContent = days.toString().padStart(2,'0');
            document.getElementById('countdown-hours-saldos').textContent = hours.toString().padStart(2,'0');
            document.getElementById('countdown-minutes-saldos').textContent = minutes.toString().padStart(2,'0');
            document.getElementById('countdown-seconds-saldos').textContent = seconds.toString().padStart(2,'0');
        }
        update(); setInterval(update, 1000);
    }
    
    const productosDataParaHTML = window.saldosProductosCache.map(p => ({ ...p, imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || 'FOTO/foto_01.webp'), slug: p.slug || p.id }));
    const heroBackgroundImage = '../FOTO/foto_03.webp';
    
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Saldos de Exportación | Gallos Mármol</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"><style>
        *{margin:0;padding:0;box-sizing:border-box}:root{--primary:var(--primary);--primary-dark:#2a0607;--secondary:#d4d4ae;--white:#fff;--gray-50:#fafafa;--gray-100:#f5f5f5;--gray-200:#eee;--gray-600:#666;--gray-800:#222;--blue-600:#2563eb;--blue-700:#1d4ed8}
        body{font-family:'Poppins',sans-serif;background:var(--gray-50);color:var(--gray-800)}.container{max-width:1280px;margin:0 auto;padding:0 24px}
        header{position:fixed;top:0;left:0;right:0;background:var(--primary);z-index:1000;padding:12px 0;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.navbar{display:flex;justify-content:space-between;align-items:center}.logo img{width:130px;height:auto}
        .hero-saldos{min-height:85vh;display:flex;align-items:center;background:linear-gradient(135deg,rgba(0,0,0,0.75),rgba(0,0,0,0.5)),url('${heroBackgroundImage}');background-size:cover;background-position:center;padding:120px 0 80px}
        .hero-title{font-size:3.5rem;font-weight:800;color:white;margin-bottom:16px}.hero-description{font-size:1.1rem;color:rgba(255,255,255,0.9);margin-bottom:32px}
        .countdown-container{background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:20px;padding:20px 30px;margin-bottom:32px;display:inline-block}.countdown{display:flex;gap:20px;justify-content:center}.countdown-item{text-align:center;background:rgba(0,0,0,0.6);border-radius:16px;padding:12px 16px;min-width:80px}.countdown-number{font-size:2.2rem;font-weight:800;color:white;font-family:monospace}.countdown-label{font-size:0.7rem;color:rgba(255,255,255,0.7)}
        .search-filters-section{background:white;border-radius:24px;margin:-40px auto 40px;padding:20px 24px}.search-box-enhanced{position:relative}.search-box-enhanced i{position:absolute;left:20px;top:50%;transform:translateY(-50%)}.search-box-enhanced input{width:100%;padding:16px 20px 16px 55px;border:2px solid var(--gray-200);border-radius:60px;font-size:1rem}
        .filtros-grid-enhanced{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}.filtro-group{flex:1;min-width:150px}.filtro-group select{width:100%;padding:14px 16px;border:1px solid var(--gray-200);border-radius:16px;background:var(--gray-50)}.btn-filter,.btn-clear{padding:12px 28px;border-radius:40px;font-weight:600;cursor:pointer;border:none}.btn-filter{background:var(--primary);color:white}.btn-clear{background:var(--gray-100);color:var(--gray-700)}
        .productos-grid-enhanced{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:20px}.producto-card{background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid var(--gray-200)}.card-image{position:relative;height:180px;overflow:hidden}.card-image img{width:100%;height:100%;object-fit:cover}.badge-saldos{position:absolute;top:10px;left:10px;background:linear-gradient(135deg,var(--blue-600),var(--blue-700));color:white;padding:4px 10px;border-radius:20px;font-size:0.65rem}.card-info{padding:12px}.card-info h3{font-size:0.9rem;font-weight:700;color:var(--primary)}.codigo{font-size:0.6rem;color:var(--gray-500)}.btn-detalle-enhanced{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--primary);color:white;padding:10px 12px;border-radius:40px;text-decoration:none;font-size:0.75rem;flex:1}.btn-cotizar{background:var(--primary);color:white;border:none;padding:8px 12px;border-radius:40px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px}
        footer{background:var(--primary-dark);color:white;padding:40px 20px 25px;margin-top:50px}.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:30px;max-width:1200px;margin:0 auto}.footer-logo img{width:150px}.footer-bottom{text-align:center;margin-top:35px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.65rem}
        @media (min-width:769px){.productos-grid-enhanced{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}.card-image{height:240px}}
        @media (max-width:768px){.hero-title{font-size:2rem}.productos-grid-enhanced{gap:12px}.card-image{height:140px}.card-info h3{font-size:0.75rem}}
        .hidden{display:none}
    </style></head>
    <body><header><div class="container navbar"><div class="logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"></div></div></header>
    <div class="filtros-modal-overlay" id="filtrosModalOverlaySaldos" onclick="closeFiltrosModalSaldos()"></div>
    <div class="filtros-modal" id="filtrosModalSaldos"><div class="filtros-modal-header"><h3><i class="fas fa-filter"></i> Filtros</h3><button class="close-modal-btn" onclick="closeFiltrosModalSaldos()"><i class="fas fa-times"></i></button></div><div class="filtros-modal-body"><div class="filtro-group"><label>Familia</label><select id="filtroFamiliaSaldosModal"><option value="">Todas</option>${familiasOptions}</select></div><div class="filtro-group"><label>Acabado</label><select id="filtroAcabadoSaldosModal"><option value="">Todos</option>${acabadosOptions}</select></div><div class="filtro-group"><label>Material</label><select id="filtroMaterialSaldosModal"><option value="">Todos</option>${materialesOptions}</select></div></div><div class="filtros-modal-footer"><button class="btn-filter" onclick="aplicarFiltrosDesdeModalSaldos()">Aplicar</button><button class="btn-clear" onclick="limpiarFiltrosDesdeModalSaldos()">Limpiar</button></div></div>
    <button class="filtros-fab" onclick="openFiltrosModalSaldos()"><i class="fas fa-filter"></i></button>
    <button class="scroll-top-btn" id="scrollTopBtnSaldos" onclick="scrollToTopSaldos()"><i class="fas fa-arrow-up"></i></button>
    <section class="hero-saldos"><div class="container"><div class="hero-content"><h1 class="hero-title">Saldos de Exportación</h1><p class="hero-description">Aprovecha nuestros saldos de exportación: materiales de calidad, disponibilidad inmediata y condiciones especiales por tiempo limitado.</p><div class="countdown-container"><div class="countdown-title" id="countdownTitleSaldos">OFERTA POR TIEMPO LIMITADO</div><div class="countdown"><div class="countdown-item"><div class="countdown-number" id="countdown-days-saldos">00</div><div class="countdown-label">Días</div></div><div class="countdown-item"><div class="countdown-number" id="countdown-hours-saldos">00</div><div class="countdown-label">Horas</div></div><div class="countdown-item"><div class="countdown-number" id="countdown-minutes-saldos">00</div><div class="countdown-label">Minutos</div></div><div class="countdown-item"><div class="countdown-number" id="countdown-seconds-saldos">00</div><div class="countdown-label">Segundos</div></div></div></div><div class="hero-buttons"><a href="#productos" class="btn-primary-custom"><i class="fas fa-ship"></i> Ver Productos</a></div></div></div></section>
    <div class="container"><div class="search-filters-section"><div class="search-wrapper"><div class="search-box-enhanced"><i class="fas fa-search"></i><input type="text" id="searchSaldos" placeholder="Buscar producto por nombre o código..." autocomplete="off"></div><div class="search-hint"><i class="fas fa-info-circle"></i> La búsqueda se aplica automáticamente mientras escribes</div></div><div class="filters-desktop-container"><div class="filtros-grid-enhanced"><div class="filtro-group"><label>Familia</label><select id="filtroFamiliaSaldos"><option value="">Todas</option>${familiasOptions}</select></div><div class="filtro-group"><label>Acabado</label><select id="filtroAcabadoSaldos"><option value="">Todos</option>${acabadosOptions}</select></div><div class="filtro-group"><label>Material</label><select id="filtroMaterialSaldos"><option value="">Todos</option>${materialesOptions}</select></div><div class="filtros-actions"><button onclick="aplicarFiltrosSaldos()" class="btn-filter">Aplicar</button><button onclick="limpiarFiltrosSaldos()" class="btn-clear">Limpiar</button></div></div></div></div></div>
    <section id="productos" class="container"><div class="results-header"><div class="contador-enhanced"><i class="fas fa-box-open"></i> <span id="contadorProductosSaldos">${productosDataParaHTML.length}</span> producto(s) disponible(s)</div></div><div id="productosGridSaldos" class="productos-grid-enhanced">${window.generarCardsSaldos(productosDataParaHTML)}</div></section>
    <footer>
        <div class="footer-grid">
            <div class="footer-logo">
                <img src="FOTO/foto_01.webp" alt="Gallos Mármol">
                <p>Desde 1870, transformamos espacios con mármol de alta calidad, combinando belleza, exclusividad y excelencia en cada proyecto.</p>
            </div>
            <div class="footer-social">
                <h4>Redes Sociales</h4>
                <a href="https://www.facebook.com/gallosmarmol/"><i class="fab fa-facebook-f"></i> Facebook</a>
                <a href="https://www.instagram.com/gallosmarmol/"><i class="fab fa-instagram"></i> Instagram</a>
                <a href="https://www.tiktok.com/@gallos.marmol.ofic"><i class="fab fa-tiktok"></i> TikTok</a>
            </div>
            <div class="footer-links">
                <h4>Contacto</h4>
                <a href="https://gallosmarmol.com.pe"><i class="fas fa-globe"></i> gallosmarmol.com.pe</a>
                <a href="mailto:info@gallosmarmol.com.pe"><i class="fas fa-envelope"></i> info@gallosmarmol.com.pe</a>
            </div>
        </div>
        <div class="footer-bottom">
            © 2026 Gallos Mármol — Todos los derechos reservados.
        </div>
    </footer>
    <script>
        function syncModalSelectsSaldos(){const fd=document.getElementById('filtroFamiliaSaldos'),ad=document.getElementById('filtroAcabadoSaldos'),md=document.getElementById('filtroMaterialSaldos'),fm=document.getElementById('filtroFamiliaSaldosModal'),am=document.getElementById('filtroAcabadoSaldosModal'),mm=document.getElementById('filtroMaterialSaldosModal');if(fd&&fm)fm.value=fd.value;if(ad&&am)am.value=ad.value;if(md&&mm)mm.value=md.value;}
        function aplicarFiltrosDesdeModalSaldos(){const fm=document.getElementById('filtroFamiliaSaldosModal'),am=document.getElementById('filtroAcabadoSaldosModal'),mm=document.getElementById('filtroMaterialSaldosModal'),fd=document.getElementById('filtroFamiliaSaldos'),ad=document.getElementById('filtroAcabadoSaldos'),md=document.getElementById('filtroMaterialSaldos');if(fd&&fm)fd.value=fm.value;if(ad&&am)ad.value=am.value;if(md&&mm)md.value=mm.value;aplicarFiltrosSaldos();}
        function limpiarFiltrosDesdeModalSaldos(){const fm=document.getElementById('filtroFamiliaSaldosModal'),am=document.getElementById('filtroAcabadoSaldosModal'),mm=document.getElementById('filtroMaterialSaldosModal');if(fm)fm.value='';if(am)am.value='';if(mm)mm.value='';limpiarFiltrosSaldos();}
        (function initCountdown(){const fechaInicio=new Date(2025,5,24),fechaFin=new Date(2025,6,18),hoy=new Date();hoy.setHours(0,0,0,0);fechaInicio.setHours(0,0,0,0);fechaFin.setHours(0,0,0,0);let targetDate,mensaje="";if(hoy<fechaInicio){targetDate=fechaInicio;mensaje="📦 OFERTA PRÓXIMAMENTE";}else if(hoy>=fechaInicio&&hoy<=fechaFin){targetDate=fechaFin;mensaje="⏰ OFERTA POR TIEMPO LIMITADO";}else{targetDate=null;mensaje="📢 OFERTA FINALIZADA";}
        const titleEl=document.getElementById('countdownTitleSaldos');if(titleEl)titleEl.textContent=mensaje;if(!targetDate){document.getElementById('countdown-days-saldos').textContent='00';document.getElementById('countdown-hours-saldos').textContent='00';document.getElementById('countdown-minutes-saldos').textContent='00';document.getElementById('countdown-seconds-saldos').textContent='00';return;}
        function update(){const now=new Date(),diff=targetDate-now;if(diff<=0){document.getElementById('countdown-days-saldos').textContent='00';document.getElementById('countdown-hours-saldos').textContent='00';document.getElementById('countdown-minutes-saldos').textContent='00';document.getElementById('countdown-seconds-saldos').textContent='00';return;}
        const days=Math.floor(diff/86400000),hours=Math.floor((diff%86400000)/3600000),minutes=Math.floor((diff%3600000)/60000),seconds=Math.floor((diff%60000)/1000);document.getElementById('countdown-days-saldos').textContent=days.toString().padStart(2,'0');document.getElementById('countdown-hours-saldos').textContent=hours.toString().padStart(2,'0');document.getElementById('countdown-minutes-saldos').textContent=minutes.toString().padStart(2,'0');document.getElementById('countdown-seconds-saldos').textContent=seconds.toString().padStart(2,'0');}
        update();setInterval(update,1000);})();
        document.addEventListener('DOMContentLoaded',function(){const searchInput=document.getElementById('searchSaldos'),familiaSelect=document.getElementById('filtroFamiliaSaldos'),acabadoSelect=document.getElementById('filtroAcabadoSaldos'),materialSelect=document.getElementById('filtroMaterialSaldos'),familiaModal=document.getElementById('filtroFamiliaSaldosModal'),acabadoModal=document.getElementById('filtroAcabadoSaldosModal'),materialModal=document.getElementById('filtroMaterialSaldosModal'),scrollBtn=document.getElementById('scrollTopBtnSaldos');let timeout=null;
        if(searchInput){searchInput.addEventListener('input',function(){if(timeout)clearTimeout(timeout);timeout=setTimeout(()=>{if(typeof aplicarFiltrosSaldos==='function')aplicarFiltrosSaldos();},400);});}
        const apply=()=>{if(typeof aplicarFiltrosSaldos==='function')aplicarFiltrosSaldos();};const syncAndApply=()=>{syncModalSelectsSaldos();apply();};
        if(familiaSelect)familiaSelect.addEventListener('change',syncAndApply);if(acabadoSelect)acabadoSelect.addEventListener('change',syncAndApply);if(materialSelect)materialSelect.addEventListener('change',syncAndApply);if(familiaModal)familiaModal.addEventListener('change',()=>{if(familiaSelect)familiaSelect.value=familiaModal.value;apply();});if(acabadoModal)acabadoModal.addEventListener('change',()=>{if(acabadoSelect)acabadoSelect.value=acabadoModal.value;apply();});if(materialModal)materialModal.addEventListener('change',()=>{if(materialSelect)materialSelect.value=materialModal.value;apply();});
        if(scrollBtn){window.addEventListener('scroll',function(){if(window.scrollY>300)scrollBtn.style.display='flex';else scrollBtn.style.display='none';});}
        syncModalSelectsSaldos();});
        window.openFiltrosModalSaldos=openFiltrosModalSaldos;window.closeFiltrosModalSaldos=closeFiltrosModalSaldos;window.aplicarFiltrosDesdeModalSaldos=aplicarFiltrosDesdeModalSaldos;window.limpiarFiltrosDesdeModalSaldos=limpiarFiltrosDesdeModalSaldos;window.scrollToTopSaldos=scrollToTopSaldos;window.aplicarFiltrosSaldos=aplicarFiltrosSaldos;window.limpiarFiltrosSaldos=limpiarFiltrosSaldos;window.syncModalSelectsSaldos=syncModalSelectsSaldos;
    </script>
    </body></html>`;
    
    document.documentElement.innerHTML = html;
    cargarSeleccionCotizacion();
    // ============================================
    // INICIALIZACIÓN COMPLETA
    // ============================================
    setTimeout(() => {
    console.log('🚀 Iniciando configuración de Outlet...');
    
    // ============================================
    // 1. CARGAR COTIZACIÓN DESDE LOCALSTORAGE
    // ============================================
    if (typeof cargarSeleccionCotizacion === 'function') {
        cargarSeleccionCotizacion();
        console.log('✅ Cotización cargada');
    }
    
    if (cotizacionSeleccionados && cotizacionSeleccionados.length > 0) {
        console.log('📦 Productos en cotización:', cotizacionSeleccionados.length);
        if (typeof actualizarBarraFlotante === 'function') {
            actualizarBarraFlotante();
        }
        if (typeof actualizarTodosLosBotonesCotizar === 'function') {
            actualizarTodosLosBotonesCotizar();
        }
        if (typeof actualizarBadgeHeader === 'function') {
            actualizarBadgeHeader();
        }
    }
    
    // ============================================
    // 2. INICIALIZAR COUNTDOWN
    // ============================================
    if (typeof initCountdown === 'function') {
        initCountdown();
        console.log('✅ Countdown iniciado');
    }
    
    // ============================================
    // 3. INICIALIZAR LAZY LOADING DE IMÁGENES
    // ============================================
    if (typeof inicializarLazyLoading === 'function') {
        inicializarLazyLoading();
        console.log('✅ Lazy loading iniciado');
    }
    
    // ============================================
    // 4. PRECARGAR ASESORES
    // ============================================
    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            if (typeof precargarAsesoresOutlet === 'function') {
                precargarAsesoresOutlet();
                console.log('✅ Asesores precargados (idle)');
            }
        });
    } else {
        setTimeout(() => {
            if (typeof precargarAsesoresOutlet === 'function') {
                precargarAsesoresOutlet();
                console.log('✅ Asesores precargados (timeout)');
            }
        }, 2000);
    }
    
    // ============================================
    // 5. CONFIGURAR BOTÓN DE ESCÁNER QR
    // ============================================
    setTimeout(() => {
        const btnEscanear = document.getElementById('btnEscanearQR');
        if (btnEscanear) {
            btnEscanear.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en botón QR');
                if (typeof iniciarEscaneoQR === 'function') {
                    iniciarEscaneoQR();
                }
            };
            console.log('✅ Botón QR configurado');
        } else {
            console.warn('⚠️ Botón QR no encontrado');
        }
        
        const btnCerrarQR = document.getElementById('btnCerrarQR');
        if (btnCerrarQR) {
            btnCerrarQR.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en cerrar QR');
                if (typeof cerrarModalQR === 'function') {
                    cerrarModalQR();
                }
            };
            console.log('✅ Botón cerrar QR configurado');
        }
    }, 500);
    
    // ============================================
    // 6. CONFIGURAR BÚSQUEDA (PASO 5)
    // ============================================
    setTimeout(() => {
        console.log('🔧 Configurando búsqueda...');
        
        // Configurar eventos del input de búsqueda
        if (typeof configurarBusqueda === 'function') {
            configurarBusqueda();
            console.log('✅ Búsqueda configurada');
        } else {
            console.warn('⚠️ configurarBusqueda no está definida');
        }
        
        // Verificar si ya hay texto en el input
        const searchInput = document.getElementById('searchOutlet');
        if (searchInput && searchInput.value && searchInput.value.trim().length > 0) {
            console.log('📝 Hay texto en el input:', searchInput.value);
            
            // Mostrar botón de limpiar
            if (typeof toggleClearButton === 'function') {
                toggleClearButton();
            }
            
            // Aplicar filtros automáticamente
            if (typeof window.aplicarFiltrosOutlet === 'function') {
                window.aplicarFiltrosOutlet();
            }
        }
        
        console.log('✅ Búsqueda inicializada correctamente');
    }, 200);
    
    // ============================================
    // 7. CONFIGURAR FILTROS
    // ============================================
    setTimeout(() => {
        const familiaSelect = document.getElementById('filtroFamilia');
        const acabadoSelect = document.getElementById('filtroAcabado');
        const materialSelect = document.getElementById('filtroMaterial');
        const searchInput = document.getElementById('searchOutlet');
        
        const aplicarFiltros = () => {
            console.log('🔄 Aplicando filtros desde selects');
            if (typeof syncModalSelects === 'function') {
                syncModalSelects();
            }
            if (typeof window.aplicarFiltrosOutlet === 'function') {
                window.aplicarFiltrosOutlet();
            }
        };
        
        if (familiaSelect) {
            familiaSelect.addEventListener('change', aplicarFiltros);
            console.log('✅ Select Familia configurado');
        }
        if (acabadoSelect) {
            acabadoSelect.addEventListener('change', aplicarFiltros);
            console.log('✅ Select Acabado configurado');
        }
        if (materialSelect) {
            materialSelect.addEventListener('change', aplicarFiltros);
            console.log('✅ Select Material configurado');
        }
        
        // Sincronizar selects con el modal
        if (typeof syncModalSelects === 'function') {
            syncModalSelects();
        }
    }, 200);
    
    // ============================================
    // 8. CONFIGURAR SCROLL TOP BUTTON
    // ============================================
    setTimeout(() => {
        const scrollBtn = document.getElementById('scrollTopBtn');
        if (scrollBtn) {
            window.addEventListener('scroll', function() {
                if (window.scrollY > 300) {
                    scrollBtn.classList.add('show');
                    scrollBtn.style.display = 'flex';
                } else {
                    scrollBtn.classList.remove('show');
                    scrollBtn.style.display = 'none';
                }
            });
            console.log('✅ Scroll top button configurado');
        }
    }, 200);
    
    // ============================================
    // 9. CONFIGURAR MODAL DE FILTROS
    // ============================================
    setTimeout(() => {
        const filtrosFab = document.getElementById('filtrosFab');
        if (filtrosFab) {
            if (window.innerWidth <= 768) {
                filtrosFab.style.display = 'flex';
            } else {
                filtrosFab.style.display = 'none';
            }
            console.log('✅ FAB filtros configurado');
        }
        
        // Asegurar que el modal de filtros esté cerrado
        const modalFiltros = document.getElementById('filtrosModal');
        if (modalFiltros) {
            modalFiltros.classList.remove('show');
            modalFiltros.style.right = '-100%';
        }
        
        const overlayFiltros = document.getElementById('filtrosModalOverlay');
        if (overlayFiltros) {
            overlayFiltros.classList.remove('show');
            overlayFiltros.style.display = 'none';
        }
        
        console.log('✅ Modal de filtros configurado');
    }, 300);
    
    // ============================================
    // 10. CONFIGURAR BOTÓN "LIMPIAR TODO"
    // ============================================
    setTimeout(() => {
        const btnLimpiarTodo = document.getElementById('btnLimpiarTodoOutlet');
        if (btnLimpiarTodo) {
            // Remover eventos anteriores clonando
            const nuevoBtn = btnLimpiarTodo.cloneNode(true);
            btnLimpiarTodo.parentNode.replaceChild(nuevoBtn, btnLimpiarTodo);
            
            nuevoBtn.addEventListener('click', function() {
                console.log('🧹 Limpiando todo...');
                
                // Limpiar búsqueda
                const searchInput = document.getElementById('searchOutlet');
                if (searchInput) {
                    searchInput.value = '';
                    const btnClear = document.getElementById('btnLimpiarBusqueda');
                    if (btnClear) btnClear.style.display = 'none';
                    
                    const btnExterno = document.getElementById('btnLimpiarBusquedaExterno');
                    if (btnExterno) {
                        btnExterno.classList.remove('visible');
                        btnExterno.classList.add('hidden');
                        btnExterno.style.display = 'none';
                    }
                }
                
                // Limpiar selects
                const familiaSelect = document.getElementById('filtroFamilia');
                const acabadoSelect = document.getElementById('filtroAcabado');
                const materialSelect = document.getElementById('filtroMaterial');
                if (familiaSelect) familiaSelect.value = '';
                if (acabadoSelect) acabadoSelect.value = '';
                if (materialSelect) materialSelect.value = '';
                
                // Aplicar filtros
                if (typeof window.limpiarFiltrosOutlet === 'function') {
                    window.limpiarFiltrosOutlet();
                } else if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                }
                
                // Ocultar el botón
                nuevoBtn.style.display = 'none';
                console.log('✅ Todo limpiado correctamente');
            });
            console.log('✅ Botón "Limpiar todo" configurado');
        }
    }, 200);
    
    // ============================================
    // 11. CONFIGURAR CHIPS DE FILTROS ACTIVOS
    // ============================================
    setTimeout(() => {
        if (typeof actualizarChipsFiltrosActivos === 'function') {
            actualizarChipsFiltrosActivos();
            console.log('✅ Chips de filtros actualizados');
        }
    }, 300);
    
    // ============================================
    // 12. EVENTO RESIZE PARA AJUSTAR FAB
    // ============================================
    window.addEventListener('resize', function() {
        const filtrosFab = document.getElementById('filtrosFab');
        if (filtrosFab) {
            if (window.innerWidth <= 768) {
                filtrosFab.style.display = 'flex';
            } else {
                filtrosFab.style.display = 'none';
            }
        }
        
        // Actualizar botones de limpiar según el tamaño
        if (typeof toggleClearButton === 'function') {
            toggleClearButton();
        }
    });
    
    console.log('✅ Outlet renderizado correctamente con todas las mejoras mobile first');
    
}, 100);
}

window.toggleSeleccionCotizacion = function(producto) {
    if (!producto || !producto.id) {
        console.error('Producto inválido:', producto);
        return;
    }
    
    console.log('🔄 Toggle producto:', producto.nombre);
    
    // Buscar si ya existe
    const existe = window.cotizacionSeleccionados.find(p => p.id === producto.id);
    const productoCompleto = window.outletProductosCache.find(p => p.id === producto.id);
    
    if (existe) {
        // REMOVER PRODUCTO
        window.cotizacionSeleccionados = window.cotizacionSeleccionados.filter(p => p.id !== existe.id);
        localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(window.cotizacionSeleccionados));
        
        // Actualizar UI
        actualizarTodosLosBotonesCotizar();
        actualizarBarraFlotante();
        actualizarBadgeHeader();
        
        mostrarToast(`${producto.nombre} removido de cotización`, 'error');
        
    } else {
        // AGREGAR PRODUCTO
        const nuevoProducto = {
            id: producto.id,
            nombre: producto.nombre || 'Producto',
            codigo: producto.codigo || '',
            imagen: producto.imagen_principal || '',
            slug: producto.slug || producto.id,
            medida: productoCompleto?.medida || producto.medida || null,
            espesor: productoCompleto?.espesor || producto.espesor || null
        };
        
        window.cotizacionSeleccionados.push(nuevoProducto);
        localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(window.cotizacionSeleccionados));
        
        // Actualizar UI
        actualizarTodosLosBotonesCotizar();
        actualizarBarraFlotante();
        actualizarBadgeHeader();
        
        // ✅ MOSTRAR MODAL DE CONFIRMACIÓN
        if (typeof window.mostrarModalConfirmacionAgregado === 'function') {
            window.mostrarModalConfirmacionAgregado(producto.nombre);
        } else {
            // Fallback: mostrar toast si el modal no está disponible
            mostrarToast(`${producto.nombre} agregado a cotización`, 'success');
        }
    }
};

function actualizarTodosLosBotonesCotizar() {
    console.log('🔄 Actualizando todos los botones de cotizar...');
    
    // Asegurarnos de que cotizacionSeleccionados esté cargado
    if (!cotizacionSeleccionados || cotizacionSeleccionados.length === 0) {
        // Intentar cargar desde localStorage
        const guardado = localStorage.getItem(CONFIG.COTIZACION_STORAGE_KEY);
        if (guardado) {
            try {
                cotizacionSeleccionados = JSON.parse(guardado);
                console.log('📦 Cotización cargada para actualizar botones:', cotizacionSeleccionados.length);
            } catch(e) {
                cotizacionSeleccionados = [];
            }
        }
    }
    
    const botones = document.querySelectorAll('.btn-cotizar-bottom');
    console.log(`🔍 Encontrados ${botones.length} botones para actualizar`);
    
    botones.forEach(btn => {
        const productoId = btn.getAttribute('data-id');
        const estaSeleccionado = cotizacionSeleccionados.some(item => item && item.id === productoId);
        
        if (estaSeleccionado) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado ✓';
            btn.classList.add('seleccionado');
        } else {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
            btn.classList.remove('seleccionado');
        }
    });
    
    // Actualizar también la barra y el badge
    actualizarBarraFlotante();
    actualizarBadgeHeader();
    
    console.log('✅ Botones actualizados correctamente');
}

// EXPONER FUNCIÓN GLOBAL
window.actualizarTodosLosBotonesCotizar = actualizarTodosLosBotonesCotizar;

window.mostrarModalConfirmacionAgregado = mostrarModalConfirmacionAgregado;
window.cerrarModalConfirmacion = cerrarModalConfirmacion;
window.irACotizacion = irACotizacion;
window.seguirAgregando = seguirAgregando;
window.toggleSeleccionCotizacion = toggleSeleccionCotizacion;

// ==================== CARGAR PRODUCTO LANDING ====================
async function cargarProductoLanding() {
    if (landingCargada) return;
    
    const resultado = obtenerSlugDeURL();
    if (!resultado) {
        window.esLandingPage = false;
        return false;
    }
    
    const supabaseListo = await esperarSupabase();
    if (!supabaseListo) {
        mostrarPaginaNoEncontrada();
        return false;
    }
    
    landingCargada = true;
    window.esLandingPage = true;
    
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    
    // ============================================
    // SECCIÓN ESPECIAL: OUTLET Y SALDOS DE EXPORTACIÓN
    // ============================================
    if (resultado.tipo === 'seccion') {
        const seccion = resultado.valor;
        try {
            if (seccion === 'outlet') {
                console.log('🔥 Cargando página de Outlet...');
                const { data: productos, error } = await window.supabaseClient
                    .from('productos')
                    .select(`*, familia:familia_id(id,nombre), acabado:acabado_id(id,nombre), material:material_id(id,nombre), calidad:calidad_id(id,nombre)`)
                    .contains('categorias_especiales', ['OUTLET'])
                    .eq('activo', true)
                    .order('orden', { ascending: true })
                    .order('nombre', { ascending: true });
                if (error) throw error;
                renderizarPaginaOutlet(productos || []);
                return true;
            } else if (seccion === 'saldos-exportacion') {
                console.log('📦 Cargando página de Saldos de Exportación...');
                const { data: productos, error } = await window.supabaseClient
                    .from('productos')
                    .select(`*, familia:familia_id(id,nombre), acabado:acabado_id(id,nombre), material:material_id(id,nombre), calidad:calidad_id(id,nombre)`)
                    .contains('categorias_especiales', ['SALDOS_EXPORTACION'])
                    .eq('activo', true)
                    .order('orden', { ascending: true })
                    .order('nombre', { ascending: true });
                if (error) throw error;
                renderizarPaginaSaldosExportacion(productos || []);
                return true;
            } else {
                console.error('❌ Sección no reconocida:', seccion);
                mostrarPaginaNoEncontrada();
                return false;
            }
        } catch (error) {
            console.error(`❌ Error cargando ${seccion}:`, error);
            mostrarPaginaNoEncontrada();
            return false;
        }
    }
    
    // ============================================
    // SECCIÓN PRODUCTO INDIVIDUAL
    // ============================================
    if (resultado.tipo === 'producto') {
        const slug = resultado.valor;
        try {
            console.log('🔍 Buscando producto con slug:', slug);
            
            // Obtener producto con todas sus relaciones
            const { data: producto, error } = await window.supabaseClient
                .from('productos')
                .select(`
                    *, 
                    familia:familia_id(id,nombre), 
                    acabado:acabado_id(id,nombre), 
                    borde:borde_id(id,nombre),
                    material:material_id(id,nombre), 
                    calidad:calidad_id(id,nombre,descripcion),
                    unidad_medida:unidad_medida_id(id,nombre,nombre_plural,abreviatura,codigo),
                    aplicaciones_rel:producto_aplicaciones_rel(aplicacion_id, aplicacion:aplicacion_id(id,nombre,icono))
                `)
                .eq('slug', slug)
                .eq('activo', true)
                .single();
            
            if (error || !producto) {
                console.error('❌ Producto no encontrado:', error);
                mostrarPaginaNoEncontrada();
                return false;
            }
            
            console.log('✅ Producto encontrado:', producto.nombre);
            
            // Procesar aplicaciones
            const aplicaciones = (producto.aplicaciones_rel || []).map(rel => ({
                id: rel.aplicacion?.id,
                nombre: rel.aplicacion?.nombre,
                icono: rel.aplicacion?.icono || 'fa-star'
            }));
            
            const productoProcesado = { 
                ...producto, 
                codigo: producto.codigo || null, 
                calidad: producto.calidad, 
                modelo: producto.modelo || null, 
                unidad_medida: producto.unidad_medida, 
                aplicaciones: aplicaciones 
            };
            
            // Incrementar visitas
            incrementarVisitas(producto.id);
            registrarVisitaDetallada(producto.id);
            actualizarSEODinamico(productoProcesado);
            
            // Renderizar landing page
            renderizarLandingProducto(productoProcesado);
            
            // ============================================
            // NUEVO: DETECTAR SI VIENE DE ESCANEO QR
            // ============================================
            const urlParams = new URLSearchParams(window.location.search);
            const esQR = urlParams.get('qr') === '1';
            
            if (esQR && productoProcesado) {
                console.log('📱 Producto escaneado desde QR - Mostrando modal de opciones');
                // Esperar a que la página se renderice completamente
                setTimeout(() => {
                    mostrarModalOpcionesProducto(productoProcesado);
                }, 800);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando producto:', error);
            mostrarPaginaNoEncontrada();
            return false;
        }
    }
    
    return false;
}

// ==================== MOSTRAR MODAL DE OPCIONES AL ESCANEAR QR ====================
async function mostrarModalOpcionesProducto(producto) {
    // Esperar a que el DOM esté listo
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Función para optimizar URL de Google Drive
    function optimizarUrlImagen(url) {
        if (!url) return '';
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
        }
        return url;
    }
    
    // Función para escapar HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Crear modal personalizado
    const modalHtml = `
        <div id="qrModalOpciones" class="qr-modal-overlay">
            <div class="qr-modal-container">
                <div class="qr-modal-header">
                    <i class="fas fa-qrcode"></i>
                    <h3>Producto Detectado</h3>
                </div>
                <div class="qr-modal-body">
                    <div class="producto-info">
                        <div class="producto-imagen">
                            ${producto.imagen_principal ? 
                                `<img src="${optimizarUrlImagen(producto.imagen_principal)}" alt="${escapeHtml(producto.nombre)}" onerror="this.src='FOTO/foto_01.webp'">` : 
                                '<div class="sin-imagen"><i class="fas fa-image"></i></div>'
                            }
                        </div>
                        <div class="producto-detalle">
                            <h4>${escapeHtml(producto.nombre)}</h4>
                            <p class="codigo">Código: ${producto.codigo || 'N/A'}</p>
                            <p class="familia">${producto.familia?.nombre || ''}</p>
                        </div>
                    </div>
                    
                    <div class="opciones">
                        <button id="btnVerDetalle" class="qr-btn qr-btn-primary">
                            <i class="fas fa-info-circle"></i>
                            Ver Detalle del Producto
                        </button>
                        <button id="btnAgregarCotizacion" class="qr-btn qr-btn-secondary">
                            <i class="fas fa-plus-circle"></i>
                            Agregar a Cotización
                        </button>
                        <button id="btnCerrarModal" class="qr-btn qr-btn-cancelar">
                            <i class="fas fa-times"></i>
                            Cerrar
                        </button>
                    </div>
                </div>
                <div class="qr-modal-footer">
                    <p>Escanea este código para acceder rápidamente al producto</p>
                </div>
            </div>
        </div>
    `;
    
    // Agregar estilos si no existen
    if (!document.getElementById('qr-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'qr-modal-styles';
        styles.textContent = `
            .qr-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(5px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease-out;
            }
            
            .qr-modal-container {
                background: white;
                border-radius: 20px;
                width: 90%;
                max-width: 400px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                animation: slideUp 0.3s ease-out;
            }
            
            .qr-modal-header {
                background: linear-gradient(135deg, var(--primary), #5a1a1d);
                color: white;
                padding: 20px;
                text-align: center;
            }
            
            .qr-modal-header i {
                font-size: 32px;
                margin-bottom: 8px;
            }
            
            .qr-modal-header h3 {
                font-size: 18px;
                margin: 0;
            }
            
            .qr-modal-body {
                padding: 20px;
            }
            
            .producto-info {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .producto-imagen {
                width: 80px;
                height: 80px;
                flex-shrink: 0;
                background: #f3f4f6;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .producto-imagen img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .sin-imagen {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #9ca3af;
                font-size: 24px;
            }
            
            .producto-detalle {
                flex: 1;
            }
            
            .producto-detalle h4 {
                font-size: 16px;
                font-weight: 600;
                color: var(--primary);
                margin: 0 0 5px 0;
            }
            
            .producto-detalle .codigo {
                font-size: 11px;
                font-family: monospace;
                color: #6b7280;
                margin: 0 0 3px 0;
            }
            
            .producto-detalle .familia {
                font-size: 11px;
                color: #8b5cf6;
                margin: 0;
            }
            
            .opciones {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .qr-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                padding: 12px 16px;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .qr-btn i {
                font-size: 16px;
            }
            
            .qr-btn-primary {
                background: var(--primary);
                color: white;
            }
            
            .qr-btn-primary:hover {
                background: #5a1a1d;
                transform: translateY(-2px);
            }
            
            .qr-btn-secondary {
                background: #d4d4ae;
                color: var(--primary);
            }
            
            .qr-btn-secondary:hover {
                background: #c4c49a;
                transform: translateY(-2px);
            }
            
            .qr-btn-cancelar {
                background: #f3f4f6;
                color: #6b7280;
            }
            
            .qr-btn-cancelar:hover {
                background: #e5e7eb;
            }
            
            .qr-modal-footer {
                background: #f9fafb;
                padding: 12px 20px;
                text-align: center;
                font-size: 10px;
                color: #9ca3af;
                border-top: 1px solid #e5e7eb;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 480px) {
                .qr-modal-container {
                    width: 95%;
                }
                .producto-info {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                .producto-imagen {
                    width: 100px;
                    height: 100px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('qrModalOpciones');
    
    // Función para cerrar modal
    const cerrarModal = () => {
        if (modal) modal.remove();
    };
    
    // Evento para botón "Ver Detalle"
    const btnVerDetalle = document.getElementById('btnVerDetalle');
    if (btnVerDetalle) {
        btnVerDetalle.onclick = () => {
            cerrarModal();
            // Scroll a la información del producto
            const heroSection = document.querySelector('.hero');
            if (heroSection) {
                heroSection.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }
    
    // Evento para botón "Agregar a Cotización"
    const btnAgregarCotizacion = document.getElementById('btnAgregarCotizacion');
    if (btnAgregarCotizacion) {
        btnAgregarCotizacion.onclick = () => {
            // Agregar a cotización usando la función global
            if (typeof window.toggleSeleccionCotizacion === 'function') {
                window.toggleSeleccionCotizacion({
                    id: producto.id,
                    nombre: producto.nombre,
                    codigo: producto.codigo,
                    imagen_principal: producto.imagen_principal,
                    slug: producto.slug
                });
            } else if (typeof toggleSeleccionCotizacion === 'function') {
                toggleSeleccionCotizacion({
                    id: producto.id,
                    nombre: producto.nombre,
                    codigo: producto.codigo,
                    imagen_principal: producto.imagen_principal,
                    slug: producto.slug
                });
            }
            cerrarModal();
            
            // Mostrar notificación de éxito
            Swal.fire({
                title: '✅ Producto agregado',
                text: `${producto.nombre} ha sido agregado a tu cotización`,
                icon: 'success',
                confirmButtonColor: 'var(--primary)',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Abrir modal de cotización después de cerrar la notificación
                if (typeof window.abrirModalCotizacion === 'function') {
                    setTimeout(() => {
                        window.abrirModalCotizacion();
                    }, 300);
                }
            });
        };
    }
    
    // Evento para botón "Cerrar"
    const btnCerrar = document.getElementById('btnCerrarModal');
    if (btnCerrar) {
        btnCerrar.onclick = cerrarModal;
    }
    
    // Cerrar al hacer clic fuera del modal
    modal.onclick = (e) => {
        if (e.target === modal) cerrarModal();
    };
}

// Exponer función globalmente
window.mostrarModalOpcionesProducto = mostrarModalOpcionesProducto;



// ==================== INICIALIZAR ====================
(async function() {
    console.log('🚀 Iniciando landing.js...');
    const resultado = obtenerSlugDeURL();
    if (resultado) {
        if (resultado.tipo === 'seccion') console.log('🎯 Sección especial detectada:', resultado.valor);
        else console.log('🎯 Slug de producto detectado:', resultado.valor);
        await cargarProductoLanding();
    } else {
        console.log('🏠 No es landing page ni sección especial');
        window.esLandingPage = false;
    }
})();



