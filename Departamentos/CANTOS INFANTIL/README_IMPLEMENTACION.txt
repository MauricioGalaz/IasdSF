NETFLIX ADVENTISTA INFANTIL - IASD SAN FRANCISCO DE LIMACHE

PASO 1: CREAR FIREBASE
1. Entra a https://console.firebase.google.com/
2. Crear proyecto: netflix-adventista-infantil
3. Agregar app Web.
4. Copiar firebaseConfig.
5. Pegar los datos en js/firebase-config.js

PASO 2: ACTIVAR AUTHENTICATION
1. Firebase > Authentication > Sign-in method.
2. Activar Email/Password.
3. Crear usuario admin con correo y clave.

PASO 3: ACTIVAR FIRESTORE
1. Firebase > Firestore Database.
2. Crear base de datos.
3. En Rules pegar el contenido de firebase-rules.txt
4. Publicar reglas.

PASO 4: SUBIR CANTOS
1. Abrir admin/index.html en hosting.
2. Entrar con correo admin.
3. Agregar título, categoría, edad, tema y videoId.
4. El videoId es lo que viene después de watch?v= en YouTube.

PASO 5: SUBIR A HOSTING
Opción rápida Netlify:
1. Arrastrar carpeta netflix_adventista_infantil a Netlify Drop.

Opción Firebase Hosting:
1. npm install -g firebase-tools
2. firebase login
3. firebase init hosting
4. public: ./
5. firebase deploy

PASO 6: APK ANDROID CON CAPACITOR
1. Instalar Node.js 22 o superior.
2. En la carpeta del proyecto ejecutar:
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Ministerio Infantil IASD" "cl.iasdlimache.infantil" --web-dir .
   npx cap add android
   npx cap copy
   npx cap open android
3. En Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s).

IMPORTANTE:
- Para que Firebase funcione bien, súbelo a hosting. Abierto directo como archivo puede bloquear módulos por seguridad del navegador.
- Puedes cambiar colores y textos en index.html y css/styles.css.
