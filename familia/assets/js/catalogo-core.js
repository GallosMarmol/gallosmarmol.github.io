// ============================================================
// assets/js/catalogo-core.js
// Núcleo compartido para catálogo, outlet y saldos.
// Consume: public.js (productCardHtml, escapeHtml, escapeAttr),
//          shared.js (window.GM), supabase-client.js (CatalogoAPI, LineasConfigAPI)
// ============================================================

import {
  CatalogoAPI,
  LineasConfigAPI
} from '../../../shared/js/supabase-client.js';

import {
  productCardCotizacionHtml,
  escapeHtml,
  escapeAttr,
  convertirUrlGoogleDrive,
  COT_COPY,
  COT_ICONS
} from './public.js';

// ============================================================
// §0 — CONFIGURACIÓN GLOBAL
// ============================================================
const CFG = {
  linea: 'outlet',
  origen: 'outlet',
  porPagina: 12,
  debounceMs: 250,
  umbralChipsDimension: 20,
  storageKeys: {
    orden: 'gm.outlet.orden',
    vista: 'outlet_vista'
  },
  countdown: true,
  bloqueo: true,
  faqs: true,
  qr: true,
  carritoBanner: true,
  sugerencias: true,
  filtrosPrecio: true,
  filtrosAvanzados: true,
  heroImgSelector: '.page-hero__bg-img',
  ctaScrollSelector: '.saldos-controls',
  contadorCarritoHeader: null,

  // Etiquetas por defecto (se sobreescriben según línea y opciones)
  labels: {
    titulo: 'Outlet · Gallos Mármol',
    tituloMantenimiento: 'Mantenimiento · Gallos Mármol',
    tituloProximamente: 'Próximamente · Gallos Mármol',
    tituloFinalizado: 'Finalizado · Gallos Mármol',

    countdownLlegaEn: 'El outlet llega en',
    countdownAbreEl: 'El outlet abre oficialmente el',
    countdownDisponibleTermina: '¡Outlet disponible! Termina el',
    countdownDisponibleSinFin: '¡El outlet ya está disponible!',
    countdownFinalizoEl: 'El outlet finalizó el',

    mantenimientoTitulo: 'Estamos actualizando el outlet',
    mantenimientoTexto: 'Estamos mejorando la experiencia del outlet. Vuelve en unos minutos.',

    proximamenteKicker: 'Próximamente',
    proximamenteTitulo: 'El outlet está por llegar',
    proximamenteTexto: 'Muy pronto podrás acceder a nuestras mejores ofertas.',

    finalizadoKicker: 'Finalizado',
    finalizadoTitulo: 'Esta sección ya no está disponible',
    finalizadoTexto: 'El outlet ya finalizó.',
    finalizadoTextoSufijo: 'Mientras tanto, explora nuestro catálogo y saldos disponibles.',

    ctaCatalogo: 'Ver catálogo',
    ctaCatalogoActual: 'Ver catálogo actual',
    ctaSaldos: 'Ver saldos',
    ctaSaldosExportacion: 'Ver saldos de exportación',
    ctaOutlet: 'Ver outlet',
    ctaOutletActual: 'Ver outlet actual'
  }
};

const ORDENES_VALIDAS = ['mayor-descuento', 'menor-precio', 'mayor-precio', 'recientes', 'a-z', 'orden'];

// ============================================================
// §0b — PRESETS DE LABELS POR LÍNEA
// ============================================================
const LABELS_POR_LINEA = {
  outlet: {
    titulo: 'Outlet · Gallos Mármol',
    tituloMantenimiento: 'Mantenimiento · Gallos Mármol',
    tituloProximamente: 'Próximamente · Gallos Mármol',
    tituloFinalizado: 'Finalizado · Gallos Mármol',

    countdownLlegaEn: 'El outlet llega en',
    countdownAbreEl: 'El outlet abre oficialmente el',
    countdownDisponibleTermina: '¡Outlet disponible! Termina el',
    countdownDisponibleSinFin: '¡El outlet ya está disponible!',
    countdownFinalizoEl: 'El outlet finalizó el',

    mantenimientoTitulo: 'Estamos actualizando el outlet',
    mantenimientoTexto: 'Estamos mejorando la experiencia del outlet. Vuelve en unos minutos.',

    proximamenteKicker: 'Próximamente',
    proximamenteTitulo: 'El outlet está por llegar',
    proximamenteTexto: 'Muy pronto podrás acceder a nuestras mejores ofertas.',

    finalizadoKicker: 'Finalizado',
    finalizadoTitulo: 'Esta sección ya no está disponible',
    finalizadoTexto: 'El outlet ya finalizó.',
    finalizadoTextoSufijo: 'Mientras tanto, explora nuestro catálogo y saldos disponibles.',

    ctaCatalogo: 'Ver catálogo',
    ctaCatalogoActual: 'Ver catálogo actual',
    ctaSaldos: 'Ver saldos',
    ctaSaldosExportacion: 'Ver saldos de exportación'
  },
  catalogo: {
    titulo: 'Catálogo · Gallos Mármol',
    tituloMantenimiento: 'Mantenimiento · Gallos Mármol',
    tituloProximamente: 'Próximamente · Gallos Mármol',
    tituloFinalizado: 'Finalizado · Gallos Mármol',

    countdownLlegaEn: 'El catálogo llega en',
    countdownAbreEl: 'El catálogo abre oficialmente el',
    countdownDisponibleTermina: '¡Catálogo disponible! Termina el',
    countdownDisponibleSinFin: '¡El catálogo ya está disponible!',
    countdownFinalizoEl: 'El catálogo finalizó el',

    mantenimientoTitulo: 'Estamos actualizando el catálogo',
    mantenimientoTexto: 'Estamos mejorando la experiencia del catálogo. Vuelve en unos minutos.',

    proximamenteKicker: 'Próximamente',
    proximamenteTitulo: 'El catálogo está por llegar',
    proximamenteTexto: 'Muy pronto podrás acceder a nuestro catálogo completo.',

    finalizadoKicker: 'Finalizado',
    finalizadoTitulo: 'Esta sección ya no está disponible',
    finalizadoTexto: 'El catálogo ya finalizó.',
    finalizadoTextoSufijo: 'Mientras tanto, explora nuestro outlet y saldos disponibles.',

    ctaCatalogo: 'Ver catálogo',
    ctaCatalogoActual: 'Ver catálogo actual',
    ctaOutlet: 'Ver outlet',
    ctaOutletActual: 'Ver outlet actual',
    ctaSaldos: 'Ver saldos',
    ctaSaldosExportacion: 'Ver saldos de exportación'
  },
  saldos: {
    titulo: 'Saldos de exportación · Gallos Mármol',
    tituloMantenimiento: 'Mantenimiento · Gallos Mármol',
    tituloProximamente: 'Próximamente · Gallos Mármol',
    tituloFinalizado: 'Finalizado · Gallos Mármol',

    countdownLlegaEn: 'Los saldos de exportación llegan en',
    countdownAbreEl: 'Los saldos de exportación abren oficialmente el',
    countdownDisponibleTermina: '¡Disponibles! Terminan el',
    countdownDisponibleSinFin: '¡Los saldos de exportación ya están disponibles!',
    countdownFinalizoEl: 'Los saldos de exportación finalizaron el',

    mantenimientoTitulo: 'Estamos actualizando los saldos de exportación',
    mantenimientoTexto: 'Estamos mejorando la experiencia de saldos de exportación. Vuelve en unos minutos.',

    proximamenteKicker: 'Próximamente',
    proximamenteTitulo: 'Los saldos de exportación están por llegar',
    proximamenteTexto: 'Muy pronto podrás acceder a nuestros saldos de exportación.',

    finalizadoKicker: 'Finalizado',
    finalizadoTitulo: 'Esta sección ya no está disponible',
    finalizadoTexto: 'Los saldos de exportación ya finalizaron.',
    finalizadoTextoSufijo: 'Mientras tanto, explora nuestro catálogo y outlet.',

    ctaCatalogo: 'Ver catálogo',
    ctaCatalogoActual: 'Ver catálogo actual',
    ctaOutlet: 'Ver outlet',
    ctaOutletActual: 'Ver outlet actual',
    ctaSaldos: 'Ver saldos',
    ctaSaldosExportacion: 'Ver saldos de exportación'
  }
};

// ============================================================
// §1 — UTILIDADES
// ============================================================
function debounce(fn, ms = CFG.debounceMs) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function normalizarTexto(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pareceSKU(termino) {
  if (!termino) return false;
  return /^[A-Z0-9]{6,}$/i.test(String(termino).trim());
}

function reducirPalabra(palabra) {
  if (!palabra || palabra.length <= 4) return palabra;
  // Plural en "es": solo si la raíz conserva >= 4 letras y termina en vocal
  if (palabra.endsWith('es') && palabra.length > 5) {
    const sinEs = palabra.slice(0, -2);
    if (sinEs.length >= 4 && /[aeiou]$/.test(sinEs)) return sinEs;
  }
  // Plural en "s": solo si la raíz conserva >= 4 letras
  if (palabra.endsWith('s') && !palabra.endsWith('ss') && palabra.length > 4) {
    return palabra.slice(0, -1);
  }
  return palabra;
}

function tokensDe(str) {
  const norm = normalizarTexto(str);
  if (!norm) return [];
  return norm.split(' ').map(reducirPalabra).filter(Boolean);
}

function distanciaLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? m[i - 1][j - 1]
        : 1 + Math.min(m[i - 1][j - 1], m[i][j - 1], m[i - 1][j]);
    }
  }
  return m[b.length][a.length];
}

const SINONIMOS = {
  'marmol': ['marmol', 'marble'],
  'granito': ['granito', 'granite'],
  'cuarzo': ['cuarzo', 'quartz'],
  'travertino': ['travertino', 'travertine'],
  'porcelanato': ['porcelanato', 'porcelain', 'porcelanico'],
  'revestimiento': ['revestimiento', 'recubrimiento', 'revestir'],
  'moldura': ['moldura', 'molde', 'cornisa'],
  'baldosa': ['baldosa', 'baldosin', 'baldoson', 'tile', 'losa'],
  'losa': ['losa', 'slab', 'plancha'],
  'plancha': ['plancha', 'slab', 'losa'],
  'pulido': ['pulido', 'polished', 'brillante'],
  'mate': ['mate', 'matte', 'opaco'],
  'honed': ['honed', 'mate', 'apomazado'],
  'abujardado': ['abujardado', 'bushhammered'],
  'cepillado': ['cepillado', 'brushed'],
  'apomazado': ['apomazado', 'honed'],
  'blanco': ['blanco', 'white', 'bianco'],
  'negro': ['negro', 'black', 'nero'],
  'gris': ['gris', 'gray', 'grey', 'grigio'],
  'beige': ['beige', 'beis', 'crema'],
  'crema': ['crema', 'cream', 'beige'],
  'marron': ['marron', 'brown', 'cafe'],
  'piedra': ['piedra', 'stone', 'marmol', 'granito', 'cuarzo', 'travertino'],
  'natural': ['natural', 'stone', 'piedra'],
  'comercial': ['comercial', 'commercial', 'standard']
};

// ============================================================
// §0c — SINÓNIMOS AMPLIADOS (se fusionan con SINONIMOS)
// ============================================================
const SINONIMOS_AMPLIADOS = {
  // --- Materiales (ampliación) ---
  'marmol':     ['marmol', 'marble', 'calcita', 'caliza', 'carrara', 'travertino'],
  'travertino': ['travertino', 'travertine', 'toba', 'tufo', 'romano', 'clasico'],
  'granito':    ['granito', 'granite', 'gneis', 'negra absoluto', 'absoluto'],
  'cuarzo':     ['cuarzo', 'quartz', 'cuarcita', 'silestone', 'compac'],
  'porcelanato':['porcelanato', 'porcelain', 'porcelanico', 'gres', 'gres porcelanico'],
  'gres':       ['gres', 'gres porcelanico', 'porcelanato', 'ceramica'],
  'ceramica':   ['ceramica', 'ceramic', 'gres', 'azulejo'],

  // --- Acabados (ampliación) ---
  'pulido':     ['pulido', 'polished', 'brillante', 'espejo', 'lucido'],
  'mate':       ['mate', 'matte', 'opaco', 'satinado', 'honed'],
  'abujardado': ['abujardado', 'bushhammered', 'martelinado', 'picado'],
  'apomazado':  ['apomazado', 'honed', 'mate', 'satinado'],
  'flameado':   ['flameado', 'flamed', 'flame'],
  'cepillado':  ['cepillado', 'brushed', 'cepillado'],
  'envejecido': ['envejecido', 'antique', 'antiguo', 'rustico'],

  // --- Usos / aplicaciones (nuevo) ---
  'cocina':     ['cocina', 'kitchen', 'mesada', 'encimera', 'tablero', 'countertop'],
  'bano':       ['bano', 'bath', 'ducha', 'lavabo', 'vanity'],
  'fachada':    ['fachada', 'facade', 'exterior', 'revestimiento exterior'],
  'piso':       ['piso', 'floor', 'suelo', 'baldosa', 'loseta'],
  'pared':      ['pared', 'wall', 'revestimiento', 'muro'],
  'escalera':   ['escalera', 'stairs', 'peldaño', 'grada'],
  'mesa':       ['mesa', 'table', 'tablero', 'top'],

  // --- Colores (ampliación, para búsqueda, no para filtro) ---
  'blanco':     ['blanco', 'white', 'bianco', 'marfil', 'crema', 'hueso'],
  'negro':      ['negro', 'black', 'nero', 'azabache', 'carbon'],
  'gris':       ['gris', 'gray', 'grey', 'grigio', 'plomo', 'grafito'],
  'beige':      ['beige', 'beis', 'crema', 'arena', 'marfil'],
  'marron':     ['marron', 'brown', 'cafe', 'tierra', 'chocolate'],
  'rojo':       ['rojo', 'red', 'rosso', 'vino', 'burdeos'],
  'verde':      ['verde', 'green', 'verde', 'jade', 'esmeralda'],
  'azul':       ['azul', 'blue', 'azzurro', 'marino'],
  'dorado':     ['dorado', 'gold', 'oro', 'ambar'],
  'rosa':       ['rosa', 'pink', 'rosado', 'salmon'],

  // --- Dimensiones comunes ---
  'grande':     ['grande', 'large', 'xl', 'gran formato', 'slab'],
  'pequeno':    ['pequeno', 'small', 'mini', 'chico'],
  'grueso':     ['grueso', 'thick', 'espeso'],
  'fino':       ['fino', 'thin', 'delgado'],
  'cuadrado':   ['cuadrado', 'square', 'cuadrada'],
  'rectangular':['rectangular', 'rectangulo', 'rect']
};

// Fusionar con el diccionario original (sin sobreescribir claves existentes)
Object.keys(SINONIMOS_AMPLIADOS).forEach(key => {
  const actual = SINONIMOS[key] || [];
  const nuevos = SINONIMOS_AMPLIADOS[key] || [];
  SINONIMOS[key] = Array.from(new Set([...actual, ...nuevos]));
});

const _cacheTokens = new Map();

// ============================================================
// §0d — FUZZY MEJORADO (#10)
// ============================================================

/**
 * Devuelve el umbral de tolerancia a typos según la longitud del token.
 * - ≤4 letras: 0 (exacto)
 * - ≤7 letras: 1 (1 typo)
 * - >7 letras: 2 (2 typos)
 */
function umbralFuzzy(len) {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  return 2;
}

/**
 * Normalización fonética para español.
 * - z → s  (travez → traves)
 * - v → b  (travertino → trabertino)
 * - ll → y  (llano → yano)
 * - c+e/i → s  (cemento → semento)
 * - qu → k  (quartz → kartz)
 *
 * NO modifica la longitud de la palabra (importante para Levenshtein).
 */
function normalizarFonetico(s) {
  return String(s || '')
    .replace(/ll/g, 'y')
    .replace(/qu/g, 'k')
    .replace(/c([ei])/g, 's$1')
    .replace(/z/g, 's')
    .replace(/v/g, 'b');
}

function expandirTokens(tokens) {
  const out = new Set(tokens);
  tokens.forEach(t => {
    if (_cacheTokens.has(t)) {
      _cacheTokens.get(t).forEach(x => out.add(x));
      return;
    }
    const base = new Set([t]);
    const sinonimos = SINONIMOS[t];
    if (sinonimos) {
      sinonimos.forEach(s => base.add(reducirPalabra(normalizarTexto(s))));
    }
    _cacheTokens.set(t, base);
    base.forEach(x => out.add(x));
  });
  return Array.from(out);
}

function tokensMatchean(tokensBuscados, textoObjetivo) {
  if (!textoObjetivo) return false;
  const tokensObjetivo = tokensDe(textoObjetivo);
  if (tokensObjetivo.length === 0) return false;

  // Precalcular versión fonética de los tokens objetivo
  const tokensObjetivoFon = tokensObjetivo.map(t => normalizarFonetico(t));

  return tokensBuscados.every(tokenBuscado => {
    const variantes = expandirTokens([tokenBuscado]);
    return variantes.some(variante => {
      // 1. Match exacto / substring (comportamiento actual)
      if (tokensObjetivo.some(t => t.includes(variante) || variante.includes(t))) {
        return true;
      }

      // 2. Match fonético (s→z, b→v, y→ll)
      const varianteFon = normalizarFonetico(variante);
      if (tokensObjetivoFon.some(t => t === varianteFon)) {
        return true;
      }

      // 3. Levenshtein con umbral adaptativo
      const umbral = umbralFuzzy(variante.length);
      if (umbral === 0) return false; // palabras cortas: sin tolerancia

      return tokensObjetivo.some(t => {
        if (Math.abs(t.length - variante.length) > umbral) return false;
        return distanciaLevenshtein(t, variante) <= umbral;
      });
    });
  });
}

// ============================================================
// §0f — RESALTADO DE COINCIDENCIAS (#7)
// ============================================================

function resaltarCoincidencias(textoYaEscapado, query) {
  if (!query || query.length < 2) return textoYaEscapado;
  if (!textoYaEscapado) return textoYaEscapado;

  // Tokens de la query (>= 2 chars para evitar ruido)
  const tokens = tokensDe(query).filter(t => t.length >= 2);
  if (tokens.length === 0) return textoYaEscapado;

  // Construir un único regex con todos los tokens (escapados)
  const pattern = tokens
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length) // más largos primero
    .join('|');

  // Case-insensitive, global
  const re = new RegExp(`(${pattern})`, 'gi');

  // Reemplazar sobre el texto ya escapado.
  // Los tokens NO contienen < > &, así que no rompen entidades HTML.
  return textoYaEscapado.replace(re, '<mark class="srch-hl">$1</mark>');
}

// ============================================================
// §0g — HISTORIAL DE BÚSQUEDAS RECIENTES (#3)
// ============================================================
const KEY_BUSQUEDAS_RECIENTES = () => `gm.${CFG.linea}.busquedas-recientes`;
const MAX_RECIENTES = 5;

// ============================================================
// §0j — FORMATEO DE MEDIDAS PARA SUGERENCIAS
// ============================================================

/**
 * Devuelve un string "L × A × E" con unidades, o null si no hay medidas.
 * Usa los valores originales y símbolos de unidad del producto.
 */
