import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDREJZZPPPTvoxlcYGf5btgNuNGvCs0esg",
    authDomain: "tesoreriasf-6c473.firebaseapp.com",
    databaseURL: "https://tesoreriasf-6c473-default-rtdb.firebaseio.com",
    projectId: "tesoreriasf-6c473",
    storageBucket: "tesoreriasf-6c473.firebasestorage.app",
    messagingSenderId: "1094427807269",
    appId: "1:1094427807269:web:e414419c2128153a23f9cc"
};

const app = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(app);

const DEFAULT_DEPTS = ["MIDEA", "DEPARTAMENTO NIÑOS", "DEPARTAMENTOS AVENTUREROS", "JOVENES ADVENTISTAS", "ASA", "PUBLICACIONES", "ESCUELA SABATICA", "MIPES", "MINISTERIO DE LA MUJER", "SALUD", "GASTOS DE IGLESIA", "FONDO SOLIDARIO"];
const MASTER_PASS = "iasdsf";

let db = { bancos: { estado: 0, chile: 0 }, saldos: {}, porcentajes: {}, gastosReales: {}, historial_movimientos: [], proyectos: { "Equipos Sonido y Butacas": 0 }, votos: {}, departamentos: [], archivos_mensuales: {} };
let miGrafico = null;
let mesSeleccionadoHistorial = 'actual';

window.validarAcceso = function() {
    const pass = document.getElementById('input-pass').value;
    if (pass === "tesoriasd") {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        const docRef = doc(dbFirestore, "tesoreria", "limache_actual");
        onSnapshot(docRef, (docSnap) => { if (docSnap.exists()) { db = docSnap.data(); } inicializarDB(); }, (error) => { alert("Error de permisos en Firebase."); });
    } else { Swal.fire({ title: 'Contraseña Incorrecta', icon: 'error' }); }
};

window.guardarEnFirebase = async function() {
    try {
        const docRef = doc(dbFirestore, "tesoreria", "limache_actual");
        const limpiarParaFirestore = (obj) => {
            if (obj === null || obj === undefined || Number.isNaN(obj)) return 0;
            if (Array.isArray(obj)) return obj.map(limpiarParaFirestore).filter(e => e !== undefined && e !== null);
            if (typeof obj === 'object') {
                const nuevoObj = {};
                for (let key in obj) {
                    let cleanKey = String(key).replace(/[\.\/\[\]~]/g, '-').trim(); 
                    if (cleanKey === "") { cleanKey = "Proyecto_Sin_Nombre"; }
                    const val = limpiarParaFirestore(obj[key]);
                    if (val !== undefined && val !== null) nuevoObj[cleanKey] = val;
                }
                return nuevoObj;
            }
            return obj;
        };
        const dbLimpia = limpiarParaFirestore(db);
        if (!dbLimpia.bancos) dbLimpia.bancos = { estado: 0, chile: 0 };
        if (!dbLimpia.historial_movimientos) dbLimpia.historial_movimientos = [];
        if (!dbLimpia.votos) dbLimpia.votos = {};
        if (!dbLimpia.departamentos || dbLimpia.departamentos.length === 0) dbLimpia.departamentos = DEFAULT_DEPTS;
        if (!dbLimpia.archivos_mensuales) dbLimpia.archivos_mensuales = {};
        
        await setDoc(docRef, dbLimpia);
    } catch (e) { alert("El servidor rechazó los datos. Error: " + e.message); throw e; }
};

function inicializarDB() {
    if (!db.bancos) db.bancos = { estado: 0, chile: 0 };
    if (!db.saldos) db.saldos = {};
    if (!db.porcentajes) db.porcentajes = {};
    if (!db.gastosReales) db.gastosReales = {}; 
    if (!db.historial_movimientos) db.historial_movimientos = [];
    if (!db.proyectos) db.proyectos = { "Equipos Sonido y Butacas": 0 };
    if (!db.votos) db.votos = {};
    if (!db.departamentos || db.departamentos.length === 0) db.departamentos = DEFAULT_DEPTS;
    if (!db.archivos_mensuales) db.archivos_mensuales = {};

    db.departamentos.forEach(n => {
        if (db.porcentajes[n] === undefined) db.porcentajes[n] = 0; 
        if (db.gastosReales[n] === undefined) db.gastosReales[n] = 0;
    });

    recalcularSaldosPorcentuales();
    renderFormularioCreacionVoto(); 
    updateUI();
}

// CORRECCIÓN MATEMÁTICA: El pozo a distribuir debe incluir lo que ya se ha gastado para no desajustar a los demás.
function recalcularSaldosPorcentuales() {
    const totalBancos = (db.bancos.estado || 0) + (db.bancos.chile || 0);
    const totalEnProyectos = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    const totalGastadoDeptos = db.departamentos.reduce((acc, dep) => acc + (db.gastosReales[dep] || 0), 0);
    
    // El pozo histórico (la torta completa) es el dinero disponible HOY + el dinero que YA gastaron.
    const patrimonioNetoHistorico = Math.max(0, (totalBancos - totalEnProyectos) + totalGastadoDeptos);

    db.departamentos.forEach(n => {
        const asignacionIdeal = (patrimonioNetoHistorico * (db.porcentajes[n] / 100));
        db.saldos[n] = asignacionIdeal - (db.gastosReales[n] || 0);
    });
}

