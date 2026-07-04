import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Card, EmptyState, ProgressBar, Skeleton } from '@/components/ui'
import { StatCard } from '@/components/StatCard'
import { CategoryIcon } from '@/components/CategoryIcon'
import { useCategories } from '@/hooks/useCategories'
import { useMonthExpenses } from '@/hooks/useExpenses'
import { useBudgets, useDeleteBudget, useUpsertBudget } from '@/hooks/useBudgets'
import { getBudgetStatus } from '@/lib/insights'
import { formatINR, formatPercent } from '@/lib/format'
import type { Budget, Category } from '@/types/db'

export default function Budgets() {
  const now = useMemo(() => new Date(), [])
  const { data: categories, isLoading: catsLoading } = useCategories()
  const { data: expenses, isLoading: expLoading } = useMonthExpenses(now)
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(now)
  const upsertBudget = useUpsertBudget(now)
  const deleteBudget = useDeleteBudget(now)

  const loading = catsLoading || expLoading || budgetsLoading

  const spentByCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of expenses ?? []) {
      if (!e.category_id) continue
      m.set(e.category_id, (m.get(e.category_id) ?? 0) + e.amount)
    }
    return m
  }, [expenses])

  const budgetByCategory = useMemo(() => {
    const m = new Map<string, Budget>()
    for (const b of budgets ?? []) m.set(b.category_id, b)
    return m
  }, [budgets])

  const totals = useMemo(() => {
    const budgeted = (budgets ?? []).reduce((s, b) => s + b.budget_amount, 0)
    const spent = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
    return { budgeted, spent }
  }, [budgets, expenses])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Budgets</h1>
        <span className="text-sm text-muted">{format(now, 'MMMM yyyy')}</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Budgeted" value={formatINR(totals.budgeted)} accent="brand" />
          <StatCard
            label="Spent"
            value={formatINR(totals.spent)}
            accent={totals.spent > totals.budgeted && totals.budgeted > 0 ? 'danger' : undefined}
            hint={
              totals.budgeted > 0
                ? `${formatPercent(totals.spent / totals.budgeted)} of budget`
                : 'No budgets set'
            }
          />
        </div>
      )}

      {loading ? (
        <Skeleton className="h-64" />
      ) : (categories ?? []).length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Add categories in onboarding or settings, then set a budget for each."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Set a monthly cap per category. Bars turn amber past 70% and red once
            you're over.
          </p>
          {(categories ?? []).map((c) => (
            <BudgetRow
              key={c.id}
              category={c}
              spent={spentByCategory.get(c.id) ?? 0}
              budget={budgetByCategory.get(c.id)}
              saving={upsertBudget.isPending}
              onSave={(amount) =>
                upsertBudget.mutate({ category_id: c.id, budget_amount: amount })
              }
              onClear={(id) => deleteBudget.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BudgetRow({
  category,
  spent,
  budget,
  onSave,
  onClear,
}: {
  category: Category
  spent: number
  budget?: Budget
  saving: boolean
  onSave: (amount: number) => void
  onClear: (id: string) => void
}) {
  const [value, setValue] = useState(
    budget ? String(budget.budget_amount) : '',
  )
  const budgetAmount = budget?.budget_amount ?? 0
  const status = getBudgetStatus(spent, budgetAmount)

  const levelText = {
    under: 'text-positive',
    near: 'text-warning',
    over: 'text-danger',
  }[status.level]

  function commit() {
    const num = parseFloat(value)
    if (!value.trim() || num <= 0) {
      if (budget) onClear(budget.id)
      setValue('')
      return
    }
    if (num !== budgetAmount) onSave(num)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface">
            <CategoryIcon icon={category.icon} color={category.color} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{category.name}</p>
            <p className="text-xs text-muted">
              {formatINR(spent)}
              {budgetAmount > 0 && (
                <>
                  {' '}
                  of {formatINR(budgetAmount)}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-xl border border-border bg-surface px-2 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="text-sm text-muted">₹</span>
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            placeholder="0"
            className="w-20 bg-transparent py-1.5 text-right text-sm outline-none tabular"
          />
        </div>
      </div>

      {budgetAmount > 0 && (
        <div className="mt-3">
          <ProgressBar ratio={status.ratio} level={status.level} />
          <div className="mt-1 flex justify-between text-xs">
            <span className={levelText}>
              {formatPercent(status.ratio)} used
            </span>
            <span className="text-muted">
              {status.remaining >= 0
                ? `${formatINR(status.remaining)} left`
                : `${formatINR(-status.remaining)} over`}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}
