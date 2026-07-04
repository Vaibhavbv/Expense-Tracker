import { Target } from 'lucide-react'
import { ComingSoon } from './ComingSoon'

export default function Budgets() {
  return (
    <ComingSoon
      title="Budgets"
      icon={<Target className="h-8 w-8" />}
      description="Set a monthly budget per category with colour-coded progress bars. The budgets table, RLS and getBudgetStatus helper are ready."
    />
  )
}
