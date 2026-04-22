import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const booking = await prisma.booking.findFirst({
    where: { id, marinaId: auth.marinaId }
  })
  if (!booking) throw createError({ statusCode: 404, message: 'Boeking niet gevonden' })

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.dateFrom && { dateFrom: new Date(body.dateFrom) }),
      ...(body.dateTo && { dateTo: new Date(body.dateTo) }),
      ...(body.persons && { persons: body.persons })
    },
    include: {
      berth: { select: { code: true } },
      customer: { select: { name: true } },
      guest: { select: { name: true } }
    }
  })

  return updated
})
