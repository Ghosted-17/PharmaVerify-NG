/**
 * PharmaVerify NG — NAFDAC Greenbook Scraper (Puppeteer)
 *
 * HOW TO USE:
 * 1. Run: node scraper/scrape-nafdac.js
 * 2. Wait 20-40 minutes
 * 3. Output: scraper/nafdac-scraped.js
 * 4. Copy the db array into api/nafdac.js
 * 5. Run: vercel --prod
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://greenbook.nafdac.gov.ng';
const DELAY_MS = 1000;
const OUTPUT_FILE = path.join(__dirname, 'nafdac-scraped.js');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape() {
  console.log('\n🚀 PharmaVerify NG — NAFDAC Greenbook Scraper');
  console.log('━'.repeat(52));
  console.log('Opening browser...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const allProducts = [];
  const seenNRNs = new Set();
  let allManufacturers = [];

  // ── STEP 1: Get all manufacturer IDs ──────────────────
  console.log('📋 Step 1 — Getting manufacturer list (28 pages)...');

  for (let p = 1; p <= 28; p++) {
    process.stdout.write(`   Page ${p}/28...\r`);
    try {
      await page.goto(`${BASE_URL}/manufacturers?page=${p}`, { waitUntil: 'networkidle2', timeout: 30000 });

      const mfrs = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('a[href*="/manufacturer/products/"]');
        links.forEach(a => {
          const href = a.getAttribute('href');
          const idMatch = href.match(/\/manufacturer\/products\/(\d+)/);
          if (!idMatch) return;
          const id = idMatch[1];
          const text = a.textContent.trim();
          const countMatch = text.match(/(\d+)\s+Products?/);
          const count = countMatch ? parseInt(countMatch[1]) : 0;
          // Get name — everything before " X Products"
          const name = text.replace(/\s*\d+\s+Products?,?\s*\d+\s+Ingredients?.*$/, '').trim();
          if (count > 0 && name) {
            results.push({ id, name, count });
          }
        });
        return results;
      });

      allManufacturers = allManufacturers.concat(mfrs);
      await delay(DELAY_MS);
    } catch (e) {
      process.stdout.write(`   Page ${p} error: ${e.message}\n`);
    }
  }

  // Deduplicate
  const seenIds = new Set();
  allManufacturers = allManufacturers.filter(m => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });

  console.log(`\n✅ Found ${allManufacturers.length} manufacturers\n`);

  // ── STEP 2: Scrape products from each manufacturer ────
  console.log('💊 Step 2 — Scraping products...\n');
  let errors = 0;

  for (let i = 0; i < allManufacturers.length; i++) {
    const mfr = allManufacturers[i];
    const pct = Math.round(((i + 1) / allManufacturers.length) * 100);
    process.stdout.write(
      `   [${pct}%] ${i+1}/${allManufacturers.length} | ${mfr.name.substring(0,28).padEnd(28)} | ${allProducts.length} drugs\r`
    );

    try {
      await page.goto(`${BASE_URL}/manufacturer/products/${mfr.id}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const products = await page.evaluate((manufacturerName) => {
        const results = [];
        const links = document.querySelectorAll('a[href*="/products/details/"]');

        links.forEach(a => {
          const raw = a.textContent.replace(/##|\*\*|_+/g, '').replace(/\s+/g, ' ').trim();

          // Must have NRN
          const nrnMatch = raw.match(/NRN:\s*([A-Za-z0-9][A-Za-z0-9\-]+)/);
          if (!nrnMatch) return;
          const nrn = nrnMatch[1].trim();
          if (!nrn || nrn.length < 4) return;

          const beforeNRN = raw.replace(/NRN:\s*[A-Za-z0-9][A-Za-z0-9\-]+/, '').trim();

          // Extract form
          const formMatch = beforeNRN.match(/\b(Tablet|Caplet|Capsule|Syrup|Suspension|Injection|Solution|Cream|Ointment|Powder|Sachet|Drops|Infusion|Spray|Gel|Suppository|Lotion|Inhaler|Granules|Liquid|Dispersible tablet|Ear drops|Eye drops)\b/i);
          const form = formMatch ? formMatch[1] : '';

          // Product name is before the form keyword
          let productName = '';
          let rest = beforeNRN;

          if (form) {
            const idx = beforeNRN.toLowerCase().indexOf(form.toLowerCase());
            if (idx > 0) {
              productName = beforeNRN.substring(0, idx).replace(/[,;:\s]+$/, '').trim();
              rest = beforeNRN.substring(idx + form.length).trim();
            }
          } else {
            // fallback: name = first 3-4 words
            const words = beforeNRN.split(' ');
            const numIdx = words.findIndex(w => /^\d/.test(w));
            productName = numIdx > 1
              ? words.slice(0, numIdx).join(' ').trim()
              : words.slice(0, 3).join(' ').trim();
            rest = beforeNRN;
          }

          if (!productName || productName.length < 2) return;

          // Clean product name
          productName = productName
            .replace(/\s*\(duplicate[^)]*\)/i, '')
            .replace(/\s*\(check[^)]*\)/i, '')
            .trim();

          // Extract strength
          const strengthMatch = rest.match(/(\d[\d.,]*\s*(?:mg|g|IU|mL|mcg|%|MU|mmol|units?)(?:\/\d+[\d.,]*\s*(?:mg|g|mL|IU))?(?:\s*;\s*\d[\d.,]*\s*(?:mg|g|IU|mL|mcg|%|units?))*)/i);
          const strength = strengthMatch ? strengthMatch[0].trim() : '';

          // Active ingredient = rest minus strength
          const activeIngredient = rest
            .replace(strength, '')
            .replace(/^[,;\s]+/, '')
            .replace(/[,;\s]+$/, '')
            .replace(/\s+/g, ' ')
            .trim() || 'Not specified';

          // Aliases
          const aliases = [...new Set([
            productName.toLowerCase(),
            activeIngredient.toLowerCase().split(';')[0].trim(),
          ].filter(a => a && a.length > 2 && !/^\d+$/.test(a)))];

          results.push({
            nrn,
            productName,
            activeIngredient,
            strength,
            form,
            manufacturer: manufacturerName,
            applicant: manufacturerName,
            status: 'Active',
            aliases
          });
        });

        return results;
      }, mfr.name);

      for (const p of products) {
        if (!seenNRNs.has(p.nrn)) {
          seenNRNs.add(p.nrn);
          allProducts.push(p);
        }
      }

    } catch (e) {
      errors++;
    }

    await delay(DELAY_MS);
  }

  await browser.close();
  console.log(`\n\n✅ Scraped ${allProducts.length} unique drugs (${errors} errors)\n`);

  // ── STEP 3: Write output ───────────────────────────────
  console.log('💾 Step 3 — Writing output file...');

  const output = `// PharmaVerify NG — NAFDAC Greenbook Database
// Generated: ${new Date().toISOString()}
// Source: greenbook.nafdac.gov.ng
// Total: ${allProducts.length} drugs
//
// HOW TO USE:
// 1. Open api/nafdac.js
// 2. Select the entire: const db = [ ... ];
// 3. Delete it and paste this in its place
// 4. Save and run: vercel --prod

const db = ${JSON.stringify(allProducts, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  const kb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);

  console.log(`\n🎉 DONE!`);
  console.log(`📁 File: scraper/nafdac-scraped.js (${kb} KB)`);
  console.log(`💊 Total: ${allProducts.length} drugs from ${allManufacturers.length} manufacturers`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Open scraper/nafdac-scraped.js`);
  console.log(`   2. Copy the entire const db = [...] array`);
  console.log(`   3. Paste into api/nafdac.js replacing the existing db array`);
  console.log(`   4. Run: vercel --prod\n`);
}

scrape().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
