import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await prisma.boat.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  const updated = await prisma.boat.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      type: body.type ?? existing.type,
      length: body.length !== undefined ? Number(body.length) : existing.length,
      width: body.width !== undefined ? Number(body.width) : existing.width,
      registration: body.registration ?? existing.registration,
      photo: body.photo ?? existing.photo
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Boat', entityId: id, action: 'update' })
  return updated
})
