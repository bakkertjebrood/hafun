import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const marinaId = query.marinaId as string
  const search = (query.search as string || '').trim()

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const where: any = { marinaId }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { boats: { some: { name: { contains: search, mode: 'insensitive' } } } }
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      boats: { select: { id: true, name: true, type: true, length: true } },
      berths: { select: { id: true, code: true, status: true } },
      _count: { select: { invoices: true } }
    },
    orderBy: { name: 'asc' }
  })

  return customers
})
