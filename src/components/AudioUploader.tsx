import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileAudio, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import useAppStore from '../store/index.js';
import { useAudioUpload } from '../hooks/useAudioUpload.js';

const ALLOWED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/ogg'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const AudioUploader = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isDragging, isProcessing, uploadProgress, sourceLanguage, targetLanguage, params } =
    useAppStore();
  const { setDragging, setProcessing, setUploadProgress, setError: setStoreError, addTask, showNotification } =
    useAppStore();
  const { uploadAudio, cancelUpload } = useAudioUpload();

  const validateFile = (file: File): boolean => {
    setError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidFormat =
      ALLOWED_FORMATS.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);

    if (!isValidFormat) {
      setError('不支持的音频格式，请上传 MP3、WAV、FLAC、AAC、M4A 或 OGG 格式');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('文件过大，最大支持 100MB');
      return false;
    }

    if (file.size < 1024) {
      setError('文件过小，请上传有效的音频文件');
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file);
        setError(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [setDragging, handleFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    [setDragging]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
    },
    [setDragging]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setUploadProgress(0);
    setStoreError(undefined);

    try {
      const taskId = await uploadAudio(selectedFile, sourceLanguage, targetLanguage, undefined, params);

      if (taskId) {
        showNotification('success', '音频上传成功，任务已加入队列');
        handleClearFile();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败，请重试';
      setStoreError(errorMessage);
      showNotification('error', errorMessage);
    } finally {
      setProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    cancelUpload();
    setProcessing(false);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
            : 'border-slate-600/50 bg-slate-800/30 hover:border-slate-500/70 hover:bg-slate-800/50'
        } ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.flac,.aac,.m4a,.ogg,audio/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              <FileAudio className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-4 h-4" />
              更换文件
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium">拖拽音频文件到此处</p>
              <p className="text-sm text-slate-400">或点击选择文件</p>
            </div>
            <p className="text-xs text-slate-500">
              支持 MP3、WAV、FLAC、AAC、M4A、OGG 格式，最大 100MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {selectedFile && !error && (
        <div className="flex flex-col gap-3">
          {isProcessing && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">上传进度</span>
                <span className="text-white font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-700/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {isProcessing ? (
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-300"
              >
                <X className="w-5 h-5" />
                取消上传
              </button>
            ) : (
              <>
                <button
                  onClick={handleClearFile}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                  清除
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-medium transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                >
                  <Upload className="w-5 h-5" />
                  开始翻译
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2">
        {[
          { icon: CheckCircle, label: '格式校验', color: 'text-emerald-400' },
          { icon: Loader2, label: '分片上传', color: 'text-blue-400' },
          { icon: FileAudio, label: '队列处理', color: 'text-purple-400' },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800/30"
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudioUploader;
