const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('./config/config');
const authMiddleware = require('./middleware/auth');
const scheduler = require('./scheduler/scheduler');
const worker = require('./bots/worker');
const dbService = require('./services/database.service');
const logger = require('./utils/logger');
const storesList = require('./config/stores');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== تسجيل الدخول =====
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== config.DASHBOARD_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  
  const token = jwt.sign(
    { role: 'admin', exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
    config.JWT_SECRET
  );
  res.json({ token });
});

// ===== مسارات محمية =====
app.use('/api/proxy', authMiddleware);

app.post('/api/proxy/start-all', async (req, res) => {
  try { await worker.startAll(); res.json({ message: 'Started all stores' }); }
  catch (error) { logger.error(error.message); res.status(500).json({ error: error.message }); }
});

app.post('/api/proxy/stop-all', async (req, res) => {
  try { await worker.stopAll(); res.json({ message: 'Stopped all stores' }); }
  catch (error) { logger.error(error.message); res.status(500).json({ error: error.message }); }
});

app.post('/api/proxy/start/:storeId', async (req, res) => {
  try { const result = await worker.startStore(req.params.storeId); res.json({ message: `Started ${req.params.storeId}`, result }); }
  catch (error) { logger.error(error.message); res.status(500).json({ error: error.message }); }
});

app.get('/api/proxy/status', (req, res) => {
  res.json(worker.getStatus());
});

// ===== جلب المتاجر =====
app.get('/api/stores', authMiddleware, (req, res) => {
  res.json(storesList.map(({ id, name }) => ({ id, name })));
});

// ===== جلب المنتجات (MongoDB) =====
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const products = await dbService.getAllProducts();
    res.json(products);
  } catch (err) {
    res.json([]);
  }
});

// ===== جلب السجلات (MongoDB) =====
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await dbService.getLogs(50);
    res.json(logs);
  } catch (err) {
    res.json([]);
  }
});

// ===== بدء التشغيل =====
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  scheduler.start();
}

// الاتصال بقاعدة البيانات عند التشغيل
(async () => {
  try {
    await dbService.connect();
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
  }
})();

module.exports = app;

if (require.main === module) {
  const PORT = config.PORT;
  app.listen(PORT, () => { logger.info(`Server running on port ${PORT}`); });
}
