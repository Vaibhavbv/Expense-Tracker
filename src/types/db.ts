// Application-facing types mirroring the Supabase schema (see supabase/migrations).

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'netbanking'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Net Banking' },
]

export interface Profile {
  id: string
  full_name: string | null
  monthly_salary: number
  salary_credit_day: number
  currency: string
  onboarded: boolean
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string | null
  is_default: boolean
  created_at: string
}

export interface RecurringExpense {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  label: string
  day_of_month: number
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  description: string | null
  payment_method: PaymentMethod
  expense_date: string // ISO date (yyyy-MM-dd)
  is_recurring: boolean
  recurring_expense_id: string | null
  created_at: string
}

/** Expense joined with its category (as returned by select with embed). */
export interface ExpenseWithCategory extends Expense {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  month: string // ISO date, first of month
  budget_amount: number
  created_at: string
}
