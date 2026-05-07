import { getSuperadminSession } from '@/lib/master-context'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MasterDashboard() {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  const [totalOrgs, totalUsers, proOrgs, enterpriseOrgs] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.tenantConfig.count({ where: { plan: 'pro' } }),
    db.tenantConfig.count({ where: { plan: 'enterprise' } }),
  ])

  const recentOrgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { tenantConfig: true, _count: { select: { memberships: true } } },
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Platform Overview</h1>
      <p className="text-slate-500 text-sm mb-6">All tenants</p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Tenants', value: totalOrgs },
          { label: 'Total Users', value: totalUsers },
          { label: 'Pro Tenants', value: proOrgs },
          { label: 'Enterprise', value: enterpriseOrgs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-100">{value}</div>
            <div className="text-slate-500 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Recent Tenants</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Org</th>
            <th className="text-left py-2 px-3">Plan</th>
            <th className="text-left py-2 px-3">Seats</th>
            <th className="text-left py-2 px-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {recentOrgs.map((org) => (
            <tr key={org.id} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{org.name}</td>
              <td className="py-2 px-3">{org.tenantConfig?.plan ?? 'free'}</td>
              <td className="py-2 px-3">{org._count.memberships} / {org.tenantConfig?.seatLimit ?? 5}</td>
              <td className="py-2 px-3">
                <Link href={`/master/tenants/${org.slug}/config`} className="text-indigo-400 hover:underline text-xs">Manage →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
