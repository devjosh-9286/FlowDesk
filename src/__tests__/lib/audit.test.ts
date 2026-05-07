import { describe, it, expect, vi } from 'vitest'
import { maskSensitiveFields, buildAuditParams } from '@/lib/audit'

describe('maskSensitiveFields', () => {
  it('redacts clientSecret from ssoConfig snapshot', () => {
    const snapshot = {
      plan: 'pro',
      ssoConfig: { provider: 'saml', clientSecret: 'super-secret', entityId: 'https://x.com' }
    }
    const result = maskSensitiveFields('TENANT_CONFIG', snapshot)
    expect((result.ssoConfig as Record<string, unknown>).clientSecret).toBe('[REDACTED]')
    expect((result.ssoConfig as Record<string, unknown>).entityId).toBe('https://x.com')
    expect(result.plan).toBe('pro')
  })

  it('returns snapshot unchanged for non-sensitive entity types', () => {
    const snapshot = { title: 'My Project', status: 'active' }
    const result = maskSensitiveFields('PROJECT', snapshot)
    expect(result).toEqual(snapshot)
  })
})

describe('buildAuditParams', () => {
  it('returns correct shape for an UPDATE action', () => {
    const params = buildAuditParams({
      orgId: 'org_abc',
      actorId: 'user_xyz',
      entityType: 'PROJECT',
      entityId: '42',
      entityLabel: 'Alpha',
      action: 'UPDATE',
      before: { status: 'active' },
      after: { status: 'archived' },
    })
    expect(params.entityType).toBe('PROJECT')
    expect(params.before).toEqual({ status: 'active' })
    expect(params.after).toEqual({ status: 'archived' })
  })
})
