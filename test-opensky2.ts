import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('https://opensky-network.org/api/states/all', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    console.log("Success:", res.data.states.length);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
test();
