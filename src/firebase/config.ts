import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Safe double initialization guard for React hot-reloading
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db;
try {
  // Try to initialize. If it fails due to connectivity, we might catch it,
  // but Firestore automatically retries itself.
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.error("Error initializing Firestore, using fallback:", e);
  db = getFirestore(app);
}

export { db };
