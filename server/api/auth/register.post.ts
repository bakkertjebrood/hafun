import bcrypt from 'bcrypt'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password || !body.firstName || !body.lastName) {
    throw createError({ statusCode: 400, message: 'Alle velden zijn verplicht' })
  }

  if (body.password.length < 12) {
    throw createError({ statusCode: 400, message: 'Wachtwoord moet minimaal 12 tekens zijn' })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    throw createError({ statusCode: 409, message: 'Dit emailadres is al in gebruik' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)

  // For now: create a marina if slug is provided, or use existing
  let marina
  if (body.marinaSlug) {
    marina = await prisma.marina.findUnique({ where: { slug: body.marinaSlug } })
    if (!marina) {
      throw createError({ statusCode: 404, message: 'Haven niet gevonden' })
    }
  }
  else if (body.marinaName) {
    const slug = body.marinaName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    marina = await prisma.marina.create({
      data: { name: body.marinaName, slug }
    })
  }
  else {
    throw createError({ statusCode: 400, message: 'Haven naam of slug is verplicht' })
  }

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'HARBORMASTER',
      marinaId: marina.id
    },
    include: { marina: true }
  })

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
