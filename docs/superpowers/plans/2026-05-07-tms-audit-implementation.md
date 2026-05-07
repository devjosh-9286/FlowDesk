# FlowDesk TMS & Audit Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-tier Tenant Management System (Master TMS for SUPERADMINs, Client TMS for org ADMINs) and a field-level Audit Dashboard with before/after diffs and 90-day retention.

**Architecture:** New `/master/*` route tree with its own middleware and layout. New `/[org-slug]/tms/*` route tree extending the existing org middleware. Single `AuditLog` table stores all entity changes as JSONB snapshots; diffs computed client-side in a modal. `TenantConfig` table (one row per org) stores plan, seatLimit, featureFlags, ssoConfig, branding. `User.systemRole` column gates `/master/*` access.

**Tech Stack:** Next.js 15 App Router, Prisma + Neon PostgreSQL, NextAuth.js, shadcn/ui + Tailwind CSS, Vitest + React Testing Library

---

## File Map

```
prisma/
  schema.prisma                          # MODIFY: add User.systemRole, TenantConfig, AuditLog

src/
  lib/
    audit.ts                             # CREATE: createAuditEntry(), maskSensitiveFields()
    tenant-config.ts                     # CREATE: getTenantConfig(), feature flag helpers
    master-context.ts                    # CREATE: requireSuperadmin() helper

  middleware.ts                          # MODIFY: add /master/* SUPERADMIN gate

  app/
    master/
      layout.tsx                         # CREATE: MasterShell (sidebar + auth gate)
      page.tsx                           # CREATE: platform dashboard
      tenants/
        page.tsx                         # CREATE: all orgs table
        [org-slug]/
          page.tsx                       # CREATE: org detail (redirects to /config)
          config/page.tsx                # CREATE: plan/flags/SSO/branding editor
          users/page.tsx                 # CREATE: org member list
          audit/page.tsx                 # CREATE: org-scoped audit log
      admins/
        page.tsx                         # CREATE: SUPERADMIN management
      audit/
        page.tsx                         # CREATE: cross-tenant audit log

    [org-slug]/
      tms/
        layout.tsx                       # CREATE: TmsShell (sidebar + ADMIN gate)
        page.tsx                         # CREATE: org admin dashboard
        users/page.tsx                   # CREATE: user provisioning
        roles/page.tsx                   # CREATE: role assignment
        sso/page.tsx                     # CREATE: SSO config (read-only)
        branding/page.tsx                # CREATE: branding editor
        audit/page.tsx                   # CREATE: org-scoped audit log
        billing/page.tsx                 # CREATE: plan/seat info (read-only)

    api/
      master/
        tenants/route.ts                 # CREATE: GET all orgs, POST new org
        tenants/[org-slug]/route.ts      # CREATE: GET/PATCH org config
        tenants/[org-slug]/users/route.ts # CREATE: GET org members
        admins/route.ts                  # CREATE: GET admins, POST assign, DELETE revoke
        audit/route.ts                   # CREATE: GET cross-tenant audit log
      tms/
        [org-slug]/users/route.ts        # CREATE: GET/POST/DELETE members
        [org-slug]/roles/route.ts        # CREATE: PATCH role
        [org-slug]/branding/route.ts     # CREATE: PATCH branding
        [org-slug]/audit/route.ts        # CREATE: GET org-scoped audit log
      cron/
        audit-purge/route.ts             # CREATE: daily 90-day TTL purge

  components/
    master/
      MasterSidebar.tsx                  # CREATE
    tms/
      TmsSidebar.tsx                     # CREATE
      SeatUsageBar.tsx                   # CREATE
    audit/
      AuditTable.tsx                     # CREATE: shared table (master + tms)
      AuditDetailModal.tsx               # CREATE: before/after diff modal
      AuditFilters.tsx                   # CREATE: filter bar

  __tests__/
    lib/
      audit.test.ts                      # CREATE
      tenant-config.test.ts              # CREATE
    api/
      master-tenants.test.ts             # CREATE
      master-admins.test.ts              # CREATE
      master-audit.test.ts               # CREATE
      tms-users.test.ts                  # CREATE
      tms-audit.test.ts                  # CREATE
    components/
      AuditTable.test.tsx                # CREATE
      AuditDetailModal.test.tsx          # CREATE
```

---

## Phase 1: Data Layer

### Task 1: Prisma Schema — systemRole, TenantConfig, AuditLog

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `systemRole` to User model**

In `prisma/schema.prisma`, add to the `User` model:

```prisma
model User {
  // ... existing fields ...
  systemRole    String?   @default(null)  // "SUPERADMIN" | null
  tenantConfigs TenantConfig[]
  auditLogs     AuditLog[] @relation("ActorAuditLogs")
}
```

- [ ] **Step 2: Add TenantConfig model**

```prisma
model TenantConfig {
  id           Int      @id @default(autoincrement())
  orgId        Int      @unique
  org          Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  plan         String   @default("free")   // "free" | "pro" | "enterprise"
  seatLimit    Int      @default(5)
  featureFlags Json     @default("{\"flowBuilder\":true,\"approvals\":true,\"analytics\":false,\"customBranding\":false}")
  ssoConfig    Json     @default("{\"provider\":null}")
  branding     Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Also add to `Organization` model:
```prisma
tenantConfig  TenantConfig?
```

- [ ] **Step 3: Add AuditLog model**

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  orgId       Int?
  org         Organization? @relation(fields: [orgId], references: [id], onDelete: SetNull)
  actorId     Int
  actor       User     @relation("ActorAuditLogs", fields: [actorId], references: [id], onDelete: Cascade)
  entityType  String   // PROJECT | TASK | TEMPLATE | USER | ORG_MEMBERSHIP | DEPARTMENT | TENANT_CONFIG | APPROVAL | SUPERADMIN
  entityId    String
  entityLabel String
  action      String   // CREATE | UPDATE | DELETE | ROLE_CHANGED | STAGE_ADVANCED | APPROVAL_GRANTED | APPROVAL_REJECTED | PLAN_CHANGED | FEATURE_FLAG_CHANGED | SSO_CONFIG_CHANGED | BRANDING_CHANGED | SUPERADMIN_ASSIGNED | SUPERADMIN_REVOKED
  before      Json?
  after       Json?
  ipAddress   String?
  createdAt   DateTime @default(now())

  @@index([orgId, createdAt(sort: Desc)])
  @@index([createdAt])
}
```

Also add to `Organization` model:
```prisma
auditLogs     AuditLog[]
```

- [ ] **Step 4: Generate and run migration**

```bash
npx prisma migrate dev --name add-tms-and-audit
npx prisma generate
```

Expected: migration file created in `prisma/migrations/`, no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat(db): add systemRole, TenantConfig, AuditLog to schema"
```

---

### Task 2: Audit Library

**Files:**
- Create: `src/lib/audit.ts`
- Create: `src/__tests__/lib/audit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { maskSensitiveFields, buildAuditParams } from '@/lib/audit'

