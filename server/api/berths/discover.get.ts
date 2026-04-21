import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const marina = await prisma.marina.findFirst({
    select: { id: true, name: true, slug: true, gpsLat: true, gpsLng: true }
  })

  if (!marina) {
    throw createError({ statusCode: 404, message: 'Geen haven gevonden' })
  }

  return { marinaId: marina.id, marina }
})
