import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  const marinaId = (body.marinaId as string) || auth.marinaId

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'name is verplicht' })
  }
  if (marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const hasPoints = Array.isArray(body.points) && body.points.length >= 2
  const offset = typeof body.berthOffset === 'number' ? body.berthOffset : undefined

  const updateData: Prisma.PierLineUpdateInput = {}
  if (hasPoints) updateData.points = body.points
  if (body.headPoints !== undefined) updateData.headPoints = body.headPoints ?? Prisma.JsonNull
  if (offset !== undefined) updateData.berthOffset = offset

  const createData: Prisma.PierLineUncheckedCreateInput = {
    marinaId,
    name: body.name,
    points: hasPoints ? body.points : [],
    headPoints: body.headPoints ?? Prisma.JsonNull
  }
  if (offset !== undefined) createData.berthOffset = offset

  const pier = await prisma.pierLine.upsert({
    where: { marinaId_name: { marinaId, name: body.name } },
    update: updateData,
    create: createData
  })

  return pier
})
