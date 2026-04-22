import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  const { boatLength, type, nights, persons } = body

  if (!boatLength || !type) {
    throw createError({ statusCode: 400, message: 'boatLength en type zijn verplicht' })
  }

  // Find matching tariff
  const tariff = await prisma.tariff.findFirst({
    where: {
      marinaId: auth.marinaId,
      type,
      active: true,
      OR: [
        { minLength: null, maxLength: null },
        { minLength: { lte: boatLength }, maxLength: null },
        { minLength: null, maxLength: { gte: boatLength } },
        { minLength: { lte: boatLength }, maxLength: { gte: boatLength } }
      ]
    },
    orderBy: { pricePerMeter: 'asc' }
  })

  if (!tariff) {
    throw createError({ statusCode: 404, message: 'Geen tarief gevonden voor dit type en deze bootlengte' })
  }

  const basePrice = tariff.pricePerMeter * boatLength
  const totalNights = nights || 1
  const totalPersons = persons || 1

  // For guest/passant: price per night
  const isPerNight = tariff.type === 'GUEST' || tariff.type === 'PASSANT'
  const subtotal = isPerNight ? basePrice * totalNights : basePrice

  const vatAmount = subtotal * (tariff.vatRate / 100)
  const touristTaxTotal = tariff.touristTax * totalPersons * totalNights
  const total = subtotal + vatAmount + touristTaxTotal

  return {
    tariff: {
      id: tariff.id,
      name: tariff.name,
      type: tariff.type,
      pricePerMeter: tariff.pricePerMeter,
      vatRate: tariff.vatRate,
      touristTax: tariff.touristTax
    },
    calculation: {
      boatLength,
      basePrice,
      nights: totalNights,
      persons: totalPersons,
      subtotal,
      vatAmount,
      touristTaxTotal,
      total
    },
    lines: [
      {
        description: `${tariff.name} — ${boatLength}m${isPerNight ? ` × ${totalNights} nacht${totalNights > 1 ? 'en' : ''}` : ''}`,
        quantity: isPerNight ? totalNights : 1,
        unitPrice: basePrice,
        vatRate: tariff.vatRate
      },
      ...(touristTaxTotal > 0
        ? [{
            description: `Toeristenbelasting — ${totalPersons} pers. × ${totalNights} nachten`,
            quantity: totalPersons * totalNights,
            unitPrice: tariff.touristTax,
            vatRate: 0
          }]
        : [])
    ]
  }
})
