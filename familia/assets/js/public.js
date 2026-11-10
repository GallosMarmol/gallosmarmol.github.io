// ============================================================
// assets/js/public.js
// Lógica del catálogo público
// ============================================================

import { CatalogoAPI } from '../../../shared/js/supabase-client.js';

// ============================================================
// TEMAS DE PIEDRA (para generar vetas por CSS)
// ============================================================
const STONE_THEME = {
  "Mármol": { base: "#efece4", vein: "#c9c2b2", deep: "#a9a08a" },
  "Granito": { base: "#2b2a28", vein: "#54514c", deep: "#0f0e0d" },
  "Cuarzo": { base: "#f2f0ec", vein: "#d7cdb8", deep: "#b6a97e" },
  "Travertino": { base: "#e4d3b8", vein: "#c9b28a", deep: "#a9895c" },
  "Porcelanato": { base: "#8f8d89", vein: "#a9a7a2", deep: "#6b6966" },
  "Revestimientos": { base: "#c7b9a3", vein: "#a08d6d", deep: "#7c6947" },
  "Molduras": { base: "#efece4", vein: "#d8d0bd", deep: "#b8ac8e" },
  "Baldosas": { base: "#b5573f", vein: "#8f3f2c", deep: "#622a1d" }
};

// --- 3.3 abrirModalImagen ---
let modalImagenes = [];
let modalIndex = 0;
let modalZoom = 1;
let modalRotation = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

export function abrirModalImagen(url, todasLasFotos, index = 0) {
  // Convertir todas las URLs
  modalImagenes = todasLasFotos.map(f => convertirUrlGoogleDrive(f) || f);
  modalIndex = index;
  modalZoom = 1;
  modalRotation = 0;
  dragOffsetX = 0;
  dragOffsetY = 0;
  
  const modal = document.getElementById('modal-imagenes');
  const img = document.getElementById('modal-img');
  const contador = document.getElementById('modal-contador');
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');
  
  if (!modal) return;
  
  // Mostrar la imagen
  const imgUrl = modalImagenes[modalIndex] || url;
  img.src = imgUrl;
  img.alt = `Imagen ${modalIndex + 1} de ${modalImagenes.length}`;
  img.style.transform = `scale(${modalZoom}) rotate(${modalRotation}deg)`;
  img.style.transition = 'transform 0.3s ease';
  
  // Actualizar contador
  contador.textContent = `${modalIndex + 1} / ${modalImagenes.length}`;
  
  // Mostrar/ocultar botones de navegación
  if (modalImagenes.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
  }
  
  // Abrir modal
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // Resetear posición de arrastre
  img.style.left = '0';
  img.style.top = '0';
  
  // Focus en el modal para teclado
  modal.focus();
}

// --- 3.4 cerrarModalImagen ---
export function cerrarModalImagen() {
  const modal = document.getElementById('modal-imagenes');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  modalZoom = 1;
  modalRotation = 0;
  dragOffsetX = 0;
  dragOffsetY = 0;
}

// --- 3.5 navegarModal ---
export function navegarModal(direccion) {
  const nuevaIndex = modalIndex + direccion;
  if (nuevaIndex < 0 || nuevaIndex >= modalImagenes.length) return;
  modalIndex = nuevaIndex;
  
  const img = document.getElementById('modal-img');
  const contador = document.getElementById('modal-contador');
  
  // Resetear zoom y rotación al cambiar de imagen
  modalZoom = 1;
  modalRotation = 0;
  dragOffsetX = 0;
  dragOffsetY = 0;
  
  img.src = modalImagenes[modalIndex];
  img.alt = `Imagen ${modalIndex + 1} de ${modalImagenes.length}`;
  img.style.transform = `scale(${modalZoom}) rotate(${modalRotation}deg)`;
  img.style.left = '0';
  img.style.top = '0';
  
  contador.textContent = `${modalIndex + 1} / ${modalImagenes.length}`;
}

// --- 3.6 cambiarZoom ---
export function cambiarZoom(direccion) {
  modalZoom = Math.min(Math.max(modalZoom + direccion * 0.25, 0.5), 3);
  const img = document.getElementById('modal-img');
  if (img) {
    img.style.transform = `scale(${modalZoom}) rotate(${modalRotation}deg)`;
  }
}

// --- 3.7 rotarImagen (agregar) ---
export function rotarImagen() {
  modalRotation = (modalRotation + 90) % 360;
  const img = document.getElementById('modal-img');
  if (img) {
    img.style.transform = `scale(${modalZoom}) rotate(${modalRotation}deg)`;
  }
}

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function stoneSwatchStyle(categoria, seedKey) {
  const t = STONE_THEME[categoria] || STONE_THEME["Mármol"];
  const h = hashStr(seedKey || categoria);
  const a1 = 15 + (h % 140);
  const a2 = (a1 + 70 + (h >> 3) % 50) % 360;
  const a3 = (a1 + 140 + (h >> 5) % 40) % 360;
  const p1 = 20 + (h % 60);
  const p2 = 30 + ((h >> 4) % 50);
  
  return `background:
    linear-gradient(${a1}deg, transparent 0%, ${t.vein}55 ${p1}%, transparent ${p1+2}%, transparent 100%),
    linear-gradient(${a2}deg, transparent 0%, ${t.deep}44 ${p2}%, transparent ${p2+3}%, transparent 100%),
    linear-gradient(${a3}deg, transparent 40%, ${t.vein}33 46%, transparent 52%),
    linear-gradient(160deg, ${t.base}, ${t.deep}33);`;
}