function formatearMedidasProducto(p) {
  const f = (v, u) => {
    if (v == null || v === '') return null;
    const unidad = u || 'cm';
    const esPulgada = unidad === '"' || unidad === 'in' || unidad === 'pulg';
    return esPulgada ? `${v} pulg` : `${v} ${unidad}`;
  };

  const l = f(p._largo_original ?? p.largo, p._unidad_largo ?? p.unidad_largo_simbolo);
  const a = f(p._ancho_original ?? p.ancho, p._unidad_ancho ?? p.unidad_ancho_simbolo);
  const e = f(p._espesor_original ?? p.espesor, p._unidad_espesor ?? p.unidad_espesor_simbolo);

  const partes = [];
  if (l) partes.push(l);
  if (a) partes.push(a);
  if (e) partes.push(e);

  return partes.length > 0 ? partes.join(' × ') : null;
}

/**
 * Guarda una búsqueda en localStorage (deduplicada, más reciente primero).
 * Solo guarda queries >= 2 caracteres.
 */
function guardarBusqueda(q) {
  const limpio = String(q || '').trim();
  if (limpio.length < 2) return;

  try {
    let arr = JSON.parse(localStorage.getItem(KEY_BUSQUEDAS_RECIENTES()) || '[]');
    if (!Array.isArray(arr)) arr = [];
    // Deduplicar (case-insensitive)
    arr = arr.filter(x => normalizarTexto(x) !== normalizarTexto(limpio));
    arr.unshift(limpio);
    arr = arr.slice(0, MAX_RECIENTES);
    localStorage.setItem(KEY_BUSQUEDAS_RECIENTES(), JSON.stringify(arr));
  } catch (e) {
    // localStorage lleno o bloqueado: fallar silenciosamente
  }
}

/**
 * Devuelve el array de búsquedas recientes (más reciente primero).
 */
function obtenerBusquedasRecientes() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY_BUSQUEDAS_RECIENTES()) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

/**
 * Elimina una búsqueda del historial.
 */
function eliminarBusqueda(q) {
  try {
    let arr = JSON.parse(localStorage.getItem(KEY_BUSQUEDAS_RECIENTES()) || '[]');
    if (!Array.isArray(arr)) return;
    arr = arr.filter(x => normalizarTexto(x) !== normalizarTexto(q));
    localStorage.setItem(KEY_BUSQUEDAS_RECIENTES(), JSON.stringify(arr));
  } catch (e) {}
}

// ============================================================
// §0i — ICONOS SVG PARA SUGERENCIAS AGRUPADAS (#9)
// ============================================================
const SRCH_ICONS = {
  producto: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>`,
  sku:      `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>`,
  familia:  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  material: `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>`,
  acabado:  `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18"/></svg>`,
  medida:   `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><line x1="7" y1="9" x2="7" y2="15"/><line x1="11" y1="9" x2="11" y2="13"/><line x1="15" y1="9" x2="15" y2="15"/></svg>`,
  reciente: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
};

function fechaLocalPE(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

  const s = String(d).trim();

  // "YYYY-MM-DD" sin hora → medianoche en Perú (UTC-5)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 5, 0, 0));
  }

  const f = new Date(s);
  return isNaN(f.getTime()) ? null : f;
}

function formatearFecha(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ============================================================
// §2 — FILTROS CENTRALIZADOS
// ============================================================
function stockDeProducto(p) {
  if (p.stock !== undefined && p.stock !== null) return Number(p.stock) || 0;
  if (Array.isArray(p.lineas)) {
    const l = p.lineas.find(x => x.linea === CFG.linea && x.activo !== false);
    if (l) return l.stock == null ? null : Number(l.stock);
  }
  return null;
}

function calcularDescuento(p) {
  const base = Number(p.precio_base ?? p.precio);
  const oferta = Number(p.precio_oferta);
  if (!base || !oferta || oferta >= base) return null;
  return Math.floor(((base - oferta) / base) * 100);
}

function precioFinal(p) {
  const oferta = Number(p.precio_oferta);
  if (oferta > 0) return oferta;
  const base = Number(p.precio_base ?? p.precio);
  if (base > 0) return base;
  return null;
}

function extraerMedidasDeQuery(q) {
  const norm = normalizarTexto(q);
  const patronPulgada = /(\d+(?:\.\d+)?)\s*(?:pulg|pulgada|pulgadas|in)\b/gi;
  const patronCm = /(\d+(?:\.\d+)?)\s*(?:cm|centimetro|centimetros)/gi;
  const patronMm = /(\d+(?:\.\d+)?)\s*(?:mm|milimetro|milimetros)/gi;
  const matchPulgada = [...norm.matchAll(patronPulgada)];
  const matchCm = [...norm.matchAll(patronCm)];
  const matchMm = [...norm.matchAll(patronMm)];
  if (matchPulgada.length === 0 && matchCm.length === 0 && matchMm.length === 0) return null;
  const valoresCm = [];
  matchPulgada.forEach(m => valoresCm.push(parseFloat(m[1]) * 2.54));
  matchCm.forEach(m => valoresCm.push(parseFloat(m[1])));
  matchMm.forEach(m => valoresCm.push(parseFloat(m[1]) * 0.1));
  return { valoresCm };
}

function matchMedidas(p, query) {
  const mq = extraerMedidasDeQuery(query);
  if (!mq) return null;
  const coincide = (valorCm) => {
    if (valorCm == null) return false;
    return mq.valoresCm.some(v => {
      // Para valores pequeños (<10 cm) sé más estricto
      const tol = v < 10 ? 0.15 : Math.max(v * 0.02, 0.5);
      return Math.abs(valorCm - v) <= tol;
    });
  };
  return coincide(p._largo_cm) || coincide(p._ancho_cm) || coincide(p._espesor_cm);
}

function matchBusqueda(p, q) {
  const norm = normalizarTexto(q);
  if (!norm) return true;
  if (pareceSKU(q)) {
    return String(p.sku || '').toUpperCase() === String(q).trim().toUpperCase();
  }
  const mm = matchMedidas(p, q);
  if (mm === true) return true;
  if (p._searchBlob && p._searchBlob.includes(norm)) return true;
  const campos = [
    p.nombre, p.sku, p.familia_nombre, p.material_nombre,
    p.acabado_nombre, p.calidad_nombre, p.borde_nombre,
    p.descripcion, p.modelo
  ];
  for (const c of campos) {
    if (c && normalizarTexto(c).includes(norm)) return true;
  }
  const tokensBuscados = tokensDe(q);
  if (tokensBuscados.length === 0) return true;
  for (const c of campos) {
    if (c && tokensMatchean(tokensBuscados, c)) return true;
  }
  return false;
}

function matchMulti(valor, lista) {
  return lista.length === 0 || lista.includes(valor);
}

function pasaFiltros(p, f) {
  if (!matchBusqueda(p, f.q)) return false;
  if (f.familia_id && p.familia_id !== f.familia_id) return false;
  if (!matchMulti(p.material_id, f.materiales)) return false;
  if (!matchMulti(p.acabado_id, f.acabados)) return false;
  if (f.largo.length && !f.largo.includes(p._largo_cm)) return false;
  if (f.ancho.length && !f.ancho.includes(p._ancho_cm)) return false;
  if (f.espesor.length && !f.espesor.includes(p._espesor_cm)) return false;
  if (f.soloDestacados && p.destacado !== true) return false;
  if (f.descuento != null) {
    const d = calcularDescuento(p);
    if (d == null || d < f.descuento) return false;
  }
  if (f.precioMin != null || f.precioMax != null) {
    const pr = precioFinal(p);
    if (pr == null) return false;
    if (f.precioMin != null && pr < f.precioMin) return false;
    if (f.precioMax != null && pr > f.precioMax) return false;
  }
  if (f.soloConStock) {
    const s = stockDeProducto(p);
    if (s === null || s <= 0) return false;
  }
  if (f.calidades.length && !f.calidades.includes(p.calidad_id)) return false;
  if (f.bordes.length && !f.bordes.includes(p.borde_id)) return false;
  if (f.modelo) {
    const q = normalizarTexto(f.modelo);
    if (!normalizarTexto(p.modelo || '').includes(q)) return false;
  }
  return true;
}

function fechaProducto(p) {
  const f = p.actualizado_en || p.creado_en;
  return f ? new Date(f).getTime() : 0;
}

// ============================================================
// §2b — HELPERS DE ORDENAMIENTO
// ============================================================

/**
 * Verdadero si el producto está marcado como destacado,
 * aceptando booleanos, números y strings.
 */
function esDestacado(p) {
  if (!p) return false;
  const v = p.destacado;
  return v === true || v === 1 || v === '1' || v === 'true';
}

/**
 * Valor numérico del campo `orden` (menor = más prioritario).
 * Si no es un número finito, devuelve 999999.
 * Corrige el bug de `Number(0) || 999999` que convertía 0 en 999999.
 */
function valorOrden(p) {
  if (!p) return 999999;
  const n = Number(p.orden);
  return Number.isFinite(n) ? n : 999999;
}

/**
 * Agrupa un producto según su relación con el precio/descuento.
 * - Grupo 1: tiene descuento (oferta < base) → va primero en mayor-descuento
 * - Grupo 2: tiene precio pero sin descuento
 * - Grupo 3: sin precio / sin datos
 */
function grupoPrecio(p) {
  const desc = calcularDescuento(p);
  if (desc != null && desc > 0) return 1;
  const pr = precioFinal(p);
  if (pr != null && pr > 0) return 2;
  return 3;
}

/**
 * Compara dos productos por criterios de desempate comunes:
 * 1. Más reciente primero (fechaProducto desc)
 * 2. Alfabético por nombre (locale es, sensitivity base)
 * 3. Destacado primero
 */
function desempateComun(a, b) {
  const fa = fechaProducto(a);
  const fb = fechaProducto(b);
  if (fa !== fb) return fb - fa;

  const cmp = String(a.nombre || '').localeCompare(
    String(b.nombre || ''),
    'es',
    { sensitivity: 'base' }
  );
  if (cmp !== 0) return cmp;

  const da = esDestacado(a) ? 1 : 0;
  const db = esDestacado(b) ? 1 : 0;
  return db - da;
}

// ============================================================
// §2c — ORDENAMIENTO PRINCIPAL
// ============================================================
function ordenarProductos(lista, orden) {
  const copia = [...lista];

  // ------------------------------------------------------------
  // 1) MAYOR DESCUENTO
  //    Grupo 1 (con descuento) → Grupo 2 (con precio sin desc) → Grupo 3 (sin precio)
  //    Dentro del grupo 1: mayor % de descuento primero.
  //    Desempate común: recientes → a-z → destacado.
  // ------------------------------------------------------------
  if (orden === 'mayor-descuento') {
    copia.sort((a, b) => {
      // 1. Grupo
      const ga = grupoPrecio(a);
      const gb = grupoPrecio(b);
      if (ga !== gb) return ga - gb;

      // 2. Solo en grupo 1: mayor % de descuento primero
      if (ga === 1) {
        const da = calcularDescuento(a) ?? 0;
        const db = calcularDescuento(b) ?? 0;
        if (da !== db) return db - da;
      }

      // 3. Desempate común
      return desempateComun(a, b);
    });
    return copia;
  }

  // ------------------------------------------------------------
  // 2) MENOR PRECIO
  //    Con precio primero (ascendente) → sin precio al final.
  //    Desempate entre "sin precio": recientes → a-z.
  // ------------------------------------------------------------
  if (orden === 'menor-precio') {
    copia.sort((a, b) => {
      const pa = precioFinal(a);
      const pb = precioFinal(b);
      const tieneA = pa != null && pa > 0;
      const tieneB = pb != null && pb > 0;

      // Con precio primero
      if (tieneA !== tieneB) return tieneA ? -1 : 1;

      // Ambos con precio: ascendente
      if (tieneA && tieneB && pa !== pb) return pa - pb;

      // Desempate común (sin destacado)
      const fa = fechaProducto(a);
      const fb = fechaProducto(b);
      if (fa !== fb) return fb - fa;

      return String(a.nombre || '').localeCompare(
        String(b.nombre || ''),
        'es',
        { sensitivity: 'base' }
      );
    });
    return copia;
  }

  // ------------------------------------------------------------
  // 3) MAYOR PRECIO
  //    Con precio primero (descendente) → sin precio al final.
  // ------------------------------------------------------------
  if (orden === 'mayor-precio') {
    copia.sort((a, b) => {
      const pa = precioFinal(a);
      const pb = precioFinal(b);
      const tieneA = pa != null && pa > 0;
      const tieneB = pb != null && pb > 0;

      if (tieneA !== tieneB) return tieneA ? -1 : 1;

      if (tieneA && tieneB && pa !== pb) return pb - pa;

      const fa = fechaProducto(a);
      const fb = fechaProducto(b);
      if (fa !== fb) return fb - fa;

      return String(a.nombre || '').localeCompare(
        String(b.nombre || ''),
        'es',
        { sensitivity: 'base' }
      );
    });
    return copia;
  }

  // ------------------------------------------------------------
  // 4) RECIENTES
  //    Más nuevo primero. Desempate alfabético.
  // ------------------------------------------------------------
  if (orden === 'recientes') {
    copia.sort((a, b) => {
      const fa = fechaProducto(a);
      const fb = fechaProducto(b);
      if (fa !== fb) return fb - fa;
      return String(a.nombre || '').localeCompare(
        String(b.nombre || ''),
        'es',
        { sensitivity: 'base' }
      );
    });
    return copia;
  }

  // ------------------------------------------------------------
  // 5) A-Z
  //    Alfabético ascendente (locale es, sensitivity base).
  // ------------------------------------------------------------
  if (orden === 'a-z') {
    copia.sort((a, b) =>
      String(a.nombre || '').localeCompare(
        String(b.nombre || ''),
        'es',
        { sensitivity: 'base' }
      )
    );
    return copia;
  }

  // ------------------------------------------------------------
  // 6) ORDEN / RECOMENDADOS / FALLBACK
  //    Único criterio que prioriza destacados.
  //    Orden: destacado → campo orden → alfabético.
  // ------------------------------------------------------------
  if (orden === 'orden' || !orden) {
    copia.sort((a, b) => {
      const da = esDestacado(a) ? 1 : 0;
      const db = esDestacado(b) ? 1 : 0;
      if (da !== db) return db - da;

      const oa = valorOrden(a);
      const ob = valorOrden(b);
      if (oa !== ob) return oa - ob;

      return String(a.nombre || '').localeCompare(
        String(b.nombre || ''),
        'es',
        { sensitivity: 'base' }
      );
    });
    return copia;
  }

  // ------------------------------------------------------------
  // 7) CRITERIO DESCONOCIDO
  // ------------------------------------------------------------
  if (orden) {
    console.warn(`[ordenarProductos] Criterio desconocido: "${orden}". Devolviendo sin ordenar.`);
  }
  return copia;
}

// ============================================================
// §3 — ESTADO
// ============================================================
let todosLosProductos = [];
let filtros = null;
let vista = 'grid';
let pagina = 1;
let resultadosFiltrados = [];
let countdownInterval = null;
let qrScanner = null;
let sugerenciaActiva = -1;
let precioSliderInstance = null;
let precioRangoGlobal = { min: 0, max: 0 };
let bannerTimeout = null;
let ultimoEstadoBloqueo = null;
let focusReturn = null;
let _memoFacetas = null;

function crearFiltrosIniciales() {
  let orden = 'mayor-descuento';
  try {
    const saved = localStorage.getItem(CFG.storageKeys.orden);
    if (ORDENES_VALIDAS.includes(saved)) orden = saved;
  } catch (e) {}
  return {
    q: '',
    familia_id: null,
    materiales: [],
    acabados: [],
    largo: [],
    ancho: [],
    espesor: [],
    soloDestacados: false,
    descuento: null,
    precioMin: null,
    precioMax: null,
    soloConStock: false,
    calidades: [],
    bordes: [],
    modelo: '',
    orden
  };
}

function resetFiltros() {
  filtros = crearFiltrosIniciales();
  filtros.orden = 'mayor-descuento';
  if ($search) $search.value = '';
  if ($soloDest) $soloDest.checked = false;
  if ($toggleStock) $toggleStock.checked = false;
  if ($toggleDestacados) $toggleDestacados.checked = false;
  if ($modeloSearch) $modeloSearch.value = '';
  if ($ordenSelect) $ordenSelect.value = 'mayor-descuento';
  try { localStorage.setItem(CFG.storageKeys.orden, 'mayor-descuento'); } catch (e) {}
  resetearSliderPrecio();
  aplicarFiltros();
}

// ============================================================
// §4 — REFERENCIAS DOM (todas arriba)
// ============================================================
let $search, $sugerencias, $btnFiltros, $vistaGrid, $vistaLista, $soloDest,
  $count, $familias, $activos, $grid, $cargarMas, $btnCargarMas, $sheet,
  $sheetBackdrop, $sheetClose, $btnLimpiar, $btnAplicar, $btnTop, $contenido,
  $bloqueado, $precioSlider, $precioMinValor, $precioMaxValor, $precioReset,
  $toggleStock, $toggleDestacados, $modeloSearch, $ordenSelect, $qrModal, $qrStatus;

function cachearDom() {
  const $ = (id) => document.getElementById(`${CFG.linea}-${id}`);
  $search        = $('search');
  $sugerencias   = $('sugerencias');
  $btnFiltros    = $('btn-filtros');
  $vistaGrid     = $('vista-grid');
  $vistaLista    = $('vista-lista');
  $soloDest      = $('solo-destacados');
  $count         = $('count');
  $familias      = $('familias');
  $activos       = $('activos');
  $grid          = $('grid');
  $cargarMas     = $('cargar-mas');
  $btnCargarMas  = $('btn-cargar-mas');
  $sheet         = $('sheet');
  $sheetBackdrop = $('sheet-backdrop');
  $sheetClose    = $('sheet-close');
  $btnLimpiar    = $('btn-limpiar');
  $btnAplicar    = $('btn-aplicar');
  $contenido     = $('contenido');
  $bloqueado     = $('bloqueado');
  $precioSlider  = $('precio-slider');
  $precioMinValor= $('precio-min-valor');
  $precioMaxValor= $('precio-max-valor');
  $precioReset   = $('precio-reset');
  $toggleStock   = $('toggle-stock');
  $toggleDestacados = $('toggle-destacados');
  $modeloSearch  = $('modelo-search');
  $ordenSelect   = $('orden');

  // Elementos globales (no dependen de línea)
  $btnTop   = document.getElementById('btn-top');
  $qrModal  = document.getElementById('qr-modal');
  $qrStatus = document.getElementById('qr-status');

  // Check dev: avisa de IDs faltantes
  const requeridos = [
    'search','grid','count','familias','sheet','sheet-backdrop',
    'sheet-close','btn-filtros','btn-aplicar','btn-limpiar',
    'contenido','bloqueado'
  ];
  const faltantes = requeridos.filter(id => !$(id));
  if (faltantes.length) {
    console.warn(`[catalogo-core:${CFG.linea}] Faltan IDs en el DOM:`, faltantes);
  }
}

// ============================================================
// §5 — RENDER
// ============================================================
function renderProductos() {
  if (!$grid) return;
  const totalMostrar = pagina * CFG.porPagina;
  const visibles = resultadosFiltrados.slice(0, totalMostrar);
  $grid.classList.toggle('saldos-productos--grid', vista === 'grid');
  $grid.classList.toggle('saldos-productos--lista', vista === 'lista');

  // -------------------- EMPTY STATE INTELIGENTE (#12) --------------------
  if (visibles.length === 0) {
    const esSKU = pareceSKU(filtros.q);
    const q = filtros.q || '';

    // Detectar "¿quisiste decir?" con tokens que sí matchean
    let sugerenciasTokens = [];
    if (q.length >= 2 && todosLosProductos.length > 0) {
      const tokens = tokensDe(q);
      sugerenciasTokens = tokens
        .map(t => ({
          token: t,
          count: todosLosProductos.filter(p => matchBusqueda(p, t)).length
        }))
        .filter(x => x.count > 0);
    }

    const svgIcon = esSKU
      ? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="9" y1="11" x2="13" y2="11"/></svg>`
      : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;

    $grid.innerHTML = `
      <div class="saldos-empty" style="grid-column:1/-1;" aria-live="polite">
        <div class="saldos-empty__icon">${svgIcon}</div>
        <h3 class="saldos-empty__title">${esSKU ? 'SKU no encontrado' : 'Sin resultados'}</h3>
        <p class="saldos-empty__text">
          ${esSKU
            ? `No existe un producto con el SKU <strong>${escapeHtml(q)}</strong>. Verifica el código.`
            : `No encontramos productos para <strong>"${escapeHtml(q || 'estos filtros')}"</strong>.`}
        </p>
        ${sugerenciasTokens.length > 0 ? `
          <p style="margin-top:14px; font-size:13px; color:#6b6b6b;">¿Quisiste decir?</p>
          <div class="saldos-empty__sugerencias">
            ${sugerenciasTokens.map(x => `
              <button type="button" data-sugerencia="${escapeAttr(x.token)}">
                ${escapeHtml(x.token)} (${x.count})
              </button>
            `).join('')}
          </div>
        ` : ''}
        <button type="button" class="saldos-empty__btn" id="${CFG.linea}-empty-limpiar">
          ${esSKU ? 'Limpiar búsqueda' : 'Limpiar filtros'}
        </button>
      </div>`;

    document.getElementById(`${CFG.linea}-empty-limpiar`)?.addEventListener('click', resetFiltros);

    // Botones "¿quisiste decir?" → reemplazan la query
    $grid.querySelectorAll('[data-sugerencia]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.sugerencia;
        if ($search) $search.value = t;
        filtros.q = t;
        guardarBusqueda(t);
        aplicarFiltros();
      });
    });

    if ($cargarMas) $cargarMas.style.display = 'none';
    return;
  }

  // -------------------- RESALTADO (#7) --------------------
  // Solo si hay query activa (>=2 chars), según decisión
  const highlight = filtros.q && filtros.q.length >= 2 ? filtros.q : null;

  $grid.innerHTML = visibles.map(p =>
    productCardCotizacionHtml(
      p,
      true,
      vista === 'lista' ? 'lista' : 'grid',
      CFG.origen,
      highlight ? { highlight } : {}
    )
  ).join('');

  actualizarEstadoInfinite();
}

function renderContador() {
  if (!$count) return;
  const total = todosLosProductos.length;
  const mostrados = resultadosFiltrados.length;

  // Cuántos se ven en pantalla (paginados)
  const visibles = Math.min(pagina * CFG.porPagina, mostrados);

  let texto;
  if (mostrados === 0) {
    texto = 'Sin resultados';
  } else if (mostrados === total) {
    texto = `${mostrados} producto${mostrados !== 1 ? 's' : ''} · mostrando ${visibles}`;
  } else {
    texto = `Mostrando ${visibles} de ${mostrados} resultados filtrados`;
  }

  // Animación: solo si el texto cambia
  if ($count.textContent !== texto) {
    $count.textContent = texto;
    $count.classList.remove('is-updating');
    // Forzar reflow para reiniciar animación
    void $count.offsetWidth;
    $count.classList.add('is-updating');
  }
}

function renderFamilias() {
  if (!$familias) return;
  const pool = todosLosProductos.filter(p => pasaFiltros(p, filtros));
  const map = new Map();
  pool.forEach(p => {
    if (p.familia_id && p.familia_nombre) {
      const prev = map.get(p.familia_id);
      map.set(p.familia_id, { id: p.familia_id, nombre: p.familia_nombre, count: (prev?.count || 0) + 1 });
    }
  });
  const lista = Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  $familias.innerHTML = `
    <button type="button" class="saldos-familia-chip ${!filtros.familia_id ? 'active' : ''}" data-familia="">
      Todas <span class="chip-count">${pool.length}</span>
    </button>
    ${lista.map(f => `
      <button type="button" class="saldos-familia-chip ${filtros.familia_id === f.id ? 'active' : ''}" data-familia="${escapeAttr(f.id)}">
        ${escapeHtml(f.nombre)} <span class="chip-count">${f.count}</span>
      </button>
    `).join('')}
  `;
  $familias.onclick = (e) => {
    const chip = e.target.closest('.saldos-familia-chip');
    if (!chip) return;
    filtros.familia_id = chip.dataset.familia || null;
    aplicarFiltros();
  };
}

function renderActivos() {
  if (!$activos) return;
  const chips = [];
  if (filtros.descuento != null) chips.push({ key: 'descuento', label: `Descuento ≥ ${filtros.descuento}%` });
  if (filtros.precioMin != null || filtros.precioMax != null) {
    const min = filtros.precioMin != null ? `S/ ${filtros.precioMin}` : 'S/ 0';
    const max = filtros.precioMax != null ? `S/ ${filtros.precioMax}` : '∞';
    chips.push({ key: 'precio', label: `Precio: ${min} – ${max}` });
  }
  if (filtros.soloConStock) chips.push({ key: 'soloConStock', label: 'Solo con stock' });
  filtros.calidades.forEach(id => {
    const c = todosLosProductos.find(p => p.calidad_id === id);
    chips.push({ key: 'calidad', value: id, label: c?.calidad_nombre || 'Calidad' });
  });
  filtros.bordes.forEach(id => {
    const b = todosLosProductos.find(p => p.borde_id === id);
    chips.push({ key: 'borde', value: id, label: b?.borde_nombre || 'Borde' });
  });
  if (filtros.modelo) chips.push({ key: 'modelo', label: `Modelo: "${filtros.modelo}"` });
  if (filtros.familia_id) {
    const fam = todosLosProductos.find(p => p.familia_id === filtros.familia_id);
    chips.push({ key: 'familia_id', label: fam?.familia_nombre || 'Familia' });
  }
  filtros.materiales.forEach(id => {
    const m = todosLosProductos.find(p => p.material_id === id);
    chips.push({ key: 'material', value: id, label: m?.material_nombre || 'Material' });
  });
  filtros.acabados.forEach(id => {
    const a = todosLosProductos.find(p => p.acabado_id === id);
    chips.push({ key: 'acabado', value: id, label: a?.acabado_nombre || 'Acabado' });
  });
  const fmtDim = (dim, val) => {
    const prod = todosLosProductos.find(p => p[`_${dim}_cm`] === val);
    const cm = Math.round(val * 10) / 10;
    if (!prod) return `${cm} cm`;
    const unidad = prod[`_unidad_${dim}`] || 'cm';
    const original = prod[`_${dim}_original`];
    if (unidad === 'cm') return `${cm} cm`;
    const esPulgada = unidad === '"' || unidad === 'in' || unidad === 'pulg';
    return `${original}${esPulgada ? '"' : ` ${unidad}`} (${cm} cm)`;
  };
  filtros.largo.forEach(v => chips.push({ key: 'largo', value: v, label: `Largo: ${fmtDim('largo', v)}` }));
  filtros.ancho.forEach(v => chips.push({ key: 'ancho', value: v, label: `Ancho: ${fmtDim('ancho', v)}` }));
  filtros.espesor.forEach(v => chips.push({ key: 'espesor', value: v, label: `Espesor: ${fmtDim('espesor', v)}` }));
  if (filtros.soloDestacados) chips.push({ key: 'soloDestacados', label: 'Solo destacados' });

  if (chips.length === 0) { $activos.innerHTML = ''; return; }
  const X = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  $activos.innerHTML = `
    ${chips.map(c => `
      <button type="button" class="saldos-activo" data-key="${escapeAttr(c.key)}" data-value="${escapeAttr(c.value ?? '')}">
        <span>${escapeHtml(c.label)}</span><span class="saldos-activo__close">${X}</span>
      </button>
    `).join('')}
    <button type="button" class="saldos-activo saldos-activo--clear" id="${CFG.linea}-activos-clear">Limpiar todo</button>
  `;
  $activos.onclick = (e) => {
    if (e.target.closest(`#${CFG.linea}-activos-clear`)) { resetFiltros(); return; }
    const chip = e.target.closest('.saldos-activo');
    if (!chip) return;
    quitarFiltro(chip.dataset.key, chip.dataset.value);
  };
}

function quitarFiltro(key, value) {
  switch (key) {
    case 'familia_id': filtros.familia_id = null; break;
    case 'material': filtros.materiales = filtros.materiales.filter(x => x !== value); break;
    case 'acabado': filtros.acabados = filtros.acabados.filter(x => x !== value); break;
    case 'largo': filtros.largo = filtros.largo.filter(v => v !== parseFloat(value)); break;
    case 'ancho': filtros.ancho = filtros.ancho.filter(v => v !== parseFloat(value)); break;
    case 'espesor': filtros.espesor = filtros.espesor.filter(v => v !== parseFloat(value)); break;
    case 'soloDestacados': filtros.soloDestacados = false; if ($soloDest) $soloDest.checked = false; break;
    case 'descuento': filtros.descuento = null; break;
    case 'precio': filtros.precioMin = null; filtros.precioMax = null; resetearSliderPrecio(); break;
    case 'soloConStock': filtros.soloConStock = false; if ($toggleStock) $toggleStock.checked = false; break;
    case 'calidad': filtros.calidades = filtros.calidades.filter(x => x !== value); break;
    case 'borde': filtros.bordes = filtros.bordes.filter(x => x !== value); break;
    case 'modelo': filtros.modelo = ''; if ($modeloSearch) $modeloSearch.value = ''; break;
  }
  aplicarFiltros();
}

function aplicarFiltros() {
  _memoFacetas = null;
  resultadosFiltrados = ordenarProductos(
    todosLosProductos.filter(p => pasaFiltros(p, filtros)),
    filtros.orden
  );
  pagina = 1;
  renderProductos();
  renderContador();
  renderActivos();
  renderFacetas();
  renderFamilias();

  // Sincronizar ?q= en la URL (sin recargar)
  try {
    const p = new URLSearchParams(location.search);
    if (filtros.q) p.set('q', filtros.q); else p.delete('q');
    const nueva = `${location.pathname}?${p.toString()}`;
    if (location.pathname + location.search !== nueva) {
      history.replaceState(null, '', nueva);
    }
  } catch (e) {}

  // Resetear scroll infinito al cambiar filtros
// ✅ Recrear el observer completo al cambiar filtros
if (_infiniteObserver) {
  _infiniteObserver.disconnect();
  _infiniteObserver = null;
}

const sentinel = document.getElementById(`${CFG.linea}-infinite-sentinel`);
if (sentinel && pagina * CFG.porPagina < resultadosFiltrados.length) {
  sentinel.hidden = false;
  
  _infiniteObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (_infiniteCargando) return;
        if (_infinitePausado) return;
        if (!hayMasPaginas()) return;

        _infiniteCargando = true;
        const loader = document.getElementById(`${CFG.linea}-infinite-loader`);
        if (loader) loader.hidden = false;

        setTimeout(() => {
          pagina++;
          renderProductos();
          renderContador();
          _infiniteCargando = false;
          if (loader) loader.hidden = true;
          actualizarEstadoInfinite();
        }, 250);
      });
    },
    { rootMargin: '0px 0px 200px 0px', threshold: 0 }
  );
  
  _infiniteObserver.observe(sentinel);
} else if (sentinel) {
  sentinel.hidden = true;
}
}

