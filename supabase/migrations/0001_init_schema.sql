-- 0001_init_schema.sql
-- Core schema for the personal expense tracker.
-- All monetary amounts use numeric(12,2). Currency defaults to INR.

-- Payment methods used on expenses / recurring expenses.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash', 'upi', 'card', 'netbanking');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text,
  monthly_salary   numeric(12, 2) not null default 0,
  salary_credit_day int not null default 1 check (salary_credit_day between 1 and 31),
  currency         text not null default 'INR',
  onboarded        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories: spend buckets. Defaults are seeded on signup (see 0003).
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  icon       text,
  color      text,                       -- hex string, e.g. '#f97316'
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists categories_user_idx on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- recurring_expenses: templates that auto-generate an expense each month.
-- (v1 generates rows client-side on app load — see README for the tradeoff.)
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid references public.categories (id) on delete set null,
  amount       numeric(12, 2) not null check (amount >= 0),
  label        text not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists recurring_user_idx on public.recurring_expenses (user_id);

-- ---------------------------------------------------------------------------
-- expenses: individual spend entries.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  category_id          uuid references public.categories (id) on delete set null,
  amount               numeric(12, 2) not null check (amount >= 0),
  description          text,
  payment_method       payment_method not null default 'upi',
  expense_date         date not null default current_date,
  is_recurring         boolean not null default false,
  recurring_expense_id uuid references public.recurring_expenses (id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, expense_date desc);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category_id);
-- Used to dedupe recurring auto-generation (one per template per month).
create index if not exists expenses_recurring_idx on public.expenses (recurring_expense_id, expense_date);

-- ---------------------------------------------------------------------------
-- budgets: monthly budget per category (month = first day of the month).
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  month         date not null,           -- always the 1st of the month
  budget_amount numeric(12, 2) not null check (budget_amount >= 0),
  created_at    timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create index if not exists budgets_user_month_idx on public.budgets (user_id, month);
