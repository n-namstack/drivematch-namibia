import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { format, isToday, isYesterday } from 'date-fns'
import {
  CheckCircle, XCircle, FileCheck, FileX, ShieldCheck, ShieldOff, UserCheck, UserX, Activity
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const ACTION_CONFIG: Record<string, { label: string; icon: any; bg: string; iconColor: string }> = {
  approve_driver:   { label: 'Approved Driver',    icon: CheckCircle,  bg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  reject_driver:    { label: 'Rejected Driver',    icon: XCircle,      bg: 'bg-red-100',     iconColor: 'text-red-600'     },
  approve_document: { label: 'Approved Document',  icon: FileCheck,    bg: 'bg-blue-100',    iconColor: 'text-blue-600'    },
  reject_document:  { label: 'Rejected Document',  icon: FileX,        bg: 'bg-orange-100',  iconColor: 'text-orange-600'  },
  make_admin:       { label: 'Made Admin',         icon: ShieldCheck,  bg: 'bg-violet-100',  iconColor: 'text-violet-600'  },
  remove_admin:     { label: 'Removed Admin',      icon: ShieldOff,    bg: 'bg-slate-100',   iconColor: 'text-slate-600'   },
  enable_user:      { label: 'Enabled User',       icon: UserCheck,    bg: 'bg-teal-100',    iconColor: 'text-teal-600'    },
  disable_user:     { label: 'Disabled User',      icon: UserX,        bg: 'bg-rose-100',    iconColor: 'text-rose-600'    },
}

const FILTER_TABS = [
  { key: 'all',        label: 'All',         color: 'slate'   },
  { key: 'approvals',  label: 'Approvals',   color: 'emerald' },
  { key: 'rejections', label: 'Rejections',  color: 'red'     },
  { key: 'admin',      label: 'Admin',       color: 'violet'  },
]

const FILTER_ACTIONS: Record<string, string[]> = {
  approvals:  ['approve_driver', 'approve_document', 'enable_user'],
  rejections: ['reject_driver',  'reject_document',  'disable_user'],
  admin:      ['make_admin', 'remove_admin'],
}

const TAB_ACTIVE: Record<string, string> = {
  slate:   'bg-slate-800 text-white',
  emerald: 'bg-emerald-600 text-white',
  red:     'bg-red-600 text-white',
  violet:  'bg-violet-600 text-white',
}
const TAB_INACTIVE: Record<string, string> = {
  slate:   'text-slate-600 hover:bg-slate-100',
  emerald: 'text-emerald-700 hover:bg-emerald-50',
  red:     'text-red-700 hover:bg-red-50',
  violet:  'text-violet-700 hover:bg-violet-50',
}

function formatGroupDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

interface SearchParams { filter?: string; page?: string }

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const filter = searchParams.filter ?? 'all'
  const page = Math.max(0, parseInt(searchParams.page ?? '0', 10))

  let query = admin
    .from('admin_actions')
    .select('id, action_type, admin_id, target_id, target_type, reason, created_at', { count: 'exact' })

  const filterActions = FILTER_ACTIONS[filter]
  if (filterActions) {
    query = query.in('action_type', filterActions)
  }

  const { data: logs, count } = await query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  const allProfileIds = Array.from(new Set([
    ...(logs ?? []).map((l) => l.admin_id),
    ...(logs ?? []).filter((l) => ['driver_profile', 'profile'].includes(l.target_type)).map((l) => l.target_id),
  ].filter(Boolean)))

  let profileMap: Record<string, { firstname: string | null; lastname: string | null; email: string | null }> = {}
  if (allProfileIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, firstname, lastname, email').in('id', allProfileIds)
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const grouped: Record<string, typeof logs> = {}
  for (const log of logs ?? []) {
    const key = format(new Date(log.created_at), 'yyyy-MM-dd')
    if (!grouped[key]) grouped[key] = []
    grouped[key]!.push(log)
  }
  const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const filterCounts: Record<string, number> = { all: count ?? 0 }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Activity size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">{count ?? 0} admin actions recorded</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6">
        {FILTER_TABS.map((tab) => (
          <a
            key={tab.key}
            href={`/audit?filter=${tab.key}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === tab.key ? TAB_ACTIVE[tab.color] : TAB_INACTIVE[tab.color]}`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {groupKeys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Activity size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No audit entries found</p>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200" />

        {groupKeys.map((dateKey) => (
          <div key={dateKey} className="mb-6">
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-10 h-10 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-white pr-2">
                {formatGroupDate(dateKey)}
              </span>
            </div>

            <div className="space-y-2 ml-0">
              {(grouped[dateKey] ?? []).map((log) => {
                const cfg = ACTION_CONFIG[log.action_type] ?? { label: log.action_type, icon: Activity, bg: 'bg-slate-100', iconColor: 'text-slate-600' }
                const Icon = cfg.icon
                const performer = profileMap[log.admin_id]
                const performerName = performer
                  ? [performer.firstname, performer.lastname].filter(Boolean).join(' ') || performer.email || 'Unknown'
                  : 'Unknown Admin'
                const target = ['driver_profile', 'profile'].includes(log.target_type) ? profileMap[log.target_id] : null
                const targetName = target
                  ? [target.firstname, target.lastname].filter(Boolean).join(' ') || target.email
                  : log.target_id?.slice(0, 8) || null

                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-xl ${cfg.bg} flex items-center justify-center relative z-10`}>
                      <Icon size={16} className={cfg.iconColor} />
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-semibold text-slate-900">{cfg.label}</span>
                          {targetName && (
                            <span className="text-sm text-slate-600"> — <span className="font-medium">{targetName}</span></span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                          {format(new Date(log.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">by {performerName}</p>
                      {log.reason && (
                        <p className="mt-1.5 text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full inline-block">
                          reason: {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 0 && (
              <a href={`/audit?filter=${filter}&page=${page - 1}`} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">← Prev</a>
            )}
            {page < totalPages - 1 && (
              <a href={`/audit?filter=${filter}&page=${page + 1}`} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">Next →</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