// ============================================================
// §5b — FACETAS
// ============================================================
function baseFaceta(overrides) {
  const f = { ...filtros, ...overrides };
  return todosLosProductos.filter(p => pasaFiltros(p, f));
}

// Cache local por render (se limpia al inicio de renderFacetas)
let _poolCache = new Map();
function baseFacetaCached(key, overrides) {
  if (_poolCache.has(key)) return _poolCache.get(key);
  const r = baseFaceta(overrides);
  _poolCache.set(key, r);
  return r;
}

function renderFacetas() {
  if (_memoFacetas === JSON.stringify(filtros)) return;
  _memoFacetas = JSON.stringify(filtros);
  _poolCache = new Map();

  // MATERIAL
  const poolMat = baseFacetaCached('mat', { materiales: [] });
  const mapMat = new Map();
  poolMat.forEach(p => {
    if (p.material_id && p.material_nombre) {
      const prev = mapMat.get(p.material_id);
      mapMat.set(p.material_id, { id: p.material_id, nombre: p.material_nombre, count: (prev?.count || 0) + 1 });
    }
  });
  const $opMat = document.getElementById(`${CFG.linea}-opciones-material`) || document.getElementById('outlet-opciones-material');
  if ($opMat) {
    $opMat.innerHTML = mapMat.size === 0
      ? `<p class="saldos-filtro-vacio">Sin materiales disponibles</p>`
      : Array.from(mapMat.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(m => `<button type="button" class="saldos-filtro-opcion ${filtros.materiales.includes(m.id) ? 'active' : ''}" data-faceta="material" data-value="${escapeAttr(m.id)}">${escapeHtml(m.nombre)}<span class="saldos-filtro-opcion__count">${m.count}</span></button>`).join('');
  }

  // ACABADO
  const poolAca = baseFaceta({ acabados: [] });
  const mapAca = new Map();
  poolAca.forEach(p => {
    if (p.acabado_id && p.acabado_nombre) {
      const prev = mapAca.get(p.acabado_id);
      mapAca.set(p.acabado_id, { id: p.acabado_id, nombre: p.acabado_nombre, count: (prev?.count || 0) + 1 });
    }
  });
  const $opAca = document.getElementById(`${CFG.linea}-opciones-acabado`) || document.getElementById('outlet-opciones-acabado');
  if ($opAca) {
    $opAca.innerHTML = mapAca.size === 0
      ? `<p class="saldos-filtro-vacio">Sin acabados disponibles</p>`
      : Array.from(mapAca.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(a => `<button type="button" class="saldos-filtro-opcion ${filtros.acabados.includes(a.id) ? 'active' : ''}" data-faceta="acabado" data-value="${escapeAttr(a.id)}">${escapeHtml(a.nombre)}<span class="saldos-filtro-opcion__count">${a.count}</span></button>`).join('');
  }

  // FAMILIA
  const poolFam = baseFaceta({ familia_id: null });
  const mapFam = new Map();
  poolFam.forEach(p => {
    if (p.familia_id && p.familia_nombre) {
      const prev = mapFam.get(p.familia_id);
      mapFam.set(p.familia_id, { id: p.familia_id, nombre: p.familia_nombre, count: (prev?.count || 0) + 1 });
    }
  });
  const $opFam = document.getElementById(`${CFG.linea}-opciones-familia`) || document.getElementById('outlet-opciones-familia');
  if ($opFam) {
    const arr = Array.from(mapFam.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    $opFam.innerHTML = `
      <button type="button" class="saldos-filtro-opcion ${!filtros.familia_id ? 'active' : ''}" data-faceta="familia" data-value="">
        Todas <span class="saldos-filtro-opcion__count">${poolFam.length}</span>
      </button>
      ${arr.map(f => `<button type="button" class="saldos-filtro-opcion ${filtros.familia_id === f.id ? 'active' : ''}" data-faceta="familia" data-value="${escapeAttr(f.id)}">${escapeHtml(f.nombre)}<span class="saldos-filtro-opcion__count">${f.count}</span></button>`).join('')}
    `;
  }

  // DESCUENTO
  const $opDesc = document.getElementById(`${CFG.linea}-opciones-descuento`) || document.getElementById('outlet-opciones-descuento');
  if ($opDesc) {
    const opciones = [
      { value: null, label: 'Cualquier descuento' },
      { value: 20, label: '≥ 20%' }, { value: 30, label: '≥ 30%' },
      { value: 50, label: '≥ 50%' }, { value: 70, label: '≥ 70%' }
    ];
    const poolDesc = baseFaceta({ descuento: null });
    $opDesc.innerHTML = opciones.map(o => {
      const count = poolDesc.filter(p => {
        const d = calcularDescuento(p);
        if (o.value == null) return d != null;
        return d != null && d >= o.value;
      }).length;
      return `<button type="button" class="saldos-filtro-opcion ${filtros.descuento === o.value ? 'active' : ''}" data-faceta="descuento" data-value="${o.value ?? ''}">${escapeHtml(o.label)}<span class="saldos-filtro-opcion__count">${count}</span></button>`;
    }).join('');
  }

  // CALIDAD
  const $opCal = document.getElementById(`${CFG.linea}-opciones-calidad`) || document.getElementById('outlet-opciones-calidad');
  if ($opCal) {
    const poolCal = baseFaceta({ calidades: [] });
    const mapCal = new Map();
    poolCal.forEach(p => {
      if (p.calidad_id && p.calidad_nombre) {
        const prev = mapCal.get(p.calidad_id);
        mapCal.set(p.calidad_id, { id: p.calidad_id, nombre: p.calidad_nombre, count: (prev?.count || 0) + 1 });
      }
    });
    $opCal.innerHTML = mapCal.size === 0
      ? `<p class="saldos-filtro-vacio">Sin calidades disponibles</p>`
      : Array.from(mapCal.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(c => `<button type="button" class="saldos-filtro-opcion ${filtros.calidades.includes(c.id) ? 'active' : ''}" data-faceta="calidad" data-value="${escapeAttr(c.id)}">${escapeHtml(c.nombre)}<span class="saldos-filtro-opcion__count">${c.count}</span></button>`).join('');
  }

  // BORDE
  const $opBor = document.getElementById(`${CFG.linea}-opciones-borde`) || document.getElementById('outlet-opciones-borde');
  if ($opBor) {
    const poolBor = baseFaceta({ bordes: [] });
    const mapBor = new Map();
    poolBor.forEach(p => {
      if (p.borde_id && p.borde_nombre) {
        const prev = mapBor.get(p.borde_id);
        mapBor.set(p.borde_id, { id: p.borde_id, nombre: p.borde_nombre, count: (prev?.count || 0) + 1 });
      }
    });
    $opBor.innerHTML = mapBor.size === 0
      ? `<p class="saldos-filtro-vacio">Sin bordes disponibles</p>`
      : Array.from(mapBor.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
          .map(b => `<button type="button" class="saldos-filtro-opcion ${filtros.bordes.includes(b.id) ? 'active' : ''}" data-faceta="borde" data-value="${escapeAttr(b.id)}">${escapeHtml(b.nombre)}<span class="saldos-filtro-opcion__count">${b.count}</span></button>`).join('');
  }

  // DIMENSIONES
  renderFacetaDimension('largo', baseFaceta({ largo: [] }));
  renderFacetaDimension('ancho', baseFaceta({ ancho: [] }));
  renderFacetaDimension('espesor', baseFaceta({ espesor: [] }));

  // Listeners
  document.querySelectorAll('[data-faceta="material"], [data-faceta="acabado"], [data-faceta="familia"], [data-faceta="descuento"], [data-faceta="calidad"], [data-faceta="borde"]').forEach(btn => {
    btn.onclick = () => {
      const f = btn.dataset.faceta;
      const v = btn.dataset.value;
      if (f === 'material') toggleArr(filtros.materiales, v);
      else if (f === 'acabado') toggleArr(filtros.acabados, v);
      else if (f === 'familia') filtros.familia_id = v || null;
      else if (f === 'descuento') filtros.descuento = v === '' ? null : Number(v);
      else if (f === 'calidad') toggleArr(filtros.calidades, v);
      else if (f === 'borde') toggleArr(filtros.bordes, v);
      aplicarFiltros();
    };
  });
}

function renderFacetaDimension(dimension, pool) {
  const $op = document.getElementById(`${CFG.linea}-opciones-${dimension}`) || document.getElementById(`outlet-opciones-${dimension}`);
  if (!$op) return;
  const grupos = new Map();
  pool.forEach(p => {
    const val = p[`_${dimension}_cm`];
    if (val == null) return;
    const clave = Math.round(val * 100) / 100;
    if (!grupos.has(clave)) grupos.set(clave, { valorCm: clave, valorOriginal: p[`_${dimension}_original`], unidad: p[`_unidad_${dimension}`] || 'cm', count: 0 });
    grupos.get(clave).count++;
  });
  if (grupos.size === 0) { $op.innerHTML = `<p class="saldos-filtro-vacio">Sin valores disponibles</p>`; return; }
  const lista = Array.from(grupos.values()).sort((a, b) => a.valorCm - b.valorCm);
  const fmt = (g) => {
    const esPulgada = g.unidad === '"' || g.unidad === 'in' || g.unidad === 'pulg';
    const cm = Math.round(g.valorCm * 10) / 10;
    if (g.unidad === 'cm') return `${cm} cm`;
    return `${g.valorOriginal}${esPulgada ? '"' : ` ${g.unidad}`} (${cm} cm)`;
  };
  if (lista.length <= CFG.umbralChipsDimension) {
    $op.innerHTML = lista.map(g => `
      <button type="button" class="saldos-filtro-opcion ${filtros[dimension].includes(g.valorCm) ? 'active' : ''}" data-faceta="${dimension}" data-value="${g.valorCm}">
        ${escapeHtml(fmt(g))}<span class="saldos-filtro-opcion__count">${g.count}</span>
      </button>`).join('');
    $op.querySelectorAll('[data-faceta]').forEach(btn => {
      btn.onclick = () => {
        const val = parseFloat(btn.dataset.value);
        toggleArr(filtros[dimension], val);
        aplicarFiltros();
      };
    });
  } else {
    const actual = filtros[dimension][0] ?? '';
    $op.innerHTML = `
      <select class="saldos-select-dimension" data-faceta="${dimension}">
        <option value="">Todas las medidas</option>
        ${lista.map(g => `<option value="${g.valorCm}" ${actual === g.valorCm ? 'selected' : ''}>${escapeHtml(fmt(g))} — ${g.count} producto${g.count !== 1 ? 's' : ''}</option>`).join('')}
      </select>`;
    $op.querySelector('select').addEventListener('change', (e) => {
      const val = e.target.value ? parseFloat(e.target.value) : null;
      filtros[dimension] = val === null ? [] : [val];
      aplicarFiltros();
    });
  }
}

function toggleArr(arr, val) {
  const i = arr.indexOf(val);
  if (i > -1) arr.splice(i, 1); else arr.push(val);
}

// ============================================================
// §6 — SLIDER DE PRECIO
// ============================================================
function calcularRangoPrecioGlobal() {
  const precios = todosLosProductos.map(p => precioFinal(p)).filter(v => v != null && v > 0);
  if (precios.length === 0) return { min: 0, max: 0 };
  return { min: Math.floor(Math.min(...precios)), max: Math.ceil(Math.max(...precios)) };
}

function inicializarSliderPrecio() {
  if (!$precioSlider || typeof noUiSlider === 'undefined') return;
  const rango = calcularRangoPrecioGlobal();
  precioRangoGlobal = rango;
  if (rango.min === rango.max) {
    $precioSlider.style.display = 'none';
    if ($precioMinValor) $precioMinValor.textContent = `S/ ${rango.min}`;
    if ($precioMaxValor) $precioMaxValor.textContent = `S/ ${rango.max}`;
    return;
  }
  $precioSlider.style.display = '';
  if (precioSliderInstance) {
    try { precioSliderInstance.destroy(); } catch (e) {}
    precioSliderInstance = null;
  }
  const step = (rango.max - rango.min) > 1000 ? 10 : 1;
  noUiSlider.create($precioSlider, {
    start: [filtros.precioMin ?? rango.min, filtros.precioMax ?? rango.max],
    connect: true,
    range: { min: rango.min, max: rango.max },
    step,
    tooltips: false,
    format: { to: v => Math.round(v), from: v => Number(v) }
  });
  precioSliderInstance = $precioSlider.noUiSlider;
  precioSliderInstance.on('update', (values) => {
    const [min, max] = values.map(Number);
    if ($precioMinValor) $precioMinValor.textContent = `S/ ${min}`;
    if ($precioMaxValor) $precioMaxValor.textContent = `S/ ${max}`;
  });
  precioSliderInstance.on('end', (values) => {
    const [min, max] = values.map(Number);
    filtros.precioMin = min === rango.min ? null : min;
    filtros.precioMax = max === rango.max ? null : max;
    aplicarFiltros();
  });
}

function resetearSliderPrecio() {
  if (!precioSliderInstance) return;
  if (precioRangoGlobal.min === precioRangoGlobal.max) return;
  precioSliderInstance.set([precioRangoGlobal.min, precioRangoGlobal.max]);
}

// ============================================================
// §7 — SHEET DE FILTROS
// ============================================================
// ============================================================
// INERT — gestión de capas (stack de diálogos abiertos)
// ============================================================
const _inertStack = [];

function aplicarInert(on, exceptEl = null) {
  // 1. Actualizar el stack de excepciones
  if (exceptEl) {
    if (on) {
      if (!_inertStack.includes(exceptEl)) _inertStack.push(exceptEl);
    } else {
      const i = _inertStack.indexOf(exceptEl);
      if (i > -1) _inertStack.splice(i, 1);
    }
  }

  // 2. Solo el tope del stack queda interactivo (si hay alguno)
  const top = _inertStack[_inertStack.length - 1] || null;

  // 3. Lista de todos los elementos que deben inertizarse
  const targets = [
    document.querySelector('main'),
    document.querySelector('header'),
    document.getElementById('outlet-faq-fab'),
    document.getElementById('outlet-sheet'),
    document.getElementById('outlet-sheet-backdrop'),
    document.getElementById('outlet-faq-drawer'),
    document.getElementById('outlet-faq-backdrop'),
    document.getElementById('carrito-banner'),
    document.getElementById('btn-top'),
    document.getElementById('qr-modal')
  ].filter(Boolean);

  // 4. Aplicar / quitar inert
  targets.forEach(el => {
    const debeSerInert = top !== null && el !== top;
    if (debeSerInert) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  });
}

function abrirSheet() {
  if (!$sheet) return;
  renderFacetas();
  inicializarSliderPrecio();
  focusReturn = document.activeElement;
  $sheet.classList.add('open');
  $sheet.setAttribute('aria-hidden', 'false');
  if ($sheetBackdrop) $sheetBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  if ($btnFiltros) $btnFiltros.setAttribute('aria-expanded', 'true');
  aplicarInert(true);
  setTimeout(() => $sheetClose?.focus(), 50);
  trackEvento('abrir_filtros', { linea: CFG.linea });
}

function cerrarSheet() {
  if (!$sheet) return;
  $sheet.classList.remove('open');
  $sheet.setAttribute('aria-hidden', 'true');
  if ($sheetBackdrop) $sheetBackdrop.classList.remove('open');
  document.body.style.overflow = '';
  if ($btnFiltros) $btnFiltros.setAttribute('aria-expanded', 'false');
  aplicarInert(false);
  if (focusReturn && typeof focusReturn.focus === 'function') {
    try { focusReturn.focus(); } catch (e) {}
  }
}

function initSheet() {
  if (!$sheet) return;
  $btnFiltros?.addEventListener('click', abrirSheet);
  $sheetClose?.addEventListener('click', cerrarSheet);
  $sheetBackdrop?.addEventListener('click', cerrarSheet);
  $btnAplicar?.addEventListener('click', () => { aplicarFiltros(); cerrarSheet(); });
  $btnLimpiar?.addEventListener('click', () => { resetFiltros(); cerrarSheet(); });

  let startY = 0, currentY = 0, dragging = false;
  const handle = $sheet.querySelector('.saldos-sheet__handle');
  if (handle) {
    handle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });
    handle.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      currentY = e.touches[0].clientY;
      const delta = currentY - startY;
      if (delta > 0) $sheet.style.transform = `translateY(${delta}px)`;
    }, { passive: true });
    handle.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      const delta = currentY - startY;
      $sheet.style.transform = '';
      if (delta > 80) cerrarSheet();
      startY = currentY = 0;
    });
  }
}

