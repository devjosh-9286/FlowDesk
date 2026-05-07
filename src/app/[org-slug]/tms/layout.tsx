import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { TmsSidebar } from '@/components/tms/TmsSidebar'

export default async function TmsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ 'org-slug': string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug } = await params
  const membership = await getOrgMembership(session.user.id, slug)
  if (!membership || membership.role !== 'ADMIN') redirect(`/${slug}`)

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <TmsSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
