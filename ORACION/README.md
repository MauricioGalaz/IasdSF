# Iglesia Adventista del Séptimo Día - San Francisco de Limache

## 🙏 Descripción del Proyecto

Sitio web comunitario diseñado para la Iglesia Adventista del Séptimo Día de San Francisco de Limache, Región de Valparaíso, Chile. Esta plataforma digital permite a los hermanos en la fe compartir sus pedidos de oración, testimonios, agradecimientos, estudiar la Palabra de Dios y mantenerse conectados como comunidad.

**Desarrollado con amor por:** Mauricio Galaz

---

## ✨ Características Implementadas

### 🎯 Funcionalidades Principales

#### 1. **Página de Inicio**
- Diseño atractivo con bienvenida inspiradora
- Versículo bíblico destacado (Mateo 18:20)
- Navegación intuitiva a todas las secciones
- Diseño responsive para todos los dispositivos

#### 2. **Pedidos de Oración** 
- Formulario para compartir peticiones de oración
- Categorización: Salud, Familia, Trabajo/Estudios, Vida Espiritual, Otro
- Lista de peticiones activas
- Sistema de oración intercesora (contador de personas orando)
- Filtros por categoría

#### 3. **Agradecimientos a Dios**
- Formulario para compartir testimonios de bendiciones
- Categorías de gratitud: Sanidad, Provisión, Familia, Trabajo, Crecimiento Espiritual
- Galería de testimonios de gratitud
- Visualización cronológica

#### 4. **Testimonios de Fe**
- Formulario para compartir experiencias de fe
- Campo para título y contenido detallado
- Opción de agregar versículo bíblico relacionado
- Galería de testimonios inspiradores

#### 5. **Estudio Bíblico**
- Guías de estudio diario con recursos externos
- Enlaces a lecciones de Escuela Sabática
- Estudios temáticos organizados
- Recursos oficiales adventistas
- Plan de lectura bíblica anual
- Enlaces a Biblia en línea

#### 6. **Biblioteca de Esperanza**
- Acceso a 8 libros principales de Elena G. de White
- Enlaces directos a EGW Writings oficial
- Libros incluidos:
  - El Camino a Cristo
  - El Conflicto de los Siglos
  - El Deseado de Todas las Gentes
  - Patriarcas y Profetas
  - Palabras de Vida del Gran Maestro
  - Hechos de los Apóstoles
  - El Ministerio de Curación
  - La Educación

#### 7. **Oración Intercesora**
- Muro comunitario de oración
- Visualización de peticiones más urgentes
- Botón para unirse en oración
- Contador de personas orando por cada petición

#### 8. **Noticias y Eventos**
- Formulario para publicar noticias, eventos y anuncios
- Filtros por tipo de publicación
- Fecha de eventos programados
- Visualización cronológica

#### 9. **Contacto**
- Información de la iglesia
- Horarios de culto (Sábados)
- Formulario de contacto
- Enlaces a redes sociales

---

## 🎨 Diseño y Estilo

### Paleta de Colores
- **Azul Adventista**: #1e5aa8 (Color principal)
- **Dorado**: #d4af37 (Color secundario/acentos)
- **Azul Claro**: #6b9bd1 (Color complementario)
- **Blanco**: #ffffff (Fondo principal)
- **Gris Claro**: #f8f9fa (Fondos alternos)

### Tipografía
- **Encabezados**: Playfair Display (serif elegante)
- **Cuerpo**: Open Sans (sans-serif legible)

### Características de Diseño
- Diseño completamente responsive (móvil, tablet, desktop)
- Iconos de Font Awesome
- Animaciones suaves y transiciones
- Gradientes inspiradores
- Sombras y efectos de profundidad
- Menú móvil hamburguesa

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos avanzados con variables CSS
- **JavaScript (Vanilla)**: Funcionalidad interactiva

### Librerías CDN
- **Font Awesome 6.4.0**: Iconos
- **Google Fonts**: Playfair Display & Open Sans

### Backend/Base de Datos
- **RESTful Table API**: Sistema de almacenamiento de datos
- **4 Tablas de datos**:
  - `pedidos_oracion`: Peticiones de oración
  - `agradecimientos`: Testimonios de gratitud
  - `testimonios`: Experiencias de fe
  - `noticias`: Publicaciones y eventos

