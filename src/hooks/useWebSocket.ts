import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import useAppStore from '../store/index.js';
import { SynthesisParams } from '../../shared/types.js';

const WS_URL = 'http://localhost:8687';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const oldClientIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);

  const {
    isConnected,
    networkStatus,
    setConnected,
    setNetworkStatus,
    setCurrentTaskId,
    addResult,
    addPendingResult,
    updateTask,
    addTask,
    showNotification,
    sourceLanguage,
    targetLanguage,
    sourceDialect,
    params,
  } = useAppStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('WebSocket connected:', socket.id);
        setConnected(true);
        setNetworkStatus('online');
        reconnectAttemptsRef.current = 0;

        if (oldClientIdRef.current) {
          socket.emit('reconnect', oldClientIdRef.current);
        }
      });

      socket.on('connected', (data: any) => {
        console.log('Server acknowledged connection:', data);
      });

      socket.on('session_started', (data: any) => {
        console.log('Session started:', data);
        setCurrentTaskId(data.taskId);
        sequenceRef.current = 0;
        showNotification('info', '会话已开始，可以开始说话');
      });

      socket.on('chunk_received', (data: any) => {
      });

      socket.on('text_result', (data: any) => {
        console.log('Text result:', data);
        addResult({
          source: data.source,
          target: data.target,
          startTime: data.startTime,
          endTime: data.endTime,
          audio: data.audio,
          audioUrl: data.audioUrl,
          segmentId: data.segmentId,
        });

        if (data.audio) {
          playAudioChunk(data.audio);
        }
      });

      socket.on('session_ended', (data: any) => {
        console.log('Session ended:', data);
        setCurrentTaskId(undefined);
        showNotification('success', '翻译完成');
      });

      socket.on('recording_paused', (data: any) => {
        console.log('Recording paused:', data);
      });

      socket.on('recording_resumed', (data: any) => {
        console.log('Recording resumed:', data);
      });

      socket.on('segment_complete', (data: any) => {
        console.log('Segment complete:', data);
      });

      socket.on('task_complete', (data: any) => {
        console.log('Task complete:', data);
        showNotification('success', '任务已完成');
      });

      socket.on('task_failed', (data: any) => {
        console.error('Task failed:', data);
        showNotification('error', `任务失败: ${data.error || '未知错误'}`);
      });

      socket.on('reconnected', (data: any) => {
        console.log('Reconnected:', data);
        oldClientIdRef.current = null;
        setNetworkStatus('online');
        showNotification('info', '已恢复连接');
      });

      socket.on('reconnect_failed', (data: any) => {
        console.error('Reconnect failed:', data);
        showNotification('error', data.message || '重连失败，请重新开始');
      });

      socket.on('state_restore', (data: any) => {
        console.log('State restored:', data);
        if (data.task) {
          updateTask(data.task);
          data.segments.forEach((segment: any) => {
            if (segment.status === 'completed') {
              addResult({
                source: segment.sourceText,
                target: segment.targetText,
                startTime: segment.startTime,
                endTime: segment.endTime,
                audioUrl: segment.audioChunk,
                segmentId: segment.id,
              });
            }
          });
        }
      });

      socket.on('pong', (data: any) => {
      });

      socket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        showNotification('error', error.message || '连接错误');
      });

      socket.on('disconnect', (reason: string) => {
        console.log('WebSocket disconnected:', reason);
        setConnected(false);
        setNetworkStatus('offline');

        if (reason === 'io client disconnect') {
          oldClientIdRef.current = socket.id;
          setNetworkStatus('reconnecting');
        }
      });

      socket.on('reconnect', (attemptNumber: number) => {
        console.log('Reconnect attempt:', attemptNumber);
        setNetworkStatus('reconnecting');
        reconnectAttemptsRef.current = attemptNumber;
      });

      socket.on('reconnect_error', (error: any) => {
        console.error('Reconnect error:', error);
        setNetworkStatus('reconnecting');
      });

      socket.on('reconnect_failed', () => {
        console.error('All reconnection attempts failed');
        setNetworkStatus('offline');
        showNotification('error', '无法连接到服务器，请检查网络');
      });

      return socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setNetworkStatus('offline');
      return null;
    }
  }, [setConnected, setNetworkStatus, setCurrentTaskId, addResult, addPendingResult, updateTask, addTask, showNotification]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      oldClientIdRef.current = socketRef.current.id;
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
  }, []);

  const startSession = useCallback((
    customSourceLanguage?: string,
    customTargetLanguage?: string,
    customDialect?: string,
    customParams?: SynthesisParams
  ) => {
    if (!socketRef.current?.connected) {
      showNotification('error', '未连接到服务器');
      return false;
    }

    socketRef.current.emit('start_session', {
      sourceLanguage: customSourceLanguage || sourceLanguage,
      targetLanguage: customTargetLanguage || targetLanguage,
      sourceDialect: customDialect || sourceDialect,
      params: customParams || params,
    });

    return true;
  }, [socketRef, sourceLanguage, targetLanguage, sourceDialect, params, showNotification]);

  const sendAudioChunk = useCallback((audioBlob: Blob) => {
    if (!socketRef.current?.connected) return false;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = (reader.result as string).split(',')[1];
      sequenceRef.current++;

      socketRef.current?.emit('audio_chunk', {
        audio: base64Audio,
        sequence: sequenceRef.current,
        timestamp: Date.now(),
      });
    };
    reader.readAsDataURL(audioBlob);

    return true;
  }, []);

  const endRecording = useCallback(() => {
    if (!socketRef.current?.connected) return false;

    socketRef.current.emit('end_recording');
    return true;
  }, []);

  const pauseRecording = useCallback(() => {
    if (!socketRef.current?.connected) return false;

    socketRef.current.emit('pause_recording');
    return true;
  }, []);

  const resumeRecording = useCallback(() => {
    if (!socketRef.current?.connected) return false;

    socketRef.current.emit('resume_recording');
    return true;
  }, []);

  const sendPing = useCallback(() => {
    if (!socketRef.current?.connected) return false;

    socketRef.current.emit('ping');
    return true;
  }, []);

  const playAudioChunk = useCallback((base64Audio: string) => {
    try {
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
      });

      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
    }
  }, []);

  useEffect(() => {
    const socket = connect();

    const onlineHandler = () => {
      setNetworkStatus('online');
      if (socket && !socket.connected) {
        socket.connect();
      }
    };

    const offlineHandler = () => {
      setNetworkStatus('offline');
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connect, setNetworkStatus]);

  return {
    connect,
    disconnect,
    startSession,
    sendAudioChunk,
    endRecording,
    pauseRecording,
    resumeRecording,
    sendPing,
    playAudioChunk,
    isConnected,
    networkStatus,
    socket: socketRef.current,
  };
};

export default useWebSocket;
