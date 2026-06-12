import logger from '../utils/logger.js';
import { SynthesisParams, EmotionType } from '../../shared/types.js';

const EMOTION_VOICE_MODIFIERS: Record<EmotionType, { pitch: number; speed: number; volume: number }> = {
  joy: { pitch: 1.2, speed: 1.1, volume: 1.1 },
  anger: { pitch: 0.9, speed: 1.2, volume: 1.3 },
  sadness: { pitch: 0.85, speed: 0.85, volume: 0.7 },
  neutral: { pitch: 1.0, speed: 1.0, volume: 1.0 },
};

export class TTSService {
  async synthesize(
    text: string,
    language: string,
    params: SynthesisParams
  ): Promise<{ audio: Buffer; duration: number }> {
    logger.info(`TTS: Synthesizing text="${text}", language=${language}, voice=${params.voiceId}, emotion=${params.emotion}`);

    const effectiveParams = this.applyEmotionModifier(params);

    logger.info(`TTS: Effective params - speed=${effectiveParams.speed.toFixed(2)}, volume=${effectiveParams.volume}, pitch=${effectiveParams.pitch.toFixed(2)}`);

    await this.simulateProcessing(800 + Math.random() * 1200);

    const audio = this.generateMockAudio(text, effectiveParams);
    const duration = (text.length / 5) * (1 / effectiveParams.speed);

    logger.info(`TTS: Synthesis complete, duration=${duration.toFixed(2)}s, audio size=${audio.length} bytes`);

    return { audio, duration };
  }

  async *synthesizeStream(
    textStream: AsyncGenerator<{ text: string; isFinal: boolean; startTime: number; endTime: number }>,
    language: string,
    params: SynthesisParams
  ): AsyncGenerator<{ audio: Buffer; startTime: number; endTime: number; text: string }> {
    const effectiveParams = this.applyEmotionModifier(params);

    for await (const chunk of textStream) {
      if (chunk.isFinal && chunk.text) {
        const { audio } = await this.synthesize(chunk.text, language, params);
        yield {
          audio,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          text: chunk.text,
        };
      }
    }
  }

  private applyEmotionModifier(params: SynthesisParams): SynthesisParams {
    const modifier = EMOTION_VOICE_MODIFIERS[params.emotion];
    if (!modifier) return params;

    return {
      ...params,
      speed: Math.max(0.5, Math.min(2.0, params.speed * modifier.speed)),
      volume: Math.max(0, Math.min(100, Math.round(params.volume * modifier.volume))),
      pitch: Math.max(0.5, Math.min(2.0, params.pitch * modifier.pitch)),
    };
  }

  private generateMockAudio(text: string, params: SynthesisParams): Buffer {
    const sampleRate = 16000;
    const duration = (text.length / 5) * (1 / params.speed);
    const totalSamples = Math.floor(sampleRate * duration);

    const buffer = Buffer.alloc(totalSamples * 2);
    const amplitude = (params.volume / 100) * 0.5;
    const frequency = 200 + params.pitch * 100;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude;

      const noise = (Math.random() - 0.5) * 0.02;
      const finalSample = (sample + noise) * 32767;

      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(finalSample))), i * 2);
    }

    const wavHeader = this.createWavHeader(totalSamples * 2, sampleRate);
    return Buffer.concat([wavHeader, buffer]);
  }

  private createWavHeader(dataSize: number, sampleRate: number): Buffer {
    const buffer = Buffer.alloc(44);
    const byteRate = sampleRate * 2;
    const blockAlign = 2;

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
  }

  async getAvailableVoices(language?: string): Promise<{ id: string; name: string; gender: string; language: string; emotionSupport: string[] }[]> {
    const { VOICES } = await import('../../shared/types.js');
    if (language) {
      return VOICES.filter((v) => v.language.startsWith(language.split('-')[0]));
    }
    return VOICES;
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new TTSService();
