import { buildGoogleAuthUrl, createOAuthState, getRedirectUri, type OAuthStatePayload } from '../../../utils/oauth'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  if (!config.googleClientId || !config.googleClientSecret) {
    throw createError({ statusCode: 500, message: 'Google login is niet geconfigureerd' })
  }

  const query = getQuery(event)
  const intent = query.intent === 'register' ? 'register' : 'login'
  const marinaName = typeof query.marinaName === 'string' ? query.marinaName.trim().slice(0, 120) : undefined
  const redirect = typeof query.redirect === 'string' ? query.redirect.slice(0, 500) : undefined

  const state = createOAuthState()
  const payload: OAuthStatePayload = { state, marinaName, redirect, intent }

  setCookie(event, 'nautar-oauth-state', JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/'
  })

  const url = buildGoogleAuthUrl({
    clientId: config.googleClientId,
    redirectUri: getRedirectUri(event),
    state
  })

  return sendRedirect(event, url, 302)
})