describe('maskSensitiveFields', () => {
  it('redacts clientSecret from ssoConfig snapshot', () => {
    const snapshot = {
      plan: 'pro',
      ssoConfig: { provider: 'saml', clientSecret: 'super-secret', entityId: 'https://x.com' }
    }
    const result = maskSensitiveFields('TENANT_CONFIG', snapshot)
    expect(result.ssoConfig.clientSecret).toBe('[REDACTED]')
    expect(result.ssoConfig.entityId).toBe('https://x.com')
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
      orgId: 1,
      actorId: 2,
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
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/__tests__/lib/audit.test.ts
```

Expected: FAIL — `maskSensitiveFields` not found.

- [ ] **Step 3: Implement `src/lib/audit.ts`**

```typescript
import { db } from '@/lib/db'

type AuditParams = {
  orgId: number | null
  actorId: number
  entityType: string
  entityId: string
  entityLabel: string
  action: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ipAddress?: string
}

/** Strip secrets before writing to audit log. */
export function maskSensitiveFields(
  entityType: string,
  snapshot: Record<string, unknown>
): Record<string, unknown> {
  if (entityType !== 'TENANT_CONFIG') return snapshot
  const copy = structuredClone(snapshot)
  if (copy.ssoConfig && typeof copy.ssoConfig === 'object') {
    const sso = copy.ssoConfig as Record<string, unknown>
    if ('clientSecret' in sso) sso.clientSecret = '[REDACTED]'
  }
  return copy
}

export function buildAuditParams(params: AuditParams): AuditParams {
  const { entityType, before, after } = params
  return {
    ...params,
    before: before ? maskSensitiveFields(entityType, before) : null,
    after: after ? maskSensitiveFields(entityType, after) : null,
  }
}

/**
 * Write one audit log entry. Fire-and-forget — never throws.
 * Call AFTER the main DB write succeeds.
 */
export async function createAuditEntry(params: AuditParams): Promise<void> {
  try {
    const safe = buildAuditParams(params)
    await db.auditLog.create({ data: safe })
  } catch {
    // Intentional: audit failure must never break the caller's operation.
  }
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx vitest run src/__tests__/lib/audit.test.ts
```

Expected: PASS (2 test suites, all green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit.ts src/__tests__/lib/audit.test.ts
git commit -m "feat(audit): add createAuditEntry, maskSensitiveFields"
```

---

### Task 3: TenantConfig Helper + Feature Flags

**Files:**
- Create: `src/lib/tenant-config.ts`
- Create: `src/__tests__/lib/tenant-config.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/tenant-config.test.ts
import { describe, it, expect, vi } from 'vitest'
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
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/__tests__/lib/tenant-config.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/tenant-config.ts`**

```typescript
import { cache } from 'react'
import { db } from '@/lib/db'

export type FeatureFlags = {
  flowBuilder: boolean
  approvals: boolean
  analytics: boolean
  customBranding: boolean
}

const FLAG_DEFAULTS: FeatureFlags = {
  flowBuilder: true,
  approvals: true,
  analytics: false,
  customBranding: false,
}

export function mergeWithDefaults(partial: Partial<FeatureFlags>): FeatureFlags {
  return { ...FLAG_DEFAULTS, ...partial }
}

export type TenantConfigRow = {
  id: number
  orgId: number
  plan: string
  seatLimit: number
  featureFlags: FeatureFlags
  ssoConfig: Record<string, unknown>
  branding: Record<string, unknown>
}

/** Cached per-request fetch of TenantConfig. Falls back to safe defaults. */
export const getTenantConfig = cache(async (orgId: number): Promise<TenantConfigRow> => {
  const row = await db.tenantConfig.findUnique({ where: { orgId } })
  if (!row) {
    return {
      id: 0,
      orgId,
      plan: 'free',
      seatLimit: 5,
      featureFlags: FLAG_DEFAULTS,
      ssoConfig: { provider: null },
      branding: {},
    }
  }
  return {
    ...row,
    featureFlags: mergeWithDefaults(row.featureFlags as Partial<FeatureFlags>),
    ssoConfig: row.ssoConfig as Record<string, unknown>,
    branding: row.branding as Record<string, unknown>,
  }
})

export function isFeatureEnabled(
  config: TenantConfigRow | null,
  flag: keyof FeatureFlags
): boolean {
  if (!config) return false
  return config.featureFlags[flag] === true
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx vitest run src/__tests__/lib/tenant-config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant-config.ts src/__tests__/lib/tenant-config.test.ts
git commit -m "feat(tms): add getTenantConfig, isFeatureEnabled helpers"
```

---

### Task 4: Audit Purge Cron

**Files:**
- Create: `src/app/api/cron/audit-purge/route.ts`

- [ ] **Step 1: Create purge route**

```typescript
// src/app/api/cron/audit-purge/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = subDays(new Date(), 90)
  const { count } = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  return NextResponse.json({ deleted: count, cutoff: cutoff.toISOString() })
}
```

- [ ] **Step 2: Add `date-fns` if not already installed**

```bash
npm install date-fns
```

- [ ] **Step 3: Add `CRON_SECRET` to `.env.local`**

```
CRON_SECRET=replace-with-a-random-32-char-string
```

- [ ] **Step 4: If deploying to Vercel, add to `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/audit-purge",
      "schedule": "0 3 * * *"
    }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat(audit): add 90-day retention purge cron"
```

---

## Phase 2: Master TMS Middleware + Layout

### Task 5: Middleware — SUPERADMIN gate for `/master/*`

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/lib/master-context.ts`

- [ ] **Step 1: Create `src/lib/master-context.ts`**

```typescript
// src/lib/master-context.ts
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function getSuperadminSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await db.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { id: true, name: true, email: true, systemRole: true },
  })
  if (user?.systemRole !== 'SUPERADMIN') return null
  return user
}
```

- [ ] **Step 2: Modify `src/middleware.ts` — add `/master/*` guard**

In the existing `middleware.ts`, add before the org-slug check:

```typescript
// Guard: /master/* requires SUPERADMIN
if (req.nextUrl.pathname.startsWith('/master')) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  // Full systemRole check happens in the layout; middleware only validates session exists
  // to avoid a DB call on every request. Layout does the role check.
  return NextResponse.next()
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/lib/master-context.ts
git commit -m "feat(master): add SUPERADMIN middleware guard for /master/*"
```

---

### Task 6: MasterShell Layout

**Files:**
- Create: `src/app/master/layout.tsx`
- Create: `src/components/master/MasterSidebar.tsx`

- [ ] **Step 1: Create `MasterSidebar.tsx`**

```tsx
// src/components/master/MasterSidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { section: 'Overview', items: [{ label: '📊 Dashboard', href: '/master' }] },
  {
    section: 'Tenants',
    items: [
      { label: '🏢 All Tenants', href: '/master/tenants' },
      { label: '➕ New Tenant', href: '/master/tenants/new' },
    ],
  },
  {
    section: 'Platform',
    items: [
      { label: '🛡 Admins', href: '/master/admins' },
      { label: '📋 Audit Log', href: '/master/audit' },
    ],
  },
]

export function MasterSidebar({ actorEmail }: { actorEmail: string }) {
  const pathname = usePathname()
  return (
    <aside className="w-52 flex-shrink-0 bg-slate-950 flex flex-col border-r border-slate-800">
      <div className="px-4 py-4 border-b border-slate-800">
        <p className="text-indigo-400 font-bold text-sm">⬡ FlowDesk</p>
        <p className="text-slate-500 text-xs">Platform Admin</p>
      </div>
      <nav className="flex-1 py-2">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="px-4 pt-3 pb-1 text-slate-600 text-[10px] uppercase tracking-widest">{section}</p>
            {items.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-100',
                  pathname === href && 'bg-slate-800 text-slate-100 border-l-2 border-indigo-400'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
        {actorEmail}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `src/app/master/layout.tsx`**

```tsx
// src/app/master/layout.tsx
import { redirect } from 'next/navigation'
import { getSuperadminSession } from '@/lib/master-context'
import { MasterSidebar } from '@/components/master/MasterSidebar'

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <MasterSidebar actorEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/master/layout.tsx src/components/master/
git commit -m "feat(master): add MasterShell layout + sidebar"
```

---

## Phase 3: Master TMS API Routes

### Task 7: Master Tenants API

**Files:**
- Create: `src/app/api/master/tenants/route.ts`
- Create: `src/app/api/master/tenants/[org-slug]/route.ts`
- Create: `src/__tests__/api/master-tenants.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/api/master-tenants.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { organization: { findMany: vi.fn(), findUnique: vi.fn() }, tenantConfig: { upsert: vi.fn() } } }))
vi.mock('@/lib/master-context', () => ({ getSuperadminSession: vi.fn() }))
vi.mock('@/lib/audit', () => ({ createAuditEntry: vi.fn() }))

import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { GET } from '@/app/api/master/tenants/route'

describe('GET /api/master/tenants', () => {
  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/tenants')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns org list when SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({ id: 1, name: 'Josh', email: 'j@x.com', systemRole: 'SUPERADMIN' })
    vi.mocked(db.organization.findMany).mockResolvedValue([{ id: 1, name: 'Acme', slug: 'acme' }] as any)
    const req = new Request('http://localhost/api/master/tenants')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.orgs).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/__tests__/api/master-tenants.test.ts
```

Expected: FAIL — route not found.

- [ ] **Step 3: Create `src/app/api/master/tenants/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'

export async function GET(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tenantConfig: true, _count: { select: { members: true } } },
  })
  return NextResponse.json({ orgs })
}
```

- [ ] **Step 4: Create `src/app/api/master/tenants/[org-slug]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { createAuditEntry } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await db.organization.findUnique({
    where: { slug: params['org-slug'] },
    include: { tenantConfig: true },
  })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ org })
}

export async function PATCH(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await db.organization.findUnique({
    where: { slug: params['org-slug'] },
    include: { tenantConfig: true },
  })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { plan, seatLimit, featureFlags, ssoConfig, branding } = body

  const before = org.tenantConfig
  const updated = await db.tenantConfig.upsert({
    where: { orgId: org.id },
    create: { orgId: org.id, plan, seatLimit, featureFlags, ssoConfig, branding },
    update: { plan, seatLimit, featureFlags, ssoConfig, branding },
  })

  // Audit each changed section separately
  if (plan !== before?.plan || seatLimit !== before?.seatLimit) {
    await createAuditEntry({
      orgId: org.id, actorId: user.id, entityType: 'TENANT_CONFIG',
      entityId: String(org.id), entityLabel: org.name, action: 'PLAN_CHANGED',
      before: before ? { plan: before.plan, seatLimit: before.seatLimit } : null,
      after: { plan: updated.plan, seatLimit: updated.seatLimit },
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })
  }
  if (JSON.stringify(featureFlags) !== JSON.stringify(before?.featureFlags)) {
    await createAuditEntry({
      orgId: org.id, actorId: user.id, entityType: 'TENANT_CONFIG',
      entityId: String(org.id), entityLabel: org.name, action: 'FEATURE_FLAG_CHANGED',
      before: before ? { featureFlags: before.featureFlags } : null,
      after: { featureFlags: updated.featureFlags },
    })
  }
  if (JSON.stringify(ssoConfig) !== JSON.stringify(before?.ssoConfig)) {
    await createAuditEntry({
      orgId: org.id, actorId: user.id, entityType: 'TENANT_CONFIG',
      entityId: String(org.id), entityLabel: org.name, action: 'SSO_CONFIG_CHANGED',
      before: before ? { ssoConfig: before.ssoConfig } : null,
      after: { ssoConfig: updated.ssoConfig },
    })
  }

  return NextResponse.json({ config: updated })
}
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
npx vitest run src/__tests__/api/master-tenants.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/master/tenants/ src/__tests__/api/master-tenants.test.ts
git commit -m "feat(master): add tenant list + config API routes"
```

---

### Task 8: Master Admins API + Audit Query API

**Files:**
- Create: `src/app/api/master/admins/route.ts`
- Create: `src/app/api/master/audit/route.ts`
- Create: `src/__tests__/api/master-admins.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/api/master-admins.test.ts
import { describe, it, expect, vi } from 'vitest'

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
import { GET, POST } from '@/app/api/master/admins/route'

describe('POST /api/master/admins — assign SUPERADMIN', () => {
  it('returns 401 when not SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/master/admins', { method: 'POST', body: JSON.stringify({ userId: 5 }) })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('sets systemRole to SUPERADMIN', async () => {
    vi.mocked(getSuperadminSession).mockResolvedValue({ id: 1, name: 'Josh', email: 'j@x.com', systemRole: 'SUPERADMIN' })
    vi.mocked(db.user.update).mockResolvedValue({ id: 5, systemRole: 'SUPERADMIN' } as any)
    const req = new Request('http://localhost/api/master/admins', {
      method: 'POST',
      body: JSON.stringify({ userId: 5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { systemRole: 'SUPERADMIN' } })
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/__tests__/api/master-admins.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/app/api/master/admins/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'
import { createAuditEntry } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admins = await db.user.findMany({
    where: { systemRole: 'SUPERADMIN' },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  return NextResponse.json({ admins })
}

export async function POST(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  const updated = await db.user.update({
    where: { id: userId },
    data: { systemRole: 'SUPERADMIN' },
  })
  await createAuditEntry({
    orgId: null, actorId: user.id, entityType: 'SUPERADMIN',
    entityId: String(userId), entityLabel: updated.email ?? String(userId),
    action: 'SUPERADMIN_ASSIGNED',
    before: { systemRole: null }, after: { systemRole: 'SUPERADMIN' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  if (userId === user.id) return NextResponse.json({ error: 'Cannot revoke yourself' }, { status: 400 })

  const updated = await db.user.update({
    where: { id: userId },
    data: { systemRole: null },
  })
  await createAuditEntry({
    orgId: null, actorId: user.id, entityType: 'SUPERADMIN',
    entityId: String(userId), entityLabel: updated.email ?? String(userId),
    action: 'SUPERADMIN_REVOKED',
    before: { systemRole: 'SUPERADMIN' }, after: { systemRole: null },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create `src/app/api/master/audit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSuperadminSession } from '@/lib/master-context'

export async function GET(req: NextRequest) {
  const user = await getSuperadminSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const orgSlug = searchParams.get('orgSlug') ?? undefined
  const entityType = searchParams.get('entityType') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const actor = searchParams.get('actor') ?? undefined
  const days = Number(searchParams.get('days') ?? 7)
  const page = Number(searchParams.get('page') ?? 1)
  const limit = 50

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  let orgId: number | undefined
  if (orgSlug) {
    const org = await db.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } })
    orgId = org?.id
  }

  const where = {
    createdAt: { gte: since },
    ...(orgId !== undefined ? { orgId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(actor
      ? { actor: { OR: [{ name: { contains: actor, mode: 'insensitive' as const } }, { email: { contains: actor, mode: 'insensitive' as const } }] } }
      : {}),
  }

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } }, org: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, limit })
}
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
npx vitest run src/__tests__/api/master-admins.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/master/admins/ src/app/api/master/audit/ src/__tests__/api/master-admins.test.ts
git commit -m "feat(master): add admins CRUD + cross-tenant audit query API"
```

---

## Phase 4: Master TMS Pages

### Task 9: Master Dashboard + Tenants List

**Files:**
- Create: `src/app/master/page.tsx`
- Create: `src/app/master/tenants/page.tsx`

- [ ] **Step 1: Create `src/app/master/page.tsx`**

```tsx
import { getSuperadminSession } from '@/lib/master-context'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function MasterDashboard() {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  const [totalOrgs, totalUsers, proOrgs, enterpriseOrgs] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.tenantConfig.count({ where: { plan: 'pro' } }),
    db.tenantConfig.count({ where: { plan: 'enterprise' } }),
  ])

  const recentOrgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { tenantConfig: true, _count: { select: { members: true } } },
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Platform Overview</h1>
      <p className="text-slate-500 text-sm mb-6">All tenants</p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Tenants', value: totalOrgs },
          { label: 'Total Users', value: totalUsers },
          { label: 'Pro Tenants', value: proOrgs },
          { label: 'Enterprise', value: enterpriseOrgs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-100">{value}</div>
            <div className="text-slate-500 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Recent Tenants</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Org</th>
            <th className="text-left py-2 px-3">Plan</th>
            <th className="text-left py-2 px-3">Seats</th>
            <th className="text-left py-2 px-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {recentOrgs.map((org) => (
            <tr key={org.id} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{org.name}</td>
              <td className="py-2 px-3">{org.tenantConfig?.plan ?? 'free'}</td>
              <td className="py-2 px-3">{org._count.members} / {org.tenantConfig?.seatLimit ?? 5}</td>
              <td className="py-2 px-3">
                <a href={`/master/tenants/${org.slug}/config`} className="text-indigo-400 hover:underline text-xs">Manage →</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/master/tenants/page.tsx`**

```tsx
import { getSuperadminSession } from '@/lib/master-context'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TenantsPage() {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tenantConfig: true, _count: { select: { members: true } } },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">All Tenants</h1>
          <p className="text-slate-500 text-sm">{orgs.length} orgs</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Org</th>
            <th className="text-left py-2 px-3">Plan</th>
            <th className="text-left py-2 px-3">Seats</th>
            <th className="text-left py-2 px-3">Created</th>
            <th className="text-left py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => {
            const seats = org._count.members
            const limit = org.tenantConfig?.seatLimit ?? 5
            return (
              <tr key={org.id} className="border-b border-slate-900 text-slate-400">
                <td className="py-2 px-3 text-slate-100 font-medium">{org.name}</td>
                <td className="py-2 px-3">{org.tenantConfig?.plan ?? 'free'}</td>
                <td className={`py-2 px-3 ${seats / limit >= 0.9 ? 'text-amber-400' : ''}`}>
                  {seats} / {limit}
                </td>
                <td className="py-2 px-3 text-xs">{new Date(org.createdAt).toLocaleDateString()}</td>
                <td className="py-2 px-3">
                  <Link href={`/master/tenants/${org.slug}/config`} className="text-indigo-400 hover:underline text-xs">
                    Manage →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/master/page.tsx src/app/master/tenants/
git commit -m "feat(master): add platform dashboard + tenants list pages"
```

---

### Task 10: Tenant Config Page

**Files:**
- Create: `src/app/master/tenants/[org-slug]/config/page.tsx`

- [ ] **Step 1: Create config page**

```tsx
// src/app/master/tenants/[org-slug]/config/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Config = {
  plan: string
  seatLimit: number
  featureFlags: Record<string, boolean>
  ssoConfig: Record<string, unknown>
  branding: Record<string, unknown>
}

const FLAG_LABELS: Record<string, string> = {
  flowBuilder: 'Flow Builder',
  approvals: 'Approval Gates',
  analytics: 'Analytics',
  customBranding: 'Custom Branding',
}

export default function TenantConfigPage() {
  const { 'org-slug': orgSlug } = useParams<{ 'org-slug': string }>()
  const [config, setConfig] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/master/tenants/${orgSlug}`)
      .then((r) => r.json())
      .then((d) => setConfig(d.org.tenantConfig ?? {
        plan: 'free', seatLimit: 5,
        featureFlags: { flowBuilder: true, approvals: true, analytics: false, customBranding: false },
        ssoConfig: { provider: null }, branding: {},
      }))
  }, [orgSlug])

  async function save() {
    setSaving(true)
    await fetch(`/api/master/tenants/${orgSlug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!config) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Tenant Config</h1>
      <p className="text-slate-500 text-sm mb-6">{orgSlug}</p>

      {/* Plan & Seats */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">Plan & Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 text-xs uppercase mb-1">Plan</label>
            <select
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
              value={config.plan}
              onChange={(e) => setConfig({ ...config, plan: e.target.value })}
            >
              {['free', 'pro', 'enterprise'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 text-xs uppercase mb-1">Seat Limit</label>
            <input
              type="number"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
              value={config.seatLimit}
              onChange={(e) => setConfig({ ...config, seatLimit: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      {/* Feature Flags */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">Feature Flags</h2>
        {Object.entries(FLAG_LABELS).map(([key, label]) => (
          <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
            <span className="text-slate-300 text-sm">{label}</span>
            <button
              onClick={() => setConfig({ ...config, featureFlags: { ...config.featureFlags, [key]: !config.featureFlags[key] } })}
              className={`w-10 h-5 rounded-full transition-colors ${config.featureFlags[key] ? 'bg-emerald-500' : 'bg-slate-700'}`}
            />
          </div>
        ))}
      </section>

      {/* SSO */}
      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">SSO Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          {(['provider', 'entityId', 'ssoUrl', 'certificate'] as const).map((field) => (
            <div key={field}>
              <label className="block text-slate-500 text-xs uppercase mb-1">{field}</label>
              <input
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
                value={String((config.ssoConfig as Record<string, unknown>)[field] ?? '')}
                onChange={(e) => setConfig({ ...config, ssoConfig: { ...config.ssoConfig, [field]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button onClick={() => window.history.back()} className="px-4 py-2 text-slate-400 border border-slate-700 rounded text-sm">Discard</button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-indigo-500 text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create redirect at `[org-slug]/page.tsx`**

```tsx
// src/app/master/tenants/[org-slug]/page.tsx
import { redirect } from 'next/navigation'
export default function TenantRoot({ params }: { params: { 'org-slug': string } }) {
  redirect(`/master/tenants/${params['org-slug']}/config`)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/master/tenants/
git commit -m "feat(master): add tenant config page with plan/flags/SSO editor"
```

---

### Task 11: Master Admins + Master Audit Pages

**Files:**
- Create: `src/app/master/admins/page.tsx`
- Create: `src/app/master/audit/page.tsx`

- [ ] **Step 1: Create `src/app/master/admins/page.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'

type Admin = { id: number; name: string; email: string; createdAt: string }

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])

  useEffect(() => {
    fetch('/api/master/admins').then((r) => r.json()).then((d) => setAdmins(d.admins))
  }, [])

  async function revoke(userId: number) {
    await fetch('/api/master/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setAdmins((prev) => prev.filter((a) => a.id !== userId))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Platform Admins</h1>
      <p className="text-slate-500 text-sm mb-6">Users with SUPERADMIN role</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Email</th>
            <th className="text-left py-2 px-3">Since</th>
            <th className="text-left py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => (
            <tr key={a.id} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{a.name}</td>
              <td className="py-2 px-3">{a.email}</td>
              <td className="py-2 px-3 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
              <td className="py-2 px-3">
                <button onClick={() => revoke(a.id)} className="text-red-400 hover:underline text-xs">Revoke</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/master/audit/page.tsx`**

```tsx
import { AuditTable } from '@/components/audit/AuditTable'

export default function MasterAuditPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Audit Log</h1>
      <p className="text-slate-500 text-sm mb-6">All tenants · 90-day retention</p>
      <AuditTable apiUrl="/api/master/audit" showTenantFilter />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/master/admins/ src/app/master/audit/
git commit -m "feat(master): add admins management + cross-tenant audit pages"
```

---

## Phase 5: Audit Components

### Task 12: AuditTable + AuditFilters + AuditDetailModal

**Files:**
- Create: `src/components/audit/AuditTable.tsx`
- Create: `src/components/audit/AuditFilters.tsx`
- Create: `src/components/audit/AuditDetailModal.tsx`
- Create: `src/__tests__/components/AuditDetailModal.test.tsx`

- [ ] **Step 1: Write failing test for modal**

```tsx
// src/__tests__/components/AuditDetailModal.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuditDetailModal } from '@/components/audit/AuditDetailModal'

const entry = {
  id: 'abc-123',
  entityLabel: 'Alpha Launch',
  entityType: 'PROJECT',
  action: 'UPDATE',
  createdAt: '2026-05-07T14:32:00Z',
  ipAddress: '1.2.3.4',
  actor: { name: 'Josh P.', email: 'josh@x.com' },
  org: { name: 'Acme', slug: 'acme' },
  before: { status: 'active', dueDate: '2026-05-15' },
  after: { status: 'archived', dueDate: '2026-06-01' },
}

describe('AuditDetailModal', () => {
  it('renders changed fields with before/after values', () => {
    render(<AuditDetailModal entry={entry} onClose={() => {}} />)
    expect(screen.getByText('status')).toBeInTheDocument()
    expect(screen.getByText('"active"')).toBeInTheDocument()
    expect(screen.getByText('"archived"')).toBeInTheDocument()
  })

  it('calls onClose when ✕ is clicked', async () => {
    const onClose = vi.fn()
    render(<AuditDetailModal entry={entry} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run src/__tests__/components/AuditDetailModal.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create `src/components/audit/AuditDetailModal.tsx`**

```tsx
'use client'

type AuditEntry = {
  id: string
  entityLabel: string
  entityType: string
  action: string
  createdAt: string
  ipAddress?: string | null
  actor: { name: string; email: string }
  org?: { name: string; slug: string } | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

export function AuditDetailModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const allKeys = Array.from(
    new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])
  )

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl w-[520px] max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-slate-800">
          <div>
            <p className="text-slate-100 font-bold">{entry.entityType}: {entry.entityLabel}</p>
            <p className="text-slate-500 text-xs mt-1">
              {new Date(entry.createdAt).toLocaleString()} · {entry.org?.name ?? 'Platform'} · {entry.actor.name}
              {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 bg-slate-800 rounded px-2 py-1 text-sm hover:text-slate-100">✕</button>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-4">
          {allKeys.map((key) => {
            const bVal = entry.before?.[key]
            const aVal = entry.after?.[key]
            const changed = JSON.stringify(bVal) !== JSON.stringify(aVal)
            return (
              <div key={key}>
                <p className={`font-mono text-xs uppercase tracking-wider mb-2 ${changed ? 'text-slate-400' : 'text-slate-600'}`}>
                  {key}
                  {!changed && <span className="ml-2 text-slate-700 normal-case">unchanged</span>}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {entry.before !== null && (
                    <div>
                      <p className="text-slate-600 text-xs mb-1">Before</p>
                      <div className={`rounded-md p-3 font-mono text-xs break-all ${changed ? 'bg-red-950 border border-red-900 text-red-300' : 'bg-slate-950 border border-slate-800 text-slate-600'}`}>
                        {bVal !== undefined ? JSON.stringify(bVal) : '—'}
                      </div>
                    </div>
                  )}
                  {entry.after !== null && (
                    <div>
                      <p className="text-slate-600 text-xs mb-1">After</p>
                      <div className={`rounded-md p-3 font-mono text-xs break-all ${changed ? 'bg-emerald-950 border border-emerald-900 text-emerald-300' : 'bg-slate-950 border border-slate-800 text-slate-600'}`}>
                        {aVal !== undefined ? JSON.stringify(aVal) : '—'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 border-t border-slate-800">
          <span className="text-slate-600 text-xs font-mono">{entry.id}</span>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify({ before: entry.before, after: entry.after }, null, 2))}
            className="text-slate-500 bg-slate-800 rounded px-3 py-1.5 text-xs hover:text-slate-100"
          >
            ⎘ Copy JSON
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/audit/AuditFilters.tsx`**

```tsx
'use client'

type Filters = {
  orgSlug?: string
  entityType?: string
  action?: string
  actor?: string
  days: number
}

const ENTITY_TYPES = ['PROJECT', 'TASK', 'TEMPLATE', 'USER', 'ORG_MEMBERSHIP', 'DEPARTMENT', 'TENANT_CONFIG', 'APPROVAL', 'SUPERADMIN']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ROLE_CHANGED', 'STAGE_ADVANCED', 'APPROVAL_GRANTED', 'APPROVAL_REJECTED', 'PLAN_CHANGED', 'FEATURE_FLAG_CHANGED', 'SSO_CONFIG_CHANGED', 'SUPERADMIN_ASSIGNED', 'SUPERADMIN_REVOKED']
const DAY_OPTIONS = [{ label: 'Last 7 days', value: 7 }, { label: 'Last 30 days', value: 30 }, { label: 'Last 90 days', value: 90 }]

export function AuditFilters({
  filters,
  onChange,
  showTenantFilter,
  onExport,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  showTenantFilter?: boolean
  onExport: () => void
}) {
  const set = (key: keyof Filters, value: string | number | undefined) =>
    onChange({ ...filters, [key]: value || undefined })

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      {showTenantFilter && (
        <input
          placeholder="Filter by tenant slug…"
          className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-300 text-xs"
          value={filters.orgSlug ?? ''}
          onChange={(e) => set('orgSlug', e.target.value)}
        />
      )}
      <select
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs"
        value={filters.entityType ?? ''}
        onChange={(e) => set('entityType', e.target.value)}
      >
        <option value="">All Entities</option>
        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs"
        value={filters.action ?? ''}
        onChange={(e) => set('action', e.target.value)}
      >
        <option value="">All Actions</option>
        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <input
        placeholder="Search actor…"
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-300 text-xs flex-1 min-w-[140px]"
        value={filters.actor ?? ''}
        onChange={(e) => set('actor', e.target.value)}
      />
      <select
        className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-400 text-xs"
        value={filters.days}
        onChange={(e) => onChange({ ...filters, days: Number(e.target.value) })}
      >
        {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button onClick={onExport} className="ml-auto bg-slate-800 text-slate-400 rounded px-3 py-1.5 text-xs hover:text-slate-100">
        ↓ Export CSV
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/components/audit/AuditTable.tsx`**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { AuditFilters } from './AuditFilters'
import { AuditDetailModal } from './AuditDetailModal'

type AuditEntry = {
  id: string
  entityLabel: string
  entityType: string
  action: string
  createdAt: string
  ipAddress?: string | null
  actor: { name: string; email: string }
  org?: { name: string; slug: string } | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

const ENTITY_COLORS: Record<string, string> = {
  PROJECT: 'bg-blue-950 text-blue-300',
  TASK: 'bg-slate-800 text-slate-400',
  USER: 'bg-indigo-950 text-indigo-300',
  TENANT_CONFIG: 'bg-emerald-950 text-emerald-300',
  APPROVAL: 'bg-orange-950 text-orange-300',
  ORG_MEMBERSHIP: 'bg-purple-950 text-purple-300',
  SUPERADMIN: 'bg-red-950 text-red-300',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-950 text-emerald-300',
  UPDATE: 'bg-slate-800 text-slate-400',
  DELETE: 'bg-red-950 text-red-300',
  ROLE_CHANGED: 'bg-indigo-950 text-indigo-300',
  STAGE_ADVANCED: 'bg-blue-950 text-blue-300',
  APPROVAL_GRANTED: 'bg-emerald-950 text-emerald-300',
  APPROVAL_REJECTED: 'bg-red-950 text-red-300',
}

export function AuditTable({ apiUrl, showTenantFilter }: { apiUrl: string; showTenantFilter?: boolean }) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ days: 7 })
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    )
    const res = await fetch(`${apiUrl}?${params}`)
    const data = await res.json()
    setEntries(data.entries ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [apiUrl, filters])

  useEffect(() => { load() }, [load])

  function exportCsv() {
    const rows = [
      ['Timestamp', 'Tenant', 'Actor', 'Entity', 'Action', 'Event ID'],
      ...entries.map((e) => [e.createdAt, e.org?.slug ?? 'platform', e.actor.email, `${e.entityType}:${e.entityLabel}`, e.action, e.id]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `audit-export-${Date.now()}.csv`
    a.click()
  }

  return (
    <>
      <AuditFilters filters={filters} onChange={setFilters} showTenantFilter={showTenantFilter} onExport={exportCsv} />
      <p className="text-slate-600 text-xs mb-3">{total} events</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-600 text-[10px] uppercase border-b border-slate-800">
              <th className="text-left py-2 px-2">Timestamp</th>
              {showTenantFilter && <th className="text-left py-2 px-2">Tenant</th>}
              <th className="text-left py-2 px-2">Actor</th>
              <th className="text-left py-2 px-2">Entity</th>
              <th className="text-left py-2 px-2">Action</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-900 text-slate-400 hover:bg-slate-900/40">
                <td className="py-2 px-2 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                {showTenantFilter && (
                  <td className="py-2 px-2">
                    <span className="bg-slate-800 text-slate-500 rounded px-2 py-0.5 text-xs">
                      {entry.org?.slug ?? 'platform'}
                    </span>
                  </td>
                )}
                <td className="py-2 px-2 text-slate-100 text-xs">{entry.actor.name}</td>
                <td className="py-2 px-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold mr-1 ${ENTITY_COLORS[entry.entityType] ?? 'bg-slate-800 text-slate-400'}`}>
                    {entry.entityType}
                  </span>
                  <span className="text-slate-300 text-xs">{entry.entityLabel}</span>
                </td>
                <td className="py-2 px-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] ${ACTION_COLORS[entry.action] ?? 'bg-slate-800 text-slate-400'}`}>
                    {entry.action}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <button
                    onClick={() => setSelected(entry)}
                    className="text-xs text-slate-500 border border-slate-700 rounded px-2 py-1 hover:border-indigo-400 hover:text-indigo-400"
                  >
                    Details ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
```

- [ ] **Step 6: Run tests — verify PASS**

```bash
npx vitest run src/__tests__/components/AuditDetailModal.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/ src/__tests__/components/AuditDetailModal.test.tsx
git commit -m "feat(audit): add AuditTable, AuditFilters, AuditDetailModal components"
```

---

## Phase 6: Client TMS

### Task 13: Client TMS Layout + API Routes

**Files:**
- Create: `src/app/[org-slug]/tms/layout.tsx`
- Create: `src/components/tms/TmsSidebar.tsx`
- Create: `src/app/api/tms/[org-slug]/users/route.ts`
- Create: `src/app/api/tms/[org-slug]/audit/route.ts`
- Create: `src/__tests__/api/tms-users.test.ts`

- [ ] **Step 1: Create `TmsSidebar.tsx`**

```tsx
// src/components/tms/TmsSidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function TmsSidebar() {
  const pathname = usePathname()
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const base = `/${slug}/tms`

  const NAV = [
    { section: 'Overview', items: [{ label: '📊 Dashboard', href: base }] },
    { section: 'Access', items: [
      { label: '👥 Users', href: `${base}/users` },
      { label: '🎭 Roles', href: `${base}/roles` },
    ]},
    { section: 'Identity', items: [
      { label: '🔐 SSO', href: `${base}/sso` },
      { label: '🎨 Branding', href: `${base}/branding` },
    ]},
    { section: 'Reporting', items: [
      { label: '📋 Audit Log', href: `${base}/audit` },
      { label: '💳 Billing', href: `${base}/billing` },
    ]},
  ]

  return (
    <aside className="w-52 flex-shrink-0 bg-slate-950 flex flex-col border-r border-slate-800">
      <div className="px-4 py-4 border-b border-slate-800">
        <p className="text-slate-100 font-bold text-sm">Admin Portal</p>
        <p className="text-emerald-400 text-xs">{slug}</p>
      </div>
      <nav className="flex-1 py-2">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="px-4 pt-3 pb-1 text-slate-600 text-[10px] uppercase tracking-widest">{section}</p>
            {items.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-100',
                  pathname === href && 'bg-slate-800 text-slate-100 border-l-2 border-emerald-400'
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <Link href={`/${slug}`} className="px-4 py-3 border-t border-slate-800 text-slate-500 text-xs hover:text-slate-300">
        ← Back to Workspace
      </Link>
    </aside>
  )
}
```

- [ ] **Step 2: Create `src/app/[org-slug]/tms/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { TmsSidebar } from '@/components/tms/TmsSidebar'

export default async function TmsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { 'org-slug': string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership || membership.role !== 'ADMIN') redirect(`/${params['org-slug']}`)

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <TmsSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Write failing test for TMS users API**

```typescript
// src/__tests__/api/tms-users.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { orgMembership: { findMany: vi.fn(), delete: vi.fn() }, user: { findUnique: vi.fn() } },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/org-context', () => ({ getOrgMembership: vi.fn() }))
vi.mock('@/lib/audit', () => ({ createAuditEntry: vi.fn() }))

import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { db } from '@/lib/db'
import { GET } from '@/app/api/tms/[org-slug]/users/route'

describe('GET /api/tms/[org-slug]/users', () => {
  it('returns 401 when not logged in', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const req = new Request('http://localhost/api/tms/acme/users')
    const res = await GET(req as any, { params: { 'org-slug': 'acme' } })
    expect(res.status).toBe(401)
  })

  it('returns 403 when not ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '1' } } as any)
    vi.mocked(getOrgMembership).mockResolvedValue({ role: 'MEMBER', orgId: 1 } as any)
    const req = new Request('http://localhost/api/tms/acme/users')
    const res = await GET(req as any, { params: { 'org-slug': 'acme' } })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 4: Run — verify FAIL**

```bash
npx vitest run src/__tests__/api/tms-users.test.ts
```

Expected: FAIL.

- [ ] **Step 5: Create `src/app/api/tms/[org-slug]/users/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { createAuditEntry } from '@/lib/audit'

async function requireAdmin(userId: string, orgSlug: string) {
  const membership = await getOrgMembership(userId, orgSlug)
  if (!membership || membership.role !== 'ADMIN') return null
  return membership
}

export async function GET(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const membership = await requireAdmin(session.user.id, params['org-slug'])
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await db.orgMembership.findMany({
    where: { orgId: membership.orgId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } }, department: { select: { name: true } } },
    orderBy: { user: { name: 'asc' } },
  })
  return NextResponse.json({ members })
}

export async function DELETE(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const membership = await requireAdmin(session.user.id, params['org-slug'])
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json()
  const target = await db.orgMembership.findFirst({ where: { orgId: membership.orgId, userId }, include: { user: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.orgMembership.delete({ where: { orgId_userId: { orgId: membership.orgId, userId } } })
  await createAuditEntry({
    orgId: membership.orgId, actorId: Number(session.user.id), entityType: 'ORG_MEMBERSHIP',
    entityId: String(userId), entityLabel: target.user.email ?? String(userId),
    action: 'DELETE',
    before: { role: target.role, userId },
    after: null,
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Create `src/app/api/tms/[org-slug]/audit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'

export async function GET(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const entityType = searchParams.get('entityType') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const actor = searchParams.get('actor') ?? undefined
  const days = Number(searchParams.get('days') ?? 7)
  const page = Number(searchParams.get('page') ?? 1)
  const limit = 50
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const where = {
    orgId: membership.orgId,
    createdAt: { gte: since },
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(actor
      ? { actor: { OR: [{ name: { contains: actor, mode: 'insensitive' as const } }, { email: { contains: actor, mode: 'insensitive' as const } }] } }
      : {}),
  }

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } }, org: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, limit })
}
```

- [ ] **Step 7: Run tests — verify PASS**

```bash
npx vitest run src/__tests__/api/tms-users.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/[org-slug]/tms/layout.tsx src/components/tms/ src/app/api/tms/ src/__tests__/api/tms-users.test.ts
git commit -m "feat(tms): add client TMS layout, users API, audit API"
```

---

### Task 14: Client TMS Pages

**Files:**
- Create: `src/app/[org-slug]/tms/page.tsx`
- Create: `src/app/[org-slug]/tms/users/page.tsx`
- Create: `src/app/[org-slug]/tms/audit/page.tsx`
- Create: `src/app/[org-slug]/tms/sso/page.tsx`
- Create: `src/app/[org-slug]/tms/billing/page.tsx`
- Create: `src/components/tms/SeatUsageBar.tsx`

- [ ] **Step 1: Create `SeatUsageBar.tsx`**

```tsx
// src/components/tms/SeatUsageBar.tsx
export function SeatUsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  const warn = pct >= 90
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={warn ? 'text-amber-400' : 'text-slate-400'}>{used} / {limit} seats</span>
        {warn && <span className="text-amber-400">Near limit</span>}
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full">
        <div
          className={`h-1.5 rounded-full transition-all ${warn ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/[org-slug]/tms/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getOrgMembership } from '@/lib/org-context'
import { getTenantConfig } from '@/lib/tenant-config'
import { redirect } from 'next/navigation'
import { SeatUsageBar } from '@/components/tms/SeatUsageBar'

export default async function TmsDashboard({ params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership) redirect('/')
  const config = await getTenantConfig(membership.orgId)

  const [memberCount, projectCount, deptCount] = await Promise.all([
    db.orgMembership.count({ where: { orgId: membership.orgId } }),
    db.project.count({ where: { orgId: membership.orgId, status: 'active' } }),
    db.department.count({ where: { orgId: membership.orgId } }),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Admin Portal</h1>
      <p className="text-slate-500 text-sm mb-6">{config.plan} plan</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100 mb-1">{memberCount}</div>
          <div className="text-slate-500 text-xs mb-3">Members</div>
          <SeatUsageBar used={memberCount} limit={config.seatLimit} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100">{projectCount}</div>
          <div className="text-slate-500 text-xs">Active projects</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100">{deptCount}</div>
          <div className="text-slate-500 text-xs">Departments</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/[org-slug]/tms/users/page.tsx`**

```tsx
'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Member = {
  userId: number
  role: string
  user: { id: number; name: string; email: string }
  department?: { name: string } | null
}

export default function TmsUsersPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    fetch(`/api/tms/${slug}/users`).then((r) => r.json()).then((d) => setMembers(d.members ?? []))
  }, [slug])

  async function remove(userId: number) {
    await fetch(`/api/tms/${slug}/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Users</h1>
          <p className="text-slate-500 text-sm">{members.length} members</p>
        </div>
        <button className="bg-emerald-500 text-slate-950 rounded px-4 py-2 text-sm font-semibold">+ Invite User</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Role</th>
            <th className="text-left py-2 px-3">Department</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{m.user.name}</td>
              <td className="py-2 px-3">{m.role}</td>
              <td className="py-2 px-3">{m.department?.name ?? '—'}</td>
              <td className="py-2 px-3">
                <button onClick={() => remove(m.userId)} className="text-red-400 hover:underline text-xs">Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/[org-slug]/tms/audit/page.tsx`**

```tsx
'use client'
import { useParams } from 'next/navigation'
import { AuditTable } from '@/components/audit/AuditTable'

export default function TmsAuditPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Audit Log</h1>
      <p className="text-slate-500 text-sm mb-6">Your org only · 90-day retention</p>
      <AuditTable apiUrl={`/api/tms/${slug}/audit`} showTenantFilter={false} />
    </div>
  )
}
```

- [ ] **Step 5: Create `src/app/[org-slug]/tms/sso/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { getTenantConfig } from '@/lib/tenant-config'
import { redirect } from 'next/navigation'

export default async function TmsSsoPage({ params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership) redirect('/')
  const config = await getTenantConfig(membership.orgId)
  const sso = config.ssoConfig as Record<string, unknown>

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">SSO Configuration</h1>
      <p className="text-slate-500 text-sm mb-6">Managed by your FlowDesk account team. Contact support to change.</p>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        {['provider', 'entityId', 'ssoUrl'].map((field) => (
          <div key={field}>
            <p className="text-slate-500 text-xs uppercase mb-1">{field}</p>
            <p className="text-slate-300 font-mono text-sm">{String(sso[field] ?? '—')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/app/[org-slug]/tms/billing/page.tsx`**

```tsx
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { getTenantConfig } from '@/lib/tenant-config'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { SeatUsageBar } from '@/components/tms/SeatUsageBar'

export default async function TmsBillingPage({ params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership) redirect('/')
  const config = await getTenantConfig(membership.orgId)
  const memberCount = await db.orgMembership.count({ where: { orgId: membership.orgId } })

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Billing</h1>
      <p className="text-slate-500 text-sm mb-6">Read-only. Contact support to change plan.</p>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Current plan</span>
          <span className="text-emerald-400 font-semibold capitalize">{config.plan}</span>
        </div>
        <div>
          <div className="text-slate-400 text-sm mb-2">Seat usage</div>
          <SeatUsageBar used={memberCount} limit={config.seatLimit} />
          {memberCount / config.seatLimit >= 0.9 && (
            <p className="text-amber-400 text-xs mt-2">Near seat limit. Contact support to increase.</p>
          )}
        </div>
        <a
          href="mailto:support@flowdesk.io"
          className="block text-center bg-slate-800 text-slate-300 rounded px-4 py-2 text-sm hover:bg-slate-700"
        >
          Contact support →
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/[org-slug]/tms/ src/components/tms/
git commit -m "feat(tms): add client TMS dashboard, users, audit, SSO, billing pages"
```

---

## Phase 7: Wire Audit Into Existing Routes

### Task 15: Audit Existing Project + Task + Membership Routes

**Files:**
- Modify: `src/app/api/projects/[orgId]/route.ts`
- Modify: `src/app/api/projects/[orgId]/[projectId]/route.ts`
- Modify: `src/app/api/tasks/[orgId]/[projectId]/route.ts`
- Modify: `src/app/api/tasks/[orgId]/[projectId]/[taskId]/route.ts`
- Modify: `src/app/api/members/[orgId]/route.ts`
- Modify: `src/app/api/members/[orgId]/[userId]/route.ts`

For each file: add `createAuditEntry` call after every successful DB write. Pattern is identical across all routes — shown once here, apply to all.

- [ ] **Step 1: Add audit to project CREATE in `src/app/api/projects/[orgId]/route.ts`**

After `const project = await db.project.create(...)`, add:

```typescript
await createAuditEntry({
  orgId: Number(params.orgId),
  actorId: Number(session.user.id),
  entityType: 'PROJECT',
  entityId: String(project.id),
  entityLabel: project.name,
  action: 'CREATE',
  before: null,
  after: { name: project.name, status: project.status, deptId: project.deptId },
  ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
})
```

- [ ] **Step 2: Add audit to project UPDATE/DELETE in `src/app/api/projects/[orgId]/[projectId]/route.ts`**

For PATCH — fetch project before update, then after:
```typescript
const before = await db.project.findUnique({ where: { id: Number(params.projectId) } })
const project = await db.project.update(...)
await createAuditEntry({
  orgId: Number(params.orgId), actorId: Number(session.user.id),
  entityType: 'PROJECT', entityId: String(project.id), entityLabel: project.name,
  action: 'UPDATE',
  before: { name: before?.name, status: before?.status },
  after: { name: project.name, status: project.status },
})
```

For DELETE:
```typescript
await createAuditEntry({
  orgId: Number(params.orgId), actorId: Number(session.user.id),
  entityType: 'PROJECT', entityId: params.projectId, entityLabel: project.name,
  action: 'DELETE',
  before: { name: project.name, status: project.status }, after: null,
})
```

- [ ] **Step 3: Add audit to task CREATE/UPDATE/DELETE in task routes**

Same pattern as projects. `entityType: 'TASK'`. Snapshot: `{ title, status, assigneeId, dueDate }`.

- [ ] **Step 4: Add audit to membership CREATE/DELETE/ROLE_CHANGED in member routes**

```typescript
// CREATE (invite)
await createAuditEntry({
  orgId, actorId, entityType: 'ORG_MEMBERSHIP',
  entityId: String(userId), entityLabel: userEmail,
  action: 'CREATE',
  before: null, after: { role, orgId },
})

// DELETE (remove)
await createAuditEntry({
  orgId, actorId, entityType: 'ORG_MEMBERSHIP',
  entityId: String(userId), entityLabel: userEmail,
  action: 'DELETE',
  before: { role, orgId }, after: null,
})

// PATCH role
await createAuditEntry({
  orgId, actorId, entityType: 'ORG_MEMBERSHIP',
  entityId: String(userId), entityLabel: userEmail,
  action: 'ROLE_CHANGED',
  before: { role: oldRole }, after: { role: newRole },
})
```

- [ ] **Step 5: Add audit to approval decisions in `src/app/api/approvals/[orgId]/[projectId]/[recordId]/route.ts`**

After approval decision is saved:
```typescript
await createAuditEntry({
  orgId: Number(params.orgId), actorId: Number(session.user.id),
  entityType: 'APPROVAL', entityId: params.recordId, entityLabel: `Gate #${record.nodeId}`,
  action: decision === 'approved' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
  before: { decision: null }, after: { decision, comment },
})
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/projects/ src/app/api/tasks/ src/app/api/members/ src/app/api/approvals/
git commit -m "feat(audit): wire createAuditEntry into project/task/member/approval routes"
```

---

## Phase 7b: Remaining Secondary Pages

### Task 15b: Master Tenant Users + Audit Sub-pages; TMS Roles + Branding Pages

**Files:**
- Create: `src/app/master/tenants/[org-slug]/users/page.tsx`
- Create: `src/app/master/tenants/[org-slug]/audit/page.tsx`
- Create: `src/app/[org-slug]/tms/roles/page.tsx`
- Create: `src/app/[org-slug]/tms/branding/page.tsx`

- [ ] **Step 1: Create `src/app/master/tenants/[org-slug]/users/page.tsx`**

```tsx
import { getSuperadminSession } from '@/lib/master-context'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function TenantUsersPage({ params }: { params: { 'org-slug': string } }) {
  const user = await getSuperadminSession()
  if (!user) redirect('/')

  const org = await db.organization.findUnique({ where: { slug: params['org-slug'] } })
  if (!org) redirect('/master/tenants')

  const members = await db.orgMembership.findMany({
    where: { orgId: org.id },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } }, department: { select: { name: true } } },
    orderBy: { user: { name: 'asc' } },
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Users — {org.name}</h1>
      <p className="text-slate-500 text-sm mb-6">{members.length} members</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Email</th>
            <th className="text-left py-2 px-3">Role</th>
            <th className="text-left py-2 px-3">Department</th>
            <th className="text-left py-2 px-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{m.user.name}</td>
              <td className="py-2 px-3">{m.user.email}</td>
              <td className="py-2 px-3">{m.role}</td>
              <td className="py-2 px-3">{m.department?.name ?? '—'}</td>
              <td className="py-2 px-3 text-xs">{new Date(m.user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/master/tenants/[org-slug]/audit/page.tsx`**

```tsx
'use client'
import { useParams } from 'next/navigation'
import { AuditTable } from '@/components/audit/AuditTable'

export default function TenantAuditPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Audit Log — {slug}</h1>
      <p className="text-slate-500 text-sm mb-6">Scoped to this tenant</p>
      <AuditTable apiUrl={`/api/master/audit?orgSlug=${slug}`} showTenantFilter={false} />
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/[org-slug]/tms/roles/page.tsx`**

```tsx
'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Member = { userId: number; role: string; user: { name: string; email: string }; department?: { name: string } | null }
const ROLES = ['ADMIN', 'MANAGER', 'MEMBER']

export default function TmsRolesPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    fetch(`/api/tms/${slug}/users`).then((r) => r.json()).then((d) => setMembers(d.members ?? []))
  }, [slug])

  async function changeRole(userId: number, role: string) {
    await fetch(`/api/tms/${slug}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Roles</h1>
      <p className="text-slate-500 text-sm mb-6">Assign roles per member</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-600 text-xs uppercase border-b border-slate-800">
            <th className="text-left py-2 px-3">Member</th>
            <th className="text-left py-2 px-3">Department</th>
            <th className="text-left py-2 px-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b border-slate-900 text-slate-400">
              <td className="py-2 px-3 text-slate-100">{m.user.name}</td>
              <td className="py-2 px-3">{m.department?.name ?? '—'}</td>
              <td className="py-2 px-3">
                <select
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs"
                  value={m.role}
                  onChange={(e) => changeRole(m.userId, e.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Also create the roles PATCH API `src/app/api/tms/[org-slug]/roles/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { createAuditEntry } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, role } = await req.json()
  const target = await db.orgMembership.findFirst({ where: { orgId: membership.orgId, userId }, include: { user: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.orgMembership.update({ where: { orgId_userId: { orgId: membership.orgId, userId } }, data: { role } })
  await createAuditEntry({
    orgId: membership.orgId, actorId: Number(session.user.id), entityType: 'ORG_MEMBERSHIP',
    entityId: String(userId), entityLabel: target.user.email ?? String(userId),
    action: 'ROLE_CHANGED',
    before: { role: target.role }, after: { role },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create `src/app/[org-slug]/tms/branding/page.tsx`**

```tsx
'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TmsBrandingPage() {
  const { 'org-slug': slug } = useParams<{ 'org-slug': string }>()
  const [branding, setBranding] = useState({ logoUrl: '', primaryColor: '#6366f1', companyName: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/master/tenants/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        const b = d.org?.tenantConfig?.branding ?? {}
        setBranding({ logoUrl: b.logoUrl ?? '', primaryColor: b.primaryColor ?? '#6366f1', companyName: b.companyName ?? '' })
      })
  }, [slug])

  async function save() {
    setSaving(true)
    // Branding is patched via the master tenants API — org admin only sends branding field
    await fetch(`/api/tms/${slug}/branding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branding }),
    })
    setSaving(false)
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-slate-100 mb-1">Branding</h1>
      <p className="text-slate-500 text-sm mb-6">Customize your org appearance</p>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        {([['companyName', 'Company Name', 'text'], ['logoUrl', 'Logo URL', 'url'], ['primaryColor', 'Primary Color', 'color']] as const).map(
          ([key, label, type]) => (
            <div key={key}>
              <label className="block text-slate-500 text-xs uppercase mb-1">{label}</label>
              <input
                type={type}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
                value={branding[key as keyof typeof branding]}
                onChange={(e) => setBranding({ ...branding, [key]: e.target.value })}
              />
            </div>
          )
        )}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 bg-emerald-500 text-slate-950 rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Branding'}
      </button>
    </div>
  )
}
```

Also create `src/app/api/tms/[org-slug]/branding/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getOrgMembership } from '@/lib/org-context'
import { createAuditEntry } from '@/lib/audit'
import { isFeatureEnabled, getTenantConfig } from '@/lib/tenant-config'

export async function PATCH(req: NextRequest, { params }: { params: { 'org-slug': string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const membership = await getOrgMembership(session.user.id, params['org-slug'])
  if (!membership || membership.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const config = await getTenantConfig(membership.orgId)
  if (!isFeatureEnabled(config, 'customBranding')) return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })

  const { branding } = await req.json()
  const updated = await db.tenantConfig.update({ where: { orgId: membership.orgId }, data: { branding } })
  await createAuditEntry({
    orgId: membership.orgId, actorId: Number(session.user.id), entityType: 'TENANT_CONFIG',
    entityId: String(membership.orgId), entityLabel: params['org-slug'],
    action: 'BRANDING_CHANGED',
    before: { branding: config.branding }, after: { branding: updated.branding },
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/master/tenants/ src/app/[org-slug]/tms/ src/app/api/tms/
git commit -m "feat(tms): add tenant users/audit sub-pages, TMS roles/branding pages + APIs"
```

---

## Phase 8: Feature Flag Enforcement

### Task 16: Gate existing routes + UI behind featureFlags

**Files:**
- Modify: `src/app/[org-slug]/admin/templates/[id]/page.tsx` (flow builder)
- Modify: `src/app/api/templates/[orgId]/route.ts`

- [ ] **Step 1: Gate flow builder page behind `flowBuilder` flag**

In `src/app/[org-slug]/admin/templates/[id]/page.tsx`, add at top of component:

```typescript
const config = await getTenantConfig(membership.orgId)
if (!isFeatureEnabled(config, 'flowBuilder')) notFound()
```

- [ ] **Step 2: Gate approvals API behind `approvals` flag**

In `src/app/api/approvals/[orgId]/[projectId]/route.ts`, add at top of POST handler:

```typescript
const config = await getTenantConfig(Number(params.orgId))
if (!isFeatureEnabled(config, 'approvals')) {
  return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
}
```

- [ ] **Step 3: Gate branding TMS page behind `customBranding` flag**

In `src/app/[org-slug]/tms/branding/page.tsx`:

```typescript
const config = await getTenantConfig(membership.orgId)
if (!isFeatureEnabled(config, 'customBranding')) notFound()
```

- [ ] **Step 4: Commit**

```bash
git add src/app/
git commit -m "feat(tms): enforce feature flags on flow builder, approvals, branding"
```

---

## Phase 9: Smoke Test

### Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Master TMS accessible for SUPERADMIN**

Using Prisma Studio or a seed script, set `systemRole = 'SUPERADMIN'` on a test user:
```bash
npx prisma studio
# Edit User row → systemRole = "SUPERADMIN"
```

Navigate to `http://localhost:3000/master` — should see platform dashboard.

- [ ] **Step 3: Verify non-SUPERADMIN redirected from `/master`**

Log in as a normal user. Navigate to `/master` — should redirect to `/`.

- [ ] **Step 4: Verify TMS accessible for org ADMIN**

Navigate to `http://localhost:3000/[your-org]/tms` as an ADMIN — should see admin portal.

- [ ] **Step 5: Verify non-ADMIN redirected from `/tms`**

Log in as a MEMBER. Navigate to `/[org]/tms` — should redirect to `/[org]`.

- [ ] **Step 6: Verify audit entry created on project update**

Update a project. Run:
```bash
npx prisma studio
# Check AuditLog table — should see a new PROJECT UPDATE entry with before/after
```

- [ ] **Step 7: Verify audit purge cron**

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/audit-purge
# Expected: { "deleted": 0, "cutoff": "..." }
```

- [ ] **Step 8: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: FlowDesk TMS + Audit Dashboard — complete implementation"
```
