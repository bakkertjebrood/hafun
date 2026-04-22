import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const berth = await prisma.berth.findUnique({ where: { id } })
  if (!berth) {
    throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })
  }

  const side = body.side
  const validSide = side === null || side === 'LEFT' || side === 'RIGHT' || side === 'HEAD'

  const updated = await prisma.berth.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.customerId !== undefined && { customerId: body.customerId || null }),
      ...(body.boatId !== undefined && { boatId: body.boatId || null }),
      ...(body.gpsLat !== undefined && { gpsLat: body.gpsLat }),
      ...(body.gpsLng !== undefined && { gpsLng: body.gpsLng }),
      ...(body.side !== undefined && validSide && { side: side || null }),
      ...(typeof body.isPassanten === 'boolean' && { isPassanten: body.isPassanten }),
      ...(typeof body.length === 'number' && { length: body.length }),
      ...(typeof body.width === 'number' && { width: body.width })
    },
    include: {
      customer: { select: { id: true, name: true } },
      boat: { select: { id: true, name: true, length: true } }
    }
  })

  return updated
})
