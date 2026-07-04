import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireOnboarded } from '@/components/guards'
import { AppLayout } from '@/components/AppLayout'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Expenses from '@/pages/Expenses'
import Analytics from '@/pages/Analytics'
import Budgets from '@/pages/Budgets'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Authenticated */}
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Authenticated + onboarded — the main app shell */}
        <Route element={<RequireOnboarded />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
