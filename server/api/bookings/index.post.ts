import { getAuthUser } from '../../utils/auth'
import { createBooking } from '../../utils/bookings'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)

  if (!body.berthId || !body.dateFrom || !body.dateTo) {
    throw createError({ statusCode: 400, message: 'berthId, dateFrom en dateTo zijn verplicht' })
  }

  return createBooking({
    marinaId: auth.marinaId,
    berthId: body.berthId,
    customerId: body.customerId,
    guestId: body.guestId,
    boatId: body.boatId,
    dateFrom: body.dateFrom,
    dateTo: body.dateTo,
    status: body.status,
    persons: body.persons,
    source: 'staff'
  })
})
