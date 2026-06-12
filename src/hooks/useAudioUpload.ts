import { useCallback, useRef } from 'react';
import useAppStore from '../store/index.js';
import { SynthesisParams } from '../../shared/types.js';

const API_URL = 'http://localhost:8687/api/v1';

export const useAudioUpload = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    setProcessing,
    setUploadProgress,
    showNotification,
    addTask,
    sourceLanguage,
    targetLanguage,
    sourceDialect,
    params,
  } = useAppStore();

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const maxSize = 100 * 1024 * 1024;
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/ogg', 'audio/x-m4a', 'audio/x-wav'];
    const allowedExtensions = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'];

    if (file.size > maxSize) {
      return { valid: false, error: '文件大小不能超过100MB' };
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext) && !allowedTypes.includes(file.type)) {
      return { valid: false, error: '不支持的音频格式，请上传MP3、WAV、FLAC、AAC、M4A或OGG格式' };
    }

    if (file.size < 1024) {
      return { valid: false, error: '文件过小，可能已损坏' };
    }

    return { valid: true };
  }, []);

  const uploadAudio = useCallback(async (
    file: File,
    customSourceLanguage?: string,
    customTargetLanguage?: string,
    customDialect?: string,
    customParams?: SynthesisParams
  ): Promise<string | null> => {
    const validation = validateFile(file);
    if (!validation.valid) {
      showNotification('error', validation.error || '文件验证失败');
      return null;
    }

    setProcessing(true);
    setUploadProgress(0);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceLanguage', customSourceLanguage || sourceLanguage);
      formData.append('targetLanguage', customTargetLanguage || targetLanguage);
      if (customDialect || sourceDialect) {
        formData.append('sourceDialect', customDialect || sourceDialect || '');
      }
      formData.append('params', JSON.stringify(customParams || params));

      const response = await fetch(`${API_URL}/translate/upload`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `上传失败 (${response.status})`);
      }

      const result = await response.json();

      if (result.code === 0 && result.data) {
        showNotification('success', '文件已上传，正在处理中');

        const task = {
          id: result.data.taskId,
          type: 'upload' as const,
          sourceLanguage: customSourceLanguage || sourceLanguage,
          targetLanguage: customTargetLanguage || targetLanguage,
          sourceDialect: customDialect || sourceDialect,
          status: result.data.status,
          priority: result.data.priority,
          progress: 0,
          params: customParams || params,
          segments: [],
          createdAt: Date.now(),
          retryCount: 0,
          checkpointIndex: 0,
        };

        addTask(task);
        setUploadProgress(100);

        return result.data.taskId;
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showNotification('info', '上传已取消');
      } else {
        console.error('Upload failed:', error);
        showNotification('error', error.message || '上传失败');
      }
      return null;
    } finally {
      setProcessing(false);
      setUploadProgress(0);
    }
  }, [validateFile, setProcessing, setUploadProgress, showNotification, addTask, sourceLanguage, targetLanguage, sourceDialect, params]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`);
      const result = await response.json();

      if (result.code === 0 && result.data) {
        useAppStore.getState().setTasks(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, []);

  const getTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`);
      const result = await response.json();

      if (result.code === 0 && result.data) {
        useAppStore.getState().updateTask(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get task status:', error);
      return null;
    }
  }, []);

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.code === 0) {
        useAppStore.getState().updateTask({
          ...useAppStore.getState().tasks.find((t) => t.id === taskId)!,
          status: 'cancelled',
        });
        showNotification('info', '任务已取消');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cancel task:', error);
      showNotification('error', '取消失败');
      return false;
    }
  }, [showNotification]);

  const retryTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/retry`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.code === 0) {
        showNotification('info', '任务已重新提交');
        fetchTasks();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to retry task:', error);
      showNotification('error', '重试失败');
      return false;
    }
  }, [showNotification, fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/delete`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.code === 0) {
        useAppStore.getState().removeTask(taskId);
        showNotification('info', '任务已删除');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete task:', error);
      showNotification('error', '删除失败');
      return false;
    }
  }, [showNotification]);

  const updateTaskPriority = useCallback(async (taskId: string, priority: number) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/priority`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });
      const result = await response.json();

      if (result.code === 0) {
        const task = useAppStore.getState().tasks.find((t) => t.id === taskId);
        if (task) {
          useAppStore.getState().updateTask({ ...task, priority });
        }
        showNotification('info', '优先级已更新');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update priority:', error);
      showNotification('error', '更新失败');
      return false;
    }
  }, [showNotification]);

  const previewVoice = useCallback(async (
    text: string,
    language: string,
    customParams?: SynthesisParams
  ): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/translate/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language,
          params: customParams || params,
        }),
      });

      const result = await response.json();

      if (result.code === 0 && result.data) {
        return result.data.audioUrl;
      }
      return null;
    } catch (error) {
      console.error('Failed to preview voice:', error);
      showNotification('error', '预览失败');
      return null;
    }
  }, [params, showNotification]);

  return {
    validateFile,
    uploadAudio,
    cancelUpload,
    fetchTasks,
    getTaskStatus,
    cancelTask,
    retryTask,
    deleteTask,
    updateTaskPriority,
    previewVoice,
  };
};

export default useAudioUpload;
