import { prisma } from '../../../../utils/prisma'
import { getAuthUser } from '../../../../utils/auth'
import { signBoatPhotoUpload } from '../../../../utils/cloudinary'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const boat = await prisma.boat.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!boat) throw createError({ statusCode: 404, message: 'Boot niet gevonden' })

  return signBoatPhotoUpload(id)
})
