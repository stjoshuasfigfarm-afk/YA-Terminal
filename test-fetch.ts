import http from 'http';
http.get('http://localhost:3000/api/live-vessels', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    const aisVessels = json.vessels.filter((v: any) => v.baseLat === v.lat && v.lastSignalSecAgo >= 0).slice(0, 5);
    console.log(JSON.stringify(aisVessels, null, 2));
  });
});
