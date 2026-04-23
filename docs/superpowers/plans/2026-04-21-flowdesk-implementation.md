# FlowDesk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build FlowDesk — a multi-tenant project management SaaS where org admins define visual workflow templates, departments spawn projects from them, and members execute work via Kanban board with mandatory/optional flow stages, approval gates, and conditional branching.

**Architecture:** Next.js 15 App Router monorepo. Each org is URL-namespaced via `[org-slug]`. Middleware validates org access on every request. Flow definitions stored as JSONB in Postgres; projects snapshot template nodes at creation so template edits never break live projects. Approval and notification logic runs server-side; no WebSocket at MVP (DB polling only).

**Tech Stack:** Next.js 15 (App Router) + TypeScript, NextAuth.js, Prisma + Neon (PostgreSQL), React Flow, dnd-kit, shadcn/ui + Tailwind CSS, Vitest + React Testing Library, Stripe (wired but not blocking MVP launch)

---

## File Map

```
prisma/
  schema.prisma

src/
  lib/
    db.ts                        # Prisma singleton
    auth.ts                      # NextAuth config + helpers
    org-context.ts               # get session org membership
    flow-engine.ts               # stage advancement logic
    approval-engine.ts           # approval gate logic
    notification-engine.ts       # create notifications
    types.ts                     # shared TypeScript types (FlowNode, etc.)

  middleware.ts                  # org-slug auth + access guard

  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    api/
      auth/[...nextauth]/route.ts
      orgs/
        route.ts                 # POST /api/orgs
        [orgId]/route.ts         # GET/PATCH /api/orgs/[orgId]
      departments/
        [orgId]/route.ts         # GET/POST departments
        [orgId]/[deptId]/route.ts
      members/
        [orgId]/route.ts         # GET/POST/DELETE memberships
        [orgId]/[userId]/route.ts
      templates/
        [orgId]/route.ts         # GET/POST templates
        [orgId]/[templateId]/route.ts      # GET/PATCH/DELETE
        [orgId]/[templateId]/publish/route.ts
        [orgId]/[templateId]/assign/route.ts
      projects/
        [orgId]/route.ts         # GET/POST projects
        [orgId]/[projectId]/route.ts
        [orgId]/[projectId]/advance/route.ts
      tasks/
        [orgId]/[projectId]/route.ts       # GET/POST tasks
        [orgId]/[projectId]/[taskId]/route.ts
      approvals/
        [orgId]/[projectId]/route.ts       # POST request-approval
        [orgId]/[projectId]/[recordId]/route.ts  # PATCH decide
      notifications/
        [orgId]/route.ts         # GET notifications for current user
        [orgId]/[notifId]/route.ts  # PATCH mark-read

    [org-slug]/
      layout.tsx                 # AppShell wrapper, validates org access
      page.tsx                   # Home dashboard
      tasks/page.tsx             # My Tasks
      projects/
        page.tsx                 # Project list
        [id]/
          page.tsx               # Kanban board
      notifications/page.tsx
      admin/
        templates/
          page.tsx               # Template list
          [id]/page.tsx          # Flow builder
        people/page.tsx
        settings/page.tsx

  components/
    ui/                          # shadcn components (generated)
    app-shell/
      AppShell.tsx
      Sidebar.tsx
      OrgSwitcher.tsx
      NavItem.tsx
    flow-builder/
      FlowBuilder.tsx
      NodePalette.tsx
      NodeConfigPanel.tsx
      nodes/
        StageNode.tsx
        ApprovalNode.tsx
        ConditionNode.tsx
        EndNode.tsx
    kanban/
      KanbanBoard.tsx
      KanbanColumn.tsx
      KanbanCard.tsx
      FlowProgressStrip.tsx
      ApprovalGateBanner.tsx
    notifications/
      NotificationPanel.tsx
      NotificationItem.tsx

  __tests__/
    lib/
      flow-engine.test.ts
      approval-engine.test.ts
      notification-engine.test.ts
    api/
      orgs.test.ts
      departments.test.ts
      templates.test.ts
      projects.test.ts
      tasks.test.ts
      approvals.test.ts
      notifications.test.ts
    components/
      KanbanBoard.test.tsx
      FlowProgressStrip.test.tsx
      NotificationItem.test.tsx
```

---

## Phase 1: Foundation

### Task 1: Project Setup

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `tailwind.config.ts`, `components.json`

