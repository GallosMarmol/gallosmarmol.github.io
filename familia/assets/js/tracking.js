// familia/assets/js/tracking.js
// Tracking anónimo de visitas y eventos a las páginas públicas.
// Respeta Do Not Track y Global Privacy Control. No usa cookies.
// No guarda datos personales.

(function () {
  'use strict';

  // ============================================================
  // 0. RESPETO A LA PRIVACIDAD
  // ============================================================
  const dnt = navigator.doNotTrack === '1' ||
              window.doNotTrack === '1' ||
              navigator.msDoNotTrack === '1' ||
              navigator.globalPrivacyControl === true;
  if (dnt) {
    console.log('[tracking] DNT/GPC activo, no se trackea.');
    return;
  }

  // ============================================================
  // 1. CONFIGURACIÓN
  // ============================================================
  const SUPABASE_URL = 'https://qfwhwolehgjomjanvydu.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2h3b2xlaGdqb21qYW52eWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTk2NTUsImV4cCI6MjEwMzk3NTY1NX0.zErWxdb561yQlmWwGXhrwCjYurUdZbaXQC7lpXZ5jz0';

  const ENDPOINT_VISITAS = `${SUPABASE_URL}/rest/v1/visitas_publicas`;
  const ENDPOINT_EVENTOS = `${SUPABASE_URL}/rest/v1/eventos_publicos`;
  const ENDPOINT_CONFIG   = `${SUPABASE_URL}/rest/v1/tracking_config?select=activo&id=eq.1`;

  const HEADERS_SUPABASE = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const LS_VISITOR_ID     = 'gm_visitor_id';
  const LS_PRIMER_ORIGEN  = 'gm_primer_origen';
  const LS_UTM_SOURCE     = 'gm_utm_source';
  const LS_UTM_MEDIUM     = 'gm_utm_medium';
  const LS_UTM_CAMPAIGN   = 'gm_utm_campaign';
  const LS_TRACKING_ACTIVO = 'gm_tracking_activo';
  const LS_TRACKING_CACHE_TS = 'gm_tracking_cache_ts';

  const CACHE_CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutos
  const MAX_DURACION_PAGINA_SEG = 30 * 60;   // tope de 30 min para dwell
  const COLA_EVENTOS_MAX = 20;
  const COLA_EVENTOS_INTERVALO_MS = 5000;

  // ============================================================
  // 2. MODO DEBUG
  // ============================================================
  const DEBUG = (() => {
    try {
      return new URLSearchParams(location.search).has('debug_tracking');
    } catch { return false; }
  })();

  function log(...args) { if (DEBUG) console.log('[tracking]', ...args); }
  function warn(...args) { console.warn('[tracking]', ...args); }

  // ============================================================
  // 3. HELPERS GENERALES
  // ============================================================
  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function esBot() {
    const ua = navigator.userAgent || '';
    return /bot|crawler|spider|crawling|headless|phantom|slurp|bingpreview/i.test(ua);
  }

  function getVisitorInfo() {
    let id = null;
    try { id = localStorage.getItem(LS_VISITOR_ID); } catch {}

    if (id) {
      return { id, esPrimeraVisita: false };
    }

    id = uuid();
    let guardadoOK = false;
    try {
      localStorage.setItem(LS_VISITOR_ID, id);
      guardadoOK = true;
    } catch {}

    return { id, esPrimeraVisita: guardadoOK };
  }

  function getOrigenesValidos() {
    return [
      'volante', 'instagram', 'facebook', 'tiktok', 'feria', 'whatsapp','camion','planta',
      'llamada', 'referido', 'email', 'google', 'qr', 'otro','web'
    ];
  }

  function normalizarOrigen(raw) {
    if (!raw) return null;
    const o = String(raw).toLowerCase().trim().replace(/\s+/g, '-');
    if (!o) return null;
    const validos = getOrigenesValidos();
    if (validos.includes(o)) return o;
    // Buscar coincidencias sueltas (ej. "volantes" → "volante")
    for (const v of validos) {
      if (o.includes(v) || v.includes(o)) return v;
    }
    warn('origen no estándar, se marca como "otro":', o);
    return 'otro';
  }

  function getUtm(param) {
    try {
      const params = new URLSearchParams(location.search);
      const v = params.get(param);
      return v ? String(v).toLowerCase().trim() : null;
    } catch { return null; }
  }

  function persistirUtms() {
    try {
      const origenUrl = new URLSearchParams(location.search).get('origen');
      const origenNorm = normalizarOrigen(origenUrl);
      if (origenNorm) {
        localStorage.setItem(LS_UTM_SOURCE, origenNorm);
      } else {
        // fallback a utm_source
        const utmSource = getUtm('utm_source');
        const norm = normalizarOrigen(utmSource);
        if (norm) localStorage.setItem(LS_UTM_SOURCE, norm);
      }
      const utmMedium = getUtm('utm_medium');
      if (utmMedium) localStorage.setItem(LS_UTM_MEDIUM, utmMedium);

      const utmCampaign = getUtm('utm_campaign');
      if (utmCampaign) localStorage.setItem(LS_UTM_CAMPAIGN, utmCampaign);
    } catch {}
  }

  function getUtmPersistido(clave) {
    try { return localStorage.getItem(clave) || null; } catch { return null; }
  }

  function getUtmSource() {
    return getUtmPersistido(LS_UTM_SOURCE) || normalizarOrigen(getUtm('origen')) || normalizarOrigen(getUtm('utm_source'));
  }

  function getUtmMedium() {
    return getUtmPersistido(LS_UTM_MEDIUM) || getUtm('utm_medium');
  }

  function getUtmCampaign() {
    return getUtmPersistido(LS_UTM_CAMPAIGN) || getUtm('utm_campaign');
  }

  function getUtmContent() { return getUtm('utm_content'); }
  function getUtmTerm()    { return getUtm('utm_term'); }

  function getLinea() {
    // 1. data-linea en el body (prioridad máxima)
    const lineaData = document.body?.dataset?.linea;
    if (lineaData) return lineaData;

    // 2. Clases del body
    const cls = document.body?.className || '';
    if (cls.includes('page-saldos'))    return 'saldos';
    if (cls.includes('page-outlet'))    return 'outlet';
    if (cls.includes('page-catalogo'))  return 'catalogo';
    if (cls.includes('page-favoritos')) return 'catalogo';
    if (cls.includes('page-cotizacion')) return 'cotizacion';

    // 3. Path
    const path = location.pathname;
    if (path.includes('saldos_exportacion')) return 'saldos';
    if (path.includes('outlet'))             return 'outlet';
    if (path.includes('catalogo'))           return 'catalogo';
    if (path.includes('producto')) {
      // producto.html → derivar del ?origen=
      try {
        const origen = new URLSearchParams(location.search).get('origen');
        if (['outlet', 'saldos', 'catalogo'].includes(origen)) return origen;
      } catch {}
      return 'catalogo';
    }
    if (path.includes('cotizacion')) return 'cotizacion';

    return null;
  }

  function getSku() {
    try { return new URLSearchParams(location.search).get('sku') || null; }
    catch { return null; }
  }

  function getReferrer() {
    if (!document.referrer) return 'directo';
    try {
      const url = new URL(document.referrer);
      if (url.hostname === location.hostname) return null;
      // devolver origen + pathname, sin query
      return url.origin + url.pathname;
    } catch {
      return null;
    }
  }

  function getDispositivo() {
    const w = window.innerWidth || 0;
    if (w < 640)  return 'movil';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function getScreenInfo() {
    return {
      screen_width:  window.screen?.width  || null,
      screen_height: window.screen?.height || null,
      pixel_ratio:   window.devicePixelRatio || 1
    };
  }

  // ============================================================
  // 4. TRACKING_CONFIG CON CACHÉ
  // ============================================================
const LS_TRACKING_EVENTOS = 'gm_tracking_eventos_activo';

async function estaTrackingActivo() {
  // 1. Caché
  try {
    const cVisitas = localStorage.getItem(LS_TRACKING_ACTIVO);
    const cEventos = localStorage.getItem(LS_TRACKING_EVENTOS);
    const ts = parseInt(localStorage.getItem(LS_TRACKING_CACHE_TS) || '0', 10);
    if (cVisitas !== null && cEventos !== null && (Date.now() - ts) < CACHE_CONFIG_TTL_MS) {
      log('config cacheada → visitas:', cVisitas, 'eventos:', cEventos);
      return { visitas: cVisitas === '1', eventos: cEventos === '1' };
    }
  } catch {}

  // 2. Consultar Supabase
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tracking_config?select=activo,activo_eventos&id=eq.1`,
      { headers: HEADERS_SUPABASE }
    );
    if (!res.ok) return { visitas: true, eventos: true };

    const data = await res.json();
    const visitas = data?.[0]?.activo === true;
    const eventos = data?.[0]?.activo_eventos !== false;

    try {
      localStorage.setItem(LS_TRACKING_ACTIVO, visitas ? '1' : '0');
      localStorage.setItem(LS_TRACKING_EVENTOS, eventos ? '1' : '0');
      localStorage.setItem(LS_TRACKING_CACHE_TS, Date.now().toString());
    } catch {}

    log('config consultada → visitas:', visitas, 'eventos:', eventos);
    return { visitas, eventos };
  } catch (e) {
    warn('error consultando config, se asume activo (fallback):', e);
    return { visitas: true, eventos: true };
  }
}


  // ============================================================
  // 5. PAYLOAD DE VISITA
  // ============================================================
  function construirPayloadVisita() {
    const visitor = getVisitorInfo();
    const linea = getLinea();
    const screen = getScreenInfo();

    persistirUtms();

    // Guardar primer origen
    if (visitor.esPrimeraVisita) {
      const origen = getUtmSource();
      if (origen) {
        try { localStorage.setItem(LS_PRIMER_ORIGEN, origen); } catch {}
      }
    }

    return {
      pagina: location.pathname + location.search,
      linea,
      producto_sku: getSku(),
      referrer: getReferrer(),
      utm_source: getUtmSource(),
      utm_medium: getUtmMedium(),
      utm_campaign: getUtmCampaign(),
      utm_content: getUtmContent(),
      utm_term: getUtmTerm(),
      dispositivo: getDispositivo(),
      screen_width: screen.screen_width,
      screen_height: screen.screen_height,
      pixel_ratio: screen.pixel_ratio,
      visitor_id: visitor.id,
      primera_visita: visitor.esPrimeraVisita
    };
  }

  // ============================================================
  // 6. ENVÍO DE VISITA
  // ============================================================
  function enviarVisita(payload) {
    if (!payload) payload = construirPayloadVisita();

    if (!payload.linea) {
      warn('página sin línea, no se trackea:', location.pathname);
      return;
    }

    fetch(ENDPOINT_VISITAS, {
      method: 'POST',
      headers: HEADERS_SUPABASE,
      body: JSON.stringify(payload),
      keepalive: true
    })
      .then((res) => {
        if (!res.ok) {
          warn('visita rechazada:', res.status, res.statusText);
          return res.text().then(t => warn('detalle:', t));
        }
        log('visita enviada OK:', payload);
      })
      .catch((e) => {
        warn('error de red al enviar visita:', e);
      });
  }

  // ============================================================
  // 7. COLA DE EVENTOS (batching)
  // ============================================================
  let colaEventos = [];
  let colaTimer = null;
  let colaDirty = false;

    function flushEventos() {
    if (colaEventos.length === 0) return;

    try {
        if (localStorage.getItem(LS_TRACKING_EVENTOS) === '0') {
        log('eventos pausados, se descarta la cola');
        colaEventos = [];
        colaDirty = false;
        return;
        }
    } catch {}

    const lote = colaEventos.slice();
    colaEventos = [];
    colaDirty = false;

    fetch(ENDPOINT_EVENTOS, {
      method: 'POST',
      headers: HEADERS_SUPABASE,
      body: JSON.stringify(lote),
      keepalive: true,
      credentials: 'omit'
    })
      .then((res) => {
        if (!res.ok) {
          warn('eventos rechazados:', res.status);
          return res.text().then(t => warn('detalle:', t));
        }
        log('eventos enviados:', lote.length);
      })
      .catch((e) => {
        warn('error de red en eventos:', e);
        // Reintentar una vez: devolver al inicio
        colaEventos = lote.concat(colaEventos).slice(0, COLA_EVENTOS_MAX);
      });
  }

  function encolarEvento(evento) {
    if (!evento || !evento.tipo) return;
    colaEventos.push(evento);
    colaDirty = true;

    if (colaEventos.length >= COLA_EVENTOS_MAX) {
      flushEventos();
    } else if (!colaTimer) {
      colaTimer = setTimeout(() => {
        colaTimer = null;
        flushEventos();
      }, COLA_EVENTOS_INTERVALO_MS);
    }
  }

  // Enviar eventos pendientes al cerrar la pestaña
    window.addEventListener('beforeunload', () => {
    if (colaEventos.length > 0) {
        const lote = colaEventos.slice();
        colaEventos = [];
        colaDirty = false;
        fetch(ENDPOINT_EVENTOS, {
        method: 'POST',
        headers: HEADERS_SUPABASE,
        body: JSON.stringify(lote),
        keepalive: true,
        credentials: 'omit'  // ← CLAVE
        }).catch((e) => {
        warn('fetch beforeunload falló:', e);
        });
    }
    });

  // ============================================================
  // 8. TRACK EVENTO PÚBLICO
  // ============================================================
  function trackEvento(tipo, datos = {}) {
    if (!tipo) return;

    try {
        if (localStorage.getItem(LS_TRACKING_EVENTOS) === '0') return;
    } catch {}

    const visitor = getVisitorInfo();
    const evento = {
      pagina: location.pathname + location.search,
      linea: getLinea(),
      producto_sku: datos.sku || getSku() || null,
      tipo,
      datos: Object.keys(datos).length ? datos : null,
      visitor_id: visitor.id,
      dispositivo: getDispositivo(),
      creado_en: new Date().toISOString()
    };

    encolarEvento(evento);
    log('evento encolado:', evento);
  }

  window.trackEvento = trackEvento;

  // ============================================================
  // 9. DWELL TIME + SCROLL DEPTH + BEFOREUNLOAD
  // ============================================================
  const inicioPagina = Date.now();
  let scrollMaxPct = 0;
  let dwellEnviado = false;

  function calcularDwellSeg() {
    const seg = Math.round((Date.now() - inicioPagina) / 1000);
    return Math.min(seg, MAX_DURACION_PAGINA_SEG);
  }

function calcularScrollPct() {
  try {
    const body = document.body;
    const html = document.documentElement;
    const alturaTotal = Math.max(body.scrollHeight, html.scrollHeight);
    const viewport = window.innerHeight;

    // Si no hay scroll posible, ya vio todo
    if (alturaTotal <= viewport + 10) return 100;

    const y = window.scrollY + viewport;
    return Math.min(100, Math.round((y / alturaTotal) * 100));
  } catch {
    return 0;
  }
}

window.addEventListener('scroll', () => {
  const pct = calcularScrollPct();
  if (pct > scrollMaxPct) scrollMaxPct = pct;
}, { passive: true });

// Inicializar al cargar (por si no hay scroll)
(function initScrollMax() {
  const pct = calcularScrollPct();
  if (pct > scrollMaxPct) scrollMaxPct = pct;
})();

function enviarDwellFinal() {
  if (dwellEnviado) return;
  dwellEnviado = true;

  // Respetar flag de eventos (leer de caché)
  try {
    if (localStorage.getItem(LS_TRACKING_EVENTOS) === '0') {
      log('eventos pausados, no se envía dwell');
      return;
    }
  } catch {}

  const dwell = calcularDwellSeg();
  if (dwell < 2) return;

  const visitor = getVisitorInfo();
  const payload = {
    tipo: 'pagina_salida',
    pagina: location.pathname + location.search,
    linea: getLinea(),
    producto_sku: getSku(),
    visitor_id: visitor.id,
    dispositivo: getDispositivo(),
    duracion_seg: dwell,
    scroll_max: scrollMaxPct,
    creado_en: new Date().toISOString()
  };

  fetch(ENDPOINT_EVENTOS, {
    method: 'POST',
    headers: HEADERS_SUPABASE,
    body: JSON.stringify([payload]),
    keepalive: true,
    credentials: 'omit'
  }).catch((e) => warn('fetch dwell final falló:', e));
}

  window.addEventListener('pagehide', enviarDwellFinal, { once: false });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      enviarDwellFinal();
    }
  });

  // ============================================================
  // 10. INIT
  // ============================================================
    async function init() {
    if (esBot()) {
        log('bot detectado, no se trackea');
        return;
    }

    const { visitas, eventos } = await estaTrackingActivo();

    if (visitas) {
        enviarVisita();
    } else {
        log('tracking de visitas pausado');
    }

    if (!eventos) {
        log('tracking de eventos pausado');
        window.trackEvento = () => {};
        return;
    }

    const campaign = getUtmCampaign();
    if (campaign) {
        trackEvento('campaign_landing', { utm_campaign: campaign, utm_source: getUtmSource() });
    }
    }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
