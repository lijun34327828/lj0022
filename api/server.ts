import { createServer } from 'http';
import app from './app.js';
import config from './utils/config.js';
import logger from './utils/logger.js';
import WebSocketService from './services/WebSocketService.js';
import taskQueueService from './services/TaskQueueService.js';
import './data/database.js';

export function startServer() {
  const httpServer = createServer(app);

  const wsService = new WebSocketService(httpServer);

  httpServer.listen(config.server.port, config.server.host, () => {
    logger.info(`=================================`);
    logger.info(`🚀 语音翻译服务已启动`);
    logger.info(`📍 服务地址: http://${config.server.host}:${config.server.port}`);
    logger.info(`🔌 WebSocket: ws://${config.server.host}:${config.server.port}`);
    logger.info(`📋  API 文档: http://${config.server.host}:${config.server.port}/api`);
    logger.info(`=================================`);
  });

  const shutdown = (signal: string) => {
    logger.info(`\n收到 ${signal} 信号，正在关闭服务...`);

    httpServer.close(() => {
      logger.info('HTTP 服务器已关闭');
    });

    wsService.shutdown();
    taskQueueService.shutdown();

    setTimeout(() => {
      logger.info('服务已安全关闭');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('未捕获的异常:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的拒绝:', reason, promise);
  });

  return { httpServer, wsService };
}

export default startServer;
