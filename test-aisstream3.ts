import WebSocket from 'ws';
const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
ws.on('open', () => {
    ws.send(JSON.stringify({
        APIKey: process.env.AISSTREAM_API_KEY,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ["ShipStaticData"]
    }));
});
ws.on('message', (data) => {
    console.log(data.toString());
    process.exit(0);
});
setTimeout(() => process.exit(1), 5000);
