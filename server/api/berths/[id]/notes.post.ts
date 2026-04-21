import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body.text?.trim()) {
    throw createError({ statusCode: 400, message: 'Tekst is verplicht' })
  }

  const berth = await prisma.berth.findUnique({ where: { id } })
  if (!berth) {
    throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })
  }

  // Try to get auth user, fallback to first user for dev
  const auth = getAuthUser(event)
  let authorId = auth?.userId

  if (!authorId) {
    const firstUser = await prisma.user.findFirst({ where: { marinaId: berth.marinaId } })
    if (!firstUser) throw createError({ statusCode: 401, message: 'Geen gebruiker gevonden' })
    authorId = firstUser.id
  }

  const note = await prisma.note.create({
    data: {
      marinaId: berth.marinaId,
      berthId: id,
      text: body.text.trim(),
      authorId
    },
    include: {
      author: { select: { firstName: true, lastName: true } }
    }
  })

  return note
})
