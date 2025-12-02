import { cn } from '@/lib/utils'

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('w-full h-2 rounded bg-gray-200 dark:bg-gray-800', className)}>
      <div className={cn('h-full rounded bg-black dark:bg-white', indicatorClassName)} style={{ width: `${v}%` }} />
    </div>
  )
}