// ============================================================
// RENDERIZADO DE PRODUCTOS
// ============================================================
export function productCardHtml(p, mostrarBotones = false, variant = 'grid', origen = 'catalogo', opts = {}) {
  // ------------------------------------------------------------
  // Imagen principal
  // ------------------------------------------------------------
  let imagenPrincipal = null;
  if (p.imagen_url) {
    imagenPrincipal = convertirUrlGoogleDrive(p.imagen_url);
  } else if (p.imagen_alt) {
    imagenPrincipal = convertirUrlGoogleDrive(p.imagen_alt);
  }

  const isActive = p.activo !== false;
  const esLista = variant === 'lista';
  const esSaldo = variant === 'saldo';

  // ------------------------------------------------------------
  // Precios (nuevo modelo)
  // - p.precio_base     → precio original (ej. 100)
  // - p.precio_oferta   → precio de oferta de la línea (ej. 70, o null)
  // - p.precio          → precio final a mostrar (COALESCE oferta/base)
  // - p.precio_anterior → precio base tachado (solo si hay oferta)
  // ------------------------------------------------------------
  const precioBase   = p.precio_base   != null ? Number(p.precio_base)   : null;
  const precioOferta = p.precio_oferta != null ? Number(p.precio_oferta) : null;
  const precioFinal  = p.precio        != null ? Number(p.precio)        : null;

  // ¿Hay oferta? (oferta existe y es menor que el base)
  const hayOferta = precioOferta != null
    && precioBase != null
    && precioOferta < precioBase;

  // Porcentaje de descuento (solo si hay oferta)
  const descuentoPorcentaje = hayOferta
    ? Math.round(((precioBase - precioOferta) / precioBase) * 100)
    : 0;

  // Precio tachado: SOLO si hay oferta
  const precioTachado = hayOferta && precioBase != null ? precioBase : null;

  const priceOld = precioTachado
    ? `<span class="price-old">${GM.soles(precioTachado)}</span>`
    : '';

  // Mostrar descuento (opcional)
  const descuentoHtml = (opts.mostrarDescuento !== false && hayOferta)
    ? `<span class="price-discount">-${descuentoPorcentaje}%</span>`
    : '';

  // ------------------------------------------------------------
  // Badges
  // ------------------------------------------------------------
  let badges = '';
  if (!opts.ocultarBadgeLinea) {
    if (p.linea === 'outlet') badges += GM.badge('Outlet', 'amber') + ' ';
    if (p.linea === 'saldos') badges += GM.badge('Saldo de exportación', 'gold') + ' ';
    if (p.destacado && p.linea === 'catalogo') badges += GM.badge('Destacado', 'gold');
  }

  // Stock: solo mostrar si es un badge destacado
  // (opcional: mostrar en el card como texto)
  const stockTexto = textoStock(p.stock, p.unidad_simbolo);
  const stockBadge = p.stock === 0
    ? GM.badge('Agotado', 'red') + ' '
    : p.stock > 0 && p.stock < 10
      ? GM.badge('Últimas unidades', 'amber') + ' '
      : '';

  // Añadir stockBadge a los badges existentes
  badges += stockBadge;

  // Badge de oferta (independiente de la línea)
  if (hayOferta && opts.mostrarBadgeOferta !== false) {
    badges += GM.badge('Oferta', 'green') + ' ';
  }
  if (p.motivo) badges += GM.badge(p.motivo, 'gray') + ' ';
  if (!isActive) badges += GM.badge('No disponible', 'red');

  const categoriaSwatch = p.familia_nombre || 'Mármol';

  // ------------------------------------------------------------
  // Interacción
  // ------------------------------------------------------------
  const esFav = esFavorito(p.sku, origen);

  // ------------------------------------------------------------
  // Medidas
  // ------------------------------------------------------------
  const medidasHtml = renderMedidasProducto(p, { compacto: esLista });

  // ------------------------------------------------------------
  // Estilo de la imagen
  // ------------------------------------------------------------
  const mediaHtml = imagenPrincipal
    ? `<img src="${imagenPrincipal}" alt="${escapeAttr(p.nombre)}" loading="lazy" class="product-media-img">`
    : `<div class="product-media-swatch" style="${stoneSwatchStyle(categoriaSwatch, p.sku)}"></div>`;

  // ------------------------------------------------------------
  // URLs con SKU + ORIGEN
  // ------------------------------------------------------------
  const skuEnc = encodeURIComponent(p.sku);
  const origenEnc = encodeURIComponent(origen);
  const urlProducto = `producto.html?sku=${skuEnc}&origen=${origenEnc}`;

  // ------------------------------------------------------------
  // Botones (siempre <button>, nunca <a>)
  // ------------------------------------------------------------
  // Verificar si el producto ya está en el carrito del origen
  const enCarrito = estaEnCarrito(p.sku, origen);

  const botones = mostrarBotones ? `
    <div class="card-acciones">
      <button
        type="button"
        class="btn-icono btn-cotizar ${enCarrito ? 'btn-agregado active' : ''}"
        data-action="cotizar"
        data-sku="${escapeAttr(p.sku)}"
        data-origen="${escapeAttr(origen)}"
        data-en-carrito="${enCarrito ? 'true' : 'false'}"
        title="${enCarrito ? 'Quitar de la cotización' : 'Agregar a la cotización'}"
        aria-label="${enCarrito ? 'Quitar de la cotización' : 'Agregar a la cotización'}"
        aria-pressed="${enCarrito}">
        ${enCarrito ? `
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="label">Agregado</span>
        ` : `
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="9" cy="21" r="1" fill="currentColor"/>
            <circle cx="20" cy="21" r="1" fill="currentColor"/>
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"
                  fill="none" stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="label">Cotizar</span>
        `}
      </button>

      <button
        type="button"
        class="btn-icono btn-favorito ${esFav ? 'active' : ''}"
        data-action="favorito"
        data-sku="${escapeAttr(p.sku)}"
        data-origen="${escapeAttr(origen)}"
        title="${esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
        aria-label="${esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
        aria-pressed="${esFav}">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M12 21s-7.5-4.35-9.5-9.5C1.12 8.55 3.5 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.5 0 5.88 3.55 4.5 6.5C19.5 16.65 12 21 12 21z"
                fill="${esFav ? 'currentColor' : 'none'}"
                stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
        <span class="label">${esFav ? 'En favoritos' : 'Favorito'}</span>
      </button>
    </div>
  ` : '';

  // ------------------------------------------------------------
  // Modo LISTA (horizontal, compacto)
  // ------------------------------------------------------------
  if (esLista) {
    return `<a class="product-card product-card--lista ${!isActive ? 'is-inactive' : ''}" href="${urlProducto}">
      ${!isActive ? `<span class="product-flag">No disponible</span>` : ''}
      <div class="product-card__media">${mediaHtml}</div>
      <div class="product-card__body">
        <div class="product-card__head">
          <div class="eyebrow">${escapeHtml(p.familia_nombre || 'Piedra Natural')}${p.origen ? ` · ${escapeHtml(p.origen)}` : ''}</div>
          <h4 class="product-card__title">${escapeHtml(p.nombre)}</h4>
        </div>
        ${medidasHtml}
        <div class="product-price">
          ${priceOld}
          <span class="price">${precioFinal != null && precioFinal > 0 ? GM.soles(precioFinal) : 'Consultar precio'}</span>
          ${precioFinal != null && precioFinal > 0 ? `<span class="price-igv">incl. IGV</span>` : ''}
          ${descuentoHtml}
          <span class="unit">/ ${escapeHtml(p.unidad_simbolo || 'm²')}</span>
        </div>
        <div class="product-stock" style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
          ${stockTexto}
        </div>
        ${badges ? `<div class="product-badges">${badges}</div>` : ''}
        ${botones}
      </div>
    </a>`;
  }

  // ------------------------------------------------------------
  // Modo GRID (vertical, tradicional) — default
  // ------------------------------------------------------------
  return `<a class="product-card ${esSaldo ? 'product-card--saldo' : ''} ${!isActive ? 'is-inactive' : ''}" href="${urlProducto}">
    ${!isActive ? `<span class="product-flag">No disponible</span>` : ''}
    <div class="product-media">${mediaHtml}</div>
    <div class="product-body">
      <div class="product-head">
        <div class="eyebrow">${escapeHtml(p.familia_nombre || 'Piedra Natural')}${p.origen ? ` <span class="dot-sep">·</span> ${escapeHtml(p.origen)}` : ''}</div>
        <h4 class="product-title">${escapeHtml(p.nombre)}</h4>
      </div>
      ${medidasHtml}
      <div class="product-price">
        ${priceOld}
        <span class="price">${precioFinal != null && precioFinal > 0 ? GM.soles(precioFinal) : 'Consultar precio'}</span>
        ${precioFinal != null && precioFinal > 0 ? `<span class="price-igv">incl. IGV</span>` : ''}
        ${descuentoHtml}
        <span class="unit">/ ${escapeHtml(p.unidad_simbolo || 'm²')}</span>
      </div>
      <div class="product-stock" style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
        ${stockTexto}
      </div>
      ${badges ? `<div class="product-badges">${badges}</div>` : ''}
      ${botones}
    </div>
  </a>`;
}

