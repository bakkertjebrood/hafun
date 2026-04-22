import bcrypt from 'bcrypt'
import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const body = await readBody(event)

  if (!body.email || !body.password || !body.firstName) {
    throw createError({ statusCode: 400, message: 'Email, wachtwoord en voornaam zijn verplicht' })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) throw createError({ statusCode: 409, message: 'Dit emailadres is al in gebruik' })

  const passwordHash = await bcrypt.hash(body.password, 12)

  const user = await prisma.user.create({
    data: {
      marinaId: auth.marinaId,
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName || '',
      role: body.role || 'STAFF'
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true
    }
  })

  return user
})
