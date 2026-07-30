const BasePlugin = require('./base');
const cheerio = require('cheerio');

class ApplePlugin extends BasePlugin {
  async fetchProduct() {
    const html = await this.makeRequest(this.store.url);
    const $ = cheerio.load(html);

    let name = $('.product-title').text().trim();
    if (!name) name = $('h1[data-autom="product-title"]').text().trim() || 'Apple Product';

    let priceStr = $('.price').text().trim();
    if (!priceStr) {
      priceStr = $('.rf-buyprice').text().trim();
    }
    if (!priceStr) {
      priceStr = $('[data-autom="price"]').text().trim();
    }

    let price = 0;
    if (priceStr) {
      price = this.parsePrice(priceStr);
    } else {
      throw new Error('Price not found on Apple page');
    }

    return {
      name,
      price,
      currency: 'USD',
      url: this.store.url
    };
  }
}

module.exports = ApplePlugin;