export async function renderProductGrid(containerId, filtros = {}, variant = 'grid', origen = 'catalogo') {
  const el = document.getElementById(containerId);
  if (!el) return;

  const variantNormalizado = (variant === 'lista') ? 'lista' : 'grid';

  // Solo añadir clases si el contenedor NO tiene ya una clase de grid propia
  const tieneClasePropia = el.classList.contains('product-grid') ||
                           el.classList.contains('saldos-productos--grid') ||
                           el.classList.contains('saldos-productos--lista');

  try {
    const productos = await CatalogoAPI.getProductos(filtros);

    if (!productos || productos.length === 0) {
      if (!tieneClasePropia) el.classList.add('saldos-productos--grid');
      el.innerHTML = `
        <div class="saldos-empty" style="grid-column: 1 / -1;">
          <div class="saldos-empty__icon">◇</div>
          <h3 class="saldos-empty__title">Sin resultados</h3>
          <p class="saldos-empty__text">No hay productos en esta categoría.</p>
        </div>`;
      return;
    }

    // Reemplazar clase según variant
    el.classList.remove('saldos-productos--grid', 'saldos-productos--lista');
    if (variantNormalizado === 'lista') {
      el.classList.add('saldos-productos--lista');
    } else if (!el.classList.contains('product-grid')) {
      // Solo añadir la clase específica si no es un .product-grid genérico
      el.classList.add('saldos-productos--grid');
    }

    el.innerHTML = productos.map(p => productCardHtml(p, true, variantNormalizado, origen)).join('');
  } catch (error) {
    console.error('Error cargando productos:', error);
    el.innerHTML = `
      <div class="saldos-empty" style="grid-column: 1 / -1;">
        <div class="saldos-empty__icon">⚠️</div>
        <h3 class="saldos-empty__title">Error al cargar</h3>
        <p class="saldos-empty__text">${escapeHtml(error.message || 'Error desconocido')}</p>
      </div>`;
  }
}

