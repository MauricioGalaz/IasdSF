import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

let db = null;
let cantos = [];
let filtroCategoria = "todos";
let soloFavoritos = false;
let favoritos = JSON.parse(localStorage.getItem("favoritosInfantil") || "[]");

const categoriasValidas = ["cuna", "infantes", "primarios"];

const cantosDemo = [
  // CUNA
  { titulo:"Jesús me ama", categoria:"cuna", edad:"0 a 3 años", tema:"Amor de Jesús", videoId:"XV2aeb-xZtE", destacado:true, fecha:"2026-01-01" },
  { titulo:"Dios es amor", categoria:"cuna", edad:"0 a 3 años", tema:"Confianza", videoId:"I0bUOXMePhc", destacado:false, fecha:"2026-01-02" },
  { titulo:"Niños de Fe", categoria:"cuna", edad:"0 a 3 años", tema:"Confianza", videoId:"Kxk8ZrBA_94", destacado:false, fecha:"2026-01-03" },
  { titulo:"En Esto Creemos", categoria:"cuna", edad:"0 a 3 años", tema:"Confianza", videoId:"TGYn1lDfJGY", destacado:false, fecha:"2026-01-04" },
  { titulo:"Los 12 Discípulos", categoria:"cuna", edad:"0 a 3 años", tema:"Biblia", videoId:"pXGLG7GWvfQ", destacado:false, fecha:"2026-01-05" },
  { titulo:"Sonríe", categoria:"cuna", edad:"0 a 3 años", tema:"Alegría", videoId:"pXGLG7GWvfQ", destacado:false, fecha:"2026-01-06" },
  { titulo:"Dios hizo el mundo feliz", categoria:"cuna", edad:"0 a 3 años", tema:"Creación", videoId:"2o6G-oZStrQ", destacado:false, fecha:"2026-01-07" },
  { titulo:"Cristo es siempre fiel", categoria:"cuna", edad:"0 a 3 años", tema:"Fidelidad", videoId:"WGAHf4vaN-o", destacado:false, fecha:"2026-01-08" },
  { titulo:"Dijo Dios", categoria:"cuna", edad:"0 a 3 años", tema:"Creación", videoId:"Y-fYlF_BWCk", destacado:false, fecha:"2026-01-09" },
  { titulo:"Cristo manda a su ángel", categoria:"cuna", edad:"0 a 3 años", tema:"Protección", videoId:"h7eM5aecPZE", destacado:false, fecha:"2026-01-10" },
  { titulo:"Salmos 52:9", categoria:"cuna", edad:"0 a 3 años", tema:"Versículo", videoId:"fhO6Uq8LPPg", destacado:false, fecha:"2026-01-11" },
  { titulo:"¡Aleluya!", categoria:"cuna", edad:"0 a 3 años", tema:"Alabanza", videoId:"wvRSzT3LBr4", destacado:false, fecha:"2026-01-12" },
  { titulo:"Salmo 100:2", categoria:"cuna", edad:"0 a 3 años", tema:"Alabanza", videoId:"mV_JtNq1wPg", destacado:false, fecha:"2026-01-13" },
  { titulo:"Siempre soy feliz", categoria:"cuna", edad:"0 a 3 años", tema:"Alegría", videoId:"59DwpBJbqzI", destacado:false, fecha:"2026-01-14" },
  { titulo:"Habla tu Dios de mañana", categoria:"cuna", edad:"0 a 3 años", tema:"Oración", videoId:"XPwiYxDMuIc", destacado:false, fecha:"2026-01-15" },
  { titulo:"Cristo ama niños como yo", categoria:"cuna", edad:"0 a 3 años", tema:"Amor de Jesús", videoId:"VdiGNxtNcio", destacado:false, fecha:"2026-01-16" },

  // INFANTES
  { titulo:"Yo tengo gozo", categoria:"infantes", edad:"4 a 6 años", tema:"Alegría", videoId:"NEehhwm2YeI", destacado:true, fecha:"2026-02-01" },
  { titulo:"Mi Dios es tan grande", categoria:"infantes", edad:"4 a 6 años", tema:"Poder de Dios", videoId:"EVFAtugGOgg", destacado:false, fecha:"2026-02-02" },
  { titulo:"El Sábado es un Día Especial", categoria:"infantes", edad:"4 a 6 años", tema:"Sábado", videoId:"gNtWGg45WEg", destacado:false, fecha:"2026-02-03" },
  { titulo:"Escucha el Llamado", categoria:"infantes", edad:"4 a 6 años", tema:"Misión", videoId:"p7ewnX6XUcc", destacado:false, fecha:"2026-02-04" },
  { titulo:"Canto Chispas de Luz", categoria:"infantes", edad:"4 a 6 años", tema:"Testimonio", videoId:"tOJnV-qwSKk", destacado:false, fecha:"2026-02-05" },
  { titulo:"He decidido seguir a Cristo", categoria:"infantes", edad:"4 a 6 años", tema:"Decisión", videoId:"0dAFchsvvEQ", destacado:false, fecha:"2026-02-06" },
  { titulo:"Gigante David", categoria:"infantes", edad:"4 a 6 años", tema:"Biblia", videoId:"dOk5pTrofOA", destacado:false, fecha:"2026-02-07" },
  { titulo:"Peces", categoria:"infantes", edad:"4 a 6 años", tema:"Creación", videoId:"OQqhwnKU-Yg", destacado:false, fecha:"2026-02-08" },

  // PRIMARIOS
  { titulo:"Cristo me ama", categoria:"primarios", edad:"7 a 9 años", tema:"Salvación", videoId:"u5pQ729YtGg", destacado:false, fecha:"2026-03-01" },
  { titulo:"Alabaré", categoria:"primarios", edad:"7 a 9 años", tema:"Alabanza", videoId:"I0bUOXMePhc", destacado:false, fecha:"2026-03-02" },
  { titulo:"El Sábado es un Día Especial", categoria:"primarios", edad:"7 a 9 años", tema:"Sábado", videoId:"zk0mMnVx7kc", destacado:false, fecha:"2026-03-03" },
  { titulo:"Libre", categoria:"primarios", edad:"7 a 9 años", tema:"Alabanza", videoId:"3-Pvs4c6rvI", destacado:false, fecha:"2026-03-04" },
  { titulo:"Todo terminará bien", categoria:"primarios", edad:"7 a 9 años", tema:"Esperanza", videoId:"PI95_ag8wok", destacado:false, fecha:"2026-03-05" },
  { titulo:"Restaurados", categoria:"primarios", edad:"7 a 9 años", tema:"Restauración", videoId:"hUlLs6yccco", destacado:false, fecha:"2026-03-06" },
  { titulo:"No tenemos miedo al fuego", categoria:"primarios", edad:"7 a 9 años", tema:"Fe", videoId:"5TjlOn6GLtY", destacado:false, fecha:"2026-03-07" },
  { titulo:"Splash", categoria:"primarios", edad:"7 a 9 años", tema:"Alabanza", videoId:"yICVfOwohRI", destacado:false, fecha:"2026-03-08" },
  { titulo:"Daniel", categoria:"primarios", edad:"7 a 9 años", tema:"Biblia", videoId:"DefkregMPmo", destacado:false, fecha:"2026-03-09" },
  { titulo:"Tres veces oraba Daniel", categoria:"primarios", edad:"7 a 9 años", tema:"Oración", videoId:"DiCuuwpYPBQ", destacado:false, fecha:"2026-03-10" },
  { titulo:"TODO OJO LE VERÁ", categoria:"primarios", edad:"7 a 9 años", tema:"Biblia", videoId:"GU-0RYgR2jg", destacado:false, fecha:"2026-03-11" },
  { titulo:"7 COLORES DE LA PROMESA", categoria:"primarios", edad:"7 a 9 años", tema:"Oración", videoId:"HZ0wDPWZhEk", destacado:false, fecha:"2026-03-11" }



];

