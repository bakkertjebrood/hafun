import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const invoice = await prisma.invoice.findFirst({
    where: { id, marinaId: auth.marinaId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { paidAt: 'desc' } }
    }
  })
  if (!invoice) throw createError({ statusCode: 404 })
  return invoice
})
