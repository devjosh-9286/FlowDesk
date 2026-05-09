import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { OrgDashboardClient } from './OrgDashboardClient'

export default async function OrgDashboard({
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

  const [activeProjects, pendingApprovals, myTasks, user] = await Promise.all([
    db.project.findMany({
      where: { orgId: org.id, status: 'ACTIVE' },
      include: {
        template: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.approvalRecord.findMany({
      where: { project: { orgId: org.id }, approverId: session.user.id, decision: null },
      include: { project: { select: { id: true, name: true, orgId: true } } },
      take: 5,
    }),
    db.task.findMany({
      where: { project: { orgId: org.id }, assigneeId: session.user.id, status: { not: 'DONE' } },
    }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ])

  return (
    <OrgDashboardClient
      orgSlug={slug}
      orgId={org.id}
      stats={{
        activeProjects: activeProjects.length,
        pendingApprovals: pendingApprovals.length,
        myTasks: myTasks.length,
      }}
      projects={activeProjects.map(p => ({
        id: p.id,
        name: p.name,
        templateName: p.template.name,
        taskCount: p._count.tasks,
      }))}
      pendingApprovals={pendingApprovals.map(a => ({
        id: a.id,
        projectName: a.project.name,
        projectId: a.project.id,
        orgId: a.project.orgId,
        requestedAt: a.requestedAt.toISOString(),
      }))}
      userName={user?.name ?? user?.email ?? 'there'}
    />
  )
}
