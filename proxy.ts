import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, importSPKI } from 'jose'

function normalizePem(raw: string): string {
  return raw.replace(/\\n/g, '\n')
}

async function verifyToken(token: string): Promise<boolean> {
  const publicKeyPem = process.env.JWT_PUBLIC_KEY
    ? normalizePem(process.env.JWT_PUBLIC_KEY)
    : null

  if (publicKeyPem) {
    try {
      const publicKey = await importSPKI(publicKeyPem, 'RS256')
      await jwtVerify(token, publicKey, { algorithms: ['RS256'] })
      return true
    } catch {
      // not a valid RS256 token — try HS256
    }
  }

  const secret = process.env.SESSION_SECRET
  if (secret) {
    try {
      const hs256Secret = new TextEncoder().encode(secret)
      await jwtVerify(token, hs256Secret, { algorithms: ['HS256'] })
      return true
    } catch {
      return false
    }
  }

  return false
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const valid = await verifyToken(token)
  if (!valid) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', request.nextUrl.pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|api/health|api/me|api/csv|api/uploads).*)',
  ],
}
