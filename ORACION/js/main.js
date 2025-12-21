// ===================================
// Variables Globales
// ===================================
let currentPrayerFilter = 'todos';
let currentNewsFilter = 'todos';

// ===================================
// Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Menú móvil
    setupMobileMenu();
    
    // Navegación suave
    setupSmoothScroll();
    
    // Formularios
    setupPrayerForm();
    setupThanksgivingForm();
    setupTestimonyForm();
    setupNewsForm();
    setupContactForm();
    
    // Cargar contenido
    loadPrayers();
    loadThanksgivings();
    loadTestimonies();
    loadNews();
    loadIntercessoryWall();
    
    // Filtros
    setupPrayerFilters();
    setupNewsFilters();
    
    // Actualizar contenido cada 30 segundos
    setInterval(() => {
        loadPrayers();
        loadThanksgivings();
        loadTestimonies();
        loadNews();
        loadIntercessoryWall();
    }, 30000);
}

// ===================================
// Menú Móvil
// ===================================
function setupMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

// ===================================
// Navegación Suave
// ===================================
function setupSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    // Remover clase active de todos los enlaces
                    navLinks.forEach(l => l.classList.remove('active'));
                    // Agregar clase active al enlace actual
                    this.classList.add('active');
                    
                    // Scroll suave
                    const headerHeight = document.querySelector('.main-header').offsetHeight;
                    const targetPosition = targetSection.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Actualizar enlace activo al hacer scroll
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('.section');
        const headerHeight = document.querySelector('.main-header').offsetHeight;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - headerHeight - 100;
            const sectionBottom = sectionTop + section.offsetHeight;
            const scrollPosition = window.scrollY;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                const sectionId = section.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
}

// ===================================
// API Helper Functions
// ===================================
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(endpoint, options);
        
        if (method === 'DELETE' && response.status === 204) {
            return { success: true };
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('es-ES', options);
}

function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type} fade-in`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    messageDiv.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Insertar al inicio del body
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    // Estilo adicional para posicionamiento
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '80px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.minWidth = '300px';
    messageDiv.style.maxWidth = '500px';
    
    // Remover después de 5 segundos
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
}

// ===================================
// Pedidos de Oración
// ===================================
function setupPrayerForm() {
    const form = document.getElementById('prayer-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                nombre: document.getElementById('prayer-name').value.trim(),
                categoria: document.getElementById('prayer-category').value,
                peticion: document.getElementById('prayer-request').value.trim(),
                fecha: Date.now(),
                estado: 'activo',
                oraciones_count: 0
            };
            
            try {
                await apiRequest('tables/pedidos_oracion', 'POST', formData);
                showMessage('¡Tu pedido de oración ha sido compartido! La comunidad está orando por ti.', 'success');
                form.reset();
                loadPrayers();
            } catch (error) {
                showMessage('Error al enviar tu pedido. Por favor, intenta nuevamente.', 'error');
            }
        });
    }
}

async function loadPrayers() {
    const container = document.getElementById('prayers-list');
    if (!container) return;
    
    try {
        const response = await apiRequest('tables/pedidos_oracion?limit=100&sort=-created_at');
        const prayers = response.data || [];
        
        if (prayers.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-praying-hands"></i>
                    <p>No hay pedidos de oración todavía. Sé el primero en compartir.</p>
                </div>
            `;
            return;
        }
        
        // Filtrar según la categoría seleccionada
        const filteredPrayers = currentPrayerFilter === 'todos' 
            ? prayers 
            : prayers.filter(p => p.categoria === currentPrayerFilter);
        
        container.innerHTML = filteredPrayers.map(prayer => `
            <div class="prayer-item fade-in" data-category="${prayer.categoria}">
                <div class="item-header">
                    <div class="item-name">
                        <i class="fas fa-user-circle"></i>
                        ${escapeHtml(prayer.nombre)}
                    </div>
                    <div class="item-date">${formatDate(prayer.created_at)}</div>
                </div>
                <div class="item-category">${getCategoryLabel(prayer.categoria)}</div>
                <div class="item-content">${escapeHtml(prayer.peticion)}</div>
                <div class="item-actions">
                    <button class="prayer-btn" onclick="prayForRequest('${prayer.id}')">
                        <i class="fas fa-praying-hands"></i> Orar por esto
                    </button>
                    <div class="prayer-count">
                        <i class="fas fa-heart"></i>
                        <span>${prayer.oraciones_count || 0} personas orando</span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                <i class="fas fa-exclamation-circle"></i>
                Error al cargar los pedidos de oración.
            </div>
        `;
    }
}

