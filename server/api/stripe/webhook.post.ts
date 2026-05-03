import type Stripe from 'stripe'
import { useStripe, getPlanFromPriceId } from '../../utils/stripe'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = useStripe()

  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid webhook signature' })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.metadata?.marinaId) {
        const subId = session.subscription
        if (typeof subId !== 'string') break
        const subscription = await stripe.subscriptions.retrieve(subId)
        const priceId = subscription.items.data[0]?.price.id
        const plan = priceId ? getPlanFromPriceId(priceId) : null
        const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end

        await prisma.marina.update({
          where: { id: session.metadata.marinaId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            subscriptionPlan: plan,
            stripeCurrentPeriodEnd: new Date(periodEnd * 1000)
          }
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const marina = await prisma.marina.findFirst({
        where: { stripeSubscriptionId: subscription.id }
      })
      if (marina) {
        const priceId = subscription.items.data[0]?.price.id
        const plan = priceId ? getPlanFromPriceId(priceId) : null
        const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end
        await prisma.marina.update({
          where: { id: marina.id },
          data: {
            subscriptionPlan: subscription.status === 'active' ? plan : null,
            stripeCurrentPeriodEnd: new Date(periodEnd * 1000)
          }
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      await prisma.marina.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionPlan: null,
          stripeSubscriptionId: null,
          stripeCurrentPeriodEnd: null
        }
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object as unknown as Record<string, unknown>
      const subId = invoice.subscription
      if (typeof subId === 'string') {
        const marina = await prisma.marina.findFirst({
          where: { stripeSubscriptionId: subId }
        })
        if (marina) {
          console.warn(`[stripe] Payment failed for marina ${marina.id} (${marina.name})`)
        }
      }
      break
    }
  }

  return { received: true }
})
