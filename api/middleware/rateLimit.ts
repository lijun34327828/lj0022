import rateLimit from 'express-rate-limit';
import config from '../utils/config.js';
import { v4 as uuidv4 } from 'uuid';
import db from '../data/database.js';

const logRateLimit = (clientKey: string, endpoint: string, requestCount: number, blocked: boolean) => {
  const stmt = db.prepare(`
    INSERT INTO rate_limit_logs (id, client_key, endpoint, request_count, blocked, window_start, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    uuidv4(),
    clientKey,
    endpoint,
    requestCount,
    blocked ? 1 : 0,
    Date.now() - (Date.now() % config.rateLimit.windowMs),
    Date.now()
  );
};

export const createRateLimiter = (max: number = config.rateLimit.max, windowMs: number = config.rateLimit.windowMs) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
      const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
      logRateLimit(clientKey, req.path, max + 1, true);
      res.status(429).json({
        code: 429,
        message: '请求过于频繁，请稍后再试',
        data: {
          retryAfter: Math.ceil(windowMs / 1000),
        },
      });
    },
  });
};

export const apiLimiter = createRateLimiter();
export const strictLimiter = createRateLimiter(10, 60000);
export const uploadLimiter = createRateLimiter(5, 300000);

export default apiLimiter;
