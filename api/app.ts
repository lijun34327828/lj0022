import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import corsMiddleware from './middleware/cors.js';
import requestLogger from './middleware/logger.js';
import apiLimiter from './middleware/rateLimit.js';
import routes from './routes/index.js';
import logger from './utils/logger.js';
import mongoSanitize from 'express-mongo-sanitize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(corsMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());

app.use(requestLogger);

app.use('/api/v1', apiLimiter, routes);

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/api', (req, res) => {
  res.json({
    name: 'Voice Translator API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      languages: '/api/v1/languages',
      voices: '/api/v1/voices',
      translate: {
        upload: '/api/v1/translate/upload',
        text: '/api/v1/translate/text',
        stream: '/api/v1/translate/stream (WebSocket)',
      },
      tasks: '/api/v1/tasks',
    },
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      code: 404,
      message: '接口不存在',
    });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      code: 400,
      message: '文件过大',
    });
  }

  if (err.message === '不支持的音频格式') {
    return res.status(400).json({
      code: 400,
      message: err.message,
    });
  }

  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部错误',
  });
});

export default app;
