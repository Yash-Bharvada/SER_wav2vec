import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border shadow-sm bg-white/50 dark:bg-white/5', className)}>{children}</div>
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className={cn('p-4 border-b')}>{children}</div>
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className={cn('text-lg font-semibold')}>{children}</div>
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>
}
