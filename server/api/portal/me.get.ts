import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'PORTAL') throw createError({ statusCode: 403, message: 'Alleen voor huurders' })

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      customer: {
        include: {
          boats: true,
          berths: true,
          invoices: { orderBy: { createdAt: 'desc' }, take: 20, include: { payments: true } }
        }
      },
      marina: { select: { id: true, name: true } }
    }
  })
  if (!user || !user.customer) throw createError({ statusCode: 404, message: 'Geen klantprofiel gekoppeld' })

  const notes = await prisma.note.findMany({
    where: {
      marinaId: user.marinaId,
      berthId: { in: user.customer.berths.map(b => b.id) }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { author: { select: { firstName: true, lastName: true } } }
  })

  return {
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    marina: user.marina,
    customer: user.customer,
    notes
  }
})
