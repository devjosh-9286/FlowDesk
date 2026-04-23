import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowDesk — Workflow Project Management',
  description: 'Multi-tenant project management with visual workflow templates, Kanban, and approval gates.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
