import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, firstname, lastname, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const displayName = [profile.firstname, profile.lastname].filter(Boolean).join(' ') || user.email!

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar user={{ email: user.email!, name: displayName }} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
