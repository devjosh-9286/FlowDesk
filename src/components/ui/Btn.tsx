'use client'

import React from 'react'
import { getTokens } from '@/lib/tokens'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'active' | 'danger'
type Size = 'xs' | 'sm' | 'md'

interface BtnProps {
  children?: React.ReactNode
  variant?: Variant
  size?: Size
  icon?: React.ReactNode | string
  dark?: boolean
  active?: boolean
  onClick?: () => void
  style?: React.CSSProperties
  title?: string
  disabled?: boolean
}

const SIZES = {
  xs: { pad: '2px 6px',   fs: 11, h: 22 },
  sm: { pad: '4px 10px',  fs: 12, h: 28 },
  md: { pad: '6px 12px',  fs: 13, h: 32 },
}

export function Btn({
  children,
  variant = 'ghost',
  size = 'sm',
  icon,
  dark = false,
  active = false,
  onClick,
  style,
  title,
  disabled,
}: BtnProps) {
  const t = getTokens(dark)
  const s = SIZES[size]

  const variants = {
    primary:   { bg: t.accent,    fg: 'white',      bd: t.accent,    hover: t.accent + 'dd' },
    secondary: { bg: t.surface,   fg: t.text,       bd: t.border,    hover: t.surface2 },
    ghost:     { bg: 'transparent', fg: t.textMuted, bd: 'transparent', hover: t.surface2 },
    active:    { bg: t.surface2,  fg: t.text,       bd: t.border,    hover: t.surface2 },
    danger:    { bg: 'transparent', fg: t.red,       bd: 'transparent', hover: t.redSoft },
  }

  const v = active ? variants.active : variants[variant]

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: s.pad,
        height: s.h,
        minWidth: icon && !children ? s.h : 'auto',
        fontSize: s.fs,
        fontWeight: 500,
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.bd}`,
        borderRadius: 5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        transition: 'background 0.1s, border-color 0.1s',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hover }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = v.bg }}
    >
      {icon && <Icon d={icon} size={s.fs} />}
      {children}
    </button>
  )
}
