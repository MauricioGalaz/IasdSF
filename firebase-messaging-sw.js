importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyAoC_7Pehjca4CQSoy0K3Rm5q9CC-IY1Ic",
    authDomain: "iasd-limache-muro.firebaseapp.com",
    projectId: "iasd-limache-muro",
    messagingSenderId: "277039117234",
    appId: "1:277039117234:web:65f4e76064935cadabaaab"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png"
    });
});
