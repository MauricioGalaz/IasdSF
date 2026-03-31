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

const DEPT_NAMES = ["MIDEA", "DEPARTAMENTO NIÑOS", "DEPARTAMENTOS AVENTUREROS", "JOVENES ADVENTISTAS", "ASA", "PUBLICACIONES", "ESCUELA SABATICA", "MIPES", "MINISTERIO DE LA MUJER", "SALUD", "GASTOS DE IGLESIA", "FONDO SOLIDARIO"];
const MASTER_PASS = "iasdsf";

let db = { bancos: { estado: 0, chile: 0 }, saldos: {}, porcentajes: {}, gastosReales: {}, historial_movimientos: [], proyectos: { "Equipos Sonido y Butacas": 0 } };
let miGrafico = null;

// 1. CONEXIÓN A LA NUBE
window.validarAcceso = function() {
    const pass = document.getElementById('input-pass').value;
    if (pass === "tesoriasd") {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';

        const docRef = doc(dbFirestore, "tesoreria", "limache_actual");
        
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                db = docSnap.data();
            }
            inicializarDB();
        }, (error) => {
            console.error("Error leyendo BD:", error);
            alert("Error de permisos en Firebase. Revisa las reglas.");
        });
    } else {
        Swal.fire({ title: 'Contraseña Incorrecta', icon: 'error' });
    }
};

// 2. FUNCIÓN MAESTRA PARA GUARDAR BLINDADA (Filtro de limpieza)
window.guardarEnFirebase = async function() {
    try {
        const docRef = doc(dbFirestore, "tesoreria", "limache_actual");
        
        // Filtro que limpia datos antiguos o caracteres ilegales
        const limpiarParaFirestore = (obj) => {
            if (obj === null || obj === undefined || Number.isNaN(obj)) return 0;
            if (Array.isArray(obj)) return obj.map(limpiarParaFirestore).filter(e => e !== undefined && e !== null);
            if (typeof obj === 'object') {
                const nuevoObj = {};
                for (let key in obj) {
                    // Limpiamos los espacios en blanco de los extremos y los símbolos ilegales
                    let cleanKey = String(key).replace(/[\.\/\[\]~]/g, '-').trim(); 
                    
                    // ¡EL SALVAVIDAS! Si el nombre está vacío, le ponemos un nombre por defecto
                    if (cleanKey === "") {
                        cleanKey = "Proyecto_Sin_Nombre";
                    }

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
        
        await setDoc(docRef, dbLimpia);
    } catch (e) {
        console.error("Error crítico guardando:", e);
        alert("Atención: El servidor rechazó los datos. Error: " + e.message); 
        throw e; 
    }
};

// 3. RESTAURAR COPIA
window.restaurarCopia = function(input) {
    const file = input.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            if (backup.bancos || backup.historial_movimientos) {
                db = backup; 
                inicializarDB(); 
                
                // Forzamos el guardado y si hay error, detiene la alerta verde
                await window.guardarEnFirebase(); 
                
                Swal.fire({
                    title: '¡Restauración Exitosa!',
                    text: 'Los datos de la iglesia han sido actualizados en la nube.',
                    icon: 'success',
                    confirmButtonColor: '#2ecc71'
                });
            } else {
                mostrarAviso("El archivo no tiene el formato correcto", "error");
            }
        } catch (err) { 
            console.error("Proceso detenido:", err);
            // El mensaje de error lo muestra la alerta nativa de guardarEnFirebase
        }
    };
    reader.readAsText(file); 
    input.value = '';
};

// 4. LÓGICA DE DISTRIBUCIÓN
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

function recalcularSaldosPorcentuales() {
    const totalBancos = (db.bancos.estado || 0) + (db.bancos.chile || 0);
    const totalEnProyectos = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    const patrimonioNeto = Math.max(0, totalBancos - totalEnProyectos);

    DEPT_NAMES.forEach(n => {
        const asignacionIdeal = (patrimonioNeto * (db.porcentajes[n] / 100));
        db.saldos[n] = asignacionIdeal - (db.gastosReales[n] || 0);
    });
}

// 5. MOVIMIENTOS Y REGISTROS
window.procesarIngreso = async function() {
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
            if(!pName) return mostrarAviso("Indique nombre", "error");
            if(!db.proyectos[pName]) db.proyectos[pName] = 0;
        }
        db.proyectos[pName] += monto;
        meta = { nombre: pName };
    }

    db.historial_movimientos.push({ fecha, detalle: tipo === 'proyecto' ? `Proyecto: ${meta.nombre}` : `Remesa ${remesa}`, monto, tipo, banco: cuenta, meta });
    
    try {
        await window.guardarEnFirebase();
        document.getElementById('monto-in').value = ""; document.getElementById('remesa-num').value = "";
        mostrarAviso("Fondo integrado exitosamente.", "success");
    } catch(e){}
};

