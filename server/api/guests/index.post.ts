import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Naam is verplicht' })
  }

  const guest = await prisma.guest.create({
    data: {
      marinaId: auth.marinaId,
      name: body.name,
      boatName: body.boatName || null,
      boatLength: body.boatLength ? parseFloat(body.boatLength) : null,
      arrival: new Date(body.arrival || Date.now()),
      departure: body.departure ? new Date(body.departure) : null,
      persons: body.persons || 1
    }
  })

  return guest
})
