import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

interface BulkBody {
  pier: string
  count: number
  length?: number
  width?: number
  isPassanten?: boolean
  codePrefix?: string
  side?: 'LEFT' | 'RIGHT' | 'HEAD'
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody<BulkBody>(event)
  if (!body?.pier || !body.count) {
    throw createError({ statusCode: 400, message: 'pier en count zijn verplicht' })
  }

  const count = Math.min(Math.max(Math.floor(body.count), 1), 200)
  const length = Math.max(Math.min(body.length ?? 10, 60), 2)
  const width = Math.max(Math.min(body.width ?? 3.5, 20), 1)
  const marinaId = auth.marinaId

  // Make sure the pier exists (create if not, without geometry)
  await prisma.pierLine.upsert({
    where: { marinaId_name: { marinaId, name: body.pier } },
    update: {},
    create: { marinaId, name: body.pier, points: [] as never }
  })

  const existingCount = await prisma.berth.count({ where: { marinaId, pier: body.pier } })
  const prefix = (body.codePrefix || body.pier).trim()
  const side = body.side === 'LEFT' || body.side === 'RIGHT' || body.side === 'HEAD' ? body.side : null

  const data = Array.from({ length: count }, (_, i) => {
    const seq = existingCount + i + 1
    return {
      marinaId,
      pier: body.pier,
      code: `${prefix}${String(seq).padStart(2, '0')}-${length}m`,
      length,
      width,
      isPassanten: !!body.isPassanten,
      side
    }
  })

  await prisma.berth.createMany({ data })

  return { created: data.length, pier: body.pier }
})
