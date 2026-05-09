import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { TemplateBuilderClient } from './TemplateBuilderClient'

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ 'org-slug': string; templateId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug, templateId } = await params
  try {
    const org = await db.organization.findUnique({ where: { slug } })
    if (!org) redirect('/orgs')

    const membership = await db.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
    })
    if (!membership || membership.role !== 'ADMIN') redirect(`/${slug}`)

    const template = await db.flowTemplate.findUnique({ where: { id: templateId } })
    if (!template || template.orgId !== org.id) redirect(`/${slug}/templates`)

    return (
      <TemplateBuilderClient
        orgSlug={slug}
        orgId={org.id}
        template={{
          id: template.id,
          name: template.name,
          nodes: template.nodes as object[],
          edges: template.edges as object[],
          publishedAt: template.publishedAt?.toISOString() ?? null,
        }}
      />
    )
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    console.error('[TemplateBuilderPage]', e)
    redirect(`/${slug}/templates`)
  }
}
