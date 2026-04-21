import bcrypt from 'bcrypt'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, message: 'Email en wachtwoord zijn verplicht' })
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { marina: true }
  })

  if (!user) {
    throw createError({ statusCode: 401, message: 'Ongeldige inloggegevens' })
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Ongeldige inloggegevens' })
  }

  const token = signToken({
    userId: user.id,
    marinaId: user.marinaId,
    role: user.role,
    email: user.email
  })

  setCookie(event, 'nautar-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  return {
    token,
    user: {
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
  }
})
