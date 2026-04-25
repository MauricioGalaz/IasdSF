import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
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

let db = { 
    bancos: { estado: 0, chile: 0 }, 
    saldos: {}, 
    porcentajes: {}, 
    gastosReales: {}, 
    historial_movimientos: [], 
    proyectos: { "Equipos Sonido y Butacas": 0 }, 
    votos: {}, 
    departamentos: [], 
    archivos_mensuales: {} 
};

let miGrafico = null;
let mesSeleccionadoHistorial = 'actual';

// ==========================================
// 2. INICIALIZACIÓN Y BASE DE DATOS
// ==========================================
window.validarAcceso = function() {
    const pass = document.getElementById('input-pass').value;
    if (pass === "tesoriasd") {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        const docRef = doc(dbFirestore, "tesoreria", "limache_actual");
        onSnapshot(docRef, (docSnap) => { 
            if (docSnap.exists()) { db = docSnap.data(); } 
            inicializarDB(); 
        }, (error) => { 
            alert("Error de permisos en Firebase."); 
        });
    } else { 
        Swal.fire({ title: 'Contraseña Incorrecta', icon: 'error' }); 
    }
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
    } catch (e) { 
        alert("El servidor rechazó los datos. Error: " + e.message); 
        throw e; 
    }
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

function recalcularSaldosPorcentuales() {
    const totalBancos = (db.bancos.estado || 0) + (db.bancos.chile || 0);
    const totalEnProyectos = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    const totalGastadoDeptos = db.departamentos.reduce((acc, dep) => acc + (db.gastosReales[dep] || 0), 0);
    
    const patrimonioNetoHistorico = Math.max(0, (totalBancos - totalEnProyectos) + totalGastadoDeptos);

    db.departamentos.forEach(n => {
        const asignacionIdeal = (patrimonioNetoHistorico * (db.porcentajes[n] / 100));
        db.saldos[n] = asignacionIdeal - (db.gastosReales[n] || 0);
    });
}

// ==========================================
// 3. TRANSFERENCIAS Y AJUSTES DE BANCOS Y DEPTOS
// ==========================================
window.corregirSaldoBanco = async function() {
    const banco = document.getElementById('correccion-banco').value;
    const nuevoSaldo = parseFloat(document.getElementById('correccion-monto').value);
    
    if(isNaN(nuevoSaldo) || nuevoSaldo < 0) return mostrarAviso("Monto inválido", "error");

    const pass = await Swal.fire({
        title: 'Autorización',
        text: 'Ingresa la clave maestra para fijar el saldo exacto del banco.',
        input: 'password',
        inputPlaceholder: 'Contraseña (iasdsf)'
    });

    if (pass.value === MASTER_PASS) {
        const saldoAnterior = db.bancos[banco] || 0;
        const diferencia = nuevoSaldo - saldoAnterior;
        
        if(diferencia === 0) return mostrarAviso("El saldo ya es igual a ese monto", "info");

        db.bancos[banco] = nuevoSaldo;
        const nombreBanco = banco === 'chile' ? 'Banco Chile' : 'BancoEstado';
        
        db.historial_movimientos.push({
            fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'),
            detalle: `Ajuste/Corrección Manual Directa en ${nombreBanco}`,
            monto: diferencia,
            tipo: 'ajuste_banco_directo',
            banco: banco,
            meta: { saldoAnterior, nuevoSaldo }
        });

        try {
            await window.guardarEnFirebase();
            recalcularSaldosPorcentuales();
            document.getElementById('correccion-monto').value = "";
            updateUI();
            Swal.fire('¡Banco Actualizado!', `El saldo de ${nombreBanco} se ha fijado en $${nuevoSaldo}.`, 'success');
        } catch(e) {}
    } else if (pass.value) {
        mostrarAviso("Contraseña incorrecta", "error");
    }
};

window.corregirSaldoDepartamento = async function() {
    const nombre = document.getElementById('correccion-dep').value;
    const nuevoSaldo = parseFloat(document.getElementById('correccion-monto-dep').value);

    if(!nombre) return mostrarAviso("Seleccione un departamento", "error");
    if(isNaN(nuevoSaldo) || nuevoSaldo < 0) return mostrarAviso("Monto inválido", "error");

    const saldoActual = db.saldos[nombre] || 0;
    const diferencia = nuevoSaldo - saldoActual;

    if(Math.abs(diferencia) < 1) return mostrarAviso("El saldo ya es igual a ese monto", "info");

    const pass = await Swal.fire({
        title: 'Autorización',
        text: `Esto ajustará matemáticamente a ${nombre} al monto exacto de $${nuevoSaldo}.`,
        input: 'password',
        inputPlaceholder: 'Contraseña (iasdsf)'
    });

    if (pass.value === MASTER_PASS) {
        const ajusteProjName = "AJUSTES DE CUADRATURA";
        if(db.proyectos[ajusteProjName] === undefined) db.proyectos[ajusteProjName] = 0;

        if (diferencia < 0) {
            const absDiff = Math.abs(diferencia);
            db.gastosReales[nombre] += absDiff;
            db.proyectos[ajusteProjName] += absDiff;
            db.historial_movimientos.push({
                fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'),
                detalle: `Ajuste Matemático Exacto (Baja en ${nombre})`,
                monto: absDiff,
                tipo: 'transferencia',
                meta: { origenVal: `DEP:${nombre}`, destinoVal: `PROJ:${ajusteProjName}`, monto: absDiff, nombreO: nombre, nombreD: ajusteProjName }
            });
        } else {
            db.gastosReales[nombre] -= diferencia;
            db.proyectos[ajusteProjName] -= diferencia;
            db.historial_movimientos.push({
                fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'),
                detalle: `Ajuste Matemático Exacto (Sube en ${nombre})`,
                monto: diferencia,
                tipo: 'transferencia',
                meta: { origenVal: `PROJ:${ajusteProjName}`, destinoVal: `DEP:${nombre}`, monto: diferencia, nombreO: ajusteProjName, nombreD: nombre }
            });
        }

        try {
            await window.guardarEnFirebase();
            recalcularSaldosPorcentuales();
            document.getElementById('correccion-monto-dep').value = "";
            updateUI();
            Swal.fire('¡Saldo Actualizado!', `El saldo de ${nombre} se ha fijado en $${nuevoSaldo}. La cuadratura funcionará en segundo plano.`, 'success');
        } catch(e) {}
    } else if (pass.value) {
        mostrarAviso("Contraseña incorrecta", "error");
    }
};

window.procesarTransferenciaBanco = async function() {
    const origen = document.getElementById('trans-banco-origen').value;
    const destino = document.getElementById('trans-banco-destino').value;
    const monto = parseFloat(document.getElementById('trans-banco-monto').value);
    const motivo = document.getElementById('trans-banco-motivo').value || "Ajuste de Saldo";

    if (!origen || !destino) return mostrarAviso("Seleccione banco de origen y destino.", "error");
    if (origen === destino) return mostrarAviso("El origen y destino no pueden ser el mismo.", "error");
    if (!monto || monto <= 0) return mostrarAviso("Monto inválido.", "error");

    if ((db.bancos[origen] || 0) < monto) {
        const nom = origen === 'estado' ? 'BancoEstado' : 'Banco Chile';
        return mostrarAviso(`Saldo insuficiente en ${nom}.`, "error");
    }

    db.bancos[origen] -= monto;
    db.bancos[destino] += monto;

    const nomO = origen === 'estado' ? 'BancoEstado' : 'Banco Chile';
    const nomD = destino === 'estado' ? 'BancoEstado' : 'Banco Chile';

    db.historial_movimientos.push({
        fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'),
        detalle: `Ajuste Bancos: ${motivo} (De ${nomO} a ${nomD})`,
        monto: monto, 
        tipo: 'transferencia_banco',
        meta: { origen, destino, monto, nomO, nomD }
    });

    try {
        await window.guardarEnFirebase();
        recalcularSaldosPorcentuales();
        document.getElementById('trans-banco-monto').value = ""; document.getElementById('trans-banco-motivo').value = "";
        document.getElementById('trans-banco-origen').value = ""; document.getElementById('trans-banco-destino').value = "";
        updateUI();
        Swal.fire('Ajuste Exitoso', `Se movieron $${monto} de ${nomO} a ${nomD}.`, 'success');
    } catch (e) {}
};

