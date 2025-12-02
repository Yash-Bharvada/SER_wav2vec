"use client"
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Mic, Square } from 'lucide-react'

export function AIVoiceInput({ onStart, onStop }: { onStart?: () => void; onStop?: (duration: number, blob: Blob) => void }) {
  const [recording, setRecording] = useState(false)
  const [levels, setLevels] = useState<number[]>(Array(64).fill(8))
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const startTsRef = useRef<number>(0)
  const pcmChunksRef = useRef<Float32Array[]>([])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close()
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  const tick = () => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128)
    const energy = sum / buf.length
    const h = Math.min(100, Math.max(8, Math.floor(energy)))
    setLevels(prev => {
      const next = prev.slice(1)
      next.push(h)
      return next
    })
    rafRef.current = requestAnimationFrame(tick)
  }

  const start = async () => {
    if (recording) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    mediaRecorderRef.current = mr
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext || AudioContext)()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser
    source.connect(analyser)
    const processor = ctx.createScriptProcessor(2048, 1, 1)
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      pcmChunksRef.current.push(new Float32Array(input))
    }
    source.connect(processor)
    processor.connect(ctx.destination)
    setLevels(Array(64).fill(8))
    const chunks: Blob[] = []
    mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
    mr.onstop = () => {
      const dur = Math.max(0, (performance.now() - startTsRef.current) / 1000)
      const sr = audioCtxRef.current?.sampleRate || 44100
      const length = pcmChunksRef.current.reduce((acc, s) => acc + s.length, 0)
      const pcm16 = new Int16Array(length)
      let offset = 0
      for (const s of pcmChunksRef.current) {
        for (let i = 0; i < s.length; i++) {
          const v = Math.max(-1, Math.min(1, s[i]))
          pcm16[offset++] = v < 0 ? v * 0x8000 : v * 0x7fff
        }
      }
      const header = new ArrayBuffer(44)
      const view = new DataView(header)
      const writeStr = (o: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(o + i, str.charCodeAt(i)) }
      writeStr(0, 'RIFF'); view.setUint32(4, 36 + pcm16.byteLength, true); writeStr(8, 'WAVE')
      writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
      view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
      writeStr(36, 'data'); view.setUint32(40, pcm16.byteLength, true)
      const wav = new Blob([header, new Uint8Array(pcm16.buffer)], { type: 'audio/wav' })
      onStop?.(dur, wav)
      pcmChunksRef.current = []
    }
    startTsRef.current = performance.now()
    mr.start()
    onStart?.()
    setRecording(true)
    rafRef.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!recording) return
    setRecording(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
  }

  return (
    <div className="space-y-3">
      <button
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        className={cn('rounded-full w-14 h-14 flex items-center justify-center border shadow-sm bg-white dark:bg-white/10', recording && 'bg-red-600 text-white border-red-700')}
        onClick={recording ? stop : start}
      >
        {recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      <div className="h-8 flex items-end gap-[2px]">
        {Array.from({ length: 64 }).map((_, i) => (
          <div key={i} style={{ height: `${levels[i]}%` }} className="w-1 bg-foreground/60" />
        ))}
      </div>
    </div>
  )
}
