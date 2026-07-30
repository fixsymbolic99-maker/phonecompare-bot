const dbService = require('../services/database.service');
const detector = require('./detector');

class Updater {
  updateProduct(storeId, name, price, url, currency = 'USD') {
    const detection = detector.detectChange(storeId, price);
    if (detection.changed) {
      // تحديث المنتج وتسجيل التاريخ
      const productId = dbService.upsertProduct(storeId, name, price, url, currency);
      // تسجيل التغيير في التاريخ
      dbService.addHistory(productId, price, currency, detection.changeType);
      return { updated: true, productId, changeType: detection.changeType, oldPrice: detection.oldPrice, newPrice };
    } else {
      // تحديث وقت آخر تحديث فقط
      const product = dbService.getProductByStore(storeId);
      if (product) {
        const stmt = dbService.getDb().prepare('UPDATE products SET lastUpdated = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(product.id);
      }
      return { updated: false, message: 'No price change' };
    }
  }
}

module.exports = new Updater();
