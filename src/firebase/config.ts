import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Safe double initialization guard for React hot-reloading
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: any;
const globalWithFirestore = globalThis as typeof globalThis & { _firestoreDb?: any };

if (globalWithFirestore._firestoreDb) {
  db = globalWithFirestore._firestoreDb;
} else {
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    globalWithFirestore._firestoreDb = db;
  } catch (e) {
    console.error("Error initializing Firestore, using fallback with correct database ID:", e);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    globalWithFirestore._firestoreDb = db;
  }
}

export { db };
