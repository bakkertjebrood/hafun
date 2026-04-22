import { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Id ontbreekt' })
  if (id === auth.userId) {
    throw createError({ statusCode: 400, message: 'Je kunt jezelf niet verwijderen' })
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.marinaId !== auth.marinaId) {
    throw createError({ statusCode: 404, message: 'Gebruiker niet gevonden' })
  }

  try {
    await prisma.user.delete({ where: { id } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      throw createError({
        statusCode: 409,
        message: 'Deze gebruiker heeft gekoppelde notities of een portaalaccount en kan niet verwijderd worden.'
      })
    }
    throw e
  }

  return { deleted: true }
})
