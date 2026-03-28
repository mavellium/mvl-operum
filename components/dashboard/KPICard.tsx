interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'amber' | 'purple'
}

const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
}

export default function KPICard({ label, value, sub, color = 'blue' }: KPICardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${COLOR_CLASSES[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}
