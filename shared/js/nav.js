const GM_NAV = {
  ventas: {
    brand: "Ventas & CRM",
    root: "../",
    groups: [
      { label:"General", items:[
        {href:"../../ventas/dashboard.html", icon:"◈", label:"Dashboard", key:"dashboard"},
      ]},
      { label:"CRM", items:[
        {href:"../../ventas/leads.html", icon:"◇", label:"Leads", key:"leads"},
        {href:"../../ventas/clientes.html", icon:"◇", label:"Clientes", key:"clientes"},
        {href:"../../ventas/oportunidades.html", icon:"◇", label:"Oportunidades", key:"oportunidades"},
      ]},
      { label:"Ventas", items:[
        {href:"../../ventas/cotizaciones.html", icon:"▤", label:"Cotizaciones", key:"cotizaciones"},
        {href:"../../ventas/pedidos.html", icon:"▤", label:"Pedidos", key:"pedidos"},
        {href:"../../ventas/productos.html", icon:"▤", label:"Catálogo de productos", key:"productos"},
      ]},
      { label:"Análisis", items:[
        {href:"pages/reportes.html", icon:"▥", label:"Reportes", key:"reportes"},
      ]},
    ],
    user: {name:"Andrea Villar", role:"Jefa de Ventas"}
  },
  almacen: {
    brand: "Almacén & Logística",
    root: "../",
    groups: [
      { label:"General", items:[
        {href:"pages/dashboard.html", icon:"◈", label:"Dashboard", key:"dashboard"},
      ]},
      { label:"Inventario", items:[
        {href:"pages/productos.html", icon:"◇", label:"Productos", key:"productos"},
        {href:"pages/existencias.html", icon:"◇", label:"Existencias", key:"existencias"},
        {href:"pages/inventario-fisico.html", icon:"◇", label:"Inventario físico", key:"inventario-fisico"},
        {href:"pages/ubicaciones.html", icon:"◇", label:"Ubicaciones", key:"ubicaciones"},
      ]},
      { label:"Movimientos", items:[
        {href:"pages/entradas.html", icon:"▤", label:"Entradas", key:"entradas"},
        {href:"pages/salidas.html", icon:"▤", label:"Salidas", key:"salidas"},
        {href:"pages/transferencias.html", icon:"▤", label:"Transferencias", key:"transferencias"},
        {href:"pages/kardex.html", icon:"▤", label:"Kardex", key:"kardex"},
      ]},
      { label:"Despacho", items:[
        {href:"pages/reservas.html", icon:"▥", label:"Reservas", key:"reservas"},
        {href:"pages/despachos.html", icon:"▥", label:"Despachos", key:"despachos"},
      ]},
      { label:"Análisis", items:[
        {href:"pages/reportes.html", icon:"▥", label:"Reportes", key:"reportes"},
      ]},
    ],
    user: {name:"Jorge Quiroz", role:"Jefe de Almacén"}
  },
  admin: {
    brand: "Administración",
    root: "../",
    groups: [
      { label:"General", items:[
        {href:"pages/dashboard.html", icon:"◈", label:"Dashboard", key:"dashboard"},
      ]},
      { label:"Organización", items:[
        {href:"pages/organizacion/empresa.html", icon:"◇", label:"Empresa y sedes", key:"empresa"},
        {href:"pages/organizacion/areas.html", icon:"◇", label:"Áreas", key:"areas"},
        {href:"pages/organizacion/ubicaciones.html", icon:"◇", label:"Ubicaciones", key:"ubicaciones-org"},
      ]},
      { label:"Seguridad", items:[
        {href:"pages/seguridad/usuarios.html", icon:"◆", label:"Usuarios", key:"usuarios"},
        {href:"pages/seguridad/roles.html", icon:"◆", label:"Roles y permisos", key:"roles"},
      ]},
      { label:"Activos", items:[
        {href:"pages/activos/activos.html", icon:"▤", label:"Activos", key:"activos"},
        {href:"pages/activos/asignaciones.html", icon:"▤", label:"Asignaciones", key:"asignaciones"},
        {href:"pages/activos/movimientos.html", icon:"▤", label:"Movimientos", key:"movimientos"},
      ]},
      { label:"Mantenimiento", items:[
        {href:"pages/mantenimiento/mantenimiento.html", icon:"▥", label:"Órdenes de trabajo", key:"mantenimiento"},
      ]},
      { label:"Soporte", items:[
        {href:"pages/soporte/tickets.html", icon:"▥", label:"Tickets", key:"tickets"},
      ]},
      { label:"Software", items:[
        {href:"pages/software/software.html", icon:"▦", label:"Software y licencias", key:"software"},
      ]},
      { label:"Compras", items:[
        {href:"pages/compras/ordenes.html", icon:"▦", label:"Órdenes de compra", key:"ordenes"},
        {href:"pages/proveedores/proveedores.html", icon:"▦", label:"Proveedores", key:"proveedores"},
      ]},
      { label:"Control", items:[
        {href:"pages/reportes/reportes.html", icon:"▥", label:"Reportes", key:"reportes"},
        {href:"pages/auditoria/auditoria.html", icon:"▥", label:"Auditoría", key:"auditoria"},
        {href:"pages/configuracion/configuracion.html", icon:"▥", label:"Configuración", key:"configuracion"},
      ]},
    ],
    user: {name:"Renato Salcedo", role:"Administrador TI"}
  }
};

