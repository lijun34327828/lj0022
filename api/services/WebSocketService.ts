import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { WSMessage, SynthesisParams, TranslationSegment } from '../../shared/types.js';
import taskRepository from '../repositories/TaskRepository.js';
import asrService from './ASRService.js';
import dialectCorrectionService from './DialectCorrectionService.js';
import translationService from './TranslationService.js';
import ttsService from './TTSService.js';
import audioProcessService from './AudioProcessService.js';
import cacheService from './CacheService.js';
import taskQueueService from './TaskQueueService.js';

interface ClientSession {
  socket: Socket;
  taskId?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  sourceDialect?: string;
  params?: SynthesisParams;
  isRecording: boolean;
  audioChunks: Buffer[];
  sequence: number;
  lastHeartbeat: number;
}

export class WebSocketService {
  private io: SocketIOServer;
  private sessions: Map<string, ClientSession> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      maxHttpBufferSize: 1e8,
    });

    this.initialize();
  }

  private initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    taskQueueService.on('segment:complete', (data: any) => {
      this.broadcastSegmentComplete(data);
    });

    taskQueueService.on('task:complete', (task: any) => {
      this.broadcastTaskComplete(task);
    });

    taskQueueService.on('task:failed', (data: any) => {
      this.broadcastTaskFailed(data);
    });

    logger.info('WebSocket service initialized');
  }

  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    logger.info(`WebSocket connected: ${clientId}, IP: ${socket.handshake.address}`);

    const session: ClientSession = {
      socket,
      isRecording: false,
      audioChunks: [],
      sequence: 0,
      lastHeartbeat: Date.now(),
    };

    this.sessions.set(clientId, session);

    socket.emit('connected', {
      clientId,
      serverTime: Date.now(),
      supportedFormats: config.audio.allowedFormats,
    });

    socket.on('start_session', (data: any) => this.handleStartSession(clientId, data));
    socket.on('audio_chunk', (data: any) => this.handleAudioChunk(clientId, data));
    socket.on('end_recording', () => this.handleEndRecording(clientId));
    socket.on('pause_recording', () => this.handlePauseRecording(clientId));
    socket.on('resume_recording', () => this.handleResumeRecording(clientId));
    socket.on('ping', () => this.handlePing(clientId));
    socket.on('disconnect', (reason) => this.handleDisconnect(clientId, reason));
    socket.on('reconnect', (oldId: string) => this.handleReconnect(clientId, oldId));
  }

  private handleStartSession(clientId: string, data: any): void {
    const session = this.sessions.get(clientId);
    if (!session) return;

    const { sourceLanguage, targetLanguage, sourceDialect, params } = data;

    session.sourceLanguage = sourceLanguage || 'zh-CN';
    session.targetLanguage = targetLanguage || 'en-US';
    session.sourceDialect = sourceDialect;
    session.params = params || {
      emotion: 'neutral',
      speed: 1.0,
      volume: 80,
      pitch: 1.0,
      voiceId: 'zh-female-1',
    };

    const task = taskRepository.createTask({
      type: 'realtime',
      sourceLanguage: session.sourceLanguage,
      targetLanguage: session.targetLanguage,
      sourceDialect: session.sourceDialect,
      status: 'processing',
      priority: config.task.defaultPriority,
      params: session.params,
    });

    session.taskId = task.id;
    session.isRecording = true;
    session.audioChunks = [];
    session.sequence = 0;

    logger.info(`Session started: ${clientId}, task=${task.id}`);

    session.socket.emit('session_started', {
      taskId: task.id,
      sourceLanguage: session.sourceLanguage,
      targetLanguage: session.targetLanguage,
    });
  }

  private async handleAudioChunk(clientId: string, data: any): Promise<void> {
    const session = this.sessions.get(clientId);
    if (!session || !session.isRecording || !session.taskId) return;

    try {
      const audioBuffer = Buffer.from(data.audio, 'base64');
      const sequence = data.sequence || session.sequence++;

      session.audioChunks.push(audioBuffer);
      session.lastHeartbeat = Date.now();

      if (audioBuffer.length > 1024) {
        await this.processAudioChunk(session, audioBuffer, sequence);
      }

      session.socket.emit('chunk_received', {
        sequence,
        timestamp: Date.now(),
        size: audioBuffer.length,
      });
    } catch (error) {
      logger.error(`Audio chunk processing failed for ${clientId}:`, error);
      session.socket.emit('error', {
        message: error instanceof Error ? error.message : '处理失败',
      });
    }
  }

  private async processAudioChunk(
    session: ClientSession,
    audioBuffer: Buffer,
    sequence: number
  ): Promise<void> {
    if (!session.taskId || !session.sourceLanguage || !session.targetLanguage || !session.params) return;

    const startTime = (sequence - 1) * 0.5;
    const endTime = startTime + 0.5;

    const segment = taskRepository.createSegment({
      taskId: session.taskId,
      startTime,
      endTime,
      sourceText: '',
      targetText: '',
      status: 'processing',
      sequence,
    });

    try {
      const asrResult = await asrService.recognize(
        audioBuffer,
        session.sourceLanguage,
        session.sourceDialect
      );

      let correctedText = asrResult.text;
      if (session.sourceDialect) {
        correctedText = dialectCorrectionService.correct(asrResult.text, session.sourceDialect);
      }
      correctedText = dialectCorrectionService.correctAccent(correctedText, session.sourceLanguage);

      const translationResult = await translationService.translate(
        correctedText,
        session.sourceLanguage,
        session.targetLanguage
      );

      const ttsResult = await ttsService.synthesize(
        translationResult.text,
        session.targetLanguage,
        session.params
      );

      const audioUrl = await audioProcessService.saveAudioToCache(ttsResult.audio, session.taskId, segment.id);
      await cacheService.setAudioCache(session.taskId, segment.id, ttsResult.audio);

      taskRepository.updateSegment(segment.id, {
        sourceText: correctedText,
        targetText: translationResult.text,
        audioChunk: audioUrl,
        status: 'completed',
      });

      session.socket.emit('text_result', {
        taskId: session.taskId,
        segmentId: segment.id,
        source: correctedText,
        target: translationResult.text,
        startTime,
        endTime,
        audio: ttsResult.audio.toString('base64'),
        audioUrl,
        isFinal: true,
        sequence,
      });

      const task = taskRepository.getTaskById(session.taskId);
      if (task) {
        const completedSegments = task.segments.filter((s) => s.status === 'completed').length;
        const progress = Math.min(100, Math.round((completedSegments / Math.max(task.segments.length, 1)) * 100));
        taskRepository.updateTaskProgress(session.taskId, progress);
      }
    } catch (error) {
      logger.error(`Segment processing failed: ${segment.id}`, error);
      taskRepository.updateSegment(segment.id, { status: 'failed' });

      session.socket.emit('error', {
        taskId: session.taskId,
        segmentId: segment.id,
        message: error instanceof Error ? error.message : '处理失败',
        sequence,
      });
    }
  }

  private handleEndRecording(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session || !session.taskId) return;

    session.isRecording = false;
    logger.info(`Recording ended: ${clientId}, task=${session.taskId}`);

    const task = taskRepository.getTaskById(session.taskId);
    if (task) {
      const sourceText = task.segments.map((s) => s.sourceText).join(' ');
      const targetText = task.segments.map((s) => s.targetText).join(' ');

      taskRepository.updateTaskResult(session.taskId, sourceText, targetText);
      taskRepository.updateTaskStatus(session.taskId, 'completed');

      taskQueueService.emit('task:complete', task);

      session.socket.emit('session_ended', {
        taskId: session.taskId,
        totalSegments: task.segments.length,
        sourceText,
        targetText,
        duration: task.segments.length * 0.5,
      });
    }

    session.taskId = undefined;
    session.audioChunks = [];
    session.sequence = 0;
  }

  private handlePauseRecording(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session) return;

    session.isRecording = false;
    logger.info(`Recording paused: ${clientId}`);

    session.socket.emit('recording_paused', {
      timestamp: Date.now(),
      chunksBuffered: session.audioChunks.length,
    });
  }

  private handleResumeRecording(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session) return;

    session.isRecording = true;
    logger.info(`Recording resumed: ${clientId}`);

    session.socket.emit('recording_resumed', {
      timestamp: Date.now(),
      sequence: session.sequence,
    });
  }

  private handlePing(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session) return;

    session.lastHeartbeat = Date.now();
    session.socket.emit('pong', {
      serverTime: Date.now(),
      queueStatus: taskQueueService.getQueueStatus(),
    });
  }

  private handleDisconnect(clientId: string, reason: string): void {
    const session = this.sessions.get(clientId);
    if (!session) return;

    logger.info(`WebSocket disconnected: ${clientId}, reason: ${reason}`);

    if (session.taskId && session.isRecording) {
      const task = taskRepository.getTaskById(session.taskId);
      if (task && task.status === 'processing') {
        taskRepository.updateTaskStatus(session.taskId, 'queued');
        logger.info(`Task ${session.taskId} queued for reconnection`);
      }
    }

    if (reason === 'io client disconnect' || reason === 'transport close') {
      this.reconnectAttempts.set(clientId, 0);
      setTimeout(() => {
        if (this.reconnectAttempts.has(clientId)) {
          this.sessions.delete(clientId);
          this.reconnectAttempts.delete(clientId);
        }
      }, 300000);
    } else {
      this.sessions.delete(clientId);
    }
  }

  private handleReconnect(clientId: string, oldId: string): void {
    const oldSession = this.sessions.get(oldId);
    if (!oldSession) {
      const newSession = this.sessions.get(clientId);
      if (newSession) {
        newSession.socket.emit('reconnect_failed', {
          message: '旧会话不存在，请重新开始',
        });
      }
      return;
    }

    const newSession = this.sessions.get(clientId);
    if (!newSession) return;

    newSession.taskId = oldSession.taskId;
    newSession.sourceLanguage = oldSession.sourceLanguage;
    newSession.targetLanguage = oldSession.targetLanguage;
    newSession.sourceDialect = oldSession.sourceDialect;
    newSession.params = oldSession.params;
    newSession.sequence = oldSession.sequence;
    newSession.audioChunks = oldSession.audioChunks;
    newSession.isRecording = oldSession.isRecording;

    this.sessions.delete(oldId);
    this.reconnectAttempts.delete(oldId);

    logger.info(`Session reconnected: ${oldId} -> ${clientId}`);

    newSession.socket.emit('reconnected', {
      taskId: newSession.taskId,
      sequence: newSession.sequence,
      isRecording: newSession.isRecording,
      checkpointIndex: newSession.sequence,
    });

    if (newSession.taskId) {
      const task = taskRepository.getTaskById(newSession.taskId);
      if (task) {
        newSession.socket.emit('state_restore', {
          task,
          segments: task.segments,
        });
      }
    }
  }

  private broadcastSegmentComplete(data: any): void {
    this.io.emit('segment_complete', data);
  }

  private broadcastTaskComplete(task: any): void {
    this.io.emit('task_complete', {
      taskId: task.id,
      status: task.status,
      progress: 100,
    });
  }

  private broadcastTaskFailed(data: any): void {
    this.io.emit('task_failed', {
      taskId: data.task.id,
      error: data.error?.message,
      retryCount: data.task.retryCount,
    });
  }

  getConnectedClients(): number {
    return this.sessions.size;
  }

  shutdown(): void {
    this.io.close();
    logger.info('WebSocket service shutdown');
  }
}

export default WebSocketService;
