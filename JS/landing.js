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
                background: #39080a;
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
                color: #39080a;
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

function actualizarBarraFlotante() {
    let barra = document.getElementById('barra-cotizacion');
    const total = cotizacionSeleccionados.length;
    
    if (!barra && total > 0) {
        barra = document.createElement('div');
        barra.id = 'barra-cotizacion';
        barra.innerHTML = `
            <div style="position: fixed; bottom: 0; left: 0; right: 0; background: #39080a; color: white; padding: 12px 20px; z-index: 1000; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 -2px 10px rgba(0,0,0,0.2);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clipboard-list"></i>
                    <span id="contador-cotizacion">${total}</span> producto(s) seleccionado(s)
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.limpiarCotizacion()" style="background: #6b7280; border: none; padding: 8px 16px; border-radius: 8px; color: white; cursor: pointer;">
                        <i class="fas fa-trash"></i> Limpiar
                    </button>
                    <button onclick="window.abrirModalCotizacion()" style="background: #d4d4ae; border: none; padding: 8px 16px; border-radius: 8px; color: #39080a; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-file-invoice"></i> Ver Cotización
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(barra);
    } else if (barra && total === 0) {
        barra.remove();
    } else if (barra && total > 0) {
        const contador = document.getElementById('contador-cotizacion');
        if (contador) contador.textContent = total;
    }
}

function actualizarBotonCard(productoId, estabaSeleccionado) {
    const btn = document.querySelector(`.btn-cotizar[data-id="${productoId}"]`);
    if (btn) {
        if (!estabaSeleccionado) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado';
            btn.style.background = '#10b981';
            btn.style.color = 'white';
        } else {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
            btn.style.background = '#39080a';
            btn.style.color = 'white';
        }
    }
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
                btn.style.background = '#39080a';
                btn.style.color = 'white';
            });
            
            await mostrarModal('✅ Selección limpiada', 'Todos los productos han sido removidos de tu cotización.', 'success', { timer: 2000, showConfirmButton: false });
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

async function guardarCotizacion(datosCliente) {
    const numero = `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    let asesorId = null;
    
    if (datosCliente.tipoCliente === 'si' && asesorPreasignadoId) {
        asesorId = asesorPreasignadoId;
    } else {
        const asesor = await asignarAsesorAutomatico(datosCliente);
        asesorId = asesor?.id || null;
    }
    
    const cotizacion = {
        numero: numero,
        cliente_nombre: datosCliente.nombre || null,
        cliente_email: datosCliente.email,
        cliente_telefono: datosCliente.telefono || null,
        cliente_empresa: datosCliente.empresa || null,
        tipo_cliente: datosCliente.tipoCliente === 'si' ? 'EXISTENTE' : 'NUEVO',
        asesor_asignado_id: asesorId,
        productos: cotizacionSeleccionados.map(p => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo,
            cantidad: p.cantidad
        })),
        observaciones: datosCliente.observaciones || null,
        ubicacion_proyecto: datosCliente.ubicacionProyecto || null,
        estado: 'PENDIENTE',
        creado_el: new Date().toISOString()
    };

    // Si quieres incluir ubicacion_proyecto
    if (datosCliente.ubicacionProyecto) {
        cotizacion.ubicacion_proyecto = datosCliente.ubicacionProyecto;
    }
    
    const { data, error } = await window.supabaseClient
        .from('cotizaciones')
        .insert(cotizacion)
        .select()
        .single();
    
    if (error) throw error;
    
    if (datosCliente.email) {
        await window.supabaseClient
            .from('clientes_asesores')
            .upsert({
                email: datosCliente.email,
                telefono: datosCliente.telefono,
                vendedor_id: asesorId,
                ultima_cotizacion: new Date().toISOString()
            }, { onConflict: 'email' });
    }
    
    return { data, asesorId };
}

function generarMensajeWhatsApp(datosCliente, productos, cotizacion, asesor) {
    let productosLista = '';
    productos.forEach((p, i) => {
        productosLista += `${i+1}. ${p.nombre} - ${p.cantidad} unidad(es)\n`;
    });
    
    return `📋 *NUEVA COTIZACIÓN - OUTLET*
    
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
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #39080a20; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user-tie" style="color: #39080a;"></i>
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

// ==================== ENVIAR COTIZACIÓN (CON SOPORTE PARA cotizacion_detalles) ====================
async function enviarCotizacion(datosCliente, asesor) {
    mostrarModal('Procesando', 'Guardando cotización...', 'info', { showConfirmButton: false });
    
    try {
        const numero = `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const fechaActual = new Date().toISOString();
        
        // ============================================
        // PREPARAR DATOS DE LA COTIZACIÓN
        // ============================================
        
        // Datos para el campo JSON (productos)
        const productosJSON = cotizacionSeleccionados.map(p => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo || ''
        }));
        
        // Datos principales de la cotización
        const cotizacion = {
            numero: numero,
            cliente_nombre: datosCliente.nombre,
            cliente_email: datosCliente.email,
            cliente_telefono: datosCliente.telefono,
            cliente_empresa: datosCliente.empresa || null,
            tipo_cliente: 'NUEVO',
            asesor_asignado_id: asesor.id,
            productos: productosJSON,  // Mantenemos JSON por compatibilidad
            observaciones: datosCliente.observaciones || null,
            ubicacion_proyecto: datosCliente.ubicacionProyecto || null,
            estado: 'PENDIENTE',
            creado_el: fechaActual,
            creado_por: usuarioActual.id
        };
        
        // ============================================
        // 1. GUARDAR COTIZACIÓN PRINCIPAL
        // ============================================
        
        const { data: nuevaCotizacion, error: cotizacionError } = await window.supabaseClient
            .from('cotizaciones')
            .insert(cotizacion)
            .select()
            .single();
        
        if (cotizacionError) {
            console.error('Error guardando cotización:', cotizacionError);
            throw cotizacionError;
        }
        
        const cotizacionId = nuevaCotizacion.id;
        console.log('Cotización guardada:', numero, 'ID:', cotizacionId);
        
        // ============================================
        // 2. GUARDAR DETALLES DE PRODUCTOS EN cotizacion_detalles
        // ============================================
        
        let detallesGuardados = 0;
        let erroresDetalles = [];
        
        for (const producto of cotizacionSeleccionados) {
            const { error: detalleError } = await window.supabaseClient
                .from('cotizacion_detalles')
                .insert({
                    cotizacion_id: cotizacionId,
                    producto_id: producto.id,
                    codigo: producto.codigo || '',
                    nombre: producto.nombre,
                    creado_el: fechaActual
                });
            
            if (detalleError) {
                console.error(`Error guardando detalle para producto ${producto.nombre}:`, detalleError);
                erroresDetalles.push({ producto: producto.nombre, error: detalleError.message });
            } else {
                detallesGuardados++;
            }
        }
        
        console.log(`Detalles guardados: ${detallesGuardados} de ${cotizacionSeleccionados.length} productos`);
        
        if (erroresDetalles.length > 0) {
            console.warn('Algunos detalles no se guardaron:', erroresDetalles);
        }
        
        // ============================================
        // 3. INCREMENTAR CONTADOR DEL ASESOR
        // ============================================
        
        try {
            const nuevoContador = (asesor.leads_asignados_hoy || 0) + 1;
            await window.supabaseClient
                .from('vendedores')
                .update({ 
                    leads_asignados_hoy: nuevoContador,
                    ultima_asignacion: fechaActual
                })
                .eq('id', asesor.id);
            console.log(`Contador actualizado para ${asesor.nombre}: ${nuevoContador}`);
        } catch (err) {
            console.error('Error al incrementar contador:', err);
            // No detenemos el proceso si falla el contador
        }
        
        // ============================================
        // 4. GUARDAR RELACIÓN CLIENTE-ASESOR
        // ============================================
        
        if (asesor.id && datosCliente.email) {
            try {
                const { data: existente } = await window.supabaseClient
                    .from('clientes_asesores')
                    .select('id')
                    .eq('email', datosCliente.email)
                    .maybeSingle();
                
                if (existente) {
                    await window.supabaseClient
                        .from('clientes_asesores')
                        .update({
                            telefono: datosCliente.telefono,
                            vendedor_id: asesor.id,
                            ultima_cotizacion: fechaActual
                        })
                        .eq('id', existente.id);
                } else {
                    await window.supabaseClient
                        .from('clientes_asesores')
                        .insert({
                            email: datosCliente.email,
                            telefono: datosCliente.telefono,
                            vendedor_id: asesor.id,
                            ultima_cotizacion: fechaActual,
                            creado_el: fechaActual
                        });
                }
                console.log('Relación cliente-asesor guardada');
            } catch (err) {
                console.error('Error guardando relación cliente-asesor:', err);
            }
        }
        
        // ============================================
        // 5. CERRAR MODAL DE CARGA
        // ============================================
        
        const modalOverlay = document.querySelector('.modal-overlay.active');
        if (modalOverlay) modalOverlay.classList.remove('active');
        
        // ============================================
        // 6. GENERAR MENSAJE DE WHATSAPP
        // ============================================
        
        let productosLista = '';
        cotizacionSeleccionados.forEach((p, i) => {
            productosLista += `${i+1}. ${p.nombre}${p.codigo ? ` (Código: ${p.codigo})` : ''}\n`;
        });
        
        const modoTexto = datosCliente.modoAsignacion === 'manual' ? 'Manual (cliente eligió asesor)' : 'Automático (distribución justa)';
        
        const mensaje = `*NUEVA COTIZACIÓN - OUTLET*

*N° Cotización:* ${numero}
*Fecha:* ${new Date().toLocaleString()}
*Modo asignación:* ${modoTexto}

*Datos del cliente:*
👤 *Nombre:* ${datosCliente.nombre}
📧 *Email:* ${datosCliente.email}
📞 *Teléfono:* ${datosCliente.telefono}
🏢 *Empresa:* ${datosCliente.empresa || 'No especifica'}
📍 *Ubicación proyecto:* ${datosCliente.ubicacionProyecto || 'No especifica'}

*📦 Productos solicitados:*
${productosLista}
*💬 Observaciones:*
${datosCliente.observaciones || 'Sin observaciones'}

*👨‍💼 Asesor asignado:* ${asesor.nombre} ${asesor.telefono ? `(${asesor.telefono})` : ''}
---
🌐 *Sistema de Gestión Gallos Mármol*
Por favor contactar al cliente para brindar precios y disponibilidad.`;
        
        // ============================================
        // 7. ENVIAR WHATSAPP
        // ============================================
        
        const telefonoAsesor = asesor?.telefono?.replace(/\D/g, '');
        
        if (telefonoAsesor && telefonoAsesor.length >= 9) {
            // Asegurar código de país para Perú si es necesario
            let whatsappNumber = telefonoAsesor;
            if (whatsappNumber.length === 9) {
                whatsappNumber = `51${whatsappNumber}`;
            }
            
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
            window.open(whatsappUrl, '_blank');
            
            console.log('📱 WhatsApp enviado a:', asesor.nombre, 'Número:', whatsappNumber);
            
            await mostrarModal('Cotización enviada', 
                `Cotización ${numero} enviada a ${asesor.nombre} por WhatsApp.\n\nUn asesor se contactará contigo pronto.`, 
                'success', 
                { timer: 4000, showConfirmButton: false }
            );
        } else {
            await mostrarModal('No se pudo enviar automáticamente', 
                `Cotización N°: ${numero}\n\nNo se pudo enviar por WhatsApp porque el asesor ${asesor.nombre} no tiene un número de teléfono configurado.\n\nLa cotización ha sido registrada en el sistema.`, 
                'warning', 
                { confirmButtonText: 'Entendido' }
            );
        }
        
        // ============================================
        // 8. LIMPIAR SELECCIÓN DE PRODUCTOS
        // ============================================
        
        cotizacionSeleccionados = [];
        localStorage.removeItem(cotizacionStorageKey);
        actualizarBarraFlotante();
        
        // Resetear botones de cotización
        document.querySelectorAll('.btn-cotizar').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
            btn.style.background = '#39080a';
            btn.style.color = 'white';
        });
        
        // Resetear variables globales
        window.modoAsignacion = 'auto';
        window.asesorPreasignadoId = null;
        
        // Limpiar caché del formulario
        window.clienteNombreCache = '';
        window.clienteEmailCache = '';
        window.clienteTelefonoCache = '';
        window.clienteEmpresaCache = '';
        window.ubicacionCache = '';
        window.observacionesCache = '';
        
        console.log('Proceso de cotización completado exitosamente');
        
    } catch (error) {
        // Cerrar modal de carga si está abierto
        const modalOverlay = document.querySelector('.modal-overlay.active');
        if (modalOverlay) modalOverlay.classList.remove('active');
        
        console.error('❌ Error detallado en enviarCotizacion:', error);
        
        // Mostrar mensaje de error específico
        let mensajeError = 'Ocurrió un error al procesar la cotización';
        
        if (error.message?.includes('duplicate')) {
            mensajeError = 'Ya existe una cotización con este número. Por favor, intenta nuevamente.';
        } else if (error.message?.includes('foreign key')) {
            mensajeError = 'El asesor seleccionado no es válido. Por favor, selecciona otro.';
        } else if (error.message) {
            mensajeError = error.message;
        }
        
        await mostrarModal('Error', mensajeError, 'error');
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
                colorIcono = '#39080a';
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
    icon.style.color = '#39080a';
    titleEl.textContent = 'Procesando';
    bodyEl.innerHTML = `<p>${mensaje}</p><p class="text-sm text-gray-400 mt-2">Por favor espera...</p>`;
    footer.innerHTML = '';
    
    modal.classList.add('active');
}

function cerrarLoadingModal() {
    const modal = document.getElementById('modalPersonalizado');
    if (modal) modal.classList.remove('active');
}