window.procesarTransferencia = async function() {
    const origenVal = document.getElementById('trans-origen').value;
    const destinoVal = document.getElementById('trans-destino').value;
    const monto = parseFloat(document.getElementById('trans-monto').value);
    const motivo = document.getElementById('trans-motivo').value || "Apoyo de fondos";

    if (!origenVal || !destinoVal) return mostrarAviso("Seleccione un origen y un destino.", "error");
    if (origenVal === destinoVal) return mostrarAviso("El origen no puede ser el mismo que el destino.", "error");
    if (!monto || monto <= 0) return mostrarAviso("Monto inválido.", "error");

    const [tipoO, nombreO] = origenVal.split(':');
    const [tipoD, nombreD] = destinoVal.split(':');

    const saldoOrigen = tipoO === 'PROJ' ? (db.proyectos[nombreO] || 0) : (db.saldos[nombreO] || 0);
    if (monto > saldoOrigen) return mostrarAviso(`Saldo insuficiente en ${nombreO} (Disponible: $${saldoOrigen.toFixed(0)})`, "error");

    if (tipoO === 'PROJ') { db.proyectos[nombreO] -= monto; } else { db.gastosReales[nombreO] += monto; }
    if (tipoD === 'PROJ') { db.proyectos[nombreD] += monto; } else { db.gastosReales[nombreD] -= monto; }

    db.historial_movimientos.push({
        fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'),
        detalle: `Traspaso Interno: ${motivo} (De ${nombreO} a ${nombreD})`,
        monto: monto, 
        tipo: 'transferencia',
        meta: { origenVal, destinoVal, monto, nombreO, nombreD }
    });

    try {
        await window.guardarEnFirebase();
        recalcularSaldosPorcentuales();
        document.getElementById('trans-monto').value = ""; document.getElementById('trans-motivo').value = "";
        document.getElementById('trans-origen').value = ""; document.getElementById('trans-destino').value = "";
        updateUI();
        Swal.fire('Transferencia Exitosa', `Se movieron $${monto} de ${nombreO} a ${nombreD} sin alterar bancos.`, 'success');
    } catch (e) {}
};

// ==========================================
// 4. INGRESOS Y EGRESOS NORMALES (LÓGICA AUTOMÁTICA)
// ==========================================
window.procesarIngreso = async function() {
    const monto = parseFloat(document.getElementById('monto-in').value); 
    const cuenta = document.getElementById('cuenta-in').value; 
    const tipo = document.getElementById('tipo-in').value; 
    const remesa = document.getElementById('remesa-num').value; 
    const fecha = document.getElementById('fecha-in').value;

    if(!monto || !remesa || !fecha) return mostrarAviso("Faltan datos", "error");
    
    // El dinero ingresa real y físicamente al Banco elegido
    db.bancos[cuenta] += monto; 
    let meta = {};

    if(tipo === 'proyecto') {
        let pName = document.getElementById('proj-select').value;
        if(pName === 'NUEVO_CONCEPTO') { 
            pName = document.getElementById('nuevo-concepto-nombre').value.trim(); 
            if(!pName) return mostrarAviso("Indique nombre", "error"); 
            if(!db.proyectos[pName]) db.proyectos[pName] = 0; 
        }
        db.proyectos[pName] += monto; 
        meta = { nombre: pName };
    }
    db.historial_movimientos.push({ 
        fecha, 
        detalle: tipo === 'proyecto' ? `Fondo Especial: ${meta.nombre}` : `Remesa: ${remesa}`, 
        monto, 
        tipo, 
        banco: cuenta, 
        meta 
    });

    try { 
        await window.guardarEnFirebase(); 
        document.getElementById('monto-in').value = ""; 
        document.getElementById('remesa-num').value = ""; 
        mostrarAviso("Ingreso registrado. Distribución aplicada automáticamente.", "success"); 
        updateUI(); 
    } catch(e){}
};

window.registrarGasto = async function() {
    const selectElem = document.getElementById('gasto-dep'); 
    if(!selectElem || !selectElem.value) return mostrarAviso("Seleccione origen", "error");
    
    const [tipo, nombre] = selectElem.value.split(':'); 
    const monto = parseFloat(document.getElementById('gasto-monto').value); 
    const banco = document.getElementById('gasto-banco').value; 
    const prop = document.getElementById('gasto-proposito').value || "Gasto"; 
    const estadoGasto = document.getElementById('gasto-estado').value; 
    const idVoto = document.getElementById('gasto-voto-asociado')?.value || null;
    
    if(!monto || monto <= 0) return mostrarAviso("Monto inválido", "error");

    // El dinero sale real y físicamente del banco elegido
    db.bancos[banco] -= monto;
    
    // Descuenta el dinero exactamente al departamento elegido
    if(tipo === 'PROJ') { db.proyectos[nombre] -= monto; } else { db.gastosReales[nombre] += monto; }
    
    let textoVoto = "";
    if (idVoto && db.votos[idVoto]) {
        db.votos[idVoto].rendido += monto; 
        textoVoto = ` [Aplicado a Voto: ${db.votos[idVoto].nombre}]`;
        if (!db.votos[idVoto].departamentos) db.votos[idVoto].departamentos = {};
        if (!db.votos[idVoto].departamentos[nombre]) { db.votos[idVoto].departamentos[nombre] = { asignado: 0, rendido: 0 }; }
        db.votos[idVoto].departamentos[nombre].rendido += monto;
        if (db.votos[idVoto].rendido >= db.votos[idVoto].total) { 
            db.votos[idVoto].activo = false; 
            setTimeout(() => Swal.fire('¡Voto Completado!', `El Voto ha cubierto el total.`, 'success'), 1000); 
        }
    }

    db.historial_movimientos.push({ 
        fecha: new Date().toLocaleDateString('es-CL').split('-').reverse().join('-'), 
        detalle: `Gasto: ${prop} (${nombre})${textoVoto}`, 
        monto: -monto, 
        tipo: 'egreso', 
        banco, 
        meta: { tipo, nombre, id_voto: idVoto }, 
        estado_gasto: estadoGasto 
    });
    
    try {
        await window.guardarEnFirebase(); 
        const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
        recalcularSaldosPorcentuales();
        const saldoFinal = tipo === 'PROJ' ? db.proyectos[nombre] : db.saldos[nombre];
        
        Swal.fire({ 
            title: '¡Gasto Procesado!', 
            html: `<div style="text-align: left;"><p>Monto rebajado: <b>${clp.format(monto)}</b></p><p>Estado: <b>${estadoGasto}</b></p><p>Saldo actualizado en ${nombre}: <br><span style="color:green; font-weight:bold;">${clp.format(saldoFinal)}</span></p></div>`, 
            icon: 'success' 
        });
        
        document.getElementById('gasto-monto').value = ""; 
        document.getElementById('gasto-proposito').value = ""; 
        document.getElementById('gasto-estado').value = "Ingresado al sistema"; 
        updateUI();
    } catch(e){}
};

