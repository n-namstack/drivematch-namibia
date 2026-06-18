import { type LucideIcon } from 'lucide-react'

const colorConfig = {
  blue:   { gradient: 'from-blue-500 to-blue-700',       shadow: 'shadow-blue-200/60' },
  purple: { gradient: 'from-violet-500 to-purple-700',   shadow: 'shadow-purple-200/60' },
  green:  { gradient: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-200/60' },
  amber:  { gradient: 'from-amber-400 to-orange-500',    shadow: 'shadow-amber-200/60' },
  red:    { gradient: 'from-rose-500 to-red-700',        shadow: 'shadow-rose-200/60' },
  slate:  { gradient: 'from-slate-500 to-slate-700',     shadow: 'shadow-slate-200/60' },
  teal:   { gradient: 'from-teal-500 to-cyan-600',       shadow: 'shadow-teal-200/60' },
}

interface Props {
  title: string
  value: number
  subtitle?: string
  icon: LucideIcon
  color: keyof typeof colorConfig
  urgent?: boolean
  prefix?: string
}

export default function StatsCard({ title, value, subtitle, icon: Icon, color, urgent, prefix }: Props) {
  const { gradient, shadow } = colorConfig[urgent ? 'amber' : color]
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 shadow-lg ${shadow} text-white relative overflow-hidden`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -right-2 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3">
        <Icon size={15} className="text-white" />
      </div>
      <div className="text-2xl font-bold text-white tabular-nums leading-none">
        {prefix && <span className="text-sm font-semibold text-white/70 mr-0.5">{prefix}</span>}
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-white/75 mt-1 font-medium">{title}</div>
      {subtitle && <div className="text-xs text-white/60 font-medium mt-0.5">{subtitle}</div>}
    </div>
  )
}
