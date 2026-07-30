const logger = require('../utils/logger');
const cacheService = require('../services/cache.service');

class Manager {
  constructor() {
    // خريطة لتخزين مثيلات الـ plugins
    this.plugins = new Map();
  }

  getPlugin(store) {
    if (this.plugins.has(store.id)) {
      return this.plugins.get(store.id);
    }
    // تحميل الـ plugin المناسب
    let PluginClass;
    try {
      switch (store.plugin) {
        case 'amazon':
          PluginClass = require('../plugins/amazon');
          break;
        case 'bestbuy':
          PluginClass = require('../plugins/bestbuy');
          break;
        case 'walmart':
          PluginClass = require('../plugins/walmart');
          break;
        case 'apple':
          PluginClass = require('../plugins/apple');
          break;
        default:
          PluginClass = require('../plugins/base');
      }
      const instance = new PluginClass(store);
      this.plugins.set(store.id, instance);
      return instance;
    } catch (error) {
      logger.error(`Failed to load plugin for ${store.id}: ${error.message}`);
      return null;
    }
  }

  async scrapeStore(store) {
    const plugin = this.getPlugin(store);
    if (!plugin) {
      throw new Error(`No plugin available for store ${store.id}`);
    }

    // التحقق من الكاش
    const cacheKey = `price_${store.id}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Using cached price for ${store.id}`);
      return cached;
    }

    const result = await plugin.fetchProduct();
    // تخزين في الكاش
    cacheService.set(cacheKey, result);
    return result;
  }
}

module.exports = Manager;
