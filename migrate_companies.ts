import { COMPANIES } from './src/data/companies';
import * as fs from 'fs';

const localCompanies = COMPANIES.slice(0, 100);
const firestoreCompanies = COMPANIES.slice(100);

const localContent = `import { Company } from './companies';
export const COMPANIES: Company[] = ${JSON.stringify(localCompanies, null, 2)};`;

fs.writeFileSync('./src/data/companies_local.ts', localContent);
fs.writeFileSync('./data_to_upload.json', JSON.stringify(firestoreCompanies, null, 2));

console.log('Split companies into 100 local and', firestoreCompanies.length, 'for firestore.');
