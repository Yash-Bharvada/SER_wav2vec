"use client";

import { Mic } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/components/lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  onStopBlob?: (duration: number, blob: Blob) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

export function AIVoiceInput({
  onStart,
  onStop,
  onStopBlob,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const startTsRef = useRef<number>(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      onStop?.(time);
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: NodeJS.Timeout;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else {
      setSubmitted((prev) => {
        const next = !prev;
        if (next) startRecording(); else stopRecording();
        return next;
      });
    }
  };

  const startRecording = async () => {
    if (mediaStreamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext || AudioContext)();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    processorRef.current = processor;
    pcmChunksRef.current = [];
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      pcmChunksRef.current.push(new Float32Array(input));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    startTsRef.current = performance.now();
  };

  const stopRecording = () => {
    const dur = Math.max(0, (performance.now() - startTsRef.current) / 1000);
    processorRef.current && processorRef.current.disconnect();
    audioCtxRef.current && audioCtxRef.current.close();
    mediaStreamRef.current && mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    audioCtxRef.current = null;
    mediaStreamRef.current = null;
    const sr = 44100;
    const length = pcmChunksRef.current.reduce((acc, s) => acc + s.length, 0);
    const pcm16 = new Int16Array(length);
    let offset = 0;
    for (const s of pcmChunksRef.current) {
      for (let i = 0; i < s.length; i++) {
        const v = Math.max(-1, Math.min(1, s[i]));
        pcm16[offset++] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
    }
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeStr = (o: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i)); };
    writeStr(0, "RIFF"); view.setUint32(4, 36 + pcm16.byteLength, true); writeStr(8, "WAVE");
    writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(36, "data"); view.setUint32(40, pcm16.byteLength, true);
    const wav = new Blob([header, new Uint8Array(pcm16.buffer)], { type: "audio/wav" });
    onStopBlob?.(dur, wav);
    pcmChunksRef.current = [];
  };

  return (
    <div className={cn("w-full py-8", className)}>
      <div className="relative max-w-3xl w-full mx-auto flex items-center flex-col gap-4">
        <button
          className={cn(
            "group w-24 h-24 rounded-full flex items-center justify-center transition-colors border",
            submitted
              ? "bg-red-600 text-white border-red-700"
              : "bg-white text-black border-zinc-300 hover:bg-black/5 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 dark:hover:bg-white/10"
          )}
          type="button"
          onClick={handleClick}
        >
          {submitted ? (
            <div className="w-3 h-10 bg-white" />
          ) : (
            <Mic className="w-10 h-10 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-base transition-opacity duration-300",
            submitted
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-10 w-[32rem] max-w-full flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-300",
                submitted
                  ? "bg-black/50 dark:bg-white/50 animate-pulse"
                  : "bg-black/10 dark:bg-white/10 h-1"
              )}
              style={
                submitted && isClient
                  ? {
                      height: `${10 + Math.random() * 90}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-5 text-sm text-black/70 dark:text-white/70">
          {submitted ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
}
