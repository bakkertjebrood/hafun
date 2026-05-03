import { requireMarinaPublic } from '../../../utils/marinaContext'

export default defineEventHandler(async (event) => {
  const marina = await requireMarinaPublic(event)
  return {
    name: marina.name,
    slug: marina.slug,
    logoUrl: marina.logoUrl,
    accentColor: marina.accentColor,
    publicBio: marina.publicBio,
    gpsLat: marina.gpsLat,
    gpsLng: marina.gpsLng,
    selfService: {
      passant: { enabled: marina.selfService.passant.enabled, allowBerthPick: marina.selfService.passant.allowBerthPick, requirePayment: marina.selfService.passant.requirePayment },
      absence: { enabled: marina.selfService.absence.enabled },
      waitlist: { enabled: marina.selfService.waitlist.enabled, applicationFee: marina.selfService.waitlist.applicationFee ?? null, requireConsent: marina.selfService.waitlist.requireConsent }
    }
  }
})
