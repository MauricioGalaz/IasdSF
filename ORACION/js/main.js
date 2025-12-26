// ===================================
// VARIABLES GLOBALES Y CONFIGURACIÓN
// ===================================
const CLAVE_ADMIN = "iasdsf";
const CORREOS_DESTINO = ["hildateresasandoval@gmail.com", "iasdsanfranciscodelimache@gmail.com"];
let currentPrayerFilter = 'todos';

async function eliminarRegistro(key, index) {
    // Paso 1: Pedir contraseña
    const { value: password } = await Swal.fire({
        title: 'Acceso Administrador',
        text: 'Ingrese clave para borrar registro:',
        input: 'password',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar'
    });

    // Paso 2: Validar clave "iasdsf"
    if (password === "iasdsf") {
        let list = JSON.parse(localStorage.getItem(key)) || [];
        
        // Borrar el elemento
        list.splice(index, 1);
        
        // Guardar cambios
        localStorage.setItem(key, JSON.stringify(list));
        
        // Paso 3: Refrescar la pantalla
        if (typeof actualizarTodo === 'function') actualizarTodo();
        if (typeof renderPublicaciones === 'function') renderPublicaciones('todos');

        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false });
    } else if (password) {
        Swal.fire('Error', 'Clave incorrecta', 'error');
    }
}


// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    actualizarTodo();
    setupFormularios();
    setupFiltros();
    
    // Si no existe el panel administrativo en el HTML, lo creamos
    if(!document.getElementById('admin-panel-float')) {
        crearPanelAdmin();
    }
});

// ===================================
// BASE DE DATOS LOCAL
// ===================================
const iasdDB = {
    save: (key, data) => {
        let list = JSON.parse(localStorage.getItem(key)) || [];
        list.unshift(data);
        localStorage.setItem(key, JSON.stringify(list));
        if (typeof actualizarTodo === 'function') actualizarTodo();
        
        Swal.fire({
            title: '¡Registrado!',
            text: `Tu ${key.slice(0,-1)} ha sido guardado. Se notificará a los correos de la iglesia.`,
            icon: 'success',
            confirmButtonColor: '#1e5aa8'
        });
    },
    get: (key) => JSON.parse(localStorage.getItem(key)) || []
};

// ===================================
// CONFIGURACIÓN DE FILTROS
// ===================================
function setupFiltros() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPrayerFilter = this.getAttribute('data-filter').toLowerCase();
            loadPrayers();
        });
    });
}

