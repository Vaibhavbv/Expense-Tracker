import { useMemo } from 'react'
import { format, getDate, getDaysInMonth, startOfMonth } from 'date-fns'
import { AlertTriangle, BarChart3, Droplets, TrendingUp } from 'lucide-react'
import { Card, EmptyState, Skeleton } from '@/components/ui'
import { InsightCard } from '@/components/InsightCard'
import {
  CategoryDonut,
  GroupedBars,
  SimpleBars,
  StackedBars,
} from '@/components/charts'
import { useProfile } from '@/hooks/useProfile'
import { useExpenseHistory } from '@/hooks/useHistory'
import {
  buildCategoryHistory,
  buildCategoryStacks,
  buildMonthlySeries,
  getMonthBuckets,
  paymentBreakdown,
} from '@/lib/analytics'
import {
  calculateBurnRate,
  detectAnomalies,
  getLeakCategories,
  getWeekdayPattern,
} from '@/lib/insights'
import { formatINR, formatPercent } from '@/lib/format'

export default function Analytics() {
  const now = useMemo(() => new Date(), [])
  const { data: profile } = useProfile()
  const { data: history, isLoading } = useExpenseHistory(12)
  const salary = profile?.monthly_salary ?? 0

  const a = useMemo(() => {
    const list = history ?? []
    const buckets6 = getMonthBuckets(6, now)
    const monthly = buildMonthlySeries(list, salary, buckets6)
    const stacks = buildCategoryStacks(list, buckets6)
    const catHistory = buildCategoryHistory(list, getMonthBuckets(4, now), 3)
    const anomalies = detectAnomalies(catHistory)
    const leaks = getLeakCategories(catHistory)
    const weekday = getWeekdayPattern(
      list.map((e) => ({ amount: e.amount, expense_date: e.expense_date })),
    ).map((w) => ({ label: w.label, average: Math.round(w.average) }))
    const payments = paymentBreakdown(list)

    const currentKey = format(startOfMonth(now), 'yyyy-MM-dd')
    const currentMonth = list.filter(
      (e) => e.expense_date.slice(0, 7) + '-01' === currentKey,
    )
    const burn = calculateBurnRate(
      currentMonth,
      salary,
      getDate(now),
      getDaysInMonth(now),
    )

    return { monthly, stacks, anomalies, leaks, weekday, payments, burn }
  }, [history, salary, now])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
        <Skeleton className="h-32" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if ((history ?? []).length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Not enough data yet"
          description="Log a few expenses over time and your trends, patterns and anomaly alerts will show up here."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>

      {/* Forecast + anomaly callouts */}
      <div className="grid gap-3">
        {salary > 0 && (
          <InsightCard
            tone={a.burn.onTrackToOverspend ? 'danger' : 'positive'}
            icon={
              a.burn.onTrackToOverspend ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )
            }
          >
            <strong>Forecast:</strong> at your current pace you'll spend about{' '}
            <strong>{formatINR(a.burn.projectedTotal)}</strong> this month —{' '}
            {a.burn.onTrackToOverspend ? (
              <>
                <strong>{formatINR(-a.burn.projectedSavings)}</strong> over your
                income of {formatINR(salary)}.
              </>
            ) : (
              <>
                leaving you <strong>{formatINR(a.burn.projectedSavings)}</strong>{' '}
                ({formatPercent(a.burn.projectedSavingsRate)}) of your{' '}
                {formatINR(salary)} income.
              </>
            )}
          </InsightCard>
        )}
        {a.anomalies.map((an) => (
          <InsightCard
            key={an.categoryId}
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
          >
            {an.message} — {formatINR(an.current)} vs a usual{' '}
            {formatINR(Math.round(an.mean))}.
          </InsightCard>
        ))}
      </div>

      {/* Month over month */}
      <Card>
        <h3 className="mb-1 font-semibold">Income vs. spend vs. savings</h3>
        <p className="mb-3 text-xs text-muted">Last 6 months</p>
        <GroupedBars
          data={a.monthly}
          series={[
            { key: 'income', name: 'Income', color: '#4f46e5' },
            { key: 'expense', name: 'Expense', color: '#ef4444' },
            { key: 'savings', name: 'Savings', color: '#10b981' },
          ]}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category trend */}
        <Card>
          <h3 className="mb-1 font-semibold">Category trend</h3>
          <p className="mb-3 text-xs text-muted">Top categories per month</p>
          <StackedBars
            data={a.stacks.rows}
            series={a.stacks.series}
            colors={a.stacks.colors}
          />
        </Card>

        {/* Weekday pattern */}
        <Card>
          <h3 className="mb-1 font-semibold">Day-of-week pattern</h3>
          <p className="mb-3 text-xs text-muted">
            Average spend on a typical weekday
          </p>
          <SimpleBars data={a.weekday} xKey="label" dataKey="average" />
        </Card>

        {/* Payment method */}
        <Card>
          <h3 className="mb-1 font-semibold">How you pay</h3>
          <p className="mb-3 text-xs text-muted">Spend by payment method</p>
          {a.payments.length > 0 ? (
            <CategoryDonut data={a.payments} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">No data</p>
          )}
        </Card>

        {/* Leak categories */}
        <Card>
          <div className="mb-1 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-brand-600" />
            <h3 className="font-semibold">Steady leaks</h3>
          </div>
          <p className="mb-3 text-xs text-muted">
            Your most consistent monthly drains
          </p>
          {a.leaks.length > 0 ? (
            <ul className="space-y-2">
              {a.leaks.map((l, i) => (
                <li
                  key={l.categoryId}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                >
                  <span className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    {l.categoryName}
                  </span>
                  <span className="tabular text-sm font-semibold">
                    {formatINR(Math.round(l.averageMonthly))}
                    <span className="ml-1 text-xs font-normal text-muted">
                      /mo
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              Not enough history to spot steady drains yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
