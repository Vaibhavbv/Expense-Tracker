import { ReceiptText } from 'lucide-react'
import { ComingSoon } from './ComingSoon'

export default function Expenses() {
  return (
    <ComingSoon
      title="Expenses"
      icon={<ReceiptText className="h-8 w-8" />}
      description="A full, filterable list with search, inline edit/delete and pagination. The data layer (useExpenses) is already in place."
    />
  )
}
