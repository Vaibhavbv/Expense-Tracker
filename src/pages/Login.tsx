import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

type Mode = 'signin' | 'signup'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) setError(error)
      } else {
        const { error, needsConfirmation } = await signUp(
          email,
          password,
          fullName,
        )
        if (error) setError(error)
        else if (needsConfirmation)
          setNotice('Check your inbox to confirm your email, then sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Wallet className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Paisa</h1>
            <p className="mt-1 text-sm text-muted">
              Track every rupee. Spot the leaks.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-content">
              Supabase isn't configured yet. Add your keys to{' '}
              <code className="font-mono">.env</code> and restart the dev server.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            {mode === 'signup' && (
              <Field
                label="Full name"
                type="text"
                value={fullName}
                onChange={setFullName}
                placeholder="Aarav Sharma"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />

            {error && <p className="mb-3 text-sm text-danger">{error}</p>}
            {notice && <p className="mb-3 text-sm text-positive">{notice}</p>}

            <Button
              type="submit"
              size="lg"
              loading={busy}
              className="w-full"
            >
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            {mode === 'signin' ? "New here?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
                setNotice(null)
              }}
              className="font-semibold text-brand-600 hover:underline"
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-content outline-none focus:ring-2 focus:ring-brand-500"
      />
    </label>
  )
}