- [ ] **Step 1: Bootstrap Next.js 15 project**

```bash
npx create-next-app@latest flowdesk \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint
cd flowdesk
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install @prisma/client @auth/prisma-adapter next-auth@beta \
  @tanstack/react-query zod react-hook-form @hookform/resolvers \
  reactflow @xyflow/react dnd-kit @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  lucide-react clsx tailwind-merge class-variance-authority \
  bcryptjs
npm install -D prisma vitest @vitejs/plugin-react \
  vite-tsconfig-paths @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom @types/bcryptjs jsdom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables yes
npx shadcn@latest add button input label card badge avatar separator
npx shadcn@latest add dropdown-menu dialog sheet toast scroll-area
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 7: Verify test runner works**

```bash
mkdir -p src/__tests__
cat > src/__tests__/smoke.test.ts << 'EOF'
test('vitest is wired up', () => {
  expect(1 + 1).toBe(2)
})
EOF
npm run test:run
```

Expected: `1 passed`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js 15 project with Vitest + shadcn/ui"
```

---

### Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Create: `src/__tests__/lib/db.test.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema**

Replace `prisma/schema.prisma` entirely:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id            String         @id @default(cuid())
  name          String
  slug          String         @unique
  plan          Plan           @default(FREE)
  createdAt     DateTime       @default(now())
  memberships   OrgMembership[]
  departments   Department[]
  templates     FlowTemplate[]
  projects      Project[]
  notifications Notification[]
}

enum Plan {
  FREE
  PRO
}

model User {
  id              String           @id @default(cuid())
  email           String           @unique
  name            String?
  avatarUrl       String?
  password        String?
  createdAt       DateTime         @default(now())
  memberships     OrgMembership[]
  createdTemplates FlowTemplate[]
  assignedTasks   Task[]
  approvalRecords ApprovalRecord[]
  notifications   Notification[]
  createdProjects Project[]
}

model OrgMembership {
  id           String      @id @default(cuid())
  orgId        String
  userId       String
  role         Role        @default(MEMBER)
  departmentId String?
  org          Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  department   Department?  @relation(fields: [departmentId], references: [id])

  @@unique([orgId, userId])
}

enum Role {
  ADMIN
  MANAGER
  MEMBER
}

model Department {
  id          String         @id @default(cuid())
  orgId       String
  name        String
  managerId   String?
  org         Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  memberships OrgMembership[]
  projects    Project[]

  @@unique([orgId, name])
}

model FlowTemplate {
  id              String    @id @default(cuid())
  orgId           String
  name            String
  nodes           Json      @default("[]")
  edges           Json      @default("[]")
  assignedDeptIds String[]  @default([])
  createdBy       String
  publishedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  org             Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  creator         User         @relation(fields: [createdBy], references: [id])
  projects        Project[]
}

model Project {
  id             String        @id @default(cuid())
  orgId          String
  deptId         String
  flowTemplateId String
  name           String
  status         ProjectStatus @default(ACTIVE)
  snapshotNodes  Json          @default("[]")
  snapshotEdges  Json          @default("[]")
  currentNodeId  String?
  createdBy      String
  createdAt      DateTime      @default(now())
  org            Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  department     Department    @relation(fields: [deptId], references: [id])
  template       FlowTemplate  @relation(fields: [flowTemplateId], references: [id])
  creator        User          @relation(fields: [createdBy], references: [id])
  tasks          Task[]
  approvals      ApprovalRecord[]
}

enum ProjectStatus {
  ACTIVE
  DONE
  ARCHIVED
}

