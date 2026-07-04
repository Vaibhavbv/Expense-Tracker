import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'info' | 'positive' | 'warning' | 'danger'

const toneStyles: Record<Tone, string> = {
  info: 'border-brand-500/30 bg-brand-500/5',
  positive: 'border-positive/30 bg-positive/5',
  warning: 'border-warning/30 bg-warning/5',
  danger: 'border-danger/30 bg-danger/5',
}

const dotStyles: Record<Tone, string> = {
  info: 'bg-brand-500',
  positive: 'bg-positive',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** Plain-English insight card, e.g. "You've spent 68% of your Food budget…". */
export function InsightCard({
  tone = 'info',
  icon,
  children,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        toneStyles[tone],
      )}
    >
      {icon ? (
        <span className="mt-0.5 shrink-0 text-content">{icon}</span>
      ) : (
        <span
          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotStyles[tone])}
        />
      )}
      <p className="text-sm leading-relaxed text-content">{children}</p>
    </div>
  )
}