const PORTAL_SWITCH = [
  {key:"ventas", label:"Ventas & CRM"},
  {key:"almacen", label:"Almacén"},
  {key:"admin", label:"Administración"},
];

function gmRenderShell({portal, active, title, crumb, base}){
  const cfg = GM_NAV[portal];
  base = base || cfg.root;
  const groups = cfg.groups.map(g => `
    <div class="nav-group">
      <div class="nav-label">${g.label}</div>
      ${g.items.map(it => `
        <a class="nav-item ${it.key===active?'active':''}" href="${base}${it.href}">
          <span>${it.icon}</span><span>${it.label}</span>
        </a>`).join('')}
    </div>`).join('');

  const switcher = PORTAL_SWITCH.filter(p=>p.key!==portal).map(p=>
    `<a class="nav-item" href="${base}../${p.key}/index.html"><span class="dot"></span><span>Ir a ${p.label}</span></a>`
  ).join('');

  const sidebarHtml = `
    <div class="brand">
      <div class="mark">Gallos Mármol</div>
      <div class="sub">${cfg.brand}</div>
    </div>
    <nav>
      ${groups}
      <div class="nav-group">
        <div class="nav-label">Cambiar de portal</div>
        ${switcher}
        <a class="nav-item" href="${base}../public/index.html"><span class="dot"></span><span>Ver catálogo público</span></a>
      </div>
    </nav>
    <div class="user-box">
      <div class="avatar" style="margin-bottom:8px;">${GM.initials(cfg.user.name)}</div>
      <div class="name">${cfg.user.name}</div>
      <div>${cfg.user.role}</div>
      <a href="${base}login.html">Cerrar sesión</a>
    </div>`;

  const sidebar = document.getElementById('gm-sidebar');
  if(sidebar) sidebar.innerHTML = sidebarHtml;

  const topbar = document.getElementById('gm-topbar');
  if(topbar){
    topbar.innerHTML = `
      <div>
        <div class="crumb">${crumb || cfg.brand}</div>
        <h1>${title}</h1>
      </div>
      <div style="display:flex; align-items:center; gap:14px;">
        <button class="btn btn-ghost btn-sm" onclick="GM.toggleSidebar()" style="display:none" id="gm-burger">☰</button>
        <span style="font-size:13px;color:var(--text-muted)">${new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}</span>
      </div>`;
  }
}
