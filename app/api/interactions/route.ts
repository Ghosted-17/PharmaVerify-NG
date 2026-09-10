import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { drugs } = await req.json();

    if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
      return NextResponse.json(
        { error: 'Please enter at least 2 medications or substances to check.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured in .env.local.' },
        { status: 500 }
      );
    }

    const prompt = `
You are a senior clinical pharmacist and pharmacovigilance specialist with deep knowledge of both generic names and local/international commercial brand names (especially brands available in Nigerian and West African markets, such as Amatem, Lonart, Coartem, Ciprotab, Augmentin, Flagyl, Brustan-N, Digiflam, etc.).

Analyze the following medications/substances for clinically significant drug-drug interactions:
Input: ${drugs.join(', ')}

Clinical Instructions:
1. Resolve commercial brand names into their active pharmaceutical ingredients.
2. Note common empirical practice in Nigeria (e.g. Cipro + Artemether/Lumefantrine co-prescribed for malaria + suspected typhoid). While pointing out true pharmacological risks (e.g. additive QTc prolongation), provide balanced, non-alarmist guidance.
3. Always supply a "co_prescription_context" providing the rationale, patient precautions, and practical guidance in case a doctor intentionally co-prescribed them.
4. Respond ONLY with valid JSON (no markdown fences, no explanatory text outside the JSON).

Required JSON structure:
{
  "summary": "Clear, patient-friendly 1-2 sentence clinical summary.",
  "has_interactions": true,
  "interactions": [
    {
      "drug_pair": "Brand/Generic A (Active Ingredient) + Brand/Generic B (Active Ingredient)",
      "severity": "Contraindicated" | "Major" | "Moderate" | "Minor" | "Safe",
      "mechanism": "Clear explanation of the pharmacological mechanism",
      "clinical_effect": "What the patient might experience or physiological risk",
      "recommendation": "Standard pharmacist advice or alternative choices",
      "co_prescription_context": {
        "clinical_intent": "Why a physician or pharmacist would intentionally prescribe this combination (e.g. dual therapy for enteric fever and acute uncomplicated malaria)",
        "safety_precautions": "Key safety advice (e.g. ensure adequate hydration/electrolytes to prevent arrhythmia, separate dosing times if applicable, monitor for palpitations or dizziness)",
        "patient_advice": "Do not abruptly stop taking either medicine without speaking to your doctor or pharmacist."
      }
    }
  ]
}
`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json(
        { error: `Gemini error (${res.status}): ${errText}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let cleanText = rawText.replace(/```json|```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanText);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Interaction route error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while analyzing interactions.' },
      { status: 500 }
    );
  }
}