import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import * as fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function upload(filename: string) {
  const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
  const col = collection(db, 'companies');
  console.log(`Starting upload for ${filename} (${data.length} items)...`);
  
  for (let i = 0; i < data.length; i++) {
    await addDoc(col, data[i]);
    if (i % 20 === 0) console.log(`Uploaded ${i} items...`);
  }
  console.log(`Successfully uploaded ${data.length} items from ${filename}.`);
}

const filename = process.argv[2];
if (!filename) {
  console.error("Please provide a filename.");
  process.exit(1);
}

upload(filename).catch(console.error);
