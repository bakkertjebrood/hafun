import bcrypt from 'bcrypt'
import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Id ontbreekt' })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.marinaId !== auth.marinaId) {
    throw createError({ statusCode: 404, message: 'Gebruiker niet gevonden' })
  }

  const body = await readBody(event)

  if (body.email && body.email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) throw createError({ statusCode: 409, message: 'Dit emailadres is al in gebruik' })
  }

  const data: Record<string, unknown> = {}
  if (body.email) data.email = body.email
  if (body.firstName !== undefined) data.firstName = body.firstName
  if (body.lastName !== undefined) data.lastName = body.lastName
  if (body.role) data.role = body.role
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12)

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true
    }
  })
})
