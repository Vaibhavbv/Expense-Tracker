import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useCategories } from '@/hooks/useCategories'
import { useUpdateExpense } from '@/hooks/useExpenses'
import {
  PAYMENT_METHODS,
  type ExpenseWithCategory,
  type PaymentMethod,
} from '@/types/db'

export function EditExpenseModal({
  expense,
  onClose,
}: {
  expense: ExpenseWithCategory | null
  onClose: () => void
}) {
  const { data: categories } = useCategories()
  const update = useUpdateExpense()

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount))
      setCategoryId(expense.category_id ?? '')
      setMethod(expense.payment_method)
      setDate(expense.expense_date)
      setDescription(expense.description ?? '')
      setError(null)
    }
  }, [expense])

  if (!expense) return null

  const amountNum = parseFloat(amount)
  const valid = amountNum > 0 && !!categoryId

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || !expense) return
    try {
      await update.mutateAsync({
        id: expense.id,
        amount: amountNum,
        category_id: categoryId,
        payment_method: method,
        expense_date: date,
        description: description.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update expense.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit expense</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block text-sm font-medium text-muted">Amount</label>
        <div className="mt-1 flex items-center rounded-xl border border-border bg-surface px-4 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="text-xl font-semibold text-muted">₹</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent py-2.5 pl-2 text-xl font-semibold outline-none tabular"
          />
        </div>

        <label className="mt-4 block text-sm font-medium text-muted">
          Category
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        >
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium text-muted">
          Paid via
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition',
                method === m.value
                  ? 'border-brand-500 bg-brand-500/10 text-content'
                  : 'border-border text-muted hover:bg-surface',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted">Note</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <Button
          type="submit"
          size="lg"
          loading={update.isPending}
          disabled={!valid}
          className="mt-5 w-full"
        >
          Save changes
        </Button>
      </form>
    </div>
  )
}
