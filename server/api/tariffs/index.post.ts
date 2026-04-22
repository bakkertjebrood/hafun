import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)

  if (!body.name || !body.type || body.pricePerMeter === undefined) {
    throw createError({ statusCode: 400, message: 'Naam, type en prijs per meter zijn verplicht' })
  }

  return prisma.tariff.create({
    data: {
      marinaId: auth.marinaId,
      name: body.name,
      type: body.type,
      pricePerMeter: body.pricePerMeter,
      minLength: body.minLength || null,
      maxLength: body.maxLength || null,
      vatRate: body.vatRate ?? 21,
      touristTax: body.touristTax ?? 0
    }
  })
})
