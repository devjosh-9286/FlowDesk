import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { KanbanClient } from './KanbanClient'

export default async function ProjectKanbanPage({
  params,
}: {
  params: Promise<{ 'org-slug': string; projectId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { 'org-slug': slug, projectId } = await params
  const org = await db.organization.findUnique({ where: { slug } })
  if (!org) redirect('/orgs')

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  })
  if (!membership) redirect('/orgs')

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        template: { select: { name: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!project || project.orgId !== org.id) redirect(`/${slug}/projects`)

    const members = await db.orgMembership.findMany({
      where: { orgId: org.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return (
      <KanbanClient
        orgSlug={slug}
        orgId={org.id}
        project={{ id: project.id, name: project.name, templateName: project.template.name }}
        tasks={project.tasks.map(tk => ({
          id: tk.id,
          title: tk.title,
          status: tk.status,
          nodeId: tk.nodeId,
          dueDate: tk.dueDate?.toISOString() ?? null,
          assigneeId: tk.assignee?.id ?? null,
          assigneeName: tk.assignee?.name ?? tk.assignee?.email ?? null,
          checklistItems: tk.checklistItems as { text: string; done: boolean }[],
        }))}
        members={members.map(m => ({
          id: m.user.id,
          name: m.user.name ?? m.user.email,
        }))}
        canEdit={membership.role === 'ADMIN' || membership.role === 'MANAGER'}
      />
    )
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    console.error('[ProjectKanbanPage]', e)
    redirect(`/${slug}/projects`)
  }
}
