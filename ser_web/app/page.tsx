"use client"
import { useEffect, useRef, useState } from 'react'
import { Angry, Smile, Frown, Meh, Zap, Wind } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { AIVoiceInput } from '@/components/components/ui/ai-voice-input'
import PulsatingDots from '@/components/components/pulsating-loader'

type Emotions = {
  angry: number;
  calm: number;
  disgust: number;
  fear: number;
  happy: number;
  neutral: number;
  sad: number;
  surprise: number;
}

const icons = {
  angry: Angry,
  calm: Wind,
  disgust: Frown,
  fear: Zap,
  happy: Smile,
  neutral: Meh,
  sad: Frown,
  surprise: Zap,
}

const emotionStyles: Record<keyof Emotions, { gradient: string; iconColor: string }> = {
  angry: { gradient: 'bg-gradient-to-b from-red-100 to-red-200 dark:from-[#3a0d0d] dark:to-[#8b1e1e]', iconColor: 'text-red-700' },
  calm: { gradient: 'bg-gradient-to-b from-sky-100 to-sky-200 dark:from-[#0f1b33] dark:to-[#3a7bd5]', iconColor: 'text-sky-700' },
  disgust: { gradient: 'bg-gradient-to-b from-green-100 to-green-200 dark:from-[#0f241c] dark:to-[#4bbf8b]', iconColor: 'text-green-700' },
  fear: { gradient: 'bg-gradient-to-b from-violet-100 to-violet-200 dark:from-[#1b0f33] dark:to-[#7d5cff]', iconColor: 'text-violet-700' },
  happy: { gradient: 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-[#332b0f] dark:to-[#f4d35e]', iconColor: 'text-amber-700' },
  neutral: { gradient: 'bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-[#202020] dark:to-[#b5b5b5]', iconColor: 'text-zinc-700' },
  sad: { gradient: 'bg-gradient-to-b from-indigo-100 to-indigo-200 dark:from-[#0f1f33] dark:to-[#6ba4ff]', iconColor: 'text-indigo-700' },
  surprise: { gradient: 'bg-gradient-to-b from-pink-100 to-pink-200 dark:from-[#330f2a] dark:to-[#ff70c8]', iconColor: 'text-pink-700' },
}

export default function Page() {
  const [mode, setMode] = useState<'home' | 'loading' | 'results'>('home')
  const [emotions, setEmotions] = useState<Emotions>({ angry: 0, calm: 0, disgust: 0, fear: 0, happy: 0, neutral: 0, sad: 0, surprise: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const cryptoRandom = () => Math.random().toString(36).slice(2, 10)

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && window.localStorage.getItem('theme')) as 'light' | 'dark' | null
    const th = saved || 'light'
    setTheme(th)
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', th === 'dark')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', next === 'dark')
    if (typeof window !== 'undefined') window.localStorage.setItem('theme', next)
  }

  const uploadBlob = async (blob: Blob, name: string) => {
    setLoading(true)
    setError(null)
    setMode('loading')
    try {
      const fd = new FormData()
      fd.append('file', blob, name)
      const API_URL = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${API_URL}/predict`, { method: 'POST', body: fd })
      const text = await res.text()
      let data: any = null
      try { data = JSON.parse(text) } catch { data = null }
      if (!res.ok || !data || !data.results) {
        setError(data?.error ? String(data.error) : 'Request failed')
        setMode('home')
        return
      }
      if (data.results) {
        const mapped: Emotions = { angry: 0, calm: 0, disgust: 0, fear: 0, happy: 0, neutral: 0, sad: 0, surprise: 0 }
        for (const r of data.results) {
          const k = (r.label as string).toLowerCase() as keyof Emotions
          if (k in mapped) mapped[k] = Math.round((r.score as number) * 100)
        }
        setEmotions(mapped)
        setMode('results')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) return
    await uploadBlob(file, file.name)
  }

  const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1])
  const [dominantName, dominantValue] = sorted[0] as [keyof Emotions, number]
  const DominantIcon = icons[dominantName]
  const dominantStyles = emotionStyles[dominantName]

  return (
    <div className="min-h-screen">
      {mode === 'home' && (
        <div className="min-h-screen p-8 flex flex-col">
          <div className="flex justify-end">
            <button onClick={toggleTheme} className="rounded-md border px-3 py-2">{theme === 'light' ? 'Dark' : 'Light'} Mode</button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-2xl w-full flex flex-col items-center gap-8">
              <AIVoiceInput onStart={() => {}} onStopBlob={(_, b) => uploadBlob(b, 'recording.wav')} />
              <input ref={fileInputRef} id="file-upload" className="hidden" type="file" accept="audio/*" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) handleFile(f) }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border px-4 py-2 bg-white text-black hover:bg-black/5 dark:bg-zinc-900 dark:text-white dark:border-zinc-700 dark:hover:bg-white/10"
              >
                Click to upload
              </button>
              {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
            </div>
          </div>
        </div>
      )}

      {mode === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <PulsatingDots />
            <div className="text-white text-lg font-medium">Processing</div>
          </div>
        </div>
      )}

      {mode === 'results' && (
        <div className="min-h-screen p-8">
          <div className="flex justify-between items-center">
            <button className="rounded-md border px-3 py-2" onClick={() => {
              setMode('home')
              setError(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}>Back</button>
            <button onClick={toggleTheme} className="rounded-md border px-3 py-2">{theme === 'light' ? 'Dark' : 'Light'} Mode</button>
          </div>
          <div className="max-w-4xl mx-auto space-y-6 mt-6">
            <Card className={cn('p-6 border', dominantStyles.gradient)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {DominantIcon && <DominantIcon className={cn('w-6 h-6', dominantStyles.iconColor)} />}
                  <div>
                    <div className="text-2xl font-semibold">{dominantName?.charAt(0).toUpperCase() + dominantName?.slice(1)}</div>
                    <div className="text-sm text-muted-foreground">Dominant Emotion Detected</div>
                  </div>
                </div>
                <div className="rounded-xl px-3 py-1 bg-white text-black dark:bg-black dark:text-white text-lg font-medium">{dominantValue}%</div>
              </div>
              <div className="mt-4">
                <Progress value={dominantValue} className="h-3 bg-muted rounded-full" indicatorClassName="bg-foreground" />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Detected Emotions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sorted.map(([name, value]) => {
                    const key = name as keyof Emotions
                    const Icon = icons[key]
                    const styles = emotionStyles[key]
                    return (
                  <div key={name} className={cn('rounded-xl border p-4 shadow-sm', styles.gradient)}>
                        <div className="flex items-center gap-2 mb-3">
                          {Icon && <Icon className={cn('w-5 h-5', styles.iconColor)} />}
                          <div className="font-medium capitalize">{name}</div>
                        </div>
                        <Progress value={value} className="h-2 bg-muted rounded-full" indicatorClassName="bg-foreground" />
                        <div className="mt-2 text-sm text-right">{value}%</div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
