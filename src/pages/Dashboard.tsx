import { useMemo, useState } from 'react'
import { getDate, getDaysInMonth, format } from 'date-fns'
import {
  AlertTriangle,
  PiggyBank,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { StatCard } from '@/components/StatCard'
import { InsightCard } from '@/components/InsightCard'
import { CategoryIcon } from '@/components/CategoryIcon'
import { CategoryDonut, DailySpendTrend } from '@/components/charts'
import { AddExpenseDrawer } from '@/components/AddExpenseDrawer'
import { useProfile } from '@/hooks/useProfile'
import { useMonthExpenses } from '@/hooks/useExpenses'
import { calculateBurnRate, getSavingsRate } from '@/lib/insights'
import { formatINR, formatPercent } from '@/lib/format'

export default function Dashboard() {
  const now = useMemo(() => new Date(), [])
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: expenses, isLoading: expensesLoading } = useMonthExpenses(now)
  const [addOpen, setAddOpen] = useState(false)

  const salary = profile?.monthly_salary ?? 0
  const loading = profileLoading || expensesLoading

  const derived = useMemo(() => {
    const list = expenses ?? []
    const daysInMonth = getDaysInMonth(now)
    const todayDay = getDate(now)

    const spent = list.reduce((s, e) => s + e.amount, 0)
    const remaining = salary - spent
    const savingsRate = getSavingsRate(salary, spent)
    const burn = calculateBurnRate(list, salary, todayDay, daysInMonth)

    // Category breakdown
    const byCat = new Map<
      string,
      { name: string; color: string; value: number }
    >()
    for (const e of list) {
      const key = e.category?.id ?? 'uncat'
      const prev = byCat.get(key)
      if (prev) prev.value += e.amount
      else
        byCat.set(key, {
          name: e.category?.name ?? 'Uncategorised',
          color: e.category?.color ?? '#94a3b8',
          value: e.amount,
        })
    }
    const donut = [...byCat.values()].sort((a, b) => b.value - a.value)
    const topCategory = donut[0]

    // Daily cumulative series vs. even pace
    const byDay = new Array(daysInMonth + 1).fill(0)
    for (const e of list) {
      const d = Number(e.expense_date.slice(8, 10))
      if (d >= 1 && d <= daysInMonth) byDay[d] += e.amount
    }
    let cum = 0
    const daily = []
    for (let d = 1; d <= daysInMonth; d++) {
      cum += byDay[d]
      daily.push({
        day: d,
        actual: d <= todayDay ? cum : null,
        pace: salary > 0 ? (salary / daysInMonth) * d : 0,
      })
    }

    return {
      spent,
      remaining,
      savingsRate,
      burn,
      donut,
      topCategory,
      daily,
      daysLeft: daysInMonth - todayDay,
    }
  }, [expenses, salary, now])

  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{format(now, 'MMMM yyyy')}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {firstName ? `Hey, ${firstName}` : 'Your month'}
          </h1>
        </div>
        <Button onClick={() => setAddOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Income"
            value={formatINR(salary)}
            accent="brand"
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            label="Spent"
            value={formatINR(derived.spent)}
            hint={`${derived.daysLeft} days left`}
            accent="danger"
          />
          <StatCard
            label="Remaining"
            value={formatINR(derived.remaining)}
            accent={derived.remaining >= 0 ? 'positive' : 'danger'}
          />
          <StatCard
            label="Savings rate"
            value={formatPercent(derived.savingsRate)}
            hint={`Projected ${formatPercent(derived.burn.projectedSavingsRate)}`}
            accent={derived.savingsRate >= 0.2 ? 'positive' : undefined}
            icon={<PiggyBank className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Insight cards */}
      {!loading && salary > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {derived.burn.onTrackToOverspend ? (
            <InsightCard tone="danger" icon={<AlertTriangle className="h-4 w-4" />}>
              At this pace you'll spend about{' '}
              <strong>{formatINR(derived.burn.projectedTotal)}</strong> by
              month-end — <strong>{formatINR(-derived.burn.projectedSavings)}</strong>{' '}
              over your income. Time to ease off.
            </InsightCard>
          ) : (
            <InsightCard tone="positive" icon={<TrendingUp className="h-4 w-4" />}>
              On track to save{' '}
              <strong>{formatINR(derived.burn.projectedSavings)}</strong> (
              {formatPercent(derived.burn.projectedSavingsRate)}) this month if
              you keep this pace.
            </InsightCard>
          )}
          {derived.topCategory && (
            <InsightCard tone="info" icon={<Sparkles className="h-4 w-4" />}>
              <strong>{derived.topCategory.name}</strong> is your biggest spend
              so far at <strong>{formatINR(derived.topCategory.value)}</strong> (
              {formatPercent(
                derived.spent > 0
                  ? derived.topCategory.value / derived.spent
                  : 0,
              )}{' '}
              of spending).
            </InsightCard>
          )}
        </div>
      )}

      {/* Charts */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (expenses ?? []).length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No expenses yet this month"
          description="Add your first expense to start seeing where your money goes."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add your first expense
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-1 font-semibold">Where it's going</h3>
            <p className="mb-2 text-xs text-muted">Spend by category</p>
            <CategoryDonut data={derived.donut} />
          </Card>
          <Card>
            <h3 className="mb-1 font-semibold">Spend vs. pace</h3>
            <p className="mb-2 text-xs text-muted">
              Cumulative spend against an even-spend line
            </p>
            <DailySpendTrend data={derived.daily} />
          </Card>
        </div>
      )}

      {/* Recent transactions */}
      {!loading && (expenses ?? []).length > 0 && (
        <Card>
          <h3 className="mb-3 font-semibold">Recent</h3>
          <ul className="divide-y divide-border">
            {(expenses ?? [])
              .slice()
              .reverse()
              .slice(0, 6)
              .map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface">
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
                      {format(new Date(e.expense_date), 'd MMM')} ·{' '}
                      {e.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <span className="tabular font-semibold">
                    {formatINR(e.amount)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <AddExpenseDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