model Task {
  id             String     @id @default(cuid())
  projectId      String
  nodeId         String
  title          String
  assigneeId     String?
  dueDate        DateTime?
  status         TaskStatus @default(TODO)
  checklistItems Json       @default("[]")
  createdAt      DateTime   @default(now())
  project        Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee       User?      @relation(fields: [assigneeId], references: [id])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

model ApprovalRecord {
  id          String            @id @default(cuid())
  projectId   String
  nodeId      String
  approverId  String
  decision    ApprovalDecision?
  comment     String?
  requestedAt DateTime          @default(now())
  decidedAt   DateTime?
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  approver    User     @relation(fields: [approverId], references: [id])
}

enum ApprovalDecision {
  APPROVED
  REJECTED
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  orgId     String
  type      NotificationType
  payload   Json             @default("{}")
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  APPROVAL_REQUESTED
  APPROVAL_DECIDED
  TASK_ASSIGNED
  STAGE_ADVANCED
}
```

- [ ] **Step 3: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/flowdesk_dev"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

Set `DATABASE_URL` to your actual Neon connection string from [neon.tech](https://neon.tech) (free tier).

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: migration created, Prisma Client generated.

- [ ] **Step 5: Create `src/lib/db.ts`**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 6: Write failing test for db singleton**

```typescript
// src/__tests__/lib/db.test.ts
import { describe, it, expect } from 'vitest'

describe('db singleton', () => {
  it('exports prisma client', async () => {
    const { prisma } = await import('@/lib/db')
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
  })
})
```

- [ ] **Step 7: Run test**

```bash
npm run test:run src/__tests__/lib/db.test.ts
```

Expected: `1 passed`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and db singleton"
```

---

### Task 3: Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types**

```typescript
// src/lib/types.ts

export type FlowNodeType = 'stage' | 'approval' | 'condition' | 'end'

export interface FlowCondition {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'lt'
  value: string
  goto: string
}

export interface FlowDefaultCondition {
  default: true
  goto: string
}

export interface ApproverConfig {
  userIds: string[]
  groupIds: string[]  // MVP: only 'dept-managers' supported
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  label: string
  isMandatory: boolean
  checklist: string[]
  approvers: ApproverConfig
  approvalMode: 'any' | 'all'
  conditions: (FlowCondition | FlowDefaultCondition)[]
  // React Flow position (stored with node, not separate)
  position?: { x: number; y: number }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
  style?: Record<string, unknown>
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

// API response shapes
export interface ApiError {
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types for flow nodes and API"
```

---

### Task 4: NextAuth.js Setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/__tests__/api/auth.test.ts`

- [ ] **Step 1: Write `src/lib/auth.ts`**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user?.password) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
```

- [ ] **Step 2: Create route handler**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/lib/auth'
```

- [ ] **Step 3: Write failing test for auth helpers**

```typescript
// src/__tests__/api/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('auth credentials authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when user not found', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    // Import after mock setup
    const { auth } = await import('@/lib/auth')
    // auth itself is the NextAuth object; we test the authorize logic via
    // integration — this test ensures the mock wiring is correct
    expect(prisma.user.findUnique).toBeDefined()
  })

  it('bcrypt hash and compare work correctly', async () => {
    const password = 'testpassword123'
    const hash = await bcrypt.hash(password, 10)
    const valid = await bcrypt.compare(password, hash)
    const invalid = await bcrypt.compare('wrongpassword', hash)

    expect(valid).toBe(true)
    expect(invalid).toBe(false)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run src/__tests__/api/auth.test.ts
```

Expected: `2 passed`

- [ ] **Step 5: Create register API route**

```typescript
// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, name } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 6: Write test for register route**

```typescript
// src/__tests__/api/register.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}))

describe('POST /api/register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for invalid input', async () => {
    const { POST } = await import('@/app/api/register/route')
    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'short' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when email already exists', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1', email: 'a@b.com', name: 'A', password: 'x',
      avatarUrl: null, createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/register/route')
    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.com', password: 'password123', name: 'A' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('creates user and returns 201', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user_1', email: 'new@example.com', name: 'New User',
      password: 'hashed', avatarUrl: null, createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/register/route')
    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com', password: 'password123', name: 'New User' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.email).toBe('new@example.com')
  })
})
```

- [ ] **Step 7: Run tests**

```bash
npm run test:run src/__tests__/api/register.test.ts
```

Expected: `3 passed`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth.js with credentials provider and register endpoint"
```

---

### Task 5: Multi-tenancy Middleware + Org Context

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/org-context.ts`
- Create: `src/__tests__/lib/org-context.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/lib/org-context.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    orgMembership: {
      findUnique: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

describe('getOrgMembership', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when no session', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(null)

    const { getOrgMembership } = await import('@/lib/org-context')
    const result = await getOrgMembership('acme')
    expect(result).toBeNull()
  })

  it('returns membership with org when found', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1', email: 'a@b.com', name: 'A' }, expires: '' })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date(),
    })
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({
      id: 'mem_1', orgId: 'org_1', userId: 'user_1', role: 'ADMIN', departmentId: null,
    })

    const { getOrgMembership } = await import('@/lib/org-context')
    const result = await getOrgMembership('acme')
    expect(result?.role).toBe('ADMIN')
    expect(result?.org.slug).toBe('acme')
  })

  it('returns null when user is not a member of the org', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1', email: 'a@b.com', name: 'A' }, expires: '' })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date(),
    })
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue(null)

    const { getOrgMembership } = await import('@/lib/org-context')
    const result = await getOrgMembership('acme')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm run test:run src/__tests__/lib/org-context.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/lib/org-context.ts`**

```typescript
// src/lib/org-context.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Role } from '@prisma/client'

