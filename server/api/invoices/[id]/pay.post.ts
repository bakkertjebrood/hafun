import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const invoice = await prisma.invoice.findFirst({
    where: { id, marinaId: auth.marinaId }
  })
  if (!invoice) throw createError({ statusCode: 404, message: 'Factuur niet gevonden' })

  const amount = body.amount || (invoice.total - invoice.paidAmount)
  const method = body.method || 'transfer'

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount,
      method,
      note: body.note || null
    }
  })

  const newPaid = invoice.paidAmount + amount
  const newStatus = newPaid >= invoice.total ? 'paid' : 'partial'

  const updated = await prisma.invoice.update({
    where: { id },
    data: { paidAmount: newPaid, status: newStatus }
  })

  return updated
})
