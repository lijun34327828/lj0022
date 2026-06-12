import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.SERVER_PORT || '8687', 10),
    host: process.env.SERVER_HOST || '0.0.0.0',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  database: {
    path: process.env.DB_PATH || 'data/tasks.db',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  audio: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10),
    allowedFormats: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'],
    chunkDuration: parseInt(process.env.CHUNK_DURATION || '30', 10),
    sampleRate: parseInt(process.env.SAMPLE_RATE || '16000', 10),
  },
  task: {
    maxRetry: parseInt(process.env.MAX_RETRY || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10),
    defaultPriority: parseInt(process.env.DEFAULT_PRIORITY || '5', 10),
  },
  cache: {
    audioTTL: parseInt(process.env.AUDIO_CACHE_TTL || '86400', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

export default config;
