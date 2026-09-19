import { NextResponse } from 'next/server';

interface DrugAssessment {
  status: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'UNKNOWN';
  safetyScore: number;
  summary: string;
  flags: { type: 'ok' | 'warn' | 'bad'; message: string }[];
  recommendation: string;
  proTip: string;
}

// Rewritten Fallback to match "Adetutu" Persona if Gemini API fails
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
    flags.push({ type: 'bad', message: 'This item has passed its official expiration date.' });
  } else if (expiresSoon) {
    score -= 15;
    flags.push({ type: 'warn', message: 'This item is expiring very soon.' });
  } else {
    flags.push({ type: 'ok', message: 'Shelf-life looks completely fine.' });
  }

  if (fromMarket) {
    score -= 30;
    if (status !== 'UNSAFE') status = 'CAUTION';
    flags.push({
      type: 'warn',
      message: 'Purchased from an open market. Be extremely careful as storage conditions are usually poor.',
    });
  } else {
    flags.push({ type: 'ok', message: 'Bought from a trusted source.' });
  }

  if (damagedPkg) {
    score -= 35;
    status = 'UNSAFE';
    flags.push({
      type: 'bad',
      message: 'The packaging is damaged, which means it might be contaminated.',
    });
  }

  if (hotStorage) {
    score -= 25;
    if (status !== 'UNSAFE') status = 'CAUTION';
    flags.push({
      type: 'warn',
      message: 'Stored in hot or humid conditions which can ruin the active ingredients.',
    });
  }

  if (hasDiscoloration) {
    score -= 40;
    status = 'UNSAFE';
    flags.push({
      type: 'bad',
      message: 'Visible changes like bad color, smell, or mold were noticed.',
    });
  }

  if (suspectedCounterfeit) {
    score -= 50;
    status = 'UNSAFE';
    flags.push({
      type: 'bad',
      message: 'Signs strongly point to this being a fake product.',
    });
  }

  score = Math.max(5, Math.min(100, score));

  if (score < 50) status = 'UNSAFE';
  else if (score < 80 && status !== 'UNSAFE') status = 'CAUTION';

  const summaries = {
    SAFE: 'Honestly, this one checks out perfectly. Based on the offline checks, everything you described looks entirely safe.',
    CAUTION: 'I need to be honest with you, there are a few red flags here regarding how it was stored or packaged. Please be careful.',
    UNSAFE: 'Please do not consume this under any circumstances. There are critical issues that make this highly dangerous to use.',
    UNKNOWN: 'I do not have enough details from you to confidently say if this is safe or not.',
  };

  const recommendations = {
    SAFE: 'You are good to go. Just remember to store it in a cool, dry place.',
    CAUTION: 'Take this to a licensed pharmacist physically so they can examine the carton before you use it.',
    UNSAFE: 'Throw this away immediately or return it to where you bought it. Do not use it.',
    UNKNOWN: 'Please take this to a nearby pharmacy for a physical check.',
  };

  return {
    status,
    safetyScore: score,
    summary: summaries[status],
    flags,
    recommendation: recommendations[status],
    proTip: 'Always double-check the scratch-off MAS code on the box to confirm it is completely genuine.',
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

        const generationConfig: any = {
          temperature: isChat ? 0.4 : 0.1,
          maxOutputTokens: 2500, 
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

        // FIX: Using the correct live Google model 'gemini-3.6-flash'
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
        } else {
            console.error("Gemini API Error details:", responseText);
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