import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

interface BerthSpec {
  length: number
  width?: number
  count: number
  isPassanten?: boolean
}

interface PierSpec {
  name: string
  hasHead?: boolean
  allPassanten?: boolean
  berths: BerthSpec[]
}

interface SetupBody {
  marinaName?: string
  gpsLat?: number
  gpsLng?: number
  piers: PierSpec[]
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'HARBORMASTER' && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Alleen havenmeesters mogen dit instellen' })
  }

  const body = await readBody<SetupBody>(event)
  if (!body || !Array.isArray(body.piers)) {
    throw createError({ statusCode: 400, message: 'piers array is verplicht' })
  }
  if (body.piers.length > 100) {
    throw createError({ statusCode: 400, message: 'Maximaal 100 steigers per keer' })
  }

  const marinaId = auth.marinaId

  const result = await prisma.$transaction(async (tx) => {
    await tx.marina.update({
      where: { id: marinaId },
      data: {
        ...(body.marinaName && { name: body.marinaName }),
        ...(typeof body.gpsLat === 'number' && { gpsLat: body.gpsLat }),
        ...(typeof body.gpsLng === 'number' && { gpsLng: body.gpsLng }),
        setupComplete: true
      }
    })

    let totalBerths = 0
    const pierResults: { name: string, berthCount: number }[] = []

    for (const pier of body.piers) {
      const pierName = (pier.name || '').trim()
      if (!pierName) continue

      const createData: {
        marinaId: string
        name: string
        points: number[][]
        headPoints?: number[][]
      } = {
        marinaId,
        name: pierName,
        points: []
      }
      if (pier.hasHead) createData.headPoints = []

      await tx.pierLine.upsert({
        where: { marinaId_name: { marinaId, name: pierName } },
        update: {},
        create: createData
      })

      const berthData: {
        marinaId: string
        code: string
        pier: string
        length: number
        width: number
        isPassanten: boolean
      }[] = []

      const existingCount = await tx.berth.count({ where: { marinaId, pier: pierName } })
      let seq = existingCount

      for (const spec of pier.berths || []) {
        const count = Math.min(Math.max(Math.floor(spec.count || 0), 0), 200)
        const length = Math.max(Math.min(spec.length || 10, 60), 2)
        const width = Math.max(Math.min(spec.width || 3, 20), 1)
        const passanten = spec.isPassanten ?? pier.allPassanten ?? false

        for (let i = 0; i < count; i++) {
          seq += 1
          const code = `${pierName}${String(seq).padStart(2, '0')}-${length}m`
          berthData.push({
            marinaId,
            code,
            pier: pierName,
            length,
            width,
            isPassanten: passanten
          })
        }
      }

      if (berthData.length > 0) {
        await tx.berth.createMany({ data: berthData })
        totalBerths += berthData.length
      }

      pierResults.push({ name: pierName, berthCount: berthData.length })
    }

    return { piers: pierResults, totalBerths }
  })

  return { ok: true, ...result }
})
