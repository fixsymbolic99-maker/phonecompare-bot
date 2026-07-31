const logger = require('../utils/logger');
const dbService = require('../services/database.service');
const cacheService = require('../services/cache.service');
const mailService = require('../services/mail.service');
const reportService = require('../services/report.service');
const Manager = require('./manager');
const config = require('../config/config');

class Engine {
  constructor() {
    this.manager = new Manager();
    this.isRunning = false;
    this.currentTask = null;
  }

  async start() {
    if (this.isRunning) { logger.warn('Engine already running'); return; }
    this.isRunning = true;
    logger.info('Engine started');
    await this.runCycle();
  }

  async stop() {
    if (!this.isRunning) { logger.warn('Engine already stopped'); return; }
    this.isRunning = false;
    if (this.currentTask) { clearTimeout(this.currentTask); this.currentTask = null; }
    logger.info('Engine stopped');
  }

  async runCycle() {
    if (!this.isRunning) return;
    logger.info('Starting scraping cycle');

    // **الحل السحري:** نمسح الكاش ونقرا الملف من الصفر كل مرة
    const storesPath = '../config/stores';
    delete require.cache[require.resolve(storesPath)];
    const stores = require(storesPath);

    for (const store of stores) {
      // فلترة المتاجر حسب الحالة (enabled)
      if (!store.enabled) {
        logger.info(`Skipping ${store.id} (disabled)`);
        continue; 
      }

      try {
        logger.info(`Scraping ${store.id}...`);
        const result = await this.manager.scrapeStore(store);
        if (result) {
          const productId = dbService.upsertProduct(
            store.id,
            result.name,
            result.price,
            result.url,
            result.currency
          );
          logger.info(`Updated product ${store.id} (${result.name}) at $${result.price}`);
        }
      } catch (error) {
        logger.error(`Error scraping ${store.id}: ${error.message}`);
      }
    }

    logger.info('Scraping cycle completed');

    // إرسال التقرير (تم إصلاحه مسبقاً)
    if (config.ALERT_EMAIL) {
      try {
        const summary = await reportService.generateSummary();
        if (summary && Array.isArray(summary.products) && summary.products.length > 0) {
          let html = `<h2>تقرير تحديث الأسعار</h2><p>تم فحص ${summary.total} منتج.</p><ul>`;
          summary.products.forEach(p => {
            html += `<li><b>${p.name}</b> (${p.storeId}): ${p.currency} ${p.price}</li>`;
          });
          html += '</ul>';
          await mailService.sendPriceAlert(
            config.ALERT_EMAIL,
            'تقرير الأسعار اليومي - PhoneCompare Bot',
            html
          );
          logger.info(`Report sent to ${config.ALERT_EMAIL}`);
        } else {
          logger.warn('No products found to send report.');
        }
      } catch (err) {
        logger.error(`Failed to send report: ${err.message}`);
      }
    }

    // جدولة الدورة التالية
    if (this.isRunning) {
      this.currentTask = setTimeout(() => this.runCycle(), 60000);
    }
  }

  status() {
    return { running: this.isRunning, lastCycle: new Date().toISOString() };
  }
}

module.exports = Engine;
