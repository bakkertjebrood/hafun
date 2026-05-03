import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

const ALLOWED_STATUSES = ['FREE', 'OCCUPIED', 'TEMPORARY', 'STORAGE', 'SEASONAL', 'EMPTY', 'RELOCATED'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]

interface AssignBody {
  pierName: string
  isPassanten?: boolean
  status?: AllowedStatus
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'HARBORMASTER' && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Alleen havenmeesters kunnen dit aanpassen' })
  }

  const body = await readBody<AssignBody>(event)
  if (!body?.pierName) {
    throw createError({ statusCode: 400, message: 'pierName is verplicht' })
  }

  const data: { isPassanten?: boolean, status?: AllowedStatus } = {}
  if (typeof body.isPassanten === 'boolean') data.isPassanten = body.isPassanten
  if (body.status && ALLOWED_STATUSES.includes(body.status)) data.status = body.status

  if (Object.keys(data).length === 0) {
    throw createError({ statusCode: 400, message: 'Geef minimaal isPassanten of status mee' })
  }

  const result = await prisma.berth.updateMany({
    where: { marinaId: auth.marinaId, pier: body.pierName },
    data
  })

  return { updated: result.count, pier: body.pierName }
})
