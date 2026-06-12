import { useState } from 'react';
import { Volume2, Gauge, Music, User, Sparkles, Settings, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import useAppStore from '../store/index.js';
import { EMOTIONS, VOICES, EmotionType } from '../../shared/types.js';

export const ParamsPanel = () => {
  const { params, setParams, setEmotion, targetLanguage, showNotification } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const availableVoices = VOICES.filter((voice) => voice.language === targetLanguage);

  const handleReset = () => {
    setParams({
      emotion: 'neutral',
      speed: 1.0,
      volume: 80,
      pitch: 1.0,
      voiceId: availableVoices[0]?.id || 'zh-female-1',
    });
    showNotification('info', '参数已重置为默认值');
  };

  const getEmotionColor = (emotion: EmotionType): string => {
    const colors = {
      joy: 'from-yellow-400 to-orange-500',
      anger: 'from-red-500 to-rose-600',
      sadness: 'from-blue-400 to-indigo-500',
      neutral: 'from-slate-400 to-slate-500',
    };
    return colors[emotion];
  };

  const getEmotionBg = (emotion: EmotionType): string => {
    const colors = {
      joy: 'bg-yellow-500/20 border-yellow-500/30',
      anger: 'bg-red-500/20 border-red-500/30',
      sadness: 'bg-blue-500/20 border-blue-500/30',
      neutral: 'bg-slate-500/20 border-slate-500/30',
    };
    return colors[emotion];
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">合成参数</h3>
            <p className="text-sm text-slate-400">自定义音色、情绪和语调</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            title="重置参数"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-6">
          <div>
            <label className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              情绪语调
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EMOTIONS.map((emotion) => (
                <button
                  key={emotion.value}
                  onClick={() => setEmotion(emotion.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-300 ${
                    params.emotion === emotion.value
                      ? `${getEmotionBg(emotion.value)} scale-[1.02]`
                      : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-2xl">{emotion.icon}</span>
                  <span
                    className={`text-xs font-medium ${
                      params.emotion === emotion.value
                        ? `bg-gradient-to-r ${getEmotionColor(emotion.value)} bg-clip-text text-transparent`
                        : 'text-slate-400'
                    }`}
                  >
                    {emotion.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between mb-3 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                音色选择
              </span>
              <span className="text-xs text-slate-500">
                {availableVoices.length} 个可用音色
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableVoices.length > 0 ? (
                availableVoices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setParams({ voiceId: voice.id })}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                      params.voiceId === voice.id
                        ? 'bg-blue-500/20 border-blue-500/30'
                        : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        voice.gender === 'female'
                          ? 'bg-pink-500/20 text-pink-400'
                          : voice.gender === 'male'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {voice.name[0]}
                    </div>
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${
                          params.voiceId === voice.id ? 'text-blue-400' : 'text-white'
                        }`}
                      >
                        {voice.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {voice.gender === 'female' ? '女声' : voice.gender === 'male' ? '男声' : '中性'}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 p-4 text-center text-sm text-slate-500">
                  当前目标语言暂无可选音色，使用默认音色
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between mb-3 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                语速
              </span>
              <span className="text-sm font-mono text-emerald-400">{params.speed.toFixed(1)}x</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={params.speed}
                onChange={(e) => setParams({ speed: parseFloat(e.target.value) })}
                className="w-full h-2 rounded-full bg-slate-700/50 appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between mb-3 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                音量
              </span>
              <span className="text-sm font-mono text-amber-400">{params.volume}%</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={params.volume}
                onChange={(e) => setParams({ volume: parseInt(e.target.value) })}
                className="w-full h-2 rounded-full bg-slate-700/50 appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between mb-3 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <Music className="w-4 h-4 text-rose-400" />
                音调
              </span>
              <span className="text-sm font-mono text-rose-400">{params.pitch.toFixed(1)}x</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={params.pitch}
                onChange={(e) => setParams({ pitch: parseFloat(e.target.value) })}
                className="w-full h-2 rounded-full bg-slate-700/50 appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParamsPanel;
