// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
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
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
