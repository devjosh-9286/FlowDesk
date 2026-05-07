import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; projectId: string; recordId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, projectId, recordId } = await params

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

  const record = await db.approvalRecord.findUnique({ where: { id: recordId } })
  if (!record || record.projectId !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { decision, comment } = body

  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
  }

  const updated = await db.approvalRecord.update({
    where: { id: recordId },
    data: {
      decision,
      comment: comment ?? null,
      decidedAt: new Date(),
    },
  })

  const action = decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED'
  const ip = req.headers.get('x-forwarded-for') ?? undefined

  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'APPROVAL_RECORD',
    entityId: record.id,
    entityLabel: `${projectId}/${record.nodeId}`,
    action,
    before: { decision: record.decision },
    after: { decision: updated.decision, comment: updated.comment, decidedAt: updated.decidedAt },
    ipAddress: ip,
  })

  return NextResponse.json({ record: updated })
}
