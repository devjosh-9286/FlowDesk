import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

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

  const approvals = await db.approvalRecord.findMany({ where: { projectId } })
  return NextResponse.json({ approvals })
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

  const project = await db.project.findUnique({ where: { id: projectId } })
  if (!project || project.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { nodeId, approverId } = body

  const record = await db.approvalRecord.create({
    data: {
      projectId,
      nodeId,
      approverId,
    },
  })

  return NextResponse.json({ record }, { status: 201 })
}
