-- 0004_monthly_summaries.sql
-- Convenience view: per-user, per-month income / expense / savings.
-- Income is taken from the profile's monthly_salary (constant per month).
-- Only months that actually have expenses appear here; the client fills gaps
-- for trend charts. Kept as a plain view (not materialized) for v1 simplicity.

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
