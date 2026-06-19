import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Car, ChevronRight } from 'lucide-react'
import OwnerHiresDrawer from '@/components/OwnerHiresDrawer'

export const dynamic = 'force-dynamic'

interface SearchParams { owner?: string }

export default async function OwnersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data: owners } = await admin
    .from('profiles')
    .select('id, firstname, lastname, email, created_at, phone')
    .eq('role', 'owner')
    .order('created_at', { ascending: false })

  const ownerIds = (owners ?? []).map((o) => o.id)

  let hiresCountMap: Record<string, number> = {}
  let jobsCountMap: Record<string, number> = {}

  if (ownerIds.length > 0) {
    const { data: hiresData } = await admin
      .from('hire_offers')
      .select('owner_id, status')
      .in('owner_id', ownerIds)

    const { data: jobsData } = await admin
      .from('hire_offers')
      .select('owner_id')
      .in('owner_id', ownerIds)

    for (const h of hiresData ?? []) {
      if (h.status === 'accepted') {
        hiresCountMap[h.owner_id] = (hiresCountMap[h.owner_id] ?? 0) + 1
      }
    }
    for (const j of jobsData ?? []) {
      jobsCountMap[j.owner_id] = (jobsCountMap[j.owner_id] ?? 0) + 1
    }
  }

  const selectedOwnerId = searchParams.owner
  const selectedOwner = selectedOwnerId ? (owners ?? []).find((o) => o.id === selectedOwnerId) : null
  const selectedOwnerName = selectedOwner
    ? [selectedOwner.firstname, selectedOwner.lastname].filter(Boolean).join(' ') || selectedOwner.email || 'Unknown'
    : ''

  const closeHref = '/owners'

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Car size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Car Owners</h1>
          <p className="text-sm text-slate-500">{(owners ?? []).length} registered owners</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
              {(owners ?? []).map((owner) => {
                const hiresCount = hiresCountMap[owner.id] ?? 0
                const jobsCount = jobsCountMap[owner.id] ?? 0
                const name = [owner.firstname, owner.lastname].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={owner.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
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
                          href={`/owners?owner=${owner.id}`}
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
                      <span className={`text-xs font-medium ${jobsCount > 0 ? 'text-blue-700' : 'text-slate-400'}`}>{jobsCount}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(owner.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
              {(owners ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No car owners found</td>
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
