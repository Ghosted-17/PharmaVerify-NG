const db = require('./nafdac-db-full.js');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nrn, drugName, manufacturer } = req.body;
  if (!nrn && !drugName) return res.status(400).json({ error: 'Provide nrn or drugName' });

  let match = null;

  if (nrn) {
    match = db.find(d => d.nrn.toLowerCase() === nrn.trim().toLowerCase());
  }

  if (!match && drugName) {
    const q = drugName.trim().toLowerCase();
    match = db.find(d =>
      d.productName.toLowerCase().includes(q) ||
      d.activeIngredient.toLowerCase().includes(q) ||
      (d.aliases && d.aliases.some(a => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())))
    );
  }

  if (!match) {
    return res.status(200).json({
      found: false,
      message: 'Not found in local NAFDAC database.',
      greenbook_url: `https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(nrn || drugName || '')}`
    });
  }

  const issues = [];
  const confirmations = [];

  if (nrn) {
    if (match.nrn.toLowerCase() === nrn.trim().toLowerCase()) {
      confirmations.push(`NRN ${nrn} is valid and registered in the Greenbook`);
    } else {
      issues.push(`NRN ${nrn} does not match the registered NRN for this product (expected ${match.nrn})`);
    }
  }

  if (manufacturer) {
    const mfr = manufacturer.trim().toLowerCase();
    const regMfr = match.manufacturer.toLowerCase();
    const regApp = match.applicant.toLowerCase();
    const ok = regMfr.includes(mfr) || mfr.includes(regMfr.split(' ')[0]) ||
                regApp.includes(mfr) || mfr.includes(regApp.split(' ')[0]);
    if (ok) {
      confirmations.push(`Manufacturer "${manufacturer}" matches registered applicant "${match.applicant}"`);
    } else {
      issues.push(`Manufacturer "${manufacturer}" does NOT match. NRN ${match.nrn} is registered to "${match.manufacturer}", not "${manufacturer}"`);
    }
  }

  if (drugName) {
    const dname = drugName.trim().toLowerCase();
    const ok = match.productName.toLowerCase().includes(dname) ||
               dname.includes(match.activeIngredient.toLowerCase().split(';')[0].trim()) ||
               (match.aliases && match.aliases.some(a => a.toLowerCase().includes(dname) || dname.includes(a.toLowerCase())));
    if (ok) {
      confirmations.push(`Drug name "${drugName}" matches registered product "${match.productName}"`);
    } else {
      issues.push(`Drug name "${drugName}" does NOT match the registered product "${match.productName}" for NRN ${match.nrn} (Active ingredient: ${match.activeIngredient})`);
    }
  }

  const verified = issues.length === 0;

  return res.status(200).json({
    found: true,
    verified,
    record: match,
    confirmations,
    issues,
    verdict: verified
      ? `NAFDAC VERIFIED — All details match the Greenbook record for NRN ${match.nrn}`
      : `NAFDAC MISMATCH — ${issues.join('. ')}`,
    greenbook_url: `https://greenbook.nafdac.gov.ng/?search=${encodeURIComponent(match.nrn)}`
  });
}
