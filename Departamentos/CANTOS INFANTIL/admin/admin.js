import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.login = async function(){
  try{ await signInWithEmailAndPassword(auth, email.value, password.value); loginMsg.textContent = ""; }
  catch(e){ loginMsg.textContent = "Error: revisa correo, contraseña o configuración Firebase."; }
};
window.logout = async function(){ await signOut(auth); };

onAuthStateChanged(auth, user => {
  loginBox.classList.toggle("hidden", !!user);
  adminBox.classList.toggle("hidden", !user);
  if(user) cargarLista();
});

window.guardarCanto = async function(e){
  e.preventDefault();
  try{
    await addDoc(collection(db,"cantos"), {
      titulo: titulo.value.trim(),
      categoria: categoria.value,
      edad: edad.value.trim(),
      tema: tema.value.trim(),
      videoId: videoId.value.trim().replace("https://youtu.be/","").replace("https://www.youtube.com/watch?v=","").split("&")[0],
      imagen: imagen.value.trim(),
      destacado: destacado.checked,
      fecha: new Date().toISOString().slice(0,10),
      creado: serverTimestamp()
    });
    e.target.reset(); msg.textContent = "Canto guardado correctamente."; cargarLista();
  }catch(err){ msg.textContent = "No se pudo guardar. Revisa reglas de Firestore."; }
};

async function cargarLista(){
  const q = query(collection(db,"cantos"), orderBy("fecha","desc"));
  const snap = await getDocs(q);
  listaAdmin.innerHTML = snap.docs.map(d => {
    const c = d.data();
    return `<div class="item"><div><b>${c.titulo}</b><p class="text-white/50 text-xs uppercase font-bold">${c.categoria} · ${c.videoId}</p></div><button class="danger" onclick="eliminarCanto('${d.id}')">Eliminar</button></div>`;
  }).join("") || `<p class="text-white/50 font-bold">Aún no hay cantos en Firebase.</p>`;
}

window.eliminarCanto = async function(id){
  if(!confirm("¿Eliminar este canto?")) return;
  await deleteDoc(doc(db,"cantos",id));
  cargarLista();
};
