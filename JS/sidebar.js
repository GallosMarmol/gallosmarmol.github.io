// ==================== GENERAR SIDEBAR POR ROL ====================
function generarSidebarPorRol(rol, puedeRegistrarClientes = false) {
    let contenidoMenu = '';
    
    if (rol === 'ADMINISTRADOR') {
        contenidoMenu = `
            <!-- ==================== DASHBOARD ==================== -->
            <a href="#" onclick="window.cargarVista('dashboard')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-chart-pie w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Dashboard</span>
                <div class="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-chevron-right text-xs text-secondary"></i>
                </div>
            </a>

            <!-- ==================== REGISTRO CLIENTES OUTLET ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('registroOutletSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-store w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Outlet</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="registroOutletSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('listadoRegistrosClientes')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-list-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Listado de Clientes Outlet</span>
                    </a>                    
                    <a href="#" onclick="window.cargarVista('registroClientesOutlet')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-user-plus mr-2 w-4 text-xs"></i>Registrar Cliente
                    </a>
                    <a href="#" onclick="window.cargarVista('gestionarPermisosRegistro')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-user-tag mr-2 w-4 text-xs"></i>Gestionar Permisos
                    </a>
                </div>
            </div>          

            <!-- ==================== TICKETS ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('ticketsSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-ticket-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Tickets</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="ticketsSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('tickets')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-list-alt mr-2 w-4 text-xs"></i>Gestión de Tickets
                    </a>
                    <a href="#" onclick="window.abrirModalNuevoTicket()" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nuevo Ticket
                    </a>
                    <a href="#" onclick="window.cargarVista('categoriasTicket')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-tags mr-2 w-4 text-xs"></i>Categorías de Tickets
                    </a>
                </div>
            </div>
            
            <!-- ==================== GESTIÓN DE ACTIVOS ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('activosSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-boxes w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Gestión de Activos</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="activosSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <!-- Activos -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-desktop w-3"></i>
                            <span>Activos</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('activos')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-list mr-2 w-4 text-xs"></i>Listado de Activos
                        </a>
                        <a href="#" onclick="window.abrirModalNuevoActivo()" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nuevo Activo
                        </a>
                    </div>
                    
                    <div class="border-t border-white/10 my-2"></div>
                    
                    <!-- Configuración -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-cog w-3"></i>
                            <span>Configuración</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('categorias')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-folder mr-2 w-4 text-xs"></i>Categorías
                        </a>
                        <a href="#" onclick="window.cargarVista('subcategorias')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-sitemap mr-2 w-4 text-xs"></i>Subcategorías
                        </a>
                        <a href="#" onclick="window.cargarVista('tiposActivos')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-tags mr-2 w-4 text-xs"></i>Tipos de Activo
                        </a>
                        <a href="#" onclick="window.cargarVista('marcas')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-trademark mr-2 w-4 text-xs"></i>Marcas
                        </a>
                    </div>
                    
                    <div class="border-t border-white/10 my-2"></div>
                    
                    <!-- Especificaciones -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-microchip w-3"></i>
                            <span>Especificaciones</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('especificacionesAtributos')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-puzzle-piece mr-2 w-4 text-xs"></i>Atributos de Especificaciones
                        </a>
                        <a href="#" onclick="window.cargarVista('especificacionesValores')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-database mr-2 w-4 text-xs"></i>Valores de Especificaciones
                        </a>
                    </div>
                    
                    <div class="border-t border-white/10 my-2"></div>
                    
                    <!-- Unidades de Medida -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-ruler w-3"></i>
                            <span>Unidades de Medida</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('unidadesMedida')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-list mr-2 w-4 text-xs"></i>Listado de Unidades
                        </a>
                        <a href="#" onclick="window.abrirModalNuevaUnidadMedida()" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nueva Unidad
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Productos Landing Pages -->
            <a href="#" onclick="window.cargarVista('productos')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-cube w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Productos Landing</span>
            </a>

            <!-- Leads / Cotizaciones -->
            <a href="#" onclick="window.cargarVista('leads')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-envelope-open-text w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Cotizaciones</span>
                <span id="leads-nuevos-badge" class="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 hidden">0</span>
            </a>            

            <!-- Vendedores -->
            <a href="#" onclick="window.cargarVista('vendedores')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-user-tie w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Vendedores</span>
            </a>

            <!-- ==================== SEGURIDAD Y ACCESOS ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('seguridadSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-shield-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Seguridad y Accesos</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="seguridadSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('credenciales')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-key mr-2 w-4 text-xs"></i>Credenciales
                    </a>
                    <a href="#" onclick="window.cargarVista('accesosRemotos')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-network-wired mr-2 w-4 text-xs"></i>Accesos Remotos
                    </a>
                    <a href="#" onclick="window.cargarVista('usuarios')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-users-cog mr-2 w-4 text-xs"></i>Usuarios del Sistema
                    </a>
                    <a href="#" onclick="window.cargarVista('tareasRespaldo')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-database mr-2 w-4 text-xs"></i>Tareas de Respaldo
                    </a>                    
                    <a href="#" onclick="window.cargarVista('asignacionUsuariosEmpresas')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-building-user mr-2 w-4 text-xs"></i>Asignar Empresas a Operadores
                    </a>
                </div>
            </div>
            
            <!-- ==================== RECURSOS HUMANOS ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('empleadosSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-user-tie w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Recursos Humanos</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="empleadosSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <!-- Empleados -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-users w-3"></i>
                            <span>Empleados</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('empleados')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-list mr-2 w-4 text-xs"></i>Listado de Empleados
                        </a>
                        <a href="#" onclick="window.abrirModalNuevoEmpleado()" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-user-plus mr-2 w-4 text-xs"></i>Nuevo Empleado
                        </a>
                    </div>
                    
                    <div class="border-t border-white/10 my-2"></div>
                    
                    <!-- Organización -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-building w-3"></i>
                            <span>Organización</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('empresas')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-building mr-2 w-4 text-xs"></i>Empresas
                        </a>
                        <a href="#" onclick="window.cargarVista('areas')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-building mr-2 w-4 text-xs"></i>Áreas
                        </a>
                        <a href="#" onclick="window.cargarVista('ubicaciones')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-map-marker-alt mr-2 w-4 text-xs"></i>Ubicaciones
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- ==================== SOFTWARE Y LICENCIAS ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('softwareSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-code w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Software y Licencias</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="softwareSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('software')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-box mr-2 w-4 text-xs"></i>Catálogo de Software
                    </a>
                    <a href="#" onclick="window.cargarVista('software_instalado')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-laptop-code mr-2 w-4 text-xs"></i>Software Instalado
                    </a>
                    <a href="#" onclick="window.cargarVista('licencias')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-certificate mr-2 w-4 text-xs"></i>Licencias
                    </a>
                </div>
            </div>
            
            <!-- ==================== MANTENIMIENTO ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('mantenimientosSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-tools w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Mantenimiento</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="mantenimientosSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('mantenimientos')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-history mr-2 w-4 text-xs"></i>Historial de Mantenimientos
                    </a>
                    <a href="#" onclick="window.abrirModalNuevoMantenimiento()" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nuevo Mantenimiento
                    </a>
                </div>
            </div>
            
            <!-- ==================== ASIGNACIONES ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('asignacionesSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-clipboard-list w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Asignaciones</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="asignacionesSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('asignaciones')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-list-alt mr-2 w-4 text-xs"></i>Listado de Asignaciones
                    </a>
                    <a href="#" onclick="window.abrirModalNuevaAsignacion()" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nueva Asignación
                    </a>
                </div>
            </div>
                        
            <!-- ==================== INVENTARIO DE CONSUMIBLES ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('consumiblesSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-boxes w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Inventario de Consumibles</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="consumiblesSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <!-- Consumibles -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-box w-3"></i>
                            <span>Consumibles</span>
                        </div>
                        <a href="#" onclick="window.cargarVista('consumibles')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-list mr-2 w-4 text-xs"></i>Listado de Consumibles
                        </a>
                        <a href="#" onclick="window.abrirModalNuevoConsumible()" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nuevo Consumible
                        </a>
                        <a href="#" onclick="window.cargarVista('movimientosConsumibles')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                            <i class="fas fa-history mr-2 w-4 text-xs"></i>Movimientos
                        </a>
                    </div>
                    
                    <div class="border-t border-white/10 my-2"></div>
                    
                    <!-- Configuración -->
                    <div class="relative">
                        <div class="flex items-center gap-2 py-1 text-xs text-white/40 uppercase tracking-wider">
                            <i class="fas fa-cog w-3"></i>
                            <span>Configuración</span>
                        </div>
                        
                        <!-- Categorías -->
                        <div class="relative pl-3">
                            <div class="flex items-center gap-2 py-1 text-xs text-white/40">
                                <i class="fas fa-folder w-3"></i>
                                <span>Categorías</span>
                            </div>
                            <a href="#" onclick="window.cargarVista('categoriasConsumibles')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                                <i class="fas fa-list mr-2 w-4 text-xs"></i>Listado de Categorías
                            </a>
                            <a href="#" onclick="window.abrirModalCategoriaConsumible()" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                                <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nueva Categoría
                            </a>
                        </div>
                        
                        <!-- Tipos -->
                        <div class="relative pl-3 mt-1">
                            <div class="flex items-center gap-2 py-1 text-xs text-white/40">
                                <i class="fas fa-tag w-3"></i>
                                <span>Tipos de Consumible</span>
                            </div>
                            <a href="#" onclick="window.cargarVista('tiposConsumibles')" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                                <i class="fas fa-list mr-2 w-4 text-xs"></i>Listado de Tipos
                            </a>
                            <a href="#" onclick="window.abrirModalTipoConsumible()" class="block py-2 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                                <i class="fas fa-plus-circle mr-2 w-4 text-xs"></i>Nuevo Tipo
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ==================== SOLICITUDES ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('solicitudesSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-clipboard-list w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Solicitudes</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="solicitudesSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <!-- Mis Solicitudes (solicitante) -->
                    <a href="#" onclick="window.cargarVista('solicitudes')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-tasks mr-2 w-4 text-xs"></i>Mis Solicitudes
                    </a>
                    
                    <!-- ==================== NUEVO: Solicitudes Asignadas a Mí ==================== -->
                    <a href="#" onclick="window.cargarVista('solicitudesAsignadas')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-inbox mr-2 w-4 text-xs"></i>Solicitudes Asignadas
                        <span id="solicitudes-pendientes-badge" class="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 hidden">0</span>
                    </a>
                    
                    <!-- Solo para ADMIN -->
                    <a href="#" onclick="window.cargarVista('solicitudesPendientes')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-clock mr-2 w-4 text-xs"></i>Pendientes de Aprobación
                    </a>
                    <a href="#" onclick="window.cargarVista('solicitudesTodas')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-list-alt mr-2 w-4 text-xs"></i>Todas las Solicitudes
                    </a>
                    <a href="#" onclick="window.cargarVista('configurarResponsablesSolicitudes')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-user-tag mr-2 w-4 text-xs"></i>Configurar Responsables
                    </a>
                </div>
            </div>
            
            <!-- ==================== BASE DE CONOCIMIENTO ==================== -->
            <div class="relative">
                <button onclick="toggleSubmenu('conocimientoSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                    <span class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <i class="fas fa-database w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                        </div>
                        <span class="font-medium">Base de Conocimiento</span>
                    </span>
                    <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
                </button>
                <div id="conocimientoSubmenu" class="hidden pl-12 space-y-1 mt-1">
                    <a href="#" onclick="window.cargarVista('conocimiento')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-search mr-2 w-4 text-xs"></i>Buscar Artículos
                    </a>
                    <a href="#" onclick="window.cargarVista('conocimientoArticulos')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-edit mr-2 w-4 text-xs"></i>Gestionar Artículos
                    </a>
                    <a href="#" onclick="window.cargarVista('conocimientoCategorias')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                        <i class="fas fa-tags mr-2 w-4 text-xs"></i>Categorías
                    </a>
                </div>
            </div>

        <!-- Reportes y métricas -->
        <div class="relative">
            <button onclick="toggleSubmenu('reportesSubmenu')" class="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
                <span class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <i class="fas fa-chart-bar w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                    </div>
                    <span class="font-medium">Reportes y Métricas</span>
                </span>
                <i class="fas fa-chevron-down text-xs text-white/60 transition-transform duration-200"></i>
            </button>
            <div id="reportesSubmenu" class="hidden pl-12 space-y-1 mt-1">
                <a href="#" onclick="window.cargarVista('reportes')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                    <i class="fas fa-chart-line mr-2 w-4 text-xs"></i>Reportes Generales
                </a>
                <a href="#" onclick="window.cargarVista('metricasSolicitudes')" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                    <i class="fas fa-clipboard-list mr-2 w-4 text-xs"></i>Métricas de Solicitudes
                </a>
                <a href="#" onclick="window.cargarReporteIPs()" class="block py-2.5 text-sm text-white/80 hover:text-secondary transition-colors pl-3 border-l-2 border-transparent hover:border-secondary">
                    <i class="fas fa-database mr-2 w-4 text-xs"></i>Reporte de Direcciones IP
                </a>
            </div>
        </div> 
        
                    <!-- Enlaces públicos -->
                    <a href="#" onclick="window.cargarVista('outlet')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-all duration-200">
                        <i class="fas fa-tag text-red-500 w-5"></i>
                        <span class="font-medium">Outlet</span>
                    </a>
                    <a href="#" onclick="window.cargarVista('saldosExportacion')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-all duration-200">
                        <i class="fas fa-ship text-blue-500 w-5"></i>
                        <span class="font-medium">Saldos de Exportación</span>
                    </a>         
        `;
        
    } else if (rol === 'OPERADOR_EMPRESA') {
        contenidoMenu = `
            <!-- ==================== SOLICITUDES ASIGNADA (para OPERADOR_EMPRESA) ==================== -->
            <a href="#" onclick="window.cargarVista('solicitudesAsignadas')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-inbox w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Solicitudes Asignadas</span>
                <span id="solicitudes-pendientes-badge" class="absolute right-3 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 hidden">0</span>
            </a>
            
            <!-- Activos de Empresa -->
            <a href="#" onclick="window.cargarVista('activos')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-building w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Activos de Empresa</span>
            </a>
            
            <!-- Tickets -->
            <a href="#" onclick="window.cargarVista('tickets')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-ticket-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Tickets</span>
            </a>
            
            <!-- Solicitudes (como solicitante) -->
            <a href="#" onclick="window.cargarVista('solicitudes')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-clipboard-list w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Mis Solicitudes</span>
            </a>
            
            ${puedeRegistrarClientes ? `
            <!-- Listado de Clientes Outlet -->
            <a href="#" onclick="window.cargarVista('listadoRegistrosClientes')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-list-alt w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Listado de Clientes Outlet</span>
            </a>
            ` : ''}
            
            <!-- Base de Conocimiento -->
            <a href="#" onclick="window.cargarVista('conocimiento')" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200 group relative">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <i class="fas fa-database w-4 text-secondary group-hover:scale-110 transition-transform"></i>
                </div>
                <span class="font-medium">Base de Conocimiento</span>
            </a>
        `;
        
    } else {
        // EMPLEADO
        contenidoMenu = generarSidebarParaEmpleado(puedeRegistrarClientes);
    }
    
    return contenidoMenu;
}

window.toggleSubmenu = function(id) {
    const submenu = document.getElementById(id);
    const icon = document.querySelector(`button[onclick="toggleSubmenu('${id}')"] i.fa-chevron-down`);

    if (submenu) {
        if (submenu.classList.contains('hidden')) {
            submenu.classList.remove('hidden');
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            submenu.classList.add('hidden');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
};