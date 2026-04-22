import { FacilityType } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

const VALID_TYPES = new Set(Object.values(FacilityType) as string[])

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  const marinaId = (body.marinaId as string) || auth.marinaId

  if (marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  if (!body.type || !VALID_TYPES.has(body.type)) {
    throw createError({ statusCode: 400, message: 'type is ongeldig' })
  }
  if (typeof body.gpsLat !== 'number' || typeof body.gpsLng !== 'number') {
    throw createError({ statusCode: 400, message: 'gpsLat en gpsLng zijn verplicht' })
  }

  return prisma.facility.create({
    data: {
      marinaId,
      type: body.type as FacilityType,
      name: typeof body.name === 'string' ? body.name.trim() || null : null,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      gpsLat: body.gpsLat,
      gpsLng: body.gpsLng,
      radius: typeof body.radius === 'number' ? Math.max(0, Math.min(500, body.radius)) : null
    }
  })
})
