'use client'

import React from 'react'

type IconPath = string | React.ReactNode

interface IconProps {
  d: IconPath
  size?: number
  stroke?: number
  style?: React.CSSProperties
  className?: string
}

export function Icon({ d, size = 14, stroke = 1.6, style, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      {typeof d === 'string' ? <path d={d} /> : d}
    </svg>
  )
}

// Icon paths — ported from shell.jsx
export const Icons = {
  home:      'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z',
  folder:    'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z',
  flow:      (<><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15.5M6 8.5V15.5M18 8.5V15.5M8.5 18H15.5"/></>),
  tasks:     'M4 7h16M4 12h10M4 17h16',
  check:     'M5 12.5 10 17 19 7',
  bell:      'M6 8a6 6 0 1 1 12 0c0 4 1.5 5 2 6H4c.5-1 2-2 2-6ZM10 20a2 2 0 0 0 4 0',
  users:     (<><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20c0-2.5 2-4 4-4s2 1 2 4"/></>),
  settings:  (<><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>),
  plus:      'M12 5v14M5 12h14',
  search:    (<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
  chevDown:  'm6 9 6 6 6-6',
  chevRight: 'm9 6 6 6-6 6',
  chevLeft:  'm15 6-6 6 6 6',
  dots:      (<><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>),
  diamond:   'M12 2 22 12 12 22 2 12Z',
  branch:    (<><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M7.5 12H16"/></>),
  stage:     'M4 6h16v12H4z',
  approval:  'M9 12l2 2 4-4 M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6Z',
  stop:      'M6 6h12v12H6z',
  filter:    'M4 5h16l-6 8v6l-4-2v-4Z',
  sort:      'M7 4v16M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4',
  clock:     (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  eye:       (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>),
  lock:      (<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>),
  link:      (<><path d="M10 14a5 5 0 0 1 0-7l3-3a5 5 0 1 1 7 7l-1.5 1.5"/><path d="M14 10a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5"/></>),
  zap:       'M13 2 3 14h8l-1 8 10-12h-8Z',
  grip:      (<><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></>),
  play:      'M6 4v16l14-8Z',
  undo:      'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo:      'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  fit:       'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4',
  x:         'M6 6l12 12M18 6 6 18',
  star:      'M12 3l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 17l-5.6 3.2 1.5-6.3L3 9.6l6.4-.6Z',
  calendar:  (<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>),
  msg:       'M4 5h16v11H8l-4 4Z',
  flag:      'M5 21V4M5 4h13l-2 4 2 4H5',
  pin:       'M12 2v8m0 0-4 4v2h8v-2l-4-4m0 10v-4',
  sparkle:   'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z',
} as const