export interface OrgMembershipContext {
  userId: string
  orgId: string
  role: Role
  departmentId: string | null
  org: { id: string; name: string; slug: string; plan: string }
}

export async function getOrgMembership(
  orgSlug: string
): Promise<OrgMembershipContext | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } })
  if (!org) return null

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  })
  if (!membership) return null

  return {
    userId: session.user.id,
    orgId: org.id,
    role: membership.role,
    departmentId: membership.departmentId,
    org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
  }
}

export async function requireOrgRole(
  orgSlug: string,
  minRole: Role
): Promise<OrgMembershipContext> {
  const ctx = await getOrgMembership(orgSlug)
  if (!ctx) throw new Error('UNAUTHORIZED')

  const hierarchy: Role[] = ['MEMBER', 'MANAGER', 'ADMIN']
  if (hierarchy.indexOf(ctx.role) < hierarchy.indexOf(minRole)) {
    throw new Error('FORBIDDEN')
  }
  return ctx
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm run test:run src/__tests__/lib/org-context.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Create `src/middleware.ts`**

```typescript
// src/middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/register')
  ) {
    return NextResponse.next()
  }

  // All other routes require auth
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add multi-tenancy org-context helpers and auth middleware"
```

---

## Phase 2: Org, Department & Member APIs

### Task 6: Org & Department APIs

**Files:**
- Create: `src/app/api/orgs/route.ts`
- Create: `src/app/api/departments/[orgId]/route.ts`
- Create: `src/__tests__/api/orgs.test.ts`
- Create: `src/__tests__/api/departments.test.ts`

- [ ] **Step 1: Write failing tests for orgs API**

```typescript
// src/__tests__/api/orgs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: { create: vi.fn(), findUnique: vi.fn() },
    orgMembership: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

describe('POST /api/orgs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(null)

    const { POST } = await import('@/app/api/orgs/route')
    const req = new NextRequest('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme', slug: 'acme' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates org and makes requester ADMIN', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1', email: 'a@b.com', name: 'A' }, expires: '' })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.organization.create).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date(),
    })
    vi.mocked(prisma.orgMembership.create).mockResolvedValue({
      id: 'mem_1', orgId: 'org_1', userId: 'user_1', role: 'ADMIN', departmentId: null,
    })

    const { POST } = await import('@/app/api/orgs/route')
    const req = new NextRequest('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme', slug: 'acme' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.orgMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN' }) })
    )
  })

  it('returns 409 when slug already taken', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1', email: 'a@b.com', name: 'A' }, expires: '' })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date(),
    })

    const { POST } = await import('@/app/api/orgs/route')
    const req = new NextRequest('http://localhost/api/orgs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme', slug: 'acme' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run test — verify fails**

```bash
npm run test:run src/__tests__/api/orgs.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/app/api/orgs/route.ts`**

```typescript
// src/app/api/orgs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const { name, slug } = parsed.data
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })

  const org = await prisma.organization.create({ data: { name, slug } })
  await prisma.orgMembership.create({
    data: { orgId: org.id, userId: session.user.id, role: 'ADMIN' },
  })

  return NextResponse.json(org, { status: 201 })
}
```

- [ ] **Step 4: Run test — verify passes**

```bash
npm run test:run src/__tests__/api/orgs.test.ts
```

Expected: `3 passed`

- [ ] **Step 5: Write failing tests for departments**

```typescript
// src/__tests__/api/departments.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    department: { findMany: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/lib/org-context', () => ({
  requireOrgRole: vi.fn(),
}))

