import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is verplicht' })
  }

  const body = await readBody(event)

  const data: Record<string, unknown> = {}

  if (Array.isArray(body.points)) {
    if (body.points.length < 2) {
      throw createError({ statusCode: 400, message: 'points moet minimaal 2 punten bevatten' })
    }
    data.points = body.points
  }
  if (body.headPoints !== undefined) {
    data.headPoints = body.headPoints ?? null
  }
  if (typeof body.berthOffset === 'number') {
    data.berthOffset = Math.max(0, Math.min(20, body.berthOffset))
  }
  if (typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim()
  }

  if (!Object.keys(data).length) {
    throw createError({ statusCode: 400, message: 'geen wijzigingen opgegeven' })
  }

  const pier = await prisma.pierLine.update({
    where: { id },
    data
  })

  return pier
})
