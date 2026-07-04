-- 0002_rls_policies.sql
-- Row Level Security: every table is private to its owner (auth.uid()).

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.expenses          enable row level security;
alter table public.budgets           enable row level security;

-- ---- profiles (keyed by id = auth.uid()) ----------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- helper macro pattern for user_id-scoped tables -----------------------
-- categories
drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recurring_expenses
drop policy if exists "recurring_all_own" on public.recurring_expenses;
create policy "recurring_all_own" on public.recurring_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- expenses
drop policy if exists "expenses_all_own" on public.expenses;
create policy "expenses_all_own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- budgets
drop policy if exists "budgets_all_own" on public.budgets;
create policy "budgets_all_own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
