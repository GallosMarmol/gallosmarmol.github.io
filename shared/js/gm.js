// shared/js/gm.js
// Puente para que los módulos ES puedan importar GM.
// Este archivo asume que shared.js ya se cargó como script clásico
// (y por tanto window.GM existe).

if (typeof window === 'undefined' || !window.GM) {
  throw new Error('[gm.js] shared.js no se ha cargado. Añade <script src="/shared/js/shared.js"></script> antes de este módulo.');
}

export const GM = window.GM;
export default GM;