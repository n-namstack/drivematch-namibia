'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Loader2, BriefcaseBusiness } from 'lucide-react'

interface Hire {
  id: string
  title: string | null
  job_type: string | null
  status: string
  created_at: string
  start_date: string | null
  driver_id: string | null
}

interface DriverInfo { firstname: string | null; lastname: string | null }

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  accepted:  { label: 'Accepted',  bg: 'bg-emerald-100', text: 'text-emerald-700' },
  pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-700'   },
  rejected:  { label: 'Rejected',  bg: 'bg-red-100',     text: 'text-red-700'     },
  withdrawn: { label: 'Withdrawn', bg: 'bg-slate-100',   text: 'text-slate-600'   },
}

interface Props {
  ownerId: string
  ownerName: string
  closeHref: string
}

export default function OwnerHiresDrawer({ ownerId, ownerName, closeHref }: Props) {
  const [loading, setLoading] = useState(true)
  const [hires, setHires] = useState<Hire[]>([])
  const [driverMap, setDriverMap] = useState<Record<string, DriverInfo>>({})

  useEffect(() => {
    fetch(`/api/owner-hires/${ownerId}`)
      .then((r) => r.json())
      .then(({ hires, driverMap }) => {
        setHires(hires ?? [])
        setDriverMap(driverMap ?? {})
      })
      .finally(() => setLoading(false))
  }, [ownerId])

  return (
    <>
      <Link href={closeHref} className="fixed inset-0 z-30 bg-black/20" />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 z-40 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Hired Drivers</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">{ownerName}</p>
          </div>
          <Link href={closeHref} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <X size={16} />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : hires.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <BriefcaseBusiness size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No hire offers found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {hires.map((hire) => {
                const driver = hire.driver_id ? driverMap[hire.driver_id] : null
                const driverName = driver
                  ? [driver.firstname, driver.lastname].filter(Boolean).join(' ') || 'Unknown Driver'
                  : 'No driver assigned'
                const s = STATUS_CONFIG[hire.status] ?? { label: hire.status, bg: 'bg-slate-100', text: 'text-slate-600' }
                return (
                  <div key={hire.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{hire.title || hire.job_type || 'Unnamed Job'}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{driverName}</p>
                        {hire.job_type && hire.title && (
                          <p className="text-xs text-slate-400 mt-0.5">{hire.job_type}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.bg} ${s.text}`}>{s.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {hire.start_date
                        ? `Starts ${new Date(hire.start_date).toLocaleDateString()}`
                        : `Posted ${new Date(hire.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