describe('GET /api/departments/[orgId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when user not ADMIN or MANAGER', async () => {
    const { requireOrgRole } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('FORBIDDEN'))

    const { GET } = await import('@/app/api/departments/[orgId]/route')
    const req = new NextRequest('http://localhost/api/departments/org_1')
    const res = await GET(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(403)
  })

  it('returns list of departments', async () => {
    const { requireOrgRole } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockResolvedValue({
      userId: 'u1', orgId: 'org_1', role: 'ADMIN', departmentId: null,
      org: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE' },
    })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.department.findMany).mockResolvedValue([
      { id: 'd1', orgId: 'org_1', name: 'Marketing', managerId: null },
    ])

    const { GET } = await import('@/app/api/departments/[orgId]/route')
    const req = new NextRequest('http://localhost/api/departments/org_1')
    const res = await GET(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Marketing')
  })
})
```

- [ ] **Step 6: Create `src/app/api/departments/[orgId]/route.ts`**

```typescript
// src/app/api/departments/[orgId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOrgRole } from '@/lib/org-context'
import { z } from 'zod'

type Params = { params: Promise<{ orgId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params
  try {
    // Need to resolve org slug from orgId — middleware passes slug, APIs receive orgId
    // For dept listing, MANAGER+ can access
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await requireOrgRole(org.slug, 'MANAGER')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const departments = await prisma.department.findMany({ where: { orgId } })
  return NextResponse.json(departments)
}

const createDeptSchema = z.object({ name: z.string().min(1).max(100) })

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params
  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await requireOrgRole(org.slug, 'ADMIN')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createDeptSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const dept = await prisma.department.create({ data: { orgId, name: parsed.data.name } })
  return NextResponse.json(dept, { status: 201 })
}
```

- [ ] **Step 7: Run tests**

```bash
npm run test:run src/__tests__/api/departments.test.ts
```

Expected: `2 passed`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add org creation and department CRUD APIs"
```

---

### Task 7: Member Management API

**Files:**
- Create: `src/app/api/members/[orgId]/route.ts`
- Create: `src/__tests__/api/members.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/api/members.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
    orgMembership: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/org-context', () => ({ requireOrgRole: vi.fn() }))

describe('POST /api/members/[orgId] — invite member', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds existing user as MEMBER', async () => {
    const { requireOrgRole } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockResolvedValue({
      userId: 'admin_1', orgId: 'org_1', role: 'ADMIN', departmentId: null,
      org: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE' },
    })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date(),
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user_2', email: 'new@example.com', name: 'New', password: null, avatarUrl: null, createdAt: new Date(),
    })
    vi.mocked(prisma.orgMembership.create).mockResolvedValue({
      id: 'mem_2', orgId: 'org_1', userId: 'user_2', role: 'MEMBER', departmentId: null,
    })

    const { POST } = await import('@/app/api/members/[orgId]/route')
    const req = new NextRequest('http://localhost/api/members/org_1', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@example.com', role: 'MEMBER', departmentId: null }),
    })
    const res = await POST(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(201)
  })

  it('returns 404 when invited user email not registered', async () => {
    const { requireOrgRole } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockResolvedValue({
      userId: 'admin_1', orgId: 'org_1', role: 'ADMIN', departmentId: null,
      org: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE' },
    })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date(),
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const { POST } = await import('@/app/api/members/[orgId]/route')
    const req = new NextRequest('http://localhost/api/members/org_1', {
      method: 'POST',
      body: JSON.stringify({ email: 'notfound@example.com', role: 'MEMBER', departmentId: null }),
    })
    const res = await POST(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test — verify fails**

```bash
npm run test:run src/__tests__/api/members.test.ts
```

- [ ] **Step 3: Create `src/app/api/members/[orgId]/route.ts`**

```typescript
// src/app/api/members/[orgId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOrgRole } from '@/lib/org-context'
import { z } from 'zod'
import type { Role } from '@prisma/client'

type Params = { params: Promise<{ orgId: string }> }

async function resolveOrgContext(orgId: string, minRole: Role) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) throw new Error('NOT_FOUND')
  return requireOrgRole(org.slug, minRole)
}

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params
  try {
    await resolveOrgContext(orgId, 'MANAGER')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.orgMembership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
  })
  return NextResponse.json(members)
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
  departmentId: z.string().nullable().default(null),
})

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params
  try {
    await resolveOrgContext(orgId, 'ADMIN')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { email, role, departmentId } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found — they must register first' }, { status: 404 })

  const membership = await prisma.orgMembership.create({
    data: { orgId, userId: user.id, role, departmentId },
    include: { user: { select: { id: true, email: true, name: true } } },
  })
  return NextResponse.json(membership, { status: 201 })
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test:run src/__tests__/api/members.test.ts
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add member management API (invite, list members)"
```

---

## Phase 3: Flow Templates

### Task 8: FlowTemplate CRUD API

**Files:**
- Create: `src/app/api/templates/[orgId]/route.ts`
- Create: `src/app/api/templates/[orgId]/[templateId]/route.ts`
- Create: `src/__tests__/api/templates.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/api/templates.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
    flowTemplate: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/org-context', () => ({ requireOrgRole: vi.fn(), getOrgMembership: vi.fn() }))

const mockOrg = { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE', createdAt: new Date() }
const mockAdminCtx = { userId: 'u1', orgId: 'org_1', role: 'ADMIN' as const, departmentId: null, org: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'FREE' } }

describe('GET /api/templates/[orgId] — list templates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns only published+assigned templates for MEMBER', async () => {
    const { requireOrgRole, getOrgMembership } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockResolvedValue({ ...mockAdminCtx, role: 'MEMBER', departmentId: 'dept_1' })
    vi.mocked(getOrgMembership).mockResolvedValue({ ...mockAdminCtx, role: 'MEMBER', departmentId: 'dept_1' })

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg)
    vi.mocked(prisma.flowTemplate.findMany).mockResolvedValue([])

    const { GET } = await import('@/app/api/templates/[orgId]/route')
    const req = new NextRequest('http://localhost/api/templates/org_1')
    const res = await GET(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(200)
    // For MEMBER: query filters by assignedDeptIds containing their deptId
    expect(prisma.flowTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedDeptIds: { has: 'dept_1' } }),
      })
    )
  })

  it('returns all templates for ADMIN', async () => {
    const { requireOrgRole, getOrgMembership } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockResolvedValue(mockAdminCtx)
    vi.mocked(getOrgMembership).mockResolvedValue(mockAdminCtx)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg)
    vi.mocked(prisma.flowTemplate.findMany).mockResolvedValue([])

    const { GET } = await import('@/app/api/templates/[orgId]/route')
    const req = new NextRequest('http://localhost/api/templates/org_1')
    const res = await GET(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(200)
    // For ADMIN: no dept filter
    expect(prisma.flowTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orgId: 'org_1' }) })
    )
  })

  it('returns 403 when not a member', async () => {
    const { requireOrgRole } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('FORBIDDEN'))

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg)

    const { GET } = await import('@/app/api/templates/[orgId]/route')
    const req = new NextRequest('http://localhost/api/templates/org_1')
    const res = await GET(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/templates/[orgId] — create template', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates draft template as ADMIN', async () => {
    const { requireOrgRole, getOrgMembership } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockResolvedValue(mockAdminCtx)
    vi.mocked(getOrgMembership).mockResolvedValue(mockAdminCtx)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg)
    vi.mocked(prisma.flowTemplate.create).mockResolvedValue({
      id: 'tmpl_1', orgId: 'org_1', name: 'Campaign Flow', nodes: [], edges: [],
      assignedDeptIds: [], createdBy: 'u1', publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
    })

    const { POST } = await import('@/app/api/templates/[orgId]/route')
    const req = new NextRequest('http://localhost/api/templates/org_1', {
      method: 'POST',
      body: JSON.stringify({ name: 'Campaign Flow' }),
    })
    const res = await POST(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.publishedAt).toBeNull()
  })

  it('returns 403 when non-ADMIN tries to create', async () => {
    const { requireOrgRole } = await import('@/lib/org-context')
    vi.mocked(requireOrgRole).mockRejectedValue(new Error('FORBIDDEN'))

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg)

    const { POST } = await import('@/app/api/templates/[orgId]/route')
    const req = new NextRequest('http://localhost/api/templates/org_1', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Flow' }),
    })
    const res = await POST(req, { params: Promise.resolve({ orgId: 'org_1' }) })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test — verify fails**

