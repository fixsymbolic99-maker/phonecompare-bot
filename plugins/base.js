const puppeteer = require('puppeteer');

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
      // تشغيل المتصفح في الخلفية (بدون واجهة)
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // محاكاة متصفح حقيقي (User Agent)
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // الذهاب للصفحة وانتظار تحميل المحتوى
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // جلب كود HTML للصفحة كاملة (زي ما المتصفح بيشوفها بالضبط)
      const html = await page.content();
      
      return html;

    } catch (error) {
      throw new Error(`Failed to fetch URL ${url}: ${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  parsePrice(priceStr) {
    // إزالة الرموز النقدية والمسافات، وتحويل إلى رقم عشري
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
}

module.exports = BasePlugin;
