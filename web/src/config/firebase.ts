import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCV8J4oVML625ipMd_saE_9zd2iKhaoRYw",
  authDomain: "smart-attendance-systems-9bcfb.firebaseapp.com",
  projectId: "smart-attendance-systems-9bcfb",
  storageBucket: "smart-attendance-systems-9bcfb.firebasestorage.app",
  messagingSenderId: "847627919025",
  appId: "1:847627919025:web:403488ff0ee4942c6a8c90",
  measurementId: "G-WK33JC4FGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Cloud Messaging
export const messaging = getMessaging(app);

export { app };
