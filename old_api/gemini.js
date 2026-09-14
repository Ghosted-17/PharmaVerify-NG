export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });

  try {
    const { prompt, systemPrompt, history } = req.body;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

    let contents = [];

    if (history && history.length > 0) {
      contents = history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body = {
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    // Try gemini-1.5-flash first
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const responseText = await geminiRes.text();

    if (!geminiRes.ok) {
      // Return the raw error so we can debug
      return res.status(geminiRes.status).json({
        error: `Gemini API error ${geminiRes.status}`,
        details: responseText
      });
    }

    const data = JSON.parse(responseText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
