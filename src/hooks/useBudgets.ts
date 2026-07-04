import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { Budget } from '@/types/db'

/** Normalises any date to the first-of-month key used by the budgets table. */
export function monthKey(date: Date = new Date()): string {
  return format(startOfMonth(date), 'yyyy-MM-dd')
}

export function useBudgets(month: Date = new Date()) {
  const { user } = useAuth()
  const key = monthKey(month)
  return useQuery({
    queryKey: qk.budgets(user?.id ?? 'anon', key),
    enabled: !!user,
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user!.id)
        .eq('month', key)
      if (error) throw error
      return (data ?? []) as Budget[]
    },
  })
}

export function useUpsertBudget(month: Date = new Date()) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const key = monthKey(month)
  return useMutation({
    mutationFn: async (input: { category_id: string; budget_amount: number }) => {
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          {
            user_id: user!.id,
            category_id: input.category_id,
            month: key,
            budget_amount: input.budget_amount,
          },
          { onConflict: 'user_id,category_id,month' },
        )
        .select('*')
        .single()
      if (error) throw error
      return data as Budget
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.budgets(user?.id ?? 'anon', key) }),
  })
}

export function useDeleteBudget(month: Date = new Date()) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const key = monthKey(month)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.budgets(user?.id ?? 'anon', key) }),
  })
}
