import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('./data_to_upload.json', 'utf-8'));
const chunkSize = Math.ceil(data.length / 3);

for (let i = 0; i < 3; i++) {
  const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
  fs.writeFileSync(`./data_chunk_${i + 1}.json`, JSON.stringify(chunk, null, 2));
}

console.log('Split into 3 chunks.');
