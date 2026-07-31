const BasePlugin = require('./base');
const cheerio = require('cheerio');

class AmazonPlugin extends BasePlugin {
  async fetchProduct() {
    const html = await this.makeRequest(this.store.url);
    const $ = cheerio.load(html);

    // محاولة استخراج الاسم والسعر من صفحة المنتج
    let name = $('#productTitle').text().trim();
    if (!name) name = $('h1.a-text-normal').text().trim() || 'Amazon Product';

    // السعر: البحث عن عناصر السعر المختلفة
    let priceStr = $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text().trim();
    if (!priceStr) {
      priceStr = $('.a-price .a-offscreen').first().text().trim();
    }
    if (!priceStr) {
      priceStr = $('span.a-price-whole').first().text().trim();
    }

    let price = 0;
    if (priceStr) {
      price = this.parsePrice(priceStr);
    } else {
      // إذا لم نجد سعرًا، نضع قيمة افتراضية أو نرفع خطأ
      throw new Error('Price not found on Amazon page');
    }

    return {
      name,
      price,
      currency: 'USD',
      url: this.store.url
    };
  }
}

module.exports = AmazonPlugin;
