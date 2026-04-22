import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id is verplicht' })

  const berth = await prisma.berth.findUnique({ where: { id } })
  if (!berth) throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })
  if (berth.marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.note.deleteMany({ where: { berthId: id } })
    await tx.booking.deleteMany({ where: { berthId: id } })
    await tx.berth.delete({ where: { id } })
  })

  return { deleted: true }
})