function categoriaValida(cat) {
  return categoriasValidas.includes(cat);
}

function thumb(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function catLabel(cat) {
  return {
    cuna: "Cuna",
    infantes: "Infantes",
    primarios: "Primarios"
  }[cat] || cat;
}

function catColor(cat) {
  return {
    cuna: "#ec4899",
    infantes: "#f59e0b",
    primarios: "#00bcd4"
  }[cat] || "#fec325";
}

async function cargarCantos() {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    const q = query(collection(db, "cantos"), orderBy("fecha", "desc"));
    const snap = await getDocs(q);

    cantos = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => categoriaValida(c.categoria));

    if (!cantos.length) {
      cantos = cantosDemo;
    }

  } catch (e) {
    cantos = cantosDemo;
    console.warn("Modo demo activo. Configura Firebase para usar base de datos real.", e);
  }

  document.getElementById("loader").style.display = "none";
  renderizar();
}

window.renderizar = function () {
  const cont = document.getElementById("contenedorCantos");
  const busqueda = (document.getElementById("busqueda")?.value || "").toLowerCase().trim();
  const orden = document.getElementById("orden")?.value || "reciente";

  let lista = [...cantos]
    .filter(c => categoriaValida(c.categoria))
    .filter(c => {
      const texto = `${c.titulo} ${c.categoria} ${c.edad} ${c.tema}`.toLowerCase();
      const okCat = filtroCategoria === "todos" || c.categoria === filtroCategoria;
      const okFav = !soloFavoritos || favoritos.includes(c.videoId);
      return okCat && okFav && texto.includes(busqueda);
    });

  if (orden === "titulo") {
    lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }

  if (orden === "edad") {
    lista.sort((a, b) => (a.edad || "").localeCompare(b.edad || ""));
  }

  if (orden === "reciente") {
    lista.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }

  if (!lista.length) {
    cont.innerHTML = `<div class="empty">No hay cantos para esta búsqueda.</div>`;
    return;
  }

  const grupos = ["cuna", "infantes", "primarios"].filter(cat =>
    lista.some(c => c.categoria === cat)
  );

  cont.innerHTML = grupos.map(cat => {
    const items = lista.filter(c => c.categoria === cat).map(cardCanto).join("");

    return `
      <section>
        <div class="mb-2">
          <p class="row-subtitle">Escuela Sabática</p>
          <h2 class="row-title" style="color:${catColor(cat)}">${catLabel(cat)}</h2>
        </div>

        <div class="video-row">
          ${items}
        </div>
      </section>
    `;
  }).join("");
};

