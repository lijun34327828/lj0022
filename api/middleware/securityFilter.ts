import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../data/database.js';
import { FilterResult } from '../../shared/types.js';
import logger from '../utils/logger.js';

const SENSITIVE_PATTERNS = [
  { pattern: /(违禁|违法|赌博|毒品|色情|暴力)/i, level: 'dangerous' as const },
  { pattern: /(fuck|shit|bitch|asshole)/i, level: 'warning' as const },
  { pattern: /(习近平|六四|天安门)/i, level: 'dangerous' as const },
];

const MALICIOUS_AUDIO_SIGNATURES = [
  Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]),
];

export const analyzeAudioContent = async (audioBuffer: Buffer): Promise<FilterResult> => {
  for (const signature of MALICIOUS_AUDIO_SIGNATURES) {
    if (audioBuffer.includes(signature)) {
      return {
        passed: false,
        level: 'dangerous',
        reason: '检测到恶意音频特征',
        blocked: true,
      };
    }
  }

  if (audioBuffer.length < 1024) {
    return {
      passed: false,
      level: 'warning',
      reason: '音频文件过小，可能损坏',
      blocked: false,
    };
  }

  return {
    passed: true,
    level: 'safe',
    blocked: false,
  };
};

export const analyzeTextContent = (text: string): FilterResult => {
  if (!text || text.trim().length === 0) {
    return { passed: true, level: 'safe', blocked: false };
  }

  for (const { pattern, level } of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        passed: false,
        level,
        reason: `检测到敏感内容: ${pattern.source}`,
        blocked: level === 'dangerous',
      };
    }
  }

  return {
    passed: true,
    level: 'safe',
    blocked: false,
  };
};

const logFilterResult = (
  taskId: string | undefined,
  filterType: string,
  result: FilterResult,
  clientIp: string,
  userAgent: string
) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO filter_logs (id, task_id, filter_type, level, reason, blocked, created_at, client_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      uuidv4(),
      taskId,
      filterType,
      result.level,
      result.reason,
      result.blocked ? 1 : 0,
      Date.now(),
      clientIp,
      userAgent
    );
  } catch (error) {
    logger.error('Failed to log filter result:', error);
  }
};

export const securityFilterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const taskId = req.body?.taskId || req.params?.id;

  if (req.body?.text) {
    const textResult = analyzeTextContent(req.body.text);
    logFilterResult(taskId, 'text', textResult, clientIp, userAgent);

    if (textResult.blocked) {
      return res.status(403).json({
        code: 403,
        message: textResult.reason || '内容被拒绝',
        data: { level: textResult.level },
      });
    }
  }

  if (req.file) {
    try {
      const audioResult = await analyzeAudioContent(req.file.buffer);
      logFilterResult(taskId, 'audio', audioResult, clientIp, userAgent);

      if (audioResult.blocked) {
        return res.status(403).json({
          code: 403,
          message: audioResult.reason || '音频被拒绝',
          data: { level: audioResult.level },
        });
      }
    } catch (error) {
      logger.error('Audio analysis failed:', error);
    }
  }

  next();
};

export default securityFilterMiddleware;
