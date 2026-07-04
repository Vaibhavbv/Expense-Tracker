import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  ReceiptText,
  Search,
  Trash2,
} from 'lucide-react'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { CategoryIcon } from '@/components/CategoryIcon'
import { EditExpenseModal } from '@/components/EditExpenseModal'
import { useCategories } from '@/hooks/useCategories'
import {
  useDeleteExpense,
  useExpenses,
  type ExpenseFilters,
} from '@/hooks/useExpenses'
import { formatINR } from '@/lib/format'
import { PAYMENT_METHODS, type ExpenseWithCategory } from '@/types/db'

const PAGE_SIZE = 25

export default function Expenses() {
  const { data: categories } = useCategories()
  const deleteExpense = useDeleteExpense()

  const [searchInput, setSearchInput] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<ExpenseWithCategory | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, from, to, categoryId, paymentMethod])

  const filters: ExpenseFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      from: from || undefined,
      to: to || undefined,
      categoryId: categoryId || undefined,
      paymentMethod: (paymentMethod || undefined) as ExpenseFilters['paymentMethod'],
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, from, to, categoryId, paymentMethod, page],
  )

  const { data, isLoading, isFetching } = useExpenses(filters)
  const rows = data?.rows ?? []
  const count = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const hasFilters = Boolean(
    debouncedSearch || from || to || categoryId || paymentMethod,
  )

  function clearFilters() {
    setSearchInput('')
    setFrom('')
    setTo('')
    setCategoryId('')
    setPaymentMethod('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Expenses</h1>
        {count > 0 && (
          <span className="text-sm text-muted">{count} total</span>
        )}
      </div>

      {/* Filters */}
      <Card className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search notes…"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="To date"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-8 w-8" />}
          title={hasFilters ? 'No expenses match your filters' : 'No expenses yet'}
          description={
            hasFilters
              ? 'Try widening your date range or clearing filters.'
              : 'Use the + button to log your first expense.'
          }
        />
      ) : (
        <Card className="p-0">
          <ul className={`divide-y divide-border ${isFetching ? 'opacity-60' : ''}`}>
            {rows.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface">
                  <CategoryIcon
                    icon={e.category?.icon}
                    color={e.category?.color}
                    className="h-4 w-4"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {e.description || e.category?.name || 'Expense'}
                  </p>
                  <p className="text-xs text-muted">
                    {format(new Date(e.expense_date), 'd MMM yyyy')} ·{' '}
                    {e.category?.name ?? 'Uncategorised'} ·{' '}
                    {e.payment_method.toUpperCase()}
                  </p>
                </div>
                <span className="tabular shrink-0 text-sm font-semibold">
                  {formatINR(e.amount)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(e)}
                    className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-content"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this expense?')) deleteExpense.mutate(e.id)
                    }}
                    className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Pagination */}
      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <EditExpenseModal expense={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
