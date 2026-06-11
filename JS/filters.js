// ==================== FUNCIONES DE FILTROS GLOBALES ====================
window.aplicarFiltros = function() {
    const vistaActual = window.vistaActual || 'dashboard';

    switch(vistaActual) {
        case 'activos':
            if (typeof window.aplicarFiltrosActivos === 'function') {
                window.aplicarFiltrosActivos();
            }
            break;
        case 'asignaciones':
            const estadoFiltro = document.getElementById('filtroEstadoAsignacion')?.value;
            const fechaDesde = document.getElementById('filtroFechaDesde')?.value;
            const fechaHasta = document.getElementById('filtroFechaHasta')?.value;
            if (estadoFiltro || fechaDesde || fechaHasta) {
                aplicarFiltrosAsignaciones(estadoFiltro, fechaDesde, fechaHasta);
            }
            break;
        case 'mantenimientos':
            const resultadoFiltro = document.getElementById('filtroResultado')?.value;
            const tipoFiltro = document.getElementById('filtroTipoMantenimiento')?.value;
            if (resultadoFiltro || tipoFiltro) {
                aplicarFiltrosMantenimientos(resultadoFiltro, tipoFiltro);
            }
            break;
        case 'software_instalado':
            const estadoSoftware = document.getElementById('filtroEstadoSoftware')?.value;
            if (estadoSoftware && typeof window.filtrarSoftwareInstalado === 'function') {
                window.filtrarSoftwareInstalado(estadoSoftware);
            }
            break;
        case 'licencias':
            const vigenciaFiltro = document.getElementById('filtroVigencia')?.value;
            if (vigenciaFiltro && typeof window.filtrarLicencias === 'function') {
                window.filtrarLicencias(vigenciaFiltro);
            }
            break;
        default:
            mostrarAlerta('Info', 'Los filtros están disponibles en las vistas de Activos, Asignaciones, Mantenimientos, Software y Licencias', 'info');
            break;
    }
};

function aplicarFiltrosAsignaciones(estado, fechaDesde, fechaHasta) {
    const cards = document.querySelectorAll('#asignaciones-grid .card-item');
    let contador = 0;

    cards.forEach(card => {
        let mostrar = true;
        if (estado && estado !== 'TODOS') {
            const cardEstado = card.dataset.estado;
            if (cardEstado !== estado) mostrar = false;
        }
        if (mostrar && (fechaDesde || fechaHasta)) {
            const fechaAsignacion = card.dataset.fechaAsignacion;
            if (fechaAsignacion) {
                const fecha = new Date(fechaAsignacion);
                if (fechaDesde && fecha < new Date(fechaDesde)) mostrar = false;
                if (fechaHasta && fecha > new Date(fechaHasta)) mostrar = false;
            }
        }
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });

    const contadorSpan = document.getElementById('contadorAsignaciones');
    if (contadorSpan) {
        const total = cards.length;
        contadorSpan.textContent = `Mostrando ${contador} de ${total} asignaciones`;
    }
}

function aplicarFiltrosMantenimientos(resultado, tipo) {
    const cards = document.querySelectorAll('#mantenimientos-grid .card-item');
    let contador = 0;

    cards.forEach(card => {
        let mostrar = true;
        if (resultado && resultado !== 'TODOS') {
            const cardResultado = card.dataset.resultado;
            if (cardResultado !== resultado) mostrar = false;
        }
        if (mostrar && tipo && tipo !== 'TODOS') {
            const cardTipo = card.dataset.tipo;
            if (cardTipo !== tipo) mostrar = false;
        }
        card.style.display = mostrar ? 'block' : 'none';
        if (mostrar) contador++;
    });

    const contadorSpan = document.getElementById('contadorMantenimientos');
    if (contadorSpan) {
        const total = cards.length;
        contadorSpan.textContent = `Mostrando ${contador} de ${total} mantenimientos`;
    }
}

window.limpiarFiltrosGlobales = function() {
    const vistaActual = window.vistaActual || 'dashboard';

    switch(vistaActual) {
        case 'activos':
            if (typeof window.limpiarFiltrosActivos === 'function') {
                window.limpiarFiltrosActivos();
            }
            break;
        case 'asignaciones':
            const estadoFiltro = document.getElementById('filtroEstadoAsignacion');
            const fechaDesde = document.getElementById('filtroFechaDesde');
            const fechaHasta = document.getElementById('filtroFechaHasta');
            if (estadoFiltro) estadoFiltro.value = 'TODOS';
            if (fechaDesde) fechaDesde.value = '';
            if (fechaHasta) fechaHasta.value = '';
            const cards = document.querySelectorAll('#asignaciones-grid .card-item');
            cards.forEach(card => card.style.display = 'block');
            const contadorSpan = document.getElementById('contadorAsignaciones');
            if (contadorSpan) contadorSpan.textContent = `Mostrando ${cards.length} de ${cards.length} asignaciones`;
            break;
        case 'mantenimientos':
            const resultadoFiltro = document.getElementById('filtroResultado');
            const tipoFiltro = document.getElementById('filtroTipoMantenimiento');
            if (resultadoFiltro) resultadoFiltro.value = 'TODOS';
            if (tipoFiltro) tipoFiltro.value = 'TODOS';
            const mantCards = document.querySelectorAll('#mantenimientos-grid .card-item');
            mantCards.forEach(card => card.style.display = 'block');
            const mantContador = document.getElementById('contadorMantenimientos');
            if (mantContador) mantContador.textContent = `Mostrando ${mantCards.length} de ${mantCards.length} mantenimientos`;
            break;
        default:
            mostrarAlerta('Info', 'No hay filtros activos en esta vista', 'info');
            break;
    }

    mostrarAlerta('Éxito', 'Filtros limpiados correctamente', 'success');
};