// -------------------------------------------------------------
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN DE CONCEPTOS
// -------------------------------------------------------------
window.editarDepartamento = async function(oldName) {
    const { value: newNameRaw } = await Swal.fire({ title: 'Editar Departamento', input: 'text', inputValue: oldName, showCancelButton: true, inputValidator: (val) => { if (!val) return 'Ingrese un nombre'; } });
    if(newNameRaw) {
        const newName = newNameRaw.trim().toUpperCase();
        if(newName === oldName) return;
        if(db.departamentos.includes(newName)) return mostrarAviso("Ya existe un departamento con ese nombre", "error");

        db.departamentos = db.departamentos.map(d => d === oldName ? newName : d);
        db.porcentajes[newName] = db.porcentajes[oldName]; delete db.porcentajes[oldName];
        db.gastosReales[newName] = db.gastosReales[oldName]; delete db.gastosReales[oldName];
        if(db.saldos[oldName] !== undefined) { db.saldos[newName] = db.saldos[oldName]; delete db.saldos[oldName]; }

        Object.values(db.votos).forEach(v => {
            if(v.departamentos && v.departamentos[oldName] !== undefined) { v.departamentos[newName] = v.departamentos[oldName]; delete v.departamentos[oldName]; }
        });
        db.historial_movimientos.forEach(m => {
            if(m.meta && m.meta.nombre === oldName && m.meta.tipo === 'DEP') { m.meta.nombre = newName; m.detalle = m.detalle.replace(`(${oldName})`, `(${newName})`); }
        });

        try { await window.guardarEnFirebase(); updateUI(); renderFormularioCreacionVoto(); Swal.fire('Actualizado', '', 'success'); } catch(e) {}
    }
};

window.editarFondo = async function(oldName) {
    const { value: newNameRaw } = await Swal.fire({ title: 'Editar Fondo Especial', input: 'text', inputValue: oldName, showCancelButton: true, inputValidator: (val) => { if (!val) return 'Ingrese un nombre'; } });
    if(newNameRaw) {
        const newName = newNameRaw.trim();
        if(newName === oldName) return;
        if(db.proyectos[newName] !== undefined) return mostrarAviso("Ya existe un fondo con ese nombre", "error");

        db.proyectos[newName] = db.proyectos[oldName]; delete db.proyectos[oldName];

        Object.values(db.votos).forEach(v => {
            if(v.departamentos && v.departamentos[oldName] !== undefined) { v.departamentos[newName] = v.departamentos[oldName]; delete v.departamentos[oldName]; }
        });
        db.historial_movimientos.forEach(m => {
            if(m.meta && m.meta.nombre === oldName && (m.meta.tipo === 'PROJ' || m.tipo === 'proyecto')) { m.meta.nombre = newName; m.detalle = m.detalle.replace(oldName, newName); }
        });

        try { await window.guardarEnFirebase(); updateUI(); renderFormularioCreacionVoto(); Swal.fire('Actualizado', '', 'success'); } catch(e) {}
    }
};

