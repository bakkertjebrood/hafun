import { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { signToken } from '../../../utils/auth'
import { sendEmail, welcomeEmail } from '../../../utils/email'
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getRedirectUri,
  type OAuthStatePayload
} from '../../../utils/oauth'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueMarinaSlug(base: string): Promise<string> {
  const root = base || 'haven'
  let candidate = root
  let i = 2
  while (await prisma.marina.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${i++}`
    if (i > 50) {
      candidate = `${root}-${Math.random().toString(36).slice(2, 7)}`
      break
    }
  }
  return candidate
}

function authErrorRedirect(event: import('h3').H3Event, intent: 'login' | 'register', message: string): Promise<void> {
  const target = intent === 'register' ? '/register' : '/login'
  const url = `${target}?error=${encodeURIComponent(message)}`
  return sendRedirect(event, url, 302)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.googleClientId || !config.googleClientSecret) {
    throw createError({ statusCode: 500, message: 'Google login is niet geconfigureerd' })
  }

  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const returnedState = typeof query.state === 'string' ? query.state : ''
  const oauthError = typeof query.error === 'string' ? query.error : ''

  const stateCookie = getCookie(event, 'nautar-oauth-state')
  deleteCookie(event, 'nautar-oauth-state', { path: '/' })

  let statePayload: OAuthStatePayload | null = null
  if (stateCookie) {
    try {
      statePayload = JSON.parse(stateCookie) as OAuthStatePayload
    } catch {
      statePayload = null
    }
  }
  const intent: 'login' | 'register' = statePayload?.intent === 'register' ? 'register' : 'login'

  if (oauthError) {
    return authErrorRedirect(event, intent, 'Google login geannuleerd')
  }
  if (!code || !returnedState) {
    return authErrorRedirect(event, intent, 'Ongeldige Google response')
  }
  if (!statePayload || statePayload.state !== returnedState) {
    return authErrorRedirect(event, intent, 'Sessie verlopen, probeer opnieuw')
  }

  let profile
  try {
    const tokens = await exchangeGoogleCode({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      code,
      redirectUri: getRedirectUri(event)
    })
    profile = await fetchGoogleProfile(tokens.access_token)
  } catch (err) {
    console.error('[google-oauth] token exchange failed:', err)
    return authErrorRedirect(event, intent, 'Google login mislukt')
  }

  const email = profile.email?.trim().toLowerCase()
  if (!email || profile.email_verified === false) {
    return authErrorRedirect(event, intent, 'Google e-mail niet geverifieerd')
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: { marina: true }
  })

  if (user) {
    // Existing user — link the Google id if missing and log them in.
    if (!user.googleId) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.sub,
            avatar: user.avatar ?? profile.picture ?? null,
            firstName: user.firstName ?? profile.given_name ?? null,
            lastName: user.lastName ?? profile.family_name ?? null
          },
          include: { marina: true }
        })
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // googleId already linked to another account — rare, ignore link
        } else {
          console.error('[google-oauth] link existing user failed:', err)
        }
      }
    }
  } else {
    // No user yet — registration flow. Need a marina.
    const marinaName = statePayload.marinaName?.trim()
    if (!marinaName) {
      return authErrorRedirect(event, 'register', 'Vul eerst de naam van je haven in om te registreren')
    }

    try {
      const slug = await uniqueMarinaSlug(slugify(marinaName))
      const marina = await prisma.marina.create({ data: { name: marinaName, slug } })

      user = await prisma.user.create({
        data: {
          email,
          googleId: profile.sub,
          avatar: profile.picture ?? null,
          firstName: profile.given_name ?? null,
          lastName: profile.family_name ?? null,
          role: 'HARBORMASTER',
          marinaId: marina.id
        },
        include: { marina: true }
      })

      // Fire-and-forget welcome mail.
      const tpl = welcomeEmail(user.firstName ?? '', marina.name)
      sendEmail({ to: email, subject: tpl.subject, html: tpl.html }).catch(() => {})
    } catch (err) {
      console.error('[google-oauth] register failed:', err)
      return authErrorRedirect(event, 'register', 'Account kon niet worden aangemaakt')
    }
  }

  const token = signToken({
    userId: user.id,
    marinaId: user.marinaId,
    role: user.role,
    email: user.email
  })

  setCookie(event, 'nautar-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  const redirect = statePayload.redirect && statePayload.redirect.startsWith('/')
    ? statePayload.redirect
    : (user.role === 'PORTAL' ? '/portal' : '/dashboard')

  return sendRedirect(event, redirect, 302)
})
