import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, projectId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await db.project.findUnique({ where: { id: projectId } })
  if (!project || project.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const tasks = await db.task.findMany({ where: { projectId } })
  return NextResponse.json({ tasks })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, projectId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!['ADMIN', 'MANAGER'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const project = await db.project.findUnique({ where: { id: projectId } })
  if (!project || project.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { nodeId, title, assigneeId, dueDate } = body

  const task = await db.task.create({
    data: {
      projectId,
      nodeId,
      title,
      assigneeId: assigneeId ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'TASK',
    entityId: task.id,
    entityLabel: task.title,
    action: 'CREATE',
    after: { title: task.title, status: task.status, assigneeId: task.assigneeId, dueDate: task.dueDate },
    ipAddress: ip,
  })

  return NextResponse.json({ task }, { status: 201 })
}
