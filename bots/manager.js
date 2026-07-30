const logger = require('../utils/logger');
const cacheService = require('../services/cache.service');

// تحميل جميع الـ plugins مرة واحدة
const pluginsMap = {
  amazon: require('../plugins/amazon'),
  bestbuy: require('../plugins/bestbuy'),
  walmart: require('../plugins/walmart'),
  apple: require('../plugins/apple'),
};

class Manager {
  constructor() {
    // خريطة لتخزين المثيلات بعد إنشائها
    this.instances = new Map();
  }

  getPlugin(store) {
    if (this.instances.has(store.id)) {
      return this.instances.get(store.id);
    }

    const PluginClass = pluginsMap[store.plugin];
    if (!PluginClass) {
      logger.error(`No plugin class found for store ${store.id} (plugin: ${store.plugin})`);
      return null;
    }

    try {
      const instance = new PluginClass(store);
      this.instances.set(store.id, instance);
      return instance;
    } catch (error) {
      logger.error(`Failed to instantiate plugin for ${store.id}: ${error.message}`);
      return null;
    }
  }

  async scrapeStore(store) {
    const plugin = this.getPlugin(store);
    if (!plugin) {
      throw new Error(`No plugin available for store ${store.id}`);
    }

    const cacheKey = `price_${store.id}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Using cached price for ${store.id}`);
      return cached;
    }

    const result = await plugin.fetchProduct();
    cacheService.set(cacheKey, result);
    return result;
  }
}

module.exports = Manager;
