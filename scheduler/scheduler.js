const cron = require('node-cron');
const logger = require('../utils/logger');
const worker = require('../bots/worker');
const config = require('../config/config');

class Scheduler {
  constructor() {
    this.task = null;
  }

  start() {
    if (this.task) {
      logger.warn('Scheduler already running');
      return;
    }
    // جدولة المهمة حسب التعبير في config
    this.task = cron.schedule(config.SCRAPE_INTERVAL, async () => {
      logger.info('Scheduled job: starting scrape');
      try {
        await worker.startAll();
      } catch (error) {
        logger.error(`Scheduled job failed: ${error.message}`);
      }
    });
    logger.info(`Scheduler started with interval ${config.SCRAPE_INTERVAL}`);
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Scheduler stopped');
    }
  }
}

module.exports = new Scheduler();
