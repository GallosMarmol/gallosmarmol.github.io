// ==================== CONFIGURACIÓN SUPABASE ====================
const SUPABASE_URL = 'https://fzdwqkoporxnzvhpmlls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZHdxa29wb3J4bnp2aHBtbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDkxMDYsImV4cCI6MjA3NzM4NTEwNn0.nOS3oByMmopchYhH0Kv1I0lxi02VkqfsC-eGFTZ_ePg';

// Inicializar cliente Supabase
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIABLES GLOBALES ====================
let usuarioActual = null;
let vistaActual = 'dashboard';
let editandoId = null;
let intentosFallidos = 0;
let timeoutInactividad = null;
const MAX_INTENTOS = 3;
const TIEMPO_INACTIVIDAD = 10 * 60 * 1000;

// ==================== VARIABLES GLOBALES PARA REPORTES ====================
let reportesDataCache = {
    activos: null,
    asignaciones: null,
    mantenimientos: null,
    software: null,
    licencias: null,
    empleados: null
};

// Variable global para controlar el estado de los modales
window.modalEstado = {
    abriendo: false,
    cerrando: false,
    timeout: null
};

// Mapa de colores para estados (usado en reportes)
const estadoMap = {
    'DISPONIBLE': { bg: '#dcfce7', color: '#166534' },
    'ASIGNADO': { bg: '#dbeafe', color: '#1e40af' },
    'MANTENIMIENTO': { bg: '#f3e8ff', color: '#6b21a8' },
    'REPARACIÓN': { bg: '#fed7aa', color: '#9a3412' },
    'BAJA': { bg: '#fee2e2', color: '#991b1b' },
    'RESERVADO': { bg: '#cffafe', color: '#0e7490' },
    'PRÉSTAMO': { bg: '#ccfbf1', color: '#0f766e' }
};