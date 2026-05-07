import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: { findMany: vi.fn(), count: vi.fn() },
  },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/org-context', () => ({ getOrgMembership: vi.fn() }))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { GET } from '@/app/api/tms/[org-slug]/audit/route'

const mockParams = (slug: string) => Promise.resolve({ 'org-slug': slug })

describe('GET /api/tms/[org-slug]/audit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/tms/acme/audit')
    const res = await GET(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(401)
  })

  it('returns 403 when not ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'MEMBER', orgId: 1 } as any)
    const req = new NextRequest('http://localhost/api/tms/acme/audit')
    const res = await GET(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(403)
  })

  it('returns entries scoped to org', async () => {
    const { db } = await import('@/lib/db')
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'ADMIN', orgId: 42 } as any)
    vi.mocked(db.auditLog.findMany).mockResolvedValue([
      { id: 'log_1', orgId: 42, entityType: 'PROJECT', action: 'CREATE' },
    ] as any)
    vi.mocked(db.auditLog.count).mockResolvedValue(1)
    const req = new NextRequest('http://localhost/api/tms/acme/audit')
    const res = await GET(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entries).toHaveLength(1)
    expect(data.total).toBe(1)
    // Verify org scoping: findMany called with orgId: 42
    expect(vi.mocked(db.auditLog.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orgId: 42 }) })
    )
  })
})
