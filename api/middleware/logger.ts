import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.headers['user-agent'] || 'unknown';

  logger.info(`[REQUEST] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    logger.info(`[RESPONSE] ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`);
  });

  res.on('error', (error) => {
    const duration = Date.now() - start;
    logger.error(`[ERROR] ${method} ${url} - Duration: ${duration}ms - Error: ${error.message}`);
  });

  next();
};

export default requestLogger;
