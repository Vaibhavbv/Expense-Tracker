import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { Category } from '@/types/db'

export function useCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.categories(user?.id ?? 'anon'),
    enabled: !!user,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('name')
      if (error) throw error
      return (data ?? []) as Category[]
    },
  })
}

export function useUpsertCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: Partial<Category> & { name: string; icon?: string; color?: string },
    ) => {
      const row = { ...input, user_id: user!.id }
      const { data, error } = await supabase
        .from('categories')
        .upsert(row)
        .select('*')
        .single()
      if (error) throw error
      return data as Category
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.categories(user?.id ?? 'anon') }),
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.categories(user?.id ?? 'anon') }),
  })
}
