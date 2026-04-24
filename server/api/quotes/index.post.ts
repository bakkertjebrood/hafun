import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

function computeTotal(lines: any[]): number {
  return lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 + (Number(l.vatRate) || 0) / 100), 0)
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.title) throw createError({ statusCode: 400, message: 'Titel verplicht' })

  const lines = Array.isArray(body.lines) ? body.lines : []
  const total = Math.round(computeTotal(lines) * 100) / 100

  const year = new Date().getFullYear()
  const count = await prisma.quote.count({ where: { marinaId: auth.marinaId } })
  const number = `OFF-${year}-${String(count + 1).padStart(4, '0')}`

  const quote = await prisma.quote.create({
    data: {
      marinaId: auth.marinaId,
      customerId: body.customerId || null,
      number,
      title: body.title,
      description: body.description || null,
      lines,
      total,
      status: body.status || 'draft',
      validUntil: body.validUntil ? new Date(body.validUntil) : null
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Quote', entityId: quote.id, action: 'create' })
  return quote
})
