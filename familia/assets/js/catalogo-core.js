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
  escapeAttr
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
// §0e — PARSEO DE QUERY EN LENGUAJE NATURAL (#8)
// ============================================================

function parsearQuery(q, productos) {
  const result = { materiales: [], acabados: [], medidas: [], tokensLibres: [] };
  if (!q || !productos || productos.length === 0) return result;

  const norm = normalizarTexto(q);

  // 1. Materiales: buscar sinónimos de material en la query
  const MATERIALES_KEYS = ['marmol', 'granito', 'cuarzo', 'travertino', 'porcelanato', 'gres', 'ceramica'];
  const materialesPorId = new Map();
  productos.forEach(p => {
    if (p.material_id && p.material_nombre) {
      materialesPorId.set(p.material_id, p.material_nombre);
    }
  });

  MATERIALES_KEYS.forEach(key => {
    const sinonimos = SINONIMOS[key] || [];
    if (sinonimos.some(s => norm.includes(normalizarTexto(s)))) {
      // Buscar el material_id correspondiente
      materialesPorId.forEach((nombre, id) => {
        if (normalizarTexto(nombre).includes(key) ||
            sinonimos.some(s => normalizarTexto(nombre).includes(normalizarTexto(s)))) {
          if (!result.materiales.some(m => m.id === id)) {
            result.materiales.push({ id, nombre });
          }
        }
      });
    }
  });

  // 2. Acabados: buscar sinónimos de acabado
  const ACABADOS_KEYS = ['pulido', 'mate', 'abujardado', 'apomazado', 'flameado', 'cepillado', 'envejecido'];
  const acabadosPorId = new Map();
  productos.forEach(p => {
    if (p.acabado_id && p.acabado_nombre) {
      acabadosPorId.set(p.acabado_id, p.acabado_nombre);
    }
  });

  ACABADOS_KEYS.forEach(key => {
    const sinonimos = SINONIMOS[key] || [];
    if (sinonimos.some(s => norm.includes(normalizarTexto(s)))) {
      acabadosPorId.forEach((nombre, id) => {
        if (normalizarTexto(nombre).includes(key) ||
            sinonimos.some(s => normalizarTexto(nombre).includes(normalizarTexto(s)))) {
          if (!result.acabados.some(a => a.id === id)) {
            result.acabados.push({ id, nombre });
          }
        }
      });
    }
  });

  // 3. Medidas tipo "60x60", "60 x 60", "60x60 cm"
  const medidasMatch = norm.matchAll(/(\d+(?:\.\d+)?)\s*(?:x|×|por)\s*(\d+(?:\.\d+)?)/g);
  for (const m of medidasMatch) {
    const largo = parseFloat(m[1]);
    const ancho = parseFloat(m[2]);
    if (largo > 0 && ancho > 0) {
      // Verificar si existe algún producto con esa medida (±1 cm)
      const existe = productos.some(p =>
        p._largo_cm != null && p._ancho_cm != null &&
        Math.abs(p._largo_cm - largo) <= 1 &&
        Math.abs(p._ancho_cm - ancho) <= 1
      );
      if (existe) result.medidas.push({ largo, ancho });
    }
  }

  // 4. Tokens libres (los que no se han interpretado como filtro)
  const tokensQuery = tokensDe(q);
  const palabrasFiltradas = new Set();
  MATERIALES_KEYS.forEach(k => (SINONIMOS[k] || []).forEach(s => palabrasFiltradas.add(normalizarTexto(s))));
  ACABADOS_KEYS.forEach(k => (SINONIMOS[k] || []).forEach(s => palabrasFiltradas.add(normalizarTexto(s))));
  result.tokensLibres = tokensQuery.filter(t => !palabrasFiltradas.has(t));

  return result;
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

function ordenarProductos(lista, orden) {
  const copia = [...lista];
  if (orden === 'mayor-descuento' || orden === 'orden' || !orden) {
    copia.sort((a, b) => {
      const da = a.destacado === true ? 1 : 0;
      const db = b.destacado === true ? 1 : 0;
      if (da !== db) return db - da;
      if (orden === 'mayor-descuento') {
        const descA = calcularDescuento(a) ?? -1;
        const descB = calcularDescuento(b) ?? -1;
        if (descA !== descB) return descB - descA;
      }
      const oa = Number(a.orden) || 999999;
      const ob = Number(b.orden) || 999999;
      if (oa !== ob) return oa - ob;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''));
    });
    return copia;
  }
  if (orden === 'menor-precio') {
    copia.sort((a, b) => (precioFinal(a) ?? Infinity) - (precioFinal(b) ?? Infinity));
    return copia;
  }
  if (orden === 'mayor-precio') {
    copia.sort((a, b) => (precioFinal(b) ?? -1) - (precioFinal(a) ?? -1));
    return copia;
  }
  if (orden === 'recientes') {
    copia.sort((a, b) => fechaProducto(b) - fechaProducto(a));
    return copia;
  }
  if (orden === 'a-z') {
    copia.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
    return copia;
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

  if (visibles.length === 0) {
    const esSKU = pareceSKU(filtros.q);
    const svgIcon = esSKU
      ? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="9" y1="11" x2="13" y2="11"/></svg>`
      : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
    $grid.innerHTML = `
      <div class="saldos-empty" style="grid-column:1/-1;" aria-live="polite">
        <div class="saldos-empty__icon">${svgIcon}</div>
        <h3 class="saldos-empty__title">${esSKU ? 'SKU no encontrado' : 'Sin resultados'}</h3>
        <p class="saldos-empty__text">
          ${esSKU
            ? `No existe un producto con el SKU <strong>${escapeHtml(filtros.q)}</strong>. Verifica el código.`
            : 'No se encontraron productos con esos filtros.'}
        </p>
        <button type="button" class="saldos-empty__btn" id="${CFG.linea}-empty-limpiar">
          ${esSKU ? 'Limpiar búsqueda' : 'Limpiar filtros'}
        </button>
      </div>`;
    document.getElementById(`${CFG.linea}-empty-limpiar`)?.addEventListener('click', resetFiltros);
    if ($cargarMas) $cargarMas.style.display = 'none';
    return;
  }

  $grid.innerHTML = visibles.map(p =>
    productCardCotizacionHtml(p, true, vista === 'lista' ? 'lista' : 'grid', CFG.origen)
  ).join('');

  if ($cargarMas) {
    $cargarMas.style.display = totalMostrar < resultadosFiltrados.length ? 'flex' : 'none';
  }
}

function renderContador() {
  if (!$count) return;
  const total = todosLosProductos.length;
  const mostrados = resultadosFiltrados.length;
  $count.textContent = mostrados === total
    ? `${total} producto${total !== 1 ? 's' : ''}`
    : `Mostrando ${mostrados} de ${total}`;
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
    else if (matchMedidas(p, q) === true) { score = 10; tipo = 'Medida'; }
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
  const fmtMedidas = (p) => {
    const partes = [];
    const f = (v, u) => {
      if (v == null) return null;
      const esP = u === '"' || u === 'in' || u === 'pulg';
      return esP ? `${v}"` : `${v} ${u || 'cm'}`;
    };
    const l = f(p._largo_original, p._unidad_largo);
    const a = f(p._ancho_original, p._unidad_ancho);
    const e = f(p._espesor_original, p._unidad_espesor);
    if (l) partes.push(l); if (a) partes.push(a); if (e) partes.push(e);
    return partes.length ? partes.join(' × ') : null;
  };
  $sugerencias.innerHTML = lista.map((s, i) => {
    const img = s.producto.imagen_url ? `background-image:url('${s.producto.imagen_url}');` : '';
    const meta = [s.producto.sku, s.producto.familia_nombre].filter(Boolean).join(' · ');
    const medidas = fmtMedidas(s.producto);
    return `<div class="saldos-sugerencia ${i === sugerenciaActiva ? 'activa' : ''}" data-sku="${escapeAttr(s.producto.sku)}" data-index="${i}" role="option" aria-selected="${i === sugerenciaActiva}">
      <div class="saldos-sugerencia__thumb" style="${img}"></div>
      <div class="saldos-sugerencia__info">
        <div class="saldos-sugerencia__nombre">${escapeHtml(s.producto.nombre)}</div>
        <div class="saldos-sugerencia__meta">${escapeHtml(meta)}</div>
        ${medidas ? `<div class="saldos-sugerencia__medidas">${escapeHtml(medidas)}</div>` : ''}
      </div>
      <span class="saldos-sugerencia__tag saldos-sugerencia__tag--cat">${escapeHtml(s.tipo)}</span>
    </div>`;
  }).join('');
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