window.eliminarDepartamento = async function(nombre) {
    const { isConfirmed } = await Swal.fire({ title: `¿Eliminar ${nombre}?`, text: "Se quitará de la distribución. Si tenía gastos o saldo, esto afectará el neto general.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if(isConfirmed) {
        db.departamentos = db.departamentos.filter(d => d !== nombre); delete db.porcentajes[nombre]; delete db.gastosReales[nombre];
        try { await window.guardarEnFirebase(); updateUI(); Swal.fire('Eliminado', '', 'success'); } catch(e) {}
    }
};

window.eliminarFondo = async function(nombre) {
    const saldo = db.proyectos[nombre] || 0;
    const { isConfirmed } = await Swal.fire({ title: `¿Eliminar ${nombre}?`, text: saldo > 0 ? `Este fondo tiene $${saldo}. Si lo eliminas, el dinero volverá al "Neto Disponible" general.` : "Se eliminará este fondo especial.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
    if(isConfirmed) {
        delete db.proyectos[nombre];
        try { await window.guardarEnFirebase(); updateUI(); Swal.fire('Eliminado', '', 'success'); } catch(e) {}
    }
};

// -------------------------------------------------------------
// CIERRE DE MES CON FILTRO DE FECHA
// -------------------------------------------------------------
window.cerrarMesConFiltro = async function() {
    const { value: formValues } = await Swal.fire({
        title: 'Cierre de Mes',
        html: `<p style="font-size:0.9rem; margin-bottom:10px;">Selecciona el mes. Solo los registros de ese mes se guardarán en el archivo y se quitarán de tu historial activo.</p>
            <input type="month" id="cierre-mes-input" class="swal2-input" style="width: 80%;">
            <input type="text" id="cierre-nombre-input" class="swal2-input" placeholder="Nombre (Ej. Marzo 2026)" style="width: 80%;">`,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'Archivar Registros',
        preConfirm: () => {
            const mes = document.getElementById('cierre-mes-input').value;
            const nombre = document.getElementById('cierre-nombre-input').value;
            if (!mes || !nombre) { Swal.showValidationMessage('Debes seleccionar el mes y darle un nombre al archivo.'); }
            return { mes, nombre };
        }
    });

    if (formValues) {
        const yyyy_mm = formValues.mes; 
        const nombreMes = formValues.nombre;

        const isDateInMonth = (dateStr) => {
            if(!dateStr) return false;
            const [y, m] = yyyy_mm.split('-');
            if (dateStr.startsWith(yyyy_mm)) return true; 
            const parts = dateStr.split(/[-/]/); 
            if (parts.length === 3) {
                const pYear = parts[2].substring(0,4); const pMonth = parts[1].padStart(2, '0');
                if (pYear === y && pMonth === m) return true;
            }
            return false;
        };

        const recordsDelMes = [];
        const recordsParaMantener = [];

        db.historial_movimientos.forEach(m => {
            if(isDateInMonth(m.fecha)) {
                recordsDelMes.push(m);
                if(m.tipo === 'egreso' && m.estado_gasto !== 'OK ingresado a remesas(ACMS)') {
                    recordsParaMantener.push(m); 
                }
            } else {
                recordsParaMantener.push(m);
            }
        });

        if(recordsDelMes.length === 0) return Swal.fire('Sin Registros', 'No se encontraron movimientos en la fecha seleccionada.', 'info');

        const snapshot = {
            bancos: JSON.parse(JSON.stringify(db.bancos)), saldos: JSON.parse(JSON.stringify(db.saldos)),
            porcentajes: JSON.parse(JSON.stringify(db.porcentajes)), gastosReales: JSON.parse(JSON.stringify(db.gastosReales)),
            proyectos: JSON.parse(JSON.stringify(db.proyectos)), votos: JSON.parse(JSON.stringify(db.votos)),
            historial_movimientos: recordsDelMes
        };
        
        db.archivos_mensuales[nombreMes] = snapshot;
        db.historial_movimientos = recordsParaMantener;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
        const d = document.createElement('a'); d.setAttribute("href", dataStr); d.setAttribute("download", `Cierre_${nombreMes}.json`); document.body.appendChild(d); d.click(); d.remove();

        try {
            await window.guardarEnFirebase();
            mesSeleccionadoHistorial = 'actual';
            if(document.getElementById('filtro-texto-historial')) document.getElementById('filtro-texto-historial').value = ''; 
            if(document.getElementById('filtro-dep-historial')) document.getElementById('filtro-dep-historial').value = 'TODOS'; 
            updateUI();
            Swal.fire('¡Cierre Exitoso!', `Se archivaron ${recordsDelMes.length} registros en "${nombreMes}". Las rendiciones pendientes siguen visibles.`, 'success');
        } catch(e) {}
    }
};

window.cambiarMesHistorial = function() {
    mesSeleccionadoHistorial = document.getElementById('selector-mes-historial').value;
    document.getElementById('alerta-archivo').style.display = (mesSeleccionadoHistorial === 'actual') ? 'none' : 'block';
    renderHistorial();
};

// -------------------------------------------------------------
// FUNCIONES DE REGISTRO (INGRESOS, GASTOS Y VOTOS)
// -------------------------------------------------------------
window.agregarDepartamento = async function() {
    const nombre = document.getElementById('nuevo-dep-nombre').value.trim().toUpperCase();
    if(!nombre) return mostrarAviso("Ingrese un nombre válido", "error");
    if(db.departamentos.includes(nombre)) return mostrarAviso("El departamento ya existe", "error");
    db.departamentos.push(nombre); db.porcentajes[nombre] = 0; db.gastosReales[nombre] = 0;
    try { await window.guardarEnFirebase(); document.getElementById('nuevo-dep-nombre').value = ""; mostrarAviso(`Departamento agregado`, "success"); updateUI(); renderFormularioCreacionVoto(); } catch(e) {}
};

window.agregarFondoEspecial = async function() {
    const nombre = document.getElementById('nuevo-fondo-nombre').value.trim();
    if(!nombre) return mostrarAviso("Ingrese un nombre válido", "error");
    if(db.proyectos[nombre] !== undefined) return mostrarAviso("El fondo especial ya existe", "error");
    db.proyectos[nombre] = 0;
    try { await window.guardarEnFirebase(); document.getElementById('nuevo-fondo-nombre').value = ""; mostrarAviso(`Fondo Especial creado`, "success"); updateUI(); renderFormularioCreacionVoto(); } catch(e) {}
};

function renderFormularioCreacionVoto() {
    const container = document.getElementById('voto-aportantes-container'); if(!container) return;
    const listaAportantes = [...db.departamentos, ...Object.keys(db.proyectos)]; let html = "";
    listaAportantes.forEach((dep, index) => {
        const safeId = dep.replace(/\s+/g, '_').toLowerCase() + '_' + index;
        html += `<div style="display:flex; align-items:center; gap: 8px; background:white; padding:8px; border-radius:6px; border:1px solid #eee;"><input type="checkbox" id="chk-voto-${safeId}" onchange="toggleInputVoto('${safeId}')" style="width: auto; margin:0; cursor:pointer;"><label for="chk-voto-${safeId}" style="flex:1; font-size:0.8rem; cursor:pointer; line-height:1.2;">${dep}</label><input type="number" id="input-voto-${safeId}" data-nombre="${dep}" placeholder="Cuota $" style="width: 90px; margin:0; display:none; padding:5px;" oninput="calcularTotalVoto()"></div>`;
    });
    container.innerHTML = html;
}

window.toggleInputVoto = function(safeId) {
    const chk = document.getElementById(`chk-voto-${safeId}`); const input = document.getElementById(`input-voto-${safeId}`);
    if(chk.checked) { input.style.display = 'block'; input.focus(); } else { input.style.display = 'none'; input.value = ''; }
    calcularTotalVoto();
};

window.calcularTotalVoto = function() {
    let total = 0; document.querySelectorAll('input[id^="input-voto-"]').forEach(input => { if(input.style.display !== 'none' && input.value) total += parseFloat(input.value) || 0; });
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); document.getElementById('voto-total-calc').innerText = clp.format(total); return total;
};

window.guardarVotoAvanzado = async function() {
    const nombre = document.getElementById('voto-nombre-input').value.trim();
    if(!nombre) return mostrarAviso("Ingrese un concepto para el voto", "error");
    let total = 0; let departamentos = {}; 
    document.querySelectorAll('input[id^="input-voto-"]').forEach(input => {
        if(input.style.display !== 'none') { const monto = parseFloat(input.value) || 0; const nombreDep = input.dataset.nombre; if(monto > 0) { departamentos[nombreDep] = { asignado: monto, rendido: 0 }; total += monto; } }
    });
    if(total <= 0) return mostrarAviso("Asigne un monto a por lo menos un aportante.", "error");
    const idVoto = "VOTO_" + Date.now();
    db.votos[idVoto] = { nombre: nombre, total: total, rendido: 0, activo: true, departamentos: departamentos };
    try { await window.guardarEnFirebase(); document.getElementById('voto-nombre-input').value = ""; renderFormularioCreacionVoto(); document.getElementById('voto-total-calc').innerText = "$0"; mostrarAviso("Voto creado exitosamente.", "success"); updateUI(); } catch(e) {}
};

window.cerrarVoto = async function(id) {
    if (db.votos[id]) { db.votos[id].activo = false; await window.guardarEnFirebase(); mostrarAviso("Voto cerrado manualmente", "success"); updateUI(); }
};

window.procesarIngreso = async function() {
    const monto = parseFloat(document.getElementById('monto-in').value); const cuenta = document.getElementById('cuenta-in').value; const tipo = document.getElementById('tipo-in').value; const remesa = document.getElementById('remesa-num').value; const fecha = document.getElementById('fecha-in').value;
    if(!monto || !remesa || !fecha) return mostrarAviso("Faltan datos", "error");
    db.bancos[cuenta] += monto; let meta = {};
    if(tipo === 'proyecto') {
        let pName = document.getElementById('proj-select').value;
        if(pName === 'NUEVO_CONCEPTO') { pName = document.getElementById('nuevo-concepto-nombre').value.trim(); if(!pName) return mostrarAviso("Indique nombre", "error"); if(!db.proyectos[pName]) db.proyectos[pName] = 0; }
        db.proyectos[pName] += monto; meta = { nombre: pName };
    }
    db.historial_movimientos.push({ fecha, detalle: tipo === 'proyecto' ? `Fondo Especial: ${meta.nombre}` : `Remesa ${remesa}`, monto, tipo, banco: cuenta, meta });
    try { await window.guardarEnFirebase(); document.getElementById('monto-in').value = ""; document.getElementById('remesa-num').value = ""; mostrarAviso("Fondo integrado", "success"); updateUI(); } catch(e){}
};

window.registrarGasto = async function() {
    const selectElem = document.getElementById('gasto-dep'); if(!selectElem || !selectElem.value) return mostrarAviso("Seleccione origen", "error");
    const [tipo, nombre] = selectElem.value.split(':'); const monto = parseFloat(document.getElementById('gasto-monto').value); const banco = document.getElementById('gasto-banco').value; const prop = document.getElementById('gasto-proposito').value || "Gasto"; const estadoGasto = document.getElementById('gasto-estado').value; const idVoto = document.getElementById('gasto-voto-asociado')?.value || null;
    if(!monto || monto <= 0) return mostrarAviso("Monto inválido", "error");

    db.bancos[banco] -= monto;
    if(tipo === 'PROJ') { db.proyectos[nombre] -= monto; } else { db.gastosReales[nombre] += monto; }
    
    let textoVoto = "";
    if (idVoto && db.votos[idVoto]) {
        db.votos[idVoto].rendido += monto; textoVoto = ` [Aplicado a Voto: ${db.votos[idVoto].nombre}]`;
        if (!db.votos[idVoto].departamentos) db.votos[idVoto].departamentos = {};
        if (!db.votos[idVoto].departamentos[nombre]) { db.votos[idVoto].departamentos[nombre] = { asignado: 0, rendido: 0 }; }
        db.votos[idVoto].departamentos[nombre].rendido += monto;
        if (db.votos[idVoto].rendido >= db.votos[idVoto].total) { db.votos[idVoto].activo = false; setTimeout(() => Swal.fire('¡Voto Completado!', `El Voto ha cubierto el total.`, 'success'), 1000); }
    }

    db.historial_movimientos.push({ fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'), detalle: `Gasto: ${prop} (${nombre})${textoVoto}`, monto: -monto, tipo: 'egreso', banco, meta: { tipo, nombre, id_voto: idVoto }, estado_gasto: estadoGasto });
    
    try {
        await window.guardarEnFirebase(); const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); recalcularSaldosPorcentuales();
        const saldoFinal = tipo === 'PROJ' ? db.proyectos[nombre] : db.saldos[nombre];
        Swal.fire({ title: '¡Gasto Procesado!', html: `<div style="text-align: left;"><p>Monto: <b>${clp.format(monto)}</b></p><p>Estado: <b>${estadoGasto}</b></p><p>Saldo en ${nombre}: <br><span style="color:green; font-weight:bold;">${clp.format(saldoFinal)}</span></p></div>`, icon: 'success' });
        document.getElementById('gasto-monto').value = ""; document.getElementById('gasto-proposito').value = ""; document.getElementById('gasto-estado').value = "Ingresado al sistema"; updateUI();
    } catch(e){}
};

window.anularRegistro = async function(index) {
    const { value: pass } = await Swal.fire({ title: 'Anular Registro', input: 'password', inputPlaceholder: 'Contraseña (iasdsf)', showCancelButton: true });
    if (pass === MASTER_PASS) {
        try {
            const mov = db.historial_movimientos[index];
            if (mov.banco && db.bancos[mov.banco] !== undefined) db.bancos[mov.banco] -= mov.monto;
            if (mov.tipo === 'egreso' && mov.meta) {
                if (mov.meta.tipo === 'PROJ' && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] -= mov.monto; } 
                else if (db.gastosReales[mov.meta.nombre] !== undefined) { db.gastosReales[mov.meta.nombre] += mov.monto; }
                if (mov.meta.id_voto && db.votos && db.votos[mov.meta.id_voto]) {
                    db.votos[mov.meta.id_voto].rendido += mov.monto; 
                    if (db.votos[mov.meta.id_voto].departamentos && db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre]) { db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre].rendido += mov.monto; }
                    if (db.votos[mov.meta.id_voto].rendido < db.votos[mov.meta.id_voto].total) { db.votos[mov.meta.id_voto].activo = true; }
                }
            } else if (mov.tipo === 'proyecto' && mov.meta && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] -= mov.monto; }
            db.historial_movimientos.splice(index, 1); await window.guardarEnFirebase(); updateUI(); Swal.fire('¡Eliminado!', 'Registro anulado y devuelto.', 'success');
        } catch(e) { Swal.fire('Error', 'No se pudo anular.', 'error'); }
    } else if (pass) { Swal.fire('Error', 'Contraseña incorrecta', 'error'); }
};

