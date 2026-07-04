import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Check, Download, LogOut, Plus, Trash2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CategoryIcon } from '@/components/CategoryIcon'
import { useAuth } from '@/context/AuthContext'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import {
  useCategories,
  useDeleteCategory,
  useUpsertCategory,
} from '@/hooks/useCategories'
import {
  useCreateRecurring,
  useDeleteRecurring,
  useRecurringExpenses,
} from '@/hooks/useRecurring'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import type { Category } from '@/types/db'

export default function Settings() {
  const { user, signOut } = useAuth()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <ProfileSection />
      <CategoriesSection />
      <RecurringSection />

      <Card className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Appearance</h3>
          <p className="text-sm text-muted">Switch between light and dark.</p>
        </div>
        <ThemeToggle />
      </Card>

      <DataSection userId={user?.id} email={user?.email} onSignOut={signOut} />
    </div>
  )
}

// ---------------------------------------------------------------------------
function ProfileSection() {
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const [fullName, setFullName] = useState('')
  const [salary, setSalary] = useState('')
  const [creditDay, setCreditDay] = useState('1')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setSalary(String(profile.monthly_salary ?? ''))
      setCreditDay(String(profile.salary_credit_day ?? 1))
    }
  }, [profile])

  async function save() {
    await update.mutateAsync({
      full_name: fullName.trim() || null,
      monthly_salary: parseFloat(salary) || 0,
      salary_credit_day: Number(creditDay),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="space-y-4">
      <h3 className="font-semibold">Profile</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Monthly salary</span>
          <div className="flex items-center rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-brand-500">
            <span className="text-muted">₹</span>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-transparent px-2 py-2 text-sm outline-none tabular"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">
            Salary credited on day
          </span>
          <select
            value={creditDay}
            onChange={(e) => setCreditDay(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={update.isPending}>
          Save profile
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-positive">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
function CategoriesSection() {
  const { data: categories } = useCategories()
  const upsert = useUpsertCategory()
  const del = useDeleteCategory()
  const [newName, setNewName] = useState('')

  const PALETTE = ['#f97316', '#6366f1', '#22c55e', '#ec4899', '#14b8a6', '#64748b']

  return (
    <Card>
      <h3 className="font-semibold">Categories</h3>
      <p className="mt-1 text-sm text-muted">
        Rename inline, remove ones you don't use, or add your own.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {(categories ?? []).map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            onRename={(name) =>
              upsert.mutate({ id: c.id, name, icon: c.icon ?? undefined, color: c.color ?? undefined })
            }
            onDelete={() => del.mutate(c.id)}
          />
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category"
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button
          variant="outline"
          loading={upsert.isPending}
          onClick={() => {
            const name = newName.trim()
            if (!name) return
            upsert.mutate({
              name,
              icon: 'shapes',
              color: PALETTE[(categories?.length ?? 0) % PALETTE.length],
            })
            setNewName('')
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </Card>
  )
}

function CategoryRow({
  category,
  onRename,
  onDelete,
}: {
  category: Category
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(category.name)
  return (
    <li className="flex items-center gap-3 py-2">
      <CategoryIcon icon={category.icon} color={category.color} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim()
          if (trimmed && trimmed !== category.name) onRename(trimmed)
          else setName(category.name)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-border focus:border-brand-500 focus:bg-surface"
      />
      <button
        onClick={onDelete}
        className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger"
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

// ---------------------------------------------------------------------------
function RecurringSection() {
  const { data: categories } = useCategories()
  const { data: recurring } = useRecurringExpenses()
  const create = useCreateRecurring()
  const del = useDeleteRecurring()

  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [day, setDay] = useState('1')

  const amountNum = parseFloat(amount) || 0
  const valid = label.trim() && amountNum > 0

  return (
    <Card>
      <h3 className="font-semibold">Recurring expenses</h3>
      <p className="mt-1 text-sm text-muted">
        Auto-logged each month on the chosen day.
      </p>

      {(recurring ?? []).length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {(recurring ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span>
                {r.label}{' '}
                <span className="text-muted">· day {r.day_of_month}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular font-semibold">{formatINR(r.amount)}</span>
                <button
                  onClick={() => del.mutate(r.id)}
                  className="text-muted hover:text-danger"
                  aria-label="Delete recurring"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Netflix)"
          className="col-span-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="number"
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
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          className="col-span-2"
          disabled={!valid}
          loading={create.isPending}
          onClick={() => {
            create.mutate({
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
    </Card>
  )
}

// ---------------------------------------------------------------------------
function DataSection({
  userId,
  email,
  onSignOut,
}: {
  userId?: string
  email?: string
  onSignOut: () => void
}) {
  const [exporting, setExporting] = useState(false)

  async function exportCsv() {
    if (!userId) return
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          'expense_date, amount, description, payment_method, is_recurring, category:categories(name)',
        )
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })
      if (error) throw error

      const header = [
        'Date',
        'Category',
        'Description',
        'Amount',
        'Payment Method',
        'Recurring',
      ]
      const lines = (data ?? []).map((e) => {
        const cat = e.category as { name?: string } | { name?: string }[] | null
        const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name
        return [
          e.expense_date,
          catName ?? '',
          e.description ?? '',
          e.amount,
          e.payment_method,
          e.is_recurring ? 'yes' : 'no',
        ]
      })
      const csv = [header, ...lines]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paisa-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold">Data & account</h3>
        <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={exportCsv} loading={exporting}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="danger" onClick={onSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </Card>
  )
}
