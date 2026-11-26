/* ============================================================
   GALLOS MÁRMOL — utilidades compartidas (UI)
   ============================================================ */
const GM = { 
  soles(n){
    return 'S/ ' + Number(n||0).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
  },
  num(n){ return Number(n||0).toLocaleString('es-PE'); },
  initials(name){
    return (name||'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  },
  badge(text, tone){
    return `<span class="badge ${tone}">${text}</span>`;
  },
  toggleSidebar(){
    document.querySelector('.app-sidebar')?.classList.toggle('open');
  },
  openModal(id){ document.getElementById(id)?.classList.add('open'); },
  closeModal(id){ document.getElementById(id)?.classList.remove('open'); },
  toast(msg){
    let el = document.getElementById('gm-toast');
    if(!el){
      el = document.createElement('div');
      el.id = 'gm-toast';
      el.style.cssText = 'position:fixed;bottom:22px;right:22px;background:#161513;color:#f4f1ea;padding:12px 18px;border-radius:4px;font-size:13.5px;z-index:100;border-left:3px solid #161513;opacity:0;transition:opacity .2s ease;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(()=>{ el.style.opacity = '1'; });
    clearTimeout(el._t);
    el._t = setTimeout(()=>{ el.style.opacity = '0'; }, 2600);
  },
  estadoTone(estado){
    const map = {
      'Operativo':'green','Óptimo':'green','Activo':'green','Aprobada':'green','Pagado':'green','Entregado':'green','Cerrado':'green','Resuelto':'green','Convertido':'green','Recibido':'green',
      'En mantenimiento':'amber','Programado':'amber','Enviada':'amber','En negociación':'amber','En preparación':'amber','En ruta':'amber','Atendiendo':'amber','Parcial':'amber','Contactado':'amber','Bajo mínimo':'amber','Pendiente':'amber','En diagnóstico':'amber','En reparación':'amber',
      'De baja':'red','Crítico':'red','Rechazada':'red','Descartado':'red','Inactivo':'red',
      'Nuevo':'blue','Calificado':'blue','Despachado':'blue',
    };
    return map[estado] || 'gray';
  },
  filterTable(inputEl, tableSelector){
    const q = inputEl.value.trim().toLowerCase();
    document.querySelectorAll(tableSelector + ' tbody tr').forEach(tr=>{
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
};

// cierra modal al click en backdrop
document.addEventListener('click', (e)=>{
  if(e.target.classList && e.target.classList.contains('modal-backdrop')){
    e.target.classList.remove('open');
  }
});

if (typeof window !== 'undefined') {
  window.GM = GM;
}