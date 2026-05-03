import { getAuthUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'PORTAL') throw createError({ statusCode: 403, message: 'Alleen voor huurders' })

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { customer: { select: { id: true } } }
  })
  if (!user?.customer) throw createError({ statusCode: 404, message: 'Geen klantprofiel' })

  const absences = await prisma.berthAbsence.findMany({
    where: { marinaId: auth.marinaId, customerId: user.customer.id },
    include: { berth: { select: { code: true, pier: true } } },
    orderBy: { dateFrom: 'desc' }
  })
  return absences
})
