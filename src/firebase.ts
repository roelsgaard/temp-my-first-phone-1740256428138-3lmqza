import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, set, onValue, remove, query, orderByChild, get, push } from 'firebase/database';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Import the auth module explicitly
import 'firebase/auth';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_RTDB_URL',
  'VITE_FIREBASE_VAPID_KEY'
] as const;

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
    'Please create a .env file with the following variables:\n\n' +
    requiredEnvVars.map(varName => `${varName}=your_${varName.toLowerCase()}`).join('\n')
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_RTDB_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Database with app instance
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
const messaging = getMessaging(app);

// Function to play notification sound
const playNotificationSound = () => {
  const audio = new Audio('/notification.mp3');
  audio.play().catch(error => {
    console.error('Error playing notification sound:', error);
  });
};

// Function to request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && auth.currentUser?.email) {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        // Store the token in the Realtime Database
        const email = auth.currentUser.email;
        const sanitizedEmail = email.replace(/[.#$[\]]/g, '_');
        await set(ref(database, `fcmTokens/${sanitizedEmail}`), {
          token,
          email,
          lastUpdated: Date.now()
        });
      }
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Function to send a notification using FCM
export const sendNotification = async (toEmail: string, title: string, body: string, url?: string) => {
  try {
    const sanitizedEmail = toEmail.replace(/[.#$[\]]/g, '_');
    const tokenRef = ref(database, `fcmTokens/${sanitizedEmail}`);
    const snapshot = await get(tokenRef);
    const tokenData = snapshot.val();

    if (tokenData?.token) {
      // Send the message directly using FCM
      const message = {
        token: tokenData.token,
        notification: {
          title,
          body
        },
        data: {
          url: url || '/',
          sound: 'notification.mp3' // Add sound to the notification data
        },
        webpush: {
          fcmOptions: {
            link: url || '/'
          }
        }
      };

      // Send the message using the Firebase Admin SDK via a Cloud Function
      const functionsEndpoint = `https://${import.meta.env.VITE_FIREBASE_REGION}-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendNotification`;
      
      const response = await fetch(functionsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`);
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Listen for incoming messages when the app is in the foreground
onMessage(messaging, (payload) => {
  // Play notification sound
  playNotificationSound();

  // Display the notification using the Notifications API
  if (Notification.permission === 'granted') {
    const notification = new Notification(payload.notification?.title || 'New Message', {
      body: payload.notification?.body,
      icon: '/icon.svg',
      data: {
        url: payload.data?.url || '/'
      },
      silent: false // Ensure browser's default notification sound is enabled
    });

    // Handle notification click in the foreground
    notification.onclick = () => {
      window.focus();
      notification.close();
      window.location.href = payload.data?.url || '/';
    };
  }
});

// Export initialized instances and other functions
export { app, auth, database, googleProvider, messaging };

export const createCallOffer = async (fromEmail: string, toEmail: string, offer: RTCSessionDescriptionInit) => {
  const callId = `${fromEmail.replace(/[.@]/g, '_')}-${toEmail.replace(/[.@]/g, '_')}`;
  await set(ref(database, `calls/${callId}`), {
    offer,
    fromEmail,
    toEmail,
    timestamp: Date.now()
  });
  return callId;
};

export const createCallAnswer = async (callId: string, answer: RTCSessionDescriptionInit) => {
  await set(ref(database, `calls/${callId}/answer`), answer);
};

export const addIceCandidate = async (callId: string, candidate: RTCIceCandidateInit, isOffer: boolean) => {
  const path = isOffer ? 'offerCandidates' : 'answerCandidates';
  await set(ref(database, `calls/${callId}/${path}/${Date.now()}`), candidate);
};

export const listenToCall = (callId: string, callback: (data: any, callId?: string) => void) => {
  const callsRef = ref(database, 'calls');
  
  return onValue(callsRef, (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const key = childSnapshot.key;
      const data = childSnapshot.val();
      
      if (callId === key) {
        callback(data, key);
        return;
      }
      
      if (data?.toEmail === auth.currentUser?.email && !data.answer) {
        callback(data, key);
      }
    });
  });
};

export const endCall = async (callId: string) => {
  await remove(ref(database, `calls/${callId}`));
};