import PDFDocument from 'pdfkit'
import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')

  const invoice = await prisma.invoice.findFirst({
    where: { id, marinaId: auth.marinaId },
    include: {
      customer: true,
      lines: true,
      payments: { orderBy: { date: 'desc' } },
      marina: { select: { name: true, settings: true } }
    }
  })

  if (!invoice) throw createError({ statusCode: 404, message: 'Factuur niet gevonden' })

  const settings = (invoice.marina.settings || {}) as Record<string, any>

  // Generate PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []

  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text(invoice.marina.name, 50, 50)
  doc.fontSize(10).font('Helvetica').fillColor('#666')
  if (settings.address) doc.text(settings.address, 50, 78)
  if (settings.email) doc.text(settings.email, 50, 92)

  // Invoice details
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('FACTUUR', 350, 50)
  doc.fontSize(10).font('Helvetica').fillColor('#333')
  doc.text(`Factuurnummer: ${invoice.number}`, 350, 78)
  doc.text(`Datum: ${invoice.date.toLocaleDateString('nl-NL')}`, 350, 92)
  doc.text(`Vervaldatum: ${invoice.dueDate.toLocaleDateString('nl-NL')}`, 350, 106)

  // Customer
  doc.moveDown(3)
  const yCustomer = 150
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Aan:', 50, yCustomer)
  doc.font('Helvetica').text(invoice.customer?.name || 'Onbekend', 50, yCustomer + 16)
  if (invoice.customer?.email) doc.text(invoice.customer.email, 50, yCustomer + 30)
  if (invoice.customer?.address) doc.text(invoice.customer.address, 50, yCustomer + 44)

  // Lines table
  const tableTop = 230
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#666')
  doc.text('OMSCHRIJVING', 50, tableTop)
  doc.text('AANTAL', 320, tableTop, { width: 50, align: 'right' })
  doc.text('PRIJS', 380, tableTop, { width: 70, align: 'right' })
  doc.text('BTW', 455, tableTop, { width: 30, align: 'right' })
  doc.text('TOTAAL', 490, tableTop, { width: 60, align: 'right' })

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#ddd').stroke()

  let y = tableTop + 25
  doc.font('Helvetica').fontSize(10).fillColor('#000')

  for (const line of invoice.lines) {
    const lineTotal = line.quantity * line.unitPrice
    doc.text(line.description, 50, y, { width: 260 })
    doc.text(String(line.quantity), 320, y, { width: 50, align: 'right' })
    doc.text(`€ ${line.unitPrice.toFixed(2)}`, 380, y, { width: 70, align: 'right' })
    doc.text(`${line.vatRate}%`, 455, y, { width: 30, align: 'right' })
    doc.text(`€ ${lineTotal.toFixed(2)}`, 490, y, { width: 60, align: 'right' })
    y += 20
  }

  // Totals
  y += 10
  doc.moveTo(380, y).lineTo(550, y).strokeColor('#ddd').stroke()
  y += 10

  const subtotal = invoice.total - invoice.vat
  doc.fontSize(10).fillColor('#666')
  doc.text('Subtotaal', 380, y, { width: 100, align: 'right' })
  doc.text(`€ ${subtotal.toFixed(2)}`, 490, y, { width: 60, align: 'right' })
  y += 18
  doc.text('BTW', 380, y, { width: 100, align: 'right' })
  doc.text(`€ ${invoice.vat.toFixed(2)}`, 490, y, { width: 60, align: 'right' })
  y += 18
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
  doc.text('Totaal', 380, y, { width: 100, align: 'right' })
  doc.text(`€ ${invoice.total.toFixed(2)}`, 490, y, { width: 60, align: 'right' })

  // Payment status
  if (invoice.paidAmount > 0) {
    y += 25
    doc.fontSize(10).font('Helvetica').fillColor('#10B981')
    doc.text(`Betaald: € ${invoice.paidAmount.toFixed(2)}`, 380, y, { width: 170, align: 'right' })
    if (invoice.total - invoice.paidAmount > 0) {
      y += 16
      doc.fillColor('#EF4444')
      doc.text(`Openstaand: € ${(invoice.total - invoice.paidAmount).toFixed(2)}`, 380, y, { width: 170, align: 'right' })
    }
  }

  // Footer
  doc.fontSize(8).font('Helvetica').fillColor('#999')
  doc.text(`Gegenereerd door Nautar · ${invoice.marina.name}`, 50, 760, { align: 'center' })

  doc.end()

  // Wait for PDF to finish
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="factuur-${invoice.number}.pdf"`,
    'Content-Length': String(pdfBuffer.length)
  })

  return pdfBuffer
})
