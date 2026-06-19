import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import SearchInput from '@/components/SearchInput'
import UserActions from '@/components/UserActions'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface SearchParams { q?: string; tab?: string; page?: string }

function buildPageUrl(tab: string, page: number, q: string) {
  const params = new URLSearchParams()
  if (tab !== 'all') params.set('tab', tab)
  if (page > 0) params.set('page', String(page))
  if (q) params.set('q', q)
  const qs = params.toString()
  return `/users${qs ? `?${qs}` : ''}`
}

function pageNumbers(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | 'gap')[] = []
  const near = new Set([0, total - 1, current - 1, current, current + 1].filter(p => p >= 0 && p < total))
  let prev: number | null = null
  for (const p of Array.from(near).sort((a, b) => a - b)) {
    if (prev !== null && p - prev > 1) pages.push('gap')
    pages.push(p)
    prev = p
  }
  return pages
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const q = searchParams.q ?? ''
  const tab = searchParams.tab ?? 'all'
  const page = Math.max(0, parseInt(searchParams.page ?? '0', 10))

  let query = admin.from('profiles').select('id, firstname, lastname, email, role, is_active, created_at', { count: 'exact' })

  if (q) query = query.or(`firstname.ilike.%${q}%,lastname.ilike.%${q}%,email.ilike.%${q}%`)
  if (tab === 'admins')   query = query.eq('role', 'admin')
  if (tab === 'drivers')  query = query.eq('role', 'driver')
  if (tab === 'owners')   query = query.eq('role', 'owner')
  if (tab === 'inactive') query = query.eq('is_active', false)

  const { data: users, count } = await query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  // Only fetch auth data for the users on this page (not all 1000+)
  const lastSignInMap: Record<string, string | null> = {}
  await Promise.all(
    (users ?? []).map(async (u) => {
      const { data } = await admin.auth.admin.getUserById(u.id)
      lastSignInMap[u.id] = data?.user?.last_sign_in_at ?? null
    })
  )

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const pages = pageNumbers(page, totalPages)

  const tabs = [
    { key: 'all',      label: 'All Users' },
    { key: 'admins',   label: 'Admins'    },
    { key: 'drivers',  label: 'Drivers'   },
    { key: 'owners',   label: 'Owners'    },
    { key: 'inactive', label: 'Inactive'  },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
          <Users size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{count ?? 0} total users</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={buildPageUrl(t.key, 0, q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </a>
          ))}
        </div>
        <div className="flex-1 max-w-xs">
          <SearchInput placeholder="Search users..." />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Last Login</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Joined</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(users ?? []).map((u) => {
                const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || '—'
                const roleLabel = u.role === 'admin' ? 'Admin' : u.role === 'driver' ? 'Driver' : u.role === 'owner' ? 'Owner' : (u.role ?? '—')
                const lastLogin = lastSignInMap[u.id]
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${
                          u.role === 'admin'  ? 'bg-violet-100 text-violet-700' :
                          u.role === 'driver' ? 'bg-blue-100 text-blue-700' :
                                                'bg-emerald-100 text-emerald-700'
                        }`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{u.email ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.role === 'admin'  ? 'bg-violet-100 text-violet-700' :
                        u.role === 'driver' ? 'bg-blue-100 text-blue-700' :
                                              'bg-slate-100 text-slate-600'
                      }`}>{roleLabel}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      {lastLogin ? (
                        <div>
                          <div className="text-slate-700">{new Date(lastLogin).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div className="text-slate-400 mt-0.5">{new Date(lastLogin).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : (
                        <span className="text-slate-300">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <UserActions userId={u.id} isAdmin={u.role === 'admin'} isActive={u.is_active !== false} isSelf={u.id === user.id} />
                    </td>
                  </tr>
                )
              })}
              {(users ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count ?? 0)} of {count ?? 0} users
            </p>
            <div className="flex items-center gap-1">
              <a
                href={page > 0 ? buildPageUrl(tab, page - 1, q) : '#'}
                aria-disabled={page === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${page === 0 ? 'pointer-events-none border-transparent text-slate-300' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
              >
                ← Prev
              </a>

              {pages.map((p, i) =>
                p === 'gap' ? (
                  <span key={`gap-${i}`} className="w-8 text-center text-slate-400 text-xs">…</span>
                ) : (
                  <a
                    key={p}
                    href={buildPageUrl(tab, p, q)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-violet-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                  >
                    {p + 1}
                  </a>
                )
              )}

              <a
                href={page < totalPages - 1 ? buildPageUrl(tab, page + 1, q) : '#'}
                aria-disabled={page >= totalPages - 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${page >= totalPages - 1 ? 'pointer-events-none border-transparent text-slate-300' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
              >
                Next →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
