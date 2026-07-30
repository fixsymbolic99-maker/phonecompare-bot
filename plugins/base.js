const axios = require('axios');

// قائمة User-Agents مختلفة لمحاكاة متصفح حقيقي
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
];

class BasePlugin {
  constructor(store) {
    this.store = store;
  }

  async fetchProduct() {
    throw new Error('fetchProduct must be implemented by subclass');
  }

  async makeRequest(url) {
    let lastError = null;
    // محاولة 3 مرات إذا فشل الطلب
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const response = await axios.get(url, {
          headers: {
            'User-Agent': randomUserAgent,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive'
          },
          timeout: 20000, // زودنا الوقت لـ 20 ثانية عشان مواقع BestBuy البطيئة
          maxRedirects: 5 // التعامل مع الروابط المختصرة
        });
        return response.data;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          // انتظر ثانية قبل إعادة المحاولة
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    throw new Error(`Failed to fetch URL ${url}: ${lastError.message}`);
  }

  parsePrice(priceStr) {
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
}

module.exports = BasePlugin;
