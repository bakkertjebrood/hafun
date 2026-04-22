import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id is verplicht' })

  const body = await readBody<{ isPassanten: boolean }>(event)
  if (typeof body?.isPassanten !== 'boolean') {
    throw createError({ statusCode: 400, message: 'isPassanten boolean is verplicht' })
  }

  const pier = await prisma.pierLine.findUnique({ where: { id } })
  if (!pier) throw createError({ statusCode: 404, message: 'Steiger niet gevonden' })
  if (pier.marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const res = await prisma.berth.updateMany({
    where: { marinaId: pier.marinaId, pier: pier.name },
    data: { isPassanten: body.isPassanten }
  })

  return { updated: res.count }
})
