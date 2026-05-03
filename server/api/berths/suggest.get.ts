import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const query = getQuery(event)
  const boatLength = parseFloat(query.boatLength as string) || 0
  const dateFrom = query.dateFrom as string
  const dateTo = query.dateTo as string

  // Find free berths that fit the boat
  const where: any = {
    marinaId: auth.marinaId,
    status: 'FREE',
    length: { gte: boatLength > 0 ? boatLength : 0 }
  }

  // Suggest passanten berths first, regular afterwards
  const passantenBerths = await prisma.berth.findMany({
    where: { ...where, type: 'PASSANT' },
    select: { id: true, code: true, pier: true, length: true, width: true, type: true },
    orderBy: [{ length: 'asc' }, { code: 'asc' }],
    take: 5
  })

  const regularBerths = await prisma.berth.findMany({
    where: { ...where, type: { not: 'PASSANT' } },
    select: { id: true, code: true, pier: true, length: true, width: true, type: true },
    orderBy: [{ length: 'asc' }, { code: 'asc' }],
    take: 10
  })

  const suggestions = [...passantenBerths, ...regularBerths].slice(0, 10)

  return {
    suggestions,
    total: suggestions.length,
    passantenCount: passantenBerths.length
  }
})
