import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.marinaId) {
    throw createError({ statusCode: 400, message: 'Naam en marinaId zijn verplicht' })
  }

  const customer = await prisma.customer.create({
    data: {
      marinaId: body.marinaId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      contractType: body.contractType || 'YEAR'
    }
  })

  return customer
})
