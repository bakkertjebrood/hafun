import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is verplicht' })
  }

  const body = await readBody(event)
  if (!body.points || !Array.isArray(body.points) || body.points.length < 2) {
    throw createError({ statusCode: 400, message: 'points moet minimaal 2 punten bevatten' })
  }

  const pier = await prisma.pierLine.update({
    where: { id },
    data: {
      points: body.points,
      headPoints: body.headPoints ?? null
    }
  })

  return pier
})
