export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = body.ticker || "Global Markets";
    
    const prompt = `
      You are a high-frequency financial intelligence aggregator.
      Generate a realistic, live-sounding raw headline and summary for ${target}.
      
      You MUST return ONLY a minified JSON object with this exact structure (no markdown wrappers):
      {
        "ticker": "${target}",
        "headline": "CLEAN_UPPERCASE_TRUNCATED_HEADLINE",
        "summary": "2-sentence high-density macro impact summary.",
        "marketLocation": "CITY, COUNTRY/STATE",
        "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
        "timestamp": "${new Date().toISOString().replace('T', ' ').substring(0, 19)}"
      }
    `;

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OpenRouter API Key" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
       });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    if (content.startsWith("\`\`\`")) {
      content = content.replace(/^\`\`\`[a-zA-Z]*\n/, "").replace(/\n\`\`\`$/, "").trim();
    }

    return new Response(content, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
     });
  }
}
