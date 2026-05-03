import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

const ALLOWED_STATUSES = ['FREE', 'OCCUPIED', 'EMPTY', 'RELOCATED'] as const
const ALLOWED_TYPES = ['JAARPLAATS', 'SEIZOEN', 'WINTERSTALLING', 'PASSANT', 'WERKPLEK'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]
type AllowedType = typeof ALLOWED_TYPES[number]

interface AssignBody {
  pierName: string
  type?: AllowedType
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

  const data: { type?: AllowedType, status?: AllowedStatus } = {}
  if (body.type && ALLOWED_TYPES.includes(body.type)) data.type = body.type
  if (body.status && ALLOWED_STATUSES.includes(body.status)) data.status = body.status

  if (Object.keys(data).length === 0) {
    throw createError({ statusCode: 400, message: 'Geef minimaal type of status mee' })
  }

  const result = await prisma.berth.updateMany({
    where: { marinaId: auth.marinaId, pier: body.pierName },
    data
  })

  return { updated: result.count, pier: body.pierName }
})
