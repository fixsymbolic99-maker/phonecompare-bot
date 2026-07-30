const mongoose = require('mongoose');
const config = require('../config/config');

// ===== تعريف الموديلات (Schemas) =====
const productSchema = new mongoose.Schema({
  storeId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  url: { type: String, required: true },
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

// ===== فئة الخدمة =====
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
}

module.exports = new DatabaseService();
