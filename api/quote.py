import os
import requests
import random
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # 1. Extract Symbol (e.g., AAPL) from the end of the URL path
        symbol = self.path.split('/')[-1].upper()
        
        # 2. Match your Vercel Environment Variable name exactly
        api_key = os.environ.get('FINNHUB_API_KEY')

        try:
            if not api_key:
                raise ValueError("FINNHUB_API_KEY is missing in Vercel settings")

            # 3. Fetch from Finnhub API
            url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={api_key}"
            response = requests.get(url)
            data = response.json()

            # 4. Finnhub uses 'c' for Current Price, 'd' for Change, etc.
            payload = {
                "price": data.get('c'),
                "changes": data.get('d'),
                "changesPercentage": data.get('dp'),
                "high": data.get('h'),
                "low": data.get('l'),
                "symbol": symbol,
                "status": "live"
            }
            status = 200

        except Exception as e:
            # 5. Safety Fallback: If the API fails, show a random price so the UI doesn't break
            mock_price = random.uniform(150, 250)
            payload = {
                "price": round(mock_price, 2),
                "changes": round(random.uniform(-2, 2), 2),
                "symbol": symbol,
                "status": "mock",
                "error": str(e)
            }
            status = 200 

        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())
