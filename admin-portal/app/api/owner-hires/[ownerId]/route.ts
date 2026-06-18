import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: { ownerId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { ownerId } = params

  const { data: hires } = await admin
    .from('hire_offers')
    .select('id, title, job_type, status, created_at, start_date, driver_id')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })

  const driverIds = Array.from(new Set((hires ?? []).map((h) => h.driver_id).filter(Boolean)))
  let driverMap: Record<string, { firstname: string | null; lastname: string | null }> = {}
  if (driverIds.length > 0) {
    const { data: drivers } = await admin.from('profiles').select('id, firstname, lastname').in('id', driverIds)
    driverMap = Object.fromEntries((drivers ?? []).map((d) => [d.id, d]))
  }

  return NextResponse.json({ hires: hires ?? [], driverMap })
}
