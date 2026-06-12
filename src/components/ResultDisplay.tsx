import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Copy, Check, Volume2, Languages, Trash2 } from 'lucide-react';
import useAppStore from '../store/index.js';

interface TranslateResult {
  source: string;
  target: string;
  startTime: number;
  endTime: number;
  audio?: string;
  audioUrl?: string;
  segmentId?: string;
}

export const ResultDisplay = () => {
  const { results, pendingResults, clearResults, sourceLanguage, targetLanguage, showNotification } =
    useAppStore();
  const [playingId, setPlayingId] = useState<string | number | null>(null);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && results.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [results]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = (result: TranslateResult, index: number) => {
    if (!result.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (playingId === index) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(result.audioUrl);
    audioRef.current = audio;

    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      showNotification('error', '音频播放失败');
    };

    audio.play().catch(() => {
      setPlayingId(null);
      showNotification('error', '无法播放音频，请检查浏览器权限');
    });

    setPlayingId(index);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      showNotification('success', '已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showNotification('error', '复制失败');
    }
  };

  const downloadAudio = (result: TranslateResult, index: number) => {
    if (!result.audioUrl) return;

    const link = document.createElement('a');
    link.href = result.audioUrl;
    link.download = `translation_${index}_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', '音频已开始下载');
  };

  const getLanguageName = (code: string): string => {
    const names: Record<string, string> = {
      'zh-CN': '中文',
      'en-US': '英语',
      'ja-JP': '日语',
      'ko-KR': '韩语',
      'fr-FR': '法语',
      'de-DE': '德语',
      'es-ES': '西班牙语',
    };
    return names[code] || code;
  };

  const allResults = [...pendingResults, ...results];

  return (
    <div className="flex flex-col h-full rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Languages className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">翻译结果</h3>
            <p className="text-sm text-slate-400">
              {getLanguageName(sourceLanguage)} → {getLanguageName(targetLanguage)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
            {results.length} 条结果
          </span>
          {results.length > 0 && (
            <button
              onClick={clearResults}
              className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="清除所有结果"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {allResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-600/50 flex items-center justify-center mb-4">
              <Volume2 className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-2">暂无翻译结果</p>
            <p className="text-sm text-slate-500">
              开始录音或上传音频文件以获取翻译
            </p>
          </div>
        ) : (
          allResults.map((result, index) => {
            const isPending = index < pendingResults.length;
            return (
              <div
                key={`${result.startTime}-${index}`}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isPending
                    ? 'bg-slate-700/30 border-slate-600/30 animate-pulse'
                    : 'bg-slate-700/50 border-white/10 hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500 font-mono">
                    {formatTime(result.startTime)} - {formatTime(result.endTime)}
                  </span>
                  {isPending && (
                    <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">
                      处理中...
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-400">
                        {getLanguageName(sourceLanguage)}
                      </span>
                    </div>
                    <p className={`text-white ${isPending ? 'opacity-50' : ''}`}>
                      {result.source || '识别中...'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-purple-400">
                        {getLanguageName(targetLanguage)}
                      </span>
                    </div>
                    <p className={`text-white ${isPending ? 'opacity-50' : ''}`}>
                      {result.target || '翻译中...'}
                    </p>
                  </div>
                </div>

                {!isPending && result.audioUrl && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                    <button
                      onClick={() => playAudio(result, index)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                    >
                      {playingId === index ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        {playingId === index ? '暂停' : '播放'}
                      </span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(result.target, index)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedId === index ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        {copiedId === index ? '已复制' : '复制'}
                      </span>
                    </button>
                    <button
                      onClick={() => downloadAudio(result, index)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">下载</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;
