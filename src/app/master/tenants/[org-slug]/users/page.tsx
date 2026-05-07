import { getSuperadminSession } from '@/lib/master-context'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function TenantUsersPage({ params }: { params: Promise<{ 'org-slug': string }> }) {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  const { 'org-slug': slug } = await params
  const org = await db.organization.findUnique({ where: { slug } })
  if (!org) redirect('/master/tenants')

  const members = await db.orgMembership.findMany({
    where: { orgId: org.id },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      department: { select: { name: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Users — {org.name}</h1>
      <p className="text-slate-500 text-sm mb-6">{members.length} members</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Email</th>
            <th className="text-left py-2 px-3">Role</th>
            <th className="text-left py-2 px-3">Department</th>
            <th className="text-left py-2 px-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{m.user.name}</td>
              <td className="py-2 px-3">{m.user.email}</td>
              <td className="py-2 px-3">{m.role}</td>
              <td className="py-2 px-3">{m.department?.name ?? '—'}</td>
              <td className="py-2 px-3 text-xs">{new Date(m.user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
