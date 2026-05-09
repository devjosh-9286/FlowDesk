import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ProjectsClient } from './ProjectsClient'

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ 'org-slug': string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug } = await params
  const org = await db.organization.findUnique({ where: { slug } })
  if (!org) redirect('/orgs')

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  })
  if (!membership) redirect('/orgs')

  try {
    const [projects, templates, departments] = await Promise.all([
      db.project.findMany({
        where: { orgId: org.id },
        include: {
          template: { select: { name: true } },
          department: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.flowTemplate.findMany({
        where: { orgId: org.id },
        select: { id: true, name: true },
      }),
      db.department.findMany({
        where: { orgId: org.id },
        select: { id: true, name: true },
      }),
    ])

    return (
      <ProjectsClient
        orgSlug={slug}
        orgId={org.id}
        canCreate={membership.role === 'ADMIN' || membership.role === 'MANAGER'}
        projects={projects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          templateName: p.template?.name ?? '(deleted)',
          deptName: p.department?.name ?? '(deleted)',
          taskCount: p._count.tasks,
        }))}
        templates={templates}
        departments={departments}
      />
    )
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    console.error('[ProjectsPage]', e)
    redirect('/orgs')
  }
}
