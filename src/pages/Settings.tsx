import { LogOut } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { formatINR } from '@/lib/format'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <Card>
        <h3 className="font-semibold">Profile</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Name" value={profile?.full_name || '—'} />
          <Row label="Email" value={user?.email ?? '—'} />
          <Row
            label="Monthly salary"
            value={profile ? formatINR(profile.monthly_salary) : '—'}
          />
          <Row
            label="Salary credited on"
            value={profile ? `Day ${profile.salary_credit_day}` : '—'}
          />
        </dl>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Appearance</h3>
          <p className="text-sm text-muted">Switch between light and dark.</p>
        </div>
        <ThemeToggle />
      </Card>

      <Card>
        <h3 className="font-semibold">Data & account</h3>
        <p className="mt-1 text-sm text-muted">
          Editing salary, categories, recurring expenses and CSV export land in
          the next build.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