export function renderGaleria(containerId, fotos, titulo, subtitulo = '') {
  const el = document.getElementById(containerId);
  if (!el) return;
  
  const fotosConvertidas = convertirArrayUrls(fotos);
  
  if (!fotosConvertidas || fotosConvertidas.length === 0) {
    el.innerHTML = '';
    return;
  }
  
  const totalFotos = fotosConvertidas.length;
  const mostrarVerMas = totalFotos > 2;
  const fotosMostrar = mostrarVerMas ? fotosConvertidas.slice(0, 2) : fotosConvertidas;
  
  let html = `
    <div class="galeria-container">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="font-size:20px; margin:0;">${titulo}</h3>
          ${subtitulo ? `<p style="color:var(--text-muted); font-size:13px; margin:4px 0 0;">${subtitulo}</p>` : ''}
        </div>
        ${mostrarVerMas ? `<span style="font-size:12px; color:var(--text-muted); cursor:pointer; text-decoration:underline;" onclick="window.abrirModalConTodasLasFotos(${JSON.stringify(fotosConvertidas).replace(/"/g, '&quot;')}, '${titulo}')"></span>` : ''}
      </div>
      <div class="galeria-grid">
        ${fotosMostrar.map((url, idx) => `
          <div class="galeria-item" onclick="window.abrirModalImagenDesdeGaleria('${url}', ${JSON.stringify(fotosConvertidas).replace(/"/g, '&quot;')}, ${idx})">
            <img src="${url}" alt="${titulo} - ${idx + 1}" loading="lazy">
          </div>
        `).join('')}
        ${mostrarVerMas ? `
          <div class="galeria-item ver-mas" onclick="window.abrirModalConTodasLasFotos(${JSON.stringify(fotosConvertidas).replace(/"/g, '&quot;')}, '${titulo}')" style="display:flex; align-items:center; justify-content:center; background:var(--brand-primary); color:white; font-size:18px; font-weight:bold; border-color:var(--brand-primary);">
            +${totalFotos - 3}
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  el.innerHTML = html;
}

export function renderSeccionesProducto(containerId, producto) {
  const el = document.getElementById(containerId);
  if (!el) return;
  
  let html = '';
  
  // ============================================================
  // 1. GALERÍAS (PRIMERO)
  // ============================================================
  
  // Crear contenedores para las galerías (se renderizan después)
  const galerias = [];
  
  if (producto.galeria_fotos && producto.galeria_fotos.length > 0) {
    galerias.push({ id: 'galeria-producto', fotos: producto.galeria_fotos, titulo: '📸 Fotos del producto' });
  }
  
  if (producto.galeria_ambientadas && producto.galeria_ambientadas.length > 0) {
    galerias.push({ id: 'galeria-ambientadas', fotos: producto.galeria_ambientadas, titulo: '🏠 Fotos ambientadas' });
  }
  
  if (producto.galeria_patrones && producto.galeria_patrones.length > 0) {
    galerias.push({ id: 'galeria-patrones', fotos: producto.galeria_patrones, titulo: '📐 Patrones de instalación' });
  }
  
  if (producto.es_piedra_natural && producto.galeria_rangos && producto.galeria_rangos.length > 0) {
    galerias.push({ id: 'galeria-rangos', fotos: producto.galeria_rangos, titulo: '🎨 Rangos del producto' });
  }
  
  // Agregar contenedores de galerías al HTML
  galerias.forEach(g => {
    html += `<div id="${g.id}" style="margin-top:30px;"></div>`;
  });
  
  // ============================================================
  // 2. SECCIONES ADICIONALES (DESPUÉS DE LAS GALERÍAS)
  // ============================================================
  
  // Especificaciones Técnicas
  if (producto.especificaciones_tecnicas) {
    html += `
      <div style="margin:30px 0 20px; background:white; border:1px solid var(--border-soft); border-radius:var(--radius-md); padding:20px 24px;">
        <h3 style="font-size:18px; margin:0 0 8px;">📋 Especificaciones Técnicas</h3>
        <p style="color:var(--text-muted); font-size:14px; line-height:1.7; margin:0;">${producto.especificaciones_tecnicas}</p>
      </div>
    `;
  }
  
  // Lo que debes saber antes de comprar
  html += `
    <div class="info-compra">
      <h3 style="font-size:18px; margin:0 0 4px;">🛒 Lo que debes saber antes de comprar</h3>
      <p style="color:var(--text-muted); font-size:13px; margin:0 0 12px;">Información clave para tu decisión de compra</p>
      <ul>
        <li><span class="dot">●</span> Las imágenes son REFERENCIALES, no contractuales</li>
        <li><span class="dot">●</span> La piedra natural presenta variabilidad en vetas y tonos</li>
        <li><span class="dot">●</span> No se puede seleccionar una veta o tonalidad específica</li>
        <li><span class="dot">●</span> Solicita una muestra física antes de tu pedido</li>
        <li><span class="dot">●</span> El producto final puede diferir de las muestras mostradas</li>
        <li><span class="dot">●</span> Las variaciones son características de calidad, no defectos</li>
      </ul>
    </div>
  `;
  
  // Variabilidad natural
  if (producto.mostrar_variabilidad) {
    html += `
      <div class="variabilidad-natural">
        <h4 style="font-size:16px; margin:0 0 6px;">📋 Nota sobre la variabilidad natural de la piedra</h4>
        <p>
          Debido a su naturaleza, las piedras naturales como mármoles, travertinos, granitos y otras, poseen grados de variación en tono y color, diferencias en la formación de vetas y distintos niveles de porosidad. Por este motivo, los tonos y características de las muestras exhibidas y/o entregadas, son referenciales y pueden variar.
        </p>
        <p>
          <strong>Características del material comercial:</strong> Las piezas pueden presentar esquinas postilladas, marcas del disco de corte, cangrejera superficial en la cara de la baldosa, y rango de color variado (más pronunciado entre lotes). Estas son características normales de los materiales pétreos y no constituyen defectos.
        </p>
        <p class="destacado">
          ⚠️ Las imágenes de rangos y variaciones mostradas son EJEMPLOS de la variabilidad natural que PUEDE presentar el producto. NO es posible seleccionar una veta o tonalidad específica al momento de la compra.
        </p>
        <p style="margin-top:10px;">
          Para mayor certeza, recomendamos solicitar una <strong>muestra física</strong> antes de realizar su pedido.
        </p>
      </div>
    `;
  }
  
  // Características comerciales
  if (producto.calidad_nivel === 3 || producto.mostrar_caracteristicas) {
    html += `
      <div class="caracteristicas-comerciales">
        <h4 style="font-size:16px; margin:0 0 4px;">🔧 Características del Material Comercial</h4>
        <p style="color:var(--text-muted); font-size:13px; margin:0 0 12px;">Información importante sobre las particularidades de la piedra natural</p>
        <div class="caracteristicas-comerciales-grid">
          <div class="item">
            <h6>Esquinas Postilladas</h6>
            <p>Las piezas pueden presentar esquinas postilladas o desportilladuras leves en los bordes, lo cual es normal en materiales pétreos.</p>
          </div>
          <div class="item">
            <h6>Marcas del Disco</h6>
            <p>Es posible encontrar marcas del disco de corte en la superficie durante el procesamiento del material.</p>
          </div>
          <div class="item">
            <h6>Cangrejera Superficial</h6>
            <p>La cara de las baldosas puede presentar cangrejera (pequeñas imperfecciones superficiales) características del material.</p>
          </div>
          <div class="item">
            <h6>Rango de Color Variado</h6>
            <p>El rango de color es variado y puede ser más pronunciado entre diferentes lotes de producción.</p>
          </div>
        </div>
      </div>
    `;
  }
  
  el.innerHTML = html;
  
  // ============================================================
  // 3. RENDERIZAR GALERÍAS (DESPUÉS DE INSERTAR EL HTML)
  // ============================================================
  setTimeout(() => {
    galerias.forEach(g => {
      renderGaleria(g.id, g.fotos, g.titulo);
    });
  }, 100);
}

// --- 3.10 cargarMasRelacionados (scroll infinito) ---
let relacionadosPage = 1;
let relacionadosTotal = 0;
let relacionadosCargando = false;
let relacionadosSku = '';
let relacionadosFamiliaId = '';

export async function cargarMasRelacionados(sku, familiaId) {
  if (relacionadosCargando) return;
  relacionadosCargando = true;
  
  const container = document.getElementById('relacionados');
  const loadingIndicator = document.getElementById('loading-relacionados');
  
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }
  
  try {
    const limit = 4;
    const offset = (relacionadosPage - 1) * limit;
    
    const { data, error } = await supabase
      .from('vw_productos_completo')
      .select('*')
      .eq('activo', true)
      .eq('familia_id', familiaId)
      .neq('sku', sku)
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Renderizar productos adicionales
      const html = data.map(p => productCardHtml(p)).join('');
      container.insertAdjacentHTML('beforeend', html);
      relacionadosPage++;
      relacionadosTotal += data.length;
    } else {
      // No hay más productos
      if (loadingIndicator) {
        loadingIndicator.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay más productos relacionados.</p>';
      }
      // Remover el observer
      if (window.relacionadosObserver) {
        window.relacionadosObserver.disconnect();
      }
    }
  } catch (error) {
    console.error('Error cargando más productos relacionados:', error);
  } finally {
    relacionadosCargando = false;
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

// ============================================================
// FAVORITOS (por SKU + ORIGEN)
// ============================================================

/**
 * Normaliza el array de favoritos al formato nuevo:
 * [{ sku, origen, fecha }, ...]
 */
function normalizarFavoritos(favoritos) {
  if (!Array.isArray(favoritos)) return [];
  return favoritos.map(f =>
    typeof f === 'string'
      ? { sku: f, origen: 'catalogo', fecha: new Date().toISOString() }
      : f
  ).filter(f => f && f.sku);
}

/**
 * Guarda / quita un favorito identificado por (sku + origen).
 */
export function guardarFavorito(sku, origen = 'catalogo') {
  let favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
  favoritos = normalizarFavoritos(favoritos);

  // Buscar por (sku + origen)
  const index = favoritos.findIndex(f => f.sku === sku && f.origen === origen);
  let mensaje = '';

  if (index > -1) {
    favoritos.splice(index, 1);
    mensaje = '❌ Eliminado de favoritos';
  } else {
    favoritos.push({
      sku,
      origen,
      fecha: new Date().toISOString()
    });
    mensaje = '❤️ Agregado a favoritos';
  }

  localStorage.setItem('favoritos', JSON.stringify(favoritos));

  // Actualizar botón de la página de detalle
  if (typeof actualizarBotonFavorito === 'function') {
    actualizarBotonFavorito(sku, origen);
  }
  // Actualizar botones en cards del listado
  if (typeof actualizarBotonesFavoritosEnPagina === 'function') {
    actualizarBotonesFavoritosEnPagina(sku, origen);
  }
  // Actualizar contador del header
  if (typeof actualizarContadorFavoritosHeader === 'function') {
    actualizarContadorFavoritosHeader();
  }

  if (window.GM?.toast) {
    window.GM.toast(mensaje);
  } else {
    console.log(mensaje);
  }

  return favoritos;
}

/**
 * Devuelve true si el producto (sku + origen) está en favoritos.
 * - Si se pasa origen: verifica esa combinación específica.
 * - Si NO se pasa origen: verifica cualquier origen (útil para contadores globales).
 */
export function esFavorito(sku, origen = null) {
  const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
  const normalizados = normalizarFavoritos(favoritos);

  if (origen === null) {
    return normalizados.some(f => f.sku === sku);
  }
  return normalizados.some(f => f.sku === sku && f.origen === origen);
}

// ============================================================
// CARRITO (por origen): verificar si un producto está agregado
// ============================================================
export function estaEnCarrito(sku, origen = 'catalogo') {
  try {
    const key = `gallos_cotizacion_carrito_${origen}`;
    const carrito = JSON.parse(localStorage.getItem(key) || '{"items":[]}');
    if (!Array.isArray(carrito.items)) return false;
    return carrito.items.some(item => item.producto_sku === sku);
  } catch (e) {
    return false;
  }
}

/**
 * Devuelve el array de orígenes en los que está marcado un SKU.
 */
export function getOrigenesFavorito(sku) {
  const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
  return normalizarFavoritos(favoritos)
    .filter(f => f.sku === sku)
    .map(f => f.origen);
}

// Actualizar botones en productos relacionados
export function actualizarBotonesFavoritosRelacionados(sku) {
  const esFav = esFavorito(sku);
  
  // Buscar todos los botones de favoritos en la página
  document.querySelectorAll('.btn-favorito-relacionado').forEach(btn => {
    const btnSku = btn.getAttribute('data-sku');
    if (btnSku === sku) {
      if (esFav) {
        btn.innerHTML = '♥';
        btn.classList.add('active');
        btn.title = 'Eliminar de favoritos';
      } else {
        btn.innerHTML = '♡';
        btn.classList.remove('active');
        btn.title = 'Agregar a favoritos';
      }
    }
  });
}

export function actualizarBotonFavorito(sku, origen = 'catalogo') {
  const btn = document.getElementById('btn-favorito');
  if (!btn) return;

  const esFav = esFavorito(sku, origen);

  if (esFav) {
    btn.innerHTML = '<span class="icon">♥</span> Agregado a favoritos';
    btn.classList.add('active');
  } else {
    btn.innerHTML = '<span class="icon">♡</span> Agregar a favoritos';
    btn.classList.remove('active');
  }
}

// --- 3.13 compartirWhatsApp ---
export function compartirWhatsApp(sku, nombre, origen = 'catalogo') {
  const url = `${window.location.origin}${window.location.pathname}?sku=${encodeURIComponent(sku)}&origen=${encodeURIComponent(origen)}`;
  const mensaje = encodeURIComponent(
    `*${nombre}*\n\n` +
    `SKU: ${sku}\n` +
    `Ver producto: ${url}\n\n` +
    `¡Cotiza este producto con Gallos Mármol!`
  );
  window.open(`https://wa.me/?text=${mensaje}`, '_blank');
}