window.limpiarRegistros = async function() {
    const { value: pass } = await Swal.fire({ title: '¿REINICIAR TODO?', icon: 'warning', input: 'password', showCancelButton: true });
    if (pass === MASTER_PASS) {
        db.bancos = { estado: 0, chile: 0 }; db.historial_movimientos = []; db.votos = {}; db.archivos_mensuales = {}; Object.keys(db.proyectos).forEach(p => db.proyectos[p] = 0); db.departamentos.forEach(n => db.gastosReales[n] = 0);
        try { await window.guardarEnFirebase(); Swal.fire('Reiniciado', 'Datos en cero.', 'success'); updateUI(); renderFormularioCreacionVoto(); } catch(e){}
    }
};

window.guardarConfig = async function() {
    document.querySelectorAll('.in-porc').forEach(i => db.porcentajes[i.dataset.dep] = parseFloat(i.value));
    try { await window.guardarEnFirebase(); mostrarAviso("Configuración guardada", "success"); updateUI(); } catch(e){}
};

// -------------------------------------------------------------
// ACTUALIZADORES DE VISTAS (RENDER EN TIEMPO REAL)
// -------------------------------------------------------------
window.updateUI = function() {
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    
    // AQUÍ SE ACTUALIZAN LAS CASILLAS DEL DASHBOARD EN TIEMPO REAL
    const totalE = db.bancos.estado || 0;
    const totalC = db.bancos.chile || 0;
    const totalIglesia = totalE + totalC;

    document.getElementById('total-estado').innerText = clp.format(totalE); 
    document.getElementById('total-chile').innerText = clp.format(totalC);
    
    const elTotalIglesia = document.getElementById('total-iglesia');
    if(elTotalIglesia) elTotalIglesia.innerText = clp.format(totalIglesia);

    document.getElementById('grid-departamentos').innerHTML = db.departamentos.map(n => `<div class="dep-card"><h4>${n}</h4><div class="balance">${clp.format(db.saldos[n] || 0)}</div><small>${db.porcentajes[n]}% | Gastado: ${clp.format(db.gastosReales[n] || 0)}</small></div>`).join("");
    document.getElementById('grid-proyectos-reunido').innerHTML = Object.keys(db.proyectos).map(p => `<div class="dep-card" style="border-left:5px solid #c5a059"><h4>${p}</h4><div class="balance">${clp.format(db.proyectos[p] || 0)}</div></div>`).join("");

    const projIn = document.getElementById('proj-select');
    if(projIn) {
        let opts = `<option value="" disabled selected>Elegir Fondo Especial...</option>`; Object.keys(db.proyectos).forEach(p => { opts += `<option value="${p}">${p}</option>`; }); opts += `<option value="NUEVO_CONCEPTO" style="color:blue">+ Nuevo Fondo / Ofrenda Especial</option>`; projIn.innerHTML = opts;
    }

    const selectGasto = document.getElementById('gasto-dep');
    if(selectGasto) {
        let opt = '<option value="" disabled selected>Elegir Origen...</option><optgroup label="Deptos Regulares (%)">'; db.departamentos.forEach(n => opt += `<option value="DEP:${n}">${n}</option>`); opt += '</optgroup><optgroup label="Fondos Especiales">'; Object.keys(db.proyectos).forEach(p => opt += `<option value="PROJ:${p}">${p}</option>`); selectGasto.innerHTML = opt + '</optgroup>';
    }

    const selMeses = document.getElementById('selector-mes-historial');
    if(selMeses) {
        let optsMeses = `<option value="actual">-- Mostrando Historial Activo --</option>`;
        Object.keys(db.archivos_mensuales || {}).reverse().forEach(mes => { optsMeses += `<option value="${mes}">Archivo: ${mes}</option>`; });
        selMeses.innerHTML = optsMeses; selMeses.value = mesSeleccionadoHistorial;
    }

    const selFiltroDep = document.getElementById('filtro-dep-historial');
    if(selFiltroDep) {
        let currentVal = selFiltroDep.value; 
        let optsFiltro = '<option value="TODOS">-- Todos los Departamentos / Fondos --</option><optgroup label="Departamentos Regulares">';
        db.departamentos.forEach(n => optsFiltro += `<option value="${n}">${n}</option>`);
        optsFiltro += '</optgroup><optgroup label="Fondos Especiales">';
        Object.keys(db.proyectos).forEach(p => optsFiltro += `<option value="${p}">${p}</option>`);
        optsFiltro += '</optgroup>';
        selFiltroDep.innerHTML = optsFiltro;
        if(currentVal && currentVal !== "") selFiltroDep.value = currentVal; 
    }

    if(document.getElementById('tab-historial').classList.contains('active')) renderHistorial();
    if(document.getElementById('tab-config').classList.contains('active')) renderConfig();
    if(document.getElementById('tab-dashboard').classList.contains('active')) actualizarGrafico();
    
    renderVotos();
};

