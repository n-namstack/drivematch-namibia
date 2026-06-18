import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import SearchInput from '@/components/SearchInput'
import UserActions from '@/components/UserActions'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface SearchParams { q?: string; tab?: string; page?: string }

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const q = searchParams.q ?? ''
  const tab = searchParams.tab ?? 'all'
  const page = Math.max(0, parseInt(searchParams.page ?? '0', 10))

  let query = admin.from('profiles').select('id, firstname, lastname, email, is_admin, is_active, is_driver, is_owner, created_at', { count: 'exact' })

  if (q) {
    query = query.or(`firstname.ilike.%${q}%,lastname.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (tab === 'admins') query = query.eq('is_admin', true)
  if (tab === 'drivers') query = query.eq('is_driver', true)
  if (tab === 'owners') query = query.eq('is_owner', true)
  if (tab === 'inactive') query = query.eq('is_active', false)

  const { data: users, count } = await query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const tabs = [
    { key: 'all',      label: 'All Users' },
    { key: 'admins',   label: 'Admins'    },
    { key: 'drivers',  label: 'Drivers'   },
    { key: 'owners',   label: 'Owners'    },
    { key: 'inactive', label: 'Inactive'  },
  ]

  return (
    <div className="p-6">
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
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {tabs.map((t) => (
            <a
              key={t.key}
              href={`/users?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
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
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Roles</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Joined</th>
                <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(users ?? []).map((u) => {
                const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || '—'
                const roles = [u.is_admin && 'Admin', u.is_driver && 'Driver', u.is_owner && 'Owner'].filter(Boolean)
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-xs flex-shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{u.email ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {roles.length === 0 && <span className="text-slate-400 text-xs">—</span>}
                        {roles.map((r) => (
                          <span key={r as string} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <UserActions userId={u.id} isAdmin={u.is_admin ?? false} isActive={u.is_active !== false} isSelf={u.id === user.id} />
                    </td>
                  </tr>
                )
              })}
              {(users ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 0 && (
                <a href={`/users?tab=${tab}&page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">← Prev</a>
              )}
              {page < totalPages - 1 && (
                <a href={`/users?tab=${tab}&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">Next →</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
