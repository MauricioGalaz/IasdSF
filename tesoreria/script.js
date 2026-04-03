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

// Agregado .votos a la base
let db = { bancos: { estado: 0, chile: 0 }, saldos: {}, porcentajes: {}, gastosReales: {}, historial_movimientos: [], proyectos: { "Equipos Sonido y Butacas": 0 }, votos: {} };
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

// 2. FUNCIÓN MAESTRA PARA GUARDAR BLINDADA
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
                await window.guardarEnFirebase(); 
                Swal.fire({ title: '¡Restauración Exitosa!', icon: 'success', confirmButtonColor: '#2ecc71' });
            } else {
                mostrarAviso("El archivo no tiene el formato correcto", "error");
            }
        } catch (err) {}
    };
    reader.readAsText(file); 
    input.value = '';
};

// 4. LÓGICA DE DISTRIBUCIÓN E INICIALIZACIÓN
function inicializarDB() {
    if (!db.bancos) db.bancos = { estado: 0, chile: 0 };
    if (!db.saldos) db.saldos = {};
    if (!db.porcentajes) db.porcentajes = {};
    if (!db.gastosReales) db.gastosReales = {}; 
    if (!db.historial_movimientos) db.historial_movimientos = [];
    if (!db.proyectos) db.proyectos = { "Equipos Sonido y Butacas": 0 };
    if (!db.votos) db.votos = {}; // Inicializamos estructura de votos

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

// --- LOGICA DE VOTOS DE JUNTA ---
window.crearVoto = async function() {
    const nombre = document.getElementById('voto-nombre').value.trim();
    const monto = parseFloat(document.getElementById('voto-monto').value);

    if (!nombre || !monto || monto <= 0) return mostrarAviso("Ingrese un nombre y un monto total válido", "error");

    const idVoto = "VOTO_" + Date.now();
    db.votos[idVoto] = { nombre: nombre, total: monto, rendido: 0, activo: true };

    try {
        await window.guardarEnFirebase();
        document.getElementById('voto-nombre').value = "";
        document.getElementById('voto-monto').value = "";
        mostrarAviso("Voto de Junta Aprobado registrado", "success");
        updateUI();
    } catch(e){}
};

window.cerrarVoto = async function(id) {
    if (db.votos[id]) {
        db.votos[id].activo = false;
        await window.guardarEnFirebase();
        mostrarAviso("Voto cerrado manualmente", "success");
        updateUI();
    }
};
// --------------------------------

window.registrarGasto = async function() {
    const selectElem = document.getElementById('gasto-dep');
    if(!selectElem || !selectElem.value) return mostrarAviso("Seleccione origen", "error");
    
    const [tipo, nombre] = selectElem.value.split(':');
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const banco = document.getElementById('gasto-banco').value;
    const prop = document.getElementById('gasto-proposito').value || "Gasto";
    const estadoGasto = document.getElementById('gasto-estado').value;

    // Detectar si el gasto pertenece a un voto
    const idVoto = document.getElementById('gasto-voto-asociado')?.value || null;

    if(!monto || monto <= 0) return mostrarAviso("Monto inválido", "error");

    db.bancos[banco] -= monto;
    if(tipo === 'PROJ') { db.proyectos[nombre] -= monto; } else { db.gastosReales[nombre] += monto; }
    
    let textoVoto = "";
    if (idVoto && db.votos[idVoto]) {
        db.votos[idVoto].rendido += monto;
        textoVoto = ` [Aplicado a Voto: ${db.votos[idVoto].nombre}]`;
        if (db.votos[idVoto].rendido >= db.votos[idVoto].total) {
            db.votos[idVoto].activo = false; // Cierra automáticamente si se completó
            setTimeout(() => Swal.fire('¡Voto Completado!', `El Voto de Junta '${db.votos[idVoto].nombre}' ha cubierto el total de su costo.`, 'success'), 1000);
        }
    }

    db.historial_movimientos.push({ 
        fecha: new Date().toLocaleDateString(), 
        detalle: `Gasto: ${prop} (${nombre})${textoVoto}`, 
        monto: -monto, 
        tipo: 'egreso', 
        banco, 
        meta: { tipo, nombre, id_voto: idVoto }, // Guardamos el ID del voto para futuras anulaciones
        estado_gasto: estadoGasto
    });
    
    try {
        await window.guardarEnFirebase();
        const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
        recalcularSaldosPorcentuales();
        const saldoFinal = tipo === 'PROJ' ? db.proyectos[nombre] : db.saldos[nombre];

        Swal.fire({ title: '¡Gasto Procesado!', html: `<div style="text-align: left;"><p>Monto: <b>${clp.format(monto)}</b></p><p>Estado: <b>${estadoGasto}</b></p><p>Saldo disponible en ${nombre}: <br><span style="color:green; font-weight:bold;">${clp.format(saldoFinal)}</span></p></div>`, icon: 'success' });
        
        document.getElementById('gasto-monto').value = ""; 
        document.getElementById('gasto-proposito').value = "";
        document.getElementById('gasto-estado').value = "Ingresado al sistema";
        updateUI();
    } catch(e){}
};

window.anularRegistro = async function(index) {
    const { value: pass } = await Swal.fire({ 
        title: 'Anular Registro', 
        input: 'password', 
        inputPlaceholder: 'Ingrese contraseña (iasdsf)',
        showCancelButton: true 
    });
    
    if (pass === MASTER_PASS) {
        try {
            const mov = db.historial_movimientos[index];
            
            if (mov.banco && db.bancos[mov.banco] !== undefined) {
                db.bancos[mov.banco] -= mov.monto;
            }

            if (mov.tipo === 'egreso' && mov.meta) {
                if (mov.meta.tipo === 'PROJ' && db.proyectos[mov.meta.nombre] !== undefined) {
                    db.proyectos[mov.meta.nombre] -= mov.monto;
                } else if (db.gastosReales[mov.meta.nombre] !== undefined) {
                    db.gastosReales[mov.meta.nombre] += mov.monto; // += monto negativo = devuelve el gasto
                }

                // SI EL GASTO ESTABA ASOCIADO A UN VOTO, DEVOLVEMOS ESA RENDICION
                if (mov.meta.id_voto && db.votos && db.votos[mov.meta.id_voto]) {
                    db.votos[mov.meta.id_voto].rendido += mov.monto; // Resta el monto rendido
                    // Si el voto estaba cerrado y ahora vuelve a faltar dinero, lo reactivamos
                    if (db.votos[mov.meta.id_voto].rendido < db.votos[mov.meta.id_voto].total) {
                        db.votos[mov.meta.id_voto].activo = true;
                    }
                }
            } else if (mov.tipo === 'proyecto' && mov.meta && db.proyectos[mov.meta.nombre] !== undefined) { 
                db.proyectos[mov.meta.nombre] -= mov.monto; 
            }
            
            db.historial_movimientos.splice(index, 1);
            await window.guardarEnFirebase();
            updateUI(); 
            Swal.fire('¡Eliminado!', 'El registro fue anulado y el dinero devuelto.', 'success');
        } catch(e) {
            Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
        }
    } else if (pass) {
        Swal.fire('Error', 'Contraseña incorrecta', 'error');
    }
};

window.limpiarRegistros = async function() {
    const { value: pass } = await Swal.fire({ title: '¿REINICIAR TODO?', icon: 'warning', input: 'password', showCancelButton: true });
    if (pass === MASTER_PASS) {
        db.bancos = { estado: 0, chile: 0 }; db.historial_movimientos = []; db.votos = {};
        Object.keys(db.proyectos).forEach(p => db.proyectos[p] = 0);
        DEPT_NAMES.forEach(n => db.gastosReales[n] = 0);
        try {
            await window.guardarEnFirebase();
            Swal.fire('Reiniciado', 'Datos en cero.', 'success');
            updateUI();
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
    
    // Siempre renderizar los votos pendientes para tenerlos al día
    renderVotos();
};

window.renderVotos = function() {
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    const container = document.getElementById('lista-votos-pendientes');
    const select = document.getElementById('gasto-voto-asociado');
    if (!container || !select) return;

    let htmlVotos = "";
    let htmlSelect = '<option value="">-- Gasto Directo Normal (No Asociado a Voto) --</option>';

    Object.keys(db.votos || {}).forEach(id => {
        const v = db.votos[id];
        if (v.activo) {
            const faltante = v.total - v.rendido;
            const porcentaje = Math.min(100, (v.rendido / v.total) * 100).toFixed(1);
            
            htmlVotos += `
            <div style="background:#f8fafc; border-left: 5px solid ${faltante <= 0 ? '#2ecc71' : '#c5a059'}; padding: 15px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content: space-between; align-items: center;">
                    <strong>${v.nombre}</strong>
                    <button onclick="cerrarVoto('${id}')" style="background:rgba(231, 76, 60, 0.1); color:#e74c3c; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.8rem; font-weight:bold;">Forzar Cierre</button>
                </div>
                <div style="font-size: 0.9rem; margin-top: 8px;">
                    Total Aprobado: <b>${clp.format(v.total)}</b> | Se ha rendido: <b style="color:#3498db">${clp.format(v.rendido)}</b> | Faltan por rendir: <b style="color:#e74c3c">${clp.format(Math.max(0, faltante))}</b>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 8px; border-radius: 4px; margin-top: 8px; overflow: hidden;">
                    <div style="width: ${porcentaje}%; background: ${faltante <= 0 ? '#2ecc71' : '#c5a059'}; height: 100%; transition: width 0.3s ease;"></div>
                </div>
            </div>`;

            htmlSelect += `<option value="${id}">Asociar a Voto: ${v.nombre} (Falta registrar: ${clp.format(Math.max(0, faltante))})</option>`;
        }
    });

    if (htmlVotos === "") {
        htmlVotos = "<p style='color:#94a3b8; font-size:0.9rem; font-style:italic; text-align:center; padding: 10px;'>No hay votos de junta pendientes de rendición.</p>";
    }

    container.innerHTML = htmlVotos;
    select.innerHTML = htmlSelect;
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
        
        let controlEstado = "";
        if (m.tipo === 'egreso') {
            let estadoActual = m.estado_gasto || "Ingresado al sistema";
            
            let colorFondo = "#f39c12"; 
            if (estadoActual.includes("Rendido")) colorFondo = "#3498db"; 
            if (estadoActual.includes("Reembolsado")) colorFondo = "#2ecc71"; 
            if (estadoActual.includes("ACMS")) colorFondo = "#16a085"; 
            
            controlEstado = `
                <div style="margin-top: 8px;">
                    <select onchange="actualizarEstadoGasto(${realIdx}, this.value)" 
                        style="background:${colorFondo}; color:white; border:none; padding:5px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold; cursor:pointer; outline:none; -webkit-appearance:none; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                        <option value="Ingresado al sistema" style="background:white; color:black;" ${estadoActual === 'Ingresado al sistema' ? 'selected' : ''}>⏳ Ingresado (Pendiente Status)</option>
                        <option value="Rendido con boleta" style="background:white; color:black;" ${estadoActual === 'Rendido con boleta' ? 'selected' : ''}>🧾 Rendido con Boleta</option>
                        <option value="Reembolsado" style="background:white; color:black;" ${estadoActual === 'Reembolsado' ? 'selected' : ''}>✅ Reembolsado (X Rendir Boleta)</option>
                        <option value="OK ingresado a remesas(ACMS)" style="background:white; color:black;" ${estadoActual === 'OK ingresado a remesas(ACMS)' ? 'selected' : ''}>✔️ OK Ingresado a Remesas(ACMS)</option>
                    </select>
                </div>`;
        }

        return `
        <div class="rendicion-item" style="display:flex; justify-content:space-between; align-items:center; border-left: 5px solid ${m.monto > 0 ? '#2ecc71' : '#e74c3c'}; padding:15px; margin-bottom:10px; background:white; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
            <div style="flex: 1; min-width: 200px;">
                <span style="font-size: 0.95rem;"><strong>${m.fecha}</strong> - ${m.detalle}</span>
                ${controlEstado}
            </div>
            <div style="display:flex; align-items:center; padding-left: 15px;">
                <strong style="color:${m.monto > 0 ? '#2ecc71' : '#e74c3c'}; font-size:1.1rem;">${clp.format(m.monto)}</strong>
                <button onclick="anularRegistro(${realIdx})" style="background:rgba(231, 76, 60, 0.1); border:none; color:#e74c3c; cursor:pointer; margin-left:15px; width:35px; height:35px; border-radius:8px; display:flex; align-items:center; justify-content:center; transition:0.3s;" title="Anular Registro">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
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

window.generarReportePDF = async function() {
    mostrarAviso("Generando documento oficial...", "info");
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF();
    const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaActual = new Date().toLocaleDateString('es-CL', opcionesFecha);

    try {
        const logoUrl = 'logo.jpg'; 
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
        if (img.complete && img.naturalHeight !== 0) doc.addImage(img, 'JPEG', 15, 12, 25, 25);
    } catch(e) { console.log("No se pudo cargar el logo", e); }

    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("IGLESIA ADVENTISTA DEL SÉPTIMO DÍA", 105, 20, { align: "center" });
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("San Francisco de Limache", 105, 27, { align: "center" });
    doc.text("Reporte de Tesorería para Junta Administrativa", 105, 33, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.text(`Fecha de emisión: ${fechaActual}`, 105, 42, { align: "center" });

    const totalB = (db.bancos.estado || 0) + (db.bancos.chile || 0); 
    const totalP = Object.values(db.proyectos).reduce((a, b) => a + b, 0);

    doc.autoTable({ startY: 50, head: [['Resumen Consolidado', 'Monto']], body: [ ['Saldo Total en Bancos', clp.format(totalB)], ['Fondo Reservado Proyectos', clp.format(totalP)], ['Neto Disponible Departamentos', clp.format(totalB - totalP)] ], theme: 'striped', headStyles: { fillColor: [197, 160, 89] } });
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 15, head: [['Departamento', '% Asignado', 'Gastado', 'Saldo Disponible']], body: DEPT_NAMES.map(n => [ n, (db.porcentajes[n] || 0) + '%', clp.format(db.gastosReales[n] || 0), clp.format(db.saldos[n] || 0) ]), headStyles: { fillColor: [10, 25, 47] } });

    const finalY = doc.lastAutoTable.finalY;
    if (finalY < 250) { 
        doc.setLineWidth(0.5); doc.line(40, finalY + 30, 90, finalY + 30); doc.line(120, finalY + 30, 170, finalY + 30); 
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Firma Tesorería", 65, finalY + 35, { align: "center" }); doc.text("Firma Pastor / Anciano", 145, finalY + 35, { align: "center" });
    }

    const fechaArchivo = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
    doc.save(`Reporte_Junta_Limache_${fechaArchivo}.pdf`);
    Swal.fire({ title: 'Reporte Generado', text: 'El documento PDF oficial ha sido descargado.', icon: 'success', confirmButtonColor: '#c5a059' });
};

window.actualizarEstadoGasto = async function(index, nuevoEstado) {
    if(db.historial_movimientos[index]) {
        db.historial_movimientos[index].estado_gasto = nuevoEstado;
        try {
            await window.guardarEnFirebase();
            renderHistorial();
            mostrarAviso("Estado actualizado", "success");
        } catch(e) { mostrarAviso("Error al actualizar estado", "error"); }
    }
};

document.addEventListener('DOMContentLoaded', () => { document.getElementById('login-screen').style.display = 'flex'; });