const BasePlugin = require('./base');
const cheerio = require('cheerio');

class BestBuyPlugin extends BasePlugin {
  async fetchProduct() {
    const html = await this.makeRequest(this.store.url);
    const $ = cheerio.load(html);

    let name = $('h1[itemprop="name"]').text().trim();
    if (!name) name = $('.product-title').text().trim() || 'BestBuy Product';

    let priceStr = $('.priceView-customer-price span[itemprop="price"]').text().trim();
    if (!priceStr) {
      priceStr = $('.priceView .priceView-hero-price span').first().text().trim();
    }
    if (!priceStr) {
      priceStr = $('.price-block .price').text().trim();
    }

    let price = 0;
    if (priceStr) {
      price = this.parsePrice(priceStr);
    } else {
      throw new Error('Price not found on BestBuy page');
    }

    return {
      name,
      price,
      currency: 'USD',
      url: this.store.url
    };
  }
}

module.exports = BestBuyPlugin;
