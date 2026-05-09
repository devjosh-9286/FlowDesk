import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { DarkProvider } from '@/components/shell/DarkProvider'
import { OrgShell } from './OrgShell'

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ 'org-slug': string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug } = await params

  try {
    const org = await db.organization.findUnique({
      where: { slug },
      include: { tenantConfig: true, _count: { select: { memberships: true } } },
    })
    if (!org) redirect('/orgs')

    const membership = await db.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
    })
    if (!membership) redirect('/orgs')

    const user = await db.user.findUnique({ where: { id: session.user.id } })

    return (
      <DarkProvider>
        <OrgShell
          orgName={org.name}
          orgSlug={org.slug}
          plan={org.tenantConfig?.plan ?? 'free'}
          memberCount={org._count.memberships}
          role={membership.role}
          userName={user?.name ?? ''}
          userEmail={user?.email ?? ''}
          isAdmin={membership.role === 'ADMIN'}
        >
          {children}
        </OrgShell>
      </DarkProvider>
    )
  } catch (e) {
    // Redirect errors from `redirect()` must be re-thrown
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    console.error('[OrgLayout]', e)
    redirect('/orgs')
  }
}
