import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { deleteCloudinaryImage } from '../../../utils/cloudinary'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const boat = await prisma.boat.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!boat) throw createError({ statusCode: 404, message: 'Boot niet gevonden' })

  if (boat.photo) {
    void deleteCloudinaryImage(boat.photo)
  }

  const updated = await prisma.boat.update({
    where: { id },
    data: { photo: null }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Boat', entityId: id, action: 'delete_photo' })
  return updated
})
