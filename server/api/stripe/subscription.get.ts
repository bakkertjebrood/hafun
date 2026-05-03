import { getAuthUser } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { PLAN_LIMITS } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const marina = await prisma.marina.findUniqueOrThrow({
    where: { id: auth.marinaId },
    select: {
      subscriptionPlan: true,
      stripeCurrentPeriodEnd: true,
      _count: { select: { berths: true } }
    }
  })

  const plan = marina.subscriptionPlan || null
  const limits = plan ? PLAN_LIMITS[plan] : null

  return {
    plan,
    periodEnd: marina.stripeCurrentPeriodEnd,
    berthCount: marina._count.berths,
    maxBerths: limits?.maxBerths ?? 0,
    active: !!plan && (!marina.stripeCurrentPeriodEnd || marina.stripeCurrentPeriodEnd > new Date())
  }
})
