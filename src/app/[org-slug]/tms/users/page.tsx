'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Member = {
  userId: string
  role: string
  user: { id: string; name: string | null; email: string }
  department?: { name: string } | null
}

export default function TmsUsersPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    fetch(`/api/tms/${slug}/users`).then((r) => r.json()).then((d) => setMembers(d.members ?? []))
  }, [slug])

  async function remove(userId: string) {
    await fetch(`/api/tms/${slug}/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Users</h1>
          <p className="text-slate-500 text-sm">{members.length} members</p>
        </div>
        <button className="bg-emerald-500 text-slate-950 rounded px-4 py-2 text-sm font-semibold">+ Invite User</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Role</th>
            <th className="text-left py-2 px-3">Department</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{m.user.name}</td>
              <td className="py-2 px-3">{m.role}</td>
              <td className="py-2 px-3">{m.department?.name ?? '—'}</td>
              <td className="py-2 px-3">
                <button onClick={() => remove(m.userId)} className="text-red-400 hover:underline text-xs">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
