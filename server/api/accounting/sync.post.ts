import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { moneybirdGetInvoice } from '../../utils/moneybird'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const integration = await prisma.accountingIntegration.findUnique({
    where: { marinaId: auth.marinaId }
  })

  if (!integration || !integration.active) {
    throw createError({ statusCode: 400, message: 'Geen boekhoudkoppeling' })
  }

  // Get all invoices with external IDs
  const invoices = await prisma.invoice.findMany({
    where: { marinaId: auth.marinaId, externalId: { not: null } }
  })

  let synced = 0

  if (integration.provider === 'moneybird') {
    const config = {
      apiToken: integration.apiToken,
      administrationId: integration.administrationId!
    }

    for (const inv of invoices) {
      if (!inv.externalId) continue
      try {
        const mbInvoice = await moneybirdGetInvoice(config, inv.externalId)

        // Map Moneybird state to our status
        let status = 'draft'
        if (mbInvoice.state === 'open') status = 'sent'
        else if (mbInvoice.state === 'late') status = 'overdue'
        else if (mbInvoice.state === 'paid') status = 'paid'
        else if (mbInvoice.state === 'uncollectible') status = 'overdue'

        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            status,
            number: mbInvoice.invoice_id || inv.number,
            total: parseFloat(mbInvoice.total_price_incl_tax_base) || inv.total,
            syncedAt: new Date()
          }
        })
        synced++
      }
      catch {
        // Skip failed syncs
      }
    }
  }

  return { synced, total: invoices.length }
})