// ==========================================
// 5. EDICIÓN Y ANULACIÓN DE REGISTROS 
// ==========================================
window.editarRegistro = async function(index, mesContext = 'actual') {
    const targetArray = mesContext === 'actual' ? db.historial_movimientos : db.archivos_mensuales[mesContext].historial_movimientos;
    const mov = targetArray[index];
    
    let valFecha = mov.fecha;
    if(valFecha.includes('-')) {
        const parts = valFecha.split('-');
        if(parts[0].length <= 2) {
            valFecha = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    const { value: formValues } = await Swal.fire({
        title: '✏️ Editar Registro',
        html: `
            <div style="text-align: left; font-size: 0.95rem; width: 100%;">
                <label style="color: var(--primary); font-weight:bold; display:block; margin-top: 10px;">Fecha:</label>
                <input type="date" id="swal-edit-fecha" class="swal2-input" value="${valFecha}" style="width: 100% !important; margin: 5px 0 10px 0;">
                
                <label style="color: var(--primary); font-weight:bold; display:block;">Detalle / Remesa:</label>
                <input type="text" id="swal-edit-detalle" class="swal2-input" value="${mov.detalle}" style="width: 100% !important; margin: 5px 0 10px 0;">
                
                <label style="color: var(--primary); font-weight:bold; display:block;">Monto $:</label>
                <input type="number" id="swal-edit-monto" class="swal2-input" value="${Math.abs(mov.monto)}" style="width: 100% !important; margin: 5px 0 10px 0;">
                
                <label style="color: #e74c3c; font-weight:bold; display:block; margin-top: 15px;"><i class="fas fa-lock"></i> Contraseña Maestra:</label>
                <input type="password" id="swal-edit-pass" class="swal2-input" placeholder="Para confirmar cambios" style="width: 100% !important; margin: 5px 0;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'swal-mobile-adjust' },
        preConfirm: () => {
            const pass = document.getElementById('swal-edit-pass').value;
            if(pass !== MASTER_PASS) { Swal.showValidationMessage('Contraseña incorrecta'); return false; }
            const m = parseFloat(document.getElementById('swal-edit-monto').value);
            if(!m || m <= 0) { Swal.showValidationMessage('El monto debe ser mayor a 0'); return false; }
            return {
                fecha: document.getElementById('swal-edit-fecha').value,
                detalle: document.getElementById('swal-edit-detalle').value,
                monto: m
            }
        }
    });

    if (formValues) {
        const oldMonto = Math.abs(mov.monto);
        const newMonto = formValues.monto;
        const diff = newMonto - oldMonto;

        mov.fecha = formValues.fecha; 
        mov.detalle = formValues.detalle;

        if (diff !== 0) {
            if (mov.tipo === 'ajuste_banco_directo') {
                 const signoOriginal = mov.monto > 0 ? 1 : -1;
                 const diferenciaReal = (newMonto * signoOriginal) - mov.monto;
                 db.bancos[mov.banco] += diferenciaReal;
                 mov.monto = newMonto * signoOriginal;
                 if(mov.meta) { mov.meta.nuevoSaldo = (mov.meta.saldoAnterior || 0) + mov.monto; }
            } else {
                if (mov.banco && db.bancos[mov.banco] !== undefined) db.bancos[mov.banco] -= mov.monto;
                if (mov.tipo === 'transferencia_banco' && mov.meta) {
                    db.bancos[mov.meta.origen] += mov.meta.monto;
                    db.bancos[mov.meta.destino] -= mov.meta.monto;
                } else if (mov.tipo === 'transferencia' && mov.meta) {
                    const [tipoO, nombreO] = mov.meta.origenVal.split(':'); const [tipoD, nombreD] = mov.meta.destinoVal.split(':');
                    if (tipoO === 'PROJ' && db.proyectos[nombreO] !== undefined) { db.proyectos[nombreO] += mov.meta.monto; } else if (db.gastosReales[nombreO] !== undefined) { db.gastosReales[nombreO] -= mov.meta.monto; }
                    if (tipoD === 'PROJ' && db.proyectos[nombreD] !== undefined) { db.proyectos[nombreD] -= mov.meta.monto; } else if (db.gastosReales[nombreD] !== undefined) { db.gastosReales[nombreD] += mov.meta.monto; }
                } else {
                    if (mov.tipo === 'egreso' && mov.meta) {
                        if (mov.meta.tipo === 'PROJ' && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] -= mov.monto; } 
                        else if (db.gastosReales[mov.meta.nombre] !== undefined) { db.gastosReales[mov.meta.nombre] += mov.monto; }
                        if (mov.meta.id_voto && db.votos && db.votos[mov.meta.id_voto]) {
                            db.votos[mov.meta.id_voto].rendido += mov.monto; 
                            if (db.votos[mov.meta.id_voto].departamentos && db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre]) { db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre].rendido += mov.monto; }
                        }
                    } else if (mov.tipo === 'proyecto' && mov.meta && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] -= mov.monto; }
                }

                mov.monto = (mov.monto < 0) ? -newMonto : newMonto;
                if(mov.meta && mov.meta.monto) mov.meta.monto = newMonto;

                if (mov.banco && db.bancos[mov.banco] !== undefined) db.bancos[mov.banco] += mov.monto;
                if (mov.tipo === 'transferencia_banco' && mov.meta) {
                    db.bancos[mov.meta.origen] -= mov.meta.monto;
                    db.bancos[mov.meta.destino] += mov.meta.monto;
                } else if (mov.tipo === 'transferencia' && mov.meta) {
                    const [tipoO, nombreO] = mov.meta.origenVal.split(':'); const [tipoD, nombreD] = mov.meta.destinoVal.split(':');
                    if (tipoO === 'PROJ' && db.proyectos[nombreO] !== undefined) { db.proyectos[nombreO] -= mov.meta.monto; } else if (db.gastosReales[nombreO] !== undefined) { db.gastosReales[nombreO] += mov.meta.monto; }
                    if (tipoD === 'PROJ' && db.proyectos[nombreD] !== undefined) { db.proyectos[nombreD] += mov.meta.monto; } else if (db.gastosReales[nombreD] !== undefined) { db.gastosReales[nombreD] -= mov.meta.monto; }
                } else {
                    if (mov.tipo === 'egreso' && mov.meta) {
                        if (mov.meta.tipo === 'PROJ' && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] += mov.monto; } 
                        else if (db.gastosReales[mov.meta.nombre] !== undefined) { db.gastosReales[mov.meta.nombre] -= mov.monto; }
                        if (mov.meta.id_voto && db.votos && db.votos[mov.meta.id_voto]) {
                            db.votos[mov.meta.id_voto].rendido -= mov.monto; 
                            if (db.votos[mov.meta.id_voto].departamentos && db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre]) { db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre].rendido -= mov.monto; }
                            if (db.votos[mov.meta.id_voto].rendido < db.votos[mov.meta.id_voto].total) db.votos[mov.meta.id_voto].activo = true;
                            if (db.votos[mov.meta.id_voto].rendido >= db.votos[mov.meta.id_voto].total) db.votos[mov.meta.id_voto].activo = false;
                        }
                    } else if (mov.tipo === 'proyecto' && mov.meta && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] += mov.monto; }
                }
            }
        }

        try {
            await window.guardarEnFirebase();
            updateUI();
            Swal.fire('¡Actualizado!', 'El registro fue editado y los saldos han sido ajustados matemáticamente.', 'success');
        } catch(e) {
            Swal.fire('Error', 'No se pudo editar.', 'error');
        }
    }
};

window.anularRegistro = async function(index, mesContext = 'actual') {
    const { value: pass } = await Swal.fire({ 
        title: '¿Eliminar / Anular Registro?', 
        text: 'El dinero volverá a su lugar de origen y los saldos actuales se ajustarán.', 
        input: 'password', 
        inputPlaceholder: 'Contraseña Maestra (iasdsf)', 
        showCancelButton: true, 
        confirmButtonColor: '#e74c3c', 
        confirmButtonText: 'Sí, Eliminar' 
    });

    if (pass === MASTER_PASS) {
        try {
            const targetArray = mesContext === 'actual' ? db.historial_movimientos : db.archivos_mensuales[mesContext].historial_movimientos;
            const mov = targetArray[index];
            
            if (mov.tipo === 'ajuste_banco_directo') {
                db.bancos[mov.banco] -= mov.monto;
            } else if (mov.tipo === 'transferencia_banco' && mov.meta) {
                db.bancos[mov.meta.origen] += mov.meta.monto;
                db.bancos[mov.meta.destino] -= mov.meta.monto;
            } else if (mov.tipo === 'transferencia' && mov.meta) {
                const [tipoO, nombreO] = mov.meta.origenVal.split(':'); 
                const [tipoD, nombreD] = mov.meta.destinoVal.split(':'); 
                const m = mov.meta.monto;
                if (tipoO === 'PROJ' && db.proyectos[nombreO] !== undefined) { db.proyectos[nombreO] += m; } else if (db.gastosReales[nombreO] !== undefined) { db.gastosReales[nombreO] -= m; }
                if (tipoD === 'PROJ' && db.proyectos[nombreD] !== undefined) { db.proyectos[nombreD] -= m; } else if (db.gastosReales[nombreD] !== undefined) { db.gastosReales[nombreD] += m; }
            } else {
                if (mov.banco && db.bancos[mov.banco] !== undefined) db.bancos[mov.banco] -= mov.monto;
                if (mov.tipo === 'egreso' && mov.meta) {
                    if (mov.meta.tipo === 'PROJ' && db.proyectos[mov.meta.nombre] !== undefined) { db.proyectos[mov.meta.nombre] -= mov.monto; } 
                    else if (db.gastosReales[mov.meta.nombre] !== undefined) { db.gastosReales[mov.meta.nombre] += mov.monto; }
                    
                    if (mov.meta.id_voto && db.votos && db.votos[mov.meta.id_voto]) {
                        db.votos[mov.meta.id_voto].rendido += mov.monto; 
                        if (db.votos[mov.meta.id_voto].departamentos && db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre]) { 
                            db.votos[mov.meta.id_voto].departamentos[mov.meta.nombre].rendido += mov.monto; 
                        }
                        if (db.votos[mov.meta.id_voto].rendido < db.votos[mov.meta.id_voto].total) { 
                            db.votos[mov.meta.id_voto].activo = true; 
                        }
                    }
                } else if (mov.tipo === 'proyecto' && mov.meta && db.proyectos[mov.meta.nombre] !== undefined) { 
                    db.proyectos[mov.meta.nombre] -= mov.monto; 
                }
            }
            
            targetArray.splice(index, 1); 
            await window.guardarEnFirebase(); 
            updateUI(); 
            Swal.fire('¡Eliminado!', 'Registro anulado y dinero devuelto.', 'success');
        } catch(e) { 
            Swal.fire('Error', 'No se pudo anular.', 'error'); 
        }
    } else if (pass) { 
        Swal.fire('Error', 'Contraseña incorrecta', 'error'); 
    }
};

window.actualizarEstadoGasto = async function(index, nuevoEstado, mesContext = 'actual') {
    const targetArray = mesContext === 'actual' ? db.historial_movimientos : db.archivos_mensuales[mesContext].historial_movimientos;
    if(targetArray[index]) { 
        targetArray[index].estado_gasto = nuevoEstado; 
        try { 
            await window.guardarEnFirebase(); 
            renderHistorial();
            renderBoletasPendientes(); 
            mostrarAviso("Estado actualizado", "success"); 
        } catch(e) {} 
    }
};

// ==========================================
// 6. GESTIÓN DE CONFIGURACIÓN Y DEPARTAMENTOS
// ==========================================
window.agregarDepartamento = async function() { 
    const nombre = document.getElementById('nuevo-dep-nombre').value.trim().toUpperCase(); 
    if(!nombre) return mostrarAviso("Ingrese un nombre válido", "error"); 
    if(db.departamentos.includes(nombre)) return mostrarAviso("El departamento ya existe", "error"); 
    
    db.departamentos.push(nombre); 
    db.porcentajes[nombre] = 0; 
    db.gastosReales[nombre] = 0; 
    
    try { 
        await window.guardarEnFirebase(); 
        document.getElementById('nuevo-dep-nombre').value = ""; 
        mostrarAviso(`Departamento agregado`, "success"); 
        updateUI(); 
        renderFormularioCreacionVoto(); 
    } catch(e) {} 
};

window.agregarFondoEspecial = async function() { 
    const nombre = document.getElementById('nuevo-fondo-nombre').value.trim(); 
    if(!nombre) return mostrarAviso("Ingrese un nombre válido", "error"); 
    if(db.proyectos[nombre] !== undefined) return mostrarAviso("El fondo especial ya existe", "error"); 
    
    db.proyectos[nombre] = 0; 
    
    try { 
        await window.guardarEnFirebase(); 
        document.getElementById('nuevo-fondo-nombre').value = ""; 
        mostrarAviso(`Fondo Especial creado`, "success"); 
        updateUI(); 
        renderFormularioCreacionVoto(); 
    } catch(e) {} 
};

window.editarDepartamento = async function(oldName) { 
    const { value: newNameRaw } = await Swal.fire({ 
        title: 'Editar Departamento', input: 'text', inputValue: oldName, showCancelButton: true, 
        inputValidator: (val) => { if (!val) return 'Ingrese un nombre'; } 
    }); 
    
    if(newNameRaw) { 
        const newName = newNameRaw.trim().toUpperCase(); 
        if(newName === oldName) return; 
        if(db.departamentos.includes(newName)) return mostrarAviso("Ya existe un departamento con ese nombre", "error"); 
        
        db.departamentos = db.departamentos.map(d => d === oldName ? newName : d); 
        db.porcentajes[newName] = db.porcentajes[oldName]; delete db.porcentajes[oldName]; 
        db.gastosReales[newName] = db.gastosReales[oldName]; delete db.gastosReales[oldName]; 
        if(db.saldos[oldName] !== undefined) { db.saldos[newName] = db.saldos[oldName]; delete db.saldos[oldName]; } 
        
        Object.values(db.votos).forEach(v => { 
            if(v.departamentos && v.departamentos[oldName] !== undefined) { 
                v.departamentos[newName] = v.departamentos[oldName]; delete v.departamentos[oldName]; 
            } 
        }); 
        
        db.historial_movimientos.forEach(m => { 
            if(m.meta && m.meta.nombre === oldName && m.meta.tipo === 'DEP') { 
                m.meta.nombre = newName; m.detalle = m.detalle.replace(`(${oldName})`, `(${newName})`); 
            } 
            if(m.tipo === 'transferencia' && m.meta) { 
                if(m.meta.origenVal === `DEP:${oldName}`) { m.meta.origenVal = `DEP:${newName}`; m.meta.nombreO = newName; } 
                if(m.meta.destinoVal === `DEP:${oldName}`) { m.meta.destinoVal = `DEP:${newName}`; m.meta.nombreD = newName; } 
                m.detalle = m.detalle.replace(`De ${oldName} a`, `De ${newName} a`).replace(`a ${oldName})`, `a ${newName})`); 
            } 
        }); 
        
        try { await window.guardarEnFirebase(); updateUI(); renderFormularioCreacionVoto(); Swal.fire('Actualizado', '', 'success'); } catch(e) {} 
    } 
};

window.editarFondo = async function(oldName) { 
    const { value: newNameRaw } = await Swal.fire({ 
        title: 'Editar Fondo Especial', input: 'text', inputValue: oldName, showCancelButton: true, 
        inputValidator: (val) => { if (!val) return 'Ingrese un nombre'; } 
    }); 
    
    if(newNameRaw) { 
        const newName = newNameRaw.trim(); 
        if(newName === oldName) return; 
        if(db.proyectos[newName] !== undefined) return mostrarAviso("Ya existe un fondo con ese nombre", "error"); 
        
        db.proyectos[newName] = db.proyectos[oldName]; delete db.proyectos[oldName]; 
        
        Object.values(db.votos).forEach(v => { 
            if(v.departamentos && v.departamentos[oldName] !== undefined) { 
                v.departamentos[newName] = v.departamentos[oldName]; delete v.departamentos[oldName]; 
            } 
        }); 
        
        db.historial_movimientos.forEach(m => { 
            if(m.meta && m.meta.nombre === oldName && (m.meta.tipo === 'PROJ' || m.tipo === 'proyecto')) { 
                m.meta.nombre = newName; m.detalle = m.detalle.replace(oldName, newName); 
            } 
            if(m.tipo === 'transferencia' && m.meta) { 
                if(m.meta.origenVal === `PROJ:${oldName}`) { m.meta.origenVal = `PROJ:${newName}`; m.meta.nombreO = newName; } 
                if(m.meta.destinoVal === `PROJ:${oldName}`) { m.meta.destinoVal = `PROJ:${newName}`; m.meta.nombreD = newName; } 
                m.detalle = m.detalle.replace(`De ${oldName} a`, `De ${newName} a`).replace(`a ${oldName})`, `a ${newName})`); 
            } 
        }); 
        
        try { await window.guardarEnFirebase(); updateUI(); renderFormularioCreacionVoto(); Swal.fire('Actualizado', '', 'success'); } catch(e) {} 
    } 
};

window.eliminarDepartamento = async function(nombre) { 
    const { isConfirmed } = await Swal.fire({ 
        title: `¿Eliminar ${nombre}?`, text: "Se quitará de la distribución. Si tenía gastos o saldo, esto afectará el neto general.", 
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' 
    }); 
    if(isConfirmed) { 
        db.departamentos = db.departamentos.filter(d => d !== nombre); delete db.porcentajes[nombre]; delete db.gastosReales[nombre]; 
        try { await window.guardarEnFirebase(); updateUI(); Swal.fire('Eliminado', '', 'success'); } catch(e) {} 
    } 
};

window.eliminarFondo = async function(nombre) { 
    const saldo = db.proyectos[nombre] || 0; 
    const { isConfirmed } = await Swal.fire({ 
        title: `¿Eliminar ${nombre}?`, 
        text: saldo > 0 ? `Este fondo tiene $${saldo}. Si lo eliminas, el dinero volverá al "Neto Disponible" general.` : "Se eliminará este fondo especial.", 
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' 
    }); 
    if(isConfirmed) { 
        delete db.proyectos[nombre]; 
        try { await window.guardarEnFirebase(); updateUI(); Swal.fire('Eliminado', '', 'success'); } catch(e) {} 
    } 
};

window.guardarConfig = async function() { 
    document.querySelectorAll('.in-porc').forEach(i => db.porcentajes[i.dataset.dep] = parseFloat(i.value)); 
    try { await window.guardarEnFirebase(); mostrarAviso("Configuración guardada", "success"); updateUI(); } catch(e){} 
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

// ==========================================
// 7. SISTEMA DE VOTOS (JUNTA DIRECTIVA)
// ==========================================
window.renderFormularioCreacionVoto = function() { 
    const container = document.getElementById('voto-aportantes-container'); 
    if(!container) return; 
    
    // OCULTA EL FONDO DE AJUSTE DEL MENÚ DE VOTOS
    const proyectosVisibles = Object.keys(db.proyectos).filter(p => p !== "AJUSTES DE CUADRATURA");
    const listaAportantes = [...db.departamentos, ...proyectosVisibles]; 
    
    let html = ""; 
    listaAportantes.forEach((dep, index) => { 
        const safeId = dep.replace(/\s+/g, '_').toLowerCase() + '_' + index; 
        html += `<div style="display:flex; align-items:center; flex-wrap: wrap; gap: 8px; background:white; padding:12px; border-radius:10px; border:1px solid #cbd5e1; width: 100%;"><input type="checkbox" id="chk-voto-${safeId}" onchange="toggleInputVoto('${safeId}')" style="width: 22px; height: 22px; margin:0; cursor:pointer;"><label for="chk-voto-${safeId}" style="flex:1; min-width: 150px; font-size:0.9rem; font-weight: 500; cursor:pointer; line-height:1.2;">${dep}</label><input type="number" id="input-voto-${safeId}" data-nombre="${dep}" placeholder="Cuota $" style="width: 120px; flex-grow: 1; margin:0; display:none; padding:10px; border: 2px solid #3498db;" oninput="calcularTotalVoto()"></div>`; 
    }); 
    container.innerHTML = html; 
};

window.toggleInputVoto = function(safeId) { 
    const chk = document.getElementById(`chk-voto-${safeId}`); 
    const input = document.getElementById(`input-voto-${safeId}`); 
    if(chk.checked) { input.style.display = 'block'; input.focus(); } else { input.style.display = 'none'; input.value = ''; } 
    calcularTotalVoto(); 
};

window.calcularTotalVoto = function() { 
    let total = 0; 
    document.querySelectorAll('input[id^="input-voto-"]').forEach(input => { 
        if(input.style.display !== 'none' && input.value) total += parseFloat(input.value) || 0; 
    }); 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    document.getElementById('voto-total-calc').innerText = clp.format(total); 
    return total; 
};

window.guardarVotoAvanzado = async function() { 
    const nombre = document.getElementById('voto-nombre-input').value.trim(); 
    if(!nombre) return mostrarAviso("Ingrese un concepto para el voto", "error"); 
    let total = 0; 
    let departamentos = {}; 
    document.querySelectorAll('input[id^="input-voto-"]').forEach(input => { 
        if(input.style.display !== 'none') { 
            const monto = parseFloat(input.value) || 0; 
            const nombreDep = input.dataset.nombre; 
            if(monto > 0) { departamentos[nombreDep] = { asignado: monto, rendido: 0 }; total += monto; } 
        } 
    }); 
    if(total <= 0) return mostrarAviso("Asigne un monto a por lo menos un aportante.", "error"); 
    const idVoto = "VOTO_" + Date.now(); 
    db.votos[idVoto] = { nombre: nombre, total: total, rendido: 0, activo: true, departamentos: departamentos }; 
    try { 
        await window.guardarEnFirebase(); 
        document.getElementById('voto-nombre-input').value = ""; 
        renderFormularioCreacionVoto(); 
        document.getElementById('voto-total-calc').innerText = "$0"; 
        mostrarAviso("Voto creado exitosamente.", "success"); 
        updateUI(); 
    } catch(e) {} 
};

window.cerrarVoto = async function(id) { 
    if (db.votos[id]) { 
        db.votos[id].activo = false; 
        await window.guardarEnFirebase(); 
        mostrarAviso("Voto cerrado manualmente", "success"); 
        updateUI(); 
    } 
};

// ==========================================
// 8. CIERRE DE MES Y HERRAMIENTAS DE ARCHIVO
// ==========================================
window.cerrarMesConFiltro = async function() { 
    const { value: formValues } = await Swal.fire({ 
        title: 'Cierre de Mes', 
        html: `<p style="font-size:0.9rem; margin-bottom:10px;">Selecciona el mes. Solo los registros de ese mes se guardarán en el archivo y se quitarán de tu historial activo.</p><input type="month" id="cierre-mes-input" class="swal2-input" style="width: 80%;"><input type="text" id="cierre-nombre-input" class="swal2-input" placeholder="Nombre (Ej. Marzo 2026)" style="width: 80%;">`, 
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
            bancos: JSON.parse(JSON.stringify(db.bancos)), 
            saldos: JSON.parse(JSON.stringify(db.saldos)), 
            porcentajes: JSON.parse(JSON.stringify(db.porcentajes)), 
            gastosReales: JSON.parse(JSON.stringify(db.gastosReales)), 
            proyectos: JSON.parse(JSON.stringify(db.proyectos)), 
            votos: JSON.parse(JSON.stringify(db.votos)), 
            historial_movimientos: recordsDelMes 
        }; 
        
        db.archivos_mensuales[nombreMes] = snapshot; 
        db.historial_movimientos = recordsParaMantener; 
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); 
        const d = document.createElement('a'); 
        d.setAttribute("href", dataStr); d.setAttribute("download", `Cierre_${nombreMes}.json`); document.body.appendChild(d); d.click(); d.remove(); 
        
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
    
    const alerta = document.getElementById('alerta-archivo');
    if (mesSeleccionadoHistorial === 'actual') {
        alerta.style.display = 'none';
    } else {
        alerta.style.display = 'block';
    }
    
    renderHistorial(); 
};

window.limpiarRegistros = async function() { 
    const { value: pass } = await Swal.fire({ title: '¿REINICIAR TODO?', icon: 'warning', input: 'password', showCancelButton: true }); 
    if (pass === MASTER_PASS) { 
        db.bancos = { estado: 0, chile: 0 }; 
        db.historial_movimientos = []; 
        db.votos = {}; 
        db.archivos_mensuales = {}; 
        Object.keys(db.proyectos).forEach(p => db.proyectos[p] = 0); 
        db.departamentos.forEach(n => db.gastosReales[n] = 0); 
        try { 
            await window.guardarEnFirebase(); 
            Swal.fire('Reiniciado', 'Datos en cero.', 'success'); 
            updateUI(); 
            renderFormularioCreacionVoto(); 
        } catch(e){} 
    } 
};

window.descargarCopia = function() { 
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); 
    const d = document.createElement('a'); 
    d.setAttribute("href", dataStr); 
    d.setAttribute("download", "Respaldo_Tesoreria.json"); 
    document.body.appendChild(d); 
    d.click(); 
    d.remove(); 
};

// ==========================================
// NUEVO: PDF DETALLADO CON FONDOS SEPARADOS
// ==========================================
window.generarReportePDF = async function() { 
    mostrarAviso("Generando documento oficial...", "info"); 
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF(); 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    const fechaActual = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); 
    
    try { 
        const img = new Image(); img.src = 'logo.jpg'; 
        await new Promise((res) => { img.onload = res; img.onerror = res; }); 
        if (img.complete && img.naturalHeight !== 0) doc.addImage(img, 'JPEG', 15, 12, 25, 25); 
    } catch(e) {} 
    
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("IGLESIA ADVENTISTA DEL SÉPTIMO DÍA", 105, 20, { align: "center" }); 
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("San Francisco de Limache", 105, 27, { align: "center" }); 
    doc.text("Reporte de Tesorería para Junta Administrativa", 105, 33, { align: "center" }); 
    doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.text(`Fecha de emisión: ${fechaActual}`, 105, 42, { align: "center" }); 
    
    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0); 
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0); 
    
    // Tabla 1: Resumen General
    doc.autoTable({ 
        startY: 50, head: [['Resumen Consolidado', 'Monto']], 
        body: [ 
            ['Saldo Total en Bancos', clp.format(totalB)], 
            ['Total Fondos y Ajustes del Sistema', clp.format(totalP)], 
            ['Neto Disponible para Departamentos', clp.format(totalB - totalP)] 
        ], 
        theme: 'striped', headStyles: { fillColor: [197, 160, 89] } 
    }); 
    
    // Tabla 2: Detalle de Fondos 
    const bodyProyectos = Object.keys(db.proyectos).map(p => [p, clp.format(db.proyectos[p] || 0)]);
    if (bodyProyectos.length > 0) {
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Detalle de Fondos Especiales (Aislados)', 'Saldo Disponible']],
            body: bodyProyectos,
            headStyles: { fillColor: [46, 204, 113] }
        });
    }

    // Tabla 3: Departamentos
    doc.autoTable({ 
        startY: doc.lastAutoTable.finalY + 10, head: [['Departamento (%)', '% Asignado', 'Gastado', 'Saldo Disponible']], 
        body: db.departamentos.map(n => [ n, (db.porcentajes[n] || 0) + '%', clp.format(db.gastosReales[n] || 0), clp.format(db.saldos[n] || 0) ]), 
        headStyles: { fillColor: [10, 25, 47] } 
    }); 
    
    const finalY = doc.lastAutoTable.finalY; 
    if (finalY < 250) { 
        doc.setLineWidth(0.5); doc.line(40, finalY + 30, 90, finalY + 30); doc.line(120, finalY + 30, 170, finalY + 30); 
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Firma Tesorería", 65, finalY + 35, { align: "center" }); 
        doc.text("Firma Pastor / Anciano", 145, finalY + 35, { align: "center" }); 
    } else {
        doc.addPage();
        doc.setLineWidth(0.5); doc.line(40, 40, 90, 40); doc.line(120, 40, 170, 40);
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Firma Tesorería", 65, 45, { align: "center" });
        doc.text("Firma Pastor / Anciano", 145, 45, { align: "center" });
    }
    
    doc.save(`Reporte_Junta_Limache_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.pdf`); 
    Swal.fire({ title: 'Reporte Generado', text: 'El documento PDF oficial ha sido descargado.', icon: 'success', confirmButtonColor: '#c5a059' }); 
};

// ==========================================
// 9. ACTUALIZADORES DE VISTAS (RENDER UI)
// ==========================================
window.updateUI = function() { 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    const totalE = db.bancos.estado || 0; 
    const totalC = db.bancos.chile || 0; 
    const totalIglesia = totalE + totalC; 
    
    document.getElementById('total-estado').innerText = clp.format(totalE); 
    document.getElementById('total-chile').innerText = clp.format(totalC); 
    const elTotalIglesia = document.getElementById('total-iglesia'); 
    if(elTotalIglesia) elTotalIglesia.innerText = clp.format(totalIglesia); 
    
    document.getElementById('grid-departamentos').innerHTML = db.departamentos.map(n => `<div class="dep-card"><h4>${n}</h4><div class="balance">${clp.format(db.saldos[n] || 0)}</div><small style="color: #64748b; font-weight: 500;">${db.porcentajes[n]}% | Gastado: ${clp.format(db.gastosReales[n] || 0)}</small></div>`).join(""); 
    
    // MUESTRA TODO EN EL DASHBOARD PARA QUE LAS SUMAS SEAN TRANSPARENTES
    document.getElementById('grid-proyectos-reunido').innerHTML = Object.keys(db.proyectos).map(p => `<div class="dep-card" style="border-left:5px solid #c5a059"><h4>${p}</h4><div class="balance" style="color:#c5a059;">${clp.format(db.proyectos[p] || 0)}</div></div>`).join(""); 
    
    const projIn = document.getElementById('proj-select'); 
    if(projIn) { 
        let opts = `<option value="" disabled selected>Elegir Fondo Especial...</option>`; 
        // OCULTA EL FONDO DE AJUSTE DEL MENÚ DE INGRESOS
        Object.keys(db.proyectos).filter(p => p !== "AJUSTES DE CUADRATURA").forEach(p => { opts += `<option value="${p}">${p}</option>`; }); 
        opts += `<option value="NUEVO_CONCEPTO" style="color:blue">+ Nuevo Fondo / Ofrenda Especial</option>`; 
        projIn.innerHTML = opts; 
    } 
    
    const selectGasto = document.getElementById('gasto-dep'); 
    const selectTransO = document.getElementById('trans-origen'); 
    const selectTransD = document.getElementById('trans-destino'); 
    
    let optCombo = '<option value="" disabled selected>Elegir Origen...</option><optgroup label="Deptos Regulares (%)">'; 
    db.departamentos.forEach(n => optCombo += `<option value="DEP:${n}">${n}</option>`); 
    optCombo += '</optgroup><optgroup label="Fondos Especiales">'; 
    // OCULTA EL FONDO DE AJUSTE DE LOS MENÚS DE GASTOS Y TRANSFERENCIAS
    Object.keys(db.proyectos).filter(p => p !== "AJUSTES DE CUADRATURA").forEach(p => optCombo += `<option value="PROJ:${p}">${p}</option>`); 
    optCombo += '</optgroup>'; 
    
    if(selectGasto) selectGasto.innerHTML = optCombo; 
    if(selectTransO) { const currO = selectTransO.value; selectTransO.innerHTML = optCombo.replace('Elegir Origen...', 'Origen (Quita saldo)...'); if(currO) selectTransO.value = currO; } 
    if(selectTransD) { const currD = selectTransD.value; selectTransD.innerHTML = optCombo.replace('Elegir Origen...', 'Destino (Recibe saldo)...'); if(currD) selectTransD.value = currD; } 
    
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

    const selCorrDep = document.getElementById('correccion-dep');
    if(selCorrDep) {
        let optsCorr = '<option value="" disabled selected>Seleccionar Departamento...</option>';
        db.departamentos.forEach(n => optsCorr += `<option value="${n}">${n}</option>`);
        selCorrDep.innerHTML = optsCorr;
    }
    
    if(document.getElementById('tab-historial').classList.contains('active')) renderHistorial(); 
    if(document.getElementById('tab-config').classList.contains('active')) renderConfig(); 
    if(document.getElementById('tab-dashboard').classList.contains('active')) actualizarGrafico(); 
    
    renderVotos(); 
    renderBoletasPendientes();
};

// ==========================================
// 10. GENERACIÓN DE VOTOS, HISTORIAL Y BOLETAS
// ==========================================
window.renderVotos = function() { 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    const container = document.getElementById('lista-votos-pendientes'); 
    const select = document.getElementById('gasto-voto-asociado'); 
    if (!container || !select) return; 
    
    let htmlVotos = ""; 
    let htmlSelect = '<option value="">-- Gasto Directo Normal (No Asociado) --</option>'; 
    
    Object.keys(db.votos || {}).forEach(id => { 
        const v = db.votos[id]; 
        if (v.activo) { 
            const faltanteGlobal = v.total - v.rendido; 
            const porcentaje = Math.min(100, (v.rendido / v.total) * 100).toFixed(1); 
            
            let desgloseHtml = '<div style="margin-top: 15px;">'; 
            if(v.departamentos) { 
                Object.keys(v.departamentos).forEach(dep => { 
                    const info = v.departamentos[dep]; 
                    const faltaDep = Math.max(0, info.asignado - info.rendido); 
                    desgloseHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px; padding: 10px 0; border-left: 3px solid #cbd5e1; padding-left: 12px; margin-bottom: 8px; background: #f8fafc; border-radius: 0 8px 8px 0;">
                        <strong style="font-size: 0.95rem; color: #0a192f; word-break: break-word;">${dep}</strong>
                        <div style="font-size: 0.9rem; display: flex; gap: 15px; flex-wrap: wrap;">
                            <span style="color:#64748b;">Cuota: ${clp.format(info.asignado)}</span>
                            <span style="color:${faltaDep > 0 ? '#e74c3c' : '#2ecc71'}; font-weight:bold;">${faltaDep > 0 ? 'Falta: ' + clp.format(faltaDep) : '¡Listo!'}</span>
                        </div>
                    </div>`; 
                }); 
            } else { 
                desgloseHtml += `<p style="font-size:0.9rem; color:#94a3b8; font-style:italic;">Sin cuotas asignadas.</p>`; 
            } 
            desgloseHtml += '</div>'; 
            
            htmlVotos += `
            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 20px; border: 1px solid #e2e8f0; border-left: 6px solid ${faltanteGlobal <= 0 ? '#2ecc71' : '#c5a059'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <strong style="font-size: 1.2rem; color: #0a192f; word-break: break-word; flex: 1; min-width: 200px;">${v.nombre}</strong>
                    <button onclick="cerrarVoto('${id}')" style="background: rgba(231, 76, 60, 0.1); color: #e74c3c; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: bold; white-space: nowrap;">Forzar Cierre</button>
                </div>
                <div style="font-size: 0.95rem; margin-top: 12px; color: #334155; line-height: 1.6;">
                    <span style="display: inline-block; margin-right: 15px;">Aprobado: <strong>${clp.format(v.total)}</strong></span> 
                    <span style="display: inline-block; margin-right: 15px;">Rendido: <strong style="color:#3498db">${clp.format(v.rendido)}</strong></span> 
                    <span style="display: inline-block;">Faltante: <strong style="color:#e74c3c">${clp.format(Math.max(0, faltanteGlobal))}</strong></span>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 10px; border-radius: 5px; margin-top: 15px; overflow: hidden;">
                    <div style="width: ${porcentaje}%; background: ${faltanteGlobal <= 0 ? '#2ecc71' : '#c5a059'}; height: 100%; transition: width 0.4s ease;"></div>
                </div>
                ${desgloseHtml}
            </div>`; 
            
            htmlSelect += `<option value="${id}">Asociar a Voto: ${v.nombre} (Falta: ${clp.format(Math.max(0, faltanteGlobal))})</option>`; 
        } 
    }); 
    
    if (htmlVotos === "") { 
        htmlVotos = "<p style='color:#94a3b8; font-size:0.95rem; font-style:italic; text-align:center; padding: 20px;'>No hay votos de junta pendientes en este momento.</p>"; 
    } 
    container.innerHTML = htmlVotos; 
    select.innerHTML = htmlSelect; 
};

