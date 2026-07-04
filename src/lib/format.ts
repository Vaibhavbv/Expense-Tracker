import { format, parseISO } from 'date-fns'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** ₹1,23,456 — Indian digit grouping, no paise. */
export function formatINR(amount: number): string {
  return inr.format(Number.isFinite(amount) ? amount : 0)
}

/** ₹1,23,456.78 — with paise, for exact figures. */
export function formatINRPrecise(amount: number): string {
  return inrPrecise.format(Number.isFinite(amount) ? amount : 0)
}

/** Compact form for chart axes: ₹1.2L, ₹85k. */
export function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `₹${(amount / 1e3).toFixed(0)}k`
  return `₹${Math.round(amount)}`
}

/** 0.42 -> "42%" */
export function formatPercent(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction)) return '0%'
  return `${(fraction * 100).toFixed(digits)}%`
}

/** Accepts an ISO date string or Date and formats it. */
export function formatDate(value: string | Date, pattern = 'd MMM yyyy'): string {
  const date = typeof value === 'string' ? parseISO(value) : value
  return format(date, pattern)
}