---

## 📊 Estructura de Datos

### Tabla: pedidos_oracion
- `id` (text): ID único
- `nombre` (text): Nombre del solicitante
- `peticion` (rich_text): Descripción de la petición
- `categoria` (text): Categoría del pedido
- `fecha` (datetime): Fecha de creación
- `estado` (text): activo/respondido
- `oraciones_count` (number): Contador de oraciones

### Tabla: agradecimientos
- `id` (text): ID único
- `nombre` (text): Nombre de quien agradece
- `testimonio` (rich_text): Descripción del agradecimiento
- `fecha` (datetime): Fecha de creación
- `categoria` (text): Categoría de bendición

### Tabla: testimonios
- `id` (text): ID único
- `nombre` (text): Nombre de quien comparte
- `titulo` (text): Título del testimonio
- `contenido` (rich_text): Contenido completo
- `fecha` (datetime): Fecha de creación
- `versiculo` (text): Versículo bíblico relacionado

### Tabla: noticias
- `id` (text): ID único
- `titulo` (text): Título de la publicación
- `contenido` (rich_text): Contenido de la noticia
- `fecha` (datetime): Fecha de publicación
- `tipo` (text): noticia/evento/anuncio
- `fecha_evento` (datetime): Fecha del evento (opcional)

---

## 📁 Estructura de Archivos

```
/
├── index.html              # Página principal
├── css/
│   └── style.css          # Estilos principales
├── js/
│   └── main.js            # Lógica y funcionalidad
└── README.md              # Documentación
```

---

## 🚀 Funcionalidades Técnicas

### API REST Endpoints Utilizados

#### Pedidos de Oración
- `GET tables/pedidos_oracion?limit=100&sort=-created_at` - Listar peticiones
- `POST tables/pedidos_oracion` - Crear nueva petición
- `GET tables/pedidos_oracion/{id}` - Obtener petición específica
- `PATCH tables/pedidos_oracion/{id}` - Actualizar contador de oraciones

#### Agradecimientos
- `GET tables/agradecimientos?limit=100&sort=-created_at` - Listar agradecimientos
- `POST tables/agradecimientos` - Crear nuevo agradecimiento

#### Testimonios
- `GET tables/testimonios?limit=100&sort=-created_at` - Listar testimonios
- `POST tables/testimonios` - Crear nuevo testimonio

#### Noticias
- `GET tables/noticias?limit=100&sort=-created_at` - Listar publicaciones
- `POST tables/noticias` - Crear nueva publicación

### Características JavaScript
- **Navegación suave** con scroll animado
- **Menú móvil responsive** con hamburguesa
- **Filtros dinámicos** por categoría
- **Actualización automática** cada 30 segundos
- **Validación de formularios**
- **Mensajes de confirmación** animados
- **Manejo de errores** robusto
- **Escape de HTML** para seguridad

---

## 📱 Responsive Design

### Puntos de Quiebre (Breakpoints)
- **Desktop**: > 992px
- **Tablet**: 768px - 992px
- **Mobile**: < 768px
- **Small Mobile**: < 480px

### Adaptaciones Móviles
- Menú hamburguesa
- Grids de una columna
- Tipografía ajustada
- Espaciado optimizado
- Botones táctiles amplios

---

## 🔐 Seguridad

- Escape de HTML en todos los contenidos generados por usuarios
- Validación de formularios en cliente
- Sanitización de datos antes de enviar
- Protección contra XSS

---

## 🌐 Enlaces Externos Oficiales