window.registrarGasto = async function() {
    const selectElem = document.getElementById('gasto-dep');
    if(!selectElem || !selectElem.value) return mostrarAviso("Seleccione origen", "error");
    
    const [tipo, nombre] = selectElem.value.split(':');
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const banco = document.getElementById('gasto-banco').value;
    const prop = document.getElementById('gasto-proposito').value || "Gasto";

    if(!monto || monto <= 0) return mostrarAviso("Monto inválido", "error");

    db.bancos[banco] -= monto;
    if(tipo === 'PROJ') { db.proyectos[nombre] -= monto; } else { db.gastosReales[nombre] += monto; }
    
    db.historial_movimientos.push({ fecha: new Date().toLocaleDateString(), detalle: `Gasto: ${prop} (${nombre})`, monto: -monto, tipo: 'egreso', banco, meta: { tipo, nombre } });
    
    try {
        await window.guardarEnFirebase();
        const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
        recalcularSaldosPorcentuales();
        const saldoFinal = tipo === 'PROJ' ? db.proyectos[nombre] : db.saldos[nombre];

        Swal.fire({ title: '¡Gasto Procesado!', html: `<div style="text-align: left;"><p>Monto: <b>${clp.format(monto)}</b></p><p>Saldo disponible en ${nombre}: <br><span style="color:green; font-weight:bold;">${clp.format(saldoFinal)}</span></p></div>`, icon: 'success' });
        document.getElementById('gasto-monto').value = ""; document.getElementById('gasto-proposito').value = "";
    } catch(e){}
};

window.anularRegistro = async function(index) {
    const { value: pass } = await Swal.fire({ 
        title: 'Anular Registro', 
        input: 'password', 
        inputPlaceholder: 'Ingrese contraseña (iasdsf)',
        showCancelButton: true 
    });
    
    // Recuerda: la contraseña es iasdsf
    if (pass === MASTER_PASS) {
        try {
            const mov = db.historial_movimientos[index];
            
            // 1. Devolvemos el dinero al banco
            if (mov.banco && db.bancos[mov.banco] !== undefined) {
                db.bancos[mov.banco] -= mov.monto;
            }

            // 2. Ajustamos la cuenta del departamento o proyecto
            if (mov.tipo === 'egreso' && mov.meta) {
                if (mov.meta.tipo === 'PROJ' && db.proyectos[mov.meta.nombre] !== undefined) {
                    db.proyectos[mov.meta.nombre] -= mov.monto;
                } else if (db.gastosReales[mov.meta.nombre] !== undefined) {
                    db.gastosReales[mov.meta.nombre] += mov.monto;
                }
            } else if (mov.tipo === 'proyecto' && mov.meta && db.proyectos[mov.meta.nombre] !== undefined) { 
                db.proyectos[mov.meta.nombre] -= mov.monto; 
            }
            
            // 3. Eliminamos el registro de la lista
            db.historial_movimientos.splice(index, 1);
            
            // 4. Guardamos en la nube y FORZAMOS actualizar la pantalla
            await window.guardarEnFirebase();
            updateUI(); 
            
            Swal.fire('¡Eliminado!', 'El registro fue anulado y el dinero devuelto.', 'success');
        } catch(e) {
            console.error("Error al anular:", e);
            Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
        }
    } else if (pass) {
        Swal.fire('Error', 'Contraseña incorrecta', 'error');
    }
};

window.limpiarRegistros = async function() {
    const { value: pass } = await Swal.fire({ title: '¿REINICIAR TODO?', icon: 'warning', input: 'password', showCancelButton: true });
    if (pass === MASTER_PASS) {
        db.bancos = { estado: 0, chile: 0 }; db.historial_movimientos = [];
        Object.keys(db.proyectos).forEach(p => db.proyectos[p] = 0);
        DEPT_NAMES.forEach(n => db.gastosReales[n] = 0);
        try {
            await window.guardarEnFirebase();
            Swal.fire('Reiniciado', 'Datos en cero.', 'success');
        } catch(e){}
    }
};

window.guardarConfig = async function() {
    document.querySelectorAll('.in-porc').forEach(i => db.porcentajes[i.dataset.dep] = parseFloat(i.value));
    try {
        await window.guardarEnFirebase();
        mostrarAviso("Configuración guardada", "success");
    } catch(e){}
};

// 6. RENDERIZADO VISUAL UI
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

    if(document.getElementById('tab-historial').classList.contains('active')) renderHistorial();
    if(document.getElementById('tab-config').classList.contains('active')) renderConfig();
    if(document.getElementById('tab-dashboard').classList.contains('active')) actualizarGrafico();
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

