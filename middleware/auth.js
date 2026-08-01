const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // تعديل مهم جداً: استخدام process.env مباشرة لتفادي مشاكل تحميل config في Vercel
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-me');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
