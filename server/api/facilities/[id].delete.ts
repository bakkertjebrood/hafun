import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

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

  await prisma.facility.delete({ where: { id } })
  return { deleted: true }
})