function initSugerencias() {
  if (!$search || !$sugerencias) return;
  $search.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    filtros.q = q;
    aplicarFiltros();
    if (q.length >= 2) renderSugerencias(generarSugerencias(q));
    else cerrarSugerencias();
  }, CFG.debounceMs));

  $search.addEventListener('keydown', (e) => {
    if ($sugerencias.hidden) return;
    const items = $sugerencias.querySelectorAll('.saldos-sugerencia');
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      sugerenciaActiva = (sugerenciaActiva + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle('activa', i === sugerenciaActiva));
      items[sugerenciaActiva].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sugerenciaActiva = (sugerenciaActiva - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('activa', i === sugerenciaActiva));
      items[sugerenciaActiva].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && sugerenciaActiva >= 0) {
      e.preventDefault();
      seleccionarSugerencia(items[sugerenciaActiva].dataset.sku);
    } else if (e.key === 'Escape') {
      cerrarSugerencias();
    }
  });

  $sugerencias.addEventListener('click', (e) => {
    const item = e.target.closest('.saldos-sugerencia');
    if (!item) return;
    seleccionarSugerencia(item.dataset.sku);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.saldos-controls__search') && !e.target.closest(`#${CFG.linea}-sugerencias`)) {
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

async function toggleProductoEnCarrito(btn, sku, origen, cantidad = 1) {
  if (btn.disabled) return;
  btn.disabled = true;

  // Normalizar cantidad
  const cant = (() => {
    const n = parseFloat(cantidad);
    if (!isFinite(n) || n <= 0) return 1;
    return Math.round(n * 100) / 100;
  })();

  try {
    let carrito = { items: [] };
    try { carrito = JSON.parse(localStorage.getItem(carritoKey()) || '{"items":[]}'); } catch (e) {}
    if (!Array.isArray(carrito.items)) carrito.items = [];

    const idx = carrito.items.findIndex(item => item.producto_sku === sku);

    if (idx > -1) {
      // Ya está en el carrito → quitar
      carrito.items.splice(idx, 1);
      localStorage.setItem(carritoKey(), JSON.stringify(carrito));

      btn.classList.remove('is-agregado', 'active', 'btn-agregado');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('data-en-carrito', 'false');

      // Como ahora el botón es el nuevo (`.cot-btn`), reemplazamos el contenido:
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="8" y1="13" x2="16" y2="13"/>
          <line x1="8" y1="17" x2="13" y2="17"/>
        </svg>
        <span class="cot-btn__label">Agregar a cotización</span>
      `;
      btn.title = 'Añade este producto a tu solicitud de cotización';
      btn.setAttribute('aria-label', 'Añade este producto a tu solicitud de cotización');

      GM.toast?.('Producto quitado de tu cotización');
      trackEvento('quitar_cotizacion', { sku, linea: CFG.linea });

    } else {
      // No está en el carrito → agregar
      const p = todosLosProductos.find(x => x.sku === sku);
      if (!p) {
        GM.toast?.('Producto no encontrado');
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

      btn.classList.add('is-agregado', 'active');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('data-en-carrito', 'true');
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span class="cot-btn__label">En tu cotización</span>
      `;
      btn.title = 'Quitar de tu cotización';
      btn.setAttribute('aria-label', 'Quitar de tu cotización');

      GM.toast?.(`✓ Agregado a tu cotización (${cant} ${p.unidad_simbolo || 'm²'})`);
      trackEvento('agregar_cotizacion', { sku, linea: CFG.linea, cantidad: cant });
    }

    if (typeof window.actualizarContadorCarritoHeader === 'function') {
      window.actualizarContadorCarritoHeader(CFG.origen);
    }
    sincronizarContadorCarrito();
    mostrarBannerCarrito();

  } catch (err) {
    console.error('Error toggling carrito:', err);
    GM.toast?.('Error al procesar. Intenta nuevamente.');
  } finally {
    btn.disabled = false;
  }
}

window.toggleProductoEnCarrito = toggleProductoEnCarrito;

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
    :focus-visible { outline: 2px solid #b8863b; outline-offset: 2px; }
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
        ' <span class="cot-hero-guia">Selecciona los productos que te interesan y solicita una cotización personalizada.</span>'
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

function initCargarMas() {
  $btnCargarMas?.addEventListener('click', () => {
    pagina++;
    renderProductos();
    trackEvento('click_cargar_mas', { pagina_actual: pagina, total: resultadosFiltrados.length });
  });
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

  // Merge de labels por línea + override por opciones
  const labelsLinea = LABELS_POR_LINEA[CFG.linea] || LABELS_POR_LINEA.outlet;
  CFG.labels = { ...CFG.labels, ...labelsLinea, ...(opciones.labels || {}) };

  cachearDom();
  filtros = crearFiltrosIniciales();

  if (typeof window.pubHeader === 'function') {
    try { window.pubHeader(CFG.linea); } catch (e) {}
  }

  initA11y();
  initBotonesHero();
  initSheet();
  initSugerencias();
  initQR();
  initFaqs();
  initFiltrosListeners();
  initOrden();
  initVista();
  initCargarMas();
  initBotonTop();
  initSwipeLista();
  initBanner();
  inyectarMicrocopy();
  // Sincronizar contador del header (con reintentos por si pub-shell.js carga tarde)
  sincronizarContadorCarrito();
  setTimeout(sincronizarContadorCarrito, 100);
  setTimeout(sincronizarContadorCarrito, 500);
  setTimeout(sincronizarContadorCarrito, 1500);

  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('gallos_cotizacion_carrito_')) {
      sincronizarContadorCarrito();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizarContadorCarrito();
  });

  // Countdown + bloqueo
  if (CFG.countdown) {
    initCountdown();
  } else {
    aplicarEstadoSegunFechas(null);
  }

  // Cargar productos si no está bloqueado
  const estaBloqueado = () => {
    return ['mantenimiento', 'proximamente', 'finalizado'].includes(ultimoEstadoBloqueo);
  };

  Promise.resolve().then(() => {
    if (!estaBloqueado()) cargarProductos();
    else {
      const obs = setInterval(() => {
        if (!estaBloqueado()) {
          clearInterval(obs);
          cargarProductos();
        }
      }, 2000);
    }
  });
}