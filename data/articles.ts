export interface Article {
  slug: string;
  tag: string;
  title: string;
  readTime: string;
  date: string;
  summary: string;
  content: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'spot-counterfeit-medicines',
    tag: 'Guide',
    title: 'How to Spot Counterfeit Medicines in Nigeria',
    readTime: '8 min read',
    date: 'August 2026',
    summary: 'Learn the 12 visual and physical signs that indicate a drug may be counterfeit or substandard, with practical verification references.',
    content: [
      'Counterfeit and substandard pharmaceuticals pose a grave public health risk across Sub-Saharan Africa. In Nigeria, the National Agency for Food and Drug Administration and Control (NAFDAC) continuously combats illicit drug supply chains.',
      '1. Inspect the Packaging: Legitimate manufacturers invest in crisp typography, consistent brand logos, and tamper-evident seals. Counterfeits often exhibit blurry print, misspelled generic ingredients, or flimsy paperboard.',
      '2. Verify the NAFDAC Registration Number (NRN): All genuine regulated drugs in Nigeria carry an NRN in standard formats like "04-XXXX" (locally manufactured) or "A4-XXXX" (imported). If the NRN is missing, incomplete, or fails cross-referencing on PharmaVerify or the NAFDAC Greenbook, exercise strict caution.',
      '3. Scratch-off Mobile Authentication Service (MAS): Many premium antibiotics and antimalarials include a scratch panel with a PIN. Always scratch and SMS the shortcode (e.g., 38353) or scan through certified digital platforms before opening the blister pack.',
      '4. Physical Tablet & Liquid Condition: Check for crumbling tablets, uneven powder dissolution, strange chemical odors, or discolored solutions. Never consume medication that differs in taste, texture, or appearance from your prior prescription refills.'
    ]
  },
  {
    slug: 'pharmacy-storage-compliance',
    tag: 'Checklist',
    title: 'Pharmacy Storage & Cold-Chain Compliance Guide',
    readTime: '6 min read',
    date: 'July 2026',
    summary: 'A standard operating protocol for community pharmacies and clinics to audit medication storage against WHO and NAFDAC standards.',
    content: [
      'In tropical climates, uncontrolled ambient temperatures and high humidity rapidly degrade active pharmaceutical ingredients (APIs), rendering antibiotics sub-potent and insulin completely ineffective.',
      '1. Temperature Classifications: Room temperature must be maintained strictly between 15°C and 25°C. Cold chain storage (2°C to 8°C) is mandatory for vaccines, insulins, and biologic formulations.',
      '2. Power Backups & Thermometers: Community pharmacies must employ secondary power inverters or solar generators alongside calibrated digital min/max thermometers logged twice daily.',
      '3. Humidity & Direct Sunlight: Tablets stored in direct sunlight suffer accelerated photolysis. Shelving must sit at least 15cm above floor level and away from damp walls.',
      '4. Segregation of Expired / Damaged Stock: Expired products must be quarantined immediately in a designated, locked bin to prevent accidental dispensing.'
    ]
  },
  {
    slug: 'understanding-expiry-dates',
    tag: 'Article',
    title: 'Understanding Pharmaceutical Expiry Dates: What They Really Mean',
    readTime: '10 min read',
    date: 'June 2026',
    summary: 'A deep dive into pharmaceutical stability testing—why drugs degrade, what "use by" vs "expiry" means, and when it is hazardous.',
    content: [
      'An expiration date is the manufacturer\'s legal and pharmacological guarantee that the medicine retains 100% of its labeled potency, identity, and safety profile under specified storage conditions.',
      '1. What Happens When Drugs Expire: Most solid dosage forms do not turn instantly poisonous; rather, the active therapeutic moiety breaks down, leading to sub-therapeutic treatment failure (e.g., failed treatment of bacterial infections contributing to antimicrobial resistance).',
      '2. High-Hazard Expired Medications: Certain expired medications can form toxic byproducts or have narrow therapeutic indexes. Tetracyclines, for instance, can cause Fanconi syndrome (kidney tubule damage) when decomposed. Liquid eye drops and injectables lose sterility, risking severe septic infection.',
      '3. The "Use By" vs "Expiry" Distinction: "Expiry Date" refers to the unopened container stored properly. Once opened, items like eye drops or multi-dose reconstituted suspensions (such as Amoxicillin syrup) frequently expire within 7 to 14 days, regardless of the printed carton date.'
    ]
  },
  {
    slug: 'drug-storage-best-practices',
    tag: 'Educational',
    title: 'Drug Storage Best Practices for Healthcare Workers',
    readTime: '7 min read',
    date: 'May 2026',
    summary: 'Practical management protocols for managing temperature-sensitive stock in low-resource and unstable power environments.',
    content: [
      'Healthcare workers serving in rural and peri-urban clinics face frequent national grid collapses. Preserving drug integrity requires proactive clinical leadership.',
      '1. Cold-Chain Transport Validation: When ferrying oxytocin, vaccines, or blood products from central medical stores, always deploy validated cool boxes packed with conditioned ice packs.',
      '2. The Shake Test for Adsorbed Vaccines: If a liquid vaccine or suspension is suspected to have frozen accidentally, conduct the standard WHO shake test before administration.',
      '3. First-In, First-Out (FIFO) & FEFO: Adopt "First-Expired, First-Out" principles. Display near-expiry batches forward on dispensary benches so older stock is exhausted before newer shipments.'
    ]
  },
  {
    slug: 'substandard-medicines-west-africa',
    tag: 'Research',
    title: 'Report: Substandard & Falsified Medicines in West Africa',
    readTime: '12 min read',
    date: 'April 2026',
    summary: 'Key findings and pharmacovigilance takeaways surveying circulating antimalarials, antibiotics, and analgesics across regional trade corridors.',
    content: [
      'Open market drug distribution channels (such as Idumota in Lagos or Onitsha Head Bridge) present systemic regulatory enforcement challenges.',
      '1. Frequently Falsified Classes: Antimalarial artemisinin combinations (ACTs), fluoroquinolones (Ciprofloxacin), and synthetic opioids remain the most intercepted illicit categories.',
      '2. Dilution of Active Ingredients: A significant fraction of substandard items contain partial dosages (e.g., 40% active pharmaceutical ingredient), providing temporary symptom relief while cultivating microbial resistance.',
      '3. Digital Countermeasures: Consumer-facing tools like PharmaVerify NG and GS1 DataMatrix serialization empower everyday patients to act as an active verification frontline.'
    ]
  },
  {
    slug: 'drug-interaction-awareness-guide',
    tag: 'Clinical Tool',
    title: 'Drug-Drug & Food Interaction Awareness Guide',
    readTime: '9 min read',
    date: 'March 2026',
    summary: 'How everyday antibiotics, antimalarials, and NSAIDs interact with food, alcohol, and co-prescriptions in clinical practice.',
    content: [
      'Polypharmacy is common in Nigeria, where patients often combine prescription antibiotics with malaria therapies and over-the-counter painkillers.',
      '1. Fluoroquinolones & Minerals: Taking Ciprofloxacin or Levofloxacin with calcium-rich milk, iron supplements, or magnesium/aluminum antacids causes chemical chelation, binding the antibiotic and dropping gut absorption by up to 80%. Space intake by at least 2 hours.',
      '2. Alcohol & Metronidazole (Flagyl): Combining alcohol with Flagyl inhibits aldehyde dehydrogenase, provoking severe disulfiram-like reactions: violent nausea, facial flushing, palpitations, and hypotension.',
      '3. Multi-NSAID Toxicity: Stacking Diclofenac with Ibuprofen or high-dose Paracetamol dramatically elevates risks of peptic ulcer perforation, acute kidney injury, and hepatotoxicity. Always check with a pharmacist before taking combined analgesics.'
    ]
  }
];