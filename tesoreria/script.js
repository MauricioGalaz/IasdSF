// 1. CONFIGURACIÓN Y BASE DE DATOS
const DEPT_NAMES = ["MIDEA", "DEPARTAMENTO NIÑOS", "DEPARTAMENTOS AVENTUREROS", "JOVENES ADVENTISTAS", "ASA", "PUBLICACIONES", "ESCUELA SABATICA", "MIPES", "MINISTERIO DE LA MUJER", "SALUD", "GASTOS DE IGLESIA", "FONDO SOLIDARIO"];

let db = JSON.parse(localStorage.getItem('iasd_limache_FINAL')) || {};
let miGrafico = null;

// 2. SISTEMA DE SEGURIDAD
window.validarAcceso = function() {
    const pass = document.getElementById('input-pass').value;
    if (pass === "tesoriasd") {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        inicializarDB();
        mostrarAviso("Sistema Desbloqueado Correctamente.", "success");
    } else {
        Swal.fire({ title: 'Contraseña Incorrecta', icon: 'error', confirmButtonColor: '#0a192f' });
    }
};

// 3. INICIALIZACIÓN
function inicializarDB() {
    if (!db.bancos) db.bancos = { estado: 0, chile: 0 };
    if (!db.saldos) db.saldos = {};
    if (!db.porcentajes) db.porcentajes = {};
    if (!db.gastosReales) db.gastosReales = {}; 
    if (!db.historial_movimientos) db.historial_movimientos = [];
    if (!db.proyectos) db.proyectos = { "Equipos Sonido y Butacas": 0 };

    DEPT_NAMES.forEach(n => {
        if (db.porcentajes[n] === undefined) db.porcentajes[n] = 8.33;
        if (db.gastosReales[n] === undefined) db.gastosReales[n] = 0;
    });

    recalcularSaldosPorcentuales();
    updateUI();
}

// 4. NAVEGACIÓN BLINDADA (EFECTO PÁGINAS DISTINTAS)
window.showTab = function(id) {
    // Ocultar todas las vistas
    document.querySelectorAll('.tab-view').forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });

    // Mostrar la vista seleccionada
    const target = document.getElementById('tab-' + id);
    if(target) {
        target.style.display = 'block';
        target.classList.add('active');
    }

    // Actualizar botones menú lateral
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(event && event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('active');
    }

    // Disparar funciones de carga según la pestaña
    if(id === 'config') renderConfig();
    if(id === 'historial') renderHistorial();
    if(id === 'dashboard') if(typeof actualizarGrafico === 'function') actualizarGrafico();

    // Cerrar menú en móvil automáticamente al seleccionar opción
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active-mobile');
        if(document.getElementById('sidebar-overlay')) document.getElementById('sidebar-overlay').style.display = 'none';
    }
};

// 5. LÓGICA DE DISTRIBUCIÓN (Bancos - Proyectos = Deptos)
function recalcularSaldosPorcentuales() {
    const totalBancos = (db.bancos.estado || 0) + (db.bancos.chile || 0);
    const totalEnProyectos = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    const patrimonioNeto = Math.max(0, totalBancos - totalEnProyectos);

    DEPT_NAMES.forEach(n => {
        const asignacionIdeal = (patrimonioNeto * (db.porcentajes[n] / 100));
        db.saldos[n] = asignacionIdeal - (db.gastosReales[n] || 0);
    });
}

// 6. INGRESOS Y EGRESOS
window.procesarIngreso = function() {
    const monto = parseFloat(document.getElementById('monto-in').value);
    const cuenta = document.getElementById('cuenta-in').value;
    const tipo = document.getElementById('tipo-in').value;
    const remesa = document.getElementById('remesa-num').value;
    const fecha = document.getElementById('fecha-in').value;

    if(!monto || !remesa || !fecha) return mostrarAviso("Faltan datos", "error");
    db.bancos[cuenta] += monto;

    let meta = {};
    if(tipo === 'proyecto') {
        let pName = document.getElementById('proj-select').value;
        if(pName === 'NUEVO_CONCEPTO') {
            pName = document.getElementById('nuevo-concepto-nombre').value.trim();
            if(!pName) return mostrarAviso("Indique nombre del proyecto", "error");
            if(!db.proyectos[pName]) db.proyectos[pName] = 0;
        }
        db.proyectos[pName] += monto;
        meta = { nombre: pName };
    }

    db.historial_movimientos.push({ fecha, detalle: tipo === 'proyecto' ? `Proyecto: ${meta.nombre}` : `Remesa ${remesa}`, monto, tipo, banco: cuenta, meta });
    recalcularSaldosPorcentuales();
    updateUI();
    mostrarAviso("Fondo integrado exitosamente.", "success");
};