async function prayForRequest(prayerId) {
    try {
        // Obtener el pedido actual
        const prayer = await apiRequest(`tables/pedidos_oracion/${prayerId}`);
        
        // Incrementar el contador
        const updatedData = {
            oraciones_count: (prayer.oraciones_count || 0) + 1
        };
        
        await apiRequest(`tables/pedidos_oracion/${prayerId}`, 'PATCH', updatedData);
        showMessage('¡Gracias por orar! Tu oración es poderosa.', 'success');
        loadPrayers();
        loadIntercessoryWall();
    } catch (error) {
        showMessage('Error al registrar tu oración.', 'error');
    }
}

function setupPrayerFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover clase active de todos
            filterTabs.forEach(t => t.classList.remove('active'));
            // Agregar clase active al actual
            tab.classList.add('active');
            
            // Actualizar filtro
            currentPrayerFilter = tab.dataset.filter;
            loadPrayers();
        });
    });
}

function getCategoryLabel(category) {
    const labels = {
        'salud': 'Salud',
        'familia': 'Familia',
        'trabajo': 'Trabajo/Estudios',
        'espiritual': 'Vida Espiritual',
        'otro': 'Otro'
    };
    return labels[category] || category;
}

// ===================================
// Agradecimientos
// ===================================
function setupThanksgivingForm() {
    const form = document.getElementById('thanksgiving-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                nombre: document.getElementById('thanks-name').value.trim(),
                categoria: document.getElementById('thanks-category').value,
                testimonio: document.getElementById('thanks-testimony').value.trim(),
                fecha: Date.now()
            };
            
            try {
                await apiRequest('tables/agradecimientos', 'POST', formData);
                showMessage('¡Gracias por compartir tu testimonio de gratitud! Gloria a Dios.', 'success');
                form.reset();
                loadThanksgivings();
            } catch (error) {
                showMessage('Error al enviar tu agradecimiento. Por favor, intenta nuevamente.', 'error');
            }
        });
    }
}

async function loadThanksgivings() {
    const container = document.getElementById('thanksgiving-list');
    if (!container) return;
    
    try {
        const response = await apiRequest('tables/agradecimientos?limit=100&sort=-created_at');
        const thanksgivings = response.data || [];
        
        if (thanksgivings.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-heart"></i>
                    <p>No hay agradecimientos todavía. Comparte tus bendiciones.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = thanksgivings.map(thanks => `
            <div class="thanks-item fade-in">
                <div class="item-header">
                    <div class="item-name">
                        <i class="fas fa-user-circle"></i>
                        ${escapeHtml(thanks.nombre)}
                    </div>
                    <div class="item-date">${formatDate(thanks.created_at)}</div>
                </div>
                <div class="item-category">${getThanksgivingCategoryLabel(thanks.categoria)}</div>
                <div class="item-content">${escapeHtml(thanks.testimonio)}</div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                <i class="fas fa-exclamation-circle"></i>
                Error al cargar los agradecimientos.
            </div>
        `;
    }
}

function getThanksgivingCategoryLabel(category) {
    const labels = {
        'salud': 'Sanidad',
        'provision': 'Provisión',
        'familia': 'Familia',
        'trabajo': 'Trabajo',
        'espiritual': 'Crecimiento Espiritual',
        'otro': 'Otro'
    };
    return labels[category] || category;
}

// ===================================
// Testimonios
// ===================================
function setupTestimonyForm() {
    const form = document.getElementById('testimony-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                nombre: document.getElementById('testimony-name').value.trim(),
                titulo: document.getElementById('testimony-title').value.trim(),
                contenido: document.getElementById('testimony-content').value.trim(),
                versiculo: document.getElementById('testimony-verse').value.trim(),
                fecha: Date.now()
            };
            
            try {
                await apiRequest('tables/testimonios', 'POST', formData);
                showMessage('¡Tu testimonio ha sido compartido! Que inspire a muchos.', 'success');
                form.reset();
                loadTestimonies();
            } catch (error) {
                showMessage('Error al enviar tu testimonio. Por favor, intenta nuevamente.', 'error');
            }
        });
    }
}

