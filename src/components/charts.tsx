import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactINR, formatINR } from '@/lib/format'

const AXIS = '#94a3b8' // slate-400 — legible in both themes
const GRID = 'rgba(148,163,184,0.15)'

// ---------------------------------------------------------------------------
// Category donut
// ---------------------------------------------------------------------------
export interface DonutDatum {
  name: string
  value: number
  color: string
}

export function CategoryDonut({ data }: { data: DonutDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatINR(Number(value)), name]}
          contentStyle={tooltipStyle}
          itemStyle={{ color: 'inherit' }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: AXIS }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Daily cumulative spend vs. budget pace
// ---------------------------------------------------------------------------
export interface DailyDatum {
  day: number
  actual: number | null // cumulative spend up to & including "today"
  pace: number // even-spend reference line
}

export function DailySpendTrend({ data }: { data: DailyDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCompactINR(v)}
          width={52}
        />
        <Tooltip
          formatter={(value, name) => [
            formatINR(Number(value)),
            name === 'actual' ? 'Spent' : 'Even pace',
          ]}
          labelFormatter={(label) => `Day ${label}`}
          contentStyle={tooltipStyle}
        />
        <Line
          type="monotone"
          dataKey="pace"
          stroke={AXIS}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          dot={false}
          name="pace"
        />
        <Area
          type="monotone"
          dataKey="actual"
          stroke="#4f46e5"
          strokeWidth={2.5}
          fill="url(#spendFill)"
          connectNulls
          dot={false}
          name="actual"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

const tooltipStyle = {
  background: 'rgb(var(--color-card))',
  border: '1px solid rgb(var(--color-border))',
  borderRadius: 12,
  color: 'rgb(var(--color-content))',
  fontSize: 12,
} as const
