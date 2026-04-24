import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const query = getQuery(event)
  const status = query.status as string | undefined
  const from = query.from ? new Date(String(query.from)) : null
  const to = query.to ? new Date(String(query.to)) : null
  const method = query.method as string | undefined

  const where: any = { marinaId: auth.marinaId }
  if (status) where.status = status
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = from
    if (to) where.createdAt.lte = to
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      payments: { orderBy: { paidAt: 'desc' } }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  const filtered = method
    ? invoices.filter(i => i.payments.some(p => p.method === method))
    : invoices

  const all = await prisma.invoice.findMany({
    where: { marinaId: auth.marinaId },
    select: { total: true, paidAmount: true, status: true }
  })

  const summary = {
    totalRevenue: all.reduce((s, i) => s + i.paidAmount, 0),
    totalOutstanding: all
      .filter(i => i.status !== 'paid' && i.status !== 'draft')
      .reduce((s, i) => s + (i.total - i.paidAmount), 0),
    draftCount: all.filter(i => i.status === 'draft').length,
    sentCount: all.filter(i => i.status === 'sent').length,
    paidCount: all.filter(i => i.status === 'paid').length,
    overdueCount: all.filter(i => i.status === 'overdue').length
  }

  return { invoices: filtered, summary }
})
