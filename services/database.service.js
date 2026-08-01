const mongoose = require('mongoose');
const config = require('../config/config');

// ===== تعريف الموديلات (Schemas) مع إضافة url و features بشكل صريح =====
const productSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  url: { type: String, default: '' },      // تم التأكد من وجود الحقل
  image: { type: String, default: '' },    // صورة Base64
  features: { type: String, default: '' }, // مميزات
  lastUpdated: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  changeType: { type: String, default: 'update' },
  recordedAt: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  level: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const History = mongoose.model('History', historySchema);
const Log = mongoose.model('Log', logSchema);

class DatabaseService {
  async connect() {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.MONGODB_URI);
    }
  }

  async getProductByStore(storeId) {
    await this.connect();
    return await Product.findOne({ storeId });
  }

  async getProductById(id) {
    await this.connect();
    return await Product.findById(id);
  }

  async upsertProduct(storeId, name, price, url, currency = 'USD') {
    await this.connect();
    let product = await Product.findOne({ storeId });
    if (product) {
      product.name = name; product.price = price; product.url = url; product.currency = currency;
      product.lastUpdated = new Date();
      await product.save();
      return product._id;
    } else {
      const newProduct = new Product({ storeId, name, price, currency, url });
      await newProduct.save();
      return newProduct._id;
    }
  }

  async addHistory(productId, price, currency, changeType = 'update') {
    await this.connect();
    const newHistory = new History({ productId, price, currency, changeType });
    await newHistory.save();
  }

  async addLog(level, message) {
    await this.connect();
    const newLog = new Log({ level, message });
    await newLog.save();
  }

  async getLogs(limit = 50) {
    await this.connect();
    return await Log.find().sort({ timestamp: -1 }).limit(limit);
  }

  getAllProducts() {
    return Product.find();
  }

  async deleteProduct(id) {
    await this.connect();
    return await Product.findByIdAndDelete(id);
  }

  // ===== دوال التنظيف التلقائي =====
  async deleteHistoryOlderThan(date) {
    await this.connect();
    return await History.deleteMany({ recordedAt: { $lt: date } });
  }

  async deleteOldLogs(keepCount) {
    await this.connect();
    const count = await Log.countDocuments();
    if (count <= keepCount) return { deletedCount: 0 };
    const toDelete = count - keepCount;
    const logs = await Log.find().sort({ timestamp: 1 }).limit(toDelete);
    const ids = logs.map(l => l._id);
    const result = await Log.deleteMany({ _id: { $in: ids } });
    return result;
  }

  async deleteOrphanImages() {
    await this.connect();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const result = await Product.updateMany(
      { storeId: 'manual', lastUpdated: { $lt: oneYearAgo }, image: { $ne: '' } },
      { $set: { image: '' } }
    );
    return result;
  }
}

module.exports = new DatabaseService();
