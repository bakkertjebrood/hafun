import { requireMarinaWithLevel } from '../../../utils/marinaContext'
import { prisma } from '../../../utils/prisma'
import { useStripe, calcApplicationFee } from '../../../utils/stripe'

export default defineEventHandler(async (event) => {
  const marina = await requireMarinaWithLevel(event, 'waitlist')
  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Naam is verplicht' })
  }
  if (marina.selfService.waitlist.requireConsent && !body.consent) {
    throw createError({ statusCode: 400, message: 'Toestemming voor verwerking is vereist' })
  }

  const fee = marina.selfService.waitlist.applicationFee
  const feeRequired = !!(fee && fee > 0 && marina.stripeConnectChargesEnabled && marina.stripeConnectAccountId)

  const entry = await prisma.waitlistEntry.create({
    data: {
      marinaId: marina.id,
      name: String(body.name),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      boatLength: body.boatLength ? Number(body.boatLength) : null,
      boatWidth: body.boatWidth ? Number(body.boatWidth) : null,
      boatType: body.boatType ? String(body.boatType) : null,
      preferredPier: body.preferredPier ? String(body.preferredPier) : null,
      notes: body.notes ? String(body.notes) : null,
      source: 'self_service',
      feeRequired,
      consentAt: body.consent ? new Date() : null
    }
  })

  let paymentClientSecret: string | null = null
  if (feeRequired && fee) {
    const amountCents = Math.round(fee * 100)
    const stripe = useStripe()
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      application_fee_amount: calcApplicationFee(amountCents),
      transfer_data: { destination: marina.stripeConnectAccountId! },
      metadata: {
        purpose: 'waitlist_fee',
        marinaId: marina.id,
        entryId: entry.id
      }
    })
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { feePaymentRef: intent.id }
    })
    paymentClientSecret = intent.client_secret ?? null
  }

  return {
    entryId: entry.id,
    feeRequired,
    paymentClientSecret
  }
})
