import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    organization: { findUnique: vi.fn() },
    auditLog: { findMany: vi.fn(), count: vi.fn() },
  },
}))
vi.mock('@/lib/master-context', () => ({ getSuperadminSession: vi.fn() }))

import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { GET } from '@/app/api/master/audit/route'

const mockSuperadmin = { id: 'user_1', name: 'Josh', email: 'j@x.com', systemRole: 'SUPERADMIN' }

describe('GET /api/master/audit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/master/audit') as any)
    expect(res.status).toBe(401)
  })

  it('returns paginated audit entries', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.auditLog.findMany).mockResolvedValue([{ id: 'evt_1' }] as any)
    vi.mocked(db.auditLog.count).mockResolvedValue(1)
    const res = await GET(new Request('http://localhost/api/master/audit?days=7') as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entries).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(50)
  })

  it('resolves orgSlug to orgId for filtering', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.organization.findUnique).mockResolvedValue({ id: 'org_1' } as any)
    vi.mocked(db.auditLog.findMany).mockResolvedValue([])
    vi.mocked(db.auditLog.count).mockResolvedValue(0)
    const res = await GET(new Request('http://localhost/api/master/audit?orgSlug=acme') as any)
    expect(res.status).toBe(200)
    expect(db.organization.findUnique).toHaveBeenCalledWith({ where: { slug: 'acme' }, select: { id: true } })
    const callArgs = vi.mocked(db.auditLog.findMany).mock.calls[0][0] as any
    expect(callArgs.where.orgId).toBe('org_1')
  })
})
