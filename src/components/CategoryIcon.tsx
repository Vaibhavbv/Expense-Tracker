import {
  Car,
  Clapperboard,
  HeartPulse,
  Home,
  PiggyBank,
  Plane,
  Repeat,
  Shapes,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Maps the seeded icon slugs (see 0003_signup_defaults.sql) to Lucide icons.
const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  home: Home,
  'shopping-basket': ShoppingBasket,
  car: Car,
  zap: Zap,
  repeat: Repeat,
  'shopping-bag': ShoppingBag,
  clapperboard: Clapperboard,
  'heart-pulse': HeartPulse,
  plane: Plane,
  'piggy-bank': PiggyBank,
  shapes: Shapes,
}

export function CategoryIcon({
  icon,
  color,
  className = 'h-5 w-5',
}: {
  icon?: string | null
  color?: string | null
  className?: string
}) {
  const Icon = (icon && ICONS[icon]) || Tag
  return <Icon className={className} style={color ? { color } : undefined} />
}
