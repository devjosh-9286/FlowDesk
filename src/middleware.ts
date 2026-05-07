import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // /master/* — session required; full SUPERADMIN role check happens in layout
  if (pathname.startsWith('/master')) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/master/:path*'],
}
