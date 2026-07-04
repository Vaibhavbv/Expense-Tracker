import { format, startOfMonth, subMonths } from 'date-fns'
import type { ExpenseWithCategory, PaymentMethod } from '@/types/db'
import { PAYMENT_METHODS } from '@/types/db'
import type { CategoryHistory } from '@/lib/insights'

export interface MonthBucket {
  key: string // 'yyyy-MM-01'
  label: string // 'Jan'
}

/** Ordered oldest→newest list of the last `count` month buckets. */
export function getMonthBuckets(count: number, now = new Date()): MonthBucket[] {
  const out: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i))
    out.push({ key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM') })
  }
  return out
}

/** 'yyyy-MM-dd' expense date -> its first-of-month bucket key. */
function bucketOf(expenseDate: string): string {
  return expenseDate.slice(0, 7) + '-01'
}

export interface MonthlyPoint {
  month: string
  income: number
  expense: number
  savings: number
}

/** Income (constant salary) vs. expense vs. savings for each month bucket. */
export function buildMonthlySeries(
  expenses: ExpenseWithCategory[],
  salary: number,
  buckets: MonthBucket[],
): MonthlyPoint[] {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    const k = bucketOf(e.expense_date)
    totals.set(k, (totals.get(k) ?? 0) + e.amount)
  }
  return buckets.map((b) => {
    const expense = totals.get(b.key) ?? 0
    return { month: b.label, income: salary, expense, savings: salary - expense }
  })
}

/**
 * Per-category current-vs-trailing spend, ready for detectAnomalies /
 * getLeakCategories. `current` = last bucket; `trailing` = the `trailingCount`
 * buckets before it (zero-filled for months with no spend).
 */
export function buildCategoryHistory(
  expenses: ExpenseWithCategory[],
  buckets: MonthBucket[],
  trailingCount = 3,
): CategoryHistory[] {
  if (buckets.length === 0) return []
  const currentKey = buckets[buckets.length - 1].key
  const trailingKeys = buckets
    .slice(Math.max(0, buckets.length - 1 - trailingCount), buckets.length - 1)
    .map((b) => b.key)

  const cats = new Map<string, { name: string; per: Map<string, number> }>()
  for (const e of expenses) {
    const id = e.category?.id ?? 'uncat'
    const name = e.category?.name ?? 'Uncategorised'
    const k = bucketOf(e.expense_date)
    let c = cats.get(id)
    if (!c) {
      c = { name, per: new Map() }
      cats.set(id, c)
    }
    c.per.set(k, (c.per.get(k) ?? 0) + e.amount)
  }

  return [...cats.entries()].map(([id, c]) => ({
    categoryId: id,
    categoryName: c.name,
    current: c.per.get(currentKey) ?? 0,
    trailing: trailingKeys.map((k) => c.per.get(k) ?? 0),
  }))
}

export interface CategoryStacks {
  rows: Array<Record<string, number | string>>
  series: string[]
  colors: Record<string, string>
}

/** Stacked-bar data: top `topN` categories per month, rest bucketed as "Other". */
export function buildCategoryStacks(
  expenses: ExpenseWithCategory[],
  buckets: MonthBucket[],
  topN = 5,
): CategoryStacks {
  const catTotals = new Map<
    string,
    { name: string; color: string; total: number }
  >()
  for (const e of expenses) {
    const id = e.category?.id ?? 'uncat'
    let c = catTotals.get(id)
    if (!c) {
      c = {
        name: e.category?.name ?? 'Uncategorised',
        color: e.category?.color ?? '#94a3b8',
        total: 0,
      }
      catTotals.set(id, c)
    }
    c.total += e.amount
  }

  const top = [...catTotals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, topN)
  const topIds = new Set(top.map(([id]) => id))
  const hasOther = catTotals.size > top.length

  const series = top.map(([, c]) => c.name)
  const colors: Record<string, string> = {}
  for (const [, c] of top) colors[c.name] = c.color
  if (hasOther) {
    series.push('Other')
    colors['Other'] = '#94a3b8'
  }

  const rows: Array<Record<string, number | string>> = buckets.map((b) => {
    const row: Record<string, number | string> = { month: b.label }
    for (const s of series) row[s] = 0
    return row
  })
  const rowByKey = new Map(buckets.map((b, i) => [b.key, rows[i]]))

  for (const e of expenses) {
    const row = rowByKey.get(bucketOf(e.expense_date))
    if (!row) continue
    const id = e.category?.id ?? 'uncat'
    const name = e.category?.name ?? 'Uncategorised'
    if (topIds.has(id)) row[name] = (row[name] as number) + e.amount
    else if (hasOther) row['Other'] = (row['Other'] as number) + e.amount
  }

  return { rows, series, colors }
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  upi: '#4f46e5',
  card: '#ec4899',
  cash: '#10b981',
  netbanking: '#f59e0b',
}

export interface PaymentSlice {
  name: string
  value: number
  color: string
}

/** Spend split by payment method across the supplied window. */
export function paymentBreakdown(
  expenses: ExpenseWithCategory[],
): PaymentSlice[] {
  const totals = new Map<PaymentMethod, number>()
  for (const e of expenses)
    totals.set(e.payment_method, (totals.get(e.payment_method) ?? 0) + e.amount)
  return PAYMENT_METHODS.map((pm) => ({
    name: pm.label,
    value: totals.get(pm.value) ?? 0,
    color: METHOD_COLORS[pm.value],
  })).filter((s) => s.value > 0)
}
