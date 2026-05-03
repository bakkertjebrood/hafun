import type { H3Event } from 'h3'
import { prisma } from './prisma'
import { getSelfService, isLevelEnabled, type SelfServiceSettings } from './marinaSettings'

export interface MarinaContext {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  accentColor: string | null
  publicBio: string | null
  gpsLat: number | null
  gpsLng: number | null
  stripeConnectAccountId: string | null
  stripeConnectChargesEnabled: boolean
  allowedEmbedOrigins: string[]
  selfService: SelfServiceSettings
}

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  accentColor: true,
  publicBio: true,
  gpsLat: true,
  gpsLng: true,
  stripeConnectAccountId: true,
  stripeConnectChargesEnabled: true,
  allowedEmbedOrigins: true,
  settings: true
} as const

/**
 * Resolve a marina by slug for the public/embed surface. Returns null if the
 * slug is unknown — callers turn that into a 404 to avoid leaking existence.
 */
export async function getMarinaBySlug(slug: string): Promise<MarinaContext | null> {
  const marina = await prisma.marina.findUnique({
    where: { slug },
    select: PUBLIC_FIELDS
  })
  if (!marina) return null
  return {
    id: marina.id,
    name: marina.name,
    slug: marina.slug,
    logoUrl: marina.logoUrl,
    accentColor: marina.accentColor,
    publicBio: marina.publicBio,
    gpsLat: marina.gpsLat,
    gpsLng: marina.gpsLng,
    stripeConnectAccountId: marina.stripeConnectAccountId,
    stripeConnectChargesEnabled: marina.stripeConnectChargesEnabled,
    allowedEmbedOrigins: marina.allowedEmbedOrigins ?? [],
    selfService: getSelfService(marina.settings)
  }
}

/**
 * Resolve marina from a route slug param and require that the given
 * self-service level is enabled. Throws 404 otherwise (no info leak).
 */
export async function requireMarinaWithLevel(
  event: H3Event,
  level: 'passant' | 'absence' | 'waitlist'
): Promise<MarinaContext> {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, message: 'Niet gevonden' })
  const marina = await getMarinaBySlug(slug)
  if (!marina) throw createError({ statusCode: 404, message: 'Niet gevonden' })
  if (!isLevelEnabled({ selfService: marina.selfService }, level)) {
    throw createError({ statusCode: 404, message: 'Niet gevonden' })
  }
  return marina
}

export async function requireMarinaPublic(event: H3Event): Promise<MarinaContext> {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, message: 'Niet gevonden' })
  const marina = await getMarinaBySlug(slug)
  if (!marina) throw createError({ statusCode: 404, message: 'Niet gevonden' })
  return marina
}
