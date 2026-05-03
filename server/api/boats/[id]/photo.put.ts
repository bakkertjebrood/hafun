import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { deleteCloudinaryImage } from '../../../utils/cloudinary'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ publicId: string }>(event)
  if (!body?.publicId || typeof body.publicId !== 'string') {
    throw createError({ statusCode: 400, message: 'publicId is verplicht' })
  }

  const boat = await prisma.boat.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!boat) throw createError({ statusCode: 404, message: 'Boot niet gevonden' })

  const previous = boat.photo

  const updated = await prisma.boat.update({
    where: { id },
    data: { photo: body.publicId }
  })

  // Verwijder oude foto uit Cloudinary nadat de nieuwe is opgeslagen.
  if (previous && previous !== body.publicId) {
    void deleteCloudinaryImage(previous)
  }

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Boat', entityId: id, action: 'update_photo' })
  return updated
})
