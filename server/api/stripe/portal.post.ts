import { useStripe } from '../../utils/stripe'
import { getAuthUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN') throw createError({ statusCode: 403, message: 'Alleen admins' })

  const config = useRuntimeConfig()
  const stripe = useStripe()

  const marina = await prisma.marina.findUniqueOrThrow({ where: { id: auth.marinaId } })

  if (!marina.stripeCustomerId) {
    throw createError({ statusCode: 400, message: 'Geen actief abonnement' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: marina.stripeCustomerId,
    return_url: `${config.appUrl}/dashboard/settings`
  })

  return { url: session.url }
})
