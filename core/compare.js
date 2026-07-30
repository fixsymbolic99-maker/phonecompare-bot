const dbService = require('../services/database.service');

class Compare {
  comparePrices(productId, newPrice) {
    const product = dbService.getProductById(productId);
    if (!product) return null;
    const oldPrice = product.price;
    let changeType = 'update';
    if (newPrice > oldPrice) changeType = 'increase';
    else if (newPrice < oldPrice) changeType = 'decrease';
    return { oldPrice, newPrice, changeType };
  }
}

module.exports = new Compare();
