import logger from '../utils/logger.js';
import { analyzeTextContent } from '../middleware/securityFilter.js';

const MOCK_TRANSLATIONS: Record<string, Record<string, string>> = {
  '你好世界': {
    'en-US': 'Hello World',
    'ja-JP': 'こんにちは世界',
    'ko-KR': '안녕하세요 세계',
    'fr-FR': 'Bonjour le monde',
    'de-DE': 'Hallo Welt',
    'es-ES': 'Hola mundo',
  },
  '今天天气很好': {
    'en-US': 'The weather is nice today',
    'ja-JP': '今日は良い天気です',
    'ko-KR': '오늘 날씨가 좋네요',
    'fr-FR': 'Le temps est beau aujourd\'hui',
    'de-DE': 'Das Wetter ist heute schön',
    'es-ES': 'Hace buen tiempo hoy',
  },
  '欢迎使用语音翻译': {
    'en-US': 'Welcome to voice translation',
    'ja-JP': '音声翻訳へようこそ',
    'ko-KR': '음성 번역에 오신 것을 환영합니다',
    'fr-FR': 'Bienvenue dans la traduction vocale',
    'de-DE': 'Willkommen bei der Sprachübersetzung',
    'es-ES': 'Bienvenido a la traducción de voz',
  },
  '这是一个测试': {
    'en-US': 'This is a test',
    'ja-JP': 'これはテストです',
    'ko-KR': '이것은 테스트입니다',
    'fr-FR': 'Ceci est un test',
    'de-DE': 'Das ist ein Test',
    'es-ES': 'Esto es una prueba',
  },
  '人工智能改变生活': {
    'en-US': 'AI changes life',
    'ja-JP': 'AIは生活を変える',
    'ko-KR': 'AI는 삶을 변화시킵니다',
    'fr-FR': 'L\'IA change la vie',
    'de-DE': 'KI verändert das Leben',
    'es-ES': 'La IA cambia la vida',
  },
  'Hello World': {
    'zh-CN': '你好世界',
    'ja-JP': 'こんにちは世界',
    'ko-KR': '안녕하세요 세계',
  },
  'The weather is nice today': {
    'zh-CN': '今天天气很好',
    'ja-JP': '今日は良い天気です',
    'ko-KR': '오늘 날씨가 좋네요',
  },
};

export class TranslationService {
  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<{ text: string; detectedLanguage?: string }> {
    logger.info(`Translation: "${text}" from ${sourceLanguage} to ${targetLanguage}`);

    const filterResult = analyzeTextContent(text);
    if (filterResult.blocked) {
      throw new Error(filterResult.reason || '内容被拒绝');
    }

    await this.simulateProcessing(300 + Math.random() * 700);

    const translations = MOCK_TRANSLATIONS[text];
    let translatedText = translations?.[targetLanguage];

    if (!translatedText) {
      translatedText = `[${targetLanguage}] ${text}`;
      logger.warn(`No mock translation found, using placeholder: ${translatedText}`);
    }

    logger.info(`Translation result: "${translatedText}"`);

    return {
      text: translatedText,
      detectedLanguage: sourceLanguage,
    };
  }

  async *translateStream(
    textStream: AsyncGenerator<{ text: string; isFinal: boolean; startTime: number; endTime: number }>,
    sourceLanguage: string,
    targetLanguage: string
  ): AsyncGenerator<{ sourceText: string; targetText: string; startTime: number; endTime: number; isFinal: boolean }> {
    for await (const chunk of textStream) {
      if (chunk.isFinal && chunk.text) {
        const result = await this.translate(chunk.text, sourceLanguage, targetLanguage);
        yield {
          sourceText: chunk.text,
          targetText: result.text,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          isFinal: true,
        };
      } else {
        yield {
          sourceText: chunk.text,
          targetText: '',
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          isFinal: false,
        };
      }
    }
  }

  async detectLanguage(text: string): Promise<string> {
    const zhPattern = /[\u4e00-\u9fa5]/;
    const jaPattern = /[\u3040-\u30ff]/;
    const koPattern = /[\uac00-\ud7af]/;

    if (zhPattern.test(text)) return 'zh-CN';
    if (jaPattern.test(text)) return 'ja-JP';
    if (koPattern.test(text)) return 'ko-KR';

    return 'en-US';
  }

  async translateBatch(
    segments: { text: string; startTime: number; endTime: number }[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{ sourceText: string; targetText: string; startTime: number; endTime: number }[]> {
    const results = [];

    for (const segment of segments) {
      const result = await this.translate(segment.text, sourceLanguage, targetLanguage);
      results.push({
        sourceText: segment.text,
        targetText: result.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
      });
    }

    return results;
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new TranslationService();