window.renderVotos = function() {
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    const container = document.getElementById('lista-votos-pendientes'); const select = document.getElementById('gasto-voto-asociado');
    if (!container || !select) return;

    let htmlVotos = ""; let htmlSelect = '<option value="">-- Gasto Directo Normal (No Asociado) --</option>';

    Object.keys(db.votos || {}).forEach(id => {
        const v = db.votos[id];
        if (v.activo) {
            const faltanteGlobal = v.total - v.rendido; const porcentaje = Math.min(100, (v.rendido / v.total) * 100).toFixed(1);
            let desgloseHtml = '<div style="margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px;">';
            if(v.departamentos) {
                Object.keys(v.departamentos).forEach(dep => {
                    const info = v.departamentos[dep]; const faltaDep = Math.max(0, info.asignado - info.rendido);
                    desgloseHtml += `<div class="desglose-dep"><strong>${dep}</strong><div><span style="color:#64748b; margin-right:8px;">Cuota: ${clp.format(info.asignado)}</span><span style="color:${faltaDep > 0 ? '#e74c3c' : '#2ecc71'}; font-weight:bold;">${faltaDep > 0 ? 'Falta: ' + clp.format(faltaDep) : '¡Listo!'}</span></div></div>`;
                });
            } else { desgloseHtml += `<p style="font-size:0.8rem; color:#94a3b8; font-style:italic;">Sin cuotas.</p>`; }
            desgloseHtml += '</div>';

            htmlVotos += `<div class="voto-card" style="border-left: 5px solid ${faltanteGlobal <= 0 ? '#2ecc71' : '#c5a059'};"><div class="voto-header"><strong style="font-size: 1.1rem; color: var(--primary);">${v.nombre}</strong><button onclick="cerrarVoto('${id}')" style="background:rgba(231, 76, 60, 0.1); color:#e74c3c; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.8rem; font-weight:bold;">Forzar Cierre</button></div><div style="font-size: 0.95rem; margin-top: 8px;">Aprobado: <b>${clp.format(v.total)}</b> | Rendido: <b style="color:#3498db">${clp.format(v.rendido)}</b> | Faltante: <b style="color:#e74c3c">${clp.format(Math.max(0, faltanteGlobal))}</b></div><div style="width: 100%; background: #e2e8f0; height: 10px; border-radius: 5px; margin-top: 8px; overflow: hidden;"><div style="width: ${porcentaje}%; background: ${faltanteGlobal <= 0 ? '#2ecc71' : '#c5a059'}; height: 100%; transition: width 0.3s ease;"></div></div>${desgloseHtml}</div>`;
            htmlSelect += `<option value="${id}">Asociar a Voto: ${v.nombre} (Falta general: ${clp.format(Math.max(0, faltanteGlobal))})</option>`;
        }
    });

    if (htmlVotos === "") { htmlVotos = "<p style='color:#94a3b8; font-size:0.9rem; font-style:italic; text-align:center; padding: 10px;'>No hay votos de junta pendientes.</p>"; }
    container.innerHTML = htmlVotos; select.innerHTML = htmlSelect;
};