window.registrarGasto = function() {
    const selectElem = document.getElementById('gasto-dep');
    if(!selectElem || !selectElem.value) return mostrarAviso("Seleccione origen", "error");
    
    const [tipo, nombre] = selectElem.value.split(':');
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const banco = document.getElementById('gasto-banco').value;
    const prop = document.getElementById('gasto-proposito').value || "Gasto";

    if(!monto || monto <= 0) return mostrarAviso("Monto inválido", "error");

    // 1. Ejecutar rebaja en banco y acumuladores
    db.bancos[banco] -= monto;
    if(tipo === 'PROJ') {
        db.proyectos[nombre] -= monto;
    } else {
        db.gastosReales[nombre] += monto;
    }
    
    // 2. Registro en historial
    db.historial_movimientos.push({ 
        fecha: new Date().toLocaleDateString(), 
        detalle: `Gasto: ${prop} (${nombre})`, 
        monto: -monto, tipo: 'egreso', banco, meta: { tipo, nombre } 
    });

    // 3. Recalcular presupuestos antes de mostrar el mensaje
    recalcularSaldosPorcentuales();
    updateUI();

    // 4. ALERTA DE CONFIRMACIÓN CON SALDO RESTANTE
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    const saldoFinal = tipo === 'PROJ' ? db.proyectos[nombre] : db.saldos[nombre];

    Swal.fire({
        title: '¡Gasto Procesado!',
        html: `
            <div style="text-align: left; font-size: 0.95rem;">
                <p>Monto rebajado: <b>${clp.format(monto)}</b></p>
                <p>Origen: <b>${nombre}</b></p>
                <p>Caja: <b>${banco === 'estado' ? 'BancoEstado' : 'Banco Chile'}</b></p>
                <hr>
                <p style="color: #2ecc71; font-weight: bold;">Saldo actual disponible: ${clp.format(saldoFinal)}</p>
            </div>`,
        icon: 'success',
        confirmButtonColor: '#0a192f'
    });

    // Limpiar formulario
    document.getElementById('gasto-monto').value = "";
    document.getElementById('gasto-proposito').value = "";
};

// 7. ACTUALIZACIÓN UI Y SELECTORES
window.updateUI = function() {
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    document.getElementById('total-estado').innerText = clp.format(db.bancos.estado || 0);
    document.getElementById('total-chile').innerText = clp.format(db.bancos.chile || 0);

    document.getElementById('grid-departamentos').innerHTML = DEPT_NAMES.map(n => `
        <div class="dep-card"><h4>${n}</h4><div class="balance">${clp.format(db.saldos[n] || 0)}</div>
        <small>${db.porcentajes[n]}% | Gastado: ${clp.format(db.gastosReales[n] || 0)}</small></div>`).join("");

    document.getElementById('grid-proyectos-reunido').innerHTML = Object.keys(db.proyectos).map(p => `
        <div class="dep-card" style="border-left:5px solid #c5a059"><h4>${p}</h4><div class="balance">${clp.format(db.proyectos[p] || 0)}</div></div>`).join("");

    const projIn = document.getElementById('proj-select');
    if(projIn) {
        let opts = `<option value="Equipos Sonido y Butacas">Equipos Sonido y Butacas</option>`;
        Object.keys(db.proyectos).forEach(p => { if(p !== "Equipos Sonido y Butacas") opts += `<option value="${p}">${p}</option>`; });
        opts += `<option value="NUEVO_CONCEPTO" style="color:blue">+ Nuevo Proyecto</option>`;
        projIn.innerHTML = opts;
    }

    const selectGasto = document.getElementById('gasto-dep');
    if(selectGasto) {
        let opt = '<option value="" disabled selected>Elegir Origen...</option><optgroup label="Deptos">';
        DEPT_NAMES.forEach(n => opt += `<option value="DEP:${n}">${n}</option>`);
        opt += '</optgroup><optgroup label="Ofrendas Dirigidas">';
        Object.keys(db.proyectos).forEach(p => opt += `<option value="PROJ:${p}">${p}</option>`);
        selectGasto.innerHTML = opt + '</optgroup>';
    }

    localStorage.setItem('iasd_limache_FINAL', JSON.stringify(db));
};

// 8. REPORTE PDF COMPLETO PARA JUNTA
window.generarReportePDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

    doc.setFontSize(18);
    doc.text("IGLESIA ADVENTISTA DEL SÉPTIMO DÍA", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("San Francisco de Limache - Reporte para Junta Administrativa", 105, 22, { align: "center" });

    const totalB = db.bancos.estado + db.bancos.chile;
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0);

    doc.autoTable({
        startY: 30,
        head: [['Resumen Consolidado', 'Monto']],
        body: [['Saldo Total en Bancos', clp.format(totalB)], ['Fondo Reservado Proyectos', clp.format(totalP)], ['Neto Disponible Deptos', clp.format(totalB - totalP)]],
        theme: 'striped', headStyles: { fillColor: [197, 160, 89] }
    });

    doc.text("Saldos por Departamento", 20, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Departamento', '% Asig.', 'Gastado', 'Disponible']],
        body: DEPT_NAMES.map(n => [n, db.porcentajes[n]+'%', clp.format(db.gastosReales[n]), clp.format(db.saldos[n])]),
        styles: { fontSize: 8 }
    });

    doc.save(`Reporte_Junta_Limache_${new Date().toLocaleDateString()}.pdf`);
};