window.renderHistorial = function() {
    const container = document.getElementById('lista-movimientos'); if(!container) return;
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    
    let listaA_renderizar = []; 
    const esArchivo = mesSeleccionadoHistorial !== 'actual';
    if(esArchivo && db.archivos_mensuales[mesSeleccionadoHistorial]) { 
        listaA_renderizar = db.archivos_mensuales[mesSeleccionadoHistorial].historial_movimientos || []; 
    } else { 
        listaA_renderizar = db.historial_movimientos; 
    }

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
            pasaDep = (item.m.meta && item.m.meta.nombre === filtroDep) || 
                      (item.m.meta && item.m.meta.nombreO === filtroDep) || 
                      (item.m.meta && item.m.meta.nombreD === filtroDep) || 
                      (item.m.detalle && item.m.detalle.includes(`(${filtroDep})`)) ||
                      (item.m.detalle && item.m.detalle.includes(` ${filtroDep} `));
        }
        return pasaTexto && pasaDep;
    });

    if(listaFiltrada.length === 0) { 
        container.innerHTML = "<p style='text-align:center; color:#94a3b8; padding: 30px; font-size: 1.1rem;'><i class='fas fa-folder-open' style='display:block; font-size: 2rem; margin-bottom: 10px; opacity: 0.5;'></i>No hay registros o no coinciden con la búsqueda.</p>"; 
        return; 
    }
    
    container.innerHTML = listaFiltrada.map(item => {
        const { m, realIdx } = item; let controlEstado = "";
        
        let colorBorde = m.monto > 0 ? '#2ecc71' : '#e74c3c';
        let textoMonto = clp.format(m.monto);
        
        if (m.tipo === 'transferencia_banco') {
            colorBorde = '#9b59b6';
            textoMonto = `🏦 ${clp.format(m.monto)}`;
        } else if (m.tipo === 'ajuste_banco_directo') {
            colorBorde = '#9b59b6';
            textoMonto = `🏦 ${m.monto > 0 ? '+' : ''}${clp.format(m.monto)}`;
        } else if (m.tipo === 'transferencia') {
            colorBorde = '#3498db';
            textoMonto = `↔️ ${clp.format(m.monto)}`;
        } else if (m.tipo === 'egreso') {
            let estadoActual = m.estado_gasto || "Ingresado al sistema"; let colorFondo = "#f39c12"; 
            if (estadoActual.includes("Rendido")) colorFondo = "#3498db"; 
            if (estadoActual.includes("Reembolsado")) colorFondo = "#2ecc71"; 
            if (estadoActual.includes("ACMS")) colorFondo = "#16a085"; 
            
            controlEstado = `<div style="margin-top: 12px; width: 100%;">
                <select onchange="actualizarEstadoGasto(${realIdx}, this.value, '${mesSeleccionadoHistorial}')" style="background:${colorFondo}; color:white; border:none; padding:10px 15px; border-radius:10px; font-size:0.9rem; font-weight:bold; cursor:pointer; outline:none; -webkit-appearance:none; box-shadow:0 4px 6px rgba(0,0,0,0.1); width: 100%;">
                    <option value="Ingresado al sistema" style="background:white; color:black;" ${estadoActual === 'Ingresado al sistema' ? 'selected' : ''}>⏳ Ingresado (Pendiente)</option>
                    <option value="Rendido con boleta" style="background:white; color:black;" ${estadoActual === 'Rendido con boleta' ? 'selected' : ''}>🧾 Rendido con Boleta</option>
                    <option value="Reembolsado (X Rendir Boleta)" style="background:white; color:black;" ${estadoActual === 'Reembolsado (X Rendir Boleta)' ? 'selected' : ''}>✅ Reembolsado al Hno/a</option>
                    <option value="OK ingresado a remesas(ACMS)" style="background:white; color:black;" ${estadoActual === 'OK ingresado a remesas(ACMS)' ? 'selected' : ''}>✔️ OK Ingresado a Remesas(ACMS)</option>
                </select>
            </div>`; 
        }
        
        let botonesEdicion = `
            <div style="display:flex; gap: 8px;">
                <button onclick="editarRegistro(${realIdx}, '${mesSeleccionadoHistorial}')" class="action-btn edit" title="Editar Registro"><i class="fas fa-edit"></i></button>
                <button onclick="anularRegistro(${realIdx}, '${mesSeleccionadoHistorial}')" class="action-btn delete" title="Eliminar Registro"><i class="fas fa-trash"></i></button>
            </div>`;

        return `<div class="rendicion-item" style="border-left: 6px solid ${colorBorde}; opacity: ${esArchivo ? '0.85' : '1'};"><div class="historial-info"><span style="font-size: 1rem; display: block; margin-bottom: 5px; color: var(--primary);"><strong>${m.fecha}</strong> - ${m.detalle}</span>${controlEstado}</div><div class="historial-actions"><strong style="color:${colorBorde}; font-size:1.3rem;">${textoMonto}</strong>${botonesEdicion}</div></div>`;
    }).join("");
};

