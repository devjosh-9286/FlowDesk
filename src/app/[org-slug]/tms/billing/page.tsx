import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { getTenantConfig } from '@/lib/tenant-config'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { SeatUsageBar } from '@/components/tms/SeatUsageBar'

export default async function TmsBillingPage({ params }: { params: Promise<{ 'org-slug': string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership) redirect('/')
  const config = await getTenantConfig(membership.orgId)
  const memberCount = await db.orgMembership.count({ where: { orgId: membership.orgId } })

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Billing</h1>
      <p className="text-slate-500 text-sm mb-6">Read-only. Contact support to change plan.</p>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Current plan</span>
          <span className="text-emerald-400 font-semibold capitalize">{config.plan}</span>
        </div>
        <div>
          <div className="text-slate-400 text-sm mb-2">Seat usage</div>
          <SeatUsageBar used={memberCount} limit={config.seatLimit} />
          {memberCount / config.seatLimit >= 0.9 && (
            <p className="text-amber-400 text-xs mt-2">Near seat limit. Contact support to increase.</p>
          )}
        </div>
        <a
          href="mailto:support@flowdesk.io"
          className="block text-center bg-slate-800 text-slate-300 rounded px-4 py-2 text-sm hover:bg-slate-700"
        >
          Contact support →
        </a>
      </div>
    </div>
  )
}
