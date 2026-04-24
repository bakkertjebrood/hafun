import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

function computeTotal(lines: any[]): number {
  return lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 + (Number(l.vatRate) || 0) / 100), 0)
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await prisma.quote.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  const lines = Array.isArray(body.lines) ? body.lines : (existing.lines as any)
  const total = Math.round(computeTotal(lines) * 100) / 100

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      customerId: body.customerId ?? existing.customerId,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      lines,
      total,
      status: body.status ?? existing.status,
      validUntil: body.validUntil ? new Date(body.validUntil) : existing.validUntil
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Quote', entityId: id, action: 'update' })
  return updated
})
