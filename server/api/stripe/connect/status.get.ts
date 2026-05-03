import { useStripe } from '../../../utils/stripe'
import { getAuthUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const marina = await prisma.marina.findUniqueOrThrow({
    where: { id: auth.marinaId },
    select: {
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true
    }
  })

  if (!marina.stripeConnectAccountId) {
    return { connected: false, chargesEnabled: false, accountId: null }
  }

  // Fresh check against Stripe so dashboard reflects latest state without
  // waiting for the webhook to land.
  const stripe = useStripe()
  try {
    const account = await stripe.accounts.retrieve(marina.stripeConnectAccountId)
    if (account.charges_enabled !== marina.stripeConnectChargesEnabled) {
      await prisma.marina.update({
        where: { id: auth.marinaId },
        data: { stripeConnectChargesEnabled: !!account.charges_enabled }
      })
    }
    return {
      connected: true,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
      accountId: marina.stripeConnectAccountId
    }
  } catch {
    return {
      connected: true,
      chargesEnabled: marina.stripeConnectChargesEnabled,
      accountId: marina.stripeConnectAccountId
    }
  }
})
