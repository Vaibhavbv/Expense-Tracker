// Pure, unit-testable insight functions. No React, no Supabase, no `Date.now()`
// side effects unless a reference date is passed in — so every branch is testable.

// ---------------------------------------------------------------------------
// Savings rate
// ---------------------------------------------------------------------------

/** (income - expense) / income, clamped to a sensible range; 0 when income <= 0. */
export function getSavingsRate(income: number, expense: number): number {
  if (income <= 0) return 0
  return (income - expense) / income
}

// ---------------------------------------------------------------------------
// Budget status
// ---------------------------------------------------------------------------

export type BudgetLevel = 'under' | 'near' | 'over'

export interface BudgetStatus {
  spent: number
  budget: number
  ratio: number // spent / budget (0..∞); 0 when no budget set
  remaining: number
  level: BudgetLevel // under (<70%), near (70–100%), over (>100%)
}

/** Traffic-light budget status. `near` starts at 70%, `over` above 100%. */
export function getBudgetStatus(spent: number, budget: number): BudgetStatus {
  const ratio = budget > 0 ? spent / budget : 0
  let level: BudgetLevel = 'under'
  if (ratio > 1) level = 'over'
  else if (ratio >= 0.7) level = 'near'
  return {
    spent,
    budget,
    ratio,
    remaining: budget - spent,
    level,
  }
}

// ---------------------------------------------------------------------------
// Burn rate / month-end projection
// ---------------------------------------------------------------------------

export interface BurnRate {
  spentSoFar: number
  daysElapsed: number
  daysInMonth: number
  dailyAverage: number
  /** Linear projection of total spend by month-end. */
  projectedTotal: number
  projectedSavings: number
  projectedSavingsRate: number
  /** True when the projected month-end spend exceeds the salary/budget. */
  onTrackToOverspend: boolean
}

/**
 * Projects month-end total spend from the run-rate so far.
 *
 * @param expenses    This month's expenses (only `.amount` is read).
 * @param salary      Monthly income / ceiling to compare the projection against.
 * @param dayOfMonth  Current day of month (1-31) = days elapsed.
 * @param daysInMonth Total days in the month (defaults to 30).
 */
export function calculateBurnRate(
  expenses: Array<{ amount: number }>,
  salary: number,
  dayOfMonth: number,
  daysInMonth = 30,
): BurnRate {
  const spentSoFar = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const daysElapsed = Math.max(1, Math.min(dayOfMonth, daysInMonth))
  const dailyAverage = spentSoFar / daysElapsed
  const projectedTotal = dailyAverage * daysInMonth
  const projectedSavings = salary - projectedTotal
  return {
    spentSoFar,
    daysElapsed,
    daysInMonth,
    dailyAverage,
    projectedTotal,
    projectedSavings,
    projectedSavingsRate: getSavingsRate(salary, projectedTotal),
    onTrackToOverspend: salary > 0 && projectedTotal > salary,
  }
}

// ---------------------------------------------------------------------------
// Anomaly detection (z-score vs. trailing months)
// ---------------------------------------------------------------------------

export interface CategoryHistory {
  categoryId: string
  categoryName: string
  /** This month's spend for the category. */
  current: number
  /** Prior months' spend, most recent first or any order (e.g. last 3 months). */
  trailing: number[]
}

export interface Anomaly {
  categoryId: string
  categoryName: string
  current: number
  mean: number
  stdDev: number
  zScore: number
  /** (current - mean) / mean — the human-friendly "% above usual". */
  pctAboveUsual: number
  message: string
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[], avg: number): number {
  if (values.length === 0) return 0
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Flags categories whose current-month spend sits more than `threshold`
 * standard deviations above their trailing average. When the trailing spend is
 * flat (stdDev = 0) we fall back to a 40%-above-mean rule so genuine spikes on
 * previously-steady categories are still caught. Requires at least a small base
 * (mean > 0) and 2+ trailing points to avoid noise on brand-new categories.
 */
export function detectAnomalies(
  history: CategoryHistory[],
  threshold = 1.5,
): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (const h of history) {
    if (h.trailing.length < 2) continue
    const avg = mean(h.trailing)
    if (avg <= 0) continue

    const sd = stdDev(h.trailing, avg)
    const pctAboveUsual = (h.current - avg) / avg
    const zScore = sd > 0 ? (h.current - avg) / sd : 0

    const flagged =
      h.current > avg &&
      (sd > 0 ? zScore >= threshold : pctAboveUsual >= 0.4)

    if (!flagged) continue

    anomalies.push({
      categoryId: h.categoryId,
      categoryName: h.categoryName,
      current: h.current,
      mean: avg,
      stdDev: sd,
      zScore,
      pctAboveUsual,
      message: `${h.categoryName} is ${Math.round(
        pctAboveUsual * 100,
      )}% higher than your usual this month`,
    })
  }

  // Most extreme first.
  return anomalies.sort((a, b) => b.pctAboveUsual - a.pctAboveUsual)
}

// ---------------------------------------------------------------------------
// Weekday spending pattern
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface WeekdaySpend {
  weekday: number // 0 = Sunday .. 6 = Saturday
  label: string
  total: number
  /** Number of distinct calendar dates on this weekday that had spend. */
  activeDays: number
  /** total / activeDays — spend on a "typical" such weekday. */
  average: number
}

/**
 * Average spend per weekday across all supplied history. `average` normalises
 * by the number of distinct dates seen for that weekday, so a weekday that
 * simply occurs more often isn't unfairly inflated.
 */
export function getWeekdayPattern(
  expenses: Array<{ amount: number; expense_date: string }>,
): WeekdaySpend[] {
  const totals = new Array(7).fill(0)
  const datesByWeekday: Array<Set<string>> = Array.from(
    { length: 7 },
    () => new Set<string>(),
  )

  for (const e of expenses) {
    // expense_date is 'yyyy-MM-dd'; parse as local date without TZ drift.
    const [y, m, d] = e.expense_date.split('-').map(Number)
    if (!y || !m || !d) continue
    const weekday = new Date(y, m - 1, d).getDay()
    totals[weekday] += e.amount || 0
    datesByWeekday[weekday].add(e.expense_date)
  }

  return WEEKDAY_LABELS.map((label, weekday) => {
    const activeDays = datesByWeekday[weekday].size
    return {
      weekday,
      label,
      total: totals[weekday],
      activeDays,
      average: activeDays > 0 ? totals[weekday] / activeDays : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// "Leak" categories — steady, low-variance drains
// ---------------------------------------------------------------------------

export interface LeakCategory {
  categoryId: string
  categoryName: string
  averageMonthly: number
  /** Coefficient of variation (stdDev / mean); lower = steadier drain. */
  variability: number
}

/**
 * Ranks categories by how *steady* they are relative to their size — a low
 * coefficient of variation on a non-trivial average signals a recurring leak
 * (subscriptions, food delivery) rather than one-off spend.
 */
export function getLeakCategories(
  history: CategoryHistory[],
  limit = 5,
): LeakCategory[] {
  return history
    .map((h) => {
      const series = [...h.trailing, h.current].filter((v) => v >= 0)
      const avg = mean(series)
      const sd = stdDev(series, avg)
      return {
        categoryId: h.categoryId,
        categoryName: h.categoryName,
        averageMonthly: avg,
        variability: avg > 0 ? sd / avg : Infinity,
      }
    })
    .filter((c) => c.averageMonthly > 0 && Number.isFinite(c.variability))
    .sort((a, b) => a.variability - b.variability)
    .slice(0, limit)
}
