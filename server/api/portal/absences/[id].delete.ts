import { getAuthUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'PORTAL') throw createError({ statusCode: 403, message: 'Alleen voor huurders' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id ontbreekt' })

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { customer: { select: { id: true } } }
  })
  if (!user?.customer) throw createError({ statusCode: 404, message: 'Geen klantprofiel' })

  const absence = await prisma.berthAbsence.findFirst({
    where: { id, marinaId: auth.marinaId, customerId: user.customer.id }
  })
  if (!absence) throw createError({ statusCode: 404, message: 'Niet gevonden' })

  // If a re-let booking is already linked, mark cancelled instead of deleting.
  const linked = await prisma.booking.count({ where: { absenceId: id } })
  if (linked > 0) {
    await prisma.berthAbsence.update({ where: { id }, data: { status: 'cancelled' } })
    return { ok: true, cancelled: true }
  }
  await prisma.berthAbsence.delete({ where: { id } })
  return { ok: true }
})
