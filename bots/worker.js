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
    if (!store) throw new Error(`Store ${storeId} not found`);
    const result = await this.engine.manager.scrapeStore(store);
    await dbService.upsertProduct(store.id, result.name, result.price, result.url, result.currency);
    logger.info(`Manually scraped store ${storeId}`);
    return result;
  }

  getStatus() {
    return this.engine.status();
  }
}

const instance = new Worker();

// عشان يشتغل لوحده لما GitHub يناديه
if (require.main === module) {
  instance.startAll().catch(err => {
    console.error('Error running scraper:', err);
  });
}

module.exports = instance;