// ============================================================
// §8 — SUGERENCIAS
// ============================================================
function generarSugerencias(q) {
  const tokens = tokensDe(q);
  if (tokens.length === 0) return [];
  const encontrados = new Map();
  todosLosProductos.forEach(p => {
    let score = 0, tipo = null;
    if (p.sku && tokensMatchean(tokens, p.sku)) { score = 100; tipo = 'SKU'; }
    else if (p.nombre && tokensMatchean(tokens, p.nombre)) { score = 80; tipo = 'Producto'; }
    else if (p.familia_nombre && tokensMatchean(tokens, p.familia_nombre)) { score = 40; tipo = 'Familia'; }
    else if (p.material_nombre && tokensMatchean(tokens, p.material_nombre)) { score = 30; tipo = 'Material'; }
    else if (p.acabado_nombre && tokensMatchean(tokens, p.acabado_nombre)) { score = 20; tipo = 'Acabado'; }
    else if (matchMedidas(p, q) === true) {
      // Solo sugerir como Medida si el producto tiene medidas cargadas
      const tieneMedidas = p._largo_cm != null || p._ancho_cm != null || p._espesor_cm != null;
      if (tieneMedidas) { score = 10; tipo = 'Medida'; }
    }
    if (tipo) {
      const prev = encontrados.get(p.sku);
      if (!prev || prev.score < score) encontrados.set(p.sku, { producto: p, tipo, score });
    }
  });
  return Array.from(encontrados.values()).sort((a, b) => b.score - a.score).slice(0, 6);
}

function renderSugerencias(lista) {
  if (!$sugerencias) return;
  if (lista.length === 0) { cerrarSugerencias(); return; }

  // Agrupar por tipo (solo Productos y SKU tienen imagen)
  const grupos = {
    'SKU':       { icon: SRCH_ICONS.sku,      items: [] },
    'Producto':  { icon: SRCH_ICONS.producto, items: [] },
    'Familia':   { icon: SRCH_ICONS.familia,  items: [] },
    'Material':  { icon: SRCH_ICONS.material, items: [] },
    'Acabado':   { icon: SRCH_ICONS.acabado,  items: [] },
    'Medida':    { icon: SRCH_ICONS.medida,   items: [] }
  };

  lista.forEach(s => {
    if (grupos[s.tipo]) grupos[s.tipo].items.push(s);
  });

  // ------------------------------------------------------------
  // Formateadores
  // ------------------------------------------------------------
  const fmtPrecio = (p) => {
    const final = Number(p.precio_oferta) > 0
      ? Number(p.precio_oferta)
      : Number(p.precio_base ?? p.precio);
    if (!final || final <= 0) return null;
    // Formato S/ 123.45
    return `S/ ${final.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtPrecioOld = (p) => {
    const base = Number(p.precio_base);
    const oferta = Number(p.precio_oferta);
    if (!(oferta > 0 && base > 0 && oferta < base)) return null;
    return `S/ ${base.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtDescuento = (p) => {
    const base = Number(p.precio_base);
    const oferta = Number(p.precio_oferta);
    if (!(oferta > 0 && base > 0 && oferta < base)) return null;
    return `-${Math.round(((base - oferta) / base) * 100)}%`;
  };

  // ------------------------------------------------------------
  // Render de item de PRODUCTO (con imagen, datos completos)
  // ------------------------------------------------------------
  const renderItemProducto = (s, idx) => {
    const p = s.producto;
    const imgUrl = p.imagen_url
      ? (convertirUrlGoogleDrive(p.imagen_url) || p.imagen_url)
      : null;

    const imagenHtml = imgUrl
      ? `<img src="${escapeAttr(imgUrl)}" alt="" loading="lazy" class="saldos-sug-item__img">`
      : `<div class="saldos-sug-item__img saldos-sug-item__img--swatch"></div>`;

    const medidas = formatearMedidasProducto(p);
    const metaPartes = [];
    if (p.familia_nombre) metaPartes.push(p.familia_nombre);
    if (p.material_nombre) metaPartes.push(p.material_nombre);
    if (p.acabado_nombre) metaPartes.push(p.acabado_nombre);
    const meta = metaPartes.join(' · ');

    const precio = fmtPrecio(p);
    const precioOld = fmtPrecioOld(p);
    const descuento = fmtDescuento(p);

    // ← Si es tipo "Medida", al clic buscamos por la medida, no navegamos al producto
    const esMedida = s.tipo === 'Medida';
    const dataAttrs = esMedida
      ? `data-q="${escapeAttr(medidas || p.nombre)}" data-tipo="medida"`
      : `data-sku="${escapeAttr(p.sku)}" data-tipo="producto"`;

    return `<div class="saldos-sug-item saldos-sug-item--producto ${idx === sugerenciaActiva ? 'is-active' : ''}"
                 ${dataAttrs}
                 data-index="${idx}"
                 role="option"
                 aria-selected="${idx === sugerenciaActiva}">
      <div class="saldos-sug-item__media">
        ${imagenHtml}
      </div>
      <div class="saldos-sug-item__body">
        <div class="saldos-sug-item__title">${escapeHtml(p.nombre)}</div>
        ${meta ? `<div class="saldos-sug-item__meta">${escapeHtml(meta)}</div>` : ''}
        <div class="saldos-sug-item__bottom">
          ${medidas ? `<span class="saldos-sug-item__medidas">${escapeHtml(medidas)}</span>` : '<span></span>'}
          <span class="saldos-sug-item__precios">
            ${precioOld ? `<span class="saldos-sug-item__precio-old">${escapeHtml(precioOld)}</span>` : ''}
            ${precio ? `<span class="saldos-sug-item__precio">${escapeHtml(precio)}</span>` : ''}
            ${descuento ? `<span class="saldos-sug-item__desc">${escapeHtml(descuento)}</span>` : ''}
          </span>
        </div>
        <div class="saldos-sug-item__sku">SKU: ${escapeHtml(p.sku || '—')}</div>
      </div>
    </div>`;
  };

  // ------------------------------------------------------------
  // Render de item simple (Familia / Material / Acabado / Medida)
  // ------------------------------------------------------------
  const renderItemSimple = (s, idx, icon) => {
    const p = s.producto;
    return `<div class="saldos-sug-item saldos-sug-item--simple ${idx === sugerenciaActiva ? 'is-active' : ''}"
                 data-q="${escapeAttr(p.nombre || '')}"
                 data-index="${idx}"
                 role="option"
                 aria-selected="${idx === sugerenciaActiva}">
      <div class="saldos-sug-item__icon">${icon}</div>
      <div class="saldos-sug-item__body saldos-sug-item__body--simple">
        <div class="saldos-sug-item__title">${escapeHtml(p.nombre)}</div>
        <div class="saldos-sug-item__meta">${s.tipo}</div>
      </div>
    </div>`;
  };

  // ------------------------------------------------------------
  // Ensamblar HTML agrupado
  // ------------------------------------------------------------
  let html = '';
  let globalIdx = 0;

  Object.entries(grupos).forEach(([tipo, g]) => {
    if (g.items.length === 0) return;

    const esProducto = tipo === 'Producto' || tipo === 'SKU' || tipo === 'Medida';

    html += `<div class="saldos-sug-group">
      <div class="saldos-sug-group__header">
        <span class="saldos-sug-group__icon">${g.icon}</span>
        <span>${tipo}${g.items.length > 1 ? 's' : ''}</span>
      </div>
      ${g.items.map(s => {
        const item = esProducto
          ? renderItemProducto(s, globalIdx)
          : renderItemSimple(s, globalIdx, g.icon);
        globalIdx++;
        return item;
      }).join('')}
    </div>`;
  });

  $sugerencias.innerHTML = html;
  $sugerencias.hidden = false;
  sugerenciaActiva = -1;
}

function cerrarSugerencias() {
  if (!$sugerencias) return;
  $sugerencias.hidden = true;
  $sugerencias.innerHTML = '';
  sugerenciaActiva = -1;
}

function seleccionarSugerencia(sku) {
  cerrarSugerencias();
  const p = todosLosProductos.find(x => x.sku === sku);
  if (!p) return;
  window.location.href = `producto.html?sku=${encodeURIComponent(p.sku)}&origen=${CFG.origen}`;
}

function renderRecientes() {
  if (!$sugerencias) return;
  const recientes = obtenerBusquedasRecientes();
  if (recientes.length === 0) return;

  $sugerencias.innerHTML = `
    <div class="saldos-sug-group">
      <div class="saldos-sug-group__header">
        <span class="saldos-sug-group__icon">${SRCH_ICONS.reciente}</span>
        <span>Búsquedas recientes</span>
      </div>
      ${recientes.map(q => `
        <div class="saldos-sug-item saldos-sug-item--reciente" data-q="${escapeAttr(q)}">
          <div class="saldos-sug-item__icon">${SRCH_ICONS.reciente}</div>
          <div class="saldos-sug-item__body saldos-sug-item__body--simple">
            <div class="saldos-sug-item__title">${escapeHtml(q)}</div>
          </div>
          <button type="button" class="saldos-sug-item__remove" data-remove="${escapeAttr(q)}" aria-label="Quitar del historial">×</button>
        </div>
      `).join('')}
    </div>
  `;
  $sugerencias.hidden = false;
  sugerenciaActiva = -1;
}

function initSugerencias() {
  if (!$search || !$sugerencias) return;

  // ---- Referencias a los nuevos elementos del HTML (Bloque 1) ----
  const $clearBtn = document.getElementById(`${CFG.linea}-search-clear`);
  const $skuBadge = document.getElementById(`${CFG.linea}-search-sku-badge`);
  const $loading  = document.getElementById(`${CFG.linea}-search-loading`);

  // ============================================================
  // 1) PLACEHOLDER ROTATIVO (#4)
  // ============================================================
  const EJEMPLOS = [
    '24 PULG',
    'TUMB',
    'HONED FILLED',
    'FIORITO',
    'COMERCIAL',
    'BPYM2NOC04041'
  ];
  let ejIdx = 0;
  const placeholderDefault = $search.getAttribute('placeholder') || 'Buscar productos…';
  const rotarPlaceholder = () => {
    if ($search.value.trim() !== '') return;
    $search.setAttribute('placeholder', `Ej: ${EJEMPLOS[ejIdx]}`);
    ejIdx = (ejIdx + 1) % EJEMPLOS.length;
  };
  rotarPlaceholder();
  const rotarInterval = setInterval(rotarPlaceholder, 4000);

  // Al enfocar/desenfocar, pausar/reanudar rotación
  $search.addEventListener('focus', () => clearInterval(rotarInterval));
  $search.addEventListener('blur', () => {
    if ($search.value.trim() === '') {
      $search.setAttribute('placeholder', placeholderDefault);
    }
  });

  // ============================================================
  // 2) BOTÓN X PARA LIMPIAR (#2)
  // ============================================================
  const actualizarClearBtn = () => {
    if ($clearBtn) $clearBtn.hidden = $search.value.trim() === '';
  };
  actualizarClearBtn();

  $clearBtn?.addEventListener('click', () => {
    $search.value = '';
    filtros.q = '';
    actualizarClearBtn();
    actualizarSkuBadge('');
    cerrarSugerencias();
    aplicarFiltros();
    $search.focus();
  });

  // ============================================================
  // 3) BADGE "Buscando por SKU" (#1)
  // ============================================================
  const actualizarSkuBadge = (q) => {
    if (!$skuBadge) return;
    const esSKU = pareceSKU(q);
    $skuBadge.hidden = !esSKU;
  };

  // ============================================================
  // 4) LOADING (#6)
  // ============================================================
  const mostrarLoading = (on) => {
    if (!$loading) return;
    $loading.hidden = !on;
  };

  // ============================================================
  // 7) INPUT: debounce adaptativo + sugerencias + badges + historial
  // ============================================================
  let debounceTimer = null;

  $search.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    filtros.q = q;

    // Actualizar UI inmediata (sin esperar debounce)
    actualizarClearBtn();
    actualizarSkuBadge(q);

    // Loading
    mostrarLoading(true);

    // Debounce adaptativo (#6): queries cortas → 150ms; largas → 250ms
    clearTimeout(debounceTimer);
    const delay = q.length <= 3 ? 150 : 250;
    debounceTimer = setTimeout(() => {
      aplicarFiltros();
      mostrarLoading(false);

      // Sugerencias
      if (q.length >= 2) {
        renderSugerencias(generarSugerencias(q));
      } else {
        cerrarSugerencias();
        // Mostrar recientes y medidas si el input está vacío
        if (q === '') {
          renderRecientes();
        }
      }
    }, delay);
  });

  // ============================================================
  // 8) FOCUS: mostrar recientes + medidas cuando el input está vacío
  // ============================================================
  $search.addEventListener('focus', () => {
    if ($search.value.trim() !== '') return;
    renderRecientes();
  });

  // ============================================================
  // 9) TECLADO: navegación en sugerencias (se mantiene igual + guardar)
  // ============================================================
  $search.addEventListener('keydown', (e) => {
    if ($sugerencias.hidden) {
      if (e.key === 'Enter' && filtros.q.length >= 2) {
        guardarBusqueda(filtros.q);
        cerrarSugerencias();
      }
      return;
    }

    const items = $sugerencias.querySelectorAll('.saldos-sug-item, .saldos-sug-item--reciente');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      sugerenciaActiva = (sugerenciaActiva + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle('is-active', i === sugerenciaActiva));
      items[sugerenciaActiva].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sugerenciaActiva = (sugerenciaActiva - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('is-active', i === sugerenciaActiva));
      items[sugerenciaActiva].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (sugerenciaActiva >= 0 && items[sugerenciaActiva]) {
        const item = items[sugerenciaActiva];
        if (item.dataset.sku) {
          guardarBusqueda(filtros.q);
          seleccionarSugerencia(item.dataset.sku);
        } else if (item.dataset.q) {
          // Es una búsqueda reciente
          const q = item.dataset.q;
          $search.value = q;
          filtros.q = q;
          actualizarClearBtn();
          actualizarSkuBadge(q);
          guardarBusqueda(q);
          aplicarFiltros();
          cerrarSugerencias();
        }
      } else if (filtros.q.length >= 2) {
        guardarBusqueda(filtros.q);
        cerrarSugerencias();
      }
    } else if (e.key === 'Escape') {
      cerrarSugerencias();
    }
  });

  // ============================================================
  // 10) CLICK en sugerencias (delegación unificada)
  // ============================================================
  $sugerencias.addEventListener('click', (e) => {
    // Eliminar una búsqueda reciente
    const removeBtn = e.target.closest('.saldos-sug-item__remove');
    if (removeBtn) {
      e.stopPropagation();
      const q = removeBtn.dataset.remove;
      if (q) {
        eliminarBusqueda(q);
        renderRecientes();
      }
      return;
    }

    const item = e.target.closest('.saldos-sug-item, .saldos-sug-item--reciente');
    if (!item) return;

    if (item.dataset.sku) {
      guardarBusqueda(filtros.q);
      seleccionarSugerencia(item.dataset.sku);
    } else if (item.dataset.q) {
      const q = item.dataset.q;
      $search.value = q;
      filtros.q = q;
      actualizarClearBtn();
      actualizarSkuBadge(q);
      guardarBusqueda(q);
      aplicarFiltros();
      cerrarSugerencias();
    }
  });

  // ============================================================
  // 11) Click fuera → cerrar
  // ============================================================
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.saldos-controls__search') &&
        !e.target.closest(`#${CFG.linea}-sugerencias`)) {
      cerrarSugerencias();
    }
  });

}