window.renderBoletasPendientes = function() {
    const container = document.getElementById('lista-boletas-pendientes');
    if(!container) return;
    
    const pendientes = db.historial_movimientos.filter(m => 
        m.tipo === 'egreso' && 
        (m.estado_gasto === 'Ingresado al sistema' || m.estado_gasto === 'Reembolsado (X Rendir Boleta)')
    );
    
    if(pendientes.length === 0) {
        container.innerHTML = "<p style='color:#2ecc71; font-size:1rem; font-weight:bold; text-align:center; padding: 20px; background: rgba(46, 204, 113, 0.1); border-radius: 12px;'><i class='fas fa-check-circle' style='font-size: 1.5rem; display: block; margin-bottom: 10px;'></i> ¡Excelente! Todos los gastos tienen su boleta rendida o están en ACMS.</p>";
        return;
    }
    
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    
    container.innerHTML = pendientes.map(m => {
        return `<div style="background:#fff3e0; border-left:5px solid #f39c12; padding:15px; margin-bottom:12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1; min-width: 200px;">
                <strong style="display:block; font-size:1rem; color: #d35400; margin-bottom: 5px;">${m.fecha} - ${m.detalle}</strong>
                <span style="font-size:0.9rem; color:#666; background: rgba(255,255,255,0.7); padding: 4px 8px; border-radius: 6px;">Estado: <b>${m.estado_gasto}</b></span>
            </div>
            <div style="text-align:right;">
                <strong style="color:#e74c3c; font-size:1.3rem; display:block;">${clp.format(Math.abs(m.monto))}</strong>
            </div>
        </div>`;
    }).join("");
};

