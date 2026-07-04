import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && anonKey && url !== 'your-supabase-url',
)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY (in .env locally, or in your Vercel project ' +
      'settings) and rebuild.',
  )
}

// Fall back to a syntactically-valid placeholder when unconfigured so
// createClient() doesn't throw at import time (which would blank the whole
// app). Auth calls are short-circuited elsewhere via isSupabaseConfigured.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'

export const supabase = createClient(
  isSupabaseConfigured ? url : FALLBACK_URL,
  isSupabaseConfigured ? anonKey : FALLBACK_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
