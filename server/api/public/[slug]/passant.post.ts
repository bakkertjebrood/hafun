import { randomBytes } from 'node:crypto'
import { requireMarinaWithLevel } from '../../../utils/marinaContext'
import { prisma } from '../../../utils/prisma'
import { createBooking } from '../../../utils/bookings'
import { calculateTariff } from '../../../utils/tariffs'
import { useStripe, calcApplicationFee } from '../../../utils/stripe'

function nightsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default defineEventHandler(async (event) => {
  const marina = await requireMarinaWithLevel(event, 'passant')
  const body = await readBody(event)

  if (!body.name || !body.dateFrom || !body.dateTo || !body.boatLength) {
    throw createError({ statusCode: 400, message: 'Naam, periode en bootlengte zijn verplicht' })
  }

  const dateFrom = new Date(body.dateFrom)
  const dateTo = new Date(body.dateTo)
  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime()) || dateTo <= dateFrom) {
    throw createError({ statusCode: 400, message: 'Ongeldige periode' })
  }
  const persons = Number(body.persons) || 1
  const boatLength = Number(body.boatLength)
  const nights = nightsBetween(dateFrom, dateTo)

  // Pick a berth. If the marina allows berth-pick and the visitor chose one,
  // verify it belongs to this marina + is PASSANT type. Otherwise grab any
  // free PASSANT-berth in the window so we have an anchor for the booking.
  let berthId = body.berthId as string | undefined
  if (berthId) {
    const berth = await prisma.berth.findFirst({
      where: { id: berthId, marinaId: marina.id, type: 'PASSANT' }
    })
    if (!berth) throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })
  } else {
    const occupied = await prisma.booking.findMany({
      where: {
        marinaId: marina.id,
        status: { not: 'cancelled' },
        dateFrom: { lt: dateTo },
        dateTo: { gt: dateFrom }
      },
      select: { berthId: true }
    })
    const occupiedIds = new Set(occupied.map(b => b.berthId))
    const candidate = await prisma.berth.findFirst({
      where: {
        marinaId: marina.id,
        type: 'PASSANT',
        id: { notIn: [...occupiedIds] },
        length: { gte: boatLength }
      },
      orderBy: { length: 'asc' }
    })
    if (!candidate) {
      throw createError({ statusCode: 409, message: 'Geen vrije passantenplek in deze periode' })
    }
    berthId = candidate.id
  }

  const calc = await calculateTariff({
    marinaId: marina.id,
    boatLength,
    type: 'PASSANT',
    nights,
    persons
  })

  const checkinToken = randomBytes(16).toString('hex')

  const guest = await prisma.guest.create({
    data: {
      marinaId: marina.id,
      name: String(body.name),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      boatName: body.boatName ? String(body.boatName) : null,
      boatLength,
      arrival: dateFrom,
      departure: dateTo,
      persons,
      source: 'self_service',
      checkinToken,
      paymentStatus: marina.selfService.passant.requirePayment ? 'pending' : 'none'
    }
  })

  const booking = await createBooking({
    marinaId: marina.id,
    berthId: berthId!,
    guestId: guest.id,
    dateFrom,
    dateTo,
    status: marina.selfService.passant.requirePayment ? 'reserved' : 'confirmed',
    persons,
    source: 'self_service'
  })

  // Optional payment. If requirePayment is on but Connect isn't ready, fall
  // back to "pay on arrival" so a single misconfiguration doesn't block guests.
  let paymentClientSecret: string | null = null
  if (marina.selfService.passant.requirePayment && marina.stripeConnectChargesEnabled && marina.stripeConnectAccountId) {
    const amountCents = Math.round(calc.calculation.total * 100)
    const stripe = useStripe()
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      application_fee_amount: calcApplicationFee(amountCents),
      transfer_data: { destination: marina.stripeConnectAccountId },
      metadata: {
        purpose: 'passant',
        marinaId: marina.id,
        guestId: guest.id,
        bookingId: booking.id
      }
    })
    await prisma.guest.update({
      where: { id: guest.id },
      data: { paymentRef: intent.id }
    })
    paymentClientSecret = intent.client_secret ?? null
  }

  return {
    bookingId: booking.id,
    guestId: guest.id,
    checkinToken,
    receiptUrl: `/h/${marina.slug}/passant/${checkinToken}`,
    total: calc.calculation.total,
    nights,
    paymentClientSecret
  }
})
