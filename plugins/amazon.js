const BasePlugin = require('./base');
const cheerio = require('cheerio');

class AmazonPlugin extends BasePlugin {
  async fetchProduct() {
    // استخدمنا الرابط المباشر في `stores.js`، فلا نحتاج لتحديده هنا
    const html = await this.makeRequest(this.store.url);
    const $ = cheerio.load(html);

    let name = $('#productTitle').text().trim();
    if (!name) name = $('h1.a-text-normal').first().text().trim();

    let priceStr = $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text().trim();
    if (!priceStr) {
      priceStr = $('span.a-price-whole').first().text().trim();
    }
    if (!priceStr) {
      priceStr = $('#priceblock_ourprice').first().text().trim();
    }

    let price = 0;
    if (priceStr) {
      price = this.parsePrice(priceStr);
    } else {
      throw new Error('Price not found on Amazon page');
    }

    return {
      name: name || 'Amazon Product',
      price,
      currency: 'USD',
      url: this.store.url
    };
  }
}

module.exports = AmazonPlugin;
