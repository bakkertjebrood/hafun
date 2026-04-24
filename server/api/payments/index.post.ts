import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.invoiceId || !body.amount) {
    throw createError({ statusCode: 400, message: 'Factuur en bedrag verplicht' })
  }

  const invoice = await prisma.invoice.findFirst({ where: { id: body.invoiceId, marinaId: auth.marinaId } })
  if (!invoice) throw createError({ statusCode: 404 })

  const payment = await prisma.payment.create({
    data: {
      marinaId: auth.marinaId,
      invoiceId: invoice.id,
      amount: Number(body.amount),
      method: body.method || 'transfer',
      reference: body.reference || null,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date()
    }
  })

  const paid = invoice.paidAmount + payment.amount
  const newStatus = paid >= invoice.total ? 'paid' : invoice.status
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paidAmount: paid, status: newStatus }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Payment', entityId: payment.id, action: 'create' })
  return payment
})
