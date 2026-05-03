import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export interface OAuthStatePayload {
  state: string
  marinaName?: string
  redirect?: string
  intent: 'login' | 'register'
}

export interface GoogleProfile {
  sub: string
  email: string
  email_verified?: boolean
  given_name?: string
  family_name?: string
  name?: string
  picture?: string
  hd?: string
}

export function createOAuthState(): string {
  return randomBytes(24).toString('base64url')
}

export function getRedirectUri(event: H3Event): string {
  const config = useRuntimeConfig()
  if (config.appUrl) {
    return `${config.appUrl.replace(/\/$/, '')}/api/auth/google/callback`
  }
  // Fall back to host header. Heroku sets x-forwarded-proto to https.
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  const host = getRequestHeader(event, 'host')
  return `${proto}://${host}/api/auth/google/callback`
}

export function buildGoogleAuthUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  loginHint?: string
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state: opts.state
  })
  if (opts.loginHint) params.set('login_hint', opts.loginHint)
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeGoogleCode(opts: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<{ access_token: string, id_token?: string }> {
  return await $fetch<{ access_token: string, id_token?: string }>(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      code: opts.code,
      grant_type: 'authorization_code',
      redirect_uri: opts.redirectUri
    }).toString()
  })
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  return await $fetch<GoogleProfile>(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
