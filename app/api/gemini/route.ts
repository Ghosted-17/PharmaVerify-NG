import { NextResponse } from 'next/server';

interface DrugAssessment {
  status: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'UNKNOWN';
  safetyScore: number;
  summary: string;
  flags: { type: 'ok' | 'warn' | 'bad'; message: string }[];
  recommendation: string;
  proTip: string;
}

function fallbackPharmaceuticalAnalysis(prompt: string): DrugAssessment {
  const flags: { type: 'ok' | 'warn' | 'bad'; message: string }[] = [];
  let score = 100;
  let status: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'UNKNOWN' = 'SAFE';

  const isExpired = prompt.includes('EXPIRED');
  const expiresSoon = prompt.includes('expires in') || prompt.includes('expires this month');
  const fromMarket = prompt.includes('Source: market');
  const damagedPkg =
    prompt.includes('Packaging: damaged') ||
    prompt.includes('Packaging: repackaged') ||
    prompt.includes('Packaging: missing');
  const hotStorage = prompt.includes('Storage: hot') || prompt.includes('Storage: humid');
  const hasDiscoloration =
    prompt.includes('discolored') ||
    prompt.includes('smell') ||
    prompt.includes('mold') ||
    prompt.includes('cloudy');
  const suspectedCounterfeit = prompt.includes('counterfeit');

  if (isExpired) {
    score -= 60;
    status = 'UNSAFE';
    flags.push({ type: 'bad', message: 'Product is past its official manufacturer expiration date.' });
  } else if (expiresSoon) {
    score -= 15;
    flags.push({ type: 'warn', message: 'Product is approaching its expiration date soon.' });
  } else {
    flags.push({ type: 'ok', message: 'Product appears within valid shelf-life parameters.' });
  }

  if (fromMarket) {
    score -= 30;
    if (status !== 'UNSAFE') status = 'CAUTION';
    flags.push({
      type: 'warn',
      message: 'Purchased from open market/unlicensed vendor — high risk of improper storage or counterfeit supply.',
    });
  } else {
    flags.push({ type: 'ok', message: 'Acquisition channel aligns with regulated distribution.' });
  }

  if (damagedPkg) {
    score -= 35;
    status = 'UNSAFE';
    flags.push({
      type: 'bad',
      message: 'Packaging integrity is compromised, risking active ingredient degradation or contamination.',
    });
  }

  if (hotStorage) {
    score -= 25;
    if (status !== 'UNSAFE') status = 'CAUTION';
    flags.push({
      type: 'warn',
      message: 'Exposed to elevated heat or humidity contrary to pharmacopeial storage standards.',
    });
  }

  if (hasDiscoloration) {
    score -= 40;
    status = 'UNSAFE';
    flags.push({
      type: 'bad',
      message: 'Visible physical abnormalities (color, odor, precipitate, or crumbling) detected.',
    });
  }

  if (suspectedCounterfeit) {
    score -= 50;
    status = 'UNSAFE';
    flags.push({
      type: 'bad',
      message: 'Reported indicators consistent with counterfeit or substandard pharmaceutical presentation.',
    });
  }

  score = Math.max(5, Math.min(100, score));

  if (score < 50) status = 'UNSAFE';
  else if (score < 80 && status !== 'UNSAFE') status = 'CAUTION';

  const summaries = {
    SAFE: 'The provided parameters suggest acceptable product integrity with no overt signs of physical degradation or supply chain tampering.',
    CAUTION: 'Moderate risk factors observed. Storage history, packaging integrity, or distribution source warrant verification prior to administration.',
    UNSAFE: 'Critical safety violations identified. The medication exhibits severe degradation, packaging compromise, or shelf-life invalidity.',
    UNKNOWN: 'Insufficient parameters provided to determine pharmaceutical stability.',
  };

  const recommendations = {
    SAFE: 'Product is generally considered fit for use according to provided parameters. Store according to leaflet directions.',
    CAUTION: 'Have a licensed pharmacist examine the physical unit and verify the batch against NAFDAC registries before ingestion.',
    UNSAFE: 'Do NOT ingest or administer this product. Quarantine the unit and report the batch number to NAFDAC enforcement.',
    UNKNOWN: 'Consult a licensed pharmacist with the original packaging.',
  };

  return {
    status,
    safetyScore: score,
    summary: summaries[status],
    flags,
    recommendation: recommendations[status],
    proTip: 'Always verify the NAFDAC Registration Number (NRN) and check the scratch-off Mobile Authentication Service (MAS) PIN if available.',
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const body = await req.json();
    const { prompt, systemPrompt, history, isChat } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    if (apiKey) {
      try {
        let contents: any[] = [];

        if (history && Array.isArray(history) && history.length > 0) {
          contents = history
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .slice(-10)
            .map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            }));
        }

        contents.push({ role: 'user', parts: [{ text: prompt }] });

        // If it's the chatbot, return natural Markdown; if it's drug verification, request JSON
        const generationConfig: any = {
          temperature: isChat ? 0.4 : 0.1,
          maxOutputTokens: 2500, // Ample tokens to prevent JSON cutoff
        };

        if (!isChat) {
          generationConfig.responseMimeType = 'application/json';
        }

        const requestPayload: any = {
          contents,
          generationConfig,
        };

        if (systemPrompt) {
          requestPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        let res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
          }
        );

        if (res.status === 503) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestPayload),
            }
          );
        }

        const responseText = await res.text();

        if (res.ok) {
          const data = JSON.parse(responseText);
          const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (outputText) {
            return NextResponse.json({ text: outputText }, { status: 200 });
          }
        }
      } catch (err: any) {
        console.error('Gemini call error:', err.message);
      }
    }

    if (isChat) {
      return NextResponse.json(
        { text: 'I am currently unable to reach the neural engine. Please verify your internet or try asking again.' },
        { status: 200 }
      );
    }

    const fallback = fallbackPharmaceuticalAnalysis(prompt);
    return NextResponse.json({ text: JSON.stringify(fallback) }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}