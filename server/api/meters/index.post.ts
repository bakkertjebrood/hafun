import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.type || body.value === undefined) throw createError({ statusCode: 400, message: 'Type en waarde verplicht' })

  const reading = await prisma.meterReading.create({
    data: {
      marinaId: auth.marinaId,
      berthId: body.berthId || null,
      customerId: body.customerId || null,
      type: body.type,
      value: Number(body.value),
      readAt: body.readAt ? new Date(body.readAt) : new Date(),
      note: body.note || null,
      authorId: auth.userId
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'MeterReading', entityId: reading.id, action: 'create' })
  return reading
})
