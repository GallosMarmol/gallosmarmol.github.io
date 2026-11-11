/* ============================================================
   GALLOS MÁRMOL — Fuente de datos central (demo)
   En producción esto seria reemplazado por llamadas a la API /
   base de datos real. Aquí vive en window.DB para que TODOS los
   portales (catálogo, ventas, almacén, admin) lean y escriban
   sobre la MISMA fuente, evitando duplicidad de información.
   ============================================================ */
(function(){

const DB = {

  empresa: {
    nombre: "Gallos Mármol S.A.C.",
    ruc: "20601234567",
    sedes: ["Showroom Miraflores", "Planta Lurín", "Almacén Callao"]
  },

  areas: [
    {id:"AR-01", nombre:"TI", responsable:"Renato Salcedo"},
    {id:"AR-02", nombre:"Administración", responsable:"Carla Núñez"},
    {id:"AR-03", nombre:"Recursos Humanos", responsable:"Milagros Peña"},
    {id:"AR-04", nombre:"Marketing", responsable:"Diego Farfán"},
    {id:"AR-05", nombre:"Ventas", responsable:"Andrea Villar"},
    {id:"AR-06", nombre:"Almacén", responsable:"Jorge Quiroz"},
    {id:"AR-07", nombre:"Producción / Planta", responsable:"Hector Ramos"},
    {id:"AR-08", nombre:"Gerencia", responsable:"Fernando Gallos"}
  ],

  categorias: [
    {id:"CAT-01", nombre:"Mármol", slug:"marmol"},
    {id:"CAT-02", nombre:"Granito", slug:"granito"},
    {id:"CAT-03", nombre:"Cuarzo", slug:"cuarzo"},
    {id:"CAT-04", nombre:"Travertino", slug:"travertino"},
    {id:"CAT-05", nombre:"Porcelanato", slug:"porcelanato"},
    {id:"CAT-06", nombre:"Revestimientos", slug:"revestimientos"},
    {id:"CAT-07", nombre:"Molduras", slug:"molduras"},
    {id:"CAT-08", nombre:"Baldosas", slug:"baldosas"}
  ],

  /* ---------------- CATÁLOGO / PRODUCTOS ---------------- */
  productos: [
    {sku:"MAR-CAR-001", nombre:"Mármol Carrara Blanco", categoria:"Mármol", formato:"60x60 cm", espesor:"2 cm", acabado:"Pulido", origen:"Italia", precio:189.00, moneda:"PEN", unidad:"m²", stock:420, imagen:"marmol carrara blanco slab", destacado:true, linea:"catalogo"},
    {sku:"MAR-NEG-002", nombre:"Mármol Negro Marquina", categoria:"Mármol", formato:"60x120 cm", espesor:"2 cm", acabado:"Pulido", origen:"España", precio:245.00, moneda:"PEN", unidad:"m²", stock:180, imagen:"black marquina marble slab", destacado:true, linea:"catalogo"},
    {sku:"GRA-NEG-010", nombre:"Granito Negro Absoluto", categoria:"Granito", formato:"60x60 cm", espesor:"2 cm", acabado:"Pulido", origen:"India", precio:159.00, moneda:"PEN", unidad:"m²", stock:610, imagen:"absolute black granite slab", destacado:true, linea:"catalogo"},
    {sku:"GRA-BLA-011", nombre:"Granito Blanco Ceilán", categoria:"Granito", formato:"60x60 cm", espesor:"2 cm", acabado:"Pulido", origen:"Sri Lanka", precio:139.00, moneda:"PEN", unidad:"m²", stock:340, imagen:"ceylon white granite", destacado:false, linea:"catalogo"},
    {sku:"CUA-BLA-020", nombre:"Cuarzo Blanco Calacatta", categoria:"Cuarzo", formato:"320x160 cm", espesor:"2 cm", acabado:"Pulido", origen:"España", precio:299.00, moneda:"PEN", unidad:"m²", stock:95, imagen:"calacatta quartz slab", destacado:true, linea:"catalogo"},
    {sku:"CUA-GRI-021", nombre:"Cuarzo Gris Perla", categoria:"Cuarzo", formato:"320x160 cm", espesor:"2 cm", acabado:"Pulido", origen:"Perú", precio:265.00, moneda:"PEN", unidad:"m²", stock:120, imagen:"pearl gray quartz slab", destacado:false, linea:"catalogo"},
    {sku:"TRA-CLA-030", nombre:"Travertino Clásico Romano", categoria:"Travertino", formato:"40x60 cm", espesor:"1.2 cm", acabado:"Cepillado", origen:"Turquía", precio:99.00, moneda:"PEN", unidad:"m²", stock:530, imagen:"roman travertine tiles", destacado:true, linea:"catalogo"},
    {sku:"POR-GRI-040", nombre:"Porcelanato Concreto Gris", categoria:"Porcelanato", formato:"60x60 cm", espesor:"9 mm", acabado:"Mate", origen:"Perú", precio:79.00, moneda:"PEN", unidad:"m²", stock:1200, imagen:"gray concrete porcelain tile", destacado:false, linea:"catalogo"},
    {sku:"MOL-COR-050", nombre:"Moldura Corona Clásica", categoria:"Molduras", formato:"3m", espesor:"—", acabado:"Pulido", origen:"Perú", precio:45.00, moneda:"PEN", unidad:"ml", stock:260, imagen:"classic marble crown molding", destacado:false, linea:"catalogo"},
    {sku:"BAL-HID-060", nombre:"Baldosa Hidráulica Geométrica", categoria:"Baldosas", formato:"20x20 cm", espesor:"1.5 cm", acabado:"Mate", origen:"Perú", precio:69.00, moneda:"PEN", unidad:"m²", stock:410, imagen:"geometric hydraulic tile pattern", destacado:true, linea:"catalogo"},

    /* Outlet */
    {sku:"OUT-MAR-101", nombre:"Mármol Beige Botticino (Lote Outlet)", categoria:"Mármol", formato:"60x60 cm", espesor:"2 cm", acabado:"Pulido", origen:"Italia", precio:99.00, precioAnterior:189.00, moneda:"PEN", unidad:"m²", stock:38, imagen:"beige botticino marble tile", destacado:false, linea:"outlet", motivo:"Saldo de lote"},
    {sku:"OUT-GRA-102", nombre:"Granito Café Imperial (Lote Outlet)", categoria:"Granito", formato:"60x60 cm", espesor:"2 cm", acabado:"Pulido", origen:"India", precio:79.00, precioAnterior:149.00, moneda:"PEN", unidad:"m²", stock:22, imagen:"brown imperial granite tile", destacado:false, linea:"outlet", motivo:"Fin de línea"},
    {sku:"OUT-POR-103", nombre:"Porcelanato Símil Madera (Lote Outlet)", categoria:"Porcelanato", formato:"20x120 cm", espesor:"9 mm", acabado:"Mate", origen:"Perú", precio:39.00, precioAnterior:69.00, moneda:"PEN", unidad:"m²", stock:64, imagen:"wood look porcelain plank tile", destacado:false, linea:"outlet", motivo:"Devolución de obra"},

    /* Excedentes de exportación */
    {sku:"EXP-MAR-201", nombre:"Retazos Mármol Carrara (Excedente Exportación)", categoria:"Mármol", formato:"Piezas 30-80 cm", espesor:"2 cm", acabado:"Pulido", origen:"Italia", precio:59.00, moneda:"PEN", unidad:"m²", stock:15, imagen:"marble offcuts export surplus", destacado:false, linea:"excedente", motivo:"Excedente de contenedor EXP-2026-014"},
    {sku:"EXP-CUA-202", nombre:"Retazos Cuarzo Calacatta (Excedente Exportación)", categoria:"Cuarzo", formato:"Piezas 40-100 cm", espesor:"2 cm", acabado:"Pulido", origen:"España", precio:129.00, moneda:"PEN", unidad:"m²", stock:9, imagen:"quartz offcuts surplus pieces", destacado:false, linea:"excedente", motivo:"Excedente de contenedor EXP-2026-021"}
  ],

  /* ---------------- CRM / VENTAS ---------------- */
  leads: [
    {id:"LEAD-0031", nombre:"Arq. Valeria Chumpitaz", empresa:"Estudio VC Arquitectos", origen:"Catálogo web", producto:"Cuarzo Blanco Calacatta", telefono:"+51 987 234 112", email:"valeria@vcarquitectos.pe", fecha:"2026-08-27", estado:"Nuevo", vendedor:"Andrea Villar"},
    {id:"LEAD-0030", nombre:"Marco Untiveros", empresa:"Constructora Untiveros SAC", origen:"Outlet", producto:"Granito Café Imperial (Outlet)", telefono:"+51 998 112 004", email:"marco.untiveros@gmail.com", fecha:"2026-08-26", estado:"Contactado", vendedor:"Luis Bernal"},
    {id:"LEAD-0029", nombre:"Rosa Elguera", empresa:"—", origen:"Catálogo web", producto:"Porcelanato Concreto Gris", telefono:"+51 944 553 210", email:"rosa.elguera@hotmail.com", fecha:"2026-08-25", estado:"Calificado", vendedor:"Andrea Villar"},
    {id:"LEAD-0028", nombre:"Ing. Paolo Rospigliosi", empresa:"Grupo Rospigliosi Inmobiliaria", origen:"Referido", producto:"Mármol Negro Marquina", telefono:"+51 976 220 887", email:"p.rospigliosi@grupori.pe", fecha:"2026-08-24", estado:"Convertido", vendedor:"Luis Bernal"},
    {id:"LEAD-0027", nombre:"Sofía Bazán", empresa:"Bazán Diseño de Interiores", origen:"Instagram", producto:"Baldosa Hidráulica Geométrica", telefono:"+51 955 001 337", email:"sofia@bazandiseno.com", fecha:"2026-08-22", estado:"Descartado", vendedor:"Andrea Villar"}
  ],

  clientes: [
    {id:"CLI-0110", nombre:"Grupo Rospigliosi Inmobiliaria", tipo:"Empresa", ruc:"20512334211", contacto:"Ing. Paolo Rospigliosi", telefono:"+51 976 220 887", email:"p.rospigliosi@grupori.pe", sede:"San Isidro, Lima", totalComprado:184500, ultimaCompra:"2026-08-20", estado:"Activo"},
    {id:"CLI-0109", nombre:"Estudio VC Arquitectos", tipo:"Empresa", ruc:"20609981223", contacto:"Arq. Valeria Chumpitaz", telefono:"+51 987 234 112", email:"valeria@vcarquitectos.pe", sede:"Miraflores, Lima", totalComprado:52300, ultimaCompra:"2026-07-30", estado:"Activo"},
    {id:"CLI-0108", nombre:"Constructora Zañartu S.A.", tipo:"Empresa", ruc:"20601122093", contacto:"Renzo Zañartu", telefono:"+51 966 004 552", email:"rzanartu@zanartu.pe", sede:"Surco, Lima", totalComprado:398200, ultimaCompra:"2026-08-15", estado:"Activo"},
    {id:"CLI-0107", nombre:"María Elena Cárdenas", tipo:"Persona natural", ruc:"—", contacto:"María Elena Cárdenas", telefono:"+51 999 452 118", email:"mecardenas@gmail.com", sede:"La Molina, Lima", totalComprado:8100, ultimaCompra:"2026-06-02", estado:"Inactivo"}
  ],

  cotizaciones: [
    {id:"COT-2026-0184", cliente:"Grupo Rospigliosi Inmobiliaria", vendedor:"Luis Bernal", fecha:"2026-08-24", validez:"15 días", items:[{producto:"Mármol Negro Marquina", cantidad:120, unidad:"m²", precio:245}], total:29400, estado:"Aprobada"},
    {id:"COT-2026-0185", cliente:"Estudio VC Arquitectos", vendedor:"Andrea Villar", fecha:"2026-08-27", validez:"10 días", items:[{producto:"Cuarzo Blanco Calacatta", cantidad:38, unidad:"m²", precio:299}], total:11362, estado:"Enviada"},
    {id:"COT-2026-0186", cliente:"Constructora Zañartu S.A.", vendedor:"Luis Bernal", fecha:"2026-08-21", validez:"15 días", items:[{producto:"Porcelanato Concreto Gris", cantidad:640, unidad:"m²", precio:79}], total:50560, estado:"En negociación"},
    {id:"COT-2026-0187", cliente:"Rosa Elguera", vendedor:"Andrea Villar", fecha:"2026-08-25", validez:"7 días", items:[{producto:"Porcelanato Concreto Gris", cantidad:22, unidad:"m²", precio:79}], total:1738, estado:"Rechazada"}
  ],

  pedidos: [
    {id:"PED-2026-0912", cliente:"Grupo Rospigliosi Inmobiliaria", cotizacion:"COT-2026-0184", fecha:"2026-08-25", entregaEstimada:"2026-09-05", total:29400, estadoPago:"Pagado", estadoLogistico:"En preparación"},
    {id:"PED-2026-0911", cliente:"Constructora Zañartu S.A.", cotizacion:"—", fecha:"2026-08-18", entregaEstimada:"2026-08-30", total:398200, estadoPago:"Parcial", estadoLogistico:"Despachado"},
    {id:"PED-2026-0910", cliente:"María Elena Cárdenas", cotizacion:"—", fecha:"2026-08-01", entregaEstimada:"2026-08-10", total:8100, estadoPago:"Pagado", estadoLogistico:"Entregado"}
  ],

  /* ---------------- ALMACÉN ---------------- */
  almacenes: [
    {id:"ALM-01", nombre:"Almacén Central Callao"},
    {id:"ALM-02", nombre:"Showroom Miraflores"},
    {id:"ALM-03", nombre:"Planta Lurín"}
  ],

  existencias: [
    {sku:"MAR-CAR-001", producto:"Mármol Carrara Blanco", almacen:"Almacén Central Callao", ubicacion:"Rack A-03", cantidad:320, unidad:"m²", minimo:100, estado:"Óptimo"},
    {sku:"MAR-NEG-002", producto:"Mármol Negro Marquina", almacen:"Almacén Central Callao", ubicacion:"Rack A-07", cantidad:60, unidad:"m²", minimo:80, estado:"Bajo mínimo"},
    {sku:"GRA-NEG-010", producto:"Granito Negro Absoluto", almacen:"Planta Lurín", ubicacion:"Rack B-02", cantidad:610, unidad:"m²", minimo:150, estado:"Óptimo"},
    {sku:"CUA-BLA-020", producto:"Cuarzo Blanco Calacatta", almacen:"Almacén Central Callao", ubicacion:"Rack C-01", cantidad:35, unidad:"m²", minimo:50, estado:"Crítico"},
    {sku:"TRA-CLA-030", producto:"Travertino Clásico Romano", almacen:"Planta Lurín", ubicacion:"Rack D-05", cantidad:530, unidad:"m²", minimo:120, estado:"Óptimo"},
    {sku:"POR-GRI-040", producto:"Porcelanato Concreto Gris", almacen:"Almacén Central Callao", ubicacion:"Rack E-11", cantidad:1200, unidad:"m²", minimo:300, estado:"Óptimo"},
    {sku:"BAL-HID-060", producto:"Baldosa Hidráulica Geométrica", almacen:"Showroom Miraflores", ubicacion:"Vitrina 2", cantidad:40, unidad:"m²", minimo:30, estado:"Óptimo"}
  ],

  kardex: [
    {fecha:"2026-08-28 09:12", sku:"MAR-CAR-001", producto:"Mármol Carrara Blanco", tipo:"Entrada", cantidad:150, saldo:320, documento:"OC-2026-441", usuario:"Jorge Quiroz"},
    {fecha:"2026-08-27 15:40", sku:"MAR-NEG-002", producto:"Mármol Negro Marquina", tipo:"Salida", cantidad:-120, saldo:60, documento:"PED-2026-0912", usuario:"Katia Ruiz"},
    {fecha:"2026-08-26 11:05", sku:"CUA-BLA-020", producto:"Cuarzo Blanco Calacatta", tipo:"Salida", cantidad:-38, saldo:35, documento:"COT-2026-0185", usuario:"Katia Ruiz"},
    {fecha:"2026-08-24 08:30", sku:"POR-GRI-040", producto:"Porcelanato Concreto Gris", tipo:"Entrada", cantidad:400, saldo:1200, documento:"OC-2026-438", usuario:"Jorge Quiroz"},
    {fecha:"2026-08-20 14:02", sku:"TRA-CLA-030", producto:"Travertino Clásico Romano", tipo:"Transferencia", cantidad:80, saldo:530, documento:"TRF-2026-089", usuario:"Renzo Ibarra"}
  ],

  despachos: [
    {id:"DES-2026-0341", pedido:"PED-2026-0911", cliente:"Constructora Zañartu S.A.", fecha:"2026-08-22", transportista:"Transportes Amazonas", destino:"Surco, Lima", estado:"En ruta"},
    {id:"DES-2026-0340", pedido:"PED-2026-0910", cliente:"María Elena Cárdenas", fecha:"2026-08-09", transportista:"Flota propia", destino:"La Molina, Lima", estado:"Entregado"},
    {id:"DES-2026-0342", pedido:"PED-2026-0912", cliente:"Grupo Rospigliosi Inmobiliaria", fecha:"2026-09-04", transportista:"Por asignar", destino:"San Isidro, Lima", estado:"Programado"}
  ],

  /* ---------------- ACTIVOS / TI (Admin) ---------------- */
  activos: [
    {codigo:"ACT-00152", nombre:"Laptop Lenovo ThinkPad T14", categoria:"Computadoras", marca:"Lenovo", modelo:"ThinkPad T14", serie:"PF3XJ221", area:"Marketing", responsable:"Diego Farfán", ubicacion:"Oficina Marketing", estado:"Operativo", garantiaVence:"2027-02-10", valorAdquisicion:4200},
    {codigo:"ACT-00098", nombre:"Monitor Dell 27\"", categoria:"Monitores", marca:"Dell", modelo:"P2723DE", serie:"DL7729KK", area:"TI", responsable:"Renato Salcedo", ubicacion:"Oficina TI", estado:"Operativo", garantiaVence:"2026-11-02", valorAdquisicion:1150},
    {codigo:"ACT-00204", nombre:"Impresora HP LaserJet", categoria:"Impresoras", marca:"HP", modelo:"M428fdw", serie:"HP99213A", area:"Administración", responsable:"Carla Núñez", ubicacion:"Recepción", estado:"En mantenimiento", garantiaVence:"2026-09-30", valorAdquisicion:2300},
    {codigo:"ACT-00061", nombre:"Cámara CCTV Domo", categoria:"Cámaras CCTV", marca:"Hikvision", modelo:"DS-2CE56", serie:"HK220091", area:"Seguridad", responsable:"Jorge Quiroz", ubicacion:"Almacén Callao - Ingreso", estado:"Operativo", garantiaVence:"2027-05-18", valorAdquisicion:680},
    {codigo:"ACT-00177", nombre:"Silla Ergonómica Gerencial", categoria:"Sillas", marca:"Herman Miller", modelo:"Aeron", serie:"—", area:"Gerencia", responsable:"Fernando Gallos", ubicacion:"Oficina Gerencia", estado:"Operativo", garantiaVence:"2029-01-01", valorAdquisicion:3900},
    {codigo:"ACT-00033", nombre:"UPS APC 1500VA", categoria:"UPS", marca:"APC", modelo:"BX1500", serie:"APC55201", area:"TI", responsable:"Renato Salcedo", ubicacion:"Data Center", estado:"De baja", garantiaVence:"2025-01-15", valorAdquisicion:850}
  ],

  movimientosActivos: [
    {fecha:"2026-08-28 10:15", activo:"ACT-00152", tipo:"Asignación", origen:"Almacén TI", destino:"Diego Farfán / Marketing", usuario:"Renato Salcedo"},
    {fecha:"2026-08-20 09:00", activo:"ACT-00204", tipo:"Mantenimiento", origen:"Recepción", destino:"Taller externo", usuario:"Renato Salcedo"},
    {fecha:"2026-08-11 16:40", activo:"ACT-00033", tipo:"Baja", origen:"Data Center", destino:"Destrucción certificada", usuario:"Renato Salcedo"},
    {fecha:"2026-07-30 12:05", activo:"ACT-00061", tipo:"Cambio de ubicación", origen:"Showroom", destino:"Almacén Callao - Ingreso", usuario:"Jorge Quiroz"}
  ],

  mantenimientos: [
    {id:"MNT-0088", activo:"ACT-00204", tipo:"Correctivo", problema:"Atasco recurrente de papel y error de fusor", tecnico:"Soporte Externo — CopyTech", estado:"En reparación", prioridad:"Alta", fechaReporte:"2026-08-20", costoEstimado:320},
    {id:"MNT-0087", activo:"ACT-00098", tipo:"Preventivo", problema:"Limpieza y calibración de color programada", tecnico:"Renato Salcedo", estado:"Programado", prioridad:"Baja", fechaReporte:"2026-09-01", costoEstimado:0},
    {id:"MNT-0086", activo:"ACT-00061", tipo:"Preventivo", problema:"Revisión de lente y housing por exposición a polvo", tecnico:"Renato Salcedo", estado:"Cerrado", prioridad:"Media", fechaReporte:"2026-08-05", costoEstimado:0}
  ],

  tickets: [
    {id:"TCK-000245", usuario:"Diego Farfán", area:"Marketing", categoria:"Hardware", prioridad:"Alta", asunto:"Laptop no enciende tras actualización", asignado:"Renato Salcedo", estado:"En diagnóstico", sla:"Vence en 3h", fecha:"2026-09-01"},
    {id:"TCK-000244", usuario:"Carla Núñez", area:"Administración", categoria:"Software", prioridad:"Media", asunto:"Solicitud de licencia Microsoft 365 adicional", asignado:"Renato Salcedo", estado:"Atendiendo", sla:"Vence mañana", fecha:"2026-08-31"},
    {id:"TCK-000243", usuario:"Andrea Villar", area:"Ventas", categoria:"Acceso", prioridad:"Baja", asunto:"Restablecer contraseña del CRM", asignado:"Renato Salcedo", estado:"Cerrado", sla:"Cumplido", fecha:"2026-08-29"},
    {id:"TCK-000242", usuario:"Jorge Quiroz", area:"Almacén", categoria:"Red", prioridad:"Crítica", asunto:"Access point del almacén sin señal", asignado:"Renato Salcedo", estado:"Resuelto", sla:"Cumplido", fecha:"2026-08-27"}
  ],

  software: [
    {nombre:"Microsoft 365 Business", licencias:50, asignadas:45, disponibles:5, vencimiento:"2026-12-15", costoAnual:9000},
    {nombre:"AutoCAD 2026", licencias:8, asignadas:8, disponibles:0, vencimiento:"2027-03-01", costoAnual:12400},
    {nombre:"Antivirus ESET Endpoint", licencias:60, asignadas:58, disponibles:2, vencimiento:"2026-10-20", costoAnual:3600},
    {nombre:"CRM Interno (SaaS)", licencias:20, asignadas:14, disponibles:6, vencimiento:"2027-01-05", costoAnual:6000}
  ],

  proveedores: [
    {ruc:"20458812093", razonSocial:"Mármoles del Sur S.A.", contacto:"Ítalo Ferreyros", telefono:"+51 989 220 011", email:"ventas@marmolesdelsur.pe", categoria:"Mármol / Granito", evaluacion:4.6},
    {ruc:"20601987432", razonSocial:"Import Stone Perú SAC", contacto:"Wendy Chang", telefono:"+51 977 004 552", email:"wchang@importstone.pe", categoria:"Cuarzo importado", evaluacion:4.8},
    {ruc:"20512099887", razonSocial:"CopyTech Servicios TI", contacto:"Bruno Alarcón", telefono:"+51 955 118 220", email:"soporte@copytech.pe", categoria:"Equipos y soporte TI", evaluacion:4.1}
  ],

  ordenesCompra: [
    {id:"OC-2026-441", proveedor:"Mármoles del Sur S.A.", fecha:"2026-08-24", items:"Mármol Carrara Blanco x150 m²", total:28350, estado:"Recibido"},
    {id:"OC-2026-438", proveedor:"Import Stone Perú SAC", fecha:"2026-08-18", items:"Porcelanato Concreto Gris x400 m²", total:31600, estado:"Recibido"},
    {id:"OC-2026-445", proveedor:"CopyTech Servicios TI", fecha:"2026-08-30", items:"Reparación fusor impresora HP", total:320, estado:"Pendiente"}
  ],

  usuarios: [
    {id:"USR-001", nombre:"Fernando Gallos", cargo:"Gerente General", area:"Gerencia", rol:"Gerencia", email:"fgallos@gallosmarmol.pe", estado:"Activo"},
    {id:"USR-002", nombre:"Renato Salcedo", cargo:"Administrador TI", area:"TI", rol:"Administrador TI", email:"rsalcedo@gallosmarmol.pe", estado:"Activo"},
    {id:"USR-003", nombre:"Andrea Villar", cargo:"Jefa de Ventas", area:"Ventas", rol:"Responsable de área", email:"avillar@gallosmarmol.pe", estado:"Activo"},
    {id:"USR-004", nombre:"Luis Bernal", cargo:"Ejecutivo de Ventas", area:"Ventas", rol:"Usuario final", email:"lbernal@gallosmarmol.pe", estado:"Activo"},
    {id:"USR-005", nombre:"Jorge Quiroz", cargo:"Jefe de Almacén", area:"Almacén", rol:"Almacén", email:"jquiroz@gallosmarmol.pe", estado:"Activo"},
    {id:"USR-006", nombre:"Katia Ruiz", cargo:"Asistente de Almacén", area:"Almacén", rol:"Usuario final", email:"kruiz@gallosmarmol.pe", estado:"Inactivo"}
  ],

  roles: [
    {nombre:"Superadministrador", usuarios:1, permisos:"Todos los módulos"},
    {nombre:"Administrador TI", usuarios:1, permisos:"Activos, Mantenimiento, Soporte, Software, Seguridad"},
    {nombre:"Responsable de área", usuarios:3, permisos:"Ver / Aprobar dentro de su área"},
    {nombre:"Almacén", usuarios:2, permisos:"Inventario, Kardex, Despachos"},
    {nombre:"Usuario final", usuarios:6, permisos:"Solicitudes, Tickets, Ver activos propios"}
  ],

  auditoria: [
    {fecha:"2026-09-01 14:22", usuario:"Renato Salcedo", accion:"Actualizó", modulo:"Activos", registro:"ACT-00152", detalle:"Responsable: Pedro Luna → Diego Farfán"},
    {fecha:"2026-08-30 11:05", usuario:"Andrea Villar", accion:"Creó", modulo:"Cotizaciones", registro:"COT-2026-0185", detalle:"Nueva cotización para Estudio VC Arquitectos"},
    {fecha:"2026-08-28 09:12", usuario:"Jorge Quiroz", accion:"Registró ingreso", modulo:"Almacén", registro:"OC-2026-441", detalle:"+150 m² Mármol Carrara Blanco"},
    {fecha:"2026-08-27 08:41", usuario:"Fernando Gallos", accion:"Aprobó", modulo:"Compras", registro:"OC-2026-441", detalle:"Orden de compra aprobada"},
    {fecha:"2026-08-11 16:40", usuario:"Renato Salcedo", accion:"Dio de baja", modulo:"Activos", registro:"ACT-00033", detalle:"Motivo: fin de vida útil"}
  ]
};

window.DB = DB;
})();
