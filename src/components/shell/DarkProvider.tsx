'use client'
import { createContext, useContext, useState } from 'react'

interface DarkCtx { dark: boolean; setDark: (v: boolean) => void }
const DarkCtx = createContext<DarkCtx>({ dark: false, setDark: () => {} })
export const useDark = () => useContext(DarkCtx)

export function DarkProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  return <DarkCtx.Provider value={{ dark, setDark }}>{children}</DarkCtx.Provider>
}
