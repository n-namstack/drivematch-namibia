import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VerificationPanel from '@/components/VerificationPanel'

export const revalidate = 0

async function signUrl(admin: ReturnType<typeof createAdminClient>, url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const path = url.split('/driver_documents/')[1]
    if (!path) return url
    const { data } = await admin.storage
      .from('driver_documents')
      .createSignedUrl(decodeURIComponent(path), 3600)
    return data?.signedUrl ?? url
  } catch { return url }
}

const FILTER_STATUSES: Record<string, string[]> = {
  all:      ['pending', 'submitted', 'verified'],
  pending:  ['pending', 'submitted'],
  verified: ['verified'],
}

interface SearchParams { filter?: string }

export default async function VerificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const filter = (searchParams.filter && FILTER_STATUSES[searchParams.filter]) ? searchParams.filter : 'all'

  // Always fetch all three statuses so we can show per-tab counts
  const { data: driverProfiles } = await admin
    .from('driver_profiles')
    .select('id, user_id, verification_status, rejection_reason, years_of_experience')
    .in('verification_status', ['pending', 'submitted', 'verified'])
    .order('created_at', { ascending: true })

  const allProfiles = driverProfiles ?? []

  const counts = {
    all:      allProfiles.length,
    pending:  allProfiles.filter(dp => ['pending', 'submitted'].includes(dp.verification_status)).length,
    verified: allProfiles.filter(dp => dp.verification_status === 'verified').length,
  }

  // Filter to the active tab
  const filteredProfiles = allProfiles.filter(dp =>
    FILTER_STATUSES[filter]!.includes(dp.verification_status)
  )

  const userIds  = filteredProfiles.map(dp => dp.user_id)
  const profileIds = filteredProfiles.map(dp => dp.id)

  // Fetch profiles and documents for filtered set
  const [{ data: profiles }, { data: documents }] = profileIds.length > 0
    ? await Promise.all([
        admin.from('profiles').select('id, firstname, lastname, email, phone').in('id', userIds),
        admin.from('driver_documents')
          .select('id, driver_id, document_type, document_url, selfie_url, verification_status, rejection_reason, verified_at, verified_by')
          .in('driver_id', profileIds),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const docsByDriverId: Record<string, typeof documents> = {}
  for (const doc of documents ?? []) {
    if (!docsByDriverId[doc.driver_id]) docsByDriverId[doc.driver_id] = []
    docsByDriverId[doc.driver_id]!.push(doc)
  }

  // Sign URLs
  const drivers = await Promise.all(
    filteredProfiles.map(async dp => {
      const profile = profileMap[dp.user_id] ?? null
      const docs = docsByDriverId[dp.id] ?? []
      const docsWithUrls = await Promise.all(
        docs.map(async doc => ({
          ...doc,
          file_url: doc.document_url,
          signed_url: await signUrl(admin, doc.document_url),
          signed_selfie_url: await signUrl(admin, doc.selfie_url ?? null),
        }))
      )
      return {
        user_id: dp.user_id,
        verification_status: dp.verification_status,
        rejection_reason: dp.rejection_reason,
        years_of_experience: dp.years_of_experience,
        license_number: null,
        profiles: profile,
        driver_documents: docsWithUrls,
      }
    })
  )

  const tabs = [
    { key: 'all',      label: 'All',      count: counts.all      },
    { key: 'pending',  label: 'Pending',  count: counts.pending  },
    { key: 'verified', label: 'Verified', count: counts.verified },
  ]

  const TAB_ACTIVE: Record<string, string> = {
    all:      'bg-slate-800 text-white',
    pending:  'bg-amber-500 text-white',
    verified: 'bg-emerald-600 text-white',
  }
  const TAB_INACTIVE: Record<string, string> = {
    all:      'text-slate-600 hover:bg-slate-100',
    pending:  'text-amber-700 hover:bg-amber-50',
    verified: 'text-emerald-700 hover:bg-emerald-50',
  }

  const emptyMessages: Record<string, string> = {
    all:      'No drivers in the verification pipeline',
    pending:  'No drivers pending verification',
    verified: 'No verified drivers yet',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Verifications</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {counts.pending} driver{counts.pending !== 1 ? 's' : ''} pending review
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {tabs.map(tab => (
          <a
            key={tab.key}
            href={`/verifications?filter=${tab.key}`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === tab.key ? TAB_ACTIVE[tab.key] : TAB_INACTIVE[tab.key]}`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {tab.count}
            </span>
          </a>
        ))}
      </div>

      {drivers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
          <div className="text-5xl mb-4">{filter === 'verified' ? '✅' : '📋'}</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {filter === 'verified' ? 'No verified drivers yet' : 'All caught up!'}
          </h2>
          <p className="text-slate-500">{emptyMessages[filter]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drivers.map(driver => (
            <VerificationPanel key={driver.user_id} driver={driver as any} />
          ))}
        </div>
      )}
    </div>
  )
}
