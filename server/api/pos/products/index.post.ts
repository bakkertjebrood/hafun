import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.name || body.price === undefined) throw createError({ statusCode: 400, message: 'Naam en prijs verplicht' })

  const product = await prisma.posProduct.create({
    data: {
      marinaId: auth.marinaId,
      name: body.name,
      category: body.category || null,
      price: Number(body.price),
      vatRate: body.vatRate ?? 21,
      stock: body.stock !== undefined ? Number(body.stock) : null,
      barcode: body.barcode || null
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'PosProduct', entityId: product.id, action: 'create' })
  return product
})
