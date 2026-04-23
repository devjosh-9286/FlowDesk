'use client'

import React from 'react'
import { personById } from '@/lib/data'
import { getTokens } from '@/lib/tokens'

interface AvatarProps {
  user: string   // person id
  size?: number
  ring?: boolean
  dark?: boolean
}

export function Avatar({ user, size = 20, ring = false, dark = false }: AvatarProps) {
  const t = getTokens(dark)
  const p = personById(user)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `oklch(0.72 0.13 ${p.hue})`,
        color: 'white',
        fontSize: Math.max(9, size * 0.42),
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '0.02em',
        boxShadow: ring ? `0 0 0 2px ${t.surface}` : 'none',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {p.initials}
    </div>
  )
}

interface AvatarStackProps {
  users: string[]
  size?: number
  dark?: boolean
  max?: number
}

export function AvatarStack({ users, size = 20, dark = false, max = 4 }: AvatarStackProps) {
  const arr = users.slice(0, max)
  return (
    <div style={{ display: 'inline-flex' }}>
      {arr.map((u, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar user={u} size={size} ring dark={dark} />
        </div>
      ))}
    </div>
  )
}
