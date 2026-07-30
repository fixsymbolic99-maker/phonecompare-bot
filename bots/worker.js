const logger = require('../utils/logger');
const Engine = require('./engine');
const dbService = require('../services/database.service');

class Worker {
  constructor() {
    this.engine = new Engine();
  }

  async startAll() {
    await this.engine.start();
  }

  async stopAll() {
    await this.engine.stop();
  }

  async startStore(storeId) {
    const stores = require('../config/stores');
    const store = stores.find(s => s.id === storeId);
    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }
    const result = await this.engine.manager.scrapeStore(store);
    // تخزين النتيجة في MongoDB
    await dbService.upsertProduct(
      store.id,
      result.name,
      result.price,
      result.url,
      result.currency
    );
    logger.info(`Manually scraped store ${storeId}`);
    return result;
  }

  getStatus() {
    return this.engine.status();
  }
}

module.exports = new Worker();
