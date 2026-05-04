'use client';
import { useState, useRef, useCallback } from 'react';

export function useVoiceRecorder(maxDuration = 10) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d + 1 >= maxDuration) { stop(); return maxDuration; }
          return d + 1;
        });
      }, 1000);
    } catch { /* mic denied */ }
  }, [maxDuration]);

  const stop = useCallback((): Promise<{ base64: string; duration: number } | null> => {
    return new Promise(resolve => {
      if (timerRef.current) clearInterval(timerRef.current);
      const mr = mediaRef.current;
      if (!mr || mr.state === 'inactive') { setRecording(false); resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          mr.stream.getTracks().forEach(t => t.stop());
          setRecording(false);
          resolve({ base64, duration });
        };
        reader.readAsDataURL(blob);
      };
      mr.stop();
    });
  }, [duration]);

  return { recording, duration, start, stop };
}

export function VoicePlayer({ src, dur }: { src: string; dur?: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); audioRef.current.currentTime = 0; setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <button onClick={toggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
        playing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25' : 'bg-white/5 text-slate-300 border border-white/10 hover:border-emerald-400/30'
      }`}>
      <span className="text-base">{playing ? '⏸' : '▶️'}</span>
      <span>Voice Note</span>
      {dur && <span className="text-slate-500">{dur}s</span>}
      {playing && (
        <span className="flex gap-[2px] items-end h-3">
          {[1,2,3,4,3].map((h,i) => (
            <span key={i} className="w-[3px] bg-emerald-400 rounded-full animate-pulse" style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </span>
      )}
    </button>
  );
}
