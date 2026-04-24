import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  return prisma.posProduct.findMany({
    where: { marinaId: auth.marinaId, active: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  })
})
