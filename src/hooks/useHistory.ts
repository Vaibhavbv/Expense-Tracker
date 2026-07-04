import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { ExpenseWithCategory } from '@/types/db'

/**
 * Fetches all expenses within a trailing window (default 12 months, including
 * the current month) for the analytics page to aggregate client-side.
 */
export function useExpenseHistory(months = 12) {
  const { user } = useAuth()
  const from = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')

  return useQuery({
    queryKey: qk.expenses(user?.id ?? 'anon', `history:${months}:${from}`),
    enabled: !!user,
    queryFn: async (): Promise<ExpenseWithCategory[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:categories(id, name, icon, color)')
        .eq('user_id', user!.id)
        .gte('expense_date', from)
        .order('expense_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpenseWithCategory[]
    },
  })
}
