const config = require('../config/config');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = config.CACHE_TTL;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = new CacheService();