// ==========================================
// 12. UTILIDADES EXTRAS (GRÁFICOS Y TABS)
// ==========================================
window.renderConfig = function() { 
    const container = document.getElementById('inputs-porcentajes'); 
    const containerFondos = document.getElementById('lista-config-fondos'); 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    if(!container || !containerFondos) return; 
    
    container.innerHTML = db.departamentos.map(n => ` <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px; margin-bottom:12px; padding:15px; background:#f8fafc; border-radius:12px; border: 1px solid #e2e8f0;"> <div style="display:flex; align-items:center; gap: 8px;"> <button onclick="editarDepartamento('${n}')" class="btn-edit-icon" title="Editar Nombre"><i class="fas fa-edit"></i></button> <button onclick="eliminarDepartamento('${n}')" class="btn-delete-icon" title="Eliminar"><i class="fas fa-trash"></i></button> <label style="font-weight:700; margin-left: 5px; color: var(--primary); font-size: 0.95rem; word-break: break-word;">${n}</label> </div> <div style="display:flex; align-items:center; gap:8px;"><input type="number" class="in-porc" data-dep="${n}" value="${db.porcentajes[n] || 0}" oninput="validarSuma()" style="width:80px; text-align:center; margin:0; font-weight:bold; border: 2px solid #cbd5e1;"><strong style="font-size: 1.2rem; color: #64748b;">%</strong></div> </div>`).join(""); 
    
    let htmlFondos = ""; 
    
    // OCULTA EL FONDO DE AJUSTE DE LA LISTA EDITABLE DE FONDOS
    Object.keys(db.proyectos).filter(p => p !== "AJUSTES DE CUADRATURA").forEach(p => { 
        htmlFondos += ` <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 10px; margin-bottom:12px; padding:15px; background:#fdfbf7; border-radius:12px; border: 1px solid #c5a059;"> <div style="display:flex; align-items:center; gap: 8px;"> <button onclick="editarFondo('${p}')" class="btn-edit-icon" title="Editar Nombre"><i class="fas fa-edit"></i></button> <button onclick="eliminarFondo('${p}')" class="btn-delete-icon" title="Eliminar"><i class="fas fa-trash"></i></button> <label style="font-weight:700; margin-left: 5px; color: var(--gold); font-size: 0.95rem; word-break: break-word;">${p}</label> </div> <strong style="color: var(--primary); font-size: 1.2rem;">${clp.format(db.proyectos[p] || 0)}</strong> </div>`; 
    }); 
    
    if(htmlFondos === "") htmlFondos = "<p style='font-size:0.95rem; color:#94a3b8; padding: 15px; text-align: center;'>No hay fondos especiales registrados.</p>"; 
    containerFondos.innerHTML = htmlFondos; 
    validarSuma(); 
};

