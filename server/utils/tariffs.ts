import type { Tariff } from '@prisma/client'
import { prisma } from './prisma'

export interface TariffCalcInput {
  marinaId: string
  boatLength: number
  type: string
  nights?: number
  persons?: number
}

export interface TariffCalcLine {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface TariffCalcResult {
  tariff: {
    id: string
    name: string
    type: string
    pricePerMeter: number
    vatRate: number
    touristTax: number
  }
  calculation: {
    boatLength: number
    basePrice: number
    nights: number
    persons: number
    subtotal: number
    vatAmount: number
    touristTaxTotal: number
    total: number
  }
  lines: TariffCalcLine[]
}

export async function findTariff(input: TariffCalcInput): Promise<Tariff | null> {
  return prisma.tariff.findFirst({
    where: {
      marinaId: input.marinaId,
      type: input.type as never,
      active: true,
      OR: [
        { minLength: null, maxLength: null },
        { minLength: { lte: input.boatLength }, maxLength: null },
        { minLength: null, maxLength: { gte: input.boatLength } },
        { minLength: { lte: input.boatLength }, maxLength: { gte: input.boatLength } }
      ]
    },
    orderBy: { pricePerMeter: 'asc' }
  })
}

export async function calculateTariff(input: TariffCalcInput): Promise<TariffCalcResult> {
  const tariff = await findTariff(input)
  if (!tariff) {
    throw createError({ statusCode: 404, message: 'Geen tarief gevonden voor dit type en deze bootlengte' })
  }

  const totalNights = input.nights || 1
  const totalPersons = input.persons || 1
  const basePrice = tariff.pricePerMeter * input.boatLength
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
      boatLength: input.boatLength,
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
        description: `${tariff.name} — ${input.boatLength}m${isPerNight ? ` × ${totalNights} nacht${totalNights > 1 ? 'en' : ''}` : ''}`,
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
}
