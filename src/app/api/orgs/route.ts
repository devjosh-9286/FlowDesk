import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createAuditEntry } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const memberships = await db.orgMembership.findMany({
      where: { userId: session.user.id },
      include: { org: { include: { tenantConfig: true, _count: { select: { memberships: true } } } } },
    })

    const orgs = memberships.map(m => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      plan: m.org.tenantConfig?.plan ?? 'free',
      memberCount: m.org._count.memberships,
      role: m.role,
    }))

    return NextResponse.json({ orgs })
  } catch (e) {
    console.error('[GET /api/orgs]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug } = await req.json()
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  // Server-side slug format validation
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be 3-63 chars, lowercase alphanumeric and hyphens only' }, { status: 400 })
  }

  try {
    const org = await db.organization.create({
      data: {
        name,
        slug,
        memberships: { create: { userId: session.user.id, role: 'ADMIN' } },
      },
    })

    const ip = req.headers.get('x-forwarded-for') ?? undefined
    await createAuditEntry({
      orgId: org.id,
      actorId: session.user.id,
      entityType: 'ORGANIZATION',
      entityId: org.id,
      entityLabel: org.name,
      action: 'CREATE',
      after: { name: org.name, slug: org.slug },
      ipAddress: ip,
    })

    return NextResponse.json({ org }, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }
    console.error('[POST /api/orgs]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
