import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { Spinner } from '@/components/ui'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

/** Blocks a route until there is an authenticated session. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Blocks the main app until the user has completed onboarding. */
export function RequireOnboarded() {
  const { data: profile, isLoading } = useProfile()
  if (isLoading) return <FullScreenLoader />
  if (!profile?.onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
