import { describe, expect, it } from 'vitest'
import {
  calculateBurnRate,
  detectAnomalies,
  getBudgetStatus,
  getLeakCategories,
  getSavingsRate,
  getWeekdayPattern,
} from './insights'

describe('getSavingsRate', () => {
  it('computes (income - expense) / income', () => {
    expect(getSavingsRate(100000, 60000)).toBeCloseTo(0.4)
  })
  it('returns 0 for non-positive income', () => {
    expect(getSavingsRate(0, 500)).toBe(0)
    expect(getSavingsRate(-100, 50)).toBe(0)
  })
  it('can go negative when overspending', () => {
    expect(getSavingsRate(1000, 1500)).toBeCloseTo(-0.5)
  })
})

describe('getBudgetStatus', () => {
  it('flags under below 70%', () => {
    expect(getBudgetStatus(600, 1000).level).toBe('under')
  })
  it('flags near between 70% and 100%', () => {
    expect(getBudgetStatus(700, 1000).level).toBe('near')
    expect(getBudgetStatus(1000, 1000).level).toBe('near')
  })
  it('flags over above 100%', () => {
    expect(getBudgetStatus(1200, 1000).level).toBe('over')
  })
  it('reports remaining and ratio', () => {
    const s = getBudgetStatus(250, 1000)
    expect(s.ratio).toBeCloseTo(0.25)
    expect(s.remaining).toBe(750)
  })
  it('handles no budget set', () => {
    const s = getBudgetStatus(500, 0)
    expect(s.ratio).toBe(0)
    expect(s.level).toBe('under')
  })
})

describe('calculateBurnRate', () => {
  const expenses = [{ amount: 1000 }, { amount: 500 }, { amount: 500 }] // 2000

  it('projects month-end total from the daily run-rate', () => {
    // 2000 over 10 days = 200/day -> 30 days = 6000
    const b = calculateBurnRate(expenses, 50000, 10, 30)
    expect(b.spentSoFar).toBe(2000)
    expect(b.dailyAverage).toBeCloseTo(200)
    expect(b.projectedTotal).toBeCloseTo(6000)
    expect(b.projectedSavings).toBeCloseTo(44000)
    expect(b.onTrackToOverspend).toBe(false)
  })

  it('detects on-track-to-overspend', () => {
    // 2000 over 2 days = 1000/day -> 30 days = 30000 > 20000 salary
    const b = calculateBurnRate(expenses, 20000, 2, 30)
    expect(b.projectedTotal).toBeCloseTo(30000)
    expect(b.onTrackToOverspend).toBe(true)
  })

  it('guards against day 0', () => {
    const b = calculateBurnRate(expenses, 50000, 0, 30)
    expect(b.daysElapsed).toBe(1)
    expect(Number.isFinite(b.projectedTotal)).toBe(true)
  })
})

describe('detectAnomalies', () => {
  it('flags a category >1.5 std devs above trailing average', () => {
    const out = detectAnomalies([
      {
        categoryId: 'c1',
        categoryName: 'Food & Dining',
        current: 9000,
        trailing: [5000, 5200, 4800], // mean ~5000, small sd
      },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].categoryName).toBe('Food & Dining')
    expect(out[0].pctAboveUsual).toBeGreaterThan(0.5)
    expect(out[0].message).toMatch(/higher than your usual/)
  })

  it('does not flag spend within normal variance', () => {
    const out = detectAnomalies([
      {
        categoryId: 'c1',
        categoryName: 'Groceries',
        current: 5100,
        trailing: [5000, 4900, 5200],
      },
    ])
    expect(out).toHaveLength(0)
  })

  it('falls back to a 40% rule when trailing is perfectly flat', () => {
    const flat = detectAnomalies([
      {
        categoryId: 'c1',
        categoryName: 'Subscriptions',
        current: 1500,
        trailing: [1000, 1000, 1000],
      },
    ])
    expect(flat).toHaveLength(1)

    const smallBump = detectAnomalies([
      {
        categoryId: 'c1',
        categoryName: 'Subscriptions',
        current: 1200,
        trailing: [1000, 1000, 1000],
      },
    ])
    expect(smallBump).toHaveLength(0)
  })

  it('ignores categories with too little history', () => {
    const out = detectAnomalies([
      {
        categoryId: 'c1',
        categoryName: 'Travel',
        current: 20000,
        trailing: [1000], // only one prior month
      },
    ])
    expect(out).toHaveLength(0)
  })
})

describe('getWeekdayPattern', () => {
  it('aggregates spend by weekday and averages per active day', () => {
    // 2024-01-01 is a Monday.
    const pattern = getWeekdayPattern([
      { amount: 100, expense_date: '2024-01-01' }, // Mon
      { amount: 300, expense_date: '2024-01-08' }, // Mon (different date)
      { amount: 50, expense_date: '2024-01-06' }, // Sat
    ])
    const mon = pattern.find((p) => p.label === 'Mon')!
    const sat = pattern.find((p) => p.label === 'Sat')!
    expect(mon.total).toBe(400)
    expect(mon.activeDays).toBe(2)
    expect(mon.average).toBe(200)
    expect(sat.total).toBe(50)
    expect(pattern).toHaveLength(7)
  })
})

describe('getLeakCategories', () => {
  it('ranks steady drains above volatile ones', () => {
    const leaks = getLeakCategories([
      {
        categoryId: 'sub',
        categoryName: 'Subscriptions',
        current: 999,
        trailing: [999, 999, 999], // zero variance
      },
      {
        categoryId: 'shop',
        categoryName: 'Shopping',
        current: 8000,
        trailing: [500, 12000, 200], // wildly variable
      },
    ])
    expect(leaks[0].categoryName).toBe('Subscriptions')
    expect(leaks[0].variability).toBeLessThan(leaks[1].variability)
  })

  it('excludes zero-spend categories', () => {
    const leaks = getLeakCategories([
      {
        categoryId: 'x',
        categoryName: 'Unused',
        current: 0,
        trailing: [0, 0, 0],
      },
    ])
    expect(leaks).toHaveLength(0)
  })
})