// --- 3.14 ajustarContraste ---
export function ajustarContraste() {
  const body = document.body;
  const isContrast = body.classList.toggle('alto-contraste');
  localStorage.setItem('alto-contraste', isContrast);
  GM.toast(isContrast ? '🔆 Contraste alto activado' : '🔆 Contraste normal');
}

// --- 3.16 guardarEnCache ---
export function guardarEnCache(sku, data) {
  try {
    const cache = JSON.parse(localStorage.getItem('productos_cache') || '{}');
    cache[sku] = {
      data: data,
      timestamp: Date.now()
    };
    localStorage.setItem('productos_cache', JSON.stringify(cache));
  } catch (e) {
    console.warn('Error guardando en cache:', e);
  }
}

// --- 3.17 obtenerDeCache ---
export function obtenerDeCache(sku) {
  try {
    const cache = JSON.parse(localStorage.getItem('productos_cache') || '{}');
    const item = cache[sku];
    if (!item) return null;
    
    // Cache expira después de 1 hora
    const expiracion = 60 * 60 * 1000;
    if (Date.now() - item.timestamp > expiracion) {
      delete cache[sku];
      localStorage.setItem('productos_cache', JSON.stringify(cache));
      return null;
    }
    
    return item.data;
  } catch (e) {
    console.warn('Error obteniendo cache:', e);
    return null;
  }
}

