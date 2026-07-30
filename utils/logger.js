const dbService = require('../services/database.service');

class Logger {
  info(message) {
    console.log(`[INFO] ${message}`);
    dbService.addLog('INFO', message);
  }

  warn(message) {
    console.warn(`[WARN] ${message}`);
    dbService.addLog('WARN', message);
  }

  error(message) {
    console.error(`[ERROR] ${message}`);
    dbService.addLog('ERROR', message);
  }

  debug(message) {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`);
    }
  }
}

module.exports = new Logger();
