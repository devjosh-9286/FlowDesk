// Design tokens — ported from shell.jsx fdTokens
// Primary: violet #7C3AED · Teal #14B8A6 · Typography: Inter + JetBrains Mono

export interface Tokens {
  bg: string
  surface: string
  surface2: string
  surface3: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textSubtle: string
  accent: string
  accentSoft: string
  accentBorder: string
  teal: string
  tealSoft: string
  amber: string
  amberSoft: string
  red: string
  redSoft: string
  green: string
  greenSoft: string
  blue: string
  blueSoft: string
  shadow: string
  shadowLg: string
}

export const lightTokens: Tokens = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surface2: '#F5F5F7',
  surface3: '#EDEDF0',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  text: '#18181B',
  textMuted: '#71717A',
  textSubtle: '#A1A1AA',
  accent: '#7C3AED',
  accentSoft: '#F3EEFE',
  accentBorder: '#DDD1FB',
  teal: '#14B8A6',
  tealSoft: '#E6F7F4',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  red: '#DC2626',
  redSoft: '#FEE2E2',
  green: '#16A34A',
  greenSoft: '#DCFCE7',
  blue: '#2563EB',
  blueSoft: '#DBEAFE',
  shadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)',
  shadowLg: '0 10px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
}

export const darkTokens: Tokens = {
  bg: '#0B0B0F',
  surface: '#121217',
  surface2: '#17171D',
  surface3: '#1F1F27',
  border: '#26262E',
  borderStrong: '#35353F',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  textSubtle: '#71717A',
  accent: '#A78BFA',
  accentSoft: '#2A1F4A',
  accentBorder: '#3F2F6A',
  teal: '#2DD4BF',
  tealSoft: '#0F2A2A',
  amber: '#FBBF24',
  amberSoft: '#3A2A10',
  red: '#F87171',
  redSoft: '#3A1818',
  green: '#4ADE80',
  greenSoft: '#132A1A',
  blue: '#60A5FA',
  blueSoft: '#152238',
  shadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 1px rgba(0,0,0,0.2)',
  shadowLg: '0 10px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
}

export const getTokens = (dark: boolean): Tokens => dark ? darkTokens : lightTokens
