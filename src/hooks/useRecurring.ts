import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  endOfMonth,
  format,
  getDate,
  getDaysInMonth,
  setDate,
  startOfMonth,
} from 'date-fns'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { RecurringExpense } from '@/types/db'

export function useRecurringExpenses() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.recurring(user?.id ?? 'anon'),
    enabled: !!user,
    queryFn: async (): Promise<RecurringExpense[]> => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user!.id)
        .order('day_of_month')
      if (error) throw error
      return (data ?? []) as RecurringExpense[]
    },
  })
}

export type NewRecurring = {
  label: string
  amount: number
  category_id: string | null
  day_of_month: number
}

export function useCreateRecurring() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewRecurring) => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({ ...input, user_id: user!.id })
        .select('*')
        .single()
      if (error) throw error
      return data as RecurringExpense
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.recurring(user?.id ?? 'anon') }),
  })
}

export function useDeleteRecurring() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.recurring(user?.id ?? 'anon') }),
  })
}

/**
 * v1 recurring generation (client-side): on app load, for each active recurring
 * template whose day_of_month has already arrived this month, insert a matching
 * expense if one doesn't already exist for this month.
 *
 * Tradeoff vs. a scheduled edge function: this only runs when the user opens the
 * app, so an entry appears on the next visit after its due day rather than at
 * midnight. Dedup relies on (recurring_expense_id, this month) so opening the
 * app repeatedly never double-inserts. For a single-user tracker this is the
 * simplest reliable approach; a pg_cron / edge function can replace it later.
 */
export async function ensureRecurringForCurrentMonth(
  userId: string,
): Promise<number> {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const today = getDate(now)
  const daysInMonth = getDaysInMonth(now)

  const { data: recs, error: recErr } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (recErr) throw recErr

  const due = (recs ?? []).filter((r) => r.day_of_month <= today)
  if (due.length === 0) return 0

  const { data: existing, error: exErr } = await supabase
    .from('expenses')
    .select('recurring_expense_id')
    .eq('user_id', userId)
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd)
    .not('recurring_expense_id', 'is', null)
  if (exErr) throw exErr

  const existingIds = new Set(
    (existing ?? []).map((e) => e.recurring_expense_id),
  )

  const toInsert = due
    .filter((r) => !existingIds.has(r.id))
    .map((r) => ({
      user_id: userId,
      category_id: r.category_id,
      amount: r.amount,
      description: r.label,
      payment_method: 'netbanking' as const,
      expense_date: format(
        setDate(now, Math.min(r.day_of_month, daysInMonth)),
        'yyyy-MM-dd',
      ),
      is_recurring: true,
      recurring_expense_id: r.id,
    }))

  if (toInsert.length === 0) return 0

  const { error } = await supabase.from('expenses').insert(toInsert)
  if (error) throw error
  return toInsert.length
}

/** Runs the recurring check once per mount for the signed-in user. */
export function useEnsureRecurring() {
  const { user } = useAuth()
  const qc = useQueryClient()
  useEffect(() => {
    if (!user) return
    ensureRecurringForCurrentMonth(user.id)
      .then((n) => {
        if (n > 0) {
          qc.invalidateQueries({ queryKey: ['expenses', user.id] })
        }
      })
      .catch(() => {
        /* non-fatal: recurring generation is best-effort */
      })
  }, [user, qc])
}