// ============================================================
// §9 — QR
// ============================================================
function extraerSkuDeQR(texto) {
  const t = String(texto).trim();
  try {
    const url = new URL(t);
    const sku = url.searchParams.get('sku');
    if (sku) return sku.trim();
    const m = url.pathname.match(/\/producto\/([A-Z0-9-]+)/i);
    if (m) return m[1];
  } catch (e) {}
  const match = t.match(/[A-Z0-9][A-Z0-9-]{5,}/);
  if (!match) return null;
  const existe = todosLosProductos.some(p => p.sku === match[0]);
  return existe ? match[0] : null;
}

function abrirModalQR() {
  if (!$qrModal) return;
  if (typeof Html5Qrcode === 'undefined') { GM.toast?.('Librería de QR no cargó'); return; }
  $qrModal.classList.add('open');
  $qrModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if ($qrStatus) $qrStatus.textContent = 'Iniciando cámara…';
  if (!qrScanner) qrScanner = new Html5Qrcode('qr-reader');
  qrScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decoded) => {
      const sku = extraerSkuDeQR(decoded);
      if (!sku) {
        if ($qrStatus) $qrStatus.textContent = 'QR no corresponde a un producto.';
        return;
      }
      if ($qrStatus) $qrStatus.textContent = `SKU detectado: ${sku}`;
      if ($search) { $search.value = sku; filtros.q = sku; aplicarFiltros(); }
      setTimeout(() => cerrarModalQR(), 800);
    },
    () => {}
  ).catch((err) => {
    if ($qrStatus) $qrStatus.textContent = 'No se pudo acceder a la cámara.';
    console.error(err);
  });
}

function cerrarModalQR() {
  if (!$qrModal) return;
  $qrModal.classList.remove('open');
  $qrModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  aplicarInert(false);           
  if (qrScanner) {
    qrScanner.stop()
      .catch(() => {})
      .finally(() => {
        try { qrScanner.clear(); } catch (e) {}
      });
  }
}

function initQR() {
  document.getElementById(`${CFG.linea}-qr-btn`)?.addEventListener('click', abrirModalQR);
  document.getElementById('qr-modal-close')?.addEventListener('click', cerrarModalQR);
  $qrModal?.addEventListener('click', (e) => { if (e.target.id === 'qr-modal') cerrarModalQR(); });
}

// ============================================================
// §10 — CARRITO
// ============================================================
function carritoKey() {
  return `gallos_cotizacion_carrito_${CFG.origen}`;
}

function pulsoFab() {
  const $fab = document.getElementById('cot-fab');
  if (!$fab || $fab.hidden) return;
  $fab.classList.remove('cot-fab--pulse');
  void $fab.offsetWidth;
  $fab.classList.add('cot-fab--pulse');
}

let _toastSolicitudTimeout = null;

function mostrarToast(totalProductos, opciones = {}) {
  const {
    mensaje = totalProductos > 0 ? `${totalProductos} en tu solicitud` : '',
    mostrarBoton = false,
    tipo = 'info',
    duracion = 4000,
    onBoton = null
  } = opciones;

  document.getElementById('gm-toast-solicitud')?.remove();
  clearTimeout(_toastSolicitudTimeout);

  const iconos = {
    agregado: `<svg class="gm-toast-solicitud__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    exito:    `<svg class="gm-toast-solicitud__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    quitado:  `<svg class="gm-toast-solicitud__icon gm-toast-solicitud__icon--quitado" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    error:    `<svg class="gm-toast-solicitud__icon gm-toast-solicitud__icon--error" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info:     `<svg class="gm-toast-solicitud__icon gm-toast-solicitud__icon--info" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  const icono = iconos[tipo] || iconos.info;
  const botonHtml = mostrarBoton
    ? `<button type="button" class="gm-toast-solicitud__btn" id="gm-toast-ver">Ver →</button>`
    : '';

  const toast = document.createElement('div');
  toast.id = 'gm-toast-solicitud';
  toast.className = `gm-toast-solicitud gm-toast-solicitud--${tipo}`;
  toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
  toast.innerHTML = `
    ${icono}
    <span class="gm-toast-solicitud__text">${escapeHtml(mensaje)}</span>
    ${botonHtml}
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  const cerrar = () => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  };

  if (mostrarBoton) {
    document.getElementById('gm-toast-ver')?.addEventListener('click', () => {
      cerrar();
      if (typeof onBoton === 'function') onBoton();
      else abrirCotAside(false);
    });
  }

  if (duracion > 0) {
    _toastSolicitudTimeout = setTimeout(cerrar, duracion);
  }

  return { cerrar };
}

// Exponer mostrarToast globalmente para que public.js pueda usarla
window.mostrarToast = mostrarToast;

async function toggleProductoEnCarrito(btn, sku, origen, cantidad = 1) {
  if (btn.disabled) return;
  btn.disabled = true;

  // Normalizar cantidad: forzar entero >= 1
  const cant = (() => {
    const n = parseInt(cantidad, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  })();

  try {
    let carrito = { items: [] };
    try {
      carrito = JSON.parse(localStorage.getItem(carritoKey()) || '{"items":[]}');
    } catch (e) {}
    if (!Array.isArray(carrito.items)) carrito.items = [];

    const idx = carrito.items.findIndex(item => item.producto_sku === sku);

    // ============================================================
    // CASO 1: El producto YA está en el carrito → QUITAR
    // ============================================================
    if (idx > -1) {
      carrito.items.splice(idx, 1);
      localStorage.setItem(carritoKey(), JSON.stringify(carrito));

      // Resetear el botón del card (si existe en el DOM)
      resetBotonCotizar(sku);

      // Toast unificado (tipo quitado)
      mostrarToast(carrito.items.length, {
        mensaje: 'Producto quitado de tu solicitud',
        tipo: 'quitado',
        mostrarBoton: carrito.items.length > 0
      });

      trackEvento('quitar_cotizacion', { sku, linea: CFG.linea });

    // ============================================================
    // CASO 2: El producto NO está en el carrito → AGREGAR
    // ============================================================
    } else {
      const p = todosLosProductos.find(x => x.sku === sku);
      if (!p) {
        mostrarToast(0, {
          mensaje: 'Producto no encontrado',
          tipo: 'error'
        });
        btn.disabled = false;
        return;
      }

      carrito.items.push({
        producto_id: p.id,
        producto_sku: p.sku,
        producto_nombre: p.nombre,
        cantidad: cant,
        unidad_venta_id: p.unidad_venta_id || null,
        unidad_simbolo: p.unidad_simbolo || 'm²',
        imagen_url: p.imagen_url,
        familia_nombre: p.familia_nombre || null,
        largo: p.largo ?? null,
        ancho: p.ancho ?? null,
        espesor: p.espesor ?? null,
        unidad_largo_simbolo: p.unidad_largo_simbolo || 'cm',
        unidad_ancho_simbolo: p.unidad_ancho_simbolo || 'cm',
        unidad_espesor_simbolo: p.unidad_espesor_simbolo || 'cm'
      });
      localStorage.setItem(carritoKey(), JSON.stringify(carrito));

      // Actualizar el botón del card
      btn.classList.add('is-agregado', 'active');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('data-en-carrito', 'true');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span class="cot-btn__label">Incluido ✓</span>
      `;
      btn.title = 'Quitar de tu solicitud de cotización';
      btn.setAttribute('aria-label', 'Quitar de tu solicitud de cotización');

      // Toast unificado (tipo agregado)
      mostrarToast(carrito.items.length, {
        mensaje: `✓ Agregado (${cant} ${p.unidad_simbolo || 'm²'})`,
        tipo: 'agregado',
        mostrarBoton: true
      });

      trackEvento('agregar_cotizacion', { sku, linea: CFG.linea, cantidad: cant });

      // Auto-abrir aside en el 1.er producto
      if (!_cotAsideAutoAbierto && carrito.items.length === 1) {
        _cotAsideAutoAbierto = true;
        setTimeout(() => abrirCotAside(true), 400);
      }

      // Refrescar aside si está abierto
      if (_cotAsideAbierto) {
        setTimeout(renderCotAsideItems, 100);
      }
    }

    // ============================================================
    // SINCRONIZACIÓN COMÚN (agregar o quitar)
    // ============================================================

    // Actualizar contador del header
    if (typeof window.actualizarContadorCarritoHeader === 'function') {
      window.actualizarContadorCarritoHeader(CFG.origen);
    }
    sincronizarContadorCarrito();

    // Pulsar el FAB "Mi solicitud"
    pulsoFab();

    // Refrescar el FAB y el contador
    renderCotAsideItems();

  } catch (err) {
    console.error('Error toggling carrito:', err);
    mostrarToast(0, {
      mensaje: 'Error al procesar. Intenta nuevamente.',
      tipo: 'error'
    });
  } finally {
    btn.disabled = false;
  }
}

window.toggleProductoEnCarrito = toggleProductoEnCarrito;

