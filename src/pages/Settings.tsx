import { useState } from 'react';
import { ArrowLeft, Settings as SettingsIcon, Volume2, Globe, Shield, HardDrive, Bell, Palette, Save, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/index.js';

export default function Settings() {
  const navigate = useNavigate();
  const { params, setParams, showNotification } = useAppStore();
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState('dark');

  const handleSave = () => {
    showNotification('success', '设置已保存');
  };

  const handleReset = () => {
    if (confirm('确定要重置所有设置吗？')) {
      setParams({
        emotion: 'neutral',
        speed: 1.0,
        volume: 80,
        pitch: 1.0,
        voiceId: 'zh-female-1',
      });
      setAutoPlay(true);
      setAutoSave(true);
      setNotifications(true);
      setTheme('dark');
      showNotification('info', '设置已重置为默认值');
    }
  };

  const sections = [
    {
      id: 'audio',
      title: '音频设置',
      icon: Volume2,
      items: [
        {
          label: '自动播放翻译结果',
          description: '翻译完成后自动播放合成语音',
          value: autoPlay,
          onChange: setAutoPlay,
        },
        {
          label: '自动保存历史记录',
          description: '自动保存翻译记录到本地',
          value: autoSave,
          onChange: setAutoSave,
        },
      ],
    },
    {
      id: 'language',
      title: '语言设置',
      icon: Globe,
      items: [
        {
          label: '默认源语言',
          description: '新建任务时默认使用的源语言',
          value: '中文(普通话)',
          type: 'info',
        },
        {
          label: '默认目标语言',
          description: '新建任务时默认使用的目标语言',
          value: '英语(美国)',
          type: 'info',
        },
      ],
    },
    {
      id: 'security',
      title: '安全设置',
      icon: Shield,
      items: [
        {
          label: '敏感内容过滤',
          description: '自动过滤敏感语音内容',
          value: true,
          disabled: true,
        },
        {
          label: '恶意音频拦截',
          description: '拦截包含恶意特征的音频文件',
          value: true,
          disabled: true,
        },
      ],
    },
    {
      id: 'storage',
      title: '存储设置',
      icon: HardDrive,
      items: [
        {
          label: '缓存大小限制',
          description: '本地音频缓存最大占用空间',
          value: '10 GB',
          type: 'info',
        },
        {
          label: '自动清理缓存',
          description: '定期清理过期的缓存文件',
          value: true,
          disabled: true,
        },
      ],
    },
    {
      id: 'notification',
      title: '通知设置',
      icon: Bell,
      items: [
        {
          label: '任务状态通知',
          description: '任务完成或失败时发送通知',
          value: notifications,
          onChange: setNotifications,
        },
      ],
    },
    {
      id: 'appearance',
      title: '外观设置',
      icon: Palette,
      items: [
        {
          label: '主题模式',
          description: '选择应用的主题风格',
          value: theme,
          options: [
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
            { value: 'system', label: '跟随系统' },
          ],
          onChange: setTheme,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <SettingsIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">系统设置</h1>
                  <p className="text-xs text-slate-500">自定义您的翻译体验</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 transition-all duration-300"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">重置</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-medium transition-all duration-300 shadow-lg shadow-blue-500/30"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">保存</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10 overflow-hidden"
              >
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-white font-medium">{section.title}</h2>
                  </div>
                </div>
                <div className="divide-y divide-white/10">
                  {section.items.map((item, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.label}</p>
                        <p className="text-sm text-slate-400">{item.description}</p>
                      </div>
                      {item.type === 'info' ? (
                        <span className="px-3 py-1 rounded-lg bg-slate-700/50 text-sm text-slate-300">
                          {item.value}
                        </span>
                      ) : item.options ? (
                        <div className="flex gap-2">
                          {item.options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => item.onChange?.(opt.value)}
                              className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                                item.value === opt.value
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'text-slate-400 hover:bg-white/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.value}
                            onChange={(e) => item.onChange?.(e.target.checked)}
                            disabled={item.disabled}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer peer-checked:bg-blue-500 bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                            item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
