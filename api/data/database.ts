import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const logDir = 'data/logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const cacheDir = 'data/cache';
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

export const db = new Database(config.database.path);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const initTables = () => {
  const migrationFiles = [
    `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('realtime', 'upload')),
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      source_dialect TEXT,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
      priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
      progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      audio_url TEXT,
      source_text TEXT,
      target_text TEXT,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      checkpoint_index INTEGER DEFAULT 0
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS segments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      source_text TEXT,
      target_text TEXT,
      audio_chunk_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      sequence INTEGER NOT NULL
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS synthesis_params (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
      emotion TEXT NOT NULL DEFAULT 'neutral' CHECK (emotion IN ('joy', 'anger', 'sadness', 'neutral')),
      speed REAL NOT NULL DEFAULT 1.0 CHECK (speed BETWEEN 0.5 AND 2.0),
      volume INTEGER NOT NULL DEFAULT 80 CHECK (volume BETWEEN 0 AND 100),
      pitch REAL NOT NULL DEFAULT 1.0 CHECK (pitch BETWEEN 0.5 AND 2.0),
      voice_id TEXT NOT NULL
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS filter_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      filter_type TEXT NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('safe', 'warning', 'dangerous')),
      reason TEXT,
      blocked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      client_ip TEXT,
      user_agent TEXT
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS rate_limit_logs (
      id TEXT PRIMARY KEY,
      client_key TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_count INTEGER NOT NULL,
      blocked INTEGER NOT NULL DEFAULT 0,
      window_start INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    `,
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_segments_task_id ON segments(task_id);`,
    `CREATE INDEX IF NOT EXISTS idx_segments_sequence ON segments(sequence);`,
    `CREATE INDEX IF NOT EXISTS idx_filter_logs_created_at ON filter_logs(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_client_key ON rate_limit_logs(client_key);`,
    `CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at);`,
  ];

  const transaction = db.transaction(() => {
    for (const sql of migrationFiles) {
      db.exec(sql);
    }
  });

  try {
    transaction();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

initTables();

export default db;
