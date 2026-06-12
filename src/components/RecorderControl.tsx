import { Mic, MicOff, Pause, Play, Square, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import useAppStore from '../store/index.js';
import { useMicrophone } from '../hooks/useMicrophone.js';
import { useWebSocket } from '../hooks/useWebSocket.js';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const RecorderControl = () => {
  const { isRecording, isPaused, recordingTime, audioLevel, networkStatus, isConnected } =
    useAppStore();
  const { startRecording, pauseRecording, resumeRecording, stopRecording } = useMicrophone();
  const { startSession, sendAudioChunk, endRecording, isConnected: wsConnected } = useWebSocket();

  const handleStart = async () => {
    const success = await startRecording();
    if (success) {
      await startSession();
    }
  };

  const handlePause = () => {
    pauseRecording();
  };

  const handleResume = () => {
    resumeRecording();
  };

  const handleStop = () => {
    const audioBlob = stopRecording();
    endRecording();
    if (audioBlob && audioBlob.size > 0) {
      sendAudioChunk(audioBlob);
    }
  };

  const getStatusColor = () => {
    if (!isConnected || networkStatus === 'offline') return 'text-red-500';
    if (networkStatus === 'reconnecting') return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getStatusIcon = () => {
    if (!isConnected || networkStatus === 'offline') return <WifiOff className="w-4 h-4" />;
    if (networkStatus === 'reconnecting') return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">
              {networkStatus === 'offline' && '离线'}
              {networkStatus === 'reconnecting' && '重连中...'}
              {networkStatus === 'online' && wsConnected && '已连接'}
              {networkStatus === 'online' && !wsConnected && '准备就绪'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={handleStart}
            disabled={networkStatus === 'offline'}
            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <Mic className="w-8 h-8 text-white relative z-10" />
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={handleResume}
                className="group flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95"
              >
                <Play className="w-6 h-6 text-white" />
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="group flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95"
              >
                <Pause className="w-6 h-6 text-white" />
              </button>
            )}

            <button
              onClick={handleStop}
              className="group flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 active:scale-95"
            >
              <Square className="w-8 h-8 text-white" />
            </button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
              style={{ opacity: 0.3 + audioLevel * 0.7 }}
            />
            <span className="text-sm text-slate-400">
              {isPaused ? '已暂停' : '录音中'}
            </span>
          </div>
          <div className="w-24 h-2 rounded-full bg-slate-700/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>
      )}

      {!isRecording && (
        <div className="text-center text-sm text-slate-500">
          点击麦克风按钮开始实时语音翻译
        </div>
      )}
    </div>
  );
};

export default RecorderControl;
