import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      boats: true,
      berths: {
        include: {
          boat: { select: { name: true } }
        }
      },
      invoices: {
        orderBy: { date: 'desc' },
        take: 10,
        include: { _count: { select: { payments: true } } }
      }
    }
  })

  if (!customer) {
    throw createError({ statusCode: 404, message: 'Klant niet gevonden' })
  }

  // Get notes for this customer's berths
  const berthIds = customer.berths.map(b => b.id)
  const notes = await prisma.note.findMany({
    where: { berthId: { in: berthIds } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { author: { select: { firstName: true, lastName: true } } }
  })

  return { ...customer, notes }
})
