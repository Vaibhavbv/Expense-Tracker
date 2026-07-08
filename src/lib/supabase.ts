import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// The public origin used for auth email links (confirm signup, password reset).
// Prefer an explicit VITE_SITE_URL (set this in Vercel to your production domain
// so links are correct regardless of where the build runs); otherwise fall back
// to the origin the app is currently served from.
export const siteUrl =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

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
