import { getAuthUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  return prisma.berthAbsence.findMany({
    where: { marinaId: auth.marinaId },
    include: {
      berth: { select: { code: true, pier: true } },
      customer: { select: { name: true } }
    },
    orderBy: { dateFrom: 'desc' }
  })
})
