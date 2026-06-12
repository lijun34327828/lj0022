import db from '../data/database.js';
import { v4 as uuidv4 } from 'uuid';
import { TranslationTask, TranslationSegment, SynthesisParams, TaskStatus, SegmentStatus } from '../../shared/types.js';

export class TaskRepository {
  createTask(task: Omit<TranslationTask, 'id' | 'createdAt' | 'retryCount' | 'checkpointIndex' | 'progress' | 'segments'>): TranslationTask {
    const id = uuidv4();
    const createdAt = Date.now();

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, type, source_language, target_language, source_dialect, status,
        priority, progress, created_at, retry_count, checkpoint_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      task.type,
      task.sourceLanguage,
      task.targetLanguage,
      task.sourceDialect || null,
      task.status,
      task.priority,
      0,
      createdAt,
      0,
      0
    );

    this.createSynthesisParams(id, task.params);

    return {
      ...task,
      id,
      createdAt,
      retryCount: 0,
      checkpointIndex: 0,
      progress: 0,
      segments: [],
    };
  }

  createSynthesisParams(taskId: string, params: SynthesisParams): void {
    const stmt = db.prepare(`
      INSERT INTO synthesis_params (
        id, task_id, emotion, speed, volume, pitch, voice_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      taskId,
      params.emotion,
      params.speed,
      params.volume,
      params.pitch,
      params.voiceId
    );
  }

  createSegment(segment: Omit<TranslationSegment, 'id'>): TranslationSegment {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO segments (
        id, task_id, start_time, end_time, source_text, target_text,
        audio_chunk_url, status, sequence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      segment.taskId,
      segment.startTime,
      segment.endTime,
      segment.sourceText || null,
      segment.targetText || null,
      segment.audioChunk || null,
      segment.status,
      segment.sequence
    );

    return { ...segment, id };
  }

  getTaskById(id: string): TranslationTask | null {
    const taskStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const paramsStmt = db.prepare('SELECT * FROM synthesis_params WHERE task_id = ?');
    const segmentsStmt = db.prepare('SELECT * FROM segments WHERE task_id = ? ORDER BY sequence');

    const taskRow: any = taskStmt.get(id);
    if (!taskRow) return null;

    const paramsRow: any = paramsStmt.get(id);
    const segmentRows: any[] = segmentsStmt.all(id);

    return {
      id: taskRow.id,
      type: taskRow.type,
      sourceLanguage: taskRow.source_language,
      targetLanguage: taskRow.target_language,
      sourceDialect: taskRow.source_dialect || undefined,
      status: taskRow.status,
      priority: taskRow.priority,
      progress: taskRow.progress,
      audioUrl: taskRow.audio_url || undefined,
      sourceText: taskRow.source_text || undefined,
      targetText: taskRow.target_text || undefined,
      createdAt: taskRow.created_at,
      startedAt: taskRow.started_at || undefined,
      completedAt: taskRow.completed_at || undefined,
      error: taskRow.error || undefined,
      retryCount: taskRow.retry_count,
      checkpointIndex: taskRow.checkpoint_index,
      params: paramsRow ? {
        emotion: paramsRow.emotion,
        speed: paramsRow.speed,
        volume: paramsRow.volume,
        pitch: paramsRow.pitch,
        voiceId: paramsRow.voice_id,
      } : {
        emotion: 'neutral',
        speed: 1.0,
        volume: 80,
        pitch: 1.0,
        voiceId: 'zh-female-1',
      },
      segments: segmentRows.map((row: any) => ({
        id: row.id,
        taskId: row.task_id,
        startTime: row.start_time,
        endTime: row.end_time,
        sourceText: row.source_text || '',
        targetText: row.target_text || '',
        audioChunk: row.audio_chunk_url || undefined,
        status: row.status,
        sequence: row.sequence,
      })),
    };
  }

  getTasks(limit: number = 100, offset: number = 0): TranslationTask[] {
    const stmt = db.prepare(`
      SELECT id FROM tasks 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);

    const rows: any[] = stmt.all(limit, offset);
    return rows
      .map((row) => this.getTaskById(row.id))
      .filter((task): task is TranslationTask => task !== null);
  }

  updateTaskStatus(id: string, status: TaskStatus, error?: string): void {
    const stmt = db.prepare(`
      UPDATE tasks 
      SET status = ?, 
          started_at = CASE WHEN ? = 'processing' AND started_at IS NULL THEN ? ELSE started_at END,
          completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') AND completed_at IS NULL THEN ? ELSE completed_at END,
          error = ?
      WHERE id = ?
    `);

    const now = Date.now();
    stmt.run(status, status, now, status, now, error || null, id);
  }

  updateTaskProgress(id: string, progress: number, checkpointIndex?: number): void {
    const updates: string[] = ['progress = ?'];
    const params: any[] = [progress];

    if (checkpointIndex !== undefined) {
      updates.push('checkpoint_index = ?');
      params.push(checkpointIndex);
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...params);
  }

  updateTaskResult(id: string, sourceText: string, targetText: string, audioUrl?: string): void {
    const stmt = db.prepare(`
      UPDATE tasks 
      SET source_text = ?, target_text = ?, audio_url = ?
      WHERE id = ?
    `);

    stmt.run(sourceText, targetText, audioUrl || null, id);
  }

  updateSegment(segmentId: string, updates: Partial<TranslationSegment>): void {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.sourceText !== undefined) {
      setClauses.push('source_text = ?');
      params.push(updates.sourceText);
    }
    if (updates.targetText !== undefined) {
      setClauses.push('target_text = ?');
      params.push(updates.targetText);
    }
    if (updates.audioChunk !== undefined) {
      setClauses.push('audio_chunk_url = ?');
      params.push(updates.audioChunk);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    params.push(segmentId);

    const stmt = db.prepare(`
      UPDATE segments SET ${setClauses.join(', ')} WHERE id = ?
    `);

    stmt.run(...params);
  }

  incrementRetryCount(id: string): number {
    const stmt = db.prepare(`
      UPDATE tasks SET retry_count = retry_count + 1 WHERE id = ?
    `);
    stmt.run(id);

    const task = this.getTaskById(id);
    return task?.retryCount || 0;
  }

  updateTaskPriority(id: string, priority: number): void {
    const stmt = db.prepare('UPDATE tasks SET priority = ? WHERE id = ?');
    stmt.run(priority, id);
  }

  deleteTask(id: string): void {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(id);
  }

  getTasksByStatus(status: TaskStatus): TranslationTask[] {
    const stmt = db.prepare('SELECT id FROM tasks WHERE status = ? ORDER BY priority DESC, created_at ASC');
    const rows: any[] = stmt.all(status);
    return rows
      .map((row) => this.getTaskById(row.id))
      .filter((task): task is TranslationTask => task !== null);
  }

  getPendingTasksForRetry(maxRetry: number): TranslationTask[] {
    const stmt = db.prepare(`
      SELECT id FROM tasks 
      WHERE status = 'failed' AND retry_count < ?
      ORDER BY retry_count ASC, created_at ASC
    `);
    const rows: any[] = stmt.all(maxRetry);
    return rows
      .map((row) => this.getTaskById(row.id))
      .filter((task): task is TranslationTask => task !== null);
  }
}

export default new TaskRepository();
