import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { Expense, ExpenseWithCategory, PaymentMethod } from '@/types/db'

const SELECT_WITH_CATEGORY =
  '*, category:categories(id, name, icon, color)'

export interface ExpenseFilters {
  from?: string // yyyy-MM-dd
  to?: string // yyyy-MM-dd
  categoryId?: string
  paymentMethod?: PaymentMethod
  search?: string
  page?: number
  pageSize?: number
}

/** Flexible list query used by the /expenses page. */
export function useExpenses(filters: ExpenseFilters = {}) {
  const { user } = useAuth()
  const { page = 0, pageSize = 25 } = filters
  const scope = JSON.stringify(filters)

  return useQuery({
    queryKey: qk.expenses(user?.id ?? 'anon', scope),
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY, { count: 'exact' })
        .eq('user_id', user!.id)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.from) query = query.gte('expense_date', filters.from)
      if (filters.to) query = query.lte('expense_date', filters.to)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
      if (filters.paymentMethod)
        query = query.eq('payment_method', filters.paymentMethod)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)

      query = query.range(page * pageSize, page * pageSize + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      return {
        rows: (data ?? []) as ExpenseWithCategory[],
        count: count ?? 0,
      }
    },
  })
}

/** All expenses for a given month (defaults to current) with category embed. */
export function useMonthExpenses(month: Date = new Date()) {
  const { user } = useAuth()
  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')

  return useQuery({
    queryKey: qk.expenses(user?.id ?? 'anon', `month:${from}`),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY)
        .eq('user_id', user!.id)
        .gte('expense_date', from)
        .lte('expense_date', to)
        .order('expense_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as ExpenseWithCategory[]
    },
  })
}

export type NewExpense = {
  amount: number
  category_id: string | null
  description?: string | null
  payment_method?: PaymentMethod
  expense_date?: string
}

export function useCreateExpense() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewExpense) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user!.id,
          amount: input.amount,
          category_id: input.category_id,
          description: input.description ?? null,
          payment_method: input.payment_method ?? 'upi',
          expense_date: input.expense_date ?? format(new Date(), 'yyyy-MM-dd'),
        })
        .select('*')
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['expenses', user?.id ?? 'anon'] }),
  })
}

export function useUpdateExpense() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Expense
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['expenses', user?.id ?? 'anon'] }),
  })
}

export function useDeleteExpense() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['expenses', user?.id ?? 'anon'] }),
  })
}
