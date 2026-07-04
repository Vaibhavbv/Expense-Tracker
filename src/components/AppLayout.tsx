import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  Plus,
  ReceiptText,
  Settings,
  Target,
  Wallet,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AddExpenseDrawer } from '@/components/AddExpenseDrawer'
import { useEnsureRecurring } from '@/hooks/useRecurring'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const [addOpen, setAddOpen] = useState(false)
  useEnsureRecurring()

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <div className="flex items-center gap-2 px-2">
          <Wallet className="h-6 w-6 text-brand-600" />
          <span className="text-lg font-extrabold tracking-tight">Paisa</span>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500/10 text-brand-600'
                    : 'text-muted hover:bg-surface hover:text-content',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setAddOpen(true)}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </aside>

      {/* Main column */}
      <div className="md:pl-60">
        {/* Top bar (mobile-first) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur md:justify-end md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Wallet className="h-5 w-5 text-brand-600" />
            <span className="font-extrabold tracking-tight">Paisa</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 px-2 py-1.5 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition',
                isActive ? 'text-brand-600' : 'text-muted',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Floating action button (mobile) */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Add expense"
        className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddExpenseDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
