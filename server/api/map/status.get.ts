import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const marinaId = query.marinaId as string

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const marina = await prisma.marina.findUnique({
    where: { id: marinaId },
    select: { id: true, name: true, gpsLat: true, gpsLng: true }
  })

  const berths = await prisma.berth.findMany({
    where: { marinaId },
    select: {
      id: true,
      code: true,
      pier: true,
      length: true,
      width: true,
      status: true,
      gpsLat: true,
      gpsLng: true,
      customer: { select: { name: true } },
      boat: { select: { name: true } }
    },
    orderBy: [{ pier: 'asc' }, { code: 'asc' }]
  })

  const counts = {
    FREE: 0,
    OCCUPIED: 0,
    SEASONAL: 0,
    STORAGE: 0,
    TEMPORARY: 0,
    EMPTY: 0,
    RELOCATED: 0
  }

  for (const b of berths) {
    counts[b.status as keyof typeof counts]++
  }

  return { marina, berths, counts }
})
