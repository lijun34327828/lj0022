import { useEffect, useRef, useMemo } from 'react';
import useAppStore from '../store/index.js';

interface WaveformProps {
  height?: number;
  barWidth?: number;
  barGap?: number;
  mode?: 'realtime' | 'static';
  staticData?: number[];
}

export const Waveform = ({
  height = 120,
  barWidth = 3,
  barGap = 2,
  mode = 'realtime',
  staticData,
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const { waveformData, isRecording, isPaused, audioLevel } = useAppStore();

  const displayData = useMemo(() => {
    if (mode === 'static' && staticData) {
      return staticData;
    }
    return waveformData;
  }, [mode, staticData, waveformData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const width = rect.width;
      const centerY = height / 2;
      const maxBarHeight = height * 0.9;

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.8)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.6)');

      const barCount = Math.floor(width / (barWidth + barGap));
      const dataLength = displayData.length;
      const startIndex = Math.max(0, dataLength - barCount);

      for (let i = 0; i < barCount; i++) {
        const dataIndex = startIndex + i;
        const x = i * (barWidth + barGap);

        let barHeight = 4;
        if (dataIndex < dataLength) {
          const value = displayData[dataIndex];
          barHeight = Math.max(4, value * maxBarHeight);
        } else if (isRecording && !isPaused) {
          const noise = (Math.random() * 0.3 + 0.1) * audioLevel;
          barHeight = Math.max(4, noise * maxBarHeight);
        }

        const y = centerY - barHeight / 2;
        const radius = Math.min(barWidth / 2, barHeight / 2);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      const centerGradient = ctx.createLinearGradient(0, centerY - 1, 0, centerY + 1);
      centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      centerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

      ctx.fillStyle = centerGradient;
      ctx.fillRect(0, centerY - 0.5, width, 1);

      if (isRecording && !isPaused) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    if (isRecording && !isPaused) {
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [displayData, height, barWidth, barGap, isRecording, isPaused, audioLevel]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border border-white/10">
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height: `${height}px` }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-slate-900/20 via-transparent to-slate-900/20" />
    </div>
  );
};

export default Waveform;
