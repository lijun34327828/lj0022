import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import taskRepository from '../repositories/TaskRepository.js';
import { TranslationTask, TaskStatus, TranslationSegment } from '../../shared/types.js';
import asrService from './ASRService.js';
import dialectCorrectionService from './DialectCorrectionService.js';
import translationService from './TranslationService.js';
import ttsService from './TTSService.js';
import audioProcessService from './AudioProcessService.js';
import cacheService from './CacheService.js';

interface QueuedTask {
  task: TranslationTask;
  audioBuffer?: Buffer;
  priority: number;
  addedAt: number;
}

class TaskQueueService extends EventEmitter {
  private queue: QueuedTask[] = [];
  private processingTasks: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private retryTimer: NodeJS.Timeout | null = null;
  private checkpointInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startRetryScheduler();
    this.startCheckpointScheduler();
  }

  enqueue(task: TranslationTask, audioBuffer?: Buffer): void {
    logger.info(`Enqueuing task: ${task.id}, type=${task.type}, priority=${task.priority}`);

    const queuedTask: QueuedTask = {
      task,
      audioBuffer,
      priority: task.priority,
      addedAt: Date.now(),
    };

    this.queue.push(queuedTask);
    this.sortQueue();

    this.emit('task:queued', task);
    this.processNext();
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.addedAt - b.addedAt;
    });
  }

  private async processNext(): Promise<void> {
    if (this.processingTasks.size >= this.maxConcurrent) {
      return;
    }

    const queuedTask = this.queue.shift();
    if (!queuedTask) {
      return;
    }

    const { task, audioBuffer } = queuedTask;

    if (this.processingTasks.has(task.id)) {
      return;
    }

    this.processingTasks.add(task.id);

    try {
      await this.processTask(task, audioBuffer);
    } catch (error) {
      logger.error(`Task processing failed: ${task.id}`, error);
      this.handleTaskFailure(task, error as Error);
    } finally {
      this.processingTasks.delete(task.id);
      this.processNext();
    }
  }

  private async processTask(task: TranslationTask, audioBuffer?: Buffer): Promise<void> {
    logger.info(`Processing task: ${task.id}`);

    taskRepository.updateTaskStatus(task.id, 'processing');
    this.emit('task:processing', task);

    const startIndex = task.checkpointIndex || 0;
    const segments = task.segments.slice(startIndex);

    if (task.type === 'upload' && audioBuffer) {
      await this.processUploadTask(task, audioBuffer, segments, startIndex);
    } else {
      await this.processRealtimeTask(task, segments);
    }
  }

  private async processUploadTask(
    task: TranslationTask,
    audioBuffer: Buffer,
    segments: TranslationSegment[],
    startIndex: number
  ): Promise<void> {
    logger.info(`Processing upload task: ${task.id}, startIndex=${startIndex}`);

    const audioChunks = await audioProcessService.splitAudio(audioBuffer, 'wav', config.audio.chunkDuration);

    const totalSegments = audioChunks.length;
    let processedSegments = 0;

    for (let i = startIndex; i < audioChunks.length; i++) {
      const chunk = audioChunks[i];

      try {
        const segment = task.segments.find((s) => s.sequence === i) ||
          taskRepository.createSegment({
            taskId: task.id,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            sourceText: '',
            targetText: '',
            status: 'processing',
            sequence: i,
          });

        taskRepository.updateSegment(segment.id, { status: 'processing' });

        const asrResult = await asrService.recognize(chunk.buffer, task.sourceLanguage, task.sourceDialect);

        let correctedText = asrResult.text;
        if (task.sourceDialect) {
          correctedText = dialectCorrectionService.correct(asrResult.text, task.sourceDialect);
        }
        correctedText = dialectCorrectionService.correctAccent(correctedText, task.sourceLanguage);

        const translationResult = await translationService.translate(
          correctedText,
          task.sourceLanguage,
          task.targetLanguage
        );

        const ttsResult = await ttsService.synthesize(
          translationResult.text,
          task.targetLanguage,
          task.params
        );

        const audioUrl = await audioProcessService.saveAudioToCache(ttsResult.audio, task.id, segment.id);
        await cacheService.setAudioCache(task.id, segment.id, ttsResult.audio);

        taskRepository.updateSegment(segment.id, {
          sourceText: correctedText,
          targetText: translationResult.text,
          audioChunk: audioUrl,
          status: 'completed',
        });

        processedSegments++;
        const progress = Math.round(((i + 1) / totalSegments) * 100);
        taskRepository.updateTaskProgress(task.id, progress, i + 1);

        this.emit('segment:complete', {
          taskId: task.id,
          segment,
          sourceText: correctedText,
          targetText: translationResult.text,
          audio: ttsResult.audio.toString('base64'),
        });

        if ((i + 1) % 5 === 0) {
          logger.info(`Task ${task.id} progress: ${progress}%`);
        }
      } catch (error) {
        logger.error(`Segment processing failed, task=${task.id}, index=${i}`, error);
        const segment = task.segments.find((s) => s.sequence === i);
        if (segment) {
          taskRepository.updateSegment(segment.id, { status: 'failed' });
        }
        throw error;
      }
    }

    const allSegments = task.segments;
    const sourceText = allSegments.map((s) => s.sourceText).join(' ');
    const targetText = allSegments.map((s) => s.targetText).join(' ');

    taskRepository.updateTaskResult(task.id, sourceText, targetText);
    taskRepository.updateTaskStatus(task.id, 'completed');

    this.emit('task:complete', task);
    logger.info(`Task completed: ${task.id}`);
  }

  private async processRealtimeTask(task: TranslationTask, segments: TranslationSegment[]): Promise<void> {
    logger.info(`Processing realtime task: ${task.id}`);

    const allSegments = task.segments;
    const sourceText = allSegments.map((s) => s.sourceText).join(' ');
    const targetText = allSegments.map((s) => s.targetText).join(' ');

    taskRepository.updateTaskResult(task.id, sourceText, targetText);
    taskRepository.updateTaskStatus(task.id, 'completed');

    this.emit('task:complete', task);
    logger.info(`Realtime task completed: ${task.id}`);
  }

  private handleTaskFailure(task: TranslationTask, error: Error): void {
    const retryCount = taskRepository.incrementRetryCount(task.id);

    if (retryCount < config.task.maxRetry) {
      logger.info(`Scheduling retry for task ${task.id}, attempt ${retryCount + 1}/${config.task.maxRetry}`);

      const delay = config.task.retryDelay * Math.pow(2, retryCount);

      setTimeout(() => {
        const currentTask = taskRepository.getTaskById(task.id);
        if (currentTask && currentTask.status !== 'cancelled') {
          this.enqueue(currentTask);
        }
      }, delay);
    } else {
      logger.error(`Task ${task.id} failed after ${retryCount} retries`);
      taskRepository.updateTaskStatus(task.id, 'failed', error.message);
      this.emit('task:failed', { task, error });
    }
  }

  cancelTask(taskId: string): boolean {
    const task = taskRepository.getTaskById(taskId);
    if (!task) {
      return false;
    }

    this.queue = this.queue.filter((qt) => qt.task.id !== taskId);
    taskRepository.updateTaskStatus(taskId, 'cancelled');

    this.emit('task:cancelled', task);
    logger.info(`Task cancelled: ${taskId}`);

    return true;
  }

  retryTask(taskId: string): boolean {
    const task = taskRepository.getTaskById(taskId);
    if (!task || task.status !== 'failed') {
      return false;
    }

    taskRepository.updateTaskStatus(taskId, 'queued');
    this.enqueue(task);

    logger.info(`Task retry requested: ${taskId}`);
    return true;
  }

  updateTaskPriority(taskId: string, priority: number): boolean {
    const task = taskRepository.getTaskById(taskId);
    if (!task) {
      return false;
    }

    taskRepository.updateTaskPriority(taskId, priority);

    const queuedTask = this.queue.find((qt) => qt.task.id === taskId);
    if (queuedTask) {
      queuedTask.priority = priority;
      this.sortQueue();
    }

    this.emit('task:priority_updated', { taskId, priority });
    return true;
  }

  private startRetryScheduler(): void {
    this.retryTimer = setInterval(() => {
      const failedTasks = taskRepository.getPendingTasksForRetry(config.task.maxRetry);
      for (const task of failedTasks) {
        if (!this.processingTasks.has(task.id)) {
          logger.info(`Auto-retrying failed task: ${task.id}`);
          this.retryTask(task.id);
        }
      }
    }, 60000);
  }

  private startCheckpointScheduler(): void {
    this.checkpointInterval = setInterval(() => {
      cacheService.clearExpired();
    }, 3600000);
  }

  getQueueStatus(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      queued: this.queue.length,
      processing: this.processingTasks.size,
      completed: taskRepository.getTasksByStatus('completed').length,
      failed: taskRepository.getTasksByStatus('failed').length,
    };
  }

  shutdown(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
    }
    cacheService.disconnect();
  }
}

export const taskQueueService = new TaskQueueService();
export default taskQueueService;
