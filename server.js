const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const config = require('./config/config');
const authMiddleware = require('./middleware/auth');
const scheduler = require('./scheduler/scheduler');
const worker = require('./bots/worker');
const dbService = require('./services/database.service');
const logger = require('./utils/logger');
const storesList = require('./config/stores');

const app = express();

// زيادة حجم الصور المسموح بها (لـ Base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

// ===== مسارات عامة =====
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== config.DASHBOARD_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key-change-me', { expiresIn: '7d' });
  res.json({ token });
});

// ===== مسارات التحكم في البوت =====
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

app.get('/api/proxy/status', (req, res) => res.json(worker.getStatus()));
app.get('/api/stores', authMiddleware, (req, res) => res.json(storesList.map(({ id, name }) => ({ id, name }))));
app.get('/api/products', authMiddleware, async (req, res) => {
  try { res.json(await dbService.getAllProducts()); }
  catch (err) { res.json([]); }
});
app.get('/api/logs', authMiddleware, async (req, res) => {
  try { res.json(await dbService.getLogs(50)); }
  catch (err) { res.json([]); }
});

// ===== مسارات الإدارة والصور (Base64) =====
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// مسار رفع الصور (تحويلها لـ Base64 وحفظها في قاعدة البيانات)
app.post('/api/products/upload-image', authMiddleware, async (req, res) => {
  const { image, productId } = req.body;
  try {
    if (!image) return res.status(400).json({ error: 'No image provided' });
    // التحقق من أن الصورة Base64 صحيحة
    if (!image.startsWith('data:image')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    await dbService.connect();
    const product = await dbService.getProductById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.image = image; // تخزين الصورة كنص Base64
    await product.save();
    res.json({ message: 'Image uploaded successfully' });
  } catch (err) {
    logger.error(`Error uploading image: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { name, price, features, image } = req.body;
  try {
    await dbService.connect();
    const product = await dbService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (name) product.name = name;
    if (price !== undefined) product.price = price;
    if (features) product.features = features;
    if (image) product.image = image;
    await product.save();
    res.json({ message: 'Product updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    await dbService.connect();
    await dbService.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  const { name, price, features, storeId, image } = req.body;
  try {
    await dbService.connect();
    const finalStoreId = storeId || 'manual';
    const newProductId = await dbService.upsertProduct(finalStoreId, name, price, '', 'USD');
    const product = await dbService.getProductById(newProductId);
    if (product) {
      if (features) product.features = features;
      if (image) product.image = image;
      await product.save();
    }
    res.status(201).json({ message: 'Product added successfully', id: newProductId });
  } catch (err) {
    logger.error(`Error adding product: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ===== نظام الحذف والتنظيف التلقائي (Cron Job) =====
const cron = require('node-cron');

// تشغيل مهمة التنظيف يومياً عند الساعة 3:00 صباحاً
cron.schedule('0 3 * * *', async () => {
  logger.info('Starting automatic database cleanup...');
  try {
    await dbService.connect();
    // 1. حذف السجلات التاريخية الأقدم من 365 يوم
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const historyResult = await dbService.deleteHistoryOlderThan(oneYearAgo);
    logger.info(`Cleaned ${historyResult.deletedCount} old history records.`);

    // 2. حذف سجلات النظام الأقدم من 1000 سجل (حافظ على آخر 1000)
    const logsResult = await dbService.deleteOldLogs(1000);
    logger.info(`Cleaned ${logsResult.deletedCount} old logs.`);

    // 3. حذف الصور غير المستخدمة (Base64) من المنتجات المحذوفة
    const imageResult = await dbService.deleteOrphanImages();
    logger.info(`Cleaned ${imageResult.deletedCount} orphan images.`);

    // 4. حذف المنتجات التي ليس لها تاريخ وتم إضافتها يدوياً منذ أكثر من سنة (اختياري)
    const productResult = await dbService.deleteOldManualProducts(oneYearAgo);
    if (productResult) {
      logger.info(`Cleaned ${productResult.deletedCount} old manual products.`);
    }

  } catch (err) {
    logger.error(`Cleanup job failed: ${err.message}`);
  }
});

// ===== التشغيل =====
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) scheduler.start();

module.exports = app;
if (require.main === module) {
  const PORT = config.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
                                               }