### Recursos Adventistas
- [Iglesia Adventista Mundial](https://www.adventistas.org/es/)
- [Adventistas Chile](https://www.adventistas.cl/)
- [Escuela Sabática](https://escuelasabatica.cl/)
- [EGW Writings](https://egwwritings.org/)
- [28 Creencias Fundamentales](https://www.adventistas.org/es/creencias/)
- [Hope TV en Español](https://www.hopetv.org/es/)
- [Radio Adventista](https://www.adventistas.org/es/radio/)

### Estudio Bíblico
- [Bible Gateway - RV 1960](https://www.biblegateway.com/versions/Reina-Valera-1960-RVR1960-Biblia/)
- [Videos Educativos](https://am.adventistas.org/es/recursos/videos/)
- [Ministerios NPE](https://www.ministeriosnpe.org/)

---

## 🎯 Próximas Funcionalidades Sugeridas

### Corto Plazo
- [ ] Sistema de autenticación de usuarios
- [ ] Perfil de miembros
- [ ] Sistema de notificaciones por email
- [ ] Chat en vivo para consejería
- [ ] Calendario de eventos interactivo

### Mediano Plazo
- [ ] Transmisión en vivo de cultos
- [ ] Archivo de sermones en audio/video
- [ ] Grupos pequeños virtuales
- [ ] Sistema de diezmos y ofrendas en línea
- [ ] App móvil nativa

### Largo Plazo
- [ ] Plataforma de educación adventista
- [ ] Sistema de seguimiento de nuevos creyentes
- [ ] Red social privada de la iglesia
- [ ] Integración con sistema de gestión de iglesia
- [ ] Traducción a otros idiomas

---

## 📋 Instrucciones de Uso

### Para Miembros de la Iglesia

1. **Compartir Pedido de Oración**:
   - Ve a la sección "Pedidos de Oración"
   - Completa el formulario con tu nombre, categoría y petición
   - Haz clic en "Enviar Pedido"

2. **Orar por Otros**:
   - Navega por las peticiones activas
   - Haz clic en "Orar por esto" para unirte en oración
   - El contador se actualizará automáticamente

3. **Compartir Testimonio**:
   - Ve a "Testimonios de Fe" o "Agradecimientos a Dios"
   - Completa el formulario correspondiente
   - Tu testimonio será visible para toda la comunidad

4. **Estudiar la Biblia**:
   - Explora la sección "Estudio Bíblico"
   - Accede a recursos externos haciendo clic en los enlaces
   - Utiliza la "Biblioteca de Esperanza" para leer libros de EGW

### Para Administradores

1. **Publicar Noticias**:
   - Ve a la sección "Noticias y Eventos"
   - Completa el formulario con título, tipo y contenido
   - Si es un evento, agrega la fecha del evento
   - Haz clic en "Publicar"

2. **Moderar Contenido**:
   - Revisa regularmente las publicaciones
   - Contacta al desarrollador para funciones de moderación avanzadas

---

## 🤝 Contribuciones y Soporte

Este proyecto fue desarrollado como una herramienta de servicio para la comunidad de fe de la Iglesia Adventista del Séptimo Día de San Francisco de Limache.

### Contacto del Desarrollador
**Mauricio Galaz**
- Disponible para actualizaciones y mejoras
- Soporte técnico y mantenimiento

---

## 📄 Licencia y Derechos

Este sitio web ha sido desarrollado específicamente para la Iglesia Adventista del Séptimo Día de San Francisco de Limache. Todos los contenidos relacionados con la fe adventista y los escritos de Elena G. de White son propiedad de sus respectivos titulares.

---

## 🙏 Versículo de Inspiración

> *"Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos."*
> 
> **Mateo 18:20**

---

## 📞 Información de la Iglesia

**Iglesia Adventista del Séptimo Día**  
San Francisco de Limache  
Región de Valparaíso, Chile

**Horarios de Culto:**
- **Sábados**
  - Escuela Sabática: 9:30 AM
  - Culto Divino: 11:00 AM

---

## 🔄 Historial de Versiones

### Versión 1.0.0 (2024)
- ✅ Lanzamiento inicial
- ✅ Sistema de pedidos de oración
- ✅ Agradecimientos y testimonios
- ✅ Estudio bíblico y biblioteca
- ✅ Oración intercesora
- ✅ Noticias y eventos
- ✅ Página de contacto
- ✅ Diseño responsive completo
- ✅ Integración con API REST

---

## 🌟 Agradecimientos

Agradecemos a Dios por guiar este proyecto y a toda la comunidad de la Iglesia Adventista del Séptimo Día de San Francisco de Limache por su fe, amor y compromiso.

**¡Que este sitio sea una bendición para todos los que lo visiten!**

---

*Desarrollado con 💙 y 🙏 por Mauricio Galaz para la gloria de Dios*