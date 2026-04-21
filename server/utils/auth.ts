import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

interface TokenPayload {
  userId: string
  marinaId: string
  role: string
  email: string
}

export function signToken(payload: TokenPayload): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwtSecret) as TokenPayload
}

export function getTokenFromEvent(event: H3Event): string | null {
  const auth = getHeader(event, 'authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7)
  }
  return getCookie(event, 'nautar-token') || null
}

export function getAuthUser(event: H3Event): TokenPayload | null {
  const token = getTokenFromEvent(event)
  if (!token) return null
  try {
    return verifyToken(token)
  }
  catch {
    return null
  }
}
