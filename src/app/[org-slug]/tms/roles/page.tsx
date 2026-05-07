'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Member = {
  id: string
  userId: string
  role: string
  user: { name: string; email: string }
  department?: { name: string } | null
}
const ROLES = ['ADMIN', 'MANAGER', 'MEMBER']

export default function TmsRolesPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    fetch(`/api/tms/${slug}/users`).then((r) => r.json()).then((d) => setMembers(d.members ?? []))
  }, [slug])

  async function changeRole(userId: string, role: string) {
    const res = await fetch(`/api/tms/${slug}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    if (!res.ok) return
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Roles</h1>
      <p className="text-slate-500 text-sm mb-6">Assign roles per member</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Member</th>
            <th className="text-left py-2 px-3">Email</th>
            <th className="text-left py-2 px-3">Department</th>
            <th className="text-left py-2 px-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{m.user.name}</td>
              <td className="py-2 px-3">{m.user.email}</td>
              <td className="py-2 px-3">{m.department?.name ?? '—'}</td>
              <td className="py-2 px-3">
                <select
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs"
                  value={m.role}
                  onChange={(e) => changeRole(m.userId, e.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
