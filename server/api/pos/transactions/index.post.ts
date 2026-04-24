import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  const lines = Array.isArray(body.lines) ? body.lines : []
  if (!lines.length) throw createError({ statusCode: 400, message: 'Geen regels' })

  let subtotal = 0
  let vatAmount = 0
  for (const l of lines) {
    const qty = Number(l.quantity) || 0
    const up = Number(l.unitPrice) || 0
    const vat = Number(l.vatRate) || 0
    const line = qty * up
    subtotal += line
    vatAmount += line * (vat / 100)
  }
  const total = subtotal + vatAmount

  const tx = await prisma.posTransaction.create({
    data: {
      marinaId: auth.marinaId,
      cashierId: auth.userId,
      customerId: body.customerId || null,
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      method: body.method || 'cash',
      note: body.note || null
    }
  })

  // Verlaag voorraad waar mogelijk
  for (const l of lines) {
    if (l.productId) {
      const p = await prisma.posProduct.findUnique({ where: { id: l.productId } })
      if (p && p.stock !== null && p.stock !== undefined) {
        await prisma.posProduct.update({
          where: { id: l.productId },
          data: { stock: Math.max(0, p.stock - (Number(l.quantity) || 0)) }
        })
      }
    }
  }

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'PosTransaction', entityId: tx.id, action: 'create' })
  return tx
})