function resetBotonCotizar(sku) {
  const btn = document.querySelector(`[data-action="cotizar"][data-sku="${sku}"]`);
  if (!btn) return;

  btn.classList.remove('is-agregado', 'active', 'btn-agregado');
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('data-en-carrito', 'false');
  btn.title = 'Añade este producto a tu solicitud de cotización. No reserva stock ni realiza una compra.';
  btn.setAttribute('aria-label', btn.title);
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
    <span class="cot-btn__label">Incluir en cotización</span>
  `;
}

// ============================================================
// §11 — BANNER FLOTANTE DEL CARRITO
// ============================================================
function mostrarBannerCarrito() {
  const banner = document.getElementById('carrito-banner');
  const countEl = document.getElementById('carrito-count-banner');
  const labelEl = document.getElementById('carrito-count-label');
  if (!banner || !countEl) return;
  let carrito = { items: [] };
  try { carrito = JSON.parse(localStorage.getItem(carritoKey()) || '{"items":[]}'); } catch (e) {}
  const total = (carrito.items || []).length;
  if (total === 0) {
    banner.hidden = true;
    banner.classList.remove('visible');
    return;
  }
  countEl.textContent = total;
  if (labelEl) labelEl.textContent = total === 1 ? 'producto' : 'productos';
  banner.hidden = false;
  requestAnimationFrame(() => banner.classList.add('visible'));
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    banner.classList.remove('visible');
    setTimeout(() => { banner.hidden = true; }, 300);
  }, 8000);
}

function initBanner() {
  document.getElementById('carrito-seguir')?.addEventListener('click', () => {
    const banner = document.getElementById('carrito-banner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => { banner.hidden = true; }, 300);
    }
  });
  mostrarBannerCarrito();
}

// ============================================================
// §12 — SINCRONIZACIÓN DEL CONTADOR DEL CARRITO EN EL HEADER
// ============================================================
function sincronizarContadorCarrito() {
  try {
    if (typeof window.actualizarContadorCarritoHeader === 'function') {
      // Delega en el header global (pub-shell.js ya sabe leer todos los orígenes)
      window.actualizarContadorCarritoHeader(CFG.contadorCarritoHeader || CFG.origen);
    } else {
      // Fallback: sumar TODOS los carritos por origen
      const ORIGENES = ['outlet', 'catalogo', 'saldos'];
      let count = 0;
      ORIGENES.forEach(o => {
        try {
          const c = JSON.parse(localStorage.getItem(`gallos_cotizacion_carrito_${o}`) || '{"items":[]}');
          if (Array.isArray(c.items)) count += c.items.length;
        } catch (e) {}
      });
      const badge = document.querySelector('#btn-carrito-header .badge, #btn-carrito-header [data-count], #btn-carrito-header');
      if (badge) {
        const span = badge.querySelector('.badge, [data-count]') || badge;
        span.textContent = String(count);
        badge.setAttribute('data-count', String(count));
        span.style.display = count > 0 ? '' : 'none';
      }
    }
    if (typeof window.actualizarContadorFavoritosHeader === 'function') {
      window.actualizarContadorFavoritosHeader();
    }
  } catch (e) {
    console.warn('[catalogo-core] error sincronizando contador:', e);
  }
}

// ============================================================
// §13 — COUNTDOWN
// ============================================================
function renderCountdown(config) {
  const cont = document.getElementById(`${CFG.linea}-countdown`) || document.getElementById('outlet-countdown');
  if (!cont) return;
  if (!config) { cont.hidden = true; return; }

  const L = CFG.labels;
  const ahora = new Date();
  const estado = (config.estado || 'activo').toLowerCase().trim();
  const inicio = config.fecha_inicio ? fechaLocalPE(config.fecha_inicio) : null;
  const fin = config.fecha_fin ? fechaLocalPE(config.fecha_fin) : null;
  const msg = config.mensaje_custom ? String(config.mensaje_custom).trim() : '';

  const bloqueTiempo = (d, h, m, s) => `
    <div class="saldos-countdown__time">
      <span class="tiempo-seg"><b>${String(d).padStart(2,'0')}</b>días</span>
      <span class="tiempo-seg"><b>${String(h).padStart(2,'0')}</b>h</span>
      <span class="tiempo-seg"><b>${String(m).padStart(2,'0')}</b>min</span>
      <span class="tiempo-seg"><b>${String(s).padStart(2,'0')}</b>seg</span>
    </div>`;

  const calcularTiempo = (diff) => ({
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60)
  });

  if (estado === 'mantenimiento') { cont.hidden = true; return; }

  if (estado === 'proximamente') {
    if (inicio && inicio > ahora) {
      const { d, h, m, s } = calcularTiempo(inicio - ahora);
      cont.innerHTML = `
        <span class="saldos-countdown__label">${L.countdownLlegaEn}</span>
        ${bloqueTiempo(d, h, m, s)}`;
      cont.classList.remove('saldos-countdown--hoy', 'saldos-countdown--finalizado');
      cont.hidden = false;
      return;
    }
    cont.innerHTML = `<span class="saldos-countdown__label">${msg || 'Muy pronto estaremos disponibles.'}</span>`;
    cont.classList.remove('saldos-countdown--hoy', 'saldos-countdown--finalizado');
    cont.hidden = false;
    return;
  }

  if (estado === 'finalizado') {
    const f = fin ? formatearFecha(fin) : null;
    cont.innerHTML = `<span class="saldos-countdown__label">${f ? `${L.countdownFinalizoEl} ${f}.` : (msg || L.finalizadoTexto)}</span>`;
    cont.classList.remove('saldos-countdown--hoy');
    cont.classList.add('saldos-countdown--finalizado');
    cont.hidden = false;
    return;
  }

  if (fin && fin <= ahora) {
    cont.innerHTML = `<span class="saldos-countdown__label">${L.countdownFinalizoEl} ${formatearFecha(fin)}.</span>`;
    cont.classList.remove('saldos-countdown--hoy');
    cont.classList.add('saldos-countdown--finalizado');
    cont.hidden = false;
    return;
  }

  if (inicio && inicio > ahora) {
    const { d, h, m, s } = calcularTiempo(inicio - ahora);
    const label = config.mostrar_antes_de_inicio === true
      ? `${L.countdownAbreEl} ${formatearFecha(inicio)}`
      : L.countdownLlegaEn;
    cont.innerHTML = `<span class="saldos-countdown__label">${label}</span>${bloqueTiempo(d, h, m, s)}`;
    cont.classList.remove('saldos-countdown--hoy', 'saldos-countdown--finalizado');
    cont.hidden = false;
    return;
  }

  if (inicio && inicio <= ahora && fin && fin > ahora) {
    const { d, h, m, s } = calcularTiempo(fin - ahora);
    cont.innerHTML = `<span class="saldos-countdown__label">${L.countdownDisponibleTermina} ${formatearFecha(fin)}.</span>${bloqueTiempo(d, h, m, s)}`;
    cont.classList.remove('saldos-countdown--finalizado');
    cont.classList.add('saldos-countdown--hoy');
    cont.hidden = false;
    return;
  }

  if (inicio && inicio <= ahora && !fin) {
    cont.innerHTML = `<span class="saldos-countdown__label">${L.countdownDisponibleSinFin}</span>`;
    cont.classList.remove('saldos-countdown--finalizado');
    cont.classList.add('saldos-countdown--hoy');
    cont.hidden = false;
    return;
  }

  cont.hidden = true;
}

// ============================================================
// §14 — BLOQUEO POR ESTADO
// ============================================================
function aplicarEstadoSegunFechas(config) {
  if (!$contenido || !$bloqueado) return;
  const L = CFG.labels;
  const ahora = new Date();

  const setTitle = (t) => { document.title = t; };
  const setRobots = (noindex) => {
    const meta = document.getElementById(`${CFG.linea}-robots`) || document.getElementById('outlet-robots');
    if (meta) meta.setAttribute('content', noindex ? 'noindex,follow' : 'index,follow');
  };

  const desbloquear = () => {
    $contenido.classList.remove('hidden');
    if ($bloqueado.dataset.estado !== '') {
      $bloqueado.dataset.estado = '';
      $bloqueado.innerHTML = '';
    }
    setTitle(L.titulo);
    setRobots(false);
    ultimoEstadoBloqueo = null;
  };

  if (!config || config.activo === false) { desbloquear(); return; }

  const estado = (config.estado || 'activo').toLowerCase().trim();
  const msg = config.mensaje_custom ? String(config.mensaje_custom).trim() : '';

  const bloquear = (estadoKey, html, titulo, noindex = true) => {
    $contenido.classList.add('hidden');
    if ($bloqueado.dataset.estado !== estadoKey) {
      $bloqueado.dataset.estado = estadoKey;
      $bloqueado.innerHTML = html;
    }
    setTitle(titulo);
    setRobots(noindex);
    ultimoEstadoBloqueo = estadoKey;
  };

  // CTAs reutilizables
  const ctasCatalogoYSaldos = `
    <div class="saldos-bloqueado__cta">
      <a href="catalogo.html" class="btn btn-primary">${L.ctaCatalogo}</a>
      <a href="saldos_exportacion.html" class="btn btn-ghost">${L.ctaSaldosExportacion}</a>
    </div>`;

  const ctasCatalogoYOutlet = `
    <div class="saldos-bloqueado__cta">
      <a href="catalogo.html" class="btn btn-primary">${L.ctaCatalogo}</a>
      <a href="outlet.html" class="btn btn-ghost">${L.ctaOutlet}</a>
    </div>`;

  const ctasPorLinea = () => {
    if (CFG.linea === 'saldos') return ctasCatalogoYOutlet;
      if (CFG.linea === 'outlet') return ctasCatalogoYSaldos;
    return `<div class="saldos-bloqueado__cta">
      <a href="saldos_exportacion.html" class="btn btn-primary">${L.ctaSaldosExportacion}</a>
      <a href="outlet.html" class="btn btn-ghost">${L.ctaOutlet}</a>
    </div>`;
  };

  // MANTENIMIENTO
  if (estado === 'mantenimiento') {
    bloquear('mantenimiento', `
      <div class="saldos-bloqueado saldos-bloqueado--mantenimiento">
        <div class="saldos-bloqueado__icon saldos-bloqueado__icon--circular">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <span class="saldos-bloqueado__kicker saldos-bloqueado__kicker--mantenimiento">Mantenimiento</span>
        <h2 class="saldos-bloqueado__title">${L.mantenimientoTitulo}</h2>
        <p class="saldos-bloqueado__text">${msg ? `<strong>${escapeHtml(msg)}</strong>` : L.mantenimientoTexto}</p>
        ${ctasPorLinea()}
      </div>`, L.tituloMantenimiento);
    return;
  }

  // PRÓXIMAMENTE (forzado)
  if (estado === 'proximamente') {
    const inicio = config.fecha_inicio ? fechaLocalPE(config.fecha_inicio) : null;
    const f = inicio ? formatearFecha(inicio) : null;
    bloquear('proximamente', `
      <div class="saldos-bloqueado saldos-bloqueado--proximamente">
        <div class="saldos-bloqueado__icon saldos-bloqueado__icon--circular">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/><path d="M12 2v2"/><path d="M19 6l-1.5 1.5"/></svg>
        </div>
        <span class="saldos-bloqueado__kicker">${L.proximamenteKicker}</span>
        <h2 class="saldos-bloqueado__title">${L.proximamenteTitulo}</h2>
        <p class="saldos-bloqueado__text">${msg ? `<strong>${escapeHtml(msg)}</strong>` : L.proximamenteTexto}${f ? `<br><strong>Apertura oficial:</strong> ${f}.` : ''}</p>
        ${ctasPorLinea()}
      </div>`, L.tituloProximamente);
    return;
  }

  // FINALIZADO (forzado)
  if (estado === 'finalizado') {
    const fin = config.fecha_fin ? fechaLocalPE(config.fecha_fin) : null;
    const f = fin ? formatearFecha(fin) : null;
    bloquear('finalizado', `
      <div class="saldos-bloqueado saldos-bloqueado--finalizado">
        <div class="saldos-bloqueado__icon saldos-bloqueado__icon--circular">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        </div>
        <span class="saldos-bloqueado__kicker saldos-bloqueado__kicker--finalizado">${L.finalizadoKicker}</span>
        <h2 class="saldos-bloqueado__title">${L.finalizadoTitulo}</h2>
        <p class="saldos-bloqueado__text">${f ? `${L.countdownFinalizoEl} ${f}.` : L.finalizadoTexto}${msg ? `<br><strong>${escapeHtml(msg)}</strong>` : ''}<br>${L.finalizadoTextoSufijo}</p>
        ${ctasPorLinea()}
      </div>`, L.tituloFinalizado);
    return;
  }

  const inicio = config.fecha_inicio ? fechaLocalPE(config.fecha_inicio) : null;
  const fin = config.fecha_fin ? fechaLocalPE(config.fecha_fin) : null;

  // FINALIZADO POR FECHA
  if (fin && fin <= ahora) {
    bloquear('finalizado', `
      <div class="saldos-bloqueado saldos-bloqueado--finalizado">
        <div class="saldos-bloqueado__icon saldos-bloqueado__icon--circular"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg></div>
        <span class="saldos-bloqueado__kicker saldos-bloqueado__kicker--finalizado">${L.finalizadoKicker}</span>
        <h2 class="saldos-bloqueado__title">${L.finalizadoTitulo}</h2>
        <p class="saldos-bloqueado__text">${L.countdownFinalizoEl} ${formatearFecha(fin)}.${msg ? `<br><strong>${escapeHtml(msg)}</strong>` : ''}<br>${L.finalizadoTextoSufijo}</p>
        ${ctasPorLinea()}
      </div>`, L.tituloFinalizado);
    return;
  }

  // PRÓXIMAMENTE POR FECHA
  if (inicio && inicio > ahora) {
    if (config.mostrar_antes_de_inicio === true) { desbloquear(); return; }
    bloquear('proximamente', `
      <div class="saldos-bloqueado saldos-bloqueado--proximamente">
        <div class="saldos-bloqueado__icon saldos-bloqueado__icon--circular"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/><path d="M12 2v2"/><path d="M19 6l-1.5 1.5"/></svg></div>
        <span class="saldos-bloqueado__kicker">${L.proximamenteKicker}</span>
        <h2 class="saldos-bloqueado__title">${L.proximamenteTitulo}</h2>
        <p class="saldos-bloqueado__text">${L.proximamenteTexto}<br><strong>Apertura oficial:</strong> ${formatearFecha(inicio)}.</p>
        ${ctasPorLinea()}
      </div>`, L.tituloProximamente);
    return;
  }

  desbloquear();
}

async function initCountdown() {
  if (!CFG.countdown) return;
  try {
    const config = await LineasConfigAPI.get(CFG.linea);
    renderCountdown(config);
    aplicarEstadoSegunFechas(config);
    if (countdownInterval) clearInterval(countdownInterval);
    let _estadoAnterior = null;
    const calcularEstado = () => {
      if (!config) return 'activo';
      const ahora = Date.now();
      const estado = (config.estado || 'activo').toLowerCase().trim();
      if (estado !== 'activo') return estado;
      const ini = config.fecha_inicio ? new Date(config.fecha_inicio).getTime() : null;
      const fin = config.fecha_fin ? new Date(config.fecha_fin).getTime() : null;
      if (fin && fin <= ahora) return 'finalizado';
      if (ini && ini > ahora && config.mostrar_antes_de_inicio !== true) return 'proximamente';
      return 'activo';
    };

    countdownInterval = setInterval(() => {
      renderCountdown(config);
      const est = calcularEstado();
      if (est !== _estadoAnterior) {
        _estadoAnterior = est;
        aplicarEstadoSegunFechas(config);
      }
    }, 1000);
  } catch (err) {
    logError('countdown', err);
    aplicarEstadoSegunFechas(null);
  }
}

// ============================================================
// §15 — FAQs DRAWER
// ============================================================
function initFaqs() {
  if (!CFG.faqs) return;

  const getEl = (suffix) =>
    document.getElementById(`${CFG.linea}-faq-${suffix}`) ||
    document.getElementById(`outlet-faq-${suffix}`);

  const fab      = getEl('fab');
  const drawer   = getEl('drawer');
  const backdrop = getEl('backdrop');
  const closeBtn = getEl('close');

  if (!fab || !drawer || !backdrop) return;

  let faqFocusReturn = null;

  const abrir = () => {
    faqFocusReturn = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    aplicarInert(true);
    setTimeout(() => closeBtn?.focus(), 50);
  };

  const cerrar = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    aplicarInert(false);
    if (faqFocusReturn?.focus) {
      try { faqFocusReturn.focus(); } catch (e) {}
    }
  };

  const trap = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = drawer.querySelectorAll(
      'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  fab.addEventListener('click', abrir);
  closeBtn?.addEventListener('click', cerrar);
  backdrop.addEventListener('click', cerrar);

  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    if (e.key === 'Tab')    { trap(e); }
  });
}

// ============================================================
// §16 — BOTONES HERO
// ============================================================
function initBotonesHero() {
  const irAlListado = () => {
    document.querySelector(CFG.ctaScrollSelector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const BOTON_VER_POR_LINEA = {
    outlet: 'btn-ver-outlet',
    catalogo: 'btn-ver-catalogo',
    saldos: 'btn-ver-saldos'
  };

  const idBotonVer = BOTON_VER_POR_LINEA[CFG.linea];
  if (idBotonVer) {
    document.getElementById(idBotonVer)?.addEventListener('click', irAlListado);
  }

  const scrollInd =
    document.getElementById(`${CFG.linea}-scroll-indicator`) ||
    document.getElementById('outlet-scroll-indicator');
  scrollInd?.addEventListener('click', irAlListado);
}

// ============================================================
// §17 — SWIPE HORIZONTAL EN LISTA
// ============================================================
function initSwipeLista() {
  if (!$grid) return;
  let startX = 0, endX = 0;
  $grid.addEventListener('touchstart', (e) => {
    if (vista !== 'lista') return;
    startX = e.changedTouches[0].screenX;
  }, { passive: true });
  $grid.addEventListener('touchend', (e) => {
    if (vista !== 'lista') return;
    endX = e.changedTouches[0].screenX;
    const diff = endX - startX;
    if (Math.abs(diff) < 60) return;
    const card = e.target.closest('.product-card--lista');
    if (!card) return;
    const cards = Array.from($grid.querySelectorAll('.product-card--lista'));
    const idx = cards.indexOf(card);
    if (diff < 0 && idx < cards.length - 1) cards[idx + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (diff > 0 && idx > 0) cards[idx - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, { passive: true });
}

// ============================================================
// §18 — ANALYTICS
// ============================================================
function trackEvento(tipo, datos) {
  try {
    if (typeof window.trackEvento === 'function') {
      window.trackEvento(tipo, { linea: CFG.linea, ...datos });
    }
  } catch (e) {}
}

// ============================================================
// §19 — LOGGER
// ============================================================
function logError(contexto, err) {
  console.error(`[${CFG.linea}:${contexto}]`, err);
  try {
    if (typeof window.GM_ERROR_HANDLER === 'function') {
      window.GM_ERROR_HANDLER({ contexto, linea: CFG.linea, error: err?.message || String(err) });
    }
  } catch (e) {}
}

// ============================================================
// §20 — ACCESIBILIDAD
// ============================================================
function initA11y() {
  if (CFG.heroImgSelector) {
    const img = document.querySelector(CFG.heroImgSelector);
    img?.addEventListener('error', function () {
      this.style.display = 'none';
      this.closest('.page-hero')?.classList.add('page-hero--sin-foto');
    });
  }
  const style = document.createElement('style');
  style.textContent = `
    :focus-visible { outline: 2px solid #6b0000; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// ------------------------------------------------------------
// Microcopy guía para el usuario (refuerza el flujo de cotización)
// ------------------------------------------------------------
function inyectarMicrocopy() {
  // Hero: añadir subtítulo si no existe
  const heroP = document.querySelector('.page-hero-in > p');
  if (heroP && !heroP.dataset.cotGuia) {
    heroP.dataset.cotGuia = '1';
    // Solo si el párrafo no contiene ya la palabra "cotiz"
    if (!/cotiz/i.test(heroP.textContent)) {
      heroP.insertAdjacentHTML(
        'beforeend',
        ' <span class="cot-hero-guia">Selecciona los productos que te interesan y solicita una cotización.</span>'
      );
    }
  }

  // Controles: aria-label más descriptivo
  const controls = document.querySelector('.saldos-controls');
  if (controls && !controls.dataset.cotGuia) {
    controls.dataset.cotGuia = '1';
    controls.setAttribute(
      'aria-label',
      'Busca, filtra y agrega productos a tu cotización'
    );
  }
}

// ============================================================
// §21 — CARGA DE PRODUCTOS
// ============================================================
function prepararProducto(p) {
  const fL = Number(p.unidad_largo_factor_cm) || 1;
  const fA = Number(p.unidad_ancho_factor_cm) || 1;
  const fE = Number(p.unidad_espesor_factor_cm) || 1;
  const out = {
    ...p,
    _largo_cm: p.largo != null ? Number(p.largo) * fL : null,
    _ancho_cm: p.ancho != null ? Number(p.ancho) * fA : null,
    _espesor_cm: p.espesor != null ? Number(p.espesor) * fE : null,
    _largo_original: p.largo,
    _ancho_original: p.ancho,
    _espesor_original: p.espesor,
    _unidad_largo: p.unidad_largo_simbolo || 'cm',
    _unidad_ancho: p.unidad_ancho_simbolo || 'cm',
    _unidad_espesor: p.unidad_espesor_simbolo || 'cm'
  };
  out._searchBlob = normalizarTexto([
    p.nombre, p.sku, p.familia_nombre, p.material_nombre,
    p.acabado_nombre, p.calidad_nombre, p.borde_nombre,
    p.descripcion, p.modelo
  ].filter(Boolean).join(' '));
  return out;
}

function actualizarFechaActualizado(productos) {
  const el = document.getElementById(`${CFG.linea}-actualizado`) || document.getElementById('outlet-actualizado');
  if (!el || !productos || productos.length === 0) return;
  const fechas = productos
    .map(p => p.actualizado_en || p.creado_en)
    .filter(Boolean)
    .map(f => new Date(f).getTime())
    .filter(t => !isNaN(t));
  if (fechas.length === 0) return;
  const masReciente = fechas.reduce((a, b) => (a > b ? a : b), 0);
  if (!masReciente || masReciente <= 0) return;
  el.innerHTML = `<span>Actualizado el ${formatearFecha(new Date(masReciente))}</span>`;
  el.hidden = false;
}

async function cargarProductos() {
  try {
    const productos = await CatalogoAPI.getProductos({ linea: CFG.linea });
    todosLosProductos = (productos || [])
      .filter(p => p.activo !== false)
      .map(prepararProducto);
    actualizarFechaActualizado(todosLosProductos);
    try {
      const g = localStorage.getItem(CFG.storageKeys.vista);
      if (g === 'lista' || g === 'grid') {
        vista = g;
        if (vista === 'lista') {
          $vistaLista?.classList.add('active');
          $vistaLista?.setAttribute('aria-pressed', 'true');
          $vistaGrid?.classList.remove('active');
          $vistaGrid?.setAttribute('aria-pressed', 'false');
        }
      }
    } catch (e) {}
    const params = new URLSearchParams(location.search);
    const famUrl = params.get('familia');
    if (famUrl) filtros.familia_id = famUrl;

    // Leer ?q= de la URL (permite compartir búsquedas)
    const qUrl = params.get('q');
    if (qUrl && $search) {
      $search.value = qUrl;
      filtros.q = qUrl;
      // Disparar el badge SKU y el botón X
      const $clearBtn = document.getElementById(`${CFG.linea}-search-clear`);
      const $skuBadge = document.getElementById(`${CFG.linea}-search-sku-badge`);
      if ($clearBtn) $clearBtn.hidden = false;
      if ($skuBadge) $skuBadge.hidden = !pareceSKU(qUrl);
    }

    aplicarFiltros();
    inicializarSliderPrecio();

  } catch (err) {
    logError('cargarProductos', err);
    if ($count) $count.textContent = 'Error';
    if ($grid) $grid.innerHTML = `
      <div class="saldos-empty" style="grid-column:1/-1;">
        <div class="saldos-empty__icon">⚠️</div>
        <h3 class="saldos-empty__title">Error al cargar</h3>
        <p class="saldos-empty__text">${escapeHtml(err.message || 'Error desconocido')}</p>
        <button type="button" class="saldos-empty__btn" id="${CFG.linea}-btn-retry">Reintentar</button>
      </div>`;
    document.getElementById(`${CFG.linea}-btn-retry`)?.addEventListener('click', () => location.reload());
  }
}

// ============================================================
// §22 — LISTENERS DE FILTROS
// ============================================================
function initFiltrosListeners() {
  $precioReset?.addEventListener('click', () => {
    filtros.precioMin = null;
    filtros.precioMax = null;
    resetearSliderPrecio();
    aplicarFiltros();
  });
  $toggleStock?.addEventListener('change', (e) => {
    filtros.soloConStock = e.target.checked;
    aplicarFiltros();
  });
  $toggleDestacados?.addEventListener('change', (e) => {
    filtros.soloDestacados = e.target.checked;
    if ($soloDest) $soloDest.checked = e.target.checked;
    aplicarFiltros();
  });
  $soloDest?.addEventListener('change', (e) => {
    filtros.soloDestacados = e.target.checked;
    if ($toggleDestacados) $toggleDestacados.checked = e.target.checked;
    aplicarFiltros();
  });
  let tModelo = null;
  $modeloSearch?.addEventListener('input', (e) => {
    clearTimeout(tModelo);
    tModelo = setTimeout(() => {
      filtros.modelo = e.target.value.trim();
      aplicarFiltros();
    }, 300);
  });

  // Normaliza cantidad al perder foco (delegación global, un solo listener)
  document.addEventListener('blur', (e) => {
    const input = e.target.closest('.cot-cantidad__input');
    if (!input) return;
    const min = parseFloat(input.min) || 0.01;
    let v = parseFloat(input.value);
    if (!isFinite(v) || v < min) v = min;
    input.value = Math.round(v * 100) / 100;
  }, true);

}

// ============================================================
// §23 — ORDEN, VISTA, CARGAR MÁS, BOTÓN TOP
// ============================================================
function initOrden() {
  if (!$ordenSelect) return;
  $ordenSelect.value = filtros.orden;
  $ordenSelect.addEventListener('change', (e) => {
    const n = e.target.value;
    if (!ORDENES_VALIDAS.includes(n)) return;
    filtros.orden = n;
    try { localStorage.setItem(CFG.storageKeys.orden, n); } catch (err) {}
    aplicarFiltros();
  });
}

function initVista() {
  $vistaGrid?.addEventListener('click', () => {
    if (vista === 'grid') return;
    vista = 'grid';
    $vistaGrid.classList.add('active');
    $vistaGrid.setAttribute('aria-pressed', 'true');
    $vistaLista.classList.remove('active');
    $vistaLista.setAttribute('aria-pressed', 'false');
    try { localStorage.setItem(CFG.storageKeys.vista, 'grid'); } catch (e) {}
    renderProductos();
  });
  $vistaLista?.addEventListener('click', () => {
    if (vista === 'lista') return;
    vista = 'lista';
    $vistaLista.classList.add('active');
    $vistaLista.setAttribute('aria-pressed', 'true');
    $vistaGrid.classList.remove('active');
    $vistaGrid.setAttribute('aria-pressed', 'false');
    try { localStorage.setItem(CFG.storageKeys.vista, 'lista'); } catch (e) {}
    renderProductos();
  });
}

// ============================================================
// §23b — INFINITE SCROLL (reemplaza "Cargar más")
// ============================================================
let _infiniteObserver = null;
let _infiniteCargando = false;
let _infinitePausado = false;


function initInfiniteScroll() {
  const sentinel = document.getElementById(`${CFG.linea}-infinite-sentinel`);
  const loader   = document.getElementById(`${CFG.linea}-infinite-loader`);
  const finEl    = document.getElementById(`${CFG.linea}-infinite-fin`);
  const btnCotizar = document.getElementById(`${CFG.linea}-infinite-cotizar`);
  const linkWhatsApp = document.getElementById(`${CFG.linea}-infinite-whatsapp`);

  if (!sentinel) return;

  // Solicitar cotización: abre el aside
  btnCotizar?.addEventListener('click', () => {
    if (leerCarrito().length > 0) {
      abrirCotAside(false);
    } else {
      // Si no hay productos, llevar al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // WhatsApp: abre el FAB (o el modal directamente)
  linkWhatsApp?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('wa-fab')?.click();
  });

  // ... resto del observer ...
}

function hayMasPaginas() {
  return pagina * CFG.porPagina < resultadosFiltrados.length;
}

function actualizarEstadoInfinite() {
  const sentinel = document.getElementById(`${CFG.linea}-infinite-sentinel`);
  const finEl    = document.getElementById(`${CFG.linea}-infinite-fin`);
  if (!sentinel || !finEl) return;

  const hayMas = hayMasPaginas();
  const hayResultados = resultadosFiltrados.length > 0;

  finEl.hidden = !(hayResultados && !hayMas);
  sentinel.hidden = !hayMas;

  // --- Botones condicionales del fin de resultados ---
  const $cotizar = document.getElementById(`${CFG.linea}-infinite-cotizar`);
  const $whatsapp = document.getElementById(`${CFG.linea}-infinite-whatsapp`);

  // "Solicitar cotización": solo si hay productos en el carrito
  const itemsEnCarrito = leerCarrito().length;
  if ($cotizar) $cotizar.hidden = itemsEnCarrito === 0;
}

function initBotonTop() {
  if (!$btnTop) return;
  $btnTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    $btnTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

// ============================================================
// §24 — INIT PRINCIPAL
// ============================================================
export function initCatalogo(opciones = {}) {
  Object.assign(CFG, opciones);

  window.mostrarToast = mostrarToast;

  // Merge de labels por línea + override por opciones
  const labelsLinea = LABELS_POR_LINEA[CFG.linea] || LABELS_POR_LINEA.outlet;
  CFG.labels = { ...CFG.labels, ...labelsLinea, ...(opciones.labels || {}) };

  cachearDom();
  filtros = crearFiltrosIniciales();

  if (typeof window.pubHeader === 'function') {
    try { window.pubHeader(CFG.linea); } catch (e) {}
  }

  // ============================================================
  // INIT DE MÓDULOS (orden importante)
  // ============================================================
  initA11y();
  initBotonesHero();
  initSheet();
  initSugerencias();
  initQR();
  initFaqs();
  initFaqsExclusivas();
  initComoFunciona();  
  initComoLlegar();       
  initOnboarding();            
  initCotAside();     
  initWaFab();         
  initFiltrosListeners();
  initOrden();
  initVista();
  initInfiniteScroll();        
  initBotonTop();
  initSwipeLista();   
  inyectarMicrocopy();

  // ============================================================
  // SINCRONIZAR CONTADOR DEL HEADER
  // (con reintentos por si pub-shell.js carga tarde)
  // ============================================================
  sincronizarContadorCarrito();
  setTimeout(sincronizarContadorCarrito, 100);
  setTimeout(sincronizarContadorCarrito, 500);
  setTimeout(sincronizarContadorCarrito, 1500);

  // ============================================================
  // LISTENERS GLOBALES
  // ============================================================

  // 1) Cambios en el carrito desde OTRA pestaña/ventana
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('gallos_cotizacion_carrito_')) {
      sincronizarContadorCarrito();
    }
  });

  // 2) Refrescar el aside cuando cambia el carrito
  //    (mismo origen, mismo tab: storage no dispara, pero por si acaso)
  window.addEventListener('storage', (e) => {
    if (e.key === `gallos_cotizacion_carrito_${CFG.origen}`) {
      renderCotAsideItems();
    }
  });

  // 3) Re-sincronizar al volver a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizarContadorCarrito();
  });

  // ============================================================
  // COUNTDOWN + BLOQUEO POR ESTADO
  // ============================================================
  if (CFG.countdown) {
    initCountdown();
  } else {
    aplicarEstadoSegunFechas(null);
  }

  // ============================================================
  // CARGA DE PRODUCTOS (diferida si está bloqueado)
  // ============================================================
  const estaBloqueado = () => {
    return ['mantenimiento', 'proximamente', 'finalizado'].includes(ultimoEstadoBloqueo);
  };

  Promise.resolve().then(() => {
    if (!estaBloqueado()) {
      cargarProductos();
    } else {
      const obs = setInterval(() => {
        if (!estaBloqueado()) {
          clearInterval(obs);
          cargarProductos();
        }
      }, 2000);
    }
  });
  
}

