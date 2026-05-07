import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOrgMembership } from '@/lib/org-context'
import { getTenantConfig } from '@/lib/tenant-config'
import { redirect } from 'next/navigation'
import { SeatUsageBar } from '@/components/tms/SeatUsageBar'

export default async function TmsDashboard({ params }: { params: Promise<{ 'org-slug': string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership) redirect('/')
  const config = await getTenantConfig(membership.orgId)

  const [memberCount, projectCount, deptCount] = await Promise.all([
    db.orgMembership.count({ where: { orgId: membership.orgId } }),
    db.project.count({ where: { orgId: membership.orgId, status: 'ACTIVE' } }),
    db.department.count({ where: { orgId: membership.orgId } }),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Admin Portal</h1>
      <p className="text-slate-500 text-sm mb-6">{config.plan} plan</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100 mb-1">{memberCount}</div>
          <div className="text-slate-500 text-xs mb-3">Members</div>
          <SeatUsageBar used={memberCount} limit={config.seatLimit} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100">{projectCount}</div>
          <div className="text-slate-500 text-xs">Active projects</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100">{deptCount}</div>
          <div className="text-slate-500 text-xs">Departments</div>
        </div>
      </div>
    </div>
  )
}