// ===================================
// MURO DE ORACIÓN CON MÉTRICAS (Resumen Moderno)
// ===================================
function loadPrayers() {
    const container = document.getElementById('prayers-list');
    const wallStats = document.getElementById('wall-metrics'); 
    if (!container) return;

    const allData = iasdDB.get('pedidos');
    const thanksData = iasdDB.get('agradecimientos');

    // 1. ACTUALIZAR MÉTRICAS (Resumen Visual)
    if (wallStats) {
        wallStats.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div style="background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #1e5aa8;">
                    <i class="fas fa-hands-praying" style="color: #1e5aa8; font-size: 1.5rem;"></i>
                    <h4 style="margin: 10px 0 5px; font-size: 1.8rem; color: #1e5aa8;">${allData.length}</h4>
                    <span style="font-size: 0.7rem; color: #546e7a; font-weight: bold; letter-spacing: 1px;">PETICIONES ACTIBAS</span>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #ff9800;">
                    <i class="fas fa-heart" style="color: #ff9800; font-size: 1.5rem;"></i>
                    <h4 style="margin: 10px 0 5px; font-size: 1.8rem; color: #ff9800;">${thanksData.length}</h4>
                    <span style="font-size: 0.7rem; color: #546e7a; font-weight: bold; letter-spacing: 1px;">AGRADECIMIENTOS</span>
                </div>
            </div>
        `;
    }

    // 2. FILTRAR Y RENDERIZAR CARTAS
    const filtered = currentPrayerFilter === 'todos' 
        ? allData 
        : allData.filter(p => p.category.toLowerCase() === currentPrayerFilter);

    container.innerHTML = filtered.length ? "" : "<p style='text-align:center; color:gray; padding:20px;'>Cargando peticiones...</p>";
    
    filtered.forEach((item, index) => {
        const card = document.createElement('div');
        card.style = `background: white; padding: 20px; margin-bottom: 15px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 5px solid ${getColorByCategory(item.category)}; position:relative;`;
        
        // --- AGREGA ESTA LÍNEA AQUÍ ---
        const numBase = Math.floor(Math.random() * 6) + 3;

        card.innerHTML = `
            <div style="font-size: 10px; font-weight: bold; color: ${getColorByCategory(item.category)}; margin-bottom: 8px; text-transform: uppercase;">${item.category}</div>
            
            <p style="font-family: 'Playfair Display', serif; font-size: 1.1rem; color: #333; margin: 0 0 15px 0;">"${item.content}"</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 12px;">
                <div style="font-size: 11px; color: #777;"><strong>${item.name}</strong> • ${item.date}</div>
                
                <button onclick="unirseOracion(this)" style="background: #e3f2fd; color: #1e5aa8; border: none; padding: 7px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-pray"></i> Me uno (<span class="count">${numBase}</span>)
                </button>
            </div>

            <button onclick="eliminarRegistro('pedidos', ${index})" 
            style="position:absolute; top:10px; right:10px; border:none; background:none; color:#ddd; cursor:pointer;">
            <i class="fas fa-times"></i>
    </button>
        `;
        container.appendChild(card);
    });
}

function getColorByCategory(cat) {
    const colors = { 'salud': '#f44336', 'familia': '#9c27b0', 'trabajo': '#ff9800', 'espiritual': '#1e5aa8' };
    return colors[cat.toLowerCase()] || '#607d8b';
}

// Lógica del botón interactivo
// AGREGAR AL FINAL DEL ARCHIVO
function unirseOracion(btn) {
    if (btn.classList.contains('active')) return;

    const countElement = btn.querySelector('.count');
    let currentCount = parseInt(countElement.innerText);
    
    // Sumar 1 al número que se ve en pantalla
    countElement.innerText = currentCount + 1;
    
    // Cambiar color para que el usuario sepa que ya participó
    btn.classList.add('active');
    btn.style.background = '#1e5aa8';
    btn.style.color = 'white';
    
    // Notificación elegante
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '¡Amén! Te has unido a esta oración',
        showConfirmButton: false,
        timer: 2000
    });
}
// ===================================
// GENERACIÓN DE PDF CON LOGO
// ===================================
async function generarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    try {
        const img = new Image();
        img.src = 'img/logo.png'; 
        await new Promise((resolve) => {
            img.onload = () => {
                doc.addImage(img, 'JPEG', 15, 5, 25, 25);
                resolve();
            };
            img.onerror = () => resolve(); 
        });
    } catch (e) { console.error("Logo no encontrado"); }

    doc.setFillColor(30, 90, 168);
    doc.rect(45, 10, 150, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("IASD SAN FRANCISCO DE LIMACHE - REPORTE", 50, 20);

    let y = 40;
    const secciones = [
        { k: 'pedidos', t: 'PETICIONES DE ORACIÓN' },
        { k: 'agradecimientos', t: 'AGRADECIMIENTOS' }
    ];

    secciones.forEach(sec => {
        const data = iasdDB.get(sec.k);
        if (data.length > 0) {
            doc.setTextColor(30, 90, 168);
            doc.text(sec.t, 15, y);
            doc.autoTable({
                startY: y + 5,
                head: [['Fecha', 'Nombre', 'Detalle']],
                body: data.map(d => [d.date, d.name, d.content]),
                theme: 'grid',
                headStyles: { fillColor: [30, 90, 168] }
            });
            y = doc.lastAutoTable.finalY + 15;
        }
    });

    doc.save(`Reporte_IASD_${new Date().toLocaleDateString()}.pdf`);
}

// ===================================
// FUNCIONES DE APOYO (ELIMINAR, ACTUALIZAR)
// ===================================
function actualizarTodo() {
    loadPrayers();
    renderSimpleList('thanksgiving-list', 'agradecimientos');
    renderSimpleList('testimonies-list', 'testimonios');
}

function renderSimpleList(id, key) {
    const container = document.getElementById(id);
    if (!container) return;
    const data = iasdDB.get(key);
    
    container.innerHTML = data.length ? "" : "<p style='color:gray; padding:10px;'>No hay registros aún.</p>";
    
    data.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "form-card";
        div.style = "margin-bottom:12px; border-left:4px solid #ff9800; padding:15px; position:relative; background:#fff; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);";
        
        div.innerHTML = `
            <p style='font-size:14px; color:#333; margin:0 0 5px 0; font-style:italic;'>"${item.content}"</p>
            <small style="color:#1e5aa8; font-weight:bold;">— ${item.name}</small>
            
            <button onclick="eliminarRegistro('${key}', ${index})" 
                    style="position:absolute; top:8px; right:8px; border:none; background:none; color:#ffcdd2; cursor:pointer; font-size:16px;"
                    onmouseover="this.style.color='#f44336'" 
                    onmouseout="this.style.color='#ffcdd2'">
                <i class="fas fa-times-circle"></i>
            </button>
        `;
        container.appendChild(div);
    });
}



function setupFormularios() {
    const newsForm = document.getElementById('news-form');
    
    if (newsForm) {
        newsForm.onsubmit = (e) => {
            e.preventDefault();
            
            // Captura de datos del formulario HTML
            const tipo = document.getElementById('news-type').value; 
            const titulo = document.getElementById('news-title').value;
            const contenido = document.getElementById('news-content').value;
            const fechaEvento = document.getElementById('news-event-date').value;

            const nuevaPub = {
                titulo: titulo,
                contenido: contenido,
                fechaEvento: fechaEvento,
                date: new Date().toLocaleDateString('es-CL'),
                tipo: tipo 
            };

            // Guarda en la categoría plural (noticias, eventos o anuncios)
            iasdDB.save(tipo + 's', nuevaPub);

            newsForm.reset();
            renderPublicaciones('todos'); // Refresca la lista automáticamente
        };
    }
}

function crearPanelAdmin() {
    // Si ya existe, no lo dupliques
    if(document.getElementById('admin-panel-float')) return;

    const panel = document.createElement('div');
    panel.id = 'admin-panel-float';
    panel.style = "position:fixed; bottom:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;";
    panel.innerHTML = `
        <button onclick="generarPDF()" style="background:#28a745; color:white; border:none; border-radius:50%; width:50px; height:50px; cursor:pointer;"><i class="fas fa-file-pdf"></i></button>
        <button onclick="limpiarListasMasivo()" style="background:#dc3545; color:white; border:none; border-radius:50%; width:50px; height:50px; cursor:pointer;"><i class="fas fa-broom"></i></button>
    `;
    document.body.appendChild(panel);
}

function renderPublicaciones(filtro = 'todos') {
    const container = document.getElementById('news-list');
    if (!container) return;

    container.innerHTML = ""; // Borra el spinner de "Cargando..."

    const llaves = ['noticias', 'eventos', 'anuncios'];
    let hayContenido = false;

    llaves.forEach(llave => {
        // Filtra: si es 'todos' o si la llave contiene el tipo seleccionado
        if (filtro === 'todos' || llave.includes(filtro)) {
            const datos = iasdDB.get(llave);
            
            datos.forEach((item, index) => {
                hayContenido = true;
                const card = document.createElement('div');
                card.style = "background:white; padding:15px; margin-bottom:12px; border-radius:10px; border-left:5px solid #1e5aa8; box-shadow:0 2px 8px rgba(0,0,0,0.05); position:relative;";
                
                card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="background:#e3f2fd; color:#1e5aa8; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold; text-transform:uppercase;">${item.tipo}</span>
        <small style="color:#bbb;">${item.date}</small>
        </div>
        <h4 style="margin:0 0 5px 0; color:#333;">${item.titulo}</h4>
        <p style="font-size:13px; color:#666;">${item.contenido}</p>
    
        <button onclick="eliminarRegistro('${llave}', ${index})" 
            style="position:absolute; top:10px; right:10px; border:none; background:#fee; color:#f44336; border-radius:50%; width:25px; height:25px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
        <i class="fas fa-trash" style="font-size:10px;"></i>
    </button>
`;
                container.appendChild(card);
            });
        }
    });

    if (!hayContenido) {
        container.innerHTML = `<p style="text-align:center; color:gray; padding:20px;">No hay ${filtro === 'todos' ? 'publicaciones' : filtro + 's'} para mostrar.</p>`;
    }
}




// Función para la limpieza masiva
async function limpiarListasMasivo() {
    const { value: password } = await Swal.fire({
        title: '¿Vaciar listas?',
        text: 'Se borrarán peticiones y testimonios. Ingrese clave:',
        input: 'password',
        showCancelButton: true,
        confirmButtonColor: '#dc3545'
    });

    if (password === "iasdsf") {
        const categorias = ['pedidos', 'agradecimientos', 'testimonios'];
        categorias.forEach(k => localStorage.setItem(k, JSON.stringify([])));
        
        actualizarTodo();
        Swal.fire('Éxito', 'Las listas han sido vaciadas.', 'success');
    } else if (password) {
        Swal.fire('Error', 'Clave incorrecta', 'error');
    }
}