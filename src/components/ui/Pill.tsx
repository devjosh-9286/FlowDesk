'use client'

import React from 'react'
import { getTokens, Tokens } from '@/lib/tokens'

type Tone = 'neutral' | 'accent' | 'teal' | 'amber' | 'red' | 'green' | 'blue' | 'solid'

interface PillProps {
  children: React.ReactNode
  tone?: Tone
  dark?: boolean
  mono?: boolean
  style?: React.CSSProperties
}

function getPillColors(tone: Tone, t: Tokens) {
  switch (tone) {
    case 'accent':  return { bg: t.accentSoft,  fg: t.accent,    bd: t.accentBorder }
    case 'teal':    return { bg: t.tealSoft,    fg: t.teal,      bd: t.teal + '40' }
    case 'amber':   return { bg: t.amberSoft,   fg: t.amber,     bd: t.amber + '40' }
    case 'red':     return { bg: t.redSoft,     fg: t.red,       bd: t.red + '40' }
    case 'green':   return { bg: t.greenSoft,   fg: t.green,     bd: t.green + '40' }
    case 'blue':    return { bg: t.blueSoft,    fg: t.blue,      bd: t.blue + '40' }
    case 'solid':   return { bg: t.text,        fg: t.surface,   bd: t.text }
    default:        return { bg: t.surface3,    fg: t.textMuted, bd: t.border }
  }
}

export function Pill({ children, tone = 'neutral', dark = false, mono = false, style }: PillProps) {
  const t = getTokens(dark)
  const c = getPillColors(tone, t)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 6px',
        fontSize: 10.5,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
        borderRadius: 4,
        letterSpacing: mono ? '0.02em' : '0.01em',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
