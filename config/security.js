const crypto = require('crypto');

// مفاتيح إضافية للتشفير
module.exports = {
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
  JWT_EXPIRES_IN: '7d'
};