window.showTab = function(id) {
    document.querySelectorAll('.tab-view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const target = document.getElementById('tab-' + id);
    if(target) { target.style.display = 'block'; target.classList.add('active'); }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    updateUI();
    if (window.innerWidth <= 768) { document.querySelector('.sidebar').classList.remove('active-mobile'); if(document.getElementById('sidebar-overlay')) document.getElementById('sidebar-overlay').style.display = 'none'; }
};

window.renderHistorial = function() {
    const container = document.getElementById('lista-movimientos'); if(!container) return;
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    
    let listaA_renderizar = []; const esArchivo = mesSeleccionadoHistorial !== 'actual';
    if(esArchivo && db.archivos_mensuales[mesSeleccionadoHistorial]) { listaA_renderizar = db.archivos_mensuales[mesSeleccionadoHistorial].historial_movimientos || []; } 
    else { listaA_renderizar = db.historial_movimientos; }

    const filtroTxt = (document.getElementById('filtro-texto-historial')?.value || "").toLowerCase();
    const filtroDep = document.getElementById('filtro-dep-historial')?.value || "TODOS";
    
    let listaFiltrada = listaA_renderizar.slice().reverse().map((m, indexReverse) => ({ m, realIdx: listaA_renderizar.length - 1 - indexReverse })).filter(item => {
        
        let pasaTexto = true;
        if(filtroTxt !== "") {
            pasaTexto = item.m.fecha.toLowerCase().includes(filtroTxt) || 
                        item.m.detalle.toLowerCase().includes(filtroTxt) || 
                        (item.m.meta && item.m.meta.nombre && item.m.meta.nombre.toLowerCase().includes(filtroTxt));
        }

        let pasaDep = true;
        if (filtroDep !== "TODOS") {
            pasaDep = (item.m.meta && item.m.meta.nombre === filtroDep) || (item.m.detalle && item.m.detalle.includes(`(${filtroDep})`));
        }

        return pasaTexto && pasaDep;
    });

    if(listaFiltrada.length === 0) { container.innerHTML = "<p style='text-align:center; color:#94a3b8; padding: 20px;'>No hay registros o no coinciden con la búsqueda.</p>"; return; }
    
    container.innerHTML = listaFiltrada.map(item => {
        const { m, realIdx } = item; let controlEstado = "";
        if (m.tipo === 'egreso') {
            let estadoActual = m.estado_gasto || "Ingresado al sistema"; let colorFondo = "#f39c12"; 
            if (estadoActual.includes("Rendido")) colorFondo = "#3498db"; if (estadoActual.includes("Reembolsado")) colorFondo = "#2ecc71"; if (estadoActual.includes("ACMS")) colorFondo = "#16a085"; 
            if(esArchivo) { controlEstado = `<div style="margin-top: 8px;"><span style="background:${colorFondo}; color:white; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold;">${estadoActual}</span></div>`; } 
            else { controlEstado = `<div style="margin-top: 8px; width: 100%;"><select onchange="actualizarEstadoGasto(${realIdx}, this.value)" style="background:${colorFondo}; color:white; border:none; padding:5px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold; cursor:pointer; outline:none; -webkit-appearance:none; box-shadow:0 2px 4px rgba(0,0,0,0.1); width: 100%;"><option value="Ingresado al sistema" style="background:white; color:black;" ${estadoActual === 'Ingresado al sistema' ? 'selected' : ''}>⏳ Ingresado (Pendiente)</option><option value="Rendido con boleta" style="background:white; color:black;" ${estadoActual === 'Rendido con boleta' ? 'selected' : ''}>🧾 Rendido con Boleta</option><option value="Reembolsado (X Rendir Boleta)" style="background:white; color:black;" ${estadoActual === 'Reembolsado (X Rendir Boleta)' ? 'selected' : ''}>✅ Reembolsado al Hno/a</option><option value="OK ingresado a remesas(ACMS)" style="background:white; color:black;" ${estadoActual === 'OK ingresado a remesas(ACMS)' ? 'selected' : ''}>✔️ OK Ingresado a Remesas(ACMS)</option></select></div>`; }
        }
        let btnEliminar = esArchivo ? '' : `<button onclick="anularRegistro(${realIdx})" style="background:rgba(231, 76, 60, 0.1); border:none; color:#e74c3c; cursor:pointer; margin-left:15px; width:35px; height:35px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:0.3s;" title="Anular Registro"><i class="fas fa-trash"></i></button>`;

        return `<div class="rendicion-item" style="border-left: 5px solid ${m.monto > 0 ? '#2ecc71' : '#e74c3c'}; opacity: ${esArchivo ? '0.85' : '1'};"><div class="historial-info"><span style="font-size: 0.95rem;"><strong>${m.fecha}</strong> - ${m.detalle}</span>${controlEstado}</div><div class="historial-actions"><strong style="color:${m.monto > 0 ? '#2ecc71' : '#e74c3c'}; font-size:1.1rem;">${clp.format(m.monto)}</strong>${btnEliminar}</div></div>`;
    }).join("");
};

window.renderConfig = function() {
    const container = document.getElementById('inputs-porcentajes'); const containerFondos = document.getElementById('lista-config-fondos'); const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    if(!container || !containerFondos) return;

    container.innerHTML = db.departamentos.map(n => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:10px; background:#f8fafc; border-radius:8px; border: 1px solid #e2e8f0;">
            <div style="display:flex; align-items:center; gap: 5px;">
                <button onclick="editarDepartamento('${n}')" class="btn-edit-icon" title="Editar Nombre"><i class="fas fa-edit"></i></button>
                <button onclick="eliminarDepartamento('${n}')" class="btn-delete-icon" title="Eliminar"><i class="fas fa-trash"></i></button>
                <label style="font-weight:600; margin-left: 5px;">${n}</label>
            </div>
            <div style="display:flex; align-items:center; gap:5px;"><input type="number" class="in-porc" data-dep="${n}" value="${db.porcentajes[n] || 0}" oninput="validarSuma()" style="width:70px; text-align:right; margin:0;"><strong>%</strong></div>
        </div>`).join("");
    
    let htmlFondos = "";
    Object.keys(db.proyectos).forEach(p => {
        htmlFondos += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:10px; background:#fdfbf7; border-radius:8px; border: 1px solid #c5a059;">
            <div style="display:flex; align-items:center; gap: 5px;">
                <button onclick="editarFondo('${p}')" class="btn-edit-icon" title="Editar Nombre"><i class="fas fa-edit"></i></button>
                <button onclick="eliminarFondo('${p}')" class="btn-delete-icon" title="Eliminar"><i class="fas fa-trash"></i></button>
                <label style="font-weight:600; margin-left: 5px;">${p}</label>
            </div>
            <strong style="color: var(--primary);">${clp.format(db.proyectos[p] || 0)}</strong>
        </div>`;
    });
    
    if(htmlFondos === "") htmlFondos = "<p style='font-size:0.85rem; color:#94a3b8;'>No hay fondos especiales registrados.</p>";
    containerFondos.innerHTML = htmlFondos; validarSuma();
};

