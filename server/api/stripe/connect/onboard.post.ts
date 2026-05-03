import { useStripe } from '../../../utils/stripe'
import { getAuthUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Alleen havenmeester of admin' })
  }

  const config = useRuntimeConfig()
  const stripe = useStripe()
  const marina = await prisma.marina.findUniqueOrThrow({ where: { id: auth.marinaId } })

  let accountId = marina.stripeConnectAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      country: 'NL',
      metadata: { marinaId: marina.id }
    })
    accountId = account.id
    await prisma.marina.update({
      where: { id: marina.id },
      data: { stripeConnectAccountId: accountId }
    })
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${config.appUrl}/api/stripe/connect/refresh`,
    return_url: `${config.appUrl}/dashboard/settings/self-service?connect=return`,
    type: 'account_onboarding'
  })

  return { url: link.url, accountId }
})
