import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  await prisma.pierLine.delete({ where: { id } })

  return { deleted: true }
})