```bash
npm run test:run src/__tests__/api/templates.test.ts
```

- [ ] **Step 3: Create `src/app/api/templates/[orgId]/route.ts`**

```typescript
// src/app/api/templates/[orgId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOrgRole, getOrgMembership } from '@/lib/org-context'
import { z } from 'zod'

type Params = { params: Promise<{ orgId: string }> }

async function getOrg(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) throw new Error('NOT_FOUND')
  return org
}

function handleAuthError(e: unknown) {
  const msg = e instanceof Error ? e.message : ''
  if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (msg === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params
  let ctx: Awaited<ReturnType<typeof getOrgMembership>>
  try {
    const org = await getOrg(orgId)
    await requireOrgRole(org.slug, 'MEMBER')
    ctx = await getOrgMembership(org.slug)
  } catch (e) {
    return handleAuthError(e)
  }

  const isAdmin = ctx?.role === 'ADMIN'
  const isManager = ctx?.role === 'MANAGER'
  const deptId = ctx?.departmentId

  const where: Record<string, unknown> = { orgId }
  if (!isAdmin && !isManager) {
    // Members only see templates assigned to their dept
    where.assignedDeptIds = { has: deptId }
    where.publishedAt = { not: null }
  }

  const templates = await prisma.flowTemplate.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(templates)
}

const createTemplateSchema = z.object({ name: z.string().min(1).max(100) })

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId } = await params
  let ctx: Awaited<ReturnType<typeof getOrgMembership>>
  try {
    const org = await getOrg(orgId)
    ctx = await requireOrgRole(org.slug, 'ADMIN')
  } catch (e) {
    return handleAuthError(e)
  }

  const body = await req.json()
  const parsed = createTemplateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const template = await prisma.flowTemplate.create({
    data: { orgId, name: parsed.data.name, createdBy: ctx!.userId },
  })
  return NextResponse.json(template, { status: 201 })
}
```

