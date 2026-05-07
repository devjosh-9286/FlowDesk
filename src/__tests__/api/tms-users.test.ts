import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { orgMembership: { findMany: vi.fn(), delete: vi.fn() }, user: { findUnique: vi.fn() } },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/org-context', () => ({ getOrgMembership: vi.fn() }))
vi.mock('@/lib/audit', () => ({ createAuditEntry: vi.fn() }))

import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { GET } from '@/app/api/tms/[org-slug]/users/route'

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
