import { useRef, useEffect, useCallback } from 'react';
import useAppStore from '../store/index.js';

export const useMicrophone = () => {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    isRecording,
    isPaused,
    setRecording,
    setPaused,
    setRecordingTime,
    setAudioLevel,
    addWaveformData,
    setWaveformData,
    recordingTime,
  } = useAppStore();

  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    analyserRef.current.smoothingTimeConstant = 0.8;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecording || isPaused) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = average / 255;

    setAudioLevel(normalizedLevel);
    addWaveformData(normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [isRecording, isPaused, setAudioLevel, addWaveformData]);

  const startRecording = useCallback(async () => {
    try {
      await initAudioContext();

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const source = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
      source.connect(analyserRef.current!);

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/wav'];
      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000,
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/wav' });
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start(500);
      setRecording(true);
      setPaused(false);
      setRecordingTime(0);
      setWaveformData([]);

      timerRef.current = setInterval(() => {
        setRecordingTime(recordingTime + 1);
      }, 1000);

      analyzeAudio();

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      useAppStore.getState().showNotification('error', '无法访问麦克风，请检查权限设置');
      return false;
    }
  }, [initAudioContext, analyzeAudio, setRecording, setPaused, setRecordingTime, setWaveformData, recordingTime]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPaused(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [setPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setPaused(false);
      analyzeAudio();
      timerRef.current = setInterval(() => {
        setRecordingTime(useAppStore.getState().recordingTime + 1);
      }, 1000);
    }
  }, [analyzeAudio, setPaused, setRecordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setRecording(false);
    setPaused(false);
    setAudioLevel(0);

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    audioChunksRef.current = [];

    return audioBlob;
  }, [setRecording, setPaused, setAudioLevel]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isRecording,
    isPaused,
    recordingTime,
  };
};

export default useMicrophone;
