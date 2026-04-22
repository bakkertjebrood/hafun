import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const marina = await prisma.marina.findUnique({
    where: { id: auth.marinaId },
    select: {
      id: true,
      name: true,
      slug: true,
      gpsLat: true,
      gpsLng: true,
      setupComplete: true
    }
  })

  if (!marina) throw createError({ statusCode: 404, message: 'Haven niet gevonden' })

  return marina
})
