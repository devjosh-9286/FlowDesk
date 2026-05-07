import { getSuperadminSession } from '@/lib/master-context'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TenantsPage() {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tenantConfig: true, _count: { select: { memberships: true } } },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">All Tenants</h1>
          <p className="text-slate-500 text-sm">{orgs.length} orgs</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Org</th>
            <th className="text-left py-2 px-3">Plan</th>
            <th className="text-left py-2 px-3">Seats</th>
            <th className="text-left py-2 px-3">Created</th>
            <th className="text-left py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => {
            const seats = org._count.memberships
            const limit = org.tenantConfig?.seatLimit ?? 5
            return (
              <tr key={org.id} className="border-b border-slate-900 text-slate-400">
                <td className="py-2 px-3 text-slate-100 font-medium">{org.name}</td>
                <td className="py-2 px-3">{org.tenantConfig?.plan ?? 'free'}</td>
                <td className={`py-2 px-3 ${seats / limit >= 0.9 ? 'text-amber-400' : ''}`}>
                  {seats} / {limit}
                </td>
                <td className="py-2 px-3 text-xs">{new Date(org.createdAt).toLocaleDateString()}</td>
                <td className="py-2 px-3">
                  <Link href={`/master/tenants/${org.slug}/config`} className="text-indigo-400 hover:underline text-xs">
                    Manage →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
