import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { moneybirdTestConnection } from '../../utils/moneybird'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  const body = await readBody(event)

  if (!body.provider || !body.apiToken) {
    throw createError({ statusCode: 400, message: 'Provider en API token zijn verplicht' })
  }

  // Test connection for Moneybird
  if (body.provider === 'moneybird') {
    if (!body.administrationId) {
      throw createError({ statusCode: 400, message: 'Administratie ID is verplicht voor Moneybird' })
    }

    const test = await moneybirdTestConnection({
      apiToken: body.apiToken,
      administrationId: body.administrationId
    })

    if (!test.ok) {
      throw createError({ statusCode: 400, message: `Verbinding mislukt: ${test.error}` })
    }
  }

  const integration = await prisma.accountingIntegration.upsert({
    where: { marinaId: auth.marinaId },
    update: {
      provider: body.provider,
      apiToken: body.apiToken,
      administrationId: body.administrationId || null,
      settings: body.settings || null,
      active: true
    },
    create: {
      marinaId: auth.marinaId,
      provider: body.provider,
      apiToken: body.apiToken,
      administrationId: body.administrationId || null,
      settings: body.settings || null
    }
  })

  return { id: integration.id, provider: integration.provider, active: true }
})
