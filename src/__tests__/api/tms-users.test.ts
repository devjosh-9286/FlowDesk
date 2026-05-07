import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { orgMembership: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() }, user: { findUnique: vi.fn() } },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/org-context', () => ({ getOrgMembership: vi.fn() }))
vi.mock('@/lib/audit', () => ({ createAuditEntry: vi.fn() }))

import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { db } from '@/lib/db'
import { GET, DELETE } from '@/app/api/tms/[org-slug]/users/route'

const mockParams = (slug: string) => Promise.resolve({ 'org-slug': slug })

describe('GET /api/tms/[org-slug]/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const req = new Request('http://localhost/api/tms/acme/users')
    const res = await GET(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(401)
  })

  it('returns 403 when not ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'MEMBER', orgId: 'org_1' } as any)
    const req = new Request('http://localhost/api/tms/acme/users')
    const res = await GET(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/tms/[org-slug]/users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not logged in', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const req = new Request('http://localhost/api/tms/acme/users', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user_2' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(401)
  })

  it('returns 403 when not ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'MEMBER', orgId: 1 } as any)
    const req = new Request('http://localhost/api/tms/acme/users', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user_2' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(403)
  })

  it('returns 400 when body is missing userId', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'ADMIN', orgId: 1, org: { slug: 'acme' } } as any)
    const req = new Request('http://localhost/api/tms/acme/users', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(400)
  })

  it('removes member and fires audit entry', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'ADMIN', orgId: 1, org: { slug: 'acme' } } as any)
    vi.mocked(db.orgMembership.findFirst).mockResolvedValue({
      userId: 'user_2', role: 'MEMBER', orgId: 1,
      user: { email: 'bob@x.com' },
    } as any)
    vi.mocked(db.orgMembership.delete).mockResolvedValue({} as any)
    const { createAuditEntry } = await import('@/lib/audit')
    const req = new Request('http://localhost/api/tms/acme/users', {
      method: 'DELETE',
      body: JSON.stringify({ userId: 'user_2' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(200)
    expect(vi.mocked(createAuditEntry)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', entityType: 'ORG_MEMBERSHIP' })
    )
  })
})
