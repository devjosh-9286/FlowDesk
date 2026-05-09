import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug } = await req.json()
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  const exists = await db.organization.findUnique({ where: { slug } })
  if (exists) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  const org = await db.organization.create({
    data: {
      name,
      slug,
      memberships: { create: { userId: session.user.id, role: 'ADMIN' } },
    },
  })

  return NextResponse.json({ org }, { status: 201 })
}
