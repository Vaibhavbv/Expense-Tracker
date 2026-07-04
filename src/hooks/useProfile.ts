import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { Profile } from '@/types/db'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.profile(user?.id ?? 'anon'),
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      // Upsert (not update) so a missing profile row is created rather than
      // silently updating zero rows.
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user!.id, ...patch })
        .select('*')
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile(user?.id ?? 'anon') })
    },
  })
}
