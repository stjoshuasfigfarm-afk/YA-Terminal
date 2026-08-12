import axios from 'axios';
async function test() {
  try {
    const res = await axios.get('https://opensky-network.org/api/states/all');
    console.log(res.data.states.length);
  } catch (err: any) {
    console.error(err.message);
  }
}
test();
