import { BarChart3 } from 'lucide-react'
import { ComingSoon } from './ComingSoon'

export default function Analytics() {
  return (
    <ComingSoon
      title="Analytics"
      icon={<BarChart3 className="h-8 w-8" />}
      description="Month-over-month trends, weekday patterns, anomaly callouts and leak categories. The insight functions (detectAnomalies, getWeekdayPattern, getLeakCategories) are built and unit-tested."
    />
  )
}
