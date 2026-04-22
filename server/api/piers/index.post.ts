import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.marinaId || !body.name || !body.points?.length) {
    throw createError({ statusCode: 400, message: 'marinaId, name en points zijn verplicht' })
  }

  const offset = typeof body.berthOffset === 'number' ? body.berthOffset : undefined

  // Upsert: update if pier with same name exists
  const pier = await prisma.pierLine.upsert({
    where: {
      marinaId_name: { marinaId: body.marinaId, name: body.name }
    },
    update: {
      points: body.points,
      headPoints: body.headPoints || null,
      ...(offset !== undefined && { berthOffset: offset })
    },
    create: {
      marinaId: body.marinaId,
      name: body.name,
      points: body.points,
      headPoints: body.headPoints || null,
      ...(offset !== undefined && { berthOffset: offset })
    }
  })

  return pier
})
