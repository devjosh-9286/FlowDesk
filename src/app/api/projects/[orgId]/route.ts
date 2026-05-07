import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const projects = await db.project.findMany({ where: { orgId } })
  return NextResponse.json({ projects })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params

  const org = await db.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (membership.role !== 'ADMIN' && membership.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, deptId, flowTemplateId } = body

  const project = await db.project.create({
    data: {
      orgId,
      deptId,
      flowTemplateId,
      name,
      createdBy: session.user.id,
    },
  })

  const ip = req.headers.get('x-forwarded-for') ?? undefined
  await createAuditEntry({
    orgId,
    actorId: session.user.id,
    entityType: 'PROJECT',
    entityId: project.id,
    entityLabel: project.name,
    action: 'CREATE',
    after: { name: project.name, status: project.status },
    ipAddress: ip,
  })

  return NextResponse.json({ project }, { status: 201 })
}
