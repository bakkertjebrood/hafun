import { getAuthUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { isLevelEnabled } from '../../../utils/marinaSettings'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'PORTAL') throw createError({ statusCode: 403, message: 'Alleen voor huurders' })

  const marina = await prisma.marina.findUniqueOrThrow({
    where: { id: auth.marinaId },
    select: { settings: true }
  })
  if (!isLevelEnabled(marina.settings, 'absence')) {
    throw createError({ statusCode: 403, message: 'Afwezigheidsmelding is niet ingeschakeld' })
  }

  const body = await readBody(event)
  if (!body.berthId || !body.dateFrom || !body.dateTo) {
    throw createError({ statusCode: 400, message: 'berthId, dateFrom en dateTo zijn verplicht' })
  }
  const dateFrom = new Date(body.dateFrom)
  const dateTo = new Date(body.dateTo)
  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime()) || dateTo <= dateFrom) {
    throw createError({ statusCode: 400, message: 'Ongeldige periode' })
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { customer: { select: { id: true } } }
  })
  if (!user?.customer) throw createError({ statusCode: 404, message: 'Geen klantprofiel' })

  // Verify the berth is owned by this customer.
  const berth = await prisma.berth.findFirst({
    where: { id: String(body.berthId), marinaId: auth.marinaId, customerId: user.customer.id }
  })
  if (!berth) throw createError({ statusCode: 403, message: 'Deze ligplaats hoort niet bij jouw account' })

  return prisma.berthAbsence.create({
    data: {
      marinaId: auth.marinaId,
      berthId: berth.id,
      customerId: user.customer.id,
      dateFrom,
      dateTo,
      releaseForRelet: !!body.releaseForRelet,
      note: body.note ? String(body.note) : null,
      status: 'declared'
    }
  })
})
