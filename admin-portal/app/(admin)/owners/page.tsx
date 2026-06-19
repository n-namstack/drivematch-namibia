import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Car, ChevronRight } from 'lucide-react'
import OwnerHiresDrawer from '@/components/OwnerHiresDrawer'
import SearchInput from '@/components/SearchInput'

export const dynamic = 'force-dynamic'

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
]

function avatarColor(id: string) {
  const n = id.slice(0, 8).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]!
}

function buildUrl(params: { tab?: string; q?: string; owner?: string }) {
  const p = new URLSearchParams()
  if (params.tab && params.tab !== 'all') p.set('tab', params.tab)
  if (params.q) p.set('q', params.q)
  if (params.owner) p.set('owner', params.owner)
  const qs = p.toString()
  return `/owners${qs ? `?${qs}` : ''}`
}

interface SearchParams { owner?: string; tab?: string; q?: string }

export default async function OwnersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const q   = searchParams.q   ?? ''
  const tab = searchParams.tab ?? 'all'

  let query = admin
    .from('profiles')
    .select('id, firstname, lastname, email, created_at, phone')
    .eq('role', 'owner')

  if (q) {
    query = query.or(
      `firstname.ilike.%${q}%,lastname.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
    )
  }

  const { data: owners } = await query.order('created_at', { ascending: false })

  const ownerIds = (owners ?? []).map(o => o.id)

  let hiresCountMap: Record<string, number> = {}
  let jobsCountMap:  Record<string, number> = {}

  if (ownerIds.length > 0) {
    const { data: hiresData } = await admin
      .from('hire_offers')
      .select('owner_id, status')
      .in('owner_id', ownerIds)

    for (const h of hiresData ?? []) {
      jobsCountMap[h.owner_id] = (jobsCountMap[h.owner_id] ?? 0) + 1
      if (h.status === 'accepted') {
        hiresCountMap[h.owner_id] = (hiresCountMap[h.owner_id] ?? 0) + 1
      }
    }
  }

  // Tab counts (computed before filtering)
  const allOwners      = owners ?? []
  const activeOwners   = allOwners.filter(o => (hiresCountMap[o.id] ?? 0) > 0)
  const noHiresOwners  = allOwners.filter(o => (hiresCountMap[o.id] ?? 0) === 0)

  const counts = {
    all:      allOwners.length,
    active:   activeOwners.length,
    'no-hires': noHiresOwners.length,
  }

  // Apply tab filter
  const visibleOwners =
    tab === 'active'   ? activeOwners :
    tab === 'no-hires' ? noHiresOwners :
                         allOwners

  const selectedOwnerId = searchParams.owner
  const selectedOwner   = selectedOwnerId ? allOwners.find(o => o.id === selectedOwnerId) : null
  const selectedOwnerName = selectedOwner
    ? [selectedOwner.firstname, selectedOwner.lastname].filter(Boolean).join(' ') || selectedOwner.email || 'Unknown'
    : ''

  const closeHref = buildUrl({ tab, q })

  const tabs = [
    { key: 'all',       label: 'All',      activeClass: 'bg-slate-800 text-white',    inactiveClass: 'text-slate-600 hover:bg-slate-100' },
    { key: 'active',    label: 'Active',   activeClass: 'bg-emerald-600 text-white',  inactiveClass: 'text-emerald-700 hover:bg-emerald-50' },
    { key: 'no-hires',  label: 'No Hires', activeClass: 'bg-amber-500 text-white',    inactiveClass: 'text-amber-700 hover:bg-amber-50' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Car size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Car Owners</h1>
          <p className="text-sm text-slate-500">{allOwners.length} registered owners</p>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5">
          {tabs.map(t => (
            <a
              key={t.key}
              href={buildUrl({ tab: t.key, q })}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${tab === t.key ? t.activeClass : t.inactiveClass}`}
            >
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {counts[t.key as keyof typeof counts]}
              </span>
            </a>
          ))}
        </div>
        <div className="flex-1 max-w-xs">
          <SearchInput defaultValue={q} placeholder="Search owners…" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Phone</th>
                <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Hires</th>
                <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Jobs Posted</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleOwners.map(owner => {
                const hiresCount = hiresCountMap[owner.id] ?? 0
                const jobsCount  = jobsCountMap[owner.id]  ?? 0
                const name = [owner.firstname, owner.lastname].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={owner.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${avatarColor(owner.id)}`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{owner.email ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{owner.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      {hiresCount > 0 ? (
                        <Link
                          href={buildUrl({ tab, q, owner: owner.id })}
                          className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs transition-colors"
                        >
                          {hiresCount}
                          <ChevronRight size={10} />
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-medium ${jobsCount > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                        {jobsCount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(owner.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
              {visibleOwners.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    {q ? `No owners match "${q}"` : 'No car owners found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOwnerId && selectedOwner && (
        <OwnerHiresDrawer
          ownerId={selectedOwnerId}
          ownerName={selectedOwnerName}
          closeHref={closeHref}
        />
      )}
    </div>
  )
}
