importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD5uPN1I2Pnn5QYGHoM4KnFB2iVv-Iogpw',
  authDomain: 'myfirstphone-123.firebaseapp.com',
  projectId: 'myfirstphone-123',
  storageBucket: 'gs://myfirstphone-123.firebasestorage.app',
  messagingSenderId: '545991977725',
  appId: '1:545991977725:web:8d4eed02d54c62539dac94'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg',
    data: {
      url: payload.data?.url || '/'
    },
    requireInteraction: true,
    sound: '/notification.mp3' // Add default notification sound
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});