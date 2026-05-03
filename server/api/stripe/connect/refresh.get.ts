import { useStripe } from '../../../utils/stripe'
import { getAuthUser } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const config = useRuntimeConfig()
  const stripe = useStripe()
  const marina = await prisma.marina.findUniqueOrThrow({ where: { id: auth.marinaId } })

  if (!marina.stripeConnectAccountId) {
    return sendRedirect(event, '/dashboard/settings/self-service?connect=missing')
  }

  const link = await stripe.accountLinks.create({
    account: marina.stripeConnectAccountId,
    refresh_url: `${config.appUrl}/api/stripe/connect/refresh`,
    return_url: `${config.appUrl}/dashboard/settings/self-service?connect=return`,
    type: 'account_onboarding'
  })

  return sendRedirect(event, link.url)
})