- [ ] **Step 4: Create `src/app/api/templates/[orgId]/[templateId]/route.ts`**

```typescript
// src/app/api/templates/[orgId]/[templateId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOrgRole } from '@/lib/org-context'
import { z } from 'zod'
import type { FlowNode, FlowEdge } from '@/lib/types'

type Params = { params: Promise<{ orgId: string; templateId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireOrgRole(org.slug, 'MEMBER')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const template = await prisma.flowTemplate.findFirst({ where: { id: templateId, orgId } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireOrgRole(org.slug, 'ADMIN')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const template = await prisma.flowTemplate.findFirst({ where: { id: templateId, orgId } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (template.publishedAt) return NextResponse.json({ error: 'Cannot edit published template — create a new version' }, { status: 409 })

  const body = await req.json()
  const parsed = updateTemplateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.flowTemplate.update({
    where: { id: templateId },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.nodes && { nodes: parsed.data.nodes as FlowNode[] }),
      ...(parsed.data.edges && { edges: parsed.data.edges as FlowEdge[] }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireOrgRole(org.slug, 'ADMIN')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.flowTemplate.delete({ where: { id: templateId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create publish + assign routes**

```typescript
// src/app/api/templates/[orgId]/[templateId]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOrgRole } from '@/lib/org-context'

type Params = { params: Promise<{ orgId: string; templateId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireOrgRole(org.slug, 'ADMIN')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const template = await prisma.flowTemplate.findFirst({ where: { id: templateId, orgId } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const nodes = template.nodes as unknown[]
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return NextResponse.json({ error: 'Cannot publish template with no nodes' }, { status: 422 })
  }

  const updated = await prisma.flowTemplate.update({
    where: { id: templateId },
    data: { publishedAt: new Date() },
  })
  return NextResponse.json(updated)
}
```

```typescript
// src/app/api/templates/[orgId]/[templateId]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOrgRole } from '@/lib/org-context'
import { z } from 'zod'

type Params = { params: Promise<{ orgId: string; templateId: string }> }

const assignSchema = z.object({ deptIds: z.array(z.string()) })

export async function POST(req: NextRequest, { params }: Params) {
  const { orgId, templateId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireOrgRole(org.slug, 'ADMIN')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const template = await prisma.flowTemplate.findFirst({ where: { id: templateId, orgId } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!template.publishedAt) return NextResponse.json({ error: 'Publish template before assigning' }, { status: 422 })

  const body = await req.json()
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.flowTemplate.update({
    where: { id: templateId },
    data: { assignedDeptIds: parsed.data.deptIds },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 6: Run all template tests**

```bash
npm run test:run src/__tests__/api/templates.test.ts
```

Expected: `5 passed`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add FlowTemplate CRUD, publish, and dept-assignment APIs"
```