// 9. FUNCIONES AUXILIARES
window.verTotalGeneral = function() {
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0);
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    Swal.fire({ title: 'Estado Real de la Iglesia', html: `Bancos: ${clp.format(totalB)}<br>Proyectos: ${clp.format(totalP)}<hr><p style="color: green;">Neto Disponible: <b>${clp.format(totalB - totalP)}</b></p>`, icon: 'info' });
};

window.anularRegistro = function(index) {
    Swal.fire({ title: '¿Anular registro?', icon: 'warning', showCancelButton: true }).then((r) => {
        if (r.isConfirmed) {
            const mov = db.historial_movimientos[index];
            db.bancos[mov.banco] -= mov.monto;
            if(mov.tipo === 'egreso' && mov.meta) {
                if(mov.meta.tipo === 'PROJ') db.proyectos[mov.meta.nombre] -= mov.monto;
                else db.gastosReales[mov.meta.nombre] += mov.monto;
            } else if(mov.tipo === 'proyecto' && mov.meta) {
                db.proyectos[mov.meta.nombre] -= mov.monto;
            }
            db.historial_movimientos.splice(index, 1);
            recalcularSaldosPorcentuales(); updateUI(); renderHistorial();
        }
    });
};

function renderHistorial() {
    const container = document.getElementById('lista-movimientos');
    if(!container) return;
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    container.innerHTML = db.historial_movimientos.slice().reverse().map((m, i) => {
        const realIdx = db.historial_movimientos.length - 1 - i;
        return `<div class="rendicion-item" style="display:flex; justify-content:space-between; align-items:center;"><span><strong>${m.fecha}</strong> - ${m.detalle}</span><div><strong style="color:${m.monto > 0 ? 'green' : 'red'}">${clp.format(m.monto)}</strong><button onclick="anularRegistro(${realIdx})" style="background:none; border:none; color:red; cursor:pointer; margin-left:10px;"><i class="fas fa-trash"></i></button></div></div>`;
    }).join("");
}

window.renderConfig = function() {
    const container = document.getElementById('inputs-porcentajes');
    if(!container) return;
    container.innerHTML = DEPT_NAMES.map(n => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:10px; background:#f8fafc; border-radius:8px;"><label style="font-weight:600;">${n}</label><div style="display:flex; align-items:center; gap:5px;"><input type="number" class="in-porc" data-dep="${n}" value="${db.porcentajes[n] || 0}" oninput="validarSuma()" style="width:70px; text-align:right;"><strong>%</strong></div></div>`).join("");
    validarSuma();
};

window.validarSuma = function() {
    let suma = 0;
    document.querySelectorAll('.in-porc').forEach(i => suma += parseFloat(i.value) || 0);
    const bar = document.getElementById('check-total');
    if(bar) {
        bar.innerText = `Suma Total: ${suma.toFixed(2)}%`;
        const ok = Math.abs(suma - 100) < 0.1;
        bar.style.color = ok ? "green" : "red";
        document.getElementById('btn-guardar-config').disabled = !ok;
    }
};

window.guardarConfig = function() {
    document.querySelectorAll('.in-porc').forEach(i => db.porcentajes[i.dataset.dep] = parseFloat(i.value));
    recalcularSaldosPorcentuales();
    updateUI();
};

window.limpiarRegistros = function() {
    Swal.fire({ title: '¿Reiniciar?', icon: 'warning', showCancelButton: true }).then((r) => {
        if (r.isConfirmed) {
            db.bancos = { estado: 0, chile: 0 }; db.historial_movimientos = [];
            Object.keys(db.proyectos).forEach(p => db.proyectos[p] = 0);
            DEPT_NAMES.forEach(n => db.gastosReales[n] = 0);
            recalcularSaldosPorcentuales(); updateUI();
        }
    });
};

function actualizarGrafico() {
    const canvas = document.getElementById('chartPresupuesto');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(miGrafico) miGrafico.destroy();
    miGrafico = new Chart(ctx, { type: 'doughnut', data: { labels: DEPT_NAMES, datasets: [{ data: DEPT_NAMES.map(n => Math.max(0, db.saldos[n])), backgroundColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b', '#16a085', '#27ae60'] }] }, options: { responsive: true, maintainAspectRatio: false } });
}

window.mostrarAviso = function(m, t) {
    const toast = document.createElement('div');
    toast.className = `toast ${t}`;
    toast.innerText = m;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

window.toggleInputs = function() { document.getElementById('wrapper-proyecto').style.display = (document.getElementById('tipo-in').value === 'proyecto') ? 'block' : 'none'; };
window.checkNuevoConcepto = function() {
    const select = document.getElementById('proj-select');
    document.getElementById('container-nuevo-nombre').style.display = (select.value === 'NUEVO_CONCEPTO') ? 'block' : 'none';
};

window.toggleSidebar = function() {
    const sb = document.querySelector('.sidebar');
    sb.classList.toggle('active-mobile');
    const overlay = document.getElementById('sidebar-overlay');
    if(overlay) overlay.style.display = sb.classList.contains('active-mobile') ? 'block' : 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
});