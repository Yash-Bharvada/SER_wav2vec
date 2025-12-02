"use client"
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export default function VoiceInput({ onBlob }: { onBlob: (b: Blob) => void }) {
  const [recording, setRecording] = useState(false)
  const [levels, setLevels] = useState<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

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
      const next = prev.slice(-63)
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
    setLevels(Array(64).fill(8))
    const chunks: Blob[] = []
    mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
    mr.onstop = () => { const blob = new Blob(chunks, { type: mime || 'audio/webm' }); onBlob(blob) }
    mr.start()
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button className={cn('rounded-md border px-3 py-2', recording && 'opacity-70')} onClick={recording ? stop : start}>{recording ? 'Stop' : 'Start'} Live</button>
      </div>
      <div className="h-8 flex items-end gap-[2px]">
        {Array.from({ length: 64 }).map((_, i) => (
          <div key={i} style={{ height: `${(levels[i] ?? 8)}%` }} className="w-1 bg-foreground/60" />
        ))}
      </div>
    </div>
  )
}
