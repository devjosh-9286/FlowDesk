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

  try {
    const membership = await db.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: session.user.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const templates = await db.flowTemplate.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true, email: true } },
        _count: { select: { projects: true } },
      },
    })
    return NextResponse.json({ templates })
  } catch (err) {
    console.error('[templates GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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

  try {
    const membership = await db.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: session.user.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, nodes, edges } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const template = await db.flowTemplate.create({
      data: {
        orgId,
        name,
        nodes: nodes ?? [],
        edges: edges ?? [],
        createdBy: session.user.id,
      },
    })

    const ip = req.headers.get('x-forwarded-for') ?? undefined
    await createAuditEntry({
      orgId,
      actorId: session.user.id,
      entityType: 'FLOW_TEMPLATE',
      entityId: template.id,
      entityLabel: template.name,
      action: 'CREATE',
      after: { name: template.name },
      ipAddress: ip,
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    console.error('[templates POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
