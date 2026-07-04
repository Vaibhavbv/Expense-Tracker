import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Trash2, Wallet } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { CategoryIcon } from '@/components/CategoryIcon'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import {
  useCategories,
  useDeleteCategory,
  useUpsertCategory,
} from '@/hooks/useCategories'
import { useCreateRecurring } from '@/hooks/useRecurring'
import { formatINR } from '@/lib/format'

interface DraftRecurring {
  label: string
  amount: number
  category_id: string | null
  day_of_month: number
}

const PALETTE = ['#f97316', '#6366f1', '#22c55e', '#ec4899', '#14b8a6', '#64748b']

export default function Onboarding() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const { data: categories } = useCategories()
  const updateProfile = useUpdateProfile()
  const upsertCategory = useUpsertCategory()
  const deleteCategory = useDeleteCategory()
  const createRecurring = useCreateRecurring()

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [salary, setSalary] = useState('')
  const [creditDay, setCreditDay] = useState('1')
  const [newCat, setNewCat] = useState('')
  const [draft, setDraft] = useState<DraftRecurring[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      if (profile.monthly_salary) setSalary(String(profile.monthly_salary))
      if (profile.salary_credit_day)
        setCreditDay(String(profile.salary_credit_day))
    }
  }, [profile])

  const salaryNum = parseFloat(salary) || 0

  async function addCustomCategory() {
    const name = newCat.trim()
    if (!name) return
    const color = PALETTE[(categories?.length ?? 0) % PALETTE.length]
    await upsertCategory.mutateAsync({ name, icon: 'shapes', color })
    setNewCat('')
  }

  async function finish() {
    setError(null)
    if (salaryNum <= 0) {
      setStep(1)
      setError('Enter your monthly salary to continue.')
      return
    }
    setSaving(true)
    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim() || null,
        monthly_salary: salaryNum,
        salary_credit_day: Number(creditDay),
        onboarded: true,
      })
      for (const r of draft) {
        await createRecurring.mutateAsync(r)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-brand-600" />
          <span className="font-extrabold tracking-tight">Paisa</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-lg px-4 pb-16">
        <Stepper step={step} />

        {step === 1 && (
          <Card className="mt-6">
            <h2 className="text-xl font-bold">Let's set up your month</h2>
            <p className="mt-1 text-sm text-muted">
              Your salary anchors every budget and savings insight.
            </p>

            <label className="mt-6 block">
              <span className="mb-1 block text-sm font-medium text-muted">
                Your name
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-muted">
                Monthly salary (in-hand)
              </span>
              <div className="flex items-center rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-brand-500">
                <span className="text-lg font-semibold text-muted">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="80000"
                  className="w-full bg-transparent px-2 py-2.5 text-lg font-semibold outline-none tabular"
                />
              </div>
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-muted">
                Salary credited on day
              </span>
              <select
                value={creditDay}
                onChange={(e) => setCreditDay(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={salaryNum <= 0}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="mt-6">
            <h2 className="text-xl font-bold">Review your categories</h2>
            <p className="mt-1 text-sm text-muted">
              We've added the essentials. Remove any you won't use, or add your
              own. You can always change these later.
            </p>

            <ul className="mt-5 divide-y divide-border">
              {(categories ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <span className="flex-1 text-sm">{c.name}</span>
                  <button
                    onClick={() => deleteCategory.mutate(c.id)}
                    className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger"
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2">
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomCategory()
                  }
                }}
                placeholder="Add a custom category"
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button
                variant="outline"
                onClick={addCustomCategory}
                loading={upsertCategory.isPending}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="mt-6">
            <h2 className="text-xl font-bold">Recurring expenses</h2>
            <p className="mt-1 text-sm text-muted">
              Rent, EMIs, subscriptions — anything that hits every month. We'll
              auto-log these for you. (Optional — you can skip.)
            </p>

            <RecurringForm
              categories={(categories ?? []).map((c) => ({
                id: c.id,
                name: c.name,
              }))}
              onAdd={(r) => setDraft((d) => [...d, r])}
            />

            {draft.length > 0 && (
              <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
                {draft.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span>
                      {r.label}{' '}
                      <span className="text-muted">· day {r.day_of_month}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold tabular">
                        {formatINR(r.amount)}
                      </span>
                      <button
                        onClick={() =>
                          setDraft((d) => d.filter((_, idx) => idx !== i))
                        }
                        className="text-muted hover:text-danger"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                className="flex-1"
                size="lg"
                loading={saving}
                onClick={finish}
              >
                <Check className="h-4 w-4" /> Finish setup
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  const labels = ['Income', 'Categories', 'Recurring']
  return (
    <div className="mt-2 flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1
        const active = step === n
        const done = step > n
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? 'bg-positive text-white'
                  : active
                    ? 'bg-brand-600 text-white'
                    : 'bg-border text-muted'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <span
              className={`hidden text-xs font-medium sm:block ${
                active ? 'text-content' : 'text-muted'
              }`}
            >
              {label}
            </span>
            {n < 3 && <div className="h-px flex-1 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function RecurringForm({
  categories,
  onAdd,
}: {
  categories: { id: string; name: string }[]
  onAdd: (r: DraftRecurring) => void
}) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [day, setDay] = useState('1')

  const amountNum = parseFloat(amount) || 0
  const valid = label.trim() && amountNum > 0

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Rent)"
        className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount ₹"
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
      />
      <select
        value={day}
        onChange={(e) => setDay(e.target.value)}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            Day {d}
          </option>
        ))}
      </select>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Category (optional)</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        className="col-span-2"
        disabled={!valid}
        onClick={() => {
          onAdd({
            label: label.trim(),
            amount: amountNum,
            category_id: categoryId || null,
            day_of_month: Number(day),
          })
          setLabel('')
          setAmount('')
          setCategoryId('')
          setDay('1')
        }}
      >
        <Plus className="h-4 w-4" /> Add recurring expense
      </Button>
    </div>
  )
}