// ============================================================
// §25 — DRAWER "¿CÓMO FUNCIONA?"
// ============================================================
function initComoFunciona() {
  const btnOpen  = document.getElementById('btn-como-funciona');
  const drawer   = document.getElementById('drawer-como-funciona');
  const backdrop = document.getElementById('como-funciona-backdrop');
  const btnClose = document.getElementById('como-funciona-close');

  if (!btnOpen || !drawer || !backdrop) return;

  let focusReturn = null;

  const abrir = () => {
    focusReturn = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    btnOpen.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    aplicarInert(true, drawer);
    setTimeout(() => btnClose?.focus(), 50);
  };

  const cerrar = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    btnOpen.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    aplicarInert(false, drawer);
    if (focusReturn?.focus) {
      try { focusReturn.focus(); } catch (e) {}
    }
  };

  btnOpen.addEventListener('click', abrir);
  btnClose?.addEventListener('click', cerrar);
  backdrop.addEventListener('click', cerrar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      e.preventDefault();
      cerrar();
    }
  });

  const btnVerProductos = document.getElementById('btn-como-funciona-ver-productos');

  btnVerProductos?.addEventListener('click', () => {
    cerrar();
    setTimeout(() => {
      document.querySelector('.saldos-controls')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 320);
  });
}

// ============================================================
// §29 — ASIDE "CÓMO LLEGAR"
// ============================================================
function initComoLlegar() {
  const btnOpen  = document.getElementById('btn-como-llegar');
  const drawer   = document.getElementById('drawer-como-llegar');
  const backdrop = document.getElementById('como-llegar-backdrop');
  const btnClose = document.getElementById('como-llegar-close');
  const btnCopiar = document.getElementById('como-llegar-copiar');

  if (!btnOpen || !drawer || !backdrop) return;

  let focusReturn = null;

  const abrir = () => {
    focusReturn = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    btnOpen.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    aplicarInert(true, drawer);
    setTimeout(() => btnClose?.focus(), 50);
  };

  const cerrar = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    btnOpen.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    aplicarInert(false, drawer);
    if (focusReturn?.focus) {
      try { focusReturn.focus(); } catch (e) {}
    }
  };

  btnOpen.addEventListener('click', abrir);
  btnClose?.addEventListener('click', cerrar);
  backdrop.addEventListener('click', cerrar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      e.preventDefault();
      cerrar();
    }
  });

// ============================================================
// Copiar dirección (con fallback y feedback visual)
// ============================================================

// Helper: copiar al portapapeles con fallback para navegadores antiguos
function copiarAlPortapapeles(texto) {
  // API moderna (requiere HTTPS o localhost)
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(texto);
  }
  // Fallback para HTTP o navegadores sin Clipboard API
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) resolve();
      else reject(new Error('execCommand falló'));
    } catch (e) {
      document.body.removeChild(textarea);
      reject(e);
    }
  });
}

// Listener del botón copiar
if (btnCopiar) {
  const TEXTO_ORIGINAL = btnCopiar.innerHTML;
  const HTML_EXITO = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    ¡Copiado!
  `;
  const HTML_ERROR = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    No se pudo copiar
  `;

  btnCopiar.addEventListener('click', async () => {
    // Leer dirección del HTML (fuente única de verdad)
    const direccionEl = document.getElementById('como-llegar-direccion-texto');
    const direccion = direccionEl
      ? direccionEl.textContent.replace(/\s+/g, ' ').trim()
      : '';

    if (!direccion) {
      mostrarToast(0, {
        mensaje: 'Dirección no disponible',
        tipo: 'error'
      });      
      return;
    }

    try {
      await copiarAlPortapapeles(direccion);

      // Feedback éxito
      btnCopiar.classList.add('is-copied');
      btnCopiar.classList.remove('is-error');
      btnCopiar.innerHTML = HTML_EXITO;
      mostrarToast(0, {
        mensaje: 'Dirección copiada al portapapeles',
        tipo: 'exito'
      });


      setTimeout(() => {
        btnCopiar.classList.remove('is-copied');
        btnCopiar.innerHTML = TEXTO_ORIGINAL;
      }, 2000);

    } catch (e) {
      console.warn('[como-llegar] error copiando:', e);

      // Feedback error
      btnCopiar.classList.add('is-error');
      btnCopiar.classList.remove('is-copied');
      btnCopiar.innerHTML = HTML_ERROR;

      setTimeout(() => {
        btnCopiar.classList.remove('is-error');
        btnCopiar.innerHTML = TEXTO_ORIGINAL;
      }, 2000);
    }
  });
}

}

// ============================================================
// §30 — FAQs EXCLUSIVAS (solo una abierta a la vez)
// ============================================================
function initFaqsExclusivas() {
  const drawer = document.getElementById('outlet-faq-drawer');
  if (!drawer) return;

  const items = drawer.querySelectorAll('details');
  if (items.length === 0) return;

  items.forEach(item => {
    item.addEventListener('toggle', () => {
      // Solo actuar cuando se abre (no cuando se cierra)
      if (!item.open) return;

      // Cerrar los demás
      items.forEach(other => {
        if (other !== item && other.open) {
          other.open = false;
        }
      });
    });
  });
}

// ============================================================
// §26 — ONBOARDING PRIMERA VISITA (stub)
// ============================================================
function initOnboarding() {
  const banner = document.getElementById('onboarding-banner');
  if (!banner) return;

  const STORAGE_KEY = `gm.${CFG.linea}.onboarding-visto`;

  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
  } catch (e) {
    return;
  }

  const cerrar = (marcarVisto = true) => {
    banner.classList.remove('is-visible');
    setTimeout(() => { banner.hidden = true; }, 300);
    if (marcarVisto) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    }
  };

  setTimeout(() => {
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  }, 800);

  document.getElementById('onboarding-cerrar')?.addEventListener('click', () => cerrar());
  document.getElementById('onboarding-close-x')?.addEventListener('click', () => cerrar());

  document.getElementById('onboarding-ver-como')?.addEventListener('click', () => {
    document.getElementById('btn-como-funciona')?.click();
    cerrar();
  });
}

// ============================================================
// §27 — ASIDE DE COTIZACIÓN IN-PAGE
// ============================================================

let _cotAsideAbierto = false;
let _cotAsideAutoAbierto = false; // solo auto-abrir en el 1.er producto
let _cotAsideUltimoCount = 0;

function leerCarrito() {
  try {
    const key = `gallos_cotizacion_carrito_${CFG.origen}`;
    const c = JSON.parse(localStorage.getItem(key) || '{"items":[]}');
    return Array.isArray(c.items) ? c.items : [];
  } catch (e) {
    return [];
  }
}

function guardarCarrito(items) {
  try {
    // Forzar cantidad entera >= 1 en cada item
    const itemsNormalizados = items.map(item => {
      const n = parseInt(item.cantidad, 10);
      return {
        ...item,
        cantidad: Number.isFinite(n) && n >= 1 ? n : 1
      };
    });

    const key = `gallos_cotizacion_carrito_${CFG.origen}`;
    localStorage.setItem(key, JSON.stringify({ items: itemsNormalizados }));
  } catch (e) {}
}

