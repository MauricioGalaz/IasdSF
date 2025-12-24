// ===================================
// Variables Globales
// ===================================
let currentPrayerFilter = 'todos';
let currentNewsFilter = 'todos';

// ===================================
// Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupSmoothScroll();

    setupPrayerForm();
    setupThanksgivingForm();
    setupTestimonyForm();
    setupNewsForm();
    setupContactForm();

    renderAll();
});
// ===============================
// FILTROS DE PETICIONES
// ===============================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn')
            .forEach(b => b.classList.remove('active'));

        btn.classList.add('active');
        currentPrayerFilter = btn.dataset.filter;
        loadPrayers();
    });
});


// ===================================
// UTILIDADES STORAGE
// ===================================
const getData = key => JSON.parse(localStorage.getItem(key)) || [];
const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ===================================
function renderAll() {
    loadPrayers();
    loadThanksgivings();
    loadTestimonies();
    loadNews();
    loadIntercessoryWall();
}

// ===================================
// MENÚ MÓVIL
// ===================================
function setupMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    toggle.onclick = () => menu.classList.toggle('active');
    document.querySelectorAll('.nav-link').forEach(l =>
        l.onclick = () => menu.classList.remove('active')
    );
}

// ===================================
// SCROLL SUAVE
// ===================================
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ===================================
// MENSAJES
// ===================================
function showMessage(msg, type = 'success') {
    alert(msg);
}

// ===================================
// ORACIÓN
// ===================================
function setupPrayerForm() {
    const form = document.getElementById('prayer-form');
    if (!form) return;

    form.onsubmit = e => {
        e.preventDefault();

        const prayer = {
            id: Date.now(),
            nombre: form.nombre.value,
            categoria: form.categoria.value,
            peticion: form.peticion.value,
            oraciones: 0,
            estado: 'activo',
            fecha: new Date().toLocaleString()
        };

        const data = getData('prayers');
        data.unshift(prayer);
        saveData('prayers', data);

        form.reset();
        loadPrayers();
        loadIntercessoryWall();
        showMessage('🙏 Pedido de oración guardado correctamente');
    };
}

function loadPrayers() {
    const box = document.getElementById('prayers-list');
    if (!box) return;

    let prayers = getData('prayers');
    if (currentPrayerFilter !== 'todos') {
        prayers = prayers.filter(p => p.categoria === currentPrayerFilter);
    }

    box.innerHTML = prayers.length === 0
        ? '<p>No hay pedidos aún</p>'
        : prayers.map(p => `
            <div class="card">
                <strong>${p.nombre}</strong> (${p.categoria})
                <p>${p.peticion}</p>
                <small>${p.fecha}</small>
                <button onclick="prayForRequest(${p.id})">🙏 Orar</button>
                <div>${p.oraciones || 0} personas orando</div>

            </div>
        `).join('');
}
function prayForRequest(id) {
    const data = getData('prayers');
    const prayer = data.find(p => p.id === id);
    if (!prayer) return;

    // FIX: inicializar si no existe
    if (typeof prayer.oraciones !== 'number') {
        prayer.oraciones = 0;
    }

    prayer.oraciones++;
    saveData('prayers', data);

    loadPrayers();
    loadIntercessoryWall();
}


// ===================================
// MURO INTERCESOR
// ===================================
function loadIntercessoryWall() {
    const box = document.getElementById('intercessory-wall');
    if (!box) return;

    const prayers = getData('prayers')
        .filter(p => p.estado === 'activo')
        .sort((a, b) => b.oraciones - a.oraciones);

    box.innerHTML = prayers.length === 0
        ? '<p>No hay peticiones activas</p>'
        : prayers.map(p => `
            <div class="card">
                <strong>${p.nombre}</strong>
                <p>${p.peticion}</p>
                <small>${p.oraciones} oraciones</small>
            </div>
        `).join('');
}

// ===================================
// AGRADECIMIENTOS
// ===================================
function setupThanksgivingForm() {
    const form = document.getElementById('thanksgiving-form');
    if (!form) return;

    form.onsubmit = e => {
        e.preventDefault();
        const data = getData('thanks');
        data.unshift({
            nombre: form.nombre.value,
            categoria: form.categoria.value,
            testimonio: form.testimonio.value
        });
        saveData('thanks', data);
        form.reset();
        loadThanksgivings();
        showMessage('❤️ Agradecimiento guardado');
    };
}

function loadThanksgivings() {
    const box = document.getElementById('thanksgiving-list');
    if (!box) return;

    const data = getData('thanks');
    box.innerHTML = data.length === 0
        ? '<p>No hay agradecimientos</p>'
        : data.map(t => `
            <div class="card">
                <strong>${t.nombre}</strong>
                <p>${t.testimonio}</p>
            </div>
        `).join('');
}

// ===================================
// TESTIMONIOS
// ===================================
function setupTestimonyForm() {
    const form = document.getElementById('testimony-form');
    if (!form) return;

    form.onsubmit = e => {
        e.preventDefault();
        const data = getData('testimonies');
        data.unshift({
            nombre: form.nombre.value,
            titulo: form.titulo.value,
            contenido: form.contenido.value,
            versiculo: form.versiculo.value
        });
        saveData('testimonies', data);
        form.reset();
        loadTestimonies();
        showMessage('✨ Testimonio publicado');
    };
}

function loadTestimonies() {
    const box = document.getElementById('testimonies-list');
    if (!box) return;

    const data = getData('testimonies');
    box.innerHTML = data.length === 0
        ? '<p>No hay testimonios</p>'
        : data.map(t => `
            <div class="card">
                <h4>${t.titulo}</h4>
                <strong>${t.nombre}</strong>
                <p>${t.contenido}</p>
                ${t.versiculo ? `<em>${t.versiculo}</em>` : ''}
            </div>
        `).join('');
}

// ===================================
// NOTICIAS
// ===================================
function setupNewsForm() {
    const form = document.getElementById('news-form');
    if (!form) return;

    form.onsubmit = e => {
        e.preventDefault();
        const data = getData('news');
        data.unshift({
            titulo: form.titulo.value,
            tipo: form.tipo.value,
            contenido: form.contenido.value,
            fecha: new Date().toLocaleString()
        });
        saveData('news', data);
        form.reset();
        loadNews();
        showMessage('📰 Publicación creada');
    };
}

function loadNews() {
    const box = document.getElementById('news-list');
    if (!box) return;

    let data = getData('news');
    if (currentNewsFilter !== 'todos') {
        data = data.filter(n => n.tipo === currentNewsFilter);
    }

    box.innerHTML = data.length === 0
        ? '<p>No hay noticias</p>'
        : data.map(n => `
            <div class="card">
                <strong>${n.titulo}</strong>
                <small>${n.fecha}</small>
                <p>${n.contenido}</p>
            </div>
        `).join('');
}

// ===================================
// CONTACTO
// ===================================
function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.onsubmit = e => {
        e.preventDefault();
        showMessage('📩 Mensaje enviado. Nos contactaremos pronto.');
        form.reset();
    };
}
