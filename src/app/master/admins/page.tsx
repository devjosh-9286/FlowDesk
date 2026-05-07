'use client'
import { useEffect, useState } from 'react'

type Admin = { id: string; name: string | null; email: string; createdAt: string }

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])

  useEffect(() => {
    fetch('/api/master/admins').then((r) => r.json()).then((d) => setAdmins(d.admins ?? []))
  }, [])

  async function revoke(userId: string) {
    await fetch(`/api/master/admins?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    setAdmins((prev) => prev.filter((a) => a.id !== userId))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Platform Admins</h1>
      <p className="text-slate-500 text-sm mb-6">Users with SUPERADMIN role</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Email</th>
            <th className="text-left py-2 px-3">Since</th>
            <th className="text-left py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{a.name}</td>
              <td className="py-2 px-3">{a.email}</td>
              <td className="py-2 px-3 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
              <td className="py-2 px-3">
                <button onClick={() => revoke(a.id)} className="text-red-400 hover:underline text-xs">Revoke</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
