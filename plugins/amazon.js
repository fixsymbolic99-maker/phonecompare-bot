const BasePlugin = require('./base');
const cheerio = require('cheerio');

class AmazonPlugin extends BasePlugin {
  async fetchProduct() {
    // استخدام عنوان URL مباشر للمنتج (iPhone 14 Pro)
    const url = 'https://www.amazon.com/Apple-iPhone-14-Pro-128GB/dp/B0BDJ2M8KX';
    const html = await this.makeRequest(url);
    const $ = cheerio.load(html);

    // استخراج الاسم
    let name = $('#productTitle').text().trim();
    if (!name) {
      name = $('h1.a-text-normal').first().text().trim();
    }

    // استخراج السعر
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
      url
    };
  }
}

module.exports = AmazonPlugin;
