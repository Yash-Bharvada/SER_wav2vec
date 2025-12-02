import { cn } from '@/lib/utils'

export function PulsatingLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative w-24 h-24">
        <span className="absolute inset-0 rounded-full bg-white/70 dark:bg-white/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0s' }} />
        <span className="absolute inset-0 rounded-full bg-white/50 dark:bg-white/20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        <span className="absolute inset-0 rounded-full bg-white/30 dark:bg-white/10 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
        <span className="absolute inset-0 rounded-full bg-white dark:bg-white/90" />
      </div>
      <div className="text-white text-lg font-medium">Processing</div>
    </div>
  )
}

export function FullScreenProcessing() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/60 backdrop-blur-sm">
      <PulsatingLoader />
    </div>
  )
}