async function loadTestimonies() {
    const container = document.getElementById('testimonies-list');
    if (!container) return;
    
    try {
        const response = await apiRequest('tables/testimonios?limit=100&sort=-created_at');
        const testimonies = response.data || [];
        
        if (testimonies.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-comment-dots"></i>
                    <p>No hay testimonios todavía. Comparte tu experiencia de fe.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = testimonies.map(testimony => `
            <div class="testimony-item fade-in">
                <div class="item-header">
                    <div class="item-name">
                        <i class="fas fa-user-circle"></i>
                        ${escapeHtml(testimony.nombre)}
                    </div>
                    <div class="item-date">${formatDate(testimony.created_at)}</div>
                </div>
                <div class="item-title">${escapeHtml(testimony.titulo)}</div>
                <div class="item-content">${escapeHtml(testimony.contenido)}</div>
                ${testimony.versiculo ? `
                    <div class="item-verse">
                        <i class="fas fa-bible"></i> ${escapeHtml(testimony.versiculo)}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                <i class="fas fa-exclamation-circle"></i>
                Error al cargar los testimonios.
            </div>
        `;
    }
}

// ===================================
// Oración Intercesora
// ===================================
async function loadIntercessoryWall() {
    const container = document.getElementById('intercessory-wall');
    if (!container) return;
    
    try {
        const response = await apiRequest('tables/pedidos_oracion?limit=50&sort=-oraciones_count');
        const prayers = response.data || [];
        
        // Filtrar solo peticiones activas
        const activePrayers = prayers.filter(p => p.estado === 'activo');
        
        if (activePrayers.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-hands"></i>
                    <p>No hay peticiones activas en el muro de oración.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = activePrayers.map(prayer => `
            <div class="intercessory-card fade-in">
                <div class="item-header">
                    <div class="item-name">
                        <i class="fas fa-user-circle"></i>
                        ${escapeHtml(prayer.nombre)}
                    </div>
                </div>
                <div class="item-category">${getCategoryLabel(prayer.categoria)}</div>
                <div class="item-content">${escapeHtml(prayer.peticion)}</div>
                <div class="prayer-count">
                    <i class="fas fa-heart"></i>
                    <span>${prayer.oraciones_count || 0} personas orando</span>
                </div>
                <button class="prayer-btn" onclick="prayForRequest('${prayer.id}')">
                    <i class="fas fa-praying-hands"></i> Orar
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                <i class="fas fa-exclamation-circle"></i>
                Error al cargar el muro de oración.
            </div>
        `;
    }
}

// ===================================
// Noticias y Eventos
// ===================================
function setupNewsForm() {
    const form = document.getElementById('news-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fechaEvento = document.getElementById('news-event-date').value;
            
            const formData = {
                titulo: document.getElementById('news-title').value.trim(),
                tipo: document.getElementById('news-type').value,
                contenido: document.getElementById('news-content').value.trim(),
                fecha: Date.now(),
                fecha_evento: fechaEvento ? new Date(fechaEvento).getTime() : null
            };
            
            try {
                await apiRequest('tables/noticias', 'POST', formData);
                showMessage('¡Publicación creada exitosamente!', 'success');
                form.reset();
                loadNews();
            } catch (error) {
                showMessage('Error al publicar. Por favor, intenta nuevamente.', 'error');
            }
        });
    }
}

async function loadNews() {
    const container = document.getElementById('news-list');
    if (!container) return;
    
    try {
        const response = await apiRequest('tables/noticias?limit=100&sort=-created_at');
        const news = response.data || [];
        
        if (news.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-newspaper"></i>
                    <p>No hay noticias todavía.</p>
                </div>
            `;
            return;
        }
        
        // Filtrar según el tipo seleccionado
        const filteredNews = currentNewsFilter === 'todos' 
            ? news 
            : news.filter(n => n.tipo === currentNewsFilter);
        
        container.innerHTML = filteredNews.map(item => `
            <div class="news-item fade-in" data-type="${item.tipo}">
                <div class="item-header">
                    <div class="item-title">${escapeHtml(item.titulo)}</div>
                    <div class="item-date">${formatDate(item.created_at)}</div>
                </div>
                <div class="item-type">${getNewsTypeLabel(item.tipo)}</div>
                <div class="item-content">${escapeHtml(item.contenido)}</div>
                ${item.fecha_evento ? `
                    <div class="item-verse">
                        <i class="fas fa-calendar-alt"></i> 
                        Fecha del evento: ${formatDate(item.fecha_evento)}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="message error">
                <i class="fas fa-exclamation-circle"></i>
                Error al cargar las noticias.
            </div>
        `;
    }
}

function setupNewsFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover clase active de todos
            filterBtns.forEach(b => b.classList.remove('active'));
            // Agregar clase active al actual
            btn.classList.add('active');
            
            // Actualizar filtro
            currentNewsFilter = btn.dataset.type;
            loadNews();
        });
    });
}

function getNewsTypeLabel(type) {
    const labels = {
        'noticia': 'Noticia',
        'evento': 'Evento',
        'anuncio': 'Anuncio'
    };
    return labels[type] || type;
}

// ===================================
// Formulario de Contacto
// ===================================
function setupContactForm() {
    const form = document.getElementById('contact-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const phone = document.getElementById('contact-phone').value.trim();
            const message = document.getElementById('contact-message').value.trim();
            
            // En un sitio estático, podríamos usar un servicio como Formspree o EmailJS
            // Por ahora, solo mostramos un mensaje de confirmación
            showMessage(`¡Gracias ${name}! Hemos recibido tu mensaje. Nos pondremos en contacto contigo pronto.`, 'success');
            form.reset();
        });
    }
}

// ===================================
// Utilidades
// ===================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================
// Exportar funciones globales
// ===================================
window.prayForRequest = prayForRequest;