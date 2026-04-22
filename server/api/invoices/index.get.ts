import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const query = getQuery(event)
  const status = query.status as string | undefined

  const where: any = { marinaId: auth.marinaId }
  if (status) where.status = status

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      lines: true,
      payments: { orderBy: { date: 'desc' } },
      _count: { select: { payments: true } }
    },
    orderBy: { date: 'desc' },
    take: 100
  })

  // Summary stats
  const allInvoices = await prisma.invoice.findMany({
    where: { marinaId: auth.marinaId },
    select: { total: true, paidAmount: true, status: true, vat: true }
  })

  const summary = {
    totalRevenue: allInvoices.reduce((s, i) => s + i.paidAmount, 0),
    totalOutstanding: allInvoices.filter(i => i.status === 'open' || i.status === 'partial').reduce((s, i) => s + (i.total - i.paidAmount), 0),
    totalVat: allInvoices.reduce((s, i) => s + i.vat, 0),
    openCount: allInvoices.filter(i => i.status === 'open').length,
    paidCount: allInvoices.filter(i => i.status === 'paid').length
  }

  return { invoices, summary }
})
