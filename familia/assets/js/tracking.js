// familia/assets/js/tracking.js
// Tracking anónimo de visitas a las páginas públicas.
// Respeta Do Not Track. No usa cookies. No guarda datos personales.

(function () {
  'use strict';

  // ============================================================
  // 1. Respetar Do Not Track
  // ============================================================
  const dnt = navigator.doNotTrack === '1' ||
              window.doNotTrack === '1' ||
              navigator.msDoNotTrack === '1';
  if (dnt) {
    console.log('[tracking] DNT activo, no se trackea.');
    return;
  }

  // ============================================================
  // 2. Configuración
  // ============================================================
  const SUPABASE_URL = 'https://qfwhwolehgjomjanvydu.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmd2h3b2xlaGdqb21qYW52eWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTk2NTUsImV4cCI6MjEwMzk3NTY1NX0.zErWxdb561yQlmWwGXhrwCjYurUdZbaXQC7lpXZ5jz0';

  const ENDPOINT = `${SUPABASE_URL}/rest/v1/visitas_publicas`;
  const LS_VISITOR_ID = 'gm_visitor_id';
  const LS_VISITOR_PRIMERA = 'gm_visitor_primera_visita';

  // ============================================================
  // 3. Helpers
  // ============================================================
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    // Fallback para navegadores viejos
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getVisitorId() {
    let id = null;
    try { id = localStorage.getItem(LS_VISITOR_ID); } catch {}
    if (!id) {
      id = uuid();
      try { localStorage.setItem(LS_VISITOR_ID, id); } catch {}
    }
    return id;
  }

  function esPrimeraVisita() {
    try {
      const yaVisito = localStorage.getItem(LS_VISITOR_PRIMERA) === '1';
      if (!yaVisito) {
        localStorage.setItem(LS_VISITOR_PRIMERA, '1');
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  function getVisitorInfo() {
    let id = null;
    try { id = localStorage.getItem(LS_VISITOR_ID); } catch {}

    if (id) {
      // Ya existía → no es primera visita
      return { id, esPrimeraVisita: false };
    }

    // No existía → es primera visita, generar nuevo
    id = uuid();
    try { localStorage.setItem(LS_VISITOR_ID, id); } catch {}
    return { id, esPrimeraVisita: true };
  }

  function getLinea() {
    // 1. PRIORIDAD: ?origen= en la URL (para cotizacion.html?origen=saldos, etc.)
    try {
      const params = new URLSearchParams(location.search);
      const origen = params.get('origen');
      if (origen) {
        const validos = ['catalogo', 'outlet', 'saldos', 'referido', 'instagram', 'feria', 'whatsapp', 'llamada', 'otro'];
        if (validos.includes(origen)) return origen;
      }
    } catch {}

    // 2. data-linea en el body
    const lineaData = document.body?.dataset?.linea;
    if (lineaData) return lineaData;

    // 3. Clase del body (page-saldos → saldos)
    const cls = document.body?.className || '';
    if (cls.includes('page-saldos')) return 'saldos';
    if (cls.includes('page-outlet')) return 'outlet';
    if (cls.includes('page-catalogo')) return 'catalogo';
    if (cls.includes('page-favoritos')) return 'favoritos';

    // 4. URL
    const path = location.pathname;
    if (path.includes('saldos_exportacion')) return 'saldos';
    if (path.includes('outlet')) return 'outlet';
    if (path.includes('catalogo')) return 'catalogo';
    if (path.includes('cotizacion')) return 'cotizacion';

    return null;
  }

  function getSku() {
    try {
      const params = new URLSearchParams(location.search);
      return params.get('sku') || null;
    } catch {
      return null;
    }
  }

  function getReferrer() {
    if (!document.referrer) return null;
    try {
      const url = new URL(document.referrer);
      // Ignorar referrers del mismo origen
      if (url.hostname === location.hostname) return null;
      return url.hostname;
    } catch {
      return null;
    }
  }

  function getUtm(param) {
    try {
      const params = new URLSearchParams(location.search);
      return params.get(param) || null;
    } catch {
      return null;
    }
  }

  function getDispositivo() {
    const w = window.innerWidth;
    if (w < 640) return 'movil';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  // ============================================================
  // 4. Enviar la visita
  // ============================================================
  function enviarVisita() {
  const visitor = getVisitorInfo();

  const payload = {
    pagina: location.pathname + location.search,
    linea: getLinea(),
    producto_sku: getSku(),
    referrer: getReferrer(),
    utm_source: getUtm('utm_source'),
    utm_campaign: getUtm('utm_campaign'),
    dispositivo: getDispositivo(),
    visitor_id: visitor.id,
    primera_visita: visitor.esPrimeraVisita
  };

    // fetch con keepalive para que no bloquee la carga
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch((e) => {
      // Silencioso: si falla, no rompemos la página
      console.warn('[tracking] no se pudo registrar la visita:', e);
    });
  }

  // ============================================================
  // 5. Verificar si el tracking está activo antes de enviar
  // ============================================================
  async function verificarYEnviar() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tracking_config?select=activo&id=eq.1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      if (!res.ok) {
        console.warn('[tracking] no se pudo leer la config, no se trackea por seguridad.');
        return;
      }

      const data = await res.json();
      const activo = data?.[0]?.activo === true;

      if (!activo) {
        console.log('[tracking] pausado por configuración.');
        return;
      }

      enviarVisita();
    } catch (e) {
      // Si falla la consulta (red, etc.), NO trackeamos por seguridad
      console.warn('[tracking] error consultando config:', e);
    }
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarYEnviar, { once: true });
  } else {
    verificarYEnviar();
  }
})();