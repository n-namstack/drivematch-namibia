'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Slice { name: string; value: number; color: string }
interface Props { data: Slice[]; centerLabel?: string; centerValue?: string | number }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: p } = payload[0]
  const total = p.total as number
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
        <span className="font-medium text-slate-700">{name}</span>
      </div>
      <div className="text-slate-900 font-bold">{value.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span></div>
    </div>
  )
}

export default function DonutChart({ data, centerLabel, centerValue }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const dataWithTotal = data.map(d => ({ ...d, total }))

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-300">
        <div className="w-20 h-20 rounded-full border-4 border-slate-100 mb-2" />
        <p className="text-xs">No data</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: 130, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dataWithTotal} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
              {dataWithTotal.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-lg font-bold text-slate-900 leading-none">{centerValue ?? total.toLocaleString()}</div>
          {centerLabel && <div className="text-[10px] text-slate-400 mt-0.5">{centerLabel}</div>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {data.filter(d => d.value > 0).map((d) => {
          const pct = Math.round((d.value / total) * 100)
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-slate-600 truncate flex-1">{d.name}</span>
              <span className="font-semibold text-slate-800 tabular-nums">{d.value}</span>
              <span className="text-slate-400 tabular-nums w-7 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
