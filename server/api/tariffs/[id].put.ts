import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  return prisma.tariff.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.pricePerMeter !== undefined && { pricePerMeter: body.pricePerMeter }),
      ...(body.minLength !== undefined && { minLength: body.minLength || null }),
      ...(body.maxLength !== undefined && { maxLength: body.maxLength || null }),
      ...(body.vatRate !== undefined && { vatRate: body.vatRate }),
      ...(body.touristTax !== undefined && { touristTax: body.touristTax }),
      ...(body.active !== undefined && { active: body.active })
    }
  })
})
