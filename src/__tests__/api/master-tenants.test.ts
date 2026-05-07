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
import { createAuditEntry } from '@/lib/audit'
import { GET } from '@/app/api/master/tenants/route'
import {
  GET as GetOrgSlug,
  PATCH as PatchOrgSlug,
} from '@/app/api/master/tenants/[org-slug]/route'

const mockSuperadmin = { id: 'user_1', name: 'Josh', email: 'j@x.com', systemRole: 'SUPERADMIN' }

const mockParams = (slug: string) => Promise.resolve({ 'org-slug': slug })

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

describe('GET /api/master/tenants/[org-slug]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/tenants/acme')
    const res = await GetOrgSlug(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(401)
  })

  it('returns 404 when org not found', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.organization.findUnique).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/tenants/nope')
    const res = await GetOrgSlug(req as any, { params: mockParams('nope') })
    expect(res.status).toBe(404)
  })

  it('returns org when found', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.organization.findUnique).mockResolvedValue({ id: 'org_1', name: 'Acme', slug: 'acme' } as any)
    const req = new Request('http://localhost/api/master/tenants/acme')
    const res = await GetOrgSlug(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.org.name).toBe('Acme')
  })
})

describe('PATCH /api/master/tenants/[org-slug]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/tenants/acme', { method: 'PATCH', body: '{}' })
    const res = await PatchOrgSlug(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(401)
  })

  it('upserts config and fires audit entry on plan change', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(mockSuperadmin)
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme',
      tenantConfig: { plan: 'free', seatLimit: 5, featureFlags: {}, ssoConfig: {}, branding: {} },
    } as any)
    vi.mocked(db.tenantConfig.upsert).mockResolvedValue({
      plan: 'pro', seatLimit: 25, featureFlags: {}, ssoConfig: {}, branding: {},
    } as any)
    const body = JSON.stringify({ plan: 'pro', seatLimit: 25, featureFlags: {}, ssoConfig: {}, branding: {} })
    const req = new Request('http://localhost/api/master/tenants/acme', {
      method: 'PATCH', body, headers: { 'Content-Type': 'application/json' },
    })
    const res = await PatchOrgSlug(req as any, { params: mockParams('acme') })
    expect(res.status).toBe(200)
    expect(vi.mocked(createAuditEntry)).toHaveBeenCalledWith(expect.objectContaining({ action: 'PLAN_CHANGED' }))
  })
})
