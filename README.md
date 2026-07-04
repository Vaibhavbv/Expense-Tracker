# Paisa — Personal Expense Tracker 💸

A monthly expense tracker for a salaried individual in India. You set up your
salary and recurring expenses once, then log day-to-day spends — and the app
surfaces **behavioural insights**: where money leaks, how patterns shift, and
early warnings *before* a budget is blown. Amounts are in **INR (₹)**.

> Currently a **foundation build**: auth, onboarding, and the dashboard are fully
> implemented, along with the complete database schema and the insight engine.
> Expenses / Analytics / Budgets pages are scaffolded as placeholders (their data
> layer and pure logic already exist) and are next up.

## Tech stack

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** (light/dark, mobile-first)
- **Supabase** — email/password auth + Postgres with Row Level Security
- **React Router** for navigation
- **TanStack Query** for data fetching/caching
- **Recharts** for charts, **date-fns** for dates
- Deploys to **Vercel** (`vercel.json` included)

> The toolchain is pinned to React 18 / Vite 5 / TypeScript 5 so it runs on
> Node 20.18. (Newer scaffolds pull Vite 8, which requires Node ≥ 20.19.)

## Prerequisites

- Node.js 20.18+ and npm
- A free [Supabase](https://supabase.com) project

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase keys
npm run dev            # http://localhost:5173
```

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com). From
**Project Settings → API**, copy the **Project URL** and the **anon public** key.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The `.env` file is git-ignored — **never commit real keys**. The anon key is
safe in the browser; access is enforced by RLS.

### 3. Run the database migrations

Run the SQL files in [`supabase/migrations`](supabase/migrations) **in order**:

| Order | File | What it does |
| ----- | ---- | ------------ |
| 1 | `0001_init_schema.sql` | Tables: profiles, categories, recurring_expenses, expenses, budgets |
| 2 | `0002_rls_policies.sql` | Row Level Security scoped to `auth.uid()` |
| 3 | `0003_signup_defaults.sql` | Trigger: create profile + seed 12 default categories on signup |
| 4 | `0004_monthly_summaries.sql` | `monthly_summaries` view (income / expense / savings per month) |

Easiest path: open the **SQL Editor** in the Supabase dashboard and paste each
file's contents in order. Or, with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### 4. Auth settings (for quick local testing)

By default Supabase requires email confirmation. For fast local testing, turn
**Authentication → Providers → Email → "Confirm email"** *off* so signup gives an
immediate session. Leave it on for production.

### 5. Run it

```bash
npm run dev
```

Sign up → you're taken through onboarding (salary, categories, recurring
expenses) → then the dashboard.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`tsc`) and build for production |
| `npm run preview` | Preview the production build |
| `npm test` | Run the insight-logic unit tests (Vitest) |

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Framework preset: **Vite** (auto-detected; `vercel.json` handles SPA rewrites).
3. Add the two `VITE_SUPABASE_*` environment variables in the Vercel project
   settings.
4. Deploy. Build command `npm run build`, output `dist`.

## Architecture notes

### The insight engine

All behavioural logic lives in [`src/lib/insights.ts`](src/lib/insights.ts) as
**pure, unit-tested functions** (see `insights.test.ts`):

- `getSavingsRate(income, expense)` — `(income − expense) / income`
- `getBudgetStatus(spent, budget)` — traffic-light status (under / near / over)
- `calculateBurnRate(expenses, salary, dayOfMonth, daysInMonth)` — linear
  month-end projection + on-track-to-overspend flag
- `detectAnomalies(history, threshold)` — flags a category spending > 1.5 std
  devs above its trailing average (with a flat-series fallback), producing
  plain-English messages
- `getWeekdayPattern(expenses)` — average spend per weekday (habit signal)
- `getLeakCategories(history)` — steadiest drains (low variance relative to size)

### Recurring expenses (v1 tradeoff)

Recurring expenses are auto-generated **client-side** on app load
(`ensureRecurringForCurrentMonth` in
[`src/hooks/useRecurring.ts`](src/hooks/useRecurring.ts)): when you open the app,
any active template whose day-of-month has passed gets a matching expense, if one
doesn't already exist this month. Dedup is keyed on `(recurring_expense_id, this
month)`, so re-opening the app never double-inserts.

**Tradeoff:** entries appear on the next visit *after* the due day, not at
midnight. A Supabase scheduled edge function / `pg_cron` job can replace this
later for true server-side generation — deliberately deferred to keep v1 simple.

## Project structure

```
src/
  components/      UI primitives, app shell, charts, add-expense drawer
  context/         Auth + theme providers
  hooks/           TanStack Query hooks (profile, categories, expenses, recurring)
  lib/             supabase client, formatting, insight utils (+ tests)
  pages/           Login, Onboarding, Dashboard, Settings, + placeholders
  types/           DB-facing TypeScript types
supabase/
  migrations/      Ordered SQL: schema, RLS, signup seed, summaries view
```

## Out of scope (v1)

- Multi-user / family sharing
- Bank statement auto-import
- Native mobile app
