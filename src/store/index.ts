import { create } from 'zustand';
import {
  TranslationTask,
  TranslationSegment,
  SynthesisParams,
  EmotionType,
  Language,
  Voice,
  LANGUAGES,
  VOICES,
  EMOTIONS,
} from '../../shared/types.js';

interface TranslateResult {
  source: string;
  target: string;
  startTime: number;
  endTime: number;
  audio?: string;
  audioUrl?: string;
  segmentId?: string;
}

interface AppState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioLevel: number;
  waveformData: number[];
  sourceLanguage: string;
  targetLanguage: string;
  sourceDialect?: string;
  currentTaskId?: string;
  results: TranslateResult[];
  pendingResults: TranslateResult[];
  params: SynthesisParams;
  tasks: TranslationTask[];
  languages: Language[];
  voices: Voice[];
  isConnected: boolean;
  networkStatus: 'online' | 'offline' | 'reconnecting';
  isDragging: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  activeTab: 'record' | 'upload' | 'tasks';
  showRightPanel: boolean;
  showLeftPanel: boolean;
  error?: string;
  notification?: { type: 'success' | 'error' | 'info'; message: string };
  setRecording: (recording: boolean) => void;
  setPaused: (paused: boolean) => void;
  setRecordingTime: (time: number) => void;
  setAudioLevel: (level: number) => void;
  setWaveformData: (data: number[]) => void;
  addWaveformData: (data: number) => void;
  setSourceLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
  setSourceDialect: (dialect?: string) => void;
  swapLanguages: () => void;
  setCurrentTaskId: (id?: string) => void;
  addResult: (result: TranslateResult) => void;
  addPendingResult: (result: TranslateResult) => void;
  clearResults: () => void;
  setParams: (params: Partial<SynthesisParams>) => void;
  setEmotion: (emotion: EmotionType) => void;
  setTasks: (tasks: TranslationTask[]) => void;
  addTask: (task: TranslationTask) => void;
  updateTask: (task: TranslationTask) => void;
  removeTask: (taskId: string) => void;
  setConnected: (connected: boolean) => void;
  setNetworkStatus: (status: 'online' | 'offline' | 'reconnecting') => void;
  setDragging: (dragging: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setActiveTab: (tab: 'record' | 'upload' | 'tasks') => void;
  toggleRightPanel: () => void;
  toggleLeftPanel: () => void;
  setError: (error?: string) => void;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  clearNotification: () => void;
  resetState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isRecording: false,
  isPaused: false,
  recordingTime: 0,
  audioLevel: 0,
  waveformData: [],
  sourceLanguage: 'zh-CN',
  targetLanguage: 'en-US',
  results: [],
  pendingResults: [],
  params: {
    emotion: 'neutral',
    speed: 1.0,
    volume: 80,
    pitch: 1.0,
    voiceId: 'zh-female-1',
  },
  tasks: [],
  languages: LANGUAGES,
  voices: VOICES,
  isConnected: false,
  networkStatus: 'online',
  isDragging: false,
  isProcessing: false,
  uploadProgress: 0,
  activeTab: 'record',
  showRightPanel: true,
  showLeftPanel: true,

  setRecording: (recording) => set({ isRecording: recording }),
  setPaused: (paused) => set({ isPaused: paused }),
  setRecordingTime: (time) => set({ recordingTime: time }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setWaveformData: (data) => set({ waveformData: data }),
  addWaveformData: (data) => {
    const current = get().waveformData;
    const newData = [...current, data].slice(-200);
    set({ waveformData: newData });
  },
  setSourceLanguage: (lang) => set({ sourceLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
  setSourceDialect: (dialect) => set({ sourceDialect: dialect }),
  swapLanguages: () => {
    const { sourceLanguage, targetLanguage } = get();
    set({ sourceLanguage: targetLanguage, targetLanguage: sourceLanguage });
  },
  setCurrentTaskId: (id) => set({ currentTaskId: id }),
  addResult: (result) => {
    set((state) => ({
      results: [...state.results, result],
      pendingResults: state.pendingResults.filter(
        (r) => r.startTime !== result.startTime
      ),
    }));
  },
  addPendingResult: (result) => {
    set((state) => ({
      pendingResults: [...state.pendingResults, result],
    }));
  },
  clearResults: () => set({ results: [], pendingResults: [] }),
  setParams: (newParams) => {
    set((state) => ({
      params: { ...state.params, ...newParams },
    }));
  },
  setEmotion: (emotion) => {
    set((state) => ({
      params: { ...state.params, emotion },
    }));
  },
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => {
    set((state) => ({
      tasks: [task, ...state.tasks],
    }));
  },
  updateTask: (task) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
  },
  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },
  setConnected: (connected) => set({ isConnected: connected }),
  setNetworkStatus: (status) => set({ networkStatus: status }),
  setDragging: (dragging) => set({ isDragging: dragging }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),
  toggleLeftPanel: () => set((state) => ({ showLeftPanel: !state.showLeftPanel })),
  setError: (error) => set({ error }),
  showNotification: (type, message) => set({ notification: { type, message } }),
  clearNotification: () => set({ notification: undefined }),
  resetState: () => {
    set({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      audioLevel: 0,
      waveformData: [],
      results: [],
      pendingResults: [],
      currentTaskId: undefined,
      isProcessing: false,
      uploadProgress: 0,
      error: undefined,
    });
  },
}));

export default useAppStore;
