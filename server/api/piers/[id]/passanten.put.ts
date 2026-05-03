import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

const ALLOWED_TYPES = ['JAARPLAATS', 'SEIZOEN', 'WINTERSTALLING', 'PASSANT', 'WERKPLEK'] as const
type AllowedType = typeof ALLOWED_TYPES[number]

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id is verplicht' })

  const body = await readBody<{ type: AllowedType }>(event)
  if (!body?.type || !ALLOWED_TYPES.includes(body.type)) {
    throw createError({ statusCode: 400, message: 'type is verplicht (JAARPLAATS, SEIZOEN, WINTERSTALLING, PASSANT of WERKPLEK)' })
  }

  const pier = await prisma.pierLine.findUnique({ where: { id } })
  if (!pier) throw createError({ statusCode: 404, message: 'Steiger niet gevonden' })
  if (pier.marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const res = await prisma.berth.updateMany({
    where: { marinaId: pier.marinaId, pier: pier.name },
    data: { type: body.type }
  })

  return { updated: res.count }
})
