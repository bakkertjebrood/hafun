import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  return prisma.tariff.findMany({
    where: { marinaId: auth.marinaId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  })
})
