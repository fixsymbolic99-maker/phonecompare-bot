const dbService = require('./database.service');

class ReportService {
  getCurrentPrices() {
    return dbService.getAllProducts();
  }

  getPriceHistory(productId, limit = 10) {
    return dbService.getHistory(productId, limit);
  }

  async generateSummary() {
    const products = dbService.getAllProducts();
    const total = products.length;
    const lastUpdate = new Date().toISOString();
    return { total, products, lastUpdate };
  }
}

module.exports = new ReportService();
