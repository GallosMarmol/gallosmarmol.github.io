// ==================== GESTIÓN DE MODALES ====================
window.cerrarModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`⚠️ Modal ${modalId} no encontrado`);
        return;
    }

    if (window.modalEstado.cerrando) {
        console.log(`⏳ Modal ${modalId} ya está cerrando, ignorando...`);
        return;
    }

    window.modalEstado.cerrando = true;
    console.log(`🔒 Cerrando modal: ${modalId}`);

    modal.classList.add('hidden');
    modal.style.display = 'none';

    const formId = modalId.replace('Modal', 'Form');
    const form = document.getElementById(formId);
    if (form) form.reset();

    // Resetear campos específicos
    switch(modalId) {
        case 'activoModal':
            const nombreInput = document.getElementById('activo_nombre');
            if (nombreInput) nombreInput.dataset.editadoManualmente = 'false';
            const subcategoriaSelect = document.getElementById('activo_subcategoria_id');
            const tipoSelect = document.getElementById('activo_tipo_id');
            if (subcategoriaSelect) subcategoriaSelect.innerHTML = '<option value="">Seleccionar subcategoría</option>';
            if (tipoSelect) tipoSelect.innerHTML = '<option value="">Seleccionar tipo</option>';
            break;
        case 'empleadoModal':
            const ubicacionSelect = document.getElementById('empleado_ubicacion_id');
            if (ubicacionSelect) {
                ubicacionSelect.innerHTML = '<option value="">Primero seleccione una empresa</option>';
                ubicacionSelect.disabled = true;
            }
            break;
        case 'ubicacionModal':
            const padreSelect = document.getElementById('ubicacion_padre_id');
            if (padreSelect) padreSelect.innerHTML = '<option value="">Ninguna (ubicación raíz)</option>';
            const nombreUbicacion = document.getElementById('ubicacion_nombre');
            if (nombreUbicacion) nombreUbicacion.dataset.editadoManualmente = 'false';
            break;
        case 'mantenimientoModal':
            const mantIdField = document.getElementById('mantenimiento_id');
            if (mantIdField) mantIdField.value = '';
            break;
        case 'softwareModal':
            const softwareIdField = document.getElementById('software_id');
            if (softwareIdField) softwareIdField.value = '';
            break;
        case 'licenciaModal':
            const licenciaIdField = document.getElementById('licencia_id');
            if (licenciaIdField) licenciaIdField.value = '';
            break;
    }

    editandoId = null;

    if (window.modalEstado.timeout) clearTimeout(window.modalEstado.timeout);
    window.modalEstado.timeout = setTimeout(() => {
        window.modalEstado.cerrando = false;
    }, 300);

    modal.offsetHeight;
    console.log(`✅ Modal ${modalId} cerrado correctamente`);
};

window.abrirModal = function(modalId, callback) {
    return new Promise(async (resolve) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`❌ Modal ${modalId} no encontrado`);
            resolve(false);
            return;
        }

        if (window.modalEstado.abriendo) {
            console.log(`⏳ Modal ${modalId} ya está abriendo, esperando...`);
            await new Promise(r => setTimeout(r, 200));
            resolve(await window.abrirModal(modalId, callback));
            return;
        }

        if (!modal.classList.contains('hidden')) {
            console.log(`ℹ️ Modal ${modalId} ya está visible, cerrando primero...`);
            window.cerrarModal(modalId);
            await new Promise(r => setTimeout(r, 300));
        }

        window.modalEstado.abriendo = true;
        console.log(`🔓 Abriendo modal: ${modalId}`);

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.offsetHeight;

        if (callback && typeof callback === 'function') {
            setTimeout(() => callback(), 50);
        }

        setTimeout(() => {
            window.modalEstado.abriendo = false;
        }, 300);

        console.log(`✅ Modal ${modalId} abierto correctamente`);
        resolve(true);
    });
};