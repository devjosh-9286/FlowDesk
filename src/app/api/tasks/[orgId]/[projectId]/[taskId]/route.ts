import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, projectId, taskId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const task = await db.task.findUnique({ where: { id: taskId } })
  if (!task || task.projectId !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ task })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, projectId, taskId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const task = await db.task.findUnique({ where: { id: taskId } })
  if (!task || task.projectId !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { title, status, assigneeId, dueDate } = body

  const before = {
    title: task.title,
    status: task.status,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      title,
      status,
      assigneeId,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
    },
  })

  const after = {
    title: updated.title,
    status: updated.status,
    assigneeId: updated.assigneeId,
    dueDate: updated.dueDate,
  }

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'TASK',
    entityId: task.id,
    entityLabel: updated.title,
    action: 'UPDATE',
    before,
    after,
    ipAddress: ip,
  })

  return NextResponse.json({ task: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, projectId, taskId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const task = await db.task.findUnique({ where: { id: taskId } })
  if (!task || task.projectId !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.task.delete({ where: { id: taskId } })

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'TASK',
    entityId: task.id,
    entityLabel: task.title,
    action: 'DELETE',
    before: {
      title: task.title,
      status: task.status,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
    },
    ipAddress: ip,
  })

  return NextResponse.json({ success: true })
}
