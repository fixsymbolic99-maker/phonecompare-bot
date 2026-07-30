require('dotenv').config();
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-me',
  EMAIL: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  },
  ALERT_EMAIL: process.env.ALERT_EMAIL || '',
  SCRAPE_INTERVAL: process.env.SCRAPE_INTERVAL || '*/30 * * * *',
  CACHE_TTL: 5 * 60 * 1000,
  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'admin123',
  STORES: require('./stores')
};
