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

export default async function VerificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Step 1: fetch pending/submitted driver profiles
  const { data: driverProfiles } = await admin
    .from('driver_profiles')
    .select('id, user_id, verification_status, rejection_reason, years_of_experience')
    .in('verification_status', ['pending', 'submitted'])
    .order('created_at', { ascending: true })

  if (!driverProfiles || driverProfiles.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Verifications</h1>
          <p className="text-slate-500 mt-1">0 drivers pending review</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">All caught up!</h2>
          <p className="text-slate-500">No drivers pending verification</p>
        </div>
      </div>
    )
  }

  const userIds = driverProfiles.map((dp) => dp.user_id)
  const profileIds = driverProfiles.map((dp) => dp.id)

  // Step 2: fetch profiles and documents in parallel
  const [{ data: profiles }, { data: documents }] = await Promise.all([
    admin.from('profiles').select('id, firstname, lastname, email, phone').in('id', userIds),
    admin.from('driver_documents')
      .select('id, driver_id, document_type, document_url, selfie_url, verification_status, rejection_reason, verified_at, verified_by')
      .in('driver_id', profileIds),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  const docsByDriverId: Record<string, typeof documents> = {}
  for (const doc of documents ?? []) {
    if (!docsByDriverId[doc.driver_id]) docsByDriverId[doc.driver_id] = []
    docsByDriverId[doc.driver_id]!.push(doc)
  }

  // Step 3: generate signed URLs
  const drivers = await Promise.all(
    driverProfiles.map(async (dp) => {
      const profile = profileMap[dp.user_id] ?? null
      const docs = docsByDriverId[dp.id] ?? []
      const docsWithUrls = await Promise.all(
        docs.map(async (doc) => ({
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Verifications</h1>
        <p className="text-slate-500 mt-1">
          {drivers.length} driver{drivers.length !== 1 ? 's' : ''} pending review
        </p>
      </div>
      <div className="space-y-4">
        {drivers.map((driver) => (
          <VerificationPanel key={driver.user_id} driver={driver as any} />
        ))}
      </div>
    </div>
  )
}
