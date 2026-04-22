import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  // Get recent notes as notifications
  const notes = await prisma.note.findMany({
    where: { marinaId: auth.marinaId },
    include: {
      author: { select: { firstName: true, lastName: true } },
      berth: { select: { code: true, pier: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  // Overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      marinaId: auth.marinaId,
      status: { in: ['open', 'partial'] },
      dueDate: { lt: new Date() }
    },
    include: { customer: { select: { name: true } } },
    orderBy: { dueDate: 'asc' }
  })

  // Today's bookings
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayBookings = await prisma.booking.count({
    where: {
      marinaId: auth.marinaId,
      dateFrom: { gte: today, lt: tomorrow },
      status: { not: 'cancelled' }
    }
  })

  return { notes, overdueInvoices, todayBookings }
})
