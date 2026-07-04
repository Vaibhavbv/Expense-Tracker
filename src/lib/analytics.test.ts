import { describe, expect, it } from 'vitest'
import {
  buildCategoryHistory,
  buildCategoryStacks,
  buildMonthlySeries,
  paymentBreakdown,
  type MonthBucket,
} from './analytics'
import type { ExpenseWithCategory } from '@/types/db'

const buckets: MonthBucket[] = [
  { key: '2024-01-01', label: 'Jan' },
  { key: '2024-02-01', label: 'Feb' },
]

function exp(
  partial: Partial<ExpenseWithCategory> & {
    amount: number
    expense_date: string
  },
): ExpenseWithCategory {
  return {
    id: Math.random().toString(),
    user_id: 'u',
    category_id: partial.category?.id ?? null,
    description: null,
    payment_method: 'upi',
    is_recurring: false,
    recurring_expense_id: null,
    created_at: '',
    category: null,
    ...partial,
  } as ExpenseWithCategory
}

describe('buildMonthlySeries', () => {
  it('aggregates expense per month and derives savings from salary', () => {
    const series = buildMonthlySeries(
      [
        exp({ amount: 1000, expense_date: '2024-01-05' }),
        exp({ amount: 500, expense_date: '2024-01-20' }),
        exp({ amount: 2000, expense_date: '2024-02-10' }),
      ],
      10000,
      buckets,
    )
    expect(series[0]).toMatchObject({ month: 'Jan', expense: 1500, savings: 8500 })
    expect(series[1]).toMatchObject({ month: 'Feb', expense: 2000, savings: 8000 })
    expect(series[0].income).toBe(10000)
  })
})

describe('buildCategoryHistory', () => {
  it('splits current vs trailing months per category', () => {
    const cat = { id: 'food', name: 'Food', icon: null, color: '#f00' }
    const hist = buildCategoryHistory(
      [
        exp({ amount: 1000, expense_date: '2024-01-05', category: cat }),
        exp({ amount: 3000, expense_date: '2024-02-05', category: cat }),
      ],
      buckets,
      3,
    )
    expect(hist).toHaveLength(1)
    expect(hist[0].current).toBe(3000) // Feb is the last bucket
    expect(hist[0].trailing).toEqual([1000]) // Jan
  })
})

describe('buildCategoryStacks', () => {
  it('produces a row per month with category columns', () => {
    const food = { id: 'food', name: 'Food', icon: null, color: '#f00' }
    const rent = { id: 'rent', name: 'Rent', icon: null, color: '#00f' }
    const { rows, series } = buildCategoryStacks(
      [
        exp({ amount: 1000, expense_date: '2024-01-05', category: food }),
        exp({ amount: 8000, expense_date: '2024-01-01', category: rent }),
        exp({ amount: 1200, expense_date: '2024-02-05', category: food }),
      ],
      buckets,
      5,
    )
    expect(series).toContain('Food')
    expect(series).toContain('Rent')
    expect(rows[0]).toMatchObject({ month: 'Jan', Food: 1000, Rent: 8000 })
    expect(rows[1]).toMatchObject({ month: 'Feb', Food: 1200 })
  })
})

describe('paymentBreakdown', () => {
  it('sums spend per payment method and drops empty ones', () => {
    const slices = paymentBreakdown([
      exp({ amount: 500, expense_date: '2024-01-01', payment_method: 'upi' }),
      exp({ amount: 300, expense_date: '2024-01-02', payment_method: 'upi' }),
      exp({ amount: 900, expense_date: '2024-01-03', payment_method: 'card' }),
    ])
    const upi = slices.find((s) => s.name === 'UPI')!
    expect(upi.value).toBe(800)
    expect(slices.every((s) => s.value > 0)).toBe(true)
    expect(slices.find((s) => s.name === 'Cash')).toBeUndefined()
  })
})