function renderHistorial() {
    const container = document.getElementById('lista-movimientos');
    if(!container) return;
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    container.innerHTML = db.historial_movimientos.slice().reverse().map((m, i) => {
        const realIdx = db.historial_movimientos.length - 1 - i;
        return `<div class="rendicion-item"><span><strong>${m.fecha}</strong> - ${m.detalle}</span><div><strong style="color:${m.monto > 0 ? 'green' : 'red'}">${clp.format(m.monto)}</strong><button onclick="anularRegistro(${realIdx})" style="background:none; border:none; color:red; cursor:pointer; margin-left:10px;"><i class="fas fa-trash"></i></button></div></div>`;
    }).join("");
}

window.renderConfig = function() {
    const container = document.getElementById('inputs-porcentajes');
    if(!container) return;
    container.innerHTML = DEPT_NAMES.map(n => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:10px; background:#f8fafc; border-radius:8px;"><label style="font-weight:600;">${n}</label><div style="display:flex; align-items:center; gap:5px;"><input type="number" class="in-porc" data-dep="${n}" value="${db.porcentajes[n] || 0}" oninput="validarSuma()" style="width:70px; text-align:right;"><strong>%</strong></div></div>`).join("");
    validarSuma();
};

window.validarSuma = function() {
    let suma = 0; document.querySelectorAll('.in-porc').forEach(i => suma += parseFloat(i.value) || 0);
    const bar = document.getElementById('check-total');
    if(bar) { bar.innerText = `Suma Total: ${suma.toFixed(2)}%`; const ok = Math.abs(suma - 100) < 0.1; bar.style.color = ok ? "green" : "red"; document.getElementById('btn-guardar-config').disabled = !ok; }
};

function actualizarGrafico() {
    const canvas = document.getElementById('chartPresupuesto');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(miGrafico) miGrafico.destroy();
    miGrafico = new Chart(ctx, { type: 'doughnut', data: { labels: DEPT_NAMES, datasets: [{ data: DEPT_NAMES.map(n => Math.max(0, db.saldos[n] || 0)), backgroundColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b', '#16a085', '#27ae60'] }] }, options: { responsive: true, maintainAspectRatio: false } });
}

window.mostrarAviso = function(m, t) {
    const toast = document.createElement('div'); toast.className = `toast ${t}`; toast.innerText = m;
    document.getElementById('toast-container').appendChild(toast); setTimeout(() => toast.remove(), 3000);
};

window.verTotalGeneral = function() {
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0);
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    Swal.fire({ title: 'Estado Real de la Iglesia', html: `Bancos: ${clp.format(totalB)}<br>Proyectos: ${clp.format(totalP)}<hr><p style="color: green;">Neto Disponible: <b>${clp.format(totalB - totalP)}</b></p>`, icon: 'info' });
};

window.descargarCopia = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const d = document.createElement('a'); d.setAttribute("href", dataStr); d.setAttribute("download", "Respaldo.json"); document.body.appendChild(d); d.click(); d.remove();
};
window.toggleInputs = function() { document.getElementById('wrapper-proyecto').style.display = (document.getElementById('tipo-in').value === 'proyecto') ? 'block' : 'none'; };
window.checkNuevoConcepto = function() { document.getElementById('nuevo-concepto-nombre').style.display = (document.getElementById('proj-select').value === 'NUEVO_CONCEPTO') ? 'block' : 'none'; };
window.toggleSidebar = function() {
    const sb = document.querySelector('.sidebar'); sb.classList.toggle('active-mobile');
    const overlay = document.getElementById('sidebar-overlay');
    if(overlay) overlay.style.display = sb.classList.contains('active-mobile') ? 'block' : 'none';
};

window.generarReportePDF = function() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    doc.setFontSize(18); doc.text("IGLESIA ADVENTISTA DEL SÉPTIMO DÍA", 105, 15, { align: "center" });
    doc.setFontSize(12); doc.text("San Francisco de Limache - Reporte", 105, 22, { align: "center" });
    const totalB = db.bancos.estado + db.bancos.chile; const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0);
    doc.autoTable({ startY: 30, head: [['Resumen Consolidado', 'Monto']], body: [['Saldo Total', clp.format(totalB)], ['Fondo Proyectos', clp.format(totalP)], ['Neto Deptos', clp.format(totalB - totalP)]] });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 15, head: [['Departamento', '%', 'Gastado', 'Disponible']], body: DEPT_NAMES.map(n => [n, db.porcentajes[n]+'%', clp.format(db.gastosReales[n]), clp.format(db.saldos[n])]) });
    doc.save(`Reporte_Limache_${new Date().toLocaleDateString()}.pdf`);
};

document.addEventListener('DOMContentLoaded', () => { document.getElementById('login-screen').style.display = 'flex'; });