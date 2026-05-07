import { redirect } from 'next/navigation'
import { getSuperadminSession } from '@/lib/master-context'
import { MasterSidebar } from '@/components/master/MasterSidebar'

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <MasterSidebar actorEmail={user.email} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