// ==================== RENDERIZAR LANDING PAGE PRODUCTO ====================
function renderizarLandingProducto(producto) {
    console.log('🎨 Renderizando landing page para:', producto.nombre);
    
    function optimizarGoogleDriveUrl(url) {
        if (!url) return 'FOTO/foto_04.webp';
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
        return url;
    }
    
    const imagenPrincipal = optimizarGoogleDriveUrl(producto.imagen_principal);
    const galeriaImagenes = (producto.galeria && producto.galeria.length > 0) 
        ? producto.galeria.map(img => optimizarGoogleDriveUrl(img))
        : [];
    const rangosArray = producto.rangos || [];
    const tieneGaleria = galeriaImagenes.length > 0;
    const tieneRangos = rangosArray.length > 0;
    const tieneAplicaciones = producto.aplicaciones && producto.aplicaciones.length > 0;
    
    const nombrePartes = producto.nombre.split(' ');
    const primeraPalabra = nombrePartes[0];
    const restoPalabras = nombrePartes.slice(1).join(' ');
    
    let galeriaHtml = '';
    if (tieneGaleria) {
        for (let i = 0; i < galeriaImagenes.length; i++) {
            const img = galeriaImagenes[i];
            const idx = i + 1;
            galeriaHtml += `
                <div class="galeria-item">
                    <img src="${img}" alt="${producto.nombre} - Imagen ${idx}" onerror="this.src='FOTO/foto_04.webp'" data-index="${idx}">
                    <button class="zoom-btn" data-index="${idx}">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
            `;
        }
    }
    
    let rangosHtml = '';
    if (tieneRangos) {
        rangosHtml = `
            <section class="rangos-section">
                <div class="container">
                    <div class="section-title">
                        <h2>Rangos y Variaciones Naturales</h2>
                        <p>Diferentes vetas y tonalidades que puede presentar el producto</p>
                    </div>
                    <div class="aviso-variabilidad" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin-bottom: 25px; border-radius: 8px;">
                        <div style="display: flex; gap: 12px; align-items: flex-start;">
                            <i class="fas fa-info-circle" style="color: #856404; font-size: 1.2rem; margin-top: 2px;"></i>
                            <div style="color: #856404;">
                                <strong style="display: block; margin-bottom: 5px;">⚠️ IMPORTANTE: VARIABILIDAD NATURAL</strong>
                                <p style="margin: 0; font-size: 0.85rem;">Las imágenes mostradas son EJEMPLOS de la variabilidad natural que PUEDE presentar el producto. Al tratarse de piedra natural, no podemos garantizar que el producto final sea idéntico a las muestras mostradas.</p>
                            </div>
                        </div>
                    </div>
                    <div class="rangos-grid">
                        ${rangosArray.map((img, i) => {
                            const idx = 1 + galeriaImagenes.length + i;
                            const imgOptimizada = optimizarGoogleDriveUrl(img);
                            return `
                                <div class="rango-item">
                                    <img src="${imgOptimizada}" alt="${producto.nombre} - Variación ${i+1}" loading="lazy" onerror="this.src='FOTO/foto_04.webp'" data-index="${idx}">
                                    <button class="zoom-btn" data-index="${idx}">
                                        <i class="fas fa-search-plus"></i>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </section>
        `;
    }
    
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
    
    const bannerAdvertencia = `
        <div class="aviso-sticky" style="background: #fff3cd; border-bottom: 1px solid #ffeeba; padding: 12px 0; position: sticky; top: 65px; z-index: 99;">
            <div class="container">
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center;">
                    <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 1.1rem;"></i>
                    <span style="color: #856404; font-size: 0.85rem;">
                        <strong>IMPORTANTE:</strong> Las imágenes son referenciales. La piedra natural presenta variaciones en vetas, tonos y textura. 
                        <a href="#nota-natural" style="color: #856404; text-decoration: underline;">Más información</a>
                    </span>
                </div>
            </div>
        </div>
    `;
    
    const caracteristicasComercialHtml = `
        <section class="caracteristicas-section" style="background: #f8f9fa; padding: 40px 0;">
            <div class="container">
                <div class="section-title">
                    <h2>Características del Material Comercial</h2>
                    <p>Información importante sobre las particularidades de la piedra natural</p>
                </div>
                <div class="caracteristicas-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div class="caracteristica-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <i class="fas fa-border-all" style="font-size: 2rem; color: #39080a; margin-bottom: 12px; display: block;"></i>
                        <h3 style="font-size: 1rem; margin-bottom: 8px;">Esquinas Postilladas</h3>
                        <p style="font-size: 0.85rem; color: #666;">Las piezas pueden presentar esquinas postilladas o desportilladuras leves en los bordes, lo cual es normal en materiales pétreos.</p>
                    </div>
                    <div class="caracteristica-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <i class="fas fa-cut" style="font-size: 2rem; color: #39080a; margin-bottom: 12px; display: block;"></i>
                        <h3 style="font-size: 1rem; margin-bottom: 8px;">Marcas del Disco</h3>
                        <p style="font-size: 0.85rem; color: #666;">Es posible encontrar marcas del disco de corte en la superficie durante el procesamiento del material.</p>
                    </div>
                    <div class="caracteristica-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <i class="fas fa-water" style="font-size: 2rem; color: #39080a; margin-bottom: 12px; display: block;"></i>
                        <h3 style="font-size: 1rem; margin-bottom: 8px;">Cangrejera Superficial</h3>
                        <p style="font-size: 0.85rem; color: #666;">La cara de las baldosas puede presentar cangrejera (pequeñas imperfecciones superficiales) características del material.</p>
                    </div>
                    <div class="caracteristica-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <i class="fas fa-palette" style="font-size: 2rem; color: #39080a; margin-bottom: 12px; display: block;"></i>
                        <h3 style="font-size: 1rem; margin-bottom: 8px;">Rango de Color Variado</h3>
                        <p style="font-size: 0.85rem; color: #666;">El rango de color es variado y puede ser más pronunciado entre diferentes lotes de producción.</p>
                    </div>
                </div>
            </div>
        </section>
    `;
    
    const antesDeComprarHtml = `
        <section class="antes-comprar-section" style="background: #e8f4f8; padding: 40px 0;">
            <div class="container">
                <div class="section-title">
                    <h2>📋 Lo que debes saber antes de comprar</h2>
                    <p>Información clave para tu decisión de compra</p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                    <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 15px; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.3rem;"></i>
                        <span style="font-size: 0.9rem;">Las imágenes son REFERENCIALES, no contractuales</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 15px; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.3rem;"></i>
                        <span style="font-size: 0.9rem;">La piedra natural presenta variabilidad en vetas y tonos</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 15px; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.3rem;"></i>
                        <span style="font-size: 0.9rem;">No se puede seleccionar una veta o tonalidad específica</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 15px; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.3rem;"></i>
                        <span style="font-size: 0.9rem;">Solicita una muestra física antes de tu pedido</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 15px; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.3rem;"></i>
                        <span style="font-size: 0.9rem;">El producto final puede diferir de las muestras mostradas</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; background: white; padding: 15px; border-radius: 10px;">
                        <i class="fas fa-check-circle" style="color: #28a745; font-size: 1.3rem;"></i>
                        <span style="font-size: 0.9rem;">Las variaciones son características de calidad, no defectos</span>
                    </div>
                </div>
            </div>
        </section>
    `;
    
    const especificacionesConTooltips = [
        { titulo: 'Código', valor: producto.codigo || 'NO ESPECIFICADO', tooltip: 'Código interno de identificación del producto' },
        { titulo: 'Unidad de Medida', valor: producto.unidad_medida?.nombre || 'NO ESPECIFICADA', tooltip: 'Unidad en la que se comercializa el producto' },
        { titulo: 'Calidad', valor: producto.calidad?.nombre || 'NO ESPECIFICADA', tooltip: 'Estándar de calidad del producto' },
        { titulo: 'Modelo', valor: producto.modelo || 'NO ESPECIFICADO', tooltip: 'Referencia del modelo' },
        { titulo: 'Familia', valor: producto.familia?.nombre || 'NO ESPECIFICADA', tooltip: 'Familia a la que pertenece el producto' },
        { titulo: 'Acabado', valor: producto.acabado?.nombre || 'NO ESPECIFICADO', tooltip: 'Tipo de acabado superficial (pulido, apomazado, etc.)' },
        { titulo: 'Borde', valor: producto.borde?.nombre || 'NO ESPECIFICADO', tooltip: 'Tipo de borde del material' },
        { titulo: 'Material', valor: producto.material?.nombre || 'NO ESPECIFICADO', tooltip: 'Tipo de material (mármol, granito, etc.)' },
        { titulo: 'Medida', valor: producto.medida || 'NO ESPECIFICADA', tooltip: 'Dimensiones estándar de la pieza' },
        { titulo: 'Espesor', valor: producto.espesor || 'NO ESPECIFICADO', tooltip: 'Grosor del material' }
    ];
    
    const fichaUrl = producto.ficha_tecnica_url ? optimizarGoogleDriveUrl(producto.ficha_tecnica_url) : null;
    const fichaHtml = fichaUrl ? `
        <div class="ficha-section">
            <div class="container text-center">
                <a href="${fichaUrl}" target="_blank" class="btn-ficha"><i class="fas fa-file-pdf"></i> Ver Ficha Técnica</a>
            </div>
        </div>
    ` : '';
    
    const notaInformativaHtml = `
        <section class="nota-section" id="nota-natural">
            <div class="container">
                <div class="nota-card" style="border-left-color: #39080a;">
                    <div class="nota-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="nota-content">
                        <h3>Nota sobre la variabilidad natural de la piedra</h3>
                        <p>Debido a su naturaleza, las piedras naturales como mármoles, travertinos, granitos y otras, poseen grados de variación en tono y color, diferencias en la formación de vetas y distintos niveles de porosidad. Por este motivo, los tonos y características de las muestras exhibidas y/o entregadas, son referenciales y pueden variar.</p>
                        <p style="margin-top: 12px;"><strong>Características del material comercial:</strong> Las piezas pueden presentar esquinas postilladas, marcas del disco de corte, cangrejera superficial en la cara de la baldosa, y rango de color variado (más pronunciado entre lotes). Estas son características normales de los materiales pétreos y no constituyen defectos.</p>
                        <p style="margin-top: 12px;"><strong>IMPORTANTE:</strong> Las imágenes de rangos y variaciones mostradas son EJEMPLOS de la variabilidad natural que PUEDE presentar el producto. NO es posible seleccionar una veta o tonalidad específica al momento de la compra.</p>
                        <p style="margin-top: 12px;">Para mayor certeza, recomendamos solicitar una muestra física antes de realizar su pedido.</p>
                    </div>
                </div>
            </div>
        </section>
    `;
    
    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
        <title>${producto.nombre} | Gallos Mármol</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            img { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-user-drag: none; user-drag: none; pointer-events: auto; }
            body { -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; font-family: 'Poppins', sans-serif; background: #ffffff; overflow-x: hidden; }
            :root {
                --primary: #39080a;
                --primary-dark: #2a0607;
                --primary-light: #5a1a1d;
                --secondary: #d4d4ae;
                --secondary-dark: #c4c49a;  
                --white: #ffffff;
                --gray-50: #fafafa;
                --gray-100: #f5f5f5;
                --gray-200: #eeeeee;
                --gray-300: #e0e0e0;
                --gray-400: #cbd5e1;
                --gray-500: #94a3b8;
                --gray-600: #666666;
                --gray-700: #444444;
                --gray-800: #222222;
                --red-500: #ef4444;
                --red-600: #dc2626;
                --orange-400: #fb923c;
                --secondary-light: #e4e4c8;
            }
            .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            h1, h2, h3, h4 { font-weight: 700; line-height: 1.2; }
            .section-title { text-align: center; margin-bottom: 40px; }
            .section-title h2 { font-size: 1.75rem; color: var(--primary); margin-bottom: 12px; }
            .section-title p { font-size: 0.9rem; color: var(--gray-600); max-width: 600px; margin: 0 auto; }
            header { 
                position: fixed; 
                top: 0; 
                left: 0; 
                right: 0; 
                background: var(--primary); 
                z-index: 1000; 
                padding: 12px 0; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            .navbar { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                width: 100%;
            }
            .logo { 
                display: flex; 
                align-items: center; 
                justify-content: center;
            }
            .logo img { 
                width: 130px; 
                height: auto; 
                pointer-events: none; 
            }        
            .spec-card { position: relative; cursor: help; }
            .spec-card:hover .tooltip-text { visibility: visible; opacity: 1; }
            .tooltip-text { visibility: hidden; width: 200px; background-color: #333; color: #fff; text-align: center; border-radius: 6px; padding: 5px 10px; position: absolute; z-index: 1; bottom: 125%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; font-size: 0.7rem; font-weight: normal; }
            .tooltip-text::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: #333 transparent transparent transparent; }
            .hero { min-height: 100vh; display: flex; align-items: center; background: linear-gradient(rgba(57,8,10,0.85), rgba(57,8,10,0.85)); padding: 100px 0 60px; }
            .hero-content { display: flex; flex-direction: column; gap: 30px; }
            .hero-text { text-align: center; order: 2; }
            .hero h1 { font-size: 1.8rem; color: var(--white); margin-bottom: 16px; }
            .hero h1 span { color: var(--secondary); }
            .hero p { color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-bottom: 24px; }
            .hero-buttons { display: flex; flex-direction: column; gap: 12px; }
            .hero-image { position: relative; order: 1; text-align: center; }
            .hero-image img { width: 80%; max-width: 280px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); cursor: pointer; }
            .hero-image .zoom-btn { position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; z-index: 10; }
            .hero-image .zoom-btn:hover { background: var(--primary); transform: scale(1.1); }
            .btn { padding: 12px 24px; border-radius: 40px; font-weight: 600; font-size: 0.9rem; text-decoration: none; display: inline-block; text-align: center; transition: 0.3s; cursor: pointer; border: none; }
            .btn-secondary { border: 2px solid var(--secondary); color: var(--secondary); background: transparent; }
            .btn-secondary:hover { background: var(--secondary); color: var(--primary); transform: translateY(-2px); }
            section { padding: 60px 0; }
            .specs-section { background: var(--gray-100); }
            .specs-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .spec-card { background: var(--white); padding: 20px; border-radius: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: 0.3s; }
            .spec-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
            .spec-card h3 { font-size: 0.75rem; color: var(--gray-600); margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase; }
            .spec-card p { font-size: 1rem; font-weight: 700; color: var(--primary); }
            .apps-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .app-card { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--white); padding: 24px 12px; border-radius: 16px; text-align: center; transition: 0.3s; }
            .app-card i { font-size: 2rem; color: var(--secondary); margin-bottom: 10px; }
            .app-card h3 { font-size: 0.85rem; font-weight: 500; }
            .gallery-section, .rangos-section { background: var(--gray-100); }
            .gallery-grid, .rangos-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .galeria-item, .rango-item { position: relative; overflow: hidden; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .galeria-item img, .rango-item img { width: 100%; height: 240px; object-fit: cover; transition: 0.5s; display: block; cursor: pointer; }
            .galeria-item:hover img, .rango-item:hover img { transform: scale(1.03); }
            .galeria-item .zoom-btn, .rango-item .zoom-btn { position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.7); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; opacity: 0; z-index: 10; }
            .galeria-item:hover .zoom-btn, .rango-item:hover .zoom-btn { opacity: 1; }
            .trust-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
            .trust-card { background: var(--gray-100); padding: 25px 20px; border-radius: 16px; text-align: center; transition: 0.3s; }
            .trust-card i { font-size: 2rem; color: var(--primary); margin-bottom: 12px; }
            .trust-card h3 { font-size: 1rem; margin-bottom: 8px; color: var(--primary); }
            .trust-card p { font-size: 0.85rem; color: var(--gray-600); line-height: 1.5; }
            .ficha-section { background: var(--gray-100); padding: 40px 0; text-align: center; }
            .btn-ficha { background: var(--primary); color: var(--white); padding: 12px 28px; border-radius: 40px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 0.9rem; transition: 0.3s; }
            .btn-ficha:hover { background: var(--primary-dark); transform: translateY(-2px); }
            .nota-section { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 50px 0; }
            .nota-card { background: var(--white); border-radius: 20px; padding: 30px; display: flex; gap: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border-left: 5px solid var(--primary); }
            .nota-icon { flex-shrink: 0; width: 50px; height: 50px; background: rgba(57,8,10,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .nota-icon i { font-size: 1.5rem; color: var(--primary); }
            .nota-content h3 { font-size: 1.1rem; font-weight: 600; color: var(--primary); margin-bottom: 8px; }
            .nota-content p { font-size: 0.85rem; color: var(--gray-700); line-height: 1.6; }
            footer { background: var(--primary-dark); color: var(--white); padding: 40px 20px 25px; }
            .footer-grid { display: grid; grid-template-columns: 1fr; gap: 30px; text-align: center; }
            .footer-logo img { width: 150px; margin-bottom: 12px; pointer-events: none; }
            .footer-logo p { font-size: 0.75rem; opacity: 0.7; }
            .footer-social h4, .footer-links h4 { font-size: 0.9rem; margin-bottom: 15px; color: var(--secondary); }
            .footer-social a, .footer-links a { display: flex; align-items: center; justify-content: center; gap: 10px; color: rgba(255,255,255,0.7); text-decoration: none; margin-bottom: 10px; transition: 0.3s; font-size: 0.8rem; }
            .footer-social a:hover, .footer-links a:hover { color: var(--secondary); transform: translateX(5px); }
            .footer-bottom { text-align: center; margin-top: 35px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.65rem; opacity: 0.6; }
            .image-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.95); z-index: 20000; justify-content: center; align-items: center; cursor: pointer; }
            .image-modal.active { display: flex !important; }
            .modal-content { position: relative; max-width: 90%; max-height: 90%; display: flex; justify-content: center; align-items: center; }
            .modal-content img { max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); pointer-events: none; }
            .modal-close { position: absolute; top: -50px; right: -50px; width: 45px; height: 45px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: var(--primary); cursor: pointer; transition: all 0.3s ease; z-index: 20001; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
            .modal-close:hover { transform: scale(1.1); background: var(--secondary); color: var(--primary-dark); }
            .modal-prev, .modal-next { position: absolute; top: 50%; transform: translateY(-50%); width: 55px; height: 55px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; cursor: pointer; transition: all 0.3s ease; z-index: 20001; backdrop-filter: blur(5px); }
            .modal-prev:hover, .modal-next:hover { background: var(--primary); color: var(--secondary); transform: translateY(-50%) scale(1.1); }
            .modal-prev { left: 20px; }
            .modal-next { right: 20px; }
            .modal-counter { position: absolute; bottom: -45px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 18px; border-radius: 30px; font-size: 0.9rem; font-family: monospace; z-index: 20001; backdrop-filter: blur(5px); white-space: nowrap; }
            @media (min-width: 768px) {
                .container { padding: 0 30px; }
                .hero-content { flex-direction: row; align-items: center; gap: 50px; }
                .hero-text { text-align: left; flex: 1; order: 1; }
                .hero h1 { font-size: 2.5rem; }
                .hero-buttons { flex-direction: row; gap: 15px; }
                .hero-image { flex: 1; order: 2; }
                .hero-image img { width: 100%; max-width: 450px; }
                .specs-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .apps-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .gallery-grid, .rangos-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .footer-grid { grid-template-columns: repeat(3, 1fr); text-align: left; }
                .footer-social a, .footer-links a { justify-content: flex-start; }
            }
            @media (min-width: 1024px) {
                .hero h1 { font-size: 3rem; }
                .hero-image img { max-width: 500px; }
                .specs-grid { grid-template-columns: repeat(3, 1fr); gap: 25px; }
                .apps-grid { grid-template-columns: repeat(4, 1fr); gap: 25px; }
                .gallery-grid, .rangos-grid { grid-template-columns: repeat(3, 1fr); gap: 25px; }
                .section-title h2 { font-size: 2.2rem; }
                section { padding: 80px 0; }
            }
            @media (max-width: 768px) {
                .modal-prev, .modal-next { width: 40px; height: 40px; font-size: 24px; }
                .modal-prev { left: 10px; }
                .modal-next { right: 10px; }
                .modal-close { top: -45px; right: -5px; width: 38px; height: 38px; font-size: 24px; }
                .modal-counter { bottom: -40px; font-size: 0.75rem; padding: 5px 12px; }
                .galeria-item .zoom-btn, .rango-item .zoom-btn, .hero-image .zoom-btn { opacity: 1; width: 35px; height: 35px; bottom: 10px; right: 10px; }
                .hero h1 { font-size: 1.5rem; }
            }
            .text-center { text-align: center; }
            .hidden { display: none; }
        </style>
    </head>
    <body>
        <div id="imageModal" class="image-modal">
            <div class="modal-content">
                <div class="modal-close">✕</div>
                <div class="modal-prev">❮</div>
                <div class="modal-next">❯</div>
                <img id="modalImage" src="" alt="Imagen ampliada">
                <div id="modalCounter" class="modal-counter">1 / 1</div>
            </div>
        </div>
        
        <header>
            <div class="container navbar">
                <div class="logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"></div>
            </div>
        </header>
        
        ${bannerAdvertencia}
        
        <section class="hero">
            <div class="container hero-content">
                <div class="hero-text">
                    <h1>${primeraPalabra} <span>${restoPalabras}</span></h1>
                    <p>${producto.descripcion_corta || 'Sobriedad, resistencia y elegancia atemporal.'}</p>
                    <div class="hero-buttons">
                        <a href="#galeria" class="btn btn-secondary">Ver Inspiración</a>
                    </div>
                </div>
                <div class="hero-image">
                    <img src="${imagenPrincipal}" alt="${producto.nombre}" loading="eager" onerror="this.src='FOTO/foto_04.webp'" data-index="0">
                    <button class="zoom-btn" data-index="0"><i class="fas fa-search-plus"></i></button>
                </div>
            </div>
        </section>
        
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
        
        ${tieneAplicaciones ? aplicacionesHtml : ''}
        
        ${tieneGaleria ? `
        <section class="gallery-section" id="galeria">
            <div class="container">
                <div class="section-title">
                    <h2>Inspiración y Diseño</h2>
                    <p>Visualiza cómo ${primeraPalabra} transforma cada ambiente</p>
                </div>
                <div class="gallery-grid">
                    ${galeriaHtml}
                </div>
            </div>
        </section>
        ` : ''}
        
        ${tieneRangos ? rangosHtml : ''}
        
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
        
        ${fichaHtml}
        
        ${notaInformativaHtml}
        
        <footer>
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"><p>Desde 1870, transformamos espacios con mármol de alta calidad.</p></div>
                    <div class="footer-social"><h4>Redes Sociales</h4><a href="#"><i class="fab fa-facebook-f"></i> Facebook</a><a href="#"><i class="fab fa-instagram"></i> Instagram</a><a href="#"><i class="fab fa-tiktok"></i> TikTok</a></div>
                    <div class="footer-links"><h4>Contacto</h4><a href="https://gallosmarmol.com.pe"><i class="fas fa-globe"></i> gallosmarmol.com.pe</a><a href="mailto:info@gallosmarmol.com.pe"><i class="fas fa-envelope"></i> info@gallosmarmol.com.pe</a></div>
                </div>
                <div class="footer-bottom">© 2026 Gallos Mármol — Todos los derechos reservados.</div>
            </div>
        </footer>
        
        <script>
            (function() {
                const imagenes = [];
                document.querySelectorAll('img[data-index]').forEach(img => { const idx = parseInt(img.dataset.index); imagenes[idx] = img.src; });
                const imagenesLimpias = imagenes.filter(img => img);
                let indiceActual = 0;
                const modal = document.getElementById('imageModal');
                const imgModal = document.getElementById('modalImage');
                const contador = document.getElementById('modalCounter');
                const closeBtn = document.querySelector('.modal-close');
                const prevBtn = document.querySelector('.modal-prev');
                const nextBtn = document.querySelector('.modal-next');
                function abrirModal(indice) { if (!imagenesLimpias.length) return; indiceActual = Math.min(Math.max(0, indice), imagenesLimpias.length - 1); imgModal.src = imagenesLimpias[indiceActual]; contador.innerText = (indiceActual + 1) + ' / ' + imagenesLimpias.length; modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
                function cerrarModal() { modal.classList.remove('active'); document.body.style.overflow = ''; }
                function siguiente() { indiceActual = (indiceActual + 1) % imagenesLimpias.length; imgModal.src = imagenesLimpias[indiceActual]; contador.innerText = (indiceActual + 1) + ' / ' + imagenesLimpias.length; }
                function anterior() { indiceActual = (indiceActual - 1 + imagenesLimpias.length) % imagenesLimpias.length; imgModal.src = imagenesLimpias[indiceActual]; contador.innerText = (indiceActual + 1) + ' / ' + imagenesLimpias.length; }
                if (closeBtn) closeBtn.onclick = cerrarModal;
                if (prevBtn) prevBtn.onclick = anterior;
                if (nextBtn) nextBtn.onclick = siguiente;
                modal.onclick = function(e) { if (e.target === modal) cerrarModal(); };
                document.onkeydown = function(e) { if (!modal.classList.contains('active')) return; if (e.key === 'Escape') cerrarModal(); if (e.key === 'ArrowLeft') anterior(); if (e.key === 'ArrowRight') siguiente(); };
                document.querySelectorAll('.zoom-btn').forEach(btn => { btn.onclick = function(e) { e.stopPropagation(); const idx = parseInt(this.dataset.index); if (!isNaN(idx)) abrirModal(idx); }; });
                document.querySelectorAll('.hero-image img, .galeria-item img, .rango-item img').forEach(img => { if (img.hasAttribute('data-index')) { img.onclick = function(e) { e.stopPropagation(); const idx = parseInt(this.dataset.index); if (!isNaN(idx)) abrirModal(idx); }; } });
            })();
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
            document.addEventListener('keydown', function(e) { if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) { e.preventDefault(); return false; } if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return false; } if (e.key === 'F12') { e.preventDefault(); return false; } });
        </script>
    </body>
    </html>`;
    
    document.open();
    document.write(html);
    document.close();
    console.log('✅ Landing page renderizada correctamente');
}

function renderizarPaginaOutlet(productos) {
    console.log('Renderizando página de Outlet con todas las funcionalidades');
    
    // ============================================
    // CONFIGURACIÓN Y CONSTANTES
    // ============================================
    const CONFIG = {
        COTIZACION_STORAGE_KEY: 'cotizacion_outlet_seleccionados',
        DEFAULT_IMAGE: 'FOTO/foto_04.webp',
        QR_FPS: 10,
        QR_BOX_SIZE: 250,
        FILTROS_DEBOUNCE_DELAY: 400,
        IMAGE_LAZY_LOAD_THRESHOLD: 0.1,
        BARRA_COTIZACION_BOTTOM_MOBILE: '70px',
        BARRA_COTIZACION_BOTTOM_DESKTOP: '0px'
    };
    
    // ============================================
    // VALIDACIÓN DE DATOS DE ENTRADA
    // ============================================
    const productosValidos = (productos && Array.isArray(productos)) ? productos : [];
    window.outletProductosCache = productosValidos;
    
    // ============================================
    // INICIALIZACIÓN DE VARIABLES GLOBALES
    // ============================================
    let asesoresPrecargados = null;
    let cotizacionSeleccionados = [];
    let html5QrCode = null;
    let escaneoActivo = false;
    let observerImagenes = null;
    
    // Variables para caché del formulario
    window.clienteNombreCache = '';
    window.clienteEmailCache = '';
    window.clienteTelefonoCache = '';
    window.clienteEmpresaCache = '';
    window.ubicacionCache = '';
    window.observacionesCache = '';
    
    // ============================================
    // FUNCIÓN PARA OPTIMIZAR URL DE GOOGLE DRIVE
    // ============================================
    function optimizarGoogleDriveUrl(url, size = 'w400-h400') {
        if (!url || url === '') return CONFIG.DEFAULT_IMAGE;
        
        // Si ya es una URL optimizada de Google Drive
        if (url.includes('lh3.googleusercontent.com')) return url;
        
        // Extraer ID de Google Drive
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9_-]+)/,
            /id=([a-zA-Z0-9_-]+)/,
            /\/d\/([a-zA-Z0-9_-]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return `https://lh3.googleusercontent.com/d/${match[1]}=${size}`;
            }
        }
        
        return url;
    }
    
    // ============================================
    // ESCAPE HTML MEJORADO
    // ============================================
    function escapeHtml(text) {
        if (!text) return '';
        const mapa = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return String(text).replace(/[&<>"'`=\/]/g, function(caracter) {
            return mapa[caracter];
        });
    }
    
    // ============================================
    // PRECARGA DE ASESORES
    // ============================================
    async function precargarAsesoresOutlet() {
        if (asesoresPrecargados) return asesoresPrecargados;
        
        try {
            console.log('🔄 Precargando asesores...');
            const { data: vendedores } = await window.supabaseClient
                .from('vendedores')
                .select('id, nombre, telefono, email, leads_asignados_hoy, max_leads_diarios, activo')
                .eq('activo', true)
                .eq('atiende_outlet', true)
                .order('orden');
            asesoresPrecargados = vendedores || [];
            console.log('Asesores precargados:', asesoresPrecargados.length);
            return asesoresPrecargados;
        } catch (error) {
            console.error('Error precargando asesores:', error);
            asesoresPrecargados = [];
            return [];
        }
    }
    
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
    
    const familiasOptions = Array.from(familiasUnicas.entries())
        .filter(([id]) => id && id !== '')
        .map(([id, nombre]) => `<option value="${id}">${escapeHtml(nombre)}</option>`)
        .join('');
    
    const acabadosOptions = Array.from(acabadosUnicos.entries())
        .filter(([id]) => id && id !== '')
        .map(([id, nombre]) => `<option value="${id}">${escapeHtml(nombre)}</option>`)
        .join('');
    
    const materialesOptions = Array.from(materialesUnicos.entries())
        .filter(([id]) => id && id !== '')
        .map(([id, nombre]) => `<option value="${id}">${escapeHtml(nombre)}</option>`)
        .join('');
    
    // ============================================
    // CARGA DE IMÁGENES CON LAZY LOADING
    // ============================================
    function cargarImagenConLazy(imgElement, url) {
        if (!imgElement) return;
        
        // Placeholder mientras carga
        imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E';
        imgElement.style.background = '#f0f0f0';
        
        // Cargar imagen real
        const imagen = new Image();
        imagen.onload = () => {
            imgElement.src = url;
            imgElement.style.background = 'transparent';
        };
        imagen.onerror = () => {
            imgElement.src = CONFIG.DEFAULT_IMAGE;
            imgElement.style.background = 'transparent';
        };
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
            }, {
                rootMargin: '50px',
                threshold: CONFIG.IMAGE_LAZY_LOAD_THRESHOLD
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                observerImagenes.observe(img);
            });
        } else {
            // Fallback para navegadores antiguos
            document.querySelectorAll('img[data-src]').forEach(img => {
                cargarImagenConLazy(img, img.getAttribute('data-src'));
            });
        }
    }
    
    // ============================================
    // GENERAR CARDS CON LAZY LOADING
    // ============================================
    window.generarCardsOutlet = function(productosLista) {
        if (!productosLista || productosLista.length === 0) {
            return '<div class="no-results"><i class="fas fa-box-open"></i><p>No hay productos que coincidan con los filtros</p><button onclick="limpiarFiltrosOutlet()" class="btn-primary" style="margin-top: 16px;">Limpiar filtros</button></div>';
        }
        
        return productosLista.map(p => {
            const estaSeleccionado = cotizacionSeleccionados && cotizacionSeleccionados.some(item => item && item.id === p.id);
            const imagenUrl = optimizarGoogleDriveUrl(p.imagen_principal, 'w300-h300');
            
            // Escapar correctamente todos los datos
            const nombreEscapado = escapeHtml(p.nombre || 'Producto');
            const codigoEscapado = escapeHtml(p.codigo || '');
            const imagenEscapada = escapeHtml(p.imagen_principal || '');
            const slugEscapado = escapeHtml(p.slug || p.id);
            const medidaEscapada = escapeHtml(p.medida || '');
            const espesorEscapado = escapeHtml(p.espesor || '');
            const productId = p.id;
            
            return `
                <div class="producto-card" data-id="${productId}">
                    <div class="card-image">
                        <img data-src="${imagenUrl}" 
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3C/svg%3E"
                            alt="${nombreEscapado}" 
                            loading="lazy"
                            class="lazy-image">
                    </div>
                    <div class="card-info">
                        <h3>${nombreEscapado}</h3>
                        <p class="codigo">${codigoEscapado || 'Sin código'}</p>
                        <div class="specs-badges">
                            ${p.medida ? `<span class="spec-badge"><i class="fas fa-ruler-combined"></i> ${escapeHtml(p.medida)}</span>` : ''}
                            ${p.espesor ? `<span class="spec-badge"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(p.espesor)}</span>` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                            <a href="/?producto=${slugEscapado}" class="btn-detalle-enhanced" style="flex: 1;">
                                <span>Ver Detalle</span>
                            </a>
                            <button onclick="window.toggleSeleccionCotizacionWrapper('${productId}', '${nombreEscapado.replace(/'/g, "\\'")}', '${codigoEscapado.replace(/'/g, "\\'")}', '${imagenEscapada.replace(/'/g, "\\'")}', '${slugEscapado.replace(/'/g, "\\'")}', '${medidaEscapada.replace(/'/g, "\\'")}', '${espesorEscapado.replace(/'/g, "\\'")}')" 
                                    class="btn-cotizar" 
                                    data-id="${productId}"
                                    style="background: ${estaSeleccionado ? '#10b981' : '#39080a'}; color: white; border: none; padding: 8px 12px; border-radius: 40px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; justify-content: center; font-weight: 600">
                                <i class="fas ${estaSeleccionado ? 'fa-check-circle' : 'fa-plus-circle'}"></i>
                                ${estaSeleccionado ? 'Agregado' : 'Cotizar'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    // Función wrapper para manejar el clic del botón cotizar de manera segura
    window.toggleSeleccionCotizacionWrapper = function(id, nombre, codigo, imagen, slug, medida, espesor) {
        console.log('🖱️ Click en cotizar:', { id, nombre, codigo, medida, espesor });
        
        const producto = {
            id: id,
            nombre: nombre,
            codigo: codigo,
            imagen_principal: imagen,
            slug: slug,
            medida: medida || null,
            espesor: espesor || null
        };
        
        window.toggleSeleccionCotizacion(producto);
    };

    // ============================================
    // FUNCIONES DE FILTROS Y CARDS
    // ============================================
    window.aplicarFiltrosOutlet = function() {
        const busqueda = document.getElementById('searchOutlet')?.value.toLowerCase().trim() || '';
        const familiaId = document.getElementById('filtroFamilia')?.value;
        const acabadoId = document.getElementById('filtroAcabado')?.value;
        const materialId = document.getElementById('filtroMaterial')?.value;
        
        let productosData = window.outletProductosCache.map(p => ({
            ...p,
            imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE),
            slug: p.slug || p.id
        }));
        
        let filtrados = [...productosData];
        if (familiaId && familiaId !== '') filtrados = filtrados.filter(p => p.familia_id === familiaId);
        if (acabadoId && acabadoId !== '') filtrados = filtrados.filter(p => p.acabado_id === acabadoId);
        if (materialId && materialId !== '') filtrados = filtrados.filter(p => p.material_id === materialId);
        if (busqueda) filtrados = filtrados.filter(p => (p.nombre || '').toLowerCase().includes(busqueda) || (p.codigo || '').toLowerCase().includes(busqueda) || (p.slug || '').toLowerCase().includes(busqueda));
        
        const grid = document.getElementById('productosGrid');
        const contador = document.getElementById('contadorProductos');
        if (grid) {
            grid.innerHTML = window.generarCardsOutlet(filtrados);
            inicializarLazyLoading();
        }
        if (contador) contador.textContent = filtrados.length;
        
        let activos = 0;
        if (familiaId && familiaId !== '') activos++;
        if (acabadoId && acabadoId !== '') activos++;
        if (materialId && materialId !== '') activos++;
        if (busqueda) activos++;
        const badge = document.getElementById('filtrosBadge');
        if (badge) { 
            if (activos > 0) { 
                badge.textContent = activos; 
                badge.style.display = 'inline-block'; 
            } else { 
                badge.style.display = 'none'; 
            } 
        }
        if (window.innerWidth <= 768) { 
            const modal = document.getElementById('filtrosModal'); 
            if (modal) { 
                modal.classList.remove('show'); 
                document.body.style.overflow = ''; 
            } 
        }
        
        if (typeof window.actualizarBotonLimpiarTodo === 'function') {
            window.actualizarBotonLimpiarTodo();
        }
    };
    
    window.limpiarFiltrosOutlet = function() {
        const searchInput = document.getElementById('searchOutlet');
        const familiaSelect = document.getElementById('filtroFamilia');
        const acabadoSelect = document.getElementById('filtroAcabado');
        const materialSelect = document.getElementById('filtroMaterial');
        
        if (searchInput) searchInput.value = '';
        if (familiaSelect) familiaSelect.value = '';
        if (acabadoSelect) acabadoSelect.value = '';
        if (materialSelect) materialSelect.value = '';
        
        const productosData = window.outletProductosCache.map(p => ({ 
            ...p, 
            imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE), 
            slug: p.slug || p.id 
        }));
        
        const grid = document.getElementById('productosGrid');
        const contador = document.getElementById('contadorProductos');
        if (grid) {
            grid.innerHTML = window.generarCardsOutlet(productosData);
            inicializarLazyLoading();
        }
        if (contador) contador.textContent = productosData.length;
        
        const badge = document.getElementById('filtrosBadge');
        if (badge) badge.style.display = 'none';
        
        if (window.innerWidth <= 768) { 
            const modal = document.getElementById('filtrosModal'); 
            if (modal) { 
                modal.classList.remove('show'); 
                document.body.style.overflow = ''; 
            } 
        }
        
        if (typeof window.actualizarBotonLimpiarTodo === 'function') {
            window.actualizarBotonLimpiarTodo();
        }
    };
    
    // ============================================
    // FUNCIONES DE MODALES DE FILTROS
    // ============================================
    window.openFiltrosModal = function() { 
        const modal = document.getElementById('filtrosModal'); 
        if (modal) { 
            modal.classList.add('show'); 
            document.body.style.overflow = 'hidden'; 
        } 
    };
    
    window.closeFiltrosModal = function() { 
        const modal = document.getElementById('filtrosModal'); 
        if (modal) { 
            modal.classList.remove('show'); 
            document.body.style.overflow = ''; 
        } 
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
        
        if (typeof window.aplicarFiltrosOutlet === 'function') {
            window.aplicarFiltrosOutlet();
        }
        
        if (window.innerWidth <= 768) {
            const modal = document.getElementById('filtrosModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    };
    
    window.limpiarFiltrosDesdeModal = function() {
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        
        if (familiaModal) familiaModal.value = '';
        if (acabadoModal) acabadoModal.value = '';
        if (materialModal) materialModal.value = '';
        
        if (typeof window.limpiarFiltrosOutlet === 'function') {
            window.limpiarFiltrosOutlet();
        }
        
        if (window.innerWidth <= 768) {
            const modal = document.getElementById('filtrosModal');
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    };
    
    window.scrollToTop = function() { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };
    
    // ============================================
    // FUNCIONES DE MODALES PERSONALIZADOS
    // ============================================
    function mostrarModal(titulo, mensaje, tipo = 'info', opciones = {}) {
        return new Promise((resolve) => {
            let modal = document.getElementById('modalPersonalizado');
            
            if (!modal) {
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
                </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                modal = document.getElementById('modalPersonalizado');
            }
            
            const icon = document.getElementById('modalIcon');
            const titleEl = document.getElementById('modalTitle');
            const bodyEl = document.getElementById('modalBody');
            const footer = document.getElementById('modalFooter');
            
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
                    colorIcono = '#39080a';
                    break;
                default:
                    icono = 'fas fa-info-circle';
                    colorIcono = '#3b82f6';
            }
            
            icon.className = icono;
            icon.style.color = colorIcono;
            titleEl.textContent = titulo;
            bodyEl.innerHTML = mensaje;
            
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
    
    // ============================================
    // FUNCIONES DE COTIZACIÓN
    // ============================================
    function ejecutarLimpieza() {
        cotizacionSeleccionados = [];
        localStorage.removeItem(CONFIG.COTIZACION_STORAGE_KEY);
        actualizarBarraFlotante();
        
        document.querySelectorAll('.btn-cotizar').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
            btn.style.background = '#39080a';
            btn.style.color = 'white';
        });
        
        mostrarModal('✅ Selección limpiada', 'Todos los productos han sido removidos de tu cotización.', 'success', { timer: 2000, showConfirmButton: false });
    }
    
    window.limpiarCotizacion = function() {
        mostrarModal(
            '¿Limpiar selección?',
            '<p>Se eliminarán <strong>todos los productos</strong> de tu cotización.</p><p class="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>',
            'question',
            {
                showCancelButton: true,
                confirmButtonText: 'Sí, limpiar',
                cancelButtonText: 'Cancelar'
            }
        ).then((result) => {
            if (result.isConfirmed) {
                ejecutarLimpieza();
            }
        });
    };
    
    function actualizarTodosLosBotonesCotizar() {
        const botones = document.querySelectorAll('.btn-cotizar');
        botones.forEach(btn => {
            const productoId = btn.getAttribute('data-id');
            const estaSeleccionado = cotizacionSeleccionados.some(item => item.id === productoId);
            
            if (estaSeleccionado) {
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado';
                btn.style.background = '#10b981';
                btn.style.color = 'white';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.style.background = '#39080a';
                btn.style.color = 'white';
            }
        });
    }
    
    function cargarSeleccionCotizacion() {
        const guardado = localStorage.getItem(CONFIG.COTIZACION_STORAGE_KEY);
        if (guardado) {
            try {
                cotizacionSeleccionados = JSON.parse(guardado);
                console.log('📦 Cotización cargada desde localStorage:', cotizacionSeleccionados.length, 'productos');
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

    function actualizarBarraFlotante() {
        let barra = document.getElementById('barra-cotizacion');
        const total = cotizacionSeleccionados.length;
        
        if (!barra && total > 0) {
            // Crear la barra por primera vez
            barra = document.createElement('div');
            barra.id = 'barra-cotizacion';
            barra.className = 'barra-cotizacion mini';
            
            barra.innerHTML = `
                <!-- Modo Mini (Colapsado) -->
                <div class="barra-cotizacion-mini">
                    <div class="barra-info-mini">
                        <div class="barra-icono">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="barra-texto-mini">
                            <span id="contador-cotizacion-mini">${total}</span> producto(s)
                        </div>
                    </div>
                    <div class="barra-acciones-mini">
                        <button class="btn-cotizar-mini" id="btn-ver-cotizacion-mini">
                            <i class="fas fa-file-invoice"></i> Cotizar
                        </button>
                        <button class="btn-expandir" id="btn-expandir-barra">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Modo Expandido (Detalles) - Oculto inicialmente -->
                <div class="barra-cotizacion-expanded" style="display: none;">
                    <div class="barra-productos-preview" id="preview-productos">
                        ${generarPreviewProductos()}
                    </div>
                    <div class="barra-acciones-expanded">
                        <button class="btn-limpiar" id="btn-limpiar-barra">
                            <i class="fas fa-trash-alt"></i> Limpiar todo
                        </button>
                        <button class="btn-ver-cotizacion" id="btn-ver-cotizacion-expanded">
                            <i class="fas fa-file-invoice"></i> Ver cotización completa
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(barra);
            configurarEventosBarra(barra);
            
            // Ajustar padding del body
            const alturaBarra = barra.offsetHeight;
            document.body.style.paddingBottom = `${alturaBarra + 10}px`;
            
        } else if (barra && total === 0) {
            // Eliminar barra si no hay productos
            barra.remove();
            document.body.style.paddingBottom = '';
            
        } else if (barra && total > 0) {
            // Actualizar solo los elementos que existen
            
            // Verificar y actualizar badge (modo mini)
            const badge = document.getElementById('badge-cantidad');
            if (badge) {
                badge.textContent = total;
            }
            
            // Verificar y actualizar contador mini
            const contadorMini = document.getElementById('contador-cotizacion-mini');
            if (contadorMini) {
                contadorMini.textContent = total;
            }
            
            // Verificar si el modo expandido está visible
            const expandedSection = barra.querySelector('.barra-cotizacion-expanded');
            if (expandedSection && expandedSection.style.display !== 'none') {
                // Si está expandido, actualizar el preview
                const previewContainer = document.getElementById('preview-productos');
                if (previewContainer) {
                    previewContainer.innerHTML = generarPreviewProductos();
                }
            }
        }
    }

    function generarPreviewProductos() {
        // Verificar que cotizacionSeleccionados existe y tiene elementos
        if (!cotizacionSeleccionados || cotizacionSeleccionados.length === 0) {
            return '<div class="preview-item" style="justify-content: center; color: #999;">No hay productos seleccionados</div>';
        }
        
        let html = '';
        
        // Mostrar hasta 3 productos
        cotizacionSeleccionados.slice(0, 3).forEach(p => {
            html += `
                <div class="preview-item">
                    <div class="preview-info">
                        <span class="preview-nombre">${escapeHtml(p.nombre || 'Producto')}</span>
                        <div class="preview-detalles" style="display: flex; gap: 8px; margin-top: 2px;">
                            ${p.medida ? `<span style="font-size: 0.6rem; opacity: 0.7;"><i class="fas fa-ruler-combined"></i> ${escapeHtml(p.medida)}</span>` : ''}
                            ${p.espesor ? `<span style="font-size: 0.6rem; opacity: 0.7;"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(p.espesor)}</span>` : ''}
                        </div>
                    </div>
                    <button class="preview-eliminar" onclick="window.eliminarProductoCotizacion('${p.id}', '${escapeHtml(p.nombre)}')">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            `;
        });
        
        // Mostrar indicador de más productos
        if (cotizacionSeleccionados.length > 3) {
            html += `
                <div class="preview-item" style="justify-content: center; color: var(--secondary); font-size: 0.65rem;">
                    <i class="fas fa-ellipsis-h"></i> +${cotizacionSeleccionados.length - 3} producto(s) más
                </div>
            `;
        }
        
        return html;
    }

    function configurarEventosBarra(barra) {
        // Botones mini
        const btnCotizarMini = document.getElementById('btn-ver-cotizacion-mini');
        const btnExpandir = document.getElementById('btn-expandir-barra');
        const expandedSection = barra.querySelector('.barra-cotizacion-expanded');
        const miniSection = barra.querySelector('.barra-cotizacion-mini');
        
        if (btnCotizarMini) {
            btnCotizarMini.onclick = () => window.abrirModalCotizacion();
        }
        
        if (btnExpandir) {
            btnExpandir.onclick = () => {
                if (expandedSection.style.display === 'none') {
                    expandedSection.style.display = 'flex';
                    miniSection.style.display = 'none';
                    barra.classList.add('expanded');
                    barra.classList.remove('mini');
                    btnExpandir.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    
                    // Ajustar padding
                    const nuevaAltura = barra.offsetHeight;
                    document.body.style.paddingBottom = `${nuevaAltura + 10}px`;
                } else {
                    expandedSection.style.display = 'none';
                    miniSection.style.display = 'flex';
                    barra.classList.remove('expanded');
                    barra.classList.add('mini');
                    btnExpandir.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    
                    // Ajustar padding
                    const nuevaAltura = barra.offsetHeight;
                    document.body.style.paddingBottom = `${nuevaAltura + 10}px`;
                }
            };
        }
        
        // Botones expandidos
        const btnLimpiar = document.getElementById('btn-limpiar-barra');
        const btnVerCotizacion = document.getElementById('btn-ver-cotizacion-expanded');
        
        if (btnLimpiar) {
            btnLimpiar.onclick = () => window.limpiarCotizacion();
        }
        
        if (btnVerCotizacion) {
            btnVerCotizacion.onclick = () => window.abrirModalCotizacion();
        }
    }

    // Detectar cambios de orientación para ajustar padding
    window.addEventListener('resize', () => {
        const barra = document.getElementById('barra-cotizacion');
        if (barra) {
            const altura = barra.offsetHeight;
            document.body.style.paddingBottom = `${altura + 10}px`;
        }
    });    

    function actualizarBotonCard(productoId, estabaSeleccionado) {
        const btn = document.querySelector(`.btn-cotizar[data-id="${productoId}"]`);
        if (btn) {
            if (!estabaSeleccionado) {
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado';
                btn.style.background = '#10b981';
                btn.style.color = 'white';
            } else {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.style.background = '#39080a';
                btn.style.color = 'white';
            }
        }
    }
    
    function mostrarToast(mensaje) {
        const toast = document.createElement('div');
        toast.className = 'toast-notificacion';
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    function toggleSeleccionCotizacion(producto) {
        if (!producto || !producto.id) {
            console.error('Producto inválido:', producto);
            return;
        }
        
        const existe = cotizacionSeleccionados.find(p => p.id === producto.id);
        
        // Buscar el producto completo en el cache para obtener medida y espesor
        const productoCompleto = window.outletProductosCache.find(p => p.id === producto.id);
        
        if (existe) {
            cotizacionSeleccionados = cotizacionSeleccionados.filter(p => p.id !== existe.id);
            if (typeof mostrarToast === 'function') {
                mostrarToast(`"${producto.nombre}" removido`);
            }
        } else {
            cotizacionSeleccionados.push({
                id: producto.id,
                nombre: producto.nombre || 'Producto',
                codigo: producto.codigo || '',
                imagen: producto.imagen_principal || '',
                slug: producto.slug || producto.id,
                medida: productoCompleto?.medida || producto.medida || null,
                espesor: productoCompleto?.espesor || producto.espesor || null
            });
            
            if (typeof mostrarToast === 'function') {
                mostrarToast(`"${producto.nombre}" agregado a cotización`);
            }
            
            // Animar badge si existe
            const badge = document.getElementById('badge-cantidad');
            if (badge) {
                badge.classList.add('animado');
                setTimeout(() => badge.classList.remove('animado'), 300);
            }
        }
        
        // Guardar en localStorage
        localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(cotizacionSeleccionados));
        
        // Actualizar barra (siempre verificar que existe antes de actualizar)
        if (typeof actualizarBarraFlotante === 'function') {
            actualizarBarraFlotante();
        }
        
        // Actualizar botón de la card
        actualizarBotonCard(producto.id, existe);
    }
    
    window.toggleSeleccionCotizacion = toggleSeleccionCotizacion;
    window.actualizarBarraFlotante = actualizarBarraFlotante;
    
    // ============================================
    // FUNCIONES DE ESCANEO QR CON CÁMARA TRASERA
    // ============================================
    function detenerEscaneoQR() {
        console.log('🛑 Deteniendo escáner QR...');
        if (html5QrCode && escaneoActivo) {
            html5QrCode.stop().then(() => {
                console.log('✅ Escáner QR detenido correctamente');
                escaneoActivo = false;
                html5QrCode = null;
            }).catch(err => {
                console.warn('Error al detener escáner:', err);
                html5QrCode = null;
                escaneoActivo = false;
            });
        }
    }
    
    function cerrarModalQR() {
        console.log('🔒 Cerrando modal QR...');
        detenerEscaneoQR();
        const modalQR = document.getElementById('modalQR');
        if (modalQR) {
            modalQR.style.display = 'none';
            // Limpiar el contenido del reader para liberar la cámara
            const readerElement = document.getElementById('qr-reader');
            if (readerElement) {
                readerElement.innerHTML = '';
            }
        }
    }
    
    async function iniciarEscaneoQR() {
        console.log('🔍 Iniciando escaneo QR...');
        
        const modalQR = document.getElementById('modalQR');
        const readerElement = document.getElementById('qr-reader');
        
        if (!modalQR || !readerElement) {
            console.error('❌ Modal QR no encontrado');
            return;
        }
        
        detenerEscaneoQR();
        readerElement.innerHTML = '';
        modalQR.style.display = 'flex';
        
        if (typeof Html5Qrcode === 'undefined') {
            modalQR.style.display = 'none';
            mostrarModal('Error', 'La biblioteca de escaneo QR no está cargada', 'error');
            return;
        }
        
        try {
            html5QrCode = new Html5Qrcode("qr-reader");
            
            const config = {
                fps: CONFIG.QR_FPS,
                qrbox: { width: CONFIG.QR_BOX_SIZE, height: CONFIG.QR_BOX_SIZE },
                aspectRatio: 1.0
            };
            
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    console.log('✅ QR escaneado:', decodedText);
                    detenerEscaneoQR();
                    if (modalQR) modalQR.style.display = 'none';
                    
                    const searchInput = document.getElementById('searchOutlet');
                    if (searchInput) {
                        // Establecer el valor
                        searchInput.value = decodedText;
                        
                        // 👇 IMPORTANTE: Mostrar el botón de limpiar
                        const btnClear = document.getElementById('btnLimpiarBusqueda');
                        if (btnClear) {
                            btnClear.style.display = 'flex';
                        }
                        
                        // Aplicar filtros
                        setTimeout(() => {
                            if (typeof window.aplicarFiltrosOutlet === 'function') {
                                window.aplicarFiltrosOutlet();
                            }
                        }, 100);
                    }
                    
                    mostrarModal('✅ Código encontrado', `Se encontró: ${decodedText}`, 'success', { timer: 2000 });
                },
                (errorMessage) => {}
            );
            
            escaneoActivo = true;
            console.log('✅ Escáner QR iniciado correctamente');
            
        } catch (err) {
            console.error('❌ Error al iniciar escáner:', err);
            if (modalQR) modalQR.style.display = 'none';
        mostrarModal('Error', 'No se pudo acceder a la cámara', 'error');
    }
    }
    
    // ============================================
    // FUNCIÓN DE ENVÍO DE COTIZACIÓN COMPLETA
    // ============================================
    async function enviarCotizacion(datosCliente, asesor) {
        console.log('🚀 INICIO de enviarCotizacion');
        
        if (!asesor || !asesor.id) {
            console.error('❌ Error: asesor inválido');
            mostrarModal('Error', 'No se pudo identificar al asesor', 'error');
            return;
        }
        
        mostrarModal('Procesando', 'Guardando cotización...', 'info', { showConfirmButton: false });
        
        try {
            const numero = `COT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
            const fechaActual = new Date().toISOString();
            
            const cotizacion = {
                numero: numero,
                cliente_nombre: datosCliente.nombre,
                cliente_email: datosCliente.email,
                cliente_telefono: datosCliente.telefono,
                cliente_empresa: datosCliente.empresa || null,
                tipo_cliente: 'NUEVO',
                asesor_asignado_id: asesor.id,
                observaciones: datosCliente.observaciones || null,
                ubicacion_proyecto: datosCliente.ubicacionProyecto || null,
                estado: 'PENDIENTE',
                creado_el: fechaActual
            };
            
            const { data: nuevaCotizacion, error: cotizacionError } = await window.supabaseClient
                .from('cotizaciones')
                .insert(cotizacion)
                .select()
                .single();
            
            if (cotizacionError) throw cotizacionError;
            
            const cotizacionId = nuevaCotizacion.id;
            console.log('✅ Cotización guardada:', numero, 'ID:', cotizacionId);
            
            // Guardar detalles de productos
            for (const producto of cotizacionSeleccionados) {
                const { error: detalleError } = await window.supabaseClient
                    .from('cotizacion_detalles')
                    .insert({
                        cotizacion_id: cotizacionId,
                        producto_id: producto.id,
                        codigo: producto.codigo || '',
                        nombre: producto.nombre,
                        creado_el: fechaActual
                    });
                
                if (detalleError) console.error(`Error guardando detalle para ${producto.nombre}:`, detalleError);
            }
            
            // Incrementar contador del asesor
            try {
                const nuevoContador = (asesor.leads_asignados_hoy || 0) + 1;
                await window.supabaseClient
                    .from('vendedores')
                    .update({ 
                        leads_asignados_hoy: nuevoContador,
                        ultima_asignacion: fechaActual
                    })
                    .eq('id', asesor.id);
                console.log(`✅ Contador actualizado: ${nuevoContador}`);
            } catch (err) {
                console.error('Error actualizando contador:', err);
            }
            
            // Guardar relación cliente-asesor
            if (asesor.id && datosCliente.email) {
                try {
                    const { data: existente } = await window.supabaseClient
                        .from('clientes_asesores')
                        .select('id')
                        .eq('email', datosCliente.email)
                        .maybeSingle();
                    
                    if (existente) {
                        await window.supabaseClient
                            .from('clientes_asesores')
                            .update({
                                telefono: datosCliente.telefono,
                                vendedor_id: asesor.id,
                                ultima_cotizacion: fechaActual
                            })
                            .eq('id', existente.id);
                    } else {
                        await window.supabaseClient
                            .from('clientes_asesores')
                            .insert({
                                email: datosCliente.email,
                                telefono: datosCliente.telefono,
                                vendedor_id: asesor.id,
                                ultima_cotizacion: fechaActual,
                                creado_el: fechaActual
                            });
                    }
                } catch (err) {
                    console.error('Error guardando relación:', err);
                }
            }
            
            // Cerrar modal de carga
            const modalOverlay = document.querySelector('.modal-overlay.active');
            if (modalOverlay) modalOverlay.classList.remove('active');
            
            // Enviar WhatsApp
            let productosLista = '';
            cotizacionSeleccionados.forEach((p, i) => {
                productosLista += `${i+1}. ${p.nombre}${p.codigo ? ` (${p.codigo})` : ''}\n`;
            });
            
            const mensaje = `📋 *NUEVA COTIZACIÓN - OUTLET*

*N° Cotización:* ${numero}
*Fecha:* ${new Date().toLocaleString()}
*Asesor:* ${asesor.nombre}

*Cliente:* ${datosCliente.nombre}
*Email:* ${datosCliente.email}
*Teléfono:* ${datosCliente.telefono}
*Empresa:* ${datosCliente.empresa || 'No especifica'}

*Productos:*
${productosLista}
*Observaciones:* ${datosCliente.observaciones || 'Ninguna'}`;
            
            const telefonoAsesor = asesor?.telefono?.replace(/\D/g, '');
            
            if (telefonoAsesor && telefonoAsesor.length >= 9) {
                let whatsappNumber = telefonoAsesor;
                if (whatsappNumber.length === 9) {
                    whatsappNumber = `51${whatsappNumber}`;
                }
                window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, '_blank');
                await mostrarModal('✅ Cotización enviada', `Enviada a ${asesor.nombre}`, 'success', { timer: 3000, showConfirmButton: false });
            } else {
                await mostrarModal('⚠️ No se pudo enviar', 'Cotización registrada exitosamente', 'warning', { confirmButtonText: 'Entendido' });
            }
            
            // Limpiar selección
            cotizacionSeleccionados = [];
            localStorage.removeItem(CONFIG.COTIZACION_STORAGE_KEY);
            actualizarBarraFlotante();
            
            document.querySelectorAll('.btn-cotizar').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.style.background = '#39080a';
                btn.style.color = 'white';
            });
            
            window.modoAsignacion = 'auto';
            window.asesorPreasignadoId = null;
            
            window.clienteNombreCache = '';
            window.clienteEmailCache = '';
            window.clienteTelefonoCache = '';
            window.clienteEmpresaCache = '';
            window.ubicacionCache = '';
            window.observacionesCache = '';
            
        } catch (error) {
            const modalOverlay = document.querySelector('.modal-overlay.active');
            if (modalOverlay) modalOverlay.classList.remove('active');
            
            console.error('❌ Error detallado:', error);
            await mostrarModal('Error', 'Ocurrió un error al procesar la cotización: ' + (error.message || 'Error desconocido'), 'error');
        }
    }
    
    // ============================================
    // FUNCIONES DE COTIZACIÓN MODAL (ABRIR MODAL)
    // ============================================
    window.abrirModalCotizacion = async function() {
        if (!cotizacionSeleccionados || cotizacionSeleccionados.length === 0) {
            mostrarModal('Sin productos', 'No hay productos seleccionados para cotizar', 'warning');
            return;
        }
        
        const modal = document.getElementById('modalCotizacion');
        const body = document.getElementById('modalCotizacionBody');
        
        if (!modal || !body) {
            console.error('Modal de cotización no encontrado');
            mostrarModal('Error', 'No se pudo abrir la cotización', 'error');
            return;
        }
        
        // Guardar valores actuales del formulario
        if (document.getElementById('cliente-nombre-modal')) {
            window.clienteNombreCache = document.getElementById('cliente-nombre-modal').value || '';
            window.clienteEmailCache = document.getElementById('cliente-correo-modal').value || '';
            window.clienteTelefonoCache = document.getElementById('cliente-telefono-modal').value || '';
            window.clienteEmpresaCache = document.getElementById('cliente-empresa-modal').value || '';
            window.ubicacionCache = document.getElementById('ubicacion-proyecto-modal')?.value || '';
            window.observacionesCache = document.getElementById('observaciones-modal')?.value || '';
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        body.innerHTML = `
            <div class="animate-pulse">
                <div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div class="space-y-3">
                    <div class="h-20 bg-gray-200 rounded"></div>
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-10 bg-gray-200 rounded"></div>
                    <div class="h-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        `;
        
        setTimeout(async () => {
            try {
                let vendedores = asesoresPrecargados;
                if (!vendedores) {
                    vendedores = await precargarAsesoresOutlet();
                }
                
                const asesoresOptions = vendedores && vendedores.length > 0 
                    ? vendedores.map(v => `<option value="${v.id}">${escapeHtml(v.nombre)}${v.telefono ? ` (${v.telefono})` : ''}</option>`).join('')
                    : '<option value="" disabled>No hay asesores disponibles</option>';
                
                const productosHtml = cotizacionSeleccionados.map(p => {
                    // Buscar el producto original en el cache para obtener medida y espesor
                    const productoOriginal = window.outletProductosCache.find(prod => prod.id === p.id);
                    
                    // Obtener medida y espesor del producto original o del objeto actual
                    const medida = productoOriginal?.medida || p.medida || 'No especifica';
                    const espesor = productoOriginal?.espesor || p.espesor || 'No especifica';
                    
                    return `
                        <div class="flex justify-between items-center py-2 border-b last:border-b-0 hover:bg-gray-100 transition-colors rounded-lg px-2" style="transition: all 0.2s ease;">
                            <div class="flex-1">
                                <div class="flex items-start gap-2">
                                    <div class="flex-1">
                                        <p class="font-medium text-sm text-gray-800">${escapeHtml(p.nombre) || 'Producto'}</p>
                                        <p class="text-xs text-gray-400 font-mono mt-0.5">Código: ${escapeHtml(p.codigo) || 'N/A'}</p>
                                        <div class="flex flex-wrap gap-3 mt-1">
                                            ${medida !== 'No especifica' ? `
                                            <span class="text-xs inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                <i class="fas fa-ruler-combined text-[10px]"></i> ${escapeHtml(medida)}
                                            </span>
                                            ` : ''}
                                            ${espesor !== 'No especifica' ? `
                                            <span class="text-xs inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                <i class="fas fa-arrows-alt-h text-[10px]"></i> ${escapeHtml(espesor)}
                                            </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onclick="window.eliminarProductoCotizacion('${p.id}', '${(p.nombre || '').replace(/'/g, "\\'")}')" 
                                    class="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-all ml-2 flex-shrink-0"
                                    title="Eliminar producto">
                                <i class="fas fa-trash-alt text-sm"></i>
                            </button>
                        </div>
                    `;
                }).join('');
                
                const modoInicial = window.modoAsignacion || 'auto';
                
                body.innerHTML = `
                    <div class="mb-5">
                        <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span class="text-primary font-bold text-sm">1</span>
                            </div>
                            <h4 class="font-semibold text-gray-800">Productos seleccionados</h4>
                            <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">${cotizacionSeleccionados.length} producto(s)</span>
                        </div>
                        <div class="border rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50">
                            ${productosHtml || '<p class="text-gray-400 text-sm text-center py-4">No hay productos</p>'}
                        </div>
                    </div>
                    
                    <div class="mb-5">
                        <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span class="text-primary font-bold text-sm">2</span>
                            </div>
                            <h4 class="font-semibold text-gray-800">Asignación de asesor</h4>
                        </div>
                        
                        <div class="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle text-blue-500 mt-0.5 text-sm"></i>
                                <div class="text-xs text-blue-700">
                                    <p class="font-medium mb-1">¿Cómo funciona la asignación?</p>
                                    <p>• <strong>Automático:</strong> El sistema asignará el asesor automáticamente.</p>
                                    <p>• <strong>Elegir asesor:</strong> Selecciona manualmente a tu asesor preferido.</p>
                                    <p>• <strong>Buscar por email:</strong> Ingresa tu correo para encontrar a tu asesor habitual.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-3 mb-3">
                            <div class="flex gap-6 mb-3">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="tipoAsignacion" value="auto" onchange="window.cambiarModoAsignacion('auto')" ${modoInicial === 'auto' ? 'checked' : ''}> 
                                    <span class="text-sm font-medium">Automático</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="tipoAsignacion" value="manual" onchange="window.cambiarModoAsignacion('manual')" ${modoInicial === 'manual' ? 'checked' : ''}> 
                                    <span class="text-sm font-medium">Elegir asesor</span>
                                </label>
                            </div>
                            
                            <div id="selector-asesor-manual" class="${modoInicial === 'manual' ? '' : 'hidden'}">
                                <label class="block text-xs font-medium text-gray-600 mb-1">Selecciona un asesor:</label>
                                <select id="asesor-manual-select" class="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" onchange="window.actualizarAsesorSeleccionadoManual()">
                                    ${asesoresOptions}
                                </select>
                            </div>
                            
                            <div id="campo-email-cliente-modal" class="${modoInicial === 'manual' ? 'hidden' : ''}">
                                <label class="block text-xs font-medium text-gray-600 mb-1">¿Ya has trabajado con nosotros? Busca tu asesor:</label>
                                <div class="flex gap-2">
                                    <input type="email" id="cliente-email-modal" class="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white" placeholder="correo@ejemplo.com" value="${window.clienteEmailCache || ''}">
                                    <button id="btnBuscarAsesorEmail" style="background-color: #39080a; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-search text-xs"></i> Buscar
                                    </button>
                                </div>
                                <p class="text-xs text-gray-400 mt-1">Si tu correo está registrado, te mostraremos a tu asesor habitual.</p>
                            </div>
                            
                            <div id="asesor-info-modal" class="hidden mt-3"></div>
                        </div>
                        
                        <div id="asesor-asignado-container" class="mt-4">
                            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                <i class="fas fa-spinner fa-spin text-primary"></i>
                                <p class="text-sm text-gray-500 mt-2">Cargando asesor...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-5">
                        <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span class="text-primary font-bold text-sm">3</span>
                            </div>
                            <h4 class="font-semibold text-gray-800">Datos de contacto</h4>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">
                                    Nombre completo <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="cliente-nombre-modal" 
                                    class="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                                    placeholder="Ej: Juan Pérez"
                                    value="${window.clienteNombreCache || ''}"
                                    oninput="window.validarCampoNombre(this)">
                                <div id="error-nombre" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">
                                    Correo electrónico <span class="text-red-500">*</span>
                                </label>
                                <input type="email" id="cliente-correo-modal" 
                                    class="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                                    placeholder="cliente@ejemplo.com"
                                    value="${window.clienteEmailCache || ''}"
                                    oninput="window.validarCampoEmail(this)">
                                <div id="error-email" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">
                                    Teléfono <span class="text-red-500">*</span>
                                </label>
                                <div class="flex gap-2">
                                    <select id="prefijo-pais" class="w-32 p-2 border border-gray-300 rounded-lg text-sm bg-white" onchange="window.actualizarPlaceholderTelefono()">
                                        <option value="51" selected>🇵🇪 Perú (+51)</option>
                                        <option value="1">🇺🇸 EE.UU (+1)</option>
                                        <option value="34">🇪🇸 España (+34)</option>
                                        <option value="52">🇲🇽 México (+52)</option>
                                    </select>
                                    <input type="tel" id="cliente-telefono-modal" 
                                        class="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                                        placeholder="Ej: 987654321"
                                        value="${window.clienteTelefonoCache || ''}"
                                        oninput="window.validarCampoTelefono(this)">
                                </div>
                                <div id="error-telefono" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                            
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">
                                    Empresa <span class="text-gray-400">(opcional)</span>
                                </label>
                                <input type="text" id="cliente-empresa-modal" 
                                    class="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                                    placeholder="Nombre de tu empresa"
                                    value="${window.clienteEmpresaCache || ''}"
                                    oninput="window.validarCampoEmpresa(this)">
                                <div id="error-empresa" class="mensaje-error hidden" style="color: #dc3545; font-size: 11px; margin-top: 4px;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-5">
                        <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span class="text-primary font-bold text-sm">4</span>
                            </div>
                            <h4 class="font-semibold text-gray-800">Información adicional</h4>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Ubicación del proyecto</label>
                                <select id="ubicacion-proyecto-modal" class="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                                    <option value="">Seleccionar ubicación</option>
                                    <option value="Lima" ${window.ubicacionCache === 'Lima' ? 'selected' : ''}>Lima</option>
                                    <option value="Provincia" ${window.ubicacionCache === 'Provincia' ? 'selected' : ''}>Provincia</option>
                                    <option value="Exterior" ${window.ubicacionCache === 'Exterior' ? 'selected' : ''}>Exterior</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                                <textarea id="observaciones-modal" rows="2" class="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Comentarios adicionales...">${window.observacionesCache || ''}</textarea>
                            </div>
                        </div>
                    </div>
                `;
                
                // Funciones de validación
                function validarCampoNombre(input) {
                    const valor = input.value.trim();
                    const errorDiv = document.getElementById('error-nombre');
                    if (!errorDiv) return true;
                    
                    if (valor.length === 0) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre es obligatorio';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    if (valor.length < 3) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre debe tener al menos 3 caracteres';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    if (valor.length > 100) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre no puede exceder 100 caracteres';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    if (/\d/.test(valor)) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre no debe contener números';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    errorDiv.classList.add('hidden');
                    input.classList.remove('border-red-500');
                    input.classList.add('border-green-500');
                    return true;
                }
                
                function validarCampoEmail(input) {
                    const valor = input.value.trim();
                    const errorDiv = document.getElementById('error-email');
                    if (!errorDiv) return true;
                    
                    if (valor.length === 0) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El correo electrónico es obligatorio';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    if (!emailRegex.test(valor)) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Ingresa un correo electrónico válido';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    if (valor.length > 100) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El correo no puede exceder 100 caracteres';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    errorDiv.classList.add('hidden');
                    input.classList.remove('border-red-500');
                    input.classList.add('border-green-500');
                    return true;
                }
                
                function validarCampoTelefono(input) {
                    const valor = input.value.trim();
                    const prefijoSelect = document.getElementById('prefijo-pais');
                    const prefijo = prefijoSelect ? prefijoSelect.value : '51';
                    const errorDiv = document.getElementById('error-telefono');
                    if (!errorDiv) return true;
                    
                    if (valor.length === 0) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El teléfono es obligatorio';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    const soloNumeros = valor.replace(/\D/g, '');
                    let esValido = false;
                    let mensajeError = '';
                    
                    switch(prefijo) {
                        case '51':
                            if (soloNumeros.length === 9) esValido = true;
                            else mensajeError = 'El número debe tener 9 dígitos (ej: 987654321)';
                            break;
                        case '1':
                            if (soloNumeros.length === 10) esValido = true;
                            else mensajeError = 'El número debe tener 10 dígitos';
                            break;
                        case '34':
                            if (soloNumeros.length === 9) esValido = true;
                            else mensajeError = 'El número debe tener 9 dígitos';
                            break;
                        default:
                            if (soloNumeros.length >= 7 && soloNumeros.length <= 15) esValido = true;
                            else mensajeError = 'El número debe tener entre 7 y 15 dígitos';
                    }
                    
                    if (!esValido) {
                        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensajeError}`;
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    if (valor !== soloNumeros) {
                        input.value = soloNumeros;
                    }
                    
                    errorDiv.classList.add('hidden');
                    input.classList.remove('border-red-500');
                    input.classList.add('border-green-500');
                    return true;
                }
                
                function validarCampoEmpresa(input) {
                    const valor = input.value.trim();
                    const errorDiv = document.getElementById('error-empresa');
                    if (!errorDiv) return true;
                    
                    if (valor.length > 0 && valor.length < 2) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre de la empresa es demasiado corto';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    if (valor.length > 150) {
                        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> El nombre no puede exceder 150 caracteres';
                        errorDiv.classList.remove('hidden');
                        input.classList.add('border-red-500');
                        input.classList.remove('border-green-500');
                        return false;
                    }
                    
                    errorDiv.classList.add('hidden');
                    input.classList.remove('border-red-500');
                    if (valor.length > 0) {
                        input.classList.add('border-green-500');
                    } else {
                        input.classList.remove('border-green-500');
                    }
                    return true;
                }
                
                function actualizarPlaceholderTelefono() {
                    const prefijoSelect = document.getElementById('prefijo-pais');
                    const telefonoInput = document.getElementById('cliente-telefono-modal');
                    if (!prefijoSelect || !telefonoInput) return;
                    
                    const placeholders = {
                        '51': 'Ej: 987654321 (9 dígitos)',
                        '1': 'Ej: 2125551234 (10 dígitos)',
                        '34': 'Ej: 612345678 (9 dígitos)',
                        '52': 'Ej: 5512345678 (10 dígitos)'
                    };
                    telefonoInput.placeholder = placeholders[prefijoSelect.value] || 'Ej: 123456789';
                }
                
                function obtenerTelefonoCompleto() {
                    const prefijoSelect = document.getElementById('prefijo-pais');
                    const telefonoInput = document.getElementById('cliente-telefono-modal');
                    if (!prefijoSelect || !telefonoInput) return '';
                    
                    const prefijo = prefijoSelect.value;
                    const numero = telefonoInput.value.trim().replace(/\D/g, '');
                    if (!numero) return '';
                    
                    let numeroLimpio = numero;
                    if (numero.startsWith(prefijo)) {
                        numeroLimpio = numero.substring(prefijo.length);
                    }
                    return `${prefijo}${numeroLimpio}`;
                }
                
                function validarTodosLosCampos() {
                    const nombreInput = document.getElementById('cliente-nombre-modal');
                    const emailInput = document.getElementById('cliente-correo-modal');
                    const telefonoInput = document.getElementById('cliente-telefono-modal');
                    
                    let nombreValido = true;
                    let emailValido = true;
                    let telefonoValido = true;
                    
                    if (nombreInput) nombreValido = validarCampoNombre(nombreInput);
                    if (emailInput) emailValido = validarCampoEmail(emailInput);
                    if (telefonoInput) telefonoValido = validarCampoTelefono(telefonoInput);
                    
                    return nombreValido && emailValido && telefonoValido;
                }
                
                window.validarCampoNombre = validarCampoNombre;
                window.validarCampoEmail = validarCampoEmail;
                window.validarCampoTelefono = validarCampoTelefono;
                window.validarCampoEmpresa = validarCampoEmpresa;
                window.actualizarPlaceholderTelefono = actualizarPlaceholderTelefono;
                window.obtenerTelefonoCompleto = obtenerTelefonoCompleto;
                window.validarTodosLosCampos = validarTodosLosCampos;
                
                // Funciones de asignación de asesor
                function generarAsesorAsignadoHTML(asesor, origen) {
                    if (!asesor) {
                        return `
                            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                                <i class="fas fa-user-slash text-gray-400 text-2xl mb-2"></i>
                                <p class="text-sm text-gray-500">No hay asesores disponibles</p>
                            </div>
                        `;
                    }
                    
                    let badgeTexto = '';
                    let badgeColor = '';
                    
                    if (origen === 'auto') {
                        badgeTexto = 'Asignado automáticamente';
                        badgeColor = 'bg-blue-100 text-blue-700';
                    } else if (origen === 'manual') {
                        badgeTexto = 'Seleccionado por ti';
                        badgeColor = 'bg-green-100 text-green-700';
                    } else if (origen === 'email') {
                        badgeTexto = 'Asociado a tu correo';
                        badgeColor = 'bg-purple-100 text-purple-700';
                    } else if (origen === 'reasignado') {
                        badgeTexto = 'Reasignado manualmente';
                        badgeColor = 'bg-orange-100 text-orange-700';
                    }
                    
                    return `
                        <div class="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm">
                            <div class="flex items-start gap-3">
                                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    
                                </div>
                                <div class="flex-1">
                                    <div class="flex flex-wrap items-center gap-2 mb-1">
                                        <h5 class="font-bold text-gray-800">${escapeHtml(asesor.nombre || 'Asesor')}</h5>
                                        <span class="text-xs px-2 py-0.5 rounded-full ${badgeColor}">${badgeTexto}</span>
                                    </div>
                                    ${asesor.email ? `<p class="text-xs text-gray-500"><i class="fas fa-envelope"></i> ${escapeHtml(asesor.email)}</p>` : ''}
                                    ${asesor.telefono ? `<p class="text-xs text-gray-500"><i class="fas fa-phone"></i> ${escapeHtml(asesor.telefono)}</p>` : ''}
                                </div>
                                <button onclick="window.abrirSelectorReasignacion()" class="text-xs text-primary hover:underline">
                                    <i class="fas fa-exchange-alt"></i> Reasignar
                                </button>
                            </div>
                        </div>
                    `;
                }
                
                function actualizarVisualizacionAsesor(asesor, origen) {
                    const container = document.getElementById('asesor-asignado-container');
                    if (container && asesor) {
                        container.innerHTML = generarAsesorAsignadoHTML(asesor, origen);
                        window.asesorPreasignadoId = asesor.id;
                        
                        const selectManual = document.getElementById('asesor-manual-select');
                        if (selectManual) {
                            for (let i = 0; i < selectManual.options.length; i++) {
                                if (selectManual.options[i].value === asesor.id) {
                                    selectManual.selectedIndex = i;
                                    break;
                                }
                            }
                        }
                        window.asesorActualSeleccionado = asesor;
                    }
                }
                
                async function asignarAsesorAutomatico() {
                    mostrarModal('Asignando', 'Buscando el mejor asesor para ti...', 'info', { showConfirmButton: false });
                    
                    try {
                        const { data: vendedoresActualizados } = await window.supabaseClient
                            .from('vendedores')
                            .select('id, nombre, telefono, email, leads_asignados_hoy')
                            .eq('activo', true)
                            .eq('atiende_outlet', true);
                        
                        if (vendedoresActualizados && vendedoresActualizados.length > 0) {
                            vendedoresActualizados.sort((a, b) => (a.leads_asignados_hoy || 0) - (b.leads_asignados_hoy || 0));
                            const mejorAsesor = vendedoresActualizados[0];
                            window.modoAsignacion = 'auto';
                            window.asesorPreasignadoId = mejorAsesor.id;
                            actualizarVisualizacionAsesor(mejorAsesor, 'auto');
                            
                            const radioAuto = document.querySelector('input[name="tipoAsignacion"][value="auto"]');
                            if (radioAuto) radioAuto.checked = true;
                            
                            const selectorManual = document.getElementById('selector-asesor-manual');
                            const campoEmail = document.getElementById('campo-email-cliente-modal');
                            if (selectorManual) selectorManual.style.display = 'none';
                            if (campoEmail) campoEmail.style.display = 'block';
                            
                            const asesorInfo = document.getElementById('asesor-info-modal');
                            if (asesorInfo) asesorInfo.classList.add('hidden');
                            
                            mostrarModal('Asesor asignado', `Se te ha asignado: ${mejorAsesor.nombre}`, 'success', { timer: 2000, showConfirmButton: false });
                        } else {
                            mostrarModal('Error', 'No hay asesores disponibles para asignar', 'error');
                        }
                    } catch (error) {
                        console.error('Error en asignación automática:', error);
                        mostrarModal('Error', 'No se pudo asignar un asesor automáticamente', 'error');
                    }
                }
                
                function cambiarModoAsignacion(modo) {
                    const selectorManual = document.getElementById('selector-asesor-manual');
                    const campoEmail = document.getElementById('campo-email-cliente-modal');
                    window.modoAsignacion = modo;
                    
                    if (modo === 'manual') {
                        if (selectorManual) selectorManual.style.display = 'block';
                        if (campoEmail) campoEmail.style.display = 'none';
                        
                        const selectManualElem = document.getElementById('asesor-manual-select');
                        if (selectManualElem && selectManualElem.value) {
                            const asesorId = selectManualElem.value;
                            const asesor = (vendedores || []).find(v => v.id === asesorId);
                            if (asesor) {
                                actualizarVisualizacionAsesor(asesor, 'manual');
                            }
                        }
                    } else {
                        if (selectorManual) selectorManual.style.display = 'none';
                        if (campoEmail) campoEmail.style.display = 'block';
                        asignarAsesorAutomatico();
                    }
                }
                
                function actualizarAsesorSeleccionadoManual() {
                    const selectManual = document.getElementById('asesor-manual-select');
                    if (selectManual && selectManual.value) {
                        const asesorId = selectManual.value;
                        const asesor = (vendedores || []).find(v => v.id === asesorId);
                        if (asesor) {
                            window.modoAsignacion = 'manual';
                            actualizarVisualizacionAsesor(asesor, 'manual');
                        }
                    }
                }
                
                window.cambiarModoAsignacion = cambiarModoAsignacion;
                window.actualizarAsesorSeleccionadoManual = actualizarAsesorSeleccionadoManual;
                
                // Función de reasignación
                window.abrirSelectorReasignacion = async function() {
                    const vendedoresActuales = vendedores || [];
                    if (vendedoresActuales.length === 0) {
                        mostrarModal('Sin asesores', 'No hay asesores disponibles para reasignar', 'warning');
                        return;
                    }
                    
                    const opcionesAsesores = vendedoresActuales.map(v => 
                        `<option value="${v.id}">${escapeHtml(v.nombre)}${v.telefono ? ` (${v.telefono})` : ''}</option>`
                    ).join('');
                    
                    mostrarModal(
                        'Reasignar asesor',
                        `
                        <div class="text-left space-y-3">
                            <p class="text-sm text-gray-600">Selecciona el asesor que prefieras:</p>
                            <select id="select-reasignar-asesor" class="w-full p-2 border border-gray-300 rounded-lg text-sm">
                                <option value="">-- Seleccionar asesor --</option>
                                ${opcionesAsesores}
                            </select>
                        </div>
                        `,
                        'question',
                        {
                            showCancelButton: true,
                            confirmButtonText: '✅ Reasignar',
                            cancelButtonText: 'Cancelar'
                        }
                    ).then(async (result) => {
                        if (result.isConfirmed) {
                            const selectElement = document.getElementById('select-reasignar-asesor');
                            const asesorId = selectElement?.value;
                            
                            if (!asesorId) {
                                mostrarModal('Aviso', 'Debes seleccionar un asesor', 'warning');
                                return;
                            }
                            
                            const asesorSeleccionado = vendedoresActuales.find(v => v.id === asesorId);
                            if (asesorSeleccionado) {
                                window.modoAsignacion = 'manual';
                                window.asesorPreasignadoId = asesorSeleccionado.id;
                                actualizarVisualizacionAsesor(asesorSeleccionado, 'reasignado');
                                
                                const radioManual = document.querySelector('input[name="tipoAsignacion"][value="manual"]');
                                if (radioManual) radioManual.checked = true;
                                
                                const selectorManual = document.getElementById('selector-asesor-manual');
                                const campoEmail = document.getElementById('campo-email-cliente-modal');
                                if (selectorManual) selectorManual.style.display = 'block';
                                if (campoEmail) campoEmail.style.display = 'none';
                                
                                const selectManual = document.getElementById('asesor-manual-select');
                                if (selectManual) {
                                    for (let i = 0; i < selectManual.options.length; i++) {
                                        if (selectManual.options[i].value === asesorId) {
                                            selectManual.selectedIndex = i;
                                            break;
                                        }
                                    }
                                }
                                
                                mostrarModal('✅ Asesor reasignado', `Ahora serás atendido por: ${asesorSeleccionado.nombre}`, 'success', { timer: 2000 });
                            }
                        }
                    });
                };
                
                // Configurar eventos
                const btnBuscar = document.getElementById('btnBuscarAsesorEmail');
                if (btnBuscar && !btnBuscar.hasAttribute('data-listener')) {
                    btnBuscar.setAttribute('data-listener', 'true');
                    btnBuscar.onclick = async function() {
                        const email = document.getElementById('cliente-email-modal')?.value;
                        if (!email) {
                            mostrarModal('Aviso', 'Ingresa tu correo electrónico para buscar a tu asesor', 'warning');
                            return;
                        }
                        
                        mostrarModal('Buscando', 'Buscando asesor asociado...', 'info', { showConfirmButton: false });
                        
                        try {
                            const { data: cliente } = await window.supabaseClient
                                .from('clientes_asesores')
                                .select('vendedor_id, vendedores:vendedor_id(id, nombre, telefono, email)')
                                .eq('email', email.trim().toLowerCase())
                                .maybeSingle();
                            
                            const asesorInfo = document.getElementById('asesor-info-modal');
                            
                            if (cliente && cliente.vendedores) {
                                const asesor = cliente.vendedores;
                                window.modoAsignacion = 'manual';
                                window.asesorPreasignadoId = asesor.id;
                                actualizarVisualizacionAsesor(asesor, 'email');
                                
                                document.querySelector('input[name="tipoAsignacion"][value="manual"]').checked = true;
                                document.getElementById('selector-asesor-manual').style.display = 'block';
                                document.getElementById('campo-email-cliente-modal').style.display = 'none';
                                
                                const selectManual = document.getElementById('asesor-manual-select');
                                if (selectManual) {
                                    for (let i = 0; i < selectManual.options.length; i++) {
                                        if (selectManual.options[i].value === asesor.id) {
                                            selectManual.selectedIndex = i;
                                            break;
                                        }
                                    }
                                }
                                
                                asesorInfo.innerHTML = `
                                    <div class="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div class="flex items-center gap-2">
                                            <i class="fas fa-user-check text-green-600"></i>
                                            <div>
                                                <p class="font-medium text-green-800">¡Asesor encontrado!</p>
                                                <p class="text-sm font-semibold">${escapeHtml(asesor.nombre)}</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                asesorInfo.classList.remove('hidden');
                                
                                mostrarModal('✅ Asesor encontrado', `Serás atendido por ${asesor.nombre}`, 'success', { timer: 2000 });
                            } else {
                                asesorInfo.innerHTML = `
                                    <div class="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div class="flex items-center gap-2">
                                            <i class="fas fa-info-circle text-yellow-600"></i>
                                            <div>
                                                <p class="font-medium text-yellow-800">Asesor no encontrado</p>
                                                <p class="text-sm text-yellow-700">Se te asignará uno automáticamente.</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                asesorInfo.classList.remove('hidden');
                                await asignarAsesorAutomatico();
                            }
                        } catch (error) {
                            console.error('Error:', error);
                            mostrarModal('Error', 'No se pudo buscar el asesor', 'error');
                        }
                    };
                }
                
                const selectManual = document.getElementById('asesor-manual-select');
                if (selectManual && !selectManual.hasAttribute('data-listener')) {
                    selectManual.setAttribute('data-listener', 'true');
                    selectManual.onchange = function() {
                        actualizarAsesorSeleccionadoManual();
                    };
                }
                
                // Botón enviar cotización
                const btnEnviar = document.getElementById('btnEnviarCotizacion');
                if (btnEnviar && !btnEnviar.hasAttribute('data-listener')) {
                    btnEnviar.setAttribute('data-listener', 'true');
                    btnEnviar.onclick = async () => {
                        if (!window.validarTodosLosCampos || !window.validarTodosLosCampos()) {
                            mostrarModal('Campos inválidos', 'Corrige los errores marcados', 'warning');
                            return;
                        }
                        
                        const nombre = document.getElementById('cliente-nombre-modal')?.value;
                        const email = document.getElementById('cliente-correo-modal')?.value;
                        const telefonoCompleto = window.obtenerTelefonoCompleto ? window.obtenerTelefonoCompleto() : document.getElementById('cliente-telefono-modal')?.value;
                        
                        if (!nombre || !email || !telefonoCompleto) {
                            mostrarModal('Campos incompletos', 'Completa todos los campos obligatorios', 'warning');
                            return;
                        }
                        
                        let asesor = null;
                        
                        if (window.modoAsignacion === 'manual') {
                            const selectManual = document.getElementById('asesor-manual-select');
                            const asesorId = selectManual?.value;
                            
                            if (!asesorId) {
                                mostrarModal('Asesor requerido', 'Selecciona un asesor de la lista', 'warning');
                                return;
                            }
                            
                            asesor = (vendedores || []).find(a => a.id === asesorId);
                            
                            if (!asesor) {
                                const { data: vendedor } = await window.supabaseClient
                                    .from('vendedores')
                                    .select('id, nombre, telefono, email, leads_asignados_hoy')
                                    .eq('id', asesorId)
                                    .single();
                                asesor = vendedor;
                            }
                        } else {
                            try {
                                const { data: vendedoresData } = await window.supabaseClient
                                    .from('vendedores')
                                    .select('id, nombre, telefono, email, leads_asignados_hoy')
                                    .eq('activo', true)
                                    .eq('atiende_outlet', true);
                                
                                if (vendedoresData && vendedoresData.length > 0) {
                                    vendedoresData.sort((a, b) => (a.leads_asignados_hoy || 0) - (b.leads_asignados_hoy || 0));
                                    asesor = vendedoresData[0];
                                } else {
                                    mostrarModal('Error', 'No hay asesores disponibles', 'error');
                                    return;
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                mostrarModal('Error', 'No se pudo asignar un asesor', 'error');
                                return;
                            }
                        }
                        
                        if (!asesor || !asesor.id) {
                            mostrarModal('Error', 'No se pudo asignar un asesor válido', 'error');
                            return;
                        }
                        
                        const datosCliente = {
                            nombre: nombre,
                            email: email,
                            telefono: telefonoCompleto,
                            empresa: document.getElementById('cliente-empresa-modal')?.value || null,
                            ubicacionProyecto: document.getElementById('ubicacion-proyecto-modal')?.value || null,
                            observaciones: document.getElementById('observaciones-modal')?.value || null,
                            modoAsignacion: window.modoAsignacion || 'auto'
                        };
                        
                        window.cerrarModalCotizacion();
                        await enviarCotizacion(datosCliente, asesor);
                    };
                }
                
                if (modoInicial === 'auto') {
                    await asignarAsesorAutomatico();
                } else if (window.asesorPreasignadoId) {
                    const asesorManual = (vendedores || []).find(v => v.id === window.asesorPreasignadoId);
                    if (asesorManual) {
                        actualizarVisualizacionAsesor(asesorManual, 'manual');
                    }
                }
                
                actualizarPlaceholderTelefono();
                
            } catch (error) {
                console.error('Error cargando modal:', error);
                body.innerHTML = `
                    <div class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                        <p>Error al cargar el formulario</p>
                        <button onclick="window.abrirModalCotizacion()" class="mt-3 bg-primary text-white px-4 py-2 rounded-lg">Reintentar</button>
                    </div>
                `;
            }
        }, 50);
    };
    
    function eliminarProductoCotizacion(productoId, productoNombre) {
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
                cotizacionSeleccionados = cotizacionSeleccionados.filter(p => p.id !== productoId);
                localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(cotizacionSeleccionados));
                actualizarBarraFlotante();
                actualizarBotonCard(productoId, true);
                
                if (cotizacionSeleccionados.length === 0) {
                    window.cerrarModalCotizacion();
                    mostrarModal('Cotización vacía', 'Se han eliminado todos los productos. La cotización se ha cerrado.', 'info', { timer: 2000 });
                } else {
                    window.abrirModalCotizacion();
                }
            }
        });
    }
    
    window.eliminarProductoCotizacion = eliminarProductoCotizacion;
    
    window.cerrarModalCotizacion = function() {
        const modal = document.getElementById('modalCotizacion');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    
    function initCountdown() {
        const fechaInicio = new Date(2026, 5, 24);
        const fechaFin = new Date(2026, 6, 18);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        let targetDate, mensaje = "";
        
        if (hoy < fechaInicio) {
            targetDate = fechaInicio;
            mensaje = "OFERTA PRÓXIMAMENTE";
        } else if (hoy >= fechaInicio && hoy <= fechaFin) {
            targetDate = fechaFin;
            mensaje = "OFERTA POR TIEMPO LIMITADO";
        } else {
            targetDate = null;
            mensaje = "OFERTA FINALIZADA";
        }
        
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
            
            document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
            document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');
        }
        
        update();
        setInterval(update, 1000);
    }
    
    // ============================================
    // GENERAR HTML COMPLETO
    // ============================================
    const productosDataParaHTML = window.outletProductosCache.map(p => ({ 
        ...p, 
        imagen_principal: optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE), 
        slug: p.slug || p.id 
    }));
    const heroBackgroundImage = '../FOTO/foto_03.webp';
    
    const modalConfirmacionHtml = `
    <div id="modalConfirmacion" class="modal-personalizado">
        <div class="modal-personalizado-contenido">
            <div class="modal-personalizado-header"><i class="fas fa-question-circle"></i> Confirmar acción</div>
            <div class="modal-personalizado-body">
                <i class="fas fa-trash-alt" style="font-size: 48px; color: #dc3545; margin-bottom: 16px; display: block;"></i>
                <p style="font-size: 16px; font-weight: 500;">¿Limpiar selección?</p>
                <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">Se eliminarán todos los productos de tu cotización.</p>
            </div>
            <div class="modal-personalizado-footer">
                <button class="btn-modal-cancelar" id="btnCancelarLimpieza"><i class="fas fa-times"></i> Cancelar</button>
                <button class="btn-modal-confirmar" id="btnConfirmarLimpieza"><i class="fas fa-trash"></i> Sí, limpiar</button>
            </div>
        </div>
    </div>`;
    
    const modalCotizacionHtml = `
    <div id="modalCotizacion" class="modal-cotizacion">
        <div class="modal-cotizacion-contenido">
            <div class="modal-cotizacion-header">
                <h3><i class="fas fa-file-invoice"></i> Nueva Cotización</h3>
                <button class="modal-cotizacion-close" onclick="window.cerrarModalCotizacion()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-cotizacion-body" id="modalCotizacionBody"><div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div></div>
            <div class="modal-cotizacion-footer">
                <button class="btn-modal-cancelar" onclick="window.cerrarModalCotizacion()">Cancelar</button>
                <button class="btn-modal-confirmar" id="btnEnviarCotizacion" style="background:#25D366;"><i class="fab fa-whatsapp"></i> Enviar</button>
            </div>
        </div>
    </div>`;
    
    const modalQRHtml = `
    <div id="modalQR" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 20px; width: 90%; max-width: 500px; overflow: hidden;">
            <div style="background: #39080a; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;"><i class="fas fa-qrcode"></i> Escanear Código QR</h3>
                <button id="btnCerrarQR" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div id="qr-reader" style="width: 100%;"></div>
                <div id="qr-mensaje" style="text-align: center; margin-top: 15px; color: #666; font-size: 14px;">
                    <i class="fas fa-info-circle"></i> Apunte la cámara al código QR del producto
                </div>
            </div>
        </div>
    </div>`;
    
    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover">
        <title>Outlet | Gallos Mármol</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
        <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            :root{--primary:#39080a;--primary-dark:#2a0607;--secondary:#d4d4ae;--white:#fff;--gray-50:#fafafa;--gray-100:#f5f5f5;--gray-200:#eee;--gray-300:#e0e0e0;--gray-400:#cbd5e1;--gray-500:#94a3b8;--gray-600:#666;--gray-700:#444;--gray-800:#222;--red-500:#ef4444;--red-600:#dc2626;--orange-400:#fb923c}
            body{font-family:'Poppins',sans-serif;background:var(--gray-50);color:var(--gray-800);line-height:1.5;overflow-x:hidden}
            
            /* Protección de imágenes */
            body{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}
            img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;pointer-events:auto}
            
            .container{width:100%;max-width:1280px;margin:0 auto;padding:0 24px}
            h1,h2,h3{font-weight:700}
            
            /* Header */
            header{position:fixed;top:0;left:0;right:0;background:var(--primary);z-index:1000;padding:12px 0;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
            .navbar{display:flex;justify-content:center;align-items:center}
            .logo img{width:200px;height:auto}
            
            /* Hero Section */
            .hero-outlet{min-height:85vh;display:flex;align-items:center;background:linear-gradient(135deg,rgba(0,0,0,0.75),rgba(0,0,0,0.5)),url('${heroBackgroundImage}');background-size:cover;background-position:center;padding:120px 0 80px}
            .hero-content{max-width:700px}
            .hero-title{font-size:3.5rem;font-weight:800;color:white;margin-bottom:16px}
            .hero-title span{color:var(--secondary)}
            .hero-description{font-size:1.1rem;color:rgba(255,255,255,0.9);margin-bottom:32px}
            
            /* Countdown */
            .countdown-container{background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:20px;padding:20px 30px;margin-bottom:32px;display:inline-block}
            .countdown{display:flex;gap:20px;justify-content:center;flex-wrap:wrap}
            .countdown-item{text-align:center;background:rgba(0,0,0,0.6);border-radius:16px;padding:12px 16px;min-width:80px}
            .countdown-number{font-size:2.2rem;font-weight:800;color:white;font-family:monospace}
            .countdown-label{font-size:0.7rem;color:rgba(255,255,255,0.7)}
            .hero-buttons{display:flex;gap:16px;flex-wrap:wrap}
            .btn-primary-custom{background:var(--secondary);color:var(--primary);padding:14px 32px;border-radius:50px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:10px}
            .btn-primary-custom:hover{background:var(--secondary);transform:translateY(-3px)}
            
            /* Search Section - Mobile First */
            .search-filters-section{background:white;border-radius:24px;margin:-30px auto 30px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
            .search-wrapper{margin-bottom:16px}
            .search-box-enhanced{position:relative;display:flex;flex-direction:column;gap:12px}
            .search-box-enhanced i.fa-search{position:absolute;left:18px;top:50%;transform:translateY(-50%);font-size:1rem;color:var(--gray-400);z-index:1;pointer-events:none}
            .search-box-enhanced input{width:100%;padding:14px 18px 14px 48px;border:2px solid var(--gray-200);border-radius:50px;font-size:0.95rem;background:var(--gray-50);transition:all 0.3s ease}
            .search-box-enhanced input:focus{outline:none;border-color:var(--primary);background:white;box-shadow:0 0 0 3px rgba(57,8,10,0.1)}
            .search-box-enhanced input::placeholder{color:var(--gray-400);font-size:0.9rem}
            
            .btn-escaneo-qr{background:var(--primary);color:white;border:none;border-radius:50px;padding:14px 20px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:600;font-size:0.9rem;transition:all 0.3s ease;width:100%}
            .btn-escaneo-qr:hover{background:var(--primary-dark);transform:translateY(-2px)}
            .btn-escaneo-qr:active{transform:translateY(0)}
            .btn-escaneo-qr i{font-size:1.1rem}
            
            .search-hint{display:flex;justify-content:flex-start;margin-top:8px;font-size:0.7rem;color:var(--gray-400)}
            .search-hint i{margin-right:4px}
            
            /* Filtros Desktop */
            .filters-desktop-container{margin-bottom:16px}
            .filtros-grid-enhanced{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}
            .filtro-group{flex:1;min-width:150px}
            .filtro-group label{display:block;font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;margin-bottom:8px}
            .filtro-group select{width:100%;padding:14px 16px;border:1px solid var(--gray-200);border-radius:16px;font-size:0.9rem;background:var(--gray-50);cursor:pointer}
            .filtros-actions{display:flex;gap:12px;margin-top:16px}
            .btn-filter,.btn-clear{padding:12px 28px;border-radius:40px;font-weight:600;cursor:pointer;border:none}
            .btn-filter{background:var(--primary);color:white}
            .btn-clear{background:var(--gray-100);color:var(--gray-700)}
            
            /* Filtros Mobile FAB */
            .filtros-fab{position:fixed;bottom:80px;right:20px;background:var(--primary);color:white;width:56px;height:56px;border-radius:50%;display:none;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.2);cursor:pointer;z-index:90;border:none}
            .filtros-fab:hover{transform:scale(1.05)}
            
            .filtros-modal{position:fixed;top:0;right:-100%;width:85%;max-width:320px;height:100%;background:white;z-index:1000;transition:right 0.3s ease;box-shadow:-5px 0 25px rgba(0,0,0,0.1);display:flex;flex-direction:column}
            .filtros-modal.show{right:0}
            .filtros-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;display:none}
            .filtros-modal-overlay.show{display:block}
            .filtros-modal-header{padding:20px;background:var(--primary);color:white;display:flex;justify-content:space-between;align-items:center}
            .filtros-modal-header h3{font-size:1.2rem}
            .close-modal-btn{background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center}
            .filtros-modal-body{flex:1;padding:20px;overflow-y:auto}
            .filtros-modal-footer{padding:20px;border-top:1px solid var(--gray-200);display:flex;gap:12px}
            .filtros-modal-footer button{flex:1;padding:12px;border-radius:40px;font-weight:600;cursor:pointer}
            
            /* Scroll Top Button */
            .scroll-top-btn{position:fixed;bottom:20px;right:20px;width:50px;height:50px;border-radius:50%;background:var(--primary);color:white;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.2);z-index:80}
            
            /* Productos Grid */
            .productos-grid-enhanced{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:20px}
            .producto-card{background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid var(--gray-200);transition:all 0.3s ease}
            .producto-card:hover{transform:translateY(-5px);box-shadow:0 12px 25px -10px rgba(0,0,0,0.15)}
            .card-image{position:relative;height:180px;overflow:hidden;background:var(--gray-100)}
            .card-image img{width:100%;height:100%;object-fit:contain;transition:transform 0.4s ease}
            .producto-card:hover .card-image img{transform:scale(1.05)}
            .badge-outlet{position:absolute;top:10px;left:10px;background:linear-gradient(135deg,var(--red-600),var(--orange-400));color:white;padding:4px 10px;border-radius:20px;font-size:0.65rem;font-weight:600;z-index:2}
            .card-info{padding:12px}
            .card-info h3{font-size:0.9rem;font-weight:700;color:var(--primary);margin-bottom:4px}
            .card-info .codigo{font-size:0.6rem;color:var(--gray-500);font-family:monospace;margin-bottom:6px}
            .specs-badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
            .spec-badge{background:var(--gray-100);padding:3px 8px;border-radius:20px;font-size:0.6rem;color:var(--gray-600);display:inline-flex;align-items:center;gap:4px}
            .btn-detalle-enhanced{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--primary);color:white;padding:10px 12px;border-radius:40px;text-decoration:none;font-size:0.75rem;font-weight:600;flex:1}
            .btn-cotizar{background:#39080a;color:white;border:none;padding:8px 12px;border-radius:40px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px}
            .contador-enhanced{background:var(--gray-100);padding:8px 16px;border-radius:40px;font-size:0.8rem;color:var(--gray-600);display:inline-block}
            .contador-enhanced span{font-weight:700;color:var(--primary)}
            .results-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px}
            .no-results{text-align:center;padding:40px;background:white;border-radius:20px}
            
            /* Modales */
            .modal-personalizado{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;justify-content:center;align-items:center}
            .modal-personalizado.active{display:flex}
            .modal-personalizado-contenido{background:white;border-radius:16px;width:90%;max-width:400px;overflow:hidden}
            .modal-personalizado-header{background:#39080a;color:white;padding:16px 20px;font-weight:600}
            .modal-personalizado-body{padding:24px 20px;text-align:center;color:#374151}
            .modal-personalizado-footer{padding:16px 20px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid #e5e7eb}
            .btn-modal-confirmar{background:#dc3545;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer}
            .btn-modal-cancelar{background:#e5e7eb;color:#374151;border:none;padding:8px 20px;border-radius:8px;cursor:pointer}
            
            .modal-cotizacion{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;justify-content:center;align-items:center;overflow-y:auto}
            .modal-cotizacion.active{display:flex}
            .modal-cotizacion-contenido{background:white;border-radius:20px;width:90%;max-width:750px;max-height:90vh;overflow-y:auto;margin:20px auto}
            .modal-cotizacion-header{background:#39080a;color:white;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0}
            .modal-cotizacion-header h3{font-size:1.25rem;margin:0}
            .modal-cotizacion-close{background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;width:36px;height:36px;border-radius:50%}
            .modal-cotizacion-body{padding:24px}
            .modal-cotizacion-footer{padding:16px 24px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid #e5e7eb;background:#f9fafb}
            
            .modal-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:20000;justify-content:center;align-items:center}
            .modal-overlay.active{display:flex}
            .modal-custom{background:white;border-radius:20px;width:90%;max-width:450px;overflow:hidden}
            .modal-custom-header{padding:20px 24px;text-align:center;border-bottom:1px solid #e5e7eb}
            .modal-custom-header i{font-size:48px;margin-bottom:12px;display:inline-block}
            .modal-custom-header h3{font-size:1.25rem;font-weight:700}
            .modal-custom-body{padding:24px;text-align:center;color:#374151}
            .modal-custom-footer{padding:16px 24px;display:flex;gap:12px;justify-content:center;border-top:1px solid #e5e7eb;background:#f9fafb}
            .modal-custom-footer button{padding:10px 24px;border-radius:40px;font-weight:600;cursor:pointer;border:none}
            .btn-modal-primary{background:#39080a;color:white}
            .btn-modal-success{background:#10b981;color:white}
            .btn-modal-danger{background:#dc3545;color:white}
            .btn-modal-warning{background:#f59e0b;color:white}
            .btn-modal-secondary{background:#e5e7eb;color:#374151}
            
            /* QR Reader */
            #qr-reader{width:100%;border-radius:12px;overflow:hidden}
            #qr-reader video{width:100%;border-radius:12px}
            #qr-reader__scan_region{background:#f0f0f0;border-radius:12px}
      
            /* Mejoras para la lista de productos en el modal */
            .modal-cotizacion-body .border {
                border-color: #e5e7eb;
            }

            .modal-cotizacion-body .hover\:bg-gray-100:hover {
                background-color: #f9fafb;
            }

            /* Estilos para los badges de medida y espesor */
            .modal-cotizacion-body .bg-gray-100 {
                background-color: #f3f4f6;
            }

            .modal-cotizacion-body .rounded-full {
                border-radius: 9999px;
            }

            /* Animación suave al eliminar */
            .preview-item,
            .producto-cotizacion-item {
                transition: all 0.2s ease;
            }

            .preview-item:hover,
            .producto-cotizacion-item:hover {
                background-color: #f9fafb;
            }            

            /* Estilos para el buscador con botón de limpiar */
            .search-input-wrapper {
                position: relative;
                flex: 1;
            }

            .search-input-wrapper i.fa-search {
                position: absolute;
                left: 18px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 1rem;
                color: var(--gray-400);
                z-index: 1;
                pointer-events: none;
            }

            .search-input-wrapper input {
                width: 100%;
                padding: 14px 18px 14px 48px;
                border: 2px solid var(--gray-200);
                border-radius: 50px;
                font-size: 0.95rem;
                background: var(--gray-50);
                transition: all 0.3s ease;
            }

            .search-input-wrapper input:focus {
                outline: none;
                border-color: var(--primary);
                background: white;
                box-shadow: 0 0 0 3px rgba(57,8,10,0.1);
            }

            .search-input-wrapper input:focus + .btn-clear-search {
                display: flex !important;
            }

            .btn-clear-search {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 2;
            }

            .btn-clear-search:hover {
                color: var(--primary);
                background: rgba(0,0,0,0.05);
            }

            .btn-clear-search i {
                font-size: 1rem;
            }

            /* Desktop styles */
            @media (min-width: 769px) {
                .search-input-wrapper input {
                    padding: 16px 20px 16px 55px;
                    font-size: 1rem;
                }
                
                .search-input-wrapper i.fa-search {
                    left: 22px;
                    font-size: 1.1rem;
                }
                
                .btn-clear-search {
                    right: 16px;
                }
                
                .btn-clear-search i {
                    font-size: 1.1rem;
                }
            }

            /* Mobile styles */
            @media (max-width: 768px) {
                .search-input-wrapper input {
                    padding: 12px 14px 12px 42px;
                    font-size: 0.85rem;
                }
                
                .btn-clear-search {
                    right: 10px;
                }
                
                .btn-clear-search i {
                    font-size: 0.9rem;
                }
            }

            .btn-clear-all {
                background: var(--gray-100);
                color: var(--gray-700);
                border: 1px solid var(--gray-200);
                padding: 8px 16px;
                border-radius: 40px;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .btn-clear-all:hover {
                background: var(--gray-200);
                transform: translateY(-2px);
            }

            .btn-clear-all:active {
                transform: translateY(0);
            }

            .btn-clear-all i {
                font-size: 0.7rem;
            }

            /* Responsive para móvil */
            @media (max-width: 768px) {
                .btn-clear-all {
                    padding: 6px 12px;
                    font-size: 0.7rem;
                }
                
                .btn-clear-all i {
                    font-size: 0.65rem;
                }
            }

            /* Barra de cotización mejorada - Mobile First */
            .barra-cotizacion {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #39080a 0%, #2a0607 100%);
                color: white;
                padding: 10px 16px;
                z-index: 1000;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }

            /* Modo expandido */
            .barra-cotizacion.expanded {
                padding: 16px;
            }

            /* Modo mini (colapsado) */
            .barra-cotizacion.mini {
                padding: 25px 16px;
            }

            .barra-cotizacion-mini {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }

            .barra-info-mini {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }

            .barra-icono {
                position: relative;
            }

            .barra-icono i {
                font-size: 1.2rem;
                color: var(--secondary);
            }

            .badge-cantidad {
                position: absolute;
                top: -8px;
                right: -12px;
                background: #d4d4ae;
                color: #39080a;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.6rem;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .barra-texto-mini {
                font-size: 0.8rem;
                font-weight: 500;
            }

            .barra-texto-mini span {
                font-weight: 800;
                font-size: 1rem;
                color: var(--secondary);
            }

            .barra-acciones-mini {
                display: flex;
                gap: 8px;
            }

            .btn-cotizar-mini {
                background: #d4d4ae;
                border: none;
                padding: 6px 12px;
                border-radius: 40px;
                color: #39080a;
                font-weight: 600;
                font-size: 0.7rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-expandir {
                background: rgba(255,255,255,0.1);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            /* Modo expandido (detalles) */
            .barra-cotizacion-expanded {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .barra-productos-preview {
                max-height: 120px;
                overflow-y: auto;
                margin-bottom: 8px;
            }

            .preview-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-size: 0.7rem;
            }

            .preview-nombre {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .preview-eliminar {
                background: none;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                padding: 4px;
                margin-left: 8px;
            }

            .barra-acciones-expanded {
                display: flex;
                gap: 10px;
            }

            .btn-limpiar {
                background: rgba(255,255,255,0.2);
                border: none;
                padding: 10px 16px;
                border-radius: 40px;
                color: white;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 500;
                flex: 1;
            }

            .btn-ver-cotizacion {
                background: #d4d4ae;
                border: none;
                padding: 10px 16px;
                border-radius: 40px;
                color: #39080a;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 700;
                flex: 1;
            }

            /* Animaciones */
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                }
                to {
                    transform: translateY(0);
                }
            }

            .barra-cotizacion {
                animation: slideUp 0.3s ease;
            }

            /* Desktop */
            @media (min-width: 769px) {
                .barra-cotizacion {
                    padding: 12px 24px;
                }
                
                .btn-expandir {
                    display: none;
                }
                
                .barra-cotizacion.mini .barra-cotizacion-mini {
                    max-width: 1200px;
                    margin: 0 auto;
                }
            }

            /* Animación de feedback al agregar producto */
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.2);
                }
            }

            .badge-cantidad.animado {
                animation: pulse 0.3s ease;
            }

            .toast-notificacion {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 40px;
                font-size: 0.8rem;
                font-weight: 600;
                z-index: 1001;
                animation: slideUp 0.3s ease, fadeOut 2s ease 1.5s forwards;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            @keyframes fadeOut {
                to {
                    opacity: 0;
                    visibility: hidden;
                }
            }

            /* Footer */
            footer{background:var(--primary-dark);color:white;padding:40px 20px 25px;margin-top:50px}
            .footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:30px;max-width:1200px;margin:0 auto}
            .footer-logo img{width:150px;margin-bottom:12px}
            .footer-logo p{font-size:0.75rem;opacity:0.7;line-height:1.5}
            .footer-social h4,.footer-links h4{font-size:0.9rem;margin-bottom:15px;color:var(--secondary)}
            .footer-social a,.footer-links a{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,0.7);text-decoration:none;margin-bottom:10px;transition:0.3s;font-size:0.8rem}
            .footer-social a:hover,.footer-links a:hover{color:var(--secondary);transform:translateX(5px)}
            .footer-bottom{text-align:center;margin-top:35px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.65rem;opacity:0.6}
            
            /* Animaciones */
            @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
            .animate-pulse{animation:pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite}
            
            .hidden{display:none}
            .text-red-500{color:#ef4444}
            .text-green-500{color:#10b981}
            .border-red-500{border-color:#ef4444}
            .border-green-500{border-color:#10b981}
            
            /* Desktop Styles */
            @media (min-width: 769px) {
                .search-filters-section{padding:20px 24px;margin:-40px auto 40px}
                .search-box-enhanced{flex-direction:row;align-items:center}
                .search-box-enhanced input{flex:1;padding:16px 20px 16px 55px;font-size:1rem}
                .btn-escaneo-qr{width:auto;padding:16px 28px;font-size:1rem}
                .search-box-enhanced i.fa-search{left:22px;font-size:1.1rem}
                .productos-grid-enhanced{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}
                .card-image{height:240px}
                .card-info h3{font-size:1rem}
                .btn-detalle-enhanced{padding:12px 16px;font-size:0.8rem}
                .filtros-fab{display:none!important}
                .filtros-modal,.filtros-modal-overlay{display:none!important}
                .filters-desktop-container{display:block}
            }
            
            /* Mobile Styles */
            @media (max-width: 768px) {
                .container{padding:0 16px}
                .hero-title{font-size:2rem}
                .countdown-item{min-width:60px;padding:8px 10px}
                .countdown-number{font-size:1.3rem}
                .search-filters-section{padding:16px;margin:-30px auto 30px}
                .filters-desktop-container{display:none}
                .filtros-fab{display:flex}
                .productos-grid-enhanced{gap:12px}
                .card-image{height:140px}
                .card-info h3{font-size:0.75rem}
                .btn-detalle-enhanced{padding:8px 10px}
                .scroll-top-btn{width:45px;height:45px;bottom:15px;right:15px}
                .filtros-fab{width:50px;height:50px;bottom:150px;right:15px}
                .footer-grid{text-align:center}
                .footer-social a,.footer-links a{justify-content:center}
            }
            
            @media (max-width: 480px) {
                .search-filters-section{margin:-20px auto 20px;padding:12px}
                .search-box-enhanced input{padding:12px 14px 12px 42px;font-size:0.85rem}
                .btn-escaneo-qr{padding:12px 16px;font-size:0.85rem}
                .btn-escaneo-qr i{font-size:0.9rem}
                .search-hint{font-size:0.65rem}
            }
        </style>
    </head>
    <body>
        <header><div class="container navbar"><div class="logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"></div></div></header>
        
        <div class="filtros-modal-overlay" id="filtrosModalOverlay" onclick="closeFiltrosModal()"></div>
        <div class="filtros-modal" id="filtrosModal">
            <div class="filtros-modal-header"><h3><i class="fas fa-filter"></i> Filtros</h3><button class="close-modal-btn" onclick="closeFiltrosModal()"><i class="fas fa-times"></i></button></div>
            <div class="filtros-modal-body">
                <div class="filtro-group"><label>Familia</label><select id="filtroFamiliaModal"><option value="">Todas</option>${familiasOptions}</select></div>
                <div class="filtro-group"><label>Acabado</label><select id="filtroAcabadoModal"><option value="">Todos</option>${acabadosOptions}</select></div>
                <div class="filtro-group"><label>Material</label><select id="filtroMaterialModal"><option value="">Todos</option>${materialesOptions}</select></div>
            </div>
            <div class="filtros-modal-footer"><button class="btn-filter" onclick="aplicarFiltrosDesdeModal()">Aplicar</button><button class="btn-clear" onclick="limpiarFiltrosDesdeModal()">Limpiar</button></div>
        </div>
        
        <button class="filtros-fab" onclick="openFiltrosModal()"><i class="fas fa-filter"></i></button>
        <button class="scroll-top-btn" id="scrollTopBtn" onclick="scrollToTop()"><i class="fas fa-arrow-up"></i></button>
        
        ${modalConfirmacionHtml}
        ${modalCotizacionHtml}
        ${modalQRHtml}
        
        <section class="hero-outlet">
            <div class="container">
                <div class="hero-content">
                    <h1 class="hero-title">Outlet</h1>
                    <p class="hero-description">Aprovecha nuestra selección exclusiva de productos.</p>
                    <div class="countdown-container">
                        <div class="countdown-title" id="countdownTitle">⏰ OFERTA POR TIEMPO LIMITADO</div>
                        <div class="countdown">
                            <div class="countdown-item"><div class="countdown-number" id="countdown-days">00</div><div class="countdown-label">Días</div></div>
                            <div class="countdown-item"><div class="countdown-number" id="countdown-hours">00</div><div class="countdown-label">Horas</div></div>
                            <div class="countdown-item"><div class="countdown-number" id="countdown-minutes">00</div><div class="countdown-label">Minutos</div></div>
                            <div class="countdown-item"><div class="countdown-number" id="countdown-seconds">00</div><div class="countdown-label">Segundos</div></div>
                        </div>
                    </div>
                    <div class="hero-buttons"><a href="#productos" class="btn-primary-custom"><i class="fas fa-shopping-bag"></i> Ver Productos</a></div>
                </div>
            </div>
        </section>
        
        <div class="container">
            <div class="search-filters-section">
                <div class="search-wrapper">
                    <div class="search-box-enhanced">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search"></i>
                            <input type="text" id="searchOutlet" 
                                placeholder="Buscar producto..." 
                                autocomplete="off"
                                inputmode="search">
                            <button id="btnLimpiarBusqueda" class="btn-clear-search" type="button" style="display: none;">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>
                        <button id="btnEscanearQR" class="btn-escaneo-qr">
                            <i class="fas fa-qrcode"></i>
                            <span>Escanear</span>
                        </button>
                    </div>
                    <div class="search-hint">
                        <i class="fas fa-info-circle"></i> 
                        <span>Busca por nombre, código o escanea QR</span>
                    </div>
                </div>
                
                <div class="filters-desktop-container">
                    <div class="filtros-grid-enhanced">
                        <div class="filtro-group"><label>Familia</label><select id="filtroFamilia"><option value="">Todas</option>${familiasOptions}</select></div>
                        <div class="filtro-group"><label>Acabado</label><select id="filtroAcabado"><option value="">Todos</option>${acabadosOptions}</select></div>
                        <div class="filtro-group"><label>Material</label><select id="filtroMaterial"><option value="">Todos</option>${materialesOptions}</select></div>
                        <div class="filtros-actions"><button onclick="aplicarFiltrosOutlet()" class="btn-filter">Aplicar</button><button onclick="limpiarFiltrosOutlet()" class="btn-clear">Limpiar</button></div>
                    </div>
                </div>
            </div>
        </div>
        
        <section id="productos" class="container">
            <div class="results-header">
                <div class="contador-enhanced">
                    <i class="fas fa-box-open"></i> 
                    <span id="contadorProductos">${productosDataParaHTML.length}</span> producto(s)
                </div> 
                <button id="btnLimpiarTodoOutlet" class="btn-clear-all" style="display: none;">
                    <i class="fas fa-eraser"></i> Limpiar todo
                </button>  
            </div> 

            <div id="productosGrid" class="productos-grid-enhanced">${window.generarCardsOutlet(productosDataParaHTML)}</div>
        </section>
        
        <footer>
            <div class="footer-grid">
                <div class="footer-logo"><img src="FOTO/foto_01.webp" alt="Gallos Mármol"><p>Desde 1870, transformamos espacios con mármol de alta calidad, combinando belleza, exclusividad y excelencia en cada proyecto.</p></div>
                <div class="footer-social"><h4>Redes Sociales</h4><a href="https://www.facebook.com/gallosmarmol/"><i class="fab fa-facebook-f"></i> Facebook</a><a href="https://www.instagram.com/gallosmarmol/"><i class="fab fa-instagram"></i> Instagram</a><a href="https://www.tiktok.com/@gallos.marmol.ofic"><i class="fab fa-tiktok"></i> TikTok</a></div>
                <div class="footer-links"><h4>Contacto</h4><a href="https://gallosmarmol.com.pe"><i class="fas fa-globe"></i> gallosmarmol.com.pe</a><a href="mailto:info@gallosmarmol.com.pe"><i class="fas fa-envelope"></i> info@gallosmarmol.com.pe</a></div>
            </div>
            <div class="footer-bottom">© 2026 Gallos Mármol — Todos los derechos reservados.</div>
        </footer>
        
        <script>
            // Exponer funciones globales
            window.openFiltrosModal = openFiltrosModal;
            window.closeFiltrosModal = closeFiltrosModal;
            window.syncModalSelects = syncModalSelects;
            window.aplicarFiltrosDesdeModal = aplicarFiltrosDesdeModal;
            window.limpiarFiltrosDesdeModal = limpiarFiltrosDesdeModal;
            window.scrollToTop = scrollToTop;
            window.aplicarFiltrosOutlet = aplicarFiltrosOutlet;
            window.limpiarFiltrosOutlet = limpiarFiltrosOutlet;
            window.limpiarCotizacion = limpiarCotizacion;
            window.abrirModalCotizacion = abrirModalCotizacion;
            window.cerrarModalCotizacion = cerrarModalCotizacion;
            window.eliminarProductoCotizacion = eliminarProductoCotizacion;
            window.toggleSeleccionCotizacion = toggleSeleccionCotizacion;
            
            // Funciones de filtros
            function syncModalSelects(){
                const fd=document.getElementById('filtroFamilia'),ad=document.getElementById('filtroAcabado'),md=document.getElementById('filtroMaterial');
                const fm=document.getElementById('filtroFamiliaModal'),am=document.getElementById('filtroAcabadoModal'),mm=document.getElementById('filtroMaterialModal');
                if(fd&&fm) fm.value=fd.value;
                if(ad&&am) am.value=ad.value;
                if(md&&mm) mm.value=md.value;
            }
            
            function aplicarFiltrosDesdeModal(){
                const fm=document.getElementById('filtroFamiliaModal'),am=document.getElementById('filtroAcabadoModal'),mm=document.getElementById('filtroMaterialModal');
                const fd=document.getElementById('filtroFamilia'),ad=document.getElementById('filtroAcabado'),md=document.getElementById('filtroMaterial');
                if(fd&&fm) fd.value=fm.value;
                if(ad&&am) ad.value=am.value;
                if(md&&mm) md.value=mm.value;
                if(typeof aplicarFiltrosOutlet==='function') aplicarFiltrosOutlet();
                if(window.innerWidth<=768){const m=document.getElementById('filtrosModal');if(m){m.classList.remove('show');document.body.style.overflow='';}}
            }
            
            function limpiarFiltrosDesdeModal(){
                const fm=document.getElementById('filtroFamiliaModal'),am=document.getElementById('filtroAcabadoModal'),mm=document.getElementById('filtroMaterialModal');
                if(fm) fm.value='';
                if(am) am.value='';
                if(mm) mm.value='';
                if(typeof limpiarFiltrosOutlet==='function') limpiarFiltrosOutlet();
                if(window.innerWidth<=768){const m=document.getElementById('filtrosModal');if(m){m.classList.remove('show');document.body.style.overflow='';}}
            }
            
            // Protección de imágenes y contenido
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
            });
            
            document.addEventListener('dragstart', function(e) {
                e.preventDefault();
                return false;
            });
            
            document.addEventListener('keydown', function(e) {
                if (e.key === 'F12') { e.preventDefault(); return false; }
                if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
                if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
                if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
                if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
            });
            
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.msUserSelect = 'none';
            
            function protegerImagenes() {
                document.querySelectorAll('img').forEach(img => {
                    img.setAttribute('draggable', 'false');
                    img.addEventListener('dragstart', (e) => { e.preventDefault(); return false; });
                    img.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
                });
            }
            
            protegerImagenes();
            const observerImagenesProt = new MutationObserver(() => protegerImagenes());
            observerImagenesProt.observe(document.body, { childList: true, subtree: true });
            
            // Escaneo QR con cámara trasera
            let html5QrCode = null;
            let escaneoActivo = false;
            
            function detenerEscaneoQR() {
                if (html5QrCode && escaneoActivo) {
                    html5QrCode.stop().then(() => {
                        escaneoActivo = false;
                        html5QrCode = null;
                    }).catch(err => console.error(err));
                }
            }
            
            function iniciarEscaneoQR() {
                const modalQR = document.getElementById('modalQR');
                const readerElement = document.getElementById('qr-reader');
                if (!modalQR || !readerElement) return;
                readerElement.innerHTML = '';
                modalQR.style.display = 'flex';
                
                if (typeof Html5Qrcode === 'undefined') {
                    modalQR.style.display = 'none';
                    mostrarModal('Error', 'Biblioteca QR no cargada', 'error');
                    return;
                }
                
                html5QrCode = new Html5Qrcode("qr-reader");
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        detenerEscaneoQR();
                        if (modalQR) modalQR.style.display = 'none';
                        const searchInput = document.getElementById('searchOutlet');
                        if (searchInput) {
                            searchInput.value = decodedText;
                            if (typeof aplicarFiltrosOutlet === 'function') aplicarFiltrosOutlet();
                        }
                        mostrarModal('✅ Código encontrado', decodedText, 'success');
                    },
                    (errorMessage) => {}
                ).catch(err => {
                    console.error('Error al iniciar cámara:', err);
                    modalQR.style.display = 'none';
                    escaneoActivo = false;
                    mostrarModal('Error de cámara', 'No se pudo acceder a la cámara trasera', 'error');
                });
                escaneoActivo = true;
            }
            
            function cerrarModalQR() {
                detenerEscaneoQR();
                const modalQR = document.getElementById('modalQR');
                if (modalQR) modalQR.style.display = 'none';
            }
            
            // Inicializar eventos
            document.addEventListener('DOMContentLoaded', function() {
                const btnEscanear = document.getElementById('btnEscanearQR');
                const btnCerrarQR = document.getElementById('btnCerrarQR');
                const modalQR = document.getElementById('modalQR');
                
                if (btnEscanear) btnEscanear.onclick = iniciarEscaneoQR;
                if (btnCerrarQR) btnCerrarQR.onclick = cerrarModalQR;
                if (modalQR) modalQR.onclick = (e) => { if (e.target === modalQR) cerrarModalQR(); };
                
                const btnLimpiarTodo = document.getElementById('btnLimpiarTodoOutlet');
                const searchInput = document.getElementById('searchOutlet');
                const familiaSelect = document.getElementById('filtroFamilia');
                const acabadoSelect = document.getElementById('filtroAcabado');
                const materialSelect = document.getElementById('filtroMaterial');

                const actualizarBotonLimpiarTodo = () => {
                    if (btnLimpiarTodo) {
                        const hayFiltrosActivos = (familiaSelect && familiaSelect.value !== '') ||
                                                (acabadoSelect && acabadoSelect.value !== '') ||
                                                (materialSelect && materialSelect.value !== '') ||
                                                (searchInput && searchInput.value !== '');
                        
                        btnLimpiarTodo.style.display = hayFiltrosActivos ? 'inline-flex' : 'none';
                    }
                };

                if (btnLimpiarTodo) {
                    btnLimpiarTodo.addEventListener('click', function() {
                        // Limpiar búsqueda
                        if (searchInput) {
                            searchInput.value = '';
                            if (btnLimpiarBusqueda) btnLimpiarBusqueda.style.display = 'none';
                        }
                        
                        // Limpiar selects
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
                        btnLimpiarTodo.style.display = 'none';
                    });
                }                

                let timeoutBusqueda = null;
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        clearTimeout(timeoutBusqueda);
                        timeoutBusqueda = setTimeout(() => {
                            if (typeof aplicarFiltrosOutlet === 'function') aplicarFiltrosOutlet();
                        }, 400);
                    });
                }
                
                const aplicarFiltros = () => {
                    syncModalSelects();
                    if (typeof aplicarFiltrosOutlet === 'function') aplicarFiltrosOutlet();
                };
                
                if (familiaSelect) familiaSelect.addEventListener('change', aplicarFiltros);
                if (acabadoSelect) acabadoSelect.addEventListener('change', aplicarFiltros);
                if (materialSelect) materialSelect.addEventListener('change', aplicarFiltros);
                
                syncModalSelects();
                
                // Lazy loading de imágenes
                if ('IntersectionObserver' in window) {
                    const imageObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const img = entry.target;
                                const dataSrc = img.getAttribute('data-src');
                                if (dataSrc) {
                                    img.src = dataSrc;
                                    img.removeAttribute('data-src');
                                    imageObserver.unobserve(img);
                                }
                            }
                        });
                    }, { rootMargin: '50px' });
                    
                    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
                } else {
                    document.querySelectorAll('img[data-src]').forEach(img => {
                        img.src = img.getAttribute('data-src');
                        img.removeAttribute('data-src');
                    });
                }
                
                // Scroll Top Button
                const scrollBtn = document.getElementById('scrollTopBtn');
                window.addEventListener('scroll', () => {
                    if (scrollBtn) {
                        if (window.scrollY > 300) {
                            scrollBtn.style.display = 'flex';
                        } else {
                            scrollBtn.style.display = 'none';
                        }
                    }
                });
            });
            
            // Countdown
            (function initCountdown(){
                const fi=new Date(2026,5,24),ff=new Date(2026,6,18),h=new Date();
                h.setHours(0,0,0,0);fi.setHours(0,0,0,0);ff.setHours(0,0,0,0);
                let td,mp="";
                if(h<fi){td=fi;mp="OFERTA PRÓXIMAMENTE";}
                else if(h>=fi&&h<=ff){td=ff;mp="OFERTA POR TIEMPO LIMITADO";}
                else{td=null;mp="OFERTA FINALIZADA";}
                const te=document.getElementById('countdownTitle');if(te)te.textContent=mp;
                if(!td) return;
                function u(){
                    const n=new Date(),d=td-n;
                    if(d<=0) return;
                    document.getElementById('countdown-days').textContent = Math.floor(d/86400000).toString().padStart(2,'0');
                    document.getElementById('countdown-hours').textContent = Math.floor((d%86400000)/3600000).toString().padStart(2,'0');
                    document.getElementById('countdown-minutes').textContent = Math.floor((d%3600000)/60000).toString().padStart(2,'0');
                    document.getElementById('countdown-seconds').textContent = Math.floor((d%60000)/1000).toString().padStart(2,'0');
                }
                u();setInterval(u,1000);
            })();
        </script>
    </body>
    </html>`;
    
    document.documentElement.innerHTML = html;
    
    setTimeout(() => {
        cargarSeleccionCotizacion();
        if (cotizacionSeleccionados && cotizacionSeleccionados.length > 0) {
            actualizarBarraFlotante();
            actualizarTodosLosBotonesCotizar();
        }
        
        if (typeof initCountdown === 'function') initCountdown();
        inicializarLazyLoading();
        
        // Precarga de asesores
        if (window.requestIdleCallback) {
            requestIdleCallback(() => { precargarAsesoresOutlet(); });
        } else {
            setTimeout(() => precargarAsesoresOutlet(), 2000);
        }
               
        // ============================================
        // CONFIGURACIÓN DEL ESCÁNER QR (AGREGAR ESTO)
        // ============================================
        const btnEscanear = document.getElementById('btnEscanearQR');
        const btnCerrarQR = document.getElementById('btnCerrarQR');
        const modalQR = document.getElementById('modalQR');
        
        if (btnEscanear) {
            const nuevoBtn = btnEscanear.cloneNode(true);
            btnEscanear.parentNode.replaceChild(nuevoBtn, btnEscanear);
            nuevoBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en botón escanear');
                iniciarEscaneoQR();  // Esta función debe estar definida arriba
            };
            console.log('✅ Botón escanear configurado');
        }
        
        if (btnCerrarQR) {
            const nuevoCerrar = btnCerrarQR.cloneNode(true);
            btnCerrarQR.parentNode.replaceChild(nuevoCerrar, btnCerrarQR);
            nuevoCerrar.onclick = function(e) {
                e.preventDefault();
                cerrarModalQR();
            };
        }
        
        if (modalQR) {
            modalQR.onclick = function(e) {
                if (e.target === modalQR) cerrarModalQR();
            };
        }
        
        window.iniciarEscaneoQR = iniciarEscaneoQR;
        window.cerrarModalQR = cerrarModalQR;
        
        // ============================================
        // BÚSQUEDA EN TIEMPO REAL CON BOTÓN DE LIMPIAR
        // ============================================
        const searchInputOutlet = document.getElementById('searchOutlet');
        const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
        let timeoutBusqueda = null;

        function toggleClearButton() {
            const inputActual = document.getElementById('searchOutlet');
            const btnActual = document.getElementById('btnLimpiarBusqueda');
            
            if (btnActual && inputActual) {
                if (inputActual.value.length > 0) {
                    btnActual.style.display = 'flex';
                } else {
                    btnActual.style.display = 'none';
                }
            }
        }

        function limpiarCampoBusqueda() {
            const inputActual = document.getElementById('searchOutlet');
            const btnActual = document.getElementById('btnLimpiarBusqueda');
            
            if (inputActual) {
                inputActual.value = '';
                if (btnActual) {
                    btnActual.style.display = 'none';
                }
                
                // Aplicar filtros para mostrar todos los productos
                if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                }
                
                // Dar foco al input
                inputActual.focus();
                
                console.log('🧹 Búsqueda limpiada');
            }
        }

        function ejecutarFiltroBusqueda() {
            const inputActual = document.getElementById('searchOutlet');
            console.log('🔍 Ejecutando filtro de búsqueda:', inputActual?.value);
            if (typeof window.aplicarFiltrosOutlet === 'function') {
                window.aplicarFiltrosOutlet();
            }
            if (typeof window.actualizarBotonLimpiarTodo === 'function') {
                window.actualizarBotonLimpiarTodo();
            }
        }

        // ============================================
        // CONFIGURAR INPUT (sin clonar para no romper referencias)
        // ============================================
        if (searchInputOutlet) {
            // Remover event listeners anteriores
            const nuevoInput = searchInputOutlet.cloneNode(true);
            searchInputOutlet.parentNode.replaceChild(nuevoInput, searchInputOutlet);
            
            // Asignar nuevos eventos al input
            nuevoInput.addEventListener('input', function(e) {
                console.log('✍️ Usuario escribió:', e.target.value);
                toggleClearButton();
                
                clearTimeout(timeoutBusqueda);
                timeoutBusqueda = setTimeout(() => {
                    ejecutarFiltroBusqueda();
                }, 300);
            });
            
            nuevoInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    limpiarCampoBusqueda();
                }
                if (e.key === 'Enter') {
                    clearTimeout(timeoutBusqueda);
                    ejecutarFiltroBusqueda();
                }
            });
            
            console.log('✅ Input de búsqueda configurado');
        }

        // ============================================
        // CONFIGURAR BOTÓN DE LIMPIAR (después del input)
        // ============================================
        setTimeout(() => {
            const btnActual = document.getElementById('btnLimpiarBusqueda');
            
            if (btnActual) {
                // Clonar para eliminar eventos anteriores
                const nuevoBtn = btnActual.cloneNode(true);
                btnActual.parentNode.replaceChild(nuevoBtn, btnActual);
                
                // Agregar evento al nuevo botón
                nuevoBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Click en botón limpiar');
                    limpiarCampoBusqueda();
                });
                
                console.log('✅ Botón limpiar configurado');
            }
        }, 50);

        // Inicializar estado del botón
        setTimeout(() => {
            toggleClearButton();
        }, 100);

        // Detectar scroll para mostrar/ocultar barra
        let ultimoScroll = 0;
        let temporizadorOcultar;
        
        window.addEventListener('scroll', () => {
            const barra = document.getElementById('barra-cotizacion');
            if (!barra) return;
            
            const scrollActual = window.scrollY;
            const alturaTotal = document.body.scrollHeight;
            const ventanaAltura = window.innerHeight;
            const estaAlFinal = scrollActual + ventanaAltura >= alturaTotal - 100;
            
            if (estaAlFinal) {
                barra.style.transform = 'translateY(0)';
                return;
            }
            
            if (scrollActual > ultimoScroll && scrollActual > 100) {
                clearTimeout(temporizadorOcultar);
                barra.style.transform = 'translateY(100%)';
                barra.style.transition = 'transform 0.3s ease';
            } else if (scrollActual < ultimoScroll) {
                clearTimeout(temporizadorOcultar);
                barra.style.transform = 'translateY(0)';
            } else {
                clearTimeout(temporizadorOcultar);
                temporizadorOcultar = setTimeout(() => {
                    if (barra.style.transform !== 'translateY(0)') {
                        barra.style.transform = 'translateY(0)';
                    }
                }, 2000);
            }
            
            ultimoScroll = scrollActual;
        });
        
        // Mostrar barra al hacer hover en desktop
        if (window.innerWidth > 768) {
            const barra = document.getElementById('barra-cotizacion');
            if (barra) {
                barra.addEventListener('mouseenter', () => {
                    barra.style.transform = 'translateY(0)';
                });
                barra.addEventListener('mouseleave', () => {
                    if (window.scrollY > 100) {
                        barra.style.transform = 'translateY(100%)';
                    }
                });
            }
        }

        console.log('✅ Outlet renderizado correctamente con todas las mejoras');
        
    }, 100);
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
                    <button onclick="toggleSeleccionCotizacion({id:'${p.id}', nombre:'${escapeHtml(p.nombre)}', codigo:'${p.codigo || ''}', imagen_principal:'${p.imagen_principal || ''}', slug:'${p.slug}'})" class="btn-cotizar" data-id="${p.id}" style="background: ${estaSeleccionado ? '#10b981' : '#39080a'}; color: white; border: none; padding: 8px 12px; border-radius: 40px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px;"><i class="fas ${estaSeleccionado ? 'fa-check-circle' : 'fa-plus-circle'}"></i>${estaSeleccionado ? 'Agregado' : 'Cotizar'}</button></div></div>
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
        *{margin:0;padding:0;box-sizing:border-box}:root{--primary:#39080a;--primary-dark:#2a0607;--secondary:#d4d4ae;--white:#fff;--gray-50:#fafafa;--gray-100:#f5f5f5;--gray-200:#eee;--gray-600:#666;--gray-800:#222;--blue-600:#2563eb;--blue-700:#1d4ed8}
        body{font-family:'Poppins',sans-serif;background:var(--gray-50);color:var(--gray-800)}.container{max-width:1280px;margin:0 auto;padding:0 24px}
        header{position:fixed;top:0;left:0;right:0;background:var(--primary);z-index:1000;padding:12px 0;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.navbar{display:flex;justify-content:space-between;align-items:center}.logo img{width:130px;height:auto}
        .hero-saldos{min-height:85vh;display:flex;align-items:center;background:linear-gradient(135deg,rgba(0,0,0,0.75),rgba(0,0,0,0.5)),url('${heroBackgroundImage}');background-size:cover;background-position:center;padding:120px 0 80px}
        .hero-title{font-size:3.5rem;font-weight:800;color:white;margin-bottom:16px}.hero-description{font-size:1.1rem;color:rgba(255,255,255,0.9);margin-bottom:32px}
        .countdown-container{background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:20px;padding:20px 30px;margin-bottom:32px;display:inline-block}.countdown{display:flex;gap:20px;justify-content:center}.countdown-item{text-align:center;background:rgba(0,0,0,0.6);border-radius:16px;padding:12px 16px;min-width:80px}.countdown-number{font-size:2.2rem;font-weight:800;color:white;font-family:monospace}.countdown-label{font-size:0.7rem;color:rgba(255,255,255,0.7)}
        .search-filters-section{background:white;border-radius:24px;margin:-40px auto 40px;padding:20px 24px}.search-box-enhanced{position:relative}.search-box-enhanced i{position:absolute;left:20px;top:50%;transform:translateY(-50%)}.search-box-enhanced input{width:100%;padding:16px 20px 16px 55px;border:2px solid var(--gray-200);border-radius:60px;font-size:1rem}
        .filtros-grid-enhanced{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}.filtro-group{flex:1;min-width:150px}.filtro-group select{width:100%;padding:14px 16px;border:1px solid var(--gray-200);border-radius:16px;background:var(--gray-50)}.btn-filter,.btn-clear{padding:12px 28px;border-radius:40px;font-weight:600;cursor:pointer;border:none}.btn-filter{background:var(--primary);color:white}.btn-clear{background:var(--gray-100);color:var(--gray-700)}
        .productos-grid-enhanced{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:20px}.producto-card{background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid var(--gray-200)}.card-image{position:relative;height:180px;overflow:hidden}.card-image img{width:100%;height:100%;object-fit:cover}.badge-saldos{position:absolute;top:10px;left:10px;background:linear-gradient(135deg,var(--blue-600),var(--blue-700));color:white;padding:4px 10px;border-radius:20px;font-size:0.65rem}.card-info{padding:12px}.card-info h3{font-size:0.9rem;font-weight:700;color:var(--primary)}.codigo{font-size:0.6rem;color:var(--gray-500)}.btn-detalle-enhanced{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--primary);color:white;padding:10px 12px;border-radius:40px;text-decoration:none;font-size:0.75rem;flex:1}.btn-cotizar{background:#39080a;color:white;border:none;padding:8px 12px;border-radius:40px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px}
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
    setTimeout(() => { if (typeof initCountdown === 'function') initCountdown(); }, 100);
}

function toggleSeleccionCotizacion(producto) {
    const existe = cotizacionSeleccionados.find(p => p.id === producto.id);
    
    if (existe) {
        cotizacionSeleccionados = cotizacionSeleccionados.filter(p => p.id !== producto.id);
    } else {
        cotizacionSeleccionados.push({
            id: producto.id,
            nombre: producto.nombre,
            codigo: producto.codigo,
            imagen: producto.imagen_principal,
            slug: producto.slug,
            cantidad: 1
        });
    }
    
    // Guardar en localStorage
    localStorage.setItem(cotizacionStorageKey, JSON.stringify(cotizacionSeleccionados));
    actualizarBarraFlotante();
    actualizarBotonCard(producto.id, existe);
}

function actualizarTodosLosBotonesCotizar() {
    const botones = document.querySelectorAll('.btn-cotizar');
    botones.forEach(btn => {
        const productoId = btn.getAttribute('data-id');
        const estaSeleccionado = cotizacionSeleccionados.some(item => item.id === productoId);
        
        if (estaSeleccionado) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado';
            btn.style.background = '#10b981';
            btn.style.color = 'white';
        } else {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
            btn.style.background = '#39080a';
            btn.style.color = 'white';
        }
    });
}

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
                background: linear-gradient(135deg, #39080a, #5a1a1d);
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
                color: #39080a;
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
                background: #39080a;
                color: white;
            }
            
            .qr-btn-primary:hover {
                background: #5a1a1d;
                transform: translateY(-2px);
            }
            
            .qr-btn-secondary {
                background: #d4d4ae;
                color: #39080a;
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
                confirmButtonColor: '#39080a',
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