function renderCotAsideItems() {
  const $body = document.getElementById('cot-aside-body');
  const $footer = document.getElementById('cot-aside-footer');
  const $empty = document.getElementById('cot-aside-empty');
  const $count = document.getElementById('cot-aside-count');
  const $fab = document.getElementById('cot-fab');
  const $fabCount = document.getElementById('cot-fab-count');

  if (!$body) return;

  const items = leerCarrito();
  const total = items.length;

  // Actualizar contadores
  if ($count) $count.textContent = `${total} producto${total !== 1 ? 's' : ''}`;
  if ($fabCount) $fabCount.textContent = String(total);

  // FAB visible solo si hay items
  if ($fab) $fab.hidden = total === 0;

  // Estado vacío vs lista
  if (total === 0) {
    $body.innerHTML = '';
    if ($footer) $footer.hidden = true;
    if ($empty) $empty.hidden = false;
    return;
  }

  if ($footer) $footer.hidden = false;
  if ($empty) $empty.hidden = true;

  // Render de items
  $body.innerHTML = items.map((item, idx) => {
    const sku = escapeAttr(item.producto_sku || '');
    const nombre = escapeHtml(item.producto_nombre || '');
    const familia = escapeHtml(item.familia_nombre || '');
    const unidad = escapeHtml(item.unidad_simbolo || 'm²');
    const cantidad = Number(item.cantidad) || 1;
    const imgUrl = item.imagen_url
      ? (convertirUrlGoogleDrive(item.imagen_url) || item.imagen_url)
      : null;

    // Medidas
    const medidas = [];
    const fmt = (v, u) => {
      if (v == null) return null;
      const esP = u === '"' || u === 'in' || u === 'pulg';
      return esP ? `${v}"` : `${v} ${u || 'cm'}`;
    };
    const l = fmt(item.largo, item.unidad_largo_simbolo);
    const a = fmt(item.ancho, item.unidad_ancho_simbolo);
    const e = fmt(item.espesor, item.unidad_espesor_simbolo);
    if (l) medidas.push(l);
    if (a) medidas.push(a);
    if (e) medidas.push(e);
    const medidasTxt = medidas.length ? medidas.join(' × ') : '';

    return `
      <div class="cot-aside-item" data-sku="${sku}" data-idx="${idx}">
        <div class="cot-aside-item__media">
          ${imgUrl
            ? `<img src="${escapeAttr(imgUrl)}" alt="" loading="lazy">`
            : `<div class="cot-aside-item__swatch"></div>`
          }
        </div>
        <div class="cot-aside-item__info">
          <div class="cot-aside-item__nombre">${nombre}</div>
          ${familia ? `<div class="cot-aside-item__familia">${familia}</div>` : ''}
          ${medidasTxt ? `<div class="cot-aside-item__medidas">${escapeHtml(medidasTxt)}</div>` : ''}
          <div class="cot-aside-item__sku">${sku}</div>
        </div>
        <div class="cot-aside-item__actions">
          <div class="cot-aside-item__cantidad">
            <button type="button" class="cot-aside-item__qty-btn" data-qty="dec" data-sku="${sku}" aria-label="Reducir cantidad">−</button>
            <input type="number" class="cot-aside-item__qty-input" value="${Math.max(1, Math.round(Number(cantidad) || 1))}" min="1" step="1" inputmode="numeric" pattern="[0-9]*" data-qty-input data-sku="${sku}" aria-label="Cantidad de ${nombre}">
            <button type="button" class="cot-aside-item__qty-btn" data-qty="inc" data-sku="${sku}" aria-label="Aumentar cantidad">+</button>
            <span class="cot-aside-item__unidad">${unidad}</span>
          </div>
          <button type="button" class="cot-aside-item__remove" data-remove data-sku="${sku}" aria-label="Quitar ${nombre} de la solicitud">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Listeners de cantidad y eliminar
  $body.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.dataset.sku;
      const items = leerCarrito().filter(i => i.producto_sku !== sku);
      guardarCarrito(items);
      renderCotAsideItems();
      if (typeof window.actualizarContadorCarritoHeader === 'function') {
        window.actualizarContadorCarritoHeader(CFG.origen);
      }
     mostrarToast(items.length, {
        mensaje: 'Producto quitado de tu solicitud',
        mostrarBoton: items.length > 0,
        tipo: 'quitado'
      });
      resetBotonCotizar(sku);  
    });
  });

  $body.querySelectorAll('[data-qty]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.dataset.sku;
      const dir = btn.dataset.qty === 'inc' ? 1 : -1;
      const items = leerCarrito();
      const item = items.find(i => i.producto_sku === sku);
      if (!item) return;

      // Forzar entero >= 1
      let val = parseInt(item.cantidad, 10);
      if (!Number.isFinite(val) || val < 1) val = 1;

      val += dir;
      if (val < 1) val = 1;

      item.cantidad = val;
      guardarCarrito(items);
      renderCotAsideItems();
    });
  });

  $body.querySelectorAll('[data-qty-input]').forEach(input => {
    // Filtrar al escribir: solo dígitos
    input.addEventListener('input', () => {
      const limpio = input.value.replace(/[^0-9]/g, '');
      if (input.value !== limpio) input.value = limpio;
    });

    // Normalizar al perder foco
    input.addEventListener('blur', () => {
      let v = parseInt(input.value, 10);
      if (!Number.isFinite(v) || v < 1) v = 1;
      input.value = String(v);

      const sku = input.dataset.sku;
      const items = leerCarrito();
      const item = items.find(i => i.producto_sku === sku);
      if (!item) return;
      item.cantidad = v;
      guardarCarrito(items);
      // No re-renderizar aquí para no perder el foco
    });

    // Bloquear teclas no numéricas
    input.addEventListener('keydown', (e) => {
      const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                       'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                       'Home', 'End'];
      if (allowed.includes(e.key)) return;
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    });

    // Guardar al presionar Enter
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  });
}

function abrirCotAside(auto = false) {
  const $aside = document.getElementById('cot-aside');
  const $backdrop = document.getElementById('cot-aside-backdrop');
  if (!$aside || !$backdrop) return;

  renderCotAsideItems();
  $aside.classList.add('open');
  $backdrop.classList.add('open');
  $aside.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  aplicarInert(true, $aside);
  _cotAsideAbierto = true;

  // Focus al primer elemento focusable
  setTimeout(() => {
    $aside.querySelector('button, a, input')?.focus();
  }, 60);

  trackEvento('aside_cotizacion_abierto', { auto, count: leerCarrito().length });
}

function cerrarCotAside() {
  const $aside = document.getElementById('cot-aside');
  const $backdrop = document.getElementById('cot-aside-backdrop');
  if (!$aside || !$backdrop) return;

  $aside.classList.remove('open');
  $backdrop.classList.remove('open');
  $aside.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  aplicarInert(false, $aside);   // ← pasar el aside
  _cotAsideAbierto = false;
}

function initCotAside() {
  const $backdrop = document.getElementById('cot-aside-backdrop');
  const $close = document.getElementById('cot-aside-close');
  const $vaciar = document.getElementById('cot-aside-vaciar');
  const $seguir = document.getElementById('cot-aside-seguir-explorando');
  const $fab = document.getElementById('cot-fab');
  const $continuar = document.getElementById('cot-aside-continuar');

  // Abrir/cerrar
  $backdrop?.addEventListener('click', cerrarCotAside);
  $close?.addEventListener('click', cerrarCotAside);
  $fab?.addEventListener('click', () => abrirCotAside(false));
  $seguir?.addEventListener('click', cerrarCotAside);

  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _cotAsideAbierto) {
      e.preventDefault();
      cerrarCotAside();
    }
  });

  $vaciar?.addEventListener('click', async () => {
    const ok = await confirmarVaciarCot();
    if (!ok) return;
    guardarCarrito([]);
    renderCotAsideItems();
    if (typeof window.actualizarContadorCarritoHeader === 'function') {
      window.actualizarContadorCarritoHeader(CFG.origen);
    }
    mostrarToast(0, {
      mensaje: 'Solicitud vaciada',
      tipo: 'quitado'
    });
    cerrarCotAside();
    
    // Resetear todos los botones del grid
    document.querySelectorAll('[data-action="cotizar"][data-sku]').forEach(btn => {
      resetBotonCotizar(btn.dataset.sku);
    });
  });

  // Continuar → navega a cotizacion.html
  $continuar?.addEventListener('click', () => {
    trackEvento('aside_cotizacion_continuar', { count: leerCarrito().length });
    // El href ya apunta a cotizacion.html?origen=outlet
    // No prevenimos el default
  });

  // Render inicial (para el FAB y el count)
  renderCotAsideItems();
}

// Modal de confirmación para vaciar
function confirmarVaciarCot() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'v-modal-backdrop open';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="v-modal v-confirm-modal" style="max-width:420px;">
        <h2 class="v-confirm-title">Vaciar solicitud</h2>
        <p class="v-confirm-desc">¿Estás seguro que quieres eliminar <strong>todos los productos</strong> de tu solicitud?</p>
        <div class="v-confirm-footer">
          <button class="v-btn v-btn-ghost" type="button" data-cancel>Cancelar</button>
          <button class="v-btn v-btn-danger-solid" type="button" data-confirm>Vaciar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = (r) => {
      modal.remove();
      resolve(r);
    };

    modal.querySelector('[data-cancel]').addEventListener('click', () => cerrar(false));
    modal.querySelector('[data-confirm]').addEventListener('click', () => cerrar(true));
  });
}

// ============================================================
// §28 — WHATSAPP FAB + FORMULARIO DE LEAD
// ============================================================

let _waAbierto = false;
let _waEnviando = false;
let _waTelefonoE164 = null;
let _waTimestampApertura = 0;
let _waLibCargada = false;

// Placeholders por país
const WA_PLACEHOLDERS_TELEFONO = {
  PE: '9xx xxx xxx',
  CO: '3xx xxx xxxx',
  MX: '55 xxxx xxxx',
  AR: '11 xxxx xxxx',
  CL: '9 xxxx xxxx',
  EC: '9xx xxx xxx',
  BO: '7xx xxxxx',
  US: '(201) 555-0123',
  ES: '6xx xxx xxx'
};

// Carga dinámica de libphonenumber-js
async function cargarLibPhone() {
  if (_waLibCargada) return true;
  try {
    const mod = await import('https://esm.sh/libphonenumber-js@1.12.26/max');
    window.__libphone = mod;
    _waLibCargada = true;
    return true;
  } catch (e) {
    console.warn('[wa] no se pudo cargar libphonenumber-js:', e);
    return false;
  }
}

async function abrirWaModal() {
  const $modal = document.getElementById('wa-modal');
  if (!$modal) return;

  _waTimestampApertura = Date.now();
  $modal.classList.add('open');
  $modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  aplicarInert(true, $modal);
  _waAbierto = true;

  // Cargar libphonenumber en background
  cargarLibPhone().then(() => {
    const $tel = document.getElementById('wa-telefono');
    if ($tel && window.__libphone?.AsYouType) {
      $tel.addEventListener('input', formatearTelefonoWa);
    }
  });

  setTimeout(() => {
    document.getElementById('wa-nombre')?.focus();
  }, 60);

  trackEvento('wa_modal_abierto', { linea: CFG.linea });
}

function cerrarWaModal() {
  const $modal = document.getElementById('wa-modal');
  if (!$modal) return;

  $modal.classList.remove('open');
  $modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  aplicarInert(false, $modal);
  _waAbierto = false;

  setTimeout(() => {
    const $form = document.getElementById('wa-form');
    const $success = document.getElementById('wa-success');
    const $btn = document.getElementById('wa-submit');

    if ($form) {
      $form.reset();
      $form.hidden = false;
      ['wa-nombre', 'wa-apellido', 'wa-telefono', 'wa-mensaje'].forEach(id => {
        document.getElementById(id)?.classList.remove('wa-input-error');
      });
      ['wa-err-nombre', 'wa-err-apellido', 'wa-err-telefono', 'wa-err-mensaje'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    }

    if ($success) $success.hidden = true;

    // 🆕 Restaurar botón
    if ($btn) {
      $btn.disabled = false;
      $btn.removeAttribute('aria-busy');
      $btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        <span class="wa-btn__label">Enviar consulta</span>
      `;
    }

    _waTelefonoE164 = null;
  }, 200);
}

function formatearTelefonoWa() {
  const $input = document.getElementById('wa-telefono');
  const $pais = document.getElementById('wa-pais');
  if (!$input || !$pais || !window.__libphone?.AsYouType) return;

  const formatter = new window.__libphone.AsYouType($pais.value);
  const formateado = formatter.input($input.value);
  if ($input.value !== formateado) {
    const pos = $input.selectionStart;
    $input.value = formateado;
    try { $input.setSelectionRange(pos, pos); } catch (e) {}
  }
}

function validarTelefonoWa() {
  const $input = document.getElementById('wa-telefono');
  const $pais = document.getElementById('wa-pais');
  const $err = document.getElementById('wa-err-telefono');
  if (!$input || !$pais) return false;

  const valor = $input.value.trim();
  $input.classList.remove('wa-input-error');
  if ($err) $err.textContent = '';
  _waTelefonoE164 = null;

  if (!valor) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'El teléfono es obligatorio.';
    return false;
  }

  if (!window.__libphone?.parsePhoneNumberFromString) {
    // Fallback si libphonenumber no cargó: validación básica
    const digits = valor.replace(/\D/g, '');
    if (digits.length < 6) {
      $input.classList.add('wa-input-error');
      if ($err) $err.textContent = 'Ingresa un teléfono válido.';
      return false;
    }
    _waTelefonoE164 = valor;
    return true;
  }

  let phone;
  try {
    phone = window.__libphone.parsePhoneNumberFromString(valor, $pais.value);
  } catch (e) {
    phone = null;
  }

  if (!phone || !phone.isValid()) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'Ingresa un teléfono válido para el país seleccionado.';
    return false;
  }

  _waTelefonoE164 = phone.number; // E.164: +51979088992
  return true;
}

function validarNombreWa() {
  const $input = document.getElementById('wa-nombre');
  const $err = document.getElementById('wa-err-nombre');
  if (!$input) return false;

  const valor = $input.value.trim();
  $input.classList.remove('wa-input-error');
  if ($err) $err.textContent = '';

  if (valor.length < 2) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'El nombre debe tener al menos 2 caracteres.';
    return false;
  }

  if (!/^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'-]+$/.test(valor)) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'Solo se permiten letras y espacios.';
    return false;
  }

  return true;
}

function validarApellidoWa() {
  const $input = document.getElementById('wa-apellido');
  const $err = document.getElementById('wa-err-apellido');
  if (!$input) return true; // Si no existe el campo, no validar

  const valor = $input.value.trim();
  $input.classList.remove('wa-input-error');
  if ($err) $err.textContent = '';

  // Opcional: si está vacío, es válido
  if (!valor) return true;

  // Mínimo 2 caracteres
  if (valor.length < 2) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'El apellido debe tener al menos 2 caracteres.';
    return false;
  }

  // Máximo 50 caracteres
  if (valor.length > 50) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'El apellido no puede tener más de 50 caracteres.';
    return false;
  }

  // Solo letras, espacios, guiones y apóstrofes
  if (!/^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'-]+$/.test(valor)) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'Solo se permiten letras y espacios.';
    return false;
  }

  return true;
}

function validarMensajeWa() {
  const $input = document.getElementById('wa-mensaje');
  const $err = document.getElementById('wa-err-mensaje');
  if (!$input) return true;

  const valor = $input.value.trim();
  $input.classList.remove('wa-input-error');
  if ($err) $err.textContent = '';

  if (valor && valor.length > 1000) {
    $input.classList.add('wa-input-error');
    if ($err) $err.textContent = 'Máximo 1000 caracteres.';
    return false;
  }

  return true;
}

async function obtenerIPWa() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    const data = await res.json();
    return data.ip || null;
  } catch (e) {
    return null;
  }
}

async function enviarWaLead(e) {
  e.preventDefault();
  if (_waEnviando) return;

  // Honeypot
  const honeypot = document.getElementById('wa-website')?.value;
  if (honeypot) {
    console.warn('[wa] honeypot activado');
    mostrarExitoWa('WA-BOT', null);
    return;
  }

  // Tiempo mínimo (anti-bot)
  const tiempo = Date.now() - _waTimestampApertura;
  if (tiempo < 1500) {
    console.warn('[wa] envío muy rápido');
    mostrarExitoWa('WA-BOT', null);
    return;
  }

  // Validar
  const okNombre = validarNombreWa();
  const okApellido = validarApellidoWa();  
  const okTel = validarTelefonoWa();
  const okMsg = validarMensajeWa();

  if (!okNombre || !okApellido || !okTel || !okMsg) {
  mostrarToast(0, {
  mensaje: 'Revisa los campos marcados',
  tipo: 'error'
});
    return;
  }

  const $btn = document.getElementById('wa-submit');
  _waEnviando = true;
  if ($btn) {
    $btn.disabled = true;
    $btn.setAttribute('aria-busy', 'true');
    $btn.innerHTML = '<span class="wa-spinner"></span> Enviando…';
  }

  try {
    const nombre = document.getElementById('wa-nombre').value.trim();
    const apellido = document.getElementById('wa-apellido')?.value.trim() || '';
    const telefono = _waTelefonoE164 || document.getElementById('wa-telefono').value.trim();
    const mensaje = document.getElementById('wa-mensaje').value.trim() || null;
    const visitorId = localStorage.getItem('gm_visitor_id') || null;
    const ipOrigen = await obtenerIPWa();

    const leadData = {
      nombre,
      apellido,
      telefono,
      mensaje,
      origen: 'outlet',
      linea: CFG.linea,
      visitor_id: visitorId,
      ip_origen: ipOrigen,
      productos: []
    };

    // Llamar a la API (igual que cotizacion.html)
    let resultado;
    if (window.CatalogoAPI?.crearLead) {
      resultado = await window.CatalogoAPI.crearLead(leadData);
    } else {
      // Fallback: importar dinámicamente
      const { CatalogoAPI } = await import('../../../shared/js/supabase-client.js');
      resultado = await CatalogoAPI.crearLead(leadData);
    }

    if (!resultado) throw new Error('No se pudo crear la consulta');

    const referencia = resultado.referencia || `WA-${Date.now().toString(36).toUpperCase()}`;
    const vendedor = resultado.vendedor_nombre || 'Un asesor';

    mostrarExitoWa(referencia, {
      nombre,
      telefono,
      mensaje,
      vendedor,
      leadId: resultado.id
    });

    trackEvento('wa_lead_enviado', {
      linea: CFG.linea,
      referencia,
      lead_id: resultado.id,
      tiene_mensaje: !!mensaje
    });

  } catch (err) {
    console.error('[wa] error enviando:', err);
    GM.toast?.(err.message || 'Error al enviar. Intenta nuevamente.');
    if ($btn) {
      $btn.disabled = false;
      $btn.removeAttribute('aria-busy');
      $btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        <span class="wa-btn__label">Enviar consulta</span>
      `;
    }
  } finally {
    _waEnviando = false;
  }
}

function mostrarExitoWa(referencia, datos) {
  const $form = document.getElementById('wa-form');
  const $success = document.getElementById('wa-success');
  const $text = document.getElementById('wa-success-text');
  const $ref = document.getElementById('wa-success-ref');
  const $continuar = document.getElementById('wa-success-continuar');

  if ($form) $form.hidden = true;
  if ($success) $success.hidden = false;

  if ($text && datos) {
    $text.innerHTML = `Hola <strong>${escapeHtml(datos.nombre)}</strong>, un asesor te contactará pronto al <strong>${escapeHtml(datos.telefono)}</strong>.`;
  }

  if ($ref && referencia) {
    $ref.textContent = `Referencia: ${referencia}`;
    $ref.hidden = false;
  }

  // Botón "Continuar en WhatsApp"
  if ($continuar) {
    // Número de WhatsApp de la empresa (cámbialo por el real)
    const WA_EMPRESA = '51999999999'; // ← CAMBIA ESTO
    const mensaje = encodeURIComponent(
      `Hola, acabo de enviar una consulta desde el outlet. Mi referencia es ${referencia}.`
    );
    $continuar.href = `https://wa.me/${WA_EMPRESA}?text=${mensaje}`;
  }
}

function initWaFab() {
  const $fab = document.getElementById('wa-fab');
  const $modal = document.getElementById('wa-modal');
  const $backdrop = document.getElementById('wa-modal-backdrop');
  const $close = document.getElementById('wa-modal-close');
  const $form = document.getElementById('wa-form');
  const $pais = document.getElementById('wa-pais');
  const $successCerrar = document.getElementById('wa-success-cerrar');

  if (!$fab || !$modal) return;

  $fab.addEventListener('click', abrirWaModal);
  $backdrop?.addEventListener('click', cerrarWaModal);
  $close?.addEventListener('click', cerrarWaModal);
  $successCerrar?.addEventListener('click', cerrarWaModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _waAbierto) {
      e.preventDefault();
      cerrarWaModal();
    }
  });

  // Cambio de país → actualizar placeholder
  $pais?.addEventListener('change', () => {
    const $tel = document.getElementById('wa-telefono');
    if ($tel) {
      $tel.placeholder = WA_PLACEHOLDERS_TELEFONO[$pais.value] || 'Ingresa tu número';
      $tel.value = '';
      formatearTelefonoWa();
    }
  });

  // Validación en tiempo real del apellido
  document.getElementById('wa-apellido')?.addEventListener('blur', () => {
    validarApellidoWa();
  });

  // Submit
  $form?.addEventListener('submit', enviarWaLead);
}

// Al final de catalogo-core.js, fuera de cualquier función
window.toggleProductoEnCarrito = toggleProductoEnCarrito;
window.abrirCotAside = abrirCotAside;
window.cerrarCotAside = cerrarCotAside;
window.renderCotAsideItems = renderCotAsideItems;
window.leerCarrito = leerCarrito;
window.guardarCarrito = guardarCarrito;
window.mostrarToast = mostrarToast;
window.resetBotonCotizar = resetBotonCotizar;
window.pulsoFab = pulsoFab;