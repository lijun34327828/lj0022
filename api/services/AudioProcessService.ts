import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { v4 as uuidv4 } from 'uuid';

export class AudioProcessService {
  async validateAudio(file: Express.Multer.File): Promise<{ valid: boolean; format?: string; duration?: number; error?: string }> {
    const filename = file.originalname.toLowerCase();
    const ext = path.extname(filename).slice(1);

    if (!config.audio.allowedFormats.includes(ext)) {
      return {
        valid: false,
        error: `不支持的音频格式: ${ext}，支持的格式: ${config.audio.allowedFormats.join(', ')}`,
      };
    }

    if (file.size > config.audio.maxFileSize) {
      const maxMB = config.audio.maxFileSize / 1024 / 1024;
      const fileMB = file.size / 1024 / 1024;
      return {
        valid: false,
        error: `文件过大: ${fileMB.toFixed(2)}MB，最大支持: ${maxMB}MB`,
      };
    }

    if (file.size < 1024) {
      return {
        valid: false,
        error: '文件过小，可能损坏',
      };
    }

    const duration = await this.estimateDuration(file.buffer, ext);

    logger.info(`Audio validation: format=${ext}, size=${file.size}, duration=${duration.toFixed(2)}s`);

    return {
      valid: true,
      format: ext,
      duration,
    };
  }

  async estimateDuration(buffer: Buffer, format: string): Promise<number> {
    if (format === 'wav') {
      if (buffer.length >= 44) {
        const sampleRate = buffer.readUInt32LE(24);
        const bitsPerSample = buffer.readUInt16LE(34);
        const dataSize = buffer.readUInt32LE(40);
        const byteRate = sampleRate * (bitsPerSample / 8);
        return dataSize / byteRate;
      }
    }

    const estimatedDuration = buffer.length / 32000;
    return Math.max(estimatedDuration, 1);
  }

  async splitAudio(
    buffer: Buffer,
    format: string,
    chunkDuration: number = config.audio.chunkDuration
  ): Promise<{ index: number; buffer: Buffer; startTime: number; endTime: number }[]> {
    logger.info(`Splitting audio: format=${format}, totalSize=${buffer.length}, chunkDuration=${chunkDuration}s`);

    const totalDuration = await this.estimateDuration(buffer, format);
    const bytesPerSecond = buffer.length / totalDuration;
    const chunkSize = Math.floor(bytesPerSecond * chunkDuration);

    const chunks: { index: number; buffer: Buffer; startTime: number; endTime: number }[] = [];
    let offset = 0;
    let index = 0;
    let currentTime = 0;

    while (offset < buffer.length) {
      const end = Math.min(offset + chunkSize, buffer.length);
      const chunkBuffer = buffer.slice(offset, end);
      const chunkDurationActual = (end - offset) / bytesPerSecond;

      chunks.push({
        index,
        buffer: chunkBuffer,
        startTime: currentTime,
        endTime: currentTime + chunkDurationActual,
      });

      offset = end;
      currentTime += chunkDurationActual;
      index++;
    }

    logger.info(`Audio split complete: ${chunks.length} chunks`);
    return chunks;
  }

  async convertFormat(
    inputBuffer: Buffer,
    inputFormat: string,
    outputFormat: string = 'wav',
    sampleRate: number = config.audio.sampleRate
  ): Promise<Buffer> {
    logger.info(`Converting audio: ${inputFormat} -> ${outputFormat}, sampleRate=${sampleRate}`);

    if (inputFormat === outputFormat) {
      logger.info('Same format, skipping conversion');
      return inputBuffer;
    }

    await this.simulateProcessing(500);

    return inputBuffer;
  }

  async saveAudioToCache(audioData: Buffer, taskId: string, segmentId?: string): Promise<string> {
    const filename = segmentId ? `${taskId}_${segmentId}.wav` : `${taskId}.wav`;
    const filePath = path.join('data/cache', filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, audioData);

    logger.info(`Audio saved to cache: ${filePath}`);
    return `/api/v1/audio/${taskId}${segmentId ? `/${segmentId}` : ''}`;
  }

  async getAudioFromCache(taskId: string, segmentId?: string): Promise<Buffer | null> {
    const filename = segmentId ? `${taskId}_${segmentId}.wav` : `${taskId}.wav`;
    const filePath = path.join('data/cache', filename);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      logger.warn(`Audio not found in cache: ${filePath}`);
      return null;
    }
  }

  async mergeAudioChunks(chunks: Buffer[]): Promise<Buffer> {
    logger.info(`Merging ${chunks.length} audio chunks`);

    await this.simulateProcessing(300);

    return Buffer.concat(chunks);
  }

  async extractAudioFeatures(buffer: Buffer): Promise<{
    rms: number;
    peak: number;
    duration: number;
    sampleRate: number;
  }> {
    let rms = 0;
    let peak = 0;
    const sampleCount = Math.floor(buffer.length / 2);

    for (let i = 0; i < sampleCount; i += 100) {
      const sample = buffer.readInt16LE(i * 2) / 32768;
      rms += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }

    rms = Math.sqrt(rms / (sampleCount / 100));
    const duration = buffer.length / 32000;

    return {
      rms,
      peak,
      duration,
      sampleRate: config.audio.sampleRate,
    };
  }

  async generateWaveformData(buffer: Buffer, points: number = 100): Promise<number[]> {
    const waveform: number[] = [];
    const samplesPerPoint = Math.floor(buffer.length / 2 / points);

    for (let i = 0; i < points; i++) {
      let sum = 0;
      const start = i * samplesPerPoint * 2;
      const end = Math.min(start + samplesPerPoint * 2, buffer.length);

      for (let j = start; j < end; j += 2) {
        const sample = buffer.readInt16LE(j) / 32768;
        sum += Math.abs(sample);
      }

      const avg = end > start ? sum / ((end - start) / 2) : 0;
      waveform.push(avg);
    }

    return waveform;
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new AudioProcessService();
