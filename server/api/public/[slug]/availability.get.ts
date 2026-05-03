import { requireMarinaWithLevel } from '../../../utils/marinaContext'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const marina = await requireMarinaWithLevel(event, 'passant')
  if (!marina.selfService.passant.allowBerthPick) {
    return { berths: [] }
  }

  const query = getQuery(event)
  const dateFrom = query.dateFrom ? new Date(String(query.dateFrom)) : null
  const dateTo = query.dateTo ? new Date(String(query.dateTo)) : null
  if (!dateFrom || !dateTo || isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
    throw createError({ statusCode: 400, message: 'dateFrom en dateTo zijn verplicht' })
  }
  if (dateTo <= dateFrom) {
    throw createError({ statusCode: 400, message: 'dateTo moet na dateFrom liggen' })
  }

  const [berths, overlaps, absences] = await Promise.all([
    prisma.berth.findMany({
      where: { marinaId: marina.id, type: 'PASSANT' },
      select: { id: true, code: true, pier: true, length: true, width: true }
    }),
    prisma.booking.findMany({
      where: {
        marinaId: marina.id,
        status: { not: 'cancelled' },
        dateFrom: { lt: dateTo },
        dateTo: { gt: dateFrom }
      },
      select: { berthId: true }
    }),
    prisma.berthAbsence.findMany({
      where: {
        marinaId: marina.id,
        releaseForRelet: true,
        status: { not: 'cancelled' },
        dateFrom: { lte: dateFrom },
        dateTo: { gte: dateTo }
      },
      select: { berthId: true }
    })
  ])

  const occupied = new Set(overlaps.map(b => b.berthId))
  const reletable = new Set(absences.map(a => a.berthId))

  // PASSANT-berths that are free in the window. Re-lettable absences from
  // vaste-liggers expand the available pool — included only if the berth
  // is also free of bookings in this exact window.
  const free = berths.filter(b => !occupied.has(b.id))
  const releted = berths.filter(b => reletable.has(b.id) && !occupied.has(b.id))

  return {
    berths: [...free, ...releted].map(b => ({
      id: b.id,
      code: b.code,
      pier: b.pier,
      length: b.length,
      width: b.width,
      reletFromAbsence: reletable.has(b.id)
    }))
  }
})
