-- 0003_signup_defaults.sql
-- On every new auth user: create their profile row and seed default categories.
-- Runs as SECURITY DEFINER so it can write regardless of the caller's RLS context.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) profile
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  -- 2) default categories (name, icon, color)
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