function actualizarGrafico() { 
    const canvas = document.getElementById('chartPresupuesto'); 
    if(!canvas) return; 
    const ctx = canvas.getContext('2d'); 
    if(miGrafico) miGrafico.destroy(); 
    miGrafico = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: db.departamentos, 
            datasets: [{ 
                data: db.departamentos.map(n => Math.max(0, db.saldos[n] || 0)), 
                backgroundColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b', '#16a085', '#27ae60'] 
            }] 
        }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: window.innerWidth > 768 ? 'right' : 'bottom' } } } 
    }); 
}

window.mostrarAviso = function(m, t) { 
    const toast = document.createElement('div'); 
    toast.className = `toast ${t}`; 
    toast.innerHTML = `<i class="fas ${t === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="font-size: 1.2rem;"></i> ${m}`; 
    document.getElementById('toast-container').appendChild(toast); 
    setTimeout(() => { toast.style.animation = 'slideIn 0.4s reverse forwards'; setTimeout(() => toast.remove(), 400); }, 3000); 
};

window.verTotalGeneral = function() { 
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }); 
    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0); 
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0); 
    Swal.fire({ 
        title: 'Desglose del Patrimonio', 
        html: ` <div style="text-align:left; font-size:1.1rem;"> <p style="margin-bottom: 10px;">Total en Bancos: <br><b style="font-size: 1.3rem;">${clp.format(totalB)}</b></p> <p style="margin-bottom: 10px;">Total en Fondos Especiales: <br><b style="color:#c5a059; font-size: 1.3rem;">${clp.format(totalP)}</b></p> <hr> <p style="color: green;">Dinero Líquido para Distribuir (%): <br><b style="font-size: 1.4rem;">${clp.format(totalB - totalP)}</b></p> </div>`, 
        icon: 'info',
        customClass: { popup: 'swal-mobile-adjust' }
    }); 
};

