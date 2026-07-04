import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui'

/** Shared placeholder for pages implemented in the next build pass. */
export function ComingSoon({
  title,
  icon,
  description,
}: {
  title: string
  icon: ReactNode
  description: string
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <EmptyState icon={icon} title="Coming in the next build" description={description} />
    </div>
  )
}
