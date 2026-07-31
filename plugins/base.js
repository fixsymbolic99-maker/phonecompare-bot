const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class BasePlugin {
  constructor(store) {
    this.store = store;
  }

  async fetchProduct() {
    throw new Error('fetchProduct must be implemented by subclass');
  }

  async makeRequest(url) {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080'
        ]
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const html = await page.content();
      return html;
    } catch (error) {
      throw new Error(`Failed to fetch URL ${url}: ${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  parsePrice(priceStr) {
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
}

module.exports = BasePlugin;
