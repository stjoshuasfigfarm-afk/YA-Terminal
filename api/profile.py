import os, requests, json
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        symbol = self.path.split('/')[-1].upper()
        api_key = os.environ.get('FINNHUB_API_KEY')
        
        url = f"https://finnhub.io/api/v1/stock/profile2?symbol={symbol}&token={api_key}"
        res = requests.get(url)
        data = res.json()
        
        # Mapping to match your Terminal's expected layout
        payload = {
            "companyName": data.get('name', symbol),
            "mktCap": data.get('marketCapitalization', 0) * 1000000,
            "industry": data.get('finnhubIndustry', 'N/A'),
            "logo": data.get('logo', ''),
            "website": data.get('weburl', '')
        }

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())