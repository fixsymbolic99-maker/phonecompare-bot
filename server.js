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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname)));

// ===== مسارات عامة =====
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (password !== config.DASHBOARD_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key-change-me', { expiresIn: '7d' });
  res.json({ token });
});

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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/api/images', authMiddleware, (req, res) => {
  const imagesDir = path.join(__dirname, 'images');
  if (!fs.existsSync(imagesDir)) return res.json([]);
  const files = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
  res.json(files);
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  const { name, price, originalPrice, features, image, stores, rating, reviews, category } = req.body;
  try {
    await dbService.connect();
    const product = await dbService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (features !== undefined) product.features = features;
    if (image !== undefined) product.image = image;
    if (stores !== undefined) product.stores = stores;
    if (rating !== undefined) product.rating = rating;
    if (reviews !== undefined) product.reviews = reviews;
    if (category !== undefined) product.category = category;
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
  const { name, price, originalPrice, features, image, stores, rating, reviews, category } = req.body;
  try {
    await dbService.connect();
    const Product = require('./services/database.service').Product;
    const newProduct = new Product({
      name,
      price,
      originalPrice: originalPrice || 0,
      currency: 'USD',
      features,
      image,
      stores: stores || [],
      rating: rating || 0,
      reviews: reviews || 0,
      category: category || 'phones'
    });
    await newProduct.save();
    res.status(201).json({ message: 'Product added successfully', id: newProduct._id });
  } catch (err) {
    logger.error(`Error adding product: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ===== المسار العام للموقع =====
app.get('/api/public/products', async (req, res) => {
  try {
    await dbService.connect();
    const products = await dbService.getAllProducts();
    
    const formatted = products.map(p => ({
      id: p._id.toString(),
      name: p.name,
      category: p.category || 'phones',
      icon: p.image && p.image.startsWith('data:image') 
        ? `<img src="${p.image}" alt="${p.name}" />` 
        : `<div style="font-size:2.1rem;">📱</div>`,
      stores: (p.stores && p.stores.length > 0) 
        ? p.stores.map(s => ({ 
            name: s.storeId, 
            price: (s.price !== undefined && s.price > 0) ? s.price : p.price, // تم إزالة Math.round()
            old: p.originalPrice > 0 ? p.originalPrice : 0, // تم إزالة Math.round()
            url: s.url 
          }))
        : [{ name: p.storeId || 'Store', price: p.price, old: p.originalPrice > 0 ? p.originalPrice : 0, url: '' }],
      rating: p.rating || 0,
      reviews: p.reviews || 0,
      originalPrice: p.originalPrice || 0,
      price: p.price || 0,
      currency: 'USD',
      features: p.features || ''
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching public products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

const cron = require('node-cron');
cron.schedule('0 3 * * *', async () => {
  logger.info('Starting automatic database cleanup...');
  try {
    await dbService.connect();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    await dbService.deleteHistoryOlderThan(oneYearAgo);
    await dbService.deleteOldLogs(1000);
    await dbService.deleteOrphanImages();
  } catch (err) {
    logger.error(`Cleanup job failed: ${err.message}`);
  }
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) scheduler.start();

module.exports = app;
if (require.main === module) {
  const PORT = config.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
