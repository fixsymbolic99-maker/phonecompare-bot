const BasePlugin = require('./base');
const cheerio = require('cheerio');

class AmazonPlugin extends BasePlugin {
  async fetchProduct() {
    // استخدام الرابط المباشر من ملف الإعدادات
    const url = this.store.url;
    
    // سنقوم بتنفيذ الطلب داخل الـ makeRequest الخاص بـ base.js
    const html = await this.makeRequest(url);
    
    // طباعة أول 500 حرف من الصفحة في السجل لمعرفة هل الصفحة فتحت صح ولا لأ
    console.log(`[DEBUG] Amazon HTML Length: ${html.length}`);
    console.log(`[DEBUG] Amazon HTML Preview: ${html.substring(0, 500)}`);

    const $ = cheerio.load(html);

    // استخراج الاسم
    let name = $('#productTitle').text().trim();
    if (!name) name = $('h1.a-text-normal').first().text().trim();

    // محاولة استخراج السعر من أكثر من مكان (خدعة أمازون)
    let priceStr = $('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen').first().text().trim();
    if (!priceStr) {
      priceStr = $('#corePrice_feature_div .a-price .a-offscreen').first().text().trim();
    }
    if (!priceStr) {
      priceStr = $('span.a-price-whole').first().text().trim();
    }
    
    let price = 0;
    if (priceStr) {
      price = this.parsePrice(priceStr);
    } else {
      throw new Error(`Price not found on Amazon page. HTML length: ${html.length}`);
    }

    return {
      name: name || 'Amazon Product',
      price,
      currency: 'USD',
      url
    };
  }
}

module.exports = AmazonPlugin;
