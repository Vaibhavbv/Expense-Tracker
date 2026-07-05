-- =====================================================================
-- Paisa — one-shot database setup.
-- This is migrations 0001–0004 concatenated for a single paste into the
-- Supabase SQL Editor. Safe to re-run (idempotent guards throughout).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0001 — schema
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash', 'upi', 'card', 'netbanking');
  end if;
end$$;

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text,
  monthly_salary   numeric(12, 2) not null default 0,
  salary_credit_day int not null default 1 check (salary_credit_day between 1 and 31),
  currency         text not null default 'INR',
  onboarded        boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  icon       text,
  color      text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists categories_user_idx on public.categories (user_id);

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
create index if not exists expenses_recurring_idx on public.expenses (recurring_expense_id, expense_date);

create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  category_id   uuid not null references public.categories (id) on delete cascade,
  month         date not null,
  budget_amount numeric(12, 2) not null check (budget_amount >= 0),
  created_at    timestamptz not null default now(),
  unique (user_id, category_id, month)
);
create index if not exists budgets_user_month_idx on public.budgets (user_id, month);

-- ---------------------------------------------------------------------
-- 0002 — row level security
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.expenses           enable row level security;
alter table public.budgets            enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_all_own" on public.recurring_expenses;
create policy "recurring_all_own" on public.recurring_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses_all_own" on public.expenses;
create policy "expenses_all_own" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budgets_all_own" on public.budgets;
create policy "budgets_all_own" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 0003 — signup trigger: profile + default categories
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, icon, color, is_default)
  values
    (new.id, 'Food & Dining',          'utensils',        '#f97316', true),
    (new.id, 'Rent',                   'home',            '#6366f1', true),
    (new.id, 'Groceries',              'shopping-basket', '#22c55e', true),
    (new.id, 'Transport',              'car',             '#06b6d4', true),
    (new.id, 'Utilities',              'zap',             '#eab308', true),
    (new.id, 'Subscriptions',          'repeat',          '#a855f7', true),
    (new.id, 'Shopping',               'shopping-bag',    '#ec4899', true),
    (new.id, 'Entertainment',          'clapperboard',    '#f43f5e', true),
    (new.id, 'Health & Fitness',       'heart-pulse',     '#ef4444', true),
    (new.id, 'Travel',                 'plane',           '#14b8a6', true),
    (new.id, 'Savings & Investments',  'piggy-bank',      '#10b981', true),
    (new.id, 'Miscellaneous',          'shapes',          '#64748b', true)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 0004 — monthly summaries view
-- ---------------------------------------------------------------------
create or replace view public.monthly_summaries
with (security_invoker = true) as
select
  e.user_id,
  date_trunc('month', e.expense_date)::date        as month,
  p.monthly_salary                                  as total_income,
  sum(e.amount)                                     as total_expense,
  p.monthly_salary - sum(e.amount)                  as savings,
  case
    when p.monthly_salary > 0
      then round((p.monthly_salary - sum(e.amount)) / p.monthly_salary, 4)
    else 0
  end                                               as savings_rate
from public.expenses e
join public.profiles p on p.id = e.user_id
group by e.user_id, date_trunc('month', e.expense_date), p.monthly_salary;
