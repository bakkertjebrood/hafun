import { getAuthUser } from '../../utils/auth'
import { calculateTariff } from '../../utils/tariffs'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  const { boatLength, type, nights, persons } = body

  if (!boatLength || !type) {
    throw createError({ statusCode: 400, message: 'boatLength en type zijn verplicht' })
  }

  return calculateTariff({
    marinaId: auth.marinaId,
    boatLength,
    type,
    nights,
    persons
  })
})
