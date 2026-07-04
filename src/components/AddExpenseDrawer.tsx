import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { CategoryIcon } from '@/components/CategoryIcon'
import { cn } from '@/lib/cn'
import { useCategories } from '@/hooks/useCategories'
import { useCreateExpense } from '@/hooks/useExpenses'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/db'

const today = () => format(new Date(), 'yyyy-MM-dd')

export function AddExpenseDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: categories } = useCategories()
  const createExpense = useCreateExpense()

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset the form each time the drawer opens.
  useEffect(() => {
    if (open) {
      setAmount('')
      setCategoryId(categories?.[0]?.id ?? '')
      setMethod('upi')
      setDate(today())
      setDescription('')
      setError(null)
    }
  }, [open, categories])

  if (!open) return null

  const amountNum = parseFloat(amount)
  const valid = amountNum > 0 && !!categoryId

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) {
      setError('Enter an amount and pick a category.')
      return
    }
    try {
      await createExpense.mutateAsync({
        amount: amountNum,
        category_id: categoryId,
        payment_method: method,
        expense_date: date,
        description: description.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save expense.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* backdrop */}
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
          <h2 className="text-lg font-bold">Add expense</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount — the one thing that must be fast */}
        <label className="block text-sm font-medium text-muted">Amount</label>
        <div className="mt-1 flex items-center rounded-xl border border-border bg-surface px-4 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="text-2xl font-semibold text-muted">₹</span>
          <input
            autoFocus
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent py-3 pl-2 text-2xl font-semibold text-content outline-none tabular"
          />
        </div>

        {/* Category */}
        <label className="mt-4 block text-sm font-medium text-muted">
          Category
        </label>
        <div className="mt-2 grid max-h-40 grid-cols-3 gap-2 overflow-y-auto scrollbar-thin">
          {(categories ?? []).map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition',
                categoryId === c.id
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-border hover:bg-surface',
              )}
            >
              <CategoryIcon icon={c.icon} color={c.color} />
              <span className="line-clamp-1 text-[11px] text-content">
                {c.name}
              </span>
            </button>
          ))}
        </div>

        {/* Payment method */}
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

        {/* Optional: date + note */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-muted">Date</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-content outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted">
              Note{' '}
              <span className="font-normal text-muted/70">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Swiggy"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-content outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <Button
          type="submit"
          size="lg"
          loading={createExpense.isPending}
          disabled={!valid}
          className="mt-5 w-full"
        >
          Add ₹{amountNum > 0 ? amountNum.toLocaleString('en-IN') : '0'}
        </Button>
      </form>
    </div>
  )
}
