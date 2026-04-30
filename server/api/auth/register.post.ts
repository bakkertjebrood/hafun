import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/auth'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueMarinaSlug(base: string): Promise<string> {
  const root = base || 'haven'
  let candidate = root
  let i = 2
  while (await prisma.marina.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${i++}`
    if (i > 50) {
      candidate = `${root}-${Math.random().toString(36).slice(2, 7)}`
      break
    }
  }
  return candidate
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const marinaName = typeof body.marinaName === 'string' ? body.marinaName.trim() : ''
  const marinaSlug = typeof body.marinaSlug === 'string' ? body.marinaSlug.trim() : ''

  if (!email || !password || !firstName || !lastName) {
    throw createError({ statusCode: 400, message: 'Alle velden zijn verplicht' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'Ongeldig e-mailadres' })
  }

  if (password.length < 12) {
    throw createError({ statusCode: 400, message: 'Wachtwoord moet minimaal 12 tekens zijn' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw createError({ statusCode: 409, message: 'Dit emailadres is al in gebruik' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  let marina
  try {
    if (marinaSlug) {
      marina = await prisma.marina.findUnique({ where: { slug: marinaSlug } })
      if (!marina) {
        throw createError({ statusCode: 404, message: 'Haven niet gevonden' })
      }
    }
    else if (marinaName) {
      const slug = await uniqueMarinaSlug(slugify(marinaName))
      marina = await prisma.marina.create({
        data: { name: marinaName, slug }
      })
    }
    else {
      throw createError({ statusCode: 400, message: 'Haven naam of slug is verplicht' })
    }
  }
  catch (err) {
    if ((err as { statusCode?: number }).statusCode) throw err
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Deze haven bestaat al' })
    }
    console.error('[register] marina create failed:', err)
    throw createError({ statusCode: 500, message: 'Kon haven niet aanmaken' })
  }

  let user
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'HARBORMASTER',
        marinaId: marina.id
      },
      include: { marina: true }
    })
  }
  catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Dit emailadres is al in gebruik' })
    }
    console.error('[register] user create failed:', err)
    throw createError({ statusCode: 500, message: 'Kon account niet aanmaken' })
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
        slug: user.marina.slug,
        setupComplete: user.marina.setupComplete
      }
    }
  }
})
