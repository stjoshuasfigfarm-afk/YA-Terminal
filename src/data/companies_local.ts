import { Company } from './companies';
export const COMPANIES: Company[] = [
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "lat": 37.3349,
    "lng": -122.0091,
    "country": "USA",
    "partners": [
      "TSM",
      "FOXCONN",
      "MSFT"
    ],
    "workforce": "164,000",
    "headquarters": "Cupertino, CA",
    "domain": "apple.com"
  },
  {
    "symbol": "MSFT",
    "name": "Microsoft",
    "sector": "Technology",
    "lat": 47.6396,
    "lng": -122.1283,
    "country": "USA",
    "partners": [
      "NVDA",
      "ORCL",
      "AMD"
    ],
    "workforce": "221,000",
    "headquarters": "Redmond, WA",
    "domain": "microsoft.com"
  },
  {
    "symbol": "NVDA",
    "name": "Nvidia",
    "sector": "Semiconductors",
    "lat": 37.3712,
    "lng": -121.9663,
    "country": "USA",
    "partners": [
      "TSM",
      "ARM",
      "SMC"
    ],
    "workforce": "26,000",
    "headquarters": "Santa Clara, CA",
    "domain": "nvidia.com"
  },
  {
    "symbol": "TSM",
    "name": "TSMC",
    "sector": "Semiconductors",
    "lat": 24.7816,
    "lng": 121.0153,
    "country": "TWN",
    "partners": [
      "AAPL",
      "NVDA",
      "ASML"
    ],
    "workforce": "73,000",
    "headquarters": "Hsinchu, Taiwan",
    "domain": "tsmc.com"
  },
  {
    "symbol": "ASML",
    "name": "ASML Holding",
    "sector": "Semiconductors",
    "lat": 51.4035,
    "lng": 5.4081,
    "country": "NLD",
    "partners": [
      "TSM",
      "INTC",
      "AMAT"
    ],
    "workforce": "39,000",
    "headquarters": "Veldhoven, Netherlands",
    "domain": "asml.com"
  },
  {
    "symbol": "SMC",
    "name": "Super Micro",
    "sector": "Technology",
    "lat": 37.3794,
    "lng": -121.9407,
    "country": "USA",
    "partners": [
      "NVDA",
      "INTC"
    ],
    "workforce": "5,000",
    "headquarters": "San Jose, CA",
    "domain": "supermicro.com"
  },
  {
    "symbol": "JPM",
    "name": "JPMorgan Chase",
    "sector": "Financial Services",
    "lat": 40.7559,
    "lng": -73.9749,
    "country": "USA",
    "partners": [
      "GS",
      "MS"
    ],
    "domain": "jpmorganchase.com"
  },
  {
    "symbol": "GS",
    "name": "Goldman Sachs",
    "sector": "Financial Services",
    "lat": 40.7145,
    "lng": -74.0145,
    "country": "USA",
    "partners": [
      "JPM",
      "V"
    ],
    "domain": "goldmansachs.com"
  },
  {
    "symbol": "HSBC",
    "name": "HSBC Holdings",
    "sector": "Financial Services",
    "lat": 51.5055,
    "lng": -0.0189,
    "country": "GBR",
    "partners": [
      "JPM"
    ],
    "domain": "hsbc.com"
  },
  {
    "symbol": "DB",
    "name": "Deutsche Bank",
    "sector": "Financial Services",
    "lat": 50.1136,
    "lng": 8.669,
    "country": "DEU",
    "partners": [
      "HSBC"
    ],
    "domain": "db.com"
  },
  {
    "symbol": "TSLA",
    "name": "Tesla Inc.",
    "sector": "Automotive",
    "lat": 30.2241,
    "lng": -97.6258,
    "country": "USA",
    "partners": [
      "CATL",
      "PANASONIC",
      "PARK"
    ],
    "domain": "tesla.com"
  },
  {
    "symbol": "TM",
    "name": "Toyota Motor",
    "sector": "Automotive",
    "lat": 35.0838,
    "lng": 137.1557,
    "country": "JPN",
    "partners": [
      "PANASONIC",
      "DENSO"
    ],
    "domain": "toyota.com"
  },
  {
    "symbol": "XOM",
    "name": "ExxonMobil",
    "sector": "Energy",
    "lat": 32.8925,
    "lng": -96.9452,
    "country": "USA",
    "partners": [
      "CVX",
      "SHEL"
    ],
    "domain": "exxon.com"
  },
  {
    "symbol": "SHEL",
    "name": "Shell PLC",
    "sector": "Energy",
    "lat": 52.3702,
    "lng": 4.8952,
    "country": "GBR",
    "partners": [
      "XOM",
      "TOT"
    ],
    "domain": "shell.com"
  },
  {
    "symbol": "ARAMCO",
    "name": "Saudi Aramco",
    "sector": "Energy",
    "lat": 26.3861,
    "lng": 50.1264,
    "country": "SAU",
    "partners": [
      "TOT",
      "XOM"
    ],
    "domain": "aramco.com"
  },
  {
    "symbol": "AMZN",
    "name": "Amazon.com",
    "sector": "Consumer Cyclical",
    "lat": 47.6092,
    "lng": -122.3331,
    "country": "USA",
    "partners": [
      "UPS",
      "FDX",
      "RIVN"
    ],
    "domain": "amazon.com"
  },
  {
    "symbol": "LVMH",
    "name": "LVMH",
    "sector": "Consumer Cyclical",
    "lat": 48.8718,
    "lng": 2.3015,
    "country": "FRA",
    "partners": [
      "RMS"
    ],
    "domain": "lvmh.com"
  },
  {
    "symbol": "NKE",
    "name": "Nike Inc.",
    "sector": "Consumer Cyclical",
    "lat": 45.4907,
    "lng": -122.8276,
    "country": "USA",
    "partners": [
      "ADDYY"
    ],
    "domain": "nike.com"
  },
  {
    "symbol": "ADDYY",
    "name": "Adidas",
    "sector": "Consumer Cyclical",
    "lat": 49.5815,
    "lng": 10.8841,
    "country": "DEU",
    "partners": [
      "NKE"
    ],
    "domain": "adidas.com"
  },
  {
    "symbol": "700",
    "name": "Tencent",
    "sector": "Technology",
    "lat": 22.5431,
    "lng": 114.0579,
    "country": "CHN",
    "partners": [
      "BABA",
      "BIDU"
    ],
    "domain": "tencent.com",
    "headquarters": "Shenzhen, China"
  },
  {
    "symbol": "9988",
    "name": "Alibaba",
    "sector": "Technology",
    "lat": 30.2741,
    "lng": 120.1551,
    "country": "CHN",
    "partners": [
      "700",
      "JD"
    ],
    "domain": "alibaba.com",
    "headquarters": "Hangzhou, China"
  },
  {
    "symbol": "005930",
    "name": "Samsung Electronics",
    "sector": "Technology",
    "lat": 37.2636,
    "lng": 127.0286,
    "country": "KOR",
    "partners": [
      "AAPL",
      "NVDA",
      "SKHYNIX"
    ],
    "domain": "samsung.com",
    "headquarters": "Suwon, South Korea"
  },
  {
    "symbol": "MELI",
    "name": "MercadoLibre",
    "sector": "Consumer Cyclical",
    "lat": -34.5495,
    "lng": -58.4556,
    "country": "ARG",
    "partners": [
      "AMZN",
      "SHOP"
    ],
    "domain": "mercadolibre.com",
    "headquarters": "Buenos Aires, Argentina"
  },
  {
    "symbol": "VALE",
    "name": "Vale S.A.",
    "sector": "Basic Materials",
    "lat": -22.9068,
    "lng": -43.1729,
    "country": "BRA",
    "partners": [
      "RIO",
      "BHP"
    ],
    "domain": "vale.com",
    "headquarters": "Rio de Janeiro, Brazil"
  },
  {
    "symbol": "META",
    "name": "META Platforms",
    "sector": "Technology",
    "lat": 37.4851,
    "lng": -122.1483,
    "country": "USA",
    "partners": [
      "NVDA",
      "GOOGL"
    ],
    "domain": "meta.com",
    "headquarters": "Menlo Park, CA"
  },
  {
    "symbol": "GOOGL",
    "name": "Alphabet Inc.",
    "sector": "Technology",
    "lat": 37.4221,
    "lng": -122.0841,
    "country": "USA",
    "partners": [
      "AAPL",
      "MSFT",
      "NVDA"
    ],
    "domain": "google.com",
    "headquarters": "Mountain View, CA"
  },
  {
    "symbol": "ORCL",
    "name": "Oracle Corp.",
    "sector": "Technology",
    "lat": 40.5284,
    "lng": -111.8906,
    "country": "USA",
    "partners": [
      "MSFT",
      "AMZN"
    ],
    "domain": "oracle.com",
    "headquarters": "Austin, TX"
  },
  {
    "symbol": "V",
    "name": "Visa Inc.",
    "sector": "Financial Services",
    "lat": 37.5592,
    "lng": -122.2858,
    "country": "USA",
    "partners": [
      "MA",
      "PYPL",
      "JPM"
    ],
    "domain": "visa.com",
    "headquarters": "San Francisco, CA"
  },
  {
    "symbol": "MA",
    "name": "Mastercard",
    "sector": "Financial Services",
    "lat": 41.1009,
    "lng": -73.6841,
    "country": "USA",
    "partners": [
      "V",
      "GS"
    ],
    "domain": "mastercard.com",
    "headquarters": "Purchase, NY"
  },
  {
    "symbol": "CATL",
    "name": "CATL",
    "sector": "Industrials",
    "lat": 26.6655,
    "lng": 119.5479,
    "country": "CHN",
    "partners": [
      "TSLA",
      "BYD"
    ],
    "domain": "catl.com",
    "headquarters": "Ningde, China"
  },
  {
    "symbol": "AMD",
    "name": "AMD",
    "sector": "Technology",
    "lat": 37.3842,
    "lng": -121.979,
    "country": "USA",
    "domain": "amd.com",
    "headquarters": "Santa Clara, CA"
  },
  {
    "symbol": "QCOM",
    "name": "Qualcomm",
    "sector": "Technology",
    "lat": 32.8955,
    "lng": -117.197,
    "country": "USA",
    "domain": "qualcomm.com",
    "headquarters": "San Diego, CA"
  },
  {
    "symbol": "TXN",
    "name": "Texas Instruments",
    "sector": "Technology",
    "lat": 32.9126,
    "lng": -96.761,
    "country": "USA",
    "domain": "ti.com",
    "headquarters": "Dallas, TX"
  },
  {
    "symbol": "AVGO",
    "name": "Broadcom",
    "sector": "Technology",
    "lat": 37.3995,
    "lng": -121.9213,
    "country": "USA",
    "domain": "broadcom.com",
    "headquarters": "San Jose, CA"
  },
  {
    "symbol": "SONY",
    "name": "Sony Group",
    "sector": "Technology",
    "lat": 35.6324,
    "lng": 139.7441,
    "country": "JPN",
    "domain": "sony.com",
    "headquarters": "Tokyo, Japan"
  },
  {
    "symbol": "CRM",
    "name": "Salesforce",
    "sector": "Technology",
    "lat": 37.7897,
    "lng": -122.3972,
    "country": "USA",
    "domain": "salesforce.com",
    "headquarters": "San Francisco, CA"
  },
  {
    "symbol": "ADBE",
    "name": "Adobe Inc.",
    "sector": "Technology",
    "lat": 37.3307,
    "lng": -121.8938,
    "country": "USA",
    "domain": "adobe.com",
    "headquarters": "San Jose, CA"
  },
  {
    "symbol": "PYPL",
    "name": "PayPal",
    "sector": "Technology",
    "lat": 37.3005,
    "lng": -121.9062,
    "country": "USA",
    "domain": "paypal.com",
    "headquarters": "San Jose, CA"
  },
  {
    "symbol": "UBS",
    "name": "UBS Group",
    "sector": "Financial Services",
    "lat": 47.3717,
    "lng": 8.5385,
    "country": "CHE",
    "domain": "ubs.com",
    "headquarters": "Zurich, Switzerland"
  },
  {
    "symbol": "BARC",
    "name": "Barclays",
    "sector": "Financial Services",
    "lat": 51.5049,
    "lng": -0.0163,
    "country": "GBR",
    "domain": "barclays.com",
    "headquarters": "London, UK"
  },
  {
    "symbol": "BNP",
    "name": "BNP Paribas",
    "sector": "Financial Services",
    "lat": 48.8722,
    "lng": 2.3315,
    "country": "FRA",
    "domain": "bnpparibas.com",
    "headquarters": "Paris, France"
  },
  {
    "symbol": "SAN",
    "name": "Santander",
    "sector": "Financial Services",
    "lat": 40.4168,
    "lng": -3.7038,
    "country": "ESP",
    "domain": "santander.com",
    "headquarters": "Madrid, Spain"
  },
  {
    "symbol": "BHP",
    "name": "BHP Group",
    "sector": "Basic Materials",
    "lat": -37.8136,
    "lng": 144.9631,
    "country": "AUS",
    "domain": "bhp.com",
    "headquarters": "Melbourne, Australia"
  },
  {
    "symbol": "RIO",
    "name": "Rio Tinto",
    "sector": "Basic Materials",
    "lat": 51.5074,
    "lng": -0.1278,
    "country": "AUS",
    "domain": "riotinto.com",
    "headquarters": "London, UK"
  },
  {
    "symbol": "LIN",
    "name": "Linde plc",
    "sector": "Basic Materials",
    "lat": 53.3498,
    "lng": -6.2603,
    "country": "IRL"
  },
  {
    "symbol": "BA",
    "name": "Boeing",
    "sector": "Industrials",
    "lat": 47.5301,
    "lng": -122.3005,
    "country": "USA"
  },
  {
    "symbol": "AIR",
    "name": "Airbus",
    "sector": "Industrials",
    "lat": 43.6047,
    "lng": 1.4442,
    "country": "FRA"
  },
  {
    "symbol": "UPS",
    "name": "UPS",
    "sector": "Industrials",
    "lat": 33.9167,
    "lng": -84.3542,
    "country": "USA"
  },
  {
    "symbol": "FDX",
    "name": "FedEx",
    "sector": "Industrials",
    "lat": 35.1495,
    "lng": -90.049,
    "country": "USA"
  },
  {
    "symbol": "DAL",
    "name": "Delta Air Lines",
    "sector": "Industrials",
    "lat": 33.6407,
    "lng": -84.4277,
    "country": "USA"
  },
  {
    "symbol": "LUV",
    "name": "Southwest Airlines",
    "sector": "Industrials",
    "lat": 32.8461,
    "lng": -96.8518,
    "country": "USA"
  },
  {
    "symbol": "MCD",
    "name": "McDonald's",
    "sector": "Consumer Cyclical",
    "lat": 41.8845,
    "lng": -87.892,
    "country": "USA"
  },
  {
    "symbol": "SBUX",
    "name": "Starbucks",
    "sector": "Consumer Cyclical",
    "lat": 47.5818,
    "lng": -122.3352,
    "country": "USA"
  },
  {
    "symbol": "DIS",
    "name": "Disney",
    "sector": "Communication Services",
    "lat": 34.1561,
    "lng": -118.3418,
    "country": "USA"
  },
  {
    "symbol": "NFLX",
    "name": "Netflix",
    "sector": "Communication Services",
    "lat": 37.2367,
    "lng": -121.9616,
    "country": "USA"
  },
  {
    "symbol": "KO",
    "name": "Coca-Cola",
    "sector": "Consumer Defensive",
    "lat": 33.7711,
    "lng": -84.39,
    "country": "USA"
  },
  {
    "symbol": "PEP",
    "name": "PepsiCo",
    "sector": "Consumer Defensive",
    "lat": 41.0379,
    "lng": -73.6811,
    "country": "USA"
  },
  {
    "symbol": "WMT",
    "name": "Walmart",
    "sector": "Consumer Defensive",
    "lat": 36.3729,
    "lng": -94.2088,
    "country": "USA"
  },
  {
    "symbol": "COST",
    "name": "Costco",
    "sector": "Consumer Defensive",
    "lat": 47.5301,
    "lng": -122.0326,
    "country": "USA"
  },
  {
    "symbol": "PG",
    "name": "Procter & Gamble",
    "sector": "Consumer Defensive",
    "lat": 39.1027,
    "lng": -84.5097,
    "country": "USA"
  },
  {
    "symbol": "JNJ",
    "name": "Johnson & Johnson",
    "sector": "Healthcare",
    "lat": 40.4982,
    "lng": -74.4448,
    "country": "USA"
  },
  {
    "symbol": "PFE",
    "name": "Pfizer",
    "sector": "Healthcare",
    "lat": 40.7497,
    "lng": -73.9723,
    "country": "USA"
  },
  {
    "symbol": "MRK",
    "name": "Merck & Co",
    "sector": "Healthcare",
    "lat": 40.6695,
    "lng": -74.2796,
    "country": "USA"
  },
  {
    "symbol": "LLY",
    "name": "Eli Lilly",
    "sector": "Healthcare",
    "lat": 39.757,
    "lng": -86.1663,
    "country": "USA"
  },
  {
    "symbol": "ABBV",
    "name": "AbbVie",
    "sector": "Healthcare",
    "lat": 42.3117,
    "lng": -87.9015,
    "country": "USA"
  },
  {
    "symbol": "BMY",
    "name": "Bristol Myers",
    "sector": "Healthcare",
    "lat": 40.3541,
    "lng": -74.6732,
    "country": "USA"
  },
  {
    "symbol": "TMO",
    "name": "Thermo Fisher",
    "sector": "Healthcare",
    "lat": 42.3732,
    "lng": -71.2339,
    "country": "USA"
  },
  {
    "symbol": "DHR",
    "name": "Danaher",
    "sector": "Healthcare",
    "lat": 38.9056,
    "lng": -77.0504,
    "country": "USA"
  },
  {
    "symbol": "UNH",
    "name": "UnitedHealth",
    "sector": "Healthcare",
    "lat": 44.9126,
    "lng": -93.3855,
    "country": "USA"
  },
  {
    "symbol": "CVS",
    "name": "CVS Health",
    "sector": "Healthcare",
    "lat": 41.9996,
    "lng": -71.4938,
    "country": "USA"
  },
  {
    "symbol": "T",
    "name": "AT&T",
    "sector": "Communication Services",
    "lat": 32.7767,
    "lng": -96.797,
    "country": "USA"
  },
  {
    "symbol": "VZ",
    "name": "Verizon",
    "sector": "Communication Services",
    "lat": 40.7589,
    "lng": -73.9851,
    "country": "USA"
  },
  {
    "symbol": "TMUS",
    "name": "T-Mobile US",
    "sector": "Communication Services",
    "lat": 47.5925,
    "lng": -122.1558,
    "country": "USA"
  },
  {
    "symbol": "CMCSA",
    "name": "Comcast",
    "sector": "Communication Services",
    "lat": 39.9549,
    "lng": -75.1678,
    "country": "USA"
  },
  {
    "symbol": "ORANGE",
    "name": "Orange S.A.",
    "sector": "Communication Services",
    "lat": 48.8955,
    "lng": 2.2741,
    "country": "FRA"
  },
  {
    "symbol": "VOD",
    "name": "Vodafone",
    "sector": "Communication Services",
    "lat": 51.4557,
    "lng": -1.3323,
    "country": "GBR"
  },
  {
    "symbol": "BT.A",
    "name": "BT Group",
    "sector": "Communication Services",
    "lat": 51.5151,
    "lng": -0.0984,
    "country": "GBR"
  },
  {
    "symbol": "DOV",
    "name": "Dover Corp",
    "sector": "Industrials",
    "lat": 41.8781,
    "lng": -87.6298,
    "country": "USA"
  },
  {
    "symbol": "MMM",
    "name": "3M Company",
    "sector": "Industrials",
    "lat": 44.9541,
    "lng": -92.9961,
    "country": "USA"
  },
  {
    "symbol": "HON",
    "name": "Honeywell",
    "sector": "Industrials",
    "lat": 35.2271,
    "lng": -80.8431,
    "country": "USA"
  },
  {
    "symbol": "ABBN.SW",
    "name": "ABB Ltd",
    "sector": "Industrials",
    "lat": 47.4116,
    "lng": 8.5441,
    "country": "CHE"
  },
  {
    "symbol": "SIEGn",
    "name": "Siemens",
    "sector": "Industrials",
    "lat": 48.1351,
    "lng": 11.582,
    "country": "DEU"
  },
  {
    "symbol": "VWAGY",
    "name": "Volkswagen",
    "sector": "Automotive",
    "lat": 52.4226,
    "lng": 10.7865,
    "country": "DEU"
  },
  {
    "symbol": "MBG.DE",
    "name": "Mercedes-Benz",
    "sector": "Automotive",
    "lat": 48.7758,
    "lng": 9.1829,
    "country": "DEU"
  },
  {
    "symbol": "BMW.DE",
    "name": "BMW",
    "sector": "Automotive",
    "lat": 48.1764,
    "lng": 11.5586,
    "country": "DEU"
  },
  {
    "symbol": "STLAM",
    "name": "Stellantis",
    "sector": "Automotive",
    "lat": 45.0703,
    "lng": 7.6869,
    "country": "ITA"
  },
  {
    "symbol": "HMC",
    "name": "Honda Motor",
    "sector": "Automotive",
    "lat": 35.6664,
    "lng": 139.7032,
    "country": "JPN"
  },
  {
    "symbol": "F",
    "name": "Ford Motor",
    "sector": "Automotive",
    "lat": 42.3223,
    "lng": -83.2091,
    "country": "USA"
  },
  {
    "symbol": "GM",
    "name": "General Motors",
    "sector": "Automotive",
    "lat": 42.3292,
    "lng": -83.0442,
    "country": "USA"
  },
  {
    "symbol": "NIO",
    "name": "NIO Inc.",
    "sector": "Automotive",
    "lat": 31.2304,
    "lng": 121.4737,
    "country": "CHN"
  },
  {
    "symbol": "LI",
    "name": "Li Auto",
    "sector": "Automotive",
    "lat": 39.9042,
    "lng": 116.4074,
    "country": "CHN"
  },
  {
    "symbol": "BYD",
    "name": "BYD Company",
    "sector": "Automotive",
    "lat": 22.7042,
    "lng": 114.2831,
    "country": "CHN"
  },
  {
    "symbol": "MC.PA",
    "name": "LVMH",
    "sector": "Consumer Cyclical",
    "lat": 48.8566,
    "lng": 2.3522,
    "country": "FRA"
  },
  {
    "symbol": "RMS.PA",
    "name": "Hermès",
    "sector": "Consumer Cyclical",
    "lat": 48.869,
    "lng": 2.3228,
    "country": "FRA"
  },
  {
    "symbol": "KER.PA",
    "name": "Kering",
    "sector": "Consumer Cyclical",
    "lat": 48.8789,
    "lng": 2.3284,
    "country": "FRA"
  },
  {
    "symbol": "INDV",
    "name": "Inditex",
    "sector": "Consumer Cyclical",
    "lat": 43.3214,
    "lng": -8.5011,
    "country": "ESP"
  },
  {
    "symbol": "H&M-B",
    "name": "H&M",
    "sector": "Consumer Cyclical",
    "lat": 59.3293,
    "lng": 18.0686,
    "country": "SWE"
  },
  {
    "symbol": "ZAL.DE",
    "name": "Zalando",
    "sector": "Consumer Cyclical",
    "lat": 52.52,
    "lng": 13.405,
    "country": "DEU"
  },
  {
    "symbol": "ADYEN",
    "name": "Adyen",
    "sector": "Technology",
    "lat": 52.3676,
    "lng": 4.9041,
    "country": "NLD"
  },
  {
    "symbol": "SPOT",
    "name": "Spotify",
    "sector": "Technology",
    "lat": 59.3293,
    "lng": 18.0686,
    "country": "SWE"
  }
];