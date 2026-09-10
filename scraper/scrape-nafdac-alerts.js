/**
 * PharmaVerify NG — NAFDAC Alerts Scraper
 *
 * HOW TO USE:
 * 1. Run: node scraper/scrape-nafdac-alerts.js
 * 2. It scrapes latest NAFDAC alerts and saves to Supabase
 * 3. Run this daily or weekly — set a Windows Task Scheduler reminder
 *
 * FIRST TIME: Run once to populate the notifications table
 * AFTER THAT: Run weekly to catch new alerts
 */

const puppeteer = require('puppeteer');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NAFDAC_ALERTS_URL = 'https://nafdac.gov.ng/category/recalls-and-alerts/';

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function scrape() {
  console.log('\n🚀 PharmaVerify NG — NAFDAC Alerts Scraper');
  console.log('━'.repeat(50));
  console.log('Scraping nafdac.gov.ng/category/recalls-and-alerts/\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const allAlerts = [];

  // Scrape first 3 pages of alerts
  for (let p = 1; p <= 3; p++) {
    const url = p === 1 ? NAFDAC_ALERTS_URL : `${NAFDAC_ALERTS_URL}page/${p}/`;
    console.log(`📋 Scraping page ${p}...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const alerts = await page.evaluate(() => {
        const items = [];
        // NAFDAC uses standard WordPress article format
        const articles = document.querySelectorAll('article, .post, .entry, h2.entry-title, h3.entry-title');

        // Try multiple selectors
        let links = document.querySelectorAll('h2.entry-title a, h3.entry-title a, .post-title a, article h2 a, article h3 a');

        if (links.length === 0) {
          // Fallback — grab all links that look like alerts
          links = document.querySelectorAll('a[href*="nafdac.gov.ng"]');
        }

        links.forEach(link => {
          const title = link.textContent.trim();
          const url = link.href;
          if (!title || title.length < 10) return;
          if (!url.includes('nafdac.gov.ng')) return;

          // Get date if available
          const article = link.closest('article') || link.closest('.post') || link.parentElement;
          const dateEl = article ? article.querySelector('time, .entry-date, .post-date, .date') : null;
          const date = dateEl ? dateEl.getAttribute('datetime') || dateEl.textContent.trim() : null;

          // Get excerpt if available
          const excerptEl = article ? article.querySelector('.entry-summary, .excerpt, p') : null;
          const summary = excerptEl ? excerptEl.textContent.trim().substring(0, 200) : null;

          // Classify type
          let type = 'alert';
          const titleLower = title.toLowerCase();
          if (titleLower.includes('recall')) type = 'recall';
          else if (titleLower.includes('blacklist') || titleLower.includes('banned')) type = 'blacklist';
          else if (titleLower.includes('counterfeit') || titleLower.includes('falsified')) type = 'counterfeit';
          else if (titleLower.includes('discontinu') || titleLower.includes('withdrawn')) type = 'withdrawal';

          items.push({ title, url, date, summary, type });
        });

        return items;
      });

      allAlerts.push(...alerts);
      console.log(`   Found ${alerts.length} alerts on page ${p}`);
    } catch (e) {
      console.log(`   Page ${p} error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  // Deduplicate by URL
  const seen = new Set();
  const unique = allAlerts.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`\n✅ Found ${unique.length} unique alerts\n`);

  if (unique.length === 0) {
    console.log('❌ No alerts found. NAFDAC site structure may have changed.');
    process.exit(1);
  }

  // Save to Supabase — skip duplicates
  console.log('💾 Saving to Supabase...');
  let saved = 0;
  let skipped = 0;

  for (const alert of unique) {
    // Check if already exists
    const existing = await supabase('GET', `notifications?url=eq.${encodeURIComponent(alert.url)}&select=id`);
    if (existing && existing.length > 0) { skipped++; continue; }

    const result = await supabase('POST', 'notifications', {
      title: alert.title,
      summary: alert.summary || null,
      url: alert.url,
      type: alert.type,
      published_at: alert.date ? new Date(alert.date).toISOString() : new Date().toISOString()
    });

    if (result && !result.error) saved++;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🎉 DONE!`);
  console.log(`✅ Saved: ${saved} new alerts`);
  console.log(`⏭ Skipped: ${skipped} already in database\n`);
  console.log('Your users will now see these in their notification bell on the dashboard.\n');
}

scrape().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
