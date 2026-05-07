import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findMany: vi.fn(), findUnique: vi.fn() },
    tenantConfig: { upsert: vi.fn() },
  },
}))
vi.mock('@/lib/master-context', () => ({ getSuperadminSession: vi.fn() }))
vi.mock('@/lib/audit', () => ({ createAuditEntry: vi.fn() }))

import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { GET } from '@/app/api/master/tenants/route'

const mockSuperadmin = { id: 'user_1', name: 'Josh', email: 'j@x.com', systemRole: 'SUPERADMIN' }

describe('GET /api/master/tenants', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/tenants')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns org list when SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.organization.findMany).mockResolvedValue([
      { id: 'org_1', name: 'Acme', slug: 'acme', createdAt: new Date() } as any,
    ])
    const req = new Request('http://localhost/api/master/tenants')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.orgs).toHaveLength(1)
  })
})
