import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id is verplicht' })

  const query = getQuery(event)
  const cascade = query.cascade === '1' || query.cascade === 'true'

  const pier = await prisma.pierLine.findUnique({ where: { id } })
  if (!pier) throw createError({ statusCode: 404, message: 'Steiger niet gevonden' })
  if (pier.marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const berthCount = await prisma.berth.count({
    where: { marinaId: pier.marinaId, pier: pier.name }
  })

  if (berthCount > 0 && !cascade) {
    throw createError({
      statusCode: 409,
      message: `Deze steiger heeft ${berthCount} ligplaats${berthCount === 1 ? '' : 'en'}. Verwijder die eerst of gebruik cascade.`
    })
  }

  await prisma.$transaction(async (tx) => {
    if (cascade && berthCount > 0) {
      await tx.berth.deleteMany({ where: { marinaId: pier.marinaId, pier: pier.name } })
    }
    await tx.pierLine.delete({ where: { id } })
  })

  return { deleted: true, berthsDeleted: cascade ? berthCount : 0 }
})
