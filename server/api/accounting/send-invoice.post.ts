import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { moneybirdCreateContact, moneybirdFindContact, moneybirdCreateInvoice, moneybirdSendInvoice } from '../../utils/moneybird'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)

  if (!body.customerId || !body.lines?.length) {
    throw createError({ statusCode: 400, message: 'Klant en factuurregels zijn verplicht' })
  }

  // Get accounting integration
  const integration = await prisma.accountingIntegration.findUnique({
    where: { marinaId: auth.marinaId }
  })

  if (!integration || !integration.active) {
    throw createError({ statusCode: 400, message: 'Geen boekhoudkoppeling geconfigureerd. Ga naar Beheer → Koppelingen.' })
  }

  // Get customer
  const customer = await prisma.customer.findFirst({
    where: { id: body.customerId, marinaId: auth.marinaId }
  })
  if (!customer) throw createError({ statusCode: 404, message: 'Klant niet gevonden' })

  if (integration.provider === 'moneybird') {
    const config = {
      apiToken: integration.apiToken,
      administrationId: integration.administrationId!
    }

    // Find or create contact in Moneybird
    let contact = await moneybirdFindContact(config, customer.email || customer.name)
    if (!contact) {
      contact = await moneybirdCreateContact(config, {
        name: customer.name,
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        address: customer.address || undefined
      })
    }

    // Create invoice in Moneybird
    const mbInvoice = await moneybirdCreateInvoice(config, {
      contactId: contact.id,
      lines: body.lines.map((l: any) => ({
        description: l.description,
        quantity: l.quantity || 1,
        unitPrice: l.unitPrice,
        vatRate: String(l.vatRate || 21)
      })),
      reference: body.reference || ''
    })

    // Send invoice via email if requested
    if (body.sendEmail !== false && customer.email) {
      try {
        await moneybirdSendInvoice(config, mbInvoice.id, 'email')
      }
      catch {
        // Non-fatal: invoice created but not sent
      }
    }

    // Save reference in Nautar
    const total = body.lines.reduce((s: number, l: any) => s + (l.quantity || 1) * l.unitPrice * (1 + (l.vatRate || 21) / 100), 0)

    const invoice = await prisma.invoice.create({
      data: {
        marinaId: auth.marinaId,
        customerId: customer.id,
        externalId: String(mbInvoice.id),
        externalUrl: mbInvoice.url || `https://moneybird.com/${integration.administrationId}/sales_invoices/${mbInvoice.id}`,
        number: mbInvoice.invoice_id || null,
        description: body.description || body.lines[0]?.description || '',
        total,
        status: body.sendEmail !== false ? 'sent' : 'draft',
        syncedAt: new Date()
      }
    })

    return {
      id: invoice.id,
      externalId: invoice.externalId,
      externalUrl: invoice.externalUrl,
      number: invoice.number,
      total: invoice.total,
      status: invoice.status
    }
  }

  throw createError({ statusCode: 400, message: `Provider "${integration.provider}" wordt nog niet ondersteund` })
})
