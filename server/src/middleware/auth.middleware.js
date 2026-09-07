import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authMiddleware(req, res, next) {
  // Accept token via header (normal requests) or query string (EventSource can't set headers)
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : req.query.token;

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('subscription usage');
    req.user = {
      id: payload.id,
      plan: user ? user.plan : 'free',
      isPremium: user ? user.isPremium() : false
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
