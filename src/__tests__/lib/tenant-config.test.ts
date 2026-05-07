import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { tenantConfig: { findUnique: vi.fn() } },
}))

import { mergeWithDefaults, isFeatureEnabled } from '@/lib/tenant-config'

const defaultFlags = { flowBuilder: true, approvals: true, analytics: false, customBranding: false }

describe('mergeWithDefaults', () => {
  it('fills missing flags with defaults', () => {
    const result = mergeWithDefaults({ flowBuilder: false })
    expect(result).toEqual({ ...defaultFlags, flowBuilder: false })
  })

  it('returns all defaults when given empty object', () => {
    expect(mergeWithDefaults({})).toEqual(defaultFlags)
  })
})

describe('isFeatureEnabled', () => {
  it('returns true when flag is enabled', () => {
    const config = { featureFlags: { ...defaultFlags, analytics: true } }
    expect(isFeatureEnabled(config as any, 'analytics')).toBe(true)
  })

  it('returns false when flag is disabled', () => {
    const config = { featureFlags: defaultFlags }
    expect(isFeatureEnabled(config as any, 'customBranding')).toBe(false)
  })

  it('returns false when config is null', () => {
    expect(isFeatureEnabled(null, 'flowBuilder')).toBe(false)
  })
})