// --- 3.7 rotarImagen (ya agregada) ---

// --- Funciones globales para el modal desde el HTML ---
window.abrirModalImagen = abrirModalImagen;
window.cerrarModalImagen = cerrarModalImagen;
window.navegarModal = navegarModal;
window.cambiarZoom = cambiarZoom;
window.rotarImagen = rotarImagen;

window.abrirModalImagenDesdeGaleria = function(url, todasLasFotos, index) {
  abrirModalImagen(url, todasLasFotos, index);
};

window.guardarFavorito = guardarFavorito;
window.compartirWhatsApp = compartirWhatsApp;
window.ajustarContraste = ajustarContraste;

// ============================================================
// RENDERIZADO DE FAMILIAS (para index.html)
// ============================================================
export async function renderFamilias(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  
  try {
    const familias = await CatalogoAPI.getFamilias();
    const productos = await CatalogoAPI.getProductos({ linea: 'catalogo' });
    
    el.innerHTML = familias.map(fam => {
      const count = productos.filter(p => p.familia_id === fam.id).length;
      const swatchStyle = stoneSwatchStyle(fam.nombre, fam.slug);
      
      // Generar HTML para la imagen de la familia (si existe)
      const imagenHtml = fam.imagen_url ? 
        `<img class="family-image" src="${fam.imagen_url}" alt="${fam.nombre}" loading="lazy">` : '';
      
      return `<a class="material-cell" href="catalogo.html?familia=${encodeURIComponent(fam.id)}">
        <div class="swatch" style="${swatchStyle}">
          ${imagenHtml}
        </div>
        <h4>${fam.nombre}</h4>
        <span>${count} referencia${count !== 1 ? 's' : ''} en catálogo</span>
      </a>`;
    }).join('');
  } catch (error) {
    console.error('Error cargando familias:', error);
    el.innerHTML = `<p style="color:var(--danger);">Error al cargar familias.</p>`;
  }
}

