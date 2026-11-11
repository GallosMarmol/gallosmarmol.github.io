/* ============================================================
   GALLOS MÁRMOL — motor genérico de páginas de listado
   Usado por la mayoría de páginas internas: lee window.DB[dbKey],
   pinta tabla + toolbar + modal "Nuevo registro" (100% cliente,
   para la demo). Cada página solo declara columnas y campos.
   ============================================================ */

function gmListPagePrueba(opts){
  const {
    portal, active, title, crumb,
    dbKey, columns, searchPlaceholder, addFields, addLabel, idField,
    subtitle, base
  } = opts;

  gmRenderShell({portal, active, title, crumb, base});

  const content = document.getElementById('gm-content');
  const rows = window.DB[dbKey] || [];

  const modalId = 'modal-' + dbKey;
  const fieldsHtml = (addFields||[]).map(f => `
    <div class="field">
      <label>${f.label}</label>
      ${f.type==='select'
        ? `<select class="input" id="fld-${f.key}">${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}</select>`
        : `<input class="input" id="fld-${f.key}" type="${f.type||'text'}" placeholder="${f.placeholder||''}">`
      }
    </div>`).join('');

  content.innerHTML = `
    ${subtitle ? `<p style="color:var(--text-muted);margin:-10px 0 18px;max-width:640px;">${subtitle}</p>` : ''}
    <div class="toolbar">
      <input class="input" id="gm-search" placeholder="${searchPlaceholder || 'Buscar…'}" oninput="GM.filterTable(this, '#gm-table')">
      <span style="flex:1"></span>
      <span style="font-size:12.5px;color:var(--text-muted)" id="gm-count"></span>
      ${addFields ? `<button class="btn btn-gold btn-sm" onclick="GM.openModal('${modalId}')">+ ${addLabel || 'Nuevo'}</button>` : ''}
    </div>
    <div class="panel">
      <table class="data-table" id="gm-table">
        <thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody id="gm-tbody"></tbody>
      </table>
      <div class="empty-state" id="gm-empty" style="display:none;">
        <div class="glyph">◇</div>
        Sin resultados para tu búsqueda.
      </div>
    </div>
    ${addFields ? `
    <div class="modal-backdrop" id="${modalId}">
      <div class="modal">
        <div class="modal-header">
          <h3>${addLabel || 'Nuevo registro'}</h3>
          <span class="modal-close" onclick="GM.closeModal('${modalId}')">&times;</span>
        </div>
        <div class="modal-body">${fieldsHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="GM.closeModal('${modalId}')">Cancelar</button>
          <button class="btn btn-primary" onclick="gmAddRecord('${dbKey}', ${JSON.stringify(addFields.map(f=>f.key))}, '${modalId}', '${idField||''}')">Guardar</button>
        </div>
      </div>
    </div>` : ''}
  `;

  window._gmRenderRows = function(){
    const tbody = document.getElementById('gm-tbody');
    const data = window.DB[dbKey] || [];
    document.getElementById('gm-count').textContent = data.length + ' registro(s)';
    if(data.length === 0){
      tbody.innerHTML = '';
      document.getElementById('gm-empty').style.display = 'block';
      return;
    }
    document.getElementById('gm-empty').style.display = 'none';
    tbody.innerHTML = data.map(row => `<tr>${
      columns.map(c => `<td class="${c.mono?'mono':''}">${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('')
    }</tr>`).join('');
  };
  window._gmRenderRows();
}

function gmAddRecord(dbKey, keys, modalId, idField){
  const rec = {};
  keys.forEach(k => { rec[k] = document.getElementById('fld-'+k).value; });
  if(idField){
    const n = (window.DB[dbKey]||[]).length + 1;
    rec[idField] = idField.toUpperCase().slice(0,3) + '-' + String(1000+n);
  }
  window.DB[dbKey] = window.DB[dbKey] || [];
  window.DB[dbKey].unshift(rec);
  window._gmRenderRows();
  GM.closeModal(modalId);
  GM.toast('Registro guardado (demo: solo en esta sesión).');
}


// ============================================================
// GALLOS MÁRMOL — Motor de listados (mock + Supabase)
// Soporta: paginación, búsqueda, filtros, CRUD, cascada
// ============================================================

import { supabase } from './supabase-client.js';

export function gmListPage(opts) {
    const {
        portal, active, title, crumb, base,
        dbKey,
        dataSource = 'mock',
        table,
        selectQuery = '*',
        searchPlaceholder,
        subtitle,
        idField,
        addLabel,
        addFields,
        columns,
        filters: extraFilters = [],
        searchFields = [],
        orderBy = 'creado_en',
        orderDirection = 'desc'
    } = opts;

    // Renderizar shell
    if (typeof gmRenderShell === 'function') {
        gmRenderShell({ portal, active, title, crumb, base });
    } else if (typeof adminRenderShell === 'function') {
        adminRenderShell({ active, title, crumb });
    }

    const content = document.getElementById('gm-content');
    if (!content) return;

    // ============================================================
    // ESTADO INTERNO
    // ============================================================
    let datos = [];
    let datosFiltrados = [];
    let filtrosActivos = { buscar: '', estado: '', categoria: '' };
    let cacheMaestros = {
        categorias: [],
        subcategorias: [],
        marcas: [],
        areas: [],
        ubicaciones: [],
        empleados: []
    };

    // ============================================================
    // MODAL ID
    // ============================================================
    const modalId = 'modal-' + (dbKey || table || 'nuevo');

    // ============================================================
    // GENERAR HTML DE CAMPOS
    // ============================================================
    const fieldsHtml = (addFields || []).map(f => {
        // Select en cascada (categoría → subcategoría)
        if (f.type === 'select-cascade') {
            return `
                <div class="field" style="grid-column: span ${f.fullWidth ? 2 : 1};">
                    <label>${f.label}</label>
                    <select class="input" id="fld-${f.key}" data-cascade="${f.cascade}" ${f.disabled ? 'disabled' : ''}>
                        <option value="">Selecciona ${f.parentLabel || 'primero'}...</option>
                    </select>
                    <div class="field-error-msg" id="err-fld-${f.key}"></div>
                </div>
            `;
        }
        
        // Select normal
        if (f.type === 'select') {
            return `
                <div class="field" style="grid-column: span ${f.fullWidth ? 2 : 1};">
                    <label>${f.label}</label>
                    <select class="input" id="fld-${f.key}">
                        <option value="">${f.placeholder || 'Seleccionar...'}</option>
                        ${(f.options || []).map(o => 
                            typeof o === 'object' 
                                ? `<option value="${o.value}">${o.label}</option>`
                                : `<option value="${o}">${o}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
        
        // Textarea
        if (f.type === 'textarea') {
            return `
                <div class="field" style="grid-column: span 2;">
                    <label>${f.label}</label>
                    <textarea class="input" id="fld-${f.key}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}"></textarea>
                </div>
            `;
        }
        
        // Input normal
        return `
            <div class="field" style="grid-column: span ${f.fullWidth ? 2 : 1};">
                <label>${f.label}</label>
                <input class="input" id="fld-${f.key}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" ${f.step ? `step="${f.step}"` : ''}>
                <div class="field-error-msg" id="err-fld-${f.key}"></div>
            </div>
        `;
    }).join('');

    // ============================================================
    // RENDERIZAR PÁGINA
    // ============================================================
    content.innerHTML = `
        ${subtitle ? `<p style="color:var(--text-muted);margin:-10px 0 18px;max-width:720px;">${subtitle}</p>` : ''}
        
        <div class="toolbar" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">
            <input class="input" id="gm-search" placeholder="${searchPlaceholder || 'Buscar…'}" style="max-width:300px;">
            <span style="flex:1"></span>
            <span style="font-size:12.5px;color:var(--text-muted)" id="gm-count"></span>
            ${addFields ? `<button class="btn btn-gold btn-sm" onclick="GM.openModal('${modalId}')">+ ${addLabel || 'Nuevo'}</button>` : ''}
        </div>
        
        <div class="panel">
            <table class="data-table" id="gm-table">
                <thead>
                    <tr>
                        ${columns.map(c => `<th>${c.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody id="gm-tbody"></tbody>
            </table>
            <div class="empty-state" id="gm-empty" style="display:none;">
                <div class="glyph">◇</div>
                Sin resultados.
            </div>
        </div>
        
        ${addFields ? `
        <div class="modal-backdrop" id="${modalId}">
            <div class="modal">
                <div class="modal-header">
                    <h3>${addLabel || 'Nuevo registro'}</h3>
                    <span class="modal-close" onclick="GM.closeModal('${modalId}')">&times;</span>
                </div>
                <div class="modal-body">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        ${fieldsHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="GM.closeModal('${modalId}')">Cancelar</button>
                    <button class="btn btn-primary" id="btn-guardar-${modalId}" onclick="gmGuardarRegistro('${modalId}')">Guardar</button>
                </div>
            </div>
        </div>` : ''}
    `;

    // ============================================================
    // CARGAR DATOS
    // ============================================================
    async function cargarDatos() {
        try {
            if (dataSource === 'supabase') {
                // Cargar datos maestros si hay campos en cascada o selects con FK
                const selectsConFK = (addFields || []).filter(f => f.type === 'select-fk');
                const selectsCascada = (addFields || []).filter(f => f.type === 'select-cascade');
                
                if (selectsConFK.length > 0 || selectsCascada.length > 0) {
                    await cargarMaestros();
                }
                
                // Cargar datos de la tabla principal
                const { data, error } = await supabase
                    .from(table || dbKey)
                    .select(selectQuery)
                    .order(orderBy, { ascending: orderDirection === 'asc' });
                
                if (error) throw error;
                datos = data || [];
            } else {
                // Modo mock
                datos = window.DB[dbKey] || [];
            }
            
            datosFiltrados = [...datos];
            renderTabla();
        } catch (error) {
            console.error('Error cargando datos:', error);
            document.getElementById('gm-tbody').innerHTML = `
                <tr><td colspan="${columns.length}" style="text-align:center; padding:40px; color:var(--danger);">
                    ⚠️ Error al cargar datos: ${error.message}
                </td></tr>
            `;
        }
    }

    // ============================================================
    // CARGAR MAESTROS (para selects con FK)
    // ============================================================
    async function cargarMaestros() {
        const selectsFK = (addFields || []).filter(f => f.type === 'select-fk');
        const selectsCascada = (addFields || []).filter(f => f.type === 'select-cascade');
        
        const tablasMaestras = new Set();
        selectsFK.forEach(f => tablasMaestras.add(f.table));
        selectsCascada.forEach(f => tablasMaestras.add(f.table));
        
        // Cargar cada tabla maestra
        for (const tabla of tablasMaestras) {
            try {
                const { data } = await supabase
                    .from(tabla)
                    .select('id, nombre')
                    .eq('activo', true)
                    .order('orden', { ascending: true, nullsFirst: false })
                    .order('nombre');
                
                const key = tabla.replace(/_/g, '');
                cacheMaestros[key] = data || [];
            } catch (e) {
                console.warn(`No se pudo cargar ${tabla}:`, e);
            }
        }
        
        // Cargar subcategorías (para cascada)
        if (selectsCascada.length > 0) {
            const { data: subs } = await supabase
                .from('subcategorias_activos')
                .select('id, nombre, categoria_id')
                .eq('activo', true)
                .order('orden');
            cacheMaestros.subcategorias = subs || [];
        }
        
        // Cargar empleados (con JOIN a personas)
        if (selectsFK.some(f => f.table === 'empleados')) {
            const { data: emps } = await supabase
                .from('empleados')
                .select(`
                    id, codigo_empleado, cargo,
                    usuario:usuario_id(
                        persona:persona_id(nombre, apellido)
                    )
                `)
                .eq('activo', true);
            
            cacheMaestros.empleados = (emps || []).map(e => ({
                id: e.id,
                nombre: `${e.usuario?.persona?.nombre || ''} ${e.usuario?.persona?.apellido || ''}`.trim() || 'Sin nombre',
                cargo: e.cargo,
                codigo: e.codigo_empleado
            }));
        }
        
        // Llenar selects con FK
        selectsFK.forEach(f => {
            const select = document.getElementById('fld-' + f.key);
            if (!select) return;
            
            const key = f.table.replace(/_/g, '');
            const items = cacheMaestros[key] || [];
            
            select.innerHTML = `
                <option value="">${f.placeholder || 'Seleccionar...'}</option>
                ${items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('')}
            `;
        });
        
        // Configurar cascada
        selectsCascada.forEach(f => {
            const selectPadre = document.getElementById('fld-' + f.cascade);
            const selectHijo = document.getElementById('fld-' + f.key);
            if (!selectPadre || !selectHijo) return;
            
            selectPadre.addEventListener('change', () => {
                const categoriaId = selectPadre.value;
                const subsFiltradas = cacheMaestros.subcategorias.filter(s => s.categoria_id === categoriaId);
                
                selectHijo.innerHTML = `
                    <option value="">${f.placeholder || 'Seleccionar...'}</option>
                    ${subsFiltradas.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                `;
                selectHijo.disabled = false;
            });
        });
    }

    // ============================================================
    // RENDERIZAR TABLA
    // ============================================================
    function renderTabla() {
        const tbody = document.getElementById('gm-tbody');
        const emptyEl = document.getElementById('gm-empty');
        const countEl = document.getElementById('gm-count');
        
        if (countEl) countEl.textContent = datosFiltrados.length + ' registro(s)';
        
        if (datosFiltrados.length === 0) {
            tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        
        if (emptyEl) emptyEl.style.display = 'none';
        
        tbody.innerHTML = datosFiltrados.map(row => {
            return '<tr>' + columns.map(c => {
                let valor;
                if (c.render) {
                    valor = c.render(row);
                } else {
                    valor = row[c.key] ?? '—';
                }
                return `<td class="${c.mono ? 'mono' : ''}">${valor}</td>`;
            }).join('') + '</tr>';
        }).join('');
    }

    // ============================================================
    // BUSCADOR
    // ============================================================
    const searchInput = document.getElementById('gm-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            filtrosActivos.buscar = searchInput.value.trim().toLowerCase();
            
            if (dataSource === 'supabase' && searchFields.length > 0) {
                // Búsqueda server-side
                buscarSupabase();
            } else {
                // Búsqueda client-side
                aplicarFiltros();
            }
        }, 300));
    }

    async function buscarSupabase() {
        const q = filtrosActivos.buscar;
        if (!q) {
            await cargarDatos();
            return;
        }
        
        try {
            const orQuery = searchFields.map(f => `${f}.ilike.%${q}%`).join(',');
            const { data, error } = await supabase
                .from(table || dbKey)
                .select(selectQuery)
                .or(orQuery)
                .order(orderBy, { ascending: orderDirection === 'asc' });
            
            if (error) throw error;
            datosFiltrados = data || [];
            renderTabla();
        } catch (error) {
            console.error('Error buscando:', error);
        }
    }

    function aplicarFiltros() {
        const q = filtrosActivos.buscar;
        datosFiltrados = datos.filter(row => {
            if (!q) return true;
            const texto = Object.values(row).join(' ').toLowerCase();
            return texto.includes(q);
        });
        renderTabla();
    }

    // ============================================================
    // GUARDAR REGISTRO
    // ============================================================
    window.gmGuardarRegistro = async function(modalId) {
        const btn = document.getElementById('btn-guardar-' + modalId);
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        
        try {
            const nuevoRegistro = {};
            
            (addFields || []).forEach(f => {
                const input = document.getElementById('fld-' + f.key);
                if (!input) return;
                
                let valor = input.value.trim();
                
                // Convertir tipos
                if (f.type === 'number' && valor !== '') {
                    valor = parseFloat(valor);
                } else if (valor === '') {
                    valor = null;
                }
                
                nuevoRegistro[f.key] = valor;
            });
            
            if (dataSource === 'supabase') {
                const { error } = await supabase.from(table || dbKey).insert([nuevoRegistro]);
                if (error) throw error;
            } else {
                if (idField) {
                    const n = (window.DB[dbKey] || []).length + 1;
                    nuevoRegistro[idField] = idField.toUpperCase().slice(0, 3) + '-' + String(1000 + n);
                }
                window.DB[dbKey] = window.DB[dbKey] || [];
                window.DB[dbKey].unshift(nuevoRegistro);
            }
            
            GM.closeModal(modalId);
            GM.toast('✅ Registro guardado');
            await cargarDatos();
            
        } catch (error) {
            console.error('Error guardando:', error);
            GM.toast('❌ Error: ' + error.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
        }
    };

    // ============================================================
    // DEBOUNCE
    // ============================================================
    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // ============================================================
    // INICIALIZAR
    // ============================================================
    cargarDatos();
}