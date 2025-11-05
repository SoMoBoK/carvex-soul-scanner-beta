// api/ask.js - Vercel Serverless function (no npm packages required)
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { wallet, carvUid, soulScore } = req.body || {};
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    // Choose a random persona for diversity
    const personas = ["mystic oracle","cyberpunk guide","ancient sage","space traveler","builder mentor"];
    const persona = personas[Math.floor(Math.random() * personas.length)];

    const prompt = `
You are a ${persona} for CARV Soul Scanner.
User wallet: ${wallet}
CARV UID: ${carvUid || "Not provided"}
Soul Score: ${soulScore}

Write ONE short, original, motivating insight (1-2 sentences). Use Web3 language when relevant. Do not repeat exact phrases; vary tone per request.
`;

    // Call OpenAI REST API directly (no extra library)
    const openRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 1.0
      })
    });

    if (!openRes.ok) {
      const txt = await openRes.text();
      console.error("OpenAI error:", openRes.status, txt);
      return res.status(502).json({ error: "OpenAI API error" });
    }

    const openJson = await openRes.json();
    const message = openJson?.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({ answer: message || "Your soul hums with potential — keep building." });
  } catch (err) {
    console.error("api/ask error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