export function convertirUrlGoogleDrive(url) {
  if (!url) return null;
  
  // Si ya es una URL de lh3, devolverla tal cual
  if (url.includes('lh3.googleusercontent.com')) {
    return url;
  }
  
  // Si es una URL de Google Drive, extraer el ID
  if (url.includes('drive.google.com')) {
    // Patrones de URLs de Google Drive
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /uc\?id=([a-zA-Z0-9_-]+)/,
      /open\?id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
  }
  
  // Si no se pudo convertir, devolver la URL original
  return url;
}

export function convertirArrayUrls(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return [];
  return arr.map(url => convertirUrlGoogleDrive(url)).filter(Boolean);
}

// ============================================================
// CARGAR SELECT DE PRODUCTOS (para cotizacion.html)
// ============================================================
export async function cargarSelectProductos(selectId, skuSeleccionado = null) {
  const el = document.getElementById(selectId);
  if (!el) return;
  
  try {
    const productos = await CatalogoAPI.getProductos({ linea: 'catalogo' });
    
    el.innerHTML = productos.map(p => 
      `<option value="${p.nombre}" ${p.sku === skuSeleccionado ? 'selected' : ''}>
        ${p.nombre} (${p.sku})
      </option>`
    ).join('');
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

// ============================================================
// HELPERS DEL CARD
// ============================================================

function renderMedidasProducto(p, opts = {}) {
  const largo   = formatMedida(p.largo,   p.unidad_largo_simbolo);
  const ancho   = formatMedida(p.ancho,   p.unidad_ancho_simbolo);
  const espesor = formatMedida(p.espesor, p.unidad_espesor_simbolo);

  // Si no hay ninguna medida, no renderizar nada
  if (!largo && !ancho && !espesor) return '';

  // Modo compacto: medidas en línea (para vista lista)
  if (opts.compacto) {
    return `<ul class="product-medidas product-medidas--compacto">
      ${largo   ? `<li><span class="k">L</span><span class="v">${escapeHtml(largo)}</span></li>` : ''}
      ${ancho   ? `<li><span class="k">A</span><span class="v">${escapeHtml(ancho)}</span></li>` : ''}
      ${espesor ? `<li><span class="k">E</span><span class="v">${escapeHtml(espesor)}</span></li>` : ''}
    </ul>`;
  }

  // Modo normal: con espesor → 3 columnas; sin espesor → 2 columnas
  const conEspesor = Boolean(espesor);
  const clase = conEspesor ? 'product-medidas product-medidas--tres' : 'product-medidas';

  return `<ul class="${clase}">
    ${largo   ? `<li><span class="k">Largo</span><span class="v">${escapeHtml(largo)}</span></li>` : ''}
    ${ancho   ? `<li><span class="k">Ancho</span><span class="v">${escapeHtml(ancho)}</span></li>` : ''}
    ${espesor ? `<li><span class="k">Espesor</span><span class="v">${escapeHtml(espesor)}</span></li>` : ''}
  </ul>`;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

/**
 * Devuelve el texto a mostrar para el stock de un producto.
 * - null → "Consultar stock"
 * - 0 → "Agotado"
 * - > 0 → "N m²" (o la unidad del producto)
 */
export function textoStock(stock, unidadSimbolo = '') {
  if (stock === null || stock === undefined) {
    return 'Consultar stock';
  }
  const num = Number(stock);
  if (isNaN(num)) return 'Consultar stock';
  if (num === 0) return 'Agotado';
  const unidad = unidadSimbolo ? ` ${unidadSimbolo}` : '';
  return `${num.toLocaleString('es-PE')}${unidad}`;
}

/**
 * Escapa texto para insertar en atributos HTML.
 */
export function escapeAttr(s) {
  return escapeHtml(s).replace(/\n/g, ' ');
}

export function formatMedida(valor, unidadSimbolo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const unidad = unidadSimbolo || 'cm';
  return `${valor} ${unidad}`;
}



// ============================================================
// DELEGACIÓN DE EVENTOS PARA LOS BOTONES DEL CARD
// ============================================================
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const sku = btn.dataset.sku;
  const origen = btn.dataset.origen || 'catalogo';
  if (!sku) return;

  e.preventDefault();
  e.stopPropagation();

  if (action === 'cotizar') {
    // ✅ Delegación al handler específico de la página si existe
    if (typeof window.toggleProductoEnCarrito === 'function') {
      window.toggleProductoEnCarrito(btn, sku, origen);
      return;
    }
    // Fallback: comportamiento antiguo (navegar)
    window.location.href = `cotizacion.html?sku=${encodeURIComponent(sku)}&origen=${encodeURIComponent(origen)}`;
  } else if (action === 'favorito') {
    guardarFavorito(sku, origen);
  }
});

// ============================================================
// ACTUALIZAR ESTADO VISUAL DE LOS BOTONES EN TODA LA PÁGINA
// ============================================================

/**
 * Actualiza TODOS los botones de favorito en la página que coincidan
 * con el SKU dado, sin re-renderizar el card completo.
 */
function actualizarBotonesFavoritosEnPagina(sku, origen) {
  const esFav = esFavorito(sku, origen);

  document.querySelectorAll(`.btn-favorito[data-sku="${CSS.escape(sku)}"]`).forEach((btn) => {
    // Solo actualizar los botones que coincidan también con el origen
    if (btn.dataset.origen && btn.dataset.origen !== origen) return;

    btn.classList.toggle('active', esFav);
    btn.setAttribute('aria-pressed', esFav ? 'true' : 'false');
    btn.title = esFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
    btn.setAttribute('aria-label', esFav ? 'Quitar de favoritos' : 'Agregar a favoritos');

    const path = btn.querySelector('svg path');
    if (path) {
      path.setAttribute('fill', esFav ? 'currentColor' : 'none');
    }

    const label = btn.querySelector('.label');
    if (label) {
      label.textContent = esFav ? 'En favoritos' : 'Favorito';
    }
  });
}





