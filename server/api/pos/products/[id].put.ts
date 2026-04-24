import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await prisma.posProduct.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  const updated = await prisma.posProduct.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      vatRate: body.vatRate ?? existing.vatRate,
      stock: body.stock !== undefined ? Number(body.stock) : existing.stock,
      barcode: body.barcode ?? existing.barcode,
      active: body.active ?? existing.active
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'PosProduct', entityId: id, action: 'update' })
  return updated
})
