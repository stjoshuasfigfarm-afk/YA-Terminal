import { Router } from "express";

const router = Router();

router.get("/:symbol?", async (req, res) => {
  const symbol = (req.params.symbol || req.query.symbol as string || "AAPL").toUpperCase();
  
  const relationshipMap: Record<string, { suppliers: any[], customers: any[] }> = {
    'AAPL': {
      suppliers: [
        { name: 'TSMC', symbol: 'TSM', city: 'Hsinchu', coords: [24.7736, 120.9436] },
        { name: 'Foxconn', symbol: '2317.TW', city: 'New Taipei', coords: [24.9983, 121.4842] },
        { name: 'Samsung Display', symbol: '005930.KS', city: 'Suwon', coords: [37.2636, 127.0286] }
      ],
      customers: [
        { name: 'Verizon', symbol: 'VZ', city: 'New York', coords: [40.7128, -74.0060] },
        { name: 'AT&T', symbol: 'T', city: 'Dallas', coords: [32.7767, -96.7970] }
      ]
    },
    'TSLA': {
      suppliers: [
        { name: 'Panasonic', symbol: '6752.T', city: 'Osaka', coords: [34.6937, 135.5023] },
        { name: 'CATL', symbol: '300750.SZ', city: 'Ningde', coords: [26.6655, 119.5479] }
      ],
      customers: [
        { name: 'US Government', symbol: 'USA', city: 'Washington', coords: [38.9072, -77.0369] },
        { name: 'Hertz', symbol: 'HTZ', city: 'Estero', coords: [26.4381, -81.8068] }
      ]
    },
    'NVDA': {
      suppliers: [
        { name: 'TSMC', symbol: 'TSM', city: 'Hsinchu', coords: [24.7736, 120.9436] },
        { name: 'SK Hynix', symbol: '000660.KS', city: 'Icheon', coords: [37.2723, 127.4435] }
      ],
      customers: [
        { name: 'Microsoft', symbol: 'MSFT', city: 'Redmond', coords: [47.6740, -122.1215] },
        { name: 'Google', symbol: 'GOOGL', city: 'Mountain View', coords: [37.3861, -122.0839] },
        { name: 'Meta', symbol: 'META', city: 'Menlo Park', coords: [37.4530, -122.1817] }
      ]
    }
  };

  const defaultRels = {
    suppliers: [
      { name: 'Logic_Silo_A', symbol: 'SUP_A', city: 'Shenzhen', coords: [22.5431, 114.0579] },
      { name: 'Logic_Silo_B', symbol: 'SUP_B', city: 'Bangalore', coords: [12.9716, 77.5946] }
    ],
    customers: [
      { name: 'Retail_Node_01', symbol: 'CON_01', city: 'London', coords: [51.5074, -0.1278] }
    ]
  };

  const result = relationshipMap[symbol] || defaultRels;
  res.json({
    source: "RELATIONAL_SYNTHESIS",
    relationships: result
  });
});

export default router;