window.validarSuma = function() {
    let suma = 0; document.querySelectorAll('.in-porc').forEach(i => suma += parseFloat(i.value) || 0); const bar = document.getElementById('check-total');
    if(bar) { bar.innerText = `Suma Total: ${suma.toFixed(2)}%`; const ok = Math.abs(suma - 100) < 0.1; bar.style.color = ok ? "green" : "red"; document.getElementById('btn-guardar-config').disabled = !ok; }
};

function actualizarGrafico() {
    const canvas = document.getElementById('chartPresupuesto'); if(!canvas) return; const ctx = canvas.getContext('2d'); if(miGrafico) miGrafico.destroy();
    miGrafico = new Chart(ctx, { type: 'doughnut', data: { labels: db.departamentos, datasets: [{ data: db.departamentos.map(n => Math.max(0, db.saldos[n] || 0)), backgroundColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b', '#16a085', '#27ae60'] }] }, options: { responsive: true, maintainAspectRatio: false } });
}

window.mostrarAviso = function(m, t) { const toast = document.createElement('div'); toast.className = `toast ${t}`; toast.innerText = m; document.getElementById('toast-container').appendChild(toast); setTimeout(() => toast.remove(), 3000); };

window.verTotalGeneral = function() { 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0); 
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0); 
    Swal.fire({ 
        title: 'Desglose del Patrimonio', 
        html: `
        <div style="text-align:left; font-size:1.1rem;">
            <p>Total en Bancos: <b>${clp.format(totalB)}</b></p>
            <p>Total en Fondos Especiales: <b style="color:#c5a059;">${clp.format(totalP)}</b></p>
            <hr>
            <p style="color: green;">Dinero Líquido para Distribuir (%): <b>${clp.format(totalB - totalP)}</b></p>
        </div>`, 
        icon: 'info' 
    }); 
};

window.descargarCopia = function() { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); const d = document.createElement('a'); d.setAttribute("href", dataStr); d.setAttribute("download", "Respaldo_Tesoreria.json"); document.body.appendChild(d); d.click(); d.remove(); };
window.toggleInputs = function() { document.getElementById('wrapper-proyecto').style.display = (document.getElementById('tipo-in').value === 'proyecto') ? 'block' : 'none'; };
window.checkNuevoConcepto = function() { document.getElementById('nuevo-concepto-nombre').style.display = (document.getElementById('proj-select').value === 'NUEVO_CONCEPTO') ? 'block' : 'none'; };
window.toggleSidebar = function() { const sb = document.querySelector('.sidebar'); sb.classList.toggle('active-mobile'); const overlay = document.getElementById('sidebar-overlay'); if(overlay) overlay.style.display = sb.classList.contains('active-mobile') ? 'block' : 'none'; };

window.generarReportePDF = async function() {
    mostrarAviso("Generando documento oficial...", "info"); const { jsPDF } = window.jspdf; const doc = new jsPDF(); const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); const fechaActual = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    try { const img = new Image(); img.src = 'logo.jpg'; await new Promise((res) => { img.onload = res; img.onerror = res; }); if (img.complete && img.naturalHeight !== 0) doc.addImage(img, 'JPEG', 15, 12, 25, 25); } catch(e) {}
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("IGLESIA ADVENTISTA DEL SÉPTIMO DÍA", 105, 20, { align: "center" }); doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("San Francisco de Limache", 105, 27, { align: "center" }); doc.text("Reporte de Tesorería para Junta Administrativa", 105, 33, { align: "center" }); doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.text(`Fecha de emisión: ${fechaActual}`, 105, 42, { align: "center" });
    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0); const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    doc.autoTable({ startY: 50, head: [['Resumen Consolidado', 'Monto']], body: [ ['Saldo Total en Bancos', clp.format(totalB)], ['Fondo Reservado Especial', clp.format(totalP)], ['Neto Disponible Departamentos', clp.format(totalB - totalP)] ], theme: 'striped', headStyles: { fillColor: [197, 160, 89] } });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 15, head: [['Departamento', '% Asignado', 'Gastado', 'Saldo Disponible']], body: db.departamentos.map(n => [ n, (db.porcentajes[n] || 0) + '%', clp.format(db.gastosReales[n] || 0), clp.format(db.saldos[n] || 0) ]), headStyles: { fillColor: [10, 25, 47] } });
    const finalY = doc.lastAutoTable.finalY;
    if (finalY < 250) { doc.setLineWidth(0.5); doc.line(40, finalY + 30, 90, finalY + 30); doc.line(120, finalY + 30, 170, finalY + 30); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Firma Tesorería", 65, finalY + 35, { align: "center" }); doc.text("Firma Pastor / Anciano", 145, finalY + 35, { align: "center" }); }
    doc.save(`Reporte_Junta_Limache_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.pdf`); Swal.fire({ title: 'Reporte Generado', text: 'El documento PDF oficial ha sido descargado.', icon: 'success', confirmButtonColor: '#c5a059' });
};

window.actualizarEstadoGasto = async function(index, nuevoEstado) {
    if(db.historial_movimientos[index]) { db.historial_movimientos[index].estado_gasto = nuevoEstado; try { await window.guardarEnFirebase(); renderHistorial(); mostrarAviso("Estado actualizado", "success"); } catch(e) {} }
};

document.addEventListener('DOMContentLoaded', () => { document.getElementById('login-screen').style.display = 'flex'; });