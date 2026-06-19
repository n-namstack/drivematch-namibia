'use server'

import { createAdminClient } from './supabase/admin'
import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function approveDriver(driverId: string) {
  const user = await getAdminUser()
  const admin = createAdminClient()

  await admin.from('driver_profiles')
    .update({ verification_status: 'verified' })
    .eq('user_id', driverId)

  await admin.from('driver_documents')
    .update({ verification_status: 'verified', verified_by: user.id, verified_at: new Date().toISOString() })
    .eq('driver_id', driverId)
    .in('verification_status', ['pending', 'submitted'])

  await admin.from('admin_actions').insert({
    admin_id: user.id, action_type: 'approve_driver',
    target_type: 'driver_profile', target_id: driverId,
  })

  await admin.from('notifications').insert({
    user_id: driverId,
    title: 'Profile Verified!',
    message: 'Congratulations! Your driver profile has been verified. You can now appear in search results.',
    type: 'verification',
    data: { status: 'verified' },
  })

  revalidatePath('/verifications')
  revalidatePath('/dashboard')
  revalidatePath('/drivers')
}

export async function rejectDriver(driverId: string, reason: string) {
  const user = await getAdminUser()
  const admin = createAdminClient()

  await admin.from('driver_profiles')
    .update({ verification_status: 'rejected', rejection_reason: reason })
    .eq('user_id', driverId)

  await admin.from('admin_actions').insert({
    admin_id: user.id, action_type: 'reject_driver',
    target_type: 'driver_profile', target_id: driverId, reason,
  })

  await admin.from('notifications').insert({
    user_id: driverId,
    title: 'Verification Update',
    message: `Your profile verification could not be approved. Reason: ${reason}. Please update your documents and resubmit.`,
    type: 'verification',
    data: { status: 'rejected', reason },
  })

  revalidatePath('/verifications')
  revalidatePath('/dashboard')
  revalidatePath('/drivers')
}

export async function approveDocument(documentId: string) {
  const user = await getAdminUser()
  const admin = createAdminClient()

  await admin.from('driver_documents')
    .update({ verification_status: 'verified', verified_by: user.id, verified_at: new Date().toISOString(), rejection_reason: null })
    .eq('id', documentId)

  await admin.from('admin_actions').insert({
    admin_id: user.id, action_type: 'approve_document',
    target_type: 'driver_document', target_id: documentId,
  })

  revalidatePath('/verifications')
}

export async function rejectDocument(documentId: string, reason: string) {
  const user = await getAdminUser()
  const admin = createAdminClient()

  await admin.from('driver_documents')
    .update({ verification_status: 'rejected', rejection_reason: reason })
    .eq('id', documentId)

  await admin.from('admin_actions').insert({
    admin_id: user.id, action_type: 'reject_document',
    target_type: 'driver_document', target_id: documentId, reason,
  })

  revalidatePath('/verifications')
}

export async function setUserAdmin(userId: string, isAdmin: boolean) {
  const user = await getAdminUser()
  const admin = createAdminClient()

  await admin.from('profiles').update({ role: isAdmin ? 'admin' : 'owner' }).eq('id', userId)

  await admin.from('admin_actions').insert({
    admin_id: user.id,
    action_type: isAdmin ? 'make_admin' : 'remove_admin',
    target_type: 'profile', target_id: userId,
  })

  revalidatePath('/users')
}

export async function setUserActive(userId: string, isActive: boolean) {
  const user = await getAdminUser()
  const admin = createAdminClient()

  await admin.from('profiles').update({ is_active: isActive }).eq('id', userId)

  await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? 'none' : '876000h',
  })

  await admin.from('admin_actions').insert({
    admin_id: user.id,
    action_type: isActive ? 'enable_user' : 'disable_user',
    target_type: 'profile', target_id: userId,
  })

  revalidatePath('/users')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
