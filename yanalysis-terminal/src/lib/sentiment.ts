export interface NewsItem {
  title: string;
  description?: string;
  summary?: string;
  published_at?: string;
  source?: string;
  url?: string;
  symbol?: string;
  sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
  impact?: "CRITICAL" | "MODERATE" | "ROUTINE";
  intelligence?: {
    translatedTitle?: string;
    sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL";
    impact?: "CRITICAL" | "MODERATE" | "ROUTINE";
  };
}

export function analyzeSentimentAndImpact(item: any): {
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  impact: "CRITICAL" | "MODERATE" | "ROUTINE";
  strength: number; // 0-100 percentage
} {
  const content = `${item?.title || ""} ${item?.summary || ""} ${item?.description || ""}`.toLowerCase();
  
  // 1. Determine Sentiment
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let bullishCount = 0;
  let bearishCount = 0;
  
  const bullishKeywords = [
    "success", "surge", "gain", "profit", "win", "growth", "launch", "advance", 
    "record", "exceed", "bull", "rally", "rise", "expand", "partner", "acquire", 
    "revenue", "up", "bullish", "strengthen", "boost", "leads", "increase", "breakthrough"
  ];
  
  const bearishKeywords = [
    "warn", "loss", "decline", "fear", "delay", "probe", "investigate", "drop", 
    "sink", "crash", "bear", "plummet", "deficit", "slump", "charges", "dispute", 
    "cut", "down", "lawsuit", "fall", "tariff", "restrict", "bearish", "weakness",
    "threat", "sanction", "complaint", "collapse", "risk"
  ];

  bullishKeywords.forEach(kw => {
    if (content.includes(kw)) bullishCount++;
  });

  bearishKeywords.forEach(kw => {
    if (content.includes(kw)) bearishCount++;
  });

  // Explicit overrides based on specific content
  if (item?.sentiment === "BULLISH" || item?.intelligence?.sentiment === "BULLISH") {
    return { sentiment: "BULLISH", impact: item?.impact || item?.intelligence?.impact || "MODERATE", strength: 88 };
  }
  if (item?.sentiment === "BEARISH" || item?.intelligence?.sentiment === "BEARISH") {
    return { sentiment: "BEARISH", impact: item?.impact || item?.intelligence?.impact || "MODERATE", strength: 84 };
  }
  if (item?.sentiment === "NEUTRAL" || item?.intelligence?.sentiment === "NEUTRAL") {
    return { sentiment: "NEUTRAL", impact: item?.impact || item?.intelligence?.impact || "MODERATE", strength: 50 };
  }

  if (bullishCount > bearishCount) {
    sentiment = 'BULLISH';
  } else if (bearishCount > bullishCount) {
    sentiment = 'BEARISH';
  }

  // 2. Determine Impact
  let impact: 'CRITICAL' | 'MODERATE' | 'ROUTINE' = 'MODERATE';
  
  const criticalPriceKeywords = [
    "tariff", "sanction", "probe", "lawsuit", "crash", "halt", "deficit", 
    "unprecedented", "ban", "breakthrough", "acquires", "ceo", "regulator", 
    "subpoena", "fraud", "disaster", "embargo"
  ];
  
  const routineKeywords = [
    "announce", "ordinary", "regular", "scheduled", "presents", "participate", 
    "conference", "routine", "weekly", "filing", "form 4", "option"
  ];

  let criticalScore = 0;
  let routineScore = 0;

  criticalPriceKeywords.forEach(kw => {
    if (content.includes(kw)) criticalScore++;
  });

  routineKeywords.forEach(kw => {
    if (content.includes(kw)) routineScore++;
  });

  if (criticalScore > 0 || content.length > 500) {
    impact = 'CRITICAL';
  } else if (routineScore > bullishCount + bearishCount) {
    impact = 'ROUTINE';
  }

  // 3. Calculate detailed strength
  let strength = 50;
  const pivot = item?.title ? item?.title.charCodeAt(0) : 65;
  if (sentiment === 'BULLISH') {
    strength = 60 + Math.min((bullishCount - bearishCount) * 8, 35) + (pivot % 5);
  } else if (sentiment === 'BEARISH') {
    strength = 60 + Math.min((bearishCount - bullishCount) * 8, 35) + (pivot % 5);
  } else {
    strength = 45 + (pivot % 15);
  }

  return { sentiment, impact, strength: Math.min(Math.max(strength, 10), 100) };
}
