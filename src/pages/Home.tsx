import { useState } from 'react';
import { Mic, Upload, ListTodo, Menu, X, Languages, Bell, Settings } from 'lucide-react';
import Waveform from '../components/Waveform.js';
import RecorderControl from '../components/RecorderControl.js';
import AudioUploader from '../components/AudioUploader.js';
import LanguageSelector from '../components/LanguageSelector.js';
import ParamsPanel from '../components/ParamsPanel.js';
import ResultDisplay from '../components/ResultDisplay.js';
import TaskPanel from '../components/TaskPanel.js';
import useAppStore from '../store/index.js';

export default function Home() {
  const { activeTab, setActiveTab, showLeftPanel, showRightPanel, toggleLeftPanel, toggleRightPanel, notification, clearNotification } = useAppStore();

  const tabs = [
    { id: 'record', label: '实时录音', icon: Mic },
    { id: 'upload', label: '文件上传', icon: Upload },
    { id: 'tasks', label: '任务队列', icon: ListTodo },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleLeftPanel}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Languages className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    语音翻译助手
                  </h1>
                  <p className="text-xs text-slate-500">Voice Translation Assistant</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleRightPanel}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors relative">
                <Bell className="w-5 h-5" />
                {notification && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {notification && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border animate-slide-in ${
          notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/30' :
          notification.type === 'error' ? 'bg-red-500/90 border-red-400/30' :
          'bg-blue-500/90 border-blue-400/30'
        }`}>
          <p className="text-white text-sm font-medium">{notification.message}</p>
          <button
            onClick={clearNotification}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="relative z-10 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-120px)]">
          <div className={`lg:col-span-3 ${showLeftPanel ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-6 space-y-6">
              <LanguageSelector />
              <ParamsPanel />
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="flex gap-2 p-1 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-white/10">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'record' | 'upload' | 'tasks')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <Waveform height={140} />

            {activeTab === 'record' && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10">
                <RecorderControl />
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl border border-white/10">
                <AudioUploader />
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="h-[600px]">
                <TaskPanel />
              </div>
            )}

            {activeTab !== 'tasks' && (
              <div className="h-[400px]">
                <ResultDisplay />
              </div>
            )}
          </div>

          <div className={`lg:col-span-3 ${showRightPanel ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-6">
              <div className="h-[600px]">
                {activeTab === 'tasks' ? (
                  <ResultDisplay />
                ) : (
                  <TaskPanel />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 backdrop-blur-xl bg-slate-900/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2025 语音翻译助手 · 支持 36+ 语言 · 8 种方言 · 4 种情绪合成
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>端口: 8687</span>
              <span>·</span>
              <span>分布式异步队列</span>
              <span>·</span>
              <span>安全加密传输</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
