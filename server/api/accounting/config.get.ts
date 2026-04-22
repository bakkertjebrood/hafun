import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const integration = await prisma.accountingIntegration.findUnique({
    where: { marinaId: auth.marinaId },
    select: {
      id: true,
      provider: true,
      administrationId: true,
      active: true,
      settings: true,
      // Don't expose API token
    }
  })

  return { integration, hasToken: !!integration?.id }
})
