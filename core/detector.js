const dbService = require('../services/database.service');
const logger = require('../utils/logger');

class Detector {
  detectChange(storeId, newPrice) {
    const product = dbService.getProductByStore(storeId);
    if (!product) {
      logger.info(`No existing product for ${storeId}, treating as new`);
      return { changed: true, changeType: 'new', oldPrice: null, newPrice };
    }
    const oldPrice = product.price;
    if (oldPrice === newPrice) {
      return { changed: false, changeType: 'same', oldPrice, newPrice };
    }
    const changeType = newPrice > oldPrice ? 'increase' : 'decrease';
    return { changed: true, changeType, oldPrice, newPrice };
  }
}

module.exports = new Detector();
