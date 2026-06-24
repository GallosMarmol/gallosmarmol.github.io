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
                --primary: #39080a;
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
    console.log('Renderizando página de Outlet con todas las funcionalidades mobile first');
    
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
    let iniciandoEscaneo = false; 
    let observerImagenes = null;
    let pasoActualCotizacion = 1;
    const PASOS_TOTALES = 4;
    let asesorSeleccionadoActual = null;
    let modoAsignacionActual = 'auto';
    
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
        
        if (url.includes('lh3.googleusercontent.com')) return url;
        
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
        
        imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E';
        imgElement.style.background = '#f0f0f0';
        
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
            document.querySelectorAll('img[data-src]').forEach(img => {
                cargarImagenConLazy(img, img.getAttribute('data-src'));
            });
        }
    }
    
    // ============================================
    // GENERAR CARDS CON LAZY LOADING - CORREGIDO
    // ============================================
    window.generarCardsOutlet = function(productosLista) {
        if (!productosLista || productosLista.length === 0) {
            return '<div class="no-results"><i class="fas fa-box-open"></i><p>No hay productos que coincidan con los filtros</p><button onclick="limpiarFiltrosOutlet()" class="btn-primary" style="margin-top: 16px;">Limpiar filtros</button></div>';
        }
        
        // Asegurarnos de que cotizacionSeleccionados esté actualizado
        const seleccionados = cotizacionSeleccionados || [];
        
        return productosLista.map(p => {
            // Verificar si el producto está en la lista de seleccionados
            const estaSeleccionado = seleccionados.some(item => item && item.id === p.id);
            const imagenUrl = optimizarGoogleDriveUrl(p.imagen_principal || CONFIG.DEFAULT_IMAGE, 'w300-h300');
            
            const nombreEscapado = escapeHtml(p.nombre || 'Producto');
            const codigoEscapado = escapeHtml(p.codigo || '');
            const imagenEscapada = escapeHtml(p.imagen_principal || '');
            const slugEscapado = escapeHtml(p.slug || p.id);
            const medidaEscapada = escapeHtml(p.medida || '');
            const espesorEscapado = escapeHtml(p.espesor || '');
            const productId = p.id;
            
            // Determinar estado del botón basado en cotizacionSeleccionados
            const btnTexto = estaSeleccionado ? 'Agregado ✓' : 'Cotizar';
            const btnIcono = estaSeleccionado ? 'fa-check-circle' : 'fa-plus-circle';
            const btnClase = estaSeleccionado ? 'btn-cotizar-bottom seleccionado' : 'btn-cotizar-bottom';
            
            return `
                <div class="producto-card" data-id="${productId}">
                    <div class="card-image" onclick="window.irDetalleProducto('${slugEscapado}')">
                        <img data-src="${imagenUrl}" 
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3C/svg%3E"
                            alt="${nombreEscapado}" 
                            loading="lazy"
                            class="lazy-image">
                    </div>
                    <div class="card-info">
                        <h3 onclick="window.irDetalleProducto('${slugEscapado}')" style="cursor:pointer;">${nombreEscapado}</h3>
                        <p class="codigo">${codigoEscapado || 'Sin código'}</p>
                        <div class="specs-badges">
                            ${p.medida ? `<span class="spec-badge"><i class="fas fa-ruler-combined"></i> ${escapeHtml(p.medida)}</span>` : ''}
                            ${p.espesor ? `<span class="spec-badge"><i class="fas fa-arrows-alt-h"></i> ${escapeHtml(p.espesor)}</span>` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                            <button onclick="window.toggleSeleccionCotizacionWrapper('${productId}', '${nombreEscapado.replace(/'/g, "\\'")}', '${codigoEscapado.replace(/'/g, "\\'")}', '${imagenEscapada.replace(/'/g, "\\'")}', '${slugEscapado.replace(/'/g, "\\'")}', '${medidaEscapada.replace(/'/g, "\\'")}', '${espesorEscapado.replace(/'/g, "\\'")}')" 
                                    class="${btnClase}" 
                                    data-id="${productId}">
                                <i class="fas ${btnIcono}"></i>
                                ${btnTexto}
                            </button>
                            <a href="/?producto=${slugEscapado}" class="btn-detalle-enhanced" onclick="event.stopPropagation();">
                                <span>Ver Detalle</span>
                                <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    // Función para ir al detalle del producto
    window.irDetalleProducto = function(slug) {
        if (slug) {
            window.location.href = `/?producto=${slug}`;
        }
    };
    
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
        
        actualizarChipsFiltrosActivos();
        
        const badge = document.getElementById('filtrosBadge');
        if (badge) { 
            if (activos > 0) { 
                badge.textContent = activos; 
                badge.style.display = 'inline-block'; 
            } else { 
                badge.style.display = 'none'; 
            } 
        }
        
        // Actualizar badge móvil
        const badgeMobile = document.getElementById('filtrosBadgeMobile');
        if (badgeMobile) {
            if (activos > 0) {
                badgeMobile.textContent = activos;
                badgeMobile.style.display = 'flex';
            } else {
                badgeMobile.style.display = 'none';
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
    
    // ============================================
    // CHIPS DE FILTROS ACTIVOS
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
            <span class="chip-filtro">
                ${f.label}
                <button onclick="window.eliminarFiltro('${f.type}')" class="chip-eliminar">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    }
    
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
        
        const badgeMobile = document.getElementById('filtrosBadgeMobile');
        if (badgeMobile) badgeMobile.style.display = 'none';
        
        actualizarChipsFiltrosActivos();
        
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
    // CONFIGURACIÓN DE BÚSQUEDA MEJORADA
    // ============================================
    function configurarBusquedaOutlet() {
        const searchInput = document.getElementById('searchOutlet');
        const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
        const btnLimpiarExterno = document.getElementById('btnLimpiarBusquedaExterno');
        
        if (!searchInput) {
            console.warn('⚠️ Input de búsqueda no encontrado');
            return;
        }

        // Variable para el timeout del debounce
        let timeoutBusqueda = null;

        // Función para toggle del botón de limpiar
        function toggleClearButton() {
            const tieneTexto = searchInput.value && searchInput.value.trim().length > 0;
            
            // Botón interno (visible en móvil)
            if (btnLimpiarBusqueda) {
                btnLimpiarBusqueda.style.display = (tieneTexto && window.innerWidth <= 768) ? 'flex' : 'none';
            }
            
            // Botón externo (visible en desktop y móvil)
            if (btnLimpiarExterno) {
                if (tieneTexto) {
                    btnLimpiarExterno.style.display = 'flex';
                    btnLimpiarExterno.classList.add('visible');
                    btnLimpiarExterno.classList.remove('hidden');
                } else {
                    btnLimpiarExterno.style.display = 'none';
                    btnLimpiarExterno.classList.remove('visible');
                    btnLimpiarExterno.classList.add('hidden');
                }
            }
        }

        // Función para limpiar el campo
        function limpiarCampoBusqueda() {
            searchInput.value = '';
            toggleClearButton();
            
            // Disparar evento de input para actualizar filtros
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
            
            // Aplicar filtros inmediatamente
            if (typeof window.aplicarFiltrosOutlet === 'function') {
                window.aplicarFiltrosOutlet();
            }
            
            searchInput.focus();
        }

        // ============================================
        // EVENTO INPUT - FILTRADO AUTOMÁTICO CON DEBOUNCE
        // ============================================
        searchInput.addEventListener('input', function(e) {
            const valor = this.value;
            console.log(`🔍 Búsqueda: "${valor}"`);
            
            // Mostrar/ocultar botón de limpiar
            toggleClearButton();
            
            // Limpiar timeout anterior
            if (timeoutBusqueda) {
                clearTimeout(timeoutBusqueda);
            }
            
            // Aplicar filtros con debounce de 300ms
            timeoutBusqueda = setTimeout(() => {
                if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                }
                
                // Actualizar chips de filtros activos
                if (typeof window.actualizarChipsFiltrosActivos === 'function') {
                    window.actualizarChipsFiltrosActivos();
                }
                
                timeoutBusqueda = null;
            }, 300);
        });

        // ============================================
        // EVENTO KEYDOWN - TECLAS ESPECIALES
        // ============================================
        searchInput.addEventListener('keydown', function(e) {
            // Escape: limpiar búsqueda
            if (e.key === 'Escape') {
                e.preventDefault();
                limpiarCampoBusqueda();
            }
            
            // Enter: aplicar filtros inmediatamente (sin esperar debounce)
            if (e.key === 'Enter') {
                e.preventDefault();
                if (timeoutBusqueda) {
                    clearTimeout(timeoutBusqueda);
                    timeoutBusqueda = null;
                }
                if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                }
            }
        });

        // ============================================
        // EVENTO FOCUS - MOSTRAR BOTÓN DE LIMPIAR SI HAY TEXTO
        // ============================================
        searchInput.addEventListener('focus', function() {
            toggleClearButton();
        });

        // ============================================
        // EVENTO BLUR - OCULTAR BOTÓN SI ESTÁ VACÍO
        // ============================================
        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (!this.value || this.value.trim().length === 0) {
                    if (btnLimpiarExterno) {
                        btnLimpiarExterno.style.display = 'none';
                        btnLimpiarExterno.classList.remove('visible');
                        btnLimpiarExterno.classList.add('hidden');
                    }
                    if (btnLimpiarBusqueda) {
                        btnLimpiarBusqueda.style.display = 'none';
                    }
                }
            }, 200);
        });

        // ============================================
        // CONFIGURAR BOTÓN DE LIMPIAR INTERNO
        // ============================================
        if (btnLimpiarBusqueda) {
            // Clonar para eliminar event listeners previos
            const nuevoBtnInterno = btnLimpiarBusqueda.cloneNode(true);
            btnLimpiarBusqueda.parentNode.replaceChild(nuevoBtnInterno, btnLimpiarBusqueda);
            
            nuevoBtnInterno.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                limpiarCampoBusqueda();
            });
        }

        // ============================================
        // CONFIGURAR BOTÓN DE LIMPIAR EXTERNO
        // ============================================
        if (btnLimpiarExterno) {
            const nuevoBtnExterno = btnLimpiarExterno.cloneNode(true);
            btnLimpiarExterno.parentNode.replaceChild(nuevoBtnExterno, btnLimpiarExterno);
            
            nuevoBtnExterno.addEventListener('click', function(e) {
                e.preventDefault();
                limpiarCampoBusqueda();
            });
        }

        // ============================================
        // CONFIGURAR BOTÓN DE ESCANEO QR (si existe)
        // ============================================
        const btnEscanear = document.getElementById('btnEscanearQR');
        if (btnEscanear) {
            btnEscanear.addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof window.iniciarEscaneoQR === 'function') {
                    window.iniciarEscaneoQR();
                }
            });
        }

        // Estado inicial
        toggleClearButton();
        
        console.log('✅ Búsqueda configurada correctamente');
    }

    // ============================================
    // EXPONER FUNCIONES GLOBALES PARA EL HTML
    // ============================================
    window.limpiarCampoBusqueda = function() {
        const searchInput = document.getElementById('searchOutlet');
        if (searchInput) {
            searchInput.value = '';
            // Disparar evento input
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
            // Aplicar filtros
            if (typeof window.aplicarFiltrosOutlet === 'function') {
                window.aplicarFiltrosOutlet();
            }
            searchInput.focus();
        }
    };

    window.configurarBusquedaOutlet = configurarBusquedaOutlet;

    // ============================================
    // FUNCIONES DE MODALES DE FILTROS - CORREGIDAS
    // ============================================
    window.openFiltrosModal = function() {
        console.log('📱 Abriendo modal de filtros...');
        
        // Solo permitir en móvil
        if (window.innerWidth > 768) {
            console.log('📱 Los filtros móviles solo están disponibles en dispositivos móviles');
            return;
        }
        
        const modal = document.getElementById('filtrosModal');
        const overlay = document.getElementById('filtrosModalOverlay');
        
        // Sincronizar selects
        syncModalSelects();
        
        // ✅ MOSTRAR OVERLAY
        if (overlay) {
            overlay.style.display = 'block';
            // Forzar reflow para animación
            void overlay.offsetWidth;
            overlay.classList.add('show');
        }
        
        // Mostrar modal
        if (modal) {
            modal.classList.add('show');
            modal.style.right = '0';
        }
        
        // Bloquear scroll
        document.body.style.overflow = 'hidden';
        
        console.log('✅ Modal de filtros abierto');
    };
    
    window.closeFiltrosModal = function() {
    console.log('🔒 Cerrando modal de filtros...');
        
        const modal = document.getElementById('filtrosModal');
        const overlay = document.getElementById('filtrosModalOverlay');
        
        // Cerrar modal
        if (modal) {
            modal.classList.remove('show');
            modal.style.right = '-100%'; // Asegurar que se oculte
        }
        
        // ✅ OCULTAR OVERLAY COMPLETAMENTE
        if (overlay) {
            overlay.classList.remove('show');
            overlay.style.display = 'none'; // ← Esto es lo que faltaba
        }
        
        // Restaurar scroll
        document.body.style.overflow = '';
        
        console.log('✅ Modal de filtros cerrado correctamente');
    }
    
    // Sincronizar selects entre desktop y móvil
    window.syncModalSelects = function() {
        const familiaDesktop = document.getElementById('filtroFamilia');
        const acabadoDesktop = document.getElementById('filtroAcabado');
        const materialDesktop = document.getElementById('filtroMaterial');
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        
        if (familiaDesktop && familiaModal) {
            familiaModal.value = familiaDesktop.value;
        }
        if (acabadoDesktop && acabadoModal) {
            acabadoModal.value = acabadoDesktop.value;
        }
        if (materialDesktop && materialModal) {
            materialModal.value = materialDesktop.value;
        }
    };
    
    window.aplicarFiltrosDesdeModal = function() {
        console.log('✅ Aplicando filtros desde modal...');
        
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        const familiaDesktop = document.getElementById('filtroFamilia');
        const acabadoDesktop = document.getElementById('filtroAcabado');
        const materialDesktop = document.getElementById('filtroMaterial');
        
        // Sincronizar selects
        if (familiaDesktop && familiaModal) familiaDesktop.value = familiaModal.value;
        if (acabadoDesktop && acabadoModal) acabadoDesktop.value = acabadoModal.value;
        if (materialDesktop && materialModal) materialDesktop.value = materialModal.value;
        
        // Aplicar filtros
        if (typeof window.aplicarFiltrosOutlet === 'function') {
            window.aplicarFiltrosOutlet();
        }
        
        // ✅ CERRAR MODAL CORRECTAMENTE
        closeFiltrosModal();
        
        console.log('✅ Filtros aplicados y modal cerrado');
    };
    
    window.limpiarFiltrosDesdeModal = function() {
        console.log('🧹 Limpiando filtros desde modal...');
        
        const familiaModal = document.getElementById('filtroFamiliaModal');
        const acabadoModal = document.getElementById('filtroAcabadoModal');
        const materialModal = document.getElementById('filtroMaterialModal');
        
        if (familiaModal) familiaModal.value = '';
        if (acabadoModal) acabadoModal.value = '';
        if (materialModal) materialModal.value = '';
        
        if (typeof window.limpiarFiltrosOutlet === 'function') {
            window.limpiarFiltrosOutlet();
        }
        
        // ✅ CERRAR MODAL CORRECTAMENTE
        closeFiltrosModal();
        
        console.log('✅ Filtros limpiados y modal cerrado');
    };
    
    // ============================================
    // CONFIGURAR EVENTOS DEL MODAL DE FILTROS
    // ============================================
    function configurarEventosFiltros() {
        console.log('🔧 Configurando eventos de filtros...');
        
        const overlay = document.getElementById('filtrosModalOverlay');
        const modal = document.getElementById('filtrosModal');
        const btnCerrar = document.querySelector('.close-modal-btn');
        
        // ✅ Clic en overlay (fondo negro)
        if (overlay) {
            const nuevoOverlay = overlay.cloneNode(true);
            overlay.parentNode.replaceChild(nuevoOverlay, overlay);
            
            nuevoOverlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    console.log('🖱️ Click en overlay de filtros');
                    closeFiltrosModal();
                }
            });
            console.log('✅ Evento overlay configurado');
        }
        
        // ✅ Botón de cerrar (X)
        if (btnCerrar) {
            const nuevoBtn = btnCerrar.cloneNode(true);
            btnCerrar.parentNode.replaceChild(nuevoBtn, btnCerrar);
            
            nuevoBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en cerrar (X)');
                closeFiltrosModal();
            });
            console.log('✅ Botón cerrar (X) configurado');
        }
        
        // ✅ Tecla Escape
        document.removeEventListener('keydown', handleEscapeFiltros);
        document.addEventListener('keydown', handleEscapeFiltros);
        console.log('✅ Tecla Escape configurada para filtros');
        
        console.log('✅ Eventos de filtros configurados correctamente');
    }

    // ============================================
    // MANEJADOR DE TECLA ESCAPE PARA FILTROS
    // ============================================
    function handleEscapeFiltros(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('filtrosModal');
            if (modal && modal.classList.contains('show')) {
                console.log('🟥 Escape presionado - cerrando filtros');
                closeFiltrosModal();
            }
        }
    }

    // EXPONER FUNCIONES
    window.configurarEventosFiltros = configurarEventosFiltros;


    window.scrollToTop = function() { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };
    
    // ============================================
    // FUNCIONES DE MODALES PERSONALIZADOS - CORREGIDAS
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
                modal.style.display = 'none';
                modal.classList.remove('active');
                document.body.style.overflow = '';
                resolve(resultado);
            };
            
            nuevoBtnConfirm.onclick = () => cerrar({ isConfirmed: true });
            if (btnCancel) btnCancel.onclick = () => cerrar({ isConfirmed: false });
            
            modal.onclick = (e) => {
                if (e.target === modal) cerrar({ isConfirmed: false });
            };
            
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
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
        console.log('🧹 Ejecutando limpieza de cotización...');
        
        cotizacionSeleccionados = [];
        localStorage.removeItem(CONFIG.COTIZACION_STORAGE_KEY);
        
        // ✅ ACTUALIZAR TODOS LOS COMPONENTES
        actualizarTodosLosBotonesCotizar();
        actualizarBarraFlotante();
        actualizarBadgeHeader();
        
        // ✅ Mostrar feedback
        mostrarToast('Todos los productos han sido removidos de tu cotización', 'error');
        
        console.log('✅ Limpieza completada');
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
        
    // ============================================
    // ACTUALIZAR TODOS LOS BOTONES - CORREGIDO
    // ============================================
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
        
        // Buscar todos los botones de cotizar (tanto en la posición vieja como nueva)
        const botones = document.querySelectorAll('.btn-cotizar-bottom, .btn-cotizar-top');
        console.log(`🔍 Encontrados ${botones.length} botones para actualizar`);
        
        botones.forEach(btn => {
            const productoId = btn.getAttribute('data-id');
            if (!productoId) return;
            
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


    // ============================================
    // CARGA DE COTIZACIÓN DESDE LOCALSTORAGE
    // ============================================
    function cargarSeleccionCotizacion() {
        const guardado = localStorage.getItem(CONFIG.COTIZACION_STORAGE_KEY);
        if (guardado) {
            try {
                cotizacionSeleccionados = JSON.parse(guardado);
                console.log('📦 Cotización cargada desde localStorage:', cotizacionSeleccionados.length, 'productos');
                return cotizacionSeleccionados;
            } catch(e) { 
                console.error('Error cargando cotización:', e);
                cotizacionSeleccionados = [];
                return [];
            }
        } else {
            cotizacionSeleccionados = [];
            return [];
        }
    }

    function actualizarBadgeHeader() {
        const badge = document.getElementById('headerCotizacionBadge');
        const contador = document.getElementById('headerContador');
        const total = cotizacionSeleccionados?.length || 0;
        
        if (badge && contador) {
            if (total > 0) {
                badge.style.display = 'flex';
                contador.textContent = total;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // ============================================
    // ACTUALIZAR BARRA DE COTIZACIÓN CON ANIMACIÓN
    // ============================================
    function actualizarBarraFlotante() {
        let barra = document.getElementById('barra-cotizacion');
        const total = cotizacionSeleccionados.length;
        
        if (!barra && total > 0) {
            // Crear barra con animación de entrada
            barra = document.createElement('div');
            barra.id = 'barra-cotizacion';
            barra.className = 'barra-cotizacion mini';
            barra.style.animation = 'slideUp 0.5s ease';
            
            barra.innerHTML = `
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
                        <button class="btn-cotizar-principal" id="btn-cotizar-principal">
                            <i class="fab fa-whatsapp"></i> Cotizar ahora
                        </button>
                        <button class="btn-expandir" id="btn-expandir-barra">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </div>
                </div>
                
                <div class="barra-cotizacion-expanded" style="display: none;">
                    <div class="barra-productos-preview" id="preview-productos">
                        ${generarPreviewProductos()}
                    </div>
                    <div class="barra-acciones-expanded">
                        <button class="btn-limpiar" id="btn-limpiar-barra">
                            <i class="fas fa-trash-alt"></i> Limpiar todo
                        </button>
                        <button class="btn-ver-cotizacion" id="btn-ver-cotizacion-expanded">
                            <i class="fas fa-file-invoice"></i> Ver cotización
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(barra);
            configurarEventosBarra(barra);
            
            const alturaBarra = barra.offsetHeight;
            document.body.style.paddingBottom = `${alturaBarra + 10}px`;
            
        } else if (barra && total === 0) {
            // Ocultar barra con animación
            barra.style.animation = 'slideDown 0.3s ease forwards';
            setTimeout(() => {
                barra.remove();
                document.body.style.paddingBottom = '';
            }, 300);
            
        } else if (barra && total > 0) {
            // Actualizar contador con animación
            const badge = document.getElementById('badge-cantidad');
            if (badge) {
                badge.textContent = total;
                badge.classList.remove('animado');
                // Forzar reflow para reiniciar animación
                void badge.offsetWidth;
                badge.classList.add('animado');
            }
            
            const contadorMini = document.getElementById('contador-cotizacion-mini');
            if (contadorMini) {
                contadorMini.textContent = total;
            }
            
            // Actualizar vista expandida si está visible
            const expandedSection = barra.querySelector('.barra-cotizacion-expanded');
            if (expandedSection && expandedSection.style.display !== 'none') {
                const previewContainer = document.getElementById('preview-productos');
                if (previewContainer) {
                    previewContainer.innerHTML = generarPreviewProductos();
                }
            }
            
            // Hacer que la barra "respire" cuando hay productos
            barra.style.animation = 'none';
            setTimeout(() => {
                barra.style.animation = 'barraUpdate 0.4s ease';
            }, 10);
        }
        
        actualizarBadgeHeader();
    }

    function generarPreviewProductos() {
        if (!cotizacionSeleccionados || cotizacionSeleccionados.length === 0) {
            return '<div class="preview-item" style="justify-content: center; color: #999;">No hay productos seleccionados</div>';
        }
        
        let html = '';
        cotizacionSeleccionados.forEach((p, index) => {
            html += `
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
            `;
        });
        
        return html;
    }

    function configurarEventosBarra(barra) {
        const btnCotizarPrincipal = document.getElementById('btn-cotizar-principal');
        const btnExpandir = document.getElementById('btn-expandir-barra');
        const expandedSection = barra.querySelector('.barra-cotizacion-expanded');
        const miniSection = barra.querySelector('.barra-cotizacion-mini');
        
        if (btnCotizarPrincipal) {
            btnCotizarPrincipal.onclick = () => window.abrirModalCotizacion();
        }
        
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
                    if (previewContainer) {
                        previewContainer.innerHTML = generarPreviewProductos();
                    }
                    
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
        
        // Gestos de arrastre para expandir/colapsar en móvil
        let startY = 0;
        let isDragging = false;
        
        barra.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
        }, { passive: true });
        
        barra.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const currentY = e.touches[0].clientY;
            const diff = startY - currentY;
            
            if (diff > 50) {
                if (expandedSection.style.display === 'none' || expandedSection.style.display === '') {
                    btnExpandir?.click();
                }
                isDragging = false;
            } else if (diff < -50) {
                if (expandedSection.style.display !== 'none') {
                    btnExpandir?.click();
                }
                isDragging = false;
            }
        }, { passive: true });
        
        barra.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });
        
        const btnLimpiar = document.getElementById('btn-limpiar-barra');
        const btnVerCotizacion = document.getElementById('btn-ver-cotizacion-expanded');
        
        if (btnLimpiar) {
            btnLimpiar.onclick = () => window.limpiarCotizacion();
        }
        
        if (btnVerCotizacion) {
            btnVerCotizacion.onclick = () => window.abrirModalCotizacion();
        }
    }

    window.addEventListener('resize', () => {
        const barra = document.getElementById('barra-cotizacion');
        if (barra) {
            const altura = barra.offsetHeight;
            document.body.style.paddingBottom = `${altura + 10}px`;
        }
    });    

    // ============================================
    // ACTUALIZAR BOTÓN DE LA CARD
    // ============================================
    function actualizarBotonCard(productoId, estabaSeleccionado) {
        const btn = document.querySelector(`.btn-cotizar-bottom[data-id="${productoId}"]`);
        if (btn) {
            if (!estabaSeleccionado) {
                // Cambiar a estado "Agregado"
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Agregado ✓';
                btn.classList.add('seleccionado');
                // Animación de escala
                btn.style.animation = 'none';
                setTimeout(() => {
                    btn.style.animation = 'btnAgregadoPulse 0.5s ease';
                }, 10);
            } else {
                // Cambiar a estado "Cotizar"
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.classList.remove('seleccionado');
                btn.style.animation = 'none';
            }
        }
    }
    
    // ============================================
    // TOAST NOTIFICACIONES MEJORADAS
    // ============================================
    function mostrarToast(mensaje, tipo = 'success') {
        // Eliminar toast anterior
        const toastExistente = document.querySelector('.toast-notificacion');
        if (toastExistente) toastExistente.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast-notificacion ${tipo === 'error' ? 'error' : 'success'}`;
        
        // Icono según tipo
        const icono = tipo === 'error' ? 'fa-times-circle' : 'fa-check-circle';
        toast.innerHTML = `<i class="fas ${icono}"></i> ${mensaje}`;
        
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // ============================================
    // TOGGLE SELECCIÓN CON PERSISTENCIA
    // ============================================
    function toggleSeleccionCotizacion(producto) {
        if (!producto || !producto.id) {
            console.error('Producto inválido:', producto);
            return;
        }
        
        console.log('🔄 Toggle producto:', producto.nombre);
        
        // Buscar si ya existe
        const existe = cotizacionSeleccionados.find(p => p.id === producto.id);
        const productoCompleto = window.outletProductosCache.find(p => p.id === producto.id);
        
        if (existe) {
            // REMOVER PRODUCTO
            cotizacionSeleccionados = cotizacionSeleccionados.filter(p => p.id !== existe.id);
            localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(cotizacionSeleccionados));
            
            // ✅ ACTUALIZAR UI
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
            
            cotizacionSeleccionados.push(nuevoProducto);
            localStorage.setItem(CONFIG.COTIZACION_STORAGE_KEY, JSON.stringify(cotizacionSeleccionados));
            
            // ✅ ACTUALIZAR UI
            actualizarTodosLosBotonesCotizar();
            actualizarBarraFlotante();
            actualizarBadgeHeader();
            
            // Mostrar modal de confirmación
            mostrarModalConfirmacionAgregado(producto.nombre);
        }
    }

    window.toggleSeleccionCotizacion = toggleSeleccionCotizacion;
    
    // ============================================
    // MODAL DE CONFIRMACIÓN CON ANIMACIÓN
    // ============================================
    function mostrarModalConfirmacionAgregado(nombreProducto) {
        // Crear modal dinámico
        const modalHtml = `
            <div id="modalConfirmacionAgregado" class="modal-confirmacion-agregado">
                <div class="modal-confirmacion-contenido">
                    <div class="modal-confirmacion-icono">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>¡Producto agregado!</h3>
                    <p>"${escapeHtml(nombreProducto)}" ha sido añadido a tu cotización</p>
                    <div class="modal-confirmacion-acciones">
                        <button onclick="window.cerrarModalConfirmacion()" class="btn-seguir-comprando">
                            <i class="fas fa-shopping-bag"></i> Seguir comprando
                        </button>
                        <button onclick="window.irACotizacion()" class="btn-ir-cotizacion">
                            <i class="fas fa-file-invoice"></i> Ver cotización
                        </button>
                    </div>
                    <div class="modal-confirmacion-barra">
                        <span>Encuentra tus productos en la <strong>barra de cotización</strong> en la parte inferior</span>
                    </div>
                </div>
            </div>
        `;
        
        // Eliminar modal anterior si existe
        const modalExistente = document.getElementById('modalConfirmacionAgregado');
        if (modalExistente) modalExistente.remove();
        
        // Insertar modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar con animación
        const modal = document.getElementById('modalConfirmacionAgregado');
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            cerrarModalConfirmacion();
        }, 5000);
        
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModalConfirmacion();
            }
        });
    }

    // ============================================
    // CERRAR MODAL DE CONFIRMACIÓN
    // ============================================
    function cerrarModalConfirmacion() {
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
        cerrarModalConfirmacion();
        window.abrirModalCotizacion();
    }

    window.toggleSeleccionCotizacion = toggleSeleccionCotizacion;
    window.actualizarBarraFlotante = actualizarBarraFlotante;
    window.actualizarChipsFiltrosActivos = actualizarChipsFiltrosActivos;
    window.actualizarBadgeHeader = actualizarBadgeHeader;
    window.mostrarModalConfirmacionAgregado = mostrarModalConfirmacionAgregado;
    window.cerrarModalConfirmacion = cerrarModalConfirmacion;
    window.irACotizacion = irACotizacion;
    window.mostrarToast = mostrarToast;
    
// ============================================
// FUNCIÓN PARA DETENER EL ESCÁNER QR
// ============================================
function detenerEscaneoQR() {
    console.log('🛑 Deteniendo escáner QR...');
    
    if (html5QrCode && escaneoActivo) {
        try {
            html5QrCode.stop().then(() => {
                console.log('✅ Escáner QR detenido correctamente');
                escaneoActivo = false;
                html5QrCode = null;
                iniciandoEscaneo = false;
                
                const readerElement = document.getElementById('qr-reader');
                if (readerElement) {
                    readerElement.innerHTML = '';
                }
            }).catch(err => {
                console.log('⚠️ Escáner ya detenido:', err);
                escaneoActivo = false;
                html5QrCode = null;
                iniciandoEscaneo = false;
                
                const readerElement = document.getElementById('qr-reader');
                if (readerElement) {
                    readerElement.innerHTML = '';
                }
            });
        } catch(e) {
            console.warn('Error al detener:', e);
            escaneoActivo = false;
            html5QrCode = null;
            iniciandoEscaneo = false;
            
            const readerElement = document.getElementById('qr-reader');
            if (readerElement) {
                readerElement.innerHTML = '';
            }
        }
    } else {
        escaneoActivo = false;
        html5QrCode = null;
        iniciandoEscaneo = false;
        
        const readerElement = document.getElementById('qr-reader');
        if (readerElement) {
            readerElement.innerHTML = '';
        }
    }
}

// ============================================
// FUNCIÓN PARA CERRAR EL MODAL QR - CORREGIDA
// ============================================
function cerrarModalQR() {
    console.log('🔒 Cerrando modal QR...');
    
    // Detener escáner
    detenerEscaneoQR();
    
    // Resetear flag inmediatamente
    iniciandoEscaneo = false;
    
    // Ocultar modal
    const modalQR = document.getElementById('modalQR');
    if (modalQR) {
        modalQR.style.display = 'none';
        modalQR.classList.remove('active');
        document.body.style.overflow = '';
        console.log('✅ Modal QR ocultado');
    } else {
        console.warn('⚠️ Modal QR no encontrado');
    }
}

// ============================================
// FUNCIÓN PARA INICIAR EL ESCANEO QR
// ============================================
async function iniciarEscaneoQR() {
    console.log('🔍 Intentando iniciar escaneo QR...');
    
    // Prevenir múltiples inicios
    if (iniciandoEscaneo) {
        console.warn('⚠️ Ya se está iniciando el escáner, ignorando solicitud');
        return;
    }
    
    if (escaneoActivo) {
        console.warn('⚠️ El escáner ya está activo, ignorando solicitud');
        return;
    }
    
    // Marcar que estamos iniciando
    iniciandoEscaneo = true;
    
    const modalQR = document.getElementById('modalQR');
    const readerElement = document.getElementById('qr-reader');
    
    if (!modalQR || !readerElement) {
        console.error('❌ Modal QR o reader no encontrado');
        iniciandoEscaneo = false;
        if (typeof mostrarModal === 'function') {
            mostrarModal('Error', 'No se pudo abrir el escáner', 'error');
        }
        return;
    }
    
    // Limpiar completamente el contenedor
    readerElement.innerHTML = '';
    
    // Mostrar modal
    modalQR.style.display = 'flex';
    modalQR.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Verificar que Html5Qrcode esté disponible
    if (typeof Html5Qrcode === 'undefined') {
        modalQR.style.display = 'none';
        modalQR.classList.remove('active');
        document.body.style.overflow = '';
        iniciandoEscaneo = false;
        if (typeof mostrarModal === 'function') {
            mostrarModal('Error', 'La biblioteca de escaneo QR no está cargada', 'error');
        }
        return;
    }
    
    try {
        console.log('📷 Creando instancia del escáner...');
        
        // Crear NUEVA instancia
        html5QrCode = new Html5Qrcode("qr-reader");
        
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        console.log('📷 Iniciando cámara...');
        
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                console.log('✅ QR escaneado:', decodedText);
                
                // Detener escáner y cerrar modal
                detenerEscaneoQR();
                cerrarModalQR();
                
                // Procesar el código
                const searchInput = document.getElementById('searchOutlet');
                if (searchInput) {
                    searchInput.value = decodedText;
                    
                    const btnClear = document.getElementById('btnLimpiarBusqueda');
                    if (btnClear) {
                        btnClear.style.display = 'flex';
                    }
                    
                    setTimeout(() => {
                        if (typeof window.aplicarFiltrosOutlet === 'function') {
                            window.aplicarFiltrosOutlet();
                        }
                    }, 100);
                }
                
                if (typeof mostrarModal === 'function') {
                    mostrarModal('Código encontrado', `Se encontró: ${decodedText}`, 'success', { timer: 2000, showConfirmButton: false });
                }
            },
            (errorMessage) => {
                // Ignorar errores de escaneo (normales)
                if (!errorMessage.includes('No MultiFormat Readers') && 
                    !errorMessage.includes('Could not find') &&
                    !errorMessage.includes('No QR code found')) {
                    console.log('🔍 Escaneando...', errorMessage);
                }
            }
        );
        
        escaneoActivo = true;
        iniciandoEscaneo = false;
        console.log('✅ Escáner QR iniciado correctamente');
        
    } catch (err) {
        console.error('❌ Error al iniciar escáner:', err);
        
        if (modalQR) {
            modalQR.style.display = 'none';
            modalQR.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        let mensajeError = 'No se pudo acceder a la cámara.';
        if (err.message?.includes('NotAllowedError')) {
            mensajeError = 'Permiso denegado para acceder a la cámara. Por favor, permite el acceso en la configuración del navegador.';
        } else if (err.message?.includes('NotFoundError')) {
            mensajeError = 'No se encontró una cámara en tu dispositivo.';
        } else if (err.message?.includes('NotReadableError')) {
            mensajeError = 'La cámara está siendo usada por otra aplicación.';
        }
        
        if (typeof mostrarModal === 'function') {
            mostrarModal('Error de cámara', mensajeError, 'error');
        }
        
        html5QrCode = null;
        escaneoActivo = false;
        iniciandoEscaneo = false;
        readerElement.innerHTML = '';
    }
}

// ============================================
// CONFIGURAR EVENTOS QR - ENFOQUE ALTERNATIVO
// ============================================
function configurarEventosQR() {
    console.log('🔧 Configurando eventos del modal QR (alternativo)...');
    
    // ============================================
    // BOTÓN CERRAR (X)
    // ============================================
    const btnCerrarQR = document.getElementById('btnCerrarQR');
    if (btnCerrarQR) {
        // Remover todos los event listeners anteriores
        const nuevoBtn = btnCerrarQR.cloneNode(true);
        btnCerrarQR.parentNode.replaceChild(nuevoBtn, btnCerrarQR);
        
        // Agregar nuevo event listener
        nuevoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🟥 Click en cerrar (X) - alternativo');
            
            // Llamar directamente a cerrarModalQR
            if (typeof window.cerrarModalQR === 'function') {
                window.cerrarModalQR();
            } else {
                // Fallback: cerrar manualmente
                const modalQR = document.getElementById('modalQR');
                if (modalQR) {
                    modalQR.style.display = 'none';
                    modalQR.classList.remove('active');
                    document.body.style.overflow = '';
                }
                // Detener escáner
                if (html5QrCode && escaneoActivo) {
                    html5QrCode.stop().catch(() => {});
                    escaneoActivo = false;
                    html5QrCode = null;
                }
                iniciandoEscaneo = false;
            }
        });
        console.log('✅ Botón cerrar (X) configurado (alternativo)');
    }
    
    // ============================================
    // BOTÓN CANCELAR
    // ============================================
    const btnCancelarQR = document.getElementById('btnCancelarQR');
    if (btnCancelarQR) {
        const nuevoBtn = btnCancelarQR.cloneNode(true);
        btnCancelarQR.parentNode.replaceChild(nuevoBtn, btnCancelarQR);
        
        nuevoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🟥 Click en cancelar - alternativo');
            
            // Llamar directamente a cerrarModalQR
            if (typeof window.cerrarModalQR === 'function') {
                window.cerrarModalQR();
            } else {
                // Fallback: cerrar manualmente
                const modalQR = document.getElementById('modalQR');
                if (modalQR) {
                    modalQR.style.display = 'none';
                    modalQR.classList.remove('active');
                    document.body.style.overflow = '';
                }
                // Detener escáner
                if (html5QrCode && escaneoActivo) {
                    html5QrCode.stop().catch(() => {});
                    escaneoActivo = false;
                    html5QrCode = null;
                }
                iniciandoEscaneo = false;
            }
        });
        console.log('✅ Botón cancelar configurado (alternativo)');
    }
}

// ============================================
// MANEJADOR DE TECLA ESCAPE
// ============================================
function handleEscapeKeyQR(e) {
    if (e.key === 'Escape') {
        const modalQR = document.getElementById('modalQR');
        if (modalQR && modalQR.style.display === 'flex') {
            console.log('🟥 Escape presionado');
            cerrarModalQR();
        }
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES - MUY IMPORTANTE
// ============================================
window.iniciarEscaneoQR = iniciarEscaneoQR;
window.cerrarModalQR = cerrarModalQR;
window.detenerEscaneoQR = detenerEscaneoQR;
window.configurarEventosQR = configurarEventosQR;
window.handleEscapeKeyQR = handleEscapeKeyQR;

console.log('✅ Funciones QR expuestas globalmente');
     

    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            const modalQR = document.getElementById('modalQR');
            if (modalQR && modalQR.style.display === 'flex') {
                cerrarModalQR();
            }
        }
    }

    // ============================================
    // FUNCIÓN DE ENVÍO DE COTIZACIÓN COMPLETA
    // ============================================
    async function enviarCotizacion(datosCliente, asesor) {
        console.log('🚀 INICIO de enviarCotizacion');
        console.log('📋 Datos cliente:', datosCliente);
        console.log('👤 Asesor:', asesor);
        
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
                cliente_email: datosCliente.email || null,
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
            
            const modalOverlay = document.querySelector('.modal-overlay.active');
            if (modalOverlay) modalOverlay.style.display = 'none';
            
            let productosLista = '';
            cotizacionSeleccionados.forEach((p, i) => {
                productosLista += `${i+1}. ${p.nombre}${p.codigo ? ` (${p.codigo})` : ''}\n`;
            });
            
            const mensaje = `*NUEVA COTIZACIÓN - OUTLET*

*N° Cotización:* ${numero}
*Fecha:* ${new Date().toLocaleString()}
*Asesor:* ${asesor.nombre}

*Cliente:* ${datosCliente.nombre}
*Email:* ${datosCliente.email || 'No especificado'}
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
                await mostrarModal('Cotización enviada', `Enviada a ${asesor.nombre}`, 'success', { timer: 3000, showConfirmButton: false });
            } else {
                await mostrarModal('No se pudo enviar', 'Cotización registrada exitosamente', 'warning', { confirmButtonText: 'Entendido' });
            }
            
            cotizacionSeleccionados = [];
            localStorage.removeItem(CONFIG.COTIZACION_STORAGE_KEY);

            actualizarTodosLosBotonesCotizar();

            actualizarBarraFlotante();
            
            actualizarBadgeHeader();

            document.querySelectorAll('.btn-cotizar-top').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cotizar';
                btn.classList.remove('seleccionado');
            });
            
            window.modoAsignacionActual = 'auto';
            window.asesorPreasignadoId = null;
            asesorSeleccionadoActual = null;
            
            window.clienteNombreCache = '';
            window.clienteEmailCache = '';
            window.clienteTelefonoCache = '';
            window.clienteEmpresaCache = '';
            window.ubicacionCache = '';
            window.observacionesCache = '';
            
        } catch (error) {
            const modalOverlay = document.querySelector('.modal-overlay.active');
            if (modalOverlay) modalOverlay.style.display = 'none';
            
            console.error('❌ Error detallado:', error);
            await mostrarModal('Error', 'Ocurrió un error al procesar la cotización: ' + (error.message || 'Error desconocido'), 'error');
        }
    }
    
    // ============================================
    // FUNCIONES DE COTIZACIÓN MODAL CON PASOS (STEPPER)
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
        
        pasoActualCotizacion = 1;
        
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
                
                await renderizarPasoCotizacion(1, vendedores);
                
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
    
    // ============================================
    // RENDERIZAR PASOS DE COTIZACIÓN (STEPPER)
    // ============================================
    async function renderizarPasoCotizacion(paso, vendedores) {
        const body = document.getElementById('modalCotizacionBody');
        if (!body) return;
        
        const nombresPasos = ['Productos', 'Asesor', 'Datos', 'Enviar'];
        
        let stepperHtml = `
            <div class="stepper-container">
                <div class="stepper">
                    ${nombresPasos.map((nombre, index) => {
                        const numPaso = index + 1;
                        let estado = '';
                        if (numPaso < paso) estado = 'completado';
                        else if (numPaso === paso) estado = 'activo';
                        else estado = 'pendiente';
                        
                        return `
                            <div class="stepper-step ${estado}" data-paso="${numPaso}">
                                <div class="stepper-circle">
                                    ${numPaso < paso ? '<i class="fas fa-check"></i>' : numPaso}
                                </div>
                                <div class="stepper-label">${nombre}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="stepper-line"></div>
            </div>
        `;
        
        let contenidoHtml = '';
        
        switch(paso) {
            case 1:
                contenidoHtml = await renderizarPasoProductos();
                break;
            case 2:
                contenidoHtml = await renderizarPasoAsesor(vendedores);
                break;
            case 3:
                contenidoHtml = await renderizarPasoDatos();
                break;
            case 4:
                contenidoHtml = await renderizarPasoEnviar(vendedores);
                break;
        }
        
        body.innerHTML = `
            ${stepperHtml}
            <div class="paso-contenido">
                ${contenidoHtml}
            </div>
            <div class="paso-acciones">
                ${paso > 1 ? `<button class="btn-paso-anterior" onclick="window.irPasoCotizacion(${paso - 1})"><i class="fas fa-arrow-left"></i> Anterior</button>` : ''}
                ${paso < 4 ? `<button class="btn-paso-siguiente" onclick="window.irPasoCotizacion(${paso + 1})">Siguiente <i class="fas fa-arrow-right"></i></button>` : ''}
                ${paso === 4 ? `<button class="btn-paso-enviar" id="btnEnviarCotizacionFinal"><i class="fab fa-whatsapp"></i> Enviar Cotización</button>` : ''}
            </div>
        `;
                
        if (paso === 4) {
            const btnEnviar = document.getElementById('btnEnviarCotizacionFinal');
            if (btnEnviar) {
                // ✅ IMPORTANTE: Remover event listeners anteriores
                const nuevoBtn = btnEnviar.cloneNode(true);
                btnEnviar.parentNode.replaceChild(nuevoBtn, btnEnviar);
                
                nuevoBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    console.log('📤 Click en enviar cotización');
                    console.log('📋 Datos guardados:', {
                        nombre: window.clienteNombreCache,
                        email: window.clienteEmailCache,
                        telefono: window.clienteTelefonoCache,
                        empresa: window.clienteEmpresaCache,
                        ubicacion: window.ubicacionCache,
                        observaciones: window.observacionesCache
                    });
                    
                    // ✅ USAR SOLO VARIABLES GLOBALES
                    const nombre = window.clienteNombreCache || '';
                    const email = window.clienteEmailCache || '';
                    const telefono = window.clienteTelefonoCache || '';
                    const empresa = window.clienteEmpresaCache || '';
                    const ubicacion = window.ubicacionCache || '';
                    const observaciones = window.observacionesCache || '';
                    
                    // Validar campos obligatorios
                    if (!nombre || nombre.trim().length < 3) {
                        mostrarModal('Campo incompleto', 
                            'El nombre completo es obligatorio y debe tener al menos 3 caracteres.', 
                            'warning');
                        return;
                    }
                    
                    if (!telefono || telefono.length < 7) {
                        mostrarModal('Campo incompleto', 
                            'El teléfono es obligatorio y debe tener al menos 7 dígitos.', 
                            'warning');
                        return;
                    }
                    
                    // Validar email si está presente
                    if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                        mostrarModal('Email inválido', 
                            'Ingresa un correo electrónico válido.', 
                            'warning');
                        return;
                    }
                    
                    // Obtener asesor seleccionado
                    let asesor = asesorSeleccionadoActual;
                    
                    if (!asesor) {
                        mostrarModal('Error', 
                            'No se pudo identificar al asesor. Por favor, intenta nuevamente.', 
                            'error');
                        return;
                    }
                    
                    // Preparar datos del cliente
                    const datosCliente = {
                        nombre: nombre.trim(),
                        email: email.trim() || null,
                        telefono: telefono,
                        empresa: empresa.trim() || null,
                        ubicacionProyecto: ubicacion || null,
                        observaciones: observaciones.trim() || null
                    };
                    
                    console.log('📤 Enviando cotización con datos:', datosCliente);
                    console.log('👤 Asesor:', asesor);
                    
                    // Cerrar modal y enviar
                    window.cerrarModalCotizacion();
                    await enviarCotizacion(datosCliente, asesor);
                });
            }
        }
    }
    
    // ============================================
    // RENDERIZAR PASO 1: PRODUCTOS
    // ============================================
    async function renderizarPasoProductos() {
        const productosHtml = cotizacionSeleccionados.map(p => {
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
                <p class="paso-subtitulo">${cotizacionSeleccionados.length} producto(s) en tu cotización</p>
                <div class="productos-lista">
                    ${productosHtml || '<p class="text-center text-gray-400 py-4">No hay productos seleccionados</p>'}
                </div>
                <button class="btn-agregar-mas" onclick="window.agregarMasProductos()">
                    <i class="fas fa-plus-circle"></i> Agregar más productos
                </button>
            </div>
        `;
    }
    
    // ============================================
    // OBTENER MEJOR ASESOR DISPONIBLE
    // ============================================
    function obtenerMejorAsesor(vendedores) {
        if (!vendedores || vendedores.length === 0) return null;
        
        // Ordenar por cantidad de leads asignados (menor es mejor)
        const ordenados = [...vendedores].sort((a, b) => {
            const leadsA = a.leads_asignados_hoy || 0;
            const leadsB = b.leads_asignados_hoy || 0;
            return leadsA - leadsB;
        });
        
        return ordenados[0];
    }

    // ============================================
    // FUNCIONES DE CONTROL DE ASESOR - PROPUESTA 1
    // ============================================

    // Cambiar modo de asignación
    window.setModoAsesor = function(modo) {
        console.log('🔄 Cambiando modo a:', modo);
        modoAsignacionActual = modo;
        
        if (modo === 'auto') {
            // Asignar automáticamente el mejor asesor
            const vendedores = asesoresPrecargados;
            if (vendedores && vendedores.length > 0) {
                asesorSeleccionadoActual = obtenerMejorAsesor(vendedores);
            }
        }
        
        // Re-renderizar el paso
        renderizarPasoCotizacion(2, asesoresPrecargados);
    };

    // Usar asignación automática (desde el botón)
    window.usarAsignacionAuto = function() {
        window.setModoAsesor('auto');
    };

    // Usar selección manual (desde el botón)
    window.usarSeleccionManual = function() {
        window.setModoAsesor('manual');
    };

    // Seleccionar asesor manualmente desde la lista
    window.seleccionarAsesorManual = function(asesorId) {
        console.log('👤 Seleccionando asesor:', asesorId);
        
        const vendedores = asesoresPrecargados;
        if (!vendedores) return;
        
        const asesor = vendedores.find(v => v.id === asesorId);
        if (asesor) {
            asesorSeleccionadoActual = asesor;
            modoAsignacionActual = 'manual';
            
            // Actualizar el input oculto
            const inputId = document.getElementById('asesor-seleccionado-id');
            if (inputId) {
                inputId.value = asesor.id;
            }
            
            // Re-renderizar para mostrar la selección
            renderizarPasoCotizacion(2, asesoresPrecargados);
        }
    };

    // Cambiar asesor (desde el botón "Cambiar" en el asesor asignado)
    window.cambiarAsesorModal = function() {
        console.log('🔄 Cambiando asesor...');
        
        // Cambiar a modo manual para mostrar la lista
        modoAsignacionActual = 'manual';
        
        // Re-renderizar
        renderizarPasoCotizacion(2, asesoresPrecargados);
    };

    // ============================================
    // RENDERIZAR PASO 2: ASESOR - PROPUESTA 1
    // ============================================
    async function renderizarPasoAsesor(vendedores) {
        if (!vendedores || vendedores.length === 0) {
            return `
                <div class="paso-asesor">
                    <div class="alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>No hay asesores disponibles en este momento.</p>
                        <p class="text-sm">Por favor, contacta al administrador.</p>
                    </div>
                </div>
            `;
        }

        // Obtener mejor asesor automático
        const mejorAsesor = obtenerMejorAsesor(vendedores);
        
        // Si no hay asesor seleccionado, asignar el mejor automáticamente
        if (!asesorSeleccionadoActual) {
            asesorSeleccionadoActual = mejorAsesor;
            modoAsignacionActual = 'auto';
        }

        return `
            <div class="paso-asesor">
                <h4>¿Cómo quieres ser atendido?</h4>
                <p class="paso-subtitulo">Elige la opción que prefieras</p>
                
                <div class="opciones-asesor">
                    <!-- ========================================== -->
                    <!-- OPCIÓN 1: ASIGNACIÓN AUTOMÁTICA -->
                    <!-- ========================================== -->
                    <div class="opcion-asesor ${modoAsignacionActual === 'auto' ? 'activa' : ''}" 
                        onclick="window.setModoAsesor('auto')">
                        <div class="opcion-header">
                            <div class="opcion-texto">
                                <strong>Asignación Automática</strong>
                                <span>Te asignaremos el mejor asesor disponible</span>
                            </div>
                            ${modoAsignacionActual === 'auto' ? 
                                '<span class="check"><i class="fas fa-check-circle"></i></span>' : 
                                ''}
                        </div>
                        
                        <!-- Mostrar asesor asignado si está en modo automático -->
                        ${modoAsignacionActual === 'auto' && asesorSeleccionadoActual ? `
                            <div class="asesor-asignado">
                                <div class="asesor-avatar">
                                    ${asesorSeleccionadoActual.nombre?.charAt(0) || 'A'}
                                </div>
                                <div class="asesor-info">
                                    <div class="asesor-nombre">
                                        ${escapeHtml(asesorSeleccionadoActual.nombre)}
                                        <span class="badge-auto">Asignado automáticamente</span>
                                    </div>
                                    <div class="asesor-detalles">
                                        ${asesorSeleccionadoActual.telefono ? 
                                            `<span><i class="fas fa-phone"></i> ${escapeHtml(asesorSeleccionadoActual.telefono)}</span>` : 
                                            ''}
                                        ${asesorSeleccionadoActual.email ? 
                                            `<span><i class="fas fa-envelope"></i> ${escapeHtml(asesorSeleccionadoActual.email)}</span>` : 
                                            ''}
                                    </div>
                                </div>
                                <button class="btn-cambiar-asesor-mini" 
                                        onclick="event.stopPropagation(); window.cambiarAsesorModal()">
                                    <i class="fas fa-sync-alt"></i> Cambiar
                                </button>
                            </div>
                        ` : ''}
                        
                        ${modoAsignacionActual !== 'auto' ? `
                            <button class="btn-usar-auto" onclick="window.usarAsignacionAuto()">
                                Usar asignación automática
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- ========================================== -->
                    <!-- OPCIÓN 2: SELECCIÓN MANUAL -->
                    <!-- ========================================== -->
                    <div class="opcion-asesor ${modoAsignacionActual === 'manual' ? 'activa' : ''}" 
                        onclick="window.setModoAsesor('manual')">
                        <div class="opcion-header">
                            <div class="opcion-icono">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="opcion-texto">
                                <strong>Selección Manual</strong>
                                <span>Elige quién te gustaría que te atienda</span>
                            </div>
                            ${modoAsignacionActual === 'manual' ? 
                                '<span class="check"><i class="fas fa-check-circle"></i></span>' : 
                                ''}
                        </div>
                        
                        ${modoAsignacionActual === 'manual' ? `
                            <div class="asesores-lista">
                                ${vendedores.map(v => `
                                    <div class="asesor-item ${asesorSeleccionadoActual?.id === v.id ? 'selected' : ''}" 
                                        onclick="event.stopPropagation(); window.seleccionarAsesorManual('${v.id}')">
                                        <div class="asesor-avatar-small">
                                            ${v.nombre?.charAt(0) || 'A'}
                                        </div>
                                        <div class="asesor-info">
                                            <div class="asesor-nombre">${escapeHtml(v.nombre)}</div>
                                            <div class="asesor-detalles">
                                                ${v.telefono ? `<span><i class="fas fa-phone"></i> ${escapeHtml(v.telefono)}</span>` : ''}
                                            </div>
                                        </div>
                                        ${asesorSeleccionadoActual?.id === v.id ? 
                                            '<span class="seleccionado-badge"><i class="fas fa-check"></i> Seleccionado</span>' : 
                                            '<button class="btn-seleccionar">Seleccionar</button>'}
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <button class="btn-usar-manual" onclick="window.usarSeleccionManual()">
                                Elegir manualmente
                            </button>
                        `}
                    </div>
                </div>
                
                <!-- Mensaje informativo sobre búsqueda por email (próximamente) -->
                <div class="email-future">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>¿Tienes un asesor habitual?</strong>
                        <span>Próximamente podrás buscarlo por email. Por ahora, elige de la lista.</span>
                    </div>
                </div>
                
                <!-- Input oculto para guardar el ID del asesor -->
                <input type="hidden" id="asesor-seleccionado-id" value="${asesorSeleccionadoActual?.id || ''}">
            </div>
        `;
    }
    
    // ============================================
    // RENDERIZAR PASO 3: DATOS - CORREGIDO
    // ============================================
    async function renderizarPasoDatos() {
        return `
            <div class="paso-datos">
                <h4>Datos de contacto</h4>
                <p class="paso-subtitulo">Completa tus datos para recibir la cotización</p>
                
                <div class="form-group">
                    <label>Nombre completo <span class="required">*</span></label>
                    <input type="text" id="cliente-nombre-modal" 
                        placeholder="Ej: Juan Pérez"
                        value="${window.clienteNombreCache || ''}"
                        oninput="window.clienteNombreCache = this.value.trim(); window.validarCampoPaso('nombre')">
                    <div id="error-nombre" class="mensaje-error hidden"></div>
                </div>
                
                <div class="form-group">
                    <label>Correo electrónico <span class="optional">(opcional)</span></label>
                    <input type="email" id="cliente-correo-modal" 
                        placeholder="cliente@ejemplo.com"
                        value="${window.clienteEmailCache || ''}"
                        oninput="window.clienteEmailCache = this.value.trim(); window.validarCampoPaso('email')">
                    <div id="error-email" class="mensaje-error hidden"></div>
                </div>
                
                <div class="form-group">
                    <label>Teléfono <span class="required">*</span></label>
                    <div class="telefono-wrapper">
                        <select id="prefijo-pais" onchange="window.actualizarPlaceholderTelefono()">
                            <option value="51" selected>🇵🇪 +51</option>
                            <option value="1">🇺🇸 +1</option>
                            <option value="34">🇪🇸 +34</option>
                            <option value="52">🇲🇽 +52</option>
                            <option value="54">🇦🇷 +54</option>
                            <option value="56">🇨🇱 +56</option>
                            <option value="57">🇨🇴 +57</option>
                        </select>
                        <input type="tel" id="cliente-telefono-modal" 
                            placeholder="987654321"
                            value="${window.clienteTelefonoCache || ''}"
                            oninput="window.clienteTelefonoCache = this.value.replace(/\\D/g, ''); window.validarCampoPaso('telefono')">
                    </div>
                    <div id="error-telefono" class="mensaje-error hidden"></div>
                </div>
                
                <div class="form-group">
                    <label>Empresa <span class="optional">(opcional)</span></label>
                    <input type="text" id="cliente-empresa-modal" 
                        placeholder="Nombre de tu empresa"
                        value="${window.clienteEmpresaCache || ''}"
                        oninput="window.clienteEmpresaCache = this.value.trim()">
                </div>
                
                <div class="form-group">
                    <label>Ubicación del proyecto</label>
                    <select id="ubicacion-proyecto-modal" onchange="window.ubicacionCache = this.value">
                        <option value="">Seleccionar ubicación</option>
                        <option value="Lima" ${window.ubicacionCache === 'Lima' ? 'selected' : ''}>Lima</option>
                        <option value="Provincia" ${window.ubicacionCache === 'Provincia' ? 'selected' : ''}>Provincia</option>
                        <option value="Exterior" ${window.ubicacionCache === 'Exterior' ? 'selected' : ''}>Exterior</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea id="observaciones-modal" rows="3" 
                            placeholder="Comentarios adicionales..."
                            oninput="window.observacionesCache = this.value">${window.observacionesCache || ''}</textarea>
                </div>
                
                <div id="mensaje-error-paso3" class="hidden mensaje-error-paso3">
                    <i class="fas fa-exclamation-circle"></i> 
                    <span id="texto-error-paso3">Por favor, completa todos los campos obligatorios.</span>
                </div>
            </div>
        `;
    }
        
    // ============================================
    // RENDERIZAR PASO 4: ENVIAR - CORREGIDO
    // ============================================
    async function renderizarPasoEnviar(vendedores) {
        // ✅ USAR SOLO VARIABLES GLOBALES
        const nombre = window.clienteNombreCache || '';
        const email = window.clienteEmailCache || '';
        const telefono = window.clienteTelefonoCache || '';
        const empresa = window.clienteEmpresaCache || '';
        const ubicacion = window.ubicacionCache || '';
        const observaciones = window.observacionesCache || '';

console.log('📋 PASO 4 - Variables globales:', {
    nombre: window.clienteNombreCache,
    email: window.clienteEmailCache,
    telefono: window.clienteTelefonoCache,
    empresa: window.clienteEmpresaCache,
    ubicacion: window.ubicacionCache,
    observaciones: window.observacionesCache
});        
        
        // Obtener el asesor seleccionado
        let asesorNombre = 'No asignado';
        let asesorTelefono = '';
        let asesorEmail = '';
        
        if (asesorSeleccionadoActual) {
            asesorNombre = asesorSeleccionadoActual.nombre || 'Asesor';
            asesorTelefono = asesorSeleccionadoActual.telefono || '';
            asesorEmail = asesorSeleccionadoActual.email || '';
        }
        
        return `
            <div class="paso-enviar">
                <div class="resumen-envio">
                    <div class="resumen-icono">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h4>¡Todo listo!</h4>
                    <p class="paso-subtitulo">Revisa tus datos antes de enviar</p>
                    
                    <div class="resumen-datos">
                        <div class="resumen-item">
                            <span class="resumen-label">Cliente</span>
                            <span class="resumen-valor">${escapeHtml(nombre) || 'No especificado'}</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Email</span>
                            <span class="resumen-valor">${escapeHtml(email) || 'No especificado'}</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Teléfono</span>
                            <span class="resumen-valor">${escapeHtml(telefono) || 'No especificado'}</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Empresa</span>
                            <span class="resumen-valor">${escapeHtml(empresa) || 'No especifica'}</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Ubicación</span>
                            <span class="resumen-valor">${escapeHtml(ubicacion) || 'No especifica'}</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Asesor</span>
                            <span class="resumen-valor">
                                ${escapeHtml(asesorNombre)}
                                ${asesorTelefono ? `<span class="text-sm text-gray-400">(${escapeHtml(asesorTelefono)})</span>` : ''}
                            </span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Productos</span>
                            <span class="resumen-valor">${cotizacionSeleccionados.length} producto(s)</span>
                        </div>
                        <div class="resumen-item">
                            <span class="resumen-label">Modo de asignación</span>
                            <span class="resumen-valor">
                                ${modoAsignacionActual === 'auto' ? 'Automática' : 'Manual'}
                            </span>
                        </div>
                        ${observaciones ? `
                            <div class="resumen-item">
                                <span class="resumen-label">Observaciones</span>
                                <span class="resumen-valor">${escapeHtml(observaciones)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // VALIDACIONES DE PASO 3 - CORREGIDAS
    // ============================================
    window.validarCampoPaso = function(campo) {
        const errorElement = document.getElementById(`error-${campo}`);
        const inputElement = document.getElementById(`cliente-${campo === 'nombre' ? 'nombre-modal' : campo === 'email' ? 'correo-modal' : 'telefono-modal'}`);
        
        if (!errorElement || !inputElement) return;
        
        const valor = inputElement.value.trim();
        let esValido = true;
        let mensajeError = '';
        
        switch(campo) {
            case 'nombre':
                if (valor.length === 0) {
                    esValido = false;
                    mensajeError = 'El nombre es obligatorio';
                } else if (valor.length < 3) {
                    esValido = false;
                    mensajeError = 'El nombre debe tener al menos 3 caracteres';
                } else if (/\d/.test(valor)) {
                    esValido = false;
                    mensajeError = 'El nombre no debe contener números';
                } else {
                    // ✅ GUARDAR EN VARIABLE GLOBAL
                    window.clienteNombreCache = valor;
                }
                break;
            case 'email':
                if (valor.length > 0 && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valor)) {
                    esValido = false;
                    mensajeError = 'Ingresa un correo electrónico válido';
                } else {
                    // ✅ GUARDAR EN VARIABLE GLOBAL
                    window.clienteEmailCache = valor;
                }
                break;
            case 'telefono':
                const prefijoSelect = document.getElementById('prefijo-pais');
                const prefijo = prefijoSelect ? prefijoSelect.value : '51';
                const soloNumeros = valor.replace(/\D/g, '');
                
                if (valor.length === 0) {
                    esValido = false;
                    mensajeError = 'El teléfono es obligatorio';
                } else {
                    let longitudMinima = 7;
                    let longitudMaxima = 15;
                    
                    switch(prefijo) {
                        case '51': longitudMinima = 9; longitudMaxima = 9; break;
                        case '1': longitudMinima = 10; longitudMaxima = 10; break;
                        case '34': longitudMinima = 9; longitudMaxima = 9; break;
                        default: longitudMinima = 7; longitudMaxima = 15;
                    }
                    
                    if (soloNumeros.length < longitudMinima || soloNumeros.length > longitudMaxima) {
                        esValido = false;
                        mensajeError = `El número debe tener ${longitudMinima} dígitos`;
                    } else {
                        // ✅ GUARDAR EN VARIABLE GLOBAL
                        window.clienteTelefonoCache = soloNumeros;
                    }
                }
                break;
        }
        
        if (esValido) {
            errorElement.classList.add('hidden');
            errorElement.textContent = '';
            inputElement.style.borderColor = '#10b981';
        } else {
            errorElement.classList.remove('hidden');
            errorElement.textContent = mensajeError;
            inputElement.style.borderColor = '#dc2626';
        }
    };
    
    // ============================================
    // VALIDAR TODOS LOS CAMPOS DEL PASO 3
    // ============================================
    function validarTodosCamposPaso3() {
        // ✅ USAR VARIABLES GLOBALES
        const nombre = window.clienteNombreCache || '';
        const telefono = window.clienteTelefonoCache || '';
        const email = window.clienteEmailCache || '';
        
        // Validar que los campos obligatorios estén completos
        const nombreValido = nombre.length >= 3 && !/\d/.test(nombre);
        const telefonoValido = telefono.length >= 7;
        
        // Validar email si está presente
        let emailValido = true;
        if (email && email.length > 0) {
            emailValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
        }
        
        const errorMsg = document.getElementById('mensaje-error-paso3');
        const textoError = document.getElementById('texto-error-paso3');
        
        const camposCompletos = nombreValido && telefonoValido && emailValido;
        
        if (camposCompletos) {
            if (errorMsg) errorMsg.classList.add('hidden');
            return true;
        } else {
            if (errorMsg) {
                errorMsg.classList.remove('hidden');
                if (!nombreValido) {
                    textoError.textContent = 'El nombre debe tener al menos 3 caracteres y no contener números.';
                } else if (!telefonoValido) {
                    textoError.textContent = 'El teléfono es obligatorio y debe tener al menos 7 dígitos.';
                } else if (!emailValido) {
                    textoError.textContent = 'Ingresa un correo electrónico válido.';
                } else {
                    textoError.textContent = 'Por favor, completa todos los campos obligatorios.';
                }
            }
            return false;
        }
    }
    
    // ============================================
    // FUNCIONES DE NAVEGACIÓN DE PASOS
    // ============================================

    // ============================================
    // NAVEGACIÓN DE PASOS - CORREGIDA
    // ============================================
    window.irPasoCotizacion = function(paso) {
        if (paso < 1 || paso > 4) return;
        
        // ✅ Si vamos del paso 3 al 4, guardar los datos primero
        if (paso === 4 && pasoActualCotizacion === 3) {
            // Guardar datos desde los inputs actuales
            const nombreInput = document.getElementById('cliente-nombre-modal');
            const telefonoInput = document.getElementById('cliente-telefono-modal');
            const emailInput = document.getElementById('cliente-correo-modal');
            const empresaInput = document.getElementById('cliente-empresa-modal');
            const ubicacionInput = document.getElementById('ubicacion-proyecto-modal');
            const observacionesInput = document.getElementById('observaciones-modal');
            
            if (nombreInput) window.clienteNombreCache = nombreInput.value.trim();
            if (telefonoInput) window.clienteTelefonoCache = telefonoInput.value.replace(/\D/g, '');
            if (emailInput) window.clienteEmailCache = emailInput.value.trim();
            if (empresaInput) window.clienteEmpresaCache = empresaInput.value.trim();
            if (ubicacionInput) window.ubicacionCache = ubicacionInput.value;
            if (observacionesInput) window.observacionesCache = observacionesInput.value;
            
            // Validar campos
            const nombre = window.clienteNombreCache || '';
            const telefono = window.clienteTelefonoCache || '';
            const email = window.clienteEmailCache || '';
            
            // Validar nombre
            if (!nombre || nombre.length < 3) {
                mostrarModal('Campo incompleto', 
                    'El nombre completo es obligatorio y debe tener al menos 3 caracteres.', 
                    'warning');
                return;
            }
            
            // Validar teléfono
            if (!telefono || telefono.length < 7) {
                mostrarModal('Campo incompleto', 
                    'El teléfono es obligatorio y debe tener al menos 7 dígitos.', 
                    'warning');
                return;
            }
            
            // Validar email si está presente
            if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                mostrarModal('Email inválido', 
                    'Ingresa un correo electrónico válido.', 
                    'warning');
                return;
            }
        }
        
        // Validar paso 2 -> paso 3: debe tener asesor asignado
        if (paso === 3 && !asesorSeleccionadoActual) {
            mostrarModal('Asesor requerido', 
                'Debes tener un asesor asignado para continuar. ' +
                'Elige entre asignación automática o selección manual.', 
                'warning');
            return;
        }
        
        pasoActualCotizacion = paso;
        renderizarPasoCotizacion(paso, asesoresPrecargados);
    };
    
    window.agregarMasProductos = function() {
        window.cerrarModalCotizacion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const productosSection = document.getElementById('productos');
        if (productosSection) {
            productosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            productosSection.style.border = '3px solid #10b981';
            setTimeout(() => {
                productosSection.style.border = 'none';
            }, 3000);
        }
    };
    
    window.cambiarModoAsignacionPaso = function(modo) {
        modoAsignacionActual = modo;
        const selectorManual = document.getElementById('selector-asesor-paso');
        const campoEmail = document.getElementById('campo-email-paso');
        
        if (modo === 'manual') {
            if (selectorManual) selectorManual.style.display = 'block';
            if (campoEmail) campoEmail.style.display = 'none';
            
            const select = document.getElementById('asesor-manual-paso');
            if (select && select.value) {
                const asesor = asesoresPrecargados?.find(a => a.id === select.value);
                if (asesor) {
                    asesorSeleccionadoActual = asesor;
                    actualizarAsesorSeleccionadoPaso(asesor, 'manual');
                }
            }
        } else {
            if (selectorManual) selectorManual.style.display = 'none';
            if (campoEmail) campoEmail.style.display = 'block';
            asignarAsesorAutomaticoPaso();
        }
    };
    
    window.seleccionarAsesorManualPaso = function(asesorId) {
        const asesor = asesoresPrecargados?.find(a => a.id === asesorId);
        if (asesor) {
            asesorSeleccionadoActual = asesor;
            actualizarAsesorSeleccionadoPaso(asesor, 'manual');
        }
    };
    
    window.buscarAsesorPorEmailPaso = async function() {
        const email = document.getElementById('cliente-email-paso')?.value;
        if (!email) {
            mostrarModal('Aviso', 'Ingresa tu correo electrónico para buscar a tu asesor', 'warning');
            return;
        }
        
        try {
            const { data: cliente } = await window.supabaseClient
                .from('clientes_asesores')
                .select('vendedor_id, vendedores:vendedor_id(id, nombre, telefono, email)')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();
            
            const asesorInfo = document.getElementById('asesor-info-paso');
            
            if (cliente && cliente.vendedores) {
                const asesor = cliente.vendedores;
                asesorSeleccionadoActual = asesor;
                actualizarAsesorSeleccionadoPaso(asesor, 'email');
                
                if (asesorInfo) {
                    asesorInfo.innerHTML = `
                        <div class="asesor-info-result success">
                            <i class="fas fa-user-check"></i> ¡Asesor encontrado! ${escapeHtml(asesor.nombre)}
                        </div>
                    `;
                    asesorInfo.classList.remove('hidden');
                }
            } else {
                if (asesorInfo) {
                    asesorInfo.innerHTML = `
                        <div class="asesor-info-result warning">
                            <i class="fas fa-info-circle"></i> Asesor no encontrado. Se te asignará uno automáticamente.
                        </div>
                    `;
                    asesorInfo.classList.remove('hidden');
                }
                await asignarAsesorAutomaticoPaso();
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarModal('Error', 'No se pudo buscar el asesor', 'error');
        }
    };
    
    async function asignarAsesorAutomaticoPaso() {
        try {
            const { data: vendedoresActualizados } = await window.supabaseClient
                .from('vendedores')
                .select('id, nombre, telefono, email, leads_asignados_hoy')
                .eq('activo', true)
                .eq('atiende_outlet', true);
            
            if (vendedoresActualizados && vendedoresActualizados.length > 0) {
                vendedoresActualizados.sort((a, b) => (a.leads_asignados_hoy || 0) - (b.leads_asignados_hoy || 0));
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
    
    function actualizarAsesorSeleccionadoPaso(asesor, origen) {
        const container = document.getElementById('asesor-seleccionado-paso');
        const nombreEl = document.getElementById('asesor-nombre-paso');
        const contactoEl = document.getElementById('asesor-contacto-paso');
        const idInput = document.getElementById('asesor-seleccionado-id');
        
        if (container && nombreEl && contactoEl && idInput) {
            container.classList.remove('hidden');
            
            let badgeTexto = '';
            if (origen === 'auto') badgeTexto = 'Asignado automáticamente';
            else if (origen === 'manual') badgeTexto = 'Seleccionado por ti';
            else if (origen === 'email') badgeTexto = 'Asociado a tu correo';
            
            nombreEl.innerHTML = `
                ${escapeHtml(asesor.nombre || 'Asesor')}
                <span class="asesor-badge ${origen}">${badgeTexto}</span>
            `;
            
            contactoEl.innerHTML = `
                ${asesor.email ? `<span><i class="fas fa-envelope"></i> ${escapeHtml(asesor.email)}</span>` : ''}
                ${asesor.telefono ? `<span><i class="fas fa-phone"></i> ${escapeHtml(asesor.telefono)}</span>` : ''}
            `;
            
            idInput.value = asesor.id;
            asesorSeleccionadoActual = asesor;
        }
    }
    
    window.actualizarPlaceholderTelefono = function() {
        const prefijoSelect = document.getElementById('prefijo-pais');
        const telefonoInput = document.getElementById('cliente-telefono-modal');
        if (!prefijoSelect || !telefonoInput) return;
        
        const placeholders = {
            '51': '987654321',
            '1': '2125551234',
            '34': '612345678',
            '52': '5512345678'
        };
        telefonoInput.placeholder = placeholders[prefijoSelect.value] || '123456789';
    };
    
    window.eliminarProductoCotizacion = function(productoId, productoNombre) {
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
                
                // ✅ ACTUALIZAR TODOS LOS BOTONES
                actualizarTodosLosBotonesCotizar();
                
                // ✅ ACTUALIZAR BARRA Y BADGE
                actualizarBarraFlotante();
                actualizarBadgeHeader();
                
                if (cotizacionSeleccionados.length === 0) {
                    window.cerrarModalCotizacion();
                    mostrarModal('Cotización vacía', 'Se han eliminado todos los productos. La cotización se ha cerrado.', 'info', { timer: 2000 });
                } else {
                    window.abrirModalCotizacion();
                }
            }
        });
    };
    
    window.cerrarModalCotizacion = function() {
        const modal = document.getElementById('modalCotizacion');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
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
        
        if (hoy < fechaInicio) {
            targetDate = fechaInicio;
            mensaje = "OFERTA PRÓXIMAMENTE";
        } else if (hoy >= fechaInicio && hoy <= fechaFin) {
            targetDate = fechaFin;
            mensaje = "⏰ OFERTA POR TIEMPO LIMITADO";
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
    <div id="modalConfirmacion" class="modal-personalizado" style="display:none;">
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
                <h3>Nueva Cotización</h3>
                <button class="modal-cotizacion-close" onclick="window.cerrarModalCotizacion()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-cotizacion-body" id="modalCotizacionBody">
                <!-- El contenido se renderiza dinámicamente -->
            </div>
            <div class="modal-cotizacion-footer" id="modalCotizacionFooter" style="display: none;"></div>
        </div>
    </div>`;
    
    const modalQRHtml = `
    <div id="modalQR" class="modal-qr" style="display:none;">
        <div class="modal-qr-contenido">
            <div class="modal-qr-header">
                <h3><i class="fas fa-qrcode"></i> Escanear Código QR</h3>
                <!-- Botón cerrar (X) - SIN onclick -->
                <button id="btnCerrarQR" class="modal-qr-close" type="button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-qr-body">
                <div id="qr-reader" style="width:100%; max-width:400px; margin:0 auto;"></div>
                <div class="qr-instrucciones">
                    <i class="fas fa-info-circle"></i>
                    <span>Apunte la cámara al código QR del producto</span>
                </div>
                <!-- Botón cancelar - SIN onclick -->
                <button id="btnCancelarQR" class="btn-cancelar-qr" type="button">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    </div>`;
    
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
            :root{--primary:#39080a;--primary-dark:#2a0607;--secondary:#d4d4ae;--white:#fff;--gray-50:#fafafa;--gray-100:#f5f5f5;--gray-200:#eee;--gray-300:#e0e0e0;--gray-400:#cbd5e1;--gray-500:#94a3b8;--gray-600:#666;--gray-700:#444;--gray-800:#222;--red-500:#ef4444;--red-600:#dc2626;--orange-400:#fb923c;--green-500:#10b981;--green-600:#059669}
            
            body{font-family:'Poppins',sans-serif;background:var(--gray-50);color:var(--gray-800);line-height:1.5;overflow-x:hidden;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;padding-bottom:0}
            
            img{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;pointer-events:auto}
            
            .container{width:100%;max-width:1280px;margin:0 auto;padding:0 16px}
            h1,h2,h3{font-weight:700}
            
            /* ============================================ */
            /* HEADER COMPACTO MOBILE */
            /* ============================================ */
            header{position:fixed;top:0;left:0;right:0;background:var(--primary);z-index:1000;padding:8px 0;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
            .navbar {
                display: flex;
                justify-content: center; /* ← Centra todo horizontalmente */
                align-items: center;
                padding: 8px 16px;
                position: relative;
            }
            .logo {
                display: flex;
                justify-content: center;
                align-items: center;
                flex: 1;
            }

            .logo a {
                display: inline-block;
                text-decoration: none;
                transition: all 0.3s ease;
                cursor: pointer;
            }

            .logo a:hover {
                transform: scale(1.02);
                opacity: 0.9;
            }

            .logo a:active {
                transform: scale(0.98);
            }

            .logo img {
                width: 200px;
                height: auto;
                display: block;
            }
            /* El badge de cotización se posiciona a la derecha con absolute */
            .header-cotizacion-badge {
                position: absolute;
                right: 16px;
                top: 50%;
                transform: translateY(-50%);
                background: var(--secondary);
                color: var(--primary);
                border-radius: 40px;
                padding: 4px 12px;
                font-size: 0.7rem;
                font-weight: 700;
                display: none; /* Oculto por defecto, se muestra con JS */
                align-items: center;
                gap: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }

            .header-cotizacion-badge:hover {
                transform: translateY(-50%) scale(1.05);
            }

            .header-cotizacion-badge i {
                font-size: 0.8rem;
            }
            
            /* ============================================ */
            /* HERO SECTION - MOBILE OPTIMIZED */
            /* ============================================ */
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
            
            /* ============================================ */
            /* SEARCH SECTION - MOBILE FIRST */
            /* ============================================ */
            .search-filters-section{background:white;border-radius:20px;margin:-20px 0 20px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
            
            .search-wrapper{margin-bottom:12px}
            .search-box-enhanced{display:flex;flex-direction:column;gap:10px}
            .search-input-wrapper{position:relative;flex:1}
            .search-input-wrapper i.fa-search{position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:0.9rem;color:var(--gray-400)}
            .search-input-wrapper input{width:100%;padding:14px 16px 14px 44px;border:2px solid var(--gray-200);border-radius:50px;font-size:0.9rem;background:var(--gray-50);transition:all 0.3s ease;min-height:52px}
            .search-input-wrapper input:focus{outline:none;border-color:var(--primary);background:white}
            
            .btn-clear-search {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                padding: 8px;
                display: none;  /* Oculto por defecto */
                font-size: 1rem;
                min-width: 44px;
                min-height: 44px;
                z-index: 2;
            }

            .btn-clear-search:hover {
                color: var(--primary);
            }

            .btn-clear-search:active {
                transform: translateY(-50%) scale(0.9);
            }
            
            .btn-escaneo-qr{background:var(--primary);color:white;border:none;border-radius:50px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:600;font-size:0.9rem;min-height:52px;width:100%}
            .btn-escaneo-qr:hover{background:var(--primary-dark)}
            .btn-escaneo-qr i{font-size:1.1rem}
            
            .search-hint{font-size:0.65rem;color:var(--gray-400);margin-top:6px;display:flex;align-items:center;gap:6px}
            
            /* Filtros chips horizontales */
            .filtros-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px;scrollbar-width:none;-ms-overflow-style:none}
            .filtros-chips::-webkit-scrollbar{display:none}
            .chip-filtro{background:var(--gray-100);padding:6px 12px;border-radius:40px;font-size:0.7rem;display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;border:1px solid var(--gray-200)}
            .chip-eliminar{background:none;border:none;color:var(--gray-500);cursor:pointer;padding:2px;font-size:0.6rem}
            .chip-eliminar:hover{color:var(--red-500)}
            
            /* Filtros desktop */
            .filters-desktop-container{display:none;margin-top:12px}
            .filtros-grid-enhanced{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
            .filtro-group{flex:1;min-width:120px}
            .filtro-group label{display:block;font-size:0.65rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;margin-bottom:4px}
            .filtro-group select{width:100%;padding:12px 14px;border:1px solid var(--gray-200);border-radius:16px;font-size:0.85rem;background:var(--gray-50);min-height:48px}
            .filtros-actions{display:flex;gap:10px}
            .btn-filter,.btn-clear{padding:12px 20px;border-radius:40px;font-weight:600;font-size:0.8rem;border:none;min-height:48px;min-width:80px;cursor:pointer}
            .btn-filter{background:var(--primary);color:white}
            .btn-clear{background:var(--gray-100);color:var(--gray-700)}
            
            /* ============================================ */
            /* FAB FILTROS - POSICIONADO A LA IZQUIERDA */
            /* ============================================ */
            .filtros-fab{position:fixed;bottom:100px;right:16px;background:var(--primary);color:white;width:56px;height:56px;border-radius:50%;display:none;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.25);cursor:pointer;z-index:90;border:none;font-size:1.2rem}
            .filtros-fab:hover{transform:scale(1.05)}
            /* ============================================ */
            /* BOTÓN SCROLL - A LA DERECHA */
            /* ============================================ */
            .scroll-top-btn{position:fixed;bottom:100px;right:16px;width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.25);z-index:80;font-size:1.2rem}
            .scroll-top-btn.show{display:flex}
            .scroll-top-btn:hover{transform:scale(1.05)}
            
            /* ============================================ */
            /* COMPENSAR HEADER FIJO EN ANCHOR LINKS */
            /* ============================================ */

            #productos {
                scroll-margin-top: 100px; /* Altura del header + margen */
            }

            /* Para móvil, el header es más pequeño */
            @media (max-width: 768px) {
                #productos {
                    scroll-margin-top: 100px;
                }
            }

            /* También aplicar a otros anchors si los hay */
            section[id] {
                scroll-margin-top: 70px;
            }

            @media (max-width: 768px) {
                section[id] {
                    scroll-margin-top: 60px;
                }
            }

            /* ============================================ */
            /* ESTILOS PARA ASESOR - PROPUESTA 1 */
            /* ============================================ */

            /* Opciones de asesor */
            .opciones-asesor {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin: 16px 0;
            }

            .opcion-asesor {
                background: var(--gray-50);
                border: 2px solid var(--gray-200);
                border-radius: 16px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .opcion-asesor:hover {
                border-color: var(--primary);
                transform: translateY(-2px);
            }

            .opcion-asesor.activa {
                border-color: var(--primary);
                background: white;
                box-shadow: 0 4px 16px rgba(57, 8, 10, 0.12);
            }

            /* Header de opción */
            .opcion-header {
                display: flex;
                align-items: flex-start;
                gap: 14px;
            }

            .opcion-icono {
                width: 40px;
                height: 40px;
                background: rgba(57, 8, 10, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .opcion-icono i {
                font-size: 1.2rem;
                color: var(--primary);
            }

            .opcion-texto {
                flex: 1;
            }

            .opcion-texto strong {
                display: block;
                font-size: 0.95rem;
                color: var(--gray-800);
            }

            .opcion-texto span {
                font-size: 0.75rem;
                color: var(--gray-500);
            }

            .opcion-header .check {
                color: var(--green-500);
                font-size: 1.3rem;
                margin-left: auto;
                flex-shrink: 0;
            }

            /* Asesor asignado */
            .asesor-asignado {
                display: flex;
                align-items: center;
                gap: 14px;
                margin-top: 14px;
                padding: 14px;
                background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                border-radius: 14px;
                border: 1px solid #bbf7d0;
            }

            .asesor-avatar {
                width: 50px;
                height: 50px;
                background: var(--primary);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.3rem;
                font-weight: 700;
                flex-shrink: 0;
            }

            .asesor-info {
                flex: 1;
                min-width: 0;
            }

            .asesor-nombre {
                font-weight: 700;
                font-size: 0.9rem;
                color: var(--gray-800);
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
            }

            .badge-auto {
                font-size: 0.55rem;
                background: #dbeafe;
                color: #1e40af;
                padding: 2px 10px;
                border-radius: 20px;
                font-weight: 500;
            }

            .asesor-detalles {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                font-size: 0.7rem;
                color: var(--gray-500);
                margin-top: 4px;
            }

            .asesor-detalles i {
                margin-right: 3px;
                width: 14px;
            }

            .btn-cambiar-asesor-mini {
                background: white;
                border: 1px solid var(--gray-200);
                padding: 6px 14px;
                border-radius: 40px;
                font-size: 0.7rem;
                font-weight: 600;
                color: var(--gray-700);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }

            .btn-cambiar-asesor-mini:hover {
                background: var(--primary);
                color: white;
                border-color: var(--primary);
            }

            /* Botones de acción */
            .btn-usar-auto,
            .btn-usar-manual {
                margin-top: 12px;
                padding: 10px 16px;
                border-radius: 40px;
                border: 2px dashed var(--primary);
                background: transparent;
                color: var(--primary);
                font-weight: 600;
                font-size: 0.8rem;
                cursor: pointer;
                width: 100%;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .btn-usar-auto:hover,
            .btn-usar-manual:hover {
                background: var(--primary);
                color: white;
                border-style: solid;
            }

            /* Lista de asesores */
            .asesores-lista {
                margin-top: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 220px;
                overflow-y: auto;
                padding-right: 4px;
            }

            .asesores-lista::-webkit-scrollbar {
                width: 4px;
            }

            .asesores-lista::-webkit-scrollbar-thumb {
                background: var(--gray-300);
                border-radius: 10px;
            }

            .asesor-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 14px;
                border-radius: 12px;
                border: 1px solid var(--gray-200);
                cursor: pointer;
                transition: all 0.3s ease;
                background: white;
            }

            .asesor-item:hover {
                border-color: var(--primary);
                background: var(--gray-50);
                transform: translateX(4px);
            }

            .asesor-item.selected {
                border-color: var(--green-500);
                background: #f0fdf4;
            }

            .asesor-avatar-small {
                position: relative;
                width: 42px;
                height: 42px;
                background: var(--primary);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                font-weight: 700;
                flex-shrink: 0;
            }

            .status-dot {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
            }

            .status-dot.online {
                background: var(--green-500);
            }

            .status-dot.busy {
                background: var(--orange-400);
            }

            .btn-seleccionar {
                margin-left: auto;
                padding: 4px 14px;
                border-radius: 40px;
                border: none;
                background: var(--primary);
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                flex-shrink: 0;
            }

            .btn-seleccionar:hover {
                background: var(--primary-dark);
                transform: scale(1.05);
            }

            .seleccionado-badge {
                margin-left: auto;
                color: var(--green-500);
                font-size: 0.7rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            }

            /* Mensaje de email (próximamente) */
            .email-future {
                display: flex;
                gap: 14px;
                padding: 14px 16px;
                background: #fffbeb;
                border-radius: 12px;
                border: 1px solid #fcd34d;
                margin-top: 16px;
            }

            .email-future i {
                color: #d97706;
                font-size: 1.2rem;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .email-future strong {
                display: block;
                font-size: 0.8rem;
                color: #78350f;
            }

            .email-future span {
                font-size: 0.7rem;
                color: #92400e;
            }

            /* Alerta de error */
            .alert-error {
                background: #fee2e2;
                border: 1px solid #fca5a5;
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                color: #991b1b;
            }

            .alert-error i {
                font-size: 2rem;
                display: block;
                margin-bottom: 8px;
            }

            .alert-error .text-sm {
                font-size: 0.75rem;
                opacity: 0.8;
            }

            /* Responsive */
            @media (max-width: 480px) {

                .logo img {
                    width: 150px;
                }
                
                .header-cotizacion-badge {
                    font-size: 0.6rem;
                    padding: 3px 10px;
                }

                .opcion-asesor {
                    padding: 14px;
                }
                
                .opcion-header {
                    flex-wrap: wrap;
                }
                
                .opcion-icono {
                    width: 36px;
                    height: 36px;
                }
                
                .opcion-icono i {
                    font-size: 1rem;
                }
                
                .asesor-asignado {
                    flex-wrap: wrap;
                }
                
                .btn-cambiar-asesor-mini {
                    width: 100%;
                    justify-content: center;
                    margin-top: 4px;
                }
                
                .asesor-item {
                    flex-wrap: wrap;
                    gap: 8px;
                }
                
                .btn-seleccionar {
                    width: 100%;
                    justify-content: center;
                    padding: 8px;
                }
                
                .seleccionado-badge {
                    width: 100%;
                    justify-content: center;
                }
                
                .email-future {
                    flex-direction: column;
                    text-align: center;
                }
            }

            /* ============================================ */
            /* PRODUCTOS GRID - MOBILE FIRST */
            /* ============================================ */
            .results-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
            .contador-enhanced{font-size:0.8rem;color:var(--gray-600);background:var(--gray-100);padding:6px 14px;border-radius:40px}
            .contador-enhanced span{font-weight:700;color:var(--primary)}
            
            .productos-grid-enhanced{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
            
            .producto-card{background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid var(--gray-200);transition:all 0.3s ease;cursor:pointer}
            .producto-card:active{transform:scale(0.97)}
            
            .card-image{position:relative;height:160px;overflow:hidden;background:var(--gray-100);cursor:pointer}
            .card-image img{width:100%;height:100%;object-fit:contain;transition:transform 0.4s ease}
            .producto-card:hover .card-image img{transform:scale(1.05)}
            
            .badge-outlet{position:absolute;top:8px;left:8px;background:linear-gradient(135deg,var(--red-600),var(--orange-400));color:white;padding:3px 10px;border-radius:20px;font-size:0.6rem;font-weight:700;z-index:2}
            
            .btn-cotizar-top{position:absolute;top:8px;right:8px;background:var(--primary);color:white;border:none;padding:6px 12px;border-radius:40px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:0.65rem;font-weight:600;z-index:3;transition:all 0.3s ease;min-height:36px}
            .btn-cotizar-top.seleccionado{background:var(--green-500)}
            .btn-cotizar-top i{font-size:0.7rem}
            .btn-cotizar-top:active{transform:scale(0.95)}
            
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
            
            /* ============================================ */
            /* CONTENEDOR DE BÚSQUEDA - MOBILE FIRST */
            /* ============================================ */

            .search-box-enhanced {
                display: flex;
                flex-direction: column;
                gap: 10px;
                width: 100%;
            }

            /* ============================================ */
            /* CAMPO DE BÚSQUEDA */
            /* ============================================ */

            .search-input-wrapper {
                position: relative;
                flex: 1;
                width: 100%;
            }

            .search-input-wrapper i.fa-search {
                position: absolute;
                left: 16px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 0.9rem;
                color: var(--gray-400);
                pointer-events: none;
                z-index: 1;
            }

            .search-input-wrapper input {
                width: 100%;
                padding: 14px 16px 14px 44px;
                border: 2px solid var(--gray-200);
                border-radius: 50px;
                font-size: 0.9rem;
                background: var(--gray-50);
                transition: all 0.3s ease;
                min-height: 52px;
            }

            .search-input-wrapper input:focus {
                outline: none;
                border-color: var(--primary);
                background: white;
                box-shadow: 0 0 0 3px rgba(57,8,10,0.1);
            }

            /* ============================================ */
            /* BOTÓN DE LIMPIAR INTERNO (solo móvil) */
            /* ============================================ */

            .btn-clear-search {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                padding: 8px;
                display: none;
                font-size: 1rem;
                min-width: 44px;
                min-height: 44px;
                z-index: 2;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .btn-clear-search:hover {
                color: var(--primary);
                background: rgba(0,0,0,0.05);
            }

            .btn-clear-search:active {
                transform: translateY(-50%) scale(0.9);
            }

            /* ============================================ */
            /* BOTÓN DE LIMPIAR EXTERNO (NUEVO) */
            /* ============================================ */

            .btn-clear-externo {
                display: none;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: var(--gray-100);
                color: var(--gray-700);
                border: 1px solid var(--gray-200);
                border-radius: 50px;
                padding: 10px 16px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-height: 44px;
                width: 100%;
                white-space: nowrap;
            }

            .btn-clear-externo:hover {
                background: var(--gray-200);
                transform: translateY(-2px);
            }

            .btn-clear-externo:active {
                transform: scale(0.97);
            }

            .btn-clear-externo i {
                font-size: 0.9rem;
            }

            .btn-clear-externo.visible {
                display: flex !important;
            }

            .btn-clear-externo.hidden {
                display: none !important;
            }

            /* En móvil: el botón externo ocupa todo el ancho */
            .btn-clear-externo {
                width: 100%;
            }

            .btn-clear-externo .btn-text {
                display: inline;
            }

            /* En móvil, el botón interno se muestra (más pequeño) */
            @media (max-width: 768px) {
                .btn-clear-search {
                    display: none !important; /* Ocultamos el interno en móvil */
                }
                
                .btn-clear-externo {
                    display: none;
                    width: 100%;
                }
                
                .btn-clear-externo.visible {
                    display: flex !important;
                }
            }

            /* ============================================ */
            /* RESPONSIVE - TABLET */
            /* ============================================ */

            @media (min-width: 481px) and (max-width: 768px) {
                .search-box-enhanced {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .btn-clear-externo {
                    padding: 12px 20px;
                    font-size: 0.85rem;
                }
                
                .btn-clear-externo .btn-text {
                    display: inline;
                }
            }

            /* ============================================ */
            /* RESPONSIVE - DESKTOP */
            /* ============================================ */

            @media (min-width: 769px) {
                .search-box-enhanced {
                    flex-direction: row;
                    align-items: center;
                    gap: 12px;
                }
                
                .search-input-wrapper {
                    flex: 1;
                }
                
                /* En desktop, el botón interno NO se muestra */
                .btn-clear-search {
                    display: none !important;
                }
                
                /* En desktop, el botón externo se muestra a la derecha del input */
                .btn-clear-externo {
                    width: auto;
                    padding: 12px 20px;
                    display: none;
                }
                
                .btn-clear-externo.visible {
                    display: flex !important;
                }
                
                .btn-clear-externo .btn-text {
                    display: inline;
                }
                
                .btn-escaneo-qr {
                    width: auto;
                    padding: 14px 24px;
                    min-height: 52px;
                }
            }

            /* ============================================ */
            /* FAB FILTROS - SOLO MÓVIL */
            /* ============================================ */

            .filtros-fab {
                position: fixed;
                bottom: 100px;
                right: 16px;
                background: var(--primary);
                color: white;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.25);
                cursor: pointer;
                z-index: 90;
                border: none;
                font-size: 1.2rem;
            }

            /* Mostrar FAB solo en móvil */
            @media (max-width: 768px) {
                .filtros-fab {
                    display: flex;
                }
            }

            /* Ocultar FAB en desktop */
            @media (min-width: 769px) {
                .filtros-fab {
                    display: none !important;
                }
            }

            .filtros-fab .badge-filtros {
                position: absolute;
                top: -4px;
                right: -4px;
                background: var(--red-500);
                color: white;
                border-radius: 50%;
                font-size: 0.6rem;
                font-weight: 700;
                width: 22px;
                height: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* ============================================ */
            /* HEADER DEL MODAL DE FILTROS */
            /* ============================================ */

            .filtros-modal-header {
                padding: 16px 20px;
                background: #39080a;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }

            .filtros-modal-header h3 {
                font-size: 1.1rem;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .close-modal-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-size: 1.2rem;
            }

            .close-modal-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            .close-modal-btn:active {
                transform: scale(0.95);
            }

            /* ============================================ */
            /* BODY DEL MODAL DE FILTROS */
            /* ============================================ */

            .filtros-modal-body {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                padding-bottom: 80px;
            }

            .filtro-group {
                margin-bottom: 20px;
            }

            .filtro-group label {
                display: block;
                font-size: 0.75rem;
                font-weight: 600;
                color: #6b7280;
                margin-bottom: 8px;
                text-transform: uppercase;
            }

            .filtro-group select {
                width: 100%;
                padding: 14px 16px;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                font-size: 0.9rem;
                background: #f9fafb;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .filtro-group select:focus {
                outline: none;
                border-color: #39080a;
                box-shadow: 0 0 0 3px rgba(57,8,10,0.1);
            }

            /* ============================================ */
            /* FOOTER DEL MODAL DE FILTROS */
            /* ============================================ */

            .filtros-modal-footer {
                position: sticky;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 16px 20px;
                background: white;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 12px;
                flex-shrink: 0;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
                z-index: 2;
            }

            .filtros-modal-footer button {
                flex: 1;
                padding: 14px;
                border-radius: 40px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }

            .filtros-modal-footer button:active {
                transform: scale(0.98);
            }

            .filtros-modal-footer .btn-filter {
                background: #39080a;
                color: white;
            }

            .filtros-modal-footer .btn-clear {
                background: #f3f4f6;
                color: #4b5563;
                border: 1px solid #e5e7eb;
            }

            /* ============================================ */
            /* BARRA DE COTIZACIÓN - MOBILE FIRST */
            /* ============================================ */
            .barra-cotizacion{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#39080a 0%,#2a0607 100%);color:white;padding:12px 16px;z-index:1000;box-shadow:0 -4px 20px rgba(0,0,0,0.3);backdrop-filter:blur(10px);transition:all 0.3s ease;min-height:70px}
            .barra-cotizacion.mini{padding:12px 16px}
            .barra-cotizacion.expanded{padding:16px}
            
            .barra-cotizacion-mini{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
            .barra-info-mini{display:flex;align-items:center;gap:10px;flex:1}
            .barra-icono{position:relative}
            .barra-icono i{font-size:1.4rem;color:var(--secondary)}
            .badge-cantidad{position:absolute;top:-10px;right:-14px;background:#d4d4ae;color:#39080a;border-radius:50%;width:22px;height:22px;font-size:0.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;transition:all 0.3s ease}
            .badge-cantidad.animado{animation:badgePulse 0.4s ease}
            @keyframes badgePulse{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}
            
            .barra-texto-mini{font-size:0.8rem;font-weight:500}
            .barra-texto-mini span{font-weight:800;color:var(--secondary)}
            
            .barra-acciones-mini{display:flex;gap:8px;align-items:center}
            .btn-cotizar-principal{background:#25D366;border:none;padding:10px 18px;border-radius:40px;color:white;font-weight:700;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.3s ease;min-height:48px}
            .btn-cotizar-principal:active{transform:scale(0.95)}
            .btn-cotizar-principal i{font-size:1rem}
            
            /* ============================================ */
            /* BOTÓN COTIZAR EN LA CARD - NUEVA POSICIÓN */
            /* ============================================ */

            .btn-cotizar-bottom {
                width: 100%;
                padding: 12px 16px;
                border-radius: 40px;
                border: 2px solid var(--primary);
                background: transparent;
                color: var(--primary);
                font-weight: 600;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                min-height: 48px;
                position: relative;
                overflow: hidden;
            }

            /* Efecto hover */
            .btn-cotizar-bottom:hover {
                background: var(--primary);
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(57, 8, 10, 0.25);
            }

            /* Efecto activo (click) */
            .btn-cotizar-bottom:active {
                transform: scale(0.95);
            }

            /* Estado seleccionado (agregado) */
            .btn-cotizar-bottom.seleccionado {
                background: var(--green-500);
                border-color: var(--green-500);
                color: white;
            }

            .btn-cotizar-bottom.seleccionado:hover {
                background: var(--green-600);
                border-color: var(--green-600);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
            }

            /* Animación al agregar */
            @keyframes btnAgregadoPulse {
                0% { transform: scale(1); }
                30% { transform: scale(1.08); }
                60% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }

            .btn-cotizar-bottom.seleccionado {
                animation: btnAgregadoPulse 0.5s ease;
            }

            /* Icono rotación */
            .btn-cotizar-bottom i {
                transition: transform 0.3s ease;
            }

            .btn-cotizar-bottom.seleccionado i {
                transform: scale(1.2);
            }

            /* ============================================ */
            /* MODAL DE CONFIRMACIÓN - AGREGADO */
            /* ============================================ */

            .modal-confirmacion-agregado {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
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
                0% { transform: scale(0) rotate(-30deg); }
                60% { transform: scale(1.2) rotate(5deg); }
                100% { transform: scale(1) rotate(0); }
            }

            .modal-confirmacion-icono i {
                font-size: 2.5rem;
                color: white;
            }

            .modal-confirmacion-contenido h3 {
                font-size: 1.3rem;
                font-weight: 700;
                color: var(--gray-800);
                margin-bottom: 8px;
            }

            .modal-confirmacion-contenido p {
                font-size: 0.9rem;
                color: var(--gray-600);
                margin-bottom: 20px;
                line-height: 1.5;
            }

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
                background: var(--gray-100);
                color: var(--gray-700);
            }

            .btn-seguir-comprando:hover {
                background: var(--gray-200);
                transform: translateY(-2px);
            }

            .btn-ir-cotizacion {
                background: var(--primary);
                color: white;
            }

            .btn-ir-cotizacion:hover {
                background: var(--primary-dark);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(57, 8, 10, 0.3);
            }

            .modal-confirmacion-acciones button:active {
                transform: scale(0.95);
            }

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
            .btn-ver-cotizacion{background:#d4d4ae;border:none;padding:10px 16px;border-radius:40px;color:#39080a;cursor:pointer;font-size:0.7rem;font-weight:700;flex:1;min-height:44px}
            
            /* ============================================ */
            /* MODAL DE COTIZACIÓN - PANTALLA COMPLETA MOBILE */
            /* ============================================ */
            .modal-cotizacion{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10001;justify-content:center;align-items:center;padding:0}
            .modal-cotizacion.active{display:flex}
            .modal-cotizacion-contenido{background:white;border-radius:0;width:100%;height:100%;max-height:100vh;overflow:hidden;display:flex;flex-direction:column}
            
            .modal-cotizacion-header{background:#39080a;color:white;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
            .modal-cotizacion-header h3{font-size:1rem;margin:0;display:flex;align-items:center;gap:8px}
            .modal-cotizacion-close{background:rgba(255,255,255,0.2);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
            .modal-cotizacion-close:active{transform:scale(0.95)}
            
            .modal-cotizacion-body{flex:1;overflow-y:auto;padding:16px}
            
            /* Stepper */
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
            
            /* Paso contenido */
            .paso-contenido{margin-bottom:16px}
            .paso-subtitulo{font-size:0.8rem;color:var(--gray-500);margin-bottom:12px}
            
            /* Paso acciones fijas en la parte inferior */
            .paso-acciones{display:flex;gap:10px;padding:12px 0;border-top:1px solid var(--gray-200);position:sticky;bottom:0;background:white;flex-wrap:wrap}
            .paso-acciones button{flex:1;padding:12px 16px;border-radius:40px;font-weight:600;font-size:0.85rem;border:none;cursor:pointer;min-height:48px}
            .btn-paso-anterior{background:var(--gray-100);color:var(--gray-700)}
            .btn-paso-siguiente{background:var(--primary);color:white}
            .btn-paso-enviar{background:#25D366;color:white;flex:2}
            .btn-paso-anterior:active,.btn-paso-siguiente:active,.btn-paso-enviar:active{transform:scale(0.97)}
            
            /* Productos en paso 1 */
            .productos-lista{border:1px solid var(--gray-200);border-radius:12px;padding:8px;max-height:200px;overflow-y:auto;background:var(--gray-50);margin-bottom:12px}
            .producto-item{display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid var(--gray-200);gap:8px}
            .producto-item:last-child{border-bottom:none}
            .producto-info{flex:1;min-width:0}
            .producto-nombre{font-size:0.8rem;font-weight:600;color:var(--gray-800)}
            .producto-codigo{font-size:0.6rem;color:var(--gray-400);font-family:monospace}
            .producto-especificaciones{display:flex;gap:6px;margin-top:2px;flex-wrap:wrap}
            .producto-especificacion{font-size:0.55rem;background:var(--gray-200);padding:1px 8px;border-radius:20px;display:flex;align-items:center;gap:3px;color:var(--gray-600)}
            .btn-eliminar-producto{background:none;border:none;color:var(--red-500);cursor:pointer;padding:8px;min-height:36px;min-width:36px}
            .btn-eliminar-producto:active{transform:scale(0.95)}
            .btn-agregar-mas{background:none;border:1px dashed var(--primary);color:var(--primary);padding:10px;border-radius:40px;cursor:pointer;width:100%;font-size:0.8rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px}
            
            /* Asesor paso 2 */
            .asignacion-opciones{background:var(--gray-50);border-radius:16px;padding:12px;margin-bottom:12px}
            .asignacion-radio-group{display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap}
            .asignacion-radio-group label{display:flex;align-items:center;gap:8px;font-size:0.8rem;cursor:pointer;padding:6px 0}
            .asignacion-radio-group input[type="radio"]{width:18px;height:18px;accent-color:#39080a}
            
            .selector-manual{margin-top:8px}
            .selector-manual select{width:100%;padding:12px;border:1px solid var(--gray-200);border-radius:12px;font-size:0.85rem;min-height:48px}
            
            .email-search-wrapper{display:flex;flex-direction:column;gap:8px;margin-top:8px}
            .email-search-wrapper input{flex:1;padding:12px;border:1px solid var(--gray-200);border-radius:12px;font-size:0.85rem;min-height:48px}
            .btn-buscar-email{background:#39080a;color:white;border:none;padding:12px;border-radius:12px;cursor:pointer;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px}
            
            .asesor-info-result{padding:10px 14px;border-radius:12px;font-size:0.8rem;margin-top:8px}
            .asesor-info-result.success{background:#ecfdf5;border:1px solid #10b981;color:#065f46}
            .asesor-info-result.warning{background:#fffbeb;border:1px solid #f59e0b;color:#92400e}
            .asesor-info-result.hidden{display:none}
            .asesor-error{background:#fee2e2;color:#dc2626;padding:12px;border-radius:12px;font-size:0.8rem}
            
            .asesor-asignado-card{background:linear-gradient(135deg,#f9fafb 0%,#fff 100%);border-radius:16px;padding:12px;border:1px solid var(--gray-200);margin-top:12px}
            .asesor-asignado-card.hidden{display:none}
            .asesor-asignado-content{display:flex;gap:12px;align-items:center}
            .asesor-avatar{width:44px;height:44px;background:rgba(57,8,10,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
            .asesor-avatar i{font-size:1.2rem;color:#39080a}
            .asesor-info{flex:1}
            .asesor-nombre{font-weight:700;font-size:0.85rem;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
            .asesor-badge{font-size:0.55rem;padding:2px 8px;border-radius:20px;font-weight:500}
            .asesor-badge.auto{background:#dbeafe;color:#1e40af}
            .asesor-badge.manual{background:#dcfce7;color:#166534}
            .asesor-badge.email{background:#f3e8ff;color:#6b21a5}
            .asesor-contacto{font-size:0.65rem;color:var(--gray-500);display:flex;flex-wrap:wrap;gap:10px;margin-top:2px}
            
            /* Datos paso 3 */
            .form-group{margin-bottom:14px}
            .form-group label{display:block;font-size:0.7rem;font-weight:600;color:var(--gray-600);margin-bottom:4px;text-transform:uppercase}
            .form-group label .required{color:var(--red-500)}
            .form-group label .optional{color:var(--gray-400);font-weight:400}
            .form-group input,.form-group select,.form-group textarea{width:100%;padding:12px 14px;border:1px solid var(--gray-200);border-radius:12px;font-size:0.85rem;background:white;min-height:48px}
            .form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:#39080a;box-shadow:0 0 0 3px rgba(57,8,10,0.1)}
            .form-group textarea{min-height:80px;resize:vertical}
            .telefono-wrapper{display:flex;gap:8px;flex-wrap:wrap}
            .telefono-wrapper select{width:auto;min-width:100px;flex-shrink:0}
            .telefono-wrapper input{flex:1}
            
            .mensaje-error{font-size:0.65rem;margin-top:4px;display:flex;align-items:center;gap:4px}
            .mensaje-error.hidden{display:none}
            
            /* Resumen paso 4 */
            .resumen-envio{text-align:center;padding:12px 0}
            .resumen-icono i{font-size:3rem;color:var(--green-500);margin-bottom:8px}
            .resumen-envio h4{font-size:1.2rem;color:var(--gray-800);margin-bottom:4px}
            .resumen-datos{background:var(--gray-50);border-radius:16px;padding:12px;margin-top:12px;text-align:left}
            .resumen-item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-200);font-size:0.8rem}
            .resumen-item:last-child{border-bottom:none}
            .resumen-label{color:var(--gray-500)}
            .resumen-valor{font-weight:600;color:var(--gray-800)}
            
            /* ============================================ */
            /* MODAL QR - PANTALLA COMPLETA */
            /* ============================================ */
            .modal-qr {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.92);
                z-index: 10000;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }

            .modal-qr.active {
                display: flex;
            }

            .modal-qr-contenido {
                background: white;
                border-radius: 20px;
                width: 100%;
                max-width: 450px;
                max-height: 90vh;
                overflow: hidden;
                animation: modalFadeIn 0.3s ease;
            }

            .modal-qr-header {
                background: #39080a;
                color: white;
                padding: 14px 18px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-qr-header h3 {
                font-size: 1rem;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .modal-qr-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .modal-qr-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }

            .modal-qr-close:active {
                transform: scale(0.95);
            }

            .modal-qr-body {
                padding: 20px;
            }

            #qr-reader {
                width: 100%;
                max-width: 400px;
                margin: 0 auto;
                border-radius: 12px;
                overflow: hidden;
                background: #f0f0f0;
                min-height: 200px;
            }

            #qr-reader video {
                width: 100%;
                border-radius: 12px;
            }

            #qr-reader canvas {
                display: none !important;
            }

            .qr-instrucciones {
                display: flex;
                align-items: center;
                gap: 8px;
                justify-content: center;
                margin-top: 12px;
                font-size: 0.75rem;
                color: var(--gray-500);
            }

            .qr-instrucciones i {
                color: var(--primary);
            }

            .btn-cancelar-qr {
                margin-top: 16px;
                width: 100%;
                padding: 12px;
                border-radius: 40px;
                border: 1px solid #e5e7eb;
                background: white;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
            }

            .btn-cancelar-qr:hover {
                background: #f3f4f6;
            }

            .btn-cancelar-qr:active {
                transform: scale(0.98);
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
        /* ============================================ */
        /* TOAST NOTIFICACIONES MEJORADAS */
        /* ============================================ */

        .toast-notificacion {
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            padding: 14px 24px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.85rem;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            max-width: 90%;
            text-align: center;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .toast-notificacion.show {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) translateY(0);
        }

        .toast-notificacion.success {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }

        .toast-notificacion.error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }

        .toast-notificacion i {
            font-size: 1.1rem;
        }

        /* ============================================ */
        /* BARRA DE COTIZACIÓN - ANIMACIONES */
        /* ============================================ */

        @keyframes slideUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes slideDown {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(100%);
                opacity: 0;
            }
        }

        @keyframes barraUpdate {
            0% { transform: scale(1); }
            50% { transform: scale(1.01); }
            100% { transform: scale(1); }
        }

        .barra-cotizacion {
            animation: slideUp 0.5s ease;
        }

        .barra-cotizacion .badge-cantidad.animado {
            animation: badgePulse 0.4s ease;
        }

        @keyframes badgePulse {
            0% { transform: scale(1); }
            30% { transform: scale(1.4); }
            60% { transform: scale(0.8); }
            100% { transform: scale(1); }
        }

        /* ============================================ */
        /* RESPONSIVE AJUSTES */
        /* ============================================ */

        @media (max-width: 480px) {
            .btn-cotizar-bottom {
                font-size: 0.75rem;
                padding: 10px 12px;
                min-height: 44px;
            }
            
            .modal-confirmacion-contenido {
                padding: 24px 20px;
                margin: 16px;
            }
            
            .modal-confirmacion-acciones {
                flex-direction: column;
            }
            
            .modal-confirmacion-acciones button {
                width: 100%;
            }
            
            .modal-confirmacion-barra {
                font-size: 0.7rem;
                padding: 10px 12px;
                flex-direction: column;
                text-align: center;
            }
        }

        @media (min-width: 768px) {
            .btn-cotizar-bottom {
                font-size: 0.9rem;
                padding: 14px 20px;
                min-height: 52px;
            }
        }
                      
            /* ============================================ */
            /* MODAL DE FILTROS - SOLO MÓVIL */
            /* ============================================ */

            /* Ocultar el modal por defecto en desktop */
            .filtros-modal {
                position: fixed;
                top: 0;
                right: -100%;
                width: 85%;
                max-width: 320px;
                height: 100%;
                background: white;
                z-index: 10001;
                transition: right 0.3s ease;
                box-shadow: -5px 0 25px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
            }

            /* Mostrar el modal cuando tiene la clase "show" */
            .filtros-modal.show {
                right: 0;
            }

            /* Overlay para el modal */
            .filtros-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: none;
            }

            .filtros-modal-overlay.show {
                display: block;
            }

            /* EN DESKTOP: ocultar completamente el modal */
            @media (min-width: 769px) {
                .filtros-modal {
                    display: none !important;
                }
                .filtros-modal-overlay {
                    display: none !important;
                }
            }

            /* EN MÓVIL: mostrar el modal correctamente */
            @media (max-width: 768px) {
                .filtros-modal {
                    display: flex !important;
                    right: -100%;
                }
                .filtros-modal.show {
                    right: 0;
                }
                .filtros-modal-overlay {
                    display: none;
                }
                .filtros-modal-overlay.show {
                    display: block;
                }
            }           

            /* ============================================ */
            /* MODAL PERSONALIZADO */
            /* ============================================ */
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
            .btn-modal-primary{background:#39080a;color:white}
            .btn-modal-success{background:#10b981;color:white}
            .btn-modal-danger{background:#dc3545;color:white}
            .btn-modal-warning{background:#f59e0b;color:white}
            .btn-modal-secondary{background:var(--gray-200);color:var(--gray-700)}
            
            /* ============================================ */
            /* FOOTER */
            /* ============================================ */
            footer{background:var(--primary-dark);color:white;padding:30px 16px 20px;margin-top:30px}
            .footer-grid{display:grid;grid-template-columns:1fr;gap:24px;max-width:1200px;margin:0 auto;text-align:center}
            .footer-logo img{width:130px;margin-bottom:10px}
            .footer-logo p{font-size:0.7rem;opacity:0.7;line-height:1.5}
            .footer-social h4,.footer-links h4{font-size:0.85rem;margin-bottom:12px;color:var(--secondary)}
            .footer-social a,.footer-links a{display:flex;align-items:center;justify-content:center;gap:10px;color:rgba(255,255,255,0.7);text-decoration:none;margin-bottom:8px;transition:0.3s;font-size:0.75rem}
            .footer-social a:hover,.footer-links a:hover{color:var(--secondary);transform:translateX(3px)}
            .footer-bottom{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:0.6rem;opacity:0.6}
            
            /* ============================================ */
            /* RESPONSIVE - TABLET */
            /* ============================================ */
            @media (min-width: 480px) {
                .productos-grid-enhanced{grid-template-columns:repeat(2,1fr);gap:16px}
                .card-image{height:180px}
                .hero-title{font-size:2.2rem}
                .countdown-item{min-width:60px;padding:8px 12px}
                .countdown-number{font-size:1.4rem}
            }
            
            @media (min-width: 768px) {
                .container{padding:0 24px}
                .logo img{width:200px}
                .hero-outlet{min-height:60vh;padding:100px 0 60px;text-align:left}
                .hero-content{max-width:600px;text-align:left}
                .hero-title{font-size:3rem}
                .hero-description{font-size:1rem}
                .countdown-container{display:inline-block;width:auto}
                .btn-primary-custom{width:auto;padding:16px 36px}
                .hero-beneficios{justify-content:flex-start}
                
                .search-filters-section{padding:20px 24px;margin:-30px 0 30px}
                .search-box-enhanced{flex-direction:row;align-items:center}
                .search-input-wrapper input{min-height:56px;font-size:1rem}
                .btn-escaneo-qr{width:auto;padding:14px 24px;min-height:56px}
                
                .filters-desktop-container{display:block}
                .filtros-fab{display:none!important}
                .filtros-chips{display:none}
                
                .productos-grid-enhanced{grid-template-columns:repeat(3,1fr);gap:20px}
                .card-image{height:200px}
                .card-info h3{font-size:0.9rem}
                .btn-detalle-enhanced{font-size:0.8rem;min-height:48px}
                
                .barra-cotizacion{min-height:auto;padding:12px 24px}
                .btn-expandir{display:none}
                .barra-cotizacion.expanded .btn-expandir{display:flex}
                
                .modal-cotizacion-contenido{border-radius:24px;width:95%;height:auto;max-height:90vh;max-width:750px}
                .modal-cotizacion-header{padding:16px 24px}
                .modal-cotizacion-body{padding:24px}
                
                .stepper-circle{width:36px;height:36px;font-size:0.9rem}
                .stepper-label{font-size:0.65rem}
                
                .footer-grid{grid-template-columns:repeat(3,1fr);text-align:left}
                .footer-social a,.footer-links a{justify-content:flex-start}
                
                .btn-paso-enviar{flex:1}
                .paso-acciones{flex-wrap:nowrap}
                
                .email-search-wrapper{flex-direction:row}
                .email-search-wrapper input{min-height:48px}
                .btn-buscar-email{width:auto;padding:12px 24px}
                
                .telefono-wrapper{flex-wrap:nowrap}
            }
            
            @media (min-width: 1024px) {
                .hero-title{font-size:3.5rem}
                .hero-outlet{min-height:70vh}
                .productos-grid-enhanced{grid-template-columns:repeat(4,1fr);gap:24px}
                .card-image{height:220px}
            }
            
            /* ============================================ */
            /* UTILIDADES */
            /* ============================================ */
            .hidden{display:none!important}
            .text-center{text-align:center}
            .text-sm{font-size:0.8rem}
            .text-xs{font-size:0.65rem}
            .text-gray-400{color:var(--gray-400)}
            .text-gray-500{color:var(--gray-500)}
            .text-gray-600{color:var(--gray-600)}
            .text-red-500{color:var(--red-500)}
            .mt-1{margin-top:4px}
            .mt-2{margin-top:8px}
            .mt-3{margin-top:12px}
            .mb-1{margin-bottom:4px}
            .mb-2{margin-bottom:8px}
            .mb-3{margin-bottom:12px}
            .gap-1{gap:4px}
            .gap-2{gap:8px}
            .gap-3{gap:12px}
            .flex{display:flex}
            .flex-col{flex-direction:column}
            .items-center{align-items:center}
            .justify-between{justify-content:space-between}
            .flex-wrap{flex-wrap:wrap}
            .w-full{width:100%}
            .animate-pulse{animation:pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite}
            
            /* Scrollbar personalizada */
            .productos-lista::-webkit-scrollbar,
            .barra-productos-preview::-webkit-scrollbar,
            .modal-cotizacion-body::-webkit-scrollbar{width:4px}
            .productos-lista::-webkit-scrollbar-track,
            .barra-productos-preview::-webkit-scrollbar-track,
            .modal-cotizacion-body::-webkit-scrollbar-track{background:var(--gray-100);border-radius:10px}
            .productos-lista::-webkit-scrollbar-thumb,
            .barra-productos-preview::-webkit-scrollbar-thumb,
            .modal-cotizacion-body::-webkit-scrollbar-thumb{background:var(--primary);border-radius:10px}
        </style>
    </head>
    <body>
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
        
        <!-- Overlay del modal (fondo oscuro) -->
        <div class="filtros-modal-overlay" id="filtrosModalOverlay" onclick="closeFiltrosModal()"></div>

        <!-- Modal de filtros -->
        <div class="filtros-modal" id="filtrosModal">
            <div class="filtros-modal-header">
                <h3><i class="fas fa-filter"></i> Filtros</h3>
                <button class="close-modal-btn" onclick="closeFiltrosModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="filtros-modal-body">
                <div class="filtro-group">
                    <label>Familia</label>
                    <select id="filtroFamiliaModal">
                        <option value="">Todas</option>
                        ${familiasOptions}
                    </select>
                </div>
                <div class="filtro-group">
                    <label>Acabado</label>
                    <select id="filtroAcabadoModal">
                        <option value="">Todos</option>
                        ${acabadosOptions}
                    </select>
                </div>
                <div class="filtro-group">
                    <label>Material</label>
                    <select id="filtroMaterialModal">
                        <option value="">Todos</option>
                        ${materialesOptions}
                    </select>
                </div>
            </div>
            <div class="filtros-modal-footer">
                <button class="btn-filter" onclick="aplicarFiltrosDesdeModal()">Aplicar</button>
                <button class="btn-clear" onclick="limpiarFiltrosDesdeModal()">Limpiar</button>
            </div>
        </div>
        
        <!-- FAB Filtros (Izquierda) y Scroll Top (Derecha) -->
        <button class="filtros-fab" id="filtrosFab" onclick="openFiltrosModal()">
            <i class="fas fa-sliders-h"></i>
            <span class="badge-filtros" id="filtrosBadgeMobile" style="display:none;">0</span>
        </button>
        <button class="scroll-top-btn" id="scrollTopBtn" onclick="scrollToTop()">
            <i class="fas fa-arrow-up"></i>
        </button>
        
        ${modalConfirmacionHtml}
        ${modalCotizacionHtml}
        ${modalQRHtml}
        
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
        
        <div class="container">
            <div class="search-filters-section">
                <div class="search-wrapper">
                    <!-- Fila 1: Búsqueda + Botón limpiar + QR -->
                    <div class="search-box-enhanced">
                        <!-- Campo de búsqueda -->
                        <div class="search-input-wrapper">
                            <i class="fas fa-search"></i>
                            <input type="text" id="searchOutlet" 
                                placeholder="Buscar producto..." 
                                autocomplete="off"
                                inputmode="search">
                            <!-- Botón interno (oculto en desktop, visible en móvil) -->
                            <button id="btnLimpiarBusqueda" class="btn-clear-search" type="button" style="display: none;">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>
                        
                        <button id="btnLimpiarBusquedaExterno" class="btn-clear-externo" type="button" style="display: none;">
                            <i class="fas fa-eraser"></i>
                            <span class="btn-text">Limpiar</span>
                        </button>
                        
                        <!-- Botón Escanear QR -->
                        <button id="btnEscanearQR" class="btn-escaneo-qr">
                            <i class="fas fa-qrcode"></i>
                            <span>Escanear QR</span>
                        </button>
                    </div>
                    
                    <!-- Hint -->
                    <div class="search-hint">
                        <i class="fas fa-info-circle"></i> 
                        <span>Busca por nombre, código o escanea QR</span>
                    </div>
                </div>
                
                <!-- Chips de filtros activos -->
                <div id="filtrosActivosChips" class="filtros-chips" style="display:none;"></div>
                
                <!-- Filtros desktop -->
                <div class="filters-desktop-container">
                    <div class="filtros-grid-enhanced">
                        <div class="filtro-group">
                            <label>Familia</label>
                            <select id="filtroFamilia">
                                <option value="">Todas</option>
                                ${familiasOptions}
                            </select>
                        </div>
                        <div class="filtro-group">
                            <label>Acabado</label>
                            <select id="filtroAcabado">
                                <option value="">Todos</option>
                                ${acabadosOptions}
                            </select>
                        </div>
                        <div class="filtro-group">
                            <label>Material</label>
                            <select id="filtroMaterial">
                                <option value="">Todos</option>
                                ${materialesOptions}
                            </select>
                        </div>
                        <div class="filtros-actions">
                            <button onclick="aplicarFiltrosOutlet()" class="btn-filter">Aplicar</button>
                            <button onclick="limpiarFiltrosOutlet()" class="btn-clear">Limpiar</button>
                        </div>
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
            // ============================================
            // EXPONER FUNCIONES GLOBALES
            // ============================================
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
            window.abrirModalCotizacion = abrirModalCotizacion;
            window.cerrarModalCotizacion = cerrarModalCotizacion;
            window.eliminarProductoCotizacion = eliminarProductoCotizacion;
            window.toggleSeleccionCotizacion = toggleSeleccionCotizacion;
            window.irPasoCotizacion = irPasoCotizacion;
            window.agregarMasProductos = agregarMasProductos;
            window.cambiarModoAsignacionPaso = cambiarModoAsignacionPaso;
            window.buscarAsesorPorEmailPaso = buscarAsesorPorEmailPaso;
            window.actualizarPlaceholderTelefono = actualizarPlaceholderTelefono;
            window.actualizarChipsFiltrosActivos = actualizarChipsFiltrosActivos;
            window.validarCampoPaso = validarCampoPaso;
            window.seleccionarAsesorManualPaso = seleccionarAsesorManualPaso;
            window.toggleClearButton = toggleClearButton;
            window.limpiarCampoBusqueda = limpiarCampoBusqueda;
            window.configurarBusqueda = configurarBusqueda; 

            
            // ============================================
            // FUNCIONES DE FILTROS
            // ============================================
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
            
            function openFiltrosModal(){
                syncModalSelects();
                const modal=document.getElementById('filtrosModal');
                if(modal){modal.classList.add('show');document.body.style.overflow='hidden';}
            }
            
            function closeFiltrosModal(){
                const modal=document.getElementById('filtrosModal');
                if(modal){modal.classList.remove('show');document.body.style.overflow='';}
            }
            
            // ============================================
            // PROTECCIÓN DE IMÁGENES Y CONTENIDO
            // ============================================
            document.addEventListener('contextmenu', function(e){e.preventDefault();return false;});
            document.addEventListener('dragstart', function(e){e.preventDefault();return false;});
            document.addEventListener('keydown', function(e){
                if(e.key==='F12'){e.preventDefault();return false;}
                if(e.ctrlKey&&e.shiftKey&&e.key==='I'){e.preventDefault();return false;}
                if(e.ctrlKey&&e.key==='u'){e.preventDefault();return false;}
                if(e.ctrlKey&&e.key==='s'){e.preventDefault();return false;}
                if(e.ctrlKey&&e.shiftKey&&e.key==='J'){e.preventDefault();return false;}
            });
            
            // ============================================
            // INICIALIZACIÓN
            // ============================================
// ============================================
// INICIALIZACIÓN COMPLETA - ACTUALIZADA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página Outlet...');
    
    // ============================================
    // PASO 1: CARGAR COTIZACIÓN DE LOCALSTORAGE
    // ============================================
    if (typeof cargarSeleccionCotizacion === 'function') {
        cargarSeleccionCotizacion();
        console.log('📦 Productos en cotización:', cotizacionSeleccionados?.length || 0);
    }
    
    // ============================================
    // PASO 2: CONFIGURAR BÚSQUEDA
    // ============================================
    const searchInput = document.getElementById('searchOutlet');
    const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
    const btnLimpiarBusquedaExterno = document.getElementById('btnLimpiarBusquedaExterno');
    let timeoutBusqueda = null;
    
    function toggleClearButton() {
        const input = document.getElementById('searchOutlet');
        const btnInterno = document.getElementById('btnLimpiarBusqueda');
        const btnExterno = document.getElementById('btnLimpiarBusquedaExterno');
        
        if (!input) return;
        
        const tieneTexto = input.value && input.value.trim().length > 0;
        
        // Botón interno (solo en móvil, dentro del input)
        if (btnInterno) {
            if (tieneTexto && window.innerWidth <= 768) {
                btnInterno.style.display = 'flex';
                btnInterno.style.opacity = '1';
                btnInterno.style.visibility = 'visible';
            } else {
                btnInterno.style.display = 'none';
            }
        }
        
        // Botón externo (visible en todos los dispositivos cuando hay texto)
        if (btnExterno) {
            if (tieneTexto) {
                btnExterno.style.display = 'flex';
                btnExterno.classList.add('visible');
                btnExterno.classList.remove('hidden');
            } else {
                btnExterno.style.display = 'none';
                btnExterno.classList.remove('visible');
                btnExterno.classList.add('hidden');
            }
        }
    }
    
    function limpiarCampoBusqueda() {
        console.log('🧹 Limpiando campo de búsqueda...');
        
        const input = document.getElementById('searchOutlet');
        const btnInterno = document.getElementById('btnLimpiarBusqueda');
        const btnExterno = document.getElementById('btnLimpiarBusquedaExterno');
        
        // Limpiar input
        if (input) {
            input.value = '';
        }
        
        // Ocultar botón interno
        if (btnInterno) {
            btnInterno.style.display = 'none';
        }
        
        // Ocultar botón externo
        if (btnExterno) {
            btnExterno.style.display = 'none';
            btnExterno.classList.remove('visible');
            btnExterno.classList.add('hidden');
        }
        
        // Disparar evento input
        if (input) {
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }
        
        // Aplicar filtros
        if (typeof window.aplicarFiltrosOutlet === 'function') {
            window.aplicarFiltrosOutlet();
            
            // Después de aplicar filtros, actualizar botones
            setTimeout(() => {
                if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                    window.actualizarTodosLosBotonesCotizar();
                }
            }, 50);
        }
        
        // Dar foco
        if (input) {
            input.focus();
        }
    }
    
    function configurarBusqueda() {
        console.log('🔧 Configurando búsqueda...');
        
        const searchInput = document.getElementById('searchOutlet');
        const btnInterno = document.getElementById('btnLimpiarBusqueda');
        const btnExterno = document.getElementById('btnLimpiarBusquedaExterno');
        
        if (!searchInput) {
            console.warn('⚠️ Input de búsqueda no encontrado');
            return;
        }
        
        // EVENTO INPUT
        searchInput.addEventListener('input', function(e) {
            toggleClearButton();
            
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                    
                    setTimeout(() => {
                        if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                            window.actualizarTodosLosBotonesCotizar();
                        }
                    }, 50);
                }
            }, 300);
        });
        
        // EVENTO KEYDOWN - Escape limpia
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                limpiarCampoBusqueda();
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(timeoutBusqueda);
                if (typeof window.aplicarFiltrosOutlet === 'function') {
                    window.aplicarFiltrosOutlet();
                    
                    setTimeout(() => {
                        if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                            window.actualizarTodosLosBotonesCotizar();
                        }
                    }, 50);
                }
            }
        });
        
        // EVENTO FOCUS
        searchInput.addEventListener('focus', function() {
            toggleClearButton();
        });
        
        // EVENTO BLUR
        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (!this.value || this.value.trim().length === 0) {
                    const btnExterno = document.getElementById('btnLimpiarBusquedaExterno');
                    if (btnExterno) {
                        btnExterno.classList.remove('visible');
                        btnExterno.classList.add('hidden');
                        btnExterno.style.display = 'none';
                    }
                }
            }, 200);
        });
        
        // CONFIGURAR BOTÓN INTERNO
        if (btnInterno) {
            const nuevoBtn = btnInterno.cloneNode(true);
            btnInterno.parentNode.replaceChild(nuevoBtn, btnInterno);
            
            nuevoBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                limpiarCampoBusqueda();
            });
        }
        
        // CONFIGURAR BOTÓN EXTERNO
        if (btnExterno) {
            const nuevoBtnExterno = btnExterno.cloneNode(true);
            btnExterno.parentNode.replaceChild(nuevoBtnExterno, btnExterno);
            
            nuevoBtnExterno.addEventListener('click', function(e) {
                e.preventDefault();
                limpiarCampoBusqueda();
            });
        }
        
        // Estado inicial
        toggleClearButton();
        
        console.log('✅ Búsqueda configurada correctamente');
    }
    
    // Ejecutar configuración de búsqueda
    configurarBusqueda();
    
    // ============================================
    // PASO 3: CONFIGURAR ESCÁNER QR
    // ============================================
    const btnEscanear = document.getElementById('btnEscanearQR');
    const btnCerrarQR = document.getElementById('btnCerrarQR');
    const modalQR = document.getElementById('modalQR');
    
    if (btnEscanear) {
        const nuevoBtnEscanear = btnEscanear.cloneNode(true);
        btnEscanear.parentNode.replaceChild(nuevoBtnEscanear, btnEscanear);
        
        nuevoBtnEscanear.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.iniciarEscaneoQR === 'function') {
                window.iniciarEscaneoQR();
            }
        });
        console.log('✅ Botón escanear QR configurado');
    }
    
    if (btnCerrarQR) {
        const nuevoBtnCerrar = btnCerrarQR.cloneNode(true);
        btnCerrarQR.parentNode.replaceChild(nuevoBtnCerrar, btnCerrarQR);
        
        nuevoBtnCerrar.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.cerrarModalQR === 'function') {
                window.cerrarModalQR();
            }
        });
        console.log('✅ Botón cerrar QR configurado');
    }
    
    if (modalQR) {
        const nuevoModal = modalQR.cloneNode(true);
        modalQR.parentNode.replaceChild(nuevoModal, modalQR);
        
        nuevoModal.addEventListener('click', function(e) {
            if (e.target === nuevoModal) {
                if (typeof window.cerrarModalQR === 'function') {
                    window.cerrarModalQR();
                }
            }
        });
        console.log('✅ Modal QR overlay configurado');
    }
    
    // ============================================
    // PASO 4: CONFIGURAR EVENTOS QR ADICIONALES
    // ============================================
    if (typeof configurarEventosQR === 'function') {
        configurarEventosQR();
        console.log('✅ Eventos QR adicionales configurados');
    }
    
    // ============================================
    // PASO 5: CONFIGURAR FILTROS
    // ============================================
    const familiaSelect = document.getElementById('filtroFamilia');
    const acabadoSelect = document.getElementById('filtroAcabado');
    const materialSelect = document.getElementById('filtroMaterial');
    
    const aplicarFiltros = () => {
        if (typeof window.syncModalSelects === 'function') {
            window.syncModalSelects();
        }
        if (typeof window.aplicarFiltrosOutlet === 'function') {
            window.aplicarFiltrosOutlet();
            
            setTimeout(() => {
                if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
                    window.actualizarTodosLosBotonesCotizar();
                }
            }, 50);
        }
    };
    
    if (familiaSelect) {
        familiaSelect.addEventListener('change', aplicarFiltros);
    }
    if (acabadoSelect) {
        acabadoSelect.addEventListener('change', aplicarFiltros);
    }
    if (materialSelect) {
        materialSelect.addEventListener('change', aplicarFiltros);
    }
    console.log('✅ Filtros configurados');
    
    // ============================================
    // PASO 6: ACTUALIZAR BOTONES SEGÚN LOCALSTORAGE
    // ============================================
    setTimeout(() => {
        if (typeof window.actualizarTodosLosBotonesCotizar === 'function') {
            window.actualizarTodosLosBotonesCotizar();
            console.log('✅ Botones actualizados según localStorage');
        }
    }, 100);
    
    // ============================================
    // PASO 7: INICIALIZAR LAZY LOADING
    // ============================================
    if (typeof inicializarLazyLoading === 'function') {
        inicializarLazyLoading();
        console.log('✅ Lazy loading inicializado');
    }
    
    // ============================================
    // PASO 8: INICIALIZAR COUNTDOWN
    // ============================================
    if (typeof initCountdown === 'function') {
        initCountdown();
        console.log('✅ Countdown inicializado');
    }
    
    // ============================================
    // PASO 9: CONFIGURAR BOTÓN SCROLL TOP
    // ============================================
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        });
        console.log('✅ Scroll button configurado');
    }
    
    // ============================================
    // PASO 10: PRECARGAR ASESORES (NUEVO - PROPUESTA 1)
    // ============================================
    if (typeof precargarAsesoresOutlet === 'function') {
        console.log('🔄 Precargando asesores...');
        
        const cargarAsesores = async () => {
            try {
                const vendedores = await precargarAsesoresOutlet();
                asesoresPrecargados = vendedores;
                
                // Si hay vendedores, asignar el mejor automáticamente
                if (vendedores && vendedores.length > 0) {
                    if (typeof obtenerMejorAsesor === 'function') {
                        asesorSeleccionadoActual = obtenerMejorAsesor(vendedores);
                        modoAsignacionActual = 'auto';
                        console.log('🎯 Asesor automático asignado:', asesorSeleccionadoActual?.nombre);
                    }
                } else {
                    console.warn('⚠️ No hay asesores disponibles');
                }
            } catch (error) {
                console.error('❌ Error precargando asesores:', error);
            }
        };
        
        if (window.requestIdleCallback) {
            requestIdleCallback(() => { cargarAsesores(); });
        } else {
            setTimeout(() => { cargarAsesores(); }, 1000);
        }
    }
    
    // ============================================
    // PASO 11: CONFIGURAR CIERRE CON ESCAPE
    // ============================================
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
    console.log('✅ Tecla Escape configurada');
    
    // ============================================
    // PASO 12: RECARGAR BARRA DE COTIZACIÓN SI HAY PRODUCTOS
    // ============================================
    setTimeout(() => {
        if (cotizacionSeleccionados && cotizacionSeleccionados.length > 0) {
            if (typeof window.actualizarBarraFlotante === 'function') {
                window.actualizarBarraFlotante();
                console.log('✅ Barra de cotización actualizada');
            }
            if (typeof window.actualizarBadgeHeader === 'function') {
                window.actualizarBadgeHeader();
                console.log('✅ Badge header actualizado');
            }
        }
    }, 150);
    
    // ============================================
    // PASO 13: CONFIGURAR BOTÓN DE FILTROS MÓVIL
    // ============================================
    const filtrosFab = document.getElementById('filtrosFab');
    if (filtrosFab) {
        filtrosFab.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.openFiltrosModal === 'function') {
                window.openFiltrosModal();
            }
        });
        console.log('✅ FAB filtros configurado');
    }
    
    // ============================================
    // PASO 14: CONFIGURAR BOTÓN LIMPIAR FILTROS
    // ============================================
    const btnLimpiarTodoOutlet = document.getElementById('btnLimpiarTodoOutlet');
    if (btnLimpiarTodoOutlet) {
        btnLimpiarTodoOutlet.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.limpiarFiltrosOutlet === 'function') {
                window.limpiarFiltrosOutlet();
            }
        });
        console.log('✅ Botón limpiar filtros configurado');
    }
    
    // ============================================
    // FINALIZAR INICIALIZACIÓN
    // ============================================
    console.log('✅ Outlet renderizado correctamente con todas las mejoras mobile first');
    console.log('📊 Estado final:', {
        productosEnCotizacion: cotizacionSeleccionados?.length || 0,
        productosTotales: window.outletProductosCache?.length || 0,
        asesoresDisponibles: asesoresPrecargados?.length || 0,
        asesorSeleccionado: asesorSeleccionadoActual?.nombre || 'Ninguno',
        modoAsignacion: modoAsignacionActual || 'auto'
    });
});
        </script>
    </body>
    </html>`;
    
    document.documentElement.innerHTML = html;
    
    setTimeout(() => {
        cargarSeleccionCotizacion();

        // Configurar eventos QR
        if (typeof configurarEventosQR === 'function') {
            configurarEventosQR();
        }

        // Configurar botón de escaneo QR
        const btnEscanear = document.getElementById('btnEscanearQR');
        if (btnEscanear) {
            // IMPORTANTE: Remover event listeners anteriores
            const nuevoBtn = btnEscanear.cloneNode(true);
            btnEscanear.parentNode.replaceChild(nuevoBtn, btnEscanear);
            
            nuevoBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📷 Click en escanear QR');
                if (typeof window.iniciarEscaneoQR === 'function') {
                    window.iniciarEscaneoQR();
                } else {
                    console.error('❌ iniciarEscaneoQR no está definida');
                }
            });
        }
        
        // CONFIGURAR CIERRE CON ESCAPE
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modalQR = document.getElementById('modalQR');
                if (modalQR && modalQR.style.display === 'flex') {
                    cerrarModalQR();
                }
            }
        });

        if (typeof configurarBusquedaOutlet === 'function') {
            console.log('✅ Configurando búsqueda...');
            configurarBusquedaOutlet();
        } else {
            console.warn('⚠️ configurarBusquedaOutlet no está definida');
        }

        if (cotizacionSeleccionados && cotizacionSeleccionados.length > 0) {
            actualizarBarraFlotante();
            actualizarTodosLosBotonesCotizar();
            actualizarBadgeHeader();
        }
        
        if (typeof initCountdown === 'function') initCountdown();
        inicializarLazyLoading();
        
        if (window.requestIdleCallback) {
            requestIdleCallback(() => { precargarAsesoresOutlet(); });
        } else {
            setTimeout(() => precargarAsesoresOutlet(), 2000);
        }
        
        // Asegurar que el botón de escáner QR funcione después de cargar el DOM
        setTimeout(() => {
            const btnEscanear = document.getElementById('btnEscanearQR');
            if (btnEscanear) {
                btnEscanear.onclick = function(e) {
                    e.preventDefault();
                    iniciarEscaneoQR();
                };
            }
        }, 500);
        
        console.log('✅ Outlet renderizado correctamente con todas las mejoras mobile first');
        
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


