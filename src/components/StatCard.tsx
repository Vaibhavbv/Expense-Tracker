import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: 'positive' | 'danger' | 'brand'
  icon?: ReactNode
}) {
  const accentClass =
    accent === 'positive'
      ? 'text-positive'
      : accent === 'danger'
        ? 'text-danger'
        : accent === 'brand'
          ? 'text-brand-600'
          : 'text-content'

  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <span className={cn('tabular text-2xl font-bold', accentClass)}>
        {value}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  )
}
