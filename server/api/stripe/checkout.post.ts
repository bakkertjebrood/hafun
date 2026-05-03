import { useStripe } from '../../utils/stripe'
import { getAuthUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN') throw createError({ statusCode: 403, message: 'Alleen admins' })

  const body = await readBody(event)
  if (!body.priceId) {
    throw createError({ statusCode: 400, message: 'priceId is verplicht' })
  }

  const config = useRuntimeConfig()
  const stripe = useStripe()

  const marina = await prisma.marina.findUniqueOrThrow({ where: { id: auth.marinaId } })

  const sessionParams: Record<string, unknown> = {
    mode: 'subscription',
    payment_method_types: ['card', 'ideal'],
    line_items: [{ price: body.priceId, quantity: 1 }],
    success_url: `${config.appUrl}/dashboard/settings?stripe=success`,
    cancel_url: `${config.appUrl}/dashboard/settings?stripe=cancelled`,
    metadata: { marinaId: marina.id },
    subscription_data: { metadata: { marinaId: marina.id } }
  }

  // Reuse existing Stripe customer if available
  if (marina.stripeCustomerId) {
    sessionParams.customer = marina.stripeCustomerId
  } else {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } })
    sessionParams.customer_email = user.email
  }

  const session = await stripe.checkout.sessions.create(sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0])

  return { url: session.url }
})
