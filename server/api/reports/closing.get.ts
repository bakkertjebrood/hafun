import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const q = getQuery(event)
  const date = q.date ? new Date(String(q.date)) : new Date()
  const start = new Date(date); start.setHours(0, 0, 0, 0)
  const end = new Date(date); end.setHours(23, 59, 59, 999)

  const [payments, posTransactions, bookings, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { marinaId: auth.marinaId, paidAt: { gte: start, lte: end } },
      include: { invoice: { select: { number: true, customerId: true } } }
    }),
    prisma.posTransaction.findMany({
      where: { marinaId: auth.marinaId, createdAt: { gte: start, lte: end } }
    }),
    prisma.booking.findMany({
      where: {
        marinaId: auth.marinaId,
        OR: [
          { dateFrom: { gte: start, lte: end } },
          { dateTo: { gte: start, lte: end } }
        ]
      },
      include: { berth: { select: { code: true } }, guest: true, customer: { select: { name: true } } }
    }),
    prisma.invoice.findMany({
      where: { marinaId: auth.marinaId, createdAt: { gte: start, lte: end } },
      select: { id: true, number: true, total: true, status: true }
    })
  ])

  const paymentsByMethod: Record<string, { count: number; total: number }> = {}
  for (const p of payments) {
    paymentsByMethod[p.method] ||= { count: 0, total: 0 }
    paymentsByMethod[p.method].count++
    paymentsByMethod[p.method].total += p.amount
  }

  const posByMethod: Record<string, { count: number; total: number }> = {}
  for (const t of posTransactions) {
    posByMethod[t.method] ||= { count: 0, total: 0 }
    posByMethod[t.method].count++
    posByMethod[t.method].total += t.total
  }

  const arrivals = bookings.filter(b => {
    const s = new Date(b.dateFrom)
    return s >= start && s <= end
  })
  const departures = bookings.filter(b => {
    if (!b.dateTo) return false
    const e = new Date(b.dateTo)
    return e >= start && e <= end
  })

  return {
    date: start.toISOString(),
    payments: {
      total: payments.reduce((s, p) => s + p.amount, 0),
      byMethod: paymentsByMethod,
      list: payments
    },
    pos: {
      total: posTransactions.reduce((s, t) => s + t.total, 0),
      count: posTransactions.length,
      byMethod: posByMethod
    },
    arrivals,
    departures,
    invoicesCreated: invoices
  }
})