window.toggleInputs = function() { 
    document.getElementById('wrapper-proyecto').style.display = (document.getElementById('tipo-in').value === 'proyecto') ? 'block' : 'none'; 
};

window.checkNuevoConcepto = function() { 
    document.getElementById('nuevo-concepto-nombre').style.display = (document.getElementById('proj-select').value === 'NUEVO_CONCEPTO') ? 'block' : 'none'; 
};

window.toggleSidebar = function() { 
    const sb = document.querySelector('.sidebar'); 
    sb.classList.toggle('active-mobile'); 
    const overlay = document.getElementById('sidebar-overlay'); 
    if(overlay) overlay.style.display = sb.classList.contains('active-mobile') ? 'block' : 'none'; 
};

window.showTab = function(id) { 
    document.querySelectorAll('.tab-view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); }); 
    const target = document.getElementById('tab-' + id); 
    if(target) { target.style.display = 'block'; target.classList.add('active'); } 
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); 
    if(event && event.currentTarget) event.currentTarget.classList.add('active'); 
    updateUI(); 
    if (window.innerWidth <= 768) { 
        document.querySelector('.sidebar').classList.remove('active-mobile'); 
        if(document.getElementById('sidebar-overlay')) document.getElementById('sidebar-overlay').style.display = 'none'; 
    } 
};

window.addEventListener('resize', () => {
    if(document.getElementById('tab-dashboard').classList.contains('active')) actualizarGrafico();
});

document.addEventListener('DOMContentLoaded', () => { 
    document.getElementById('login-screen').style.display = 'flex'; 
});