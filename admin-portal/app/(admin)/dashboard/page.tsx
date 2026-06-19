import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import StatsCard from '@/components/StatsCard'
import ActivityChart from '@/components/charts/ActivityChart'
import EarningsChart from '@/components/charts/EarningsChart'
import DonutChart from '@/components/charts/DonutChart'
import { Users, Car, ShieldCheck, Clock, BriefcaseBusiness, FileText, TrendingUp, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

function buildDateRange(days: number) {
  return Array.from({ length: days }, (_, i) => format(subDays(new Date(), days - 1 - i), 'MMM d'))
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
  const dateLabels = buildDateRange(30)

  const [
    { count: totalDrivers },
    { count: totalOwners },
    { count: pendingVerification },
    { count: verifiedDrivers },
    { data: newSignupsRaw },
    { data: allEntriesRaw },
    { data: entriesLast30Raw },
    { data: agreementsRaw },
    { data: allHiresRaw },
    { data: hiresLast30Raw },
  ] = await Promise.all([
    admin.from('driver_profiles').select('user_id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner'),
    admin.from('driver_profiles').select('user_id', { count: 'exact', head: true }).in('verification_status', ['pending', 'submitted']),
    admin.from('driver_profiles').select('user_id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    admin.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
    admin.from('agreement_entries').select('entry_date, amount'),
    admin.from('agreement_entries').select('entry_date, amount').gte('entry_date', thirtyDaysAgo.split('T')[0]!),
    admin.from('driver_agreements').select('agreement_type, status'),
    admin.from('hire_offers').select('status, created_at'),
    admin.from('hire_offers').select('status, created_at').gte('created_at', thirtyDaysAgo),
  ])

  const signupByDate: Record<string, number> = {}
  for (const row of newSignupsRaw ?? []) {
    const d = format(new Date(row.created_at), 'MMM d')
    signupByDate[d] = (signupByDate[d] ?? 0) + 1
  }

  const earningsByDate: Record<string, number> = {}
  for (const row of entriesLast30Raw ?? []) {
    const d = format(new Date(row.entry_date), 'MMM d')
    earningsByDate[d] = (earningsByDate[d] ?? 0) + Number(row.amount ?? 0)
  }

  const hiresByDate: Record<string, number> = {}
  for (const row of hiresLast30Raw ?? []) {
    const d = format(new Date(row.created_at), 'MMM d')
    hiresByDate[d] = (hiresByDate[d] ?? 0) + 1
  }

  const signupChartData = dateLabels.map((d) => ({ date: d, 'New Signups': signupByDate[d] ?? 0 }))
  const earningsChartData = dateLabels.map((d) => ({ date: d, amount: earningsByDate[d] ?? 0 }))
  const hiresChartData = dateLabels.map((d) => ({ date: d, 'New Offers': hiresByDate[d] ?? 0 }))

  const hireStatusCounts = { accepted: 0, pending: 0, rejected: 0, withdrawn: 0 }
  for (const h of allHiresRaw ?? []) {
    if (h.status in hireStatusCounts) (hireStatusCounts as any)[h.status]++
  }
  const activeHires = hireStatusCounts.accepted

  const agreementTypeCounts: Record<string, number> = {}
  let activeAgreements = 0
  for (const a of agreementsRaw ?? []) {
    if (a.status === 'active') {
      activeAgreements++
      agreementTypeCounts[a.agreement_type] = (agreementTypeCounts[a.agreement_type] ?? 0) + 1
    }
  }

  const totalEntryAmount = (allEntriesRaw ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const distinctDates = new Set((allEntriesRaw ?? []).map((r) => r.entry_date)).size
  const avgDailyEarnings = distinctDates > 0 ? Math.round(totalEntryAmount / distinctDates) : 0

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform overview · Last updated just now</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatsCard title="Total Drivers" value={totalDrivers ?? 0} icon={Users} color="blue" />
        <StatsCard title="Car Owners" value={totalOwners ?? 0} icon={Car} color="purple" />
        <StatsCard title="Pending Verification" value={pendingVerification ?? 0} icon={Clock} color="amber" urgent={(pendingVerification ?? 0) > 0} />
        <StatsCard title="Verified Drivers" value={verifiedDrivers ?? 0} icon={ShieldCheck} color="green" />
        <StatsCard title="Active Hires" value={activeHires} icon={BriefcaseBusiness} color="teal" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard title="Total Hire Offers" value={(allHiresRaw ?? []).length} icon={BriefcaseBusiness} color="blue" />
        <StatsCard title="Active Agreements" value={activeAgreements} icon={FileText} color="purple" />
        <StatsCard title="Jobs Posted (30d)" value={(hiresLast30Raw ?? []).length} icon={TrendingUp} color="slate" />
        <StatsCard title="Avg Daily Earnings" value={avgDailyEarnings} icon={Activity} color="teal" prefix="N$" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">New Signups (30 days)</h3>
          <ActivityChart data={signupChartData} dataKeys={[{ key: 'New Signups', color: '#6366f1', label: 'New Signups' }]} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Daily Logged Earnings — N$ (30 days)</h3>
          <EarningsChart data={earningsChartData} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">New Hire Offers (30 days)</h3>
          <ActivityChart data={hiresChartData} dataKeys={[{ key: 'New Offers', color: '#0ea5e9', label: 'New Offers' }]} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Hire Offer Status</h3>
          <DonutChart
            centerLabel="Total"
            data={[
              { name: 'Accepted',  value: hireStatusCounts.accepted,  color: '#10b981' },
              { name: 'Pending',   value: hireStatusCounts.pending,   color: '#f59e0b' },
              { name: 'Rejected',  value: hireStatusCounts.rejected,  color: '#ef4444' },
              { name: 'Withdrawn', value: hireStatusCounts.withdrawn, color: '#94a3b8' },
            ]}
          />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Agreement Types</h3>
          <DonutChart
            centerLabel="Active"
            centerValue={activeAgreements}
            data={[
              { name: 'Daily Remittance', value: agreementTypeCounts['daily_remittance'] ?? 0, color: '#8b5cf6' },
              { name: 'Buyout',           value: agreementTypeCounts['buyout'] ?? 0,           color: '#06b6d4' },
            ]}
          />
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Verification Status</h3>
          <DonutChart
            centerLabel="Drivers"
            data={[
              { name: 'Verified',   value: verifiedDrivers ?? 0,   color: '#10b981' },
              { name: 'Unverified', value: pendingVerification ?? 0, color: '#f59e0b' },
            ]}
          />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Platform Health</h3>
          <div className="space-y-3">
            {[
              { label: 'Driver Verification Rate', value: (totalDrivers ?? 0) > 0 ? Math.round(((verifiedDrivers ?? 0) / (totalDrivers ?? 1)) * 100) : 0, color: 'bg-emerald-500' },
              { label: 'Hire Acceptance Rate', value: (allHiresRaw ?? []).length > 0 ? Math.round((hireStatusCounts.accepted / (allHiresRaw ?? []).length) * 100) : 0, color: 'bg-blue-500' },
              { label: 'Active Agreement Rate', value: (agreementsRaw ?? []).length > 0 ? Math.round((activeAgreements / (agreementsRaw ?? []).length) * 100) : 0, color: 'bg-violet-500' },
              { label: 'Owners with Active Hires', value: (totalOwners ?? 0) > 0 ? Math.round((activeHires / (totalOwners ?? 1)) * 100) : 0, color: 'bg-teal-500' },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600">{metric.label}</span>
                  <span className="text-xs font-bold text-slate-800">{metric.value}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${metric.color} rounded-full transition-all`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
