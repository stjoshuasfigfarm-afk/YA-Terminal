import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import * as fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function upload() {
  const data = JSON.parse(fs.readFileSync('./data_to_upload.json', 'utf-8'));
  const col = collection(db, 'companies');
  // Upload only first 5 for testing
  for (const company of data.slice(0, 5)) {
    await addDoc(col, company);
  }
  console.log('Uploaded 5 companies.');
}

upload().catch(console.error);
