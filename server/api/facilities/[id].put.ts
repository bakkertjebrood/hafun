import { FacilityType } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

const VALID_TYPES = new Set(Object.values(FacilityType) as string[])

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id is verplicht' })

  const existing = await prisma.facility.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, message: 'Faciliteit niet gevonden' })
  if (existing.marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const body = await readBody(event)
  const data: Record<string, unknown> = {}

  if (body.type !== undefined) {
    if (!VALID_TYPES.has(body.type)) {
      throw createError({ statusCode: 400, message: 'type is ongeldig' })
    }
    data.type = body.type as FacilityType
  }
  if (typeof body.name === 'string') data.name = body.name.trim() || null
  else if (body.name === null) data.name = null
  if (typeof body.description === 'string') data.description = body.description.trim() || null
  else if (body.description === null) data.description = null
  if (typeof body.gpsLat === 'number') data.gpsLat = body.gpsLat
  if (typeof body.gpsLng === 'number') data.gpsLng = body.gpsLng
  if (typeof body.radius === 'number') data.radius = Math.max(0, Math.min(500, body.radius))
  else if (body.radius === null) data.radius = null

  if (!Object.keys(data).length) {
    throw createError({ statusCode: 400, message: 'geen wijzigingen opgegeven' })
  }

  return prisma.facility.update({ where: { id }, data })
})
