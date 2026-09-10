import { NextResponse } from 'next/server';

// Import local database safely without strict typing conflict
const rawDb: any = require('./nafdac-db-full.js');

interface NafdacRecord {
  nrn: string;
  productName: string;
  activeIngredient: string;
  strength?: string;
  form?: string;
  manufacturer: string;
  applicant: string;
  aliases?: string[];
}

const db: NafdacRecord[] = Array.isArray(rawDb)
  ? rawDb
  : rawDb && typeof rawDb === 'object' && 'default' in rawDb
  ? rawDb.default
  : [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nrn, drugName, manufacturer } = body;

    if (!nrn && !drugName) {
      return NextResponse.json({ error: 'Provide nrn or drugName' }, { status: 400 });
    }

    let match: NafdacRecord | undefined = undefined;

    // 1. Check exact or normalized NRN match
    if (nrn) {
      const cleanNrn = nrn.trim().toLowerCase();
      match = db.find((d) => d.nrn && d.nrn.toLowerCase() === cleanNrn);
    }

    // 2. Fallback to product name, active ingredient, or aliases
    if (!match && drugName) {
      const q = drugName.trim().toLowerCase();
      match = db.find(
        (d) =>
          (d.productName && d.productName.toLowerCase().includes(q)) ||
          (d.activeIngredient && d.activeIngredient.toLowerCase().includes(q)) ||
          (d.aliases &&
            d.aliases.some(
              (a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())
            ))
      );
    }

    if (!match) {
      return NextResponse.json({
        found: false,
        message: 'Not found in local NAFDAC database.',
        greenbook_url: `https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(
          nrn || drugName || ''
        )}`,
      });
    }

    const issues: string[] = [];
    const confirmations: string[] = [];

    // Check NRN Match
    if (nrn) {
      if (match.nrn.toLowerCase() === nrn.trim().toLowerCase()) {
        confirmations.push(`NRN ${nrn} is valid and registered in the Greenbook`);
      } else {
        issues.push(
          `NRN ${nrn} does not match the registered NRN for this product (expected ${match.nrn})`
        );
      }
    }

    // Check Manufacturer Match
    if (manufacturer) {
      const mfr = manufacturer.trim().toLowerCase();
      const regMfr = (match.manufacturer || '').toLowerCase();
      const regApp = (match.applicant || '').toLowerCase();
      const ok =
        regMfr.includes(mfr) ||
        mfr.includes(regMfr.split(' ')[0]) ||
        regApp.includes(mfr) ||
        mfr.includes(regApp.split(' ')[0]);

      if (ok) {
        confirmations.push(
          `Manufacturer "${manufacturer}" matches registered applicant "${match.applicant}"`
        );
      } else {
        issues.push(
          `Manufacturer "${manufacturer}" does NOT match. NRN ${match.nrn} is registered to "${match.manufacturer}", not "${manufacturer}"`
        );
      }
    }

    // Check Drug Name / Molecule Match
    if (drugName) {
      const dname = drugName.trim().toLowerCase();
      const activePrimary = (match.activeIngredient || '').toLowerCase().split(';')[0].trim();
      const ok =
        match.productName.toLowerCase().includes(dname) ||
        (activePrimary && dname.includes(activePrimary)) ||
        (match.aliases &&
          match.aliases.some(
            (a) => a.toLowerCase().includes(dname) || dname.includes(a.toLowerCase())
          ));

      if (ok) {
        confirmations.push(
          `Drug name "${drugName}" matches registered product "${match.productName}"`
        );
      } else {
        issues.push(
          `Drug name "${drugName}" does NOT match the registered product "${match.productName}" for NRN ${match.nrn} (Active ingredient: ${match.activeIngredient})`
        );
      }
    }

    const verified = issues.length === 0;

    return NextResponse.json({
      found: true,
      verified,
      record: match,
      confirmations,
      issues,
      verdict: verified
        ? `NAFDAC VERIFIED — All details match the Greenbook record for NRN ${match.nrn}`
        : `NAFDAC MISMATCH — ${issues.join('. ')}`,
      greenbook_url: `https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(match.nrn)}`,
    });
  } catch (err: any) {
    console.error('NAFDAC API Route error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}