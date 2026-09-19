import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const { nrn } = await req.json();
    if (!nrn) {
      return NextResponse.json({ error: 'NRN is required' }, { status: 400 });
    }

    console.log(`[Scraper] Launching hardened instance for Primary NAFDAC Portal, NRN: ${nrn}`);
    
    const browser = await puppeteer.launch({ 
      headless: true, 
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--ignore-certificate-errors',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized'
      ] 
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let scrapedData = null;

    try {
      console.log(`[Scraper] Navigating directly to official NAFDAC homepage portal...`);
      await page.goto('https://registration.nafdac.gov.ng/#verify', { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      await new Promise(r => setTimeout(r, 3000));

      const searchInputSelector = '#CertificateNumber';
      await page.waitForSelector(searchInputSelector, { visible: true, timeout: 15000 });

      console.log(`[Scraper] Found exact input box. Typing NRN: ${nrn}`);
      
      // Clear input and type
      await page.focus(searchInputSelector);
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type(searchInputSelector, nrn, { delay: 50 });

      console.log(`[Scraper] Submitting query and awaiting dynamic DOM update...`);
      
      // Force click the actual Verify button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const verifyBtn = buttons.find(b => b.innerText.toLowerCase().includes('verify') || b.innerText.toLowerCase().includes('search'));
        if (verifyBtn) {
          verifyBtn.click();
        }
      });

      // Wait strictly for the results table to inject into the DOM
      await page.waitForFunction(() => {
        const text = document.body.innerText.toLowerCase();
        return document.querySelector('table') || document.querySelector('.table-responsive') || text.includes('no record') || text.includes('not found');
      }, { timeout: 15000 }).catch(() => console.log('[Scraper] Table wait timed out.'));

      // Give AJAX one extra second to finish rendering text inside the table
      await new Promise(r => setTimeout(r, 1500));

      console.log(`[Scraper] Extracting active fields STRICTLY from the results table...`);

      scrapedData = await page.evaluate(() => {
        // STRICT SCOPE: Only look inside the actual table container, completely ignoring the homepage instructions
        const resultContainer = document.querySelector('table') || document.querySelector('.table-responsive') || document.querySelector('.modal-content');
        
        if (!resultContainer) {
          return null; // If there is no table, the product wasn't found
        }

        const extractFromTable = (keywords: string[]) => {
          // Look through rows and cells specifically inside the result table
          const rows = Array.from(resultContainer.querySelectorAll('tr, li, div')) as HTMLElement[];
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td, th, span, strong'));
            for (let i = 0; i < cells.length; i++) {
              const cellText = cells[i].textContent?.trim().toLowerCase() || '';
              
              if (keywords.some(k => cellText === k.toLowerCase() || cellText === `${k.toLowerCase()}:`)) {
                const nextText = cells[i + 1]?.textContent?.trim();
                // Make sure we didn't accidentally grab a huge chunk of text or a URL
                if (nextText && nextText.length < 150 && !nextText.includes('.gov.ng')) {
                  return nextText;
                }
              }
            }
            
            // Fallback for "Keyword: Value" format in a single div inside the table
            const rowText = row.innerText || '';
            for (const k of keywords) {
              if (rowText.toLowerCase().startsWith(`${k.toLowerCase()}:`)) {
                const parts = rowText.split(':');
                if (parts.length > 1 && parts[1].trim() && !parts[1].includes('.gov.ng')) {
                  return parts[1].trim().split('\n')[0];
                }
              }
            }
          }
          return 'Unknown';
        };

        const productName = extractFromTable(['Product Name', 'Brand Name']);
        // If the table exists but we still couldn't parse the name clearly, grab the first cell
        const finalName = productName !== 'Unknown' ? productName : (resultContainer.querySelector('td')?.textContent?.trim() || 'Unknown');

        return {
          productName: finalName,
          category: extractFromTable(['Category', 'Product Category']),
          manufacturer: extractFromTable(['Manufacturer', 'Applicant']),
          activeIngredient: extractFromTable(['Active Ingredient', 'Composition']),
          expiryDate: extractFromTable(['Expiry', 'Expiry Date', 'Valid'])
        };
      });

      if (scrapedData && scrapedData.productName !== 'Unknown') {
        console.log('[Scraper] Primary extraction successful:', scrapedData);
      } else {
        console.log('[Scraper] Extraction rejected. Product not found in live database.');
      }

    } catch (primaryError: any) {
      console.error(`[Scraper Primary Error]:`, primaryError.message);
    }

    await browser.close();

    if (!scrapedData || scrapedData.productName === 'Unknown') {
      return NextResponse.json({ found: false, error: 'Product not found in live registry.' }, { status: 404 });
    }

    return NextResponse.json({ 
      found: true, 
      source: 'Primary Registration Portal (NAPAMS)', 
      record: scrapedData 
    }, { status: 200 });

  } catch (err: any) {
    console.error('[Scraper API Error]', err);
    return NextResponse.json({ error: 'Internal Scraper Error', details: err.message }, { status: 500 });
  }
}