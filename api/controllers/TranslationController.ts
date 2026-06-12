import { Request, Response } from 'express';
import multer from 'multer';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { LANGUAGES, VOICES, SynthesisParams, ApiResponse, TaskCreateResponse } from '../../shared/types.js';
import taskRepository from '../repositories/TaskRepository.js';
import audioProcessService from '../services/AudioProcessService.js';
import taskQueueService from '../services/TaskQueueService.js';
import asrService from '../services/ASRService.js';
import dialectCorrectionService from '../services/DialectCorrectionService.js';
import translationService from '../services/TranslationService.js';
import ttsService from '../services/TTSService.js';
import cacheService from '../services/CacheService.js';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: config.audio.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mpeg|wav|flac|aac|m4a|ogg|x-m4a|x-wav)/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  },
});

export class TranslationController {
  async getLanguages(req: Request, res: Response<ApiResponse>) {
    try {
      res.json({
        code: 0,
        message: 'success',
        data: LANGUAGES,
      });
    } catch (error) {
      logger.error('Failed to get languages:', error);
      res.status(500).json({
        code: 500,
        message: '获取语言列表失败',
      });
    }
  }

  async getVoices(req: Request, res: Response<ApiResponse>) {
    try {
      const { language } = req.query;
      let voices = VOICES;

      if (language && typeof language === 'string') {
        voices = VOICES.filter((v) => v.language.startsWith(language.split('-')[0]));
      }

      res.json({
        code: 0,
        message: 'success',
        data: voices,
      });
    } catch (error) {
      logger.error('Failed to get voices:', error);
      res.status(500).json({
        code: 500,
        message: '获取音色列表失败',
      });
    }
  }

  async uploadAudio(req: Request, res: Response<ApiResponse<TaskCreateResponse>>) {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请上传音频文件',
        });
      }

      const { sourceLanguage, targetLanguage, sourceDialect, params } = req.body;

      if (!sourceLanguage || !targetLanguage) {
        return res.status(400).json({
          code: 400,
          message: '请指定源语言和目标语言',
        });
      }

      let synthesisParams: SynthesisParams;
      try {
        synthesisParams = params ? JSON.parse(params) : {
          emotion: 'neutral',
          speed: 1.0,
          volume: 80,
          pitch: 1.0,
          voiceId: 'zh-female-1',
        };
      } catch (parseError) {
        return res.status(400).json({
          code: 400,
          message: '参数格式错误',
        });
      }

      const validation = await audioProcessService.validateAudio(req.file);
      if (!validation.valid) {
        return res.status(400).json({
          code: 400,
          message: validation.error || '音频验证失败',
        });
      }

      const convertedBuffer = await audioProcessService.convertFormat(
        req.file.buffer,
        validation.format || 'wav',
        'wav'
      );

      const task = taskRepository.createTask({
        type: 'upload',
        sourceLanguage,
        targetLanguage,
        sourceDialect,
        status: 'queued',
        priority: config.task.defaultPriority,
        params: synthesisParams,
      });

      const estimatedTime = (validation.duration || 60) * 1.5;

      taskQueueService.enqueue(task, convertedBuffer);

      logger.info(`Upload task created: ${task.id}, duration=${validation.duration?.toFixed(2)}s`);

      res.json({
        code: 0,
        message: '任务已提交',
        data: {
          taskId: task.id,
          status: task.status,
          priority: task.priority,
          estimatedTime: Math.round(estimatedTime),
        },
      });
    } catch (error) {
      logger.error('Upload failed:', error);
      res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '上传失败',
      });
    }
  }

  async translateText(req: Request, res: Response<ApiResponse>) {
    try {
      const { text, sourceLanguage, targetLanguage, params } = req.body;

      if (!text || !sourceLanguage || !targetLanguage) {
        return res.status(400).json({
          code: 400,
          message: '缺少必要参数',
        });
      }

      const synthesisParams: SynthesisParams = params || {
        emotion: 'neutral',
        speed: 1.0,
        volume: 80,
        pitch: 1.0,
        voiceId: 'zh-female-1',
      };

      const translationResult = await translationService.translate(text, sourceLanguage, targetLanguage);
      const ttsResult = await ttsService.synthesize(translationResult.text, targetLanguage, synthesisParams);

      const audioBuffer = ttsResult.audio;
      const base64Audio = audioBuffer.toString('base64');

      res.json({
        code: 0,
        message: 'success',
        data: {
          sourceText: text,
          targetText: translationResult.text,
          audio: base64Audio,
          audioUrl: `data:audio/wav;base64,${base64Audio}`,
        },
      });
    } catch (error) {
      logger.error('Text translation failed:', error);
      res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '翻译失败',
      });
    }
  }

  async previewVoice(req: Request, res: Response<ApiResponse>) {
    try {
      const { text, language, params } = req.body;

      if (!text || !language) {
        return res.status(400).json({
          code: 400,
          message: '缺少必要参数',
        });
      }

      const synthesisParams: SynthesisParams = params || {
        emotion: 'neutral',
        speed: 1.0,
        volume: 80,
        pitch: 1.0,
        voiceId: 'zh-female-1',
      };

      const ttsResult = await ttsService.synthesize(text, language, synthesisParams);
      const base64Audio = ttsResult.audio.toString('base64');

      res.json({
        code: 0,
        message: 'success',
        data: {
          audio: base64Audio,
          audioUrl: `data:audio/wav;base64,${base64Audio}`,
          duration: ttsResult.duration,
        },
      });
    } catch (error) {
      logger.error('Voice preview failed:', error);
      res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '预览失败',
      });
    }
  }

  async getAudio(req: Request, res: Response) {
    try {
      const { taskId, segmentId } = req.params;

      const audioBuffer = await audioProcessService.getAudioFromCache(taskId, segmentId);

      if (!audioBuffer) {
        return res.status(404).json({
          code: 404,
          message: '音频不存在',
        });
      }

      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename="${taskId}.wav"`);
      res.send(audioBuffer);
    } catch (error) {
      logger.error('Get audio failed:', error);
      res.status(500).json({
        code: 500,
        message: '获取音频失败',
      });
    }
  }

  async clearCache(req: Request, res: Response<ApiResponse>) {
    try {
      const { taskId } = req.params;

      await cacheService.deleteAudioCache(taskId);

      res.json({
        code: 0,
        message: '缓存已清除',
      });
    } catch (error) {
      logger.error('Clear cache failed:', error);
      res.status(500).json({
        code: 500,
        message: '清除缓存失败',
      });
    }
  }

  async healthCheck(req: Request, res: Response<ApiResponse>) {
    try {
      const queueStatus = taskQueueService.getQueueStatus();

      res.json({
        code: 0,
        message: 'success',
        data: {
          status: 'ok',
          timestamp: Date.now(),
          queue: queueStatus,
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        code: 500,
        message: '服务异常',
      });
    }
  }
}

export default new TranslationController();
