// ===================================
// VARIABLES GLOBALES Y CONFIGURACIÓN
// ===================================
const CLAVE_ADMIN = "iasdsf";
const CORREOS_DESTINO = ["hildateresasandoval@gmail.com", "iasdsanfranciscodelimache@gmail.com"];
let currentPrayerFilter = 'todos';

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    escucharPedidosEnTiempoReal(); // Carga datos desde Firebase
    setupFormularios();
    setupFiltros();
    
    if(!document.getElementById('admin-panel-float')) {
        crearPanelAdmin();
    }
});

// ===================================
// GESTIÓN DE DATOS EN LA NUBE (FIREBASE)
// ===================================

// Escucha cambios en Firebase y actualiza el muro automáticamente
function escucharPedidosEnTiempoReal() {
    const pedidosRef = database.ref('pedidos');
    const container = document.getElementById('prayers-list');
    const wallStats = document.getElementById('wall-metrics');

    pedidosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!container) return;

        container.innerHTML = "";
        const pedidosArray = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : [];

        // 1. ACTUALIZAR MÉTRICAS (Basado en datos de la nube)
        if (wallStats) {
            const agradecimientosCount = pedidosArray.filter(p => p.category === 'Agradecimiento').length;
            const pedidosActivosCount = pedidosArray.length - agradecimientosCount;

            wallStats.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
                    <div style="background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #1e5aa8;">
                        <i class="fas fa-hands-praying" style="color: #1e5aa8; font-size: 1.5rem;"></i>
                        <h4 style="margin: 10px 0 5px; font-size: 1.8rem; color: #1e5aa8;">${pedidosActivosCount}</h4>
                        <span style="font-size: 0.7rem; color: #546e7a; font-weight: bold; letter-spacing: 1px;">PETICIONES ACTIVAS</span>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #ff9800;">
                        <i class="fas fa-heart" style="color: #ff9800; font-size: 1.5rem;"></i>
                        <h4 style="margin: 10px 0 5px; font-size: 1.8rem; color: #ff9800;">${agradecimientosCount}</h4>
                        <span style="font-size: 0.7rem; color: #546e7a; font-weight: bold; letter-spacing: 1px;">AGRADECIMIENTOS</span>
                    </div>
                </div>`;
        }

        // 2. FILTRAR Y RENDERIZAR
        const filtered = currentPrayerFilter === 'todos' 
            ? pedidosArray 
            : pedidosArray.filter(p => p.category.toLowerCase() === currentPrayerFilter);

        if (filtered.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:gray; padding:20px;'>No hay peticiones para mostrar.</p>";
            return;
        }

        filtered.forEach((item) => {
            const isContestada = item.contestada === true;
            const card = document.createElement('div');
            card.style = `background: white; padding: 20px; margin-bottom: 15px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 5px solid ${isContestada ? '#fec325' : getColorByCategory(item.category)}; position:relative;`;
            
            const numBase = item.unidos || Math.floor(Math.random() * 6) + 3;

            card.innerHTML = `
                <div style="font-size: 10px; font-weight: bold; color: ${isContestada ? '#fec325' : getColorByCategory(item.category)}; margin-bottom: 8px; text-transform: uppercase;">
                    ${isContestada ? '✨ ORACIÓN CONTESTADA' : item.category}
                </div>
                <p style="font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #333; margin: 0 0 15px 0;">"${item.content}"</p>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 12px;">
                    <div style="font-size: 11px; color: #777;"><strong>${item.name}</strong> • ${item.date}</div>
                    <button onclick="unirseOracion(this, '${item.id}')" style="background: #e3f2fd; color: #1e5aa8; border: none; padding: 7px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-pray"></i> Me uno (<span class="count">${numBase}</span>)
                    </button>
                </div>
                <button onclick="eliminarRegistro('pedidos', '${item.id}')" style="position:absolute; top:10px; right:10px; border:none; background:none; color:#ddd; cursor:pointer;">
                    <i class="fas fa-times"></i>
                </button>`;
            container.appendChild(card);
        });
    });
}

// Guarda un nuevo pedido en Firebase
async function guardarPedidoEnNube(nombre, categoria, contenido) {
    const nuevoPedidoRef = database.ref('pedidos').push();
    await nuevoPedidoRef.set({
        name: nombre,
        category: categoria,
        content: contenido,
        date: new Date().toLocaleDateString('es-CL'),
        unidos: 0,
        contestada: false
    });

    Swal.fire({
        title: '¡Recibido con Amor!',
        html: 'Tu solicitud ha sido registrada.<br><b style="color: #1e5aa8;">Estaremos orando por ti.</b>',
        icon: 'success',
        confirmButtonText: 'Amén',
        confirmButtonColor: '#1e5aa8',
        customClass: { popup: 'modern-swal-popup' }
    });
}

// Eliminar registro de Firebase
async function eliminarRegistro(nodo, idFirebase) {
    const { value: password } = await Swal.fire({
        title: 'Área Restringida',
        text: '¿Eliminar este registro de la nube?',
        input: 'password',
        inputPlaceholder: 'Clave iasdsf',
        showCancelButton: true,
        confirmButtonColor: '#d33'
    });

    if (password === CLAVE_ADMIN) {
        database.ref(`${nodo}/${idFirebase}`).remove();
        Swal.fire('Eliminado', 'El registro fue borrado globalmente.', 'success');
    } else if (password) {
        Swal.fire('Error', 'Clave incorrecta', 'error');
    }
}

// Actualizar contador de "Me uno" en la nube
function unirseOracion(btn, idFirebase) {
    if (btn.classList.contains('active')) return;
    const countElement = btn.querySelector('.count');
    let currentCount = parseInt(countElement.innerText);
    
    database.ref(`pedidos/${idFirebase}`).update({ unidos: currentCount + 1 });
    
    btn.classList.add('active');
    btn.style.background = '#1e5aa8';
    btn.style.color = 'white';
}

function getColorByCategory(cat) {
    const colors = { 'salud': '#f44336', 'familia': '#9c27b0', 'trabajo': '#ff9800', 'espiritual': '#1e5aa8', 'agradecimiento': '#fec325' };
    return colors[cat.toLowerCase()] || '#607d8b';
}

function setupFiltros() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPrayerFilter = this.getAttribute('data-filter').toLowerCase();
            // La lista se actualiza sola gracias al listener on('value')
        });
    });
}

function crearPanelAdmin() {
    const panel = document.createElement('div');
    panel.id = 'admin-panel-float';
    panel.className = 'admin-controls';
    panel.innerHTML = `
        <button onclick="descargarReportePDF()" class="admin-btn pdf" title="PDF"><i class="fas fa-file-pdf"></i></button>
        <button onclick="limpiarListasMasivo()" class="admin-btn clear" title="Borrar Todo"><i class="fas fa-broom"></i></button>`;
    document.body.appendChild(panel);
}

// Función de limpieza masiva para Firebase
async function limpiarListasMasivo() {
    const { value: password } = await Swal.fire({
        title: '¿Vaciado Global?',
        text: "Se borrarán TODOS los pedidos de la nube.",
        icon: 'warning',
        input: 'password',
        showCancelButton: true,
        confirmButtonColor: '#dc3545'
    });

    if (password === CLAVE_ADMIN) {
        database.ref('pedidos').remove();
        Swal.fire('Muro Limpio', 'Base de datos reiniciada.', 'success');
    }
}

// --- FUNCIÓN PARA MARCAR ORACIÓN COMO CONTESTADA (GLOBAL) ---
async function marcarContestada(idFirebase) {
    const { value: pass } = await Swal.fire({
        title: '¿Oración Contestada?',
        text: "Este testimonio se resaltará en dorado para todos los hermanos.",
        input: 'password',
        inputPlaceholder: 'Clave iasdsf',
        showCancelButton: true,
        confirmButtonColor: '#fec325',
        confirmButtonText: '¡Amén, resaltar!'
    });

    if (pass === CLAVE_ADMIN) {
        // Actualizamos en Firebase para sincronizar con la APK y Netlify
        database.ref('pedidos/' + idFirebase).update({
            contestada: true,
            category: 'Agradecimiento' 
        }).then(() => {
            // Efecto de Confeti al tener éxito
            dispararConfeti();
            Swal.fire('¡Gloria a Dios!', 'El testimonio ha sido resaltado globalmente.', 'success');
        });
    } else if (pass) {
        Swal.fire('Error', 'Clave incorrecta', 'error');
    }
}

// Función visual de celebración
function dispararConfeti() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00305e', '#fec325', '#ffffff']
    });
}