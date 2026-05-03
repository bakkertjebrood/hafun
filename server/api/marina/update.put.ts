import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const body = await readBody(event)

  const updated = await prisma.marina.update({
    where: { id: auth.marinaId },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.settings && { settings: body.settings }),
      ...(body.gpsLat !== undefined && { gpsLat: body.gpsLat }),
      ...(body.gpsLng !== undefined && { gpsLng: body.gpsLng }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
      ...(body.publicBio !== undefined && { publicBio: body.publicBio }),
      ...(body.allowedEmbedOrigins !== undefined && {
        allowedEmbedOrigins: Array.isArray(body.allowedEmbedOrigins)
          ? body.allowedEmbedOrigins.filter((o: unknown) => typeof o === 'string')
          : []
      }),
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl })
    }
  })

  return updated
})
