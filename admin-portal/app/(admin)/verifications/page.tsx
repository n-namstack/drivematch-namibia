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

  const { data: drivers } = await admin
    .from('driver_profiles')
    .select(`
      user_id,
      verification_status,
      rejection_reason,
      years_of_experience,
      license_number,
      profiles!driver_profiles_user_id_fkey (
        firstname, lastname, email, phone
      ),
      driver_documents (
        id, document_type, file_url, selfie_url,
        verification_status, rejection_reason,
        verified_at, verified_by
      )
    `)
    .in('verification_status', ['pending', 'submitted'])
    .order('created_at', { ascending: true })

  // Generate signed URLs for all documents
  const driversWithSignedUrls = await Promise.all(
    (drivers ?? []).map(async (driver) => {
      const docsWithUrls = await Promise.all(
        (driver.driver_documents ?? []).map(async (doc: any) => ({
          ...doc,
          signed_url: await signUrl(admin, doc.file_url),
          signed_selfie_url: await signUrl(admin, doc.selfie_url),
        }))
      )
      return { ...driver, driver_documents: docsWithUrls }
    })
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Verifications</h1>
        <p className="text-slate-500 mt-1">
          {driversWithSignedUrls.length} driver{driversWithSignedUrls.length !== 1 ? 's' : ''} pending review
        </p>
      </div>

      {driversWithSignedUrls.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">All caught up!</h2>
          <p className="text-slate-500">No drivers pending verification</p>
        </div>
      ) : (
        <div className="space-y-4">
          {driversWithSignedUrls.map((driver) => (
            <VerificationPanel key={driver.user_id} driver={driver as any} />
          ))}
        </div>
      )}
    </div>
  )
}
