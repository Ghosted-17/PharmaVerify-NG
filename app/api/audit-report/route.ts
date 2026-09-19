import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the standard SDK (same as your chatbot)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { userReport, nafdacRecord } = await req.json();
    if (!userReport || !nafdacRecord) {
      return NextResponse.json({ error: 'Missing report or registry data' }, { status: 400 });
    }

    const prompt = `
You are the Chief Regulatory Auditor for PharmaVerify NG, an automated drug authentication system working alongside NAFDAC.
Analyze the following discrepancy between what a citizen reported and what the official NAPAMS registry says.

USER REPORT:
- Product Name: ${userReport.productName}
- Reported NRN: ${userReport.nafdacNum}
- Reported Category: ${userReport.category}
- Reported Batch: ${userReport.batchNum}
- Location: ${userReport.location}
- Citizen Observations: "${userReport.description}"

OFFICIAL NAFDAC REGISTRY (Scraped Live):
- Registered Product Name: ${nafdacRecord.productName}
- Registered Category: ${nafdacRecord.category}
- Manufacturer: ${nafdacRecord.manufacturer}
- Expiry Date: ${nafdacRecord.expiryDate}

Provide your response strictly in the following JSON format (do not include markdown code blocks like \`\`\`json, just output the raw JSON string):
{
  "riskLevel": "CRITICAL",
  "auditSummary": "A concise 2-3 sentence expert compliance summary detailing the exact discrepancy or verification status.",
  "escalationEmail": {
    "subject": "URGENT: Counterfeit / Misbranded Product Alert - NRN: [Number]",
    "body": "Formal, professional enforcement email addressed to NAFDAC compliance (reforms@nafdac.gov.ng) citing the specific batch, location, and registry violation for immediate investigation."
  }
}
`;

    // Connect to the stable Flash model
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    
    // Generate the compliance audit
    const result = await model.generateContent(prompt);
    const textResult = result.response.text();

    // Clean potential markdown blocks if Gemini includes them
    const cleanedJson = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const auditData = JSON.parse(cleanedJson);

    return NextResponse.json({ success: true, audit: auditData }, { status: 200 });

  } catch (err: any) {
    console.error('[Gemini Audit Error]:', err);
    return NextResponse.json({ error: 'Failed to generate AI audit', details: err.message }, { status: 500 });
  }
}