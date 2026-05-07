import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: { findMany: vi.fn(), update: vi.fn() },
    auditLog: { findMany: vi.fn(), count: vi.fn() },
  },
}))
vi.mock('@/lib/master-context', () => ({ getSuperadminSession: vi.fn() }))
vi.mock('@/lib/audit', () => ({ createAuditEntry: vi.fn() }))

import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { createAuditEntry } from '@/lib/audit'
import { GET, POST, DELETE } from '@/app/api/master/admins/route'

const mockSuperadmin = { id: 'user_1', name: 'Josh', email: 'j@x.com', systemRole: 'SUPERADMIN' }

describe('POST /api/master/admins — assign SUPERADMIN', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user_5' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('sets systemRole to SUPERADMIN and writes audit entry', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.user.update).mockResolvedValue({ id: 'user_5', email: 'new@x.com', systemRole: 'SUPERADMIN' } as any)
    const req = new Request('http://localhost/api/master/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user_5' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user_5' },
      data: { systemRole: 'SUPERADMIN' },
    })
    expect(createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: 'SUPERADMIN_ASSIGNED' }))
  })
})

describe('DELETE /api/master/admins — revoke SUPERADMIN', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost/api/master/admins?userId=user_5', { method: 'DELETE' }) as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 when trying to revoke self', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    const res = await DELETE(new Request(`http://localhost/api/master/admins?userId=${mockSuperadmin.id}`, { method: 'DELETE' }) as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/revoke your own/i)
  })

  it('returns 200 and writes SUPERADMIN_REVOKED audit entry on success', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.user.update).mockResolvedValue({ id: 'user_5', email: 'other@x.com', systemRole: null } as any)
    const res = await DELETE(new Request('http://localhost/api/master/admins?userId=user_5', { method: 'DELETE' }) as any)
    expect(res.status).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user_5' },
      data: { systemRole: null },
    })
    expect(createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: 'SUPERADMIN_REVOKED' }))
  })
})

describe('GET /api/master/admins', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/admins')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns admins list', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'user_1', name: 'Josh', email: 'j@x.com' }] as any)
    const req = new Request('http://localhost/api/master/admins')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.admins).toHaveLength(1)
  })
})
