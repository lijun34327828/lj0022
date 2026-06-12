export type EmotionType = 'joy' | 'anger' | 'sadness' | 'neutral';

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type SegmentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Language {
  code: string;
  name: string;
  dialect?: string;
  type: 'standard' | 'dialect';
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  emotionSupport: EmotionType[];
}

export interface SynthesisParams {
  emotion: EmotionType;
  speed: number;
  volume: number;
  pitch: number;
  voiceId: string;
}

export interface TranslationSegment {
  id: string;
  taskId: string;
  startTime: number;
  endTime: number;
  sourceText: string;
  targetText: string;
  audioChunk?: string;
  status: SegmentStatus;
  sequence: number;
}

export interface TranslationTask {
  id: string;
  type: 'realtime' | 'upload';
  sourceLanguage: string;
  targetLanguage: string;
  sourceDialect?: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  params: SynthesisParams;
  audioUrl?: string;
  sourceText?: string;
  targetText?: string;
  segments: TranslationSegment[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  checkpointIndex: number;
}

export interface WSMessage {
  type: 'audio_chunk' | 'text_result' | 'status' | 'error' | 'complete' | 'ping' | 'pong';
  data: any;
  taskId?: string;
  sequence?: number;
  timestamp: number;
}

export interface FilterResult {
  passed: boolean;
  level: 'safe' | 'warning' | 'dangerous';
  reason?: string;
  blocked: boolean;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

export interface TaskCreateResponse {
  taskId: string;
  status: TaskStatus;
  priority: number;
  estimatedTime: number;
}

export const LANGUAGES: Language[] = [
  { code: 'zh-CN', name: '中文(普通话)', type: 'standard' },
  { code: 'zh-CN-yue', name: '粤语', dialect: 'yue', type: 'dialect' },
  { code: 'zh-CN-wuu', name: '上海话', dialect: 'wuu', type: 'dialect' },
  { code: 'zh-CN-hakka', name: '客家话', dialect: 'hakka', type: 'dialect' },
  { code: 'zh-CN-min', name: '闽南语', dialect: 'min', type: 'dialect' },
  { code: 'zh-CN-sichuan', name: '四川话', dialect: 'sichuan', type: 'dialect' },
  { code: 'zh-CN-henan', name: '河南话', dialect: 'henan', type: 'dialect' },
  { code: 'zh-CN-shanxi', name: '陕西话', dialect: 'shanxi', type: 'dialect' },
  { code: 'en-US', name: '英语(美国)', type: 'standard' },
  { code: 'en-GB', name: '英语(英国)', type: 'standard' },
  { code: 'ja-JP', name: '日语', type: 'standard' },
  { code: 'ko-KR', name: '韩语', type: 'standard' },
  { code: 'fr-FR', name: '法语', type: 'standard' },
  { code: 'de-DE', name: '德语', type: 'standard' },
  { code: 'es-ES', name: '西班牙语', type: 'standard' },
  { code: 'it-IT', name: '意大利语', type: 'standard' },
  { code: 'pt-BR', name: '葡萄牙语', type: 'standard' },
  { code: 'ru-RU', name: '俄语', type: 'standard' },
  { code: 'ar-SA', name: '阿拉伯语', type: 'standard' },
  { code: 'hi-IN', name: '印地语', type: 'standard' },
  { code: 'th-TH', name: '泰语', type: 'standard' },
  { code: 'vi-VN', name: '越南语', type: 'standard' },
  { code: 'id-ID', name: '印尼语', type: 'standard' },
  { code: 'ms-MY', name: '马来语', type: 'standard' },
  { code: 'tr-TR', name: '土耳其语', type: 'standard' },
  { code: 'pl-PL', name: '波兰语', type: 'standard' },
  { code: 'nl-NL', name: '荷兰语', type: 'standard' },
  { code: 'sv-SE', name: '瑞典语', type: 'standard' },
  { code: 'da-DK', name: '丹麦语', type: 'standard' },
  { code: 'no-NO', name: '挪威语', type: 'standard' },
  { code: 'fi-FI', name: '芬兰语', type: 'standard' },
  { code: 'cs-CZ', name: '捷克语', type: 'standard' },
  { code: 'hu-HU', name: '匈牙利语', type: 'standard' },
  { code: 'ro-RO', name: '罗马尼亚语', type: 'standard' },
  { code: 'el-GR', name: '希腊语', type: 'standard' },
  { code: 'he-IL', name: '希伯来语', type: 'standard' },
  { code: 'th-TH', name: '泰语', type: 'standard' },
];

export const VOICES: Voice[] = [
  { id: 'zh-female-1', name: '晓美', gender: 'female', language: 'zh-CN', emotionSupport: ['joy', 'anger', 'sadness', 'neutral'] },
  { id: 'zh-female-2', name: '晓晓', gender: 'female', language: 'zh-CN', emotionSupport: ['joy', 'sadness', 'neutral'] },
  { id: 'zh-male-1', name: '晓军', gender: 'male', language: 'zh-CN', emotionSupport: ['joy', 'anger', 'sadness', 'neutral'] },
  { id: 'zh-male-2', name: '晓明', gender: 'male', language: 'zh-CN', emotionSupport: ['neutral'] },
  { id: 'zh-neutral-1', name: '晓晓童', gender: 'neutral', language: 'zh-CN', emotionSupport: ['joy', 'neutral'] },
  { id: 'en-female-1', name: 'Jenny', gender: 'female', language: 'en-US', emotionSupport: ['joy', 'anger', 'sadness', 'neutral'] },
  { id: 'en-female-2', name: 'Lisa', gender: 'female', language: 'en-US', emotionSupport: ['joy', 'neutral'] },
  { id: 'en-male-1', name: 'Mike', gender: 'male', language: 'en-US', emotionSupport: ['joy', 'anger', 'sadness', 'neutral'] },
  { id: 'en-male-2', name: 'David', gender: 'male', language: 'en-GB', emotionSupport: ['neutral'] },
  { id: 'ja-female-1', name: 'Sakura', gender: 'female', language: 'ja-JP', emotionSupport: ['joy', 'anger', 'sadness', 'neutral'] },
  { id: 'ja-male-1', name: 'Taro', gender: 'male', language: 'ja-JP', emotionSupport: ['neutral'] },
  { id: 'ko-female-1', name: 'Ji-Yeon', gender: 'female', language: 'ko-KR', emotionSupport: ['joy', 'sadness', 'neutral'] },
  { id: 'ko-male-1', name: 'Min-Ho', gender: 'male', language: 'ko-KR', emotionSupport: ['neutral'] },
];

export const EMOTIONS: { value: EmotionType; label: string; icon: string }[] = [
  { value: 'joy', label: '喜悦', icon: '😊' },
  { value: 'anger', label: '愤怒', icon: '😠' },
  { value: 'sadness', label: '悲伤', icon: '😢' },
  { value: 'neutral', label: '平淡', icon: '😐' },
];
