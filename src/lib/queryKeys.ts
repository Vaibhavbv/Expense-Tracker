// Centralised React Query keys so invalidation stays consistent.
export const qk = {
  profile: (userId: string) => ['profile', userId] as const,
  categories: (userId: string) => ['categories', userId] as const,
  recurring: (userId: string) => ['recurring', userId] as const,
  budgets: (userId: string, month?: string) =>
    ['budgets', userId, month ?? 'all'] as const,
  expenses: (userId: string, scope: string) =>
    ['expenses', userId, scope] as const,
}
