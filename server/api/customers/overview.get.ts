import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const marinaId = auth.marinaId

  const [recentCustomers, editedCustomers, recentBoats, editedBoats, boatsWithoutBerth, guests, editedGuests] = await Promise.all([
    prisma.customer.findMany({
      where: { marinaId },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.customer.findMany({
      where: { marinaId },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    prisma.boat.findMany({
      where: { marinaId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } }, berths: { select: { code: true } } }
    }),
    prisma.boat.findMany({
      where: { marinaId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } }, berths: { select: { code: true } } }
    }),
    prisma.boat.findMany({
      where: { marinaId, berths: { none: {} } },
      orderBy: { name: 'asc' },
      take: 20,
      include: { customer: { select: { name: true } } }
    }),
    prisma.guest.findMany({
      where: { marinaId },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.guest.findMany({
      where: { marinaId },
      orderBy: { updatedAt: 'desc' },
      take: 5
    })
  ])

  return {
    recentCustomers,
    editedCustomers,
    recentBoats,
    editedBoats,
    boatsWithoutBerth,
    recentGuests: guests,
    editedGuests
  }
})
