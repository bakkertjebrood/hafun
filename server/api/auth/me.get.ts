import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) {
    throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { marina: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'Gebruiker niet gevonden' })
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    marina: {
      id: user.marina.id,
      name: user.marina.name,
      slug: user.marina.slug
    }
  }
})