function cardCanto(c) {
  const fav = favoritos.includes(c.videoId);
  const color = catColor(c.categoria);

  return `
    <article class="card-canto" onclick="abrirVideo('${c.videoId}')">
      <div class="thumb-wrap">
        <img src="${c.imagen || thumb(c.videoId)}" alt="${c.titulo}">
        <div class="play-float">
          <i class="fa-solid fa-play"></i>
        </div>
      </div>

      <div class="card-body">
        <span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}55">
          <i class="fa-solid fa-child-reaching"></i> ${catLabel(c.categoria)}
        </span>

        <h3 class="card-title mt-3">${c.titulo}</h3>

        <p class="card-meta">
          ${c.edad || "Edad sugerida"} · ${c.tema || "Canto infantil"}
        </p>

        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="mini-btn" onclick="abrirVideo('${c.videoId}')">
            <i class="fa-solid fa-display"></i> Proyectar
          </button>

          <button class="mini-btn" onclick="favorito('${c.videoId}')">
            <i class="fa-${fav ? "solid" : "regular"} fa-heart"></i>
          </button>

          <a class="mini-btn text-center" target="_blank"
href="https://wa.me/?text=${encodeURIComponent("Canto infantil: " + c.titulo + " https://www.youtube.com/watch?v=" + c.videoId)}">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

window.abrirVideo = function (videoId) {
  const iframe = document.getElementById("iframeVideo");

  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`;

  document.getElementById("videoModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    const modal = document.getElementById("videoModal");

    if (modal.requestFullscreen) {
      modal.requestFullscreen().catch(() => {});
    }
  }, 300);
};

window.cerrarVideo = function () {
  document.getElementById("videoModal").classList.add("hidden");
  document.getElementById("iframeVideo").src = "";
  document.body.style.overflow = "auto";
  salirPantallaCompleta();
};

window.salirPantallaCompleta = function () {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
};

window.favorito = function (videoId) {
  favoritos = favoritos.includes(videoId)
    ? favoritos.filter(x => x !== videoId)
    : [...favoritos, videoId];

  localStorage.setItem("favoritosInfantil", JSON.stringify(favoritos));
  renderizar();
};

window.filtrarCategoria = function (cat) {
  filtroCategoria = cat;
  soloFavoritos = false;

  document.querySelectorAll(".nav-pill").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === cat);
  });

  renderizar();

  document.getElementById("menuMobile")?.classList.add("hidden");
  scrollToColeccion();
};

window.toggleFavoritos = function () {
  soloFavoritos = !soloFavoritos;
  renderizar();
  scrollToColeccion();
};

window.toggleMenuMobile = function () {
  document.getElementById("menuMobile").classList.toggle("hidden");
};

window.scrollToColeccion = function () {
  document.getElementById("coleccion").scrollIntoView({ behavior: "smooth" });
};

window.modoProyector = function () {
  document.body.classList.toggle("proyector");
  scrollToColeccion();
};

cargarCantos();