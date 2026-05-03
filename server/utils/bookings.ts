import { prisma } from './prisma'
import { getSelfService } from './marinaSettings'

export interface CreateBookingInput {
  marinaId: string
  berthId: string
  customerId?: string | null
  guestId?: string | null
  boatId?: string | null
  dateFrom: Date | string
  dateTo: Date | string
  status?: string
  persons?: number
  source?: string
  invoiceId?: string | null
  absenceId?: string | null
}

export async function assertBerthInMarina(marinaId: string, berthId: string) {
  const berth = await prisma.berth.findFirst({ where: { id: berthId, marinaId } })
  if (!berth) throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })
  return berth
}

export async function assertNoOverlap(berthId: string, dateFrom: Date, dateTo: Date) {
  const overlap = await prisma.booking.findFirst({
    where: {
      berthId,
      status: { not: 'cancelled' },
      dateFrom: { lt: dateTo },
      dateTo: { gt: dateFrom }
    }
  })
  if (overlap) {
    throw createError({ statusCode: 409, message: 'Er is al een boeking op deze plek in deze periode' })
  }
}

/**
 * Looks up an active BerthAbsence covering the booking window where the owner
 * has released the berth for relet. Used to link self-service or staff bookings
 * to the underlying absence (and to trigger optional credit calculation).
 */
export async function findReletableAbsence(
  marinaId: string,
  berthId: string,
  dateFrom: Date,
  dateTo: Date
) {
  return prisma.berthAbsence.findFirst({
    where: {
      marinaId,
      berthId,
      releaseForRelet: true,
      status: { not: 'cancelled' },
      dateFrom: { lte: dateFrom },
      dateTo: { gte: dateTo }
    }
  })
}

export async function createBooking(input: CreateBookingInput) {
  const dateFrom = input.dateFrom instanceof Date ? input.dateFrom : new Date(input.dateFrom)
  const dateTo = input.dateTo instanceof Date ? input.dateTo : new Date(input.dateTo)

  await assertBerthInMarina(input.marinaId, input.berthId)
  await assertNoOverlap(input.berthId, dateFrom, dateTo)

  let absenceId = input.absenceId ?? null
  if (!absenceId) {
    const absence = await findReletableAbsence(input.marinaId, input.berthId, dateFrom, dateTo)
    if (absence) absenceId = absence.id
  }

  const booking = await prisma.booking.create({
    data: {
      marinaId: input.marinaId,
      berthId: input.berthId,
      customerId: input.customerId || null,
      guestId: input.guestId || null,
      boatId: input.boatId || null,
      dateFrom,
      dateTo,
      status: input.status || 'reserved',
      persons: input.persons || 1,
      source: input.source || 'staff',
      invoiceId: input.invoiceId || null,
      absenceId
    },
    include: {
      berth: { select: { code: true } },
      customer: { select: { name: true } },
      guest: { select: { name: true } }
    }
  })

  // Optional sublet credit: when this booking re-lets a vaste-ligger's released
  // absence, credit a percentage of the booking total back to the owner.
  if (absenceId) {
    await maybeApplySubletCredit(input.marinaId, absenceId, booking.id)
  }

  return booking
}

async function maybeApplySubletCredit(marinaId: string, absenceId: string, bookingId: string) {
  const marina = await prisma.marina.findUnique({
    where: { id: marinaId },
    select: { settings: true }
  })
  const percent = getSelfService(marina?.settings).absence.subletCreditPercent
  if (!percent || percent <= 0) return

  const absence = await prisma.berthAbsence.findUnique({
    where: { id: absenceId },
    select: { id: true, creditAmount: true }
  })
  if (!absence || absence.creditAmount != null) return

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: { select: { boatLength: true } } }
  })
  if (!booking) return

  // Best-effort estimate: relet-credit is informational at booking time.
  // The actual credit on the owner invoice is computed when the marina
  // confirms the relet (havenmeester action). We seed creditAmount with 0
  // so subsequent bookings on the same absence don't double-attribute.
  await prisma.berthAbsence.update({
    where: { id: absenceId },
    data: { creditAmount: 0 }
  })
}
