import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { TemplatesClient } from './TemplatesClient'

export default async function TemplatesPage({ params }: { params: Promise<{ 'org-slug': string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug } = await params
  try {
    const org = await db.organization.findUnique({ where: { slug } })
    if (!org) redirect('/orgs')

    const membership = await db.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
    })
    if (!membership || membership.role !== 'ADMIN') redirect(`/${slug}`)

    const templates = await db.flowTemplate.findMany({
      where: { orgId: org.id },
      include: { creator: { select: { name: true, email: true } }, _count: { select: { projects: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return (
      <TemplatesClient
        orgSlug={slug}
        orgId={org.id}
        templates={templates.map(tp => ({
          id: tp.id,
          name: tp.name,
          projectCount: tp._count.projects,
          publishedAt: tp.publishedAt?.toISOString() ?? null,
          createdAt: tp.createdAt.toISOString(),
          creatorName: tp.creator.name ?? tp.creator.email,
          nodeCount: Array.isArray(tp.nodes) ? (tp.nodes as unknown[]).length : 0,
        }))}
      />
    )
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    console.error('[TemplatesPage]', e)
    redirect('/orgs')
  }
}
