import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)

  if (!body.customerId || !body.lines?.length) {
    throw createError({ statusCode: 400, message: 'Klant en regels zijn verplicht' })
  }

  // Generate invoice number
  const year = new Date().getFullYear()
  const count = await prisma.invoice.count({
    where: { marinaId: auth.marinaId, number: { startsWith: String(year) } }
  })
  const number = `${year}${String(count + 1).padStart(4, '0')}`

  // Calculate totals
  const lines = body.lines as Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }>
  let totalExcl = 0
  let totalVat = 0

  for (const line of lines) {
    const lineTotal = line.quantity * line.unitPrice
    const vatRate = line.vatRate ?? 21
    totalExcl += lineTotal
    totalVat += lineTotal * (vatRate / 100)
  }

  const total = totalExcl + totalVat
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  const invoice = await prisma.invoice.create({
    data: {
      marinaId: auth.marinaId,
      customerId: body.customerId,
      number,
      date: new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : dueDate,
      total,
      vat: totalVat,
      lines: {
        create: lines.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate ?? 21
        }))
      }
    },
    include: {
      customer: { select: { name: true } },
      lines: true
    }
  })

  return invoice
})
