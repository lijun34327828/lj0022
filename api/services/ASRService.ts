import logger from '../utils/logger.js';
import { analyzeTextContent } from '../middleware/securityFilter.js';

const MOCK_TRANSLATIONS: Record<string, string[]> = {
  'zh-CN': ['你好世界', '今天天气很好', '欢迎使用语音翻译', '这是一个测试', '人工智能改变生活'],
  'en-US': ['Hello world', 'The weather is nice today', 'Welcome to voice translation', 'This is a test', 'AI changes life'],
  'ja-JP': ['こんにちは世界', '今日は良い天気です', '音声翻訳へようこそ', 'これはテストです', 'AIは生活を変える'],
  'ko-KR': ['안녕하세요 세계', '오늘 날씨가 좋네요', '음성 번역에 오신 것을 환영합니다', '이것은 테스트입니다', 'AI는 삶을 변화시킵니다'],
};

export class ASRService {
  async recognize(audioBuffer: Buffer, language: string, dialect?: string): Promise<{ text: string; confidence: number }> {
    logger.info(`ASR: Processing audio, language=${language}, dialect=${dialect || 'none'}, size=${audioBuffer.length}`);

    await this.simulateProcessing(500 + Math.random() * 1000);

    const mockTexts = MOCK_TRANSLATIONS[language.split('-')[0]] || MOCK_TRANSLATIONS['en-US'];
    const text = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    const confidence = 0.85 + Math.random() * 0.15;

    const filterResult = analyzeTextContent(text);
    if (filterResult.blocked) {
      throw new Error(filterResult.reason || '内容被拒绝');
    }

    logger.info(`ASR: Recognition complete, text="${text}", confidence=${confidence.toFixed(2)}`);

    return { text, confidence };
  }

  async *recognizeStream(audioChunks: AsyncGenerator<Buffer>, language: string, dialect?: string): AsyncGenerator<{ text: string; isFinal: boolean; startTime: number; endTime: number }> {
    let startTime = 0;
    const mockTexts = MOCK_TRANSLATIONS[language.split('-')[0]] || MOCK_TRANSLATIONS['en-US'];
    let textIndex = 0;

    for await (const chunk of audioChunks) {
      await this.simulateProcessing(200);

      const isFinal = Math.random() > 0.6;
      const endTime = startTime + chunk.length / 32000;

      if (isFinal) {
        const text = mockTexts[textIndex % mockTexts.length];
        textIndex++;

        const filterResult = analyzeTextContent(text);
        if (!filterResult.blocked) {
          yield {
            text,
            isFinal: true,
            startTime,
            endTime,
          };
        }
      } else {
        yield {
          text: '',
          isFinal: false,
          startTime,
          endTime,
        };
      }

      startTime = endTime;
    }
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new ASRService();
