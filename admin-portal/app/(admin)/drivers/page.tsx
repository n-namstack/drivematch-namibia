import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { Users, CheckCircle, Clock, XCircle, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import SearchInput from '@/components/SearchInput'

export const revalidate = 0

const PAGE_SIZE = 10

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700','bg-purple-100 text-purple-700','bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700','bg-teal-100 text-teal-700','bg-orange-100 text-orange-700','bg-cyan-100 text-cyan-700',
]
function avatarColor(id: string) {
  const n = id.slice(0, 4).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700', rejected: 'bg-red-100 text-red-700', unverified: 'bg-slate-100 text-slate-600',
}
const STATUS_ICONS: Record<string, React.ReactNode> = {
  verified: <CheckCircle size={12} />, pending: <Clock size={12} />,
  submitted: <Clock size={12} />, rejected: <XCircle size={12} />, unverified: <Clock size={12} />,
}
const STATUS_ACTIVE: Record<string, string> = {
  all: 'bg-slate-800 text-white border-slate-800', verified: 'bg-green-600 text-white border-green-600',
  pending: 'bg-amber-500 text-white border-amber-500', submitted: 'bg-blue-600 text-white border-blue-600',
  rejected: 'bg-red-600 text-white border-red-600', unverified: 'bg-slate-500 text-white border-slate-500',
}
const STATUS_INACTIVE: Record<string, string> = {
  all: 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200',
  verified: 'bg-green-100 text-green-700 border-transparent hover:bg-green-200',
  pending: 'bg-amber-100 text-amber-700 border-transparent hover:bg-amber-200',
  submitted: 'bg-blue-100 text-blue-700 border-transparent hover:bg-blue-200',
  rejected: 'bg-red-100 text-red-700 border-transparent hover:bg-red-200',
  unverified: 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200',
}

export default async function DriversPage({ searchParams }: { searchParams: { filter?: string; search?: string; page?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeFilter = searchParams.filter ?? 'all'
  const searchTerm = (searchParams.search ?? '').toLowerCase().trim()
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const admin = createAdminClient()

  const [{ data: driverProfiles }, { data: profilesOnly }] = await Promise.all([
    admin.from('driver_profiles').select(`user_id, verification_status, years_of_experience, rating, total_reviews, availability, profiles!driver_profiles_user_id_fkey (id, firstname, lastname, email, phone, created_at)`).order('created_at', { ascending: false }),
    admin.from('profiles').select('id, firstname, lastname, email, phone, created_at').eq('role', 'driver'),
  ])

  const profiledIds = new Set((driverProfiles ?? []).map(dp => dp.user_id))

  const rows = [
    ...(driverProfiles ?? []).map(dp => {
      const p = dp.profiles as any
      return { id: dp.user_id, firstname: p?.firstname ?? '', lastname: p?.lastname ?? '', email: p?.email ?? '', phone: p?.phone ?? null, created_at: p?.created_at ?? '', verification_status: dp.verification_status ?? 'unverified', years_of_experience: dp.years_of_experience, rating: dp.rating, total_reviews: dp.total_reviews }
    }),
    ...(profilesOnly ?? []).filter(pr => !profiledIds.has(pr.id)).map(pr => ({ id: pr.id, firstname: pr.firstname ?? '', lastname: pr.lastname ?? '', email: pr.email ?? '', phone: pr.phone ?? null, created_at: pr.created_at, verification_status: 'unverified', years_of_experience: null, rating: null, total_reviews: null })),
  ]

  const statusCounts = ['verified', 'pending', 'submitted', 'rejected', 'unverified'].map(s => ({ status: s, count: rows.filter(r => r.verification_status === s).length })).filter(s => s.count > 0)

  const filteredRows = rows
    .filter(r => activeFilter === 'all' || r.verification_status === activeFilter)
    .filter(r => { if (!searchTerm) return true; return `${r.firstname} ${r.lastname}`.toLowerCase().includes(searchTerm) || r.email.toLowerCase().includes(searchTerm) || (r.phone ?? '').toLowerCase().includes(searchTerm) })

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function pageUrl(page: number) {
    const p = new URLSearchParams()
    if (activeFilter !== 'all') p.set('filter', activeFilter)
    if (searchTerm) p.set('search', searchTerm)
    p.set('page', String(page))
    return `/drivers?${p.toString()}`
  }
  function filterUrl(filter: string) {
    const p = new URLSearchParams()
    if (filter !== 'all') p.set('filter', filter)
    if (searchTerm) p.set('search', searchTerm)
    return `/drivers${p.size ? '?' + p.toString() : ''}`
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
        <p className="text-slate-500 mt-1">{rows.length} registered drivers</p>
      </div>
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Link href={filterUrl('all')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeFilter === 'all' ? STATUS_ACTIVE.all : STATUS_INACTIVE.all}`}>{rows.length} all</Link>
          {statusCounts.map(({ status, count }) => (
            <Link key={status} href={filterUrl(status)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeFilter === status ? STATUS_ACTIVE[status] : STATUS_INACTIVE[status]}`}>
              {STATUS_ICONS[status]}{count} {status}
            </Link>
          ))}
        </div>
        <SearchInput defaultValue={searchTerm} placeholder="Search drivers…" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Driver</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Contact</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Experience</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Rating</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageRows.map((driver) => {
              const status = driver.verification_status
              return (
                <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(driver.id)}`}>{(driver.firstname?.[0] ?? '?').toUpperCase()}</div>
                      <div>
                        <div className="font-medium text-slate-900">{driver.firstname} {driver.lastname}</div>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">{driver.id.slice(0, 8).toUpperCase()}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="text-slate-700">{driver.email}</div>{driver.phone && <div className="text-xs text-slate-400 mt-0.5">{driver.phone}</div>}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.unverified}`}>{STATUS_ICONS[status] ?? STATUS_ICONS.unverified}{status}</span></td>
                  <td className="px-4 py-3 text-slate-600">{driver.years_of_experience != null ? `${driver.years_of_experience}y` : '—'}</td>
                  <td className="px-4 py-3">{driver.rating ? <span className="flex items-center gap-1 text-slate-700"><Star size={12} className="text-amber-400 fill-amber-400" />{Number(driver.rating).toFixed(1)}<span className="text-slate-400 text-xs">({driver.total_reviews})</span></span> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{driver.created_at ? format(new Date(driver.created_at), 'MMM d, yyyy') : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 && <div className="text-center py-12 text-slate-400"><Users size={32} className="mx-auto mb-2 opacity-40" /><p>{searchTerm ? `No drivers match "${searchTerm}"` : 'No drivers found'}</p></div>}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-500">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</p>
            <div className="flex items-center gap-1">
              {safePage > 1 ? <Link href={pageUrl(safePage - 1)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-colors"><ChevronLeft size={15} /> Prev</Link> : <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 cursor-not-allowed"><ChevronLeft size={15} /> Prev</span>}
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1).reduce<(number | 'gap')[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('gap'); acc.push(p); return acc }, []).map((p, idx) => p === 'gap' ? <span key={`gap-${idx}`} className="px-1 text-slate-400 text-sm">…</span> : <Link key={p} href={pageUrl(p as number)} className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-colors ${p === safePage ? 'bg-blue-800 text-white font-medium' : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'}`}>{p}</Link>)}
              {safePage < totalPages ? <Link href={pageUrl(safePage + 1)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-colors">Next <ChevronRight size={15} /></Link> : <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 cursor-not-allowed">Next <ChevronRight size={15} /></span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
