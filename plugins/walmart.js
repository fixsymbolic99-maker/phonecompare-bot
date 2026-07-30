const BasePlugin = require('./base');
const cheerio = require('cheerio');

class WalmartPlugin extends BasePlugin {
  async fetchProduct() {
    const html = await this.makeRequest(this.store.url);
    const $ = cheerio.load(html);

    let name = $('h1[itemprop="name"]').text().trim();
    if (!name) name = $('.prod-productTitle').text().trim() || 'Walmart Product';

    let priceStr = $('span[itemprop="price"]').text().trim();
    if (!priceStr) {
      priceStr = $('.price-now span').first().text().trim();
    }
    if (!priceStr) {
      priceStr = $('.prod-price .price').text().trim();
    }

    let price = 0;
    if (priceStr) {
      price = this.parsePrice(priceStr);
    } else {
      throw new Error('Price not found on Walmart page');
    }

    return {
      name,
      price,
      currency: 'USD',
      url: this.store.url
    };
  }
}

module.exports = WalmartPlugin;
