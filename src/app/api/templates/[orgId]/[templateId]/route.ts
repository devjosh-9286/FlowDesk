import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

async function getMembership(orgId: string, userId: string) {
  return db.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, templateId } = await params

  try {
    const membership = await getMembership(orgId, session.user.id)
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const template = await db.flowTemplate.findUnique({ where: { id: templateId } })
    if (!template || template.orgId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ template })
  } catch (err) {
    console.error('[template GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, templateId } = await params

  try {
    const membership = await getMembership(orgId, session.user.id)
    if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const template = await db.flowTemplate.findUnique({ where: { id: templateId } })
    if (!template || template.orgId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { name, nodes, edges, publishedAt } = await req.json()
    const updated = await db.flowTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined && { name }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
      },
    })
    return NextResponse.json({ template: updated })
  } catch (err) {
    console.error('[template PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, templateId } = await params

  try {
    const membership = await getMembership(orgId, session.user.id)
    if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const template = await db.flowTemplate.findUnique({ where: { id: templateId } })
    if (!template || template.orgId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.flowTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[template DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
